"""Import reviewed panel manifests and images; never invent missing pictures.

Usage: python scripts/merge-panel-expansion.py /absolute/path/to/expansion
Each subdirectory supplies panels.json, images/, and optional coverage.json.
Original seven images remain as a seed for reproducible updates.
"""
from pathlib import Path
from collections import defaultdict
import json, sys, hashlib, re
from PIL import Image, ImageOps

project=Path(__file__).resolve().parents[1]
root=Path(sys.argv[1]); app=project/'public/app'; data=app/'data'
read=lambda p:json.loads(p.read_text())
write=lambda p,x:p.write_text(json.dumps(x,indent=2,ensure_ascii=False)+'\n')
catalogue=read(data/'catalogue.json'); records={r['id']:r for r in catalogue['records']}
seed=read(project/'research/panel-library-seed.json')
byid={}; audits=[]; errors=[]
inputs=[('seed',seed,project/'research/panel-originals')]
for directory in sorted(root.iterdir()):
    manifest=directory/'panels.json'
    if manifest.is_file():
        inputs.append((directory.name,read(manifest),directory/'images'))
        if (directory/'coverage.json').exists():
            audit=read(directory/'coverage.json');write(project/'research/panel-audit'/f'{directory.name}.json',audit)
            entries=audit if isinstance(audit,list) else audit.get('candidates',audit.get('unresolved',[]))
            audits.extend(entries)
for source,panels,image_dir in inputs:
    for original in panels:
        p=dict(original);id=p['id'];image=image_dir/p['image']
        if not image.exists() and (image_dir.parent/p['image']).exists():image=image_dir.parent/p['image']
        if not image.exists():
            errors.append(f'{source}: missing {image}');continue
        if id in byid:
            byid[id]['record_ids']=sorted(set(byid[id]['record_ids']+p['record_ids']))
            continue
        invalid=set(p['record_ids'])-records.keys()
        if invalid:raise ValueError(f'{id}: invalid record IDs {invalid}')
        im=ImageOps.exif_transpose(Image.open(image));im.thumbnail((900,900),Image.Resampling.LANCZOS)
        if im.mode not in ('RGB','RGBA'):im=im.convert('RGB')
        name=id+'.webp';dest=app/'panels'/name
        im.save(dest,'WEBP',quality=88,method=6)
        p['image']=name;p.pop('image_local_path',None)
        p['image_sha256']=hashlib.sha256(dest.read_bytes()).hexdigest()
        p['image_dimensions']=list(im.size)
        p['source_pdf_page']=p.get('source_pdf_page') or p.get('source_document_page') or p.get('source_page_number')
        p['aliases']=sorted(set(p.get('aliases',[])+[p['model']]))
        p['record_ids']=sorted(set(p['record_ids']))
        byid[id]=p
if errors:raise ValueError('\n'.join(errors))
panels=sorted(byid.values(),key=lambda p:(p['brand'].casefold(),p['model'].casefold()))
# Keep the original home-page reference first, while other cards are alphabetic.
panels.sort(key=lambda p:0 if p['id']=='gent-vigilon-compact' else 1)
unresolved=[];seen=set()
for a in audits:
    if a.get('id') in byid or a.get('status') in ('verified-image','verified','excluded','not-panel','non-panel','accessory','duplicate'):continue
    if not a.get('model') or a.get('id') in seen:continue
    seen.add(a.get('id'));unresolved.append({k:a.get(k) for k in ['id','brand','model','status','reason','record_ids']})
groups=defaultdict(list)
for p in panels:groups[p['brand'],p['category']].append(p)
packs=[]
seedpacks=read(project/'research/panel-packs-seed.json')
for (brand,category),ps in sorted(groups.items()):
    ids={id for p in ps for id in p['record_ids']}
    for old in seedpacks:
        if old['brand']==brand and old['category']==category:ids.update(old['record_ids'])
    # Include documented panel candidates still awaiting a picture in their brand pack.
    for candidate in unresolved:
        if candidate['brand']==brand:
            ids.update(id for id in candidate.get('record_ids') or [] if id in records and records[id]['category']==category)
    slug=re.sub('[^a-z0-9]+','-',brand.lower()).strip('-')+'-'+category
    packs.append(dict(id=slug,brand=brand,category=category,title=brand+' panel pack',
        description='Matched panel manuals, user guides and technical references from Manual Archives, including retained historical editions.',
        scope='Covers the identified control-panel families for this brand in the archive snapshot. Device accessories and unmatched general documents remain searchable in All manuals. Confirm the installed model and edition.',
        panel_ids=[p['id'] for p in ps],record_ids=sorted(ids),record_count=len(ids),
        direct_pdf_count=sum(bool(records[id]['url']) for id in ids),repository_url=catalogue['repository'],source_commit=catalogue['commit']))
write(data/'panels.json',panels);write(data/'packs.json',packs)
write(data/'coverage.json',dict(generated='2026-10-29',repository_commit=catalogue['commit'],pictured_families=len(panels),brands=len({p['brand'] for p in panels}),packs=len(packs),unresolved=unresolved))
print(json.dumps(dict(panels=len(panels),brands=len({p['brand'] for p in panels}),packs=len(packs),unresolved=len(unresolved),image_bytes=sum((app/'panels'/p['image']).stat().st_size for p in panels))))

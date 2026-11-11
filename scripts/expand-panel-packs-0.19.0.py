#!/usr/bin/env python3
"""Apply the reviewed 0.19.0 panel/manual batch without resetting older packs.

Usage: python scripts/expand-panel-packs-0.19.0.py [/absolute/pdf/cache]
Fetches only manifest URLs when the pinned PDF is not cached. Images are exact
PDF figure crops; no generated replacement artwork or guessed manual links.
Requires PyMuPDF and Pillow. Catalogue/download-map identities are unchanged.
"""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import sys
import urllib.request
import fitz
from PIL import Image

root=Path(__file__).resolve().parents[1]
cache=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root/'.cache/panel-packs-0.19.0'
cache.mkdir(parents=True,exist_ok=True)
data=root/'public/app/data';research=root/'research/panel-packs-0.19.0'
read=lambda path:json.loads(path.read_text())
def write(path,value):path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
manifest=read(research/'manifest.json')
records={r['id']:r for r in read(data/'catalogue.json')['records']}
sources={s['id']:s for s in manifest['sources']}
for id,source in sources.items():
    assert records[id]['url']==source['url'],f'{id}: review a changed catalogue URL before rebuilding'
    pdf=cache/(id+'.pdf')
    if not pdf.exists():
        with urllib.request.urlopen(source['url'],timeout=60) as response:pdf.write_bytes(response.read())
    binary=pdf.read_bytes()
    assert binary.startswith(b'%PDF') and hashlib.sha256(binary).hexdigest()==source['sha256'],f'{id}: unverified source bytes'
    assert len(fitz.open(stream=binary,filetype='pdf'))==source['pdf_pages']

old=read(data/'panels.json');panels={p['id']:p for p in old}
old_panel_records={p['id']:set(p['record_ids']) for p in old}
packs=read(data/'packs.json');old_pack_records={p['id']:set(p['record_ids']) for p in packs}
new_ids=[]
for spec in manifest['new_panels']:
    id=spec['id'];source=sources[spec['source_record_id']]
    doc=fitz.open(cache/(source['id']+'.pdf'))
    pix=doc[spec['source_pdf_page']-1].get_pixmap(matrix=fitz.Matrix(2.5,2.5),clip=fitz.Rect(spec['source_crop_points']),alpha=False)
    image=Image.open(BytesIO(pix.tobytes('png'))).convert('RGB');image.thumbnail((900,900),Image.Resampling.LANCZOS)
    filename=id+'.webp';dest=root/'public/app/panels'/filename;image.save(dest,'WEBP',quality=88,method=6)
    panel={**panels.get(id,{}),**spec,'image':filename,'source_image_url':source['url']+'#page='+str(spec['source_pdf_page']),'source_page_url':records[source['id']]['source'],'source_document_url':source['url'],'image_sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'image_dimensions':list(image.size),'image_checked_on':manifest['date']}
    panel['record_ids']=sorted(set(panels.get(id,{}).get('record_ids',[])+spec['record_ids']))
    panel.pop('source_crop_points',None)
    if id not in panels:new_ids.append(id)
    panels[id]=panel

for link in manifest['manual_links']:
    assert link['record_id'] in records
    for id in link['panel_ids']:
        panel=panels[id];panel['record_ids']=sorted(set(panel['record_ids']+[link['record_id']]))
        note=link['scope_note']
        if note not in panel['applicability_limits']:panel['applicability_limits']+=' '+note
        evidence={key:value for key,value in link.items() if key not in ['panel_ids','scope_note']}
        evidence.update(checked_on=manifest['date'],sha256=sources[link['record_id']]['sha256'])
        existing=panel.setdefault('verified_manual_links',[])
        if evidence not in existing:existing.append(evidence)

for pack in packs:
    members=[p for p in panels.values() if p['brand']==pack['brand'] and p['category']==pack['category']]
    pack['panel_ids']=list(dict.fromkeys(pack['panel_ids']+[p['id'] for p in sorted(members,key=lambda p:p['model'].casefold())]))
    pack['record_ids']=sorted(set(pack['record_ids'])|{id for p in members for id in p['record_ids']})
    pack['record_count']=len(pack['record_ids']);pack['direct_pdf_count']=sum(bool(records[id]['url']) for id in pack['record_ids'])
    assert old_pack_records[pack['id']]<=set(pack['record_ids'])
for id,ids in old_panel_records.items():assert ids<=set(panels[id]['record_ids'])
ordered=sorted(panels.values(),key=lambda p:(p['id']!='gent-vigilon-compact',p['brand'].casefold(),p['model'].casefold()))
coverage=read(data/'coverage.json');coverage.update(generated=manifest['date'],pictured_families=len(ordered),brands=len({p['brand'] for p in ordered}),packs=len(packs))
coverage['unresolved']=[entry for entry in coverage.get('unresolved',[]) if entry['id'] not in panels]
write(data/'panels.json',ordered);write(data/'packs.json',packs);write(data/'coverage.json',coverage)
print(json.dumps({'new_panel_ids':new_ids,'pictured_families':len(ordered),'packs':len(packs),'checked_documents':len(sources),'enriched_panel_ids':sorted({id for link in manifest['manual_links'] for id in link['panel_ids']}),'existing_panel_and_pack_links_preserved':True}))

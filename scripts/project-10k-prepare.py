#!/usr/bin/env python3
"""Stage hash-approved images with exact archive model matches; never publish."""
import argparse, hashlib, json, re, shutil
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser()
p.add_argument('--review',type=Path,default=Path('project-10k-review'))
p.add_argument('--approved',type=Path,required=True)
p.add_argument('--output',type=Path,default=Path('project-10k-batches'))
a=p.parse_args()
def read(path): return json.loads(path.read_text())
def write(path,obj): path.write_text(json.dumps(obj,indent=2)+'\n')
data=Path('public/app/data')
records=read(data/'catalogue.json')['records']+read(data/'device-documents.json')
existing=read(data/'devices.json')+read(data/'panels.json')
ids={x['id'] for x in existing}
hashes={x.get('image_sha256') for x in existing}
approved=read(a.approved)
batch=a.output/'paxton-project-10k'
(batch/'images').mkdir(parents=True,exist_ok=True)
rows=[]; audit=[]
for item in read(a.review/'report.json'):
    code=item['code']
    result={'code':code}
    try:
        if not re.fullmatch(r'[0-9]{3}-[0-9]{3}[A-Z]{0,2}',code): raise ValueError('Invalid code')
        if item.get('status')!='downloaded-awaiting-review': raise ValueError('No retrieved image')
        digest=item['image_sha256']
        if approved.get(code)!=digest: raise ValueError('Image not explicitly hash-approved')
        identifier='paxton-'+code.lower()
        if identifier in ids or digest in hashes: raise ValueError('Duplicate ID or image')
        pattern=re.compile(r'(?<![A-Za-z0-9])'+re.escape(code)+r'(?![A-Za-z0-9])',re.I)
        if any(x.get('brand','').lower()=='paxton' and pattern.search(' '.join([x.get('model',''),*x.get('part_numbers',[]),*x.get('aliases',[])])) for x in existing): raise ValueError('Existing model')
        matches=[r for r in records if r.get('brand')=='Paxton' and r.get('category')=='access-control' and not r.get('retired_from_packs') and r.get('url') and pattern.search(' '.join([r.get('title',''),*r.get('models',[])]))]
        if not matches: raise ValueError('No exact archive document match')
        filename=item['image']
        if Path(filename).name!=filename: raise ValueError('Invalid image path')
        source=a.review/filename
        if hashlib.sha256(source.read_bytes()).hexdigest()!=digest: raise ValueError('Image hash mismatch')
        with Image.open(source) as im:
            im.load()
            if im.format!='WEBP' or list(im.size)!=item['image_dimensions'] or min(im.size)<120 or max(im.size)>1600: raise ValueError('Invalid image')
        target=identifier+'.webp'
        shutil.copyfile(source,batch/'images'/target)
        rows.append(dict(id=identifier,brand='Paxton',model=code,category='access-control',device_type='accessory',aliases=[],part_numbers=[code],protocol='Confirm product label and system compatibility',image=target,source_image_url=item['source_image_url'],source_page_url=item['source_page_url'],record_ids=sorted({r['id'] for r in matches}),identification_notes='Compare the manufacturer picture and exact product label.',applicability_limits='Exact code matched in archive metadata; confirm document edition and applicability before use.',image_credit='Paxton manufacturer product image',image_type='official-manufacturer-product-image',image_sha256=digest,image_dimensions=item['image_dimensions'],uk_priority=True,uk_priority_order=1000))
        ids.add(identifier);hashes.add(digest)
        result.update(status='staged',record_ids=rows[-1]['record_ids'])
    except Exception as exc: result.update(status='held',reason=str(exc))
    audit.append(result)
write(batch/'devices.json',rows)
write(batch/'audit.json',audit)
from collections import Counter
print(json.dumps({'staged':len(rows),'held':len(audit)-len(rows),'hold_reasons':dict(Counter(x['reason'] for x in audit if x['status']=='held'))},indent=2))
for x in audit:
    if x['status']=='held': print(x['code']+': '+x['reason'])

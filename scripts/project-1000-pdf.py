#!/usr/bin/env python3
"""Extract review-only image candidates from manufacturer PDFs."""
import json, re, time, hashlib, io, argparse
from pathlib import Path
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser
import requests, fitz
from PIL import Image
p=argparse.ArgumentParser()
p.add_argument('--brand',required=True)
p.add_argument('--limit',type=int,default=60)
a=p.parse_args()
root=Path('project-1000-pdf-review');root.mkdir(exist_ok=True)
data=json.loads(Path('public/app/data/catalogue.json').read_text())
records=data['records'] if isinstance(data,dict) else data
domains={'Apollo':['apollo-fire.co.uk','apollo-fire.com'],'Hochiki':['hochikieurope.com','hochiki.co.uk'],'Texecom':['texe.com','texecom.com'],'Pyronix':['pyronix.com'],'Orisec':['orisec.co.uk','orisec.com'],'Hikvision':['hikvision.com'],'Dahua':['dahuasecurity.com']}
def allowed(url):
    u=urlparse(url)
    return u.scheme=='https' and not u.username and not u.password and u.port in (None,443) and any(u.hostname==d or (u.hostname or '').endswith('.'+d) for d in domains[a.brand])
session=requests.Session();agent='FINDR-Catalogue-Research';session.headers['User-Agent']=agent
robots={};results=[];errors=[];seen=set();deadline=time.monotonic()+480
def save():
    (root/'report.json').write_text(json.dumps(dict(brand=a.brand,checked=len(seen),candidates=results,errors=errors),indent=2))
def fetch(url):
    u=urlparse(url);base=u.scheme+'://'+u.netloc
    if base not in robots:
        r=session.get(base+'/robots.txt',timeout=(5,10),allow_redirects=False)
        if r.status_code not in (200,404): raise ValueError('Robots unavailable')
        rp=RobotFileParser();rp.parse(r.text.splitlines() if r.status_code==200 else []);robots[base]=rp
    if not robots[base].can_fetch(agent,url): raise ValueError('Robots denied')
    delay=max(1,robots[base].crawl_delay(agent) or 1)
    if time.monotonic()+delay+25>deadline: raise ValueError('Budget reached')
    time.sleep(delay)
    with session.get(url,timeout=(5,10),stream=True,allow_redirects=False) as r:
        if r.status_code!=200: raise ValueError('HTTP '+str(r.status_code))
        b=bytearray()
        for chunk in r.iter_content(65536):
            b.extend(chunk)
            if len(b)>20000000 or time.monotonic()>deadline: raise ValueError('Download budget exceeded')
        if not b.startswith(b'%PDF-'): raise ValueError('Not PDF')
        return bytes(b)
rows=[r for r in records if r.get('brand')==a.brand and not r.get('retired_from_packs') and isinstance(r.get('url'),str) and allowed(r['url'])]
rows.sort(key=lambda r:(not bool(re.search(r'data.?sheet|specification|product sheet',r.get('title',''),re.I)),len(r.get('models',[]))))
save()
for r in rows:
    if len(seen)>=a.limit or time.monotonic()>deadline: break
    url=r['url']
    if url in seen: continue
    seen.add(url)
    print(a.brand,len(seen),r.get('title'),flush=True)
    try:
        models=[m for m in r.get('models',[]) if isinstance(m,str) and re.search(r'\d{3,}',m)]
        if not models: continue
        raw=fetch(url);digest=hashlib.sha256(raw).hexdigest()
        with fitz.open(stream=raw,filetype='pdf') as doc:
            for i in range(min(4,len(doc))):
                if time.monotonic()>deadline: break
                page=doc[i];txt=page.get_text()
                matches=[m for m in models if re.search(r'(?<![A-Za-z0-9-])'+re.escape(m)+r'(?![A-Za-z0-9-])',txt,re.I)]
                if not matches: continue
                for info in page.get_image_info(xrefs=True)[:20]:
                    xref=info['xref']
                    if not xref or min(info['width'],info['height'])<120: continue
                    im=Image.open(io.BytesIO(doc.extract_image(xref)['image'])).convert('RGB')
                    im.thumbnail((1000,1000))
                    buf=io.BytesIO();im.save(buf,format='WEBP',quality=85);b=buf.getvalue();h=hashlib.sha256(b).hexdigest()
                    (root/(h+'.webp')).write_bytes(b)
                    results.append(dict(record_id=r['id'],url=url,pdf_sha256=digest,page=i+1,models=matches,image=h+'.webp',image_sha256=h,bbox=list(info['bbox']),status='visual-review-required'))
    except Exception as e: errors.append(dict(record_id=r['id'],error=str(e)))
    finally: save()
print(json.dumps(dict(checked=len(seen),candidates=len(results),errors=len(errors))))

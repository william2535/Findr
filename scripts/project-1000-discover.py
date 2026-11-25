#!/usr/bin/env python3
"""Bounded archive-led discovery of official manufacturer product pages; review only."""
import argparse,json,re,time
from pathlib import Path
from urllib.parse import urlparse,urljoin
from urllib.robotparser import RobotFileParser
import requests
from bs4 import BeautifulSoup
p=argparse.ArgumentParser()
p.add_argument('--brand',required=True)
p.add_argument('--limit',type=int,default=200)
a=p.parse_args()
brands={'Apollo':('apollo-fire.co.uk','apollo-fire.com'),'Hochiki':('hochikieurope.com','hochiki.co.uk'),'Texecom':('texe.com','texecom.com'),'Pyronix':('pyronix.com',),'Orisec':('orisec.co.uk','orisec.com'),'Hikvision':('hikvision.com',),'Dahua':('dahuasecurity.com',)}
domains=brands[a.brand]
def allowed(url):
    u=urlparse(url)
    return u.scheme=='https' and not u.username and not u.password and u.port in (None,443) and any(u.hostname==d or (u.hostname or '').endswith('.'+d) for d in domains)
data=Path('public/app/data')
records=json.loads((data/'catalogue.json').read_text())['records']
existing=json.loads((data/'devices.json').read_text())+json.loads((data/'panels.json').read_text())
known={str(v).casefold() for d in existing if d.get('brand')==a.brand for v in [d.get('model',''),*d.get('part_numbers',[]),*d.get('aliases',[])]}
models={}
for r in records:
    if r.get('brand')!=a.brand or r.get('retired_from_packs') or not r.get('url'): continue
    for m in r.get('models',[]):
        if isinstance(m,str) and 3<=len(m)<=60 and re.search(r'\d',m) and m.casefold() not in known:
            models.setdefault(m,[]).append(r['id'])
session=requests.Session()
agent='FINDR-Catalogue-Research'
session.headers['User-Agent']=agent
robots={}
def get(url):
    if not allowed(url): raise ValueError('Outside approved domain')
    u=urlparse(url);base=u.scheme+'://'+u.netloc
    if base not in robots:
        r=session.get(base+'/robots.txt',timeout=15,allow_redirects=False)
        if r.status_code not in (200,404): raise ValueError('Robots unavailable')
        rp=RobotFileParser();rp.parse(r.text.splitlines() if r.status_code==200 else []);robots[base]=rp
    if not robots[base].can_fetch(agent,url): raise ValueError('Robots denied')
    time.sleep(max(1,robots[base].crawl_delay(agent) or 1))
    with session.get(url,timeout=(10,20),stream=True,allow_redirects=False) as r:
        if r.status_code!=200: raise ValueError('HTTP '+str(r.status_code))
        b=bytearray()
        for c in r.iter_content(65536):
            b.extend(c)
            if len(b)>4_000_000: raise ValueError('Page too large')
        return bytes(b)
queue=list(dict.fromkeys(r.get('source') for r in records if r.get('brand')==a.brand and isinstance(r.get('source'),str) and allowed(r['source']) and not urlparse(r['source']).path.lower().endswith('.pdf')))
queue+=['https://www.'+d+'/' for d in domains]
seen=set();found={};errors=[]
patterns={m:re.compile(r'(?<![A-Za-z0-9-])'+re.escape(m)+r'(?![A-Za-z0-9-])',re.I) for m in models}
while queue and len(seen)<a.limit and len(found)<300:
    url=queue.pop(0)
    if url in seen: continue
    seen.add(url)
    try:
        soup=BeautifulSoup(get(url),'html.parser')
        title=' '.join(x.get_text(' ',strip=True) for x in soup.select('h1,title'))
        for img in soup.select('img'):
            src=img.get('data-src') or img.get('src') or ''
            image=urljoin(url,src)
            if not src or not allowed(image): continue
            label=src+' '+img.get('alt','')
            for m,pat in patterns.items():
                if pat.search(label) and pat.search(title):
                    found.setdefault(m,dict(brand=a.brand,model=m,product_page=url,image_url=image,record_ids=models[m],status='candidate-review-required'))
        for link in soup.select('a[href]'):
            dest=urljoin(url,link['href']).split('#')[0]
            u=urlparse(dest)
            if allowed(dest) and not u.query and re.search(r'(?i)/(products?|devices?|detectors?|cameras?|product-range)(/|$)',u.path) and not re.search(r'\.[a-z0-9]{2,5}$',u.path,re.I) and dest not in seen and dest not in queue and len(queue)<2000: queue.append(dest)
    except Exception as e: errors.append({'url':url,'error':str(e)})
out=Path('project-1000-review');out.mkdir(exist_ok=True)
(out/(a.brand+'.json')).write_text(json.dumps({'brand':a.brand,'archive_models':len(models),'pages_checked':len(seen),'candidates':list(found.values()),'errors':errors},indent=2))
print(json.dumps({'brand':a.brand,'archive_models':len(models),'pages_checked':len(seen),'candidates':len(found)}))

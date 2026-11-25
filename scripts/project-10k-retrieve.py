#!/usr/bin/env python3
"""Download candidate photographs for review; never publish automatically."""
import argparse, hashlib, io, json, re, time
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageOps

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--input',type=Path,default=Path('research/project-10k/paxton-source-review.json'))
p.add_argument('--output',type=Path,default=Path('project-10k-review'))
p.add_argument('--limit',type=int,default=50)
a=p.parse_args()
a.output.mkdir(parents=True,exist_ok=True)
session=requests.Session()
agent='FINDR-Catalogue-Research'
session.headers['User-Agent']=agent
robots={}
def get(url,limit):
    u=urlparse(url)
    if u.scheme!='https' or u.hostname not in {'www.paxton-access.com','paxton-access.com'} or u.username or u.password or u.port not in (None,443):
        raise ValueError('Source outside approved manufacturer domain')
    root=f'{u.scheme}://{u.netloc}'
    if root not in robots:
        rp=RobotFileParser()
        r=session.get(root+'/robots.txt',timeout=20,allow_redirects=False)
        if r.status_code==404: rp.parse([])
        else:
            r.raise_for_status()
            if r.status_code!=200: raise ValueError('Robots unavailable')
            rp.parse(r.text.splitlines())
        robots[root]=rp
    if not robots[root].can_fetch(agent,url): raise ValueError('Robots disallows URL')
    time.sleep(max(1,robots[root].crawl_delay(agent) or 1))
    with session.get(url,timeout=(10,30),stream=True,allow_redirects=False) as r:
        r.raise_for_status()
        if r.status_code!=200: raise ValueError('Unexpected response or redirect')
        out=bytearray()
        for chunk in r.iter_content(65536):
            out.extend(chunk)
            if len(out)>limit: raise ValueError('Download exceeds limit')
        return bytes(out)
data=json.loads(a.input.read_text())
rows=data['rows'] if isinstance(data,dict) else data
report=[]
seen=set()
Image.MAX_IMAGE_PIXELS=20_000_000
for row in rows[:max(0,a.limit)]:
    code=str(row.get('code') or row.get('part_number') or '')
    entry={'code':code,'status':'pending-review','image_verified':False,'manual_verified':False}
    try:
        if not re.fullmatch(r'[A-Za-z0-9-]+',code): raise ValueError('Invalid code')
        page=row['product_page']
        entry['source_page_url']=page
        soup=BeautifulSoup(get(page,4_000_000),'html.parser')
        if code.lower() not in soup.get_text(' ',strip=True).lower(): raise ValueError('Exact product code not found on page')
        candidates=[]
        for img in soup.select('img'):
            src=img.get('data-src') or img.get('src')
            if src and code.lower() in (src+' '+img.get('alt','')).lower(): candidates.append(urljoin(page,src))
        if not candidates: raise ValueError('No code-matched image; manual review required')
        # Exclude obvious technical drawings and non-product assets.
        candidates=[url for url in candidates if not re.search(r'(?i)(?:^|[-_/])(?:dim|dimensions?|drawing|diagram|schematic|wiring|logo|icon)(?:[-_./]|$)',urlparse(url).path)]
        if not candidates: raise ValueError('Only drawing or non-product candidates found')
        for url in dict.fromkeys(candidates):
            try:
                raw=get(url,12_000_000)
                with Image.open(io.BytesIO(raw)) as im:
                    im=ImageOps.exif_transpose(im).convert('RGB')
                    if min(im.size)<120: raise ValueError('Image too small')
                    im.thumbnail((1200,1200))
                    buf=io.BytesIO(); im.save(buf,'WEBP',quality=85)
                    dimensions=list(im.size)
                content=buf.getvalue(); digest=hashlib.sha256(content).hexdigest()
                if digest in seen: continue
                seen.add(digest)
                filename=code.lower()+'-'+digest[:12]+'.webp'
                (a.output/filename).write_bytes(content)
                entry.update(image=filename,image_sha256=digest,image_dimensions=dimensions,source_image_url=url)
                break
            except Exception as exc: entry['image_error']=str(exc)
        if 'image' not in entry: raise ValueError('No usable unique image')
        entry['status']='downloaded-awaiting-review'
    except Exception as exc: entry.update(status='skipped',error=str(exc))
    report.append(entry)
(a.output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'checked':len(report),'downloaded':sum(r['status']=='downloaded-awaiting-review' for r in report)}))

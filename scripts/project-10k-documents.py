#!/usr/bin/env python3
"""Retrieve exact-code technical PDF candidates for review, never publish."""
import hashlib, io, json, re, time
from pathlib import Path
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser
import requests
from pypdf import PdfReader

root=Path('project-10k-review')
report=json.loads((root/'report.json').read_text())
data=Path('public/app/data')
records=json.loads((data/'catalogue.json').read_text())['records']+json.loads((data/'device-documents.json').read_text())
session=requests.Session()
agent='FINDR-Catalogue-Research'
session.headers['User-Agent']=agent
robots={}
cache={}
def fetch(url):
    u=urlparse(url)
    if u.scheme!='https' or u.hostname not in ('www.paxton-access.com','paxton-access.com') or u.username or u.password or u.port not in (None,443):
        raise ValueError('Unapproved source')
    base=u.scheme+'://'+u.netloc
    if base not in robots:
        r=session.get(base+'/robots.txt', timeout=20,allow_redirects=False)
        if r.status_code not in (200,404): raise ValueError('Robots unavailable')
        rp=RobotFileParser();rp.parse(r.text.splitlines() if r.status_code==200 else []);robots[base]=rp
    if not robots[base].can_fetch(agent,url): raise ValueError('Robots disallows URL')
    time.sleep(max(1,robots[base].crawl_delay(agent) or 1))
    with session.get(url,timeout=(10,30),stream=True,allow_redirects=False) as r:
        if r.status_code!=200: raise ValueError('Unexpected HTTP response')
        raw=bytearray()
        for chunk in r.iter_content(65536):
            raw.extend(chunk)
            if len(raw)>20_000_000: raise ValueError('PDF exceeds limit')
    if not raw.startswith(b'%PDF-'): raise ValueError('Not a PDF')
    pdf=PdfReader(io.BytesIO(raw))
    if pdf.is_encrypted or not 1<=len(pdf.pages)<=100: raise ValueError('Unsupported PDF')
    pages=[p.extract_text() or '' for p in pdf.pages]
    return bytes(raw),pages
out=[]
documents={}
for item in report:
    code=item['code']
    if item.get('status')!='downloaded-awaiting-review': continue
    if not re.fullmatch(r'\d{3}-\d{3}[A-Z]{0,2}',code): continue
    pattern=re.compile(r'(?<![A-Za-z0-9-])'+re.escape(code)+r'(?![A-Za-z0-9-])',re.I)
    existing=[r['id'] for r in records if r.get('brand')=='Paxton' and r.get('category')=='access-control' and r.get('url') and not r.get('retired_from_packs') and pattern.search(' '.join([r.get('title',''),*r.get('models',[])]))]
    result={'code':code,'archive_record_ids':existing,'candidates':[],'errors':[]}
    if not existing:
        urls=[u for u in item.get('document_candidates',[]) if re.search(r'(?i)(?:^|/)(?:ins[-_]?|tds[-_]?|ds[-_]?)\d',urlparse(u).path)]
        for url in list(dict.fromkeys(urls))[:12]:
            try:
                if url not in cache:
                    if len(cache)>=150: raise ValueError('Run PDF budget reached')
                    try: cache[url]=fetch(url)
                    except Exception as exc: cache[url]=str(exc)
                if isinstance(cache[url],str): raise ValueError(cache[url])
                raw,pages=cache[url]
                matching=[i+1 for i,p in enumerate(pages) if pattern.search(p)]
                if not matching: continue
                digest=hashlib.sha256(raw).hexdigest()
                identifier='device-doc-paxton-'+digest[:12]
                doc=documents.setdefault(identifier,dict(id=identifier,brand='Paxton',category='access-control',title=Path(urlparse(url).path).stem,models=[],origin='device-reference',status='file-hash',source=url,url=url,sha256=digest,bytes=len(raw),pages=len(pages)))
                if code not in doc['models']: doc['models'].append(code)
                result['candidates'].append({'id':identifier,'sha256':digest,'exact_code_pages':matching,'url':url})
            except Exception as exc: result['errors'].append({'url':url,'error':str(exc)})
    out.append(result)
(root/'document-review.json').write_text(json.dumps(out,indent=2)+'\n')
(root/'candidate-documents.json').write_text(json.dumps(list(documents.values()),indent=2)+'\n')
print(json.dumps({'checked':len(out),'archive_matched':sum(bool(x['archive_record_ids']) for x in out),'pdf_matched':sum(bool(x['candidates']) for x in out),'unique_candidate_documents':len(documents)}))

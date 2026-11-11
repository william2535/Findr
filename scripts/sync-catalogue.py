from pathlib import Path
import json,subprocess,sys
repo=Path(sys.argv[1]).resolve();root=Path(__file__).resolve().parents[1];data=json.loads((repo/'data/app-manifest.json').read_text());rows=[]
commit=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
for r in data['records']:
 d=r['download'];v=d.get('verification') or {};rows.append(dict(id=r['id'],brand=r['brand'],category=r['category'],models=r['models'],title=r['title'],type=r['document_type'],url=d.get('url'),source=r['source_url'],revision=r.get('verified_revision') or r.get('revision_hint'),status=d['status'],sha256=v.get('sha256'),bytes=v.get('bytes'),pages=v.get('page_count')))
(root/'public/app/data/catalogue.json').write_text(json.dumps(dict(generated=data['generated_on'],commit=commit,repository=data['repository_url'],records=rows),separators=(',',':')))
download_map={r['id']:r['url'] for r in rows if r['url']}
# Reviewed device references have their own identities and must survive an
# archive refresh without modifying or impersonating the archive records.
supplementary=root/'public/app/data/device-documents.json'
if supplementary.exists():
 for r in json.loads(supplementary.read_text()):
  assert r['id'] not in download_map, 'Device reference overlaps archive identity'
  assert r.get('origin')=='device-reference' and r.get('sha256'), 'Device reference needs provenance'
  if r.get('url'):download_map[r['id']]=r['url']
encoded=json.dumps(download_map,separators=(',',':'))
for p in ['lib/download-map.json','public/app/data/download-map.json']:(root/p).write_text(encoded)
print(len(rows),'records from',commit)

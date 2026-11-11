"""Materialise reviewed browsing groups; source-page applicability stays untouched."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
entries=json.loads((ROOT/'public/app/data/wiring-diagrams.json').read_text())['entries']
# Explicit source-family boundaries; no compatibility is derived from the groups.
families={
'ACT': [('ACT10', ['act-6137ac1ea5e1'])],
'Advanced': [('Axis EN',['advanced-c1f080ef94b1']),('MxPro 4',['advanced-9e6af4fbfd7d']),('MxPro 5',['advanced-a18ea5cccf04'])],
'Aico': [('Ei140e',['device-doc-aico-8f8b5876b06d']),('Ei3000',['device-doc-aico-6c128c0b705a','device-doc-aico-7dbcfdf98ccb']),('MCP401RC',['aico-3940aa649cda'])],
'Apollo': [('XP95 / Discovery bases',['apollo-0f80e75d8a7b']),('XPERT 8 bases',['apollo-1288f40f26a2']),('Orbis bases',['apollo-9739bb7328db']),('Intelligent devices',['apollo-7e9f50267330','apollo-33c5f6586bfd']),('REACH interface',['apollo-00c3936bf0fc']),('XPander interface',['apollo-f27ce8642ca3']),('Beam detector',['apollo-e4ec6992b586']),('IR3 flame detector',['apollo-d632a36424b9']),('MiniDisc indicators',['apollo-ae612a27ea60'])],
'BBV': [('Rx10X',['bbv-0aa95402bc61'])],
'Bosch': [('Blue Line Gen2',['bosch-3d8651b2effe','bosch-0ba92138ab30'])],
'C-TEC': [('CFP Standard',['c-tec-4b1267f3fefc']),('CFP repeater',['c-tec-71e2d26e5669']),('XFP 16-zone',['c-tec-44b03d254ee3']),('XFP 32-zone',['c-tec-ba3f93b60d06']),('XFP repeater',['c-tec-ec140ad546f0']),('CAST devices',['device-doc-c-tec-1a72f739e6d0','device-doc-c-tec-cb5ba501ef82','device-doc-c-tec-f18a6fbbfbc7','device-doc-c-tec-df7988f16dc3'])],
'Eaton / Cooper': [('CF1100 / CF1200',['eaton-cooper-053a993a0c8b']),('CF3000',['eaton-cooper-d30026e0a49d'])],
'Eaton / Scantronic': [('Scantronic 9752',['eaton-scantronic-105c389dba94'])],
'Fike': [('Sita devices',['fike-594585b67819','fike-1b2de37e6684','fike-77a5c9cbeaa2','fike-0a81dc0dbbc1']),('Twinflex devices',['fike-6fec87fdf63f','fike-078df373e6a6','fike-44f428530108','fike-538db8f6d1d5']),('TWINFLEXpro panel',['fike-fc894e8e5796']),('TWINFLEXpro² repeater',['facp-53d7f2b3-b7fd-495d-8711-13b42717beef'])],
'Gent': [('S-Quad',['gent-0ba4cfc5de7c']),('S4 call points',['device-doc-gent-9c36c632ebd9']),('SenTRI ONE',['gent-c2e20b406444']),('Vigilon Compact',['facp-d442a96b-9a39-4e76-b773-5f7676e175dc']),('Xenex',['gent-33fdf5de07b1'])],
'Haes': [('AlarmSense PLUS',['haes-2ddf67adc24c']),('Esento Eclipse',['haes-d04704a4ec15']),('Esento Excel',['haes-cd2d5aa5d441']),('Esento repeater',['haes-98aed045fb2f']),('Fusion',['haes-c83f3256011b'])],
'Hochiki': [('ESP sensors and bases',['hochiki-f97bdbde045d']),('CHQ beacon devices',['hochiki-85ce4a38f43c','hochiki-872585639bed']),('CHQ-ARI(CLR)',['hochiki-ea524f5d80ee']),('CHQ controllers',['hochiki-7547f36e3e7f']),('Latitude',['hochiki-2e3c913355f8'])],
'Honeywell': [('Galaxy Dimension',['honeywell-18a74589d3d1']),('HRDE4X4 recorder',['honeywell-4f5136f7b0f1'])],
'Kentec': [('Sigma CP',['kentec-0d82d93522c3']),('Sigma CP-R',['kentec-922756f21680']),('Sigma XT',['kentec-001fd3365756']),('Syncro',['kentec-21f0fd797fe0']),('Solo ESP',['kentec-be1af1c20d35']),('Solo Response',['kentec-579029878abe']),('Solo 2 Response',['kentec-e2d68c942c86']),('Hydrosense CP-R',['kentec-07eb8f5458c5'])],
'Morley-IAS': [('ZX',['facp-8a4e02b8-8f8d-4061-b018-4e4b1e71b948'])],
'NVT': [('UTP CCTV transmission',['nvt-8589e51457ae'])],
'Nittan': [('Evolution devices',['device-doc-nittan-c2305fc3416e','device-doc-nittan-60acce3d2e53','device-doc-nittan-24b1fd056ba7','device-doc-nittan-2baa1e344172','device-doc-nittan-f912292fc103','device-doc-nittan-509751ace6d5','device-doc-nittan-92f082662910','device-doc-nittan-c65c530f2411','device-doc-nittan-651d5abec767'])],
'Notifier': [('ID2000',['facp-b4f11834-bd71-4134-8d67-cb9c6d11f4df'])],
'Orisec': [('CP-25 / CP-50 / CP-100',['orisec-01d0e0ac004c'])],
'Paxton': [('Net2',['paxton-0ff722d66548','paxton-191cfc4e7f90']),('Switch2',['paxton-27e5d85e1edc']),('TOUCHLOCK Compact',['paxton-34d2fed7ef37'])],
'Protec': [('3000PLUS / 6000PLUS bases',['protec-502abea1875d']),('6000 modules',['protec-ce38ec46cb37','protec-3d5612b83a2a','protec-19c2f3a94324'])],
'Pyronix': [('KX15DT',['pyronix-12dc1a0275b5']),('KX15DTAM',['pyronix-05952749c9ff'])],
'Risco': [('BWare',['risco-00a6655953a1']),('iWISE Grade 3',['risco-e8aee4e7a650'])],
'Texecom': [('Capture G2',['texecom-778b363ae34b']),('Odyssey Premier Elite',['texecom-24fe7d380381']),('Veritas',['texecom-031d1f7f736b'])],
'The Fire Beam Company': [('Fire Beam BLUE',['device-doc-the-fire-beam-company-ef8e716e192b']),('Fire Beam Xtra',['device-doc-the-fire-beam-company-9ea9d54e1f2c'])],
'Tunstall': [('Epilepsy transmitter',['tunstall-31748186a127'])],
'Tynetec': [('Advent XT',['tynetec-ceeb9047ffe7','tynetec-0bf0ff779621','tynetec-b9c2d63d6565']),('Advent XT2',['tynetec-cccbd788ab8a'])]
}
colours=['#7dd3c7','#b9a5f4','#f0a5bd','#82b9f4','#eead79','#ef9198','#91b9ff','#76c8db','#76c8db','#b5cf80','#f19a91','#c3a1e9','#eea1a6','#a1baf4','#82c1e9','#c5a2e3','#89c9bc','#dea3ce','#f1af78','#c29ee8','#a7c97a','#8ecbd8','#e3bb7c','#a3c0ee','#e8999e','#a0cba0','#d7aedb','#94bedf']
import re,unicodedata
def slug(s):return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
brands=[];packs=[]
for (brand,groups),colour in zip(families.items(),colours):
 bid=slug(brand);brands.append({'id':bid,'name':brand,'colour':colour})
 for family,records in groups:
  ids=[e['id'] for e in entries if e['brand']==brand and e['recordId'] in records]
  packs.append({'id':bid+'-'+slug(family),'brandId':bid,'family':family,'entryIds':ids})
# The combined Gent source contains two different panel boards: split by page,
# never attach every record-level page to both families.
shared=[e for e in entries if e['recordId']=='facp-7538be76-f958-46e4-99f6-c718601bb349']
for e in shared:
 if e['models']==['Vigilon 4/6-loop']:
  packs.append({'id':'gent-vigilon-4-6-loop','brandId':'gent','family':'Vigilon 4/6-loop','entryIds':[e['id']]})
 elif e['models']==['Vigilon Compact']:
  next(p for p in packs if p['id']=='gent-vigilon-compact')['entryIds'].append(e['id'])
 else:raise ValueError('Unreviewed Gent board scope')
notes={
'kentec-sigma-cp':'K-series and T-series appear on the same source page. Use the drawing for the exact panel variant.',
'kentec-sigma-cp-r':'Clear supply and relay pages only. Conflicting repeater termination pages remain excluded.',
'kentec-hydrosense-cp-r':'Supply and relay reference only. Conflicting network termination instructions remain excluded.',
'gent-s-quad':'Historical family source. Its legacy input examples and unsupported call-point limits remain attached to the picture.',
'protec-3000plus-6000plus-bases':'Shared source page, separate conventional 3000PLUS and addressable 6000PLUS drawings. The circuits are not interchangeable.',
'hochiki-chq-ari-clr':'CHQ-ARI(CLR) source only; this does not establish wiring for another CHQ-ARI variant.',
'fike-twinflex-devices':'Model-specific Twinflex device references. The recorded SRP exclusions remain attached to their source pages.',
'nittan-evolution-devices':'Each device keeps its own base, isolator and panel compatibility conditions; family membership does not establish compatibility.',
'orisec-cp-25-cp-50-cp-100':'Legacy CP-25 / CP-50 / CP-100 source. CP-200 and other generations are outside this pack.',
'apollo-intelligent-devices':'Separate call-point and I/O drawings. Check the full product code on each picture.',
'hochiki-chq-beacon-devices':'Separate CHQ-AB and CHQ-CB drawings, including their power and variant conditions.',
}
for pack in packs:
 pack['note']=notes.get(pack['id'],'Each picture retains its own model, variant and document edition. A family pack is a browsing collection, not a compatibility claim.')
 pack['sharedFamilyReference']=pack['id']=='protec-3000plus-6000plus-bases'
 ids=pack['entryIds'];assert ids and len(ids)==len(set(ids))
all_ids=[i for p in packs for i in p['entryIds']]
assert len(all_ids)==len(set(all_ids))==len(entries)
assert set(all_ids)=={e['id'] for e in entries}
result={'schemaVersion':1,'version':'0.23.0','title':'Wiring family packs','scope':'Reviewed manual-page collections. Brand colours are FINDR browsing accents; no manufacturer endorsement or cross-model wiring compatibility is implied.','brands':brands,'packs':packs}
(ROOT/'public/app/data/wiring-packs.json').write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
print(f'{len(brands)} brands / {len(packs)} families / {len(all_ids)} pictures')

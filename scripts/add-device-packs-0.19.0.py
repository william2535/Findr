#!/usr/bin/env python3
"""Add the reviewed Bosch/Risco batch using six existing archive PDFs.

Usage: python scripts/add-device-packs-0.19.0.py /path/to/pdf-directory [--apply]
PDFs must be named <archive-record-id>.pdf. The default verifies/reports without
writing application files. Hashes fail closed; no source download or catalogue
record is invented. Images are extracted original PDF objects, not generated.
"""
import argparse
import hashlib
from io import BytesIO
import json
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'public/app/data'
RESEARCH = ROOT / 'research/device-packs-0.19.0'
read = lambda path: json.loads(path.read_text())
write = lambda path, value: path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
sha = lambda value: hashlib.sha256(value).hexdigest()
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source_dir', type=Path)
parser.add_argument('--apply', action='store_true')
args = parser.parse_args()
catalogue = read(DATA / 'catalogue.json')
records = {row['id']: row for row in catalogue['records']}
source_ids = ['bosch-0ba92138ab30', 'bosch-3d8651b2effe', 'bosch-be9d38fc89d0', 'bosch-c221490fad45', 'risco-00a6655953a1', 'risco-e8aee4e7a650']
checked = []
for identifier in source_ids:
    record = records[identifier]
    content = (args.source_dir / (identifier + '.pdf')).read_bytes()
    assert content.startswith(b'%PDF'), identifier + ': not a PDF'
    assert sha(content) == record['sha256'], identifier + ': source differs from the archive snapshot'
    assert len(content) == record['bytes'], identifier + ': byte count differs'
    with fitz.open(stream=content, filetype='pdf') as doc:
        assert len(doc) == record['pages'], identifier + ': page count differs'
        checked.append({'record_id': identifier, 'url': record['url'], 'sha256': sha(content), 'bytes': len(content), 'pages': len(doc), 'hash_matches_archive': True})

# Source objects were inspected both in page context and as extracted images.
# The Bosch image is explicitly a representative family photograph; the two
# installation guides establish the different WP / non-WP product-code scopes.
source_images = {
    'bosch': ('bosch-be9d38fc89d0', 52),
    'bware': ('risco-00a6655953a1', 65),
    'iwise': ('risco-e8aee4e7a650', 77),
}
images = {}
for key, (identifier, xref) in source_images.items():
    with fitz.open(args.source_dir / (identifier + '.pdf')) as doc:
        assert xref in [entry[0] for entry in doc[0].get_images(full=True)], identifier + ': image is not on PDF page 1'
        pix = fitz.Pixmap(doc, xref)
        if pix.colorspace and pix.colorspace.n > 3:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        image = Image.open(BytesIO(pix.tobytes('png'))).convert('RGB')
        image.thumbnail((900, 900), Image.Resampling.LANCZOS)
        out = BytesIO()
        image.save(out, 'WEBP', quality=90, method=6)
        images[key] = (out.getvalue(), list(image.size))

specs = [
    {
        'id': 'bosch-device-blue-line-gen2-wp', 'brand': 'Bosch',
        'model': 'Blue Line Gen2 pet-friendly TriTech — WP6 / WP12 G/H family',
        'part_numbers': ['ISC-BDL2-WP6G', 'ISC-BDL2-WP12G', 'ISC-BDL2-WP12H'],
        'aliases': ['Blue Line', 'BlueLine', 'Blue Line Gen 2', 'TriTech', 'pet friendly', 'dual technology', 'WP6', 'WP12'],
        'protocol': 'Wired intruder detector: PIR + microwave, alarm relay and tamper circuit',
        'record_ids': ['bosch-0ba92138ab30'], 'image_key': 'bosch',
        'identification_notes': 'Representative Blue Line Gen2 family photograph from the Bosch/Radionix datasheet. The blue indicator window and white case are shared by different variants; read the complete ISC-BDL2 code, including G or H, on the device label.',
        'applicability_limits': 'The linked family installation guide is F.01U.140.810 revision 10 (December 2017), naming ISC-BDL2-WP6G, ISC-BDL2-WP12G and ISC-BDL2-WP12H. The picture cannot establish range, microwave variant or the pet-immunity setting. GE/HE, -CHI and PIR-only BPR variants are not identified by this card. No healthy voltage or system EOL setting is inferred.',
        'image_credit': 'Bosch/Radionix Blue Line Gen2 family photograph, datasheet V48 (23 July 2026), PDF page 1',
        'manual_revision': 'F.01U.140.810 | 10 | 2017.12',
    },
    {
        'id': 'bosch-device-blue-line-gen2-w12', 'brand': 'Bosch',
        'model': 'Blue Line Gen2 TriTech — W12G / W12H family',
        'part_numbers': ['ISC-BDL2-W12G', 'ISC-BDL2-W12H'],
        'aliases': ['Blue Line', 'BlueLine', 'Blue Line Gen 2', 'TriTech', 'dual technology', 'non-pet', 'W12'],
        'protocol': 'Wired intruder detector: PIR + microwave, alarm relay and tamper circuit',
        'record_ids': ['bosch-c221490fad45'], 'image_key': 'bosch',
        'identification_notes': 'Representative Blue Line Gen2 family photograph. This exterior is also used by pet-friendly WP variants; the image cannot distinguish W12 from WP12. Confirm the full model and suffix on the label.',
        'applicability_limits': 'The linked installation guide is F.01U.140.813 revision 10 (December 2017), naming ISC-BDL2-W12G and ISC-BDL2-W12H. It is a family guide, not proof that the installed detector is one of those codes. Do not apply the WP pet-setting instructions, or assume that later GE/HE variants have the same document scope.',
        'image_credit': 'Bosch/Radionix Blue Line Gen2 family photograph, datasheet V48 (23 July 2026), PDF page 1',
        'manual_revision': 'F.01U.140.813 | 10 | 2017.12',
    },
    {
        'id': 'risco-device-bware-rk515dtgl', 'brand': 'Risco',
        'model': 'BWare RK515DTGL — K-band dual-technology detector',
        'part_numbers': ['RK515DTGL'],
        'aliases': ['BWare', 'B Ware', 'K band', 'dual technology', 'Grade 2', 'DT'],
        'protocol': 'Wired intruder detector: PIR + K-band microwave, alarm relay and tamper circuit',
        'record_ids': ['risco-00a6655953a1'], 'image_key': 'bware',
        'identification_notes': 'Original RISCO photograph extracted from the RK515DTGL instruction sheet. The narrow dark indicator line and white lens/body are recognition aids; confirm RK515DTGL on the label. BWare is a family name, not an exact part code.',
        'applicability_limits': 'Linked document 5IN1749 (January 2012) is explicitly for BWare RK515DTGL K-Band DT Grade 2. Other BWare microwave, anti-mask, wireless or grade variants are not covered by this card. The document is a RISCO instruction sheet hosted by a distributor; no current-edition claim is made.',
        'image_credit': 'RISCO Group RK515DTGL instruction-sheet photograph, 5IN1749 (January 2012), PDF page 1; distributor-hosted original',
        'manual_revision': '5IN1749 | 01/2012',
    },
    {
        'id': 'risco-device-iwise-dt-g3', 'brand': 'Risco',
        'model': 'iWISE DT AM Grade 3 — RK815 / RK825 G3 family',
        'part_numbers': ['RK815DTG3', 'RK815DTG3A', 'RK825DTG3', 'RK825DTG3A'],
        'aliases': ['iWISE', 'i WISE', 'dual technology', 'anti mask', 'anti cloak', 'Green Line', 'Grade 3', '15m', '25m'],
        'protocol': 'Wired intruder detector: PIR + microwave, separate alarm, tamper and fault/AM indications',
        'record_ids': ['risco-e8aee4e7a650'], 'image_key': 'iwise',
        'identification_notes': 'Original RISCO family photograph from the installation sheet shows the three indicator windows and lower lens. The same picture represents several ranges and regional variants. Check the full RK815/RK825 code and any final A suffix on the label.',
        'applicability_limits': 'Family installation document 5IN2634 revision D (August 2022) explicitly names RK815DTG3, RK815DTG3A, RK825DTG3 and RK825DTG3A. The 815 and 825 range/lens requirements differ; an A suffix must not be dropped. The document notes Grade 2 when installed with a swivel. No picture or family name establishes the grade of the completed installation, panel EOL mode or exact installed variant.',
        'image_credit': 'RISCO Group iWISE family photograph, 5IN2634 D (August 2022), PDF page 1; CASMAR-hosted original',
        'manual_revision': '5IN2634 D | 08/2022',
    },
]
new_rows = []
for index, spec in enumerate(specs):
    key = spec['image_key']
    identifier, xref = source_images[key]
    content, dimensions = images[key]
    record = records[identifier]
    new_rows.append({
        **{k: v for k, v in spec.items() if k not in ['image_key', 'manual_revision']},
        'category': 'security', 'device_type': 'detector',
        'image': spec['id'] + '.webp',
        'source_image_url': record['url'], 'source_page_url': record['url'],
        'image_type': 'manufacturer-manual-photo',
        'image_sha256': sha(content), 'image_dimensions': dimensions,
        'source_pdf_page': 1, 'uk_priority': True, 'uk_priority_order': 750 + index,
    })

existing_devices = read(DATA / 'devices.json')
existing_packs = read(DATA / 'device-packs.json')
by_id = {row['id']: row for row in existing_devices}
assert len(by_id) == len(existing_devices)
for row in new_rows:
    for doc_id in row['record_ids']:
        assert records[doc_id]['brand'] == row['brand'] and records[doc_id]['category'] == row['category']
    if row['id'] in by_id:
        assert by_id[row['id']] == row, row['id'] + ': existing identity changed; review separately'
    by_id[row['id']] = row
ordered = list(by_id.values())
packs_by_id = {pack['id']: pack for pack in existing_packs}
for brand in ['Bosch', 'Risco']:
    members = [row for row in new_rows if row['brand'] == brand]
    ids = sorted({doc_id for row in members for doc_id in row['record_ids']})
    pack = {
        'id': brand.lower() + '-security-devices', 'brand': brand, 'category': 'security',
        'title': brand + ' device pack',
        'description': 'Original manufacturer device photographs and matched installation sheets for the listed wired detector families. Check the complete model and suffix on the device.',
        'scope': 'Selected wired intruder detectors only. Shared exterior photographs do not identify an exact model, sensing variant, installed grade or panel wiring configuration. Linked manuals are the named historical editions, not a claim of the latest release.',
        'device_ids': [row['id'] for row in members], 'record_ids': ids,
        'record_count': len(ids), 'direct_pdf_count': len(ids),
        'repository_url': catalogue['repository'], 'source_commit': catalogue['commit'],
        'supplementary_record_ids': [],
    }
    if pack['id'] in packs_by_id:
        assert packs_by_id[pack['id']] == pack, pack['id'] + ': existing pack differs; review separately'
    packs_by_id[pack['id']] = pack
assert all(by_id[row['id']] == row for row in existing_devices), 'Existing device data changed'
assert all(packs_by_id[row['id']] == row for row in existing_packs), 'Existing packs changed'

audit = {
    'batch': 'bosch-risco-devices-0.19.0', 'reviewed_date': '2026-11-02',
    'scope': 'Pictured identification and existing installation-document links only; no emulator behaviour, numeric fault comparator or commissioning procedure added.',
    'checked_sources': checked,
    'devices': [{
        'id': row['id'], 'part_numbers': row['part_numbers'], 'linked_records': row['record_ids'],
        'manual_revision': specs[index]['manual_revision'],
        'image_record_id': source_images[specs[index]['image_key']][0],
        'image_pdf_page': 1, 'image_pdf_xref': source_images[specs[index]['image_key']][1],
        'image_sha256': row['image_sha256'], 'image_dimensions': row['image_dimensions'],
    } for index, row in enumerate(new_rows)],
    'review_decisions': [
        'Bosch photograph is a representative Blue Line Gen2 family photo from the current Radionix/Bosch datasheet, not independent evidence of each suffix. Each card says so.',
        'The 2019 quick guide was retrieved and hash-checked but not linked to the G/H cards: it names GE/HE variants and does not list the earlier H suffix. Suffixes were not collapsed.',
        'The 2026 datasheet supplies the shared family photograph only; its later ordering list is not substituted for the applicable 2017 installation sheets.',
        'The iWISE original PDF explicitly includes A-suffixed models beyond the abbreviated archive model array. All four complete codes are retained and covered by the same family sheet.',
        'No catalogue records, manual URLs, document identities or download allowlists were modified. All existing devices and packs were preserved.',
    ],
    'totals': {'device_families': len(ordered), 'device_packs': len(packs_by_id), 'new_device_families': len(new_rows), 'new_packs': 2, 'new_linked_archive_documents': 4, 'new_supplementary_documents': 0},
}
if args.apply:
    RESEARCH.mkdir(parents=True, exist_ok=True)
    for row, spec in zip(new_rows, specs):
        (ROOT / 'public/app/devices' / row['image']).write_bytes(images[spec['image_key']][0])
    write(DATA / 'devices.json', ordered)
    write(DATA / 'device-packs.json', list(packs_by_id.values()))
    write(RESEARCH / 'source-audit.json', audit)
print(json.dumps({'check_only': not args.apply, **audit['totals'], 'sources_verified': len(checked)}))

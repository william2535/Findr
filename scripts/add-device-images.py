#!/usr/bin/env python3
"""Import reviewed device batches while preserving the panel library.

Each child directory of the supplied root contains devices.json, images/ and
audit.json. Research PDFs are never copied into the application. Use --check
to validate every entry and report the proposed result without writing files.
"""
import argparse
from collections import defaultdict
from datetime import date
import hashlib
from io import BytesIO
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

from PIL import Image


def read(path, default=None):
    return json.loads(path.read_text()) if path.exists() else default


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def source_url(value):
    parsed = urlsplit(value)
    return parsed.scheme in ('http', 'https') and bool(parsed.hostname) and not parsed.username and not parsed.password


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('batch_root', type=Path)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
project = Path(__file__).resolve().parents[1]
app = project / 'public/app'
data = app / 'data'
catalogue = read(data / 'catalogue.json')
records = {r['id']: r for r in catalogue['records']}
archive_ids = set(records)
supplementary = {r['id']: r for r in read(data / 'device-documents.json', [])}
batch_directories = [b for b in sorted(args.batch_root.resolve().iterdir()) if (b / 'devices.json').is_file()]
for batch in batch_directories:
    for document in read(batch / 'documents.json', []):
        identifier = document['id']
        digest = document.get('sha256', '')
        slug = re.sub(r'[^a-z0-9]+', '-', document['brand'].lower()).strip('-')
        assert re.fullmatch(r'[a-f0-9]{64}', digest), f'{identifier}: supplementary PDF must be hash-pinned'
        assert identifier == 'device-doc-' + slug + '-' + digest[:12], f'{identifier}: use a source-hash identity'
        assert identifier not in archive_ids, f'{identifier}: must not replace an archive record'
        assert document.get('origin') == 'device-reference' and document.get('status') == 'file-hash', f'{identifier}: disclose supplementary origin'
        assert source_url(document['source']), f'{identifier}: invalid document source'
        assert source_url(document.get('url')) or (document.get('url') is None and document.get('download_mode') == 'source-only'), f'{identifier}: invalid download mode'
        assert document.get('title') and document.get('models') and document.get('category'), f'{identifier}: incomplete document identity'
        assert isinstance(document.get('bytes'), int) and document['bytes'] > 100, f'{identifier}: missing PDF size'
        assert isinstance(document.get('pages'), int) and document['pages'] > 0, f'{identifier}: missing PDF pages'
        for old_id in document.get('related_archive_record_ids', []):
            assert old_id in archive_ids, f'{identifier}: unknown related archive record'
            assert records[old_id]['brand'] == document['brand'], f'{identifier}: related record brand differs'
        if identifier in supplementary:
            assert supplementary[identifier]['sha256'] == digest, f'{identifier}: existing PDF identity changed'
            assert not supplementary[identifier].get('retired_from_packs') or document.get('retired_from_packs'), f'{identifier}: source-only reference cannot be silently reactivated'
        supplementary[identifier] = document
records.update(supplementary)
current = read(data / 'devices.json', [])
devices = {d['id']: d for d in current}
assert len(devices) == len(current), 'Existing device IDs are not unique'
panel_ids = {p['id'] for p in read(data / 'panels.json')}
types = {'detector', 'call-point', 'sounder', 'interface', 'base', 'accessory'}
seen, incoming_assets, audits, added, updated = set(), {}, {}, [], []

for batch in batch_directories:
    manifest = batch / 'devices.json'
    if not manifest.is_file():
        continue
    audit = read(batch / 'audit.json')
    assert audit is not None, f'{batch.name}: source audit is required'
    audits[batch.name] = audit
    for row in read(manifest):
        identifier = row['id']
        assert re.fullmatch(r'[a-z0-9][a-z0-9-]+', identifier), f'Invalid ID: {identifier}'
        assert identifier not in seen, f'Duplicate incoming ID: {identifier}'
        assert identifier not in panel_ids, f'Device ID overlaps the panel catalogue: {identifier}'
        seen.add(identifier)
        for key in ('brand', 'model', 'category', 'protocol', 'identification_notes',
                    'applicability_limits', 'source_image_url', 'source_page_url', 'image_credit', 'image_type'):
            assert isinstance(row.get(key), str) and row[key].strip(), f'{identifier}: missing {key}'
        assert row['device_type'] in types, f'{identifier}: unknown device type'
        for key in ('source_image_url', 'source_page_url', 'documentation_url'):
            assert not row.get(key) or source_url(row[key]), f'{identifier}: invalid {key}'
        for key in ('aliases', 'part_numbers', 'record_ids'):
            assert isinstance(row.get(key), list) and all(isinstance(v, str) and v for v in row[key]), f'{identifier}: invalid {key}'
        assert row['part_numbers'], f'{identifier}: exact model codes are required'
        assert len(set(row['record_ids'])) == len(row['record_ids']), f'{identifier}: duplicate document IDs'
        for record_id in row['record_ids']:
            assert record_id in records, f'{identifier}: unknown document {record_id}'
            record = records[record_id]
            assert not record.get('retired_from_packs'), f'{identifier}: reference was superseded for pack downloads: {record_id}'
            assert record['brand'] == row['brand'] and record['category'] == row['category'], f'{identifier}: review cross-brand/system document {record_id}'
        filename = identifier + '.webp'
        assert row['image'] == filename, f'{identifier}: image must use the device ID'
        image_root = (batch / 'images').resolve()
        image_path = (image_root / filename).resolve()
        assert image_path.parent == image_root and image_path.is_file(), f'{identifier}: invalid image path'
        content = image_path.read_bytes()
        with Image.open(BytesIO(content)) as image:
            image.load()
            assert image.format == 'WEBP', f'{identifier}: image must be WebP'
            assert list(image.size) == row['image_dimensions'], f'{identifier}: image dimensions differ'
            assert min(image.size) >= 120 and max(image.size) <= 1600, f'{identifier}: review image size'
        assert hashlib.sha256(content).hexdigest() == row['image_sha256'], f'{identifier}: image hash differs'
        previous = devices.get(identifier)
        if previous:
            assert all(previous[k] == row[k] for k in ('brand', 'category', 'device_type')), f'{identifier}: identity change requires separate review'
            assert set(previous['record_ids']) <= set(row['record_ids']), f'{identifier}: existing document association removed'
        devices[identifier] = row
        incoming_assets[filename] = content
        (updated if previous else added).append(identifier)

assert seen, 'No reviewed device batches found'
old_packs = {(p['brand'], p['category']): p for p in read(data / 'device-packs.json', [])}
grouped = defaultdict(list)
for device in devices.values():
    grouped[device['brand'], device['category']].append(device)
packs = []
for (brand, category), members in sorted(grouped.items()):
    previous = old_packs.get((brand, category), {})
    ids = sorted({i for i in previous.get('record_ids', []) if not records.get(i, {}).get('retired_from_packs')} | {i for d in members for i in d['record_ids']})
    assert set(ids) <= records.keys(), f'{brand}: pack has unknown archive IDs'
    packs.append({
        **previous,
        'id': previous.get('id') or re.sub(r'[^a-z0-9]+', '-', brand.lower()).strip('-') + '-' + category + '-devices',
        'brand': brand, 'category': category, 'title': brand + ' device pack',
        'description': previous.get('description') or 'Sourced device pictures, exact model codes and matched manufacturer documents for identification on site.',
        'scope': previous.get('scope') or 'Selected device families with archive documents and separately verified device references. Confirm the label, protocol and document edition. Shared appearance does not establish compatibility.',
        'device_ids': [d['id'] for d in sorted(members, key=lambda d: (d.get('uk_priority_order', 1000), d['model'].casefold()))],
        'record_ids': ids, 'record_count': len(ids),
        'direct_pdf_count': sum(bool(records[i].get('url')) for i in ids),
        'repository_url': catalogue['repository'], 'source_commit': catalogue['commit'],
        'supplementary_record_ids': [i for i in ids if i in supplementary],
    })
ordered = sorted(devices.values(), key=lambda d: (not d.get('uk_priority', False), d.get('uk_priority_order', 1000), d['brand'].casefold(), d['model'].casefold()))
summary = {
    'date': date.today().isoformat(), 'catalogue_commit': catalogue['commit'],
    'previous_device_families': len(current), 'device_families': len(ordered),
    'device_packs': len(packs), 'brands': sorted({d['brand'] for d in ordered}),
    'added_device_ids': added, 'updated_device_ids': updated,
    'distinct_linked_records': len({i for d in ordered for i in d['record_ids']}),
    'supplementary_documents': len(supplementary),
    'picture_bytes_added_or_updated': sum(map(len, incoming_assets.values())),
    'source_batches': sorted(audits), 'check_only': args.check,
}
if not args.check:
    (app / 'devices').mkdir(exist_ok=True)
    for filename, content in incoming_assets.items():
        (app / 'devices' / filename).write_bytes(content)
    write(data / 'devices.json', ordered)
    write(data / 'device-packs.json', packs)
    write(data / 'device-documents.json', sorted(supplementary.values(), key=lambda r: (r['brand'], r['title'])))
    # Extend both exact-ID allowlists; original archive URLs remain unchanged.
    for path in (project / 'lib/download-map.json', data / 'download-map.json'):
        download_map = read(path)
        assert isinstance(download_map, dict), f'Missing existing download allowlist: {path}'
        for identifier, document in supplementary.items():
            assert identifier not in archive_ids
            if document.get('url'):
                download_map[identifier] = document['url']
            else:
                download_map.pop(identifier, None)
        path.write_text(json.dumps(download_map, ensure_ascii=False, separators=(',', ':')) + '\n')
    for name, audit in audits.items():
        write(project / 'research/device-audit' / (name + '.json'), audit)
    write(project / 'research/device-audit/latest-additions.json', summary)
print(json.dumps(summary))

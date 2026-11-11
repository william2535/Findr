import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const file = name => new URL('../public/app/' + name, import.meta.url);
const json = name => JSON.parse(readFileSync(file('data/' + name + '.json'), 'utf8'));
const devices = json('devices'), packs = json('device-packs'), catalogue = json('catalogue'), documents = json('device-documents');
const records = new Map([...catalogue.records, ...documents].map(record => [record.id, record]));
const devicesById = new Map(devices.map(device => [device.id, device]));
const types = new Set(['detector', 'call-point', 'sounder', 'interface', 'base', 'accessory']);

test('device identities are distinct from panel identities and retain exact codes and sources', () => {
  const panels = new Set(json('panels').map(panel => panel.id));
  assert.ok(devices.length > 0);
  assert.equal(devicesById.size, devices.length);
  for (const device of devices) {
    assert.ok(!panels.has(device.id), device.id);
    assert.ok(types.has(device.device_type), device.id);
    assert.ok(device.part_numbers.length > 0, device.id);
    for (const code of device.part_numbers) assert.ok(typeof code === 'string' && code.trim(), device.id);
    for (const key of ['brand', 'model', 'protocol', 'image_credit', 'image_type', 'identification_notes', 'applicability_limits']) {
      assert.ok(typeof device[key] === 'string' && device[key].trim(), `${device.id}: ${key}`);
    }
    for (const key of ['source_page_url', 'source_image_url', 'documentation_url']) {
      if (key === 'documentation_url' && !device[key]) continue;
      const url = new URL(device[key]);
      assert.ok(['http:', 'https:'].includes(url.protocol), `${device.id}: ${key}`);
      assert.equal(url.username + url.password, '');
    }
  }
});

test('each device links only real documents of the identified brand and system', () => {
  const webDownloads = JSON.parse(readFileSync(new URL('../lib/download-map.json', import.meta.url)));
  const nativeDownloads = json('download-map');
  for (const device of devices) {
    assert.equal(new Set(device.record_ids).size, device.record_ids.length, device.id);
    for (const id of device.record_ids) {
      const record = records.get(id);
      assert.ok(record, `${device.id}: ${id}`);
      assert.equal(record.brand, device.brand, `${device.id}: ${id}`);
      assert.equal(record.category, device.category, `${device.id}: ${id}`);
      if (record.url) {
        assert.equal(webDownloads[id], record.url, `${device.id}: web download mapping`);
        assert.equal(nativeDownloads[id], record.url, `${device.id}: Android download mapping`);
      }
    }
  }
});

test('supplementary documents are hash-pinned and never impersonate existing archive records', () => {
  const archive = new Map(catalogue.records.map(record => [record.id, record]));
  assert.equal(records.size, archive.size + documents.length);
  for (const record of documents) {
    assert.ok(!archive.has(record.id));
    assert.equal(record.origin, 'device-reference');
    assert.equal(record.status, 'file-hash');
    assert.match(record.sha256, /^[a-f0-9]{64}$/);
    assert.ok(record.id.endsWith(record.sha256.slice(0, 12)));
    assert.ok(record.bytes > 100 && record.pages > 0);
    assert.ok(record.models.length);
    if (record.url) assert.ok(new URL(record.url).hostname);
    else {
      assert.equal(record.download_mode, 'source-only');
      assert.ok(new URL(record.source).hostname);
      assert.ok(record.delivery_note);
    }
    for (const id of record.related_archive_record_ids || []) {
      assert.equal(archive.get(id)?.brand, record.brand);
    }
  }
});

test('all displayed device images are local and match their reviewed hashes', () => {
  const imageFiles = readdirSync(file('devices/')).sort();
  assert.deepEqual(imageFiles, [...new Set(devices.map(device => device.image))].sort());
  for (const device of devices) {
    assert.equal(device.image, device.id + '.webp');
    const bytes = readFileSync(file('devices/' + device.image));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', device.id);
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', device.id);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), device.image_sha256, device.id);
    assert.equal(device.image_dimensions.length, 2);
    assert.ok(device.image_dimensions.every(size => Number.isInteger(size) && size >= 120));
  }
});

test('device packs contain each device once and preserve exact deduplicated document counts', () => {
  assert.equal(new Set(packs.map(pack => pack.id)).size, packs.length);
  const membership = new Map();
  for (const pack of packs) {
    assert.ok(pack.device_ids.length);
    assert.equal(new Set(pack.device_ids).size, pack.device_ids.length, pack.id);
    assert.equal(new Set(pack.record_ids).size, pack.record_ids.length, pack.id);
    const expectedRecords = new Set();
    for (const id of pack.device_ids) {
      const device = devicesById.get(id);
      assert.ok(device, `${pack.id}: ${id}`);
      assert.equal(device.brand, pack.brand);
      assert.equal(device.category, pack.category);
      membership.set(id, (membership.get(id) || 0) + 1);
      for (const recordId of device.record_ids) expectedRecords.add(recordId);
    }
    for (const id of expectedRecords) assert.ok(pack.record_ids.includes(id), `${pack.id}: missing document ${id}`);
    for (const id of pack.record_ids) {
      assert.ok(records.has(id), `${pack.id}: unknown document ${id}`);
      assert.ok(!records.get(id).retired_from_packs, `${pack.id}: superseded source included ${id}`);
    }
    assert.equal(pack.record_count, pack.record_ids.length, pack.id);
    assert.equal(pack.direct_pdf_count, pack.record_ids.filter(id => records.get(id).url).length, pack.id);
    assert.equal(pack.source_commit, catalogue.commit);
  }
  assert.deepEqual([...membership.keys()].sort(), devices.map(device => device.id).sort());
  assert.ok([...membership.values()].every(count => count === 1));
});

test('offline assets include device browsing, both indexes and every reviewed picture', () => {
  const context = {self: {}};
  vm.runInNewContext(readFileSync(file('precache.js'), 'utf8'), context);
  const cache = new Set(context.self.__PRECACHE);
  for (const asset of ['devices.mjs', 'devices.css', 'data/devices.json', 'data/device-packs.json', 'data/device-documents.json', ...devices.map(device => 'devices/' + device.image)]) {
    assert.ok(cache.has('./' + asset), `Missing offline asset: ${asset}`);
  }
  assert.ok(!cache.has('./data/download-map.json'));
});

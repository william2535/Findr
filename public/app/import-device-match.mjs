// Imported configuration is evidence of a programmed identity, never proof of
// the installed device. Exact identity requires a complete catalogue part code.
const text = value => typeof value === 'string' ? value.trim() : '';
const code = value => text(value).toUpperCase();
const words = value => text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const brandKey = value => words(value).replace(/ /g, '');
const phraseIn = (value, phrase) => phrase && (` ${value} `).includes(` ${phrase} `);
const empty = (status, reason, candidates = []) => ({status, candidates, device: null, documents: [], reason});
const list = value => Array.isArray(value) ? value : [];

function documentPriority(record) {
  const label = words(`${record.type || ''} ${record.title || ''}`);
  if (/\b(installation|install|wiring|fault|faults|troubleshooting)\b/.test(label)) return 0;
  if (/\b(instructions|instruction|maintenance|technical|commissioning)\b/.test(label)) return 1;
  if (/\b(data|datasheet|specification|specifications)\b/.test(label)) return 2;
  return 3;
}

function exactDocuments(device, importedCode, records, saved) {
  return [...new Set(list(device.record_ids))].map(id => records.get(id)).filter(Boolean).map(record => {
    const documentModels = list(record.models).filter(model => text(model));
    const family = list(device.part_numbers).length > 1 || documentModels.length > 1 || /\b(family|range|series)\b/i.test(`${device.model || ''} ${record.title || ''}`);
    const status = saved.has(record.id) ? 'saved' : /^https?:\/\//i.test(text(record.url)) ? 'downloadable' : 'unavailable';
    const revision = text(record.revision);
    const scope = `${text(record.title) ? `Recorded document title: ${text(record.title)}. ` : ''}${documentModels.length ? `Recorded model scope: ${documentModels.join('; ')}. ` : ''}`;
    const reason = `Linked by the catalogue entry containing complete part number ${importedCode}. ${scope}${family ? 'Family/range reference; check that the labelled variant is covered. ' : ''}${revision ? `Recorded edition: ${revision}. ` : 'No document revision is recorded in the catalogue. '}Check the installed label and document edition before use.`;
    return {record, reason, family, status};
  }).sort((a, b) => documentPriority(a.record) - documentPriority(b.record)
    || (a.status === 'saved' ? 0 : 1) - (b.status === 'saved' ? 0 : 1)
    || text(a.record.title).localeCompare(text(b.record.title)));
}

function familyCandidates(row, devices) {
  const model = words(row.model), type = words(row.type);
  // A manufacturer or protocol by itself is deliberately not a family query.
  if (!model && !type) return [];
  const importedBrand = brandKey(row.manufacturer);
  return devices.filter(device => {
    if (importedBrand && brandKey(device.brand) !== importedBrand) return false;
    const labels = [device.model, ...list(device.aliases)].map(words).filter(Boolean);
    const phraseMatch = model && labels.some(label => label === model || phraseIn(label, model) || phraseIn(model, label));
    const typeMatch = type && (words(device.device_type) === type
      || phraseIn(type, words(device.device_type))
      || labels.some(label => label === type || phraseIn(label, type) || phraseIn(type, label)));
    return phraseMatch || typeMatch;
  });
}

/**
 * Match only complete part-number evidence to verified catalogue associations.
 * This does not infer revision compatibility or an installed device from a
 * configuration file; family/type guesses never receive verified documents.
 */
export function identifyImportedDevice(row = {}, devices = [], records = new Map(), saved = new Map()) {
  row = row && typeof row === 'object' ? row : {};
  const catalogue = list(devices).filter(device => device?.category === 'fire');
  const recordMap = records instanceof Map ? records : new Map();
  const savedMap = saved instanceof Map ? saved : new Map();
  const explicitPart = text(row.partNumber);
  const modelCode = text(row.model);
  const importedCode = explicitPart || modelCode;
  const matches = importedCode ? catalogue.filter(device => list(device.part_numbers).some(part => code(part) === code(importedCode))) : [];
  if (matches.length > 1) {
    return empty('ambiguous', `Complete part number ${importedCode} occurs in more than one catalogue entry. Check the device label and select the matching catalogue reference; no manual is verified automatically.`, matches);
  }
  if (matches.length === 1) {
    const device = matches[0], manufacturer = text(row.manufacturer);
    if (manufacturer && brandKey(manufacturer) !== brandKey(device.brand)) {
      return empty('ambiguous', `Part number ${importedCode} matches ${device.brand}, but the import names ${manufacturer}. Resolve this conflicting manufacturer evidence on the device label before choosing a manual.`, matches);
    }
    const documents = exactDocuments(device, importedCode, recordMap, savedMap);
    return {
      status: 'exact', candidates: matches, device, documents,
      reason: `${explicitPart ? 'Imported part number' : 'Imported model field contains complete part number'} ${importedCode} exactly matches the catalogue. This identifies the programmed code, not the currently installed device.${documents.length ? '' : ' No verified linked manual is available in this catalogue.'}`,
    };
  }
  const candidates = familyCandidates(row, catalogue);
  const genericDescription = /\b(optical|smoke|heat|sensor|detector|sounder|beacon|strobe|call point|interface|isolator|relay|module|base)\b/.test(words(`${row.model || ''} ${row.type || ''}`));
  if (candidates.length || (!explicitPart && genericDescription)) {
    return empty('family', `${explicitPart ? `Imported part number ${explicitPart} has no exact catalogue match. ` : ''}Only family or type information is established${text(row.model) ? ` (${text(row.model)})` : text(row.type) ? ` (${text(row.type)})` : ''}. Check the complete part number, suffix, protocol and revision on the device label; no manual is verified for this wording.`, candidates);
  }
  return empty('unmatched', `${explicitPart ? `Imported part number ${explicitPart} has no exact catalogue match. ` : ''}The original panel wording is retained. A manufacturer, appearance or protocol alone cannot establish the model. Search the catalogue and check the complete device label; no verified manual is assigned.`);
}

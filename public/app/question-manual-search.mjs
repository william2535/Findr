// Catalogue discovery is local and deterministic. A likely document is not yet
// proof that it contains the requested procedure; read its pages before answering.
export const QUICK_MANUAL_SEARCH_VERSION = '2026-11-10.2';
const array = value => Array.isArray(value) ? value : [];
const str = value => String(value ?? '');
const normal = value => str(value).normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[‐‑–—]/g, '-').replace(/\s+/g, ' ').trim();
const compact = value => normal(value).replace(/[^a-z0-9]/g, '');
const unique = values => [...new Set(values.filter(Boolean))];
const escaped = value => str(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const records = value => value instanceof Map ? [...value.values()] : Array.isArray(value) ? value : array(value?.records);
const known = value => !!normal(value) && !/^(?:unknown|unconfirmed|not known|not established|model unknown)$/.test(normal(value));
const modelList = record => unique([...(Array.isArray(record?.models) ? record.models : record?.models ? [record.models] : []), record?.model]);
const typeOf = value => /\b(?:external |separate )?(?:psu|power supply)\b/i.test(value) ? 'PSU' : /\b(?:recorder|nvr|dvr)\b/i.test(value) ? 'recorder' : /\bcamera\b/i.test(value) ? 'camera' : /\bkeypad\b/i.test(value) ? 'keypad' : /\bdetector\b/i.test(value) ? 'detector' : /\b(?:controller|net2)\b/i.test(value) ? 'controller' : /\b(?:panel|mxpro|mx pro)\b/i.test(value) ? 'panel' : null;

function operationFor(value) {
  const q = normal(value);
  const table = [
    ['walk-test', 'walk-test procedure', /\b(?:walk[ -]?(?:test|tset)|test(?:ing)? (?:a |the )?zones?)\b/, 'walk test test zones'],
    ['event-history', 'event-history procedure', /\b(?:event(?:s| history)?|history|historic|log(?:s)?)\b/, 'view event history log menu'],
    ['compatibility', 'compatibility requirements', /\b(?:compatib\w*|onvif)\b|will .+ work with/, 'compatibility supported models firmware'],
    ['terminals', 'terminal and wiring information', /\b(?:terminals?|wir(?:e|es|ing)|connections?|pin[ -]?out)\b/, 'terminal wiring connection'],
    ['supply', 'power-supply specifications', /\b(?:volts?|voltage|amps?|current|rating|power supply|psu)\b/, 'power supply voltage current rating'],
    ['fault-message', 'fault-message reference', /\b(?:fault|error|trouble|warning)\b/, 'fault message indication cause'],
    ['configuration', 'configuration procedure', /\b(?:disable|enable|add|program|programme|configure|configuration|setup|set up)\b/, 'configuration programming menu'],
    ['navigation', 'menu instructions', /\b(?:menu|press|button|navigate)\b/, 'menu select press'],
  ];
  for (const [id, label, pattern, query] of table) if (pattern.test(q)) return {id, label, query};
  return {id: 'general', label: 'answer to your question', query: str(value).trim()};
}

const modelPatterns = new Map();
function modelInText(model, value) {
  const key = str(model);
  let prepared = modelPatterns.get(key);
  if (!prepared) {
    const chunks = normal(model).match(/[a-z0-9]+/g) || [];
    const token = compact(model);
    prepared = {token, chunks, pattern: null};
    modelPatterns.set(key, prepared);
  }
  if (prepared.token.length < 3 || !compact(value).includes(prepared.token)) return false;
  prepared.pattern ||= new RegExp(`(?:^|[^a-z0-9])${prepared.chunks.map(escaped).join('[\\s_-]*')}(?=$|[^a-z0-9])(?![-_/][a-z0-9])`, 'i');
  // Separators are flexible, but model boundaries are not: 37 != 370 or 37A.
  return prepared.pattern.test(normal(value));
}

function mxVariants(value) {
  const models = [];
  for (const match of str(value).matchAll(/\bm\s*x\s*p(?:ro|or)\s*([45])\b/gi)) models.push(`MxPro${match[1]}`);
  // Model coverage verified in Advanced user guides 680-015 rev10 and
  // 680-166 rev04. Preserve the actual model labels in scope; this association
  // establishes a product family, never that every variant shares a procedure.
  for (const match of str(value).matchAll(/\bmx\s*-?\s*([45])(?:100|200|400|800)(?:V|N)?(?:\/[A-Z]+)?\b/gi)) models.push(`MxPro${match[1]}`);
  return unique(models);
}

function inheritedEquipment(equipment) {
  if (!equipment || !known(equipment.model)) return null;
  const variants = mxVariants(equipment.model);
  const family = equipment.family || (/\bmx\s*pro\b/i.test(equipment.model) || variants.length ? 'MxPro' : null);
  const exact = equipment.exact ?? (!equipment.familyOnly && !(family === 'MxPro' && !variants.length));
  return {...equipment, manufacturer: equipment.manufacturer || equipment.brand || null, family, exact, equipmentType: equipment.equipmentType || typeOf(equipment.model), systemTypes: array(equipment.systemTypes)};
}

/** Parse only equipment actually named by the engineer or supplied as context. */
export function parseQuickQuestionIntent(question, {catalogue = [], savedManuals = [], equipment = null, previousQuestion = ''} = {}) {
  const raw = str(question).trim(), oldQuestion = typeof previousQuestion === 'string' ? previousQuestion : previousQuestion?.question || previousQuestion?.raw || '';
  const all = [...records(savedManuals), ...records(catalogue)], mx = /\bm\s*x\s*p(?:ro|or)\s*([45])?\b/i.exec(raw);
  const componentShift = /\b(?:external|separate|other)\s+(?:psu|power supply|camera|recorder|detector|keypad|controller|lock)\b/i.test(raw);
  const context = inheritedEquipment(equipment);
  let found = null, contextUsed = false, requestedModels = [];
  if (mx) {
    const model = mx[1] ? `MxPro${mx[1]}` : 'MxPro';
    found = {manufacturer: 'Advanced', model, equipmentType: 'panel', systemTypes: ['fire'], family: 'MxPro', exact: !!mx[1]};
    requestedModels = mx[1] ? [model] : ['MxPro4', 'MxPro5'];
  } else {
    const matches = [];
    for (const record of all) for (const model of modelList(record)) {
      if (!modelInText(model, raw)) continue;
      // A generic noun such as "camera" is not a product identity.
      if (/^(?:panel|camera|recorder|detector|keypad|controller|reader|lock|psu|optical(?: detector)?)$/i.test(model)) continue;
      matches.push({record, model, score: compact(model).length + (modelInText(record.brand, raw) ? 30 : 0)});
    }
    matches.sort((a, b) => b.score - a.score || str(a.record.id).localeCompare(str(b.record.id)));
    const hit = matches[0];
    if (hit) {
      const familyOnly = /^(?:CFP|XFP|Sigma|Twinflex|Vigilon|VESDA|Net2|Premier Elite|Galaxy (?:Dimension|Flex))$/i.test(hit.model);
      found = {manufacturer: hit.record.brand || hit.record.manufacturer || null, model: hit.model, equipmentType: typeOf(raw) || hit.record.equipmentType || typeOf(hit.record.title), systemTypes: hit.record.category ? [hit.record.category] : [], family: familyOnly ? hit.model : null, exact: !familyOnly};
      requestedModels = [hit.model];
    }
  }
  const explicitChange = /\b(?:change|switch|different|another|instead)\b.*\b(?:equipment|panel|model|camera|recorder|psu)\b/i.test(raw);
  if (!found && context && !componentShift && !explicitChange) { found = context; contextUsed = true; requestedModels = found.family === 'MxPro' && !found.exact ? ['MxPro4', 'MxPro5'] : [found.model]; }
  let operation = operationFor(raw);
  if (contextUsed && oldQuestion && (operation.id === 'general' || /^(?:where|what (?:do i|should i) press|explain|show me|which (?:button|menu))/i.test(raw))) operation = operationFor(oldQuestion);
  const targetType = componentShift ? typeOf(raw.match(/\b(?:external|separate|other)\b[\s\S]*/i)?.[0] || raw) : typeOf(raw);
  const result = found || {manufacturer: null, model: null, equipmentType: targetType, systemTypes: [], family: null, exact: false};
  return {question: raw, equipment: result, operation, modelTerms: unique([result.model, ...requestedModels]), requestedModels, family: result.family || null, sufficient: known(result.model), contextUsed, componentShift};
}

function coverage(record) {
  const models = modelList(record);
  return models.length ? models.join(' / ') : 'Model coverage not listed';
}

function identityMatch(models, intent) {
  const want = intent?.equipment || {}, desired = str(want.model), family = intent?.family || want.family;
  if (!known(desired)) return {matches: false, exact: false};
  if (family === 'MxPro' || /^mx\s*pro\s*[45]?$/i.test(desired)) {
    const variants = unique(models.flatMap(mxVariants)), asked = mxVariants(desired);
    if (asked.length) return {matches: variants.some(v => asked.includes(v)), exact: variants.some(v => asked.includes(v)), variants};
    return {matches: variants.length > 0 || models.some(m => /^mx\s*pro$/i.test(m)), exact: false, variants};
  }
  const matches = models.some(model => compact(model) === compact(desired) || modelInText(desired, model));
  return {matches, exact: matches && want.exact !== false};
}

/** Rank only declared catalogue coverage. Page reading verifies applicability later. */
export function discoverQuickManualCandidates(intent, {catalogue = [], savedManuals = [], stage = 'archive', excludedManualIds = [], online = true, procedures = []} = {}) {
  if (!intent?.sufficient || stage === 'archive' && online === false) return [];
  const saved = records(savedManuals), savedIds = new Set(saved.map(r => r.id || r.manualId)), excluded = new Set(excludedManualIds);
  const source = stage === 'saved' ? saved : records(catalogue), seen = new Set(), output = [];
  for (const raw of source) {
    const record = raw?.record ? {...raw.record, ...raw} : raw;
    if (!record) continue;
    const id = record.id || record.manualId;
    if (!id || seen.has(id) || excluded.has(id)) continue;
    seen.add(id);
    const manufacturer = record.brand || record.manufacturer;
    if (manufacturer && intent.equipment.manufacturer && compact(manufacturer) !== compact(intent.equipment.manufacturer) && !compact(manufacturer).startsWith(compact(intent.equipment.manufacturer))) continue;
    const declared = modelList(record);
    // A title can supply a catalogue candidate, never a verified body identity.
    const match = identityMatch(declared.length ? declared : [record.title], intent);
    if (!match.matches) continue;
    const kind = normal(record.type || record.documentType), title = normal(record.title), op = intent.operation?.id || 'general';
    const operational = ['walk-test', 'event-history', 'configuration', 'navigation'].includes(op);
    const accessory = /\b(?:zonal led|device compatibility|networking|network card|interface card|single loop card|protocol converter|modbus|bacnet)\b/.test(title+' '+declared.join(' ').toLowerCase());
    if (operational && accessory) continue;
    let score = match.exact ? 100 : 80;
    const reviewed = array(Array.isArray(procedures) ? procedures : procedures?.procedures).find(recipe => recipe?.manual?.recordId === id && recipe.operation === op && identityMatch(array(recipe.scope?.models).length ? recipe.scope.models : array(recipe.manual?.models), intent).matches);
    // A known section for this task beats generic document-type guesses. The
    // actual PDF hash/page quotes and variant are still checked after download.
    if (reviewed) score += 80;
    if (stage === 'saved' || savedIds.has(id)) score += 8;
    if (operational) score += /user|operat|program/.test(kind) ? 45 : /installation|commission/.test(kind) ? 15 : /data.?sheet/.test(kind) ? -30 : 0;
    else if (['terminals', 'supply'].includes(op)) score += /installation|technical|data.?sheet|wiring/.test(kind) ? 35 : /user/.test(kind) ? 5 : 0;
    else if (op === 'compatibility') score += /compatib/.test(title+' '+kind) ? 45 : /installation|technical|data.?sheet/.test(kind) ? 15 : 0;
    else score += /installation|user|program|technical/.test(kind) ? 15 : 0;
    const queryTerms = (intent.operation?.query || '').split(/\s+/).filter(term => term.length > 3);
    score += queryTerms.reduce((n, term) => n + (title.includes(term) ? 6 : 0), 0);
    if (record.status === 'complete-file') score += 3;
    const documentLabel = /user|operat/.test(kind) ? 'user guide' : /program/.test(kind) ? 'programming guide' : /install/.test(kind) ? 'installation manual' : /data.?sheet/.test(kind) ? 'datasheet' : 'manual';
    output.push({...record, id, saved: stage === 'saved' || savedIds.has(id), score, coverageLabel: coverage(record), relevance: reviewed ? `This manual has a reviewed ${intent.operation?.label || 'reference'} section. I’ll check its edition and model coverage.` : `This ${documentLabel} is a likely source for the ${intent.operation?.label || 'answer to your question'}.`});
  }
  return output.sort((a, b) => b.score - a.score || str(a.title).localeCompare(str(b.title)) || str(a.id).localeCompare(str(b.id)));
}

/** Check a processed document against the equipment asked about, not its filename. */
export function manualMatchesQuickIntent(analysis, intent) {
  const readable = array(analysis?.pages).filter(p => p.quality?.readable !== false && str(p.text).trim());
  if (!analysis?.usable || !readable.length) return {matches: false, exact: false, needsVariant: false, reason: 'This manual has no usable extracted pages.', scope: null};
  const identity = analysis.identity || {}, models = modelList(identity), match = identityMatch(models, intent);
  const scope = {manufacturer: identity.manufacturer || null, models, equipmentType: identity.equipmentType || null, revision: identity.revision || null, family: intent?.family || null};
  if (!intent?.sufficient) return {matches: false, exact: false, needsVariant: false, reason: 'The equipment model is not established by the question.', scope};
  const requestedMaker = compact(intent.equipment?.manufacturer), documentMaker = compact(identity.manufacturer);
  const documentMakers = unique([identity.manufacturer, ...array(identity.manufacturerCandidates)]).map(compact);
  // Gent documents explicitly identify both Gent and Honeywell. Do not treat
  // arbitrary mentioned manufacturers as interchangeable (e.g. compatibility
  // lists); require this known co-brand pair to have been read from the PDF.
  const explicitGentOwnership = readable.some(page => /\bGent\s+by\s+Honeywell\b/i.test(page.text));
  const coBrandedMaker = ['gent', 'honeywell'].includes(requestedMaker) && ['gent', 'honeywell'].includes(documentMaker) && (documentMakers.includes(requestedMaker) || models.some(model => /\bVigilon\b/i.test(model)) && explicitGentOwnership);
  if (requestedMaker && documentMaker && requestedMaker !== documentMaker && !documentMaker.startsWith(requestedMaker) && !coBrandedMaker) return {matches: false, exact: false, needsVariant: false, reason: 'The document identifies a different manufacturer.', scope};
  if (!match.matches) return {matches: false, exact: false, needsVariant: false, reason: 'The readable document does not establish the requested model coverage.', scope};
  // Missing manufacturer is not silently filled from a filename or catalogue.
  if (requestedMaker && !documentMaker) return {matches: false, exact: false, needsVariant: false, reason: 'The readable document does not establish the manufacturer.', scope};
  const needsVariant = intent.equipment?.exact === false || (!match.exact && identity.requiresVariant === true);
  return {matches: true, exact: match.exact, needsVariant, reason: needsVariant ? 'The manual covers a candidate in the requested family. Check whether the procedure depends on the installed variant.' : 'The readable document identifies the requested model; the requested procedure still needs supporting pages.', scope};
}

import {openDB} from './db.mjs';

export const PANEL_IMPORTS_KEY = 'panel-imports-v1';
const fields = ['panel', 'node', 'loop', 'address', 'subAddress', 'zone', 'location', 'type', 'manufacturer', 'model', 'partNumber', 'exportDate'];
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const scope = schedule => `${schedule.site.trim().toLowerCase()}\u0000${schedule.panel.trim().toLowerCase()}`;
const nonblank = value => typeof value === 'string' && value.trim().length > 0;

function validateSchedule(schedule) {
  if (!isObject(schedule)) throw new Error('The panel import is not a valid schedule.');
  for (const field of ['id', 'site', 'panel', 'filename', 'fileHash', 'format']) {
    if (!nonblank(schedule[field])) throw new Error(`The panel import needs a valid ${field}.`);
  }
  if (!Number.isFinite(schedule.importedAt) || schedule.importedAt <= 0) throw new Error('The import time is invalid.');
  if (typeof schedule.exportDate !== 'string') throw new Error('The panel export date must be text, or blank if unknown.');
  if (schedule.panelCatalogueId != null && typeof schedule.panelCatalogueId !== 'string') throw new Error('The selected panel reference is invalid.');
  if (!isObject(schedule.mapping) || Object.values(schedule.mapping).some(index => !Number.isInteger(index) || index < -1)) {
    throw new Error('The saved column mapping is invalid.');
  }
  if (!Array.isArray(schedule.rows) || !schedule.rows.length || schedule.rows.length > 10000) throw new Error('The import must contain between 1 and 10,000 device rows.');
  const rowIds = new Set();
  for (const row of schedule.rows) {
    if (!isObject(row) || !nonblank(row.id) || rowIds.has(row.id)) throw new Error('Every imported row needs a unique source row ID.');
    rowIds.add(row.id);
    if (!nonblank(row.loop) || !nonblank(row.address)) throw new Error('Every imported device needs a loop and address.');
    if (fields.some(field => Object.hasOwn(row, field) && typeof row[field] !== 'string')) throw new Error('Imported device values must remain text.');
    if (!Array.isArray(row.rawValues) || row.rawValues.some(value => typeof value !== 'string')) throw new Error('Original imported row values are missing or invalid.');
  }
}

function validatedExisting(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('The saved panel imports cannot be read. Existing data has not been changed.');
  const ids = new Set(), scopes = new Set();
  for (const schedule of value) {
    try { validateSchedule(schedule); }
    catch { throw new Error('A saved panel import is malformed. Existing data has not been changed.'); }
    if (ids.has(schedule.id) || scopes.has(scope(schedule))) throw new Error('The saved panel imports contain conflicting identities. Existing data has not been changed.');
    ids.add(schedule.id); scopes.add(scope(schedule));
  }
  return value;
}

/** Pure replacement policy. No caller-owned objects or previous imports are mutated. */
export function preparePanelImports(existing, schedule, {replaceId = null, expectedImportId = null} = {}) {
  validateSchedule(schedule);
  const previous = validatedExisting(existing);
  const sameScope = previous.find(item => scope(item) === scope(schedule));
  if (replaceId !== null || expectedImportId !== null) {
    if (!sameScope || sameScope.id !== replaceId || sameScope.id !== expectedImportId) {
      throw new Error('This panel import changed since the preview opened. Reopen the import and confirm the current replacement.');
    }
    if (schedule.id === sameScope.id) throw new Error('A replacement needs a new import ID.');
  } else if (sameScope) {
    throw new Error('This site and panel already have an import. Confirm replacement before saving.');
  }
  if (previous.some(item => item.id === schedule.id)) throw new Error('This import ID is already in use.');
  const next = sameScope ? previous.map(item => item.id === sameScope.id ? schedule : item) : [...previous, schedule];
  return structuredClone(next);
}

/** Injectable database opener supports transaction tests without replacing the device database. */
export function createPanelImportStore(open = openDB) {
  async function loadPanelImports() {
    const database = await open();
    return new Promise((resolve, reject) => {
      let result;
      const transaction = database.transaction(['settings'], 'readonly');
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error('Could not read panel imports from this device.'));
      const request = transaction.objectStore('settings').get(PANEL_IMPORTS_KEY);
      request.onsuccess = () => {
        try { result = structuredClone(validatedExisting(request.result)); }
        catch (error) { transaction.abort(); reject(error); }
      };
    });
  }

  async function savePanelImport(schedule, options = {}) {
    // Snapshot before waiting for the database so UI changes cannot alter a queued save.
    const candidate = structuredClone(schedule), intent = structuredClone(options);
    validateSchedule(candidate);
    const database = await open();
    return new Promise((resolve, reject) => {
      let committed;
      const transaction = database.transaction(['settings'], 'readwrite');
      transaction.oncomplete = () => resolve(committed);
      transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error('The panel import could not be saved. The previous import is unchanged.'));
      const settings = transaction.objectStore('settings');
      const request = settings.get(PANEL_IMPORTS_KEY);
      request.onsuccess = () => {
        try {
          const next = preparePanelImports(request.result, candidate, intent);
          settings.put(next, PANEL_IMPORTS_KEY);
          committed = next.find(item => item.id === candidate.id);
        } catch (error) { transaction.abort(); reject(error); }
      };
    });
  }
  return {loadPanelImports, savePanelImport};
}

const defaultStore = createPanelImportStore();
export const loadPanelImports = () => defaultStore.loadPanelImports();
export const savePanelImport = (schedule, options) => defaultStore.savePanelImport(schedule, options);

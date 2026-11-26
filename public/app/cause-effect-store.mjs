import {openDB} from './db.mjs';
import {validateProject} from './cause-effect-engine.mjs';

// Reuse FINDR's existing settings store: no database upgrade, no other records
// changed, and no shared manuals deleted when a learning project is removed.
export const CAUSE_EFFECT_PROJECTS_KEY = 'cause-effect-projects-v1';
const clone = value => structuredClone(value);
function issue(code, message, cause) {
  const error = new Error(message, cause ? {cause} : undefined);
  error.code = code;
  return error;
}
function storedProjects(raw) {
  if (raw === undefined) return [];
  if (!raw || raw.schemaVersion !== 1 || !Array.isArray(raw.projects)) throw issue('CAUSE_EFFECT_STORAGE_INVALID', 'Saved matrix projects cannot be read. Existing data has not been changed.');
  const ids = new Set();
  try {
    return raw.projects.map(value => {
      const project = validateProject(value);
      if (ids.has(project.id) || project.revision < 1) throw new Error('Conflicting saved project identity.');
      ids.add(project.id);
      return project;
    });
  } catch (cause) {
    throw issue('CAUSE_EFFECT_STORAGE_INVALID', 'A saved matrix project is malformed. Existing data has not been changed.', cause);
  }
}
function storageFailure(error, write) {
  if (typeof error?.code === 'string' && error.code.startsWith('CAUSE_EFFECT_')) return error;
  const full = error?.name === 'QuotaExceededError' || /quota|storage.*full/i.test(error?.message || '');
  return issue(full ? 'CAUSE_EFFECT_STORAGE_FULL' : 'CAUSE_EFFECT_STORAGE_UNAVAILABLE', full
    ? 'Device storage is full. This matrix has not been saved. Export it before freeing space, then retry.'
    : write ? 'This matrix could not be saved on this device. Keep this screen open, export your work and retry.'
      : 'Saved matrices could not be opened. Check browser storage access and retry.', error);
}

/** Atomic revision leases prevent late saves or another tab overwriting work. */
export function createCauseEffectStore(open = openDB) {
  async function transaction(write, apply) {
    let database;
    try { database = await open(); }
    catch (error) { throw storageFailure(error, write); }
    return new Promise((resolve, reject) => {
      let tx, result, failure;
      try {
        tx = database.transaction(['settings'], write ? 'readwrite' : 'readonly');
        tx.oncomplete = () => resolve(clone(result));
        tx.onabort = tx.onerror = () => reject(failure || storageFailure(tx.error, write));
        const settings = tx.objectStore('settings');
        const request = settings.get(CAUSE_EFFECT_PROJECTS_KEY);
        request.onsuccess = () => {
          try {
            const previous = storedProjects(request.result);
            const next = apply(previous);
            result = next.result;
            if (write) settings.put({schemaVersion: 1, projects: next.projects}, CAUSE_EFFECT_PROJECTS_KEY);
          } catch (error) {
            failure = storageFailure(error, write);
            tx.abort();
            reject(failure);
          }
        };
      } catch (error) {
        failure = storageFailure(error, write);
        try { tx?.abort(); } catch { /* The transaction may not have opened. */ }
        reject(failure);
      }
    });
  }
  const listProjects = () => transaction(false, projects => ({result: projects.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name))}));
  const loadProject = id => transaction(false, projects => ({result: projects.find(project => project.id === id) || null}));
  async function saveProject(value, {expectedRevision = value?.revision} = {}) {
    // Snapshot before awaiting the database; edits in the UI cannot change a
    // pending transaction's payload.
    const candidate = validateProject(value);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw issue('CAUSE_EFFECT_REVISION_CONFLICT', 'Reopen the latest saved matrix before saving again.');
    return transaction(true, projects => {
      const existing = projects.find(project => project.id === candidate.id);
      if ((existing && existing.revision !== expectedRevision) || (!existing && expectedRevision !== 0)) throw issue('CAUSE_EFFECT_REVISION_CONFLICT', 'This matrix changed in another tab or was deleted. Export your work, then reopen the latest project.');
      const committed = validateProject({...candidate, createdAt: existing?.createdAt ?? candidate.createdAt, updatedAt: Date.now(), revision: (existing?.revision ?? 0) + 1});
      const next = existing ? projects.map(project => project.id === committed.id ? committed : project) : [...projects, committed];
      return {projects: next, result: committed};
    });
  }
  async function removeProject(id, {expectedRevision} = {}) {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw issue('CAUSE_EFFECT_REVISION_CONFLICT', 'Reopen the latest matrix before confirming deletion.');
    return transaction(true, projects => {
      const current = projects.find(project => project.id === id);
      if (!current || current.revision !== expectedRevision) throw issue('CAUSE_EFFECT_REVISION_CONFLICT', 'This matrix changed or was deleted in another tab. Reopen the latest project before deleting it.');
      return {projects: projects.filter(project => project.id !== id), result: true};
    });
  }
  return {listProjects, loadProject, saveProject, removeProject};
}
const store = createCauseEffectStore();
export const listProjects = store.listProjects;
export const loadProject = store.loadProject;
export const saveProject = store.saveProject;
export const removeProject = store.removeProject;

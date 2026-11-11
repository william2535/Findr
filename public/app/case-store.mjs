import {openDB} from './db.mjs';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && typeof value.id === 'string' && value.id.trim().length > 0;

/** Keep every other case, including older sessions with no investigation fields. */
export function mergeCaseSnapshot(history, record, now = Date.now()) {
  if (!isRecord(record)) throw new Error('The case needs a valid session ID before it can be saved.');
  if (!Number.isFinite(now) || now < 0) throw new Error('The case save time is invalid.');
  const previous = history === undefined ? [] : history;
  if (!Array.isArray(previous) || previous.some(item => !isRecord(item))) {
    throw new Error('Saved case history cannot be read. Existing sessions have not been changed.');
  }
  const session = {...structuredClone(record), savedAt: now};
  return {
    session,
    history: [structuredClone(session), ...structuredClone(previous.filter(item => item.id !== session.id))],
  };
}

/** Read and update both existing settings keys in one IndexedDB transaction. */
export function createCaseStore(open = openDB) {
  async function saveCaseSnapshot(record, now = Date.now()) {
    // Take the snapshot before awaiting storage; edits made while saving belong to a later save.
    const candidate = mergeCaseSnapshot(undefined, record, now).session;
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['settings'], 'readwrite');
      let result, failure;
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => { failure ||= transaction.error; };
      transaction.onabort = () => reject(failure || transaction.error || new Error('The case could not be saved. Existing sessions have not been changed.'));
      const abort = error => {
        failure = error;
        try { transaction.abort(); }
        catch { reject(error); }
      };
      try {
        const settings = transaction.objectStore('settings');
        const request = settings.get('history');
        request.onsuccess = () => {
          try {
            result = mergeCaseSnapshot(request.result, candidate, now);
            settings.put(result.history, 'history');
            settings.put(result.session, 'session');
          } catch (error) { abort(error); }
        };
      } catch (error) { abort(error); }
    });
  }
  return {saveCaseSnapshot};
}

const defaultStore = createCaseStore();
export const saveCaseSnapshot = (record, now) => defaultStore.saveCaseSnapshot(record, now);
export default saveCaseSnapshot;

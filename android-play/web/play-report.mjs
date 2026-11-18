// Play-only voluntary reports. No conversation/store access is performed here.
export const REPORT_CATEGORIES = Object.freeze({
  unsafe: 'Unsafe technical advice',
  offensive: 'Offensive or inappropriate content',
  unsupported: 'Incorrect or unsupported answer',
  other: 'Another problem with an AI answer',
});

export function reportEndpoint(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.search && !url.hash && url.pathname === '/reports' ? url.href : null;
  } catch { return null; }
}

export function makeReport(config, fields, id = crypto.randomUUID()) {
  const description = String(fields.description || '').trim();
  const answerExcerpt = String(fields.answerExcerpt || '').trim();
  if (!Object.hasOwn(REPORT_CATEGORIES, fields.category)) throw Error('Choose the kind of problem.');
  if (!description && !answerExcerpt) throw Error('Describe the problem or include the answer you want reviewed.');
  if (description.length > 4000 || answerExcerpt.length > 4000) throw Error('Keep each text field within 4,000 characters.');
  if (fields.consent !== true) throw Error('Confirm that you want to send this report.');
  return {schemaVersion: 1, id, category: fields.category, description, answerExcerpt,
    appVersion: String(config.versionName || ''), applicationId: String(config.applicationId || ''), consent: true};
}

export async function sendReport(config, report, {signal, fetcher = fetch} = {}) {
  const endpoint = reportEndpoint(config.reportUrl);
  if (!endpoint) throw Error('Reporting is not configured for this review build. Nothing has been sent.');
  const response = await fetcher(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(report), signal, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer'});
  let result;
  try { result = await response.json(); } catch { throw Error('The reporting service returned an unreadable response. Keep this report open and retry.'); }
  if (response.status === 429) throw Error('The reporting service is busy. Please wait a little, then retry.');
  if (response.status === 409) throw Error('This report reference already contains different text. Edit a field and try again.');
  if (!response.ok || result.accepted !== true || result.id !== report.id) {
    throw Error('The reporting service could not confirm your report. Keep it open and retry.');
  }
  return result;
}

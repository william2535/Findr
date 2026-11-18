import {REPORT_CATEGORIES, makeReport, reportEndpoint, sendReport} from './play-report.mjs';

const css = document.createElement('link');
css.rel = 'stylesheet'; css.href = new URL('./play-store.css', import.meta.url).href;
document.head.append(css);
let config = {applicationId: '', versionName: '', privacyUrl: '', supportEmail: '', reportUrl: '', releaseReady: false};
try {
  const response = await fetch(new URL('./play-config.json', import.meta.url));
  if (response.ok) config = {...config, ...await response.json()};
} catch { /* Report readiness remains explicit. The bundled application stays usable. */ }

const element = (tag, text, attrs = {}) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
};
const button = (text, action, className = 'subtle') => {
  const node = element('button', text, {type: 'button', class: className});
  node.addEventListener('click', event => {event.preventDefault(); event.stopPropagation(); action();});
  return node;
};
let activeDialog = null;
function closeDialog() {
  if (activeDialog) { activeDialog.close(); activeDialog.remove(); activeDialog = null; }
}
function dialog(title) {
  closeDialog();
  const node = element('dialog', undefined, {class: 'play-dialog', 'aria-label': title});
  const close = button('Close', closeDialog, 'secondary'); close.classList.add('play-dialog-close');
  node.append(close, element('h2', title));
  node.addEventListener('close', () => {node.remove(); if (activeDialog === node) activeDialog = null;});
  node.addEventListener('cancel', () => { /* Native dialog Escape closes normally. */ });
  document.body.append(node); activeDialog = node; node.showModal(); return node;
}
function safeHttps(value) {
  try {const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;} catch {return null;}
}
function privacy() {
  const box = dialog('Privacy & support');
  box.append(element('p', 'Your manuals, panel pals, conversations and readings are stored on this device. Clearing app storage or uninstalling FINDR removes them. Export important work before doing either.'));
  box.append(element('p', 'Online AI is optional. When you explicitly enable it, your question, relevant conversation context and selected manual extracts travel through FINDR’s relay to your chosen provider. The provider key is held for the current session. Downloads contact the document publisher or configured download service.'));
  box.append(element('p', 'A report sends only the fields you review in the report form, plus the app version and report reference. FINDR does not automatically attach your job, manuals, stored conversations or API key. Reports are kept for up to 30 days by the configured reporting service.'));
  const url = safeHttps(config.privacyUrl);
  if (url) box.append(element('a', 'Read the full privacy policy ↗', {href: url, target: '_blank', rel: 'noopener noreferrer', class: 'secondary'}));
  else box.append(element('p', 'The public privacy-policy link has not been configured for this review build.', {class: 'notice'}));
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.supportEmail)) {
    box.append(element('p', 'Support: ' + config.supportEmail));
    box.append(button('Copy support email', async () => {
      try {await navigator.clipboard.writeText(config.supportEmail); status.textContent = 'Support email copied.';}
      catch {status.textContent = 'Select and copy the email shown above.';}
    }, 'secondary'));
  } else box.append(element('p', 'A public support contact still needs to be configured for this review build.', {class: 'notice'}));
  box.append(button('Report an AI answer', () => report(''), 'secondary'));
  const status = element('p', '', {role: 'status'}); box.append(status);
  box.append(element('small', 'FINDR ' + config.versionName + ' · Google Play build'));
}

function report(answerText) {
  const box = dialog('Report an AI answer');
  box.append(element('p', 'Tell Will what went wrong. Review the text before sending. Leave out names, site details, passwords, engineer codes and API keys.'));
  const form = element('form');
  const reasonLabel = element('label', 'What is wrong?');
  const reason = element('select', undefined, {required: '', name: 'category'});
  for (const [value, label] of Object.entries(REPORT_CATEGORIES)) reason.append(element('option', label, {value}));
  reasonLabel.append(reason);
  const descriptionLabel = element('label', 'What should we review?');
  const description = element('textarea', undefined, {rows: '4', maxlength: '4000', name: 'description', placeholder: 'Explain the problem…'});
  descriptionLabel.append(description);
  const excerptLabel = element('label', 'Answer excerpt (optional — editable)');
  const excerpt = element('textarea', undefined, {rows: '5', maxlength: '4000', name: 'answerExcerpt'});
  excerpt.value = String(answerText || '').slice(0, 4000); excerptLabel.append(excerpt);
  const consentLabel = element('label', undefined, {class: 'play-consent'});
  const consent = element('input', undefined, {type: 'checkbox', required: '', name: 'consent'});
  consentLabel.append(consent, element('span', 'Send these fields to the FINDR developer for review. Reports are retained for up to 30 days.'));
  const submit = element('button', 'Send report', {type: 'submit', class: 'primary'});
  const status = element('p', '', {role: 'status', 'aria-live': 'polite'});
  const cancel = button('Cancel sending', () => controller?.abort(), 'secondary'); cancel.hidden = true;
  form.append(reasonLabel, descriptionLabel, excerptLabel, consentLabel, submit, cancel, status);
  box.append(form);
  let controller = null, payload = null, snapshot = '', sent = false;
  if (!reportEndpoint(config.reportUrl)) {
    status.textContent = 'Reporting is not configured for this review build. Nothing has been sent. It must be connected before the Play Store release.';
    submit.disabled = true;
  }
  box.addEventListener('close', () => controller?.abort());
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (controller || sent) return;
    try {
      const fields = {category: reason.value, description: description.value, answerExcerpt: excerpt.value, consent: consent.checked};
      const nextSnapshot = JSON.stringify(fields);
      if (!payload || nextSnapshot !== snapshot) {payload = makeReport(config, fields); snapshot = nextSnapshot;}
      controller = new AbortController(); let timedOut = false;
      const timeout = setTimeout(() => {timedOut = true; controller?.abort();}, 20000);
      for (const node of [reason, description, excerpt, consent, submit]) node.disabled = true;
      cancel.hidden = false; status.textContent = 'Sending your report…';
      try {
        await sendReport(config, payload, {signal: controller.signal});
        sent = true; status.textContent = 'Report received. Thank you. Reference: ' + payload.id;
      } catch (error) {
        status.textContent = error?.name === 'AbortError'
          ? (timedOut ? 'The request timed out.' : 'Sending was cancelled.') + ' The service may already have received it. Retry uses the same reference, so it will not create a second report.'
          : error.message || 'Your report could not be confirmed. Retry when you are connected.';
      } finally {
        clearTimeout(timeout); controller = null; cancel.hidden = true;
        for (const node of [reason, description, excerpt, consent, submit]) node.disabled = sent;
        if (!sent) submit.textContent = 'Retry report';
      }
    } catch (error) {status.textContent = error.message;}
  });
}

const footer = document.querySelector('body > footer');
if (footer) {
  const tools = element('div', undefined, {class: 'play-support-tools'});
  tools.append(button('Privacy & support', privacy), button('Report AI answer', () => report('')));
  footer.append(tools);
}
function attachReport(row) {
  if (!row.matches?.('.helper-message[data-role="assistant"]') || row.querySelector('.play-report-answer')) return;
  // The engineer chooses this visible answer; no store, job or hidden context is read.
  const action = button('Report this answer', () => report(row.querySelector('.helper-message-text')?.textContent || ''), 'subtle play-report-answer');
  row.append(action);
}
function scan(node) {
  if (!(node instanceof Element)) return;
  attachReport(node);
  for (const row of node.querySelectorAll('.helper-message[data-role="assistant"]')) attachReport(row);
}
const app = document.getElementById('app');
if (app) {
  scan(app);
  new MutationObserver(changes => {for (const change of changes) for (const node of change.addedNodes) scan(node);})
    .observe(app, {childList: true, subtree: true});
}

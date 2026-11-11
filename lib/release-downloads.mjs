import { APK_VERSION } from '../public/app/version.mjs';

// Historical artifacts and all checksums remain in source. Large current APKs
// use an exact external release asset and may be supplied separately to the
// source backup: the Sites source Git service cannot accept their large blobs.
// Only explicitly listed binaries are optional in a checkout and excluded
// from the static deployment; an available local copy is still hash-verified.
// When releasing again, move the previous version into ARCHIVED_RELEASES and
// add its exact route handlers before changing PREVIOUS_APK_VERSION.
export const PREVIOUS_APK_VERSION = '0.14.1';
export const RETAINED_APK_VERSIONS = Object.freeze([APK_VERSION, PREVIOUS_APK_VERSION]);
export const RETAINED_RELEASE_FILES = Object.freeze(RETAINED_APK_VERSIONS.flatMap(version => [
  `FINDR-${version}.apk`, `FINDR-${version}.apk.sha256`,
]));
export const EXTERNAL_RELEASES = Object.freeze([
  Object.freeze({
    version: '0.37.0',
    sourceCommit: 'ae2be03ffa51aa08c5f10e1a088e4970a8d44836',
    apkFile: 'FINDR-0.37.0.apk',
    url: 'https://raw.githubusercontent.com/william2535/Findr/ae2be03ffa51aa08c5f10e1a088e4970a8d44836/public/releases/FINDR-0.37.0.apk',
  }),
]);
export const EXTERNAL_RELEASE_FILES = Object.freeze(EXTERNAL_RELEASES.map(release => release.apkFile));
export const DEPLOYED_RELEASE_FILES = Object.freeze(RETAINED_RELEASE_FILES.filter(filename => !EXTERNAL_RELEASE_FILES.includes(filename)));

export const ARCHIVED_RELEASES = Object.freeze([
  ['0.3.1', 'FINDR-0.3.1.sha256'],
  ['0.4.0', 'FINDR-0.4.0.sha256'],
  ['0.5.0', 'FINDR-0.5.0.sha256'],
  ['0.5.1', 'FINDR-0.5.1.sha256'],
  ['0.6.0', 'FINDR-0.6.0.apk.sha256'],
  ['0.7.0', 'FINDR-0.7.0.apk.sha256'],
  ['0.8.0', 'FINDR-0.8.0.apk.sha256'],
  ['0.8.1', 'FINDR-0.8.1.apk.sha256'],
  ['0.9.0', 'FINDR-0.9.0.apk.sha256'],
  ['0.10.0', 'FINDR-0.10.0.apk.sha256'],
  ['0.11.0', 'FINDR-0.11.0.apk.sha256'],
  ['0.11.1', 'FINDR-0.11.1.apk.sha256'],
  ['0.11.2', 'FINDR-0.11.2.apk.sha256'],
  ['0.12.0', 'FINDR-0.12.0.apk.sha256'],
  ['0.12.1', 'FINDR-0.12.1.apk.sha256'],
  ['0.12.2', 'FINDR-0.12.2.apk.sha256'],
  ['0.12.3', 'FINDR-0.12.3.apk.sha256'],
  ['0.13.0', 'FINDR-0.13.0.apk.sha256'],
  ['0.13.1', 'FINDR-0.13.1.apk.sha256'],
  ['0.13.2', 'FINDR-0.13.2.apk.sha256'],
  ['0.14.0', 'FINDR-0.14.0.apk.sha256'],
].map(([version, checksumFile]) => Object.freeze({
  version, apkFile: `FINDR-${version}.apk`, checksumFile,
})));

export const ARCHIVED_RELEASE_FILES = Object.freeze(ARCHIVED_RELEASES.flatMap(release => [
  release.apkFile, release.checksumFile,
]));
const retainedFiles = new Set(RETAINED_RELEASE_FILES);
const externalFiles = new Map(EXTERNAL_RELEASES.map(release => [release.apkFile, release]));
const archivedFiles = new Map(ARCHIVED_RELEASES.flatMap(release => [
  [release.apkFile, release], [release.checksumFile, release],
]));

export function releaseFileDisposition(filename) {
  if (externalFiles.has(filename)) return 'external';
  if (retainedFiles.has(filename)) return 'retained';
  if (archivedFiles.has(filename)) return 'archived';
  return null;
}

// Exact immutable-version redirect only. Neither a request parameter nor the
// current version can change the publisher, repository or requested artifact.
// The checksum remains a locally served static asset alongside this route.
export function externalReleaseResponse(filename) {
  const release = externalFiles.get(filename);
  const headers = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'};
  return release
    ? new Response(null, {status: 307, headers: {...headers, Location: release.url}})
    : new Response(null, {status: 404, headers});
}

// Dispatch before Vinext's generated public-file lookup. The source checkout
// can contain retained APK bytes which are deliberately absent from the static
// deployment; that lookup must not turn their explicit release route into 404.
export function releaseRequestResponse(request) {
  if (!request || !['GET','HEAD'].includes(request.method)) return null;
  let path;
  try { path = new URL(request.url).pathname; } catch { return null; }
  if (!path.startsWith('/releases/')) return null;
  const filename = path.slice('/releases/'.length);
  const disposition = releaseFileDisposition(filename);
  if (disposition === 'external') return externalReleaseResponse(filename);
  if (disposition === 'archived') return archivedReleaseResponse(filename, {head: request.method === 'HEAD'});
  return null;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

// A versioned URL never redirects to, or sends, a different APK. A 410 HTML
// page makes the retirement explicit and lets the visitor choose a new link.
export function archivedReleaseResponse(filename, { head = false } = {}) {
  const release = archivedFiles.get(filename);
  const headers = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Type': release ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
  };
  if (!release) return new Response(head ? null : 'Release not found.', { status: 404, headers });
  const version = escapeHtml(release.version);
  const currentVersion = escapeHtml(APK_VERSION);
  const currentFile = `FINDR-${currentVersion}.apk`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><meta name="theme-color" content="#ffc72c">
<title>FINDR ${version} is archived</title>
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#111416;color:#f6f7f8}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px}main{width:100%;max-width:540px;background:#1b2023;border:1px solid #374047;border-radius:20px;padding:clamp(24px,6vw,40px)}.brand{font-size:20px;letter-spacing:.14em;font-weight:900;color:#ffc72c}h1{font-size:clamp(28px,7vw,36px);line-height:1.16;margin:24px 0 16px}p{color:#d1d7da;line-height:1.6}.file{font-family:monospace;font-size:14px;overflow-wrap:anywhere}.links{display:grid;gap:12px;margin-top:28px}a{display:block;border:1px solid #71808a;border-radius:10px;padding:14px 18px;color:#fff;text-align:center;text-decoration:none;font-weight:700}a.primary{color:#141719;background:#ffc72c;border-color:#ffc72c}a:focus-visible{outline:3px solid #fff;outline-offset:4px}a:hover{filter:brightness(1.12)}
</style></head><body><main><div class="brand">FINDR</div>
<h1>FINDR ${version} is archived</h1>
<p>This older Android ${filename === release.checksumFile ? 'checksum' : 'download'} is no longer available at this address. You can get the current release using the links below.</p>
<p class="file">${escapeHtml(filename)}</p>
<nav class="links" aria-label="Current FINDR release">
<a class="primary" href="/releases/${currentFile}" download="${currentFile}">Download FINDR ${currentVersion} for Android</a>
<a href="/">Open the FINDR release page</a>
</nav></main></body></html>`;
  return new Response(head ? null : html, {
    status: 410,
    headers: { ...headers, 'Content-Disposition': 'inline' },
  });
}

// Shared by the web launcher, offline app and release packaging scripts.
export const APK_VERSION = '0.14.1';
export const APP_VERSION = '0.36.1';
export const ANDROID_VERSION_CODE = 26;
export const RELEASE_URL = 'https://findr-fault-finder.floodyyy21.chatgpt.site';

export function isNewerRelease(candidate, current = APP_VERSION) {
  if (typeof candidate !== 'string' || typeof current !== 'string') return false;
  if (!/^\d+\.\d+\.\d+$/.test(candidate || '') || !/^\d+\.\d+\.\d+$/.test(current || '')) return false;
  const next = candidate.split('.').map(Number), previous = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (next[i] !== previous[i]) return next[i] > previous[i];
  return false;
}

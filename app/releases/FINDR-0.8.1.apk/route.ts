import { archivedReleaseResponse } from '../../../lib/release-downloads.mjs';

export function GET() {
  return archivedReleaseResponse('FINDR-0.8.1.apk');
}

export function HEAD() {
  return archivedReleaseResponse('FINDR-0.8.1.apk', { head: true });
}

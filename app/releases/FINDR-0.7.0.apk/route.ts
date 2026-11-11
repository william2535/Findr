import { archivedReleaseResponse } from '../../../lib/release-downloads.mjs';

export function GET() {
  return archivedReleaseResponse('FINDR-0.7.0.apk');
}

export function HEAD() {
  return archivedReleaseResponse('FINDR-0.7.0.apk', { head: true });
}

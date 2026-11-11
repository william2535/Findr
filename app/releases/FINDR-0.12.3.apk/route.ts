import { archivedReleaseResponse } from '../../../lib/release-downloads.mjs';

export function GET() {
  return archivedReleaseResponse('FINDR-0.12.3.apk');
}

export function HEAD() {
  return archivedReleaseResponse('FINDR-0.12.3.apk', { head: true });
}

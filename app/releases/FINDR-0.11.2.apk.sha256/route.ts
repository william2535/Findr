import { archivedReleaseResponse } from '../../../lib/release-downloads.mjs';

export function GET() {
  return archivedReleaseResponse('FINDR-0.11.2.apk.sha256');
}

export function HEAD() {
  return archivedReleaseResponse('FINDR-0.11.2.apk.sha256', { head: true });
}

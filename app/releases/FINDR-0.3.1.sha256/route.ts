import { archivedReleaseResponse } from '../../../lib/release-downloads.mjs';

export function GET() {
  return archivedReleaseResponse('FINDR-0.3.1.sha256');
}

export function HEAD() {
  return archivedReleaseResponse('FINDR-0.3.1.sha256', { head: true });
}

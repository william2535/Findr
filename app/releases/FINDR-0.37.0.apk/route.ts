import { externalReleaseResponse } from '../../../lib/release-downloads.mjs';

export function GET() {
  return externalReleaseResponse('FINDR-0.37.0.apk');
}

export function HEAD() {
  return externalReleaseResponse('FINDR-0.37.0.apk');
}

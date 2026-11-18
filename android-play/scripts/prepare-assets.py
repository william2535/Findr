#!/usr/bin/env python3
"""Build the Play-only web asset staging tree; never modify public/app or preview APKs."""
import argparse
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import shutil
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parent
REQUIRED_ENV = ('FINDR_PLAY_PRIVACY_URL', 'FINDR_PLAY_SUPPORT_EMAIL', 'FINDR_PLAY_REPORT_URL')


def release_settings():
    return dict(line.split('=', 1) for line in (ROOT / 'play-release.properties').read_text().splitlines()
                if line.strip() and not line.lstrip().startswith('#'))


def public_https(value):
    url = urlparse(value)
    host = (url.hostname or '').lower()
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return (url.scheme == 'https' and '.' in host and not host.endswith(('.local','.localhost','.internal','.invalid','.test'))
            and not url.username and not url.password and not url.fragment and not url.query)


def prepare(output, release=False, review_only=False):
    if release and review_only: raise ValueError('Review-only and distribution release modes are mutually exclusive.')
    settings = release_settings()
    source = PROJECT / 'public/app'
    version = re.search(r"APP_VERSION = '([^']+)'", (source / 'version.mjs').read_text()).group(1)
    if settings['webVersion'] != version:
        raise ValueError('Play webVersion is stale; review the newer web source before building.')
    if not re.fullmatch(r'[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}', settings['applicationId']):
        raise ValueError('Invalid Play application ID')
    if settings['applicationId'] == 'com.findr.app':
        raise ValueError('Separate Play build must not use the preview package identity.')
    config = {'applicationId': settings['applicationId'], 'versionName': settings['versionName'],
              'privacyUrl': os.environ.get(REQUIRED_ENV[0]) or settings.get('privacyUrl', ''), 'supportEmail': os.environ.get(REQUIRED_ENV[1]) or settings.get('supportEmail', ''),
              'reportUrl': os.environ.get(REQUIRED_ENV[2], '')}
    missing = [name for name,key in zip(REQUIRED_ENV, ['privacyUrl','supportEmail','reportUrl']) if not config[key]]
    for key in ['privacyUrl', 'reportUrl']:
        if config[key] and not public_https(config[key]): raise ValueError('Invalid public HTTPS ' + key)
    if config['supportEmail'] and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', config['supportEmail']):
        raise ValueError('Invalid public support email')
    if release and missing: raise ValueError('Release configuration missing: ' + ', '.join(missing))
    if release and os.environ.get('FINDR_PLAY_READINESS_CONFIRMED') != 'yes':
        raise ValueError('Complete the documented Play readiness review and set FINDR_PLAY_READINESS_CONFIRMED=yes.')
    config['releaseReady'] = release and not missing
    config['reviewOnly'] = review_only
    output = Path(output).resolve()
    if not output.is_relative_to(ROOT / 'app/build'):
        raise ValueError('Only the generated app/build directory may be used for staging.')
    dest = output / 'www'
    if dest.exists(): shutil.rmtree(dest)
    if any(p.is_symlink() for p in source.rglob('*')): raise ValueError('Symlink in source assets')
    shutil.copytree(source, dest)
    for path in dest.rglob('*'):
        if path.is_symlink(): raise ValueError('Symlinks are not supported in Play assets')
    html = (dest / 'index.html').read_text()
    html = html.replace('</body>', '<script type="module" src="./play-store.mjs"></script></body>')
    (dest / 'index.html').write_text(html)
    play_url = 'https://play.google.com/store/apps/details?id=' + settings['applicationId']
    script = (dest / 'app.mjs').read_text()
    replacements = {
        'For a newer Android build, install the latest APK as an update to this app.': 'Update this separate FINDR edition through Google Play. The preview APK is a different app.',
        'The installed Android app updates through a new APK. Open the release page to check the latest available version.': 'This edition updates through Google Play. Check the Play listing for an available update.',
        'href="${RELEASE_URL}" target="_blank" rel="noopener">Open release page': 'href="' + play_url + '" target="_blank" rel="noopener">Open Google Play',
    }
    for old, new in replacements.items():
        if old not in script: raise ValueError('Play update override no longer matches source: ' + old)
        script = script.replace(old, new)
    (dest / 'app.mjs').write_text(script)
    for path in (ROOT / 'web').iterdir():
        if path.is_file(): shutil.copy2(path, dest / path.name)
    if not (dest / 'play-store.mjs').is_file(): raise ValueError('Play support UI is missing')
    (dest / 'play-config.json').write_text(json.dumps(config, indent=2) + '\n')
    originals = {p.relative_to(source).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in source.rglob('*') if p.is_file()}
    assets = {p.relative_to(dest).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in dest.rglob('*') if p.is_file()}
    changed = sorted(name for name, digest in originals.items() if assets.get(name) != digest)
    if changed != ['app.mjs', 'index.html']: raise ValueError('Unexpected shared asset changes: ' + repr(changed))
    report = {'webVersion': version, 'versionName': settings['versionName'], 'applicationId': settings['applicationId'],
              'originalAssets': len(originals), 'includedAssets': len(assets), 'originalBytes': sum(p.stat().st_size for p in source.rglob('*') if p.is_file()),
              'intentionalOverrides': changed, 'additionalAssets': sorted(set(assets) - set(originals)),
              'releaseReady': config['releaseReady'], 'reviewOnly': review_only, 'missingConfiguration': missing, 'assets': assets}
    (output / 'play-asset-manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k:v for k,v in report.items() if k != 'assets'}, indent=2))
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    parser.add_argument('--release', action='store_true')
    parser.add_argument('--review-only', action='store_true', help='Signed internal draft preparation; never a distribution-ready release')
    args = parser.parse_args()
    prepare(args.output, args.release, args.review_only)

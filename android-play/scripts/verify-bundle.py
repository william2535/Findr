#!/usr/bin/env python3
"""Verify the separately staged Play bundle; unsigned is never called upload-ready."""
import argparse
import base64
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parent
ANDROID = '{http://schemas.android.com/apk/res/android}'
OVERRIDES = ['app.mjs', 'index.html']
PREVIEW_CERTIFICATE_SHA256 = '6075a73725dac5a3cc1f7b6b32c5e1df907cd1ca4b5b611f4c1c1d2fd502fefd'
SECRET_PATTERNS = [
    re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    re.compile(rb'\bgh[pousr]_[A-Za-z0-9]{30,}\b'),
    re.compile(rb'\bgithub_pat_[A-Za-z0-9_]{30,}\b'),
    re.compile(rb'\bAKIA[0-9A-Z]{16}\b'),
]
FORBIDDEN_SUFFIXES = {'.jks', '.keystore', '.p12', '.pfx', '.sqlite', '.sqlite3', '.db', '.gguf', '.safetensors', '.so'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def settings():
    return dict(line.split('=', 1) for line in (ROOT / 'play-release.properties').read_text().splitlines()
                if line.strip() and not line.lstrip().startswith('#'))


def source_assets(source):
    require(source.is_dir(), 'Original web source is unavailable')
    require(not any(p.is_symlink() for p in source.rglob('*')), 'Symlink in original web assets')
    return {p.relative_to(source).as_posix(): digest(p.read_bytes()) for p in source.rglob('*') if p.is_file()}


def verify_assets(package, report, originals, allowed_additions):
    """Compare bytes against both the staged manifest and original web source."""
    files = [item for item in package.infolist() if not item.is_dir()]
    names = [item.filename for item in files]
    require(len(names) == len(set(names)), 'Duplicate ZIP entry')
    for item in files:
        path = PurePosixPath(item.filename)
        require(not path.is_absolute() and '..' not in path.parts and '\\' not in item.filename,
                'Unsafe ZIP path: ' + item.filename)
        require(not stat.S_ISLNK(item.external_attr >> 16), 'ZIP symlink: ' + item.filename)
        require(path.suffix.lower() not in FORBIDDEN_SUFFIXES and path.name not in {'.env', 'credentials.json'},
                'Unexpected key, user database, model weights or native binary: ' + item.filename)
        require(path.parts[0] in {'base', 'META-INF', 'BUNDLE-METADATA'} or item.filename == 'BundleConfig.pb',
                'Unexpected module or top-level bundle file: ' + item.filename)
    require(package.testzip() is None, 'ZIP integrity check failed')
    require('BundleConfig.pb' in names and 'base/manifest/AndroidManifest.xml' in names,
            'Missing Android App Bundle structure')
    require(any(n.startswith('base/dex/') and n.endswith('.dex') for n in names), 'Bundle has no application DEX')
    expected = report.get('assets', {})
    require(isinstance(expected, dict) and expected, 'Empty staged asset manifest')
    for name, checksum in expected.items():
        path = PurePosixPath(name)
        require(not path.is_absolute() and '..' not in path.parts and '\\' not in name, 'Unsafe staged asset path')
        require(isinstance(checksum, str) and re.fullmatch('[0-9a-f]{64}', checksum), 'Invalid staged asset checksum')
    expected_names = {'base/assets/www/' + name for name in expected} | {'base/assets/play-asset-manifest.json'}
    actual_names = {name for name in names if name.startswith('base/assets/')}
    require(actual_names == expected_names,
            'Missing or extra bundled assets: ' + repr(sorted(actual_names ^ expected_names)))
    bundled_report = json.loads(package.read('base/assets/play-asset-manifest.json'))
    require(bundled_report == report, 'Bundled asset manifest differs from the checked staging manifest')
    for name, checksum in expected.items():
        content = package.read('base/assets/www/' + name)
        require(digest(content) == checksum, 'Bundled asset checksum mismatch: ' + name)
        if PurePosixPath(name).suffix in {'.mjs', '.js', '.json', '.html', '.txt', '.css', '.md'}:
            require(not any(pattern.search(content) for pattern in SECRET_PATTERNS),
                    'Possible embedded credential in ' + name)
    require(set(originals) <= set(expected), 'Original web assets missing from Play bundle')
    changed = sorted(name for name, checksum in originals.items() if expected[name] != checksum)
    require(changed == OVERRIDES and report.get('intentionalOverrides') == OVERRIDES,
            'Unexpected original web asset overrides: ' + repr(changed))
    additions = sorted(set(expected) - set(originals))
    require(additions == sorted(allowed_additions) and report.get('additionalAssets') == additions,
            'Unexpected Play-only assets: ' + repr(additions))
    require(report.get('originalAssets') == len(originals) and report.get('includedAssets') == len(expected),
            'Asset counts differ from staged report')
    config = json.loads(package.read('base/assets/www/play-config.json'))
    require(config.get('applicationId') == report.get('applicationId') and config.get('versionName') == report.get('versionName'),
            'Play runtime identity differs from staged identity')
    require(config.get('releaseReady') is report.get('releaseReady'), 'Runtime release readiness differs from staging')
    return {'originalAssets': len(originals), 'includedAssets': len(expected), 'intentionalOverrides': changed,
            'additionalAssets': additions, 'nativeLibraries': [], 'secretPatternScan': 'passed',
            'releaseConfigurationReady': report.get('releaseReady') is True,
            'missingConfiguration': report.get('missingConfiguration', [])}


def verify_manifest(xml, expected):
    manifest = ET.fromstring(xml)
    value = lambda node, name: node.get(ANDROID + name)
    require(manifest.tag == 'manifest', 'Invalid decoded Android manifest')
    package = manifest.get('package')
    require(package == expected['applicationId'] and package != 'com.findr.app', 'Unexpected or preview application identity')
    require(value(manifest, 'versionCode') == str(expected['versionCode']), 'Unexpected version code')
    require(value(manifest, 'versionName') == expected['versionName'], 'Unexpected version name')
    sdk = manifest.find('uses-sdk')
    require(sdk is not None, 'No SDK declaration')
    require(value(sdk, 'minSdkVersion') == '26' and value(sdk, 'targetSdkVersion') == '36', 'Unexpected min/target SDK')
    permissions = [value(node, 'name') for node in manifest if node.tag.startswith('uses-permission')]
    require(permissions == ['android.permission.INTERNET'], 'Unexpected permissions: ' + repr(permissions))
    app = manifest.find('application')
    require(app is not None, 'No application declaration')
    require(value(app, 'debuggable') in {None, 'false'}, 'Release bundle is debuggable')
    require(value(app, 'allowBackup') == 'false', 'App backup unexpectedly enabled')
    require(value(app, 'usesCleartextTraffic') == 'false', 'Cleartext traffic unexpectedly enabled')
    require(value(app, 'testOnly') in {None, 'false'}, 'Bundle is marked test-only')
    return {'applicationId': package, 'versionCode': int(expected['versionCode']), 'versionName': expected['versionName'],
            'minSdk': 26, 'targetSdk': 36, 'permissions': permissions, 'debuggable': False,
            'allowBackup': False, 'usesCleartextTraffic': False}


def signature_status(bundle, names, java='java'):
    signed = any(re.fullmatch(r'META-INF/[^/]+\.(RSA|DSA|EC)', name, re.I) for name in names)
    if not signed:
        require(not any(re.fullmatch(r'META-INF/[^/]+\.SF', name, re.I) for name in names), 'Incomplete JAR signature')
        return {'status': 'unsigned', 'verified': False, 'note': 'Requires a private upload-key signature before Google Play upload.'}
    # Self-signed upload certificates are normal; their PKI trust is separate from archive integrity.
    command = [java, '-Duser.language=en', '-Duser.country=US', '-m', 'jdk.jartool/sun.security.tools.jarsigner.Main',
               '-verify', '-strict', str(bundle)]
    result = subprocess.run(command, capture_output=True, text=True, timeout=180)
    output = result.stdout + result.stderr
    require('jar verified' in output.lower() and result.returncode in {0, 4}, 'JAR signature verification failed or unsigned entries found')
    certs = subprocess.run([java, '-m', 'java.base/sun.security.tools.keytool.Main', '-printcert', '-jarfile', str(bundle), '-rfc'],
                           capture_output=True, text=True, timeout=180)
    require(certs.returncode == 0, 'Could not inspect bundle signing certificate')
    blocks = re.findall(r'-----BEGIN CERTIFICATE-----\s*(.*?)\s*-----END CERTIFICATE-----', certs.stdout, re.S)
    fingerprints = sorted(set(digest(base64.b64decode(block)) for block in blocks))
    require(bool(fingerprints), 'No verified bundle signing certificate found')
    require(PREVIEW_CERTIFICATE_SHA256 not in fingerprints, 'Preview signing key must not sign the separate Play release')
    return {'status': 'signed', 'verified': True, 'certificateSha256': fingerprints,
            'note': 'JAR signature verified and preview signer excluded; certificate trust warnings do not establish Play Console registration.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('bundle', type=Path)
    parser.add_argument('--asset-manifest', type=Path, default=ROOT / 'app/build/generated/playAssets/play-asset-manifest.json')
    parser.add_argument('--bundletool', type=Path, help='Official bundletool JAR; required for decoded-manifest and bundle validation')
    parser.add_argument('--java', default='java')
    parser.add_argument('--require-signed', action='store_true')
    parser.add_argument('--output', type=Path, help='Write the verification report as JSON')
    args = parser.parse_args()
    expected = settings()
    report = json.loads(args.asset_manifest.read_text())
    require(report.get('applicationId') == expected['applicationId'] and report.get('versionName') == expected['versionName'],
            'Staged release identity differs from Play configuration')
    require(report.get('webVersion') == expected['webVersion'], 'Staged web version differs from Play configuration')
    originals = source_assets(PROJECT / 'public/app')
    additions = [path.name for path in (ROOT / 'web').iterdir() if path.is_file()] + ['play-config.json']
    with zipfile.ZipFile(args.bundle) as package:
        results = verify_assets(package, report, originals, additions)
        signature = signature_status(args.bundle, package.namelist(), args.java)
    if args.require_signed:
        require(signature['verified'], 'Bundle is unsigned; Play upload requires the configured private upload key')
        require(results['releaseConfigurationReady'], 'Signed bundle lacks complete release configuration')
        require(args.bundletool is not None, 'Signed release verification requires bundletool')
    manifest = None
    if args.bundletool:
        subprocess.run([args.java, '-jar', str(args.bundletool), 'validate', '--bundle=' + str(args.bundle)],
                       check=True, capture_output=True, text=True, timeout=180)
        decoded = subprocess.run([args.java, '-jar', str(args.bundletool), 'dump', 'manifest', '--module=base',
                                  '--bundle=' + str(args.bundle)], check=True, capture_output=True, text=True, timeout=180)
        manifest = verify_manifest(decoded.stdout, expected)
    results.update({'bundle': str(args.bundle), 'bytes': args.bundle.stat().st_size,
                    'sha256': digest(args.bundle.read_bytes()), 'signature': signature,
                    'bundletoolValidated': bool(args.bundletool), 'manifest': manifest,
                    'uploadableBuildChecksPassed': bool(signature['verified'] and manifest and results['releaseConfigurationReady']),
                    'storeApproval': 'Not submitted or verified. Play Console/account/policy review remains separate.'})
    encoded = json.dumps(results, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded)
    print(encoded, end='')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, zipfile.BadZipFile, ET.ParseError, subprocess.SubprocessError) as error:
        print('Bundle verification failed: ' + str(error), file=sys.stderr)
        sys.exit(1)

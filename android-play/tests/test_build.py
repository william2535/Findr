"""Synthetic archive and isolated staging regressions; no production source writes."""
import contextlib
import base64
import gzip
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import subprocess
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


prepare = module('prepare_play_test', 'prepare-assets.py')
verify = module('verify_play_test', 'verify-bundle.py')


class BundleTests(unittest.TestCase):
    def setUp(self):
        self.originals = {name: verify.digest(value) for name, value in {
            'index.html': b'original html', 'app.mjs': b'original application', 'manual-reader.mjs': b'original reader'}.items()}
        self.assets = {'index.html': b'play html', 'app.mjs': b'play application', 'manual-reader.mjs': b'original reader',
                       'play-config.json': json.dumps({'applicationId': 'com.findr.play', 'versionName': '0.40.1-play.1', 'releaseReady': False}).encode()}
        self.report = {'applicationId': 'com.findr.play', 'versionName': '0.40.1-play.1', 'releaseReady': False,
                       'originalAssets': 3, 'includedAssets': 4, 'intentionalOverrides': ['app.mjs', 'index.html'],
                       'additionalAssets': ['play-config.json'], 'assets': {k: verify.digest(v) for k, v in self.assets.items()}}

    def archive(self, change=None):
        entries = {'BundleConfig.pb': b'synthetic', 'base/manifest/AndroidManifest.xml': b'synthetic protobuf',
                   'base/dex/classes.dex': b'synthetic dex', 'base/assets/play-asset-manifest.json': json.dumps(self.report).encode()}
        entries.update({'base/assets/www/' + k: v for k, v in self.assets.items()})
        if change: change(entries)
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w', zipfile.ZIP_DEFLATED) as out:
            for name, value in entries.items(): out.writestr(name, value)
        stream.seek(0)
        return zipfile.ZipFile(stream)

    def check(self, change=None):
        with self.archive(change) as archive:
            return verify.verify_assets(archive, self.report, self.originals, ['play-config.json'])

    def test_intact_bundle_preserves_shared_assets_without_claiming_release_ready(self):
        result = self.check()
        self.assertEqual(result['originalAssets'], 3)
        self.assertFalse(result['releaseConfigurationReady'])
        self.assertEqual(result['nativeLibraries'], [])

    def test_tampered_and_missing_original_bytes_fail(self):
        with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
            self.check(lambda entries: entries.update({'base/assets/www/manual-reader.mjs': b'tampered'}))
        with self.assertRaisesRegex(ValueError, 'Missing or extra'):
            self.check(lambda entries: entries.pop('base/assets/www/manual-reader.mjs'))

    def test_extra_user_data_or_signing_files_fail(self):
        for path in ['base/assets/www/customer.pdf', 'base/assets/preview.keystore', 'base/lib/arm64-v8a/unreviewed.so', '../escape']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.check(lambda entries: entries.update({path: b'not allowed'}))

    def test_manifest_cannot_hide_changed_shared_source(self):
        self.assets['manual-reader.mjs'] = b'changed reader'
        self.report['assets']['manual-reader.mjs'] = verify.digest(b'changed reader')
        with self.assertRaisesRegex(ValueError, 'Unexpected original web asset overrides'):
            self.check()

    def test_agp_gzip_rename_or_decompression_cannot_pass_bundle_verification(self):
        name = 'vendor/ocr/eng.traineddata.gz'
        original = gzip.compress(b'SYNTHETIC OCR LANGUAGE DATA', mtime=0)
        self.originals[name] = verify.digest(original)
        self.assets[name] = original
        self.report['assets'][name] = verify.digest(original)
        self.report['originalAssets'] += 1
        self.report['includedAssets'] += 1
        self.check()
        def merged(entries):
            content = entries.pop('base/assets/www/' + name)
            entries['base/assets/www/' + name[:-3]] = gzip.decompress(content)
        with self.assertRaisesRegex(ValueError, 'Missing or extra bundled assets'):
            self.check(merged)
        with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
            self.check(lambda entries: entries.update({'base/assets/www/' + name: gzip.decompress(original)}))

    def test_manifest_permissions_identity_and_debug_flags_are_checked(self):
        expected = {'applicationId': 'com.findr.play', 'versionCode': '1', 'versionName': '0.40.1-play.1'}
        xml = '''<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.findr.play" android:versionCode="1" android:versionName="0.40.1-play.1"><uses-sdk android:minSdkVersion="26" android:targetSdkVersion="36"/><uses-permission android:name="android.permission.INTERNET"/><application android:allowBackup="false" android:usesCleartextTraffic="false"/></manifest>'''
        self.assertEqual(verify.verify_manifest(xml, expected)['targetSdk'], 36)
        for changed in [xml.replace('com.findr.play', 'com.findr.app'), xml.replace('android.permission.INTERNET', 'android.permission.MANAGE_EXTERNAL_STORAGE'),
                        xml.replace('<application ', '<application android:debuggable="true" '), xml.replace('targetSdkVersion="36"', 'targetSdkVersion="35"')]:
            with self.assertRaises(ValueError): verify.verify_manifest(changed, expected)

    def test_unsigned_has_no_signature_success_claim(self):
        result = verify.signature_status(Path('not-needed-for-unsigned.aab'), ['BundleConfig.pb'])
        self.assertEqual(result['status'], 'unsigned')
        self.assertFalse(result['verified'])

    def test_review_draft_requires_bundled_metadata_and_explicit_verification_mode(self):
        review = {'releaseConfigurationReady': False, 'reviewOnly': True}
        self.assertFalse(verify.signed_readiness_allowed(review))
        self.assertTrue(verify.signed_readiness_allowed(review, True))
        self.assertFalse(verify.signed_readiness_allowed({'releaseConfigurationReady': False, 'reviewOnly': False}, True))
        self.assertFalse(verify.signed_readiness_allowed({'releaseConfigurationReady': True, 'reviewOnly': True}, True))
        self.assertTrue(verify.signed_readiness_allowed({'releaseConfigurationReady': True, 'reviewOnly': False}))
        self.report['reviewOnly'] = True
        with self.assertRaisesRegex(ValueError, 'review-only mode differs'):
            self.check()

    def test_matching_review_metadata_remains_not_distribution_ready(self):
        self.report['reviewOnly'] = True
        config = json.loads(self.assets['play-config.json'])
        config['reviewOnly'] = True
        self.assets['play-config.json'] = json.dumps(config).encode()
        self.report['assets']['play-config.json'] = verify.digest(self.assets['play-config.json'])
        result = self.check()
        self.assertTrue(result['reviewOnly'])
        self.assertFalse(result['releaseConfigurationReady'])

    def test_existing_preview_signing_certificate_is_rejected(self):
        certificate = b'SYNTHETIC TEST CERTIFICATE'
        pem = '-----BEGIN CERTIFICATE-----\n' + base64.b64encode(certificate).decode() + '\n-----END CERTIFICATE-----'
        results = [subprocess.CompletedProcess([], 4, 'jar verified.\n', ''), subprocess.CompletedProcess([], 0, pem, '')]
        with patch.object(verify, 'PREVIEW_CERTIFICATE_SHA256', verify.digest(certificate)), patch.object(verify.subprocess, 'run', side_effect=results):
            with self.assertRaisesRegex(ValueError, 'Preview signing key'):
                verify.signature_status(Path('synthetic.aab'), ['META-INF/KEY.RSA'])


class StagingGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.project = Path(self.temp.name)
        self.root = self.project / 'android-play'
        source = self.project / 'public/app'
        source.mkdir(parents=True)
        self.root.mkdir()
        (source / 'version.mjs').write_text("export const APP_VERSION = '0.40.1';\n")
        (source / 'untouched.txt').write_text('source remains unchanged')
        (self.root / 'play-release.properties').write_text('applicationId=com.findr.play\nwebVersion=0.40.1\nversionName=0.40.1-play.1\n')
        self.patch_root = patch.object(prepare, 'ROOT', self.root)
        self.patch_project = patch.object(prepare, 'PROJECT', self.project)
        self.patch_root.start(); self.patch_project.start()
        self.environment = patch.dict(os.environ, {}, clear=True)
        self.environment.start()

    def tearDown(self):
        self.environment.stop(); self.patch_project.stop(); self.patch_root.stop(); self.temp.cleanup()

    def test_output_cannot_replace_web_source_or_preview_project(self):
        for path in [self.project / 'public/app', self.project / 'android/build', self.root / '../escape']:
            with self.subTest(path=path), self.assertRaisesRegex(ValueError, 'generated app/build'):
                prepare.prepare(path)
        self.assertEqual((self.project / 'public/app/untouched.txt').read_text(), 'source remains unchanged')

    def test_public_endpoints_reject_private_hosts_and_embedded_credentials(self):
        for url in ['https://127.0.0.1/reports', 'https://[::1]/reports', 'https://app.local/reports', 'http://example.com/reports', 'https://user:secret@example.com/reports']:
            self.assertFalse(prepare.public_https(url), url)
        self.assertTrue(prepare.public_https('https://github.com/william2535/Findr/blob/release/play-store/docs/play-store/PRIVACY-POLICY.md'))

    def test_preview_identity_cannot_be_used_accidentally(self):
        file = self.root / 'play-release.properties'
        file.write_text(file.read_text().replace('com.findr.play', 'com.findr.app'))
        with self.assertRaisesRegex(ValueError, 'preview package identity'):
            prepare.prepare(self.root / 'app/build/generated/playAssets')

    def test_missing_or_invalid_release_configuration_fails_before_copy(self):
        output = self.root / 'app/build/generated/playAssets'
        with self.assertRaisesRegex(ValueError, 'Release configuration missing'):
            prepare.prepare(output, release=True)
        with patch.dict(os.environ, {'FINDR_PLAY_PRIVACY_URL': 'https://user:password@example.com/privacy'}):
            with self.assertRaisesRegex(ValueError, 'Invalid public HTTPS'):
                prepare.prepare(output)
        self.assertFalse(output.exists())

    def test_review_mode_cannot_be_combined_with_distribution_release(self):
        with self.assertRaisesRegex(ValueError, 'mutually exclusive'):
            prepare.prepare(self.root / 'app/build/generated/playAssets', release=True, review_only=True)


if __name__ == '__main__':
    unittest.main()

#!/usr/bin/env python3
"""Fail closed before signing: verify owner config, live policy/report service and upload identity."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import urljoin
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('prepare_assets', ROOT / 'scripts/prepare-assets.py')
assets = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assets)


def check():
    settings = assets.release_settings()
    privacy = os.environ.get('FINDR_PLAY_PRIVACY_URL') or settings.get('privacyUrl', '')
    reports = os.environ.get('FINDR_PLAY_REPORT_URL', '')
    if not assets.public_https(privacy) or not assets.public_https(reports):
        raise ValueError('A public HTTPS privacy policy and deployed /reports endpoint are required.')
    if not reports.endswith('/reports'): raise ValueError('The report endpoint must end in /reports.')
    if os.environ.get('FINDR_PLAY_READINESS_CONFIRMED') != 'yes':
        raise ValueError('Finish the Play readiness review, including a real in-app test report and rights review, before signing.')
    with urllib.request.urlopen(urllib.request.Request(privacy, headers={'User-Agent':'FINDR Play release check'}), timeout=30) as response:
        if response.status != 200 or 'text/html' not in response.headers.get('Content-Type', ''):
            raise ValueError('Privacy policy must be a public HTML page.')
        policy = response.read(2 * 1024 * 1024).decode('utf-8', errors='replace')
        contact = os.environ.get('FINDR_PLAY_SUPPORT_EMAIL') or settings.get('supportEmail', '')
        if not contact or contact.casefold() not in policy.casefold(): raise ValueError('Privacy page does not contain the configured support contact.')
    with urllib.request.urlopen(urljoin(reports, 'health'), timeout=30) as response:
        health = json.load(response)
        if response.status != 200 or health.get('ready') is not True or health.get('applicationId') != settings['applicationId']:
            raise ValueError('Reporting service is not ready for this application ID.')
    required = ['FINDR_PLAY_KEYSTORE','FINDR_PLAY_STORE_PASSWORD','FINDR_PLAY_KEY_ALIAS','FINDR_PLAY_KEY_PASSWORD']
    if not all(os.environ.get(name) for name in required): raise ValueError('Upload keystore environment is incomplete.')
    key = Path(os.environ[required[0]])
    if not key.is_absolute() or not key.is_file(): raise ValueError('Upload keystore must be an existing absolute private path.')
    result = subprocess.run(['keytool','-exportcert','-keystore',str(key),'-storepass:env','FINDR_PLAY_STORE_PASSWORD','-alias',os.environ['FINDR_PLAY_KEY_ALIAS']],capture_output=True,check=True)
    fingerprint = hashlib.sha256(result.stdout).hexdigest()
    if fingerprint == '6075a73725dac5a3cc1f7b6b32c5e1df907cd1ca4b5b611f4c1c1d2fd502fefd':
        raise ValueError('The preview signing identity must never sign the Play edition.')
    print(json.dumps({'configurationCheck':'passed','applicationId':settings['applicationId'],'policyPublicHtml':True,'reportServiceReady':True,'uploadCertificateSha256':fingerprint,'note':'Health checks do not replace the required real-device report and Play pre-launch tests.'},indent=2))


if __name__ == '__main__':
    check()

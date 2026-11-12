#!/usr/bin/env python3
"""Package the actual FINDR browser app for a GitHub Pages project path.

Uses only Python's standard library. Source files and the Sites build stay intact.
Server-only routes remain on the explicitly configured FINDR API origin.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from urllib.parse import urlsplit

FORMAT = 'findr-github-pages-v1'
DEFAULT_SITE = 'https://william2535.github.io/Findr/'
DEFAULT_API = 'https://findr-fault-finder.floodyyy21.chatgpt.site'
NATIVE_ONLY = {'data/download-map.json'}
PRIVATE_SUFFIXES = {'.apk', '.aab', '.pdf', '.gguf', '.onnx', '.sqlite', '.sqlite3', '.db', '.pem', '.key', '.jks', '.keystore'}


def json_text(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n'


def validated_urls(site, api):
    parsed = urlsplit(site)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or parsed.query or parsed.fragment or not parsed.path.endswith('/')
            or any(segment in {'.', '..'} for segment in parsed.path.split('/'))
            or not re.fullmatch(r'/[A-Za-z0-9_./-]*', parsed.path)):
        raise ValueError('Site URL must be a plain HTTPS URL ending in /, with a safe project path.')
    backend = urlsplit(api)
    if (backend.scheme != 'https' or not backend.hostname or backend.username or backend.password
            or backend.path not in {'', '/'} or backend.query or backend.fragment):
        raise ValueError('API origin must be a plain HTTPS origin, without credentials or a path.')
    if api.rstrip('/') != DEFAULT_API:
        raise ValueError('This FINDR runtime only supports its verified API origin: ' + DEFAULT_API)
    return site, api.rstrip('/'), parsed.path + 'app/'


def copy_tree(source, target, excluded=frozenset()):
    if not source.is_dir():
        return
    for file in sorted(source.rglob('*')):
        relative = file.relative_to(source)
        if file.is_symlink():
            raise ValueError(f'Symlinks are not permitted in the Pages artifact: {relative}')
        if not file.is_file() or relative.as_posix() in excluded:
            continue
        if any(part.startswith('.') for part in relative.parts) or file.suffix.lower() in PRIVATE_SUFFIXES:
            raise ValueError(f'Unexpected private/downloaded/build file in public assets: {relative}')
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(file, destination)


def precache(app, version):
    files = sorted(file for file in app.rglob('*') if file.is_file()
                   and file.name not in {'sw.js', 'precache.js', 'download-map.json'})
    digest = hashlib.sha256()
    hashes = {}
    total = 0
    for file in files:
        relative = file.relative_to(app).as_posix()
        content = file.read_bytes()
        digest.update(relative.encode() + b'\0')
        digest.update(content)
        hashes['./' + relative] = hashlib.sha256(content).hexdigest()
        total += len(content)
    digest.update(b'sw.js\0')
    digest.update((app / 'sw.js').read_bytes())
    build = digest.hexdigest()[:12]
    (app / 'precache.js').write_text(
        'self.__APP_VERSION=' + json.dumps(version) + ';self.__BUILD=' + json.dumps(build)
        + ';self.__PRECACHE=' + json.dumps(list(hashes)) + ';self.__ASSET_SHA256='
        + json.dumps(hashes, separators=(',', ':')) + ';', encoding='utf-8')
    return {'build': build, 'assets': len(files), 'bytes': total}


def build_pages(source, output, site_url, api_origin, revision):
    source, output = source.resolve(), output.absolute()
    if output.is_symlink():
        raise ValueError('Output must not be a symlink.')
    output = output.resolve()
    public = source / 'public'
    site_url, api_origin, app_path = validated_urls(site_url, api_origin)
    if output.is_symlink() or output == source or output in source.parents or output.is_relative_to(public):
        raise ValueError('Output must be a separate generated directory, outside public/.')
    marker = output / '.findr-pages-output.json'
    if output.exists() and (not marker.is_file() or json.loads(marker.read_text()).get('format') != FORMAT):
        raise ValueError('Refusing to replace an output directory without the FINDR Pages build marker.')
    app_source = public / 'app'
    for name in ['app.mjs', 'sw.js', 'version.mjs', 'index.html', 'manifest.webmanifest', 'deployment-config.mjs']:
        if not (app_source / name).is_file():
            raise ValueError(f'Missing browser source: public/app/{name}')
    match = re.search(r"APP_VERSION\s*=\s*['\"]([0-9]+\.[0-9]+\.[0-9]+)['\"]", (app_source / 'version.mjs').read_text())
    if not match:
        raise ValueError('Cannot read the application release version.')
    version = match.group(1)
    output.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='.findr-pages-', dir=output.parent))
    try:
        app = stage / 'app'
        copy_tree(app_source, app, NATIVE_ONLY)
        for folder in ['share', 'demos']:
            copy_tree(public / folder, stage / folder)
        favicon = public / 'favicon.png'
        if favicon.is_file() and not favicon.is_symlink():
            shutil.copyfile(favicon, stage / 'favicon.png')
        (app / 'deployment-config.mjs').write_text(
            '// Generated for this GitHub Pages deployment; no keys or user data.\n'
            + 'export const APP_BASE_PATH=' + json.dumps(app_path) + ';\n'
            + 'export const RELEASE_BASE_URL=' + json.dumps(site_url) + ';\n'
            + 'export const API_ORIGIN=' + json.dumps(api_origin) + ';\n', encoding='utf-8')
        manifest = json.loads((app / 'manifest.webmanifest').read_text())
        manifest.update({'id': app_path, 'start_url': './', 'scope': './'})
        (app / 'manifest.webmanifest').write_text(json_text(manifest), encoding='utf-8')
        html = (app / 'index.html').read_text()
        html = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="' + site_url + 'app/">', html)
        html = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + site_url + 'app/' + m.group(2), html)
        html = html.replace(DEFAULT_API + '/share/', site_url + 'share/')
        (app / 'index.html').write_text(html, encoding='utf-8')
        # Keep update discovery outside the worker's /<repository>/app/ scope.
        (stage / 'app-release.json').write_text(json_text({'version': version}), encoding='utf-8')
        (stage / '.nojekyll').write_text('', encoding='utf-8')
        (stage / 'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#000000"><title>FINDR</title><style>body{background:#000;color:#ffe03e;font:18px system-ui;padding:32px}a{color:inherit}</style><a href="./app/">Open FINDR</a><script>location.replace('./app/'+location.search+location.hash)</script></html>\n''', encoding='utf-8')
        details = {'format': FORMAT, 'version': version, 'sourceRevision': revision,
                   'siteUrl': site_url, 'appPath': app_path, 'apiOrigin': api_origin,
                   'offline': precache(app, version),
                   'excluded': ['public/app/data/download-map.json', 'public/releases/', 'source/private files outside public assets']}
        (stage / '.findr-pages-output.json').write_text(json_text(details), encoding='utf-8')
        # GitHub Pages has a 1GB site limit; keep a conservative margin.
        total = sum(p.stat().st_size for p in stage.rglob('*') if p.is_file())
        if total >= 900 * 1024 * 1024:
            raise ValueError('Pages artifact exceeds the 900 MiB safety budget.')
        if output.exists():
            shutil.rmtree(output)
        stage.rename(output)
        return {**details, 'output': str(output), 'totalBytes': total}
    except BaseException:
        shutil.rmtree(stage, ignore_errors=True)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output', type=Path)
    parser.add_argument('--site-url', default=DEFAULT_SITE)
    parser.add_argument('--api-origin', default=DEFAULT_API)
    parser.add_argument('--source-revision')
    args = parser.parse_args()
    revision = args.source_revision
    if not revision:
        try:
            revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=args.source_root, text=True, stderr=subprocess.DEVNULL).strip()
        except (OSError, subprocess.CalledProcessError):
            revision = 'source-export'
    if not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}', revision):
        raise ValueError('Invalid source revision label.')
    print(json.dumps(build_pages(args.source_root, args.output or args.source_root / 'out/github-pages', args.site_url, args.api_origin, revision)))


if __name__ == '__main__':
    main()

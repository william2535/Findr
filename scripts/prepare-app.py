"""Prepare FINDR app icons, public share card and offline asset manifest."""
from pathlib import Path
import json
import hashlib
import re
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
public = root / 'public'
p = public / 'app'
version = re.search(r"APP_VERSION = '([^']+)'", (p / 'version.mjs').read_text()).group(1)
# The static shell and practice metadata share the release identifier.
shell_path = p / 'index.html'
shell = shell_path.read_text()
shell = re.sub(r'findr-release-\d+\.\d+\.\d+\.png', 'findr-release-' + version + '.png', shell)
shell = re.sub(r'(FINDR <span class="muted">/</span> )\d+\.\d+\.\d+', lambda match: match.group(1) + version, shell)
shell_path.write_text(shell)
practice_path = p / 'data/practice.json'
practice_path.write_text(re.sub(r'("version"\s*:\s*")\d+\.\d+\.\d+(\")', lambda match: match.group(1) + version + match.group(2), practice_path.read_text(), count=1))

# Generated training maps are shipped to phones and inside the hosting archive.
# Compact their whitespace without changing any menu, source or lesson value.
# This retains the historical Android downloads within the hosting size limit.
training_data = sorted((p / 'data/menu-maps').glob('*.json')) + [
    p / 'data' / (name + '.json')
    for name in ['practice', 'gent-vigilon', 'gent-lessons', 'gent-nano', 'gent-nano-lessons', 'conventional-fire', 'wiring-diagrams', 'wiring-packs', 'xfp', 'xfp-lessons', 'twinflex', 'twinflex-lessons', 'fire-service-manuals']
    if (p / 'data' / (name + '.json')).is_file()
]
training_bytes_before = sum(file.stat().st_size for file in training_data)
for file in training_data:
    original_data = json.loads(file.read_text())
    compact = json.dumps(original_data, ensure_ascii=False, separators=(',', ':')) + '\n'
    assert json.loads(compact) == original_data, 'Training-data compaction changed a value'
    file.write_text(compact)
print('Training data:', len(training_data), 'files,', training_bytes_before - sum(file.stat().st_size for file in training_data), 'whitespace bytes removed')
(p / 'icons').mkdir(exist_ok=True)
master = Image.open(root / 'branding/findr-manual-hunt-master.png').convert('RGB')
background = master.getpixel((0, 0))
for size in [48, 180, 192, 512]:
    master.resize((size, size), Image.Resampling.LANCZOS).save(p / f'icons/icon-{size}.png', optimize=True)

# Dedicated maskable images keep the mark inside circular launcher masks.
for size in [192, 512]:
    safe = Image.new('RGB', (size, size), background)
    inner = round(size * .72)
    safe.paste(master.resize((inner, inner), Image.Resampling.LANCZOS), ((size-inner)//2, (size-inner)//2))
    safe.save(p / f'icons/icon-maskable-{size}.png', optimize=True)
master.resize((48, 48), Image.Resampling.LANCZOS).save(public / 'favicon.png', optimize=True)
for obsolete in [p / 'icons/icon.svg', public / 'favicon.svg']:
    if obsolete.exists():
        obsolete.unlink()
manifest = {
    'name': 'FINDR — Fire & Security Field Kit', 'short_name': 'FINDR',
    'id': '/app/', 'start_url': './', 'scope': './', 'display': 'standalone',
    'background_color': '#000000', 'theme_color': '#000000',
    'description': 'Saved Panel Pals, offline manual packs, cited questions and fault investigations, keypad emulators and sourced menu maps.',
    'icons': [
        {'src': f'./icons/icon-{size}.png', 'sizes': f'{size}x{size}', 'type': 'image/png', 'purpose': 'any'}
        for size in [192, 512]
    ] + [
        {'src': './icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}
    ]
}
(p / 'manifest.webmanifest').write_text(json.dumps(manifest, indent=2) + '\n')

# Compose a share card from the approved mark and deterministic live text.
(public / 'share').mkdir(exist_ok=True)
card = Image.new('RGB', (1200, 630), background)
draw = ImageDraw.Draw(card)
font_root = Path('/usr/share/fonts/truetype/dejavu')
def font(size, bold=False):
    return ImageFont.truetype(str(font_root / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')), size)
card.paste(master.resize((350, 350), Image.Resampling.LANCZOS), (32, 108))
draw.text((405, 95), 'findr', font=font(142, True), fill='#090909', stroke_width=1)
draw.text((414, 281), 'Find the manual.', font=font(43, True), fill='#090909')
draw.text((414, 337), 'Follow the evidence.', font=font(43, True), fill='#090909')
draw.line((62, 497, 1138, 497), fill='#15130a', width=2)
draw.text((65, 526), 'MANUALS  /  PANEL PALS  /  EMULATORS', font=font(24, True), fill='#090909')
draw.text((65, 570), 'PUBLIC BETA  •  WEB + ANDROID  •  ' + version, font=font(18), fill='#29220c')
card.save(public / ('share/findr-release-' + version + '.png'), optimize=True)

files = sorted(x for x in p.rglob('*') if x.is_file() and x.name not in ['sw.js', 'precache.js', 'download-map.json'])
digest = hashlib.sha256()
asset_hashes = {}
for file in files:
    relative_path = file.relative_to(p).as_posix()
    content = file.read_bytes()
    digest.update(relative_path.encode() + b'\0')
    digest.update(content)
    asset_hashes['./' + relative_path] = hashlib.sha256(content).hexdigest()
# A worker-only fix must also invalidate the previous offline cache. The
# worker itself stays outside the precache to avoid caching its update request.
digest.update(b'sw.js\0')
digest.update((p / 'sw.js').read_bytes())
(p / 'precache.js').write_text('self.__APP_VERSION=' + json.dumps(version) + ';self.__BUILD=' + json.dumps(digest.hexdigest()[:12]) + ';self.__PRECACHE=' + json.dumps(list(asset_hashes)) + ';self.__ASSET_SHA256=' + json.dumps(asset_hashes, separators=(',', ':')) + ';')
print('Offline app:', len(files), 'assets', sum(x.stat().st_size for x in files), 'bytes', digest.hexdigest()[:12])

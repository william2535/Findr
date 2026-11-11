#!/usr/bin/env python3
"""Build the dependency-free preview APK with Android SDK platform/build-tools 35."""
from pathlib import Path
import subprocess,shutil,sys,zipfile,os,re,tempfile,hashlib,json
root=Path(__file__).resolve().parent;project=root.parent
release_source=(project/'public/app/version.mjs').read_text()
version=re.search(r"APK_VERSION = '([^']+)'",release_source).group(1)
version_code=re.search(r'ANDROID_VERSION_CODE = (\d+)',release_source).group(1)
manifest=(root/'AndroidManifest.xml').read_text()
assert 'android:versionName="'+version+'"' in manifest,'Android manifest version differs from the web release'
assert 'android:versionCode="'+version_code+'"' in manifest,'Android version code differs from release metadata'
sdk=Path(os.environ.get('FINDR_ANDROID_SDK',os.environ.get('ANDROID_SDK_ROOT',str(Path.home()/'Android/Sdk'))))
bt=sdk/'build-tools/35.0.0';jar=sdk/'platforms/android-35/android.jar'
assert jar.exists() and (bt/'apksigner').exists(),'Set FINDR_ANDROID_SDK to Android SDK platform/build-tools 35'
assert (root/'preview.keystore').exists(),'The existing signing key is required; never generate a replacement for an app update'
# A fresh package directory prevents aapt from retaining obsolete assets from
# an earlier resources.apk when a release moves or removes a source file.
build_root=root/'build';build_root.mkdir(parents=True,exist_ok=True)
build_workspace=tempfile.TemporaryDirectory(prefix='findr-',dir=build_root)
build=Path(build_workspace.name)
for name in ['classes','dex']: (build/name).mkdir(parents=True,exist_ok=True)
def copy_source(source,destination):
    # Read the authored bytes explicitly, including edits in layered workspaces.
    Path(destination).write_bytes(Path(source).read_bytes())
    return str(destination)
asset_root=build/'assets/www'
if asset_root.exists():shutil.rmtree(asset_root)
shutil.copytree(project/'public/app',asset_root,copy_function=copy_source)
copy_source(project/'public/app/icons/icon-maskable-192.png',root/'res/drawable/icon.png')
def run(args):subprocess.run([str(a) for a in args],check=True,cwd=root)
run(['java','-m','jdk.compiler/com.sun.tools.javac.Main','-source','8','-target','8','-bootclasspath',str(jar)+os.pathsep+str(bt/'core-lambda-stubs.jar'),'-d',build/'classes',root/'src/com/findr/app/MainActivity.java'])
run(['bash',bt/'d8','--lib',jar,'--min-api','26','--output',build/'dex',*list((build/'classes').rglob('*.class'))])
# aapt's legacy asset-name validator rejects some original long wiring-image
# filenames. Compile Android resources normally, then preserve web asset paths
# verbatim as ZIP entries before alignment/signing (AssetManager uses these).
run([bt/'aapt','package','-f','-M',root/'AndroidManifest.xml','-S',root/'res','-I',jar,'-F',build/'resources.apk'])
with zipfile.ZipFile(build/'resources.apk','a',zipfile.ZIP_DEFLATED) as z:
    z.write(build/'dex/classes.dex','classes.dex')
    for asset in sorted(asset_root.rglob('*')):
        if asset.is_file():z.write(asset,'assets/www/'+asset.relative_to(asset_root).as_posix())
run([bt/'zipalign','-f','4',build/'resources.apk',build/'aligned.apk'])
key=root/'preview.keystore'
out=project/('artifacts/FINDR-'+version+'.apk');out.parent.mkdir(exist_ok=True)
run(['bash',bt/'apksigner','sign','--ks',key,'--ks-key-alias','findr-preview','--ks-pass','pass:android','--key-pass','pass:android','--out',out,build/'aligned.apk'])
run(['bash',bt/'apksigner','verify','--verbose','--print-certs',out])
verification=subprocess.check_output(['bash',str(bt/'apksigner'),'verify','--print-certs',str(out)],text=True)
assert '6075a73725dac5a3cc1f7b6b32c5e1df907cd1ca4b5b611f4c1c1d2fd502fefd' in verification,'Signing identity changed; this APK cannot update existing installations'
run([bt/'zipalign','-c','4',out])
with zipfile.ZipFile(out) as package:
    expected={str(file.relative_to(project/'public/app')):file for file in (project/'public/app').rglob('*') if file.is_file()}
    included={name.removeprefix('assets/www/'):name for name in package.namelist() if name.startswith('assets/www/') and not name.endswith('/')}
    assert included.keys()==expected.keys(),'APK assets differ from the current application file list'
    for name,file in expected.items():assert package.read(included[name])==file.read_bytes(),'APK asset differs: '+name
# Large complete APKs are distributed as exact-version GitHub release assets.
# The separate web build gate still enforces its 25 MiB static-file limit.
assert out.stat().st_size < 100*1024*1024,'APK exceeds the source-repository single-file limit'
digest=hashlib.sha256(out.read_bytes()).hexdigest()
out.with_suffix('.apk.sha256').write_text(digest+'  '+out.name+'\n')
print('SHA256:',digest)
print('Hosting:', 'GitHub release asset required' if out.stat().st_size>25*1024*1024 else 'static download supported')
print('APK:',out,'bytes:',out.stat().st_size)

#!/usr/bin/env python3
"""Build the dependency-free preview APK with Android SDK platform/build-tools 35."""
from pathlib import Path
import subprocess,shutil,sys,zipfile,os,re,tempfile
root=Path(__file__).resolve().parent;project=root.parent
release_source=(project/'public/app/version.mjs').read_text()
version=re.search(r"APP_VERSION = '([^']+)'",release_source).group(1)
version_code=re.search(r'ANDROID_VERSION_CODE = (\d+)',release_source).group(1)
manifest=(root/'AndroidManifest.xml').read_text()
assert 'android:versionName="'+version+'"' in manifest,'Android manifest version differs from the web release'
assert 'android:versionCode="'+version_code+'"' in manifest,'Android version code differs from release metadata'
sdk=Path(os.environ.get('FINDR_ANDROID_SDK',str(Path('/workspace/scratch/37b9497fd486/android-sdk'))))
bt=sdk/'build-tools/35.0.0';jar=sdk/'platforms/android-35/android.jar'
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
run([bt/'aapt','package','-f','-M',root/'AndroidManifest.xml','-S',root/'res','-A',build/'assets','-I',jar,'-F',build/'resources.apk'])
with zipfile.ZipFile(build/'resources.apk','a',zipfile.ZIP_DEFLATED) as z:z.write(build/'dex/classes.dex','classes.dex')
run([bt/'zipalign','-f','4',build/'resources.apk',build/'aligned.apk'])
key=root/'preview.keystore'
if not key.exists():run(['keytool','-genkeypair','-keystore',key,'-alias','findr-preview','-keyalg','RSA','-keysize','2048','-validity','10000','-storepass','android','-keypass','android','-dname','CN=FINDR Preview, O=Development, C=GB'])
out=project/('artifacts/FINDR-'+version+'.apk');out.parent.mkdir(exist_ok=True)
run(['bash',bt/'apksigner','sign','--ks',key,'--ks-key-alias','findr-preview','--ks-pass','pass:android','--key-pass','pass:android','--out',out,build/'aligned.apk'])
run(['bash',bt/'apksigner','verify','--verbose',out])
with zipfile.ZipFile(out) as package:
    expected={str(file.relative_to(project/'public/app')):file for file in (project/'public/app').rglob('*') if file.is_file()}
    included={name.removeprefix('assets/www/'):name for name in package.namelist() if name.startswith('assets/www/') and not name.endswith('/')}
    assert included.keys()==expected.keys(),'APK assets differ from the current application file list'
    for name,file in expected.items():assert package.read(included[name])==file.read_bytes(),'APK asset differs: '+name
assert out.stat().st_size<=25*1024*1024,'APK exceeds the hosting limit of 25 MiB per static file'
print('APK:',out,'bytes:',out.stat().st_size)

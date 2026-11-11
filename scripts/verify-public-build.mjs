// Verify the public files that are copied unchanged into FINDR's web release.
// These three directories are owned wholly by public/, so generated leftovers
// in them are not application build outputs and must not enter a deployment.
import {readdirSync,readFileSync,existsSync,rmSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,relative} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  ARCHIVED_RELEASE_FILES, RETAINED_APK_VERSIONS, RETAINED_RELEASE_FILES,
  EXTERNAL_RELEASES, EXTERNAL_RELEASE_FILES, releaseFileDisposition,
} from '../lib/release-downloads.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const publicRoot=join(root,'public'),output=join(root,'dist/client');
// Android reads this index from its bundled assets. The web relay compiles its
// separate lib/download-map.json allowlist; browser code and precache omit it.
const nativeOnlyFiles=new Set(['app/data/download-map.json']);
const archivedReleaseFiles=new Set(ARCHIVED_RELEASE_FILES.map(name=>`releases/${name}`));
const externalReleaseFiles=new Set(EXTERNAL_RELEASE_FILES.map(name=>`releases/${name}`));
const excludedFiles=new Set([...nativeOnlyFiles,...archivedReleaseFiles,...externalReleaseFiles]);
function files(directory){
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const path=join(directory,entry.name);
    return entry.isDirectory()?files(path):entry.isFile()?[path]:[];
  });
}
// Fail closed if a future release has not updated its explicit retention and
// compatibility policy. Never remove source artifacts to satisfy this gate.
assert.equal(new Set(RETAINED_APK_VERSIONS).size,2,'Retain exactly two distinct APK versions');
assert.equal(new Set([...RETAINED_RELEASE_FILES,...ARCHIVED_RELEASE_FILES]).size,
  RETAINED_RELEASE_FILES.length+ARCHIVED_RELEASE_FILES.length,'Release policies overlap');
for(const path of files(join(publicRoot,'releases'))){
  const name=relative(join(publicRoot,'releases'),path);
  assert.ok(releaseFileDisposition(name),`Release file needs an explicit deployment policy: ${name}`);
}
for(const name of [...RETAINED_RELEASE_FILES,...ARCHIVED_RELEASE_FILES]){
  if(EXTERNAL_RELEASE_FILES.includes(name))continue;
  assert.ok(existsSync(join(publicRoot,'releases',name)),`Missing source release artifact: ${name}`);
}
for(const name of ARCHIVED_RELEASE_FILES){
  assert.ok(existsSync(join(root,'app/releases',name,'route.ts')),`Missing archived release handler: ${name}`);
}
const externalReleaseVerification=[];
for(const name of EXTERNAL_RELEASE_FILES){
  assert.ok(RETAINED_RELEASE_FILES.includes(name),`External release is not current or previous: ${name}`);
  assert.ok(name.endsWith('.apk'),`Only an APK binary may use external hosting: ${name}`);
  assert.ok(existsSync(join(root,'app/releases',name,'route.ts')),`Missing external release handler: ${name}`);
  const release=EXTERNAL_RELEASES.find(release=>release.apkFile===name);
  assert.ok(release,`Missing external release URL: ${name}`);
  assert.equal(release.url,`https://github.com/william2535/Findr/releases/download/android-v${release.version}/${name}`,`Unexpected external release URL: ${name}`);
  const checksum=readFileSync(join(publicRoot,'releases',name+'.sha256'),'utf8').trim().split(/\s+/);
  assert.equal(checksum.length,2,`Invalid external release checksum record: ${name}`);
  assert.match(checksum[0],/^[a-f0-9]{64}$/,`Invalid external release checksum: ${name}`);
  assert.equal(checksum[1]?.replace(/^\*/,''),name,`External release checksum names another artifact: ${name}`);
  const apk=join(publicRoot,'releases',name),localCopy=existsSync(apk);
  if(localCopy){
    const hash=createHash('sha256').update(readFileSync(apk)).digest('hex');
    assert.equal(hash,checksum[0],`External release checksum differs from source APK: ${name}`);
  }
  externalReleaseVerification.push({filename:name,sha256:checksum[0],localCopy,localBytesVerified:localCopy});
}
let removed=0;
for(const name of ['app','releases','share']){
  const sourceDirectory=join(publicRoot,name),targetDirectory=join(output,name);
  assert.ok(existsSync(targetDirectory),`Missing web output: ${name}`);
  const expected=new Set(files(sourceDirectory).filter(path=>!excludedFiles.has(relative(publicRoot,path))).map(path=>relative(sourceDirectory,path)));
  for(const path of files(targetDirectory)){
    if(!expected.has(relative(targetDirectory,path))){rmSync(path);removed++;}
  }
}
// Sites enforces this limit per static asset, independently of the archive
// total. Check generated client files as well as copied public files, after
// deployment-only exclusions have been removed. Source archives stay intact.
const maxStaticAssetBytes=25*1024*1024;
let largestStaticAssetBytes=0;
for(const path of files(output)){
  const size=statSync(path).size;
  assert.ok(size<=maxStaticAssetBytes,
    `Static asset exceeds 25 MiB limit: ${relative(output,path)} (${size} bytes; maximum ${maxStaticAssetBytes})`);
  largestStaticAssetBytes=Math.max(largestStaticAssetBytes,size);
}
const sourceFiles=files(publicRoot).filter(path=>!excludedFiles.has(relative(publicRoot,path)));
for(const path of sourceFiles){
  const name=relative(publicRoot,path),target=join(output,name);
  assert.ok(existsSync(target),`Missing public asset: ${name}`);
  assert.ok(readFileSync(path).equals(readFileSync(target)),`Public asset differs: ${name}`);
}
const bytes=files(join(root,'dist')).reduce((sum,path)=>sum+statSync(path).size,0);
// Leave room for tar headers/padding as well as the actual asset bytes.
const archiveAllowance=1024*1024;
assert.ok(bytes+archiveAllowance<256*1024*1024,`Build output leaves insufficient archive headroom: ${bytes} bytes`);
for(const name of nativeOnlyFiles)assert.ok(!existsSync(join(output,name)),`Native-only index leaked into web output: ${name}`);
for(const name of archivedReleaseFiles)assert.ok(!existsSync(join(output,name)),`Archived release leaked into web output: ${name}`);
for(const name of externalReleaseFiles)assert.ok(!existsSync(join(output,name)),`Externally hosted release leaked into web output: ${name}`);
const archivedReleaseBytes=ARCHIVED_RELEASE_FILES.reduce((sum,name)=>sum+statSync(join(publicRoot,'releases',name)).size,0);
console.log(JSON.stringify({publicFiles:sourceFiles.length,nativeOnlyFilesExcluded:[...nativeOnlyFiles],retainedApkVersions:RETAINED_APK_VERSIONS,externalReleaseFilesExcluded:EXTERNAL_RELEASE_FILES,externalReleaseVerification,archivedReleaseFilesExcluded:ARCHIVED_RELEASE_FILES.length,archivedReleaseBytes,orphanFilesRemoved:removed,maxStaticAssetBytes,largestStaticAssetBytes,buildBytes:bytes,archiveAllowance,verified:true}));

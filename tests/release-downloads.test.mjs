import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { APK_VERSION } from '../public/app/version.mjs';
import {
  ARCHIVED_RELEASES, ARCHIVED_RELEASE_FILES, PREVIOUS_APK_VERSION,
  RETAINED_APK_VERSIONS, RETAINED_RELEASE_FILES,
  EXTERNAL_RELEASES, EXTERNAL_RELEASE_FILES, DEPLOYED_RELEASE_FILES,
  releaseFileDisposition, archivedReleaseResponse, externalReleaseResponse,
} from '../lib/release-downloads.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('current and previous artifacts retain explicit static or external deployment policies', () => {
  assert.deepEqual(RETAINED_APK_VERSIONS, [APK_VERSION, PREVIOUS_APK_VERSION]);
  assert.equal(new Set(RETAINED_APK_VERSIONS).size, 2);
  assert.equal(RETAINED_RELEASE_FILES.length, 4);
  for (const filename of RETAINED_RELEASE_FILES) {
    assert.equal(releaseFileDisposition(filename), EXTERNAL_RELEASE_FILES.includes(filename)?'external':'retained');
    assert.ok(!ARCHIVED_RELEASE_FILES.includes(filename));
  }
  for (const filename of ARCHIVED_RELEASE_FILES) assert.equal(releaseFileDisposition(filename), 'archived');
  const sourceFiles = readdirSync(join(root, 'public/releases')).sort();
  assert.deepEqual(sourceFiles.filter(name=>!EXTERNAL_RELEASE_FILES.includes(name)), [...DEPLOYED_RELEASE_FILES, ...ARCHIVED_RELEASE_FILES].sort());
  assert.ok(sourceFiles.every(name=>releaseFileDisposition(name)));
});

test('every historical source APK still matches its original checksum', () => {
  for (const release of ARCHIVED_RELEASES) {
    const checksum = readFileSync(join(root, 'public/releases', release.checksumFile), 'utf8').trim();
    const [expectedHash, originalFilename] = checksum.split(/\s+/);
    assert.equal(originalFilename.replace(/^\*/, ''), release.apkFile);
    const actualHash = createHash('sha256').update(readFileSync(join(root, 'public/releases', release.apkFile))).digest('hex');
    assert.equal(actualHash, expectedHash, `Archived source changed: ${release.apkFile}`);
  }
});

test('each archived APK and checksum returns an explicit 410 page with working current links', async () => {
  for (const release of ARCHIVED_RELEASES) {
    for (const filename of [release.apkFile, release.checksumFile]) {
      const response = archivedReleaseResponse(filename);
      assert.equal(response.status, 410);
      assert.match(response.headers.get('content-type'), /^text\/html; charset=utf-8$/);
      assert.equal(response.headers.get('content-disposition'), 'inline');
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('location'), null);
      const html = await response.text();
      assert.ok(html.includes(`<h1>FINDR ${release.version} is archived</h1>`));
      assert.ok(html.includes(filename));
      assert.ok(html.includes(`href="/releases/FINDR-${APK_VERSION}.apk"`));
      assert.ok(html.includes(`download="FINDR-${APK_VERSION}.apk"`));
      assert.ok(html.includes('href="/"'));
      assert.ok(existsSync(join(root, 'public/releases', `FINDR-${APK_VERSION}.apk`)) || EXTERNAL_RELEASE_FILES.includes(`FINDR-${APK_VERSION}.apk`));
      assert.ok(existsSync(join(root,'public/releases',`FINDR-${APK_VERSION}.apk.sha256`)));
      assert.doesNotMatch(html, /http-equiv\s*=\s*["']?refresh|<script/i);
      assert.equal(html.includes('older Android checksum'), filename === release.checksumFile);
    }
  }
});

test('HEAD preserves archive status and headers without returning a document body', async () => {
  for (const filename of ARCHIVED_RELEASE_FILES) {
    const get = archivedReleaseResponse(filename);
    const head = archivedReleaseResponse(filename, { head: true });
    assert.equal(head.status, get.status);
    assert.deepEqual([...head.headers], [...get.headers]);
    assert.equal(await head.text(), '');
  }
});

test('current, unknown and malformed filenames cannot masquerade as archived releases', async () => {
  const filenames = [
    ...RETAINED_RELEASE_FILES, '', 'FINDR-99.0.0.apk', 'FINDR-0.3.1.apk.sha256',
    '../FINDR-0.3.1.apk', '/releases/FINDR-0.3.1.apk', 'FINDR-0.3.1.apk?download',
    '<script>alert(1)</script>', '__proto__', undefined,
  ];
  for (const filename of filenames) {
    const response = archivedReleaseResponse(filename);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('location'), null);
    assert.equal(await response.text(), 'Release not found.');
    assert.equal((await archivedReleaseResponse(filename, { head: true }).text()), '');
  }
});

test('only exact archived or external paths have handlers and each serves its own version', async () => {
  const routeDirectories = readdirSync(join(root, 'app/releases')).sort();
  assert.deepEqual(routeDirectories, [...ARCHIVED_RELEASE_FILES,...EXTERNAL_RELEASE_FILES].sort());
  assert.ok(routeDirectories.every(name => !name.includes('[')));
  for (const filename of ARCHIVED_RELEASE_FILES) {
    const route = await import(pathToFileURL(join(root, 'app/releases', filename, 'route.ts')).href);
    const response = route.GET();
    const expected = archivedReleaseResponse(filename);
    assert.equal(response.status, 410);
    assert.equal(await response.text(), await expected.text(), `Incorrect handler: ${filename}`);
    assert.equal(route.HEAD().status, 410);
    assert.equal(await route.HEAD().text(), '');
  }
  for (const filename of DEPLOYED_RELEASE_FILES) {
    assert.ok(!existsSync(join(root, 'app/releases', filename)), `Static download is shadowed: ${filename}`);
  }
});

test('external APK GET and HEAD redirect only to the exact versioned GitHub asset',async()=>{
  for(const release of EXTERNAL_RELEASES){
    assert.ok(RETAINED_RELEASE_FILES.includes(release.apkFile));
    assert.ok(!DEPLOYED_RELEASE_FILES.includes(release.apkFile));
    assert.ok(DEPLOYED_RELEASE_FILES.includes(release.apkFile+'.sha256'));
    assert.match(release.sourceCommit,/^[a-f0-9]{40}$/);
  assert.equal(release.url,`https://raw.githubusercontent.com/william2535/Findr/${release.sourceCommit}/public/releases/${release.apkFile}`);
    const route=await import(pathToFileURL(join(root,'app/releases',release.apkFile,'route.ts')).href);
    for(const response of [externalReleaseResponse(release.apkFile),route.GET(),route.HEAD()]){
      assert.equal(response.status,307);assert.equal(response.headers.get('location'),release.url);
      assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(await response.text(),'');
    }
  }
});

test('external release redirect never accepts unknown files, a checksum, traversal or arbitrary URLs',()=>{
  for(const name of ['',undefined,'__proto__','FINDR-0.14.1.apk','FINDR-99.0.0.apk','FINDR-0.37.0.apk.sha256','../FINDR-0.37.0.apk','FINDR-0.37.0.apk?target=https://example.invalid','https://example.invalid/app.apk']){
    const response=externalReleaseResponse(name);assert.equal(response.status,404);assert.equal(response.headers.get('location'),null);
  }
});

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'findr-release-policy-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const write = (name, contents) => {
    const path = join(directory, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  };
  for (const filename of ['scripts/verify-public-build.mjs', 'lib/release-downloads.mjs', 'public/app/version.mjs']) {
    write(filename, readFileSync(join(root, filename)));
  }
  const sourceFiles = new Map([
    ['app/version.mjs', readFileSync(join(root, 'public/app/version.mjs'))],
    ['app/index.html', Buffer.from('Current application')],
    ['app/data/download-map.json', Buffer.from('{"native":"index"}')],
    ['share/current.png', Buffer.from('Share card')],
    ['icon.svg', Buffer.from('<svg/>')],
    ...[...RETAINED_RELEASE_FILES, ...ARCHIVED_RELEASE_FILES].map(filename => [
      `releases/${filename}`, Buffer.from(`Original source artifact: ${filename}`),
    ]),
  ]);
  for (const filename of EXTERNAL_RELEASE_FILES) {
    const bytes=sourceFiles.get(`releases/${filename}`);
    sourceFiles.set(`releases/${filename}.sha256`,Buffer.from(createHash('sha256').update(bytes).digest('hex')+'  '+filename+'\n'));
  }
  for (const [name, contents] of sourceFiles) {
    write(`public/${name}`, contents);
    write(`dist/client/${name}`, contents);
  }
  for (const filename of [...ARCHIVED_RELEASE_FILES,...EXTERNAL_RELEASE_FILES]) write(`app/releases/${filename}/route.ts`, '// Fixture route');
  write('dist/server/index.js', '// Worker output');
  let run = 0;
  return {
    directory, sourceFiles, write,
    async verify() {
      const logs = [], originalLog = console.log;
      try {
        console.log = (...values) => logs.push(values.join(' '));
        // Run the actual verifier against an isolated project, without touching
        // the real dist tree or requiring subprocess support in the test host.
        await import(`${pathToFileURL(join(directory, 'scripts/verify-public-build.mjs')).href}?run=${run++}`);
        return { status: 0, stdout: logs.join('\n'), stderr: '' };
      } catch (error) {
        return { status: 1, stdout: logs.join('\n'), stderr: String(error.stack || error) };
      } finally {
        console.log = originalLog;
      }
    },
  };
}

test('build verification prunes only explicit archived/external deployment copies and is safe to repeat', async t => {
  const { directory, sourceFiles, write, verify } = fixture(t);
  write('dist/client/releases/stray-copy.apk', 'Old transient build copy');
  const first = await verify();
  assert.equal(first.status, 0, first.stderr);
  const report = JSON.parse(first.stdout);
  assert.deepEqual(report.retainedApkVersions, RETAINED_APK_VERSIONS);
  assert.equal(report.archivedReleaseFilesExcluded, ARCHIVED_RELEASE_FILES.length);
  assert.equal(report.archivedReleaseBytes, [...sourceFiles].filter(([name]) => name.startsWith('releases/') && releaseFileDisposition(name.slice(9)) === 'archived').reduce((sum, [, bytes]) => sum + bytes.length, 0));
  assert.deepEqual(report.externalReleaseFilesExcluded,EXTERNAL_RELEASE_FILES);
  assert.equal(report.orphanFilesRemoved, ARCHIVED_RELEASE_FILES.length + EXTERNAL_RELEASE_FILES.length + 2);
  assert.deepEqual(readdirSync(join(directory, 'dist/client/releases')).sort(), [...DEPLOYED_RELEASE_FILES].sort());
  for (const [name, bytes] of sourceFiles) {
    assert.deepEqual(readFileSync(join(directory, 'public', name)), bytes, `Source artifact changed: ${name}`);
    if (name === 'app/data/download-map.json' || (name.startsWith('releases/') && ['archived','external'].includes(releaseFileDisposition(name.slice(9))))) {
      assert.ok(!existsSync(join(directory, 'dist/client', name)));
    } else {
      assert.deepEqual(readFileSync(join(directory, 'dist/client', name)), bytes);
    }
  }
  const second = await verify();
  assert.equal(second.status, 0, second.stderr);
  const repeated = JSON.parse(second.stdout);
  assert.equal(repeated.orphanFilesRemoved, 0);
  assert.equal(repeated.buildBytes, report.buildBytes);
});

test('a new release without an explicit policy fails before pruning any assets', async t => {
  const { directory, write, verify } = fixture(t);
  write('public/releases/FINDR-99.0.0.apk', 'New release needs policy');
  write('dist/client/releases/FINDR-99.0.0.apk', 'New release needs policy');
  const result = await verify();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Release file needs an explicit deployment policy: FINDR-99\.0\.0\.apk/);
  assert.ok(existsSync(join(directory, 'dist/client/releases', ARCHIVED_RELEASE_FILES[0])));
});

test('an archive cannot be excluded until its compatibility handler exists', async t => {
  const { directory, verify } = fixture(t);
  rmSync(join(directory, 'app/releases', ARCHIVED_RELEASE_FILES[0], 'route.ts'));
  const result = await verify();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing archived release handler/);
  assert.ok(existsSync(join(directory, 'dist/client/releases', ARCHIVED_RELEASE_FILES[0])));
});

test('external APK exclusion requires its exact route and matching source checksum',async t=>{
  const {directory,write,verify}=fixture(t),name=EXTERNAL_RELEASE_FILES[0];
  rmSync(join(directory,'app/releases',name,'route.ts'));
  let result=await verify();assert.notEqual(result.status,0);assert.match(result.stderr,/Missing external release handler/);
  assert.ok(existsSync(join(directory,'dist/client/releases',name)));
  write(`app/releases/${name}/route.ts`,'// Fixture route');
  write(`public/releases/${name}.sha256`,'f'.repeat(64)+'  '+name+'\n');
  result=await verify();assert.notEqual(result.status,0);assert.match(result.stderr,/External release checksum differs/);
  assert.ok(existsSync(join(directory,'dist/client/releases',name)),'Do not prune before source artifact verification');
});

test('Sites checkout can omit only the external APK while retaining its exact route and valid checksum',async t=>{
  const {directory,write,verify}=fixture(t),name=EXTERNAL_RELEASE_FILES[0];
  rmSync(join(directory,'public/releases',name));
  const result=await verify();assert.equal(result.status,0,result.stderr);
  assert.ok(!existsSync(join(directory,'dist/client/releases',name)));
  const proof=JSON.parse(result.stdout).externalReleaseVerification.find(item=>item.filename===name);
  assert.equal(proof.localCopy,false);assert.equal(proof.localBytesVerified,false);
  assert.match(proof.sha256,/^[a-f0-9]{64}$/);
  write(`public/releases/${name}.sha256`,'not-a-hash  '+name+'\n');
  const invalid=await verify();assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/Invalid external release checksum/);
});

test('missing external checksum and previous static APK remain release blockers',async t=>{
  const {directory,verify}=fixture(t),name=EXTERNAL_RELEASE_FILES[0];
  rmSync(join(directory,'public/releases',name+'.sha256'));
  const result=await verify();assert.notEqual(result.status,0);assert.match(result.stderr,/Missing source release artifact/);
  const second=fixture(t),previous=`FINDR-${PREVIOUS_APK_VERSION}.apk`;
  rmSync(join(second.directory,'public/releases',previous));
  const missing=await second.verify();assert.notEqual(missing.status,0);assert.match(missing.stderr,/Missing source release artifact/);
});

test('an explicitly hosted oversized APK is excluded from deployment without stripping its source',async t=>{
  const {directory,write,verify}=fixture(t),name=EXTERNAL_RELEASE_FILES[0],bytes=Buffer.alloc(25*1024*1024+1,7);
  const checksum=createHash('sha256').update(bytes).digest('hex')+'  '+name+'\n';
  for(const prefix of ['public','dist/client']){write(`${prefix}/releases/${name}`,bytes);write(`${prefix}/releases/${name}.sha256`,checksum);}
  const result=await verify();assert.equal(result.status,0,result.stderr);
  assert.equal(statSync(join(directory,'public/releases',name)).size,bytes.length);
  assert.ok(!existsSync(join(directory,'dist/client/releases',name)));
  assert.equal(readFileSync(join(directory,'dist/client/releases',name+'.sha256'),'utf8'),checksum);
  assert.equal(JSON.parse(result.stdout).maxStaticAssetBytes,25*1024*1024,'The static file limit remains unchanged');
});

test('missing or changed current and previous downloads fail the build gate', async t => {
  const { directory, write, verify } = fixture(t);
  const [, currentChecksum, previousApk] = RETAINED_RELEASE_FILES;
  const previousOutput = join(directory, 'dist/client/releases', previousApk);
  rmSync(previousOutput);
  let result = await verify();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing public asset: releases\//);
  copyFileSync(join(directory, 'public/releases', previousApk), previousOutput);
  write(`dist/client/releases/${currentChecksum}`, 'Wrong checksum');
  result = await verify();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Public asset differs: releases\//);
});

test('static assets accept exactly 25 MiB and reject one byte over without changing source artifacts', async t => {
  const { directory, sourceFiles, write, verify } = fixture(t);
  const limit = 25 * 1024 * 1024;
  // A generated asset outside public/ proves that every shipped client file
  // is checked, not just copied files or the current Android download.
  const generated = 'dist/client/assets/size-boundary.bin';
  write(generated, Buffer.alloc(limit));
  let result = await verify();
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.maxStaticAssetBytes, limit);
  assert.equal(report.largestStaticAssetBytes, limit);

  write(generated, Buffer.alloc(limit + 1));
  result = await verify();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Static asset exceeds 25 MiB limit: assets\/size-boundary\.bin \(26214401 bytes; maximum 26214400\)/);
  assert.equal(statSync(join(directory, generated)).size, limit + 1, 'Reject the oversized output without deleting it');
  for (const [name, bytes] of sourceFiles) {
    assert.deepEqual(readFileSync(join(directory, 'public', name)), bytes, `Source artifact changed: ${name}`);
  }
});

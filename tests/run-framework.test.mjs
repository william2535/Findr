import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';

function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'findr-framework-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const write=(name,text)=>{const path=join(root,name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,text);};
 for(const name of ['run-framework.mjs','execution-profile.mjs'])write('scripts/'+name,readFileSync(new URL('../scripts/'+name,import.meta.url)));
 write('node_modules/vinext/package.json','{"type":"module"}');
 write('node_modules/vinext/dist/cli.js',`import {appendFileSync,existsSync} from 'node:fs';
const record=value=>appendFileSync(process.env.FINDR_RUN_FIXTURE,JSON.stringify(value)+'\\n');
record({event:'cli-start',pid:process.pid,args:process.argv.slice(2),staleOutput:existsSync('dist/stale-output')});
setTimeout(()=>{record({event:'cli-finished'});process.exit(Number(process.env.FINDR_FIXTURE_BUILD_EXIT||0));},25);
`);
 write('scripts/verify-public-build.mjs',`import {appendFileSync} from 'node:fs';appendFileSync(process.env.FINDR_RUN_FIXTURE,JSON.stringify({event:'public-gate'})+'\\n');process.exit(Number(process.env.FINDR_FIXTURE_GATE_EXIT||0));`);
 write('dist/stale-output','Old build');
 return{root,run(command='build',env={}){
  const record=join(root,'events.jsonl');
  const result=spawnSync(process.execPath,['scripts/run-framework.mjs',command,'--fixture-argument'],{cwd:root,encoding:'utf8',env:{...process.env,FINDR_RUN_FIXTURE:record,...env}});
  const events=existsSync(record)?readFileSync(record,'utf8').trim().split('\n').map(line=>JSON.parse(line)):[];
  return{result,events};
 }};
}

test('clean portable build waits for CLI completion, then runs the public gate',t=>{
 const{result,events}=fixture(t).run();assert.equal(result.status,0,result.stderr);
 assert.deepEqual(events.map(value=>value.event),['cli-start','cli-finished','public-gate']);
 assert.deepEqual(events[0].args,['build','--fixture-argument']);assert.equal(events[0].staleOutput,false);
 assert.notEqual(events[0].pid,result.pid,'Build CLI runs as a child so its exit cannot skip the gate');
});

test('portable CLI failure skips the gate and preserves the failing exit status',t=>{
 const{result,events}=fixture(t).run('build',{FINDR_FIXTURE_BUILD_EXIT:'17'});
 assert.equal(result.status,17,result.stderr);assert.deepEqual(events.map(value=>value.event),['cli-start','cli-finished']);
});

test('portable public-gate failure makes the overall build fail',t=>{
 const{result,events}=fixture(t).run('build',{FINDR_FIXTURE_GATE_EXIT:'23'});
 assert.equal(result.status,23,result.stderr);assert.equal(events.at(-1).event,'public-gate');
});

test('portable dev keeps its original PID, port arguments and existing output',t=>{
 const{result,events}=fixture(t).run('dev');assert.equal(result.status,0,result.stderr);
 assert.deepEqual(events.map(value=>value.event),['cli-start','cli-finished']);
 assert.equal(events[0].pid,result.pid);assert.equal(events[0].staleOutput,true);
 assert.deepEqual(events[0].args,['dev','--port','5173','--fixture-argument']);
});

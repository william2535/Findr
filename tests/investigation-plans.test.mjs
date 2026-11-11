import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getInvestigationPlan,INVESTIGATION_GROUP_IDS} from '../public/app/investigation-plans.mjs';
const knowledge=JSON.parse(readFileSync(new URL('../public/app/data/knowledge.json',import.meta.url),'utf8'));

test('all current fault groups have explicit substantive worksheets and valid interpretation sources',()=>{
 assert.equal(knowledge.groups.length,32);
 assert.deepEqual([...INVESTIGATION_GROUP_IDS].sort(),knowledge.groups.map(g=>g.id).sort());
 const sourceIds=new Set(knowledge.sources.map(s=>s.id));
 const allIds=new Set();
 for(const group of knowledge.groups){
  const plan=getInvestigationPlan(group);
  assert.equal(plan.id,group.id);assert.ok(plan.checks.length>=5&&plan.checks.length<=7,group.id);
  assert.match(plan.scope,/not a universal manufacturer test procedure/);
  assert.match(plan.scope,/do not verify every checkpoint or measurement sequence/);
  const prompts=new Set();
  for(const check of plan.checks){
   assert.ok(!allIds.has(check.id),check.id);allIds.add(check.id);prompts.add(check.prompt);
   assert.ok(check.id.startsWith(`${group.id}:`),check.id);
   assert.ok(check.title&&check.prompt.length>70&&check.record.length>40,check.id);
   assert.equal(typeof check.requiresProcedure,'boolean');assert.ok(check.sourceRefs.length,check.id);
   for(const ref of check.sourceRefs)assert.ok(sourceIds.has(ref.sourceId),ref.sourceId);
   assert.doesNotMatch(check.prompt,/\b\d+(?:\.\d+)?\s*(?:v(?:olts?)?|ohms?|amps?|mA|kΩ)\b/i,check.id);
   if(check.measurementKind){assert.equal(check.requiresProcedure,true);assert.ok(check.unit);assert.match(check.record,/reference|method|conditions/);assert.match(check.prompt,/exact-model procedure|exact.*procedure|exact panel|exact model/i);}
  }
  assert.equal(prompts.size,plan.checks.length,group.id);
 }
});
test('loop process records physical endpoints and comparable evidence without inventing topology or a voltage diagnosis',()=>{
 const plan=getInvestigationPlan(knowledge.groups.find(g=>g.id==='loop'));
 const content=plan.checks.map(c=>c.prompt+' '+c.record).join('\n');
 assert.match(content,/first and last physical devices/);
 assert.match(content,/consecutive address numbers as cable order/);
 assert.match(content,/dual-fed open loop may still power every device/);
 assert.match(content,/Powered devices at both ends do not rule out an open circuit/);
 assert.match(content,/exact procedure permits controlled section testing/);
 assert.match(content,/results conflict/);
 assert.match(content,/de-energised/);
});
test('discipline-specific plans retain distinct evidence rather than applying electrical tests to every fault',()=>{
 const plan=id=>getInvestigationPlan(knowledge.groups.find(g=>g.id===id));
 assert.match(plan('cctv-stream').checks.map(c=>c.prompt).join(' '),/packet loss, latency/);
 assert.equal(plan('cctv-stream').checks.filter(c=>c.unit==='V DC').length,0);
 assert.match(plan('access-unlocked').checks.map(c=>c.prompt).join(' '),/egress.*fire|fire.*egress/);
 assert.match(plan('warden-call-not-received').checks.map(c=>c.prompt).join(' '),/receipt and acknowledgement/);
 assert.match(plan('security-setting').checks.map(c=>c.prompt).join(' '),/do not bypass/);
 assert.match(plan('fire_unwanted_alarm').checks.map(c=>c.prompt).join(' '),/contamination|detector values/);
});
test('returned worksheets are detached from source data and unknown faults have an explicit fallback',()=>{
 const group=knowledge.groups[0],copy=JSON.stringify(group),plan=getInvestigationPlan(group);
 plan.checks[0].sourceRefs[0].page='changed';assert.equal(JSON.stringify(group),copy);
 const unknown=getInvestigationPlan({id:'unlisted',title:'Other fault',questions:[]});
 assert.equal(unknown.checks.length,3);assert.match(unknown.checks[0].prompt,/unrelated guide/);
 assert.ok(getInvestigationPlan().checks.length);
 assert.equal(getInvestigationPlan(null).checks.length,3);
});

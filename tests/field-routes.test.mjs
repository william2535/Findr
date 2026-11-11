import test from 'node:test';
import assert from 'node:assert/strict';
import {ROUTE_VERSION,FIELD_ROUTES,FIELD_SOURCES,TEST_TEMPLATES,getRoute,getRule,rulesForRoute} from '../public/app/field-routes.mjs';

const targets=['yesTarget','noTarget','unknownTarget','blockedTarget'];
const terminals=new Set(['manual','handover']);
const expected={P:9,F:15,A:10,C:12,I:12};

test('all 58 requested routes have stable IDs, source text and individually addressable rules',()=>{
 assert.equal(ROUTE_VERSION,'2026-11-02.1');assert.equal(FIELD_ROUTES.length,58);
 assert.equal(new Set(FIELD_ROUTES.map(r=>r.id)).size,58);
 for(const [family,count] of Object.entries(expected))for(let i=1;i<=count;i++){
  const id=family+String(i).padStart(2,'0'),route=getRoute(id);assert.ok(route,id);
  assert.equal(route.revision,ROUTE_VERSION);assert.ok(route.summary&&route.title&&route.sourceBrief&&route.provenance);
  assert.match(route.sourceBriefStatus,/require separate verification/);assert.ok(route.closeout.length);
  assert.ok(route.rules.length>=3&&route.rules.length<=5,id);assert.deepEqual(rulesForRoute(id),route.rules);
  route.rules.forEach((rule,index)=>{assert.equal(rule.id,`${id}.Q${index+1}`);assert.equal(rule.routeId,id);assert.equal(getRule(rule.id),rule);});
 }
 assert.equal(getRoute('missing'),null);assert.equal(getRule('missing'),null);assert.deepEqual(rulesForRoute('missing'),[]);
});

test('every branch resolves and every rule has a finite unknown and blocked exit',()=>{
 const allRules=FIELD_ROUTES.flatMap(r=>r.rules);assert.equal(new Set(allRules.map(r=>r.id)).size,allRules.length);
 for(const rule of allRules){
  for(const key of targets){const target=rule[key];assert.ok(terminals.has(target)||getRule(target)||getRoute(target),`${rule.id}.${key}: ${target}`);assert.notEqual(target,rule.id);}
  assert.equal(rule.blockedTarget,'handover');
  const visited=new Set();let current=rule;
  while(current){assert.ok(!visited.has(current.id),`Unknown loop at ${current.id}`);visited.add(current.id);const target=current.unknownTarget;if(terminals.has(target))break;current=getRule(target)||getRoute(target)?.rules[0];assert.ok(current);}
 }
});

test('each route stage is reachable without a hidden orphan question',()=>{
 for(const route of FIELD_ROUTES){
  const reachable=new Set(),pending=[route.rules[0]];
  while(pending.length){const rule=pending.shift();if(reachable.has(rule.id))continue;reachable.add(rule.id);for(const key of targets){const next=getRule(rule[key]);if(next?.routeId===route.id)pending.push(next);}}
  assert.equal(reachable.size,route.rules.length,`${route.id} has unreachable stages`);
 }
});

test('citations and templates resolve without turning a supplied reference into a verified profile',()=>{
 const sourceIds=new Set(FIELD_SOURCES.map(s=>s.id)),templateIds=new Set(TEST_TEMPLATES.map(t=>t.id));
 assert.equal(sourceIds.size,FIELD_SOURCES.length);assert.equal(templateIds.size,TEST_TEMPLATES.length);
 for(const source of FIELD_SOURCES){assert.match(source.url,/^https:\/\//);assert.ok(source.title&&source.locator&&source.provenance);assert.equal(source.verificationStatus,'reference-supplied');assert.equal(source.numericComparatorEnabled,false);}
 for(const route of FIELD_ROUTES){assert.ok(route.sourceRefs.length);for(const ref of route.sourceRefs)assert.ok(sourceIds.has(ref),`${route.id}:${ref}`);for(const rule of route.rules){assert.ok(templateIds.has(rule.testTemplate),rule.id);for(const ref of rule.sourceRefs)assert.ok(sourceIds.has(ref),`${rule.id}:${ref}`);assert.equal(rule.numericComparatorsEnabled,false);assert.ok(!('limits' in rule)&&!('boundaries'in rule));}}
});

test('questions remain observational while physical test templates carry independent prerequisites',()=>{
 for(const rule of FIELD_ROUTES.flatMap(r=>r.rules)){assert.deepEqual(rule.requires,['readOnly']);assert.ok(rule.why&&rule.evidenceToCollect.length&&rule.nextIfContradiction&&rule.retestCriteria);assert.equal(rule.question.endsWith('?'),true);}
 const t=id=>TEST_TEMPLATES.find(t=>t.id===id);
 for(const id of ['resistance','continuity'])for(const gate of ['isolation','bothEnds','instrument'])assert.ok(t(id).requires.includes(gate));
 for(const gate of ['energised','instrument'])assert.ok(t('voltage').requires.includes(gate));
 assert.ok(t('continuity').requires.includes('bareSpan'));
 for(const template of TEST_TEMPLATES)assert.ok(!template.requires.includes('exactProfile'),`Generic ${template.id} must permit raw recording without a T2 comparator`);
 for(const id of ['P02.Q2','P03.Q2','P06.Q4','I01.Q3'])assert.ok(!getRule(id).testRequires.includes('exactProfile'),id);
 for(const id of ['F02.Q3','F10.Q3','F15.Q3'])assert.ok(getRule(id).testRequires.includes('exactProfile'),id);
 assert.ok(getRule('F15.Q3').testRequires.includes('specialist'));
 assert.match(getRule('F03.Q1').why,/all devices.*integrity/);
 assert.match(getRule('A04.Q2').why,/dry contact.*switched return/);
 assert.match(getRule('C06.Q4').why,/centre-to-shield OL/);
 assert.match(getRule('I01.Q1').why,/Unknown energy state blocks/);
});

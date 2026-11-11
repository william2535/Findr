import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getEmulatorConfig} from '../public/app/emulator-config.mjs';

const profiles=JSON.parse(fs.readFileSync(new URL('../public/app/data/practice.json',import.meta.url))).profiles;
const fixtures=Object.fromEntries(profiles.map(profile=>{
  const map=JSON.parse(fs.readFileSync(new URL('../public/app/data/menu-maps/'+profile.id+'.json',import.meta.url)));
  return [profile.id,{map,profile,config:getEmulatorConfig(map,profile)}];
}));
const config=id=>fixtures[id].config;

for(const [id,{map,config:cfg}] of Object.entries(fixtures)) {
  test(id+': adapters point to real source nodes and valid source pages',()=>{
    const known=new Set(map.nodes.map(n=>n.id)),sources=new Map(map.sources.map(s=>[s.id,s]));
    assert(cfg.roots.some(r=>r.id===cfg.defaultRootId));
    for(const root of cfg.roots)for(const child of root.nodeIds)assert(known.has(child),root.id+' unknown root child '+child);
    for(const [nodeId,override]of Object.entries(cfg.overrides)) {
      assert(known.has(nodeId),nodeId+' missing source node');
      for(const child of override.children||[])assert(known.has(child),nodeId+' unknown child '+child);
      if(override.aliasTarget)assert(known.has(override.aliasTarget),nodeId+' missing alias target');
      for(const ref of override.sourceRefs||[]) {
        assert(sources.has(ref.sourceId),nodeId+' missing manual');
        assert(Number.isInteger(ref.pdfPage)&&ref.pdfPage>0&&ref.pdfPage<=sources.get(ref.sourceId).totalPdfPages,nodeId+' invalid source page');
      }
    }
  });
  test(id+': interactive choices have no empty lists or ambiguous numeric shortcuts',()=>{
    for(const [nodeId,node]of Object.entries(cfg.overrides)) {
      if(!node.choices)continue;
      assert(node.choices.length,nodeId+' empty chooser');
      const codes=node.choices.map(c=>c.code).filter(c=>c!==null&&c!==undefined&&c!=='').map(String);
      assert.equal(new Set(codes).size,codes.length,nodeId+' ambiguous numeric key');
    }
  });
}

test('Galaxy Full Menu joins the seven real groups, keeping Quick slot numbers separate',()=>{
  const cfg=config('galaxy-dimension');
  assert.deepEqual(cfg.roots.find(r=>r.id==='galaxy-engineer-full').nodeIds,['galaxy-10','galaxy-20','galaxy-30','galaxy-40','galaxy-50','galaxy-60','galaxy-70']);
  assert.equal(cfg.overrides['galaxy-quick.3'].aliasTarget,'galaxy-21');
  assert.equal(cfg.overrides['galaxy-quick.0'].aliasTarget,'galaxy-11');
  assert.equal(cfg.overrides['galaxy-52'].selector,'zone');
});

test('Galaxy omission and descriptor retain their distinct commit keys and documented0/1 values',()=>{
  const x=config('galaxy-dimension').overrides;
  assert.deepEqual(x['galaxy-11'].toggleKeys,['details']);
  assert.equal(x['galaxy-11'].enterStartsSetting,true);
  assert.equal(x['galaxy-52.2'].saveKey,'back');
  assert.equal(x['galaxy-52.2'].maxLength,16);
  assert.deepEqual(x['galaxy-52.4'].choices.map(c=>c.code),['0','1']);
});

test('Galaxy scalar bounds retain audited unit and maximum corrections',()=>{
  const x=config('galaxy-dimension').overrides;
  assert.equal(x['galaxy-51.20'].max,600);
  assert.equal(x['galaxy-51.31'].max,3000);
  assert.equal(x['galaxy-51.35'].max,999);
  assert.equal(x['galaxy-51.42'].min,0);
  assert.equal(x['galaxy-51.51'].units,'minutes');
  assert.equal(x['galaxy-51.73'].mode,'choice');
  assert.equal(x['galaxy-51.11'].choices.length,3);
});

test('Galaxy per-group parameters and fault categories do not become global enum values',()=>{
  const x=config('galaxy-dimension').overrides;
  for(const code of ['13','19','20','31','35']) {
    assert.equal(x['galaxy-51.'+code].selector,'group');
    assert.equal(x['galaxy-51.'+code].scope,'group');
  }
  assert.equal(x['galaxy-51.14'].mode,'info');
  for(const code of ['64','65']) {
    assert.equal(x['galaxy-51.'+code].mode,'menu');
    assert.equal(x['galaxy-51.'+code+'.tamper'].mode,'info');
    assert.equal(x['galaxy-51.'+code+'.tamper'].include,true);
  }
});

test('Galaxy external Telecom retains its exceptions and unavailable V.21 cannot be edited',()=>{
  const x=config('galaxy-dimension').overrides;
  assert.equal(x['galaxy-56.1.16'].mode,'status');
  assert.equal(x['galaxy-56.5.16'].mode,'status');
  assert.match(x['galaxy-56.1.16'].displayLines.join(' '),/not available/i);
  assert(!x['galaxy-56.5.11']||x['galaxy-56.5.11'].mode==='info');
  assert.equal(x['galaxy-56.1.15'].choices.find(c=>c.code==='2').label,'Ext. Telecoms');
  assert.equal(x['galaxy-56.5.15'].choices.find(c=>c.code==='2').label,'Ext RS232');
  assert.equal(x['galaxy-56.5.15'].choices.find(c=>c.code==='5').label,'Int Telecoms');
});

test('Galaxy reporting chooses trigger or group before editing the dependent field',()=>{
  const x=config('galaxy-dimension').overrides;
  assert.equal(x['galaxy-56.1.01.v2.1'].selector,'trigger');
  assert.equal(x['galaxy-56.1.01.v2.1.1'].scope,'trigger');
  assert.equal(x['galaxy-56.1.01.v2.1.1'].selector,undefined);
  assert.equal(x['galaxy-56.1.01.v2.1.2'].selector,undefined);
  assert.equal(x['galaxy-56.1.01.v2.2'].selector,'group');
  assert.equal(x['galaxy-56.1.01.v2.2.1'].scope,'group');
  assert.equal(x['galaxy-56.1.01.v2.2.1'].selector,undefined);
});

test('Texecom independent flags and fictional area capacity are not exclusive enum choices',()=>{
  const x=config('texecom-premier-elite').overrides;
  assert.equal(x['zone-attrib1'].mode,'flags');
  assert.equal(x['zone-attrib2'].mode,'flags');
  assert.equal(x['zone-areas'].choices.length,4);
  assert.equal(x['zone-attrib1'].choices.find(c=>c.id==='zone-a1-1').bind,'zoneOmitEnabled');
  assert.equal(x['zone-group'].max,4);
  assert.equal(x['util-zone-status'].diagnosticOmit,true);
  assert.deepEqual(x['arm-omit'].toggleKeys,['omit']);
});

test('Texecom zone and timer field sequences retain record-vs-field navigation',()=>{
  const x=config('texecom-premier-elite').overrides;
  assert.equal(x.zones.selector,'zone');
  assert.equal(x.zones.sequentialFields,true);
  assert.equal(x['area-timers'].selector,'area');
  assert.equal(x['global-timers'].scrollFields,true);
  assert.equal(x['global-timers-0'].max,999);
  assert.equal(x['area-timers-1'].max,999);
});

test('Scantronic partitioned and part-setting menus remain mutually exclusive',()=>{
  const roots=config('scantronic-ion').roots;
  const partitioned=roots.find(r=>r.id==='installer-v6').nodeIds;
  const partSet=roots.find(r=>r.id==='installer-v6-part-setting').nodeIds;
  assert(partitioned.includes('i-partitions')&&!partitioned.includes('i-setting'));
  assert(partSet.includes('i-setting')&&!partSet.includes('i-partitions'));
  assert.equal(roots.find(r=>r.id==='user-v7').edition,'7.02.xx');
});

test('Scantronic zone-type reference table becomes the Type value selector without fabricated menu codes',()=>{
  const x=config('scantronic-ion').overrides;
  assert.equal(x['i-zone-type'].choices.length,26);
  assert.equal(x['i-zone-type'].choices.find(c=>c.label==='Normal Alarm').code,'03');
  assert.equal(x['i-zone-type'].bind,'zoneType');
  assert.equal(x['i-program-zones'].selector,'zone');
  assert(x['i-program-zones'].children.includes('i-zone-type'));
  assert.deepEqual(x['user-v7-omit-zones'].toggleKeys,['right']);
  assert.equal(x['user-v7-omit-zones'].commitKey,'enter');
});

test('Orisec text aliases share the actual20/12-character record fields',()=>{
  const x=config('orisec-cp').overrides;
  assert.equal(x['program-zone-programming-zone-text'].maxLength,20);
  assert.equal(x['program-user-setup-user-name'].maxLength,12);
  assert.equal(x['program-system-text-zone-text'].valueKey,'program-zone-programming-zone-text');
  assert.equal(x['program-system-text-area-text'].valueKey,'program-area-options-area-text');
  assert.equal(x['program-system-text-user-name'].valueKey,'program-user-setup-user-name');
  assert.equal(x['tests-view-zone-status'].numericSelection,false);
  assert.equal(x.engineer.numericSelection,false);
});

test('Orisec duplicate user-option8 codes and contradictory timers stay evidence-marked',()=>{
  const x=config('orisec-cp').overrides;
  assert.equal(x['program-user-setup-user-options'].choices.filter(c=>c.code==='8').length,0);
  assert.match(x['program-user-setup-user-options'].evidenceNote,/duplicate option numbers/i);
  assert.equal(x['program-system-options-system-timers-abort-delay'].mode,'info');
  assert.equal(x['program-system-options-system-timers-beam-pair'].mode,'info');
  assert.equal(x['program-area-timers-exit-delay'].max,255);
});

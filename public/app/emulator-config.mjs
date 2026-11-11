// Behaviour overlays for the source-pinned menu atlases. These are local training
// fixtures, not downloaded panel settings or manufacturer's factory defaults.
// Every override retains the atlas node's source references. Additional bounds
// below were checked against those same manuals, at the pages noted inline.
import {applyGalaxyExtras} from './emulator-galaxy-extra.mjs';
import {getMenvierConfig} from './emulator-menvier.mjs';
import {getPyronixConfig} from './emulator-pyronix.mjs';
import {getAdeConfig} from './emulator-ade.mjs';
import {getRiscoConfig} from './emulator-risco.mjs';
import {getHkcConfig} from './emulator-hkc.mjs';
const copy = value => JSON.parse(JSON.stringify(value));
const onOff = [{label:'Disabled', value:false}, {label:'Enabled', value:true}];
const fixtureNote = 'FINDR fictional panel. Values and connected devices are practice fixtures, not factory defaults.';

export function getEmulatorConfig(map, profile) {
  if (map.profileId === 'menvier-mseries') return getMenvierConfig(map, profile);
  if (map.profileId === 'pyronix-enforcer') return getPyronixConfig(map, profile);
  if (map.profileId === 'ade-accenta-optima') return getAdeConfig(map, profile);
  if (map.profileId === 'risco-lightsys2') return getRiscoConfig(map, profile);
  if (map.profileId === 'hkc-quantum70') return getHkcConfig(map, profile);
  const nodes = map.nodes, byId = new Map(nodes.map(n => [n.id,n]));
  const children = id => nodes.filter(n => n.parentId === id).sort((a,b) => a.order-b.order);
  const ids = id => children(id).map(n => n.id);
  const overrides = {};
  const put = (id, values) => { if (byId.has(id)) overrides[id] = {...overrides[id], ...values}; };
  const eachChild = (parent, values, predicate = () => true) => children(parent).filter(predicate).forEach(n => put(n.id, typeof values === 'function' ? values(n) : values));
  const choice = (id, choices, extra = {}) => put(id,{mode:'choice', choices:copy(choices), ...extra});
  const flag = (id, extra = {}) => choice(id,onOff.map(option=>{
    const source=children(id).find(n=>n.kind==='selection'&&n.label.toLowerCase()===option.label.toLowerCase());
    return source?{...option,id:source.id,code:source.code}:option;
  }),extra);
  const flags = (id, extra = {}) => put(id,{mode:'flags',choices:children(id).filter(n => n.kind !== 'reference' && !/reserved|not used/i.test(n.label)).map(n => ({id:n.id,label:n.label,code:n.code,value:n.id})),...extra});
  const number = (id,min,max,units='',extra={}) => put(id,{mode:'number',min,max,units,...extra});
  const text = (id,maxLength,extra={}) => put(id,{mode:'text',maxLength,...extra});
  const selector = (id,scope,extra={}) => put(id,{mode:'menu',selector:scope,scope,...extra});
  const action = (id,name,extra={}) => put(id,{mode:'action',action:name,...extra});
  const info = (id,note) => put(id,{mode:'info',evidenceNote:note});
  const clock = (id,format) => text(id,format==='time'?4:format==='date-short'?6:8,{format,textMode:'digits',evidenceNote:'The practice editor accepts the documented clock value; screen spacing is simplified.'});
  let roots = [], defaultRootId, demoModel = '';
  const records = {};
  const notes = [fixtureNote];

  // A documented set of enum values becomes a real editable field. Settings
  // without a documented input type remain a visible evidence gap.
  for (const node of nodes) {
    const values = children(node.id).filter(n => n.kind === 'selection');
    if (node.kind === 'setting' && values.length && !children(node.id).some(n => n.kind === 'setting')) {
      put(node.id,{mode:'choice',choices:values.map(n => ({id:n.id,label:n.label,code:n.code,value:n.label}))});
    }
    if (node.codeType === 'ambiguous') put(node.id,{numericSelection:false});
  }

  if (map.profileId === 'galaxy-dimension') {
    demoModel = 'Galaxy Dimension GD-48 · Mk7';
    records.trigger=children('galaxy-56.triggers').map(n=>({id:String(n.code),label:n.label}));
    roots = [
      {id:'galaxy-engineer-full',label:'Engineer · Full Menu',role:'Engineer',edition:'IE1-0063 Rev 1.0',nodeIds:['galaxy-10','galaxy-20','galaxy-30','galaxy-40','galaxy-50','galaxy-60','galaxy-70']},
      {id:'galaxy-user-full',label:'Manager · Full Menu',role:'Manager',edition:'IU1-0063 Rev 1.0',nodeIds:ids('galaxy-user-full')},
      {id:'galaxy-quick',label:'Manager · factory Quick Menu',role:'Manager',edition:'Factory slots · IU1-0063 Rev 1.0',nodeIds:ids('galaxy-quick')},
    ];
    defaultRootId = roots[0].id;
    notes.push('Dimension GD-48/96/264/520 baseline. Full Menu group headings are not prefixes for the numbered options. Quick slots are the manual’s factory mapping; real sites can reassign them.');
    const quick = ['11','14','15','21','22','24','31','41','42','43'];
    quick.forEach((address,i) => put(`galaxy-quick.${i}`,{mode:'menu',include:true,aliasTarget:`galaxy-${address}`}));
    put('galaxy-11',{mode:'omit',toggleKeys:['details'],finishKey:'back',numericSelection:false,eligibleOnly:true,enterStartsSetting:true});
    put('galaxy-21',{mode:'zones',numericSelection:true,detailsKey:'details',showResistance:true});
    put('galaxy-22',{mode:'log',reverseLogScroll:true});
    put('galaxy-32',{mode:'outputs',outputs:['Bells','Strobe'],toggleKeys:['enter'],evidenceNote:'The fictional site offers Bells and Strobe. Engineer-only additional function tests depend on installed outputs.'});
    put('galaxy-23',{mode:'info',displayLines:['GALAXY DIMENSION','FINDR DEMO'],evidenceNote:'System identity, group state and supply readings are simulated.'});
    for (const id of ['12','14','16','19']) action(`galaxy-${id}`,'arm');
    for (const id of ['13','17','18']) action(`galaxy-${id}`,'part-arm');
    action('galaxy-15','chime');
    put('galaxy-31.1.1',{mode:'walk-results',tested:false});
    put('galaxy-31.1.2',{mode:'walk-results',tested:true});
    for (const aud of ['1','2']) {
      put(`galaxy-31.2.${aud}.1`,{mode:'walk',finishKey:'back',eligibleOnly:true,audible:aud==='2'});
      put(`galaxy-31.2.${aud}.2`,{mode:'walk',finishKey:'back',eligibleOnly:true,selectedOnly:true,toggleKeys:['details'],audible:aud==='2'});
    }
    // Instance selectors are mandatory before a record's fields.
    for (const [id,scope] of [['galaxy-52','zone'],['galaxy-53','output'],['galaxy-42.1','user'],['galaxy-58','keypad'],['galaxy-54','link'],['galaxy-65.1','schedule'],['galaxy-65.3','group'],['galaxy-45.2.1','schedule'],['galaxy-69.2.2','module'],['galaxy-69.3.1','module']]) selector(id,scope);
    put('galaxy-52.1',{bind:'zoneType'});
    text('galaxy-52.2',16,{bind:'zoneName',textMode:'galaxy-picker',saveKey:'back',cancelKey:'none',evidenceNote:'Descriptor: A/B selects characters, ent adds, # changes character mode, * erases, esc stores. The manual’s word library is not yet reproduced.'});
    flag('galaxy-52.4',{bind:'zoneOmitEnabled'});
    flag('galaxy-52.3',{bind:'zoneChime'});
    flag('galaxy-52.5');
    text('galaxy-53.5',12,{textMode:'galaxy-picker',saveKey:'back',cancelKey:'none',evidenceNote:'The standard Galaxy text picker is used; the built-in word library is not yet reproduced.'});
    text('galaxy-42.1.3',6,{textMode:'galaxy-picker',saveKey:'back',cancelKey:'none',evidenceNote:'User-name field supports six characters in this baseline.'});
    text('galaxy-42.1.1',6,{minLength:4,textMode:'digits',evidenceNote:'Only fictional codes are stored. The minimum can be changed by 51.66; this demo uses four digits.'});
    clock('galaxy-41.time','time'); clock('galaxy-41.date','date-short');
    put('galaxy-41',{shortcutKeys:{next:'galaxy-41.time',previous:'galaxy-41.date',details:'galaxy-41.adjust'}});
    put('galaxy-41.time',{autoCommitLength:4});put('galaxy-41.date',{autoCommitLength:6});
    number('galaxy-41.adjust',-120,120,'seconds/week',{evidenceNote:'The manual accepts0–120seconds; * makes a correction negative. FINDR displays the signed numeric value.'});
    // IE1-0063, printed6-53…6-70. Do not infer ranges from labels.
    number('galaxy-51.01',0,30,'minutes',{selector:'group',scope:'group',evidenceNote:'00 means continuous bell operation on the documented panel; this emulator stores the parameter only.'});
    number('galaxy-51.02',0,20,'minutes',{selector:'group',scope:'group'});
    number('galaxy-51.03.1',0,300,'seconds',{selector:'group',scope:'group'});
    number('galaxy-51.04',0,300,'seconds',{selector:'group',scope:'group'});
    number('galaxy-51.05',0,300,'seconds',{selector:'group',scope:'group'});
    number('galaxy-51.08',0,9,'re-arms',{evidenceNote:'9 is the documented infinite-rearm selection.'});
    number('galaxy-51.13',1,60,'seconds',{selector:'group',scope:'group'});
    number('galaxy-51.16',1,14,'days');
    number('galaxy-51.20',0,600,'minutes',{selector:'group',scope:'group'});
    number('galaxy-51.27',20,1000,'milliseconds',{step:20});
    number('galaxy-51.31',0,3000,'seconds',{selector:'group',scope:'group'});
    number('galaxy-51.34',0,14,'days');
    number('galaxy-51.35',0,999,'seconds',{selector:'group',scope:'group'});
    number('galaxy-51.36',0,99,'Ah');
    number('galaxy-51.37',0,99,'hours');
    number('galaxy-51.38',0,30,'minutes');
    number('galaxy-51.39',1,90,'minutes');
    number('galaxy-51.42',0,12,'months');
    number('galaxy-51.44',0,240,'minutes');
    number('galaxy-51.49',0,99,'minutes',{evidenceNote:'The manual states a maximum99minutes;99 means the complete set period. Confirm the installed firmware’s lower-end behavior.'});
    number('galaxy-51.50',0,100,'hours');
    number('galaxy-51.51',0,30,'minutes');
    number('galaxy-51.52',0,250,'minutes');
    number('galaxy-51.66',4,6,'digits');
    number('galaxy-51.68',0,1800,'seconds');
    for(const code of ['10','23','26','32','41','45','57','58','59','63','70','71','73','74']) choice(`galaxy-51.${code}`,[{label:'Disabled',code:'0',value:false},{label:'Enabled',code:'1',value:true}]);
    choice('galaxy-51.11',[{label:'Disabled',code:'0',value:0},{label:'Enabled',code:'1',value:1},{label:'SIA part off',code:'2',value:2}],{selector:'group',scope:'group'});
    const resetLevels=['2.3','2.4','2.5','3.6','3.7'].map(value=>({label:value,value}));
    for(const code of ['06','07','22']) choice(`galaxy-51.${code}`,resetLevels,{selector:'group',scope:'group'});
    info('galaxy-51.14','IE1-0063 p6-57 states a 3.6 default but lists 3.7/3.8 as the programmable range. A matching keypad check is required before enabling this field; it does not share the System/Tamper/PA reset-level range.');
    choice('galaxy-51.19',[{label:'Disabled',code:'0',value:false},{label:'Enabled',code:'1',value:true}],{selector:'group',scope:'group'});
    // These table rows identify independently configured fault categories, not
    // mutually exclusive values for the whole Set Override/Reset Levels field.
    for(const id of ['galaxy-51.64','galaxy-51.65']) {
      put(id,{mode:'menu',numericSelection:false,...(id.endsWith('.64')?{selector:'group',scope:'group'}:{}),evidenceNote:'Select the fault category by name. The manual gives default user levels but does not state the complete accepted value domain or keypad sequence; those editors remain unverified.'});
      eachChild(id,{mode:'info',include:true,evidenceNote:'This is an independent fault category. Its accepted user-level range and physical edit sequence still need verification; FINDR does not store the category name as a value for the whole parameter.'});
    }
    choice('galaxy-51.28',[{label:'On demand',code:'0',value:0},{label:'Continuous',code:'1',value:1}]);
    action('galaxy-14','arm',{requiresValue:{nodeId:'galaxy-51.26',value:true},force:true,evidenceNote:'Forced Set requires51.26Forced enabled and only omits eligible open zones.'});
    // Some real value selectors are catalogued as menu groups in the atlas.
    for(const id of ['galaxy-48.2','galaxy-56.2.1','galaxy-56.2.2','galaxy-56.3.03','galaxy-56.3.07','galaxy-56.3.11','galaxy-56.4.10','galaxy-56.6.1','galaxy-56.6.2','galaxy-64.1.4','galaxy-64.2.4','galaxy-69.3.2']) choice(id,children(id).filter(n=>n.kind==='selection').map(n=>({id:n.id,label:n.label,code:n.code,value:n.label})));
    for (const id of ['galaxy-64.1','galaxy-64.2']) put(id,{mode:'menu',include:true});
    // Fields below a chosen reporting format remain linked to that value.
    for (const n of nodes.filter(n => n.kind==='selection' && children(n.id).some(c => ['setting','menu'].includes(c.kind)))) {
      put(n.id,{include:true});
    }
    for (const id of ['galaxy-61.1.7','galaxy-61.1.8']) put(id,{mode:'zones',numericSelection:true,showResistance:true});
  }

  if (map.profileId === 'texecom-premier-elite') {
    demoModel = 'Premier Elite48 · LCDLP';
    roots = [
      {id:'eng',label:'Engineer · INS176-9',role:'Engineer',edition:'INS176-9',nodeIds:ids('eng')},
      {id:'arming',label:'Arming · INS177-9',role:'Master user',edition:'INS177-9',nodeIds:ids('arming')},
      {id:'user-menu',label:'User menu · INS177-9',role:'Master user',edition:'INS177-9',nodeIds:ids('user-menu')},
    ];
    defaultRootId = 'eng';
    notes.push('Premier Elite LCDLP; INS176-9 engineer and INS177-9 user menus are separate source baselines. The older installer arming table and INS222-10 differences remain in Menu maps, not mixed into this keypad.');
    selector('zones','zone',{sequentialFields:true,numericSelection:true});
    put('zone-type',{bind:'zoneType',changeKey:'change'});
    for (const id of ['zone-attrib1','zone-attrib2','zone-areas','keypad-areas','keypad-options','keypad-sound','expander-areas','expander-sound','users-2','users-4','users-5','users-6','global-hardware','global-tones','comms-options']) flags(id,{changeKey:'change'});
    const demoAreas=['A','B','C','D'].map((label,i)=>({id:label,label:'Area '+label,code:String(i+1),value:label}));
    for(const id of ['zone-areas','keypad-areas','expander-areas','users-2'])put(id,{mode:'flags',choices:copy(demoAreas),changeKey:'change',evidenceNote:'The fictional Premier Elite48 uses four areas A–D; keys1–4 toggle these area flags.'});
    if(overrides['zone-attrib1']) overrides['zone-attrib1'].choices = overrides['zone-attrib1'].choices.map(c=>c.id==='zone-a1-1'?{...c,bind:'zoneOmitEnabled'}:c);
    text('zone-text',32,{bind:'zoneName',changeKey:'change',evidenceNote:'FINDR text input supplies the 32-character field. The manual’s predictive/multi-tap character entry is not reproduced.'});
    flag('zone-remote',{changeKey:'change'});
    number('zone-group',0,4,'',{changeKey:'change',evidenceNote:'The fictional panel uses Premier Elite48 capacity:four zone groups. INS176-9 p53 lists different capacities for24/88/168/640.'});
    for(const id of ['keypads','expanders','users','um-users']) selector(id,id==='users'||id==='um-users'?'user':id==='keypads'?'keypad':'module',{sequentialFields:true});
    for(const id of ['area-timers','area-arming','area-text','area-time-arm']) selector(id,'area',{sequentialFields:true});
    for(const id of ['area-arming','area-suite-mode'])choice(id,children(id).filter(n=>n.kind==='selection').map(n=>({id:n.id,label:n.label,code:n.code,value:n.label})),{selector:id==='area-arming'?'area':'schedule',scope:id==='area-arming'?'area':'schedule'});
    selector('global-control-timers','schedule');
    selector('um-timers','schedule');
    put('area-timers',{previousFieldKey:'reset-key'});
    put('global-timers',{mode:'menu',sequentialFields:true,scrollFields:true,previousFieldKey:'reset-key'});
    eachChild('area-timers',{mode:'number',min:0,max:999,changeKey:'digits',scope:'area',sourceRefs:[{sourceId:'install',printedPage:'54',pdfPage:54}],evidenceNote:'INS176-9 p54:000–999; timer units depend on the named field.'},n=>n.kind==='setting');
    eachChild('global-timers',{mode:'number',min:0,max:999,changeKey:'digits',sourceRefs:[{sourceId:'install',printedPage:'62',pdfPage:62}],evidenceNote:'INS176-9 p62:all system timers000–999; units depend on the named timer.'},n=>n.kind==='setting');
    eachChild('global-config',n=>({mode:'choice',changeKey:'change',choices:n.label.split(' / ').map((label,i)=>({label,value:label,code:String(i)}))}),n=>n.kind==='setting'&&n.label.includes(' / '));
    eachChild('area-options',n=>({mode:'flags',selector:'area',scope:'area',choices:[{id:n.id,label:n.label,value:n.id}],changeKey:'change'}),n=>n.kind==='setting');
    for(const n of children('global-text')) text(n.id,Number(n.code)<=4?32:16,{changeKey:'change',evidenceNote:'INS176-9 p69:messages1–4 use32 characters;5–7 use16. Text input is a FINDR editing aid.'});
    eachChild('global-part-text',{mode:'text',maxLength:16,changeKey:'change'});
    text('area-text',16,{selector:'area',scope:'area',changeKey:'change'});
    text('expander-text',16,{changeKey:'change'});
    text('users-1',6,{minLength:4,textMode:'digits',changeKey:'change'});
    text('users-8',8,{changeKey:'change'});
    for(const n of nodes.filter(n => n.parentId==='um-users')) {
      const analogue=children('users').find(t=>t.label===n.label);
      if(analogue&&overrides[analogue.id]) put(n.id,copy(overrides[analogue.id]));
    }
    const outputFields=ids('output-editor').filter(id=>!['output-group-unused'].includes(id));
    for(const n of children('outputs').filter(n=>n.id.startsWith('output-bank-'))) selector(n.id,'output',{children:outputFields,evidenceNote:'The bank selects an output record, then the shared output fields apply. The field chooser is simplified; function values retain the source codes.'});
    for(const n of children('output-editor')) if(n.kind==='setting') put(n.id,{include:true,changeKey:'change'});
    flags('output-attributes',{changeKey:'change'});
    put('util-zone-status',{mode:'zones',numericSelection:true,showResistance:true,diagnosticOmitKey:'omit',diagnosticOmit:true,evidenceNote:'Omit here temporarily disables the selected diagnostic zone, including its tamper. Leaving this diagnostic view reinstates it; it does not change the user omission list.'});
    put('arm-status',{mode:'zones',numericSelection:true,showResistance:false});
    for (const id of ['util-log-1','util-log-2','util-log-3','um-log']) put(id,{mode:'log',filter:id==='util-log-2'?'alarm':id==='util-log-3'?'mandatory':null,detailsKey:'details'});
    put('util-walk',{mode:'walk',finishKey:'back',selector:'area',evidenceNote:'The area selector uses fictional areas. Activate demo inputs to register the walk-test hits.'});
    put('um-walk',{mode:'walk',finishKey:'back',selector:'area'});
    for(const n of children('util-bell').filter(n=>n.id.startsWith('util-bell-'))) put(n.id,{mode:'outputs',outputs:[n.label.replace(/^Test /,'')],toggleKeys:['enter'],evidenceNote:'The displayed output changes only in the fictional panel. No reporting is sent.'});
    for(const n of children('um-tests')) put(n.id,{mode:'outputs',outputs:[n.label],toggleKeys:['enter']});
    put('util-system-3',{mode:'outputs',outputs:['Bell','Strobe','Speaker'],toggleKeys:['enter']});
    put('arm-omit',{mode:'omit',toggleKeys:['omit'],finishKey:'back',numericSelection:true});
    put('arm-omit24',{mode:'omit',toggleKeys:['omit'],finishKey:'back',numericSelection:true,evidenceNote:'Only fictional eligible zones appear. This does not reproduce a real site’s24-hour permission configuration.'});
    action('eng-logoff','logout');action('eng-exit','exit-programming');
    action('arm-arm','arm');action('arm-part','part-arm');action('arm-silent','arm');
    action('arm-disarm','unset');action('arm-cancel','unset');
    action('arm-exit','logout');action('um-exit','logout');
    action('arm-chime','chime');
    for(const id of ['util-time','um-time'])clock(id,'time');
    for(const id of ['util-date','um-date'])clock(id,'date-short');
    for(const n of children('partarms')) put(n.id,{mode:'flags',selector:'zone',scope:'zone',choices:[{id:n.id,label:'Included in '+n.label,value:n.id}],changeKey:'change'});
    for(const n of children('um-part')) put(n.id,{mode:'flags',selector:'zone',scope:'zone',choices:[{id:n.id,label:'Included in '+n.label,value:n.id}],changeKey:'change'});
  }

  if (map.profileId === 'scantronic-ion') {
    demoModel = 'i-on40H+ · KEY-KP01';
    records.area=Array.from({length:4},(_,i)=>({id:String(i+1),label:'Partition '+(i+1)}));
    const all=ids('installer-v6');
    roots = [
      {id:'installer-v6',label:'Installer · partitioned v6',role:'Installer',edition:'6.0.xx',nodeIds:all.filter(id=>id!=='i-setting')},
      {id:'installer-v6-part-setting',label:'Installer · part-setting v6',role:'Installer',edition:'6.0.xx',nodeIds:all.filter(id=>id!=='i-partitions')},
      {id:'user-v7',label:'Master user · v7',role:'Master user',edition:'7.02.xx',nodeIds:ids('user-v7')},
    ];
    defaultRootId='installer-v6';
    notes.push('Installer menus use6.0.xx; the administrator guide is7.02.xx. Partitioned and part-setting menus are separate. Ordinary menu choices are scrolled, not assigned invented numbers.');
    // Selector records are tagged selection in the atlas. They are contexts,
    // not alternatives to save into the parent field.
    for(const node of nodes.filter(n=>n.kind==='selection'&&children(n.id).some(c=>['setting','menu','command','status'].includes(c.kind)))) {
      let scope=/zone nnn/i.test(node.label)?'zone':/output/i.test(node.label)?'output':/user/i.test(node.label)?'user':/partition/i.test(node.label)?'area':/keypad|kpd/i.test(node.label)?'keypad':/event|exception/i.test(node.label)?'schedule':/recipient/i.test(node.label)?'contact':/expander|siren|sounder|wam|cam|psu/i.test(node.label)?'module':null;
      if(scope) selector(node.id,scope,{include:true}); else put(node.id,{mode:'menu',include:true});
    }
    // Program Zones has one record-selector placeholder: show its fields after
    // the chooser, without making a phantom 'Zone nnn' menu step.
    selector('i-program-zones','zone',{children:ids('i-selected-zone')});
    choice('i-zone-type',children('ref-zone-types').map(n=>({id:n.id,label:n.label,code:n.code,value:n.label})),{bind:'zoneType',numericSelection:true});
    const outputTypes=children('ref-output-types').filter(n=>/^\d+$/.test(n.code||'')&&!/reserved|unused in this edition/i.test(n.summary)).map(n=>({id:n.id,label:n.label,code:n.code,value:n.label}));
    for(const n of nodes.filter(n=>n.id.startsWith('i-outputs-')&&n.kind==='setting'&&n.label==='Type'))choice(n.id,outputTypes,{numericSelection:true});
    const partitionChoices=Array.from({length:4},(_,i)=>({id:'partition-'+(i+1),label:'Partition '+(i+1),value:'partition-'+(i+1)}));
    const zoneChoices=profile.zones.map(z=>({id:z.address,label:z.address+' '+z.name,value:z.address}));
    const yesNo=[{label:'No',value:false},{label:'Yes',value:true}];
    const values=(...labels)=>labels.map(label=>({label,value:label}));
    const nameNote='The source identifies an editable name. Its exact firmware character limit is not stated here; FINDR provides a text editing aid.';
    for(const n of nodes.filter(n=>n.kind==='setting')) {
      if(n.label==='Partitions')put(n.id,{mode:'flags',choices:partitionChoices,toggleKeys:['right'],evidenceNote:'Four fictional partitions are configured in this i-on40H+ practice site.'});
      if(n.id.startsWith('i-outputs-')) {
        if(n.label==='Name')put(n.id,{mode:'text',evidenceNote:nameNote});
        if(n.label==='Pulsed')choice(n.id,yesNo);
        if(n.label==='Polarity')choice(n.id,values('Normal','Inverted'));
        if(n.label==='Zones')put(n.id,{mode:'flags',choices:zoneChoices,toggleKeys:['right']});
      }
      if(n.label==='Name'&&/keypad|expander|siren|sounder|recipient/.test(n.id))put(n.id,{mode:'text',evidenceNote:nameNote});
      if(n.label==='Name'&&n.id.includes('selected-wam'))text(n.id,12);
      if(n.label==='Name'&&n.id==='i-partitions-partition-n-name')put(n.id,{mode:'text',evidenceNote:nameNote});
    }
    // These settings have source-defined label choices rather than numbers.
    choice('i-confirmation-confirmation-mode',values('Basic','DD243','BS8243'));
    number('i-confirmation-confirmation-time',1,60,'minutes');
    choice('i-confirmation-entry-alarm-delay',values('Disabled','Enabled'));
    choice('i-confirmation-after-entry',values('Never','1 zone','2 zones'),{evidenceNote:'2 zones is available in DD243, not BS8243. Configuration dependencies remain shown in the source conditions.'});
    choice('i-confirmation-entry-keypad-lock',values('Off','On'));
    for(const id of ['i-confirmation-sounder-on','i-confirmation-siren-on'])choice(id,values('Unconfirm','Confirm'),{evidenceNote:'The real panel disallows Sounder On=Confirm with Siren On=Unconfirm. This demo preserves the editable fields; source-dependent alarm timing is simplified.'});
    for(const id of ['i-confirmation-unconfirmed-reset','i-confirmation-confirmed-reset'])choice(id,values('User','Installer'));
    choice('i-confirmation-hua-response',values('Audible','Silent','Displayed'));
    choice('i-confirmation-tamp-as-tamp-only',values('Disabled','Enabled'));
    choice('i-confirmation-auto-rearm',values('NEVER','1','2','3','4','5','ALWAYS'));
    for(const n of children('i-system-user-options-user-access'))if(n.kind==='setting')choice(n.id,yesNo);
    // Add/Edit both expose the same documented calendar fields. Events are
    // saved in fictional schedule records; FINDR does not schedule real arming.
    const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(label=>({id:label.toLowerCase(),label,value:label.toLowerCase()}));
    for(const n of nodes.filter(n=>n.id.includes('calendar-set'))) {
      if(n.kind==='menu'&&children(n.id).some(c=>c.kind==='selection'))put(n.id,{mode:'menu'});
      if(['Add Event','Add Exception'].includes(n.label))selector(n.id,'schedule',{evidenceNote:'Choose a fictional schedule slot, then practise its fields. This is a local record editor; the live-panel allocation and timed arming engine are not reproduced.'});
      if(n.kind!=='setting')continue;
      const label=n.label.toLowerCase();
      if(['name','event name','exception name'].includes(label))text(n.id,12,{scope:'schedule'});
      if(['time','event time','exception start time','exception end time'].includes(label))clock(n.id,'time');
      if(['days','event days','event day'].includes(label))put(n.id,{mode:'flags',choices:days,toggleKeys:['left','right'],scope:'schedule'});
      if(['actions','event actions'].includes(label))choice(n.id,values('No','Full','Part B','Part C','Part D','Unset'),{scope:'schedule',selector:'area',evidenceNote:'Select the fictional partition, then its scheduled action. No background timer operates a live system.'});
      if(label==='warning time')number(n.id,1,30,'minutes',{scope:'schedule'});
      if(label==='warning tone')choice(n.id,values('Audible','Silent'),{scope:'schedule'});
      if(['exceptions','event exceptions'].includes(label))put(n.id,{mode:'flags',choices:Array.from({length:4},(_,i)=>({id:'exception-'+(i+1),label:'Exception '+(i+1),value:'exception-'+(i+1)})),toggleKeys:['left','right'],scope:'schedule'});
      if(['exception start date','exception end date'].includes(label))text(n.id,4,{format:'date-month',textMode:'digits',scope:'schedule',evidenceNote:'The manual enters calendar exceptions as DDMM, with no year.'});
      if(overrides[n.id]?.mode&&overrides[n.id].mode!=='menu') {
        const family=n.id.includes('exception')?'exception':'event';
        const field=label.replace(/^event |^exception /,'').replace(/\s+/g,'-');
        put(n.id,{valueKey:'scan-calendar-'+family+'-'+field,scope:'schedule'});
      }
    }
    // Keep selector containers as containers after promoting record wrappers.
    for(const n of nodes.filter(n=>n.kind==='menu'&&children(n.id).some(c=>overrides[c.id]?.selector)))put(n.id,{mode:'menu'});
    selector('u-users-edit-user','user',{children:ids('u-users-edit-user-selected-user')});
    selector('u-users-add-user','user',{evidenceNote:'Choose a fictional user slot, then practise the Add User fields. Assigned radio tokens and the exact allocation wizard still need device-specific emulation.'});
    const userTypes=children('u-users-add-user-type').filter(n=>n.kind==='selection').map(n=>({id:n.id,label:n.label,value:n.label}));
    choice('u-users-edit-user-selected-user-type',userTypes);
    for(const prefix of ['u-users-add-user','u-users-edit-user-selected-user']) {
      text(prefix+'-name',12,{scope:'user',valueKey:'scan-user-name',sourceRefs:[{sourceId:'user7',printedPage:'34',pdfPage:38}]});
      text(prefix+(prefix==='u-users-add-user'?'-assign-access-code':'-code'),4,{scope:'user',valueKey:'scan-user-code',minLength:4,textMode:'digits',evidenceNote:'This fictional grade2 site uses four-digit codes. Grade3 uses six; the real Add User wizard also asks for confirmation.'});
      put(prefix+'-type',{scope:'user',valueKey:'scan-user-type'});
      put(prefix+'-partitions',{scope:'user',valueKey:'scan-user-partitions'});
      put(prefix+'-remote-password',{mode:'text',scope:'user',valueKey:'scan-user-remote-password',evidenceNote:'An editable fictional remote password only. The role-specific generation and access checks are not reproduced.'});
    }
    choice('u-users-edit-user-selected-user-app-access',values('Disabled','Enabled'));
    // About and diagnostic display values are fixtures, explicitly labelled.
    for(const [id,lines] of Object.entries({
      'i-about-panel':['i-on40H+ DEMO','Baseline6.0.xx'],
      'u-about-panel':['i-on40H+ DEMO','User guide7.02.xx'],
      'i-about-keypads':['KEY-KP01 DEMO','1 fictional keypad'],
      'u-about-keypads':['KEY-KP01 DEMO','1 fictional keypad'],
      'i-about-expanders':['DEMO EXPANDERS','No live bus'],
      'u-about-expanders':['DEMO EXPANDERS','No live bus'],
      'i-about-cloud':['DEMO OFFLINE','No cloud account'],
      'u-about-cloud':['DEMO OFFLINE','No cloud account'],
      'u-about-comms':['DEMO COMMS','No communicator'],
    }))put(id,{mode:'info',displayLines:lines,evidenceNote:'Read-only fictional identity. This does not claim to read or reproduce a physical panel firmware build.'});
    text('i-selected-zone-name',12,{bind:'zoneName',evidenceNote:'FINDR text input edits the documented12-character name; physical character entry is simplified.'});
    for(const n of children('i-zone-attributes').filter(n=>n.kind==='setting'))flag(n.id,{bind:/omittable|omit allowed/i.test(n.label)?'zoneOmitEnabled':/chime/i.test(n.label)?'zoneChime':undefined});
    for(const id of ['user-v7-omit-zones','user-2020-omit-zones']) put(id,{mode:'omit',toggleKeys:['right'],commitKey:'enter',numericSelection:false,eligibleOnly:true});
    put('i-test-zone-resistances',{mode:'zones',numericSelection:false,showResistance:true,nameToggleKeys:['left','right']});
    for(const id of ['i-log-all-events','i-log-mandatory-events','i-log-non-mand-events','user-v7-view-log']) put(id,{mode:'log',detailsKey:'right',filter:id==='i-log-mandatory-events'?'mandatory':id==='i-log-non-mand-events'?'non-mandatory':null});
    put('i-walk-system',{mode:'walk',finishKey:'enter'});
    put('i-walk-zones',{mode:'walk',include:true,selectedOnly:true,finishKey:'enter',toggleKeys:['right'],evidenceNote:'Select fictional zones, confirm to start; menu switches to untested zones while running.'});
    for(const id of ['i-walk-partitions','i-walk-expanders']) put(id,{mode:'walk',include:true,selector:id==='i-walk-partitions'?'area':'module',finishKey:'enter'});
    put('u-test-walk-test',{mode:'walk',finishKey:'enter'});
    flag('i-walk-chime');
    for(const n of nodes.filter(n=>n.parentId==='i-test-sirens-sounders'||n.parentId==='i-test-outputs')) put(n.id,{mode:'outputs',outputs:[n.label],toggleKeys:['right'],evidenceNote:'Only the fictional connected device is operated in this training session.'});
    put('user-v7-outputs-on-off',{mode:'outputs',outputs:['Output 1','Output 2','Output 3'],toggleKeys:['right'],finishKey:'enter'});
    action('i-test-locate-panel','test');action('i-test-locate-bus-device','test',{selector:'module'});
    for(const n of nodes.filter(n=>n.parentId==='u-config-facilities-on-off')) flag(n.id,{bind:/^chime$/i.test(n.label)?'chime':undefined});
    // v6 p23: zone type values are two-digit shortcuts only within Type.
    put('i-zone-type',{numericSelection:true});
    // The actual source records retain enum choices. Binary one-field options
    // are explicitly enumerated here instead of inferred from any title.
    for(const id of ['i-system-user-options-user-access-hua-keys-active','i-system-user-options-user-access-quick-set','i-system-user-options-user-access-quick-omit','i-system-user-options-user-access-user-code-reqd','i-ip-cloud-access-enabled','i-ip-cloud-access-cloud-time-sync']) flag(id);
    for(const n of nodes.filter(n=>n.kind==='setting'&&/up to (\d+) characters/i.test(n.summary))) {
      const max=Number(n.summary.match(/up to (\d+) characters/i)[1]); text(n.id,max,{evidenceNote:'Text input is a FINDR editing aid; the length limit comes from this source field.'});
    }
    // v6 manual pp55,60,63,79–80: explicit ranges, not inferred maxima.
    for(const n of nodes.filter(n=>n.kind==='setting')) {
      if(n.id.startsWith('i-outputs-')&&n.label==='Delay')number(n.id,0,999,'seconds',{sourceRefs:[{sourceId:'cfg6',printedPage:'55',pdfPage:55}]});
      if(n.id.startsWith('i-outputs-')&&n.label==='On Time')number(n.id,1,999,'seconds',{sourceRefs:[{sourceId:'cfg6',printedPage:'55',pdfPage:55}]});
      if(/^(i-partitions-partition-n|i-setting-(full-set|part-set-[bcd]))-/.test(n.id)) {
        if(n.label==='Settle Time')number(n.id,1,30,'seconds',{sourceRefs:[{sourceId:'cfg6',printedPage:'60',pdfPage:60}]});
        if(['Exit Time','Entry Time'].includes(n.label))number(n.id,10,120,'seconds',{sourceRefs:[{sourceId:'cfg6',printedPage:'60',pdfPage:60}]});
      }
      if(n.label==='PZ Reset Time')number(n.id,0,999,'seconds',{sourceRefs:[{sourceId:'cfg6',printedPage:'63',pdfPage:63}]});
      if(n.label==='Abort Time')number(n.id,0,120,'seconds',{sourceRefs:[{sourceId:'cfg6',printedPage:'79',pdfPage:79}]});
      if(n.label==='Mains Fail Delay')number(n.id,0,60,'minutes',{sourceRefs:[{sourceId:'cfg6',printedPage:'80',pdfPage:80}]});
      if(n.label==='Loudspeaker Volume'&&/expanders-edit-expander/.test(n.id))number(n.id,0,9,'',{changeKeys:['left','right'],sourceRefs:[{sourceId:'cfg6',printedPage:'36',pdfPage:36}]});
    }
    // A settings field name is not enough evidence for an arbitrary numeric
    // range. Unsupported ranges remain visible, with the linked manual page.
    info('i-system-date-and-time-set-date-time','The manual documents a combined clock editor. Its field-by-field sequence still needs keypad verification. Use the source page; no invented numeric shortcut is accepted.');
  }

  if (map.profileId === 'orisec-cp') {
    demoModel = 'Orisec CP-50 · MK-700';
    records.area=Array.from({length:5},(_,i)=>({id:String(i+1),label:'Area '+(i+1)}));
    roots = [
      {id:'engineer',label:'Engineer · INS008',role:'Engineer',edition:'INS008 (2018)',nodeIds:ids('engineer')},
      {id:'user',label:'User · INS023',role:'User',edition:'INS023 (2017)',nodeIds:ids('user')},
    ];
    defaultRootId='engineer';
    notes.push('CP-25/50/100 legacy menu baseline. Engineer top-level shortcut/order conflicts in INS008 remain marked. The programming00–24 and tests00–12 group numbers are documented.');
    put('engineer',{numericSelection:false,evidenceNote:'Top-level screen order needs matching firmware confirmation. FINDR follows manual chapter order and uses displayed names; conflicting shortcuts are disabled.'});
    const scopes={
      'program-zone-programming':'zone','program-area-options':'area','program-area-timers':'area','program-user-setup':'user','program-panel-outputs':'output','program-keypad-setup':'keypad','program-keypad-outputs':'output','program-expander-setup':'module','program-expander-outputs':'output','program-control-timers':'schedule','program-holiday-dates':'schedule','program-voice-messages':'message','program-arc-setup':'contact','program-fast-format-channels':'output','program-zx-5c-setup':'module','program-x10-outputs':'output','program-chain-setup':'link','program-remote-output-setup':'output'
    };
    for(const [id,scope] of Object.entries(scopes))selector(id,scope);
    put('program-zone-programming-zone-type',{bind:'zoneType'});
    text('program-zone-programming-zone-text',20,{bind:'zoneName',textMode:'orisec-picker',sourceRefs:[{sourceId:'ins008',printedPage:'45',pdfPage:45}],evidenceNote:'Zone text is20characters in INS008 p45; left/right selects a character, Enter adds it.'});
    text('program-area-options-area-text',20,{textMode:'orisec-picker',scope:'area',sourceRefs:[{sourceId:'ins008',printedPage:'45',pdfPage:45}]});
    text('program-user-setup-user-name',12,{textMode:'orisec-picker',scope:'user',sourceRefs:[{sourceId:'ins008',printedPage:'45',pdfPage:45}]});
    text('program-system-text-zone-text',20,{textMode:'orisec-picker',bind:'zoneName',selector:'zone',scope:'zone',valueKey:'program-zone-programming-zone-text'});
    text('program-system-text-area-text',20,{textMode:'orisec-picker',selector:'area',scope:'area',valueKey:'program-area-options-area-text'});
    text('program-system-text-user-name',12,{textMode:'orisec-picker',selector:'user',scope:'user',valueKey:'program-user-setup-user-name'});
    // Tick/cross option tables are independent bits. They are not mutually
    // exclusive enum values and the printed number is only a local flag index.
    const flagParents=[
      'program-zone-programming-zone-areas','program-zone-programming-zone-omit','program-zone-programming-zone-attributes',
      'program-system-options-system-standards','program-system-options-system-options','program-system-options-requirements','program-system-options-speaker-sounds','program-system-options-monitor-outputs','program-system-options-hardware-monitoring','program-system-options-radio-options',
      'program-area-options-area-attributes','program-area-options-arm-control','program-area-options-area-engineer-control','program-area-options-area-bell-control','program-area-options-key-control','program-area-options-timer-control','program-area-options-common-area','program-area-options-silent-exit',
      'program-user-setup-user-options','program-panel-outputs-output-attributes','program-panel-outputs-output-areas','program-keypad-setup-keypad-areas','program-keypad-setup-keypad-attributes','program-keypad-setup-keypad-sounds','program-keypad-setup-keypad-menus',
      'program-expander-setup-expander-areas','program-expander-setup-expander-attributes','program-expander-setup-expander-sounds','program-voice-messages-voice-message-options','program-arc-setup-protocol-options','program-arc-setup-reported','program-arc-setup-cancel','program-arc-setup-arc-area','program-fast-format-channels-type','program-fast-format-channels-attributes','program-fast-format-channels-fast-format-channel-area','program-udl-options-udl-options'
    ];
    for(const id of flagParents) {
      flags(id,{toggleKeys:['left','right']});
      eachChild(id,{mode:'choice',choices:copy(onOff)},n=>n.kind==='setting'&&!/reserved/i.test(n.label));
    }
    put('program-zone-programming-zone-omit-manual-omit',{bind:'zoneOmitEnabled'});
    if(overrides['program-zone-programming-zone-omit'])overrides['program-zone-programming-zone-omit'].choices=overrides['program-zone-programming-zone-omit'].choices.map(c=>c.id.endsWith('manual-omit')?{...c,bind:'zoneOmitEnabled'}:c);
    for(const n of children('program-system-options-system-timers')) {
      if(n.id.endsWith('abort-delay')||/beam-pair/.test(n.id)) {info(n.id,'INS008 has conflicting default/range or duplicate Beam Pair timer descriptions. The menu is retained; this value editor is held for a keypad/manual match.');continue;}
      number(n.id,0,127,'',{evidenceNote:'INS008 pp35–36:0–127. The unit is stated by the named timer; this emulator stores its numeric field.'});
    }
    eachChild('program-system-options-system-limits',{mode:'number',min:0,max:127});
    eachChild('program-system-options-volume-levels',{mode:'number',min:0,max:10});
    eachChild('program-system-options-current-limits-cp-50-and-cp-100',{mode:'number',min:0,max:2000,units:'mA'});
    eachChild('program-system-options-radio-timers',{mode:'number',min:0,max:127,evidenceNote:'INS008 p39:0–127. Omit changes seconds/minutes on the real panel; FINDR currently keeps the displayed unit fixed.'});
    eachChild('program-area-timers',{mode:'number',min:0,max:255,scope:'area',evidenceNote:'INS008 p44:0–255. Unit is field-dependent; Coms Delay has a contradictory printed unit.'});
    for(const n of children('program-panel-outputs').filter(n=>n.kind==='reference'&&children(n.id).some(c=>c.kind==='selection'))) put(n.id,{mode:'choice',include:true,choices:children(n.id).filter(c=>c.kind==='selection').map(c=>({id:c.id,label:c.label,code:c.code,value:c.label})),evidenceNote:'This selects an output function family/value within the chosen output. The function-selection screen layout is simplified.'});
    for(const id of ['program-keypad-outputs','program-expander-outputs']) {
      put(id,{children:ids('program-panel-outputs'),evidenceNote:'These outputs use the documented shared output function/attribute definitions. The record selector identifies a fictional output.'});
    }
    put('tests-test-bell-strobe',{mode:'outputs',outputs:['Bell','Strobe','Speaker','User Outputs'],toggleKeys:['left','right']});
    put('user-tests-test-bell-strobe',{mode:'outputs',outputs:['Bell','Strobe','Speaker','User Outputs'],toggleKeys:['left','right']});
    for(const id of ['tests-walk-test-zones','user-tests-walk-test-zones'])put(id,{mode:'walk',finishKey:'back'});
    for(const id of ['tests-view-zone-status','user-tests-view-zone-status'])put(id,{mode:'zones',numericSelection:false,showResistance:true,nameToggleKeys:['left','right'],evidenceNote:'Up/down selects zones. Direct numeric selection is unverified in this manual and is disabled.'});
    for(const n of nodes.filter(n=>/^logs-view-|^user-logs-view-/.test(n.id)))put(n.id,{mode:'log',detailsKey:'right',filter:n.id.includes('mandatory')?'mandatory':n.id.includes('chime')?'chime':null});
    put('user-omit',{mode:'omit',toggleKeys:['left','right'],finishKey:'back',numericSelection:false});
    action('user-full-arm','arm');action('user-part-arm','part-arm');
    action('user-area-full-arm','arm',{selector:'area'});action('user-area-part-arm','part-arm',{selector:'area'});action('user-area-disarm','unset',{selector:'area'});
    action('user-chime','chime');action('user-reset','reset');
    action('exit-menu','exit-programming');action('log-off','logout');action('user-exit','logout');
    put('user-settings',{mode:'info',include:true,evidenceNote:'The user guide shows Change settings, but does not map its submenu. A matching Master User Guide is still required.'});
    put('engineer-user-menu',{mode:'info',include:true,evidenceNote:'Choose the separate INS023 user session above to use its sourced user menus. The combined engineer-to-user transition needs a matching firmware capture.'});
    const clockFields={'time-hours':[0,23],'time-minutes':[0,59],'time-seconds':[0,59],'time-days':[1,31],'time-months':[1,12]};
    for(const [id,bounds] of Object.entries(clockFields))number(id,...bounds,'',{changeKeys:['left','right'],evidenceNote:'INS008 p73:up/down selects the clock field, left/right changes it. FINDR uses normal clock/calendar field limits; the combined calendar editor is simplified.'});
    info('time-years','The manual shows an adjustable Years field but does not state its accepted range. This boundary still needs a matching keypad check.');
  }

  applyGalaxyExtras(map,overrides);

  // Mark the limits at the screen where they matter, without making uncertainty
  // in one branch prevent using all of the documented neighboring menus.
  for(const gap of map.gaps||[]) for(const id of gap.affectedNodeIds||[]) {
    if(!byId.has(id))continue;
    const message=gap.summary||gap.description||gap.issue||gap.question||gap.title;
    if(message)put(id,{evidenceNote:[overrides[id]?.evidenceNote,message].filter(Boolean).join(' ')});
  }
  for(const [id,override] of Object.entries(overrides)) {
    if(!override.choices)continue;
    const counts=new Map();
    for(const item of override.choices)if(item.code!==undefined&&item.code!==null&&item.code!=='')counts.set(String(item.code),(counts.get(String(item.code))||0)+1);
    if([...counts.values()].some(count=>count>1)) {
      override.choices=override.choices.map(item=>counts.get(String(item.code))>1?{...item,code:null}:item);
      override.evidenceNote=[override.evidenceNote,'The source prints duplicate option numbers in this list. Scroll by label; the conflicting numeric shortcuts are disabled.'].filter(Boolean).join(' ');
    }
  }
  return {profileId:map.profileId,roots,defaultRootId,demoModel,records,overrides,notes,fixtureNotice:fixtureNote};
}

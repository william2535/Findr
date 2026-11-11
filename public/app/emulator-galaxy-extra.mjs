// Additional Galaxy Dimension interactions, checked against IE1-0063 Rev 1.0.
// PDF pages are one-based; body page 6-n is PDF n+74. Fixtures are not defaults.
export function applyGalaxyExtras(map, overrides) {
  if (map.profileId !== 'galaxy-dimension') return;
  const byId = new Map(map.nodes.map(n => [n.id, n]));
  const children = id => map.nodes.filter(n => n.parentId === id).sort((a,b) => a.order-b.order);
  const refs = pdfPage => [{sourceId:'installer',printedPage:'6-'+(pdfPage-74),pdfPage}];
  const put = (id, props, page) => {
    if (!byId.has(id)) throw new Error('Unknown Galaxy interaction '+id);
    overrides[id] = {...overrides[id],...props,...(page ? {sourceRefs:refs(page)} : {})};
  };
  const numeric = (id,min,max,units,page,extra={}) => put(id,{mode:'number',min,max,units,...extra},page);
  const text = (id,maxLength,page,extra={}) => put(id,{mode:'text',maxLength,...extra},page);
  const toggle = (id,page,extra={}) => put(id,{mode:'choice',choices:[
    {id:id+'.off',code:'0',label:'Off',value:false},
    {id:id+'.on',code:'1',label:'On',value:true},
  ],...extra},page);
  const groupFlags = (id,page,extra={}) => put(id,{mode:'flags',choices:[1,2,3,4].map(n=>({id:'group-'+n,code:String(n),label:'Group '+n,value:n})),evidenceNote:'The fictional site uses four groups. Larger Dimension panels use additional blocks. Group choice and conditional set-status modifiers are separate from this membership editor.',...extra},page);
  const clock = (id,page) => text(id,4,page,{format:'time',textMode:'digits'});

  // 23 is a scrolling information display, not fourteen successive submenus.
  const systemValues = ['4 demo groups','See demo panel','GD-48 demo','FINDR simulation','1 demo RIO','4 demo users','2 demo keypads','Demo modules','Virtual printer','2 demo readers','2 demo DCMs','None','FINDR TRAINING','Manual baseline'];
  const systemFields = children('galaxy-23');
  put('galaxy-23',{mode:'status',statusRows:systemFields.map((n,i)=>({label:n.label,value:systemValues[i]||'FINDR DEMO'})),evidenceNote:'A/B scrolls the documented information fields. Model, counts and identity strings are fictional; FINDR is not running Honeywell firmware.'},91);
  for (const [i,n] of systemFields.entries()) put(n.id,{mode:'status',displayLines:[n.label,systemValues[i]||'FINDR DEMO'],evidenceNote:'Fictional system-information value. These are fields in option23, not numbered submenus.'},91);

  // User-record fields are stored separately for each selected fictional user.
  text('galaxy-42.1.3',6,107,{saveKey:'back',cancelKey:'none',textEntry:'galaxy',evidenceNote:'A/B chooses characters, ent appends, * erases and esc saves. FINDR also offers a typing aid; the library-word dictionary is not replicated.'});
  numeric('galaxy-42.1.4',0,67,'schedule',107,{evidenceNote:'00 means no schedule. Schedule capacity depends on the panel variant; the emulator stores this assignment without enforcing timed login restrictions.'});
  numeric('galaxy-42.1.5',0,99,'days',108,{evidenceNote:'0 is permanent. The separate * PIN-change mode and midnight expiry process are not reproduced by this duration field.'});
  groupFlags('galaxy-42.1.6',109);
  text('galaxy-42.1.7',10,110,{textMode:'digits',minLength:10,evidenceNote:'A fictional10-digit card identity can be stored. Reader enrolment, dual-focus modifiers and access hardware are not connected.'});
  const menuFunctions = map.nodes.filter(n=>/^\d{2}$/.test(n.address||'')&&Number(n.address)>=11&&Number(n.address)<=71);
  put('galaxy-42.1.8',{mode:'choice',choices:[{id:'none',label:'Not Used',value:null},...menuFunctions.map(n=>({id:'function-'+n.code,label:n.label,code:n.code,value:n.code}))],evidenceNote:'Stores the selected user’s card-held menu assignment. A physical card-held action is not generated in FINDR.'},110);
  numeric('galaxy-42.2',1,28,'days',111);

  // Menu access uses a four-bit user-level mask. These are flags3–6, not menu IDs.
  for (const n of children('galaxy-68').filter(n=>n.kind==='setting')) {
    put(n.id,{mode:'flags',choices:[['3','2.3 User'],['4','2.4 User'],['5','2.5 User'],['6','3.6 Manager']].map(([code,label])=>({id:'level-'+code,code,label,value:code})),evidenceNote:'Digits3–6 toggle the documented access flags; ent saves. The training access-menu selector remains authorised independently of these stored masks.'},251);
  }

  // Scalar/flag parameters for which the manual states an explicit domain.
  toggle('galaxy-51.24',133,{selector:'group',scope:'group'});
  toggle('galaxy-51.26',134);
  toggle('galaxy-51.32',135);
  numeric('galaxy-51.30',1,9,'activations',135,{selector:'group',scope:'group'});

  // Internal Telecom fields. * and # are dial-control characters, not live calls.
  for (const id of ['galaxy-56.1.02','galaxy-56.1.05']) text(id,22,190,{textMode:'telephone',deleteKey:'previous',evidenceNote:'B erases a digit; * is a pause and # requests dial-tone detection on the real module. FINDR stores a fictional dial string and never dials it.'});
  text('galaxy-56.1.03',6,190,{textMode:'digits',deleteKey:'previous',evidenceNote:'The fictional account field stores up to6digits. Automatic propagation into all per-channel accounts is not simulated.'});
  clock('galaxy-56.1.07.1',191);
  numeric('galaxy-56.1.07.2',0,99,'hours',191);
  toggle('galaxy-56.1.07.3',191);
  numeric('galaxy-56.1.09',1,20,'rings',192);
  put('galaxy-56.1.16',{mode:'status',displayLines:['Force V.21','Not available'],evidenceNote:'The installer manual explicitly marks this option as not available. FINDR does not offer a setting editor for it.'},195);
  put('galaxy-56.5.16',{mode:'status',displayLines:['Force V.21','Not available'],evidenceNote:'External Telecom shares the internal structure except for Fail to Comm and Backup Module. Force V.21 is not available in this manual baseline.'},218);

  // The common format branches reuse the documented Status/Groups structure.
  // Codes remain in the current trigger context, not concatenated addresses.
  for (const n of map.nodes.filter(n=>n.id.startsWith('galaxy-56.')&&n.label==='Trigger Events'&&children(n.id).some(c=>['Status','Groups'].includes(c.label)))) {
    put(n.id,{mode:'menu',selector:'trigger',scope:'trigger',evidenceNote:'Choose a signalling trigger before editing its Status or Groups. Trigger values are fictional and no signalling transport is connected.'},188);
  }
  for (const n of map.nodes.filter(n=>n.id.startsWith('galaxy-56.1.01.')&&n.label==='Group Settings')) {
    put(n.id,{mode:'menu',selector:'group',scope:'group'},189);
  }
  for (const n of map.nodes) {
    if (!n.id.startsWith('galaxy-56.') || n.kind !== 'setting') continue;
    const parent = byId.get(n.parentId);
    if (parent?.label === 'Trigger Events' && n.label === 'Status') {
      toggle(n.id,188,{scope:'trigger',evidenceNote:'Edits the selected signalling trigger’s0/1status. This trains configuration only; there is no signalling transport.'});
    }
    if (parent?.label === 'Trigger Events' && n.label === 'Groups') {
      groupFlags(n.id,189,{scope:'trigger'});
    }
    if (n.id.startsWith('galaxy-56.1.01.') && parent?.label === 'Group Settings') {
      if (n.label === 'Telephone No.') text(n.id,22,189,{scope:'group',textMode:'telephone',deleteKey:'previous'});
      if (n.label === 'Account No.') text(n.id,6,189,{scope:'group',textMode:'digits',deleteKey:'previous'});
    }
  }

  // External Telecom uses the same basic scalar definitions, but a distinct store.
  for (const n of children('galaxy-56.5')) {
    // These are the two explicit exceptions on printed page 6-144.
    if (['11','15'].includes(String(n.code))) continue;
    const counterpart = 'galaxy-56.1.'+String(n.code).padStart(2,'0');
    const definition = overrides[counterpart];
    if (definition && ['number','text','choice'].includes(definition.mode) && !children(counterpart).some(c=>children(c.id).length)) {
      put(n.id,{...definition,evidenceNote:'External Telecom scalar field, documented as matching Internal Telecom. Values are stored independently. '+(definition.evidenceNote||'')});
    }
  }

  // Timing assignments: stored programming values, not a real-time scheduler.
  text('galaxy-65.1.1',12,243,{saveKey:'back',cancelKey:'none',textMode:'galaxy-picker'});
  numeric('galaxy-65.1.5',1,67,'schedule',244);
  numeric('galaxy-65.3.2.1',0,50,'minutes',246);
  numeric('galaxy-65.3.3',0,400,'minutes',246);
  toggle('galaxy-65.3.2.2',246);
  toggle('galaxy-65.3.4',246);
  toggle('galaxy-65.3.6',248);
  for (const id of ['galaxy-65.3.5','galaxy-65.3.7']) numeric(id,1,67,'schedule',id.endsWith('.5')?247:248);
  for (const id of ['galaxy-65.2.1.1','galaxy-65.2.2.1']) if(byId.has(id)) toggle(id,242);
  for (const id of ['galaxy-65.2.1.2','galaxy-65.2.2.2']) if(byId.has(id)) numeric(id,1,67,'schedule',242);

  // A virtual print preview makes print actions useful without a printer/module.
  for (const n of map.nodes.filter(n=>n.kind==='command'&&/^(galaxy-24\.|galaxy-57\.)/.test(n.id))) {
    put(n.id,{mode:'action',action:'print',reportTitle:n.label+' · fictional panel',evidenceNote:'Produces a FINDR text preview from the fictional panel. Real printer formatting, serial handshakes and ambiguous System Print10–13 ordering remain outside this simulation.'});
  }
}

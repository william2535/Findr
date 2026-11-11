// Menvier's source-reviewed node adapters live beside the factual menu map.
// These record lists and initial values are FINDR fixtures, never panel defaults.
const copy = value => JSON.parse(JSON.stringify(value));
const numbered = (count, label, width = 1) => Array.from({length:count}, (_, i) => ({id:String(i + 1).padStart(width, '0'), label:`${label} ${i + 1}`}));

export function getMenvierConfig(map, profile) {
  const children = id => map.nodes.filter(node => node.parentId === id).sort((a, b) => a.order - b.order);
  const overrides = {};
  for (const node of map.nodes) {
    const adapter = copy(node.simulation || {});
    const values = children(node.id).filter(child => child.kind === 'selection');
    if (['choice', 'flags'].includes(adapter.mode) && !adapter.choices) {
      const duplicateLabels = new Set(values.filter((value, i) => values.findIndex(other => other.label === value.label) !== i).map(value => value.label));
      adapter.choices = values.map(value => ({id:value.id, label:value.label, code:value.code,
        value:adapter.mode === 'flags' ? value.id : duplicateLabels.size ? String(value.code ?? value.id) : value.label}));
      if (duplicateLabels.size && adapter.mode === 'choice') {
        adapter.defaultValue = adapter.choices.find(value => value.label === adapter.defaultValue)?.value ?? adapter.choices[0]?.value;
      }
    }
    if (node.id === 'm-zone-attributes') adapter.choices = adapter.choices.map(value => value.id === 'm-zone-attributes-v3' ? {...value, bind:'zoneOmitEnabled'} : value);
    if (Object.keys(adapter).length) overrides[node.id] = adapter;
  }
  const put = (id, adapter) => { if (map.nodes.some(node => node.id === id)) overrides[id] = {...overrides[id], ...adapter}; };

  // The M750/M800 have physical outputs 1, 3 and 4 (Engineer p103).
  // Other banks use their own namespace; editing one bank must not edit another.
  put('m-e1.4.1', {recordIds:['1', '3', '4']});
  put('m-e1.4.2', {recordIds: numbered(8, 'Digi').map(record => record.id), evidenceNote:'Eight fictional hard-wired digital output records. The shared output-field chooser simplifies the conditional physical wizard.'});
  put('m-e1.4.3', {recordIds: numbered(16, 'Digi').map(record => record.id), conditions:['M800 only; the M750 has no on-board modem.'], evidenceNote:'Sixteen fictional M800 Fast Format outputs. Field editing does not send a report.'});
  put('m-e1.4.4', {recordIds:['1011', '1012'], evidenceNote:'Two fictional remote-device output records. Installed-device discovery is not simulated.'});
  put('m-e1.4.5', {recordIds:['1', '2', '3', '4'], evidenceNote:'Four fictional output-module records; attached hardware capacity is not inferred.'});
  put('m-e1.4.6', {selector:'customOutput', scope:'customOutput'});

  for (const id of ['m-e2.5.1.4', 'm-e2.5.1.5', 'm-e2.5.2', 'm-e2.5.3', 'm-e2.7.2.3']) {
    put(id, {conditions:['M800 only; this on-board modem feature is not available on M750.']});
  }
  for (const id of ['m-engineer-code', 'm-user-change-code']) put(id, {minLength:4, maxLength:4, textMode:'digits', evidenceNote:'The fictional site uses four-digit codes. No authentication is attempted and no factory credentials are supplied.'});
  for (const gap of map.gaps || []) for (const id of gap.affectedNodeIds || []) {
    put(id, {evidenceNote:[overrides[id]?.evidenceNote, gap.reason].filter(Boolean).join(' ')});
  }

  const roots = [
    {id:'m-engineer', label:'M750 / M800 engineer · 2006', role:'Engineer', edition:'496966 Issue 5 (2006)', commitOnExit:true, nodeIds:['m-e1', 'm-e2']},
    {id:'m-manager', label:'M800 manager · 2010', role:'Manager', edition:'11821957 (2010) · M800 only', commitOnExit:false, nodeIds:['m-u1', 'm-u2']},
  ];
  const records = {
    ward:numbered(4, 'Ward'), group:numbered(4, 'Group'),
    output:[...numbered(16, 'Output'), {id:'1011', label:'Remote 1 output 1'}, {id:'1012', label:'Remote 1 output 2'}],
    equipment:[{id:'101', label:'Remote keypad 1'}, {id:'102', label:'Remote keypad 2'}, {id:'201', label:'Fictional XNode'}],
    customOutput:numbered(8, 'Custom output'),
    shunt:numbered(4, 'Shunt group'), timeSwitch:numbered(3, 'Time switch'), autoSet:numbered(3, 'Auto-set'), codeLock:numbered(3, 'Code lock'),
    timeSwitchLater:numbered(5, 'Time switch', 2), autoSetLater:numbered(8, 'Auto-set', 2), codeLockLater:numbered(8, 'Code lock'), exception:numbered(30, 'Exception', 2),
    phone:numbered(4, 'Call-back number'), arc:numbered(3, 'ARC number'), account:numbered(8, 'Account'),
    telecommand:numbered(2, 'Demo telecommand'), tamper:numbered(2, 'Auxiliary tamper'),
  };
  const fixtureNotice = 'All names, devices, events, times, electrical readings and stored settings are fictional FINDR practice data. No connection to an alarm, radio, modem, ARC or downloader exists.';
  return {
    profileId:map.profileId, roots, defaultRootId:'m-engineer', demoModel:'Menvier M800 · classic M Series LCD', records, overrides,
    navigation:{menuNextKey:'next', menuPreviousKey:'previous', recordNextKey:'next', recordPreviousKey:'previous'},
    notes:[fixtureNotice,
      'The 2006 Engineer session covers M750/M800. The separate 2010 Manager session represents M800 only; it is not a matching M750 firmware claim.',
      'Use a local hotkey followed by ENT at each menu level. A path such as 2.7.3.4 is not one root-level four-digit shortcut.',
      'Free-text fields use a FINDR helper. Output source conditions, some calendar allocations, radio tests and hardware-dependent procedures are explicitly simplified at their screens.'],
    fixtureNotice,
  };
}

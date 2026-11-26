// Authored logic exercises use the generic lab engine. Manufacturer lessons below
// open existing, source-backed trainers; they are never graded by opening a link.
import {createProject, createSimulation, stepSimulation, evaluateSimulation} from './cause-effect-engine.mjs';

export const PRACTICE_SCOPE = 'Fictional training only. These matrix exercises teach logic, not an approved fire strategy or a manufacturer programming format. Panel lessons use their own documented controls and limits.';
const clone = value => JSON.parse(JSON.stringify(value));
const z = (id, label) => ({id, label, kind:'zone', notes:''});
const o = (id, label, kind='sounder') => ({id, label, kind, logic:'any', inputIds:[], delaySeconds:0, latching:false});

export const MATRIX_CHALLENGES = [
  {id:'either-zone', title:'One cause is enough', summary:'Wire two causes to one effect.', minutes:2, difficulty:'Start here',
    brief:'In this fictional board, either the reception or workshop alarm should run the practice sounder immediately. It should stop when both causes are clear.',
    requirements:['Either zone activates the sounder on its own.', 'No delay and no latch. Both causes clear means output off.'],
    hints:['Connect both zone rows to the sounder column.', 'Any means one or more selected causes. All means every selected cause.'],
    inputs:[z('z1','Reception'),z('z2','Workshop')], outputs:[o('o1','Practice sounder')]},
  {id:'selective-groups', title:'Send it to the right group', summary:'Keep three zones and two output groups distinct.', minutes:3, difficulty:'Foundation',
    brief:'Reception and workshop operate the lower-floor group. The upper-floor zone operates only the upper-floor group. All responses are immediate and non-latching.',
    requirements:['Reception or workshop activates Lower floor only.', 'Upper floor activates Upper floor only.', 'Clear causes return both groups to off.'],
    hints:['Only connect the rows named in each output’s requirement.', 'Use Any for the lower-floor group. One cause is enough.'],
    inputs:[z('z1','Reception'),z('z2','Workshop'),z('z3','Upper floor')], outputs:[o('o1','Lower floor'),o('o2','Upper floor')]},
  {id:'coincidence', title:'Wait for both', summary:'Build and test an AND condition.', minutes:3, difficulty:'Foundation',
    brief:'This generic logic exercise requires both test zones at once before a practice relay activates. One zone on its own must leave the relay off. Clearing either zone releases it.',
    requirements:['Neither single zone is enough.', 'Both zones together activate the relay immediately.', 'No latch: clearing either cause releases the relay.'],
    hints:['Select both rows and choose All.', 'This teaches Boolean logic. It does not establish that coincidence is suitable or compliant on an installed fire system.'],
    inputs:[z('z1','Test zone A'),z('z2','Test zone B')], outputs:[o('o1','Practice relay','relay')]},
  {id:'restart-delay', title:'A delay that starts again', summary:'Learn what happens when a cause clears mid-timer.', minutes:4, difficulty:'Build confidence',
    brief:'Keep the test input active for ten continuous seconds before running the practice output. If it clears early, cancel the timer. A new activation must wait the full ten seconds again.',
    requirements:['Off before ten seconds; on at ten seconds.', 'Clearing the cause cancels the delay.', 'A new activation starts a fresh ten-second delay.', 'No latch: output follows the matured cause.'],
    hints:['Set the output delay to 10 seconds.', 'The lab clock advances only when you press an advance-time control. It is not real elapsed site time.'],
    inputs:[z('z1','Test input')], outputs:[o('o1','Delayed practice output','other')]},
  {id:'retain-until-reset', title:'Remember the event', summary:'Make a latched output and prove restoration.', minutes:4, difficulty:'Build confidence',
    brief:'Either test zone activates the practice relay immediately. Keep it active when both causes clear, until a reset. A reset while a cause is still present must not remove the effect.',
    requirements:['Either zone activates the relay.', 'Clearing all causes leaves it latched on.', 'Reset with a clear board releases it.', 'Reset with an active cause leaves it on.'],
    hints:['Select both rows, choose Any, and turn on Latch.', 'A clear input and a reset are two different events.'],
    inputs:[z('z1','Test zone A'),z('z2','Test zone B')], outputs:[o('o1','Latched practice relay','relay')]},
  {id:'two-stages', title:'One cause, two stages', summary:'Separate an immediate effect from a delayed effect.', minutes:5, difficulty:'Stretch',
    brief:'Either test zone starts Stage one immediately and Stage two after twenty continuous seconds. Both groups are non-latching and must stop when their causes clear.',
    requirements:['Either zone starts Stage one at once.', 'Stage two stays off before twenty seconds and then starts.', 'Clearing all causes stops both stages and cancels a pending timer.'],
    hints:['Both outputs need the same selected causes and Any logic.', 'The delay belongs to each output group. Leave Stage one at zero and set Stage two to 20 seconds.'],
    inputs:[z('z1','Test zone A'),z('z2','Test zone B')], outputs:[o('o1','Stage one'),o('o2','Stage two')]},
  {id:'mixed-logic', title:'Bring the board together', summary:'Three effects, three different rules.', minutes:5, difficulty:'Challenge',
    brief:'Any of the three zones starts the practice sounder immediately. Zones A and B together start a latched relay after five continuous seconds. The plant zone alone starts a non-latching interface after ten seconds.',
    requirements:['Practice sounder: Any of all three zones, immediate, non-latching.', 'Coincidence relay: zones A AND B, five-second delay, latched.', 'Plant interface: plant zone only, ten-second delay, non-latching.', 'Clearing all causes stops the sounder and interface; reset then releases the relay.'],
    hints:['Read one output column at a time.', 'Only the relay needs All logic and Latch. Do not connect the plant row to that relay.'],
    inputs:[z('z1','Zone A'),z('z2','Zone B'),z('z3','Plant zone')], outputs:[o('o1','Practice sounder'),o('o2','Coincidence relay','relay'),o('o3','Plant interface','interface')]},
];

export function getChallenge(id) { return MATRIX_CHALLENGES.find(item => item.id===id) || null; }

export function createChallengeProject(id) {
  const challenge=getChallenge(id);
  if(!challenge) throw new Error('That practice challenge is not available.');
  return {...createProject({name:challenge.title,template:'blank'}), inputs:clone(challenge.inputs), outputs:clone(challenge.outputs), notes:challenge.brief+'\n\n'+PRACTICE_SCOPE};
}

const input=(id,active=true)=>({type:'input',id,active});
const wait=seconds=>({type:'advance',seconds});
const reset={type:'reset'};
// Each assertion starts from a fresh board. Grades come from the simulated
// behaviour, not from checking that the learner clicked a particular control.
function observe(project, actions) {
  let state=createSimulation(project);
  for(const action of actions) state=stepSimulation(project,state,action);
  return evaluateSimulation(project,state).outputs;
}

export function gradeChallenge(id, project) {
  const challenge=getChallenge(id);
  if(!challenge) return {passed:false,checks:[],summary:'That practice challenge is not available.'};
  const checks=[];
  const test=(label, actions, expected, detail)=>{
    try {
      const actual=observe(project,actions);
      const passed=Object.entries(expected).every(([outputId,value])=>actual.find(item=>item.id===outputId)?.active===value);
      checks.push({label,passed,detail:passed?'Expected output state reached.':detail});
    } catch { checks.push({label,passed:false,detail:'The board could not be simulated. Check its rows, columns and settings.'}); }
  };
  const shape=project && Array.isArray(project.inputs) && Array.isArray(project.outputs)
    && project.inputs.length===challenge.inputs.length && project.outputs.length===challenge.outputs.length
    && challenge.inputs.every(item=>project.inputs.some(p=>p?.id===item.id)) && challenge.outputs.every(item=>project.outputs.some(p=>p?.id===item.id));
  checks.push({label:'Keep the challenge’s test points',passed:!!shape,detail:shape?'The original rows and groups are available.':'Start this challenge again if you removed its original rows or columns. Renaming them is fine.'});
  if(!shape) return {passed:false,checks,summary:'Restore the challenge board before checking its behaviour.'};
  test('Clear board stays off',[],Object.fromEntries(project.outputs.map(item=>[item.id,false])),'With every cause clear, all effects should be off.');
  if(id==='either-zone'||id==='retain-until-reset') {
    for(const zone of ['z1','z2']) test(`${zone==='z1'?'First':'Second'} zone works on its own`,[input(zone)],{o1:true},'Connect both zones and use Any, with no delay.');
    if(id==='either-zone') test('Last clear cause releases the output',[input('z1'),input('z2'),input('z1',false),input('z2',false)],{o1:false},'Turn Latch off. The output must stop when both causes clear.');
    else {
      test('Cleared cause leaves a latched output',[input('z1'),input('z1',false)],{o1:true},'Enable Latch so a matured event remains until a valid reset.');
      test('Reset releases a clear latched board',[input('z1'),input('z1',false),reset],{o1:false},'A reset should release the output once its cause is clear.');
      test('Reset cannot hide an active cause',[input('z2'),reset],{o1:true},'Reset must leave the active cause’s output on.');
    }
  }
  if(id==='selective-groups') {
    for(const zone of ['z1','z2']) test(`${zone==='z1'?'Reception':'Workshop'} selects Lower floor only`,[input(zone)],{o1:true,o2:false},'Connect Reception and Workshop to Lower floor only, with Any and no delay.');
    test('Upper floor selects its own group',[input('z3')],{o1:false,o2:true},'Connect Upper floor only to the Upper floor output.');
    test('Cleared causes release both groups',[input('z1'),input('z3'),input('z1',false),input('z3',false)],{o1:false,o2:false},'Use non-latching outputs for this exercise.');
  }
  if(id==='coincidence') {
    for(const zone of ['z1','z2']) test(`${zone==='z1'?'A':'B'} alone is not enough`,[input(zone)],{o1:false},'Both zones must be selected and All must be chosen.');
    test('Both causes activate the relay',[input('z1'),input('z2')],{o1:true},'Select both zones, choose All, and leave delay at zero.');
    for(const zone of ['z1','z2']) test(`Clearing ${zone==='z1'?'A':'B'} releases the relay`,[input('z1'),input('z2'),input(zone,false)],{o1:false},'This exercise requires a non-latching relay.');
  }
  if(id==='restart-delay') {
    test('Still off at nine seconds',[input('z1'),wait(9)],{o1:false},'Use a ten-second delay, not immediate activation.');
    test('Active at ten seconds',[input('z1'),wait(10)],{o1:true},'Connect the input and set delay to exactly ten seconds.');
    test('Clear cancels a pending timer',[input('z1'),wait(6),input('z1',false),wait(10)],{o1:false},'A cleared cause must not later activate the output.');
    test('Fresh cause waits again',[input('z1'),wait(6),input('z1',false),input('z1'),wait(9)],{o1:false},'The new cause needs a fresh full delay.');
    test('Fresh delay can finish',[input('z1'),wait(6),input('z1',false),input('z1'),wait(10)],{o1:true},'The restarted timer should mature at ten seconds.');
    test('Clear releases a matured output',[input('z1'),wait(10),input('z1',false)],{o1:false},'Leave Latch off for this exercise.');
  }
  if(id==='two-stages') {
    for(const zone of ['z1','z2']) {
      test(`${zone==='z1'?'A':'B'} starts only Stage one`,[input(zone)],{o1:true,o2:false},'Connect either cause to both groups. Only Stage two has a delay.');
      test(`${zone==='z1'?'A':'B'} leaves Stage two pending at nineteen seconds`,[input(zone),wait(19)],{o1:true,o2:false},'Stage two needs a twenty-second delay.');
      test(`${zone==='z1'?'A':'B'} starts both stages by twenty seconds`,[input(zone),wait(20)],{o1:true,o2:true},'Use Any for both groups and a twenty-second delay only on Stage two.');
    }
    test('Clear releases both matured stages',[input('z1'),wait(20),input('z1',false)],{o1:false,o2:false},'Both stages are non-latching in this exercise.');
    test('Clear cancels Stage two',[input('z2'),wait(10),input('z2',false),wait(20)],{o1:false,o2:false},'The second stage must not run after the original cause clears.');
  }
  if(id==='mixed-logic') {
    for(const zone of ['z1','z2','z3']) test(`${zone==='z3'?'Plant':zone==='z1'?'A':'B'} starts the immediate sounder`,[input(zone)],{o1:true,o2:false,o3:false},'Any zone starts the sounder; the other two outputs have separate conditions and delays.');
    test('A alone never qualifies the relay',[input('z1'),wait(20)],{o1:true,o2:false,o3:false},'Use All for the relay and select only A and B.');
    test('B alone never qualifies the relay',[input('z2'),wait(20)],{o1:true,o2:false,o3:false},'The relay requires both A and B.');
    test('Relay is pending before five seconds',[input('z1'),input('z2'),wait(4)],{o1:true,o2:false,o3:false},'Set the relay delay to five seconds.');
    test('Pair activates the relay at five seconds',[input('z1'),input('z2'),wait(5)],{o1:true,o2:true,o3:false},'Both A and B must qualify the relay, without the Plant zone.');
    test('Plant interface is pending at nine seconds',[input('z3'),wait(9)],{o1:true,o2:false,o3:false},'The Plant interface delay is ten seconds.');
    test('Plant interface runs at ten seconds',[input('z3'),wait(10)],{o1:true,o2:false,o3:true},'Connect Plant only to the interface, with a ten-second delay.');
    const all=[input('z1'),input('z2'),input('z3'),wait(10),input('z1',false),input('z2',false),input('z3',false)];
    test('Only the relay remains latched after clearing',all,{o1:false,o2:true,o3:false},'Latch the relay only. The sounder and interface should release.');
    test('Reset restores the cleared board',[...all,reset],{o1:false,o2:false,o3:false},'The final reset should release the cleared, latched relay.');
  }
  const passed=checks.every(check=>check.passed);
  return {passed,checks,summary:passed?'That works. Every checked scenario behaved as requested.':'Nearly there. Use the failed checks to decide what to change.'};
}

// PANEL_LESSONS is generated below from the already reviewed menu-map records.

export const PANEL_LESSONS = [
  {
    "id": "cfp-cover-engineering",
    "title": "Remove the cover and enter level 3",
    "panel": "C-TEC CFP Standard",
    "summary": "Use the actual internal SW8 control and Escape Access. Removing the cover alone does not enter engineering access.",
    "minutes": 3,
    "route": "#fire-panel/c-tec-cfp-standard/coach/cfp-cover-engineering",
    "sourceMapId": "c-tec-cfp-standard",
    "sourceNodeId": "lesson-cfp-cover-engineering",
    "scope": "Eight-zone CFP Standard front fascia and Main Control PCB — DFU7001020 Rev 2 / DFU7004010 Rev 1",
    "sources": [
      {
        "sourceId": "cfp-engineer-rev1",
        "title": "CFP 2/4/8 Zone Fire Alarm Control Panel — Installation & Maintenance Manual",
        "recordId": "c-tec-4b1267f3fefc",
        "edition": "DFU7004010 · Rev 1",
        "url": "https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/CFP%202%2C4%2C8%20zone%20conventional%20fire%20panel%20manual.pdf",
        "pdfPage": 16,
        "printedPage": "16"
      },
      {
        "sourceId": "cfp-engineer-rev1",
        "title": "CFP 2/4/8 Zone Fire Alarm Control Panel — Installation & Maintenance Manual",
        "recordId": "c-tec-4b1267f3fefc",
        "edition": "DFU7004010 · Rev 1",
        "url": "https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/CFP%202%2C4%2C8%20zone%20conventional%20fire%20panel%20manual.pdf",
        "pdfPage": 17,
        "printedPage": "17"
      }
    ],
    "completion": "The existing trainer checks the actual practice steps and keeps its own progress. Opening this lesson does not mark it complete."
  },
  {
    "id": "cfp-engineering-delays",
    "title": "Set zone/output delays and the VR1 period",
    "panel": "C-TEC CFP Standard",
    "summary": "Practise the documented zones → Remote → Auxiliary sequence and VR1 range. These are fictional stored settings, not approval to change an installed system.",
    "minutes": 5,
    "route": "#fire-panel/c-tec-cfp-standard/coach/cfp-engineering-delays",
    "sourceMapId": "c-tec-cfp-standard",
    "sourceNodeId": "lesson-cfp-engineering-delays",
    "scope": "Eight-zone CFP Standard front fascia and Main Control PCB — DFU7001020 Rev 2 / DFU7004010 Rev 1",
    "sources": [
      {
        "sourceId": "cfp-engineer-rev1",
        "title": "CFP 2/4/8 Zone Fire Alarm Control Panel — Installation & Maintenance Manual",
        "recordId": "c-tec-4b1267f3fefc",
        "edition": "DFU7004010 · Rev 1",
        "url": "https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/CFP%202%2C4%2C8%20zone%20conventional%20fire%20panel%20manual.pdf",
        "pdfPage": 15,
        "printedPage": "15"
      },
      {
        "sourceId": "cfp-engineer-rev1",
        "title": "CFP 2/4/8 Zone Fire Alarm Control Panel — Installation & Maintenance Manual",
        "recordId": "c-tec-4b1267f3fefc",
        "edition": "DFU7004010 · Rev 1",
        "url": "https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/CFP%202%2C4%2C8%20zone%20conventional%20fire%20panel%20manual.pdf",
        "pdfPage": 16,
        "printedPage": "16"
      },
      {
        "sourceId": "cfp-engineer-rev1",
        "title": "CFP 2/4/8 Zone Fire Alarm Control Panel — Installation & Maintenance Manual",
        "recordId": "c-tec-4b1267f3fefc",
        "edition": "DFU7004010 · Rev 1",
        "url": "https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/CFP%202%2C4%2C8%20zone%20conventional%20fire%20panel%20manual.pdf",
        "pdfPage": 17,
        "printedPage": "17"
      }
    ],
    "completion": "The existing trainer checks the actual practice steps and keeps its own progress. Opening this lesson does not mark it complete."
  },
  {
    "id": "cfp-engineering-resound",
    "title": "Choose whether a new zone resounds",
    "panel": "C-TEC CFP Standard",
    "summary": "Sounder Status uses three quick flashes then a longer gap for resound, and equal on/off periods for no resound. The toggle is direct in this function.",
    "minutes": 4,
    "route": "#fire-panel/c-tec-cfp-standard/coach/cfp-engineering-resound",
    "sourceMapId": "c-tec-cfp-standard",
    "sourceNodeId": "lesson-cfp-engineering-resound",
    "scope": "Eight-zone CFP Standard front fascia and Main Control PCB — DFU7001020 Rev 2 / DFU7004010 Rev 1",
    "sources": [
      {
        "sourceId": "cfp-engineer-rev1",
        "title": "CFP 2/4/8 Zone Fire Alarm Control Panel — Installation & Maintenance Manual",
        "recordId": "c-tec-4b1267f3fefc",
        "edition": "DFU7004010 · Rev 1",
        "url": "https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/CFP%202%2C4%2C8%20zone%20conventional%20fire%20panel%20manual.pdf",
        "pdfPage": 16,
        "printedPage": "16"
      },
      {
        "sourceId": "cfp-engineer-rev1",
        "title": "CFP 2/4/8 Zone Fire Alarm Control Panel — Installation & Maintenance Manual",
        "recordId": "c-tec-4b1267f3fefc",
        "edition": "DFU7004010 · Rev 1",
        "url": "https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/CFP%202%2C4%2C8%20zone%20conventional%20fire%20panel%20manual.pdf",
        "pdfPage": 17,
        "printedPage": "17"
      }
    ],
    "completion": "The existing trainer checks the actual practice steps and keeps its own progress. Opening this lesson does not mark it complete."
  },
  {
    "id": "sigma-cover-engineering",
    "title": "Open the cover and review level 3",
    "panel": "Kentec Sigma CP",
    "summary": "Use the actual Write Enable switch aperture, review the source codes and leave it OFF. Cover movement alone does not change access.",
    "minutes": 3,
    "route": "#fire-panel/kentec-sigma-cp/coach/sigma-cover-engineering",
    "sourceMapId": "kentec-sigma-cp",
    "sourceNodeId": "lesson-sigma-cover-engineering",
    "scope": "K11080M2 eight-zone K-series; sigma_CP 214.hex or later warning scope — Man-1078 Issue 25",
    "sources": [
      {
        "sourceId": "sigma-main-25",
        "title": "Sigma CP (K and T Series) — Operation and Maintenance Manual",
        "recordId": "kentec-0d82d93522c3",
        "edition": "Man-1078 · Issue 25, April 2024",
        "url": "https://kentec.co.uk/wp-content/uploads/2018/08/Man-1078_SigmaCP_25.pdf",
        "pdfPage": 16,
        "printedPage": "16"
      },
      {
        "sourceId": "sigma-main-25",
        "title": "Sigma CP (K and T Series) — Operation and Maintenance Manual",
        "recordId": "kentec-0d82d93522c3",
        "edition": "Man-1078 · Issue 25, April 2024",
        "url": "https://kentec.co.uk/wp-content/uploads/2018/08/Man-1078_SigmaCP_25.pdf",
        "pdfPage": 19,
        "printedPage": "19"
      }
    ],
    "completion": "The existing trainer checks the actual practice steps and keeps its own progress. Opening this lesson does not mark it complete."
  },
  {
    "id": "sigma-configure-delay",
    "title": "Set a detector delay and activate Ad",
    "panel": "Kentec Sigma CP",
    "summary": "Set a one-minute common sounder delay for fictional zone 1 detector input, activate it using Ad, and restore the training baseline. This does not delay call points unless their own delay option is selected.",
    "minutes": 5,
    "route": "#fire-panel/kentec-sigma-cp/coach/sigma-configure-delay",
    "sourceMapId": "kentec-sigma-cp",
    "sourceNodeId": "lesson-sigma-configure-delay",
    "scope": "K11080M2 eight-zone K-series; sigma_CP 214.hex or later warning scope — Man-1078 Issue 25",
    "sources": [
      {
        "sourceId": "sigma-main-25",
        "title": "Sigma CP (K and T Series) — Operation and Maintenance Manual",
        "recordId": "kentec-0d82d93522c3",
        "edition": "Man-1078 · Issue 25, April 2024",
        "url": "https://kentec.co.uk/wp-content/uploads/2018/08/Man-1078_SigmaCP_25.pdf",
        "pdfPage": 15,
        "printedPage": "15"
      },
      {
        "sourceId": "sigma-main-25",
        "title": "Sigma CP (K and T Series) — Operation and Maintenance Manual",
        "recordId": "kentec-0d82d93522c3",
        "edition": "Man-1078 · Issue 25, April 2024",
        "url": "https://kentec.co.uk/wp-content/uploads/2018/08/Man-1078_SigmaCP_25.pdf",
        "pdfPage": 16,
        "printedPage": "16"
      },
      {
        "sourceId": "sigma-main-25",
        "title": "Sigma CP (K and T Series) — Operation and Maintenance Manual",
        "recordId": "kentec-0d82d93522c3",
        "edition": "Man-1078 · Issue 25, April 2024",
        "url": "https://kentec.co.uk/wp-content/uploads/2018/08/Man-1078_SigmaCP_25.pdf",
        "pdfPage": 17,
        "printedPage": "17"
      },
      {
        "sourceId": "sigma-main-25",
        "title": "Sigma CP (K and T Series) — Operation and Maintenance Manual",
        "recordId": "kentec-0d82d93522c3",
        "edition": "Man-1078 · Issue 25, April 2024",
        "url": "https://kentec.co.uk/wp-content/uploads/2018/08/Man-1078_SigmaCP_25.pdf",
        "pdfPage": 19,
        "printedPage": "19"
      },
      {
        "sourceId": "sigma-main-25",
        "title": "Sigma CP (K and T Series) — Operation and Maintenance Manual",
        "recordId": "kentec-0d82d93522c3",
        "edition": "Man-1078 · Issue 25, April 2024",
        "url": "https://kentec.co.uk/wp-content/uploads/2018/08/Man-1078_SigmaCP_25.pdf",
        "pdfPage": 23,
        "printedPage": "23"
      }
    ],
    "completion": "The existing trainer checks the actual practice steps and keeps its own progress. Opening this lesson does not mark it complete."
  },
  {
    "id": "installer-access",
    "title": "Enter installer access and unlock memory",
    "panel": "C-TEC XFP",
    "summary": "Use the level-3 code, then open the training cover and fit the NVM link.",
    "minutes": 3,
    "route": "#xfp/coach/installer-access",
    "sourceMapId": "xfp",
    "sourceNodeId": "lesson-installer-access",
    "scope": "DFU2200510 Rev 2 · DFU1200510 Rev 3",
    "sources": [
      {
        "sourceId": "xfp32",
        "title": "XFP 1 or 2 Loop 32 Zone Engineering Manual",
        "recordId": "c-tec-b03be75d8eb7",
        "edition": "DFU2200510 Rev 2",
        "url": "https://c-tec.com/download?wpdmdl=12095",
        "pdfPage": 21,
        "printedPage": "21"
      },
      {
        "sourceId": "xfp16",
        "title": "XFP Single Loop 16 Zone Engineering Manual",
        "recordId": "c-tec-6a8ae5ddd7bc",
        "edition": "DFU1200510 Rev 3",
        "url": "https://c-tec.com/download?wpdmdl=12092",
        "pdfPage": 21,
        "printedPage": "21"
      },
      {
        "sourceId": "xfp32",
        "title": "XFP 1 or 2 Loop 32 Zone Engineering Manual",
        "recordId": "c-tec-b03be75d8eb7",
        "edition": "DFU2200510 Rev 2",
        "url": "https://c-tec.com/download?wpdmdl=12095",
        "pdfPage": 18,
        "printedPage": "18"
      }
    ],
    "completion": "The existing trainer checks the actual practice steps and keeps its own progress. Opening this lesson does not mark it complete."
  },
  {
    "id": "find-new-device",
    "title": "Accept a newly connected detector",
    "panel": "C-TEC XFP",
    "summary": "Find the explicit fictional new detector and assign its input zone; PC programming remains separate.",
    "minutes": 5,
    "route": "#xfp/coach/find-new-device",
    "sourceMapId": "xfp",
    "sourceNodeId": "lesson-find-new-device",
    "scope": "DFU2200510 Rev 2 · DFU1200510 Rev 3",
    "sources": [
      {
        "sourceId": "xfp32",
        "title": "XFP 1 or 2 Loop 32 Zone Engineering Manual",
        "recordId": "c-tec-b03be75d8eb7",
        "edition": "DFU2200510 Rev 2",
        "url": "https://c-tec.com/download?wpdmdl=12095",
        "pdfPage": 18,
        "printedPage": "18"
      },
      {
        "sourceId": "xfp32",
        "title": "XFP 1 or 2 Loop 32 Zone Engineering Manual",
        "recordId": "c-tec-b03be75d8eb7",
        "edition": "DFU2200510 Rev 2",
        "url": "https://c-tec.com/download?wpdmdl=12095",
        "pdfPage": 22,
        "printedPage": "22"
      },
      {
        "sourceId": "xfp16",
        "title": "XFP Single Loop 16 Zone Engineering Manual",
        "recordId": "c-tec-6a8ae5ddd7bc",
        "edition": "DFU1200510 Rev 3",
        "url": "https://c-tec.com/download?wpdmdl=12092",
        "pdfPage": 22,
        "printedPage": "22"
      }
    ],
    "completion": "The existing trainer checks the actual practice steps and keeps its own progress. Opening this lesson does not mark it complete."
  },
  {
    "id": "assign-device",
    "title": "Assign a detector to zone 2",
    "panel": "C-TEC XFP",
    "summary": "Make a basic input-zone assignment in the fictional database.",
    "minutes": 4,
    "route": "#xfp/coach/assign-device",
    "sourceMapId": "xfp",
    "sourceNodeId": "lesson-assign-device",
    "scope": "DFU2200510 Rev 2 · DFU1200510 Rev 3",
    "sources": [
      {
        "sourceId": "xfp32",
        "title": "XFP 1 or 2 Loop 32 Zone Engineering Manual",
        "recordId": "c-tec-b03be75d8eb7",
        "edition": "DFU2200510 Rev 2",
        "url": "https://c-tec.com/download?wpdmdl=12095",
        "pdfPage": 18,
        "printedPage": "18"
      },
      {
        "sourceId": "xfp32",
        "title": "XFP 1 or 2 Loop 32 Zone Engineering Manual",
        "recordId": "c-tec-b03be75d8eb7",
        "edition": "DFU2200510 Rev 2",
        "url": "https://c-tec.com/download?wpdmdl=12095",
        "pdfPage": 23,
        "printedPage": "23"
      },
      {
        "sourceId": "xfp16",
        "title": "XFP Single Loop 16 Zone Engineering Manual",
        "recordId": "c-tec-6a8ae5ddd7bc",
        "edition": "DFU1200510 Rev 3",
        "url": "https://c-tec.com/download?wpdmdl=12092",
        "pdfPage": 23,
        "printedPage": "23"
      }
    ],
    "completion": "The existing trainer checks the actual practice steps and keeps its own progress. Opening this lesson does not mark it complete."
  },
  {
    "id": "engineer-access",
    "title": "Enter installer level 3 and protect programming",
    "panel": "Fike TWINFLEXpro²",
    "summary": "Normal access; Write Enable OFF; no System Fault reminder.",
    "minutes": 3,
    "route": "#twinflex/coach/engineer-access",
    "sourceMapId": "twinflex",
    "sourceNodeId": "lesson-engineer-access",
    "scope": "Doc. 26-0959 Rev.18 · October 2020 · V3.00+ · Doc.26-1028 Rev.5 · V3.00+",
    "sources": [
      {
        "sourceId": "twinflex-pro2-engineer-18",
        "title": "TWINFLEXpro² Control Panel Engineering and Commissioning Manual",
        "recordId": "fike-6cfbefcbbb78",
        "edition": "Doc. 26-0959 Rev.18 · October 2020 · V3.00+",
        "url": "https://my.fike.com/_fike_docs/New_Docs_System/Fire%20Protection/Fire%20Detection%20&%20Control/TwinflexPro/Conventional%20Control%20Panels/Manuals/TWINFLEXpro%20Panel%20Eng&ComManual%2026-0959-18.pdf",
        "pdfPage": 24,
        "printedPage": "24"
      }
    ],
    "completion": "The existing trainer checks the actual practice steps and keeps its own progress. Opening this lesson does not mark it complete."
  },
  {
    "id": "output-delay",
    "title": "Program and verify a zone output delay",
    "panel": "Fike TWINFLEXpro²",
    "summary": "Cover refitted; switch remains OFF.",
    "minutes": 5,
    "route": "#twinflex/coach/output-delay",
    "sourceMapId": "twinflex",
    "sourceNodeId": "lesson-output-delay",
    "scope": "Doc. 26-0959 Rev.18 · October 2020 · V3.00+ · Doc.26-1028 Rev.5 · V3.00+",
    "sources": [
      {
        "sourceId": "twinflex-pro2-engineer-18",
        "title": "TWINFLEXpro² Control Panel Engineering and Commissioning Manual",
        "recordId": "fike-6cfbefcbbb78",
        "edition": "Doc. 26-0959 Rev.18 · October 2020 · V3.00+",
        "url": "https://my.fike.com/_fike_docs/New_Docs_System/Fire%20Protection/Fire%20Detection%20&%20Control/TwinflexPro/Conventional%20Control%20Panels/Manuals/TWINFLEXpro%20Panel%20Eng&ComManual%2026-0959-18.pdf",
        "pdfPage": 24,
        "printedPage": "24"
      },
      {
        "sourceId": "twinflex-pro2-engineer-18",
        "title": "TWINFLEXpro² Control Panel Engineering and Commissioning Manual",
        "recordId": "fike-6cfbefcbbb78",
        "edition": "Doc. 26-0959 Rev.18 · October 2020 · V3.00+",
        "url": "https://my.fike.com/_fike_docs/New_Docs_System/Fire%20Protection/Fire%20Detection%20&%20Control/TwinflexPro/Conventional%20Control%20Panels/Manuals/TWINFLEXpro%20Panel%20Eng&ComManual%2026-0959-18.pdf",
        "pdfPage": 33,
        "printedPage": "33"
      },
      {
        "sourceId": "twinflex-pro2-engineer-18",
        "title": "TWINFLEXpro² Control Panel Engineering and Commissioning Manual",
        "recordId": "fike-6cfbefcbbb78",
        "edition": "Doc. 26-0959 Rev.18 · October 2020 · V3.00+",
        "url": "https://my.fike.com/_fike_docs/New_Docs_System/Fire%20Protection/Fire%20Detection%20&%20Control/TwinflexPro/Conventional%20Control%20Panels/Manuals/TWINFLEXpro%20Panel%20Eng&ComManual%2026-0959-18.pdf",
        "pdfPage": 42,
        "printedPage": "42"
      },
      {
        "sourceId": "twinflex-pro2-engineer-18",
        "title": "TWINFLEXpro² Control Panel Engineering and Commissioning Manual",
        "recordId": "fike-6cfbefcbbb78",
        "edition": "Doc. 26-0959 Rev.18 · October 2020 · V3.00+",
        "url": "https://my.fike.com/_fike_docs/New_Docs_System/Fire%20Protection/Fire%20Detection%20&%20Control/TwinflexPro/Conventional%20Control%20Panels/Manuals/TWINFLEXpro%20Panel%20Eng&ComManual%2026-0959-18.pdf",
        "pdfPage": 43,
        "printedPage": "43"
      },
      {
        "sourceId": "twinflex-pro2-engineer-18",
        "title": "TWINFLEXpro² Control Panel Engineering and Commissioning Manual",
        "recordId": "fike-6cfbefcbbb78",
        "edition": "Doc. 26-0959 Rev.18 · October 2020 · V3.00+",
        "url": "https://my.fike.com/_fike_docs/New_Docs_System/Fire%20Protection/Fire%20Detection%20&%20Control/TwinflexPro/Conventional%20Control%20Panels/Manuals/TWINFLEXpro%20Panel%20Eng&ComManual%2026-0959-18.pdf",
        "pdfPage": 44,
        "printedPage": "44"
      },
      {
        "sourceId": "twinflex-pro2-engineer-18",
        "title": "TWINFLEXpro² Control Panel Engineering and Commissioning Manual",
        "recordId": "fike-6cfbefcbbb78",
        "edition": "Doc. 26-0959 Rev.18 · October 2020 · V3.00+",
        "url": "https://my.fike.com/_fike_docs/New_Docs_System/Fire%20Protection/Fire%20Detection%20&%20Control/TwinflexPro/Conventional%20Control%20Panels/Manuals/TWINFLEXpro%20Panel%20Eng&ComManual%2026-0959-18.pdf",
        "pdfPage": 56,
        "printedPage": "56"
      }
    ],
    "completion": "The existing trainer checks the actual practice steps and keeps its own progress. Opening this lesson does not mark it complete."
  }
];

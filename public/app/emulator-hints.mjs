// Key-by-key route guidance over the same state engine as the physical controls.
// Candidate presses are simulated on clones; the returned plan never executes
// them in the live panel. Navigation stops before a setting save or command.
import {emulatorView, pressEmulatorKey, setEmulatorRoot} from './emulator-engine.mjs';

const cache = new WeakMap();
const frame = state => state.trail.at(-1);
const wrap = (n,size) => size ? (n % size + size) % size : 0;
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const digits = value => value != null && /^\d+$/.test(String(value));
const changedFields = ['values','committedValues','zoneNames','zoneTypes','zoneAreas','zoneOmitEnabled','omittedZones','armed','armingMode','chime','alarm','changed','lastReport'];
const physicalKeys = {
  'galaxy-dimension': new Set([..."0123456789",'enter','back','next','previous','star','details']),
  'texecom-premier-elite': new Set([..."0123456789",'enter','back','next','previous','change','reset-key','omit','chime','details','area']),
  'scantronic-ion': new Set([..."0123456789",'enter','back','next','previous','left','right','area','star','hash','set-a','set-b','set-c','set-d','unset','panic-top','panic-bottom']),
  'orisec-cp': new Set([..."0123456789",'enter','back','next','previous','left','right','backspace','arm','part-set','area-select','omit','sound-help']),
};
const functionKeys = {'#':'details',Part:'details',Reset:'reset-key',Omit:'omit',Chime:'chime',Area:'area',A:'next',B:'previous'};
const keyNames = {
  'galaxy-dimension': {enter:'ent',back:'esc',next:'A',previous:'B',details:'#',star:'*'},
  'texecom-premier-elite': {enter:'Yes',back:'Menu',change:'No',next:'▼',previous:'▲',details:'Part','reset-key':'Reset'},
  'scantronic-ion': {enter:'✓',back:'✕',next:'▼',previous:'▲',left:'◀',right:'▶'},
  'orisec-cp': {enter:'Enter',back:'Back',next:'↓',previous:'↑',left:'←',right:'→',backspace:'Clear'},
};
const navigation = model => model.config.navigation || {};
const physical = (model,key) => physicalKeys[model.id]?.has(key) ?? model.profile.keys.some(item=>item.id===key);
const menuKeys = (model,node={}) => [node.menuNextKey||navigation(model).menuNextKey||'next',node.menuPreviousKey||navigation(model).menuPreviousKey||'previous'];
const recordKeys = (model,node={}) => [node.recordNextKey||navigation(model).recordNextKey||'next',node.recordPreviousKey||navigation(model).recordPreviousKey||'previous'];
const valueKeys = (model,node={}) => [node.choiceNextKey||navigation(model).choiceNextKey||'next',node.choicePreviousKey||navigation(model).choicePreviousKey||'previous'];

export function hintKeyLabel(model,key) {
  return keyNames[model.id]?.[key] || model.profile.keys.find(item=>item.id===key)?.label || key;
}
function base(model,state) {
  const f=frame(state);
  const root=model.rootById[state.rootId];
  return model.nodes[f?.id] || {...model.nodes[root?.id],...root,id:'@'+state.rootId,mode:'menu',children:root?.nodeIds||[]};
}
function current(model,state) {
  const n=base(model,state),f=frame(state);
  if(f.selectorNodeId&&model.nodes[f.selectorNodeId])return model.nodes[f.selectorNodeId];
  return n.sequentialFields&&!f.selectorPending ? model.nodes[n.children[wrap(f.fieldIndex||0,n.children.length)]]||n : n;
}
function signature(state) {
  return JSON.stringify({root:state.rootId,trail:state.trail,digits:state.digits,editor:state.editor,confirm:state.confirm,loggedOut:state.loggedOut,testFlow:state.testFlow,walk:state.walk,runtimeState:state.runtimeState});
}
function forwardSignature(state) {
  return JSON.stringify({root:state.rootId,depth:state.trail.length,frame:frame(state),digits:state.digits,editor:state.editor,confirm:state.confirm,loggedOut:state.loggedOut,testFlow:state.testFlow,walk:state.walk,runtimeState:state.runtimeState});
}
function safeRun(model,start,keys) {
  let state=start;
  for(const key of keys) {
    if(!physical(model,key))return null;
    const next=pressEmulatorKey(model,state,key);
    if(changedFields.some(field=>!same(next[field],state[field])))return null;
    // Entering some tests starts an output immediately. Guidance may select
    // their question, and may stop a test after a wrong press, but never start it.
    if(Object.entries(next.outputStates||{}).some(([name,on])=>on===true&&state.outputStates?.[name]!==true))return null;
    if(next.testFlow?.kind==='walk'&&next.walk.running&&!state.walk.running)return null;
    state=next;
  }
  return state;
}
function sourcePaths(model,rootId,targetId) {
  let memo=cache.get(model);if(!memo){memo=new Map();cache.set(model,memo);}
  const key=rootId+'|'+targetId;if(memo.has(key))return memo.get(key);
  const found=[],root=model.rootById[rootId];
  function visit(id,path,seen) {
    if(found.length>=16||seen.has(id)||path.length>40)return;
    const node=model.nodes[id];if(!node)return;
    const next=[...path,id];if(id===targetId){found.push(next);return;}
    const children=[...node.children,...(node.mode==='choice'?node.choices.map(c=>c.nodeId||c.id).filter(id=>model.nodes[id]?.children.length):[])];
    const nextSeen=new Set(seen).add(id);
    for(const child of children)visit(child,next,nextSeen);
  }
  for(const id of root?.nodeIds||[])visit(id,[],new Set());
  memo.set(key,found);return found;
}
function scrollSequences(cursor,target,size,forward='next',backward='previous') {
  if(!size)return [];
  return [Array(wrap(target-cursor,size)).fill(forward),Array(wrap(cursor-target,size)).fill(backward)];
}
function candidate(model,state,keys,predicate) {
  const end=safeRun(model,state,keys);return end&&predicate(end)?{keys,end}:null;
}
function uniqueCandidates(candidates) {
  const seen=new Set();return candidates.filter(Boolean).filter(item=>{const key=JSON.stringify(item.keys);if(seen.has(key))return false;seen.add(key);return true;});
}
function selectedQuestion(model,state,id) {
  if(state.editor||state.confirm||frame(state).selectorPending)return false;
  const n=base(model,state),f=frame(state);
  return n.sequentialFields ? f.id!==id&&current(model,state).id===id&&current(model,state).question===true : n.mode==='menu'&&n.children?.[f.cursor||0]===id;
}
function enterChild(model,state,id,selectOnly=false) {
  const n=base(model,state),f=frame(state),children=n.children||[],index=children.indexOf(id),target=model.nodes[id];
  if(index<0||!target)return [];
  const sequences=[];
  // Documented dedicated function keys have priority when they are as quick.
  for(const [key,value] of Object.entries(n.shortcutKeys||{}))if(value===id&&!selectOnly)sequences.push([key]);
  if(functionKeys[target.code]&&!selectOnly)sequences.push([functionKeys[target.code]]);
  if(digits(target.code)&&!selectOnly&&n.numericSelection!==false) {
    const code=String(target.code),existing=state.digits||'';
    const prefix=!existing?[]:code.startsWith(existing)?[]:model.id==='orisec-cp'?Array(existing.length).fill('backspace'):['back'];
    const entered=code.startsWith(existing)?code.slice(existing.length):code;
    if(n.directNumericMenus??navigation(model).directNumericMenus)sequences.push([...prefix,...entered]);
    sequences.push([...prefix,...entered,'enter']);
  }
  // Scrolling clears an entered menu number in the engine. Back clears it
  // without leaving the current menu when the cursor already matches.
  for(const seq of scrollSequences(f.cursor||0,index,children.length,...menuKeys(model,n))) {
    sequences.push([...(state.digits&&!seq.length?['back']:[]),...seq,...(selectOnly?[]:['enter'])]);
  }
  return uniqueCandidates(sequences.map(keys=>candidate(model,state,keys,end=>selectOnly?selectedQuestion(model,end,id):frame(end).id===id)));
}
function recordChoice(model,state,scope,recordId) {
  const view=emulatorView(model,state),list=view.records||[],index=list.findIndex(r=>r.id===recordId);
  if(index<0)return null;
  const f=frame(state),selector=Boolean(f.selectorPending),n=base(model,state),selectorNode=model.nodes[f.selectorNodeId]||n;
  const cursor=selector?f.cursor:list.findIndex(r=>r.id===f.context?.[scope]);
  const sequences=[];
  const scroll=recordKeys(model,selector?selectorNode:n);
  for(const seq of scrollSequences(cursor,index,list.length,...scroll))sequences.push([...(state.digits&&!seq.length?scroll:seq),...(selector?['enter']:[])]);
  if(digits(recordId)) {
    const code=String(recordId),existing=state.digits||'';
    if(!existing)sequences.push([...code,'enter']);
    else if(code.startsWith(existing))sequences.push([...code.slice(existing.length),'enter']);
    else sequences.push([...(model.id==='orisec-cp'?Array(existing.length).fill('backspace'):selector?scroll:['back']),...code,'enter']);
  }
  // Sequential field arrows change records. The same keys in a scrollFields
  // screen change fields, so record edits there are not inferred.
  if(!selector&&(!n.sequentialFields||n.scrollFields))return null;
  const plans=sequences.map(keys=>candidate(model,state,keys,end=>!frame(end).selectorPending&&frame(end).context?.[scope]===recordId&&(!end.editor||selector&&(end.editor.nodeId===n.id||n.immediateFields&&n.children.includes(end.editor.nodeId)))));
  return plans.filter(Boolean).sort((a,b)=>a.keys.length-b.keys.length)[0]||null;
}
function fieldChoice(model,state,id) {
  const n=base(model,state),f=frame(state),index=n.children.indexOf(id);
  if(!n.sequentialFields||index<0)return null;
  const size=n.children.length,sequences=[];
  if(n.immediateFields){
    let next=state;const keys=[],seen=new Set();
    for(let step=0;step<size*3+4&&frame(next).id===frame(state).id&&current(model,next).id!==id;step++){
      const sig=signature(next);if(seen.has(sig))break;seen.add(sig);
      if(frame(next).selectorPending){
        const scope=frame(next).selectorPending,pick=recordChoice(model,next,scope,recordFor(model,next,scope,{}));
        if(!pick)break;
        keys.push(...pick.keys);next=pick.end;continue;
      }
      const node=current(model,next),key=node.nextFieldKey||(node.question||node.skipOnBack?'back':'enter');
      const result=safeRun(model,next,[key]);if(!result)break;
      keys.push(key);next=result;
    }
    if(current(model,next).id===id)sequences.push(keys);
  }
  sequences.push(Array(wrap(index-(f.fieldIndex||0),size)).fill('enter'));
  if(n.previousFieldKey)sequences.push(Array(wrap((f.fieldIndex||0)-index,size)).fill(n.previousFieldKey));
  if(n.scrollFields||!n.immediateFields&&!(n.selector||n.scope))sequences.push(...scrollSequences(f.fieldIndex||0,index,size));
  return sequences.map(keys=>candidate(model,state,keys,end=>current(model,end).id===id&&(!end.editor||n.immediateFields&&!end.editor.dirty))).filter(Boolean).sort((a,b)=>a.keys.length-b.keys.length)[0]||null;
}
function choiceFocus(model,state,goal) {
  const node=model.nodes[goal.nodeId],index=node?.choices.findIndex(c=>c.id===goal.choiceId||c.nodeId===goal.choiceId);
  if(index<0)return null;
  let start=state,prefix=[];
  if(!start.editor) {
    const key=base(model,start).sequentialFields?'change':node.changeKey==='change'?'change':'enter';
    start=safeRun(model,start,[key]);prefix=[key];
    if(!start?.editor||start.editor.nodeId!==node.id)return null;
  }
  const editor=start.editor,sequences=[],cursor=editor.kind==='flags'?editor.cursor:editor.choiceIndex;
  if(editor.kind==='flags')for(const [key,code] of Object.entries(node.keyChoiceCodes||{})){
    const choice=node.choices[index];
    if(String(choice.code)===String(code)||choice.id===code||choice.value===code)sequences.push([key]);
  }
  if(editor.kind==='flags'&&node.digitSelectOnly&&/^\d$/.test(String(node.choices[index].code)))sequences.push([String(node.choices[index].code)]);
  const scroll=valueKeys(model,node);
  for(const seq of scrollSequences(cursor,index,node.choices.length,...scroll))sequences.push(start.digits&&!seq.length?scroll:seq);
  if(editor.kind==='choice')for(const key of node.choiceToggleKeys||navigation(model).choiceToggleKeys||[])sequences.push(Array(wrap(index-cursor,node.choices.length)).fill(key));
  if(editor.kind==='choice'&&digits(node.choices[index].code)) {
    const code=String(node.choices[index].code),existing=start.digits||'';
    if(!existing)sequences.push([...code]);
    else if(code.startsWith(existing))sequences.push([...code.slice(existing.length)]);
  }
  return sequences.map(keys=>candidate(model,start,keys,end=>reached(model,end,goal))).filter(Boolean).sort((a,b)=>a.keys.length-b.keys.length).map(p=>[...prefix,...p.keys])[0]||null;
}
function reached(model,state,goal) {
  if(state.loggedOut||state.confirm)return false;
  if(goal.beforeActivation)return selectedQuestion(model,state,goal.nodeId);
  const actual=current(model,state),container=base(model,state),n=container.sequentialFields&&container.id===goal.nodeId?container:actual,f=frame(state);
  if(n.id!==goal.nodeId)return false;
  if(f.selectorPending&&n.mode!=='menu')return false;
  if(goal.recordScope&&goal.recordId&&f.context?.[goal.recordScope]!==goal.recordId)return false;
  if(goal.statusIndex!=null)return f.cursor===goal.statusIndex;
  if(!goal.choiceId)return true;
  if(!state.editor||state.editor.nodeId!==goal.nodeId)return false;
  const index=n.choices.findIndex(c=>c.id===goal.choiceId||c.nodeId===goal.choiceId);
  if(index<0)return false;
  if(state.editor.kind==='flags')return state.editor.cursor===index;
  const choice=n.choices[index];
  return state.editor.choiceIndex===index&&same(state.editor.draft,choice.value)&&(!state.digits||String(choice.code)===state.digits);
}
function recordFor(model,state,scope,goal) {
  const view=emulatorView(model,state),list=view.mode==='selector'&&frame(state).selectorPending===scope?view.records:(state.records[scope]||[]);
  const desired=scope===goal.recordScope?goal.recordId:frame(state).context?.[scope];
  return list.some(r=>r.id===desired)?desired:list[0]?.id;
}
function planAlong(model,start,path,goal) {
  const memo=new Map(),visiting=new Set();
  function walk(state,depth=0) {
    if(reached(model,state,goal))return [];
    if(depth>60)return null;
    const memoKey=forwardSignature(state);
    if(memo.has(memoKey))return memo.get(memoKey);
    if(visiting.has(memoKey))return null;
    visiting.add(memoKey);
    const n=base(model,state),f=frame(state),currentNode=current(model,state),at=n.id==='@'+state.rootId?-1:path.indexOf(n.id),options=[];
    if(state.loggedOut||state.confirm){visiting.delete(memoKey);return null;}
    if(f.selectorPending) {
      const pick=recordChoice(model,state,f.selectorPending,recordFor(model,state,f.selectorPending,goal));
      if(pick)options.push(pick);
    } else if(currentNode.id===goal.nodeId&&goal.choiceId) {
      const keys=choiceFocus(model,state,goal);if(keys)options.push({keys,end:safeRun(model,state,keys)});
    } else if(currentNode.id===goal.nodeId&&goal.statusIndex!=null) {
      for(const keys of scrollSequences(f.cursor,goal.statusIndex,currentNode.statusRows?.length||0,...valueKeys(model,currentNode))) {
        const end=safeRun(model,state,keys);if(end&&reached(model,end,goal))options.push({keys,end});
      }
    } else if(n.sequentialFields&&at>=0) {
      const scope=n.selector||n.scope;
      if(scope===goal.recordScope&&f.context?.[scope]!==goal.recordId) {
        const pick=recordChoice(model,state,scope,goal.recordId);if(pick)options.push(pick);
      } else {
        const wanted=path[at+1];
        if(wanted&&currentNode.id!==wanted) {const pick=fieldChoice(model,state,wanted);if(pick)options.push(pick);}
        else if(wanted&&currentNode.children.length) {
          const enter=n.immediateFields?'enter':'change';
          const end=safeRun(model,state,[enter]);if(end&&frame(end).id===wanted)options.push({keys:[enter],end});
        }
      }
    } else if(!state.editor&&n.mode==='menu') {
      // Two-digit Galaxy Full Menu options can bypass the group-heading level.
      // They are considered before scrolling, preserving the useful shortcut on ties.
      const root=model.rootById[state.rootId];
      if(model.id==='galaxy-dimension'&&!/quick/i.test(root.id)&&root.directMenuCodes!==false&&state.trail.length<=2) {
        for(const id of path.slice(at+1)) {
          const target=model.nodes[id];if(!/^\d{2}$/.test(target?.address||''))continue;
          const existing=state.digits||'',code=target.address;
          const keys=code.startsWith(existing)?[...code.slice(existing.length),'enter']:[...(model.id==='orisec-cp'?Array(existing.length).fill('backspace'):['back']),...code,'enter'];
          const end=safeRun(model,state,keys);if(end&&frame(end).id===id)options.push({keys,end});
        }
      }
      const wanted=at>=0||n.id==='@'+state.rootId?path[at+1]:null;if(wanted)options.push(...enterChild(model,state,wanted,goal.beforeActivation&&wanted===goal.nodeId));
    }
    let result=null;
    for(const option of uniqueCandidates(options)) {
      if(!option.keys.length||!option.end)continue;
      const rest=walk(option.end,depth+1);
      if(rest){const all=[...option.keys,...rest];if(!result||all.length<result.length)result=all;}
    }
    visiting.delete(memoKey);memo.set(memoKey,result);return result;
  }
  return walk(start);
}
function planFrom(model,start,goal,paths) {
  let anchor=start,prefix=[],best=null;const seen=new Set();
  for(let depth=0;depth<60;depth++) {
    const sig=signature(anchor);if(seen.has(sig))break;seen.add(sig);
    for(const path of paths) {
      const suffix=planAlong(model,anchor,path,goal);
      if(suffix){const keys=[...prefix,...suffix];if(!best||keys.length<best.length)best=keys;}
    }
    if(best&&prefix.length>=best.length)break;
    const f=frame(anchor);
    if(!anchor.editor&&!anchor.confirm&&!anchor.digits&&!anchor.loggedOut&&anchor.trail.length===1)break;
    const key=anchor.loggedOut?'enter':'back',next=safeRun(model,anchor,[key]);
    if(!next||signature(next)===sig)break;
    anchor=next;prefix.push(key);
  }
  return best;
}
function requestedGoal(model,nodeId) {
  const raw=model.rawById.get(nodeId),node=model.nodes[nodeId];
  if(!raw&&!node)return {error:'This entry does not have a documented keypad route.'};
  if(node?.hintRouteUnverified)return {error:'This field uses a labelled FINDR editor because the physical key sequence is not verified in the source. Open its menu to use the helper; SHOW HINTS stops before teaching an assumed sequence.'};
  if(raw?.kind==='selection') {
    const parent=Object.values(model.nodes).find(n=>['choice','flags'].includes(n.mode)&&n.choices.some(c=>c.id===nodeId||c.nodeId===nodeId));
    if(parent)return {nodeId:parent.id,choiceId:nodeId,label:raw.label,reference:false};
    const sourceParent=model.nodes[raw.parentId];
    if(sourceParent&&['choice','flags'].includes(sourceParent.mode)) {
      const labelMatches=sourceParent.choices.filter(c=>String(c.label).trim().toLowerCase()===String(raw.label).trim().toLowerCase());
      const codeMatches=raw.code!=null&&raw.codeType!=='ambiguous'?sourceParent.choices.filter(c=>c.code!=null&&String(c.code)===String(raw.code)):[];
      const match=labelMatches.length===1?labelMatches[0]:codeMatches.length===1?codeMatches[0]:null;
      if(match)return {nodeId:sourceParent.id,choiceId:match.id,label:raw.label,reference:false};
    }
  }
  return {nodeId:node?.id||nodeId,label:raw?.label||node.label,reference:node?.mode==='info'||raw?.kind==='reference'||node?.displayLines?.includes('Not available'),beforeActivation:node?.outputsOnEnter===true};
}
function resolve(model,state,nodeId,options) {
  const requested=requestedGoal(model,nodeId);if(requested.error)return requested;
  if(model.rootById[nodeId])return {goal:{nodeId:'@'+nodeId,label:requested.label,reference:false,recordScope:null,recordId:null},root:model.rootById[nodeId],paths:[[]],prerequisite:null,fallback:false,requestedLabel:requested.label};
  let goal={...requested},root=model.rootById[state.rootId],paths=sourcePaths(model,root.id,goal.nodeId),fallback=false;
  if(!paths.length)for(const candidate of model.roots){const possible=sourcePaths(model,candidate.id,goal.nodeId);if(possible.length){root=candidate;paths=possible;break;}}
  if(!paths.length) {
    let raw=model.rawById.get(goal.nodeId),seen=new Set();
    while(raw&&!seen.has(raw.id)&&!paths.length) {
      seen.add(raw.id);raw=model.rawById.get(raw.parentId);if(!raw)break;
      for(const candidate of [root,...model.roots.filter(r=>r.id!==root.id)]) {
        const possible=sourcePaths(model,candidate.id,raw.id);
        if(possible.length){
          root=candidate;paths=possible;goal={nodeId:raw.id,label:requested.label,reference:true};fallback=true;
          const statusIndex=model.nodes[raw.id]?.statusRows?.findIndex(row=>row.label===requested.label);
          if(statusIndex>=0){goal.statusIndex=statusIndex;goal.reference=false;fallback=false;}
          break;
        }
      }
    }
  }
  if(!paths.length)return {error:'This source entry has no executable keypad route in the current emulator.'};
  let prerequisite=null;
  const path=paths[0];
  for(let i=0;i<path.length-1;i++) {
    const node=model.nodes[path[i]],child=path[i+1];
    if(node.mode==='choice'&&node.choices.some(c=>(c.nodeId||c.id)===child)) {
      const choice=node.choices.find(c=>(c.nodeId||c.id)===child);
      prerequisite={label:node.label,choiceLabel:choice.label,targetLabel:requested.label};
      goal={nodeId:node.id,choiceId:choice.id,label:requested.label,reference:false};paths=sourcePaths(model,root.id,goal.nodeId);break;
    }
  }
  const selectedPath=paths[0],scopes=selectedPath.flatMap(id=>{
    const n=model.nodes[id];return n.selector&&(id!==goal.nodeId||n.mode!=='menu')?[n.selector]:[];
  });
  const recordScope=scopes.at(-1)||null,selectorNode=[...selectedPath].reverse().map(id=>model.nodes[id]).find(n=>n.selector===recordScope);
  const recordIds=selectorNode?.selectorRecordIds || (!selectorNode?.scope||recordScope===selectorNode.scope?selectorNode?.recordIds:null);
  const list=(state.records[recordScope]||[]).filter(r=>!recordIds||recordIds.includes(r.id));
  const recordId=list.some(r=>r.id===options.recordId)?options.recordId:list[0]?.id||null;
  goal.recordScope=recordScope;goal.recordId=recordId;goal.recordIds=list.map(r=>r.id);
  return {goal,root,paths,prerequisite,fallback,requestedLabel:requested.label};
}
function decorate(model,hint,state) {
  const keys=hint.keys||[],nextKey=keys[0]||null,remainingSteps=keys.length;
  const currentNode=current(model,state),f=frame(state),view=emulatorView(model,state);
  let message=hint.message||'';
  if(hint.status==='active') {
    const keyLabel=hintKeyLabel(model,nextKey);
    if(f.selectorPending) {
      const record=(state.records[f.selectorPending]||[]).find(r=>r.id===hint.goal.recordId);
      message='Press '+keyLabel+' to choose '+(record?record.id+' · '+(f.selectorPending==='zone'?state.zoneNames[record.id]||record.label:record.label):'the demo '+f.selectorPending)+'.';
    } else if(/^\d$/.test(nextKey))message='Press '+keyLabel+' to enter the documented option number.';
    else if(nextKey==='back')message='Press '+keyLabel+' to '+(navigation(model).questionMenus&&base(model,state).mode==='menu'&&!state.editor&&!f.selectorPending?'move to the next question towards ':'return towards ')+hint.targetLabel+'.';
    else if(nextKey==='change')message='Press '+keyLabel+' to open '+currentNode.label+'.';
    else if(nextKey==='enter')message='Press '+keyLabel+' to '+(base(model,state).sequentialFields?'advance to the next field.':'open the selected option.');
    else message='Press '+keyLabel+' to move towards '+hint.targetLabel+'.';
  }
  return {...hint,nextKey,nextLabel:nextKey?hintKeyLabel(model,nextKey):null,remainingSteps,totalSteps:hint.completedSteps+remainingSteps,message,
    recordScope:hint.goal?.recordScope||null,recordId:hint.goal?.recordId||null,recordIds:hint.goal?.recordIds||null,recordLabel:view.records?.find(r=>r.id===hint.goal?.recordId)?.label||null};
}
function finish(hint) {
  if(hint.prerequisite)return {...hint,status:'blocked',event:'blocked',keys:[],message:'You reached '+hint.prerequisite.choiceLabel+'. Continuing to '+hint.targetLabel+' requires saving '+hint.prerequisite.label+'. Hints stop before changing that setting.'};
  if(hint.goal?.beforeActivation)return {...hint,status:'complete',event:'complete',keys:[],message:'Route complete — '+hint.targetLabel+' is selected. '+(hint.activationLabel||'Confirm')+' starts the fictional test; hints stop before activation.'};
  if(hint.reference)return {...hint,status:'reference',event:'reference',keys:[],message:hint.fallback?'You reached '+hint.destinationLabel+', which contains the reference for '+hint.targetLabel+'. This detail is not a separate verified keypad option.':'You reached the documented location for '+hint.targetLabel+'. Its interaction is still marked as a reference or evidence gap.'};
  return {...hint,status:'complete',event:'complete',keys:[],message:'Route complete — you reached '+hint.targetLabel+'.'};
}

export function startHints(model,previous,nodeId,options={}) {
  const resolved=resolve(model,previous,nodeId,options);
  if(resolved.error)return {state:previous,hint:{status:'blocked',targetId:nodeId,targetLabel:model.rawById.get(nodeId)?.label||'Menu',message:resolved.error,nextKey:null,nextLabel:null,completedSteps:0,pressesTaken:0,totalSteps:0,remainingSteps:0,event:'none'}};
  const state=setEmulatorRoot(model,previous,resolved.root.id),{goal,paths}=resolved;
  const keys=planFrom(model,state,goal,paths);
  let hint={status:'active',targetId:nodeId,targetLabel:resolved.requestedLabel,destinationLabel:model.nodes[goal.nodeId]?.label||resolved.requestedLabel,
    rootId:resolved.root.id,rootLabel:resolved.root.label,activationLabel:hintKeyLabel(model,'enter'),goal,paths,prerequisite:resolved.prerequisite,reference:goal.reference,fallback:resolved.fallback,
    keys:keys||[],initialTotal:keys?.length||0,completedSteps:0,pressesTaken:0,misses:0,event:'none',message:''};
  if(keys===null)hint={...hint,status:'blocked',message:goal.recordScope&&!goal.recordIds?.length?'No '+goal.recordScope+' records are fitted to this fictional panel. This menu requires a matching device or record.':'A safe key-by-key route is not available for this entry. Use the menu reference for the unresolved sequence.'};
  else if(!keys.length)hint={...finish(hint),event:'none'};
  return {state,hint:decorate(model,hint,state)};
}

export function advanceHints(model,previousHint,previous,next,key) {
  if(!previousHint||previousHint.status!=='active')return previousHint;
  let hint={...previousHint,event:'none',pressesTaken:(previousHint.pressesTaken||0)+1};
  const expected=safeRun(model,previous,[hint.keys[0]]);
  const expectedPress=key===hint.keys[0]||expected&&signature(expected)===signature(next);
  const keys=planFrom(model,next,hint.goal,hint.paths);
  if(keys===null) {
    hint={...hint,status:'blocked',keys:[],event:'blocked',message:'This screen cannot return to the route without saving an edit. Restart the hints to discard the draft and start from the access menu.'};
  } else {
    const improved=keys.length<previousHint.remainingSteps;
    const completedSteps=Math.max(hint.completedSteps,Math.min(hint.initialTotal,hint.initialTotal-keys.length));
    hint={...hint,keys,completedSteps,event:expectedPress||improved?'correct':'wrong',misses:hint.misses+(expectedPress||improved?0:1)};
    if(!keys.length)hint=finish(hint);
  }
  return decorate(model,hint,next);
}

export function getHintView(model,hint) {return hint;}

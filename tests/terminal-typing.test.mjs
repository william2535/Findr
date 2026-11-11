import test from 'node:test';
import assert from 'node:assert/strict';
import {createTerminalTyper} from '../public/app/terminal-typing.mjs';

// Deterministic DOM and clock exercise the real typewriter. Real painting,
// pointer/keyboard layout and the demonstration recording are browser tests.
class Element {
  constructor(tag, document) { this.tagName=tag; this.ownerDocument=document; this.children=[]; this.parentNode=null; this.attributes=new Map(); this.listeners=new Map(); this.value=''; this.className=''; this.writes=0; }
  setAttribute(key,value) { this.attributes.set(key,String(value)); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  removeAttribute(key) { this.attributes.delete(key); }
  get textContent() { return this.value + this.children.map(child=>child.textContent).join(''); }
  set textContent(value) { this.writes++; for(const child of this.children) child.parentNode=null; this.children=[]; this.value=String(value); }
  append(...children) { for(const child of children){child.remove();this.children.push(child);child.parentNode=this;} }
  replaceChildren(...children) { this.textContent=''; this.append(...children); }
  remove() { if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null;} }
  matches(selector) { return selector.startsWith('.') ? this.className.split(' ').includes(selector.slice(1)) : /^\[[^=\]]+\]$/.test(selector) && this.attributes.has(selector.slice(1,-1)); }
  querySelectorAll(selector) { return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0]||null; }
  closest(selector) { return this.matches(selector)?this:this.parentNode?.closest(selector)||null; }
  addEventListener(type,fn) { this.listeners.set(type,fn); }
  removeEventListener(type,fn) { if(this.listeners.get(type)===fn)this.listeners.delete(type); }
  emit(type,target=this) { this.listeners.get(type)?.({type,target}); }
}
function dom(messages){
 const document={createElement:tag=>new Element(tag,document)},container=document.createElement('section'),rows=new Map();
 for(const message of messages){const row=document.createElement('div'),host=document.createElement('span');row.setAttribute('data-message-id',message.id);host.setAttribute('data-terminal-message-text','');host.textContent=message.text;row.append(host);container.append(row);rows.set(message.id,{row,host});}
 return {container,rows,visible:id=>rows.get(id).host.querySelector('[data-terminal-visible-text]')?.textContent||''};
}
function fakeClock(){
 let time=0,id=0;const tasks=new Map();
 const scheduler={now:()=>time,setTimeout:(fn,delay)=>{const key=++id;tasks.set(key,{fn,due:time+delay});return key;},clearTimeout:key=>tasks.delete(key)};
 function advance(ms){const target=time+ms;let limit=10000;while(tasks.size){const [key,item]=[...tasks].sort((a,b)=>a[1].due-b[1].due)[0];if(item.due>target)break;if(!--limit)throw Error('Timer loop');tasks.delete(key);time=item.due;item.fn();}time=target;}
 return {scheduler,advance,get pending(){return tasks.size;}};
}
const message=(id,text,role='assistant')=>({id,text,role});

test('new FINDR output visibly types while complete saved content remains immutable',()=>{
 const messages=Object.freeze([Object.freeze(message('intro','let’s find that shit.'))]),before=JSON.stringify(messages),clock=fakeClock(),ui=dom(messages),changes=[];
 const typer=createTerminalTyper({scheduler:clock.scheduler,onProgress:change=>changes.push(change)});
 typer.reconcile(ui.container,messages);
 assert.equal(ui.visible('intro'),'');assert.equal(ui.rows.get('intro').row.getAttribute('data-typing'),'active');
 assert.equal(ui.rows.get('intro').host.getAttribute('aria-label'),messages[0].text);
 clock.advance(160);assert.ok(ui.visible('intro').length>0);assert.ok(ui.visible('intro').length<messages[0].text.length);
 clock.advance(500);assert.equal(ui.visible('intro'),messages[0].text);assert.equal(typer.status().typing,false);
 assert.equal(JSON.stringify(messages),before);assert.equal(clock.pending,0);
 assert.equal(changes.at(-1).complete,true);assert.equal(changes.at(-1).visible,Array.from(messages[0].text).length);
});

test('multiple FINDR messages type in order; user replies are immediate and a tap reveals the active output',()=>{
 const messages=[message('a','First terminal output.'),message('u','start','user'),message('b','Pick a saved manual.')],clock=fakeClock(),ui=dom(messages),finished=[];
 const typer=createTerminalTyper({scheduler:clock.scheduler,onFinish:entry=>finished.push(entry)});
 typer.reconcile(ui.container,messages);assert.equal(ui.visible('u'),'start');assert.equal(ui.visible('b'),'');
 clock.advance(100);assert.equal(typer.status().activeId,'a');assert.equal(ui.visible('b'),'');
 ui.container.emit('click',ui.rows.get('a').host.querySelector('[data-terminal-visible-text]'));
 assert.equal(ui.visible('a'),messages[0].text);assert.equal(typer.status().activeId,'b');
 assert.equal(ui.container.querySelectorAll('.terminal-typing-cursor').length,1);
 typer.reveal();assert.equal(ui.visible('b'),messages[2].text);assert.equal(typer.status().typing,false);assert.equal(clock.pending,0);
 assert.deepEqual(finished.map(item=>[item.id,item.reason]),[['a','revealed'],['b','revealed']]);
});

test('DOM reconciliation keeps current progress and never replays existing transcript entries',()=>{
 const messages=[message('old','Already saved.'),message('new','Where did you take that reading?')],clock=fakeClock(),first=dom(messages.slice(0,1)),typer=createTerminalTyper({scheduler:clock.scheduler});
 typer.reconcile(first.container,messages.slice(0,1),{initial:true});
 const next=dom(messages);typer.reconcile(next.container,messages);clock.advance(160);const partial=next.visible('new');
 const replacement=dom(messages);typer.reconcile(replacement.container,messages);
 assert.equal(replacement.visible('new'),partial);assert.equal(replacement.visible('old'),'Already saved.');
 const historicNode=replacement.rows.get('old').host.querySelector('[data-terminal-visible-text]'),historicWrites=historicNode.writes;
 clock.advance(1000);typer.reconcile(replacement.container,messages);
 assert.equal(historicNode.writes,historicWrites);assert.equal(replacement.visible('new'),messages[1].text);assert.equal(clock.pending,0);
});

test('reopening during typing shows the complete persisted message without replaying introduction',()=>{
 const messages=[message('intro','let’s find that shit.'),message('ready','Ready? Type START.')],clock=fakeClock(),ui=dom(messages),first=createTerminalTyper({scheduler:clock.scheduler});
 first.reconcile(ui.container,messages);clock.advance(48);assert.notEqual(ui.visible('intro'),messages[0].text);
 const restored=dom(JSON.parse(JSON.stringify(messages))),reloaded=createTerminalTyper({scheduler:clock.scheduler});
 reloaded.reconcile(restored.container,messages,{initial:true});
 assert.equal(restored.visible('intro'),messages[0].text);assert.equal(restored.visible('ready'),messages[1].text);assert.equal(reloaded.status().typing,false);
 first.destroy();reloaded.destroy();assert.equal(clock.pending,0);
});

test('reduced motion displays all new text immediately and changing the preference finishes an active queue',()=>{
 const messages=[message('a','One output.'),message('b','Another output.')],clock=fakeClock(),ui=dom(messages);let reduced=false;
 const typer=createTerminalTyper({scheduler:clock.scheduler,reducedMotion:()=>reduced});typer.reconcile(ui.container,messages);clock.advance(32);reduced=true;clock.advance(16);
 assert.equal(ui.visible('a'),messages[0].text);assert.equal(ui.visible('b'),messages[1].text);assert.equal(clock.pending,0);
 const immediate=dom([message('c','Read this without motion.')]);typer.reconcile(immediate.container,[message('c','Read this without motion.')]);
 assert.equal(immediate.visible('c'),'Read this without motion.');assert.equal(typer.status().typing,false);
});

test('long messages finish within the duration cap without splitting Unicode graphemes',()=>{
 const text='👩🏽‍🔧 e\u0301 '+ 'A long but still readable terminal message. '.repeat(100),clock=fakeClock(),ui=dom([message('long',text)]),typer=createTerminalTyper({scheduler:clock.scheduler});
 typer.reconcile(ui.container,[message('long',text)]);clock.advance(16);
 assert.ok(ui.visible('long').startsWith('👩🏽‍🔧 e\u0301 '));assert.ok(ui.visible('long').length<text.length);
 clock.advance(1600);assert.equal(ui.visible('long'),text);assert.equal(typer.status().typing,false);assert.equal(clock.pending,0);
});

test('literal PDF-like markup stays text and an in-place revised status does not replay',()=>{
 const original=[message('source','<script>alert("untrusted")</script>')],clock=fakeClock(),ui=dom(original),typer=createTerminalTyper({scheduler:clock.scheduler});
 typer.reconcile(ui.container,original,{initial:true});assert.equal(ui.visible('source'),original[0].text);assert.equal(ui.container.querySelectorAll('script').length,0);
 const node=ui.rows.get('source').host.querySelector('[data-terminal-visible-text]');typer.reconcile(ui.container,[message('source','Resource download cancelled.')]);
 assert.equal(ui.visible('source'),'Resource download cancelled.');assert.equal(node,ui.rows.get('source').host.querySelector('[data-terminal-visible-text]'));assert.equal(clock.pending,0);
});

test('removing an in-flight row and destroying the view clears timers and event handlers',()=>{
 const messages=[message('a','A long current message.'),message('b','A later message.')],clock=fakeClock(),ui=dom(messages),typer=createTerminalTyper({scheduler:clock.scheduler});
 typer.reconcile(ui.container,messages);clock.advance(32);const second=dom(messages.slice(1));typer.reconcile(second.container,messages.slice(1));
 assert.equal(typer.status().activeId,'b');assert.equal(ui.container.listeners.has('click'),false);
 typer.destroy();assert.equal(clock.pending,0);assert.equal(second.container.listeners.has('click'),false);assert.equal(second.visible('b'),messages[1].text);
});


test('unmounted transcript rows do not schedule invisible work or replay when history returns',()=>{
 const messages=[message('old','Hidden historical output.')],clock=fakeClock(),empty=dom([]),typer=createTerminalTyper({scheduler:clock.scheduler});
 typer.reconcile(empty.container,messages);assert.equal(clock.pending,0);assert.equal(typer.status().typing,false);
 const restored=dom(messages);typer.reconcile(restored.container,messages);
 assert.equal(restored.visible('old'),messages[0].text);assert.equal(clock.pending,0);
});

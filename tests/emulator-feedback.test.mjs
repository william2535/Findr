import test from 'node:test';
import assert from 'node:assert/strict';
import {createHintFeedback} from '../public/app/emulator-feedback.mjs';

function audioFixture({delayed = false, rejectResume = false} = {}) {
  const contexts = [], resumes = [];
  class Param {
    events = [];
    setValueAtTime(value,time) { this.events.push({kind:'set',value,time}); }
    linearRampToValueAtTime(value,time) { this.events.push({kind:'linear',value,time}); }
    exponentialRampToValueAtTime(value,time) { this.events.push({kind:'exponential',value,time}); }
    setTargetAtTime(value,time,constant) { this.events.push({kind:'target',value,time,constant}); }
    cancelScheduledValues(time) { this.events.push({kind:'cancel',time}); }
  }
  class Node {
    connected = []; disconnected = false;
    connect(node) { this.connected.push(node); }
    disconnect() { this.disconnected = true; }
  }
  class AudioContext {
    currentTime = 10; state = 'suspended'; destination = new Node();
    oscillators = []; gains = []; compressors = [];
    constructor() { contexts.push(this); }
    createGain() { const n=new Node();n.gain=new Param();this.gains.push(n);return n; }
    createDynamicsCompressor() {
      const n=new Node();for(const key of ['threshold','knee','ratio','attack','release'])n[key]=new Param();
      this.compressors.push(n);return n;
    }
    createOscillator() {
      const n=new Node();n.frequency=new Param();n.starts=[];n.stops=[];
      n.start=time=>n.starts.push(time);n.stop=time=>n.stops.push(time);
      this.oscillators.push(n);return n;
    }
    resume() {
      resumes.push(this);
      if(rejectResume)return Promise.reject(new Error('Browser blocked audio'));
      if(delayed)return new Promise(resolve=>{this.resolveResume=()=>{this.state='running';resolve();};});
      this.state='running';return Promise.resolve();
    }
    close() { this.state='closed';return Promise.resolve(); }
  }
  return {AudioContext, contexts, resumes};
}

test('loading and starting hints stays silent until an explicit unlock gesture',()=>{
  const audio=audioFixture(),feedback=createHintFeedback({AudioContext:audio.AudioContext});
  feedback.start('route');
  assert.equal(feedback.step({runId:'route',completed:1,total:4}),false);
  assert.equal(feedback.complete({runId:'route'}),false);
  assert.equal(audio.contexts.length,0);
  assert.equal(feedback.isAvailable(),true);
});

test('unlock starts browser resume synchronously and reuses one context',async()=>{
  const audio=audioFixture(),feedback=createHintFeedback({AudioContext:audio.AudioContext});
  const pending=feedback.unlock();
  assert.equal(audio.contexts.length,1);
  assert.equal(audio.resumes.length,1,'resume called during the user gesture');
  assert.equal(audio.contexts[0].oscillators.length,0,'unlock itself makes no sound');
  assert.equal(await pending,true);
  await feedback.unlock();
  assert.equal(audio.contexts.length,1);
});

test('correct progress rises in pitch while retries and backtracking earn no extra tones',async()=>{
  const audio=audioFixture(),feedback=createHintFeedback({AudioContext:audio.AudioContext});
  feedback.start('route');await feedback.unlock();
  const ctx=audio.contexts[0],pitches=[];
  for(let completed=1;completed<=8;completed++) {
    assert.equal(feedback.step({runId:'route',completed,total:completed<4?8:40}),true);
    pitches.push(ctx.oscillators.at(-1).frequency.events[0].value);
  }
  assert(pitches.every((pitch,index)=>index===0||pitch>pitches[index-1]));
  assert(pitches[0]>=330&&pitches.at(-1)<1000);
  const count=ctx.oscillators.length;
  for(const completed of [8,7,1,0,-1,NaN])assert.equal(feedback.step({runId:'route',completed,total:8}),false);
  assert.equal(feedback.step({runId:'old-route',completed:20,total:20}),false);
  assert.equal(ctx.oscillators.length,count);
});

test('a mute preference creates no context and unmuting never replays earned progress',async()=>{
  const audio=audioFixture(),feedback=createHintFeedback({AudioContext:audio.AudioContext,enabled:false});
  feedback.start('route');assert.equal(await feedback.unlock(),false);
  feedback.step({runId:'route',completed:1,total:3});
  assert.equal(audio.contexts.length,0);
  feedback.setEnabled(true);await feedback.unlock();
  assert.equal(feedback.step({runId:'route',completed:1,total:3}),false);
  assert.equal(audio.contexts[0].oscillators.length,0);
  assert.equal(feedback.step({runId:'route',completed:2,total:3}),true);
});

test('completion celebrates once and ends normal step rewards for that run',async()=>{
  const audio=audioFixture(),feedback=createHintFeedback({AudioContext:audio.AudioContext});
  feedback.start('route');await feedback.unlock();
  assert.equal(feedback.complete({runId:'route'}),true);
  const ctx=audio.contexts[0],count=ctx.oscillators.length;
  assert(count>1,'completion uses a melody rather than the single step tone');
  const melody=ctx.oscillators.filter(n=>n.starts[0]<ctx.currentTime+0.45);
  assert(melody.every((n,index)=>index===0||n.frequency.events[0].value>melody[index-1].frequency.events[0].value));
  assert.equal(feedback.complete({runId:'route'}),false);
  assert.equal(feedback.step({runId:'route',completed:99,total:99}),false);
  assert.equal(ctx.oscillators.length,count);
  feedback.start('new-route');
  assert.equal(feedback.step({runId:'new-route',completed:1,total:2}),true);
});

test('cancel and mute stop the scheduled tail of a celebration',async()=>{
  for(const stop of ['cancel','mute']) {
    const audio=audioFixture(),feedback=createHintFeedback({AudioContext:audio.AudioContext});
    feedback.start('route');await feedback.unlock();feedback.complete({runId:'route'});
    const ctx=audio.contexts[0],future=ctx.oscillators.filter(n=>n.starts[0]>ctx.currentTime+0.2);
    assert(future.length);
    if(stop==='cancel')feedback.cancel();else feedback.setEnabled(false);
    assert(future.every(n=>n.stops.at(-1)<n.starts[0]),'future tones stopped before they can start');
    assert(ctx.gains.slice(1).every(n=>n.gain.events.some(e=>e.kind==='cancel')));
  }
});

test('a delayed audio unlock cannot play a stale tick or celebration after leaving',async()=>{
  for(const action of ['step','complete']) {
    const audio=audioFixture({delayed:true}),feedback=createHintFeedback({AudioContext:audio.AudioContext});
    feedback.start('route');const resume=feedback.unlock();
    feedback[action]({runId:'route',completed:1,total:3});
    feedback.cancel();
    audio.contexts[0].resolveResume();await resume;await Promise.resolve();
    assert.equal(audio.contexts[0].oscillators.length,0);
  }
});

test('a new run and the newest earned step supersede pending audio callbacks',async()=>{
  const audio=audioFixture({delayed:true}),feedback=createHintFeedback({AudioContext:audio.AudioContext});
  feedback.start('old');const resume=feedback.unlock();feedback.complete({runId:'old'});
  feedback.start('new');
  feedback.step({runId:'new',completed:1,total:5});
  feedback.step({runId:'new',completed:2,total:5});
  audio.contexts[0].resolveResume();await resume;await Promise.resolve();
  assert.equal(audio.contexts[0].oscillators.length,1,'no burst of stale queued rewards');
});

test('hiding a tab suppresses pending audio but retains the run and earned progress',async()=>{
  const audio=audioFixture({delayed:true}),feedback=createHintFeedback({AudioContext:audio.AudioContext});
  feedback.start('route');const resume=feedback.unlock();
  feedback.step({runId:'route',completed:2,total:5});
  feedback.pause();
  audio.contexts[0].resolveResume();await resume;await Promise.resolve();
  assert.equal(audio.contexts[0].oscillators.length,0);
  assert.equal(feedback.step({runId:'route',completed:2,total:5}),false,'earned progress not replayed');
  assert.equal(feedback.step({runId:'route',completed:3,total:5}),true,'next real input can sound without restarting');
});

test('missing or blocked audio is a silent fallback, not an emulator error',async()=>{
  const absent=createHintFeedback({AudioContext:null});
  assert.equal(absent.isAvailable(),false);
  absent.start('route');assert.equal(await absent.unlock(),false);
  assert.doesNotThrow(()=>{absent.step({runId:'route',completed:1,total:2});absent.complete({runId:'route'});absent.cancel();});
  const audio=audioFixture({rejectResume:true}),blocked=createHintFeedback({AudioContext:audio.AudioContext});
  blocked.start('route');const resume=blocked.unlock();
  assert.doesNotThrow(()=>blocked.step({runId:'route',completed:1,total:2}));
  assert.equal(await resume,false);assert.equal(audio.contexts[0].oscillators.length,0);
});

test('output level is bounded and envelopes have a short attack and a quiet release',async()=>{
  const audio=audioFixture(),feedback=createHintFeedback({AudioContext:audio.AudioContext,volume:10});
  feedback.start('route');await feedback.unlock();feedback.complete({runId:'route'});
  const ctx=audio.contexts[0],master=ctx.gains[0];
  assert(master.gain.events[0].value<=0.3);
  assert.equal(ctx.compressors.length,1);
  for(const gain of ctx.gains.slice(1)) {
    const events=gain.gain.events;
    assert.equal(events[0].value,0);
    assert(events.some(e=>e.kind==='linear'&&e.value>0&&e.value<=0.22));
    assert(events.some(e=>e.kind==='exponential'&&e.value>0&&e.value<0.001));
    assert.equal(events.at(-1).value,0);
  }
  assert(ctx.oscillators.every(n=>n.stops[0]-n.starts[0]<0.5));
});

test('dispose cancels voices and closes its context without future playback',async()=>{
  const audio=audioFixture(),feedback=createHintFeedback({AudioContext:audio.AudioContext});
  feedback.start('route');await feedback.unlock();feedback.complete({runId:'route'});
  feedback.dispose();
  assert.equal(audio.contexts[0].state,'closed');
  assert(audio.contexts[0].oscillators.every(n=>n.disconnected));
  assert.equal(await feedback.unlock(),false);
  assert.equal(feedback.isAvailable(),false);
});

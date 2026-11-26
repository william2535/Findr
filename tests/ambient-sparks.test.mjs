import test from 'node:test';
import assert from 'node:assert/strict';
import {createAmbientSparks} from '../public/app/ambient-sparks.mjs';

function fixture({reduced=false,noContext=false}={}){
 let time=0,id=0;const frames=new Map(),timers=new Map(),events=new Map(),mediaEvents=new Map();
 const calls=[];const gradient=()=>({addColorStop:(...args)=>calls.push(['stop',...args])});
 const ctx={clearRect:(...v)=>calls.push(['clear',...v]),setTransform:(...v)=>calls.push(['transform',...v]),createRadialGradient:gradient,beginPath(){},arc:(...v)=>calls.push(['arc',...v]),fill(){},moveTo(){},lineTo(){},stroke(){}};
 const listen=(map,type,fn)=>{if(!map.has(type))map.set(type,new Set());map.get(type).add(fn);};
 const remove=(map,type,fn)=>map.get(type)?.delete(fn);
 const canvas={dataset:{},style:{},setAttribute:(k,v)=>{canvas[k]=v;},getContext:()=>noContext?null:ctx,remove:()=>{canvas.removed=true;}};
 const body={prepend:()=>{canvas.appended=true;}};
 const doc={body,hidden:false,activeElement:null,createElement:()=>canvas,querySelector:()=>({getBoundingClientRect:()=>({bottom:150})}),elementFromPoint:()=>body,addEventListener:(type,fn)=>listen(events,type,fn),removeEventListener:(type,fn)=>remove(events,type,fn)};
 const media={matches:reduced,addEventListener:(type,fn)=>listen(mediaEvents,type,fn),removeEventListener:(type,fn)=>remove(mediaEvents,type,fn)};
 const host={innerWidth:390,innerHeight:844,devicePixelRatio:3,performance:{now:()=>time},matchMedia:()=>media,requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:key=>frames.delete(key),setTimeout:(fn,wait)=>{timers.set(++id,{fn,due:time+wait});return id;},clearTimeout:key=>timers.delete(key),addEventListener:(type,fn)=>listen(events,type,fn),removeEventListener:(type,fn)=>remove(events,type,fn)};
 const fire=type=>events.get(type)?.forEach(fn=>fn());
 const advance=ms=>{time+=ms;for(const [key,t]of [...timers])if(t.due<=time){timers.delete(key);t.fn();}const tick=[...frames];frames.clear();for(const [,fn]of tick)fn(time);};
 return {host,doc,media,canvas,ctx,calls,frames,timers,events,fire,advance,changeMotion:value=>{media.matches=value;mediaEvents.get('change')?.forEach(fn=>fn());},create:()=>createAmbientSparks({host,doc,random:()=>.5})};
}

test('portrait phone uses a transparent decorative canvas with bounded density and rounded drawing',()=>{
 const f=fixture(),controller=f.create();assert.equal(f.canvas.appended,true);assert.equal(f.canvas['aria-hidden'],'true');assert.equal(f.canvas.width,780);assert.equal(f.canvas.height,1688);assert.equal(f.ctx.lineCap,'round');
 f.advance(300);assert.equal(f.canvas.dataset.active,'true');assert.equal(f.canvas.dataset.kind,'spark');const points=f.calls.filter(c=>c[0]==='arc');assert.ok(points.length>0);assert.ok(points.every(c=>c.slice(1).every(Number.isFinite)));
 f.advance(2600);assert.equal(f.canvas.dataset.active,'false');assert.equal(f.frames.size,0);assert.equal(f.timers.size,1);controller.destroy();
});

test('real lifecycle conditions stop all drawing and resume without piled-up timers',()=>{
 const f=fixture(),controller=f.create();f.advance(300);assert.equal(f.frames.size,1);
 f.doc.hidden=true;f.fire('visibilitychange');assert.equal(f.canvas.dataset.active,'false');assert.equal(f.frames.size,0);assert.equal(f.timers.size,0);
 f.doc.hidden=false;f.fire('visibilitychange');f.fire('visibilitychange');assert.equal(f.timers.size,1);f.advance(300);assert.equal(f.canvas.dataset.active,'true');
 f.fire('pagehide');assert.equal(f.frames.size,0);f.fire('pageshow');assert.equal(f.timers.size,1);controller.destroy();assert.equal(f.frames.size,0);assert.equal(f.timers.size,0);assert.equal(f.canvas.removed,true);assert.ok([...f.events.values()].every(set=>set.size===0));
});

test('reduced motion never schedules particles and changing preference clears immediately',()=>{
 const f=fixture({reduced:true}),controller=f.create();assert.equal(f.timers.size,0);assert.equal(f.frames.size,0);f.advance(5000);assert.equal(f.calls.some(c=>c[0]==='arc'),false);
 f.changeMotion(false);f.advance(300);assert.equal(f.canvas.dataset.active,'true');f.changeMotion(true);assert.equal(f.canvas.dataset.active,'false');assert.equal(f.frames.size,0);assert.equal(f.timers.size,0);controller.destroy();
});

test('typing suppresses background particles and leaving the editor resumes them',()=>{
 const f=fixture(),controller=f.create();f.advance(300);f.doc.activeElement={tagName:'TEXTAREA'};f.fire('focusin');assert.equal(f.canvas.dataset.active,'false');assert.equal(f.timers.size,0);
 f.doc.activeElement={tagName:'BUTTON'};f.fire('focusin');f.advance(300);assert.equal(f.canvas.dataset.active,'true');controller.destroy();
});

test('repeated Safari toolbar resizes preserve active bursts and one animation chain',()=>{
 const f=fixture(),controller=f.create();f.advance(300);f.host.innerHeight=780;f.fire('resize');f.fire('resize');f.advance(16);assert.equal(f.canvas.height,1560);assert.equal(f.canvas.dataset.active,'true');assert.equal(f.frames.size,1);assert.equal(f.timers.size,0);controller.destroy();
});

test('canvas unavailable is a harmless no-op rather than a startup failure',()=>{
 const f=fixture({noContext:true});assert.doesNotThrow(()=>f.create().destroy());assert.equal(f.canvas.appended,undefined);assert.equal(f.timers.size,0);
});

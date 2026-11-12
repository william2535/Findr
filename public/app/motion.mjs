import {createAmbientSparks} from './ambient-sparks.mjs';
// Decorative motion only: never changes a job, loading state or panel indicator.
// Heading glow, edge traces and short surface reveals; the logo and tiles stay matte.
const SURFACES = '.project-badge,.home-pack-card,.home-import-callout,.panel-card,.pack,.manual,.device-card,.device-pack-card,.emulator-profile-card,.menu-map-card,.menu-result,.wiring-card,.wiring-family-card,.wiring-brand-card,.field-tool,.resume-session';
const ACTIONS = '.home-quick-links > a,.home-import-callout > .primary,.emulator-landing .primary,.terminal-input-row > .primary';
const TITLES = '.home-intro h1,.emulator-landing-head h1,.menu-heading h1,.section-head h1';
const HEADINGS = '.home-intro,.section-head,.emulator-landing-head,.menu-heading,.wiring-pack-browse-heading';
const IGNORED = '.terminal-line,.terminal-history,.diagnostic-transcript,.reader-canvas,.pdfViewer,canvas,.practice-keypad,.minerva-fascia,.cfp-fascia,.sigma-fascia';

export function createInterfaceMotion({root}){
 const sparks=createAmbientSparks();
 let route='',scheduled=0,destroyed=false;
 const observed=new Set(),entered=new Set(),entrances=new Set();
 // Interface animations are always enabled, regardless of any legacy saved preference.
 const cancelEntrances=()=>{for(const animation of entrances)animation.cancel();entrances.clear();};
 const entranceKey=node=>node.className+'|'+(node.getAttribute('href')||node.dataset.id||node.querySelector('[data-id]')?.dataset.id||node.textContent.trim().slice(0,96));
 function enter(node){
  if(document.hidden||!node.animate||node.matches('.brand,.terminal-job-bar,.motion-action,.motion-title'))return;
  const key=entranceKey(node);if(entered.has(key))return;entered.add(key);
  const animation=node.animate([{opacity:.6,transform:'translateY(7px)'},{opacity:1,transform:'none'}],{duration:320,delay:Number(node.dataset.motionDelay)||0,easing:'cubic-bezier(.2,.7,.2,1)'});
  entrances.add(animation);animation.finished.catch(()=>{}).finally(()=>entrances.delete(animation));
 }
 const visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries){entry.target.classList.toggle('motion-visible',entry.isIntersecting);if(entry.isIntersecting)enter(entry.target);}
 },{threshold:0}):null;
 function refresh(){
  scheduled=0;if(destroyed)return;
  const next=location.hash||'#home';if(next!==route){route=next;entered.clear();cancelEntrances();}
  for(const node of observed)if(!node.isConnected){visibility?.unobserve(node);observed.delete(node);}
  const nodes=[...document.querySelectorAll('.header > nav > a'),...root.querySelectorAll(SURFACES+','+HEADINGS+','+ACTIONS+','+TITLES+',.terminal-job-bar')];
  let index=0;
  for(const node of nodes){
   if(observed.has(node)||observed.size>=240||node.closest(IGNORED))continue;
   observed.add(node);node.classList.add('motion-watch');
   if(node.matches(ACTIONS+',.header > nav > a'))node.classList.add('motion-action');
   if(node.matches(TITLES))node.classList.add('motion-title');
   if(node.matches(HEADINGS+',.home-import-callout,.terminal-job-bar'))node.classList.add('motion-rail');
   node.dataset.motionDelay=String(Math.min(index++%5*28,112));
   node.style.setProperty('--motion-phase',String(index%4*-.65)+'s');
   if(visibility)visibility.observe(node);else{node.classList.add('motion-visible');enter(node);}
  }
 }
 function schedule(){if(!scheduled&&!document.hidden)scheduled=requestAnimationFrame(refresh);}
 function sync(){
  document.body.dataset.interfaceMotion='on';
  document.body.dataset.motionPaused=document.hidden?'true':'false';
  if(document.hidden)cancelEntrances();
  if(!document.hidden)schedule();
 }
 // Text animation mutates the transcript constantly. Ignore it completely.
 // Only newly inserted interface elements trigger one batched scan per frame.
 const mutations=new MutationObserver(records=>{
  if(records.some(record=>!record.target.closest?.(IGNORED)&&[...record.addedNodes].some(node=>node.nodeType===1)))schedule();
 });
 mutations.observe(root,{childList:true,subtree:true});
 document.addEventListener('visibilitychange',sync);
 sync();
 return {
  refresh:schedule,
  destroy(){destroyed=true;sparks.destroy();mutations.disconnect();visibility?.disconnect();cancelAnimationFrame(scheduled);cancelEntrances();observed.clear();document.removeEventListener('visibilitychange',sync);}
 };
}

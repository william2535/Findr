// Short generated tones; no audio downloads and no sound on render/reload.
export function createFessAudio({AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext,enabled=true}={}){
 let context=null,pending=null,epoch=0,disposed=false;const voices=new Set();
 function pause(){epoch++;for(const voice of voices){try{voice.osc.stop();}catch{}try{voice.osc.disconnect();voice.gain.disconnect();}catch{}}voices.clear();}
 function unlock(){
  if(!enabled||disposed||typeof AudioContext!=='function')return Promise.resolve(false);
  try{context||=new AudioContext();if(context.state==='running')return Promise.resolve(true);if(!pending){pending=Promise.resolve(context.resume()).then(()=>context.state==='running',()=>false).finally(()=>{pending=null;});}return pending;}catch{return Promise.resolve(false);}
 }
 function tone(frequency,start,duration,level=.12){
  const osc=context.createOscillator(),gain=context.createGain(),voice={osc,gain};voices.add(voice);osc.type='sine';osc.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(gain);gain.connect(context.destination);osc.onended=()=>{voices.delete(voice);try{osc.disconnect();gain.disconnect();}catch{}};osc.start(start);osc.stop(start+duration+.025);
 }
 function play(kind){
  if(!enabled||disposed||!context)return false;
  pause();const stamp=epoch,perform=()=>{if(stamp!==epoch||!enabled||disposed||context.state!=='running')return false;try{const t=context.currentTime+.005;if(kind==='wrong'){tone(165,t,.12,.1);tone(130.81,t+.13,.16,.09);}else if(kind==='complete'){tone(523.25,t,.18);tone(659.25,t+.1,.19);tone(783.99,t+.2,.22);}else{tone(783.99,t,.19);tone(1046.5,t+.07,.23,.075);}return true;}catch{return false;}};
  if(context.state==='running')return perform();if(pending){pending.then(ok=>{if(ok)perform();});return true;}return false;
 }
 return {unlock,play,pause,setEnabled(value){enabled=!!value;if(!enabled)pause();},isAvailable:()=>typeof AudioContext==='function',isReady:()=>context?.state==='running',dispose(){pause();disposed=true;try{context?.close()?.catch?.(()=>{});}catch{}}};
}

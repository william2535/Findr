/** Deterministic DC/network arithmetic. Downloaded pack data never executes code. */
export const PACK_CALCULATOR_IDS=['dc-ohms','resistors','cctv-storage','bandwidth','poe-budget','dc-load'];
export function calculatePackTool(id,values={}){
 const errors={},v={};
 const number=(key,{positive=false,integer=false,max=1e12}={})=>{const raw=values[key];const n=typeof raw==='number'?raw:typeof raw==='string'&&raw.trim()!==''?Number(raw):NaN;if(!Number.isFinite(n)||n<0||(positive&&n===0)||(integer&&!Number.isInteger(n))||n>max){errors[key]='Enter a '+(positive?'positive':'non-negative')+(integer?' whole':'')+' number'+(max<1e12?` up to ${max}`:'')+'.';return 0;}v[key]=n;return n;};
 let results=[],notes=[];
 if(id==='dc-ohms'){
  const volts=number('volts',{positive:true}),ohms=number('ohms',{positive:true});results=[['Current',volts/ohms,'A'],['Power',volts*volts/ohms,'W']];notes=['For a steady DC resistive load. Real devices may have startup current or non-resistive behaviour.'];
 }else if(id==='resistors'){
  const a=number('r1',{positive:true}),b=number('r2',{positive:true});results=[['Series total',a+b,'Ω'],['Parallel total',a*b/(a+b),'Ω']];notes=['Ideal nominal resistors; tolerance and power ratings still apply. This does not establish the alarm input’s required wiring profile.'];
 }else if(id==='cctv-storage'){
  const cameras=number('cameras',{positive:true,integer:true,max:100000}),rate=number('mbps'),hours=number('hours',{positive:true,max:24}),days=number('days',{positive:true,max:36500});const gb=cameras*rate*1e6*hours*3600*days/8/1e9;results=[['Video payload',gb,'GB'],['Video payload',gb/1000,'TB'],['Aggregate active bitrate',cameras*rate,'Mbit/s']];notes=['Decimal GB/TB. Constant average bitrate and identical cameras are assumed. Audio, metadata, filesystem/RAID reserves and variable bitrate peaks are excluded. Actual retention must be checked on the recorder.'];
 }else if(id==='bandwidth'){
  const cameras=number('cameras',{positive:true,integer:true,max:100000}),rate=number('mbps'),streams=number('streams',{positive:true,integer:true,max:1000}),capacity=number('capacity',{positive:true});const total=cameras*rate*streams;results=[['Payload bitrate',total,'Mbit/s'],['Nominal link utilisation',total/capacity*100,'%'],['Nominal spare capacity',capacity-total,'Mbit/s']];notes=['Assumes every counted stream crosses this link. Excludes protocol overhead, bursts and other traffic. A positive spare value is not a network-performance guarantee.'];
 }else if(id==='poe-budget'){
  const devices=number('devices',{positive:true,integer:true,max:100000}),perPort=number('watts'),budget=number('budget',{positive:true}),limit=number('limit',{positive:true});const total=devices*perPort;results=[['Required switch allocation',total,'W'],['Total budget remaining',budget-total,'W'],['Per-port headroom',limit-perPort,'W']];notes=['Enter each device’s maximum allocated demand at the switch/PSE, including losses as applicable. Identical ports/devices assumed. Total budget and per-port limits both matter; IEEE type/class, negotiation, cable and device requirements still need checking.'];if(total>budget||perPort>limit)notes.unshift('The entered demand exceeds at least one entered limit.');
 }else if(id==='dc-load'){
  const devices=number('devices',{positive:true,integer:true,max:100000}),ma=number('milliamps'),volts=number('volts',{positive:true});const amps=devices*ma/1000;results=[['Total current',amps,'A'],['Total current',amps*1000,'mA'],['Steady DC power',volts*amps,'W']];notes=['Identical loads at the entered voltage. Use the correct standby, active or worst-case specification; startup peaks and charger allowance are not included.'];
 }else return {status:'invalid',errors:{tool:'Unknown pack calculator.'},results:[],notes:[]};
 if(Object.keys(errors).length||results.some(([,n])=>!Number.isFinite(n)))return {status:'invalid',errors:Object.keys(errors).length?errors:{calculation:'The result is outside the supported range.'},results:[],notes:[]};
 return {status:'calculated',results,notes};
}

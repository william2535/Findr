// An original adaptive triage engine. Weights are editorial, not calibrated probabilities.
export const ANSWERS=Object.freeze([
 Object.freeze(['yes','Yes']),
 Object.freeze(['no','No']),
 Object.freeze(['unknown','I don’t know']),
]);
// Older saved sessions keep their original evidence strength. These values are
// read-only compatibility inputs, never choices in a new question.
const weight={yes:1,probably:.5,'probably-not':-.5,no:-1,unknown:0};
const labels={...Object.fromEntries(ANSWERS),probably:'Probably (earlier session)','probably-not':'Probably not (earlier session)'};
export function answerLabel(value){return Object.hasOwn(labels,value)?labels[value]:'Not recorded';}
export function answerEntries(group,answers={}){
 const questions=new Set(group.questions.map(q=>q.id));
 return Object.entries(answers||{}).filter(([id,value])=>questions.has(id)&&typeof value==='string'&&Object.hasOwn(weight,value));
}
function likelihood(c,id){const value=c.likelihoods?.[id];return Number.isFinite(value)?Math.max(.05,Math.min(.95,value)):.5;}
export function rank(group,answers={}) {
 const evidence=answerEntries(group,answers);
 const scored=group.causes.map(c=>{
  let log=0;const support=[],against=[];
  for(const [id,a] of evidence){
   const w=weight[a],p=likelihood(c,id);
   log+=Math.abs(w)*Math.log(w>=0?p:1-p);
   if(w*(p-.5)>.09)support.push(id);
   if(w*(p-.5)<-.09)against.push(id);
  }
  return {...c,log,support,against};
 });
 if(!scored.length)return [];
 const max=Math.max(...scored.map(x=>x.log));
 const total=scored.reduce((sum,c)=>sum+Math.exp(c.log-max),0);
 return scored.map(c=>({...c,share:Math.exp(c.log-max)/total})).sort((a,b)=>b.log-a.log);
}
export function nextQuestion(group,answers={}) {
 const answered=new Set(answerEntries(group,answers).map(([id])=>id));
 const ranked=rank(group,answers),entropy=p=>p<=0||p>=1?0:-p*Math.log2(p)-(1-p)*Math.log2(1-p);
 return group.questions.filter(q=>!answered.has(q.id)).map(q=>{
  const mean=ranked.reduce((sum,c)=>sum+c.share*likelihood(c,q.id),0);
  const gain=entropy(mean)-ranked.reduce((sum,c)=>sum+c.share*entropy(likelihood(c,q.id)),0);
  return {...q,gain};
 }).sort((a,b)=>b.gain-a.gain)[0]??null;
}
export function assess(group,answers={}){
 const ranked=rank(group,answers);
 const known=answerEntries(group,answers).filter(([,a])=>weight[a]!==0).length;
 return {ranked,known,insufficient:known<2||!ranked[0]?.support.length,conflicting:ranked[0]?.against.length>0};
}
export async function validatePDF(blob,expectedHash){
 if(blob.size>120*1024*1024)throw new Error('PDF is over the 120 MB device limit.');
 if(blob.size<32)throw new Error('The download is empty or incomplete.');
 const bytes=new Uint8Array(await blob.arrayBuffer());
 if(!new TextDecoder().decode(bytes.subarray(0,1024)).includes('%PDF-'))throw new Error('The publisher returned a web page instead of a PDF.');
 if(!new TextDecoder().decode(bytes.subarray(Math.max(0,bytes.length-4096))).includes('%%EOF'))throw new Error('The PDF appears incomplete. Please download it again.');
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(expectedHash&&hash!==expectedHash)throw new Error('This PDF differs from the checked archive copy. Review the publisher version and import it manually.');
 return hash;
}

// Ideal, two-terminal series/parallel resistance only; no bridge or powered-circuit solver.
export const RESISTOR_LAB_KEY='resistor-lab:v1';
export const LAB_LIMITS=Object.freeze({stock:12,combination:4,nodes:48,depth:8});
const id=()=>globalThis.crypto.randomUUID();
export function parseResistance(raw,{allowOpen=true}={}){
 const text=String(raw??'').trim();
 if(allowOpen&&/^(?:open|ol|∞|infinity)$/i.test(text))return null;
 const embedded=/^(\d+)([rRkKM])(\d+)$/.exec(text);
 let value;
 if(embedded)value=Number(embedded[1]+'.'+embedded[3])*({r:1,k:1000,m:1e6}[embedded[2].toLowerCase()]);
 else {const match=/^(\d+(?:\.\d*)?|\.\d+)\s*(Ω|ohms?|[rR]|[kK](?:Ω|ohms?)?|M(?:Ω|ohms?)?)?$/.exec(text);if(!match)throw new Error('Enter a non-negative resistance, such as 470, 2.2k or 1M.');value=Number(match[1])*(match[2]?.startsWith('M')?1e6:/^[kK]/.test(match[2]||'')?1000:1);}
 if(!Number.isFinite(value)||value>1e12)throw new Error('Resistance must be between 0 Ω and 1 TΩ.');
 return value;
}
export function formatResistance(value){if(value===null||value===Infinity)return 'Open circuit';if(!Number.isFinite(value)||value<0)return 'Invalid';const [scale,unit]=value>=1e9?[1e9,'GΩ']:value>=1e6?[1e6,'MΩ']:value>=1000?[1000,'kΩ']:[1,'Ω'];return new Intl.NumberFormat('en-GB',{maximumSignificantDigits:7}).format(value/scale)+' '+unit;}
export function combineResistance(kind,values){
 if(!['series','parallel'].includes(kind)||!Array.isArray(values)||values.some(v=>v!==null&&(!Number.isFinite(v)||v<0)))throw new Error('Invalid circuit values.');
 if(!values.length)return null;
 if(kind==='series')return values.includes(null)?null:values.reduce((s,v)=>s+v,0);
 if(values.includes(0))return 0;
 const finite=values.filter(v=>v!==null);if(!finite.length)return null;
 const smallest=Math.min(...finite);return smallest/finite.reduce((sum,v)=>sum+smallest/v,0);
}
export function resistor(ohms=2200,nodeId=id()){return {id:nodeId,type:'resistor',ohms};}
export function group(type='series',children=[],nodeId=id()){return {id:nodeId,type,children};}
export function demoCircuit(which='parallel'){return which==='mixed'?group('series',[resistor(1000),group('parallel',[resistor(2200),resistor(2200)])]):which==='small'?group('parallel',[resistor(4),resistor(1)]):group('parallel',[resistor(2200),resistor(2200)]);}
export function validateCircuit(root){
 const seen=new Set();let count=0;
 function walk(node,depth){if(!node||typeof node!=='object'||typeof node.id!=='string'||!node.id||seen.has(node.id)||depth>LAB_LIMITS.depth||++count>LAB_LIMITS.nodes)throw new Error('Circuit is too large or contains an invalid connection.');seen.add(node.id);
 if(node.type==='resistor'){if(node.ohms!==null&&(!Number.isFinite(node.ohms)||node.ohms<0||node.ohms>1e12))throw new Error('A resistor value is invalid.');}
 else if(['series','parallel'].includes(node.type)&&Array.isArray(node.children))node.children.forEach(n=>walk(n,depth+1));else throw new Error('Use resistor, series or parallel elements.');}
 walk(root,0);if(root.type==='resistor')throw new Error('The top of the sandbox must be a series or parallel group.');return root;
}
export function circuitResistance(root){validateCircuit(root);const evaluate=n=>n.type==='resistor'?n.ohms:combineResistance(n.type,n.children.map(evaluate));return evaluate(root);}
export function circuitExpression(root){return root.type==='resistor'?formatResistance(root.ohms):root.children.length?'('+root.children.map(circuitExpression).join(root.type==='series'?' + ':' ∥ ')+')':'(Open group)';}
export function circuitNodes(root){const rows=[];function visit(node,parent=null,depth=0){rows.push({node,parent,depth});if(node.children)node.children.forEach(n=>visit(n,node,depth+1));}visit(root);return rows;}
export function changeCircuit(root,action){
 validateCircuit(root);const next=structuredClone(root),rows=circuitNodes(next),entry=rows.find(r=>r.node.id===action.id);
 if(action.kind==='add'){const parent=rows.find(r=>r.node.id===action.parentId)?.node;if(!parent?.children)throw new Error('Choose a series or parallel destination.');parent.children.push(structuredClone(action.node));}
 else {if(!entry)throw new Error('This element is no longer in the circuit.');const {node,parent}=entry;
 if(action.kind==='value'){if(node.type!=='resistor')throw new Error('Choose a resistor.');node.ohms=action.ohms;}
 else if(action.kind==='mode'){if(!node.children||!['series','parallel'].includes(action.type))throw new Error('Choose series or parallel.');node.type=action.type;}
 else if(action.kind==='remove'){if(!parent)throw new Error('The top group cannot be removed.');parent.children.splice(parent.children.findIndex(n=>n.id===node.id),1);}
 else if(action.kind==='move'){const destination=rows.find(r=>r.node.id===action.parentId)?.node;if(!parent||!destination?.children||circuitNodes(node).some(r=>r.node.id===destination.id))throw new Error('An element cannot be moved inside itself.');parent.children.splice(parent.children.findIndex(n=>n.id===node.id),1);const index=Number.isInteger(action.index)?Math.max(0,Math.min(action.index,destination.children.length)):destination.children.length;destination.children.splice(index,0,node);}
 else throw new Error('Unknown circuit action.');}
 validateCircuit(next);return next;
}
export function parseStock(raw){
 const items=[];for(const row of String(raw??'').split(/[\n,;]+/).map(v=>v.trim()).filter(Boolean)){
 const match=/^(.*?)\s*(?:[x×]\s*(\d+))?$/i.exec(row),ohms=parseResistance(match[1],{allowOpen:false}),quantity=match[2]?Number(match[2]):1;
 if(!Number.isInteger(quantity)||quantity<1||quantity>LAB_LIMITS.stock)throw new Error('Use a quantity from 1 to 12 for each value.');
 for(let i=0;i<quantity;i++)items.push(ohms);if(items.length>LAB_LIMITS.stock)throw new Error('Search up to 12 available resistors at once. Reduce the quantities.');}
 if(!items.length)throw new Error('Add the resistor values you have available.');return items;
}
const aborted=()=>new DOMException('Search cancelled.','AbortError');
/** Exhaustive within the stated stock/count limit: all binary series/parallel
 * topologies for each subset. Canonical expressions remove duplicates only. */
export async function findResistorCombinations({target,stock,maxParts=3,signal,onProgress=()=>{},yieldControl=()=>new Promise(r=>setTimeout(r,0))}){
 if(!Number.isFinite(target)||target<=0||target>1e12)throw new Error('Enter a target greater than 0 Ω, up to 1 TΩ.');
 if(!Array.isArray(stock)||!stock.length||stock.length>LAB_LIMITS.stock||stock.some(v=>!Number.isFinite(v)||v<0||v>1e12))throw new Error('Use 1–12 valid available resistor values.');
 if(!Number.isInteger(maxParts)||maxParts<1||maxParts>LAB_LIMITS.combination)throw new Error('Search between 1 and 4 resistors per result.');
 const n=stock.length,pop=m=>{let k=0;while(m){m&=m-1;k++;}return k;},masks=Array.from({length:(1<<n)-1},(_,i)=>i+1).filter(m=>pop(m)<=maxParts).sort((a,b)=>pop(a)-pop(b)||a-b),memo=new Map(),best=new Map();let processed=0,candidates=0;
 for(const mask of masks){if(signal?.aborted)throw aborted();const count=pop(mask),values=new Map();
 if(count===1){const value=stock[Math.log2(mask)],tree={type:'resistor',ohms:value};values.set('r'+value,{ohms:value,tree,key:'r'+value,count:1});}
 else for(let left=(mask-1)&mask;left;left=(left-1)&mask){const right=mask^left;if(!right||left>right)continue;for(const a of memo.get(left).values())for(const b of memo.get(right).values())for(const type of ['series','parallel']){
 const children=[a,b].sort((x,y)=>x.key.localeCompare(y.key)),key=(type==='series'?'s':'p')+'('+children.map(c=>c.key).join(',')+')';if(values.has(key))continue;
 const ohms=combineResistance(type,[a.ohms,b.ohms]);values.set(key,{ohms,tree:{type,children:children.map(c=>c.tree)},key,count});}}
 memo.set(mask,values);for(const row of values.values()){candidates++;if(!best.has(row.key))best.set(row.key,{...row,errorOhms:row.ohms-target,errorPercent:100*(row.ohms-target)/target});}
 processed++;if(processed%16===0||processed===masks.length){onProgress({completed:processed,total:masks.length,candidates});await yieldControl();}}
 if(signal?.aborted)throw aborted();const rows=[...best.values()].sort((a,b)=>Math.abs(a.errorPercent)-Math.abs(b.errorPercent)||a.count-b.count||a.key.localeCompare(b.key));
 return {results:rows.slice(0,12).map(({key,...row})=>row),examined:candidates,unique:rows.length,stockCount:n,maxParts};
}
export function instantiateCircuit(tree){const visit=n=>n.type==='resistor'?resistor(n.ohms):group(n.type,n.children.map(visit));const root=visit(tree);return root.type==='resistor'?group('series',[root]):root;}
export function defaultLabState(){return {schemaVersion:1,target:'1.1',targetUnit:'kΩ',stock:'1k x 2\n2.2k x 4\n4.7k x 2',maxParts:3,tab:'find',circuit:demoCircuit()};}
export function validateLabState(value){if(value==null)return defaultLabState();if(!value||value.schemaVersion!==1||typeof value.target!=='string'||value.target.length>80||!['Ω','kΩ','MΩ'].includes(value.targetUnit)||typeof value.stock!=='string'||value.stock.length>2000||![1,2,3,4].includes(value.maxParts)||!['find','sandbox'].includes(value.tab))throw new Error('Saved resistor inputs could not be read. They have been left unchanged.');validateCircuit(value.circuit);return structuredClone(value);}

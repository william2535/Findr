import {retrieveManualPassages} from './manual-retrieval.mjs';

export const HELPER_SEARCH_PLAN_VERSION='2026-11-12.1';
const list=value=>Array.isArray(value)?value:[];
const compact=value=>String(value??'').normalize('NFC').replace(/\s+/g,' ').trim();
const fold=value=>compact(value).toLowerCase();
const tokens=value=>fold(value).match(/[\p{L}\p{N}][\p{L}\p{N}_.+-]*/gu)||[];
const unique=items=>[...new Set(items.filter(Boolean))];
const headingWords=value=>unique(tokens(value).flatMap(word=>[word,...word.split(/[-_.+]+/)]));
const stop=new Set('a an and are as at be been by can could do does for from has have how i in is it its me my of on or our that the their them then there these this to was were what when where which will with would you your please tell show explain need want help using use panel system manual look up get find'.split(' '));

// These are retrieval vocabulary bridges, never operating instructions. Preserve
// the entire original request in every rewrite so an unknown model/code/target
// cannot disappear merely because a familiar operation was recognised.
function bridge(question){
 const q=fold(question);
 if(!/\b(?:print|export|delete|clear|erase|disable|enable|reset|edit|change|configure|stop|start)\b/.test(q)&&/\b(?:old|previous|past|recent|earlier)\s+(?:fire\s+)?(?:alarms?|events?)\b|\bwhat\s+happened\b|\b(?:event history|event log|alarm history)\b/.test(q))return {id:'event-history',terms:'view event history log recorded alarms',headingGroups:[['view','log'],['event','log'],['view','history']]};
 if(/\b(?:set|change|adjust|correct)\b.{0,35}\bclock\b|\bclock\b.{0,35}\b(?:set|change|adjust|correct)\b/.test(q))return {id:'clock-setting',terms:'change date time clock',headingGroups:[['change','time'],['set','time']]};
 if(/\b(?:check|view|show|see|list|which|what)\b.{0,45}\b(?:disabled|disablements?)\b|\bdisabled\b.{0,35}\b(?:status|list)\b/.test(q))return {id:'disabled-status',terms:'view disablements disabled status',headingGroups:[['view','disable'],['disabled','status']]};
 return null;
}
function headings(passage){return unique(list(passage?.headings).map(h=>compact(h?.title)).concat(passage?.section||[]));}
function headingMatch(passage,hint){
 if(!hint)return false;
 return headings(passage).some(heading=>hint.headingGroups.some(group=>group.every(term=>headingWords(heading).some(word=>word===term||word.startsWith(term)))));
}
function matchingHeading(indexes,hint,focusTerms){
 const wanted=hint?unique(hint.headingGroups.flat()):unique(list(focusTerms).flatMap(tokens).filter(word=>!stop.has(word))),candidates=[];
 if(!wanted.length)return '';
 for(const index of list(indexes))for(const passage of list(index.passages))for(const title of headings(passage)){
  const words=headingWords(title),hits=wanted.filter(term=>words.some(word=>word===term||word.startsWith(term))).length;
  if(hits<Math.min(2,wanted.length)||hint&&!headingMatch({section:title},hint))continue;
  candidates.push({title,hits});
 }
 return candidates.sort((a,b)=>b.hits-a.hits||a.title.localeCompare(b.title))[0]?.title||'';
}

/** Bounded local navigation of already scoped, readable manual passages.
 * The caller supplies its existing original-question relevance gate. No model,
 * catalogue, file download, source mutation or access to another helper occurs.
 * A found passage is a candidate reference, never proof of a complete procedure.
 */
export function searchHelperManuals({question='',indexes=[],equipment=[],focusTerms=[],accept=()=>true,limit=4,search=retrieveManualPassages,onSearch}={}){
 const original=compact(question),hint=bridge(original),attempts=[],found=new Map(),queries=new Set();
 const allowed=new Map(list(indexes).flatMap(index=>list(index.passages).map(p=>[p.id,p])));
 const desired=Math.max(1,Math.min(12,Number(limit)||4));
 function run(query,kind){
  query=compact(query);const key=fold(query);if(!query||queries.has(key)||attempts.length>=3)return [];
  queries.add(key);onSearch?.({phase:'retrieval',message:kind==='original'?'Searching saved manuals…':kind==='heading'?'Checking the matching manual section…':'Trying the manual’s wording…',searchNumber:attempts.length+1});
  const candidates=list(search(indexes,query,{equipment,limit:12,maxCharacters:12500})).filter(p=>{
   const actual=allowed.get(p?.id);return actual&&actual.manualId===p.manualId&&actual.contentHash===p.contentHash&&actual.page===p.page&&actual.text===p.text&&accept(p,original);
  });
  const rankWeight=kind==='original'?1:1.1;
  candidates.forEach((p,i)=>{const current=found.get(p.id)||{passage:p,score:0};current.score+=rankWeight/(20+i+1);found.set(p.id,current);});
  attempts.push({kind,query,candidateIds:candidates.map(p=>p.id)});return candidates;
 }
 const initial=run(original,'original');
 // Avoid unnecessary extra searches when the first pass already located the
 // requested section, or no controlled vocabulary bridge is needed.
 if(hint&&!headingMatch(initial[0],hint))run(original+' '+hint.terms,'vocabulary');
 const ranked=()=>[...found.values()].sort((a,b)=>(Number(headingMatch(b.passage,hint))-Number(headingMatch(a.passage,hint)))||b.score-a.score||a.passage.page-b.passage.page);
 let rows=ranked();
 if(!rows.length||hint&&!headingMatch(rows[0]?.passage,hint)){
  const title=matchingHeading(indexes,hint,focusTerms);
  if(title)run(original+' '+title,'heading');
 }
 rows=ranked();
 const passages=rows.slice(0,desired).map(({passage},i)=>({...passage,citationId:'S'+(i+1)}));
 return {passages,plan:{version:HELPER_SEARCH_PLAN_VERSION,scope:'selected_helper_manuals',attempts,searchCount:attempts.length,status:passages.length?'candidate_references_found':'not_established',stopped:attempts.length===3?'search_budget':passages.length?'candidates_found':'no_matching_section',inferenceUsed:false}};
}

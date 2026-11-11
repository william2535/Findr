// Local, inspectable retrieval. A model may select source text; it cannot create
// manufacturer facts, page numbers, permissions or verified procedures.
import {assessPageText} from './manual-analysis-core.mjs';
export const MANUAL_RETRIEVAL_VERSION='2026-11-10.2';
const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'');
const compact=value=>text(value).normalize('NFC').replace(/\u0000/g,'').replace(/\s+/g,' ').trim();
const folded=value=>compact(value).toLowerCase();
const unique=values=>[...new Set(values.filter(Boolean))];
const STOP=new Set('a an and are as at be been by can could do does for from has have how i in is it its me of on or that the their them then there these this to was were what when where which will with would you your please tell show explain'.split(' '));
const ALIASES={psu:['power','supply'],eol:['end','line'],deol:['double','balanced','end','line'],teol:['triple','end','line'],rte:['request','exit'],rex:['request','exit'],mcp:['manual','call','point'],asd:['aspirating','smoke','detection'],poe:['power','ethernet'],nvr:['network','video','recorder'],dvr:['digital','video','recorder'],maglock:['magnetic','lock'],history:['event','log'],events:['history','log'],logs:['history','event'],cctv:['camera','recorder'],compatible:['compatibility','supported','protocol'],compatibility:['compatible','supported','protocol'],terminals:['terminal','wiring'],wires:['wiring','terminal'],walktest:['walk','test'],faults:['fault','trouble'],volts:['voltage'],voltage:['volts','supply']};
const stem=word=>word.length>4&&!/\d/.test(word)?word.replace(/(?:ies)$/,'y').replace(/(?:ing|ed|s)$/,''):word;
function words(value){return (folded(value).match(/[\p{L}\p{N}][\p{L}\p{N}_.+-]*/gu)||[]).filter(word=>word.length>1&&!STOP.has(word));}
function terms(value){return unique(words(value).flatMap(word=>[word,stem(word)]));}
function queryTerms(value){return unique(words(value).flatMap(word=>[word,stem(word),...(ALIASES[word]||[])]));}
// Equipment chooses the document, not the answer passage. Otherwise a cover
// repeating the model can outrank an actual procedure that never names it.
function focusedQuery(value,equipment){
 const identity=new Set(list(equipment).flatMap(item=>queryTerms([item?.manufacturer,item?.model,...list(item?.models)].filter(Boolean).join(' '))));
 const query=queryTerms(value),focused=query.filter(term=>!identity.has(term));
 return focused.length?focused:query;
}
function contentsLike(value){return /\b(?:table of contents|contents)\b/i.test(value)&&/\.{3,}|(?:\s\d{1,3}){3}/.test(value)||[...text(value).matchAll(/\.{3,}\s*\d+/g)].length>=2;}

const indexCache=new WeakMap();
const controlInstruction=value=>/(?:ignore|override|disregard).{0,35}(?:system|developer|previous|earlier).{0,25}(?:prompt|instructions)|(?:system|developer) prompt|reveal.{0,20}(?:secret|api.?key)|execute.{0,20}(?:javascript|script)/i.test(text(value));
function chunks(value,max=1100){const source=text(value).replace(/\u0000/g,'').trim(),out=[];let start=0;while(start<source.length){let end=Math.min(source.length,start+max);if(end<source.length){const segment=source.slice(start,end),breakAt=Math.max(segment.lastIndexOf('\n'),segment.lastIndexOf('. ')+1,segment.lastIndexOf('; ')+1);if(breakAt>max*.55)end=start+breakAt;}const body=source.slice(start,end).trim();if(body)out.push({text:body,offset:start});start=end;while(/\s/.test(source[start]||'')&&start<source.length)start++;}return out;}
function readable(page){return page?.quality?.readable===true||page?.quality?.readable!==false&&assessPageText(text(page?.text),page||{}).readable;}

/** Serializable once-per-analysis index; store beside the existing hash-keyed text cache. */
export function buildManualIndex(analysis={}){
 if(!analysis||typeof analysis!=='object')analysis={};
 const identity=analysis.identity||{},manualId=analysis.manualId||analysis.id||'',hash=text(analysis.contentHash),passages=[];
 for(const page of analysis.usable===false?[]:list(analysis.pages)){
  if(!page||!Number.isInteger(page.page)||page.page<1||!readable(page))continue;
  for(const [part,chunk]of chunks(page.text).entries()){
   if(controlInstruction(chunk.text))continue;
   const tokens=terms(chunk.text),frequencies=Object.create(null);for(const word of words(chunk.text)){const token=stem(word);frequencies[token]=(frequencies[token]||0)+1;}
   passages.push({id:`${hash||manualId}:pdf-${page.page}:${part}`,manualId,contentHash:hash,processorVersion:analysis.processorVersion||'',title:analysis.title||analysis.filename||'Manual',page:page.page,pdfPage:page.page,printedPage:page.printedPage??page.printedPageLabel??null,section:page.section||page.sectionTitle||null,revision:identity.revision||analysis.revision||'',models:list(identity.models).length?list(identity.models):identity.model?[identity.model]:[],manufacturer:identity.manufacturer||'',equipmentRole:analysis.equipmentRole||'',method:page.method||'text',confidence:page.confidence??null,text:chunk.text,excerpt:chunk.text,offset:chunk.offset,tokens,frequencies,length:Math.max(1,words(chunk.text).length)});
  }
 }
 return {schemaVersion:1,version:MANUAL_RETRIEVAL_VERSION,manualId,contentHash:hash,processorVersion:analysis.processorVersion||'',title:analysis.title||'',identity:{...identity},pageCount:analysis.pageCount||list(analysis.pages).length,passages,vocabulary:unique(passages.flatMap(p=>p.tokens)),averageLength:passages.reduce((sum,p)=>sum+p.length,0)/Math.max(1,passages.length)};
}
function asIndex(value){if(value?.version===MANUAL_RETRIEVAL_VERSION&&Array.isArray(value.passages))return value;if(value&&typeof value==='object'){if(!indexCache.has(value))indexCache.set(value,buildManualIndex(value));return indexCache.get(value);}return buildManualIndex();}
// Bounded Damerau distance is retrieval-only. Numeric model/address tokens are
// never fuzzed, and a spelling match never establishes equipment identity.
function near(a,b){if(a===b)return true;if(a.length<5||b.length<5||/\d/.test(a+b)||Math.abs(a.length-b.length)>1)return false;if(a.length===b.length){const different=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])different.push(i);return different.length===1||different.length===2&&different[1]===different[0]+1&&a[different[0]]===b[different[1]]&&a[different[1]]===b[different[0]];}let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>b.length)i++;else j++;}return true;}
function equipmentBoost(p,equipment){let boost=1;for(const item of list(equipment)){if(item.manualId===p.manualId||item.contentHash&&item.contentHash===p.contentHash)boost=Math.max(boost,1.35);const model=folded(item.model);if(model&&p.models.some(value=>folded(value)===model))boost=Math.max(boost,1.25);}return boost;}

/** BM25-style ranking, explicit trade aliases and bounded spelling tolerance. */
export function retrieveManualPassages(analysesOrIndexes,question,{equipment=[],limit=4,maxCharacters=6000}={}){
 const indexes=list(analysesOrIndexes).map(asIndex),all=indexes.flatMap(index=>index.passages),query=focusedQuery(question,equipment);if(!all.length||!query.length)return [];
 const vocabulary=unique(indexes.flatMap(index=>index.vocabulary)),expanded=new Map(query.map(term=>[term,1]));
 for(const term of query)if(!vocabulary.includes(term))for(const candidate of vocabulary){if(near(term,candidate))expanded.set(candidate,Math.max(expanded.get(candidate)||0,.6));}
 const average=all.reduce((sum,p)=>sum+p.length,0)/all.length,frequencies=new Map([...expanded].map(([term])=>[term,all.filter(p=>p.tokens.includes(term)).length]));
 const ranked=all.map(p=>{let score=0,hits=0;for(const [term,weight]of expanded){if(!p.tokens.includes(term))continue;hits++;const count=p.frequencies[stem(term)]||1,df=frequencies.get(term)||0,idf=Math.log(1+(all.length-df+.5)/(df+.5));score+=weight*idf*(count*2.2)/(count+1.2*(.25+.75*p.length/average));}const phrase=folded(question);if(phrase.length>5&&folded(p.text).includes(phrase))score+=3;return {...p,score:score*equipmentBoost(p,equipment)*(contentsLike(p.text)?.12:1),matchedTerms:hits};}).filter(p=>p.matchedTerms>0).sort((a,b)=>b.score-a.score||a.page-b.page||a.offset-b.offset);
 const result=[],seen=new Set();let characters=0;for(const p of ranked){if(result.length>=Math.max(1,Math.min(12,limit)))break;if(seen.has(p.id))continue;if(characters+p.text.length>Math.max(200,maxCharacters)&&result.length)continue;seen.add(p.id);characters+=p.text.length;const {tokens,frequencies,length,...passage}=p;result.push({...passage,citationId:`S${result.length+1}`});}return result;
}
function sourceRef(p,quote){return {sourceId:p.id,citationId:p.citationId||null,manualId:p.manualId,contentHash:p.contentHash,processorVersion:p.processorVersion||'',title:p.title,revision:p.revision||'',models:list(p.models),page:p.page,pdfPage:p.page,printedPage:p.printedPage??null,section:p.section??null,method:p.method||'text',requiresSourceReview:p.method==='ocr',quote,excerpt:quote,relationship:'Verbatim text from a successfully read PDF page; installed equipment and procedure scope still require confirmation.'};}
function parseResponse(raw){if(raw&&typeof raw==='object'){if(Array.isArray(raw.claims))return raw;return {text:text(raw.text??raw.content??raw.answer??'')};}const value=text(raw).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');try{const parsed=JSON.parse(value);if(parsed&&typeof parsed==='object')return parsed;}catch{/* Plain model text is allowed, never evaluated. */}return {text:value};}
function quotedCandidates(raw){const value=text(raw);const candidates=[];for(const line of value.split(/\n+/)){const refs=[...line.matchAll(/\[(S\d+)\]/gi)].map(m=>m[1].toUpperCase()),body=line.replace(/\[(S\d+)\]/gi,'').replace(/^\s*(?:>|[-*]|\d+[.)])\s*/,'').trim();if(body)candidates.push({quote:body.replace(/^['“"]|['”"]$/g,''),refs});}for(const match of value.matchAll(/[“"]([^”"\n]{16,})[”"]/g))candidates.push({quote:match[1],refs:[]});return candidates;}

/**
 * Verified output is extractive, not a token-overlap plausibility test. Unsupported
 * generated values, wiring assignments and procedural wording are withheld.
 */
export function validateGroundedResponse(raw,passages,{question=''}={}){
 const allowed=list(passages).filter(p=>p&&Number.isInteger(p.page)&&p.page>0&&text(p.contentHash).trim()&&text(p.text).trim()),response=parseResponse(raw),issues=[],claims=[],refs=[];
 const structured=Array.isArray(response.claims),candidates=structured?response.claims.map(claim=>({quote:text(claim.quote??claim.excerpt??claim.text),refs:unique([claim.sourceId,claim.passageId,...list(claim.sourceIds),...list(claim.citations)].map(value=>typeof value==='object'?value.id||value.sourceId:value)),generatedText:claim.text})):quotedCandidates(response.text??response.answer);
 for(const candidate of candidates){
  const quote=compact(candidate.quote);if(controlInstruction(quote)){issues.push('Embedded model-control instructions are reference data and cannot become an answer.');continue;}if(quote.length<16||words(quote).length<3){issues.push('A proposed quotation was too short to preserve its context.');continue;}
  const scoped=candidate.refs?.length?allowed.filter(p=>candidate.refs.includes(p.id)||candidate.refs.some(ref=>text(ref).toUpperCase()===(p.citationId||'').toUpperCase())):allowed;
  if(!scoped.length){issues.push('The model cited a passage that was not supplied from a successfully read page.');continue;}
  const matches=scoped.filter(p=>compact(p.text).includes(quote));
  if(!matches.length){issues.push('Generated wording was not a verbatim supported passage and has not been presented as a documented fact.');continue;}
  if(candidate.generatedText&&compact(candidate.generatedText)!==quote)issues.push('A model paraphrase was withheld; only its verified quotation is shown.');
  const p=matches[0],canonical=compact(p.text),start=canonical.indexOf(quote),exact=canonical.slice(start,start+quote.length);
  if(claims.some(c=>folded(c.quote)===folded(exact)))continue;
  const ref=sourceRef(p,exact);claims.push({text:exact,quote:exact,sourceIds:[p.id],sourceRefs:[ref],documented:true});refs.push(ref);if(claims.length>=3)break;
 }
 const positions=new Map();let reordered=false;
 for(const claim of claims){const ref=claim.sourceRefs[0],passage=allowed.find(p=>p.id===ref.sourceId),position=[ref.page,(passage?.offset||0)+compact(passage?.text).indexOf(compact(claim.quote))],previous=positions.get(ref.contentHash);if(previous&&(position[0]<previous[0]||position[0]===previous[0]&&position[1]<previous[1]))reordered=true;positions.set(ref.contentHash,position);}
 if(reordered){issues.push('The proposed answer rearranged source statements. Its generated sequence was withheld; review the original page order.');claims.length=0;refs.length=0;}
 const supported=claims.length>0;
 if(!supported)issues.push('The local model did not return an independently supported quotation. Review the exact retrieved material or add the missing manual information.');
 const fallback=allowed.filter(p=>!controlInstruction(p.text)).slice(0,3).map(p=>({quote:compact(p.text),sourceRefs:[sourceRef(p,compact(p.text))],documented:true,answersQuestion:false}));
 return {supported,answer:claims.map((c,i)=>`${claims.length>1?`${i+1}. `:''}${c.quote}`).join('\n'),claims,sourceRefs:refs,requiresSourceReview:refs.some(ref=>ref.requiresSourceReview),requiresCrossDocumentReview:unique(refs.map(ref=>ref.contentHash)).length>1,issues:unique(issues),interpretation:null,coverage:'verbatim_excerpts_only',question:text(question),fallback,missing:!allowed.length?['No relevant successfully read source passage is available.']:supported?[]:['The model’s proposed answer could not be verified against the supplied source passages.'],policy:'Only exact supported source quotations are documented facts. Extractive snippets do not by themselves establish a complete procedure, compatibility or authority to perform a test.'};
}

// Contacts are extracted from this pal's saved, processed manual pages only.
// A number printed in a manual is evidence of that edition, not a live verification.
const list=value=>Array.isArray(value)?value:[];
const text=value=>typeof value==='string'?value.trim():'';
const fold=value=>text(value).toLowerCase().normalize('NFKC').replace(/[‐‑–—]/g,'-').replace(/[^a-z0-9]+/g,' ').trim();
const ALIASES=[['C-TEC','C TEC','Ctec'],['Advanced','Advanced Electronics'],['Gent','Honeywell Gent'],['Kentec','Kentec Electronics'],['Fike','Fike Safety Technology'],['Texecom'],['Paxton','Paxton Access'],['Hikvision'],['Tyco','Tyco Fire','Tyco Fire Protection Products'],['Apollo','Apollo Fire Detectors'],['Hochiki'],['Protec','Protec Fire Detection'],['Morley-IAS','Morley IAS'],['Notifier'],['Honeywell'],['Dahua'],['Axis','Axis Communications'],['Eaton','Eaton Cooper','Cooper','Scantronic'],['Pyronix'],['Orisec'],['Elmdene'],['Risco'],['Ajax'],['Haes']];
const canonical=value=>{const input=fold(value);return ALIASES.find(names=>names.some(name=>fold(name)===input))?.[0]||text(value);};
const unknown=value=>!text(value)||/^(?:unknown|unconfirmed|local import|other|not recorded)$/i.test(text(value));
const unique=values=>[...new Map(values.filter(value=>!unknown(value)).map(value=>[fold(canonical(value)),canonical(value)])).values()];
const UK=/\b(?:United Kingdom|UK|U\.K\.|Great Britain|England|Scotland|Wales|Northern Ireland)\b/i;
const PHONE=/(?<![\w+])(?:\+44(?:[ \t().-]*0)?|0044(?:[ \t().-]*0)?|0)(?:[ \t().-]*\d){9,10}(?![ \t().-]*\d)/g;
const LABEL=/\b(technical\s+(?:support|helpline|help\s*line|assistance|services?)|tech\s+support|support\s+(?:team|desk|line|helpline)|customer\s+(?:support|services?|care)|sales|orders?|fax|facsimile|telephone|tel|phone|call|contact)\b/gi;
const kindFor=label=>/fax|facsimile|sales|orders?/i.test(label)?'excluded':/technical|tech support|support (?:team|desk|line|helpline)/i.test(label)?'technical':/customer/i.test(label)?'customer':'general';
export function normalizeUKSupportPhone(raw){
 let digits=text(raw).replace(/\D/g,'');
 if(digits.startsWith('0044'))digits=digits.slice(2);
 if(digits.startsWith('44'))digits=digits.slice(2).replace(/^0/,'');else if(digits.startsWith('0'))digits=digits.slice(1);else return null;
 // Deliberately omit short codes, emergency numbers and unrecognised digit counts.
 if(!/^[12378]\d{9}$/.test(digits))return null;
 return {phone:'+44 '+digits,telHref:'tel:+44'+digits};
}
function contactKind(prefix){
 const labels=[...prefix.matchAll(LABEL)];if(!labels.length)return null;
 const strong=labels.filter(item=>kindFor(item[0])!=='general').at(-1),last=labels.at(-1);
 if(strong&&prefix.length-strong.index<190)return kindFor(strong[0]);
 return prefix.length-last.index<100?'general':null;
}
function candidateBrands(analysis,record){
 return unique([record?.brand,record?.manufacturer,analysis?.identity?.manufacturer,...list(analysis?.identity?.manufacturerCandidates)]);
}
function manufacturerFor(context,brands){
 const words=' '+fold(context)+' ';
 const scored=unique([...brands,...ALIASES.map(names=>names[0])]).map(brand=>({brand,score:Math.max(0,...(ALIASES.find(names=>names[0]===canonical(brand))||[brand]).filter(name=>words.includes(' '+fold(name)+' ')).map(name=>fold(name).split(' ').length))})).filter(item=>item.score);
 // Prefer an explicit company name (Advanced Electronics) over a short word
 // which can also be a product name in that footer (Axis EN).
 const best=Math.max(0,...scored.map(item=>item.score));
 const matches=scored.filter(item=>item.score===best).map(item=>item.brand);
 if(matches.length===1)return matches[0];
 if(matches.length>1)return null;
 return brands.length===1?brands[0]:null;
}
/** Pure extraction. Caller supplies the actual selected manual analysis and record. */
export function extractManualSupportContacts(analysis,{record={}}={}){
 if(!analysis?.usable||!text(analysis.manualId)||!text(analysis.contentHash))return [];
 const brands=candidateBrands(analysis,record),contacts=[];
 for(const page of list(analysis.pages)){
  if(!Number.isInteger(page.page)||page.page<1||typeof page.text!=='string'||page.quality?.readable===false)continue;
  if(!['text','ocr'].includes(page.method||'text'))continue;
  const content=page.text,matches=[...content.matchAll(PHONE)];
  for(let index=0;index<matches.length;index++){
   const match=matches[index],raw=match[0].trim(),normalized=normalizeUKSupportPhone(raw);if(!normalized)continue;
   const previousEnd=index?matches[index-1].index+matches[index-1][0].length:0;
   const start=Math.max(previousEnd,match.index-190),end=Math.min(content.length,match.index+match[0].length+130,matches[index+1]?.index??Infinity);
   const prefix=content.slice(start,match.index),near=content.slice(start,end),kind=contactKind(prefix);
   if(!kind||kind==='excluded')continue;
   if(!/^(?:\+44|0044)/.test(raw)&&!UK.test(near))continue;
   const manufacturer=manufacturerFor(near,brands),ocr=page.method==='ocr';
   const requiresPageCheck=ocr||!manufacturer;
   const quote=near.trim(),revision=text(record.revision)||text(record.edition)||text(analysis.identity?.revision)||null;
   const sourceRef={manualId:analysis.manualId,contentHash:analysis.contentHash,title:analysis.title||record.title||'Saved manual',page:page.page,quote,...(revision?{revision}:{})};
   contacts.push({id:`${analysis.manualId}:${page.page}:${normalized.telHref.slice(4)}`,manufacturer:manufacturer||'Manufacturer to confirm',phone:normalized.phone,phoneRaw:raw,telHref:requiresPageCheck?'':normalized.telHref,title:kind==='technical'?'Technical support':kind==='customer'?'Customer support':'General contact',kind,source:'manual',sourceRefs:[sourceRef],verifiedAt:null,requiresPageCheck,
    notes:[ocr?'This number was read with OCR. Open the page and check every digit before dialling.':!manufacturer?'The manufacturer for this contact is unclear. Check the cited page before dialling.':'Listed in the saved manual; check that this is the right team for your equipment.',revision?'Manual edition: '+revision+'.':'The document edition is not established.','The number may have changed since this manual was published.'].join(' ')});
  }
 }
 return contacts;
}
function expectedBrands(helper,session){
 return unique([session?.panel?.brand,session?.panel?.manufacturer,helper?.scope?.brand,helper?.scope?.manufacturer]);
}
/** No model-name guessing, compatibility assumptions, network access or shared-library search. */
export function getPanelPalSupport(helper,session,{analyses=[],records=[]}={}){
 const selected=new Set(list(helper?.selectedManualIds)),brands=expectedBrands(helper,session),recordsById=new Map(list(records).map(record=>[record.id,record]));
 const candidates=[];
 for(const analysis of list(analyses)){
  if(!selected.has(analysis?.manualId))continue;
  const expected=helper?.manualStates?.[analysis.manualId]?.contentHash;
  if(expected&&analysis.contentHash!==expected)continue;
  const record=recordsById.get(analysis.manualId)||list(helper?.documents).find(doc=>(doc.id||doc.record?.id)===analysis.manualId)?.record||{};
  candidates.push(...extractManualSupportContacts(analysis,{record}));
 }
 const contacts=[...new Map(candidates.map(contact=>[`${contact.manufacturer}:${contact.phone}:${contact.kind}:${contact.sourceRefs[0].manualId}:${contact.sourceRefs[0].page}`,contact])).values()];
 const relevant=brands.length===1?contacts.filter(contact=>fold(canonical(contact.manufacturer))===fold(brands[0])):contacts;
 if(!relevant.length)return {status:'unavailable',contacts:[],manufacturerCandidates:brands,message:brands.length===1?`I couldn't find a clearly labelled UK support number for ${brands[0]} in this pal's readable manuals. Add its support/contact page, or check the manufacturer’s current website. Your call notes are still ready.`:"I couldn't find a clearly labelled UK support number in this pal's readable manuals. Add the support/contact page and confirm the manufacturer. You can still prepare your call notes."};
 const actual=unique(relevant.map(contact=>contact.manufacturer));
 const teams=new Map();for(const contact of relevant){const key=fold(contact.manufacturer)+':'+contact.kind;const numbers=teams.get(key)||new Set();numbers.add(contact.phone);teams.set(key,numbers);}
 const conflicting=[...teams.values()].some(numbers=>numbers.size>1);
 for(const contact of relevant)if(teams.get(fold(contact.manufacturer)+':'+contact.kind)?.size>1){contact.conflicting=true;contact.notes+=' Other saved pages list a different number for this type of contact. Compare the cited editions before choosing.';}
 const ambiguous=conflicting||brands.length>1||actual.length>1||relevant.some(contact=>contact.requiresPageCheck);
 return {status:ambiguous?'ambiguous':'manual',contacts:relevant.sort((a,b)=>({technical:0,customer:1,general:2}[a.kind]-{technical:0,customer:1,general:2}[b.kind])),manufacturerCandidates:brands.length?brands:actual,
  message:conflicting?'These saved manuals list different numbers for the same type of support. I’ve kept both sources; compare the editions before choosing who to call.':ambiguous?'I found contact details in the saved manuals. Check the manufacturer and cited page before choosing who to call.':`I found ${relevant[0].manufacturer} contact details in your saved manual. The page is linked below; older manuals can list numbers that have changed.`};
}
export async function loadPanelPalSupport(helper,session,{getAnalyses,records=[]}={}){
 if(typeof getAnalyses!=='function')return getPanelPalSupport(helper,session,{records});
 return getPanelPalSupport(helper,session,{analyses:await getAnalyses(),records});
}

// Pure lookup and integrity helpers for the source-pinned menu references.
import {menuMapFamily,menuSimulationLabel} from './menu-map-registry.mjs';
export const normalizeMenuText = value => String(value ?? '').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ')
  .replace(/[’']/g, '').replace(/[^a-z0-9.]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = value => normalizeMenuText(value).match(/[a-z]+|\d+(?:\.\d+)*/g) || [];
const controlWords = value => normalizeMenuText(value).match(/[a-z]+\d+[a-z0-9]*|\d+[a-z][a-z0-9]*|[a-z]+|\d+(?:\.\d+)*/g) || [];
const numberKey = value => String(value ?? '').split('.').map(part => /^\d+$/.test(part) ? String(Number(part)) : part).join('.');
const stops = new Set('a an the how where do does i me my to can find on in is for of please show check get menu menus setting settings what which panel keypad this that at it you system want need turn off'.split(' '));
const canonical = word => ({history:'log',logs:'log',events:'event',zones:'zone',detectors:'detector',outputs:'output',users:'user',timers:'timer',comms:'communications',diagnostic:'diagnostics',walktest:'walk',ohms:'resistance',resistances:'resistance',resistors:'resistance',resistor:'resistance',bypass:'omit',omitted:'omit',omitting:'omit',omission:'omit',omits:'omit',firmware:'version',software:'version',versions:'version',wirelessly:'wireless'}[word] || word);
const flatText = value => Array.isArray(value) ? value.map(flatText).join(' ') : value && typeof value === 'object' ? Object.values(value).map(flatText).join(' ') : String(value ?? '');

export function menuBreadcrumbs(map, nodeId) {
  const byId = map._byId || new Map(map.nodes.map(node => [node.id,node]));
  const path = [], seen = new Set();
  let node = byId.get(nodeId);
  while (node && !seen.has(node.id)) { path.unshift(node); seen.add(node.id); node = byId.get(node.parentId); }
  return path;
}

export function menuChildren(map, parentId = null) {
  return map.nodes.filter(node => (node.parentId ?? null) === parentId)
    .sort((a,b) => a.order-b.order || a.label.localeCompare(b.label));
}

export function menuNodeKind(node) {
  return ({menu:'Menu',command:'Action',setting:'Setting / field',status:'Status display',selection:'Value / choice',reference:'Reference'}[node.kind] || 'Reference');
}

export function menuCodeLabel(node) {
  if (node.code === null || node.code === undefined || node.code === '') return '';
  const type = node.codeType === 'ambiguous' ? 'Conflicting printed number' : node.kind === 'selection' || node.codeType === 'value' ? 'Value' : node.kind === 'setting' || node.codeType === 'parameter' ? 'Parameter / flag' : node.kind === 'reference' ? 'Reference number' : 'Local menu number';
  return `${type} ${node.code}`;
}

export function prepareMenuMap(raw) {
  const map = {...raw};
  map._byId = new Map(map.nodes.map(node => [node.id,node]));
  map._sourceById = new Map(map.sources.map(source => [source.id,source]));
  const context = [map.title, map.profileId, ...map.panelModels, ...map.keypadModels].join(' ');
  map._entries = map.nodes.map(node => {
    const path = menuBreadcrumbs(map,node.id);
    const title = normalizeMenuText([node.label, node.address, ...(node.aliases || [])].join(' '));
    const corpus = normalizeMenuText([context, ...path.map(part => part.label), node.summary, ...(menuMapFamily(map)?.category==='fire'?[node.access]:[]), ...(node.aliases || []), ...(node.conditions || []), ...(node.notes || [])].join(' '));
    const numbers = new Set(path.flatMap(part => [part.code,part.address]).filter(x => x !== null && x !== undefined && x !== '').map(numberKey));
    if (node.address) for (const part of String(node.address).split('.')) numbers.add(numberKey(part));
    return {map,node,path,title,corpus,numbers,contextTokens:new Set(words(context).map(canonical)),tokens:new Set(words(corpus).map(canonical)),controlTokens:new Set(controlWords(corpus).map(canonical))};
  });
  return map;
}

function nearWord(a,b) {
  if (a.length < 5 || b.length < 5 || Math.abs(a.length-b.length)>1) return false;
  let i=0,j=0,errors=0;
  while(i<a.length && j<b.length){
    if(a[i]===b[j]){i++;j++;continue;}
    if(++errors>1)return false;
    if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++;}
  }
  return errors+(i<a.length||j<b.length?1:0)<=1;
}

export function searchMenuMaps(maps, input, {profileId='', rootId='', includeValues=true} = {}) {
  const original = normalizeMenuText(input);
  if (!original) return [];
  const commonQuery = original.replace(/what (?:caused|triggered) (?:the )?(?:last )?alarm|what set (?:it|the alarm) off/g,'event log')
    .replace(/last alarm|alarm memory|alarm history/g, 'event log')
    .replace(/walk test/g,'walk');
  const results=[];
  for(const raw of maps){
    const map=raw._entries?raw:prepareMenuMap(raw);
    if(profileId && map.profileId!==profileId)continue;
    // Intruder omission terminology must not turn an addressable fire device
    // request into a whole-zone action. Keep the fire target exactly as asked.
    const fire=menuMapFamily(map)?.category==='fire';
    const query=fire?commonQuery.replace(/\blevel\s*(\d+[a-z]?)\b/g,'level $1'):commonQuery
      .replace(/turn off (?:a )?(?:device|detector|sensor)|disable (?:a )?(?:device|detector|sensor)|isolate (?:a )?(?:device|detector|sensor)/g,'omit zone')
      .replace(/restore (?:a )?(?:device|detector|sensor)|reinstate (?:a )?(?:device|detector|sensor)|enable (?:a )?(?:device|detector|sensor)/g,'restore zone');
    const rawTerms=(fire?controlWords:words)(query), usefulTerms=rawTerms.filter(word=>!stops.has(word));
    const terms=[...new Set((usefulTerms.length?usefulTerms:rawTerms).map(canonical))];
    const requestedLevel=fire?query.match(/\blevel\s+(\d+[a-z]?)\b/)?.[1]:null;
    if(!terms.length)continue;
    for(const entry of map._entries){
      if(rootId && !entry.path.some(node=>node.id===rootId))continue;
      if(!includeValues && ['selection','reference'].includes(entry.node.kind))continue;
      let score=0,approximate=false,matched=true;
      for(const term of terms){
        if(requestedLevel&&term===requestedLevel){
          const levelPattern=new RegExp('\\blevel\\s+'+requestedLevel+(/\d$/.test(requestedLevel)?'[a-z]?':'')+'\\b');
          if(!levelPattern.test(entry.corpus)){matched=false;break;}
          score+=levelPattern.test(entry.title)?150:10;continue;
        }
        // Codes such as Sigma 2A, d1 and Ad are literal identifiers, not the
        // number 2, a decimal address, or a value borrowed from another map.
        if(fire&&entry.node.code!=null&&normalizeMenuText(entry.node.code)===term){score+=80;continue;}
        if(/^\d/.test(term)){
          const key=numberKey(term), address=numberKey(entry.node.address);
          if(address===key){score+=150;continue;}
          if(numberKey(entry.node.code)===key){score+=55;continue;}
          if(entry.numbers.has(key)){score+=15;continue;}
          if(term.includes('.') && address.startsWith(key+'.')){score+=12;continue;}
          // A named physical item such as “Monitored O/P 1” keeps its own
          // number. Requiring a title word preserves bare menu-code lookups.
          const titleTerms=words(entry.title).map(canonical);
          if(fire&&titleTerms.includes(term)&&terms.some(t=>/^[a-z]/.test(t)&&titleTerms.includes(t)&&!entry.contextTokens.has(t))){score+=20;continue;}
          // Model capacities are not menu addresses. In an explicitly named
          // model query they may match the model context, without weakening a
          // bare numerical lookup or borrowing another brand's menu number.
          if(!term.includes('.') && entry.contextTokens.has(term) && terms.some(t=>/^[a-z]/.test(t)&&entry.contextTokens.has(t))){score+=2;continue;}
          matched=false;break;
        }
        if(fire&&/^[a-z]+\d/.test(term)&&entry.controlTokens.has(term)){score+=controlWords(entry.title).map(canonical).includes(term)?22:4;continue;}
        if(entry.tokens.has(term)){score+=words(entry.title).map(canonical).includes(term)?22:4;continue;}
        if(term.length>=4 && [...entry.tokens].some(token=>token.startsWith(term))){score+=2;continue;}
        if([...entry.tokens].some(token=>nearWord(term,token))){approximate=true;score+=1;continue;}
        matched=false;break;
      }
      if(!matched)continue;
      if(entry.title===original)score+=90;
      if(entry.title.includes(query))score+=50;
      if(['menu','command','status'].includes(entry.node.kind))score+=4;
      // A measured resistance display is normally the intended destination for
      // an ohms query. Output functions and resistor-configuration values stay
      // searchable, but do not outrank the actual diagnostic view.
      if(terms.includes('resistance') && entry.node.kind==='status')score+=110;
      score-=entry.path.length*.1;
      results.push({...entry,score,approximate});
    }
  }
  return results.sort((a,b)=>b.score-a.score||a.map.title.localeCompare(b.map.title)||a.node.order-b.node.order);
}

export function menuReferenceText(map,node) {
  const path=menuBreadcrumbs(map,node.id);
  const sources=(node.sourceRefs||[]).map(ref=>{
    const source=map.sources.find(s=>s.id===ref.sourceId);
    return `${source?.title || ref.sourceId} — ${source?.edition || ''}; printed p${ref.printedPage}; PDF p${ref.pdfPage}\n${source?.url || ''}#page=${ref.pdfPage}`;
  });
  const conditions=[...new Set(path.flatMap(part=>part.conditions||[]))];
  const lines=[`${map.title}: ${node.label}`,`Baseline: ${flatText(map.baseline)}`,`Path: ${path.map(n=>(n.code!==null&&n.code!==undefined?`${n.code} `:'')+n.label).join(' → ')}`,`Entry type: ${menuNodeKind(node)}`];
  if(node.address)lines.push(`Verified address: ${node.address}`);
  if(menuCodeLabel(node))lines.push(menuCodeLabel(node));
  if(node.simulationStatus)lines.push(`Trainer status: ${menuSimulationLabel(node) || node.simulationStatus}`);
  lines.push(node.summary || '',`Access: ${node.access || 'See source'}`,...conditions,...(node.notes||[]),'Sources:',...sources);
  return lines.filter(Boolean).join('\n');
}

export function validateMenuMap(map) {
  const errors=[],ids=new Set(),sourceIds=new Map((map.sources||[]).map(s=>[s.id,s]));
  for(const key of ['profileId','title','baseline','scope'])if(!map[key])errors.push(`Missing ${key}`);
  if(!Array.isArray(map.nodes)||!map.nodes.length)return [...errors,'Missing nodes'];
  for(const node of map.nodes){
    if(ids.has(node.id))errors.push(`Duplicate node ${node.id}`);ids.add(node.id);
    if(!node.id || !node.label)errors.push('Missing node identifier/label');
    if(!['menu','command','setting','status','selection','reference'].includes(node.kind))errors.push(`${node.id}: unknown kind ${node.kind}`);
    if(!Number.isFinite(node.order))errors.push(`${node.id}: invalid order`);
    if(!node.sourceRefs?.length)errors.push(`${node.id}: missing source`);
    for(const ref of node.sourceRefs||[]){
      const source=sourceIds.get(ref.sourceId);
      if(!source)errors.push(`${node.id}: unknown source ${ref.sourceId}`);
      if(!Number.isInteger(ref.pdfPage)||ref.pdfPage<1||source?.totalPdfPages&&ref.pdfPage>source.totalPdfPages)errors.push(`${node.id}: invalid PDF page ${ref.pdfPage}`);
      if(ref.printedPage===undefined||ref.printedPage===null||ref.printedPage==='')errors.push(`${node.id}: missing printed page`);
    }
  }
  const byId=new Map(map.nodes.map(n=>[n.id,n]));
  for(const node of map.nodes){
    if(node.parentId!=null&&!ids.has(node.parentId))errors.push(`${node.id}: missing parent ${node.parentId}`);
    const seen=new Set();let current=node;
    while(current){if(seen.has(current.id)){errors.push(`${node.id}: cycle`);break;}seen.add(current.id);current=byId.get(current.parentId);}
  }
  for(const gap of map.gaps||[])for(const id of gap.affectedNodeIds||[])if(!ids.has(id))errors.push(`${gap.id}: missing affected node ${id}`);
  for(const source of map.sources||[])try{if(!['https:','http:'].includes(new URL(source.url).protocol))throw Error();}catch{errors.push(`${source.id}: invalid source URL`);}
  return errors;
}

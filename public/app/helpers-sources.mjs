// Presentation only: citation records and saved conversations are never changed.
const text=value=>typeof value==='string'||typeof value==='number'?String(value).trim():'';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const refs=values=>(Array.isArray(values)?values:[]).filter(ref=>ref&&typeof ref==='object'&&['manualId','contentHash','title','manualTitle','quote','excerpt'].some(key=>text(ref[key])));

export function helperSourcePage(ref){
  for(const value of [ref?.page,ref?.pdfPage]){
    if(!['number','string'].includes(typeof value)||!text(value))continue;
    const page=Number(value);
    if(Number.isSafeInteger(page)&&page>0)return page;
  }
  return null;
}

export function renderHelperSources(values,{messageId='',open=false}={}){
  const sources=refs(values);
  if(!sources.length)return '';
  const rows=sources.map((ref,index)=>{
    const page=helperSourcePage(ref),title=text(ref.title)||text(ref.manualTitle)||'Saved manual';
    const label=title+(page===null?'':' · PDF page '+page);
    const manualId=text(ref.manualId),hash=text(ref.contentHash),quote=text(ref.quote)?String(ref.quote):text(ref.excerpt)?String(ref.excerpt):'';
    const link=manualId||hash?`<button type="button" class="subtle" data-action="helper-source" data-id="${esc(manualId)}"${page===null?'':` data-page="${page}"`} data-hash="${esc(hash)}" data-helper-source-index="${index}">${esc(label)}</button>`:`<span class="helper-source-title">${esc(label)}</span>`;
    const metadata=[text(ref.revision)?'Edition '+text(ref.revision):'',text(ref.section),text(ref.printedPage)&&text(ref.printedPage)!==String(page)?'Printed page '+text(ref.printedPage):''].filter(Boolean).join(' · ');
    return `<div class="helper-source">${link}${metadata?`<small>${esc(metadata)}</small>`:''}${quote?`<div class="helper-source-evidence"><span>Supporting text</span><blockquote>${esc(quote)}</blockquote></div>`:''}</div>`;
  }).join('');
  return `<details class="helper-sources" data-helper-sources="${esc(messageId)}"${open?' open':''}><summary>Sources (${sources.length})</summary><div class="helper-sources-list">${rows}</div></details>`;
}

/** Keep disclosure and reading position across DOM replacement in this visit. */
export function createHelperTranscriptState(){
  const views=new Map();
  function capture(log,followLatest){
    const key=log?.dataset.helperConversation;
    if(!key)return null;
    const groups=[...log.querySelectorAll('[data-helper-sources]')];
    const active=log.ownerDocument?.activeElement;
    const focused=groups.find(group=>group.contains(active));
    const snapshot={
      open:new Set(groups.filter(group=>group.open).map(group=>group.dataset.helperSources)),
      scrollTop:log.scrollTop,
      followLatest:!!followLatest,
      focus:focused?{messageId:focused.dataset.helperSources,index:active?.dataset.helperSourceIndex??null}:null,
    };
    views.set(key,snapshot);
    return snapshot;
  }
  function restore(log){
    const snapshot=views.get(log?.dataset.helperConversation);
    if(!snapshot)return null;
    for(const group of log.querySelectorAll('[data-helper-sources]')){
      group.open=snapshot.open.has(group.dataset.helperSources);
      if(snapshot.focus?.messageId===group.dataset.helperSources){
        const target=snapshot.focus.index===null?group.querySelector('summary'):[...group.querySelectorAll('[data-helper-source-index]')].find(node=>node.dataset.helperSourceIndex===snapshot.focus.index);
        target?.focus({preventScroll:true});
      }
    }
    log.scrollTop=snapshot.scrollTop;
    return snapshot;
  }
  return {capture,restore,get:key=>views.get(key),isOpen:(key,messageId)=>views.get(key)?.open.has(String(messageId))===true};
}

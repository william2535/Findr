import test from 'node:test';
import assert from 'node:assert/strict';
import {helperSourcePage,renderHelperSources,createHelperTranscriptState} from '../public/app/helpers-sources.mjs';

test('sources start collapsed while preserving exact citation evidence and PDF target',()=>{
  const ref={manualId:'manual-a',contentHash:'a'.repeat(64),title:'Actual <Panel> manual',revision:'4 & 5',page:81,printedPage:'76',section:'7.2 Zone test',quote:'\nSelect TEST <then> ZONES.\n'};
  const before=structuredClone(ref),html=renderHelperSources([ref],{messageId:'answer-1'});
  assert.match(html,/<details class="helper-sources" data-helper-sources="answer-1"><summary>Sources \(1\)<\/summary>/);
  assert.match(html,/data-action="helper-source" data-id="manual-a" data-page="81" data-hash="a{64}"/);
  assert.match(html,/Actual &lt;Panel&gt; manual · PDF page 81/);
  assert.match(html,/Edition 4 &amp; 5 · 7\.2 Zone test · Printed page 76/);
  assert.match(html,/Supporting text<\/span><blockquote>\nSelect TEST &lt;then&gt; ZONES\.\n<\/blockquote>/);
  assert.deepEqual(ref,before);
});

test('every reference remains separate, including two editions of the same PDF title',()=>{
  const html=renderHelperSources([
    {manualId:'edition-a',title:'Panel manual',page:2,contentHash:'a'.repeat(64),revision:'A',quote:'A evidence'},
    {manualId:'edition-b',title:'Panel manual',pdfPage:'9',contentHash:'b'.repeat(64),revision:'B',excerpt:'B evidence'},
  ],{messageId:'answer',open:true});
  assert.match(html,/data-helper-sources="answer" open/);
  assert.match(html,/Sources \(2\)/);
  assert.match(html,/data-id="edition-a" data-page="2" data-hash="a{64}"/);
  assert.match(html,/data-id="edition-b" data-page="9" data-hash="b{64}"/);
  assert.match(html,/A evidence/);assert.match(html,/B evidence/);
});

test('missing or invalid pages never fabricate a PDF page label or link target',()=>{
  for(const page of [undefined,null,'',0,-1,1.5,'unknown',NaN,Infinity,true,{},'   ']){
    assert.equal(helperSourcePage({page}),null);
    const html=renderHelperSources([{manualId:'a',manualTitle:'Known manual',page,section:'Document overview'}]);
    assert.match(html,/Known manual/);assert.match(html,/Document overview/);
    assert.doesNotMatch(html,/PDF page|data-page=|undefined|null/);
  }
  assert.equal(helperSourcePage({page:0,pdfPage:'12'}),12);
  assert.equal(helperSourcePage({page:2,pdfPage:12}),2);
  assert.equal(helperSourcePage({page:'3'}),3);
});

test('empty or malformed references do not create an empty Sources control',()=>{
  for(const refs of [undefined,[],[null,undefined,{},'',5,{title:' '}],{title:'not an array'}])assert.equal(renderHelperSources(refs),'');
  const html=renderHelperSources([null,{title:'Legacy extract',quote:'Verbatim evidence'}]);
  assert.match(html,/Sources \(1\)/);assert.match(html,/Legacy extract/);assert.match(html,/Verbatim evidence/);
  assert.doesNotMatch(html,/data-action="helper-source"/,'a citation without a saved PDF target is still readable but not a broken link');
});

function transcript(key,rows,{scrollTop=0,active=null}={}){
  const doc={activeElement:null};
  const groups=rows.map(([id,open])=>{
    const summary={dataset:{},focus(options){doc.activeElement=this;this.focusOptions=options;}};
    const source={dataset:{helperSourceIndex:'0'},focus(options){doc.activeElement=this;this.focusOptions=options;}};
    return {dataset:{helperSources:id},open,summary,source,contains:node=>node===summary||node===source,querySelector:()=>summary,querySelectorAll:()=>[source]};
  });
  if(active){const group=groups.find(group=>group.dataset.helperSources===active.id);doc.activeElement=group[active.kind||'summary'];}
  return {dataset:{helperConversation:key},scrollTop,ownerDocument:doc,groups,querySelectorAll:()=>groups};
}

test('same-chat replacement retains expanded sources, scrollback and keyboard focus; new messages stay collapsed',()=>{
  const state=createHelperTranscriptState(),key=JSON.stringify(['helper-a','job-a']);
  const old=transcript(key,[['reply-a',true],['reply-b',false]],{scrollTop:348,active:{id:'reply-a',kind:'source'}});
  state.capture(old,false);
  assert.equal(state.isOpen(key,'reply-a'),true);
  const next=transcript(key,[['reply-a',false],['reply-b',false],['reply-c',false]]);
  const snapshot=state.restore(next);
  assert.equal(next.groups[0].open,true);assert.equal(next.groups[1].open,false);assert.equal(next.groups[2].open,false);
  assert.equal(next.scrollTop,348);assert.equal(snapshot.followLatest,false);
  assert.equal(next.ownerDocument.activeElement,next.groups[0].source);
  assert.deepEqual(next.groups[0].source.focusOptions,{preventScroll:true});
  next.groups[0].open=false;state.capture(next,false);
  assert.equal(state.isOpen(key,'reply-a'),false,'explicit collapse is retained too');
});

test('disclosure state is isolated by helper and conversation and survives leaving the transcript',()=>{
  const state=createHelperTranscriptState(),key=JSON.stringify(['helper-a','job-a']);
  state.capture(transcript(key,[['reply',true]],{scrollTop:42}),true);
  assert.equal(state.capture(null,false),null);
  for(const otherKey of [JSON.stringify(['helper-a','job-b']),JSON.stringify(['helper-b','job-a'])]){
    const other=transcript(otherKey,[['reply',false]]);
    assert.equal(state.restore(other),null);assert.equal(state.isOpen(otherKey,'reply'),false);
  }
  const returned=transcript(key,[['reply',false]]);
  assert.equal(state.restore(returned).followLatest,true);
  assert.equal(returned.groups[0].open,true);assert.equal(returned.scrollTop,42);
});

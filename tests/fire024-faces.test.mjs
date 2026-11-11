import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {xfpPanelFace} from '../public/app/xfp-face.mjs';
import {twinflexPanelFace} from '../public/app/twinflex-face.mjs';
const keys=(html,kind)=>[...html.matchAll(new RegExp(`data-${kind}-key="([^"]+)"`,'g'))].map(m=>m[1]);
const xfpKeys=['MENU','MORE','UP','ACCEPT','DOWN','ESCAPE','SILENCE_INTERNAL','SILENCE_RESOUND','RESET','INVESTIGATE','KEY_SWITCH'].sort();
test('XFP variants retain their distinct original fascia, zone count, eleven physical controls and two-line display',()=>{
  for(const variant of ['16','32']){
    const html=xfpPanelFace({variant},{lcdLines:['NORMAL','FICTIONAL SITE','not a third display line'],leds:{supply:'on'},zoneStates:{1:'flash'}});
    assert.match(html,new RegExp(`xfp-cabinet-${variant}`));
    assert.match(html,new RegExp(`xfp-${variant}-fascia.png`));
    assert.equal((html.match(/data-xfp-led="zone-/g)||[]).length,Number(variant));
    assert.deepEqual(keys(html,'xfp').sort(),xfpKeys);
    assert.match(html,/xfp-lamp-red xfp-lamp-flash[^>]*data-xfp-led="zone-1"/);
    assert.match(html,/xfp-lamp-green xfp-lamp-on[^>]*data-xfp-led="supply"/);
    assert.doesNotMatch(html,/not a third display line/);
    assert.equal(html.includes('xfp-32-instructions.png'),variant==='32');
  }
});
test('XFP hints identify real controls and cover removal displays the variant-specific manufacturer NVM detail without inventing an access switch',()=>{
  const html=xfpPanelFace({variant:'16'},{coverOpen:true,nvmUnlocked:true,accessLevel:3},{hintKey:'ACCEPT',zoom:'large'});
  assert.match(html,/xfp-face-large/);
  assert.match(html,/class="[^"]*xfp-key-hint[^>]*data-xfp-key="ACCEPT"/);
  assert.match(html,/xfp-16-memory-unlock.png/);
  assert.match(html,/link fitted/);
  assert.doesNotMatch(html,/data-xfp-key="(?:LEVEL_3|NVM|MEMORY_UNLOCK)"/);
  assert.match(html,/data-xfp-key="KEY_SWITCH"[^>]*aria-pressed="false"/);
  assert.match(xfpPanelFace({variant:'16'},{accessLevel:3,keySwitch:true}),/data-xfp-key="KEY_SWITCH"[^>]*aria-pressed="true"/);
});
test('TWINFLEXpro² has four separate fire alarm keys in source order, five navigation keys and the documented numeric keypad',()=>{
  const html=twinflexPanelFace({}, {lcdLines:['one','two','three','four','not a fifth line'],keypadOpen:true,zones:[{id:3,fire:true}],leds:{power:true}});
  const physical=keys(html,'twinflex');
  assert.deepEqual(physical.slice(0,4),['SILENCE_ALARMS','RESET','SOUND_ALARMS','SILENCE_BUZZER']);
  assert.deepEqual(physical.filter(k=>/^\d$/.test(k)).sort(),['0','1','2','3','4','5','6','7','8','9']);
  for(const id of ['UP','RIGHT','DOWN','LEFT','ENTER','ESC','HASH','ENABLE_KEY'])assert.ok(physical.includes(id));
  assert.equal(new Set(physical).size,physical.length);
  assert.doesNotMatch(html,/not a fifth line|SILENCE_RESOUND/);
  assert.equal((html.match(/data-twinflex-led="zone-/g)||[]).length,8);
  assert.match(html,/twinflex-led-red twinflex-led-on[^>]*data-twinflex-led="zone-3"/);
});
test('Keypad flap and right-hand cover are independent; only the latter exposes the real Write Enable switch',()=>{
  const shut=twinflexPanelFace({}, {keypadOpen:false,coverOpen:false});
  assert.deepEqual(keys(shut,'twinflex'),['SILENCE_ALARMS','RESET','SOUND_ALARMS','SILENCE_BUZZER','ENABLE_KEY']);
  assert.match(shut,/Programming keypad flap closed/);
  const opened=twinflexPanelFace({}, {keypadOpen:false,coverOpen:true,writeEnabled:true});
  assert.ok(keys(opened,'twinflex').includes('WRITE_ENABLE'));
  assert.ok(!keys(opened,'twinflex').includes('ENTER'));
  assert.match(opened,/twinflex-pro2-write-enable.jpg/);
  assert.match(opened,/data-twinflex-key="WRITE_ENABLE" aria-pressed="true"/);
  const byCode=twinflexPanelFace({}, {accessLevel:'3A',controlsEnabled:true,keyEnabled:false,leds:{access:'fast-flash'}});
  assert.match(byCode,/data-twinflex-key="ENABLE_KEY"[^>]*aria-pressed="false"/);
  assert.match(byCode,/twinflex-led-flash twinflex-led-fast[^>]*data-twinflex-led="access"/);
});
test('Faces escape display text and map LED off, on and flashing states faithfully',()=>{
  for(const render of [()=>xfpPanelFace({variant:'32'},{lcdLines:['<script> & "demo"'],leds:{supply:'off'}}),()=>twinflexPanelFace({}, {lcdLines:['<script> & "demo"'],leds:{zone:'off',power:'on'}})]){
    const html=render();assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt; &amp; &quot;demo&quot;/);
  }
  const off=twinflexPanelFace({}, {leds:{zone:'off'},zones:[{id:1,fault:true}]});
  assert.match(off,/twinflex-led-amber twinflex-led-off[^>]*data-twinflex-led="zone"/);
  const fault=twinflexPanelFace({}, {zones:[{id:1,fault:true}]});
  assert.match(fault,/twinflex-led-amber twinflex-led-flash[^>]*data-twinflex-led="zone"/);
});
test('All source-backed local panel face assets exist and source clip metadata identifies exact PDF pages',async()=>{
  const names=['xfp-16-fascia.png','xfp-32-fascia.png','xfp-32-instructions.png','xfp-16-memory-unlock.png','xfp-32-memory-unlock.png','twinflex-pro2-front-source.png','twinflex-pro2-write-enable.jpg'];
  for(const name of names)assert.ok((await stat(new URL('../public/app/trainer-assets/'+name,import.meta.url))).size>1000,name);
  const clips=JSON.parse(await readFile(new URL('../research/fire-service-0.24.0/face-asset-clips.json',import.meta.url),'utf8'));
  assert.equal(clips.length,5);for(const clip of clips){assert.ok([14,18].includes(clip.pdfPage));assert.equal(clip.clipPoints.length,4);}
});

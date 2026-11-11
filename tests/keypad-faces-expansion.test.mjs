import test from 'node:test';
import assert from 'node:assert/strict';
import {keypadFace, lookFor, practiceKeyboardKey} from '../public/app/practice.mjs';

const digits = Array.from({length:10},(_,i)=>String(i));
const fixtures = {
  'menvier-mseries': {
    title:'Menvier M750 / M800',
    supported:[...digits,'previous','change','next','details','enter','back'],
    rows:[['previous','1','2','3'],['change','4','5','6'],['next','7','8','9'],['details','enter','0','back']],
    style:'menvier',
  },
  'pyronix-enforcer': {
    title:'Pyronix Enforcer V11',
    supported:[...digits,'logout','previous','cancel','area-d','left','right','enter','back'],
    rows:[['1','2','3','logout','panic-police'],['4','5','6','previous','panic-fire'],['7','8','9','cancel','left'],['back','0','enter','area-d','right']],
    style:'pyronix',
  },
};
const profileFor = id => ({id,title:fixtures[id].title,keys:fixtures[id].supported.map(key=>({id:key,label:key,ariaLabel:`Physical ${key}`}))});
const screen = {heading:'Authorised menu',lines:['MENU','Choose an option']};
const renderedKeys = html => [...html.matchAll(/data-key="([^"]+)"/g)].map(match=>match[1]);

for (const [id,fixture] of Object.entries(fixtures)) {
  test(`${id} uses the source-verified physical rows and preserves every supported hint target`,()=>{
    const html=keypadFace(profileFor(id),screen,{});
    const keys=renderedKeys(html);
    assert.deepEqual(keys,fixture.rows.flat());
    assert.equal(new Set(keys).size,keys.length,'A physical key must not be duplicated');
    for (const key of fixture.supported) assert.equal(keys.filter(candidate=>candidate===key).length,1,`${key} must have exactly one physical hint target`);
    assert.ok(html.includes(`practice-device-${fixture.style}`));
    assert.ok(html.includes('data-practice-keyboard'));
    assert.match(html,/role="status" aria-live="polite"/);
  });

  test(`${id} chooser miniature has the same face without focusable or live controls`,()=>{
    const html=keypadFace(profileFor(id),screen,{},true);
    assert.ok(html.includes(`practice-device-${fixture.style} practice-mini-device`));
    assert.match(html,/aria-hidden="true"/);
    assert.equal((html.match(/class="practice-key /g)||[]).length,fixture.rows.flat().length);
    assert.doesNotMatch(html,/<button|data-key=|tabindex=|aria-live=/);
    assert.match(lookFor(profileFor(id)).source,/^https:\/\/.+#page=\d+$/);
  });
}

test('Pyronix C and D are separate physical keys from its two arrows, with no invented up/down key',()=>{
  const html=keypadFace(profileFor('pyronix-enforcer'),screen);
  const keys=renderedKeys(html);
  for(const key of ['cancel','area-d','left','right'])assert.ok(keys.includes(key));
  assert.ok(!keys.includes('next'));
  assert.match(html,/data-key="panic-police"[^>]*title="Shown for recognition;/);
  assert.match(html,/data-key="panic-fire"[^>]*title="Shown for recognition;/);
});

test('New keypad displays escape simulated labels as text',()=>{
  for(const id of Object.keys(fixtures)){
    const html=keypadFace(profileFor(id),{heading:'<demo>',lines:['<script>','A & B']});
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('A &amp; B'));
    assert.doesNotMatch(html,/<script>/);
  }
});

test('Pyronix keyboard shortcuts address distinct physical keys and reject nonexistent keys',()=>{
  const profile=profileFor('pyronix-enforcer');
  for(const [input,key] of Object.entries({ArrowDown:'back',ArrowUp:'previous',ArrowLeft:'left',ArrowRight:'right',A:'logout',a:'logout',B:'previous',b:'previous',C:'cancel',c:'cancel',D:'area-d',d:'area-d',N:'back',n:'back',Y:'enter',y:'enter',Enter:'enter',Escape:'back','5':'5'}))assert.equal(practiceKeyboardKey(profile,input),key);
  for(const input of ['Backspace','*','#','T','F1'])assert.equal(practiceKeyboardKey(profile,input),null);
});

test('Menvier keyboard supports its toggle without inventing left/right or Backspace keys',()=>{
  const profile=profileFor('menvier-mseries');
  for(const [input,key] of Object.entries({ArrowDown:'next',ArrowUp:'previous',T:'change',t:'change','#':'details',Enter:'enter',Escape:'back','7':'7'}))assert.equal(practiceKeyboardKey(profile,input),key);
  for(const input of ['ArrowLeft','ArrowRight','Backspace','*','A','C'])assert.equal(practiceKeyboardKey(profile,input),null);
});

test('Existing family keyboard behavior is preserved',()=>{
  for(const id of ['galaxy-dimension','texecom-premier-elite','scantronic-ion','orisec-cp']){
    const profile={id,keys:[]};
    for(const [input,key] of Object.entries({ArrowDown:'next',ArrowUp:'previous',ArrowLeft:'left',ArrowRight:'right',Enter:'enter',Escape:'back',Backspace:'backspace','*':'star','#':'details','9':'9'}))assert.equal(practiceKeyboardKey(profile,input),key);
    assert.equal(practiceKeyboardKey(profile,'A'),null);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolvePanelImage} from '../public/app/catalog.mjs';

const panels=JSON.parse(readFileSync(new URL('../public/app/data/panels.json',import.meta.url)));
const legacy=JSON.parse(readFileSync(new URL('../research/panel-library-seed.json',import.meta.url)));

test('all original saved-session panels resolve to a bundled catalogue picture without rewriting their evidence',()=>{
 for(const old of legacy){
  const before=JSON.stringify(old),image=resolvePanelImage(old,panels);
  assert.equal(image,panels.find(panel=>panel.id===old.id).image);
  assert.ok(existsSync(new URL('../public/app/panels/'+image,import.meta.url)));
  assert.equal(JSON.stringify(old),before);
  assert.ok(existsSync(new URL('../research/panel-originals/'+old.image,import.meta.url)));
 }
});

test('legacy source filenames still resolve when an earlier session has no matching panel ID',()=>{
 for(const old of legacy){
  const image=resolvePanelImage({image:old.image});
  assert.equal(image,panels.find(panel=>panel.id===old.id).image);
  assert.ok(existsSync(new URL('../public/app/panels/'+image,import.meta.url)));
 }
});

test('current and manually entered session panels retain their existing display behaviour',()=>{
 for(const panel of panels)assert.equal(resolvePanelImage(panel,panels),panel.image);
 assert.equal(resolvePanelImage({brand:'Unlisted',model:'Custom'}),null);
 assert.equal(resolvePanelImage(null),null);
 assert.equal(resolvePanelImage({id:'unlisted',image:'existing-reference.webp'}), 'existing-reference.webp');
});

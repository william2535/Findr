import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {wiringEquipment} from '../public/app/wiring-equipment.mjs';
const data=name=>JSON.parse(readFileSync(new URL('../public/app/data/'+name+'.json',import.meta.url)));
test('equipment pictures use reviewed IDs, preserve multiple models and reject unsafe image paths',()=>{
 const panels=[{id:'one',brand:'Test',model:'A',image:'a.webp'},{id:'two',model:'B',image:'b.webp',image_type:'shared-keypad-reference'},{id:'bad',image:'../other.webp'}];
 const entries=[{panelIds:['one','two','bad','missing']},{panelIds:['one']}];
 assert.deepEqual(wiringEquipment(entries,{panels}).map(p=>p.id),['one','two']);
 assert.match(wiringEquipment(entries,{panels})[1].reference,/reference/);
 assert.deepEqual(wiringEquipment([{models:['Test A']}],{panels}),[]);
});
test('every linked equipment thumbnail exists locally; unlinked wiring stays unclaimed',()=>{
 const catalogues={panels:data('panels'),devices:data('devices')},entries=data('wiring-diagrams').entries;
 let pictured=0;
 for(const entry of entries){const images=wiringEquipment([entry],catalogues);if(images.length)pictured++;for(const p of images)assert.ok(existsSync(new URL('../public/app/'+p.image,import.meta.url)),p.image);}
 assert.equal(pictured,151);assert.equal(entries.length-pictured,26);
});

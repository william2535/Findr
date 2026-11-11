#!/usr/bin/env node
// Read-only, deterministic lookup of FINDR's committed source-pinned menu maps.
// Example: node scripts/find-menu.mjs --panel galaxy-dimension "51.46"
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMenuMap,searchMenuMaps,menuReferenceText} from '../public/app/menu-map-engine.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args=process.argv.slice(2);
let panel='',limit=5,json=false;
const query=[];
for(let i=0;i<args.length;i++){
  if(args[i]==='--panel')panel=args[++i]||'';
  else if(args[i]==='--limit')limit=Math.max(1,Math.min(100,Number(args[++i])||5));
  else if(args[i]==='--json')json=true;
  else query.push(args[i]);
}
if(!query.length){
  console.log('Usage: node scripts/find-menu.mjs [--panel PROFILE_ID] [--limit 5] [--json] "menu name, number or common phrase"');
  console.log('Profiles: galaxy-dimension, texecom-premier-elite, scantronic-ion, orisec-cp, menvier-mseries, pyronix-enforcer');
  process.exitCode=1;
}else{
  const dir=path.join(root,'public/app/data/menu-maps');
  const maps=fs.readdirSync(dir).filter(name=>name.endsWith('.json')).map(name=>prepareMenuMap(JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'))));
  if(panel&&!maps.some(map=>map.profileId===panel))throw Error('Unknown profile: '+panel);
  const results=searchMenuMaps(maps,query.join(' '),{profileId:panel});
  if(json)console.log(JSON.stringify({query:query.join(' '),matches:results.length,results:results.slice(0,limit).map(({map,node,path,approximate})=>({profileId:map.profileId,baseline:map.baseline,node,path:path.map(n=>({id:n.id,label:n.label,code:n.code,kind:n.kind})),sources:node.sourceRefs.map(ref=>({...ref,source:map.sources.find(s=>s.id===ref.sourceId)})),approximate}))},null,2));
  else{
    console.log(`${results.length} documented matches. Showing ${Math.min(limit,results.length)}.`);
    if(!results.length)console.log('No documented match. Do not infer a route; request exact model, firmware, display wording and supporting evidence.');
    for(const {map,node,approximate}of results.slice(0,limit))console.log('\n'+(approximate?'Similar spelling match\n':'')+menuReferenceText(map,node));
  }
}

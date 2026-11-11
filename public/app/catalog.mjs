export const CATEGORIES={'fire':'Fire detection','security':'Intruder alarms','access-control':'Access control','cctv':'CCTV recorders','warden-call':'Warden & nurse call','other-reference':'Other systems'};
export const categoryLabel=id=>CATEGORIES[id]||id||'System type unknown';
export function imageKind(panel){return /illustration|drawing|diagram|rendered|manual.front|vector/i.test(panel.image_type||'')?'Manual illustration':/keypad/i.test(panel.image_type||'')?'Keypad reference':'Panel picture'}
const categoryOrder=['fire','security','warden-call','access-control','cctv','other-reference'];
const nameOrder=(a,b)=>a.localeCompare(b,'en-GB',{numeric:true,sensitivity:'base'});
const panelNameOrder=(a,b)=>nameOrder(a.brand,b.brand)||nameOrder(a.model,b.model)||nameOrder(a.id,b.id);
const categoryRank=panel=>{const rank=categoryOrder.indexOf(panel.category);return rank<0?categoryOrder.length:rank};
function comparePanels(a,b,order){
  if(order==='uk-first'){
    const priority=Number(b.uk_priority===true)-Number(a.uk_priority===true);
    if(priority)return priority;
    if(a.uk_priority===true){
      const category=categoryRank(a)-categoryRank(b);
      if(category)return category;
      const position=(a.uk_priority_order??1000)-(b.uk_priority_order??1000);
      if(position)return position;
    }
  }
  return panelNameOrder(a,b);
}
// Editorial browsing priority, not a statement of manufacturing origin or exclusivity.
export function sortPanels(panels,order='uk-first'){return [...panels].sort((a,b)=>comparePanels(a,b,order))}
export function filterPanels(panels,{query='',brand='',category='',order='uk-first'}={}){const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);return sortPanels(panels.filter(p=>(!brand||p.brand===brand)&&(!category||p.category===category)&&terms.every(t=>`${p.brand} ${p.model} ${(p.aliases||[]).join(' ')}`.toLowerCase().includes(t))),order)}
export function sortPacks(packs,panels,order='uk-first'){
  const byId=new Map(panels.map(p=>[p.id,p]));
  const first=new Map(packs.map(p=>[p.id,sortPanels(p.panel_ids.map(id=>byId.get(id)).filter(Boolean))[0]]));
  return [...packs].sort((a,b)=>{
    if(order==='uk-first'){
      const left=first.get(a.id),right=first.get(b.id);
      const priority=Number(right?.uk_priority===true)-Number(left?.uk_priority===true);
      if(priority)return priority;
      if(left?.uk_priority===true&&right?.uk_priority===true){const difference=comparePanels(left,right,order);if(difference)return difference}
    }
    return nameOrder(a.brand,b.brand)||nameOrder(a.title,b.title)||nameOrder(a.id,b.id);
  });
}
export function groupsForPanel(knowledge,panel){return knowledge.groups.filter(g=>(g.category||'fire')===(panel?.category||'fire'))}

// Earlier saved sessions embed the old source-photo filenames. Resolve them
// to the unchanged catalogue images; source masters live in research.
const legacyPanelImages=Object.freeze({
  "gent-vigilon-compact.jpg": "gent-vigilon-compact.webp",
  "gent-compact-plus.jpg": "gent-compact-plus.webp",
  "gent-vigilon-plus.png": "gent-vigilon-plus.webp",
  "gent-nano-alt.jpg": "gent-nano.webp",
  "gent-xenex.jpg": "gent-xenex.webp",
  "advanced-mxpro5.jpg": "advanced-mxpro5.webp",
  "protec-6500.png": "protec-6500.webp"
});
export function resolvePanelImage(panel,panels=[]){
 if(!panel)return null;
 const current=panel.id?panels.find(candidate=>candidate.id===panel.id):null;
 return current?.image||legacyPanelImages[panel.image]||panel.image||null;
}

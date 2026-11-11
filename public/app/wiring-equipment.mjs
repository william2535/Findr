// Pictures come only from the diagram's reviewed target IDs, never a name guess.
export function wiringEquipment(entries,{panels=[],devices=[]}={}){
 const found=new Map();
 for(const [kind,catalogue,field] of [['panels',panels,'panelIds'],['devices',devices,'deviceIds']]){
  const byId=new Map(catalogue.map(item=>[item.id,item]));
  for(const entry of entries)for(const id of entry[field]||[]){
   const item=byId.get(id);
   if(!item||!/^[a-z0-9][a-z0-9-]*\.(webp|png|jpg)$/i.test(item.image||''))continue;
   found.set(kind+'/'+id,{id,kind,image:'./'+kind+'/'+item.image,label:[item.brand,item.model].filter(Boolean).join(' '),reference:/keypad|shared/i.test(item.image_type||'')?'Keypad / shared reference':'Linked equipment'});
  }
 }
 return [...found.values()];
}

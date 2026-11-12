// Display preferences only. Manuals, jobs and calculator inputs keep their own stores.
const KEY='findr:home-view:v1';
let preference;
function preferences(){
 if(preference)return preference;
 preference={layout:'detailed',toolboxOpen:false,extra:{install:false,about:false}};
 try{const value=JSON.parse(localStorage.getItem(KEY)||'null');if(value?.layout==='grid')preference.layout='grid';preference.toolboxOpen=value?.toolboxOpen===true;for(const key of ['install','about'])preference.extra[key]=value?.extra?.[key]===true;}catch{}
 return preference;
}
export function mountHomeView(app,{notify=()=>{}}={}){
 const root=app.querySelector('#home-dashboard');if(!root)return;
 const state=preferences(),toolbox=root.querySelector('#home-toolbox');
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{notify('This view is active, but your browser could not save the preference.');}};
 const apply=()=>{
  root.dataset.layout=state.layout;
  root.querySelectorAll('[data-home-layout]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.homeLayout===state.layout)));
  toolbox.open=state.toolboxOpen;
  root.querySelectorAll('[data-home-extra]').forEach(detail=>{detail.open=state.layout==='detailed'||state.extra[detail.dataset.homeExtra];detail.querySelector('summary').hidden=state.layout==='detailed';});
 };
 root.addEventListener('click',event=>{const button=event.target.closest('[data-home-layout]');if(!button||!root.contains(button)||!['detailed','grid'].includes(button.dataset.homeLayout))return;state.layout=button.dataset.homeLayout;apply();save();});
 root.addEventListener('toggle',event=>{
  const detail=event.target;
  if(detail===toolbox&&state.toolboxOpen!==detail.open){state.toolboxOpen=detail.open;save();}
  else if(state.layout==='grid'&&detail.dataset.homeExtra&&state.extra[detail.dataset.homeExtra]!==detail.open){state.extra[detail.dataset.homeExtra]=detail.open;save();}
 },true);
 apply();
}

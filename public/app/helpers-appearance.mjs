// Local presentation choices only. Imported values never become markup or CSS.
const ICON_PATHS={
  terminal:'<rect x="4" y="5" width="24" height="22" rx="5"/><path d="m10 12 4 4-4 4m8 0h4"/>',
  robot:'<path d="M16 4v4m-5 17v3m10-3v3M4 14H2m28 0h-2"/><circle cx="16" cy="3" r="1"/><rect x="5" y="8" width="22" height="17" rx="5"/><path d="M10 14h2m8 0h2m-11 5q5 5 10 0"/>',
  bolt:'<path d="m18 3-11 15h8l-1 11 11-16h-8z"/><path d="M23 5h3M5 26H2"/>',
  ghost:'<path d="M6 28V14a10 10 0 0 1 20 0v14l-5-3-5 3-5-3z"/><path d="M11 13h1m8 0h1m-7 6q2 3 4 0"/>',
  mug:'<path d="M6 13h17v10a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5zm17 2h2a4 4 0 0 1 0 8h-2M10 8c-3-2 3-3 0-5m7 5c-3-2 3-3 0-5"/><path d="M11 19h1m5 0h1m-6 4h5"/>',
  cone:'<path d="m8 26 7-22h2l7 22M4 28h24M12 13h8M10 21h12"/><path d="M13 17h1m4 0h1"/>',
  owl:'<path d="m6 13-1-9 8 4h6l8-4-1 9v7a10 10 0 0 1-20 0z"/><circle cx="11" cy="15" r="4"/><circle cx="21" cy="15" r="4"/><path d="M11 15h.01M21 15h.01m-7 6 2 2 2-2m-7 8v-3m10 3v-3"/>',
  wizard:'<path d="M9 23 15 4l5 3-1 6 6 10M3 25q13 7 26 0l-4-2H7z"/><path d="m15 15 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM25 5v4m-2-2h4"/>',
};
export const HELPER_ICONS=Object.freeze([
  {id:'terminal',label:'Old school'}, {id:'robot',label:'Panel pal'},
  {id:'bolt',label:'Sparky'}, {id:'ghost',label:'Little gremlin'},
  {id:'mug',label:'Tea break'}, {id:'cone',label:'Cone head'},
  {id:'owl',label:'Night owl'}, {id:'wizard',label:'Wire wizard'},
].map(Object.freeze));
export const HELPER_COLOURS=Object.freeze([
  {id:'yellow',label:'FINDR yellow',accent:'#ffda3d',tint:'#262211',border:'#746123'},
  {id:'orange',label:'Orange',accent:'#ffb45b',tint:'#2b2014',border:'#805d30'},
  {id:'coral',label:'Coral',accent:'#ff9990',tint:'#2b1d1d',border:'#83534e'},
  {id:'pink',label:'Pink',accent:'#ffabe0',tint:'#2a1e28',border:'#805772'},
  {id:'purple',label:'Purple',accent:'#c5afff',tint:'#231f30',border:'#655681'},
  {id:'blue',label:'Blue',accent:'#91ccff',tint:'#182530',border:'#446880'},
  {id:'teal',label:'Teal',accent:'#85dfd3',tint:'#152a28',border:'#40766f'},
].map(Object.freeze));
export function normalizeHelperAppearance(value){
  return {icon:HELPER_ICONS.some(item=>item.id===value?.icon)?value.icon:'terminal',colour:HELPER_COLOURS.some(item=>item.id===value?.colour)?value.colour:'yellow'};
}
export function helperAppearanceStyle(value){
  const appearance=normalizeHelperAppearance(value),colour=HELPER_COLOURS.find(item=>item.id===appearance.colour);
  return `--helper-accent:${colour.accent};--helper-tint:${colour.tint};--helper-border:${colour.border}`;
}
export function renderHelperIcon(value){
  const {icon}=normalizeHelperAppearance(value);
  return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON_PATHS[icon]}</svg>`;
}

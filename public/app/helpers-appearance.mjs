// Local presentation choices only. Imported values never become markup or CSS.
const ICON_PATHS={
  terminal:'<rect x="4" y="5" width="24" height="22" rx="5"/><path d="m10 12 4 4-4 4m8 0h4"/>',
  robot:'<path d="M16 4v4m-5 17v3m10-3v3M4 14H2m28 0h-2"/><circle cx="16" cy="3" r="1"/><rect x="5" y="8" width="22" height="17" rx="5"/><path d="M10 14h2m8 0h2m-11 5q5 5 10 0"/>',
  // Original, compact line portraits: no remote images, fonts or extra downloads.
  hawking:'<path d="M13 43V18q0-5 5-5h28q5 0 5 5v25M17 26v-7q1-12 16-12 14 0 14 12v8M19 18q7 1 17-7m-6 1q8 2 14 7"/><path d="M19 26v8q1 13 13 13 12 0 14-13v-8"/><rect x="17" y="23" width="14" height="10" rx="3"/><rect x="34" y="23" width="14" height="10" rx="3"/><path d="M31 27h3m-3 7 3 2m-8 4q6 5 13-1M25 47v4m14-4v4M11 60v-5q0-5 13-6l8 7 8-7q13 1 13 6v5M23 60v-5h18v5"/><circle cx="24" cy="28" r="1" fill="currentColor"/><circle cx="40" cy="28" r="1" fill="currentColor"/>',
  einstein:'<path d="M18 31q-9 3-13-3l6-5-7-3 9-4-5-5 12 1-1-7 10 5 5-7 6 8 10-4-2 8 11 1-7 6 8 5-10 4M19 18q-3 9-1 18 1 13 14 15 13-2 14-15 2-9-1-16M18 24l-5 6m32-6 6 6M22 26l6-1m9 0 6 1M32 30l-2 5h4"/><path d="M22 41q3-7 10-4 7-3 10 4-5 1-10-1-5 2-10 1Z" fill="currentColor" stroke-width="1"/><path d="M28 45h8M12 60q1-8 11-10l9 7 9-7q10 2 11 10"/><circle cx="25" cy="30" r="1.2" fill="currentColor"/><circle cx="40" cy="30" r="1.2" fill="currentColor"/>',
  newton:'<path d="M19 49q-9 3-8-5-6-3-2-9-5-6 0-10-2-7 4-10 0-10 12-10h12q12 0 13 10 6 3 4 10 5 5 0 10 4 6-2 9 0 8-8 5M20 18q6 0 11-9 6 8 12 9M20 19v15q1 13 12 14 11-1 12-14V19M14 23q-6 3-1 8m2 4q-5 4 0 8m34-20q6 3 1 8m-2 4q5 4 0 8M23 26h5m8 0h5m-9 3-2 7h4m-7 5h10M9 60q2-8 15-11l8 7 8-7q13 3 15 11M27 50l-2 10h14l-2-10"/><circle cx="26" cy="30" r="1" fill="currentColor"/><circle cx="39" cy="30" r="1" fill="currentColor"/>',
  tesla:'<path d="M19 24v-9q2-10 16-10 13 1 12 15l-2 6M20 18q15 0 20-9m-9 7 13 5M20 24v10l5 12 9 5 9-7 3-12v-8M24 27l5-1m8 0h5m-9 5-2 6h4M27 41q6-3 13 0M30 45h7M24 46v4L10 56v5m31-15v4l13 6v5M24 50l9 7 8-7M25 61l-2-9m19 0-2 9m-10-5 3 2 3-2-2 5h-2z"/><circle cx="27" cy="30" r="1" fill="currentColor"/><circle cx="40" cy="30" r="1" fill="currentColor"/>',
  curie:'<path d="M17 26q-4-13 5-18 11-6 20 0 11 5 6 18M19 22q10-1 17-12 1 8 10 12M18 24v10q1 12 14 16 13-4 14-16V24M24 28h4m9 0h4m-9 3-2 6h4m-6 6h8M24 47v5l8 6 8-6v-5M24 52q-14 1-16 9m32-9q14 1 16 9M23 54l-1 7m20-7 1 7M16 17q-8-1-6-8 2-6 9-3"/><circle cx="26" cy="32" r="1" fill="currentColor"/><circle cx="39" cy="32" r="1" fill="currentColor"/><circle cx="32" cy="61" r="1" fill="currentColor"/>',
  lovelace:'<path d="M18 25q-6-9 2-15 12-8 25 1 7 5 2 14M19 22q7-2 14-11 4 8 12 11M20 23v12q2 12 12 14 11-2 13-14V23M14 23q-7 4-3 10-4 5 1 9-2 6 5 7m31-26q7 4 3 10 4 5-1 9 2 6-5 7M24 28h4m9 0h4m-9 3-2 6h4m-6 6h8M25 47v4q7 8 14 0v-4M25 51l-13 5-3 6m30-11 13 5 3 6M16 56q16 10 32 0M17 13l-4-5 8 1m1-1 4-5 3 5"/><circle cx="26" cy="32" r="1" fill="currentColor"/><circle cx="39" cy="32" r="1" fill="currentColor"/>',
};
export const HELPER_ICONS=Object.freeze([
  {id:'terminal',label:'OG'}, {id:'robot',label:'Panel pal'},
  {id:'hawking',label:'Stephen Hawking'}, {id:'einstein',label:'Albert Einstein'},
  {id:'newton',label:'Isaac Newton'}, {id:'tesla',label:'Nikola Tesla'},
  {id:'curie',label:'Marie Curie'}, {id:'lovelace',label:'Ada Lovelace'},
].map(Object.freeze));
// Keep older saved pals and exported backups usable. Only the portrait changes;
// their selected colour, messages, manuals and diagnostic records stay intact.
const LEGACY_ICONS=Object.freeze({bolt:'tesla',ghost:'hawking',mug:'einstein',cone:'newton',owl:'curie',wizard:'lovelace'});
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
  const raw=typeof value?.icon==='string'?value.icon:'';
  const icon=Object.hasOwn(LEGACY_ICONS,raw)?LEGACY_ICONS[raw]:raw;
  return {icon:HELPER_ICONS.some(item=>item.id===icon)?icon:'terminal',colour:HELPER_COLOURS.some(item=>item.id===value?.colour)?value.colour:'yellow'};
}
export function helperAppearanceStyle(value){
  const appearance=normalizeHelperAppearance(value),colour=HELPER_COLOURS.find(item=>item.id===appearance.colour);
  return `--helper-accent:${colour.accent};--helper-tint:${colour.tint};--helper-border:${colour.border}`;
}
export function renderHelperIcon(value){
  const {icon}=normalizeHelperAppearance(value);
  const portrait=icon!=='terminal'&&icon!=='robot';
  return `<svg data-helper-icon="${icon}" viewBox="0 0 ${portrait?64:32} ${portrait?64:32}" fill="none" stroke="currentColor" stroke-width="${portrait?2.4:1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON_PATHS[icon]}</svg>`;
}

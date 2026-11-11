// Recognition references are pinned to the particular hardware, not a whole brand.
export const moreKeypadLooks = {
  'ade-accenta-optima': {
    style:'ade', model:'ADE 8EP417A LCD · Accenta / Optima G4', short:'Accenta / Optima LCD',
    recognition:'Pink display strip · round pink keys · one ▲ key · CHIME, OMIT, PROG and SET down the right',
    source:'https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/Accenta%20-%20Optima%20User%20Guide.pdf#page=25',
  },
  'risco-lightsys2': {
    style:'risco', model:'RISCO RP432KP LCD · LightSYS2', short:'LightSYS2 LCD',
    recognition:'White flip cover · blue LCD · padlock and house keys · green Unset / OK',
    source:'https://www.maxwell.co.th/wp-content/uploads/2023/11/LightSYS-LCD-Keypad.pdf#page=4',
  },
  'hkc-quantum70': {
    style:'hkc', model:'HKC Quantum 70 · integrated keypad', short:'HKC Quantum 70',
    recognition:'White integrated panel · blue LCD · black pill keys · PLAY / QUIT, REC / YES and LIGHT / NO',
    source:'https://gard.ie/wp-content/uploads/2024/08/Quantum-70-Installation-Manual.pdf#page=7',
  },
};

export const moreKeyboardMappings = {
  'ade-accenta-optima': {Enter:'enter',Escape:'back',ArrowUp:'next',c:'chime',C:'chime',o:'omit',O:'omit',p:'program',P:'program'},
  'risco-lightsys2': {Enter:'enter',Escape:'back',ArrowUp:'previous',ArrowDown:'next',a:'arm',A:'arm',p:'part-set',P:'part-set'},
  'hkc-quantum70': {Enter:'enter',Escape:'back','*':'previous','#':'next',ArrowUp:'previous',ArrowDown:'next',y:'enter',Y:'enter',n:'change',N:'change',q:'back',Q:'back'},
};

export function moreKeypadSymbol(style,id){
  if(style!=='risco')return '';
  const paths={
    arm:'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4M12 15v3',
    'part-set':'m2 11 10-9 10 9M5 9v12h14V9M9 15h6v6H9zM10 15v-2a2 2 0 0 1 4 0v2',
    enter:'M3 11h12v10H3zM6 11V7a4 4 0 0 1 8 0M17 10h6m-3-3 3 3-3 3',
    back:'M3 5h6l2 2 2-2h6v15h-6l-2 1-2-1H3zM11 7v14M16 11h6v5m-3-3 3 3 2-2',
    previous:'M4 17h5a6 6 0 0 0 6-6V4m-4 4 4-4 4 4M18 17h3m-1.5-1.5v3',
    next:'M20 7h-5a6 6 0 0 0-6 6v7m-4-4 4 4 4-4',
    'panic-left':'M8 6a4 4 0 1 0 8 0 4 4 0 0 0-8 0M5 21l4-9h6l4 9M9 17h6',
    'panic-right':'M8 6a4 4 0 1 0 8 0 4 4 0 0 0-8 0M5 21l4-9h6l4 9M9 17h6',
  };
  return paths[id]?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[id]}"/></svg>`:'';
}

export function moreKeypadSecondary(style,id){
  if(style==='risco')return ({1:'A',2:'B',3:'C',5:'D',7:'+',9:'+'})[id]||(['4','6'].includes(id)?'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2c2 7-6 7-3 12 0-3 3-3 3-6 5 5 8 9 4 13H7C1 14 7 9 9 5c-1 4 1 5 2 6 2-3 3-6 2-9Z"/></svg>':'');
  if(style==='hkc')return ({1:'txt',0:'␣'})[id]||'';
  return '';
}

export function moreKeypadFace(style,{key,lcd,led,state}) {
  if(style==='ade')return `<div class="practice-ade-display">${lcd}<div class="practice-ade-leds" aria-hidden="true">${led('Power',true)}${led('Day',!state.armed)}</div></div><div class="practice-ade-keybank"><div class="practice-ade-keys">${[['1'],['2'],['3'],['chime','CHIME'],['4'],['5'],['6'],['omit','OMIT'],['7'],['8'],['9'],['program','PROG'],['next','▲'],['0'],['back','RESET'],['enter','SET']].map(args=>key(...args)).join('')}</div><div class="practice-ade-panic">${key('pa-left','PA')}${key('pa-right','PA')}</div></div><div class="practice-ade-flap" aria-hidden="true"><span>Accenta / Optima</span><strong>ADE</strong></div>`;
  if(style==='hkc')return `<div class="practice-hkc-console"><div class="practice-hkc-display">${lcd}<div class="practice-hkc-leds" aria-hidden="true">${led('Power',true)}${led('Fault',Boolean(state.alarm))}</div></div><div class="practice-hkc-keybank"><div class="practice-hkc-numbers">${['1','2','3','4','5','6','7','8','9'].map(id=>key(id)).join('')}${key('previous','*')}${key('0')}${key('next','#')}</div><div class="practice-hkc-functions">${key('back','PLAY\nQUIT')}${key('enter','REC\nYES')}${key('change','LIGHT\nNO')}</div></div><div class="practice-hkc-mark" aria-hidden="true"><strong>HKC</strong><span>Quantum 70</span></div></div><div class="practice-hkc-cabinet" aria-hidden="true"><span></span></div>`;
  if(style==='risco')return `<div class="practice-risco-fascia"><strong aria-hidden="true">RISCO</strong>${lcd}<div class="practice-risco-leds" aria-hidden="true"><span>◉</span><span>✓</span><span>▣</span><span>⌂</span><span>⚒</span></div><i aria-hidden="true"></i></div><div class="practice-risco-keys">${[['panic-left','PA'],['previous','Status / ▲'],['panic-right','PA'],['part-set','Part Set'],['next','Omit / ▼'],['arm','Full Set'],['1'],['2'],['3'],['4'],['5'],['6'],['7'],['8'],['9'],['back','Menu'],['0'],['enter','OK']].map(args=>key(...args)).join('')}</div><div class="practice-risco-flap" aria-hidden="true"><span></span></div>`;
  return '';
}

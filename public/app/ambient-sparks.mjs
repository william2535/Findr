// Decorative yellow sparks only. No job, download or equipment state is changed.
export function createAmbientSparks({host=window,doc=document}={}){
 const canvas=doc.createElement('canvas');canvas.id='findr-ambient-sparks';canvas.className='ambient-sparks';canvas.setAttribute('aria-hidden','true');
 let ctx;try{ctx=canvas.getContext('2d');}catch{}if(!ctx)return{destroy(){}};
 doc.body.prepend(canvas);
 const reduced=host.matchMedia('(prefers-reduced-motion: reduce)');
 let width=0,height=0,frame=0,timer=0,resizeFrame=0,particles=[],destroyed=false,burst=0;
 const clear=()=>ctx.clearRect(0,0,width,height);
 function stop(){host.clearTimeout(timer);host.cancelAnimationFrame(frame);timer=frame=0;particles=[];clear();canvas.dataset.active='false';}
 const allowed=()=>!destroyed&&!doc.hidden&&!reduced.matches;
 function size(){width=host.innerWidth;height=host.innerHeight;const scale=Math.min(2,host.devicePixelRatio||1);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(scale,0,0,scale,0,0);ctx.lineCap='round';ctx.lineJoin='round';}
 function point(shoot){
  const viewport=host.visualViewport,top=viewport?.offsetTop||0,bottom=Math.min(height,top+(viewport?.height||height));
  const header=doc.querySelector('.header')?.getBoundingClientRect();
  const low=Math.min(bottom-40,Math.max(top+32,header?.bottom||0)+32+(shoot?130:0));
  const high=Math.max(low,bottom-60),y=()=>low+Math.random()*(high-low);
  // Prefer genuinely empty space in the current viewport, not text or buttons.
  // Edge-only 2px bursts were too easy to miss on a portrait phone.
  const open=(x,y)=>{const hit=doc.elementFromPoint(x,y);return hit&&(hit===doc.body||hit.id==='app'||hit.classList.contains('home-intro')||hit.id==='home-dashboard');};
  if(Math.random()<.8){for(let i=0;i<16;i++){
   const x=28+Math.random()*Math.max(1,width-56),py=y();
   // Check the glow and travel corridor too, so a spark does not immediately
   // drift underneath a card or across a label after starting in a small gap.
   const rows=shoot?[-130,-70,-20,0,20]:[-20,0,20,40];
   if([-20,0,20].every(dx=>rows.every(dy=>open(x+dx,py+dy))))return{x,y:py};
  }}
  return{x:Math.random()<.5?12:width-12,y:y()};
 }
 function emit(){
  timer=0;if(!allowed())return;
  const shoot=++burst%3===0,{x,y}=point(shoot),birth=host.performance.now();
  particles=[{x,y,birth,life:shoot?1800:2200,vx:shoot?(Math.random()-.5)*8:0,vy:shoot?-65:6,radius:shoot?2.8:3.4,star:!shoot,trail:shoot}];
  if(!shoot)for(let i=0;i<6;i++){const direction=Math.random()*Math.PI*2,speed=10+Math.random()*16;particles.push({x,y,birth,life:1200+Math.random()*600,vx:Math.cos(direction)*speed,vy:Math.sin(direction)*speed+6,radius:1+Math.random()*.6,star:false,trail:false});}
  canvas.dataset.active='true';canvas.dataset.kind=shoot?'shoot':'spark';frame=host.requestAnimationFrame(draw);
 }
 function draw(now){
  frame=0;if(!allowed()){stop();return;}clear();particles=particles.filter(p=>now-p.birth<p.life);
  for(const p of particles){
   const age=Math.max(0,now-p.birth),t=age/p.life,seconds=age/1000,fade=(1-t)**1.4;
   const x=p.x+p.vx*seconds,y=p.y+p.vy*seconds+(p.trail?0:6*seconds*seconds),radius=p.radius*(.45+.55*(1-t));
   const halo=radius*6,glow=ctx.createRadialGradient(x,y,0,x,y,halo);
   glow.addColorStop(0,`rgba(255,233,128,${fade*.65})`);glow.addColorStop(.2,`rgba(255,218,61,${fade*.32})`);glow.addColorStop(.6,`rgba(255,199,25,${fade*.07})`);glow.addColorStop(1,'rgba(255,199,25,0)');
   ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,halo,0,Math.PI*2);ctx.fill();
   if(p.trail){const tailY=y+28,trail=ctx.createLinearGradient(x,tailY,x,y);trail.addColorStop(0,'rgba(255,218,61,0)');trail.addColorStop(1,`rgba(255,225,90,${fade*.8})`);ctx.strokeStyle=trail;ctx.lineWidth=1.15;ctx.beginPath();ctx.moveTo(x-p.vx*.28,tailY);ctx.lineTo(x,y);ctx.stroke();}
   if(p.star){const arm=4+6*(1-t);ctx.strokeStyle=`rgba(255,225,90,${fade*.8})`;ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x-arm,y);ctx.lineTo(x+arm,y);ctx.moveTo(x,y-arm);ctx.lineTo(x,y+arm);ctx.stroke();}
   ctx.fillStyle=`rgba(255,239,154,${fade})`;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
  }
  if(particles.length)frame=host.requestAnimationFrame(draw);
  else{canvas.dataset.active='false';timer=host.setTimeout(emit,650+Math.random()*900);}
 }
 function sync(){stop();if(allowed())timer=host.setTimeout(emit,250);}
 // Safari changes viewport height as its toolbar moves. Resize the drawing
 // surface once per frame without cancelling the burst or restarting its timer.
 function resize(){if(!resizeFrame)resizeFrame=host.requestAnimationFrame(()=>{
  resizeFrame=0;size();
  // Changing canvas dimensions erases its pixels. Redraw in this same frame
  // so a stream of Safari toolbar resizes cannot erase each visible frame.
  if(particles.length&&allowed()){host.cancelAnimationFrame(frame);frame=0;draw(host.performance.now());}
 });}
 size();sync();
 doc.addEventListener('visibilitychange',sync);host.addEventListener('resize',resize);host.addEventListener('pagehide',stop);host.addEventListener('pageshow',sync);reduced.addEventListener('change',sync);
 return{destroy(){destroyed=true;stop();host.cancelAnimationFrame(resizeFrame);doc.removeEventListener('visibilitychange',sync);host.removeEventListener('resize',resize);host.removeEventListener('pagehide',stop);host.removeEventListener('pageshow',sync);reduced.removeEventListener('change',sync);canvas.remove();}};
}

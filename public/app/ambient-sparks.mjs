// Decorative warm-yellow embers. This never represents equipment or work progress.
export function createAmbientSparks({host=window,doc=document,random=Math.random}={}){
 const canvas=doc.createElement('canvas');canvas.id='findr-ambient-sparks';canvas.className='ambient-sparks';canvas.setAttribute('aria-hidden','true');
 let ctx;try{ctx=canvas.getContext('2d');}catch{}if(!ctx)return{destroy(){}};
 doc.body.prepend(canvas);
 const reduced=host.matchMedia('(prefers-reduced-motion: reduce)');
 let width=0,height=0,frame=0,timer=0,resizeFrame=0,particles=[],destroyed=false,burst=0;
 const clear=()=>ctx.clearRect(0,0,width,height);
 const typing=()=>/^(INPUT|TEXTAREA|SELECT)$/.test(doc.activeElement?.tagName||'')||doc.activeElement?.isContentEditable;
 const allowed=()=>!destroyed&&!doc.hidden&&!reduced.matches&&!typing();
 function stop(){host.clearTimeout(timer);host.cancelAnimationFrame(frame);timer=frame=0;particles=[];clear();canvas.dataset.active='false';}
 function size(){
  width=Math.max(1,host.innerWidth);height=Math.max(1,host.innerHeight);
  // Bound memory/fill cost on phones and large Retina displays, while retaining
  // antialiased round points. CSS dimensions remain the actual viewport size.
  const scale=Math.max(1,Math.min(2,host.devicePixelRatio||1,Math.sqrt(6000000/(width*height))));
  canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(scale,0,0,scale,0,0);ctx.lineCap='round';ctx.lineJoin='round';
 }
 function point(shoot){
  const viewport=host.visualViewport,top=viewport?.offsetTop||0,bottom=Math.min(height,top+(viewport?.height||height));
  const header=doc.querySelector('.header')?.getBoundingClientRect();
  const low=Math.max(top+40,Math.min(bottom-70,(header?.bottom||top)+54+(shoot?100:0))),high=Math.max(low,bottom-70);
  const y=()=>low+random()*(high-low);
  const open=(x,y)=>{const hit=doc.elementFromPoint(x,y);return hit&&(hit===doc.body||hit.id==='app'||hit.classList?.contains('home-intro')||hit.id==='home-dashboard');};
  // Keep most bursts in true background space. Always use an inset gutter for
  // at least every second burst so an opaque mobile card cannot hide all light.
  if(burst%2===0){for(let i=0;i<12;i++){
   const x=36+random()*Math.max(1,width-72),py=y(),rows=shoot?[-150,-90,-35,0,25]:[-25,0,25,50];
   if([-24,0,24].every(dx=>rows.every(dy=>open(x+dx,py+dy))))return{x,y:py};
  }}
  return{x:random()<.5?14:width-14,y:y()};
 }
 function emit(){
  timer=0;if(!allowed())return;
  const shoot=++burst%4===0,{x,y}=point(shoot),birth=host.performance.now();
  particles=Array.from({length:3+Math.floor(random()*3)},()=>({x:x+(random()-.5)*12,y:y+(random()-.5)*20,birth,life:2400+random()*1600,vx:(random()-.5)*5,vy:-5-random()*9,radius:.65+random()*.85,star:false,trail:false}));
  canvas.dataset.active='true';canvas.dataset.kind=shoot?'shoot':'spark';frame=host.requestAnimationFrame(draw);
 }
 function draw(now){
  frame=0;if(!allowed()){stop();return;}clear();particles=particles.filter(p=>now-p.birth<p.life);
  for(const p of particles){
   const age=Math.max(0,now-p.birth),t=age/p.life,seconds=age/1000,fade=Math.sin(Math.PI*t)*.55;
   const x=p.x+p.vx*seconds,y=p.y+p.vy*seconds+0,radius=p.radius*(.38+.62*(1-t));
   const halo=radius*(p.star?7:5),glow=ctx.createRadialGradient(x,y,0,x,y,halo);
   glow.addColorStop(0,`rgba(255,243,174,${fade*.8})`);glow.addColorStop(.16,`rgba(255,223,81,${fade*.45})`);glow.addColorStop(.5,`rgba(255,197,32,${fade*.11})`);glow.addColorStop(1,'rgba(255,191,25,0)');
   ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,halo,0,Math.PI*2);ctx.fill();
   if(p.trail){
    // Short rounded segments taper to a transparent tail; no rectangular glow
    // textures, hard ends, CSS filters or expensive full-screen blending.
    const length=36+12*(1-t);
    for(let i=7;i>=0;i--){const tail=i/8,next=(i+1)/8;ctx.strokeStyle=`rgba(255,224,99,${fade*(1-tail)**2*.78})`;ctx.lineWidth=1.7*(1-tail)+.12;ctx.beginPath();ctx.moveTo(x-p.vx*.48*next,y+length*next);ctx.lineTo(x-p.vx*.48*tail,y+length*tail);ctx.stroke();}
   }
   if(p.star){
    const arm=3+7*(1-t),ray=ctx.createRadialGradient(x,y,0,x,y,arm);ray.addColorStop(0,`rgba(255,244,179,${fade*.9})`);ray.addColorStop(.4,`rgba(255,224,99,${fade*.65})`);ray.addColorStop(1,'rgba(255,224,99,0)');ctx.strokeStyle=ray;ctx.lineWidth=.95;ctx.beginPath();ctx.moveTo(x-arm,y);ctx.lineTo(x+arm,y);ctx.moveTo(x,y-arm);ctx.lineTo(x,y+arm);ctx.stroke();
   }
   ctx.fillStyle=`rgba(255,246,189,${fade})`;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
  }
  if(particles.length)frame=host.requestAnimationFrame(draw);
  else{canvas.dataset.active='false';timer=host.setTimeout(emit,1100+random()*1800);}
 }
 function sync(){stop();if(allowed())timer=host.setTimeout(emit,280);}
 // Safari toolbar/keyboard changes must not repeatedly cancel a visible burst.
 function resize(){if(!resizeFrame)resizeFrame=host.requestAnimationFrame(()=>{
  resizeFrame=0;size();if(particles.length&&allowed()){host.cancelAnimationFrame(frame);frame=0;draw(host.performance.now());}
 });}
 size();sync();
 doc.addEventListener('visibilitychange',sync);doc.addEventListener('focusin',sync);doc.addEventListener('focusout',sync);host.addEventListener('resize',resize);host.addEventListener('pagehide',stop);host.addEventListener('pageshow',sync);reduced.addEventListener('change',sync);
 return{destroy(){destroyed=true;stop();host.cancelAnimationFrame(resizeFrame);doc.removeEventListener('visibilitychange',sync);doc.removeEventListener('focusin',sync);doc.removeEventListener('focusout',sync);host.removeEventListener('resize',resize);host.removeEventListener('pagehide',stop);host.removeEventListener('pageshow',sync);reduced.removeEventListener('change',sync);canvas.remove();}};
}

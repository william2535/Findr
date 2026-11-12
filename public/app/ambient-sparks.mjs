// Decorative yellow sparks only. No job, download or equipment state is changed.
export function createAmbientSparks({host=window,doc=document}={}){
 const canvas=doc.createElement('canvas');canvas.id='findr-ambient-sparks';canvas.className='ambient-sparks';canvas.setAttribute('aria-hidden','true');
 let ctx;try{ctx=canvas.getContext('2d');}catch{}if(!ctx)return{destroy(){}};
 doc.body.prepend(canvas);
 const reduced=host.matchMedia('(prefers-reduced-motion: reduce)');
 let width=0,height=0,frame=0,timer=0,particles=[],destroyed=false,burst=0;
 const clear=()=>ctx.clearRect(0,0,width,height);
 function stop(){host.clearTimeout(timer);host.cancelAnimationFrame(frame);timer=frame=0;particles=[];clear();canvas.dataset.active='false';}
 const allowed=()=>!destroyed&&!doc.hidden&&!reduced.matches;
 function size(){width=host.innerWidth;height=host.innerHeight;const scale=Math.min(2,host.devicePixelRatio||1);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(scale,0,0,scale,0,0);ctx.lineCap='round';ctx.lineJoin='round';}
 function point(){
  // Gutters keep most sparks away from controls; occasionally use open background.
  if(Math.random()<.35){for(let i=0;i<5;i++){const x=24+Math.random()*Math.max(1,width-48),y=100+Math.random()*Math.max(1,height-200);const hit=doc.elementFromPoint(x,y);if(hit&&(hit===doc.body||hit.id==='app'||hit.classList.contains('home-intro')||hit.id==='home-dashboard'))return{x,y};}}
  return{x:Math.random()<.5?12:width-12,y:130+Math.random()*Math.max(1,height-220)};
 }
 function emit(){
  timer=0;if(!allowed())return;
  const {x,y}=point(),birth=host.performance.now(),shoot=++burst%4===0;
  particles=[{x,y,birth,life:shoot?1250:1700,vx:shoot?(Math.random()-.5)*8:0,vy:shoot?-100:8,radius:shoot?2:2.3,star:!shoot,trail:shoot}];
  if(!shoot)for(let i=0;i<4;i++){const direction=Math.random()*Math.PI*2,speed=10+Math.random()*16;particles.push({x,y,birth,life:900+Math.random()*600,vx:Math.cos(direction)*speed,vy:Math.sin(direction)*speed+8,radius:.7+Math.random()*.6,star:false,trail:false});}
  canvas.dataset.active='true';canvas.dataset.kind=shoot?'shoot':'spark';frame=host.requestAnimationFrame(draw);
 }
 function draw(now){
  frame=0;if(!allowed()){stop();return;}clear();particles=particles.filter(p=>now-p.birth<p.life);
  for(const p of particles){
   const age=Math.max(0,now-p.birth),t=age/p.life,seconds=age/1000,fade=(1-t)**2;
   const x=p.x+p.vx*seconds,y=p.y+p.vy*seconds+(p.trail?0:6*seconds*seconds),radius=p.radius*(.45+.55*(1-t));
   const halo=radius*6,glow=ctx.createRadialGradient(x,y,0,x,y,halo);
   glow.addColorStop(0,`rgba(255,233,128,${fade*.65})`);glow.addColorStop(.2,`rgba(255,218,61,${fade*.32})`);glow.addColorStop(.6,`rgba(255,199,25,${fade*.07})`);glow.addColorStop(1,'rgba(255,199,25,0)');
   ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,halo,0,Math.PI*2);ctx.fill();
   if(p.trail){const tailY=y+28,trail=ctx.createLinearGradient(x,tailY,x,y);trail.addColorStop(0,'rgba(255,218,61,0)');trail.addColorStop(1,`rgba(255,225,90,${fade*.8})`);ctx.strokeStyle=trail;ctx.lineWidth=1.15;ctx.beginPath();ctx.moveTo(x-p.vx*.28,tailY);ctx.lineTo(x,y);ctx.stroke();}
   if(p.star){const arm=3+5*(1-t);ctx.strokeStyle=`rgba(255,225,90,${fade*.65})`;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x-arm,y);ctx.lineTo(x+arm,y);ctx.moveTo(x,y-arm);ctx.lineTo(x,y+arm);ctx.stroke();}
   ctx.fillStyle=`rgba(255,239,154,${fade})`;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
  }
  if(particles.length)frame=host.requestAnimationFrame(draw);
  else{canvas.dataset.active='false';timer=host.setTimeout(emit,1600+Math.random()*2400);}
 }
 function sync(){stop();if(allowed())timer=host.setTimeout(emit,450);}
 function resize(){stop();size();sync();}
 size();sync();
 doc.addEventListener('visibilitychange',sync);host.addEventListener('resize',resize);host.addEventListener('pagehide',stop);host.addEventListener('pageshow',sync);reduced.addEventListener('change',sync);
 return{destroy(){destroyed=true;stop();doc.removeEventListener('visibilitychange',sync);host.removeEventListener('resize',resize);host.removeEventListener('pagehide',stop);host.removeEventListener('pageshow',sync);reduced.removeEventListener('change',sync);canvas.remove();}};
}

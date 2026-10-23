(function(){
var d=document,root=d.documentElement;root.classList.add('js');
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var loader=d.getElementById('loader');
function $(s,c){return (c||d).querySelector(s)}function $$(s,c){return Array.prototype.slice.call((c||d).querySelectorAll(s))}
var STAR='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c.6 6.6 5.4 11.4 12 12-6.6.6-11.4 5.4-12 12-.6-6.6-5.4-11.4-12-12 6.6-.6 11.4-5.4 12-12z"/></svg>';
function fillMq(id,words,outline){var h='';for(var r=0;r<2;r++)words.forEach(function(w,i){h+='<span class="'+((i+outline)%2?'o':'')+'">'+w+STAR+'</span>'});$('#'+id).innerHTML=h}
fillMq('m1',['Mniej roboty','Więcej gości','Więcej zysku'],0);fillMq('m2',['Pracujesz mniej','Zarabiasz więcej','Bez stresu'],1);
/* utilities (no gsap needed) */
$$('[data-copy]').forEach(function(b){b.addEventListener('click',function(){var t=b.getAttribute('data-copy');function ok(){var o=b.textContent;b.textContent='Skopiowano';b.classList.add('ok');setTimeout(function(){b.textContent='Kopiuj';b.classList.remove('ok')},1600)}
try{navigator.clipboard.writeText(t).then(ok,fb)}catch(e){fb()}
function fb(){try{var a=d.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';d.body.appendChild(a);a.select();d.execCommand('copy');a.remove();ok()}catch(e){}}})});
var vid=$('.reelbox video');if(vid){vid.controls=false;vid.muted=true;function pl(){if(vid.paused){var p=vid.play();if(p&&p.catch)p.catch(function(){})}}pl();['touchstart','pointerdown','scroll','click'].forEach(function(ev){addEventListener(ev,pl,{passive:true})});vid.addEventListener('pause',function(){setTimeout(pl,50)});d.addEventListener('visibilitychange',function(){if(!d.hidden)pl()})}
/* network canvas */
(function(){var c=$('#net');if(!c||reduce)return;var x=c.getContext('2d'),W,H,N=[],m={x:-999,y:-999},run=true,dpr=Math.min(devicePixelRatio||1,2);
function size(){W=c.clientWidth;H=c.clientHeight;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);var n=Math.round(W*H/(W<700?26000:16000));N=[];for(var i=0;i<n;i++)N.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35})}
size();addEventListener('resize',size);
c.parentNode.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect();m.x=e.clientX-r.left;m.y=e.clientY-r.top});
new IntersectionObserver(function(e){run=e[0].isIntersecting;if(run)tick()}).observe(c);
function tick(){if(!run)return;x.clearRect(0,0,W,H);for(var i=0;i<N.length;i++){var a=N[i];a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>W)a.vx*=-1;if(a.y<0||a.y>H)a.vy*=-1;var dx=m.x-a.x,dy=m.y-a.y,ds=Math.sqrt(dx*dx+dy*dy);if(ds<170){a.x+=dx*.012;a.y+=dy*.012}
x.beginPath();x.arc(a.x,a.y,1.8,0,6.283);x.fillStyle='rgba(140,165,255,.8)';x.fill();
for(var j=i+1;j<N.length;j++){var b=N[j],ex=a.x-b.x,ey=a.y-b.y,e=ex*ex+ey*ey;if(e<16000){x.strokeStyle='rgba(107,140,255,'+(0.28*(1-e/16000))+')';x.lineWidth=1;x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke()}}
if(ds<190){x.strokeStyle='rgba(180,200,255,'+(0.5*(1-ds/190))+')';x.beginPath();x.moveTo(a.x,a.y);x.lineTo(m.x,m.y);x.stroke()}}
requestAnimationFrame(tick)}tick()})();
/* cursor */
(function(){var c=$('.cur');if(!c||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;var tx=0,ty=0,cx=0,cy=0;
addEventListener('pointermove',function(e){tx=e.clientX;ty=e.clientY;c.classList.add('on')});
$$('a,button,[data-tilt]').forEach(function(el){el.addEventListener('pointerenter',function(){c.classList.add('big')});el.addEventListener('pointerleave',function(){c.classList.remove('big')})});
(function l(){cx+=(tx-cx)*.18;cy+=(ty-cy)*.18;c.style.transform='translate('+cx+'px,'+cy+'px)';requestAnimationFrame(l)})()})();
/* card spotlight + tilt */
$$('[data-tilt]').forEach(function(c){c.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;c.style.setProperty('--mx',px*100+'%');c.style.setProperty('--my',py*100+'%');if(matchMedia('(hover:hover)').matches)c.style.transform='perspective(900px) rotateX('+((.5-py)*7)+'deg) rotateY('+((px-.5)*9)+'deg) translateZ(0)'});c.addEventListener('pointerleave',function(){c.style.transform=''})});

function done(){if(loader){loader.remove();loader=null}root.classList.add('ready')}
if(!window.gsap||!window.ScrollTrigger||reduce){done();$$('.bc,.badge').forEach(function(e){e.classList.add('in')});return}
gsap.registerPlugin(ScrollTrigger);ScrollTrigger.config({ignoreMobileResize:true});
function split(el){var out=[];(function walk(n){Array.prototype.slice.call(n.childNodes).forEach(function(c){if(c.nodeType===3){var f=d.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(function(p){if(!p)return;if(/^\s+$/.test(p)){f.appendChild(d.createTextNode(' '))}else{var s=d.createElement('span');s.className='w';var i=d.createElement('span');i.className='wi';i.textContent=p;s.appendChild(i);f.appendChild(s);out.push(i)}});c.replaceWith(f)}else if(c.nodeType===1&&c.tagName!=='BR'){walk(c)}})})(el);return out}
function start(){
 var intro=[];
 $$('[data-split]').forEach(function(el){var ws=split(el);el._w=ws;gsap.set(ws,{yPercent:118})});
 var heroW=$('.hero .tag')._w;
 $$('[data-reveal]').forEach(function(el){var ws=split(el);gsap.set(ws,{opacity:.12});gsap.to(ws,{opacity:1,stagger:.12,ease:'none',scrollTrigger:{trigger:el,start:'top 82%',end:'bottom 48%',scrub:true}})});
 $$('[data-split]').forEach(function(el){if(el===$('.hero .tag'))return;ScrollTrigger.create({trigger:el,start:'top 86%',once:true,onEnter:function(){gsap.to(el._w,{yPercent:0,duration:1.1,ease:'power4.out',stagger:.07})}})});
 gsap.set('[data-rise]',{opacity:0,y:44});
 var heroRise=$$('.hero [data-rise]');
 $$('[data-rise]').forEach(function(el){if(heroRise.indexOf(el)>-1)return;ScrollTrigger.create({trigger:el,start:'top 90%',once:true,onEnter:function(){gsap.to(el,{opacity:1,y:0,duration:1,ease:'power3.out'})}})});
 gsap.set('.hero .pill',{scale:.9});
 /* progress + nav */
 gsap.to('.sp',{scaleX:1,ease:'none',scrollTrigger:{start:0,end:'max',scrub:.2}});
 ScrollTrigger.create({start:0,end:'max',onUpdate:function(s){var n=$('#nav');if(s.direction===1&&s.scroll()>240)n.classList.add('hide');else n.classList.remove('hide')}});
 gsap.to('.hin',{y:-90,opacity:.25,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
 /* marquee */
 var boost=0,tw=[];
 $$('.mq').forEach(function(m,i){var inn=m.firstElementChild,dir=i%2?1:-1;tw.push(gsap.fromTo(inn,{xPercent:dir<0?0:-50},{xPercent:dir<0?-50:0,duration:34,ease:'none',repeat:-1}))});
 ScrollTrigger.create({trigger:'.mqs',start:'top bottom',end:'bottom top',onUpdate:function(s){boost=Math.min(Math.abs(s.getVelocity())/260,9)}});
 gsap.ticker.add(function(){boost*=.93;tw.forEach(function(t){t.timeScale(1+boost)})});
 /* benefit cards */
 $$('.bc').forEach(function(c,i){gsap.from(c,{opacity:0,y:80,duration:1.1,ease:'power3.out',delay:(i%2)*.12,scrollTrigger:{trigger:c,start:'top 90%',once:true,onEnter:function(){c.classList.add('in')}}})});
 ScrollTrigger.create({trigger:'.badge',start:'top 85%',once:true,onEnter:function(){$('.badge').classList.add('in')}});
 gsap.to('.badge .rot',{rotation:360,transformOrigin:'50% 50%',ease:'none',scrollTrigger:{trigger:'.gar',start:'top bottom',end:'bottom top',scrub:true}});
 $$('.orb').forEach(function(o,i){gsap.to(o,{y:i?-120:140,ease:'none',scrollTrigger:{trigger:'.gar',start:'top bottom',end:'bottom top',scrub:true}})});
 /* footer wordmark */
 var ch=$$('.wm .ch span');gsap.set(ch,{yPercent:110});
 ScrollTrigger.create({trigger:'.wm',start:'top 92%',once:true,onEnter:function(){gsap.to(ch,{yPercent:0,duration:1.2,ease:'power4.out',stagger:.07})}});
 /* magnetic */
 $$('.mag').forEach(function(b){b.addEventListener('pointermove',function(e){var r=b.getBoundingClientRect();gsap.to(b,{x:(e.clientX-r.left-r.width/2)*.25,y:(e.clientY-r.top-r.height/2)*.35,duration:.4})});b.addEventListener('pointerleave',function(){gsap.to(b,{x:0,y:0,duration:.7,ease:'elastic.out(1,.4)'})})});
 /* desktop pins */
 var mm=gsap.matchMedia();
 mm.add('(min-width: 900px)',function(){
  var tl=gsap.timeline({scrollTrigger:{trigger:'.reel',start:'top top',end:'+=140%',pin:true,scrub:.6}});
  tl.to('.reelbox',{width:'100vw',borderRadius:0,ease:'none',duration:1},0)
    .fromTo('.rc1',{x:-140,opacity:0},{x:0,opacity:1,duration:.35},.3)
    .fromTo('.rc2',{x:140,opacity:0},{x:0,opacity:1,duration:.35},.42)
    .to('.rc1',{y:-70,duration:.3},.8).to('.rc2',{y:70,duration:.3},.8);
  var rows=$$('.chg .row');
  gsap.set('.cr2',{clipPath:'inset(0 100% 0 0)',x:-30});
  var t2=gsap.timeline({scrollTrigger:{trigger:'.chg',start:'top top',end:'+=260%',pin:true,scrub:.5}});
  t2.to('.bgfx',{opacity:1,duration:rows.length},0);
  rows.forEach(function(r,i){t2.to($('.strike',r),{scaleX:1,duration:.35},i).to($('.cl',r),{opacity:.32,duration:.35},i).to($('.cr2',r),{clipPath:'inset(0 0% 0 0)',x:0,duration:.6},i+.3)});
  t2.to({},{duration:.5});
  var track=$('.ptrack');function dist(){return Math.max(0,track.scrollWidth-innerWidth)}
  gsap.to(track,{x:function(){return -dist()},ease:'none',scrollTrigger:{trigger:'.proc',start:'top top',end:function(){return '+='+dist()},pin:true,scrub:.6,invalidateOnRefresh:true,onUpdate:function(s){gsap.set('.pbar i',{scaleX:s.progress})}}});
 });
 mm.add('(max-width: 899px)',function(){
  gsap.set('.cr2',{clipPath:'inset(0 100% 0 0)'});
  $$('.chg .row').forEach(function(r){var t=gsap.timeline({paused:true});t.to($('.strike',r),{scaleX:1,duration:.5}).to($('.cl',r),{opacity:.4,duration:.4},0).to($('.cr2',r),{clipPath:'inset(0 0% 0 0)',duration:.8,ease:'power3.out'},.3);ScrollTrigger.create({trigger:r,start:'top 78%',once:true,onEnter:function(){t.play()}})});
  gsap.from('.pn',{opacity:0,y:60,duration:.9,stagger:.12,scrollTrigger:{trigger:'.ptrack',start:'top 80%',once:true}});
 });
 /* intro */
 var num={v:0},n=$('#ldn'),bar=$('.ld-bar i');
 gsap.set('.hero .pill',{opacity:0});
 var tl=gsap.timeline();
 tl.to(num,{v:100,duration:1.7,ease:'power2.inOut',onUpdate:function(){n.textContent=Math.round(num.v);gsap.set(bar,{scaleX:num.v/100})}})
   .to('#loader .ld-mark,#loader .ld-num,#loader .ld-bar',{opacity:0,y:-20,duration:.4,stagger:.05})
   .to('#loader',{clipPath:'inset(0 0 100% 0)',duration:1,ease:'power4.inOut'},'-=.1')
   .add(function(){done();ScrollTrigger.refresh()})
   .to(heroW,{yPercent:0,duration:1.3,ease:'power4.out',stagger:.09},'-=.55')
   .to('.hero .pill',{opacity:1,scale:1,y:0,duration:.9,ease:'power3.out'},'-=1.1')
   .to('.hero [data-rise]:not(.pill)',{opacity:1,y:0,duration:1,ease:'power3.out',stagger:.15},'-=.8');
}
var go=false;function run(){if(go)return;go=true;start()}
if(d.fonts&&d.fonts.ready){Promise.race([d.fonts.ready,new Promise(function(r){setTimeout(r,1800)})]).then(run)}else run();
setTimeout(function(){if(loader&&!go){run()}},2500);
addEventListener('load',function(){setTimeout(function(){ScrollTrigger.refresh()},300)});
})();

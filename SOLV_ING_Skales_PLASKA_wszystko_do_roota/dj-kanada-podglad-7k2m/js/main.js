
(function(){
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile=window.innerWidth<=860;
  var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){if((window.innerWidth<=860)!==mobile)location.reload()},350)});

  /* split headings into words of letters */
  document.querySelectorAll('.split').forEach(function(el){el.innerHTML=el.textContent.trim().split(' ').map(function(w){return '<span class="w">'+w.split('').map(function(ch){return '<span class="c">'+ch+'</span>'}).join('')+'</span>'}).join(' ')});

  document.querySelectorAll('.copy').forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();var t=b.textContent;function done(){b.textContent='Skopiowano';setTimeout(function(){b.textContent=t},1600)}
    try{navigator.clipboard.writeText(b.dataset.copy).then(done,done)}catch(err){done()}})});

  /* Zajęte terminy – aktualizowane w ramach opieki nad stroną (RRRR-MM-DD) */
  var BUSY=['2026-11-21','2026-11-29','2026-12-30','2026-12-31','2027-04-09','2027-06-05','2027-06-19'];
  var dateEl=document.getElementById('date');dateEl.min=new Date().toISOString().slice(0,10);
  var note=document.getElementById('date-note');
  function plDate(v){var p=v.split('-');return p[2]+'.'+p[1]+'.'+p[0]}
  function checkDate(){var v=dateEl.value;if(!v){note.textContent='';note.className='date-note';return false}
    if(BUSY.indexOf(v)>-1){note.className='date-note busy';note.textContent=plDate(v)+' jest już zajęty. Wyślijcie zapytanie o inną datę albo zadzwońcie.';return true}
    note.className='date-note free';note.textContent=plDate(v)+' wygląda na wolny. Wyślijcie zapytanie, a potwierdzę.';return false}
  dateEl.addEventListener('change',checkDate);dateEl.addEventListener('input',checkDate);
  var f=document.getElementById('request'),m=document.getElementById('form-msg');
  if(/[?&]wyslano=1/.test(location.search)){m.className='form-msg ok';m.textContent='Dziękuję! Zapytanie dotarło. Odezwę się z odpowiedzią.'}
  f.addEventListener('submit',function(e){var miss=[];[['date','datę'],['name','imię'],['phone','telefon']].forEach(function(x){var el=document.getElementById(x[0]);if(!el.value){miss.push(x[1]);el.setAttribute('aria-invalid','true')}else el.removeAttribute('aria-invalid')});
    if(miss.length){e.preventDefault();m.className='form-msg err';m.textContent='Uzupełnijcie: '+miss.join(', ')+'.';return}
    if(f.dataset.live!=='1'){e.preventDefault();m.className='form-msg ok';m.textContent='Dziękuję! Odezwę się z odpowiedzią. (W wersji do akceptacji nic nie zostało wysłane.)';return}
    var nx=f.querySelector('[name=_next]');nx.value=location.origin+location.pathname+'?wyslano=1#rezerwacja';
    m.className='form-msg';m.textContent='Wysyłam…'});

  var env=document.querySelector('.env');
  var envTl=null,envOpen=false;
  function toggleEnv(){envOpen=!envOpen;env.setAttribute('aria-label',envOpen?'Zamknij kopertę':'Otwórz kopertę z kontaktem');
    if(envTl){envOpen?envTl.timeScale(1).play():envTl.timeScale(1.25).reverse()}else env.classList.toggle('open',envOpen)}
  env.addEventListener('click',toggleEnv);env.addEventListener('keydown',function(e){if(e.target===env&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggleEnv()}});

  document.querySelectorAll('.q').forEach(function(q){var b=q.querySelector('button'),a=q.querySelector('.a');
    b.addEventListener('click',function(){var open=!q.classList.contains('open');
      document.querySelectorAll('.q.open').forEach(function(o){if(o!==q){o.classList.remove('open');o.querySelector('button').setAttribute('aria-expanded','false');window.gsap?gsap.to(o.querySelector('.a'),{height:0,duration:.5,ease:'power3.inOut'}):o.querySelector('.a').style.height='0'}});
      q.classList.toggle('open',open);b.setAttribute('aria-expanded',open);
      if(window.gsap){gsap.to(a,{height:open?a.scrollHeight:0,duration:.6,ease:'power3.inOut',onComplete:function(){if(open)a.style.height='auto';ScrollTrigger.refresh()}})}else a.style.height=open?'auto':'0';
      if(open&&window.gsap)gsap.from(a.querySelector('p'),{y:16,autoAlpha:0,duration:.6,delay:.1});});});

  if(reduce||!window.gsap){document.body.classList.remove('locked');document.querySelector('.bg.velvet').style.opacity=1;window.gsap&&gsap.set('.brand,.nav .book',{opacity:1});return;}
  gsap.registerPlugin(ScrollTrigger);
  env.classList.add('js-anim');
  gsap.set('.env .letter',{autoAlpha:0});
  envTl=gsap.timeline({paused:true})
    .to('.env .seal',{opacity:0,duration:.15},0).to('.env .tap',{opacity:0,duration:.2},0)
    .to('.env .flap',{rotateX:180,duration:.7,ease:'power2.inOut'},0)
    .set('.env .flap',{zIndex:1},.36).set('.env .letter',{autoAlpha:1},.36)
    .to('.env .letter',{yPercent:-90,duration:.9,ease:'power3.out'},.42);

  var lenis=null;
  if(window.Lenis){lenis=new Lenis({duration:1.2,smoothWheel:true});lenis.on('scroll',ScrollTrigger.update);gsap.ticker.add(function(t){lenis.raf(t*1000)});gsap.ticker.lagSmoothing(0);lenis.stop();}
  function goTo(t,off,cb){if(lenis)lenis.scrollTo(t,{duration:1.8,offset:off||0,onComplete:cb});else{window.scrollTo({top:t.getBoundingClientRect().top+scrollY+(off||0),behavior:'smooth'});cb&&setTimeout(cb,900)}}
  document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){var t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();goTo(t,a.getAttribute('href')==='#rezerwacja'?60:-20)}})});
  document.querySelector('.glove').addEventListener('click',function(){var card=document.getElementById('form-card');var off=-Math.max(90,(innerHeight-card.offsetHeight)/2);
    goTo(card,off,function(){dateEl.focus({preventScroll:true});card.classList.remove('pulse');void card.offsetWidth;card.classList.add('pulse')})});

  document.querySelectorAll('.offer').forEach(function(o){var sh=o.querySelector('.in');
    o.addEventListener('mousemove',function(e){var b=o.getBoundingClientRect(),px=(e.clientX-b.left)/b.width,py=(e.clientY-b.top)/b.height;gsap.to(o,{rotateY:(px-.5)*12,rotateX:-(py-.5)*10,duration:.5,ease:'power2.out'});sh.style.setProperty('--mx',px*100+'%');sh.style.setProperty('--my',py*100+'%')});
    o.addEventListener('mouseleave',function(){gsap.to(o,{rotateY:0,rotateX:0,duration:.8,ease:'power3.out'})});});

  /* ---- the stage: cross-fade textures between scenes ---- */
  var bgs={};document.querySelectorAll('.bg').forEach(function(b){bgs[b.dataset.bg]=b});
  var current=null;
  function show(name){if(name===current)return;current=name;
    Object.keys(bgs).forEach(function(k){gsap.to(bgs[k],{opacity:k===name?1:0,scale:k===name?1:1.08,duration:k===name?1.6:1.2,ease:'power2.out',overwrite:'auto'})});}
  gsap.set('.bg',{scale:1.08});
  gsap.to('.stage .bg',{yPercent:-3,ease:'none',scrollTrigger:{trigger:document.body,start:'top top',end:'bottom bottom',scrub:true}});

  var leaf=document.querySelector('.leaf'),rec=document.querySelector('.record'),actor=document.querySelector('.actor'),glow=document.querySelector('.glow');
  var lines=gsap.utils.toArray('.line');
  gsap.set(actor,{xPercent:-50,yPercent:-50});gsap.set('.ph',{xPercent:-50,yPercent:-50,scale:.2});
  gsap.set(lines,{autoAlpha:0});
  lines.forEach(function(l){gsap.set(l.querySelectorAll('.c'),{yPercent:100,rotateX:-90,opacity:0,transformPerspective:600})});
  var restLeft=mobile?'50%':'72%', restTop=mobile?'32%':'50%';

  /* intro */
  gsap.set(leaf,{scale:0,rotate:-540});
  var intro=gsap.timeline({delay:.15});
  intro.to(leaf,{scale:1,rotate:0,duration:2.1,ease:'power3.out'})
    .from('.intro-name',{y:20,autoAlpha:0,duration:.8},.4)
    .to('.intro-name',{autoAlpha:0,y:-10,duration:.5},1.9)
    .to('.fbg.velvet',{opacity:1,duration:1.4},1.8)
    .to(actor,{left:restLeft,top:restTop,duration:1.4,ease:'power3.inOut'},1.9)
    .to('.brand,.nav .book',{opacity:1,duration:.8},2.5)
    .set(lines[0],{autoAlpha:1},2.4)
    .to(lines[0].querySelectorAll('.c'),{yPercent:0,rotateX:0,opacity:1,duration:.9,ease:'power3.out',stagger:.025},2.45)
    .from(lines[0].querySelector('.kick'),{letterSpacing:'1em',autoAlpha:0,duration:1.2,ease:'power3.out'},2.5)
    .add(function(){document.body.classList.remove('locked');if(lenis)lenis.start();build();},3.3);
  gsap.to(glow,{scale:1.7,opacity:.75,duration:2.4,ease:'sine.inOut',yoyo:true,repeat:-1});
  gsap.to(leaf,{y:-12,duration:2.6,ease:'sine.inOut',yoyo:true,repeat:-1,delay:2.2});

  function build(){
    var tl=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{trigger:'.film-pin',start:'top top',end:'+='+(mobile?380:440)+'%',pin:true,scrub:.8,
      onUpdate:function(s){var k=s.progress*5;document.querySelectorAll('.progress b').forEach(function(b,i){gsap.set(b,{scaleX:gsap.utils.clamp(0,1,k-i)})})}}});
    function out(l,at){tl.to(l.querySelectorAll('.c,.big40 b,.big40 span'),{yPercent:-100,rotateX:90,opacity:0,duration:.3,stagger:.008,ease:'power2.in'},at)
        .to(l.querySelectorAll('.kick,p:not(.kick),.sig'),{y:-30,autoAlpha:0,duration:.3,ease:'power2.in'},at)
        .set(l,{autoAlpha:0},at+.42);}
    function inn(l,at){tl.set(l,{autoAlpha:1},at)
        .to(l.querySelectorAll('.c'),{yPercent:0,rotateX:0,opacity:1,duration:.4,stagger:.012,ease:'power3.out'},at+.03)
        .fromTo(l.querySelector('.kick'),{letterSpacing:'0.9em',autoAlpha:0},{letterSpacing:'0.34em',autoAlpha:1,duration:.45,ease:'power2.out'},at)
        .from(l.querySelectorAll('p:not(.kick),.sig'),{y:34,autoAlpha:0,duration:.4,stagger:.06,ease:'power2.out'},at+.12);}
    tl.fromTo('.fbg',{scale:1},{scale:1.1,duration:5},0);
    out(lines[0],.05);inn(lines[1],.47);
    tl.to(leaf,{rotate:-24,scale:1.08,duration:1},0);
    out(lines[1],1.05);inn(lines[2],1.47);
    tl.to(leaf,{rotate:18,duration:1},1)
    if(mobile){tl.to('.fbg.velvet',{opacity:0,duration:.6},1.1).to('.fbg.hero',{opacity:1,duration:.7},1.1).to(actor,{top:'22%',scale:.7,duration:.8,ease:'power2.inOut'},1.05);}
    else{tl.to(actor,{left:'50%',top:'18%',scale:.28,duration:.7,ease:'power2.inOut'},1.05)
      .fromTo('.hero-arch',{yPercent:-38,opacity:0,clipPath:'inset(100% 0 0 0 round 999px 999px 6px 6px)'},{yPercent:-50,opacity:1,clipPath:'inset(0% 0 0 0 round 999px 999px 6px 6px)',duration:.8,ease:'power2.out'},1.2)
      .fromTo('.hero-arch img',{scale:1.25},{scale:1,duration:1.6},1.2)
      .to('.hero-arch',{yPercent:-62,opacity:0,duration:.5,ease:'power2.in'},2.05)
      .to(actor,{left:'72%',top:'50%',scale:1,duration:.7,ease:'power2.inOut'},2.1);}
    out(lines[2],2.05);inn(lines[3],2.47);
    tl.from(lines[3].querySelector('.big40 b'),{yPercent:60,scale:.6,autoAlpha:0,duration:.5,ease:'back.out(1.6)'},2.5)
      .from(lines[3].querySelector('.big40 span'),{x:-30,autoAlpha:0,duration:.4},2.6)
      .to(leaf,{rotate:'+=360',scale:.3,autoAlpha:0,duration:.9,ease:'power2.inOut'},2.05)
      .to(rec,{scale:1,rotate:300,duration:.9,ease:'power2.inOut'},2.05)
      .to(rec,{rotate:'+=420',duration:2.95},2.95);
    tl.to(lines[3],{autoAlpha:0,x:-40,duration:.45,ease:'power2.in'},3.1)
      .to(actor,{left:'50%',top:mobile?'50%':'56%',scale:mobile?.62:.5,duration:.8,ease:'power2.inOut'},3.25)
      .to(mobile?'.fbg.hero':'.fbg.velvet',{opacity:.3,duration:.8},3.25)
      .to('.gal-title',{opacity:1,duration:.5},3.55).from('.gal-title',{y:30,duration:.5},3.55);
    var ph=gsap.utils.toArray('.ph');
    var mpos=[[-25,-8],[25,-8],[-25,24],[25,24],[0,8]];
    ph.forEach(function(p,i){var x=mobile?mpos[i][0]:+p.dataset.x,y=mobile?mpos[i][1]:+p.dataset.y,last=i===ph.length-1;
      tl.to(p,{opacity:1,scale:1,left:(50+x)+'%',top:(56+y)+'%',rotate:+p.dataset.r,duration:.55,ease:'back.out(1.4)'},last?4.5:3.95+i*.14);});
    tl.to(actor,{scale:0,autoAlpha:0,duration:.35,ease:'power2.in'},4.45).to({},{duration:.25},4.95);

    /* scenes switch the stage */
    document.querySelectorAll('[data-scene]').forEach(function(s){ScrollTrigger.create({trigger:s,start:'top 55%',end:'bottom 45%',onEnter:function(){show(s.dataset.scene)},onEnterBack:function(){show(s.dataset.scene)}})});
    ScrollTrigger.create({trigger:'#rezerwacja',start:'top 55%',onLeaveBack:function(){show(null)}});

    /* letter reveal for section headings */
    gsap.utils.toArray('section .split').forEach(function(h){gsap.from(h.querySelectorAll('.c'),{yPercent:100,rotateX:-90,opacity:0,transformPerspective:600,duration:.9,stagger:.022,ease:'power3.out',scrollTrigger:{trigger:h,start:'top 85%'}})});
    gsap.utils.toArray('.head .script,.b-copy .script,.about .years,.final-in .years').forEach(function(s){gsap.from(s,{clipPath:'inset(0 100% 0 0)',x:-20,duration:1.4,ease:'power2.out',scrollTrigger:{trigger:s,start:'top 85%'}})});
    gsap.utils.toArray('section .kick').forEach(function(k){gsap.fromTo(k,{letterSpacing:'0.9em',autoAlpha:0},{letterSpacing:'0.34em',autoAlpha:1,duration:1.2,ease:'power3.out',scrollTrigger:{trigger:k,start:'top 88%'}})});

    gsap.fromTo('.glove',{y:160,rotate:-8,scale:.82},{y:0,rotate:0,scale:1,ease:'none',clearProps:'transform',scrollTrigger:{trigger:'#rezerwacja',start:'top bottom',end:'top 15%',scrub:1}});
    gsap.fromTo('.card',{x:mobile?0:120,y:mobile?60:0},{x:0,y:0,ease:'none',scrollTrigger:{trigger:'#rezerwacja',start:'top 85%',end:'center 60%',scrub:1}});
    gsap.from('.glove .mover',{yPercent:30,ease:'none',scrollTrigger:{trigger:'#rezerwacja',start:'top bottom',end:'center center',scrub:1}});
    gsap.from('.b-copy .lead,.phone',{y:30,autoAlpha:0,duration:1,stagger:.12,ease:'power3.out',scrollTrigger:{trigger:'#rezerwacja',start:'top 60%'}});
    gsap.from('.card',{autoAlpha:0,duration:1.2,ease:'power2.out',scrollTrigger:{trigger:'.card',start:'top 92%'}});

    /* moments light up under the spotlight */
    gsap.utils.toArray('.moments li').forEach(function(li){
      gsap.timeline({scrollTrigger:{trigger:li,start:'top 78%',end:'bottom 30%',scrub:true}})
        .to(li,{color:'#ecd3a0',textShadow:'0 0 40px rgba(236,211,160,.45)',x:mobile?0:24,duration:1})
        .to(li,{color:'rgba(243,233,216,.32)',textShadow:'0 0 0 rgba(0,0,0,0)',x:0,duration:1});});
    gsap.from('.spot-note',{y:40,autoAlpha:0,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:'.spot-note',start:'top 88%'}});

    /* 18 / 50: cards swing in, the big numbers count up */
    gsap.utils.toArray('.pcard').forEach(function(c,i){
      gsap.fromTo(c,{y:110,rotateY:mobile?0:(i?-22:22),rotateX:mobile?-24:8,autoAlpha:0},{y:0,rotateY:0,rotateX:0,autoAlpha:1,ease:'none',clearProps:'transform',scrollTrigger:{trigger:c,start:'top 98%',end:'top 55%',scrub:1}});
      var n=c.querySelector('.num'),o={v:0};n.textContent='0';
      gsap.to(o,{v:+n.dataset.n,duration:1.6,ease:'power2.out',onUpdate:function(){n.textContent=Math.round(o.v)},scrollTrigger:{trigger:c,start:'top 70%'}});
      gsap.fromTo(n,{yPercent:30},{yPercent:-12,ease:'none',scrollTrigger:{trigger:c,start:'top bottom',end:'bottom top',scrub:true}});
      gsap.from(c.querySelectorAll('li'),{x:-30,autoAlpha:0,duration:.7,stagger:.1,ease:'power3.out',scrollTrigger:{trigger:c.querySelector('ol'),start:'top 85%'}});
    });

    gsap.utils.toArray('.arch').forEach(function(a){gsap.from(a,{clipPath:'inset(100% 0 0 0 round 230px 230px 6px 6px)',duration:1.6,ease:'power4.inOut',scrollTrigger:{trigger:a,start:'top 80%'}});
      gsap.fromTo(a.querySelector('img'),{yPercent:-10},{yPercent:0,ease:'none',scrollTrigger:{trigger:a,start:'top bottom',end:'bottom top',scrub:true}});
      gsap.fromTo(a,{scale:.78,rotate:-4},{scale:1,rotate:0,ease:'none',scrollTrigger:{trigger:a,start:'top bottom',end:'center 55%',scrub:1}});});
    gsap.fromTo('.emboss',{yPercent:-30,autoAlpha:0},{yPercent:-70,autoAlpha:1,ease:'none',scrollTrigger:{trigger:'#o-mnie',start:'top bottom',end:'bottom top',scrub:true}});
    gsap.from('#o-mnie h2,#o-mnie p',{y:40,autoAlpha:0,duration:1,stagger:.12,ease:'power3.out',scrollTrigger:{trigger:'.about',start:'top 70%'}});

    if(!mobile){
      var wt=gsap.timeline({scrollTrigger:{trigger:'.why-pin',start:'top 7%',end:'+=110%',pin:true,scrub:.8}});
      gsap.utils.toArray('.why article').forEach(function(a,i){wt.fromTo(a,{z:-700,rotateX:35,rotateY:i%2?-25:25,autoAlpha:0},{z:0,rotateX:0,rotateY:0,autoAlpha:1,duration:1,ease:'power2.out',clearProps:'transform'},i*.55)});
      wt.to({},{duration:.4});
      var ot=gsap.timeline({scrollTrigger:{trigger:'.offer-pin',start:'top 7%',end:'+=100%',pin:true,scrub:.8}});
      gsap.utils.toArray('.offer').forEach(function(o,i){ot.fromTo(o,{rotateY:i?100:-100,y:80,autoAlpha:0},{rotateY:0,y:0,autoAlpha:1,duration:1,ease:'power2.out'},i*.6)});
      ot.to({},{duration:.4});
    }else{
      gsap.utils.toArray('.why article,.offer').forEach(function(a){gsap.fromTo(a,{y:80,rotateX:-30,autoAlpha:0},{y:0,rotateX:0,autoAlpha:1,ease:'none',clearProps:'transform',scrollTrigger:{trigger:a,start:'top 95%',end:'top 65%',scrub:1}})});
    }
    gsap.utils.toArray('.offer .seal').forEach(function(s){gsap.from(s,{rotate:-200,scale:0,duration:1.4,ease:'back.out(1.4)',scrollTrigger:{trigger:s,start:'top 88%'}})});
    gsap.from('.faq',{y:60,autoAlpha:0,duration:1,ease:'power3.out',scrollTrigger:{trigger:'.faq',start:'top 85%'}});


    gsap.from('.env',{y:120,rotate:-8,autoAlpha:0,duration:1.4,ease:'power3.out',scrollTrigger:{trigger:'.contact',start:'top 70%'}});

    var cta=document.querySelector('.sticky');
    ScrollTrigger.create({trigger:'#rezerwacja',start:'top bottom',end:'bottom top',onToggle:function(s){cta.classList.toggle('hide',s.isActive)}});
    ScrollTrigger.create({trigger:'.spot',start:'top bottom',onEnter:function(){cta.classList.remove('hide')}});
    ScrollTrigger.refresh();
  }
})();

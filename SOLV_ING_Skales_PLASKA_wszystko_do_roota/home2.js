(function(){
  var d=document,EN=d.documentElement.lang==='en';
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $$(s,c){return [].slice.call((c||d).querySelectorAll(s))}
  function goTo(y){if(window.__lenis)window.__lenis.scrollTo(y,{duration:1.5});else window.scrollTo({top:y,behavior:reduce?'auto':'smooth'})}

  /* in-page links scroll smoothly (Lenis handles this on desktop) */
  $$('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){
    if(a.hasAttribute('data-jump'))return;var id=a.getAttribute('href').slice(1);var t=id&&d.getElementById(id);
    if(!t||window.__lenis)return;e.preventDefault();goTo(t.getBoundingClientRect().top+scrollY-20)})});

  /* "Wdrożenie i wyniki" card: jump to the end of the process track */
  $$('[data-jump]').forEach(function(a){a.addEventListener('click',function(e){
    var t=d.getElementById('wyniki');if(!t)return;e.preventDefault();e.stopPropagation();
    var proc=d.querySelector('.proc'),st=null;
    if(window.ScrollTrigger&&innerWidth>=900)ScrollTrigger.getAll().forEach(function(s){if(s.pin&&s.trigger===proc)st=s});
    goTo(st?st.end-2:t.getBoundingClientRect().top+scrollY-innerHeight*.18)})});

  /* card slider: side arrows, dots, active card, drag */
  var sl=d.querySelector('.slider');
  if(sl){
    var wrap=sl.parentNode,prev=wrap.querySelector('.sb.prev'),next=wrap.querySelector('.sb.next'),cards=$$('.sl',sl),dots=wrap.querySelector('.sdots');
    cards.forEach(function(c,k){var b=d.createElement('i');b.addEventListener('click',function(){to(k)});dots.appendChild(b)});
    var dl=$$('i',dots);
    function pos(c){return c.getBoundingClientRect().left-sl.getBoundingClientRect().left+sl.scrollLeft-4}
    function cur(){var best=0,bd=1e9;cards.forEach(function(c,k){var dd=Math.abs(pos(c)-sl.scrollLeft);if(dd<bd){bd=dd;best=k}});return best}
    function to(k){k=Math.max(0,Math.min(cards.length-1,k));sl.scrollTo({left:pos(cards[k]),behavior:'smooth'})}
    function upd(){var k=cur();var atEnd=sl.scrollLeft+sl.clientWidth>=sl.scrollWidth-8;
      prev.classList.toggle('off',sl.scrollLeft<8);next.classList.toggle('off',atEnd);
      cards.forEach(function(c,j){c.classList.toggle('act',j===k)});dl.forEach(function(b,j){b.classList.toggle('on',j===k)})}
    prev.addEventListener('click',function(){to(cur()-1)});
    next.addEventListener('click',function(){to(cur()+1);next.classList.add('used')});
    sl.addEventListener('scroll',upd,{passive:true});addEventListener('resize',upd);upd();
    var down=false,sx=0,sl0=0;
    sl.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')return;down=true;sx=e.clientX;sl0=sl.scrollLeft;sl.classList.add('drag')});
    addEventListener('pointermove',function(e){if(down)sl.scrollLeft=sl0-(e.clientX-sx)});
    addEventListener('pointerup',function(){if(!down)return;down=false;sl.classList.remove('drag');to(cur())});
    sl.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();to(cur()+1)}if(e.key==='ArrowLeft'){e.preventDefault();to(cur()-1)}});
    if(window.gsap&&window.ScrollTrigger&&!reduce){
      gsap.from(cards,{x:220,opacity:0,duration:1.1,ease:'power4.out',stagger:.1,clearProps:'transform,opacity',scrollTrigger:{trigger:sl,start:'top 85%',once:true}});
      gsap.from([prev,next],{scale:0,opacity:0,duration:.7,ease:'back.out(2)',delay:.5,clearProps:'transform,opacity',scrollTrigger:{trigger:sl,start:'top 85%',once:true}});
    }
  }

  /* phones have no hover: highlight the card in the middle of the screen */
  if('IntersectionObserver' in window&&(matchMedia('(hover:none)').matches||innerWidth<900)){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('focus',e.isIntersecting)})},{rootMargin:'-40% 0px -40% 0px'});
    $$('.bc,.pn,.chg .row,.cc,.rc').forEach(function(el){io.observe(el)});
  }

  /* step-by-step audit quiz with a start screen */
  var f=d.querySelector('form.quiz');
  if(f){
    var qs=$$('.qs',f),i=0,bar=f.querySelector('.qbar i'),lab=f.querySelector('.qstep');
    var bB=f.querySelector('.qb'),bN=f.querySelector('.qn'),bS=f.querySelector('.qsend'),go=f.querySelector('.qgo');
    var err=d.createElement('p');err.className='qerr';err.setAttribute('role','alert');
    f.classList.add('js');if(go)f.classList.add('intro');
    function show(n,back,focus){qs.forEach(function(q,k){q.classList.toggle('on',k===n);q.classList.toggle('back',!!back)});
      i=n;bar.style.width=((n+1)/qs.length*100)+'%';lab.textContent=(EN?'Question ':'Pytanie ')+(n+1)+(EN?' of ':' z ')+qs.length;
      bB.hidden=(n===0&&!go);bN.hidden=n===qs.length-1;bS.hidden=n!==qs.length-1;err.remove();
      var inp=qs[n].querySelector('input:not([type=checkbox]):not([type=radio]),textarea:not([hidden]),select');
      if(inp&&(n>0||focus))setTimeout(function(){inp.focus({preventScroll:true})},60)}
    function ok(n){var bad=$$('[required]',qs[n]).filter(function(el){return !el.hidden&&!el.checkValidity()});
      if(bad.length){err.textContent=bad[0].type==='email'?(EN?'Please enter a valid email address.':'Wpisz poprawny adres e-mail.'):(EN?'Please fill this in to continue.':'Uzupełnij to pole, żeby przejść dalej.');qs[n].appendChild(err);bad[0].focus();return false}return true}
    if(go)go.addEventListener('click',function(){f.classList.remove('intro');show(0,false,true);var t=f.getBoundingClientRect().top;if(t<70||t>innerHeight*.5)goTo(t+scrollY-90)});
    bN.addEventListener('click',function(){if(ok(i))show(i+1)});
    bB.addEventListener('click',function(){if(i===0&&go){f.classList.add('intro');err.remove();return}show(i-1,true)});
    f.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.tagName==='INPUT'&&i<qs.length-1){e.preventDefault();if(ok(i))show(i+1)}});
    qs.forEach(function(q,k){$$('.chips.one input',q).forEach(function(r){r.addEventListener('change',function(){setTimeout(function(){if(i===k&&k<qs.length-1)show(k+1)},280)})})});
    $$('.other-t',f).forEach(function(cb){var ta=cb.closest('.qs').querySelector('textarea.other');cb.addEventListener('change',function(){ta.hidden=!cb.checked;ta.required=cb.checked;if(cb.checked)setTimeout(function(){ta.focus()},40)})});
    f.addEventListener('submit',function(e){for(var n=0;n<qs.length;n++){if(!ok(n)){e.preventDefault();f.classList.remove('intro');show(n);ok(n);return}}
      var cel=$$('input[name=cel]:checked',f).map(function(x){return x.value}).join(', ');
      $$('input[name=cel]',f).forEach(function(x){x.disabled=true});
      var h=d.createElement('input');h.type='hidden';h.name='cel';h.value=cel||(EN?'(none selected)':'(nie wybrano)');f.appendChild(h)});
    show(0);
  }

  /* footer: more stars + wave easter egg on the wordmark */
  var foot=d.querySelector('.foot'),wm=d.querySelector('.wm');
  if(foot&&wm){
    var STAR='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c.6 6.6 5.4 11.4 12 12-6.6.6-11.4 5.4-12 12-.6-6.6-5.4-11.4-12-12 6.6-.6 11.4-5.4 12-12z"/></svg>';
    var P=[[3,10,14],[15,24,9],[24,6,18],[33,30,8],[44,12,12],[52,2,7],[61,26,10],[70,8,16],[79,30,8],[88,14,11],[95,40,9],[6,44,10],[40,44,7],[66,46,9],[20,2,6],[84,2,7]];
    P.forEach(function(p,k){var s=d.createElement('span');s.className='tw';s.innerHTML=STAR;s.style.left=p[0]+'%';s.style.top=p[1]+'%';s.style.width=p[2]+'px';s.style.animationDelay=(-k*.37)+'s';s.setAttribute('aria-hidden','true');foot.appendChild(s)});
    wm.addEventListener('click',function(e){
      wm.classList.remove('wave');void wm.offsetWidth;wm.classList.add('wave');foot.classList.add('party');
      clearTimeout(wm._t);wm._t=setTimeout(function(){wm.classList.remove('wave');foot.classList.remove('party')},1800);
      if(reduce)return;var r=foot.getBoundingClientRect();
      for(var k=0;k<14;k++){var s=d.createElement('span');s.className='burst';s.innerHTML=STAR;var a=Math.random()*6.283,dist=80+Math.random()*160;
        s.style.left=(e.clientX-r.left)+'px';s.style.top=(e.clientY-r.top)+'px';s.style.setProperty('--dx',Math.cos(a)*dist+'px');s.style.setProperty('--dy',Math.sin(a)*dist-60+'px');s.style.width=(8+Math.random()*14)+'px';
        foot.appendChild(s);setTimeout(function(x){return function(){x.remove()}}(s),1300)}
    });
  }
})();

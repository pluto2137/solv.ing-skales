(function(){
  // horizontal slider with buttons + drag
  var sl=document.querySelector('.slider');
  if(sl){
    var prev=document.querySelector('.sb.prev'),next=document.querySelector('.sb.next');
    function step(){var c=sl.querySelector('.sl');return c?c.getBoundingClientRect().width+18:300}
    function upd(){prev.disabled=sl.scrollLeft<8;next.disabled=sl.scrollLeft+sl.clientWidth>=sl.scrollWidth-8}
    prev.addEventListener('click',function(){sl.scrollBy({left:-step(),behavior:'smooth'})});
    next.addEventListener('click',function(){sl.scrollBy({left:step(),behavior:'smooth'})});
    sl.addEventListener('scroll',upd,{passive:true});window.addEventListener('resize',upd);upd();
    var down=false,sx=0,sl0=0,moved=false;
    sl.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')return;down=true;moved=false;sx=e.clientX;sl0=sl.scrollLeft;sl.classList.add('drag')});
    window.addEventListener('pointermove',function(e){if(!down)return;var dx=e.clientX-sx;if(Math.abs(dx)>4)moved=true;sl.scrollLeft=sl0-dx});
    window.addEventListener('pointerup',function(){if(!down)return;down=false;sl.classList.remove('drag');var s=step();sl.scrollTo({left:Math.round(sl.scrollLeft/s)*s,behavior:'smooth'})});
    // cards fly in from the right
    if(window.gsap&&window.ScrollTrigger&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      gsap.from(sl.querySelectorAll('.sl'),{x:260,opacity:0,rotate:4,duration:1.1,ease:'power4.out',stagger:.12,scrollTrigger:{trigger:sl,start:'top 85%',once:true}});
    }
  }
  // step-by-step audit quiz
  var f=document.querySelector('form.quiz');
  if(f){
    var qs=[].slice.call(f.querySelectorAll('.qs')),i=0,bar=f.querySelector('.qbar i'),lab=f.querySelector('.qstep');
    var bB=f.querySelector('.qb'),bN=f.querySelector('.qn'),bS=f.querySelector('.qsend');
    var err=document.createElement('p');err.className='qerr';err.setAttribute('role','alert');
    f.classList.add('js');
    function show(n,back){qs.forEach(function(q,k){q.classList.toggle('on',k===n);q.classList.toggle('back',!!back)});
      i=n;bar.style.width=((n+1)/qs.length*100)+'%';lab.textContent='Pytanie '+(n+1)+' z '+qs.length;
      bB.hidden=n===0;bN.hidden=n===qs.length-1;bS.hidden=n!==qs.length-1;err.remove();
      var inp=qs[n].querySelector('input:not([type=checkbox]):not([type=radio]),select');if(inp&&n>0)setTimeout(function(){inp.focus({preventScroll:true})},60)}
    function ok(n){var bad=[].slice.call(qs[n].querySelectorAll('[required]')).filter(function(el){return !el.checkValidity()});
      if(bad.length){err.textContent=bad[0].type==='email'?'Wpisz poprawny adres e-mail.':'Uzupełnij to pole, żeby przejść dalej.';qs[n].appendChild(err);bad[0].focus();return false}return true}
    bN.addEventListener('click',function(){if(ok(i))show(i+1)});
    bB.addEventListener('click',function(){show(i-1,true)});
    f.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.tagName==='INPUT'&&i<qs.length-1){e.preventDefault();if(ok(i))show(i+1)}});
    qs.forEach(function(q,k){q.querySelectorAll('.chips.one input').forEach(function(r){r.addEventListener('change',function(){setTimeout(function(){if(i===k&&k<qs.length-1)show(k+1)},280)})})});
    f.addEventListener('submit',function(e){for(var n=0;n<qs.length;n++){if(!ok(n)){e.preventDefault();show(n);ok(n);return}}
      // send checked goals as one field
      var cel=[].slice.call(f.querySelectorAll('input[name=cel]:checked')).map(function(x){return x.value}).join(', ');
      f.querySelectorAll('input[name=cel]').forEach(function(x){x.disabled=true});
      var h=document.createElement('input');h.type='hidden';h.name='cel';h.value=cel||'(nie wybrano)';f.appendChild(h)});
    show(0);
  }
})();

(function(){
  var d=document;d.documentElement.classList.add('js');
  var els=[].slice.call(d.querySelectorAll('[data-r]'));
  if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var el=e.target,sib=[].slice.call(el.parentNode.children).filter(function(x){return x.hasAttribute('data-r')});el.style.transitionDelay=Math.min(sib.indexOf(el),5)*90+'ms';el.classList.add('in');io.unobserve(el)}})},{rootMargin:'0px 0px -8% 0px'});
  els.forEach(function(e){io.observe(e)});
  // cursor glow on cards
  [].slice.call(d.querySelectorAll('.pc,.cz')).forEach(function(c){c.addEventListener('pointermove',function(ev){var r=c.getBoundingClientRect();c.style.setProperty('--mx',(ev.clientX-r.left)+'px');c.style.setProperty('--my',(ev.clientY-r.top)+'px')})});
  // phones: highlight the card in the middle of the screen
  if(matchMedia('(hover:none)').matches||innerWidth<900){var fo=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('focus',e.isIntersecting)})},{rootMargin:'-40% 0px -40% 0px'});[].slice.call(d.querySelectorAll('.pc,.cz,.rl')).forEach(function(c){fo.observe(c)})}
})();

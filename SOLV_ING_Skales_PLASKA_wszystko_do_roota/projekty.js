(function(){
var els=[].slice.call(document.querySelectorAll('[data-r]'));
if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('on')})}
else{var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('on');io.unobserve(x.target)}})},{rootMargin:'0px 0px -8% 0px'});els.forEach(function(e){io.observe(e)})}
/* filmy z dzwiekiem: start po kliknieciu (nigdy sam), jeden film naraz, pauza po wyjsciu z ekranu */
var films=[].slice.call(document.querySelectorAll('[data-film]'));
function reset(box,v){v.pause();v.controls=false;v.removeAttribute('src');v.load();box.classList.remove('on')}
films.forEach(function(box){
  var v=box.querySelector('video'),b=box.querySelector('.play');if(!v||!b)return;
  b.addEventListener('click',function(){
    films.forEach(function(o){if(o!==box){var ov=o.querySelector('video');if(ov&&ov.getAttribute('src'))reset(o,ov)}});
    v.setAttribute('src',v.getAttribute('data-src'));v.muted=false;v.controls=true;box.classList.add('on');
    var p=v.play();if(p&&p.catch)p.catch(function(){reset(box,v)});
  });
  v.addEventListener('ended',function(){reset(box,v)});
  if('IntersectionObserver' in window){new IntersectionObserver(function(en){en.forEach(function(x){if(!x.isIntersecting&&v.getAttribute('src')&&!v.paused&&!document.fullscreenElement&&!document.webkitFullscreenElement){v.pause()}})},{threshold:0}).observe(box)}
});
})();

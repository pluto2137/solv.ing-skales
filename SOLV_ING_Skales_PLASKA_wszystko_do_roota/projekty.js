(function(){
var els=[].slice.call(document.querySelectorAll('[data-r]'));
if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('on')})}
else{var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('on');io.unobserve(x.target)}})},{rootMargin:'0px 0px -8% 0px'});els.forEach(function(e){io.observe(e)})}
/* filmy: ladowane dopiero przy przewinieciu; dodaj data-src="/demo-xxx.mp4" do <video>, zeby wlaczyc */
[].slice.call(document.querySelectorAll('.demo video')).forEach(function(v){
  var src=v.getAttribute('data-src');if(!src)return;
  var btn=v.parentNode.querySelector('.snd');
  var o=new IntersectionObserver(function(en){en.forEach(function(x){
    if(x.isIntersecting){if(!v.getAttribute('src'))v.setAttribute('src',src);var p=v.play();if(p&&p.catch)p.catch(function(){})}else{v.pause()}
  })},{rootMargin:'200px'});o.observe(v);
  if(btn){btn.hidden=false;btn.addEventListener('click',function(){v.muted=!v.muted;btn.textContent=v.muted?'Włącz dźwięk':'Wyłącz dźwięk';if(!v.muted){var p=v.play();if(p&&p.catch)p.catch(function(){})}})}
});
})();

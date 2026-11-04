/* Live blue light backgrounds (silk + liquid chrome). Falls back to the static image. */
(function(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var els=[].slice.call(document.querySelectorAll('.bgimg'));if(!els.length)return;
  var VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var COMMON='precision mediump float;uniform vec2 R;uniform float T;'+
   'vec3 ramp(float v){v=clamp(v,0.,1.);vec3 a=vec3(.008,.016,.06),b=vec3(.02,.055,.27),c=vec3(.08,.2,.78),d=vec3(.17,.37,1.),e=vec3(.55,.67,1.),f=vec3(.94,.96,1.);'+
   'if(v<.25)return mix(a,b,v/.25);if(v<.5)return mix(b,c,(v-.25)/.25);if(v<.72)return mix(c,d,(v-.5)/.22);if(v<.88)return mix(d,e,(v-.72)/.16);return mix(e,f,(v-.88)/.12);}'+
   'float h(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}'+
   'float n(vec2 x){vec2 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}'+
   'float fbm(vec2 x){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n(x);x=x*2.03+vec2(1.7,9.2);a*=.5;}return s;}'+
   'float fb3(vec2 x){float s=0.,a=.55;for(int i=0;i<3;i++){s+=a*n(x);x=x*1.9+vec2(1.7,9.2);a*=.45;}return s;}'+
   'float gr(vec2 c){return h(c+fract(T*7.))-.5;}';
  var FS={
   silk:COMMON+'void main(){vec2 uv=gl_FragCoord.xy/R;float y=1.-uv.y,x=uv.x,t=T*.25,v=0.;'+
    'for(int k=0;k<3;k++){float fk=float(k);float base=.62+.08*fk-.14*step(1.5,fk);float amp=.12-.015*fk;float ph=.4+.9*fk;float g=1.-.3*fk-.15*step(1.5,fk);'+
    'float cx=base+amp*sin(y*3.1+ph+t*(1.+.3*fk))+.06*sin(y*7.3+ph*2.+t*1.7);float d=x-cx;float w=mix(.004+.002*fk,.05-.015*fk,pow(y,1.6));'+
    'float core=exp(-(d/w)*(d/w));float glow=.5*exp(-(d/(w*5.))*(d/(w*5.)));float fill=d<0.?exp(d/.35)*pow(y,1.6)*1.1:0.;v+=g*(core+glow*.6+fill*.8);}'+
    'v=clamp(v*.75,0.,1.);vec3 col=ramp(pow(v,1.1))+gr(gl_FragCoord.xy)*.025*(.3+v);gl_FragColor=vec4(col,1.);}',
   liquid:COMMON+'float H(vec2 p){float t=T*.07;vec2 q=vec2(fb3(p+vec2(0.,t)),fb3(p+vec2(5.2,1.3)-t));vec2 r=vec2(fb3(p+2.2*q+vec2(1.7,9.2)+t*.6),fb3(p+2.2*q+vec2(8.3,2.8)));return fb3(p+2.*r);}'+
    'void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=vec2(uv.x*R.x/R.y,uv.y)*1.05;float e=.006;float c=H(p);float dx=H(p+vec2(e,0.))-c,dy=H(p+vec2(0.,e))-c;'+
    'vec3 N=normalize(vec3(-dx/e*.5,-dy/e*.5,1.));vec3 L=normalize(vec3(-.45,.55,.7));float df=max(dot(N,L),0.);vec3 Hh=normalize(L+vec3(0,0,1));float sd=max(dot(N,Hh),0.);'+
    'float sp=pow(sd,80.)+.35*pow(sd,12.);float fr=pow(1.-N.z,2.);float v=.08+.45*df*df*df+.9*sp+.35*fr;'+
    'float vig=clamp(.35+.9*pow(uv.x,1.2)*(.6+.4*(1.-uv.y)),0.,1.);v=clamp(v*vig,0.,1.);gl_FragColor=vec4(ramp(v)+gr(gl_FragCoord.xy)*.02,1.);}'
  };
  els.forEach(function(el){
    var mode=el.classList.contains('liquid')?'liquid':'silk';
    var cv=document.createElement('canvas');var gl=cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'});if(!gl)return;
    function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return gl.getShaderParameter(o,gl.COMPILE_STATUS)?o:null}
    var v=sh(gl.VERTEX_SHADER,VS),f=sh(gl.FRAGMENT_SHADER,FS[mode]);if(!v||!f)return;
    var pr=gl.createProgram();gl.attachShader(pr,v);gl.attachShader(pr,f);gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return;
    gl.useProgram(pr);var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    var uR=gl.getUniformLocation(pr,'R'),uT=gl.getUniformLocation(pr,'T');
    el.appendChild(cv);el.classList.add('live');
    var small=innerWidth<900;var scale=mode==='liquid'?(small?.3:.4):(small?.4:.55),run=false,t0=performance.now()-Math.random()*20000;
    function size(){var w=Math.max(1,Math.round(el.clientWidth*scale)),hh=Math.max(1,Math.round(el.clientHeight*scale));if(cv.width!==w||cv.height!==hh){cv.width=w;cv.height=hh;gl.viewport(0,0,w,hh)}}
    var last=0,acc=0,cnt=0,minDt=mode==='liquid'?30:16;function frame(now){if(!run)return;if(now-last<minDt){requestAnimationFrame(frame);return}var dt=now-last;last=now;if(dt<200){acc+=dt;cnt++}if(cnt>=30){if(acc/cnt>55&&scale>.22){scale*=.75}acc=0;cnt=0}size();gl.uniform2f(uR,cv.width,cv.height);gl.uniform1f(uT,(now-t0)/1000);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);requestAnimationFrame(frame)}
    var seen=false;function go(){var on=seen&&!document.hidden;if(on&&!run){run=true;requestAnimationFrame(frame)}else if(!on)run=false}
    new IntersectionObserver(function(es){seen=es[0].isIntersecting;go()},{rootMargin:'100px'}).observe(el);
    document.addEventListener('visibilitychange',go);
  });
})();

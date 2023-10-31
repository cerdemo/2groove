window.addEventListener("load",()=>{let e=window.inputKnobsOptions||{};e.knobWidth=e.knobWidth||e.knobDiameter||64,e.knobHeight=e.knobHeight||e.knobDiameter||64,e.sliderWidth=e.sliderWidth||e.sliderDiameter||128,e.sliderHeight=e.sliderHeight||e.sliderDiameter||20,e.switchWidth=e.switchWidth||e.switchDiameter||24,e.switchHeight=e.switchHeight||e.switchDiameter||24,e.fgcolor=e.fgcolor||"#f00",e.bgcolor=e.bgcolor||"#000",e.knobMode=e.knobMode||"linear",e.sliderMode=e.sliderMode||"relative";let t=document.createElement("style");t.innerHTML=`input[type=range].input-knob,input[type=range].input-slider{
    -webkit-appearance:none;
    -moz-appearance:none;
    border:none;
    box-sizing:border-box;
    overflow:hidden;
    background-repeat:no-repeat;
    background-size:100% 100%;
    background-position:0px 0%;
    background-color:transparent;
    touch-action:none;
  }
  input[type=range].input-knob{
    width:${e.knobWidth}px; height:${e.knobHeight}px;
  }
  input[type=range].input-slider{
    width:${e.sliderWidth}px; height:${e.sliderHeight}px;
  }
  input[type=range].input-knob::-webkit-slider-thumb,input[type=range].input-slider::-webkit-slider-thumb{
    -webkit-appearance:none;
    opacity:0;
  }
  input[type=range].input-knob::-moz-range-thumb,input[type=range].input-slider::-moz-range-thumb{
    -moz-appearance:none;
    height:0;
    border:none;
  }
  input[type=range].input-knob::-moz-range-track,input[type=range].input-slider::-moz-range-track{
    -moz-appearance:none;
    height:0;
    border:none;
  }
  input[type=checkbox].input-switch,input[type=radio].input-switch {
    width:${e.switchWidth}px;
    height:${e.switchHeight}px;
    -webkit-appearance:none;
    -moz-appearance:none;
    background-size:100% 200%;
    background-position:0% 0%;
    background-repeat:no-repeat;
    border:none;
    border-radius:0;
    background-color:transparent;
  }
  input[type=checkbox].input-switch:checked,input[type=radio].input-switch:checked {
    background-position:0% 100%;
  }`,document.head.appendChild(t);let n=(e,t,n)=>{let r=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="64" height="${64*e}" viewBox="0 0 64 ${64*e}" preserveAspectRatio="none">
  <defs><g id="K"><circle cx="32" cy="32" r="30" fill="${n}"/>
  <line x1="32" y1="28" x2="32" y2="7" stroke-linecap="round" stroke-width="6" stroke="${t}"/></g></defs>
  <use xlink:href="#K" transform="rotate(-135,32,32)"/>`;for(let t=1;t<e;++t)r+=`<use xlink:href="#K" transform="translate(0,${64*t}) rotate(${-135+270*t/e},32,32)"/>`;return r+"</svg>"},r=(e,t,n,r,a)=>{let i=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${r}" height="${e*a}" viewBox="0 0 ${r} ${e*a}" preserveAspectRatio="none">
  <defs><g id="B"><rect x="0" y="0" width="${r}" height="${a}" rx="${a/2}" ry="${a/2}" fill="${n}"/></g>
  <g id="K"><circle x="${r/2}" y="0" r="${a/2*.9}" fill="${t}"/></g></defs>`;for(let t=0;t<e;++t)i+=`<use xlink:href="#B" transform="translate(0,${a*t})"/><use xlink:href="#K" transform="translate(${a/2+(r-a)*t/100},${a/2+a*t})"/>`;return i+"</svg>"},a=(e,t,n,r,a)=>{let i=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${r}" height="${e*a}" viewBox="0 0 ${r} ${e*a}" preserveAspectRatio="none">
  <defs><rect id="B" x="0" y="0" width="${r}" height="${a}" rx="${r/2}" ry="${r/2}" fill="${n}"/>
  <circle id="K" x="0" y="0" r="${r/2*.9}" fill="${t}"/></defs>`;for(let t=0;t<e;++t)i+=`<use xlink:href="#B" transform="translate(0,${a*t})"/><use xlink:href="#K" transform="translate(${r/2} ${a*(t+1)-r/2-t*(a-r)/100})"/>`;return i+"</svg>"},i=t=>{let n,r,a,i,o;t.inputKnobs||(t.inputKnobs={},t.refresh=()=>{let s=t.getAttribute("data-src");a=+t.getAttribute("data-diameter");let l=document.defaultView.getComputedStyle(t,null);if(n=parseFloat(t.getAttribute("data-width")||a||l.width),r=parseFloat(t.getAttribute("data-height")||a||l.height),o=t.getAttribute("data-bgcolor")||e.bgcolor,i=t.getAttribute("data-fgcolor")||e.fgcolor,t.style.width=n+"px",t.style.height=r+"px",s)t.style.backgroundImage="url("+s+")";else{let e=Math.min(n,r),a=`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${2*r}" viewBox="0 0 ${n} ${2*r}" preserveAspectRatio="none">
  <g><rect fill="${o}" x="1" y="1" width="${n-2}" height="${r-2}" rx="${.25*e}" ry="${.25*e}"/>
  <rect fill="${o}" x="1" y="${r+1}" width="${n-2}" height="${r-2}" rx="${.25*e}" ry="${.25*e}"/>
  <circle fill="${i}" cx="${.5*n}" cy="${1.5*r}" r="${.25*e}"/></g></svg>`;t.style.backgroundImage="url(data:image/svg+xml;base64,"+btoa(a)+")"}},t.refresh())},o=t=>{let i,o,s,l,d;if(t.inputKnobs){t.redraw();return}let p=t.inputKnobs={};t.refresh=()=>{s=+t.getAttribute("data-diameter");let u=document.defaultView.getComputedStyle(t,null);i=parseFloat(t.getAttribute("data-width")||s||u.width),o=parseFloat(t.getAttribute("data-height")||s||u.height),d=t.getAttribute("data-bgcolor")||e.bgcolor,l=t.getAttribute("data-fgcolor")||e.fgcolor,p.sensex=p.sensey=200,t.className.indexOf("input-knob")>=0?p.itype="k":i>=o?(p.itype="h",p.sensex=i-o,p.sensey=1/0,t.style.backgroundSize="auto 100%"):(p.itype="v",p.sensex=1/0,p.sensey=o-i,t.style.backgroundSize="100% auto"),t.style.width=i+"px",t.style.height=o+"px",p.frameheight=o;let g=t.getAttribute("data-src");if(g){t.style.backgroundImage=`url(${g})`;let e=+t.getAttribute("data-sprites");e?p.sprites=e:p.sprites=0,p.sprites>=1?t.style.backgroundSize=`100% ${(p.sprites+1)*100}%`:"k"!=p.itype&&(t.style.backgroundColor=d,t.style.borderRadius=.25*Math.min(i,o)+"px")}else{let e;switch(p.itype){case"k":e=n(101,l,d);break;case"h":e=r(101,l,d,i,o);break;case"v":e=a(101,l,d,i,o)}p.sprites=100,t.style.backgroundImage="url(data:image/svg+xml;base64,"+btoa(e)+")",t.style.backgroundSize=`100% ${(p.sprites+1)*100}%`}p.valrange={min:+t.min,max:""==t.max?100:+t.max,step:""==t.step?1:+t.step},t.redraw(!0)},t.setValue=e=>{if((e=Math.round((e-p.valrange.min)/p.valrange.step)*p.valrange.step+p.valrange.min)<p.valrange.min&&(e=p.valrange.min),e>p.valrange.max&&(e=p.valrange.max),t.value=e,t.value!=p.oldvalue){t.setAttribute("value",t.value),t.redraw();let e=document.createEvent("HTMLEvents");e.initEvent("input",!1,!0),t.dispatchEvent(e),p.oldvalue=t.value}},p.pointerdown=n=>{t.focus();let r=n;n.touches&&(n=n.touches[0]);let a=t.getBoundingClientRect(),i=(a.left+a.right)*.5,o=(a.top+a.bottom)*.5,s=n.clientX,l=n.clientY,d=Math.atan2(n.clientX-i,o-n.clientY);"k"==p.itype&&"circularabs"==e.knobMode&&(dv=p.valrange.min+(d/Math.PI*.75+.5)*(p.valrange.max-p.valrange.min),t.setValue(dv)),"k"!=p.itype&&"abs"==e.sliderMode&&(dv=(p.valrange.min+p.valrange.max)*.5+((s-i)/p.sensex-(l-o)/p.sensey)*(p.valrange.max-p.valrange.min),t.setValue(dv)),p.dragfrom={x:n.clientX,y:n.clientY,a:Math.atan2(n.clientX-i,o-n.clientY),v:+t.value},document.addEventListener("mousemove",p.pointermove),document.addEventListener("mouseup",p.pointerup),document.addEventListener("touchmove",p.pointermove),document.addEventListener("touchend",p.pointerup),document.addEventListener("touchcancel",p.pointerup),document.addEventListener("touchstart",p.preventScroll),r.preventDefault(),r.stopPropagation()},p.pointermove=n=>{let r;let a=t.getBoundingClientRect(),i=(a.left+a.right)*.5,o=(a.top+a.bottom)*.5;n.touches&&(n=n.touches[0]);let s=n.clientX-p.dragfrom.x,l=n.clientY-p.dragfrom.y,d=Math.atan2(n.clientX-i,o-n.clientY);switch(p.itype){case"k":switch(e.knobMode){case"linear":r=(s/p.sensex-l/p.sensey)*(p.valrange.max-p.valrange.min),n.shiftKey&&(r*=.2),t.setValue(p.dragfrom.v+r);break;case"circularabs":if(!n.shiftKey){r=p.valrange.min+(d/Math.PI*.75+.5)*(p.valrange.max-p.valrange.min),t.setValue(r);break}case"circularrel":d>p.dragfrom.a+Math.PI&&(d-=2*Math.PI),d<p.dragfrom.a-Math.PI&&(d+=2*Math.PI),d-=p.dragfrom.a,r=d/Math.PI/1.5*(p.valrange.max-p.valrange.min),n.shiftKey&&(r*=.2),t.setValue(p.dragfrom.v+r)}break;case"h":case"v":r=(s/p.sensex-l/p.sensey)*(p.valrange.max-p.valrange.min),n.shiftKey&&(r*=.2),t.setValue(p.dragfrom.v+r)}},p.pointerup=()=>{document.removeEventListener("mousemove",p.pointermove),document.removeEventListener("touchmove",p.pointermove),document.removeEventListener("mouseup",p.pointerup),document.removeEventListener("touchend",p.pointerup),document.removeEventListener("touchcancel",p.pointerup),document.removeEventListener("touchstart",p.preventScroll);let e=document.createEvent("HTMLEvents");e.initEvent("change",!1,!0),t.dispatchEvent(e)},p.preventScroll=e=>{e.preventDefault()},p.keydown=()=>{t.redraw()},p.wheel=e=>{let n=e.deltaY>0?-p.valrange.step:p.valrange.step;e.shiftKey||(n*=5),t.setValue(+t.value+n),e.preventDefault(),e.stopPropagation()},t.redraw=e=>{if(e||p.valueold!=t.value){let e=(t.value-p.valrange.min)/(p.valrange.max-p.valrange.min);if(p.sprites>=1)t.style.backgroundPosition="0px "+-(e*p.sprites|0)*p.frameheight+"px";else switch(p.itype){case"k":t.style.transform="rotate("+(270*e-135)+"deg)";break;case"h":t.style.backgroundPosition=(i-o)*e+"px 0px";break;case"v":t.style.backgroundPosition="0px "+(o-i)*(1-e)+"px"}p.valueold=t.value}},t.refresh(),t.redraw(!0),t.addEventListener("keydown",p.keydown),t.addEventListener("mousedown",p.pointerdown),t.addEventListener("touchstart",p.pointerdown),t.addEventListener("wheel",p.wheel)},s=()=>{let e=document.querySelectorAll("input.input-knob,input.input-slider");for(let t=0;t<e.length;++t)l.push([o,e[t]]);e=document.querySelectorAll("input[type=checkbox].input-switch,input[type=radio].input-switch");for(let t=0;t<e.length;++t)l.push([i,e[t]])},l=[];s(),setInterval(()=>{for(let e=0;l.length>0&&e<8;++e){let e=l.shift();e[0](e[1])}l.length<=0&&s()},50)});//# sourceMappingURL=index.06f390b1.js.map

//# sourceMappingURL=index.06f390b1.js.map

/** 24 — Mountains */
(function(){
window._THEME_24_MOUNTAINS = {
name:'Горы', nameEn:'Mountains',
    desc:'Горные силуэты в слоях, туман',descEn:'Layered mountain silhouettes, mist',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='mt'+Math.random().toString(36).slice(2,7);
      const rng=(s)=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      function mR(seed,yBase,yRange,nP,col,op){const pts=[`0,${h}`];for(let i=0;i<=nP*2;i++){const x=w*i/(nP*2);pts.push(`${x.toFixed(1)},${(yBase-(i%2===0?rng(seed+i)*yRange:rng(seed+i)*yRange*0.3)).toFixed(1)}`);}pts.push(`${w},${h}`);return `<polygon points="${pts.join(' ')}" fill="${col}" opacity="${op}"/>`;}
      const layers=isTitle?[[10,h*0.55,h*0.30,8,a1,'0.20'],[20,h*0.63,h*0.20,6,a2,'0.15'],[30,h*0.71,h*0.12,5,a1,'0.11'],[40,h*0.78,h*0.06,4,a2,'0.08']]:[[10,h*0.60,h*0.28,7,a1,'0.18'],[20,h*0.70,h*0.18,5,a2,'0.13'],[30,h*0.78,h*0.08,4,a1,'0.09']];
      let mountains='';layers.forEach(([s,yb,yr,np,col,op])=>{mountains+=mR(s,yb,yr,np,col,op);});
      const mistY=isTitle?h*0.60:h*0.68;
      const mist=`<defs><linearGradient id="${uid}mg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${a2}" stop-opacity="0"/><stop offset="50%" stop-color="${a2}" stop-opacity="0.07"/><stop offset="100%" stop-color="${a2}" stop-opacity="0"/></linearGradient></defs><rect x="-${(w*0.2).toFixed(0)}" y="${(mistY-h*0.04).toFixed(0)}" width="${(w*1.4).toFixed(0)}" height="${(h*0.08).toFixed(0)}" fill="url(#${uid}mg)"${doAnimate?`><animateTransform attributeName="transform" type="translate" from="0 0" to="${(w*0.2).toFixed(0)} 0" dur="8s" repeatCount="indefinite" calcMode="linear"/></rect>`:' />'} `;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${mist}${mountains}</svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  tplVariants(isRu){ return _themeTplFor('Mountains', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

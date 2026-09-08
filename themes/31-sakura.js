/** 31 — Sakura */
(function(){
window._THEME_31_SAKURA = {
name:'Сакура', nameEn:'Sakura',
    desc:'Падающие лепестки сакуры',descEn:'Falling cherry blossom petals',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const rng=s=>{let x=Math.sin(s*83.5+44.2)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(1);
      const midBegin=(seed,dur,lo,hi)=>{const p=lo+rng(seed)*(hi-lo);return(-p*dur).toFixed(2);};
      const cx0=w*0.5,cy0=h*0.5,zoneRx=w*(isTitle?0.4:0.34),zoneRy=h*(isTitle?0.38:0.32);
      const inCenter=(x,y)=>{const dx=(x-cx0)/zoneRx,dy=(y-cy0)/zoneRy;return dx*dx+dy*dy<1;};
      const petalD=(sc)=>{
        const pw=14*sc,ph=28*sc;
        const fp=n=>n.toFixed(1);
        return `M 0 ${fp(-ph*0.42)} C ${fp(pw*0.95)} ${fp(-ph*0.18)} ${fp(pw*0.88)} ${fp(ph*0.32)} 0 ${fp(ph*0.5)} C ${fp(-pw*0.88)} ${fp(ph*0.32)} ${fp(-pw*0.95)} ${fp(-ph*0.18)} 0 ${fp(-ph*0.42)} Z`;
      };
      const nP=isTitle?34:16;
      let svg='';
      for(let i=0;i<nP;i++){
        const seed=i*31+77;
        let px=rng(seed)*w;
        if(!isTitle){for(let a=0;a<10&&inCenter(px,h*0.4);a++)px=rng(seed+a*2)*w;}
        const sc=1.0+rng(seed+2)*(isTitle?2.1:1.7);
        const rot0=(rng(seed+3)*140-30).toFixed(1);
        const rot1=(+rot0+100+rng(seed+9)*80).toFixed(1);
        const col=rng(seed+4)>0.5?a1:a2;
        const op=Math.min(0.5,0.14+rng(seed+5)*0.3).toFixed(2);
        const startY=-(12+rng(seed+1)*55);
        const endY=h+18+rng(seed+10)*35;
        const drift=(rng(seed+6)-0.5)*w*0.14;
        const x1=(px+drift).toFixed(1);
        const durNum=11+rng(seed+7)*14;
        const dur=durNum.toFixed(1);
        const beg=midBegin(seed+8,durNum,0,1);
        if(doAnimate){
          svg+=`<g opacity="0">
            <animate attributeName="opacity" values="0;${op};${op};0" keyTimes="0;0.07;0.9;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="translate" values="${f(px)} ${f(startY)};${x1} ${f(endY)}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.25 0 0.75 1"/>
            <path d="${petalD(sc)}" fill="${col}">
              <animateTransform attributeName="transform" type="rotate" values="${rot0};${rot1}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            </path>
          </g>`;
        }else{
          const py=rng(seed+1)*h*0.85;
          svg+=`<g transform="translate(${f(px)} ${f(py)}) rotate(${rot0})"><path d="${petalD(sc)}" fill="${col}" opacity="${op}"/></g>`;
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${svg}</svg>`;
    },
    titleSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,true,d!==false);},
    contentSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,false,d!==false);},
  tplVariants(isRu){ return _themeTplFor('Sakura', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

/** 30 — Starfall */
(function(){
window._THEME_30_STARFALL = {
name:'Звёздопад', nameEn:'Starfall',
    desc:'Звёздное небо, редкие метеоры',descEn:'Starry sky with occasional meteors',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='sf'+Math.random().toString(36).slice(2,7);
      const rng=s=>{let x=Math.sin(s*67.3+2.9)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(1);
      const midBegin=(seed,dur,lo,hi)=>{const p=lo+rng(seed)*(hi-lo);return(-p*dur).toFixed(2);};
      const ti=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx
        :(typeof selTheme!=='undefined'&&selTheme>=0?selTheme:-1);
      const theme=ti>=0&&typeof THEMES!=='undefined'?THEMES[ti]:null;
      const isLight=theme&&theme.dark===false;

      const starOpMin=isLight?0.24:0.06;
      const starOpMax=isLight?0.72:0.41;
      const tailStops=isLight
        ? `<stop offset="0%" stop-color="${a2}" stop-opacity="0"/><stop offset="50%" stop-color="${a1}" stop-opacity="0.45"/><stop offset="100%" stop-color="${a1}" stop-opacity="1"/>`
        : `<stop offset="0%" stop-color="${a2}" stop-opacity="0"/><stop offset="55%" stop-color="#fff" stop-opacity="0.2"/><stop offset="100%" stop-color="#fff" stop-opacity="1"/>`;
      const metPeakLo=isLight?0.62:0.45;
      const metPeakHi=isLight?0.95:0.90;

      const nStars=isTitle?95:52;
      let svg=`<defs><linearGradient id="${uid}tail" gradientUnits="objectBoundingBox" x1="0" y1="0.5" x2="1" y2="0.5">${tailStops}</linearGradient></defs>`;
      for(let i=0;i<nStars;i++){
        const sx=rng(i*5)*w,sy=rng(i*5+1)*h,sr=(0.3+rng(i*5+2)*(isLight?1.8:1.4)).toFixed(2);
        const op=(starOpMin+rng(i*5+3)*(starOpMax-starOpMin)).toFixed(2);
        const col=isLight
          ?(rng(i*5+4)>0.45?a1:a2)
          :(rng(i*5+4)>0.7?'#fff':a2);
        if(doAnimate){
          const dur=(2+rng(i*5+5)*3).toFixed(1),beg=midBegin(i*5+6,+dur,0.1,0.95);
          const twLo=isLight?(op*0.45).toFixed(2):(op*0.3).toFixed(2);
          svg+=`<circle cx="${f(sx)}" cy="${f(sy)}" r="${sr}" fill="${col}" opacity="${op}">
            <animate attributeName="opacity" values="${op};${twLo};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
          </circle>`;
        }else svg+=`<circle cx="${f(sx)}" cy="${f(sy)}" r="${sr}" fill="${col}" opacity="${op}"/>`;
      }
      const nMet=isTitle?14:6;
      for(let i=0;i<nMet;i++){
        const seed=i*29+200;
        const ang=0.58+rng(seed+3)*0.42;
        const ca=Math.cos(ang), sa=Math.sin(ang);
        const len=40+rng(seed+2)*(isTitle?260:180);
        const tx0=rng(seed)*w*0.85+w*0.05, ty0=rng(seed+1)*h*0.32;
        const travel=len*(1.1+rng(seed+6)*0.5);
        const tx1=tx0+ca*travel, ty1=ty0+sa*travel;
        const hx0=tx0+ca*len, hy0=ty0+sa*len;
        const hx1=tx1+ca*len, hy1=ty1+sa*len;
        const sw=(0.8+rng(seed+7)*(isLight?2.8:2.2)).toFixed(1);
        const peak=(metPeakLo+rng(seed+8)*(metPeakHi-metPeakLo)).toFixed(2);
        const cycleNum=(3.2+rng(seed+4)*4.8);
        const cycle=cycleNum.toFixed(2);
        const beg=midBegin(seed+5,cycleNum,0.05,0.92);
        if(doAnimate){
          svg+=`<line x1="${f(tx0)}" y1="${f(ty0)}" x2="${f(hx0)}" y2="${f(hy0)}" stroke="url(#${uid}tail)" stroke-width="${sw}" stroke-linecap="round" opacity="0">
            <animate attributeName="opacity" values="0;0;${peak};${peak};0;0" keyTimes="0;0.28;0.68;0.74;0.80;1" dur="${cycle}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="x1" values="${f(tx0)};${f(tx1)}" keyTimes="0;1" dur="${cycle}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.1 0 0.85 1"/>
            <animate attributeName="y1" values="${f(ty0)};${f(ty1)}" keyTimes="0;1" dur="${cycle}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.1 0 0.85 1"/>
            <animate attributeName="x2" values="${f(hx0)};${f(hx1)}" keyTimes="0;1" dur="${cycle}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.1 0 0.85 1"/>
            <animate attributeName="y2" values="${f(hy0)};${f(hy1)}" keyTimes="0;1" dur="${cycle}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.1 0 0.85 1"/>
          </line>`;
        }else svg+=`<line x1="${f(tx0)}" y1="${f(ty0)}" x2="${f(hx0)}" y2="${f(hy0)}" stroke="url(#${uid}tail)" stroke-width="${sw}" opacity="${peak}" stroke-linecap="round"/>`;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${svg}</svg>`;
    },
    titleSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,true,d!==false);},
    contentSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,false,d!==false);},
  tplVariants(isRu){ return _themeTplFor('Starfall', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

/** 19 — City */
(function(){
window._THEME_19_CITY = {
name:'Город', nameEn:'City',
    desc:'Ночной городской силуэт, огни окон',descEn:'Night city skyline, glowing windows',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='ct'+Math.random().toString(36).slice(2,7);
      const rng=(s)=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const nB=isTitle?28:18;
      const groundH=h*(isTitle?0.16:0.12);
      const bldBase=isTitle?0.08:0.035;
      const bldRange=isTitle?0.10:0.055;
      const winBase=isTitle?0.25:0.10;
      const winRange=isTitle?0.45:0.18;
      const groupOp=isTitle?1:0.52;
      let buildings='',windows='',anims='';
      for(let i=0;i<nB;i++){
        const bw=w/nB*(0.55+rng(i*3)*0.55);
        const bh=h*(0.14+rng(i*3+1)*(isTitle?0.46:0.32));
        const bx=w/nB*i+(w/nB-bw)*0.5;
        const by=h-bh;
        const bop=(bldBase+rng(i*3+2)*bldRange).toFixed(2);
        buildings+=`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${i%3===0?a2:a1}" opacity="${bop}"/>`;
        const wC=Math.max(1,Math.floor(bw/9)), wR=Math.max(1,Math.floor(bh/11));
        for(let wr=0;wr<wR;wr++)for(let wc=0;wc<wC;wc++){
          if(rng(i*100+wr*10+wc)<0.45) continue;
          const wx=bx+wc*(bw/wC)+2, wy=by+wr*(bh/wR)+3;
          const ww=Math.max(2,bw/wC-4), wh2=Math.max(2,bh/wR-4);
          const wop=(winBase+rng(i*100+wr*10+wc+0.5)*winRange).toFixed(2);
          const wdim=(+wop*0.35).toFixed(2);
          const wcol=rng(i*100+wr*10+wc+0.3)>0.6?a2:a1;
          if(doAnimate){
            const dur=(1.8+rng(i*100+wr*10+wc+1)*3.2).toFixed(1);
            const phase=(rng(i*100+wr*10+wc+2)*dur).toFixed(2);
            anims+=`<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${ww.toFixed(1)}" height="${wh2.toFixed(1)}" fill="${wcol}" opacity="${wop}"><animate attributeName="opacity" values="${wop};${wdim};${wop}" dur="${dur}s" begin="${phase}s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/></rect>`;
          }else{
            windows+=`<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${ww.toFixed(1)}" height="${wh2.toFixed(1)}" fill="${wcol}" opacity="${wop}"/>`;
          }
        }
      }
      const ggOp=isTitle?0.14:0.07;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="${uid}gg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${a1}" stop-opacity="0"/><stop offset="100%" stop-color="${a1}" stop-opacity="${ggOp}"/></linearGradient></defs><g opacity="${groupOp.toFixed(2)}"><rect y="${(h-groundH).toFixed(1)}" width="${w}" height="${groundH.toFixed(1)}" fill="url(#${uid}gg)"/>${buildings}${doAnimate?anims:windows}</g></svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  tplVariants(isRu){ return _themeTplFor('City', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

/** 23 — Sound */
(function(){
window._THEME_23_SOUND = {
name:'Звук', nameEn:'Sound',
    desc:'Звуковые волны, эквалайзер',descEn:'Sound waves, equalizer bars',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const rng=(s)=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const cx=isTitle?w*0.5:w*0.85,cy=h*0.5,nW=isTitle?8:5;
      let svg='';
      for(let i=1;i<=nW;i++){const r=(i/nW)*(isTitle?Math.max(w,h)*0.65:w*0.4),op=(0.04+rng(i)*0.08*(1-i/nW)).toFixed(2),col=i%2===0?a2:a1;if(doAnimate){const dur=(1.5+i*0.3).toFixed(1),delay=(i*0.2).toFixed(1);svg+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="0" fill="none" stroke="${col}" stroke-width="1.2"><animate attributeName="r" from="0" to="${r.toFixed(1)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/><animate attributeName="opacity" from="${op}" to="0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></circle>`;}else svg+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${col}" stroke-width="1.2" opacity="${op}"/>`;}
      const nB=isTitle?32:20,bW=w/(nB*1.8),mBH=h*(isTitle?0.25:0.18);
      for(let i=0;i<nB;i++){const bx=w*0.1+(w*0.8/nB)*i,bh=mBH*(0.15+rng(i*3+100)*0.85),col=i%2===0?a1:a2,op=(0.08+rng(i*3+101)*0.10).toFixed(2);if(doAnimate){const dur=(0.4+rng(i*3)*0.6).toFixed(2),delay=(rng(i*3+0.5)*0.5).toFixed(2),bh2=(mBH*(0.1+rng(i*3+50)*0.9)).toFixed(1);svg+=`<rect x="${bx.toFixed(1)}" y="${(h-bh).toFixed(1)}" width="${bW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${col}" opacity="${op}" rx="1"><animate attributeName="height" values="${bh.toFixed(1)};${bh2};${bh.toFixed(1)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/><animate attributeName="y" values="${(h-bh).toFixed(1)};${(h-+bh2).toFixed(1)};${(h-bh).toFixed(1)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></rect>`;}else svg+=`<rect x="${bx.toFixed(1)}" y="${(h-bh).toFixed(1)}" width="${bW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${col}" opacity="${op}" rx="1"/>`;}
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svg}</svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  tplVariants(isRu){ return _themeTplFor('Sound', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

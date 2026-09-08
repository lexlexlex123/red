/** 02 — Aurora */
(function(){
window._THEME_02_AURORA = {
name:'Аврора',nameEn:'Aurora',
    desc:'Плавные цветные ленты, северное сияние',descEn:'Flowing colour bands, aurora borealis',
    animated: true,

    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='aur'+Math.random().toString(36).slice(2,7);

      // Звёзды (детерминированные, мелкие точки)
      const rng=s=>{let x=Math.sin(s+3.1)*74831;return x-Math.floor(x);};
      const nStars = isTitle ? 80 : 45;
      let stars='';
      for(let i=0;i<nStars;i++){
        const op=(rng(i*4+0.3)*0.4+0.08).toFixed(2);
        const r=(rng(i*4+0.7)*0.9+0.2).toFixed(2);
        stars+=`<circle cx="${(rng(i*4)*w).toFixed(1)}" cy="${(rng(i*4+1)*h).toFixed(1)}" r="${r}" fill="white" opacity="${op}"/>`;
      }

      // Блобы — большие размытые эллипсы с анимацией cx/cy/opacity
      const blobs = isTitle ? [
        {cx:w*.15, cy:h*.3,  rx:w*.52, ry:h*.38, fill:a1,       op:0.22, dcx:w*.08, dcy:h*.12, dur:8},
        {cx:w*.75, cy:h*.6,  rx:w*.48, ry:h*.35, fill:a2,       op:0.18, dcx:-w*.07,dcy:-h*.1,  dur:10},
        {cx:w*.5,  cy:h*.15, rx:w*.4,  ry:h*.3,  fill:'#67e8f9',op:0.13, dcx:w*.06, dcy:h*.1,   dur:12},
        {cx:w*.85, cy:h*.2,  rx:w*.35, ry:h*.28, fill:'#f472b6',op:0.10, dcx:-w*.05,dcy:h*.08,  dur:16},
        {cx:w*.2,  cy:h*.8,  rx:w*.38, ry:h*.3,  fill:'#818cf8',op:0.12, dcx:w*.09, dcy:-h*.07, dur:11},
      ] : [
        {cx:w*.1,  cy:h*.25, rx:w*.55, ry:h*.4,  fill:a1, op:0.11, dcx:w*.06, dcy:h*.08, dur:10},
        {cx:w*.85, cy:h*.7,  rx:w*.45, ry:h*.35, fill:a2, op:0.09, dcx:-w*.05,dcy:-h*.07,dur:14},
        {cx:w*.5,  cy:h*1.0, rx:w*.4,  ry:h*.3,  fill:a1, op:0.07, dcx:w*.04, dcy:-h*.06,dur:17},
      ];

      let blobSvg='';
      blobs.forEach((b,i)=>{
        if(doAnimate){
          const cx0=b.cx.toFixed(1), cx1=(b.cx+b.dcx).toFixed(1);
          const cy0=b.cy.toFixed(1), cy1=(b.cy+b.dcy).toFixed(1);
          const op0=b.op.toFixed(2), op1=(b.op*0.5).toFixed(2);
          const begin=(i*3.1).toFixed(1);
          blobSvg+=`<ellipse cx="${cx0}" cy="${cy0}" rx="${b.rx.toFixed(1)}" ry="${b.ry.toFixed(1)}" fill="${b.fill}" opacity="${op0}" filter="url(#${uid}blur)">
            <animate attributeName="cx" values="${cx0};${cx1};${cx0}" dur="${b.dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
            <animate attributeName="cy" values="${cy0};${cy1};${cy0}" dur="${b.dur*1.13}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
            <animate attributeName="opacity" values="${op0};${op1};${op0}" dur="${b.dur*0.8}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
          </ellipse>`;
        } else {
          blobSvg+=`<ellipse cx="${b.cx.toFixed(1)}" cy="${b.cy.toFixed(1)}" rx="${b.rx.toFixed(1)}" ry="${b.ry.toFixed(1)}" fill="${b.fill}" opacity="${b.op.toFixed(2)}" filter="url(#${uid}blur)"/>`;
        }
      });

      // Световые дуги — aurora bands
      const arcs = isTitle ? [
        {d:`M-${(w*.05).toFixed(0)},${(h*.22).toFixed(0)} Q${(w*.3).toFixed(0)},${(h*.08).toFixed(0)} ${(w*.65).toFixed(0)},${(h*.24).toFixed(0)} Q${(w*.9).toFixed(0)},${(h*.38).toFixed(0)} ${(w*1.08).toFixed(0)},${(h*.2).toFixed(0)}`, sw:h*.055, op:0.10, col:a1, dur:7},
        {d:`M-${(w*.05).toFixed(0)},${(h*.4).toFixed(0)} Q${(w*.25).toFixed(0)},${(h*.27).toFixed(0)} ${(w*.6).toFixed(0)},${(h*.42).toFixed(0)} Q${(w*.88).toFixed(0)},${(h*.55).toFixed(0)} ${(w*1.06).toFixed(0)},${(h*.38).toFixed(0)}`, sw:h*.04, op:0.07, col:a2, dur:10},
      ] : [
        {d:`M0,${(h*.18).toFixed(0)} Q${(w*.35).toFixed(0)},${(h*.08).toFixed(0)} ${(w*.7).toFixed(0)},${(h*.2).toFixed(0)} T${w},${(h*.14).toFixed(0)}`, sw:h*.035, op:0.07, col:a1, dur:12},
      ];

      let arcSvg='';
      arcs.forEach((arc,i)=>{
        if(doAnimate){
          const op0=arc.op.toFixed(3), op1=(arc.op*0.35).toFixed(3);
          arcSvg+=`<path d="${arc.d}" fill="none" stroke="${arc.col}" stroke-width="${arc.sw.toFixed(1)}" stroke-linecap="round" opacity="${op0}" filter="url(#${uid}arc)">
            <animate attributeName="opacity" values="${op0};${op1};${op0}" dur="${arc.dur}s" begin="${(i*4.5).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
          </path>`;
        } else {
          arcSvg+=`<path d="${arc.d}" fill="none" stroke="${arc.col}" stroke-width="${arc.sw.toFixed(1)}" stroke-linecap="round" opacity="${arc.op.toFixed(3)}" filter="url(#${uid}arc)"/>`;
        }
      });

      const defs=`<defs>
        <filter id="${uid}blur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${isTitle?32:24}"/></filter>
        <filter id="${uid}arc"  x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="${isTitle?14:10}"/></filter>
      </defs>`;

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${defs}${blobSvg}${arcSvg}${stars}
      </svg>`;
    },

    titleSvg(w,h,a1,a2,doAnimate){
      return this._build(w,h,a1,a2,true, doAnimate!==false);
    },
    contentSvg(w,h,a1,a2,doAnimate){
      return this._build(w,h,a1,a2,false, doAnimate!==false);
    },
  tplVariants(isRu){ return _themeTplFor('Aurora', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

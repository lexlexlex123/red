/** 06 — Halo */
(function(){
window._THEME_06_HALO = {
name:'Ореол',nameEn:'Halo',
    desc:'Расходящиеся кольца света из центра',descEn:'Expanding light rings from center',
    animated: true,

    _build(w,h,a1,a2,isTitle,doAnimate){
      const uid='hl'+Math.random().toString(36).slice(2,7);
      const cx=isTitle?w*.52:w;
      const cy=isTitle?h*.46:h;
      const maxR=Math.max(w,h)*(isTitle?0.78:1.05);
      const r0=Math.min(w,h)*(isTitle?0.035:0.028);
      const expandDur=9; // одинаковая скорость расширения у всех колец
      const ringCount=isTitle?7:5;
      const preWarm=isTitle?0:10;
      // Разная толщина (до 50px) и разная периодичность повтора
      const swTable=isTitle?[48,4,28,12,50,7,20]:[36,3.5,22,9,45];
      const periodTable=isTitle?[9.5,14.2,11.0,16.8,10.2,15.4,12.6]:[10.0,14.8,11.4,16.2,12.8];
      const beginOff=isTitle?[0,1.2,0.4,2.5,0.8,1.8,0.2]:[0,1.5,0.6,2.2,0.9];

      const _opAt=(t,peak,expandFrac)=>{
        // t — доля периода [0..1]; расширение идёт в [0..expandFrac]
        const u=expandFrac>0?Math.min(1,t/expandFrac):1;
        if(u<=0.07) return (u/0.07)*peak;
        if(u<=0.42) return peak-(peak-peak*0.55)*(u-0.07)/0.35;
        if(u<1) return Math.max(0,peak*0.55*(1-(u-0.42)/0.58));
        return 0;
      };

      const glowRMin=maxR*0.09;
      const glowRMax=maxR*0.19;
      const glowOp=isTitle?0.07:0.045;
      const glowPulseDur=7;

      let body='';
      if(doAnimate){
        body+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${glowRMin.toFixed(1)}" fill="${a1}" opacity="${glowOp}" filter="url(#${uid}blur)">
          <animate attributeName="r" values="${glowRMin.toFixed(1)};${glowRMax.toFixed(1)};${glowRMin.toFixed(1)}" dur="${glowPulseDur}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
        </circle>`;
      } else {
        body+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${((glowRMin+glowRMax)*0.5).toFixed(1)}" fill="${a1}" opacity="${glowOp}" filter="url(#${uid}blur)"/>`;
      }
      if(isTitle){
        body+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(maxR*0.04).toFixed(1)}" fill="${a1}" opacity="0.35"/>`;
        body+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(maxR*0.016).toFixed(1)}" fill="${a2}" opacity="0.7"/>`;
      }

      for(let i=0;i<ringCount;i++){
        const period=periodTable[i]||expandDur;
        const expandFrac=Math.min(0.92, expandDur/period);
        const begin=((beginOff[i]!=null?beginOff[i]:0)-preWarm).toFixed(2);
        const col=i%2?a2:a1;
        const sw=swTable[i];
        const peakOp=(isTitle?0.34:0.24)-i*0.025;
        const swMid=(sw*0.48).toFixed(2);
        const swEnd=(sw*0.18).toFixed(2);
        const ktR=`0;${expandFrac.toFixed(3)};1`;
        const ktOp=`0;${(expandFrac*0.07).toFixed(3)};${(expandFrac*0.42).toFixed(3)};${expandFrac.toFixed(3)};1`;
        const ktSw=`0;${(expandFrac*0.55).toFixed(3)};${expandFrac.toFixed(3)};1`;

        if(doAnimate){
          body+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r0.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${sw.toFixed(2)}" opacity="0">
            <animate attributeName="r" values="${r0.toFixed(1)};${maxR.toFixed(1)};${maxR.toFixed(1)}" keyTimes="${ktR}" dur="${period}s" begin="${begin}s" repeatCount="indefinite" calcMode="linear"/>
            <animate attributeName="opacity" values="0;${Math.max(0.06,peakOp).toFixed(3)};${Math.max(0.04,peakOp*0.55).toFixed(3)};0;0" keyTimes="${ktOp}" dur="${period}s" begin="${begin}s" repeatCount="indefinite"/>
            <animate attributeName="stroke-width" values="${sw.toFixed(2)};${swMid};${swEnd};${swEnd}" keyTimes="${ktSw}" dur="${period}s" begin="${begin}s" repeatCount="indefinite"/>
          </circle>`;
        } else {
          let elapsed=preWarm-(beginOff[i]!=null?beginOff[i]:0);
          while(elapsed<0) elapsed+=period;
          elapsed%=period;
          const t=elapsed/period;
          const u=Math.min(1,t/expandFrac);
          const staticR=r0+(maxR-r0)*u;
          const staticSw=sw-(sw-sw*0.18)*Math.min(1,u/0.55);
          body+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${staticR.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${staticSw.toFixed(2)}" opacity="${_opAt(t,Math.max(0.04,peakOp),expandFrac).toFixed(3)}"/>`;
        }
      }

      const defs=`<defs><filter id="${uid}blur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="${isTitle?26:16}"/></filter></defs>`;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${defs}${body}</svg>`;
    },

    titleSvg(w,h,a1,a2,doAnimate){ return this._build(w,h,a1,a2,true,doAnimate!==false); },
    contentSvg(w,h,a1,a2,doAnimate){ return this._build(w,h,a1,a2,false,doAnimate!==false); },
  tplVariants(isRu){ return _themeTplFor('Halo', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

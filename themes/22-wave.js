/** 22 — Wave */
(function(){
window._THEME_22_WAVE = {
name:'Цунами', nameEn:'Wave',
    desc:'Спиральная волна, пена в центр',descEn:'Spiral wave curling inward with foam',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='tsu'+Math.random().toString(36).slice(2,7);
      const rng=s=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(1);
      const cx=isTitle?w*0.11:w*0.08;
      const cy=isTitle?h*0.42:h*0.54;
      const Rmax=Math.hypot(w,h)*1.28;
      const Rmin=2.5;
      const turns=isTitle?6.2:5.2;
      const tMax=turns*Math.PI*2;
      const rot0=isTitle?-0.58:-0.18;
      const sp='0.38 0 0.62 1';

      function rAt(t){ return Rmin+(Rmax-Rmin)*(1-t/tMax); }

      function ptAt(t,lane,rot){
        const r=Math.max(Rmin,rAt(t)+lane);
        const ang=t+rot;
        return [cx+Math.cos(ang)*r, cy+Math.sin(ang)*r];
      }

      function spiralBand(thick,rot,lane){
        const steps=128,tA=0,tB=tMax*0.992;
        const out=[],inn=[];
        for(let i=0;i<=steps;i++){
          const t=tA+(tB-tA)*i/steps;
          const taper=Math.min(1,(tMax-t)/(tMax*0.12));
          const th=thick*taper;
          const rMid=Math.max(Rmin,rAt(t)+lane);
          const ang=t+rot;
          out.push([cx+Math.cos(ang)*(rMid+th*0.5), cy+Math.sin(ang)*(rMid+th*0.5)]);
          inn.push([cx+Math.cos(ang)*Math.max(1,rMid-th*0.5), cy+Math.sin(ang)*Math.max(1,rMid-th*0.5)]);
        }
        const pt=p=>f(p[0])+','+f(p[1]);
        return 'M'+out.map(pt).join(' L')+' L'+inn.reverse().map(pt).join(' L')+' Z';
      }

      function spiralCrest(rot,lane){
        const steps=100,pts=[];
        for(let i=0;i<=steps;i++){
          const t=(tMax*0.992)*i/steps;
          const p=ptAt(t,lane,rot);
          pts.push(f(p[0])+','+f(p[1]));
        }
        return 'M'+pts.join(' L');
      }

      const waveTh=isTitle?Rmax*0.055:Rmax*0.048;
      const bands=isTitle?[
        {thick:waveTh*1.35, rot:rot0,       lane:0,           col:a1, op:'0.11'},
        {thick:waveTh,      rot:rot0+0.12,   lane:waveTh*0.6,  col:a2, op:'0.08'},
        {thick:waveTh*0.72, rot:rot0+0.22,   lane:waveTh*1.1,  col:a1, op:'0.06'},
      ]:[
        {thick:waveTh*1.2,  rot:rot0,       lane:0,           col:a1, op:'0.09'},
        {thick:waveTh*0.8,  rot:rot0+0.10,  lane:waveTh*0.5,  col:a2, op:'0.07'},
      ];

      let waveSvg='';
      bands.forEach(bd=>{
        waveSvg+=`<path d="${spiralBand(bd.thick,bd.rot,bd.lane)}" fill="${bd.col}" opacity="${bd.op}" filter="url(#${uid}wave)"/>`;
        waveSvg+=`<path d="${spiralCrest(bd.rot,bd.lane)}" fill="none" stroke="#fff" stroke-width="1" opacity="${(+bd.op*0.45).toFixed(2)}" stroke-linecap="round" filter="url(#${uid}wave)"/>`;
      });

      const vortexR=isTitle?Rmax*0.09:Rmax*0.07;
      const vortexSvg=`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(vortexR)}" fill="url(#${uid}vortex)" filter="url(#${uid}vortexBlur)" opacity="0.9"/>
        <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(vortexR*0.35)}" fill="url(#${uid}core)" filter="url(#${uid}vortexBlur)" opacity="0.55"/>`;

      const nFoam=isTitle?140:88;
      let foamSvg='';
      for(let i=0;i<nFoam;i++){
        const t0=rng(i*17)*tMax*0.72;
        const lane=(rng(i*17+1)-0.5)*waveTh*2.2;
        const p0=ptAt(t0,lane,rot0);
        const t1=tMax*(0.88+rng(i*17+2)*0.11);
        const lane1=lane*0.25;
        const p1=ptAt(t1,lane1,rot0+0.35);
        const tM=(t0+t1)*0.5;
        const pM=ptAt(tM,(lane+lane1)*0.5,rot0+0.18);
        const sz=(0.7+rng(i*17+3)*3.2).toFixed(2);
        const foamCol=rng(i*17+4)>0.65?'#fff':(rng(i*17+4)>0.35?a2:a1);
        const op=Math.min(0.38,0.05+rng(i*17+5)*0.22).toFixed(2);
        const dur=(28+rng(i*17+6)*34).toFixed(1);
        const beg=(rng(i*17+7)*32).toFixed(1);
        const opHi=Math.min(0.42,(+op*1.2).toFixed(2));
        const opLo=(+op*0.55).toFixed(2);
        if(doAnimate){
          foamSvg+=`<circle cx="${f(p0[0])}" cy="${f(p0[1])}" r="${sz}" fill="${foamCol}" opacity="${op}" filter="url(#${uid}foam)">
            <animate attributeName="cx" values="${f(p0[0])};${f(pM[0])};${f(p1[0])};${f(p0[0])}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
            <animate attributeName="cy" values="${f(p0[1])};${f(pM[1])};${f(p1[1])};${f(p0[1])}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
            <animate attributeName="r" values="${sz};${(+sz*1.08).toFixed(2)};${(+sz*0.7).toFixed(2)};${sz}" dur="${(dur*1.05).toFixed(1)}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
            <animate attributeName="opacity" values="${op};${opHi};${opLo};${op}" dur="${(dur*0.95).toFixed(1)}s" begin="${beg}s" repeatCount="indefinite"/>
          </circle>`;
        }else{
          foamSvg+=`<circle cx="${f(p0[0])}" cy="${f(p0[1])}" r="${sz}" fill="${foamCol}" opacity="${op}" filter="url(#${uid}foam)"/>`;
        }
      }

      const rotDur=isTitle?88:98;
      const rotCx=f(cx), rotCy=f(cy);
      const rotAnim=doAnimate
        ?`<animateTransform attributeName="transform" type="rotate" from="0 ${rotCx} ${rotCy}" to="360 ${rotCx} ${rotCy}" dur="${rotDur}s" repeatCount="indefinite" calcMode="linear"/>`
        :'';

      const blurW=isTitle?16:12;
      const defs=`<defs>
        <filter id="${uid}wave" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${blurW}"/></filter>
        <filter id="${uid}foam" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.4"/></filter>
        <filter id="${uid}vortexBlur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="${blurW*1.4}"/></filter>
        <radialGradient id="${uid}vortex" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.14"/>
          <stop offset="35%" stop-color="${a1}" stop-opacity="0.07"/>
          <stop offset="70%" stop-color="${a2}" stop-opacity="0.03"/>
          <stop offset="100%" stop-color="${a1}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="${uid}core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.22"/>
          <stop offset="55%" stop-color="${a2}" stop-opacity="0.06"/>
          <stop offset="100%" stop-opacity="0"/>
        </radialGradient>
      </defs>`;

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
        ${defs}
        <g opacity="0.92">${rotAnim}${vortexSvg}${waveSvg}<g opacity="0.85">${foamSvg}</g></g>
      </svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  tplVariants(isRu){ return _themeTplFor('Wave', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

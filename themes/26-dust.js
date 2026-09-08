/** 26 — Dust */
(function(){
window._THEME_26_DUST = {
name:'Пыль', nameEn:'Dust',
    desc:'Пылинки в лучах, переливающийся туман',descEn:'Floating dust motes, shifting haze',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='dst'+Math.random().toString(36).slice(2,7);
      const rng=s=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(1);
      const sp='0.4 0 0.6 1';
      const cx0=w*0.5, cy0=h*0.5;
      const zoneRx=w*(isTitle?0.44:0.38);
      const zoneRy=h*(isTitle?0.42:0.36);

      function inCenter(x,y){
        const dx=(x-cx0)/zoneRx, dy=(y-cy0)/zoneRy;
        return dx*dx+dy*dy<1;
      }

      function pickPos(seed){
        for(let a=0;a<14;a++){
          const x=rng(seed+a*5.3)*w;
          const y=rng(seed+a*5.3+1.7)*h;
          if(isTitle||!inCenter(x,y)) return [x,y];
        }
        const ang=rng(seed*2.1)*Math.PI*2;
        const r=0.62+rng(seed*2.1+3)*0.38;
        return [cx0+Math.cos(ang)*zoneRx*r*1.05, cy0+Math.sin(ang)*zoneRy*r*1.05];
      }

      // Отрицательный begin — при открытии слайда анимация уже в разгаре, пылинки на экране.
      function midBegin(seed,dur,visLo,visHi){
        const phase=visLo+rng(seed)*(visHi-visLo);
        return (-phase*dur).toFixed(2);
      }

      const gradBlobs=isTitle?[
        {cx:w*.20, cy:h*.32, rx:w*.48, ry:h*.34, fill:a1, op:0.13, dcx:w*.08, dcy:h*.11, dur:16},
        {cx:w*.78, cy:h*.58, rx:w*.44, ry:h*.32, fill:a2, op:0.11, dcx:-w*.07, dcy:-h*.09, dur:19},
        {cx:w*.52, cy:h*.18, rx:w*.38, ry:h*.28, fill:a1, op:0.09, dcx:w*.05, dcy:h*.08, dur:22},
        {cx:w*.15, cy:h*.78, rx:w*.36, ry:h*.26, fill:a2, op:0.08, dcx:w*.06, dcy:-h*.07, dur:18},
      ]:[
        {cx:w*.14, cy:h*.28, rx:w*.46, ry:h*.32, fill:a1, op:0.09, dcx:w*.06, dcy:h*.08, dur:18},
        {cx:w*.86, cy:h*.72, rx:w*.40, ry:h*.28, fill:a2, op:0.07, dcx:-w*.05, dcy:-h*.06, dur:21},
        {cx:w*.50, cy:h*.88, rx:w*.34, ry:h*.22, fill:a1, op:0.06, dcx:w*.04, dcy:-h*.05, dur:24},
      ];

      let bgSvg='';
      gradBlobs.forEach((b,i)=>{
        const x0=f(b.cx), x1=f(b.cx+b.dcx);
        const y0=f(b.cy), y1=f(b.cy+b.dcy);
        const op0=b.op.toFixed(2), op1=(b.op*0.45).toFixed(2);
        const beg=midBegin(i*41.3+7,b.dur,0.08,0.92);
        if(doAnimate){
          bgSvg+=`<ellipse cx="${x0}" cy="${y0}" rx="${f(b.rx)}" ry="${f(b.ry)}" fill="${b.fill}" opacity="${op0}" filter="url(#${uid}haze)">
            <animate attributeName="cx" values="${x0};${x1};${x0}" dur="${b.dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp}"/>
            <animate attributeName="cy" values="${y0};${y1};${y0}" dur="${(b.dur*1.14).toFixed(1)}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp}"/>
            <animate attributeName="opacity" values="${op0};${op1};${op0}" dur="${(b.dur*0.85).toFixed(1)}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp}"/>
          </ellipse>`;
        }else{
          bgSvg+=`<ellipse cx="${x0}" cy="${y0}" rx="${f(b.rx)}" ry="${f(b.ry)}" fill="${b.fill}" opacity="${op0}" filter="url(#${uid}haze)"/>`;
        }
      });

      const nDust=isTitle?190:74;
      let dustSvg='';
      for(let i=0;i<nDust;i++){
        const seed=i*23.7+311;
        const p0=pickPos(seed);
        const driftX=(rng(seed+2)-0.5)*(isTitle?w*0.22:w*0.18);
        const driftY=(rng(seed+3)-0.5)*(isTitle?h*0.20:h*0.16);
        const x0=p0[0], y0=p0[1];
        const x1=x0+driftX, y1=y0+driftY;
        const xm=(x0+x1)*0.5+(rng(seed+4)-0.5)*w*0.04;
        const ym=(y0+y1)*0.5+(rng(seed+5)-0.5)*h*0.04;
        let sz=0.35+rng(seed+6)*(isTitle?5.2:4.2);
        if(!isTitle&&inCenter(x0,y0)) sz*=0.65;
        const szStr=sz.toFixed(2);
        const roll=rng(seed+7);
        const col=roll>0.72?'#fff':(roll>0.38?(roll>0.55?a2:a1):'#c8cdd8');
        let peak=0.06+rng(seed+8)*0.34;
        if(!isTitle&&inCenter(xm,ym)) peak*=0.55;
        const pHi=Math.min(0.42,peak).toFixed(2);
        const pMid=(peak*0.75).toFixed(2);
        const durNum=14+rng(seed+9)*22;
        const dur=durNum.toFixed(1);
        const beg=midBegin(seed+10,durNum,0.26,0.64);
        const blur=sz>2.5?` filter="url(#${uid}dust)"`:'';
        if(doAnimate){
          dustSvg+=`<circle cx="${f(x0)}" cy="${f(y0)}" r="${szStr}" fill="${col}" opacity="${pMid}"${blur}>
            <animate attributeName="cx" values="${f(x0)};${f(xm)};${f(x1)};${f(x0)}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
            <animate attributeName="cy" values="${f(y0)};${f(ym)};${f(y1)};${f(y0)}" dur="${(dur*1.08).toFixed(1)}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
            <animate attributeName="opacity" values="0;0;${pHi};${pMid};0;0" keyTimes="0;0.08;0.22;0.68;0.92;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="r" values="${szStr};${(sz*1.15).toFixed(2)};${(sz*0.82).toFixed(2)};${szStr}" dur="${(dur*1.12).toFixed(1)}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
          </circle>`;
        }else{
          dustSvg+=`<circle cx="${f(x0)}" cy="${f(y0)}" r="${szStr}" fill="${col}" opacity="${pMid}"${blur}/>`;
        }
      }

      const hazeBlur=isTitle?34:26;
      const defs=`<defs>
        <filter id="${uid}haze" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="${hazeBlur}"/></filter>
        <filter id="${uid}dust" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="0.9"/></filter>
      </defs>`;

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
        ${defs}${bgSvg}<g opacity="${isTitle?'0.95':'0.88'}">${dustSvg}</g>
      </svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  tplVariants(isRu){ return _themeTplFor('Dust', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

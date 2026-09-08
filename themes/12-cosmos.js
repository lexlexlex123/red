/** 12 — Cosmos */
(function(){
window._THEME_12_COSMOS = {
name:'Космос', nameEn:'Cosmos',
    desc:'Планета, орбиты, спутники — анимированный или статичный',
    descEn:'Planet with orbiting satellites — animated or static',
    animated: true,   // this layout supports animation toggle

    // helper: build the orbit+satellite SVG structure
    // animated=true → CSS keyframe animation, false → static snapshot
    _build:(w,h,a1,a2,isTitleSlide,doAnimate)=>{
      const cx = isTitleSlide ? w*0.72 : w*0.88;
      const cy = isTitleSlide ? h*0.52 : h*0.82;
      const pr = isTitleSlide ? h*0.13  : h*0.10;

      const orbits = [
        {rx:pr*2.2, ry:pr*0.65, rot:-22, period:8,  sat:pr*0.10,  phase:0.00, color:a1},
        {rx:pr*3.2, ry:pr*1.00, rot:-10, period:15, sat:pr*0.075, phase:0.35, color:a2},
        {rx:pr*4.2, ry:pr*1.40, rot:  6, period:25, sat:pr*0.06,  phase:0.65, color:a1},
        {rx:pr*5.3, ry:pr*1.70, rot: 18, period:38, sat:pr*0.045, phase:0.15, color:a2},
      ];

      // Pre-compute ellipse orbit points: returns "x,y;x,y;..." string
      function orbitVals(rx, ry, rotDeg, phase, n){
        const r=rotDeg*Math.PI/180, pts=[];
        for(let i=0;i<=n;i++){
          const a=2*Math.PI*(phase+i/n);
          const ex=rx*Math.cos(a), ey=ry*Math.sin(a);
          const x=cx + ex*Math.cos(r) - ey*Math.sin(r);
          const y=cy + ex*Math.sin(r) + ey*Math.cos(r);
          pts.push(x.toFixed(1)+','+y.toFixed(1));
        }
        return pts.join(';');
      }

      const uid = 'csm' + Math.random().toString(36).slice(2,7);

      // Stars (deterministic)
      const rng=(s)=>{let x=Math.sin(s+1.7)*93741;return x-Math.floor(x);};
      let stars='';
      for(let i=0;i<65;i++){
        stars+=`<circle cx="${(rng(i*3)*w).toFixed(1)}" cy="${(rng(i*3+1)*h).toFixed(1)}" r="${(rng(i*3+2)*1.4+0.3).toFixed(2)}" fill="${a1}" opacity="${(rng(i*3+0.5)*0.55+0.12).toFixed(2)}"/>`;
      }

      // Dashed orbit rings
      let orbitRings='';
      orbits.forEach(o=>{
        orbitRings+=`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${o.rx.toFixed(1)}" ry="${o.ry.toFixed(1)}" fill="none" stroke="${o.color}" stroke-width="0.6" opacity="0.28" stroke-dasharray="3 5" transform="rotate(${o.rot} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
      });

      // Planet: solid fill so satellites don't show through.
      // Glow is drawn BEFORE satellites (behind them); body drawn AFTER (on top).
      const planetGlow=`
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(pr*2.4).toFixed(1)}" fill="${a1}" opacity="0.15" filter="url(#${uid}bf)"/>`;
      const planetBody=`
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${pr.toFixed(1)}" fill="${a1}" opacity="1"/>
        <circle cx="${(cx-pr*0.3).toFixed(1)}" cy="${(cy-pr*0.3).toFixed(1)}" r="${(pr*0.28).toFixed(1)}" fill="${a2}" opacity="0.22"/>`;

      // Satellites: CORRECT pattern — <g transform="translate(x,y)"> animates,
      // child <circle cx="0" cy="0"> stays at origin of the group
      let sats='';
      orbits.forEach((o,i)=>{
        const satR=o.sat.toFixed(2);
        if(doAnimate){
          const vals=orbitVals(o.rx,o.ry,o.rot,o.phase,48);
          const firstPt=vals.split(';')[0];
          sats+=`<g transform="translate(${firstPt})">
            <animateTransform attributeName="transform" type="translate"
              dur="${o.period}s" repeatCount="indefinite" calcMode="linear"
              values="${vals}"/>
            <circle cx="0" cy="0" r="${satR}" fill="${o.color}" opacity="0.82"/>
          </g>`;
        } else {
          const ang=o.phase*Math.PI*2, r=o.rot*Math.PI/180;
          const ex=o.rx*Math.cos(ang), ey=o.ry*Math.sin(ang);
          const sx=cx + ex*Math.cos(r) - ey*Math.sin(r);
          const sy=cy + ex*Math.sin(r) + ey*Math.cos(r);
          sats+=`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${satR}" fill="${o.color}" opacity="0.82"/>`;
        }
      });

      const defs=`<defs>
        <filter id="${uid}bf" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="18"/></filter>
      </defs>`;

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${defs}${stars}${planetGlow}${orbitRings}${sats}${planetBody}
      </svg>`;
    },

    variantSvg(w,h,a1,a2,style,doAnimateOpt){
      const doAnimate = doAnimateOpt === false ? false : !!(this.animated && _layoutAnimated);
      const st = style || 'title';
      if(st === 'void'){
        return this._buildVoid(w,h,a1,a2,true,doAnimate) || '';
      }
      if(st === 'content') return this.contentSvg(w,h,a1,a2,doAnimate);
      return this.titleSvg(w,h,a1,a2,doAnimate);
    },

    _buildVoid(w,h,a1,a2,isTitle,doAnimate){
      const uid='sp'+Math.random().toString(36).slice(2,7);
      const rng=s=>{let x=Math.sin(s*91.3+17.4)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(2);
      const midBegin=(seed,dur,lo,hi)=>{const p=lo+rng(seed)*(hi-lo);return(-p*dur).toFixed(2);};
      const ti=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx
        :(typeof selTheme!=='undefined'&&selTheme>=0?selTheme:-1);
      const theme=ti>=0&&typeof THEMES!=='undefined'?THEMES[ti]:null;
      const isLight=theme&&theme.dark===false;
      const cx=w*0.5, cy=h*0.5;
      const focal=Math.min(w,h)*0.22;
      const aspect=h/Math.max(1,w);
      const zFar=1, zNear=0.055;
      const dz=0.05;
      const nZ=5;
      const zs=[];
      for(let k=0;k<nZ;k++) zs.push(zFar+(zNear-zFar)*k/(nZ-1));
      const pos=(ux,uy,z)=>({x:cx+ux*focal/z, y:cy+uy*(focal*aspect)/z});

      let svg=`<defs>
        <radialGradient id="${uid}glow" cx="50%" cy="50%" r="42%">
          <stop offset="0%" stop-color="${isLight?a1:'#fff'}" stop-opacity="${isLight?0.10:0.14}"/>
          <stop offset="55%" stop-color="${a2}" stop-opacity="${isLight?0.04:0.05}"/>
          <stop offset="100%" stop-opacity="0"/>
        </radialGradient>
      </defs>`;
      svg+=`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Math.min(w,h)*0.38)}" fill="url(#${uid}glow)"/>`;

      const nDust=isTitle?28:16;
      for(let i=0;i<nDust;i++){
        const ang=rng(i*11+2)*Math.PI*2;
        const rho=0.08+rng(i*11+3)*0.55;
        const z=0.35+rng(i*11+4)*0.6;
        const p=pos(Math.cos(ang)*rho, Math.sin(ang)*rho, z);
        const r=(0.35+rng(i*11+5)*(isLight?1.3:1.0)).toFixed(2);
        const col=rng(i*11+6)>0.55?a1:(rng(i*11+7)>0.5?a2:(isLight?a1:'#fff'));
        const op=(isLight?0.22:0.12)+rng(i*11+8)*(isLight?0.38:0.32);
        if(doAnimate){
          const dur=(2.4+rng(i*11+9)*3.2).toFixed(1);
          const beg=midBegin(i*11+10,+dur,0.05,0.95);
          const lo=(op*0.35).toFixed(2);
          svg+=`<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${r}" fill="${col}" opacity="${op.toFixed(2)}">
            <animate attributeName="opacity" values="${op.toFixed(2)};${lo};${op.toFixed(2)}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
          </circle>`;
        }else{
          svg+=`<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${r}" fill="${col}" opacity="${op.toFixed(2)}"/>`;
        }
      }

      const n=isTitle?56:32;
      for(let i=0;i<n;i++){
        const seed=i*23+401;
        const ang=rng(seed)*Math.PI*2;
        const rho=0.18+rng(seed+1)*0.92;
        const ux=Math.cos(ang)*rho, uy=Math.sin(ang)*rho;
        const col=rng(seed+2)>0.62?a1:(rng(seed+3)>0.45?a2:(isLight?a1:'#fff'));
        const swFar=(0.35+rng(seed+4)*0.35).toFixed(2);
        const swNear=(1.35+rng(seed+5)*(isTitle?1.8:1.35)).toFixed(2);
        const peak=(isLight?0.55:0.72)+rng(seed+6)*0.28;
        const samples=zs.map(z=>{
          const head=pos(ux,uy,z);
          const tail=pos(ux,uy,Math.min(zFar,z+dz));
          return {hx:head.x,hy:head.y,tx:tail.x,ty:tail.y};
        });
        const xs1=samples.map(s=>f(s.tx)).join(';');
        const ys1=samples.map(s=>f(s.ty)).join(';');
        const xs2=samples.map(s=>f(s.hx)).join(';');
        const ys2=samples.map(s=>f(s.hy)).join(';');
        const durNum=1.1+rng(seed+8)*6.9;
        const dur=durNum.toFixed(2);
        const beg=midBegin(seed+9,durNum,0.02,0.96);
        if(doAnimate){
          svg+=`<line x1="${xs1.split(';')[0]}" y1="${ys1.split(';')[0]}" x2="${xs2.split(';')[0]}" y2="${ys2.split(';')[0]}" stroke="${col}" stroke-width="${swFar}" stroke-linecap="round" opacity="0">
            <animate attributeName="x1" values="${xs1}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="y1" values="${ys1}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="x2" values="${xs2}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="y2" values="${ys2}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="stroke-width" values="${swFar};${swFar};${(+swFar*0.7+(+swNear)*0.3).toFixed(2)};${swNear}" keyTimes="0;0.35;0.7;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0;${(peak*0.35).toFixed(2)};${peak.toFixed(2)};${peak.toFixed(2)};0" keyTimes="0;0.12;0.42;0.86;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
          </line>
          <circle cx="${xs2.split(';')[0]}" cy="${ys2.split(';')[0]}" r="${(+swFar*0.7).toFixed(2)}" fill="${col}" opacity="0">
            <animate attributeName="cx" values="${xs2}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="cy" values="${ys2}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="r" values="${(+swFar*0.65).toFixed(2)};${(+swNear*0.55).toFixed(2)}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0;${(peak*0.5).toFixed(2)};${Math.min(1,peak+0.12).toFixed(2)};0" keyTimes="0;0.14;0.82;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
          </circle>`;
        }else{
          const t=0.18+rng(seed+10)*0.62;
          const z=zFar+(zNear-zFar)*t*t;
          const head=pos(ux,uy,z);
          const tail=pos(ux,uy,Math.min(zFar,z+dz));
          const sw=(+swFar+(+swNear-+swFar)*t).toFixed(2);
          svg+=`<line x1="${f(tail.x)}" y1="${f(tail.y)}" x2="${f(head.x)}" y2="${f(head.y)}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" opacity="${peak.toFixed(2)}"/>
            <circle cx="${f(head.x)}" cy="${f(head.y)}" r="${(+sw*0.55).toFixed(2)}" fill="${col}" opacity="${Math.min(1,peak+0.1).toFixed(2)}"/>`;
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${svg}</svg>`;
    },

    glowSvg(w,h){
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"></svg>`;
    },

    buildWarpCfg(w,h,a1,a2,isTitle,doAnim){
      const ti=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx
        :(typeof selTheme!=='undefined'&&selTheme>=0?selTheme:-1);
      const theme=ti>=0&&typeof THEMES!=='undefined'?THEMES[ti]:null;
      return {
        w:w, h:h, a1:a1, a2:a2,
        isTitle: !!isTitle,
        animated: doAnim!==false,
        isLight: !!(theme && theme.dark===false)
      };
    },

    titleSvg(w,h,a1,a2,doAnimate){
      return this._build(w,h,a1,a2,true, doAnimate!==false);
    },
    contentSvg(w,h,a1,a2,doAnimate){
      return this._build(w,h,a1,a2,false, doAnimate!==false);
    },
  tplVariants(isRu){ return _themeTplFor('Cosmos', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

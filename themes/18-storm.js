/** 18 — Storm */
(function(){
window._THEME_18_STORM = {
name:'Гроза', nameEn:'Storm',
    desc:'Грозовые тучи, вспышки молний, ливень',descEn:'Storm clouds, lightning flashes, downpour',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate,mode)=>{
      const rainOnly = mode === 'rain';
      const uid='stm'+Math.random().toString(36).slice(2,7);
      const rng=s=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(1);
      const sp='0.35 0 0.65 1';
      const midBegin=(seed,dur,lo,hi)=>{const p=lo+rng(seed)*(hi-lo);return(-p*dur).toFixed(2);};
      const cx0=w*0.5,cy0=h*0.5,zoneRx=w*0.34,zoneRy=h*0.3;
      const inCenter=(x,y)=>{const dx=(x-cx0)/zoneRx,dy=(y-cy0)/zoneRy;return dx*dx+dy*dy<1;};

      function boltPath(x0,segs,spread,branch){
        let pts=[[x0,-12]],cx=x0;
        const sh=(h*0.72)/segs;
        for(let i=1;i<=segs;i++){
          cx+=((rng(x0+i*11+branch)-0.5)*spread);
          pts.push([cx,(sh*i-8).toFixed(1)]);
        }
        let d=`M ${pts[0][0].toFixed(1)},${pts[0][1]} `+pts.slice(1).map(p=>`L ${p[0].toFixed(1)},${p[1]}`).join(' ');
        if(branch%2===0&&segs>5){
          const fork=pts[Math.floor(segs*0.55)];
          const fx=fork[0]+spread*0.35,fy=+fork[1]+sh*0.9;
          d+=` M ${fork[0].toFixed(1)},${fork[1]} L ${fx.toFixed(1)},${fy.toFixed(1)} L ${(fx+spread*0.2).toFixed(1)},${(fy+sh*0.7).toFixed(1)}`;
        }
        return d;
      }

      let svg=`<defs>
        <linearGradient id="${uid}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${a2}" stop-opacity="0.18"/><stop offset="55%" stop-color="${a1}" stop-opacity="0.08"/><stop offset="100%" stop-color="#0a0e1a" stop-opacity="0.22"/></linearGradient>
        <linearGradient id="${uid}bolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity="0"/><stop offset="35%" stop-color="#e8f4ff" stop-opacity="1"/><stop offset="100%" stop-color="${a1}" stop-opacity="0.85"/></linearGradient>
        <radialGradient id="${uid}puff" cx="42%" cy="38%" r="58%"><stop offset="0%" stop-color="#e8eef8" stop-opacity="0.42"/><stop offset="45%" stop-color="${a2}" stop-opacity="0.28"/><stop offset="78%" stop-color="${a1}" stop-opacity="0.16"/><stop offset="100%" stop-color="${a1}" stop-opacity="0"/></radialGradient>
        <radialGradient id="${uid}puffD" cx="50%" cy="62%" r="55%"><stop offset="0%" stop-color="${a1}" stop-opacity="0.22"/><stop offset="60%" stop-color="${a1}" stop-opacity="0.12"/><stop offset="100%" stop-color="${a1}" stop-opacity="0"/></radialGradient>
        <filter id="${uid}cloud"><feGaussianBlur stdDeviation="${isTitle?9:7}"/></filter>
        <filter id="${uid}glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#${uid}sky)"/>`;

      if(!rainOnly){
        const puffTpl=[
          {ox:0,oy:0,rx:1.00,ry:0.72,fill:'puff'},
          {ox:-0.42,oy:0.14,rx:0.72,ry:0.58,fill:'puff'},
          {ox:0.44,oy:0.10,rx:0.78,ry:0.62,fill:'puff'},
          {ox:-0.20,oy:-0.18,rx:0.58,ry:0.48,fill:'puff'},
          {ox:0.24,oy:-0.14,rx:0.52,ry:0.44,fill:'puff'},
          {ox:0.58,oy:0.06,rx:0.62,ry:0.50,fill:'puff'},
          {ox:-0.55,oy:0.08,rx:0.55,ry:0.46,fill:'puff'},
          {ox:0.08,oy:0.22,rx:0.85,ry:0.55,fill:'puffD'},
          {ox:-0.08,oy:0.28,rx:0.70,ry:0.48,fill:'puffD'},
        ];
        function cloudCluster(cx,cy,baseW,baseH,op,drift,dur,seed){
          const x0=f(cx),x1=f(cx+drift);
          const y0=f(cy);
          const beg=midBegin(seed,dur,0.1,0.9);
          const opLo=(op*0.72).toFixed(2),opHi=op.toFixed(2);
          let inner='';
          puffTpl.forEach((p,j)=>{
            const px=f(cx+p.ox*baseW),py=f(cy+p.oy*baseH);
            const prx=f(p.rx*baseW*0.5),pry=f(p.ry*baseH*0.5);
            const fo=(op*(0.82+rng(seed+j*3)*0.18)).toFixed(2);
            const grad=p.fill==='puffD'?`url(#${uid}puffD)`:`url(#${uid}puff)`;
            inner+=`<ellipse cx="${px}" cy="${py}" rx="${prx}" ry="${pry}" fill="${grad}" opacity="${fo}"/>`;
          });
          const body=`<g filter="url(#${uid}cloud)" opacity="${opHi}">${inner}</g>`;
          if(!doAnimate)return body;
          return `<g>
            ${body}
            <animateTransform attributeName="transform" type="translate" values="0,0;${f(drift)},0;0,0" dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp}"/>
            <animate attributeName="opacity" values="${opHi};${opLo};${opHi}" dur="${(dur*0.88).toFixed(1)}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp}"/>
          </g>`;
        }

        const cloudSpecs=isTitle?[
          {cx:0.20*w,cy:0.09*h,w:w*0.34,h:h*0.14,op:0.88,drift:w*0.04,dur:28},
          {cx:0.58*w,cy:0.06*h,w:w*0.40,h:h*0.16,op:0.82,drift:-w*0.035,dur:32},
          {cx:0.84*w,cy:0.11*h,w:w*0.28,h:h*0.12,op:0.76,drift:w*0.028,dur:26},
          {cx:0.40*w,cy:0.15*h,w:w*0.24,h:h*0.10,op:0.65,drift:-w*0.022,dur:24},
        ]:[
          {cx:0.14*w,cy:0.08*h,w:w*0.30,h:h*0.12,op:0.72,drift:w*0.03,dur:30},
          {cx:0.74*w,cy:0.07*h,w:w*0.32,h:h*0.13,op:0.68,drift:-w*0.025,dur:28},
        ];
        cloudSpecs.forEach((c,i)=>{svg+=cloudCluster(c.cx,c.cy,c.w,c.h,c.op,c.drift,c.dur,i*19+3);});
      }

      const nRain=rainOnly?(isTitle?130:70):(isTitle?110:58);
      const baseWind=w*(isTitle?0.11:0.09);
      for(let i=0;i<nRain;i++){
        const seed=i*4+90;
        let rx=rng(seed)*w;
        if(!isTitle&&inCenter(rx,h*0.5))rx=rng(seed+50)*w;
        const rl=10+rng(seed+2)*(isTitle?32:22);
        const op=(0.05+rng(seed+3)*(isTitle?0.14:0.10)).toFixed(2);
        const sw=(0.5+rng(seed+4)*1.4).toFixed(1);
        const col=rng(seed+5)>0.55?a2:a1;
        const wind=baseWind*(0.75+rng(seed+8)*0.5);
        const fall=h+rl*2;
        const vlen=Math.sqrt(wind*wind+fall*fall);
        const dx=(wind/vlen*rl),dy=(fall/vlen*rl);
        if(doAnimate){
          const dur=(0.35+rng(seed+6)*0.55).toFixed(2);
          const beg=midBegin(seed+7,+dur,0,1);
          const xEnd=f(rx+wind),yEnd=f(h+rl);
          svg+=`<g opacity="${op}">
            <line x1="0" y1="0" x2="${f(dx)}" y2="${f(dy)}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/>
            <animateTransform attributeName="transform" type="translate" from="${f(rx)} -${f(rl)}" to="${xEnd} ${yEnd}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
          </g>`;
        }else{
          const t=rng(seed+1);
          const ty=-rl+t*(h+rl*2);
          const tx=rx+wind*t;
          svg+=`<line x1="${f(tx)}" y1="${f(ty)}" x2="${f(tx+dx)}" y2="${f(ty+dy)}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" opacity="${op}"/>`;
        }
      }

      if(!rainOnly){
        const boltSpecs=isTitle?[
          {x:0.22,segs:9,spread:w*0.07,cycle:8.5,peak:0.92,sw:3.2,flash:0.14},
          {x:0.68,segs:8,spread:w*0.06,cycle:11.2,peak:0.78,sw:2.6,flash:0.10},
          {x:0.48,segs:7,spread:w*0.045,cycle:14.8,peak:0.55,sw:2.0,flash:0.07},
        ]:[
          {x:0.28,segs:7,spread:w*0.055,cycle:10.5,peak:0.72,sw:2.4,flash:0.09},
          {x:0.74,segs:6,spread:w*0.05,cycle:13.2,peak:0.50,sw:1.8,flash:0.06},
        ];
        boltSpecs.forEach((b,i)=>{
          const bx=f(b.x*w);
          const path=boltPath(b.x*w,b.segs,b.spread,i);
          const cycle=b.cycle.toFixed(1);
          const beg=midBegin(i*53+200,b.cycle,0.05,0.95);
          if(doAnimate){
            svg+=`<g opacity="0" filter="url(#${uid}glow)">
              <path d="${path}" fill="none" stroke="url(#${uid}bolt)" stroke-width="${b.sw}" stroke-linecap="round" stroke-linejoin="round"/>
              <animate attributeName="opacity" values="0;0;0;${b.peak};${(b.peak*0.5).toFixed(2)};0;0;0" keyTimes="0;0.38;0.40;0.42;0.44;0.50;0.52;1" dur="${cycle}s" begin="${beg}s" repeatCount="indefinite"/>
            </g>
            <rect width="${w}" height="${h}" fill="#eef6ff" opacity="0">
              <animate attributeName="opacity" values="0;0;0;${b.flash};0;0;0;0" keyTimes="0;0.38;0.40;0.42;0.46;0.50;0.52;1" dur="${cycle}s" begin="${beg}s" repeatCount="indefinite"/>
            </rect>`;
          }else svg+=`<path d="${path}" fill="none" stroke="url(#${uid}bolt)" stroke-width="${b.sw}" stroke-linecap="round" stroke-linejoin="round" opacity="${(b.peak*0.65).toFixed(2)}" filter="url(#${uid}glow)"/>`;
        });
      }

      const nMist=isTitle?28:14;
      for(let i=0;i<nMist;i++){
        const seed=i*3+400;
        const mx=rng(seed)*w,my=h*(0.55+rng(seed+1)*0.42);
        const mr=(1.5+rng(seed+2)*3.5).toFixed(1);
        const mop=(0.03+rng(seed+3)*0.06).toFixed(2);
        if(doAnimate){
          const dur=(1.2+rng(seed+4)*2.2).toFixed(1);
          const beg=midBegin(seed+5,+dur,0,1);
          svg+=`<circle cx="${f(mx)}" cy="${f(my)}" r="${mr}" fill="${a2}" opacity="${mop}">
            <animateTransform attributeName="transform" type="translate" values="0 0; ${f((rng(seed+6)-0.5)*18)} ${f(-8-rng(seed+7)*20)}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0;${mop};0" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
          </circle>`;
        }
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">${svg}</svg>`;
    },
    variantSvg(w,h,a1,a2,style){
      const doAnimate=!!(this.animated && typeof _layoutAnimated!=='undefined' && _layoutAnimated);
      if(style==='rain') return this._build(w,h,a1,a2,true,doAnimate,'rain');
      return this._build(w,h,a1,a2,style!=='content',doAnimate,'storm');
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false,'storm');},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false,'storm');},
  tplVariants(isRu){ return _themeTplFor('Storm', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

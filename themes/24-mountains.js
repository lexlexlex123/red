/** 24 — Mountains */
(function(){
window._THEME_24_MOUNTAINS = {
name:'Горы', nameEn:'Mountains',
    desc:'Реалистичные хребты с глубиной и снегом',descEn:'Realistic ridges, depth and snow',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='mt'+Math.random().toString(36).slice(2,7);
      const rng=(s)=>{let x=Math.sin(s*127.1+311.7)*43758.5453;return x-Math.floor(x);};
      const f=(n)=>n.toFixed(1);

      function ridgePts(seed, yBase, amp, nPeaks){
        const peaks=[];
        for(let i=0;i<nPeaks;i++){
          const t=(i+0.22+rng(seed+i*2)*0.56)/nPeaks;
          peaks.push({
            x:w*Math.max(0.02, Math.min(0.98, t)),
            height:amp*(0.48+rng(seed+i+30)*0.52),
            width:w*(0.10+rng(seed+i+50)*0.16)
          });
        }
        const steps=96;
        const pts=[];
        for(let i=0;i<=steps;i++){
          const x=w*i/steps;
          let lift=amp*0.04;
          peaks.forEach((p)=>{
            const t=(x-p.x)/Math.max(8,p.width);
            const at=Math.abs(t);
            if(at<1.55){
              const core=Math.pow(Math.max(0,1-at),1.45);
              const spike=Math.exp(-at*at*5.2);
              lift+=p.height*(core*0.68+spike*0.42);
            }
          });
          lift+=amp*0.09*(rng(seed+i*0.71)-0.5);
          lift+=amp*0.04*(rng(seed+i*1.9+9)-0.5);
          pts.push({x, y:yBase-lift});
        }
        pts[0].x=0;
        pts[pts.length-1].x=w;
        return pts;
      }

      function ridgePath(pts){
        let d=`M 0 ${f(h)} L ${f(pts[0].x)} ${f(pts[0].y)}`;
        for(let i=0;i<pts.length-1;i++){
          const a=pts[i], b=pts[i+1];
          const dx=(b.x-a.x)/3;
          d+=` C ${f(a.x+dx)} ${f(a.y)} ${f(b.x-dx)} ${f(b.y)} ${f(b.x)} ${f(b.y)}`;
        }
        d+=` L ${f(w)} ${f(h)} Z`;
        return d;
      }

      function snowCaps(pts, amp, col, op){
        let out='';
        for(let i=2;i<pts.length-2;i++){
          if(pts[i].y>=pts[i-1].y || pts[i].y>=pts[i+1].y) continue;
          const depth=((pts[i-1].y+pts[i+1].y)*0.5)-pts[i].y;
          if(depth<amp*0.14) continue;
          const drop=depth*(0.28+rng(80+i)*0.12);
          const xL=pts[i].x*0.62+pts[i-1].x*0.38;
          const xR=pts[i].x*0.58+pts[i+1].x*0.42;
          out+=`<path d="M ${f(xL)} ${f(pts[i].y+drop)} L ${f(pts[i].x)} ${f(pts[i].y+amp*0.01)} L ${f(xR)} ${f(pts[i].y+drop*1.18)} Z" fill="${col}" opacity="${op}"/>`;
        }
        return out;
      }

      function shadeBand(pts, col, op){
        let d='';
        for(let i=1;i<pts.length-1;i++){
          if(pts[i].x<w*0.42) continue;
          if(!d) d=`M ${f(pts[i].x)} ${f(pts[i].y)}`;
          d+=` L ${f(pts[i].x)} ${f(pts[i].y)}`;
        }
        if(!d) return '';
        d+=` L ${f(w)} ${f(h)} L ${f(w*0.55)} ${f(h)} Z`;
        return `<path d="${d}" fill="${col}" opacity="${op}"/>`;
      }

      const layers=isTitle?[
        {seed:11, yBase:h, amp:h*0.84, peaks:4, fill:'far', op:0.20, snow:0.18, shade:0.04},
        {seed:23, yBase:h, amp:h*0.62, peaks:3, fill:'mid', op:0.28, snow:0.22, shade:0.06},
        {seed:37, yBase:h, amp:h*0.44, peaks:4, fill:'near', op:0.36, snow:0.16, shade:0.08},
        {seed:49, yBase:h, amp:h*0.26, peaks:5, fill:'foot', op:0.46, snow:0.00, shade:0.10}
      ]:[
        {seed:11, yBase:h, amp:h*0.11, peaks:4, fill:'mid', op:0.22, snow:0.10, shade:0.04},
        {seed:29, yBase:h, amp:h*0.06, peaks:5, fill:'foot', op:0.34, snow:0.00, shade:0.06}
      ];

      let defs=`<defs>
        <linearGradient id="${uid}sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${a2}" stop-opacity="${isTitle?0.20:0.04}"/>
          <stop offset="42%" stop-color="${a1}" stop-opacity="${isTitle?0.08:0.02}"/>
          <stop offset="100%" stop-color="${a1}" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="${uid}sun" cx="78%" cy="${isTitle?'16%':'88%'}" r="28%">
          <stop offset="0%" stop-color="${a2}" stop-opacity="${isTitle?0.55:0.12}"/>
          <stop offset="38%" stop-color="${a1}" stop-opacity="${isTitle?0.16:0.05}"/>
          <stop offset="100%" stop-color="${a1}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${uid}far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${a2}" stop-opacity="0.85"/>
          <stop offset="55%" stop-color="${a1}" stop-opacity="0.70"/>
          <stop offset="100%" stop-color="${a1}" stop-opacity="0.95"/>
        </linearGradient>
        <linearGradient id="${uid}mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${a2}" stop-opacity="0.70"/>
          <stop offset="40%" stop-color="${a1}" stop-opacity="0.80"/>
          <stop offset="100%" stop-color="${a1}" stop-opacity="1"/>
        </linearGradient>
        <linearGradient id="${uid}near" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stop-color="${a2}" stop-opacity="0.45"/>
          <stop offset="35%" stop-color="${a1}" stop-opacity="0.88"/>
          <stop offset="100%" stop-color="${a1}" stop-opacity="1"/>
        </linearGradient>
        <linearGradient id="${uid}foot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${a1}" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="${a1}" stop-opacity="1"/>
        </linearGradient>
        <linearGradient id="${uid}haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${a2}" stop-opacity="0"/>
          <stop offset="45%" stop-color="${a2}" stop-opacity="${isTitle?0.14:0.08}"/>
          <stop offset="100%" stop-color="${a2}" stop-opacity="0"/>
        </linearGradient>
        <filter id="${uid}soft"><feGaussianBlur stdDeviation="${isTitle?7:3.5}"/></filter>
      </defs>`;

      const sunX=w*(isTitle?0.78:0.82);
      const sunY=h*(isTitle?0.16:0.90);
      const sunR=Math.min(w,h)*(isTitle?0.22:0.08);
      let body=`<rect width="${w}" height="${h}" fill="url(#${uid}sky)"/>`;
      if(isTitle){
        body+=`<circle cx="${f(sunX)}" cy="${f(sunY)}" r="${f(sunR)}" fill="url(#${uid}sun)"/>`;
        body+=`<circle cx="${f(sunX)}" cy="${f(sunY)}" r="${f(sunR*0.22)}" fill="${a2}" opacity="0.35"/>`;
      }

      layers.forEach((L, li)=>{
        const pts=ridgePts(L.seed, L.yBase, L.amp, L.peaks);
        const d=ridgePath(pts);
        const fill=`url(#${uid}${L.fill})`;
        const drift=doAnimate && li<2 ? (isTitle?w*0.012:w*0.006)*(li===0?1:-0.7) : 0;
        const dur=18+li*4;
        let g=`<path d="${d}" fill="${fill}" opacity="${L.op}"/>`;
        if(L.shade) g+=shadeBand(pts, a1, L.shade);
        if(L.snow) g+=snowCaps(pts, L.amp, a2, L.snow);
        const hazeY=Math.max(0, L.yBase-L.amp*0.55);
        const hazeH=Math.max(12, L.amp*0.22);
        g+=`<rect x="0" y="${f(hazeY)}" width="${f(w)}" height="${f(hazeH)}" fill="url(#${uid}haze)" filter="url(#${uid}soft)"/>`;
        if(drift){
          body+=`<g>
            ${g}
            <animateTransform attributeName="transform" type="translate" values="0,0;${f(drift)},0;0,0" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>`;
        } else {
          body+=`<g>${g}</g>`;
        }
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${defs}${body}</svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  tplVariants(isRu){ return _themeTplFor('Mountains', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

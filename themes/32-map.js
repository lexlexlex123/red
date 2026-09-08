/** 32 — Map */
(function(){
window._THEME_32_MAP = {
name:'Карта', nameEn:'Map',
    desc:'Контурная карта высот, медленный облёт камеры', descEn:'Height contour map, slow camera drift',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='map'+Math.random().toString(36).slice(2,7);
      const rng=s=>{let x=Math.sin(s*97.3+17.1)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(1);
      const sp='0.42 0 0.58 1';
      const midBegin=(seed,dur,lo,hi)=>{const p=lo+rng(seed)*(hi-lo);return(-p*dur).toFixed(2);};
      const ti=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx
        :(typeof selTheme!=='undefined'&&selTheme>=0?selTheme:-1);
      const theme=ti>=0&&typeof THEMES!=='undefined'?THEMES[ti]:null;
      const isLight=theme&&theme.dark===false;
      const isThumb=w<=400&&h<=220;
      let bgDefs='';
      let mapBgFill='';
      const themeBg=theme&&theme.bg?theme.bg:'';
      if(themeBg){
        // Same colour as layout thumbnails (button uses theme.bg under the SVG)
        const cols=String(themeBg).match(/#[0-9a-fA-F]{3,8}/g);
        const c1=cols?.[0]||themeBg, c2=cols?.[1]||c1;
        bgDefs=`<linearGradient id="${uid}mbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient>`;
        if(isThumb){
          bgDefs+=`<linearGradient id="${uid}mveil" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${a2}" stop-opacity="0.14"/><stop offset="100%" stop-color="${a1}" stop-opacity="0.10"/></linearGradient>`;
        }
        mapBgFill=`url(#${uid}mbg)`;
      }else if(isThumb){
        bgDefs=`<linearGradient id="${uid}mbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${a2}" stop-opacity="0.14"/><stop offset="100%" stop-color="${a1}" stop-opacity="0.10"/></linearGradient>`;
        mapBgFill=`url(#${uid}mbg)`;
      }else{
        mapBgFill=isLight?'#f4f6fa':'#12151c';
      }

      const mapScale=isTitle?2.75:2.35;
      const mapW=w*mapScale, mapH=h*mapScale;
      const zoneCx=w*0.5+(mapW-w)*0.42, zoneCy=h*0.5+(mapH-h)*0.38;
      const zoneR=w*(isTitle?0.22:0.3);
      const hills=[];
      const maxTry=isTitle?100:60;
      const want=isTitle?8:5;

      function hillFits(cx,cy,baseR){
        const pad=baseR*0.3+mapW*0.022;
        for(const h0 of hills){
          const dx=cx-h0.cx, dy=cy-h0.cy;
          const need=h0.baseR+baseR+pad;
          if(dx*dx+dy*dy<need*need) return false;
        }
        if(!isTitle){
          const dx=cx-zoneCx, dy=cy-zoneCy;
          if(dx*dx+dy*dy<zoneR*zoneR) return false;
        }
        return true;
      }

      for(let i=0;i<maxTry&&hills.length<want;i++){
        const s=i*29+61;
        const cx=rng(s)*mapW, cy=rng(s+1)*mapH;
        const baseR=Math.min(mapW,mapH)*(0.055+rng(s+2)*(isTitle?0.17:0.13));
        if(!hillFits(cx,cy,baseR)) continue;
        hills.push({
          cx, cy, baseR,
          levels:4+Math.floor(rng(s+5)*(isTitle?5:3)),
          seed:s+200,
          rxMul:0.82+rng(s+6)*0.38,
          ryMul:0.78+rng(s+7)*0.42,
          rot:rng(s+8)*36-18,
        });
      }

      function smoothRadius(hill,a){
        const s=hill.seed;
        return 1
          +0.1*Math.sin(a*2+s)
          +0.065*Math.cos(a*3+s*1.25)
          +0.04*Math.sin(a*4+s*0.85)
          +0.028*Math.cos(a*5+s*1.6);
      }

      function neighborInfluence(px,py,hill){
        let x=px, y=py;
        for(const o of hills){
          if(o===hill) continue;
          const dx=x-o.cx, dy=y-o.cy;
          const dist=Math.sqrt(dx*dx+dy*dy)||0.001;
          const reach=(hill.baseR+o.baseR)*1.08;
          if(dist>=reach) continue;
          const t=1-dist/reach;
          const push=t*t*o.baseR*0.2;
          x+=dx/dist*push;
          y+=dy/dist*push;
          const toward=o.baseR*0.06*t*(1-t)*4;
          x-=dx/dist*toward;
          y-=dy/dist*toward;
        }
        return [x,y];
      }

      function contourPts(hill,scale,nSeg){
        const pts=[], rad=hill.rot*Math.PI/180;
        for(let i=0;i<nSeg;i++){
          const a=(i/nSeg)*Math.PI*2;
          const r=hill.baseR*scale*smoothRadius(hill,a);
          const lx=Math.cos(a)*r*hill.rxMul;
          const ly=Math.sin(a)*r*hill.ryMul;
          const px=hill.cx+lx*Math.cos(rad)-ly*Math.sin(rad);
          const py=hill.cy+lx*Math.sin(rad)+ly*Math.cos(rad);
          pts.push(neighborInfluence(px,py,hill));
        }
        return pts;
      }

      function smoothClosedPath(pts){
        const n=pts.length;
        if(n<3) return '';
        let d=`M ${f(pts[0][0])},${f(pts[0][1])}`;
        for(let i=0;i<n;i++){
          const p0=pts[(i-1+n)%n], p1=pts[i], p2=pts[(i+1)%n], p3=pts[(i+2)%n];
          const c1x=p1[0]+(p2[0]-p0[0])/6, c1y=p1[1]+(p2[1]-p0[1])/6;
          const c2x=p2[0]-(p3[0]-p1[0])/6, c2y=p2[1]-(p3[1]-p1[1])/6;
          d+=` C ${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(p2[0])},${f(p2[1])}`;
        }
        return d+' Z';
      }

      let map='';
      if(mapBgFill) map+=`<rect width="${f(mapW)}" height="${f(mapH)}" fill="${mapBgFill}"/>`;
      if(isThumb&&themeBg) map+=`<rect width="${f(mapW)}" height="${f(mapH)}" fill="url(#${uid}mveil)"/>`;
      const gridOp=(isThumb||!isLight)?'0.06':'0.09';
      const gridStep=isTitle?44:52;
      for(let gx=0;gx<=mapW;gx+=gridStep){
        map+=`<line x1="${f(gx)}" y1="0" x2="${f(gx)}" y2="${f(mapH)}" stroke="${a2}" stroke-width="0.35" opacity="${gridOp}"/>`;
      }
      for(let gy=0;gy<=mapH;gy+=gridStep){
        map+=`<line x1="0" y1="${f(gy)}" x2="${f(mapW)}" y2="${f(gy)}" stroke="${a2}" stroke-width="0.35" opacity="${gridOp}"/>`;
      }

      hills.forEach((hill,hi)=>{
        for(let lv=1;lv<=hill.levels;lv++){
          const t=lv/hill.levels;
          const pts=contourPts(hill,t,48);
          const path=smoothClosedPath(pts);
          const isIndex=lv%4===0||lv===hill.levels;
          const sw=(isIndex?(isTitle?1.15:0.95):(isTitle?0.65:0.55)).toFixed(2);
          const strokeOp=((isThumb||!isLight)?(0.22+t*0.48):(0.28+t*0.42)).toFixed(2);
          const col=(lv+hi)%2===0?a1:a2;
          map+=`<path d="${path}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-opacity="${strokeOp}" stroke-linejoin="round" stroke-linecap="round"/>`;
        }
      });

      const panDur=isTitle?82:72;
      const dx=-(mapW-w), dy=-(mapH-h)*0.38;
      const beg=doAnimate?midBegin(88,panDur,0.06,0.94):'0';
      let cam;
      if(doAnimate){
        cam=`<g>
          ${map}
          <animateTransform attributeName="transform" type="translate"
            values="0,0; ${f(dx*0.42)},${f(dy*0.22)}; ${f(dx*0.78)},${f(dy*0.55)}; ${f(dx)},${f(dy)}; ${f(dx*0.35)},${f(dy*0.88)}; 0,0"
            keyTimes="0;0.22;0.45;0.62;0.82;1"
            dur="${panDur}s" begin="${beg}s" repeatCount="indefinite"
            calcMode="spline" keySplines="${sp};${sp};${sp};${sp};${sp}"/>
        </g>`;
      }else{
        cam=`<g transform="translate(${f(dx*0.48)},${f(dy*0.44)})">${map}</g>`;
      }

      const vigColor=isLight?a2:'#000';
      const vigOp=isLight?0.1:0.4;
      const compBg=isLight?'#ffffff':'#0a0e16';
      const compBgOp=isLight?0.82:0.72;
      let comp='';
      if(isTitle&&!isThumb){
        const R=Math.min(w,h)*0.052;
        const cx0=w*0.078, cy0=h*0.14;
        comp=`<g transform="translate(${f(cx0)},${f(cy0)})">
          <circle r="${f(R*1.12)}" fill="${compBg}" fill-opacity="${compBgOp}" stroke="${a1}" stroke-width="1.1" stroke-opacity="0.55"/>
          <circle r="${f(R*0.92)}" fill="none" stroke="${a2}" stroke-width="0.55" stroke-opacity="0.35"/>
          ${[0,45,90,135,180,225,270,315].map(deg=>{
            const a=deg*Math.PI/180, major=deg%90===0;
            const r0=R*(major?0.62:0.72), r1=R*(major?0.88:0.82);
            return `<line x1="${f(Math.sin(a)*r0)}" y1="${f(-Math.cos(a)*r0)}" x2="${f(Math.sin(a)*r1)}" y2="${f(-Math.cos(a)*r1)}" stroke="${major?a1:a2}" stroke-width="${major?0.9:0.45}" stroke-opacity="${major?0.75:0.35}" stroke-linecap="round"/>`;
          }).join('')}
          <g>
            ${doAnimate?`<animateTransform attributeName="transform" type="rotate" values="-5;4;-3;5;-5" keyTimes="0;0.25;0.5;0.75;1" dur="6.5s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp};${sp}"/>`:''}
            <path d="M 0 ${f(-R*0.78)} L ${f(-R*0.16)} ${f(R*0.06)} L 0 ${f(-R*0.2)} L ${f(R*0.16)} ${f(R*0.06)} Z" fill="${a1}" fill-opacity="0.92"/>
            <path d="M 0 ${f(R*0.78)} L ${f(-R*0.14)} ${f(-R*0.04)} L 0 ${f(R*0.16)} L ${f(R*0.14)} ${f(-R*0.04)} Z" fill="${a2}" fill-opacity="0.45"/>
          </g>
          <circle r="${f(R*0.1)}" fill="${isLight?a1:'#e8ecf4'}" fill-opacity="0.85"/>
          <text x="0" y="${f(-R*1.28)}" text-anchor="middle" fill="${a1}" font-size="${f(R*0.42)}" font-family="sans-serif" font-weight="700" opacity="0.9">N</text>
          <text x="${f(R*1.22)}" y="${f(R*0.12)}" text-anchor="middle" fill="${a2}" font-size="${f(R*0.28)}" font-family="sans-serif" opacity="0.55">E</text>
          <text x="0" y="${f(R*1.38)}" text-anchor="middle" fill="${a2}" font-size="${f(R*0.28)}" font-family="sans-serif" opacity="0.45">S</text>
          <text x="${f(-R*1.22)}" y="${f(R*0.12)}" text-anchor="middle" fill="${a2}" font-size="${f(R*0.28)}" font-family="sans-serif" opacity="0.45">W</text>
        </g>`;
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
        <defs>
          ${bgDefs}
          <clipPath id="${uid}vp"><rect width="${w}" height="${h}"/></clipPath>
          <radialGradient id="${uid}vig" cx="50%" cy="50%" r="72%">
            <stop offset="50%" stop-color="${vigColor}" stop-opacity="0"/>
            <stop offset="100%" stop-color="${vigColor}" stop-opacity="${vigOp}"/>
          </radialGradient>
        </defs>
        <g clip-path="url(#${uid}vp)">${cam}</g>
        ${isThumb?'':`<rect width="${w}" height="${h}" fill="url(#${uid}vig)" pointer-events="none"/>`}
        ${comp}
      </svg>`;
    },
    titleSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,true,d!==false);},
    contentSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,false,d!==false);},
  tplVariants(isRu){ return _themeTplFor('Map', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

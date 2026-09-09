/** 36 — Swamp */
(function(){
window._THEME_36_SWAMP = {
name:'Болото', nameEn:'Swamp',
    desc:'Кувшинка и ряска, круги на глубине', descEn:'Lily pad and duckweed, circles in the depth',
    animated: true,
    _leafD:'M457,0 L490,4 L524,12 L557,24 L585,38 L615,58 L641,80 L667,108 L692,142 L710,172 L730,214 L761,308 L778,396 L788,500 L788,630 L776,730 L767,770 L752,818 L722,882 L686,932 L655,962 L624,984 L593,1000 L560,1012 L508,1022 L420,1020 L386,1014 L336,1000 L257,966 L180,918 L138,884 L103,850 L77,820 L51,784 L17,718 L5,678 L0,646 L0,608 L3,594 L18,568 L44,542 L78,536 L85,530 L92,510 L100,502 L132,496 L139,490 L148,474 L178,470 L188,456 L196,450 L226,448 L230,446 L235,432 L261,430 L271,416 L290,408 L264,392 L252,378 L225,376 L204,362 L174,360 L162,350 L130,348 L109,334 L78,332 L71,328 L61,316 L37,312 L21,296 L16,284 L15,272 L22,248 L42,212 L74,170 L105,138 L151,100 L196,70 L245,44 L306,20 L361,6 L408,0 Z',
    _leafVB:[790,1024],
    _leafPoly(){
      if(this._leafPts) return this._leafPts;
      const pts=[];
      this._leafD.replace(/[ML]\s*([\d.]+),([\d.]+)/g,(_,x,y)=>{pts.push([+x,+y]);});
      this._leafPts=pts;
      return pts;
    },
    _inPoly(x,y,pts){
      let n=false;
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        const xi=pts[i][0], yi=pts[i][1], xj=pts[j][0], yj=pts[j][1];
        if(((yi>y)!==(yj>y)) && (x<(xj-xi)*(y-yi)/((yj-yi)||1e-6)+xi)) n=!n;
      }
      return n;
    },
    _leafPlace(w,h){
      const vbW=this._leafVB[0], vbH=this._leafVB[1];
      const s=(w*0.84)/vbW;
      return {x:w-vbW*s*0.99, y:(h-vbH*s)*0.5, s, w:vbW*s, h:vbH*s};
    },
    /** Two smaller lily pads — bottom-left & top-right (content slide). */
    _leafPlaceContent(w,h){
      const vbW=this._leafVB[0], vbH=this._leafVB[1];
      const baseS=((w*0.84)/vbW)*0.50;
      const s2=baseS*0.86;
      const bw=vbW*baseS, bh=vbH*baseS;
      const bw2=vbW*s2, bh2=vbH*s2;
      return [
        {x:-bw*0.22, y:h-bh*0.78, s:baseS, rot:-90, flipX:true, flipY:false, rotCx:0, rotCy:0, w:bw, h:bh},
        {x:w-bw2*0.78, y:-bh2*0.22, s:s2, rot:0, flipX:false, flipY:false, rotCx:0, rotCy:0, w:bw2, h:bh2},
      ];
    },
    _leafPlaceArc(w,h){
      const vbW=this._leafVB[0], vbH=this._leafVB[1];
      const baseS=((w*0.84)/vbW)*0.50;
      const sR=baseS*1.24;
      const bw=vbW*baseS, bh=vbH*baseS;
      const bwR=vbW*sR, bhR=vbH*sR;
      return [
        {x:-bw*0.22, y:-bh*0.35, s:baseS, rot:-90, flipX:true, flipY:false, rotCx:0, rotCy:0, w:bw, h:bh},
        {x:w-bwR*0.55, y:110, s:sR, rot:0, flipX:false, flipY:false, rotCx:0, rotCy:0, w:bwR, h:bhR},
      ];
    },
    _leafToLocal(cx,cy,leaf){
      let x=cx-(leaf.x||0), y=cy-(leaf.y||0);
      if(leaf.rot){
        const px=leaf.rotCx||0, py=leaf.rotCy||0;
        x-=px; y-=py;
        const rad=-leaf.rot*Math.PI/180;
        const c=Math.cos(rad), sn=Math.sin(rad);
        const nx=x*c-y*sn, ny=x*sn+y*c;
        x=nx+px; y=ny+py;
      }
      const sx=(leaf.flipX?-1:1)*(leaf.s||1);
      const sy=(leaf.flipY?-1:1)*(leaf.s||1);
      return [x/sx, y/sy];
    },
    _leafSvg(fill, leaf){
      const sx=(leaf.flipX?-leaf.s:leaf.s);
      const sy=(leaf.flipY?-leaf.s:leaf.s);
      const rcx=leaf.rotCx!=null?leaf.rotCx:0;
      const rcy=leaf.rotCy!=null?leaf.rotCy:0;
      let tr=`translate(${leaf.x.toFixed(1)},${leaf.y.toFixed(1)})`;
      if(leaf.rot) tr+=` rotate(${leaf.rot},${rcx.toFixed(1)},${rcy.toFixed(1)})`;
      tr+=` scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
      return `<g transform="${tr}"><path d="${this._leafD}" fill="${fill}"/></g>`;
    },
    _circleHitsLeaf(cx,cy,r,leaf){
      const pts=this._leafPoly();
      const pad=r+1.5;
      const [lx,ly]=this._leafToLocal(cx,cy,leaf);
      if(this._inPoly(lx,ly,pts)) return true;
      const n=12;
      for(let i=0;i<n;i++){
        const a=i/n*Math.PI*2;
        const [px,py]=this._leafToLocal(cx+Math.cos(a)*pad, cy+Math.sin(a)*pad, leaf);
        if(this._inPoly(px,py,pts)) return true;
      }
      return false;
    },
    _circleHitsLeaves(cx,cy,r,leaves){
      if(!leaves||!leaves.length) return false;
      for(let i=0;i<leaves.length;i++){
        if(this._circleHitsLeaf(cx,cy,r,leaves[i])) return true;
      }
      return false;
    },
    _pack(w,h,n,rMin,rMax,rng,seed0,avoid,leaves,gapScale){
      const out=[];
      const maxTry=n*90;
      for(let t=1;t<=maxTry && out.length<n;t++){
        const r=rMin+rng(seed0+t)*(rMax-rMin);
        const x=r+rng(seed0+t+0.31)*(w-2*r);
        const y=r+rng(seed0+t+0.73)*(h-2*r);
        if(this._circleHitsLeaves(x,y,r,leaves)) continue;
        let ok=true;
        const pool=avoid?avoid.concat(out):out;
        for(let i=0;i<pool.length;i++){
          const c=pool[i];
          const dx=c.x-x, dy=c.y-y;
          const need=c.r+r+Math.max(0.8, Math.min(c.r,r)*gapScale);
          if(dx*dx+dy*dy<need*need){ ok=false; break; }
        }
        if(ok) out.push({x,y,r,seed:seed0+t});
      }
      return out;
    },
    /** Max sway amplitude so neighbours never overlap during animation. */
    _safeAmp(c, pool, leaves, capMul){
      const mul=capMul!=null?capMul:0.32;
      let maxA=c.r*mul;
      const hardCap=mul>=0.45?24:(mul>=0.28?16:20);
      if(maxA>hardCap) maxA=hardCap;
      for(let i=0;i<pool.length;i++){
        const o=pool[i];
        if(o===c) continue;
        const dx=o.x-c.x, dy=o.y-c.y;
        const d=Math.sqrt(dx*dx+dy*dy);
        const slack=d-c.r-o.r;
        if(slack>0) maxA=Math.min(maxA, slack*0.46);
      }
      if(leaves&&leaves.length){
        const pts=this._leafPoly();
        const probes=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[0.7,0.7],[-0.7,0.7]];
        probes.forEach(([px,py])=>{
          for(let li=0;li<leaves.length;li++){
            const [lx,ly]=this._leafToLocal(c.x+px*c.r*0.5, c.y+py*c.r*0.5, leaves[li]);
            if(this._inPoly(lx,ly,pts)) maxA=Math.min(maxA, c.r*0.18);
          }
        });
      }
      const floor=Math.max(mul>=0.45?2.2:1.4, c.r*(mul>=0.45?0.38:0.28));
      return Math.max(floor, maxA);
    },
    _floatCirc(c,col,op,doAnimate,filterId,opts){
      const f=n=>n.toFixed(1);
      const filt=filterId?` filter="url(#${filterId})"`:'';
      if(!doAnimate){
        return `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(c.r)}" fill="${col}" fill-opacity="${op}"${filt}/>`;
      }
      const rng=s=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const o=opts||{};
      const slow=!!o.slow;
      const ampMul=o.ampMul!=null?o.ampMul:1;
      const amp=Math.max(1.2, (o.safeAmp!=null?o.safeAmp:Math.max(2.5, c.r*0.32))*ampMul);
      const ax=(amp*(0.82+rng(c.seed+2)*0.28)).toFixed(2);
      const ay=(amp*(0.72+rng(c.seed+3)*0.28)).toFixed(2);
      const durBase=slow?8:4.2;
      const durSpan=slow?6:2.8;
      const dur=(durBase+rng(c.seed+4)*durSpan).toFixed(1);
      const beg=(-(0.05+rng(c.seed+5)*0.92)*+dur).toFixed(2);
      const bx=(+ax*0.62).toFixed(2), by=(+ay*0.55).toFixed(2);
      const nx=(-ax*0.88).toFixed(2), ny=(+ay*0.72).toFixed(2);
      return `<g transform="translate(${f(c.x)},${f(c.y)})"><g>
        <animateTransform attributeName="transform" type="translate"
          values="0 0; ${ax} ${by}; ${bx} ${ay}; 0 0; ${nx} ${ny}; 0 0"
          keyTimes="0;0.2;0.4;0.55;0.78;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"/>
        <circle cx="0" cy="0" r="${f(c.r)}" fill="${col}" fill-opacity="${op}"${filt}/>
      </g></g>`;
    },
    _schemeCols(a1,a2){
      const th=typeof _activeThemeForScheme==='function'?_activeThemeForScheme():(typeof _activeTheme==='function'?_activeTheme():null);
      const sw=(col,row,fb)=>(th&&typeof _schemeSwatchColor==='function'&&_schemeSwatchColor(th,col,row))||fb;
      return {c19:sw(0,8,a2||'#4ade80'), c18:sw(0,7,a1||'#86efac')};
    },
    _build(w,h,a1,a2,style,doAnimate){
      const st=style||'title';
      const isTitle=st==='title';
      const isArc=st==='arc';
      const uid='swp'+Math.random().toString(36).slice(2,7);
      const rng=s=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const {c19,c18}=this._schemeCols(a1,a2);
      const m=Math.min(w,h);
      const leaves=isTitle?[this._leafPlace(w,h)]:(isArc?this._leafPlaceArc(w,h):this._leafPlaceContent(w,h));
      const areaK=Math.min(1.85, Math.max(0.5,(w*h)/(960*540)));
      const nBlur=Math.round(48*areaK*(isTitle?1:0.65));
      const sharpMul=isTitle?1:3;
      const nBig=Math.round(52*areaK*sharpMul);
      const nMid=Math.round(78*areaK*sharpMul);
      const nTiny=Math.round(110*areaK*sharpMul);
      const blur=this._pack(w,h,nBlur, m*0.018, m*0.058, rng, 401, null, null, 0.14);
      const big=this._pack(w,h,nBig, m*0.014, m*0.024, rng, 907, null, leaves, isTitle?0.32:0.28);
      const mid=this._pack(w,h,nMid, m*0.008, m*0.014, rng, 1403, big, leaves, isTitle?0.28:0.24);
      const tiny=this._pack(w,h,nTiny, m*0.004, m*0.008, rng, 2201, big.concat(mid), leaves, isTitle?0.26:0.22);
      const sharp=big.concat(mid,tiny);
      const blurStd=Math.max(1.6, m*0.005).toFixed(1);
      let svg=`<defs>
        <filter id="${uid}d" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="${blurStd}"/>
        </filter>
      </defs>`;
      blur.forEach(c=>{
        const amp=this._safeAmp(c, blur, null, 0.48);
        svg+=this._floatCirc(c,c18, 0.22+rng(c.seed+9)*0.12, doAnimate, uid+'d', {slow:true, safeAmp:amp, ampMul:1.35});
      });
      sharp.forEach(c=>{
        const amp=this._safeAmp(c, sharp, leaves, 0.34);
        svg+=this._floatCirc(c,c19, 0.92, doAnimate, null, {safeAmp:amp});
      });
      leaves.forEach(lf=>{ svg+=this._leafSvg(c19, lf); });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${svg}</svg>`;
    },
    variantSvg(w,h,a1,a2,style,doAnimate){
      const anim=doAnimate===false?false:(this.animated&&((typeof _layoutAnimated!=='undefined')?_layoutAnimated:true));
      return this._build(w,h,a1,a2,style||'title',anim);
    },
    titleSvg(w,h,a1,a2,d){ return this._build(w,h,a1,a2,'title',d!==false); },
    contentSvg(w,h,a1,a2,d){ return this._build(w,h,a1,a2,'content',d!==false); },
  tplVariants(isRu){ return _themeTplFor('Swamp', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

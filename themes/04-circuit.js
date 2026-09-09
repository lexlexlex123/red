/** 04 — Circuit */
(function(){
window._THEME_04_CIRCUIT = {
name:'Схема',nameEn:'Circuit',
    desc:'Печатная плата, технологичность',descEn:'PCB traces, tech hardware',
    animated: true,

    // Крупная схема главного слайда (правая половина)
    _titleGraph(){
      const nodes=[
        [0.52,0.15],[0.65,0.35],[0.72,0.18],[0.82,0.42],[0.58,0.55],
        [0.88,0.25],[0.78,0.62],[0.92,0.48],[0.62,0.72],[0.75,0.82],
        [0.55,0.40],[0.70,0.50],[0.85,0.58],[0.68,0.22],[0.90,0.70],
        [0.60,0.65],[0.80,0.32],[0.95,0.38],[0.54,0.28],[0.84,0.78]
      ];
      const edges=[
        [0,1],[1,2],[1,3],[2,5],[3,4],[3,6],[5,7],[6,9],[4,8],[7,3],
        [0,18],[18,1],[0,13],[13,2],[1,10],[10,4],[3,11],[11,6],
        [5,16],[16,7],[6,12],[12,14],[8,15],[15,9],[7,17],[4,15],
        [10,11],[11,12],[12,19],[9,19],[14,19],[2,16],[8,10],[15,11]
      ];
      return {nodes, edges};
    },

    // Компактный граф в углах (~20% слайда)
    _unitGraph(){
      const nodes=[
        [0.06,0.12],[0.38,0.12],[0.38,0.38],[0.72,0.38],
        [0.72,0.68],[0.94,0.68],[0.94,0.28],[0.58,0.12],
        [0.12,0.52],[0.12,0.88],[0.48,0.88],[0.48,0.62],
        [0.82,0.88],[0.28,0.28],[0.62,0.52],[0.82,0.52]
      ];
      const edges=[
        [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[1,7],[6,3],
        [0,13],[13,2],[8,9],[9,10],[10,11],[11,4],[10,12],[8,13],
        [2,14],[14,3],[14,15],[15,5],[11,14],[7,14]
      ];
      return {nodes, edges};
    },

    _cornerBox(w,h,corner){
      const bw=w*0.20, bh=h*0.20;
      const padX=w*0.035, padY=h*0.045;
      let ox=padX, oy=padY, flipX=false, flipY=false;
      if(corner==='tr' || corner==='br'){ ox=w-padX-bw; flipX=true; }
      if(corner==='bl' || corner==='br'){ oy=h-padY-bh; flipY=true; }
      return {ox, oy, bw, bh, flipX, flipY};
    },

    _mapNode(nx,ny,box){
      let u=nx, v=ny;
      if(box.flipX) u=1-u;
      if(box.flipY) v=1-v;
      return [box.ox+u*box.bw, box.oy+v*box.bh];
    },

    _orthoPoints(ax,ay,bx,by,preferH){
      if(Math.abs(ax-bx)<0.5 || Math.abs(ay-by)<0.5){
        return {d:`M${ax.toFixed(1)} ${ay.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}`, len:Math.hypot(bx-ax,by-ay)};
      }
      if(preferH){
        return {
          d:`M${ax.toFixed(1)} ${ay.toFixed(1)} L${bx.toFixed(1)} ${ay.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}`,
          len:Math.abs(bx-ax)+Math.abs(by-ay)
        };
      }
      return {
        d:`M${ax.toFixed(1)} ${ay.toFixed(1)} L${ax.toFixed(1)} ${by.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}`,
        len:Math.abs(by-ay)+Math.abs(bx-ax)
      };
    },

    _doAnim(doAnimate){
      return doAnimate!==false && !!(this.animated && (typeof _layoutAnimated==='undefined' || _layoutAnimated));
    },

    // Единый цикл: рисуется → держится → стирается → пауза (без скачка при loop)
    // opacity фиксирован — видимость только через dashoffset (иначе «появление», а не «рисование»)
    _traceAnim(len, op, dur, phase){
      const L=Math.max(8, len).toFixed(1);
      // draw 22% → hold 33% → erase 15% → empty 30%
      const kt='0;0.22;0.55;0.70;1';
      const vOff=`${L};0;0;${L};${L}`;
      return {
        L, kt, vOff, op,
        begin: `-${(phase%dur).toFixed(2)}s`,
        initOff: (()=>{
          const t=(phase%dur)/dur;
          if(t<0.22) return (parseFloat(L)*(1-t/0.22)).toFixed(1);
          if(t<0.55) return '0';
          if(t<0.70) return (parseFloat(L)*((t-0.55)/0.15)).toFixed(1);
          return L;
        })()
      };
    },

    _dotAnim(op, dur, phase){
      // Точки: появляются с линией, держатся, гаснут
      const kt='0;0.22;0.55;0.70;1';
      const vOp=`0;${op};${op};0;0`;
      const t=(phase%dur)/dur;
      let initOp='0';
      if(t>=0.22 && t<0.55) initOp=op;
      else if(t<0.22) initOp=(parseFloat(op)*(t/0.22)).toFixed(3);
      else if(t<0.70) initOp=(parseFloat(op)*(1-(t-0.55)/0.15)).toFixed(3);
      return {kt, vOp, begin:`-${(phase%dur).toFixed(2)}s`, initOp};
    },

    _renderTraces(pts, edges, a1, a2, sw, doAnim, seed, dur){
      let lines='', dots='';
      const strokeW=(sw*2).toFixed(2); // толщина ×2
      edges.forEach((e,i)=>{
        const [ia,ib]=e;
        const [ax,ay]=pts[ia], [bx,by]=pts[ib];
        const {d, len}=this._orthoPoints(ax,ay,bx,by,(i+seed)%2===0);
        const col=i%3===0?a2:a1;
        const op=(0.28+((i+seed)%5)*0.06).toFixed(2);
        const phase=seed*1.9+i*0.72;
        if(doAnim){
          const a=this._traceAnim(len, op, dur, phase);
          lines+=`<path d="${d}" fill="none" stroke="${col}" stroke-width="${strokeW}" opacity="${a.op}" stroke-dasharray="${a.L}" stroke-dashoffset="${a.initOff}" stroke-linecap="square" stroke-linejoin="miter">
            <animate attributeName="stroke-dashoffset" values="${a.vOff}" keyTimes="${a.kt}" dur="${dur}s" begin="${a.begin}" repeatCount="indefinite" calcMode="linear"/>
          </path>`;
        } else {
          lines+=`<path d="${d}" fill="none" stroke="${col}" stroke-width="${strokeW}" opacity="${op}" stroke-linecap="square" stroke-linejoin="miter"/>`;
        }
      });

      pts.forEach(([cx,cy],i)=>{
        const r=i%4===0?Math.max(3.2,sw*3.2):Math.max(2.2,sw*2.2);
        const col=i%3===0?a1:a2;
        const baseOp=i%4===0?0.55:0.38;
        const phase=seed*1.3+i*0.55;
        if(doAnim){
          const a=this._dotAnim(baseOp, dur, phase);
          dots+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" opacity="${a.initOp}">
            <animate attributeName="opacity" values="${a.vOp}" keyTimes="${a.kt}" dur="${dur}s" begin="${a.begin}" repeatCount="indefinite" calcMode="linear"/>
          </circle>`;
          if(i%4===0){
            const glow=this._dotAnim(0.10, dur, phase);
            dots+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r*2.4).toFixed(1)}" fill="${a1}" opacity="${glow.initOp}">
              <animate attributeName="opacity" values="${glow.vOp}" keyTimes="${glow.kt}" dur="${dur}s" begin="${glow.begin}" repeatCount="indefinite"/>
            </circle>`;
          }
        } else {
          dots+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" opacity="${baseOp}"/>`;
          if(i%4===0) dots+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r*2.4).toFixed(1)}" fill="${a1}" opacity="0.08"/>`;
        }
      });
      return lines+dots;
    },

    _renderPatch(w,h,a1,a2,corner,doAnim,seed){
      const {nodes, edges}=this._unitGraph();
      const box=this._cornerBox(w,h,corner);
      const pts=nodes.map(([nx,ny])=>this._mapNode(nx,ny,box));
      const sw=Math.max(0.9, Math.min(w,h)*0.0016);
      return this._renderTraces(pts, edges, a1, a2, sw, doAnim, seed, 14);
    },

    _renderTitle(w,h,a1,a2,doAnim){
      const {nodes, edges}=this._titleGraph();
      const pts=nodes.map(([nx,ny])=>[w*nx, h*ny]);
      const sw=Math.max(1, Math.min(w,h)*0.0015);
      const traces=this._renderTraces(pts, edges, a1, a2, sw, doAnim, 2, 16);
      // Полоски главного слайда
      const stripes=
        `<rect x="${(w*0.48).toFixed(1)}" y="0" width="${(w*0.52).toFixed(1)}" height="${h}" fill="${a1}" opacity="0.025"/>`+
        `<rect x="0" y="0" width="${(w*0.06).toFixed(1)}" height="${h}" fill="${a1}" opacity="0.04"/>`;
      return stripes+traces;
    },

    _build(w,h,a1,a2,corners,doAnimate){
      const anim=this._doAnim(doAnimate);
      let body='';
      (corners||['tl','br']).forEach((c,i)=>{
        body+=this._renderPatch(w,h,a1,a2,c,anim,i*5+1);
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${body}</svg>`;
    },

    titleSvg(w,h,a1,a2,doAnimate){
      const anim=this._doAnim(doAnimate);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${this._renderTitle(w,h,a1,a2,anim)}</svg>`;
    },
    contentSvg(w,h,a1,a2,doAnimate){ return this._build(w,h,a1,a2,['tl','br'],doAnimate); },

    variantSvg(w,h,a1,a2,style){
      const st=style||'title';
      const doAnim=this._doAnim(true);
      if(st==='content' || st==='diag') return this._build(w,h,a1,a2,['tl','br'],doAnim);
      if(st==='diag-alt') return this._build(w,h,a1,a2,['bl','tr'],doAnim);
      if(st==='single' || st==='br') return this._build(w,h,a1,a2,['br'],doAnim);
      return this.titleSvg(w,h,a1,a2,doAnim);
    },
  tplVariants(isRu){ return _themeTplFor('Circuit', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

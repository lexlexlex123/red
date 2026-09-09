// ══════════════ LAYOUT DECOR ══════════════
let selLayout=-1;
let _layoutAnimated=true; // animation toggle for layouts that support it
// Map: slideIdx -> currentTime при паузе. Используется при экспорте статичного кадра.
const _decorPausedAt = new Map();

const LAYOUTS=[

  // ── 1. PRISM ── угловые клинья (заливка от линии до угла), выезд по очереди
  {
    name:'Призма',nameEn:'Prism',
    desc:'Острые грани, световые блики',descEn:'Sharp refracting light beams',
    animated: true,

    _peekStripe(x1, y1, x2, y2, cx, cy, color, sw, doAnimate, begin, dur, fillOp){
      const peek = 0.34;
      const hx = ((cx - (x1 + x2) * 0.5) * peek).toFixed(1);
      const hy = ((cy - (y1 + y2) * 0.5) * peek).toFixed(1);
      const pts = (cx > 0 && cy === 0)
        ? `${x1.toFixed(1)},${y1.toFixed(1)} ${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`
        : `${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
      const fo = fillOp != null ? fillOp : 0.82;
      const shape = `<polygon points="${pts}" fill="${color}" fill-opacity="${fo}"/>
        <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="0.9"/>`;
      if (!doAnimate) return `<g opacity="0.5">${shape}</g>`;
      const spl = '0.42 0 0.58 1;0.42 0 0.58 1';
      return `<g opacity="0">
        <g>${shape}
          <animateTransform attributeName="transform" type="translate"
            values="${hx},${hy};0,0;${hx},${hy}" keyTimes="0;0.48;1"
            dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="${spl}"/>
        </g>
        <animate attributeName="opacity" values="0;0.72;0" keyTimes="0;0.45;1"
          dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="${spl}"/>
      </g>`;
    },

    _cornerStripes(w, h, corner, specs, cx, cy, doAnimate, dur, cycleBegin){
      let out = '';
      const n = specs.length;
      const off = cycleBegin != null ? parseFloat(cycleBegin) : 0;
      specs.forEach((sp, i) => {
        const begin = (off + i * dur / n).toFixed(2);
        out += this._peekStripe(sp[0], sp[1], sp[2], sp[3], cx, cy, sp[4], sp[5], doAnimate, begin, dur, sp[6]);
      });
      return out;
    },

    _build(w, h, a1, a2, isTitle, doAnimate, mirror){
      const uid = 'prm' + Math.random().toString(36).slice(2, 7);
      const dur = isTitle ? 8 : 6.4;
      const rng = s => { let x = Math.sin(s * 41.7 + 9.2) * 43758.5; return x - Math.floor(x); };
      const midBegin = (seed, d, lo, hi) => { const p = lo + rng(seed) * (hi - lo); return (-p * d).toFixed(2); };
      const cycleBegin = doAnimate ? midBegin(3.7, dur, 0.12, 0.88) : '0';
      const sw = (n) => isTitle ? n : Math.max(0.45, n * 0.72);
      let extra = '';
      const mir = !!mirror;

      // [x1,y1,x2,y2, color, strokeWidth, fillOpacity] — основная диагональ TR↔BL
      const trTitle = [
        [w * .52, 0, w, h * .68, a1, sw(1.1), 0.30],
        [w * .64, 0, w, h * .42, a2, sw(0.9), 0.26],
        [w * .74, 0, w, h * .24, a1, sw(0.75), 0.22],
        [w * .84, 0, w, h * .10, a2, sw(0.55), 0.18],
      ];
      const trContent = [
        [w * .76, 0, w, h * .30, a1, sw(0.8), 0.24],
        [w * .88, 0, w, h * .12, a2, sw(0.55), 0.18],
      ];
      const blTitle = [
        [0, h * .66, w * .34, h, a1, sw(1.1), 0.30],
        [0, h * .76, w * .20, h, a2, sw(0.9), 0.26],
        [0, h * .86, w * .12, h, a1, sw(0.75), 0.22],
        [0, h * .94, w * .06, h, a2, sw(0.55), 0.18],
      ];
      const blContent = [
        [0, h * .82, w * .16, h, a1, sw(0.75), 0.22],
        [0, h * .92, w * .08, h, a2, sw(0.5), 0.16],
      ];
      // Зеркало по другой диагонали: TL↔BR
      const tlTitle = [
        [0, h * .68, w * .48, 0, a1, sw(1.1), 0.30],
        [0, h * .42, w * .36, 0, a2, sw(0.9), 0.26],
        [0, h * .24, w * .26, 0, a1, sw(0.75), 0.22],
        [0, h * .10, w * .16, 0, a2, sw(0.55), 0.18],
      ];
      const tlContent = [
        [0, h * .30, w * .24, 0, a1, sw(0.8), 0.24],
        [0, h * .12, w * .12, 0, a2, sw(0.55), 0.18],
      ];
      const brTitle = [
        [w * .66, h, w, h * .66, a1, sw(1.1), 0.30],
        [w * .80, h, w, h * .76, a2, sw(0.9), 0.26],
        [w * .88, h, w, h * .86, a1, sw(0.75), 0.22],
        [w * .94, h, w, h * .94, a2, sw(0.55), 0.18],
      ];
      const brContent = [
        [w * .84, h, w, h * .82, a1, sw(0.75), 0.22],
        [w * .92, h, w, h * .92, a2, sw(0.5), 0.16],
      ];

      if (isTitle){
        const gx = mir ? w * .18 : w * .82;
        extra = `<defs><filter id="${uid}pgf"><feGaussianBlur stdDeviation="16"/></filter></defs>
          <ellipse cx="${gx.toFixed(1)}" cy="${(h * .72).toFixed(1)}" rx="${(h * .28).toFixed(1)}" ry="${(h * .28).toFixed(1)}" fill="${a1}" opacity="0.04" filter="url(#${uid}pgf)"/>`;
      }

      let a, b;
      if (mir){
        a = this._cornerStripes(w, h, 'tl', isTitle ? tlTitle : tlContent, 0, 0, doAnimate, dur, cycleBegin);
        b = this._cornerStripes(w, h, 'br', isTitle ? brTitle : brContent, w, h, doAnimate, dur, cycleBegin);
      } else {
        a = this._cornerStripes(w, h, 'tr', isTitle ? trTitle : trContent, w, 0, doAnimate, dur, cycleBegin);
        b = this._cornerStripes(w, h, 'bl', isTitle ? blTitle : blContent, 0, h, doAnimate, dur, cycleBegin);
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${ow} ${oh}" preserveAspectRatio="none" overflow="hidden">${extra}${a}${b}</svg>`;
    },

    titleSvg(w, h, a1, a2, doAnimate, mirror){ return this._build(w, h, a1, a2, true, doAnimate !== false, !!mirror); },
    contentSvg(w, h, a1, a2, doAnimate, mirror){ return this._build(w, h, a1, a2, false, doAnimate !== false, !!mirror); },
  },

  // ── 2. AURORA ── северное сияние, анимированные переливающиеся блобы
  {
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
  },

      // Звёзды (детерминированные)

  // ── 3. GRID BURST ── сетка с радиальным взрывом из центра
  {
    name:'Взрыв',nameEn:'Grid Burst',
    desc:'Радиальные лучи из точки, энергия',descEn:'Radial rays from focal point',
    titleSvg:(w,h,a1,a2)=>{
      const cx=w*.78,cy=h*.28;
      let rays='';
      for(let i=0;i<18;i++){
        const ang=(i/18)*Math.PI*2;
        const len=Math.max(w,h)*1.2;
        const op=(0.03+0.06*(i%3===0?1:0.5)).toFixed(3);
        const x2=(cx+Math.cos(ang)*len).toFixed(1);
        const y2=(cy+Math.sin(ang)*len).toFixed(1);
        rays+=`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x2}" y2="${y2}" stroke="${i%2?a2:a1}" stroke-width="${i%3===0?1.2:0.6}" opacity="${op}"/>`;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs><filter id="rbf"><feGaussianBlur stdDeviation="20"/></filter></defs>
        ${rays}
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.3}" fill="${a1}" opacity="0.06" filter="url(#rbf)"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.14}" fill="${a1}" opacity="0.08"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.06}" fill="${a1}" opacity="0.22"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.02}" fill="${a1}" opacity="0.8"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.22}" fill="none" stroke="${a1}" stroke-width="1" opacity="0.2"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.32}" fill="none" stroke="${a2}" stroke-width="0.8" opacity="0.12"/>
      </svg>`;
    },
    contentSvg:(w,h,a1,a2)=>{
      const cx=w*.88,cy=h*.5;
      let rays='';
      for(let i=0;i<12;i++){
        const ang=(i/12)*Math.PI*2;
        const len=Math.max(w,h);
        rays+=`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx+Math.cos(ang)*len).toFixed(1)}" y2="${(cy+Math.sin(ang)*len).toFixed(1)}" stroke="${i%2?a2:a1}" stroke-width="0.7" opacity="${(0.04+0.04*(i%3===0?1:0)).toFixed(2)}"/>`;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs><filter id="rcf"><feGaussianBlur stdDeviation="14"/></filter></defs>
        ${rays}
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.35}" fill="${a1}" opacity="0.05" filter="url(#rcf)"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.18}" fill="${a1}" opacity="0.07"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.06}" fill="${a1}" opacity="0.25"/>
        <rect x="0" y="0" width="4" height="${h}" fill="${a1}" opacity="0.45"/>
        <rect x="7" y="${h*.08}" width="1.5" height="${h*.84}" fill="${a2}" opacity="0.22"/>
      </svg>`;
    },
  },

  // ── 4. CIRCUIT ── плата, дорожки, узлы
  {
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
  },

  // ── 5. FOLD ── сложенная бумага, оригами
  {
    name:'Оригами',nameEn:'Origami',
    desc:'Грани сложенной бумаги, оригами',descEn:'Paper folds, origami geometry',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="ff"><feGaussianBlur stdDeviation="10"/></filter></defs>
      <polygon points="${w},0 ${w},${h} ${w*.55},${h*.5}" fill="${a1}" opacity="0.14"/>
      <polygon points="${w},0 ${w*.55},${h*.5} ${w*.78},0" fill="${a2}" opacity="0.18"/>
      <polygon points="${w},${h} ${w*.55},${h*.5} ${w*.78},${h}" fill="${a1}" opacity="0.10"/>
      <polygon points="${w*.55},${h*.5} ${w*.78},0 ${w*.78},${h}" fill="${a2}" opacity="0.08"/>
      <line x1="${w*.55}" y1="${h*.5}" x2="${w}" y2="0" stroke="${a1}" stroke-width="1" opacity="0.3"/>
      <line x1="${w*.55}" y1="${h*.5}" x2="${w}" y2="${h}" stroke="${a1}" stroke-width="1" opacity="0.3"/>
      <line x1="${w*.55}" y1="${h*.5}" x2="${w*.78}" y2="0" stroke="${a2}" stroke-width="0.8" opacity="0.35"/>
      <line x1="${w*.55}" y1="${h*.5}" x2="${w*.78}" y2="${h}" stroke="${a2}" stroke-width="0.8" opacity="0.35"/>
      <circle cx="${w*.55}" cy="${h*.5}" r="${h*.04}" fill="${a1}" opacity="0.4" filter="url(#ff)"/>
      <circle cx="${w*.55}" cy="${h*.5}" r="${h*.015}" fill="${a1}" opacity="0.9"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polygon points="${w},0 ${w},${h} ${w*.72},${h*.5}" fill="${a1}" opacity="0.12"/>
      <polygon points="${w},0 ${w*.72},${h*.5} ${w*.85},0" fill="${a2}" opacity="0.16"/>
      <polygon points="${w},${h} ${w*.72},${h*.5} ${w*.85},${h}" fill="${a1}" opacity="0.09"/>
      <line x1="${w*.72}" y1="${h*.5}" x2="${w}" y2="0" stroke="${a1}" stroke-width="0.8" opacity="0.28"/>
      <line x1="${w*.72}" y1="${h*.5}" x2="${w}" y2="${h}" stroke="${a1}" stroke-width="0.8" opacity="0.28"/>
      <polygon points="0,0 ${w*.18},0 0,${h*.35}" fill="${a1}" opacity="0.1"/>
      <polygon points="0,${h} ${w*.18},${h} 0,${h*.65}" fill="${a2}" opacity="0.08"/>
    </svg>`,
  },

  // ── 6. HALO ── концентрические кольца, расходящиеся из центра
  {
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
  },

  // ── 8. DUSK ── закат, горизонт, солнце
  {
    name:'Закат',nameEn:'Dusk',
    desc:'Горизонт, рассвет, атмосферный свет',descEn:'Horizon, sunrise atmospheric depth',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <radialGradient id="dg1" cx="${w*.82}" cy="${h*.62}" r="${h*.6}" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${a1}" stop-opacity="0.35"/>
          <stop offset="1" stop-color="${a1}" stop-opacity="0"/>
        </radialGradient>
        <filter id="df"><feGaussianBlur stdDeviation="22"/></filter>
      </defs>
      <ellipse cx="${w*.82}" cy="${h*.62}" rx="${h*.6}" ry="${h*.6}" fill="url(#dg1)"/>
      <ellipse cx="${w*.82}" cy="${h*.62}" rx="${h*.38}" ry="${h*.38}" fill="${a1}" opacity="0.09" filter="url(#df)"/>
      <circle cx="${w*.82}" cy="${h*.62}" r="${h*.14}" fill="${a1}" opacity="0.22"/>
      <circle cx="${w*.82}" cy="${h*.62}" r="${h*.07}" fill="${a1}" opacity="0.55"/>
      <circle cx="${w*.82}" cy="${h*.62}" r="${h*.025}" fill="${a1}" opacity="0.9"/>
      <line x1="0" y1="${h*.62}" x2="${w}" y2="${h*.62}" stroke="${a1}" stroke-width="0.8" opacity="0.12"/>
      <line x1="0" y1="${h*.68}" x2="${w}" y2="${h*.68}" stroke="${a2}" stroke-width="0.6" opacity="0.08"/>
      <line x1="0" y1="${h*.74}" x2="${w}" y2="${h*.74}" stroke="${a1}" stroke-width="0.5" opacity="0.06"/>
      <path d="M0,${h*.62} L${w*.15},${h*.58} L${w*.28},${h*.62} L${w*.42},${h*.56} L${w*.55},${h*.62}" fill="none" stroke="${a1}" stroke-width="1" opacity="0.15"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <radialGradient id="dcg" cx="${w*.85}" cy="${h*.5}" r="${h*.5}" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${a1}" stop-opacity="0.22"/>
          <stop offset="1" stop-color="${a1}" stop-opacity="0"/>
        </radialGradient>
        <filter id="dcf"><feGaussianBlur stdDeviation="16"/></filter>
      </defs>
      <ellipse cx="${w*.85}" cy="${h*.5}" r="${h*.45}" fill="url(#dcg)"/>
      <circle cx="${w*.85}" cy="${h*.5}" r="${h*.1}" fill="${a1}" opacity="0.18"/>
      <circle cx="${w*.85}" cy="${h*.5}" r="${h*.04}" fill="${a1}" opacity="0.55"/>
      <line x1="0" y1="${h*.5}" x2="${w}" y2="${h*.5}" stroke="${a1}" stroke-width="0.7" opacity="0.1"/>
      <line x1="0" y1="${h*.56}" x2="${w}" y2="${h*.56}" stroke="${a2}" stroke-width="0.5" opacity="0.07"/>
      <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.45"/>
    </svg>`,
  },

  // ── 9. WAVE STACK ── слои волн, глубина
  {
    name:'Слои',nameEn:'Layers',
    desc:'Переливающиеся волны, эффект бархата',descEn:'Velvet wave layers, shimmering depth',
    animated: true,

    _wpts(yb,amp,per,W,steps){
      // Ширина: 3W (от -W до 2W) — достаточно для translate -W без пустот
      const p=[];
      for(let i=0;i<=steps;i++){
        const x = -W + W*3*i/steps;
        const phase = (x+W)/W * per;
        const y = yb + amp*Math.sin(phase*Math.PI*2);
        p.push(x.toFixed(2)+','+y.toFixed(2));
      }
      return p.join(' ');
    },

    _wptsV(xb,amp,per,H,steps){
      // Высота: 3H (от -H до 2H) — для вертикального скролла вдоль края
      const p=[];
      for(let i=0;i<=steps;i++){
        const y = -H + H*3*i/steps;
        const phase = (y+H)/H * per;
        const x = xb + amp*Math.sin(phase*Math.PI*2);
        p.push(x.toFixed(2)+','+y.toFixed(2));
      }
      return p.join(' ');
    },

    _layer(w,h,yb,amp,per,topEdge,hDur,vDur,dy,col,opF,opS,sw,doAnim){
      const S=160; // много шагов = плавная волна
      const pts=this._wpts(yb,amp,per,w,S);
      const isTop=(topEdge===0);
      // fill: от края (top или bottom) до волны
      const fill = isTop
        ? `M${-w},${-h} ${-w},${topEdge} ${pts} ${w*2},${topEdge} ${w*2},${-h} Z`
        : `M${-w},${h*2} ${-w},${topEdge} ${pts} ${w*2},${topEdge} ${w*2},${h*2} Z`;

      if(!doAnim){
        return `<path d="${fill}" fill="${col}" opacity="${opF}"/>`;
      }
      const hAn=`<animateTransform attributeName="transform" type="translate" values="0,0;${-w},0" dur="${hDur}s" begin="0s" repeatCount="indefinite" calcMode="linear"/>`;
      const vAn=`<animateTransform attributeName="transform" type="translate" additive="sum" values="0,0;0,${dy};0,0" dur="${vDur}s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4,0,0.6,1;0.4,0,0.6,1" keyTimes="0;0.5;1"/>`;
      return `<path d="${fill}" fill="${col}" opacity="${opF}">${hAn}${vAn}</path>`;
    },

    _layerV(w,h,xb,amp,per,sideEdge,vDur,hDur,dx,col,opF,opS,sw,doAnim){
      const S=160;
      const pts=this._wptsV(xb,amp,per,h,S);
      const isLeft=(sideEdge===0);
      const fill = isLeft
        ? `M${-w},${-h} ${sideEdge},${-h} ${pts} ${sideEdge},${h*2} ${-w},${h*2} Z`
        : `M${w*2},${-h} ${sideEdge},${-h} ${pts} ${sideEdge},${h*2} ${w*2},${h*2} Z`;

      if(!doAnim){
        return `<path d="${fill}" fill="${col}" opacity="${opF}"/>`;
      }
      // Скролл вдоль края (по Y) + пульсация вглубь слайда (по X)
      const vAn=`<animateTransform attributeName="transform" type="translate" values="0,0;0,${-h}" dur="${vDur}s" begin="0s" repeatCount="indefinite" calcMode="linear"/>`;
      const hAn=`<animateTransform attributeName="transform" type="translate" additive="sum" values="0,0;${dx},0;0,0" dur="${hDur}s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines="0.4,0,0.6,1;0.4,0,0.6,1" keyTimes="0;0.5;1"/>`;
      return `<path d="${fill}" fill="${col}" opacity="${opF}">${vAn}${hAn}</path>`;
    },

    _layerDefs(a1,a2){
      return [
        {yf:.10,af:.050,per:2,op_f:.26,op_s:.68,sw:1.9,col:a1,hd:12,vd:6.5,dy:18},
        {yf:.20,af:.042,per:2,op_f:.20,op_s:.50,sw:1.5,col:a2,hd:16,vd:8.2,dy:22},
        {yf:.30,af:.035,per:3,op_f:.14,op_s:.36,sw:1.2,col:a1,hd:21,vd:5.8,dy:16},
        {yf:.39,af:.028,per:2,op_f:.10,op_s:.27,sw:0.9,col:a2,hd:27,vd:9.4,dy:20},
        {yf:.47,af:.022,per:3,op_f:.07,op_s:.19,sw:0.7,col:a1,hd:34,vd:7.1,dy:14},
        {yf:.54,af:.017,per:2,op_f:.05,op_s:.13,sw:0.5,col:a2,hd:43,vd:11.0,dy:18},
        {yf:.60,af:.013,per:3,op_f:.03,op_s:.08,sw:0.4,col:a1,hd:55,vd:8.8,dy:12},
      ];
    },

    _glow(w,h,a1,cx,cy,r){
      const uid='lyg'+Math.random().toString(36).slice(2,7);
      return `<defs><radialGradient id="${uid}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0%" stop-color="${a1}" stop-opacity="0.11"/><stop offset="100%" stop-color="${a1}" stop-opacity="0"/></radialGradient></defs>`+
             `<rect width="${w}" height="${h}" fill="url(#${uid})"/>`;
    },

    _doAnim(doAnimate){
      return doAnimate !== false && !!(this.animated && (typeof _layoutAnimated === 'undefined' || _layoutAnimated));
    },

    titleSvg(w,h,a1,a2,doAnimate){
      let body=this._glow(w,h,a1,'80%','22%','50%');
      const anim=this._doAnim(doAnimate);
      this._layerDefs(a1,a2).forEach(lv=>{
        body+=this._layer(w,h,lv.yf*h,lv.af*h,lv.per,0,lv.hd,lv.vd,lv.dy,lv.col,lv.op_f,lv.op_s,lv.sw,anim);
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${body}</svg>`;
    },

    // Волны у верхнего и нижнего края.
    // Смещение к краю как раньше (~300px на h≈675) — на слайде гармония;
    // на миниатюре то же отношение h, чтобы волны были видны в превью.
    contentSvg(w,h,a1,a2,doAnimate){
      let body=this._glow(w,h,a1,'50%','50%','55%');
      const anim=this._doAnim(doAnimate);
      const push=h*(300/675);
      this._layerDefs(a1,a2).forEach(lv=>{
        const ampH=lv.af*h;
        body+=this._layer(w,h,lv.yf*h-push,ampH,lv.per,0,lv.hd,lv.vd,lv.dy,lv.col,lv.op_f,lv.op_s,lv.sw,anim);
        body+=this._layer(w,h,h*(1-lv.yf)+push,ampH,lv.per,h,Math.round(lv.hd*1.18),lv.vd*0.88,-lv.dy,lv.col,lv.op_f,lv.op_s,lv.sw,anim);
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${body}</svg>`;
    },

    // Как главный (title), но только снизу
    bottomSvg(w,h,a1,a2,doAnimate){
      let body=this._glow(w,h,a1,'20%','78%','50%');
      const anim=this._doAnim(doAnimate);
      this._layerDefs(a1,a2).forEach(lv=>{
        body+=this._layer(w,h,h*(1-lv.yf),lv.af*h,lv.per,h,lv.hd,lv.vd,-lv.dy,lv.col,lv.op_f,lv.op_s,lv.sw,anim);
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${body}</svg>`;
    },

    // Вертикальные волны по левому и правому краю (то же смещение к краю, что у content)
    sidesSvg(w,h,a1,a2,doAnimate){
      let body=this._glow(w,h,a1,'50%','50%','55%');
      const anim=this._doAnim(doAnimate);
      const push=w*(300/675);
      this._layerDefs(a1,a2).forEach(lv=>{
        const ampW=lv.af*w;
        body+=this._layerV(w,h,lv.yf*w-push,ampW,lv.per,0,lv.hd,lv.vd,lv.dy,lv.col,lv.op_f,lv.op_s,lv.sw,anim);
        body+=this._layerV(w,h,w*(1-lv.yf)+push,ampW,lv.per,w,Math.round(lv.hd*1.18),lv.vd*0.88,-lv.dy,lv.col,lv.op_f,lv.op_s,lv.sw,anim);
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${body}</svg>`;
    },

    variantSvg(w,h,a1,a2,style){
      const st=style||'title';
      const doAnim=this._doAnim(true);
      if(st==='bottom') return this.bottomSvg(w,h,a1,a2,doAnim);
      if(st==='sides') return this.sidesSvg(w,h,a1,a2,doAnim);
      if(st==='content') return this.contentSvg(w,h,a1,a2,doAnim);
      return this.titleSvg(w,h,a1,a2,doAnim);
    },
  },

  // ── 10. CRYSTAL ── WebGL октаэдр + SVG угловой свет
  {
    name:'Кристалл',nameEn:'Crystal',
    desc:'Прозрачный октаэдр, вращение как в Sims',descEn:'Transparent spinning octahedron gem',
    animated: true,
    renderer: 'crystal',

    buildCrystalCfg(w, h, a1, a2, isTitle, animated){
      const scale = isTitle ? h * 0.2 : h * 0.1;
      return { w, h, a1, a2, isTitle, animated: animated !== false, scale, spinDur: isTitle ? 12 : 10 };
    },

    _buildLightSvg(w, h, a1, a2, isTitle, doAnimate){
      const uid = 'cry' + Math.random().toString(36).slice(2, 7);
      if (isTitle){
        const lr = Math.max(w, h) * 0.62;
        const l0x = w * 1.06, l0y = -h * 0.06;
        const l1x = -w * 0.06, l1y = h * 1.04;
        const l2x = w * 1.06, l2y = h * 1.04;
        const l3x = -w * 0.06, l3y = -h * 0.06;
        const hopKt = '0;0.20;0.22;0.42;0.44;0.64;0.66;0.86;0.88;1';
        const hopLx = `${l0x};${l0x};${l1x};${l1x};${l2x};${l2x};${l3x};${l3x};${l0x};${l0x}`;
        const hopLy = `${l0y};${l0y};${l1y};${l1y};${l2y};${l2y};${l3y};${l3y};${l0y};${l0y}`;
        const pulse = doAnimate
          ? `<animate attributeName="opacity" values="0.32;0.58;0.32" dur="2.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"/>
             <animate attributeName="r" values="${lr.toFixed(1)};${(lr * 1.12).toFixed(1)};${lr.toFixed(1)}" dur="2.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"/>`
          : '';
        const hopAnim = doAnimate
          ? `<animate attributeName="cx" values="${hopLx}" keyTimes="${hopKt}" dur="18s" repeatCount="indefinite" calcMode="linear"/>
             <animate attributeName="cy" values="${hopLy}" keyTimes="${hopKt}" dur="18s" repeatCount="indefinite" calcMode="linear"/>`
          : '';
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
          <defs>
            <radialGradient id="${uid}corner" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="${a1}" stop-opacity="0.55"/>
              <stop offset="45%" stop-color="${a2}" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="${a2}" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="${l0x.toFixed(1)}" cy="${l0y.toFixed(1)}" r="${lr.toFixed(1)}" fill="url(#${uid}corner)" opacity="0.42">${hopAnim}${pulse}</circle>
        </svg>`;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
      <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.5"/>
        <polygon points="0,0 ${(w * .14).toFixed(1)},0 0,${(h * .28).toFixed(1)}" fill="${a1}" opacity="0.08"/>
      </svg>`;
    },

    titleSvg(w, h, a1, a2, doAnimate){ return this._buildLightSvg(w, h, a1, a2, true, doAnimate !== false); },
    contentSvg(w, h, a1, a2, doAnimate){ return this._buildLightSvg(w, h, a1, a2, false, doAnimate !== false); },
  },

  // ── 11. METRO ── плитки, бегущие панели как на новостных каналах
  {
    name:'Метро',nameEn:'Metro',
    desc:'Цветные плитки, панели ездят как на ТВ',descEn:'Bold flat tiles, sliding news-style panels',
    animated: true,

    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const preWarm=isTitle?14:11;
      const ks='0.42 0 0.58 1;0.42 0 0.58 1';

      function _pingT(t){
        return t<=0.5?t*2:(1-t)*2;
      }
      function _pingPos(t,x0,x1){
        const p=2*t;
        return p<=1?x0+(x1-x0)*p:x1-(x1-x0)*(p-1);
      }

      function _staticRect(x,y,rw,rh,col,fillOp,strokeCol,strokeOp){
        const fill=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${col}" opacity="${fillOp}"/>`;
        const stroke=strokeCol?`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="none" stroke="${strokeCol}" stroke-width="${strokeOp>=0.22?1:0.8}" opacity="${strokeOp}"/>`:'';
        return fill+stroke;
      }

      function _driftRect(x,y,rw,rh,col,fillOp,strokeCol,strokeOp,anim){
        const rw2=anim&&(anim.rw2!=null)?anim.rw2:rw*1.42;
        const rh2=anim&&(anim.rh2!=null)?anim.rh2:rh*1.42;
        if(doAnimate&&anim){
          const dur=anim.dur,begin=(anim.begin-preWarm).toFixed(2);
          let tValues,wAnim='',hAnim='';
          if(anim.axis==='x'){
            const x0=x.toFixed(1),x1=(x+anim.delta).toFixed(1),y0=y.toFixed(1);
            tValues=`${x0},${y0};${x1},${y0};${x0},${y0}`;
            wAnim=`<animate attributeName="width" values="${rw.toFixed(1)};${rw2.toFixed(1)};${rw.toFixed(1)}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="${ks}"/>`;
          }else{
            const x0=x.toFixed(1),y0=y.toFixed(1),y1=(y+anim.delta).toFixed(1);
            tValues=`${x0},${y0};${x0},${y1};${x0},${y0}`;
            hAnim=`<animate attributeName="height" values="${rh.toFixed(1)};${rh2.toFixed(1)};${rh.toFixed(1)}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="${ks}"/>`;
          }
          const fill=`<rect x="0" y="0" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${col}" opacity="${fillOp}">${wAnim}${hAnim}</rect>`;
          const stroke=strokeCol?`<rect x="0" y="0" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="none" stroke="${strokeCol}" stroke-width="${strokeOp>=0.22?1:0.8}" opacity="${strokeOp}">${wAnim}${hAnim}</rect>`:'';
          return `<g>
            <animateTransform attributeName="transform" type="translate" values="${tValues}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="${ks}"/>
            ${fill}${stroke}
          </g>`;
        }
        let px=x,py=y,cw=rw,ch=rh;
        if(anim){
          let elapsed=preWarm-anim.begin;
          while(elapsed<0) elapsed+=anim.dur;
          elapsed%=anim.dur;
          const t=elapsed/anim.dur;
          const blend=_pingT(t);
          if(anim.axis==='x'){
            px=_pingPos(t,x,x+anim.delta);
            cw=rw+(rw2-rw)*blend;
          }else{
            py=_pingPos(t,y,y+anim.delta);
            ch=rh+(rh2-rh)*blend;
          }
        }
        const fill=`<rect x="0" y="0" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="${col}" opacity="${fillOp}"/>`;
        const stroke=strokeCol?`<rect x="0" y="0" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="none" stroke="${strokeCol}" stroke-width="${strokeOp>=0.22?1:0.8}" opacity="${strokeOp}"/>`:'';
        return `<g transform="translate(${px.toFixed(1)},${py.toFixed(1)})">${fill}${stroke}</g>`;
      }

      let frame='';
      if(isTitle){
        const edge1=w*.08,edge2=w*.025,edge2x=w*.09;
        frame+=`<rect x="0" y="0" width="${edge1.toFixed(1)}" height="${h}" fill="${a1}" opacity="0.55"/>
          <rect x="${edge2x.toFixed(1)}" y="0" width="${edge2.toFixed(1)}" height="${h}" fill="${a2}" opacity="0.3"/>`;
        frame+=_staticRect(w*.62,0,w*.38,h*.5,a1,0.2,a1,0.2);
        frame+=_staticRect(w*.62,h*.52,w*.22,h*.48,a2,0.16,a2,0.2);
        frame+=_staticRect(w*.86,h*.52,w*.14,h*.48,a1,0.25,a1,0.25);
        frame+=`<rect x="${(w-edge1).toFixed(1)}" y="0" width="${edge1.toFixed(1)}" height="${h}" fill="${a1}" opacity="0.55"/>
          <rect x="${(w-edge2x-edge2).toFixed(1)}" y="0" width="${edge2.toFixed(1)}" height="${h}" fill="${a2}" opacity="0.3"/>`;
      }else{
        frame+=`<rect x="0" y="0" width="${(w*.06).toFixed(1)}" height="${h}" fill="${a1}" opacity="0.55"/>
          <rect x="${(w*.07).toFixed(1)}" y="0" width="${(w*.02).toFixed(1)}" height="${h}" fill="${a2}" opacity="0.28"/>`;
        frame+=_staticRect(w*.72,0,w*.28,h*.55,a1,0.18,null,0);
        frame+=_staticRect(w*.72,h*.57,w*.16,h*.43,a2,0.14,null,0);
        frame+=_staticRect(w*.9,h*.57,w*.1,h*.43,a1,0.22,null,0);
      }

      const tickers=isTitle?[
        {x:w*.08,y:h*.05,rw:w*.62,rh:h*.058,c:a1,fo:0.14,a:'x',d:w*.44,rw2:w*.88,dur:19,b:0},
        {x:w*.18,y:h*.17,rw:w*.55,rh:h*.052,c:a2,fo:0.11,a:'x',d:-w*.5,rw2:w*.82,dur:22,b:1.5},
        {x:w*.04,y:h*.78,rw:w*.68,rh:h*.056,c:a2,fo:0.10,a:'x',d:w*.54,rw2:w*.92,dur:24,b:3},
        {x:w*.35,y:h*.9,rw:w*.58,rh:h*.05,c:a1,fo:0.09,a:'x',d:-w*.46,rw2:w*.8,dur:17,b:0.8},
      ]:[
        {x:w*.12,y:h*.08,rw:w*.56,rh:h*.05,c:a1,fo:0.12,a:'x',d:w*.4,rw2:w*.78,dur:21,b:0},
        {x:w*.16,y:h*.84,rw:w*.6,rh:h*.048,c:a2,fo:0.09,a:'x',d:-w*.44,rw2:w*.82,dur:23,b:2.2},
        {x:w*.86,y:h*.15,rw:w*.055,rh:h*.42,c:a1,fo:0.11,a:'y',d:h*.24,rh2:h*.58,dur:15,b:1.1},
      ];

      let body='';
      tickers.forEach(t=>{
        body+=_driftRect(t.x,t.y,t.rw,t.rh,t.c,t.fo,null,0,{axis:t.a,delta:t.d,dur:t.dur,begin:t.b,rw2:t.rw2,rh2:t.rh2});
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${frame}${body}</svg>`;
    },

    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  },

  // ── 12. TOPOGRAPHY ── топографические контуры, рельеф
  {
    name:'Рельеф',nameEn:'Topo',
    desc:'Топографические линии, карта высот',descEn:'Topographic contour lines',
    titleSvg:(w,h,a1,a2)=>{
      let paths='';
      const levels=[
        {r:0.88,o:0.06},{r:0.75,o:0.09},{r:0.60,o:0.12},
        {r:0.46,o:0.15},{r:0.33,o:0.18},{r:0.21,o:0.12},{r:0.11,o:0.08}
      ];
      const cx=w*.78,cy=h*.42;
      levels.forEach(({r,o},i)=>{
        const rx=w*r*0.9, ry=h*r*0.75;
        const rot=-15+i*4;
        paths+=`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${i%2?a2:a1}" stroke-width="${i<3?0.8:0.6}" opacity="${o}" transform="rotate(${rot},${cx.toFixed(1)},${cy.toFixed(1)})"/>`;
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs><filter id="tf"><feGaussianBlur stdDeviation="25"/></filter></defs>
        <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${w*.35}" ry="${h*.32}" fill="${a1}" opacity="0.06" filter="url(#tf)"/>
        ${paths}
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.03}" fill="${a1}" opacity="0.6"/>
      </svg>`;
    },
    contentSvg:(w,h,a1,a2)=>{
      let paths='';
      const cx=w*.85,cy=h*.5;
      [{r:.55,o:.1},{r:.42,o:.13},{r:.3,o:.15},{r:.19,o:.12},{r:.09,o:.08}].forEach(({r,o},i)=>{
        paths+=`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(w*r*.9).toFixed(1)}" ry="${(h*r*.8).toFixed(1)}" fill="none" stroke="${i%2?a2:a1}" stroke-width="0.7" opacity="${o}"/>`;
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${paths}
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.025}" fill="${a1}" opacity="0.5"/>
        <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.5"/>
      </svg>`;
    },
  },


  // ── COSMOS ── планета с орбитами и спутниками
  {
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

    titleSvg(w,h,a1,a2,doAnimate){
      return this._build(w,h,a1,a2,true, doAnimate!==false);
    },
    contentSvg(w,h,a1,a2,doAnimate){
      return this._build(w,h,a1,a2,false, doAnimate!==false);
    },
  },
  // -- OCEAN -- волны и рыбки
  {
    name:'Океан', nameEn:'Ocean',
    desc:'Волны и рыбки под водой', descEn:'Animated waves and swimming fish',
    animated: true,

    titleSvg(w, h, a1, a2, doAnimate) {
      const uid = 'oc' + Math.random().toString(36).slice(2,8);
      const ow = 1280, oh = 720;
      const ow = 1280, oh = 720;
      const W1 = "M0.0,374.4 C30.4,377.5 99.2,386.3 160.0,390.7 C220.8,395.1 259.2,397.4 320.0,397.4 C380.8,397.4 419.2,395.1 480.0,390.7 C540.8,386.3 579.2,380.6 640.0,374.4 C700.8,368.2 739.2,362.5 800.0,358.1 C860.8,353.7 899.2,351.4 960.0,351.4 C1020.8,351.4 1059.2,353.7 1120.0,358.1 C1180.8,362.5 1249.6,371.3 1280.0,374.4 L1280.0,720.0 L0,720.0 Z;M0.0,385.9 C30.4,388.0 99.2,395.1 160.0,396.7 C220.8,398.3 259.2,397.4 320.0,394.4 C380.8,391.3 419.2,386.3 480.0,380.4 C540.8,374.4 579.2,368.2 640.0,362.9 C700.8,357.5 739.2,353.7 800.0,352.1 C860.8,350.5 899.2,351.4 960.0,354.4 C1020.8,357.5 1059.2,362.5 1120.0,368.4 C1180.8,374.4 1249.6,382.6 1280.0,385.9 L1280.0,720.0 L0,720.0 Z;M0.0,394.4 C30.4,394.8 99.2,398.3 160.0,396.7 C220.8,395.1 259.2,391.3 320.0,385.9 C380.8,380.6 419.2,374.4 480.0,368.4 C540.8,362.5 579.2,357.5 640.0,354.4 C700.8,351.4 739.2,350.5 800.0,352.1 C860.8,353.7 899.2,357.5 960.0,362.9 C1020.8,368.2 1059.2,374.4 1120.0,380.4 C1180.8,386.3 1249.6,391.7 1280.0,394.4 L1280.0,720.0 L0,720.0 Z;M0.0,397.4 C30.4,396.2 99.2,395.1 160.0,390.7 C220.8,386.3 259.2,380.6 320.0,374.4 C380.8,368.2 419.2,362.5 480.0,358.1 C540.8,353.7 579.2,351.4 640.0,351.4 C700.8,351.4 739.2,353.7 800.0,358.1 C860.8,362.5 899.2,368.2 960.0,374.4 C1020.8,380.6 1059.2,386.3 1120.0,390.7 C1180.8,395.1 1249.6,396.2 1280.0,397.4 L1280.0,720.0 L0,720.0 Z;M0.0,394.4 C30.4,391.7 99.2,386.3 160.0,380.4 C220.8,374.4 259.2,368.2 320.0,362.9 C380.8,357.5 419.2,353.7 480.0,352.1 C540.8,350.5 579.2,351.4 640.0,354.4 C700.8,357.5 739.2,362.5 800.0,368.4 C860.8,374.4 899.2,380.6 960.0,385.9 C1020.8,391.3 1059.2,395.1 1120.0,396.7 C1180.8,398.3 1249.6,394.8 1280.0,394.4 L1280.0,720.0 L0,720.0 Z;M0.0,385.9 C30.4,382.6 99.2,374.4 160.0,368.4 C220.8,362.5 259.2,357.5 320.0,354.4 C380.8,351.4 419.2,350.5 480.0,352.1 C540.8,353.7 579.2,357.5 640.0,362.9 C700.8,368.2 739.2,374.4 800.0,380.4 C860.8,386.3 899.2,391.3 960.0,394.4 C1020.8,397.4 1059.2,398.3 1120.0,396.7 C1180.8,395.1 1249.6,388.0 1280.0,385.9 L1280.0,720.0 L0,720.0 Z;M0.0,374.4 C30.4,371.3 99.2,362.5 160.0,358.1 C220.8,353.7 259.2,351.4 320.0,351.4 C380.8,351.4 419.2,353.7 480.0,358.1 C540.8,362.5 579.2,368.2 640.0,374.4 C700.8,380.6 739.2,386.3 800.0,390.7 C860.8,395.1 899.2,397.4 960.0,397.4 C1020.8,397.4 1059.2,395.1 1120.0,390.7 C1180.8,386.3 1249.6,377.5 1280.0,374.4 L1280.0,720.0 L0,720.0 Z;M0.0,362.9 C30.4,360.8 99.2,353.7 160.0,352.1 C220.8,350.5 259.2,351.4 320.0,354.4 C380.8,357.5 419.2,362.5 480.0,368.4 C540.8,374.4 579.2,380.6 640.0,385.9 C700.8,391.3 739.2,395.1 800.0,396.7 C860.8,398.3 899.2,397.4 960.0,394.4 C1020.8,391.3 1059.2,386.3 1120.0,380.4 C1180.8,374.4 1249.6,366.2 1280.0,362.9 L1280.0,720.0 L0,720.0 Z;M0.0,354.4 C30.4,354.0 99.2,350.5 160.0,352.1 C220.8,353.7 259.2,357.5 320.0,362.9 C380.8,368.2 419.2,374.4 480.0,380.4 C540.8,386.3 579.2,391.3 640.0,394.4 C700.8,397.4 739.2,398.3 800.0,396.7 C860.8,395.1 899.2,391.3 960.0,385.9 C1020.8,380.6 1059.2,374.4 1120.0,368.4 C1180.8,362.5 1249.6,357.1 1280.0,354.4 L1280.0,720.0 L0,720.0 Z;M0.0,351.4 C30.4,352.6 99.2,353.7 160.0,358.1 C220.8,362.5 259.2,368.2 320.0,374.4 C380.8,380.6 419.2,386.3 480.0,390.7 C540.8,395.1 579.2,397.4 640.0,397.4 C700.8,397.4 739.2,395.1 800.0,390.7 C860.8,386.3 899.2,380.6 960.0,374.4 C1020.8,368.2 1059.2,362.5 1120.0,358.1 C1180.8,353.7 1249.6,352.6 1280.0,351.4 L1280.0,720.0 L0,720.0 Z;M0.0,354.4 C30.4,357.1 99.2,362.5 160.0,368.4 C220.8,374.4 259.2,380.6 320.0,385.9 C380.8,391.3 419.2,395.1 480.0,396.7 C540.8,398.3 579.2,397.4 640.0,394.4 C700.8,391.3 739.2,386.3 800.0,380.4 C860.8,374.4 899.2,368.2 960.0,362.9 C1020.8,357.5 1059.2,353.7 1120.0,352.1 C1180.8,350.5 1249.6,354.0 1280.0,354.4 L1280.0,720.0 L0,720.0 Z;M0.0,362.9 C30.4,366.2 99.2,374.4 160.0,380.4 C220.8,386.3 259.2,391.3 320.0,394.4 C380.8,397.4 419.2,398.3 480.0,396.7 C540.8,395.1 579.2,391.3 640.0,385.9 C700.8,380.6 739.2,374.4 800.0,368.4 C860.8,362.5 899.2,357.5 960.0,354.4 C1020.8,351.4 1059.2,350.5 1120.0,352.1 C1180.8,353.7 1249.6,360.8 1280.0,362.9 L1280.0,720.0 L0,720.0 Z;M0.0,374.4 C30.4,377.5 99.2,386.3 160.0,390.7 C220.8,395.1 259.2,397.4 320.0,397.4 C380.8,397.4 419.2,395.1 480.0,390.7 C540.8,386.3 579.2,380.6 640.0,374.4 C700.8,368.2 739.2,362.5 800.0,358.1 C860.8,353.7 899.2,351.4 960.0,351.4 C1020.8,351.4 1059.2,353.7 1120.0,358.1 C1180.8,362.5 1249.6,371.3 1280.0,374.4 L1280.0,720.0 L0,720.0 Z";
      const W2 = "M0.0,464.6 C30.4,464.8 99.2,467.2 160.0,465.4 C220.8,463.5 259.2,459.9 320.0,455.0 C380.8,450.1 419.2,444.7 480.0,439.6 C540.8,434.5 579.2,430.5 640.0,428.2 C700.8,425.9 739.2,425.6 800.0,427.4 C860.8,429.3 899.2,432.9 960.0,437.8 C1020.8,442.7 1059.2,448.1 1120.0,453.2 C1180.8,458.3 1249.6,462.5 1280.0,464.6 L1280.0,720.0 L0,720.0 Z;M0.0,466.5 C30.4,465.1 99.2,463.5 160.0,459.4 C220.8,455.3 259.2,450.1 320.0,444.7 C380.8,439.3 419.2,434.5 480.0,431.0 C540.8,427.5 579.2,425.9 640.0,426.3 C700.8,426.8 739.2,429.3 800.0,433.4 C860.8,437.5 899.2,442.7 960.0,448.1 C1020.8,453.5 1059.2,458.3 1120.0,461.8 C1180.8,465.3 1249.6,465.6 1280.0,466.5 L1280.0,720.0 L0,720.0 Z;M0.0,463.0 C30.4,460.5 99.2,455.3 160.0,450.0 C220.8,444.6 259.2,439.3 320.0,434.9 C380.8,430.4 419.2,427.5 480.0,426.6 C540.8,425.6 579.2,426.8 640.0,429.8 C700.8,432.9 739.2,437.5 800.0,442.8 C860.8,448.2 899.2,453.5 960.0,457.9 C1020.8,462.4 1059.2,465.3 1120.0,466.2 C1180.8,467.2 1249.6,463.6 1280.0,463.0 L1280.0,720.0 L0,720.0 Z;M0.0,455.0 C30.4,452.1 99.2,444.7 160.0,439.6 C220.8,434.5 259.2,430.5 320.0,428.2 C380.8,425.9 419.2,425.6 480.0,427.4 C540.8,429.3 579.2,432.9 640.0,437.8 C700.8,442.7 739.2,448.1 800.0,453.2 C860.8,458.3 899.2,462.3 960.0,464.6 C1020.8,466.9 1059.2,467.2 1120.0,465.4 C1180.8,463.5 1249.6,457.0 1280.0,455.0 L1280.0,720.0 L0,720.0 Z;M0.0,444.7 C30.4,442.1 99.2,434.5 160.0,431.0 C220.8,427.5 259.2,425.9 320.0,426.3 C380.8,426.8 419.2,429.3 480.0,433.4 C540.8,437.5 579.2,442.7 640.0,448.1 C700.8,453.5 739.2,458.3 800.0,461.8 C860.8,465.3 899.2,466.9 960.0,466.5 C1020.8,466.0 1059.2,463.5 1120.0,459.4 C1180.8,455.3 1249.6,447.5 1280.0,444.7 L1280.0,720.0 L0,720.0 Z;M0.0,434.9 C30.4,433.3 99.2,427.5 160.0,426.6 C220.8,425.6 259.2,426.8 320.0,429.8 C380.8,432.9 419.2,437.5 480.0,442.8 C540.8,448.2 579.2,453.5 640.0,457.9 C700.8,462.4 739.2,465.3 800.0,466.2 C860.8,467.2 899.2,466.0 960.0,463.0 C1020.8,459.9 1059.2,455.3 1120.0,450.0 C1180.8,444.6 1249.6,437.8 1280.0,434.9 L1280.0,720.0 L0,720.0 Z;M0.0,428.2 C30.4,428.0 99.2,425.6 160.0,427.4 C220.8,429.3 259.2,432.9 320.0,437.8 C380.8,442.7 419.2,448.1 480.0,453.2 C540.8,458.3 579.2,462.3 640.0,464.6 C700.8,466.9 739.2,467.2 800.0,465.4 C860.8,463.5 899.2,459.9 960.0,455.0 C1020.8,450.1 1059.2,444.7 1120.0,439.6 C1180.8,434.5 1249.6,430.3 1280.0,428.2 L1280.0,720.0 L0,720.0 Z;M0.0,426.3 C30.4,427.7 99.2,429.3 160.0,433.4 C220.8,437.5 259.2,442.7 320.0,448.1 C380.8,453.5 419.2,458.3 480.0,461.8 C540.8,465.3 579.2,466.9 640.0,466.5 C700.8,466.0 739.2,463.5 800.0,459.4 C860.8,455.3 899.2,450.1 960.0,444.7 C1020.8,439.3 1059.2,434.5 1120.0,431.0 C1180.8,427.5 1249.6,427.2 1280.0,426.3 L1280.0,720.0 L0,720.0 Z;M0.0,429.8 C30.4,432.3 99.2,437.5 160.0,442.8 C220.8,448.2 259.2,453.5 320.0,457.9 C380.8,462.4 419.2,465.3 480.0,466.2 C540.8,467.2 579.2,466.0 640.0,463.0 C700.8,459.9 739.2,455.3 800.0,450.0 C860.8,444.6 899.2,439.3 960.0,434.9 C1020.8,430.4 1059.2,427.5 1120.0,426.6 C1180.8,425.6 1249.6,429.2 1280.0,429.8 L1280.0,720.0 L0,720.0 Z;M0.0,437.8 C30.4,440.7 99.2,448.1 160.0,453.2 C220.8,458.3 259.2,462.3 320.0,464.6 C380.8,466.9 419.2,467.2 480.0,465.4 C540.8,463.5 579.2,459.9 640.0,455.0 C700.8,450.1 739.2,444.7 800.0,439.6 C860.8,434.5 899.2,430.5 960.0,428.2 C1020.8,425.9 1059.2,425.6 1120.0,427.4 C1180.8,429.3 1249.6,435.8 1280.0,437.8 L1280.0,720.0 L0,720.0 Z;M0.0,448.1 C30.4,450.7 99.2,458.3 160.0,461.8 C220.8,465.3 259.2,466.9 320.0,466.5 C380.8,466.0 419.2,463.5 480.0,459.4 C540.8,455.3 579.2,450.1 640.0,444.7 C700.8,439.3 739.2,434.5 800.0,431.0 C860.8,427.5 899.2,425.9 960.0,426.3 C1020.8,426.8 1059.2,429.3 1120.0,433.4 C1180.8,437.5 1249.6,445.3 1280.0,448.1 L1280.0,720.0 L0,720.0 Z;M0.0,457.9 C30.4,459.5 99.2,465.3 160.0,466.2 C220.8,467.2 259.2,466.0 320.0,463.0 C380.8,459.9 419.2,455.3 480.0,450.0 C540.8,444.6 579.2,439.3 640.0,434.9 C700.8,430.4 739.2,427.5 800.0,426.6 C860.8,425.6 899.2,426.8 960.0,429.8 C1020.8,432.9 1059.2,437.5 1120.0,442.8 C1180.8,448.2 1249.6,455.0 1280.0,457.9 L1280.0,720.0 L0,720.0 Z;M0.0,464.6 C30.4,464.8 99.2,467.2 160.0,465.4 C220.8,463.5 259.2,459.9 320.0,455.0 C380.8,450.1 419.2,444.7 480.0,439.6 C540.8,434.5 579.2,430.5 640.0,428.2 C700.8,425.9 739.2,425.6 800.0,427.4 C860.8,429.3 899.2,432.9 960.0,437.8 C1020.8,442.7 1059.2,448.1 1120.0,453.2 C1180.8,458.3 1249.6,462.5 1280.0,464.6 L1280.0,720.0 L0,720.0 Z";
      const W3 = "M0.0,529.4 C30.4,526.8 99.2,520.4 160.0,515.5 C220.8,510.5 259.2,506.2 320.0,503.3 C380.8,500.3 419.2,499.1 480.0,499.9 C540.8,500.7 579.2,503.3 640.0,507.4 C700.8,511.5 739.2,516.4 800.0,521.3 C860.8,526.3 899.2,530.6 960.0,533.5 C1020.8,536.5 1059.2,537.7 1120.0,536.9 C1180.8,536.1 1249.6,530.8 1280.0,529.4 L1280.0,720.0 L0,720.0 Z;M0.0,520.4 C30.4,517.7 99.2,510.5 160.0,506.6 C220.8,502.7 259.2,500.3 320.0,499.8 C380.8,499.3 419.2,500.7 480.0,503.9 C540.8,507.0 579.2,511.4 640.0,516.4 C700.8,521.4 739.2,526.3 800.0,530.2 C860.8,534.1 899.2,536.5 960.0,537.0 C1020.8,537.5 1059.2,536.1 1120.0,532.9 C1180.8,529.8 1249.6,522.7 1280.0,520.4 L1280.0,720.0 L0,720.0 Z;M0.0,510.8 C30.4,508.9 99.2,502.7 160.0,500.9 C220.8,499.1 259.2,499.3 320.0,501.3 C380.8,503.3 419.2,507.0 480.0,511.7 C540.8,516.4 579.2,521.4 640.0,526.0 C700.8,530.6 739.2,534.1 800.0,535.9 C860.8,537.7 899.2,537.5 960.0,535.5 C1020.8,533.5 1059.2,529.8 1120.0,525.1 C1180.8,520.4 1249.6,513.5 1280.0,510.8 L1280.0,720.0 L0,720.0 Z;M0.0,503.3 C30.4,502.6 99.2,499.1 160.0,499.9 C220.8,500.7 259.2,503.3 320.0,507.4 C380.8,511.5 419.2,516.4 480.0,521.3 C540.8,526.3 579.2,530.6 640.0,533.5 C700.8,536.5 739.2,537.7 800.0,536.9 C860.8,536.1 899.2,533.5 960.0,529.4 C1020.8,525.3 1059.2,520.4 1120.0,515.5 C1180.8,510.5 1249.6,505.6 1280.0,503.3 L1280.0,720.0 L0,720.0 Z;M0.0,499.8 C30.4,500.6 99.2,500.7 160.0,503.9 C220.8,507.0 259.2,511.4 320.0,516.4 C380.8,521.4 419.2,526.3 480.0,530.2 C540.8,534.1 579.2,536.5 640.0,537.0 C700.8,537.5 739.2,536.1 800.0,532.9 C860.8,529.8 899.2,525.4 960.0,520.4 C1020.8,515.4 1059.2,510.5 1120.0,506.6 C1180.8,502.7 1249.6,501.1 1280.0,499.8 L1280.0,720.0 L0,720.0 Z;M0.0,501.3 C30.4,503.3 99.2,507.0 160.0,511.7 C220.8,516.4 259.2,521.4 320.0,526.0 C380.8,530.6 419.2,534.1 480.0,535.9 C540.8,537.7 579.2,537.5 640.0,535.5 C700.8,533.5 739.2,529.8 800.0,525.1 C860.8,520.4 899.2,515.4 960.0,510.8 C1020.8,506.2 1059.2,502.7 1120.0,500.9 C1180.8,499.1 1249.6,501.2 1280.0,501.3 L1280.0,720.0 L0,720.0 Z;M0.0,507.4 C30.4,510.0 99.2,516.4 160.0,521.3 C220.8,526.3 259.2,530.6 320.0,533.5 C380.8,536.5 419.2,537.7 480.0,536.9 C540.8,536.1 579.2,533.5 640.0,529.4 C700.8,525.3 739.2,520.4 800.0,515.5 C860.8,510.5 899.2,506.2 960.0,503.3 C1020.8,500.3 1059.2,499.1 1120.0,499.9 C1180.8,500.7 1249.6,506.0 1280.0,507.4 L1280.0,720.0 L0,720.0 Z;M0.0,516.4 C30.4,519.1 99.2,526.3 160.0,530.2 C220.8,534.1 259.2,536.5 320.0,537.0 C380.8,537.5 419.2,536.1 480.0,532.9 C540.8,529.8 579.2,525.4 640.0,520.4 C700.8,515.4 739.2,510.5 800.0,506.6 C860.8,502.7 899.2,500.3 960.0,499.8 C1020.8,499.3 1059.2,500.7 1120.0,503.9 C1180.8,507.0 1249.6,514.1 1280.0,516.4 L1280.0,720.0 L0,720.0 Z;M0.0,526.0 C30.4,527.9 99.2,534.1 160.0,535.9 C220.8,537.7 259.2,537.5 320.0,535.5 C380.8,533.5 419.2,529.8 480.0,525.1 C540.8,520.4 579.2,515.4 640.0,510.8 C700.8,506.2 739.2,502.7 800.0,500.9 C860.8,499.1 899.2,499.3 960.0,501.3 C1020.8,503.3 1059.2,507.0 1120.0,511.7 C1180.8,516.4 1249.6,523.3 1280.0,526.0 L1280.0,720.0 L0,720.0 Z;M0.0,533.5 C30.4,534.2 99.2,537.7 160.0,536.9 C220.8,536.1 259.2,533.5 320.0,529.4 C380.8,525.3 419.2,520.4 480.0,515.5 C540.8,510.5 579.2,506.2 640.0,503.3 C700.8,500.3 739.2,499.1 800.0,499.9 C860.8,500.7 899.2,503.3 960.0,507.4 C1020.8,511.5 1059.2,516.4 1120.0,521.3 C1180.8,526.3 1249.6,531.2 1280.0,533.5 L1280.0,720.0 L0,720.0 Z;M0.0,537.0 C30.4,536.2 99.2,536.1 160.0,532.9 C220.8,529.8 259.2,525.4 320.0,520.4 C380.8,515.4 419.2,510.5 480.0,506.6 C540.8,502.7 579.2,500.3 640.0,499.8 C700.8,499.3 739.2,500.7 800.0,503.9 C860.8,507.0 899.2,511.4 960.0,516.4 C1020.8,521.4 1059.2,526.3 1120.0,530.2 C1180.8,534.1 1249.6,535.7 1280.0,537.0 L1280.0,720.0 L0,720.0 Z;M0.0,535.5 C30.4,533.5 99.2,529.8 160.0,525.1 C220.8,520.4 259.2,515.4 320.0,510.8 C380.8,506.2 419.2,502.7 480.0,500.9 C540.8,499.1 579.2,499.3 640.0,501.3 C700.8,503.3 739.2,507.0 800.0,511.7 C860.8,516.4 899.2,521.4 960.0,526.0 C1020.8,530.6 1059.2,534.1 1120.0,535.9 C1180.8,537.7 1249.6,535.6 1280.0,535.5 L1280.0,720.0 L0,720.0 Z;M0.0,529.4 C30.4,526.8 99.2,520.4 160.0,515.5 C220.8,510.5 259.2,506.2 320.0,503.3 C380.8,500.3 419.2,499.1 480.0,499.9 C540.8,500.7 579.2,503.3 640.0,507.4 C700.8,511.5 739.2,516.4 800.0,521.3 C860.8,526.3 899.2,530.6 960.0,533.5 C1020.8,536.5 1059.2,537.7 1120.0,536.9 C1180.8,536.1 1249.6,530.8 1280.0,529.4 L1280.0,720.0 L0,720.0 Z";
      const W1s=W1.split(';')[0], W2s=W2.split(';')[0], W3s=W3.split(';')[0];
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${ow} ${oh}" preserveAspectRatio="none" overflow="hidden">
  <defs>
    <linearGradient id="${uid}g1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a1}" stop-opacity="0"/>
      <stop offset="1" stop-color="${a2}" stop-opacity="0.38"/>
    </linearGradient>
    <linearGradient id="${uid}g2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a1}" stop-opacity="0.06"/>
      <stop offset="1" stop-color="${a1}" stop-opacity="0.32"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${oh*.5}" width="${ow}" height="${oh*.5}" fill="url(#${uid}g1)"/>
  <path d="${W1s}" fill="${a1}" opacity=".11">
    ${doAnimate?`<animate attributeName="d" dur="8s" repeatCount="indefinite" calcMode="linear" values="${W1}"/>`:''}
  </path>
  <path d="${W2s}" fill="${a1}" opacity=".16">
    ${doAnimate?`<animate attributeName="d" dur="11s" repeatCount="indefinite" calcMode="linear" values="${W2}"/>`:''}
  </path>
  <path d="${W3s}" fill="url(#${uid}g2)" opacity=".9">
    ${doAnimate?`<animate attributeName="d" dur="7s" repeatCount="indefinite" calcMode="linear" values="${W3}"/>`:''}
  </path>
  <circle cx="${ow*.22}" cy="${oh*.79}" r="${ow*.005}" opacity="0" fill="${a1}">
    ${doAnimate?`<animate attributeName="cy" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.3 0 0.7 1" values="${oh*.79};${oh*.56}"/><animate attributeName="opacity" dur="4s" repeatCount="indefinite" keyTimes="0;0.08;0.65;1" values="0;0.5;0.4;0"/>`:''}
  </circle>
  <circle cx="${ow*.5}" cy="${oh*.83}" r="${ow*.0035}" opacity="0" fill="${a2}">
    ${doAnimate?`<animate attributeName="cy" dur="5.5s" repeatCount="indefinite" begin="1.5s" calcMode="spline" keySplines="0.3 0 0.7 1" values="${oh*.83};${oh*.59}"/><animate attributeName="opacity" dur="5.5s" repeatCount="indefinite" begin="1.5s" keyTimes="0;0.08;0.7;1" values="0;0.45;0.35;0"/>`:''}
  </circle>
  <circle cx="${ow*.72}" cy="${oh*.76}" r="${ow*.004}" opacity="0" fill="${a1}">
    ${doAnimate?`<animate attributeName="cy" dur="3.8s" repeatCount="indefinite" begin="3s" calcMode="spline" keySplines="0.3 0 0.7 1" values="${oh*.76};${oh*.55}"/><animate attributeName="opacity" dur="3.8s" repeatCount="indefinite" begin="3s" keyTimes="0;0.1;0.65;1" values="0;0.42;0.32;0"/>`:''}
  </circle>
  <!-- Fish 1: влево→вправо, размер L
       Голова смотрит вправо (+X). Тело: широкий каплевидный силуэт.
       Хвостовой плавник крепится к КОНЦУ тела (самая левая точка -26).
       Изгиб: S-волна — голова фикс, середина и хвост изгибаются в противофазе. -->
  <g transform="translate(51.2,460.8)">
    <animateTransform attributeName="transform" type="translate"
      dur="9s" repeatCount="indefinite" begin="0s"
      calcMode="spline" keySplines="0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1;0 0 1 1"
      keyTimes="0;0.47;0.5;0.97;1"
      values="51.2 460.8;1152.0 424.8;1152.0 424.8;51.2 460.8;51.2 460.8"/>
    <g>
      <animateTransform attributeName="transform" type="scale"
        dur="9s" repeatCount="indefinite" begin="0s"
        keyTimes="0;0.469;0.5;0.969;1"
        values="1 1;1 1;-1 1;-1 1;1 1"/>
      <!-- ТЕЛО: каплевидное, голова cx≈14, хвостовое соединение cx≈-24 -->
      <path fill="${a1}" opacity=".88">
        <animate attributeName="d" dur="0.55s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1"
          keyTimes="0;0.25;0.5;0.75;1"
          values="
M14,0 C12,-9 4,-14 -8,-13 C-18,-11 -24,-6 -24,0 C-24,6 -18,11 -8,13 C4,14 12,9 14,0 Z;
M14,0 C12,-8 4,-11 -6,-8 C-16,-5 -23,1 -24,6 C-24,9 -18,12 -8,12 C4,12 12,8 14,0 Z;
M14,0 C12,-9 4,-14 -8,-13 C-18,-11 -24,-6 -24,0 C-24,6 -18,11 -8,13 C4,14 12,9 14,0 Z;
M14,0 C12,-8 4,-11 -6,-14 C-16,-14 -23,-9 -24,-4 C-24,-1 -18,3 -8,6 C4,9 12,7 14,0 Z;
M14,0 C12,-9 4,-14 -8,-13 C-18,-11 -24,-6 -24,0 C-24,6 -18,11 -8,13 C4,14 12,9 14,0 Z"/>
      </path>
      <!-- ХВОСТ: крепится к точке конца тела, машет -->
      <path fill="${a1}" opacity=".72">
        <animate attributeName="d" dur="0.55s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1"
          keyTimes="0;0.25;0.5;0.75;1"
          values="
M-24,-2 L-40,-16 L-37,0 L-40,16 L-24,2 Z;
M-24,4 L-36,-10 L-36,6 L-40,22 L-24,8 Z;
M-24,-2 L-40,-16 L-37,0 L-40,16 L-24,2 Z;
M-24,-6 L-40,-22 L-38,-6 L-36,10 L-24,0 Z;
M-24,-2 L-40,-16 L-37,0 L-40,16 L-24,2 Z"/>
      </path>
      <!-- спинной плавник -->
      <path d="M5,-13 Q-4,-23 -14,-18 Q-10,-13 5,-13 Z" fill="${a1}" opacity=".5"/>
      <!-- брюшной плавник -->
      <path d="M-2,13 Q-10,22 -16,17 Q-11,13 -2,13 Z" fill="${a1}" opacity=".4"/>
      <!-- глаз -->
      <circle cx="10" cy="-2" r="3.2" fill="${a2}"/>
      <circle cx="11.2" cy="-3" r="1.2" fill="white" opacity=".75"/>
      <!-- жабры -->
      <path d="M6,-9 Q3,0 6,9" fill="none" stroke="${a2}" stroke-width="1" opacity=".35"/>
    </g>
  </g>
  <!-- Fish 2: вправо→влево, размер M -->
  <g transform="translate(1126.4,547.2)">
    <animateTransform attributeName="transform" type="translate"
      dur="12s" repeatCount="indefinite" begin="0s"
      calcMode="spline" keySplines="0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1;0 0 1 1"
      keyTimes="0;0.47;0.5;0.97;1"
      values="1126.4 547.2;102.4 511.2;102.4 511.2;1126.4 547.2;1126.4 547.2"/>
    <g>
      <animateTransform attributeName="transform" type="scale"
        dur="12s" repeatCount="indefinite" begin="2s"
        keyTimes="0;0.469;0.5;0.969;1"
        values="-1 1;-1 1;1 1;1 1;-1 1"/>
      <path fill="${a2}" opacity=".88">
        <animate attributeName="d" dur="0.62s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1"
          keyTimes="0;0.25;0.5;0.75;1"
          values="
M12,0 C10,-7 3,-11 -6,-10 C-14,-9 -19,-5 -19,0 C-19,5 -14,9 -6,10 C3,11 10,7 12,0 Z;
M12,0 C10,-7 3,-9 -5,-6 C-13,-4 -18,1 -19,5 C-19,7 -14,9 -6,9 C3,9 10,6 12,0 Z;
M12,0 C10,-7 3,-11 -6,-10 C-14,-9 -19,-5 -19,0 C-19,5 -14,9 -6,10 C3,11 10,7 12,0 Z;
M12,0 C10,-6 3,-9 -5,-11 C-13,-11 -18,-7 -19,-3 C-19,-1 -14,2 -6,5 C3,7 10,6 12,0 Z;
M12,0 C10,-7 3,-11 -6,-10 C-14,-9 -19,-5 -19,0 C-19,5 -14,9 -6,10 C3,11 10,7 12,0 Z"/>
      </path>
      <path fill="${a2}" opacity=".72">
        <animate attributeName="d" dur="0.62s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1"
          keyTimes="0;0.25;0.5;0.75;1"
          values="
M-19,-2 L-32,-13 L-30,0 L-32,13 L-19,2 Z;
M-19,3 L-29,-8 L-30,4 L-32,17 L-19,7 Z;
M-19,-2 L-32,-13 L-30,0 L-32,13 L-19,2 Z;
M-19,-5 L-32,-18 L-31,-5 L-29,8 L-19,0 Z;
M-19,-2 L-32,-13 L-30,0 L-32,13 L-19,2 Z"/>
      </path>
      <path d="M4,-10 Q-3,-18 -11,-14 Q-8,-10 4,-10 Z" fill="${a2}" opacity=".48"/>
      <path d="M-2,10 Q-8,17 -13,13 Q-9,10 -2,10 Z" fill="${a2}" opacity=".38"/>
      <circle cx="9" cy="-1.5" r="2.7" fill="${a1}"/>
      <circle cx="10" cy="-2.3" r="1" fill="white" opacity=".75"/>
      <path d="M5,-7 Q2.5,0 5,7" fill="none" stroke="${a1}" stroke-width="0.8" opacity=".35"/>
    </g>
  </g>
  <!-- Fish 3: влево→вправо, размер S -->
  <g transform="translate(384.0,597.6)">
    <animateTransform attributeName="transform" type="translate"
      dur="10s" repeatCount="indefinite" begin="0s"
      calcMode="spline" keySplines="0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1;0 0 1 1"
      keyTimes="0;0.47;0.5;0.97;1"
      values="384.0 597.6;998.4 568.8;998.4 568.8;384.0 597.6;384.0 597.6"/>
    <g>
      <animateTransform attributeName="transform" type="scale"
        dur="10s" repeatCount="indefinite" begin="0s"
        keyTimes="0;0.469;0.5;0.969;1"
        values="1 1;1 1;-1 1;-1 1;1 1"/>
      <path fill="${a1}" opacity=".85">
        <animate attributeName="d" dur="0.48s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1"
          keyTimes="0;0.25;0.5;0.75;1"
          values="
M10,0 C8,-6 2,-9 -5,-8 C-11,-7 -15,-4 -15,0 C-15,4 -11,7 -5,8 C2,9 8,6 10,0 Z;
M10,0 C8,-5 2,-7 -4,-5 C-10,-3 -14,1 -15,4 C-15,6 -11,8 -5,7 C2,7 8,5 10,0 Z;
M10,0 C8,-6 2,-9 -5,-8 C-11,-7 -15,-4 -15,0 C-15,4 -11,7 -5,8 C2,9 8,6 10,0 Z;
M10,0 C8,-5 2,-8 -4,-9 C-10,-9 -14,-6 -15,-3 C-15,-1 -11,2 -5,4 C2,6 8,5 10,0 Z;
M10,0 C8,-6 2,-9 -5,-8 C-11,-7 -15,-4 -15,0 C-15,4 -11,7 -5,8 C2,9 8,6 10,0 Z"/>
      </path>
      <path fill="${a1}" opacity=".70">
        <animate attributeName="d" dur="0.48s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1"
          keyTimes="0;0.25;0.5;0.75;1"
          values="
M-15,-1.5 L-25,-10 L-23,0 L-25,10 L-15,1.5 Z;
M-15,2.5 L-24,-6 L-24,3 L-26,14 L-15,5.5 Z;
M-15,-1.5 L-25,-10 L-23,0 L-25,10 L-15,1.5 Z;
M-15,-4 L-26,-14 L-25,-4 L-23,7 L-15,0 Z;
M-15,-1.5 L-25,-10 L-23,0 L-25,10 L-15,1.5 Z"/>
      </path>
      <path d="M3,-8 Q-2,-15 -9,-11 Q-6,-8 3,-8 Z" fill="${a1}" opacity=".45"/>
      <circle cx="7" cy="-1.5" r="2.2" fill="${a2}"/>
      <circle cx="8" cy="-2.2" r="0.8" fill="white" opacity=".75"/>
      <path d="M4,-6 Q2,0 4,6" fill="none" stroke="${a2}" stroke-width="0.7" opacity=".35"/>
    </g>
  </g>
  <!-- Fish 4: вправо→влево, размер XL -->
  <g transform="translate(832.0,496.8)">
    <animateTransform attributeName="transform" type="translate"
      dur="8s" repeatCount="indefinite" begin="0s"
      calcMode="spline" keySplines="0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1;0 0 1 1"
      keyTimes="0;0.47;0.5;0.97;1"
      values="832.0 496.8;153.6 532.8;153.6 532.8;832.0 496.8;832.0 496.8"/>
    <g>
      <animateTransform attributeName="transform" type="scale"
        dur="8s" repeatCount="indefinite" begin="0s"
        keyTimes="0;0.469;0.5;0.969;1"
        values="-1 1;-1 1;1 1;1 1;-1 1"/>
      <path fill="${a2}" opacity=".88">
        <animate attributeName="d" dur="0.6s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1"
          keyTimes="0;0.25;0.5;0.75;1"
          values="
M16,0 C13,-11 5,-17 -10,-16 C-22,-14 -29,-8 -29,0 C-29,8 -22,14 -10,16 C5,17 13,11 16,0 Z;
M16,0 C13,-10 5,-14 -8,-10 C-20,-7 -28,1 -29,8 C-29,11 -22,14 -10,14 C5,14 13,10 16,0 Z;
M16,0 C13,-11 5,-17 -10,-16 C-22,-14 -29,-8 -29,0 C-29,8 -22,14 -10,16 C5,17 13,11 16,0 Z;
M16,0 C13,-10 5,-14 -8,-18 C-20,-18 -28,-12 -29,-5 C-29,-2 -22,3 -10,7 C5,10 13,9 16,0 Z;
M16,0 C13,-11 5,-17 -10,-16 C-22,-14 -29,-8 -29,0 C-29,8 -22,14 -10,16 C5,17 13,11 16,0 Z"/>
      </path>
      <path fill="${a2}" opacity=".72">
        <animate attributeName="d" dur="0.6s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1"
          keyTimes="0;0.25;0.5;0.75;1"
          values="
M-29,-2.5 L-47,-19 L-44,0 L-47,19 L-29,2.5 Z;
M-29,5 L-43,-12 L-44,5 L-47,24 L-29,9 Z;
M-29,-2.5 L-47,-19 L-44,0 L-47,19 L-29,2.5 Z;
M-29,-7 L-47,-26 L-45,-7 L-43,12 L-29,-1 Z;
M-29,-2.5 L-47,-19 L-44,0 L-47,19 L-29,2.5 Z"/>
      </path>
      <path d="M7,-16 Q-2,-28 -15,-22 Q-10,-16 7,-16 Z" fill="${a2}" opacity=".5"/>
      <path d="M-3,16 Q-13,26 -20,21 Q-14,16 -3,16 Z" fill="${a2}" opacity=".38"/>
      <circle cx="12" cy="-2.5" r="4" fill="${a1}"/>
      <circle cx="13.5" cy="-3.5" r="1.5" fill="white" opacity=".75"/>
      <path d="M8,-11 Q5,0 8,11" fill="none" stroke="${a1}" stroke-width="1.1" opacity=".35"/>
    </g>
  </g>

</svg>`;
    },

    contentSvg(w, h, a1, a2, doAnimate) {
      const uid = 'ocs' + Math.random().toString(36).slice(2,8);
      const ow = 1280, oh = 720;
      const WC = "M0.0,597.6 C30.4,601.0 99.2,610.6 160.0,615.4 C220.8,620.2 259.2,622.8 320.0,622.8 C380.8,622.8 419.2,620.2 480.0,615.4 C540.8,610.6 579.2,604.4 640.0,597.6 C700.8,590.8 739.2,584.6 800.0,579.8 C860.8,575.0 899.2,572.4 960.0,572.4 C1020.8,572.4 1059.2,575.0 1120.0,579.8 C1180.8,584.6 1249.6,594.2 1280.0,597.6 L1280.0,720.0 L0,720.0 Z;M0.0,610.2 C30.4,612.4 99.2,620.2 160.0,621.9 C220.8,623.7 259.2,622.8 320.0,619.4 C380.8,616.0 419.2,610.7 480.0,604.1 C540.8,597.6 579.2,590.9 640.0,585.0 C700.8,579.1 739.2,575.0 800.0,573.3 C860.8,571.5 899.2,572.4 960.0,575.8 C1020.8,579.2 1059.2,584.5 1120.0,591.1 C1180.8,597.6 1249.6,606.6 1280.0,610.2 L1280.0,720.0 L0,720.0 Z;M0.0,619.4 C30.4,619.9 99.2,623.7 160.0,621.9 C220.8,620.2 259.2,616.1 320.0,610.2 C380.8,604.3 419.2,597.6 480.0,591.1 C540.8,584.5 579.2,579.2 640.0,575.8 C700.8,572.4 739.2,571.5 800.0,573.3 C860.8,575.0 899.2,579.1 960.0,585.0 C1020.8,590.9 1059.2,597.6 1120.0,604.1 C1180.8,610.7 1249.6,616.5 1280.0,619.4 L1280.0,720.0 L0,720.0 Z;M0.0,622.8 C30.4,621.4 99.2,620.2 160.0,615.4 C220.8,610.6 259.2,604.4 320.0,597.6 C380.8,590.8 419.2,584.6 480.0,579.8 C540.8,575.0 579.2,572.4 640.0,572.4 C700.8,572.4 739.2,575.0 800.0,579.8 C860.8,584.6 899.2,590.8 960.0,597.6 C1020.8,604.4 1059.2,610.6 1120.0,615.4 C1180.8,620.2 1249.6,621.4 1280.0,622.8 L1280.0,720.0 L0,720.0 Z;M0.0,619.4 C30.4,616.5 99.2,610.7 160.0,604.1 C220.8,597.6 259.2,590.9 320.0,585.0 C380.8,579.1 419.2,575.0 480.0,573.3 C540.8,571.5 579.2,572.4 640.0,575.8 C700.8,579.2 739.2,584.5 800.0,591.1 C860.8,597.6 899.2,604.3 960.0,610.2 C1020.8,616.1 1059.2,620.2 1120.0,621.9 C1180.8,623.7 1249.6,619.9 1280.0,619.4 L1280.0,720.0 L0,720.0 Z;M0.0,610.2 C30.4,606.6 99.2,597.6 160.0,591.1 C220.8,584.5 259.2,579.2 320.0,575.8 C380.8,572.4 419.2,571.5 480.0,573.3 C540.8,575.0 579.2,579.1 640.0,585.0 C700.8,590.9 739.2,597.6 800.0,604.1 C860.8,610.7 899.2,616.0 960.0,619.4 C1020.8,622.8 1059.2,623.7 1120.0,621.9 C1180.8,620.2 1249.6,612.4 1280.0,610.2 L1280.0,720.0 L0,720.0 Z;M0.0,597.6 C30.4,594.2 99.2,584.6 160.0,579.8 C220.8,575.0 259.2,572.4 320.0,572.4 C380.8,572.4 419.2,575.0 480.0,579.8 C540.8,584.6 579.2,590.8 640.0,597.6 C700.8,604.4 739.2,610.6 800.0,615.4 C860.8,620.2 899.2,622.8 960.0,622.8 C1020.8,622.8 1059.2,620.2 1120.0,615.4 C1180.8,610.6 1249.6,601.0 1280.0,597.6 L1280.0,720.0 L0,720.0 Z;M0.0,585.0 C30.4,582.8 99.2,575.0 160.0,573.3 C220.8,571.5 259.2,572.4 320.0,575.8 C380.8,579.2 419.2,584.5 480.0,591.1 C540.8,597.6 579.2,604.3 640.0,610.2 C700.8,616.1 739.2,620.2 800.0,621.9 C860.8,623.7 899.2,622.8 960.0,619.4 C1020.8,616.0 1059.2,610.7 1120.0,604.1 C1180.8,597.6 1249.6,588.6 1280.0,585.0 L1280.0,720.0 L0,720.0 Z;M0.0,575.8 C30.4,575.3 99.2,571.5 160.0,573.3 C220.8,575.0 259.2,579.1 320.0,585.0 C380.8,590.9 419.2,597.6 480.0,604.1 C540.8,610.7 579.2,616.0 640.0,619.4 C700.8,622.8 739.2,623.7 800.0,621.9 C860.8,620.2 899.2,616.1 960.0,610.2 C1020.8,604.3 1059.2,597.6 1120.0,591.1 C1180.8,584.5 1249.6,578.7 1280.0,575.8 L1280.0,720.0 L0,720.0 Z;M0.0,572.4 C30.4,573.8 99.2,575.0 160.0,579.8 C220.8,584.6 259.2,590.8 320.0,597.6 C380.8,604.4 419.2,610.6 480.0,615.4 C540.8,620.2 579.2,622.8 640.0,622.8 C700.8,622.8 739.2,620.2 800.0,615.4 C860.8,610.6 899.2,604.4 960.0,597.6 C1020.8,590.8 1059.2,584.6 1120.0,579.8 C1180.8,575.0 1249.6,573.8 1280.0,572.4 L1280.0,720.0 L0,720.0 Z;M0.0,575.8 C30.4,578.7 99.2,584.5 160.0,591.1 C220.8,597.6 259.2,604.3 320.0,610.2 C380.8,616.1 419.2,620.2 480.0,621.9 C540.8,623.7 579.2,622.8 640.0,619.4 C700.8,616.0 739.2,610.7 800.0,604.1 C860.8,597.6 899.2,590.9 960.0,585.0 C1020.8,579.1 1059.2,575.0 1120.0,573.3 C1180.8,571.5 1249.6,575.3 1280.0,575.8 L1280.0,720.0 L0,720.0 Z;M0.0,585.0 C30.4,588.6 99.2,597.6 160.0,604.1 C220.8,610.7 259.2,616.0 320.0,619.4 C380.8,622.8 419.2,623.7 480.0,621.9 C540.8,620.2 579.2,616.1 640.0,610.2 C700.8,604.3 739.2,597.6 800.0,591.1 C860.8,584.5 899.2,579.2 960.0,575.8 C1020.8,572.4 1059.2,571.5 1120.0,573.3 C1180.8,575.0 1249.6,582.8 1280.0,585.0 L1280.0,720.0 L0,720.0 Z;M0.0,597.6 C30.4,601.0 99.2,610.6 160.0,615.4 C220.8,620.2 259.2,622.8 320.0,622.8 C380.8,622.8 419.2,620.2 480.0,615.4 C540.8,610.6 579.2,604.4 640.0,597.6 C700.8,590.8 739.2,584.6 800.0,579.8 C860.8,575.0 899.2,572.4 960.0,572.4 C1020.8,572.4 1059.2,575.0 1120.0,579.8 C1180.8,584.6 1249.6,594.2 1280.0,597.6 L1280.0,720.0 L0,720.0 Z";
      const KS = '0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1';
      const WCs = WC.split(';')[0];
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${ow} ${oh}" preserveAspectRatio="none" overflow="hidden">
  <defs>
    <linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a1}" stop-opacity="0"/>
      <stop offset="1" stop-color="${a2}" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <path d="${WCs}" fill="url(#${uid}g)" opacity=".9">
    ${doAnimate?`<animate attributeName="d" dur="7s" repeatCount="indefinite" calcMode="linear" values="${WC}"/>`:''}
  </path>
  <!-- Jump fish 1 — размер L, тело как Fish1 в titleSvg -->
  <g opacity="0" transform="translate(358.4,622.8)">
    <animateTransform attributeName="transform" type="translate"
      dur="8s" repeatCount="indefinite"
      keyTimes="0;0.70;0.72;0.79;0.86;0.92;0.96;1"
      calcMode="spline" keySplines="0 0 1 1;0.1 0 0.5 1;0.2 0 0.5 1;0.5 0 0.8 1;0.3 0 0.6 1;0.5 0 0.5 1;0 0 1 1"
      values="358.4 622.8;358.4 622.8;358.4 619.7;384.0 338.4;390.4 351.9;377.6 635.3;358.4 625.9;358.4 622.8"/>
    <animate attributeName="opacity"
      dur="8s" repeatCount="indefinite"
      keyTimes="0;0.70;0.72;0.78;0.85;0.92;0.96;1"
      values="0;0;0.35;0.35;0.25;0.12;0;0"/>
    <g>
      <animateTransform attributeName="transform" type="rotate"
        dur="8s" repeatCount="indefinite"
        keyTimes="0;0.70;0.79;0.86;0.92;1"
        values="0;0;-42.0;-18.9;5.0;0"/>
      <path d="M14,0 C12,-9 4,-14 -8,-13 C-18,-11 -24,-6 -24,0 C-24,6 -18,11 -8,13 C4,14 12,9 14,0 Z" fill="${a1}" opacity=".88"/>
      <path d="M-24,-2 L-40,-16 L-37,0 L-40,16 L-24,2 Z" fill="${a1}" opacity=".72"/>
      <path d="M5,-13 Q-4,-23 -14,-18 Q-10,-13 5,-13 Z" fill="${a1}" opacity=".5"/>
      <path d="M-2,13 Q-10,22 -16,17 Q-11,13 -2,13 Z" fill="${a1}" opacity=".4"/>
      <circle cx="10" cy="-2" r="3.2" fill="${a2}"/>
      <circle cx="11.2" cy="-3" r="1.2" fill="white" opacity=".75"/>
    </g>
  </g>
  <!-- Jump fish 2 — размер M, тело как Fish2 -->
  <g opacity="0" transform="translate(793.6,626.4)">
    <animateTransform attributeName="transform" type="translate"
      dur="11s" repeatCount="indefinite" begin="3.5s"
      keyTimes="0;0.70;0.72;0.79;0.86;0.92;0.96;1"
      calcMode="spline" keySplines="0 0 1 1;0.1 0 0.5 1;0.2 0 0.5 1;0.5 0 0.8 1;0.3 0 0.6 1;0.5 0 0.5 1;0 0 1 1"
      values="793.6 626.4;793.6 626.4;793.6 623.3;819.2 331.2;825.6 344.4;812.8 638.9;793.6 629.5;793.6 626.4"/>
    <animate attributeName="opacity"
      dur="11s" repeatCount="indefinite" begin="3.5s"
      keyTimes="0;0.70;0.72;0.78;0.85;0.92;0.96;1"
      values="0;0;0.35;0.35;0.25;0.12;0;0"/>
    <g>
      <animateTransform attributeName="transform" type="rotate"
        dur="11s" repeatCount="indefinite" begin="3.5s"
        keyTimes="0;0.70;0.79;0.86;0.92;1"
        values="0;0;-38.0;-17.1;4.6;0"/>
      <path d="M12,0 C10,-7 3,-11 -6,-10 C-14,-9 -19,-5 -19,0 C-19,5 -14,9 -6,10 C3,11 10,7 12,0 Z" fill="${a2}" opacity=".88"/>
      <path d="M-19,-2 L-32,-13 L-30,0 L-32,13 L-19,2 Z" fill="${a2}" opacity=".72"/>
      <path d="M4,-10 Q-3,-18 -11,-14 Q-8,-10 4,-10 Z" fill="${a2}" opacity=".48"/>
      <path d="M-2,10 Q-8,17 -13,13 Q-9,10 -2,10 Z" fill="${a2}" opacity=".38"/>
      <circle cx="9" cy="-1.5" r="2.7" fill="${a1}"/>
      <circle cx="10" cy="-2.3" r="1" fill="white" opacity=".75"/>
    </g>
  </g>
  <!-- Jump fish 3 — размер S, тело как Fish3 -->
  <g opacity="0" transform="translate(576.0,615.6)">
    <animateTransform attributeName="transform" type="translate"
      dur="9s" repeatCount="indefinite" begin="7s"
      keyTimes="0;0.70;0.72;0.79;0.86;0.92;0.96;1"
      calcMode="spline" keySplines="0 0 1 1;0.1 0 0.5 1;0.2 0 0.5 1;0.5 0 0.8 1;0.3 0 0.6 1;0.5 0 0.5 1;0 0 1 1"
      values="576.0 615.6;576.0 615.6;576.0 612.5;601.6 345.6;608.0 359.4;595.2 627.9;576.0 618.7;576.0 615.6"/>
    <animate attributeName="opacity"
      dur="9s" repeatCount="indefinite" begin="7s"
      keyTimes="0;0.70;0.72;0.78;0.85;0.92;0.96;1"
      values="0;0;0.35;0.35;0.25;0.12;0;0"/>
    <g>
      <animateTransform attributeName="transform" type="rotate"
        dur="9s" repeatCount="indefinite" begin="7s"
        keyTimes="0;0.70;0.79;0.86;0.92;1"
        values="0;0;-40.0;-18.0;4.8;0"/>
      <path d="M10,0 C8,-6 2,-9 -5,-8 C-11,-7 -15,-4 -15,0 C-15,4 -11,7 -5,8 C2,9 8,6 10,0 Z" fill="${a1}" opacity=".85"/>
      <path d="M-15,-1.5 L-25,-10 L-23,0 L-25,10 L-15,1.5 Z" fill="${a1}" opacity=".70"/>
      <path d="M3,-8 Q-2,-15 -9,-11 Q-6,-8 3,-8 Z" fill="${a1}" opacity=".45"/>
      <circle cx="7" cy="-1.5" r="2.2" fill="${a2}"/>
      <circle cx="8" cy="-2.2" r="0.8" fill="white" opacity=".75"/>
    </g>
  </g>

</svg>`;
    },
  },


  // ══ FIRE ═══════════════════════════════════════════════════════════════════
  {
    name:'Огонь', nameEn:'Fire',
    desc:'Живое пламя', descEn:'Living fire',
    animated: true,

    _fireSvg(w, h, a1, a2, doAnimate, yOffset, masterOp, staticSeed) {
      if(yOffset===undefined)yOffset=0;
      if(masterOp===undefined)masterOp=1.0;
      if(staticSeed===undefined)staticSeed=null;
      const uid = 'fx' + Math.random().toString(36).slice(2,9);
      const cx  = w * 0.5;

      // ── Одна органическая волна пламени ──────────────────────────────────
      function flamePath(seed, heightFactor) {
        const pts  = 14;
        const overshoot = w * 0.18;  // выход за края
        const step = (w + overshoot * 2) / pts;
        const peakY = h * (1 - heightFactor);
        const segs = [];
        for (let i = 0; i <= pts; i++) {
          const phase = (i / pts) * Math.PI * 2 + seed;
          const sway  = Math.sin(phase) * w * 0.09;  // шире волны
          const yVar  = Math.sin(phase * 2.1 + seed * 0.8) * h * 0.1;
          const edge  = 1 - Math.pow((i / pts - 0.5) * 2, 2) * 0.75;
          const y     = Math.max(peakY * 0.5, peakY + yVar + (1 - edge) * h * 0.32);
          segs.push({ x: -overshoot + i * step + sway, y });
        }
        let d = `M0,${h} `;
        segs.forEach((p, i) => {
          if (i === 0) {
            d += `L${p.x.toFixed(1)},${p.y.toFixed(1)} `;
          } else {
            const prev = segs[i - 1];
            const cpX  = (prev.x + p.x) / 2;
            const cpY  = (prev.y + p.y) / 2;
            d += `Q${cpX.toFixed(1)},${cpY.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)} `;
          }
        });
        return d + `L${w + overshoot},${h} L${-overshoot},${h} Z`;
      }

      function flameKF(seed, hf, n) {
        // Последний кадр = первому, чтобы анимация не прыгала при повторе
        const frames = Array.from({length: n}, (_, i) =>
          flamePath(seed + i * Math.PI * 2 / n, hf));
        frames.push(frames[0]);
        return frames.join(';');
      }

      // heightFactor 0.45 — пламя на нижней половине слайда
      // Статичный кадр: staticSeed=текущая фаза анимации, иначе кадр 8
      const _staticSeed = staticSeed !== null ? staticSeed : (8 * Math.PI * 2 / 12);
      const f1s  = doAnimate ? flamePath(0, 0.45) : flamePath(_staticSeed, 0.45);
      const f1kf = flameKF(0, 0.45, 12);

      // ── 32 искры-палочки, тлеющие при подъёме ───────────────────────────
      // Тление: opacity нарастает быстро, потом медленно угасает по мере подъёма
      // + уменьшение толщины (r) — искра "догорает"
      const NSPARKS = 32; // всегда 32, в статике рендерим без анимации
      const sparks = Array.from({length: NSPARKS}, (_, i) => {
        // Детерминированные псевдорандомные значения
        const r1 = (i * 137 + 31)  % 100 / 100;   // 0..1
        const r2 = (i * 251 + 71)  % 100 / 100;
        const r3 = (i * 97  + 13)  % 100 / 100;
        const r4 = (i * 179 + 53)  % 100 / 100;
        const r5 = (i * 313 + 89)  % 100 / 100;

        // Стартовая позиция — у основания в зоне пламени (центр ±40%)
        const sx   = w * (0.1 + r1 * 0.8);
        const sy   = h * (0.88 + r2 * 0.10);

        // Параметры полёта
        const dur  = (1.6 + r3 * 1.8).toFixed(2);        // 1.6–3.4s
        const beg  = (r4 * +dur).toFixed(2);              // случайный старт

        // Форма искры: тонкая палочка, разная толщина
        const thick = (1.2 + r5 * 3.2).toFixed(1);        // 1.2–4.4px
        const len   = Math.round(5 + r1 * 20);             // 5–25px

        // Траектория: вверх с дрейфом и изгибом
        const drift = (r2 * 80 - 40);                     // -40..+40px горизонтально
        const rise  = h * (0.55 + r3 * 0.35);             // насколько поднимается
        const wobX  = w * 0.06 * (i % 2 === 0 ? 1 : -1); // изгиб
        const mx    = sx + drift * 0.45 + wobX;           // mid control point x
        const my    = sy - rise * 0.55;
        const ex    = sx + drift;
        const ey    = sy - rise;

        // Вращение при подъёме
        const rot0  = Math.round(-20 - r4 * 60);          // -20...-80°
        const rotD  = Math.round(25 + r5 * 55);           // доп. поворот

        // Цвет: горячий центр a2, края a1
        const col = r1 > 0.65 ? a2 : a1;

        // Тление opacity: 0 → яркая вспышка → медленно догорает → 0
        // keyTimes: 0, появление(0.08), пик(0.20), тление(0.70), угасание(1)
        const opPeak = (0.7 + r2 * 0.28).toFixed(2);

        // В статике: позиция на 65% подъёма (≈кадр 8), прозрачность тления
        const t65 = 0.65; // позиция вдоль траектории при кадре 8
        const staticX = (sx + (mx - sx) * t65 * 2 > ex ? ex : sx + (mx - sx) * t65).toFixed(1);
        // квадратичная интерполяция Q sx,sy mx,my ex,ey при t=0.65
        const qt = t65;
        const qx = ((1-qt)*(1-qt)*sx + 2*(1-qt)*qt*mx + qt*qt*ex).toFixed(1);
        const qy = ((1-qt)*(1-qt)*sy + 2*(1-qt)*qt*my + qt*qt*ey).toFixed(1);
        const staticOp = (opPeak * 0.22).toFixed(2); // тлеющая прозрачность
        const staticW = (thick * 0.55).toFixed(1);
        const staticH = Math.round(len * 0.5);
        const staticRot = rot0 + rotD;

        if(!doAnimate){
          // Только если искра "видима" на этом кадре (не все 32 — берём каждую вторую)
          if(i % 2 !== 0) return '';
          return `<g transform="translate(${qx},${qy}) rotate(${staticRot})">
            <rect x="${(-staticW/2).toFixed(1)}" y="${-staticH}" width="${staticW}" height="${staticH}"
              rx="${(staticW/2).toFixed(1)}" fill="${col}" opacity="${staticOp}"/>
          </g>`;
        }

        return `<g>
          <rect x="${(-thick/2).toFixed(1)}" y="${-len}" width="${thick}" height="${len}"
            rx="${(thick/2).toFixed(1)}" fill="${col}" opacity="0"
            stroke="${col}" stroke-width="0.5" stroke-opacity="0.5">
            <animate attributeName="opacity" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.08;0.22;0.65;1"
              keySplines="0.1 0 0.3 1;0.2 0 0.5 1;0.4 0 0.7 1;0.7 0 1 1"
              values="0;${opPeak};${(opPeak*0.75).toFixed(2)};${(opPeak*0.18).toFixed(2)};0"/>
            <animate attributeName="height" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"
              calcMode="spline" keySplines="0.3 0 0.7 1;0.5 0 0.9 1" keyTimes="0;0.5;1"
              values="${len};${Math.round(len*0.7)};${Math.round(len*0.25)}"/>
            <animate attributeName="width" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"
              calcMode="spline" keySplines="0.4 0 0.8 1" keyTimes="0;1"
              values="${thick};${(thick*0.3).toFixed(1)}"/>
          </rect>
          <animateMotion dur="${dur}s" begin="${beg}s" repeatCount="indefinite"
            calcMode="spline" keySplines="0.3 0.8 0.6 1;0.4 0 0.8 0.6" keyTimes="0;0.5;1"
            path="M${sx.toFixed(1)},${sy.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}"/>
          <animateTransform attributeName="transform" type="rotate" additive="sum"
            dur="${dur}s" begin="${beg}s" repeatCount="indefinite"
            calcMode="spline" keySplines="0.25 0 0.75 1;0.25 0 0.75 1" keyTimes="0;0.5;1"
            values="${rot0};${rot0 + rotD};${rot0 + rotD * 2}"/>
        </g>`;
      }).filter(Boolean).join('\n  ');

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
  <defs>
    <radialGradient id="${uid}gl" cx="50%" cy="100%" r="60%">
      <stop offset="0%"   stop-color="${a2}" stop-opacity="1"/>
      <stop offset="35%"  stop-color="${a1}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${a1}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${uid}fg" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%"   stop-color="${a2}" stop-opacity="1"/>
      <stop offset="28%"  stop-color="${a1}" stop-opacity="0.85"/>
      <stop offset="70%"  stop-color="${a1}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${a1}" stop-opacity="0"/>
    </linearGradient>
    <!-- Сильный blur для пламени -->
    <filter id="${uid}fb" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="45"/>
    </filter>
    <!-- Средний blur для свечения -->
    <filter id="${uid}gb" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="36"/>
    </filter>
  </defs>

  <g transform="translate(0,${yOffset})" opacity="${masterOp}">
  <!-- Пульсирующее свечение у основания (сильный blur) -->
  <ellipse cx="${cx}" cy="${h}" rx="${w * 0.42}" ry="${h * 0.22}"
    fill="url(#${uid}gl)" filter="url(#${uid}gb)">
    ${doAnimate ? (
      '<animate attributeName="ry" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" values="'+h*0.22+';'+h*0.38+';'+h*0.22+'"/>'+
      '<animate attributeName="rx" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" values="'+w*0.42+';'+w*0.62+';'+w*0.42+'"/>'+
      '<animate attributeName="opacity" dur="1.7s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" values="0.9;0.42;0.9"/>'
    ) : ''}
  </ellipse>

  <!-- Одна волна пламени с сильным размытием -->
  <path d="${f1s}" fill="url(#${uid}fg)" filter="url(#${uid}fb)">
    ${doAnimate ? '<animate attributeName="d" dur="5.5s" repeatCount="indefinite" calcMode="linear" values="'+f1kf+'"/>' : ''}
  </path>

  <!-- Искры-палочки, тлеющие при подъёме -->
  ${sparks}
  </g>
</svg>`;
    },

    titleSvg(w, h, a1, a2, doAnimate, _u1, _u2, staticSeed)   { return this._fireSvg(w, h, a1, a2, doAnimate !== false, 100,  1.0,  staticSeed); },
    contentSvg(w, h, a1, a2, doAnimate, _u1, _u2, staticSeed) { return this._fireSvg(w, h, a1, a2, doAnimate !== false, 260, 0.55, staticSeed); },
  },



  // ── 15. DESERT ── барханы, верблюд, солнце, песчинки
  {
    name:'Пустыня', nameEn:'Desert',
    desc:'Барханы, верблюд и ветер', descEn:'Dunes, camel and desert wind',
    animated: true,

    _build(w, h, a1, a2, isTitle, doAnimate) {
      const uid = 'ds' + Math.random().toString(36).slice(2,8);
      const W = w, H = h;

      // ── Бесшовный тайл бархана ──────────────────────────────────────────────
      // Используем ЦЕЛОЕ число периодов синуса на тайл => y[0] == y[W] => шов невидим
      // nPeriods должно быть целым числом
      const makeDuneTile = (yTop, amp, nPeriods) => {
        const steps = 120;
        const pts = [];
        for (let i = 0; i <= steps; i++) {
          const xi = (i / steps) * W;
          const y  = yTop + amp * Math.sin((i / steps) * Math.PI * 2 * nPeriods);
          pts.push(`${xi.toFixed(1)},${y.toFixed(1)}`);
        }
        // Замыкаем вниз
        pts.push(`${W.toFixed(1)},${H}`);
        pts.push(`0,${H}`);
        return pts.join(' ');
      };

      // 3 уровня: дальний (медленно), средний, ближний (быстро)
      const p3 = makeDuneTile(H * 0.52, H * 0.055, 2);
      const p2 = makeDuneTile(H * 0.64, H * 0.048, 3);
      const p1 = makeDuneTile(H * 0.77, H * 0.038, 2);

      const sunX = W * 0.72, sunY = H * 0.38;

      const camelEl = '';





                  // ── Песчинки — рои, взлетающие с барханов ───────────────────────────────
      // Много частиц, появляются группами, взлетают вверх и исчезают
      const rng = s => { let x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
      let grains = '';
      const nG = 80;
      for (let i = 0; i < nG; i++) {
        // Случайная X-позиция старта (по всей ширине)
        const gx   = (rng(i * 7    ) * W).toFixed(1);
        // Y старта — на поверхности одного из барханов (между ~55% и 85%)
        const gyFrac = 0.55 + rng(i * 7 + 1) * 0.30;
        const gy   = (H * gyFrac).toFixed(1);
        const gr   = (rng(i * 7 + 2) * 2.2 + 0.5).toFixed(2);
        // Дрейф: вверх и немного вбок
        const driftX = ((rng(i * 7 + 3) - 0.4) * W * 0.12).toFixed(1);
        const riseY  = (-(H * (0.08 + rng(i * 7 + 4) * 0.18))).toFixed(1);
        const dur    = (1.5 + rng(i * 7 + 5) * 3.5).toFixed(2);
        // Начало — разброс по времени чтобы не все сразу
        const beg    = (rng(i * 7 + 6) * 8).toFixed(2);
        const op     = (0.15 + rng(i * 7 + 0.5) * 0.6).toFixed(2);

        if (doAnimate) {
          grains +=
            `<circle cx="${gx}" cy="${gy}" r="${gr}" fill="${a2}" opacity="0">` +
              // Появление -> полная видимость -> исчезновение вверху
              `<animate attributeName="opacity" ` +
                `values="0;${op};${op};0" ` +
                `keyTimes="0;0.1;0.7;1" ` +
                `dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>` +
              // Дрейф X
              `<animate attributeName="cx" ` +
                `values="${gx};${(+gx + +driftX).toFixed(1)}" ` +
                `dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines=".2 0 .8 1"/>` +
              // Взлёт Y
              `<animate attributeName="cy" ` +
                `values="${gy};${(+gy + +riseY).toFixed(1)}" ` +
                `dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines=".4 0 .6 1"/>` +
              // Радиус чуть уменьшается при подъёме
              `<animate attributeName="r" ` +
                `values="${gr};${(+gr * 0.3).toFixed(2)}" ` +
                `dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .7 1"/>` +
            `</circle>`;
        } else {
          grains += `<circle cx="${gx}" cy="${gy}" r="${gr}" fill="${a2}" opacity="${(+op * 0.4).toFixed(2)}"/>`;
        }
      }

      // ── Скролл барханов (параллакс) ─────────────────────────────────────────
      // Ближний dur=5s, средний dur=11s, дальний dur=20s — движение ВПРАВО
      // translate от 0 до -W (влево), визуально контент уходит влево, 
      // т.е. "пейзаж едет вправо под верблюдом"
      const scrollDune = (prof, fill, op, dur, sd) => {
        if (!doAnimate)
          return `<polygon points="${prof}" fill="${fill}" opacity="${op}"/>`;
        const anim =
          `<animateTransform attributeName="transform" type="translate" ` +
          `values="0,0; -${W},0" ` +
          `dur="${dur}s" begin="${sd}s" repeatCount="indefinite" calcMode="linear"/>`;
        const shift = (prof, ox) =>
          prof.split(' ').map(pt => {
            const [x, y] = pt.split(',');
            return `${(+x + ox).toFixed(1)},${y}`;
          }).join(' ');
        // 3 тайла: 0, W, 2W
        return `<g>${anim}` +
          `<polygon points="${shift(prof, 0)}"   fill="${fill}" opacity="${op}"/>` +
          `<polygon points="${shift(prof, W)}"   fill="${fill}" opacity="${op}"/>` +
          `<polygon points="${shift(prof, W*2)}" fill="${fill}" opacity="${op}"/>` +
          `</g>`;
      };

      const defs =
        `<defs>` +
          `<radialGradient id="${uid}sun" cx="${(sunX/W*100).toFixed(1)}%" cy="${(sunY/H*100).toFixed(1)}%" r="55%">` +
            `<stop offset="0%"   stop-color="${a2}" stop-opacity="0.65"/>` +
            `<stop offset="30%"  stop-color="${a2}" stop-opacity="0.25"/>` +
            `<stop offset="70%"  stop-color="${a1}" stop-opacity="0.07"/>` +
            `<stop offset="100%" stop-color="${a1}" stop-opacity="0"/>` +
          `</radialGradient>` +
          `<filter id="${uid}sf" x="-60%" y="-60%" width="220%" height="220%">` +
            `<feGaussianBlur stdDeviation="${(H*0.09).toFixed(0)}"/>` +
          `</filter>` +
        `</defs>`;

      const sunHalo =
        `<ellipse cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" ` +
        `rx="${(W*0.40).toFixed(1)}" ry="${(H*0.38).toFixed(1)}" ` +
        `fill="url(#${uid}sun)" filter="url(#${uid}sf)"/>`;

      // Порядок рендера: dune3, dune2, ВЕРБЛЮД (за dune2!), dune1, песчинки
      return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" overflow="hidden">` +
          defs +
          sunHalo +
          scrollDune(p3, a1, 0.30, 20, 0) +
          scrollDune(p2, a2, 0.55, 11, 0) +
          camelEl +
          scrollDune(p1, a1, 0.80, 5, 0) +
          grains +
        `</svg>`
      );
    },

    titleSvg(w,h,a1,a2,doAnimate){ return this._build(w,h,a1,a2,true, doAnimate!==false); },
    contentSvg(w,h,a1,a2,doAnimate){
      // Для контентных слайдов — пустыня ниже (сдвинута вниз на 15%)
      const H2 = h, W2 = w;
      const svg = this._build(W2, H2, a1, a2, false, doAnimate!==false);
      // Оборачиваем в группу со сдвигом вниз
      return svg.replace('<svg ', `<svg `).replace(
        /(<svg[^>]*>)/,
        `$1<g transform="translate(0,${(H2*0.15).toFixed(0)})">`
      ).replace('</svg>', '</g></svg>');
    },
  },



  // ── MATRIX ── цифровой дождь
  {
    name:'Матрица',nameEn:'Matrix',
    desc:'Цифровой дождь, символы кода',descEn:'Digital rain, falling code symbols',
    animated: true,

    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='mx'+Math.random().toString(36).slice(2,7);
      const rng=(s)=>{ let x=Math.sin(s*127.1+311.7)*43758.5; return x-Math.floor(x); };

      const CHARS='アイウエオカキクケコサシスセソタチツテト01ナニヌネノ10ハヒフヘホ';
      const nCols  = isTitle ? 36 : 26;
      const colW   = w / nCols;
      const fs     = (colW * 0.75).toFixed(1);
      const lineH  = +fs * 1.48;
      const charsPerCol = Math.ceil((h + 200) / lineH) + 2;
      const baseOp = isTitle ? 1.0 : 0.2;

      // Угловые рамки
      const cs = 14;
      const cornerSvg = [
        `M 0,${cs} L 0,0 L ${cs},0`,
        `M ${w-cs},0 L ${w},0 L ${w},${cs}`,
        `M ${w},${h-cs} L ${w},${h} L ${w-cs},${h}`,
        `M ${cs},${h} L 0,${h} L 0,${h-cs}`,
      ].map(d=>`<path d="${d}" fill="none" stroke="${a1}" stroke-width="1.2" opacity="${isTitle?0.5:0.25}" stroke-linecap="square"/>`).join('');

      // Фильтры свечения
      const defs=`<defs>
        <filter id="${uid}gh" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="${uid}gb" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id="${uid}cp"><rect width="${w}" height="${h}"/></clipPath>
      </defs>`;

      let cols = '';

      for(let c=0;c<nCols;c++){
        const x        = (colW*(c+0.5)).toFixed(1);
        const dur      = (rng(c*3+0.1)*7+4).toFixed(1);
        const delay    = (-rng(c*3+0.7)*10).toFixed(2);
        const tailLen  = Math.round(rng(c*3+1.3)*9+5);
        const isBright = (c % 6 === 1);
        const colColor = isBright ? a2 : a1;
        const colOp    = ((rng(c*3+2.1)*0.3+0.55)*baseOp).toFixed(2);

        if(doAnimate){
          const totalH = (charsPerCol * lineH).toFixed(0);
          const startY = (-charsPerCol * lineH).toFixed(0);

          // Строим символы колонки — каждый на своей позиции Y, фиксированный
          let bodyChars = '';
          let glowChars = '';

          for(let ri=0;ri<charsPerCol;ri++){
            const cy       = (ri * lineH + lineH).toFixed(1);
            const ch       = CHARS[Math.floor(rng(c*31+ri*17)*CHARS.length)];
            const isHead   = ri === tailLen - 1;
            const isNeck   = ri >= tailLen - 3 && !isHead;
            const charOp   = isHead ? 1.0
                           : isNeck ? (0.55 + (tailLen-1-ri)*0.12)
                           : Math.max(0.05, (tailLen-ri)/(tailLen*1.6));
            const color    = isHead ? '#ffffff' : colColor;
            const t = `<text x="${x}" y="${cy}" text-anchor="middle" fill="${color}" opacity="${charOp.toFixed(2)}">${ch}</text>`;
            if(isHead || (isBright && isNeck)) glowChars += t;
            else bodyChars += t;
          }

          cols += `<g opacity="${colOp}" font-size="${fs}" font-family="'Courier New',monospace">
            <g>
              <animateTransform attributeName="transform" type="translate"
                values="0,${startY};0,${(h+lineH*2).toFixed(0)}"
                dur="${dur}s" begin="${delay}s" repeatCount="indefinite" calcMode="linear"/>
              <g filter="url(#${uid}gb)">${bodyChars}</g>
              <g filter="url(#${uid}gh)">${glowChars}</g>
            </g>
          </g>`;

        } else {
          // Статика
          const startY = h*0.15 + rng(c*5)*h*0.55;
          let staticChars = '';
          for(let ri=0;ri<tailLen;ri++){
            const cy = (startY + ri*lineH).toFixed(1);
            if(+cy < 0 || +cy > h+10) continue;
            const isHead = ri === tailLen-1;
            const charOp = (isHead ? 0.95 : Math.max(0.06,(tailLen-ri)/(tailLen*1.5))).toFixed(2);
            const ch = CHARS[Math.floor(rng(c*31+ri*17)*CHARS.length)];
            staticChars += `<text x="${x}" y="${cy}" text-anchor="middle" fill="${isHead?'#ffffff':colColor}" opacity="${charOp}">${ch}</text>`;
          }
          const flt = isBright ? `filter="url(#${uid}gb)"` : '';
          cols += `<g opacity="${colOp}" font-size="${fs}" font-family="'Courier New',monospace" ${flt}>${staticChars}</g>`;
        }
      }

      // 01 в правом нижнем углу
      const bigChar = isTitle
        ? `<text x="${(w*0.88).toFixed(0)}" y="${(h*0.96).toFixed(0)}"
            font-size="${(w*0.22).toFixed(0)}" font-family="'Courier New',monospace"
            fill="${a1}" opacity="0.05" text-anchor="middle">01</text>`
        : '';

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${defs}
        <g clip-path="url(#${uid}cp)">
          ${bigChar}${cols}${cornerSvg}
        </g>
      </svg>`;
    },

    titleSvg(w,h,a1,a2,doAnimate){ return this._build(w,h,a1,a2,true,doAnimate!==false); },
    contentSvg(w,h,a1,a2,doAnimate){ return this._build(w,h,a1,a2,false,doAnimate!==false); },
  },

  // ── BIRDS ──
  // themes appended below

  {
    name:'Лес', nameEn:'Forest',
    desc:'Силуэты лиственных деревьев, падающая листва',descEn:'Deciduous silhouettes, falling leaves',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='fr'+Math.random().toString(36).slice(2,7);
      const rng=s=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(1);
      const preWarm=isTitle?11:13;

      function crownPath(cx,cy,rx,ry,seed,lobes,openBottom){
        const n=lobes||14;
        const a0=openBottom?-Math.PI*0.92:-Math.PI;
        const a1=openBottom?Math.PI*0.92:Math.PI;
        const pts=[];
        for(let i=0;i<=n;i++){
          const t=i/n;
          const ang=a0+(a1-a0)*t;
          const lobe=0.72+0.28*Math.abs(Math.sin(t*Math.PI*n*0.5));
          const jag=0.88+rng(seed+i*7)*0.22;
          const rr=lobe*jag;
          const squash=(ang>0.35&&ang<Math.PI-0.35)?1.05:1;
          pts.push([cx+Math.cos(ang)*rx*rr, cy+Math.sin(ang)*ry*rr*squash]);
        }
        let d='M'+f(pts[0][0])+','+f(pts[0][1]);
        for(let i=1;i<pts.length;i++){
          const p0=pts[i-1], p1=pts[i];
          const mx=(p0[0]+p1[0])/2, my=(p0[1]+p1[1])/2;
          const dx=p1[0]-p0[0], dy=p1[1]-p0[1];
          const nx=-dy*0.18, ny=dx*0.18;
          const hyp=Math.hypot(mx-cx,my-cy)||1;
          const ox=(mx-cx)/hyp, oy=(my-cy)/hyp;
          d+=' Q'+f(mx+nx*0.15+ox*rx*0.06)+','+f(my+ny*0.15+oy*ry*0.06)+' '+f(p1[0])+','+f(p1[1]);
        }
        if(openBottom){
          d+=' L'+f(cx+rx*0.08)+','+f(cy+ry*0.55)+' L'+f(cx-rx*0.08)+','+f(cy+ry*0.55)+' Z';
        } else d+=' Z';
        return d;
      }

      function trunkPath(tx,baseY,topY,botW,topW,lean,seed){
        const midY=(baseY+topY)/2;
        const leanX=lean*(baseY-topY)*0.12;
        const flare=botW*0.55;
        const L0=tx-botW/2-flare*0.35, R0=tx+botW/2+flare*0.35;
        const L1=tx-botW*0.42+leanX*0.4, R1=tx+botW*0.42+leanX*0.4;
        const L2=tx-topW/2+leanX, R2=tx+topW/2+leanX;
        const bump=rng(seed)*0.3-0.15;
        return 'M'+f(L0)+','+f(baseY)+
          ' C'+f(L0+botW*0.05)+','+f(baseY-(baseY-midY)*0.4)+' '+f(L1-bump*botW)+','+f(midY)+' '+f(L2)+','+f(topY)+
          ' L'+f(R2)+','+f(topY)+
          ' C'+f(R1+bump*botW)+','+f(midY)+' '+f(R0-botW*0.05)+','+f(baseY-(baseY-midY)*0.4)+' '+f(R0)+','+f(baseY)+
          ' C'+f(tx+botW*0.15)+','+f(baseY+flare*0.25)+' '+f(tx-botW*0.15)+','+f(baseY+flare*0.25)+' '+f(L0)+','+f(baseY)+' Z';
      }

      function branch(x0,y0,x1,y1,w0,col,op){
        const mx=(x0+x1)/2+(y0-y1)*0.12;
        const my=(y0+y1)/2+(x1-x0)*0.08;
        const ang=Math.atan2(y1-y0,x1-x0);
        const nx=Math.cos(ang+Math.PI/2), ny=Math.sin(ang+Math.PI/2);
        const w1=w0*0.22;
        return '<path d="M'+f(x0+nx*w0)+','+f(y0+ny*w0)+
          ' Q'+f(mx+nx*w0*0.5)+','+f(my+ny*w0*0.5)+' '+f(x1+nx*w1)+','+f(y1+ny*w1)+
          ' L'+f(x1-nx*w1)+','+f(y1-ny*w1)+
          ' Q'+f(mx-nx*w0*0.5)+','+f(my-ny*w0*0.5)+' '+f(x0-nx*w0)+','+f(y0-ny*w0)+' Z"'+
          ' fill="'+col+'" opacity="'+op+'"/>';
      }

      function bigTree(tx,baseY,th,col,op,seed,opts){
        opts=opts||{};
        const lean=opts.lean||0;
        const face=opts.face||1;
        const trunkH=th*(opts.trunkFrac||0.46);
        const topY=baseY-trunkH;
        const botW=th*(opts.trunkBot||0.078);
        const topW=botW*(opts.taper||0.48);
        const cx=tx+lean*th*0.06+face*th*0.04;
        const cy=topY-th*(opts.crownLift||0.22);
        const rx=th*(opts.crownRx||0.38);
        const ry=th*(opts.crownRy||0.32);
        let g='';
        const limbs=[
          [0.55, face*0.55, -0.22, 0.55],
          [0.68, -face*0.42, -0.28, 0.42],
          [0.78, face*0.28, -0.38, 0.38],
          [0.42, -face*0.25, -0.12, 0.35],
          [0.88, face*0.15, -0.48, 0.28],
        ];
        limbs.forEach((L,i)=>{
          if(opts.branchN!=null&&i>=opts.branchN) return;
          const y0=baseY-trunkH*L[0];
          const x0=tx+lean*(baseY-y0)*0.1;
          const x1=cx+L[1]*rx*(0.85+rng(seed+i*13)*0.25);
          const y1=cy+L[2]*ry*(0.9+rng(seed+i*17)*0.2);
          const bw=topW*(L[3]*(0.7+rng(seed+i*19)*0.4));
          g+=branch(x0,y0,x1,y1,bw,col,(+op*0.88).toFixed(2));
        });
        g+='<path d="'+trunkPath(tx,baseY,topY,botW,topW,lean,seed)+'" fill="'+col+'" opacity="'+op+'"/>';
        g+='<path d="'+crownPath(cx,cy,rx,ry,seed,opts.lobes||16,true)+'" fill="'+col+'" opacity="'+op+'"/>';
        const cx2=cx+face*rx*0.18, cy2=cy-ry*0.12;
        g+='<path d="'+crownPath(cx2,cy2,rx*0.62,ry*0.55,seed+40,11,false)+'" fill="'+col+'" opacity="'+(+op*0.92).toFixed(2)+'"/>';
        g+='<path d="'+crownPath(cx-face*rx*0.1,cy+ry*0.28,rx*0.48,ry*0.32,seed+70,9,false)+'" fill="'+col+'" opacity="'+(+op*0.9).toFixed(2)+'"/>';
        return g;
      }

      function farCanopy(y,amp,col,op,seed,seg){
        const n=seg||18;
        let d='M0,'+f(h)+' L0,'+f(y);
        for(let i=0;i<=n;i++){
          const x=w*i/n;
          const peak=y-amp*(0.45+rng(seed+i)*0.55)*(0.7+0.3*Math.sin(i*1.7));
          const mid=y-amp*(0.15+rng(seed+i+0.5)*0.25);
          if(i===0) d+=' L'+f(x)+','+f(peak);
          else {
            const px=w*(i-0.5)/n;
            d+=' Q'+f(px)+','+f(mid)+' '+f(x)+','+f(peak);
          }
        }
        d+=' L'+f(w)+','+f(h)+' Z';
        return '<path d="'+d+'" fill="'+col+'" opacity="'+op+'"/>';
      }

      function groundWave(y0,amp,col,op,seed){
        let d='M0,'+f(h)+' L0,'+f(y0);
        const n=8;
        for(let i=1;i<=n;i++){
          const x=w*i/n;
          const y=y0+Math.sin(i*1.1+seed)*amp+rng(seed+i)*amp*0.3;
          const px=w*(i-0.5)/n;
          const py=y0+Math.sin((i-0.5)*1.1+seed)*amp;
          d+=' Q'+f(px)+','+f(py)+' '+f(x)+','+f(y);
        }
        d+=' L'+f(w)+','+f(h)+' Z';
        return '<path d="'+d+'" fill="'+col+'" opacity="'+op+'"/>';
      }

      function leafShape(r,ang,col,op,kind){
        const a=ang*Math.PI/180, cs=Math.cos(a), sn=Math.sin(a);
        const T=(x,y)=>[x*cs-y*sn, x*sn+y*cs];
        const P=(x,y)=>{const p=T(x,y);return f(p[0])+','+f(p[1]);};
        let d;
        if(kind===1){
          d='M'+P(0,r*0.4)+' C'+P(-r*0.45,r*0.15)+' '+P(-r*0.4,-r*0.5)+' '+P(0,-r*1.15)+' C'+P(r*0.4,-r*0.5)+' '+P(r*0.45,r*0.15)+' '+P(0,r*0.4)+' Z';
        } else {
          d='M'+P(0,r*0.35)+
            ' C'+P(-r*0.25,r*0.1)+' '+P(-r*0.7,-r*0.05)+' '+P(-r*0.55,-r*0.55)+
            ' C'+P(-r*0.2,-r*0.35)+' '+P(-r*0.15,-r*0.7)+' '+P(0,-r*1.05)+
            ' C'+P(r*0.15,-r*0.7)+' '+P(r*0.2,-r*0.35)+' '+P(r*0.55,-r*0.55)+
            ' C'+P(r*0.7,-r*0.05)+' '+P(r*0.25,r*0.1)+' '+P(0,r*0.35)+' Z';
        }
        const tip=T(0,-r*0.95), base=T(0,r*0.3);
        return '<g fill="'+col+'" opacity="'+op+'"><path d="'+d+'"/><line x1="'+f(base[0])+'" y1="'+f(base[1])+'" x2="'+f(tip[0])+'" y2="'+f(tip[1])+'" stroke="'+col+'" stroke-width="0.7" opacity="0.4"/></g>';
      }

      const _leafXY=(t,sx,phase,sway,y0,fall,drift)=>[
        sx+Math.sin(phase+t*Math.PI*2.2)*sway+Math.sin(phase*0.6+t*Math.PI)*sway*0.4+drift*t,
        y0+fall*t
      ];

      function makeLeaves(list){
        let out='';
        list.forEach((sp,i)=>{
          const col=i%2?c18:c17;
          const op=(sp.op0+rng(i*9+2)*sp.op1).toFixed(2);
          const r=sp.rm+rng(i*9+3)*sp.rs;
          const ang=rng(i*9+4)*360;
          const dur=sp.d0+rng(i*9)*sp.d1;
          const delay=rng(i*9+1)*dur;
          const begin=(delay-preWarm).toFixed(2);
          const sx=sp.x+rng(i*9+5)*sp.xw;
          const y0=sp.y+rng(i*9+6)*sp.yw;
          const fall=sp.fall||(h-y0+20);
          const sway=sp.sw0+rng(i*9+7)*sp.sw1;
          const phase=rng(i*9+8)*Math.PI*2;
          const drift=(rng(i*9+10)-0.5)*sp.drift;
          const spinDir=rng(i*9+11)>0.5?1:-1;
          const kind=rng(i*9+12)>0.45?1:0;
          if(doAnimate){
            const pts=[];
            for(let k=0;k<=8;k++){
              const t=k/8;
              const xy=_leafXY(t,sx,phase,sway,y0,fall,drift);
              pts.push(f(xy[0])+','+f(xy[1]));
            }
            const ks=Array(8).fill('0.4 0 0.6 1').join(';');
            out+='<g><animateTransform attributeName="transform" type="translate" values="'+pts.join(';')+'" keyTimes="0;0.1;0.22;0.36;0.5;0.64;0.78;0.9;1" keySplines="'+ks+'" dur="'+dur.toFixed(1)+'s" begin="'+begin+'s" repeatCount="indefinite" calcMode="spline"/><g><animateTransform attributeName="transform" type="rotate" values="0;'+(90*spinDir)+';'+(270*spinDir)+';'+(400*spinDir)+'" dur="'+(1.4+rng(i)*1.8).toFixed(2)+'s" repeatCount="indefinite"/>'+leafShape(r,ang,col,op,kind)+'</g></g>';
          } else {
            let el=preWarm-delay; while(el<0)el+=dur; el%=dur;
            const t=el/dur;
            const xy=_leafXY(t,sx,phase,sway,y0,fall,drift);
            out+='<g transform="translate('+f(xy[0])+','+f(xy[1])+') rotate('+((t*320*spinDir).toFixed(0))+')">'+leafShape(r,ang,col,op,kind)+'</g>';
          }
        });
        return out;
      }

      const defs='<defs><linearGradient id="'+uid+'sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+a2+'" stop-opacity="0.03"/><stop offset="70%" stop-color="'+a1+'" stop-opacity="0.06"/><stop offset="100%" stop-color="'+a1+'" stop-opacity="0.16"/></linearGradient><clipPath id="'+uid+'cp"><rect width="'+w+'" height="'+h+'"/></clipPath></defs>';

      let scene='<rect width="'+w+'" height="'+h+'" fill="url(#'+uid+'sky)"/>';
      let leaves='';

      if(isTitle){
        scene+=farCanopy(h*0.58,h*0.16,a2,'0.10',3.1,22);
        scene+=farCanopy(h*0.66,h*0.20,a1,'0.14',7.4,18);
        scene+=groundWave(h*0.78,h*0.025,a2,'0.08',1.2);

        [
          {x:0.10,th:0.48,op:0.22,lean:0.3,face:1,c:a2,s:11},
          {x:0.28,th:0.55,op:0.26,lean:-0.2,face:-1,c:a1,s:22},
          {x:0.48,th:0.42,op:0.20,lean:0.1,face:1,c:a2,s:33},
          {x:0.68,th:0.58,op:0.28,lean:-0.35,face:-1,c:a1,s:44},
          {x:0.88,th:0.50,op:0.24,lean:0.25,face:1,c:a2,s:55},
        ].forEach(t=>{
          scene+=bigTree(w*t.x,h*0.92,h*t.th,t.c,t.op.toFixed(2),t.s,{
            lean:t.lean, face:t.face, trunkFrac:0.40, crownRx:0.40, crownRy:0.34, crownLift:0.24, lobes:15, branchN:4
          });
        });
        scene+=groundWave(h*0.88,h*0.02,a1,'0.10',2.5);

        [
          {x:0.00,th:0.82,op:0.40,lean:0.55,face:1,c:a1,s:101},
          {x:0.22,th:0.68,op:0.34,lean:0.15,face:1,c:a2,s:112},
          {x:0.55,th:0.88,op:0.44,lean:-0.2,face:-1,c:a1,s:123},
          {x:0.85,th:0.74,op:0.38,lean:-0.5,face:-1,c:a2,s:134},
          {x:1.02,th:0.80,op:0.42,lean:-0.6,face:-1,c:a1,s:145},
        ].forEach(t=>{
          scene+=bigTree(w*t.x,h*1.04,h*t.th,t.c,t.op.toFixed(2),t.s,{
            lean:t.lean, face:t.face, trunkFrac:0.48, trunkBot:0.085, crownRx:0.42, crownRy:0.36,
            crownLift:0.26, lobes:17, branchN:5
          });
        });
        scene+=groundWave(h*0.94,h*0.015,a1,'0.12',4.1);

        leaves=makeLeaves(Array.from({length:28},()=>({
          x:0, xw:w, y:h*0.05, yw:h*0.32, fall:h*0.95,
          op0:0.18, op1:0.30, rm:3.5, rs:6.5, d0:6.5, d1:6,
          sw0:18, sw1:38, drift:w*0.06
        })));
      } else {
        scene+=farCanopy(h*0.90,h*0.08,a1,'0.07',9.2,14);
        scene+=groundWave(h*0.95,h*0.012,a2,'0.06',3.3);

        scene+=bigTree(-w*0.06, h*1.05, h*1.15, a1, '0.42', 201, {
          lean:0.7, face:1, trunkFrac:0.58, trunkBot:0.095, taper:0.45,
          crownRx:0.40, crownRy:0.33, crownLift:0.20, lobes:18, branchN:5
        });
        scene+=bigTree(w*1.06, h*1.05, h*1.12, a2, '0.40', 221, {
          lean:-0.7, face:-1, trunkFrac:0.57, trunkBot:0.092, taper:0.45,
          crownRx:0.38, crownRy:0.32, crownLift:0.20, lobes:17, branchN:5
        });

        leaves=makeLeaves([
          ...Array.from({length:12},()=>({
            x:-w*0.05, xw:w*0.32, y:h*0.02, yw:h*0.30, fall:h*0.92,
            op0:0.14, op1:0.24, rm:3.2, rs:5.8, d0:7, d1:5.5,
            sw0:16, sw1:34, drift:w*0.04
          })),
          ...Array.from({length:12},()=>({
            x:w*0.70, xw:w*0.34, y:h*0.02, yw:h*0.30, fall:h*0.92,
            op0:0.14, op1:0.24, rm:3.2, rs:5.8, d0:7, d1:5.5,
            sw0:16, sw1:34, drift:-w*0.04
          })),
        ]);
      }

      return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+defs+'<g clip-path="url(#'+uid+'cp)">'+scene+leaves+'</g></svg>';
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  },
  {
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
  },
  {
    name:'Город', nameEn:'City',
    desc:'Ночной городской силуэт, огни окон',descEn:'Night city skyline, glowing windows',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='ct'+Math.random().toString(36).slice(2,7);
      const rng=(s)=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const nB=isTitle?28:18;
      const groundH=h*(isTitle?0.16:0.12);
      const bldBase=isTitle?0.08:0.035;
      const bldRange=isTitle?0.10:0.055;
      const winBase=isTitle?0.25:0.10;
      const winRange=isTitle?0.45:0.18;
      const groupOp=isTitle?1:0.52;
      let buildings='',windows='',anims='';
      for(let i=0;i<nB;i++){
        const bw=w/nB*(0.55+rng(i*3)*0.55);
        const bh=h*(0.14+rng(i*3+1)*(isTitle?0.46:0.32));
        const bx=w/nB*i+(w/nB-bw)*0.5;
        const by=h-bh;
        const bop=(bldBase+rng(i*3+2)*bldRange).toFixed(2);
        buildings+=`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${i%3===0?a2:a1}" opacity="${bop}"/>`;
        const wC=Math.max(1,Math.floor(bw/9)), wR=Math.max(1,Math.floor(bh/11));
        for(let wr=0;wr<wR;wr++)for(let wc=0;wc<wC;wc++){
          if(rng(i*100+wr*10+wc)<0.45) continue;
          const wx=bx+wc*(bw/wC)+2, wy=by+wr*(bh/wR)+3;
          const ww=Math.max(2,bw/wC-4), wh2=Math.max(2,bh/wR-4);
          const wop=(winBase+rng(i*100+wr*10+wc+0.5)*winRange).toFixed(2);
          const wdim=(+wop*0.35).toFixed(2);
          const wcol=rng(i*100+wr*10+wc+0.3)>0.6?a2:a1;
          if(doAnimate){
            const dur=(1.8+rng(i*100+wr*10+wc+1)*3.2).toFixed(1);
            const phase=(rng(i*100+wr*10+wc+2)*dur).toFixed(2);
            anims+=`<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${ww.toFixed(1)}" height="${wh2.toFixed(1)}" fill="${wcol}" opacity="${wop}"><animate attributeName="opacity" values="${wop};${wdim};${wop}" dur="${dur}s" begin="${phase}s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/></rect>`;
          }else{
            windows+=`<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${ww.toFixed(1)}" height="${wh2.toFixed(1)}" fill="${wcol}" opacity="${wop}"/>`;
          }
        }
      }
      const ggOp=isTitle?0.14:0.07;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="${uid}gg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${a1}" stop-opacity="0"/><stop offset="100%" stop-color="${a1}" stop-opacity="${ggOp}"/></linearGradient></defs><g opacity="${groupOp.toFixed(2)}"><rect y="${(h-groundH).toFixed(1)}" width="${w}" height="${groundH.toFixed(1)}" fill="url(#${uid}gg)"/>${buildings}${doAnimate?anims:windows}</g></svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  },
  {
    name:'Зима', nameEn:'Winter',
    desc:'Снежинки, иней, кристаллы льда',descEn:'Snowflakes, frost crystals',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='wn'+Math.random().toString(36).slice(2,7);
      const rng=(s)=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const preWarm=isTitle?15:13;
      const nFlakes=isTitle?52:32;

      function sf(cx,cy,r,col,op){
        let d='';
        for(let arm=0;arm<6;arm++){
          const a=arm*60*Math.PI/180;
          const ex=cx+Math.cos(a)*r, ey=cy+Math.sin(a)*r;
          d+=`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${col}" stroke-width="1" opacity="${op}"/>`;
          for(const t of[0.4,0.65]){
            const bx=cx+Math.cos(a)*r*t, by=cy+Math.sin(a)*r*t, bl=r*0.28;
            for(const ba of[a+Math.PI/3,a-Math.PI/3])
              d+=`<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx+Math.cos(ba)*bl).toFixed(1)}" y2="${(by+Math.sin(ba)*bl).toFixed(1)}" stroke="${col}" stroke-width="0.7" opacity="${op}"/>`;
          }
        }
        return `<g>${d}<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r*0.1).toFixed(1)}" fill="${col}" opacity="${op}"/></g>`;
      }

      const _flakeXY=(t,sx,phase,swayA,h,r,dx)=>{
        const y=-r*2+(h+r*4)*t;
        const x=sx+Math.sin(phase+t*Math.PI*2)*swayA+dx*t;
        return [x,y];
      };

      let body='', hasBlur=false;
      for(let i=0;i<nFlakes;i++){
        const col=i%3===0?a2:a1;
        const isBlur=rng(i*5+40)>0.68;
        const fr=isBlur?(9+rng(i*5+2)*20):(3.5+rng(i*5+2)*10);
        const opBase=isTitle?(isBlur?0.07:0.10):(isBlur?0.05:0.07);
        const op=(opBase+rng(i*5+3)*(isBlur?0.09:0.16)).toFixed(2);
        const sx=rng(i*5+11)*w;
        const swayA=8+rng(i*5+5)*24;
        const phase=rng(i*5+6)*Math.PI*2;
        const dur=6+rng(i*5)*7;
        const delay=rng(i*5+0.5)*dur;
        const begin=(delay-preWarm).toFixed(2);
        const spinDur=(2.2+rng(i*5+8)*3.5).toFixed(2);
        const spinDir=rng(i*5+9)>0.5?1:-1;
        const dx=(rng(i*5+1.5)-0.5)*48;
        const blurAttr=isBlur?` filter="url(#${uid}blur)"`:'';
        if(isBlur) hasBlur=true;

        if(doAnimate){
          const steps=28;
          const xV=[],yV=[];
          for(let k=0;k<=steps;k++){
            const t=k/steps;
            const [lx,ly]=_flakeXY(t,sx,phase,swayA,h,fr,dx);
            xV.push(lx.toFixed(1)); yV.push(ly.toFixed(1));
          }
          const kv=xV.map((x,k)=>`${x},${yV[k]}`).join(';');
          body+=`<g opacity="${op}"${blurAttr}>
            <animateTransform attributeName="transform" type="translate" values="${kv}" dur="${dur.toFixed(1)}s" begin="${begin}s" repeatCount="indefinite" calcMode="linear"/>
            <g>
              <animateTransform attributeName="transform" type="rotate" from="0" to="${(360*spinDir).toFixed(0)}" dur="${spinDur}s" repeatCount="indefinite" calcMode="linear"/>
              ${sf(0,0,fr,col,1)}
            </g>
          </g>`;
        } else {
          let elapsed=preWarm-delay;
          while(elapsed<0) elapsed+=dur;
          elapsed%=dur;
          const t=elapsed/dur;
          const [lx,ly]=_flakeXY(t,sx,phase,swayA,h,fr,dx);
          const rot=((elapsed/+spinDur)*360*spinDir)%360;
          body+=`<g transform="translate(${lx.toFixed(1)},${ly.toFixed(1)}) rotate(${rot.toFixed(0)})" opacity="${op}"${blurAttr}>${sf(0,0,fr,col,1)}</g>`;
        }
      }

      const defs=hasBlur?`<defs><filter id="${uid}blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${isTitle?3.2:2.6}"/></filter></defs>`:'';
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${defs}${body}</svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  },
  {
    name:'Цветы', nameEn:'Bloom',
    desc:'Лепестки, ботанические узоры',descEn:'Petals, botanical patterns',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const rng=(s)=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      function petal(cx,cy,r,angle,col,op){const a=angle*Math.PI/180,ex=cx+Math.cos(a)*r*2,ey=cy+Math.sin(a)*r*2,c1x=cx+Math.cos(a-0.9)*r*1.4,c1y=cy+Math.sin(a-0.9)*r*1.4,c2x=cx+Math.cos(a+0.9)*r*1.4,c2y=cy+Math.sin(a+0.9)*r*1.4;return `<path d="M${cx.toFixed(1)},${cy.toFixed(1)} C${c1x.toFixed(1)},${c1y.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)} C${ex.toFixed(1)},${ey.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${cx.toFixed(1)},${cy.toFixed(1)} Z" fill="${col}" opacity="${op}"/>`;}
      function flower(cx,cy,r,c1,c2,op,n){let f='';for(let i=0;i<n;i++)f+=petal(cx,cy,r,i*(360/n),i%2===0?c1:c2,(+op*0.9).toFixed(2));f+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r*0.35).toFixed(1)}" fill="${c2}" opacity="${op}"/>`;return f;}
      let flowers='',petals='',anims='';
      if(isTitle){flowers+=flower(w*0.07,h*0.15,w*0.055,a1,a2,'0.18',6);flowers+=flower(w*0.93,h*0.12,w*0.045,a2,a1,'0.15',5);flowers+=flower(w*0.05,h*0.82,w*0.04,a2,a1,'0.13',7);flowers+=flower(w*0.95,h*0.80,w*0.05,a1,a2,'0.16',6);}else{flowers+=flower(w*0.04,h*0.15,w*0.045,a1,a2,'0.14',6);flowers+=flower(w*0.96,h*0.78,w*0.04,a2,a1,'0.12',5);}
      for(let i=0;i<(isTitle?20:12);i++){const px=rng(i*6)*w,py=rng(i*6+1)*h,pr=3+rng(i*6+2)*8,pa=rng(i*6+3)*360,col=i%2===0?a1:a2,op=(0.06+rng(i*6+4)*0.12).toFixed(2);if(doAnimate){const dur=(5+rng(i*6)*6).toFixed(1),delay=(rng(i*6+0.5)*4).toFixed(1),dx=((rng(i*6+1.5)-0.5)*80).toFixed(0);anims+=`<g opacity="${op}"><animateTransform attributeName="transform" type="translate" from="${px} -20" to="${+px+ +dx} ${h+20}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>${petal(0,0,pr,pa,col,1)}</g>`;}else petals+=petal(px,py,pr,pa,col,op);}
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${flowers}${doAnimate?anims:petals}</svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  },
  {
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
  },
  {
    name:'Звук', nameEn:'Sound',
    desc:'Звуковые волны, эквалайзер',descEn:'Sound waves, equalizer bars',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const rng=(s)=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const cx=isTitle?w*0.5:w*0.85,cy=h*0.5,nW=isTitle?8:5;
      let svg='';
      for(let i=1;i<=nW;i++){const r=(i/nW)*(isTitle?Math.max(w,h)*0.65:w*0.4),op=(0.04+rng(i)*0.08*(1-i/nW)).toFixed(2),col=i%2===0?a2:a1;if(doAnimate){const dur=(1.5+i*0.3).toFixed(1),delay=(i*0.2).toFixed(1);svg+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="0" fill="none" stroke="${col}" stroke-width="1.2"><animate attributeName="r" from="0" to="${r.toFixed(1)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/><animate attributeName="opacity" from="${op}" to="0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></circle>`;}else svg+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${col}" stroke-width="1.2" opacity="${op}"/>`;}
      const nB=isTitle?32:20,bW=w/(nB*1.8),mBH=h*(isTitle?0.25:0.18);
      for(let i=0;i<nB;i++){const bx=w*0.1+(w*0.8/nB)*i,bh=mBH*(0.15+rng(i*3+100)*0.85),col=i%2===0?a1:a2,op=(0.08+rng(i*3+101)*0.10).toFixed(2);if(doAnimate){const dur=(0.4+rng(i*3)*0.6).toFixed(2),delay=(rng(i*3+0.5)*0.5).toFixed(2),bh2=(mBH*(0.1+rng(i*3+50)*0.9)).toFixed(1);svg+=`<rect x="${bx.toFixed(1)}" y="${(h-bh).toFixed(1)}" width="${bW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${col}" opacity="${op}" rx="1"><animate attributeName="height" values="${bh.toFixed(1)};${bh2};${bh.toFixed(1)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/><animate attributeName="y" values="${(h-bh).toFixed(1)};${(h-+bh2).toFixed(1)};${(h-bh).toFixed(1)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></rect>`;}else svg+=`<rect x="${bx.toFixed(1)}" y="${(h-bh).toFixed(1)}" width="${bW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${col}" opacity="${op}" rx="1"/>`;}
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svg}</svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  },
  {
    name:'Горы', nameEn:'Mountains',
    desc:'Горные силуэты в слоях, туман',descEn:'Layered mountain silhouettes, mist',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='mt'+Math.random().toString(36).slice(2,7);
      const rng=(s)=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      function mR(seed,yBase,yRange,nP,col,op){const pts=[`0,${h}`];for(let i=0;i<=nP*2;i++){const x=w*i/(nP*2);pts.push(`${x.toFixed(1)},${(yBase-(i%2===0?rng(seed+i)*yRange:rng(seed+i)*yRange*0.3)).toFixed(1)}`);}pts.push(`${w},${h}`);return `<polygon points="${pts.join(' ')}" fill="${col}" opacity="${op}"/>`;}
      const layers=isTitle?[[10,h*0.55,h*0.30,8,a1,'0.20'],[20,h*0.63,h*0.20,6,a2,'0.15'],[30,h*0.71,h*0.12,5,a1,'0.11'],[40,h*0.78,h*0.06,4,a2,'0.08']]:[[10,h*0.60,h*0.28,7,a1,'0.18'],[20,h*0.70,h*0.18,5,a2,'0.13'],[30,h*0.78,h*0.08,4,a1,'0.09']];
      let mountains='';layers.forEach(([s,yb,yr,np,col,op])=>{mountains+=mR(s,yb,yr,np,col,op);});
      const mistY=isTitle?h*0.60:h*0.68;
      const mist=`<defs><linearGradient id="${uid}mg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${a2}" stop-opacity="0"/><stop offset="50%" stop-color="${a2}" stop-opacity="0.07"/><stop offset="100%" stop-color="${a2}" stop-opacity="0"/></linearGradient></defs><rect x="-${(w*0.2).toFixed(0)}" y="${(mistY-h*0.04).toFixed(0)}" width="${(w*1.4).toFixed(0)}" height="${(h*0.08).toFixed(0)}" fill="url(#${uid}mg)"${doAnimate?`><animateTransform attributeName="transform" type="translate" from="0 0" to="${(w*0.2).toFixed(0)} 0" dur="8s" repeatCount="indefinite" calcMode="linear"/></rect>`:' />'} `;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${mist}${mountains}</svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  },
  {
    name:'ДНК', nameEn:'DNA',
    desc:'Двойная спираль, молекулярные связи',descEn:'Double helix, molecular bonds',
    animated: true,
    renderer: 'dna',

    buildDnaCfg(w, h, a1, a2, isTitle, animated){
      const th = typeof _activeTheme === 'function' ? _activeTheme() : null;
      const dark = th ? th.dark !== false : true;
      return {
        w, h, a1, a2, isTitle, animated: animated !== false, dark,
        cx: isTitle ? w * 0.84 : w * 0.88,
        radius: isTitle ? w * 0.12 : w * 0.085,
        depth: isTitle ? w * 0.065 : w * 0.045,
        turns: isTitle ? 3.8 : 2.8,
        segments: isTitle ? 96 : 72,
        scrollSpeed: isTitle ? 30 : 24,
        rotSpeed: isTitle ? 0.38 : 0.30
      };
    },

    _buildBgSvg(w, h, a1, a2, isTitle, doAnimate){
      const uid = 'dn' + Math.random().toString(36).slice(2, 7);
      const sp = '0.42 0 0.58 1';
      const th = typeof _activeTheme === 'function' ? _activeTheme() : null;
      const dark = th ? th.dark !== false : true;
      const g1a = dark ? [0.28, 0.12, 0] : [0.14, 0.05, 0];
      const g2a = dark ? [0.22, 0.10, 0] : [0.11, 0.04, 0];
      const blobs = isTitle ? [
        {cx:w*.12, cy:h*.22, r:h*.18, g:'g1', dcx:w*.09, dcy:h*.12, dcx2:-w*.05, dcy2:h*.07, dr:.14, dur:9,  begin:0},
        {cx:w*.08, cy:h*.72, r:h*.14, g:'g2', dcx:w*.06, dcy:-h*.10, dcx2:-w*.07, dcy2:-h*.05, dr:.16, dur:11, begin:2.4},
        {cx:w*.22, cy:h*.48, r:h*.11, g:'g1', dcx:-w*.08, dcy:h*.09, dcx2:w*.04, dcy2:-h*.06, dr:.12, dur:13, begin:4.8},
        {cx:w*.04, cy:h*.42, r:h*.09, g:'g2', dcx:w*.05, dcy:h*.06, dcx2:-w*.03, dcy2:h*.08, dr:.11, dur:15, begin:1.2},
      ] : [
        {cx:w*.10, cy:h*.55, r:h*.12, g:'g1', dcx:w*.07, dcy:-h*.08, dcx2:-w*.04, dcy2:h*.05, dr:.13, dur:10, begin:0},
        {cx:w*.18, cy:h*.28, r:h*.09, g:'g2', dcx:-w*.06, dcy:h*.07, dcx2:w*.05, dcy2:-h*.04, dr:.12, dur:12, begin:3.1},
      ];
      let blobSvg = '';
      blobs.forEach((b) => {
        const cx0 = b.cx, cy0 = b.cy, r0 = b.r;
        const cx1 = b.cx + b.dcx, cy1 = b.cy + b.dcy;
        const cx2 = b.cx + b.dcx2, cy2 = b.cy + b.dcy2;
        const r1 = r0 * (1 + b.dr), r2 = r0 * (1 - b.dr * 0.55);
        const f = (n) => n.toFixed(1);
        const grad = `url(#${uid}${b.g})`;
        const blur = `url(#${uid}blur)`;
        if (doAnimate) {
          const beg = b.begin.toFixed(1);
          const durCy = (b.dur * 1.19).toFixed(1);
          const durR = (b.dur * 0.88).toFixed(1);
          const durOp = (b.dur * 1.07).toFixed(1);
          blobSvg += `<circle cx="${f(cx0)}" cy="${f(cy0)}" r="${f(r0)}" fill="${grad}" filter="${blur}" opacity="0.92">
            <animate attributeName="cx" values="${f(cx0)};${f(cx1)};${f(cx2)};${f(cx0)}" dur="${b.dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
            <animate attributeName="cy" values="${f(cy0)};${f(cy1)};${f(cy2)};${f(cy0)}" dur="${durCy}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
            <animate attributeName="r" values="${f(r0)};${f(r1)};${f(r2)};${f(r0)}" dur="${durR}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
            <animate attributeName="opacity" values="0.92;0.72;0.98;0.92" dur="${durOp}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
          </circle>`;
        } else {
          blobSvg += `<circle cx="${f(cx0)}" cy="${f(cy0)}" r="${f(r0)}" fill="${grad}" filter="${blur}" opacity="0.85"/>`;
        }
      });
      const blurDev = isTitle ? 30 : 22;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
        <defs>
          <filter id="${uid}blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${blurDev}"/></filter>
          <radialGradient id="${uid}g1" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${a1}" stop-opacity="${g1a[0]}"/><stop offset="70%" stop-color="${a1}" stop-opacity="${g1a[1]}"/><stop offset="100%" stop-color="${a1}" stop-opacity="${g1a[2]}"/></radialGradient>
          <radialGradient id="${uid}g2" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${a2}" stop-opacity="${g2a[0]}"/><stop offset="70%" stop-color="${a2}" stop-opacity="${g2a[1]}"/><stop offset="100%" stop-color="${a2}" stop-opacity="${g2a[2]}"/></radialGradient>
        </defs>${blobSvg}</svg>`;
    },

    titleSvg(w, h, a1, a2, doAnimate){ return this._buildBgSvg(w, h, a1, a2, true, doAnimate !== false); },
    contentSvg(w, h, a1, a2, doAnimate){ return this._buildBgSvg(w, h, a1, a2, false, doAnimate !== false); },
  },
  {
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
  },
  {
    name:'Соты', nameEn:'Honeycomb',
    desc:'Переливающаяся сетка: волны прозрачности по соседям',descEn:'Shimmering hex grid: opacity ripples through neighbors',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const rng=s=>{let x=Math.sin(s*53.2+9.1)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(1);
      const hexR=isTitle?26:20;
      const dx=hexR*1.732, dy=hexR*1.5;
      const cols=Math.ceil(w/dx)+3;
      const rows=Math.ceil(h/dy)+3;
      // Крупные соты (title) — 3 пика; мелкие (content) — 6
      const peakN=isTitle?3:5;
      const steps=doAnimate?56:1;
      const durSec=isTitle?22:18;
      const maxOp=0.3, stepOp=0.03; // шире радиус: ~10 колец до 0
      const minPeakSep=isTitle?8:6; // пики держат дистанцию (в гекс-шагах)
      const colMin=0, colMax=cols-2, rowMin=0, rowMax=rows-2;

      function hexD(hx,hy,r){
        let d='';
        for(let k=0;k<6;k++){
          const a=Math.PI/6+k*Math.PI/3;
          d+=(k?'L':'M')+f(hx+Math.cos(a)*r)+','+f(hy+Math.sin(a)*r);
        }
        return d+'Z';
      }
      function hexCenter(col,row){
        return {x:col*dx+(row%2?dx*0.5:0), y:row*dy};
      }
      function oddrToCube(col,row){
        const x=col-(row-(row&1))/2;
        const z=row;
        return {x, y:-x-z, z};
      }
      function cubeDist(a,b){
        return (Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.z-b.z))/2;
      }
      function hexNeighbors(col,row){
        // odd-r offset: чётные и нечётные ряды
        const even=(row&1)===0;
        const raw=even
          ?[[col+1,row],[col-1,row],[col,row-1],[col-1,row-1],[col,row+1],[col-1,row+1]]
          :[[col+1,row],[col-1,row],[col+1,row-1],[col,row-1],[col+1,row+1],[col,row+1]];
        return raw.filter(([c,r])=>c>=colMin&&c<=colMax&&r>=rowMin&&r<=rowMax);
      }
      function randCell(seed){
        return {
          col:colMin+Math.floor(rng(seed)*(colMax-colMin+1)),
          row:rowMin+Math.floor(rng(seed+17)*(rowMax-rowMin+1))
        };
      }
      function farEnough(col,row,others){
        const c=oddrToCube(col,row);
        for(let i=0;i<others.length;i++){
          if(cubeDist(c, oddrToCube(others[i].col, others[i].row))<minPeakSep) return false;
        }
        return true;
      }
      function randCellFar(seed,others){
        for(let t=0;t<48;t++){
          const c=randCell(seed+t*19);
          if(farEnough(c.col,c.row,others)) return c;
        }
        return randCell(seed);
      }
      function stepToward(col,row,tCol,tRow){
        if(col===tCol&&row===tRow) return {col,row};
        const ns=hexNeighbors(col,row);
        if(!ns.length) return {col,row};
        const target=oddrToCube(tCol,tRow);
        let best=ns[0], bestD=Infinity;
        for(let i=0;i<ns.length;i++){
          const d=cubeDist(oddrToCube(ns[i][0],ns[i][1]), target);
          const tie=rng(col*13+row*29+tCol*7+tRow*3+i)*0.01;
          if(d+tie<bestD){ bestD=d+tie; best=ns[i]; }
        }
        return {col:best[0], row:best[1]};
      }

      // Все пики вместе: старты/цели с разнесением, шаги только на соседа
      const peakPaths=[];
      const starts=[];
      const targets=[];
      for(let p=0;p<peakN;p++){
        const start=randCellFar(p*101+3, starts);
        starts.push(start);
        peakPaths.push([{col:start.col,row:start.row}]);
      }
      for(let p=0;p<peakN;p++){
        const others=starts.filter((_,i)=>i!==p).concat(targets);
        targets.push(randCellFar(p*101+50, others));
      }
      for(let s=1;s<steps;s++){
        for(let p=0;p<peakN;p++){
          let pos=peakPaths[p][s-1];
          let target=targets[p];
          const start=starts[p];
          const remaining=steps-s;
          const distHome=cubeDist(oddrToCube(pos.col,pos.row), oddrToCube(start.col,start.row));
          if(remaining<=distHome){
            target={col:start.col,row:start.row};
            targets[p]=target;
          }else if(pos.col===target.col&&pos.row===target.row){
            const others=[];
            for(let i=0;i<peakN;i++) if(i!==p) others.push(peakPaths[i][s-1]);
            target=randCellFar(p*101+80+s, others);
            targets[p]=target;
          }
          pos=stepToward(pos.col,pos.row,target.col,target.row);
          peakPaths[p].push({col:pos.col,row:pos.row});
        }
      }

      function opacityAt(col,row,stepIdx){
        const cell=oddrToCube(col,row);
        let op=0;
        for(let p=0;p<peakN;p++){
          const pk=peakPaths[p][Math.min(stepIdx, peakPaths[p].length-1)];
          const dist=cubeDist(cell, oddrToCube(pk.col, pk.row));
          // 0.3 → 0.27 → … → 0 (шаг 0.03, широкий радиус)
          op=Math.max(op, Math.max(0, maxOp-stepOp*dist));
        }
        return op;
      }

      const cells=[];
      for(let row=-1;row<rows;row++){
        for(let col=-1;col<cols;col++){
          const c=hexCenter(col,row);
          if(c.x<-hexR||c.y<-hexR||c.x>w+hexR||c.y>h+hexR) continue;
          const ops=[];
          for(let fi=0;fi<steps;fi++){
            ops.push(opacityAt(col,row, fi));
          }
          cells.push({x:c.x,y:c.y,ops});
        }
      }

      let hexSvg='';
      cells.forEach((cell,idx)=>{
        const colFill=idx%3===0?a1:(idx%3===1?a2:a1);
        const op0=cell.ops[0].toFixed(3);
        if(doAnimate && steps>1){
          // discrete: пик «перескакивает» только на соседа — без interpolate между кадрами
          const vals=cell.ops.map(o=>o.toFixed(3)).join(';');
          const keyTimes=cell.ops.map((_,i)=>(i/(cell.ops.length-1)).toFixed(4)).join(';');
          hexSvg+=`<path d="${hexD(cell.x,cell.y,hexR*0.92)}" fill="none" stroke="${colFill}" stroke-width="1.15" opacity="${op0}">
            <animate attributeName="opacity" values="${vals}" keyTimes="${keyTimes}" dur="${durSec}s" begin="0s" repeatCount="indefinite" calcMode="linear"/>
          </path>`;
        }else{
          hexSvg+=`<path d="${hexD(cell.x,cell.y,hexR*0.92)}" fill="none" stroke="${colFill}" stroke-width="1" opacity="${op0}"/>`;
        }
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${hexSvg}</svg>`;
    },
    titleSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,true,d!==false);},
    contentSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,false,d!==false);},
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
  },
  {
    name:'Галактика', nameEn:'Galaxy',
    desc:'Спираль звёзд, медленное вращение',descEn:'Spiral star disk, slow rotation',
    animated: true,
    renderer: 'galaxy',
    buildGalaxyCfg(w,h,a1,a2,isTitle,animated){
      return {w,h,a1,a2,isTitle,animated:animated!==false,particles:isTitle?1800:1100,cx:isTitle?0.52:0.54,cy:isTitle?0.48:0.50,maxR:isTitle?0.56:0.48,rotSpeed:isTitle?0.052:0.044,tilt:0.38,arms:4,twist:3.4,flat:0.28,depthScale:0.38,brightness:isTitle?1.85:1.65};
    },
    _buildBg(w,h,a1,a2,isTitle){
      const uid='gal'+Math.random().toString(36).slice(2,7);
      const f=n=>n.toFixed(0);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
        <defs><radialGradient id="${uid}g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff" stop-opacity="0.22"/><stop offset="35%" stop-color="${a1}" stop-opacity="0.12"/><stop offset="70%" stop-color="${a2}" stop-opacity="0.06"/><stop offset="100%" stop-opacity="0"/></radialGradient></defs>
        <circle cx="${f(w*(isTitle?0.52:0.54))}" cy="${f(h*(isTitle?0.48:0.50))}" r="${f(Math.min(w,h)*(isTitle?0.20:0.16))}" fill="url(#${uid}g)"/></svg>`;
    },
    titleSvg(w,h,a1,a2){return this._buildBg(w,h,a1,a2,true);},
    contentSvg(w,h,a1,a2){return this._buildBg(w,h,a1,a2,false);},
  },
  {
    name:'Каустика', nameEn:'Caustics',
    desc:'Подводные блики света',descEn:'Underwater caustic light',
    animated: true,
    renderer: 'caustics',
    buildCausticsCfg(w,h,a1,a2,isTitle,animated){
      return {w,h,a1,a2,isTitle,animated:animated!==false,alpha:isTitle?0.48:0.38,speed:isTitle?1.0:0.85};
    },
    _buildBg(w,h,a1,a2,isTitle){
      const uid='cau'+Math.random().toString(36).slice(2,7);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
        <defs><linearGradient id="${uid}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${a2}" stop-opacity="0.16"/><stop offset="100%" stop-color="${a1}" stop-opacity="0.22"/></linearGradient></defs>
        <rect width="${w}" height="${h}" fill="url(#${uid}bg)"/></svg>`;
    },
    titleSvg(w,h,a1,a2){return this._buildBg(w,h,a1,a2,true);},
    contentSvg(w,h,a1,a2){return this._buildBg(w,h,a1,a2,false);},
  },
  {
    name:'Звёздопад', nameEn:'Starfall',
    desc:'Звёздное небо, редкие метеоры',descEn:'Starry sky with occasional meteors',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='sf'+Math.random().toString(36).slice(2,7);
      const rng=s=>{let x=Math.sin(s*67.3+2.9)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(1);
      const midBegin=(seed,dur,lo,hi)=>{const p=lo+rng(seed)*(hi-lo);return(-p*dur).toFixed(2);};
      const ti=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx
        :(typeof selTheme!=='undefined'&&selTheme>=0?selTheme:-1);
      const theme=ti>=0&&typeof THEMES!=='undefined'?THEMES[ti]:null;
      const isLight=theme&&theme.dark===false;

      const starOpMin=isLight?0.24:0.06;
      const starOpMax=isLight?0.72:0.41;
      const tailStops=isLight
        ? `<stop offset="0%" stop-color="${a2}" stop-opacity="0"/><stop offset="50%" stop-color="${a1}" stop-opacity="0.45"/><stop offset="100%" stop-color="${a1}" stop-opacity="1"/>`
        : `<stop offset="0%" stop-color="${a2}" stop-opacity="0"/><stop offset="55%" stop-color="#fff" stop-opacity="0.2"/><stop offset="100%" stop-color="#fff" stop-opacity="1"/>`;
      const metPeakLo=isLight?0.62:0.45;
      const metPeakHi=isLight?0.95:0.90;

      const nStars=isTitle?95:52;
      let svg=`<defs><linearGradient id="${uid}tail" gradientUnits="objectBoundingBox" x1="0" y1="0.5" x2="1" y2="0.5">${tailStops}</linearGradient></defs>`;
      for(let i=0;i<nStars;i++){
        const sx=rng(i*5)*w,sy=rng(i*5+1)*h,sr=(0.3+rng(i*5+2)*(isLight?1.8:1.4)).toFixed(2);
        const op=(starOpMin+rng(i*5+3)*(starOpMax-starOpMin)).toFixed(2);
        const col=isLight
          ?(rng(i*5+4)>0.45?a1:a2)
          :(rng(i*5+4)>0.7?'#fff':a2);
        if(doAnimate){
          const dur=(2+rng(i*5+5)*3).toFixed(1),beg=midBegin(i*5+6,+dur,0.1,0.95);
          const twLo=isLight?(op*0.45).toFixed(2):(op*0.3).toFixed(2);
          svg+=`<circle cx="${f(sx)}" cy="${f(sy)}" r="${sr}" fill="${col}" opacity="${op}">
            <animate attributeName="opacity" values="${op};${twLo};${op}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
          </circle>`;
        }else svg+=`<circle cx="${f(sx)}" cy="${f(sy)}" r="${sr}" fill="${col}" opacity="${op}"/>`;
      }
      const nMet=isTitle?14:6;
      for(let i=0;i<nMet;i++){
        const seed=i*29+200;
        const ang=0.58+rng(seed+3)*0.42;
        const ca=Math.cos(ang), sa=Math.sin(ang);
        const len=40+rng(seed+2)*(isTitle?260:180);
        const tx0=rng(seed)*w*0.85+w*0.05, ty0=rng(seed+1)*h*0.32;
        const travel=len*(1.1+rng(seed+6)*0.5);
        const tx1=tx0+ca*travel, ty1=ty0+sa*travel;
        const hx0=tx0+ca*len, hy0=ty0+sa*len;
        const hx1=tx1+ca*len, hy1=ty1+sa*len;
        const sw=(0.8+rng(seed+7)*(isLight?2.8:2.2)).toFixed(1);
        const peak=(metPeakLo+rng(seed+8)*(metPeakHi-metPeakLo)).toFixed(2);
        const cycleNum=(3.2+rng(seed+4)*4.8);
        const cycle=cycleNum.toFixed(2);
        const beg=midBegin(seed+5,cycleNum,0.05,0.92);
        if(doAnimate){
          svg+=`<line x1="${f(tx0)}" y1="${f(ty0)}" x2="${f(hx0)}" y2="${f(hy0)}" stroke="url(#${uid}tail)" stroke-width="${sw}" stroke-linecap="round" opacity="0">
            <animate attributeName="opacity" values="0;0;${peak};${peak};0;0" keyTimes="0;0.28;0.68;0.74;0.80;1" dur="${cycle}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="x1" values="${f(tx0)};${f(tx1)}" keyTimes="0;1" dur="${cycle}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.1 0 0.85 1"/>
            <animate attributeName="y1" values="${f(ty0)};${f(ty1)}" keyTimes="0;1" dur="${cycle}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.1 0 0.85 1"/>
            <animate attributeName="x2" values="${f(hx0)};${f(hx1)}" keyTimes="0;1" dur="${cycle}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.1 0 0.85 1"/>
            <animate attributeName="y2" values="${f(hy0)};${f(hy1)}" keyTimes="0;1" dur="${cycle}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.1 0 0.85 1"/>
          </line>`;
        }else svg+=`<line x1="${f(tx0)}" y1="${f(ty0)}" x2="${f(hx0)}" y2="${f(hy0)}" stroke="url(#${uid}tail)" stroke-width="${sw}" opacity="${peak}" stroke-linecap="round"/>`;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${svg}</svg>`;
    },
    titleSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,true,d!==false);},
    contentSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,false,d!==false);},
  },
  {
    name:'Сакура', nameEn:'Sakura',
    desc:'Падающие лепестки сакуры',descEn:'Falling cherry blossom petals',
    animated: true,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const rng=s=>{let x=Math.sin(s*83.5+44.2)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(1);
      const midBegin=(seed,dur,lo,hi)=>{const p=lo+rng(seed)*(hi-lo);return(-p*dur).toFixed(2);};
      const cx0=w*0.5,cy0=h*0.5,zoneRx=w*(isTitle?0.4:0.34),zoneRy=h*(isTitle?0.38:0.32);
      const inCenter=(x,y)=>{const dx=(x-cx0)/zoneRx,dy=(y-cy0)/zoneRy;return dx*dx+dy*dy<1;};
      const petalD=(sc)=>{
        const pw=14*sc,ph=28*sc;
        const fp=n=>n.toFixed(1);
        return `M 0 ${fp(-ph*0.42)} C ${fp(pw*0.95)} ${fp(-ph*0.18)} ${fp(pw*0.88)} ${fp(ph*0.32)} 0 ${fp(ph*0.5)} C ${fp(-pw*0.88)} ${fp(ph*0.32)} ${fp(-pw*0.95)} ${fp(-ph*0.18)} 0 ${fp(-ph*0.42)} Z`;
      };
      const nP=isTitle?34:16;
      let svg='';
      for(let i=0;i<nP;i++){
        const seed=i*31+77;
        let px=rng(seed)*w;
        if(!isTitle){for(let a=0;a<10&&inCenter(px,h*0.4);a++)px=rng(seed+a*2)*w;}
        const sc=1.0+rng(seed+2)*(isTitle?2.1:1.7);
        const rot0=(rng(seed+3)*140-30).toFixed(1);
        const rot1=(+rot0+100+rng(seed+9)*80).toFixed(1);
        const col=rng(seed+4)>0.5?a1:a2;
        const op=Math.min(0.5,0.14+rng(seed+5)*0.3).toFixed(2);
        const startY=-(12+rng(seed+1)*55);
        const endY=h+18+rng(seed+10)*35;
        const drift=(rng(seed+6)-0.5)*w*0.14;
        const x1=(px+drift).toFixed(1);
        const durNum=11+rng(seed+7)*14;
        const dur=durNum.toFixed(1);
        const beg=midBegin(seed+8,durNum,0,1);
        if(doAnimate){
          svg+=`<g opacity="0">
            <animate attributeName="opacity" values="0;${op};${op};0" keyTimes="0;0.07;0.9;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="translate" values="${f(px)} ${f(startY)};${x1} ${f(endY)}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.25 0 0.75 1"/>
            <path d="${petalD(sc)}" fill="${col}">
              <animateTransform attributeName="transform" type="rotate" values="${rot0};${rot1}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            </path>
          </g>`;
        }else{
          const py=rng(seed+1)*h*0.85;
          svg+=`<g transform="translate(${f(px)} ${f(py)}) rotate(${rot0})"><path d="${petalD(sc)}" fill="${col}" opacity="${op}"/></g>`;
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${svg}</svg>`;
    },
    titleSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,true,d!==false);},
    contentSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,false,d!==false);},
  },
  {
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
  },
  {
    name:'Утки', nameEn:'Ducks',
    desc:'Облака сверху, утки в полёте / плавание внизу', descEn:'Clouds above, flying ducks / swimming at bottom',
    animated: true,
    _cloudPaths:[
      'M 26.174515,4.9076568 A 29.855467,24.53874 0 0 0 3.8926707,13.128861 29.855467,24.53874 0 0 0 -6.9526623,11.451444 29.855467,24.53874 0 0 0 -29.349228,19.773416 29.855467,24.53874 0 0 0 -54.394211,8.5885688 29.855467,24.53874 0 0 0 -83.843063,29.165608 29.855467,24.53874 0 0 0 -101.427,51.531168 a 29.855467,24.53874 0 0 0 16.336467,21.862231 29.855467,24.53874 0 0 0 29.469524,20.671607 29.855467,24.53874 0 0 0 26.259379,-12.870016 29.855467,24.53874 0 0 0 3.596163,0.19172 29.855467,24.53874 0 0 0 23.5231117,-9.448002 29.855467,24.53874 0 0 0 22.2823603,8.221203 29.855467,24.53874 0 0 0 26.01288,-12.513964 29.855467,24.53874 0 0 0 23.06474,-23.885364 29.855467,24.53874 0 0 0 -14.17691,-20.88038 29.855467,24.53874 0 0 0 -28.7662,-17.9725462 z',
      'm 161.95564,35.581174 a 14.927733,13.905286 0 0 0 -11.53417,5.087544 14.927733,13.905286 0 0 0 -8.09667,-2.22467 14.927733,13.905286 0 0 0 -14.92777,13.905094 14.927733,13.905286 0 0 0 0.0217,0.54312 14.927733,13.905286 0 0 0 -12.90463,13.771252 14.927733,13.905286 0 0 0 14.92777,13.905094 14.927733,13.905286 0 0 0 8.35194,-2.382283 14.927733,13.905286 0 0 0 13.11961,7.290511 14.927733,13.905286 0 0 0 12.65195,-6.54482 14.927733,13.905286 0 0 0 0.0264,10e-4 14.927733,13.905286 0 0 0 13.08034,-7.221781 14.927733,13.905286 0 0 0 2.86959,0.269234 14.927733,13.905286 0 0 0 14.92777,-13.905611 14.927733,13.905286 0 0 0 -14.92777,-13.905094 14.927733,13.905286 0 0 0 -3.61425,0.421679 14.927733,13.905286 0 0 0 -13.97176,-9.010302 z',
      'm 112.06029,-79.750992 a 24.334249,24.129761 0 0 0 -22.745893,15.57993 24.334249,24.129761 0 0 0 -4.65553,-0.44752 24.334249,24.129761 0 0 0 -24.334432,24.129792 24.334249,24.129761 0 0 0 24.334432,24.129794 24.334249,24.129761 0 0 0 5.709212,-0.683679 14.927733,13.905286 0 0 0 14.739671,11.7258995 14.927733,13.905286 0 0 0 6.88278,-1.577165 14.927733,13.905286 0 0 0 13.5661,8.120952 14.927733,13.905286 0 0 0 14.91227,-13.5170055 14.927733,13.905286 0 0 0 9.69501,-3.820955 14.927733,13.905286 0 0 0 13.01885,7.1132615 14.927733,13.905286 0 0 0 11.74502,-5.3288745 24.334249,24.129761 0 0 0 0.42788,-0.148828 14.927733,13.905286 0 0 0 11.13885,4.6596645 14.927733,13.905286 0 0 0 4.35994,-0.6077155 14.927733,13.905286 0 0 0 10.77195,4.2886275 14.927733,13.905286 0 0 0 14.19087,-9.6102665 14.927733,13.905286 0 0 0 9.32553,-12.883452 14.927733,13.905286 0 0 0 -0.004,-0.306441 14.927733,13.905286 0 0 0 10.22884,-13.189892 14.927733,13.905286 0 0 0 -10.71718,-13.339755 14.927733,13.905286 0 0 0 0.0837,-1.383378 14.927733,13.905286 0 0 0 -14.92777,-13.905614 14.927733,13.905286 0 0 0 -7.81141,2.06654 14.927733,13.905286 0 0 0 -14.27355,-9.83712 14.927733,13.905286 0 0 0 -14.9226,13.78159 14.927733,13.905286 0 0 0 -7.57112,-1.92082 14.927733,13.905286 0 0 0 -7.4905,1.87844 14.927733,13.905286 0 0 0 -12.54962,-6.37739 14.927733,13.905286 0 0 0 -11.31352,4.8488 24.334249,24.129761 0 0 0 -21.81366,-13.43742 z',
      'm 292.01112,-18.812805 a 24.334249,24.129761 0 0 0 -23.8001,19.1574868 24.334249,24.129761 0 0 0 -10.5544,-2.3895182 24.334249,24.129761 0 0 0 -24.33391,24.1297934 24.334249,24.129761 0 0 0 24.33391,24.129793 24.334249,24.129761 0 0 0 13.08551,-3.804936 24.334249,24.129761 0 0 0 14.46217,12.800253 24.334249,24.129761 0 0 0 23.16602,16.770036 24.334249,24.129761 0 0 0 15.94373,-5.922636 24.334249,24.129761 0 0 0 6.95875,1.014925 24.334249,24.129761 0 0 0 24.33443,-24.129794 24.334249,24.129761 0 0 0 -12.2809,-20.959444 24.334249,24.129761 0 0 0 0.0114,-0.307474 24.334249,24.129761 0 0 0 -24.33392,-24.1297938 24.334249,24.129761 0 0 0 -3.85247,0.3121257 24.334249,24.129761 0 0 0 -23.14019,-16.6708169 z',
      'm -26.583407,-106.74328 a 24.334249,24.129761 0 0 0 -23.435779,17.692459 24.334249,24.129761 0 0 0 -14.101464,6.094719 24.334249,24.129761 0 0 0 -7.859468,-1.293461 24.334249,24.129761 0 0 0 -24.33443,24.129793 24.334249,24.129761 0 0 0 1.04128,6.964949 24.334249,24.129761 0 0 0 -12.083502,20.84524 24.334249,24.129761 0 0 0 24.333912,24.1297929 24.334249,24.129761 0 0 0 20.106785,-10.5373409 24.334249,24.129761 0 0 0 8.521961,1.539957 24.334249,24.129761 0 0 0 23.30452,-17.207735 24.334249,24.129761 0 0 0 0.825273,0.03049 24.334249,24.129761 0 0 0 13.423987,-4.015775 24.334249,24.129761 0 0 0 18.8851516,8.923486 A 24.334249,24.129761 0 0 0 26.379252,-53.5765 24.334249,24.129761 0 0 0 22.644596,-66.419644 24.334249,24.129761 0 0 0 24.334415,-75.25218 24.334249,24.129761 0 0 0 -1.6386278e-5,-99.381974 24.334249,24.129761 0 0 0 -7.8915244,-98.060604 24.334249,24.129761 0 0 0 -26.583407,-106.74328 Z',
      'm 244.64771,96.519079 a 27.492675,24.53874 0 0 1 20.51844,8.221201 27.492675,24.53874 0 0 1 9.98702,-1.67741 27.492675,24.53874 0 0 1 20.62408,8.32197 27.492675,24.53874 0 0 1 23.06289,-11.18485 27.492675,24.53874 0 0 1 27.11825,20.57704 27.492675,24.53874 0 0 1 16.19232,22.36556 27.492675,24.53874 0 0 1 -15.04358,21.86223 27.492675,24.53874 0 0 1 -27.13728,20.67161 27.492675,24.53874 0 0 1 -24.18118,-12.87002 27.492675,24.53874 0 0 1 -3.31156,0.19172 27.492675,24.53874 0 0 1 -21.66147,-9.448 27.492675,24.53874 0 0 1 -20.51891,8.22121 27.492675,24.53874 0 0 1 -23.9542,-12.51397 27.492675,24.53874 0 0 1 -21.23937,-23.88536 27.492675,24.53874 0 0 1 13.05493,-20.88039 27.492675,24.53874 0 0 1 26.48962,-17.972541 z',
      'm -157.04793,-25.970167 a 10.224475,9.8154955 0 0 0 -7.90702,3.59823 10.224475,9.8154955 0 0 0 -6.40736,-2.166793 10.224475,9.8154955 0 0 0 -10.22418,9.815421 10.224475,9.8154955 0 0 0 0.73122,3.640605 16.768139,15.336712 0 0 0 -5.04,3.7480916 10.224475,9.8154955 0 0 0 -10.00559,-7.7974566 10.224475,9.8154955 0 0 0 -9.42682,6.0296056 16.768139,15.336712 0 0 0 -11.02206,-3.7801306 16.768139,15.336712 0 0 0 -12.62869,5.2627276 16.768139,15.336712 0 0 0 -10.27431,-3.2178916 16.768139,15.336712 0 0 0 -4.53254,0.580843 16.768139,15.336712 0 0 0 -14.68954,-7.942667 16.768139,15.336712 0 0 0 -16.76797,15.3365306 16.768139,15.336712 0 0 0 0.67283,4.275192 16.768139,15.336712 0 0 0 -7.34012,7.854301 16.768139,15.336712 0 0 0 -5.60224,-0.882117 16.768139,15.336712 0 0 0 -16.76797,15.3365314 16.768139,15.336712 0 0 0 15.47451,15.289506 16.768139,15.336712 0 0 0 -1.97818,7.204212 16.768139,15.336712 0 0 0 2.95641,8.693009 16.768139,15.336712 0 0 0 -4.18321,10.120313 16.768139,15.336712 0 0 0 16.76797,15.336531 16.768139,15.336712 0 0 0 5.56762,-0.8816 16.768139,15.336712 0 0 0 16.10806,11.105783 16.768139,15.336712 0 0 0 13.94127,-6.823357 48.668499,42.329323 0 0 0 7.32565,0.484209 48.668499,42.329323 0 0 0 22.72678,-4.931999 16.768139,15.336712 0 0 0 8.76484,2.273763 16.768139,15.336712 0 0 0 16.63619,-13.500985 16.768139,15.336712 0 0 0 0.13178,0.0047 16.768139,15.336712 0 0 0 16.15457,-11.263912 16.768139,15.336712 0 0 0 7.97522,1.857251 16.768139,15.336712 0 0 0 16.76797,-15.336532 16.768139,15.336712 0 0 0 -0.0765,-1.456759 16.768139,15.336712 0 0 0 16.02693,-15.31121 16.768139,15.336712 0 0 0 -11.20759,-14.46785 16.768139,15.336712 0 0 0 0.57413,-3.9361944 16.768139,15.336712 0 0 0 -10.68617,-14.291634 16.768139,15.336712 0 0 0 -0.80357,-3.631303 10.224475,9.8154955 0 0 0 2.49235,-6.4114946 10.224475,9.8154955 0 0 0 -10.22469,-9.815421 z'
    ],
    _cloudLayer(){
      return 'translate(304.28031,106.74329)';
    },
    _cloudNorm(){
      return 'translate(-333.215,-146.210) scale(2.34)';
    },
    _cloudPivot(){
      return [333.215,146.210];
    },
    _cloudFill(theme){
      const fb='#cccccc';
      if(theme&&typeof _schemeSwatchColor==='function')
        return _schemeSwatchColor(theme,0,8)||fb;
      return fb;
    },
    _hexToRgb(hex){
      const h=(hex||'#cccccc').replace('#','');
      if(h.length===3)return [parseInt(h[0]+h[0],16),parseInt(h[1]+h[1],16),parseInt(h[2]+h[2],16)];
      return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
    },
    _rgbHex(r,g,b){
      return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
    },
    _cloudFadeColor(base,t){
      const [r,g,b]=this._hexToRgb(base);
      const f=v=>Math.round(v+(255-v)*Math.max(0,Math.min(1,t)));
      return this._rgbHex(f(r),f(g),f(b));
    },
    _cloudFadeStops(fill){
      const max=0.10;
      return {
        max,
        c0:fill,
        c1:this._cloudFadeColor(fill,max*0.18),
        c2:this._cloudFadeColor(fill,max*0.42),
        c3:this._cloudFadeColor(fill,max*0.72),
        c4:this._cloudFadeColor(fill,max)
      };
    },
    _cloudShape(d,fill,doAnimate,dur,beg){
      const wrap=`<g transform="${this._cloudNorm()}"><g transform="${this._cloudLayer()}">`;
      if(doAnimate){
        const s=this._cloudFadeStops(fill);
        return `${wrap}<path d="${d}" fill="${s.c0}" fill-opacity="1">
          <animate attributeName="fill" values="${s.c0};${s.c0};${s.c1};${s.c2};${s.c3};${s.c4}" keyTimes="0;0.18;0.58;0.78;0.90;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
        </path></g></g>`;
      }
      return `${wrap}<path d="${d}" fill="${fill}" fill-opacity="1"/></g></g>`;
    },
    _duckSchemeColors(theme){
      const fb={dark:'#000000',light:'#dddddd'};
      if(!theme||typeof _schemeSwatchColor!=='function') return fb;
      return {
        dark:_schemeSwatchColor(theme,0,7)||fb.dark,
        light:_schemeSwatchColor(theme,7,7)||fb.light
      };
    },
    _duckColors(theme){
      return this._duckSchemeColors(theme);
    },
    _duckLayer(){
      return 'translate(-57.497716,-78.660177)';
    },
    _duckNorm(){
      return 'translate(-30.15,-17.42) scale(0.575)';
    },
    _duckPaths(){
      return {
        wing2:'M 92.258781,155.21812 114.65496,136.08978 C 108.90374,132.52937 104.3706,125.57608 102.58212,118.7696 96.119302,94.173676 74.132035,108.23728 57.775139,97.399553 c -1.027156,3.047277 0.939509,5.149977 3.572286,7.042497 l -2.448882,0.89335 c 1.052896,3.72936 2.97418,4.54277 4.862722,5.46611 l -2.600842,0.72254 c -0.230508,2.14417 5.232639,4.67803 5.232639,4.67803 -0.157645,1.12768 -0.812748,1.98954 -2.058996,2.53551 1.57549,1.86027 3.22037,2.53277 4.946684,1.8112 l -1.546551,2.07963 c 0.938822,1.34751 2.884641,1.5106 4.168027,1.2799 -0.186733,1.17988 -0.964399,1.76931 -1.878754,2.22216 1.781675,1.36744 3.478759,1.72473 5.107847,1.27002 l 0.342524,1.89851 2.458529,-0.50414 0.855193,1.99322 1.271805,-0.703 c 2.237144,9.63642 6.735081,17.71722 12.199411,25.13303 z',
        head:'m 147.56832,126.49643 c -4.17018,0.005 -9.08615,3.21902 -15.11846,6.17016 2.14868,1.67304 3.44211,3.7737 4.04885,6.21771 3.62419,-3.80977 13.17171,-1.05754 16.12202,-5.49475 4.93105,0.15433 6.64744,-0.49516 9.47125,-0.86765 v -1.73478 c -2.81018,0.0169 -5.62644,-0.0383 -8.53126,-1.15703 -1.8285,-2.25818 -3.80802,-3.13613 -5.9924,-3.13366 z m 1.36529,1.54305 c 0.51916,-7e-5 0.94005,0.39653 0.94,0.88574 5e-5,0.48921 -0.42084,0.8858 -0.94,0.88573 -0.51896,-2e-4 -0.93953,-0.39671 -0.93948,-0.88573 -5e-5,-0.48902 0.42052,-0.88554 0.93948,-0.88574 z',
        neck:'m 130.8593,133.38973 c 2.66117,1.76845 3.46281,4.29426 3.83179,6.99629 -3.56599,1.40474 -6.68157,5.78005 -9.90482,8.69236 1.24643,-2.40287 4.29155,-12.11365 -3.6149,-14.34593 3.68874,0.63022 6.96274,0.28748 9.68793,-1.34272 z',
        body:'m 121.38827,134.76339 c 6.61492,2.17592 7.04799,10.23034 3.3257,14.53189 -22.69606,19.81053 -32.585143,11.82719 -47.065967,13.80891 -3.621757,4.47808 -7.986257,3.26179 -12.146055,3.61489 18.631556,-27.8363 45.306572,-33.08285 55.886322,-31.95569 z',
        tail:'M 93.26436,141.3425 C 82.956846,159.32168 73.391773,163.73006 66.152627,163.68257 73.232488,153.34055 84.283969,144.02733 93.26436,141.3425 Z',
        foot:'m 92.541383,157.24805 c -1.356816,2.98773 -0.782192,4.52688 -7.157498,11.27848 l -0.578385,-1.37366 -1.301363,-0.36149 0.216895,-1.59055 -1.735151,-0.36149 0.433787,-1.08447 c 1.646614,-0.0959 3.324302,-0.28498 5.350049,-1.51826 1.981056,-1.27235 3.349383,-3.15743 4.771666,-4.98856 z',
        wing1:'m 92.758275,145.39119 28.123905,-8.74806 c -3.88146,-5.53962 -5.30573,-13.71697 -4.26558,-20.67721 3.7587,-25.151533 -21.992437,-20.896652 -32.750974,-37.305746 -2.145456,2.39541 -1.167192,5.103193 0.506087,7.880477 l -2.602727,-0.144595 c -0.502855,3.842374 0.942059,5.347426 2.313535,6.940603 L 81.407496,92.97517 c -1.057262,1.879578 2.964217,6.362221 2.964217,6.362221 -0.58951,0.974169 -1.531361,1.507899 -2.891919,1.518259 0.714367,2.33076 1.960827,3.59734 3.831793,3.6149 l -2.241238,1.30136 c 0.331454,1.60851 2.055331,2.5256 3.325707,2.81962 -0.636823,1.01067 -1.583893,1.24572 -2.602727,1.30136 1.098168,1.95915 2.516887,2.95664 4.193281,3.18111 l -0.433787,1.87975 2.45813,0.50608 v 2.16894 l 1.445958,-0.14459 c -1.743649,9.73782 -0.796291,18.93745 1.301364,27.90701 z',
        p2:[92.258781,155.21812],
        p1:[92.758275,145.39119]
      };
    },
    _duckWingPivot(d,px,py,fill,doAnimate,flapDur){
      const path=`<path d="${d}" fill="${fill}" fill-opacity="1"/>`;
      const ox=px.toFixed(3), oy=py.toFixed(3);
      if(!doAnimate) return `<g transform="translate(${ox},${oy})"><g transform="translate(${-ox},${-oy})">${path}</g></g>`;
      const sy='1 1;1 0.94;1 0.84;1 0.72;1 0.58;1 0.72;1 0.84;1 0.94;1 1';
      const kt='0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1';
      return `<g transform="translate(${ox},${oy})"><g>
        <animateTransform attributeName="transform" type="scale" values="${sy}" keyTimes="${kt}" dur="${flapDur}s" repeatCount="indefinite"/>
        <g transform="translate(${-ox},${-oy})">${path}</g>
      </g></g>`;
    },
    _duckSvg(doAnimate,flapDur,theme){
      const c=this._duckColors(theme), p=this._duckPaths();
      const op=' fill-opacity="1"';
      return `<g transform="${this._duckNorm()}"><g transform="${this._duckLayer()}">
        ${this._duckWingPivot(p.wing2,p.p2[0],p.p2[1],c.dark,doAnimate,flapDur)}
        <path d="${p.head}" fill="${c.dark}"${op}/>
        <path d="${p.neck}" fill="${c.dark}"${op}/>
        <path d="${p.body}" fill="${c.light}"${op}/>
        <path d="${p.tail}" fill="${c.dark}"${op}/>
        <path d="${p.foot}" fill="${c.dark}"${op}/>
        ${this._duckWingPivot(p.wing1,p.p1[0],p.p1[1],c.light,doAnimate,flapDur)}
      </g></g>`;
    },
    _birdAnimSvg(doAnimate,flapDur,theme){
      return this._duckSvg(doAnimate,flapDur,theme);
    },
    _swimDuckPaths(){
      return {
        head:'m 46.225602,146.96777 c -3.07597,-0.007 -6.462375,2.00304 -9.519832,7.21713 -2.931013,3.41264 -5.861732,4.16257 -8.792745,5.52163 v 1.43144 c 3.433953,-0.4246 6.944497,-0.38768 10.121863,-2.3518 3.318023,1.04785 8.256392,0.666 7.259505,5.52111 3.5104,2.3153 7.02074,1.50596 10.53114,1.53376 -0.389545,-4.78974 0.474078,-11.28004 -2.956925,-15.37684 -1.758687,-2.09996 -4.094345,-3.49063 -6.643006,-3.49643 z m -4.816243,3.63854 a 1.2269371,1.2269371 0 0 1 1.226798,1.22732 1.2269371,1.2269371 0 0 1 -1.226798,1.22679 1.2269371,1.2269371 0 0 1 -1.227316,-1.22679 1.2269371,1.2269371 0 0 1 1.227316,-1.22732 z',
        body:'m 55.723387,166.24996 c -3.931367,1.81381 -7.689993,1.55474 -11.349167,0.10224 -6.546844,13.99292 -3.945876,12.5292 -2.965098,13.80304 21.35068,2.37258 56.792244,0.81361 59.097468,-1.22693 5.21893,-3.14736 8.64584,-7.01152 11.14468,-11.24692 -18.998302,2.244 -34.191895,-6.96915 -55.927883,-1.43143 z',
        wake:'m 62.062563,163.18262 c -14.901089,5.78943 -7.313256,11.49778 0.817957,11.14467 18.245701,1.04402 26.761616,-5.38141 38.64851,-6.33918 -12.644262,-1.46551 -19.963478,-10.54164 -39.466467,-4.80549 z'
      };
    },
    _swimLayer(){
      return 'translate(-27.913026,-146.96775)';
    },
    _swimNorm(){
      return 'translate(-41.869,-17.191) scale(1.08)';
    },
    _swimDuckSvg(theme){
      const c=this._duckColors(theme), p=this._swimDuckPaths();
      const fo=' fill-opacity="1"';
      return `<g transform="${this._swimNorm()}"><g transform="${this._swimLayer()}">
        <path d="${p.body}" fill="${c.light}"${fo}/>
        <path d="${p.head}" fill="${c.dark}"${fo}/>
        <path d="${p.wake}" fill="${c.dark}"${fo}/>
      </g></g>`;
    },
    _swimDuckClip(clipId){
      return `<defs><clipPath id="${clipId}"><rect x="-140" y="-90" width="280" height="18"/></clipPath></defs>`;
    },
    _swimDuckGroup(doAnimate,dive,clipId,duck,rot,swimDur,beg,kt){
      if(dive&&doAnimate){
        return `${this._swimDuckClip(clipId)}
          <g clip-path="url(#${clipId})"><g>
            <animateTransform attributeName="transform" type="rotate" values="0;0;${rot};${rot};0;0;0" keyTimes="${kt}" dur="${swimDur}s" begin="${beg}s" repeatCount="indefinite"/>
            <g>
              <animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 4;0 7;0 1;0 0;0 0" keyTimes="${kt}" dur="${swimDur}s" begin="${beg}s" repeatCount="indefinite"/>
              ${duck}
            </g>
          </g></g>`;
      }
      return duck;
    },
    _buildWaterRipples(w,h,waveCol,doAnimate,rng,f,midBegin){
      const band=0.20*h;
      const yTop=h-band;
      const n=Math.round(16+w*0.014);
      let svg='';
      for(let i=0;i<n;i++){
        const seed=i*37+803;
        const x=rng(seed)*w;
        const y=yTop+(0.06+rng(seed+1)*0.90)*band;
        const durNum=1.6+rng(seed+2)*2.8;
        const dur=durNum.toFixed(1);
        const beg=midBegin(seed+3,durNum,0,1);
        const rx0=(2+rng(seed+4)*5).toFixed(1);
        const rx1=(10+rng(seed+5)*24).toFixed(1);
        const ry0=(0.7+rng(seed+6)*1.4).toFixed(1);
        const ry1=(2.5+rng(seed+7)*7).toFixed(1);
        if(doAnimate){
          svg+=`<ellipse cx="${f(x)}" cy="${f(y)}" fill="none" stroke="${waveCol}" stroke-width="1" opacity="0">
            <animate attributeName="opacity" values="0;0.45;0" keyTimes="0;0.1;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="rx" values="${rx0};${rx1}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <animate attributeName="ry" values="${ry0};${ry1}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
          </ellipse>`;
        }else{
          const t=0.25+rng(seed+8)*0.5;
          svg+=`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${(+rx0+(+rx1-+rx0)*t).toFixed(1)}" ry="${(+ry0+(+ry1-+ry0)*t).toFixed(1)}" fill="none" stroke="${waveCol}" stroke-width="1" opacity="${(0.45*(1-t)).toFixed(2)}"/>`;
        }
      }
      return svg;
    },
    _buildSwimmers(w,h,theme,doAnimate,rng,f,midBegin){
      const waveCol=this._cloudFill(theme);
      const band=0.20*h;
      const yTop=h-band;
      const n=6;
      const kt='0;0.38;0.44;0.56;0.62;0.78;1';
      const pad=0.09*w;
      const xMin=-pad;
      const xMax=w+pad;
      let svg=this._buildWaterRipples(w,h,waveCol,doAnimate,rng,f,midBegin);
      for(let i=0;i<n;i++){
        const seed=i*61+401;
        const depth=rng(seed);
        const y=yTop+depth*band;
        const sc=(0.32+depth*0.68).toFixed(2);
        const startLeft=rng(seed+1)>0.5;
        const swimDur=(26+rng(seed+4)*22).toFixed(1);
        const beg=midBegin(seed+5,+swimDur,0,0.92);
        const dive=doAnimate&&rng(seed+8)>0.62;
        const clipId='swc'+i;
        const duck=this._swimDuckSvg(theme);
        const rot=startLeft?'-82':'82';
        const posVals=startLeft
          ?`${f(xMin)} 0;${f(xMax)} 0;${f(xMin)} 0`
          :`${f(xMax)} 0;${f(xMin)} 0;${f(xMax)} 0`;
        const flipVals=startLeft?'-1 1;-1 1;1 1;1 1':'1 1;1 1;-1 1;-1 1';
        const swimInner=this._swimDuckGroup(doAnimate,dive,clipId,duck,rot,swimDur,beg,kt);
        if(doAnimate){
          svg+=`<g transform="translate(0,${f(y)})"><g>
            <animateTransform attributeName="transform" type="translate" values="${posVals}" keyTimes="0;0.5;1" dur="${swimDur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"/>
            <g transform="scale(${sc})"><g>
              <animateTransform attributeName="transform" type="scale" values="${flipVals}" keyTimes="0;0.499;0.5;1" dur="${swimDur}s" begin="${beg}s" repeatCount="indefinite"/>
              ${swimInner}
            </g></g></g></g>`;
        }else{
          const t=0.15+rng(seed+7)*0.7;
          const bx=xMin+(xMax-xMin)*t;
          const goingRight=startLeft?(t<0.5):(t>=0.5);
          const face=goingRight?' scale(-1,1)':'';
          svg+=`<g transform="translate(${f(bx)},${f(y)}) scale(${sc})${face}">${swimInner}</g>`;
        }
      }
      return svg;
    },
    _build(w,h,a1,a2,isTitle,doAnimate){
      const rng=s=>{let x=Math.sin(s*71.7+13.4)*43758.5;return x-Math.floor(x);};
      const f=n=>n.toFixed(1);
      const midBegin=(seed,dur,lo,hi)=>{const p=lo+rng(seed)*(hi-lo);return(-p*dur).toFixed(2);};
      const ti=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx:-1;
      const theme=ti>=0&&typeof THEMES!=='undefined'?THEMES[ti]:null;
      const cloudFill=this._cloudFill(theme);
      const [cpx,cpy]=this._cloudPivot();
      const cloudLift=100;
      const topBand=0.20*h;
      const nClouds=isTitle?22:14;
      const nBirds=isTitle?8:5;
      const nCloudShapes=this._cloudPaths.length;
      let svg='';
      const cloudItems=[];
      for(let i=0;i<nClouds;i++){
        const seed=i*47+3;
        let x0,y0,x1,y1;
        if(isTitle){
          x0=rng(seed)*1.08*w-0.04*w;
          y0=-0.12*h-rng(seed+1)*0.10*h;
          x1=x0+(rng(seed+2)-0.5)*0.03*w;
          y1=topBand*(0.45+rng(seed+3)*0.55);
        }else{
          x0=rng(seed)*0.52*w+0.02*w;
          y0=-0.20*h-rng(seed+1)*0.10*h-cloudLift;
          x1=x0+(rng(seed+2)-0.5)*0.008*w;
          y1=topBand*(0.06+rng(seed+3)*0.22)-cloudLift;
        }
        const sc0=(1.25+rng(seed+4)*0.35).toFixed(2);
        const sc1=(0.22+rng(seed+5)*0.18).toFixed(2);
        const durNum=16+rng(seed+6)*14;
        const dur=durNum.toFixed(1);
        const beg=midBegin(seed+7,durNum,0,0.95);
        const d=this._cloudPaths[i%nCloudShapes];
        cloudItems.push({seed,x0,y0,x1,y1,sc0,sc1,dur,beg,d,drawOrder:y0});
      }
      cloudItems.sort((a,b)=>a.drawOrder-b.drawOrder);
      cloudItems.forEach(c=>{
        const shape=this._cloudShape(c.d,cloudFill,doAnimate,c.dur,c.beg);
        if(doAnimate){
          svg+=`<g>
            <animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;0.06;0.10;0.90;1" dur="${c.dur}s" begin="${c.beg}s" repeatCount="indefinite"/>
            <g>
              <animateTransform attributeName="transform" type="translate" values="${f(c.x0)} ${f(c.y0)};${f(c.x1)} ${f(c.y1)}" dur="${c.dur}s" begin="${c.beg}s" repeatCount="indefinite" calcMode="linear"/>
              <g transform="translate(${cpx},${cpy})"><g>
                <animateTransform attributeName="transform" type="scale" values="${c.sc0};${c.sc1}" dur="${c.dur}s" begin="${c.beg}s" repeatCount="indefinite" calcMode="linear"/>
                <g transform="translate(${-cpx},${-cpy})">${shape}</g>
              </g></g>
            </g>
          </g>`;
        }else{
          const t=0.4+rng(c.seed+9)*0.45;
          const cxp=c.x0+(c.x1-c.x0)*t, cyp=c.y0+(c.y1-c.y0)*t;
          const sc=(+c.sc0+(+c.sc1-+c.sc0)*t).toFixed(2);
          const fadeT=Math.max(0,Math.min(1,(t-0.18)/0.82));
          const staticFill=this._cloudFadeColor(cloudFill,fadeT*this._cloudFadeStops(cloudFill).max);
          svg+=`<g transform="translate(${f(cxp)},${f(cyp)}) scale(${sc})" opacity="${t>0.9?(1-(t-0.9)/0.1).toFixed(2):'1'}">${this._cloudShape(c.d,staticFill,false)}</g>`;
        }
      });
      const flapDur='0.63';
      if(isTitle){
      for(let i=0;i<nBirds;i++){
        const seed=i*53+901;
        const lane=i%5;
        const x0=1.08*w+lane*0.02*w;
        const y0=0.12*h+lane*0.025*h+rng(seed)*0.08*h;
        const x1=-0.18*w-lane*0.03*w;
        const y1=-0.06*h+lane*0.02*h+rng(seed+1)*0.05*h;
        const sc0=(0.85+lane*0.05).toFixed(2);
        const sc1=(1.55+lane*0.1).toFixed(2);
        const durNum=11+rng(seed+2)*9;
        const dur=durNum.toFixed(1);
        const beg=midBegin(seed+3,durNum,0,0.92);
        const rot=(-17+rng(seed+5)*8).toFixed(1);
        const bird=this._birdAnimSvg(doAnimate,flapDur,theme);
        if(doAnimate){
          svg+=`<g>
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.9;1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>
            <g>
              <animateTransform attributeName="transform" type="translate" values="${f(x0)} ${f(y0)};${f(x1)} ${f(y1)}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.2 0.05 0.8 0.95"/>
              <g transform="rotate(${rot}) scale(-1,1)" opacity="1">
                <g>
                  <animateTransform attributeName="transform" type="scale" values="${sc0};${sc1}" dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="0.25 0 0.75 1"/>
                  ${bird}
                </g>
              </g>
            </g>
          </g>`;
        }else{
          const t=0.35+rng(seed+6)*0.45;
          const bx=x0+(x1-x0)*t, by=y0+(y1-y0)*t;
          const sc=(+sc0+(+sc1-+sc0)*t).toFixed(2);
          svg+=`<g transform="translate(${f(bx)},${f(by)}) rotate(${rot}) scale(${(-sc).toFixed(2)},${sc})" opacity="1">${bird}</g>`;
        }
      }
      }else{
        svg+=this._buildSwimmers(w,h,theme,doAnimate,rng,f,midBegin);
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${svg}</svg>`;
    },
    titleSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,true,d!==false);},
    contentSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,false,d!==false);},
  },

  // ── Notebook paper (клетка: размеры + оси; линия: крупная/мелкая) ──
  {
    name:'Тетрадь · клетка', nameEn:'Notebook · Grid',
    desc:'Клетка — размер и оси координат', descEn:'Grid — size and coordinate axes',
    animated:false,
    paper:{kind:'grid', cell:48, cellFine:28, fade:0.08},
    variantSvg(w,h,a1,a2,style){
      const st = style || 'title';
      const p = Object.assign({}, this.paper);
      if(st === 'content' || st === 'fine') p.cell = this.paper.cellFine != null ? this.paper.cellFine : 28;
      const axes = (st === 'axes-center' || st === 'axes-q1' || st === 'axes-q1inv' || st === 'axes-q1right') ? st : null;
      return _notebookLayoutSvg(w,h,p,a1,a2,axes);
    },
    titleSvg(w,h,a1,a2){ return this.variantSvg(w,h,a1,a2,'title'); },
    contentSvg(w,h,a1,a2){ return this.variantSvg(w,h,a1,a2,'content'); },
  },
  {
    name:'Тетрадь · линия', nameEn:'Notebook · Lined',
    desc:'Линовка — крупная / мелкая в шаблонах', descEn:'Lined — large / fine in templates',
    animated:false,
    paper:{kind:'lined', pitch:36, pitchFine:24, fade:0.08},
    variantSvg(w,h,a1,a2,style){
      const st = style || 'title';
      const p = Object.assign({}, this.paper);
      if(st === 'content' || st === 'fine') p.pitch = this.paper.pitchFine != null ? this.paper.pitchFine : 24;
      return _notebookLayoutSvg(w,h,p,a1,a2);
    },
    titleSvg(w,h,a1,a2){ return this.variantSvg(w,h,a1,a2,'title'); },
    contentSvg(w,h,a1,a2){ return this.variantSvg(w,h,a1,a2,'content'); },
  },

  // ── SWAMP ── кувшинка (статично) + ряска (верх) и размытые круги на глубине
  {
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
        {x:bw*0.04, y:h-bh*0.96, s:baseS, rot:-90, flipX:true, flipY:false, rotCx:0, rotCy:bh, w:bw, h:bh},
        {x:w-bw2*0.96, y:bh2*0.04, s:s2, rot:0, flipX:false, flipY:false, rotCx:0, rotCy:0, w:bw2, h:bh2},
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
  },

  // ── TILE ── сетка квадратов (19/29), крупные объединённые плитки
  {
    name:'Плитка', nameEn:'Tile',
    desc:'Сетка плиток, крупные блоки, смена цвета', descEn:'Tile grid, large blocks, color flips',
    animated: true,
    // 18×10: equal edge/gap + square cells on 16:9
    _cols:18, _rows:10,
    _metrics(w,h){
      const cols=this._cols, rows=this._rows;
      let g=(rows*w-cols*h)/(rows-cols);
      let s=(w-(cols+1)*g)/cols;
      if(!(g>0.5&&s>2) || Math.abs((h-(rows+1)*g)/rows-s)>0.05){
        const alpha=0.2;
        s=Math.min(w/(cols+(cols+1)*alpha), h/(rows+(rows+1)*alpha));
        g=s*alpha;
      }
      const gw=cols*s+(cols+1)*g;
      const gh=rows*s+(rows+1)*g;
      return {cols,rows,s,g, ox:(w-gw)/2, oy:(h-gh)/2};
    },
    _swatch(a1,a2){
      const th=typeof _activeThemeForScheme==='function'?_activeThemeForScheme():(typeof _activeTheme==='function'?_activeTheme():null);
      const sw=(c,r,fb)=>(th&&typeof _schemeSwatchColor==='function'&&_schemeSwatchColor(th,c,r))||fb;
      return {c19:sw(0,8,a2||'#c45c3e'), c29:sw(1,8,a1||'#9a8f84')};
    },
    /** Large tiles as [c0,r0,c1,r1] inclusive. Rest = 1×1. */
    _layoutRects(style){
      const st=style||'full';
      if(st==='split'){
        return [[1,1,10,8],[12,1,16,3]];
      }
      if(st==='frame'||st==='border'||st==='title'){
        return [[2,2,15,7]];
      }
      if(st==='mosaic'){
        return [
          [0,0,1,1],[3,0,4,1],[7,0,8,0],[13,0,15,1],
          [2,1,2,2],[5,1,6,2],[9,1,10,2],[16,1,17,2],
          [0,3,1,4],[4,3,5,4],[11,3,12,4],[14,3,15,5],
          [2,4,3,5],[7,4,8,5],[16,5,17,6],
          [0,6,1,7],[2,6,5,8],[8,6,9,7],[11,6,12,7],
          [6,7,7,8],[13,7,14,8],[16,8,17,9],
          [0,9,2,9],[8,9,10,9],[12,9,13,9],
        ];
      }
      if(st==='bands'||st==='strips'||st==='content'){
        return [[1,1,16,2],[1,4,16,8]];
      }
      return []; // full — only 1×1
    },
    _cellOcc(rects,cols,rows){
      const occ=Array.from({length:rows},()=>Array(cols).fill(null));
      rects.forEach((R,ri)=>{
        const[c0,r0,c1,r1]=R;
        for(let r=r0;r<=r1;r++) for(let c=c0;c<=c1;c++){
          if(r>=0&&r<rows&&c>=0&&c<cols) occ[r][c]=ri;
        }
      });
      return occ;
    },
    _build(w,h,a1,a2,style,doAnimate){
      const uid='tl'+Math.random().toString(36).slice(2,7);
      const rng=s=>{let x=Math.sin(s*127.1+311.7)*43758.5;return x-Math.floor(x);};
      const {c19,c29}=this._swatch(a1,a2);
      const M=this._metrics(w,h);
      const {cols,rows,s,g,ox,oy}=M;
      const f=n=>n.toFixed(2);
      const rects=this._layoutRects(style);
      const occ=this._cellOcc(rects,cols,rows);
      const seedBase=(style||'full').length*97+cols*13;

      let svg='';
      // Large merged tiles (color 29 dominant, occasional 19)
      rects.forEach((R,ri)=>{
        const[c0,r0,c1,r1]=R;
        const x=ox+g+c0*(s+g);
        const y=oy+g+r0*(s+g);
        const bw=(c1-c0+1)*s+(c1-c0)*g;
        const bh=(r1-r0+1)*s+(r1-r0)*g;
        const fill=rng(seedBase+ri*19+3)<0.18?c19:c29;
        svg+=`<rect x="${f(x)}" y="${f(y)}" width="${f(bw)}" height="${f(bh)}" rx="${f(Math.min(3,s*0.08))}" fill="${fill}"/>`;
      });

      // 1×1 cells
      let cellI=0;
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          if(occ[r][c]!=null) continue;
          const x=ox+g+c*(s+g);
          const y=oy+g+r*(s+g);
          const seed=seedBase+r*131+c*17+7;
          const use29=rng(seed)<0.22;
          const fill=use29?c29:c19;
          const alt=use29?c19:c29;
          const rx=Math.min(2.2,s*0.08);
          if(doAnimate && rng(seed+41)<0.28){
            const dur=(3.5+rng(seed+5)*5.5).toFixed(1);
            const beg=(-(rng(seed+9)*(+dur))).toFixed(2);
            // Mostly stay on primary; brief flip to alt
            const hold=0.62+rng(seed+11)*0.2;
            const t1=hold.toFixed(2);
            const t2=(hold+0.08+rng(seed+13)*0.1).toFixed(2);
            svg+=`<rect x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" rx="${f(rx)}" fill="${fill}">`+
              `<animate attributeName="fill" values="${fill};${fill};${alt};${alt};${fill}" `+
              `keyTimes="0;${t1};${t1};${t2};1" dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="discrete"/>`+
              `</rect>`;
          } else {
            svg+=`<rect x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" rx="${f(rx)}" fill="${fill}"/>`;
          }
          cellI++;
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${svg}</svg>`;
    },
    variantSvg(w,h,a1,a2,style,doAnimate){
      const anim=doAnimate===false?false:(this.animated&&((typeof _layoutAnimated!=='undefined')?_layoutAnimated:true));
      return this._build(w,h,a1,a2,style||'full',anim);
    },
    titleSvg(w,h,a1,a2,d){ return this._build(w,h,a1,a2,'frame',d!==false); },
    contentSvg(w,h,a1,a2,d){ return this._build(w,h,a1,a2,'bands',d!==false); },
  },

  // ── THROUGH SPACE ── полёт сквозь пустоту: звёзды навстречу, ускорение, черточки
  {
    name:'Сквозь пространство', nameEn:'Through Space',
    desc:'Звёзды летят навстречу и вытягиваются в черточки',
    descEn:'Stars rush toward you and stretch into streaks',
    animated: true,
    _build(w,h,a1,a2,isTitle,doAnimate){
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
    titleSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,true,d!==false);},
    contentSvg(w,h,a1,a2,d){return this._build(w,h,a1,a2,false,d!==false);},
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
  },
];

/** Active colour scheme (applied, else selected in modal). */
function _activeTheme(){
  const ti = (typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0) ? appliedThemeIdx
    : ((typeof selTheme !== 'undefined' && selTheme >= 0) ? selTheme : -1);
  return (ti >= 0 && typeof THEMES !== 'undefined') ? THEMES[ti] : null;
}

/** Push scheme background onto slides (same look as colour-scheme thumbnails). */
function _syncSlidesThemeBg(opts){
  const theme = _activeTheme();
  if(!theme || typeof slides === 'undefined' || !slides) return;
  const force = !!(opts && opts.force);
  const onlyNotebook = !!(opts && opts.onlyNotebook);
  let changed = false;
  slides.forEach(s=>{
    if(onlyNotebook){
      const hasNb = (s.els || []).some(d=>{
        if(!d || !d._isDecor) return false;
        const L = LAYOUTS[d._layoutIdx];
        return !!(L && L.paper);
      });
      if(!hasNb) return;
    }
    if(!force && s.bgScheme === null) return;
    s.bg = 'custom';
    s.bgc = theme.bg;
    if(force && 'bgScheme' in s) delete s.bgScheme;
    changed = true;
  });
  if(changed && typeof _applySlideBgToEl === 'function'){
    const cvbg = document.getElementById('cvbg');
    if(cvbg && typeof cur === 'number' && slides[cur]) _applySlideBgToEl(cvbg, slides[cur]);
  }
}

/** Resolve notebook stroke colours from the active colour scheme (palette «16»). */
function _notebookSchemeColors(a1, a2){
  const theme = _activeTheme();
  const isLight = !!(theme && theme.dark === false);
  const fallback1 = a1 || (isLight ? '#cbd5e1' : '#475569');
  // Палитра «16» = col0,row5
  let lineCol = fallback1;
  if(theme && typeof _schemeSwatchColor === 'function'){
    const c16 = _schemeSwatchColor(theme, 0, 5);
    if(c16) lineCol = c16;
  }
  const lineCol2 = lineCol;
  const lineOp = isLight ? 0.5 : 0.4;
  const bgCss = (theme && theme.bg) ? theme.bg : (isLight ? '#f8fafc' : '#0f172a');
  return { theme, isLight, lineCol, lineCol2, lineOp, bgCss };
}

/** Edge fade via SVG mask (lines → transparent). No solid overlays → no colour patches. */
function _notebookEdgeMaskDefs(uid, w, h, fade){
  const fPct = Math.max(4, Math.min(18, Math.round((fade != null ? fade : 0.08) * 100)));
  return `<defs>
    <linearGradient id="${uid}fx" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="${fPct}%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="${100 - fPct}%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${uid}fy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="${fPct}%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="${100 - fPct}%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="${uid}mx" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" fill="url(#${uid}fx)"/>
    </mask>
    <mask id="${uid}my" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" fill="url(#${uid}fy)"/>
    </mask>
  </defs>`;
}

/** Coordinate axes on grid (unit = one cell). Modes: axes-center | axes-q1 | axes-q1inv | axes-q1right */
function _notebookAxesOverlay(w, h, cell, axesMode, axisCol){
  if(!axesMode || !cell || cell <= 0) return '';
  const f = n => n.toFixed(1);
  const snap = v => Math.max(0, Math.min(w, Math.round(v / cell) * cell));
  const snapY = v => Math.max(0, Math.min(h, Math.round(v / cell) * cell));
  const margin = cell;
  const tick = Math.max(3, cell * 0.18);
  const swA = Math.max(1.2, cell * 0.06);
  const ah = Math.max(5, cell * 0.28);
  const axOp = 0.48; // полупрозрачные оси

  let ox, oy;
  let xMin, xMax, yMin, yMax;
  let xPosRight = true;
  let yPosDown = false;

  if(axesMode === 'axes-center'){
    ox = snap(w * 0.5); oy = snapY(h * 0.5);
    xMin = 0; xMax = w; yMin = 0; yMax = h;
    xPosRight = true; yPosDown = false;
  } else if(axesMode === 'axes-q1'){
    ox = snap(margin); oy = snapY(h - margin);
    xMin = ox; xMax = w; yMin = 0; yMax = oy;
    xPosRight = true; yPosDown = false;
  } else if(axesMode === 'axes-q1inv'){
    ox = snap(margin); oy = snapY(margin);
    xMin = ox; xMax = w; yMin = oy; yMax = h;
    xPosRight = true; yPosDown = true;
  } else if(axesMode === 'axes-q1right'){
    // I четверть справа: начало на середине, на 3 клетки выше низа
    ox = snap(w * 0.5); oy = snapY(h - margin - 3 * cell);
    if(ox < margin) ox = snap(margin);
    if(oy < margin) oy = snap(margin);
    if(oy > h - margin) oy = snapY(h - margin);
    xMin = ox; xMax = w; yMin = 0; yMax = oy;
    xPosRight = true; yPosDown = false;
  } else {
    return '';
  }

  const uid = 'ax' + Math.random().toString(36).slice(2, 7);
  const col = axisCol || '#1e293b';
  const fs = Math.max(9, cell * 0.36);
  const fsAxis = Math.max(10, cell * 0.42);

  function arrow(x1, y1, x2, y2){
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len, uy = dy / len;
    const bx = x2 - ux * ah, by = y2 - uy * ah;
    const px = -uy * (ah * 0.45), py = ux * (ah * 0.45);
    return `<polygon points="${f(x2)},${f(y2)} ${f(bx+px)},${f(by+py)} ${f(bx-px)},${f(by-py)}" fill="${col}" fill-opacity="${axOp}"/>`;
  }

  let axes = '';
  axes += `<line x1="${f(xMin)}" y1="${f(oy)}" x2="${f(xMax)}" y2="${f(oy)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}" stroke-linecap="round"/>`;
  axes += `<line x1="${f(ox)}" y1="${f(yMin)}" x2="${f(ox)}" y2="${f(yMax)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}" stroke-linecap="round"/>`;

  if(xPosRight) axes += arrow(ox, oy, xMax - 1, oy);
  else axes += arrow(ox, oy, xMin + 1, oy);
  if(yPosDown) axes += arrow(ox, oy, ox, yMax - 1);
  else axes += arrow(ox, oy, ox, yMin + 1);

  if(axesMode === 'axes-center'){
    axes += arrow(ox, oy, xMin + 1, oy);
    axes += arrow(ox, oy, ox, yMax - 1);
  }

  let ticks = '';
  let nums = '';
  const numGap = Math.max(2, cell * 0.12);

  function numText(x, y, n, anchor, baseline){
    return `<text x="${f(x)}" y="${f(y)}" fill="${col}" fill-opacity="${axOp}" font-size="${fs.toFixed(1)}" font-family="system-ui,Segoe UI,sans-serif" text-anchor="${anchor||'middle'}" dominant-baseline="${baseline||'hanging'}">${n}</text>`;
  }

  // X ticks + numbers (у шаблона «I четверть ↓» подписи X — сверху горизонтальной оси)
  const xNumsAbove = axesMode === 'axes-q1inv';
  let xi = 1;
  for(let x = ox + cell; x <= xMax - cell * 0.35; x += cell, xi++){
    ticks += `<line x1="${f(x)}" y1="${f(oy - tick)}" x2="${f(x)}" y2="${f(oy + tick)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}"/>`;
    const n = xPosRight ? xi : -xi;
    if(xNumsAbove) nums += numText(x, oy - tick - numGap, n, 'middle', 'auto');
    else nums += numText(x, oy + tick + numGap, n, 'middle', 'hanging');
  }
  xi = 1;
  for(let x = ox - cell; x >= xMin + cell * 0.35; x -= cell, xi++){
    ticks += `<line x1="${f(x)}" y1="${f(oy - tick)}" x2="${f(x)}" y2="${f(oy + tick)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}"/>`;
    const n = xPosRight ? -xi : xi;
    if(xNumsAbove) nums += numText(x, oy - tick - numGap, n, 'middle', 'auto');
    else nums += numText(x, oy + tick + numGap, n, 'middle', 'hanging');
  }

  // Y ticks + numbers — слева от оси
  let yi = 1;
  for(let y = oy + cell; y <= yMax - cell * 0.35; y += cell, yi++){
    ticks += `<line x1="${f(ox - tick)}" y1="${f(y)}" x2="${f(ox + tick)}" y2="${f(y)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}"/>`;
    const n = yPosDown ? yi : -yi;
    nums += numText(ox - tick - numGap, y, n, 'end', 'middle');
  }
  yi = 1;
  for(let y = oy - cell; y >= yMin + cell * 0.35; y -= cell, yi++){
    ticks += `<line x1="${f(ox - tick)}" y1="${f(y)}" x2="${f(ox + tick)}" y2="${f(y)}" stroke="${col}" stroke-opacity="${axOp}" stroke-width="${swA.toFixed(2)}"/>`;
    const n = yPosDown ? -yi : yi;
    nums += numText(ox - tick - numGap, y, n, 'end', 'middle');
  }

  // Origin «0»
  const or = Math.max(2, cell * 0.1);
  ticks += `<circle cx="${f(ox)}" cy="${f(oy)}" r="${f(or)}" fill="${col}" fill-opacity="${axOp}"/>`;
  if(xNumsAbove) nums += numText(ox - tick - numGap, oy - tick - numGap, '0', 'end', 'auto');
  else nums += numText(ox - tick - numGap, oy + tick + numGap, '0', 'end', 'hanging');

  // x / y labels
  let lx, ly, lyx, lyy;
  if(xPosRight){ lx = xMax - ah * 1.6; lyx = oy + fsAxis * 0.95; }
  else { lx = xMin + ah * 0.8; lyx = oy + fsAxis * 0.95; }
  if(yPosDown){ ly = yMax - ah * 0.4; lyy = ox + fsAxis * 0.85; }
  else { ly = yMin + ah * 1.1; lyy = ox + fsAxis * 0.85; }
  const labels = `<text x="${f(lx)}" y="${f(lyx)}" fill="${col}" fill-opacity="${axOp}" font-size="${fsAxis.toFixed(1)}" font-family="Georgia,serif" font-style="italic">x</text>`
    + `<text x="${f(lyy)}" y="${f(ly)}" fill="${col}" fill-opacity="${axOp}" font-size="${fsAxis.toFixed(1)}" font-family="Georgia,serif" font-style="italic">y</text>`;

  return `<g id="${uid}-axes">${axes}${ticks}${nums}${labels}</g>`;
}

/** SVG for notebook-paper layout previews and slide decor. */
function _notebookLayoutSvg(w, h, paper, a1, a2, axesMode){
  const p = paper || {};
  const c = _notebookSchemeColors(a1, a2);
  const scale = w / 1200;
  const f = n => n.toFixed(1);
  const fade = p.fade != null ? p.fade : 0.08;
  const uid = 'nb' + Math.random().toString(36).slice(2, 7);
  const sw = Math.max(0.45, scale).toFixed(2);
  let lines = '';
  let cellPx = 0;

  if(p.kind === 'lined'){
    const pitch = (p.pitch || 32) * scale;
    const inset = fade * w;
    for(let y = pitch; y < h - pitch * 0.25; y += pitch){
      lines += `<line x1="${f(inset)}" y1="${f(y)}" x2="${f(w - inset)}" y2="${f(y)}" stroke="${c.lineCol}" stroke-opacity="${c.lineOp}" stroke-width="${sw}"/>`;
    }
  } else {
    cellPx = (p.cell || 36) * scale;
    for(let y = 0; y <= h; y += cellPx){
      lines += `<line x1="0" y1="${f(y)}" x2="${w}" y2="${f(y)}" stroke="${c.lineCol}" stroke-opacity="${c.lineOp}" stroke-width="${sw}"/>`;
    }
    for(let x = 0; x <= w; x += cellPx){
      lines += `<line x1="${f(x)}" y1="0" x2="${f(x)}" y2="${h}" stroke="${c.lineCol}" stroke-opacity="${c.lineOp}" stroke-width="${sw}"/>`;
    }
  }

  const axisCol = (theme => {
    if(theme && typeof _schemeSwatchColor === 'function'){
      // Оси чуть контрастнее линий сетки: палитра «14»
      return _schemeSwatchColor(theme, 0, 3) || c.lineCol;
    }
    return c.lineCol;
  })(c.theme);
  const axes = (axesMode && cellPx) ? _notebookAxesOverlay(w, h, cellPx, axesMode, axisCol || c.lineCol) : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
    ${_notebookEdgeMaskDefs(uid, w, h, fade)}
    <g mask="url(#${uid}mx)"><g mask="url(#${uid}my)">${lines}</g></g>
    ${axes}
  </svg>`;
}

// ══════════════ LAYOUT ENGINE ══════════════

function _isGlDecorRenderer(r){
  return r==='crystal'||r==='dna'||r==='galaxy'||r==='caustics'||r==='warp';
}

function _glDecorByRenderer(r){
  if(r==='crystal'&&typeof CrystalDecor!=='undefined')return CrystalDecor;
  if(r==='dna'&&typeof DnaDecor!=='undefined')return DnaDecor;
  if(r==='galaxy'&&typeof GalaxyDecor!=='undefined')return GalaxyDecor;
  if(r==='caustics'&&typeof CausticsDecor!=='undefined')return CausticsDecor;
  if(r==='warp'&&typeof WarpDecor!=='undefined')return WarpDecor;
  return null;
}

// Get current theme accent colours (fallback to CSS vars)
function _decorAccents(){
  const ti=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx
          :(typeof selTheme!=='undefined'&&selTheme>=0?selTheme:-1);
  if(ti>=0&&typeof THEMES!=='undefined'&&THEMES[ti]){
    return [THEMES[ti].ac1||'#6366f1', THEMES[ti].ac2||'#818cf8'];
  }
  return ['#6366f1','#818cf8'];
}

function _ensureGlDecorCfg(d, a1, a2){
  if (!d || !d._isDecor) return;
  const li = d._layoutIdx;
  if (li == null || li < 0 || li >= LAYOUTS.length) return;
  const L = LAYOUTS[li];
  const doAnim = L && L.animated && _layoutAnimated;
  const accents = a1 && a2 ? [a1, a2] : _decorAccents();
  if (L && L.renderer === 'crystal' && typeof L.buildCrystalCfg === 'function'){
    d._decorRenderer = 'crystal';
    d._glCfg = L.buildCrystalCfg(canvasW, canvasH, accents[0], accents[1], d._decorStyle === 'title', doAnim);
    d._crystalCfg = d._glCfg;
    return;
  }
  if (L && L.renderer === 'dna' && typeof L.buildDnaCfg === 'function'){
    d._decorRenderer = 'dna';
    d._glCfg = L.buildDnaCfg(canvasW, canvasH, accents[0], accents[1], d._decorStyle === 'title', doAnim);
    return;
  }
  if (L && L.renderer === 'galaxy' && typeof L.buildGalaxyCfg === 'function'){
    d._decorRenderer = 'galaxy';
    d._glCfg = L.buildGalaxyCfg(canvasW, canvasH, accents[0], accents[1], d._decorStyle === 'title', doAnim);
    return;
  }
  if (L && L.renderer === 'caustics' && typeof L.buildCausticsCfg === 'function'){
    d._decorRenderer = 'caustics';
    d._glCfg = L.buildCausticsCfg(canvasW, canvasH, accents[0], accents[1], d._decorStyle === 'title', doAnim);
    return;
  }
  // Cosmos «звёздный разгон» — either Void layout or Cosmos style=void
  const voidL = LAYOUTS.find(e => e && e.nameEn === 'Cosmos · Void');
  const isWarp = (L && L.renderer === 'warp')
    || (L && L.nameEn === 'Cosmos · Void')
    || (L && L.nameEn === 'Cosmos' && d._decorStyle === 'void');
  if (isWarp && voidL && typeof voidL.buildWarpCfg === 'function' && typeof WarpDecor !== 'undefined'){
    d._decorRenderer = 'warp';
    const isTitle = d._decorStyle !== 'content';
    d._glCfg = voidL.buildWarpCfg(canvasW, canvasH, accents[0], accents[1], isTitle, doAnim);
    // Canvas draws stars (live or still). Keep SVG as glow only — never SMIL.
    d.svgContent = voidL._build(canvasW, canvasH, accents[0], accents[1], isTitle, true) || d.svgContent;
    return;
  }
  delete d._decorRenderer;
  delete d._glCfg;
  delete d._crystalCfg;
}
function _ensureCrystalCfg(d, a1, a2){ _ensureGlDecorCfg(d, a1, a2); }

function _ensureGlDecorCfg(d, a1, a2){
  if (!d || !d._isDecor) return;
  const li = d._layoutIdx;
  if (li == null || li < 0 || li >= LAYOUTS.length) return;
  const L = LAYOUTS[li];
  const doAnim = L && L.animated && _layoutAnimated;
  const accents = a1 && a2 ? [a1, a2] : _decorAccents();
  if (L && L.renderer === 'crystal' && typeof L.buildCrystalCfg === 'function'){
    d._decorRenderer = 'crystal';
    d._glCfg = L.buildCrystalCfg(canvasW, canvasH, accents[0], accents[1], d._decorStyle === 'title', doAnim);
    d._crystalCfg = d._glCfg;
    return;
  }
  if (L && L.renderer === 'dna' && typeof L.buildDnaCfg === 'function'){
    d._decorRenderer = 'dna';
    d._glCfg = L.buildDnaCfg(canvasW, canvasH, accents[0], accents[1], d._decorStyle === 'title', doAnim);
    return;
  }
  if (L && L.renderer === 'galaxy' && typeof L.buildGalaxyCfg === 'function'){
    d._decorRenderer = 'galaxy';
    d._glCfg = L.buildGalaxyCfg(canvasW, canvasH, accents[0], accents[1], d._decorStyle === 'title', doAnim);
    return;
  }
  if (L && L.renderer === 'caustics' && typeof L.buildCausticsCfg === 'function'){
    d._decorRenderer = 'caustics';
    d._glCfg = L.buildCausticsCfg(canvasW, canvasH, accents[0], accents[1], d._decorStyle === 'title', doAnim);
    return;
  }
  delete d._decorRenderer;
  delete d._glCfg;
  delete d._crystalCfg;
}
function _ensureCrystalCfg(d, a1, a2){ _ensureGlDecorCfg(d, a1, a2); }

// Build the SVG string for a decor element using current canvas dimensions.
// Scopes all defs IDs with a unique prefix so multiple slides never share filter/gradient IDs.
let _svgUidCounter=0;
function _buildDecorSvg(layoutIdx, style, mirror){
  const L=LAYOUTS[layoutIdx];
  if(!L)return '';
  const [a1,a2]=_decorAccents();
  const doAnimate = L.animated && _layoutAnimated;
  let svg='';
  if(typeof L.variantSvg==='function'){
    svg=L.variantSvg.call(L, canvasW, canvasH, a1, a2, style||'title')||'';
  } else {
    const fn=(style==='title')?L.titleSvg:L.contentSvg;
    if(typeof fn!=='function')return '';
    svg=fn.call(L, canvasW, canvasH, a1, a2, doAnimate, !!mirror)||'';
  }
  // Make every defs id unique to avoid cross-slide collisions in the DOM.
  // Must also rewrite href="#…" / xlink:href="#…" (Forest <use> silhouettes).
  const uid='u'+(++_svgUidCounter);
  if(typeof _isolateSvgIds==='function') return _isolateSvgIds(svg, uid);
  svg=svg.replace(/\bid="([^"]+)"/g, (_,id)=>`id="${uid}_${id}"`);
  svg=svg.replace(/url\(#([^)]+)\)/g, (_,id)=>`url(#${uid}_${id})`);
  svg=svg.replace(/\bhref="#([^"]+)"/g, (_,id)=>`href="#${uid}_${id}"`);
  svg=svg.replace(/\bxlink:href="#([^"]+)"/g, (_,id)=>`xlink:href="#${uid}_${id}"`);
  return svg;
}

// Create a new decor element data object for slide index si
function makeDecorEl(si, style, mirror, layoutIdx){
  const li = layoutIdx != null ? layoutIdx : selLayout;
  if(li < 0 || li >= LAYOUTS.length) return null;
  const decorStyle = style || 'content';
  const svg = _buildDecorSvg(li, decorStyle, mirror);
  if(!svg) return null;
  const d = {
    id:'decor_'+(si||0)+'_'+Date.now(),
    type:'svg',
    x:0, y:0, w:canvasW, h:canvasH,
    rot:0, anims:[], isTrigger:false,
    svgContent:svg,
    _isDecor:true,
    _decorStyle:decorStyle,
    _decorMirror:!!mirror,
    _layoutIdx:li,
  };
  _ensureGlDecorCfg(d);
  return d;
}

/** Активный шаблон в панели «Слайд» (подсвеченная карточка), или null = пустой. */
function _getSelectedSlideTpl(){
  const meta = _currentSlideDecorMeta();
  if(!meta || meta.layoutIdx == null || meta.layoutIdx < 0) return null;
  return {
    layoutIdx: meta.layoutIdx,
    style: meta.style || 'content',
    mirror: !!meta.mirror,
  };
}
window._getSelectedSlideTpl = _getSelectedSlideTpl;

// Regenerate SVG strings for all decor elements across all slides
// Called after: theme change (new colors), AR change (new dimensions)
// skipRender=true: only update data, caller handles rendering
function refreshDecorColors(ac1, ac2, skipRender){
  // Notebook (and locked cream leftovers): keep slide bg = colour scheme
  _syncSlidesThemeBg({ force:true, onlyNotebook:true });
  // Override _decorAccents temporarily if explicit colors passed
  const _oa1=ac1||_decorAccents()[0], _oa2=ac2||_decorAccents()[1];
  const _linedIdx = LAYOUTS.findIndex(L => L && L.nameEn === 'Notebook · Lined');
  const _gridIdx = LAYOUTS.findIndex(L => L && L.nameEn === 'Notebook · Grid');
  slides.forEach(s=>{
    (s.els||[]).forEach(d=>{
      if(!d._isDecor)return;
      // Legacy: убраны «мелкая клетка» / «частая линия» как отдельные макеты
      if(d._layoutIdx == null || d._layoutIdx < 0 || d._layoutIdx >= LAYOUTS.length || !LAYOUTS[d._layoutIdx]){
        d._layoutIdx = _linedIdx >= 0 ? _linedIdx : (_gridIdx >= 0 ? _gridIdx : 0);
        if(!d._decorStyle) d._decorStyle = 'content';
      }
      const li=d._layoutIdx;
      if(li==null||li<0||li>=LAYOUTS.length)return;
      const L=LAYOUTS[li];
      const doAnim = L.animated && _layoutAnimated;
      let svg='';
      if(typeof L.variantSvg==='function'){
        svg=L.variantSvg.call(L, canvasW, canvasH, _oa1, _oa2, d._decorStyle||'title')||'';
      } else {
        const fn=(d._decorStyle==='title')?L.titleSvg:L.contentSvg;
        if(typeof fn!=='function')return;
        svg=fn.call(L, canvasW, canvasH, _oa1, _oa2, doAnim, !!d._decorMirror)||'';
      }
      const uid='u'+(++_svgUidCounter);
      if(typeof _isolateSvgIds==='function') svg=_isolateSvgIds(svg, uid);
      else {
        svg=svg.replace(/\bid="([^"]+)"/g, (_,id)=>`id="${uid}_${id}"`);
        svg=svg.replace(/url\(#([^)]+)\)/g, (_,id)=>`url(#${uid}_${id})`);
        svg=svg.replace(/\bhref="#([^"]+)"/g, (_,id)=>`href="#${uid}_${id}"`);
        svg=svg.replace(/\bxlink:href="#([^"]+)"/g, (_,id)=>`xlink:href="#${uid}_${id}"`);
      }
      d.svgContent=svg;
      d.w=canvasW;
      d.h=canvasH;
      _ensureGlDecorCfg(d, _oa1, _oa2);
      const _glU=_glDecorByRenderer(d._decorRenderer);
      if(_glU&&d._glCfg) _glU.update(d.id,d._glCfg);
    });
  });
  if(!skipRender){
    if(typeof renderAll==="function")renderAll({thumbs:'all'});
    else if(typeof refreshDecorOnCanvas==='function') refreshDecorOnCanvas();
    if(typeof saveState==='function')if(typeof saveState==="function")saveState();
  }

}

// Sync decor SVG / WebGL on the live canvas without full reload (safe for GL layers).
function refreshDecorOnCanvas(slideIdx){
  const si=slideIdx!=null?slideIdx:cur;
  const canvas=document.getElementById('canvas');
  if(!canvas||!slides[si])return;
  canvas.querySelectorAll('.el').forEach(el=>{
    const d=slides[si].els.find(x=>x.id===el.dataset.id);
    if(!d||!d._isDecor)return;
    const ec=el.querySelector('.ec');
    if(!ec)return;
    const _glR=d._decorRenderer;
    if(_isGlDecorRenderer(_glR)){
      const _glCfg=d._glCfg||d._crystalCfg;
      const _GlDecor=_glDecorByRenderer(_glR);
      if(_GlDecor&&_glCfg) _GlDecor.update(d.id, _glCfg);
      const svgEl=ec.querySelector('svg');
      if(svgEl&&d.svgContent){
        const _svgUid='svg_'+(d.id||'');
        const _svgStr=typeof _isolateSvgIds==='function'?_isolateSvgIds(d.svgContent,_svgUid):d.svgContent;
        try{
          const _dp=new DOMParser();
          const _doc=_dp.parseFromString(_svgStr,'image/svg+xml');
          const _parsed=_doc.documentElement;
          if(_parsed&&_parsed.tagName!=='parsererror'){
            const _newSvg=document.adoptNode(_parsed);
            _newSvg.style.width='100%';_newSvg.style.height='100%';
            _newSvg.style.pointerEvents='none';
            _newSvg.setAttribute('pointer-events','none');
            try{ _newSvg.querySelectorAll('*').forEach(n=>{ n.style.pointerEvents='none'; n.setAttribute('pointer-events','none'); }); }catch(e){}
            svgEl.replaceWith(_newSvg);
          }
        }catch(e){}
      }
      return;
    }
    if(d.svgContent){
      ec.innerHTML=d.svgContent;
      const _s=ec.querySelector('svg');
      if(_s){
        _s.style.pointerEvents='none';
        _s.setAttribute('pointer-events','none');
        try{ _s.querySelectorAll('*').forEach(n=>{ n.style.pointerEvents='none'; n.setAttribute('pointer-events','none'); }); }catch(e){}
      }
    }
  });
}

// Layout picker UI
function buildLayoutGrid(){
  const grid=document.getElementById('layout-grid');
  if(!grid)return;
  grid.innerHTML='';
  grid.style.display='flex';
  grid.style.flexWrap='wrap';
  grid.style.gap='14px';
  grid.style.alignContent='flex-start';
  const [a1,a2]=_decorAccents();
  const PW=320,PH=180;
  const _themeBgPreview=(_activeTheme()&&_activeTheme().bg)||'';

  // "No layout" card
  const none=document.createElement('div');
  none.className='layout-item'+(selLayout===-1?' active':'');
  none.title='Без декора';
  if(_themeBgPreview) none.style.background=_themeBgPreview;
  const noneBox=document.createElement('div');
  noneBox.className='layout-item-inner';
  const noneInner=document.createElement('div');
  noneInner.style.cssText='display:flex;align-items:center;justify-content:center;';
  noneInner.innerHTML=`<svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="opacity:.35"><line x1="8" y1="8" x2="40" y2="40" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="40" y1="8" x2="8" y2="40" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>`;
  noneBox.appendChild(noneInner);
  const noneLbl=document.createElement('div');
  noneLbl.className='li-label';
  noneLbl.textContent='Без декора';
  noneBox.appendChild(noneLbl);
  none.appendChild(noneBox);
  none.onclick=()=>{
    selLayout=-1;
    grid.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
    none.classList.add('active');
  };
  none.ondblclick=(e)=>{
    e.preventDefault();
    selLayout=-1;
    applyLayoutDecor();
  };
  grid.appendChild(none);
  LAYOUTS.forEach((L,i)=>{
    const isRu=typeof getLang==='function'&&getLang()==='ru';
    const btn=document.createElement('div');
    btn.className='layout-item'+(selLayout===i?' active':'');
    btn.title=(isRu?L.desc:L.descEn)||'';
    if(_themeBgPreview) btn.style.background=_themeBgPreview;
    const doAnim = L.animated ? _layoutAnimated : false;
    const svgStr=typeof L.titleSvg==='function'?L.titleSvg.call(L,PW,PH,a1,a2,doAnim):'';
    const lbl=document.createElement('div');
    lbl.className='li-label';
    lbl.textContent=isRu?L.name:L.nameEn;
    if(L.animated){
      const badge=document.createElement('span');
      badge.className='li-anim-badge';
      badge.textContent='✦';
      badge.title=isRu?'Поддерживает анимацию':'Supports animation';
      lbl.appendChild(badge);
    }
    const box=document.createElement('div');
    box.className='layout-item-inner';
    const prev=document.createElement('div');
    prev.innerHTML=svgStr;
    box.appendChild(prev);
    if(L.renderer&&_isGlDecorRenderer(L.renderer)){
      let cfg=null;
      if(L.renderer==='crystal'&&L.buildCrystalCfg)cfg=L.buildCrystalCfg(PW,PH,a1,a2,true,doAnim);
      else if(L.renderer==='dna'&&L.buildDnaCfg)cfg=L.buildDnaCfg(PW,PH,a1,a2,true,doAnim);
      else if(L.renderer==='galaxy'&&L.buildGalaxyCfg)cfg=L.buildGalaxyCfg(PW,PH,a1,a2,true,doAnim);
      else if(L.renderer==='caustics'&&L.buildCausticsCfg)cfg=L.buildCausticsCfg(PW,PH,a1,a2,true,doAnim);
      else if(L.renderer==='warp'&&L.buildWarpCfg)cfg=L.buildWarpCfg(PW,PH,a1,a2,true,doAnim);
      const decor=_glDecorByRenderer(L.renderer);
      if(cfg&&decor&&decor.renderStill){
        const still=decor.renderStill(cfg,PW,PH);
        if(still) box.appendChild(still);
      }
    }
    box.appendChild(lbl);
    btn.appendChild(box);
    btn.onclick=()=>{
      selLayout=i;
      grid.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      _updateAnimToggleVisibility();
    };
    btn.ondblclick=(e)=>{
      e.preventDefault();
      selLayout=i;
      applyLayoutDecor();
    };
    grid.appendChild(btn);
  });
  _updateAnimToggleVisibility();
}

function _updateAnimToggleVisibility(){
  // Toggle wrap removed from modal — handled by slide properties panel
  _syncAnimToggleBtns();
}

function _syncAnimToggleBtns(){
  const on  = document.getElementById('layout-anim-btn-on');
  const off = document.getElementById('layout-anim-btn-off');
  if(on&&off){
    if(_layoutAnimated){
      on.classList.add('pri');    off.classList.remove('pri');
      on.style.opacity='1';       off.style.opacity='0.55';
    } else {
      off.classList.add('pri');   on.classList.remove('pri');
      off.style.opacity='1';      on.style.opacity='0.55';
    }
  }
  // Синхронизируем tog-чекбокс — ставим флаг чтобы onchange не сработал
  const chk = document.getElementById('slide-layout-anim-chk');
  if(chk){ chk._syncing = true; chk.checked = _layoutAnimated; chk._syncing = false; }
}

// Показать/скрыть строку анимации в slide-props в зависимости от активного макета
function _syncSlidePropsAnimRow(){
  const row = document.getElementById('slide-layout-anim-row');
  if(!row) return;
  const hasAnim = selLayout >= 0 && selLayout < LAYOUTS.length && !!LAYOUTS[selLayout].animated;
  row.style.display = hasAnim ? '' : 'none';
  if(hasAnim) _syncAnimToggleBtns();
}

window.setLayoutAnimated = function(val){
  _layoutAnimated = val;
  _syncAnimToggleBtns();
  buildLayoutGrid();
  // Регенерируем svgContent всех декоров с правильным doAnimate
  if(typeof refreshDecorColors==='function') refreshDecorColors(null, null, true);
  if(!val){
    if(typeof CrystalDecor!=='undefined') CrystalDecor.pauseAll();
    if(typeof DnaDecor!=='undefined') DnaDecor.pauseAll();
    if(typeof GalaxyDecor!=='undefined') GalaxyDecor.pauseAll();
    if(typeof CausticsDecor!=='undefined') CausticsDecor.pauseAll();
    if(typeof SakuraDecor!=='undefined') SakuraDecor.pauseAll();
    if(typeof PrismDecor!=='undefined') PrismDecor.pauseAll();
    if(typeof DnaDecor!=='undefined') DnaDecor.pauseAll();
    if(typeof GalaxyDecor!=='undefined') GalaxyDecor.pauseAll();
    if(typeof CausticsDecor!=='undefined') CausticsDecor.pauseAll();
    if(typeof WarpDecor!=='undefined') WarpDecor.pauseAll();
    // Сохраняем currentTime каждого видимого SVG-декора по индексу слайда
    document.querySelectorAll('.decor-el svg').forEach(function(svg){
      try{
        const _si = typeof _decorSvgSlideIndex==='function' ? _decorSvgSlideIndex(svg) : -1;
        if(_si >= 0) _decorPausedAt.set(_si, svg.getCurrentTime());
        svg.pauseAnimations();
      }catch(e){}
    });
  } else {
    // Пока анимация выключена, в данные пишется статичный SVG. После смены слайда
    // на холсте нет SMIL — одного unpause недостаточно. Подтягиваем анимированный
    // контент только если в DOM нет SMIL (на том же слайде оставляем паузу/resume).
    const _domSvg = document.querySelector('.decor-el svg');
    const _hasSmil = !!( _domSvg && _domSvg.querySelector('animate,animateTransform,animateMotion') );
    if(!_hasSmil && typeof refreshDecorOnCanvas==='function') refreshDecorOnCanvas();
    if(typeof CrystalDecor!=='undefined') CrystalDecor.resumeAll();
    if(typeof DnaDecor!=='undefined') DnaDecor.resumeAll();
    if(typeof GalaxyDecor!=='undefined') GalaxyDecor.resumeAll();
    if(typeof CausticsDecor!=='undefined') CausticsDecor.resumeAll();
    if(typeof SakuraDecor!=='undefined') SakuraDecor.resumeAll();
    if(typeof PrismDecor!=='undefined') PrismDecor.resumeAll();
    if(typeof DnaDecor!=='undefined') DnaDecor.resumeAll();
    if(typeof GalaxyDecor!=='undefined') GalaxyDecor.resumeAll();
    if(typeof CausticsDecor!=='undefined') CausticsDecor.resumeAll();
    if(typeof WarpDecor!=='undefined') WarpDecor.resumeAll();
    document.querySelectorAll('.decor-el svg').forEach(function(svg){
      try{ svg.unpauseAnimations(); }catch(e){}
    });
    _decorPausedAt.clear();
  }
  if(typeof saveState==='function') saveState();
  if(typeof buildSlideTplGrid==='function') buildSlideTplGrid();
};

// Находим индекс слайда по DOM-элементу SVG
function _decorSvgSlideIndex(svgEl){
  try{
    const canvas = document.getElementById('canvas');
    if(!canvas) return -1;
    // Слайд-контейнер — ищем ближайший .slide-wrap или data-si
    let el = svgEl;
    while(el && el !== canvas){
      if(el.dataset && el.dataset.si != null) return +el.dataset.si;
      el = el.parentElement;
    }
  }catch(e){}
  return typeof cur !== 'undefined' ? cur : -1;
}

function applyLayout(idx,btn){
  selLayout=idx;
  document.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');

  const [a1,a2]=_decorAccents();
  const L=LAYOUTS[idx];

  // Фон слайдов = фон цветовой схемы (как на миниатюре схемы)
  if(L && L.paper) _syncSlidesThemeBg({ force:true });
  else if(_activeTheme()) _syncSlidesThemeBg({ force:false });

  // Apply to every slide: replace or add decor
  slides.forEach((s,si)=>{
    // Remove old decor
    s.els=s.els.filter(d=>!d._isDecor);
    // Notebook: оба размера — шаблоны; с модалки ставим крупную. Иначе title/content.
    const decorStyle=(L && L.paper) ? 'title' : (si===0?'title':'content');
    const svg=_buildDecorSvg(idx, decorStyle);
    if(!svg)return;
    const d={
      id:'decor_'+si+'_'+Date.now(),
      type:'svg',
      x:0,y:0,w:canvasW,h:canvasH,
      rot:0,anims:[],isTrigger:false,
      svgContent:svg,
      _isDecor:true,
      _decorStyle:decorStyle,
      _decorMirror:false,
      _layoutIdx:idx,
    };
    _ensureGlDecorCfg(d, a1, a2);
    _ensureGlDecorCfg(d, a1, a2);
    s.els.unshift(d);
  });

  if(typeof renderAll==="function")renderAll({thumbs:'all'});
  if(typeof saveState==="function")saveState();
  _syncSlidePropsAnimRow();
  if(typeof buildSlideTplGrid==='function') buildSlideTplGrid();
}

function clearLayout(){
  selLayout=-1;
  document.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
  slides.forEach(s=>{s.els=s.els.filter(d=>!d._isDecor);});
  _syncSlidePropsAnimRow();
  if(typeof renderAll==="function")renderAll({thumbs:'all'});
  if(typeof saveState==="function")saveState();
  if(typeof buildSlideTplGrid==='function') buildSlideTplGrid();
}

function openLayoutModal(){
  buildLayoutGrid();
  _updateAnimToggleVisibility();
  document.getElementById('layout-modal').classList.add('open');
}
function closeLayoutModal(){
  document.getElementById('layout-modal').classList.remove('open');
}
function applyLayoutDecor(){
  if(selLayout<0){clearLayout();closeLayoutModal();return;}
  applyLayout(selLayout,null);
  closeLayoutModal();
}

/** Index of Prism layout in LAYOUTS (by nameEn). */
function _prismLayoutIdx(){
  const i = LAYOUTS.findIndex(L => L && L.nameEn === 'Prism');
  return i >= 0 ? i : 0;
}

/** Current slide decor meta for template highlight. */
function _currentSlideDecorMeta(){
  const s = (typeof slides !== 'undefined' && slides[cur]) ? slides[cur] : null;
  if(!s || !s.els) return null;
  const d = s.els.find(e => e && e._isDecor);
  if(!d) return null;
  return {
    layoutIdx: d._layoutIdx,
    style: d._decorStyle || 'content',
    mirror: !!d._decorMirror,
  };
}

/** Layout shown in slide-props templates: slide decor → selLayout → Prism. */
function _slideTplLayoutIdx(){
  const meta = _currentSlideDecorMeta();
  if(meta && meta.layoutIdx != null && meta.layoutIdx >= 0 && meta.layoutIdx < LAYOUTS.length) return meta.layoutIdx;
  if(typeof selLayout === 'number' && selLayout >= 0 && selLayout < LAYOUTS.length) return selLayout;
  return _prismLayoutIdx();
}

/** Apply layout template to the current slide only. */
window.applySlidePrismTemplate = function(style, mirror){
  if(typeof slides === 'undefined' || !slides[cur]) return;
  const idx = _slideTplLayoutIdx();
  const L = LAYOUTS[idx];
  if(!L) return;
  if(typeof pushUndo === 'function') pushUndo();

  selLayout = idx;

  const decorStyle = style || 'content';
  const useMirror = L.nameEn === 'Prism' && !!mirror;
  const svg = _buildDecorSvg(idx, decorStyle, useMirror);
  if(!svg) return;

  const s = slides[cur];
  s.els = (s.els || []).filter(d => !d._isDecor);
  const d = {
    id: 'decor_' + cur + '_' + Date.now(),
    type: 'svg',
    x: 0, y: 0, w: canvasW, h: canvasH,
    rot: 0, anims: [], isTrigger: false,
    svgContent: svg,
    _isDecor: true,
    _decorStyle: decorStyle,
    _decorMirror: useMirror,
    _layoutIdx: idx,
  };
  _ensureGlDecorCfg(d);
  s.els.unshift(d);

  if(typeof renderAll === 'function') renderAll({ thumbIdx: cur });
  else if(typeof load === 'function') load();
  if(typeof saveState === 'function') saveState();
  _syncSlidePropsAnimRow();
  buildSlideTplGrid();
};
window.applySlideTemplate = window.applySlidePrismTemplate;

/** Clear decor on the current slide only. */
window.clearSlidePrismTemplate = function(){
  if(typeof slides === 'undefined' || !slides[cur]) return;
  const s = slides[cur];
  if(!(s.els || []).some(d => d && d._isDecor)) return;
  if(typeof pushUndo === 'function') pushUndo();
  s.els = (s.els || []).filter(d => !d._isDecor);
  if(typeof renderAll === 'function') renderAll({ thumbIdx: cur });
  else if(typeof load === 'function') load();
  if(typeof saveState === 'function') saveState();
  buildSlideTplGrid();
};

/** Фон для миниатюр шаблонов: как у текущего слайда, иначе тема. */
function _slideTplPreviewBg(){
  try{
    const s = (typeof slides !== 'undefined' && slides[cur]) ? slides[cur] : null;
    if(s){
      if(s.bgScheme != null && typeof _resolveSchemeColor === 'function'){
        const th = _activeTheme();
        const resolved = _resolveSchemeColor(s.bgScheme, th);
        if(resolved) return resolved;
      }
      if(s.bgc) return s.bgc;
    }
  }catch(e){}
  const theme = _activeTheme();
  return (theme && theme.bg) || '';
}

/** Live template cards in slide properties (empty + layout variants). */
function buildSlideTplGrid(){
  const grid = document.getElementById('slide-tpl-grid');
  if(!grid) return;
  grid.innerHTML = '';

  const [a1, a2] = _decorAccents();
  const PW = 160, PH = 90;
  const themeBg = _slideTplPreviewBg();
  const isRu = typeof getLang === 'function' && getLang() === 'ru';
  const meta = _currentSlideDecorMeta();
  const noDecor = !meta;

  // Пустой шаблон — миниатюра с крестиком (для любой темы/макета)
  const noneBtn = document.createElement('button');
  noneBtn.type = 'button';
  noneBtn.className = 'slide-tpl-item' + (noDecor ? ' active' : '');
  noneBtn.title = isRu ? 'Пустой шаблон' : 'Empty template';
  if(themeBg) noneBtn.style.background = themeBg;
  const noneInner = document.createElement('div');
  noneInner.className = 'slide-tpl-inner';
  noneInner.style.cssText = 'display:flex;align-items:center;justify-content:center;';
  noneInner.innerHTML = '<svg width="36" height="36" viewBox="0 0 48 48" fill="none" style="opacity:.4;position:relative;inset:auto;width:36px;height:36px"><line x1="8" y1="8" x2="40" y2="40" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="40" y1="8" x2="8" y2="40" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>';
  noneBtn.appendChild(noneInner);
  noneBtn.onclick = () => {
    if(typeof clearSlidePrismTemplate === 'function') clearSlidePrismTemplate();
  };
  grid.appendChild(noneBtn);

  const idx = _slideTplLayoutIdx();
  const L = LAYOUTS[idx];
  const layoutName = (L && (isRu ? (L.name || L.nameEn) : (L.nameEn || L.name))) || '';
  const nameEl = document.getElementById('slide-tpl-layout-name');
  if(nameEl) nameEl.textContent = layoutName ? (' · ' + layoutName) : '';
  if(!L || typeof L.titleSvg !== 'function') return;

  const doAnim = !!(L.animated && _layoutAnimated);
  const layoutActive = meta && meta.layoutIdx === idx;
  const supportsMirror = L.nameEn === 'Prism';
  const isPaper = !!L.paper;

  // Notebook grid: крупная/мелкая + 4 варианта осей; линия: крупная/мелкая; иначе главный/побочный
  let variants;
  if(isPaper && L.paper && L.paper.kind === 'grid'){
    variants = [
      { style: 'title',        mirror: false, tip: isRu ? 'Крупная' : 'Large' },
      { style: 'content',      mirror: false, tip: isRu ? 'Мелкая' : 'Fine' },
      { style: 'axes-center',  mirror: false, tip: isRu ? 'Оси · центр' : 'Axes · center' },
      { style: 'axes-q1',      mirror: false, tip: isRu ? 'Оси · I четверть' : 'Axes · Q1' },
      { style: 'axes-q1inv',   mirror: false, tip: isRu ? 'Оси · I четверть ↓' : 'Axes · Q1 ↓' },
      { style: 'axes-q1right', mirror: false, tip: isRu ? 'Оси · правая половина' : 'Axes · right half' },
    ];
  } else if(isPaper){
    variants = [
      { style: 'title',   mirror: false, tip: isRu ? 'Крупная' : 'Large' },
      { style: 'content', mirror: false, tip: isRu ? 'Мелкая' : 'Fine' },
    ];
  } else if(L.nameEn === 'Storm'){
    variants = [
      { style: 'title',   mirror: false, tip: isRu ? 'Гроза' : 'Storm' },
      { style: 'content', mirror: false, tip: isRu ? 'Гроза · тише' : 'Storm · soft' },
      { style: 'rain',    mirror: false, tip: isRu ? 'Дождь' : 'Rain' },
    ];
  } else if(L.nameEn === 'Layers'){
    variants = [
      { style: 'title',   mirror: false, tip: isRu ? 'Сверху' : 'Top' },
      { style: 'bottom',  mirror: false, tip: isRu ? 'Снизу' : 'Bottom' },
      { style: 'content', mirror: false, tip: isRu ? 'Сверху и снизу' : 'Top & bottom' },
      { style: 'sides',   mirror: false, tip: isRu ? 'По бокам' : 'Sides' },
    ];
  } else if(L.nameEn === 'Circuit'){
    variants = [
      { style: 'title',    mirror: false, tip: isRu ? 'Главный · крупная схема' : 'Title · large circuit' },
      { style: 'content',  mirror: false, tip: isRu ? 'Побочный · углы' : 'Content · corners' },
      { style: 'diag-alt', mirror: false, tip: isRu ? '↙ Левый низ + правый верх' : 'Bottom-left + top-right' },
      { style: 'single',   mirror: false, tip: isRu ? 'Только правый низ' : 'Bottom-right only' },
    ];
  } else if(L.nameEn === 'Swamp'){
    variants = [
      { style: 'title',   mirror: false, tip: isRu ? 'С кувшинкой' : 'With lily pad' },
      { style: 'content', mirror: false, tip: isRu ? 'Два листа · ряска' : 'Two pads · duckweed' },
      { style: 'arc',     mirror: false, tip: isRu ? 'Два листа · по дуге' : 'Two pads · arc' },
    ];
  } else if(L.nameEn === 'Tile'){
    variants = [
      { style: 'frame',  mirror: false, tip: isRu ? 'Рамка · главный' : 'Frame · title' },
      { style: 'bands',  mirror: false, tip: isRu ? 'Две полосы · побочный' : 'Two bands · content' },
      { style: 'full',   mirror: false, tip: isRu ? 'Полная сетка' : 'Full grid' },
      { style: 'split',  mirror: false, tip: isRu ? 'Две панели' : 'Two panels' },
      { style: 'mosaic', mirror: false, tip: isRu ? 'Мозаика' : 'Mosaic' },
    ];
  } else {
    variants = [
      { style: 'title',   mirror: false, tip: isRu ? 'Главный' : 'Title' },
      { style: 'content', mirror: false, tip: isRu ? 'Побочный' : 'Content' },
    ];
    if(supportsMirror){
      variants.push(
        { style: 'title',   mirror: true, tip: isRu ? 'Главный, другая диагональ' : 'Title, other diagonal' },
        { style: 'content', mirror: true, tip: isRu ? 'Побочный, другая диагональ' : 'Content, other diagonal' }
      );
    }
  }

  variants.forEach(v => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive = layoutActive && meta.style === v.style && !!meta.mirror === !!v.mirror;
    btn.className = 'slide-tpl-item' + (isActive ? ' active' : '');
    btn.title = layoutName + ' — ' + v.tip;
    if(themeBg) btn.style.background = themeBg;

    const inner = document.createElement('div');
    inner.className = 'slide-tpl-inner';
    if(v.style === 'void' && typeof WarpDecor !== 'undefined'){
      const voidL = LAYOUTS.find(e => e && e.nameEn === 'Cosmos · Void');
      if(voidL && typeof voidL.buildWarpCfg === 'function'){
        const still = WarpDecor.renderStill(voidL.buildWarpCfg(PW, PH, a1, a2, true, false), PW, PH);
        if(still) inner.appendChild(still);
      }
    } else {
      let svgStr = '';
      if(typeof L.variantSvg === 'function'){
        svgStr = L.variantSvg.call(L, PW, PH, a1, a2, v.style, false) || '';
      } else {
        const fn = v.style === 'title' ? L.titleSvg : L.contentSvg;
        svgStr = fn.call(L, PW, PH, a1, a2, false, !!v.mirror) || '';
      }
      const prev = document.createElement('div');
      prev.innerHTML = svgStr;
      inner.appendChild(prev);

      if(L.renderer && typeof _isGlDecorRenderer === 'function' && _isGlDecorRenderer(L.renderer)){
        let cfg = null;
        const isTitle = v.style === 'title';
        if(L.renderer === 'crystal' && L.buildCrystalCfg) cfg = L.buildCrystalCfg(PW, PH, a1, a2, isTitle, doAnim);
        else if(L.renderer === 'dna' && L.buildDnaCfg) cfg = L.buildDnaCfg(PW, PH, a1, a2, isTitle, doAnim);
        else if(L.renderer === 'galaxy' && L.buildGalaxyCfg) cfg = L.buildGalaxyCfg(PW, PH, a1, a2, isTitle, doAnim);
        else if(L.renderer === 'caustics' && L.buildCausticsCfg) cfg = L.buildCausticsCfg(PW, PH, a1, a2, isTitle, doAnim);
        const decor = typeof _glDecorByRenderer === 'function' ? _glDecorByRenderer(L.renderer) : null;
        if(cfg && decor && decor.renderStill){
          const still = decor.renderStill(cfg, PW, PH);
          if(still) inner.appendChild(still);
        }
      }
    }

    btn.appendChild(inner);
    btn.onclick = () => applySlidePrismTemplate(v.style, v.mirror);
    grid.appendChild(btn);
  });
}
window.buildSlideTplGrid = buildSlideTplGrid;

// NOTE: new animated layouts appended below — inserted before closing ];

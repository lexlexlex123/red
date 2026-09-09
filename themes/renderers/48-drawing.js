// ══════════════ DRAWING / INK ══════════════
// Handwritten annotations on slides: brush, neon, marker, eraser, selection.
(function(){
  const PEN_SIZES = [0.5, 1.5, 3, 6, 10, 14, 20, 28, 36];
  const ERASER_SIZES = [6, 10, 14, 20, 28, 36, 48, 64];
  const MARKER_SIZES = [6, 10, 14, 20, 28, 36, 48];
  const LS_KEY = 'sf_draw_prefs';
  const LS_INK_CLIP = 'sf_ink_clip';

  let _tool = 'cursor'; // cursor | brush | neon | marker | fill | eraser
  let _color = '#64748b';
  let _colorScheme = (typeof DEFAULT_LINE_COLOR_SCHEME!=='undefined')
    ? {col:DEFAULT_LINE_COLOR_SCHEME.col, row:DEFAULT_LINE_COLOR_SCHEME.row}
    : {col:0, row:4}; // palette "15"
  let _penSizeIdx = 2;
  let _markerSizeIdx = 3;
  let _lastPtrClientX = null;
  let _lastPtrClientY = null;
  let _eraserSizeIdx = 3;
  let _smooth = 40; // 0..200
  let _opacity = 100; // brush 0..100
  let _neonBright = 75; // neon glow/core intensity 0..100
  let _markerOpacity = 40; // highlighter default
  let _pressure = false;
  let _taper = 'both'; // both | out | in — brush profile
  let _fillPattern = 'solid'; // solid | fadeOut | fadeIn | lines | hatch | dots
  let _fillOpacity = 55;
  let _fillGap = 10; // px gap tolerance: 0,10,20,30,50
  let _fillEc = 0;
  let _drawing = false;
  let _stroke = null; // active stroke {tool,color,width,opacity,pressure,points:[{x,y,p,t}]}
  let _ptrId = null;
  let _inkEc = 0;
  let _selInkIds = new Set();
  let _inkGroupEc = 0;
  let _inkRubber = null; // {x0,y0,x1,y1, additive}
  let _inkDrag = null;   // {ox,oy, snapshots:[{id,points}]}
  let _drawTabOpen = false;
  let _inkClipboard = null;
  let _cursorPt = null;

  function _prefs(){
    return {
      color:_color, colorScheme:_colorScheme,
      penSizeIdx:_penSizeIdx, markerSizeIdx:_markerSizeIdx, eraserSizeIdx:_eraserSizeIdx,
      smooth:_smooth, opacity:_opacity, neonBright:_neonBright, markerOpacity:_markerOpacity, pressure:_pressure?1:0,
      taper:_taper, fillPattern:_fillPattern, fillOpacity:_fillOpacity, fillGap:_fillGap
    };
  }
  function _savePrefs(){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(_prefs())); }catch(e){}
  }
  function _loadPrefs(){
    try{
      const raw=localStorage.getItem(LS_KEY);
      if(!raw) return;
      const p=JSON.parse(raw);
      if(p.color) _color=p.color;
      if('colorScheme' in p) _colorScheme=p.colorScheme||null;
      else if(p.color) _colorScheme=null;
      if(p.penSizeIdx!=null) _penSizeIdx=Math.max(0,Math.min(PEN_SIZES.length-1,+p.penSizeIdx));
      if(p.markerSizeIdx!=null) _markerSizeIdx=Math.max(0,Math.min(MARKER_SIZES.length-1,+p.markerSizeIdx));
      if(p.eraserSizeIdx!=null) _eraserSizeIdx=Math.max(0,Math.min(ERASER_SIZES.length-1,+p.eraserSizeIdx));
      if(p.smooth!=null) _smooth=Math.max(0,Math.min(200,+p.smooth));
      if(p.opacity!=null) _opacity=Math.max(0,Math.min(100,+p.opacity));
      if(p.neonBright!=null) _neonBright=Math.max(0,Math.min(100,+p.neonBright));
      if(p.markerOpacity!=null) _markerOpacity=Math.max(5,Math.min(100,+p.markerOpacity));
      if(p.pressure!=null) _pressure=!!+p.pressure;
      if(p.taper==='out'||p.taper==='in'||p.taper==='both') _taper=p.taper;
      if(p.fillPattern==='solid'||p.fillPattern==='fadeOut'||p.fillPattern==='fadeIn'||p.fillPattern==='lines'||p.fillPattern==='hatch'||p.fillPattern==='dots') _fillPattern=p.fillPattern;
      if(p.fillOpacity!=null) _fillOpacity=Math.max(5,Math.min(100,+p.fillOpacity));
      if(p.fillGap!=null){
        const g=+p.fillGap;
        if([0,10,20,30,50].indexOf(g)>=0) _fillGap=g;
      }
    }catch(e){}
  }

  /** Resolve pinned palette color (default "15") against the active theme. */
  function _resolveBrushColorFromScheme(){
    if(!_colorScheme) return;
    const th=typeof _activeThemeForScheme==='function'?_activeThemeForScheme():null;
    if(th&&typeof _schemeSwatchColor==='function'){
      const c=_schemeSwatchColor(th, _colorScheme.col, _colorScheme.row);
      if(c){ _color=c; return; }
    }
    if(typeof _defaultLineColor==='function'){
      const d=_defaultLineColor();
      if(d&&d.color) _color=d.color;
    }
  }

  function _pinDefaultBrushScheme(){
    _colorScheme=(typeof DEFAULT_LINE_COLOR_SCHEME!=='undefined')
      ?{col:DEFAULT_LINE_COLOR_SCHEME.col, row:DEFAULT_LINE_COLOR_SCHEME.row}
      :{col:0, row:4};
    _resolveBrushColorFromScheme();
  }

  function _inkArr(){
    if(typeof slides==='undefined'||typeof cur==='undefined'||!slides[cur]) return null;
    if(!slides[cur].ink) slides[cur].ink=[];
    return slides[cur].ink;
  }

  function _fillsArr(){
    if(typeof slides==='undefined'||typeof cur==='undefined'||!slides[cur]) return null;
    if(!slides[cur].inkFills) slides[cur].inkFills=[];
    return slides[cur].inkFills;
  }

  /** Back-to-front stack of strokes + fills (shared z). */
  function _ensureInkZOrders(){
    const ink=_inkArr()||[];
    const fills=_fillsArr()||[];
    let need=false;
    for(let i=0;i<fills.length;i++){ if(fills[i]&&fills[i].z==null){ need=true; break; } }
    if(!need) for(let i=0;i<ink.length;i++){ if(ink[i]&&ink[i].z==null){ need=true; break; } }
    if(!need) return;
    // Legacy paint order: all fills under all strokes
    let z=0;
    fills.forEach(f=>{ if(f) f.z=z++; });
    ink.forEach(s=>{ if(s) s.z=z++; });
  }

  function _nextInkZ(){
    _ensureInkZOrders();
    let max=-1;
    (_inkArr()||[]).forEach(s=>{ if(s&&s.z!=null&&s.z>max) max=s.z; });
    (_fillsArr()||[]).forEach(f=>{ if(f&&f.z!=null&&f.z>max) max=f.z; });
    return max+1;
  }

  function _inkStackSorted(strokes, fills){
    _ensureInkZOrders();
    const stack=[];
    (fills||_fillsArr()||[]).forEach(f=>{ if(f) stack.push({kind:'fill', item:f}); });
    (strokes||_inkArr()||[]).forEach(s=>{ if(s) stack.push({kind:'stroke', item:s}); });
    stack.sort((a,b)=>{
      const za=a.item.z!=null?+a.item.z:0;
      const zb=b.item.z!=null?+b.item.z:0;
      if(za!==zb) return za-zb;
      if(a.kind!==b.kind) return a.kind==='fill'?-1:1;
      return 0;
    });
    return stack;
  }

  function _reorderInkStack(stack, ids, dir){
    if(!stack||!stack.length||!ids||!ids.size) return false;
    if(dir==='front'||dir==='back'){
      const sel=[], rest=[];
      stack.forEach(x=>{ if(x&&x.item&&ids.has(x.item.id)) sel.push(x); else rest.push(x); });
      if(!sel.length) return false;
      const next=dir==='back'?sel.concat(rest):rest.concat(sel);
      stack.length=0;
      next.forEach(x=>stack.push(x));
      return true;
    }
    let changed=false;
    if(dir==='up'){
      for(let i=stack.length-2;i>=0;i--){
        if(stack[i]&&stack[i].item&&ids.has(stack[i].item.id)
          &&stack[i+1]&&stack[i+1].item&&!ids.has(stack[i+1].item.id)){
          const t=stack[i]; stack[i]=stack[i+1]; stack[i+1]=t; changed=true;
        }
      }
    } else if(dir==='down'){
      for(let i=1;i<stack.length;i++){
        if(stack[i]&&stack[i].item&&ids.has(stack[i].item.id)
          &&stack[i-1]&&stack[i-1].item&&!ids.has(stack[i-1].item.id)){
          const t=stack[i]; stack[i]=stack[i-1]; stack[i-1]=t; changed=true;
        }
      }
    }
    return changed;
  }

  function _hostMaxZ(hostEl){
    if(!hostEl||typeof slides==='undefined'||!slides[cur]) return 0;
    const host=(slides[cur].els||[]).find(d=>d&&d.id===hostEl.dataset.id);
    if(!host) return 0;
    const ids=new Set(host.inkIds||[]);
    if(host.groupId){
      (_inkArr()||[]).forEach(s=>{ if(s&&s.groupId===host.groupId&&s.id) ids.add(s.id); });
      (_fillsArr()||[]).forEach(f=>{ if(f&&f.groupId===host.groupId&&f.id) ids.add(f.id); });
    }
    let max=-1;
    (_inkArr()||[]).forEach(s=>{ if(s&&ids.has(s.id)&&s.z!=null&&s.z>max) max=s.z; });
    (_fillsArr()||[]).forEach(f=>{ if(f&&ids.has(f.id)&&f.z!=null&&f.z>max) max=f.z; });
    return max;
  }

  function _swapDomNodes(a, b){
    if(!a||!b||a===b||!a.parentNode||!b.parentNode) return;
    const aNext=a.nextSibling, bNext=b.nextSibling;
    const aPar=a.parentNode, bPar=b.parentNode;
    if(aNext===b) aPar.insertBefore(b, a);
    else if(bNext===a) bPar.insertBefore(a, b);
    else {
      aPar.insertBefore(b, aNext);
      bPar.insertBefore(a, bNext);
    }
  }

  /** Keep inkhost DOM order in sync with ink z (fill can sit above brush and vice versa). */
  function _syncInkHostDomByZ(){
    const cv=document.getElementById('canvas');
    if(!cv) return false;
    _ensureInkZOrders();
    let changed=false;
    for(let pass=0; pass<100; pass++){
      const list=Array.from(cv.querySelectorAll(':scope > .el[data-type="inkhost"]'));
      let swapped=false;
      for(let i=0;i<list.length-1;i++){
        const a=list[i], b=list[i+1];
        if(_hostMaxZ(a)<=_hostMaxZ(b)) continue;
        _swapDomNodes(a, b);
        swapped=true; changed=true;
        break;
      }
      if(!swapped) break;
    }
    return changed;
  }

  /** Keep id counters above any existing ink/fill ids (avoids duplicates after reload). */
  function _syncInkIdCounters(){
    let maxInk=_inkEc, maxFill=_fillEc, maxGrp=_inkGroupEc;
    if(typeof slides==='undefined'||!Array.isArray(slides)){
      _inkEc=maxInk; _fillEc=maxFill; _inkGroupEc=maxGrp;
      return;
    }
    slides.forEach(s=>{
      (s&&s.ink||[]).forEach(st=>{
        if(!st||!st.id) return;
        const m=/^ink(\d+)$/.exec(String(st.id));
        if(m) maxInk=Math.max(maxInk, +m[1]);
        if(st.groupId){
          const g=/^ig(\d+)/.exec(String(st.groupId));
          if(g) maxGrp=Math.max(maxGrp, +g[1]);
        }
      });
      (s&&s.inkFills||[]).forEach(f=>{
        if(!f||!f.id) return;
        const m=/^fill(\d+)$/.exec(String(f.id));
        if(m) maxFill=Math.max(maxFill, +m[1]);
      });
    });
    _inkEc=maxInk;
    _fillEc=maxFill;
    _inkGroupEc=maxGrp;
  }

  /** If two fills share an id, moving one would move both — reassign. */
  function _repairDuplicateInkIds(){
    if(typeof slides==='undefined'||!Array.isArray(slides)) return;
    _syncInkIdCounters();
    slides.forEach(s=>{
      if(!s) return;
      const seenInk=new Set();
      (s.ink||[]).forEach(st=>{
        if(!st) return;
        if(!st.id||seenInk.has(st.id)){
          st.id='ink'+(++_inkEc);
        }
        seenInk.add(st.id);
      });
      const seenFill=new Set();
      (s.inkFills||[]).forEach(f=>{
        if(!f) return;
        if(!f.id||seenFill.has(f.id)){
          f.id='fill'+(++_fillEc);
        }
        seenFill.add(f.id);
      });
    });
  }

  function _canvasEl(){ return document.getElementById('ink-svg'); }
  function _layerEl(){ return document.getElementById('ink-layer'); }
  function _committedEl(){ return document.getElementById('ink-committed'); }
  function _liveEl(){ return document.getElementById('ink-live'); }

  function _ensureSvgSize(){
    const svg=_canvasEl();
    if(!svg) return null;
    const W=typeof canvasW!=='undefined'?canvasW:1200;
    const H=typeof canvasH!=='undefined'?canvasH:675;
    if(+svg.getAttribute('width')!==W||+svg.getAttribute('height')!==H){
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      svg.setAttribute('viewBox', '0 0 '+W+' '+H);
    }
    _ensureLiveCanvas();
    _ensureFillLayer();
    _defsEl();
    return svg;
  }

  /** Extra slide units around the slide so live ink can paint past the edge. */
  function _liveCanvasPad(stroke){
    const W=typeof canvasW!=='undefined'?canvasW:1200;
    const H=typeof canvasH!=='undefined'?canvasH:675;
    let pad=Math.max(120, Math.ceil(Math.max(W,H)*0.25));
    const pts=stroke&&stroke.points;
    if(pts&&pts.length){
      let minX=pts[0].x, minY=pts[0].y, maxX=pts[0].x, maxY=pts[0].y;
      for(let i=1;i<pts.length;i++){
        const p=pts[i];
        if(p.x<minX) minX=p.x; if(p.y<minY) minY=p.y;
        if(p.x>maxX) maxX=p.x; if(p.y>maxY) maxY=p.y;
      }
      const w=+stroke.width||6;
      const glowExtra=stroke.tool==='neon'?_neonGlowExtent(w, _neonBrightPct(stroke)):0;
      const sw=Math.max(8, w*2)+glowExtra;
      pad=Math.max(pad, Math.ceil(-minX+sw), Math.ceil(-minY+sw),
        Math.ceil(maxX-W+sw), Math.ceil(maxY-H+sw));
    }
    return Math.min(pad, Math.max(W,H)*2);
  }

  /** Live stroke paints here (bitmap) — keeps long lines smooth without SVG DOM thrash. */
  function _ensureLiveCanvas(stroke){
    const layer=_layerEl();
    if(!layer) return null;
    let c=document.getElementById('ink-live-canvas');
    if(!c){
      c=document.createElement('canvas');
      c.id='ink-live-canvas';
      c.setAttribute('aria-hidden','true');
      layer.appendChild(c);
    }
    const W=typeof canvasW!=='undefined'?canvasW:1200;
    const H=typeof canvasH!=='undefined'?canvasH:675;
    const pad=_liveCanvasPad(stroke);
    const prevPad=+c.dataset.pad||0;
    const usePad=Math.max(pad, prevPad);
    const dpr=Math.min(2, window.devicePixelRatio||1);
    const cssW=W+usePad*2, cssH=H+usePad*2;
    const bw=Math.max(1, Math.round(cssW*dpr));
    const bh=Math.max(1, Math.round(cssH*dpr));
    if(c.width!==bw||c.height!==bh||prevPad!==usePad){
      c.width=bw;
      c.height=bh;
      c.dataset.pad=String(usePad);
      c.style.cssText='position:absolute;left:'+(-usePad)+'px;top:'+(-usePad)+'px;width:'+cssW+'px;height:'+cssH+'px;pointer-events:none;z-index:1;';
    }
    return c;
  }

  function _clearLiveCanvas(){
    const c=document.getElementById('ink-live-canvas');
    if(!c) return;
    const ctx=c.getContext('2d');
    if(!ctx) return;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,c.width,c.height);
    c.dataset.pad='0';
  }

  function _paintLiveStroke(stroke){
    const c=_ensureLiveCanvas(stroke);
    if(!c||!stroke){ _clearLiveCanvas(); return; }
    const W=typeof canvasW!=='undefined'?canvasW:1200;
    const H=typeof canvasH!=='undefined'?canvasH:675;
    const pad=+c.dataset.pad||0;
    const ctx=c.getContext('2d');
    if(!ctx) return;
    const dpr=c.width/Math.max(1,W+pad*2);
    ctx.setTransform(dpr,0,0,dpr,pad*dpr,pad*dpr);
    ctx.clearRect(-pad,-pad,W+pad*2,H+pad*2);
    const color=stroke.color||'#1e293b';
    const op=stroke.opacity!=null?Math.max(0,Math.min(1,+stroke.opacity)):1;
    if(_isBrushFamily(stroke.tool)){
      const stamps=_brushStamps(stroke,1,1);
      if(stroke.tool==='neon') _paintNeonStamps(ctx, stamps, color, stroke, op);
      else {
        ctx.globalAlpha=op;
        ctx.fillStyle=color;
        _fillBrushStamps(ctx, stamps);
      }
      return;
    }
    ctx.globalAlpha=op;
    const geom=_hardStrokeGeom(
      stroke.tool==='marker'?Object.assign({},stroke,{pressure:false}):stroke,
      1, 1
    );
    if(!geom) return;
    if(geom.circle){
      ctx.fillStyle=color;
      ctx.beginPath();
      ctx.arc(geom.circle.cx, geom.circle.cy, Math.max(0.04, geom.circle.r), 0, Math.PI*2);
      ctx.fill();
      return;
    }
    const amt=(stroke.smooth!=null?+stroke.smooth:_smooth)/100;
    const pts=_smoothPoints(stroke.points, amt);
    if(!pts.length) return;
    ctx.strokeStyle=color;
    ctx.lineWidth=Math.max(0.15, geom.width||(+stroke.width||6));
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function _isBrushFamily(tool){ return tool==='brush'||tool==='neon'; }
  function _isDrawTool(){ return _isBrushFamily(_tool)||_tool==='marker'||_tool==='fill'||_tool==='eraser'; }
  function _isPenTool(){ return _isBrushFamily(_tool)||_tool==='marker'; }

  /** Soft glow extent grows with stroke thickness + brightness. */
  function _neonBrightPct(stroke){
    const v=stroke&&stroke.neonBright!=null?+stroke.neonBright:_neonBright;
    return Math.max(0, Math.min(100, v));
  }
  function _neonLook(stroke){
    const w=Math.max(0.5, +(stroke&&stroke.width)||4);
    const bp=_neonBrightPct(stroke)/100;
    const blur=Math.max(1.6, w*(0.75+bp*1.15));
    return {
      brightPct:_neonBrightPct(stroke),
      blur:blur,
      outerScale:1.75+bp*0.85+Math.min(0.7, w*0.04),
      midScale:1.22+bp*0.32,
      coreScale:0.46,
      hotScale:0.22,
      outerOp:0.28+bp*0.5,
      midOp:0.4+bp*0.45,
      bodyOp:0.98,
      coreOp:1,
      hotOp:0.2+bp*0.65
    };
  }
  function _neonGlowExtent(width, brightPct){
    const look=_neonLook({width:width, neonBright:brightPct});
    return Math.ceil(look.blur*2.6+Math.max(0.5,+width||4)*look.outerScale*0.55);
  }
  /** Mix color toward white for the bright neon core. */
  function _neonBrighten(hex, brightPct){
    let h=(hex||'#38bdf8').toString().trim();
    if(h[0]==='#') h=h.slice(1);
    if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    if(!/^[0-9a-fA-F]{6}$/.test(h)) return '#e0f2fe';
    const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
    const t=0.35+(_neonBrightPct({neonBright:brightPct})/100)*0.6;
    const rr=Math.round(r+(255-r)*t);
    const gg=Math.round(g+(255-g)*t);
    const bb=Math.round(b+(255-b)*t);
    return '#'+[rr,gg,bb].map(n=>n.toString(16).padStart(2,'0')).join('');
  }
  function _fillBrushStamps(ctx, stamps){
    for(let i=0;i<stamps.length;i++){
      const s=stamps[i];
      if(s.kind==='circle'){
        ctx.beginPath();
        ctx.arc(s.cx, s.cy, Math.max(0.04, s.r), 0, Math.PI*2);
        ctx.fill();
      } else if(s.c&&s.c.length){
        ctx.beginPath();
        ctx.moveTo(s.c[0][0], s.c[0][1]);
        for(let k=1;k<s.c.length;k++) ctx.lineTo(s.c[k][0], s.c[k][1]);
        ctx.closePath();
        ctx.fill();
      } else if(s.kind==='quad'&&s.d){
        try{ ctx.fill(new Path2D(s.d)); }catch(e){}
      }
    }
  }
  function _pathCircleStamps(ctx, stamps, scale){
    const sc=Math.max(0.05, +scale||1);
    for(let i=0;i<stamps.length;i++){
      const s=stamps[i];
      if(s.kind!=='circle') continue;
      const r=Math.max(0.04, s.r*sc);
      ctx.moveTo(s.cx+r, s.cy);
      ctx.arc(s.cx, s.cy, r, 0, Math.PI*2);
    }
  }
  /**
   * Neon paint — shared by live canvas, thumbs, and committed raster.
   * Soft glow via one canvas blur per layer (not per-stamp SVG filters).
   */
  function _paintNeonStamps(ctx, stamps, color, stroke, op){
    if(!stamps||!stamps.length) return;
    const look=_neonLook(stroke||{});
    const bright=_neonBrighten(color, look.brightPct);
    const supportsFilter=typeof ctx.filter==='string';
    ctx.save();
    ctx.fillStyle=color;

    // Soft outer halo
    ctx.globalAlpha=Math.max(0.08, op*look.outerOp);
    if(supportsFilter) ctx.filter='blur('+look.blur+'px)';
    ctx.beginPath();
    _pathCircleStamps(ctx, stamps, look.outerScale);
    ctx.fill();

    // Mid glow
    ctx.globalAlpha=Math.max(0.1, op*look.midOp);
    if(supportsFilter) ctx.filter='blur('+(look.blur*0.55)+'px)';
    ctx.beginPath();
    _pathCircleStamps(ctx, stamps, look.midScale);
    ctx.fill();

    if(supportsFilter) ctx.filter='none';

    // Dense body (quads + circles) — same smoothness as brush
    ctx.globalAlpha=Math.max(0.35, op*look.bodyOp);
    ctx.fillStyle=color;
    _fillBrushStamps(ctx, stamps);

    // Hot core strip
    ctx.globalAlpha=Math.max(0.4, op*look.coreOp);
    ctx.fillStyle=bright;
    ctx.beginPath();
    _pathCircleStamps(ctx, stamps, look.coreScale);
    ctx.fill();

    // White-hot center (brightness control)
    if(look.hotOp>0.05){
      ctx.globalAlpha=Math.max(0.05, op*look.hotOp);
      ctx.fillStyle='#ffffff';
      ctx.beginPath();
      _pathCircleStamps(ctx, stamps, look.hotScale);
      ctx.fill();
    }
    ctx.restore();
  }

  const _neonRasterCache=new Map(); // id -> {key, href, x, y, w, h}

  function _neonContentKey(stroke){
    const pts=stroke&&stroke.points||[];
    const last=pts.length?pts[pts.length-1]:null;
    return [
      stroke.color||'',
      stroke.width||0,
      stroke.opacity||1,
      _neonBrightPct(stroke),
      stroke.taper||'',
      stroke.smooth||0,
      stroke.pressure?1:0,
      pts.length,
      last?(_f(last.x)+','+_f(last.y)+','+_f(last.p||0)):''
    ].join('|');
  }

  /** Rasterize neon with the same paint as live preview → identical brightness. */
  function _neonRasterForStamps(stroke, stamps, sx, sy, cacheKey){
    sx=sx||1; sy=sy||1;
    if(!stroke||!stamps||!stamps.length) return null;
    const color=stroke.color||'#38bdf8';
    const op=stroke.opacity!=null?Math.max(0,Math.min(1,+stroke.opacity)):1;
    const look=_neonLook(stroke);
    const pad=Math.ceil(look.blur*2.8+Math.max(4, (+stroke.width||4)*look.outerScale));

    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    for(let i=0;i<stamps.length;i++){
      const s=stamps[i];
      if(s.kind==='circle'){
        const r=s.r*look.outerScale+pad;
        if(s.cx-r<minX) minX=s.cx-r; if(s.cy-r<minY) minY=s.cy-r;
        if(s.cx+r>maxX) maxX=s.cx+r; if(s.cy+r>maxY) maxY=s.cy+r;
      } else if(s.c&&s.c.length){
        for(let k=0;k<s.c.length;k++){
          const x=s.c[k][0], y=s.c[k][1];
          if(x-pad<minX) minX=x-pad; if(y-pad<minY) minY=y-pad;
          if(x+pad>maxX) maxX=x+pad; if(y+pad>maxY) maxY=y+pad;
        }
      }
    }
    if(!isFinite(minX)) return null;

    const w=Math.max(1, maxX-minX);
    const h=Math.max(1, maxY-minY);
    const dpr=Math.min(2, window.devicePixelRatio||1);
    const c=document.createElement('canvas');
    c.width=Math.max(1, Math.ceil(w*dpr));
    c.height=Math.max(1, Math.ceil(h*dpr));
    const ctx=c.getContext('2d');
    if(!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, -minX*dpr, -minY*dpr);
    _paintNeonStamps(ctx, stamps, color, stroke, op);

    let href='';
    try{ href=c.toDataURL('image/png'); }catch(e){ return null; }
    return {key:cacheKey||href, href:href, x:minX, y:minY, w:w, h:h};
  }

  function _neonRaster(stroke, sx, sy){
    sx=sx||1; sy=sy||1;
    if(!stroke||!stroke.points||!stroke.points.length) return null;
    const key=_neonContentKey(stroke)+'|'+sx+','+sy;
    const cached=_neonRasterCache.get(stroke.id);
    if(cached&&cached.key===key) return cached;

    const stamps=_brushStamps(stroke, sx, sy);
    if(!stamps.length) return null;
    const out=_neonRasterForStamps(stroke, stamps, sx, sy, key);
    if(out&&stroke.id) _neonRasterCache.set(stroke.id, out);
    return out;
  }

  function _appendNeonBrushSvg(g, stamps, color, stroke, NS){
    // stamps unused — raster uses same paint path as live
    const rast=_neonRaster(stroke, 1, 1);
    if(!rast) return;
    const img=document.createElementNS(NS,'image');
    img.setAttribute('x', String(_f(rast.x)));
    img.setAttribute('y', String(_f(rast.y)));
    img.setAttribute('width', String(_f(rast.w)));
    img.setAttribute('height', String(_f(rast.h)));
    img.setAttribute('href', rast.href);
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', rast.href);
    img.setAttribute('data-ink-neon', 'raster');
    img.setAttribute('pointer-events', 'none');
    g.appendChild(img);
  }
  function _neonStampMarkup(stamps, color, stroke, op){
    const rast=_neonRaster(stroke, 1, 1);
    if(!rast) return '';
    const center=_strokeCenterlineAttr(stroke,1,1);
    const cAttr=center
      ?(' data-ink-center="'+center.d+'" data-ink-sw="'+center.width+'" data-ink-sc="'+center.color+'" data-ink-so="'+center.opacity+'"')
      :'';
    // Opacity already baked into raster (matches live)
    return '<g data-ink-id="'+(stroke.id||'')+'" data-ink-kind="stroke"'+cAttr+'>'
      +'<image data-ink-neon="raster" pointer-events="none" x="'+_f(rast.x)+'" y="'+_f(rast.y)+'" width="'+_f(rast.w)+'" height="'+_f(rast.h)+'" href="'+rast.href+'" xlink:href="'+rast.href+'"/>'
      +'</g>';
  }

  function _penWidth(){ return PEN_SIZES[_penSizeIdx]||4; }
  function _markerWidth(){ return MARKER_SIZES[_markerSizeIdx]||14; }
  function _eraserWidth(){ return ERASER_SIZES[_eraserSizeIdx]||20; }
  function _activePenWidth(){ return _tool==='marker'?_markerWidth():_penWidth(); }
  function _activeOpacityPct(){ return _tool==='marker'?_markerOpacity:_opacity; }

  /**
   * Length-independent smoothing: resample to fixed spacing, then
   * average over a fixed pixel radius (not a fraction of stroke length).
   * Stronger amount mapping so the UI slider is perceptible.
   */
  function _smoothPoints(pts, amount){
    if(!pts||pts.length<3||amount<=0.01) return pts.slice();
    const spacing=2.8;
    let out=_resamplePath(pts, spacing);
    if(out.length<3) return out;
    // ~2..34 px radius at smooth 0..200 — more responsive to the smooth slider
    const radius=2+amount*16;
    const halfWin=Math.max(1, Math.round(radius/spacing));
    const passes=1+Math.round(amount*3); // 1..7
    for(let pass=0;pass<passes;pass++){
      const next=[out[0]];
      for(let i=1;i<out.length-1;i++){
        let sx=0,sy=0,sp=0,st=0,nt=0,wsum=0;
        for(let k=-halfWin;k<=halfWin;k++){
          const j=Math.max(0,Math.min(out.length-1,i+k));
          const w=1-Math.abs(k)/(halfWin+0.01);
          sx+=out[j].x*w; sy+=out[j].y*w; sp+=out[j].p*w; wsum+=w;
          if(out[j].t!=null){ st+=out[j].t*w; nt+=w; }
        }
        next.push({
          x:sx/wsum, y:sy/wsum, p:sp/wsum,
          t:nt?st/nt:out[i].t
        });
      }
      next.push(out[out.length-1]);
      out=next;
    }
    return out;
  }

  function _strokeWidthAt(stroke, pt){
    const base=Math.max(0.15, +stroke.width||4);
    if(!stroke.pressure) return base;
    const p=pt&&pt.p!=null?+pt.p:0.5;
    // Keep pressure variation proportional — no hard 0.6px floor (clamped 0.5/1.5/3 to same look)
    return Math.max(base*0.2, base*(0.35+0.9*Math.max(0.05,Math.min(1,p))));
  }

  /** Dense resample along polyline for smooth ribbon normals. */
  function _resamplePath(pts, spacing){
    if(!pts||!pts.length) return [];
    if(pts.length===1) return [{x:pts[0].x,y:pts[0].y,p:pts[0].p,t:pts[0].t}];
    spacing=Math.max(0.2, spacing||2);
    const out=[{x:pts[0].x,y:pts[0].y,p:pts[0].p,t:pts[0].t}];
    let acc=0;
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1], b=pts[i];
      const seg=Math.hypot(b.x-a.x, b.y-a.y);
      if(seg<1e-6) continue;
      let d=spacing-acc;
      while(d<=seg){
        const u=d/seg;
        out.push({
          x:a.x+(b.x-a.x)*u,
          y:a.y+(b.y-a.y)*u,
          p:(a.p!=null&&b.p!=null)?a.p+(b.p-a.p)*u:(b.p!=null?b.p:0.5),
          t:(a.t!=null&&b.t!=null)?a.t+(b.t-a.t)*u:b.t
        });
        d+=spacing;
      }
      acc=seg-(d-spacing);
      if(acc<0) acc=0;
    }
    const last=pts[pts.length-1];
    const prev=out[out.length-1];
    if(!prev||Math.hypot(last.x-prev.x,last.y-prev.y)>0.35){
      out.push({x:last.x,y:last.y,p:last.p,t:last.t});
    }
    return out;
  }

  /** Smooth half-widths along the stroke.
   *  - out/in (thick↔thin): thick end = stated width (matches size UI / shapes)
   *  - both (thin–thick–thin): calligraphy from curvature (fat on bends) */
  function _brushHalfWidths(stroke, pts){
    const n=pts.length;
    const base=Math.max(0.15, +stroke.width||6);
    if(stroke.tool==='marker'){
      const hw=base*0.5;
      return Array(n).fill(hw);
    }
    const taper=stroke.taper||_taper||'both'; // both | out | in
    const dist=new Array(n); dist[0]=0;
    let total=0;
    for(let i=1;i<n;i++){
      total+=Math.hypot(pts[i].x-pts[i-1].x, pts[i].y-pts[i-1].y);
      dist[i]=total;
    }

    // Directional profiles: thick end is the real brush width (e.g. 20px = 20px circle)
    if(taper==='out'||taper==='in'){
      const hwMax=base*0.5;
      const hwMin=Math.max(0.06, Math.min(hwMax*0.22, base*0.12));
      const out=new Array(n);
      for(let i=0;i<n;i++){
        let m=1;
        let u=0;
        if(total>1e-6){
          const t=dist[i]/total;
          u=t*t*(3-2*t); // smoothstep
          const thin=hwMin/hwMax;
          if(taper==='out') m=1-u*(1-thin);       // 1 → thin (thick→thin)
          else m=thin+u*(1-thin);                  // thin → 1 (thin→thick)
        }
        if(stroke.pressure){
          const p=pts[i].p!=null?+pts[i].p:0.5;
          const pMul=0.7+0.3*Math.max(0.08,Math.min(1,p));
          // Pressure thins the light end; thick end stays at stated width
          const thickW=taper==='out'?(1-u):u;
          m*=thickW+(1-thickW)*pMul;
        }
        out[i]=Math.max(hwMin, hwMax*m);
      }
      // Light smooth so edges stay continuous without shrinking the thick tip much
      if(n>4){
        let smoothed=out.slice();
        for(let pass=0;pass<2;pass++){
          const next=smoothed.slice();
          for(let i=1;i<n-1;i++) next[i]=(smoothed[i-1]+smoothed[i]*2+smoothed[i+1])/4;
          // Preserve thick-end amplitude
          if(taper==='out'){ next[0]=out[0]; next[1]=out[0]*0.65+next[1]*0.35; }
          else { next[n-1]=out[n-1]; next[n-2]=out[n-1]*0.65+next[n-2]*0.35; }
          smoothed=next;
        }
        return smoothed;
      }
      return out;
    }

    // Fine pens (0.5 / 1.5 / 3): honour stated px width — calligraphy floors used to crush them together
    if(base<=3.5){
      const hw=base*0.5;
      const out=new Array(n);
      for(let i=0;i<n;i++){
        let m=1;
        if(total>2){
          const taperLen=Math.min(16, Math.max(4, total*0.15));
          if(dist[i]<taperLen) m=0.4+0.6*(dist[i]/taperLen);
          else if(total-dist[i]<taperLen) m=0.4+0.6*((total-dist[i])/taperLen);
        }
        if(stroke.pressure){
          const p=pts[i].p!=null?+pts[i].p:0.5;
          m*=0.75+0.35*Math.max(0.08,Math.min(1,p));
        }
        out[i]=Math.max(base*0.08, hw*m);
      }
      return out;
    }

    // Peak half-width at strongest bends; straights stay much thinner (filled-ribbon look)
    const peak=base*0.58;
    const minHw=Math.max(0.04, base*0.05);

    // Unwrapped heading, then κ = |Δheading| / path-length over a fixed window
    const head=new Array(n).fill(0);
    for(let i=1;i<n;i++){
      head[i]=Math.atan2(pts[i].y-pts[i-1].y, pts[i].x-pts[i-1].x);
    }
    if(n>1) head[0]=head[1];
    for(let i=1;i<n;i++){
      let d=head[i]-head[i-1];
      while(d>Math.PI) d-=Math.PI*2;
      while(d<-Math.PI) d+=Math.PI*2;
      head[i]=head[i-1]+d;
    }
    const winPx=14; // measure turn over ~14px of path
    const curv=new Array(n).fill(0);
    for(let i=0;i<n;i++){
      let i0=i, i1=i;
      while(i0>0&&dist[i]-dist[i0]<winPx*0.5) i0--;
      while(i1<n-1&&dist[i1]-dist[i]<winPx*0.5) i1++;
      const ds=Math.max(1.2, dist[i1]-dist[i0]);
      curv[i]=Math.abs(head[i1]-head[i0])/ds; // rad/px
    }
    let sCurv=curv.slice();
    for(let pass=0;pass<3;pass++){
      const next=sCurv.slice();
      for(let i=1;i<n-1;i++) next[i]=(sCurv[i-1]+sCurv[i]*2+sCurv[i+1])/4;
      if(n>1){ next[0]=sCurv[0]; next[n-1]=sCurv[n-1]; }
      sCurv=next;
    }

    // Mild optional pressure; velocity only as a light accent (curvature is the main driver)
    const raw=new Array(n);
    for(let i=0;i<n;i++){
      // Map κ: ~0 straight → thin; ~0.09+ tight bend → full peak
      const k=Math.min(1, sCurv[i]/0.09);
      const kEase=k*k*(3-2*k); // smoothstep — gentle start, strong on hard curls
      // Straight ≈ 28% of peak, full bend ≈ 100% (+ a bit of overshoot on extremes)
      let mul=0.28+0.82*kEase;
      if(stroke.pressure){
        const p=pts[i].p!=null?+pts[i].p:0.5;
        mul*=0.75+0.35*Math.max(0.08,Math.min(1,p));
      }
      if(total>2){
        // Pointed tips like the reference silhouette
        const taperLen=Math.min(28, Math.max(8, total*0.22));
        if(dist[i]<taperLen) mul*=0.12+0.88*(dist[i]/taperLen);
        else if(total-dist[i]<taperLen) mul*=0.12+0.88*((total-dist[i])/taperLen);
      } else {
        mul*=0.55;
      }
      raw[i]=Math.max(minHw, peak*mul);
    }

    // Wide spatial smooth → continuous ribbon edges (filled silhouette)
    const avgSp=n>1?total/Math.max(1,n-1):3;
    const halfWin=Math.max(3, Math.round(18/Math.max(0.8,avgSp)));
    let out=raw.slice();
    const wPasses=5;
    for(let pass=0;pass<wPasses;pass++){
      const next=out.slice();
      for(let i=0;i<n;i++){
        let s=0, wsum=0;
        for(let k=-halfWin;k<=halfWin;k++){
          const j=Math.max(0,Math.min(n-1,i+k));
          const w=1-Math.abs(k)/(halfWin+0.01);
          s+=out[j]*w; wsum+=w;
        }
        next[i]=s/wsum;
      }
      if(n>2){ next[0]=raw[0]*0.65+next[0]*0.35; next[n-1]=raw[n-1]*0.65+next[n-1]*0.35; }
      out=next;
    }
    return out;
  }

  function _f(n){ return (Math.round(n*1000)/1000); }

  /** Simple quad path `d`; winding fixed so area ≥ 0. */
  function _svgQuad(l0x,l0y,l1x,l1y,r1x,r1y,r0x,r0y){
    const area=(l1x-l0x)*(r0y-l0y)-(l1y-l0y)*(r0x-l0x);
    if(area<0){
      return 'M'+_f(l0x)+','+_f(l0y)+'L'+_f(r0x)+','+_f(r0y)+'L'+_f(r1x)+','+_f(r1y)+'L'+_f(l1x)+','+_f(l1y)+'Z';
    }
    return 'M'+_f(l0x)+','+_f(l0y)+'L'+_f(l1x)+','+_f(l1y)+'L'+_f(r1x)+','+_f(r1y)+'L'+_f(r0x)+','+_f(r0y)+'Z';
  }

  /** Quad stamp with SVG `d` + corner list for fast canvas live paint. */
  function _quadStamp(l0x,l0y,l1x,l1y,r1x,r1y,r0x,r0y){
    const area=(l1x-l0x)*(r0y-l0y)-(l1y-l0y)*(r0x-l0x);
    let c;
    if(area<0) c=[[l0x,l0y],[r0x,r0y],[r1x,r1y],[l1x,l1y]];
    else c=[[l0x,l0y],[l1x,l1y],[r1x,r1y],[r0x,r0y]];
    return {kind:'quad', d:_svgQuad(l0x,l0y,l1x,l1y,r1x,r1y,r0x,r0y), c:c};
  }

  /**
   * Brush stamps: quads + circles as separate shapes.
   * Must NOT be merged into one path — overlaps would punch holes (evenodd / winding).
   * Full quality always; live preview paints these onto canvas (not SVG DOM).
   */
  function _brushStamps(stroke, sx, sy){
    sx=sx||1; sy=sy||1;
    const sc=Math.min(sx,sy);
    const amt=(stroke.smooth!=null?+stroke.smooth:_smooth)/100;
    const raw=_smoothPoints(stroke.points, amt);
    if(!raw.length) return [];
    const baseW=Math.max(0.15, +stroke.width||6);
    const pts=_resamplePath(raw, Math.max(0.25, baseW*0.18));
    const half=_brushHalfWidths(stroke, pts);
    if(pts.length===1){
      return [{kind:'circle', cx:pts[0].x*sx, cy:pts[0].y*sy, r:half[0]*sc}];
    }
    const n=pts.length;
    const nxArr=new Array(n), nyArr=new Array(n);
    let pnx=0, pny=-1;
    for(let i=0;i<n;i++){
      let tx, ty;
      if(i===0){ tx=pts[1].x-pts[0].x; ty=pts[1].y-pts[0].y; }
      else if(i===n-1){ tx=pts[n-1].x-pts[n-2].x; ty=pts[n-1].y-pts[n-2].y; }
      else { tx=pts[i+1].x-pts[i-1].x; ty=pts[i+1].y-pts[i-1].y; }
      const len=Math.hypot(tx,ty)||1;
      let nx=-ty/len, ny=tx/len;
      if(nx*pnx+ny*pny<0){ nx=-nx; ny=-ny; }
      pnx=nx; pny=ny;
      nxArr[i]=nx; nyArr[i]=ny;
    }
    const stamps=[];
    for(let i=0;i<n-1;i++){
      const hw0=half[i]*sc, hw1=half[i+1]*sc;
      const ax=pts[i].x*sx, ay=pts[i].y*sy;
      const bx=pts[i+1].x*sx, by=pts[i+1].y*sy;
      stamps.push(_quadStamp(
        ax+nxArr[i]*hw0, ay+nyArr[i]*hw0,
        bx+nxArr[i+1]*hw1, by+nyArr[i+1]*hw1,
        bx-nxArr[i+1]*hw1, by-nyArr[i+1]*hw1,
        ax-nxArr[i]*hw0, ay-nyArr[i]*hw0
      ));
    }
    const taper=stroke.taper||_taper||'both';
    for(let i=0;i<n;i++){
      let r=half[i]*sc;
      // Soft tip only on the thin end — keep thick end at full stated width
      if(taper==='out'&&i===n-1) r*=0.72;
      else if(taper==='in'&&i===0) r*=0.72;
      stamps.push({kind:'circle', cx:pts[i].x*sx, cy:pts[i].y*sy, r:r});
    }
    return stamps;
  }

  function _appendBrushStamp(parent, stamp, color, NS){
    if(stamp.kind==='circle'){
      const el=document.createElementNS(NS,'circle');
      el.setAttribute('cx', String(_f(stamp.cx)));
      el.setAttribute('cy', String(_f(stamp.cy)));
      el.setAttribute('r', String(_f(Math.max(0.04, stamp.r))));
      el.setAttribute('fill', color);
      el.setAttribute('stroke', 'none');
      parent.appendChild(el);
    } else if(stamp.kind==='quad'&&stamp.d){
      const el=document.createElementNS(NS,'path');
      el.setAttribute('d', stamp.d);
      el.setAttribute('fill', color);
      el.setAttribute('stroke', 'none');
      parent.appendChild(el);
    }
  }

  /** Constant-width polyline path for legacy hard strokes. */
  function _hardStrokeGeom(stroke, sx, sy){
    sx=sx||1; sy=sy||1;
    const sc=Math.min(sx,sy);
    const amt=(stroke.smooth!=null?+stroke.smooth:_smooth)/100;
    const pts=_smoothPoints(stroke.points, amt);
    if(!pts.length) return null;
    let avgW=0;
    for(let i=0;i<pts.length;i++) avgW+=_strokeWidthAt(stroke, pts[i]);
    const w=Math.max(0.15,(avgW/Math.max(1,pts.length))*sc);
    if(pts.length===1){
      return {fill:true, circle:{cx:pts[0].x*sx, cy:pts[0].y*sy, r:w/2}};
    }
    let d='M'+_f(pts[0].x*sx)+','+_f(pts[0].y*sy);
    if(pts.length===2){
      d+='L'+_f(pts[1].x*sx)+','+_f(pts[1].y*sy);
    } else {
      for(let i=1;i<pts.length-1;i++){
        const mx=_f(((pts[i].x+pts[i+1].x)/2)*sx);
        const my=_f(((pts[i].y+pts[i+1].y)/2)*sy);
        d+='Q'+_f(pts[i].x*sx)+','+_f(pts[i].y*sy)+' '+mx+','+my;
      }
      const last=pts[pts.length-1];
      d+='L'+_f(last.x*sx)+','+_f(last.y*sy);
    }
    return {fill:false, d, width:w};
  }

  /** Open centerline path for inkDraw reveal (matches visual stroke route). */
  function _strokeCenterlineAttr(stroke, sx, sy){
    sx=sx||1; sy=sy||1;
    if(!stroke||!stroke.points||!stroke.points.length) return null;
    const amt=(stroke.smooth!=null?+stroke.smooth:_smooth)/100;
    const pts=_smoothPoints(stroke.points, amt);
    if(!pts.length) return null;
    let avgW=0;
    for(let i=0;i<pts.length;i++) avgW+=_strokeWidthAt(stroke, pts[i]);
    const w=Math.max(0.15,(avgW/Math.max(1,pts.length))*Math.min(sx,sy));
    let d='M'+_f(pts[0].x*sx)+','+_f(pts[0].y*sy);
    for(let i=1;i<pts.length;i++) d+='L'+_f(pts[i].x*sx)+','+_f(pts[i].y*sy);
    return {d, width:w, color:stroke.color||'#1e293b', opacity:stroke.opacity!=null?Math.max(0,Math.min(1,+stroke.opacity)):1};
  }

  function _makeStrokeSvgEl(stroke, sx, sy){
    sx=sx||1; sy=sy||1;
    const NS='http://www.w3.org/2000/svg';
    const color=stroke.color||'#1e293b';
    const op=stroke.opacity!=null?Math.max(0,Math.min(1,+stroke.opacity)):1;
    const center=_strokeCenterlineAttr(stroke, sx, sy);

    if(_isBrushFamily(stroke.tool)){
      const g=document.createElementNS(NS,'g');
      if(stroke.id) g.setAttribute('data-ink-id', stroke.id);
      g.setAttribute('data-ink-kind', 'stroke');
      if(center){
        g.setAttribute('data-ink-center', center.d);
        g.setAttribute('data-ink-sw', String(center.width));
        g.setAttribute('data-ink-sc', center.color);
        g.setAttribute('data-ink-so', String(center.opacity));
      }
      if(stroke.tool==='neon'){
        // Opacity baked into raster so live ≡ committed brightness
        _appendNeonBrushSvg(g, null, color, stroke, NS);
        if(!g.querySelector('image')) return null;
        return g;
      }
      const stamps=_brushStamps(stroke, sx, sy);
      if(!stamps.length) return null;
      if(op<1) g.setAttribute('opacity', String(op));
      const frag=document.createDocumentFragment();
      for(let i=0;i<stamps.length;i++) _appendBrushStamp(frag, stamps[i], color, NS);
      g.appendChild(frag);
      return g;
    }

    // Marker = constant-width rounded stroke (highlighter)
    const geom=_hardStrokeGeom(
      stroke.tool==='marker'?Object.assign({},stroke,{pressure:false}):stroke,
      sx, sy
    );
    if(!geom) return null;
    if(geom.circle){
      const g=document.createElementNS(NS,'g');
      if(stroke.id) g.setAttribute('data-ink-id', stroke.id);
      g.setAttribute('data-ink-kind', 'stroke');
      if(center){
        g.setAttribute('data-ink-center', center.d);
        g.setAttribute('data-ink-sw', String(center.width));
        g.setAttribute('data-ink-sc', center.color);
        g.setAttribute('data-ink-so', String(center.opacity));
      }
      if(op<1) g.setAttribute('opacity', String(op));
      _appendBrushStamp(g, {kind:'circle', cx:geom.circle.cx, cy:geom.circle.cy, r:geom.circle.r}, color, NS);
      return g;
    }
    if(!geom.d) return null;
    const el=document.createElementNS(NS,'path');
    el.setAttribute('d', geom.d);
    if(stroke.id) el.setAttribute('data-ink-id', stroke.id);
    el.setAttribute('data-ink-kind', 'stroke');
    el.setAttribute('fill','none');
    el.setAttribute('stroke', color);
    el.setAttribute('stroke-width', String(geom.width));
    el.setAttribute('stroke-linecap','round');
    el.setAttribute('stroke-linejoin','round');
    if(stroke.tool==='marker') el.setAttribute('stroke-opacity', String(op));
    else if(op<1) el.setAttribute('opacity', String(op));
    return el;
  }

  function _accentColor(){
    try{
      const v=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      if(v) return v;
    }catch(e){}
    return '#3b82f6';
  }

  /** Selection halo along stroke centerline. */
  function _makeSelHalo(stroke, sx, sy){
    sx=sx||1; sy=sy||1;
    if(!stroke||!stroke.points||!stroke.points.length) return null;
    const NS='http://www.w3.org/2000/svg';
    const amt=(stroke.smooth!=null?+stroke.smooth:_smooth)/100;
    const pts=_smoothPoints(stroke.points, amt);
    if(!pts.length) return null;
    let d='M'+_f(pts[0].x*sx)+','+_f(pts[0].y*sy);
    for(let i=1;i<pts.length;i++) d+='L'+_f(pts[i].x*sx)+','+_f(pts[i].y*sy);
    const el=document.createElementNS(NS,'path');
    el.setAttribute('d', d);
    el.setAttribute('fill','none');
    el.setAttribute('stroke', _accentColor());
    el.setAttribute('stroke-width', String(Math.max(6, (+stroke.width||4)+10)));
    el.setAttribute('stroke-linecap','round');
    el.setAttribute('stroke-linejoin','round');
    el.setAttribute('opacity','0.4');
    el.setAttribute('class','ink-sel-halo');
    el.style.pointerEvents='none';
    return el;
  }


  // ══════════════ INK FILL (bucket) ══════════════

  function _fillsEl(){ return document.getElementById('ink-fills'); }
  function _defsEl(){
    let d=document.getElementById('ink-defs');
    if(d) return d;
    const svg=_canvasEl();
    if(!svg) return null;
    d=document.createElementNS('http://www.w3.org/2000/svg','defs');
    d.id='ink-defs';
    svg.insertBefore(d, svg.firstChild);
    return d;
  }

  function _ensureFillLayer(){
    let g=_fillsEl();
    if(g) return g;
    const svg=_canvasEl();
    if(!svg) return null;
    g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.id='ink-fills';
    const committed=_committedEl();
    if(committed) svg.insertBefore(g, committed);
    else svg.appendChild(g);
    return g;
  }

  /** Raster barriers from strokes; includes ink outside the slide so off-slide closures seal. */
  function _buildFillMask(clickX, clickY){
    const slideW=typeof canvasW!=='undefined'?canvasW:1200;
    const slideH=typeof canvasH!=='undefined'?canvasH:675;
    const scale=1;
    const ink=_inkArr()||[];
    let minX=0, minY=0, maxX=slideW, maxY=slideH;
    let widthSum=0, widthN=0;
    ink.forEach(s=>{
      if(!s||!s.points||!s.points.length) return;
      const sw=Math.max(2, (+s.width||4));
      widthSum+=sw; widthN++;
      const half=sw;
      for(let i=0;i<s.points.length;i++){
        const p=s.points[i];
        if(p.x-half<minX) minX=p.x-half;
        if(p.y-half<minY) minY=p.y-half;
        if(p.x+half>maxX) maxX=p.x+half;
        if(p.y+half>maxY) maxY=p.y+half;
      }
    });
    if(clickX!=null&&clickY!=null){
      minX=Math.min(minX, clickX);
      minY=Math.min(minY, clickY);
      maxX=Math.max(maxX, clickX);
      maxY=Math.max(maxY, clickY);
    }
    const margin=Math.max(28, (widthN?widthSum/widthN:6)*2.5);
    minX=Math.floor(minX-margin);
    minY=Math.floor(minY-margin);
    maxX=Math.ceil(maxX+margin);
    maxY=Math.ceil(maxY+margin);

    let ox=minX, oy=minY;
    let mw=Math.max(8, maxX-minX);
    let mh=Math.max(8, maxY-minY);
    const maxDim=Math.max(Math.max(slideW, slideH)*4, 4096);
    if(mw>maxDim||mh>maxDim){
      const cx=clickX!=null?clickX:slideW/2;
      const cy=clickY!=null?clickY:slideH/2;
      mw=Math.min(mw, maxDim);
      mh=Math.min(mh, maxDim);
      ox=Math.floor(cx-mw/2);
      oy=Math.floor(cy-mh/2);
      // Prefer covering the slide when possible
      if(ox>0) ox=0;
      if(oy>0) oy=0;
      if(ox+mw<slideW) ox=slideW-mw;
      if(oy+mh<slideH) oy=slideH-mh;
    }

    const w=Math.max(8, Math.ceil(mw*scale));
    const h=Math.max(8, Math.ceil(mh*scale));
    const cv=document.createElement('canvas');
    cv.width=w; cv.height=h;
    const ctx=cv.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,w,h);
    ctx.imageSmoothingEnabled=false;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-ox, -oy);
    ink.forEach(s=>{
      if(!s||!s.points||!s.points.length) return;
      const sw=Math.max(2, (+s.width||4));
      const fat=Object.assign({}, s, {
        width: sw,
        opacity:1,
        pressure:false
      });
      _drawStroke(ctx, fat, 1, 1);
    });
    ctx.restore();
    const data=ctx.getImageData(0,0,w,h).data;
    const barrier=new Uint8Array(w*h);
    for(let i=0;i<w*h;i++){
      const o=i*4;
      barrier[i]=(data[o]<180||data[o+1]<180||data[o+2]<180)?1:0;
    }
    const avgW=widthN?widthSum/widthN:6;
    return {barrier,w,h,scale,avgW,ox,oy};
  }

  function _inkEndpoints(){
    const ends=[];
    const ink=_inkArr()||[];
    ink.forEach((s,si)=>{
      const pts=s.points||[];
      if(pts.length<2) return;
      const hw=Math.max(2,(+s.width||4)*0.55);
      ends.push({x:+pts[0].x, y:+pts[0].y, hw, si});
      ends.push({x:+pts[pts.length-1].x, y:+pts[pts.length-1].y, hw, si});
    });
    return ends;
  }

  /** Stamp a thick line segment onto barrier (mask pixel coords). */
  function _stampLineMask(barrier, w, h, x0, y0, x1, y1, radius){
    const r=Math.max(1, radius|0);
    const r2=r*r;
    let dx=x1-x0, dy=y1-y0;
    const len=Math.hypot(dx,dy)||1;
    const steps=Math.max(1, Math.ceil(len));
    for(let s=0;s<=steps;s++){
      const t=s/steps;
      const cx=x0+dx*t, cy=y0+dy*t;
      const ix=Math.round(cx), iy=Math.round(cy);
      const xA=Math.max(0,ix-r), xB=Math.min(w-1,ix+r);
      const yA=Math.max(0,iy-r), yB=Math.min(h-1,iy+r);
      for(let y=yA;y<=yB;y++){
        for(let x=xA;x<=xB;x++){
          const ddx=x-cx, ddy=y-cy;
          if(ddx*ddx+ddy*ddy<=r2) barrier[y*w+x]=1;
        }
      }
    }
  }

  /**
   * Close openings by drawing short bridges only between stroke endpoints
   * within gapPx — fill still follows the real contour everywhere else.
   * ox/oy: slide→mask origin (stroke coords are in slide space).
   */
  function _sealWithEndpointBridges(baseBarrier, w, h, scale, gapPx, sx, sy, ox, oy){
    ox=ox||0; oy=oy||0;
    const ends=_inkEndpoints();
    if(ends.length<2) return null;
    const pairs=[];
    for(let i=0;i<ends.length;i++){
      for(let j=i+1;j<ends.length;j++){
        const d=Math.hypot(ends[i].x-ends[j].x, ends[i].y-ends[j].y);
        if(d<0.75||d>gapPx) continue;
        const same=ends[i].si===ends[j].si?0:1;
        pairs.push({i,j,d,same});
      }
    }
    if(!pairs.length) return null;
    pairs.sort((a,b)=>a.same-b.same||a.d-b.d);

    function stamp(barrier, a, b){
      const rad=Math.max(a.hw, b.hw, 2.5)*scale;
      _stampLineMask(
        barrier, w, h,
        (a.x-ox)*scale, (a.y-oy)*scale,
        (b.x-ox)*scale, (b.y-oy)*scale,
        rad
      );
    }

    // 1) Try each single bridge alone (best for one open loop)
    for(let pi=0;pi<pairs.length;pi++){
      const barrier=new Uint8Array(baseBarrier);
      stamp(barrier, ends[pairs[pi].i], ends[pairs[pi].j]);
      const flood=_tryClosedFlood(barrier, w, h, sx, sy);
      if(flood) return {barrier,flood,bridges:1};
    }

    // 2) Accumulate shortest bridges until sealed (multi-gap shapes)
    const barrier=new Uint8Array(baseBarrier);
    const used=new Set();
    let bridges=0;
    for(let pi=0;pi<pairs.length;pi++){
      const p=pairs[pi];
      if(used.has(p.i)||used.has(p.j)) continue;
      stamp(barrier, ends[p.i], ends[p.j]);
      used.add(p.i); used.add(p.j);
      bridges++;
      const flood=_tryClosedFlood(barrier, w, h, sx, sy);
      if(flood) return {barrier,flood,bridges};
    }
    return null;
  }

  function _floodTouchesBorder(filled, w, h){
    for(let x=0;x<w;x++){
      if(filled[x]||filled[(h-1)*w+x]) return true;
    }
    for(let y=0;y<h;y++){
      if(filled[y*w]||filled[y*w+(w-1)]) return true;
    }
    return false;
  }

  /** Nearest free pixel if click landed on a stroke / bridge. */
  function _findFillSeed(barrier, w, h, sx, sy, maxR){
    sx=sx|0; sy=sy|0;
    if(sx>=0&&sy>=0&&sx<w&&sy<h&&!barrier[sy*w+sx]) return {x:sx,y:sy};
    const lim=maxR==null?48:maxR;
    for(let r=1;r<=lim;r++){
      for(let dy=-r;dy<=r;dy++){
        for(let dx=-r;dx<=r;dx++){
          if(Math.max(Math.abs(dx),Math.abs(dy))!==r) continue;
          const x=sx+dx, y=sy+dy;
          if(x<0||y<0||x>=w||y>=h) continue;
          if(!barrier[y*w+x]) return {x,y};
        }
      }
    }
    return null;
  }

  /**
   * Flood fill. Returns null on hard fail.
   * {filled,count,open:true} if region reaches mask edge (unclosed / exterior).
   */
  function _floodFillMask(barrier, w, h, sx, sy){
    const seed=_findFillSeed(barrier, w, h, sx, sy, 48);
    if(!seed) return null;
    sx=seed.x; sy=seed.y;
    const start=sy*w+sx;
    const filled=new Uint8Array(w*h);
    const stack=[start];
    let count=0;
    const max=(w*h*0.85)|0;
    while(stack.length){
      const i=stack.pop();
      if(i<0||i>=w*h||filled[i]||barrier[i]) continue;
      filled[i]=1;
      count++;
      if(count>max) return {filled,count,open:true,runaway:true};
      const x=i%w;
      if(x>0) stack.push(i-1);
      if(x<w-1) stack.push(i+1);
      if(i>=w) stack.push(i-w);
      if(i+w<w*h) stack.push(i+w);
    }
    if(count<8) return null;
    const open=_floodTouchesBorder(filled, w, h);
    return {filled,count,open:!!open};
  }

  /** Try flood; accept only sealed (non-open) regions. */
  function _tryClosedFlood(barrier, w, h, sx, sy){
    const flood=_floodFillMask(barrier, w, h, sx, sy);
    if(!flood||flood.open||flood.runaway) return null;
    return flood;
  }

  function _isFillBoundary(filled, w, h, i){
    if(!filled[i]) return false;
    const x=i%w, y=(i/w)|0;
    if(x===0||y===0||x===w-1||y===h-1) return true;
    return !(filled[i-1]&&filled[i+1]&&filled[i-w]&&filled[i+w]);
  }

  /** Moore neighborhood contour in mask coords (CW). */
  function _traceMaskContour(filled, w, h){
    let start=-1;
    for(let i=0;i<w*h;i++){
      if(filled[i]&&_isFillBoundary(filled,w,h,i)){ start=i; break; }
    }
    if(start<0) return null;
    // N, NE, E, SE, S, SW, W, NW
    const dx=[0,1,1,1,0,-1,-1,-1], dy=[-1,-1,0,1,1,1,0,-1];
    const pts=[];
    let x=start%w, y=(start/w)|0;
    let dir=0;
    const sx0=x, sy0=y;
    for(let guard=0;guard<w*h*4;guard++){
      pts.push({x,y});
      let found=false;
      for(let k=0;k<8;k++){
        const nd=(dir+6+k)&7; // prefer left turns
        const nx=x+dx[nd], ny=y+dy[nd];
        if(nx<0||ny<0||nx>=w||ny>=h) continue;
        const ni=ny*w+nx;
        if(filled[ni]&&_isFillBoundary(filled,w,h,ni)){
          x=nx; y=ny; dir=nd; found=true; break;
        }
      }
      if(!found){
        for(let k=0;k<8;k++){
          const nd=(dir+6+k)&7;
          const nx=x+dx[nd], ny=y+dy[nd];
          if(nx<0||ny<0||nx>=w||ny>=h) continue;
          if(filled[ny*w+nx]){ x=nx; y=ny; dir=nd; found=true; break; }
        }
      }
      if(!found) break;
      if(pts.length>2&&x===sx0&&y===sy0) break;
    }
    if(pts.length<6) return null;
    return pts;
  }

  function _smoothContour(pts, passes){
    if(!pts||pts.length<4) return pts||[];
    let out=pts.slice();
    const nPass=passes||3;
    for(let p=0;p<nPass;p++){
      const next=[];
      const n=out.length;
      for(let i=0;i<n;i++){
        const a=out[i], b=out[(i+1)%n];
        next.push({x:a.x*0.75+b.x*0.25, y:a.y*0.75+b.y*0.25});
        next.push({x:a.x*0.25+b.x*0.75, y:a.y*0.25+b.y*0.75});
      }
      if(p%2===1&&next.length>120){
        const dec=[];
        for(let i=0;i<next.length;i+=2) dec.push(next[i]);
        out=dec;
      } else out=next;
    }
    return out;
  }

  /** Even spacing along closed polyline. */
  function _resampleClosed(pts, spacing){
    if(!pts||pts.length<3) return pts||[];
    spacing=Math.max(1.2, spacing||3);
    const n=pts.length;
    const seg=[];
    let total=0;
    for(let i=0;i<n;i++){
      const a=pts[i], b=pts[(i+1)%n];
      const d=Math.hypot(b.x-a.x, b.y-a.y);
      seg.push(d); total+=d;
    }
    if(total<spacing*3) return pts.slice();
    const count=Math.max(12, Math.round(total/spacing));
    const step=total/count;
    const out=[];
    let i=0, acc=0, target=0;
    let cx=pts[0].x, cy=pts[0].y;
    for(let k=0;k<count;k++){
      target=k*step;
      while(i<n && acc+seg[i]<target-1e-6){
        acc+=seg[i];
        i++;
        const p=pts[i%n];
        cx=p.x; cy=p.y;
      }
      const s=seg[i%n]||1;
      const t=Math.max(0, Math.min(1, (target-acc)/s));
      const a=pts[i%n], b=pts[(i+1)%n];
      out.push({x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t});
    }
    return out;
  }

  /** Laplacian smooth — removes jags without shrinking shape as much as Chaikin alone. */
  function _laplacianSmooth(pts, passes, lambda){
    if(!pts||pts.length<4) return pts||[];
    let cur=pts;
    const lam=lambda==null?0.42:lambda;
    const nPass=passes||4;
    for(let p=0;p<nPass;p++){
      const n=cur.length;
      const next=new Array(n);
      for(let i=0;i<n;i++){
        const a=cur[(i-1+n)%n], b=cur[i], c=cur[(i+1)%n];
        next[i]={
          x:b.x+lam*((a.x+c.x)*0.5-b.x),
          y:b.y+lam*((a.y+c.y)*0.5-b.y)
        };
      }
      cur=next;
    }
    return cur;
  }

  /** Smooth closed contour lightly — keep stroke detail, remove mask jags. */
  function _refineFillContour(pts){
    if(!pts||pts.length<6) return pts||[];
    let c=_resampleClosed(pts, 2.0);
    c=_laplacianSmooth(c, 3, 0.30);
    c=_smoothContour(c, 2);
    c=_resampleClosed(c, 2.5);
    c=_laplacianSmooth(c, 2, 0.22);
    return c;
  }

  /** Smooth SVG path with Catmull-Rom → cubic beziers (closed). */
  function _contourToSmoothPath(pts){
    if(!pts||pts.length<3) return '';
    if(pts.length<6) return _contourToPath(pts);
    const n=pts.length;
    const f=_f;
    let d='M'+f(pts[0].x)+','+f(pts[0].y);
    for(let i=0;i<n;i++){
      const p0=pts[(i-1+n)%n], p1=pts[i], p2=pts[(i+1)%n], p3=pts[(i+2)%n];
      const c1x=p1.x+(p2.x-p0.x)/6, c1y=p1.y+(p2.y-p0.y)/6;
      const c2x=p2.x-(p3.x-p1.x)/6, c2y=p2.y-(p3.y-p1.y)/6;
      d+='C'+f(c1x)+','+f(c1y)+' '+f(c2x)+','+f(c2y)+' '+f(p2.x)+','+f(p2.y);
    }
    return d+'Z';
  }

  /** Inflate contour slightly so fill sits under stroke edges. */
  function _inflateContour(pts, px){
    if(!pts||pts.length<3||!px) return pts;
    const n=pts.length;
    const out=new Array(n);
    for(let i=0;i<n;i++){
      const p0=pts[(i-1+n)%n], p1=pts[i], p2=pts[(i+1)%n];
      let tx=p2.x-p0.x, ty=p2.y-p0.y;
      const len=Math.hypot(tx,ty)||1;
      // outward normal (left of tangent for CCW; flip if needed via area)
      let nx=-ty/len, ny=tx/len;
      out[i]={x:p1.x+nx*px, y:p1.y+ny*px};
    }
    // Ensure inflate goes outward: if area shrinks, flip
    const areaIn=_polyArea(pts), areaOut=_polyArea(out);
    if(Math.abs(areaOut)<Math.abs(areaIn)){
      for(let i=0;i<n;i++){
        const p0=pts[(i-1+n)%n], p1=pts[i], p2=pts[(i+1)%n];
        let tx=p2.x-p0.x, ty=p2.y-p0.y;
        const len=Math.hypot(tx,ty)||1;
        out[i]={x:p1.x+(ty/len)*px, y:p1.y+(-tx/len)*px};
      }
    }
    return out;
  }

  function _polyArea(pts){
    let a=0;
    for(let i=0;i<pts.length;i++){
      const p=pts[i], q=pts[(i+1)%pts.length];
      a+=p.x*q.y-q.x*p.y;
    }
    return a/2;
  }

  function _contourToPath(pts){
    if(!pts||!pts.length) return '';
    let d='M'+_f(pts[0].x)+','+_f(pts[0].y);
    for(let i=1;i<pts.length;i++) d+='L'+_f(pts[i].x)+','+_f(pts[i].y);
    return d+'Z';
  }

  function _pointInPoly(pts, x, y){
    if(!pts||pts.length<3) return false;
    let inside=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const xi=pts[i].x, yi=pts[i].y, xj=pts[j].x, yj=pts[j].y;
      const inter=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-9)+xi);
      if(inter) inside=!inside;
    }
    return inside;
  }

  /** Characteristic size for fade band (~7% of this). */
  const FILL_FADE_FRAC=0.07;
  function _fillCharSize(fill){
    const bb=_fillBBox(fill);
    if(bb&&bb.w>0&&bb.h>0) return Math.max(24, Math.max(bb.w, bb.h));
    if(fill&&fill.points&&fill.points.length>=3){
      let minX=fill.points[0].x, minY=fill.points[0].y, maxX=minX, maxY=minY;
      for(let i=1;i<fill.points.length;i++){
        const p=fill.points[i];
        if(p.x<minX) minX=p.x; if(p.y<minY) minY=p.y;
        if(p.x>maxX) maxX=p.x; if(p.y>maxY) maxY=p.y;
      }
      return Math.max(24, Math.max(maxX-minX, maxY-minY));
    }
    return 80;
  }
  function _fillBandPx(fill){
    return Math.max(4, _fillCharSize(fill)*FILL_FADE_FRAC);
  }

  /** Offset closed contour: px>0 outward, px<0 inward. */
  function _offsetContour(pts, px){
    if(!pts||pts.length<3||!px) return pts?pts.slice():[];
    const n=pts.length;
    const out=new Array(n);
    for(let i=0;i<n;i++){
      const p0=pts[(i-1+n)%n], p1=pts[i], p2=pts[(i+1)%n];
      let tx=p2.x-p0.x, ty=p2.y-p0.y;
      const len=Math.hypot(tx,ty)||1;
      const nx=-ty/len, ny=tx/len;
      out[i]={x:p1.x+nx*px, y:p1.y+ny*px};
    }
    const areaIn=_polyArea(pts), areaOut=_polyArea(out);
    const wantGrow=px>0;
    const grew=Math.abs(areaOut)>Math.abs(areaIn);
    if(wantGrow!==grew){
      for(let i=0;i<n;i++){
        const p0=pts[(i-1+n)%n], p1=pts[i], p2=pts[(i+1)%n];
        let tx=p2.x-p0.x, ty=p2.y-p0.y;
        const len=Math.hypot(tx,ty)||1;
        out[i]={x:p1.x+(ty/len)*px, y:p1.y+(-tx/len)*px};
      }
    }
    return out;
  }

  function _fillInnerPathD(fill, insetPx){
    if(!fill) return '';
    if(fill.points&&fill.points.length>=3&&insetPx){
      const inset=_offsetContour(fill.points, -Math.abs(insetPx));
      if(inset&&inset.length>=3&&Math.abs(_polyArea(inset))>16){
        return _contourToSmoothPath(inset)||_contourToPath(inset);
      }
    }
    return fill.d||'';
  }

  function _makeFillPattern(defs, fill){
    if(!defs||!fill) return fill.color||'#64748b';
    const pat=fill.pattern||'solid';
    if(pat==='solid'||pat==='fadeOut'||pat==='fadeIn') return fill.color||'#64748b';
    const id='inkfp-'+(fill.id||('p'+Math.random().toString(36).slice(2)));
    let old=document.getElementById(id);
    if(old) old.remove();
    const NS='http://www.w3.org/2000/svg';
    const col=fill.color||'#64748b';
    const p=document.createElementNS(NS,'pattern');
    p.setAttribute('id', id);
    p.setAttribute('patternUnits','userSpaceOnUse');
    if(pat==='lines'){
      p.setAttribute('width','8'); p.setAttribute('height','8');
      p.setAttribute('patternTransform','rotate(45)');
      const ln=document.createElementNS(NS,'line');
      ln.setAttribute('x1','0'); ln.setAttribute('y1','1');
      ln.setAttribute('x2','8'); ln.setAttribute('y2','1');
      ln.setAttribute('stroke',col); ln.setAttribute('stroke-width','2');
      p.appendChild(ln);
    } else if(pat==='hatch'){
      p.setAttribute('width','10'); p.setAttribute('height','10');
      p.setAttribute('patternTransform','rotate(45)');
      const ln=document.createElementNS(NS,'line');
      ln.setAttribute('x1','0'); ln.setAttribute('y1','0');
      ln.setAttribute('x2','0'); ln.setAttribute('y2','10');
      ln.setAttribute('stroke',col); ln.setAttribute('stroke-width','2');
      p.appendChild(ln);
      const ln2=document.createElementNS(NS,'line');
      ln2.setAttribute('x1','0'); ln2.setAttribute('y1','0');
      ln2.setAttribute('x2','10'); ln2.setAttribute('y2','0');
      ln2.setAttribute('stroke',col); ln2.setAttribute('stroke-width','2');
      p.appendChild(ln2);
    } else if(pat==='dots'){
      p.setAttribute('width','10'); p.setAttribute('height','10');
      const c=document.createElementNS(NS,'circle');
      c.setAttribute('cx','2.5'); c.setAttribute('cy','2.5'); c.setAttribute('r','1.6');
      c.setAttribute('fill',col);
      p.appendChild(c);
    } else {
      return col;
    }
    defs.appendChild(p);
    return 'url(#'+id+')';
  }

  /** Contour fade: rim from edge (~7%) or soft smaller core fading to outer edge. */
  function _makeFillFadeEl(fill){
    if(!fill||!fill.d) return null;
    const pat=fill.pattern||'solid';
    if(pat!=='fadeOut'&&pat!=='fadeIn') return null;
    const NS='http://www.w3.org/2000/svg';
    const defs=_defsEl();
    if(!defs) return null;
    const uid=String(fill.id||('f'+Math.random().toString(36).slice(2)));
    const clipId='inkfc-'+uid;
    const filtId='inkff-'+uid;
    [clipId, filtId].forEach(id=>{
      const old=document.getElementById(id);
      if(old) old.remove();
    });
    const band=_fillBandPx(fill);
    const blur=Math.max(1.1, band*0.38);
    const col=fill.color||'#64748b';
    const op=fill.opacity!=null?Math.max(0,Math.min(1,+fill.opacity)):0.55;

    const clip=document.createElementNS(NS,'clipPath');
    clip.setAttribute('id', clipId);
    const cp=document.createElementNS(NS,'path');
    cp.setAttribute('d', fill.d);
    clip.appendChild(cp);
    defs.appendChild(clip);

    const filt=document.createElementNS(NS,'filter');
    filt.setAttribute('id', filtId);
    filt.setAttribute('x','-30%'); filt.setAttribute('y','-30%');
    filt.setAttribute('width','160%'); filt.setAttribute('height','160%');
    const fe=document.createElementNS(NS,'feGaussianBlur');
    fe.setAttribute('in','SourceGraphic');
    fe.setAttribute('stdDeviation', String(_f(blur)));
    filt.appendChild(fe);
    defs.appendChild(filt);

    const g=document.createElementNS(NS,'g');
    g.setAttribute('clip-path','url(#'+clipId+')');
    g.setAttribute('data-ink-fill-id', fill.id||'');
    g.setAttribute('data-ink-id', fill.id||'');
    g.setAttribute('data-ink-kind', 'fill');
    g.setAttribute('data-ink-op', String(op));
    g.setAttribute('data-ink-fade', pat);
    if(op<1) g.setAttribute('opacity', String(op));
    g.style.pointerEvents='none';

    if(pat==='fadeIn'){
      // Color along the edge → transparent after ~7% inward
      const p=document.createElementNS(NS,'path');
      p.setAttribute('d', fill.d);
      p.setAttribute('fill','none');
      p.setAttribute('stroke', col);
      p.setAttribute('stroke-width', String(_f(band*2)));
      p.setAttribute('stroke-linejoin','round');
      p.setAttribute('stroke-linecap','round');
      p.setAttribute('filter','url(#'+filtId+')');
      g.appendChild(p);
    } else {
      // Smaller solid core; band to outer edge fades to transparent
      const p=document.createElementNS(NS,'path');
      p.setAttribute('d', _fillInnerPathD(fill, band));
      p.setAttribute('fill', col);
      p.setAttribute('stroke','none');
      p.setAttribute('filter','url(#'+filtId+')');
      g.appendChild(p);
    }
    return g;
  }

  function _makeFillSvgEl(fill){
    if(!fill||!fill.d) return null;
    const pat=fill.pattern||'solid';
    if(pat==='fadeOut'||pat==='fadeIn') return _makeFillFadeEl(fill);
    const NS='http://www.w3.org/2000/svg';
    const defs=_defsEl();
    const paint=_makeFillPattern(defs, fill);
    const el=document.createElementNS(NS,'path');
    el.setAttribute('d', fill.d);
    el.setAttribute('fill', paint);
    el.setAttribute('stroke','none');
    el.setAttribute('data-ink-fill-id', fill.id||'');
    el.setAttribute('data-ink-id', fill.id||'');
    el.setAttribute('data-ink-kind', 'fill');
    const op=fill.opacity!=null?Math.max(0,Math.min(1,+fill.opacity)):0.55;
    el.setAttribute('data-ink-op', String(op));
    if(op<1) el.setAttribute('opacity', String(op));
    el.style.pointerEvents='none';
    return el;
  }

  function _makeFillSelHalo(fill){
    if(!fill||!fill.d) return null;
    const NS='http://www.w3.org/2000/svg';
    const el=document.createElementNS(NS,'path');
    el.setAttribute('d', fill.d);
    el.setAttribute('fill','none');
    el.setAttribute('stroke', _accentColor());
    el.setAttribute('stroke-width','3');
    el.setAttribute('stroke-dasharray','6 4');
    el.setAttribute('opacity','0.75');
    el.setAttribute('class','ink-sel-halo');
    el.style.pointerEvents='none';
    return el;
  }

  function _rebuildFillsSvg(){
    const g=_ensureFillLayer();
    if(!g) return;
    g.innerHTML='';
    const fills=_fillsArr()||[];
    fills.forEach(f=>{
      if(f&&f.id&&_selInkIds.has(f.id)){
        const halo=_makeFillSelHalo(f);
        if(halo) g.appendChild(halo);
      }
      const el=_makeFillSvgEl(f);
      if(el) g.appendChild(el);
    });
  }

  function _pickFillAt(x, y){
    const fills=_fillsArr();
    if(!fills||!fills.length) return null;
    for(let i=fills.length-1;i>=0;i--){
      const f=fills[i];
      if(f&&f.points&&_pointInPoly(f.points, x, y)) return f;
    }
    return null;
  }

  function _bucketFillAt(x, y){
    const gap=_fillGap|0;
    // Mask covers slide + any ink outside so closures past the edge still seal
    let mask=_buildFillMask(x, y);
    const sx0=Math.round((x-mask.ox)*mask.scale);
    const sy0=Math.round((y-mask.oy)*mask.scale);
    let flood=_tryClosedFlood(mask.barrier, mask.w, mask.h, sx0, sy0);
    let usedGap=0;

    // Open shape: draw imaginary line(s) only between endpoints within gap
    if(!flood && gap>0){
      const sealed=_sealWithEndpointBridges(
        mask.barrier, mask.w, mask.h, mask.scale, gap, sx0, sy0, mask.ox, mask.oy
      );
      if(sealed){
        mask={barrier:sealed.barrier, w:mask.w, h:mask.h, scale:mask.scale, avgW:mask.avgW, ox:mask.ox, oy:mask.oy};
        flood=sealed.flood;
        usedGap=gap;
      }
    }
    if(!flood){
      if(typeof toast==='function') toast(typeof t==='function'?t('drawFillFail'):'Не удалось залить область','err');
      return false;
    }

    let contour=_traceMaskContour(flood.filled, mask.w, mask.h);
    if(!contour) return false;
    contour=contour.map(p=>({
      x:p.x/mask.scale+mask.ox,
      y:p.y/mask.scale+mask.oy
    }));
    contour=_refineFillContour(contour);

    // Slight tuck under stroke — same for closed and bridged-open
    const avgW=mask.avgW||6;
    const inflate=Math.max(0.9, Math.min(avgW*0.2, avgW*0.4));
    contour=_inflateContour(contour, inflate);
    contour=_laplacianSmooth(contour, 1, 0.22);
    contour=_resampleClosed(contour, 2.8);

    const d=_contourToSmoothPath(contour);
    if(!d) return false;
    if(typeof pushUndo==='function') pushUndo();
    const fills=_fillsArr();
    _syncInkIdCounters();
    const fill={
      id:'fill'+(++_fillEc),
      color:_color,
      colorScheme:_colorScheme||null,
      opacity:Math.max(0.05,Math.min(1,_fillOpacity/100)),
      pattern:_fillPattern||'solid',
      d:d,
      points:contour,
      gapUsed:usedGap,
      z:_nextInkZ()
    };
    fills.push(fill);
    _ensureInkHostForItems([fill], fill.groupId||null);
    _invalidateInkCache();
    redrawInk();
    _setInkSelection([fill.id], {expandGroup:false});
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
    return true;
  }

  function _selectedFills(){
    const fills=_fillsArr();
    if(!fills||!_selInkIds.size) return [];
    return fills.filter(f=>f&&_selInkIds.has(f.id));
  }

  function _applyToSelectedFills(mutator){
    const list=_selectedFills();
    if(!list.length) return false;
    if(typeof pushUndo==='function') pushUndo();
    list.forEach(mutator);
    _invalidateInkCache();
    redrawInk();
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
    syncDrawPropsUI();
    return true;
  }

  function setFillPattern(pat){
    if(pat!=='solid'&&pat!=='fadeOut'&&pat!=='fadeIn'&&pat!=='lines'&&pat!=='hatch'&&pat!=='dots') return;
    if(_selectedFills().length){
      _applyToSelectedFills(f=>{ f.pattern=pat; });
      return;
    }
    _fillPattern=pat;
    _savePrefs();
    syncDrawPropsUI();
  }

  function setFillGap(px){
    const g=+px;
    if([0,10,20,30,50].indexOf(g)<0) return;
    _fillGap=g;
    _savePrefs();
    syncDrawPropsUI();
  }

  function _fillGapIconSvg(gap){
    // Full ring, or ring with gap at top via stroke-dasharray (reliable vs arc flags)
    const r=7.5, circ=2*Math.PI*r;
    if(!gap||gap<=0){
      return '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="7.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
    }
    const gapFrac=gap===10?0.14:gap===20?0.22:gap===30?0.32:0.42;
    const gapLen=circ*gapFrac;
    const dash=(circ-gapLen).toFixed(2);
    const gapStr=gapLen.toFixed(2);
    return '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="'+dash+' '+gapStr+'" transform="rotate(-90 11 11)"/></svg>';
  }

  function setFillOpacity(v){
    const pct=Math.max(5,Math.min(100,+v||55));
    if(_selectedFills().length){
      _applyToSelectedFills(f=>{ f.opacity=pct/100; });
      const el=document.getElementById('draw-fill-opacity');
      if(el) el.value=pct;
      return;
    }
    _fillOpacity=pct;
    _savePrefs();
    const el=document.getElementById('draw-fill-opacity');
    if(el){
      el.value=_fillOpacity;
      if(typeof refreshNumScrubber==='function') refreshNumScrubber(el);
    }
  }

  function _fillMarkup(fills){
    if(!fills||!fills.length) return '';
    let defs='', body='';
    fills.forEach(f=>{
      if(!f||!f.d) return;
      const col=f.color||'#64748b';
      const op=f.opacity!=null?Math.max(0,Math.min(1,+f.opacity)):0.55;
      const pat=f.pattern||'solid';
      const uid=f.id||Math.random().toString(36).slice(2);
      const opAttr=op<1?' opacity="'+op+'"':'';

      if(pat==='fadeIn'||pat==='fadeOut'){
        const band=_fillBandPx(f);
        const blur=Math.max(1.1, band*0.38);
        const clipId='efc-'+uid;
        const filtId='eff-'+uid;
        defs+='<clipPath id="'+clipId+'"><path d="'+f.d+'"/></clipPath>';
        defs+='<filter id="'+filtId+'" x="-30%" y="-30%" width="160%" height="160%">'
          +'<feGaussianBlur in="SourceGraphic" stdDeviation="'+_f(blur)+'"/>'
          +'</filter>';
        if(pat==='fadeIn'){
          body+='<g data-ink-id="'+(f.id||'')+'" data-ink-kind="fill" data-ink-op="'+op+'" data-ink-fade="fadeIn" clip-path="url(#'+clipId+')"'+opAttr+'>'
            +'<path d="'+f.d+'" fill="none" stroke="'+col+'" stroke-width="'+_f(band*2)+'" stroke-linejoin="round" stroke-linecap="round" filter="url(#'+filtId+')"/>'
            +'</g>';
        } else {
          const inner=_fillInnerPathD(f, band);
          body+='<g data-ink-id="'+(f.id||'')+'" data-ink-kind="fill" data-ink-op="'+op+'" data-ink-fade="fadeOut" clip-path="url(#'+clipId+')"'+opAttr+'>'
            +'<path d="'+inner+'" fill="'+col+'" stroke="none" filter="url(#'+filtId+')"/>'
            +'</g>';
        }
        return;
      }

      let paint=col;
      if(pat!=='solid'){
        const id='efp-'+uid;
        if(pat==='lines'){
          defs+='<pattern id="'+id+'" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><line x1="0" y1="1" x2="8" y2="1" stroke="'+col+'" stroke-width="2"/></pattern>';
          paint='url(#'+id+')';
        } else if(pat==='hatch'){
          defs+='<pattern id="'+id+'" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="'+col+'" stroke-width="2"/><line x1="0" y1="0" x2="10" y2="0" stroke="'+col+'" stroke-width="2"/></pattern>';
          paint='url(#'+id+')';
        } else if(pat==='dots'){
          defs+='<pattern id="'+id+'" patternUnits="userSpaceOnUse" width="10" height="10"><circle cx="2.5" cy="2.5" r="1.6" fill="'+col+'"/></pattern>';
          paint='url(#'+id+')';
        }
      }
      body+='<path data-ink-id="'+(f.id||'')+'" data-ink-kind="fill" data-ink-op="'+op+'" d="'+f.d+'" fill="'+paint+'" stroke="none"'+opAttr+'/>';
    });
    return (defs?'<defs>'+defs+'</defs>':'')+body;
  }

  function _drawFillThumb(ctx, fill, sx, sy){
    if(!ctx||!fill||!fill.points||fill.points.length<3) return;
    sx=sx||1; sy=sy||1;
    const sc=Math.min(sx,sy);
    ctx.save();
    ctx.globalAlpha=fill.opacity!=null?+fill.opacity:0.55;
    const col=fill.color||'#64748b';
    const pat=fill.pattern||'solid';
    ctx.beginPath();
    ctx.moveTo(fill.points[0].x*sx, fill.points[0].y*sy);
    for(let i=1;i<fill.points.length;i++) ctx.lineTo(fill.points[i].x*sx, fill.points[i].y*sy);
    ctx.closePath();
    if(pat==='fadeIn'){
      const band=_fillBandPx(fill)*sc;
      ctx.save();
      ctx.clip();
      ctx.strokeStyle=col;
      ctx.lineJoin='round';
      ctx.lineCap='round';
      ctx.lineWidth=Math.max(2, band*2);
      ctx.shadowColor=col;
      ctx.shadowBlur=Math.max(1, band*0.55);
      ctx.stroke();
      ctx.restore();
    } else if(pat==='fadeOut'){
      const band=_fillBandPx(fill);
      const inset=_offsetContour(fill.points, -band);
      ctx.save();
      ctx.clip();
      if(inset&&inset.length>=3){
        ctx.beginPath();
        ctx.moveTo(inset[0].x*sx, inset[0].y*sy);
        for(let i=1;i<inset.length;i++) ctx.lineTo(inset[i].x*sx, inset[i].y*sy);
        ctx.closePath();
      }
      ctx.fillStyle=col;
      ctx.shadowColor=col;
      ctx.shadowBlur=Math.max(1, band*0.55*sc);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle=col;
      ctx.fill();
    }
    ctx.restore();
  }



  let _inkSvgDirty=true;
  let _redrawRaf=0;
  let _pendingEraseUndo=false;

  function _invalidateInkCache(){
    _inkSvgDirty=true;
  }

  function _paintHostBucket(hostEl, host, bucket){
    if(!hostEl||!host) return;
    let inner=hostEl.querySelector('.ink-host-inner');
    if(!bucket||((!bucket.strokes||!bucket.strokes.length)&&(!bucket.fills||!bucket.fills.length))){
      if(inner) inner.remove();
      return;
    }
    if(!inner){
      inner=document.createElement('div');
      inner.className='ink-host-inner';
      hostEl.appendChild(inner);
    }
    const hx=host.x||0, hy=host.y||0;
    const hw=Math.max(1, host.w||1), hh=Math.max(1, host.h||1);
    const W=typeof canvasW!=='undefined'?canvasW:1200;
    const H=typeof canvasH!=='undefined'?canvasH:675;
    inner.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;';
    inner.innerHTML=buildInkSvgMarkup(bucket.strokes, W, H, bucket.fills, {
      offsetX:-hx, offsetY:-hy, width:hw, height:hh
    });
    const svg=inner.querySelector('svg');
    if(!svg) return;
    (bucket.fills||[]).forEach(f=>{
      if(f&&f.id&&_selInkIds.has(f.id)){
        const halo=_makeFillSelHalo(f);
        if(halo) svg.insertBefore(halo, svg.firstChild);
      }
    });
    (bucket.strokes||[]).forEach(s=>{
      if(s&&s.id&&_selInkIds.has(s.id)){
        const halo=_makeSelHalo(s,1,1);
        if(halo) svg.insertBefore(halo, svg.firstChild);
      }
    });
  }

  function _paintAllHostInk(split){
    const cv=document.getElementById('canvas');
    if(!cv||!split) return;
    cv.querySelectorAll('.el[data-type="inkhost"]').forEach(hostEl=>{
      const id=hostEl.dataset.id;
      const bucket=split.byHost&&split.byHost[id];
      const host=(typeof slides!=='undefined'&&slides[cur]&&slides[cur].els||[])
        .find(d=>d&&d.id===id);
      _paintHostBucket(hostEl, host, bucket);
    });
  }

  function _rebuildCommittedSvg(){
    // Drop hosts whose ink was erased/deleted, then host any free strokes
    try{ _pruneOrphanInkHosts(); }catch(e){}
    const els0=(typeof slides!=='undefined'&&slides[cur]&&slides[cur].els)||[];
    let split0=splitInkForHosts(_inkArr()||[], _fillsArr()||[], els0);
    if((split0.freeStrokes&&split0.freeStrokes.length)||(split0.freeFills&&split0.freeFills.length)){
      try{ _ensureHostsForAllInk(); }catch(e){}
    }
    const els=(typeof slides!=='undefined'&&slides[cur]&&slides[cur].els)||[];
    const split=splitInkForHosts(_inkArr()||[], _fillsArr()||[], els);
    _paintAllHostInk(split);

    const gFill=_ensureFillLayer();
    if(gFill) gFill.innerHTML='';
    const g=_committedEl();
    if(g){
      g.innerHTML='';
      // Free leftovers (if any): interleaved by z into one group
      const stack=_inkStackSorted(split.freeStrokes||[], split.freeFills||[]);
      stack.forEach(x=>{
        if(!x||!x.item) return;
        if(x.kind==='fill'){
          if(x.item.id&&_selInkIds.has(x.item.id)){
            const halo=_makeFillSelHalo(x.item);
            if(halo) g.appendChild(halo);
          }
          const el=_makeFillSvgEl(x.item);
          if(el) g.appendChild(el);
        } else {
          if(x.item.id&&_selInkIds.has(x.item.id)){
            const halo=_makeSelHalo(x.item,1,1);
            if(halo) g.appendChild(halo);
          }
          const el=_makeStrokeSvgEl(x.item,1,1);
          if(el) g.appendChild(el);
        }
      });
    }
    _inkSvgDirty=false;
  }

  function _updateLiveSvg(){
    const g=_liveEl();
    if(g) g.innerHTML='';
    if(!_stroke){ _clearLiveCanvas(); return; }
    // Points stay in JS; live paint is canvas — full quality without SVG node spam
    _paintLiveStroke(_stroke);
  }

  function redrawInk(){
    _ensureSvgSize();
    if(_inkSvgDirty) _rebuildCommittedSvg();
    _updateLiveSvg();
  }

  function _scheduleRedraw(){
    if(_redrawRaf) return;
    _redrawRaf=requestAnimationFrame(()=>{
      _redrawRaf=0;
      // Live only — committed stays until invalidate
      if(_inkSvgDirty) _rebuildCommittedSvg();
      _updateLiveSvg();
    });
  }

  function _appendCommittedStroke(stroke){
    const g=_committedEl();
    if(!g||!stroke) return;
    const el=_makeStrokeSvgEl(stroke,1,1);
    if(el) g.appendChild(el);
    _inkSvgDirty=false;
  }

  function renderInkInto(container, ink, W, H, fills, els){
    if(!container) return;
    const prev=container.querySelector('.ink-layer');
    if(prev) prev.remove();
    // Also clear previous host-mounted ink
    container.querySelectorAll('.ink-host-inner').forEach(n=>n.remove());
    fills=fills||[];
    ink=ink||[];
    els=els||[];
    W=W||(typeof canvasW!=='undefined'?canvasW:1200);
    H=H||(typeof canvasH!=='undefined'?canvasH:675);
    const split=splitInkForHosts(ink, fills, els);
    Object.keys(split.byHost).forEach(hid=>{
      const bucket=split.byHost[hid];
      const hostEl=container.querySelector('.psel[data-id="'+hid+'"], .el[data-id="'+hid+'"]');
      if(!hostEl||(!bucket.strokes.length&&!bucket.fills.length)) return;
      const hx=bucket.host.x||0, hy=bucket.host.y||0;
      const hw=Math.max(1, bucket.host.w||1), hh=Math.max(1, bucket.host.h||1);
      const inner=document.createElement('div');
      inner.className='ink-host-inner';
      inner.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;';
      // SVG in slide coords, shifted so host origin is 0,0
      const svg=buildInkSvgMarkup(bucket.strokes, W, H, bucket.fills, {offsetX:-hx, offsetY:-hy, width:hw, height:hh});
      inner.innerHTML=svg;
      hostEl.appendChild(inner);
    });
    if(!split.freeStrokes.length&&!split.freeFills.length) return;
    const wrap=document.createElement('div');
    wrap.className='ink-layer';
    wrap.style.cssText='position:absolute;inset:0;z-index:5;pointer-events:none;overflow:visible;';
    wrap.innerHTML=buildInkSvgMarkup(split.freeStrokes, W, H, split.freeFills);
    container.appendChild(wrap);
  }

  /** Rasterize vector stroke into a 2D context (thumbnails). */
  function _drawStroke(ctx, stroke, sx, sy){
    if(!stroke||!stroke.points||!stroke.points.length||!ctx) return;
    sx=sx||1; sy=sy||1;
    const color=stroke.color||'#1e293b';
    const op=stroke.opacity!=null?Math.max(0,Math.min(1,+stroke.opacity)):1;
    ctx.save();
    ctx.fillStyle=color;
    ctx.strokeStyle=color;
    try{
      if(_isBrushFamily(stroke.tool)){
        const stamps=_brushStamps(stroke,sx,sy);
        if(stroke.tool==='neon') _paintNeonStamps(ctx, stamps, color, stroke, op);
        else {
          ctx.globalAlpha=op;
          ctx.fillStyle=color;
          _fillBrushStamps(ctx, stamps);
        }
      } else {
        const g=_hardStrokeGeom(
          stroke.tool==='marker'?Object.assign({},stroke,{pressure:false}):stroke,
          sx, sy
        );
        if(!g){ ctx.restore(); return; }
        ctx.globalAlpha=op;
        if(g.circle){
          ctx.beginPath();
          ctx.arc(g.circle.cx, g.circle.cy, Math.max(0.04, g.circle.r), 0, Math.PI*2);
          ctx.fill();
        } else if(g.d){
          ctx.lineWidth=g.width;
          ctx.lineCap='round';
          ctx.lineJoin='round';
          ctx.stroke(new Path2D(g.d));
        }
      }
    }catch(e){}
    ctx.restore();
  }

  function drawThumbInk(ctx, ink, sx, sy, fills){
    if(!ctx) return;
    const stack=_inkStackSorted(ink||[], fills||[]);
    stack.forEach(x=>{
      if(!x||!x.item) return;
      if(x.kind==='fill') _drawFillThumb(ctx, x.item, sx, sy);
      else _drawStroke(ctx, x.item, sx, sy);
    });
  }

  function _strokeMarkupOne(s){
    if(!s) return '';
    const color=s.color||'#1e293b';
    const op=s.opacity!=null?Math.max(0,Math.min(1,+s.opacity)):1;
    if(_isBrushFamily(s.tool)){
      if(s.tool==='neon') return _neonStampMarkup(null, color, s, op);
      const stamps=_brushStamps(s,1,1);
      if(!stamps.length) return '';
      const center=_strokeCenterlineAttr(s,1,1);
      const cAttr=center
        ?(' data-ink-center="'+center.d+'" data-ink-sw="'+center.width+'" data-ink-sc="'+center.color+'" data-ink-so="'+center.opacity+'"')
        :'';
      let html='<g data-ink-id="'+(s.id||'')+'" data-ink-kind="stroke"'+cAttr+(op<1?' opacity="'+op+'"':'')+'>';
      for(let i=0;i<stamps.length;i++){
        const st=stamps[i];
        if(st.kind==='circle'){
          html+='<circle cx="'+_f(st.cx)+'" cy="'+_f(st.cy)+'" r="'+_f(Math.max(0.04,st.r))+'" fill="'+color+'" stroke="none"/>';
        } else if(st.kind==='quad'&&st.d){
          html+='<path fill="'+color+'" stroke="none" d="'+st.d+'"/>';
        }
      }
      return html+'</g>';
    }
    const g=_hardStrokeGeom(
      s.tool==='marker'?Object.assign({},s,{pressure:false}):s,
      1,1
    );
    if(!g) return '';
    const idAttr=' data-ink-id="'+(s.id||'')+'" data-ink-kind="stroke"';
    if(g.circle){
      return '<g'+idAttr+(op<1?' opacity="'+op+'"':'')+'><circle cx="'+_f(g.circle.cx)+'" cy="'+_f(g.circle.cy)+'" r="'+_f(Math.max(0.04,g.circle.r))+'" fill="'+color+'" stroke="none"/></g>';
    }
    if(g.d){
      return '<path'+idAttr+' fill="none" stroke="'+color+'" stroke-width="'+g.width+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+op+'" d="'+g.d+'"/>';
    }
    return '';
  }

  function buildInkSvgMarkup(ink, W, H, fills, opts){
    opts=opts||{};
    W=W||(typeof canvasW!=='undefined'?canvasW:1200);
    H=H||(typeof canvasH!=='undefined'?canvasH:675);
    fills=fills||[];
    if((!ink||!ink.length)&&!fills.length) return '';
    const ox=opts.offsetX||0, oy=opts.offsetY||0;
    const vw=opts.width!=null?opts.width:W;
    const vh=opts.height!=null?opts.height:H;
    const vbX=opts.offsetX!=null?-ox:0;
    const vbY=opts.offsetY!=null?-oy:0;
    const vbW=opts.width!=null?vw:W;
    const vbH=opts.height!=null?vh:H;
    let inner='';
    const stack=_inkStackSorted(ink||[], fills||[]);
    stack.forEach(x=>{
      if(!x||!x.item) return;
      if(x.kind==='fill') inner+=_fillMarkup([x.item]);
      else inner+=_strokeMarkupOne(x.item);
    });
    const viewBox=(opts.offsetX!=null||opts.offsetY!=null)
      ?(_f(vbX)+' '+_f(vbY)+' '+_f(vbW)+' '+_f(vbH))
      :('0 0 '+W+' '+H);
    const cssW=opts.width!=null?'100%':W;
    const cssH=opts.height!=null?'100%':H;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="'+cssW+'" height="'+cssH+'" viewBox="'+viewBox+'" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none">'+inner+'</svg>';
  }

  function _canvasPoint(e){
    const canvas=document.getElementById('canvas');
    if(!canvas) return null;
    const r=canvas.getBoundingClientRect();
    const W=typeof canvasW!=='undefined'?canvasW:1200;
    const H=typeof canvasH!=='undefined'?canvasH:675;
    const x=(e.clientX-r.left)/Math.max(1,r.width)*W;
    const y=(e.clientY-r.top)/Math.max(1,r.height)*H;
    let p=0.5;
    if(e.pointerType==='pen'||(e.pressure!=null&&e.pressure>0)){
      p=Math.max(0.05, Math.min(1, e.pressure||0.5));
    } else if(e.pointerType==='touch'){
      p=0.55;
    }
    return {x,y,p,t:(typeof performance!=='undefined'?performance.now():Date.now())};
  }

  function _distToSeg(px, py, ax, ay, bx, by){
    const abx=bx-ax, aby=by-ay;
    const len2=abx*abx+aby*aby;
    if(len2<1e-8) return Math.hypot(px-ax, py-ay);
    let t=((px-ax)*abx+(py-ay)*aby)/len2;
    t=Math.max(0, Math.min(1, t));
    return Math.hypot(px-(ax+t*abx), py-(ay+t*aby));
  }

  /** True if eraser circle hits any point or segment of the stroke. */
  function _strokeHits(stroke, x, y, radius){
    const pts=stroke.points||[];
    if(!pts.length) return false;
    for(let i=0;i<pts.length;i++){
      if(Math.hypot(pts[i].x-x, pts[i].y-y)<=radius) return true;
      if(i>0&&_distToSeg(x,y,pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y)<=radius) return true;
    }
    return false;
  }

  /** Eraser removes intersecting strokes and fills. */
  function _eraseAt(x, y, radius){
    let changed=false;
    const ink=_inkArr();
    if(ink&&ink.length){
      const before=ink.length;
      const next=ink.filter(s=>!_strokeHits(s, x, y, radius));
      if(next.length!==before){
        if(_pendingEraseUndo){
          if(typeof pushUndo==='function') pushUndo();
          _pendingEraseUndo=false;
        }
        const alive=new Set(next.map(s=>s&&s.id).filter(Boolean));
        [..._selInkIds].forEach(id=>{ if(!alive.has(id)) _selInkIds.delete(id); });
        slides[cur].ink=next;
        changed=true;
      }
    }
    const fills=_fillsArr();
    if(fills&&fills.length){
      const before=fills.length;
      const nextF=fills.filter(f=>!_fillHitsEraser(f, x, y, radius));
      if(nextF.length!==before){
        if(_pendingEraseUndo){
          if(typeof pushUndo==='function') pushUndo();
          _pendingEraseUndo=false;
        }
        const alive=new Set(nextF.map(f=>f&&f.id).filter(Boolean));
        [..._selInkIds].forEach(id=>{ if(!alive.has(id)) _selInkIds.delete(id); });
        slides[cur].inkFills=nextF;
        changed=true;
      }
    }
    return changed;
  }

  function _fillHitsEraser(f, x, y, radius){
    if(!f||!f.points||f.points.length<3) return false;
    if(_pointInPoly(f.points, x, y)) return true;
    const pts=f.points;
    for(let i=0;i<pts.length;i++){
      const a=pts[i], b=pts[(i+1)%pts.length];
      if(_distToSeg(x,y,a.x,a.y,b.x,b.y)<=radius) return true;
    }
    return false;
  }

  function _findStrokeById(id){
    const ink=_inkArr();
    if(!ink||!id) return null;
    return ink.find(s=>s&&s.id===id)||null;
  }

  function _selectedStrokes(){
    const ink=_inkArr();
    if(!ink||!_selInkIds.size) return [];
    return ink.filter(s=>s&&_selInkIds.has(s.id));
  }

  function _pickInkAmong(strokes, fills, x, y){
    let fillHit=null;
    if(fills&&fills.length){
      for(let i=fills.length-1;i>=0;i--){
        const f=fills[i];
        if(f&&f.points&&_pointInPoly(f.points, x, y)){ fillHit=f; break; }
      }
    }
    if(strokes&&strokes.length){
      for(let i=strokes.length-1;i>=0;i--){
        const s=strokes[i];
        if(!s) continue;
        const r=Math.max(8, (+s.width||4)*0.5+10);
        if(_strokeHits(s, x, y, r)){
          if(fillHit){
            const tight=Math.max(4, (+s.width||4)*0.55+2);
            if(!_strokeHits(s, x, y, tight)) return fillHit;
          }
          return s;
        }
      }
    }
    return fillHit;
  }

  function _objectBlocksInk(el, clientX, clientY){
    if(!el||el.dataset.objHidden==='1') return false;
    if(el.dataset.type==='inkhost') return false;
    const r=el.getBoundingClientRect();
    if(clientX<r.left||clientX>r.right||clientY<r.top||clientY>r.bottom) return false;
    if(typeof _pointHitsEl==='function') return _pointHitsEl(el, clientX, clientY);
    return true;
  }

  function _pickInkAt(x, y, ev){
    const cv=document.getElementById('canvas');
    let clientX=ev&&ev.clientX, clientY=ev&&ev.clientY;
    if(clientX==null||clientY==null){
      const canvas=document.getElementById('canvas');
      if(canvas){
        const r=canvas.getBoundingClientRect();
        const W=typeof canvasW!=='undefined'?canvasW:1200;
        const H=typeof canvasH!=='undefined'?canvasH:675;
        clientX=r.left+(x/Math.max(1,W))*r.width;
        clientY=r.top+(y/Math.max(1,H))*r.height;
      }
    }
    const els=cv?Array.from(cv.querySelectorAll(':scope > .el')).filter(e=>!e.classList.contains('decor-el')):[];
    const slideEls=(typeof slides!=='undefined'&&slides[cur]&&slides[cur].els)||[];
    if(els.length&&clientX!=null){
      for(let i=els.length-1;i>=0;i--){
        const el=els[i];
        if(el.dataset.objHidden==='1') continue;
        if(el.dataset.type==='inkhost'){
          const host=slideEls.find(d=>d&&d.id===el.dataset.id);
          if(!host) continue;
          const ids=new Set(host.inkIds||[]);
          if(host.groupId){
            (_inkArr()||[]).forEach(s=>{ if(s&&s.groupId===host.groupId) ids.add(s.id); });
            (_fillsArr()||[]).forEach(f=>{ if(f&&f.groupId===host.groupId) ids.add(f.id); });
          }
          const strokes=(_inkArr()||[]).filter(s=>s&&ids.has(s.id));
          const fills=(_fillsArr()||[]).filter(f=>f&&ids.has(f.id));
          const hit=_pickInkAmong(strokes, fills, x, y);
          if(hit) return hit;
          continue;
        }
        if(_objectBlocksInk(el, clientX, clientY)) return null;
      }
    }
    const split=splitInkForHosts(_inkArr()||[], _fillsArr()||[], slideEls);
    return _pickInkAmong(split.freeStrokes, split.freeFills, x, y);
  }

  /** For pipette: also sample free ink painted above objects (pointer-events:none). */
  function _pipettePickInk(x, y, ev){
    let hit=_pickInkAt(x, y, ev);
    if(hit) return hit;
    const slideEls=(typeof slides!=='undefined'&&slides[cur]&&slides[cur].els)||[];
    const split=splitInkForHosts(_inkArr()||[], _fillsArr()||[], slideEls);
    return _pickInkAmong(split.freeStrokes, split.freeFills, x, y);
  }
  window._pipettePickInk=_pipettePickInk;

  function _strokeBBox(s){
    const pts=s.points||[];
    if(!pts.length) return null;
    let minX=pts[0].x, minY=pts[0].y, maxX=pts[0].x, maxY=pts[0].y;
    for(let i=1;i<pts.length;i++){
      const p=pts[i];
      if(p.x<minX) minX=p.x; if(p.y<minY) minY=p.y;
      if(p.x>maxX) maxX=p.x; if(p.y>maxY) maxY=p.y;
    }
    const pad=Math.max(2, (+s.width||4)*0.5)+(s.tool==='neon'?_neonGlowExtent(s.width, _neonBrightPct(s)):0);
    return {x:minX-pad, y:minY-pad, w:(maxX-minX)+pad*2, h:(maxY-minY)+pad*2};
  }

  function _fillBBox(f){
    const pts=f&&f.points||[];
    if(!pts.length) return null;
    let minX=pts[0].x, minY=pts[0].y, maxX=pts[0].x, maxY=pts[0].y;
    for(let i=1;i<pts.length;i++){
      const p=pts[i];
      if(p.x<minX) minX=p.x; if(p.y<minY) minY=p.y;
      if(p.x>maxX) maxX=p.x; if(p.y>maxY) maxY=p.y;
    }
    return {x:minX, y:minY, w:maxX-minX, h:maxY-minY};
  }

  function _rectsOverlap(a, b){
    return !(a.x+a.w<b.x || b.x+b.w<a.x || a.y+a.h<b.y || b.y+b.h<a.y);
  }

  function _strokeIntersectsRect(s, rx, ry, rw, rh){
    const bb=_strokeBBox(s);
    if(!bb) return false;
    const R={x:rx,y:ry,w:rw,h:rh};
    if(!_rectsOverlap(bb, R)) return false;
    const pts=s.points||[];
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      if(p.x>=rx&&p.x<=rx+rw&&p.y>=ry&&p.y<=ry+rh) return true;
    }
    // Segment crosses box
    for(let i=1;i<pts.length;i++){
      if(_segHitsRect(pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y,rx,ry,rw,rh)) return true;
    }
    return false;
  }

  function _fillIntersectsRect(f, rx, ry, rw, rh){
    const bb=_fillBBox(f);
    if(!bb) return false;
    const R={x:rx,y:ry,w:rw,h:rh};
    if(!_rectsOverlap(bb, R)) return false;
    const pts=f.points||[];
    // Any vertex inside
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      if(p.x>=rx&&p.x<=rx+rw&&p.y>=ry&&p.y<=ry+rh) return true;
    }
    // Rect center or corners inside fill
    const samples=[
      {x:rx+rw/2,y:ry+rh/2},
      {x:rx,y:ry},{x:rx+rw,y:ry},{x:rx,y:ry+rh},{x:rx+rw,y:ry+rh}
    ];
    for(let i=0;i<samples.length;i++){
      if(_pointInPoly(pts, samples[i].x, samples[i].y)) return true;
    }
    // Edge crosses rect
    for(let i=0;i<pts.length;i++){
      const a=pts[i], b=pts[(i+1)%pts.length];
      if(_segHitsRect(a.x,a.y,b.x,b.y,rx,ry,rw,rh)) return true;
    }
    return false;
  }

  function _collectInkIdsInRect(rx, ry, rw, rh){
    const ids=[];
    const ink=_inkArr()||[];
    ink.forEach(s=>{
      if(s&&s.id&&_strokeIntersectsRect(s,rx,ry,rw,rh)) ids.push(s.id);
    });
    const fills=_fillsArr()||[];
    fills.forEach(f=>{
      if(f&&f.id&&_fillIntersectsRect(f,rx,ry,rw,rh)) ids.push(f.id);
    });
    return ids;
  }

  function _segHitsRect(x1,y1,x2,y2,rx,ry,rw,rh){
    // Liang-Barsky-ish quick reject already done via bbox; sample midpoints
    for(let t=0;t<=1;t+=0.2){
      const x=x1+(x2-x1)*t, y=y1+(y2-y1)*t;
      if(x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh) return true;
    }
    return false;
  }

  function _expandInkGroupIds(idSet){
    const ink=_inkArr()||[];
    const fills=_fillsArr()||[];
    const groups=new Set();
    idSet.forEach(id=>{
      const s=ink.find(x=>x&&x.id===id);
      if(s&&s.groupId) groups.add(s.groupId);
      const f=fills.find(x=>x&&x.id===id);
      if(f&&f.groupId) groups.add(f.groupId);
    });
    if(!groups.size) return idSet;
    const out=new Set(idSet);
    ink.forEach(s=>{
      if(s&&s.groupId&&groups.has(s.groupId)) out.add(s.id);
    });
    fills.forEach(f=>{
      if(f&&f.groupId&&groups.has(f.groupId)) out.add(f.id);
    });
    // Also include inkhost els with same groupId (via selection expand in group module)
    return out;
  }

  function _setInkSelection(ids, opts){
    opts=opts||{};
    const next=opts.expandGroup===false?new Set(ids):_expandInkGroupIds(new Set(ids));
    // New selection → reset rotation pivot (same feel as picking another shape)
    const prevKey=[..._selInkIds].sort().join(',');
    const nextKey=[...next].sort().join(',');
    if(prevKey!==nextKey) _inkPivotOff={x:0,y:0};
    _selInkIds=next;
    // Rubber-band may select objects + ink together — don't wipe object sel
    if(_selInkIds.size && !opts.keepObjectSel){
      if(typeof desel==='function') try{ desel(); }catch(e){}
      if(typeof clearMultiSel==='function') try{ clearMultiSel(); }catch(e){}
    }
    // Expand to object members sharing groupId with selected ink
    if(opts.expandGroup!==false && _selInkIds.size && opts.keepObjectSel!==false){
      const gids=new Set();
      (_inkArr()||[]).forEach(s=>{ if(s&&_selInkIds.has(s.id)&&s.groupId) gids.add(s.groupId); });
      (_fillsArr()||[]).forEach(f=>{ if(f&&_selInkIds.has(f.id)&&f.groupId) gids.add(f.groupId); });
      if(gids.size&&typeof slides!=='undefined'&&slides[cur]){
        const cv=document.getElementById('canvas');
        (slides[cur].els||[]).forEach(d=>{
          if(!d||!d.groupId||!gids.has(d.groupId)) return;
          const el=cv&&cv.querySelector('.el[data-id="'+d.id+'"]');
          if(el&&typeof addToMultiSel==='function'&&!(typeof multiSel!=='undefined'&&multiSel.has(el))){
            try{ addToMultiSel(el); }catch(e){}
          }
        });
      }
    }
    _invalidateInkCache();
    redrawInk();
    if(!opts.silent) _syncDrawSidePanel();
    // Purple group chrome — ink click leaves sel=null, multiSel holds members
    if(typeof _updateHandlesOverlay==='function'){
      try{ _updateHandlesOverlay(); }catch(e){}
    } else if(typeof window._updateHandlesOverlay==='function'){
      try{ window._updateHandlesOverlay(); }catch(e){}
    }
    if(!opts.silent && typeof syncColorBar==='function') syncColorBar();
  }

  /** Drop leftover ink/group outline after ink sel change or delete. */
  function _refreshSelectionChromeAfterInkChange(){
    _setInkRotBBox(null);
    if(typeof window._clearGroupDocRotation==='function'){
      try{ window._clearGroupDocRotation(); }catch(e){}
    }
    try{
      if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
      else if(typeof window._updateHandlesOverlay==='function') window._updateHandlesOverlay();
    }catch(e){}
    // Handles patch may leave DOM when sel=null and no ink — force clear
    const hasObj=(typeof sel!=='undefined'&&sel)
      ||(typeof multiSel!=='undefined'&&multiSel&&multiSel.size>0);
    if(!hasObj&&!_selInkIds.size){
      const ov=document.getElementById('handles-overlay');
      if(ov) ov.innerHTML='';
      if(typeof _rotEl!=='undefined') _rotEl=null;
    }
  }

  /** Remove inkhost elements that no longer reference any remaining ink. */
  function _pruneOrphanInkHosts(){
    if(typeof slides==='undefined'||!slides[cur]) return;
    const alive=new Set();
    (_inkArr()||[]).forEach(s=>{ if(s&&s.id) alive.add(s.id); });
    (_fillsArr()||[]).forEach(f=>{ if(f&&f.id) alive.add(f.id); });
    const cv=document.getElementById('canvas');
    const keep=[];
    (slides[cur].els||[]).forEach(d=>{
      if(!d||d.type!=='inkhost'){ keep.push(d); return; }
      let ids=(d.inkIds||[]).filter(id=>alive.has(id));
      if(d.groupId){
        (_inkArr()||[]).forEach(s=>{ if(s&&s.groupId===d.groupId) ids.push(s.id); });
        (_fillsArr()||[]).forEach(f=>{ if(f&&f.groupId===d.groupId) ids.push(f.id); });
        ids=[...new Set(ids)];
      }
      if(!ids.length){
        const dom=cv&&cv.querySelector('.el[data-id="'+d.id+'"]');
        if(dom){
          if(typeof multiSel!=='undefined'&&multiSel) multiSel.delete(dom);
          if(typeof sel!=='undefined'&&sel===dom){
            try{ if(typeof pick==='function') pick(null); else sel=null; }catch(e){ sel=null; }
          }
          dom.remove();
        }
        return;
      }
      d.inkIds=ids;
      keep.push(d);
    });
    slides[cur].els=keep;
  }

  function _clearInkSelection(){
    if(!_selInkIds.size) return;
    _selInkIds=new Set();
    _setInkRotBBox(null);
    _invalidateInkCache();
    redrawInk();
    _refreshSelectionChromeAfterInkChange();
    if(typeof syncColorBar==='function') syncColorBar();
  }

  function _selectInkStroke(stroke, additive, opts){
    opts=opts||{};
    if(!stroke||!stroke.id){ _clearInkSelection(); return; }
    // Shift/Ctrl add ink without wiping text/shape/icon selection
    const keepObj=!!(additive||opts.keepObjectSel);
    if(additive){
      const next=new Set(_selInkIds);
      if(next.has(stroke.id)){
        const gid=stroke.groupId;
        if(gid){
          const ink=_inkArr()||[];
          const fills=_fillsArr()||[];
          ink.forEach(s=>{ if(s&&s.groupId===gid) next.delete(s.id); });
          fills.forEach(f=>{ if(f&&f.groupId===gid) next.delete(f.id); });
        } else next.delete(stroke.id);
        if(next.size) _setInkSelection(next, {expandGroup:false, silent:opts.silent, keepObjectSel:keepObj});
        else { _clearInkSelection(); if(!opts.silent) _syncDrawSidePanel(); }
      } else {
        next.add(stroke.id);
        _setInkSelection(next, {silent:opts.silent, keepObjectSel:keepObj});
      }
      // Sole `sel` → multiSel so ink + object share the same selection chrome / co-drag
      _ensureObjectSelInMultiWithInk();
    } else {
      _setInkSelection([stroke.id], {silent:opts.silent, keepObjectSel:!!opts.keepObjectSel});
    }
  }

  /** When ink is additively selected, keep current object selection in multiSel. */
  function _ensureObjectSelInMultiWithInk(){
    if(!_selInkIds.size) return;
    try{
      if(typeof sel!=='undefined'&&sel&&sel.dataset&&sel.dataset.type!=='inkhost'){
        if(typeof addToMultiSel==='function'){
          if(typeof multiSel==='undefined'||!multiSel||!multiSel.has(sel)) addToMultiSel(sel);
        }
      }
    }catch(e){}
  }

  function _selectionBounds(){
    return _inkItemsBBox(_selectedStrokes().concat(_selectedFills()));
  }

  function _inkItemsBBox(items){
    if(!items||!items.length) return null;
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    items.forEach(it=>{
      if(!it) return;
      const bb=(it.tool!=null)?_strokeBBox(it):_fillBBox(it);
      if(!bb) return;
      minX=Math.min(minX,bb.x); minY=Math.min(minY,bb.y);
      maxX=Math.max(maxX,bb.x+bb.w); maxY=Math.max(maxY,bb.y+bb.h);
    });
    if(!isFinite(minX)) return null;
    return {x:minX,y:minY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
  }

  function _ensureInkRubberEl(){
    let el=document.getElementById('ink-rubberband');
    if(el) return el;
    el=document.createElement('div');
    el.id='ink-rubberband';
    const host=document.getElementById('cwrap')||document.body;
    host.appendChild(el);
    return el;
  }

  function _updateInkRubberVisual(){
    const el=_ensureInkRubberEl();
    if(!_inkRubber){ el.classList.remove('show'); return; }
    const canvas=document.getElementById('canvas');
    if(!canvas) return;
    const r=canvas.getBoundingClientRect();
    const host=document.getElementById('cwrap');
    const hr=host?host.getBoundingClientRect():r;
    const W=typeof canvasW!=='undefined'?canvasW:1200;
    const H=typeof canvasH!=='undefined'?canvasH:675;
    const x0=Math.min(_inkRubber.x0,_inkRubber.x1);
    const y0=Math.min(_inkRubber.y0,_inkRubber.y1);
    const x1=Math.max(_inkRubber.x0,_inkRubber.x1);
    const y1=Math.max(_inkRubber.y0,_inkRubber.y1);
    const l=r.left-hr.left+(x0/W)*r.width;
    const t=r.top-hr.top+(y0/H)*r.height;
    const w=((x1-x0)/W)*r.width;
    const h=((y1-y0)/H)*r.height;
    el.style.left=l+'px';
    el.style.top=t+'px';
    el.style.width=Math.max(1,w)+'px';
    el.style.height=Math.max(1,h)+'px';
    el.classList.add('show');
  }

  function _hideInkRubber(){
    _inkRubber=null;
    const el=document.getElementById('ink-rubberband');
    if(el) el.classList.remove('show');
  }

  function deleteSelectedInk(){
    if(!_selInkIds.size) return false;
    const ink=_inkArr();
    const fills=_fillsArr();
    const nextInk=ink?ink.filter(s=>!s||!_selInkIds.has(s.id)):[];
    const nextFills=fills?fills.filter(f=>!f||!_selInkIds.has(f.id)):[];
    const changed=(ink&&nextInk.length!==ink.length)||(fills&&nextFills.length!==fills.length);
    if(!changed) return false;
    if(typeof pushUndo==='function') pushUndo();
    if(ink) slides[cur].ink=nextInk;
    if(fills) slides[cur].inkFills=nextFills;
    _selInkIds=new Set();
    _setInkRotBBox(null);
    _pruneOrphanInkHosts();
    // Drop co-selected inkhosts left from expandGroup
    if(typeof multiSel!=='undefined'&&multiSel&&multiSel.size){
      const drop=[];
      multiSel.forEach(el=>{
        if(el&&el.dataset&&el.dataset.type==='inkhost') drop.push(el);
      });
      drop.forEach(el=>{
        multiSel.delete(el);
        el.classList.remove('multi-sel','sel');
      });
      if(!multiSel.size&&typeof clearMultiSel==='function'){
        try{ clearMultiSel(); }catch(e){}
      }
    }
    if(typeof sel!=='undefined'&&sel&&sel.dataset&&sel.dataset.type==='inkhost'){
      try{ if(typeof pick==='function') pick(null); else sel=null; }catch(e){ sel=null; }
    }
    _invalidateInkCache();
    redrawInk();
    _refreshSelectionChromeAfterInkChange();
    _syncDrawSidePanel();
    if(typeof renderObjectsPanel==='function'){
      try{ renderObjectsPanel(); }catch(e){}
    }
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
    return true;
  }

  function _applyToSelectedInk(mutator){
    const list=_selectedStrokes();
    if(!list.length) return false;
    if(typeof pushUndo==='function') pushUndo();
    list.forEach(mutator);
    _invalidateInkCache();
    redrawInk();
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
    syncDrawPropsUI();
    return true;
  }

  function groupSelectedInk(){
    const strokes=_selectedStrokes();
    const fills=_selectedFills();
    const n=strokes.length+fills.length;
    if(n<2){
      if(typeof toast==='function') toast(typeof t==='function'?t('drawNeedMulti'):'Выберите несколько штрихов или заливок','err');
      return false;
    }
    if(typeof pushUndo==='function') pushUndo();
    const gid='ig'+(++_inkGroupEc)+'_'+Date.now().toString(36);
    strokes.forEach(s=>{ s.groupId=gid; });
    fills.forEach(f=>{ f.groupId=gid; });
    _ensureInkHostForItems(strokes.concat(fills), gid);
    _invalidateInkCache();
    redrawInk();
    if(typeof toast==='function') toast(typeof t==='function'?t('drawGrouped'):'Сгруппировано','ok');
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
    syncDrawPropsUI();
    return true;
  }

  function ungroupSelectedInk(){
    const strokes=_selectedStrokes();
    const fills=_selectedFills();
    const list=strokes.concat(fills);
    if(!list.length) return false;
    const had=list.some(s=>s.groupId);
    if(!had) return false;
    if(typeof pushUndo==='function') pushUndo();
    const gids=new Set();
    list.forEach(s=>{ if(s.groupId) gids.add(s.groupId); delete s.groupId; });
    _removeInkHostsForGroups(gids);
    _ensureHostsForAllInk();
    _invalidateInkCache();
    redrawInk();
    if(typeof toast==='function') toast(typeof t==='function'?t('drawUngrouped'):'Группа снята','ok');
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
    syncDrawPropsUI();
    return true;
  }

  function getSelectedInkItems(){
    return {strokes:_selectedStrokes(), fills:_selectedFills()};
  }

  function groupInkWithId(gid, ids){
    if(!gid) return 0;
    const idSet=ids?new Set(ids):_selInkIds;
    let n=0;
    (_inkArr()||[]).forEach(s=>{
      if(s&&s.id&&idSet.has(s.id)){ s.groupId=gid; n++; }
    });
    (_fillsArr()||[]).forEach(f=>{
      if(f&&f.id&&idSet.has(f.id)){ f.groupId=gid; n++; }
    });
    return n;
  }

  function ungroupInkByGroupIds(gids){
    const set=gids instanceof Set?gids:new Set(gids||[]);
    if(!set.size) return 0;
    let n=0;
    (_inkArr()||[]).forEach(s=>{
      if(s&&s.groupId&&set.has(s.groupId)){ delete s.groupId; n++; }
    });
    (_fillsArr()||[]).forEach(f=>{
      if(f&&f.groupId&&set.has(f.groupId)){ delete f.groupId; n++; }
    });
    _removeInkHostsForGroups(set);
    return n;
  }

  function getInkItemsByIds(ids){
    const set=ids instanceof Set?ids:new Set(ids||[]);
    const strokes=(_inkArr()||[]).filter(s=>s&&set.has(s.id));
    const fills=(_fillsArr()||[]).filter(f=>f&&set.has(f.id));
    return {strokes, fills, items:strokes.concat(fills)};
  }

  function inkBBoxForIds(ids){
    const {items}=getInkItemsByIds(ids);
    return _inkItemsBBox(items);
  }

  function _inkItemsForGroupId(gid){
    if(!gid) return {strokes:[], fills:[], items:[]};
    const strokes=(_inkArr()||[]).filter(s=>s&&s.groupId===gid);
    const fills=(_fillsArr()||[]).filter(f=>f&&f.groupId===gid);
    return {strokes, fills, items:strokes.concat(fills)};
  }

  function _findInkHostData(gid, inkIds){
    if(typeof slides==='undefined'||!slides[cur]) return null;
    const els=slides[cur].els||[];
    if(gid){
      const byG=els.find(d=>d&&d.type==='inkhost'&&d.groupId===gid);
      if(byG) return byG;
    }
    if(inkIds&&inkIds.length){
      const set=new Set(inkIds);
      return els.find(d=>{
        if(!d||d.type!=='inkhost'||!d.inkIds) return false;
        return d.inkIds.some(id=>set.has(id));
      })||null;
    }
    return null;
  }

  function _removeOtherHostsForInkIds(inkIds, keepHostId){
    if(typeof slides==='undefined'||!slides[cur]||!inkIds||!inkIds.length) return;
    const set=new Set(inkIds);
    const cv=document.getElementById('canvas');
    const keep=[];
    (slides[cur].els||[]).forEach(d=>{
      if(!d||d.type!=='inkhost'||d.id===keepHostId){ keep.push(d); return; }
      const ids=d.inkIds||[];
      if(!ids.some(id=>set.has(id))){ keep.push(d); return; }
      const dom=cv&&cv.querySelector('.el[data-id="'+d.id+'"]');
      if(dom){
        if(typeof multiSel!=='undefined'&&multiSel) multiSel.delete(dom);
        if(typeof sel!=='undefined'&&sel===dom){
          try{ if(typeof pick==='function') pick(null); else sel=null; }catch(e){ sel=null; }
        }
        dom.remove();
      }
    });
    slides[cur].els=keep;
  }

  function _ensureInkHostForItems(items, gid){
    if(!items||!items.length) return null;
    if(typeof slides==='undefined'||!slides[cur]) return null;
    const inkIds=items.map(x=>x.id).filter(Boolean);
    const bb=_inkItemsBBox(items);
    if(!bb) return null;
    let host=_findInkHostData(gid, inkIds);
    if(!host){
      if(typeof ec==='undefined') return null;
      host={
        id:'e'+(++ec),
        type:'inkhost',
        x:Math.round(bb.x),
        y:Math.round(bb.y),
        w:Math.round(bb.w),
        h:Math.round(bb.h),
        groupId:gid||null,
        inkIds:inkIds.slice(),
        anims:[]
      };
      slides[cur].els.push(host);
      if(typeof mkEl==='function'){
        try{ mkEl(host); }catch(e){}
      }
    } else {
      host.groupId=gid||host.groupId||null;
      host.inkIds=inkIds.slice();
      host.x=Math.round(bb.x); host.y=Math.round(bb.y);
      host.w=Math.round(bb.w); host.h=Math.round(bb.h);
      const dom=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('.el[data-id="'+host.id+'"]');
      if(dom){
        dom.style.left=host.x+'px';
        dom.style.top=host.y+'px';
        dom.style.width=host.w+'px';
        dom.style.height=host.h+'px';
        if(host.groupId){ dom.dataset.groupId=host.groupId; dom.classList.add('in-group'); }
      } else if(typeof mkEl==='function'){
        try{ mkEl(host); }catch(e){}
      }
    }
    _removeOtherHostsForInkIds(inkIds, host.id);
    return host;
  }

  function _ensureHostsForAllInk(){
    if(typeof slides==='undefined'||!slides[cur]) return;
    const split=splitInkForHosts(_inkArr()||[], _fillsArr()||[], slides[cur].els||[]);
    const byG={};
    const singles=[];
    (split.freeStrokes||[]).concat(split.freeFills||[]).forEach(it=>{
      if(!it) return;
      if(it.groupId){
        if(!byG[it.groupId]) byG[it.groupId]=[];
        byG[it.groupId].push(it);
      } else singles.push(it);
    });
    Object.keys(byG).forEach(gid=>_ensureInkHostForItems(byG[gid], gid));
    singles.forEach(it=>_ensureInkHostForItems([it], null));
  }

  function ensureInkHostForIds(ids, gid){
    const {items}=getInkItemsByIds(ids);
    return _ensureInkHostForItems(items, gid);
  }

  function ensureInkHostForSelection(){
    const items=_selectedStrokes().concat(_selectedFills());
    if(!items.length) return null;
    let gid=null;
    // Reuse existing groupId only — do not invent one for anim hosts
    // (avoids false «Группа» chrome on a single stroke)
    items.forEach(it=>{ if(it.groupId) gid=it.groupId; });
    return _ensureInkHostForItems(items, gid);
  }

  function syncInkHostBBox(hostOrId){
    if(typeof slides==='undefined'||!slides[cur]) return;
    const host=typeof hostOrId==='string'
      ?(slides[cur].els||[]).find(d=>d&&d.id===hostOrId)
      :hostOrId;
    if(!host||host.type!=='inkhost') return;
    const ids=host.inkIds&&host.inkIds.length
      ?host.inkIds
      :(host.groupId?_inkItemsForGroupId(host.groupId).items.map(x=>x.id):[]);
    const bb=inkBBoxForIds(ids);
    if(!bb) return;
    host.x=Math.round(bb.x); host.y=Math.round(bb.y);
    host.w=Math.round(bb.w); host.h=Math.round(bb.h);
    host.inkIds=ids.slice();
    const dom=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('.el[data-id="'+host.id+'"]');
    if(dom){
      dom.style.left=host.x+'px';
      dom.style.top=host.y+'px';
      dom.style.width=host.w+'px';
      dom.style.height=host.h+'px';
    }
  }

  function syncAllInkHostsOnSlide(){
    if(typeof slides==='undefined'||!slides[cur]) return;
    (slides[cur].els||[]).forEach(d=>{
      if(d&&d.type==='inkhost') syncInkHostBBox(d);
    });
  }

  function _removeInkHostsForGroups(gids){
    if(typeof slides==='undefined'||!slides[cur]) return;
    const set=gids instanceof Set?gids:new Set(gids||[]);
    const els=slides[cur].els||[];
    const keep=[];
    els.forEach(d=>{
      if(d&&d.type==='inkhost'&&d.groupId&&set.has(d.groupId)){
        const dom=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('.el[data-id="'+d.id+'"]');
        if(dom) dom.remove();
        return;
      }
      keep.push(d);
    });
    slides[cur].els=keep;
  }

  /** Split ink into free layer vs per-host buckets for preview/export. */
  function splitInkForHosts(ink, fills, els){
    ink=ink||[]; fills=fills||[]; els=els||[];
    const hosts=els.filter(d=>d&&d.type==='inkhost');
    const claimed=new Set();
    const byHost={};
    hosts.forEach(h=>{
      const ids=new Set(h.inkIds||[]);
      if(h.groupId){
        ink.forEach(s=>{ if(s&&s.groupId===h.groupId) ids.add(s.id); });
        fills.forEach(f=>{ if(f&&f.groupId===h.groupId) ids.add(f.id); });
      }
      const hs=ink.filter(s=>s&&ids.has(s.id));
      const hf=fills.filter(f=>f&&ids.has(f.id));
      hs.forEach(s=>claimed.add(s.id));
      hf.forEach(f=>claimed.add(f.id));
      byHost[h.id]={host:h, strokes:hs, fills:hf};
    });
    return {
      freeStrokes:ink.filter(s=>s&&!claimed.has(s.id)),
      freeFills:fills.filter(f=>f&&!claimed.has(f.id)),
      byHost
    };
  }

  function clearInkClipboard(){
    _inkClipboard=null;
    try{ localStorage.removeItem(LS_INK_CLIP); }catch(e){}
  }

  window._getInkClipboardData=function(){ return _inkClipboard; };
  window._setInkClipboardData=function(data){
    _inkClipboard=data||null;
    try{
      if(_inkClipboard) localStorage.setItem(LS_INK_CLIP, JSON.stringify(_inkClipboard));
      else localStorage.removeItem(LS_INK_CLIP);
    }catch(e){}
  };

  function copySelectedInk(opts){
    opts=opts||{};
    const list=_selectedStrokes();
    const fills=_selectedFills();
    if(!list.length&&!fills.length) return false;
    _inkClipboard={
      v:2,
      strokes:list.map(s=>JSON.parse(JSON.stringify(s))),
      fills:fills.map(f=>JSON.parse(JSON.stringify(f)))
    };
    try{ localStorage.setItem(LS_INK_CLIP, JSON.stringify(_inkClipboard)); }catch(e){}
    try{ window._clipHadInk=true; }catch(e){}
    if(!opts.skipClipMark){
      // Ink-only copy — drop stale object clipboard so Ctrl+V pastes ink alone
      try{
        if(typeof clipboard!=='undefined') clipboard=[];
        if(typeof elClipboard!=='undefined') elClipboard=null;
      }catch(e){}
      try{ window._clipSource='ink'; }catch(e){}
      if(typeof window._markInkClipboardCopy==='function') window._markInkClipboardCopy();
      else try{ window._clipSource='ink'; }catch(e){}
    }
    if(!opts.silent&&typeof toast==='function'){
      const n=list.length+fills.length;
      const msg=n>1
        ?(typeof t==='function'?t('drawInkCopiedN').replace('{n}',String(n)):'Скопировано: '+n)
        :(typeof t==='function'?t('drawInkCopied'):'Скопировано');
      toast(msg,'ok');
    }
    return true;
  }

  function _hydrateInkClipboard(){
    if(_inkClipboard){
      if(Array.isArray(_inkClipboard)&&_inkClipboard.length) return true;
      if(_inkClipboard.v===2&&((_inkClipboard.strokes&&_inkClipboard.strokes.length)||(_inkClipboard.fills&&_inkClipboard.fills.length))) return true;
    }
    try{
      const raw=localStorage.getItem(LS_INK_CLIP);
      if(!raw) return false;
      const arr=JSON.parse(raw);
      if(Array.isArray(arr)&&arr.length){ _inkClipboard=arr; return true; }
      if(arr&&arr.v===2&&((arr.strokes&&arr.strokes.length)||(arr.fills&&arr.fills.length))){
        _inkClipboard=arr; return true;
      }
    }catch(e){}
    return false;
  }

  function pasteInkFromClipboard(opts){
    opts=opts||{};
    if(!_hydrateInkClipboard()) return false;
    if(typeof slides==='undefined'||!slides[cur]) return false;
    let strokes=[], fills=[];
    if(Array.isArray(_inkClipboard)){
      strokes=_inkClipboard;
    } else if(_inkClipboard&&_inkClipboard.v===2){
      strokes=_inkClipboard.strokes||[];
      fills=_inkClipboard.fills||[];
    }
    if(!strokes.length&&!fills.length) return false;
    if(!opts.skipUndo&&typeof pushUndo==='function') pushUndo();
    _syncInkIdCounters();
    const ink=_inkArr();
    const fillArr=_fillsArr();
    const pastedIds=[];
    const groupMap={};
    if(typeof clipboard!=='undefined'&&clipboard.length){
      clipboard.forEach(function(d){
        if(d&&d._origGroupId&&d.groupId) groupMap[d._origGroupId]=d.groupId;
      });
    }
    strokes.forEach(src=>{
      const n=JSON.parse(JSON.stringify(src));
      n.id='ink'+(++_inkEc);
      if(n.groupId){
        if(!groupMap[n.groupId]) groupMap[n.groupId]='ig'+(++_inkGroupEc)+'_'+Date.now().toString(36);
        n.groupId=groupMap[n.groupId];
      }
      n._pasteZ=src.z!=null?+src.z:0;
      ink.push(n);
      pastedIds.push(n.id);
    });
    fills.forEach(src=>{
      const n=JSON.parse(JSON.stringify(src));
      n.id='fill'+(++_fillEc);
      if(n.groupId){
        if(!groupMap[n.groupId]) groupMap[n.groupId]='ig'+(++_inkGroupEc)+'_'+Date.now().toString(36);
        n.groupId=groupMap[n.groupId];
      }
      n.d=_contourToSmoothPath(n.points||[]);
      n._pasteZ=src.z!=null?+src.z:0;
      fillArr.push(n);
      pastedIds.push(n.id);
    });
    {
      const batch=pastedIds.map(id=>{
        return (_inkArr()||[]).find(s=>s&&s.id===id)||(_fillsArr()||[]).find(f=>f&&f.id===id);
      }).filter(Boolean);
      batch.sort((a,b)=>(a._pasteZ||0)-(b._pasteZ||0));
      let z=_nextInkZ();
      batch.forEach(it=>{ it.z=z++; delete it._pasteZ; });
    }
    const newGids=new Set();
    Object.keys(groupMap).forEach(function(k){ if(groupMap[k]) newGids.add(groupMap[k]); });
    newGids.forEach(function(gid){
      const items=(_inkArr()||[]).filter(s=>s&&s.groupId===gid)
        .concat((_fillsArr()||[]).filter(f=>f&&f.groupId===gid));
      if(items.length) _ensureInkHostForItems(items, gid);
    });
    pastedIds.forEach(function(id){
      const it=(_inkArr()||[]).find(s=>s&&s.id===id)||(_fillsArr()||[]).find(f=>f&&f.id===id);
      if(it&&!it.groupId) _ensureInkHostForItems([it], null);
    });
    _setInkSelection(pastedIds, {expandGroup:false, keepObjectSel:!!opts.keepObjectSel, silent:!!opts.silent});
    if(!opts.skipThumbs&&typeof drawThumbs==='function') drawThumbs();
    if(!opts.skipSave&&typeof saveState==='function') saveState();
    if(!opts.silent&&typeof toast==='function') toast(typeof t==='function'?t('drawInkPasted'):'Вставлено','ok');
    return true;
  }

  function hasInkClipboard(){
    return _hydrateInkClipboard();
  }

  function _moveSelectedInkBy(dx, dy){
    if(!dx&&!dy) return;
    _selectedStrokes().forEach(s=>{
      (s.points||[]).forEach(p=>{ p.x+=dx; p.y+=dy; });
    });
    _selectedFills().forEach(f=>{
      (f.points||[]).forEach(p=>{ p.x+=dx; p.y+=dy; });
      f.d=_contourToSmoothPath(f.points||[]);
    });
    _invalidateInkCache();
    syncAllInkHostsOnSlide();
    redrawInk();
  }

  function _snapshotInkPoints(items){
    return (items||[]).filter(Boolean).map(it=>({
      id:it.id,
      isFill:it.tool==null,
      points:(it.points||[]).map(p=>({x:+p.x||0, y:+p.y||0, p:p.p, t:p.t}))
    }));
  }

  function snapshotSelectedInk(){
    return _snapshotInkPoints(_selectedStrokes().concat(_selectedFills()));
  }

  function snapshotInkByGroupId(gid){
    return _snapshotInkPoints(_inkItemsForGroupId(gid).items);
  }

  /** Apply scale+rotation around origin to ink from a start snapshot (absolute, not incremental). */
  function applyInkAffineFromSnapshot(snap, originX, originY, scaleX, scaleY, rotDeg){
    if(!snap||!snap.length) return;
    const sx=scaleX==null?1:scaleX, sy=scaleY==null?1:scaleY;
    const rad=((rotDeg||0)*Math.PI)/180;
    const cos=Math.cos(rad), sin=Math.sin(rad);
    const live={};
    (_inkArr()||[]).forEach(s=>{ if(s&&s.id) live[s.id]=s; });
    (_fillsArr()||[]).forEach(f=>{ if(f&&f.id) live[f.id]=f; });
    snap.forEach(entry=>{
      const it=live[entry.id];
      if(!it) return;
      const pts=it.points||[];
      entry.points.forEach((sp, i)=>{
        if(!pts[i]) pts[i]={x:0,y:0};
        let x=(sp.x-originX)*sx;
        let y=(sp.y-originY)*sy;
        pts[i].x=originX+x*cos-y*sin;
        pts[i].y=originY+x*sin+y*cos;
        if(sp.p!=null) pts[i].p=sp.p;
        if(sp.t!=null) pts[i].t=sp.t;
      });
      it.points=pts;
      if(entry.isFill) it.d=_contourToSmoothPath(it.points||[]);
    });
    _invalidateInkCache();
    syncAllInkHostsOnSlide();
    redrawInk();
  }

  function _startInkResize(e, bx, by, bw, bh, dx, dy, ax, ay){
    window._resizeDragging=true;
    window._anyDragging=true;
    if(typeof pushUndo==='function') pushUndo();
    const p0=typeof _toCanvasCoords==='function'
      ?_toCanvasCoords(e.clientX,e.clientY)
      :{x:e.clientX,y:e.clientY};
    const inkSnap=snapshotSelectedInk();
    const isCorner=dx!==0&&dy!==0;
    const aspect=bw/Math.max(1,bh);
    // pointerdown+preventDefault suppresses compatibility mouse events — listen to both

    function onMove(e2){
      if(e2.pointerType&&e2.buttons===0){ onUp(e2); return; }
      if(!e2.pointerType&&e2.buttons===0){ onUp(e2); return; }
      const p=typeof _toCanvasCoords==='function'
        ?_toCanvasCoords(e2.clientX,e2.clientY)
        :{x:e2.clientX,y:e2.clientY};
      const rdx=p.x-p0.x;
      const rdy=p.y-p0.y;
      let newW, newH;
      if(e2.shiftKey&&isCorner){
        const rawDx=dx*rdx, rawDy=dy*rdy;
        const delta=Math.abs(rawDx)>=Math.abs(rawDy)?rawDx:rawDy*aspect;
        newW=Math.max(12, bw+delta);
        newH=Math.max(8, newW/aspect);
      } else {
        newW=Math.max(12, bw+dx*rdx);
        newH=Math.max(8, bh+dy*rdy);
        if(dx===0) newW=bw;
        if(dy===0) newH=bh;
      }
      const scaleX=newW/bw, scaleY=newH/bh;
      const originX=ax?bx+bw:bx;
      const originY=ay?by+bh:by;
      applyInkAffineFromSnapshot(inkSnap, originX, originY, scaleX, scaleY, 0);
      const nbx=ax?(bx+bw-newW):bx;
      const nby=ay?(by+bh-newH):by;
      _redrawInkTransformOverlay(nbx, nby, newW, newH);
    }
    function onUp(e2){
      window._resizeDragging=false;
      window._anyDragging=false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if(typeof save==='function') save();
      if(typeof saveState==='function') saveState();
      if(typeof drawThumbs==='function') drawThumbs();
      if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function _startInkRotation(e, bx, by, bw, bh){
    if(typeof pushUndo==='function') pushUndo();
    window._anyDragging=true;
    const cx=bx+bw/2+(_inkPivotOff.x||0);
    const cy=by+bh/2+(_inkPivotOff.y||0);
    const p0=typeof _toCanvasCoords==='function'?_toCanvasCoords(e.clientX,e.clientY):null;
    const a0=p0?Math.atan2(p0.y-cy, p0.x-cx)*180/Math.PI:0;
    const inkSnap=snapshotSelectedInk();
    if(typeof _updateRotCursorFromPivot==='function'&&p0){
      _updateRotCursorFromPivot(cx, cy, p0.x, p0.y);
    }
    // pointerdown+preventDefault suppresses mouse events — listen to pointer too

    function onMove(e2){
      if(e2.pointerType!=null&&e2.buttons===0){ onUp(e2); return; }
      if(e2.pointerType==null&&e2.buttons===0){ onUp(e2); return; }
      const p=typeof _toCanvasCoords==='function'?_toCanvasCoords(e2.clientX,e2.clientY):null;
      if(!p) return;
      if(typeof _updateRotCursorFromPivot==='function') _updateRotCursorFromPivot(cx, cy, p.x, p.y);
      let delta=Math.atan2(p.y-cy, p.x-cx)*180/Math.PI-a0;
      if(e2.shiftKey) delta=Math.round(delta/15)*15;
      applyInkAffineFromSnapshot(inkSnap, cx, cy, 1, 1, delta);
      if(typeof _updateHandlesOverlay==='function'){
        requestAnimationFrame(function(){ try{ _updateHandlesOverlay(); }catch(err){} });
      }
    }
    function onUp(){
      window._anyDragging=false;
      if(typeof _syncRotDragging==='function') _syncRotDragging(false);
      else window._rotDragging=false;
      if(typeof _setRotCursor==='function') _setRotCursor('');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if(typeof save==='function') save();
      if(typeof saveState==='function') saveState();
      if(typeof drawThumbs==='function') drawThumbs();
      if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function _redrawInkTransformOverlay(bx, by, bw, bh){
    const overlay=document.getElementById('handles-overlay');
    if(!overlay) return;
    overlay.innerHTML='';
    // Same as normal objects: overlay passes through; only handles capture clicks.
    // Rotation uses document-level corner hover (see _ensureInkRotListeners).
    overlay.style.pointerEvents='none';
    const box=document.createElement('div');
    box.id='ink-outline-box';
    box.style.cssText='position:absolute;pointer-events:none;z-index:9990;'
      +'left:'+bx+'px;top:'+by+'px;width:'+bw+'px;height:'+bh+'px;'
      +'border:1.5px solid var(--selb);border-radius:3px;'
      +'box-shadow:0 0 0 1px rgba(0,0,0,.08);background:transparent;';
    overlay.appendChild(box);
    const H=4; // same as shape overlay handles
    const positions=[
      ['tl', bx, by, -1,-1, 1,1],
      ['tm', bx+bw/2, by, 0,-1, 0,1],
      ['tr', bx+bw, by, 1,-1, 0,1],
      ['ml', bx, by+bh/2, -1, 0, 1,0],
      ['mr', bx+bw, by+bh/2, 1, 0, 0,0],
      ['bl', bx, by+bh, -1, 1, 1,0],
      ['bm', bx+bw/2, by+bh, 0, 1, 0,0],
      ['br', bx+bw, by+bh, 1, 1, 0,0],
    ];
    positions.forEach(p=>{
      const cls=p[0], px=p[1], py=p[2], hdx=p[3], hdy=p[4], ax=p[5], ay=p[6];
      const rh=document.createElement('div');
      const cursor=typeof _rhCursor==='function'?_rhCursor(cls, 0):'nwse-resize';
      rh.className='ink-rh';
      rh.dataset.cls=cls;
      rh.style.cssText='position:absolute;left:'+(px-H)+'px;top:'+(py-H)+'px;'
        +'width:8px;height:8px;box-sizing:border-box;'
        +'background:#fff;border:1.5px solid var(--selb);border-radius:50%;'
        +'box-shadow:0 1px 4px rgba(0,0,0,.5);pointer-events:auto;cursor:'+cursor+';z-index:10030;';
      rh.addEventListener('pointerdown', ev=>{
        ev.preventDefault(); ev.stopPropagation();
        _startInkResize(ev, bx, by, bw, bh, hdx, hdy, ax, ay);
      });
      rh.addEventListener('mousedown', ev=>{
        ev.preventDefault(); ev.stopPropagation();
      });
      overlay.appendChild(rh);
    });
    _appendInkPivotHandle(overlay, bx, by, bw, bh);
    _setInkRotBBox({x:bx, y:by, w:bw, h:bh});
  }

  // ── Ink rotation: same UX as objects (document hover near corners → rotate cursor) ──
  let _inkRotBBox=null;
  let _inkRotListeners=false;
  let _inkPivotOff={x:0,y:0}; // offset from bbox centre (like shape rotPivot)

  function _setInkRotBBox(bb){
    const next=bb&&bb.w>0&&bb.h>0?{x:bb.x,y:bb.y,w:bb.w,h:bb.h}:null;
    if(!next){
      _inkRotBBox=null;
      _inkPivotOff={x:0,y:0};
      if(typeof _setRotCursor==='function') try{ _setRotCursor(''); }catch(e){}
      return;
    }
    // Clamp pivot inside new bbox when selection chrome updates
    if(_inkRotBBox){
      const maxX=next.w*0.5, maxY=next.h*0.5;
      _inkPivotOff.x=Math.max(-maxX, Math.min(maxX, _inkPivotOff.x||0));
      _inkPivotOff.y=Math.max(-maxY, Math.min(maxY, _inkPivotOff.y||0));
    }
    _inkRotBBox=next;
    _ensureInkRotListeners();
  }

  function _inkPivotCanvas(){
    if(!_inkRotBBox) return {x:0,y:0};
    return {
      x:_inkRotBBox.x+_inkRotBBox.w/2+(_inkPivotOff.x||0),
      y:_inkRotBBox.y+_inkRotBBox.h/2+(_inkPivotOff.y||0)
    };
  }

  function _appendInkPivotHandle(overlay, bx, by, bw, bh){
    if(!overlay) return;
    const H_SIZE=10;
    const cx=bx+bw/2+(_inkPivotOff.x||0);
    const cy=by+bh/2+(_inkPivotOff.y||0);
    const ph=document.createElement('div');
    ph.id='pivot-handle';
    ph.style.cssText='position:absolute;width:'+H_SIZE+'px;height:'+H_SIZE+'px;'
      +'border-radius:50%;background:#8b5cf6;border:2px solid #fff;'
      +'box-shadow:0 0 0 1.5px #8b5cf6, 0 2px 6px rgba(0,0,0,.5);'
      +'left:'+(cx-H_SIZE/2)+'px;top:'+(cy-H_SIZE/2)+'px;'
      +'cursor:grab;z-index:10020;pointer-events:auto;';
    ph.title='Точка вращения (перетащите)';
    ph.addEventListener('mouseenter', ()=>{ window._overPivotHandle=true; });
    ph.addEventListener('mouseleave', ()=>{ window._overPivotHandle=false; });
    ph.addEventListener('mousedown', e=>{
      e.stopPropagation(); e.preventDefault();
      window._pivotDragging=true;
      window._anyDragging=true;
      ph.style.cursor='grabbing';
      const snapR=12;
      const onMove=ev=>{
        const cv=typeof _toCanvasCoords==='function'?_toCanvasCoords(ev.clientX,ev.clientY):null;
        if(!cv||!_inkRotBBox) return;
        const ecx=_inkRotBBox.x+_inkRotBBox.w/2, ecy=_inkRotBBox.y+_inkRotBBox.h/2;
        let lx=cv.x-ecx, ly=cv.y-ecy;
        const maxX=_inkRotBBox.w/2, maxY=_inkRotBBox.h/2;
        lx=Math.max(-maxX, Math.min(maxX, lx));
        ly=Math.max(-maxY, Math.min(maxY, ly));
        const snaps=[[0,0],[-maxX,-maxY],[maxX,-maxY],[-maxX,maxY],[maxX,maxY],[0,-maxY],[0,maxY],[-maxX,0],[maxX,0]];
        for(let i=0;i<snaps.length;i++){
          const s=snaps[i];
          if((lx-s[0])*(lx-s[0])+(ly-s[1])*(ly-s[1])<snapR*snapR){ lx=s[0]; ly=s[1]; break; }
        }
        _inkPivotOff={x:Math.round(lx), y:Math.round(ly)};
        ph.style.left=(ecx+_inkPivotOff.x-H_SIZE/2)+'px';
        ph.style.top=(ecy+_inkPivotOff.y-H_SIZE/2)+'px';
      };
      const onUp=()=>{
        window._pivotDragging=false;
        window._anyDragging=false;
        window._overPivotHandle=false;
        ph.style.cursor='grab';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    ph.addEventListener('dblclick', e=>{
      e.stopPropagation();
      _inkPivotOff={x:0,y:0};
      if(_inkRotBBox){
        ph.style.left=(_inkRotBBox.x+_inkRotBBox.w/2-H_SIZE/2)+'px';
        ph.style.top=(_inkRotBBox.y+_inkRotBBox.h/2-H_SIZE/2)+'px';
      }
    });
    overlay.appendChild(ph);
  }

  function _nearInkMidEdge(cx, cy){
    if(!_inkRotBBox) return false;
    const R=14;
    const x=_inkRotBBox.x, y=_inkRotBBox.y, w=_inkRotBBox.w, h=_inkRotBBox.h;
    const mids=[[x+w/2,y],[x+w,y+h/2],[x+w/2,y+h],[x,y+h/2]];
    for(let i=0;i<mids.length;i++){
      if(Math.hypot(cx-mids[i][0], cy-mids[i][1])<=R) return true;
    }
    return false;
  }

  function _nearInkCorner(cx, cy){
    if(!_inkRotBBox) return null;
    if(_nearInkMidEdge(cx, cy)) return null;
    // Match shape corner rotate zone (8px handles)
    const R=22, HANDLE_R=10;
    const x=_inkRotBBox.x, y=_inkRotBBox.y, w=_inkRotBBox.w, h=_inkRotBBox.h;
    // Tiny bboxes: don't eat the whole corner with inset
    const inset=Math.min(16, w*0.28, h*0.28);
    const corners=[{x:x,y:y},{x:x+w,y:y},{x:x,y:y+h},{x:x+w,y:y+h}];
    for(let i=0;i<corners.length;i++){
      const c=corners[i];
      const dist=Math.hypot(cx-c.x, cy-c.y);
      if(dist>R||dist<HANDLE_R) continue;
      if(inset>0&&cx>x+inset&&cx<x+w-inset&&cy>y+inset&&cy<y+h-inset) continue;
      return c;
    }
    return null;
  }

  /** Start ink corner-rotate from pointerdown (beats ink-drag; mousedown is often cancelled). */
  function _tryStartInkCornerRotation(e){
    if(!_inkRotBBox||!_selInkIds.size) return false;
    if(_isDrawTool()) return false;
    if(typeof window._isPreviewActive==='function'&&window._isPreviewActive()) return false;
    if(window._rotDragging||window._resizeDragging||window._anyDragging) return false;
    if(window._curveEditMode||window._pivotDragging||window._overPivotHandle) return false;
    if(_isInkOrOverlayHandleTarget(e)) return false;
    const cwrap2=document.getElementById('cwrap');
    if(cwrap2){
      const cr=cwrap2.getBoundingClientRect();
      if(e.clientX<cr.left||e.clientX>cr.right||e.clientY<cr.top||e.clientY>cr.bottom) return false;
    }
    const p=typeof _toCanvasCoords==='function'
      ?_toCanvasCoords(e.clientX, e.clientY)
      :null;
    if(!p||!_nearInkCorner(p.x, p.y)) return false;
    if(e.preventDefault) e.preventDefault();
    if(e.stopPropagation) e.stopPropagation();
    if(typeof _syncRotDragging==='function') _syncRotDragging(true);
    else window._rotDragging=true;
    _startInkRotation(e, _inkRotBBox.x, _inkRotBBox.y, _inkRotBBox.w, _inkRotBBox.h);
    return true;
  }
  window._tryStartInkCornerRotation=_tryStartInkCornerRotation;

  function _ensureInkRotListeners(){
    if(_inkRotListeners) return;
    _inkRotListeners=true;

    document.addEventListener('mousemove', ev=>{
      if(!_inkRotBBox) return;
      if(typeof window._isPreviewActive==='function'&&window._isPreviewActive()) return;
      if(window._rotDragging||window._anyDragging||window._resizeDragging) return;
      if(window._pivotDragging||window._overPivotHandle){
        if(typeof _setRotCursor==='function') _setRotCursor('');
        return;
      }
      if(window._curveEditMode){ if(typeof _setRotCursor==='function') _setRotCursor(''); return; }
      const cwrap2=document.getElementById('cwrap');
      if(!cwrap2) return;
      const cr=cwrap2.getBoundingClientRect();
      if(ev.clientX<cr.left||ev.clientX>cr.right||ev.clientY<cr.top||ev.clientY>cr.bottom){
        if(typeof _setRotCursor==='function') _setRotCursor('');
        return;
      }
      const under=document.elementFromPoint(ev.clientX, ev.clientY);
      if(under&&under.closest&&(under.closest('#handles-overlay [data-cls]')||under.closest('#pivot-handle'))){
        if(typeof _setRotCursor==='function') _setRotCursor('');
        return;
      }
      const p=typeof _toCanvasCoords==='function'
        ?_toCanvasCoords(ev.clientX, ev.clientY)
        :{x:0,y:0};
      const corner=_nearInkCorner(p.x, p.y);
      if(!corner){
        if(typeof _setRotCursor==='function') _setRotCursor('');
        return;
      }
      const pv=_inkPivotCanvas();
      if(typeof _updateRotCursorFromPivot==='function') _updateRotCursorFromPivot(pv.x, pv.y, p.x, p.y);
    });

    document.addEventListener('mousedown', ev=>{
      if(_tryStartInkCornerRotation(ev)) return;
    }, true);
  }

  function _renderInkTransformHandles(){
    const bb=_selectionBounds();
    const overlay=document.getElementById('handles-overlay');
    if(!bb||bb.w<1||bb.h<1){
      _setInkRotBBox(null);
      if(overlay) overlay.innerHTML='';
      return;
    }
    const PAD=8;
    const bx=bb.x-PAD, by=bb.y-PAD;
    const bw=bb.w+PAD*2, bh=bb.h+PAD*2;
    if(!overlay) return;
    document.querySelectorAll('.para-handle,.star-handle,.arc-handle').forEach(h=>h.remove());
    _redrawInkTransformOverlay(bx, by, bw, bh);
  }

  function _clearInkRotChrome(){
    _setInkRotBBox(null);
  }

  /** Apply absolute delta to co-selected objects (from ink-drag start snapshot). Skip inkhost — syncAllInkHosts owns it. */
  function _applyInkDragObjectPositions(drag){
    if(drag&&drag.objStart&&drag.objStart.size){
      const tdx=drag.totalDx||0, tdy=drag.totalDy||0;
      drag.objStart.forEach((pos, el)=>{
        if(!el||!el.style) return;
        el.style.left=(pos.x+tdx)+'px';
        el.style.top=(pos.y+tdy)+'px';
      });
      if(typeof refreshAllLineAngles==='function') try{ refreshAllLineAngles(); }catch(e){}
    }
    // Always refresh selection chrome (group/ink outline) while dragging by stroke
    if(typeof _updateHandlesOverlay==='function') try{ _updateHandlesOverlay(); }catch(e){}
    if(typeof _updateSelFrames==='function') try{ _updateSelFrames(); }catch(e){}
  }

  function _captureInkDragObjectStarts(){
    const map=new Map();
    const add=el=>{
      if(!el||!el.style) return;
      // inkhost bbox is derived from ink — moving it here causes double-shift vs syncAllInkHosts
      if(el.dataset&&el.dataset.type==='inkhost') return;
      if(map.has(el)) return;
      map.set(el,{
        x:parseFloat(el.style.left)||0,
        y:parseFloat(el.style.top)||0
      });
    };
    if(typeof multiSel!=='undefined'&&multiSel&&multiSel.size) multiSel.forEach(add);
    // Shift+ink may leave a sole object in `sel` without multiSel yet
    if(typeof sel!=='undefined'&&sel) add(sel);
    return map;
  }

  function _elAlreadySelected(el){
    if(!el) return false;
    try{
      if(typeof multiSel!=='undefined'&&multiSel&&multiSel.size&&multiSel.has(el)) return true;
      if(typeof sel!=='undefined'&&sel===el) return true;
    }catch(e){}
    return false;
  }

  function nudgeSelectedInk(dx, dy){
    if(!_selInkIds.size) return false;
    if(!dx&&!dy) return false;
    if(typeof pushUndo==='function') pushUndo();
    _moveSelectedInkBy(dx, dy);
    if(typeof _updateHandlesOverlay==='function'){
      try{ _updateHandlesOverlay(); }catch(e){}
    }
    if(typeof _updateSelFrames==='function'){
      try{ _updateSelFrames(); }catch(e){}
    }
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
    return true;
  }

  function _inkItemBBox(it){
    if(!it) return null;
    return (it.tool!=null)?_strokeBBox(it):_fillBBox(it);
  }

  function _translateInkItem(it, dx, dy){
    if(!it||(!dx&&!dy)) return;
    (it.points||[]).forEach(p=>{ p.x+=dx; p.y+=dy; });
    if(it.tool==null) it.d=_contourToSmoothPath(it.points||[]);
  }

  /** Align selected brush strokes / fills (toolbar align buttons). */
  function _inkAlignUnits(items){
    const groups=new Map();
    const units=[];
    (items||[]).forEach(it=>{
      if(!it) return;
      if(it.groupId){
        if(!groups.has(it.groupId)) groups.set(it.groupId,[]);
        groups.get(it.groupId).push(it);
      } else {
        units.push({items:[it]});
      }
    });
    groups.forEach(list=>units.push({items:list}));
    return units.map(u=>{
      let x=Infinity,y=Infinity,r=-Infinity,b=-Infinity;
      u.items.forEach(it=>{
        const bb=_inkItemBBox(it);
        if(!bb) return;
        x=Math.min(x,bb.x); y=Math.min(y,bb.y);
        r=Math.max(r,bb.x+bb.w); b=Math.max(b,bb.y+bb.h);
      });
      if(!isFinite(x)) return null;
      return {items:u.items, bb:{x,y,w:r-x,h:b-y}, cx:(x+r)/2, cy:(y+b)/2};
    }).filter(Boolean);
  }

  function alignSelectedInk(t, scope){
    const items=_selectedStrokes().concat(_selectedFills());
    if(!items.length) return false;
    if(scope!=='slide'&&scope!=='sel'){
      scope=(typeof _alignScope!=='undefined'&&_alignScope==='slide')?'slide':'sel';
    }
    const units=_inkAlignUnits(items);
    if(!units.length) return false;
    if((t==='centerH'||t==='centerV'||t==='center')&&scope==='sel'&&units.length<2){
      scope='slide';
    }

    let selL=Infinity, selT=Infinity, selR=-Infinity, selB=-Infinity;
    units.forEach(u=>{
      selL=Math.min(selL,u.bb.x); selT=Math.min(selT,u.bb.y);
      selR=Math.max(selR,u.bb.x+u.bb.w); selB=Math.max(selB,u.bb.y+u.bb.h);
    });
    const W=typeof canvasW!=='undefined'?canvasW:1200;
    const H=typeof canvasH!=='undefined'?canvasH:675;
    const refL=scope==='slide'?0:selL;
    const refT=scope==='slide'?0:selT;
    const refR=scope==='slide'?W:selR;
    const refB=scope==='slide'?H:selB;
    const refCX=(refL+refR)/2, refCY=(refT+refB)/2;

    if(typeof pushUndo==='function') pushUndo();
    units.forEach(u=>{
      let edx=0, edy=0;
      if(t==='left') edx=refL-u.bb.x;
      else if(t==='centerH') edx=refCX-u.cx;
      else if(t==='right') edx=refR-(u.bb.x+u.bb.w);
      else if(t==='top') edy=refT-u.bb.y;
      else if(t==='centerV') edy=refCY-u.cy;
      else if(t==='bottom') edy=refB-(u.bb.y+u.bb.h);
      else if(t==='center'){ edx=refCX-u.cx; edy=refCY-u.cy; }
      if(edx||edy) u.items.forEach(it=>_translateInkItem(it, edx, edy));
    });
    _invalidateInkCache();
    syncAllInkHostsOnSlide();
    redrawInk();
    if(typeof _updateHandlesOverlay==='function') try{ _updateHandlesOverlay(); }catch(e){}
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
    return true;
  }

  /** Evenly space selected brush strokes / fills. */
  function distributeSelectedInk(axis){
    const items=_selectedStrokes().concat(_selectedFills());
    const units=_inkAlignUnits(items);
    if(units.length<3){
      if(typeof toast==='function') toast(typeof t==='function'?t('need3'):'Нужно ≥3 объектов','err');
      return false;
    }
    if(typeof pushUndo==='function') pushUndo();
    if(axis==='h'){
      units.sort((a,b)=>a.cx-b.cx);
      const first=units[0].cx, last=units[units.length-1].cx;
      const step=(last-first)/(units.length-1);
      units.forEach((u,i)=>{
        const dx=(first+step*i)-u.cx;
        if(dx) u.items.forEach(it=>_translateInkItem(it, dx, 0));
      });
    } else {
      units.sort((a,b)=>a.cy-b.cy);
      const first=units[0].cy, last=units[units.length-1].cy;
      const step=(last-first)/(units.length-1);
      units.forEach((u,i)=>{
        const dy=(first+step*i)-u.cy;
        if(dy) u.items.forEach(it=>_translateInkItem(it, 0, dy));
      });
    }
    _invalidateInkCache();
    syncAllInkHostsOnSlide();
    redrawInk();
    if(typeof _updateHandlesOverlay==='function') try{ _updateHandlesOverlay(); }catch(e){}
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
    return true;
  }

  /** Move selected ink to absolute alignment refs (used with co-selected objects; no undo). */
  function alignSelectedInkToRefs(t, refL, refT, refR, refB){
    const items=_selectedStrokes().concat(_selectedFills());
    if(!items.length) return false;
    const units=_inkAlignUnits(items);
    if(!units.length) return false;
    const refCX=(refL+refR)/2, refCY=(refT+refB)/2;
    let moved=false;
    units.forEach(u=>{
      let edx=0, edy=0;
      if(t==='left') edx=refL-u.bb.x;
      else if(t==='centerH') edx=refCX-u.cx;
      else if(t==='right') edx=refR-(u.bb.x+u.bb.w);
      else if(t==='top') edy=refT-u.bb.y;
      else if(t==='centerV') edy=refCY-u.cy;
      else if(t==='bottom') edy=refB-(u.bb.y+u.bb.h);
      else if(t==='center'){ edx=refCX-u.cx; edy=refCY-u.cy; }
      if(edx||edy){
        u.items.forEach(it=>_translateInkItem(it, edx, edy));
        moved=true;
      }
    });
    if(moved){
      _invalidateInkCache();
      syncAllInkHostsOnSlide();
      redrawInk();
    }
    return moved;
  }

  function _ensureBrushCursorEl(){
    let el=document.getElementById('ink-brush-cursor');
    if(el){
      if(!el.querySelector('.ink-eraser-ico')){
        el.innerHTML='<span class="ink-eraser-ico" aria-hidden="true"></span>';
      }
      return el;
    }
    el=document.createElement('div');
    el.id='ink-brush-cursor';
    el.innerHTML='<span class="ink-eraser-ico" aria-hidden="true"></span>';
    document.body.appendChild(el);
    return el;
  }

  function _toolCursorSizePx(){
    if(_tool==='eraser') return _eraserWidth();
    if(_tool==='marker') return _markerWidth();
    if(_isBrushFamily(_tool)) return _penWidth();
    return 0;
  }

  function _updateBrushCursor(clientX, clientY){
    if(clientX!=null&&clientY!=null){
      _lastPtrClientX=clientX;
      _lastPtrClientY=clientY;
    } else {
      clientX=_lastPtrClientX;
      clientY=_lastPtrClientY;
    }
    const el=_ensureBrushCursorEl();
    // Pipette owns the cursor — hide brush/fill/eraser overlay
    if(typeof pipetteMode!=='undefined'&&pipetteMode){
      el.classList.remove('show');
      return;
    }
    if(!_isDrawTool()||clientX==null||clientY==null){
      if(!_isDrawTool()) el.classList.remove('show');
      return;
    }
    const canvas=document.getElementById('canvas');
    if(!canvas){ el.classList.remove('show'); return; }
    const r=canvas.getBoundingClientRect();
    const W=typeof canvasW!=='undefined'?canvasW:1200;
    const size=_toolCursorSizePx();
    const screen=Math.max(6, size*(r.width/Math.max(1,W)));
    el.classList.toggle('eraser', _tool==='eraser');
    el.classList.toggle('marker', _tool==='marker');
    el.classList.toggle('neon', _tool==='neon');
    el.classList.toggle('fill', _tool==='fill');
    if(_tool==='fill'){
      el.style.width='24px';
      el.style.height='24px';
      el.style.left=clientX+'px';
      el.style.top=clientY+'px';
      el.classList.add('show');
      return;
    }
    if(_tool==='eraser'){
      const ew=Math.max(14, Math.min(42, screen*0.85));
      const eh=Math.max(18, Math.min(52, screen*1.15));
      el.style.width=ew+'px';
      el.style.height=eh+'px';
    } else {
      el.style.width=screen+'px';
      el.style.height=screen+'px';
    }
    el.style.left=clientX+'px';
    el.style.top=clientY+'px';
    el.classList.add('show');
  }

  function _hideBrushCursor(){
    const el=document.getElementById('ink-brush-cursor');
    if(el) el.classList.remove('show');
  }

  function _capturePtr(e){
    try{
      const t=_bindTarget();
      if(t&&t.setPointerCapture) t.setPointerCapture(e.pointerId);
      else if(e.currentTarget&&e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    }catch(err){}
  }

  function _releasePtr(e){
    try{
      const t=_bindTarget();
      if(t&&t.releasePointerCapture) t.releasePointerCapture(e.pointerId);
      else if(e.currentTarget&&e.currentTarget.releasePointerCapture) e.currentTarget.releasePointerCapture(e.pointerId);
    }catch(err){}
  }

  /** True if event is on a resize/rotate handle — these must beat ink hit-test underneath. */
  function _isInkOrOverlayHandleTarget(e){
    const t=e&&e.target;
    if(!t||!t.closest) return false;
    if(t.closest('#handles-overlay .ink-rh, #handles-overlay [data-cls], #handles-overlay [data-line-ep], #handles-overlay [data-rot]')) return true;
    if(t.closest('.ink-rh')) return true;
    if(t.closest('#pivot-handle')) return true;
    return false;
  }

  function _startInkDrag(pt, e){
    _inkDrag={
      ox:pt.x, oy:pt.y, lx:pt.x, ly:pt.y,
      totalDx:0, totalDy:0,
      moved:false, undo:false,
      objStart:_captureInkDragObjectStarts()
    };
    _drawing=true;
    _ptrId=e.pointerId;
    try{ window._anyDragging=true; }catch(err){}
    _capturePtr(e);
  }

  function _onPtrDown(e){
    if(e.button!=null&&e.button!==0) return;
    if(e.target&&e.target.closest&&e.target.closest('button,input,textarea,select,a,.rb,.rtab')) return;
    if(e.target&&e.target.closest&&e.target.closest('[data-cam-move],[data-cam-corner],[data-cam-rot]')) return;
    if(typeof window._cameraHandleAt==='function'&&window._cameraHandleAt(e.clientX,e.clientY)) return;
    // Resize / rotate markers always win — do not re-pick overlapping ink underneath
    if(_isInkOrOverlayHandleTarget(e)) return;
    // Corner rotate must beat ink-drag (pointerdown cancels mousedown-based rotate)
    if(typeof window._tryStartInkCornerRotation==='function'&&window._tryStartInkCornerRotation(e)) return;
    if(typeof window._tryStartGroupCornerRotation==='function'&&window._tryStartGroupCornerRotation(e)) return;

    // Pipette: sample ink, then objects; never start a stroke while pipette is on
    if(typeof pipetteMode!=='undefined'&&pipetteMode&&(pipetteSrc||(typeof pipetteDrawMode!=='undefined'&&pipetteDrawMode))){
      const pt=_canvasPoint(e);
      if(pt&&typeof window.pipetteSampleInkAt==='function'&&window.pipetteSampleInkAt(pt.x, pt.y, e)){
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Sample colour from text / shape / icon / etc. under the cursor
      try{
        const stack=document.elementsFromPoint(e.clientX, e.clientY)||[];
        for(let i=0;i<stack.length;i++){
          const node=stack[i];
          if(!node||!node.closest) continue;
          const el=node.closest('.el');
          if(!el||el.classList.contains('decor-el')) continue;
          if(el.dataset&&el.dataset.type==='inkhost') continue;
          // Draw pipette: skip objects that have no usable colour (keep looking)
          if(typeof pipetteDrawMode!=='undefined'&&pipetteDrawMode){
            if(typeof _pipetteColorFromElement==='function'&&!_pipetteColorFromElement(el)) continue;
          }
          if(typeof pipetteApply==='function'){
            e.preventDefault();
            e.stopPropagation();
            pipetteApply(el, {shift:!!e.shiftKey});
            return;
          }
        }
      }catch(err){}
      // Draw-tool pipette: block painting until a colour is picked
      if(typeof pipetteDrawMode!=='undefined'&&pipetteDrawMode){
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // Cursor / object mode: pick / rubber-band / drag ink (also outside Drawing tab)
    if(!_isDrawTool()){
      const pt=_canvasPoint(e);
      if(!pt) return;
      const additive=!!(e.ctrlKey||e.metaKey||e.shiftKey);
      const hit=_pickInkAt(pt.x, pt.y, e);
      const onEl=e.target&&e.target.closest&&e.target.closest('.el');

      if(hit){
        e.preventDefault();
        e.stopPropagation();
        // preventDefault suppresses compat mousedown — do NOT leave _inkPtrHandled stuck
        const willDrag=!additive;
        if(additive){
          _selectInkStroke(hit, true, {silent:willDrag});
        } else if(!_selInkIds.has(hit.id)){
          // Expand group whenever ink has groupId (strokes and fills)
          _setInkSelection([hit.id], {expandGroup:true, silent:willDrag});
        } else {
          // Already in ink selection — keep co-selected objects; refresh group chrome
          if(typeof _updateHandlesOverlay==='function'){
            try{ _updateHandlesOverlay(); }catch(err){}
          }
        }
        if(_selInkIds.has(hit.id)&&willDrag){
          _startInkDrag(pt, e);
        } else if(!willDrag){
          _syncDrawSidePanel();
        }
        return;
      }

      // Click on slide objects → leave to object tools
      if(onEl){
        const el=e.target.closest('.el');
        // Keep ink when dragging an already-selected shape (co-selection with ink)
        if(_selInkIds.size&&!additive&&!_elAlreadySelected(el)){
          _clearInkSelection();
          _syncDrawSidePanel();
        }
        return;
      }

      // Empty canvas: let 28-multisel rubber-band select objects + ink together
      return;
    }

    if(!_isDrawTool()) return;
    e.preventDefault();
    e.stopPropagation();
    const pt=_canvasPoint(e);
    if(!pt) return;
    _cursorPt=pt;
    if(_tool==='fill'){
      // Click on existing fill → move; empty → bucket
      const fillHit=_pickFillAt(pt.x, pt.y);
      if(fillHit){
        const additive=!!(e.ctrlKey||e.metaKey||e.shiftKey);
        if(additive){
          _selectInkStroke(fillHit, true, {silent:true});
        } else if(!_selInkIds.has(fillHit.id)){
          _setInkSelection([fillHit.id], {expandGroup:true, silent:true});
        }
        // already selected → keep multi and drag all
        _startInkDrag(pt, e);
        return;
      }
      if(_selInkIds.size){ _clearInkSelection(); _syncDrawSidePanel(); }
      if(typeof desel==='function') try{ desel(); }catch(err){}
      if(typeof clearMultiSel==='function') try{ clearMultiSel(); }catch(err){}
      _bucketFillAt(pt.x, pt.y);
      return;
    }
    if(_selInkIds.size){ _clearInkSelection(); _syncDrawSidePanel(); }
    if(typeof desel==='function') try{ desel(); }catch(err){}
    if(typeof clearMultiSel==='function') try{ clearMultiSel(); }catch(err){}
    _drawing=true;
    _ptrId=e.pointerId;
    _updateBrushCursor(e.clientX, e.clientY);
    _capturePtr(e);
    if(_tool==='eraser'){
      _pendingEraseUndo=true;
      if(_eraseAt(pt.x, pt.y, _eraserWidth()/2)){
        _invalidateInkCache();
        redrawInk();
      }
      return;
    }
    if(typeof pushUndo==='function') pushUndo();
    const isMarker=_tool==='marker';
    _syncInkIdCounters();
    _stroke={
      id:'ink'+(++_inkEc),
      tool:_tool,
      color:_color,
      colorScheme:_colorScheme||null,
      width:isMarker?_markerWidth():_penWidth(),
      opacity:Math.max(0.05,Math.min(1,(isMarker?_markerOpacity:_opacity)/100)),
      pressure:isMarker?false:_pressure,
      smooth:_smooth,
      taper:!isMarker?_taper:'both',
      neonBright:_tool==='neon'?_neonBright:undefined,
      z:_nextInkZ(),
      points:[{x:pt.x,y:pt.y,p:pt.p,t:pt.t}]
    };
    redrawInk();
  }

  function _onPtrMove(e){
    const pt=_canvasPoint(e);
    if(pt) _cursorPt=pt;
    if(_isDrawTool()) _updateBrushCursor(e.clientX, e.clientY);

    if(_inkRubber&&(_ptrId==null||e.pointerId===_ptrId)){
      e.preventDefault();
      if(!pt) return;
      _inkRubber.x1=pt.x;
      _inkRubber.y1=pt.y;
      _updateInkRubberVisual();
      return;
    }
    if(_inkDrag&&(_ptrId==null||e.pointerId===_ptrId)){
      e.preventDefault();
      if(!pt) return;
      if(!_inkDrag.moved){
        if(Math.hypot(pt.x-_inkDrag.ox, pt.y-_inkDrag.oy)<2.5) return;
        _inkDrag.moved=true;
        if(!_inkDrag.undo){
          if(typeof pushUndo==='function') pushUndo();
          _inkDrag.undo=true;
        }
      }
      const dx=pt.x-_inkDrag.lx, dy=pt.y-_inkDrag.ly;
      _inkDrag.lx=pt.x;
      _inkDrag.ly=pt.y;
      _inkDrag.totalDx=pt.x-_inkDrag.ox;
      _inkDrag.totalDy=pt.y-_inkDrag.oy;
      _moveSelectedInkBy(dx, dy);
      // Absolute from drag-start — avoids parseInt truncation drift vs float ink points
      _applyInkDragObjectPositions(_inkDrag);
      return;
    }

    if(!_drawing||(_ptrId!=null&&e.pointerId!==_ptrId)) return;
    e.preventDefault();
    if(!pt) return;
    if(_tool==='eraser'){
      if(_eraseAt(pt.x, pt.y, _eraserWidth()/2)){
        _invalidateInkCache();
        _scheduleRedraw();
      }
      return;
    }
    if(!_stroke) return;
    const last=_stroke.points[_stroke.points.length-1];
    const dx=pt.x-last.x, dy=pt.y-last.y;
    if(dx*dx+dy*dy<0.35) return;
    _stroke.points.push({x:pt.x,y:pt.y,p:pt.p,t:pt.t});
    _scheduleRedraw();
  }

  function _finishInkRubber(){
    const r=_inkRubber;
    _hideInkRubber();
    if(!r) return;
    const x0=Math.min(r.x0,r.x1), y0=Math.min(r.y0,r.y1);
    const x1=Math.max(r.x0,r.x1), y1=Math.max(r.y0,r.y1);
    const w=x1-x0, h=y1-y0;
    if(w<3&&h<3){
      if(!r.additive){ _clearInkSelection(); _syncDrawSidePanel(); }
      return;
    }
    const ids=_collectInkIdsInRect(x0,y0,w,h);
    if(r.additive){
      const next=new Set(_selInkIds);
      ids.forEach(id=>next.add(id));
      if(next.size){
        _setInkSelection(next, {keepObjectSel:true});
        _ensureObjectSelInMultiWithInk();
      } else { _clearInkSelection(); _syncDrawSidePanel(); }
    } else if(ids.length){
      _setInkSelection(ids);
    } else {
      _clearInkSelection();
      _syncDrawSidePanel();
    }
  }

  function selectInkInRect(rx, ry, rw, rh, opts){
    opts=opts||{};
    const keepObj=!!opts.keepObjectSel;
    // Rubber touches one stroke/fill of a group → select the whole ink group
    const expand=opts.expandGroup!==false;
    const ids=_collectInkIdsInRect(rx, ry, rw, rh);
    if(opts.additive){
      const next=new Set(_selInkIds);
      ids.forEach(id=>next.add(id));
      if(next.size){
        _setInkSelection(next, {expandGroup:expand, silent:!!opts.silent, keepObjectSel:keepObj});
        return _selInkIds.size;
      }
      if(!opts.keepIfEmpty){ _clearInkSelection(); if(!opts.silent) _syncDrawSidePanel(); }
      return 0;
    }
    if(ids.length){
      _setInkSelection(ids, {expandGroup:expand, silent:!!opts.silent, keepObjectSel:keepObj});
      return _selInkIds.size;
    }
    if(!opts.keepIfEmpty){
      _clearInkSelection();
      if(!opts.silent) _syncDrawSidePanel();
    }
    return 0;
  }

  /** Select every stroke + fill on the current slide (for Ctrl+A). */
  function selectAllInk(opts){
    opts=opts||{};
    const ink=_inkArr()||[];
    const fills=_fillsArr()||[];
    const ids=[];
    ink.forEach(s=>{ if(s&&s.id) ids.push(s.id); });
    fills.forEach(f=>{ if(f&&f.id) ids.push(f.id); });
    if(!ids.length){
      if(!opts.keepIfEmpty) _clearInkSelection();
      return 0;
    }
    _setInkSelection(ids, {
      expandGroup:false,
      silent:!!opts.silent,
      keepObjectSel:opts.keepObjectSel!==false
    });
    return ids.length;
  }

  function clearInkSelectionPublic(){
    _clearInkSelection();
    _syncDrawSidePanel();
  }

  function pickAndSelectInkAt(x, y, opts){
    opts=opts||{};
    const hit=_pickInkAt(x, y);
    if(!hit) return null;
    _selectInkStroke(hit, !!opts.additive, {silent:!!opts.silent});
    if(!opts.silent) _syncDrawSidePanel();
    return hit;
  }

  function _onPtrUp(e){
    if(_inkRubber&&(_ptrId==null||e.pointerId===_ptrId)){
      e.preventDefault();
      _drawing=false;
      _ptrId=null;
      _releasePtr(e);
      _finishInkRubber();
      return;
    }
    if(_inkDrag&&(_ptrId==null||e.pointerId===_ptrId)){
      e.preventDefault();
      const moved=!!_inkDrag.moved;
      _inkDrag=null;
      _drawing=false;
      _ptrId=null;
      try{ window._anyDragging=false; }catch(err){}
      try{ window._inkPtrHandled=false; }catch(err){}
      _releasePtr(e);
      _syncDrawSidePanel();
      if(moved){
        if(typeof save==='function') try{ save(); }catch(err){}
        if(typeof drawThumbs==='function') drawThumbs();
        if(typeof saveState==='function') saveState();
      }
      return;
    }

    if(!_drawing) return;
    if(_ptrId!=null&&e.pointerId!==_ptrId) return;
    e.preventDefault();
    _drawing=false;
    _ptrId=null;
    _releasePtr(e);
    if(_tool==='eraser'){
      _pendingEraseUndo=false;
      _pruneOrphanInkHosts();
      _invalidateInkCache();
      redrawInk();
      if(typeof renderObjectsPanel==='function'){
        try{ renderObjectsPanel(); }catch(err){}
      }
      if(typeof drawThumbs==='function') drawThumbs();
      if(typeof saveState==='function') saveState();
      _updateBrushCursor(e.clientX, e.clientY);
      return;
    }
    if(_stroke&&_stroke.points.length){
      const ink=_inkArr();
      const done=_stroke;
      if(ink) ink.push(done);
      _stroke=null;
      _clearLiveCanvas();
      const live=_liveEl();
      if(live) live.innerHTML='';
      _ensureInkHostForItems([done], done.groupId||null);
      _invalidateInkCache();
      redrawInk();
      if(typeof drawThumbs==='function') drawThumbs();
      if(typeof saveState==='function') saveState();
    } else {
      _stroke=null;
      _clearLiveCanvas();
      const live=_liveEl();
      if(live) live.innerHTML='';
    }
    _updateBrushCursor(e.clientX, e.clientY);
  }

  function _bindTarget(){
    return document.getElementById('cwrap') || _layerEl();
  }

  function _bindLayer(){
    const target=_bindTarget();
    if(!target||target._drawBound) return;
    target._drawBound=true;
    target.addEventListener('pointerdown',_onPtrDown,true);
    target.addEventListener('pointermove',_onPtrMove,true);
    target.addEventListener('pointerup',_onPtrUp,true);
    target.addEventListener('pointercancel',_onPtrUp,true);
    target.addEventListener('pointerleave',()=>{ if(!_drawing) _hideBrushCursor(); },true);
    target.addEventListener('contextmenu',_onInkContextMenu,true);
  }

  function _setLayerActive(on){
    document.body.classList.toggle('draw-mode', !!on);
    const layer=_layerEl();
    if(layer){
      layer.style.pointerEvents='none';
      layer.style.cursor='';
    }
    const wrap=document.getElementById('cwrap');
    if(wrap){
      wrap.style.cursor=on?'none':'';
      wrap.classList.toggle('draw-hit', !!on);
    }
    if(!on) _hideBrushCursor();
  }

  function _hilTools(){
    ['cursor','brush','neon','marker','fill','eraser'].forEach(t=>{
      const b=document.getElementById('draw-tool-'+t);
      if(b) b.classList.toggle('on', _tool===t);
    });
  }

  function _mkSizeBtn(size, selected, onClick, title){
    const b=document.createElement('button');
    b.type='button';
    b.className='draw-size-btn'+(selected?' on':'');
    b.title=title||(size+'px');
    const d=Math.max(1, Math.min(16, size<=4 ? Math.max(1, size*1.35) : size*0.9));
    b.innerHTML='<span class="draw-size-dot" style="width:'+d+'px;height:'+d+'px"></span>';
    b.onclick=onClick;
    return b;
  }

  function _mkStylusBtn(){
    const b=document.createElement('button');
    b.type='button';
    b.className='draw-size-btn draw-stylus-btn'+(_pressure?' on':'');
    b.title=(typeof t==='function'?t('drawStylus'):'Stylus pressure');
    b.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v10"/><path d="M8 7l4-4 4 4"/><rect x="6" y="14" width="12" height="7" rx="1.5"/></svg>';
    b.onclick=()=>{
      _pressure=!_pressure;
      _savePrefs();
      syncDrawPropsUI();
    };
    return b;
  }

  function _taperIconSvg(kind){
    // Profile icons: thin-thick-thin / thick-thin / thin-thick
    if(kind==='out'){
      return '<svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true"><path d="M2 3 L14 5.5 L26 7 L14 8.5 L2 11 Z" fill="currentColor"/></svg>';
    }
    if(kind==='in'){
      return '<svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true"><path d="M2 7 L14 5.5 L26 3 L26 11 L14 8.5 L2 7 Z" fill="currentColor"/></svg>';
    }
    return '<svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true"><path d="M2 7 L8 4.5 L14 3.5 L20 4.5 L26 7 L20 9.5 L14 10.5 L8 9.5 Z" fill="currentColor"/></svg>';
  }

  function _nearestSizeIdx(sizes, w){
    let best=0, bestD=Infinity;
    for(let i=0;i<sizes.length;i++){
      const d=Math.abs(sizes[i]-w);
      if(d<bestD){ bestD=d; best=i; }
    }
    return best;
  }

  function syncDrawPropsUI(){
    const pen=document.getElementById('draw-props-pen');
    const ers=document.getElementById('draw-props-eraser');
    const fillP=document.getElementById('draw-props-fill');
    const selP=document.getElementById('draw-props-sel');
    const hint=document.getElementById('draw-props-hint');
    const selList=_selectedStrokes();
    const selFills=_selectedFills();
    const selStroke=selList[0]||null;
    const selFill=selFills[0]||null;
    const showSel=(selList.length>0||selFills.length>0)&&_tool==='cursor';
    const isPen=_isPenTool()&&!showSel;
    const isErs=_tool==='eraser'&&!showSel;
    const isFillTool=_tool==='fill'&&!showSel;

    if(hint){
      hint.style.display='none';
    }
    if(pen) pen.style.display=isPen?'block':'none';
    if(ers) ers.style.display=isErs?'block':'none';
    if(fillP) fillP.style.display=isFillTool?'block':'none';
    if(selP) selP.style.display=showSel?'block':'none';

    const sm=document.getElementById('draw-smooth');
    if(sm&&isPen){
      sm.value=_smooth;
      if(typeof refreshNumScrubber==='function') refreshNumScrubber(sm);
    }
    const opEl=document.getElementById('draw-opacity');
    if(opEl&&isPen){
      opEl.value=_tool==='marker'?_markerOpacity:_opacity;
      if(typeof refreshNumScrubber==='function') refreshNumScrubber(opEl);
    }
    const neonWrap=document.getElementById('draw-neon-bright-wrap');
    const neonEl=document.getElementById('draw-neon-bright');
    if(neonWrap) neonWrap.style.display=(isPen&&_tool==='neon')?'':'none';
    if(neonEl&&_tool==='neon'){
      neonEl.value=_neonBright;
      if(typeof refreshNumScrubber==='function') refreshNumScrubber(neonEl);
    }

    const row=document.getElementById('draw-size-row');
    if(row&&isPen){
      row.innerHTML='';
      const sizes=_tool==='marker'?MARKER_SIZES:PEN_SIZES;
      const idx=_tool==='marker'?_markerSizeIdx:_penSizeIdx;
      sizes.forEach((sz,i)=>{
        row.appendChild(_mkSizeBtn(sz, i===idx, ()=>{
          if(_tool==='marker') _markerSizeIdx=i;
          else _penSizeIdx=i;
          _savePrefs();
          syncDrawPropsUI();
          _updateBrushCursor();
        }, sz+'px'));
      });
      if(_isBrushFamily(_tool)) row.appendChild(_mkStylusBtn());
    }
    const taperWrap=document.getElementById('draw-taper-wrap');
    const taperRow=document.getElementById('draw-taper-row');
    if(taperRow){
      if(isPen&&_isBrushFamily(_tool)){
        if(taperWrap) taperWrap.style.display='';
        taperRow.style.display='';
        taperRow.innerHTML='';
        [
          {id:'both', titleKey:'drawTaperBoth'},
          {id:'out', titleKey:'drawTaperOut'},
          {id:'in', titleKey:'drawTaperIn'}
        ].forEach(opt=>{
          const b=document.createElement('button');
          b.type='button';
          b.className='draw-size-btn draw-taper-btn'+(_taper===opt.id?' on':'');
          b.dataset.taper=opt.id;
          b.title=typeof t==='function'?t(opt.titleKey):opt.id;
          b.innerHTML=_taperIconSvg(opt.id);
          b.onclick=()=>{ _taper=opt.id; _savePrefs(); syncDrawPropsUI(); };
          taperRow.appendChild(b);
        });
      } else {
        if(taperWrap) taperWrap.style.display='none';
        taperRow.style.display='none';
      }
    }
    const erow=document.getElementById('draw-eraser-size-row');
    if(erow&&isErs){
      erow.innerHTML='';
      ERASER_SIZES.forEach((sz,i)=>{
        erow.appendChild(_mkSizeBtn(sz, i===_eraserSizeIdx, ()=>{
          _eraserSizeIdx=i; _savePrefs(); syncDrawPropsUI(); _updateBrushCursor();
        }, sz+'px'));
      });
    }


    // Fill tool props
    if(isFillTool){
      const fop=document.getElementById('draw-fill-opacity');
      if(fop){
        fop.value=_fillOpacity;
        if(typeof refreshNumScrubber==='function') refreshNumScrubber(fop);
      }
      ['solid','fadeIn','fadeOut','lines','hatch','dots'].forEach(p=>{
        const b=document.getElementById('draw-fill-pat-'+p);
        if(b) b.classList.toggle('on', _fillPattern===p);
      });
      const grow=document.getElementById('draw-fill-gap-row');
      if(grow){
        grow.innerHTML='';
        [0,10,20,30,50].forEach(g=>{
          const b=document.createElement('button');
          b.type='button';
          b.className='draw-size-btn draw-fill-gap-btn'+(_fillGap===g?' on':'');
          b.title=(g===0
            ?(typeof t==='function'?t('drawFillGapClosed'):'Полностью замкнуто')
            :(typeof t==='function'?t('drawFillGapPx').replace('{n}',String(g)):('Разрыв до '+g+'px')));
          b.innerHTML=_fillGapIconSvg(g);
          b.onclick=()=>setFillGap(g);
          grow.appendChild(b);
        });
      }
      const prev=document.getElementById('draw-fill-col-preview');
      const hex=document.getElementById('draw-fill-hex');
      if(prev){ prev.style.background=_color; prev.style.backgroundColor=_color; }
      if(hex){
        hex.value=(typeof _colorFieldDisplay==='function')
          ?_colorFieldDisplay(_color,_colorScheme):_color;
      }
      const slot=document.getElementById('cp-draw-fill-slot');
      if(slot){
        slot.style.display='block';
        if(!slot.querySelector('.draw-palette-grid')||!slot.querySelector('canvas')){
          _drawFillPalette({
            slotId:'cp-draw-fill-slot',
            previewId:'draw-fill-col-preview',
            hexId:'draw-fill-hex',
            seedColor:_color
          });
        } else {
          const prev=document.getElementById('draw-fill-col-preview');
          if(prev){ prev.style.background=_color; prev.style.backgroundColor=_color; }
        }
      }
    }

    // Selected stroke(s) props
    if(showSel&&(selStroke||selFill)){
      const title=document.getElementById('draw-sel-title');
      if(title){
        const n=selList.length+selFills.length;
        if(n>1){
          title.textContent=(typeof t==='function'?t('drawSelStrokesN'):'Выделено: {n}').replace('{n}',String(n));
        } else if(selFill&&!selStroke){
          title.textContent=typeof t==='function'?t('drawSelFill'):'Выделенная заливка';
        } else {
          title.textContent=typeof t==='function'?t('drawSelStroke'):'Выделенный штрих';
        }
      }
      const srow=document.getElementById('draw-sel-size-row');
      const sizeWrap=document.getElementById('draw-sel-size-wrap');
      if(srow&&selStroke){
        if(sizeWrap) sizeWrap.style.display='';
        srow.innerHTML='';
        const sizes=selStroke.tool==='marker'?MARKER_SIZES:PEN_SIZES;
        const curIdx=_nearestSizeIdx(sizes, +selStroke.width||6);
        sizes.forEach((sz,i)=>{
          srow.appendChild(_mkSizeBtn(sz, i===curIdx, ()=>{
            _applyToSelectedInk(s=>{ s.width=sz; });
          }, sz+'px'));
        });
      } else if(sizeWrap){
        sizeWrap.style.display='none';
      }
      const fillPatWrap=document.getElementById('draw-sel-fill-pat-wrap');
      if(fillPatWrap){
        fillPatWrap.style.display=selFills.length?'':'none';
        if(selFills.length){
          ['solid','fadeIn','fadeOut','lines','hatch','dots'].forEach(p=>{
            const b=document.getElementById('draw-sel-fill-pat-'+p);
            if(b) b.classList.toggle('on', (selFill.pattern||'solid')===p);
          });
        }
      }
      const sop=document.getElementById('draw-sel-opacity');
      if(sop){
        const opSrc=selStroke||selFill;
        sop.value=Math.round((+(opSrc&&opSrc.opacity)||1)*100);
        if(typeof refreshNumScrubber==='function') refreshNumScrubber(sop);
      }
      const selNeonWrap=document.getElementById('draw-sel-neon-bright-wrap');
      const selNeonEl=document.getElementById('draw-sel-neon-bright');
      const hasNeonSel=!!(selStroke&&selStroke.tool==='neon');
      if(selNeonWrap) selNeonWrap.style.display=hasNeonSel?'':'none';
      if(selNeonEl&&hasNeonSel){
        selNeonEl.value=_neonBrightPct(selStroke);
        if(typeof refreshNumScrubber==='function') refreshNumScrubber(selNeonEl);
      }
      const prev=document.getElementById('draw-sel-col-preview');
      const hex=document.getElementById('draw-sel-hex');
      const colSrc=selStroke||selFill;
      if(prev) prev.style.background=(colSrc&&colSrc.color)||_color;
      if(hex&&colSrc){
        hex.value=(typeof _colorFieldDisplay==='function')
          ?_colorFieldDisplay(colSrc.color||_color, colSrc.colorScheme||null)
          :(colSrc.color||_color);
      }
      const selSlot=document.getElementById('cp-draw-sel-slot');
      if(selSlot){
        selSlot.style.display='block';
        if(!selSlot.querySelector('.draw-palette-grid')||!selSlot.querySelector('canvas')){
          const seed=(selStroke&&selStroke.color)||(selFill&&selFill.color)||_color;
          _drawFillPalette({
            slotId:'cp-draw-sel-slot',
            previewId:'draw-sel-col-preview',
            hexId:'draw-sel-hex',
            seedColor:seed
          });
        }
      }
      const gBtn=document.getElementById('draw-sel-group');
      const ugBtn=document.getElementById('draw-sel-ungroup');
      if(gBtn) gBtn.style.display=selList.length>=2?'':'none';
      if(ugBtn) ugBtn.style.display=selList.some(s=>s.groupId)?'':'none';
    } else {
      const selSlot=document.getElementById('cp-draw-sel-slot');
      if(selSlot){
        if(typeof window._cpCleanup==='function'&&selSlot.querySelector('canvas')) try{ window._cpCleanup(); }catch(e){}
        selSlot.innerHTML='';
        selSlot.style.display='none';
      }
    }

    const prev=document.getElementById('draw-col-preview');
    const hex=document.getElementById('draw-hex');
    if(prev&&isPen) prev.style.background=_color;
    if(hex&&isPen){
      hex.value=(typeof _colorFieldDisplay==='function')
        ?_colorFieldDisplay(_color,_colorScheme)
        :_color;
    }
    if(isPen){
      const slot=document.getElementById('cp-draw-slot');
      if(!slot||!slot.querySelector('canvas')) _drawFillPalette();
    }
  }

  function _drawFillPalette(opts){
    opts=opts||{};
    const slotId=opts.slotId||'cp-draw-slot';
    const previewId=opts.previewId||'draw-col-preview';
    const hexId=opts.hexId||'draw-hex';
    const seed=opts.seedColor||_color;
    const slot=document.getElementById(slotId);
    if(!slot) return;
    if(!opts.force&&slot.querySelector('canvas')&&slot.querySelector('.draw-palette-grid')){
      const prevEl=document.getElementById(previewId);
      if(prevEl&&seed){ prevEl.style.background=seed; prevEl.style.backgroundColor=seed; }
      return;
    }
    if(typeof window._cpCleanup==='function') try{ window._cpCleanup(); }catch(e){}
    slot.innerHTML='';
    slot.style.display='block';
    slot.onmousedown=e=>e.preventDefault();
    const schemeIdx=(typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)
      ?appliedThemeIdx
      :((typeof selTheme!=='undefined'&&selTheme>=0)?selTheme:-1);

    let seedHex=seed||_color||'#64748b';
    if(seedHex&&!/^#/.test(seedHex)&&typeof _rgbToHex==='function'){
      const h=_rgbToHex(seedHex); if(h) seedHex=h;
    }

    const customSwatch=document.createElement('div');
    customSwatch.className='draw-custom-swatch';
    customSwatch.title='Свой цвет';
    customSwatch.style.cssText='width:100%;height:14px;border-radius:3px;border:1px solid var(--border2);background:'+seedHex+';cursor:default;box-sizing:border-box;margin-bottom:8px;';

    const pickerWrap=document.createElement('div');
    pickerWrap.style.cssText='margin-top:4px;';

    if(schemeIdx>=0&&typeof THEMES!=='undefined'&&THEMES[schemeIdx]){
      const th=THEMES[schemeIdx];
      const levels=(typeof SCHEME_TINT_LEVELS!=='undefined'&&SCHEME_TINT_LEVELS)
        ?SCHEME_TINT_LEVELS:[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9];
      const nCols=typeof _themeColors==='function'?_themeColors(th).length:8;
      const grid=document.createElement('div');
      grid.className='draw-palette-grid';
      grid.style.cssText='display:grid;grid-template-columns:repeat(8,1fr);gap:1px;margin-bottom:8px;';
      for(let rowIdx=0;rowIdx<levels.length;rowIdx++){
        for(let colIdx=0;colIdx<nCols;colIdx++){
          const color=typeof _schemeSwatchColor==='function'?_schemeSwatchColor(th,colIdx,rowIdx):'#888';
          const pos=typeof _schemePosCode==='function'?_schemePosCode(colIdx,rowIdx):'';
          const s=document.createElement('div');
          s.style.cssText='aspect-ratio:2/1;border-radius:2px;cursor:pointer;background:'+color+';min-height:6px;';
          s.title=pos+' · '+color;
          s.onmousedown=ev=>{
            ev.preventDefault(); ev.stopPropagation();
            customSwatch.style.background=color;
            if(typeof pickerWrap._cpSetHex==='function') pickerWrap._cpSetHex(color);
            setDrawColor(color,{col:colIdx,row:rowIdx});
          };
          grid.appendChild(s);
        }
      }
      slot.appendChild(grid);
    }
    slot.appendChild(customSwatch);
    const prevEl=document.getElementById(previewId);
    if(prevEl&&seed){ prevEl.style.background=seed; prevEl.style.backgroundColor=seed; }
    if(slotId==='cp-draw-slot') _paintDrawPreview(_color);
    slot.appendChild(pickerWrap);
    if(typeof _cpBuildPhotoshopPicker==='function'){
      let ignoreInitPick=true;
      _cpBuildPhotoshopPicker(pickerWrap, customSwatch, (hex)=>{
        if(ignoreInitPick) return;
        setDrawColor(hex, null);
      }, slotId);
      ignoreInitPick=false;
    }
    if(slotId==='cp-draw-slot') _paintDrawPreview(_color);
    const hexEl=document.getElementById(hexId);
    if(hexEl){
      if(slotId==='cp-draw-sel-slot'){
        const first=_selectedStrokes()[0]||_selectedFills()[0];
        const c=first?first.color:_color;
        const sch=first?first.colorScheme:null;
        hexEl.value=(typeof _colorFieldDisplay==='function')?_colorFieldDisplay(c||_color, sch): (c||_color);
      } else {
        hexEl.value=(typeof _colorFieldDisplay==='function')
          ?_colorFieldDisplay(_color,_colorScheme)
          :_color;
      }
    }
  }

  function _paintDrawPreview(c){
    const prev=document.getElementById('draw-col-preview');
    if(!prev||!c) return;
    prev.style.background=c;
    prev.style.backgroundColor=c;
  }

  function setDrawColor(c, schemeRef){
    if(!c) return;
    // Always keep tool brush/fill color in sync (so swatch/palette reflect the pick)
    _color=c;
    if(schemeRef!==undefined) _colorScheme=schemeRef||null;
    _savePrefs();

    if(_selInkIds.size){
      const strokes=_selectedStrokes();
      const fills=_selectedFills();
      if(strokes.length||fills.length){
        if(typeof pushUndo==='function') pushUndo();
        strokes.forEach(s=>{
          s.color=c;
          if(schemeRef!==undefined) s.colorScheme=schemeRef||null;
        });
        fills.forEach(f=>{
          f.color=c;
          if(schemeRef!==undefined) f.colorScheme=schemeRef||null;
        });
        _invalidateInkCache();
        redrawInk();
        if(typeof drawThumbs==='function') drawThumbs();
        if(typeof saveState==='function') saveState();
      }
      const prev=document.getElementById('draw-sel-col-preview');
      const hex=document.getElementById('draw-sel-hex');
      if(prev){ prev.style.background=c; prev.style.backgroundColor=c; }
      if(hex){
        hex.value=(typeof _colorFieldDisplay==='function')
          ?_colorFieldDisplay(c, schemeRef!==undefined?schemeRef:(_colorScheme||null))
          :c;
      }
    }
    _paintDrawPreview(c);
    const hex=document.getElementById('draw-hex');
    if(hex){
      hex.value=(typeof _colorFieldDisplay==='function')
        ?_colorFieldDisplay(c,_colorScheme)
        :c;
    }
    if(_tool==='fill'||(function(){ const el=document.getElementById('draw-props-fill'); return el&&el.style.display==='block'; })()){
      const fp=document.getElementById('draw-fill-col-preview');
      const fh=document.getElementById('draw-fill-hex');
      if(fp){ fp.style.background=c; fp.style.backgroundColor=c; }
      if(fh){
        fh.value=(typeof _colorFieldDisplay==='function')
          ?_colorFieldDisplay(c,_colorScheme):c;
      }
    }
  }

  function setSelectedInkOpacity(v){
    const pct=Math.max(5,Math.min(100,+v||40));
    const strokes=_selectedStrokes();
    const fills=_selectedFills();
    if(!strokes.length&&!fills.length) return;
    if(typeof pushUndo==='function') pushUndo();
    strokes.forEach(s=>{ s.opacity=pct/100; });
    fills.forEach(f=>{ f.opacity=pct/100; });
    _invalidateInkCache();
    redrawInk();
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
    syncDrawPropsUI();
  }

  /** Remap palette-pinned ink colors when the color scheme changes. */
  function remapInkForTheme(theme){
    if(!theme||typeof slides==='undefined'||typeof _resolveSchemeColor!=='function') return;
    slides.forEach(s=>{
      if(s&&s.ink&&s.ink.length){
        s.ink.forEach(stroke=>{
          if(!stroke||!stroke.colorScheme) return;
          const resolved=_resolveSchemeColor(stroke.colorScheme, theme);
          if(resolved) stroke.color=resolved;
        });
      }
      if(s&&s.inkFills&&s.inkFills.length){
        s.inkFills.forEach(fill=>{
          if(!fill||!fill.colorScheme) return;
          const resolved=_resolveSchemeColor(fill.colorScheme, theme);
          if(resolved) fill.color=resolved;
        });
      }
    });
    if(_colorScheme){
      const resolved=_resolveSchemeColor(_colorScheme, theme);
      if(resolved){
        _color=resolved;
        _savePrefs();
      }
    }
    _invalidateInkCache();
    redrawInk();
    _refreshDrawColorUI();
  }

  function _refreshDrawColorUI(){
    _paintDrawPreview(_color);
    const hex=document.getElementById('draw-hex');
    if(hex){
      hex.value=(typeof _colorFieldDisplay==='function')
        ?_colorFieldDisplay(_color,_colorScheme)
        :_color;
    }
    const wrap=document.getElementById('props-draw-wrap');
    const pen=document.getElementById('draw-props-pen');
    const drawOpen=wrap&&wrap.style.display!=='none'&&pen&&pen.style.display!=='none';
    if(drawOpen){
      const slot=document.getElementById('cp-draw-slot');
      if(slot){
        if(typeof window._cpCleanup==='function') try{ window._cpCleanup(); }catch(e){}
        slot.innerHTML='';
      }
      syncDrawPropsUI();
      _paintDrawPreview(_color);
    }
  }

  function setDrawSmooth(v){
    _smooth=Math.max(0,Math.min(200,+v||0));
    const sm=document.getElementById('draw-smooth');
    if(sm){
      sm.value=_smooth;
      if(typeof refreshNumScrubber==='function') refreshNumScrubber(sm);
    }
    _savePrefs();
  }

  function setDrawOpacity(v){
    const n=Math.max(0,Math.min(100,+v||0));
    if(_tool==='marker') _markerOpacity=Math.max(5,n);
    else _opacity=n;
    const opEl=document.getElementById('draw-opacity');
    if(opEl){
      opEl.value=_tool==='marker'?_markerOpacity:_opacity;
      if(typeof refreshNumScrubber==='function') refreshNumScrubber(opEl);
    }
    _savePrefs();
  }

  function setDrawNeonBright(v){
    _neonBright=Math.max(0,Math.min(100,+v||0));
    const el=document.getElementById('draw-neon-bright');
    if(el){
      el.value=_neonBright;
      if(typeof refreshNumScrubber==='function') refreshNumScrubber(el);
    }
    _savePrefs();
  }

  function setSelectedNeonBright(v){
    const n=Math.max(0,Math.min(100,+v||0));
    _applyToSelectedInk(s=>{
      if(s&&s.tool==='neon') s.neonBright=n;
    });
    const el=document.getElementById('draw-sel-neon-bright');
    if(el){
      el.value=n;
      if(typeof refreshNumScrubber==='function') refreshNumScrubber(el);
    }
  }

  function nudgeDrawSize(dir){
    dir=dir<0?-1:1;
    if(_selInkIds.size&&_tool==='cursor'){
      const s=_selectedStrokes()[0];
      if(!s) return;
      const sizes=s.tool==='marker'?MARKER_SIZES:PEN_SIZES;
      const idx=Math.max(0,Math.min(sizes.length-1,_nearestSizeIdx(sizes,+s.width||6)+dir));
      _applyToSelectedInk(st=>{ st.width=sizes[idx]; });
      return;
    }
    if(_tool==='eraser'){
      _eraserSizeIdx=Math.max(0,Math.min(ERASER_SIZES.length-1,_eraserSizeIdx+dir));
    } else if(_tool==='marker'){
      _markerSizeIdx=Math.max(0,Math.min(MARKER_SIZES.length-1,_markerSizeIdx+dir));
    } else if(_isBrushFamily(_tool)){
      _penSizeIdx=Math.max(0,Math.min(PEN_SIZES.length-1,_penSizeIdx+dir));
    } else return;
    _savePrefs();
    syncDrawPropsUI();
    _updateBrushCursor();
  }

  function _activateDrawingTab(){
    const btn=[...document.querySelectorAll('.rtab')].find(b=>{
      const oc=b.getAttribute('onclick')||'';
      return oc.indexOf("'drawing'")>=0||oc.indexOf('"drawing"')>=0;
    });
    if(btn&&typeof switchTab==='function') switchTab('drawing', btn);
    else {
      _drawTabOpen=true;
      openDrawingProps();
    }
  }

  function _animPropsVisible(){
    const w=document.getElementById('props-anim-wrap');
    return !!(w && w.style.display==='flex');
  }

  /** Create/pick inkhost for anim panel without dropping ink selection. */
  function _ensureInkHostPickedForAnim(){
    if(!_selInkIds.size) return null;
    if(typeof ensureInkHostForSelection!=='function') return null;
    let host=null;
    try{ host=ensureInkHostForSelection(); }catch(e){ return null; }
    if(!host) return null;
    const cv=document.getElementById('canvas');
    const el=cv&&cv.querySelector('.el[data-id="'+host.id+'"]');
    if(!el) return host;
    const keep=new Set(_selInkIds);
    if(typeof pick==='function'){
      try{ pick(el); }catch(e){}
    }
    // pick / group expand must not wipe ink selection
    _selInkIds=keep;
    _invalidateInkCache();
    redrawInk();
    return host;
  }

  /** Drawing tab: brush/marker/eraser → draw props; cursor → select ink or objects.
   *  Ink selection also shows stroke props when Drawing tab is not active.
   *  On Objects tab: keep object list visible, draw props below it. */
  function _objectsTabOpen(){
    const objSec=document.getElementById('objects-panel-section');
    return !!(objSec && objSec.style.display!=='none');
  }

  function _setPropsObjectsInkMode(on){
    const props=document.getElementById('props');
    if(!props) return;
    props.classList.toggle('props-objects-ink', !!on);
  }

  function _syncDrawSidePanel(){
    const wrap=document.getElementById('props-draw-wrap');
    const scroll=document.getElementById('props-scroll');
    const hasInkSel=_selInkIds.size>0;

    // Animations tab owns the props column — never hide it from here
    if(_animPropsVisible()){
      _setPropsObjectsInkMode(false);
      if(wrap) wrap.style.display='none';
      if(hasInkSel){
        _ensureInkHostPickedForAnim();
        if(typeof renderAnimPanel==='function'){
          try{ renderAnimPanel(); }catch(e){}
        }
      }
      return;
    }

    // Selected ink → show stroke/fill props; on Objects tab keep the list above
    if(hasInkSel && _tool==='cursor'){
      const onObj=_objectsTabOpen();
      _setPropsObjectsInkMode(onObj);
      if(wrap) wrap.style.display='flex';
      if(scroll) scroll.style.display=onObj?'':'none';
      syncDrawPropsUI();
      if(onObj){
        // Only objects list in scroll — hide slide / leftover element panels
        if(typeof syncProps==='function'){
          try{ syncProps(); }catch(e){}
        } else {
          ['slide-props','elprops','nosel','tprops','shprops','animprops','hoverprops',
           'imgprops','codeprops','mdprops','iconprops','tableprops','genprops','pteprops',
           'flipprops','qrprops','formulaprops','multiprops','lineangleprops'].forEach(id=>{
            const el=document.getElementById(id);
            if(el) el.style.display='none';
          });
        }
        if(typeof renderObjectsPanel==='function'){
          try{ renderObjectsPanel(); }catch(e){}
        }
      }
      return;
    }

    _setPropsObjectsInkMode(false);

    if(_isDrawTool()){
      if(wrap) wrap.style.display='flex';
      if(scroll) scroll.style.display='none';
      syncDrawPropsUI();
      return;
    }

    // Cursor: object/slide props only — no empty drawing panel
    if(wrap) wrap.style.display='none';
    if(scroll) scroll.style.display='';
    if(typeof syncProps==='function') syncProps();
  }

  function setDrawTool(tool){
    if(tool==='clear'){ clearSlideInk(); return; }
    if(tool==='pencil') tool='brush';
    if(tool==='highlighter') tool='marker';
    const prev=_tool;
    _tool=tool||'cursor';
    if(_tool!=='cursor') _clearInkSelection();
    _hilTools();
    _setLayerActive(_isDrawTool());
    _ensureSvgSize();
    _syncDrawSidePanel();
    if(_tool==='fill'&&prev!=='fill'){
      _drawFillPalette({
        slotId:'cp-draw-fill-slot',
        previewId:'draw-fill-col-preview',
        hexId:'draw-fill-hex',
        seedColor:_color,
        force:true
      });
    }
    if(_tool==='cursor'){
      document.body.classList.remove('draw-mode');
      _hideBrushCursor();
    }
  }

  function clearSlideInk(){
    if(typeof slides==='undefined'||!slides[cur]) return;
    const hasInk=slides[cur].ink&&slides[cur].ink.length;
    const hasFill=slides[cur].inkFills&&slides[cur].inkFills.length;
    const hasHosts=(slides[cur].els||[]).some(d=>d&&d.type==='inkhost');
    if(!hasInk&&!hasFill&&!hasHosts) return;
    if(typeof pushUndo==='function') pushUndo();
    slides[cur].ink=[];
    slides[cur].inkFills=[];
    _stroke=null;
    _selInkIds=new Set();
    _setInkRotBBox(null);
    // Force-remove all drawing hosts (not only orphans via inkIds)
    const cv=document.getElementById('canvas');
    (slides[cur].els||[]).forEach(d=>{
      if(!d||d.type!=='inkhost') return;
      const dom=cv&&cv.querySelector('.el[data-id="'+d.id+'"]');
      if(dom){
        if(typeof multiSel!=='undefined'&&multiSel) multiSel.delete(dom);
        if(typeof sel!=='undefined'&&sel===dom){
          try{ if(typeof pick==='function') pick(null); else sel=null; }catch(e){ sel=null; }
        }
        dom.remove();
      }
    });
    slides[cur].els=(slides[cur].els||[]).filter(d=>!d||d.type!=='inkhost');
    _invalidateInkCache();
    redrawInk();
    _refreshSelectionChromeAfterInkChange();
    if(typeof _updateSelFrames==='function'){
      try{ _updateSelFrames(); }catch(e){}
    }
    if(typeof renderObjectsPanel==='function'){
      try{ renderObjectsPanel(); }catch(e){}
    }
    _syncDrawSidePanel();
    if(typeof save==='function') try{ save(); }catch(e){}
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
  }

  function exitDrawMode(){
    if(_tool!=='cursor') setDrawTool('cursor');
  }

  function openDrawingProps(){
    _drawTabOpen=true;
    _loadPrefs();
    if(_colorScheme){
      _resolveBrushColorFromScheme();
    } else {
      const def=typeof _defaultLineColor==='function'?_defaultLineColor():null;
      if(def&&def.color&&String(_color).toLowerCase()===String(def.color).toLowerCase()){
        _colorScheme=def.schemeRef;
        _savePrefs();
      } else if(!_color){
        _pinDefaultBrushScheme();
        _savePrefs();
      }
    }
    _ensureSvgSize();
    redrawInk();
    const slot=document.getElementById('cp-draw-slot');
    if(slot){ if(typeof window._cpCleanup==='function') try{ window._cpCleanup(); }catch(e){} slot.innerHTML=''; }
    _hilTools();
    _syncDrawSidePanel();
  }

  function closeDrawingProps(){
    _drawTabOpen=false;
    // Keep ink selection — user may switch to Animations / Home and still edit it
    const wrap=document.getElementById('props-draw-wrap');
    const scroll=document.getElementById('props-scroll');
    if(wrap) wrap.style.display='none';
    if(scroll) scroll.style.display='';
    _setPropsObjectsInkMode(false);
    exitDrawMode();
    // Objects tab + selected ink: restore list + stroke props under it
    if(_selInkIds.size && typeof _syncDrawSidePanel==='function'){
      try{ _syncDrawSidePanel(); }catch(e){}
    }
  }

  window._drawingOnSlideLoad=function(){
    _stroke=null;
    _selInkIds=new Set();
    _repairDuplicateInkIds();
    try{ _pruneOrphanInkHosts(); }catch(e){}
    _ensureHostsForAllInk();
    _invalidateInkCache();
    _ensureSvgSize();
    redrawInk();
  };

  function bootDrawing(){
    let hadPrefs=false;
    try{ hadPrefs=!!localStorage.getItem(LS_KEY); }catch(e){}
    _loadPrefs();
    if(!hadPrefs){
      _pinDefaultBrushScheme();
    } else if(_colorScheme){
      _resolveBrushColorFromScheme();
    } else {
      const def=typeof _defaultLineColor==='function'?_defaultLineColor():null;
      if(def&&def.color&&String(_color).toLowerCase()===String(def.color).toLowerCase()){
        _colorScheme=def.schemeRef;
        _savePrefs();
      }
    }
    _bindLayer();
    _repairDuplicateInkIds();
    _ensureHostsForAllInk();
    _ensureSvgSize();
    redrawInk();
    _hilTools();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', bootDrawing);
  } else {
    setTimeout(bootDrawing, 0);
  }

  function _reorderInkArr(arr, ids, dir){
    if(!arr||!arr.length||!ids||!ids.size) return false;
    if(dir==='front'||dir==='back'){
      const sel=[], rest=[];
      arr.forEach(it=>{ if(it&&ids.has(it.id)) sel.push(it); else rest.push(it); });
      if(!sel.length) return false;
      arr.length=0;
      if(dir==='back'){ sel.forEach(it=>arr.push(it)); rest.forEach(it=>arr.push(it)); }
      else { rest.forEach(it=>arr.push(it)); sel.forEach(it=>arr.push(it)); }
      return true;
    }
    let changed=false;
    if(dir==='up'){
      for(let i=arr.length-2;i>=0;i--){
        if(arr[i]&&ids.has(arr[i].id)&&arr[i+1]&&!ids.has(arr[i+1].id)){
          const t=arr[i]; arr[i]=arr[i+1]; arr[i+1]=t; changed=true;
        }
      }
    } else if(dir==='down'){
      for(let i=1;i<arr.length;i++){
        if(arr[i]&&ids.has(arr[i].id)&&arr[i-1]&&!ids.has(arr[i-1].id)){
          const t=arr[i]; arr[i]=arr[i-1]; arr[i-1]=t; changed=true;
        }
      }
    }
    return changed;
  }

  function _layerInkHostDom(hostEl, dir){
    const cv=document.getElementById('canvas');
    if(!cv||!hostEl) return false;
    const els=Array.from(cv.querySelectorAll(':scope > .el'));
    const i=els.indexOf(hostEl);
    if(i<0) return false;
    const nonDecors=els.filter(e=>!e.classList.contains('decor-el'));
    const firstNonDecor=nonDecors[0]||els[0];
    if(dir==='front') cv.appendChild(hostEl);
    else if(dir==='back'){
      if(firstNonDecor&&firstNonDecor!==hostEl) cv.insertBefore(hostEl, firstNonDecor);
      else return false;
    } else if(dir==='up'&&i<els.length-1) cv.insertBefore(els[i+1], hostEl);
    else if(dir==='down'&&i>0){
      const prev=els[i-1];
      if(prev.classList.contains('decor-el')) return false;
      cv.insertBefore(hostEl, prev);
    } else return false;
    return true;
  }

  function _domHostsForInkIds(ids){
    const cv=document.getElementById('canvas');
    if(!cv||typeof slides==='undefined'||!slides[cur]) return [];
    const set=ids instanceof Set?ids:new Set(ids||[]);
    const out=[];
    const seen=new Set();
    (slides[cur].els||[]).forEach(d=>{
      if(!d||d.type!=='inkhost') return;
      const hid=new Set(d.inkIds||[]);
      if(d.groupId){
        (_inkArr()||[]).forEach(s=>{ if(s&&s.groupId===d.groupId) hid.add(s.id); });
        (_fillsArr()||[]).forEach(f=>{ if(f&&f.groupId===d.groupId) hid.add(f.id); });
      }
      let hit=false;
      set.forEach(id=>{ if(hid.has(id)) hit=true; });
      if(!hit) return;
      const el=cv.querySelector('.el[data-id="'+d.id+'"]');
      if(el&&!seen.has(el)){ seen.add(el); out.push(el); }
    });
    return out;
  }

  function layerSelectedInk(dir){
    if(!_selInkIds.size) return false;
    if(typeof pushUndo==='function') pushUndo();
    _ensureInkZOrders();

    // 1) Reorder shared z-stack so a brush can sit above a fill (and vice versa)
    const stack=_inkStackSorted();
    const reordered=_reorderInkStack(stack, _selInkIds, dir);
    if(reordered) stack.forEach((x,i)=>{ if(x&&x.item) x.item.z=i; });

    // 2) Move inkhost DOM among objects (one step)
    const hosts=_domHostsForInkIds(_selInkIds);
    let moved=false;
    hosts.forEach(el=>{ if(_layerInkHostDom(el, dir)) moved=true; });

    // 3) Align host stacking with z (fixes fill-host covering brush-host)
    const synced=_syncInkHostDomByZ();

    if(!reordered&&!moved&&!synced) return false;

    if(moved||synced){
      try{ if(typeof save==='function') save(); }catch(e){}
    }
    _invalidateInkCache();
    redrawInk();
    // After paint, hosts may have been recreated — re-sync once
    if(_syncInkHostDomByZ()){
      try{ if(typeof save==='function') save(); }catch(e){}
    }
    if(typeof drawThumbs==='function') drawThumbs();
    if(typeof saveState==='function') saveState();
    return true;
  }

  function _dupSelectedInk(){
    if(!_selInkIds.size) return false;
    if(!copySelectedInk({silent:true})) return false;
    return pasteInkFromClipboard();
  }

  function _onInkContextMenu(e){
    if(e.target&&e.target.closest&&e.target.closest('button,input,textarea,select,a,.rb,.rtab,#el-ctx-menu')) return;
    if(e.target&&e.target.closest&&e.target.closest('[data-cam-move],[data-cam-corner],[data-cam-rot]')) return;
    const pt=_canvasPoint(e);
    if(!pt) return;
    const hit=_pickInkAt(pt.x, pt.y, e);
    if(!hit) return;
    if(!_selInkIds.has(hit.id)){
      _setInkSelection([hit.id], {expandGroup:true, silent:true});
    }
    e.preventDefault();
    e.stopPropagation();
    _openInkCtxMenu(e.clientX, e.clientY);
  }

  function _inkCtxGroupState(){
    const items=_selectedStrokes().concat(_selectedFills());
    if(items.length<2){
      return { showGroup:false, showUngroup:items.length===1&&!!items[0].groupId };
    }
    const gids=new Set();
    items.forEach(it=>{ if(it&&it.groupId) gids.add(it.groupId); });
    if(gids.size===1){
      const gid=gids.values().next().value;
      const all=_inkItemsForGroupId(gid).items;
      if(all.length>=2&&all.length===items.length&&items.every(it=>it.groupId===gid)){
        return { showGroup:false, showUngroup:true };
      }
    }
    return { showGroup:true, showUngroup:false };
  }

  function _openInkCtxMenu(x, y){
    const show=typeof window._showElCtxMenu==='function'?window._showElCtxMenu:null;
    const I=window._EL_CTX_ICONS||{};
    if(!show) return;
    const tr=typeof t==='function'?t:function(k){ return k; };
    const canPaste=hasInkClipboard();
    const st=_inkCtxGroupState();
    const items=[];
    if(st.showUngroup){
      items.push({ icon:I.ungroup||'', label:tr('drawUngroupInk'), action:function(){ ungroupSelectedInk(); } });
    } else if(st.showGroup){
      items.push({ icon:I.group||'', label:tr('drawGroupInk'), action:function(){ groupSelectedInk(); } });
    }
    items.push(
      { icon:I.dup||'', label:tr('btnDuplicate'), action:function(){ _dupSelectedInk(); } },
      { icon:I.copy||'', label:tr('ctxCopySlide'), action:function(){ copySelectedInk(); } },
      { icon:I.paste||'', label:tr('ctxPasteSlide'), disabled:!canPaste, action:function(){ pasteInkFromClipboard(); } },
      { icon:I.layerUp||'', label:tr('ctxLayerUp'), action:function(){ layerSelectedInk('up'); } },
      { icon:I.layerDown||'', label:tr('ctxLayerDown'), action:function(){ layerSelectedInk('down'); } },
      { icon:I.del||'', label:tr('btnDelete'), warn:true, action:function(){ deleteSelectedInk(); } }
    );
    show(x, y, items);
  }

  window.setDrawTool=setDrawTool;
  window.setDrawColor=setDrawColor;
  window.setDrawSmooth=setDrawSmooth;
  window.setDrawOpacity=setDrawOpacity;
  window.setDrawNeonBright=setDrawNeonBright;
  window.setSelectedInkOpacity=setSelectedInkOpacity;
  window.setSelectedNeonBright=setSelectedNeonBright;
  window.nudgeDrawSize=nudgeDrawSize;
  window.remapInkForTheme=remapInkForTheme;
  window.refreshDrawColorUI=_refreshDrawColorUI;
  window.clearSlideInk=clearSlideInk;
  window.exitDrawMode=exitDrawMode;
  window.openDrawingProps=openDrawingProps;
  window.closeDrawingProps=closeDrawingProps;
  window._syncDrawSidePanel=_syncDrawSidePanel;
  window.redrawInk=redrawInk;
  window.renderInkInto=renderInkInto;
  window.drawThumbInk=drawThumbInk;
  window.buildInkSvgMarkup=buildInkSvgMarkup;
  window.isDrawModeActive=function(){ return _isDrawTool(); };
  window.getDrawTool=function(){ return _tool; };
  window.deleteSelectedInk=deleteSelectedInk;
  window.clearInkClipboard=clearInkClipboard;
  window.copySelectedInk=copySelectedInk;
  window.pasteInkFromClipboard=pasteInkFromClipboard;
  window.hasInkClipboard=hasInkClipboard;
  window.hasSelectedInk=function(){ return _selInkIds.size>0; };
  window.inkHostIsSelected=function(d){
    if(!d||d.type!=='inkhost'||!_selInkIds.size) return false;
    const ids=d.inkIds;
    if(!ids||!ids.length) return false;
    for(let i=0;i<ids.length;i++){ if(_selInkIds.has(ids[i])) return true; }
    return false;
  };
  window.alignSelectedInk=alignSelectedInk;
  window.distributeSelectedInk=distributeSelectedInk;
  window.alignSelectedInkToRefs=alignSelectedInkToRefs;
  window.layerSelectedInk=layerSelectedInk;
  window.groupSelectedInk=groupSelectedInk;
  window.ungroupSelectedInk=ungroupSelectedInk;
  window.getSelectedInkItems=getSelectedInkItems;
  window.groupInkWithId=groupInkWithId;
  window.ungroupInkByGroupIds=ungroupInkByGroupIds;
  window.getInkItemsByIds=getInkItemsByIds;
  window.inkBBoxForIds=inkBBoxForIds;
  window.ensureInkHostForIds=ensureInkHostForIds;
  window.ensureInkHostForSelection=ensureInkHostForSelection;
  window._ensureInkHostPickedForAnim=_ensureInkHostPickedForAnim;
  window.syncInkHostBBox=syncInkHostBBox;
  window.syncAllInkHostsOnSlide=syncAllInkHostsOnSlide;
  window.splitInkForHosts=splitInkForHosts;
  window.selectInkIds=function(ids, opts){
    opts=opts||{};
    _setInkSelection(ids||[], {
      expandGroup:opts.expandGroup===true,
      keepObjectSel:opts.keepObjectSel!==false,
      silent:!!opts.silent
    });
  };
  // ── Live anim: inkDraw (handwriting reveal) ─────────────────────
  function _inkDrawShuffle(arr){
    const a=arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      const t=a[i]; a[i]=a[j]; a[j]=t;
    }
    return a;
  }

  function _inkDrawCollectIds(d){
    const ids=new Set();
    if(!d) return ids;
    (d.inkIds||[]).forEach(id=>{ if(id) ids.add(id); });
    if(d.groupId&&typeof slides!=='undefined'&&slides[cur]){
      (slides[cur].ink||[]).forEach(s=>{ if(s&&s.groupId===d.groupId&&s.id) ids.add(s.id); });
      (slides[cur].inkFills||[]).forEach(f=>{ if(f&&f.groupId===d.groupId&&f.id) ids.add(f.id); });
    }
    return ids;
  }

  function _inkDrawResolveNodes(el, d){
    const strokes=[], fills=[];
    const seen=new Set();
    function addStroke(n){
      if(!n||seen.has(n)) return;
      seen.add(n);
      strokes.push(n);
    }
    function addFill(n){
      if(!n||seen.has(n)) return;
      seen.add(n);
      fills.push(n);
    }
    const hostInner=el&&el.querySelector&&el.querySelector('.ink-host-inner');
    const scopes=[];
    if(hostInner) scopes.push(hostInner);
    if(el) scopes.push(el);
    const layer=document.getElementById('ink-layer');
    if(layer) scopes.push(layer);
    const ids=_inkDrawCollectIds(d);

    scopes.forEach(scope=>{
      if(!scope||!scope.querySelectorAll) return;
      scope.querySelectorAll('[data-ink-kind="stroke"]').forEach(n=>{
        if(ids.size&&n.getAttribute('data-ink-id')&&!ids.has(n.getAttribute('data-ink-id'))) return;
        // Prefer host-local nodes when hostInner exists
        if(hostInner&&scope!==hostInner&&scope!==el) return;
        addStroke(n);
      });
      scope.querySelectorAll('[data-ink-kind="fill"], [data-ink-fill-id]').forEach(n=>{
        const fid=n.getAttribute('data-ink-id')||n.getAttribute('data-ink-fill-id');
        if(ids.size&&fid&&!ids.has(fid)) return;
        if(hostInner&&scope!==hostInner&&scope!==el) return;
        addFill(n);
      });
    });

    // Editor fallback: match by ids in global layer even without kind attrs
    if(!strokes.length&&!fills.length&&ids.size&&layer){
      ids.forEach(id=>{
        layer.querySelectorAll('[data-ink-id="'+id+'"]').forEach(n=>{
          if(n.getAttribute('data-ink-kind')==='fill'||n.hasAttribute('data-ink-fill-id')) addFill(n);
          else addStroke(n);
        });
        layer.querySelectorAll('[data-ink-fill-id="'+id+'"]').forEach(addFill);
      });
    }
    return {strokes, fills};
  }

  function _inkDrawIsStrokePath(node){
    return node&&node.tagName&&node.tagName.toLowerCase()==='path'
      && (node.getAttribute('fill')==='none'||!node.getAttribute('fill')||node.getAttribute('fill')==='transparent')
      && node.getAttribute('stroke');
  }

  function _inkDrawSetDash(el, dash, offset){
    if(!el) return;
    // Attribute-only: dual style+attr updates force extra SVG layouts (jank)
    try{
      el.setAttribute('stroke-dasharray', String(dash));
      el.setAttribute('stroke-dashoffset', String(offset));
    }catch(e){}
  }

  function _inkDrawClearDash(el){
    if(!el) return;
    try{
      el.removeAttribute('stroke-dasharray');
      el.removeAttribute('stroke-dashoffset');
      el.removeAttribute('pathLength');
    }catch(e){}
    el.style.strokeDasharray='';
    el.style.strokeDashoffset='';
  }

  function _inkDrawClearRevealMask(node){
    if(!node) return;
    const mid=node.dataset.inkDrawMaskId;
    try{ node.removeAttribute('mask'); }catch(e){}
    delete node.dataset.inkDrawMaskId;
    if(mid){
      const el=document.getElementById(mid);
      if(el) try{ el.remove(); }catch(e){}
    }
  }

  function _inkDrawIsNeonRasterG(node){
    return !!(node&&node.tagName&&node.tagName.toLowerCase()==='g'
      &&node.querySelector&&node.querySelector('[data-ink-neon="raster"]'));
  }

  function _inkDrawFindStroke(node){
    const id=node&&node.getAttribute&&node.getAttribute('data-ink-id');
    if(!id||typeof slides==='undefined') return null;
    const idx=typeof cur!=='undefined'?cur:0;
    const slide=slides[idx];
    if(slide){
      const hit=(slide.ink||[]).find(s=>s&&s.id===id);
      if(hit) return hit;
    }
    for(let i=0;i<slides.length;i++){
      const hit=(slides[i].ink||[]).find(s=>s&&s.id===id);
      if(hit) return hit;
    }
    return null;
  }

  function _inkDrawClearNeonAnimImg(node){
    if(!node) return;
    if(node.querySelectorAll){
      node.querySelectorAll('[data-ink-draw-temp="neon"]').forEach(n=>{ try{ n.remove(); }catch(e){} });
    }
    const final=node.querySelector&&node.querySelector('[data-ink-neon="raster"]');
    if(final) final.style.opacity='';
  }

  /** Same stamp order/progress as brush reveal — matches live drawing. */
  function _inkDrawNeonStampsProgress(stamps, p){
    p=Math.max(0, Math.min(1, +p||0));
    const quads=[], circles=[];
    for(let i=0;i<(stamps||[]).length;i++){
      const s=stamps[i];
      if(s.kind==='circle') circles.push(s);
      else quads.push(s);
    }
    const qn=quads.length, cn=circles.length;
    if(!qn){
      if(p<=0) return [];
      return p>=1?stamps.slice():circles.slice(0, 1);
    }
    const seg=p*qn;
    const full=seg|0;
    const out=quads.slice(0, full);
    if(full<qn&&seg-full>0) out.push(quads[full]);
    const cLast=p<=0?-1:Math.min(cn-1, full);
    for(let i=0;i<=cLast;i++) out.push(circles[i]);
    return out;
  }

  /** Progressive neon — partial raster via same stamp paint as live canvas. */
  function _inkDrawTweenNeon(node, duration, ctl){
    _inkDrawClearRevealMask(node);
    _inkDrawClearNeonAnimImg(node);
    const stroke=_inkDrawFindStroke(node);
    const finalImg=node.querySelector('[data-ink-neon="raster"]');
    if(!stroke||stroke.tool!=='neon'||!finalImg){
      node.style.opacity='0';
      return _inkDrawTween(duration, ctl, p=>{ node.style.opacity=String(p); });
    }

    const allStamps=_brushStamps(stroke, 1, 1);
    if(!allStamps.length) return Promise.resolve();

    const NS='http://www.w3.org/2000/svg';
    let animImg=node.querySelector('[data-ink-draw-temp="neon"]');
    if(!animImg){
      animImg=document.createElementNS(NS,'image');
      animImg.setAttribute('data-ink-draw-temp', 'neon');
      animImg.setAttribute('pointer-events', 'none');
      node.appendChild(animImg);
    }
    finalImg.style.opacity='0';
    node.style.opacity='';

    const quads=allStamps.filter(s=>s.kind!=='circle');
    const qn=quads.length||1;
    const partialCache=new Map();
    function rasterAt(p){
      const step=p>=1?'full':String((p*qn)|0);
      if(partialCache.has(step)) return partialCache.get(step);
      const subset=_inkDrawNeonStampsProgress(allStamps, p);
      const rast=subset.length?_neonRasterForStamps(stroke, subset, 1, 1, step):null;
      partialCache.set(step, rast);
      return rast;
    }

    let lastHref='';
    let prevStep=-1;
    return _inkDrawTween(duration, ctl, p=>{
      const step=p>=1?qn:((p*qn)|0);
      if(p>0&&p<1&&step===prevStep) return;
      prevStep=step;
      const rast=rasterAt(p);
      if(!rast||!rast.href){
        animImg.style.opacity='0';
        return;
      }
      if(rast.href!==lastHref){
        animImg.setAttribute('x', String(_f(rast.x)));
        animImg.setAttribute('y', String(_f(rast.y)));
        animImg.setAttribute('width', String(_f(rast.w)));
        animImg.setAttribute('height', String(_f(rast.h)));
        animImg.setAttribute('href', rast.href);
        animImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', rast.href);
        lastHref=rast.href;
      }
      animImg.style.opacity='1';
    }).finally(()=>{ _inkDrawClearNeonAnimImg(node); });
  }

  /** Split brush <g> into quads (along path) + circles (caps). */
  function _inkDrawBrushParts(node){
    const collect=(root)=>{
      const quads=[], circles=[], other=[];
      const kids=root&&root.children ? Array.prototype.slice.call(root.children) : [];
      for(let i=0;i<kids.length;i++){
        const ch=kids[i];
        if(ch.getAttribute&&ch.getAttribute('data-ink-draw-temp')==='1'){
          try{ ch.remove(); }catch(e){}
          continue;
        }
        const t=(ch.tagName||'').toLowerCase();
        if(t==='defs'||t==='filter') continue;
        if(t==='path') quads.push(ch);
        else if(t==='circle') circles.push(ch);
        else other.push(ch);
      }
      return {quads, circles, other};
    };
    const neonCore=node&&node.querySelector&&node.querySelector('[data-ink-neon="core"]');
    const neonRaster=node&&node.querySelector&&node.querySelector('[data-ink-neon="raster"]');
    if(neonRaster){
      return {quads:[], circles:[], other:[neonRaster]};
    }
    if(neonCore){
      const core=collect(neonCore);
      const glow=node.querySelector('[data-ink-neon="glow"]');
      const mid=node.querySelector('[data-ink-neon="mid"]');
      const body=node.querySelector('[data-ink-neon="body"]');
      return {
        quads:core.quads,
        circles:core.circles,
        other:core.other,
        neonExtra:[glow, mid, body].filter(Boolean).map(collect)
      };
    }
    return collect(node);
  }

  function _inkDrawSetBrushProgress(parts, p){
    p=Math.max(0, Math.min(1, +p||0));
    const apply=(bucket)=>{
      const qn=bucket.quads.length;
      const cn=bucket.circles.length;
      if(!qn&&!cn){
        const on=p>=1?'1':'0';
        for(let i=0;i<bucket.other.length;i++) bucket.other[i].style.opacity=on;
        return;
      }
      const nSeg=qn>0?qn:Math.max(cn,1);
      const seg=p*nSeg;
      const full=seg|0;
      const frac=seg-full;
      for(let i=0;i<qn;i++){
        if(i<full) bucket.quads[i].style.opacity='1';
        else if(i===full) bucket.quads[i].style.opacity=String(frac<=0?0:frac);
        else bucket.quads[i].style.opacity='0';
      }
      for(let i=0;i<cn;i++){
        bucket.circles[i].style.opacity=(p>=1||(p>0&&seg>=i))?'1':'0';
      }
      for(let i=0;i<bucket.other.length;i++) bucket.other[i].style.opacity=p>=1?'1':'0';
    };
    apply(parts);
    if(parts.neonExtra){
      for(let i=0;i<parts.neonExtra.length;i++) apply(parts.neonExtra[i]);
    }
  }

  /** Smooth rAF tween — linear (ease-in-out felt like stop/go). */
  function _inkDrawTween(duration, ctl, onProgress){
    return new Promise(resolve=>{
      if(ctl&&ctl.aborted){ resolve(); return; }
      ctl=ctl||{aborted:false, rafs:[]};
      if(!ctl.rafs) ctl.rafs=[];
      const dur=Math.max(120, duration||1400);
      const t0=performance.now();
      let rafId=0;
      const step=now=>{
        rafId=0;
        if(ctl.aborted){ resolve(); return; }
        const p=Math.min(1, (now-t0)/dur);
        try{ onProgress(p); }catch(e){}
        if(p<1){
          rafId=requestAnimationFrame(step);
          ctl.rafs.push(rafId);
        } else {
          try{ onProgress(1); }catch(e2){}
          resolve();
        }
      };
      try{ onProgress(0); }catch(e){}
      rafId=requestAnimationFrame(step);
      ctl.rafs.push(rafId);
    });
  }

  function _inkDrawTweenDash(el, duration, ctl){
    if(!el) return Promise.resolve();
    try{ el.setAttribute('pathLength', '1'); }catch(e){}
    _inkDrawSetDash(el, 1, 1);
    return _inkDrawTween(duration, ctl, p=>{
      _inkDrawSetDash(el, 1, 1-p);
    });
  }

  function _inkDrawTweenBrush(node, duration, ctl){
    _inkDrawClearRevealMask(node);
    const parts=_inkDrawBrushParts(node);
    node.style.opacity='';
    _inkDrawSetBrushProgress(parts, 0);
    const qn=parts.quads.length, cn=parts.circles.length;
    if(!qn&&!cn&&!parts.other.length) return Promise.resolve();

    // Incremental reveals — only touch stamps that newly appear (avoids N style writes/frame)
    let prevFull=-1;
    let prevCircle=-1;
    let lead=-1;
    return _inkDrawTween(duration, ctl, p=>{
      if(p>=1){
        if(lead>=0&&lead<qn) parts.quads[lead].style.opacity='1';
        for(let i=Math.max(0,prevFull);i<qn;i++) parts.quads[i].style.opacity='1';
        for(let i=Math.max(0,prevCircle+1);i<cn;i++) parts.circles[i].style.opacity='1';
        for(let i=0;i<parts.other.length;i++) parts.other[i].style.opacity='1';
        prevFull=qn; prevCircle=cn-1; lead=-1;
        return;
      }
      if(!qn){
        // Circles-only stroke (dot): fade as a group
        const op=String(p);
        for(let i=0;i<cn;i++) parts.circles[i].style.opacity=op;
        return;
      }
      const seg=p*qn;
      const full=seg|0;
      const frac=seg-full;
      if(full>prevFull){
        for(let i=Math.max(0,prevFull);i<full;i++){
          if(parts.quads[i]) parts.quads[i].style.opacity='1';
        }
        prevFull=full;
      }
      if(full<qn){
        if(lead!==full&&lead>=0&&lead<qn) parts.quads[lead].style.opacity='1';
        lead=full;
        parts.quads[full].style.opacity=String(frac<=0?0:frac);
      }
      const cLast=p<=0?-1:Math.min(cn-1, full);
      while(prevCircle<cLast){
        prevCircle++;
        if(parts.circles[prevCircle]) parts.circles[prevCircle].style.opacity='1';
      }
    });
  }

  function _inkDrawHideNode(node){
    if(!node) return;
    if(_inkDrawIsStrokePath(node)){
      try{ node.setAttribute('pathLength', '1'); }catch(e){}
      _inkDrawSetDash(node, 1, 1);
      node.style.opacity='';
      return;
    }
    if(node.tagName&&node.tagName.toLowerCase()==='g'){
      _inkDrawClearRevealMask(node);
      // Cheap hide — per-stamp opacity is applied when that stroke actually tweens.
      // Touching every quad here with parallel>1 stalls the first run (~0.5s then freeze).
      node.style.opacity='0';
      return;
    }
    if(!node.dataset.inkDrawOp){
      const op=node.getAttribute('data-ink-op')||node.getAttribute('opacity')||'1';
      node.dataset.inkDrawOp=String(op);
    }
    node.style.opacity='0';
  }

  function _inkDrawShowFinal(node){
    if(!node) return;
    if(_inkDrawIsStrokePath(node)){
      _inkDrawClearDash(node);
      delete node.dataset.inkDrawLen;
      node.style.opacity='';
      return;
    }
    if(node.tagName&&node.tagName.toLowerCase()==='g'){
      _inkDrawClearRevealMask(node);
      _inkDrawClearNeonAnimImg(node);
      if(_inkDrawIsNeonRasterG(node)){
        node.style.opacity='';
        delete node.dataset.inkDrawLen;
        return;
      }
      const parts=_inkDrawBrushParts(node);
      node.style.opacity='';
      _inkDrawSetBrushProgress(parts, 1);
      // Clear inline opacity so later edits use SVG defaults
      const clear=arr=>{ for(let i=0;i<arr.length;i++) arr[i].style.opacity=''; };
      clear(parts.quads); clear(parts.circles); clear(parts.other);
      delete node.dataset.inkDrawLen;
      return;
    }
    const op=node.dataset.inkDrawOp||node.getAttribute('data-ink-op')||'1';
    node.style.opacity=op;
  }

  function _inkDrawResetNodes(strokes, fills){
    (strokes||[]).forEach(n=>{
      if(_inkDrawIsStrokePath(n)){
        _inkDrawClearDash(n);
        delete n.dataset.inkDrawLen;
      } else if(n.tagName&&n.tagName.toLowerCase()==='g'){
        _inkDrawClearRevealMask(n);
        _inkDrawClearNeonAnimImg(n);
        const parts=_inkDrawBrushParts(n);
        const clear=arr=>{ for(let i=0;i<arr.length;i++) arr[i].style.opacity=''; };
        clear(parts.quads); clear(parts.circles); clear(parts.other);
        delete n.dataset.inkDrawLen;
      }
      n.style.opacity='';
    });
    (fills||[]).forEach(n=>{
      n.style.opacity='';
      delete n.dataset.inkDrawOp;
    });
  }

  function _inkDrawAnimateStroke(node, duration, ctl){
    return (async ()=>{
      if(!node||(ctl&&ctl.aborted)) return;

      // Brush groups: reveal stamps in path order; neon raster uses centerline mask.
      if(node.tagName&&node.tagName.toLowerCase()==='g'){
        if(_inkDrawIsNeonRasterG(node)){
          await _inkDrawTweenNeon(node, duration, ctl);
        } else {
          await _inkDrawTweenBrush(node, duration, ctl);
        }
        if(!ctl.aborted) _inkDrawShowFinal(node);
        return;
      }

      if(_inkDrawIsStrokePath(node)){
        await _inkDrawTweenDash(node, duration, ctl);
        if(!ctl.aborted) _inkDrawShowFinal(node);
        return;
      }

      await _inkDrawTween(Math.min(280, duration), ctl, p=>{
        node.style.opacity=String(p);
      });
    })();
  }

  function _inkDrawAbort(el){
    if(!el||!el._inkDrawCtl) return;
    el._inkDrawCtl.aborted=true;
    (el._inkDrawCtl.timers||[]).forEach(t=>clearTimeout(t));
    (el._inkDrawCtl.anims||[]).forEach(a=>{ try{ a.cancel(); }catch(e){} });
    (el._inkDrawCtl.rafs||[]).forEach(id=>{ try{ cancelAnimationFrame(id); }catch(e){} });
    el._inkDrawCtl=null;
  }

  function _prepareInkDrawHost(el, d){
    if(!el) return;
    const nodes=_inkDrawResolveNodes(el, d||el._exportD||null);
    nodes.strokes.forEach(_inkDrawHideNode);
    nodes.fills.forEach(_inkDrawHideNode);
  }

  function _resetInkDrawAnim(el){
    if(!el) return;
    _inkDrawAbort(el);
    const d=el._exportD||null;
    let data=d;
    if(!data&&typeof slides!=='undefined'&&slides[cur]&&el.dataset&&el.dataset.id){
      data=(slides[cur].els||[]).find(x=>x&&x.id===el.dataset.id)||null;
    }
    const nodes=_inkDrawResolveNodes(el, data);
    _inkDrawResetNodes(nodes.strokes, nodes.fills);
  }

  function _inkDrawAnimateFill(node, duration, ctl){
    return new Promise(resolve=>{
      if(!node||(ctl&&ctl.aborted)){ resolve(); return; }
      const op=parseFloat(node.dataset.inkDrawOp||node.getAttribute('data-ink-op')||node.getAttribute('opacity')||'1')||1;
      node.style.opacity='0';
      const anim=node.animate([{opacity:0},{opacity:op}], {
        duration:Math.max(120, duration), easing:'ease-out', fill:'forwards'
      });
      if(ctl) ctl.anims.push(anim);
      anim.onfinish=()=>{ node.style.opacity=String(op); resolve(); };
      anim.oncancel=()=>resolve();
    });
  }

  function _inkDrawParallelFor(a, total){
    if(typeof window._inkDrawParallelCount==='function') return window._inkDrawParallelCount(a, total);
    const n=Math.max(1, +total||1);
    if(!a) return 1;
    const v=a.inkParallel;
    if(v===0||v==='all') return n;
    if(v==null) return 1;
    return Math.max(1, Math.min(n, Math.round(+v||1)));
  }

  function _inkDrawStrokeWeightFromStroke(stroke){
    if(!stroke) return 40;
    if(stroke.points&&stroke.points.length){
      if(_isBrushFamily(stroke.tool)){
        const stamps=_brushStamps(stroke, 1, 1);
        const qn=stamps.filter(s=>s.kind!=='circle').length;
        return Math.max(1, qn||stamps.length||1);
      }
      let len=0;
      for(let i=1;i<stroke.points.length;i++){
        const a=stroke.points[i-1], b=stroke.points[i];
        len+=Math.hypot(b.x-a.x, b.y-a.y);
      }
      return Math.max(1, len/8);
    }
    return 40;
  }

  function _inkDrawStrokeWeightFromNode(node){
    if(!node) return 40;
    const stroke=_inkDrawFindStroke(node);
    if(stroke) return _inkDrawStrokeWeightFromStroke(stroke);
    if(_inkDrawIsStrokePath(node)){
      try{ return Math.max(1, node.getTotalLength()); }catch(e){}
      return 40;
    }
    if(node.tagName&&node.tagName.toLowerCase()==='g'){
      const parts=_inkDrawBrushParts(node);
      return Math.max(1, parts.quads.length||parts.circles.length||1);
    }
    return 40;
  }

  function _inkDrawStrokeDuration(node, baseDuration){
    const base=Math.max(200, +baseDuration||1400);
    if(_inkDrawIsStrokePath(node)){
      let len=320;
      try{ len=Math.max(1, node.getTotalLength()); }catch(e){}
      const scale=Math.max(0.3, Math.min(3, len/320));
      return Math.round(base*scale);
    }
    const w=_inkDrawStrokeWeightFromNode(node);
    const scale=Math.max(0.3, Math.min(3, w/40));
    return Math.round(base*scale);
  }

  function _inkDrawDurationFromWeight(weight, baseDuration){
    const base=Math.max(200, +baseDuration||1400);
    const w=Math.max(1, +weight||40);
    const scale=Math.max(0.3, Math.min(3, w/40));
    return Math.round(base*scale);
  }

  function _inkDrawPoolMakespan(items, parallel, baseDuration, weightFor){
    parallel=Math.max(1, parallel|0);
    if(!items||!items.length) return Math.max(200, +baseDuration||1400);
    const slots=new Array(parallel).fill(0);
    items.forEach(item=>{
      const w=weightFor?weightFor(item):40;
      const d=_inkDrawDurationFromWeight(w, baseDuration);
      let minI=0;
      for(let j=1;j<parallel;j++) if(slots[j]<slots[minI]) minI=j;
      slots[minI]+=d;
    });
    return Math.max(...slots);
  }

  /** Up to `parallel` strokes at once; when one finishes, the next starts immediately. */
  async function _inkDrawRunPool(items, parallel, ctl, runOne){
    parallel=Math.max(1, parallel|0);
    if(!items||!items.length) return;
    let next=0, active=0;
    await new Promise(resolve=>{
      const tryFinish=()=>{
        if(active===0&&(next>=items.length||(ctl&&ctl.aborted))) resolve();
      };
      const spawn=()=>{
        if(ctl&&ctl.aborted) return tryFinish();
        while(active<parallel&&next<items.length){
          if(ctl&&ctl.aborted) return tryFinish();
          const item=items[next++];
          active++;
          Promise.resolve().then(()=>runOne(item)).catch(()=>{}).finally(()=>{
            active--;
            tryFinish();
            spawn();
          });
        }
        tryFinish();
      };
      spawn();
    });
  }

  function _fireInkDrawAnim(el, a, opts){
    opts=opts||{};
    if(!el||!a) return;
    _inkDrawAbort(el);
    const d=opts.d||el._exportD||null;
    const delay=opts.delay!=null?+opts.delay:0;
    const perStroke=Math.max(200, +(a.duration||1400)||1400);
    const fillDur=Math.min(700, Math.max(220, perStroke*0.35));
    const cnt=a.swingCount!=null?+a.swingCount:1;
    const infinite=opts.preview?false:(!isFinite(cnt)||cnt>=10);
    const loops=opts.preview?1:(infinite?Infinity:Math.max(1, cnt|0));
    const ctl={aborted:false, timers:[], anims:[], rafs:[]};
    el._inkDrawCtl=ctl;

    const start=()=>{
      if(ctl.aborted) return;
      const nodes=_inkDrawResolveNodes(el, d);
      if(!nodes.strokes.length&&!nodes.fills.length){
        ctl._inkWait=(ctl._inkWait||0)+1;
        if(ctl._inkWait<=16){
          _prepareInkDrawHost(el, d);
          const t=setTimeout(start, 32);
          ctl.timers.push(t);
          return;
        }
        return;
      }

      const runLoop=async ()=>{
        let n=0;
        while(!ctl.aborted&&(infinite||n<loops)){
          nodes.strokes.forEach(_inkDrawHideNode);
          nodes.fills.forEach(_inkDrawHideNode);
          await new Promise(r=>{
            const t=requestAnimationFrame(()=>requestAnimationFrame(r));
            ctl.rafs.push(t);
          });
          if(ctl.aborted) return;
          const strokeOrder=_inkDrawShuffle(nodes.strokes);
          const strokeParallel=_inkDrawParallelFor(a, strokeOrder.length);
          await _inkDrawRunPool(strokeOrder, strokeParallel, ctl, node=>
            _inkDrawAnimateStroke(node, _inkDrawStrokeDuration(node, perStroke), ctl)
          );
          if(ctl.aborted) return;
          const fillOrder=_inkDrawShuffle(nodes.fills);
          const fillParallel=_inkDrawParallelFor(a, fillOrder.length);
          await _inkDrawRunPool(fillOrder, fillParallel, ctl, node=>
            _inkDrawAnimateFill(node, fillDur, ctl)
          );
          n++;
          if(!infinite&&n>=loops) break;
          if(infinite){
            await new Promise(r=>{
              const t=setTimeout(r, 380);
              ctl.timers.push(t);
            });
          }
        }
        if(!ctl.aborted&&!infinite){
          nodes.strokes.forEach(_inkDrawShowFinal);
          nodes.fills.forEach(_inkDrawShowFinal);
        }
      };
      runLoop();
    };

    _prepareInkDrawHost(el, d);
    if(delay>0){
      const t=setTimeout(start, delay);
      ctl.timers.push(t);
    } else {
      start();
    }
  }

  window._fireInkDrawAnim=_fireInkDrawAnim;
  window._prepareInkDrawHost=_prepareInkDrawHost;
  window._resetInkDrawAnim=_resetInkDrawAnim;
  window._inkDrawStrokeWeightFromStroke=_inkDrawStrokeWeightFromStroke;
  window._inkDrawPoolMakespan=function(strokes, parallel, baseDuration){
    const list=strokes||[];
    return _inkDrawPoolMakespan(list, parallel, baseDuration, s=>_inkDrawStrokeWeightFromStroke(s));
  };

  window.nudgeSelectedInk=nudgeSelectedInk;
  window.setFillPattern=setFillPattern;
  window.setFillOpacity=setFillOpacity;
  window.setFillGap=setFillGap;
  window.selectInkInRect=selectInkInRect;
  window.selectAllInk=selectAllInk;
  window.clearInkSelection=clearInkSelectionPublic;
  window.pickAndSelectInkAt=pickAndSelectInkAt;
  window.moveSelectedInkBy=function(dx,dy){
    if(!_selInkIds.size) return false;
    _moveSelectedInkBy(dx, dy);
    return true;
  };
  window.snapshotSelectedInk=snapshotSelectedInk;
  window.snapshotInkByGroupId=snapshotInkByGroupId;
  window.applyInkAffineFromSnapshot=applyInkAffineFromSnapshot;
  window._renderInkTransformHandles=_renderInkTransformHandles;
  window._clearInkRotChrome=_clearInkRotChrome;
  window.activateDrawingTool=function(tool){
    _activateDrawingTab();
    setDrawTool(tool||'brush');
  };

  function _drawingSectionKey() {
    const selList = _selectedStrokes();
    const selFills = _selectedFills();
    const showSel = (selList.length > 0 || selFills.length > 0) && _tool === 'cursor';
    if (showSel) return 'selection';
    if (_isPenTool()) return 'pen';
    if (_tool === 'eraser') return 'eraser';
    if (_tool === 'fill') return 'fill';
    return 'hint';
  }

  function _drawingGetState() {
    const selList = _selectedStrokes();
    const selFills = _selectedFills();
    const selStroke = selList[0] || null;
    const selFill = selFills[0] || null;
    const showSel = (selList.length > 0 || selFills.length > 0) && _tool === 'cursor';
    const section = _drawingSectionKey();
    const penSizes = _tool === 'marker' ? MARKER_SIZES : PEN_SIZES;
    const penSizeIdx = _tool === 'marker' ? _markerSizeIdx : _penSizeIdx;
    const selColSrc = selStroke || selFill;
    let selTitle = '';
    if (showSel) {
      const n = selList.length + selFills.length;
      if (n > 1) {
        selTitle = (typeof t === 'function' ? t('drawSelStrokesN') : 'Выделено: {n}').replace('{n}', String(n));
      } else if (selFill && !selStroke) {
        selTitle = typeof t === 'function' ? t('drawSelFill') : 'Выделенная заливка';
      } else {
        selTitle = typeof t === 'function' ? t('drawSelStroke') : 'Выделенный штрих';
      }
    }
    return {
      tool: _tool,
      section,
      hint: typeof t === 'function' ? t('drawHintCursor') : 'Выберите кисть, маркер или ластик. Клик по штриху — выделить. Esc — курсор.',
      pen: {
        smooth: _smooth,
        opacity: Math.round((_tool === 'marker' ? _markerOpacity : _opacity) * 100),
        neonBright: _neonBright,
        sizeIdx: penSizeIdx,
        sizes: penSizes,
        taper: _taper,
        showTaper: section === 'pen' && _isBrushFamily(_tool),
        isNeon: _tool === 'neon',
        isMarker: _tool === 'marker',
        color: _color,
        colorScheme: _colorScheme || null,
      },
      eraser: {
        sizeIdx: _eraserSizeIdx,
        sizes: ERASER_SIZES,
      },
      fill: {
        opacity: _fillOpacity,
        pattern: _fillPattern,
        gap: _fillGap,
        gaps: [0, 10, 20, 30, 50],
        patterns: ['solid', 'fadeIn', 'fadeOut', 'lines', 'hatch', 'dots'],
        color: _color,
        colorScheme: _colorScheme || null,
      },
      selection: showSel ? {
        title: selTitle,
        strokeCount: selList.length,
        fillCount: selFills.length,
        opacity: Math.round((+(selColSrc && selColSrc.opacity) || 1) * 100),
        neonBright: selStroke && selStroke.tool === 'neon' ? _neonBrightPct(selStroke) : null,
        hasNeon: !!(selStroke && selStroke.tool === 'neon'),
        sizeIdx: selStroke ? _nearestSizeIdx(selStroke.tool === 'marker' ? MARKER_SIZES : PEN_SIZES, +selStroke.width || 6) : -1,
        sizes: selStroke ? (selStroke.tool === 'marker' ? MARKER_SIZES : PEN_SIZES) : [],
        fillPattern: selFill ? (selFill.pattern || 'solid') : null,
        showFillPattern: selFills.length > 0,
        showSize: !!selStroke,
        color: (selColSrc && selColSrc.color) || _color,
        colorScheme: (selColSrc && selColSrc.colorScheme) || null,
        canGroup: selList.length >= 2,
        canUngroup: selList.some(function (s) { return s.groupId; }),
      } : null,
    };
  }

  window.__slidesDrawingApi = {
    getState: _drawingGetState,
    setTool: setDrawTool,
    setSmooth: setDrawSmooth,
    setOpacity: function (pct) { setDrawOpacity(+pct); },
    setNeonBright: setDrawNeonBright,
    setPenSizeIdx: function (i) {
      i = i | 0;
      if (_tool === 'marker') {
        _markerSizeIdx = Math.max(0, Math.min(MARKER_SIZES.length - 1, i));
      } else {
        _penSizeIdx = Math.max(0, Math.min(PEN_SIZES.length - 1, i));
      }
      _savePrefs();
      syncDrawPropsUI();
      _updateBrushCursor();
    },
    setEraserSizeIdx: function (i) {
      _eraserSizeIdx = Math.max(0, Math.min(ERASER_SIZES.length - 1, i | 0));
      _savePrefs();
      syncDrawPropsUI();
      _updateBrushCursor();
    },
    setTaper: function (id) {
      _taper = id || 'both';
      _savePrefs();
      syncDrawPropsUI();
    },
    setColor: setDrawColor,
    setFillPattern: setFillPattern,
    setFillOpacity: setFillOpacity,
    setFillGap: setFillGap,
    setSelectedOpacity: setSelectedInkOpacity,
    setSelectedNeonBright: setSelectedNeonBright,
    setSelectedStrokeWidth: function (sz) {
      _applyToSelectedInk(function (s) { s.width = +sz; });
    },
    clearInk: clearSlideInk,
    copySelection: copySelectedInk,
    deleteSelection: deleteSelectedInk,
    groupSelection: groupSelectedInk,
    ungroupSelection: ungroupSelectedInk,
    sync: function () {
      syncDrawPropsUI();
    },
  };
})();

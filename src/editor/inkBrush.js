/** Brush / neon / marker geometry — ported from js/48-drawing.js */
export const PEN_SIZES = [0.5, 1.5, 3, 6, 10, 14, 20, 28, 36];
export const MARKER_SIZES = [6, 10, 14, 20, 28, 36, 48];
export const ERASER_SIZES = [6, 10, 14, 20, 28, 36, 48, 64];

export function isBrushFamily(tool) {
  return tool === 'brush' || tool === 'neon';
}

export function sizesForDrawTool(tool) {
  if (tool === 'eraser') return ERASER_SIZES;
  if (tool === 'marker') return MARKER_SIZES;
  return PEN_SIZES;
}

export function nearestSizeIdx(sizes, width) {
  const list = sizes || [];
  if (!list.length) return 0;
  let best = 0;
  let bestD = Infinity;
  const w = +width || 0;
  for (let i = 0; i < list.length; i++) {
    const d = Math.abs(+list[i] - w);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function normalizeInkPoints(points) {
  return (points || []).map((p) => {
    if (Array.isArray(p)) {
      return { x: +p[0] || 0, y: +p[1] || 0, p: p[2] != null ? +p[2] : 0.5, t: p[3] };
    }
    return {
      x: +p.x || 0,
      y: +p.y || 0,
      p: p.p != null ? +p.p : 0.5,
      t: p.t,
    };
  });
}

function withNormPoints(stroke) {
  if (!stroke) return stroke;
  return { ...stroke, points: normalizeInkPoints(stroke.points) };
}

function _neonBrightPct(stroke){
    const v=stroke&&stroke.neonBright!=null?+stroke.neonBright:75;
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

function _brushHalfWidths(stroke, pts){
    const n=pts.length;
    const base=Math.max(0.15, +stroke.width||6);
    if(stroke.tool==='marker'){
      const hw=base*0.5;
      return Array(n).fill(hw);
    }
    const taper=stroke.taper||'both'; // both | out | in
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

function _svgQuad(l0x,l0y,l1x,l1y,r1x,r1y,r0x,r0y){
    const area=(l1x-l0x)*(r0y-l0y)-(l1y-l0y)*(r0x-l0x);
    if(area<0){
      return 'M'+_f(l0x)+','+_f(l0y)+'L'+_f(r0x)+','+_f(r0y)+'L'+_f(r1x)+','+_f(r1y)+'L'+_f(l1x)+','+_f(l1y)+'Z';
    }
    return 'M'+_f(l0x)+','+_f(l0y)+'L'+_f(l1x)+','+_f(l1y)+'L'+_f(r1x)+','+_f(r1y)+'L'+_f(r0x)+','+_f(r0y)+'Z';
  }

function _quadStamp(l0x,l0y,l1x,l1y,r1x,r1y,r0x,r0y){
    const area=(l1x-l0x)*(r0y-l0y)-(l1y-l0y)*(r0x-l0x);
    let c;
    if(area<0) c=[[l0x,l0y],[r0x,r0y],[r1x,r1y],[l1x,l1y]];
    else c=[[l0x,l0y],[l1x,l1y],[r1x,r1y],[r0x,r0y]];
    return {kind:'quad', d:_svgQuad(l0x,l0y,l1x,l1y,r1x,r1y,r0x,r0y), c:c};
  }

function _brushStamps(stroke, sx, sy){
    sx=sx||1; sy=sy||1;
    const sc=Math.min(sx,sy);
    const amt=(stroke.smooth!=null?+stroke.smooth:40)/100;
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
    const taper=stroke.taper||'both';
    for(let i=0;i<n;i++){
      let r=half[i]*sc;
      // Soft tip only on the thin end — keep thick end at full stated width
      if(taper==='out'&&i===n-1) r*=0.72;
      else if(taper==='in'&&i===0) r*=0.72;
      stamps.push({kind:'circle', cx:pts[i].x*sx, cy:pts[i].y*sy, r:r});
    }
    return stamps;
  }

function _hardStrokeGeom(stroke, sx, sy){
    sx=sx||1; sy=sy||1;
    const sc=Math.min(sx,sy);
    const amt=(stroke.smooth!=null?+stroke.smooth:40)/100;
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

export function brushStamps(stroke, sx = 1, sy = 1) {
  return _brushStamps(withNormPoints(stroke), sx, sy);
}

export function hardStrokeGeom(stroke, sx = 1, sy = 1) {
  return _hardStrokeGeom(withNormPoints(stroke), sx, sy);
}

export function neonRaster(stroke, sx = 1, sy = 1) {
  const st = withNormPoints(stroke);
  const stamps = _brushStamps(st, sx, sy);
  if (!stamps.length) return null;
  return _neonRasterForStamps(st, stamps, sx, sy, _neonContentKey(st));
}

export function paintNeonStamps(ctx, stamps, color, stroke, op) {
  return _paintNeonStamps(ctx, stamps, color, withNormPoints(stroke) || {}, op);
}

export function fillBrushStamps(ctx, stamps) {
  return _fillBrushStamps(ctx, stamps);
}

export function inkStrokeSvgMarkupRich(stroke) {
  if (!stroke) return '';
  const st = withNormPoints(stroke);
  const id =
    st.id != null
      ? ' data-ink-id="' + String(st.id).replace(/"/g, '') + '" data-ink-kind="stroke"'
      : ' data-ink-kind="stroke"';
  const color = st.color || '#64748b';
  const op = st.opacity != null ? Math.max(0, Math.min(1, +st.opacity)) : 1;

  if (st.tool === 'neon') {
    const rast = neonRaster(st, 1, 1);
    if (!rast) return '';
    return (
      '<g' +
      id +
      '><image data-ink-neon="raster" pointer-events="none" x="' +
      _f(rast.x) +
      '" y="' +
      _f(rast.y) +
      '" width="' +
      _f(rast.w) +
      '" height="' +
      _f(rast.h) +
      '" href="' +
      rast.href +
      '" xlink:href="' +
      rast.href +
      '"/></g>'
    );
  }

  if (st.tool === 'brush' || !st.tool) {
    const stamps = _brushStamps(st, 1, 1);
    if (!stamps.length) return '';
    let inner = '';
    for (let i = 0; i < stamps.length; i++) {
      const s = stamps[i];
      if (s.kind === 'circle') {
        inner +=
          '<circle cx="' +
          _f(s.cx) +
          '" cy="' +
          _f(s.cy) +
          '" r="' +
          _f(Math.max(0.04, s.r)) +
          '" fill="' +
          color +
          '" stroke="none"/>';
      } else if (s.kind === 'quad' && s.d) {
        inner += '<path d="' + s.d + '" fill="' + color + '" stroke="none"/>';
      }
    }
    return '<g' + id + (op < 1 ? ' opacity="' + op + '"' : '') + '>' + inner + '</g>';
  }

  const geom = _hardStrokeGeom(
    st.tool === 'marker' ? Object.assign({}, st, { pressure: false }) : st,
    1,
    1
  );
  if (!geom) return '';
  if (geom.circle) {
    return (
      '<g' +
      id +
      (op < 1 ? ' opacity="' + op + '"' : '') +
      '><circle cx="' +
      _f(geom.circle.cx) +
      '" cy="' +
      _f(geom.circle.cy) +
      '" r="' +
      _f(Math.max(0.04, geom.circle.r)) +
      '" fill="' +
      color +
      '" stroke="none"/></g>'
    );
  }
  if (!geom.d) return '';
  const opAttr =
    st.tool === 'marker' ? ' stroke-opacity="' + op + '"' : op < 1 ? ' opacity="' + op + '"' : '';
  return (
    '<path' +
    id +
    ' d="' +
    geom.d +
    '" fill="none" stroke="' +
    color +
    '" stroke-width="' +
    geom.width +
    '" stroke-linecap="round" stroke-linejoin="round"' +
    opAttr +
    '/>'
  );
}

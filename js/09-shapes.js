// ══════════════ SHAPES ══════════════
function _smSyncGalleryColor(color){
  document.querySelectorAll('#shape-gallery .sg-fill').forEach(el=>{
    if(el.tagName==='circle'&&el.getAttribute('fill')==='none'){
      el.setAttribute('stroke',color);
      // also update sibling line
      const _sib=el.nextSibling;
      if(_sib&&_sib.tagName==='line') _sib.setAttribute('stroke',color);
    } else {
      el.setAttribute('fill',color);
    }
  });
}
function editShapeText(){
  if(!sel||sel.dataset.type!=='shape')return;
  const txt=sel.querySelector('.shape-text');
  if(!txt)return;
  txt.contentEditable='true';txt.style.pointerEvents='auto';txt.focus();
  const range=document.createRange();range.selectNodeContents(txt);range.collapse(false);
  const sel2=window.getSelection();sel2.removeAllRanges();sel2.addRange(range);
}

function openShapeModalReplace(){
  if(!sel||sel.dataset.type!=='shape')return;
  window._shapeReplaceMode=true;
  // Предзаполняем модалку настройками текущей фигуры
  const _d=slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(_d){
    window._shapeReplaceSource={
      fill:_d.fill, stroke:_d.stroke, sw:_d.sw,
      fillOp:_d.fillOp, shadow:_d.shadow, shadowBlur:_d.shadowBlur, shadowSize:_d.shadowSize, shadowColor:_d.shadowColor,
      shapeHtml:_d.shapeHtml, shapeTextCss:_d.shapeTextCss,
      rx:_d.rx, rot:_d.rot, anims:_d.anims,
      x:_d.x, y:_d.y, w:_d.w, h:_d.h,
      elOpacity:_d.elOpacity, shadow2:_d.shadow2,
    };
  }
  openShapeModal();
  // Перезаписываем цвета в модалке — из текущей фигуры
  if(_d){
    const fillEl=document.getElementById('sm-fill');
    const strokeEl=document.getElementById('sm-stroke');
    const swEl=document.getElementById('sm-sw');
    if(fillEl){fillEl.value=_d.fill||fillEl.value;document.getElementById('sm-fill-inner').style.background=_d.fill||'';}
    if(strokeEl){strokeEl.value=_d.stroke||strokeEl.value;document.getElementById('sm-stroke-inner').style.background=_d.stroke||'';}
    if(swEl&&_d.sw!==undefined)swEl.value=_d.sw;
  }
}

function openShapeModal(){
  // Pre-fill colors from current theme
  let fillColor='#3b82f6', strokeColor='#1d4ed8';
  if(appliedThemeIdx>=0&&appliedThemeIdx<THEMES.length){
    const t=THEMES[appliedThemeIdx];
    fillColor=t.shapeFill||fillColor;
    strokeColor=t.shapeStroke||strokeColor;
  }
  const fillEl=document.getElementById('sm-fill');
  const strokeEl=document.getElementById('sm-stroke');
  if(fillEl)fillEl.value=fillColor;
  if(strokeEl)strokeEl.value=strokeColor;
  const fi=document.getElementById('sm-fill-inner');
  const si=document.getElementById('sm-stroke-inner');
  if(fi)fi.style.background=fillColor;
  if(si)si.style.background=strokeColor;
  buildShapeGallery();
  document.getElementById('shape-modal').classList.add('open');
}
// Variable-width stroke for curves (smooth outline from per-node sw)
function _expVarStroke(pts,w,h,closed,defaultSw,strokeColor,shadowAttr){
  var STEPS=48;
  function sample(prev,curr){
    var hwA=(prev.sw!=null?prev.sw:defaultSw)/2,hwB=(curr.sw!=null?curr.sw:defaultSw)/2;
    var p0={x:prev.x*w,y:prev.y*h},p3={x:curr.x*w,y:curr.y*h};
    var p1={x:(prev.cp2x!=null?prev.cp2x:prev.x)*w,y:(prev.cp2y!=null?prev.cp2y:prev.y)*h};
    var p2={x:(curr.cp1x!=null?curr.cp1x:curr.x)*w,y:(curr.cp1y!=null?curr.cp1y:curr.y)*h};
    var out=[];
    for(var k=0;k<=STEPS;k++){
      var t=k/STEPS,u=1-t;
      var x=u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x;
      var y=u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y;
      var tx=3*(u*u*(p1.x-p0.x)+2*u*t*(p2.x-p1.x)+t*t*(p3.x-p2.x));
      var ty=3*(u*u*(p1.y-p0.y)+2*u*t*(p2.y-p1.y)+t*t*(p3.y-p2.y));
      var tl=Math.hypot(tx,ty)||1e-9;tx/=tl;ty/=tl;
      var hw=hwA+(hwB-hwA)*t;

      out.push({x:x,y:y,nx:-ty,ny:tx,tx:tx,ty:ty,hw:hw});
    }
    return out;
  }
  function cmPath(arr){
    if(!arr.length)return'';
    var d='M '+arr[0].x.toFixed(2)+' '+arr[0].y.toFixed(2);
    for(var i=0;i<arr.length-1;i++){
      var p0=arr[Math.max(0,i-1)],p1=arr[i],p2=arr[i+1],p3=arr[Math.min(arr.length-1,i+2)];
      var c1={x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6};
      var c2={x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6};
      d+=' C '+c1.x.toFixed(2)+' '+c1.y.toFixed(2)+' '+c2.x.toFixed(2)+' '+c2.y.toFixed(2)+' '+p2.x.toFixed(2)+' '+p2.y.toFixed(2);
    }
    return d;
  }
  function shortArc(jx,jy,r,a0,a1){
    var da=a1-a0;
    while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
    var N=Math.max(8,Math.ceil(Math.abs(da)*r/4));// more steps for larger arcs
    var res=[];
    for(var k=0;k<=N;k++){var a=a0+da*k/N;res.push({x:jx+r*Math.cos(a),y:jy+r*Math.sin(a)});}
    return res;
  }
  // Segment intersection: returns t in [0,1] along (ax,ay)->(bx,by) or -1
  function segIsect(ax,ay,bx,by,cx,cy,dx,dy){
    var r1x=bx-ax,r1y=by-ay,r2x=dx-cx,r2y=dy-cy;
    var denom=r1x*r2y-r1y*r2x;
    if(Math.abs(denom)<1e-9)return -1;
    var t=((cx-ax)*r2y-(cy-ay)*r2x)/denom;
    var u=((cx-ax)*r1y-(cy-ay)*r1x)/denom;
    if(t>=0&&t<=1&&u>=0&&u<=1)return t;
    return -1;
  }
  function rjoin(jx,jy,hwIn,hwOut,inTx,inTy,inNx,inNy,outTx,outTy,outNx,outNy){
    if(hwIn < 0.01 && hwOut < 0.01) return{Lpts:[{x:jx,y:jy}],Rpts:[{x:jx,y:jy}]};
    var r=(hwIn+hwOut)/2; // average for arc radius
    var cross=inTx*outTy-inTy*outTx;
    // Use hwIn for incoming side points, hwOut for outgoing side points
    var inLx=jx+inNx*hwIn,inLy=jy+inNy*hwIn,inRx=jx-inNx*hwIn,inRy=jy-inNy*hwIn;
    var outLx=jx+outNx*hwOut,outLy=jy+outNy*hwOut,outRx=jx-outNx*hwOut,outRy=jy-outNy*hwOut;
    function innerArcFn(ax,ay,bx,by){
      // Inner (concave) side: short arc from a to b via junction center
      var a0=Math.atan2(ay-jy,ax-jx),a1=Math.atan2(by-jy,bx-jx);
      var da=a1-a0;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
      if(Math.abs(da)>Math.PI) da=da>0?da-2*Math.PI:da+2*Math.PI;
      // Use same shortArc for smooth inner join (1-4 points depending on angle)
      var N=Math.max(1,Math.ceil(Math.abs(da)*r/8));
      var res=[];
      for(var k=1;k<N;k++){var a=a0+da*k/N;res.push({x:jx+r*Math.cos(a),y:jy+r*Math.sin(a)});}
      var am=a0+da;res.push({x:jx+r*Math.cos(am),y:jy+r*Math.sin(am)});
      return res;
    }
    var dot2=inTx*outTx+inTy*outTy;
    if(Math.abs(cross)<0.02){
      if(dot2>0.98){
        // Straight line with changing width: interpolate between in/out offsets
        var midLx=(inLx+outLx)/2,midLy=(inLy+outLy)/2;
        var midRx=(inRx+outRx)/2,midRy=(inRy+outRy)/2;
        return{Lpts:[midLx===outLx&&midLy===outLy?{x:outLx,y:outLy}:{x:midLx,y:midLy},{x:outLx,y:outLy}],Rpts:[{x:midRx,y:midRy},{x:outRx,y:outRy}]};
      }
      var aIn=Math.atan2(inLy-jy,inLx-jx),aOut=Math.atan2(outLy-jy,outLx-jx);
      var aInR=Math.atan2(inRy-jy,inRx-jx),aOutR=Math.atan2(outRy-jy,outRx-jx);
      var daL=aOut-aIn;while(daL>Math.PI)daL-=2*Math.PI;while(daL<-Math.PI)daL+=2*Math.PI;
      var daR=aOutR-aInR;while(daR>Math.PI)daR-=2*Math.PI;while(daR<-Math.PI)daR+=2*Math.PI;
      if(Math.abs(daL)>=Math.abs(daR)){
        var outerL = useArc ? shortArc(jx,jy,r,aIn,aOut) : [{x:inLx,y:inLy},{x:outLx,y:outLy}];
        return{Lpts:outerL,Rpts:innerArcFn(inRx,inRy,outRx,outRy)};
      } else {
        var outerR = useArc ? shortArc(jx,jy,r,aInR,aOutR) : [{x:inRx,y:inRy},{x:outRx,y:outRy}];
        return{Lpts:innerArcFn(inLx,inLy,outLx,outLy),Rpts:outerR};
      }
    }
    var hwRatio = hwIn > 0.01 ? hwOut/hwIn : 1;
    var useArc = hwRatio > 0.7 && hwRatio < 1.43;
    if(cross<0){
      // Check if outer L line crosses inner R line (self-intersection)
      var t=segIsect(inLx,inLy,outLx,outLy,inRx,inRy,outRx,outRy);
      if(t>=0){
        // Lines cross — use intersection point for both
        var ix=inLx+(outLx-inLx)*t, iy=inLy+(outLy-inLy)*t;
        return{Lpts:[{x:ix,y:iy}],Rpts:[{x:ix,y:iy}]};
      }
      var outerPts = useArc
        ? shortArc(jx,jy,r,Math.atan2(inLy-jy,inLx-jx),Math.atan2(outLy-jy,outLx-jx))
        : [{x:inLx,y:inLy},{x:outLx,y:outLy}];
      return{Lpts:outerPts,Rpts:innerArcFn(inRx,inRy,outRx,outRy)};
    } else {
      // Check if outer R line crosses inner L line
      var t=segIsect(inRx,inRy,outRx,outRy,inLx,inLy,outLx,outLy);
      if(t>=0){
        var ix=inRx+(outRx-inRx)*t, iy=inRy+(outRy-inRy)*t;
        return{Lpts:[{x:ix,y:iy}],Rpts:[{x:ix,y:iy}]};
      }
      var outerPts = useArc
        ? shortArc(jx,jy,r,Math.atan2(inRy-jy,inRx-jx),Math.atan2(outRy-jy,outRx-jx))
        : [{x:inRx,y:inRy},{x:outRx,y:outRy}];
      return{Lpts:innerArcFn(inLx,inLy,outLx,outLy),Rpts:outerPts};
    }
  }
  function endCap(cx,cy,r,fromA,toA,n){
    var da=toA-fromA;
    while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
    var res=[];
    for(var k=1;k<n;k++){var a=fromA+da*k/n;res.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)});}
    return res;
  }
  function endCapDa(cx,cy,r,fromA,da,n){
    var res=[];
    for(var k=1;k<n;k++){var a=fromA+da*k/n;res.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)});}
    return res;
  }
  var allPts=closed?pts.concat([pts[0]]):pts,nSegs=allPts.length-1,SS=[];
  for(var si=0;si<nSegs;si++)SS.push(sample(pts[si],allPts[si+1]));
  var L=[],R=[],C=[];
  for(var si=0;si<nSegs;si++){
    var samp=SS[si],isFirst=si===0,isLast=si===nSegs-1;
    for(var k=(isFirst?0:1);k<(isLast?samp.length:samp.length-1);k++){
      var s=samp[k];
      if(s.hw<0.01){
        L.push({x:s.x,y:s.y});R.push({x:s.x,y:s.y});C.push(s);
      } else {
        var lp={x:s.x+s.nx*s.hw,y:s.y+s.ny*s.hw};
        var rp={x:s.x-s.nx*s.hw,y:s.y-s.ny*s.hw};
        // Clamp to correct side to prevent inner-offset crossing
        var lOk=(lp.x-s.x)*s.nx+(lp.y-s.y)*s.ny>0;
        var rOk=(rp.x-s.x)*s.nx+(rp.y-s.y)*s.ny<0;
        if(lOk&&rOk){L.push(lp);R.push(rp);}
        else{L.push({x:s.x,y:s.y});R.push({x:s.x,y:s.y});}
        C.push(s);
      }
    }
    if(!isLast){
      var cur=samp[samp.length-1],next=SS[si+1][0];
      var j=rjoin(cur.x,cur.y,cur.hw,next.hw,cur.tx,cur.ty,cur.nx,cur.ny,next.tx,next.ty,next.nx,next.ny);
      j.Lpts.forEach(function(p){L.push(p);C.push(null);});
      j.Rpts.forEach(function(p){R.push(p);});
    }
  }

  if(L.length<2)return'';
  var firstS=SS[0][0],lastS=SS[nSegs-1][SS[nSegs-1].length-1];
  var Rrev=R.slice().reverse(),d;
  if(closed){d=cmPath(L)+' Z '+cmPath(Rrev)+' Z';}
  else{
    // Start cap: path goes R→cap→L. Cap sweeps from R[0] to L[0] going AROUND the tip.
    // "Around the tip" means going in the direction OPPOSITE to the curve tangent.
    // The correct arc is the one that passes through the tip point (center - tangent*hw).
    var aR0=Math.atan2(R[0].y-firstS.y,R[0].x-firstS.x);
    var aL0=Math.atan2(L[0].y-firstS.y,L[0].x-firstS.x);
    // Tip of start cap is opposite to forward direction
    var tipAng0 = Math.atan2(-firstS.ty, -firstS.tx);
    // Choose the sweep direction that passes through tipAng0
    var da0 = aL0 - aR0; while(da0>Math.PI)da0-=2*Math.PI; while(da0<-Math.PI)da0+=2*Math.PI;
    var daTip0 = tipAng0 - aR0; while(daTip0>Math.PI)daTip0-=2*Math.PI; while(daTip0<-Math.PI)daTip0+=2*Math.PI;
    // If tip is not in the same angular direction as da0, flip direction
    if(da0 !== 0 && daTip0 !== 0 && (da0 > 0) !== (daTip0 > 0)) { da0 = da0 > 0 ? da0 - 2*Math.PI : da0 + 2*Math.PI; }
    var sa=endCapDa(firstS.x,firstS.y,firstS.hw,aR0,da0,8);

    // End cap: path goes L[last]→cap→R[last]. Cap sweeps from L to R around the end tip.
    var aLe=Math.atan2(L[L.length-1].y-lastS.y,L[L.length-1].x-lastS.x);
    var aRe=Math.atan2(Rrev[0].y-lastS.y,Rrev[0].x-lastS.x);
    var tipAngE = Math.atan2(lastS.ty, lastS.tx);
    var daE = aRe - aLe; while(daE>Math.PI)daE-=2*Math.PI; while(daE<-Math.PI)daE+=2*Math.PI;
    var daTipE = tipAngE - aLe; while(daTipE>Math.PI)daTipE-=2*Math.PI; while(daTipE<-Math.PI)daTipE+=2*Math.PI;
    if(daE !== 0 && daTipE !== 0 && (daE > 0) !== (daTipE > 0)) { daE = daE > 0 ? daE - 2*Math.PI : daE + 2*Math.PI; }
    var ea=endCapDa(lastS.x,lastS.y,lastS.hw,aLe,daE,8);
    d=cmPath([R[0]].concat(sa,L,ea,Rrev))+' Z';
  }
  return '<path d="'+d+'" fill="'+strokeColor+'" fill-rule="nonzero" stroke="none" '+(shadowAttr||'')+'/>';
}

// Normalize curve points: manage cp1/cp2 handles based on open/closed state and position
// Build only the OUTER boundary of a variable-width stroke as a filled shape
function _expVarStrokeOuter(pts, w, h, closed, defaultSw, fillColor) {
  var STEPS = 36;
  function sample(prev, curr) {
    var hwA = Math.max(0.001, (prev.sw != null ? prev.sw : defaultSw) / 2);
    var hwB = Math.max(0.001, (curr.sw != null ? curr.sw : defaultSw) / 2);
    var p0={x:prev.x*w,y:prev.y*h}, p3={x:curr.x*w,y:curr.y*h};
    var p1={x:(prev.cp2x!=null?prev.cp2x:prev.x)*w, y:(prev.cp2y!=null?prev.cp2y:prev.y)*h};
    var p2={x:(curr.cp1x!=null?curr.cp1x:curr.x)*w, y:(curr.cp1y!=null?curr.cp1y:curr.y)*h};
    var out = [];
    for (var k = 0; k <= STEPS; k++) {
      var t=k/STEPS, u=1-t;
      var x=u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x;
      var y=u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y;
      var tx=3*(u*u*(p1.x-p0.x)+2*u*t*(p2.x-p1.x)+t*t*(p3.x-p2.x));
      var ty=3*(u*u*(p1.y-p0.y)+2*u*t*(p2.y-p1.y)+t*t*(p3.y-p2.y));
      var tl=Math.hypot(tx,ty)||1e-9; tx/=tl; ty/=tl;
      var hw = hwA + (hwB - hwA) * t;
      out.push({x:x, y:y, nx:-ty, ny:tx, hw:hw});
    }
    return out;
  }
  function cmPath(arr) {
    if (!arr.length) return '';
    var d = 'M '+arr[0].x.toFixed(2)+' '+arr[0].y.toFixed(2);
    for (var i = 0; i < arr.length-1; i++) {
      var p0=arr[Math.max(0,i-1)], p1=arr[i], p2=arr[i+1], p3=arr[Math.min(arr.length-1,i+2)];
      var c1={x:p1.x+(p2.x-p0.x)/6, y:p1.y+(p2.y-p0.y)/6};
      var c2={x:p2.x-(p3.x-p1.x)/6, y:p2.y-(p3.y-p1.y)/6};
      d+=' C '+c1.x.toFixed(2)+' '+c1.y.toFixed(2)+' '+c2.x.toFixed(2)+' '+c2.y.toFixed(2)+' '+p2.x.toFixed(2)+' '+p2.y.toFixed(2);
    }
    return d;
  }
  var allPts = closed ? pts.concat([pts[0]]) : pts;
  var nSegs = allPts.length - 1;
  var SS = [];
  for (var si = 0; si < nSegs; si++) SS.push(sample(pts[si], allPts[si+1]));
  // Build only LEFT (outer) boundary
  var L = [];
  for (var si = 0; si < nSegs; si++) {
    var samp = SS[si], isFirst = si===0, isLast = si===nSegs-1;
    for (var k = (isFirst?0:1); k < samp.length; k++) {
      var s = samp[k];
      L.push({x: s.x + s.nx * s.hw, y: s.y + s.ny * s.hw});
    }
  }
  if (L.length < 2) return '';
  var d = cmPath(L) + ' Z';
  return '<path d="'+d+'" '+fillColor+' stroke="none"/>';
}

function _normalizeCurvePoints(pts, closed) {
  if (!pts || pts.length < 2) return;
  pts.forEach((pt, i) => {
    const isFirst = i === 0;
    const isLast = i === pts.length - 1;
    if (closed) {
      // Closed curve: all points need both handles
      // If missing cp1, create it by reflecting cp2
      if (pt.cp1x == null && pt.cp2x != null) {
        pt.cp1x = pt.x * 2 - pt.cp2x;
        pt.cp1y = pt.y * 2 - pt.cp2y;
      }
      // If missing cp2, create it by reflecting cp1
      if (pt.cp2x == null && pt.cp1x != null) {
        pt.cp2x = pt.x * 2 - pt.cp1x;
        pt.cp2y = pt.y * 2 - pt.cp1y;
      }
      // If both missing, create default handles
      if (pt.cp1x == null && pt.cp2x == null) {
        const prev = pts[(i - 1 + pts.length) % pts.length];
        const next = pts[(i + 1) % pts.length];
        const dx = (next.x - prev.x) * 0.25;
        const dy = (next.y - prev.y) * 0.25;
        pt.cp1x = pt.x - dx; pt.cp1y = pt.y - dy;
        pt.cp2x = pt.x + dx; pt.cp2y = pt.y + dy;
      }
    } else {
      // Open curve: first point has no cp1, last point has no cp2
      if (isFirst) { delete pt.cp1x; delete pt.cp1y; }
      if (isLast)  { delete pt.cp2x; delete pt.cp2y; }
      // Middle points: ensure both handles exist
      if (!isFirst && !isLast) {
        if (pt.cp1x == null && pt.cp2x != null) {
          pt.cp1x = pt.x * 2 - pt.cp2x; pt.cp1y = pt.y * 2 - pt.cp2y;
        }
        if (pt.cp2x == null && pt.cp1x != null) {
          pt.cp2x = pt.x * 2 - pt.cp1x; pt.cp2y = pt.y * 2 - pt.cp1y;
        }
      }
      // First point only needs cp2
      if (isFirst && pt.cp2x == null) {
        const next = pts[1];
        pt.cp2x = pt.x + (next.x - pt.x) * 0.4;
        pt.cp2y = pt.y + (next.y - pt.y) * 0.4;
      }
      // Last point only needs cp1
      if (isLast && pt.cp1x == null) {
        const prev = pts[pts.length - 2];
        pt.cp1x = pt.x + (prev.x - pt.x) * 0.4;
        pt.cp1y = pt.y + (prev.y - pt.y) * 0.4;
      }
    }
  });
}

// Default curve points: S-curve with 3 nodes and smooth bezier handles
function _defaultCurvePoints() {
  return [
    { x: 0.1, y: 0.7, type: 'smooth', cp2x: 0.2, cp2y: 0.3 },
    { x: 0.5, y: 0.3, type: 'smooth', cp1x: 0.3, cp1y: 0.3, cp2x: 0.7, cp2y: 0.3 },
    { x: 0.9, y: 0.7, type: 'smooth', cp1x: 0.8, cp1y: 0.3 }
  ];
}

function insertShapeSelected(){
  const sh=SHAPES.find(s=>s.id===selShape)||SHAPES[0];
  const fill=document.getElementById('sm-fill').value;
  const stroke=document.getElementById('sm-stroke').value;
  const sw=+document.getElementById('sm-sw').value;
  // Replace mode — just change shape id on existing element
  if(window._shapeReplaceMode&&sel&&sel.dataset.type==='shape'){
    window._shapeReplaceMode=false;
    pushUndo();
    const d=slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d){
      // Наследуем все настройки из источника, меняем только форму
      const src=window._shapeReplaceSource||{};
      d.shape=sh.id;
      // Цвета: из модалки если пользователь их менял, иначе из оригинала
      d.fill=fill; d.stroke=stroke; d.sw=sw;
      // Все остальные свойства — из оригинала
      if(src.fillOp!==undefined)d.fillOp=src.fillOp;
      if(src.shadow!==undefined)d.shadow=src.shadow;
      if(src.shadowBlur!==undefined)d.shadowBlur=src.shadowBlur;
      if(src.shadowSize!==undefined)d.shadowSize=src.shadowSize;
      if(src.shadowColor!==undefined)d.shadowColor=src.shadowColor;
      if(src.shapeHtml!==undefined)d.shapeHtml=src.shapeHtml;
      if(src.shapeTextCss!==undefined)d.shapeTextCss=src.shapeTextCss;
      if(src.elOpacity!==undefined)d.elOpacity=src.elOpacity;
      // Для callout — добавляем хвост если нет
      const _replIsCallout=sh.special==='callout';
      if(_replIsCallout&&d.tailX===undefined){d.tailX=0;d.tailY=(d.h||200)/2+30;d.rx=d.rx||12;}
      sel.dataset.shape=sh.id;
      const svgDiv=sel.querySelector('.ec>div>div');
      if(svgDiv)svgDiv.innerHTML=buildShapeSVG(d,d.w,d.h);
      renderShapeEl(sel,d);
      _applyShapeClipPath(sel,d);
      window._shapeReplaceSource=null;
      save();drawThumbs();saveState();
      // Update properties panel immediately
      if(typeof syncProps==='function') syncProps();
    }
    document.getElementById('shape-modal').classList.remove('open');
    return;
  }
  window._shapeReplaceMode=false;
  pushUndo();
  const _isCallout=sh.special==='callout';
  const _isCloud = sh.special === 'cloud';
  const _insertFill = _isCloud ? '#b5d5f0' : (sh.noFill ? 'none' : fill);
  const _insertSw = _isCloud ? 0 : sw;
  const _isCurve = sh.special === 'curve';
  const _defSize = _isCloud ? _CLOUD_INSERT_SIZE : 200;
  const d={id:'e'+(++ec),type:'shape',x:snapV((canvasW-_defSize)/2),y:snapV((canvasH-_defSize)/2),w:snapV(_defSize),h:snapV(_defSize),
    shape:sh.id,fill:_insertFill,stroke:_isCloud?'#1d4ed8':stroke,sw:_insertSw,rx:_isCallout?12:0,fillOp:1,shadow:false,shadowBlur:4,shadowSize:3,shadowColor:'#000000',
    shapeHtml:'',shapeTextCss:'font-size:24px;font-weight:700;color:#ffffff;text-align:center;',
    tailX:_isCallout?0:undefined,tailY:_isCallout?130:undefined,rot:0,anims:[],
    cloudSeed:_isCloud?(Math.floor(Math.random()*999999)+1):undefined,
    cloudForm:_isCloud?'puff':undefined,
    curvePoints:_isCurve?_defaultCurvePoints():undefined,
    curveClosed:_isCurve?false:undefined};
  if (_isCloud && typeof _cloudBakeAndFit === 'function') _cloudBakeAndFit(d, null);
  slides[cur].els.push(d);mkEl(d);save();drawThumbs();saveState();
  document.getElementById('shape-modal').classList.remove('open');
}

// Build SVG path for shape
// Generate callout SVG path dynamically
// tailX/tailY: tip position in element coords (default: bottom-center + offset)
function _buildCalloutSVGPath(d,w,h,sh,fillAttr,strokeAttr,shadow,margin){
  const rx=d.rx||0;
  const sw=d.sw!==undefined?+d.sw:2;
  const bx=margin,by=margin,bw=Math.max(1,w-margin*2),bh=Math.max(1,h-margin*2);
  const cx=bx+bw/2, cy=by+bh/2;
  const L=bx,T=by,R2=bx+bw,B=by+bh;
  const r=Math.min(rx, bw/2, bh/2);
  const _=n=>Math.round(n*10)/10;

  const tipX=_(w/2+(d.tailX!==undefined?+d.tailX:0));
  const tipY=_(h/2+(d.tailY!==undefined?+d.tailY:h/2+30));
  const ang=Math.atan2(tipY-cy, tipX-cx);
  const tw=Math.max(16, Math.min(bw,bh)*0.14);

  // Find point on rounded-rect border at given angle from center
  function borderPt(a){
    const dx=Math.cos(a), dy=Math.sin(a);
    let best=null,bestT=Infinity;
    function tryT(t){if(t>1e-6&&t<bestT){bestT=t;best={x:cx+dx*t,y:cy+dy*t};}}
    if(Math.abs(dy)>1e-9){tryT((T+r-cy)/dy);tryT((B-r-cy)/dy);}
    if(Math.abs(dx)>1e-9){tryT((L+r-cx)/dx);tryT((R2-r-cx)/dx);}
    [{qx:L+r,qy:T+r},{qx:R2-r,qy:T+r},{qx:R2-r,qy:B-r},{qx:L+r,qy:B-r}].forEach(({qx,qy})=>{
      const fx=cx-qx,fy=cy-qy,a2=dx*dx+dy*dy;
      const b2=2*(fx*dx+fy*dy),cv=fx*fx+fy*fy-r*r,disc=b2*b2-4*a2*cv;
      if(disc>=0){const sq=Math.sqrt(disc);[(-b2+sq)/(2*a2),(-b2-sq)/(2*a2)].forEach(tryT);}
    });
    return best||{x:cx+dx*bw/2,y:cy+dy*bh/2};
  }

  // Base center and its distance from element center
  const baseC=borderPt(ang);
  const baseDist=Math.sqrt((baseC.x-cx)**2+(baseC.y-cy)**2);

  // Spread b1/b2 by angular offset so arc-length ≈ tw regardless of radius
  const angOffset=Math.atan2(tw, baseDist);
  const b1=borderPt(ang+angOffset);
  const b2=borderPt(ang-angOffset);

  // Push base points slightly inward to cover stroke gap
  const inset=sw/2+0.5;
  function pushIn(p){
    const ddx=cx-p.x,ddy=cy-p.y,len=Math.sqrt(ddx*ddx+ddy*ddy)||1;
    return{x:_(p.x+ddx/len*inset),y:_(p.y+ddy/len*inset)};
  }
  const bi1=pushIn(b1), bi2=pushIn(b2);

  const rectPath=r>0
    ?`M ${_(L+r)} ${_(T)} H ${_(R2-r)} Q ${_(R2)} ${_(T)} ${_(R2)} ${_(T+r)} V ${_(B-r)} Q ${_(R2)} ${_(B)} ${_(R2-r)} ${_(B)} H ${_(L+r)} Q ${_(L)} ${_(B)} ${_(L)} ${_(B-r)} V ${_(T+r)} Q ${_(L)} ${_(T)} ${_(L+r)} ${_(T)} Z`
    :`M ${_(L)} ${_(T)} H ${_(R2)} V ${_(B)} H ${_(L)} Z`;

  const tailPath=`M ${_(bi1.x)} ${_(bi1.y)} L ${_(tipX)} ${_(tipY)} L ${_(bi2.x)} ${_(bi2.y)} Z`;
  return `<g ${shadow}><path d="${rectPath}" ${fillAttr} ${strokeAttr}/><path d="${tailPath}" ${fillAttr} stroke="none"/></g>`;
}

function _getStrokeDasharray(style, sw) {
  if (!style || style === 'solid') return '';
  if (style === 'dashed') return `stroke-dasharray="${sw*4} ${sw*3}"`;
  if (style === 'dotted') return `stroke-dasharray="${sw} ${sw*3}" stroke-linecap="round"`;
  return '';
}

// Returns {dasharray, pathLength, extraAttrs} for even dot/dash distribution
// perimeter: actual contour length; sw: stroke width; style: 'dotted'|'dashed'
function _evenDash(style, sw, perimeter) {
  if (!perimeter || perimeter < 1) return null;
  const dot  = sw;        // dot diameter
  const gap  = sw * 3;    // gap between dots (wider for better look)
  const period = dot + gap;
  // Round to nearest whole number of dots so they distribute evenly
  const n = Math.max(1, Math.round(perimeter / period));
  // Set pathLength so that n*(dot+gap) == pathLength
  // Browser will stretch/compress evenly around the path
  const pl = n * period;
  if (style === 'dotted') {
    return {
      pathLength: pl.toFixed(2),
      dasharray: `${dot} ${gap}`,
      extraAttrs: `stroke-linecap="round" pathLength="${pl.toFixed(2)}"`
    };
  }
  if (style === 'dashed') {
    const dash = sw * 4, dgap = sw * 3;
    const periodD = dash + dgap;
    const nD = Math.max(1, Math.round(perimeter / periodD));
    const plD = nD * periodD;
    return {
      pathLength: plD.toFixed(2),
      dasharray: `${dash} ${dgap}`,
      extraAttrs: `pathLength="${plD.toFixed(2)}"`
    };
  }
  return null;
}

// Compute perimeter of shape given type and dimensions
function _shapePerimeter(sh, w, h, m) {
  const ew = Math.max(1, w - m*2), eh = Math.max(1, h - m*2);
  if (sh.special === 'ellipse') {
    // Ramanujan approximation
    const a = ew/2, b = eh/2;
    return Math.PI * (3*(a+b) - Math.sqrt((3*a+b)*(a+3*b)));
  }
  if (sh.special === 'rect') {
    return 2*(ew + eh);
  }
  // For polygon shapes: sum of edge lengths
  if (!sh.path) return 2*(ew+eh);
  const sx = ew/90, sy = eh/90;
  const pts = [];
  const re = /[ML]\s*([-\d.]+)[,\s]+([-\d.]+)/g;
  let match;
  while ((match = re.exec(sh.path)) !== null) {
    pts.push({x: (parseFloat(match[1])-5)*sx + m, y: (parseFloat(match[2])-5)*sy + m});
  }
  let perim = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i+1)%pts.length];
    perim += Math.hypot(b.x-a.x, b.y-a.y);
  }
  return perim;
}

// ── Continuous wave/zigzag path along an arbitrary SVG path ──────
// Samples the path at equal arc-length intervals and builds
// a Bezier wave or zigzag that flows continuously across corners.
function _complexPathWave(svgPathStr, style, sw, skipClose) {
  if (typeof document === 'undefined') return null;
  try {
    const tmpSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tmpSvg.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:1px;height:1px;';
    document.body.appendChild(tmpSvg);
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', svgPathStr);
    tmpSvg.appendChild(p);
    const totalLen = p.getTotalLength();
    document.body.removeChild(tmpSvg);
    if (totalLen < 1) return null;

    // Step size — one full wave = 2 half-steps
    const halfStep = style === 'wave' ? sw * 3.5 : sw * 2.5;
    const amp = sw * 0.85;

    // Number of half-steps — always even so wave closes at start point
    let nHalf = Math.max(4, Math.round(totalLen / halfStep));
    if (nHalf % 2 !== 0) nHalf++;
    const actualHalf = totalLen / nHalf;

    // Sample points: one per half-step boundary + midpoints for Bezier
    // For each half-step i: we go from t_i to t_{i+1}, peak at midpoint
    const pts = [];
    for (let i = 0; i <= nHalf; i++) {
      const l = Math.min(totalLen, actualHalf * i);
      const pt = p.getPointAtLength(l);
      pts.push({ x: pt.x, y: pt.y });
    }

    // Also sample midpoints for control points
    const mids = [];
    for (let i = 0; i < nHalf; i++) {
      const l = actualHalf * i + actualHalf * 0.5;
      const pt = p.getPointAtLength(Math.min(totalLen, l));
      mids.push({ x: pt.x, y: pt.y });
    }

    // Build path: each half-step alternates outward/inward
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} `;
    for (let i = 0; i < nHalf; i++) {
      const a = pts[i], b = pts[i + 1], m = mids[i];
      const side = (i % 2 === 0) ? 1 : -1;
      // Normal at midpoint: perpendicular to segment a→b
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const nx = len > 0 ? -dy / len : 0;
      const ny = len > 0 ?  dx / len : 1;
      const cpx = (m.x + nx * amp * side).toFixed(2);
      const cpy = (m.y + ny * amp * side).toFixed(2);
      if (style === 'wave') {
        d += `Q ${cpx} ${cpy} ${b.x.toFixed(2)} ${b.y.toFixed(2)} `;
      } else {
        // Zigzag: two straight lines through peak
        d += `L ${cpx} ${cpy} L ${b.x.toFixed(2)} ${b.y.toFixed(2)} `;
      }
    }
    // Close back to start — skip for open paths (noFill shapes like line/wave)
    if (!skipClose) d += 'Z';
    return d;
  } catch(e) {
    console.warn('[wave] error:', e);
    return null;
  }
}

// Rounds polygon corners like Adobe Illustrator using cubic Bezier curves.
// Both convex and concave corners are rounded — control points sit AT the vertex,
// creating smooth tangent-continuous curves on both sides.
function _roundedPolygonPath(pts, rx) {
  const n = pts.length;
  if (n < 3 || rx <= 0) {
    return pts.map((p,i)=>(i===0?'M ':'L ')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ')+' Z';
  }

  // Precompute anchor points (p1, p2) and control points (vertex) for every corner
  const corners = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i-1+n)%n];
    const curr = pts[i];
    const next = pts[(i+1)%n];

    const e1x = prev.x-curr.x, e1y = prev.y-curr.y; // toward prev
    const e2x = next.x-curr.x, e2y = next.y-curr.y; // toward next
    const len1 = Math.hypot(e1x, e1y);
    const len2 = Math.hypot(e2x, e2y);
    if (len1 < 0.001 || len2 < 0.001) { corners.push(null); continue; }

    const u1x = e1x/len1, u1y = e1y/len1; // unit toward prev
    const u2x = e2x/len2, u2y = e2y/len2; // unit toward next

    // Angle between the two edges at this vertex
    const dot = u1x*u2x + u1y*u2y;
    const cosA = Math.max(-1, Math.min(1, dot));
    const halfAngle = Math.acos(cosA) / 2;

    // Limit r so arcs from adjacent corners don't overlap
    const r = Math.min(rx, len1/2, len2/2);

    // Anchor points on edges at distance r from vertex
    const p1x = curr.x + u1x*r, p1y = curr.y + u1y*r; // on incoming edge
    const p2x = curr.x + u2x*r, p2y = curr.y + u2y*r; // on outgoing edge

    // Bezier control point weight: k = (4/3)*tan(angle/4)
    // This gives the cubic bezier that best approximates a circular arc
    // k controls how far control points pull toward the vertex
    // Standard arc approximation: (4/3)*tan(θ/4). Use max(k,0.55) for rounder feel.
    const kCalc = (4/3) * Math.tan(halfAngle / 2);
    const k = Math.max(kCalc, 0.55);
    const cp1x = p1x - u1x * r * k, cp1y = p1y - u1y * r * k; // cp toward vertex
    const cp2x = p2x - u2x * r * k, cp2y = p2y - u2y * r * k; // cp toward vertex

    corners.push({ p1x, p1y, p2x, p2y, cp1x, cp1y, cp2x, cp2y });
  }

  // Build path: for each corner emit L p1, C cp1 cp2 p2
  // The L connects p2 of previous corner to p1 of current corner (straight edge segment)
  let d = '';
  let started = false;
  for (let i = 0; i < n; i++) {
    const c = corners[i];
    if (!c) continue;
    if (!started) {
      d += `M ${c.p1x.toFixed(2)} ${c.p1y.toFixed(2)} `;
      started = true;
    } else {
      d += `L ${c.p1x.toFixed(2)} ${c.p1y.toFixed(2)} `;
    }
    // Cubic bezier through the corner
    d += `C ${c.cp1x.toFixed(2)} ${c.cp1y.toFixed(2)} ${c.cp2x.toFixed(2)} ${c.cp2y.toFixed(2)} ${c.p2x.toFixed(2)} ${c.p2y.toFixed(2)} `;
  }
  d += 'Z';
  return d;
}

// Rounds only sharp (L) corners of an SVG path, preserving Q/C curve segments intact.
function _roundedMixedPath(pathStr, rx) {
  if (!pathStr || rx <= 0) return pathStr;

  // Parse into segments
  const segRe = /([MLQCZz])\s*((?:[-\d.e]+[\s,]+)*[-\d.e]+)?/g;
  const raw = [];
  let m;
  while ((m = segRe.exec(pathStr)) !== null) {
    const cmd = m[1].toUpperCase();
    const nums = m[2] ? m[2].trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n)) : [];
    raw.push({ cmd, nums });
  }

  // Build flat list of nodes with their type
  // type: 'M' | 'L' | 'Q' | 'C' | 'Z'
  // For rounding we only care about L-type corners
  // A corner at node i is roundable if both incoming and outgoing edges are L
  const nodes = [];
  let cx = 0, cy = 0, mx = 0, my = 0;
  for (const seg of raw) {
    if (seg.cmd === 'M') {
      cx = seg.nums[0]; cy = seg.nums[1];
      mx = cx; my = cy;
      nodes.push({ cmd: 'M', x: cx, y: cy });
    } else if (seg.cmd === 'L') {
      const x = seg.nums[0], y = seg.nums[1];
      nodes.push({ cmd: 'L', x, y, fromX: cx, fromY: cy });
      cx = x; cy = y;
    } else if (seg.cmd === 'Q') {
      nodes.push({ cmd: 'Q', nums: seg.nums, fromX: cx, fromY: cy });
      cx = seg.nums[2]; cy = seg.nums[3];
    } else if (seg.cmd === 'C') {
      nodes.push({ cmd: 'C', nums: seg.nums, fromX: cx, fromY: cy });
      cx = seg.nums[4]; cy = seg.nums[5];
    } else if (seg.cmd === 'Z') {
      nodes.push({ cmd: 'Z', x: mx, y: my });
    }
  }

  // Build output
  // For each L node, check if prev output point and next node are both L-type
  // If so, insert rounding arc
  const n = nodes.length;
  const out = [];

  // Helper: get the "arrival point" of node i (where it ends)
  function endPt(i) {
    const nd = nodes[i];
    if (nd.cmd === 'M' || nd.cmd === 'L' || nd.cmd === 'Z') return { x: nd.x, y: nd.y };
    if (nd.cmd === 'Q') return { x: nd.nums[2], y: nd.nums[3] };
    if (nd.cmd === 'C') return { x: nd.nums[4], y: nd.nums[5] };
    return null;
  }

  // Find M node start point and last L before Z for wrap-around rounding
  let startIdx = nodes.findIndex(nd => nd.cmd === 'M');
  let zIdx = nodes.findIndex(nd => nd.cmd === 'Z');

  // For each node, compute whether we should pre-shorten the line to it
  const rounded = {};

  function makeRound(i, vx, vy, prevX, prevY, nextX, nextY) {
    const e1x = vx - prevX, e1y = vy - prevY;
    const e2x = nextX - vx, e2y = nextY - vy;
    const len1 = Math.hypot(e1x, e1y), len2 = Math.hypot(e2x, e2y);
    if (len1 < 0.1 || len2 < 0.1) return;
    const r = Math.min(rx, len1 / 2, len2 / 2);
    const p1x = vx - (e1x / len1) * r, p1y = vy - (e1y / len1) * r;
    const p2x = vx + (e2x / len2) * r, p2y = vy + (e2y / len2) * r;
    rounded[i] = { p1x, p1y, p2x, p2y, vx, vy };
  }

  for (let i = 0; i < n; i++) {
    const nd = nodes[i];

    // Round L corners
    if (nd.cmd === 'L') {
      // Find prev endpoint
      let prevEnd = null;
      for (let j = i - 1; j >= 0; j--) {
        prevEnd = endPt(j);
        if (prevEnd) break;
      }
      if (!prevEnd) continue;

      const nextNd = nodes[i + 1];
      if (!nextNd) continue;

      if (nextNd.cmd === 'L') {
        // L -> L corner: round
        makeRound(i, nd.x, nd.y, prevEnd.x, prevEnd.y, nextNd.x, nextNd.y);
      } else if (nextNd.cmd === 'Z' || nextNd.cmd === 'M') {
        // L -> Z: closing line goes back to M start point
        const startPt = endPt(startIdx);
        if (startPt) {
          // Next after Z is the first L (first outgoing edge from M)
          const firstL = nodes.find((nd2, j) => j > startIdx && nd2.cmd === 'L');
          if (firstL) makeRound(i, nd.x, nd.y, prevEnd.x, prevEnd.y, startPt.x, startPt.y);
        }
      }
    }

    // Round the M start point if it's a corner between last L and first L
    if (nd.cmd === 'M' && zIdx >= 0) {
      // Incoming: last L before Z
      const lastL = [...nodes].slice(0, zIdx).reverse().find(nd2 => nd2.cmd === 'L');
      // Outgoing: first L after M
      const firstL = nodes.find((nd2, j) => j > i && nd2.cmd === 'L');
      if (lastL && firstL) {
        makeRound(i, nd.x, nd.y, lastL.x, lastL.y, firstL.x, firstL.y);
      }
    }
  }

  // Emit path
  for (let i = 0; i < n; i++) {
    const nd = nodes[i];
    const rnd = rounded[i];
    if (nd.cmd === 'M') {
      if (rnd) {
        // M point is a rounded corner — start at p2 (after rounding arc)
        out.push(`M ${rnd.p2x.toFixed(2)} ${rnd.p2y.toFixed(2)}`);
      } else {
        out.push(`M ${nd.x.toFixed(2)} ${nd.y.toFixed(2)}`);
      }
    } else if (nd.cmd === 'L') {
      if (rnd) {
        // Stop before vertex, emit rounding arc
        out.push(`L ${rnd.p1x.toFixed(2)} ${rnd.p1y.toFixed(2)}`);
        out.push(`Q ${rnd.vx.toFixed(2)} ${rnd.vy.toFixed(2)} ${rnd.p2x.toFixed(2)} ${rnd.p2y.toFixed(2)}`);
      } else {
        out.push(`L ${nd.x.toFixed(2)} ${nd.y.toFixed(2)}`);
      }
    } else if (nd.cmd === 'Q') {
      out.push(`Q ${nd.nums[0].toFixed(2)} ${nd.nums[1].toFixed(2)} ${nd.nums[2].toFixed(2)} ${nd.nums[3].toFixed(2)}`);
    } else if (nd.cmd === 'C') {
      out.push(`C ${nd.nums[0].toFixed(2)} ${nd.nums[1].toFixed(2)} ${nd.nums[2].toFixed(2)} ${nd.nums[3].toFixed(2)} ${nd.nums[4].toFixed(2)} ${nd.nums[5].toFixed(2)}`);
    } else if (nd.cmd === 'Z') {
      // If M was rounded, we need to close to p1 of M rounding, then arc to p2
      const mRnd = rounded[startIdx];
      if (mRnd) {
        out.push(`L ${mRnd.p1x.toFixed(2)} ${mRnd.p1y.toFixed(2)}`);
        out.push(`Q ${mRnd.vx.toFixed(2)} ${mRnd.vy.toFixed(2)} ${mRnd.p2x.toFixed(2)} ${mRnd.p2y.toFixed(2)}`);
      }
      out.push('Z');
    }
  }
  return out.join(' ');
}

// Extract polygon points from SVG path string (handles M, L, Q, C, T, S commands)
function _extractPolygonPts(pathStr) {
  const pts = [];
  // Match any path command followed by coordinate pairs
  // For Q (quadratic): take the endpoint (last pair)
  // For C (cubic): take the endpoint (last pair)
  // For M, L: take the point directly
  const re = /([MLQCSTAmlqcsta])\s*((?:[-\d.]+[\s,]+)*[-\d.]+)/g;
  let m;
  while ((m = re.exec(pathStr)) !== null) {
    const cmd = m[1].toUpperCase();
    if (cmd === 'Z') continue;
    const nums = m[2].trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
    // Each command ends at its last x,y pair
    if (nums.length >= 2) {
      // Take the last pair (destination point)
      const x = nums[nums.length - 2];
      const y = nums[nums.length - 1];
      pts.push({ x, y });
    }
  }
  return pts;
}


function buildShapeSVG(d, w, h) {
  // Export uses self-contained buildShapeSVG in js/26-export.js (_exp* helpers, SHAPES_DATA).
  const _shapeLib = (typeof SHAPES_DATA !== 'undefined' ? SHAPES_DATA : SHAPES);
  const sh = _shapeLib.find(s => s.id === d.shape) || _shapeLib[0];
  const op = d.fillOp === undefined ? 1 : +d.fillOp;
  // noFill shapes (line, wave) always render without fill
  const _noFill = sh.noFill || false;
  const fill = _noFill ? 'none' : ((d.fill && d.fill !== 'none') ? d.fill : (d.fill === 'none' ? 'none' : '#3b82f6'));
  const hasFill = fill !== 'none';
  const sw = d.sw === undefined ? 2 : +d.sw;
  const strokeColor = d.stroke || '#1d4ed8';
  const strokeStyle = d.strokeStyle || 'solid';
  const isComplex = strokeStyle === 'wave' || strokeStyle === 'zigzag';
  const isDouble  = strokeStyle === 'double';
  // margin for non-complex: stroke sits centred on shape edge
  const margin = (!isComplex && sw > 0) ? sw / 2 : 0;
  const shadow = d.shadow ? `filter="url(#sh_${d.id})"` : '';
  // op applied as SVG opacity so both fill AND stroke are transparent together
  // Shape fill gradient support
  let _gradDef = '';
  let fillAttr = hasFill ? `fill="${fill}"${op < 1 ? ` fill-opacity="${op.toFixed(3)}"` : ''}` : 'fill="none"';
  if (hasFill && d.fillGrad && d.fillGrad2) {
    const _gid = 'sg_' + d.id;
    const _dir = d.fillGradDir != null ? +d.fillGradDir : 90;
    const _rad = (_dir - 90) * Math.PI / 180;
    const _x1 = (50 - 50 * Math.cos(_rad)).toFixed(1);
    const _y1 = (50 - 50 * Math.sin(_rad)).toFixed(1);
    const _x2 = (50 + 50 * Math.cos(_rad)).toFixed(1);
    const _y2 = (50 + 50 * Math.sin(_rad)).toFixed(1);
    _gradDef = `<linearGradient id="${_gid}" x1="${_x1}%" y1="${_y1}%" x2="${_x2}%" y2="${_y2}%">`
      + `<stop offset="0%" stop-color="${fill}"/>`
      + `<stop offset="100%" stop-color="${d.fillGrad2}"/>`
      + `</linearGradient>`;
    fillAttr = `fill="url(#${_gid})"${op < 1 ? ` fill-opacity="${op.toFixed(3)}"` : ''}`;
  }

  // ── shape geometry helpers ──────────────────────────────────────

  // Returns SVG element string for a given margin
  function shapeEl(fAttr, sAttr, m, extra = '') {
    const ew = Math.max(1, w - m * 2), eh = Math.max(1, h - m * 2);
    if (sh.special === 'rect')
      return `<rect x="${m}" y="${m}" width="${ew}" height="${eh}" rx="${d.rx||0}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    if (sh.special === 'cloud') {
      const seed = d.cloudSeed || 42;
      const circles = _cloudResolveCircles(d, w, h);
      const path = _cloudBlobsPath(circles, 0);
      const _cFill = typeof fillAttr !== 'undefined' ? fillAttr : fAttr;
      const _cGradDef = _gradDef || '';
      let strokePart = '';
      if (sw > 0) {
        const strokePath = _cloudBlobsPath(circles, sw / 2);
        const strokeFill = op < 1
          ? `fill="${strokeColor}" fill-opacity="${op.toFixed(3)}"`
          : `fill="${strokeColor}"`;
        strokePart = `<path d="${strokePath}" fill-rule="nonzero" ${strokeFill} stroke="none" ${extra}/>`;
      }
      let fillPart = '';
      if (hasFill) {
        if (d.fillGrad && d.fillGrad2) {
          fillPart = `<path d="${path}" fill-rule="nonzero" ${_cFill} stroke="none" ${extra} ${shadow}/>`;
        } else {
          const shade = _cloudShadeFromFill(fill);
          fillPart = _buildCloudArtSvg(circles, fill, shade, op, d.id, extra, shadow, w, h);
        }
      }
      if (_cGradDef) {
        return `<defs>${_cGradDef}</defs>` + strokePart + fillPart;
      }
      return strokePart + fillPart;
    }
    if (sh.special === 'parallelogram') {
      const _skew = Math.max(-45, Math.min(45, +(d.paraSkew!=null?d.paraSkew:20)));
      const _off = Math.round((eh/2) * Math.tan(_skew*Math.PI/180));
      const _pts = [
        {x: m+_off, y: m},
        {x: m+ew,   y: m},
        {x: m+ew-_off, y: m+eh},
        {x: m,      y: m+eh}
      ];
      let _pp = `M ${_pts[0].x} ${_pts[0].y} L ${_pts[1].x} ${_pts[1].y} L ${_pts[2].x} ${_pts[2].y} L ${_pts[3].x} ${_pts[3].y} Z`;
      if((d.rx||0)>0) _pp = _roundedPolygonPath(_pts, d.rx);
      return `<path d="${_pp}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    }
    if (sh.special === 'cloud') {
    // Cloud uses multiple circle subpaths — pointer-events handled via SVG visibleFill
    // Return 'none' to skip CSS clip-path (SVG path element handles hit testing)
    return 'none';
  }
  if (sh.special === 'parallelogram') {
    const _skewC = Math.max(-45, Math.min(45, +(d.paraSkew!=null?d.paraSkew:20)));
    const _offC = Math.round((h/2) * Math.tan(_skewC*Math.PI/180));
    return `polygon(${_offC}px 0px, ${w}px 0px, ${w-_offC}px ${h}px, 0px ${h}px)`;
  }
  if (sh.special === 'trapezoid') {
    const tTop = d.trapTop != null ? +d.trapTop : 0.15;
    const tBot = d.trapBot != null ? +d.trapBot : 0.0;
    const tp = _trapPath(m, m, ew, eh, tTop, tBot, d.rx||0);
    return `<path d="${tp}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
  }
  if (sh.special === 'noSymbol') {
    const cr  = Math.min(ew, eh) / 2;
    const ccx = w / 2, ccy = h / 2;
    const lw  = Math.max(3, Math.round(cr * 0.28));
    const ir  = cr - lw;
    const hw  = lw / 2;
    const s2  = Math.SQRT1_2;
    const f2  = v => v.toFixed(2);
    const tIn = Math.sqrt(ir*ir - hw*hw);

    const R1x=ccx+tIn*s2-hw*s2, R1y=ccy-tIn*s2-hw*s2;
    const R2x=ccx-tIn*s2-hw*s2, R2y=ccy+tIn*s2-hw*s2;
    const L1x=ccx+tIn*s2+hw*s2, L1y=ccy-tIn*s2+hw*s2;
    const L2x=ccx-tIn*s2+hw*s2, L2y=ccy+tIn*s2+hw*s2;

    // Cardinal points on inner circle
    const itX=ccx,    itY=ccy-ir;  // top
    const ilX=ccx-ir, ilY=ccy;     // left
    const ieX=ccx+ir, ieY=ccy;     // east/right
    const ibX=ccx,    ibY=ccy+ir;  // bottom

    // Outer circle CCW
    const outerPath =
      `M ${f2(ccx+cr)},${f2(ccy)} A ${f2(cr)} ${f2(cr)} 0 1 0 ${f2(ccx-cr)},${f2(ccy)} A ${f2(cr)} ${f2(cr)} 0 1 0 ${f2(ccx+cr)},${f2(ccy)} Z`;

    // Hole 1: inner_TOP → CW arc→R1 → line→R2 → CW arc→inner_LEFT → CW arc→inner_TOP
    const hole1 =
      `M ${f2(itX)},${f2(itY)}` +
      ` A ${f2(ir)} ${f2(ir)} 0 0 1 ${f2(R1x)},${f2(R1y)}` +
      ` L ${f2(R2x)},${f2(R2y)}` +
      ` A ${f2(ir)} ${f2(ir)} 0 0 1 ${f2(ilX)},${f2(ilY)}` +
      ` A ${f2(ir)} ${f2(ir)} 0 0 1 ${f2(itX)},${f2(itY)} Z`;

    // Hole 2: L1 → CW arc→inner_EAST → CW arc→inner_BOTTOM → CW arc→L2 → line→L1
    const hole2 =
      `M ${f2(L1x)},${f2(L1y)}` +
      ` A ${f2(ir)} ${f2(ir)} 0 0 1 ${f2(ieX)},${f2(ieY)}` +
      ` A ${f2(ir)} ${f2(ir)} 0 0 1 ${f2(ibX)},${f2(ibY)}` +
      ` A ${f2(ir)} ${f2(ir)} 0 0 1 ${f2(L2x)},${f2(L2y)}` +
      ` L ${f2(L1x)},${f2(L1y)} Z`;

    let strokeEl = '';
    if (sw > 0) {
      const tOut = Math.sqrt(cr*cr - hw*hw);
      const Ro1x=ccx+tOut*s2-hw*s2, Ro1y=ccy-tOut*s2-hw*s2;
      const Ro2x=ccx-tOut*s2-hw*s2, Ro2y=ccy+tOut*s2-hw*s2;
      const Lo1x=ccx+tOut*s2+hw*s2, Lo1y=ccy-tOut*s2+hw*s2;
      const Lo2x=ccx-tOut*s2+hw*s2, Lo2y=ccy+tOut*s2+hw*s2;
      strokeEl =
        `<circle cx="${f2(ccx)}" cy="${f2(ccy)}" r="${f2(cr)}" fill="none" ${sAttr}/>` +
        `<circle cx="${f2(ccx)}" cy="${f2(ccy)}" r="${f2(ir)}" fill="none" ${sAttr}/>` +
        `<path d="M ${f2(Ro1x)},${f2(Ro1y)} L ${f2(R1x)},${f2(R1y)} M ${f2(R2x)},${f2(R2y)} L ${f2(Ro2x)},${f2(Ro2y)} M ${f2(Lo1x)},${f2(Lo1y)} L ${f2(L1x)},${f2(L1y)} M ${f2(L2x)},${f2(L2y)} L ${f2(Lo2x)},${f2(Lo2y)}" fill="none" ${sAttr} stroke-linecap="butt"/>`;
    }

    return (
      `<path d="${outerPath} ${hole1} ${hole2}" ${fAttr} fill-rule="nonzero" stroke="none" ${extra} ${shadow}/>` +
      strokeEl
    );
  }
  if (sh.special === 'moon') {
    const phase = d.moonPhase != null ? +d.moonPhase : -0.5;
    return _moonSVG(w/2, h/2, ew/2, eh/2, phase, d.rx||0, fAttr, sAttr, extra, shadow, d.id);
  }
  if (sh.special === 'gear') {
      const nTeeth = Math.max(3, Math.min(60, +(d.gearTeeth||12)));
      const toothD = Math.max(0.05, Math.min(0.6, +(d.gearDepth!=null?d.gearDepth:0.25)));
      const sp = _gearPath(w/2, h/2, ew/2, eh/2, nTeeth, toothD);
      return `<path d="${sp}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
  }
  if (sh.special === 'curve') {
    const cpts = d.curvePoints;
    if (!cpts || cpts.length < 2) return null;
    const hasNSw = cpts.some(p => p.sw != null);
    // Use max sw across nodes for rendering decision (not d.sw which may be 0)
    const effectiveSw = hasNSw ? Math.max(...cpts.map(p => p.sw != null ? p.sw : sw), sw) : sw;
    // Build base bezier path for fill
    let _cd = `M ${(cpts[0].x*w).toFixed(2)} ${(cpts[0].y*h).toFixed(2)}`;
    for (let ci = 1; ci < cpts.length; ci++) {
      const pp = cpts[ci-1], cp = cpts[ci];
      const c1x = pp.cp2x != null ? pp.cp2x : pp.x, c1y = pp.cp2y != null ? pp.cp2y : pp.y;
      const c2x = cp.cp1x != null ? cp.cp1x : cp.x, c2y = cp.cp1y != null ? cp.cp1y : cp.y;
      _cd += ` C ${(c1x*w).toFixed(2)} ${(c1y*h).toFixed(2)} ${(c2x*w).toFixed(2)} ${(c2y*h).toFixed(2)} ${(cp.x*w).toFixed(2)} ${(cp.y*h).toFixed(2)}`;
    }
    // Build bezier closing segment for both open and closed curves
    // For closed: _normalizeCurvePoints adds cp1/cp2 to all points so handles exist
    // For open: mirror the existing endpoint handles
    function _makeBezierClose(cpts, w, h) {
      const last = cpts[cpts.length - 1], first = cpts[0];
      // Outgoing from last: use cp2 if exists (closed curve), else mirror cp1
      const fc1x = last.cp2x != null ? last.cp2x : (last.cp1x != null ? last.x*2-last.cp1x : last.x+(first.x-last.x)*0.33);
      const fc1y = last.cp2y != null ? last.cp2y : (last.cp1y != null ? last.y*2-last.cp1y : last.y+(first.y-last.y)*0.33);
      // Arriving at first: use cp1 if exists (closed curve), else mirror cp2
      const fc2x = first.cp1x != null ? first.cp1x : (first.cp2x != null ? first.x*2-first.cp2x : first.x+(last.x-first.x)*0.33);
      const fc2y = first.cp1y != null ? first.cp1y : (first.cp2y != null ? first.y*2-first.cp2y : first.y+(last.y-first.y)*0.33);
      return ` C ${(fc1x*w).toFixed(2)} ${(fc1y*h).toFixed(2)} ${(fc2x*w).toFixed(2)} ${(fc2y*h).toFixed(2)} ${(first.x*w).toFixed(2)} ${(first.y*h).toFixed(2)} Z`;
    }
    // _cd: stroke path — open curves have open path, closed curves get bezier close
    if (d.curveClosed) _cd += _makeBezierClose(cpts, w, h);
    // _cdClosed: fill path — always bezier closed
    const _cdClosed = _cd.endsWith(' Z') ? _cd : (_cd + _makeBezierClose(cpts, w, h));

    if (hasNSw && effectiveSw > 0 && typeof _expVarStroke === 'function') {
      // Use effectiveSw (max across nodes) as default so stroke renders even when d.sw=0
      const varStrokeSvg = _expVarStroke(cpts, w, h, !!d.curveClosed, effectiveSw, strokeColor, shadow);
      const _gradDefsStr = _gradDef ? `<defs>${_gradDef}</defs>` : '';
      if (hasFill) {
        // Fill: always use simple bezier path — reliable regardless of per-node sw
        const fillPath = `<path d="${_cdClosed}" ${fAttr} stroke="none" ${extra}/>`;
        return _gradDefsStr + fillPath + varStrokeSvg;
      }
      return _gradDefsStr + varStrokeSvg;
    }
    // Uniform width — fill closed, stroke open
    if (hasFill && sw > 0) {
      return `<path d="${_cdClosed}" ${fAttr} stroke="none" ${extra} ${shadow}/>`
           + `<path d="${_cd}" fill="none" ${sAttr} ${extra} ${shadow} stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    if (hasFill) return `<path d="${_cdClosed}" ${fAttr} stroke="none" ${extra} ${shadow}/>`;
    return `<path d="${_cd}" fill="none" ${sAttr} ${extra} ${shadow} stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (sh.special === 'star') {
      const nRays = Math.max(4, Math.min(32, +(d.starRays||5)));
      const innerR = Math.max(0.1, Math.min(0.9, +(d.starInner!=null?d.starInner:0.45)));
      const sp = _starPath(w/2, h/2, ew/2, eh/2, nRays, innerR, d.rx||0);
      return `<path d="${sp}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    }
    if (sh.special === 'trapezoid') {
      const tTop2 = d.trapTop != null ? +d.trapTop : 0.15;
      const tBot2 = d.trapBot != null ? +d.trapBot : 0.0;
      return _trapPath(m, m, ew, eh, tTop2, tBot2, 0);
    }
    if (sh.special === 'moon') {
      // For path string, return outer ellipse (moon SVG uses clipPath, not a simple path)
      return `M ${(w/2+ew/2).toFixed(2)},${(h/2).toFixed(2)} A ${(ew/2).toFixed(2)} ${(eh/2).toFixed(2)} 0 1 0 ${(w/2-ew/2).toFixed(2)},${(h/2).toFixed(2)} A ${(ew/2).toFixed(2)} ${(eh/2).toFixed(2)} 0 1 0 ${(w/2+ew/2).toFixed(2)},${(h/2).toFixed(2)} Z`;
    }
    if (sh.special === 'gear') {
      const nTeeth2 = Math.max(3, Math.min(60, +(d.gearTeeth||12)));
      const toothD2 = Math.max(0.05, Math.min(0.6, +(d.gearDepth!=null?d.gearDepth:0.25)));
      return _gearPath(w/2, h/2, ew/2, eh/2, nTeeth2, toothD2);
    }
    if (sh.special === 'star') {
      const nRays2 = Math.max(4, Math.min(32, +(d.starRays||5)));
      const innerR2 = Math.max(0.1, Math.min(0.9, +(d.starInner!=null?d.starInner:0.45)));
      return _starPath(w/2, h/2, ew/2, eh/2, nRays2, innerR2, 0);
    }
    if (sh.special === 'star') {
    const nRays3 = Math.max(4, Math.min(32, +(d.starRays||5)));
    const innerR3 = Math.max(0.1, Math.min(0.9, +(d.starInner!=null?d.starInner:0.45)));
    const pts3 = [];
    for (let i = 0; i < nRays3 * 2; i++) {
      const angle = (i / (nRays3 * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 1 : innerR3;
      pts3.push(`${(w/2 + w/2*r*Math.cos(angle)).toFixed(1)}px ${(h/2 + h/2*r*Math.sin(angle)).toFixed(1)}px`);
    }
    return `polygon(${pts3.join(', ')})`;
  }
  if (sh.special === 'polygon') {
      const _sides = Math.max(3, Math.min(16, +(d.polySides||3)));
      const _pcx=w/2, _pcy=h/2, _prx=ew/2, _pry=eh/2;
      const _pts=[];
      for(let _i=0;_i<_sides;_i++){
        const _a=(_i/_sides*Math.PI*2)-(Math.PI/2);
        _pts.push(`${(_pcx+_prx*Math.cos(_a)).toFixed(2)},${(_pcy+_pry*Math.sin(_a)).toFixed(2)}`);
      }
      const _pp = _pts.join(' ');
      let _polyPath = `M ${_pp} Z`;
      if((d.rx||0)>0){
        const _polyPts=_pts.map(p=>{const[x,y]=p.split(',');return{x:+x,y:+y};});
        _polyPath=_roundedPolygonPath(_polyPts,d.rx);
      }
      return `<path d="${_polyPath}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    }
    if (sh.special === 'ellipse') {
      const a1 = d.arcStart != null ? +d.arcStart : 0;
      const a2 = d.arcEnd   != null ? +d.arcEnd   : 360;
      const mode = d.arcMode || 'full';
      if (mode === 'full' || Math.abs(a2 - a1) >= 360) {
        return `<ellipse cx="${w/2}" cy="${h/2}" rx="${ew/2}" ry="${eh/2}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
      }
      return `<path d="${_arcPath(w/2,h/2,w/2,h/2,a1,a2,mode,m,d.rx||0)}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    }
    if (sh.special === 'chevron') {
      const _csk = Math.max(0, Math.min(45, d.chevSkew  != null ? +d.chevSkew  : 25));
      const _cin = Math.max(0, Math.min(45, d.chevInner != null ? +d.chevInner : _csk));
      const _tip = Math.round(ew * _csk / 100);
      const _ind = Math.round(ew * _cin / 100);
      const _mid = m + Math.round(eh / 2);
      const _isL = sh.id === 'chevronLeft';
      const _pts = _isL
        ? [{x:m+ew,y:m},{x:m+_tip,y:m},{x:m,y:_mid},{x:m+_tip,y:m+eh},{x:m+ew,y:m+eh},{x:m+ew-_ind,y:_mid}]
        : [{x:m,y:m},{x:m+ew-_tip,y:m},{x:m+ew,y:_mid},{x:m+ew-_tip,y:m+eh},{x:m,y:m+eh},{x:m+_ind,y:_mid}];
      let _cp = 'M ' + _pts.map(p=>`${p.x} ${p.y}`).join(' L ') + ' Z';
      if ((d.rx||0)>0 && typeof _roundedPolygonPath==='function') _cp = _roundedPolygonPath(_pts, d.rx);
      return `<path d="${_cp}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
    }
    if (sh.special === 'callout') return null;
    if (!sh.path) return null; // no path defined (e.g. parametric shapes)
    // Scale path points and apply corner rounding
    const sx = ew/90, sy = eh/90;
    const rawPath = sh.path.replace(/(-?\d+(?:\.\d+)?)/g, (_, v, off, str) => {
      const nums = (str.slice(0, off).match(/(-?\d+(?:\.\d+)?)/g)||[]).length;
      return nums % 2 === 0
        ? String(Math.round((+v - 5) * sx + m))
        : String(Math.round((+v - 5) * sy + m));
    });
    let sp = rawPath;
    if (rx > 0) {
      if (/[QqCc]/.test(rawPath)) {
        sp = _roundedMixedPath(rawPath, rx);
      } else {
        const polyPts = _extractPolygonPts(rawPath);
        if (polyPts.length >= 3) sp = _roundedPolygonPath(polyPts, rx);
      }
    }
    return `<path d="${sp}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
  }

  // Returns path data string for shape at margin m (for wave sampling & clipPath)
  function shapePathStr(m) {
    const ew = Math.max(1, w - m*2), eh = Math.max(1, h - m*2);
    if (sh.special === 'polygon') {
      const _sides2 = Math.max(3, Math.min(16, +(d.polySides||3)));
      const _pcx2=w/2, _pcy2=h/2, _prx2=ew/2, _pry2=eh/2;
      const _pts2=[];
      for(let _i=0;_i<_sides2;_i++){
        const _a=(_i/_sides2*Math.PI*2)-(Math.PI/2);
        _pts2.push(`${(_pcx2+_prx2*Math.cos(_a)).toFixed(2)},${(_pcy2+_pry2*Math.sin(_a)).toFixed(2)}`);
      }
      return `M ${_pts2.join(' ')} Z`;
    }
    if (sh.special === 'rect') {
      const rxR = d.rx || 0;
      if (rxR > 0)
        return `M ${m+rxR} ${m} H ${m+ew-rxR} Q ${m+ew} ${m} ${m+ew} ${m+rxR} V ${m+eh-rxR} Q ${m+ew} ${m+eh} ${m+ew-rxR} ${m+eh} H ${m+rxR} Q ${m} ${m+eh} ${m} ${m+eh-rxR} V ${m+rxR} Q ${m} ${m} ${m+rxR} ${m} Z`;
      return `M ${m} ${m} H ${m+ew} V ${m+eh} H ${m} Z`;
    }
    if (sh.special === 'ellipse') {
      const cx = w/2, cy = h/2, erx = ew/2, ery = eh/2;
      const a1p = d.arcStart != null ? +d.arcStart : 0;
      const a2p = d.arcEnd   != null ? +d.arcEnd   : 360;
      const modeP = d.arcMode || 'full';
      if (modeP !== 'full' && Math.abs(a2p - a1p) < 360)
        return _arcPath(cx, cy, w/2, h/2, a1p, a2p, modeP, m, d.rx||0);
      return `M ${cx-erx} ${cy} A ${erx} ${ery} 0 1 1 ${cx+erx} ${cy} A ${erx} ${ery} 0 1 1 ${cx-erx} ${cy} Z`;
    }
    if (sh.special === 'cloud') {
      return _cloudBlobsPath(_cloudResolveCircles(d, w, h), 0);
    }
    if (sh.special === 'parallelogram') {
      const _skewP = Math.max(-45, Math.min(45, +(d.paraSkew!=null?d.paraSkew:20)));
      const _offP = Math.round((eh/2) * Math.tan(_skewP*Math.PI/180));
      return `M ${_offP} 0 L ${ew} 0 L ${ew-_offP} ${eh} L 0 ${eh} Z`;
    }
    if (sh.special === 'callout') return null;
    if (!sh.path) return null; // no path defined
    const sx = ew/90, sy = eh/90;
    const rawPath = sh.path.replace(/(-?\d+(?:\.\d+)?)/g, (_, v, off, str) => {
      const nums = (str.slice(0, off).match(/(-?\d+(?:\.\d+)?)/g)||[]).length;
      return nums % 2 === 0
        ? String(Math.round((+v - 5) * sx + m))
        : String(Math.round((+v - 5) * sy + m));
    });
    if (rx > 0) {
      // If path has curves (Q/C), preserve them and only round L corners
      if (/[QqCc]/.test(rawPath)) return _roundedMixedPath(rawPath, rx);
      const polyPts = _extractPolygonPts(rawPath);
      if (polyPts.length >= 3) return _roundedPolygonPath(polyPts, rx);
    }
    return rawPath;
  }

  let shapeDef = '';
  let defBlock = '';

  // Corner radius for non-rect/ellipse shapes via offset path algorithm.
  // Rounds polygon corners by cutting each vertex and inserting a circular arc.
  const rx = d.rx || 0;

  if (sh.special === 'callout') {
    const sAttr = sw > 0
      ? `stroke="${strokeColor}" stroke-width="${sw}" ${_getStrokeDasharray(strokeStyle, sw)}`
      : 'stroke="none"';
    shapeDef = _buildCalloutSVGPath(d, w, h, sh, fillAttr, sAttr, shadow, margin);

  } else if (isComplex && sw > 0) {
    // Fill: clipped to shape boundary (margin = sw/2 so fill edge aligns with stroke centre)
    const fillM = sw / 2;
    let filled = '';
    if (hasFill) {
      const clipId = `scp_${d.id}`;
      const clipEl = shapeEl('fill="white"', 'stroke="none"', fillM);
      if (clipEl) {
        defBlock += `<clipPath id="${clipId}">${clipEl}</clipPath>`;
        filled = shapeEl(fillAttr, 'stroke="none"', fillM, `clip-path="url(#${clipId})"`) || '';
      } else {
        filled = shapeEl(fillAttr, 'stroke="none"', fillM) || '';
      }
    }

    // Wave/zigzag stroke path sampled along shape at margin=0 (stroke centre on shape edge)
    const pathStr = shapePathStr(0);
    let wavePath = pathStr ? _complexPathWave(pathStr, strokeStyle, sw, _noFill) : null;
    const strokeEl = wavePath
      ? `<path d="${wavePath}" fill="none" stroke="${strokeColor}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
      : shapeEl('fill="none"', `stroke="${strokeColor}" stroke-width="${sw}"`, 0);

    shapeDef = (filled || '') + (strokeEl || '');

  } else if (isDouble && sw > 0) {
    if (_noFill) {
      // For noFill shapes (line/wave): two parallel strokes offset by gap
      const gap = sw * 3;
      const pathStr0 = shapePathStr(0);
      if (pathStr0) {
        const line1 = `<path d="${pathStr0}" fill="none" stroke="${strokeColor}" stroke-width="${sw}" stroke-linecap="round" transform="translate(0,${-gap/2})"/>`;
        const line2 = `<path d="${pathStr0}" fill="none" stroke="${strokeColor}" stroke-width="${sw}" stroke-linecap="round" transform="translate(0,${gap/2})"/>`;
        shapeDef = line1 + line2;
      } else {
        shapeDef = shapeEl('fill="none"', `stroke="${strokeColor}" stroke-width="${sw}"`, 0) || '';
      }
    } else {
      const outer = shapeEl(fillAttr, `stroke="${strokeColor}" stroke-width="${sw * 3}"`, sw * 0.5);
      const inner = shapeEl('fill="none"', `stroke="${fill}" stroke-width="${sw * 1.4}"`, sw * 0.5);
      shapeDef = (outer || '') + (inner || '');
    }

  } else {
    if (sw > 0) {
      const perim = _shapePerimeter(sh, w, h, margin);
      const evenD = (strokeStyle === 'dotted' || strokeStyle === 'dashed')
        ? _evenDash(strokeStyle, sw, perim) : null;
      const sAttr = evenD
        ? `stroke="${strokeColor}" stroke-width="${sw}" stroke-dasharray="${evenD.dasharray}" ${evenD.extraAttrs}`
        : `stroke="${strokeColor}" stroke-width="${sw}" ${_getStrokeDasharray(strokeStyle, sw)}`;
      shapeDef = shapeEl(fillAttr, sAttr, margin) || '';
    } else {
      shapeDef = shapeEl(fillAttr, 'stroke="none"', margin) || '';
    }
  }

  let filterDef = '';
  let shadowPad = 0;
  if (_gradDef) filterDef += _gradDef;
  if (d.shadow) {
    const sc = d.shadowColor || '#000000';
    const sb = d.shadowBlur != null ? +d.shadowBlur : 4;
    const ss = d.shadowSize != null ? +d.shadowSize : 3;
    shadowPad = typeof window._shadowPad === 'function' ? window._shadowPad(ss, sb, sw) : Math.ceil(ss + sb * 3.5 + sw + 20);
    if (typeof window._shadowFilterDefUser === 'function') {
      filterDef += window._shadowFilterDefUser('sh_' + d.id, ss, sb, sc, w, h, sw);
    } else {
      const obbPct = typeof window._shadowFilterObbPct === 'function'
        ? window._shadowFilterObbPct(ss, sb, sw, w, h, 'y') : 80;
      const inner = typeof window._shadowFilterInner === 'function'
        ? window._shadowFilterInner(ss, sb, sc)
        : `<feDropShadow dx="0" dy="0" stdDeviation="${sb}" flood-color="${sc}" flood-opacity="0.65"/>`;
      filterDef += `<filter id="sh_${d.id}" filterUnits="objectBoundingBox" x="-${obbPct}%" y="-${obbPct}%" width="${100 + obbPct * 2}%" height="${100 + obbPct * 2}%">${inner}</filter>`;
    }
  }
  const defsContent = (filterDef || '') + (defBlock || '');
  const defs = defsContent ? `<defs>${defsContent}</defs>` : '';
  const vbW = w + shadowPad * 2, vbH = h + shadowPad * 2;
  const svgStyle = shadowPad
    ? 'overflow:visible;position:absolute;left:0;top:0;width:100%;height:100%'
    : 'overflow:visible;width:100%;height:100%';
  const svgViewBox = shadowPad ? `${-shadowPad} ${-shadowPad} ${vbW} ${vbH}` : `0 0 ${w} ${h}`;
  const svgSize = shadowPad ? `width="${vbW}" height="${vbH}"` : `width="${w}" height="${h}"`;
  // For noFill (line/wave) the bounding-box div hit area handles clicks
  return `<svg xmlns="http://www.w3.org/2000/svg" ${svgSize} viewBox="${svgViewBox}" style="${svgStyle}">${defs}${shapeDef}</svg>`;
}


// Returns CSS clip-path string matching the shape, for use with backdrop-filter
function _shapeClipPath(d, w, h) {
  const sh = SHAPES.find(s => s.id === d.shape) || SHAPES[0];
  const sw = d.sw === undefined ? 2 : +d.sw;
  const m = sw > 0 ? sw : 0;
  if (sh.special === 'rect')    return `inset(${m}px)`;
  if (sh.special === 'ellipse') {
    const mode2 = d.arcMode || 'full';
    if (mode2 === 'full') return `ellipse(${(w-m*2)/2}px ${(h-m*2)/2}px at 50% 50%)`;
    // For sector/chord: build polygon approximating the arc shape
    const a1c = d.arcStart != null ? +d.arcStart : 0;
    const a2c = d.arcEnd   != null ? +d.arcEnd   : 360;
    const rx2 = (w-m*2)/2, ry2 = (h-m*2)/2;
    const cx2 = w/2, cy2 = h/2;
    const pts = [];
    if (mode2 === 'sector') pts.push(`${cx2}px ${cy2}px`);
    // Arc points
    const diff2 = ((a2c - a1c) % 360 + 360) % 360 || 360;
    const steps = Math.max(12, Math.ceil(diff2 / 5));
    for (let i = 0; i <= steps; i++) {
      const ang = (a1c + diff2 * i / steps - 90) * Math.PI / 180;
      const px = cx2 + rx2 * Math.cos(ang);
      const py = cy2 + ry2 * Math.sin(ang);
      pts.push(`${px.toFixed(1)}px ${py.toFixed(1)}px`);
    }
    if (mode2 === 'sector') pts.push(`${cx2}px ${cy2}px`);
    return `polygon(${pts.join(', ')})`;
  }
  if (sh.special === 'callout') return 'none'; // callout uses full bounding box (tail extends outside)
  if (sh.special === 'curve' && d.curvePoints && d.curvePoints.length >= 2) {
    const cpts = d.curvePoints;
    const sw2 = (d.sw != null ? +d.sw : 2);
    // Build bezier path for clip
    let pd = `M ${(cpts[0].x*w).toFixed(1)} ${(cpts[0].y*h).toFixed(1)}`;
    for (let ci = 1; ci < cpts.length; ci++) {
      const pp = cpts[ci-1], cp = cpts[ci];
      const c1x = pp.cp2x != null ? pp.cp2x : pp.x, c1y = pp.cp2y != null ? pp.cp2y : pp.y;
      const c2x = cp.cp1x != null ? cp.cp1x : cp.x, c2y = cp.cp1y != null ? cp.cp1y : cp.y;
      pd += ` C ${(c1x*w).toFixed(1)} ${(c1y*h).toFixed(1)} ${(c2x*w).toFixed(1)} ${(c2y*h).toFixed(1)} ${(cp.x*w).toFixed(1)} ${(cp.y*h).toFixed(1)}`;
    }
    // Close with bezier using handles (same logic as fill)
    const _clipLast = cpts[cpts.length-1], _clipFirst = cpts[0];
    const _cfc1x = _clipLast.cp2x != null ? _clipLast.cp2x : (_clipLast.cp1x != null ? _clipLast.x*2-_clipLast.cp1x : _clipLast.x+(_clipFirst.x-_clipLast.x)*0.33);
    const _cfc1y = _clipLast.cp2y != null ? _clipLast.cp2y : (_clipLast.cp1y != null ? _clipLast.y*2-_clipLast.cp1y : _clipLast.y+(_clipFirst.y-_clipLast.y)*0.33);
    const _cfc2x = _clipFirst.cp1x != null ? _clipFirst.cp1x : (_clipFirst.cp2x != null ? _clipFirst.x*2-_clipFirst.cp2x : _clipFirst.x+(_clipLast.x-_clipFirst.x)*0.33);
    const _cfc2y = _clipFirst.cp1y != null ? _clipFirst.cp1y : (_clipFirst.cp2y != null ? _clipFirst.y*2-_clipFirst.cp2y : _clipFirst.y+(_clipLast.y-_clipFirst.y)*0.33);
    pd += ` C ${(_cfc1x*w).toFixed(1)} ${(_cfc1y*h).toFixed(1)} ${(_cfc2x*w).toFixed(1)} ${(_cfc2y*h).toFixed(1)} ${(_clipFirst.x*w).toFixed(1)} ${(_clipFirst.y*h).toFixed(1)} Z`;
    return `path('${pd}')`;
  }
  if (sh.special === 'trapezoid') {
    const _tTop = d.trapTop != null ? +d.trapTop : 0.15;
    const _tBot = d.trapBot != null ? +d.trapBot : 0.0;
    return `path('${_trapPath(m, m, w-m*2, h-m*2, _tTop, _tBot, 0)}')`;
  }
  if (sh.special === 'noSymbol') {
    const _sw=d&&d.sw!=null?+d.sw:2;
    const _cr=Math.min(w,h)/2-_sw/2,_ir=_cr-Math.max(3,Math.round(_cr*0.28));
    const _hw=Math.max(3,Math.round(_cr*0.28))/2,_s2=Math.SQRT1_2;
    const f2=v=>v.toFixed(2),_ccx=w/2,_ccy=h/2;
    const _tIn=Math.sqrt(Math.max(0,_ir*_ir-_hw*_hw));
    const _R1x=_ccx+_tIn*_s2-_hw*_s2,_R1y=_ccy-_tIn*_s2-_hw*_s2;
    const _R2x=_ccx-_tIn*_s2-_hw*_s2,_R2y=_ccy+_tIn*_s2-_hw*_s2;
    const _L1x=_ccx+_tIn*_s2+_hw*_s2,_L1y=_ccy-_tIn*_s2+_hw*_s2;
    const _L2x=_ccx-_tIn*_s2+_hw*_s2,_L2y=_ccy+_tIn*_s2+_hw*_s2;
    const _o=`M ${f2(_ccx+_cr)},${f2(_ccy)} A ${f2(_cr)} ${f2(_cr)} 0 1 0 ${f2(_ccx-_cr)},${f2(_ccy)} A ${f2(_cr)} ${f2(_cr)} 0 1 0 ${f2(_ccx+_cr)},${f2(_ccy)} Z`;
    const _h1=`M ${f2(_ccx)},${f2(_ccy-_ir)} A ${f2(_ir)} ${f2(_ir)} 0 0 1 ${f2(_R1x)},${f2(_R1y)} L ${f2(_R2x)},${f2(_R2y)} A ${f2(_ir)} ${f2(_ir)} 0 0 1 ${f2(_ccx-_ir)},${f2(_ccy)} A ${f2(_ir)} ${f2(_ir)} 0 0 1 ${f2(_ccx)},${f2(_ccy-_ir)} Z`;
    const _h2=`M ${f2(_L1x)},${f2(_L1y)} A ${f2(_ir)} ${f2(_ir)} 0 0 1 ${f2(_ccx+_ir)},${f2(_ccy)} A ${f2(_ir)} ${f2(_ir)} 0 0 1 ${f2(_ccx)},${f2(_ccy+_ir)} A ${f2(_ir)} ${f2(_ir)} 0 0 1 ${f2(_L2x)},${f2(_L2y)} L ${f2(_L1x)},${f2(_L1y)} Z`;
    return `path('${_o} ${_h1} ${_h2}')`;
  }
  if (sh.special === 'moon') {
    const _mPhase = d.moonPhase != null ? +d.moonPhase : -0.5;
    return _moonClipPath(w/2, h/2, (w-m*2)/2, (h-m*2)/2, _mPhase);
  }
  if (sh.special === 'gear') {
    const _gTeeth = Math.max(3, Math.min(60, +(d.gearTeeth||12)));
    const _gDepth = Math.max(0.05, Math.min(0.6, +(d.gearDepth!=null?d.gearDepth:0.25)));
    const _gp = _gearPath(w/2, h/2, (w-m*2)/2, (h-m*2)/2, _gTeeth, _gDepth);
    return `path('${_gp}')`;
  }
  // Polygon shapes — scale path points from 0-100 space to actual px
  if (sh.path) {
    const ew = Math.max(1, w - m * 2), eh = Math.max(1, h - m * 2);
    const sx = ew / 90, sy = eh / 90;
    // Extract polygon points from path (works for simple M/L/Z paths)
    const pts = [];
    const re = /[ML]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/g;
    let match;
    while ((match = re.exec(sh.path)) !== null) {
      const px = Math.round((+match[1] - 5) * sx + m);
      const py = Math.round((+match[2] - 5) * sy + m);
      pts.push(`${px}px ${py}px`);
    }
    if (pts.length >= 3) return `polygon(${pts.join(', ')})`;
  }
  return 'none';
}

// Applies or removes backdrop-filter blur overlay matching shape clip-path
function _applyShapeBlur(el) {
  // Remove existing blur overlay
  const old = el.querySelector('.shape-blur-overlay');
  if (old) old.remove();
  // Clear any direct backdrop-filter on el
  el.style.backdropFilter = '';
  el.style.webkitBackdropFilter = '';

  const blur = parseFloat(el.dataset.shapeBlur || 0);
  if (blur <= 0) return;

  const d = sel && sel === el
    ? (slides[cur] && slides[cur].els.find(x => x.id === el.dataset.id))
    : (slides[cur] && slides[cur].els.find(x => x.id === el.dataset.id));
  if (!d) return;

  const w = parseInt(el.style.width) || d.w;
  const h = parseInt(el.style.height) || d.h;
  const cp = _shapeClipPath(d, w, h);

  const overlay = document.createElement('div');
  overlay.className = 'shape-blur-overlay';
  overlay.style.cssText = (
    'position:absolute;inset:0;pointer-events:none;z-index:0;' +
    `backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);` +
    (cp !== 'none' ? `clip-path:${cp};-webkit-clip-path:${cp};` : '')
  );
  el.insertBefore(overlay, el.firstChild);
}

// Apply hit-area overlay with clip-path so clicks outside shape pass through
function _applyShapeClipPath(el, d) {
  // Remove old hit overlay
  const old = el.querySelector('.shape-hit-area');
  if (old) old.remove();
  // Clear any direct clip-path on el (visual content must not be clipped)
  el.style.clipPath = '';
  el.style.webkitClipPath = '';

  const w = parseInt(el.style.width) || d.w;
  const h = parseInt(el.style.height) || d.h;

  // noFill shapes (line, wave): use full bounding-box hit area — no clip-path
  const sh = typeof SHAPES !== 'undefined' ? SHAPES.find(s => s.id === d.shape) : null;
  if (sh && sh.noFill) {
    const hit = document.createElement('div');
    hit.className = 'shape-hit-area';
    hit.style.cssText = 'position:absolute;inset:0;z-index:10;pointer-events:auto;cursor:move;background:transparent;';
    el.appendChild(hit);
    return;
  }
  // Curve: transparent hit overlay covering stroke + fill area
  if (sh && sh.special === 'curve') {
    const d2 = slides[cur] && slides[cur].els.find(x => x.id === el.dataset.id);
    if (d2 && d2.curvePoints) {
      // Build an SVG hit area using the stroke path with wide transparent stroke
      const hitSw = Math.max(20, (d2.sw || 2) + 16);
      const cpts2 = d2.curvePoints;
      let hitPath = `M ${(cpts2[0].x*w).toFixed(1)} ${(cpts2[0].y*h).toFixed(1)}`;
      for (let ci = 1; ci < cpts2.length; ci++) {
        const pp = cpts2[ci-1], cp = cpts2[ci];
        const c1x = pp.cp2x != null ? pp.cp2x : pp.x, c1y = pp.cp2y != null ? pp.cp2y : pp.y;
        const c2x = cp.cp1x != null ? cp.cp1x : cp.x, c2y = cp.cp1y != null ? cp.cp1y : cp.y;
        hitPath += ` C ${(c1x*w).toFixed(1)} ${(c1y*h).toFixed(1)} ${(c2x*w).toFixed(1)} ${(c2y*h).toFixed(1)} ${(cp.x*w).toFixed(1)} ${(cp.y*h).toFixed(1)}`;
      }
      // Also close for fill area
      const last2 = cpts2[cpts2.length-1], first2 = cpts2[0];
      const fc1x = last2.cp2x != null ? last2.cp2x : (last2.cp1x != null ? last2.x*2-last2.cp1x : last2.x+(first2.x-last2.x)*0.33);
      const fc1y = last2.cp2y != null ? last2.cp2y : (last2.cp1y != null ? last2.y*2-last2.cp1y : last2.y+(first2.y-last2.y)*0.33);
      const fc2x = first2.cp1x != null ? first2.cp1x : (first2.cp2x != null ? first2.x*2-first2.cp2x : first2.x+(last2.x-first2.x)*0.33);
      const fc2y = first2.cp1y != null ? first2.cp1y : (first2.cp2y != null ? first2.y*2-first2.cp2y : first2.y+(last2.y-first2.y)*0.33);
      const closedPath = hitPath + ` C ${(fc1x*w).toFixed(1)} ${(fc1y*h).toFixed(1)} ${(fc2x*w).toFixed(1)} ${(fc2y*h).toFixed(1)} ${(first2.x*w).toFixed(1)} ${(first2.y*h).toFixed(1)} Z`;
      const svgHit = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgHit.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;overflow:visible;pointer-events:none;z-index:10;cursor:move;`;
      svgHit.setAttribute('viewBox', `0 0 ${w} ${h}`);
      // Stroke path for hit testing (wide transparent stroke)
      const hitStrokePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hitStrokePath.setAttribute('d', hitPath);
      hitStrokePath.setAttribute('fill', 'none');
      hitStrokePath.setAttribute('stroke', 'transparent');
      hitStrokePath.setAttribute('stroke-width', hitSw);
      hitStrokePath.style.pointerEvents = 'stroke';
      hitStrokePath.style.cursor = 'move';
      // Fill path for hit testing
      const hitFillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hitFillPath.setAttribute('d', closedPath);
      hitFillPath.setAttribute('fill', 'transparent');
      hitFillPath.setAttribute('stroke', 'none');
      hitFillPath.style.pointerEvents = 'fill';
      hitFillPath.style.cursor = 'move';
      svgHit.appendChild(hitStrokePath);
      svgHit.appendChild(hitFillPath);
      svgHit.classList.add('shape-hit-area');
      el.appendChild(svgHit);
    }
    el.style.pointerEvents = 'none';
    return;
  }
  // Cloud: el passes through clicks, SVG paths handle hit testing via visibleFill
  if (sh && sh.special === 'cloud') {
    el.style.pointerEvents = 'none';
    const selEl = el.querySelector('.sel-el');
    if (selEl) selEl.style.pointerEvents = 'none';
    const svgDiv = el.querySelector('.shape-svg');
    if (svgDiv) svgDiv.style.pointerEvents = 'none';
    const svgEl = el.querySelector('svg');
    if (svgEl) {
      svgEl.style.pointerEvents = 'none';
      const paths = svgEl.querySelectorAll('path');
      paths.forEach(p => { p.style.pointerEvents = 'visibleFill'; p.style.cursor = 'move'; });
    }
    return;
  }

  const cp = _shapeClipPath(d, w, h);
  if (cp === 'none') return;

  // Transparent div covering el with clip-path — captures pointer events only within shape
  const hit = document.createElement('div');
  hit.className = 'shape-hit-area';
  hit.style.cssText = (
    'position:absolute;inset:0;z-index:10;pointer-events:auto;cursor:move;' +
    'clip-path:' + cp + ';-webkit-clip-path:' + cp + ';' +
    'background:transparent;'
  );
  el.appendChild(hit);
  // Outside hit area — pass through to elements below
  el.style.pointerEvents = 'none';
}
// Arc path helper: cx,cy=center, rx,ry=radii, a1/a2=degrees (0=top, CW), mode=sector|chord
function _arcPath(cx, cy, rx, ry, a1, a2, mode, m, cornerR) {
  const erx = Math.max(1, rx - m), ery = Math.max(1, ry - m);
  const cr  = Math.max(0, cornerR || 0);
  const toRad = a => (a - 90) * Math.PI / 180;
  const r1 = toRad(a1), r2 = toRad(a2);
  const x1 = cx + erx*Math.cos(r1), y1 = cy + ery*Math.sin(r1);
  const x2 = cx + erx*Math.cos(r2), y2 = cy + ery*Math.sin(r2);
  const diff = ((a2 - a1) % 360 + 360) % 360;
  const large = diff > 180 ? 1 : 0;

  if (cr <= 0) {
    if (mode === 'sector')
      return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${erx} ${ery} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${erx} ${ery} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  }

  function unit(ax,ay,bx,by){const l=Math.hypot(bx-ax,by-ay)||1;return[(bx-ax)/l,(by-ay)/l];}
  function cwTan(rad){const tx=-erx*Math.sin(rad),ty=ery*Math.cos(rad);const l=Math.hypot(tx,ty)||1;return[tx/l,ty/l];}

  // Round a straight corner (no arc involved)
  function rcStraight(vx,vy,u1x,u1y,max1,u2x,u2y,max2){
    const r=Math.min(cr,max1,max2); if(r<0.5) return null;
    const p1x=vx+u1x*r,p1y=vy+u1y*r,p2x=vx+u2x*r,p2y=vy+u2y*r;
    const cosA=Math.max(-1,Math.min(1,u1x*u2x+u1y*u2y));
    const k=Math.max((4/3)*Math.tan(Math.acos(cosA)/4),0.55);
    return{p1x,p1y,cp1x:p1x-u1x*r*k,cp1y:p1y-u1y*r*k,
           p2x,p2y,cp2x:p2x-u2x*r*k,cp2y:p2y-u2y*r*k};
  }

  // How many degrees to offset arc endpoints for rounding
  // Limit to at most 35% of total arc so the shape stays recognisable
  const avgR = (erx + ery) / 2;
  const angStep = Math.min(cr / (avgR * Math.PI / 180), diff * 0.35);

  // Arc anchor points (on ellipse, offset from endpoints by angStep)
  const a1off = a1 + angStep, a2off = a2 - angStep;
  const ra1 = toRad(a1off), ra2 = toRad(a2off);
  const ax1 = cx + erx*Math.cos(ra1), ay1 = cy + ery*Math.sin(ra1);
  const ax2 = cx + erx*Math.cos(ra2), ay2 = cy + ery*Math.sin(ra2);
  const diffNew = ((a2off - a1off) % 360 + 360) % 360;
  const largeNew = diffNew > 180 ? 1 : 0;

  // Bezier transition from straight line into arc:
  // lineAnchor = point on straight line, distance r from arcEndpoint
  // arcAnchor  = point on ellipse angStep into arc
  // cp1: near lineAnchor, pulled along line toward arcEndpoint
  // cp2: near arcAnchor,  pulled along REVERSE arc tangent (ensures tangent continuity)
  function arcEntry(arcEndX, arcEndY, arcEndRad, lineUx, lineUy, arcAnchorX, arcAnchorY, arcAnchorRad) {
    const r = Math.min(cr, Math.hypot(arcEndX-cx, arcEndY-cy) * 0.45);
    const lax = arcEndX + lineUx*r, lay = arcEndY + lineUy*r;
    const cp1x = lax - lineUx*r*0.55, cp1y = lay - lineUy*r*0.55;
    // cp2: tangent-continuous arrival at arcAnchor
    const [tax,tay] = cwTan(arcAnchorRad);
    const chord = Math.hypot(arcAnchorX-arcEndX, arcAnchorY-arcEndY);
    const cp2x = arcAnchorX - tax*chord*0.45, cp2y = arcAnchorY - tay*chord*0.45;
    return {lax,lay,cp1x,cp1y,cp2x,cp2y};
  }

  // Exit from arc into straight line (reversed):
  function arcExit(arcEndX, arcEndY, arcEndRad, lineUx, lineUy, arcAnchorX, arcAnchorY, arcAnchorRad) {
    const r = Math.min(cr, Math.hypot(arcEndX-cx, arcEndY-cy) * 0.45);
    const lax = arcEndX + lineUx*r, lay = arcEndY + lineUy*r;
    const cp2x = lax - lineUx*r*0.55, cp2y = lay - lineUy*r*0.55;
    const [tax,tay] = cwTan(arcAnchorRad);
    const chord = Math.hypot(arcAnchorX-arcEndX, arcAnchorY-arcEndY);
    const cp1x = arcAnchorX + tax*chord*0.45, cp1y = arcAnchorY + tay*chord*0.45;
    return {lax,lay,cp1x,cp1y,cp2x,cp2y};
  }

  if (mode === 'sector') {
    const side = Math.hypot(x1-cx,y1-cy);
    const maxS = side * 0.45;

    // Entry at arc-start (x1,y1): line from cx, enters arc
    const [lu1x,lu1y] = unit(x1,y1,cx,cy);
    const eS = arcEntry(x1,y1,r1, lu1x,lu1y, ax1,ay1,ra1);

    // Exit at arc-end (x2,y2): arc exits to cx
    const [lu2x,lu2y] = unit(x2,y2,cx,cy);
    const eE = arcExit(x2,y2,r2, lu2x,lu2y, ax2,ay2,ra2);

    // Straight corner at center
    const [u5x,u5y]=unit(cx,cy,x2,y2);
    const [u6x,u6y]=unit(cx,cy,x1,y1);
    const cC = rcStraight(cx,cy, u5x,u5y,maxS, u6x,u6y,maxS);
    if (!cC) return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${erx} ${ery} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

    return `M ${cC.p2x.toFixed(2)} ${cC.p2y.toFixed(2)}`
      +` L ${eS.lax.toFixed(2)} ${eS.lay.toFixed(2)}`
      +` C ${eS.cp1x.toFixed(2)} ${eS.cp1y.toFixed(2)} ${eS.cp2x.toFixed(2)} ${eS.cp2y.toFixed(2)} ${ax1.toFixed(2)} ${ay1.toFixed(2)}`
      +` A ${erx} ${ery} 0 ${largeNew} 1 ${ax2.toFixed(2)} ${ay2.toFixed(2)}`
      +` C ${eE.cp1x.toFixed(2)} ${eE.cp1y.toFixed(2)} ${eE.cp2x.toFixed(2)} ${eE.cp2y.toFixed(2)} ${eE.lax.toFixed(2)} ${eE.lay.toFixed(2)}`
      +` L ${cC.p1x.toFixed(2)} ${cC.p1y.toFixed(2)}`
      +` C ${cC.cp1x.toFixed(2)} ${cC.cp1y.toFixed(2)} ${cC.cp2x.toFixed(2)} ${cC.cp2y.toFixed(2)} ${cC.p2x.toFixed(2)} ${cC.p2y.toFixed(2)} Z`;
  }

  // CHORD
  const chLen = Math.hypot(x2-x1,y2-y1);
  const maxR  = chLen * 0.45;
  const [chx,chy] = unit(x1,y1,x2,y2);

  const eS = arcEntry(x1,y1,r1,  chx, chy, ax1,ay1,ra1);
  const eE = arcExit (x2,y2,r2, -chx,-chy, ax2,ay2,ra2);

  return `M ${eS.lax.toFixed(2)} ${eS.lay.toFixed(2)}`
    +` C ${eS.cp1x.toFixed(2)} ${eS.cp1y.toFixed(2)} ${eS.cp2x.toFixed(2)} ${eS.cp2y.toFixed(2)} ${ax1.toFixed(2)} ${ay1.toFixed(2)}`
    +` A ${erx} ${ery} 0 ${largeNew} 1 ${ax2.toFixed(2)} ${ay2.toFixed(2)}`
    +` C ${eE.cp1x.toFixed(2)} ${eE.cp1y.toFixed(2)} ${eE.cp2x.toFixed(2)} ${eE.cp2y.toFixed(2)} ${eE.lax.toFixed(2)} ${eE.lay.toFixed(2)}`
    +` L ${eS.lax.toFixed(2)} ${eS.lay.toFixed(2)} Z`;
}




// Build moon SVG using clipPath: outer circle minus offset inner circle
// phase: 0=full circle, 0.5=half, 1=thin crescent right, -1=thin crescent left, wraps
// Returns an SVG string (not path), or path string for clip-path use

// Build trapezoid path from top-inset and bottom-inset parameters
// trapTop: inset from each side at top (0=full width, 0.5=triangle)
// trapBot: inset from each side at bottom
function _trapPath(x, y, w, h, trapTop, trapBot, rx) {
  const tl = Math.max(0, Math.min(w*0.49, trapTop * w));  // top-left x offset
  const tr = Math.max(0, Math.min(w*0.49, trapTop * w));  // top-right x offset  
  const bl = Math.max(0, Math.min(w*0.49, trapBot * w));
  const br = Math.max(0, Math.min(w*0.49, trapBot * w));
  const pts = [
    {x: x+tl,   y: y},
    {x: x+w-tr, y: y},
    {x: x+w-br, y: y+h},
    {x: x+bl,   y: y+h},
  ];
  if (rx > 0) return _roundedPolygonPath(pts, rx);
  return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y} L ${pts[2].x},${pts[2].y} L ${pts[3].x},${pts[3].y} Z`;
}
function _moonPath(cx, cy, rx, ry, phase, cornerR) {
  const p = Math.max(-1, Math.min(1, phase));
  const absP = Math.abs(p);

  const fe = `M ${(cx+rx).toFixed(2)},${cy.toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(cx-rx).toFixed(2)},${cy.toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(cx+rx).toFixed(2)},${cy.toFixed(2)} Z`;
  if (absP >= 0.98) return fe;

  const sign = p > 0 ? 1 : -1;
  const ix = cx + sign * absP * rx;
  const iyPart = 1 - absP * absP;
  if (iyPart <= 0) return fe;
  const iy = Math.sqrt(iyPart) * ry;
  if (iy < 0.5) return fe;

  const outerSweep = sign > 0 ? 0 : 1;
  const innerSweep = 1 - outerSweep;
  const f = v => v.toFixed(2);

  return `M ${f(ix)},${f(cy-iy)} A ${f(rx)} ${f(ry)} 0 1 ${outerSweep} ${f(ix)},${f(cy+iy)} A ${f(rx)} ${f(ry)} 0 0 ${innerSweep} ${f(ix)},${f(cy-iy)} Z`;
}

function _moonSVG(cx, cy, rx, ry, phase, cornerR, fAttr, sAttr, extra, shadow, uid) {
  const p = Math.max(-1, Math.min(1, phase));
  const moonPath = _moonPath(cx, cy, rx, ry, p, cornerR);
  return `<path d="${moonPath}" ${fAttr} ${sAttr} ${extra} ${shadow}/>`;
}

function _moonClipPath(cx, cy, rx, ry, phase) {
  const p = Math.max(-1, Math.min(1, phase));
  const moonPath = _moonPath(cx, cy, rx, ry, p, 0);
  return `path('${moonPath}')`;
}


// Build gear path: nTeeth teeth with straight radial sides and arc top/bottom
function _gearPath(cx, cy, erx, ery, nTeeth, toothDepth) {
  nTeeth = Math.max(3, Math.min(60, nTeeth));
  toothDepth = Math.max(0.05, Math.min(0.6, toothDepth));

  const outerRx = erx, outerRy = ery;
  const innerRx = erx * (1 - toothDepth);
  const innerRy = ery * (1 - toothDepth);

  const seg = Math.PI / nTeeth;
  const da = seg * 0.10; // rounding offset on tooth top corners

  let d = '';

  for (let i = 0; i < nTeeth; i++) {
    const base = i * 2 * seg - Math.PI / 2;
    const gS = base;           // gap start angle
    const gE = base + seg;     // gap end / tooth start angle
    const tE = base + 2 * seg; // tooth end angle

    // Points
    const igSx = cx + innerRx * Math.cos(gS),  igSy = cy + innerRy * Math.sin(gS);
    const igEx = cx + innerRx * Math.cos(gE),   igEy = cy + innerRy * Math.sin(gE);
    const ogLx = cx + outerRx * Math.cos(gE),   ogLy = cy + outerRy * Math.sin(gE);
    const ogL1x= cx + outerRx * Math.cos(gE+da),ogL1y= cy + outerRy * Math.sin(gE+da);
    const ogR1x= cx + outerRx * Math.cos(tE-da),ogR1y= cy + outerRy * Math.sin(tE-da);
    const ogRx = cx + outerRx * Math.cos(tE),   ogRy = cy + outerRy * Math.sin(tE);
    const irRx = cx + innerRx * Math.cos(tE),   irRy = cy + innerRy * Math.sin(tE);

    if (i === 0) d += `M ${igSx.toFixed(2)} ${igSy.toFixed(2)} `;
    else         d += `L ${igSx.toFixed(2)} ${igSy.toFixed(2)} `;

    // Inner arc (gap)
    d += `A ${innerRx.toFixed(2)} ${innerRy.toFixed(2)} 0 0 1 ${igEx.toFixed(2)} ${igEy.toFixed(2)} `;
    // Straight line up (left side of tooth) - ends before top-left corner
    d += `L ${ogLx.toFixed(2)} ${ogLy.toFixed(2)} `;
    // Rounded top-left corner: Q from ogL through ogL to ogL1
    // (short arc to da position gives the rounding feel)
    d += `A ${outerRx.toFixed(2)} ${outerRy.toFixed(2)} 0 0 1 ${ogL1x.toFixed(2)} ${ogL1y.toFixed(2)} `;
    // Outer arc (tooth top)
    d += `A ${outerRx.toFixed(2)} ${outerRy.toFixed(2)} 0 0 1 ${ogR1x.toFixed(2)} ${ogR1y.toFixed(2)} `;
    // Rounded top-right corner
    d += `A ${outerRx.toFixed(2)} ${outerRy.toFixed(2)} 0 0 1 ${ogRx.toFixed(2)} ${ogRy.toFixed(2)} `;
    // Straight line down (right side of tooth)
    d += `L ${irRx.toFixed(2)} ${irRy.toFixed(2)} `;
  }
  d += 'Z';
  return d;
}

// Build star path: n rays, outer radius erx/ery, inner radius ratio innerR
function _starPath(cx, cy, erx, ery, nRays, innerR, cornerR) {
  nRays = Math.max(4, Math.min(32, nRays));
  const ir = Math.max(0.1, Math.min(0.9, innerR));
  const pts = [];
  for (let i = 0; i < nRays * 2; i++) {
    const angle = (i / (nRays * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 1 : ir;
    pts.push({ x: cx + erx * r * Math.cos(angle), y: cy + ery * r * Math.sin(angle) });
  }
  if (cornerR > 0) return _roundedPolygonPath(pts, cornerR);
  return 'M ' + pts.map(p => p.x.toFixed(2) + ',' + p.y.toFixed(2)).join(' L ') + ' Z';
}


// ══════════════ CLOUD SHAPE GENERATOR ══════════════
const CLOUD_FORMS = ['puff', 'ring', 'burst', 'trail', 'stack'];
const _CLOUD_INSERT_SIZE = 1000; // 5× базовый размер вставки фигуры (200)
window._CLOUD_INSERT_SIZE = _CLOUD_INSERT_SIZE;

function _cloudNormForm(form) {
  return CLOUD_FORMS.includes(form) ? form : 'puff';
}

function _generateCloudCircles(w, h, seed, form) {
  form = _cloudNormForm(form);
  let s = (seed || 42) >>> 0;
  function rnd() {
    s += 0x6D2B79F5; let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 0xFFFFFFFF;
  }

  const ccx = w / 2;
  const ccy = h * (0.50 + rnd() * 0.04);
  const baseR = Math.min(w, h) * (0.12 + rnd() * 0.02);
  const tiers = [
    { mul: 0.40, count: 10 + Math.floor(rnd() * 10), maxD: 0.14 },
    { mul: 0.27, count: 20 + Math.floor(rnd() * 10), maxD: 0.26 },
    { mul: 0.17, count: 30 + Math.floor(rnd() * 10), maxD: 0.36 },
    { mul: 0.10, count: 40 + Math.floor(rnd() * 20), maxD: 0.46 }
  ];
  const totalTarget = tiers.reduce((n, t) => n + t.count, 0);

  if (form === 'ring') {
    const ringRx = w * (0.34 + rnd() * 0.02);
    const ringRy = h * (0.34 + rnd() * 0.02);
    const holeRatio = 0.40 + rnd() * 0.06;
    const ringTiers = [
      { mul: 0.40, count: 30 + Math.floor(rnd() * 12), maxD: 0.16 },
      { mul: 0.27, count: 50 + Math.floor(rnd() * 16), maxD: 0.28 },
      { mul: 0.17, count: 70 + Math.floor(rnd() * 20), maxD: 0.38 },
      { mul: 0.10, count: 90 + Math.floor(rnd() * 24), maxD: 0.48 }
    ];
    const bigMul = ringTiers[0].mul;
    const nAnchor = 28 + Math.floor(rnd() * 10);
    const circles = [];

    function _ringNormDist(cx, cy) {
      return Math.hypot((cx - ccx) / ringRx, (cy - ccy) / ringRy);
    }

    function _ringSizeScale(normDist) {
      const delta = Math.abs(normDist - 1) / 0.16;
      return Math.max(0.14, 1 - delta * 0.68);
    }

    function _ringDup(cx, cy, r, tight) {
      const k = tight ? 0.10 : 0.14;
      for (const c of circles) {
        if (Math.hypot(cx - c.cx, cy - c.cy) < (r + c.r) * k) return true;
      }
      return false;
    }

    function _ringTryPush(cx, cy, r, tightDup) {
      if (r < baseR * 0.05) return false;
      if (_ringNormDist(cx, cy) < holeRatio * 0.92) return false;
      if (cx - r < w * 0.02 || cx + r > w * 0.98 || cy - r < h * 0.03 || cy + r > h * 0.97) return false;
      if (_ringDup(cx, cy, r, tightDup)) return false;
      circles.push({ cx, cy, r });
      return true;
    }

    for (let i = 0; i < nAnchor; i++) {
      const ang = (i / nAnchor) * Math.PI * 2 + (rnd() - 0.5) * 0.22;
      const cx = ccx + Math.cos(ang) * ringRx;
      const cy = ccy + Math.sin(ang) * ringRy;
      _ringTryPush(cx, cy, baseR * bigMul * (0.94 + rnd() * 0.12), true);
    }

    for (let ti = 0; ti < ringTiers.length; ti++) {
      const tier = ringTiers[ti];
      let placed = 0;
      const target = tier.count;
      const bandNorm = (baseR * (0.42 + tier.maxD * 0.62)) / Math.max(ringRx, ringRy);
      for (let att = 0; placed < target && att < target * 55; att++) {
        const ang = rnd() * Math.PI * 2;
        const normDist = 1 + (rnd() - 0.5) * bandNorm * 2.2;
        if (normDist < holeRatio) continue;
        const cx = ccx + Math.cos(ang) * ringRx * normDist + (rnd() - 0.5) * baseR * 0.14;
        const cy = ccy + Math.sin(ang) * ringRy * normDist + (rnd() - 0.5) * baseR * 0.14;
        const nd = _ringNormDist(cx, cy);
        const scale = _ringSizeScale(nd);
        let r = baseR * tier.mul * scale * (0.90 + rnd() * 0.20);
        if (ti > 0) {
          const anchor = circles[Math.floor(rnd() * circles.length)];
          const pull = 0.48 + ti * 0.05;
          const px = cx * pull + anchor.cx * (1 - pull);
          const py = cy * pull + anchor.cy * (1 - pull);
          const pd = _ringNormDist(px, py);
          if (pd < holeRatio * 0.92) continue;
          r *= _ringSizeScale(pd) / Math.max(0.2, scale);
          if (_ringTryPush(px, py, r, false)) placed++;
        } else if (_ringTryPush(cx, cy, r, false)) {
          placed++;
        }
      }
    }

    const nFill = 48 + Math.floor(rnd() * 20);
    for (let i = 0; i < nFill; i++) {
      const ang = (i / nFill) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
      const normDist = 1 + (rnd() - 0.5) * 0.10;
      const cx = ccx + Math.cos(ang) * ringRx * normDist + (rnd() - 0.5) * baseR * 0.10;
      const cy = ccy + Math.sin(ang) * ringRy * normDist + (rnd() - 0.5) * baseR * 0.10;
      const r = baseR * (0.22 + rnd() * 0.14) * _ringSizeScale(_ringNormDist(cx, cy));
      _ringTryPush(cx, cy, r, true);
    }

    return circles;
  }

  if (form === 'burst') {
    const maxR = Math.min(w, h) * (0.44 + rnd() * 0.04);
    const coreR = baseR * tiers[0].mul * (0.88 + rnd() * 0.14);
    const circles = [{ cx: ccx, cy: ccy, r: coreR }];

    function _burstDup(cx, cy, r, k) {
      k = k == null ? 0.12 : k;
      for (const c of circles) {
        if (Math.hypot(cx - c.cx, cy - c.cy) < (r + c.r) * k) return true;
      }
      return false;
    }

    function _burstTry(cx, cy, r, tight) {
      if (r < baseR * 0.035) return false;
      if (cx - r < w * 0.02 || cx + r > w * 0.98 || cy - r < h * 0.03 || cy + r > h * 0.97) return false;
      if (_burstDup(cx, cy, r, tight ? 0.08 : 0.11)) return false;
      circles.push({ cx, cy, r });
      return true;
    }

    const nRays = 32 + Math.floor(rnd() * 14);
    for (let ri = 0; ri < nRays; ri++) {
      const ang = (ri / nRays) * Math.PI * 2 + (rnd() - 0.5) * 0.3;
      const dustN = 10 + Math.floor(rnd() * 8);
      for (let di = 0; di < dustN; di++) {
        const t = (di + 0.35) / (dustN + 0.5);
        const dist = coreR * 0.55 + t * maxR * (0.92 + rnd() * 0.12);
        const perp = (rnd() - 0.5) * baseR * (0.08 + t * 0.28);
        const cx = ccx + Math.cos(ang) * dist + Math.cos(ang + Math.PI / 2) * perp;
        const cy = ccy + Math.sin(ang) * dist * 0.62 + Math.sin(ang + Math.PI / 2) * perp * 0.62;
        const r = baseR * (0.05 + (1 - t * 0.82) * 0.11) * (0.65 + rnd() * 0.55);
        _burstTry(cx, cy, r, true);
      }
    }

    const nDust = 160 + Math.floor(rnd() * 90);
    for (let i = 0; i < nDust; i++) {
      const ang = rnd() * Math.PI * 2;
      const distPow = Math.pow(rnd(), 0.48);
      const dist = coreR * 0.25 + distPow * maxR;
      const cx = ccx + Math.cos(ang) * dist + (rnd() - 0.5) * baseR * 0.22;
      const cy = ccy + Math.sin(ang) * dist * 0.62 + (rnd() - 0.5) * baseR * 0.16;
      const r = baseR * (0.04 + (1 - distPow) * 0.09 + rnd() * 0.07);
      _burstTry(cx, cy, r, false);
    }

    const burstTiers = [
      { mul: 0.32, count: 24 + Math.floor(rnd() * 10), maxD: 0.18 },
      { mul: 0.20, count: 40 + Math.floor(rnd() * 14), maxD: 0.32 },
      { mul: 0.12, count: 55 + Math.floor(rnd() * 18), maxD: 0.42 }
    ];
    for (let ti = 0; ti < burstTiers.length; ti++) {
      const tier = burstTiers[ti];
      let placed = 0;
      for (let att = 0; placed < tier.count && att < tier.count * 40; att++) {
        const ang = rnd() * Math.PI * 2;
        const dist = tier.maxD * Math.min(w, h) * (0.35 + rnd() * 0.95);
        const cx = ccx + Math.cos(ang) * dist + (rnd() - 0.5) * baseR * 0.14;
        const cy = ccy + Math.sin(ang) * dist * 0.62 + (rnd() - 0.5) * baseR * 0.12;
        const r = baseR * tier.mul * (0.82 + rnd() * 0.22);
        if (_burstTry(cx, cy, r, false)) placed++;
      }
    }

    return circles;
  }

  let totalPlaced = 0;
  const circles = [];

  if (form === 'trail') {
    circles.push({ cx: w * 0.10, cy: ccy, r: baseR * 0.38 * (0.92 + rnd() * 0.12) });
  } else if (form === 'burst') {
    circles.push({ cx: ccx, cy: ccy, r: baseR * tiers[0].mul * (0.92 + rnd() * 0.12) });
  } else if (form === 'stack') {
    circles.push({ cx: ccx, cy: h * 0.28, r: baseR * 0.34 * (0.9 + rnd() * 0.15) });
  } else {
    circles.push({
      cx: ccx + (rnd() - 0.5) * baseR * 0.35,
      cy: ccy + baseR * 0.08,
      r: baseR * tiers[0].mul * (0.92 + rnd() * 0.12)
    });
  }
  totalPlaced++;

  function _candidate(tier) {
    const ratio = totalPlaced / Math.max(1, totalTarget);
    if (form === 'burst') {
      const ang = rnd() * Math.PI * 2;
      const dist = tier.maxD * Math.min(w, h) * (0.4 + rnd() * 0.95);
      return { cx: ccx + Math.cos(ang) * dist, cy: ccy + Math.sin(ang) * dist * 0.62, maxD: tier.maxD * Math.min(w, h) * 1.25, rScale: 1 };
    }
    if (form === 'trail') {
      const t = ratio;
      return { cx: w * (0.06 + t * 0.88) + (rnd() - 0.5) * baseR * 0.5, cy: ccy + (rnd() - 0.5) * baseR * 2.2, maxD: tier.maxD * Math.min(w, h) * 1.1, rScale: Math.max(0.32, 1 - t * 0.58) };
    }
    if (form === 'stack') {
      const layer = Math.min(2, Math.floor(ratio * 3 + rnd() * 0.5));
      return { cx: ccx + (rnd() - 0.5) * w * (0.22 + layer * 0.08), cy: h * (0.24 + layer * 0.16 + rnd() * 0.07), maxD: tier.maxD * Math.min(w, h) * (0.95 - layer * 0.1), rScale: 1 - layer * 0.07 };
    }
    return null;
  }

  for (let ti = 0; ti < tiers.length; ti++) {
    const tier = tiers[ti];
    let placed = 1;
    for (let att = 0; placed < tier.count && att < tier.count * 30; att++) {
      let r = baseR * tier.mul * (0.88 + rnd() * 0.2);
      let cx, cy, maxD = tier.maxD * Math.min(w, h);
      const cand = _candidate(tier);
      if (cand) {
        r *= cand.rScale || 1;
        maxD = cand.maxD || maxD;
        const anchor = circles[Math.floor(rnd() * circles.length)];
        const pull = form === 'trail' ? 0.35 : 0.55;
        cx = cand.cx * pull + anchor.cx * (1 - pull) + (rnd() - 0.5) * r * 0.35;
        cy = cand.cy * pull + anchor.cy * (1 - pull) + (rnd() - 0.5) * r * 0.35;
      } else {
        const anchor = circles[Math.floor(rnd() * circles.length)];
        const ang = -Math.PI * 0.92 + rnd() * Math.PI * 0.84;
        const dist = (anchor.r + r) * (0.48 + rnd() * 0.24);
        cx = anchor.cx + Math.cos(ang) * dist;
        cy = anchor.cy + Math.sin(ang) * dist * 0.62;
        if (Math.hypot(cx - ccx, (cy - ccy) * 1.25) > maxD) continue;
      }
      if (cx - r < w * 0.03 || cx + r > w * 0.97 || cy - r < h * 0.04 || cy + r > h * 0.94) continue;
      let dup = false;
      for (const c of circles) {
        if (Math.hypot(cx - c.cx, cy - c.cy) < (r + c.r) * 0.18) { dup = true; break; }
      }
      if (dup) continue;
      circles.push({ cx, cy, r });
      placed++;
      totalPlaced++;
    }
  }
  return circles;
}

function _circlePathD(c) {
  const { cx, cy, r } = c;
  return `M ${(cx - r).toFixed(2)} ${cy.toFixed(2)} `
    + `A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 1 ${(cx + r).toFixed(2)} ${cy.toFixed(2)} `
    + `A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 1 ${(cx - r).toFixed(2)} ${cy.toFixed(2)} Z `;
}

function _cloudBlobsPath(circles, expandR) {
  if (!circles || !circles.length) return '';
  const exp = expandR || 0;
  return circles.map(c => _circlePathD({ cx: c.cx, cy: c.cy, r: c.r + exp })).join('').trim();
}

function _cloudCircleBounds(circles, expandR) {
  if (!circles || !circles.length) return { x: 0, y: 0, w: 1, h: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const exp = expandR || 0;
  for (const c of circles) {
    const r = c.r + exp;
    if (c.cx - r < minX) minX = c.cx - r;
    if (c.cy - r < minY) minY = c.cy - r;
    if (c.cx + r > maxX) maxX = c.cx + r;
    if (c.cy + r > maxY) maxY = c.cy + r;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function _cloudContentPad(d) {
  const sw = d && d.sw != null ? +d.sw : 0;
  let pad = Math.max(3, sw / 2 + 2);
  if (d && d.shadow) {
    const sb = d.shadowBlur != null ? +d.shadowBlur : 4;
    const ss = d.shadowSize != null ? +d.shadowSize : 3;
    pad += Math.ceil(ss + sb * 2);
  }
  return pad;
}

function _cloudResolveCircles(d, w, h) {
  if (!d) return _generateCloudCircles(w, h, 42, 'puff');
  const form = _cloudNormForm(d.cloudForm);
  const circlesForm = d.cloudCirclesForm ? _cloudNormForm(d.cloudCirclesForm) : null;
  const canScale = d.cloudCircles && d.cloudCircles.length && d.cloudRefW > 0 && d.cloudRefH > 0 &&
    circlesForm === form;
  if (!canScale) {
    if (d.cloudFramed && w > 0 && h > 0) {
      d.cloudCircles = _cloudBuildAtSize(d, w, h);
      d.cloudCirclesForm = form;
      d.cloudRefW = w;
      d.cloudRefH = h;
      return d.cloudCircles;
    }
    return _generateCloudCircles(w, h, (d.cloudSeed) || 42, form);
  }
  const sx = w / d.cloudRefW;
  const sy = h / d.cloudRefH;
  const sm = Math.min(sx, sy);
  return d.cloudCircles.map(c => ({ cx: c.cx * sx, cy: c.cy * sy, r: c.r * sm }));
}

function _cloudFillFrame(circles, w, h, inset) {
  if (!circles || !circles.length) return circles;
  inset = inset == null ? 0 : inset;
  const b = _cloudCircleBounds(circles, 0);
  if (b.w < 1 || b.h < 1) return circles;
  const tw = Math.max(1, w - inset * 2);
  const th = Math.max(1, h - inset * 2);
  const sm = Math.max(tw / b.w, th / b.h);
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  return circles.map(c => ({
    cx: (c.cx - bcx) * sm + w / 2,
    cy: (c.cy - bcy) * sm + h / 2,
    r: c.r * sm
  }));
}

function _cloudSyncMeta(el, d) {
  if (!d) return;
  if (el) {
    if (el.dataset.cloudForm) d.cloudForm = el.dataset.cloudForm;
    if (el.dataset.cloudSeed != null && el.dataset.cloudSeed !== '') d.cloudSeed = +el.dataset.cloudSeed;
    if (el.dataset.cloudRefW) d.cloudRefW = +el.dataset.cloudRefW;
    if (el.dataset.cloudRefH) d.cloudRefH = +el.dataset.cloudRefH;
    if (el.dataset.cloudFramed === '1') d.cloudFramed = true;
  }
  if (d.cloudForm) {
    d.cloudForm = _cloudNormForm(d.cloudForm);
    _cloudPersistDataset(el, d);
  } else if (el && el.dataset.cloudForm) {
    d.cloudForm = _cloudNormForm(el.dataset.cloudForm);
  }
}

function _cloudPersistDataset(el, d) {
  if (!el || !d) return;
  if (d.cloudForm) el.dataset.cloudForm = d.cloudForm;
  if (d.cloudSeed != null) el.dataset.cloudSeed = d.cloudSeed;
  if (d.cloudRefW > 0) el.dataset.cloudRefW = d.cloudRefW;
  if (d.cloudRefH > 0) el.dataset.cloudRefH = d.cloudRefH;
  if (d.cloudFramed) el.dataset.cloudFramed = '1';
}
window._cloudSyncMeta = _cloudSyncMeta;
window._cloudPersistDataset = _cloudPersistDataset;

function _cloudBuildAtSize(d, w, h) {
  const form = _cloudNormForm(d.cloudForm);
  d.cloudForm = form;
  let circles = _generateCloudCircles(w, h, d.cloudSeed || 42, form);
  d.cloudCirclesForm = form;
  return _cloudFillFrame(circles, w, h, Math.max(2, _cloudContentPad(d) * 0.4));
}

function _cloudRemapToFrame(d, w, h) {
  d.cloudCircles = _cloudBuildAtSize(d, w, h);
  d.cloudRefW = w;
  d.cloudRefH = h;
  d.cloudFrameW = w;
  d.cloudFrameH = h;
  d.w = w;
  d.h = h;
}

function _cloudRegenerate(d, el) {
  if (!d) return;
  if (el) _cloudSyncMeta(el, d);
  const w = Math.max(24, (el && parseInt(el.style.width)) || d.cloudFrameW || d.w || 200);
  const h = Math.max(24, (el && parseInt(el.style.height)) || d.cloudFrameH || d.h || 200);
  d.w = w;
  d.h = h;
  d.cloudFrameW = w;
  d.cloudFrameH = h;
  d.cloudFramed = true;
  d.cloudCircles = _cloudBuildAtSize(d, w, h);
  d.cloudRefW = w;
  d.cloudRefH = h;
  if (el) {
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    _cloudPersistDataset(el, d);
  }
}

function _cloudBakeAndFit(d, el) {
  if (!d) return;
  if (el) _cloudSyncMeta(el, d);
  const w = d.w || (el && parseInt(el.style.width)) || 200;
  const h = d.h || (el && parseInt(el.style.height)) || 200;
  const raw = _generateCloudCircles(w, h, d.cloudSeed || 42, d.cloudForm);
  const pad = _cloudContentPad(d);
  const b = _cloudCircleBounds(raw, pad * 0.45);
  const ox = Math.floor(b.x - pad);
  const oy = Math.floor(b.y - pad);
  const refW = Math.max(24, Math.ceil(b.w + pad * 2));
  const refH = Math.max(24, Math.ceil(b.h + pad * 2));
  d.cloudCircles = raw.map(c => ({ cx: c.cx - ox, cy: c.cy - oy, r: c.r }));
  d.cloudCirclesForm = _cloudNormForm(d.cloudForm);
  d.cloudRefW = refW;
  d.cloudRefH = refH;
  d.cloudFrameW = refW;
  d.cloudFrameH = refH;
  d.cloudFramed = true;
  d.x = Math.round((d.x || 0) + ox);
  d.y = Math.round((d.y || 0) + oy);
  d.w = refW;
  d.h = refH;
  if (el) {
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    el.style.width = refW + 'px';
    el.style.height = refH + 'px';
    _cloudPersistDataset(el, d);
  }
}
window._cloudBakeAndFit = _cloudBakeAndFit;
window._cloudRegenerate = _cloudRegenerate;
window._cloudResolveCircles = _cloudResolveCircles;

function _cloudShadeFromFill(fill) {
  if (!fill || fill === 'none') return '#8eb8dc';
  const hex = fill.replace('#', '');
  if (hex.length !== 6) return '#8eb8dc';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (r > 225 && g > 225 && b > 225) return '#b8ced9';
  const sr = Math.min(255, Math.round(r * 0.78 + 8));
  const sg = Math.min(255, Math.round(g * 0.82 + 12));
  const sb = Math.min(255, Math.round(b * 0.88 + 18));
  return `#${sr.toString(16).padStart(2, '0')}${sg.toString(16).padStart(2, '0')}${sb.toString(16).padStart(2, '0')}`;
}

function _cloudHighlightFromFill(fill) {
  if (!fill || fill === 'none') return '#eef6fc';
  const hex = fill.replace('#', '');
  if (hex.length !== 6) return '#eef6fc';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `#${Math.min(255, r + 38).toString(16).padStart(2, '0')}${Math.min(255, g + 42).toString(16).padStart(2, '0')}${Math.min(255, b + 28).toString(16).padStart(2, '0')}`;
}

function _buildCloudArtSvg(circles, fill, shade, op, uid, extra, shadow, w, h) {
  const path = _cloudBlobsPath(circles, 0);
  const gid = `cg_${uid}`;
  const opAttr = op < 1 ? ` opacity="${op.toFixed(3)}"` : '';
  const defs = `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="${(h * 0.08).toFixed(1)}" x2="0" y2="${h.toFixed(1)}">`
    + `<stop offset="0%" stop-color="${_cloudHighlightFromFill(fill)}"/>`
    + `<stop offset="45%" stop-color="${fill}"/>`
    + `<stop offset="100%" stop-color="${shade}"/>`
    + `</linearGradient>`;
  const body = `<path d="${path}" fill-rule="nonzero" fill="url(#${gid})" stroke="none" ${extra}${shadow}${opAttr}/>`;
  return `<defs>${defs}</defs>` + body;
}

function _generateCloudPath(w, h, seed, form, d) {
  const circles = d ? _cloudResolveCircles(d, w, h) : _generateCloudCircles(w, h, seed, form);
  return _cloudBlobsPath(circles, 0);
}

function _generateCloudStrokePath(w, h, seed, sw, form, d) {
  if (!sw || sw <= 0) return '';
  const circles = d ? _cloudResolveCircles(d, w, h) : _generateCloudCircles(w, h, seed, form);
  return _cloudBlobsPath(circles, sw / 2);
}


function renderShapeEl(el,d,opts){
  opts=opts||{};
  const sh0 = typeof SHAPES !== 'undefined' ? SHAPES.find(s => s.id === d.shape) : null;
  if (sh0 && sh0.special === 'cloud') _cloudSyncMeta(el, d);
  if (sh0 && sh0.special === 'cloud' && !d.cloudFramed) {
    if (!d.cloudCircles || !d.cloudCircles.length) {
      if (typeof _cloudBakeAndFit === 'function') _cloudBakeAndFit(d, el);
    } else {
      const fw = parseInt(el.style.width) || d.w || 200;
      const fh = parseInt(el.style.height) || d.h || 200;
      d.cloudFramed = true;
      d.cloudFrameW = fw;
      d.cloudFrameH = fh;
      if (!d.cloudRefW) { d.cloudRefW = fw; d.cloudRefH = fh; }
      _cloudPersistDataset(el, d);
    }
  }
  const w = parseInt(el.style.width, 10) || 0;
  const h = parseInt(el.style.height, 10) || 0;
  if (opts.remapCloud && sh0 && sh0.special === 'cloud' && d.cloudFramed && w > 0 && h > 0) {
    const refW = Math.round(+(el.dataset.cloudRefW || d.cloudRefW) || 0);
    const refH = Math.round(+(el.dataset.cloudRefH || d.cloudRefH) || 0);
    if (w !== refW || h !== refH) {
      _cloudRemapToFrame(d, w, h);
      _cloudPersistDataset(el, d);
    }
  } else if (sh0 && sh0.special === 'cloud') {
    _cloudSyncMeta(el, d);
  }
  // Keep dataset in sync so syncProps/save read correct values
  if(d.strokeStyle)el.dataset.strokeStyle=d.strokeStyle;
  else if(!el.dataset.strokeStyle)el.dataset.strokeStyle='solid';
  if(d.shadow!=null)el.dataset.shadow=(d.shadow===true||d.shadow==='true')?'true':'false';
  if(d.shadowBlur!=null)el.dataset.shadowBlur=d.shadowBlur;
  if(d.shadowSize!=null)el.dataset.shadowSize=d.shadowSize;
  if(d.shadowColor)el.dataset.shadowColor=d.shadowColor;
  const c=el.querySelector('.sel-el');if(!c)return;
  const svgDiv=c.querySelector('.shape-svg');
  if(svgDiv){
    svgDiv.innerHTML=buildShapeSVG(d,w,h);
    const svgEl=svgDiv.querySelector('svg');
    if(svgEl){
      const pad=typeof window._syncShapeShadowLayout==='function'?window._syncShapeShadowLayout(el,d,w,h):0;
      if(!pad){
        svgEl.style.position='absolute';
        svgEl.style.inset='0';
        svgEl.style.width='100%';
        svgEl.style.height='100%';
      }
      svgEl.style.pointerEvents='none';
      svgEl.querySelectorAll('path,rect,ellipse,circle,polygon,polyline').forEach(p=>{
        p.style.pointerEvents='visibleFill';p.style.cursor='move';
      });
    }
  }
  // Re-apply blur overlay after re-render (size may change)
  if(el.dataset.shapeBlur>0&&typeof _applyShapeBlur==='function')_applyShapeBlur(el);
  // Always apply hit-area clip-path so transparent areas pass clicks through
  // But skip if element is currently selected — pick() manages pointer-events there
  const _d=slides[cur]&&slides[cur].els.find(e=>e.id===el.dataset.id);
  if(_d && !el.classList.contains('sel'))_applyShapeClipPath(el,_d);
}
function updateShapeStyle(prop,val){
  if(!sel||sel.dataset.type!=='shape')return;
  debouncedPushUndo();
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  if(d.type==='shape'&&typeof _cloudSyncMeta==='function'){
    const sh=typeof SHAPES!=='undefined'?SHAPES.find(s=>s.id===d.shape):null;
    if(sh&&sh.special==='cloud') _cloudSyncMeta(sel,d);
  }
  if(prop==='fill'){d.fill=val;sel.dataset.fill=val;}
  else if(prop==='stroke'){d.stroke=val;sel.dataset.stroke=val;}
  else if(prop==='sw'){
    if(d.shape==='curve' && d.curvePoints){
      if(typeof _curveSelPts!=='undefined' && _curveSelPts.size>0){
        // Initialize ALL nodes with current sw first (so hasNSw stays consistent)
        const _globalSw = d.sw != null ? +d.sw : 2;
        d.curvePoints.forEach((pt, idx) => {
          if(pt.sw == null) pt.sw = _globalSw;
        });
        // Then set selected nodes to new value
        _curveSelPts.forEach(idx=>{
          if(d.curvePoints[idx]) d.curvePoints[idx].sw=+val;
        });
        d.sw=+val; sel.dataset.sw=val;
      } else {
        // No selection: set global sw, remove per-node overrides so curve is uniform
        d.sw=+val; sel.dataset.sw=val;
        d.curvePoints.forEach(pt=>{ delete pt.sw; });
      }
      sel.dataset.curvePoints=JSON.stringify(d.curvePoints);
    } else {
      d.sw=+val;sel.dataset.sw=val;
    }
    // Rebuild curve editor so its closure d matches updated slides data
    if(typeof _buildCurveEditor==='function' && window._curveEditMode) {
      renderShapeEl(sel,d);save();drawThumbs();saveState();
      if(typeof _clearCurveEditor==='function') _clearCurveEditor();
      _buildCurveEditor();
      return;
    }
  }
  else if(prop==='strokeStyle'){d.strokeStyle=val;sel.dataset.strokeStyle=val;}
  else if(prop==='rx'){d.rx=+val;sel.dataset.rx=val;}
  else if(prop==='fillOp'){d.fillOp=+val;sel.dataset.fillOp=val;}
  else if(prop==='shadow'){d.shadow=val;sel.dataset.shadow=val;try{const opts=document.getElementById('shadow-options');if(opts)opts.style.display=val?'flex':'none';}catch(e){}}
  else if(prop==='shadowBlur'){d.shadowBlur=+val;sel.dataset.shadowBlur=val;}
  else if(prop==='shadowSize'){d.shadowSize=+val;sel.dataset.shadowSize=val;}
  else if(prop==='shadowColor'){d.shadowColor=val;sel.dataset.shadowColor=val;}
  renderShapeEl(sel,d);save();drawThumbs();saveState();
  const dCloud = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (dCloud && dCloud.type === 'shape' && typeof _cloudPersistDataset === 'function') {
    const sh = typeof SHAPES !== 'undefined' ? SHAPES.find(s => s.id === dCloud.shape) : null;
    if (sh && sh.special === 'cloud') _cloudPersistDataset(sel, dCloud);
  }
}
function updateShapeStyleScheme(prop, val, schemeRef) {
  if(sel && slides[cur]) {
    const d = slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d) {
      if(prop==='fill') { d.fillScheme = schemeRef || null; d.fill = val; sel.dataset.fill = val; }
      else if(prop==='stroke') { d.strokeScheme = schemeRef || null; d.stroke = val; sel.dataset.stroke = val; }
      else if(prop==='shadowColor') { d.shadowColorScheme = schemeRef || null; d.shadowColor = val; sel.dataset.shadowColor = val; if(schemeRef) sel.dataset.shadowColorScheme = JSON.stringify(schemeRef); else delete sel.dataset.shadowColorScheme; }
      if(d.type==='shape'&&typeof _cloudSyncMeta==='function'){
        const sh=typeof SHAPES!=='undefined'?SHAPES.find(s=>s.id===d.shape):null;
        if(sh&&sh.special==='cloud') _cloudSyncMeta(sel,d);
      }
    }
  }
  updateShapeStyle(prop, val);
}

function startEditShapeText(){
  if(!sel||sel.dataset.type!=='shape')return;
  const txt=sel.querySelector('.shape-text');if(!txt)return;
  txt.contentEditable='true';txt.style.pointerEvents='auto';txt.focus();
  // Select all
  const range=document.createRange();range.selectNodeContents(txt);
  const s=window.getSelection();s.removeAllRanges();s.addRange(range);
}
function updateShapeTextColor(v, schemeRef){
  if(!sel||sel.dataset.type!=='shape')return;
  const st=sel.querySelector('.shape-text');if(!st)return;
  // Replace only standalone color: (not background-color:)
  let cs=st.getAttribute('style')||'';
  cs=cs.replace(/(?:^|;)\s*color:\s*[^;]+/g,'').replace(/;;/g,';').replace(/^;/,'').trim();
  cs=(cs?cs+';':'')+'color:'+v+';';
  st.setAttribute('style',cs);
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(d){
    d.shapeTextColorScheme=(schemeRef!==undefined?(schemeRef||null):d.shapeTextColorScheme);
    d.shapeTextCss=cs;
  }
  try{
    const pr=document.getElementById('sh-tc-preview');if(pr)pr.style.background=v;
    const hx=document.getElementById('sh-tc-hex');if(hx)hx.value=v.replace('#','');
  }catch(e){}
  save();drawThumbs();saveState();
}
function updateShapeTextStyle(prop,val){
  if(!sel||sel.dataset.type!=='shape')return;
  const st=sel.querySelector('.shape-text');if(!st)return;
  let cs=st.getAttribute('style')||'';
  cs=cs.replace(new RegExp(prop+':[^;]+;?','i'),'')+prop+':'+val+';';
  st.setAttribute('style',cs);save();saveState();
}

// ══════════════ SVG ══════════════
// ── SVG Recent ────────────────────────────────────────────────────
const _SVG_RECENT_KEY = 'sf_svg_recent';
const _SVG_RECENT_MAX = 12;

function _svgRecentLoad() {
  try { return JSON.parse(localStorage.getItem(_SVG_RECENT_KEY) || '[]'); } catch(e) { return []; }
}
function _svgRecentSave(items) {
  try { localStorage.setItem(_SVG_RECENT_KEY, JSON.stringify(items)); } catch(e) {}
}
function _svgRecentAdd(name, code) {
  const items = _svgRecentLoad().filter(it => it.code !== code);
  items.unshift({ name: name || 'SVG', code });
  _svgRecentSave(items.slice(0, _SVG_RECENT_MAX));
}
function _svgRecentClear() {
  _svgRecentSave([]);
  _svgRecentRender();
}
function _svgRecentRender() {
  const items = _svgRecentLoad();
  const wrap = document.getElementById('svg-recent-wrap');
  const grid = document.getElementById('svg-recent-grid');
  if (!wrap || !grid) return;
  if (!items.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  grid.innerHTML = '';
  items.forEach((it, i) => {
    const cell = document.createElement('div');
    cell.title = it.name;
    cell.style.cssText = 'aspect-ratio:1;border:1.5px solid var(--border);border-radius:6px;cursor:pointer;overflow:hidden;background:var(--surface2);display:flex;align-items:center;justify-content:center;padding:4px;box-sizing:border-box;transition:border-color .15s';
    cell.innerHTML = it.code;
    const svgEl = cell.querySelector('svg');
    if (svgEl) { svgEl.style.cssText = 'width:100%;height:100%;pointer-events:none'; }
    cell.addEventListener('mouseenter', () => cell.style.borderColor = 'var(--selb)');
    cell.addEventListener('mouseleave', () => cell.style.borderColor = 'var(--border)');
    cell.addEventListener('click', () => {
      document.getElementById('svg-code').value = it.code;
      // Highlight selected
      grid.querySelectorAll('div').forEach(c => c.style.borderColor = 'var(--border)');
      cell.style.borderColor = 'var(--selb)';
    });
    grid.appendChild(cell);
  });
}

// Edit mode: double-click on existing SVG element
let _svgEditMode = false;
function openSVGModalEdit() {
  _svgEditMode = true;
  const d = sel && slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  document.getElementById('svg-code').value = d.svgContent || '';
  document.getElementById('svg-modal-title').textContent = '⬡ Редактировать SVG';
  document.getElementById('svg-modal-btn').textContent = 'Применить';
  _svgRecentRender();
  document.getElementById('svg-modal').classList.add('open');
}
function openSVGModal() {
  _svgEditMode = false;
  document.getElementById('svg-code').value = '';
  const title = document.getElementById('svg-modal-title');
  const btn = document.getElementById('svg-modal-btn');
  if (title) title.textContent = '⬡ Вставить SVG';
  if (btn) btn.textContent = 'Вставить';
  _svgRecentRender();
  document.getElementById('svg-modal').classList.add('open');
}
function _closeSvgModal() {
  document.getElementById('svg-modal').classList.remove('open');
  document.getElementById('svg-code').value = '';
  _svgEditMode = false;
}
function loadSVGFile(e) {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    const code = ev.target.result;
    document.getElementById('svg-code').value = code;
    // Save to recent with filename
    _svgRecentAdd(f.name.replace(/\.svg$/i, ''), code);
    _svgRecentRender();
  };
  r.readAsText(f);
  e.target.value = '';
}
function insertSVG() {
  const code = document.getElementById('svg-code').value.trim();
  if (!code) return toast('Paste SVG code');
  if (!code.includes('<svg')) return toast('Invalid SVG');

  if (_svgEditMode && sel) {
    // Edit existing SVG element
    const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
    if (d) {
      pushUndo();
      d.svgContent = code;
      // Re-render element
      const el = document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
      if (el) {
        const c = el.querySelector('.ec') || el;
        c.innerHTML = '';
        try {
          const _dp = new DOMParser();
          const _doc = _dp.parseFromString(code, 'image/svg+xml');
          const _p = _doc.documentElement;
          if (_p && _p.tagName !== 'parsererror') { c.appendChild(document.adoptNode(_p)); }
          else { c.innerHTML = code; }
        } catch(err) { c.innerHTML = code; }
        const svgEl = c.querySelector('svg');
        if (svgEl) { svgEl.style.width='100%'; svgEl.style.height='100%'; }
      }
      save(); drawThumbs(); saveState();
      _svgRecentAdd('edited', code);
    }
  } else {
    // Insert new SVG element
    pushUndo();
    const d = {id:'e'+(++ec),type:'svg',x:snapV(100),y:snapV(100),w:snapV(300),h:snapV(300),svgContent:code,rot:0,anims:[]};
    slides[cur].els.push(d); mkEl(d); save(); drawThumbs(); saveState();
    _svgRecentAdd('SVG', code);
  }
  _closeSvgModal();
}

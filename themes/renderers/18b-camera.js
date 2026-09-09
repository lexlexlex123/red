// ══════════════ SLIDE CAMERA (Prezi-like) ══════════════
// Slide-level viewport frames: red aspect-locked rect, resize/rotate/clamp,
// arrows between frames, move handle (top-left). Shown only in Animations tab.
(function(){
  const CAM_COLOR = '#ef4444';
  const CAM_HANDLE = '#dc2626';
  let _svg = null;
  let _layer = null;
  let _camEc = 0;

  function _W(){ return (typeof canvasW!=='undefined'?canvasW:1200); }
  function _H(){ return (typeof canvasH!=='undefined'?canvasH:675); }
  function _slide(){
    if(typeof slides==='undefined') return null;
    return slides[typeof cur!=='undefined'?cur:0]||null;
  }
  function _animOpen(){
    const wrap=document.getElementById('props-anim-wrap');
    if(wrap){
      if(wrap.style.display==='flex') return true;
      if(wrap.style.display==='none') return false;
      // display '' — trust computed (CSS default is none)
      try{
        const cs=getComputedStyle(wrap);
        if(cs.display==='flex'||cs.display==='block') return true;
      }catch(e){}
      return false;
    }
    const p=document.getElementById('anim-panel');
    return !!(p&&p.classList.contains('open'));
  }
  function _canvasScale(){
    if(typeof _canvasZoom==='number') return _canvasZoom;
    return 1;
  }
  function _pushU(){ if(typeof pushUndo==='function') pushUndo(); else if(typeof window._pushUndo==='function') window._pushUndo(); }
  function _saveAll(){
    if(typeof save==='function') save();
    if(typeof saveState==='function') saveState();
  }

  function _ensureCameras(slide){
    if(!slide) return [];
    if(!Array.isArray(slide.cameras)) slide.cameras=[];
    return slide.cameras;
  }

  function _aspect(){ return _H()/Math.max(1,_W()); }

  function _defaultCam(scale){
    scale=scale!=null?scale:0.55;
    const W=_W(), H=_H();
    const w=Math.max(40, W*scale);
    const h=w*_aspect();
    return {
      id:'cam'+(++_camEc)+'_'+Math.random().toString(36).slice(2,7),
      cx:W/2, cy:H/2, w:w, h:h, rot:0,
      duration:1200, delay:0, trigger:'auto'
    };
  }

  /** Four corners of rotated frame (canvas coords). */
  function _camCorners(cam){
    const cx=+cam.cx||0, cy=+cam.cy||0;
    const w=+cam.w||_W(), h=+cam.h||_H();
    const rad=((+cam.rot||0)*Math.PI)/180;
    const c=Math.cos(rad), s=Math.sin(rad);
    const hx=w/2, hy=h/2;
    const local=[[-hx,-hy],[hx,-hy],[hx,hy],[-hx,hy]];
    return local.map(([lx,ly])=>({
      x:cx+lx*c-ly*s,
      y:cy+lx*s+ly*c
    }));
  }

  /** Max frame width that still fits inside the slide at given rotation (centered). */
  function _maxWidthForRotation(rotDeg){
    const W=_W(), H=_H(), aspect=_aspect();
    const rad=((+rotDeg||0)*Math.PI)/180;
    const c=Math.abs(Math.cos(rad)), s=Math.abs(Math.sin(rad));
    // AABB of centered w×(w*aspect) rect: w*|cos|+h*|sin| , w*|sin|+h*|cos|
    const denomW=c+aspect*s;
    const denomH=s+aspect*c;
    return Math.max(36, Math.min(
      W/Math.max(1e-6, denomW),
      H/Math.max(1e-6, denomH)
    ));
  }

  /** Max width whose rotated frame fits at (cx,cy) without leaving the slide. */
  function _maxWidthAt(cx, cy, rotDeg){
    const W=_W(), H=_H(), aspect=_aspect();
    const rad=((+rotDeg||0)*Math.PI)/180;
    const c=Math.abs(Math.cos(rad)), s=Math.abs(Math.sin(rad));
    const denomW=Math.max(1e-6, c+aspect*s);
    const denomH=Math.max(1e-6, s+aspect*c);
    const mx=Math.max(1e-3, Math.min(+cx, W-cx));
    const my=Math.max(1e-3, Math.min(+cy, H-cy));
    // half AABB = (w/2)*denom → w = 2*margin/denom
    return Math.max(36, Math.min(
      2*mx/denomW,
      2*my/denomH,
      _maxWidthForRotation(rotDeg)
    ));
  }

  /**
   * Interactive clamp: keep size, only push against slide edges.
   * Shrinks only if frame is larger than anything that can fit at this rotation
   * (so rot=0 can still stretch to the full slide).
   */
  function _nudgeCameraInside(cam){
    const W=_W(), H=_H();
    const aspect=_aspect();
    cam.rot=((+cam.rot||0)%360+360)%360;
    if(cam.rot>180) cam.rot-=360;
    cam.cx=+cam.cx||W/2;
    cam.cy=+cam.cy||H/2;
    const absMax=_maxWidthForRotation(cam.rot);
    if(!(+cam.w>0)) cam.w=W*0.5;
    if(cam.w>absMax) cam.w=absMax;
    cam.w=Math.max(36, cam.w);
    cam.h=cam.w*aspect;

    // Translate so all corners stay inside — never change size here
    for(let pass=0; pass<3; pass++){
      const pts=_camCorners(cam);
      let dx=0, dy=0;
      pts.forEach(p=>{
        if(p.x+dx<0) dx=Math.max(dx, -p.x);
        if(p.y+dy<0) dy=Math.max(dy, -p.y);
        if(p.x+dx>W) dx=Math.min(dx, W-p.x);
        if(p.y+dy>H) dy=Math.min(dy, H-p.y);
      });
      if(Math.abs(dx)<1e-6&&Math.abs(dy)<1e-6) break;
      cam.cx+=dx;
      cam.cy+=dy;
    }
    cam.cx=Math.round(cam.cx*10)/10;
    cam.cy=Math.round(cam.cy*10)/10;
    cam.w=Math.round(cam.w*10)/10;
    cam.h=Math.round(cam.w*aspect*10)/10;
    cam.rot=Math.round((+cam.rot||0)*10)/10;
    return cam;
  }

  /** Keep rotated frame inside slide; may shrink (playback path only). */
  function _clampCamera(cam){
    const W=_W(), H=_H();
    const aspect=_aspect();
    cam.rot=((+cam.rot||0)%360+360)%360;
    if(cam.rot>180) cam.rot-=360;
    cam.cx=+cam.cx||W/2;
    cam.cy=+cam.cy||H/2;
    // Exact full-slide view — never shrink (avoids black bars at anim start)
    const nearlyFull=Math.abs(+cam.rot||0)<0.05
      && (+cam.w||0)>=W-0.75
      && Math.abs(cam.cx-W/2)<1
      && Math.abs(cam.cy-H/2)<1;
    if(nearlyFull){
      cam.cx=W/2; cam.cy=H/2; cam.w=W; cam.h=H; cam.rot=0;
      return cam;
    }
    cam.w=Math.max(36, Math.min(+cam.w||W*0.5, _maxWidthAt(cam.cx, cam.cy, cam.rot)));
    cam.h=cam.w*aspect;

    // Translate so all corners stay inside
    const pts=_camCorners(cam);
    let dx=0, dy=0;
    pts.forEach(p=>{
      if(p.x+dx<0) dx=Math.max(dx, -p.x);
      if(p.y+dy<0) dy=Math.max(dy, -p.y);
      if(p.x+dx>W) dx=Math.min(dx, W-p.x);
      if(p.y+dy>H) dy=Math.min(dy, H-p.y);
    });
    cam.cx+=dx;
    cam.cy+=dy;

    // Re-cap size after nudge (near edges)
    cam.w=Math.max(36, Math.min(cam.w, _maxWidthAt(cam.cx, cam.cy, cam.rot)));
    cam.h=cam.w*aspect;

    // Final nudge if still slightly out (numerical)
    const pts2=_camCorners(cam);
    let dx2=0, dy2=0;
    pts2.forEach(p=>{
      if(p.x+dx2<0) dx2=-p.x;
      if(p.y+dy2<0) dy2=-p.y;
      if(p.x+dx2>W) dx2=W-p.x;
      if(p.y+dy2>H) dy2=H-p.y;
    });
    cam.cx+=dx2; cam.cy+=dy2;
    cam.cx=Math.round(cam.cx*10)/10;
    cam.cy=Math.round(cam.cy*10)/10;
    cam.w=Math.round(cam.w*10)/10;
    cam.h=Math.round(cam.w*aspect*10)/10;
    cam.rot=Math.round((+cam.rot||0)*10)/10;
    return cam;
  }

  /**
   * Intermediate camera on path from→to that never looks outside the slide.
   * Center moves every frame; zoom is capped by what fits at that center —
   * avoids "shrink at center, then pan".
   */
  function _camAlongPath(from, to, e){
    const aspect=_aspect();
    const lerp=(a,b,p)=>a+(b-a)*p;
    let dRot=(+to.rot||0)-(+from.rot||0);
    while(dRot>180) dRot-=360;
    while(dRot<-180) dRot+=360;
    const rot=(+from.rot||0)+dRot*e;
    const cx=lerp(+from.cx||_W()/2, +to.cx||_W()/2, e);
    const cy=lerp(+from.cy||_H()/2, +to.cy||_H()/2, e);
    const w0=Math.max(36, +from.w||_W());
    const w1=Math.max(36, +to.w||_W());
    // Log-space zoom so pan+zoom stay coupled visually
    let w=Math.exp(lerp(Math.log(w0), Math.log(w1), e));
    w=Math.min(w, _maxWidthAt(cx, cy, rot));
    return _clampCamera({ cx, cy, w, h:w*aspect, rot });
  }

  function _camToAnim(cam){
    return {
      name:'camera', cat:'live',
      duration:cam.duration!=null?+cam.duration:1200,
      delay:cam.delay!=null?+cam.delay:0,
      trigger:cam.trigger||'auto',
      tlLane:cam.tlLane,
      camId:cam.id,
      cx:cam.cx, cy:cam.cy, w:cam.w, h:cam.h, rot:cam.rot||0
    };
  }

  function _fullSlideCam(){
    const W=_W(), H=_H();
    return { cx:W/2, cy:H/2, w:W, h:H, rot:0 };
  }

  /** CSS transform on slide layer: fitSc * map camera → full slide. */
  function _resolveFitScale(container, preferred){
    try{
      if(typeof pScale==='function'){
        const live=pScale();
        if(live>0&&isFinite(live)) return live;
      }
    }catch(e){}
    if(preferred!=null&&preferred>0&&isFinite(preferred)) return preferred;
    if(container&&container._pvFitScale>0) return container._pvFitScale;
    return 1;
  }

  function _isFullSlideCam(state){
    if(!state) return true;
    const W=_W(), H=_H();
    return Math.abs(+state.rot||0)<0.05
      && Math.abs((+state.w||W)-W)<0.75
      && Math.abs((+state.cx||W/2)-W/2)<1
      && Math.abs((+state.cy||H/2)-H/2)<1;
  }

  function _cameraCssTransform(cam, fitSc){
    const W=_W(), H=_H();
    const state=cam||_fullSlideCam();
    const fit=fitSc!=null&&fitSc>0?fitSc:1;
    // Identity: same as normal preview — no black bars from compound transform drift
    if(_isFullSlideCam(state)) return 'scale('+fit+')';
    const s=W/Math.max(1e-6, +state.w||W);
    const rot=-(+state.rot||0);
    const cx=+state.cx||W/2, cy=+state.cy||H/2;
    return 'scale('+fit+') translate('+W/2+'px,'+H/2+'px) rotate('+rot+'deg) scale('+s+') translate('+(-cx)+'px,'+(-cy)+'px)';
  }

  function _removeOverlay(){
    if(_svg){ try{ _svg.remove(); }catch(e){} _svg=null; }
    if(_layer){ try{ _layer.remove(); }catch(e){} _layer=null; }
    const a=document.getElementById('camera-svg'); if(a) a.remove();
    const b=document.getElementById('camera-layer'); if(b) b.remove();
  }

  function _scheduleCamOverlay(){
    if(!_animOpen()) return;
    // After load()/renderAll the canvas was rebuilt — redraw on next frames
    setTimeout(function(){ if(typeof renderCameraOverlay==='function') renderCameraOverlay(); }, 0);
    setTimeout(function(){ if(typeof renderCameraOverlay==='function') renderCameraOverlay(); }, 60);
  }

  function _getSvg(){
    if(_svg&&_svg.isConnected) return _svg;
    const canvas=document.getElementById('canvas');
    if(!canvas) return null;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.id='camera-svg';
    svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10020;overflow:visible;';
    canvas.appendChild(svg);
    _svg=svg;
    return svg;
  }

  function _getLayer(){
    if(_layer&&_layer.isConnected) return _layer;
    const canvas=document.getElementById('canvas');
    if(!canvas) return null;
    const div=document.createElement('div');
    div.id='camera-layer';
    div.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10020;overflow:visible;';
    canvas.appendChild(div);
    _layer=div;
    return div;
  }

  function _drawArrow(svg, x1, y1, x2, y2){
    const dx=x2-x1, dy=y2-y1;
    const len=Math.sqrt(dx*dx+dy*dy)||1;
    if(len<10) return;
    const ux=dx/len, uy=dy/len;
    const pad=14;
    const ax=x1+ux*pad, ay=y1+uy*pad;
    const bx=x2-ux*pad, by=y2-uy*pad;
    const hw=5, hl=9, px=-uy, py=ux;
    const line=document.createElementNS('http://www.w3.org/2000/svg','path');
    line.setAttribute('d','M'+ax.toFixed(1)+','+ay.toFixed(1)+' L'+bx.toFixed(1)+','+by.toFixed(1));
    line.setAttribute('fill','none');
    line.setAttribute('stroke', CAM_COLOR);
    line.setAttribute('stroke-width','1.6');
    line.setAttribute('stroke-dasharray','6 3');
    line.setAttribute('opacity','0.9');
    svg.appendChild(line);
    const head=document.createElementNS('http://www.w3.org/2000/svg','path');
    head.setAttribute('d','M'+bx.toFixed(1)+','+by.toFixed(1)+
      ' L'+(bx-ux*hl+px*hw).toFixed(1)+','+(by-uy*hl+py*hw).toFixed(1)+
      ' L'+(bx-ux*hl-px*hw).toFixed(1)+','+(by-uy*hl-py*hw).toFixed(1)+' Z');
    head.setAttribute('fill', CAM_COLOR);
    svg.appendChild(head);
  }

  function _topLeftCorner(cam){
    return _camCorners(cam)[0];
  }

  function _makeMoveHandle(size){
    const h=document.createElement('div');
    h.className='camera-handle motion-handle';
    h.dataset.motionUi='1';
    h.dataset.cameraUi='1';
    h.dataset.camMove='1';
    h.title='Камера';
    h.style.cssText=[
      'position:absolute','left:0','top:0',
      'width:'+size+'px','height:'+size+'px',
      'margin-left:'+(-size/2)+'px','margin-top:'+(-size/2)+'px',
      'pointer-events:auto','cursor:move','z-index:97',
      'background:'+CAM_HANDLE,'border-radius:3px',
      'display:flex','align-items:center','justify-content:center',
      'box-shadow:0 0 0 1px rgba(255,255,255,.85)',
      'flex:none','box-sizing:border-box','max-width:28px','max-height:28px'
    ].join(';');
    h.innerHTML='<svg viewBox="0 0 12 12" width="10" height="10" fill="white"><circle cx="3" cy="3" r="1.2"/><circle cx="9" cy="3" r="1.2"/><circle cx="3" cy="9" r="1.2"/><circle cx="9" cy="9" r="1.2"/></svg>';
    return h;
  }

  window._pointerOnCameraHandle=function(clientX, clientY){
    return !!window._cameraHandleAt(clientX, clientY);
  };

  window._cameraHandleAt=function(clientX, clientY){
    const root=document.getElementById('camera-layer');
    if(!root) return null;
    const nodes=root.querySelectorAll('[data-cam-move],[data-cam-corner],[data-cam-rot]');
    const pad=3;
    for(let i=0;i<nodes.length;i++){
      const n=nodes[i];
      const r=n.getBoundingClientRect();
      if(r.width<2||r.height<2||r.width>40||r.height>40) continue;
      if(clientX>=r.left-pad&&clientX<=r.right+pad&&clientY>=r.top-pad&&clientY<=r.bottom+pad) return n;
    }
    return null;
  };

  function _commitCam(cam){
    _nudgeCameraInside(cam);
    _saveAll();
    if(typeof renderAnimPanel==='function') renderAnimPanel();
    renderCameraOverlay();
  }

  function _syncCamDom(cam, frame, handle, poly, bc, bt, hs){
    frame.style.left=(cam.cx-cam.w/2)+'px';
    frame.style.top=(cam.cy-cam.h/2)+'px';
    frame.style.width=cam.w+'px';
    frame.style.height=cam.h+'px';
    frame.style.transform='rotate('+(cam.rot||0)+'deg)';
    handle.style.width=hs+'px';
    handle.style.height=hs+'px';
    handle.style.marginLeft=(-hs/2)+'px';
    handle.style.marginTop=(-hs/2)+'px';
    poly.setAttribute('points', _camCorners(cam).map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' '));
    bc.setAttribute('cx', cam.cx); bc.setAttribute('cy', cam.cy);
    bt.setAttribute('x', cam.cx); bt.setAttribute('y', cam.cy+4);
  }

  window.renderCameraOverlay=function(){
    _removeOverlay();
    if(typeof window._isPreviewActive==='function'&&window._isPreviewActive()) return;
    if(!_animOpen()) return;
    const s=_slide();
    if(!s) return;
    const cams=_ensureCameras(s);
    if(!cams.length) return;

    const svg=_getSvg();
    const layer=_getLayer();
    if(!svg||!layer) return;
    svg.innerHTML='';
    // Layer must not block object picks — only handles capture events
    layer.style.pointerEvents='none';
    svg.style.pointerEvents='none';
    const scale=_canvasScale();
    const hs=Math.max(10, 12/Math.max(0.5, scale));

    // Order as in animOrder when possible
    let ordered=cams.slice();
    if(Array.isArray(s.animOrder)){
      const ids=[];
      s.animOrder.forEach(e=>{
        if(e&&e.kind==='camera'&&e.camId&&cams.some(c=>c.id===e.camId)&&ids.indexOf(e.camId)<0)
          ids.push(e.camId);
      });
      cams.forEach(c=>{ if(ids.indexOf(c.id)<0) ids.push(c.id); });
      ordered=ids.map(id=>cams.find(c=>c.id===id)).filter(Boolean);
    }

    // Arrows between consecutive cameras
    for(let i=0;i<ordered.length-1;i++){
      const a=ordered[i], b=ordered[i+1];
      _drawArrow(svg, a.cx, a.cy, b.cx, b.cy);
    }

    // Pass 1: visuals only (no hit targets) so clicks pass through to slide objects
    const frames=[];
    ordered.forEach((cam, idx)=>{
      _nudgeCameraInside(cam);
      const corners=_camCorners(cam);
      const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
      poly.setAttribute('points', corners.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' '));
      poly.setAttribute('fill','rgba(239,68,68,0.06)');
      poly.setAttribute('stroke', CAM_COLOR);
      poly.setAttribute('stroke-width','2');
      poly.setAttribute('stroke-dasharray','7 4');
      poly.setAttribute('pointer-events','none');
      svg.appendChild(poly);

      const badge=document.createElementNS('http://www.w3.org/2000/svg','g');
      badge.setAttribute('pointer-events','none');
      const bc=document.createElementNS('http://www.w3.org/2000/svg','circle');
      bc.setAttribute('cx', cam.cx); bc.setAttribute('cy', cam.cy); bc.setAttribute('r', 11);
      bc.setAttribute('fill', CAM_COLOR); bc.setAttribute('stroke','#fff'); bc.setAttribute('stroke-width','1.5');
      badge.appendChild(bc);
      const bt=document.createElementNS('http://www.w3.org/2000/svg','text');
      bt.setAttribute('x', cam.cx); bt.setAttribute('y', cam.cy+4);
      bt.setAttribute('text-anchor','middle');
      bt.setAttribute('font-size','11'); bt.setAttribute('font-weight','700');
      bt.setAttribute('fill','#fff'); bt.setAttribute('font-family','sans-serif');
      bt.textContent=String(idx+1);
      badge.appendChild(bt);
      svg.appendChild(badge);

      // Frame is visual+handle host only — does not capture moves/clicks
      const frame=document.createElement('div');
      frame.dataset.camFrame='1';
      frame.style.cssText=[
        'position:absolute',
        'left:'+(cam.cx-cam.w/2)+'px','top:'+(cam.cy-cam.h/2)+'px',
        'width:'+cam.w+'px','height:'+cam.h+'px',
        'transform:rotate('+(cam.rot||0)+'deg)','transform-origin:center center',
        'pointer-events:none','z-index:'+(90+idx),
        'border:2px solid transparent','box-sizing:border-box'
      ].join(';');

      const mkCorner=(lx, ly, cursor)=>{
        const sz=Math.max(8, 9/Math.max(0.5,scale));
        const el=document.createElement('div');
        el.dataset.cameraUi='1';
        el.dataset.motionUi='1';
        el.dataset.camCorner='1';
        el.dataset.lx=String(lx);
        el.dataset.ly=String(ly);
        el.style.cssText=[
          'position:absolute','left:'+(lx*100)+'%','top:'+(ly*100)+'%',
          'width:'+sz+'px','height:'+sz+'px','margin-left:'+(-sz/2)+'px','margin-top:'+(-sz/2)+'px',
          'background:#fff','border:2px solid '+CAM_COLOR,'border-radius:2px',
          'pointer-events:auto','cursor:'+cursor,'z-index:95','box-sizing:border-box'
        ].join(';');
        return el;
      };
      frame.appendChild(mkCorner(1,0,'nesw-resize'));
      frame.appendChild(mkCorner(0,1,'nesw-resize'));
      frame.appendChild(mkCorner(1,1,'nwse-resize'));
      // TL corner = move square only (no resize handle there)

      const rotSz=Math.max(10, 12/Math.max(0.5,scale));
      const rotH=document.createElement('div');
      rotH.dataset.cameraUi='1';
      rotH.dataset.motionUi='1';
      rotH.dataset.camRot='1';
      rotH.title='Поворот';
      rotH.style.cssText=[
        'position:absolute','left:50%','top:'+(-18/Math.max(0.5,scale))+'px',
        'width:'+rotSz+'px','height:'+rotSz+'px','margin-left:'+(-rotSz/2)+'px',
        'background:'+CAM_COLOR,'border:2px solid #fff','border-radius:50%',
        'pointer-events:auto','cursor:grab','z-index:96','box-sizing:border-box'
      ].join(';');
      frame.appendChild(rotH);
      const handle=_makeMoveHandle(hs);
      handle.style.pointerEvents='auto';
      frame.appendChild(handle);
      layer.appendChild(frame);

      frames.push({cam, frame, handle, poly, bc, bt, idx});
    });

    // Pass 2: wire interactions (move = top-left square only)
    frames.forEach(({cam, frame, handle, poly, bc, bt})=>{
      const startDrag=(e)=>{
        if(e.button!=null&&e.button!==0) return;
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
        _pushU();
        const startX=e.clientX, startY=e.clientY;
        const ox=cam.cx, oy=cam.cy;
        const keepW=cam.w, keepH=cam.h;
        const sc=_canvasScale();
        const ptr=e.pointerId;
        try{ if(handle.setPointerCapture) handle.setPointerCapture(ptr); }catch(err){}
        const onMove=mv=>{
          cam.cx=ox+(mv.clientX-startX)/sc;
          cam.cy=oy+(mv.clientY-startY)/sc;
          cam.w=keepW; cam.h=keepH;
          _nudgeCameraInside(cam);
          _syncCamDom(cam, frame, handle, poly, bc, bt, hs);
        };
        const onUp=()=>{
          document.removeEventListener('pointermove', onMove, true);
          document.removeEventListener('pointerup', onUp, true);
          document.removeEventListener('pointercancel', onUp, true);
          try{ if(handle.releasePointerCapture) handle.releasePointerCapture(ptr); }catch(err){}
          _commitCam(cam);
        };
        document.addEventListener('pointermove', onMove, true);
        document.addEventListener('pointerup', onUp, true);
        document.addEventListener('pointercancel', onUp, true);
      };
      handle.addEventListener('pointerdown', startDrag, true);

      frame.querySelectorAll('[data-cam-corner]').forEach(el=>{
        el.addEventListener('mousedown', e=>{
          e.preventDefault(); e.stopPropagation();
          _pushU();
          const startX=e.clientX, startY=e.clientY;
          const startW=cam.w;
          const lx=+el.dataset.lx, ly=+el.dataset.ly;
          const cornerIdx=ly>=0.5?(lx>=0.5?2:3):(lx>=0.5?1:0);
          const oppIdx=(cornerIdx+2)%4;
          const oppFixed=_camCorners(cam)[oppIdx];
          const sc=_canvasScale();
          const rad=((+cam.rot||0)*Math.PI)/180;
          const cos=Math.cos(rad), sin=Math.sin(rad);
          const aspect=_aspect();
          const absMax=_maxWidthForRotation(cam.rot);
          const onMove=mv=>{
            const dx=(mv.clientX-startX)/sc;
            const dy=(mv.clientY-startY)/sc;
            const localDx= dx*cos+dy*sin;
            const localDy=-dx*sin+dy*cos;
            const signX=lx>=0.5?1:-1, signY=ly>=0.5?1:-1;
            const raw=(localDx*signX+localDy*signY)*0.5;
            let wantW=Math.max(36, Math.min(absMax, startW+raw*2));
            // Grow/shrink with opposite corner fixed; if past edge, stop at max that still fits
            const tryW=(w)=>{
              cam.w=w; cam.h=w*aspect;
              const hx=w/2, hy=cam.h/2;
              const locals=[[-hx,-hy],[hx,-hy],[hx,hy],[-hx,hy]];
              const lo=locals[oppIdx];
              cam.cx=oppFixed.x-(lo[0]*cos-lo[1]*sin);
              cam.cy=oppFixed.y-(lo[0]*sin+lo[1]*cos);
              const pts=_camCorners(cam);
              const W=_W(), H=_H();
              return pts.every(p=>p.x>=-0.5&&p.y>=-0.5&&p.x<=W+0.5&&p.y<=H+0.5);
            };
            if(tryW(wantW)){
              /* ok */
            } else if(wantW>startW){
              // Binary search largest size that fits (bump into edge, don't shrink below start unless needed)
              let lo=Math.min(startW, wantW), hi=wantW;
              for(let i=0;i<12;i++){
                const mid=(lo+hi)/2;
                if(tryW(mid)) lo=mid; else hi=mid;
              }
              tryW(lo);
            } else {
              // Shrinking: allow and nudge if needed
              tryW(wantW);
              _nudgeCameraInside(cam);
            }
            _syncCamDom(cam, frame, handle, poly, bc, bt, hs);
          };
          const onUp=()=>{
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            _commitCam(cam);
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
      });

      const rotBtn=frame.querySelector('[data-cam-rot]');
      if(rotBtn){
        rotBtn.addEventListener('mousedown', e=>{
          e.preventDefault(); e.stopPropagation();
          _pushU();
          const keepW=cam.w, keepH=cam.h;
          const canvas=document.getElementById('canvas');
          const r=canvas.getBoundingClientRect();
          const sc=_canvasScale();
          const onMove=mv=>{
            const p=(typeof _toCanvasCoords==='function')
              ?_toCanvasCoords(mv.clientX, mv.clientY)
              :{x:(mv.clientX-r.left)/sc, y:(mv.clientY-r.top)/sc};
            let deg=Math.atan2(p.y-cam.cy, p.x-cam.cx)*180/Math.PI+90;
            if(mv.shiftKey) deg=Math.round(deg/15)*15;
            cam.rot=deg;
            cam.w=keepW; cam.h=keepH;
            // Rotation may require a smaller absolute max — then size can drop; otherwise only nudge
            _nudgeCameraInside(cam);
            _syncCamDom(cam, frame, handle, poly, bc, bt, hs);
          };
          const onUp=()=>{
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            _commitCam(cam);
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
      }
    });
  };

  window.addCameraFrame=function(){
    const s=_slide();
    if(!s) return null;
    _pushU();
    const cams=_ensureCameras(s);
    const scale=cams.length?Math.max(0.28, 0.55-cams.length*0.06):0.55;
    const cam=_nudgeCameraInside(_defaultCam(scale));
    // Offset slightly so overlapping frames are visible
    if(cams.length){
      cam.cx=Math.min(_W()-cam.w/2, Math.max(cam.w/2, cams[cams.length-1].cx+28));
      cam.cy=Math.min(_H()-cam.h/2, Math.max(cam.h/2, cams[cams.length-1].cy+20));
      _nudgeCameraInside(cam);
    }
    cams.push(cam);
    if(typeof window._ensureAnimOrder==='function') window._ensureAnimOrder(s);
    if(!Array.isArray(s.animOrder)) s.animOrder=[];
    s.animOrder.push({ kind:'camera', camId:cam.id });
    _saveAll();
    if(typeof renderAnimPanel==='function') renderAnimPanel();
    renderCameraOverlay();
    if(typeof toast==='function') toast('Камера '+(cams.length), 'ok');
    return cam;
  };

  window.removeCameraFrame=function(camId){
    const s=_slide();
    if(!s||!camId) return;
    _pushU();
    s.cameras=(_ensureCameras(s)).filter(c=>c.id!==camId);
    if(s.animOrder){
      const mapFn=function(x){
        if(x&&x.kind==='camera'&&x.camId===camId) return null;
        return x;
      };
      const walk=function(list){
        return (list||[]).map(function(e){
          if(e&&e.kind==='repeat'){
            return Object.assign({},e,{children:walk(e.children||[])});
          }
          return mapFn(e);
        }).filter(Boolean);
      };
      s.animOrder=walk(s.animOrder);
    }
    _saveAll();
    if(typeof renderAnimPanel==='function') renderAnimPanel();
    renderCameraOverlay();
  };

  window.updateCameraProp=function(camId, prop, val){
    const s=_slide();
    if(!s) return;
    const cam=_ensureCameras(s).find(c=>c.id===camId);
    if(!cam) return;
    if(prop==='duration'||prop==='delay') cam[prop]=Math.max(0, +val||0);
    else if(prop==='trigger') {
      cam.trigger=val||'auto';
      if (cam.trigger === 'click') cam.delay = 0;
    }
    else if(prop==='rot'){ cam.rot=+val||0; _nudgeCameraInside(cam); }
    else if(prop==='w'){ cam.w=Math.max(36,+val||36); cam.h=cam.w*_aspect(); _nudgeCameraInside(cam); }
    _saveAll();
    if(typeof renderAnimPanel==='function') renderAnimPanel();
    if(typeof window._refreshAnimTimeline==='function') window._refreshAnimTimeline();
    renderCameraOverlay();
  };

  window._cameraAnimFromCam=_camToAnim;
  window._clampCamera=_clampCamera;
  window._cameraCssTransform=_cameraCssTransform;
  window._fullSlideCamState=_fullSlideCam;
  window._ensureSlideCameras=_ensureCameras;

  /** Scale cameras when slide AR / canvas size changes. */
  window._scaleSlideCameras=function(slide, sx, sy){
    if(!slide||!slide.cameras) return;
    const sc=Math.min(sx,sy);
    slide.cameras.forEach(c=>{
      c.cx=(+c.cx||0)*sx;
      c.cy=(+c.cy||0)*sy;
      c.w=(+c.w||0)*sc;
      c.h=(+c.w||0)*(_H()/_W());
      _nudgeCameraInside(c);
    });
  };

  function _camAbort(el){
    if(!el||!el._camCtl) return;
    el._camCtl.aborted=true;
    (el._camCtl.rafs||[]).forEach(id=>{ try{ cancelAnimationFrame(id); }catch(e){} });
    (el._camCtl.timers||[]).forEach(t=>clearTimeout(t));
    el._camCtl=null;
  }

  function _snapCamState(cam, extra){
    const s={
      cx:+cam.cx, cy:+cam.cy,
      w:+cam.w||_W(), h:+cam.h||_H(),
      rot:+cam.rot||0,
      duration:cam.duration
    };
    if(extra) Object.assign(s, extra);
    return s;
  }

  function _clearCamTimers(container){
    if(!container) return;
    (container._pvCamTimers||[]).forEach(t=>clearTimeout(t));
    container._pvCamTimers=[];
  }

  function _ensureCamStack(container, from){
    if(!container._pvCamStack||!container._pvCamStack.length){
      container._pvCamStack=[_snapCamState(from||_fullSlideCam(), { stepIdx:0 })];
    }
  }

  window._resetCameraAnim=function(container){
    if(!container) return;
    _camAbort(container);
    _clearCamTimers(container);
    container._pvCamStack=[_snapCamState(_fullSlideCam(), { stepIdx:0 })];
    container._pvCamRedo=[];
    container._pvCamPendingAuto=[];
    const fit=_resolveFitScale(container, container._pvFitScale);
    container._pvFitScale=fit;
    container._pvCamState=_fullSlideCam();
    container.style.overflow='hidden';
    container.style.transformOrigin='top left';
    container.style.transform=_cameraCssTransform(container._pvCamState, fit);
  };

  /** Step back to the previous camera. Returns popped record, or null if none. */
  window._rewindCameraAnim=function(container){
    if(!container) return null;
    const stack=container._pvCamStack;
    if(!stack||stack.length<=1) return null;
    _clearCamTimers(container);
    const pending=(container._pvCamPendingAuto||[]).slice();
    container._pvCamPendingAuto=[];
    const popped=stack.pop();
    const target=stack[stack.length-1];
    const redo=[];
    if(popped&&popped._auto) redo.push(popped);
    pending.forEach(p=>redo.push(p));
    if(redo.length) container._pvCamRedo=redo.concat(container._pvCamRedo||[]);
    const from=container._pvCamState||_fullSlideCam();
    window._fireCameraAnim(container, target, {
      from:from,
      rewind:true,
      duration:popped&&popped.duration
    });
    return popped;
  };

  /** Re-apply a camera that was rewound with the left arrow. */
  window._replayCameraAnim=function(container){
    if(!container||!container._pvCamRedo||!container._pvCamRedo.length) return false;
    const next=container._pvCamRedo.shift();
    const from=container._pvCamState||_fullSlideCam();
    window._fireCameraAnim(container, next, {
      from:from,
      fromRedo:true,
      auto:!!next._auto,
      stepIdx:next.stepIdx,
      duration:next.duration
    });
    return true;
  };

  /** Jump to the next auto camera that has not played yet (right arrow). */
  window._skipToNextPendingCamera=function(container){
    const pending=container&&container._pvCamPendingAuto;
    if(!pending||!pending.length) return false;
    _clearCamTimers(container);
    const next=pending.shift();
    const from=container._pvCamState||_fullSlideCam();
    window._fireCameraAnim(container, next, { from:from, auto:true, duration:next.duration });
    return true;
  };

  /**
   * Animate container from current camera state to target cam (Prezi-like).
   * Path stays inside the slide — no empty area outside canvas.
   * opts: {delay, fitScale, from, rewind, fromRedo, auto, stepIdx, duration}
   */
  window._fireCameraAnim=function(container, cam, opts){
    opts=opts||{};
    if(!container||!cam) return;
    _camAbort(container);
    const fromRaw=opts.from||container._pvCamState||_fullSlideCam();
    // Do not clamp the starting full-slide view — clamp would shrink it
    let from={
      cx:+fromRaw.cx, cy:+fromRaw.cy,
      w:+fromRaw.w||_W(), h:+fromRaw.h||_H(),
      rot:+fromRaw.rot||0
    };
    if(_isFullSlideCam(from)) from=_fullSlideCam();
    else from=_clampCamera(from);
    let to={
      cx:+cam.cx, cy:+cam.cy,
      w:+cam.w||_W(), h:+cam.h||_H(),
      rot:+cam.rot||0
    };
    if(_isFullSlideCam(to)) to=_fullSlideCam();
    else to=_clampCamera(to);
    const dur=Math.max(200, +(cam.duration||opts.duration||1200)||1200);
    const delay=opts.delay!=null?+opts.delay:0;
    if(!opts.rewind){
      if(!opts.fromRedo) container._pvCamRedo=[];
      _ensureCamStack(container, from);
      const rec=_snapCamState(to, {
        duration:dur,
        _auto:!!opts.auto
      });
      if(opts.stepIdx!=null) rec.stepIdx=opts.stepIdx;
      container._pvCamStack.push(rec);
    }
    const ctl={aborted:false, rafs:[], timers:[]};
    container._camCtl=ctl;

    const apply=state=>{
      // Live pScale each frame — fullscreen/resize must not leave stale smaller fit
      const fit=_resolveFitScale(container, opts.fitScale!=null?opts.fitScale:container._pvFitScale);
      container._pvFitScale=fit;
      container._pvCamState={ cx:state.cx, cy:state.cy, w:state.w, h:state.h, rot:state.rot };
      container.style.overflow='hidden';
      container.style.transformOrigin='top left';
      container.style.transform=_cameraCssTransform(container._pvCamState, fit);
    };

    const run=()=>{
      if(ctl.aborted) return;
      apply(from);
      const t0=performance.now();
      const ease=t=>t*t*(3-2*t);
      const step=now=>{
        if(ctl.aborted) return;
        const p=Math.min(1, (now-t0)/dur);
        const e=ease(p);
        apply(_camAlongPath(from, to, e));
        if(p<1){
          const id=requestAnimationFrame(step);
          ctl.rafs.push(id);
        } else {
          apply(to);
        }
      };
      const id=requestAnimationFrame(step);
      ctl.rafs.push(id);
    };

    if(delay>0){
      const t=setTimeout(run, delay);
      ctl.timers.push(t);
    } else run();
  };

  // Hook anim panel open/close + slide load (pickSlide uses load, not renderAll)
  const _patch=()=>{
    const _o=window.openAnimPanel;
    if(_o&&!_o._camPatched){
      window.openAnimPanel=function(){
        _o.apply(this, arguments);
        _scheduleCamOverlay();
        setTimeout(function(){ if(typeof renderCameraOverlay==='function') renderCameraOverlay(); }, 160);
      };
      window.openAnimPanel._camPatched=true;
    }
    const _c=window.closeAnimPanel;
    if(_c&&!_c._camPatched){
      window.closeAnimPanel=function(){
        _c.apply(this, arguments);
        _removeOverlay();
      };
      window.closeAnimPanel._camPatched=true;
    }
    const _r=window.renderAll;
    if(_r&&!_r._camPatched){
      window.renderAll=function(){
        _r.apply(this, arguments);
        _scheduleCamOverlay();
      };
      window.renderAll._camPatched=true;
    }
    const _l=window.load;
    if(typeof _l==='function'&&!_l._camPatched){
      window.load=function(){
        const r=_l.apply(this, arguments);
        // load() clears #camera-* from canvas — always re-draw if Anim tab open
        _svg=null; _layer=null;
        _scheduleCamOverlay();
        return r;
      };
      window.load._camPatched=true;
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', _patch);
  else _patch();
  setTimeout(_patch, 0);
  setTimeout(_patch, 200);
})();

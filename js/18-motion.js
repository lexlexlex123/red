// ══════════════ MOTION ANIMATION OVERLAY ══════════════
(function(){

  let _svgOverlay = null;
  let _ghostContainer = null;

  function _getSvg(){
    if(_svgOverlay && _svgOverlay.isConnected) return _svgOverlay;
    const canvas = document.getElementById('canvas');
    if(!canvas) return null;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.id = 'motion-svg';
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10001;overflow:visible;';
    canvas.appendChild(svg);
    _svgOverlay = svg;
    return svg;
  }

  function _getGhostContainer(){
    if(_ghostContainer && _ghostContainer.isConnected) return _ghostContainer;
    const canvas = document.getElementById('canvas');
    if(!canvas) return null;
    const div = document.createElement('div');
    div.id = 'motion-ghosts';
    div.style.cssText = 'position:absolute;pointer-events:none;z-index:10001;top:0;left:0;width:0;height:0;overflow:visible;';
    canvas.appendChild(div);
    _ghostContainer = div;
    return div;
  }

  function _removeOverlay(){
    if(_svgOverlay){ _svgOverlay.remove(); _svgOverlay = null; }
    if(_ghostContainer){ _ghostContainer.remove(); _ghostContainer = null; }
    document.getElementById('motion-ghosts')?.remove();
  }

  function _animOpen(){
    const wrap = document.getElementById('props-anim-wrap');
    if(wrap && wrap.style.display !== 'none' && wrap.style.display !== '') return true;
    const p = document.getElementById('anim-panel');
    return p && p.classList.contains('open');
  }

  function _canvasScale(){
    if(typeof _canvasZoom === 'number') return _canvasZoom;
    const canvas = document.getElementById('canvas');
    if(!canvas) return 1;
    const t = canvas.style.transform || '';
    const m = t.match(/scale\(([\d.]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  }

  function _drawArrow(svg, x1, y1, x2, y2, color){
    const dx=x2-x1, dy=y2-y1;
    const len=Math.sqrt(dx*dx+dy*dy)||1;
    if(len < 8) return;
    const ux=dx/len, uy=dy/len;
    const pad=12;
    const ax=x1+ux*pad, ay=y1+uy*pad;
    const bx=x2-ux*pad, by=y2-uy*pad;
    const hw=5, hl=9, px=-uy, py=ux;
    const lineEl = document.createElementNS('http://www.w3.org/2000/svg','path');
    lineEl.setAttribute('d',`M${ax.toFixed(1)},${ay.toFixed(1)} L${bx.toFixed(1)},${by.toFixed(1)}`);
    lineEl.setAttribute('fill','none');
    lineEl.setAttribute('stroke', color);
    lineEl.setAttribute('stroke-width','1.5');
    lineEl.setAttribute('stroke-dasharray','6 3');
    lineEl.setAttribute('filter','url(#mo-glow)');
    svg.appendChild(lineEl);
    const headEl = document.createElementNS('http://www.w3.org/2000/svg','path');
    headEl.setAttribute('d',`M${bx.toFixed(1)},${by.toFixed(1)} L${(bx-ux*hl+px*hw).toFixed(1)},${(by-uy*hl+py*hw).toFixed(1)} L${(bx-ux*hl-px*hw).toFixed(1)},${(by-uy*hl-py*hw).toFixed(1)} Z`);
    headEl.setAttribute('fill', color);
    headEl.setAttribute('filter','url(#mo-glow)');
    svg.appendChild(headEl);
  }

  // Compute end top-left position of element after orbitTo from (startX,startY)
  function _orbitEndPos(a, startX, startY, ow, oh){
    const ocx = a.orbitCx || 0;
    const ocy = a.orbitCy || 0;
    const r   = a.orbitR  || 120;
    const dir = (a.orbitDir||'cw')==='cw' ? 1 : -1;
    const deg = (a.orbitDeg != null ? a.orbitDeg : 360) * dir;
    const ecx = startX + ow/2, ecy = startY + oh/2;
    const cx  = ecx + ocx,    cy  = ecy + ocy;
    const sa  = Math.atan2(ecy-cy, ecx-cx);
    const ea  = sa + deg*Math.PI/180;
    return { x: cx+r*Math.cos(ea)-ow/2, y: cy+r*Math.sin(ea)-oh/2 };
  }

  function _makeGhost(domEl, gx, gy, ow, oh, outlineColor){
    const ghost = domEl.cloneNode(true);
    ghost.className = 'motion-ghost';
    ghost.removeAttribute('data-id'); ghost.removeAttribute('data-anims');
    ghost.removeAttribute('data-editing'); ghost.removeAttribute('data-type');
    const _origTransform = domEl.style.transform || '';
    ghost.style.cssText = [
      'position:absolute',
      `left:${gx}px`,`top:${gy}px`,`width:${ow}px`,`height:${oh}px`,
      'opacity:0.28', 'pointer-events:none',
      `outline:1.5px dashed ${outlineColor}`,
      'z-index:91','user-select:none',
      _origTransform ? `transform:${_origTransform}` : '',
    ].filter(Boolean).join(';');
    ghost.querySelectorAll('*').forEach(ch=>{ ch.style.pointerEvents='none'; ch.removeAttribute('contenteditable'); });
    ghost.querySelectorAll('.rh,.sel-box').forEach(ch=>ch.remove());
    ghost.classList.remove('sel');
    return ghost;
  }

  function _makeMoveHandle(gx, gy, size, bg){
    const h = document.createElement('div');
    h.style.cssText = [
      'position:absolute',`left:${gx}px`,`top:${gy}px`,
      `width:${size}px`,`height:${size}px`,
      'pointer-events:auto','cursor:move','z-index:93',
      `background:${bg}`,'border-radius:3px',
      'display:flex','align-items:center','justify-content:center',
    ].join(';');
    h.innerHTML = '<svg viewBox="0 0 12 12" width="10" height="10" fill="white"><circle cx="3" cy="3" r="1.2"/><circle cx="9" cy="3" r="1.2"/><circle cx="3" cy="9" r="1.2"/><circle cx="9" cy="9" r="1.2"/></svg>';
    return h;
  }

  window.renderMotionOverlay = function(){
    _removeOverlay();
    if(!_animOpen()) return;

    const s = (typeof slides!=='undefined') && slides[(typeof cur!=='undefined'?cur:0)];
    if(!s||!s.els) return;

    const canvas = document.getElementById('canvas');
    if(!canvas) return;

    const hasMotion = s.els.some(d=>d.anims&&d.anims.some(a=>a.name==='moveTo'||a.name==='orbitTo'||a.name==='swing'));
    if(!hasMotion) return;

    const svg = _getSvg();
    const gc  = _getGhostContainer();
    if(!svg || !gc) return;

    svg.innerHTML = `<defs>
      <filter id="mo-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

    const scale = _canvasScale();

    s.els.forEach(d => {
      if(!d.anims||!d.anims.length) return;
      const motionAnims = d.anims.filter(a=>a.name==='moveTo'||a.name==='orbitTo'||a.name==='swing');
      if(!motionAnims.length) return;

      const domEl = canvas.querySelector(`.el[data-id="${d.id}"]`);
      if(!domEl) return;

      const ox = parseInt(domEl.style.left) || d.x;
      const oy = parseInt(domEl.style.top)  || d.y;
      const ow = d.w, oh = d.h;

      // Walk ALL anims in their original order, tracking cumulative position
      let prevX = ox, prevY = oy;
      let motionIdx = 0;

      d.anims.forEach((a, ai) => {
        if(a.name !== 'moveTo' && a.name !== 'orbitTo' && a.name !== 'swing') return;

        // ────────────────────────────────
        // swing — точка центра качения
        // ────────────────────────────────
        if(a.name === 'swing'){
          const sox = a.swingOx != null ? a.swingOx : 0;
          const soy = a.swingOy != null ? a.swingOy : oh/2;
          // Позиция точки на канвасе: центр объекта + смещение
          const px = ox + ow/2 + sox;
          const py = oy + oh/2 + soy;
          // Рисуем крестик на SVG
          const R=8;
          const line = (x1,y1,x2,y2,col) => {
            const l = document.createElementNS('http://www.w3.org/2000/svg','line');
            l.setAttribute('x1',x1);l.setAttribute('y1',y1);l.setAttribute('x2',x2);l.setAttribute('y2',y2);
            l.setAttribute('stroke',col);l.setAttribute('stroke-width','2');l.setAttribute('stroke-linecap','round');
            svg.appendChild(l);
          };
          line(px-R,py, px+R,py, 'rgba(139,92,246,0.9)');
          line(px,py-R, px,py+R, 'rgba(139,92,246,0.9)');
          // Круг на точке
          const circ = document.createElementNS('http://www.w3.org/2000/svg','circle');
          circ.setAttribute('cx',px);circ.setAttribute('cy',py);circ.setAttribute('r',6);
          circ.setAttribute('fill','rgba(139,92,246,0.85)');circ.setAttribute('stroke','#fff');circ.setAttribute('stroke-width','1.5');
          svg.appendChild(circ);
          // Пунктирная дуга от центра объекта до точки качения
          const cx2 = ox+ow/2, cy2 = oy+oh/2;
          if(sox!==0||soy!==0){
            const ln = document.createElementNS('http://www.w3.org/2000/svg','line');
            ln.setAttribute('x1',cx2);ln.setAttribute('y1',cy2);ln.setAttribute('x2',px);ln.setAttribute('y2',py);
            ln.setAttribute('stroke','rgba(139,92,246,0.4)');ln.setAttribute('stroke-width','1');
            ln.setAttribute('stroke-dasharray','3 3');svg.appendChild(ln);
          }
          // Snap-точки: углы, середины сторон и центр объекта
          const snapPts = [
            {x:ox,      y:oy},       // верх-лево
            {x:ox+ow/2, y:oy},       // верх-центр
            {x:ox+ow,   y:oy},       // верх-право
            {x:ox+ow,   y:oy+oh/2},  // право-центр
            {x:ox+ow,   y:oy+oh},    // низ-право
            {x:ox+ow/2, y:oy+oh},    // низ-центр
            {x:ox,      y:oy+oh},    // низ-лево
            {x:ox,      y:oy+oh/2},  // лево-центр
            {x:ox+ow/2, y:oy+oh/2},  // центр
          ];

          function applySnap(npx, npy){
            // Порог 16px в экранных координатах = 16/scale в канвасных
            const thresh = 16 / scale;
            let bx=npx, by=npy, snapped=false;
            let best=thresh;
            snapPts.forEach(sp=>{
              const d2=Math.sqrt((npx-sp.x)**2+(npy-sp.y)**2);
              if(d2<best){ best=d2; bx=sp.x; by=sp.y; snapped=true; }
            });
            return {x:bx, y:by, snapped};
          }

          // Drag handle
          const dot = document.createElement('div');
          dot.style.cssText = `position:absolute;left:${px}px;top:${py}px;width:14px;height:14px;border-radius:50%;background:rgba(139,92,246,0.9);border:2px solid #fff;transform:translate(-50%,-50%);cursor:grab;pointer-events:auto;box-shadow:0 1px 6px rgba(139,92,246,.6)`;
          dot.title = 'Перетащите для изменения центра качения';

          dot.addEventListener('mousedown', e=>{
            e.preventDefault(); e.stopPropagation();
            dot.style.cursor='grabbing';
            const sx=e.clientX, sy=e.clientY;
            const ssox=sox, ssoy=soy;

            const onMove = ev=>{
              // Сырое смещение в канвасных координатах
              const rawSox = ssox + (ev.clientX-sx)/scale;
              const rawSoy = ssoy + (ev.clientY-sy)/scale;
              const rawPx  = ox+ow/2+rawSox;
              const rawPy  = oy+oh/2+rawSoy;
              // Snap
              const {x:spx, y:spy, snapped} = applySnap(rawPx, rawPy);
              dot.style.left = spx+'px';
              dot.style.top  = spy+'px';
              dot.style.background = snapped ? 'rgba(99,102,241,1)' : 'rgba(139,92,246,0.9)';
              dot.style.transform = snapped
                ? 'translate(-50%,-50%) scale(1.3)'
                : 'translate(-50%,-50%) scale(1)';
            };

            const onUp = ev=>{
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
              dot.style.cursor='grab';
              const rawSox = ssox + (ev.clientX-sx)/scale;
              const rawSoy = ssoy + (ev.clientY-sy)/scale;
              const rawPx  = ox+ow/2+rawSox;
              const rawPy  = oy+oh/2+rawSoy;
              const {x:spx, y:spy} = applySnap(rawPx, rawPy);
              a.swingOx = Math.round(spx - (ox+ow/2));
              a.swingOy = Math.round(spy - (oy+oh/2));
              const domEl2 = canvas.querySelector(`.el[data-id="${d.id}"]`);
              if(domEl2) domEl2.dataset.anims = JSON.stringify(d.anims);
              if(typeof save==='function') save();
              if(typeof saveState==='function') saveState();
              renderMotionOverlay();
              if(typeof renderAnimPanel==='function') renderAnimPanel();
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          });

          gc.appendChild(dot);
          return;
        }

        if(a.name !== 'moveTo' && a.name !== 'orbitTo') return;
        const mi = motionIdx++;

        // ────────────────────────────────
        // moveTo
        // ────────────────────────────────
        if(a.name === 'moveTo'){
          // tx/ty are always relative to the ORIGINAL element position (ox,oy)
          const gx = ox + (a.tx||0);
          const gy = oy + (a.ty||0);

          // Arrow from prev chain position to this ghost
          _drawArrow(svg, prevX+ow/2, prevY+oh/2, gx+ow/2, gy+oh/2, 'rgba(99,102,241,0.8)');

          const ghost = _makeGhost(domEl, gx, gy, ow, oh, 'rgba(99,102,241,0.7)');
          ghost.dataset.ghostEl = d.id;
          ghost.dataset.ghostMi = mi;
          gc.appendChild(ghost);

          const hs = Math.min(20, ow*0.3, oh*0.3);
          const handle = _makeMoveHandle(gx, gy, hs, 'rgba(99,102,241,0.85)');
          handle.title = 'Перетащите для изменения точки назначения';

          handle.addEventListener('mousedown', e=>{
            e.preventDefault(); e.stopPropagation();
            const sx=e.clientX, sy=e.clientY;
            const stx=a.tx||0, sty=a.ty||0;
            const onMove = ev=>{
              const nx = ox + stx + Math.round((ev.clientX-sx)/scale);
              const ny = oy + sty + Math.round((ev.clientY-sy)/scale);
              ghost.style.left = handle.style.left = nx+'px';
              ghost.style.top  = handle.style.top  = ny+'px';
              // Обновляем коннекторы чтобы следовали за ghost
              if(typeof updateConnectorsFor==='function'){
                const _curTx = stx + Math.round((ev.clientX-sx)/scale);
                const _curTy = sty + Math.round((ev.clientY-sy)/scale);
                updateConnectorsFor(d.id, _curTx, _curTy);
              }
            };
            const onUp = ev=>{
              document.removeEventListener('mousemove',onMove);
              document.removeEventListener('mouseup',onUp);
              a.tx = stx + Math.round((ev.clientX-sx)/scale);
              a.ty = sty + Math.round((ev.clientY-sy)/scale);
              const domEl2 = canvas.querySelector(`.el[data-id="${d.id}"]`);
              if(domEl2) domEl2.dataset.anims = JSON.stringify(d.anims);
              if(typeof save==='function') save();
              if(typeof saveState==='function') saveState();
              renderMotionOverlay();
              if(typeof renderAnimPanel==='function') renderAnimPanel();
            };
            document.addEventListener('mousemove',onMove);
            document.addEventListener('mouseup',onUp);
          });
          gc.appendChild(handle);

          prevX = gx; prevY = gy;

        // ────────────────────────────────
        // orbitTo
        // ────────────────────────────────
        } else if(a.name === 'orbitTo'){
          const stepOx = prevX, stepOy = prevY;
          const ocx = a.orbitCx || 0;
          const ocy = a.orbitCy || 0;
          const r   = a.orbitR  || 120;
          const dir = (a.orbitDir||'cw')==='cw' ? 1 : -1;
          const deg = (a.orbitDeg != null ? a.orbitDeg : 360) * dir;

          // Element center at START of this orbit step
          const elCx = stepOx + ow/2;
          const elCy = stepOy + oh/2;
          // Orbit center
          const cx = elCx + ocx;
          const cy = elCy + ocy;

          const startAngle = Math.atan2(elCy-cy, elCx-cx);
          const endAngle   = startAngle + deg*Math.PI/180;

          // Draw orbit circle (centered where orbit actually is for this step)
          const circleEl = document.createElementNS('http://www.w3.org/2000/svg','circle');
          circleEl.setAttribute('cx', cx.toFixed(1));
          circleEl.setAttribute('cy', cy.toFixed(1));
          circleEl.setAttribute('r',  r.toFixed(1));
          circleEl.setAttribute('fill','none');
          circleEl.setAttribute('stroke','rgba(34,197,94,0.55)');
          circleEl.setAttribute('stroke-width','1.5');
          circleEl.setAttribute('stroke-dasharray','8 4');
          circleEl.setAttribute('filter','url(#mo-glow)');
          svg.appendChild(circleEl);

          // Arrow from prev chain position to start of orbit (only if prev != start)
          if(Math.abs(prevX-stepOx)+Math.abs(prevY-stepOy) > 2){
            _drawArrow(svg, prevX+ow/2, prevY+oh/2, stepOx+ow/2, stepOy+oh/2, 'rgba(34,197,94,0.5)');
          }

          // Ghost at END of orbit
          const endEcx = cx + r*Math.cos(endAngle);
          const endEcy = cy + r*Math.sin(endAngle);
          const endGx  = endEcx - ow/2;
          const endGy  = endEcy - oh/2;

          const ghost = _makeGhost(domEl, endGx, endGy, ow, oh, 'rgba(34,197,94,0.7)');
          ghost.dataset.ghostEl = d.id;
          ghost.dataset.ghostMi = mi;
          gc.appendChild(ghost);

          // Drag handle on orbitTo ghost — drag moves end point along circle, updates orbitDeg
          {
            const hs = Math.min(20, ow*0.3, oh*0.3);
            const orbitHandle = _makeMoveHandle(endGx, endGy, hs, 'rgba(34,197,94,0.85)');
            orbitHandle.title = 'Перетащите конечную точку вдоль окружности';
            orbitHandle.addEventListener('mousedown', e=>{
              e.preventDefault(); e.stopPropagation();
              const onMove = ev=>{
                const mx=(ev.clientX-canvas.getBoundingClientRect().left)/scale;
                const my=(ev.clientY-canvas.getBoundingClientRect().top)/scale;
                // Snap mouse to circle: find angle from orbit center to mouse
                const angle = Math.atan2(my-cy, mx-cx);
                const snapX = cx + r*Math.cos(angle) - ow/2;
                const snapY = cy + r*Math.sin(angle) - oh/2;
                ghost.style.left = orbitHandle.style.left = snapX+'px';
                ghost.style.top  = orbitHandle.style.top  = snapY+'px';
              };
              const onUp = ev=>{
                document.removeEventListener('mousemove',onMove);
                document.removeEventListener('mouseup',onUp);
                const mx=(ev.clientX-canvas.getBoundingClientRect().left)/scale;
                const my=(ev.clientY-canvas.getBoundingClientRect().top)/scale;
                const newEndAngle = Math.atan2(my-cy, mx-cx);
                // Compute new degrees: signed angle from startAngle to newEndAngle in orbit direction
                let rawDiff = newEndAngle - startAngle;
                // Normalize to [-2PI, 2PI]
                while(rawDiff >  2*Math.PI) rawDiff -= 2*Math.PI;
                while(rawDiff < -2*Math.PI) rawDiff += 2*Math.PI;
                // Pick the value matching original direction sign
                const origDir = (a.orbitDir||'cw')==='cw' ? 1 : -1;
                if(origDir > 0 && rawDiff < 0) rawDiff += 2*Math.PI;
                if(origDir < 0 && rawDiff > 0) rawDiff -= 2*Math.PI;
                // Store as unsigned — direction is encoded in orbitDir, not sign of orbitDeg
                a.orbitDeg = Math.round(Math.abs(rawDiff) * 180/Math.PI);
                const domEl2 = canvas.querySelector(`.el[data-id="${d.id}"]`);
                if(domEl2) domEl2.dataset.anims = JSON.stringify(d.anims);
                if(typeof save==='function') save();
                if(typeof saveState==='function') saveState();
                renderMotionOverlay();
                if(typeof renderAnimPanel==='function') renderAnimPanel();
              };
              document.addEventListener('mousemove',onMove);
              document.addEventListener('mouseup',onUp);
            });
            gc.appendChild(orbitHandle);
          }

          // Direction arrow hint on circle
          const arrowAngle = startAngle + dir * Math.min(Math.abs(deg)*Math.PI/180, Math.PI/4) * 0.6;
          const apt = { x: cx + r*Math.cos(arrowAngle), y: cy + r*Math.sin(arrowAngle) };
          const tgt = arrowAngle + dir * Math.PI/2;
          const ahl=7, ahw=4;
          const arrowHead = document.createElementNS('http://www.w3.org/2000/svg','path');
          arrowHead.setAttribute('d',`M${apt.x.toFixed(1)},${apt.y.toFixed(1)} L${(apt.x+Math.cos(tgt-Math.PI)*ahl+Math.cos(tgt-Math.PI/2)*ahw).toFixed(1)},${(apt.y+Math.sin(tgt-Math.PI)*ahl+Math.sin(tgt-Math.PI/2)*ahw).toFixed(1)} L${(apt.x+Math.cos(tgt-Math.PI)*ahl-Math.cos(tgt-Math.PI/2)*ahw).toFixed(1)},${(apt.y+Math.sin(tgt-Math.PI)*ahl-Math.sin(tgt-Math.PI/2)*ahw).toFixed(1)} Z`);
          arrowHead.setAttribute('fill','rgba(34,197,94,0.85)');
          svg.appendChild(arrowHead);

          // ── Center dot — drag to reposition orbit (object stays at stepOx/stepOy) ──
          const centerDot = document.createElement('div');
          centerDot.style.cssText = [
            'position:absolute',`left:${cx-8}px`,`top:${cy-8}px`,
            'width:16px','height:16px','border-radius:50%',
            'background:rgba(34,197,94,0.85)',
            'border:2px solid rgba(255,255,255,0.8)',
            'cursor:move','pointer-events:auto','z-index:94',
            'display:flex','align-items:center','justify-content:center',
          ].join(';');
          centerDot.title = 'Перетащите центр окружности';
          centerDot.innerHTML = '<svg viewBox="0 0 10 10" width="8" height="8" fill="white"><circle cx="5" cy="5" r="2"/></svg>';

          let radiusHandle, radiusLabel; // forward ref for onMove

          centerDot.addEventListener('mousedown', e=>{
            e.preventDefault(); e.stopPropagation();
            const sx=e.clientX, sy=e.clientY;
            const scx=a.orbitCx||0, scy=a.orbitCy||0;
            const onMove = ev=>{
              const ddx=Math.round((ev.clientX-sx)/scale);
              const ddy=Math.round((ev.clientY-sy)/scale);
              const newOcx=scx+ddx, newOcy=scy+ddy;
              const newCx=elCx+newOcx, newCy=elCy+newOcy;
              const newR=Math.max(10, Math.round(Math.sqrt((elCx-newCx)**2+(elCy-newCy)**2)));
              circleEl.setAttribute('cx', newCx.toFixed(1));
              circleEl.setAttribute('cy', newCy.toFixed(1));
              circleEl.setAttribute('r',  newR.toFixed(1));
              centerDot.style.left=(newCx-8)+'px'; centerDot.style.top=(newCy-8)+'px';
              const nsa=Math.atan2(elCy-newCy, elCx-newCx);
              if(radiusHandle){ radiusHandle.style.left=(newCx+newR*Math.cos(nsa)-7)+'px'; radiusHandle.style.top=(newCy+newR*Math.sin(nsa)-7)+'px'; }
              if(radiusLabel){ radiusLabel.textContent=newR+'px'; const lx=newCx+(newR+16)*Math.cos(nsa); const ly=newCy+(newR+16)*Math.sin(nsa); radiusLabel.setAttribute('x',lx.toFixed(1)); radiusLabel.setAttribute('y',ly.toFixed(1)); }
              const nea=nsa+deg*Math.PI/180;
              ghost.style.left=(newCx+newR*Math.cos(nea)-ow/2)+'px';
              ghost.style.top =(newCy+newR*Math.sin(nea)-oh/2)+'px';
            };
            const onUp = ev=>{
              document.removeEventListener('mousemove',onMove);
              document.removeEventListener('mouseup',onUp);
              a.orbitCx=scx+Math.round((ev.clientX-sx)/scale);
              a.orbitCy=scy+Math.round((ev.clientY-sy)/scale);
              const nc={x:elCx+a.orbitCx, y:elCy+a.orbitCy};
              a.orbitR=Math.max(10, Math.round(Math.sqrt((elCx-nc.x)**2+(elCy-nc.y)**2)));
              const domEl2=canvas.querySelector(`.el[data-id="${d.id}"]`);
              if(domEl2) domEl2.dataset.anims=JSON.stringify(d.anims);
              if(typeof save==='function') save();
              if(typeof saveState==='function') saveState();
              renderMotionOverlay();
              if(typeof renderAnimPanel==='function') renderAnimPanel();
            };
            document.addEventListener('mousemove',onMove);
            document.addEventListener('mouseup',onUp);
          });
          gc.appendChild(centerDot);

          // ── Radius handle — on circle at startAngle, drag to resize ──
          const rhx=cx+r*Math.cos(startAngle), rhy=cy+r*Math.sin(startAngle);
          radiusHandle = document.createElement('div');
          radiusHandle.style.cssText = [
            'position:absolute',`left:${rhx-7}px`,`top:${rhy-7}px`,
            'width:14px','height:14px','border-radius:50%',
            'background:rgba(34,197,94,0.35)',
            'border:2px solid rgba(34,197,94,1)',
            'cursor:nwse-resize','pointer-events:auto','z-index:94',
          ].join(';');
          radiusHandle.title = 'Тяните для изменения радиуса';

          radiusLabel = document.createElementNS('http://www.w3.org/2000/svg','text');
          {
            const lx=cx+(r+16)*Math.cos(startAngle), ly=cy+(r+16)*Math.sin(startAngle);
            radiusLabel.setAttribute('x', lx.toFixed(1));
            radiusLabel.setAttribute('y', ly.toFixed(1));
            radiusLabel.setAttribute('fill','rgba(34,197,94,0.9)');
            radiusLabel.setAttribute('font-size','10');
            radiusLabel.setAttribute('font-family','system-ui,sans-serif');
            radiusLabel.setAttribute('text-anchor','middle');
            radiusLabel.textContent = r+'px';
          }
          svg.appendChild(radiusLabel);

          radiusHandle.addEventListener('mousedown', e=>{
            e.preventDefault(); e.stopPropagation();
            const angleToEl=Math.atan2(elCy-cy, elCx-cx);
            const onMove = ev=>{
              const mx=(ev.clientX-canvas.getBoundingClientRect().left)/scale;
              const my=(ev.clientY-canvas.getBoundingClientRect().top)/scale;
              const newR=Math.max(10, Math.round(Math.sqrt((mx-cx)**2+(my-cy)**2)));
              // Shift center to keep object on circle
              const newCx=elCx-newR*Math.cos(angleToEl);
              const newCy=elCy-newR*Math.sin(angleToEl);
              circleEl.setAttribute('r',newR.toFixed(1));
              circleEl.setAttribute('cx',newCx.toFixed(1));
              circleEl.setAttribute('cy',newCy.toFixed(1));
              const nsa=Math.atan2(elCy-newCy, elCx-newCx);
              const nrhx=newCx+newR*Math.cos(nsa), nrhy=newCy+newR*Math.sin(nsa);
              radiusHandle.style.left=(nrhx-7)+'px'; radiusHandle.style.top=(nrhy-7)+'px';
              centerDot.style.left=(newCx-8)+'px'; centerDot.style.top=(newCy-8)+'px';
              radiusLabel.textContent=newR+'px';
              const lx=newCx+(newR+16)*Math.cos(nsa), ly=newCy+(newR+16)*Math.sin(nsa);
              radiusLabel.setAttribute('x',lx.toFixed(1)); radiusLabel.setAttribute('y',ly.toFixed(1));
              const nea=nsa+deg*Math.PI/180;
              ghost.style.left=(newCx+newR*Math.cos(nea)-ow/2)+'px';
              ghost.style.top =(newCy+newR*Math.sin(nea)-oh/2)+'px';
            };
            const onUp = ev=>{
              document.removeEventListener('mousemove',onMove);
              document.removeEventListener('mouseup',onUp);
              const mx=(ev.clientX-canvas.getBoundingClientRect().left)/scale;
              const my=(ev.clientY-canvas.getBoundingClientRect().top)/scale;
              const newR=Math.max(10, Math.round(Math.sqrt((mx-cx)**2+(my-cy)**2)));
              const newCx=elCx-newR*Math.cos(angleToEl);
              const newCy=elCy-newR*Math.sin(angleToEl);
              a.orbitR=newR;
              a.orbitCx=Math.round(newCx-elCx);
              a.orbitCy=Math.round(newCy-elCy);
              const domEl2=canvas.querySelector(`.el[data-id="${d.id}"]`);
              if(domEl2) domEl2.dataset.anims=JSON.stringify(d.anims);
              if(typeof save==='function') save();
              if(typeof saveState==='function') saveState();
              renderMotionOverlay();
              if(typeof renderAnimPanel==='function') renderAnimPanel();
            };
            document.addEventListener('mousemove',onMove);
            document.addEventListener('mouseup',onUp);
          });
          gc.appendChild(radiusHandle);

          // Advance chain to end of orbit
          const ep = _orbitEndPos(a, stepOx, stepOy, ow, oh);
          prevX = ep.x; prevY = ep.y;
        }
      });
    });
  };

  const _origOpen = window.openAnimPanel;
  window.openAnimPanel = function(){
    if(_origOpen) _origOpen.apply(this,arguments);
    setTimeout(renderMotionOverlay, 0);
    setTimeout(renderMotionOverlay, 150);
  };
  const _origClose = window.closeAnimPanel;
  window.closeAnimPanel = function(){
    if(_origClose) _origClose.apply(this,arguments);
    _removeOverlay();
  };
  const _origRenderAll = window.renderAll;
  window.renderAll = function(){
    if(_origRenderAll) _origRenderAll.apply(this,arguments);
    if(_animOpen()) setTimeout(renderMotionOverlay, 50);
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    const origGoSlide = window.goSlide;
    if(typeof origGoSlide === 'function'){
      window.goSlide = function(){
        origGoSlide.apply(this, arguments);
        if(_animOpen()) setTimeout(renderMotionOverlay, 100);
      };
    }
  });

})();

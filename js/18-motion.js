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
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:92;overflow:visible;';
    canvas.appendChild(svg);
    _svgOverlay = svg;
    return svg;
  }

  function _getGhostContainer(){
    if(_ghostContainer && _ghostContainer.isConnected) return _ghostContainer;
    const canvas = document.getElementById('canvas');
    if(!canvas) return null;
    // Put ghosts INSIDE canvas so they don't block clicks on real elements via z-index stacking
    const div = document.createElement('div');
    div.id = 'motion-ghosts';
    div.style.cssText = 'position:absolute;pointer-events:none;z-index:91;top:0;left:0;width:0;height:0;overflow:visible;';
    canvas.appendChild(div);
    _ghostContainer = div;
    return div;
  }

  function _removeOverlay(){
    if(_svgOverlay){ _svgOverlay.remove(); _svgOverlay = null; }
    if(_ghostContainer){ _ghostContainer.remove(); _ghostContainer = null; }
    // Also clean up any orphaned ghost containers
    document.getElementById('motion-ghosts')?.remove();
  }

  function _animOpen(){
    const wrap = document.getElementById('props-anim-wrap');
    if(wrap && wrap.style.display !== 'none' && wrap.style.display !== '') return true;
    // fallback: old overlay
    const p = document.getElementById('anim-panel');
    return p && p.classList.contains('open');
  }

  function _arrowPath(x1,y1,x2,y2){
    const dx=x2-x1, dy=y2-y1;
    const len=Math.sqrt(dx*dx+dy*dy)||1;
    if(len < 5) return {line:'',head:''};
    const ux=dx/len, uy=dy/len;
    const pad=12;
    const ax=x1+ux*pad, ay=y1+uy*pad;
    const bx=x2-ux*pad, by=y2-uy*pad;
    const hw=5, hl=9, px=-uy, py=ux;
    return {
      line:`M${ax.toFixed(1)},${ay.toFixed(1)} L${bx.toFixed(1)},${by.toFixed(1)}`,
      head:`M${bx.toFixed(1)},${by.toFixed(1)} L${(bx-ux*hl+px*hw).toFixed(1)},${(by-uy*hl+py*hw).toFixed(1)} L${(bx-ux*hl-px*hw).toFixed(1)},${(by-uy*hl-py*hw).toFixed(1)} Z`
    };
  }

  function _canvasScale(){
    if(typeof _canvasZoom === 'number') return _canvasZoom;
    const canvas = document.getElementById('canvas');
    if(!canvas) return 1;
    const t = canvas.style.transform || '';
    const m = t.match(/scale\(([\d.]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  }

  function _redrawArrows(d, canvas){
    const svg = _svgOverlay;
    if(!svg) return;
    // Clear only paths (keep defs)
    [...svg.children].forEach(c=>{ if(c.tagName!=='defs') c.remove(); });
    const s = (typeof slides!=='undefined') && slides[(typeof cur!=='undefined'?cur:0)];
    if(!s||!s.els) return;
    s.els.forEach(ed=>{
      if(!ed.anims||!ed.anims.length) return;
      const moveAnims = ed.anims.filter(a=>a.name==='moveTo');
      if(!moveAnims.length) return;
      const domEl = canvas.querySelector(`.el[data-id="${ed.id}"]`);
      if(!domEl) return;
      const ox = parseInt(domEl.style.left)||ed.x;
      const oy = parseInt(domEl.style.top)||ed.y;
      const ow = ed.w, oh = ed.h;
      // Read ghost positions from DOM
      const ghosts = [...(canvas.querySelectorAll('.motion-ghost')||[])];
      let prevX=ox, prevY=oy;
      moveAnims.forEach((a, mi)=>{
        // Find matching ghost by data-el-id
        const ghost = canvas.querySelector(`#motion-ghosts .motion-ghost[data-ghost-el="${ed.id}"][data-ghost-mi="${mi}"]`);
        const gx = ghost ? parseInt(ghost.style.left) : ox+(a.tx||0);
        const gy = ghost ? parseInt(ghost.style.top)  : oy+(a.ty||0);
        const {line,head} = _arrowPath(prevX+ow/2, prevY+oh/2, gx+ow/2, gy+oh/2);
        if(line){
          const lineEl = document.createElementNS('http://www.w3.org/2000/svg','path');
          lineEl.setAttribute('d',line); lineEl.setAttribute('fill','none');
          lineEl.setAttribute('stroke','rgba(99,102,241,0.75)'); lineEl.setAttribute('stroke-width','1.5');
          lineEl.setAttribute('stroke-dasharray','6 3'); lineEl.setAttribute('filter','url(#mo-glow)');
          svg.appendChild(lineEl);
          const headEl = document.createElementNS('http://www.w3.org/2000/svg','path');
          headEl.setAttribute('d',head); headEl.setAttribute('fill','rgba(99,102,241,0.9)');
          headEl.setAttribute('filter','url(#mo-glow)');
          svg.appendChild(headEl);
        }
        prevX=gx; prevY=gy;
      });
    });
  }

  window.renderMotionOverlay = function(){
    _removeOverlay();
    if(!_animOpen()) return;

    const s = (typeof slides!=='undefined') && slides[(typeof cur!=='undefined'?cur:0)];
    if(!s||!s.els) return;

    const canvas = document.getElementById('canvas');
    if(!canvas) return;

    // Check any moveTo exists before creating elements
    const hasMotion = s.els.some(d=>d.anims&&d.anims.some(a=>a.name==='moveTo'));
    if(!hasMotion) return;

    const svg = _getSvg();
    const gc  = _getGhostContainer();
    if(!svg || !gc) return;

    svg.innerHTML = `<defs>
      <filter id="mo-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

    const scale = _canvasScale();

    s.els.forEach(d => {
      if(!d.anims||!d.anims.length) return;
      const moveAnims = d.anims.filter(a=>a.name==='moveTo');
      if(!moveAnims.length) return;

      const domEl = canvas.querySelector(`.el[data-id="${d.id}"]`);
      if(!domEl) return;

      // Read position from DOM (live during drag) not from data model
      const ox = parseInt(domEl.style.left) || d.x;
      const oy = parseInt(domEl.style.top)  || d.y;
      const ow = d.w, oh = d.h;
      let prevX=ox, prevY=oy;

      moveAnims.forEach((a, mi) => {
        const gx = ox + (a.tx||0);
        const gy = oy + (a.ty||0);

        // Arrow
        const {line, head} = _arrowPath(prevX+ow/2, prevY+oh/2, gx+ow/2, gy+oh/2);
        if(line){
          const lineEl = document.createElementNS('http://www.w3.org/2000/svg','path');
          lineEl.setAttribute('d', line);
          lineEl.setAttribute('fill','none');
          lineEl.setAttribute('stroke','rgba(99,102,241,0.75)');
          lineEl.setAttribute('stroke-width','1.5');
          lineEl.setAttribute('stroke-dasharray','6 3');
          lineEl.setAttribute('filter','url(#mo-glow)');
          svg.appendChild(lineEl);
          const headEl = document.createElementNS('http://www.w3.org/2000/svg','path');
          headEl.setAttribute('d', head);
          headEl.setAttribute('fill','rgba(99,102,241,0.9)');
          headEl.setAttribute('filter','url(#mo-glow)');
          svg.appendChild(headEl);
        }

        // Ghost inside canvas — coordinates are canvas px (no scale multiply)
        const ghost = domEl.cloneNode(true);
        ghost.className = 'motion-ghost';
        ghost.removeAttribute('data-id');
        ghost.removeAttribute('data-anims');
        ghost.removeAttribute('data-editing');
        ghost.removeAttribute('data-type');
        ghost.style.cssText = [
          'position:absolute',
          `left:${gx}px`,
          `top:${gy}px`,
          `width:${ow}px`,
          `height:${oh}px`,
          'opacity:0.3',
          'pointer-events:none',
          'outline:1.5px dashed rgba(99,102,241,0.7)',
          'z-index:91',
          'user-select:none',
        ].join(';');
        ghost.querySelectorAll('*').forEach(ch=>{ ch.style.pointerEvents='none'; ch.removeAttribute('contenteditable'); });
        ghost.querySelectorAll('.rh,.sel-box').forEach(ch=>ch.remove());
        ghost.classList.remove('sel');

        // Small drag handle in top-left corner of ghost
        const handle = document.createElement('div');
        const hs = Math.min(20, ow*0.3, oh*0.3); // handle size
        handle.style.cssText = [
          'position:absolute',
          `left:${gx}px`,
          `top:${gy}px`,
          `width:${hs}px`,
          `height:${hs}px`,
          'pointer-events:auto',
          'cursor:move',
          'z-index:93',
          'background:rgba(99,102,241,0.8)',
          'border-radius:3px',
          'display:flex',
          'align-items:center',
          'justify-content:center',
        ].join(';');
        handle.innerHTML = '<svg viewBox="0 0 12 12" width="10" height="10" fill="white"><circle cx="3" cy="3" r="1.2"/><circle cx="9" cy="3" r="1.2"/><circle cx="3" cy="9" r="1.2"/><circle cx="9" cy="9" r="1.2"/></svg>';
        handle.title = 'Перетащите для изменения точки назначения';

        handle.addEventListener('mousedown', e=>{
          e.preventDefault(); e.stopPropagation();
          const sx=e.clientX, sy=e.clientY;
          const stx=a.tx||0, sty=a.ty||0;

          const onMove = ev=>{
            const ddx = ev.clientX-sx, ddy = ev.clientY-sy;
            const nx = ox + stx + Math.round(ddx/scale);
            const ny = oy + sty + Math.round(ddy/scale);
            ghost.style.left = handle.style.left = nx+'px';
            ghost.style.top  = handle.style.top  = ny+'px';
            // Only redraw SVG arrow, don't recreate ghost/handle
            _redrawArrows(d, canvas);
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

        ghost.dataset.ghostEl = d.id;
        ghost.dataset.ghostMi = mi;
        gc.appendChild(ghost);
        gc.appendChild(handle);
        prevX=gx; prevY=gy;
      });
    });
  };

  const _origOpen = window.openAnimPanel;
  window.openAnimPanel = function(){
    if(_origOpen) _origOpen.apply(this,arguments);
    setTimeout(renderMotionOverlay, 0);
    setTimeout(renderMotionOverlay, 150); // retry after renderAll completes
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

  // Also re-render overlay whenever slide changes (e.g. after loadState tab restore)
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

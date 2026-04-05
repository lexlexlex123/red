// ══════════════ CONNECTORS ══════════════
// Связи между элементами (линии и стрелки)

;(function(){

// ── State ──────────────────────────────────────────────────────────────────
let _connMode = null;
let _connStep = 0;
let _connFrom = null;
let _connectors = [];
// Временные смещения от motion-анимации: {elId:{tx,ty}}
const _motionOffsets = {};
window._connSetMotionOffset = function(elId, tx, ty){
  if(tx===0&&ty===0) delete _motionOffsets[elId];
  else _motionOffsets[elId]={tx,ty};
};
window._connClearMotionOffsets = function(){ Object.keys(_motionOffsets).forEach(k=>delete _motionOffsets[k]); };

const SVG_LAYER_ID = 'conn-svg-layer';

// ── Local helper ──────────────────────────────────────────────────────────
function _canvasScale() {
  if (typeof window._canvasZoom === 'number') return window._canvasZoom;
  const canvas = document.getElementById('canvas');
  if (!canvas) return 1;
  const m = (canvas.style.transform || '').match(/scale\(([\d.]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

// ── Init ───────────────────────────────────────────────────────────────────
function _ensureSvgLayer() {
  const canvas = document.getElementById('canvas');
  let svg = document.getElementById(SVG_LAYER_ID);
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = SVG_LAYER_ID;
    svg.setAttribute('style',
      'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:1;');
    canvas.appendChild(svg);
    svg.innerHTML = '<defs></defs>';
  }
  return svg;
}

function _connId() { return 'cn' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }

// ── Edge midpoints: 4 cardinal sides, rotated around element center ─────────
function _edgeMidpoints(elId) {
  const el = document.querySelector(`.el[data-id="${elId}"]`);
  if (!el) return null;
  const _moff = _motionOffsets[elId] || {tx:0,ty:0};
  const x = parseInt(el.style.left) + _moff.tx;
  const y = parseInt(el.style.top)  + _moff.ty;
  const w = parseInt(el.style.width), h = parseInt(el.style.height);
  const cx = x + w / 2, cy = y + h / 2;
  const deg = parseFloat(el.dataset.rot) || 0;

  // Rotate a point around element center
  function rot(px, py) {
    if (!deg) return { x: px, y: py };
    const rad = deg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const dx = px - cx, dy = py - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  }

  // Rotate a direction vector (no translation)
  function rotDir(nx, ny) {
    if (!deg) return { nx, ny };
    const rad = deg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    return { nx: nx * cos - ny * sin, ny: nx * sin + ny * cos };
  }

  const top    = rot(cx,       y      );
  const right  = rot(x + w,    cy     );
  const bottom = rot(cx,       y + h  );
  const left   = rot(x,        cy     );
  return [
    { ...top,    side: 'top',    ...rotDir( 0, -1) },
    { ...right,  side: 'right',  ...rotDir( 1,  0) },
    { ...bottom, side: 'bottom', ...rotDir( 0,  1) },
    { ...left,   side: 'left',   ...rotDir(-1,  0) },
  ];
}

// Returns closest edge midpoint of elId toward a target point or other element
function _getAnchorSide(elId, otherElId, overridePt) {
  const mids = _edgeMidpoints(elId);
  if (!mids) return { x: 0, y: 0, side: 'right' };

  let tx, ty;
  if (overridePt) {
    tx = overridePt.x; ty = overridePt.y;
  } else if (otherElId) {
    const o = document.querySelector(`.el[data-id="${otherElId}"]`);
    if (o) {
      tx = parseInt(o.style.left) + parseInt(o.style.width)  / 2;
      ty = parseInt(o.style.top)  + parseInt(o.style.height) / 2;
    } else { return mids[1]; }
  } else { return mids[1]; }

  let best = mids[0], bestDist = Infinity;
  for (const m of mids) {
    const d = (m.x - tx) ** 2 + (m.y - ty) ** 2;
    if (d < bestDist) { bestDist = d; best = m; }
  }
  return best;
}

// Snap canvas point to nearest edge midpoint within threshold
function _snapToNearestEdge(canvasPt, excludeElId, threshold) {
  threshold = threshold || 44;
  const canvas = document.getElementById('canvas');
  let best = null, bestDist = Infinity;
  canvas.querySelectorAll('.el').forEach(el => {
    if (el.dataset.id === excludeElId) return;
    const mids = _edgeMidpoints(el.dataset.id);
    if (!mids) return;
    for (const m of mids) {
      const d = Math.sqrt((m.x - canvasPt.x) ** 2 + (m.y - canvasPt.y) ** 2);
      if (d < threshold && d < bestDist) {
        bestDist = d;
        best = { point: m, elId: el.dataset.id, side: m.side };
      }
    }
  });
  return best;
}

// Side normal vectors (outward direction for each side)
const _SIDE_NORMAL = {
  top:    { x:  0, y: -1 },
  right:  { x:  1, y:  0 },
  bottom: { x:  0, y:  1 },
  left:   { x: -1, y:  0 },
};

// Get anchor point for rendering using stored side, with optional gap offset
function _getAnchor(conn, which) {
  const elId    = which === 'from' ? conn.fromId   : conn.toId;
  const sideKey = which === 'from' ? 'fromSide'    : 'toSide';
  const otherId = which === 'from' ? conn.toId     : conn.fromId;
  const mids = _edgeMidpoints(elId);
  if (!mids) return { x: 0, y: 0 };
  const stored = conn[sideKey];
  let m = stored ? mids.find(p => p.side === stored) : null;
  if (!m) m = _getAnchorSide(elId, otherId);
  const gap = conn.gap || 0;
  if (!gap) return m;
  // Push anchor outward along the ROTATED side normal stored in m.nx/m.ny
  const nx = m.nx != null ? m.nx : (_SIDE_NORMAL[m.side] || {x:0,y:0}).x;
  const ny = m.ny != null ? m.ny : (_SIDE_NORMAL[m.side] || {x:0,y:0}).y;
  return { x: m.x + nx * gap, y: m.y + ny * gap, side: m.side, nx, ny };
}

// Get raw anchor WITHOUT gap (used for handle display and snapping)
function _getAnchorRaw(conn, which) {
  const elId    = which === 'from' ? conn.fromId   : conn.toId;
  const sideKey = which === 'from' ? 'fromSide'    : 'toSide';
  const otherId = which === 'from' ? conn.toId     : conn.fromId;
  const mids = _edgeMidpoints(elId);
  if (!mids) return { x: 0, y: 0 };
  const stored = conn[sideKey];
  let m = stored ? mids.find(p => p.side === stored) : null;
  if (!m) m = _getAnchorSide(elId, otherId);
  return m;
}

// ── Bezier control points ──────────────────────────────────────────────────
function _defaultControlPoints(p1, p2) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const bend = Math.min(dist * 0.45, 220);
  const hBias = Math.abs(dx) > Math.abs(dy) * 0.6;
  let cp1, cp2;
  if (hBias) {
    cp1 = { x: p1.x + bend * Math.sign(dx || 1), y: p1.y };
    cp2 = { x: p2.x - bend * Math.sign(dx || 1), y: p2.y };
  } else {
    cp1 = { x: p1.x, y: p1.y + bend * Math.sign(dy || 1) };
    cp2 = { x: p2.x, y: p2.y - bend * Math.sign(dy || 1) };
  }
  return { cp1, cp2 };
}

// ── Build cubic Bezier SVG path ────────────────────────────────────────────
function _pathD(p1, cp1, cp2, p2) {
  return `M${p1.x.toFixed(1)},${p1.y.toFixed(1)} C${cp1.x.toFixed(1)},${cp1.y.toFixed(1)} ${cp2.x.toFixed(1)},${cp2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
}

// ── Render one connector ───────────────────────────────────────────────────
function _renderConnector(conn, svg) {
  const p1 = _getAnchor(conn, 'from');
  const p2 = _getAnchor(conn, 'to');

  if (!conn.cp1 || !conn.cp2) {
    const def = _defaultControlPoints(p1, p2);
    conn.cp1 = def.cp1; conn.cp2 = def.cp2;
  }

  let g = svg.querySelector(`[data-conn-id="${conn.id}"]`);
  if (!g) {
    g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-conn-id', conn.id);
    svg.appendChild(g);
  }
  g.setAttribute('opacity', conn.opacity != null ? conn.opacity : 1);
  while (g.firstChild) g.removeChild(g.firstChild);

  const color  = conn.color  || '#60a5fa';
  const sw     = conn.sw     || 2;
  const dash   = conn.dash   || 'solid';
  const fromMk = conn.fromMarker || 'none';
  const toMk   = conn.toMarker   || (conn.type === 'arrow' ? 'arrow' : 'none');

  let dashArr = 'none', linecap = 'round';
  if (dash === 'dot')  { dashArr = `0 ${sw * 4}`; linecap = 'round'; }
  else if (dash === 'dash') { dashArr = `${sw * 5} ${sw * 3}`; linecap = 'round'; }

  const defs = svg.querySelector('defs');
  defs.querySelectorAll(`[id^="${conn.id}_"]`).forEach(m => m.remove());

  function makeMarker(mid, type, atStart) {
    if (type === 'none') return;
    const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    m.setAttribute('id', mid);
    m.setAttribute('markerUnits', 'strokeWidth');
    m.setAttribute('orient', 'auto');
    m.setAttribute('fill', color);
    m.setAttribute('stroke', color);
    if (type === 'arrow') {
      // Equilateral triangle, markerUnits=strokeWidth so it scales with line width
      // refX at BASE (not tip): line ends at base, triangle body fully covers line end
      m.setAttribute('markerWidth', '3.1'); m.setAttribute('markerHeight', '3.5');
      m.setAttribute('refX', atStart ? '1.386' : '1.386'); m.setAttribute('refY', '1.6');
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const pathEnd   = 'M2.555,1.475 L2.555,1.475 Q2.771,1.600 2.555,1.725 L0.217,3.075 Q0.000,3.200 0.000,2.950 L0.000,0.250 Q0.000,0.000 0.217,0.125 Z';
      const pathStart = 'M0.216,1.475 L0.216,1.475 Q0.000,1.600 0.216,1.725 L2.554,3.075 Q2.771,3.200 2.771,2.950 L2.771,0.250 Q2.771,0.000 2.554,0.125 Z';
      poly.setAttribute('d', atStart ? pathStart : pathEnd);
      poly.setAttribute('fill', color); poly.setAttribute('stroke', 'none');
      m.appendChild(poly);
    } else if (type === 'square') {
      // Rounded square, markerUnits=strokeWidth (scales with line width)
      // 3x3 sw square, centered at (1.5, 1.5)
      // outer edge (x=3.2) at anchor, body extends inward; line retracted by 3.2sw
      m.setAttribute('markerWidth', '3.4'); m.setAttribute('markerHeight', '3.4');
      m.setAttribute('refX', atStart ? '1.7' : '1.7'); m.setAttribute('refY', '1.7');
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', '0.2'); r.setAttribute('y', '0.2');
      r.setAttribute('width', '3.0'); r.setAttribute('height', '3.0');
      r.setAttribute('rx', '0.5'); r.setAttribute('ry', '0.5');
      r.setAttribute('stroke-width', '0');
      m.appendChild(r);
    } else if (type === 'cross') {
      // Fixed orientation (no auto-rotate), centered on endpoint
      m.setAttribute('orient', '0');
      m.setAttribute('markerWidth', '3.0'); m.setAttribute('markerHeight', '3.0');
      m.setAttribute('refX', '1.5'); m.setAttribute('refY', '1.5');
      ['M0.3,0.3 L2.7,2.7', 'M2.7,0.3 L0.3,2.7'].forEach(d => {
        const ln = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        ln.setAttribute('d', d); ln.setAttribute('stroke', color);
        ln.setAttribute('stroke-width', '1'); ln.setAttribute('stroke-linecap', 'round');
        ln.setAttribute('fill', 'none');
        m.appendChild(ln);
      });
    }
    defs.appendChild(m);
  }
  makeMarker(conn.id + '_mf', fromMk, true);
  makeMarker(conn.id + '_mt', toMk, false);

  if (conn.animated && dash !== 'solid') {
    const animId = conn.id + '_anim';
    if (!defs.querySelector(`#${animId}`)) {
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.id = animId;
      const off = dash === 'dot' ? sw * 4 : sw * 8;
      style.textContent = `@keyframes conn_march_${conn.id}{from{stroke-dashoffset:${off}}to{stroke-dashoffset:0}}`;
      defs.appendChild(style);
    }
  }

  // Retract path endpoints by marker height so tip touches anchor, body is outside
  // This prevents any line/dash bleeding through the marker body
  function _mkRetract(pt, cpNear, hasMk, mkDist) {
    if (!hasMk || sw <= 0) return pt;
    const tdx = cpNear.x - pt.x, tdy = cpNear.y - pt.y;
    const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
    return { x: pt.x + (tdx / tlen) * sw * mkDist, y: pt.y + (tdy / tlen) * sw * mkDist };
  }
  // Retract distance depends on marker type (in strokeWidth units):
  // arrow=2.771 (tip at anchor), square=3.2 (outer edge at anchor), cross=1.5 (center at anchor)
  // Retract end-of-line so marker far edge sits at element boundary
  // arrow: no retract (tip=refX=2.771 placed at p2, fill covers line) 
  // square: retract 3.0sw (near edge refX=0.2 placed at rp2, far edge at p2)
  // cross:  no retract (center placed at p2)
  function _mkDist(type) {
    if (type === 'arrow')  return 1.386;
    if (type === 'square') return 1.7;
    if (type === 'cross')  return 1.5;
    return 0;
  }
  const rp2 = toMk   !== 'none' ? _mkRetract(p2, conn.cp2, true, _mkDist(toMk))   : p2;
  const rp1 = fromMk !== 'none' ? _mkRetract(p1, conn.cp1, true, _mkDist(fromMk)) : p1;
  const d = _pathD(rp1, conn.cp1, conn.cp2, rp2);
  const effectiveLinecap = (dash === 'dot') ? 'round' : ((fromMk !== 'none' || toMk !== 'none') ? 'butt' : linecap);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', sw);
  path.setAttribute('stroke-linecap', effectiveLinecap);
  path.setAttribute('stroke-linejoin', 'round');
  if (dashArr !== 'none') {
    path.setAttribute('stroke-dasharray', dashArr);
    if (conn.animated) path.style.animation = `conn_march_${conn.id} ${dash === 'dot' ? '1s' : '0.8s'} linear infinite`;
  }
  if (fromMk !== 'none') path.setAttribute('marker-start', `url(#${conn.id}_mf)`);
  if (toMk   !== 'none') path.setAttribute('marker-end',   `url(#${conn.id}_mt)`);

  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  hit.setAttribute('d', d);
  hit.setAttribute('fill', 'none');
  hit.setAttribute('stroke', 'transparent');
  hit.setAttribute('stroke-width', Math.max(sw + 10, 16));
  hit.style.pointerEvents = 'stroke';
  hit.style.cursor = 'pointer';
  hit.addEventListener('mousedown', e => {
    e.stopPropagation();
    e.preventDefault();
    _selectConn(conn.id);
  });

  g.appendChild(hit);
  g.appendChild(path);
}

// ── Edit handles ──────────────────────────────────────────────────────────
const HANDLE_EP = 14;   // endpoint handle size
const HANDLE_CP = 11;   // control point handle size
let _handleLayer = null;

function _removeHandles() {
  if (_handleLayer) { _handleLayer.remove(); _handleLayer = null; }
}

function _canvasPoint(e) {
  const canvas = document.getElementById('canvas');
  const rect = canvas.getBoundingClientRect();
  // Use actual rendered pixel ratio (handles CSS transform scale correctly)
  const scaleX = rect.width  / (parseInt(canvas.style.width)  || canvas.offsetWidth  || rect.width  || 1);
  const scaleY = rect.height / (parseInt(canvas.style.height) || canvas.offsetHeight || rect.height || 1);
  return {
    x: (e.clientX - rect.left) / scaleX,
    y: (e.clientY - rect.top)  / scaleY,
  };
}

// Draw tangent guide lines (endpoint→cp) in SVG layer
function _refreshTangentLines(conn) {
  const svg = document.getElementById(SVG_LAYER_ID);
  if (!svg) return;
  let tg = svg.querySelector('#conn-tangents');
  if (!tg) {
    tg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tg.id = 'conn-tangents';
    tg.style.pointerEvents = 'none';
    svg.appendChild(tg);
  }
  tg.innerHTML = '';
  const p1 = _getAnchor(conn, 'from');
  const p2 = _getAnchor(conn, 'to');
  if (!conn.cp1 || !conn.cp2) return;

  [[p1, conn.cp1], [p2, conn.cp2]].forEach(([ep, cp]) => {
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('x1', ep.x.toFixed(1)); ln.setAttribute('y1', ep.y.toFixed(1));
    ln.setAttribute('x2', cp.x.toFixed(1)); ln.setAttribute('y2', cp.y.toFixed(1));
    ln.setAttribute('stroke', 'rgba(99,102,241,0.5)');
    ln.setAttribute('stroke-width', '1');
    ln.setAttribute('stroke-dasharray', '4 3');
    tg.appendChild(ln);
  });
}

function _removeTangentLines() {
  document.getElementById(SVG_LAYER_ID)?.querySelector('#conn-tangents')?.remove();
}

function _showHandles(connId) {
  _removeHandles();
  const conn = (slides[cur]?.connectors || []).find(c => c.id === connId);
  if (!conn) return;

  const canvas = document.getElementById('canvas');
  // Compute display scale from actual DOM rect vs logical canvas size
  const _rect = canvas.getBoundingClientRect();
  const scale = _rect.width / (parseInt(canvas.style.width) || canvas.offsetWidth || 1);

  _handleLayer = document.createElement('div');
  _handleLayer.id = 'conn-handles';
  _handleLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:95;';
  canvas.appendChild(_handleLayer);

  // Ensure control points exist
  if (!conn.cp1 || !conn.cp2) {
    const p1 = _getAnchorRaw(conn, 'from');
    const p2 = _getAnchorRaw(conn, 'to');
    const def = _defaultControlPoints(p1, p2);
    conn.cp1 = def.cp1; conn.cp2 = def.cp2;
  }

  function redrawPath() {
    const svg = document.getElementById(SVG_LAYER_ID);
    if (svg) { _renderConnector(conn, svg); _highlightConn(connId); }
    _refreshTangentLines(conn);
  }

  function fullRefresh() {
    redrawPath();
    _removeHandles();
    _showHandles(connId);
  }

  // ── Endpoint handle (circle, snaps to edge midpoints) ─────────────────
  function makeEndpointHandle(which) {
    const p = _getAnchorRaw(conn, which);
    const s = HANDLE_EP;
    const h = document.createElement('div');
    h.className = 'conn-h conn-h-ep';
    h.style.cssText = [
      'position:absolute',
      `left:${(p.x - s / 2).toFixed(1)}px`,
      `top:${(p.y - s / 2).toFixed(1)}px`,
      `width:${s}px`, `height:${s}px`,
      'pointer-events:auto', 'cursor:move', 'z-index:98',
      'background:#6366f1',
      'border-radius:50%',
      'border:2.5px solid #fff',
      'box-shadow:0 2px 6px rgba(0,0,0,0.5)',
      'box-sizing:border-box',
    ].join(';');

    h.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      _handleDragging = true;
      // Store initial endpoint positions for delta calculation
      conn._prevP1 = { ..._getAnchor(conn, 'from') };
      conn._prevP2 = { ..._getAnchor(conn, 'to') };

      canvas.querySelectorAll('.el').forEach(el => el.classList.add('conn-target'));

      // Ghost follows cursor
      const ghost = document.createElement('div');
      ghost.style.cssText = 'position:absolute;width:10px;height:10px;border-radius:50%;background:rgba(99,102,241,0.6);pointer-events:none;z-index:99;transform:translate(-50%,-50%);';
      _handleLayer.appendChild(ghost);

      const onMove = ev => {
        const cp = _canvasPoint(ev);
        const snap = _snapToNearestEdge(cp, null, Math.max(48, (conn.gap || 0) + 48));
        const displayPt = snap ? snap.point : cp;

        // Move ghost
        ghost.style.left = (displayPt.x) + 'px';
        ghost.style.top  = (displayPt.y) + 'px';
        ghost.style.background = snap ? 'rgba(52,211,153,0.9)' : 'rgba(99,102,241,0.6)';

        // Highlight snap target
        canvas.querySelectorAll('.el').forEach(el =>
          el.classList.toggle('conn-snap-active', snap ? el.dataset.id === snap.elId : false));

        // Update anchor live
        if (snap) {
          if (which === 'from') { conn.fromId = snap.elId; conn.fromSide = snap.side; }
          else                  { conn.toId   = snap.elId; conn.toSide   = snap.side; }
        }

        // Move handle div
        h.style.left = (displayPt.x - s / 2).toFixed(1) + 'px';
        h.style.top  = (displayPt.y - s / 2).toFixed(1) + 'px';

        // Recompute control points, preserving manual adjustments
        const np1 = _getAnchor(conn, 'from');
        const np2 = _getAnchor(conn, 'to');
        if (!conn._cpManual) {
          const def = _defaultControlPoints(np1, np2);
          conn.cp1 = def.cp1; conn.cp2 = def.cp2;
        } else {
          // Each CP follows its own endpoint delta rigidly
          const prevP1 = conn._prevP1, prevP2 = conn._prevP2;
          if (prevP1 && conn.cp1) {
            const d1x = np1.x - prevP1.x, d1y = np1.y - prevP1.y;
            conn.cp1 = { x: conn.cp1.x + d1x, y: conn.cp1.y + d1y };
          }
          if (prevP2 && conn.cp2) {
            const d2x = np2.x - prevP2.x, d2y = np2.y - prevP2.y;
            conn.cp2 = { x: conn.cp2.x + d2x, y: conn.cp2.y + d2y };
          }
        }
        // Store current endpoints for next frame delta
        conn._prevP1 = { ...np1 };
        conn._prevP2 = { ...np2 };
        // Re-anchor offsets to new anchor positions after endpoint move
        if (conn._cpManual) {
          if (conn.cp1) conn.cp1offset = { x: conn.cp1.x - np1.x, y: conn.cp1.y - np1.y };
          if (conn.cp2) conn.cp2offset = { x: conn.cp2.x - np2.x, y: conn.cp2.y - np2.y };
        }
        // Update CP handle positions
        _handleLayer.querySelectorAll('.conn-h-cp').forEach((ch, ci) => {
          const cpKey = ci === 0 ? 'cp1' : 'cp2';
          const ncp = conn[cpKey];
          if (ncp) {
            ch.style.left = (ncp.x - HANDLE_CP / 2).toFixed(1) + 'px';
            ch.style.top  = (ncp.y - HANDLE_CP / 2).toFixed(1) + 'px';
          }
        });
        redrawPath();
      };

      const onUp = ev => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        canvas.querySelectorAll('.el').forEach(el =>
          el.classList.remove('conn-target', 'conn-snap-active'));
        ghost.remove();

        const cp = _canvasPoint(ev);
        const snap = _snapToNearestEdge(cp, null, Math.max(48, (conn.gap || 0) + 48));
        if (snap) {
          if (which === 'from') { conn.fromId = snap.elId; conn.fromSide = snap.side; }
          else                  { conn.toId   = snap.elId; conn.toSide   = snap.side; }
          // Do NOT reset _cpManual — preserve user's manual handle adjustments
          // Re-anchor CP offsets to new anchor position
          if (conn._cpManual) {
            const np1 = _getAnchor(conn, 'from');
            const np2 = _getAnchor(conn, 'to');
            if (conn.cp1) conn.cp1offset = { x: conn.cp1.x - np1.x, y: conn.cp1.y - np1.y };
            if (conn.cp2) conn.cp2offset = { x: conn.cp2.x - np2.x, y: conn.cp2.y - np2.y };
          }
        }
        if (!conn._cpManual) {
          const np1 = _getAnchor(conn, 'from');
          const np2 = _getAnchor(conn, 'to');
          const def = _defaultControlPoints(np1, np2);
          conn.cp1 = def.cp1; conn.cp2 = def.cp2;
        }

        _removeTangentLines();
        fullRefresh();
        commitAll();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    return h;
  }

  // ── Control point handle (diamond, free move = Bezier lever) ──────────
  function makeControlHandle(cpKey) {
    const cp = conn[cpKey];
    if (!cp) return null;
    const s = HANDLE_CP;
    const h = document.createElement('div');
    h.className = 'conn-h conn-h-cp';
    h.style.cssText = [
      'position:absolute',
      `left:${(cp.x - s / 2).toFixed(1)}px`,
      `top:${(cp.y - s / 2).toFixed(1)}px`,
      `width:${s}px`, `height:${s}px`,
      'pointer-events:auto', 'cursor:grab', 'z-index:96',
      'background:rgba(245,158,11,0.95)',
      'border-radius:2px',
      'transform:rotate(45deg)',
      'border:2px solid rgba(255,255,255,0.85)',
      'box-shadow:0 1px 4px rgba(0,0,0,0.45)',
      'box-sizing:border-box',
    ].join(';');

    h.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      _handleDragging = true;
      h.style.cursor = 'grabbing';
      _refreshTangentLines(conn);

      const onMove = ev => {
        const pt = _canvasPoint(ev);
        conn[cpKey] = { x: pt.x, y: pt.y };
        conn._cpManual = true;
        // Store offset from respective anchor so it follows element moves/rotation
        const anchorWhich = cpKey === 'cp1' ? 'from' : 'to';
        const anchor = _getAnchorRaw(conn, anchorWhich);
        conn[cpKey + 'offset'] = { x: pt.x - anchor.x, y: pt.y - anchor.y };
        h.style.left = (pt.x - s / 2).toFixed(1) + 'px';
        h.style.top  = (pt.y - s / 2).toFixed(1) + 'px';
        redrawPath();
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        _handleDragging = false;
        h.style.cursor = 'grab';
        _removeTangentLines();
        commitAll();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    return h;
  }

  _handleLayer.appendChild(makeEndpointHandle('from'));
  _handleLayer.appendChild(makeEndpointHandle('to'));
  const cp1h = makeControlHandle('cp1');
  const cp2h = makeControlHandle('cp2');
  if (cp1h) _handleLayer.appendChild(cp1h);
  if (cp2h) _handleLayer.appendChild(cp2h);

  _refreshTangentLines(conn);
}

// ── Render all connectors ──────────────────────────────────────────────────
function renderConnectors() {
  if (!slides || !slides[cur]) return;
  const svg = _ensureSvgLayer();
  const conns = slides[cur].connectors || [];
  _connectors = conns;
  svg.querySelectorAll('[data-conn-id]').forEach(g => {
    if (!conns.find(c => c.id === g.getAttribute('data-conn-id'))) g.remove();
  });
  conns.forEach(conn => _renderConnector(conn, svg));
}

// ── Update connectors when element moves ──────────────────────────────────
function updateConnectorsFor(elId, tx, ty) {
  // Если переданы смещения — временно применяем их для пересчёта якорей
  if(tx !== undefined && ty !== undefined){
    _motionOffsets[elId] = {tx: tx||0, ty: ty||0};
  }
  if (!slides || !slides[cur]) return;
  const conns = (slides[cur].connectors || []).filter(c => c.fromId === elId || c.toId === elId);
  if (!conns.length) return;
  const svg = document.getElementById(SVG_LAYER_ID);
  if (!svg) return;
  conns.forEach(conn => {
    if (!conn._cpManual) {
      const p1 = _getAnchor(conn, 'from');
      const p2 = _getAnchor(conn, 'to');
      const def = _defaultControlPoints(p1, p2);
      conn.cp1 = def.cp1; conn.cp2 = def.cp2;
    } else {
      // Recompute absolute cp from stored offset + current (possibly rotated) anchor
      const a1 = _getAnchorRaw(conn, 'from');
      const a2 = _getAnchorRaw(conn, 'to');
      if (conn.cp1offset) conn.cp1 = { x: a1.x + conn.cp1offset.x, y: a1.y + conn.cp1offset.y };
      if (conn.cp2offset) conn.cp2 = { x: a2.x + conn.cp2offset.x, y: a2.y + conn.cp2offset.y };
    }
    _renderConnector(conn, svg);
  });
  if (_selConnId && conns.find(c => c.id === _selConnId)) {
    _highlightConn(_selConnId);
    // Update CP handle positions in-place (no flicker), fall back to full rebuild
    const selConn = conns.find(c => c.id === _selConnId);
    if (selConn && _handleLayer) {
      const canvas = document.getElementById('canvas');
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / (parseInt(canvas.style.width) || canvas.offsetWidth || 1);
      // Update endpoint handles
      _handleLayer.querySelectorAll('.conn-h-ep').forEach((h, hi) => {
        const which = hi === 0 ? 'from' : 'to';
        const raw = _getAnchorRaw(selConn, which);
        h.style.left = (raw.x - HANDLE_EP / 2).toFixed(1) + 'px';
        h.style.top  = (raw.y - HANDLE_EP / 2).toFixed(1) + 'px';
      });
      // Update CP handles
      _handleLayer.querySelectorAll('.conn-h-cp').forEach((h, ci) => {
        const cp = selConn[ci === 0 ? 'cp1' : 'cp2'];
        if (cp) {
          h.style.left = (cp.x - HANDLE_CP / 2).toFixed(1) + 'px';
          h.style.top  = (cp.y - HANDLE_CP / 2).toFixed(1) + 'px';
        }
      });
      // Update tangent lines
      _refreshTangentLines(selConn);
    } else {
      _removeHandles();
      _showHandles(_selConnId);
    }
  }
}

// MutationObserver for element moves
let _mo = null;
function _startObserver() {
  if (_mo) return;
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  _mo = new MutationObserver(mutations => {
    const seen = new Set();
    mutations.forEach(m => {
      if (m.type === 'attributes' && m.attributeName === 'style') {
        const el = m.target;
        if (el.classList && el.classList.contains('el')) {
          const id = el.dataset.id;
          if (id && !seen.has(id)) { seen.add(id); updateConnectorsFor(id); }
        }
      }
    });
  });
  _mo.observe(canvas, { attributes: true, subtree: true, attributeFilter: ['style', 'data-rot'] });
}

// ── Connect mode ──────────────────────────────────────────────────────────
window._connectorModeActive = function() { return _connStep > 0; };

window.startConnectorMode = function(type) {
  if (_connStep > 0 && _connMode === type) { _cancelConnMode(); return; }
  _connMode = type; _connStep = 1; _connFrom = null;
  document.body.style.cursor = 'crosshair';
  document.querySelectorAll('#canvas .el').forEach(el => el.classList.add('conn-target'));
  document.getElementById('conn-btn-line')?.classList.toggle('active', type === 'line');
  toast('Нажмите на первый объект для соединения');
  document.addEventListener('keydown', _connEsc);
};

function _connEsc(e) {
  if (e.key !== 'Escape') return;
  if (document.querySelector('#canvas .el[data-editing="true"]')) return;
  if (_connStep > 0) _cancelConnMode();
}

function _cancelConnMode() {
  _connMode = null; _connStep = 0; _connFrom = null;
  document.body.style.cursor = '';
  document.querySelectorAll('#canvas .el').forEach(el =>
    el.classList.remove('conn-target', 'conn-source'));
  document.removeEventListener('keydown', _connEsc);
  document.querySelectorAll('.conn-mode-btn').forEach(b => b.classList.remove('active'));
}

function _pruneConnectors() {
  if (!slides[cur]) return;
  const conns = slides[cur].connectors;
  if (!conns || !conns.length) return;
  const existing = new Set(
    Array.from(document.querySelectorAll('#canvas .el')).map(e => e.dataset.id));
  const before = conns.length;
  slides[cur].connectors = conns.filter(c => existing.has(c.fromId) && existing.has(c.toId));
  if (slides[cur].connectors.length !== before) renderConnectors();
}

document.addEventListener('_connPrune', _pruneConnectors);

const _origDeleteSelected = window.deleteSelected;
if (typeof _origDeleteSelected === 'function') {
  window.deleteSelected = function(...args) {
    const r = _origDeleteSelected.apply(this, args);
    _pruneConnectors();
    return r;
  };
}

document.addEventListener('click', e => {
  if (!_connStep) return;
  const canvas = document.getElementById('canvas');
  if (!canvas.contains(e.target)) { _cancelConnMode(); return; }
  const el = e.target.closest('#canvas .el');
  if (!el) return;
  e.stopPropagation();
  if (_connStep === 1) {
    _connFrom = el.dataset.id; _connStep = 2;
    el.classList.add('conn-source'); el.classList.remove('conn-target');
    toast('Теперь нажмите на второй объект');
  } else if (_connStep === 2 && el.dataset.id !== _connFrom) {
    _addConnector(_connFrom, el.dataset.id, _connMode);
    _connFrom = null; _connStep = 1;
    document.querySelectorAll('#canvas .el').forEach(e2 => {
      e2.classList.remove('conn-source'); e2.classList.add('conn-target');
    });
    toast('Нажмите на следующий объект или Esc для выхода');
  }
}, true);

function _defaultColorAndScheme() {
  try {
    const idx = (typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0) ? appliedThemeIdx
              : (typeof selTheme !== 'undefined' && selTheme >= 0) ? selTheme : -1;
    if (idx >= 0 && THEMES[idx]) {
      const scheme = { col: 0, row: 0 };
      const color = _resolveSchemeColor(scheme, THEMES[idx]);
      return { color: color || _themeColors(THEMES[idx])[0], colorScheme: scheme };
    }
  } catch(e) {}
  return { color: '#60a5fa', colorScheme: { col: 0, row: 0 } };
}

function _addConnector(fromId, toId, type) {
  if (!slides[cur]) return;
  if (!slides[cur].connectors) slides[cur].connectors = [];
  // Если связь между этими объектами уже есть — удаляем её
  const existing = slides[cur].connectors.findIndex(
    c => (c.fromId === fromId && c.toId === toId) ||
         (c.fromId === toId   && c.toId === fromId)
  );
  if (existing >= 0) {
    const removedId = slides[cur].connectors[existing].id;
    slides[cur].connectors.splice(existing, 1);
    const svg = document.getElementById(SVG_LAYER_ID);
    if (svg) svg.querySelector(`[data-conn-id="${removedId}"]`)?.remove();
    _connectors = slides[cur].connectors;
    renderConnectors();
    commitAll();
    toast('Связь удалена');
    return;
  }
  const { color, colorScheme } = _defaultColorAndScheme();
  const fromSide = _getAnchorSide(fromId, toId).side;
  const toSide   = _getAnchorSide(toId, fromId).side;
  const conn = {
    id: _connId(), type, fromId, toId, fromSide, toSide,
    color, colorScheme, sw: 2, dash: 'solid',
    fromMarker: 'none', toMarker: type === 'arrow' ? 'arrow' : 'none',
    cp1offset: null, cp2offset: null,
    fromAnchor: 'edge', toAnchor: 'edge', _cpManual: false,
  };
  slides[cur].connectors.push(conn);
  _connectors = slides[cur].connectors;
  renderConnectors();
  commitAll();
}

// ── Selection ──────────────────────────────────────────────────────────────
let _selConnId = null;
let _selConnHighlight = null;
let _handleDragging = false; // true while any handle is being dragged

function _selectConn(id) {
  if (sel) { sel.classList.remove('sel'); sel = null; }
  if (typeof _rotEl !== 'undefined' && _rotEl) { _rotEl = null; const _ov=document.getElementById('handles-overlay'); if(_ov) _ov.innerHTML=''; }
  _selConnId = id;
  _highlightConn(id);
  _showConnProps(id);
  _showHandles(id);
}

function _deselectConn() {
  _selConnId = null;
  _removeHandles();
  _removeTangentLines();
  if (_selConnHighlight) { _selConnHighlight.remove(); _selConnHighlight = null; }
  ['connprops','elprops'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  const ns = document.getElementById('nosel'); if (ns) ns.style.display = 'block';
  const sp = document.getElementById('slide-props'); if (sp) sp.style.display = 'block';
  const spn = document.getElementById('slide-props-pn'); if (spn) spn.style.display = 'block';
}

function _highlightConn(id) {
  if (_selConnHighlight) _selConnHighlight.remove();
  const svg = document.getElementById(SVG_LAYER_ID);
  if (!svg) return;
  const g = svg.querySelector(`[data-conn-id="${id}"]`);
  if (!g) return;
  const paths = g.querySelectorAll('path');
  const visPath = paths[paths.length - 1];
  if (!visPath) return;
  const hl = visPath.cloneNode();
  hl.setAttribute('stroke', '#fff');
  hl.setAttribute('stroke-width', (+visPath.getAttribute('stroke-width') + 4));
  hl.setAttribute('stroke-dasharray', 'none');
  hl.setAttribute('opacity', '0.35');
  hl.removeAttribute('marker-start'); hl.removeAttribute('marker-end');
  hl.style.pointerEvents = 'none';
  g.insertBefore(hl, g.firstChild);
  _selConnHighlight = hl;
}

function _showConnProps(id) {
  const conn = (slides[cur]?.connectors || []).find(c => c.id === id);
  if (!conn) return;
  document.getElementById('elprops').style.display = 'none';
  document.getElementById('nosel').style.display = 'none';
  const sp = document.getElementById('slide-props'); if (sp) sp.style.display = 'none';
  const spn = document.getElementById('slide-props-pn'); if (spn) spn.style.display = 'none';
  const panel = document.getElementById('connprops');
  if (!panel) return;
  panel.style.display = 'flex'; panel.style.flexDirection = 'column';
  const _g = id => document.getElementById(id);
  if (_g('cp-color-swatch')) _g('cp-color-swatch').style.background = conn.color || '#60a5fa';
  if (_g('cp-sw'))   _g('cp-sw').value   = conn.sw  || 2;
  if (_g('cp-gap'))  _g('cp-gap').value  = conn.gap || 0;
  if (_g('cp-dash')) _g('cp-dash').value = conn.dash || 'solid';
  if (_g('cp-anim')) _g('cp-anim').checked = !!conn.animated;
  _updateMarkerButtons('from', conn.fromMarker || 'none');
  _updateMarkerButtons('to',   conn.toMarker   || 'none');
  const opEl2 = _g('cp-opacity'); if (opEl2) opEl2.value = conn.opacity != null ? Math.round(conn.opacity * 100) : 100;
}

window.cpSetColor = function(hex, schemeRef) {
  const conn = _getSelConn(); if (!conn) return;
  conn.color = hex; conn.colorScheme = schemeRef || null;
  const sw = document.getElementById('cp-color-swatch');
  const hx = document.getElementById('cp-color-hex');
  if (sw) sw.style.background = hex;
  if (hx) hx.value = hex;
  // Update SVG path color directly for immediate visual feedback
  const svg = document.getElementById(SVG_LAYER_ID);
  if (svg) {
    const g = svg.querySelector(`[data-conn-id="${conn.id}"]`);
    if (g) {
      g.querySelectorAll('path[stroke]:not([stroke="transparent"])').forEach(p => {
        p.setAttribute('stroke', hex);
      });
      // Update markers color
      svg.querySelectorAll(`[id^="${conn.id}_"] path, [id^="${conn.id}_"] polygon`).forEach(p => {
        if (p.getAttribute('fill') && p.getAttribute('fill') !== 'none') p.setAttribute('fill', hex);
        if (p.getAttribute('stroke') && p.getAttribute('stroke') !== 'none') p.setAttribute('stroke', hex);
      });
    }
  }
  _rerender();
  if (typeof saveState === 'function') saveState();
};
window.cpUpdate = function() {
  const conn = _getSelConn(); if (!conn) return;
  const opEl = document.getElementById('cp-opacity');
  if (opEl) conn.opacity = Math.round(opEl.value) / 100;
  const _opEl = document.getElementById('cp-opacity');
  if (_opEl) conn.opacity = +_opEl.value / 100;
  conn.sw         = +document.getElementById('cp-sw').value || 2;
  conn.gap        = +document.getElementById('cp-gap').value || 0;
  conn.dash       = document.getElementById('cp-dash').value;
  conn.animated   = document.getElementById('cp-anim').checked;
  // markers are set via cpSetMarker buttons — read from dataset
  const fmEl = document.querySelector('#cp-marker-from .mk-btn.active');
  const tmEl = document.querySelector('#cp-marker-to .mk-btn.active');
  conn.fromMarker = fmEl ? fmEl.dataset.mk : 'none';
  conn.toMarker   = tmEl ? tmEl.dataset.mk : 'none';
  // Recompute CPs from new gap positions so handles stay aligned
  if (!conn._cpManual) {
    const np1 = _getAnchor(conn, 'from');
    const np2 = _getAnchor(conn, 'to');
    const def = _defaultControlPoints(np1, np2);
    conn.cp1 = def.cp1; conn.cp2 = def.cp2;
    conn.cp1offset = null; conn.cp2offset = null;
  }
  _rerender();
};
window.cpColorHex = function(val) {
  if (/^#[0-9a-fA-F]{6}$/.test(val)) window.cpSetColor(val);
};
window.cpDelete = function() {
  if (!_selConnId || !slides[cur]) return;
  slides[cur].connectors = (slides[cur].connectors || []).filter(c => c.id !== _selConnId);
  const svg = document.getElementById(SVG_LAYER_ID);
  if (svg) {
    svg.querySelector(`[data-conn-id="${_selConnId}"]`)?.remove();
    svg.querySelector('#conn-tangents')?.remove();
  }
  _deselectConn();
  // Сбрасываем sel чтобы 21-keyboard.js не удалил объект вместе с линией
  if (typeof sel !== 'undefined' && sel) {
    sel.classList.remove('sel');
    sel = null;
    if (typeof syncProps === 'function') syncProps();
  }
  commitAll();
};

function _getSelConn() {
  if (!_selConnId || !slides[cur]) return null;
  return (slides[cur].connectors || []).find(c => c.id === _selConnId) || null;
}
function _rerender() {
  const svg = document.getElementById(SVG_LAYER_ID);
  if (!svg) return;
  const conn = _getSelConn();
  if (conn) {
    _renderConnector(conn, svg);
    _highlightConn(conn.id);
    _removeHandles();
    _showHandles(conn.id);
  }
}

document.addEventListener('mousedown', e => {
  if (!_selConnId) return;
  if (_handleDragging) return;
  if (!e.target.closest('[data-conn-id]') && !e.target.closest('#connprops') &&
      !e.target.closest('#conn-handles'))
    _deselectConn();
});

const _origApplyTheme = window.applyTheme;
if (typeof _origApplyTheme === 'function') {
  window.applyTheme = function(...args) {
    const r = _origApplyTheme.apply(this, args);
    const idx = typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0 ? appliedThemeIdx : -1;
    if (idx >= 0 && THEMES[idx]) {
      slides.forEach(s => (s.connectors || []).forEach(conn => {
        if (conn.colorScheme) { const c = _resolveSchemeColor(conn.colorScheme, THEMES[idx]); if (c) conn.color = c; }
      }));
      renderConnectors();
    }
    return r;
  };
}
const _origLoad = window.load;
if (typeof _origLoad === 'function') {
  window.load = function(...args) { const r = _origLoad.apply(this, args); setTimeout(renderConnectors, 0); return r; };
}
const _origCommitAll = window.commitAll;
if (typeof _origCommitAll === 'function') {
  window.commitAll = function(...args) { const r = _origCommitAll.apply(this, args); renderConnectors(); return r; };
}
const _origGoSlide = window.goSlide;
if (typeof _origGoSlide === 'function') {
  window.goSlide = function(...args) { const r = _origGoSlide.apply(this, args); _deselectConn(); setTimeout(renderConnectors, 30); return r; };
}

window.renderConnectors = renderConnectors;
window.updateConnectorsFor = updateConnectorsFor;

document.addEventListener('keydown', e => {
  if (!_selConnId) return;
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    e.stopPropagation(); // не даём 21-keyboard.js удалить объект
    window.cpDelete();
  }
}, true); // capture=true — срабатываем раньше других

// ── Marker button UI ──────────────────────────────────────────────────────

const _MARKER_TYPES = ['none', 'arrow', 'square', 'cross'];

// SVG icons for each marker type (displayed in 28×28 viewBox)
const _MARKER_SVGS = {
  none: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="14" x2="24" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  arrow: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="14" x2="17" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M16.5,12.1 Q20,14 16.5,15.9 L13.2,17.8 Q10,19.5 10,17.2 L10,10.8 Q10,8.5 13.2,10.2 Z" fill="currentColor" stroke="none"/>
  </svg>`,
  square: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <rect x="18" y="9" width="10" height="10" rx="1" stroke="currentColor" stroke-width="2" fill="currentColor" opacity="0.25"/>
  </svg>`,
  cross: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="14" x2="17" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="19" y1="8" x2="25" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="25" y1="8" x2="19" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
};

function _updateMarkerButtons(side, value) {
  const group = document.getElementById('cp-marker-' + side);
  if (!group) return;
  group.querySelectorAll('.mk-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mk === value);
  });
}

function _injectMarkerButtons() {
  // Replace cp-from-marker and cp-to-marker <select> elements with button groups
  ['from', 'to'].forEach(side => {
    const sel = document.getElementById('cp-' + side + '-marker');
    if (!sel) return;
    const group = document.createElement('div');
    group.id = 'cp-marker-' + side;
    group.style.cssText = 'display:flex;gap:3px;flex-wrap:nowrap;';
    _MARKER_TYPES.forEach(mk => {
      const btn = document.createElement('button');
      btn.className = 'mk-btn';
      btn.dataset.mk = mk;
      btn.title = mk;
      btn.style.cssText = [
        'width:34px;height:34px;border-radius:6px;border:1.5px solid transparent;',
        'background:transparent;cursor:pointer;display:flex;align-items:center;',
        'justify-content:center;padding:3px;flex-shrink:0;transition:background .12s,border-color .12s;',
        'color:var(--text,#1e293b);',
      ].join('');
      btn.innerHTML = _MARKER_SVGS[mk];
      btn.addEventListener('click', () => {
        const conn = _getSelConn(); if (!conn) return;
        if (side === 'from') conn.fromMarker = mk;
        else                  conn.toMarker   = mk;
        _updateMarkerButtons(side, mk);
        _rerender();
        if (typeof commitAll === 'function') commitAll();
      });
      // Hover style
      btn.addEventListener('mouseenter', () => {
        if (!btn.classList.contains('active'))
          btn.style.background = 'var(--hover-bg,rgba(0,0,0,.07))';
      });
      btn.addEventListener('mouseleave', () => {
        if (!btn.classList.contains('active'))
          btn.style.background = 'transparent';
      });
      group.appendChild(btn);
    });
    sel.parentNode.replaceChild(group, sel);
  });

  // Inject active-state CSS once
  if (!document.getElementById('mk-btn-style')) {
    const st = document.createElement('style');
    st.id = 'mk-btn-style';
    st.textContent = `
      .mk-btn.active {
        background: var(--accent, #6366f1) !important;
        border-color: var(--accent, #6366f1) !important;
        color: #fff !important;
      }
      .mk-btn svg { width:100%;height:100%;display:block; }
    `;
    document.head.appendChild(st);
  }
}

document.addEventListener('DOMContentLoaded', () => { _ensureSvgLayer(); _startObserver(); _injectMarkerButtons(); setTimeout(renderConnectors, 200); });
if (document.readyState !== 'loading') {
  setTimeout(() => { _ensureSvgLayer(); _startObserver(); _injectMarkerButtons(); renderConnectors(); }, 300);
}

})();

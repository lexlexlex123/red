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
      'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:5;');
    canvas.appendChild(svg);
    svg.innerHTML = '<defs></defs>';
  } else if ((svg.style.zIndex || '') !== '5') {
    svg.style.zIndex = '5';
  }
  return svg;
}

function _connId() { return 'cn' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }

// ── Edge midpoints: 4 cardinal sides, rotated around element center ─────────
function _edgeMidpoints(elId, includeCenter) {
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
  const pts = [
    { ...top,    side: 'top',    ...rotDir( 0, -1) },
    { ...right,  side: 'right',  ...rotDir( 1,  0) },
    { ...bottom, side: 'bottom', ...rotDir( 0,  1) },
    { ...left,   side: 'left',   ...rotDir(-1,  0) },
  ];
  // Optional 5th anchor: dead-center of the object (no outward push/normal).
  if (includeCenter) pts.push({ x: cx, y: cy, side: 'center', nx: 0, ny: 0 });
  return pts;
}

// Returns closest edge midpoint of elId toward a target point or other element
function _getAnchorSide(elId, otherElId, overridePt, includeCenter) {
  const mids = _edgeMidpoints(elId, includeCenter);
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

// Snap canvas point to nearest edge midpoint (or center, if allowed) within threshold
function _snapToNearestEdge(canvasPt, excludeElId, threshold, includeCenter) {
  threshold = threshold || 44;
  const canvas = document.getElementById('canvas');
  let best = null, bestDist = Infinity;
  canvas.querySelectorAll('.el').forEach(el => {
    if (el.dataset.id === excludeElId) return;
    const mids = _edgeMidpoints(el.dataset.id, includeCenter);
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
  center: { x:  0, y:  0 },
};

// Get anchor point on object edge (no gap)
function _getAnchor(conn, which) {
  return _getAnchorRaw(conn, which);
}

// Retract both endpoints inward along the line between raw anchors (straight route)
function _applyLineGap(raw1, raw2, gap) {
  gap = gap || 0;
  if (!gap) return { p1: raw1, p2: raw2 };
  const dx = raw2.x - raw1.x, dy = raw2.y - raw1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return { p1: raw1, p2: raw2 };
  const g = Math.min(gap, len / 2);
  const ux = dx / len, uy = dy / len;
  return {
    p1: { x: raw1.x + ux * g, y: raw1.y + uy * g, side: raw1.side, nx: raw1.nx, ny: raw1.ny },
    p2: { x: raw2.x - ux * g, y: raw2.y - uy * g, side: raw2.side, nx: raw2.nx, ny: raw2.ny },
  };
}

// Push anchor outward along edge normal (curve / orthogonal routes)
function _applySideGap(raw, gap) {
  if (!gap) return raw;
  const nx = raw.nx != null ? raw.nx : (_SIDE_NORMAL[raw.side] || { x: 0, y: 0 }).x;
  const ny = raw.ny != null ? raw.ny : (_SIDE_NORMAL[raw.side] || { x: 0, y: 0 }).y;
  return { x: raw.x + nx * gap, y: raw.y + ny * gap, side: raw.side, nx, ny };
}

function _getAnchorPair(conn) {
  const raw1 = _getAnchorRaw(conn, 'from');
  const raw2 = _getAnchorRaw(conn, 'to');
  const gap = conn.gap || 0;
  if ((conn.route || 'curve') === 'straight') return _applyLineGap(raw1, raw2, gap);
  return { p1: _applySideGap(raw1, gap), p2: _applySideGap(raw2, gap) };
}

// Get raw anchor WITHOUT gap (used for handle display and snapping)
function _getAnchorRaw(conn, which) {
  const elId    = which === 'from' ? conn.fromId   : conn.toId;
  const sideKey = which === 'from' ? 'fromSide'    : 'toSide';
  const otherId = which === 'from' ? conn.toId     : conn.fromId;
  const includeCenter = true;
  const mids = _edgeMidpoints(elId, includeCenter);
  if (!mids) return { x: 0, y: 0 };
  const stored = conn[sideKey];
  let m = stored ? mids.find(p => p.side === stored) : null;
  if (!m) m = _getAnchorSide(elId, otherId, null, includeCenter);
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

// ── Orthogonal (step) route ────────────────────────────────────────────────
function _orthogonalPoints(p1, p2, fromSide, toSide) {
  const hFrom = fromSide === 'left' || fromSide === 'right';
  const hTo = toSide === 'left' || toSide === 'right';
  if (hFrom && hTo) {
    const midX = (p1.x + p2.x) / 2;
    return [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2];
  }
  if (!hFrom && !hTo) {
    const midY = (p1.y + p2.y) / 2;
    return [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2];
  }
  if (hFrom) return [p1, { x: p2.x, y: p1.y }, p2];
  return [p1, { x: p1.x, y: p2.y }, p2];
}

function _orthogonalPathD(pts) {
  return pts.map((p, i) =>
    (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)
  ).join(' ');
}

function _straightPathD(p1, p2) {
  return `M${p1.x.toFixed(1)},${p1.y.toFixed(1)} L${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
}

// ── Render one connector ───────────────────────────────────────────────────
function _renderConnector(conn, svg) {
  const { p1, p2 } = _getAnchorPair(conn);
  const route = conn.route || 'curve';

  if (route === 'curve' && (!conn.cp1 || !conn.cp2)) {
    const def = _defaultControlPoints(p1, p2);
    conn.cp1 = def.cp1; conn.cp2 = def.cp2;
  }

  let g = svg.querySelector(`[data-conn-id="${conn.id}"]`);
  if (!g) {
    g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-conn-id', conn.id);
    svg.appendChild(g);
  }
  g.setAttribute('opacity', conn.objHidden ? 0 : (conn.opacity != null ? conn.opacity : 1));
  g.style.display = conn.objHidden ? 'none' : '';
  while (g.firstChild) g.removeChild(g.firstChild);

  const color  = (conn.color === 'none' || conn.color === 'transparent') ? 'none' : (conn.color || '#60a5fa');
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
    } else if (type === 'circle') {
      // Filled circle, centered on the endpoint
      m.setAttribute('markerWidth', '3.0'); m.setAttribute('markerHeight', '3.0');
      m.setAttribute('refX', '1.5'); m.setAttribute('refY', '1.5');
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', '1.5'); c.setAttribute('cy', '1.5'); c.setAttribute('r', '1.3');
      c.setAttribute('stroke-width', '0');
      m.appendChild(c);
    } else if (type === 'bar') {
      // Single tick perpendicular to the line — orient=auto (inherited
      // default) rotates the marker to align with the path direction, so a
      // vertical stroke in marker-local space ends up crossing the line
      // at a right angle, right where the path ends.
      m.setAttribute('markerWidth', '3.0'); m.setAttribute('markerHeight', '3.0');
      m.setAttribute('refX', '1.5'); m.setAttribute('refY', '1.5');
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      ln.setAttribute('d', 'M1.5,0.2 L1.5,2.8');
      ln.setAttribute('stroke', color);
      ln.setAttribute('stroke-width', '1');
      ln.setAttribute('stroke-linecap', 'round');
      ln.setAttribute('fill', 'none');
      m.appendChild(ln);
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
      const from = conn.animInvert ? 0 : off;
      const to   = conn.animInvert ? off : 0;
      style.textContent = `@keyframes conn_march_${conn.id}{from{stroke-dashoffset:${from}}to{stroke-dashoffset:${to}}}`;
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
    if (type === 'circle') return 1.5;
    if (type === 'bar')    return 1.5;
    if (type === 'cross')  return 1.5;
    return 0;
  }
  let d;
  if (route === 'orthogonal') {
    const pts = _orthogonalPoints(p1, p2, conn.fromSide, conn.toSide);
    const rp2 = toMk   !== 'none' ? _mkRetract(pts[pts.length - 1], pts[pts.length - 2], true, _mkDist(toMk))   : pts[pts.length - 1];
    const rp1 = fromMk !== 'none' ? _mkRetract(pts[0], pts[1], true, _mkDist(fromMk)) : pts[0];
    d = _orthogonalPathD([rp1, ...pts.slice(1, -1), rp2]);
  } else if (route === 'straight') {
    const rp2 = toMk   !== 'none' ? _mkRetract(p2, p1, true, _mkDist(toMk))   : p2;
    const rp1 = fromMk !== 'none' ? _mkRetract(p1, p2, true, _mkDist(fromMk)) : p1;
    d = _straightPathD(rp1, rp2);
  } else {
    const rp2 = toMk   !== 'none' ? _mkRetract(p2, conn.cp2, true, _mkDist(toMk))   : p2;
    const rp1 = fromMk !== 'none' ? _mkRetract(p1, conn.cp1, true, _mkDist(fromMk)) : p1;
    d = _pathD(rp1, conn.cp1, conn.cp2, rp2);
  }
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
  hit.setAttribute('class', 'conn-hit');
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
  document.querySelectorAll('#conn-handles').forEach(n => n.remove());
}

function _clearConnSelectionVisuals() {
  _removeHandles();
  _removeTangentLines();
  if (_selConnHighlight) { _selConnHighlight.remove(); _selConnHighlight = null; }
  document.getElementById(SVG_LAYER_ID)?.querySelectorAll('.conn-sel-hl').forEach(n => n.remove());
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
  const { p1, p2 } = _getAnchorPair(conn);
  if ((conn.route || 'curve') !== 'curve' || !conn.cp1 || !conn.cp2) return;

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

  const isCurve = (conn.route || 'curve') === 'curve';

  // Ensure control points exist (curve mode only)
  if (isCurve && (!conn.cp1 || !conn.cp2)) {
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
      conn._prevP1 = { ..._getAnchorPair(conn).p1 };
      conn._prevP2 = { ..._getAnchorPair(conn).p2 };

      canvas.querySelectorAll('.el').forEach(el => el.classList.add('conn-target'));

      // Ghost follows cursor
      const ghost = document.createElement('div');
      ghost.style.cssText = 'position:absolute;width:10px;height:10px;border-radius:50%;background:rgba(99,102,241,0.6);pointer-events:none;z-index:99;transform:translate(-50%,-50%);';
      _handleLayer.appendChild(ghost);

      const onMove = ev => {
        const cp = _canvasPoint(ev);
        const snap = _snapToNearestEdge(cp, null, Math.max(48, (conn.gap || 0) + 48), true);
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

        // Recompute control points, preserving manual adjustments (curve mode only)
        const { p1: np1, p2: np2 } = _getAnchorPair(conn);
        if ((conn.route || 'curve') === 'curve') {
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
        }
        // Store current endpoints for next frame delta
        conn._prevP1 = { ...np1 };
        conn._prevP2 = { ...np2 };
        redrawPath();
      };

      const onUp = ev => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        canvas.querySelectorAll('.el').forEach(el =>
          el.classList.remove('conn-target', 'conn-snap-active'));
        ghost.remove();

        const cp = _canvasPoint(ev);
        const snap = _snapToNearestEdge(cp, null, Math.max(48, (conn.gap || 0) + 48), true);
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
        if ((conn.route || 'curve') === 'curve' && !conn._cpManual) {
          const { p1: np1, p2: np2 } = _getAnchorPair(conn);
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
  if (isCurve) {
    const cp1h = makeControlHandle('cp1');
    const cp2h = makeControlHandle('cp2');
    if (cp1h) _handleLayer.appendChild(cp1h);
    if (cp2h) _handleLayer.appendChild(cp2h);
    _refreshTangentLines(conn);
  }
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
  conns.forEach(conn => {
    _renderConnector(conn, svg);
    _connSyncRiderPosition(conn);
  });
  if (_selConnId) _highlightConn(_selConnId);
  else document.getElementById(SVG_LAYER_ID)?.querySelectorAll('.conn-sel-hl').forEach(n => n.remove());
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
    if ((conn.route || 'curve') !== 'curve') {
      // orthogonal — no control points to update
    } else if (!conn._cpManual) {
      const { p1, p2 } = _getAnchorPair(conn);
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
    _connSyncRiderPosition(conn);
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
  const removed = conns.filter(c => !existing.has(c.fromId) || !existing.has(c.toId));
  removed.forEach(c => { if (typeof _connDeleteRiders === 'function') _connDeleteRiders(c.id); });
  slides[cur].connectors = conns.filter(c => existing.has(c.fromId) && existing.has(c.toId));
  if (slides[cur].connectors.length !== before) renderConnectors();
}

document.addEventListener('_connPrune', _pruneConnectors);

const _origDeleteSelected = window.deleteSelected;
if (typeof _origDeleteSelected === 'function') {
  window.deleteSelected = function(...args) {
    const r = _origDeleteSelected.apply(this, args);
    _pruneConnectors();
    try {
      const cid = (typeof window._getSelConnId === 'function') ? window._getSelConnId() : null;
      if (cid && typeof _connSyncRideUI === 'function') _connSyncRideUI(cid);
    } catch (e) {}
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
  if (typeof window._blurActiveShapeText === 'function') window._blurActiveShapeText();
  if (sel) { sel.classList.remove('sel'); sel = null; }
  if (typeof multiSel !== 'undefined' && multiSel) {
    try { if (typeof clearMultiSel === 'function') clearMultiSel(); } catch (e) {}
  }
  if (typeof _rotEl !== 'undefined' && _rotEl) { _rotEl = null; const _ov=document.getElementById('handles-overlay'); if(_ov) _ov.innerHTML=''; }
  if (typeof _updateSelFrames === 'function') _updateSelFrames();
  _selConnId = id;
  _highlightConn(id);
  _showConnProps(id);
  _showHandles(id);
  if (typeof renderObjectsPanel === 'function') renderObjectsPanel();
}
window._selectConn = _selectConn;

function _deselectConn(restorePanel = true) {
  _selConnId = null;
  _clearConnSelectionVisuals();
  const cp = document.getElementById('connprops');
  if (cp) cp.style.display = 'none';
  if (restorePanel) {
    const ep = document.getElementById('elprops'); if (ep) ep.style.display = 'none';
    const ns = document.getElementById('nosel'); if (ns) ns.style.display = 'block';
    const sp = document.getElementById('slide-props'); if (sp) sp.style.display = 'block';
  }
  if (typeof renderObjectsPanel === 'function') renderObjectsPanel();
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
  hl.classList.add('conn-sel-hl');
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
  const panel = document.getElementById('connprops');
  if (!panel) return;
  panel.style.display = 'flex'; panel.style.flexDirection = 'column';
  const _g = id => document.getElementById(id);
  if (_g('cp-color-swatch') || _g('cp-color-hex')) {
    const col = (conn.color && conn.color !== 'none' && conn.color !== 'transparent') ? conn.color : '';
    if (typeof _setColorFieldValue === 'function') {
      _setColorFieldValue('cp-color-hex', 'cp-color-swatch', col, conn.colorScheme || null);
      if (!col && _g('cp-color-swatch')) _g('cp-color-swatch').style.background = 'transparent';
    } else {
      if (_g('cp-color-swatch')) _g('cp-color-swatch').style.background = col || 'transparent';
      if (_g('cp-color-hex')) _g('cp-color-hex').value = col || '';
    }
  }
  if (_g('cp-sw'))   _g('cp-sw').value   = conn.sw  || 2;
  if (_g('cp-gap'))  _g('cp-gap').value  = conn.gap || 0;
  if (_g('cp-dash')) _g('cp-dash').value = conn.dash || 'solid';
  if (_g('cp-route')) _g('cp-route').value = conn.route || 'curve';
  if (_g('cp-anim')) _g('cp-anim').checked = !!conn.animated;
  if (_g('cp-anim-invert')) _g('cp-anim-invert').checked = !!conn.animInvert;
  const _hasRider = !!(slides[cur] && slides[cur].els.find(e => e.rideConnId === conn.id));
  if (_g('cp-anim-invert-row')) _g('cp-anim-invert-row').style.display = (conn.animated || _hasRider) ? 'flex' : 'none';
  _connSyncRideUI(conn.id);
  _updateMarkerButtons('from', conn.fromMarker || 'none');
  _updateMarkerButtons('to',   conn.toMarker   || 'none');
  const opEl2 = _g('cp-opacity'); if (opEl2) opEl2.value = conn.opacity != null ? Math.round(conn.opacity * 100) : 100;
  if (typeof _connSyncRideUI === 'function') _connSyncRideUI(id);
}

window.cpSetColor = function(hex, schemeRef) {
  const conn = _getSelConn(); if (!conn) return;
  const isClear = !hex || hex === 'none' || hex === 'transparent';
  conn.color = isClear ? 'none' : hex;
  conn.colorScheme = isClear ? null : (schemeRef || null);
  const sw = document.getElementById('cp-color-swatch');
  const hx = document.getElementById('cp-color-hex');
  if (typeof _setColorFieldValue === 'function') {
    _setColorFieldValue('cp-color-hex', 'cp-color-swatch', isClear ? '' : hex, conn.colorScheme);
    if (isClear && sw) sw.style.background = 'transparent';
  } else {
    if (sw) sw.style.background = isClear ? 'transparent' : hex;
    if (hx) hx.value = isClear ? '' : hex;
  }
  const strokeCol = isClear ? 'none' : hex;
  // Update SVG path color directly for immediate visual feedback
  const svg = document.getElementById(SVG_LAYER_ID);
  if (svg) {
    const g = svg.querySelector(`[data-conn-id="${conn.id}"]`);
    if (g) {
      g.querySelectorAll('path[stroke]').forEach(p => {
        if (p.getAttribute('stroke') === 'transparent') return; // hit area
        p.setAttribute('stroke', strokeCol);
      });
      // Update markers color
      svg.querySelectorAll(`[id^="${conn.id}_"] path, [id^="${conn.id}_"] polygon`).forEach(p => {
        if (p.getAttribute('fill') && p.getAttribute('fill') !== 'none') p.setAttribute('fill', strokeCol === 'none' ? 'none' : strokeCol);
        if (p.getAttribute('stroke') && p.getAttribute('stroke') !== 'none' && p.getAttribute('stroke') !== 'transparent') {
          p.setAttribute('stroke', strokeCol);
        }
      });
    }
  }
  _rerender();
  if (typeof saveState === 'function') saveState();
};
window.cpClearColor = function() {
  if (typeof cpSetColor === 'function') cpSetColor('none', null);
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
  conn.route      = document.getElementById('cp-route')?.value || 'curve';
  conn.animated   = document.getElementById('cp-anim').checked;
  const _aiEl = document.getElementById('cp-anim-invert');
  if (_aiEl) conn.animInvert = _aiEl.checked;
  const _airRow = document.getElementById('cp-anim-invert-row');
  if (_airRow) _airRow.style.display = (conn.animated || !!(slides[cur] && slides[cur].els.find(e => e.rideConnId === conn.id))) ? 'flex' : 'none';
  // markers are set via cpSetMarker buttons — read from dataset
  const fmEl = document.querySelector('#cp-marker-from .mk-btn.active');
  const tmEl = document.querySelector('#cp-marker-to .mk-btn.active');
  conn.fromMarker = fmEl ? fmEl.dataset.mk : (document.getElementById('cp-from-marker')?.value || 'none');
  conn.toMarker   = tmEl ? tmEl.dataset.mk : (document.getElementById('cp-to-marker')?.value || 'none');
  // Recompute CPs from new gap positions so handles stay aligned (curve mode only)
  if (conn.route !== 'orthogonal' && conn.route !== 'straight' && !conn._cpManual) {
    const { p1: np1, p2: np2 } = _getAnchorPair(conn);
    const def = _defaultControlPoints(np1, np2);
    conn.cp1 = def.cp1; conn.cp2 = def.cp2;
    conn.cp1offset = null; conn.cp2offset = null;
  }
  _rerender();
  _connSyncRiderPosition(conn);
};
window.cpColorHex = function(val) {
  if (/^#[0-9a-fA-F]{6}$/.test(val)) window.cpSetColor(val);
};
window.cpDelete = function() {
  if (!_selConnId || !slides[cur]) return;
  const removedId = _selConnId;
  if (typeof _connDeleteRiders === 'function') _connDeleteRiders(removedId);
  slides[cur].connectors = (slides[cur].connectors || []).filter(c => c.id !== removedId);
  const svg = document.getElementById(SVG_LAYER_ID);
  if (svg) {
    svg.querySelector(`[data-conn-id="${removedId}"]`)?.remove();
    svg.querySelector('#conn-tangents')?.remove();
  }
  _deselectConn();
  // Сбрасываем sel чтобы 21-keyboard.js не удалил объект вместе с линией
  if (typeof sel !== 'undefined' && sel) {
    sel.classList.remove('sel');
    sel = null;
    if (typeof syncProps === 'function') syncProps();
  }
  if (typeof drawThumbs === 'function') drawThumbs();
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
  if (!_selConnId || _handleDragging) return;
  if (e.target.closest('[data-conn-id]') || e.target.closest('#connprops') ||
      e.target.closest('#conn-handles')) return;
  // capture: снимаем до pick/desel; при клике на объект панель свойств обновит syncProps
  _deselectConn(!e.target.closest('#canvas .el'));
}, true);

window._deselectConn = _deselectConn;
window._getSelConnId = () => _selConnId;

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

const _MARKER_TYPES = ['none', 'arrow', 'square', 'circle', 'bar', 'cross'];

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
  circle: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="14" x2="17" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="22" cy="14" r="5" stroke="currentColor" stroke-width="2" fill="currentColor" opacity="0.25"/>
  </svg>`,
  bar: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="14" x2="22" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="22" y1="7" x2="22" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
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

// ── Ride-along element attachment for connector lines ──
// Image/icon linked via d.rideConnId. In editor sits at start (or end if inverted).
// In preview/export animates along the path via getPointAtLength (reliable for images+filters).
window._connRideTargetId = null;

function _connRideAnchorPoint(conn) {
  if (!conn || typeof _getAnchorPair !== 'function') return null;
  try {
    const pair = _getAnchorPair(conn);
    if (!pair) return null;
    return conn.animInvert ? pair.p2 : pair.p1;
  } catch (e) { return null; }
}

function _connSyncRiderPosition(conn) {
  if (!conn || !slides[cur]) return;
  const d = slides[cur].els.find(e => e.rideConnId === conn.id);
  if (!d) return;
  const pt = _connRideAnchorPoint(conn);
  if (!pt) return;
  const w = d.w || 100, h = d.h || 100;
  d.x = Math.round(pt.x - w / 2);
  d.y = Math.round(pt.y - h / 2);
  const el = document.querySelector('.el[data-id="' + d.id + '"]');
  if (el) {
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    el.dataset.rideConnId = conn.id;
  }
}
window._connSyncRiderPosition = _connSyncRiderPosition;

/** Animate riderEl along pathD. Returns a cancel() function. */
window._connStartRideAnim = function (riderEl, pathD, opts) {
  if (!riderEl || !pathD) return function () {};
  opts = opts || {};
  const dur = Math.max(0.3, opts.duration || 3.5);
  const gap = Math.max(0, opts.gap || 0);
  const total = dur + gap;
  const inv = !!opts.invert;
  const baseOp = opts.opacity != null ? opts.opacity : 1;
  const baseRot = opts.baseRot || 0;
  const meas = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  meas.setAttribute('d', pathD);
  // Must be in DOM for getTotalLength in some browsers
  const holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  holder.setAttribute('width', '0');
  holder.setAttribute('height', '0');
  holder.style.cssText = 'position:absolute;left:-9999px;top:-9999px;overflow:hidden;';
  holder.appendChild(meas);
  document.body.appendChild(holder);
  let len = 0;
  try { len = meas.getTotalLength(); } catch (e) { len = 0; }
  document.body.removeChild(holder);
  if (!len || !isFinite(len)) return function () {};

  const w = riderEl.offsetWidth || parseFloat(riderEl.style.width) || 0;
  const h = riderEl.offsetHeight || parseFloat(riderEl.style.height) || 0;
  riderEl.style.left = '0px';
  riderEl.style.top = '0px';
  riderEl.style.right = 'auto';
  riderEl.style.bottom = 'auto';
  riderEl.style.margin = '0';
  riderEl.style.offsetPath = 'none';
  riderEl.style.webkitOffsetPath = 'none';
  riderEl.style.animation = 'none';
  riderEl.style.transformOrigin = 'center center';
  riderEl.style.opacity = '0';
  riderEl.style.willChange = 'transform,opacity';

  // Local path for sampling (detached is fine after measuring length once)
  const sample = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  sample.setAttribute('d', pathD);
  // Re-attach briefly for getPointAtLength if needed
  holder.appendChild(sample);
  document.body.appendChild(holder);

  let raf = 0;
  let start = performance.now();
  let stopped = false;
  function pointAt(dist) {
    const t = Math.max(0, Math.min(len, dist));
    try { return sample.getPointAtLength(t); } catch (e) { return { x: 0, y: 0 }; }
  }
  /** Rotate rider to face travel direction along the curve (+ baseRot offset). */
  function angleAt(dist) {
    const eps = Math.max(0.75, Math.min(4, len * 0.002));
    let dA, dB;
    if (!inv) {
      dA = Math.max(0, dist - eps * 0.5);
      dB = Math.min(len, dist + eps * 0.5);
      if (dB <= dA) { dA = Math.max(0, len - eps); dB = len; }
    } else {
      // Moving toward path start: sample from higher length → lower length
      dA = Math.min(len, dist + eps * 0.5);
      dB = Math.max(0, dist - eps * 0.5);
      if (dA <= dB) { dA = Math.min(len, eps); dB = 0; }
    }
    const a = pointAt(dA), b = pointAt(dB);
    const dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return baseRot;
    return Math.atan2(dy, dx) * 180 / Math.PI + baseRot;
  }
  function frame(now) {
    if (stopped || !riderEl.isConnected) return;
    const elapsed = ((now - start) / 1000) % total;
    let op = 0, frac = inv ? 1 : 0;
    if (elapsed <= dur) {
      const p = elapsed / dur;
      frac = inv ? (1 - p) : p;
      if (p < 0.15) op = baseOp * (p / 0.15);
      else if (p > 0.85) op = baseOp * ((1 - p) / 0.15);
      else op = baseOp;
    } else {
      frac = inv ? 0 : 1;
      op = 0;
    }
    const dist = frac * len;
    const pt = pointAt(dist);
    const ang = angleAt(dist);
    riderEl.style.transform = 'translate(' + (pt.x - w / 2) + 'px,' + (pt.y - h / 2) + 'px) rotate(' + ang + 'deg)';
    riderEl.style.opacity = String(op);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return function cancel() {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    if (holder.parentNode) holder.parentNode.removeChild(holder);
  };
};

window.connAttachRideElement = function (kind) {
  const connId = (typeof window._getSelConnId === 'function') ? window._getSelConnId() : null;
  if (!connId) return;
  window._connRideTargetId = connId;
  if (kind === 'icon') {
    if (typeof openIconModal === 'function') openIconModal();
  } else {
    if (typeof openImageModal === 'function') openImageModal();
  }
};

/** Remove ride-along icon/image linked to a connector. */
function _connDeleteRiders(connId) {
  if (!connId || !slides[cur] || !slides[cur].els) return;
  const riders = slides[cur].els.filter(e => e.rideConnId === connId);
  if (!riders.length) return;
  riders.forEach(d => {
    const el = document.querySelector('.el[data-id="' + d.id + '"]');
    if (el) {
      if (typeof sel !== 'undefined' && sel === el) {
        sel.classList.remove('sel');
        sel = null;
      }
      if (typeof multiSel !== 'undefined' && multiSel) multiSel.delete(el);
      el.remove();
    }
  });
  slides[cur].els = slides[cur].els.filter(e => e.rideConnId !== connId);
}
window._connDeleteRiders = _connDeleteRiders;

/** ✕ in props: delete the ride element entirely (not just unlink). */
window.connDetachRideElement = function () {
  const connId = (typeof window._getSelConnId === 'function') ? window._getSelConnId() : null;
  if (!connId || !slides[cur]) return;
  const d = slides[cur].els.find(e => e.rideConnId === connId);
  if (!d) { _connSyncRideUI(connId); return; }
  if (typeof pushUndo === 'function') pushUndo();
  _connDeleteRiders(connId);
  if (typeof save === 'function') save();
  if (typeof saveState === 'function') saveState();
  if (typeof drawThumbs === 'function') drawThumbs();
  try {
    if (typeof desel === 'function') desel();
    _selectConn(connId);
  } catch (e) {}
  _connSyncRideUI(connId);
};

function _connSyncRideUI(connId) {
  const row = document.getElementById('cp-ride-row');
  const lbl = document.getElementById('cp-ride-label');
  const speedInp = document.getElementById('cp-ride-speed');
  const gapInp = document.getElementById('cp-ride-gap');
  const attachWrap = document.getElementById('cp-ride-attach-wrap');
  if (!row) return;
  const conn = (connId && slides[cur]) ? (slides[cur].connectors || []).find(c => c.id === connId) : null;
  const d = (connId && slides[cur]) ? slides[cur].els.find(e => e.rideConnId === connId) : null;
  row.style.display = d ? 'flex' : 'none';
  // Keep attach buttons visible so user can replace; info row sits under them
  if (attachWrap) attachWrap.style.display = 'flex';
  if (d && lbl) {
    const kind = (d.type === 'icon') ? '★ Значок' : (d.type === 'svg' ? '🖼 SVG' : '🖼 Изображение');
    lbl.textContent = kind;
  }
  if (conn && speedInp) speedInp.value = conn.rideDuration != null ? conn.rideDuration : 3.5;
  if (conn && gapInp) gapInp.value = conn.rideInterval != null ? conn.rideInterval : 0;
  const airRow = document.getElementById('cp-anim-invert-row');
  if (airRow) airRow.style.display = (conn && (conn.animated || d)) ? 'flex' : 'none';
}
window._connSyncRideUI = _connSyncRideUI;

window.connUpdateRideSettings = function () {
  const connId = (typeof window._getSelConnId === 'function') ? window._getSelConnId() : null;
  if (!connId || !slides[cur]) return;
  const conn = (slides[cur].connectors || []).find(c => c.id === connId);
  if (!conn) return;
  const speedInp = document.getElementById('cp-ride-speed');
  const gapInp = document.getElementById('cp-ride-gap');
  if (speedInp) conn.rideDuration = Math.max(0.3, +speedInp.value || 3.5);
  if (gapInp) conn.rideInterval = Math.max(0, +gapInp.value || 0);
  if (typeof save === 'function') save();
  if (typeof saveState === 'function') saveState();
};

function _connAttachNewestElement(connId) {
  if (!slides[cur] || !connId) return;
  const d = slides[cur].els[slides[cur].els.length - 1];
  if (!d) return;
  const conn = (slides[cur].connectors || []).find(c => c.id === connId);
  if (!conn) return;
  // Remove previous riders for this connector (replace)
  const oldRiders = slides[cur].els.filter(e => e.rideConnId === connId && e.id !== d.id);
  oldRiders.forEach(e => {
    const oldEl = document.querySelector('.el[data-id="' + e.id + '"]');
    if (oldEl) {
      if (typeof sel !== 'undefined' && sel === oldEl) sel = null;
      if (typeof multiSel !== 'undefined' && multiSel) multiSel.delete(oldEl);
      oldEl.remove();
    }
  });
  if (oldRiders.length) {
    slides[cur].els = slides[cur].els.filter(e => !(e.rideConnId === connId && e.id !== d.id));
  }
  d.rideConnId = connId;
  if (conn.rideDuration == null) conn.rideDuration = 3.5;
  if (conn.rideInterval == null) conn.rideInterval = 0;
  const el = document.querySelector('.el[data-id="' + d.id + '"]');
  if (el) el.dataset.rideConnId = connId;
  _connSyncRiderPosition(conn);
  if (typeof save === 'function') save();
  if (typeof saveState === 'function') saveState();
  if (typeof drawThumbs === 'function') drawThumbs();
  _connSyncRideUI(connId);
  try {
    if (typeof desel === 'function') desel();
    else if (typeof sel !== 'undefined' && sel) { sel.classList.remove('sel'); sel = null; }
    _selectConn(connId);
  } catch (e) {}
}

function _connMaybeAttachAfterInsert() {
  const targetConn = window._connRideTargetId;
  if (!targetConn || !slides[cur]) return false;
  window._connRideTargetId = null;
  _connAttachNewestElement(targetConn);
  return true;
}
window._connMaybeAttachAfterInsert = _connMaybeAttachAfterInsert;

function _connWireInsertHooks() {
  // Keep light wrappers for sync paths; async image attach is handled inside _insertAsImage
  if (window._insertSelectedImage && !window._insertSelectedImage._connRideWrapped) {
    const _origInsertImage = window._insertSelectedImage;
    window._insertSelectedImage = function () {
      const armed = !!window._connRideTargetId;
      const before = (slides[cur] && slides[cur].els.length) || 0;
      const ret = _origInsertImage.apply(this, arguments);
      // Sync inserts (SVG content) — attach immediately. Async image leaves target armed.
      if (armed && slides[cur] && slides[cur].els.length === before + 1 && window._connRideTargetId) {
        _connMaybeAttachAfterInsert();
      }
      return ret;
    };
    window._insertSelectedImage._connRideWrapped = true;
  }
  if (window.insertIconSelected && !window.insertIconSelected._connRideWrapped) {
    const _origInsertIcon = window.insertIconSelected;
    window.insertIconSelected = function () {
      const armed = !!window._connRideTargetId;
      const before = (slides[cur] && slides[cur].els.length) || 0;
      const ret = _origInsertIcon.apply(this, arguments);
      // insertIconSelected already calls _connMaybeAttachAfterInsert; avoid double if already attached
      if (armed && window._connRideTargetId && slides[cur] && slides[cur].els.length === before + 1) {
        _connMaybeAttachAfterInsert();
      } else if (!armed) {
        /* noop */
      }
      return ret;
    };
    window.insertIconSelected._connRideWrapped = true;
  }
}
_connWireInsertHooks();
document.addEventListener('DOMContentLoaded', _connWireInsertHooks);
setTimeout(_connWireInsertHooks, 0);
setTimeout(_connWireInsertHooks, 500);

})();

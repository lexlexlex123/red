/** Callout geometry — ported from js/09-shapes.js (v7.1). */
'use strict';

function _rrPerimeter(L, T, R, B, r) {
  const w = R - L, h = B - T;
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (r <= 0.01) return 2 * (w + h);
  return 2 * (w + h - 2 * r) + 2 * Math.PI * r;
}

function _rrPointAt(L, T, R, B, r, s) {
  const w = R - L, h = B - T;
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const _ = n => Math.round(n * 100) / 100;
  const per = _rrPerimeter(L, T, R, B, r);
  s = ((s % per) + per) % per;
  if (r <= 0.01) {
    if (s <= w) return { x: _(L + s), y: _(T) };
    s -= w;
    if (s <= h) return { x: _(R), y: _(T + s) };
    s -= h;
    if (s <= w) return { x: _(R - s), y: _(B) };
    s -= w;
    return { x: _(L), y: _(B - s) };
  }
  const top = w - 2 * r, side = h - 2 * r;
  const segs = [top, Math.PI * r / 2, side, Math.PI * r / 2, top, Math.PI * r / 2, side, Math.PI * r / 2];
  let acc = 0;
  for (let i = 0; i < 8; i++) {
    if (s <= acc + segs[i] + 1e-9) {
      const t = Math.max(0, Math.min(segs[i], s - acc));
      switch (i) {
        case 0: return { x: _(L + r + t), y: _(T) };
        case 1: { const a = -Math.PI / 2 + t / r; return { x: _(R - r + r * Math.cos(a)), y: _(T + r + r * Math.sin(a)) }; }
        case 2: return { x: _(R), y: _(T + r + t) };
        case 3: { const a = t / r; return { x: _(R - r + r * Math.cos(a)), y: _(B - r + r * Math.sin(a)) }; }
        case 4: return { x: _(R - r - t), y: _(B) };
        case 5: { const a = Math.PI / 2 + t / r; return { x: _(L + r + r * Math.cos(a)), y: _(B - r + r * Math.sin(a)) }; }
        case 6: return { x: _(L), y: _(B - r - t) };
        default: { const a = Math.PI + t / r; return { x: _(L + r + r * Math.cos(a)), y: _(T + r + r * Math.sin(a)) }; }
      }
    }
    acc += segs[i];
  }
  return { x: _(L + r), y: _(T) };
}

function _rrDistAtPoint(L, T, R, B, r, x, y) {
  const per = _rrPerimeter(L, T, R, B, r);
  let bestS = 0, bestD = Infinity;
  const steps = Math.max(80, Math.ceil(per / 1.5));
  for (let i = 0; i <= steps; i++) {
    const ss = per * i / steps;
    const p = _rrPointAt(L, T, R, B, r, ss);
    const dd = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (dd < bestD) { bestD = dd; bestS = ss; }
  }
  return bestS;
}

/**
 * Точка на контуре скругл. прямоугольника в направлении ang от центра.
 * Важно: пересекать ВНЕШНИЕ рёбра (L/R/T/B), а не inset L+r —
 * иначе у «таблетки» рот залипает внутри скругления / снизу.
 */
function _calloutBorderPt(cx, cy, L, T, R, B, r, ang) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  r = Math.max(0, Math.min(r, (R - L) / 2, (B - T) / 2));
  let best = null, bestT = Infinity;

  function tryHit(t, px, py, ok) {
    if (t > 1e-6 && t < bestT && ok) {
      bestT = t;
      best = { x: px, y: py };
    }
  }

  // Прямые участки внешнего контура
  if (Math.abs(dy) > 1e-9) {
    let t = (T - cy) / dy, x = cx + dx * t;
    tryHit(t, x, T, x >= L + r - 1e-6 && x <= R - r + 1e-6);
    t = (B - cy) / dy; x = cx + dx * t;
    tryHit(t, x, B, x >= L + r - 1e-6 && x <= R - r + 1e-6);
  }
  if (Math.abs(dx) > 1e-9) {
    let t = (L - cx) / dx, y = cy + dy * t;
    tryHit(t, L, y, y >= T + r - 1e-6 && y <= B - r + 1e-6);
    t = (R - cx) / dx; y = cy + dy * t;
    tryHit(t, R, y, y >= T + r - 1e-6 && y <= B - r + 1e-6);
  }

  // Четверти окружностей по углам (только внешняя дуга)
  const corners = [
    { qx: L + r, qy: T + r, a0: Math.PI, a1: Math.PI * 1.5 },
    { qx: R - r, qy: T + r, a0: -Math.PI / 2, a1: 0 },
    { qx: R - r, qy: B - r, a0: 0, a1: Math.PI / 2 },
    { qx: L + r, qy: B - r, a0: Math.PI / 2, a1: Math.PI }
  ];
  if (r > 0.01) {
    corners.forEach(({ qx, qy, a0, a1 }) => {
      const fx = cx - qx, fy = cy - qy;
      const a2 = dx * dx + dy * dy;
      const b2 = 2 * (fx * dx + fy * dy);
      const cv = fx * fx + fy * fy - r * r;
      const disc = b2 * b2 - 4 * a2 * cv;
      if (disc < 0) return;
      const sq = Math.sqrt(disc);
      [(-b2 + sq) / (2 * a2), (-b2 - sq) / (2 * a2)].forEach(t => {
        if (t <= 1e-6) return;
        const px = cx + dx * t, py = cy + dy * t;
        let a = Math.atan2(py - qy, px - qx);
        // Нормализуем a в [a0, a1] с учётом перехода через ±π
        let lo = a0, hi = a1;
        while (a < lo) a += Math.PI * 2;
        while (a > hi + 1e-6 && a - Math.PI * 2 >= lo - 1e-6) a -= Math.PI * 2;
        if (a >= lo - 1e-6 && a <= hi + 1e-6) tryHit(t, px, py, true);
      });
    });
  }

  if (best) return best;
  // Fallback: ближайшая точка периметра по углу
  const per = _rrPerimeter(L, T, R, B, r);
  let bestP = null, bestDiff = Infinity;
  const steps = Math.max(64, Math.ceil(per / 2));
  for (let i = 0; i < steps; i++) {
    const p = _rrPointAt(L, T, R, B, r, per * i / steps);
    let diff = Math.atan2(p.y - cy, p.x - cx) - ang;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    diff = Math.abs(diff);
    if (diff < bestDiff) { bestDiff = diff; bestP = p; }
  }
  return bestP || { x: cx + dx * (R - L) / 2, y: cy + dy * (B - T) / 2 };
}

function _ellipseHit(cx, cy, rx, ry, ang) {
  const c = Math.cos(ang), sn = Math.sin(ang);
  const t = Math.atan2(rx * sn, ry * c);
  return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
}

function _calloutDefaultRoundRel(tailX, tailY) {
  // Без Math.max(...,40) — иначе при боковом tip фиолетовый уезжает вниз и хвост режет тело
  return { tailRoundX: tailX * 0.55, tailRoundY: tailY * 0.55 };
}

/** Длинная дуга эллипса b2→b1 точками (без SVG-A — нет хорд поперек). */
function _ellipseBodyPoly(cx, cy, rx, ry, b2, b1) {
  const _ = n => Math.round(n * 100) / 100;
  let a2 = Math.atan2((b2.y - cy) / ry, (b2.x - cx) / rx);
  let a1 = Math.atan2((b1.y - cy) / ry, (b1.x - cx) / rx);
  // Кратчайший путь a2→a1 — это «рот»; тело — противоположный обход
  let delta = a1 - a2;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  if (Math.abs(delta) < Math.PI - 0.001) {
    delta = delta > 0 ? delta - Math.PI * 2 : delta + Math.PI * 2;
  }
  const n = Math.max(24, Math.ceil(Math.abs(delta) / (Math.PI / 24)));
  let d = '';
  for (let i = 1; i <= n; i++) {
    const a = a2 + delta * (i / n);
    const x = cx + rx * Math.cos(a);
    const y = cy + ry * Math.sin(a);
    d += ' L ' + _(x) + ' ' + _(y);
  }
  d += ' L ' + _(b1.x) + ' ' + _(b1.y);
  return d;
}

/** Длинная дуга rounded-rect sFrom→sTo точками + дуги на углах. */
function _rrBodyPoly(L, T, R, B, r, sFrom, sTo) {
  r = Math.max(0, Math.min(r, (R - L) / 2, (B - T) / 2));
  const per = _rrPerimeter(L, T, R, B, r);
  let span = ((sTo - sFrom) % per + per) % per;
  if (span < 1e-6) span = per;
  if (span < per * 0.5) span = per - span;
  const _ = n => Math.round(n * 100) / 100;
  const n = Math.max(32, Math.ceil(span / 3));
  let d = '';
  for (let i = 1; i <= n; i++) {
    const p = _rrPointAt(L, T, R, B, r, sFrom + span * (i / n));
    d += ' L ' + _(p.x) + ' ' + _(p.y);
  }
  return d;
}

/**
 * Контрольные точки хвоста (для path и семпла обводки).
 * Возвращает { q1, q2 } или null для острых форм (прямые).
 */
function _calloutTailCPs(b1, b2, tip, roundPt, form, cx, cy) {
  if (form === 'rect' || form === 'sharp') return null;
  const baseMid = { x: (b1.x + b2.x) / 2, y: (b1.y + b2.y) / 2 };
  const vx = tip.x - baseMid.x, vy = tip.y - baseMid.y;
  const len = Math.hypot(vx, vy) || 1;
  const ux = vx / len, uy = vy / len;
  const px = -uy, py = ux;

  let along = (roundPt.x - baseMid.x) * ux + (roundPt.y - baseMid.y) * uy;
  along = Math.max(len * 0.28, Math.min(len * 0.68, along));
  let side = (roundPt.x - baseMid.x) * px + (roundPt.y - baseMid.y) * py;
  const sideMax = Math.max(8, len * (form === 'soft' ? 0.35 : 0.22));
  side = Math.max(-sideMax, Math.min(sideMax, side));
  {
    const toTipFromC = (tip.x - cx) * ux + (tip.y - cy) * uy;
    const toBaseFromC = (baseMid.x - cx) * ux + (baseMid.y - cy) * uy;
    const spineAlongFromC = toBaseFromC + along;
    if (spineAlongFromC < toBaseFromC + len * 0.12) along = Math.max(along, len * 0.35);
    if (toTipFromC > 1 && spineAlongFromC > toTipFromC * 0.92) along = Math.min(along, len * 0.55);
  }

  const t = along / len;
  let s1 = (b1.x - baseMid.x) * px + (b1.y - baseMid.y) * py;
  let s2 = (b2.x - baseMid.x) * px + (b2.y - baseMid.y) * py;
  if (Math.abs(s1) < 1e-6) s1 = 1;
  if (Math.abs(s2) < 1e-6) s2 = -1;
  s1 = Math.sign(s1);
  s2 = Math.sign(s2);
  if (s1 === s2) s2 = -s1;

  const mouthHalf = Math.hypot(b2.x - b1.x, b2.y - b1.y) / 2;
  const plump = form === 'soft' ? 1.15 : 0.92;
  const half = Math.max(2, mouthHalf * (1 - t) * plump);
  const spine = {
    x: baseMid.x + ux * along + px * side,
    y: baseMid.y + uy * along + py * side
  };
  return {
    q1: { x: spine.x + px * s1 * half, y: spine.y + py * s1 * half },
    q2: { x: spine.x + px * s2 * half, y: spine.y + py * s2 * half }
  };
}

/**
 * Хвост: две Q от оси (spine). q1/q2 — симметричный offset по разные стороны,
 * иначе стороны сходятся крест-накрест (восьмёрка).
 */
function _calloutTailCurves(b1, b2, tip, roundPt, form, cx, cy) {
  const _ = n => Math.round(n * 100) / 100;
  const cps = _calloutTailCPs(b1, b2, tip, roundPt, form, cx, cy);
  if (!cps) {
    return ' L ' + _(tip.x) + ' ' + _(tip.y) + ' L ' + _(b2.x) + ' ' + _(b2.y);
  }
  return ' Q ' + _(cps.q1.x) + ' ' + _(cps.q1.y) + ' ' + _(tip.x) + ' ' + _(tip.y)
    + ' Q ' + _(cps.q2.x) + ' ' + _(cps.q2.y) + ' ' + _(b2.x) + ' ' + _(b2.y);
}

function _sampleQuad(a, c, b, n) {
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({
      x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * c.y + t * t * b.y
    });
  }
  return pts;
}

/** Точки длинной дуги тела (без замыкания на b1). */
function _ellipseBodyPts(cx, cy, rx, ry, b2, b1) {
  let a2 = Math.atan2((b2.y - cy) / ry, (b2.x - cx) / rx);
  let a1 = Math.atan2((b1.y - cy) / ry, (b1.x - cx) / rx);
  let delta = a1 - a2;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  if (Math.abs(delta) < Math.PI - 0.001) {
    delta = delta > 0 ? delta - Math.PI * 2 : delta + Math.PI * 2;
  }
  const n = Math.max(24, Math.ceil(Math.abs(delta) / (Math.PI / 24)));
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const a = a2 + delta * (i / n);
    pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return pts;
}

function _rrBodyPts(L, T, R, B, r, sFrom, sTo) {
  r = Math.max(0, Math.min(r, (R - L) / 2, (B - T) / 2));
  const per = _rrPerimeter(L, T, R, B, r);
  let span = ((sTo - sFrom) % per + per) % per;
  if (span < 1e-6) span = per;
  if (span < per * 0.5) span = per - span;
  const n = Math.max(32, Math.ceil(span / 3));
  const pts = [];
  for (let i = 1; i <= n; i++) {
    pts.push(_rrPointAt(L, T, R, B, r, sFrom + span * (i / n)));
  }
  return pts;
}

/**
 * Множитель толщины: толще у основания, тонко у кончика и напротив.
 * Мягкие спады — без ступенек.
 */
function _calloutStrokeHalf(p, tip, baseMid, cx, cy, sw, tailLen) {
  const distTip = Math.hypot(p.x - tip.x, p.y - tip.y);
  const distBase = Math.hypot(p.x - baseMid.x, p.y - baseMid.y);
  const tipT = Math.max(0, Math.min(1, 1 - distTip / (tailLen * 1.15)));
  // Шире зона «основания», чтобы не было резкого перепада у рта
  const baseRad = Math.max(22, tailLen * 0.85);
  const baseT = Math.exp(-((distBase / baseRad) * (distBase / baseRad)));
  let dang = Math.atan2(p.y - cy, p.x - cx) - Math.atan2(tip.y - cy, tip.x - cx);
  while (dang > Math.PI) dang -= Math.PI * 2;
  while (dang < -Math.PI) dang += Math.PI * 2;
  const oppT = Math.pow(Math.abs(dang) / Math.PI, 1.35);

  let m = 0.9;
  m = m * (1 - 0.68 * tipT * tipT);
  m = m + 0.55 * baseT * (1 - tipT * 0.85);
  m = m * (0.4 + 0.6 * (1 - oppT * (1 - baseT * 0.65)));
  return (sw / 2) * Math.max(0.22, Math.min(1.55, m));
}

function _smoothClosedScalars(arr, passes) {
  let a = arr.slice();
  const n = a.length;
  for (let p = 0; p < passes; p++) {
    const b = new Array(n);
    for (let i = 0; i < n; i++) {
      const i0 = (i - 1 + n) % n, i1 = (i + 1) % n;
      b[i] = (a[i0] + a[i] * 2 + a[i1]) / 4;
    }
    a = b;
  }
  return a;
}

/** Равномерная передискретизация замкнутого контура. */
function _resampleClosed(pts, step) {
  const n0 = pts.length;
  if (n0 < 3) return pts.slice();
  const closed = (Math.hypot(pts[0].x - pts[n0 - 1].x, pts[0].y - pts[n0 - 1].y) < 0.5)
    ? pts.slice(0, -1) : pts.slice();
  const n = closed.length;
  if (n < 3) return closed;
  const seg = [];
  let per = 0;
  for (let i = 0; i < n; i++) {
    const a = closed[i], b = closed[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    seg.push(len);
    per += len;
  }
  if (per < 1) return closed;
  const stepN = Math.max(1.5, step);
  const count = Math.max(n, Math.ceil(per / stepN));
  const out = [];
  for (let k = 0; k < count; k++) {
    let t = (k / count) * per;
    let i = 0;
    while (i < n - 1 && t > seg[i]) { t -= seg[i]; i++; }
    const a = closed[i], b = closed[(i + 1) % n];
    const L = seg[i] || 1;
    const u = t / L;
    out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  }
  return out;
}

function _closedPolyToCubicPath(pts) {
  const _ = n => Math.round(n * 100) / 100;
  const n = pts.length;
  if (n < 3) return '';
  let d = 'M ' + _(pts[0].x) + ' ' + _(pts[0].y);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ' C ' + _(c1x) + ' ' + _(c1y) + ' ' + _(c2x) + ' ' + _(c2y) + ' ' + _(p2.x) + ' ' + _(p2.y);
  }
  return d + ' Z';
}

/**
 * Обводка = цепочка кругов вдоль контура (под заливкой).
 * Нет offset/нормалей → нет срезов на углах и перекрутов у рта хвоста.
 * Возвращает SVG-фрагмент (<circle/>…), не path d.
 * (Burst использует отдельный сглаженный tapered-path — см. _calloutBurstStrokePath.)
 */
function _calloutStrokeRibbon(pts, tip, b1, b2, cx, cy, sw) {
  if (!pts || pts.length < 3 || sw <= 0) return '';
  const _ = n => Math.round(n * 100) / 100;
  const baseMid = { x: (b1.x + b2.x) / 2, y: (b1.y + b2.y) / 2 };
  const tailLen = Math.hypot(tip.x - baseMid.x, tip.y - baseMid.y) || 1;

  const sampled = _resampleClosed(pts, Math.max(1.6, sw * 0.28));
  const m = sampled.length;
  if (m < 3) return '';

  let halves = [];
  for (let i = 0; i < m; i++) {
    halves.push(_calloutStrokeHalf(sampled[i], tip, baseMid, cx, cy, sw, tailLen));
  }
  halves = _smoothClosedScalars(halves, 6);
  // Ограничить скорость изменения толщины (убирает «ступени»)
  const maxD = Math.max(0.35, sw * 0.045);
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < m; i++) {
      const i0 = (i - 1 + m) % m;
      if (halves[i] > halves[i0] + maxD) halves[i] = halves[i0] + maxD;
      if (halves[i] < halves[i0] - maxD) halves[i] = halves[i0] - maxD;
    }
    for (let i = m - 1; i >= 0; i--) {
      const i1 = (i + 1) % m;
      if (halves[i] > halves[i1] + maxD) halves[i] = halves[i1] + maxD;
      if (halves[i] < halves[i1] - maxD) halves[i] = halves[i1] - maxD;
    }
  }
  halves = _smoothClosedScalars(halves, 3);

  let svg = '';
  for (let i = 0; i < m; i++) {
    const r = Math.max(0.55, halves[i]);
    svg += '<circle cx="' + _(sampled[i].x) + '" cy="' + _(sampled[i].y)
      + '" r="' + _(r) + '"/>';
  }
  return svg;
}

/** Квадратичная выборка a→b с лёгким «прогибом» наружу (органичная линия). */
function _burstEdgeSamples(a, b, outward, bulge, steps) {
  const mx = (a.x + b.x) / 2 + outward.x * bulge;
  const my = (a.y + b.y) / 2 + outward.y * bulge;
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    out.push({
      x: u * u * a.x + 2 * u * t * mx + t * t * b.x,
      y: u * u * a.y + 2 * u * t * my + t * t * b.y
    });
  }
  return out;
}

/**
 * Один луч: толстый скруглённый кончик → тонкое основание (как кисть).
 * Возвращает path d (замкнутый).
 */
function _burstRayBrushD(vPrev, tip, vNext, hwThin, hwThick) {
  const _ = n => Math.round(n * 100) / 100;
  const steps = 28;
  const toTipX = tip.x - vPrev.x, toTipY = tip.y - vPrev.y;
  const fromTipX = vNext.x - tip.x, fromTipY = vNext.y - tip.y;
  const len1 = Math.hypot(toTipX, toTipY) || 1;
  const len2 = Math.hypot(fromTipX, fromTipY) || 1;
  // Наружу от тела звезды у кончика
  let ox = toTipX / len1 - fromTipX / len2, oy = toTipY / len1 - fromTipY / len2;
  let ol = Math.hypot(ox, oy);
  if (ol < 1e-4) { ox = toTipX / len1; oy = toTipY / len1; ol = 1; }
  ox /= ol; oy /= ol;

  const bulge = Math.min(len1, len2) * 0.07;
  const edge1 = _burstEdgeSamples(vPrev, tip, { x: ox, y: oy }, bulge, steps);
  const edge2 = _burstEdgeSamples(tip, vNext, { x: ox, y: oy }, bulge, steps);

  function ribbon(edge, ha, hb, thickenNearEnd) {
    const L = [], R = [];
    for (let i = 0; i < edge.length; i++) {
      const t = i / (edge.length - 1);
      // Держим толщину у кончика, резко сужаем к основанию
      const te = thickenNearEnd ? Math.pow(t, 1.85) : (1 - Math.pow(1 - t, 1.85));
      const hw = ha + (hb - ha) * te;
      const i0 = Math.max(0, i - 1), i1 = Math.min(edge.length - 1, i + 1);
      let tx = edge[i1].x - edge[i0].x, ty = edge[i1].y - edge[i0].y;
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      const nx = -ty, ny = tx;
      L.push({ x: edge[i].x + nx * hw, y: edge[i].y + ny * hw });
      R.push({ x: edge[i].x - nx * hw, y: edge[i].y - ny * hw });
    }
    return { L, R };
  }

  /** Продолжить path кубиками по pts; pts[0] = текущая точка. */
  function appendSmooth(pts) {
    const n = pts.length;
    if (n < 2) return '';
    let d = '';
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(n - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C ' + _(c1x) + ' ' + _(c1y) + ' ' + _(c2x) + ' ' + _(c2y) + ' ' + _(p2.x) + ' ' + _(p2.y);
    }
    return d;
  }

  const s1 = ribbon(edge1, hwThin, hwThick, true);
  const s2 = ribbon(edge2, hwThick, hwThin, false);

  // Красивый круглый колпачок: точки на окружности вокруг tip, большая дуга наружу
  const rCap = Math.max(hwThick, 0.5);
  function snapTip(p) {
    const dx = p.x - tip.x, dy = p.y - tip.y;
    const L = Math.hypot(dx, dy) || 1;
    return { x: tip.x + dx / L * rCap, y: tip.y + dy / L * rCap };
  }
  const pA = snapTip(s1.L[s1.L.length - 1]);
  const pB = snapTip(s2.L[0]);
  s1.L[s1.L.length - 1] = pA;
  s2.L[0] = pB;

  function normAng(a) {
    while (a < 0) a += Math.PI * 2;
    while (a >= Math.PI * 2) a -= Math.PI * 2;
    return a;
  }
  const a0 = Math.atan2(pA.y - tip.y, pA.x - tip.x);
  const a1 = Math.atan2(pB.y - tip.y, pB.x - tip.x);
  const aM = Math.atan2(oy, ox);
  function onCcw(from, to, mid) {
    from = normAng(from); to = normAng(to); mid = normAng(mid);
    if (from <= to) return mid >= from && mid <= to;
    return mid >= from || mid <= to;
  }
  const useCcw = onCcw(a0, a1, aM);
  let span = useCcw ? (normAng(a1) - normAng(a0)) : (normAng(a0) - normAng(a1));
  if (span < 0) span += Math.PI * 2;
  // Выборка дуги (без концов) — гладко стыкуется с кубиками, без «среза»
  const capN = Math.max(8, Math.ceil(span / (Math.PI / 14)));
  const capPts = [];
  for (let i = 1; i < capN; i++) {
    const t = i / capN;
    const ang = useCcw ? (a0 + span * t) : (a0 - span * t);
    capPts.push({ x: tip.x + Math.cos(ang) * rCap, y: tip.y + Math.sin(ang) * rCap });
  }

  let d = 'M ' + _(s1.L[0].x) + ' ' + _(s1.L[0].y);
  d += appendSmooth(s1.L);
  if (capPts.length) {
    d += ' L ' + _(capPts[0].x) + ' ' + _(capPts[0].y);
    d += appendSmooth(capPts);
  }
  d += ' L ' + _(pB.x) + ' ' + _(pB.y);
  d += appendSmooth(s2.L);
  // тонкий стык у основания → правая сторона обратно
  const r2rev = s2.R.slice().reverse();
  d += ' L ' + _(r2rev[0].x) + ' ' + _(r2rev[0].y);
  d += appendSmooth(r2rev);
  // Внутренняя сторона у кончика — прямая (без дырок)
  const pInB = s1.R[s1.R.length - 1];
  d += ' L ' + _(pInB.x) + ' ' + _(pInB.y);
  const r1rev = s1.R.slice().reverse();
  d += appendSmooth(r1rev);
  return d + ' Z';
}

/** Обводка burst: сглаженные кистевые лучи (толстый кончик → тонкое основание). */
function _calloutBurstStrokePath(burst, sw) {
  if (!burst || !burst.tips || !burst.valleys || sw <= 0) return '';
  const n = burst.tips.length;
  if (n < 3) return '';
  let d = '';
  for (let i = 0; i < n; i++) {
    const vPrev = burst.valleys[(i - 1 + n) % n];
    const tip = burst.tips[i];
    const vNext = burst.valleys[i];
    const len1 = Math.hypot(tip.x - vPrev.x, tip.y - vPrev.y) || 1;
    const len2 = Math.hypot(vNext.x - tip.x, vNext.y - tip.y) || 1;
    const minEdge = Math.min(len1, len2);
    // Потолок по длине ребра — без самопересечений; скругление кончика сохраняем
    const lim = minEdge * 0.34;
    let hwThick = Math.min(Math.max(1.0, sw * 0.52), lim);
    let hwThin = Math.min(Math.max(0.3, sw * 0.07), hwThick * 0.22);
    // Острый угол у кончика — ещё сильнее сжать толщину
    const ax = (vPrev.x - tip.x) / len1, ay = (vPrev.y - tip.y) / len1;
    const bx = (vNext.x - tip.x) / len2, by = (vNext.y - tip.y) / len2;
    const cosA = Math.max(-1, Math.min(1, ax * bx + ay * by));
    const halfSin = Math.sin(Math.acos(cosA) * 0.5) || 0.2;
    hwThick = Math.min(hwThick, minEdge * 0.45 * halfSin);
    hwThin = Math.min(hwThin, hwThick * 0.25);
    if (hwThick < 0.6) hwThick = 0.6;
    d += _burstRayBrushD(vPrev, tip, vNext, hwThin, hwThick);
  }
  return d;
}

/** Контур «взрыва»: лучи разной длины, tip — кончик хвоста (первый луч). */
function _calloutBurstContour(cx, cy, rx, ry, tip, spikes) {
  const n = Math.max(10, spikes | 0 || 14);
  const tipAng = Math.atan2(tip.y - cy, tip.x - cx);
  function rnd(i, salt) {
    const x = Math.sin((i + 1) * 12.9898 + salt * 78.233 + tipAng * 4.17) * 43758.5453;
    return x - Math.floor(x);
  }
  const pts = [], tips = [], valleys = [];
  for (let i = 0; i < n; i++) {
    const a0 = tipAng + (i / n) * Math.PI * 2;
    const a1 = tipAng + ((i + 0.5) / n) * Math.PI * 2;
    let outer;
    if (i === 0) {
      outer = { x: tip.x, y: tip.y };
    } else {
      // Соседи хвоста чуть короче — хвост читается как указатель
      const nearTail = (i === 1 || i === n - 1);
      const lo = nearTail ? 0.58 : 0.62;
      const hi = nearTail ? 0.82 : 1.08;
      const mul = lo + rnd(i, 1) * (hi - lo);
      outer = { x: cx + rx * mul * Math.cos(a0), y: cy + ry * mul * Math.sin(a0) };
    }
    const innMul = 0.36 + rnd(i, 2) * 0.16;
    const inner = { x: cx + rx * innMul * Math.cos(a1), y: cy + ry * innMul * Math.sin(a1) };
    pts.push(outer);
    tips.push(outer);
    pts.push(inner);
    valleys.push(inner);
  }
  return { pts, tips, valleys };
}

function _calloutBurstPath(cx, cy, rx, ry, tip, spikes) {
  const _ = n => Math.round(n * 100) / 100;
  const burst = _calloutBurstContour(cx, cy, rx, ry, tip, spikes);
  const pts = burst.pts;
  let d = 'M ' + _(pts[0].x) + ' ' + _(pts[0].y);
  for (let i = 1; i < pts.length; i++) d += ' L ' + _(pts[i].x) + ' ' + _(pts[i].y);
  return d + ' Z';
}

/**
 * Контур «мысли»: кольцо долей-дуг (40–60% окружности), без отдельной «ямки».
 * Valley[0] смотрит на хвост — стык двух дуг, куда садятся кружки.
 * lobes: [{ A, C, tip, frac, r, ccx, ccy, sweep, large }]
 */
function _calloutThoughtContour(cx, cy, rx, ry, tipAng, nLobes) {
  const n = Math.max(7, nLobes | 0 || 9);
  function rnd(i, salt) {
    const x = Math.sin((i + 1) * 12.9898 + salt * 78.233 + tipAng * 4.17) * 43758.5453;
    return x - Math.floor(x);
  }
  function polar(ang, mul) {
    return { x: cx + rx * mul * Math.cos(ang), y: cy + ry * mul * Math.sin(ang) };
  }
  // Доли разной «доли круга» ~40–60%; вес → разная угловая ширина
  const fracs = [], weights = [];
  for (let i = 0; i < n; i++) {
    const frac = 0.40 + rnd(i, 1) * 0.22; // 0.40 … 0.62
    fracs.push(frac);
    weights.push(0.75 + frac); // чуть шире у более «круглых»
  }
  let wSum = 0;
  for (let i = 0; i < n; i++) wSum += weights[i];
  // Valley[0] = стык у хвоста (не середина дуги)
  const valleys = [];
  let ang = tipAng;
  for (let i = 0; i < n; i++) {
    // Без глубоких ямок — стык почти на общем радиусе облачка
    const vMul = 0.78 + rnd(i, 2) * 0.06;
    valleys.push(polar(ang, vMul));
    ang += (weights[i] / wSum) * Math.PI * 2;
  }
  const lobes = [];
  const tips = [];
  for (let i = 0; i < n; i++) {
    const A = valleys[i];
    const C = valleys[(i + 1) % n];
    const frac = fracs[i];
    const theta = frac * Math.PI * 2; // центральный угол локальной дуги
    const dx = C.x - A.x, dy = C.y - A.y;
    const chord = Math.hypot(dx, dy) || 1;
    const half = theta * 0.5;
    const sinH = Math.sin(half) || 1e-6;
    const rLoc = chord / (2 * sinH);
    // наружная нормаль хорды (от центра облачка)
    let px = -dy / chord, py = dx / chord;
    const mx = (A.x + C.x) * 0.5, my = (A.y + C.y) * 0.5;
    if (px * (mx - cx) + py * (my - cy) < 0) { px = -px; py = -py; }
    // центр локальной окружности
    const cosH = Math.cos(half);
    const ccx = mx - px * rLoc * cosH;
    const ccy = my - py * rLoc * cosH;
    // вершина доли — середина дуги наружу
    const a0 = Math.atan2(A.y - ccy, A.x - ccx);
    const a1 = Math.atan2(C.y - ccy, C.x - ccx);
    function norm(a) {
      while (a < 0) a += Math.PI * 2;
      while (a >= Math.PI * 2) a -= Math.PI * 2;
      return a;
    }
    function spanCcw(from, to) {
      let s = norm(to) - norm(from);
      if (s < 0) s += Math.PI * 2;
      return s;
    }
    const ccw = spanCcw(a0, a1);
    const cw = spanCcw(a1, a0);
    // выбираем направление с углом ≈ theta
    let sweep = 1, span = ccw;
    if (Math.abs(cw - theta) < Math.abs(ccw - theta)) { sweep = 0; span = cw; }
    const large = span > Math.PI ? 1 : 0;
    const midAng = sweep === 1
      ? (norm(a0) + span * 0.5)
      : (norm(a0) - span * 0.5);
    const tipPt = { x: ccx + rLoc * Math.cos(midAng), y: ccy + rLoc * Math.sin(midAng) };
    tips.push(tipPt);
    lobes.push({ A, C, tip: tipPt, frac, r: rLoc, ccx, ccy, sweep, large });
  }
  return { valleys, tips, lobes, bay: null };
}

/** Заливка: настоящие дуги окружностей разного охвата. */
function _calloutThoughtFillD(contour) {
  const _ = n => Math.round(n * 100) / 100;
  const lobes = contour.lobes;
  if (!lobes || lobes.length < 3) return '';
  let d = 'M ' + _(lobes[0].A.x) + ' ' + _(lobes[0].A.y);
  for (let i = 0; i < lobes.length; i++) {
    const L = lobes[i];
    d += ' A ' + _(L.r) + ' ' + _(L.r) + ' 0 ' + L.large + ' ' + L.sweep
      + ' ' + _(L.C.x) + ' ' + _(L.C.y);
  }
  return d + ' Z';
}

/** Выборка контура для переменной обводки (толсто на середине дуги). */
function _thoughtStrokeSamples(contour, sw) {
  const lobes = contour.lobes;
  if (!lobes || lobes.length < 3 || sw <= 0) return [];
  const hwThick = Math.max(1.4, sw * 0.68);
  const hwThin = Math.max(0.3, sw * 0.06);
  const samples = [];
  const steps = 16;
  for (let i = 0; i < lobes.length; i++) {
    const L = lobes[i];
    const a0 = Math.atan2(L.A.y - L.ccy, L.A.x - L.ccx);
    const a1 = Math.atan2(L.C.y - L.ccy, L.C.x - L.ccx);
    function norm(a) {
      while (a < 0) a += Math.PI * 2;
      while (a >= Math.PI * 2) a -= Math.PI * 2;
      return a;
    }
    let span = L.sweep === 1
      ? (norm(a1) - norm(a0))
      : (norm(a0) - norm(a1));
    if (span < 0) span += Math.PI * 2;
    for (let s = 0; s <= steps; s++) {
      if (s === 0 && samples.length) continue;
      const t = s / steps;
      const ang = L.sweep === 1 ? (a0 + span * t) : (a0 - span * t);
      const bump = Math.sin(Math.PI * t); // 0 на стыках, 1 в середине дуги
      samples.push({
        x: L.ccx + L.r * Math.cos(ang),
        y: L.ccy + L.r * Math.sin(ang),
        hw: hwThin + (hwThick - hwThin) * bump
      });
    }
  }
  return samples;
}

/** Обводка облачка: непрерывная лента (без острых «лучей» взрыва). */
function _calloutThoughtStrokePath(contour, sw) {
  if (!contour || sw <= 0) return '';
  const samples = _thoughtStrokeSamples(contour, sw);
  const n = samples.length;
  if (n < 8) return '';
  const _ = n => Math.round(n * 100) / 100;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = samples[(i - 1 + n) % n];
    const b = samples[i];
    const c = samples[(i + 1) % n];
    let tx = c.x - a.x, ty = c.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;
    L.push({ x: b.x + nx * b.hw, y: b.y + ny * b.hw });
    R.push({ x: b.x - nx * b.hw, y: b.y - ny * b.hw });
  }
  let d = 'M ' + _(L[0].x) + ' ' + _(L[0].y);
  for (let i = 1; i < n; i++) d += ' L ' + _(L[i].x) + ' ' + _(L[i].y);
  d += ' L ' + _(R[n - 1].x) + ' ' + _(R[n - 1].y);
  for (let i = n - 2; i >= 0; i--) d += ' L ' + _(R[i].x) + ' ' + _(R[i].y);
  return d + ' Z';
}

/**
 * Кольцо кружка хвоста с переменной толщиной:
 * тонкая линия с одной стороны, утолщение с противоположной.
 */
function _thoughtBubbleRingD(cx, cy, r, sw, thickAng) {
  const _ = n => Math.round(n * 100) / 100;
  const hwThick = Math.max(1.6, sw * 0.85);
  const hwThin = Math.max(0.2, sw * 0.04);
  const steps = 56;
  const outer = [], inner = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const t = 0.5 + 0.5 * Math.cos(a - thickAng);
    const hw = hwThin + (hwThick - hwThin) * Math.pow(Math.max(0, t), 1.05);
    outer.push({ x: cx + (r + hw) * Math.cos(a), y: cy + (r + hw) * Math.sin(a) });
    const inn = Math.max(r * 0.15, r - hw * 0.15);
    inner.push({ x: cx + inn * Math.cos(a), y: cy + inn * Math.sin(a) });
  }
  let d = 'M ' + _(outer[0].x) + ' ' + _(outer[0].y);
  for (let i = 1; i < outer.length; i++) d += ' L ' + _(outer[i].x) + ' ' + _(outer[i].y);
  d += ' Z';
  d += ' M ' + _(inner[inner.length - 1].x) + ' ' + _(inner[inner.length - 1].y);
  for (let i = inner.length - 2; i >= 0; i--) d += ' L ' + _(inner[i].x) + ' ' + _(inner[i].y);
  d += ' Z';
  return d;
}

/**
 * Мысль: облачко из дуг + кружки разного размера от стыка двух дуг.
 * Возвращает { fillD, strokeD, bayEdgeD:'', bubbles }.
 */
function _calloutThoughtArt(L, T, R, B, tip, roundPt, cx, cy, sw) {
  const bw = Math.max(1, R - L), bh = Math.max(1, B - T);
  const rx = bw * 0.46, ry = bh * 0.46;
  const tipAng = Math.atan2(tip.y - cy, tip.x - cx);
  const contour = _calloutThoughtContour(cx, cy, rx, ry, tipAng, 9);
  const fillD = _calloutThoughtFillD(contour);
  const strokeD = _calloutThoughtStrokePath(contour, sw);
  const bayEdgeD = '';

  // База — стык двух дуг (valley[0]), не середина доли
  const base = contour.valleys && contour.valleys[0]
    ? { x: contour.valleys[0].x, y: contour.valleys[0].y }
    : { x: cx + rx * 0.78 * Math.cos(tipAng), y: cy + ry * 0.78 * Math.sin(tipAng) };
  const vx = tip.x - base.x, vy = tip.y - base.y;
  const trail = Math.hypot(vx, vy) || 1;

  const ux = vx / trail, uy = vy / trail;
  let along = (roundPt.x - base.x) * ux + (roundPt.y - base.y) * uy;
  along = Math.max(trail * 0.15, Math.min(trail * 0.7, along || trail * 0.4));
  const plump = Math.max(0.55, Math.min(1.55, along / (trail * 0.4)));

  // Кружки явно разного размера, без наложений и без пересечения с облачком
  const nBub = Math.max(3, Math.min(5, Math.round(trail / Math.max(24, Math.min(bw, bh) * 0.14))));
  let radii = [];
  const maxR = Math.min(bw, bh) * 0.085 * plump;
  const minR = Math.max(2.2, maxR * 0.22);
  for (let i = 0; i < nBub; i++) {
    const t = i / Math.max(1, nBub - 1);
    const ease = Math.pow(t, 0.85);
    radii.push(maxR + (minR - maxR) * ease);
  }

  const pad = Math.max(4, Math.min(bw, bh) * 0.018);
  function firstClearDist(r0) {
    // Центр первого круга снаружи стыка: радиус + зазор
    let need = r0 + pad;
    // Соседние вершины долей торчат в сторону хвоста — отодвинуть кружок за них
    const tips = contour.tips || [];
    if (tips.length >= 2) {
      const neigh = [tips[0], tips[tips.length - 1]];
      for (let k = 0; k < neigh.length; k++) {
        const tp = neigh[k];
        const alongT = (tp.x - base.x) * ux + (tp.y - base.y) * uy;
        const lat = Math.abs(-(tp.x - base.x) * uy + (tp.y - base.y) * ux);
        const lim = r0 + pad;
        if (alongT > -r0 && lat < lim) {
          const extra = Math.sqrt(Math.max(0, lim * lim - lat * lat));
          need = Math.max(need, alongT + extra + 2);
        }
      }
    }
    return need;
  }

  let tStart = Math.min(0.58, Math.max(firstClearDist(radii[0]) / trail, 0.22));
  let tEnd = Math.max(tStart + 0.28, 1 - radii[nBub - 1] * 0.2 / trail);

  for (let iter = 0; iter < 24; iter++) {
    const span = (tEnd - tStart) * trail;
    const gap = nBub <= 1 ? span : span / (nBub - 1);
    let ok = tStart * trail >= firstClearDist(radii[0]) - 0.5;
    if (ok) {
      for (let i = 0; i < nBub - 1; i++) {
        if (gap < radii[i] + radii[i + 1] + 3) { ok = false; break; }
      }
    }
    if (ok) break;
    for (let i = 0; i < nBub; i++) radii[i] *= 0.9;
    tStart = Math.min(0.58, Math.max(firstClearDist(radii[0]) / trail, 0.22));
    tEnd = Math.max(tStart + 0.28, 1 - radii[nBub - 1] * 0.2 / trail);
  }

  const bubbles = [];
  for (let i = 0; i < nBub; i++) {
    const t = nBub === 1 ? 0.55 : tStart + (tEnd - tStart) * (i / (nBub - 1));
    bubbles.push({
      x: base.x + vx * t,
      y: base.y + vy * t,
      r: radii[i],
      thickAng: tipAng + Math.PI * 0.65 + i * 0.55
    });
  }
  return { fillD, strokeD, bayEdgeD, bubbles };
}

/** Совместимость: только path заливки+кружков (без переменной обводки). */
function _calloutThoughtPath(L, T, R, B, r, tip, roundPt, cx, cy) {
  const _ = n => Math.round(n * 100) / 100;
  const art = _calloutThoughtArt(L, T, R, B, tip, roundPt, cx, cy, 0);
  let d = art.fillD;
  for (let i = 0; i < art.bubbles.length; i++) {
    const b = art.bubbles[i];
    d += ' M ' + _(b.x + b.r) + ' ' + _(b.y)
      + ' A ' + _(b.r) + ' ' + _(b.r) + ' 0 1 1 ' + _(b.x - b.r) + ' ' + _(b.y)
      + ' A ' + _(b.r) + ' ' + _(b.r) + ' 0 1 1 ' + _(b.x + b.r) + ' ' + _(b.y);
  }
  return d;
}


function _buildCalloutSVGPath(d, w, h, sh, fillAttr, strokeAttr, shadow, margin) {
  const form = d.calloutForm || 'round';
  const rxIn = +(d.rx || 0);
  const bx = margin, by = margin, bw = Math.max(1, w - margin * 2), bh = Math.max(1, h - margin * 2);
  const cx = bx + bw / 2, cy = by + bh / 2;
  const L = bx, T = by, R = bx + bw, B = by + bh;
  const _ = n => Math.round(n * 100) / 100;

  let r = Math.min(rxIn, bw / 2, bh / 2);
  if (form === 'rect' || form === 'sharp') r = Math.min(r, Math.min(bw, bh) * 0.08);
  const useEllipse = (form === 'soft' || form === 'oval');

  const tailRelX = d.tailX !== undefined ? +d.tailX : 0;
  const tailRelY = d.tailY !== undefined ? +d.tailY : h / 2 + 30;
  const tip = { x: _(w / 2 + tailRelX), y: _(h / 2 + tailRelY) };

  let roundRelX = d.tailRoundX, roundRelY = d.tailRoundY;
  if (roundRelX === undefined || roundRelY === undefined) {
    const def = _calloutDefaultRoundRel(tailRelX, tailRelY);
    if (roundRelX === undefined) roundRelX = def.tailRoundX;
    if (roundRelY === undefined) roundRelY = def.tailRoundY;
  }
  const roundPt = { x: _(w / 2 + +roundRelX), y: _(h / 2 + +roundRelY) };

  if (form === 'burst') {
    const swB = d.sw === undefined ? 2 : +d.sw;
    const strokeColorB = d.stroke || '#1d4ed8';
    const strokeStyleB = d.strokeStyle || 'solid';
    const burst = _calloutBurstContour(cx, cy, bw * 0.46, bh * 0.46, tip, 14);
    const contourB = burst.pts;
    let pathDB = 'M ' + _(contourB[0].x) + ' ' + _(contourB[0].y);
    for (let i = 1; i < contourB.length; i++) {
      pathDB += ' L ' + _(contourB[i].x) + ' ' + _(contourB[i].y);
    }
    pathDB += ' Z';
    const useVarB = swB > 0 && (!strokeStyleB || strokeStyleB === 'solid');
    if (useVarB) {
      const strokeDB = _calloutBurstStrokePath(burst, swB);
      return '<g ' + shadow + '>'
        + (strokeDB ? '<path d="' + strokeDB + '" fill="' + strokeColorB + '" stroke="none" fill-rule="nonzero"/>' : '')
        + '<path d="' + pathDB + '" ' + fillAttr + ' stroke="none" fill-rule="nonzero"/>'
        + '</g>';
    }
    return '<g ' + shadow + '><path d="' + pathDB + '" ' + fillAttr + ' ' + strokeAttr
      + ' stroke-linejoin="round" stroke-linecap="round"/></g>';
  }
  if (form === 'thought') {
    const swT = d.sw === undefined ? 2 : +d.sw;
    const strokeColorT = d.stroke || '#1d4ed8';
    const strokeStyleT = d.strokeStyle || 'solid';
    const art = _calloutThoughtArt(L, T, R, B, tip, roundPt, cx, cy, swT);
    const useVarT = swT > 0 && (!strokeStyleT || strokeStyleT === 'solid');
    const _ = n => Math.round(n * 100) / 100;
    if (useVarT) {
      let ringStroke = '';
      for (let i = 0; i < art.bubbles.length; i++) {
        const b = art.bubbles[i];
        ringStroke += _thoughtBubbleRingD(b.x, b.y, b.r, swT, b.thickAng);
      }
      let fills = '<path d="' + art.fillD + '" ' + fillAttr + ' stroke="none" fill-rule="nonzero"/>';
      for (let i = 0; i < art.bubbles.length; i++) {
        const b = art.bubbles[i];
        fills += '<circle cx="' + _(b.x) + '" cy="' + _(b.y) + '" r="' + _(b.r) + '" '
          + fillAttr + ' stroke="none"/>';
      }
      return '<g ' + shadow + '>'
        + fills
        + (art.strokeD ? '<path d="' + art.strokeD + '" fill="' + strokeColorT + '" stroke="none" fill-rule="nonzero"/>' : '')
        + (ringStroke ? '<path d="' + ringStroke + '" fill="' + strokeColorT + '" stroke="none" fill-rule="evenodd"/>' : '')
        + '</g>';
    }
    return '<g ' + shadow + '><path d="' + _calloutThoughtPath(L, T, R, B, Math.max(r, 12), tip, roundPt, cx, cy) + '" '
      + fillAttr + ' ' + strokeAttr + ' fill-rule="evenodd"/></g>';
  }

  const ang = Math.atan2(tip.y - cy, tip.x - cx);
  const wFrac = d.tailWFrac !== undefined ? +d.tailWFrac : (form === 'soft' ? 0.3 : 0.2);
  let b1, b2, bodyPts;

  if (useEllipse) {
    const erx = bw / 2, ery = bh / 2;
    const mouth = Math.max(0.25, Math.min(0.9, wFrac * 1.2));
    b1 = _ellipseHit(cx, cy, erx, ery, ang - mouth / 2);
    b2 = _ellipseHit(cx, cy, erx, ery, ang + mouth / 2);
  } else {
    const baseC = _calloutBorderPt(cx, cy, L, T, R, B, r, ang);
    const per = _rrPerimeter(L, T, R, B, r);
    const halfW = Math.max(8, Math.min(per * 0.18, Math.min(bw, bh) * wFrac)) / 2;
    const s0 = _rrDistAtPoint(L, T, R, B, r, baseC.x, baseC.y);
    const s1 = (s0 - halfW + per) % per;
    const s2 = (s0 + halfW) % per;
    b1 = _rrPointAt(L, T, R, B, r, s1);
    b2 = _rrPointAt(L, T, R, B, r, s2);
  }

  // tip и центр — по разные стороны хорды рта; иначе бока хвоста перекрещиваются
  {
    const bx = b2.x - b1.x, by = b2.y - b1.y;
    const tipSide = bx * (tip.y - b1.y) - by * (tip.x - b1.x);
    const midSide = bx * (cy - b1.y) - by * (cx - b1.x);
    if (tipSide * midSide > 0) {
      const t = b1; b1 = b2; b2 = t;
    }
  }
  if (useEllipse) {
    const erx = bw / 2, ery = bh / 2;
    bodyPts = _ellipseBodyPts(cx, cy, erx, ery, b2, b1);
  } else {
    const s2 = _rrDistAtPoint(L, T, R, B, r, b2.x, b2.y);
    const s1 = _rrDistAtPoint(L, T, R, B, r, b1.x, b1.y);
    bodyPts = _rrBodyPts(L, T, R, B, r, s2, s1);
  }

  const contour = [b1];
  const cps = _calloutTailCPs(b1, b2, tip, roundPt, form, cx, cy);
  if (!cps) {
    contour.push(tip, b2);
  } else {
    contour.push.apply(contour, _sampleQuad(b1, cps.q1, tip, 20));
    contour.push.apply(contour, _sampleQuad(tip, cps.q2, b2, 20));
  }
  for (let i = 0; i < bodyPts.length; i++) contour.push(bodyPts[i]);

  let pathD = 'M ' + _(contour[0].x) + ' ' + _(contour[0].y);
  for (let i = 1; i < contour.length; i++) {
    pathD += ' L ' + _(contour[i].x) + ' ' + _(contour[i].y);
  }
  pathD += ' Z';

  const sw = d.sw === undefined ? 2 : +d.sw;
  const strokeColor = d.stroke || '#1d4ed8';
  const strokeStyle = d.strokeStyle || 'solid';
  const useVar = sw > 0 && (!strokeStyle || strokeStyle === 'solid');

  if (useVar) {
    const ribbon = _calloutStrokeRibbon(contour, tip, b1, b2, cx, cy, sw);
    const fillPts = Math.hypot(contour[0].x - contour[contour.length - 1].x,
      contour[0].y - contour[contour.length - 1].y) < 0.5
      ? contour.slice(0, -1) : contour;
    const fillPath = _closedPolyToCubicPath(_resampleClosed(fillPts, 3));
    // Круги СНИЗУ, заливка сверху — видна только внешняя половина обводки
    return '<g ' + shadow + '>'
      + (ribbon ? '<g fill="' + strokeColor + '" stroke="none">' + ribbon + '</g>' : '')
      + '<path d="' + (fillPath || pathD) + '" ' + fillAttr + ' stroke="none" fill-rule="nonzero"/>'
      + '</g>';
  }

  return '<g ' + shadow + '><path d="' + pathD + '" ' + fillAttr + ' ' + strokeAttr
    + ' stroke-linejoin="round" stroke-linecap="round" fill-rule="nonzero"/></g>';
}



export function calloutDefaultRoundRel(tailX, tailY) {
  return _calloutDefaultRoundRel(tailX, tailY);
}

export function buildCalloutSVGPath(d, w, h, sh, fillAttr, strokeAttr, shadow, margin) {
  return _buildCalloutSVGPath(d, w, h, sh, fillAttr, strokeAttr, shadow, margin);
}

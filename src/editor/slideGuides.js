/**
 * Deck-wide custom guides (same on every slide): infinite lines by origin (x,y) + angle deg.
 * angle 0 = horizontal (+x), 90 = vertical (+y).
 * Legacy saves may still keep guides on slide.guides — migrate via liftGuidesFromSlides.
 */

/** Prefer deck guides; else first non-empty slide.guides. Strip per-slide guides. */
export function liftGuidesFromSlides(slides, deckGuides) {
  let guides =
    Array.isArray(deckGuides) && deckGuides.length
      ? deckGuides.map((g) => (g ? { ...g } : g)).filter(Boolean)
      : [];
  if (!guides.length) {
    for (const s of slides || []) {
      if (Array.isArray(s?.guides) && s.guides.length) {
        guides = s.guides.map((g) => (g ? { ...g } : g)).filter(Boolean);
        break;
      }
    }
  }
  const nextSlides = (slides || []).map((s) => {
    if (!s || s.guides == null) return s;
    const copy = { ...s };
    delete copy.guides;
    return copy;
  });
  return { guides, slides: nextSlides };
}

function nextGuideId() {
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createGuide(opts = {}) {
  return {
    id: opts.id || nextGuideId(),
    x: Number.isFinite(+opts.x) ? +opts.x : 0,
    y: Number.isFinite(+opts.y) ? +opts.y : 0,
    angle: Number.isFinite(+opts.angle) ? +opts.angle : 0,
  };
}

export function normalizeGuideAngle(deg) {
  let a = ((+deg || 0) % 180) + 180;
  a %= 180;
  return a;
}

export function guideLineGeometry(g) {
  const x = +g.x || 0;
  const y = +g.y || 0;
  const ang = (normalizeGuideAngle(g.angle) * Math.PI) / 180;
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  // Unit normal (left of direction)
  const nx = -dy;
  const ny = dx;
  return { x, y, dx, dy, nx, ny, ang };
}

/** Distance from point to infinite guide line (signed along normal). */
export function distPointToGuide(px, py, g) {
  const { x, y, nx, ny } = guideLineGeometry(g);
  return (px - x) * nx + (py - y) * ny;
}

export function projectPointOntoGuide(px, py, g) {
  const { x, y, nx, ny } = guideLineGeometry(g);
  const d = (px - x) * nx + (py - y) * ny;
  return { x: px - d * nx, y: py - d * ny, dist: Math.abs(d) };
}

/**
 * Clip infinite line to axis-aligned slide rect. Returns { x1,y1,x2,y2 } or null.
 */
export function clipGuideToSlide(g, W, H) {
  const w = Math.max(1, +W || 1);
  const h = Math.max(1, +H || 1);
  const { x, y, dx, dy } = guideLineGeometry(g);
  const hits = [];

  function addHit(t, hx, hy) {
    if (hx < -0.5 || hx > w + 0.5 || hy < -0.5 || hy > h + 0.5) return;
    hits.push({ t, x: Math.max(0, Math.min(w, hx)), y: Math.max(0, Math.min(h, hy)) });
  }

  // Intersect with left/right (x = 0 / x = w)
  if (Math.abs(dx) > 1e-9) {
    const t0 = (0 - x) / dx;
    addHit(t0, 0, y + t0 * dy);
    const t1 = (w - x) / dx;
    addHit(t1, w, y + t1 * dy);
  }
  // Top/bottom (y = 0 / y = h)
  if (Math.abs(dy) > 1e-9) {
    const t0 = (0 - y) / dy;
    addHit(t0, x + t0 * dx, 0);
    const t1 = (h - y) / dy;
    addHit(t1, x + t1 * dx, h);
  }

  // Dedupe near-identical corners
  const uniq = [];
  hits.forEach((p) => {
    if (uniq.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 0.5)) return;
    uniq.push(p);
  });
  if (uniq.length < 2) return null;
  uniq.sort((a, b) => a.t - b.t);
  return { x1: uniq[0].x, y1: uniq[0].y, x2: uniq[uniq.length - 1].x, y2: uniq[uniq.length - 1].y };
}

export function guideIntersectsSlide(g, W, H) {
  return !!clipGuideToSlide(g, W, H);
}

/** Hit-test: distance from point to guide segment on slide (or infinite line). */
export function hitTestGuide(g, px, py, W, H, th = 8) {
  const clip = clipGuideToSlide(g, W, H);
  if (!clip) {
    const p = projectPointOntoGuide(px, py, g);
    return p.dist <= th ? p.dist : null;
  }
  // Distance to clipped segment
  const vx = clip.x2 - clip.x1;
  const vy = clip.y2 - clip.y1;
  const len2 = vx * vx + vy * vy || 1;
  let t = ((px - clip.x1) * vx + (py - clip.y1) * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = clip.x1 + t * vx;
  const qy = clip.y1 + t * vy;
  const d = Math.hypot(px - qx, py - qy);
  return d <= th ? d : null;
}

/**
 * Convert custom guides to snap descriptors for snapPointToGuides.
 * Near-axis → { t:'h'|'v', pos }; else { t:'a', x, y, angle }.
 */
export function customGuidesToSnapLines(guides) {
  const lines = [];
  (guides || []).forEach((g) => {
    if (!g) return;
    const ang = normalizeGuideAngle(g.angle);
    if (ang < 1 || ang > 179) {
      lines.push({ t: 'h', pos: +g.y || 0, guideId: g.id });
    } else if (Math.abs(ang - 90) < 1) {
      lines.push({ t: 'v', pos: +g.x || 0, guideId: g.id });
    } else {
      lines.push({ t: 'a', x: +g.x || 0, y: +g.y || 0, angle: ang, guideId: g.id });
    }
  });
  return lines;
}

function snapLineAsGuide(g) {
  if (g.t === 'h') return { x: 0, y: +g.pos || 0, angle: 0 };
  if (g.t === 'v') return { x: +g.pos || 0, y: 0, angle: 90 };
  return { x: +g.x || 0, y: +g.y || 0, angle: +g.angle || 0 };
}

function distToSnapLine(px, py, g) {
  if (g.t === 'v') return Math.abs(px - g.pos);
  if (g.t === 'h') return Math.abs(py - g.pos);
  return projectPointOntoGuide(px, py, g).dist;
}

/** Intersection of two snap-lines, or null if parallel. */
export function intersectSnapLines(a, b) {
  if (!a || !b) return null;
  const ga = guideLineGeometry(snapLineAsGuide(a));
  const gb = guideLineGeometry(snapLineAsGuide(b));
  const det = ga.dx * gb.dy - ga.dy * gb.dx;
  if (Math.abs(det) < 1e-9) return null;
  const t = ((gb.x - ga.x) * gb.dy - (gb.y - ga.y) * gb.dx) / det;
  return { x: ga.x + t * ga.dx, y: ga.y + t * ga.dy };
}

function hitFromSnapLine(g) {
  if (!g) return null;
  if (g.t === 'v' || g.t === 'h') return { t: g.t, pos: g.pos };
  return { t: 'a', x: g.x, y: g.y, angle: g.angle };
}

/**
 * Snap a free point to guide lines. If two (or more) guides are in range,
 * stick to the nearest intersection (works for H/V and angled pairs).
 */
export function snapPointToGuideLines(x, y, lines, th = 7) {
  if (!lines?.length) return { x, y, hit: [] };

  const near = [];
  for (const g of lines) {
    if (!g || (g.t !== 'h' && g.t !== 'v' && g.t !== 'a')) continue;
    const dist = distToSnapLine(x, y, g);
    if (dist < th) near.push({ g, dist });
  }
  if (!near.length) return { x, y, hit: [] };

  // Prefer crosshair: closest intersection of any nearby pair within reach.
  const ixTh = th * 1.75;
  let bestIx = null;
  for (let i = 0; i < near.length; i++) {
    for (let j = i + 1; j < near.length; j++) {
      const p = intersectSnapLines(near[i].g, near[j].g);
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < ixTh && (!bestIx || d < bestIx.d)) {
        bestIx = { x: p.x, y: p.y, d, a: near[i].g, b: near[j].g };
      }
    }
  }
  if (bestIx) {
    return {
      x: bestIx.x,
      y: bestIx.y,
      hit: [hitFromSnapLine(bestIx.a), hitFromSnapLine(bestIx.b)].filter(Boolean),
    };
  }

  // Single guide: project onto the nearest one.
  near.sort((a, b) => a.dist - b.dist);
  const g = near[0].g;
  if (g.t === 'v') return { x: g.pos, y, hit: [{ t: 'v', pos: g.pos }] };
  if (g.t === 'h') return { x, y: g.pos, hit: [{ t: 'h', pos: g.pos }] };
  const p = projectPointOntoGuide(x, y, g);
  return { x: p.x, y: p.y, hit: [{ t: 'a', x: g.x, y: g.y, angle: g.angle }] };
}

function collectEdgeTargets(els) {
  const xs = [];
  const ys = [];
  const pts = [];
  (els || []).forEach((el) => {
    if (!el || el._isDecor) return;
    const ex = +el.x || 0;
    const ey = +el.y || 0;
    const ew = +el.w || 0;
    const eh = +el.h || 0;
    xs.push(ex, ex + ew / 2, ex + ew);
    ys.push(ey, ey + eh / 2, ey + eh);
    pts.push(
      { x: ex, y: ey },
      { x: ex + ew, y: ey },
      { x: ex, y: ey + eh },
      { x: ex + ew, y: ey + eh },
      { x: ex + ew / 2, y: ey },
      { x: ex + ew / 2, y: ey + eh },
      { x: ex, y: ey + eh / 2 },
      { x: ex + ew, y: ey + eh / 2 }
    );
  });
  return { xs, ys, pts };
}

/**
 * Snap a translated AABB to guide lines (H/V + angled).
 * For angled guides, moves the box so the nearest corner/edge-mid lands on the line.
 */
export function snapBoxToGuideLines(x, y, w, h, lines, th = 7) {
  let nx = x;
  let ny = y;
  const hit = [];
  if (!lines?.length) return { x: nx, y: ny, hit };

  for (const g of lines) {
    if (!g) continue;
    if (g.t === 'v') {
      if (Math.abs(nx - g.pos) < th) {
        nx = g.pos;
        hit.push({ t: 'v', pos: g.pos });
      } else if (Math.abs(nx + w / 2 - g.pos) < th) {
        nx = g.pos - w / 2;
        hit.push({ t: 'v', pos: g.pos });
      } else if (Math.abs(nx + w - g.pos) < th) {
        nx = g.pos - w;
        hit.push({ t: 'v', pos: g.pos });
      }
    } else if (g.t === 'h') {
      if (Math.abs(ny - g.pos) < th) {
        ny = g.pos;
        hit.push({ t: 'h', pos: g.pos });
      } else if (Math.abs(ny + h / 2 - g.pos) < th) {
        ny = g.pos - h / 2;
        hit.push({ t: 'h', pos: g.pos });
      } else if (Math.abs(ny + h - g.pos) < th) {
        ny = g.pos - h;
        hit.push({ t: 'h', pos: g.pos });
      }
    }
  }

  const samplePts = [
    [nx, ny],
    [nx + w, ny],
    [nx, ny + h],
    [nx + w, ny + h],
    [nx + w / 2, ny],
    [nx + w / 2, ny + h],
    [nx, ny + h / 2],
    [nx + w, ny + h / 2],
  ];
  let bestA = null;
  for (const g of lines) {
    if (!g || g.t !== 'a') continue;
    for (const [px, py] of samplePts) {
      const p = projectPointOntoGuide(px, py, g);
      if (p.dist < th && (!bestA || p.dist < bestA.dist)) {
        bestA = { dist: p.dist, dx: p.x - px, dy: p.y - py, g };
      }
    }
  }
  if (bestA) {
    nx += bestA.dx;
    ny += bestA.dy;
    hit.push({ t: 'a', x: bestA.g.x, y: bestA.g.y, angle: bestA.g.angle });
  }

  const q = (n) => Math.round(n * 100) / 100;
  return { x: q(nx), y: q(ny), hit };
}

/**
 * While dragging a guide, snap so it sticks to object AABB edges/centers.
 * Moves origin along the guide normal.
 */
export function snapGuideToObjectEdges(g, els, th = 7) {
  const ang = normalizeGuideAngle(g.angle);
  const isH = ang < 12 || ang > 168;
  const isV = Math.abs(ang - 90) < 12;
  const { xs, ys, pts } = collectEdgeTargets(els);
  let x = +g.x || 0;
  let y = +g.y || 0;
  const hit = [];

  if (isH) {
    let best = null;
    ys.forEach((pos) => {
      const dist = Math.abs(y - pos);
      if (dist < th && (!best || dist < best.dist)) best = { pos, dist };
    });
    if (best) {
      y = best.pos;
      hit.push({ t: 'h', pos: best.pos });
    }
  } else if (isV) {
    let best = null;
    xs.forEach((pos) => {
      const dist = Math.abs(x - pos);
      if (dist < th && (!best || dist < best.dist)) best = { pos, dist };
    });
    if (best) {
      x = best.pos;
      hit.push({ t: 'v', pos: best.pos });
    }
  } else {
    // Shift along normal so the line passes through the nearest corner/edge point.
    const { nx, ny } = guideLineGeometry(g);
    let best = null;
    pts.forEach((p) => {
      const d = (p.x - x) * nx + (p.y - y) * ny;
      const ad = Math.abs(d);
      if (ad < th && (!best || ad < best.ad)) best = { d, ad, p };
    });
    if (best) {
      x += best.d * nx;
      y += best.d * ny;
      hit.push({ t: 'a', x: best.p.x, y: best.p.y, angle: ang });
    }
  }
  return { ...g, x, y, hit };
}

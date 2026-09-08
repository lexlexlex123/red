/**
 * Simplify forest SVG path data (Ramer–Douglas–Peucker on flattened curves).
 * Usage: node tools/simplify-forest-paths.js [--tol-title=2] [--tol-content=40]
 * Creates *.bak once, then overwrites js/23a-forest-paths*.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOL_TITLE = (() => {
  const a = process.argv.find(x => x.startsWith('--tol-title='));
  return a ? Math.max(0.2, parseFloat(a.split('=')[1]) || 2) : 2;
})();
const TOL_CONTENT = (() => {
  const a = process.argv.find(x => x.startsWith('--tol-content='));
  return a ? Math.max(1, parseFloat(a.split('=')[1]) || 40) : 40;
})();

function distToSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) {
    const ex = p[0] - a[0], ey = p[1] - a[1];
    return Math.sqrt(ex * ex + ey * ey);
  }
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + t * dx, y = a[1] + t * dy;
  const ex = p[0] - x, ey = p[1] - y;
  return Math.sqrt(ex * ex + ey * ey);
}

function rdp(points, tol) {
  if (points.length <= 2) return points.slice();
  let maxD = 0, idx = 0;
  const a = points[0], b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = distToSeg(points[i], a, b);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > tol) {
    const left = rdp(points.slice(0, idx + 1), tol);
    const right = rdp(points.slice(idx), tol);
    return left.slice(0, -1).concat(right);
  }
  return [a, b];
}

function cubicPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function quadPoint(p0, p1, p2, t) {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
}

function sampleCubic(p0, p1, p2, p3, steps) {
  const out = [];
  for (let i = 1; i <= steps; i++) out.push(cubicPoint(p0, p1, p2, p3, i / steps));
  return out;
}

function sampleQuad(p0, p1, p2, steps) {
  const out = [];
  for (let i = 1; i <= steps; i++) out.push(quadPoint(p0, p1, p2, i / steps));
  return out;
}

function tokenizePath(d) {
  const tokens = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
  let m;
  while ((m = re.exec(d))) {
    if (m[1]) tokens.push({ t: 'cmd', v: m[1] });
    else tokens.push({ t: 'num', v: parseFloat(m[2]) });
  }
  return tokens;
}

function flattenPath(d) {
  const tokens = tokenizePath(d);
  let i = 0;
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let ox = 0, oy = 0; // last control for S/T
  let cmd = '';
  const polys = [];
  let cur = null;

  const nextNum = () => {
    if (i >= tokens.length || tokens[i].t !== 'num') return null;
    return tokens[i++].v;
  };
  const need = (n) => {
    const a = [];
    for (let k = 0; k < n; k++) {
      const v = nextNum();
      if (v == null) return null;
      a.push(v);
    }
    return a;
  };

  const startPoly = () => {
    cur = [];
    polys.push(cur);
  };
  const add = (x, y) => {
    if (!cur) startPoly();
    const last = cur[cur.length - 1];
    if (last && Math.abs(last[0] - x) < 1e-6 && Math.abs(last[1] - y) < 1e-6) return;
    cur.push([x, y]);
  };

  while (i < tokens.length) {
    if (tokens[i].t === 'cmd') {
      cmd = tokens[i++].v;
      if (cmd === 'Z' || cmd === 'z') {
        if (cur && cur.length) add(sx, sy);
        cx = sx; cy = sy;
        cur = null;
        continue;
      }
    } else if (!cmd) {
      i++;
      continue;
    }

    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();

    if (C === 'M') {
      const n = need(2); if (!n) break;
      let x = n[0], y = n[1];
      if (rel) { x += cx; y += cy; }
      cx = x; cy = y; sx = x; sy = y;
      startPoly();
      add(x, y);
      ox = cx; oy = cy;
      // subsequent pairs are L
      cmd = rel ? 'l' : 'L';
      while (i < tokens.length && tokens[i].t === 'num') {
        const p = need(2); if (!p) break;
        let lx = p[0], ly = p[1];
        if (rel) { lx += cx; ly += cy; }
        cx = lx; cy = ly;
        add(lx, ly);
        ox = cx; oy = cy;
      }
      continue;
    }

    if (C === 'L') {
      while (i < tokens.length && tokens[i].t === 'num') {
        const p = need(2); if (!p) break;
        let x = p[0], y = p[1];
        if (rel) { x += cx; y += cy; }
        cx = x; cy = y;
        add(x, y);
        ox = cx; oy = cy;
      }
      continue;
    }

    if (C === 'H') {
      while (i < tokens.length && tokens[i].t === 'num') {
        let x = nextNum();
        if (rel) x += cx;
        cx = x;
        add(cx, cy);
        ox = cx; oy = cy;
      }
      continue;
    }

    if (C === 'V') {
      while (i < tokens.length && tokens[i].t === 'num') {
        let y = nextNum();
        if (rel) y += cy;
        cy = y;
        add(cx, cy);
        ox = cx; oy = cy;
      }
      continue;
    }

    if (C === 'C') {
      while (i < tokens.length && tokens[i].t === 'num') {
        const p = need(6); if (!p) break;
        let x1 = p[0], y1 = p[1], x2 = p[2], y2 = p[3], x = p[4], y = p[5];
        if (rel) {
          x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy;
        }
        const p0 = [cx, cy], p1 = [x1, y1], p2 = [x2, y2], p3 = [x, y];
        sampleCubic(p0, p1, p2, p3, 6).forEach(([px, py]) => add(px, py));
        ox = x2; oy = y2;
        cx = x; cy = y;
      }
      continue;
    }

    if (C === 'S') {
      while (i < tokens.length && tokens[i].t === 'num') {
        const p = need(4); if (!p) break;
        let x2 = p[0], y2 = p[1], x = p[2], y = p[3];
        if (rel) { x2 += cx; y2 += cy; x += cx; y += cy; }
        const x1 = 2 * cx - ox, y1 = 2 * cy - oy;
        const p0 = [cx, cy], p1 = [x1, y1], p2 = [x2, y2], p3 = [x, y];
        sampleCubic(p0, p1, p2, p3, 6).forEach(([px, py]) => add(px, py));
        ox = x2; oy = y2;
        cx = x; cy = y;
      }
      continue;
    }

    if (C === 'Q') {
      while (i < tokens.length && tokens[i].t === 'num') {
        const p = need(4); if (!p) break;
        let x1 = p[0], y1 = p[1], x = p[2], y = p[3];
        if (rel) { x1 += cx; y1 += cy; x += cx; y += cy; }
        sampleQuad([cx, cy], [x1, y1], [x, y], 5).forEach(([px, py]) => add(px, py));
        ox = x1; oy = y1;
        cx = x; cy = y;
      }
      continue;
    }

    if (C === 'T') {
      while (i < tokens.length && tokens[i].t === 'num') {
        const p = need(2); if (!p) break;
        let x = p[0], y = p[1];
        if (rel) { x += cx; y += cy; }
        const x1 = 2 * cx - ox, y1 = 2 * cy - oy;
        sampleQuad([cx, cy], [x1, y1], [x, y], 5).forEach(([px, py]) => add(px, py));
        ox = x1; oy = y1;
        cx = x; cy = y;
      }
      continue;
    }

    if (C === 'A') {
      // Approximate arcs as line to endpoint (silhouettes rarely need perfect arcs here)
      while (i < tokens.length && tokens[i].t === 'num') {
        const p = need(7); if (!p) break;
        let x = p[5], y = p[6];
        if (rel) { x += cx; y += cy; }
        cx = x; cy = y;
        add(x, y);
        ox = cx; oy = cy;
      }
      continue;
    }

    // unknown / stuck
    i++;
  }

  return polys.filter(p => p && p.length >= 2);
}

function polyToPath(poly, closed) {
  if (!poly.length) return '';
  const fmt = (n) => {
    const v = Math.round(n * 100) / 100;
    return String(v);
  };
  let d = 'M' + fmt(poly[0][0]) + ',' + fmt(poly[0][1]);
  for (let i = 1; i < poly.length; i++) {
    d += 'L' + fmt(poly[i][0]) + ',' + fmt(poly[i][1]);
  }
  if (closed) d += 'Z';
  return d;
}

function simplifyPathD(d, tol) {
  const closed = /[Zz]\s*$/.test(d) || /[Zz]/.test(d);
  const polys = flattenPath(d);
  if (!polys.length) return d;
  const parts = [];
  polys.forEach(poly => {
    let simp = rdp(poly, tol);
    if (simp.length < 2) simp = poly.slice(0, 2);
    // drop last if same as first after close
    if (closed && simp.length > 2) {
      const a = simp[0], b = simp[simp.length - 1];
      if (Math.abs(a[0] - b[0]) < 1e-3 && Math.abs(a[1] - b[1]) < 1e-3) simp = simp.slice(0, -1);
    }
    parts.push(polyToPath(simp, closed));
  });
  return parts.join('');
}

function countApprox(d) {
  return (d.match(/[+-]?(?:\d+\.?\d*|\.\d+)/g) || []).length;
}

function simplifyJsStringPath(src, tol) {
  // canopy:"..." or trees:"..."
  return src.replace(/(canopy|trees)\s*:\s*"((?:\\.|[^"\\])*)"/g, (full, key, body) => {
    const raw = body.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
    const before = countApprox(raw);
    const simp = simplifyPathD(raw, tol);
    const after = countApprox(simp);
    console.log('  ', key, before, '->', after, '(' + Math.round(100 * after / Math.max(1, before)) + '%)');
    const esc = simp.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return key + ': "' + esc + '"';
  });
}

function simplifyMarkupPaths(src, tol) {
  let n = 0, beforeAll = 0, afterAll = 0;
  // markup в JS: d=\"...\"  (не жадно до следующей \")
  const out = src.replace(/d=\\"([\s\S]*?)\\"/g, (full, d) => {
    const raw = d.replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    if (raw.length < 40) return full;
    const before = countApprox(raw);
    const simp = simplifyPathD(raw, tol);
    const after = countApprox(simp);
    beforeAll += before;
    afterAll += after;
    n++;
    const esc = simp.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return 'd=\\"' + esc + '\\"';
  });
  console.log('  paths', n, 'nums', beforeAll, '->', afterAll, '(' + Math.round(100 * afterAll / Math.max(1, beforeAll)) + '%)');
  return out;
}

function processFile(rel, mode, tol) {
  const file = path.join(ROOT, rel);
  const bak = file + '.bak';
  const src = fs.readFileSync(file, 'utf8');
  if (!fs.existsSync(bak)) {
    fs.writeFileSync(bak, src);
    console.log('backup', path.basename(bak));
  }
  console.log('Simplify', rel, 'tol=' + tol);
  let out;
  if (mode === 'strings') out = simplifyJsStringPath(src, tol);
  else out = simplifyMarkupPaths(src, tol);
  fs.writeFileSync(file, out);
  console.log('  wrote', fs.statSync(file).size, 'bytes (was', Buffer.byteLength(src), ')');
}

processFile('js/23a-forest-paths.js', 'strings', TOL_TITLE);
processFile('js/23a-forest-paths-content.js', 'markup', TOL_CONTENT);
console.log('Done.');

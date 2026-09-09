const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const FP = ctx.window.FOREST_PATHS_CONTENT;
const vb = FP.viewBox.split(/\s+/).map(Number);
const vbW = vb[2], vbH = vb[3];

function parseMatrix(t) {
  if (!t) return [1, 0, 0, 1, 0, 0];
  const m = t.match(/matrix\(\s*([^)]+)\)/);
  if (m) { const a = m[1].split(/[\s,]+/).map(Number); if (a.length === 6) return a; }
  const tr = t.match(/translate\(\s*([-\d.]+)(?:\s*[,\s]\s*([-\d.]+))?\s*\)/);
  if (tr) return [1, 0, 0, 1, +tr[1], +(tr[2] || 0)];
  return [1, 0, 0, 1, 0, 0];
}
function mul(A, B) {
  return [
    A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
    A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
    A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
  ];
}
function pathBBox(d) {
  const nums = (d || '').match(/-?\d+\.?\d*/g);
  if (!nums) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = +nums[i], y = +nums[i + 1];
    if (isNaN(x) || isNaN(y)) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (!isFinite(minX)) return null;
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

const html = `<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform || ''}">${FP.markup}</g></svg>`;
const doc = new JSDOM(html, { contentType: 'image/svg+xml' }).window.document;
const rootM = parseMatrix(FP.groupTransform || '');

function worldBBox(el) {
  let m = rootM.slice();
  let p = el;
  while (p && p.tagName !== 'svg') {
    const t = p.getAttribute && p.getAttribute('transform');
    if (t) m = mul(m, parseMatrix(t));
    p = p.parentElement;
  }
  const paths = el.tagName === 'path' ? [el] : [...el.querySelectorAll('path')];
  let bb = null;
  paths.forEach(path => {
    const local = pathBBox(path.getAttribute('d'));
    if (!local) return;
    const corners = [[local.minX, local.minY], [local.maxX, local.maxY]].map(([x, y]) =>
      [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
    const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
    const b = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    if (!bb) bb = b;
    else {
      bb.minX = Math.min(bb.minX, b.minX); bb.maxX = Math.max(bb.maxX, b.maxX);
      bb.minY = Math.min(bb.minY, b.minY); bb.maxY = Math.max(bb.maxY, b.maxY);
    }
  });
  if (!bb) return null;
  bb.cx = (bb.minX + bb.maxX) / 2;
  bb.cy = (bb.minY + bb.maxY) / 2;
  bb.w = bb.maxX - bb.minX;
  bb.h = bb.maxY - bb.minY;
  return bb;
}

// large silhouettes center x 55-80%, y 40-95%
const hits = [];
doc.querySelectorAll('path[id]').forEach(path => {
  const bb = worldBBox(path);
  if (!bb || bb.h < 80 || bb.w < 40) return;
  const xPct = bb.cx / vbW * 100;
  const yPct = bb.cy / vbH * 100;
  if (xPct >= 55 && xPct <= 80 && yPct >= 35 && yPct <= 100) {
    hits.push({ id: path.getAttribute('id'), xPct: xPct.toFixed(0), yPct: yPct.toFixed(0), h: bb.h.toFixed(0), w: bb.w.toFixed(0) });
  }
});
hits.sort((a, b) => +b.h - +a.h);
console.log('large paths 55-80% x:', hits.slice(0, 20));

const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const FP = ctx.window.FOREST_PATHS_CONTENT;
const gt = (FP.groupTransform || '').match(/translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)/);
const gtx = gt ? +gt[1] : 0, gty = gt ? +gt[2] : 0;

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
  if (!nums || nums.length < 2) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = +nums[i], y = +nums[i + 1];
    if (isNaN(x) || isNaN(y)) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

const html = `<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform || ''}">${FP.markup}</g></svg>`;
const doc = new JSDOM(html, { contentType: 'image/svg+xml' }).window.document;
const rootM = parseMatrix(FP.groupTransform || '');

const ids = ['path10598', 'path10595', 'g11470', 'g9841', 'g9841-2',
  'path10138', 'path4345', 'path4487', 'path4507', 'path4583'];
const vb = FP.viewBox.split(/\s+/).map(Number);
const vbW = vb[2], vbH = vb[3];

console.log('viewBox', FP.viewBox, 'groupTransform', FP.groupTransform);

ids.forEach(id => {
  const el = doc.getElementById(id);
  if (!el) { console.log(id, 'MISSING'); return; }
  let m = rootM.slice();
  let p = el;
  const chain = [];
  while (p && p !== doc.documentElement) {
    const t = p.getAttribute && p.getAttribute('transform');
    if (t) { m = mul(m, parseMatrix(t)); chain.push(t.slice(0, 40)); }
    p = p.parentElement;
  }
  const paths = el.tagName === 'path' ? [el] : [...el.querySelectorAll('path')];
  if (!paths.length) { console.log(id, 'no paths, tag', el.tagName); return; }
  let bb = null;
  paths.forEach(path => {
    const d = path.getAttribute('d');
    const local = pathBBox(d);
    if (!local) return;
    const corners = [
      [local.minX, local.minY], [local.maxX, local.minY],
      [local.minX, local.maxY], [local.maxX, local.maxY],
    ].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
    const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
    const b = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    if (!bb) bb = b;
    else {
      bb.minX = Math.min(bb.minX, b.minX); bb.maxX = Math.max(bb.maxX, b.maxX);
      bb.minY = Math.min(bb.minY, b.minY); bb.maxY = Math.max(bb.maxY, b.maxY);
    }
  });
  if (!bb) return;
  const xPct = ((bb.minX + bb.maxX) / 2 / vbW * 100).toFixed(0);
  const yPct = ((bb.minY + bb.maxY) / 2 / vbH * 100).toFixed(0);
  console.log(id, 'paths', paths.length, 'x~' + xPct + '%', 'y~' + yPct + '%', 'bbox y', bb.minY.toFixed(0), '-', bb.maxY.toFixed(0));
});

// paths in g11470 with center x > 50% vbW
const g = doc.getElementById('g11470');
let deerLike = [];
[...g.querySelectorAll('path')].forEach((path, i) => {
  const d = path.getAttribute('d');
  const local = pathBBox(d);
  if (!local) return;
  const x = local.cx, y = local.cy;
  const xPct = x / vbW * 100;
  if (xPct > 55 && xPct < 80 && y > vbH * 0.25 && y < vbH * 0.75) {
    deerLike.push({ id: path.getAttribute('id') || ('path#' + i), xPct: xPct.toFixed(0), yPct: (y / vbH * 100).toFixed(0) });
  }
});
console.log('deer-like paths inside g11470:', deerLike.slice(0, 15), 'count', deerLike.length);

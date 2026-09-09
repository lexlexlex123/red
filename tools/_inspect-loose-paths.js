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
  const sc = t.match(/scale\(\s*([-\d.]+)(?:\s*[,\s]\s*([-\d.]+))?\s*\)/);
  if (sc) return [+sc[1], 0, 0, +(sc[2] || sc[1]), 0, 0];
  return [1, 0, 0, 1, 0, 0];
}
function mul(A, B) {
  return [
    A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
    A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
    A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
  ];
}
function xf(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }

function pathBBoxXY(d) {
  const re = /[MLCQSTAHVZmlcqstahvz]/g;
  const tokens = d.split(re).filter(Boolean);
  // use all numbers from path
  const nums = d.match(/-?\d+\.?\d*/g);
  if (!nums) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = +nums[i], y = +nums[i + 1];
    if (isNaN(x) || isNaN(y)) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { minX, maxX, minY, maxY };
}

const html = `<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform || ''}">${FP.markup}</g></svg>`;
const doc = new JSDOM(html, { contentType: 'image/svg+xml' }).window.document;
const rootM = parseMatrix(FP.groupTransform || '');

function report(id) {
  const el = doc.getElementById(id);
  if (!el) return console.log(id, 'missing');
  let m = rootM.slice();
  let p = el;
  while (p && p.tagName !== 'svg') {
    const t = p.getAttribute && p.getAttribute('transform');
    if (t) m = mul(m, parseMatrix(t));
    p = p.parentElement;
  }
  const bb = pathBBoxXY(el.getAttribute('d'));
  if (!bb) return console.log(id, 'no bb');
  const corners = [[bb.minX, bb.minY], [bb.maxX, bb.maxY], [bb.minX, bb.maxY], [bb.maxX, bb.minY]]
    .map(([x, y]) => xf(m, x, y));
  const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const h = Math.max(...ys) - Math.min(...ys);
  console.log(id, 'x', (cx / vbW * 100).toFixed(0) + '%', 'y', (cy / vbH * 100).toFixed(0) + '%', 'h', h.toFixed(0));
}

['path10598', 'path10595', 'path4345', 'path4349', 'path4487', 'path4507', 'path4517', 'path4539', 'path4551', 'path4583', 'path10138'].forEach(report);

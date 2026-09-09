const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const FP = ctx.window.FOREST_PATHS_CONTENT;

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
const vb = FP.viewBox.split(/\s+/).map(Number);
const vbW = vb[2], vbH = vb[3];

function bboxEl(el) {
  let m = rootM.slice();
  let p = el;
  while (p && p !== doc.documentElement) {
    const t = p.getAttribute && p.getAttribute('transform');
    if (t) m = mul(m, parseMatrix(t));
    p = p.parentElement;
  }
  const paths = el.tagName === 'path' ? [el] : [...el.querySelectorAll('path')];
  let bb = null;
  paths.forEach(path => {
    const local = pathBBox(path.getAttribute('d'));
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
  return bb;
}

['g11102', 'path10764', 'path10598', 'g11470'].forEach(id => {
  const el = doc.getElementById(id);
  if (!el) { console.log(id, 'MISSING'); return; }
  const bb = bboxEl(el);
  const xPct = ((bb.minX + bb.maxX) / 2 / vbW * 100).toFixed(0);
  const yPct = ((bb.minY + bb.maxY) / 2 / vbH * 100).toFixed(0);
  const paths = el.tagName === 'path' ? 1 : el.querySelectorAll('path').length;
  console.log(id, 'paths', paths, 'x~' + xPct + '%', 'y~' + yPct + '%', 'w', (bb.maxX-bb.minX).toFixed(0), 'h', (bb.maxY-bb.minY).toFixed(0));
});

// children of g11470
const g11470 = doc.getElementById('g11470');
[...g11470.children].forEach(ch => {
  const bb = bboxEl(ch);
  const xPct = ((bb.minX + bb.maxX) / 2 / vbW * 100).toFixed(0);
  const yPct = ((bb.minY + bb.maxY) / 2 / vbH * 100).toFixed(0);
  const paths = ch.querySelectorAll('path').length;
  console.log('child', ch.id || ch.tagName, 'paths', paths, 'x~' + xPct + '%', 'y~' + yPct + '%');
});

const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const FP = ctx.window.FOREST_PATHS_CONTENT;
const html = `<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform}">${FP.markup}</g></svg>`;
const doc = new JSDOM(html, { contentType: 'image/svg+xml' }).window.document;

function parseMatrix(t) {
  if (!t) return [1, 0, 0, 1, 0, 0];
  const m = t.match(/matrix\(\s*([^)]+)\)/);
  if (m) { const a = m[1].split(/[\s,]+/).map(Number); if (a.length === 6) return a; }
  const tr = t.match(/translate\(\s*([-\d.]+)(?:\s*[,\s]\s*([-\d.]+))?\s*\)/);
  if (tr) return [1, 0, 0, 1, +tr[1], +(tr[2] || 0)];
  return [1, 0, 0, 1, 0, 0];
}
function mul(A, B) {
  return [A[0]*B[0]+A[2]*B[1], A[1]*B[0]+A[3]*B[1], A[0]*B[2]+A[2]*B[3], A[1]*B[2]+A[3]*B[3], A[0]*B[4]+A[2]*B[5]+A[4], A[1]*B[4]+A[3]*B[5]+A[5]];
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
  return { minX, maxX, minY, maxY };
}
function bboxEl(el) {
  let m = parseMatrix(FP.groupTransform);
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
    [[local.minX, local.minY], [local.maxX, local.minY], [local.minX, local.maxY], [local.maxX, local.maxY]].forEach(([x, y]) => {
      const X = m[0] * x + m[2] * y + m[4], Y = m[1] * x + m[3] * y + m[5];
      if (!bb) bb = { minX: X, maxX: X, minY: Y, maxY: Y };
      else { bb.minX = Math.min(bb.minX, X); bb.maxX = Math.max(bb.maxX, X); bb.minY = Math.min(bb.minY, Y); bb.maxY = Math.max(bb.maxY, Y); }
    });
  });
  return bb;
}

const deer = bboxEl(doc.getElementById('g11102'));
const grass = bboxEl(doc.getElementById('g9841'));
const grass2 = bboxEl(doc.getElementById('g9841-2'));
console.log('deer', deer);
console.log('grass1', grass);
console.log('grass2', grass2);
function overlap(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}
console.log('deer overlaps grass1', overlap(deer, grass));
console.log('deer overlaps grass2', overlap(deer, grass2));

// flower paths near deer
['path4345','path4487','path4507'].forEach(id => {
  const bb = bboxEl(doc.getElementById(id));
  console.log(id, bb, 'overlap deer', overlap(deer, bb));
});

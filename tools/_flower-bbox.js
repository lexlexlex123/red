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
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

const flowerIds = ['path10138', 'path4345', 'path4349', 'path4487', 'path4507', 'path4517', 'path4539', 'path4551', 'path4583'];
let m = parseMatrix(FP.groupTransform);
flowerIds.forEach(id => {
  const el = doc.getElementById(id);
  if (!el) { console.log(id, 'MISSING'); return; }
  const local = pathBBox(el.getAttribute('d'));
  const corners = [[local.minX, local.minY], [local.maxX, local.maxY]].map(([x, y]) => [m[0]*x+m[4], m[1]*x+m[5]]);
  console.log(id, 'local w', local.w.toFixed(0), 'h', local.h.toFixed(0), 'd len', el.getAttribute('d').length);
});

// paths in g10692 that are NOT g9841/g9841-2
const g10692 = doc.getElementById('g10692');
[...g10692.children].forEach(ch => {
  console.log('g10692 child', ch.id, ch.tagName);
});

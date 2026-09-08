const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const FP = ctx.window.FOREST_PATHS_CONTENT;
const doc = new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform}">${FP.markup}</g></svg>`, { contentType: 'image/svg+xml' }).window.document;
const vbW = 1523.4225;

function parseMatrix(t) {
  if (!t) return [1, 0, 0, 1, 0, 0];
  const m = t.match(/matrix\(\s*([^)]+)\)/);
  if (m) { const a = m[1].split(/[\s,]+/).map(Number); if (a.length === 6) return a; }
  return [1, 0, 0, 1, 0, 0];
}
function mul(A, B) {
  return [A[0]*B[0]+A[2]*B[1], A[1]*B[0]+A[3]*B[1], A[0]*B[2]+A[2]*B[3], A[1]*B[2]+A[3]*B[3], A[0]*B[4]+A[2]*B[5]+A[4], A[1]*B[4]+A[3]*B[5]+A[5]];
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
    const nums = (path.getAttribute('d') || '').match(/-?\d+\.?\d*/g);
    if (!nums) return;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = +nums[i], y = +nums[i + 1];
      const X = m[0]*x+m[2]*y+m[4], Y = m[1]*x+m[3]*y+m[5];
      if (!bb) bb = { minX: X, maxX: X, minY: Y, maxY: Y };
      else { bb.minX = Math.min(bb.minX, X); bb.maxX = Math.max(bb.maxX, X); bb.minY = Math.min(bb.minY, Y); bb.maxY = Math.max(bb.maxY, Y); }
    }
  });
  return bb;
}

['path10598', 'path10595', 'g9841', 'g9841-2', 'path4345', 'path4349', 'path4487'].forEach(id => {
  const el = doc.getElementById(id);
  if (!el) { console.log(id, 'MISSING'); return; }
  const bb = bboxEl(el);
  console.log(id, 'x~' + (((bb.minX + bb.maxX) / 2 / vbW * 100) | 0) + '%', 'y', bb.minY.toFixed(0) + '-' + bb.maxY.toFixed(0), 'paths', el.tagName === 'path' ? 1 : el.querySelectorAll('path').length);
});

const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const FP = ctx.window.FOREST_PATHS_CONTENT;

function extractById(html, id) {
  const needle = 'id="' + id + '"';
  const at = html.indexOf(needle);
  if (at < 0) return '';
  const start = html.lastIndexOf('<', at);
  if (html.slice(start, start + 2) !== '<g') return '';
  let i = html.indexOf('>', at) + 1, depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<g', i);
    const nextClose = html.indexOf('</g>', i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) { depth++; i = nextOpen + 2; }
    else { depth--; i = nextClose + 4; if (depth === 0) return html.slice(start, i); }
  }
  return '';
}

const g9841 = extractById(FP.markup, 'g9841');
const g9841_2 = extractById(FP.markup, 'g9841-2');
console.log('g9841 len', g9841.length, 'paths', (g9841.match(/<path/g)||[]).length);
console.log('g9841-2 len', g9841_2.length, 'paths', (g9841_2.match(/<path/g)||[]).length);

const html = `<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform}">${FP.markup}</g></svg>`;
const doc = new JSDOM(html, { contentType: 'image/svg+xml' }).window.document;
const vb = FP.viewBox.split(/\s+/).map(Number);
const vbW = vb[2];

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
function bboxEl(el) {
  let m = parseMatrix(FP.groupTransform);
  let p = el;
  while (p && p.tagName !== 'svg') {
    const t = p.getAttribute && p.getAttribute('transform');
    if (t) m = mul(m, parseMatrix(t));
    p = p.parentElement;
  }
  const paths = [...el.querySelectorAll('path')];
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

['g9841', 'g9841-2', 'g10692'].forEach(id => {
  const el = doc.getElementById(id);
  if (!el) { console.log(id, 'MISSING in DOM'); return; }
  const bb = bboxEl(el);
  console.log(id, 'x', bb.minX.toFixed(0), '-', bb.maxX.toFixed(0), `(${(bb.minX/vbW*100).toFixed(0)}-${(bb.maxX/vbW*100).toFixed(0)}%)`, 'y', bb.minY.toFixed(0), '-', bb.maxY.toFixed(0));
});

// g10692 children
const g10692 = doc.getElementById('g10692');
console.log('g10692 children:', [...g10692.children].map(c => c.id));

// check if path10598/10595 are grass-like
['path10598', 'path10595'].forEach(id => {
  const el = doc.getElementById(id);
  const bb = bboxEl(el);
  console.log(id, 'x', bb.minX.toFixed(0), '-', bb.maxX.toFixed(0), 'y', bb.minY.toFixed(0), '-', bb.maxY.toFixed(0));
});

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

const vb = FP.viewBox.split(/\s+/).map(Number);
const vbW = vb[2];

['g10734', 'g11102', 'g11470'].forEach(id => {
  const bb = bboxEl(doc.getElementById(id));
  console.log(id, 'x%', ((bb.minX+bb.maxX)/2/vbW*100).toFixed(0), 'x range', bb.minX.toFixed(0), bb.maxX.toFixed(0), 'y', bb.minY.toFixed(0), bb.maxY.toFixed(0));
});

// trees-only after remove deer
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
function removeById(html, id) {
  const chunk = extractById(html, id);
  return chunk ? html.replace(chunk, '') : html;
}
const treesOnly = removeById(extractById(FP.markup, 'g11470'), 'g11102');
const doc2 = new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform}">${treesOnly}</g></svg>`, { contentType: 'image/svg+xml' }).window.document;
const g11470b = doc2.querySelector('[id="g11470"]');
const bb2 = bboxEl(g11470b);
console.log('trees without deer bbox x', bb2.minX.toFixed(0), bb2.maxX.toFixed(0));

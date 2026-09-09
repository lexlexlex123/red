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
function removeById(html, id) {
  const chunk = extractById(html, id);
  return chunk ? html.replace(chunk, '') : html;
}

const treesOnly = removeById(extractById(FP.markup, 'g11470'), 'g11102');
const html = `<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform}">${treesOnly}</g></svg>`;
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

const g10734 = doc.getElementById('g10734');
let m = parseMatrix(FP.groupTransform);
let p = g10734;
while (p && p.tagName !== 'svg') {
  const t = p.getAttribute && p.getAttribute('transform');
  if (t) m = mul(m, parseMatrix(t));
  p = p.parentElement;
}

let rightPaths = 0;
[...g10734.querySelectorAll('path')].forEach(path => {
  const nums = (path.getAttribute('d') || '').match(/-?\d+\.?\d*/g);
  if (!nums) return;
  let maxX = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = +nums[i], y = +nums[i + 1];
    const X = m[0]*x+m[2]*y+m[4];
    maxX = Math.max(maxX, X);
  }
  if (maxX > 750) rightPaths++;
});
console.log('g10734 paths with maxX>750:', rightPaths, 'of', g10734.querySelectorAll('path').length);

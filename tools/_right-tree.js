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
  const tr = t.match(/translate\(\s*([-\d.]+)(?:\s*[,\s]\s*([-\d.]+))?\s*\)/);
  if (tr) return [1, 0, 0, 1, +tr[1], +(tr[2] || 0)];
  return [1, 0, 0, 1, 0, 0];
}
function mul(A, B) {
  return [A[0]*B[0]+A[2]*B[1], A[1]*B[0]+A[3]*B[1], A[0]*B[2]+A[2]*B[3], A[1]*B[2]+A[3]*B[3], A[0]*B[4]+A[2]*B[5]+A[4], A[1]*B[4]+A[3]*B[5]+A[5]];
}

const g11470 = doc.getElementById('g11470');
let m = parseMatrix(FP.groupTransform);
let p = g11470;
while (p && p.tagName !== 'svg') {
  const t = p.getAttribute && p.getAttribute('transform');
  if (t) m = mul(m, parseMatrix(t));
  p = p.parentElement;
}

const rightPaths = [];
[...g11470.querySelectorAll('path')].forEach(path => {
  const nums = (path.getAttribute('d') || '').match(/-?\d+\.?\d*/g);
  if (!nums) return;
  let maxX = -Infinity, cx = 0, n = 0;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = +nums[i], y = +nums[i + 1];
    const X = m[0]*x+m[2]*y+m[4];
    maxX = Math.max(maxX, X); cx += X; n++;
  }
  cx /= n;
  const xPct = cx / vbW * 100;
  if (xPct > 60) rightPaths.push({ id: path.getAttribute('id'), xPct: xPct.toFixed(0), maxX: maxX.toFixed(0) });
});
console.log('paths in g11470 with x>60%:', rightPaths.slice(0, 20), 'count', rightPaths.length);

// check path10138 parent
const p10138 = doc.getElementById('path10138');
let chain = [];
p = p10138;
while (p && p.tagName !== 'svg') { chain.push(p.id || p.tagName); p = p.parentElement; }
console.log('path10138 chain', chain.join(' < '));

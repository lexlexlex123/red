const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

function extractById(html, id) {
  const needle = 'id="' + id + '"';
  const at = html.indexOf(needle);
  if (at < 0) return '';
  const start = html.lastIndexOf('<', at);
  if (html.slice(start, start + 5) === '<path') {
    const gt = html.indexOf('>', at);
    if (html.charAt(gt - 1) === '/') return html.slice(start, gt + 1);
    const end = html.indexOf('</path>', gt);
    return end < 0 ? '' : html.slice(start, end + 7);
  }
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

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const FP = ctx.window.FOREST_PATHS_CONTENT;
const deerMk = extractById(FP.markup, 'g11102');
const treesMk = removeById(extractById(FP.markup, 'g11470'), 'g11102');
console.log('deer len', deerMk.length, 'trees len', treesMk.length);
console.log('trees still has g11102', treesMk.includes('g11102'));

// clip simulation - what % of flower bbox remains outside x>788
const vbW = 1523.4225;
const clipX = 788;
const flowerIds = ['path10138', 'path4345', 'path4349', 'path4487', 'path4507', 'path4517', 'path4539', 'path4551', 'path4583'];
const html = `<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform}">${FP.markup}</g></svg>`;
const doc = new JSDOM(html, { contentType: 'image/svg+xml' }).window.document;
const gt = FP.groupTransform.match(/translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)/);
const gtx = +gt[1], gty = +gt[2];

flowerIds.forEach(id => {
  const el = doc.getElementById(id);
  const d = el.getAttribute('d');
  const nums = d.match(/-?\d+\.?\d*/g).map(Number);
  let minX = Infinity, maxX = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i] + gtx;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  }
  const visible = maxX > clipX ? (Math.min(maxX, vbW) - Math.max(minX, clipX)) / (maxX - minX) : 0;
  const kept = minX >= clipX ? 0 : 1 - visible;
  console.log(id, 'x', minX.toFixed(0), '-', maxX.toFixed(0), 'kept~', (kept * 100).toFixed(0) + '%');
});

const fs = require('fs');
const vm = require('vm');

function extractById(html, id) {
  const needle = 'id="' + id + '"';
  const at = html.indexOf(needle);
  if (at < 0) return '';
  const start = html.lastIndexOf('<', at);
  if (html.slice(start, start + 5) === '<path') {
    const gt = html.indexOf('>', at);
    if (gt < 0) return '';
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

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const m = ctx.window.FOREST_PATHS_CONTENT.markup;

const trees = extractById(m, 'g11470');
const deer = extractById(m, 'path10598') + extractById(m, 'path10595');
const flowers = ['path10138', 'path4345', 'path4349', 'path4487', 'path4507', 'path4517', 'path4539', 'path4551', 'path4583'].map(id => extractById(m, id)).join('');

console.log('path10764 in trees', trees.includes('path10764'));
console.log('path10764 in deer', deer.includes('path10764'));
console.log('path10764 in flowers', flowers.includes('path10764'));

// remove path10764 from trees for deer layer
function removePathById(html, id) {
  const needle = 'id="' + id + '"';
  const at = html.indexOf(needle);
  if (at < 0) return html;
  const start = html.lastIndexOf('<', at);
  if (html.slice(start, start + 5) !== '<path') return html;
  const gt = html.indexOf('>', at);
  let end = gt + 1;
  if (html.charAt(gt - 1) !== '/') end = html.indexOf('</path>', gt) + 7;
  return html.slice(0, start) + html.slice(end);
}

const treesNoDeer = removePathById(trees, 'path10764');
console.log('trees size diff', trees.length - treesNoDeer.length);

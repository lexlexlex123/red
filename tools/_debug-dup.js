const fs = require('fs');
const vm = require('vm');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const mk = ctx.window.FOREST_PATHS_CONTENT.markup;

function extractById(html, id) {
  const needle = 'id="' + id + '"';
  const at = html.indexOf(needle);
  if (at < 0) return null;
  const start = html.lastIndexOf('<', at);
  if (html.slice(start, start + 5) === '<path') {
    const gt = html.indexOf('>', at);
    if (html.charAt(gt - 1) === '/') return html.slice(start, gt + 1);
    const end = html.indexOf('</path>', gt);
    return html.slice(start, end + 7);
  }
  if (html.slice(start, start + 2) !== '<g') return null;
  let i = html.indexOf('>', at) + 1, depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<g', i);
    const nextClose = html.indexOf('</g>', i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) { depth++; i = nextOpen + 2; }
    else { depth--; i = nextClose + 4; if (depth === 0) return html.slice(start, i); }
  }
  return null;
}

const g11470 = extractById(mk, 'g11470');
const p10138in11470 = g11470 && g11470.includes('path10138');
const p10138in10692 = (extractById(mk, 'g10692') || '').includes('path10138');
const treesMk = extractById(mk, 'g11470').replace(extractById(mk, 'g11102') || '', '') + extractById(mk, 'path10138');
const dupCount = (treesMk.match(/path10138/g) || []).length;

console.log('path10138 inside g11470?', p10138in11470);
console.log('path10138 inside g10692?', p10138in10692);
console.log('path10138 count in treesMk', dupCount);
console.log('path10138 inside flowers ids chunk?', ['path4345','path4349'].map(id => (extractById(mk, id) || '').includes('path10138')));

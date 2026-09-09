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

const parts = {
  trees: extractById(m, 'g11470'),
  deer: extractById(m, 'path10598') + extractById(m, 'path10595'),
  grass1: extractById(m, 'g9841'),
  grass2: extractById(m, 'g9841-2'),
  flowers: ['path10138', 'path4345', 'path4349', 'path4487', 'path4507', 'path4517', 'path4539', 'path4551', 'path4583'].map(id => extractById(m, id)).join(''),
};

['deer', 'trees', 'grass1', 'grass2', 'flowers'].forEach(k => {
  const p = parts[k];
  console.log(k, 'len', p.length, '10598', p.includes('id="path10598"'), '10595', p.includes('id="path10595"'));
});

// overlap: which part contains path10598 id
['path10598', 'path10595', 'path10764'].forEach(id => {
  console.log('---', id);
  ['deer', 'trees', 'grass1', 'grass2', 'flowers'].forEach(k => {
    if (parts[k].includes('id="' + id + '"')) console.log('  in', k);
  });
});

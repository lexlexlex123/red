const fs = require('fs');
const vm = require('vm');

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

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const FP = ctx.window.FOREST_PATHS_CONTENT;

const grass1 = extractById(FP.markup, 'g9841');
const grass2 = extractById(FP.markup, 'g9841-2');
const g10692 = extractById(FP.markup, 'g10692');
console.log('grass1', grass1.length, 'starts', grass1.slice(0, 80));
console.log('g10692', g10692.length, 'children ids', [...g10692.matchAll(/id=\"(g9841|path10598|path10595|g9841-2)\"/g)].map(m => m[1]));

const w = 1200, h = 675;
const ctx2 = {
  window: {},
  slides: [{ bgc: '#fff' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: false }),
  _schemeSwatchColor: () => '#889',
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx2);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx2);
const svg = ctx2.window._buildForestInkscape(w, h, '#778', '#889', false, true);

// count path elements in grass sway section - between skewX blocks
const idx1 = svg.indexOf('skewX');
const chunk = svg.slice(idx1, idx1 + 200000);
console.log('paths in first sway chunk', (chunk.match(/<path/g) || []).length);
console.log('has id g9841', svg.includes('id="g9841"'));
console.log('has id g9841-2', svg.includes('id="g9841-2"'));
console.log('has path10598', svg.includes('path10598'));

// find grass by searching for unique path id inside g9841
const sampleId = 'path9839'; // guess - search first path id in g9841
const m = grass1.match(/id=\"(path[^\"]+)\"/);
if (m) {
  console.log('sample grass path id', m[1], 'in svg', svg.includes(m[1]));
}

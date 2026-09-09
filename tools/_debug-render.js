const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const w = 1200, h = 675;
const ctx = {
  window: {},
  slides: [{ bgScheme: null, bgc: '#eef' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: false, bg: '#eef' }),
  _schemeSwatchColor: (th, col, row) => (col === 1 && row === 8 ? '#9ab' : '#bcd'),
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const svg = ctx.window._buildForestInkscape(w, h, '#bcd', '#9ab', false, true);

const doc = new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document;
const paths = doc.querySelectorAll('path');
let deerPaths = 0, grassPaths = 0, flowerColored = 0;
paths.forEach(p => {
  const id = p.getAttribute('id') || '';
  if (id.includes('10764') || p.closest('[id*="11102"]')) deerPaths++;
});
const inner = doc.querySelector('svg svg');
console.log('nested svg', !!inner, 'viewBox', inner?.getAttribute('viewBox'));
console.log('total paths', paths.length);
console.log('clipPath', doc.querySelector('clipPath')?.getAttribute('id'));
console.log('clip refs', [...svg.matchAll(/clip-path="url\(#([^)]+)\)"/g)].map(m => m[1]));

// Check layer sizes
function countInChunk(marker) {
  const i = svg.indexOf(marker);
  if (i < 0) return 0;
  return (svg.slice(i, i + 80000).match(/<path/g) || []).length;
}
console.log('g11102 paths nearby', countInChunk('g11102'));
console.log('g9841 paths nearby', countInChunk('g9841'));
console.log('g9841-2 paths nearby', countInChunk('g9841-2'));

// deer bbox in output - find path10764
const p764 = doc.getElementById('path10764');
console.log('path10764 in output', !!p764);

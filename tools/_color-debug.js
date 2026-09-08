const fs = require('fs');
const vm = require('vm');
const ctx = {
  window: {},
  slides: [{ bgc: '#fff' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: false }),
  _schemeSwatchColor: (th, c, r) => `SW_${c}_${r}`,
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const svg = ctx.window._buildForestInkscape(1200, 675, 'fb', 'fb', false, true);

function chunkAround(id, len) {
  const i = svg.indexOf(id);
  if (i < 0) return { id, found: false };
  const chunk = svg.slice(Math.max(0, i - 300), i + len);
  const fills = [...chunk.matchAll(/fill="([^"]+)"/g)].map(m => m[1]);
  const styleFills = [...chunk.matchAll(/fill:([^;"']+)/g)].map(m => m[1]);
  return { id, found: true, fills: [...new Set(fills)], styleFills: [...new Set(styleFills)], sway: chunk.includes('skewX') };
}

['path10138', 'path4345', 'g11102', 'g10692', 'g10734'].forEach(id => console.log(chunkAround(id, 500)));

// count color occurrences
console.log('SW_1_7 count', (svg.match(/SW_1_7/g) || []).length);
console.log('SW_1_8 count', (svg.match(/SW_1_8/g) || []).length);

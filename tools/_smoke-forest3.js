const fs = require('fs');
const vm = require('vm');
const w = 1200, h = 675;
const ctx = {
  window: {},
  slides: [{ bgc: '#fff' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: false }),
  _schemeSwatchColor: () => '#99a',
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const svg = ctx.window._buildForestInkscape(w, h, '#bbc', '#99a', false, true);

const checks = [
  ['no clip deerEx', !svg.includes('deerEx')],
  ['g11102 twice (back+front)', (svg.match(/g11102/g) || []).length === 2],
  ['g11102 inside g11470', svg.includes('g10734') && svg.indexOf('g11102') > svg.indexOf('g10734')],
  ['grass2 present', svg.includes('g9841-2')],
  ['flowers present', svg.includes('path4345')],
  ['deer not in sway', svg.indexOf('g11102') < svg.indexOf('skewX')],
  ['deer also after sway', svg.lastIndexOf('g11102') > svg.lastIndexOf('skewX')],
];
checks.forEach(([n, ok]) => console.log(ok ? 'OK' : 'FAIL', n));
process.exit(checks.every(c => c[1]) ? 0 : 1);

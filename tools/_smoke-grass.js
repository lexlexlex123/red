const fs = require('fs');
const vm = require('vm');
const w = 1200, h = 675;
const ctx = {
  window: {},
  slides: [{ bgc: '#fff' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: false }),
  _schemeSwatchColor: (th, col, row) => (col === 0 && row === 7 ? '#grass18' : col === 1 && row === 8 ? '#flower29' : '#accent19'),
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const svg = ctx.window._buildForestInkscape(w, h, '#grass18', '#accent19', false, true);

const checks = [
  ['g10692 grass group', svg.includes('g10692')],
  ['right grass path10598', svg.includes('path10598')],
  ['right grass path10595', svg.includes('path10595')],
  ['left grass g9841', svg.includes('g9841')],
  ['grass color c18', svg.includes('#grass18')],
  ['no duplicate deer front', (svg.match(/g11102/g) || []).length === 1],
  ['grass after flowers', svg.lastIndexOf('g10692') > svg.indexOf('path4345')],
];
checks.forEach(([n, ok]) => console.log(ok ? 'OK' : 'FAIL', n));
process.exit(checks.every(c => c[1]) ? 0 : 1);

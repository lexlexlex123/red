const fs = require('fs');
const vm = require('vm');
const ctx = {
  window: { _FOREST_DEBUG_COLORS: false },
  slides: [{ bgc: '#fff' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: false }),
  _schemeSwatchColor: (th, c, r) => (c === 1 && r === 7 ? '#C28' : '#C29'),
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const svg = ctx.window._buildForestInkscape(1200, 675, 'fb', 'fb', false, true);

const checks = [
  ['g9841 present', svg.includes('g9841')],
  ['g9841-2 present', svg.includes('g9841-2')],
  ['path10598 present', svg.includes('path10598')],
  ['no path4345', !svg.includes('path4345')],
  ['fog cloud op', svg.includes('0.8;0.5;0.2;0.6;0.7;0.2;0.9;0.5;0.8')],
  ['sway on flowers', svg.includes('skewX')],
  ['fog before grass', svg.indexOf('fogG') < svg.indexOf('path10598')],
  ['flowers after grass', svg.indexOf('g9841') > svg.indexOf('path10598')],
  ['rev 9', ctx.window._FOREST_LAYOUT_REV === 9],
];
checks.forEach(([n, ok]) => console.log(ok ? 'OK' : 'FAIL', n));
process.exit(checks.every(c => c[1]) ? 0 : 1);

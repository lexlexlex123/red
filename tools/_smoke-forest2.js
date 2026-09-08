const fs = require('fs');
const vm = require('vm');

const ctx = {
  window: {},
  slides: [{ bgScheme: null, bgc: '#1a1a1a' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: true, bg: '#1a1a1a' }),
  _schemeSwatchColor: () => null,
  _resolveSchemeColor: () => null,
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);

const svg = ctx.window._buildForestInkscape(1200, 675, '#333', '#666', false, true);
const ok = [
  ['has deer group', svg.includes('g11102')],
  ['deer only once in trees', (svg.match(/g11102/g) || []).length === 1],
  ['no wrong deer paths', !svg.includes('path10598') && !svg.includes('path10595')],
  ['has deer clip', svg.includes('deerEx')],
  ['has sway', svg.includes('skewX')],
  ['has fog', svg.includes('fogG')],
];
ok.forEach(([name, pass]) => console.log(pass ? 'OK' : 'FAIL', name));
if (!ok.every(x => x[1])) process.exit(1);
console.log('svg length', svg.length);

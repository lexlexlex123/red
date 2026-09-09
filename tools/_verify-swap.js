const fs = require('fs');
const vm = require('vm');
const ctx = {
  window: { _FOREST_DEBUG_COLORS: false },
  slides: [{ bgc: '#fff' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: false }),
  _schemeSwatchColor: (th, c, r) => '#' + String(c + 1) + String(r + 1) + String(r + 1) + String(c + 1) + String(r + 1) + String(r + 1),
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const svg = ctx.window._buildForestInkscape(1200, 675, 'fb', 'fb', false, true);

function fillNear(id) {
  const i = svg.indexOf('id="' + id + '"');
  const t = svg.slice(svg.lastIndexOf('<', i), svg.indexOf('>', i) + 1);
  return (t.match(/fill="([^"]+)"/) || [])[1];
}

const checks = [
  ['path10138 deer c28', fillNear('path10138') === '#282828'],
  ['g11102 right c29', fillNear('g11102') === '#292929' || svg.slice(svg.indexOf('g11102') - 200, svg.indexOf('g11102')).includes('#292929')],
  ['deer after rightTree', svg.indexOf('path10138') > svg.indexOf('g11102')],
  ['rev 7', ctx.window._FOREST_LAYOUT_REV === 7],
];
checks.forEach(([n, ok]) => console.log(ok ? 'OK' : 'FAIL', n));
process.exit(checks.every(c => c[1]) ? 0 : 1);

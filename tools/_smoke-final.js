const fs = require('fs');
const vm = require('vm');
const ctx = {
  window: {},
  slides: [{ bgc: '#fff' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: false }),
  _schemeSwatchColor: (th, c, r) => {
    const code = String(c + 1) + String(r + 1);
    return '#' + code + code + code;
  },
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const svg = ctx.window._buildForestInkscape(1200, 675, 'fb', 'fb', false, true);

function colorNear(id) {
  const i = svg.indexOf(id);
  if (i < 0) return { id, found: false };
  const chunk = svg.slice(Math.max(0, i - 400), i + 200);
  const m = chunk.match(/#(\d{6})/g) || [];
  return { id, found: true, colors: [...new Set(m)], sway: chunk.includes('skewX') };
}

const order = ['g10734', 'g11102', 'g10692', 'path4345'];
order.forEach(id => {
  console.log(id, 'pos', svg.indexOf(id), colorNear(id));
});

const checks = [
  ['deer before grass', svg.indexOf('g11102') < svg.indexOf('g10692')],
  ['flowers after grass', svg.indexOf('path4345') > svg.indexOf('g10692')],
  ['path10138 not in flowers sway', svg.indexOf('path10138') < svg.indexOf('skewX')],
  ['deer color 28', colorNear('g11102').colors?.some(c => c.includes('282828'))],
  ['flowers color 28', colorNear('path4345').colors?.some(c => c.includes('282828'))],
  ['trees color 29', colorNear('g10734').colors?.some(c => c.includes('292929'))],
  ['path10138 color 29', colorNear('path10138').colors?.some(c => c.includes('292929'))],
  ['deer no sway', !svg.slice(svg.indexOf('g11102'), svg.indexOf('g11102') + 5000).includes('skewX')],
];
checks.forEach(([n, ok]) => console.log(ok ? 'OK' : 'FAIL', n));
process.exit(checks.every(c => c[1]) ? 0 : 1);

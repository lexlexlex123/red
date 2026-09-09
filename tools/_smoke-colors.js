const fs = require('fs');
const vm = require('vm');
const w = 1200, h = 675;
const sw = (th, c, r) => `col${c}row${r}`;
const ctx = {
  window: {},
  slides: [{ bgc: '#fff' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: false }),
  _schemeSwatchColor: sw,
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const content = ctx.window._buildForestInkscape(w, h, 'fb', 'fb', false, true);
const title = ctx.window._buildForestInkscape(w, h, 'fb', 'fb', true, true);

const skewPos = content.indexOf('skewX');
const grassPos = content.indexOf('g10692');
const deerPos = content.indexOf('g11102');

const checks = [
  ['deer color 28', content.includes('col1row7') && content.indexOf('col1row7') < content.indexOf('g11102') + 5000],
  ['trees color 29', content.includes('col1row8')],
  ['grass static', grassPos > 0 && (skewPos < 0 || skewPos < grassPos ? false : content.lastIndexOf('skewX') < grassPos)],
  ['flowers sway', content.includes('skewX')],
  ['title svg 29', title.includes('col1row8') && !title.includes('col0row8')],
];
checks.forEach(([n, ok]) => console.log(ok ? 'OK' : 'FAIL', n));
process.exit(checks.every(c => c[1]) ? 0 : 1);

const fs = require('fs');
const vm = require('vm');
const ctx = {
  window: {},
  slides: [{ bgScheme: null, bgc: '#1a1a1a' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: true }),
  _schemeSwatchColor: () => null,
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const svg = ctx.window._buildForestInkscape(1200, 675, '#333', '#666', false, true);
const deerAt = svg.indexOf('g11102');
const skewAt = svg.indexOf('skewX');
console.log('deer at', deerAt, 'skewX at', skewAt, 'deer before skew', deerAt < skewAt);
// deer should not be inside animateTransform block after skew
const between = svg.slice(deerAt, deerAt + 5000);
console.log('deer chunk has animateTransform', between.includes('animateTransform'));

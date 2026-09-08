const fs = require('fs');
const vm = require('vm');
const ctx = {
  window: {},
  slides: [{ bgc: '#fff' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: false }),
  _schemeSwatchColor: (th, c, r) => `C${c}_${r}`,
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const svg = ctx.window._buildForestInkscape(1200, 675, 'fb', 'fb', false, true);

const treeChunk = svg.slice(0, svg.indexOf('mistContentFogVB') || svg.indexOf('fogG') + 5000);
const flowerSway = svg.indexOf('skewX');
const deerPos = svg.lastIndexOf('g11102');
const grassPos = svg.indexOf('g10692');
const p10138inFlowers = svg.indexOf('path10138') > flowerSway && svg.indexOf('path10138') < deerPos;

const checks = [
  ['path10138 in trees not flowers', svg.includes('path10138') && svg.indexOf('path10138') < flowerSway],
  ['flowers sway', flowerSway > 0],
  ['deer after sway static', deerPos > flowerSway && !svg.slice(deerPos, deerPos + 8000).includes('skewX')],
  ['grass before flowers', grassPos < flowerSway],
  ['deer once', (svg.match(/g11102/g) || []).length === 1],
  ['path4345 in sway chunk', svg.indexOf('path4345') > flowerSway && svg.indexOf('path4345') < deerPos],
];
checks.forEach(([n, ok]) => console.log(ok ? 'OK' : 'FAIL', n));
process.exit(checks.every(c => c[1]) ? 0 : 1);

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

function report(id) {
  const needle = `id="${id}"`;
  let idx = 0;
  let n = 0;
  while ((idx = svg.indexOf(needle, idx)) >= 0) {
    n++;
    const start = svg.lastIndexOf('<', idx);
    const end = svg.indexOf('>', idx) + 1;
    const tag = svg.slice(start, end);
    const fillAttr = tag.match(/\bfill="([^"]+)"/);
    const styleFill = tag.match(/style="[^"]*fill:([^;"']+)/);
    console.log(`  #${n} fill=${fillAttr?.[1] || '-'} styleFill=${styleFill?.[1] || '-'}`);
    idx += needle.length;
  }
  console.log(id, 'occurrences', n);
}

['path10138', 'path4345', 'path10764', 'g11102'].forEach(report);

// Check if path10138 inside sway (flowers)
const swayIdx = svg.indexOf('skewX');
const pIdx = svg.indexOf('path10138');
console.log('path10138 before sway?', pIdx < swayIdx, 'pIdx', pIdx, 'swayIdx', swayIdx);

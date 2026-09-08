const fs = require('fs');
const vm = require('vm');

function extractById(html, id) {
  const needle = 'id="' + id + '"';
  const at = html.indexOf(needle);
  if (at < 0) return '';
  const start = html.lastIndexOf('<', at);
  if (html.slice(start, start + 5) === '<path') {
    const gt = html.indexOf('>', at);
    if (gt < 0) return '';
    if (html.charAt(gt - 1) === '/') return html.slice(start, gt + 1);
    const end = html.indexOf('</path>', gt);
    return end < 0 ? '' : html.slice(start, end + 7);
  }
  if (html.slice(start, start + 2) !== '<g') return '';
  let i = html.indexOf('>', at) + 1, depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<g', i);
    const nextClose = html.indexOf('</g>', i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) { depth++; i = nextOpen + 2; }
    else { depth--; i = nextClose + 4; if (depth === 0) return html.slice(start, i); }
  }
  return '';
}

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const m = ctx.window.FOREST_PATHS_CONTENT.markup;

const flowerIds = ['path10138', 'path4345', 'path4349', 'path4487', 'path4507', 'path4517', 'path4539', 'path4551', 'path4583'];
const flowers = flowerIds.map(id => extractById(m, id)).join('');

console.log('deer paths in flowers?', flowers.includes('path10598'), flowers.includes('path10595'));
flowerIds.forEach(id => {
  const ex = extractById(m, id);
  console.log(id, 'len', ex.length, 'has10598', ex.includes('path10598'), 'has10595', ex.includes('path10595'));
});

const deer = extractById(m, 'path10598') + extractById(m, 'path10595');
console.log('deer len', deer.length);

// rendered svg
const renderCtx = {
  window: { FOREST_PATHS_CONTENT: ctx.window.FOREST_PATHS_CONTENT },
  slides: [{ bgc: '#112233' }], cur: 0,
  _activeThemeForScheme: () => ({ dark: true }),
  _resolveSchemeColor: () => '#112233',
  _schemeSwatchColor: (t, col, row) => '#' + col + row,
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), renderCtx);
const svg = renderCtx.window._buildForestInkscape(1200, 675, '#111', '#222', false, true);
const deerPos = svg.indexOf('path10598');
const skewBeforeDeer = svg.lastIndexOf('skewX', deerPos);
const skewAfterDeer = svg.indexOf('skewX', deerPos);
console.log('skewX count', (svg.match(/skewX/g) || []).length);
console.log('deer at', deerPos, 'last skew before deer', skewBeforeDeer, 'first skew after', skewAfterDeer);
console.log('deer inside sway?', skewBeforeDeer > deerPos - 5000 && skewBeforeDeer < deerPos);

// check if path10598 appears inside animateTransform block
const chunk = svg.slice(Math.max(0, deerPos - 800), deerPos + 200);
console.log('context before deer:', chunk.slice(0, 400).replace(/\s+/g, ' '));

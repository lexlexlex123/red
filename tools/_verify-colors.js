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

function removeById(html, id) {
  const chunk = extractById(html, id);
  return chunk ? html.replace(chunk, '') : html;
}

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const mk = ctx.window.FOREST_PATHS_CONTENT.markup;

const g11470 = extractById(mk, 'g11470');
const withoutDeer = removeById(g11470, 'g11102');
console.log('g11102 in trees after remove?', withoutDeer.includes('g11102'));
console.log('path10764 in trees after remove?', withoutDeer.includes('path10764'));
console.log('deer extract len', extractById(mk, 'g11102').length);
console.log('flowers total len', ['path4345','path4349','path4487','path4507','path4517','path4539','path4551','path4583']
  .map(id => extractById(mk, id).length).reduce((a,b)=>a+b,0));

// Full render with distinct hex colors
const ctx2 = {
  window: {},
  slides: [{ bgc: '#fff' }],
  cur: 0,
  appliedThemeIdx: 0,
  selTheme: 0,
  THEMES: [{ dark: false, ac1: '#0000ff', ac2: '#00ff00', bg: '#fff' }],
  _activeThemeForScheme: function() { return ctx2.THEMES[0]; },
  _schemeSwatchColor: function(th, c, r) {
    if (c === 1 && r === 7) return '#ff0000'; // 28 = red
    if (c === 1 && r === 8) return '#0000ff'; // 29 = blue
    return '#888888';
  },
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx2);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx2);
const svg = ctx2.window._buildForestInkscape(1200, 675, '#0000ff', '#00ff00', false, true);

function colorAt(id) {
  const i = svg.indexOf('id="' + id + '"');
  const chunk = svg.slice(Math.max(0, i - 250), i + 100);
  const hex = chunk.match(/#([0-9a-f]{6})/gi) || [];
  return [...new Set(hex)];
}

console.log('path10138 colors', colorAt('path10138'), '(expect blue #0000ff = 29)');
console.log('path4345 colors', colorAt('path4345'), '(expect red #ff0000 = 28)');
console.log('path10764 colors', colorAt('path10764'), '(expect red #ff0000 = 28)');
console.log('g10734 colors', colorAt('g10734'), '(expect blue = 29)');

const red = (svg.match(/#ff0000/gi) || []).length;
const blue = (svg.match(/#0000ff/gi) || []).length;
console.log('total red', red, 'total blue', blue);

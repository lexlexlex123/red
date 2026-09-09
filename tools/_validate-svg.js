const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const w = 1200, h = 675;
const ctx = {
  window: {},
  slides: [{ bgScheme: null, bgc: '#fff' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: false, bg: '#fff' }),
  _schemeSwatchColor: () => '#aab',
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
let svg = ctx.window._buildForestInkscape(w, h, '#ccd', '#aab', false, true);

// simulate _isolateSvgIds
const uid = 'u123';
const ids = [];
svg.replace(/\bid="([^"]+)"/g, (_, id) => { ids.push(id); return _; });
ids.forEach(id => {
  const newId = uid + '_' + id;
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  svg = svg.replace(new RegExp('\\bid="' + esc + '"', 'g'), 'id="' + newId + '"');
  svg = svg.replace(new RegExp('url\\(#' + esc + '\\)', 'g'), 'url(#' + newId + ')');
});

const doc = new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document;
const err = doc.querySelector('parsererror');
console.log('parse error', err ? err.textContent.slice(0, 200) : 'none');

const nested = doc.querySelector('svg svg');
const deerG = nested.querySelector('[id$="g11102"]');
console.log('deer group', !!deerG, 'children', deerG?.children.length);
console.log('deer fill', deerG?.getAttribute('fill'));

// count visible path fills in deer vs trees
function countPaths(el) {
  return el ? el.querySelectorAll('path').length : 0;
}
const treesG = nested.querySelector('[id$="g11470"]');
console.log('deer paths', countPaths(deerG), 'trees paths', countPaths(treesG));

fs.writeFileSync('tools/_forest-test.svg', svg);

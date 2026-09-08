const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const mk = ctx.window.FOREST_PATHS_CONTENT.markup;

function extractById(html, id) {
  const needle = 'id="' + id + '"';
  const at = html.indexOf(needle);
  if (at < 0) return null;
  const start = html.lastIndexOf('<', at);
  if (html.slice(start, start + 5) === '<path') {
    const gt = html.indexOf('>', at);
    if (html.charAt(gt - 1) === '/') return html.slice(start, gt + 1);
    const end = html.indexOf('</path>', gt);
    return html.slice(start, end + 7);
  }
  if (html.slice(start, start + 2) !== '<g') return null;
  let i = html.indexOf('>', at) + 1, depth = 1;
  while (i < html.length && depth > 0) {
    const no = html.indexOf('<g', i), nc = html.indexOf('</g>', i);
    if (nc < 0) break;
    if (no >= 0 && no < nc) { depth++; i = no + 2; }
    else { depth--; i = nc + 4; if (depth === 0) return html.slice(start, i); }
  }
  return null;
}

const g10692 = extractById(mk, 'g10692');
if (!g10692) { console.log('no g10692'); process.exit(1); }

// direct child groups and paths in g10692
const childIds = [...g10692.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
console.log('all ids inside g10692:', [...new Set(childIds)]);

const topLevel = [];
const doc = new JSDOM(`<root>${g10692}</root>`, { contentType: 'text/xml' }).window.document;
const root = doc.querySelector('g');
if (root) {
  [...root.children].forEach(ch => topLevel.push(ch.getAttribute('id') || ch.tagName));
}
console.log('direct children:', topLevel);

const flowerIds = ['path4345', 'path4349', 'path4487', 'path4507', 'path4517', 'path4539', 'path4551', 'path4583'];
flowerIds.forEach(id => {
  const inGrass = g10692.includes('id="' + id + '"');
  const inRoot = mk.includes('id="' + id + '"');
  console.log(id, 'in g10692?', inGrass, 'in markup?', inRoot);
});

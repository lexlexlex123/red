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

const g11102 = extractById(m, 'g11102');
console.log('g11102 len', g11102.length);
console.log('paths in g11102', (g11102.match(/<path/g) || []).length);
console.log('has 10764', g11102.includes('path10764'));
console.log('has 10774', g11102.includes('path10774'));

const ids = [...g11102.matchAll(/id=\"(path[^\"]+)\"/g)].map(x => x[1]);
console.log('path ids', ids.slice(0, 20), 'count', ids.length);

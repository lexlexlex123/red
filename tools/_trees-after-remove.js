const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

function extractById(html, id) {
  const needle = 'id="' + id + '"';
  const at = html.indexOf(needle);
  if (at < 0) return '';
  const start = html.lastIndexOf('<', at);
  if (html.slice(start, start + 5) === '<path') {
    const gt = html.indexOf('>', at);
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
const FP = ctx.window.FOREST_PATHS_CONTENT;
const treesMk = removeById(extractById(FP.markup, 'g11470'), 'g11102') + extractById(FP.markup, 'path10138');

const doc = new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform}">${treesMk}</g></svg>`, { contentType: 'image/svg+xml' }).window.document;
const paths = [...doc.querySelectorAll('path')];
console.log('trees path count', paths.length);
console.log('has path10764', !!doc.getElementById('path10764'));
console.log('has path10696', !!doc.getElementById('path10696'));
console.log('has path10138', !!doc.getElementById('path10138'));
console.log('has g11102', !!doc.getElementById('g11102'));

// children of g11470 after remove
const g11470 = doc.getElementById('g11470');
if (g11470) [...g11470.children].forEach(ch => console.log('g11470 child', ch.id));

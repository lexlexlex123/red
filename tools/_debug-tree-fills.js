const fs = require('fs');
const vm = require('vm');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const mk = ctx.window.FOREST_PATHS_CONTENT.markup;

function extractById(html, id) {
  const needle = 'id="' + id + '"';
  const at = html.indexOf(needle);
  if (at < 0) return '';
  const start = html.lastIndexOf('<', at);
  if (html.slice(start, start + 5) === '<path') {
    const gt = html.indexOf('>', at);
    if (html.charAt(gt - 1) === '/') return html.slice(start, gt + 1);
    const end = html.indexOf('</path>', gt);
    return html.slice(start, end + 7);
  }
  if (html.slice(start, start + 2) !== '<g') return '';
  let i = html.indexOf('>', at) + 1, depth = 1;
  while (i < html.length && depth > 0) {
    const no = html.indexOf('<g', i), nc = html.indexOf('</g>', i);
    if (nc < 0) break;
    if (no >= 0 && no < nc) { depth++; i = no + 2; }
    else { depth--; i = nc + 4; if (depth === 0) return html.slice(start, i); }
  }
  return '';
}

const trees = extractById(mk, 'g11470');
const styles = new Set([...trees.matchAll(/fill:([^;"']+)/g)].map(m => m[1]));
const fills = new Set([...trees.matchAll(/\bfill="([^"]+)"/g)].map(m => m[1]));
console.log('tree group unique style fills:', [...styles]);
console.log('tree group unique fill attrs:', [...fills]);

const p10138 = extractById(mk, 'path10138');
console.log('path10138 raw:', p10138.slice(0, 200));

// X position of path10138 vs rightmost tree paths
function maxX(d) {
  const nums = d.match(/-?\d+\.?\d*/g);
  if (!nums) return 0;
  let mx = -Infinity;
  for (let i = 0; i < nums.length; i += 2) mx = Math.max(mx, +nums[i]);
  return mx;
}
console.log('path10138 maxX', maxX(p10138.match(/d="([^"]+)"/)?.[1] || ''));

const treePaths = [...trees.matchAll(/<path[^>]+d="([^"]+)"[^>]*id="([^"]+)"/g)];
const sorted = treePaths.map(m => ({ id: m[2], maxX: maxX(m[1]) })).sort((a, b) => b.maxX - a.maxX);
console.log('top 5 rightmost tree paths:', sorted.slice(0, 5));

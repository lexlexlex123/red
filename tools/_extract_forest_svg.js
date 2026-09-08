const fs = require('fs');
const p =
  'C:/Users/q3lex/.cursor/projects/c-github-red/agent-transcripts/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66.jsonl';
const lines = fs.readFileSync(p, 'utf8').split(/\n/);
let best = null;
for (const line of lines) {
  if (!line.includes('path2780') || !line.includes('<?xml')) continue;
  let o;
  try {
    o = JSON.parse(line);
  } catch (e) {
    continue;
  }
  const t = (o.message && o.message.content || [])
    .map((c) => c.text || '')
    .join('\n');
  const i = t.indexOf('<?xml');
  if (i < 0) continue;
  const j = t.indexOf('</svg>', i);
  if (j < 0) continue;
  const svg = t.slice(i, j + 6);
  if (!best || svg.length > best.length) best = svg;
}
if (!best) {
  console.error('SVG not found in transcript');
  process.exit(1);
}
fs.writeFileSync('c:/github/red/images/forest-inkscape.svg', best);
console.log('wrote', best.length, 'bytes');

function pathD(id) {
  const re = new RegExp(
    'id="' + id + '"[\\s\\S]*?\\sd="([^"]+)"'
  );
  const m = best.match(re);
  return m ? m[1] : '';
}
const d2780 = pathD('path2780');
const d4319 = pathD('path4319');
console.log('path2780', d2780.length, 'path4319', d4319.length);

// Clean asset for app use: theme-neutral fills via currentColor / placeholders
const clean = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1002.3298 509.91534" width="1002.3298" height="509.91534">
  <g id="forest-layer" transform="translate(187.09185,197.45552)">
    <path id="forest-canopy" fill="currentColor" d="${d2780}"/>
    <path id="forest-trees" fill="currentColor" d="${d4319}"/>
  </g>
</svg>
`;
fs.writeFileSync('c:/github/red/images/forest-trees.svg', clean);
console.log('clean asset', clean.length);

// JS module with path constants for layout builder
const js = `/* Auto-extracted Inkscape forest silhouettes — fills applied at render via a1/a2 */
window.FOREST_PATHS = {
  viewBox: '0 0 1002.3298 509.91534',
  groupTransform: 'translate(187.09185,197.45552)',
  canopy: ${JSON.stringify(d2780)},
  trees: ${JSON.stringify(d4319)}
};
`;
fs.writeFileSync('c:/github/red/js/23a-forest-paths.js', js);
console.log('js module', js.length);

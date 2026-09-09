/* Extract content-slide forest SVG from transcript → paths module with full markup */
const fs = require('fs');
const path = require('path');

const transcript =
  'C:/Users/q3lex/.cursor/projects/c-github-red/agent-transcripts/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66.jsonl';
const lines = fs.readFileSync(transcript, 'utf8').split(/\n/);
let best = null;
for (const line of lines) {
  if (!line.includes('1523.4225') || !line.includes('<?xml')) continue;
  let o;
  try {
    o = JSON.parse(line);
  } catch (e) {
    continue;
  }
  const t = (o.message && o.message.content || []).map((c) => c.text || '').join('\n');
  const i = t.indexOf('<?xml');
  if (i < 0) continue;
  const j = t.indexOf('</svg>', i);
  if (j < 0) continue;
  const svg = t.slice(i, j + 6);
  if (!best || svg.length > best.length) best = svg;
}
if (!best) {
  console.error('content forest SVG not found');
  process.exit(1);
}

const outSvg = path.join(__dirname, '../images/forest-content-inkscape.svg');
fs.writeFileSync(outSvg, best);
console.log('wrote', outSvg, best.length);

const vb =
  (best.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 1523.4225 610.58069';
const layerMatch = best.match(
  /<g[^>]*inkscape:label="Слой 1"[^>]*>([\s\S]*?)<\/g>\s*<\/svg>/
);
let inner = layerMatch ? layerMatch[1] : '';
const transformMatch = best.match(
  /<g[^>]*inkscape:label="Слой 1"[^>]*transform="([^"]+)"/
);
const groupTransform = transformMatch
  ? transformMatch[1]
  : 'translate(688.41567,312.16714)';

if (!inner) {
  // Fallback: take everything after defs / namedview inside root
  const m2 = best.match(/<g[^>]*id="layer1"[^>]*>([\s\S]*)<\/g>\s*<\/svg>/);
  inner = m2 ? m2[1] : '';
}

// Strip Inkscape-only attrs that bloat the module; keep transform/fill/d/style/id
inner = inner
  .replace(/\s+inkscape:[a-z-]+="[^"]*"/gi, '')
  .replace(/\s+sodipodi:[a-z-]+="[^"]*"/gi, '')
  .replace(/\s+xmlns:inkscape="[^"]*"/gi, '')
  .replace(/\s+xmlns:sodipodi="[^"]*"/gi, '');

const js = `/* Auto-extracted content-slide forest (Inkscape) — full markup keeps nested transforms */
window.FOREST_PATHS_CONTENT = {
  viewBox: ${JSON.stringify(vb)},
  groupTransform: ${JSON.stringify(groupTransform)},
  markup: ${JSON.stringify(inner)}
};
`;
const outJs = path.join(__dirname, '../js/23a-forest-paths-content.js');
fs.writeFileSync(outJs, js);
console.log('wrote', outJs, js.length, 'inner', inner.length, 'vb', vb);

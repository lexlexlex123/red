import fs from 'fs';
import vm from 'vm';

const c = { window: {}, console, Math, canvasW: 960, _layoutAnimated: true };
c.window = c;
vm.runInNewContext(fs.readFileSync('c:/github/red/themes/01-prism.js', 'utf8'), c);
const P = c.window._THEME_01_PRISM;
const t = P.titleSvg(960, 540, '#6366f1', '#a855f7', true, false);
const ct = P.contentSvg(960, 540, '#6366f1', '#a855f7', true, false);
const move = t.match(/values="0,0;([^"]+)"/);
const dist = move ? Math.hypot(+move[1].split(',')[0], +move[1].split(',')[1]) : 0;
const begins = [...t.matchAll(/begin="([^"]+)"/g)].map(m => +m[1]).filter((_, i) => i % 2 === 0);
console.log('title bands', begins.length);
console.log('content bands', (ct.match(/begin=/g) || []).length / 2);
console.log('travel px', dist.toFixed(0));
console.log('stagger s', begins[1] - begins[0]);
console.log('stroke', /stroke=/.test(t));
console.log('polygons', (t.match(/polygon/g) || []).length);

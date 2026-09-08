import fs from 'fs';
import vm from 'vm';

const c = { window: {}, Math, canvasW: 960 };
c.window = c;
vm.runInNewContext(fs.readFileSync('c:/github/red/themes/01-prism.js', 'utf8'), c);
const P = c.window._THEME_01_PRISM;
const w = 960, h = 540;

const svg = P.titleSvg(w, h, '#6366f1', '#a855f7', false, false);
const pts = [...svg.matchAll(/points="([^"]+)"/g)].map(m => m[1]);
console.log('ribbons', pts.length);

function edgeAngle(p, i0, i1) {
  const dx = p[i1][0] - p[i0][0];
  const dy = p[i1][1] - p[i0][1];
  return (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1);
}

if (pts[0] && pts[1]) {
  const p0 = pts[0].split(' ').map(s => s.split(',').map(Number));
  const p1 = pts[1].split(' ').map(s => s.split(',').map(Number));
  console.log('ribbon0 long', edgeAngle(p0, 0, 3));
  console.log('ribbon1 long', edgeAngle(p1, 0, 3));
  console.log('same slope', edgeAngle(p0, 0, 3) === edgeAngle(p1, 0, 3));
  console.log('axis legs', p0.some(p => p[0] === 0 || p[1] === 0 || p[0] === w || p[1] === h));
}

const anim = P.titleSvg(w, h, '#6366f1', '#a855f7', true, false);
console.log('one-way', anim.includes('values="0,0;') && !anim.includes(';0,0;'));

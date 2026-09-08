import fs from 'fs';
import vm from 'vm';

const c = { window: {}, console, Math, canvasW: 960, _layoutAnimated: false };
c.window = c;
vm.runInNewContext(fs.readFileSync('c:/github/red/themes/01-prism.js', 'utf8'), c);
const svg = c.window._THEME_01_PRISM.titleSvg(960, 540, '#0ea5e9', '#6366f1', false, false);
console.log('static len', svg.length);
console.log('has polygon', svg.includes('polygon'));
console.log('opacity 0.5', svg.includes('opacity="0.5"'));
console.log('sample pts', svg.match(/points="([^"]+)"/)?.[1]?.slice(0, 80));

vm.runInNewContext(fs.readFileSync('c:/github/red/themes/01-prism.js', 'utf8'), { ...c, _layoutAnimated: true });
c.window._THEME_01_PRISM.titleSvg(960, 540, '#0ea5e9', '#6366f1', true, false);
const anim = c.window._THEME_01_PRISM.titleSvg(960, 540, '#0ea5e9', '#6366f1', true, false);
console.log('anim outer opacity animate', anim.includes('<animate attributeName="opacity"'));
console.log('anim transform on inner', /\<g\>\$\{shape\}/.test('') || anim.includes('animateTransform'));

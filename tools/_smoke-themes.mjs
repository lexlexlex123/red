import fs from 'fs';
import path from 'path';
import vm from 'vm';

const ROOT = path.resolve('c:/github/red');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes/manifest.json'), 'utf8'));
const ctx = { window: {}, console, Math, document: undefined, THEMES: [], appliedThemeIdx: -1, selTheme: -1 };
ctx.window = ctx;

const scripts = [
  'themes/forest/paths.js',
  'themes/forest/paths-content.js',
  'themes/forest/layout.js',
  'themes/renderers/crystal-webgl.js',
  'themes/renderers/dna-webgl.js',
  'themes/renderers/galaxy-webgl.js',
  'themes/renderers/caustics-webgl.js',
  'themes/renderers/warp-canvas.js',
  'themes/00-variants.js',
  ...manifest.map(m => `themes/${m.file}`),
  'themes/00-engine.js',
  'themes/loader.js',
];

for (const rel of scripts) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInNewContext(code, ctx);
}

const n = ctx.LAYOUTS.length;
console.log('LAYOUTS', n, ctx.LAYOUTS.map(l => l.nameEn).join(', '));
if (n !== 37) process.exit(1);
for (const L of ctx.LAYOUTS) {
  if (typeof L.tplVariants !== 'function') { console.error('missing tplVariants', L.nameEn); process.exit(1); }
  if (typeof L.modalPreview !== 'function') { console.error('missing modalPreview', L.nameEn); process.exit(1); }
}
console.log('OK');

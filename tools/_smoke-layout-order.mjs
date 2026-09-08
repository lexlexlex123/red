import fs from 'fs';
import path from 'path';
import vm from 'vm';

const ROOT = path.resolve('c:/github/red');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes/manifest.json'), 'utf8'));

function loadScripts(ctx, scripts) {
  for (const rel of scripts) {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx);
  }
}

const base = [
  'themes/forest/paths.js', 'themes/forest/paths-content.js', 'themes/forest/layout.js',
  'themes/renderers/crystal-webgl.js', 'themes/renderers/dna-webgl.js',
  'themes/renderers/galaxy-webgl.js', 'themes/renderers/caustics-webgl.js',
  'themes/renderers/warp-canvas.js', 'themes/00-variants.js',
  ...manifest.map(m => `themes/${m.file}`),
];

// Wrong order (old bug)
const wrong = { window: {}, console, Math, document: { getElementById: () => null } };
wrong.window = wrong;
loadScripts(wrong, [...base, 'themes/loader.js', 'themes/00-engine.js']);
console.log('wrong order LAYOUTS.length', wrong.LAYOUTS?.length);

// Correct order
const ok = { window: {}, console, Math, document: { getElementById: () => null } };
ok.window = ok;
loadScripts(ok, [...base, 'themes/00-engine.js', 'themes/loader.js']);
console.log('correct order LAYOUTS.length', ok.LAYOUTS?.length);
if (ok.LAYOUTS?.length !== 37) process.exit(1);
console.log('OK');

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('c:/github/red');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes/manifest.json'), 'utf8'));

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

const htmlBlock = scripts.map(s => `  <script src="${s}"></script>`).join('\n');

const indexPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const start = html.indexOf('  <script src="js/23a-forest-paths.js"></script>');
const end = html.indexOf('  <script src="js/23g-warp-canvas.js"></script>') + '  <script src="js/23g-warp-canvas.js"></script>'.length;
if (start < 0 || end < start) throw new Error('index.html theme block not found');
html = html.slice(0, start) + htmlBlock + html.slice(end);
fs.writeFileSync(indexPath, html, 'utf8');
console.log('index.html updated', scripts.length, 'scripts');

const swPath = path.join(ROOT, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE = '[^']+'/, "const CACHE = 'slides-pwa-v331'");
const oldBlock = `  './js/23a-forest-paths.js',
  './js/23a-forest-paths-content.js',
  './js/23a-forest-layout.js',
  './js/23-layout.js',
  './js/23b-crystal-webgl.js',
  './js/23d-dna-webgl.js',
  './js/23e-galaxy-webgl.js',
  './js/23f-caustics-webgl.js',
  './js/23g-warp-canvas.js',`;
const newBlock = scripts.map(s => `  './${s}',`).join('\n');
if (!sw.includes(oldBlock)) throw new Error('sw.js theme block not found');
sw = sw.replace(oldBlock, newBlock);
fs.writeFileSync(swPath, sw, 'utf8');
console.log('sw.js updated');

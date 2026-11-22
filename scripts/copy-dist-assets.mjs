/**
 * After vite build: copy static assets needed by the React editor + PWA into dist/.
 * Full vanilla `js/` + `legacy.html` stay in the source tree for local fallback.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

const dirs = [
  'css',
  'libs',
  'fonts',
  'themes',
  'icons',
  'images',
  'audio',
  'prezi',
];

const files = [
  'manifest.webmanifest',
  'sw.js',
  'pwa-precache-images.js',
  'icon-192.png',
  'icon-512.png',
  'icon.svg',
  '.htaccess',
  // HTTPS → HTTP catalog bridge (Import modal on slides.pyabc.ru etc.)
  'prezi-proxy.php',
];

/** Prefer public/ copies (Vite publicDir source of truth for PWA shell). */
const fromPublic = [
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  'screenshots/wide.jpg',
  'screenshots/narrow.jpg',
];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      if (name === 'node_modules' || name === 'dist') continue;
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(dist)) {
  console.error('dist/ missing — run vite build first');
  process.exit(1);
}

for (const d of dirs) copyRecursive(path.join(root, d), path.join(dist, d));
for (const f of files) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) copyRecursive(src, path.join(dist, f));
}
for (const f of fromPublic) {
  const src = path.join(root, 'public', f);
  if (fs.existsSync(src)) copyRecursive(src, path.join(dist, f));
}

const assetsDir = path.join(dist, 'assets');
const hashed = fs.existsSync(assetsDir)
  ? fs
      .readdirSync(assetsDir)
      .filter((n) => /\.(js|css)$/i.test(n) && !n.endsWith('.map'))
      .map((n) => './assets/' + n)
  : [];
fs.writeFileSync(
  path.join(dist, 'pwa-precache-assets.js'),
  'self.PRECACHE_ASSETS = ' + JSON.stringify(hashed, null, 2) + ';\n'
);

console.log('Copied React/PWA assets into dist/ (' + hashed.length + ' hashed bundles for SW)');

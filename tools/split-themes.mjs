import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('c:/github/red');
const SRC = path.join(ROOT, 'js/23-layout.js');
const THEMES = path.join(ROOT, 'themes');
const text = fs.readFileSync(SRC, 'utf8');
const lines = text.split(/\r?\n/);

const starts = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/nameEn:\s*'([^']+)'/);
  if (m && /name:/.test(lines[i])) {
    let s = i;
    while (s > 0 && !/^\s+\{\s*$/.test(lines[s])) s--;
    starts.push({ line: s, nameEn: m[1] });
  }
}

function slug(en) {
  return en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function varName(num, en) {
  return '_THEME_' + num + '_' + slug(en).toUpperCase().replace(/-/g, '_');
}

if (!fs.existsSync(THEMES)) fs.mkdirSync(THEMES, { recursive: true });

const closeIdx = lines.findIndex((l, idx) => idx > 4000 && l.trim() === '];');

for (let i = 0; i < starts.length; i++) {
  const start = starts[i].line;
  const end = i + 1 < starts.length ? starts[i + 1].line - 1 : closeIdx - 1;
  let chunk = lines.slice(start, end).join('\n').trim();
  if (chunk.endsWith(',')) chunk = chunk.slice(0, -1);
  const inner = chunk.replace(/^\s*\{/, '').replace(/\}\s*$/, '').trim();
  const num = String(i + 1).padStart(2, '0');
  const id = slug(starts[i].nameEn);
  const v = varName(num, starts[i].nameEn);
  const hide = starts[i].nameEn === 'Cosmos · Void' ? '\n  hideFromModal: true,' : '';
  const file = `/** ${num} — ${starts[i].nameEn} */\n(function(){\nwindow.${v} = {\n${inner},${hide}\n  tplVariants(isRu){ return _themeTplFor('${starts[i].nameEn}', isRu); },\n  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }\n};\n})();\n`;
  fs.writeFileSync(path.join(THEMES, `${num}-${id}.js`), file, 'utf8');
  console.log(`${num}-${id}.js`);
}

const engineHead = `// ══════════════ LAYOUT DECOR ENGINE ══════════════
let selLayout=-1;
let _layoutAnimated=true;
const _decorPausedAt = new Map();
let LAYOUTS = [];
`;
const tailStart = lines.findIndex((l, i) => i > 4140 && l.includes('function _activeTheme'));
const engineBody = lines.slice(tailStart).join('\n');
fs.writeFileSync(path.join(ROOT, 'themes/00-engine.js'), engineHead + engineBody, 'utf8');
console.log('00-engine.js');

const manifest = starts.map((s, i) => {
  const num = String(i + 1).padStart(2, '0');
  return { file: `${num}-${slug(s.nameEn)}.js`, var: varName(num, s.nameEn), nameEn: s.nameEn };
});
fs.writeFileSync(path.join(THEMES, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('manifest.json', manifest.length, 'themes');

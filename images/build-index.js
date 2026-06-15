#!/usr/bin/env node
// ══════════════ ГЕНЕРАТОР IMAGE INDEX ══════════════
// Запуск: node images/build-index.js
// (из папки проекта, рядом с index.html)
//
// Автоматически сканирует ВСЕ подпапки images/ — включая новые.
// SVG файлы встраиваются как svgContent.
// Генерирует два файла:
//   images/image-index.js  — реестр файлов
//   images/image-cats.js   — список категорий (подхватывает новые папки)

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname);
const OUTPUT_INDEX = path.join(__dirname, 'image-index.js');
const OUTPUT_CATS  = path.join(__dirname, 'image-cats.js');

// Известные категории с именами на русском.
// Если папка не найдена здесь — имя генерируется автоматически из id.
const KNOWN_NAMES = {
  'nature':      'Природа',
  'animals':     'Животные',
  'birds':       'Птицы',
  'business':    'Бизнес',
  'technology':  'Технологии',
  'backgrounds': 'Фоны',
  'textures':    'Текстуры',
  'people':      'Люди',
  'abstract':    'Абстракция',
  'icons_png':   'Иконки PNG',
  'smiles':      'Смайлики',
};

const IMG_EXTS = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'];

// Генерируем человекочитаемое имя из id папки
function nameFromId(id) {
  if (KNOWN_NAMES[id]) return KNOWN_NAMES[id];
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function nameFromFile(file) {
  return file
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function escapeBacktick(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
}

// ── Сканируем все подпапки images/ ──────────────────────────────
const allDirs = fs.readdirSync(IMAGES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules')
  .map(d => d.name)
  .sort();

if (allDirs.length === 0) {
  console.log('Папки не найдены в', IMAGES_DIR);
  process.exit(0);
}

// Формируем CATS: сначала известные (в нужном порядке), потом новые
const knownOrder = Object.keys(KNOWN_NAMES);
const CATS = [];

// 1. Известные в фиксированном порядке (если папка существует)
for (const id of knownOrder) {
  if (allDirs.includes(id)) {
    CATS.push({ id, name: KNOWN_NAMES[id] });
  }
}

// 2. Новые папки (которых нет в KNOWN_NAMES) — добавляем в конец
for (const id of allDirs) {
  if (!KNOWN_NAMES[id]) {
    console.log('  НОВАЯ КАТЕГОРИЯ обнаружена:', id);
    CATS.push({ id, name: nameFromId(id) });
  }
}

console.log('Категории:', CATS.map(c => c.id).join(', '));
console.log('');

// ── Сканируем файлы ──────────────────────────────────────────────
const entries = [];
let counter = 1;

for (const cat of CATS) {
  const catDir = path.join(IMAGES_DIR, cat.id);
  console.log('Категория:', cat.id);

  let files;
  try {
    files = fs.readdirSync(catDir)
      .filter(f => IMG_EXTS.includes(path.extname(f).toLowerCase()))
      .sort();
  } catch (e) {
    console.warn('  Ошибка чтения папки:', e.message);
    continue;
  }

  if (files.length === 0) {
    console.log('  (пусто)');
    continue;
  }

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const isSvg = ext === '.svg';
    const filePath = 'images/' + cat.id + '/' + file;
    const id = 'img' + (counter++);
    const name = nameFromFile(file);

    if (isSvg) {
      try {
        const svgRaw = fs.readFileSync(path.join(catDir, file), 'utf8').trim();
        if (!svgRaw.includes('<svg')) {
          console.warn('  ПРОПУЩЕН (не SVG):', file);
          continue;
        }
        const svgClean = svgRaw.replace(/^<\?xml[^?]*\?>\s*/i, '').trim();
        entries.push({ id, cat: cat.id, file, name, path: filePath, isSvg: true, svgContent: svgClean });
        console.log('  SVG (встроен):', file);
      } catch(e) {
        console.warn('  ОШИБКА чтения:', file, e.message);
      }
    } else {
      entries.push({ id, cat: cat.id, file, name, path: filePath, isSvg: false });
      console.log('  Изображение (путь):', file);
    }
  }
}

// ── Генерируем image-index.js ────────────────────────────────────
let outIndex = `// ══════════════ IMAGE INDEX ══════════════
// Сгенерировано автоматически: node images/build-index.js
// НЕ РЕДАКТИРУЙТЕ ВРУЧНУЮ — изменения будут перезаписаны при следующем запуске
// Дата: ${new Date().toLocaleString('ru')}

const IMAGE_INDEX = [
`;

for (const e of entries) {
  if (e.isSvg && e.svgContent) {
    outIndex += `  {\n`;
    outIndex += `    id: ${JSON.stringify(e.id)},\n`;
    outIndex += `    cat: ${JSON.stringify(e.cat)},\n`;
    outIndex += `    file: ${JSON.stringify(e.file)},\n`;
    outIndex += `    name: ${JSON.stringify(e.name)},\n`;
    outIndex += `    path: ${JSON.stringify(e.path)},\n`;
    outIndex += `    isSvg: true,\n`;
    outIndex += `    svgContent: \`${escapeBacktick(e.svgContent)}\`,\n`;
    outIndex += `  },\n`;
  } else {
    outIndex += `  {id:${JSON.stringify(e.id)}, cat:${JSON.stringify(e.cat)}, file:${JSON.stringify(e.file)}, name:${JSON.stringify(e.name)}, path:${JSON.stringify(e.path)}, isSvg:false},\n`;
  }
}

outIndex += `];\n`;

fs.writeFileSync(OUTPUT_INDEX, outIndex, 'utf8');
console.log(`\nimage-index.js: ${entries.length} записей`);

// ── Генерируем image-cats.js ─────────────────────────────────────
const activeCats = CATS.filter(c => entries.some(e => e.cat === c.id));

let outCats = `// ══════════════ IMAGE CATEGORIES ══════════════
// Сгенерировано автоматически: node images/build-index.js
// НЕ РЕДАКТИРУЙТЕ ВРУЧНУЮ — изменения будут перезаписаны при следующем запуске
// Дата: ${new Date().toLocaleString('ru')}
// Загружается в браузере перед 40-images-modal.js и переопределяет список категорий.

window._IMAGE_CATS_GENERATED = [
`;

for (const cat of activeCats) {
  outCats += `  {id:${JSON.stringify(cat.id)}, name:${JSON.stringify(cat.name)}},\n`;
}

outCats += `];\n`;

fs.writeFileSync(OUTPUT_CATS, outCats, 'utf8');
console.log(`image-cats.js: ${activeCats.length} категорий`);

// ── Список растров для PWA service worker ────────────────────────
const rasterPaths = entries.filter(e => !e.isSvg && e.path).map(e => './' + e.path.replace(/\\/g, '/'));
const OUTPUT_PWA = path.join(__dirname, '..', 'pwa-precache-images.js');
let outPwa = `// Автогенерация: node images/build-index.js — не редактировать вручную
// Дата: ${new Date().toISOString()}
self.PRECACHE_IMAGES = [
`;
for (const p of rasterPaths) {
  outPwa += `  ${JSON.stringify(p)},\n`;
}
outPwa += `];\n`;
fs.writeFileSync(OUTPUT_PWA, outPwa, 'utf8');
console.log(`pwa-precache-images.js: ${rasterPaths.length} файлов для офлайн-кэша`);

console.log(`\nГотово! Обновите браузер (F5).`);

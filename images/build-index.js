#!/usr/bin/env node
// ══════════════ ГЕНЕРАТОР IMAGE INDEX ══════════════
// Запуск: node images/build-index.js
// (из папки проекта, рядом с index.html)
//
// Автоматически сканирует подпапки images/ и генерирует image-index.js
// SVG файлы встраиваются как svgContent — вставляются как редактируемые SVG элементы
// Остальные форматы (jpg/png/webp/gif) — вставляются как картинки

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname);
const OUTPUT = path.join(__dirname, 'image-index.js');

// Категории — порядок определяет порядок вкладок в модале
const CATS = [
  {id:'nature',      name:'Природа'},
  {id:'animals',     name:'Животные'},
  {id:'birds',       name:'Птицы'},
  {id:'business',    name:'Бизнес'},
  {id:'technology',  name:'Технологии'},
  {id:'backgrounds', name:'Фоны'},
  {id:'textures',    name:'Текстуры'},
  {id:'people',      name:'Люди'},
  {id:'abstract',    name:'Абстракция'},
  {id:'icons_png',   name:'Иконки PNG'},
];

const IMG_EXTS = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'];

function nameFromFile(file) {
  return file
    .replace(/\.[^.]+$/, '')           // убираем расширение
    .replace(/[-_]/g, ' ')             // тире и подчёркивания → пробел
    .replace(/\b\w/g, c => c.toUpperCase()); // каждое слово с большой буквы
}

function escapeBacktick(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
}

const entries = [];
let counter = 1;

for (const cat of CATS) {
  const catDir = path.join(IMAGES_DIR, cat.id);
  if (!fs.existsSync(catDir)) continue;

  const files = fs.readdirSync(catDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return IMG_EXTS.includes(ext) && !f.startsWith('.');
  }).sort();

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const isSvg = ext === '.svg';
    const filePath = 'images/' + cat.id + '/' + file;
    const id = 'img' + (counter++);
    const name = nameFromFile(file);

    if (isSvg) {
      // Читаем SVG контент и встраиваем
      try {
        const svgRaw = fs.readFileSync(path.join(catDir, file), 'utf8').trim();
        // Проверяем что это валидный SVG
        if (!svgRaw.includes('<svg')) {
          console.warn('  ПРОПУЩЕН (не SVG):', file);
          continue;
        }
        // Убираем XML декларацию если есть
        const svgClean = svgRaw.replace(/^<\?xml[^?]*\?>\s*/i, '').trim();
        entries.push({ id, cat: cat.id, file, name, path: filePath, isSvg: true, svgContent: svgClean });
        console.log('  SVG (встроен):', file);
      } catch(e) {
        console.warn('  ОШИБКА чтения:', file, e.message);
      }
    } else {
      entries.push({ id, cat: cat.id, file, name, path: filePath, isSvg: false });
      console.log('  Изображение:', file);
    }
  }
}

// Генерируем JS файл
let out = `// ══════════════ IMAGE INDEX ══════════════
// Сгенерировано автоматически: node images/build-index.js
// НЕ РЕДАКТИРУЙТЕ ВРУЧНУЮ — изменения будут перезаписаны при следующем запуске
// Дата: ${new Date().toLocaleString('ru')}

const IMAGE_INDEX = [\n`;

for (const e of entries) {
  if (e.isSvg && e.svgContent) {
    out += `  {\n`;
    out += `    id: ${JSON.stringify(e.id)},\n`;
    out += `    cat: ${JSON.stringify(e.cat)},\n`;
    out += `    file: ${JSON.stringify(e.file)},\n`;
    out += `    name: ${JSON.stringify(e.name)},\n`;
    out += `    path: ${JSON.stringify(e.path)},\n`;
    out += `    isSvg: true,\n`;
    out += `    svgContent: \`${escapeBacktick(e.svgContent)}\`,\n`;
    out += `  },\n`;
  } else {
    out += `  {id:${JSON.stringify(e.id)}, cat:${JSON.stringify(e.cat)}, file:${JSON.stringify(e.file)}, name:${JSON.stringify(e.name)}, path:${JSON.stringify(e.path)}, isSvg:false},\n`;
  }
}

out += `];\n`;

fs.writeFileSync(OUTPUT, out, 'utf8');
console.log(`\nГотово! Записей: ${entries.length}`);
console.log(`Файл: ${OUTPUT}`);

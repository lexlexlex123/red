#!/usr/bin/env node
// ══════════════ ГЕНЕРАТОР СПИСКА АУДИО ══════════════
// Запуск: node audio/build-list.js
// (из корня проекта или через update-audio.bat)
//
// Сканирует папку audio/ (включая подпапки) и пишет audio/audio-list.js

const fs = require('fs');
const path = require('path');

const AUDIO_DIR = path.join(__dirname);
const OUTPUT = path.join(__dirname, 'audio-list.js');
const EXTS = new Set(['.ogg', '.mp3', '.wav', '.mp4', '.m4a', '.aac', '.opus', '.flac']);

function walk(dir, baseRel, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    if (ent.name === 'build-list.js' || ent.name === 'audio-list.js') continue;
    const full = path.join(dir, ent.name);
    const rel = baseRel ? baseRel + '/' + ent.name : ent.name;
    if (ent.isDirectory()) {
      walk(full, rel, out);
      continue;
    }
    const ext = path.extname(ent.name).toLowerCase();
    if (!EXTS.has(ext)) continue;
    const name = path.basename(ent.name, ext);
    out.push({
      id: 'aud' + (out.length + 1),
      file: ent.name,
      name: name,
      path: 'audio/' + rel.replace(/\\/g, '/'),
    });
  }
}

const items = [];
walk(AUDIO_DIR, '', items);
items.sort((a, b) => a.path.localeCompare(b.path, 'ru', { sensitivity: 'base' }));

const date = new Date().toLocaleString('ru-RU');
const body =
  '// ══════════════ AUDIO LIBRARY ══════════════\n' +
  '// Сгенерировано: node audio/build-list.js\n' +
  '// НЕ РЕДАКТИРУЙТЕ ВРУЧНУЮ — перезапишется при следующем запуске\n' +
  '// Дата: ' + date + '\n\n' +
  'window._AUDIO_LIBRARY = ' + JSON.stringify(items, null, 2) + ';\n';

fs.writeFileSync(OUTPUT, body, 'utf8');
console.log('Найдено файлов: ' + items.length);
console.log('Записано: audio/audio-list.js');
if (!items.length) {
  console.log('Подсказка: положите .ogg / .mp3 / .wav / .mp4 / .m4a в папку audio/ и запустите снова.');
}

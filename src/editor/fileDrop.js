/** Classify dropped files and build human hints (from js/28-filedrop.js). */

import { codeLangFromFilename } from './codeHighlight.js';

export function extOf(name) {
  return String(name || '').split('.').pop().toLowerCase();
}

export function isVideoFile(f) {
  const ext = extOf(f.name);
  return (f.type || '').startsWith('video/') || ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv', 'ogv'].includes(ext);
}

export function isAudioFile(f) {
  const ext = extOf(f.name);
  const mime = f.type || '';
  return (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'm4a', 'aac', 'flac', 'opus', 'wma'].includes(ext) ||
    (ext === 'ogg' && !mime.startsWith('video/'))
  );
}

export function isMdFile(f) {
  return ['md', 'markdown', 'mdown', 'mkd'].includes(extOf(f.name));
}

export function isCodeFile(f) {
  const name = String(f.name || '').toLowerCase();
  const ext = extOf(name);
  if (['html', 'htm', 'pptx', 'ppt', 'odp'].includes(ext)) return false;
  if (name.endsWith('.slides.json')) return false;
  return !!codeLangFromFilename(name);
}

export function isImageFile(f) {
  const ext = extOf(f.name);
  const mime = f.type || '';
  return (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif', 'tif', 'tiff', 'svg'].includes(ext)
  );
}

export function dropHintFromItems(items, lang = 'ru') {
  const ru = lang !== 'en';
  if (!items?.length) return null;
  for (const item of items) {
    if (item.kind !== 'file') continue;
    const t = item.type || '';
    // DataTransferItem often has empty name — use type only
    if (t.includes('presentationml') || t.includes('opendocument.presentation')) {
      return ru ? 'PPTX / PPT / ODP — импорт презентации' : 'PPTX / PPT / ODP — import presentation';
    }
    if (t === 'text/html') return ru ? 'HTML — импорт презентации' : 'HTML — import presentation';
    if (t === 'application/json') return ru ? 'JSON — проект или код' : 'JSON — project or code';
    if (t.startsWith('image/')) return ru ? 'Изображение — на слайд' : 'Image — insert on slide';
    if (t.startsWith('video/')) return ru ? 'Видео — на слайд' : 'Video — insert on slide';
    if (t.startsWith('audio/')) return ru ? 'Аудио — на слайд' : 'Audio — insert on slide';
  }
  return null;
}

export function dropHintFromFile(file, lang = 'ru') {
  const ru = lang !== 'en';
  if (!file) return null;
  const name = String(file.name || '').toLowerCase();
  const ext = extOf(name);
  if (['pptx', 'ppt', 'odp'].includes(ext)) {
    return ru ? 'PPTX / PPT / ODP — импорт презентации' : 'PPTX / PPT / ODP — import presentation';
  }
  if (ext === 'html' || ext === 'htm') {
    return ru ? 'HTML — импорт экспортированной презентации' : 'HTML — import exported presentation';
  }
  if (name.endsWith('.slides.json')) return ru ? 'JSON — восстановить состояние' : 'JSON — restore project';
  if (ext === 'json') return ru ? 'JSON — проект или блок кода' : 'JSON — project or code';
  if (isImageFile(file)) return ru ? 'Изображение — вставить на слайд' : 'Image — insert on slide';
  if (isVideoFile(file)) return ru ? 'Видео — вставить на слайд' : 'Video — insert on slide';
  if (isAudioFile(file)) return ru ? 'Аудио — вставить на слайд' : 'Audio — insert on slide';
  if (isMdFile(file)) return ru ? 'Markdown — вставить блок' : 'Markdown — insert block';
  if (ext === 'obj') return ru ? 'OBJ — 3D-модель на слайд' : 'OBJ — 3D model on slide';
  if (isCodeFile(file)) return ru ? 'Код — вставить блок' : 'Code — insert block';
  return null;
}

/** Pick highest-priority file from a drop list. */
export function pickDroppedFile(files) {
  const list = Array.from(files || []).filter(Boolean);
  if (!list.length) return null;
  const order = [
    (f) => ['pptx', 'ppt', 'odp'].includes(extOf(f.name)),
    (f) => ['html', 'htm'].includes(extOf(f.name)),
    (f) => String(f.name || '').toLowerCase().endsWith('.slides.json'),
    (f) => extOf(f.name) === 'json',
    (f) => isImageFile(f),
    (f) => isVideoFile(f),
    (f) => isAudioFile(f),
    (f) => isMdFile(f),
    (f) => isCodeFile(f),
    (f) => extOf(f.name) === 'obj',
  ];
  for (const test of order) {
    const f = list.find(test);
    if (f) return f;
  }
  return list[0];
}

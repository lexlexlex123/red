/**
 * ╔══════════════════════════════════════════════════╗
 * ║  config/images.js — Конфигурация изображений     ║
 * ╚══════════════════════════════════════════════════╝
 */

window.CFG_IMAGES = {

  // ── Параметры нового изображения при вставке ──────────────────
  defaults: {
    width:  400,
    height: 300,
    fit:    'contain',   // 'contain' | 'cover' | 'fill' | 'none'
    posX:   'center',
    posY:   'center',
    opacity:    1,
    borderRadius: 0,     // px скругления
    borderWidth: 0,      // px обводки
    borderColor: '#ffffff',
    shadow: false,
    shadowBlur: 15,
    shadowColor: '#000000',
  },

  // ── Принимать форматы ─────────────────────────────────────────
  accept: 'image/*',

  // ── Максимальный размер файла (байт, 0 = без ограничений) ────
  maxFileSizeBytes: 0,

};

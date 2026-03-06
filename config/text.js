/**
 * ╔══════════════════════════════════════════════════╗
 * ║  config/text.js — Конфигурация текстовых блоков  ║
 * ╚══════════════════════════════════════════════════╝
 */

window.CFG_TEXT = {

  // ── Параметры нового текстового блока ─────────────────────────
  defaults: {
    width:  500,
    height: 120,
    role:   'body',   // 'body' | 'heading'
    placeholder: 'Double-click to edit',

    // CSS-стили для body-текста
    bodyStyle: 'font-size:36px;font-weight:400;color:#ffffff;text-align:left;line-height:1.2;',

    // CSS-стили для heading-текста
    headingStyle: 'font-size:52px;font-weight:700;color:#818cf8;text-align:left;line-height:1.1;text-transform:uppercase;',
  },

  // ── Набор предустановленных размеров шрифта ───────────────────
  fontSizes: [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96],

  // ── Настройки редактирования ──────────────────────────────────
  doubleClickToEdit: true,
  exitEditOnClickOutside: true,

};

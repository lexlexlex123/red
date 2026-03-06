/**
 * ╔══════════════════════════════════════════════════╗
 * ║  config/animations.js — Конфигурация анимаций    ║
 * ╚══════════════════════════════════════════════════╝
 */

window.CFG_ANIMATIONS = {

  // ── Анимации по умолчанию для нового элемента ─────────────────
  defaultAnim: null,      // null = без анимации, или 'fadeIn', 'slideUp' и т.д.
  defaultDuration: 600,   // мс
  defaultDelay: 0,        // мс

  // ── Доступные анимации ────────────────────────────────────────
  // Установите enabled: false чтобы скрыть анимацию из UI
  available: [
    // Entrance
    { id: 'fadeIn',    label: 'Fade In',    category: 'entrance', enabled: true },
    { id: 'slideUp',   label: 'Slide Up',   category: 'entrance', enabled: true },
    { id: 'slideDown', label: 'Slide Down', category: 'entrance', enabled: true },
    { id: 'slideLeft', label: 'Slide Left', category: 'entrance', enabled: true },
    { id: 'slideRight',label: 'Slide Right',category: 'entrance', enabled: true },
    { id: 'zoomIn',    label: 'Zoom In',    category: 'entrance', enabled: true },
    { id: 'spinIn',    label: 'Spin In',    category: 'entrance', enabled: true },
    { id: 'bounceIn',  label: 'Bounce',     category: 'entrance', enabled: true },
    // Exit
    { id: 'fadeOut',   label: 'Fade Out',   category: 'exit',     enabled: true },
    { id: 'slideOut',  label: 'Slide Out',  category: 'exit',     enabled: true },
    { id: 'zoomOut',   label: 'Zoom Out',   category: 'exit',     enabled: true },
    // Emphasis
    { id: 'pulse',     label: 'Pulse',      category: 'emphasis', enabled: true },
    { id: 'shake',     label: 'Shake',      category: 'emphasis', enabled: true },
    { id: 'flash',     label: 'Flash',      category: 'emphasis', enabled: true },
  ],

};

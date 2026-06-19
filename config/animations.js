/**
 * config/animations.js — Конфигурация анимаций
 */

window.CFG_ANIMATIONS = {

  defaultAnim: null,
  defaultDuration: 600,
  defaultDelay: 0,

  // enabled: false — скрыть из каталога панели анимаций
  available: [
    { id: 'fadeIn',       label: 'Появление',     category: 'entrance', enabled: true },
    { id: 'slideUp',      label: 'Подъём',        category: 'entrance', enabled: true },
    { id: 'slideDown',    label: 'Спуск',         category: 'entrance', enabled: true },
    { id: 'slideLeft',    label: 'Влево',         category: 'entrance', enabled: true },
    { id: 'slideRight',   label: 'Вправо',        category: 'entrance', enabled: true },
    { id: 'zoomIn',       label: 'Увеличение',    category: 'entrance', enabled: true },
    { id: 'spinIn',       label: 'Вращение',      category: 'entrance', enabled: true },
    { id: 'bounceIn',     label: 'Отскок',        category: 'entrance', enabled: true },
    { id: 'pulse',        label: 'Пульсация',     category: 'emphasis', enabled: true },
    { id: 'shake',        label: 'Дрожание',      category: 'emphasis', enabled: true },
    { id: 'flash',        label: 'Мигание',       category: 'emphasis', enabled: true },
    { id: 'rotate',       label: 'Вращение',      category: 'emphasis', enabled: true },
    { id: 'fadeOut',      label: 'Исчезновение',  category: 'exit',     enabled: true },
    { id: 'slideOut',     label: 'Выезд',         category: 'exit',     enabled: true },
    { id: 'zoomOut',      label: 'Уменьшение',    category: 'exit',     enabled: true },
    { id: 'splitHalf',    label: 'Пополам',       category: 'exit',     enabled: true },
    { id: 'moveTo',       label: 'Переместить',   category: 'motion',   enabled: true },
    { id: 'orbitTo',      label: 'По окружности', category: 'motion',   enabled: true },
    { id: 'dance',        label: 'Танец',         category: 'live',     enabled: true },
    { id: 'swing',        label: 'Качение',       category: 'live',     enabled: true },
    { id: 'float',        label: 'Плавание',      category: 'live',     enabled: true },
    { id: 'typewriter',   label: 'Смена текста',  category: 'live',     enabled: true },
    { id: 'captionSlide', label: 'Титр в сторону', category: 'live',     enabled: true },
  ],

};

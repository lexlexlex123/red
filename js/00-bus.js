// ══════════════════════════════════════════════════════════════════
//  js/00-bus.js — Центральная шина событий
//
//  Все модули общаются ТОЛЬКО через Bus.emit() / Bus.on().
//  Прямые вызовы между модулями запрещены.
//  Если модуль не загружен — его обработчики просто не регистрируются,
//  и вся система продолжает работать.
// ══════════════════════════════════════════════════════════════════

window.Bus = (function () {
  const _handlers = {};

  function on(event, handler, moduleId) {
    if (!_handlers[event]) _handlers[event] = [];
    _handlers[event].push({ handler, moduleId: moduleId || 'unknown' });
  }

  function off(event, handler) {
    if (!_handlers[event]) return;
    _handlers[event] = _handlers[event].filter(h => h.handler !== handler);
  }

  function emit(event, data) {
    const list = _handlers[event];
    if (!list || !list.length) return;
    list.forEach(({ handler, moduleId }) => {
      try {
        handler(data);
      } catch (e) {
        console.warn('[Bus] Ошибка в обработчике "' + event + '" модуля "' + moduleId + '":', e.message || e);
      }
    });
  }

  // Список всех событий шины (для документации и отладки)
  const EVENTS = {
    // ── Состояние ──────────────────────────────────────────────
    STATE_SAVE:         'state:save',         // сохранить DOM → данные
    STATE_SAVE_STORAGE: 'state:saveStorage',  // данные → localStorage
    STATE_COMMIT:       'state:commit',       // save + drawThumbs + saveStorage
    STATE_LOAD:         'state:load',         // загрузить состояние из localStorage
    UNDO_PUSH:          'undo:push',          // зафиксировать шаг отмены

    // ── Слайды ─────────────────────────────────────────────────
    SLIDE_ADDED:        'slide:added',
    SLIDE_DELETED:      'slide:deleted',
    SLIDE_PICKED:       'slide:picked',       // { index }
    SLIDE_REORDERED:    'slide:reordered',

    // ── Элементы ───────────────────────────────────────────────
    ELEMENT_ADDED:      'element:added',      // { el, data }
    ELEMENT_SELECTED:   'element:selected',   // { el } | null
    ELEMENT_DESELECTED: 'element:deselected',
    ELEMENT_DELETED:    'element:deleted',
    ELEMENT_CHANGED:    'element:changed',    // { el, data }

    // ── Рендер ─────────────────────────────────────────────────
    RENDER_ALL:         'render:all',
    RENDER_THUMBS:      'render:thumbs',
    RENDER_GRID:        'render:grid',

    // ── Переходы / анимации ────────────────────────────────────
    TRANS_CHANGED:      'transition:changed',
    ANIM_ADDED:         'anim:added',

    // ── Темы ───────────────────────────────────────────────────
    THEME_APPLIED:      'theme:applied',      // { theme, index }

    // ── Фон ────────────────────────────────────────────────────
    BG_CHANGED:         'bg:changed',

    // ── Режим показа ───────────────────────────────────────────
    PREVIEW_START:      'preview:start',
    PREVIEW_STOP:       'preview:stop',

    // ── UI ─────────────────────────────────────────────────────
    TOAST:              'ui:toast',           // { msg, type }
    LANG_CHANGED:       'ui:langChanged',

    // ── Нумерация ──────────────────────────────────────────────
    PAGENUM_CHANGED:    'pagenum:changed',
  };

  return { on, off, emit, EVENTS };
})();

// ── Удобные алиасы для совместимости ─────────────────────────────
// Модули могут вызывать _bus_save(), _bus_commit() и т.д.
// вместо того чтобы напрямую вызывать функции других модулей.

window._bus_save        = () => Bus.emit(Bus.EVENTS.STATE_SAVE);
window._bus_saveState   = () => Bus.emit(Bus.EVENTS.STATE_SAVE_STORAGE);
window._bus_commitAll   = () => Bus.emit(Bus.EVENTS.STATE_COMMIT);
window._bus_drawThumbs  = () => Bus.emit(Bus.EVENTS.RENDER_THUMBS);
window._bus_renderAll   = () => Bus.emit(Bus.EVENTS.RENDER_ALL);
window._bus_pushUndo    = () => Bus.emit(Bus.EVENTS.UNDO_PUSH);
window._bus_toast       = (msg, type) => Bus.emit(Bus.EVENTS.TOAST, { msg, type });
window._bus_pickSlide   = (i) => Bus.emit(Bus.EVENTS.SLIDE_PICKED, { index: i });

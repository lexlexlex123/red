// ══════════════════════════════════════════════════════════════════
//  js/00-guard.js — Безопасные обёртки межмодульных вызовов
//
//  Каждая функция здесь — защищённый прокси к реальной функции.
//  Если функция ещё не загружена или выбросила ошибку —
//  прокси тихо возвращает fallback-значение.
//
//  Все модули должны вызывать функции ТОЛЬКО через эти обёртки,
//  никогда не обращаясь напрямую к функциям других модулей.
// ══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  /**
   * Создаёт безопасный прокси к глобальной функции.
   * @param {string} name     - имя функции в window
   * @param {*}      fallback - возвращаемое значение при ошибке
   */
  function proxy(name, fallback) {
    return function (...args) {
      try {
        if (typeof window[name] === 'function') {
          return window[name](...args);
        }
      } catch (e) {
        console.warn('[guard] ' + name + '():', e.message || e);
      }
      return (typeof fallback === 'function') ? fallback(...args) : fallback;
    };
  }

  // ── Сохранение / рендер ─────────────────────────────────────────
  window.guard = {
    save:       proxy('save'),
    saveState:  proxy('saveState'),
    commitAll:  proxy('commitAll'),
    drawThumbs: proxy('drawThumbs'),
    renderAll:  proxy('renderAll'),
    pushUndo:   proxy('pushUndo'),
    load:       proxy('load'),

    // ── UI ─────────────────────────────────────────────────────
    toast:      proxy('toast'),
    desel:      proxy('desel'),
    pick:       proxy('pick'),
    syncPos:    proxy('syncPos'),
    syncProps:  proxy('syncProps'),
    drawGrid:   proxy('drawGrid'),
    snapV:      proxy('snapV', v => v),  // fallback: вернуть значение без привязки

    // ── Слайды ─────────────────────────────────────────────────
    pickSlide:  proxy('pickSlide'),
    addSlide:   proxy('addSlide'),
    delSlide:   proxy('delSlide'),
    renderAll:  proxy('renderAll'),

    // ── Элементы ───────────────────────────────────────────────
    mkEl:       proxy('mkEl'),

    // ── Undo ───────────────────────────────────────────────────
    doUndo:     proxy('doUndo'),
    doRedo:     proxy('doRedo'),

    // ── Переходы / анимации ────────────────────────────────────
    renderAnimPanel: proxy('renderAnimPanel'),
    stopTextEditing: proxy('stopTextEditing'),

    // ── Миниатюры ──────────────────────────────────────────────
    invalidateThumbCache: proxy('invalidateThumbCache'),
    drawThumbs: proxy('drawThumbs'),

    // ── Нумерация ──────────────────────────────────────────────
    pnApplyAll:  proxy('pnApplyAll'),
    pnSyncUI:    proxy('pnSyncUI'),
    pnGetSettings: proxy('pnGetSettings', () => null),

    // ── Таблицы ────────────────────────────────────────────────
    tblClearSel: proxy('tblClearSel'),

    // ── Декор / темы ───────────────────────────────────────────
    refreshDecorColors:    proxy('refreshDecorColors'),
    refreshAppletThemes:   proxy('refreshAppletThemes'),
    refreshAllCodeBlocks:  proxy('refreshAllCodeBlocks'),

    // ── Выделение ──────────────────────────────────────────────
    clearMultiSel: proxy('clearMultiSel'),
    addToMultiSel: proxy('addToMultiSel'),

    // ── Показ ──────────────────────────────────────────────────
    startPreview: proxy('startPreview'),
    stopPreview:  proxy('stopPreview'),

    // ── Локализация ────────────────────────────────────────────
    t:       proxy('t', k => k),
    getLang: proxy('getLang', () => 'ru'),
    setLang: proxy('setLang'),

    // ── Экспорт ────────────────────────────────────────────────
    exportHTML: proxy('exportHTML'),
    importPPTX: proxy('importPPTX'),
  };

  // ── Регистрируем обработчики Bus для обратного направления ─────
  // Модули подписываются на события шины и вызывают свои функции

  // STATE_SAVE → save()
  Bus.on(Bus.EVENTS.STATE_SAVE, () => {
    if (typeof window.save === 'function') window.save();
  }, 'guard:save');

  // STATE_SAVE_STORAGE → saveState()
  Bus.on(Bus.EVENTS.STATE_SAVE_STORAGE, () => {
    if (typeof window.saveState === 'function') window.saveState();
  }, 'guard:saveState');

  // STATE_COMMIT → commitAll()
  Bus.on(Bus.EVENTS.STATE_COMMIT, () => {
    if (typeof window.commitAll === 'function') window.commitAll();
  }, 'guard:commitAll');

  // RENDER_THUMBS → drawThumbs()
  Bus.on(Bus.EVENTS.RENDER_THUMBS, () => {
    if (typeof window.drawThumbs === 'function') window.drawThumbs();
  }, 'guard:drawThumbs');

  // RENDER_ALL → renderAll()
  Bus.on(Bus.EVENTS.RENDER_ALL, () => {
    if (typeof window.renderAll === 'function') window.renderAll();
  }, 'guard:renderAll');

  // UNDO_PUSH → pushUndo()
  Bus.on(Bus.EVENTS.UNDO_PUSH, () => {
    if (typeof window.pushUndo === 'function') window.pushUndo();
  }, 'guard:pushUndo');

  // TOAST → toast()
  Bus.on(Bus.EVENTS.TOAST, ({ msg, type }) => {
    if (typeof window.toast === 'function') window.toast(msg, type);
  }, 'guard:toast');

  // RENDER_GRID → drawGrid()
  Bus.on(Bus.EVENTS.RENDER_GRID, () => {
    if (typeof window.drawGrid === 'function') window.drawGrid();
  }, 'guard:drawGrid');

  // SLIDE_PICKED → pickSlide(i)
  Bus.on(Bus.EVENTS.SLIDE_PICKED, ({ index }) => {
    if (typeof window.pickSlide === 'function') window.pickSlide(index);
  }, 'guard:pickSlide');

})();

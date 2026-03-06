/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  config/loader.js — Загрузчик конфигураций                   ║
 * ║                                                               ║
 * ║  Этот файл читает все CFG_* объекты и применяет их к         ║
 * ║  приложению. Каждый блок обёрнут в try/catch —               ║
 * ║  ошибка в одном конфиге не ломает другие.                    ║
 * ║                                                               ║
 * ║  Подключается ПОСЛЕ всех js-модулей, ДО вызова boot().       ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

(function () {
  'use strict';

  // ── Безопасный применитель ────────────────────────────────────
  function apply(name, fn) {
    try {
      fn();
    } catch (e) {
      console.warn('[config/loader] Ошибка в блоке "' + name + '":', e.message || e);
    }
  }

  // ── Безопасный геттер window-переменной ───────────────────────
  function get(name, fallback) {
    try {
      return (typeof window[name] !== 'undefined') ? window[name] : fallback;
    } catch (e) {
      return fallback;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. ХОЛСТ (config/canvas.js)
  // ─────────────────────────────────────────────────────────────
  apply('canvas', function () {
    const c = get('CFG_CANVAS', null);
    if (!c) return;

    if (typeof c.width === 'number')       window.canvasW = c.width;
    if (typeof c.height === 'number')      window.canvasH = c.height;
    if (typeof c.aspectRatio === 'string') window.ar = c.aspectRatio;
    if (typeof c.snapStep === 'number')    window.SNAP = c.snapStep;

    // Применить размеры к DOM-холсту (если уже есть)
    const cvEl = document.getElementById('canvas');
    if (cvEl) {
      cvEl.style.width  = window.canvasW + 'px';
      cvEl.style.height = window.canvasH + 'px';
    }

    // Snap checkbox
    if (typeof c.snapEnabled === 'boolean') {
      const chk = document.getElementById('snap-chk');
      if (chk) chk.checked = c.snapEnabled;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 2. ПЕРЕХОДЫ (config/transitions.js)
  // ─────────────────────────────────────────────────────────────
  apply('transitions', function () {
    const c = get('CFG_TRANSITIONS', null);
    if (!c) return;

    if (typeof c.defaultTransition === 'string') window.globalTrans   = c.defaultTransition;
    if (typeof c.duration === 'number')          window.transitionDur = c.duration;
    if (typeof c.autoDelay === 'number')         window.autoDelay     = c.autoDelay;

    // Sync UI controls if present
    const durEl   = document.getElementById('trans-dur');
    const delayEl = document.getElementById('auto-delay');
    if (durEl   && typeof c.duration === 'number')   durEl.value   = c.duration;
    if (delayEl && typeof c.autoDelay === 'number')  delayEl.value = c.autoDelay;
  });

  // ─────────────────────────────────────────────────────────────
  // 3. ТЕМЫ (config/themes.js)
  // ─────────────────────────────────────────────────────────────
  apply('themes', function () {
    const c = get('CFG_THEMES', null);
    if (!c) return;

    // Добавить кастомные темы к встроенным
    if (Array.isArray(c.custom) && c.custom.length > 0) {
      if (c.replaceBuiltin) {
        window.THEMES = c.custom;
      } else {
        if (typeof window.THEMES !== 'undefined') {
          window.THEMES = window.THEMES.concat(c.custom);
        }
      }
    }

    // Тема по умолчанию
    if (typeof c.defaultThemeIndex === 'number' && c.defaultThemeIndex >= 0) {
      window.appliedThemeIdx = c.defaultThemeIndex;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 4. ФОНЫ (config/backgrounds.js)
  // ─────────────────────────────────────────────────────────────
  apply('backgrounds', function () {
    const c = get('CFG_BACKGROUNDS', null);
    if (!c) return;

    if (Array.isArray(c.custom) && c.custom.length > 0) {
      if (c.replaceBuiltin) {
        window.BGS = c.custom.map(b => ({ id: b.id, s: b.style }));
      } else {
        if (typeof window.BGS !== 'undefined') {
          window.BGS = window.BGS.concat(c.custom.map(b => ({ id: b.id, s: b.style })));
        }
      }
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 5. ФИГУРЫ (config/shapes.js)
  // ─────────────────────────────────────────────────────────────
  apply('shapes', function () {
    const c = get('CFG_SHAPES', null);
    if (!c) return;

    // Скрыть фигуры
    if (Array.isArray(c.hidden) && c.hidden.length > 0 && typeof window.SHAPES !== 'undefined') {
      window.SHAPES = window.SHAPES.filter(s => !c.hidden.includes(s.id));
    }

    // Добавить кастомные фигуры
    if (Array.isArray(c.custom) && c.custom.length > 0 && typeof window.SHAPES !== 'undefined') {
      window.SHAPES = window.SHAPES.concat(c.custom);
    }

    // Дефолтная фигура
    if (c.defaults && typeof c.defaults.shape === 'string') {
      window.selShape = c.defaults.shape;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 6. АПЛЕТЫ (config/applets.js)
  // ─────────────────────────────────────────────────────────────
  apply('applets', function () {
    const c = get('CFG_APPLETS', null);
    if (!c) return;

    // Скрыть аплеты
    if (Array.isArray(c.hidden) && c.hidden.length > 0 && typeof window.APPLETS !== 'undefined') {
      window.APPLETS = window.APPLETS.filter(a => !c.hidden.includes(a.id));
    }

    // Добавить кастомные аплеты
    if (Array.isArray(c.custom) && c.custom.length > 0 && typeof window.APPLETS !== 'undefined') {
      c.custom.forEach(ca => {
        window.APPLETS.push({
          id:    ca.id,
          icon:  ca.icon  || '🔲',
          name:  ca.name  || ca.id,
          desc:  ca.desc  || '',
          w:     ca.defaultW || 400,
          h:     ca.defaultH || 300,
          getHTML: () => ca.html || '',
        });
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 7. UI (config/ui.js)
  // ─────────────────────────────────────────────────────────────
  apply('ui', function () {
    const c = get('CFG_UI', null);
    if (!c) return;

    // Тема интерфейса (только если ещё не задана в localStorage)
    if (typeof c.theme === 'string' && !localStorage.getItem('sf-theme')) {
      if (c.theme === 'light') document.documentElement.classList.add('light');
      else document.documentElement.classList.remove('light');
    }

    // Язык (только если ещё не задан в localStorage)
    if (typeof c.language === 'string' && !localStorage.getItem('sf-lang')) {
      if (typeof setLang === 'function') setLang(c.language);
    }

    // Undo лимит
    if (typeof c.undoMaxSteps === 'number') {
      window._CFG_UNDO_MAX = c.undoMaxSteps;
      // Патчим pushUndo чтобы использовал новый лимит
      const origPushUndo = window.pushUndo;
      if (typeof origPushUndo === 'function') {
        window.pushUndo = function () {
          if (typeof save === 'function') save();
          undoStack.push(typeof _snapState === 'function' ? _snapState() : '');
          if (undoStack.length > (window._CFG_UNDO_MAX || 40)) undoStack.shift();
          redoStack = [];
        };
      }
    }

    // Скрыть вкладки
    if (Array.isArray(c.hideTabs) && c.hideTabs.length > 0) {
      c.hideTabs.forEach(tabId => {
        const btn = document.querySelector('.rtab[data-tab="' + tabId + '"]');
        if (btn) btn.style.display = 'none';
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 8. СОХРАНЕНИЕ (config/persist.js)
  // ─────────────────────────────────────────────────────────────
  apply('persist', function () {
    const c = get('CFG_PERSIST', null);
    if (!c) return;

    // Кастомный ключ хранилища
    if (typeof c.storageKey === 'string' && c.storageKey !== 'sf_v4') {
      window._CFG_STORAGE_KEY = c.storageKey;
      // Патчим saveState / loadState
      const _origSave = window.saveState;
      const _origLoad = window.loadState;
      if (typeof _origSave === 'function') {
        window.saveState = function () {
          const key = window._CFG_STORAGE_KEY || 'sf_v4';
          const _pn = typeof pnGetSettings === 'function' ? pnGetSettings() : null;
          try {
            localStorage.setItem(key, JSON.stringify({
              slides, cur, ar, canvasW, canvasH, globalTrans, transitionDur, autoDelay, ec,
              appliedThemeIdx,
              title: document.getElementById('pres-title') ? document.getElementById('pres-title').value : '',
              pnSettings: _pn,
            }));
          } catch (e) {}
        };
      }
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 9. НУМЕРАЦИЯ (config/pagenum.js)
  // ─────────────────────────────────────────────────────────────
  apply('pagenum', function () {
    const c = get('CFG_PAGENUM', null);
    if (!c) return;

    // Переопределяем дефолты pnSettings — они применятся при первом вызове pnGetSettings()
    const origDefaults = window._pnDefaults;
    if (typeof origDefaults === 'function') {
      window._pnDefaults = function () {
        const base = origDefaults();
        return Object.assign(base, {
          enabled:     typeof c.enabled === 'boolean'     ? c.enabled     : base.enabled,
          style:       typeof c.style === 'string'        ? c.style       : base.style,
          position:    typeof c.position === 'string'     ? c.position    : base.position,
          fontSize:    typeof c.fontSize === 'number'     ? c.fontSize    : base.fontSize,
          opacity:     typeof c.opacity === 'number'      ? c.opacity     : base.opacity,
          showTotal:   typeof c.showTotal === 'boolean'   ? c.showTotal   : base.showTotal,
          customColor: typeof c.customColor === 'boolean' ? c.customColor : base.customColor,
          color:       typeof c.color === 'string'        ? c.color       : base.color,
          textColor:   typeof c.textColor === 'string'    ? c.textColor   : base.textColor,
        });
      };
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Уведомляем что конфиги применены
  // ─────────────────────────────────────────────────────────────
  window._CFG_LOADED = true;
  console.log('[config/loader] ✓ Конфигурации применены');

})();

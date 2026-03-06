// ══════════════ CONFIG PANEL (v1.0) ══════════════
// Модальная панель расширенной конфигурации.
// Файл полностью изолирован: любая ошибка внутри него
// не влияет на работоспособность основного приложения.
// Подключается последним в index.html.

(function () {
  'use strict';

  // ── Безопасный вызов внешних функций ──────────────────────────────
  function _safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  // ── Получить / установить глобальную переменную ───────────────────
  function _get(name, fallback) {
    return typeof window[name] !== 'undefined' ? window[name] : fallback;
  }
  function _set(name, value) {
    try { window[name] = value; } catch (e) {}
  }

  // ── Вызвать глобальную функцию ────────────────────────────────────
  function _call(name, ...args) {
    try {
      if (typeof window[name] === 'function') window[name](...args);
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════
  // СЕКЦИИ КОНФИГУРАЦИИ
  // Каждая секция: { id, icon, label, build(container) }
  // build() вызывается при открытии — читает текущие значения
  // ═══════════════════════════════════════════════════════════════════

  const SECTIONS = [

    // ── 1. Холст ───────────────────────────────────────────────────
    {
      id: 'canvas', icon: '🖥', label: 'Холст',
      build(box) {
        box.innerHTML = '';
        _row(box, 'Ширина холста', _inp('number', _get('canvasW', 1200), 400, 4000, 1, v => {
          const h = _get('canvasH', 675);
          _safe(() => {
            window.canvasW = v;
            document.getElementById('canvas').style.width = v + 'px';
            _call('drawGrid'); _call('renderAll'); _call('drawThumbs'); _call('saveState');
          });
        }));
        _row(box, 'Высота холста', _inp('number', _get('canvasH', 675), 300, 3000, 1, v => {
          _safe(() => {
            window.canvasH = v;
            document.getElementById('canvas').style.height = v + 'px';
            _call('drawGrid'); _call('renderAll'); _call('drawThumbs'); _call('saveState');
          });
        }));
        _row(box, 'Шаг привязки (px)', _inp('number', _get('SNAP', 10), 1, 50, 1, v => {
          _safe(() => { window.SNAP = v; _call('drawGrid'); });
        }));
        _row(box, 'Привязка к сетке', _chk(
          _safe(() => document.getElementById('snap-chk').checked, true),
          v => _safe(() => {
            document.getElementById('snap-chk').checked = v;
            const s2 = document.getElementById('settings-snap');
            if (s2) s2.checked = v;
          })
        ));
      }
    },

    // ── 2. Переходы и анимации ────────────────────────────────────
    {
      id: 'anim', icon: '✨', label: 'Анимации',
      build(box) {
        box.innerHTML = '';
        _row(box, 'Длительность перехода (мс)', _inp('number', _get('transitionDur', 500), 0, 5000, 50, v => {
          _set('transitionDur', v);
          _safe(() => {
            const el = document.getElementById('trans-dur');
            if (el) el.value = v;
            _call('saveState');
          });
        }));
        _row(box, 'Авто-переход по умолчанию (сек)', _inp('number', _get('autoDelay', 5), 1, 120, 1, v => {
          _set('autoDelay', v);
          _safe(() => {
            const el = document.getElementById('auto-delay');
            if (el) el.value = v;
            _call('saveState');
          });
        }));

        const TRANS_LIST = ['none','fade','slide','zoom','flip','cube','dissolve','morph'];
        const curTrans = _get('globalTrans', 'none');
        _row(box, 'Глобальный переход', _sel(
          TRANS_LIST.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
          curTrans,
          v => _safe(() => {
            window.globalTrans = v;
            document.querySelectorAll('.tbtn2[data-t]').forEach(b =>
              b.classList.toggle('active', b.dataset.t === v)
            );
            _call('saveState');
          })
        ));
      }
    },

    // ── 3. Сохранение ──────────────────────────────────────────────
    {
      id: 'persist', icon: '💾', label: 'Сохранение',
      build(box) {
        box.innerHTML = '';

        // Размер localStorage
        let lsSize = '—';
        _safe(() => {
          const raw = localStorage.getItem('sf_v4') || '';
          lsSize = (raw.length / 1024).toFixed(1) + ' КБ';
        });
        _info(box, '📦 Данные в localStorage: ' + lsSize);

        // Кол-во слайдов
        const slideCount = _safe(() => _get('slides', []).length, '?');
        _info(box, '📄 Слайдов в проекте: ' + slideCount);

        // Undo стек
        const undoLen = _safe(() => _get('undoStack', []).length, 0);
        _info(box, '↩ Шагов в истории undo: ' + undoLen + ' / 40');

        _divider(box);
        _btn(box, '💾 Сохранить сейчас', () => _safe(() => { _call('commitAll'); _cfgToast('Сохранено!'); }));
        _btn(box, '🧹 Очистить историю undo/redo', () => _safe(() => {
          window.undoStack = [];
          window.redoStack = [];
          _cfgToast('История очищена');
        }));
        _btn(box, '♻️ Сбросить сессию (удалить localStorage)', () => {
          if (!confirm('Удалить сохранённую сессию? Страница перезагрузится.')) return;
          _safe(() => { localStorage.removeItem('sf_v4'); location.reload(); });
        }, 'danger');
      }
    },

    // ── 4. Нумерация страниц ──────────────────────────────────────
    {
      id: 'pagenum', icon: '🔢', label: 'Нумерация',
      build(box) {
        box.innerHTML = '';
        const pn = _safe(() => {
          if (typeof pnGetSettings === 'function') return pnGetSettings();
          return null;
        }, null);

        if (!pn) {
          _info(box, '⚠ Модуль нумерации не загружен.');
          return;
        }

        _row(box, 'Включить нумерацию', _chk(pn.enabled, v => _safe(() => {
          pn.enabled = v;
          if (typeof pnApplyAll === 'function') pnApplyAll();
          if (typeof pnSyncUI === 'function') pnSyncUI();
          _call('saveState');
        })));

        const STYLES = ['simple','circle','ring','pill','line','dot'];
        _row(box, 'Стиль', _sel(
          STYLES.map(s => ({ value: s, label: s })),
          pn.style,
          v => _safe(() => { pn.style = v; _call('pnApplyAll'); _call('saveState'); })
        ));

        _row(box, 'Размер шрифта (px)', _inp('number', pn.fontSize || 14, 8, 48, 1, v => _safe(() => {
          pn.fontSize = v; _call('pnApplyAll'); _call('saveState');
        })));

        _row(box, 'Прозрачность (0–1)', _inp('number', pn.opacity != null ? pn.opacity : 1, 0, 1, 0.05, v => _safe(() => {
          pn.opacity = v; _call('pnApplyAll'); _call('saveState');
        })));

        _row(box, 'Показывать итого (1/5)', _chk(pn.showTotal, v => _safe(() => {
          pn.showTotal = v; _call('pnApplyAll'); _call('saveState');
        })));

        const POS = ['tl','tc','tr','bl','bc','br'];
        _row(box, 'Позиция', _sel(
          POS.map(p => ({ value: p, label: p.toUpperCase() })),
          pn.position || 'br',
          v => _safe(() => { _call('pnSetPos', v); _call('saveState'); })
        ));

        _row(box, 'Цвет фона', _color(pn.color || '#3b82f6', v => _safe(() => {
          pn.color = v; pn.customColor = true; _call('pnApplyAll'); _call('saveState');
        })));

        _row(box, 'Цвет текста', _color(pn.textColor || '#ffffff', v => _safe(() => {
          pn.textColor = v; pn.customColor = true; _call('pnApplyAll'); _call('saveState');
        })));
      }
    },

    // ── 5. Интерфейс ──────────────────────────────────────────────
    {
      id: 'ui', icon: '🎨', label: 'Интерфейс',
      build(box) {
        box.innerHTML = '';

        const isDark = _safe(() => !document.documentElement.classList.contains('light'), true);
        _row(box, 'Тёмная тема', _chk(isDark, v => _safe(() => {
          _call('setTheme', v ? 'dark' : 'light');
        })));

        const curLang = _safe(() => {
          if (typeof getLang === 'function') return getLang();
          return localStorage.getItem('sf-lang') || 'ru';
        }, 'ru');
        _row(box, 'Язык интерфейса', _sel(
          [{ value: 'ru', label: '🇷🇺 Русский' }, { value: 'en', label: '🇬🇧 English' }],
          curLang,
          v => _safe(() => { _call('setLang', v); })
        ));

        _divider(box);
        _info(box, 'ℹ ' + _get('APP_NAME','Слайды') + ' v' + _get('APP_VERSION','?') + ' · ' + _get('APP_AUTHOR',''));
      }
    },

    // ── 6. Экспорт / Импорт ───────────────────────────────────────
    {
      id: 'export', icon: '📤', label: 'Экспорт',
      build(box) {
        box.innerHTML = '';
        _info(box, 'Быстрый доступ к экспорту и импорту.');
        _btn(box, '📤 Экспорт в HTML', () => _safe(() => _call('exportHTML')));
        _btn(box, '📥 Импорт PPTX', () => _safe(() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pptx';
          input.onchange = e => _safe(() => {
            const f = e.target.files[0];
            if (f && typeof importPPTX === 'function') importPPTX(f);
          });
          input.click();
        }));
        _divider(box);
        _info(box, 'JSON — снимок текущего состояния.');
        _btn(box, '📋 Скопировать JSON состояния', () => _safe(() => {
          const json = localStorage.getItem('sf_v4') || '';
          navigator.clipboard.writeText(json).then(() => _cfgToast('JSON скопирован в буфер')).catch(() => _cfgToast('Ошибка копирования'));
        }));
      }
    },

    // ── 7. Горячие клавиши ────────────────────────────────────────
    {
      id: 'keys', icon: '⌨', label: 'Клавиши',
      build(box) {
        box.innerHTML = '';
        const keys = [
          ['Ctrl+Z', 'Отменить'],
          ['Ctrl+Y / Ctrl+Shift+Z', 'Повторить'],
          ['Ctrl+C', 'Копировать'],
          ['Ctrl+V', 'Вставить'],
          ['Ctrl+D', 'Дублировать'],
          ['Ctrl+A', 'Выделить всё'],
          ['Delete', 'Удалить элемент'],
          ['F5', 'Показ / выход'],
          ['Esc', 'Выйти из показа'],
          ['← →', 'Слайды (показ)'],
          ['↑ ↓ ← →', 'Сдвиг на 1px'],
          ['Shift + ↑↓←→', 'Сдвиг на 10px'],
        ];
        const tbl = document.createElement('table');
        tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';
        keys.forEach(([k, v]) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td style="padding:5px 8px;border-bottom:1px solid var(--border,#333);color:var(--text2,#aaa);width:55%"><kbd style="background:var(--surface2,#2a2a2a);border:1px solid var(--border,#444);border-radius:4px;padding:2px 6px;font-family:monospace;font-size:11px">${k}</kbd></td><td style="padding:5px 8px;border-bottom:1px solid var(--border,#333);color:var(--text,#eee)">${v}</td>`;
          tbl.appendChild(tr);
        });
        box.appendChild(tbl);
      }
    },

  ];

  // ═══════════════════════════════════════════════════════════════════
  // UI HELPERS
  // ═══════════════════════════════════════════════════════════════════

  function _row(container, label, control) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--border,#2a2a2a);';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:12px;color:var(--text2,#aaa);flex:1;';
    lbl.textContent = label;
    row.appendChild(lbl);
    row.appendChild(control);
    container.appendChild(row);
  }

  function _info(container, text) {
    const p = document.createElement('p');
    p.style.cssText = 'font-size:11px;color:var(--text3,#666);margin:6px 0;line-height:1.5;';
    p.textContent = text;
    container.appendChild(p);
  }

  function _divider(container) {
    const hr = document.createElement('hr');
    hr.style.cssText = 'border:none;border-top:1px solid var(--border,#2a2a2a);margin:10px 0;';
    container.appendChild(hr);
  }

  function _btn(container, label, onclick, variant = 'default') {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = [
      'display:block;width:100%;text-align:left;padding:8px 12px;margin:4px 0;',
      'border-radius:6px;border:1px solid var(--border,#333);cursor:pointer;',
      'font-size:12px;font-family:inherit;transition:background .15s;',
      variant === 'danger'
        ? 'background:rgba(220,38,38,.15);color:#f87171;border-color:#7f1d1d;'
        : 'background:var(--surface2,#222);color:var(--text,#eee);',
    ].join('');
    btn.onmouseenter = () => btn.style.opacity = '.8';
    btn.onmouseleave = () => btn.style.opacity = '1';
    btn.onclick = onclick;
    container.appendChild(btn);
  }

  function _inp(type, value, min, max, step, onChange) {
    const el = document.createElement('input');
    el.type = type;
    el.value = value;
    if (min !== undefined) el.min = min;
    if (max !== undefined) el.max = max;
    if (step !== undefined) el.step = step;
    el.style.cssText = 'width:90px;background:var(--surface2,#222);border:1px solid var(--border,#333);color:var(--text,#eee);border-radius:4px;padding:4px 6px;font-size:12px;font-family:inherit;';
    el.oninput = () => _safe(() => onChange(+el.value));
    return el;
  }

  function _chk(checked, onChange) {
    const lbl = document.createElement('label');
    lbl.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;';
    const el = document.createElement('input');
    el.type = 'checkbox';
    el.checked = !!checked;
    el.style.cssText = 'accent-color:var(--accent,#6366f1);width:16px;height:16px;';
    el.onchange = () => _safe(() => onChange(el.checked));
    lbl.appendChild(el);
    return lbl;
  }

  function _sel(options, value, onChange) {
    const el = document.createElement('select');
    el.style.cssText = 'background:var(--surface2,#222);border:1px solid var(--border,#333);color:var(--text,#eee);border-radius:4px;padding:4px 6px;font-size:12px;font-family:inherit;max-width:140px;';
    options.forEach(({ value: v, label }) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = label;
      if (v === value) opt.selected = true;
      el.appendChild(opt);
    });
    el.onchange = () => _safe(() => onChange(el.value));
    return el;
  }

  function _color(value, onChange) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;';
    const el = document.createElement('input');
    el.type = 'color';
    el.value = value;
    el.style.cssText = 'width:36px;height:28px;border:none;border-radius:4px;cursor:pointer;background:none;padding:0;';
    const hex = document.createElement('input');
    hex.type = 'text';
    hex.value = value;
    hex.maxLength = 7;
    hex.style.cssText = 'width:70px;background:var(--surface2,#222);border:1px solid var(--border,#333);color:var(--text,#eee);border-radius:4px;padding:4px 6px;font-size:11px;font-family:monospace;';
    el.oninput = () => { hex.value = el.value; _safe(() => onChange(el.value)); };
    hex.oninput = () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) { el.value = hex.value; _safe(() => onChange(hex.value)); } };
    wrap.append(el, hex);
    return wrap;
  }

  // ═══════════════════════════════════════════════════════════════════
  // MODAL
  // ═══════════════════════════════════════════════════════════════════

  let _modal = null;
  let _activeSection = SECTIONS[0].id;

  function _cfgToast(msg) {
    _safe(() => {
      if (typeof toast === 'function') { toast(msg, 'ok'); return; }
      const t = _modal && _modal.querySelector('#cfg-toast');
      if (t) { t.textContent = msg; t.style.opacity = '1'; setTimeout(() => t.style.opacity = '0', 2500); }
    });
  }

  function _buildModal() {
    if (_modal) return;

    _modal = document.createElement('div');
    _modal.id = 'cfg-modal';
    _modal.style.cssText = [
      'display:none;position:fixed;inset:0;z-index:9999;',
      'align-items:center;justify-content:center;',
      'background:rgba(0,0,0,.65);backdrop-filter:blur(4px);',
    ].join('');

    _modal.innerHTML = `
      <div id="cfg-panel" style="
        background:var(--surface,#1a1a1a);
        border:1px solid var(--border,#333);
        border-radius:12px;
        width:min(720px,96vw);
        max-height:min(600px,92vh);
        display:flex;
        flex-direction:column;
        box-shadow:0 24px 64px rgba(0,0,0,.6);
        overflow:hidden;
        font-family:inherit;
      ">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border,#333);flex-shrink:0;">
          <span style="font-size:15px;font-weight:700;color:var(--text,#eee);">⚙ Конфигурация</span>
          <button id="cfg-close" style="background:none;border:none;color:var(--text2,#aaa);cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;border-radius:4px;">✕</button>
        </div>

        <!-- Body -->
        <div style="display:flex;flex:1;overflow:hidden;">

          <!-- Sidebar -->
          <nav id="cfg-nav" style="
            width:148px;flex-shrink:0;
            border-right:1px solid var(--border,#333);
            overflow-y:auto;padding:8px 0;
          "></nav>

          <!-- Content -->
          <div id="cfg-content" style="flex:1;overflow-y:auto;padding:14px 18px;"></div>
        </div>

        <!-- Footer -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 18px;border-top:1px solid var(--border,#333);flex-shrink:0;">
          <span id="cfg-toast" style="font-size:11px;color:var(--accent,#6366f1);opacity:0;transition:opacity .3s;"></span>
          <button id="cfg-done" style="
            background:var(--accent,#6366f1);color:#fff;
            border:none;border-radius:6px;
            padding:7px 18px;font-size:13px;font-weight:600;
            cursor:pointer;font-family:inherit;
          ">Готово</button>
        </div>
      </div>
    `;

    document.body.appendChild(_modal);

    // Nav items
    const nav = _modal.querySelector('#cfg-nav');
    SECTIONS.forEach(sec => {
      const btn = document.createElement('button');
      btn.dataset.secId = sec.id;
      btn.style.cssText = [
        'display:flex;align-items:center;gap:8px;',
        'width:100%;text-align:left;padding:9px 14px;',
        'background:none;border:none;cursor:pointer;',
        'font-size:12px;font-family:inherit;border-radius:0;',
        'transition:background .12s;',
        'color:var(--text2,#aaa);',
      ].join('');
      btn.innerHTML = `<span style="font-size:15px">${sec.icon}</span><span>${sec.label}</span>`;
      btn.onmouseenter = () => { if (btn.dataset.secId !== _activeSection) btn.style.background = 'var(--surface2,#222)'; };
      btn.onmouseleave = () => { if (btn.dataset.secId !== _activeSection) btn.style.background = 'none'; };
      btn.onclick = () => _switchSection(sec.id);
      nav.appendChild(btn);
    });

    // Close actions
    _modal.querySelector('#cfg-close').onclick = closeConfig;
    _modal.querySelector('#cfg-done').onclick = closeConfig;
    _modal.addEventListener('click', e => { if (e.target === _modal) closeConfig(); });

    // Keyboard
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _modal.style.display !== 'none') closeConfig();
    });
  }

  function _switchSection(id) {
    _activeSection = id;
    // Update nav highlights
    _modal.querySelectorAll('#cfg-nav button').forEach(btn => {
      const active = btn.dataset.secId === id;
      btn.style.background = active ? 'var(--accent-dim,rgba(99,102,241,.18))' : 'none';
      btn.style.color = active ? 'var(--accent,#6366f1)' : 'var(--text2,#aaa)';
      btn.style.fontWeight = active ? '600' : '400';
    });
    // Build section
    const sec = SECTIONS.find(s => s.id === id);
    const content = _modal.querySelector('#cfg-content');
    if (sec && content) {
      _safe(() => sec.build(content));
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════

  function openConfig(sectionId) {
    try {
      _buildModal();
      _modal.style.display = 'flex';
      _switchSection(sectionId || _activeSection);
    } catch (e) {
      console.warn('[34-config] openConfig error:', e);
    }
  }

  function closeConfig() {
    try {
      if (_modal) _modal.style.display = 'none';
    } catch (e) {}
  }

  // Экспортировать глобально
  window.openConfig = openConfig;
  window.closeConfig = closeConfig;

  // ── Добавить кнопку «Конфиг» в шапку после загрузки ──────────────
  function _injectButton() {
    try {
      // Не добавлять дважды
      if (document.getElementById('cfg-open-btn')) return;

      // Ищем кнопку шестерёнки (openSettings), вставляем рядом
      const settingsBtn = document.querySelector('[onclick="openSettings()"]');
      if (!settingsBtn) return;

      const btn = document.createElement('button');
      btn.id = 'cfg-open-btn';
      btn.className = settingsBtn.className;
      btn.style.cssText = settingsBtn.style.cssText || 'padding:5px 10px;font-size:14px;';
      btn.title = 'Расширенная конфигурация';
      btn.textContent = '🔧';
      btn.onclick = () => openConfig();

      settingsBtn.insertAdjacentElement('afterend', btn);
    } catch (e) {}
  }

  // Инъекция кнопки — после полной загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _injectButton);
  } else {
    setTimeout(_injectButton, 0);
  }

})();

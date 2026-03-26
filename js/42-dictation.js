// ══════════════════════════════════════════════════════════════════
// 42-dictation.js — Диктовка текста (Web Speech API) v4
// ══════════════════════════════════════════════════════════════════
(function(){
'use strict';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

// Удаляем любые плавающие mic-float-btn которые могут появиться из старого 04-ui.js
function _removeMicFloat() {
  document.querySelectorAll('#mic-float-btn').forEach(el => el.remove());
}
// Патчим _updateHandlesOverlay чтобы удалять mic-float после его вызова
(function(){
  const _orig = window._updateHandlesOverlay;
  if (_orig) {
    window._updateHandlesOverlay = function() {
      _orig.apply(this, arguments);
      _removeMicFloat();
    };
  }
  // Также удаляем при каждом пике
  const _origPick2 = window.pick;
  // будет перехвачен ниже
})();

if (!SR) {
  // Скрываем кнопки если нет поддержки
  setTimeout(() => {
    const w = document.getElementById('dictation-btn-wrap');
    if (w) w.style.display = 'none';
    const m = document.getElementById('ai-mic');
    if (m) m.style.display = 'none';
  }, 300);
  return;
}

// ── Состояние ──────────────────────────────────────────────────────
let _recog         = null;
let _active        = false;
let _shouldRestart = false;
let _mode          = 'text'; // 'text' | 'chat'

// ── Диктовка в текстовый блок ─────────────────────────────────────
window._dictationToggle = function() {
  if (_active && _mode === 'text') { _stop(); return; }
  if (_active) _stop(); // остановить чат-режим

  if (typeof sel === 'undefined' || !sel || sel.dataset.type !== 'text') {
    if (typeof toast === 'function') toast('Выберите текстовый блок', 'err');
    return;
  }
  _mode = 'text';
  _start();
};

// ── Диктовка в поле чата ──────────────────────────────────────────
window._aiDictationToggle = function() {
  if (_active && _mode === 'chat') { _stop(); return; }
  if (_active) _stop();
  _mode = 'chat';
  _start();
};

// ── Старт / стоп ──────────────────────────────────────────────────
function _start() {
  _active        = true;
  _shouldRestart = true;
  _setBtnState(true);
  if (typeof toast === 'function') toast('🎙 Говорите…');
  _startRecog();
}

function _stop() {
  _shouldRestart = false;
  _active        = false;
  _hideInterim();
  _setBtnState(false);
  if (_recog) { try { _recog.stop(); } catch(e) {} _recog = null; }
}

// ── Распознавание ─────────────────────────────────────────────────
function _startRecog() {
  if (!_active) return;

  _recog = new SR();
  _recog.lang            = _detectLang();
  _recog.continuous      = false;  // без повторных запросов разрешения
  _recog.interimResults  = true;
  _recog.maxAlternatives = 1;

  _recog.onresult = e => {
    let finals   = '';
    let interims = '';
    for (let i = 0; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finals += t;
      else interims += t;
    }

    if (_mode === 'chat') {
      // В чате — добавляем текст в textarea
      _appendToChat(finals, interims);
    } else {
      // В текстовом блоке — сразу вставляем финальные слова
      _hideInterim();
      if (finals.trim()) _insertIntoText(finals.trim());
      if (interims)      _showInterim(interims);
    }
  };

  _recog.onerror = err => {
    if (err.error === 'aborted' || err.error === 'no-speech') return;
    if (err.error === 'not-allowed') {
      if (typeof toast === 'function') toast('Нет доступа к микрофону', 'err');
      _shouldRestart = false;
      _stop();
      return;
    }
    console.warn('[Dictation]', err.error);
  };

  _recog.onend = () => {
    _hideInterim();
    if (_shouldRestart && _active) {
      setTimeout(_startRecog, 80);
    } else {
      _active = false;
      _setBtnState(false);
    }
  };

  try { _recog.start(); } catch(e) { console.warn('[Dictation]', e.message); }
}

// ── Вставка в текстовый блок (сразу при получении) ────────────────
function _insertIntoText(text) {
  if (!text || typeof sel === 'undefined' || !sel || sel.dataset.type !== 'text') return;

  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;

  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Читаем есть ли уже содержимое
  const _tmp = document.createElement('div');
  _tmp.innerHTML = d.html || '';
  const hasContent = _tmp.textContent.trim().length > 0;

  // Добавляем как новый блок
  const newDiv = '<div>' + esc(text) + '</div>';
  d.html = hasContent ? (d.html || '') + newDiv : newDiv;

  // Обновляем DOM
  const cv   = document.getElementById('canvas');
  const domEl = cv && cv.querySelector('.el[data-id="' + d.id + '"]');
  if (domEl) {
    const tel = domEl.querySelector('.tel') || domEl.querySelector('.ec');
    if (tel) tel.innerHTML = d.html;
  }

  if (typeof save       === 'function') save();
  if (typeof drawThumbs === 'function') drawThumbs();
  if (typeof saveState  === 'function') saveState();
}

// ── Вставка в чат ─────────────────────────────────────────────────
let _chatInterimLen = 0; // сколько символов промежуточного текста добавили

function _appendToChat(finals, interims) {
  const inp = document.getElementById('ai-input');
  if (!inp) return;

  // Удаляем прошлый промежуточный текст
  if (_chatInterimLen > 0) {
    inp.value = inp.value.slice(0, -_chatInterimLen);
    _chatInterimLen = 0;
  }

  // Добавляем финальный текст
  if (finals.trim()) {
    const sep = inp.value.length > 0 && !inp.value.endsWith(' ') ? ' ' : '';
    inp.value += sep + finals.trim();
  }

  // Добавляем промежуточный текст (будет удалён при следующем результате)
  if (interims) {
    const sep = inp.value.length > 0 ? ' ' : '';
    const interim = sep + interims;
    inp.value += interim;
    _chatInterimLen = interim.length;
  }

  // Скроллим в конец textarea
  inp.scrollTop = inp.scrollHeight;
}

// ── Промежуточный текст для текстового блока ──────────────────────
let _interimEl = null;

function _showInterim(text) {
  _hideInterim();
  if (!text || typeof sel === 'undefined' || !sel) return;
  const c = sel.querySelector('.tel') || sel.querySelector('.ec');
  if (!c) return;
  _interimEl = document.createElement('span');
  _interimEl.id = 'dictation-interim';
  _interimEl.style.cssText = 'opacity:.4;font-style:italic;pointer-events:none;';
  _interimEl.textContent = ' ' + text;
  c.appendChild(_interimEl);
}

function _hideInterim() {
  const old = document.getElementById('dictation-interim');
  if (old) old.remove();
  _interimEl = null;
  _chatInterimLen = 0;
}

// ── Кнопки ────────────────────────────────────────────────────────
function _setBtnState(on) {
  // Кнопка в панели свойств
  const btn = document.getElementById('dictation-main-btn');
  const lbl = document.getElementById('dictation-btn-label');
  // Кнопка в чате
  const micBtn = document.getElementById('ai-mic');

  const activeBtn = _mode === 'chat' ? micBtn : btn;
  const inactiveBtn = _mode === 'chat' ? btn : micBtn;

  if (activeBtn) {
    if (on) {
      activeBtn.style.background  = '#ef4444';
      activeBtn.style.animation   = 'mic-pulse 1s ease-in-out infinite';
      activeBtn.title = 'Остановить';
      if (lbl && _mode === 'text') lbl.textContent = 'Остановить';
      _ensurePulse();
    } else {
      activeBtn.style.background = 'linear-gradient(135deg,#6366f1,#a855f7)';
      activeBtn.style.animation  = '';
      activeBtn.title = _mode === 'chat' ? 'Диктовка' : 'Диктовка текста';
      if (lbl && _mode === 'text') lbl.textContent = 'Диктовка';
    }
  }
  // Восстанавливаем неактивную кнопку
  if (inactiveBtn && !on) {
    inactiveBtn.style.background = 'linear-gradient(135deg,#6366f1,#a855f7)';
    inactiveBtn.style.animation  = '';
  }
}

function _ensurePulse() {
  if (document.getElementById('mic-pulse-style')) return;
  const s = document.createElement('style');
  s.id = 'mic-pulse-style';
  s.textContent = `@keyframes mic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}50%{box-shadow:0 0 0 7px rgba(239,68,68,0)}}`;
  document.head.appendChild(s);
}

// ── Язык ──────────────────────────────────────────────────────────
function _detectLang() {
  if (typeof i18nLang === 'string') {
    if (i18nLang === 'ru') return 'ru-RU';
    if (i18nLang === 'en') return 'en-US';
  }
  return navigator.language || 'ru-RU';
}

// ── Остановить при смене выделения ────────────────────────────────
(function(){
  const _orig = window.pick;
  window.pick = function(el) {
    if (_active && _mode === 'text' && el !== sel) _stop();
    _removeMicFloat();
    if (_orig) _orig(el);
  };
})();

// ── Добавить кнопку mic в чат если её нет (совместимость со старым 36-ai.js) ─
function _ensureAiMicBtn() {
  if (document.getElementById('ai-mic')) return; // уже есть
  const sendBtn = document.getElementById('ai-send');
  if (!sendBtn) return;

  const mic = document.createElement('button');
  mic.id = 'ai-mic';
  mic.title = 'Диктовка';
  mic.onclick = function() { window._aiDictationToggle(); };
  mic.style.cssText = 'width:36px;height:36px;border-radius:8px;border:none;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;';
  mic.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';

  // Обёртываем send в column-контейнер и добавляем mic над ним
  const parent = sendBtn.parentNode;
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-self:flex-end;flex-shrink:0;';
  parent.insertBefore(wrapper, sendBtn);
  wrapper.appendChild(mic);
  wrapper.appendChild(sendBtn);
}

// Запускаем после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(_ensureAiMicBtn, 500));
} else {
  setTimeout(_ensureAiMicBtn, 500);
}
// Также при открытии панели (кнопка fab)
const _origFab = document.getElementById('ai-fab');
if (_origFab) {
  _origFab.addEventListener('click', () => setTimeout(_ensureAiMicBtn, 100));
}

})();

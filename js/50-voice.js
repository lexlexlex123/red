// ══════════════════════════════════════════════════════════════════
// 50-voice.js  —  Голосовое управление
// ══════════════════════════════════════════════════════════════════
(function(){
'use strict';

let _active = false;
let _recognition = null;
let _lastToast = null;
// Context: last action category for context-sensitive commands
let _lastCtx = null; // 'select' | 'move' | 'text' | null
let _unknownCmds = []; // log of unrecognized voice commands (legacy for export btn)
let _voiceLog = []; // full command log: {raw, normalized, status: 'ok'|'unknown'|'noise', ts}

// ── UI ─────────────────────────────────────────────────────────────
function _voiceMsg(text, type) {
  // Reuse existing toast system
  if (typeof toast === 'function') {
    toast('🎙 ' + text, type || '');
  }
}

function _showCommands() {
  const panel = document.getElementById('props-voice-panel');
  if (panel) panel.style.display = _active ? '' : 'none';
}

// ── Props panel with command list ──────────────────────────────────
function _buildPropsPanel() {
  // Find the props sidebar
  const propsScroll = document.getElementById('props-scroll');
  if (!propsScroll || document.getElementById('props-voice-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'props-voice-panel';
  panel.style.cssText = 'display:none;padding:10px 12px;';

  const en = _voiceUiLang() === 'en';
  const commands = en ? [
    ['Create', [
      'add text / add image',
      'add rectangle / circle / arrow',
    ]],
    ['Selection', [
      'select all',
      'clear slide / clear all',
      'deselect',
      'next object / previous object',
    ]],
    ['Actions', [
      'delete / copy / paste / duplicate',
      'undo / redo',
      'bring forward / send backward',
    ]],
    ['Move', [
      'up / down / left / right',
      'move up by 50',
      'center / align horizontally',
    ]],
    ['Size & rotate', [
      'width 300 / height 200',
      'rotate by 45 degrees',
    ]],
    ['Text', [
      'font size 24',
      'bold / italic',
    ]],
    ['Slides', [
      'new slide / delete slide',
      'next slide / previous slide',
      'go to slide 3',
    ]],
    ['Slideshow', [
      'start presentation',
      'start from current',
      'next / previous / stop',
    ]],
    ['Other', [
      'save / export / fullscreen',
    ]],
    ['Dictation', [
      'dictation — start voice typing',
      'stop — end dictation',
    ]],
  ] : [
    ['Создание', [
      'добавь текст / добавить текст',
      'добавь изображение',
      'добавь прямоугольник / круг / стрелку',
    ]],
    ['Выделение', [
      'выдели всё / выделить всё',
      'выдели структуру серной кислоты',
      'выдели молекулярную структуру',
      'выдели нижний элемент',
      'очисти слайд / убрать всё',
      'сними выделение',
      'следующий объект',
      'предыдущий объект',
    ]],
    ['Действия', [
      'удали / удалить',
      'удали все формулы / только формулы',
      'удали все структуры',
      'скопируй / копировать',
      'вставь / вставить',
      'дублируй / дублировать',
      'отмени / отменить',
      'повтори / повторить',
      'подними / вперёд',
      'опусти / назад',
    ]],
    ['Перемещение', [
      'вправо / вниз / влево / вверх',
      'перемести вправо / сдвинь вверх на 50',
      'выровняй по центру',
      'выровняй по горизонтали',
      'выровняй по вертикали',
    ]],
    ['Размер и поворот', [
      'ширина 300 / высота 200',
      'установи ширину 300',
      'поверни на 45 градусов',
    ]],
    ['Текст', [
      'размер шрифта 24',
      'установи шрифт 24',
      'жирный / курсив',
      'напиши формулу y = x / h2so4',
      'напиши формулу серной кислоты и её структуру',
      'нарисуй структуру серной кислоты',
      'отобразить строение / молекулярное строение …',
    ]],
    ['Слайды', [
      'создай слайд / новый слайд',
      'удали слайд',
      'дублируй слайд',
      'следующий слайд / предыдущий слайд',
      'перейди на слайд 3',
    ]],
    ['Показ', [
      'запусти показ / начать показ',
      'начни с текущего',
      'следующий / предыдущий',
      'останови / стоп',
    ]],
    ['Прочее', [
      'сохрани / сохранить',
      'экспортируй',
      'полный экран',
      'стоп / остановить — выключить голос (или показ)',
      'закончить голосовую команду',
    ]],
    ['Диктовка текста', [
      'диктовка — начать голосовой ввод в надпись',
      'стоп — завершить диктовку',
      'выбери надпись → скажи «диктовка»',
      'текст вставляется в выбранный элемент',
    ]],
  ];

  let html = '<div style="font-size:11px;font-weight:600;color:var(--text);margin-bottom:6px;">' + (en ? 'Voice commands' : 'Голосовые команды') + '</div>';
  html += '<div style="font-size:9px;color:var(--text3);line-height:1.45;margin-bottom:8px;padding:6px 8px;background:var(--surface2);border-radius:6px;border:1px solid var(--border);">'
    + (en
      ? 'Commands are parsed <b style="color:var(--text2)">in a stream</b> — speak several in a row.<br>Recognition language follows the UI (English). Offline needs an en-US language pack in Chrome/Edge.'
      : 'Команды разбираются <b style="color:var(--text2)">в потоке</b>: можно говорить подряд — сработают по мере распознавания.<br>Офлайн: в Chrome/Edge при установленном языковом пакете ru-RU; иначе нужен интернет.')
    + '</div>';
  commands.forEach(([group, cmds]) => {
    html += `<div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin:8px 0 3px;">${group}</div>`;
    cmds.forEach(cmd => {
      html += `<div style="font-size:10px;color:var(--text2);padding:2px 0;line-height:1.4;">• ${cmd}</div>`;
    });
  });

  panel.innerHTML = html;

  // Insert at top of props scroll
  propsScroll.insertBefore(panel, propsScroll.firstChild);
}

// ── Delete by type helper ────────────────────────────────────────
function _deleteByType(type) {
  const cv = document.getElementById('canvas'); if (!cv) return;
  const query = type ? `.el[data-type="${type}"]:not(.decor-el)` : '.el:not(.decor-el)';
  const els = Array.from(cv.querySelectorAll(query));
  if (!els.length) { _voiceMsg('Нет элементов для удаления'); return; }
  // Prefer currently selected, else take first (or random if multiple)
  let target = (typeof sel !== 'undefined' && sel && (!type || sel.dataset.type === type)) ? sel : els[0];
  const d = slides[cur]?.els.find(e => e.id === target.dataset.id);
  if (!d) return;
  if (typeof pushUndo === 'function') pushUndo();
  if (d.type === 'formula' && typeof window._deleteLinkedGraphs === 'function') {
    window._deleteLinkedGraphs(d.id);
  }
  slides[cur].els.splice(slides[cur].els.indexOf(d), 1);
  target.remove();
  if (typeof pick === 'function') pick(null);
  if (typeof save === 'function') save();
  if (typeof drawThumbs === 'function') drawThumbs();
  if (typeof saveState === 'function') saveState();
}

/** Выбрать формулу или хим. структуру (graphKind=chem) по названию вещества. */
function _voicePickFormulaOrStruct(kind, hint) {
  const cv = document.getElementById('canvas'); if (!cv) return;
  const chemKey = hint && typeof window._chemFindBySpokenName === 'function'
    ? window._chemFindBySpokenName(hint) : null;
  const hintL = (hint || '').toLowerCase().replace(/ё/g, 'е');

  function matchesChemData(d) {
    if (!d) return false;
    if (!hint) return true;
    if (chemKey && (d.chemKey === chemKey || d.graphLatex === chemKey || d.formulaRaw === chemKey)) return true;
    if (chemKey && d.linkedFormulaId) {
      const f = slides[cur]?.els.find(e => e.id === d.linkedFormulaId);
      if (f) {
        const raw = f.formulaRaw || '';
        if (typeof window._chemNormalize === 'function' && window._chemNormalize(raw) === chemKey) return true;
        if (raw.replace(/[{}\\_\s]/g, '').toUpperCase() === chemKey) return true;
      }
    }
    if (d.chemName && String(d.chemName).toLowerCase().replace(/ё/g, 'е').includes(hintL.slice(0, Math.min(6, hintL.length)))) return true;
    if (d.formulaRaw && hintL && d.formulaRaw.toLowerCase().includes(hintL.slice(0, 4))) return true;
    return !!(chemKey && (d.chemKey === chemKey));
  }

  let pool = [];
  if (kind === 'formula') {
    pool = Array.from(cv.querySelectorAll('.el[data-type="formula"]:not(.decor-el)'));
    if (hint) {
      const filtered = pool.filter(el => {
        const d = slides[cur]?.els.find(e => e.id === el.dataset.id);
        if (!d) return false;
        if (chemKey && typeof window._chemNormalize === 'function') {
          const n = window._chemNormalize(d.formulaRaw || '');
          if (n === chemKey) return true;
        }
        return matchesChemData(d) || (d.formulaRaw || '').toLowerCase().includes(hintL.slice(0, 4));
      });
      if (filtered.length) pool = filtered;
    }
  } else {
    pool = Array.from(cv.querySelectorAll('.el[data-type="graph"]:not(.decor-el)')).filter(el => {
      const d = slides[cur]?.els.find(e => e.id === el.dataset.id);
      return d && d.graphKind === 'chem';
    });
    if (hint) {
      const filtered = pool.filter(el => matchesChemData(slides[cur]?.els.find(e => e.id === el.dataset.id)));
      if (filtered.length) pool = filtered;
    }
  }
  if (!pool.length) {
    _voiceMsg(kind === 'formula' ? 'Формул нет' : 'Структур нет');
    return;
  }
  const idx = hasSel() && pool.includes(sel) ? pool.indexOf(sel) : -1;
  const next = pool[(idx + 1) % pool.length];
  if (typeof pick === 'function') { pick(next); _lastCtx = 'select'; }
}

// ── Dictation mode ────────────────────────────────────────────────
// Reuses the SAME _recognition object to avoid re-requesting microphone permission
let _dictMode = false;
let _dictEl = null;
let _dictText = '';

// Punct map: replace spoken punctuation words with symbols (works mid-phrase)
// Word boundary for Cyrillic: space/start/end surroundings
// Use space-padded matching — pad text with spaces, then trim result
const _PUNCT_MAP = [
  ['точка с запятой', '; '],
  ['новый абзац',     '\n\n'],
  ['новая строка',    '\n'],
  ['восклицательный знак', '! '],
  ['вопросительный знак',  '? '],
  ['кавычки открыть', ' «'],
  ['кавычки закрыть', '» '],
  ['запятая',    ', '],
  ['запятую',    ', '],
  ['точка',      '. '],
  ['точку',      '. '],
  ['восклицательный', '! '],
  ['вопросительный',  '? '],
  ['двоеточие',  ': '],
  ['многоточие', '… '],
  ['тире',       ' — '],
  ['дефис',      '-'],
  ['абзац',      '\n\n'],
  ['перенос',    '\n'],
];
function _dictApplyPunct(text) {
  // Split into tokens preserving original case, replace punct words
  const tokens = text.split(/\s+/);
  const result = [];
  let i = 0;
  while (i < tokens.length) {
    // Try matching multi-word phrases first
    let matched = false;
    for (const [word, sym] of _PUNCT_MAP) {
      const words = word.split(' ');
      if (words.length > 1) {
        const slice = tokens.slice(i, i + words.length).join(' ').toLowerCase();
        if (slice === word) {
          // Remove trailing space from last token in result if sym starts with punct
          if (result.length && /^[,\.!?:;…]/.test(sym)) {
            result[result.length-1] = result[result.length-1].trimEnd();
          }
          result.push(sym.trim());
          i += words.length;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      const lower = tokens[i].toLowerCase();
      let found = false;
      for (const [word, sym] of _PUNCT_MAP) {
        if (!word.includes(' ') && lower === word) {
          if (result.length && /^[,\.!?:;…]/.test(sym)) {
            result[result.length-1] = result[result.length-1].trimEnd();
          }
          result.push(sym.trim());
          found = true;
          break;
        }
      }
      if (!found) result.push(tokens[i]);
    }
    i++;
  }
  return result.join(' ').replace(/  +/g, ' ').replace(/ ([,\.!?:;…»])/g,'$1').replace(/«\s+/g,'«').trim();
}

function _startDictation(targetEl) {
  if (!_recognition) { _voiceMsg('Сначала включите голосовое управление'); return; }
  _dictMode = true;
  _dictEl = targetEl;
  _dictText = '';
  const btn = document.getElementById('voice-tab-btn');
  if (btn) btn.style.outline = '2px solid #f59e0b';
  _voiceMsg('🎤 Диктовка. Говорите... «стоп» для завершения', 'ok');
}

function _stopDictation() {
  if (!_dictMode) return;
  _dictMode = false;
  const btn = document.getElementById('voice-tab-btn');
  if (btn) btn.style.outline = '';
  if (typeof save === 'function') save();
  if (typeof drawThumbs === 'function') drawThumbs();
  if (typeof saveState === 'function') saveState();
  _voiceMsg('✅ Диктовка завершена', 'ok');
  _dictEl = null;
  _dictText = '';
}

window.stopDictation = _stopDictation;


// ── Apply action to all selected elements ──────────────────────────
function _forEachSel(fn) {
  if (!hasSel()) return;
  const targets = multiSel.size > 1 ? [...multiSel] : [sel];
  if (typeof pushUndo === 'function') pushUndo();
  targets.forEach(elT => {
    const d = slides[cur]?.els.find(e => e.id === elT.dataset.id);
    if (d) fn(elT, d);
  });
  if (typeof save === 'function') save();
  if (typeof drawThumbs === 'function') drawThumbs();
  if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
}

// ── Command handler ─────────────────────────────────────────────────
// Normalizes speech input: strips filler words, maps imperative forms
let _lastNormHit = false; // true if _normalize matched a known command pattern

function _voiceUiLang() {
  return (typeof getLang === 'function' && getLang() === 'en') ? 'en' : 'ru';
}
function _voiceSpeechLang() {
  return _voiceUiLang() === 'en' ? 'en-US' : 'ru-RU';
}

// English phrases → same canonical tokens as Russian handler expects
const _EN_VOICE_MAP = [
  [/^(start|begin|show)\s+(presentation|slideshow|slide\s*show)(\s+from\s+start)?$/, 'начать показ'],
  [/^(start|begin)\s+(from\s+)?(current|this)(\s+slide)?$/, 'начать с текущего'],
  [/^(stop|exit|close|end)(\s+(presentation|slideshow|preview))?$/, 'стоп'],
  [/^(turn\s+off|disable|stop)\s+(voice|microphone|mic|voice\s+control)$/, 'голос выкл'],
  [/^(end|finish|stop)\s+(voice|voice\s+command|listening)$/, 'голос выкл'],
  [/^(next|forward|continue)$/, 'следующий'],
  [/^(previous|back|go\s+back)$/, 'предыдущий'],
  [/^(new|add|create|insert)\s+slide$/, 'новый слайд'],
  [/^(delete|remove)\s+(this\s+)?slide$/, 'удалить слайд'],
  [/^(delete|remove)\s+all(\s+(elements|objects|items))?$/, 'удалить всё'],
  [/^(clear|clear\s+(the\s+)?(slide|all)|clear\s+slide)$/, 'удалить всё'],
  [/^(duplicate|copy)\s+slide$/, 'дублировать слайд'],
  [/^(next)\s+slide$/, 'следующий слайд'],
  [/^(previous|prev)\s+slide$/, 'предыдущий слайд'],
  [/^(go\s+to|open|switch\s+to)\s+slide\s+(\d+)$/, (m) => 'перейти на слайд ' + m[2]],
  [/^(undo|cancel)$/, 'отменить'],
  [/^(undo)\s+(\d+)$/, (m) => 'отменить ' + m[2]],
  [/^(redo)$/, 'повторить'],
  [/^(select\s+all|select\s+everything)$/, 'выделить всё'],
  [/^(deselect|clear\s+selection|unselect)$/, 'снять выделение'],
  [/^(next)\s+(object|element|item)$/, 'следующий объект'],
  [/^(previous|prev)\s+(object|element|item)$/, 'предыдущий объект'],
  [/^(delete|remove)(\s+(it|this|selection|selected))?$/, 'удалить'],
  [/^(copy)$/, 'копировать'],
  [/^(paste)$/, 'вставить'],
  [/^(duplicate)(\s+(object|element|it))?$/, 'дублировать'],
  [/^(group)(\s+(objects|elements|selection))?$/, 'сгруппировать'],
  [/^(ungroup)(\s+(objects|elements|group))?$/, 'разгруппировать'],
  [/^(bring\s+forward|bring\s+to\s+front|forward)$/, 'вперёд'],
  [/^(send\s+backward|send\s+to\s+back|backward)$/, 'назад'],
  [/^(add|insert|create)\s+(text|textbox|label|caption)$/, 'добавить текст'],
  [/^(add|insert)\s+(image|picture|photo)$/, 'добавить изображение'],
  [/^(add|insert|draw)\s+(rectangle|square)$/, 'добавить прямоугольник'],
  [/^(add|insert|draw)\s+(circle|ellipse|oval)$/, 'добавить круг'],
  [/^(add|insert|draw)\s+(triangle)$/, 'добавить треугольник'],
  [/^(add|insert|draw)\s+(star)$/, 'добавить звезду'],
  [/^(add|insert|draw)\s+(arrow)$/, 'добавить стрелку'],
  [/^(add|insert)\s+(icon)$/, 'добавить иконку'],
  [/^(add|insert|draw)\s+(shape)$/, 'добавить фигуру'],
  [/^(select)\s+(text|textbox|label)$/, 'выбрать текст'],
  [/^(select)\s+(shape)$/, 'выбрать фигуру'],
  [/^(select)\s+(image|picture|icon)$/, 'выбрать изображение'],
  [/^(move\s+)?(up)(\s+by\s+(\d+))?$/, (m) => 'вверх на ' + (m[4] || 'obj')],
  [/^(move\s+)?(down)(\s+by\s+(\d+))?$/, (m) => 'вниз на ' + (m[4] || 'obj')],
  [/^(move\s+)?(left)(\s+by\s+(\d+))?$/, (m) => 'влево на ' + (m[4] || 'obj')],
  [/^(move\s+)?(right)(\s+by\s+(\d+))?$/, (m) => 'вправо на ' + (m[4] || 'obj')],
  [/^(center|align\s+center|align\s+to\s+center)$/, 'по центру'],
  [/^(align\s+horizontal(ly)?|center\s+horizontal(ly)?)$/, 'по горизонтали'],
  [/^(align\s+vertical(ly)?|center\s+vertical(ly)?)$/, 'по вертикали'],
  [/^(width)\s+(\d+)$/, (m) => 'ширина ' + m[2]],
  [/^(height)\s+(\d+)$/, (m) => 'высота ' + m[2]],
  [/^(set\s+)?(width)\s+(to\s+)?(\d+)$/, (m) => 'ширина ' + m[4]],
  [/^(set\s+)?(height)\s+(to\s+)?(\d+)$/, (m) => 'высота ' + m[4]],
  [/^(rotate)\s+(by\s+)?(\d+)(\s+degrees?)?$/, (m) => 'повернуть на ' + m[3]],
  [/^(font\s+size|set\s+font)\s+(\d+)$/, (m) => 'размер шрифта ' + m[2]],
  [/^(bold)$/, 'жирный'],
  [/^(italic)$/, 'курсив'],
  [/^(save)$/, 'сохранить'],
  [/^(export)$/, 'экспортируй'],
  [/^(fullscreen|full\s+screen)$/, 'полный экран'],
  [/^(dictation|start\s+dictation|dictate|voice\s+input)$/, 'начать диктовку'],
  [/^(stop\s+dictation|end\s+dictation)$/, 'остановить диктовку'],
  [/^(write|add|create|insert)\s+(a\s+)?formula\s+(.+)$/, (m) => 'создать формулу ' + m[3]],
  [/^(formula)\s+(.+)$/, (m) => 'создать формулу ' + m[2]],
  [/^(auto\s*layout|arrange\s+objects|auto\s+place)$/, 'разместить объекты'],
];

function _matchVoiceMap(t, map) {
  for (const [re, val] of map) {
    const m = t.match(re);
    if (m) return typeof val === 'function' ? val(m) : val;
  }
  return null;
}

/** Расстояние Левенштейна (для опечаток ASR). */
function _voiceLev(a, b) {
  a = String(a || ''); b = String(b || '');
  const n = a.length, m = b.length;
  if (!n) return m; if (!m) return n;
  const dp = new Array(m + 1);
  for (let j = 0; j <= m; j++) dp[j] = j;
  for (let i = 1; i <= n; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= m; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[m];
}

/** Поправить слова команды при близком совпадении с известным глаголом (переместив → перемести, перести → перемести). */
function _voiceFuzzyFix(t) {
  const verbs = [
    'перемести', 'переместить', 'сдвинь', 'сдвинуть', 'двигай', 'смести', 'передвинь', 'подвинь',
    'добавь', 'добавить', 'удали', 'удалить', 'убери', 'убрать', 'очисти', 'очистить',
    'напиши', 'нарисуй', 'нарисуем', 'выдели', 'выделить', 'выделим', 'выбери', 'выбрать',
    'создай', 'создать', 'построй', 'показать', 'покажи', 'отобрази', 'отобразить',
    'останови', 'остановить', 'закончи', 'закончить', 'дублируй', 'сохрани', 'запусти', 'начать',
  ];
  // Короткие слова-паразиты — не раздувать (пока ≠ покажи)
  const noFuzzy = new Set(['пока', 'так', 'ага', 'угу', 'это', 'там', 'тут', 'ну', 'да', 'нет', 'ой', 'эх', 'го', 'пре', 'кра']);
  // Стебли: если слово начинается так же (или наоборот) — считаем совпадением
  const stems = [
    ['перемест', 'перемести'],
    ['сдвин', 'сдвинь'],
    ['передвин', 'передвинь'],
    ['нарису', 'нарисуй'],
    ['отобраз', 'отобразить'],
    ['перенес', 'перенеси'],
    ['выдел', 'выдели'],
  ];
  const parts = t.split(/\s+/);
  for (let i = 0; i < parts.length; i++) {
    const w = parts[i];
    if (!w || w.length < 4) continue;
    if (noFuzzy.has(w) || verbs.includes(w)) continue;
    // показ / показы / показа — не трогать (иначе → покажи)
    if (/^показ/.test(w) && w !== 'показать' && w !== 'покажи') continue;
    let stemHit = null;
    for (const [stem, canon] of stems) {
      if (w.startsWith(stem) || canon.startsWith(w)) { stemHit = canon; break; }
      if (_voiceLev(w, stem) <= 2 || _voiceLev(w, canon) <= 2) { stemHit = canon; break; }
    }
    if (stemHit) { parts[i] = stemHit; continue; }
    let best = null, bestD = 99;
    for (const v of verbs) {
      const d = _voiceLev(w, v);
      const maxD = v.length <= 6 ? 2 : 3;
      // Не раздувать короткие слова до длинных глаголов
      if (w.length < 5 && v.length > w.length + 1) continue;
      if (d > 0 && d <= maxD && (d < bestD || (d === bestD && v.length < (best || '').length))) {
        bestD = d; best = v;
      }
    }
    if (best) parts[i] = best;
  }
  return parts.join(' ');
}

/** Убрать слова-паразиты и обрезки ASR в начале фразы (так / кра / го / пре…). */
function _voiceStripFillers(t) {
  let prev;
  do {
    prev = t;
    t = t.replace(/^(так|ага|угу|ну|ладно|отлично|хорошо|давай|да|ой|эх|кра|го|пре|ну)\s+/i, '');
  } while (t !== prev && t);
  if (!t || /^(так\s*)+$/i.test(t)) return '';
  return t.trim();
}

function _voiceIsNoise(t) {
  if (!t || t.length < 2) return true;
  if (/^(так|ага|угу|ну|ладно|отлично|хорошо|давай|ой|эх|пока|молекулярный|молекулярная|молекулярное)(\s+(так|ага|отлично|хорошо))*$/i.test(t)) return true;
  if (/^(так\s+)+$/i.test(t)) return true;
  return false;
}

/** Словесные числа → цифры («на двадцать пикселей» → «на 20 пикселей»). */
const _VOICE_NUM_ONES = {
  ноль: 0, один: 1, одна: 1, одно: 1, два: 2, две: 2, три: 3, четыре: 4,
  пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9,
};
const _VOICE_NUM_TEENS = {
  десять: 10, одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14,
  пятнадцать: 15, шестнадцать: 16, семнадцать: 17, восемнадцать: 18, девятнадцать: 19,
};
const _VOICE_NUM_TENS = {
  двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50, шестьдесят: 60,
  семьдесят: 70, восемьдесят: 80, девяносто: 90,
};
const _VOICE_NUM_HUNDREDS = {
  сто: 100, двести: 200, триста: 300, четыреста: 400, пятьсот: 500,
  шестьсот: 600, семьсот: 700, восемьсот: 800, девятьсот: 900,
};

function _voiceParseNumWords(words) {
  let n = 0, i = 0, got = false;
  while (i < words.length) {
    const w = words[i];
    if (_VOICE_NUM_HUNDREDS[w] != null) { n += _VOICE_NUM_HUNDREDS[w]; got = true; i++; continue; }
    if (_VOICE_NUM_TEENS[w] != null) { n += _VOICE_NUM_TEENS[w]; got = true; i++; break; }
    if (_VOICE_NUM_TENS[w] != null) {
      n += _VOICE_NUM_TENS[w]; got = true; i++;
      if (i < words.length && _VOICE_NUM_ONES[words[i]] != null) { n += _VOICE_NUM_ONES[words[i]]; i++; }
      break;
    }
    if (_VOICE_NUM_ONES[w] != null) { n += _VOICE_NUM_ONES[w]; got = true; i++; break; }
    break;
  }
  return got ? { value: n, consumed: i } : null;
}

function _voiceWordsToDigits(t) {
  const parts = t.split(/\s+/);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const parsed = _voiceParseNumWords(parts.slice(i));
    if (parsed) {
      out.push(String(parsed.value));
      i += parsed.consumed - 1;
    } else {
      out.push(parts[i]);
    }
  }
  return out.join(' ');
}

function _normalize(raw) {
  _lastNormHit = false;
  let t = raw.toLowerCase().trim();
  // Remove common filler prefixes (RU + EN)
  t = t.replace(/^(пожалуйста|команда|скажи|выполни|сделай|введи|please|command|ok)\s+/, '');
  t = _voiceStripFillers(t);
  if (!t || _voiceIsNoise(t)) { _lastNormHit = false; return ''; }
  t = _voiceFuzzyFix(t);
  t = _voiceWordsToDigits(t);
  // единицы измерения после числа не мешают матчам (\b не работает с кириллицей)
  t = t.replace(/(\d+)\s*(пикселей|пикселя|пиксель|px|пкс)(?=\s|$)/g, '$1');
  const preferEn = _voiceUiLang() === 'en';

  if (preferEn) {
    const enHit = _matchVoiceMap(t, _EN_VOICE_MAP);
    if (enHit != null) { _lastNormHit = true; return enHit; }
  }

  // Imperative → canonical form mapping
  const map = [
    // Показ
    [/^(запусти|начни|покажи|показать|запустить|начать)\s+(показ[аыу]?|презентацию)\s*(с начала)?$/, 'начать показ'],
    [/^(запусти|начни|покажи|показать|запустить|начать)\s+(показ|презентацию|слайд|слайды)$/, 'начать показ'],
    [/^(покажи|показать)\s+(слайд|слайды|презентацию|показ)$/, 'начать показ'],
    [/^(запусти|начни|покажи|запустить|начать)\s+(с текущего|с этого)/, 'начать с текущего'],
    [/^(останови|выключи|отключи|остановить|выключить|отключить)\s+(голосовое|голосовое управление|микрофон|голос)$/, 'голос выкл'],
    [/^(закончи|закончить|заверши|завершить)\s+голосовую\s+команду$/, 'голос выкл'],
    [/^(закончи|закончить|заверши|завершить)\s+голосовое(\s+управление)?$/, 'голос выкл'],
    [/^(закончи|закончить|заверши|завершить)\s+(голос|управление|команду)$/, 'голос выкл'],
    [/^(голос\s+выкл|хватит|выключись)$/, 'голос выкл'],
    [/^(останови|остановить|закрой|закрыть|выйди|выйти|стоп|стопе)$/, 'стоп'],
    [/^(следующий|следующую|следующее|вперёд|вперед|дальше|далее)$/, 'следующий'],
    [/^(предыдущий|назад|обратно)$/, 'предыдущий'],
    // Слайды
    [/^(создай|добавь|вставь|сделай|новый)\s+(слайд)$/, 'новый слайд'],
    [/^(удали|убери|удалить)\s+(слайд|этот слайд)$/, 'удалить слайд'],
    [/^(удали|убери|убрать|удалить|стереть?)\s+(всё?|все|всё|все элементы|все объекты|всё на слайде)(\s+(со\s+)?слайда)?$/, 'удалить всё'],
    [/^(очисти|очистить)(\s+(слайд|этот слайд|всё|все|всё на слайде|все объекты|все элементы))?$/, 'удалить всё'],
    [/^(очисти|очистить)\s+(содержимое\s+)?слайда$/, 'удалить всё'],
    [/^(удали|убери|удалить)\s+(все\s+)?(надписи|тексты|текстовые блоки)$/, 'удалить все тексты'],
    [/^(удали|убери|удалить)\s+(все\s+)?(фигуры?)$/, 'удалить все фигуры'],
    [/^(удали|убери|удалить)\s+(все\s+)?(изображения?|картинки?)$/, 'удалить все изображения'],
    [/^(удали|убери|удалить)\s+(все\s+)?(иконки?|значки?)$/, 'удалить все иконки'],
    // Формулы / структуры (порядок слов и «только» от ASR)
    [/^(удали|убери|удалить)\s+(только\s+)?(все\s+)?(формулы?|форму)$/, 'удалить все формулы'],
    [/^(только\s+)?(удали|убери|удалить)\s+(только\s+)?(все\s+)?(формулы?)$/, 'удалить все формулы'],
    [/^(формулы?|форму)\s+(удали|убери|удалить)\s+(все\s+)?(формулы?)?$/, 'удалить все формулы'],
    [/^(только\s+)*(формулы?)\s+(только\s+)*(удали|убери|удалить)(\s+(только\s+)?(все\s+)?формулы?)?$/, 'удалить все формулы'],
    [/^(удали|убери|удалить)\s+(только\s+)?(все\s+)?(структуры?|строения?|молекулярные\s+структуры?)$/, 'удалить все структуры'],
    [/^(убери|удали|удалить)\s+(все\s+)?(графики?)$/, 'удалить все графики'],
    [/^(дублируй|скопируй|дублировать)\s+(слайд)$/, 'дублировать слайд'],
    [/^(продублируй|дублируй|скопируй)\s+(слайд\s+)?(\d+|первый|второй|третий|последний)$/, (m) => 'дублировать слайд ' + m[3]],
    [/^(дублируй|продублируй)\s+(первый|1)\s+слайд$/, 'дублировать слайд первый'],
    [/^(дублируй|продублируй)\s+(последний)\s+слайд$/, 'дублировать слайд последний'],
    [/^(дублируй|продублируй)\s+(текущий)\s+слайд$/, 'дублировать слайд'],
    [/^(следующий|вперёд|вперед)\s+слайд$/, 'следующий слайд'],
    [/^(предыдущий|предыдущий|назад)\s+слайд$/, 'предыдущий слайд'],
    [/^(перейди|открой|иди|переключи|переключись|перейти|переключить)\s+(на\s+)?(слайд\s+)?(\d+)$/, (m) => 'перейти на слайд '+m[4]],
    [/^(перейди|открой|переключи|переключись|перейти|переключить)\s+(на\s+)?(первый|второй|третий|четвёртый|пятый|шестой|седьмой|восьмой|девятый|десятый|последний)\s*(слайд)?$/, (m) => 'перейти на слайд '+m[3]],
    // Отмена
    [/^(отмени|отменить|откати|убери последнее|отменяй|отмена)$/, 'отменить'],
    [/^(отмени|отменить|отмена)\s+(\d+)\s*(раза?|раз|действия?)?$/, (m) => 'отменить ' + m[2]],
    [/^(отмени|отменить|отмена)\s+(дважды|два раза|2 раза)$/, 'отменить 2'],
    [/^(отмени|отменить|отмена)\s+(трижды|три раза|3 раза)$/, 'отменить 3'],
    [/^(повтори|повторить|верни|вернуть)$/, 'повторить'],
    // Выделение
    [/^(выдели|выделить|выделим|выбери|выбрать|выбор)\s+(всё?|все|всё|все элементы|все объекты)$/, 'выделить всё'],
    [/^(выдели|выделить|выделим|выбери|выбрать)\s+(структуру|строение|молекулярную\s+структуру|молекулярное\s+строение|хим\.?\s*структуру)(\s+(.+))?$/, (m) => {
      const name = (m[4] || '').trim();
      return name ? 'выбрать структуру ' + name : 'выбрать структуру';
    }],
    [/^(выдели|выделить|выделим|выбери|выбрать)\s+формулу(\s+(.+))?$/, (m) => {
      const name = (m[3] || '').trim();
      return name ? 'выбрать формулу ' + name : 'выбрать формулу';
    }],
    [/^(выдели|выделить|выделим|выбери|выбрать)\s+нижн(ий|юю|ее|его)\s*(элемент|объект|надпись|текст)?$/, 'выбрать нижний'],
    [/^(выдели|выделить|выделим|выбери|выбрать)\s+верхн(ий|юю|ее|его)\s*(элемент|объект|надпись|текст)?$/, 'выбрать верхний'],
    [/^(выдели|выделить|выделим|выбери|выбрать)\s+(левый|правый)\s*(элемент|объект)?$/, (m) => 'выбрать ' + m[2]],
    [/^(выбери|выбрать|выделить?|выдели|найди)\s+(надпись|текст|заголовок|подзаголовок|надпись снизу|текстовый блок|текстовый объект)(.*)$/, (m) => 'выбрать текст '+m[3].trim()],
    [/^(выбери|выбрать|выделить?|выдели)\s+(следующий)\s*(объект|элемент|надпись|текст)?$/, 'следующий объект'],
    [/^(выбери|выбрать|выделить?|выдели)\s+(предыдущий)\s*(объект|элемент|надпись|текст)?$/, 'предыдущий объект'],
    [/^(выбери|выбрать|выделить?|выдели|выбор)\s+(объект|элемент|какой-нибудь|любой)$/, 'следующий объект'],
    [/^выбрать\s+(объект|элемент)$/, 'следующий объект'],
    [/^выбор\s+(объекта|элемента)$/, 'следующий объект'],
    [/^(сними|убери|снять)\s+(выделение)$/, 'снять выделение'],
    [/^выделение$/, 'следующий объект'],
    [/^выдели$/, 'следующий объект'],
    [/^(выбери|выбрать|выдели|выделить?)\s+всё?$/, 'выделить всё'],
    [/^все\s*(элементы|объекты)?$/, 'выделить всё'],
    [/^выбрать\s+всё?$/, 'выделить всё'],
    [/^(следующий|выдели следующий)\s+объект$/, 'следующий объект'],
    [/^(предыдущий)\s+объект$/, 'предыдущий объект'],
    // Удаление объекта
    [/^(удали|убери|стереть|удалить)$/, 'удалить'],
    [/^(удали|убери|удалить)\s+(его|её|это|выделенное|выбранное|выбранный|выделенный|выделенную|выбранную)$/, 'удалить'],
    [/^(удали|убери|удалить)\s+(этот\s+)?(объект|элемент)$/, 'удалить'],
    [/^(удали|убери|удалить)\s+(эту\s+|эту )?(фигуру?)$/, 'удалить тип shape'],
    [/^(удали|убери|удалить)\s+(этот\s+|этот )?(текст|надпись)$/, 'удалить тип text'],
    [/^(удали|убери|удалить)\s+(это\s+|это )?(изображение|картинку?)$/, 'удалить тип image'],
    [/^(удали|убери|удалить)\s+(эту\s+|эту )?(иконку?|значок)$/, 'удалить тип svg'],
    // Копировать/вставить
    [/^(скопируй|копируй|копировать)$/, 'копировать'],
    [/^(продублируй|дублировать|создай копию|дубликат|копи[яи])\s*(объекта?|элемента?|выделенного|фигуры?|значка?|иконки?|надписи?)?$/, 'дублировать'],
    [/^(продублируй|дублировать)\s+(объекты?|элементы?)\s+(и\s+)?(сдвин|перемести)\w*\s+вправо$/, 'дублировать и сдвинуть вправо'],
    [/^(продублируй|дублировать)\s+(объекты?|элементы?)\s+(и\s+)?(сдвин|перемести)\w*\s+вниз$/, 'дублировать и сдвинуть вниз'],
    [/^(продублируй|дублировать)\s+(объекты?|элементы?)\s+(и\s+)?(сдвин|перемести)\w*\s+влево$/, 'дублировать и сдвинуть влево'],
    [/^(продублируй|дублировать)\s+(объекты?|элементы?)\s+(и\s+)?(сдвин|перемести)\w*\s+вверх$/, 'дублировать и сдвинуть вверх'],

    [/^(сгруппируй|сгруппировать|объедини|объединить|группируй)\s*(объекты|элементы|выбранные|всё)?$/, 'сгруппировать'],
    [/^(разгруппируй|разгруппировать|разбей|разбить)\s*(группу|объекты|элементы)?$/, 'разгруппировать'],
    [/^(удали|убери|удалить)\s+(слайд\s+)?(\d+|первый|второй|третий|четвёртый|пятый|последний)\s*(слайд)?$/, (m) => 'удалить слайд ' + (m[3]||m[4]||'')],
    [/^(вставь|вставить|паста)$/, 'вставить'],
    [/^(дублируй|дублировать)$/, 'дублировать'],
    // Порядок слоёв
    [/^(подними|поднять|вперёд|на передний план)$/, 'вперёд'],
    [/^(опусти|опустить|на задний|назад|на задний план)$/, 'назад'],
    // Добавление объектов
    [/^(добавь|вставь|создай|нарисуй)\s+(текст|надпись)$/, 'добавить текст'],
    [/^(добавь|вставь|вставить)\s+(изображение|картинку|фото)$/, 'добавить изображение'],
    [/^(добавь|нарисуй|вставь)\s+(прямоугольник|квадрат|прямоугольную\s+фигуру)$/, 'добавить прямоугольник'],
    [/^(добавь|нарисуй|вставь)\s+(треугольник)$/, 'добавить треугольник'],
    [/^(добавь|нарисуй|вставь)\s+(звезду?|звёздочку?)$/, 'добавить звезду'],
    [/^(добавь|нарисуй|вставь)\s+(ромб)$/, 'добавить ромб'],
    [/^(добавь|нарисуй|вставь)\s+(сердце|сердечко)$/, 'добавить сердце'],
    [/^(добавь|нарисуй|вставь)\s+(облако)$/, 'добавить облако'],
    [/^(добавь|нарисуй|вставь)\s+(крест)$/, 'добавить крест'],
    [/^(добавь|нарисуй|вставь)\s+(шестиугольник|гексагон)$/, 'добавить шестиугольник'],
    [/^(добавь|нарисуй|вставь)\s+(круг|овал|эллипс)$/, 'добавить круг'],
    [/^(добавь|нарисуй|вставь)\s+(стрелку|стрелка)$/, 'добавить стрелку'],
    [/^(добавь|вставь|нарисуй)\s+(фигуру?|форму?)$/, 'добавить фигуру'],
    [/^(выбери|выбрать|выделить?|выдели)\s+(фигуру?|форму?|следующую\s+фигуру?)$/, 'выбрать фигуру'],
    [/^(выбери|выбрать)\s+(квадрат[а-я]?|прямоугольник[а-я]?|круг[а-я]?|звезд[а-я]+|треугольник[а-я]?|ромб[а-я]?|стрелк[а-я]+)$/, 'выбрать фигуру'],
    [/^(выбери|выбрать|выделить?|выдели)\s+(текст|надпись|заголовок)$/, 'выбрать текст'],
    [/^(выбери|выбрать|выделить?|выдели)\s+(иконку?|значок|картинку?|изображение)$/, 'выбрать изображение'],
    [/^(добавь|вставь|выбери)\s+(иконку?|значок|пиктограмму?)$/, 'добавить иконку'],
    // Перемещение (ASR: переместив / переместим / перести…)
    [/^(двигай|перемест[а-яё]*|передвинь|подвинь|двигаться|сдвин[а-яё]*|смести|сместить?|перенес[а-яё]*)\s+вверх\s*(на\s*(\d+))?/, (m) => 'вверх на '+(m[3]||'obj')],
    [/^(смести|снести|снеси|перемест[а-яё]*|передвинь|подвинь)\s+вверх$/, () => 'вверх на obj'],
    [/^(двигай|перемест[а-яё]*|передвинь|подвинь|двигаться|сдвин[а-яё]*|смести|сместить?|перенес[а-яё]*)\s+вниз\s*(на\s*(\d+))?/, (m) => 'вниз на '+(m[3]||'obj')],
    [/^(двигай|перемест[а-яё]*|передвинь|подвинь|двигаться|сдвин[а-яё]*|смести|сместить?|перенес[а-яё]*)\s+влево\s*(на\s*(\d+))?/, (m) => 'влево на '+(m[3]||'obj')],
    [/^(двигай|перемест[а-яё]*|передвинь|подвинь|двигаться|сдвин[а-яё]*|смести|сместить?|перенес[а-яё]*)\s+вправо\s*(на\s*(\d+))?/, (m) => 'вправо на '+(m[3]||'obj')],
    [/^(другой|другое|ещё один|следующий элемент|следующий объект|другой объект|другой элемент)$/, 'следующий'],
    [/^(смести|снести|снеси|перемест[а-яё]*)\s+вниз$/, () => 'вниз на obj'],
    [/^смести\s+вверх$/, () => 'вверх на obj'],
    [/^(смести|снести|снеси|перемест[а-яё]*)\s+влево$/, () => 'влево на obj'],
    [/^(смести|снести|снеси|перемест[а-яё]*)\s+вправо$/, () => 'вправо на obj'],
    // Короткие направления (опционально «на N» — единицы уже сняты в _normalize)
    [/^(вверх|наверх)(\s+на\s+(\d+))?$/, (m) => 'вверх на ' + (m[3] || 'obj')],
    [/^(вниз)(\s+на\s+(\d+))?$/, (m) => 'вниз на ' + (m[3] || 'obj')],
    [/^(влево)(\s+на\s+(\d+))?$/, (m) => 'влево на ' + (m[3] || 'obj')],
    [/^(вправо)(\s+на\s+(\d+))?$/, (m) => 'вправо на ' + (m[3] || 'obj')],
    // Центрирование
    // Позиционирование объекта на слайде
    [/^(выровняй|выровнять|центрируй|центрировать|поставь|поставить|размести|разместить|расположи|расположить|помести|поместить|перемести|переместить)\s+(по центру|в центр(е)?|по середин[еы]|посередине)$/, 'по центру'],
    [/^(размести|разместить|расположи|перемести|переместить|выровняй|выровнять|центрируй|поставь)\s+(по центру|в центр)\s+(горизонтали|горизонтально|по горизонтали)$/, 'по горизонтали'],
    [/^(размести|разместить|расположи|перемести|переместить|выровняй|выровнять|центрируй|поставь)\s+(по центру|в центр)\s+(вертикали|вертикально|по вертикали)$/, 'по вертикали'],
    [/^(выровняй|выровнять|центрируй|центрировать|размести|разместить|перемести|переместить)\s+по горизонтали$/, 'по горизонтали'],
    [/^(выровняй|выровнять|центрируй|центрировать|размести|разместить|перемести|переместить)\s+по вертикали$/, 'по вертикали'],
    // Короткие формы без глагола
    [/^по\s+центру\s+(горизонтали|горизонтально)$/, 'по горизонтали'],
    [/^по\s+центру\s+(вертикали|вертикально)$/, 'по вертикали'],
    [/^по\s+горизонтали$/, 'по горизонтали'],
    [/^по\s+вертикали$/, 'по вертикали'],
    [/^по\s+центру$/, 'по центру'],
    [/^(прижми|прижать|сдвинь|перемести|размести)\s+(к левому краю|влево к краю|к левому)$/, 'к левому краю'],
    [/^(прижми|прижать|сдвинь|перемести|размести)\s+(к правому краю|вправо к краю|к правому)$/, 'к правому краю'],
    [/^(прижми|прижать|сдвинь|перемести|размести)\s+(к верхнему краю|наверх|к верху|к верхнему)$/, 'к верхнему краю'],
    [/^(прижми|прижать|сдвинь|перемести|размести)\s+(к нижнему краю|вниз к краю|к нижнему)$/, 'к нижнему краю'],
    [/^(разместить|размести)\s+(объекты|всё|элементы)?$/, 'разместить объекты'],
    [/^(авторазмещение|авто\s+размести)$/, 'разместить объекты'],
    // Размер
    [/^(установи|задай|сделай)\s+ширину?\s+(\d+)$/, (m) => 'ширина '+m[2]],
    [/^(размер|сделай размер)\s+(\d+)\s+(на|х|x)\s+(\d+)$/, (m) => 'размер '+m[2]+' на '+m[4]],
    [/^(установи|задай|сделай)\s+высоту?\s+(\d+)$/, (m) => 'высота '+m[2]],
    [/^(поверни|повернуть)\s+(на\s+)?(\d+)(\s+градусов?)?$/, (m) => 'повернуть на '+m[3]],
    // Текст
    [/^(установи|сделай|задай)\s+(размер\s+шрифта|шрифт)\s+(\d+)$/, (m) => 'размер шрифта '+m[3]],
    [/^(увеличь|увеличи)\s+(текст|шрифт|размер\s+текста|размер\s+шрифта)$/, () => 'шрифт больше'],
    [/^(увеличь|увеличи)\s+(размер|объект|фигуру?)\s*(в\s+два\s+раза|вдвое)?$/, (m) => m[3] ? 'размер * 2' : 'размер + 50%'],
    [/^(уменьши|уменьшить?)\s+(размер|объект|фигуру?)\s*(в\s+два\s+раза|вдвое)?$/, (m) => m[3] ? 'размер * 0.5' : 'размер - 50%'],
    [/^(увеличь|увеличи)\s+(размер|объект)\s+на\s+(\d+)\s*(пикселей|пикселя|px|пкс)?$/, (m) => 'размер + ' + m[3] + 'px'],
    [/^(уменьши)\s+(размер|объект)\s+на\s+(\d+)\s*(пикселей|пикселя|px|пкс)?$/, (m) => 'размер - ' + m[3] + 'px'],
    [/^(увеличь|увеличи)\s+(размер|объект)\s+на\s+(\d+)\s*(%|процентов|процента)?$/, (m) => 'размер + ' + m[3] + '%'],
    [/^(уменьши)\s+(размер|объект)\s+на\s+(\d+)\s*(%|процентов|процента)?$/, (m) => 'размер - ' + m[3] + '%'],
    [/^(уменьши|уменьшить?)\s+(текст|шрифт|размер\s+текста|размер\s+шрифта)$/, () => 'шрифт меньше'],
    [/^(увеличь|увеличи)\s+(текст|шрифт)\s+(на\s+)?(\d+)$/, (m) => 'шрифт +'+m[4]],
    [/^(уменьши)\s+(текст|шрифт)\s+(на\s+)?(\d+)$/, (m) => 'шрифт -'+m[4]],
    // Выравнивание текста
    [/^(выровняй|выровнять|выравни|выравнивай)\s+(текст\s+)?(по центру|в центр)\s*(вертикали|по вертикали)?$/, (m) => m[4] ? 'текст вертикаль центр' : 'текст центр оба'],
    [/^(выровняй|выровнять|выравни)\s+(текст\s+)?по центру\s+горизонтали$/, 'текст горизонталь центр'],
    [/^(выровняй|выровнять|выравни)\s+(текст\s+)?по (левому краю|левому|лево)$/, 'текст горизонталь лево'],
    [/^(выровняй|выровнять|выравни)\s+(текст\s+)?по (правому краю|правому|право)$/, 'текст горизонталь право'],
    [/^(выровняй|выровнять|выравни)\s+(текст\s+)?по (верху|верхнему краю|сверху)$/, 'текст вертикаль верх'],
    [/^(выровняй|выровнять|выравни)\s+(текст\s+)?по (низу|нижнему краю|снизу)$/, 'текст вертикаль низ'],
    [/^(выровняй|выровнять|выравни)\s+(текст\s+)?по вертикали\s*(по центру|в центр)?$/, 'текст вертикаль центр'],
    [/^(жирный|полужирный|сделай жирным|жирным)$/, 'жирный'],
    [/^(курсив|сделай курсивом|курсивом)$/, 'курсив'],
    // Прочее
    [/^(поменяй|поменять|измени|изменить|смени|сменить|применить?)\s+(тему|оформление)$/, 'тема случайная'],
    [/^(поменяй|поменять|измени|изменить|смени|сменить)\s+(на\s+)?(тёмную|тёмное|тёмный|dark)\s*(тему|оформление)?$/, 'тема тёмная'],
    [/^(поменяй|поменять|измени|изменить|смени|сменить)\s+(на\s+)?(светлую|светлое|светлый|light)\s*(тему|оформление)?$/, 'тема светлая'],
    // Новая презентация
    [/^(создай|создать|сделай|начни|начать)\s+(новую\s+)?(презентацию|слайды|новый проект)$/, 'новая презентация'],
    // Цвет заливки/фона объекта
    [/^(поменяй|измени|смени|сделай|поменять|изменить)\s+(цвет|заливку?|фон)\s*(объекта|фигуры?|элемента)?\s*(на\s+)?([а-яёА-ЯЁ-]+)$/, (m) => 'цвет заливки ' + m[5]],
    [/^(поменяй|измени|смени|поменять)\s+(цвет|заливку?)$/, 'выбрать цвет заливки'],
    // Цвет границы
    [/^(поменяй|измени|смени|поменять)\s+(цвет\s+)?(границы|обводки|рамки)\s*(на\s+)?([а-яёА-ЯЁ-]+)$/, (m) => 'цвет границы ' + m[5]],
    [/^(поменяй|измени|смени)\s+(цвет\s+)?(границы|обводки|рамки)$/, 'выбрать цвет границы'],
    // Толщина границы
    [/^(измени|поменяй|поставь|сделай)\s+(толщину?|ширину?)\s+(границы|обводки|рамки)\s+(на\s+)?(\d+)$/, (m) => 'толщина границы ' + m[5]],
    [/^(измени|поменяй|поставь|сделай)\s+(толщину?|ширину?)\s+(границы|обводки|рамки)\s+(на\s+)?(один|два|три|четыре|пять|шесть|семь|восемь)$/, (m) => {const nm={один:'1',два:'2',три:'3',четыре:'4',пять:'5',шесть:'6',семь:'7',восемь:'8'};return 'толщина границы '+(nm[m[5]]||'2');}],
    // Скругление
    [/^(сделай|поставь|задай|установи)\s+(скругление|радиус)\s*(углов?)?\s*(\d+)$/, (m) => 'скругление ' + m[4]],
    [/^(скругли|округли)\s+(углы?)?\s*(на\s+)?(\d+)?$/, (m) => 'скругление ' + (m[4]||'20')],
    // Цвет фона слайда
    [/^(поменяй|измени|смени|поменять)\s+(цвет\s+)?(фона?|фон\s+слайда)\s*(на\s+)?([а-яёА-ЯЁ]+)$/, (m) => 'фон слайда ' + m[5]],
    [/^(поменяй|измени)\s+(цвет\s+)?фона?$/, 'фон слайда случайный'],
    // Позиция в угол
    [/^(перемести|поставь|размести|перемести|поместить?)\s+(в\s+)?правый\s+верхний\s+угол$/, 'угол право верх'],
    [/^(перемести|поставь|размести|поместить?)\s+(в\s+)?правый\s+нижний\s+угол$/, 'угол право низ'],
    [/^(перемести|поставь|размести|поместить?)\s+(в\s+)?левый\s+верхний\s+угол$/, 'угол лево верх'],
    [/^(перемести|поставь|размести|поместить?)\s+(в\s+)?левый\s+нижний\s+угол$/, 'угол лево низ'],
    // Выбрать по роли — заголовок и т.д.
    [/^(выбери|переключись\s+на|перейди\s+на)\s+(заголовок|первый\s+заголовок)$/, 'выбрать текст заголовок'],
    [/^(выбери|переключись\s+на)\s+(подзаголовок)$/, 'выбрать текст подзаголовок'],
    [/^(выбери|переключись\s+на)\s+(основной\s+текст|текст)$/, 'выбрать текст'],
    // Тип границы
    [/^(тип|стиль)\s+(границы|обводки)\s+(пунктирная|пунктир|dash)$/, 'тип границы dash'],
    [/^(тип|стиль)\s+(границы|обводки)\s+(сплошная|solid)$/, 'тип границы solid'],
    [/^(тип|стиль)\s+(границы|обводки)\s+(точечная|dot)$/, 'тип границы dot'],
    // Цвет текста
    [/^(поменяй|измени|смени|цвет)\s+(цвет\s+)?текста?\s*(на\s+)?([а-яёА-ЯЁ-]+)$/, (m) => 'цвет текста ' + (m[4]||m[3])],
    [/^(размер|размер\s+текста|размер\s+шрифта)\s+(\d+)$/, (m) => 'размер шрифта ' + m[2]],
    // Позиция — выше/ниже
    [/^(выбери|выдели)\s+(объект\s+)?(выше|сверху)$/, 'объект выше'],
    [/^(выбери|выдели)\s+(объект\s+)?(ниже|снизу)$/, 'объект ниже'],
    [/^(выбери|выдели)\s+(объект\s+)?(по центру|в центре|по середине|ближе к центру)$/, 'объект по центру'],
    [/^(убери|удали)\s+(объект\s+)?(выше|сверху)$/, 'удалить объект выше'],
    [/^(убери|удали)\s+(объект\s+)?(ниже|снизу)$/, 'удалить объект ниже'],
    [/^(убери|удали)\s+(объект\s+)?(по центру|в центре)$/, 'удалить объект по центру'],
    [/^(ниже|снизу)$/, 'объект ниже'],
    [/^(выше|сверху)$/, 'объект выше'],
    [/^(выбери|выдели)\s+(объект\s+)?(ниже|снизу)$/, 'объект ниже'],
    // Поменять текст на ...
    [/^(поменяй|измени|поменять)\s+текст\s+(на\s+)?(.+)$/, (m) => 'установить текст ' + m[3]],
    // Редактирование текста
    [/^(измени|поменяй|редактируй|изменить)\s+текст$/, 'редактировать текст'],
    [/^(измени|поменяй|изменить)\s+текст\s+(.+)$/, (m) => 'установить текст ' + m[2]],
    // Формула — ДО общего «напиши …», иначе уходит в «установить текст»
    [/^(напиши|набери|введи|создай|добавь|построй)\s+формулу?\s+(.+?)\s+и\s+(е[её]?\s+)?(структуру|строение)$/, (m) => 'создать формулу и структуру ' + m[2]],
    [/^(напиши|набери|введи|создай|добавь|построй)\s+формулу?\s+(.+)$/, (m) => 'создать формулу ' + m[2]],
    [/^(формула)\s+(.+)$/, (m) => 'создать формулу ' + m[2]],
    [/^(напиши|набери|введи|создай|добавь)\s+формулу?\s*$/, 'добавить формулу'],
    // Хим. структура / строение молекулы
    [/^(нарисуй|нарисуем|рисуй|отобрази|отобразить|покажи|построй|построить|добавь)\s+(структуру|строение|молекулярную\s+структуру|молекулярное\s+строение|регулярное\s+строение|линейное\s+строение|молекулу)(\s+(.+))?$/, (m) => {
      const name = (m[4] || '').trim();
      return name ? 'создать структуру ' + name : 'создать структуру';
    }],
    [/^(структура|строение|молекулярная\s+структура|молекулярное\s+строение)\s*(.*)$/, (m) => {
      const name = (m[2] || '').trim();
      return name ? 'создать структуру ' + name : 'создать структуру';
    }],
    [/^создать\s+структуру(\s+(.+))?$/, (m) => m[2] ? 'создать структуру ' + m[2].trim() : 'создать структуру'],
    [/^(набери|напиши|введи|вставь)\s+текст\s+(.+)$/, (m) => 'установить текст ' + m[2]],
    [/^(набери|напиши|введи)\s+(.+)$/, (m) => 'установить текст ' + m[2]],
    // Удаление по роли/позиции
    [/^(убери|удали|удалить)\s+(нижнюю?|нижний)\s+(надпись|текст|заголовок|объект|элемент)$/, 'удалить нижний'],
    [/^(убери|удали)\s+(верхнюю?|верхний)\s+(надпись|текст|заголовок|объект|элемент)$/, 'удалить верхний'],
    [/^(убери|удали)\s+(левую?|левый)\s+(надпись|текст|объект|элемент)$/, 'удалить левый'],
    [/^(убери|удали)\s+(правую?|правый)\s+(надпись|текст|объект|элемент)$/, 'удалить правый'],
    // Удаление = удалить (bare word)
    [/^удаление$/, 'удалить'],
    // Размытый фон
    [/^(размытый|размыть|добавь размытие)\s+(фон|фона?)$/, 'размытый фон'],
    [/^(убери|отключи)\s+(размытие|размытый)\s*(фон)?$/, 'убрать размытие фона'],
    // Градиент
    [/^(поменяй|смени)\s+(цвет|заливку?)\s+(на\s+)?градиент\s+([а-яёА-ЯЁ-]+)\s+([а-яёА-ЯЁ-]+)$/, (m) => 'градиент ' + m[4] + ' ' + m[5]],
    [/^(поменяй|смени)\s+цвет\s+на\s+([а-яёА-ЯЁ-]+)-([а-яёА-ЯЁ-]+)$/, (m) => 'градиент ' + m[2] + ' ' + m[3]],
    // Разместить текст = добавить текст
    [/^(размести|расположи|добавь|вставь|развед[иь]|напиши)\s+(текст|надпись)\s*(на\s+слайде?)?$/, 'добавить текст'],
    // Сделай заголовком = установить роль заголовка
    [/^(сделай|установи|назначь)\s+(заголовком|заголовок|главным\s+текстом)$/, 'роль заголовок'],
    [/^(сделай|установи|назначь)\s+(подзаголовком|подзаголовок)$/, 'роль подзаголовок'],
    [/^(сделай|установи|назначь)\s+(основным\s+текстом|телом)$/, 'роль текст'],
    // Выровнять по центру вариации
    [/^(уровн[яи]|выровн[яи])\s+по центру$/, 'по центру'],
    // Повторяющийся паттерн "поменять цвет поменять цвет на ..."
    [/^(поменять цвет\s+)+(на\s+)?([а-яёА-ЯЁ-]+)$/, (m) => 'цвет заливки ' + m[3]],
    // Опечатки типа "поменяет" вместо "поменяй"
    [/^поменяет\s+(цвет\s+)?(на\s+)?([а-яёА-ЯЁ-]+)$/, (m) => 'цвет заливки ' + m[3]],
    // Цвет текста через "поменять"
    [/^(поменяй|поменять|измени)\s+цвет\s+текста?\s+(на\s+)?([а-яёА-ЯЁ-]+)$/, (m) => 'цвет текста ' + m[3]],
    // Прозрачность объекта
    [/^(прозрачность|сделай\s+прозрачным|непрозрачность)\s+(\d+)%?$/, (m) => 'прозрачность ' + m[2]],
    [/^(сделай\s+)?(полностью\s+)?непрозрачным?$/, 'прозрачность 100'],
    [/^(сделай\s+)?полупрозрачным?$/, 'прозрачность 50'],
    // Межстрочный интервал
    [/^(межстрочный\s+интервал|интервал\s+строк?)\s+([\d.]+)$/, (m) => 'межстрочный ' + m[2]],
    // Межбуквенный интервал
    [/^(межбуквенный\s+интервал|расстояние\s+между\s+буквами?)\s+(-?[\d.]+)$/, (m) => 'межбуквенный ' + m[2]],
    // Скрыть/показать объект (без голого «покажи»/«пока» — это показ презентации)
    [/^(скрой|скрыть|спрячь|сделай\s+невидимым?)\s*(объект|элемент|это)?$/, 'скрыть объект'],
    [/^(покажи|показать)\s+(объект|элемент|это|выделенное|выделенный)$/, 'показать объект'],
    [/^(сделай\s+видимым?)\s*(объект|элемент|это)?$/, 'показать объект'],
    // Блокировка
    [/^(заблокируй|заблокировать|lock)\s*(объект|элемент)?$/, 'заблокировать'],
    [/^(разблокируй|разблокировать|unlock)\s*(объект|элемент)?$/, 'разблокировать'],
    // Зеркальное отражение
    [/^(отрази|зеркал[ья]|перевернуть?|отразить?)\s+горизонтально$/, 'отразить горизонтально'],
    [/^(отрази|зеркал[ья]|перевернуть?|отразить?)\s+вертикально$/, 'отразить вертикально'],
    // Анимации
    [/^(добавь|применить?|назначь)\s+(анимацию|анимация|эффект)\s+(появление|fadein|вход)$/, 'анимация появление'],
    [/^(добавь|применить?|назначь)\s+(анимацию|эффект)\s+(качение|swing)$/, 'анимация качение'],
    [/^(добавь|применить?|назначь)\s+(анимацию|эффект)\s+(танец|dance)$/, 'анимация танец'],
    [/^(добавь|применить?|назначь)\s+(анимацию|эффект)\s+(плавание|float)$/, 'анимация плавание'],
    [/^(убери|удали|очисти)\s+(все\s+)?анимации?\s*(объекта?)?$/, 'очистить анимации'],
    // Переходы слайдов
    [/^(переход|добавь\s+переход)\s+(плавный|fade)$/, 'переход fade'],
    [/^(переход|добавь\s+переход)\s+(сдвиг|slide|слайд)$/, 'переход slide'],
    [/^(убери|удали)\s+(переход|эффект\s+перехода)$/, 'убрать переход'],
    // Копировать стиль
    [/^(скопируй|копировать)\s+(стиль|оформление|формат)$/, 'копировать стиль'],
    [/^(примени|вставить?)\s+(стиль|оформление|формат)$/, 'вставить стиль'],
    // Выравнивание нескольких объектов
    [/^(выровняй|выравни)\s+(все\s+)?(по левому краю|по лево[мй])$/, 'выровнять все по левому краю'],
    [/^(выровняй|выравни)\s+(все\s+)?(по правому краю|по право[мй])$/, 'выровнять все по правому краю'],
    [/^(выровняй|выравни)\s+(все\s+)?(по верхнему краю|по верху)$/, 'выровнять все по верху'],
    [/^(выровняй|выравни)\s+(все\s+)?(по нижнему краю|по низу)$/, 'выровнять все по низу'],
    [/^(распредели|выравни)\s+(все\s+)?(по горизонтали|горизонтально)$/, 'распределить горизонтально'],
    [/^(распредели|выравни)\s+(все\s+)?(по вертикали|вертикально)$/, 'распределить вертикально'],
    // Слои
    [/^(на\s+передний\s+план|наверх|поверх всего)$/, 'вперёд'],
    [/^(на\s+задний\s+план|назад|под все)$/, 'назад'],
    // Ссылка
    [/^(добавь|установи)\s+ссылку\s+(.+)$/, (m) => 'ссылка ' + m[2]],
    [/^(убери|удали)\s+ссылку$/, 'убрать ссылку'],
    // Отступы
    [/^(отступ|padding)\s+(\d+)$/, (m) => 'отступ ' + m[2]],
    // Скругление углов объекта
    [/^(скругли|скругление)\s+(все\s+)?углы?\s*(на\s*)?(\d+)$/, (m) => 'скругление rx ' + m[4]],
    [/^(убери|удали|сними)\s+скругление$/, 'скругление rx 0'],
    // Соотношение сторон
    [/^(заблокируй|сохрани)\s+(соотношение\s+сторон|пропорции)$/, 'заблокировать пропорции'],
    [/^(новый слайд в начало|добавь слайд в начало)$/, 'новый слайд в начало'],
    // Диктовка — голосовой ввод текста в выделенный элемент
    [/^(диктовка|начать диктовку|диктовать|голосовой ввод)$/, 'начать диктовку'],
    [/^(стоп|остановить диктовку|завершить диктовку)$/, 'остановить диктовку'],
    // Очистка текста
    [/^(убери|убрать|очисти|очистить|удали|стереть?)\s+(текст|надпись|содержимое|текст\s+внутри\s+блока|текст\s+внутри)\s*(блока?|элемента?)?$/, 'очистить текст'],
    [/^(заменить?|поменяй|замени)\s+текст\s+(диктовка|на\s+диктовку|голосом)$/, 'начать диктовку'],
    // Размер через "в два раза больше" и т.п.
    [/^(увеличить?|увеличь?)\s+(ширину?|высоту?)\s+(в\s+два\s+раза|вдвое|в\s+2\s+раза)$/, (m) => /ширин/.test(m[2]) ? 'размер + 100%w' : 'размер + 100%h'],
    [/^(ширина?|высота?)\s+(в\s+два\s+раза|вдвое)\s+(больше)?$/, (m) => /ширин/.test(m[1]) ? 'размер + 100%w' : 'размер + 100%h'],
    // Поворот — разные формулировки
    [/^(поверни|повернуть?)\s+(фигуру?|объект|элемент)?\s*(на\s+)?(\d+)[°о]?\s*(градусов?)?$/, (m) => 'повернуть на '+(m[4]||'90')],
    [/^(поворот)\s+(\d+)[°о]?$/, (m) => 'повернуть на '+m[2]],
    // Снять выделение
    [/^(убери|убрать|сними|снять|отменить?)\s+(выделение|выделения|выделенное)$/, 'снять выделение'],
    [/^не\s+снимается$/, 'снять выделение'],
    // Выделить по типу
    [/^(выделить?|выбрать?)\s+(фигуры?|все\s+фигуры)$/, 'выбрать фигуру'],
    [/^(выделить?|выбрать?)\s+(тексты?|все\s+тексты?)$/, 'выбрать текст'],
    // Показ/презентация
    [/^(покажи|показать?|начать?|запусти|запустить)\s+(презентацию|показ[аыу]?|слайды?)$/, 'начать показ'],
    [/^(начать|начни|запусти)\s+пока$/, 'начать показ'],
    // Сдвинуть без "на"
    [/^(сдвинуть?|сдвинь)\s+(вниз|вверх|влево|вправо)$/, (m) => {const dir={вниз:'вниз',вверх:'вверх',влево:'влево',вправо:'вправо'}[m[2]]; return dir+' на obj';}],
    // Отразить/перевернуть по горизонтали/вертикали
    [/^(поверни|повернуть?|отрази|зеркал[ья])\s+(горизонтально|по горизонтали|налево-направо)$/, 'отразить горизонтально'],
    [/^(поверни|повернуть?|отрази|зеркал[ья])\s+(вертикально|по вертикали|вверх-вниз)$/, 'отразить вертикально'],
    // Остановить показ
    [/^(останови|остановить?|заверши|завершить?)\s+(презентацию|показ|слайды?)$/, 'остановить показ'],
    [/^(выход|выйти)\s+(из показа|из презентации)?$/, 'остановить показ'],
    [/^(сохрани|сохранить)$/, 'сохранить'],
    [/^(экспортируй|экспортировать|выгрузи)$/, 'экспортировать'],
    [/^(полный экран|на весь экран|развернуть)$/, 'полный экран'],
    // NOTE: bare 'следующий'/'предыдущий' handled contextually in _handleCommand
  ];
  for (const [re, val] of map) {
    const m = t.match(re);
    if (m) {
      _lastNormHit = true;
      return typeof val === 'function' ? val(m) : val;
    }
  }
  // Fallback: English patterns when UI is Russian (or RU patterns already tried first)
  if (!preferEn) {
    const enHit = _matchVoiceMap(t, _EN_VOICE_MAP);
    if (enHit != null) { _lastNormHit = true; return enHit; }
  }
  return t; // return as-is if no mapping found
}

let _lastCmd = '', _lastCmdTime = 0;
function _handleCommand(raw) {
  const t = _normalize(raw);
  // Debounce: skip exact duplicate commands within 800ms
  const now = Date.now();
  if (t === _lastCmd && now - _lastCmdTime < 800) return;
  _lastCmd = t; _lastCmdTime = now;
  // Log all commands — mark as 'ok' initially, overwrite if falls through to unknown
  const _logEntry = {raw, normalized: t, ts: new Date().toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit',second:'2-digit'}), status: 'ok'};
  // Шум / паразиты после нормализации
  if (!t || _voiceIsNoise(t)) {
    _logEntry.status = 'noise';
    _voiceLog.push(_logEntry);
    return;
  }
  _voiceLog.push(_logEntry);
  _voiceMsg(raw, 'ok');

  // helpers
  const num = (s) => { const m = s.match(/\d+/); return m ? parseInt(m[0]) : null; };
  const hasSel = () => typeof sel !== 'undefined' && sel;
  const move = (dx, dy) => {
    if (!hasSel()) return;
    if (typeof pushUndo === 'function') pushUndo();
    // Move all selected elements (multiSel or just sel)
    const targets = multiSel.size > 1 ? [...multiSel] : [sel];
    targets.forEach(elT => {
      const dT = slides[cur]?.els.find(e => e.id === elT.dataset.id);
      if (!dT) return;
      dT.x += dx; dT.y += dy;
      elT.style.left = dT.x + 'px'; elT.style.top = dT.y + 'px';
    });
    if (typeof save === 'function') save();
    if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
  };

  const inPreview = () => document.getElementById('preview-ov')?.classList.contains('active');

  // ── Контекстные команды ──
  // 'следующий', 'другой', 'ещё', 'иной' without slideshow = cycle elements
  if (['следующий', 'другой', 'другое', 'ещё', 'следующее', 'иной', 'иное', 'дальше', 'далее', 'вперед', 'вперёд'].includes(t)) {
    const inPrev = document.getElementById('preview-ov')?.classList.contains('active');
    if (inPrev) {
      if (typeof nextPreview === 'function') nextPreview();
    } else {
      const cv = document.getElementById('canvas'); if (!cv) return;
      // Always cycle within same type if something is selected
      const type = hasSel() ? sel.dataset.type : null;
      const els = type
        ? Array.from(cv.querySelectorAll(`.el[data-type="${type}"]:not(.decor-el)`))
        : Array.from(cv.querySelectorAll('.el:not(.decor-el)'));
      if (!els.length) return;
      const idx = hasSel() ? els.indexOf(sel) : -1;
      // Always mod-cycle: if sel not in list idx=-1 → next=0 (start of list)
      const next = (idx + 1) % els.length;
      if (typeof pick === 'function') { pick(els[next]); _lastCtx = 'select'; }
    }
    return;
  }
  if (['предыдущий', 'обратно', 'назад к предыдущему'].includes(t)) {
    const inPrev = document.getElementById('preview-ov')?.classList.contains('active');
    if (inPrev) {
      if (typeof prevPreview === 'function') prevPreview();
    } else {
      const cv = document.getElementById('canvas'); if (!cv) return;
      const type = hasSel() ? sel.dataset.type : null;
      const els = type
        ? Array.from(cv.querySelectorAll(`.el[data-type="${type}"]:not(.decor-el)`))
        : Array.from(cv.querySelectorAll('.el:not(.decor-el)'));
      if (!els.length) return;
      const idx = hasSel() ? els.indexOf(sel) : 0;
      const prev = (idx - 1 + els.length) % els.length;
      if (typeof pick === 'function') { pick(els[prev]); _lastCtx = 'select'; }
    }
    return;
  }

  // ── Голосовое управление ──
  if (t === 'голос выкл') {
    if (_active) {
      const btn = document.getElementById('voice-tab-btn');
      if (typeof window.toggleVoiceControl === 'function') window.toggleVoiceControl(btn);
    }
    return;
  }

  // ── Показ ──
  if (t === 'начать показ') { if (typeof startPreview === 'function') startPreview(0); return; }
  if (t === 'начать с текущего') { if (typeof startPreview === 'function') startPreview(cur); return; }
  if (t === 'стоп') {
    // Во время показа — остановить показ; иначе — выключить голосовое управление
    if (inPreview()) {
      if (typeof stopPreview === 'function') stopPreview();
    } else if (_active) {
      const btn = document.getElementById('voice-tab-btn');
      if (typeof window.toggleVoiceControl === 'function') window.toggleVoiceControl(btn);
    }
    return;
  }
  if (t === 'следующий' && inPreview()) { if (typeof nextPreview === 'function') nextPreview(); return; }
  if (t === 'предыдущий' && inPreview()) { if (typeof prevPreview === 'function') prevPreview(); return; }

  // ── Слайды ──
  if (t === 'новый слайд') { if (typeof addSlide === 'function') addSlide(); return; }
  if (t === 'удалить слайд' || t.startsWith('удалить слайд ')) {
    const slideRef = t.replace('удалить слайд', '').trim();
    if (slideRef) {
      const ordinals = {первый:0,второй:1,третий:2,четвёртый:3,пятый:4,шестой:5,седьмой:6,последний:-1};
      let idx2 = ordinals[slideRef] !== undefined ? ordinals[slideRef] : (parseInt(slideRef) - 1);
      if (idx2 < 0) idx2 = slides.length - 1;
      if (idx2 >= 0 && idx2 < slides.length) {
        if (typeof pickSlide === 'function') pickSlide(idx2);
        setTimeout(() => { if (typeof delSlide === 'function') delSlide(); }, 50);
      }
    } else {
      if (typeof delSlide === 'function') delSlide();
    }
    return;
  }
  if (t === 'дублировать слайд' || t.startsWith('дублировать слайд ')) {
    const slideRef = t.replace('дублировать слайд', '').trim();
    if (slideRef) {
      // Navigate to that slide first, then duplicate
      const ordinals = {первый:0, второй:1, третий:2, четвёртый:3, пятый:4, последний:-1};
      let idx2 = ordinals[slideRef] !== undefined ? ordinals[slideRef] : (parseInt(slideRef) - 1);
      if (idx2 < 0) idx2 = slides.length - 1;
      if (idx2 >= 0 && idx2 < slides.length) {
        if (typeof pickSlide === 'function') pickSlide(idx2);
        setTimeout(() => { if (typeof dupSlide === 'function') dupSlide(); }, 50);
      }
    } else {
      if (typeof dupSlide === 'function') dupSlide();
    }
    return;
  }
  if (t === 'следующий слайд') {
    if (document.getElementById('preview-ov')?.classList.contains('active')) {
      if (typeof nextPreview === 'function') nextPreview();
    } else if (typeof pickSlide === 'function' && cur < slides.length-1) {
      pickSlide(cur+1);
    }
    return;
  }
  if (t === 'предыдущий слайд') {
    if (document.getElementById('preview-ov')?.classList.contains('active')) {
      if (typeof prevPreview === 'function') prevPreview();
    } else if (typeof pickSlide === 'function' && cur > 0) {
      pickSlide(cur-1);
    }
    return;
  }
  const goSlide = t.match(/перейти на слайд (.+)/);
  if (goSlide) {
    const ordinals = {первый:0,второй:1,третий:2,четвёртый:3,пятый:4,шестой:5,седьмой:6,восьмой:7,девятый:8,десятый:9,последний:-1};
    const ref = goSlide[1].trim();
    let i = ordinals[ref] !== undefined ? ordinals[ref] : (parseInt(ref) - 1);
    if (i < 0) i = slides.length - 1;
    if (typeof pickSlide==='function' && i>=0 && i<slides.length) pickSlide(i);
    return;
  }

  // ── Отмена / повтор ──
  if (t === 'отменить' || t.startsWith('отменить ')) {
    const countM = t.match(/отменить (\d+)/);
    const count = countM ? parseInt(countM[1]) : 1;
    if (typeof doUndo === 'function') {
      for (let i = 0; i < Math.min(count, 20); i++) doUndo();
    }
    return;
  }
  if (t === 'повторить') { if (typeof doRedo === 'function') doRedo(); return; }

  // ── Выделение ──
  // ── Выбрать элемент по типу ──
  const selTypeMap = {'выбрать фигуру':'shape', 'выбрать изображение':'image'};
  if (t in selTypeMap) {
    const cv = document.getElementById('canvas'); if (!cv) return;
    const type = selTypeMap[t];
    const els = Array.from(cv.querySelectorAll(`.el[data-type="${type}"]:not(.decor-el)`));
    if (!els.length) { _voiceMsg(`Объектов типа "${type}" нет`); return; }
    const idx = hasSel() && sel.dataset.type === type ? els.indexOf(sel) : -1;
    const next = (idx + 1) % els.length;
    if (typeof pick === 'function') { pick(els[next]); _lastCtx = 'select'; }
    return;
  }

  // ── Выбрать конкретный элемент по типу/роли/содержимому ──
  const selByType = t.match(/^выбрать текст\s*(.*)?$/);
  if (selByType) {
    const hint = (selByType[1]||'').trim();
    const cv = document.getElementById('canvas'); if (!cv) return;
    const els = Array.from(cv.querySelectorAll('.el[data-type="text"]'));
    if (!els.length) { _voiceMsg('Текстовых объектов нет'); return; }
    let found = null;
    if (!hint) {
      // no hint — pick first text or next after current
      const curIdx = hasSel() ? els.indexOf(sel) : -1;
      found = els[(curIdx + 1) % els.length];
    } else {
      // match by role attribute or text content
      const roleMap = {
        'заголовок': 'title', 'надпись': 'body', 'текст': 'body',
        'подзаголовок': 'subtitle', 'надпись снизу': 'footer', 'нижняя': 'footer'
      };
      const role = roleMap[hint];
      if (role) {
        // find by data-role or textRole in slides data
        found = els.find(el => {
          const d = slides[cur]?.els.find(e => e.id === el.dataset.id);
          return d && d.textRole === role;
        }) || els.find(el => el.dataset.textRole === role);
      }
      if (!found) {
        // fallback: search by text content
        found = els.find(el => el.textContent.toLowerCase().includes(hint));
      }
      if (!found) found = els[0];
    }
    if (found && typeof pick === 'function') { pick(found); _lastCtx = 'select'; }
    return;
  }

  if (t === 'выделить всё') {
    const cv = document.getElementById('canvas');
    if (!cv) return;
    // Не через pickMulti: pick() у группы очищает multiSel и оставляет только одну группу
    if (typeof clearMultiSel === 'function') clearMultiSel();
    const els = Array.from(cv.querySelectorAll('.el:not(.decor-el)')).filter(el => el.dataset.objHidden !== '1');
    els.forEach(el => { if (typeof addToMultiSel === 'function') addToMultiSel(el); });
    if (!multiSel.size) return;
    if (multiSel.size === 1) {
      const only = [...multiSel][0];
      clearMultiSel();
      if (typeof pick === 'function') pick(only);
    } else {
      window._explicitMultiSel = true;
      const frozen = [...multiSel];
      const last = frozen[frozen.length - 1];
      window._rbSelecting = true;
      if (typeof pick === 'function') pick(last);
      window._rbSelecting = false;
      frozen.forEach(el => { if (!multiSel.has(el)) addToMultiSel(el); });
      if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
      if (typeof _updateSelFrames === 'function') _updateSelFrames();
    }
    _lastCtx = 'select';
    return;
  }
  if (t === 'снять выделение') {
    if (typeof clearMultiSel === 'function') clearMultiSel();
    if (typeof desel === 'function') desel();
    else if (typeof pick === 'function') pick(null);
    if (typeof _updateSelFrames === 'function') _updateSelFrames();
    const ov = document.getElementById('handles-overlay');
    if (ov) {
      const gob = ov.querySelector('.group-outline-box');
      if (gob) gob.remove();
    }
    _lastCtx = null;
    return;
  }
  if (t === 'следующий объект' || t === 'предыдущий объект') {
    const cv=document.getElementById('canvas'); if (!cv) return;
    const els=Array.from(cv.querySelectorAll('.el:not(.decor-el)')); if (!els.length) return;
    const idx=hasSel()?els.indexOf(sel):-1;
    const next=t.includes('следующий')?(idx+1)%els.length:(idx-1+els.length)%els.length;
    if (typeof pick==='function') { pick(els[next]); _lastCtx='select'; } return;
  }

  // ── Действия с объектом ──
  // ── Массовое удаление ──
  if (t.startsWith('удалить всё') || t === 'удалить всё') {
    if (typeof pushUndo === 'function') pushUndo();
    const cv = document.getElementById('canvas'); if (!cv) return;
    if (typeof clearMultiSel === 'function') clearMultiSel();
    const els = Array.from(cv.querySelectorAll('.el:not(.decor-el)'));
    els.forEach(el => {
      const d = slides[cur]?.els.find(e => e.id === el.dataset.id);
      if (d) slides[cur].els.splice(slides[cur].els.indexOf(d), 1);
      el.remove();
    });
    // Линии связи и призраки движения
    if (slides[cur]) slides[cur].connectors = [];
    if (typeof renderConnectors === 'function') renderConnectors();
    else if (typeof window.renderConnectors === 'function') window.renderConnectors();
    document.dispatchEvent(new Event('_connPrune'));
    if (typeof renderMotionOverlay === 'function') renderMotionOverlay();
    document.getElementById('motion-ghosts')?.remove();
    document.getElementById('motion-svg')?.remove();
    if (typeof pick === 'function') pick(null);
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
    return;
  }
  const typeDelM = t.match(/^удалить тип (\w+)$/);
  if (typeDelM) { _deleteByType(typeDelM[1]); return; }

  const bulkDelM = t.match(/^удалить все (тексты|фигуры|изображения|иконки|формулы|структуры|графики)$/);
  if (bulkDelM) {
    const kind = bulkDelM[1];
    if (typeof pushUndo === 'function') pushUndo();
    const cv = document.getElementById('canvas'); if (!cv) return;
    const typeMap = { тексты:'text', фигуры:'shape', изображения:'image', иконки:'svg', формулы:'formula' };
    let removed = 0;
    if (kind === 'структуры' || kind === 'графики') {
      const els = Array.from(cv.querySelectorAll('.el[data-type="graph"]:not(.decor-el)'));
      els.forEach(el => {
        const d = slides[cur]?.els.find(e => e.id === el.dataset.id);
        if (!d) return;
        if (kind === 'структуры' && d.graphKind !== 'chem') return;
        slides[cur].els.splice(slides[cur].els.indexOf(d), 1);
        el.remove();
        removed++;
      });
    } else {
      const delType = typeMap[kind];
      if (!delType) return;
      const els = Array.from(cv.querySelectorAll(`.el[data-type="${delType}"]:not(.decor-el)`));
      els.forEach(el => {
        const id = el.dataset.id;
        if (delType === 'formula' && typeof window._deleteLinkedGraphs === 'function') {
          window._deleteLinkedGraphs(id);
        }
        const d = slides[cur]?.els.find(e => e.id === id);
        if (d) slides[cur].els.splice(slides[cur].els.indexOf(d), 1);
        el.remove();
        removed++;
      });
    }
    if (typeof pick === 'function') pick(null);
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
    if (!removed) _voiceMsg(kind === 'формулы' ? 'Формул нет' : kind === 'структуры' ? 'Структур нет' : 'Нечего удалять');
    return;
  }

  // ── Выбрать формулу / хим. структуру ──
  const pickFm = t.match(/^выбрать формулу\s*(.*)$/);
  if (pickFm) {
    _voicePickFormulaOrStruct('formula', (pickFm[1] || '').trim());
    return;
  }
  const pickStruct = t.match(/^выбрать структуру\s*(.*)$/);
  if (pickStruct) {
    _voicePickFormulaOrStruct('structure', (pickStruct[1] || '').trim());
    return;
  }

  // ── Выбрать по краю слайда ──
  if (t.match(/^выбрать (нижний|верхний|левый|правый)$/)) {
    const dir = t.replace('выбрать ', '');
    const cv = document.getElementById('canvas'); if (!cv) return;
    const all = Array.from(cv.querySelectorAll('.el:not(.decor-el)'));
    if (!all.length) { _voiceMsg('Объектов нет'); return; }
    let best = null;
    if (dir === 'нижний') best = all.reduce((a,b) => (parseInt(b.style.top)||0) > (parseInt(a.style.top)||0) ? b : a);
    if (dir === 'верхний') best = all.reduce((a,b) => (parseInt(b.style.top)||0) < (parseInt(a.style.top)||0) ? b : a);
    if (dir === 'правый')  best = all.reduce((a,b) => (parseInt(b.style.left)||0) > (parseInt(a.style.left)||0) ? b : a);
    if (dir === 'левый')   best = all.reduce((a,b) => (parseInt(b.style.left)||0) < (parseInt(a.style.left)||0) ? b : a);
    if (best && typeof pick === 'function') { pick(best); _lastCtx = 'select'; }
    return;
  }

  if (t === 'удалить') {
    if (hasSel()) {
      if (typeof deleteSelected === 'function') deleteSelected();
    } else {
      // Nothing selected — delete a random element of any type
      _deleteByType(null);
    }
    return;
  }
  if (t === 'копировать') { if (typeof copyEl==='function') copyEl(); return; }
  if (t === 'сгруппировать') { if (typeof window.groupSelected==='function') window.groupSelected(); return; }
  if (t === 'разгруппировать') { if (typeof window.ungroupSelected==='function') window.ungroupSelected(); else if (typeof window.groupSelected==='function') window.groupSelected(); return; }
  if (t === 'вставить') { if (typeof pasteEl==='function') pasteEl(); return; }
  if (t === 'дублировать') {
    if (typeof dupEl==='function') dupEl();
    else if (hasSel() && typeof copyEl==='function' && typeof pasteEl==='function') { copyEl(); pasteEl(); }
    return;
  }
  if (t.startsWith('дублировать и сдвинуть ')) {
    const dir = t.replace('дублировать и сдвинуть ', '');
    if (!hasSel()) return;
    // Copy current element data
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id);
    if (!d) return;
    if (typeof pushUndo === 'function') pushUndo();
    const clone = JSON.parse(JSON.stringify(d));
    clone.id = 'e' + (++ec);
    const shift = dir === 'вправо' ? [d.w + 10, 0] : dir === 'вниз' ? [0, d.h + 10] : dir === 'влево' ? [-d.w - 10, 0] : [0, -d.h - 10];
    clone.x += shift[0]; clone.y += shift[1];
    slides[cur].els.push(clone);
    if (typeof mkEl === 'function') mkEl(clone);
    requestAnimationFrame(() => {
      const cv = document.getElementById('canvas');
      const newEl = cv?.querySelector(`.el[data-id="${clone.id}"]`);
      if (newEl && typeof pick === 'function') pick(newEl);
    });
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
    return;
  }
  if (t === 'вперёд') { if (typeof bringForward==='function') bringForward(); return; }
  if (t === 'назад') { if (typeof sendBackward==='function') sendBackward(); return; }

  // ── Добавление объектов ──
  if (t === 'добавить текст') {
    if (typeof addText==='function') {
      addText();
      // Select the newly created element
      requestAnimationFrame(()=>{
        const cv=document.getElementById('canvas');
        if (!cv) return;
        const els=cv.querySelectorAll('.el[data-type="text"]');
        const last=els[els.length-1];
        if (last && typeof pick==='function') pick(last);
      });
    }
    return;
  }
  if (t === 'добавить формулу') {
    if (typeof addFormula === 'function') addFormula();
    return;
  }
  const createFmStruct = t.match(/^создать формулу и структуру (.+)$/);
  if (createFmStruct) {
    const raw = createFmStruct[1].trim();
    if (typeof window.createFormulaFromText === 'function') {
      window.createFormulaFromText(raw, { withStructure: true });
    }
    return;
  }
  const createFm = t.match(/^создать формулу (.+)$/);
  if (createFm) {
    const raw = createFm[1].trim();
    if (typeof window.createFormulaFromText === 'function') window.createFormulaFromText(raw);
    else if (typeof addFormula === 'function') addFormula();
    return;
  }
  const createStruct = t.match(/^создать структуру\s*(.*)$/);
  if (createStruct) {
    const raw = (createStruct[1] || '').trim();
    if (typeof window.createChemStructureFromText === 'function') {
      window.createChemStructureFromText(raw);
    } else if (raw && typeof window.createFormulaFromText === 'function') {
      window.createFormulaFromText(raw, { withStructure: true });
    } else if (typeof sel !== 'undefined' && sel && sel.dataset.type === 'formula' && typeof buildFormulaGraph === 'function') {
      buildFormulaGraph(sel);
    } else {
      _voiceMsg('Скажите вещество: «нарисуй структуру серной кислоты»');
    }
    return;
  }
  if (t === 'добавить изображение') { document.getElementById('img-file-input')?.click(); return; }
  if (t === 'добавить иконку') {
    if (typeof openIconModal === 'function') openIconModal();
    return;
  }
  // Shape commands — insert directly via insertShapeSelected
  const shapeIdMap = {
    'добавить прямоугольник': 'rect',
    'добавить круг': 'ellipse',
    'добавить стрелку': 'arrow',
    'добавить треугольник': 'triangle',
    'добавить звезду': 'star5',
    'добавить ромб': 'diamond',
    'добавить сердце': 'heart',
    'добавить облако': 'cloud',
    'добавить крест': 'cross',
    'добавить шестиугольник': 'hexagon',
    'добавить фигуру': null, // null = random
  };
  if (t in shapeIdMap) {
    if (typeof pushUndo === 'function') pushUndo();
    // Pick shape id: specific or random from SHAPES
    let shapeId = shapeIdMap[t];
    if (!shapeId && typeof SHAPES !== 'undefined') {
      const basicShapes = ['rect','ellipse','triangle','star5','diamond','heart','cloud','hexagon','arrow'];
      shapeId = basicShapes[Math.floor(Math.random() * basicShapes.length)];
    }
    const sh = typeof SHAPES !== 'undefined' ? SHAPES.find(s => s.id === shapeId) : null;
    if (!sh || !slides[cur]) return;
    // Get colors from theme or defaults
    let fill = '#3b82f6', stroke = '#1d4ed8';
    if (typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0 && typeof THEMES !== 'undefined') {
      const th = THEMES[appliedThemeIdx];
      if (th) { fill = th.shapeFill || fill; stroke = th.shapeStroke || stroke; }
    }
    const _isCallout = sh.special === 'callout';
    const _isCloud = sh.special === 'cloud';
    const _size = _isCloud ? (window._CLOUD_INSERT_SIZE || 1000) : 200;
    const cW = typeof canvasW !== 'undefined' ? canvasW : 1200;
    const cH = typeof canvasH !== 'undefined' ? canvasH : 675;
    const d = {
      id: 'e' + (++ec), type: 'shape',
      x: Math.round((cW - _size) / 2), y: Math.round((cH - _size) / 2),
      w: _size, h: _size, shape: sh.id,
      fill: _isCloud ? '#b5d5f0' : fill,
      stroke: _isCloud ? '#1d4ed8' : stroke,
      sw: _isCloud ? 0 : 2,
      rx: _isCallout ? 12 : 0, fillOp: 1,
      shadow: false, shadowBlur: 8, shadowColor: '#000000',
      shapeHtml: '', shapeTextCss: 'font-size:24px;font-weight:700;color:#ffffff;text-align:center;',
      tailX: _isCallout ? 0 : undefined, tailY: _isCallout ? 130 : undefined,
      rot: 0, anims: [],
      cloudSeed: _isCloud ? (Math.floor(Math.random() * 999999) + 1) : undefined,
      cloudForm: _isCloud ? 'puff' : undefined
    };
    if (_isCloud && typeof _cloudBakeAndFit === 'function') _cloudBakeAndFit(d, null);
    slides[cur].els.push(d);
    if (typeof mkEl === 'function') mkEl(d);
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
    requestAnimationFrame(() => {
      const cv = document.getElementById('canvas'); if (!cv) return;
      const el = cv.querySelector(`.el[data-id="${d.id}"]`);
      if (el && typeof pick === 'function') pick(el);
    });
    return;
  }

  // ── Перемещение ──
  // step: number or 'obj' (= object size: width for h, height for v)
  const _getStep = (t2, axis) => {
    const m = t2.match(/на (\d+)/);
    if (m) return parseInt(m[1]);
    if (t2.includes('obj') || !m) {
      // default = object dimension
      if (hasSel()) {
        const d2 = slides[cur]?.els.find(e => e.id === sel.dataset.id);
        if (d2) return axis === 'h' ? d2.w : d2.h;
      }
      return 50;
    }
    return 50;
  };
  // Если только что сдвинули «влево на obj», а сейчас «влево на 20» — скорректировать до 20
  const _moveDir = (t2) => {
    const m = t2.match(/^(вверх|вниз|влево|вправо)/);
    return m ? m[1] : null;
  };
  const _doMove = (dx, dy, t2) => {
    let fdx = dx, fdy = dy;
    const dir = _moveDir(t2);
    const isPrecise = /на \d+/.test(t2);
    if (isPrecise && dir && _voiceLastMove && _voiceLastMove.dir === dir
        && _voiceLastMove.wasObj && (Date.now() - _voiceLastMove.t) < 1800) {
      fdx = dx - _voiceLastMove.dx;
      fdy = dy - _voiceLastMove.dy;
    }
    move(fdx, fdy);
    _voiceLastMove = { dir, dx, dy, wasObj: /на obj/.test(t2), t: Date.now() };
  };
  if (t.match(/^вверх/))  { _doMove(0, -_getStep(t,'v'), t); return; }
  if (t.match(/^вниз/))   { _doMove(0,  _getStep(t,'v'), t); return; }
  if (t.match(/^влево/))  { _doMove(-_getStep(t,'h'), 0, t); return; }
  if (t.match(/^вправо/)) { _doMove( _getStep(t,'h'), 0, t); return; }

  // ── Центрирование ──
  if (['по центру','по горизонтали','по вертикали','к левому краю','к правому краю','к верхнему краю','к нижнему краю'].includes(t)) {
    if (!hasSel()) return;
    const d=slides[cur]?.els.find(e=>e.id===sel.dataset.id); if (!d) return;
    if (typeof pushUndo==='function') pushUndo();
    const W=typeof canvasW!=='undefined'?canvasW:1200, H=typeof canvasH!=='undefined'?canvasH:675;
    if (t==='по центру'||t==='по горизонтали')  { d.x=Math.round((W-d.w)/2); sel.style.left=d.x+'px'; }
    if (t==='по центру'||t==='по вертикали')     { d.y=Math.round((H-d.h)/2); sel.style.top=d.y+'px'; }
    if (t==='к левому краю')  { d.x=0; sel.style.left='0px'; }
    if (t==='к правому краю') { d.x=W-d.w; sel.style.left=d.x+'px'; }
    if (t==='к верхнему краю'){ d.y=0; sel.style.top='0px'; }
    if (t==='к нижнему краю') { d.y=H-d.h; sel.style.top=d.y+'px'; }
    if (typeof save==='function') save();
    if (typeof syncProps==='function') syncProps();
    if (typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
    return;
  }

  // ── Размер ──
  const wM=t.match(/ширина (\d+)/); if (wM&&hasSel()) { _forEachSel((elT,d)=>{d.w=parseInt(wM[1]);elT.style.width=d.w+'px';}); if(typeof syncProps==='function')syncProps(); return; }
  const hM=t.match(/высота (\d+)/); if (hM&&hasSel()) { _forEachSel((elT,d)=>{d.h=parseInt(hM[1]);elT.style.height=d.h+'px';}); if(typeof syncProps==='function')syncProps(); return; }
  const whM=t.match(/размер (\d+) на (\d+)/); if (whM&&hasSel()) { _forEachSel((elT,d)=>{d.w=parseInt(whM[1]);d.h=parseInt(whM[2]);elT.style.width=d.w+'px';elT.style.height=d.h+'px';}); if(typeof syncProps==='function')syncProps(); return; }
  const rotM=t.match(/повернуть на (\d+)/); if (rotM&&hasSel()) {
    const deg=parseInt(rotM[1]); // positive = clockwise
    const d=slides[cur]?.els.find(e=>e.id===sel.dataset.id);
    if(d){
      if(typeof pushUndo==='function')pushUndo();
      d.rot=((d.rot||0)+deg)%360;
      sel.style.transform=`rotate(${d.rot}deg)`;
      sel.dataset.rot=d.rot;
      if(typeof save==='function')save();
      if(typeof syncProps==='function')syncProps();
      if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
    }
    return;
  }

  // ── Текст ──
  // ── Изменение размера объекта ──
  const sizeM = t.match(/^размер ([+\-*]) (.+)$/);
  if (sizeM && hasSel()) {
    const op = sizeM[1], val = sizeM[2];
    _forEachSel((elT, d) => {
      const applySize = (w, h) => {
        d.w = Math.max(20, Math.round(w));
        d.h = Math.max(20, Math.round(h));
        elT.style.width  = d.w + 'px';
        elT.style.height = d.h + 'px';
      };
      if (op === '*') { const factor = parseFloat(val); applySize(d.w * factor, d.h * factor); }
      else if (val.endsWith('px')) { const px = parseInt(val); applySize(d.w + (op==='+'?px:-px), d.h + (op==='+'?px:-px)); }
      else if (val.endsWith('%')) { const pct = parseInt(val)/100; applySize(d.w*(op==='+'?1+pct:1-pct), d.h*(op==='+'?1+pct:1-pct)); }
    });
    if (typeof syncProps === 'function') syncProps();
    return;
  }

  const fsM=t.match(/размер шрифта (\d+)/);
  if (fsM) {
    if (typeof setTS==='function') _forEachSel((elT) => { const _ps=sel; sel=elT; setTS('font-size', fsM[1]+'px'); sel=_ps; });
    return;
  }
  // ── Выравнивание текста ──
  if (t === 'текст центр оба') {
    if (typeof setTS === 'function') setTS('text-align', 'center');
    if (typeof setTextVAlign === 'function') setTextVAlign('middle');
    return;
  }
  if (t === 'текст горизонталь центр') { if (typeof setTS === 'function') setTS('text-align', 'center'); return; }
  if (t === 'текст горизонталь лево')  { if (typeof setTS === 'function') setTS('text-align', 'left');   return; }
  if (t === 'текст горизонталь право') { if (typeof setTS === 'function') setTS('text-align', 'right');  return; }
  if (t === 'текст вертикаль центр')   { if (typeof setTextVAlign === 'function') setTextVAlign('middle'); return; }
  if (t === 'текст вертикаль верх')    { if (typeof setTextVAlign === 'function') setTextVAlign('top');    return; }
  if (t === 'текст вертикаль низ')     { if (typeof setTextVAlign === 'function') setTextVAlign('bottom'); return; }

  if (t === 'жирный') { document.execCommand('bold'); return; }
  if (t === 'курсив') { document.execCommand('italic'); return; }

  // ── Прочее ──
  if (t === 'разместить объекты') { if (typeof autoPlaceAll==='function') autoPlaceAll(); return; }

  // ── Начать/остановить показ ──
  if (t === 'начать показ') {
    if (typeof startPreview==='function') startPreview();
    else { const btn=document.getElementById('preview-btn'); if(btn) btn.click(); }
    return;
  }
  if (t === 'остановить показ') {
    const ov=document.getElementById('preview-ov');
    if(ov&&ov.classList.contains('active')){ if(typeof stopPreview==='function') stopPreview(); else { const btn=document.getElementById('preview-close'); if(btn) btn.click(); } }
    return;
  }

  // ── Размер по одной оси ──
  const sizeAxisM = t.match(/^размер \+ (\d+)%(w|h)$/);
  if (sizeAxisM && hasSel()) {
    const pct = parseInt(sizeAxisM[1])/100;
    const axis = sizeAxisM[2];
    _forEachSel((elT, d) => {
      if (axis==='w') { d.w=Math.round(d.w*(1+pct)); elT.style.width=d.w+'px'; }
      else { d.h=Math.round(d.h*(1+pct)); elT.style.height=d.h+'px'; }
    });
    if (typeof syncProps==='function') syncProps();
    return;
  }

  // ── Прозрачность объекта ──
  const opM = t.match(/^прозрачность (\d+)$/);
  if (opM && hasSel()) {
    const val = Math.min(1, parseInt(opM[1]) / 100);
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id);
    if (d) { if (typeof pushUndo==='function') pushUndo(); d.elOpacity = val; sel.style.opacity = val; if (typeof save==='function') save(); }
    return;
  }

  // ── Межстрочный интервал ──
  const lhM = t.match(/^межстрочный ([\d.]+)$/);
  if (lhM && typeof setTS==='function') { setTS('line-height', lhM[1]); return; }

  // ── Межбуквенный интервал ──
  const lsM = t.match(/^межбуквенный (-?[\d.]+)$/);
  if (lsM && typeof setTS==='function') { setTS('letter-spacing', lsM[1]+'px'); return; }

  // ── Скрыть/показать ──
  if (t === 'скрыть объект' && hasSel()) {
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id);
    if (d) { if (typeof pushUndo==='function') pushUndo(); d.objHidden = true; sel.style.opacity = '0'; sel.style.pointerEvents = 'none'; if (typeof save==='function') save(); }
    return;
  }
  if (t === 'показать объект' && hasSel()) {
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id);
    if (d) { if (typeof pushUndo==='function') pushUndo(); delete d.objHidden; sel.style.opacity = d.elOpacity != null ? d.elOpacity : '1'; sel.style.pointerEvents = ''; if (typeof save==='function') save(); }
    return;
  }

  // ── Отразить ──
  if (t === 'отразить горизонтально' && hasSel()) {
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id);
    if (d && typeof pushUndo==='function') pushUndo();
    if (d && d.type === 'image') { d.imgFlipH = !d.imgFlipH; if (typeof mkEl==='function'&&typeof load==='function') load(); }
    return;
  }
  if (t === 'отразить вертикально' && hasSel()) {
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id);
    if (d && typeof pushUndo==='function') pushUndo();
    if (d && d.type === 'image') { d.imgFlipV = !d.imgFlipV; if (typeof load==='function') load(); }
    return;
  }

  // ── Анимации ──
  const animCmdM = t.match(/^анимация (появление|качение|танец|плавание)$/);
  if (animCmdM && hasSel()) {
    const animMap = {появление:'fadeIn', качение:'swing', танец:'dance', плавание:'float'};
    const aName = animMap[animCmdM[1]];
    if (aName && typeof window.addAnimToSel==='function') { window._selectedAnimName=aName; window.addAnimToSel(aName,'live'); }
    return;
  }
  if (t === 'очистить анимации') { if (typeof window.clearAllAnims==='function') window.clearAllAnims(); return; }

  // ── Переходы ──
  if (t === 'переход fade') { if (typeof applyTransitionToAll==='function') applyTransitionToAll('fade'); return; }
  if (t === 'переход slide') { if (typeof applyTransitionToAll==='function') applyTransitionToAll('slide'); return; }
  if (t === 'убрать переход') { if (typeof applyTransitionToAll==='function') applyTransitionToAll('none'); return; }

  // ── Скругление элемента (rx через border-radius) ──
  const rxElM = t.match(/^скругление rx (\d+)$/);
  if (rxElM && hasSel()) {
    const v = parseInt(rxElM[1]);
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id);
    if (d) { if (typeof pushUndo==='function') pushUndo(); d.rx_tl=d.rx_tr=d.rx_bl=d.rx_br=v; sel.style.borderRadius=v+'px'; if (typeof save==='function') save(); }
    return;
  }

  // ── Отступы ──
  const padM = t.match(/^отступ (\d+)$/);
  if (padM && hasSel()) {
    const v = parseInt(padM[1]);
    const inp = document.getElementById('p-pad-t');
    ['p-pad-t','p-pad-r','p-pad-b','p-pad-l'].forEach(id => { const el2=document.getElementById(id); if(el2){el2.value=v;} });
    if (typeof commitPadding==='function') commitPadding(); else if (typeof setES==='function') setES('padding', v, 'px');
    return;
  }

  // ── Ссылка ──
  const linkM = t.match(/^ссылка (.+)$/);
  if (linkM && hasSel()) {
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id);
    if (d) { d.link = linkM[1]; sel.dataset.link = linkM[1]; if (typeof save==='function') save(); }
    return;
  }
  if (t === 'убрать ссылку' && hasSel()) {
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id);
    if (d) { delete d.link; delete sel.dataset.link; if (typeof save==='function') save(); }
    return;
  }

  // ── Выравнивание всех объектов ──
  if (t.startsWith('выровнять все ') || t.startsWith('распределить ')) {
    const cv = document.getElementById('canvas'); if (!cv) return;
    const els2 = Array.from(cv.querySelectorAll('.el:not(.decor-el)'));
    if (!els2.length) return;
    if (typeof pushUndo==='function') pushUndo();
    const W=typeof canvasW!=='undefined'?canvasW:1200, H=typeof canvasH!=='undefined'?canvasH:675;
    if (t === 'выровнять все по левому краю') els2.forEach(el2 => { const d=slides[cur]?.els.find(e=>e.id===el2.dataset.id); if(d){d.x=0;el2.style.left='0px';} });
    if (t === 'выровнять все по правому краю') els2.forEach(el2 => { const d=slides[cur]?.els.find(e=>e.id===el2.dataset.id); if(d){d.x=W-d.w;el2.style.left=d.x+'px';} });
    if (t === 'выровнять все по верху') els2.forEach(el2 => { const d=slides[cur]?.els.find(e=>e.id===el2.dataset.id); if(d){d.y=0;el2.style.top='0px';} });
    if (t === 'выровнять все по низу') els2.forEach(el2 => { const d=slides[cur]?.els.find(e=>e.id===el2.dataset.id); if(d){d.y=H-d.h;el2.style.top=d.y+'px';} });
    if (t === 'распределить горизонтально') {
      els2.sort((a,b)=>(parseInt(a.style.left)||0)-(parseInt(b.style.left)||0));
      const gap=(W-els2.reduce((s,e)=>s+(parseInt(e.style.width)||0),0))/(els2.length+1);
      let cx=gap; els2.forEach(el2=>{const d=slides[cur]?.els.find(e=>e.id===el2.dataset.id);if(d){d.x=Math.round(cx);el2.style.left=d.x+'px';cx+=d.w+gap;}});
    }
    if (t === 'распределить вертикально') {
      els2.sort((a,b)=>(parseInt(a.style.top)||0)-(parseInt(b.style.top)||0));
      const gap=(H-els2.reduce((s,e)=>s+(parseInt(e.style.height)||0),0))/(els2.length+1);
      let cy=gap; els2.forEach(el2=>{const d=slides[cur]?.els.find(e=>e.id===el2.dataset.id);if(d){d.y=Math.round(cy);el2.style.top=d.y+'px';cy+=d.h+gap;}});
    }
    if (typeof save==='function') save(); if (typeof drawThumbs==='function') drawThumbs();
    return;
  }

  // ── Роль текстового элемента ──
  const roleM = t.match(/^роль (заголовок|подзаголовок|текст)$/);
  if (roleM && hasSel() && sel.dataset.type === 'text') {
    const roleMap = {заголовок:'title', подзаголовок:'subtitle', текст:'body'};
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id);
    if (d) {
      d.textRole = roleMap[roleM[1]];
      sel.dataset.textRole = d.textRole;
      if (typeof save === 'function') save();
      _voiceMsg('Роль: ' + roleM[1], 'ok');
    }
    return;
  }

  // ── Темы ──
  if (t === 'тема случайная' || t === 'тема тёмная' || t === 'тема светлая') {
    if (typeof THEMES === 'undefined') return;
    let candidates;
    if (t === 'тема тёмная')   candidates = THEMES.map((th,i)=>({th,i})).filter(({th})=>th.dark);
    else if (t === 'тема светлая') candidates = THEMES.map((th,i)=>({th,i})).filter(({th})=>!th.dark);
    else candidates = THEMES.map((th,i)=>({th,i}));
    if (!candidates.length) return;
    const pick2 = candidates[Math.floor(Math.random()*candidates.length)];
    // selTheme is a global 'let' — assign directly, not via window
    selTheme = pick2.i;
    if (typeof applyTheme === 'function') applyTheme();
    _voiceMsg('Тема: ' + pick2.th.name, 'ok');
    return;
  }

  if (t === 'сохранить') { if (typeof save==='function') save(); _voiceMsg('Сохранено','ok'); return; }
  if (t === 'экспортировать') { if (typeof exportHTML==='function') exportHTML(); return; }
  if (t === 'полный экран') { document.documentElement.requestFullscreen?.(); return; }

  // ── Новая презентация ──
  if (t === 'новая презентация') {
    if (typeof newPresentation === 'function') newPresentation();
    else if (typeof resetSlides === 'function') resetSlides();
    return;
  }

  // ── Цвет заливки ──
  const _colorMap = {
    красный:'#e53e3e', красного:'#e53e3e', красная:'#e53e3e',
    'светло-красный':'#fc8181', 'светло-красного':'#fc8181',
    'тёмно-красный':'#9b2335', 'тёмно-красного':'#9b2335',
    синий:'#3b82f6', синего:'#3b82f6', синяя:'#3b82f6',
    'светло-синий':'#93c5fd', 'тёмно-синий':'#1d4ed8',
    зелёный:'#22c55e', зелёного:'#22c55e', зелёная:'#22c55e', зеленый:'#22c55e',
    'светло-зелёный':'#86efac', 'тёмно-зелёный':'#15803d',
    жёлтый:'#eab308', жёлтого:'#eab308', жёлтая:'#eab308', желтый:'#eab308',
    'светло-жёлтый':'#fef08a', 'тёмно-жёлтый':'#854d0e',
    оранжевый:'#f97316', оранжевого:'#f97316', 'светло-оранжевый':'#fdba74',
    фиолетовый:'#a855f7', фиолетового:'#a855f7', 'тёмно-фиолетовый':'#6b21a8',
    розовый:'#ec4899', розового:'#ec4899', 'светло-розовый':'#f9a8d4',
    белый:'#ffffff', белого:'#ffffff', белая:'#ffffff',
    чёрный:'#000000', чёрного:'#000000', чёрная:'#000000', черный:'#000000',
    серый:'#6b7280', серого:'#6b7280', серая:'#6b7280',
    'светло-серый':'#d1d5db', 'тёмно-серый':'#374151',
    голубой:'#38bdf8', голубого:'#38bdf8',
    бирюзовый:'#14b8a6', бирюзового:'#14b8a6',
    коралловый:'#f87171', кораллового:'#f87171',
    прозрачный:'transparent', прозрачного:'transparent',
  };
  // Resolve color from phrase including compound like "светло-красный"
  function _resolveColor(phrase) {
    if (_colorMap[phrase]) return _colorMap[phrase];
    // Try replacing spaces with dashes for compound colors
    const withDash = phrase.replace(/\s+/g, '-');
    if (_colorMap[withDash]) return _colorMap[withDash];
    return null;
  }
  const fillColorM = t.match(/^цвет заливки ([а-яёА-ЯЁ-]+)$/);
  if (fillColorM) {
    const hex = _resolveColor(fillColorM[1]) || null;
    if (hex) {
      _forEachSel((elT, d) => {
        if (elT.dataset.type === 'shape' && typeof updateShapeStyle === 'function') {
          if (typeof sel !== 'undefined') { const _ps = sel; sel = elT; updateShapeStyle('fill', hex); sel = _ps; }
        } else if (elT.dataset.type === 'text' && typeof setTS === 'function') {
          const _ps = sel; sel = elT; setTS('background-color', hex); sel = _ps;
        }
      });
    }
    return;
  }

  // ── Цвет границы ──
  const strokeColorM = t.match(/^цвет границы ([а-яёА-ЯЁ-]+)$/);
  if (strokeColorM) {
    const hex = _resolveColor(strokeColorM[1]) || null;
    if (hex) {
      _forEachSel((elT) => {
        if (elT.dataset.type === 'shape' && typeof updateShapeStyle === 'function') {
          const _ps = sel; sel = elT; updateShapeStyle('stroke', hex); sel = _ps;
        }
      });
    }
    return;
  }

  // ── Толщина границы ──
  const strokeWM = t.match(/^толщина границы (\d+)$/);
  if (strokeWM && hasSel() && typeof updateShapeStyle === 'function') {
    updateShapeStyle('sw', parseInt(strokeWM[1]));
    return;
  }

  // ── Скругление ──
  const rxM = t.match(/^скругление (\d+)$/);
  if (rxM && hasSel() && typeof updateShapeStyle === 'function') {
    updateShapeStyle('rx', parseInt(rxM[1]));
    return;
  }

  // ── Фон слайда ──
  const bgM = t.match(/^фон слайда ([а-яёА-ЯЁ]+)$/);
  if (bgM) {
    const hex = _resolveColor(bgM[1]) || null;
    if (hex && typeof setCustomBg === 'function') setCustomBg(hex);
    return;
  }

  // ── Позиция в угол ──
  if (t.startsWith('угол ') && hasSel()) {
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id); if (!d) return;
    if (typeof pushUndo === 'function') pushUndo();
    const W = typeof canvasW !== 'undefined' ? canvasW : 1200;
    const H = typeof canvasH !== 'undefined' ? canvasH : 675;
    const pad = 10;
    if (t === 'угол право верх') { d.x = W-d.w-pad; d.y = pad; }
    if (t === 'угол право низ')  { d.x = W-d.w-pad; d.y = H-d.h-pad; }
    if (t === 'угол лево верх')  { d.x = pad; d.y = pad; }
    if (t === 'угол лево низ')   { d.x = pad; d.y = H-d.h-pad; }
    sel.style.left = d.x + 'px'; sel.style.top = d.y + 'px';
    if (typeof save === 'function') save();
    if (typeof syncProps === 'function') syncProps();
    if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
    return;
  }

  // ── Диктовка — ввод текста голосом в выбранный элемент ──
  if (t === 'начать диктовку') {
    if (!hasSel()) { _voiceMsg('Выберите текстовый элемент'); return; }
    _startDictation(sel);
    return;
  }
  if (t === 'остановить диктовку') {
    _stopDictation();
    return;
  }

  // ── Очистить текст ──
  if (t === 'очистить текст' && hasSel()) {
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id);
    if (d) {
      if (typeof pushUndo === 'function') pushUndo();
      if (d.type === 'text') {
        d.html = '';
        const tel = sel.querySelector('.tel');
        if (tel) tel.innerHTML = '';
      } else if (d.type === 'shape') {
        d.shapeHtml = '';
        const stxt = sel.querySelector('.shape-text');
        if (stxt) stxt.textContent = '';
      }
      if (typeof save === 'function') save();
      if (typeof drawThumbs === 'function') drawThumbs();
    }
    return;
  }

  // ── Редактировать текст ──
  if (t === 'редактировать текст') {
    if (!hasSel()) return;
    const tel = sel.querySelector('.tel');
    if (tel) { tel.contentEditable = 'true'; tel.style.pointerEvents = 'auto'; tel.focus(); }
    return;
  }

  // ── Установить/заменить текст ──
  const setTextM = t.match(/^установить текст (.+)$/);
  if (setTextM) {
    const newText = setTextM[1];
    if (!hasSel()) return;
    const d = slides[cur]?.els.find(e => e.id === sel.dataset.id); if (!d) return;
    if (typeof pushUndo === 'function') pushUndo();
    if (sel.dataset.type === 'text') {
      // Replace text content keeping formatting
      const tel = sel.querySelector('.tel');
      if (tel) {
        tel.textContent = newText;
        d.html = tel.innerHTML;
        if (typeof save === 'function') save();
        if (typeof drawThumbs === 'function') drawThumbs();
      }
    } else if (sel.dataset.type === 'shape') {
      d.shapeHtml = newText;
      const stxt = sel.querySelector('.shape-text');
      if (stxt) stxt.textContent = newText;
      if (typeof save === 'function') save();
    }
    return;
  }

  // ── Удалить по позиции ──
  if (t.match(/^удалить (нижний|верхний|левый|правый)$/)) {
    const dir = t.replace('удалить ', '');
    const cv = document.getElementById('canvas'); if (!cv) return;
    const all = Array.from(cv.querySelectorAll('.el:not(.decor-el)'));
    if (!all.length) return;
    const W = typeof canvasW !== 'undefined' ? canvasW : 1200;
    const H = typeof canvasH !== 'undefined' ? canvasH : 675;
    let best = null;
    if (dir === 'нижний') best = all.reduce((a,b) => (parseInt(b.style.top)||0) > (parseInt(a.style.top)||0) ? b : a);
    if (dir === 'верхний') best = all.reduce((a,b) => (parseInt(b.style.top)||0) < (parseInt(a.style.top)||0) ? b : a);
    if (dir === 'правый')  best = all.reduce((a,b) => (parseInt(b.style.left)||0) > (parseInt(a.style.left)||0) ? b : a);
    if (dir === 'левый')   best = all.reduce((a,b) => (parseInt(b.style.left)||0) < (parseInt(a.style.left)||0) ? b : a);
    if (best) {
      const d = slides[cur]?.els.find(e => e.id === best.dataset.id);
      if (d) {
        if (typeof pushUndo === 'function') pushUndo();
        slides[cur].els.splice(slides[cur].els.indexOf(d), 1);
        best.remove();
        if (typeof pick === 'function') pick(null);
        if (typeof save === 'function') save();
        if (typeof drawThumbs === 'function') drawThumbs();
      }
    }
    return;
  }

  // ── Размытый фон ──
  if (t === 'размытый фон') {
    // Apply backdrop blur to current slide bg — use textBgBlur on cvbg or set a blur overlay
    const cvbg = document.getElementById('cvbg');
    if (cvbg) { cvbg.style.filter = 'blur(4px)'; cvbg.style.transform = 'scale(1.05)'; }
    return;
  }
  if (t === 'убрать размытие фона') {
    const cvbg = document.getElementById('cvbg');
    if (cvbg) { cvbg.style.filter = ''; cvbg.style.transform = ''; }
    return;
  }

  // ── Градиент заливки ──
  const gradM = t.match(/^градиент ([а-яёА-ЯЁ-]+) ([а-яёА-ЯЁ-]+)$/);
  if (gradM && hasSel()) {
    const c1 = _resolveColor(gradM[1]), c2 = _resolveColor(gradM[2]);
    if (c1 && c2 && sel.dataset.type === 'shape' && typeof updateShapeStyle === 'function') {
      // Use a gradient as fill — store as CSS gradient string
      const grad = `linear-gradient(135deg,${c1},${c2})`;
      const d = slides[cur]?.els.find(e => e.id === sel.dataset.id);
      if (d) { d.fill = c1; } // store base color for data
      // Apply visually via fill override
      const svgEl = sel.querySelector('svg');
      if (svgEl) {
        const fills = svgEl.querySelectorAll('[fill]');
        fills.forEach(f => { if (f.getAttribute('fill') !== 'none') f.setAttribute('fill', 'url(#vg)'); });
        // Add gradient def
        let defs = svgEl.querySelector('defs');
        if (!defs) { defs = document.createElementNS('http://www.w3.org/2000/svg','defs'); svgEl.prepend(defs); }
        defs.innerHTML = `<linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient>`;
      }
    }
    return;
  }

  // ── Тип границы ──
  const strokeStyleM = t.match(/^тип границы (dash|solid|dot)$/);
  if (strokeStyleM && hasSel() && typeof updateShapeStyle === 'function') {
    updateShapeStyle('strokeStyle', strokeStyleM[1]);
    return;
  }

  // ── Цвет текста ──
  const textColorM = t.match(/^цвет текста ([а-яёА-ЯЁ-]+)$/);
  if (textColorM) {
    const hex = _resolveColor(textColorM[1]) || null;
    if (hex && typeof setTS === 'function') {
      _forEachSel((elT) => { const _ps=sel; sel=elT; setTS('color', hex); sel=_ps; });
    }
    return;
  }

  // ── Выбрать/удалить объект по пространственному признаку ──
  function _findSpatial(direction) {
    const cv = document.getElementById('canvas'); if (!cv) return null;
    const all = Array.from(cv.querySelectorAll('.el:not(.decor-el)'));
    if (!all.length) return null;
    const W = typeof canvasW !== 'undefined' ? canvasW : 1200;
    const H = typeof canvasH !== 'undefined' ? canvasH : 675;
    if (direction === 'центр') {
      // Closest to canvas center
      const cx = W/2, cy = H/2;
      let best = null, bestD = Infinity;
      all.forEach(el => {
        const ex = (parseInt(el.style.left)||0) + (parseInt(el.style.width)||0)/2;
        const ey = (parseInt(el.style.top)||0) + (parseInt(el.style.height)||0)/2;
        const d = Math.hypot(ex-cx, ey-cy);
        if (d < bestD) { bestD = d; best = el; }
      });
      return best;
    }
    if (!hasSel()) return null;
    const curY = parseInt(sel.style.top)||0;
    const curX = parseInt(sel.style.left)||0;
    let best = null, bestDist = Infinity;
    all.forEach(el => {
      if (el === sel) return;
      const y = parseInt(el.style.top)||0;
      const diff = direction === 'выше' ? curY - y : y - curY;
      if (diff > 0 && diff < bestDist) { bestDist = diff; best = el; }
    });
    return best;
  }

  if (t === 'объект выше' || t === 'объект ниже' || t === 'объект по центру') {
    const dir = t === 'объект выше' ? 'выше' : t === 'объект ниже' ? 'ниже' : 'центр';
    const found = _findSpatial(dir);
    if (found && typeof pick === 'function') { pick(found); _lastCtx = 'select'; }
    return;
  }
  if (t === 'удалить объект выше' || t === 'удалить объект ниже' || t === 'удалить объект по центру') {
    const dir = t.includes('выше') ? 'выше' : t.includes('ниже') ? 'ниже' : 'центр';
    const found = _findSpatial(dir);
    if (found) {
      const d = slides[cur]?.els.find(e => e.id === found.dataset.id);
      if (d) {
        if (typeof pushUndo === 'function') pushUndo();
        slides[cur].els.splice(slides[cur].els.indexOf(d), 1);
        found.remove();
        if (typeof pick === 'function') pick(null);
        if (typeof save === 'function') save();
        if (typeof drawThumbs === 'function') drawThumbs();
      }
    }
    return;
  }

  // Unknown — skip noise (single punctuation, very short fragments)
  if (raw.replace(/[.,!?\s]/g,'').length < 2) {
    _logEntry.status = 'noise';
    return;
  }
  _logEntry.status = 'unknown';
  _unknownCmds.push(raw);
  if (typeof window._syncVoiceExportBtn === 'function') window._syncVoiceExportBtn();
  _voiceMsg('Неизвестная команда: «' + raw + '»');
}

// ── Streaming command buffer ───────────────────────────────────────
// Накапливает речь и исполняет команды по мере появления в тексте,
// не дожидаясь конца всей фразы (кроме последней незавершённой команды).
let _voiceBuf = '';
let _voiceStableTimer = null;
let _voiceMode = 'cloud'; // 'local' | 'cloud' | 'unknown'
let _voiceRecent = []; // recently executed normalized cmds (anti double-fire)
let _voiceLastMove = null; // {dir, dx, dy, wasObj, t} — для отмены преждевременного сдвига

function _voiceClean(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?…:;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function _voiceMarkDone(norm) {
  const now = Date.now();
  _voiceRecent = _voiceRecent.filter(x => now - x.t < 1600);
  _voiceRecent.push({ norm, t: now });
}

function _voiceAlreadyDone(norm) {
  const now = Date.now();
  _voiceRecent = _voiceRecent.filter(x => now - x.t < 1600);
  return _voiceRecent.some(x => x.norm === norm);
}

/** Команда может дорасти (не стрелять «влево», пока идёт «на 20»). */
function _voiceCmdCanGrow(norm, rest, isFinal) {
  const restC = _voiceClean(rest);
  if (/^(вверх|вниз|влево|вправо) на obj$/.test(norm)) {
    if (!restC && !isFinal) return true;
    // «на …» с продолжением — ждём число; голое «на» в финале не блокируем
    if (/^на\s+\S/.test(restC)) return true;
    if (/^на$/i.test(restC)) return !isFinal;
  }
  return false;
}

/** Съесть единицы измерения / обрывки после уже распознанной команды. */
function _voiceConsumeTrailingFluff(rest) {
  return _voiceClean(rest)
    .replace(/^(пикселей|пикселя|пиксель|px|пкс|градусов|градуса|градус|процентов|процент)\s*/i, '')
    .replace(/^на$/i, '')
    .trim();
}

/** Longest known command at the start of text (by words). */
function _voiceLongestHit(text) {
  const t = _voiceClean(text);
  if (!t) return null;
  const words = t.split(' ');
  for (let n = words.length; n >= 1; n--) {
    const cand = words.slice(0, n).join(' ');
    const norm = _normalize(cand);
    if (_lastNormHit) return { cand, norm, wordCount: n, words };
  }
  return null;
}

/**
 * Scan buffer and execute complete commands.
 * @param {string} text
 * @param {boolean} isFinal - if false, keep a trailing full-match (may still grow)
 * @returns {string} leftover unparsed text
 */
function _voiceStreamExecute(text, isFinal) {
  let rest = _voiceClean(text);
  let guard = 0;
  while (rest && guard++ < 20) {
    const hit = _voiceLongestHit(rest);
    if (!hit) break;
    const leftover = hit.words.slice(hit.wordCount).join(' ');
    const entire = hit.wordCount === hit.words.length;
    // Пока фраза не финальна и команда занимает весь буфер — ждём продолжения
    if (entire && !isFinal) break;
    // «влево» + ещё «на двадцать…» — не сдвигать на ширину объекта
    if (_voiceCmdCanGrow(hit.norm, leftover, isFinal)) break;
    if (!_voiceAlreadyDone(hit.norm)) {
      _voiceMarkDone(hit.norm);
      _handleCommand(hit.cand);
    }
    rest = _voiceConsumeTrailingFluff(leftover);
  }
  if (isFinal && rest && rest.replace(/\s+/g, '').length >= 3) {
    _unknownCmds.push(rest);
    _voiceLog.push({
      raw: rest,
      normalized: rest,
      ts: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'unknown',
    });
    if (typeof window._syncVoiceExportBtn === 'function') window._syncVoiceExportBtn();
    _voiceMsg('Неизвестная команда: «' + rest + '»');
    rest = '';
  }
  return rest;
}

function _voiceClearStableTimer() {
  if (_voiceStableTimer) {
    clearTimeout(_voiceStableTimer);
    _voiceStableTimer = null;
  }
}

function _voiceScheduleStable(combined) {
  _voiceClearStableTimer();
  // Для сдвига с возможным «на N» ждём чуть дольше, чтобы не сработать на голом «влево»
  const growable = /^(вверх|вниз|влево|вправо|перемест|сдвин|двигай|смести)/i.test(_voiceClean(combined).split(/\s+/)[0] || '');
  _voiceStableTimer = setTimeout(() => {
    _voiceStableTimer = null;
    if (!_active || _dictMode) return;
    _voiceBuf = _voiceStreamExecute(combined, true);
  }, growable ? 700 : 420);
}

// ── Speech Recognition ─────────────────────────────────────────────
function _startRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    _voiceMsg(_voiceUiLang() === 'en' ? 'Speech recognition is not supported' : 'Браузер не поддерживает распознавание речи');
    return false;
  }

  // Reuse existing recognition object to avoid re-requesting microphone permission
  if (!_recognition) {
    _recognition = new SpeechRecognition();
    _recognition.continuous = true;
    _recognition.interimResults = true;
    _recognition.maxAlternatives = 1;
    _setupRecognitionHandlers();
    _setupLocalRecognition(_recognition, SpeechRecognition);
  }
  _recognition.lang = _voiceSpeechLang();

  _voiceBuf = '';
  _voiceClearStableTimer();
  try { _recognition.start(); } catch(e) {}
  _startMicLevel();
  return true;
}

/** Prefer on-device recognition when the browser supports it (Chrome/Edge + language pack). */
function _setupLocalRecognition(rec, SpeechRecognition) {
  _voiceMode = 'unknown';
  const finish = (mode, msg) => {
    _voiceMode = mode;
    if (msg) setTimeout(() => _voiceMsg(msg, mode === 'local' ? 'ok' : ''), 350);
  };

  try {
    if (!('processLocally' in rec)) {
      finish('cloud', 'Распознавание через сеть (офлайн в этом браузере недоступен)');
      return;
    }
  } catch (e) {
    finish('cloud');
    return;
  }

  const tryLocal = async () => {
    const packLang = _voiceSpeechLang();
    try {
      rec.processLocally = true;
      if (typeof SpeechRecognition.available !== 'function') {
        finish('local', _voiceUiLang() === 'en'
          ? 'On-device recognition (if language pack installed)'
          : 'Режим: локальное распознавание (если пакет языка установлен)');
        return;
      }
      const avail = await SpeechRecognition.available({ langs: [packLang], processLocally: true });
      if (avail === 'available') {
        finish('local', _voiceUiLang() === 'en' ? 'Offline recognition ready' : 'Офлайн-распознавание готово');
        return;
      }
      if ((avail === 'downloadable' || avail === 'downloading') && typeof SpeechRecognition.install === 'function') {
        _voiceMsg(_voiceUiLang() === 'en' ? ('Downloading offline pack ' + packLang + '…') : ('Скачивание офлайн-пакета ' + packLang + '…'));
        const ok = await SpeechRecognition.install({ langs: [packLang], processLocally: true });
        if (ok) {
          finish('local', _voiceUiLang() === 'en' ? 'Offline pack installed' : 'Офлайн-пакет установлен');
          return;
        }
      }
      try { rec.processLocally = false; } catch (e2) {}
      finish('cloud', _voiceUiLang() === 'en' ? 'Offline pack unavailable — internet required' : 'Офлайн-пакет недоступен — нужен интернет');
    } catch (err) {
      try { rec.processLocally = false; } catch (e2) {}
      finish('cloud', _voiceUiLang() === 'en' ? 'Using network recognition' : 'Распознавание через сеть');
    }
  };
  tryLocal();
}

function _setupRecognitionHandlers() {
  _recognition.onresult = (e) => {
    const result = e.results[e.resultIndex];
    const piece = ((result[0] && result[0].transcript) || '').trim();

    // ── Dictation ──
    if (_dictMode) {
      if (!result.isFinal) {
        if (_dictEl && piece) {
          const tel = _dictEl.querySelector('.tel');
          const preview = (_dictText ? _dictText + ' ' : '') + piece;
          if (tel) tel.textContent = preview;
        }
        return;
      }
      if (!piece) return;
      const lower = piece.toLowerCase().replace(/[.,!?]/g, '').trim();
      if (lower === 'стоп' || lower === 'остановить диктовку' || lower === 'стоп диктовка' || lower === 'завершить диктовку'
          || lower === 'stop' || lower === 'stop dictation' || lower === 'end dictation') {
        _stopDictation();
        return;
      }
      const processed = _dictApplyPunct(piece);
      _dictText = (_dictText && !_dictText.endsWith('\n') ? _dictText + ' ' : _dictText) + processed;
      _dictText = _dictText.replace(/ ([,\.!?:;…])/g, '$1').replace(/  +/g, ' ').trimStart();
      if (_dictEl) {
        const tel = _dictEl.querySelector('.tel');
        if (tel) tel.textContent = _dictText;
        const d2 = slides[cur]?.els.find(el => el.id === _dictEl.dataset.id);
        if (d2 && d2.type === 'text') d2.html = tel ? tel.innerHTML : _dictText;
        else if (d2 && d2.type === 'shape') {
          d2.shapeHtml = _dictText;
          const stxt = _dictEl.querySelector('.shape-text');
          if (stxt) stxt.textContent = _dictText;
        }
      }
      _voiceMsg('🎤 ' + _dictText.slice(-80));
      return;
    }

    // ── Command mode (streaming) ──
    if (!piece) return;

    if (!result.isFinal) {
      const combined = [_voiceBuf, piece].filter(Boolean).join(' ');
      const before = _voiceClean(combined);
      const leftover = _voiceStreamExecute(combined, false);
      // Если из потока уже вырезали команду(ы) — не тащим их снова в финале
      if (_voiceClean(leftover) !== before) {
        const cleanPiece = _voiceClean(piece);
        const cleanLeft = _voiceClean(leftover);
        if (cleanPiece && (cleanLeft === cleanPiece || cleanLeft.endsWith(' ' + cleanPiece) || cleanLeft.endsWith(cleanPiece))) {
          // хвост = текущий interim (или его конец) → финальный буфер очищен
          _voiceBuf = '';
        } else {
          // хвост без текущего interim
          _voiceBuf = cleanLeft;
        }
      }
      // Последнюю ещё растущую команду добьём после короткой паузы в речи
      _voiceScheduleStable(leftover);
      return;
    }

    _voiceClearStableTimer();
    _voiceBuf = _voiceStreamExecute([_voiceBuf, piece].filter(Boolean).join(' '), true);
  };

  _recognition.onerror = (e) => {
    if (e.error === 'no-speech') return;
    if (e.error === 'aborted') return;
    if (e.error === 'network') {
      if (_voiceMode === 'local') {
        _voiceMsg('Сеть не нужна при офлайн-пакете — перезапуск…');
      }
      if (_active) setTimeout(() => { try { _recognition.abort(); } catch(e2){} setTimeout(()=>{ try { _recognition.start(); } catch(err) {} }, 50); }, 500);
      return;
    }
    if (e.error === 'language-not-supported' || e.error === 'service-not-allowed') {
      try { if (_recognition) _recognition.processLocally = false; } catch (e2) {}
      _voiceMode = 'cloud';
      _voiceMsg('Локальный пакет недоступен — нужен интернет');
      if (_active) setTimeout(() => { try { _recognition.start(); } catch (err) {} }, 200);
      return;
    }
    _voiceMsg('Ошибка: ' + e.error);
  };

  let _isRestarting = false;
  _recognition.onend = () => {
    if (!_active || _isRestarting) return;
    _isRestarting = true;
    try { _recognition.abort(); } catch(e) {}
    setTimeout(() => {
      _isRestarting = false;
      if (_active) try { _recognition.start(); } catch(err) {}
    }, 50);
  };
}

function _stopRecognition() {
  _voiceClearStableTimer();
  _voiceBuf = '';
  _voiceRecent = [];
  _stopMicLevel();
  if (_recognition) {
    try { _recognition.stop(); } catch(e) {}
  }
}

// ── Mic level visualizer (volume → green ring scale) ───────────────
let _micStream = null;
let _micCtx = null;
let _micAnalyser = null;
let _micRaf = 0;
let _micLevelSmooth = 0;

function _startMicLevel() {
  _stopMicLevel();
  const levelEl = document.getElementById('voice-mic-level');
  const btn = document.getElementById('voice-tab-btn');
  if (btn) btn.classList.add('voice-on');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

  navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
    if (!_active) {
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    _micStream = stream;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    _micCtx = new AC();
    const src = _micCtx.createMediaStreamSource(stream);
    _micAnalyser = _micCtx.createAnalyser();
    _micAnalyser.fftSize = 512;
    _micAnalyser.smoothingTimeConstant = 0.35;
    src.connect(_micAnalyser);
    const data = new Uint8Array(_micAnalyser.fftSize);

    const tick = () => {
      if (!_active || !_micAnalyser) return;
      _micAnalyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      // Чувствительность: тихий голос тоже виден, пики не улетают слишком далеко
      const target = Math.min(1, Math.pow(rms * 5.5, 0.85));
      _micLevelSmooth += (target - _micLevelSmooth) * 0.35;
      if (levelEl) {
        const scale = 1 + _micLevelSmooth * 2.8; // радиус ~1×…3.8×
        levelEl.style.transform = 'scale(' + scale.toFixed(3) + ')';
        levelEl.style.opacity = String(0.25 + _micLevelSmooth * 0.55);
      }
      _micRaf = requestAnimationFrame(tick);
    };
    _micRaf = requestAnimationFrame(tick);
  }).catch(() => {
    // permission denied — dot still turns green via voice-on class
  });
}

function _stopMicLevel() {
  if (_micRaf) { cancelAnimationFrame(_micRaf); _micRaf = 0; }
  if (_micStream) {
    try { _micStream.getTracks().forEach(t => t.stop()); } catch (e) {}
    _micStream = null;
  }
  if (_micCtx) {
    try { _micCtx.close(); } catch (e) {}
    _micCtx = null;
  }
  _micAnalyser = null;
  _micLevelSmooth = 0;
  const levelEl = document.getElementById('voice-mic-level');
  if (levelEl) {
    levelEl.style.transform = 'scale(1)';
    levelEl.style.opacity = '';
  }
  const btn = document.getElementById('voice-tab-btn');
  if (btn) btn.classList.remove('voice-on');
}

/** Sync recognition language when UI language changes */
window._voiceOnLangChange = function() {
  const oldPanel = document.getElementById('props-voice-panel');
  const panelWasOpen = !!(oldPanel && oldPanel.style.display !== 'none');
  if (oldPanel) oldPanel.remove();
  _buildPropsPanel();
  const panel = document.getElementById('props-voice-panel');
  if (panel) panel.style.display = (_active || panelWasOpen) ? '' : 'none';

  if (!_recognition) return;
  _recognition.lang = _voiceSpeechLang();
  if (_active) {
    try { _recognition.abort(); } catch (e) {}
    setTimeout(() => {
      if (!_active) return;
      try { _recognition.start(); } catch (e) {}
    }, 80);
  }
};

// ── Toggle ─────────────────────────────────────────────────────────
window.exportVoiceUnknown = function() {
  if (!_voiceLog.length) {
    if (typeof toast === 'function') toast((typeof getLang === 'function' && getLang() === 'en') ? 'Log is empty' : 'Лог пуст', 'ok');
    return;
  }
  const icons = {ok:'✅', unknown:'❓', noise:'🔇'};
  const text = '=== Лог голосовых команд (' + _voiceLog.length + ') ===\n' +
    _voiceLog.map((e, i) => {
      const icon = icons[e.status] || '?';
      const norm = e.normalized !== e.raw ? ' → «' + e.normalized + '»' : '';
      return (i+1) + '. [' + e.ts + '] ' + icon + ' «' + e.raw + '»' + norm;
    }).join('\n');
  // Copy to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof toast === 'function') toast('Скопировано ' + _unknownCmds.length + ' команд', 'ok');
    });
  } else {
    // Fallback: show in textarea popup
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:300px;z-index:99999;padding:12px;font-size:13px;border-radius:8px;border:1px solid #444;background:#1e1e2e;color:#e2e8f0;resize:both';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Закрыть';
    closeBtn.style.cssText = 'position:fixed;top:calc(50% - 165px);left:calc(50% + 80px);z-index:100000;background:#3b82f6;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px';
    closeBtn.onclick = () => { ta.remove(); closeBtn.remove(); };
    document.body.appendChild(ta);
    document.body.appendChild(closeBtn);
    ta.select();
  }
};

/** Показывать ли кнопку 📋 лога нераспознанных команд (🔧 Конфигурация → Интерфейс / CFG_UI). По умолчанию скрыта. */
window.isVoiceUnknownBtnEnabled = function() {
  const v = localStorage.getItem('sf-voice-log-btn');
  if (v === '1') return true;
  if (v === '0') return false;
  if (window.CFG_UI && typeof window.CFG_UI.showVoiceUnknownBtn === 'boolean') {
    return !!window.CFG_UI.showVoiceUnknownBtn;
  }
  return false;
};

window.setVoiceUnknownBtn = function(on) {
  localStorage.setItem('sf-voice-log-btn', on ? '1' : '0');
  if (typeof window._syncVoiceExportBtn === 'function') window._syncVoiceExportBtn();
};

window._syncVoiceExportBtn = function() {
  const btn = document.getElementById('voice-export-btn');
  if (!btn) return;
  const enabled = typeof window.isVoiceUnknownBtnEnabled === 'function' && window.isVoiceUnknownBtnEnabled();
  // Показывать только если опция включена и (голос активен или уже есть неизвестные)
  btn.style.display = (enabled && (_active || _unknownCmds.length > 0)) ? '' : 'none';
};

window.toggleVoiceControl = function(btn) {
  _buildPropsPanel();
  _active = !_active;

  if (_active) {
    const started = _startRecognition();
    if (!started) {
      _active = false;
      _stopMicLevel();
      return;
    }
    _voiceMsg(_voiceUiLang() === 'en' ? 'Voice control on' : 'Голосовое управление включено', 'ok');
    if (typeof window._syncVoiceExportBtn === 'function') window._syncVoiceExportBtn();
    if (btn) { btn.classList.add('active'); btn.classList.add('voice-on'); btn.style.color = 'var(--accent)'; }
    const propsPanel = document.getElementById('props-voice-panel');
    if (propsPanel) {
      propsPanel.style.display = '';
      const ps = document.getElementById('props-scroll');
      if (ps) ps.scrollTop = 0;
    }
  } else {
    _stopRecognition();
    _voiceMsg(_voiceUiLang() === 'en' ? 'Voice control off' : 'Голосовое управление выключено');
    if (btn) { btn.classList.remove('active'); btn.classList.remove('voice-on'); btn.style.color = ''; btn.style.outline = ''; btn.blur(); }
    const propsPanel = document.getElementById('props-voice-panel');
    if (propsPanel) propsPanel.style.display = 'none';
    if (typeof window._syncVoiceExportBtn === 'function') window._syncVoiceExportBtn();
  }
};

})();

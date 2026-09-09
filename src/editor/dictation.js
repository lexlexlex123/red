/**
 * v7.1 dictation into the selected text block / AI chat (Web Speech API).
 * Port of js/42-dictation.js.
 */

import { useHistoryStore } from '../stores/historyStore.js';
import { usePresentationStore } from '../stores/presentationStore.js';
import { useSelectionStore } from '../stores/selectionStore.js';
import { useUiStore } from '../stores/uiStore.js';

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const STOP_RE =
  /^(стоп|остановить диктовку|завершить диктовку|стоп диктовка|stop|stop dictation|end dictation)$/i;

let recog = null;
let active = false;
let shouldRestart = false;
let mode = 'text'; // 'text' | 'chat'
let targetId = null;
let historyPushed = false;
let chatSink = null;

export function isDictationOn() {
  return active;
}

export function dictationMode() {
  return active ? mode : null;
}

export function setChatDictationSink(sink) {
  chatSink = sink || null;
}

function toast(msg, type) {
  useUiStore.getState().showToast(msg, type || 'ok');
}

function ru() {
  return useUiStore.getState().lang !== 'en';
}

function detectLang() {
  return ru() ? 'ru-RU' : 'en-US';
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function selectedTextEl() {
  const { slides, cur } = usePresentationStore.getState();
  const selId = useSelectionStore.getState().selId;
  const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(selId));
  return el && el.type === 'text' ? el : null;
}

function hideInterim() {
  const old = document.getElementById('dictation-interim');
  if (old) old.remove();
}

function showInterim(text) {
  hideInterim();
  if (!text || !targetId) return;
  const c = document.querySelector(`.react-el-text[data-id="${CSS.escape(String(targetId))}"] .react-text-body`);
  if (!c) return;
  const span = document.createElement('span');
  span.id = 'dictation-interim';
  span.style.cssText = 'opacity:.4;font-style:italic;pointer-events:none;';
  span.textContent = ' ' + text;
  c.appendChild(span);
}

function insertIntoText(text) {
  if (!text || !targetId) return;
  const el = selectedTextEl();
  if (!el || String(el.id) !== String(targetId)) return;

  const live = document.querySelector(
    `.react-el-text[data-id="${CSS.escape(String(targetId))}"] .react-text-body`
  );
  const editing = live && live.getAttribute('contenteditable') === 'true';
  const newDiv = '<div>' + escHtml(text) + '</div>';

  if (editing && live) {
    hideInterim();
    live.insertAdjacentHTML('beforeend', newDiv);
    return;
  }

  if (!historyPushed) {
    useHistoryStore.getState().push();
    historyPushed = true;
  }
  const tmp = document.createElement('div');
  tmp.innerHTML = el.html || '';
  const hasContent = tmp.textContent.trim().length > 0;
  const html = hasContent ? (el.html || '') + newDiv : newDiv;
  usePresentationStore.getState().patchElement(el.id, { html });
}

function appendToChat(finals, interims) {
  if (!chatSink || typeof chatSink.append !== 'function') return;
  chatSink.append(finals, interims);
}

function setUi(on) {
  useUiStore.getState().setDictationOn(on, on ? mode : null);
}

function startRecog() {
  if (!active || !SR) return;
  recog = new SR();
  recog.lang = detectLang();
  recog.continuous = false;
  recog.interimResults = true;
  recog.maxAlternatives = 1;

  recog.onresult = (e) => {
    let finals = '';
    let interims = '';
    for (let i = 0; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finals += t;
      else interims += t;
    }
    if (mode === 'chat') {
      if (finals.trim() && STOP_RE.test(finals.trim())) {
        stopDictation();
        return;
      }
      appendToChat(finals, interims);
      return;
    }
    hideInterim();
    if (finals.trim() && STOP_RE.test(finals.trim())) {
      stopDictation();
      return;
    }
    if (finals.trim()) insertIntoText(finals.trim());
    if (interims) showInterim(interims);
  };

  recog.onerror = (err) => {
    if (err.error === 'aborted' || err.error === 'no-speech') return;
    if (err.error === 'not-allowed') {
      toast(ru() ? 'Нет доступа к микрофону' : 'Microphone denied', 'err');
      shouldRestart = false;
      stopDictation();
      return;
    }
  };

  recog.onend = () => {
    hideInterim();
    if (shouldRestart && active) {
      setTimeout(startRecog, 80);
    } else {
      active = false;
      setUi(false);
    }
  };

  try {
    recog.start();
  } catch (e) {}
}

function start(nextMode) {
  if (!SR) {
    toast(ru() ? 'Диктовка не поддерживается в этом браузере' : 'Speech recognition unsupported', 'err');
    return false;
  }
  mode = nextMode;
  active = true;
  shouldRestart = true;
  historyPushed = false;
  if (mode === 'text') {
    const el = selectedTextEl();
    if (!el) {
      active = false;
      shouldRestart = false;
      toast(ru() ? 'Выберите текстовый блок' : 'Select a text box', 'err');
      return false;
    }
    targetId = el.id;
  } else {
    targetId = null;
  }
  setUi(true);
  toast(ru() ? '🎙 Говорите…' : '🎙 Speak…');
  startRecog();
  return true;
}

export function stopDictation() {
  shouldRestart = false;
  active = false;
  hideInterim();
  setUi(false);
  targetId = null;
  if (recog) {
    try {
      recog.stop();
    } catch (e) {}
    recog = null;
  }
}

export function toggleTextDictation() {
  if (active && mode === 'text') {
    stopDictation();
    return false;
  }
  if (active) stopDictation();
  return start('text');
}

export function toggleChatDictation() {
  if (active && mode === 'chat') {
    stopDictation();
    return false;
  }
  if (active) stopDictation();
  return start('chat');
}

export function onEditorPick(id) {
  if (!active || mode !== 'text') return;
  if (!id || String(id) !== String(targetId)) stopDictation();
}

/**
 * Lightweight voice control for React editor (Web Speech API).
 * Maps RU/EN phrases to editorApi — not a full port of js/50-voice.js.
 */

import { editorApi } from './editorApi.js';
import { useUiStore } from '../stores/uiStore.js';
import { usePresentationStore } from '../stores/presentationStore.js';

let recognition = null;
let listening = false;

export function isVoiceListening() {
  return listening;
}

function toast(msg, type) {
  useUiStore.getState().showToast(msg, type || 'ok');
}

function ru() {
  return useUiStore.getState().lang !== 'en';
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function handleTranscript(raw) {
  const t = norm(raw);
  if (!t) return;
  const st = usePresentationStore.getState();

  if (/^(следующий|вперед|forward|next)/.test(t)) {
    const { cur, slides } = usePresentationStore.getState();
    if (cur < slides.length - 1) editorApi.pickSlide(cur + 1);
    return;
  }
  if (/^(предыдущий|назад|previous|back)/.test(t) && !/слайд|slide/.test(t)) {
    const { cur } = usePresentationStore.getState();
    if (cur > 0) editorApi.pickSlide(cur - 1);
    return;
  }
  if (/^(новый слайд|добавь слайд|add slide|new slide)/.test(t)) {
    editorApi.addSlide();
    return;
  }
  if (/^(удали|delete|remove)/.test(t) && /(слайд|slide)/.test(t)) {
    editorApi.delSlide(usePresentationStore.getState().cur);
    return;
  }
  if (/^(текст|добавь текст|add text)/.test(t)) {
    editorApi.addText();
    return;
  }
  if (/^(таблица|table)/.test(t)) {
    editorApi.addTable();
    return;
  }
  if (/^(фигура|shape)/.test(t)) {
    editorApi.openShapePicker();
    return;
  }
  if (/^(показ|презентац|preview|slideshow|present)/.test(t)) {
    editorApi.startPreview('__cur__');
    return;
  }
  if (/^(отмена|undo)/.test(t)) {
    editorApi.undo();
    return;
  }
  if (/^(повтор|redo)/.test(t)) {
    editorApi.redo();
    return;
  }
  if (/^(сохрани|save)/.test(t)) {
    usePresentationStore.getState().persist();
    toast(ru() ? 'Сохранено' : 'Saved', 'ok');
    return;
  }
  const go = t.match(/(?:слайд|slide)\s+(\d+)/);
  if (go) {
    const n = Math.max(1, Math.min(st.slides.length, +go[1])) - 1;
    editorApi.pickSlide(n);
    return;
  }

  if (/^(диктовка|начать диктовку|диктовать|голосовой ввод|dictation|start dictation|dictate|voice input)/.test(t)) {
    void editorApi.toggleDictation();
    return;
  }
  if (/^(стоп|остановить диктовку|завершить диктовку|stop dictation|end dictation)$/.test(t)) {
    void import('./dictation.js').then((m) => m.stopDictation()).catch(() => {});
    return;
  }

  toast((ru() ? 'Не распознано: ' : 'Unknown: ') + raw.slice(0, 40), 'warn');
}

function getRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  if (recognition) return recognition;
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.lang = ru() ? 'ru-RU' : 'en-US';
  rec.onresult = (ev) => {
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      if (!ev.results[i].isFinal) continue;
      const said = ev.results[i][0]?.transcript || '';
      handleTranscript(said);
    }
  };
  rec.onerror = (ev) => {
    if (ev.error === 'not-allowed') {
      toast(ru() ? 'Нет доступа к микрофону' : 'Microphone denied', 'err');
      stopVoiceControl();
    }
  };
  rec.onend = () => {
    if (listening) {
      try {
        rec.start();
      } catch (e) {}
    }
  };
  recognition = rec;
  return rec;
}

export function startVoiceControl() {
  const rec = getRecognition();
  if (!rec) {
    toast(ru() ? 'Голос не поддерживается в этом браузере' : 'Speech recognition unsupported', 'err');
    return false;
  }
  rec.lang = ru() ? 'ru-RU' : 'en-US';
  try {
    rec.start();
  } catch (e) {}
  listening = true;
  useUiStore.getState().setVoiceListening(true);
  toast(ru() ? 'Голосовое управление включено' : 'Voice control on', 'ok');
  return true;
}

export function stopVoiceControl() {
  listening = false;
  useUiStore.getState().setVoiceListening(false);
  try {
    recognition?.stop();
  } catch (e) {}
  toast(ru() ? 'Голосовое управление выключено' : 'Voice control off');
  return false;
}

export function toggleVoiceControl() {
  if (listening) return stopVoiceControl();
  return startVoiceControl();
}

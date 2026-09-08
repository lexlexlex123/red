/** Translate selection / full deck against presentationStore. */

import { usePresentationStore } from '../stores/presentationStore.js';
import { useSelectionStore } from '../stores/selectionStore.js';
import { useHistoryStore } from '../stores/historyStore.js';
import { useUiStore } from '../stores/uiStore.js';
import { rebuildAppletHtml } from './applets.js';
import {
  applyTranslationToHtml,
  getTranslateDeckLang,
  isTranslateBusy,
  langDisplayName,
  langBtnLabel,
  plainFromHtml,
  resolveFromLang,
  setTranslateBusy,
  translatePlain,
  translateTargetFromText,
  transcribePlain,
} from './translate.js';

function ru() {
  return useUiStore.getState().lang !== 'en';
}

function toast(msg, type) {
  useUiStore.getState().showToast(msg, type);
}

export function selectionTranslateLabel() {
  const id = useSelectionStore.getState().selId;
  const st = usePresentationStore.getState();
  const el = (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === String(id));
  if (!el || el.type !== 'text') {
    return ru() ? 'Перевести' : 'Translate';
  }
  const plain = plainFromHtml(el.html || el.text || '');
  const tgt = translateTargetFromText(plain);
  return langBtnLabel(tgt.to, ru());
}

export async function translateSelectionAction() {
  if (isTranslateBusy()) return;
  const id = useSelectionStore.getState().selId;
  const st = usePresentationStore.getState();
  const el = (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === String(id));
  if (!el || el.type !== 'text') {
    toast(ru() ? 'Выберите текстовый блок' : 'Select a text block', 'err');
    return;
  }
  const plain = plainFromHtml(el.html || el.text || '');
  if (!plain.trim()) {
    toast(ru() ? 'Нет текста для перевода' : 'No text to translate', 'err');
    return;
  }
  const tgt = translateTargetFromText(plain);
  let from = tgt.from;
  if (tgt.detected === 'mixed' || tgt.detected === 'empty') {
    from = await resolveFromLang(plain, tgt.to);
  }
  setTranslateBusy(true);
  try {
    useHistoryStore.getState().push();
    const translated = await translatePlain(plain, from, tgt.to);
    const html = applyTranslationToHtml(el.html || '', translated);
    usePresentationStore.getState().patchElement(el.id, { html, text: translated });
    toast((ru() ? 'Переведено на ' : 'Translated to ') + langDisplayName(tgt.to, ru()), 'ok');
  } catch (e) {
    console.warn('[translate]', e);
    toast(
      e?.message === 'NO_ENGINE'
        ? ru()
          ? 'Нет сети для перевода'
          : 'Offline — cannot translate'
        : ru()
          ? 'Не удалось перевести'
          : 'Translate failed',
      'err'
    );
  } finally {
    setTranslateBusy(false);
  }
}

export async function transcribeSelectionAction() {
  if (isTranslateBusy()) return;
  const id = useSelectionStore.getState().selId;
  const st = usePresentationStore.getState();
  const el = (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === String(id));
  if (!el || el.type !== 'text') {
    toast(ru() ? 'Выберите текстовый блок' : 'Select a text block', 'err');
    return;
  }
  const plain = plainFromHtml(el.html || el.text || '');
  if (!plain.trim()) {
    toast(ru() ? 'Нет текста для транскрипции' : 'No text to transcribe', 'err');
    return;
  }
  const tgt = translateTargetFromText(plain);
  let from = tgt.from;
  if (tgt.detected === 'mixed' || tgt.detected === 'empty') {
    from = await resolveFromLang(plain, tgt.to);
  }
  setTranslateBusy(true);
  try {
    useHistoryStore.getState().push();
    const out = await transcribePlain(plain, from);
    const html = applyTranslationToHtml(el.html || '', out);
    usePresentationStore.getState().patchElement(el.id, { html, text: out });
    toast(ru() ? 'Транскрибировано' : 'Transcribed', 'ok');
  } catch (e) {
    console.warn('[transcribe]', e);
    toast(
      e?.message === 'NO_ENGINE'
        ? ru()
          ? 'Нет сети и не удалось сделать транскрипцию локально'
          : 'Offline — cannot transcribe'
        : ru()
          ? 'Не удалось сделать транскрипцию'
          : 'Transcribe failed',
      'err'
    );
  } finally {
    setTranslateBusy(false);
  }
}

export async function translateDeckAction() {
  if (isTranslateBusy()) return;
  const to = getTranslateDeckLang();
  const st = usePresentationStore.getState();
  const jobs = [];
  (st.slides || []).forEach((slide, si) => {
    (slide.els || []).forEach((el) => {
      if (!el || el._isDecor) return;
      if (el.type === 'text') {
        const plain = plainFromHtml(el.html || el.text || '');
        if (plain.trim()) jobs.push({ si, id: el.id, kind: 'text', plain, html: el.html || '' });
      } else if (el.type === 'applet' && el.appletId === 'flip') {
        ['flipFrontText', 'flipBackText'].forEach((field) => {
          const plain = String(el[field] || '');
          if (plain.trim()) jobs.push({ si, id: el.id, kind: 'flip', field, plain });
        });
      }
    });
  });
  if (!jobs.length) {
    toast(ru() ? 'Нет текста для перевода' : 'No text to translate', 'err');
    return;
  }
  setTranslateBusy(true);
  toast(ru() ? 'Перевод презентации…' : 'Translating deck…', 'ok');
  try {
    useHistoryStore.getState().push();
    let changed = 0;
    const slides = st.slides.map((s) => ({ ...s, els: (s.els || []).map((e) => (e ? { ...e } : e)) }));
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const from = await resolveFromLang(job.plain, to);
      if (!from || from === to) continue;
      const translated = await translatePlain(job.plain, from, to);
      if (!translated || translated === job.plain) continue;
      const live = (slides[job.si]?.els || []).find((e) => e && String(e.id) === String(job.id));
      if (!live) continue;
      if (job.kind === 'text') {
        live.html = applyTranslationToHtml(job.html, translated);
        live.text = translated;
      } else if (job.kind === 'flip') {
        live[job.field] = translated;
        Object.assign(live, rebuildAppletHtml(live));
      }
      changed++;
    }
    usePresentationStore.setState({ slides });
    usePresentationStore.getState().persist();
    if (changed) {
      toast((ru() ? 'Переведено на ' : 'Translated to ') + langDisplayName(to, ru()), 'ok');
    } else {
      toast(ru() ? 'Нечего менять' : 'Nothing changed', 'ok');
    }
  } catch (e) {
    console.warn('[translate-deck]', e);
    toast(ru() ? 'Не удалось перевести' : 'Translate failed', 'err');
  } finally {
    setTranslateBusy(false);
  }
}

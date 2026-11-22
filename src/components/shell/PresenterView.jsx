import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useUiStore } from '../../stores/uiStore';
import { hydrateMissingFormulas, cloneSlidesAfterFormulaHydrate } from '../../editor/slideThumb.js';
import { nextVisibleSlideIndex, visibleSlideIndices } from '../../editor/slideVisibility.js';
import { hydrateSlides } from '../../editor/mediaStore.js';
import { versionAttr } from '../../editor/versions.js';
import { postPresenter, subscribePresenter } from '../../editor/presenterChannel.js';
import { getTheme } from '../../editor/themes.js';
import { renderSlideInnerHtml, slideBackgroundStyle } from '../../export/standaloneHtml.js';
import { slideBgImgExportHtml } from '../../editor/slideBgImg.js';
import { ensureIcons } from '../../editor/iconsLazy.js';
import { startTimersInRoot } from '../../editor/applets.js';

function formatElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

function PresenterSlideFrame({ slide, canvasW, canvasH, themeIdx, label, frameRef, autoStartTimers }) {
  const theme = getTheme(themeIdx);
  const html = useMemo(() => {
    if (!slide) return '';
    const bgLayer = slideBgImgExportHtml(slide.bgImg, canvasW, canvasH);
    return `${bgLayer || ''}${renderSlideInnerHtml(slide, canvasW, canvasH, theme)}`;
  }, [slide, canvasW, canvasH, themeIdx]);
  const bg = slide ? slideBackgroundStyle(slide).background : '#020617';
  const boxRef = useRef(null);
  const slideElRef = useRef(null);
  const [fit, setFit] = useState({ scale: 1, w: 0, h: 0 });

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const measure = () => {
      const r = box.getBoundingClientRect();
      const aw = Math.max(0, r.width);
      const ah = Math.max(0, r.height);
      const cw = Math.max(1, canvasW);
      const ch = Math.max(1, canvasH);
      const scale = Math.max(0.01, Math.min(aw / cw, ah / ch));
      setFit({ scale, w: Math.round(cw * scale), h: Math.round(ch * scale) });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(box);
    window.addEventListener('resize', measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [canvasW, canvasH, html]);

  useEffect(() => {
    if (!frameRef) return undefined;
    frameRef.current = slideElRef.current;
    return () => {
      if (frameRef.current === slideElRef.current) frameRef.current = null;
    };
  }, [frameRef, html, slide]);

  // «Со слайдом» — как в показе: старт после монтирования iframe.
  useEffect(() => {
    if (!autoStartTimers || !slide) return undefined;
    const t = window.setTimeout(() => {
      startTimersInRoot(slideElRef.current, { mode: 'auto' });
    }, 80);
    return () => clearTimeout(t);
  }, [autoStartTimers, slide, html]);

  return (
    <div className="presenter-thumb">
      <div className="presenter-thumb-label">{label}</div>
      <div className="presenter-thumb-box" ref={boxRef}>
        {slide ? (
          <div
            className="presenter-thumb-frame"
            style={{ width: fit.w || undefined, height: fit.h || undefined }}
          >
            <section
              ref={slideElRef}
              className="presenter-slide-el"
              style={{
                width: canvasW,
                height: canvasH,
                background: bg,
                transform: `scale(${fit.scale})`,
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        ) : (
          <div className="presenter-thumb-empty">—</div>
        )}
      </div>
    </div>
  );
}

export default function PresenterView() {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const deckTitle = usePresentationStore((s) => s.title);
  const [live, setLive] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [timerOrigin, setTimerOrigin] = useState(0);
  const [notesText, setNotesText] = useState('');
  const notesFocusRef = useRef(false);
  const notesSaveT = useRef(0);
  /** Current-slide preview root — arm click-slide timers here on «Далее». */
  const currentSlideFrameRef = useRef(null);
  const clickSlideArmedRef = useRef(new Set());

  useEffect(() => {
    document.documentElement.classList.add('presenter-mode');
    document.title = ru ? 'Докладчик' : 'Presenter';
    return () => document.documentElement.classList.remove('presenter-mode');
  }, [ru]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureIcons();
      } catch (e) {}
      try {
        await usePresentationStore.getState().hydrateFromIdb();
      } catch (e) {}
      if (cancelled) return;
      try {
        const list = usePresentationStore.getState().slides;
        const n = await hydrateSlides(list);
        let formulas = 0;
        try {
          formulas = await hydrateMissingFormulas(list);
        } catch (e) {}
        if (n > 0 || formulas > 0) {
          usePresentationStore.setState({
            slides: formulas > 0 ? cloneSlidesAfterFormulaHydrate(list) : [...list],
          });
        }
      } catch (e) {}
    })();
    postPresenter({ t: 'hello' });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribePresenter((msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'state') setLive(msg);
      if (msg.t === 'bye') {
        setLive(null);
        setTimerOrigin(0);
      }
    });
  }, []);

  const idx = live?.live ? live.idx | 0 : cur | 0;
  const shuffle = !!(live && live.shuffle);
  const nextIdx = live?.live
    ? live.nextIdx | 0
    : nextVisibleSlideIndex(slides, idx, 1);
  const vis = visibleSlideIndices(slides);
  const visPos = live?.live ? live.visPos | 0 : vis.indexOf(idx) + 1;
  const visN = live?.live ? live.visN | 0 : vis.length;
  const title = (live?.title || deckTitle || '').trim();
  const black = !!(live && live.black);
  const startedAt = Number(live?.startedAt) || 0;

  const currentSlide = slides[idx] || null;
  const resolvedNext =
    shuffle || nextIdx < 0 || nextIdx === idx ? null : slides[nextIdx] || null;

  useEffect(() => {
    if (notesFocusRef.current) return;
    const fromLive = live?.live ? String(live.notes || '') : null;
    const fromSlide = String(currentSlide?.notes || '');
    setNotesText(fromLive != null ? fromLive : fromSlide);
  }, [idx, live?.notes, live?.live, currentSlide?.notes]);

  useEffect(() => {
    if (startedAt && !timerOrigin) setTimerOrigin(startedAt);
  }, [startedAt, timerOrigin]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(
    () => () => {
      if (notesSaveT.current) window.clearTimeout(notesSaveT.current);
    },
    []
  );

  const origin = timerOrigin || startedAt;
  const elapsed = origin ? now - origin : 0;

  const send = (cmd, extra) => postPresenter({ t: 'cmd', cmd, ...extra });

  /** Same as → / Space in the show: first press arms click-slide timers on the preview. */
  const armLocalClickSlideTimers = () => {
    const root = currentSlideFrameRef.current;
    if (!root) return false;
    const key = `slide:${idx}`;
    if (clickSlideArmedRef.current.has(key)) return false;
    let hasClickSlide = false;
    root.querySelectorAll('iframe[data-applet-id="timer"]').forEach((iframe) => {
      const startAttr =
        iframe.getAttribute('data-tm-start') ||
        iframe.closest?.('[data-tm-start]')?.getAttribute('data-tm-start') ||
        'auto';
      if (startAttr === 'click-slide') hasClickSlide = true;
    });
    if (!hasClickSlide) return false;
    clickSlideArmedRef.current.add(key);
    startTimersInRoot(root, { mode: 'click-slide' });
    return true;
  };

  const sendNext = () => {
    // Always notify the show (it has its own arm-or-advance logic).
    // Also arm local preview timers so the докладчик sees the countdown.
    armLocalClickSlideTimers();
    send('next');
  };
  const sendNextRef = useRef(sendNext);
  sendNextRef.current = sendNext;

  useEffect(() => {
    clickSlideArmedRef.current = new Set();
  }, [idx]);

  const persistNotes = (text, slideIdx) => {
    try {
      usePresentationStore.getState().patchSlide(slideIdx, { notes: text });
    } catch (e) {}
    send('notes', { idx: slideIdx, text });
  };

  const onNotesChange = (e) => {
    const text = e.target.value;
    setNotesText(text);
    const slideIdx = idx;
    if (notesSaveT.current) window.clearTimeout(notesSaveT.current);
    notesSaveT.current = window.setTimeout(() => persistNotes(text, slideIdx), 280);
  };

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        window.close();
        return;
      }
      if (e.code === 'KeyB') {
        e.preventDefault();
        send('black');
        return;
      }
      // Same keys as slideshow: Space / → / ↓ / PageDown → next; ← / ↑ / PageUp → prev.
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        if (e.repeat) return;
        sendNextRef.current();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (e.repeat) return;
        send('prev');
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const status = live?.live
    ? ru
      ? 'Показ идёт'
      : 'Live'
    : ru
      ? 'Ожидание показа (F5 в редакторе)'
      : 'Waiting for slideshow (F5 in editor)';

  const nextCaption = shuffle
    ? ru
      ? 'Следующий — случайно'
      : 'Next — shuffled'
    : resolvedNext
      ? ru
        ? `Следующий · ${nextIdx + 1}`
        : `Next · ${nextIdx + 1}`
      : ru
        ? 'Конец'
        : 'End';

  return (
    <div className="presenter-root" {...versionAttr('PresenterView')}>
      <header className="presenter-bar">
        <div className="presenter-bar-title">{title || (ru ? 'Презентация' : 'Presentation')}</div>
        <div className={`presenter-status${live?.live ? ' is-live' : ''}`}>{status}</div>
        {black ? (
          <div className="presenter-status is-black" title={ru ? 'На экране показа — чёрный экран' : 'Audience display is black'}>
            {ru ? 'Чёрный экран на показе' : 'Black on show'}
          </div>
        ) : null}
        <div className="presenter-timer" title={ru ? 'Сброс таймера' : 'Reset timer'}>
          <button type="button" onClick={() => setTimerOrigin(Date.now())}>
            {formatElapsed(elapsed)}
          </button>
        </div>
        <div className="presenter-count">
          {visPos || idx + 1} / {visN || slides.length}
        </div>
      </header>
      <div className="presenter-stage">
        <PresenterSlideFrame
          slide={currentSlide}
          canvasW={canvasW}
          canvasH={canvasH}
          themeIdx={appliedThemeIdx}
          label={ru ? `Сейчас · ${idx + 1}` : `Now · ${idx + 1}`}
          frameRef={currentSlideFrameRef}
          autoStartTimers
        />
        <div className="presenter-side">
          <PresenterSlideFrame
            slide={resolvedNext}
            canvasW={canvasW}
            canvasH={canvasH}
            themeIdx={appliedThemeIdx}
            label={nextCaption}
          />
          <div className="presenter-notes">
            <div className="presenter-notes-label">{ru ? 'Текст докладчика' : 'Speaker notes'}</div>
            <textarea
              className="presenter-notes-input"
              value={notesText}
              onChange={onNotesChange}
              onFocus={() => {
                notesFocusRef.current = true;
              }}
              onBlur={() => {
                notesFocusRef.current = false;
                if (notesSaveT.current) window.clearTimeout(notesSaveT.current);
                persistNotes(notesText, idx);
              }}
              placeholder={ru ? 'Заметки к текущему слайду…' : 'Notes for the current slide…'}
              spellCheck
            />
          </div>
        </div>
      </div>
      <footer className="presenter-actions">
        <button type="button" onClick={() => send('prev')} disabled={!live?.live}>
          {ru ? '← Назад' : '← Prev'}
        </button>
        <button type="button" className="primary" onClick={() => sendNext()} disabled={!live?.live}>
          {ru ? 'Далее →' : 'Next →'}
        </button>
        <button type="button" onClick={() => send('black')} disabled={!live?.live}>
          {black ? (ru ? 'Вернуть слайд (B)' : 'Show slide (B)') : ru ? 'Чёрный экран (B)' : 'Black (B)'}
        </button>
        <button type="button" onClick={() => send('exit')} disabled={!live?.live}>
          {ru ? 'Закончить показ' : 'End show'}
        </button>
      </footer>
    </div>
  );
}

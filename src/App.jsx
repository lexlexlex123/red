import React, { useEffect } from 'react';
import AppShell from './components/shell/AppShell.jsx';
import { registerServiceWorker } from './features/pwa';
import { useUiStore } from './stores/uiStore';
import { editorApi } from './editor/editorApi';
import { APP_VERSION, consumeComponentUpdates } from './editor/versions.js';
import { useHistoryStore } from './stores/historyStore';
import { usePresentationStore } from './stores/presentationStore';
import { hydrateSlides } from './editor/mediaStore.js';
import { ensureIcons } from './editor/iconsLazy.js';
import { preloadCriticalPanels } from './components/panels/lazyPanels.js';
import { setChartThemeColorsProvider } from './editor/tableChart.js';
import { THEMES, themeColors } from './editor/themes.js';
import { hydrateMissingFormulas, cloneSlidesAfterFormulaHydrate } from './editor/slideThumb.js';
import { migrateSvgFieldsInSlides } from './editor/svgImport.js';
import { isBracketLeft, isBracketRight, latinKey } from './editor/hotkeys.js';
import { useSelectionStore } from './stores/selectionStore';
import { canvasPanByKey } from './editor/canvasViewport.js';
import { isPresenterQuery } from './editor/presenterChannel.js';
import PresenterView from './components/shell/PresenterView.jsx';

function clearImportQueryFromAddress() {
  try {
    if (location.protocol === 'file:') return;
    const u = new URL(location.href);
    let changed = false;
    ['import', 'prezi', 'src'].forEach((k) => {
      if (u.searchParams.has(k)) {
        u.searchParams.delete(k);
        changed = true;
      }
    });
    if (!changed) return;
    const qs = u.searchParams.toString();
    history.replaceState(null, '', `${u.pathname}${qs ? `?${qs}` : ''}${u.hash}`);
  } catch (e) {}
}

export default function App() {
  if (isPresenterQuery()) return <PresenterView />;
  return <EditorApp />;
}

function EditorApp() {
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const themeMode = useUiStore((s) => s.themeMode);
  const showToast = useUiStore((s) => s.showToast);
  const setComponentUpdates = useUiStore((s) => s.setComponentUpdates);
  const lang = useUiStore((s) => s.lang);

  useEffect(() => {
    const onOff = () =>
      showToast(lang === 'en' ? 'Offline — cache / missing asset' : 'Офлайн — кэш / нет ассета', 'warn');
    const onOn = () => showToast(lang === 'en' ? 'Back online' : 'Сеть снова есть', 'ok');
    window.addEventListener('offline', onOff);
    window.addEventListener('online', onOn);
    return () => {
      window.removeEventListener('offline', onOff);
      window.removeEventListener('online', onOn);
    };
  }, [lang, showToast]);

  useEffect(() => {
    const ui = useUiStore.getState();
    const setBoot = ui.setBootProgress;
    const finishBoot = ui.finishBoot;
    const ru = lang !== 'en';
    const t0 = Date.now();
    const MIN_SPLASH_MS = 700;

    setThemeMode(themeMode);
    setBoot(18, ru ? 'Интерфейс…' : 'Shell…');
    registerServiceWorker();
    setChartThemeColorsProvider(() => {
      const idx = usePresentationStore.getState().appliedThemeIdx;
      if (idx >= 0 && THEMES[idx]) return themeColors(THEMES[idx]);
      return null;
    });
    const updates = consumeComponentUpdates();
    setComponentUpdates(updates);
    if (updates.length) {
      const names = updates.map((u) => `${u.id} ${u.to}`).slice(0, 4).join(', ');
      const more = updates.length > 4 ? ` +${updates.length - 4}` : '';
      showToast(
        lang === 'en'
          ? `Updated components: ${names}${more}`
          : `Обновлены компоненты: ${names}${more}`,
        'ok'
      );
    }

    (async () => {
      try {
        setBoot(32, ru ? 'Иконки…' : 'Icons…');
        await ensureIcons();
      } catch (e) {
        console.warn('[ensureIcons]', e);
      }
      try {
        setBoot(48, ru ? 'Сохранённая презентация…' : 'Saved deck…');
        await usePresentationStore.getState().hydrateFromIdb();
      } catch (e) {
        console.warn('[hydrateFromIdb]', e);
      }
      try {
        setBoot(62, ru ? 'Медиа и формулы…' : 'Media & formulas…');
        let slides = usePresentationStore.getState().slides;
        const migratedSvg = migrateSvgFieldsInSlides(slides);
        if (migratedSvg !== slides) {
          slides = migratedSvg;
          usePresentationStore.setState({ slides });
          usePresentationStore.getState().persist?.();
        }
        const n = await hydrateSlides(slides);
        let formulas = 0;
        try {
          formulas = await hydrateMissingFormulas(slides);
        } catch (e) {
          console.warn('[hydrateMissingFormulas]', e);
        }
        if (n > 0 || formulas > 0) {
          usePresentationStore.setState({
            slides: formulas > 0 ? cloneSlidesAfterFormulaHydrate(slides) : [...slides],
          });
        }
      } catch (e) {
        console.warn('[hydrateSlides]', e);
      }
      try {
        setBoot(78, ru ? 'Импорт из URL…' : 'URL import…');
        await editorApi.consumeImportUrl();
      } catch (e) {
        console.warn('[consumeImportUrl]', e);
      }
      // PropsPanel is a large lazy chunk — without this, selecting an object shows "…"
      // for many seconds on Synology / slow networks after the splash already closed.
      try {
        setBoot(86, ru ? 'Панель свойств…' : 'Properties panel…');
        await preloadCriticalPanels((id, i, n) => {
          const pct = 86 + Math.round(((i + 1) / Math.max(1, n)) * 10);
          const labels = {
            props: ru ? 'Панель свойств…' : 'Properties…',
            slide: ru ? 'Свойства слайда…' : 'Slide props…',
            drawing: ru ? 'Рисование…' : 'Drawing…',
            anim: ru ? 'Анимации…' : 'Animations…',
            objects: ru ? 'Объекты…' : 'Objects…',
          };
          setBoot(Math.min(96, pct), labels[id] || (ru ? 'Панели…' : 'Panels…'));
        });
      } catch (e) {
        console.warn('[preloadCriticalPanels]', e);
      }
      setBoot(98, ru ? 'Почти готово…' : 'Almost ready…');
      try {
        if (document.fonts?.ready) await document.fonts.ready;
        // Grow boxes that overflow after OS font-metric drift (Linux ↔ Windows).
        editorApi.growOverflowingDeckTexts?.();
      } catch (e) {
        console.warn('[growOverflowingDeckTexts]', e);
      }
      try {
        // Rebake graphs whose axis/grid colors predate the current chrome style.
        await editorApi.rebuildStaleGraphs?.();
      } catch (e) {
        console.warn('[rebuildStaleGraphs]', e);
      }
      const left = Math.max(0, MIN_SPLASH_MS - (Date.now() - t0));
      if (left) await new Promise((r) => setTimeout(r, left));
      finishBoot();
      try {
        window.__sfAppReady = 1;
      } catch (e) {}
    })();
  }, [setThemeMode, themeMode, showToast, setComponentUpdates, lang]);

  useEffect(() => {
    const onPtr = () => {
      clearImportQueryFromAddress();
    };
    document.addEventListener('pointerdown', onPtr, true);
    document.addEventListener('mousedown', onPtr, true);
    return () => {
      document.removeEventListener('pointerdown', onPtr, true);
      document.removeEventListener('mousedown', onPtr, true);
    };
  }, []);

  useEffect(() => {
    document.title = `Слайды ${APP_VERSION}`;
  }, []);

  useEffect(() => {
    const onPaste = (e) => {
      void editorApi.handlePasteEvent(e);
    };
    const onBlur = () => editorApi.markWindowBlur();
    document.addEventListener('paste', onPaste);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('paste', onPaste);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const stylePaintMode = useUiStore((s) => s.stylePaintMode);
  useEffect(() => {
    document.body.classList.toggle('style-paint-mode', !!stylePaintMode);
    return () => document.body.classList.remove('style-paint-mode');
  }, [stylePaintMode]);

  const stylePipetteTargets = useUiStore((s) => s.stylePipetteTargets);
  useEffect(() => {
    document.body.classList.toggle('style-pipette-mode', !!stylePipetteTargets);
    return () => document.body.classList.remove('style-pipette-mode');
  }, [stylePipetteTargets]);

  const tableBorderPaint = useUiStore((s) => s.tableBorderPaint);
  useEffect(() => {
    document.body.classList.toggle('table-border-paint', !!tableBorderPaint);
    return () => document.body.classList.remove('table-border-paint');
  }, [tableBorderPaint]);

  useEffect(() => {
    const onF5 = (e) => {
      if (e.key !== 'F5') return;
      e.preventDefault();
      e.stopPropagation();
      try {
        if (document.activeElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
      } catch (err) {}
      if (useUiStore.getState().previewOpen) {
        editorApi.stopPreview();
        return;
      }
      // F5 — from first slide; Shift+F5 — from current (PowerPoint / v7.1)
      editorApi.startPreview(e.shiftKey ? '__cur__' : 0);
    };
    window.addEventListener('keydown', onF5, true);
    return () => window.removeEventListener('keydown', onF5, true);
  }, []);

  useEffect(() => {
    const onEscCapture = (e) => {
      if (e.key !== 'Escape') return;
      if (useUiStore.getState().previewOpen) return;
      if (e.target?.classList?.contains('color-bar-gslider-edit')) return;
      if (useUiStore.getState().closeTopOverlay()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onEscCapture, true);
    return () => window.removeEventListener('keydown', onEscCapture, true);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const ui = useUiStore.getState();
      if (ui.previewOpen || ui.autoPlacePreviewOpen) return;
      const tag = (e.target && e.target.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      const k = latinKey(e);
      if (mod && k === 'z' && !e.shiftKey) {
        e.preventDefault();
        editorApi.undo();
      } else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) {
        e.preventDefault();
        editorApi.redo();
      } else if (mod && k === 's') {
        e.preventDefault();
        editorApi.exportJSON();
      } else if (mod && k === 'd') {
        if (typing) return;
        e.preventDefault();
        // Clicking a slide thumbnail intentionally blurs focus right after selecting it (see
        // ThumbStrip.jsx), so "is focus on .thumb-strip" is never true after a normal click —
        // that made this fall through to duplicating an element almost every time you meant to
        // duplicate the slide. Use actual selection state instead: nothing selected on the
        // canvas means the intent is the current slide.
        {
          const { selId, multiSel, selConnId } = useSelectionStore.getState();
          const hasSelection = !!(selId || multiSel?.length || selConnId);
          if (hasSelection) editorApi.dupSelected();
          else editorApi.dupSlide(usePresentationStore.getState().cur);
        }
      } else if (mod && e.shiftKey && k === 'c') {
        if (typing) return;
        e.preventDefault();
        editorApi.copyStyle();
      } else if (mod && k === 'c') {
        // Text selection inside a label (even if focus is on the format toolbar).
        if (editorApi.copyInlineTextSelection()) {
          e.preventDefault();
          return;
        }
        if (typing) return;
        e.preventDefault();
        // Same fix as Ctrl+D above: use selection state, not keyboard focus, to decide
        // element-copy vs slide-copy.
        {
          const { selId, multiSel, selConnId } = useSelectionStore.getState();
          const hasSelection = !!(selId || multiSel?.length || selConnId);
          if (hasSelection) editorApi.copySelected();
          else editorApi.copySlidesSelected();
        }
      } else if (mod && e.shiftKey && k === 'v') {
        if (typing) return;
        e.preventDefault();
        editorApi.pasteStyle();
      } else if (mod && k === 'v') {
        if (typing) return;
        e.preventDefault();
        const onThumbStrip = !!e.target?.closest?.('.thumb-strip') || !!document.activeElement?.closest?.('.thumb-strip');
        editorApi.pasteSelected({ preferThumbStrip: onThumbStrip });
      } else if (mod && k === 'a') {
        if (typing) return;
        e.preventDefault();
        editorApi.selectAll();
      } else if (mod && k === 'g' && e.shiftKey) {
        if (typing) return;
        e.preventDefault();
        editorApi.ungroupSelected();
      } else if (mod && k === 'g') {
        if (typing) return;
        e.preventDefault();
        editorApi.groupSelected();
      } else if (mod && k === 'x') {
        if (editorApi.cutInlineTextSelection()) {
          e.preventDefault();
          return;
        }
        if (typing) return;
        e.preventDefault();
        editorApi.cutSelected();
      } else if (mod && k === 'b') {
        if (typing && !e.target?.isContentEditable) return;
        e.preventDefault();
        editorApi.toggleTextStyle('bold');
      } else if (mod && k === 'i') {
        if (typing && !e.target?.isContentEditable) return;
        e.preventDefault();
        editorApi.toggleTextStyle('italic');
      } else if (mod && k === 'u') {
        if (typing && !e.target?.isContentEditable) return;
        e.preventDefault();
        editorApi.toggleTextStyle('underline');
      } else if (mod && k === 'l' && e.shiftKey) {
        if (typing) return;
        e.preventDefault();
        editorApi.toggleElementLock();
      } else if (mod && k === 'f') {
        e.preventDefault();
        editorApi.openFind();
      } else if (mod && k === 'h') {
        e.preventDefault();
        editorApi.openReplace();
      } else if (mod && k === 'p') {
        // Ctrl/Cmd+P would otherwise trigger the browser's native print, which prints
        // whatever's on screen (ribbons, panels, everything) — send it through our own
        // slides-only print instead.
        e.preventDefault();
        void editorApi.printSlides();
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (!useUiStore.getState().findOpen) editorApi.openFind();
        if (useUiStore.getState().findQuery.trim()) editorApi.findStep(e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape') {
        if (typing) return;
        e.preventDefault();
        editorApi.pickElement(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (typing) return;
        e.preventDefault();
        const st = usePresentationStore.getState();
        const { selId, multiSel, selConnId, selInkIds } = useSelectionStore.getState();
        const onThumbStrip = !!e.target?.closest?.('.thumb-strip');
        // If thumb strip is focused, always delete slides
        if (onThumbStrip || st.slideMultiSel?.length) {
          const ids = st.slideMultiSel?.length ? st.slideMultiSel : [st.cur];
          editorApi.delSlides(ids);
        } else if (selId || multiSel?.length || selConnId || selInkIds?.length) {
          // Element / connector / ink selected — delete that, not the slide
          editorApi.deleteSelected();
        } else {
          // Nothing selected — delete current slide
          editorApi.delSlides([st.cur]);
        }
      } else if (
        !typing &&
        !mod &&
        !e.altKey &&
        e.key.length === 1 &&
        !e.isComposing &&
        !ui.symbolsModalOpen
      ) {
        // Selected text box + type → enter edit, wipe content, insert the key (PowerPoint-like).
        const { selId, multiSel } = useSelectionStore.getState();
        if (multiSel?.length || !selId) return;
        const st = usePresentationStore.getState();
        const el = (st.slides[st.cur]?.els || []).find((x) => x && String(x.id) === String(selId));
        if (!el || el.type !== 'text' || el.locked) return;
        e.preventDefault();
        useUiStore.getState().requestInlineEdit(el.id, { clear: true, seed: e.key });
      } else if (!typing && !mod && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        if (e.target?.closest?.('.thumb-strip')) {
          const st = usePresentationStore.getState();
          const delta = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1;
          const next = Math.max(0, Math.min(st.slides.length - 1, st.cur + delta));
          if (next !== st.cur) editorApi.pickSlide(next);
          return;
        }
        const { selId, multiSel, selConnId, selInkIds } = useSelectionStore.getState();
        const hasObj =
          !!selId ||
          !!(multiSel && multiSel.length) ||
          !!selConnId ||
          !!(selInkIds && selInkIds.length);
        if (!hasObj) {
          canvasPanByKey(e.key, e.shiftKey);
          return;
        }
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        useHistoryStore.getState().push();
        editorApi.moveSelectedBy(dx, dy);
        if (selInkIds?.length) editorApi.moveSelectedInk(dx, dy);
      } else if (!typing && (isBracketLeft(e) || isBracketRight(e))) {
        e.preventDefault();
        const fwd = isBracketRight(e);
        if (e.ctrlKey || e.metaKey) {
          editorApi.layer(fwd ? 'up' : 'down');
          return;
        }
        if (e.shiftKey) {
          editorApi.layer(fwd ? 'front' : 'back');
          return;
        }
        editorApi.nudgeDrawSize(fwd ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    // Catches every way print can be triggered — our own Tools-tab button and Ctrl+P
    // already call editorApi.printSlides() directly, but the browser's own File/right-click
    // "Print…" menu calls window.print() (or the OS print shortcut) without going through
    // any of our code first. beforeprint fires regardless of which of those caused it, so
    // handling it here is the only way to catch that last case too. We can't cancel the
    // native dialog this event is about to open, so instead: blank out the app shell for
    // that native print target (see the app-native-print-suppress rule in App.css) and
    // kick off our own slides-only PDF print in parallel — the person ends up with our
    // correctly-paginated print job instead of (or alongside, if the browser's dialog isn't
    // actually blockable) a print of the blanked-out page.
    const onBeforePrint = () => {
      document.documentElement.classList.add('app-native-print-suppress');
      void editorApi.printSlides();
    };
    const onAfterPrint = () => {
      document.documentElement.classList.remove('app-native-print-suppress');
    };
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, []);

  return <AppShell />;
}

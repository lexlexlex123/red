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
import { setChartThemeColorsProvider } from './editor/tableChart.js';
import { THEMES, themeColors } from './editor/themes.js';
import { hydrateMissingFormulas } from './editor/slideThumb.js';
import { isBracketLeft, isBracketRight, latinKey } from './editor/hotkeys.js';
import { useSelectionStore } from './stores/selectionStore';
import { canvasPanByKey } from './editor/canvasViewport.js';

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
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const themeMode = useUiStore((s) => s.themeMode);
  const showToast = useUiStore((s) => s.showToast);
  const setComponentUpdates = useUiStore((s) => s.setComponentUpdates);
  const lang = useUiStore((s) => s.lang);

  useEffect(() => {
    setThemeMode(themeMode);
    registerServiceWorker();
    ensureIcons().catch(() => {});
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
    // Restore media blobs from IndexedDB into slide elements
    (async () => {
      try {
        const slides = usePresentationStore.getState().slides;
        const n = await hydrateSlides(slides);
        let formulas = 0;
        try {
          formulas = await hydrateMissingFormulas(slides);
        } catch (e) {
          console.warn('[hydrateMissingFormulas]', e);
        }
        if (n > 0 || formulas > 0) {
          usePresentationStore.setState({ slides: [...slides] });
        }
      } catch (e) {
        console.warn('[hydrateSlides]', e);
      }
      try {
        await editorApi.consumeImportUrl();
      } catch (e) {
        console.warn('[consumeImportUrl]', e);
      }
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
      } else if (mod && k === 'd') {
        if (typing) return;
        e.preventDefault();
        const onThumbStrip = !!e.target?.closest?.('.thumb-strip') || !!document.activeElement?.closest?.('.thumb-strip');
        if (onThumbStrip) {
          editorApi.dupSlide(usePresentationStore.getState().cur);
        } else {
          editorApi.dupSelected();
        }
      } else if (mod && e.shiftKey && k === 'c') {
        if (typing) return;
        e.preventDefault();
        editorApi.copyStyle();
      } else if (mod && k === 'c') {
        if (typing) return;
        e.preventDefault();
        const onCanvas = !!e.target?.closest?.('.react-slide-stage') || !!e.target?.closest?.('#canvas') || !!e.target?.closest?.('.react-el');
        if (onCanvas) editorApi.copySelected();
        else editorApi.copySlidesSelected();
      } else if (mod && e.shiftKey && k === 'v') {
        if (typing) return;
        e.preventDefault();
        editorApi.pasteStyle();
      } else if (mod && k === 'v') {
        if (typing) return;
        e.preventDefault();
        const onCanvas = !!e.target?.closest?.('.react-slide-stage') || !!e.target?.closest?.('#canvas') || !!e.target?.closest?.('.react-el');
        editorApi.pasteSelected({ preferThumbStrip: !onCanvas });
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
        const { selId, multiSel, selInkIds } = useSelectionStore.getState();
        const onThumbStrip = !!e.target?.closest?.('.thumb-strip');
        // If thumb strip is focused, always delete slides
        if (onThumbStrip || st.slideMultiSel?.length) {
          const ids = st.slideMultiSel?.length ? st.slideMultiSel : [st.cur];
          editorApi.delSlides(ids);
        } else if (selId || multiSel?.length || selInkIds?.length) {
          // Element(s) selected — delete elements
          editorApi.deleteSelected();
        } else {
          // Nothing selected — delete current slide
          editorApi.delSlides([st.cur]);
        }
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

  return <AppShell />;
}

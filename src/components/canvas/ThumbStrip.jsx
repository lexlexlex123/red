import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import { drawSlideThumb, slideThumbKey } from '../../editor/slideThumb.js';
import CanvasCtxMenu, { canPasteSlides } from './CanvasCtxMenu.jsx';
import AppIcon from '../ui/AppIcon.jsx';
import { APP_CHROME } from '../../editor/app-icons-data.js';

const STRIP_W = 182;
const PAD_X = 6;
const PAD_Y = 3;
const OVERSCAN = 4;
const THUMB_W = STRIP_W - PAD_X * 2;

function thumbHeight(canvasW, canvasH) {
  const ar = canvasW > 0 ? canvasH / canvasW : 9 / 16;
  return Math.max(54, Math.round(THUMB_W * ar));
}

function ThumbCanvas({ slide, slideIndex, canvasW, canvasH, thumbKey, w, h }) {
  const ref = useRef(null);
  const [asyncTick, setAsyncTick] = useState(0);
  useEffect(() => {
    setAsyncTick(0);
  }, [thumbKey]);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    drawSlideThumb(c, slide, canvasW, canvasH, {
      onAsyncReady: () => setAsyncTick((t) => t + 1),
    });
  }, [slide, canvasW, canvasH, thumbKey, slideIndex, asyncTick, w, h]);
  return (
    <canvas
      ref={ref}
      className="thumb-preview"
      width={w}
      height={h}
      aria-hidden="true"
    />
  );
}

export default function ThumbStrip() {
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const slideMultiSel = usePresentationStore((s) => s.slideMultiSel);
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const layoutIdx = usePresentationStore((s) => s.layoutIdx);
  const thumbEpoch = usePresentationStore((s) => s.thumbEpoch);
  const lang = useUiStore((s) => s.lang);
  const scrollerRef = useRef(null);
  const dragRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const [menu, setMenu] = useState(null);
  const [dragInsertAt, setDragInsertAt] = useState(null);
  const [draggingIds, setDraggingIds] = useState(null);

  const THUMB_H = thumbHeight(canvasW, canvasH);
  const ITEM_H = THUMB_H + PAD_Y * 2;
  const ADD_H = ITEM_H + 4;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight || 600));
    ro.observe(el);
    setViewportH(el.clientHeight || 600);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, []);

  const total = slides.length || 1;
  const start = Math.max(0, Math.floor(scrollTop / ITEM_H) - OVERSCAN);
  const end = Math.min(total, Math.ceil((scrollTop + viewportH) / ITEM_H) + OVERSCAN);
  const visible = useMemo(() => {
    const out = [];
    for (let i = start; i < end; i++) out.push(i);
    return out;
  }, [start, end]);

  const title = lang === 'en' ? 'Slides' : 'Слайды';
  const ru = lang !== 'en';
  const addLabel = ru ? 'Новый слайд' : 'New slide';

  function slideLabel(s, i) {
    const t = s?.title || s?.name;
    if (t) return t;
    return ru ? `Слайд ${i + 1}` : `Slide ${i + 1}`;
  }

  function openThumbMenu(e, i) {
    e.preventDefault();
    e.stopPropagation();
    const multi = slideMultiSel || [];
    if (!multi.includes(i)) editorApi.pickSlide(i);
    const st = usePresentationStore.getState();
    const ids = st.slideMultiSel?.length ? st.slideMultiSel : [i];
    setMenu({
      kind: 'thumb',
      i,
      ids,
      x: e.clientX,
      y: e.clientY,
      canPaste: canPasteSlides(),
      slideCount: st.slides.length,
      count: ids.length,
    });
  }

  function openEmptyMenu(e) {
    if (e.target.closest && (e.target.closest('.thumb-row') || e.target.closest('.thumb-add-row'))) return;
    e.preventDefault();
    e.stopPropagation();
    const el = scrollerRef.current;
    let at = slides.length;
    if (el) {
      const r = el.getBoundingClientRect();
      const y = e.clientY - r.top + el.scrollTop;
      at = Math.max(0, Math.min(slides.length, Math.round(y / ITEM_H)));
    }
    setMenu({
      kind: 'strip-empty',
      at,
      x: e.clientX,
      y: e.clientY,
      canPaste: canPasteSlides(),
    });
  }

  function insertAtFromClientY(clientY) {
    const skip = new Set(dragRef.current?.indices || []);
    const el = scrollerRef.current;
    if (!el) return slides.length;
    const r = el.getBoundingClientRect();
    const y = clientY - r.top + el.scrollTop;
    for (let i = 0; i < slides.length; i++) {
      if (skip.has(i)) continue;
      if (y < i * ITEM_H + ITEM_H / 2) return i;
    }
    return slides.length;
  }

  function onThumbDragStart(e, i) {
    const st = usePresentationStore.getState();
    const ids =
      st.slideMultiSel?.length > 1 && st.slideMultiSel.includes(i)
        ? [...st.slideMultiSel].sort((a, b) => a - b)
        : [i];
    e.dataTransfer.setData('text/plain', ids.join(','));
    e.dataTransfer.effectAllowed = 'move';
    dragRef.current = { indices: ids };
    setDraggingIds(ids);
    setDragInsertAt(i);
    setMenu(null);
  }

  function onScrollerDragOver(e) {
    if (!dragRef.current) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const at = insertAtFromClientY(e.clientY);
    setDragInsertAt((prev) => (prev === at ? prev : at));
    const el = scrollerRef.current;
    if (el) {
      const lr = el.getBoundingClientRect();
      const zone = 44;
      if (e.clientY > lr.bottom - zone) el.scrollTop += 12;
      else if (e.clientY < lr.top + zone) el.scrollTop -= 12;
    }
  }

  function clearDrag() {
    dragRef.current = null;
    setDraggingIds(null);
    setDragInsertAt(null);
  }

  function onScrollerDrop(e) {
    if (!dragRef.current) return;
    e.preventDefault();
    const ids = dragRef.current.indices;
    const at = insertAtFromClientY(e.clientY);
    clearDrag();
    editorApi.reorderSlides(ids, at);
  }

  return (
    <aside className="thumb-strip" aria-label={title} {...versionAttr('ThumbStrip')}>
      <div className="thumb-strip-hdr">
        <span className="thumb-strip-title">
          {title} <span className="thumb-strip-count">{total}</span>
        </span>
      </div>
      <div
        className={`thumb-strip-scroll${draggingIds ? ' is-dragging' : ''}`}
        ref={scrollerRef}
        onScroll={onScroll}
        onContextMenu={openEmptyMenu}
        onDragOver={onScrollerDragOver}
        onDrop={onScrollerDrop}
      >
        <div className="thumb-strip-inner" style={{ height: total * ITEM_H + ADD_H }}>
          {dragInsertAt != null ? (
            <div
              className="thumb-insert-line"
              style={{ top: Math.max(0, Math.min(total, dragInsertAt)) * ITEM_H }}
              aria-hidden="true"
            />
          ) : null}
          {visible.map((i) => {
            const s = slides[i] || {};
            const label = slideLabel(s, i);
            const key = slideThumbKey(s, i, `t${appliedThemeIdx}|l${layoutIdx}|e${thumbEpoch || 0}`);
            const active = i === cur;
            const multi = !!(slideMultiSel && slideMultiSel.includes(i));
            return (
              <button
                key={i}
                type="button"
                draggable
                className={`thumb-row${active ? ' active' : ''}${multi ? ' multi' : ''}${draggingIds && draggingIds.includes(i) ? ' is-dragging' : ''}`}
                style={{ top: i * ITEM_H, height: ITEM_H }}
                onClick={(e) => {
                  e.preventDefault();
                  editorApi.pickSlide(i, e);
                  e.currentTarget.blur();
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const multi = slideMultiSel || [];
                  if (multi.length > 1 && multi.includes(i)) editorApi.delSlides(multi);
                  else editorApi.delSlide(i);
                }}
                onContextMenu={(e) => openThumbMenu(e, i)}
                onDragStart={(e) => onThumbDragStart(e, i)}
                onDragEnd={clearDrag}
                title={label}
              >
                <span className="thumb-item">
                  <ThumbCanvas
                    key={key}
                    slide={s}
                    slideIndex={i}
                    canvasW={canvasW}
                    canvasH={canvasH}
                    thumbKey={key}
                    w={THUMB_W}
                    h={THUMB_H}
                  />
                  <span className="thumb-num">{i + 1}</span>
                  {s.trans && s.trans !== 'none' ? (
                    <span className="thumb-tbadge" title={ru ? 'Переход' : 'Transition'} />
                  ) : null}
                  {+(s.auto || 0) > 0 ? (
                    <span className="thumb-autobadge" title={ru ? 'Автопереход' : 'Auto-advance'} />
                  ) : null}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            className="thumb-add-row"
            style={{ top: total * ITEM_H, height: ADD_H }}
            title={addLabel}
            aria-label={addLabel}
            onClick={() => editorApi.addSlide(slides.length)}
          >
            <span className="thumb-add" data-ar={canvasW > canvasH ? '16:9' : '9:16'}>
              <AppIcon id={APP_CHROME.plus} size={18} sw={2} fillOp={0} />
            </span>
          </button>
        </div>
      </div>

      <CanvasCtxMenu menu={menu} ru={ru} onClose={() => setMenu(null)} />
    </aside>
  );
}

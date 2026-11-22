import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import { drawSlideThumb, slideThumbKey } from '../../editor/slideThumb.js';
import {
  buildStripLayout,
  insertIndexFromPointer,
  insertLinePos,
  trimmedSectionTitle,
} from '../../editor/slideSections.js';
import CanvasCtxMenu, { canPasteSlides } from './CanvasCtxMenu.jsx';
import AppIcon from '../ui/AppIcon.jsx';
import { APP_CHROME } from '../../editor/app-icons-data.js';
import { useMobileLayout } from '../../hooks/useMobileLayout.js';

const STRIP_W = 182;
const COLLAPSED_ROW_H = 28;
const COLLAPSED_ADD_H = 32;
const PAD_X = 6;
const PAD_Y = 3;
const OVERSCAN = 4;
const THUMB_W = STRIP_W - PAD_X * 2;
const MOBILE_THUMB_H = 64;

function thumbHeight(canvasW, canvasH) {
  const ar = canvasW > 0 ? canvasH / canvasW : 9 / 16;
  return Math.max(54, Math.round(THUMB_W * ar));
}

function mobileThumbSize(canvasW, canvasH) {
  const ar = canvasW > 0 && canvasH > 0 ? canvasW / canvasH : 16 / 9;
  const h = MOBILE_THUMB_H;
  const w = Math.max(40, Math.round(h * ar));
  return { w, h };
}

function ThumbCanvas({ slide, slideIndex, canvasW, canvasH, thumbKey, w, h, themeIdx }) {
  const ref = useRef(null);
  const [asyncTick, setAsyncTick] = useState(0);
  useEffect(() => {
    setAsyncTick(0);
  }, [thumbKey]);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    drawSlideThumb(c, slide, canvasW, canvasH, {
      themeIdx,
      onAsyncReady: () => setAsyncTick((t) => t + 1),
    });
  }, [slide, canvasW, canvasH, thumbKey, slideIndex, asyncTick, w, h, themeIdx]);
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
  const thumbsCollapsed = useUiStore((s) => s.thumbsCollapsed);
  const toggleThumbsCollapsed = useUiStore((s) => s.toggleThumbsCollapsed);
  const mobilePropsOpen = useUiStore((s) => s.mobilePropsOpen);
  const toggleMobileProps = useUiStore((s) => s.toggleMobileProps);
  const setMobilePropsOpen = useUiStore((s) => s.setMobilePropsOpen);
  const scrollerRef = useRef(null);
  const renameRef = useRef(null);
  const editingRef = useRef(null);
  const dragRef = useRef(null);
  const horiz = useMobileLayout();

  useEffect(() => {
    if (!horiz) setMobilePropsOpen(false);
  }, [horiz, setMobilePropsOpen]);
  const [scrollPos, setScrollPos] = useState(0);
  const [viewportSize, setViewportSize] = useState(600);
  const [menu, setMenu] = useState(null);
  const [dragInsertAt, setDragInsertAt] = useState(null);
  const [draggingIds, setDraggingIds] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [editDraft, setEditDraft] = useState('');

  const isCollapsed = !horiz && thumbsCollapsed;
  const vertThumbH = thumbHeight(canvasW, canvasH);
  const mob = mobileThumbSize(canvasW, canvasH);
  const thumbW = horiz ? mob.w : THUMB_W;
  const thumbH = horiz ? mob.h : vertThumbH;
  const itemMajor = isCollapsed
    ? COLLAPSED_ROW_H
    : horiz
      ? thumbW + PAD_X * 2
      : thumbH + PAD_Y * 2;
  const addMajor = isCollapsed ? COLLAPSED_ADD_H : itemMajor + 4;
  const ru = lang !== 'en';

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const measure = () => {
      setViewportSize(horiz ? el.clientWidth || 600 : el.clientHeight || 600);
      setScrollPos(horiz ? el.scrollLeft : el.scrollTop);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [horiz]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = 0;
    el.scrollLeft = 0;
    setScrollPos(0);
  }, [horiz]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setScrollPos(horiz ? el.scrollLeft : el.scrollTop);
  }, [horiz]);

  const layout = useMemo(
    () => buildStripLayout(slides, { itemMajor, addMajor, ru, horiz, flat: true }),
    [slides, itemMajor, addMajor, ru, horiz, isCollapsed]
  );

  // Only re-scroll when the current slide index changes — not when layout.items
  // refreshes (e.g. blur/commit after copying text in a contentEditable). Otherwise
  // a manual scroll that hid `cur` was snapped back as soon as the strip re-laid out.
  const prevCurRef = useRef(cur);
  useEffect(() => {
    const el = scrollerRef.current;
    const curChanged = prevCurRef.current !== cur;
    prevCurRef.current = cur;
    if (!el || horiz || !curChanged) return;
    const item = layout.items.find((it) => it.kind !== 'section' && it.i === cur);
    if (!item) return;
    const pad = 8;
    const view0 = el.scrollTop;
    const view1 = view0 + el.clientHeight;
    if (item.pos < view0 + pad) el.scrollTop = Math.max(0, item.pos - pad);
    else if (item.pos + item.major > view1 - pad) {
      el.scrollTop = Math.max(0, item.pos + item.major - el.clientHeight + pad);
    }
  }, [cur, layout.items, horiz, isCollapsed]);

  const visibleItems = useMemo(() => {
    const pad = OVERSCAN * itemMajor;
    const a = scrollPos - pad;
    const b = scrollPos + viewportSize + pad;
    return layout.items.filter((it) => it.pos + it.major >= a && it.pos <= b);
  }, [layout.items, scrollPos, viewportSize, itemMajor]);

  const total = slides.length || 1;
  const title = lang === 'en' ? 'Slides' : 'Слайды';
  const addLabel = ru ? 'Новый слайд' : 'New slide';
  const playLabel = ru ? 'Запустить презентацию' : 'Start presentation';

  useEffect(() => {
    if (editingSection == null) return undefined;
    const el = renameRef.current;
    if (!el) return undefined;
    el.focus();
    el.select();
    return undefined;
  }, [editingSection]);

  function slideLabel(s, i) {
    const t = s?.title || s?.name;
    if (t) return t;
    return ru ? `Слайд ${i + 1}` : `Slide ${i + 1}`;
  }

  function beginRename(i, currentTitle) {
    editingRef.current = i;
    setEditingSection(i);
    setEditDraft(currentTitle || '');
    setMenu(null);
  }

  function commitRename() {
    const i = editingRef.current;
    if (i == null) return;
    editingRef.current = null;
    const next = String(editDraft || '').trim();
    setEditingSection(null);
    setEditDraft('');
    if (next) editorApi.renameSection(i, next);
    else editorApi.removeSection(i);
  }

  function cancelRename() {
    editingRef.current = null;
    setEditingSection(null);
    setEditDraft('');
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
      isSectionStart: !!trimmedSectionTitle(st.slides[i]),
    });
  }

  function openSectionMenu(e, item) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({
      kind: 'section',
      i: item.i,
      title: item.title,
      collapsed: item.collapsed,
      count: item.count,
      x: e.clientX,
      y: e.clientY,
    });
  }

  function openEmptyMenu(e) {
    if (e.target.closest && (e.target.closest('.thumb-row') || e.target.closest('.thumb-add-row') || e.target.closest('.thumb-section'))) return;
    e.preventDefault();
    e.stopPropagation();
    const el = scrollerRef.current;
    let at = slides.length;
    if (el) {
      const r = el.getBoundingClientRect();
      const pos = horiz
        ? e.clientX - r.left + el.scrollLeft
        : e.clientY - r.top + el.scrollTop;
      at = insertIndexFromPointer(layout, slides.length, pos, null);
    }
    setMenu({
      kind: 'strip-empty',
      at,
      x: e.clientX,
      y: e.clientY,
      canPaste: canPasteSlides(),
    });
  }

  function insertAtFromPointer(clientX, clientY) {
    const skip = new Set(dragRef.current?.indices || []);
    const el = scrollerRef.current;
    if (!el) return slides.length;
    const r = el.getBoundingClientRect();
    const pos = horiz
      ? clientX - r.left + el.scrollLeft
      : clientY - r.top + el.scrollTop;
    return insertIndexFromPointer(layout, slides.length, pos, skip);
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
    const at = insertAtFromPointer(e.clientX, e.clientY);
    setDragInsertAt((prev) => (prev === at ? prev : at));
    const el = scrollerRef.current;
    if (el) {
      const lr = el.getBoundingClientRect();
      const zone = 44;
      if (horiz) {
        if (e.clientX > lr.right - zone) el.scrollLeft += 12;
        else if (e.clientX < lr.left + zone) el.scrollLeft -= 12;
      } else if (e.clientY > lr.bottom - zone) el.scrollTop += 12;
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
    const at = insertAtFromPointer(e.clientX, e.clientY);
    clearDrag();
    editorApi.reorderSlides(ids, at);
  }

  const innerStyle = horiz
    ? { width: layout.total, height: '100%' }
    : { height: layout.total };

  const insertLineStyle = (() => {
    if (dragInsertAt == null) return null;
    const pos = insertLinePos(layout, dragInsertAt, total);
    return horiz
      ? { left: pos, top: 4, bottom: 4, width: 2 }
      : { top: pos, left: 8, right: 8, height: 2, marginTop: -1 };
  })();

  return (
    <aside
      className={`thumb-strip${horiz ? ' is-horizontal' : ''}${isCollapsed ? ' is-collapsed' : ''}`}
      aria-label={title}
      {...versionAttr('ThumbStrip')}
    >
      {horiz ? (
        <div className="thumb-strip-actions">
          <button
            type="button"
            className="thumb-strip-play"
            onClick={() => editorApi.startPreview(0)}
            title={ru ? 'С начала (F5)' : 'From start (F5)'}
          >
            <AppIcon id={APP_CHROME.play} size={16} sw={0} />
            <span>{playLabel}</span>
          </button>
          <button
            type="button"
            className={`thumb-strip-props${mobilePropsOpen ? ' is-open' : ''}`}
            onClick={() => toggleMobileProps()}
            title={ru ? 'Свойства' : 'Properties'}
            aria-label={ru ? 'Свойства' : 'Properties'}
            aria-pressed={mobilePropsOpen}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : null}
      {horiz ? null : (
        <div className={`thumb-strip-hdr${isCollapsed ? ' is-collapsed' : ''}`}>
          <button
            type="button"
            className="thumb-strip-title"
            title={
              isCollapsed
                ? ru
                  ? 'Развернуть панель слайдов'
                  : 'Expand slides panel'
                : ru
                  ? 'Свернуть панель слайдов'
                  : 'Collapse slides panel'
            }
            aria-expanded={!isCollapsed}
            onClick={() => toggleThumbsCollapsed()}
          >
            <span className="thumb-strip-title-text">{title}</span>
            <span className="thumb-strip-count">{total}</span>
          </button>
        </div>
      )}
      <div
        className={`thumb-strip-scroll${draggingIds ? ' is-dragging' : ''}${horiz ? ' is-horizontal' : ''}`}
        ref={scrollerRef}
        onScroll={onScroll}
        onContextMenu={openEmptyMenu}
        onDragOver={onScrollerDragOver}
        onDrop={onScrollerDrop}
      >
        <div className={`thumb-strip-inner${horiz ? ' is-horizontal' : ''}`} style={innerStyle}>
          {insertLineStyle ? (
            <div className={`thumb-insert-line${horiz ? ' is-horizontal' : ''}`} style={insertLineStyle} aria-hidden="true" />
          ) : null}
          {visibleItems.map((item) => {
            if (item.kind === 'section') {
              const editing = editingSection === item.i;
              const rowStyle = horiz
                ? { left: item.pos, width: item.major, top: 0, bottom: 0, height: 'auto' }
                : { top: item.pos, height: item.major };
              return (
                <div
                  key={`sec-${item.i}`}
                  className={`thumb-section${item.collapsed ? ' is-collapsed' : ''}${horiz ? ' is-horizontal' : ''}`}
                  style={rowStyle}
                  onContextMenu={(e) => openSectionMenu(e, item)}
                >
                  <button
                    type="button"
                    className="thumb-section-chev"
                    aria-expanded={!item.collapsed}
                    title={item.collapsed ? (ru ? 'Развернуть' : 'Expand') : ru ? 'Свернуть' : 'Collapse'}
                    onClick={(e) => {
                      e.stopPropagation();
                      editorApi.toggleSectionCollapsed(item.i);
                    }}
                  >
                    {item.collapsed ? '▶' : '▼'}
                  </button>
                  {editing ? (
                    <input
                      ref={renameRef}
                      className="thumb-section-input"
                      value={editDraft}
                      aria-label={ru ? 'Название раздела' : 'Section name'}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitRename();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelRename();
                        }
                      }}
                      onBlur={commitRename}
                    />
                  ) : (
                    <button
                      type="button"
                      className="thumb-section-title"
                      onClick={() => editorApi.pickSection(item.i)}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        beginRename(item.i, item.title);
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </button>
                  )}
                  <span className="thumb-section-count">{item.count}</span>
                </div>
              );
            }
            const i = item.i;
            const s = slides[i] || {};
            const label = slideLabel(s, i);
            const key = slideThumbKey(s, i, `t${appliedThemeIdx}|l${layoutIdx}|e${thumbEpoch || 0}`);
            const active = i === cur;
            const multi = !!(slideMultiSel && slideMultiSel.includes(i));
            const rowStyle = horiz
              ? { left: item.pos, width: item.major, top: 0, bottom: 0, height: 'auto' }
              : { top: item.pos, height: item.major };
            return (
              <button
                key={i}
                type="button"
                draggable={!isCollapsed}
                className={`thumb-row${active ? ' active' : ''}${multi ? ' multi' : ''}${s.hidden ? ' is-hidden' : ''}${draggingIds && draggingIds.includes(i) ? ' is-dragging' : ''}${horiz ? ' is-horizontal' : ''}${isCollapsed ? ' is-compact' : ''}`}
                style={rowStyle}
                onPointerDown={() => {
                  // End in-canvas text edit/selection before the strip re-renders, so a
                  // pending contentEditable selection cannot fight the thumb click.
                  try {
                    const ae = document.activeElement;
                    if (ae && (ae.isContentEditable || ae.contentEditable === 'true')) {
                      ae.blur();
                    }
                    const sel = window.getSelection?.();
                    if (sel && !sel.isCollapsed) sel.removeAllRanges();
                  } catch (_) {}
                }}
                onClick={(e) => {
                  e.preventDefault();
                  editorApi.pickSlide(i, e);
                  e.currentTarget.blur();
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const m = slideMultiSel || [];
                  if (m.length > 1 && m.includes(i)) editorApi.delSlides(m);
                  else editorApi.delSlide(i);
                }}
                onContextMenu={(e) => openThumbMenu(e, i)}
                onDragStart={isCollapsed ? undefined : (e) => onThumbDragStart(e, i)}
                onDragEnd={isCollapsed ? undefined : clearDrag}
                title={label}
              >
                {isCollapsed ? (
                  <span className="thumb-compact-num">{i + 1}</span>
                ) : (
                  <span className="thumb-item" style={horiz ? { width: thumbW, height: thumbH } : undefined}>
                    <ThumbCanvas
                      key={key}
                      slide={s}
                      slideIndex={i}
                      canvasW={canvasW}
                      canvasH={canvasH}
                      thumbKey={key}
                      w={thumbW}
                      h={thumbH}
                      themeIdx={appliedThemeIdx}
                    />
                    <span className="thumb-num">{i + 1}</span>
                    {s.trans && s.trans !== 'none' ? (
                      <span className="thumb-tbadge" title={ru ? 'Переход' : 'Transition'} />
                    ) : null}
                    {+(s.auto || 0) > 0 ? (
                      <span className="thumb-autobadge" title={ru ? 'Автопереход' : 'Auto-advance'} />
                    ) : null}
                    {s.hidden ? (
                      <span className="thumb-hiddenbadge" title={ru ? 'Скрыт в показе' : 'Hidden in show'}>
                        👁‍
                      </span>
                    ) : null}
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            className={`thumb-add-row${horiz ? ' is-horizontal' : ''}${isCollapsed ? ' is-compact' : ''}`}
            style={
              horiz
                ? { left: layout.total - addMajor, width: addMajor, top: 0, bottom: 0, height: 'auto' }
                : { top: layout.total - addMajor, height: addMajor }
            }
            title={addLabel}
            aria-label={addLabel}
            onClick={() => editorApi.addSlide(slides.length)}
          >
            <span
              className={`thumb-add${isCollapsed ? ' is-compact' : ''}`}
              data-ar={canvasW > canvasH ? '16:9' : '9:16'}
              style={horiz ? { width: thumbW, height: thumbH } : undefined}
            >
              <AppIcon id={APP_CHROME.plus} size={isCollapsed ? 14 : 18} sw={2} fillOp={0} />
            </span>
          </button>
        </div>
      </div>

      <CanvasCtxMenu
        menu={menu}
        ru={ru}
        onClose={() => setMenu(null)}
        onRenameSection={(i, title) => beginRename(i, title)}
      />
    </aside>
  );
}

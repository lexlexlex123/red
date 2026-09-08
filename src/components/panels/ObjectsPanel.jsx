import React, { useRef, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useUiStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../stores/historyStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import AppIcon from '../ui/AppIcon';

const TYPE_ICON = {
  text: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <line x1="4" y1="6" x2="12" y2="6" />
      <line x1="4" y1="8.5" x2="10" y2="8.5" />
      <line x1="4" y1="11" x2="8" y2="11" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <circle cx="5.5" cy="6.5" r="1.2" />
      <path d="M2 11l3-3 2.5 2.5 2-2 4.5 4.5" />
    </svg>
  ),
  shape: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <polygon points="8,2 14,13 2,13" />
    </svg>
  ),
  table: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <line x1="7" y1="3" x2="7" y2="13" />
    </svg>
  ),
  icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <polygon points="8,2 10,6 14,6.5 11,9.5 11.5,14 8,12 4.5,14 5,9.5 2,6.5 6,6" />
    </svg>
  ),
  code: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <polyline points="5,5 2,8 5,11" />
      <polyline points="11,5 14,8 11,11" />
      <line x1="9" y1="3" x2="7" y2="13" />
    </svg>
  ),
  markdown: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="4" width="12" height="8" rx="1" />
      <path d="M5 10V6l2 2 2-2v4" />
      <path d="M12 10V6l-2 3" />
    </svg>
  ),
  svg: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M4 8c1-3 7-3 8 0s-7 3-8 0" />
    </svg>
  ),
  applet: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M5 8h6M8 5v6" />
    </svg>
  ),
  mediavideo: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="4" width="12" height="8" rx="1.5" />
      <polygon points="7,6.5 10.5,8 7,9.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  mediaaudio: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6 12V5l7-1v7" />
      <circle cx="4.5" cy="12" r="1.5" />
      <circle cx="11.5" cy="11" r="1.5" />
    </svg>
  ),
  model3d: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 2l6 3.5v7L8 16l-6-3.5v-7L8 2z" />
      <path d="M8 9l6-3.5M8 9v7M8 9L2 5.5" />
    </svg>
  ),
  inkhost: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 12c2-4 8-4 10 0" />
      <path d="M5 9c1.5-2 4.5-2 6 0" />
      <circle cx="8" cy="5" r="1.5" />
    </svg>
  ),
  connector: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 12 C6 12 10 4 14 4" />
      <circle cx="2" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="4" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  formula: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 4h10M4 4c0 4 8 4 8 8H4" />
    </svg>
  ),
  lineangle: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 13h12M2 13L11 3" />
      <path d="M6 13a5 5 0 0 0 3.2-4" />
    </svg>
  ),
  htmlframe: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M5 7l-1.5 1L5 9M11 7l1.5 1L11 9M8.5 6.5l-1 3" />
    </svg>
  ),
  graph: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 13h12M3 11l3-4 3 2 4-6" />
    </svg>
  ),
  lego: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="6" width="10" height="7" rx="1" />
      <rect x="5" y="4" width="2.5" height="2" rx="0.5" />
      <rect x="8.5" y="4" width="2.5" height="2" rx="0.5" />
    </svg>
  ),
  pagenum: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="2" width="10" height="12" rx="1" />
      <path d="M6 6h4M6 9h4M6 12h2" />
    </svg>
  ),
};

const HANDLE_SVG = (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="4" r="1.1" />
    <circle cx="5" cy="8" r="1.1" />
    <circle cx="5" cy="12" r="1.1" />
    <circle cx="11" cy="4" r="1.1" />
    <circle cx="11" cy="8" r="1.1" />
    <circle cx="11" cy="12" r="1.1" />
  </svg>
);

/** Catalog: 43 eye, 44 eye_off, 50 lock, 51 unlock */
const ICON_EYE = <AppIcon id={43} size={14} sw={1.6} />;
const ICON_EYE_OFF = <AppIcon id={44} size={14} sw={1.6} />;
const ICON_LOCK = <AppIcon id={50} size={14} sw={1.6} />;
const ICON_UNLOCK = <AppIcon id={51} size={14} sw={1.6} />;

function elKindKey(d) {
  if (d.type === 'shape') return `shape:${d.shape || '?'}`;
  if (d.type === 'icon') return `icon:${d.iconId || '?'}`;
  if (d.type === 'applet') return `applet:${d.appletId || '?'}`;
  if (d.type === 'lineangle') return 'lineangle';
  return d.type || 'el';
}

function labelFor(el, allEls, ru) {
  if (!el) return ru ? 'Объект' : 'Object';
  if (el.morphName && String(el.morphName).trim()) return el.morphName;

  const kind = elKindKey(el);
  const same = (allEls || []).filter((x) => x && !x._isDecor && elKindKey(x) === kind);
  const idx = same.length > 1 ? same.findIndex((x) => x.id === el.id) + 1 : 0;
  const sfx = idx > 0 ? ` ${idx}` : '';

  if (el.type === 'text') return (ru ? 'Текст' : 'Text') + sfx;
  if (el.type === 'shape') return (el.shape || (ru ? 'Фигура' : 'Shape')) + sfx;
  if (el.type === 'image') return (el._isQR ? 'QR' : ru ? 'Изображение' : 'Image') + sfx;
  if (el.type === 'table') return (ru ? 'Таблица' : 'Table') + sfx;
  if (el.type === 'icon') return (el.iconId || (ru ? 'Иконка' : 'Icon')) + sfx;
  if (el.type === 'code') return (ru ? 'Код' : 'Code') + sfx;
  if (el.type === 'markdown') return 'Markdown' + sfx;
  if (el.type === 'svg') return 'SVG' + sfx;
  if (el.type === 'htmlframe') return 'HTML' + sfx;
  if (el.type === 'formula') return (ru ? 'Формула' : 'Formula') + sfx;
  if (el.type === 'pagenum') return (ru ? 'Номер страницы' : 'Page #') + sfx;
  if (el.type === 'lineangle') return (ru ? 'Угол' : 'Angle') + sfx;
  if (el.type === 'inkhost') return (ru ? 'Рисунок' : 'Drawing') + sfx;
  if (el.type === 'model3d') {
    const n = el.objName ? String(el.objName).replace(/\.obj$/i, '') : '';
    return (n || 'OBJ') + sfx;
  }
  if (el.type === 'mediavideo') return (ru ? 'Видео' : 'Video') + sfx;
  if (el.type === 'mediaaudio') return (ru ? 'Аудио' : 'Audio') + sfx;
  if (el.type === 'lego') return (ru ? 'Лего' : 'Lego') + sfx;
  if (el.type === 'graph') {
    if (el.graphKind === 'chem') return (el.chemKey || (ru ? 'Химия' : 'Chem')) + sfx;
    if (el.graphKind === 'logic') return ((el.graphLatex || '').slice(0, 24) || (ru ? 'Логика' : 'Logic')) + sfx;
    return (ru ? 'График' : 'Graph') + sfx;
  }
  if (el.type === 'applet' && el.appletId) {
    const names = {
      clock: ru ? 'Часы' : 'Clock',
      calculator: ru ? 'Калькулятор' : 'Calculator',
      timer: ru ? 'Таймер' : 'Timer',
      generator: ru ? 'Генератор' : 'Generator',
      counter: ru ? 'Счётчик' : 'Counter',
      flip: ru ? 'Перевертыш' : 'Flip',
      periodic: el.pteSymbol || (ru ? 'Таблица Менделеева' : 'Periodic table'),
      notes: ru ? 'Заметка' : 'Notes',
    };
    return (names[el.appletId] || el.appletId) + sfx;
  }
  return (el.type || (ru ? 'Объект' : 'Object')) + sfx;
}

function connLabel(conn, ci, total, ru) {
  if (conn.morphName && String(conn.morphName).trim()) return conn.morphName;
  const kind =
    conn.type === 'arrow' || (conn.toMarker && conn.toMarker !== 'none')
      ? ru
        ? 'Стрелка'
        : 'Arrow'
      : ru
        ? 'Линия'
        : 'Line';
  return kind + (total > 1 ? ` ${ci + 1}` : '');
}

/**
 * Slide object list — v7.1 layout + lock toggle.
 * objHidden hides on canvas and in presentation/export.
 */
export default function ObjectsPanel() {
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const selId = useSelectionStore((s) => s.selId);
  const multiSel = useSelectionStore((s) => s.multiSel);
  const selConnId = useSelectionStore((s) => s.selConnId);
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const listRef = useRef(null);
  const dragRef = useRef(null);

  const slide = slides[cur] || {};
  const rawEls = slide.els || [];
  const els = [...rawEls].filter((e) => e && !e._isDecor).reverse();
  const conns = slide.connectors || [];
  const selected = new Set((multiSel || []).map(String));
  if (selId) selected.add(String(selId));

  function toggleHidden(el, e) {
    e.stopPropagation();
    useHistoryStore.getState().push();
    usePresentationStore.getState().patchElement(el.id, { objHidden: !el.objHidden });
    if (!el.objHidden && selected.has(String(el.id))) {
      useSelectionStore.getState().pickOne(null);
    }
  }

  function toggleLock(el, e) {
    e.stopPropagation();
    editorApi.toggleElementLock(el.id);
  }

  function startRename(el, e) {
    e.stopPropagation();
    setRenamingId(String(el.id));
    setRenameVal(el.morphName || labelFor(el, rawEls, ru));
  }

  function commitRename(el) {
    const auto = labelFor({ ...el, morphName: null }, rawEls, ru);
    const val = String(renameVal || '').trim();
    useHistoryStore.getState().push();
    usePresentationStore
      .getState()
      .patchElement(el.id, { morphName: !val || val === auto ? '' : val });
    setRenamingId(null);
  }

  function toggleConnHidden(conn, e) {
    e.stopPropagation();
    useHistoryStore.getState().push();
    usePresentationStore.getState().patchConnector(conn.id, { objHidden: !conn.objHidden });
  }

  function pickRow(el, e) {
    if (el.objHidden) return;
    editorApi.pickElement(el.id, { shift: e.shiftKey });
  }

  function onHandlePointerDown(el, e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const row = e.currentTarget.closest('.react-obj-row');
    if (!row) return;
    const rect = row.getBoundingClientRect();
    dragRef.current = {
      id: String(el.id),
      pointerId: e.pointerId,
      offsetY: e.clientY - rect.top,
      ghost: null,
    };
    setDragId(String(el.id));
    const ghost = row.cloneNode(true);
    ghost.classList.add('react-obj-ghost');
    ghost.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;pointer-events:none;z-index:9999;opacity:.92;`;
    document.body.appendChild(ghost);
    dragRef.current.ghost = ghost;
    row.classList.add('is-dragging');
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  }

  function onHandlePointerMove(e) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    if (d.ghost) d.ghost.style.top = `${e.clientY - d.offsetY}px`;
    const rows = listRef.current
      ? Array.from(listRef.current.querySelectorAll('.react-obj-row[data-el-id]:not(.is-dragging)'))
      : [];
    let nextOver = null;
    for (const r of rows) {
      const rect = r.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height * 0.5) {
        nextOver = r.getAttribute('data-el-id');
        break;
      }
    }
    if (!nextOver && rows.length) {
      // below last → insert after last = overId null means append end of front-first list
      nextOver = '__end__';
    }
    setOverId(nextOver);
  }

  function onHandlePointerUp(e) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const fromId = d.id;
    const insertBefore = overId === '__end__' ? null : overId;
    if (d.ghost?.parentNode) d.ghost.parentNode.removeChild(d.ghost);
    listRef.current?.querySelectorAll('.is-dragging').forEach((r) => r.classList.remove('is-dragging'));
    dragRef.current = null;
    setDragId(null);
    setOverId(null);

    const order = els.map((x) => String(x.id));
    const from = order.indexOf(fromId);
    if (from < 0) return;
    let to;
    if (!insertBefore) to = order.length;
    else {
      to = order.indexOf(String(insertBefore));
      if (to < 0) return;
    }
    if (to === from || to === from + 1) return;
    const next = order.slice();
    next.splice(from, 1);
    const insertAt = to > from ? to - 1 : to;
    next.splice(insertAt, 0, fromId);
    useHistoryStore.getState().push();
    usePresentationStore.getState().reorderElsFrontFirst(next);
  }

  return (
    <section className="react-props-section react-objects-panel" {...versionAttr('ObjectsPanel')}>
      <div className="react-props-hdr">{ru ? 'объекты слайда' : 'slide objects'}</div>
      {els.length === 0 && !conns.length ? (
        <p className="react-props-muted">{ru ? 'На слайде нет объектов' : 'No objects on slide'}</p>
      ) : (
        <div className="react-obj-list" ref={listRef}>
          {conns.map((conn, ci) => {
            const active = selConnId && String(selConnId) === String(conn.id);
            return (
              <div
                key={conn.id}
                className={`react-obj-row${active ? ' is-sel' : ''}${conn.objHidden ? ' is-hidden' : ''}`}
                onMouseDown={(e) => {
                  if (e.target.closest('.react-obj-eye, .react-obj-lock, .react-obj-handle')) return;
                  e.preventDefault();
                  if (conn.objHidden) return;
                  useSelectionStore.getState().pickConnector(conn.id);
                }}
              >
                <span className="react-obj-handle" style={{ opacity: 0.25 }}>
                  {HANDLE_SVG}
                </span>
                <span className="react-obj-icon">{TYPE_ICON.connector}</span>
                <span className="react-obj-label">{connLabel(conn, ci, conns.length, ru)}</span>
                <button
                  type="button"
                  className={`react-obj-eye${conn.objHidden ? ' is-off' : ''}`}
                  title={conn.objHidden ? (ru ? 'Показать' : 'Show') : ru ? 'Скрыть' : 'Hide'}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => toggleConnHidden(conn, e)}
                >
                  {conn.objHidden ? ICON_EYE_OFF : ICON_EYE}
                </button>
              </div>
            );
          })}

          {els.map((el) => {
            const active = selected.has(String(el.id));
            const renaming = renamingId === String(el.id);
            const isDrag = dragId === String(el.id);
            const showLine = overId === String(el.id) && dragId && dragId !== String(el.id);
            return (
              <div key={el.id}>
                {showLine ? <div className="react-obj-drop-line" /> : null}
                <div
                  data-el-id={el.id}
                  className={`react-obj-row${active ? ' is-sel' : ''}${el.objHidden ? ' is-hidden' : ''}${el.locked ? ' is-locked' : ''}${isDrag ? ' is-dragging' : ''}`}
                  onMouseDown={(e) => {
                    if (e.target.closest('.react-obj-eye, .react-obj-lock, .react-obj-handle')) return;
                    if (renaming) return;
                    if (e.detail > 1) {
                      e.preventDefault();
                      return;
                    }
                    e.preventDefault();
                    pickRow(el, e);
                  }}
                >
                  <span
                    className="react-obj-handle"
                    onPointerDown={(e) => onHandlePointerDown(el, e)}
                    onPointerMove={onHandlePointerMove}
                    onPointerUp={onHandlePointerUp}
                    onPointerCancel={onHandlePointerUp}
                  >
                    {HANDLE_SVG}
                  </span>
                  <span className="react-obj-icon">{TYPE_ICON[el.type] || TYPE_ICON.shape}</span>
                  {renaming ? (
                    <input
                      className="react-obj-rename"
                      value={renameVal}
                      autoFocus
                      onChange={(e) => setRenameVal(e.target.value)}
                      onBlur={() => commitRename(el)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(el);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className={`react-obj-label${el.morphName ? ' is-named' : ''}`}
                      title={
                        el.morphName
                          ? ru
                            ? `Имя: ${el.morphName} (двойной клик — переименовать)`
                            : `Name: ${el.morphName} (double-click to rename)`
                          : ru
                            ? `${labelFor(el, rawEls, ru)} (двойной клик — имя для морфинга)`
                            : `${labelFor(el, rawEls, ru)} (double-click to rename)`
                      }
                      onDoubleClick={(e) => startRename(el, e)}
                    >
                      {labelFor(el, rawEls, ru)}
                    </span>
                  )}
                  <button
                    type="button"
                    className={`react-obj-lock${el.locked ? ' is-on' : ''}`}
                    title={el.locked ? (ru ? 'Разблокировать' : 'Unlock') : ru ? 'Заблокировать' : 'Lock'}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => toggleLock(el, e)}
                  >
                    {el.locked ? ICON_LOCK : ICON_UNLOCK}
                  </button>
                  <button
                    type="button"
                    className={`react-obj-eye${el.objHidden ? ' is-off' : ''}`}
                    title={el.objHidden ? (ru ? 'Показать' : 'Show') : ru ? 'Скрыть' : 'Hide'}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => toggleHidden(el, e)}
                  >
                    {el.objHidden ? ICON_EYE_OFF : ICON_EYE}
                  </button>
                </div>
              </div>
            );
          })}
          {overId === '__end__' && dragId ? <div className="react-obj-drop-line" /> : null}
        </div>
      )}
    </section>
  );
}

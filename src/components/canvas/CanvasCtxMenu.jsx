import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { editorApi } from '../../editor/editorApi';
import { usePresentationStore } from '../../stores/presentationStore';
import { versionAttr } from '../../editor/versions.js';
import AppIcon from '../ui/AppIcon.jsx';
import { APP_CHROME } from '../../editor/app-icons-data.js';

const ico = (id, sw = 1.8) => <AppIcon id={id} size={14} sw={sw} fillOp={0} />;
const ICO = {
  add: ico(APP_CHROME.plus),
  group: ico(APP_CHROME.group),
  ungroup: ico(APP_CHROME.ungroup),
  dup: ico(APP_CHROME.dup),
  copy: ico(APP_CHROME.copy),
  paste: ico(APP_CHROME.paste),
  qr: ico(APP_CHROME.qr),
  layerUp: ico(APP_CHROME.layerUp, 2),
  layerDown: ico(APP_CHROME.layerDown, 2),
  del: ico(APP_CHROME.clear),
};

function labels(ru, count) {
  const n = count || 1;
  return {
    add: ru ? 'Новый слайд' : 'New slide',
    group: ru ? 'Сгруппировать' : 'Group',
    ungroup: ru ? 'Разгруппировать' : 'Ungroup',
    dup: ru ? 'Дублировать' : 'Duplicate',
    copy: n > 1 ? (ru ? `Копировать (${n})` : `Copy (${n})`) : ru ? 'Копировать' : 'Copy',
    paste: ru ? 'Вставить' : 'Paste',
    qr: ru ? 'Создать QR-код' : 'Create QR code',
    layerUp: ru ? 'Слой вверх' : 'Bring forward',
    layerDown: ru ? 'Слой вниз' : 'Send backward',
    del: n > 1 ? (ru ? `Удалить (${n})` : `Delete (${n})`) : ru ? 'Удалить' : 'Delete',
  };
}

function Item({ icon, label, warn, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`slide-ctx-item${warn ? ' slide-ctx-warn' : ''}${disabled ? ' disabled' : ''}`}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
    >
      <span className="slide-ctx-ico">{icon}</span>
      <span className="slide-ctx-lbl">{label}</span>
    </button>
  );
}

export default function CanvasCtxMenu({ menu, ru, onClose, onRenameSection }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m || !menu) return;
    const pad = 8;
    const mw = m.offsetWidth;
    const mh = m.offsetHeight;
    let lx = menu.x;
    let ly = menu.y;
    if (lx + mw + pad > window.innerWidth) lx = window.innerWidth - mw - pad;
    if (ly + mh + pad > window.innerHeight) ly = window.innerHeight - mh - pad;
    if (lx < pad) lx = pad;
    if (ly < pad) ly = pad;
    m.style.left = `${lx}px`;
    m.style.top = `${ly}px`;
    m.style.visibility = 'visible';
  }, [menu]);

  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => {
      if (e && e.button === 2) return;
      if (ref.current && e?.target && ref.current.contains(e.target)) return;
      onClose();
    };
    const onCtx = (e) => {
      if (ref.current && e?.target && ref.current.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', close, true);
    document.addEventListener('contextmenu', onCtx, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', close, true);
      document.removeEventListener('contextmenu', onCtx, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const L = labels(ru, menu.count);
  const run = (fn) => {
    onClose();
    fn();
  };

  let items = [];
  if (menu.kind === 'strip-empty') {
    const at = menu.at != null ? menu.at : undefined;
    items = [
      {
        key: 'add',
        icon: ICO.add,
        label: L.add,
        onClick: () => run(() => editorApi.addSlide(at != null ? at : undefined)),
      },
      {
        key: 'paste',
        icon: ICO.paste,
        label: L.paste,
        disabled: !menu.canPaste,
        onClick: () => run(() => editorApi.pasteSlide(at)),
      },
    ];
  } else if (menu.kind === 'canvas') {
    items = [
      {
        key: 'paste',
        icon: ICO.paste,
        label: L.paste,
        disabled: !menu.canPaste,
        onClick: () => run(() => editorApi.pasteSelected()),
      },
    ];
  } else if (menu.kind === 'section') {
    items = [
      {
        key: 'rename',
        icon: ICO.group,
        label: ru ? 'Переименовать раздел' : 'Rename section',
        onClick: () =>
          run(() => {
            if (onRenameSection) onRenameSection(menu.i, menu.title);
            else editorApi.renameSection(menu.i, menu.title);
          }),
      },
      {
        key: 'collapse',
        icon: ICO.group,
        label: menu.collapsed
          ? ru
            ? 'Развернуть раздел'
            : 'Expand section'
          : ru
            ? 'Свернуть раздел'
            : 'Collapse section',
        onClick: () => run(() => editorApi.toggleSectionCollapsed(menu.i)),
      },
      {
        key: 'add',
        icon: ICO.add,
        label: ru ? 'Новый слайд в разделе' : 'New slide in section',
        onClick: () => run(() => editorApi.addSlide(menu.i + (menu.count || 1))),
      },
      {
        key: 'remove',
        icon: ICO.ungroup,
        label: ru ? 'Убрать раздел' : 'Remove section',
        onClick: () => run(() => editorApi.removeSection(menu.i)),
      },
    ];
  } else if (menu.kind === 'thumb') {
    const ids = menu.ids?.length ? menu.ids : [menu.i];
    const multi = ids.length > 1;
    const Lthumb = labels(ru, ids.length);
    items = [
      {
        key: 'add',
        icon: ICO.add,
        label: Lthumb.add,
        onClick: () => run(() => editorApi.addSlide(Math.max(...ids) + 1)),
      },
      !multi
        ? {
            key: 'dup',
            icon: ICO.dup,
            label: Lthumb.dup,
            onClick: () => run(() => editorApi.dupSlide(menu.i)),
          }
        : null,
      !multi
        ? {
            key: 'hide',
            icon: ICO.copy,
            label: usePresentationStore.getState().slides[menu.i]?.hidden
              ? ru
                ? 'Показать в показе'
                : 'Show in slideshow'
              : ru
                ? 'Скрыть в показе'
                : 'Hide in slideshow',
            onClick: () => run(() => editorApi.toggleSlideHidden(menu.i)),
          }
        : null,
      {
        key: 'copy',
        icon: ICO.copy,
        label: Lthumb.copy,
        onClick: () => run(() => editorApi.copySlidesSelected(ids)),
      },
      {
        key: 'paste',
        icon: ICO.paste,
        label: Lthumb.paste,
        disabled: !menu.canPaste,
        onClick: () => run(() => editorApi.pasteSlide(Math.max(...ids) + 1)),
      },
      {
        key: 'del',
        icon: ICO.del,
        label: Lthumb.del,
        warn: true,
        disabled: menu.slideCount <= 1,
        onClick: () => run(() => (multi ? editorApi.delSlides(ids) : editorApi.delSlide(menu.i))),
      },
    ].filter(Boolean);
  } else if (menu.kind === 'table-cells') {
    const canDelRow = (menu.rows || 1) > 1;
    const canDelCol = (menu.cols || 1) > 1;
    const canMerge = (menu.selCount || 1) >= 2;
    items = [
      {
        key: 'row-above',
        icon: ICO.add,
        label: ru ? 'Строка сверху' : 'Row above',
        onClick: () => run(() => editorApi.tableAddRow({ before: true })),
      },
      {
        key: 'row-below',
        icon: ICO.add,
        label: ru ? 'Строка снизу' : 'Row below',
        onClick: () => run(() => editorApi.tableAddRow({ after: true })),
      },
      {
        key: 'col-left',
        icon: ICO.add,
        label: ru ? 'Столбец слева' : 'Column left',
        onClick: () => run(() => editorApi.tableAddCol({ before: true })),
      },
      {
        key: 'col-right',
        icon: ICO.add,
        label: ru ? 'Столбец справа' : 'Column right',
        onClick: () => run(() => editorApi.tableAddCol({ after: true })),
      },
      { key: 'sep1', sep: true },
      {
        key: 'del-row',
        icon: ICO.del,
        label: ru ? 'Удалить строку' : 'Delete row',
        warn: true,
        disabled: !canDelRow,
        onClick: () => run(() => editorApi.tableDelRow()),
      },
      {
        key: 'del-col',
        icon: ICO.del,
        label: ru ? 'Удалить столбец' : 'Delete column',
        warn: true,
        disabled: !canDelCol,
        onClick: () => run(() => editorApi.tableDelCol()),
      },
      { key: 'sep2', sep: true },
      {
        key: 'copy',
        icon: ICO.copy,
        label: ru ? 'Копировать' : 'Copy',
        onClick: () => run(() => editorApi.copySelectedTableCells()),
      },
      {
        key: 'paste',
        icon: ICO.paste,
        label: ru ? 'Вставить' : 'Paste',
        onClick: () => run(() => editorApi.pasteIntoSelectedTableCells()),
      },
      {
        key: 'merge',
        icon: ICO.group,
        label: ru ? 'Объединить' : 'Merge',
        disabled: !canMerge,
        onClick: () => run(() => editorApi.tableMergeCells()),
      },
      {
        key: 'split',
        icon: ICO.ungroup,
        label: ru ? 'Разъединить' : 'Unmerge',
        disabled: !menu.canSplit,
        onClick: () => run(() => editorApi.tableSplitCells()),
      },
    ];
  } else {
    items = [
      menu.qrText
        ? {
            key: 'qr',
            icon: ICO.qr,
            label: L.qr,
            onClick: () => run(() => editorApi.addQrCode(menu.qrText)),
          }
        : null,
      menu.showUngroup
        ? {
            key: 'ungroup',
            icon: ICO.ungroup,
            label: L.ungroup,
            onClick: () => run(() => editorApi.ungroupSelected()),
          }
        : menu.showGroup
          ? {
              key: 'group',
              icon: ICO.group,
              label: L.group,
              onClick: () => run(() => editorApi.groupSelected()),
            }
          : null,
      {
        key: 'dup',
        icon: ICO.dup,
        label: L.dup,
        onClick: () =>
          run(() => {
            if ((menu.count || 1) > 1) {
              editorApi.copySelected();
              editorApi.pasteSelected();
            } else {
              editorApi.dupSelected();
            }
          }),
      },
      {
        key: 'copy',
        icon: ICO.copy,
        label: L.copy,
        onClick: () => run(() => editorApi.copySelected()),
      },
      {
        key: 'paste',
        icon: ICO.paste,
        label: L.paste,
        disabled: !menu.canPaste,
        onClick: () => run(() => editorApi.pasteSelected()),
      },
      {
        key: 'up',
        icon: ICO.layerUp,
        label: L.layerUp,
        onClick: () => run(() => editorApi.layer('up')),
      },
      {
        key: 'down',
        icon: ICO.layerDown,
        label: L.layerDown,
        onClick: () => run(() => editorApi.layer('down')),
      },
      {
        key: 'del',
        icon: ICO.del,
        label: L.del,
        warn: true,
        onClick: () => run(() => editorApi.deleteSelected()),
      },
    ].filter(Boolean);
  }

  return createPortal(
    <div
      ref={ref}
      className={`slide-ctx-menu${menu.kind === 'table-cells' ? ' is-compact' : ''}`}
      role="menu"
      style={{ left: menu.x, top: menu.y, visibility: 'hidden' }}
      onMouseDown={(e) => e.stopPropagation()}
      {...versionAttr('CanvasCtxMenu')}
    >
      {items.map((it) =>
        it.sep ? (
          <div key={it.key} className="slide-ctx-sep" role="separator" />
        ) : (
          <Item
            key={it.key}
            icon={it.icon}
            label={it.label}
            warn={it.warn}
            disabled={it.disabled}
            onClick={it.onClick}
          />
        )
      )}
    </div>,
    document.body
  );
}

export function canPasteSlides() {
  return !!(usePresentationStore.getState().slideClipboard?.length);
}

export function canPasteElements() {
  return !!(usePresentationStore.getState().clipboard?.els?.length);
}

export function canPasteTableCells() {
  return !!(editorApi._tableCellClipboard && String(editorApi._tableCellClipboard).length);
}

export function ctxGroupMenuState(elems, allEls) {
  if (!elems.length) return { showGroup: false, showUngroup: false };
  if (elems.length < 2) {
    return { showGroup: false, showUngroup: !!elems[0].groupId };
  }
  const groupIds = new Set();
  elems.forEach((el) => {
    if (el.groupId) groupIds.add(el.groupId);
  });
  if (groupIds.size === 1) {
    const gid = groupIds.values().next().value;
    const full = (allEls || []).filter((e) => e && e.groupId === gid && !e._isDecor);
    if (full.length >= 2 && full.length === elems.length) {
      const set = new Set(elems.map((e) => String(e.id)));
      if (full.every((ge) => set.has(String(ge.id)))) {
        return { showGroup: false, showUngroup: true };
      }
    }
  }
  return { showGroup: true, showUngroup: false };
}

export function qrTextFromEl(el) {
  if (!el || el.type !== 'text') return '';
  const sel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (sel && sel.rangeCount && !sel.isCollapsed) {
    const t = (sel.toString() || '').trim();
    if (t) return t;
  }
  const raw = el.text || String(el.html || '').replace(/<[^>]+>/g, ' ');
  return String(raw || '').replace(/\s+/g, ' ').trim();
}

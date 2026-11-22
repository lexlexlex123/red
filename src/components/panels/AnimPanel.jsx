import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePresentationStore } from '../../stores/presentationStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import {
  ANIM_CATS,
  animDuration,
  animLabel,
  findAnimCat,
  findAnimItem,
} from '../../editor/anims.js';
import { peekAnimOrder } from '../../editor/animOrder.js';
import { getSlideDisplayTitle } from '../../editor/slideTitles.js';
import { versionAttr } from '../../editor/versions.js';
import { clearAnimHoverPreview, playAnimHoverPreview } from '../../editor/animHoverPreview.js';
import { triggerElLabel } from '../../editor/appletOnEnd.js';
import Toggle from '../ui/Toggle.jsx';
import GSlider from '../ui/GSlider.jsx';
import ColorField from '../ui/ColorField.jsx';
import AppIcon from '../ui/AppIcon.jsx';
import { APP_CHROME } from '../../editor/app-icons-data.js';
import { PATH_PRESETS, pathPresetPts } from '../../editor/motionGeom.js';

const TYPE_NAMES_RU = {
  text: 'Текст',
  image: 'Изображение',
  shape: 'Фигура',
  table: 'Таблица',
  icon: 'Иконка',
  code: 'Код',
  markdown: 'Markdown',
  svg: 'SVG',
  inkhost: 'Рисунок',
  camera: 'Камера',
};
const TYPE_NAMES_EN = {
  text: 'Text',
  image: 'Image',
  shape: 'Shape',
  table: 'Table',
  icon: 'Icon',
  code: 'Code',
  markdown: 'Markdown',
  svg: 'SVG',
  inkhost: 'Drawing',
  camera: 'Camera',
};

const CAT_BADGE = {
  entrance: { ru: 'Вход', en: 'In' },
  emphasis: { ru: 'Выделение', en: 'Emph' },
  exit: { ru: 'Выход', en: 'Out' },
  motion: { ru: 'Движение', en: 'Path' },
  live: { ru: 'Живая', en: 'Live' },
  blocks: { ru: 'Блоки', en: 'Blocks' },
};

const TRIGGER_ICONS = {
  auto: '▶',
  click: '🖱',
  withPrev: '⟳',
  element: '👆',
  counter: '🔢',
  timer: '⏱',
  nav: '→',
};

function elDisplayName(slide, el, lang) {
  const ru = lang !== 'en';
  const names = ru ? TYPE_NAMES_RU : TYPE_NAMES_EN;
  if (!el) return ru ? 'Объект' : 'Object';
  if (el.groupId) {
    const gCount = (slide?.els || []).filter((x) => x && x.groupId === el.groupId).length;
    return (ru ? 'Группа' : 'Group') + (gCount > 1 ? ` (${gCount})` : '');
  }
  const sameType = (slide?.els || []).filter((x) => x && x.type === el.type);
  const idx = sameType.length > 1 ? sameType.findIndex((x) => x.id === el.id) + 1 : 0;
  return (names[el.type] || el.type || (ru ? 'Объект' : 'Object')) + (idx > 0 ? ` ${idx}` : '');
}

function orderEntryKey(entry) {
  if (!entry) return '';
  if (entry.kind === 'pause' || entry.kind === 'repeat') return entry.id;
  if (entry.kind === 'camera') return `cam-${entry.camId}`;
  return `el-${entry.elId}-${entry.ai}`;
}

/** Insert before (top half) or after (bottom half) the hovered row. */
function insertIndexFromPointer(e, index) {
  const rect = e.currentTarget.getBoundingClientRect();
  const y = e.clientY - rect.top;
  return index + (y > rect.height * 0.5 ? 1 : 0);
}

/** Same-list drop that would not change order after take/insert adjust. */
function isNoOpReorder(from, to) {
  if (!from || !to) return true;
  if (from.scope === 'top' && to.scope === 'top') {
    return to.index === from.index || to.index === from.index + 1;
  }
  if (
    from.scope === 'child' &&
    to.scope === 'child' &&
    from.parentId === to.parentId
  ) {
    return to.index === from.index || to.index === from.index + 1;
  }
  return false;
}

/** Dashed gap showing where a dragged anim row will land. */
function AnimDropSlot({ active, onDragOver, onDrop }) {
  return (
    <div
      className={`anim-drop-slot${active ? ' is-active' : ''}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    />
  );
}

function effectiveTrigger(anim) {
  if (!anim) return 'auto';
  if (anim.trigger === 'nav') return anim.preNavTrigger || 'auto';
  return anim.trigger || 'auto';
}

function AnimCtxMenu({ menu, ru, onClose }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m || !menu) return;
    const pad = 8;
    let lx = menu.x;
    let ly = menu.y;
    if (lx + m.offsetWidth + pad > window.innerWidth) lx = window.innerWidth - m.offsetWidth - pad;
    if (ly + m.offsetHeight + pad > window.innerHeight) ly = window.innerHeight - m.offsetHeight - pad;
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
  const loc = menu.loc;
  const isEnd = !loc || loc.scope === 'end';
  const canPaste = !!menu.canPaste;
  const run = (fn) => {
    onClose();
    fn();
  };
  const Item = ({ icon, label, warn, disabled, onClick }) => (
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
      <span className="slide-ctx-ico">
        <AppIcon id={icon} size={14} sw={1.8} fillOp={0} />
      </span>
      <span className="slide-ctx-lbl">{label}</span>
    </button>
  );
  return createPortal(
    <div ref={ref} className="slide-ctx-menu" style={{ visibility: 'hidden' }} role="menu">
      <Item
        icon={APP_CHROME.copy}
        label={ru ? 'Копировать' : 'Copy'}
        disabled={isEnd}
        onClick={() => run(() => editorApi.copyAnimEntry(loc))}
      />
      <Item
        icon={APP_CHROME.paste}
        label={ru ? 'Вставить' : 'Paste'}
        disabled={!canPaste}
        onClick={() => run(() => editorApi.pasteAnimEntry(loc))}
      />
      <Item
        icon={APP_CHROME.dup}
        label={ru ? 'Дублировать' : 'Duplicate'}
        disabled={isEnd}
        onClick={() => run(() => editorApi.duplicateAnimEntry(loc))}
      />
      <Item
        icon={APP_CHROME.clear}
        label={ru ? 'Удалить' : 'Delete'}
        warn
        disabled={isEnd}
        onClick={() => run(() => editorApi.deleteAnimEntry(loc))}
      />
    </div>,
    document.body
  );
}

function AnimMsSlider({ label, min, max, inputMax, step, value, onChange, disabled }) {
  return (
    <GSlider
      label={label}
      min={min}
      max={max}
      inputMax={inputMax}
      step={step}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="anim-ms-slider"
    />
  );
}

function AnimEasingField({ el, ai, anim, ru }) {
  if (!anim || !el) return null;
  if (
    anim.name !== 'moveTo' &&
    anim.name !== 'orbitTo' &&
    anim.name !== 'pathTo' &&
    anim.name !== 'rotate' &&
    anim.name !== 'transform'
  ) {
    return null;
  }
  return (
    <label style={{ gridColumn: '1 / -1' }}>
      <span>{ru ? 'ускорение' : 'easing'}</span>
      <select
        value={anim.easing || 'linear'}
        onChange={(e) => editorApi.patchAnimAt(el.id, ai, { easing: e.target.value })}
      >
        <option value="linear">linear</option>
        <option value="ease-in">ease-in</option>
        <option value="ease-out">ease-out</option>
        <option value="ease-in-out">ease-in-out</option>
      </select>
    </label>
  );
}

function AnimRecolorFields({ el, ai, anim, ru }) {
  if (!anim || !el) return null;
  return (
    <div className="anim-recolor-fields">
      <label className="anim-recolor-inv">
        <Toggle
          checked={!!anim.recolorInvert}
          onChange={(on) => editorApi.patchAnimAt(el.id, ai, { recolorInvert: !!on })}
          aria-label={ru ? 'Инверсия' : 'Invert'}
        />
        <span>{ru ? 'Инверсия' : 'Invert'}</span>
      </label>
      <ColorField
        label={ru ? 'Цвет' : 'Color'}
        value={anim.recolorColor || '#000000'}
        schemeRef={anim.recolorColorScheme || null}
        allowClear={false}
        onChange={(c, sr) =>
          editorApi.patchAnimAt(el.id, ai, {
            recolorColor: c || '#000000',
            recolorColorScheme: sr ?? null,
          })
        }
      />
    </div>
  );
}

function AnimTransformFields({ el, ai, anim, ru }) {
  if (!anim || !el) return null;
  const hasTo = !!(anim.to && (anim.to.x != null || anim.to.w != null));
  return (
    <>
      <AnimEasingField el={el} ai={ai} anim={anim} ru={ru} />
      <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          type="button"
          className="react-props-btn"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => editorApi.startTransformEdit(el.id, ai)}
        >
          {ru ? 'Трансформировать' : 'Transform'}
        </button>
        <span className="react-props-muted" style={{ fontSize: 11, lineHeight: 1.35 }}>
          {hasTo
            ? ru
              ? 'Конечное состояние задано. Можно изменить снова.'
              : 'End state saved. You can edit again.'
            : ru
              ? 'Задайте конечное состояние объекта на холсте.'
              : 'Set the end state of the object on the canvas.'}
        </span>
      </div>
    </>
  );
}

function AnimMotionFields({ el, ai, anim, ru }) {
  if (!anim || !el) return null;
  if (anim.name === 'transform') {
    return <AnimTransformFields el={el} ai={ai} anim={anim} ru={ru} />;
  }
  if (anim.name === 'pathTo' || (anim.name === 'moveTo' && anim.pathPts)) {
    return (
      <>
        <AnimEasingField el={el} ai={ai} anim={anim} ru={ru} />
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PATH_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="react-props-btn"
              onClick={() => {
                const pts = pathPresetPts(p.id, 180, 80);
                const last = pts[pts.length - 1] || { x: 180, y: 0 };
                editorApi.patchAnimAt(el.id, ai, { name: 'pathTo', pathPts: pts, tx: last.x, ty: last.y });
              }}
            >
              {ru ? p.ru : p.en}
            </button>
          ))}
        </div>
      </>
    );
  }
  if (anim.name === 'moveTo' || anim.name === 'rotate') {
    return <AnimEasingField el={el} ai={ai} anim={anim} ru={ru} />;
  }
  if (anim.name === 'recolor') return <AnimRecolorFields el={el} ai={ai} anim={anim} ru={ru} />;
  if (anim.name !== 'orbitTo') return null;
  const dir = anim.orbitDir === 'ccw' ? 'ccw' : 'cw';
  const deg = anim.orbitDeg != null ? +anim.orbitDeg : 360;
  return (
    <>
      <AnimEasingField el={el} ai={ai} anim={anim} ru={ru} />
      <div className="anim-orbit-dir" style={{ gridColumn: '1 / -1' }}>
        <button
          type="button"
          className={`react-props-btn${dir === 'cw' ? ' is-active' : ''}`}
          onClick={() => editorApi.patchAnimAt(el.id, ai, { orbitDir: 'cw' })}
        >
          ↻ {ru ? 'По часовой' : 'Clockwise'}
        </button>
        <button
          type="button"
          className={`react-props-btn${dir === 'ccw' ? ' is-active' : ''}`}
          onClick={() => editorApi.patchAnimAt(el.id, ai, { orbitDir: 'ccw' })}
        >
          ↺ {ru ? 'Против часовой' : 'Counterclockwise'}
        </button>
      </div>
      <label className="anim-orbit-deg" style={{ gridColumn: '1 / -1' }}>
        <span>{ru ? `угол ${Math.round(deg)}°` : `angle ${Math.round(deg)}°`}</span>
        <GSlider
          min={1}
          max={720}
          step={1}
          value={Math.max(1, Math.min(720, Number.isFinite(deg) ? deg : 360))}
          onChange={(v) =>
            editorApi.patchAnimAt(el.id, ai, {
              orbitDeg: Math.max(1, Math.min(720, Math.round(+v) || 360)),
            })
          }
          className="anim-orbit-deg-slider"
        />
      </label>
    </>
  );
}

function AnimTriggerProps({ el, ai, anim, slide, slides, cur, ru }) {
  const pick = useUiStore((s) => s.animTriggerPick);
  const picking = !!(pick && String(pick.elId) === String(el.id) && pick.ai === ai);
  const rawTrig = anim.trigger || 'auto';
  const isNav = rawTrig === 'nav';
  const trigSel = effectiveTrigger(anim);
  const pickBtnLabel =
    trigSel === 'counter'
      ? ru
        ? '🔢 Выбрать счётчик'
        : '🔢 Select counter'
      : trigSel === 'timer'
        ? ru
          ? '⏱ Выбрать таймер'
          : '⏱ Select timer'
        : ru
          ? '🎯 Выбрать объект'
          : '🎯 Select object';
  const pickHint =
    trigSel === 'counter'
      ? ru
        ? 'Кликните по счётчику на любом слайде (Esc — отмена)'
        : 'Click a counter on any slide (Esc to cancel)'
      : trigSel === 'timer'
        ? ru
          ? 'Кликните по таймеру на любом слайде (Esc — отмена)'
          : 'Click a timer on any slide (Esc to cancel)'
        : ru
          ? 'Кликните по объекту на слайде (Esc — отмена)'
          : 'Click an object on the slide (Esc to cancel)';
  const pickedLabel = anim.triggerElId
    ? triggerElLabel(slides, anim.triggerElId, ru ? 'ru' : 'en')
    : '';

  const setTrigger = (newTrig) => {
    const patch = { trigger: newTrig };
    if (newTrig !== 'element' && newTrig !== 'counter' && newTrig !== 'timer') {
      patch.triggerElId = undefined;
    }
    if (newTrig !== 'nav') patch.navTarget = undefined;
    if (newTrig === 'element' && !anim.triggerElId && anim.name === 'langFade') {
      patch.triggerElId = el.id;
    }
    editorApi.patchAnimAt(el.id, ai, patch);
  };

  const applyNav = (on, navTarget) => {
    if (on) {
      const pre = rawTrig !== 'nav' ? rawTrig : anim.preNavTrigger || 'auto';
      editorApi.patchAnimAt(el.id, ai, {
        trigger: 'nav',
        navTarget: navTarget != null ? navTarget : getSlideDisplayTitle(slides[Math.min(cur + 1, slides.length - 1)], Math.min(cur + 1, slides.length - 1)),
        preNavTrigger: pre,
        preNavTriggerElId:
          pre === 'element' || pre === 'counter' || pre === 'timer'
            ? anim.triggerElId || anim.preNavTriggerElId
            : undefined,
      });
    } else {
      const t = anim.preNavTrigger || 'auto';
      editorApi.patchAnimAt(el.id, ai, {
        trigger: t,
        navTarget: undefined,
        triggerElId:
          t === 'element' || t === 'counter' || t === 'timer'
            ? anim.preNavTriggerElId || anim.triggerElId
            : undefined,
      });
    }
  };

  return (
    <>
      <label style={{ gridColumn: '1 / -1' }}>
        <span>{ru ? 'триггер' : 'trigger'}</span>
        <select
          value={trigSel}
          disabled={isNav}
          onChange={(e) => {
            setTrigger(e.target.value);
            e.target.blur();
          }}
        >
          <option value="auto">{ru ? '▶ Авто' : '▶ Auto'}</option>
          <option value="click">{ru ? 'После клика' : 'On click'}</option>
          <option value="withPrev">{ru ? '⟳ Вместе с предыдущей' : '⟳ With previous'}</option>
          <option value="element">{ru ? '👆 Триггер (клик по объекту)' : '👆 Trigger (click object)'}</option>
          <option value="counter">{ru ? '🔢 Счётчик' : '🔢 Counter'}</option>
          <option value="timer">{ru ? '⏱ Таймер' : '⏱ Timer'}</option>
        </select>
      </label>

      {(trigSel === 'element' || trigSel === 'counter' || trigSel === 'timer' || (isNav && (anim.preNavTrigger === 'element' || anim.preNavTrigger === 'counter' || anim.preNavTrigger === 'timer' || anim.triggerElId))) && (
        <div className="anim-trig-pick" style={{ gridColumn: '1 / -1' }}>
          <button
            type="button"
            className={`react-props-btn${picking ? ' is-active' : ''}`}
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => {
              if (picking) editorApi.cancelAnimTriggerPick();
              else editorApi.startAnimTriggerPick(el.id, ai);
            }}
          >
            {pickBtnLabel}
          </button>
          {picking ? <div className="anim-trig-pick-hint">{pickHint}</div> : null}
          {pickedLabel ? (
            <div className="anim-trig-picked">
              {pickedLabel}
              <button
                type="button"
                className="anim-del"
                title={ru ? 'Сбросить' : 'Clear'}
                onClick={() => editorApi.patchAnimAt(el.id, ai, { triggerElId: undefined, preNavTriggerElId: undefined })}
              >
                ✕
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className="anim-nav-row" style={{ gridColumn: '1 / -1' }}>
        <label className="anim-nav-label">
          <input
            type="checkbox"
            className="tog anim-nav-check"
            checked={isNav}
            onChange={(e) => applyNav(e.target.checked)}
          />
          <span>→ {ru ? 'Слайд:' : 'Slide:'}</span>
          <select
            disabled={!isNav}
            value={
              (() => {
                const nt = anim.navTarget;
                if (nt == null) {
                  const def = Math.min(cur + 1, slides.length - 1);
                  return getSlideDisplayTitle(slides[def], def);
                }
                if (typeof nt === 'number') return getSlideDisplayTitle(slides[nt], nt);
                return String(nt);
              })()
            }
            onChange={(e) => applyNav(true, e.target.value)}
          >
            {slides.map((ss, si) => {
              const title = getSlideDisplayTitle(ss, si);
              return (
                <option key={si} value={title}>
                  {si + 1}. {title}
                </option>
              );
            })}
          </select>
        </label>
      </div>
    </>
  );
}

export default function AnimPanel() {
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const slide = slides[cur];
  const order = peekAnimOrder(slide);
  const selId = useSelectionStore((s) => s.selId);
  const multiSel = useSelectionStore((s) => s.multiSel);
  const selInkIds = useSelectionStore((s) => s.selInkIds);
  // inkDraw only makes sense for drawing objects — used to decide whether to show it in the
  // "Live" category at all (see below); addAnim() also re-checks this before assigning.
  const hasInkSelection =
    (selInkIds?.length || 0) > 0 ||
    (multiSel?.length ? multiSel : selId ? [selId] : []).some((id) => {
      const e = (slide?.els || []).find((x) => x && String(x.id) === String(id));
      return e?.type === 'inkhost';
    });
  const selectedIsImage = (multiSel?.length ? multiSel : selId ? [selId] : []).some((id) => {
    const e = (slide?.els || []).find((x) => x && String(x.id) === String(id));
    return e?.type === 'image';
  });
  const [openCat, setOpenCat] = useState('entrance');
  const [openRow, setOpenRow] = useState(null);
  const [selectedAnim, setSelectedAnim] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dropTo, setDropTo] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);

  function openAnimCtx(e, loc) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      loc: loc || { scope: 'end' },
      canPaste: editorApi.hasAnimClipboard(),
    });
  }

  function onAssignedContextMenu(e) {
    const row = e.target.closest('[data-anim-scope]');
    if (row && e.currentTarget.contains(row)) {
      const scope = row.getAttribute('data-anim-scope');
      const index = +row.getAttribute('data-anim-index');
      const parentId = row.getAttribute('data-anim-parent') || undefined;
      const loc =
        scope === 'child'
          ? { scope: 'child', parentId, index }
          : scope === 'end'
            ? { scope: 'end' }
            : { scope: 'top', index };
      openAnimCtx(e, loc);
      return;
    }
    openAnimCtx(e, { scope: 'end' });
  }

  const assignedNames = useMemo(() => {
    const set = new Set();
    (slide?.els || []).forEach((el) => {
      (el?.anims || []).forEach((a) => {
        if (a?.name) set.add(a.name);
      });
    });
    if (slide?.cameras?.length) set.add('camera');
    return set;
  }, [slide]);

  const leafCount = order.length;

  function locKey(loc) {
    if (!loc) return '';
    if (loc.scope === 'top') return `t:${loc.index}`;
    if (loc.scope === 'child') return `c:${loc.parentId}:${loc.index}`;
    if (loc.scope === 'body') return `b:${loc.parentId}`;
    return '';
  }

  function startDrag(e, from) {
    setDragFrom(from);
    setDropTo(null);
    try {
      e.dataTransfer.setData('application/x-anim-order', JSON.stringify(from));
      e.dataTransfer.setData('text/plain', JSON.stringify(from));
      e.dataTransfer.effectAllowed = 'move';
    } catch (err) {}
  }

  function clearDrag() {
    setDragFrom(null);
    setDropTo(null);
  }

  function readDragFrom(e) {
    try {
      const raw =
        e.dataTransfer.getData('application/x-anim-order') || e.dataTransfer.getData('text/plain');
      if (raw) {
        const o = JSON.parse(raw);
        if (o && o.scope) return o;
        if (raw !== '' && !Number.isNaN(+raw)) return { scope: 'top', index: +raw };
      }
    } catch (err) {}
    return dragFrom;
  }

  function commitDrop(e, to) {
    e.preventDefault();
    e.stopPropagation();
    const from = readDragFrom(e);
    clearDrag();
    if (!from || !to) return;
    if (!(slide?.animOrder || []).length) editorApi.ensureSlideAnimOrder();
    editorApi.relocateAnimOrder(from, to);
  }

  function allowDrop(e, to) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragFrom) return;
    if (locKey(dropTo) !== locKey(to)) setDropTo(to);
  }

  function allowDropOnItem(e, itemLoc) {
    allowDrop(e, { ...itemLoc, index: insertIndexFromPointer(e, itemLoc.index) });
  }

  function commitDropOnItem(e, itemLoc) {
    commitDrop(e, { ...itemLoc, index: insertIndexFromPointer(e, itemLoc.index) });
  }

  function slotActive(to) {
    if (!dragFrom || !dropTo || !to) return false;
    if (locKey(dropTo) !== locKey(to)) return false;
    return !isNoOpReorder(dragFrom, to);
  }

  return (
    <aside className="react-anim-panel react-anim-panel-v71" {...versionAttr('AnimPanel')}>
      <div className="react-anim-slide-hdr">
        {ru ? `Анимации слайда (${leafCount})` : `Slide animations (${leafCount})`}
      </div>

      <div
        className="react-anim-assigned"
        id="react-anim-assigned-list"
        onContextMenu={onAssignedContextMenu}
      >
        {!order.length ? (
          <p className="react-props-muted" style={{ padding: '6px 4px' }}>
            {ru
              ? 'Выберите объект и добавьте анимацию из списка ниже.'
              : 'Select an object and add an animation from the list below.'}
          </p>
        ) : (
          order.map((entry, idx) => {
            const key = orderEntryKey(entry);
            const isOpen = openRow === key;
            const isDrag = dragFrom?.scope === 'top' && dragFrom.index === idx;

            if (entry.kind === 'pause') {
              const meta = findAnimItem('animPause');
              const label = animLabel(meta, lang) || (ru ? 'Пауза' : 'Pause');
              const topLoc = { scope: 'top', index: idx };
              return (
                <React.Fragment key={key}>
                <AnimDropSlot
                  active={slotActive(topLoc)}
                  onDragOver={(e) => allowDrop(e, topLoc)}
                  onDrop={(e) => commitDrop(e, topLoc)}
                />
                <div
                  className={`anim-block${isOpen ? ' anim-row-open' : ''}${isDrag ? ' is-dragging' : ''}`}
                  data-anim-scope="top"
                  data-anim-index={idx}
                  draggable
                  onDragStart={(e) => startDrag(e, topLoc)}
                  onDragEnd={clearDrag}
                  onDragOver={(e) => allowDropOnItem(e, topLoc)}
                  onDrop={(e) => commitDropOnItem(e, topLoc)}
                >
                  <div className="anim-block-head" onClick={() => setOpenRow(isOpen ? null : key)}>
                    <span className="anim-drag" title={ru ? 'Перетащить' : 'Drag'} aria-hidden>
                      ⋮⋮
                    </span>
                    <span className="anim-cat blocks">{CAT_BADGE.blocks[ru ? 'ru' : 'en']}</span>
                    <span className="anim-name">{label}</span>
                    <span className="anim-el-name">{(entry.duration != null ? entry.duration : 1000)} {ru ? 'мс' : 'ms'}</span>
                    <button
                      type="button"
                      className="anim-del"
                      title={ru ? 'Удалить' : 'Remove'}
                      onClick={(e) => {
                        e.stopPropagation();
                        editorApi.removeAnimBlock(entry.id, true);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  {isOpen ? (
                    <div className="anim-block-props" onClick={(e) => e.stopPropagation()}>
                      <div className="anim-row-props">
                        <AnimMsSlider
                          label={ru ? 'Длит., мс' : 'Dur, ms'}
                          min={0}
                          max={60000}
                          inputMax={120000}
                          step={50}
                          value={entry.duration != null ? entry.duration : 1000}
                          onChange={(v) =>
                            editorApi.patchAnimBlock(
                              entry.id,
                              'duration',
                              Math.max(0, Math.min(120000, +v || 0))
                            )
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                </React.Fragment>
              );
            }

            if (entry.kind === 'repeat') {
              const meta = findAnimItem('animRepeat');
              const label = animLabel(meta, lang) || (ru ? 'Повторение' : 'Repeat');
              const kids = entry.children || [];
              const repLabel = entry.infinite ? '∞' : `×${entry.count != null ? entry.count : 2}`;
              const bodyDrop =
                !kids.length && dropTo?.scope === 'body' && dropTo.parentId === entry.id;
              const topLoc = { scope: 'top', index: idx };
              return (
                <React.Fragment key={key}>
                <AnimDropSlot
                  active={slotActive(topLoc)}
                  onDragOver={(e) => allowDrop(e, topLoc)}
                  onDrop={(e) => commitDrop(e, topLoc)}
                />
                <div
                  className={`anim-block${isOpen ? ' anim-row-open' : ''}${isDrag ? ' is-dragging' : ''}`}
                  data-anim-scope="top"
                  data-anim-index={idx}
                  draggable
                  onDragStart={(e) => startDrag(e, topLoc)}
                  onDragEnd={clearDrag}
                  onDragOver={(e) => {
                    // Over the head/chrome — reorder among top-level; body handles nesting.
                    if (e.target.closest?.('.anim-block-body')) return;
                    allowDropOnItem(e, topLoc);
                  }}
                  onDrop={(e) => {
                    if (e.target.closest?.('.anim-block-body')) return;
                    commitDropOnItem(e, topLoc);
                  }}
                >
                  <div className="anim-block-head" onClick={() => setOpenRow(isOpen ? null : key)}>
                    <span className="anim-drag" title={ru ? 'Перетащить' : 'Drag'} aria-hidden>
                      ⋮⋮
                    </span>
                    <span className="anim-cat blocks">{CAT_BADGE.blocks[ru ? 'ru' : 'en']}</span>
                    <span className="anim-name">{label}</span>
                    <span className="anim-el-name">{repLabel}</span>
                    <button
                      type="button"
                      className="anim-del"
                      title={ru ? 'Удалить (содержимое останется)' : 'Remove (keep contents)'}
                      onClick={(e) => {
                        e.stopPropagation();
                        editorApi.removeAnimBlock(entry.id, true);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div
                    className={`anim-block-body${bodyDrop ? ' anim-block-drop' : ''}`}
                    onDragOver={(e) => {
                      if (kids.length) {
                        allowDrop(e, { scope: 'child', parentId: entry.id, index: kids.length });
                      } else {
                        allowDrop(e, { scope: 'body', parentId: entry.id });
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDropTo((t) => {
                          if (t?.scope === 'body' && t.parentId === entry.id) return null;
                          if (
                            t?.scope === 'child' &&
                            t.parentId === entry.id &&
                            t.index === kids.length
                          ) {
                            return null;
                          }
                          return t;
                        });
                      }
                    }}
                    onDrop={(e) => {
                      if (kids.length) {
                        commitDrop(e, { scope: 'child', parentId: entry.id, index: kids.length });
                      } else {
                        commitDrop(e, { scope: 'body', parentId: entry.id });
                      }
                    }}
                  >
                    {!kids.length ? (
                      <div className="anim-block-empty">
                        {ru ? 'Перетащите анимации или блоки сюда' : 'Drag animations or blocks here'}
                      </div>
                    ) : (
                      <>
                      {kids.map((ch, ci) => {
                        if (!ch) return null;
                        const childFrom = { scope: 'child', parentId: entry.id, index: ci };
                        const childDrag =
                          dragFrom?.scope === 'child' &&
                          dragFrom.parentId === entry.id &&
                          dragFrom.index === ci;
                        const slotLoc = { scope: 'child', parentId: entry.id, index: ci };

                        if (ch.kind === 'pause') {
                          return (
                            <React.Fragment key={ch.id || `pau-${ci}`}>
                            <AnimDropSlot
                              active={slotActive(slotLoc)}
                              onDragOver={(e) => allowDrop(e, slotLoc)}
                              onDrop={(e) => commitDrop(e, slotLoc)}
                            />
                            <div
                              className={`anim-row${childDrag ? ' is-dragging' : ''}`}
                              data-anim-scope="child"
                              data-anim-parent={entry.id}
                              data-anim-index={ci}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                startDrag(e, childFrom);
                              }}
                              onDragEnd={clearDrag}
                              onDragOver={(e) => allowDropOnItem(e, childFrom)}
                              onDrop={(e) => commitDropOnItem(e, childFrom)}
                            >
                              <div className="anim-row-head">
                                <span className="anim-drag" aria-hidden>
                                  ⋮⋮
                                </span>
                                <span className="anim-cat blocks">{CAT_BADGE.blocks[ru ? 'ru' : 'en']}</span>
                                <span className="anim-name">{ru ? 'Пауза' : 'Pause'}</span>
                                <span className="anim-el-name">
                                  {ch.duration != null ? ch.duration : 1000} {ru ? 'мс' : 'ms'}
                                </span>
                              </div>
                            </div>
                            </React.Fragment>
                          );
                        }

                        if (ch.kind === 'repeat') {
                          const nestedLabel = ch.infinite ? '∞' : `×${ch.count != null ? ch.count : 2}`;
                          const nestKids = ch.children || [];
                          const nestBodyDrop =
                            !nestKids.length &&
                            dropTo?.scope === 'body' &&
                            dropTo.parentId === ch.id;
                          const nestOpen = openRow === `nest-blk-${ch.id}`;
                          return (
                            <React.Fragment key={ch.id || `rep-${ci}`}>
                            <AnimDropSlot
                              active={slotActive(slotLoc)}
                              onDragOver={(e) => allowDrop(e, slotLoc)}
                              onDrop={(e) => commitDrop(e, slotLoc)}
                            />
                            <div
                              className={`anim-block${nestOpen ? ' anim-row-open' : ''}${childDrag ? ' is-dragging' : ''}`}
                              data-anim-scope="child"
                              data-anim-parent={entry.id}
                              data-anim-index={ci}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                startDrag(e, childFrom);
                              }}
                              onDragEnd={clearDrag}
                              onDragOver={(e) => {
                                if (e.target.closest?.('.anim-block-body')) return;
                                allowDropOnItem(e, childFrom);
                              }}
                              onDrop={(e) => {
                                if (e.target.closest?.('.anim-block-body')) return;
                                commitDropOnItem(e, childFrom);
                              }}
                            >
                              <div
                                className="anim-block-head"
                                onClick={() => setOpenRow(nestOpen ? null : `nest-blk-${ch.id}`)}
                              >
                                <span className="anim-drag" aria-hidden>
                                  ⋮⋮
                                </span>
                                <span className="anim-cat blocks">{CAT_BADGE.blocks[ru ? 'ru' : 'en']}</span>
                                <span className="anim-name">{ru ? 'Повторение' : 'Repeat'}</span>
                                <span className="anim-el-name">{nestedLabel}</span>
                                <button
                                  type="button"
                                  className="anim-del"
                                  title={ru ? 'Удалить (содержимое останется)' : 'Remove (keep contents)'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    editorApi.removeAnimBlock(ch.id, true);
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                              <div
                                className={`anim-block-body${nestBodyDrop ? ' anim-block-drop' : ''}`}
                                onDragOver={(e) => {
                                  if (nestKids.length) {
                                    allowDrop(e, {
                                      scope: 'child',
                                      parentId: ch.id,
                                      index: nestKids.length,
                                    });
                                  } else {
                                    allowDrop(e, { scope: 'body', parentId: ch.id });
                                  }
                                }}
                                onDrop={(e) => {
                                  if (nestKids.length) {
                                    commitDrop(e, {
                                      scope: 'child',
                                      parentId: ch.id,
                                      index: nestKids.length,
                                    });
                                  } else {
                                    commitDrop(e, { scope: 'body', parentId: ch.id });
                                  }
                                }}
                              >
                                {!nestKids.length ? (
                                  <div className="anim-block-empty">
                                    {ru
                                      ? 'Сюда только анимации (без повторений)'
                                      : 'Anims only (no nested repeats)'}
                                  </div>
                                ) : (
                                  <>
                                  {nestKids.map((nch, ni) => {
                                    if (!nch) return null;
                                    const nFrom = { scope: 'child', parentId: ch.id, index: ni };
                                    const nDrag =
                                      dragFrom?.scope === 'child' &&
                                      dragFrom.parentId === ch.id &&
                                      dragFrom.index === ni;
                                    const nSlot = { scope: 'child', parentId: ch.id, index: ni };
                                    if (nch.kind === 'pause') {
                                      return (
                                        <React.Fragment key={nch.id || `npau-${ni}`}>
                                        <AnimDropSlot
                                          active={slotActive(nSlot)}
                                          onDragOver={(e) => allowDrop(e, nSlot)}
                                          onDrop={(e) => commitDrop(e, nSlot)}
                                        />
                                        <div
                                          className={`anim-row${nDrag ? ' is-dragging' : ''}`}
                                          data-anim-scope="child"
                                          data-anim-parent={ch.id}
                                          data-anim-index={ni}
                                          draggable
                                          onDragStart={(e) => {
                                            e.stopPropagation();
                                            startDrag(e, nFrom);
                                          }}
                                          onDragEnd={clearDrag}
                                          onDragOver={(e) => allowDropOnItem(e, nFrom)}
                                          onDrop={(e) => commitDropOnItem(e, nFrom)}
                                        >
                                          <div className="anim-row-head">
                                            <span className="anim-drag" aria-hidden>
                                              ⋮⋮
                                            </span>
                                            <span className="anim-cat blocks">
                                              {CAT_BADGE.blocks[ru ? 'ru' : 'en']}
                                            </span>
                                            <span className="anim-name">{ru ? 'Пауза' : 'Pause'}</span>
                                            <span className="anim-el-name">
                                              {nch.duration != null ? nch.duration : 1000}{' '}
                                              {ru ? 'мс' : 'ms'}
                                            </span>
                                          </div>
                                        </div>
                                        </React.Fragment>
                                      );
                                    }
                                    if (nch.kind === 'camera') {
                                      const cams = slide?.cameras || [];
                                      const camIdx = cams.findIndex((c) => c && c.id === nch.camId);
                                      return (
                                        <React.Fragment key={nch.camId || `ncam-${ni}`}>
                                        <AnimDropSlot
                                          active={slotActive(nSlot)}
                                          onDragOver={(e) => allowDrop(e, nSlot)}
                                          onDrop={(e) => commitDrop(e, nSlot)}
                                        />
                                        <div
                                          className={`anim-row${nDrag ? ' is-dragging' : ''}`}
                                          data-anim-scope="child"
                                          data-anim-parent={ch.id}
                                          data-anim-index={ni}
                                          draggable
                                          onDragStart={(e) => {
                                            e.stopPropagation();
                                            startDrag(e, nFrom);
                                          }}
                                          onDragEnd={clearDrag}
                                          onDragOver={(e) => allowDropOnItem(e, nFrom)}
                                          onDrop={(e) => commitDropOnItem(e, nFrom)}
                                        >
                                          <div className="anim-row-head">
                                            <span className="anim-drag" aria-hidden>
                                              ⋮⋮
                                            </span>
                                            <span className="anim-cat live">
                                              {CAT_BADGE.live[ru ? 'ru' : 'en']}
                                            </span>
                                            <span className="anim-name">{ru ? 'Камера' : 'Camera'}</span>
                                            <span className="anim-el-name">
                                              {ru ? 'Слайд' : 'Slide'}
                                              {camIdx >= 0 ? ` · ${camIdx + 1}` : ''}
                                            </span>
                                          </div>
                                        </div>
                                        </React.Fragment>
                                      );
                                    }
                                    const nel = (slide?.els || []).find(
                                      (e) => e && String(e.id) === String(nch.elId)
                                    );
                                    const nanim = nel?.anims?.[nch.ai];
                                    const nmeta = findAnimItem(nanim?.name);
                                    const ncat = findAnimCat(nanim?.name) || nanim?.cat || 'entrance';
                                    const nbadge = CAT_BADGE[ncat] || CAT_BADGE.entrance;
                                    const nlabel = animLabel(nmeta, lang) || nanim?.name || '?';
                                    return (
                                      <React.Fragment key={`nn-${ch.id}-${ni}`}>
                                      <AnimDropSlot
                                        active={slotActive(nSlot)}
                                        onDragOver={(e) => allowDrop(e, nSlot)}
                                        onDrop={(e) => commitDrop(e, nSlot)}
                                      />
                                      <div
                                        className={`anim-row${nDrag ? ' is-dragging' : ''}`}
                                        data-anim-scope="child"
                                        data-anim-parent={ch.id}
                                        data-anim-index={ni}
                                        draggable
                                        onDragStart={(e) => {
                                          e.stopPropagation();
                                          startDrag(e, nFrom);
                                        }}
                                        onDragEnd={clearDrag}
                                        onDragOver={(e) => allowDropOnItem(e, nFrom)}
                                        onDrop={(e) => commitDropOnItem(e, nFrom)}
                                      >
                                        <div className="anim-row-head">
                                          <span className="anim-drag" aria-hidden>
                                            ⋮⋮
                                          </span>
                                          <span className={`anim-cat ${ncat}`}>
                                            {nbadge[ru ? 'ru' : 'en']}
                                          </span>
                                          <span className="anim-name">{nlabel}</span>
                                          <span className="anim-el-name">
                                            {elDisplayName(slide, nel, lang)}
                                          </span>
                                        </div>
                                      </div>
                                      </React.Fragment>
                                    );
                                  })}
                                  <AnimDropSlot
                                    active={slotActive({
                                      scope: 'child',
                                      parentId: ch.id,
                                      index: nestKids.length,
                                    })}
                                    onDragOver={(e) =>
                                      allowDrop(e, {
                                        scope: 'child',
                                        parentId: ch.id,
                                        index: nestKids.length,
                                      })
                                    }
                                    onDrop={(e) =>
                                      commitDrop(e, {
                                        scope: 'child',
                                        parentId: ch.id,
                                        index: nestKids.length,
                                      })
                                    }
                                  />
                                  </>
                                )}
                              </div>
                              {nestOpen ? (
                                <div className="anim-block-props" onClick={(e) => e.stopPropagation()}>
                                  <div className="anim-row-props">
                                    <AnimMsSlider
                                      label={ru ? 'Задержка, мс' : 'Delay, ms'}
                                      min={0}
                                      max={10000}
                                      inputMax={120000}
                                      step={50}
                                      value={ch.delay != null ? ch.delay : 0}
                                      onChange={(v) =>
                                        editorApi.patchAnimBlock(
                                          ch.id,
                                          'delay',
                                          Math.max(0, Math.min(120000, +v || 0))
                                        )
                                      }
                                    />
                                    <AnimMsSlider
                                      label={ru ? 'Повторений' : 'Count'}
                                      min={1}
                                      max={99}
                                      step={1}
                                      disabled={!!ch.infinite}
                                      value={ch.infinite ? 1 : ch.count != null ? ch.count : 2}
                                      onChange={(v) =>
                                        editorApi.patchAnimBlock(
                                          ch.id,
                                          'count',
                                          Math.max(1, Math.min(99, +v || 1))
                                        )
                                      }
                                    />
                                  </div>
                                  <label className="anim-block-inf">
                                    <Toggle
                                      checked={!!ch.infinite}
                                      onChange={(on) => editorApi.patchAnimBlock(ch.id, 'infinite', on)}
                                    />
                                    <span>{ru ? 'Бесконечно ∞' : 'Infinite ∞'}</span>
                                  </label>
                                </div>
                              ) : null}
                            </div>
                            </React.Fragment>
                          );
                        }

                        if (ch.kind === 'camera') {
                          const cams = slide?.cameras || [];
                          const camIdx = cams.findIndex((c) => c && c.id === ch.camId);
                          return (
                            <React.Fragment key={ch.camId || `cam-${ci}`}>
                            <AnimDropSlot
                              active={slotActive(slotLoc)}
                              onDragOver={(e) => allowDrop(e, slotLoc)}
                              onDrop={(e) => commitDrop(e, slotLoc)}
                            />
                            <div
                              className={`anim-row${childDrag ? ' is-dragging' : ''}`}
                              data-anim-scope="child"
                              data-anim-parent={entry.id}
                              data-anim-index={ci}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                startDrag(e, childFrom);
                              }}
                              onDragEnd={clearDrag}
                              onDragOver={(e) => allowDropOnItem(e, childFrom)}
                              onDrop={(e) => commitDropOnItem(e, childFrom)}
                            >
                              <div className="anim-row-head">
                                <span className="anim-drag" aria-hidden>
                                  ⋮⋮
                                </span>
                                <span className="anim-cat live">{CAT_BADGE.live[ru ? 'ru' : 'en']}</span>
                                <span className="anim-name">{ru ? 'Камера' : 'Camera'}</span>
                                <span className="anim-el-name">
                                  {ru ? 'Слайд' : 'Slide'}
                                  {camIdx >= 0 ? ` · ${camIdx + 1}` : ''}
                                </span>
                              </div>
                            </div>
                            </React.Fragment>
                          );
                        }

                        const cel = (slide?.els || []).find((e) => e && String(e.id) === String(ch.elId));
                        const canim = cel?.anims?.[ch.ai];
                        const cmeta = findAnimItem(canim?.name);
                        const ccat = findAnimCat(canim?.name) || canim?.cat || 'entrance';
                        const cbadge = CAT_BADGE[ccat] || CAT_BADGE.entrance;
                        const clabel = animLabel(cmeta, lang) || canim?.name || '?';
                        const childKey = `nest-${entry.id}-${orderEntryKey(ch)}`;
                        const childOpen = openRow === childKey;
                        return (
                          <React.Fragment key={childKey}>
                          <AnimDropSlot
                            active={slotActive(slotLoc)}
                            onDragOver={(e) => allowDrop(e, slotLoc)}
                            onDrop={(e) => commitDrop(e, slotLoc)}
                          />
                          <div
                            className={`anim-row${childOpen ? ' anim-row-open' : ''}${childDrag ? ' is-dragging' : ''}`}
                            data-anim-scope="child"
                            data-anim-parent={entry.id}
                            data-anim-index={ci}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              startDrag(e, childFrom);
                            }}
                            onDragEnd={clearDrag}
                            onDragOver={(e) => allowDropOnItem(e, childFrom)}
                            onDrop={(e) => commitDropOnItem(e, childFrom)}
                          >
                            <div
                              className="anim-row-head"
                              onClick={() => setOpenRow(childOpen ? null : childKey)}
                            >
                              <span className="anim-drag" aria-hidden>
                                ⋮⋮
                              </span>
                              <span className={`anim-cat ${ccat}`}>{cbadge[ru ? 'ru' : 'en']}</span>
                              <span className="anim-name">{clabel}</span>
                              <span className="anim-el-name">{elDisplayName(slide, cel, lang)}</span>
                            </div>
                            {childOpen && canim && cel ? (
                              <div className="anim-row-props-wrap" onClick={(e) => e.stopPropagation()}>
                                <div className="anim-row-props">
                                  <AnimMsSlider
                                    label={ru ? 'мс' : 'ms'}
                                    min={50}
                                    max={8000}
                                    inputMax={120000}
                                    step={50}
                                    value={animDuration(canim)}
                                    onChange={(v) =>
                                      editorApi.patchAnimAt(cel.id, ch.ai, {
                                        dur: Math.max(50, Math.min(120000, +v || 600)),
                                      })
                                    }
                                  />
                                  <AnimMsSlider
                                    label={ru ? 'задержка' : 'delay'}
                                    min={0}
                                    max={5000}
                                    inputMax={120000}
                                    step={50}
                                    value={canim.delay != null ? canim.delay : 0}
                                    onChange={(v) =>
                                      editorApi.patchAnimAt(cel.id, ch.ai, {
                                        delay: Math.max(0, Math.min(120000, +v || 0)),
                                      })
                                    }
                                  />
                                  <AnimMotionFields el={cel} ai={ch.ai} anim={canim} ru={ru} />
                                  <AnimTriggerProps
                                    el={cel}
                                    ai={ch.ai}
                                    anim={canim}
                                    slide={slide}
                                    slides={slides}
                                    cur={cur}
                                    ru={ru}
                                  />
                                </div>
                              </div>
                            ) : null}
                          </div>
                          </React.Fragment>
                        );
                      })}
                      <AnimDropSlot
                        active={slotActive({
                          scope: 'child',
                          parentId: entry.id,
                          index: kids.length,
                        })}
                        onDragOver={(e) =>
                          allowDrop(e, {
                            scope: 'child',
                            parentId: entry.id,
                            index: kids.length,
                          })
                        }
                        onDrop={(e) =>
                          commitDrop(e, {
                            scope: 'child',
                            parentId: entry.id,
                            index: kids.length,
                          })
                        }
                      />
                      </>
                    )}
                  </div>
                  {isOpen ? (
                    <div className="anim-block-props" onClick={(e) => e.stopPropagation()}>
                      <div className="anim-row-props">
                        <AnimMsSlider
                          label={ru ? 'Задержка, мс' : 'Delay, ms'}
                          min={0}
                          max={10000}
                          inputMax={120000}
                          step={50}
                          value={entry.delay != null ? entry.delay : 0}
                          onChange={(v) =>
                            editorApi.patchAnimBlock(
                              entry.id,
                              'delay',
                              Math.max(0, Math.min(120000, +v || 0))
                            )
                          }
                        />
                        <AnimMsSlider
                          label={ru ? 'Повторений' : 'Count'}
                          min={1}
                          max={99}
                          step={1}
                          disabled={!!entry.infinite}
                          value={entry.infinite ? 1 : entry.count != null ? entry.count : 2}
                          onChange={(v) =>
                            editorApi.patchAnimBlock(
                              entry.id,
                              'count',
                              Math.max(1, Math.min(99, +v || 1))
                            )
                          }
                        />
                      </div>
                      <label className="anim-block-inf">
                        <Toggle
                          checked={!!entry.infinite}
                          onChange={(on) => editorApi.patchAnimBlock(entry.id, 'infinite', on)}
                        />
                        <span>{ru ? 'Бесконечно ∞' : 'Infinite ∞'}</span>
                      </label>
                    </div>
                  ) : null}
                </div>
                </React.Fragment>
              );
            }

            if (entry.kind === 'camera') {
              const cams = slide?.cameras || [];
              const cam = cams.find((c) => c && c.id === entry.camId);
              const camIdx = cams.findIndex((c) => c && c.id === entry.camId);
              const trigger = cam?.trigger || 'auto';
              const topLoc = { scope: 'top', index: idx };
              return (
                <React.Fragment key={key}>
                <AnimDropSlot
                  active={slotActive(topLoc)}
                  onDragOver={(e) => allowDrop(e, topLoc)}
                  onDrop={(e) => commitDrop(e, topLoc)}
                />
                <div
                  className={`anim-row${isOpen ? ' anim-row-open' : ''}${isDrag ? ' is-dragging' : ''}`}
                  data-anim-scope="top"
                  data-anim-index={idx}
                  draggable
                  onDragStart={(e) => startDrag(e, topLoc)}
                  onDragEnd={clearDrag}
                  onDragOver={(e) => allowDropOnItem(e, topLoc)}
                  onDrop={(e) => commitDropOnItem(e, topLoc)}
                >
                  <div className="anim-row-head" onClick={() => setOpenRow(isOpen ? null : key)}>
                    <span className="anim-drag" aria-hidden>
                      ⋮⋮
                    </span>
                    <span className="anim-cat live">{CAT_BADGE.live[ru ? 'ru' : 'en']}</span>
                    <span className="anim-name">{ru ? 'Камера' : 'Camera'}</span>
                    <span className="anim-trig" title={trigger}>
                      {TRIGGER_ICONS[trigger] || TRIGGER_ICONS.auto}
                    </span>
                    <span className="anim-el-name">
                      {ru ? 'Слайд' : 'Slide'}
                      {camIdx >= 0 ? ` · ${camIdx + 1}` : ''}
                    </span>
                    <button
                      type="button"
                      className="anim-del"
                      title={ru ? 'Удалить' : 'Remove'}
                      onClick={(e) => {
                        e.stopPropagation();
                        editorApi.removeCameraFrame(entry.camId);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  {isOpen && cam ? (
                    <div className="anim-row-props-wrap" onClick={(e) => e.stopPropagation()}>
                      <div className="anim-row-props">
                        <label style={{ gridColumn: '1 / -1' }}>
                          <span>{ru ? 'триггер' : 'trigger'}</span>
                          <select
                            value={trigger}
                            onChange={(e) => {
                              editorApi.patchCamera(cam.id, { trigger: e.target.value });
                              e.target.blur();
                            }}
                          >
                            <option value="auto">{ru ? '▶ Авто' : '▶ Auto'}</option>
                            <option value="click">{ru ? 'После клика' : 'On click'}</option>
                            <option value="withPrev">{ru ? '⟳ Вместе с предыдущей' : '⟳ With previous'}</option>
                          </select>
                        </label>
                        <AnimMsSlider
                          label={ru ? 'мс' : 'ms'}
                          min={200}
                          max={10000}
                          inputMax={120000}
                          step={50}
                          value={cam.duration != null ? cam.duration : 1200}
                          onChange={(v) =>
                            editorApi.patchCamera(cam.id, {
                              duration: Math.max(200, Math.min(120000, +v || 1200)),
                            })
                          }
                        />
                        <AnimMsSlider
                          label={ru ? 'задержка' : 'delay'}
                          min={0}
                          max={10000}
                          inputMax={120000}
                          step={50}
                          value={cam.delay != null ? cam.delay : 0}
                          onChange={(v) =>
                            editorApi.patchCamera(cam.id, {
                              delay: Math.max(0, Math.min(120000, +v || 0)),
                            })
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
                </React.Fragment>
              );
            }

            const el = (slide?.els || []).find((e) => e && String(e.id) === String(entry.elId));
            const anim = el?.anims?.[entry.ai];
            const meta = findAnimItem(anim?.name);
            const cat = findAnimCat(anim?.name) || anim?.cat || 'entrance';
            const badge = CAT_BADGE[cat] || CAT_BADGE.entrance;
            const label = animLabel(meta, lang) || anim?.name || '?';
            const trig = effectiveTrigger(anim);
            const trigIcon = TRIGGER_ICONS[anim?.trigger === 'nav' ? 'nav' : trig] || '▶';
            const topLoc = { scope: 'top', index: idx };

            return (
              <React.Fragment key={key}>
              <AnimDropSlot
                active={slotActive(topLoc)}
                onDragOver={(e) => allowDrop(e, topLoc)}
                onDrop={(e) => commitDrop(e, topLoc)}
              />
              <div
                className={`anim-row${isOpen ? ' anim-row-open' : ''}${isDrag ? ' is-dragging' : ''}`}
                data-anim-scope="top"
                data-anim-index={idx}
                draggable
                onDragStart={(e) => startDrag(e, topLoc)}
                onDragEnd={clearDrag}
                onDragOver={(e) => allowDropOnItem(e, topLoc)}
                onDrop={(e) => commitDropOnItem(e, topLoc)}
              >
                <div className="anim-row-head" onClick={() => setOpenRow(isOpen ? null : key)}>
                  <span className="anim-drag" aria-hidden>
                    ⋮⋮
                  </span>
                  <span className={`anim-cat ${cat}`}>{badge[ru ? 'ru' : 'en']}</span>
                  <span className="anim-name">{label}</span>
                  <span className="anim-trig" title={trig}>
                    {trigIcon}
                  </span>
                  <span className="anim-el-name">{elDisplayName(slide, el, lang)}</span>
                  <button
                    type="button"
                    className="anim-del"
                    title={ru ? 'Удалить' : 'Remove'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (el) editorApi.removeAnimAt(el.id, entry.ai);
                    }}
                  >
                    ✕
                  </button>
                </div>
                {isOpen && anim && el ? (
                  <div className="anim-row-props-wrap" onClick={(e) => e.stopPropagation()}>
                    <div className="anim-row-props">
                      <AnimMsSlider
                        label={ru ? 'мс' : 'ms'}
                        min={50}
                        max={8000}
                        inputMax={120000}
                        step={50}
                        value={animDuration(anim, 600)}
                        onChange={(v) =>
                          editorApi.patchAnimAt(el.id, entry.ai, {
                            dur: Math.max(50, Math.min(120000, +v || 600)),
                          })
                        }
                      />
                      <AnimMsSlider
                        label={ru ? 'задержка' : 'delay'}
                        min={0}
                        max={5000}
                        inputMax={120000}
                        step={50}
                        value={anim.delay != null ? anim.delay : 0}
                        onChange={(v) =>
                          editorApi.patchAnimAt(el.id, entry.ai, {
                            delay: Math.max(0, Math.min(120000, +v || 0)),
                          })
                        }
                      />
                      <AnimMotionFields el={el} ai={entry.ai} anim={anim} ru={ru} />
                      {anim.name === 'inkDraw' ? (
                        <label className="anim-ink-parallel">
                          <span>{ru ? 'линий сразу' : 'lines at once'}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <GSlider
                              min={1}
                              max={Math.max(1, (el.inkIds || []).length)}
                              step={1}
                              disabled={anim.inkParallel === 'all'}
                              value={
                                anim.inkParallel === 'all'
                                  ? Math.max(1, (el.inkIds || []).length)
                                  : Math.max(1, +anim.inkParallel || 1)
                              }
                              onChange={(v) =>
                                editorApi.patchAnimAt(el.id, entry.ai, {
                                  inkParallel: Math.max(
                                    1,
                                    Math.min(Math.max(1, (el.inkIds || []).length), Math.round(+v) || 1)
                                  ),
                                })
                              }
                              className="anim-ink-parallel-slider"
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 400 }}>
                              <input
                                type="checkbox"
                                checked={anim.inkParallel === 'all'}
                                onChange={(e) =>
                                  editorApi.patchAnimAt(el.id, entry.ai, {
                                    inkParallel: e.target.checked ? 'all' : 1,
                                  })
                                }
                              />
                              {ru ? 'все сразу' : 'all at once'}
                            </label>
                          </div>
                        </label>
                      ) : null}
                      <AnimTriggerProps
                        el={el}
                        ai={entry.ai}
                        anim={anim}
                        slide={slide}
                        slides={slides}
                        cur={cur}
                        ru={ru}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              </React.Fragment>
            );
          })
        )}
        {order.length && dragFrom ? (
          <AnimDropSlot
            active={slotActive({ scope: 'top', index: order.length })}
            onDragOver={(e) => allowDrop(e, { scope: 'top', index: order.length })}
            onDrop={(e) => commitDrop(e, { scope: 'top', index: order.length })}
          />
        ) : null}
      </div>

      <div className="react-anim-cats" id="react-anim-slide-list">
        {ANIM_CATS.map((group) => {
          const isOpen = openCat === group.cat;
          return (
            <div key={group.cat} className="anim-cat-section">
              <div
                className={`anim-cat-title ${group.cat}`}
                role="button"
                tabIndex={0}
                onClick={() => setOpenCat(group.cat)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenCat(group.cat);
                  }
                }}
              >
                <span>{ru ? group.labelRu : group.labelEn}</span>
                <span
                  className="anim-cat-chevron"
                  style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                >
                  ▼
                </span>
              </div>
              {isOpen ? (
                <div className="anim-cat-grid">
                  {group.items
                    .filter((it) => {
                      if (it.name === 'inkDraw') return hasInkSelection;
                      if (it.imageOnly) return selectedIsImage;
                      return true;
                    })
                    .map((it) => {
                    const isAssigned = assignedNames.has(it.name);
                    const isSelected = selectedAnim === it.name;
                    return (
                      <div
                        key={it.name}
                        className={`anim-item${isAssigned ? ' assigned' : ''}${isSelected ? ' selected' : ''}`}
                        title={animLabel(it, lang)}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => {
                          if (group.cat === 'blocks' || it.name === 'camera') return;
                          playAnimHoverPreview(it.name, {});
                        }}
                        onMouseLeave={() => {
                          if (group.cat === 'blocks' || it.name === 'camera') return;
                          clearAnimHoverPreview();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedAnim(it.name);
                          if (group.cat === 'blocks' || it.name === 'animRepeat' || it.name === 'animPause') {
                            editorApi.addAnimBlock(it.name);
                            return;
                          }
                          editorApi.addAnim(it.name);
                        }}
                      >
                        <div className={`anim-item-icon ${group.cat}`}>{it.icon}</div>
                        <div className="anim-item-label">{animLabel(it, lang)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <AnimCtxMenu menu={ctxMenu} ru={ru} onClose={() => setCtxMenu(null)} />
    </aside>
  );
}

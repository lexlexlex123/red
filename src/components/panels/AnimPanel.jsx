import React, { useMemo, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
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

function effectiveTrigger(anim) {
  if (!anim) return 'auto';
  if (anim.trigger === 'nav') return anim.preNavTrigger || 'auto';
  return anim.trigger || 'auto';
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
  const [openCat, setOpenCat] = useState('entrance');
  const [openRow, setOpenRow] = useState(null);
  const [selectedAnim, setSelectedAnim] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dropTo, setDropTo] = useState(null);

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

  const draggingTop = dragFrom?.scope === 'top' ? dragFrom.index : null;

  return (
    <aside className="react-anim-panel react-anim-panel-v71" {...versionAttr('AnimPanel')}>
      <div className="react-anim-slide-hdr">
        {ru ? `Анимации слайда (${leafCount})` : `Slide animations (${leafCount})`}
      </div>

      <div className="react-anim-assigned" id="react-anim-assigned-list">
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
            const isOver = dropTo?.scope === 'top' && dropTo.index === idx && draggingTop !== idx;

            if (entry.kind === 'pause') {
              const meta = findAnimItem('animPause');
              const label = animLabel(meta, lang) || (ru ? 'Пауза' : 'Pause');
              return (
                <div
                  key={key}
                  className={`anim-block${isOpen ? ' anim-row-open' : ''}${isDrag ? ' is-dragging' : ''}${isOver ? ' is-drop-target' : ''}`}
                  draggable
                  onDragStart={(e) => startDrag(e, { scope: 'top', index: idx })}
                  onDragEnd={clearDrag}
                  onDragOver={(e) => allowDrop(e, { scope: 'top', index: idx })}
                  onDrop={(e) => commitDrop(e, { scope: 'top', index: idx })}
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
                        <label>
                          <span>{ru ? 'Длит., мс' : 'Dur, ms'}</span>
                          <input
                            type="number"
                            min="0"
                            max="60000"
                            step="50"
                            value={entry.duration != null ? entry.duration : 1000}
                            onChange={(e) =>
                              editorApi.patchAnimBlock(
                                entry.id,
                                'duration',
                                Math.max(0, +e.target.value || 0)
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            }

            if (entry.kind === 'repeat') {
              const meta = findAnimItem('animRepeat');
              const label = animLabel(meta, lang) || (ru ? 'Повторение' : 'Repeat');
              const kids = entry.children || [];
              const repLabel = entry.infinite ? '∞' : `×${entry.count != null ? entry.count : 2}`;
              const bodyDrop = dropTo?.scope === 'body' && dropTo.parentId === entry.id;
              return (
                <div
                  key={key}
                  className={`anim-block${isOpen ? ' anim-row-open' : ''}${isDrag ? ' is-dragging' : ''}${isOver && !bodyDrop ? ' is-drop-target' : ''}`}
                  draggable
                  onDragStart={(e) => startDrag(e, { scope: 'top', index: idx })}
                  onDragEnd={clearDrag}
                  onDragOver={(e) => allowDrop(e, { scope: 'top', index: idx })}
                  onDrop={(e) => commitDrop(e, { scope: 'top', index: idx })}
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
                    onDragOver={(e) => allowDrop(e, { scope: 'body', parentId: entry.id })}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDropTo((t) =>
                          t?.scope === 'body' && t.parentId === entry.id ? null : t
                        );
                      }
                    }}
                    onDrop={(e) => commitDrop(e, { scope: 'body', parentId: entry.id })}
                  >
                    {!kids.length ? (
                      <div className="anim-block-empty">
                        {ru ? 'Перетащите анимации или блоки сюда' : 'Drag animations or blocks here'}
                      </div>
                    ) : (
                      kids.map((ch, ci) => {
                        if (!ch) return null;
                        const childFrom = { scope: 'child', parentId: entry.id, index: ci };
                        const childDrag =
                          dragFrom?.scope === 'child' &&
                          dragFrom.parentId === entry.id &&
                          dragFrom.index === ci;
                        const childOver =
                          dropTo?.scope === 'child' &&
                          dropTo.parentId === entry.id &&
                          dropTo.index === ci &&
                          !childDrag;

                        if (ch.kind === 'pause') {
                          return (
                            <div
                              key={ch.id || `pau-${ci}`}
                              className={`anim-row${childDrag ? ' is-dragging' : ''}${childOver ? ' is-drop-target' : ''}`}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                startDrag(e, childFrom);
                              }}
                              onDragEnd={clearDrag}
                              onDragOver={(e) => allowDrop(e, childFrom)}
                              onDrop={(e) => commitDrop(e, childFrom)}
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
                          );
                        }

                        if (ch.kind === 'repeat') {
                          const nestedLabel = ch.infinite ? '∞' : `×${ch.count != null ? ch.count : 2}`;
                          const nestKids = ch.children || [];
                          const nestBodyDrop =
                            dropTo?.scope === 'body' && dropTo.parentId === ch.id;
                          const nestOpen = openRow === `nest-blk-${ch.id}`;
                          return (
                            <div
                              key={ch.id || `rep-${ci}`}
                              className={`anim-block${nestOpen ? ' anim-row-open' : ''}${childDrag ? ' is-dragging' : ''}${childOver && !nestBodyDrop ? ' is-drop-target' : ''}`}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                startDrag(e, childFrom);
                              }}
                              onDragEnd={clearDrag}
                              onDragOver={(e) => allowDrop(e, childFrom)}
                              onDrop={(e) => commitDrop(e, childFrom)}
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
                                onDragOver={(e) => allowDrop(e, { scope: 'body', parentId: ch.id })}
                                onDrop={(e) => commitDrop(e, { scope: 'body', parentId: ch.id })}
                              >
                                {!nestKids.length ? (
                                  <div className="anim-block-empty">
                                    {ru
                                      ? 'Сюда только анимации (без повторений)'
                                      : 'Anims only (no nested repeats)'}
                                  </div>
                                ) : (
                                  nestKids.map((nch, ni) => {
                                    if (!nch) return null;
                                    const nFrom = { scope: 'child', parentId: ch.id, index: ni };
                                    const nDrag =
                                      dragFrom?.scope === 'child' &&
                                      dragFrom.parentId === ch.id &&
                                      dragFrom.index === ni;
                                    const nOver =
                                      dropTo?.scope === 'child' &&
                                      dropTo.parentId === ch.id &&
                                      dropTo.index === ni &&
                                      !nDrag;
                                    if (nch.kind === 'pause') {
                                      return (
                                        <div
                                          key={nch.id || `npau-${ni}`}
                                          className={`anim-row${nDrag ? ' is-dragging' : ''}${nOver ? ' is-drop-target' : ''}`}
                                          draggable
                                          onDragStart={(e) => {
                                            e.stopPropagation();
                                            startDrag(e, nFrom);
                                          }}
                                          onDragEnd={clearDrag}
                                          onDragOver={(e) => allowDrop(e, nFrom)}
                                          onDrop={(e) => commitDrop(e, nFrom)}
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
                                      );
                                    }
                                    if (nch.kind === 'camera') {
                                      const cams = slide?.cameras || [];
                                      const camIdx = cams.findIndex((c) => c && c.id === nch.camId);
                                      return (
                                        <div
                                          key={nch.camId || `ncam-${ni}`}
                                          className={`anim-row${nDrag ? ' is-dragging' : ''}${nOver ? ' is-drop-target' : ''}`}
                                          draggable
                                          onDragStart={(e) => {
                                            e.stopPropagation();
                                            startDrag(e, nFrom);
                                          }}
                                          onDragEnd={clearDrag}
                                          onDragOver={(e) => allowDrop(e, nFrom)}
                                          onDrop={(e) => commitDrop(e, nFrom)}
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
                                      <div
                                        key={`nn-${ch.id}-${ni}`}
                                        className={`anim-row${nDrag ? ' is-dragging' : ''}${nOver ? ' is-drop-target' : ''}`}
                                        draggable
                                        onDragStart={(e) => {
                                          e.stopPropagation();
                                          startDrag(e, nFrom);
                                        }}
                                        onDragEnd={clearDrag}
                                        onDragOver={(e) => allowDrop(e, nFrom)}
                                        onDrop={(e) => commitDrop(e, nFrom)}
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
                                    );
                                  })
                                )}
                              </div>
                              {nestOpen ? (
                                <div className="anim-block-props" onClick={(e) => e.stopPropagation()}>
                                  <div className="anim-row-props">
                                    <label>
                                      <span>{ru ? 'Задержка, мс' : 'Delay, ms'}</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10000"
                                        step="100"
                                        value={ch.delay != null ? ch.delay : 0}
                                        onChange={(e) =>
                                          editorApi.patchAnimBlock(
                                            ch.id,
                                            'delay',
                                            Math.max(0, +e.target.value || 0)
                                          )
                                        }
                                      />
                                    </label>
                                    <label>
                                      <span>{ru ? 'Повторений' : 'Count'}</span>
                                      <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        step="1"
                                        disabled={!!ch.infinite}
                                        value={ch.infinite ? 1 : ch.count != null ? ch.count : 2}
                                        onChange={(e) => {
                                          const v = Math.max(1, Math.min(99, +e.target.value || 1));
                                          editorApi.patchAnimBlock(ch.id, 'count', v);
                                        }}
                                      />
                                    </label>
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
                          );
                        }

                        if (ch.kind === 'camera') {
                          const cams = slide?.cameras || [];
                          const camIdx = cams.findIndex((c) => c && c.id === ch.camId);
                          return (
                            <div
                              key={ch.camId || `cam-${ci}`}
                              className={`anim-row${childDrag ? ' is-dragging' : ''}${childOver ? ' is-drop-target' : ''}`}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                startDrag(e, childFrom);
                              }}
                              onDragEnd={clearDrag}
                              onDragOver={(e) => allowDrop(e, childFrom)}
                              onDrop={(e) => commitDrop(e, childFrom)}
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
                          <div
                            key={childKey}
                            className={`anim-row${childOpen ? ' anim-row-open' : ''}${childDrag ? ' is-dragging' : ''}${childOver ? ' is-drop-target' : ''}`}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              startDrag(e, childFrom);
                            }}
                            onDragEnd={clearDrag}
                            onDragOver={(e) => allowDrop(e, childFrom)}
                            onDrop={(e) => commitDrop(e, childFrom)}
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
                                  <label>
                                    <span>{ru ? 'мс' : 'ms'}</span>
                                    <input
                                      type="number"
                                      min="50"
                                      max="20000"
                                      step="50"
                                      value={animDuration(canim)}
                                      onChange={(e) =>
                                        editorApi.patchAnimAt(cel.id, ch.ai, {
                                          dur: Math.max(50, +e.target.value || 600),
                                        })
                                      }
                                    />
                                  </label>
                                </div>
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
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                  {isOpen ? (
                    <div className="anim-block-props" onClick={(e) => e.stopPropagation()}>
                      <div className="anim-row-props">
                        <label>
                          <span>{ru ? 'Задержка, мс' : 'Delay, ms'}</span>
                          <input
                            type="number"
                            min="0"
                            max="10000"
                            step="100"
                            value={entry.delay != null ? entry.delay : 0}
                            onChange={(e) =>
                              editorApi.patchAnimBlock(
                                entry.id,
                                'delay',
                                Math.max(0, +e.target.value || 0)
                              )
                            }
                          />
                        </label>
                        <label>
                          <span>{ru ? 'Повторений' : 'Count'}</span>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            step="1"
                            disabled={!!entry.infinite}
                            value={entry.infinite ? 1 : entry.count != null ? entry.count : 2}
                            onChange={(e) => {
                              const v = Math.max(1, Math.min(99, +e.target.value || 1));
                              editorApi.patchAnimBlock(entry.id, 'count', v);
                            }}
                          />
                        </label>
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
              );
            }

            if (entry.kind === 'camera') {
              const cams = slide?.cameras || [];
              const cam = cams.find((c) => c && c.id === entry.camId);
              const camIdx = cams.findIndex((c) => c && c.id === entry.camId);
              return (
                <div
                  key={key}
                  className={`anim-row${isOpen ? ' anim-row-open' : ''}${isDrag ? ' is-dragging' : ''}${isOver ? ' is-drop-target' : ''}`}
                  draggable
                  onDragStart={(e) => startDrag(e, { scope: 'top', index: idx })}
                  onDragEnd={clearDrag}
                  onDragOver={(e) => allowDrop(e, { scope: 'top', index: idx })}
                  onDrop={(e) => commitDrop(e, { scope: 'top', index: idx })}
                >
                  <div className="anim-row-head" onClick={() => setOpenRow(isOpen ? null : key)}>
                    <span className="anim-drag" aria-hidden>
                      ⋮⋮
                    </span>
                    <span className="anim-cat live">{CAT_BADGE.live[ru ? 'ru' : 'en']}</span>
                    <span className="anim-name">{ru ? 'Камера' : 'Camera'}</span>
                    <span className="anim-trig" title={ru ? 'Авто' : 'Auto'}>
                      ▶
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
                        <label>
                          <span>{ru ? 'мс' : 'ms'}</span>
                          <input
                            type="number"
                            min="200"
                            max="10000"
                            step="50"
                            value={cam.duration != null ? cam.duration : 1200}
                            onChange={(e) =>
                              editorApi.patchCamera(cam.id, {
                                duration: Math.max(200, +e.target.value || 1200),
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>{ru ? 'задержка' : 'delay'}</span>
                          <input
                            type="number"
                            min="0"
                            max="10000"
                            step="50"
                            value={cam.delay != null ? cam.delay : 0}
                            onChange={(e) =>
                              editorApi.patchCamera(cam.id, {
                                delay: Math.max(0, +e.target.value || 0),
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
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

            return (
              <div
                key={key}
                className={`anim-row${isOpen ? ' anim-row-open' : ''}${isDrag ? ' is-dragging' : ''}${isOver ? ' is-drop-target' : ''}`}
                draggable
                onDragStart={(e) => startDrag(e, { scope: 'top', index: idx })}
                onDragEnd={clearDrag}
                onDragOver={(e) => allowDrop(e, { scope: 'top', index: idx })}
                onDrop={(e) => commitDrop(e, { scope: 'top', index: idx })}
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
                      <label>
                        <span>{ru ? 'мс' : 'ms'}</span>
                        <input
                          type="number"
                          min="50"
                          max="30000"
                          step="50"
                          value={animDuration(anim, 600)}
                          onChange={(e) =>
                            editorApi.patchAnimAt(el.id, entry.ai, {
                              dur: Math.max(50, +e.target.value || 600),
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>{ru ? 'задержка' : 'delay'}</span>
                        <input
                          type="number"
                          min="0"
                          max="30000"
                          step="50"
                          value={anim.delay != null ? anim.delay : 0}
                          onChange={(e) =>
                            editorApi.patchAnimAt(el.id, entry.ai, {
                              delay: Math.max(0, +e.target.value || 0),
                            })
                          }
                        />
                      </label>
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
            );
          })
        )}
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
                  {group.items.map((it) => {
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
    </aside>
  );
}

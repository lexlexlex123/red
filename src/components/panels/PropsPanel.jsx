import React from 'react';
import { useSelectionStore } from '../../stores/selectionStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { useUiStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../stores/historyStore';
import { editorApi } from '../../editor/editorApi';
import GSlider from '../ui/GSlider.jsx';
import ColorField from '../ui/ColorField.jsx';
import Toggle from '../ui/Toggle.jsx';
import { FONT_FAMILIES, parseCsNumber, applyCsProp } from '../../editor/fonts.js';
import { getTheme, resolveElTextColor } from '../../editor/themes.js';
import { htmlHasList } from '../../editor/textLists.js';
import { getIconById } from '../../editor/iconsLazy.js';
import { iconHasAnim, iconAnimEnabled } from '../../editor/iconAnim.js';
import { normLabelStyle, normMarkCount, canDrawAngleBetweenSelected } from '../../editor/lineAngle.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from '../../editor/canvasDims.js';
import { pteBySymbol, resolvePteColors } from '../../editor/periodicApplet.js';
import {
  defaultHoverFx,
  normalizeHoverFx,
  presetsForEl,
  withHoverPreset,
  isFilterOnlyHoverPreset,
  patchHoverFxField,
} from '../../editor/hoverFx.js';
import { flipFontToken, resolveFlipColors, isFlipAppletId } from '../../editor/flipApplet.js';
import {
  listAppletTriggerAnims,
  appletAnimOptionLabel,
  resolveAppletAnimRef,
} from '../../editor/appletOnEnd.js';
import { getSlideDisplayTitle } from '../../editor/slideTitles.js';
import {
  addCurveNode,
  deleteCurveNode,
  defaultCurvePoints,
  applyCurveBBox,
} from '../../editor/curveEditor.js';
import { LEGO_PIECES, legoSizeFor } from '../../editor/lego.js';
import { getTableCell } from '../../editor/tableCells.js';
import { CONN_MARKER_TYPES } from '../../editor/connectors.js';
import { CONN_MARKER_SVGS } from '../../editor/connMarkers.jsx';
import { CODE_LANGS, CODE_THEMES, normalizeCodeLang, ensureCodeHtml } from '../../editor/codeHighlight.js';
import {
  getShapeTextColor,
  shapeTextFontFamily,
  shapeTextFontSizePx,
  shapeTextFontWeight,
  withShapeTextColor,
  withShapeTextProp,
} from '../../editor/shapeText.js';
import { getShapeMeta } from '../../shared/shapesCatalog.js';
import { LINE_MARKER_TYPES, LINE_MARKER_PREVIEWS, LINE_GEOM_MARKS, normalizeMoonPhase } from '../../shared/shapes.js';
import { cloudNormForm, cloudRegenerate } from '../../shared/cloudGeom.js';
import { PN_STYLES } from '../../editor/pagenum.js';
import TextPropsFmt from './TextPropsFmt.jsx';
import GenAppletVisualProps from './GenAppletVisualProps.jsx';

const CLOUD_FORM_OPTS = [
  { id: 'puff', ru: 'Облако', en: 'Cloud' },
  { id: 'ring', ru: 'Кольцо', en: 'Ring' },
  { id: 'burst', ru: 'Взрыв', en: 'Burst' },
  { id: 'trail', ru: 'Шлейф', en: 'Trail' },
  { id: 'stack', ru: 'Столб', en: 'Stack' },
];

function cloudPatchFromRegen(el, extra = {}) {
  const w = Math.max(24, +el.w || 200);
  const h = Math.max(24, +el.h || 200);
  const next = { ...el, ...extra, w, h, cloudFrameW: w, cloudFrameH: h };
  cloudRegenerate(next, null);
  return {
    w,
    h,
    cloudForm: next.cloudForm,
    cloudSeed: next.cloudSeed,
    cloudCircles: next.cloudCircles,
    cloudCirclesForm: next.cloudCirclesForm,
    cloudRefW: next.cloudRefW,
    cloudRefH: next.cloudRefH,
    cloudFramed: next.cloudFramed,
    cloudFrameW: next.cloudFrameW,
    cloudFrameH: next.cloudFrameH,
  };
}

function ShapeGeomFields({ el, patch, ru }) {
  const meta = getShapeMeta(el.shape || 'rect');
  const special = meta?.special || el.shape;
  const curveEditMode = useUiStore((s) => s.curveEditMode);
  if (special === 'ellipse' || el.shape === 'circle' || el.shape === 'ellipse') {
    const mode = el.arcMode || 'full';
    return (
      <>
        <label className="react-props-field">
          <span>{ru ? 'Режим дуги' : 'Arc mode'}</span>
          <select value={mode} onChange={(e) => patch({ arcMode: e.target.value })}>
            <option value="full">{ru ? 'Полный' : 'Full'}</option>
            <option value="sector">{ru ? 'Сектор' : 'Sector'}</option>
            <option value="chord">{ru ? 'Хорда' : 'Chord'}</option>
          </select>
        </label>
        {mode !== 'full' ? (
          <div className="react-props-grid">
            <label className="react-props-field react-props-field-compact">
              <span>{ru ? 'Начало °' : 'Start °'}</span>
              <input
                type="number"
                min="0"
                max="360"
                value={el.arcStart ?? 0}
                onChange={(e) => patch({ arcStart: +e.target.value })}
              />
            </label>
            <label className="react-props-field react-props-field-compact">
              <span>{ru ? 'Конец °' : 'End °'}</span>
              <input
                type="number"
                min="0"
                max="360"
                value={el.arcEnd ?? 270}
                onChange={(e) => patch({ arcEnd: +e.target.value })}
              />
            </label>
          </div>
        ) : null}
      </>
    );
  }
  if (special === 'callout') {
    return (
      <label className="react-props-field">
        <span>{ru ? 'Форма выноски' : 'Callout form'}</span>
        <select
          value={el.calloutForm === 'soft' || el.calloutForm === 'sharp' ? 'round' : el.calloutForm || 'round'}
          onChange={(e) => patch({ calloutForm: e.target.value })}
        >
          <option value="round">{ru ? 'Скруглённая' : 'Round'}</option>
          <option value="rect">{ru ? 'Прямоугольная' : 'Rect'}</option>
          <option value="oval">{ru ? 'Овал' : 'Oval'}</option>
          <option value="burst">{ru ? 'Взрыв' : 'Burst'}</option>
          <option value="thought">{ru ? 'Мысль' : 'Thought'}</option>
        </select>
      </label>
    );
  }
  if (special === 'cloud') {
    return (
      <div style={{ marginBottom: 6 }}>
        <label className="react-props-field">
          <span>{ru ? 'Форма облака' : 'Cloud form'}</span>
          <select
            value={cloudNormForm(el.cloudForm)}
            onChange={(e) => {
              const form = cloudNormForm(e.target.value);
              const seed = Math.floor(Math.random() * 999999) + 1;
              editorApi.patchElementHistory(
                el.id,
                cloudPatchFromRegen(el, { cloudForm: form, cloudSeed: seed })
              );
            }}
          >
            {CLOUD_FORM_OPTS.map((o) => (
              <option key={o.id} value={o.id}>
                {ru ? o.ru : o.en}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="react-props-btn"
          style={{ width: '100%', marginTop: 4, fontSize: 11, padding: '5px 8px' }}
          onClick={() => {
            const seed = Math.floor(Math.random() * 999999) + 1;
            editorApi.patchElementHistory(
              el.id,
              cloudPatchFromRegen(el, { cloudSeed: seed })
            );
          }}
        >
          {ru ? '↻ Пересоздать облако' : '↻ Recreate cloud'}
        </button>
      </div>
    );
  }
  if (special === 'curve') {
    const pts = el.curvePoints || [];
    return (
      <>
        <button
          type="button"
          className={`react-props-btn${curveEditMode ? ' is-active' : ''}`}
          style={{ width: '100%', marginBottom: 6 }}
          onClick={() => {
            const next = !useUiStore.getState().curveEditMode;
            useUiStore.getState().setCurveEditMode(next);
            if (!next) {
              const bbox = applyCurveBBox(el);
              if (bbox) editorApi.patchElementHistory(el.id, bbox);
            }
          }}
        >
          {curveEditMode ? (ru ? 'Перемещение' : 'Move') : ru ? 'Узлы' : 'Nodes'}
        </button>
        {curveEditMode ? (
          <div className="react-props-actions" style={{ gap: 4, marginBottom: 6 }}>
            <button
              type="button"
              className="react-props-btn"
              style={{ flex: 1 }}
              onClick={() => {
                const next = addCurveNode(el.curvePoints || defaultCurvePoints(), !!el.curveClosed);
                editorApi.patchElementHistory(el.id, { curvePoints: next });
              }}
            >
              {ru ? '+ Узел' : '+ Node'}
            </button>
            <button
              type="button"
              className="react-props-btn"
              style={{ flex: 1 }}
              disabled={pts.length <= 2}
              onClick={() => {
                const next = deleteCurveNode(
                  el.curvePoints || defaultCurvePoints(),
                  pts.length - 1,
                  !!el.curveClosed
                );
                editorApi.patchElementHistory(el.id, { curvePoints: next });
              }}
            >
              {ru ? '− Узел' : '− Node'}
            </button>
          </div>
        ) : null}
        <label className="react-props-check">
          <input
            type="checkbox"
            checked={!!el.curveClosed}
            onChange={(e) => patch({ curveClosed: e.target.checked })}
          />
          {ru ? 'Замкнутая кривая' : 'Closed curve'}
        </label>
      </>
    );
  }
  if (special === 'polygon') {
    return (
      <label className="react-props-field">
        <span>{ru ? 'Количество углов' : 'Corners'}</span>
        <input
          type="number"
          min="3"
          max="16"
          value={el.polySides ?? el.sides ?? 6}
          onChange={(e) => patch({ polySides: +e.target.value, sides: +e.target.value })}
        />
      </label>
    );
  }
  if (special === 'star') {
    return (
      <>
        <label className="react-props-field">
          <span>{ru ? 'Количество лучей' : 'Rays'}</span>
          <input
            type="number"
            min="4"
            max="32"
            value={el.starRays ?? 5}
            onChange={(e) => patch({ starRays: +e.target.value })}
          />
        </label>
        <label className="react-props-field react-props-field-compact">
          <span>{ru ? 'Внутр. радиус' : 'Inner'}</span>
          <input
            type="number"
            min="0.1"
            max="0.9"
            step="0.05"
            value={el.starInner ?? 0.45}
            onChange={(e) => patch({ starInner: +e.target.value })}
          />
        </label>
      </>
    );
  }
  if (special === 'trapezoid') {
    return (
      <>
        <label className="react-props-field">
          <span>{ru ? 'Сужение сверху (%)' : 'Top inset %'}</span>
          <input
            type="number"
            min="0"
            max="49"
            value={Math.round((el.trapTop != null ? el.trapTop : 0.15) * 100)}
            onChange={(e) => patch({ trapTop: Math.max(0, Math.min(49, +e.target.value)) / 100 })}
          />
        </label>
        <label className="react-props-field">
          <span>{ru ? 'Сужение снизу (%)' : 'Bottom inset %'}</span>
          <input
            type="number"
            min="0"
            max="49"
            value={Math.round((el.trapBot != null ? el.trapBot : 0) * 100)}
            onChange={(e) => patch({ trapBot: Math.max(0, Math.min(49, +e.target.value)) / 100 })}
          />
        </label>
      </>
    );
  }
  if (special === 'parallelogram') {
    return (
      <label className="react-props-field">
        <span>{ru ? 'Наклон (°)' : 'Skew (°)'}</span>
        <input
          type="number"
          min="-45"
          max="45"
          value={el.paraSkew ?? 20}
          onChange={(e) => patch({ paraSkew: +e.target.value })}
        />
      </label>
    );
  }
  if (special === 'chevron') {
    return (
      <>
        <label className="react-props-field">
          <span>{ru ? 'Внешний угол (%)' : 'Outer %'}</span>
          <input
            type="number"
            min="0"
            max="45"
            value={el.chevSkew ?? 25}
            onChange={(e) => patch({ chevSkew: +e.target.value })}
          />
        </label>
        <label className="react-props-field">
          <span>{ru ? 'Внутренний угол (%)' : 'Inner %'}</span>
          <input
            type="number"
            min="0"
            max="45"
            value={el.chevInner != null ? el.chevInner : (el.chevSkew ?? 25)}
            onChange={(e) => patch({ chevInner: +e.target.value })}
          />
        </label>
      </>
    );
  }
  if (special === 'moon') {
    const ui = Math.round(normalizeMoonPhase(el.moonPhase) * 100);
    return (
      <label className="react-props-field">
        <span>{ru ? 'Фаза луны (−100…100)' : 'Moon phase (−100…100)'}</span>
        <input
          type="number"
          min="-100"
          max="100"
          value={ui}
          onChange={(e) =>
            patch({ moonPhase: Math.max(-100, Math.min(100, +e.target.value)) / 100 })
          }
        />
      </label>
    );
  }
  if (special === 'gear') {
    return (
      <>
        <label className="react-props-field">
          <span>{ru ? 'Количество зубцов' : 'Teeth'}</span>
          <input
            type="number"
            min="3"
            max="60"
            value={el.gearTeeth ?? 12}
            onChange={(e) => patch({ gearTeeth: +e.target.value })}
          />
        </label>
        <label className="react-props-field">
          <span>{ru ? 'Глубина зубцов (%)' : 'Tooth depth %'}</span>
          <input
            type="number"
            min="5"
            max="60"
            value={Math.round((el.gearDepth != null ? el.gearDepth : 0.25) * 100)}
            onChange={(e) => patch({ gearDepth: Math.max(5, Math.min(60, +e.target.value)) / 100 })}
          />
        </label>
      </>
    );
  }
  return null;
}

function FlipIconButtons({ flipH, flipV, onFlipH, onFlipV, ru }) {
  return (
    <div className="react-flip-row">
      <button
        type="button"
        className={`react-flip-btn${flipH ? ' is-active' : ''}`}
        title={ru ? 'Отразить по горизонтали' : 'Flip horizontal'}
        onClick={onFlipH}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1" y="3" width="6" height="10" rx="1" fill="currentColor" opacity=".4" />
          <rect x="9" y="3" width="6" height="10" rx="1" fill="currentColor" />
          <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      </button>
      <button
        type="button"
        className={`react-flip-btn${flipV ? ' is-active' : ''}`}
        title={ru ? 'Отразить по вертикали' : 'Flip vertical'}
        onClick={onFlipV}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="3" y="1" width="10" height="6" rx="1" fill="currentColor" opacity=".4" />
          <rect x="3" y="9" width="10" height="6" rx="1" fill="currentColor" />
          <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      </button>
    </div>
  );
}

function AppletOnEndFields({ el, slides, slide, ru, kind }) {
  const isCounter = kind === 'counter';
  const endKey = isCounter ? 'cntOnEnd' : 'tmOnEnd';
  const slideKey = isCounter ? 'cntOnEndSlide' : 'tmOnEndSlide';
  const animKey = isCounter ? 'cntOnEndAnim' : 'tmOnEndAnim';
  const trig = isCounter ? 'counter' : 'timer';
  const oe = el[endKey] || 'none';
  const animList = oe === 'anim' ? listAppletTriggerAnims(slide, el.id, trig) : [];
  const curAnim = el[animKey] || '';

  function setOnEnd(val) {
    const patch = { [endKey]: val };
    if (val === 'anim') {
      const resolved = resolveAppletAnimRef(slide, el.id, el[animKey] || '', trig);
      if (resolved) patch[animKey] = resolved;
    }
    editorApi.patchApplet(el.id, patch);
  }

  return (
    <>
      <label className="react-props-field">
        <span>{isCounter ? (ru ? 'При достижении цели' : 'On goal') : ru ? 'По окончании' : 'On end'}</span>
        <select value={oe} onChange={(e) => setOnEnd(e.target.value)}>
          <option value="none">{ru ? 'Ничего' : 'None'}</option>
          <option value="next">{ru ? 'Следующий слайд' : 'Next slide'}</option>
          <option value="slide">{ru ? 'Конкретный слайд' : 'Specific slide'}</option>
          <option value="anim">{ru ? 'Запустить анимацию' : 'Run animation'}</option>
        </select>
      </label>
      {oe === 'slide' ? (
        <label className="react-props-field">
          <span>{ru ? 'Перейти на слайд' : 'Go to slide'}</span>
          <select
            value={Math.max(0, Math.min((slides?.length || 1) - 1, +(el[slideKey] ?? 0)))}
            onChange={(e) => editorApi.patchApplet(el.id, { [slideKey]: +e.target.value })}
          >
            {(slides || []).map((ss, si) => (
              <option key={si} value={si}>
                {si + 1}. {getSlideDisplayTitle(ss, si)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {oe === 'anim' ? (
        <label className="react-props-field">
          <span>{ru ? 'Анимация' : 'Animation'}</span>
          <select
            value={animList.some((x) => x.ref === curAnim) ? curAnim : animList[0]?.ref || ''}
            onChange={(e) => editorApi.patchApplet(el.id, { [animKey]: e.target.value || '' })}
          >
            {!animList.length ? (
              <option value="">{ru ? '— нет анимаций —' : '— no animations —'}</option>
            ) : (
              animList.map((item) => (
                <option key={item.ref} value={item.ref}>
                  {appletAnimOptionLabel(slide, item.elId, item.ai, ru ? 'ru' : 'en')}
                </option>
              ))
            )}
          </select>
        </label>
      ) : null}
    </>
  );
}

function ShadowFields({ el, patch, ru }) {
  const on = el.shadow === true || el.shadow === 'true';
  return (
    <>
      <div className="react-tog-row">
        <Toggle checked={on} onChange={(v) => patch({ shadow: v })} title={ru ? 'Тень' : 'Shadow'} />
        <span>{ru ? 'Включить тень' : 'Enable shadow'}</span>
      </div>
      {on ? (
        <>
          <div className="react-props-grid">
            <GSlider
              label={ru ? 'Размытие' : 'Blur'}
              min={0}
              max={40}
              step={1}
              value={el.shadowBlur ?? 4}
              onChange={(v) => patch({ shadowBlur: v })}
            />
            <GSlider
              label={ru ? 'Смещение' : 'Offset'}
              min={0}
              max={40}
              step={1}
              value={el.shadowSize ?? 3}
              onChange={(v) => patch({ shadowSize: v })}
            />
          </div>
          <ColorField
            label={ru ? 'Цвет тени' : 'Shadow color'}
            value={el.shadowColor || '#000000'}
            onChange={(c) => patch({ shadowColor: c })}
          />
        </>
      ) : null}
    </>
  );
}

/** v7.1 `.ph` titles — each object type has its own section name. */
function appletSectionTitle(el, ru) {
  const id = el.appletId || '';
  if (id === 'generator') return ru ? '🎲 Генератор' : '🎲 Generator';
  if (id === 'periodic') return ru ? '🧪 Элемент' : '🧪 Element';
  if (id === 'flip' || isFlipAppletId(id)) return ru ? '⇆ Перевертыш' : '⇆ Flip';
  if (id === 'clock') return ru ? 'Часы' : 'Clock';
  if (id === 'calculator') return ru ? 'Калькулятор' : 'Calculator';
  if (id === 'timer') return ru ? 'Таймер' : 'Timer';
  if (id === 'counter') return ru ? 'Счётчик' : 'Counter';
  if (id === 'notes') return ru ? 'Заметка' : 'Notes';
  return ru ? 'Аплет' : 'Applet';
}

/**
 * Element property editors — migrated slice of legacy #elprops.
 */
export default function ElementPropsPanel() {
  const selId = useSelectionStore((s) => s.selId);
  const multiSel = useSelectionStore((s) => s.multiSel);
  const selConnId = useSelectionStore((s) => s.selConnId);
  const tableCell = useSelectionStore((s) => s.tableCell);
  const tableCellSel = useSelectionStore((s) => s.tableCellSel);
  const cur = usePresentationStore((s) => s.cur);
  const slides = usePresentationStore((s) => s.slides);
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const lang = useUiStore((s) => s.lang);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);

  const slide = slides[cur] || {};
  const els = slide.els || [];
  const multiIds = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
  const el = selId ? els.find((e) => e && String(e.id) === String(selId)) : null;
  const conn = selConnId
    ? (slide.connectors || []).find((c) => c && String(c.id) === String(selConnId))
    : null;
  const ru = lang !== 'en';
  const theme = getTheme(appliedThemeIdx);
  const shapeMeta = el?.type === 'shape' ? getShapeMeta(el.shape || 'rect') : null;
  const shapeNoFill = !!(el && (el.noFill || shapeMeta?.noFill));
  const cw = Math.max(100, +canvasW || DEFAULT_CANVAS_W);
  const ch = Math.max(100, +canvasH || DEFAULT_CANVAS_H);
  const canDrawAngle = multiIds.length === 2 && canDrawAngleBetweenSelected(els, multiIds);

  if (multiIds.length > 1) {
    return (
      <section className="react-props-section react-multi-props">
        <div className="react-props-hdr">{ru ? 'Выделение' : 'Selection'}</div>
        <p className="react-props-muted">
          {canDrawAngle
            ? ru
              ? 'Выбраны два связанных отрезка'
              : 'Two joined lines selected'
            : ru
              ? `${multiIds.length} выбрано`
              : `${multiIds.length} selected`}
        </p>
        {canDrawAngle ? (
          <button
            type="button"
            className="react-props-btn"
            style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '8px 10px' }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editorApi.addLineAngleBetweenSelected()}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19h16" />
              <path d="M4 19L16 5" />
              <path d="M11 19A7 7 0 0 0 8.6 13.7" />
            </svg>
            {ru ? 'Нарисовать угол' : 'Draw angle'}
          </button>
        ) : null}
        <div className="react-props-actions">
          <button type="button" className="react-props-btn" disabled={!canUndo} onClick={() => editorApi.undo()}>
            {ru ? 'Отменить' : 'Undo'}
          </button>
          <button type="button" className="react-props-btn" disabled={!canRedo} onClick={() => editorApi.redo()}>
            {ru ? 'Повторить' : 'Redo'}
          </button>
          <button
            type="button"
            className="react-props-btn react-props-btn-warn"
            onClick={() => editorApi.deleteSelected()}
          >
            {ru ? 'Удалить' : 'Delete'}
          </button>
        </div>
      </section>
    );
  }

  if (!el && conn) {
    const patchConn = (patch) => {
      useHistoryStore.getState().push();
      usePresentationStore.getState().patchConnector(conn.id, patch);
    };
    const opPct = Math.round((conn.opacity != null ? +conn.opacity : 1) * 100);
    return (
      <section className="react-props-section react-conn-props">
        <div className="react-props-hdr">{ru ? 'связь' : 'connector'}</div>

        <ColorField
          label={ru ? 'Цвет линии' : 'Line color'}
          value={conn.color && conn.color !== 'none' && conn.color !== 'transparent' ? conn.color : ''}
          schemeRef={conn.colorScheme || null}
          clearGlyph="trash"
          clearTitle={ru ? 'Прозрачная линия' : 'Transparent line'}
          onChange={(c, sr) => patchConn({ color: c, colorScheme: sr || null })}
          onClear={() => patchConn({ color: 'none', colorScheme: null })}
        />

        <GSlider
          label={ru ? 'Прозрачность' : 'Opacity'}
          min={0}
          max={100}
          step={1}
          value={opPct}
          onChange={(v) => patchConn({ opacity: Math.max(0, Math.min(100, +v)) / 100 })}
        />
        <GSlider
          label={ru ? 'Толщина' : 'Thickness'}
          min={1}
          max={30}
          step={0.5}
          value={conn.sw != null ? +conn.sw : 2}
          onChange={(v) => patchConn({ sw: +v })}
        />
        <GSlider
          label={ru ? 'Отступ от объекта (px)' : 'Gap from object (px)'}
          min={0}
          max={100}
          step={1}
          value={conn.gap != null ? +conn.gap : 0}
          onChange={(v) => patchConn({ gap: +v })}
        />

        <label className="react-props-field">
          <span>{ru ? 'Маршрут' : 'Route'}</span>
          <select
            value={conn.route || 'curve'}
            onChange={(e) => patchConn({ route: e.target.value })}
          >
            <option value="curve">{ru ? 'Кривая (сглаженная)' : 'Curve (smooth)'}</option>
            <option value="straight">{ru ? 'Прямая' : 'Straight'}</option>
            <option value="orthogonal">{ru ? 'Ломаная (ступенька)' : 'Orthogonal'}</option>
          </select>
        </label>

        <label className="react-props-field">
          <span>{ru ? 'Вид линии' : 'Line style'}</span>
          <select
            value={conn.dash || 'solid'}
            onChange={(e) => {
              const dash = e.target.value;
              const patch = { dash };
              if (dash === 'solid' && conn.animated) patch.animated = false;
              patchConn(patch);
            }}
          >
            <option value="solid">{ru ? 'Сплошная' : 'Solid'}</option>
            <option value="dash">{ru ? 'Пунктирная' : 'Dashed'}</option>
            <option value="dot">{ru ? 'Точки (круги)' : 'Dots'}</option>
          </select>
        </label>

        <div className="react-props-field">
          <span title={ru ? 'Элемент проплывает вдоль линии' : 'Element rides along the line'}>
            {ru ? 'Плывущий элемент' : 'Floating element'}
          </span>
          {(() => {
            const rider = (slide.els || []).find((e) => e && String(e.rideConnId) === String(conn.id));
            if (rider) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      borderRadius: 5,
                      padding: '4px 6px 4px 8px',
                    }}
                  >
                    <span className="react-props-muted">
                      {rider.type === 'icon' ? (ru ? 'Значок' : 'Icon') : ru ? 'Изображение' : 'Image'}
                    </span>
                    <button
                      type="button"
                      className="react-props-btn react-props-btn-ghost"
                      onClick={() => editorApi.detachRideElement(conn.id)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="react-props-grid">
                    <label className="react-props-field react-props-field-compact">
                      <span>{ru ? 'Скорость (сек)' : 'Speed (sec)'}</span>
                      <input
                        type="number"
                        min="0.3"
                        max="30"
                        step="0.1"
                        value={conn.rideDuration != null ? conn.rideDuration : 3.5}
                        onChange={(e) =>
                          patchConn({ rideDuration: Math.max(0.3, +e.target.value || 3.5) })
                        }
                      />
                    </label>
                    <label className="react-props-field react-props-field-compact">
                      <span>{ru ? 'Пауза (сек)' : 'Pause (sec)'}</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.1"
                        value={conn.rideInterval != null ? conn.rideInterval : 0}
                        onChange={(e) =>
                          patchConn({ rideInterval: Math.max(0, +e.target.value || 0) })
                        }
                      />
                    </label>
                  </div>
                </div>
              );
            }
            return (
              <div className="react-props-seg" style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="react-props-btn"
                  style={{ flex: 1 }}
                  onClick={() => editorApi.beginAttachRideImage(conn.id)}
                >
                  {ru ? '🖼 Изображение' : '🖼 Image'}
                </button>
                <button
                  type="button"
                  className="react-props-btn"
                  style={{ flex: 1 }}
                  onClick={() => editorApi.beginAttachRideIcon(conn.id)}
                >
                  {ru ? '★ Значок' : '★ Icon'}
                </button>
              </div>
            );
          })()}
        </div>

        <div className="react-tog-row" style={{ justifyContent: 'space-between' }}>
          <span title={ru ? 'Бегущий штрих (нужен пунктир или точки)' : 'Marching dash (needs dash or dots)'}>
            {ru ? 'Анимация штриха' : 'Stroke animation'}
          </span>
          <Toggle
            checked={!!conn.animated}
            onChange={(v) => {
              if (v) {
                const dash = conn.dash && conn.dash !== 'solid' ? conn.dash : 'dash';
                patchConn({ animated: true, dash });
              } else {
                patchConn({ animated: false });
              }
            }}
            aria-label={ru ? 'Анимация штриха' : 'Stroke animation'}
          />
        </div>
        {conn.animated ? (
          <div className="react-tog-row" style={{ justifyContent: 'space-between' }}>
            <span title={ru ? 'Обратное направление' : 'Reverse direction'}>
              {ru ? 'Инвертировать' : 'Invert'}
            </span>
            <Toggle
              checked={!!conn.animInvert}
              onChange={(v) => patchConn({ animInvert: !!v })}
              aria-label={ru ? 'Инвертировать' : 'Invert'}
            />
          </div>
        ) : null}

        <div className="react-props-hdr" style={{ fontSize: 10 }}>
          {ru ? 'начало' : 'start'}
        </div>
        <div className="react-props-field">
          <span>{ru ? 'Маркер' : 'Marker'}</span>
          <div className="react-conn-mk-row">
            {CONN_MARKER_TYPES.map((id) => (
              <button
                key={`from-${id}`}
                type="button"
                className={`react-conn-mk-btn${(conn.fromMarker || 'none') === id ? ' is-active' : ''}`}
                title={id}
                onClick={() => patchConn({ fromMarker: id })}
              >
                {CONN_MARKER_SVGS[id]}
              </button>
            ))}
          </div>
        </div>

        <div className="react-props-hdr" style={{ fontSize: 10 }}>
          {ru ? 'конец' : 'end'}
        </div>
        <div className="react-props-field">
          <span>{ru ? 'Маркер' : 'Marker'}</span>
          <div className="react-conn-mk-row">
            {CONN_MARKER_TYPES.map((id) => (
              <button
                key={`to-${id}`}
                type="button"
                className={`react-conn-mk-btn${(conn.toMarker || 'none') === id ? ' is-active' : ''}`}
                title={id}
                onClick={() => patchConn({ toMarker: id })}
              >
                {CONN_MARKER_SVGS[id]}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="react-props-btn react-props-btn-warn"
          style={{
            width: '100%',
            background: 'var(--err, #ef4444)',
            border: 'none',
            color: '#fff',
          }}
          onClick={() => {
            useHistoryStore.getState().push();
            usePresentationStore.getState().deleteConnector(conn.id);
            useSelectionStore.getState().setSelConnId(null);
          }}
        >
          {ru ? 'Удалить связь' : 'Delete connector'}
        </button>
      </section>
    );
  }

  if (!el) return null;

  function patch(data) {
    editorApi.patchElementHistory(el.id, data);
  }

  function applyTextStyle(stylePatch, schemeRef) {
    if (el.type !== 'text' && el.type !== 'formula') return;
    if (stylePatch.fontSize != null || stylePatch.color != null) {
      editorApi.applyTextInline({
        fontSize: stylePatch.fontSize != null ? +stylePatch.fontSize : undefined,
        color: stylePatch.color,
        schemeRef,
      });
      if (stylePatch.lineHeight == null && stylePatch.letterSpacing == null) return;
    }
    let cs = el.cs || '';
    if (stylePatch.lineHeight != null) {
      cs = applyCsProp(cs, 'line-height', String(stylePatch.lineHeight));
    }
    if (stylePatch.letterSpacing != null) {
      const v = stylePatch.letterSpacing;
      cs = applyCsProp(cs, 'letter-spacing', v === 0 || v === '0' ? '0' : `${v}px`);
    }
    patch({ cs });
  }

  return (
    <section className="react-props-section" aria-live="polite">
      {el.type !== 'lineangle' ? (
        <>
          <div className="react-props-hdr">{ru ? 'Элемент' : 'Element'}</div>
          {el.type !== 'lego' ? (
            <div className="react-props-el-dims">
              <div className="react-props-el-grid">
                <GSlider
                  label="X"
                  min={0}
                  max={cw}
                  step={1}
                  value={Math.round(+el.x || 0)}
                  disabled={!!el.locked}
                  onChange={(v) => patch({ x: Math.round(v) })}
                />
                <GSlider
                  label="Y"
                  min={0}
                  max={ch}
                  step={1}
                  value={Math.round(+el.y || 0)}
                  disabled={!!el.locked}
                  onChange={(v) => patch({ y: Math.round(v) })}
                />
                <GSlider
                  label={ru ? 'Ш' : 'W'}
                  min={20}
                  max={cw}
                  step={1}
                  value={Math.round(+el.w || 0)}
                  disabled={!!el.locked}
                  onChange={(v) => patch({ w: Math.max(20, Math.round(v)) })}
                />
                <GSlider
                  label={ru ? 'В' : 'H'}
                  min={10}
                  max={ch}
                  step={1}
                  value={Math.round(+el.h || 0)}
                  disabled={!!el.locked}
                  onChange={(v) => patch({ h: Math.max(10, Math.round(v)) })}
                />
              </div>
              <div className="react-props-el-rot">
                <GSlider
                  label={ru ? 'Поворот (°)' : 'Rotation (°)'}
                  min={-360}
                  max={360}
                  step={1}
                  value={Math.round(+el.rot || 0)}
                  disabled={!!el.locked}
                  onChange={(v) => patch({ rot: Math.round(v) })}
                />
                <button
                  type="button"
                  className="react-props-icon-btn"
                  disabled={!!el.locked || !(+el.rot || 0)}
                  title={ru ? 'Сбросить вращение' : 'Reset rotation'}
                  onClick={() => patch({ rot: 0 })}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {el.type === 'formula' ? (
        <div className="react-props-stack">
          <div className="react-props-hdr">{ru ? '∑ Формула' : '∑ Formula'}</div>
          <ColorField
            label={ru ? 'Цвет формулы' : 'Formula color'}
            value={el.formulaColor || el.textColor || '#ffffff'}
            schemeRef={el.formulaColorScheme ?? el.textColorScheme ?? { col: 0, row: 4 }}
            onChange={(c, sr) =>
              patch({
                formulaColor: c,
                textColor: c,
                formulaColorScheme: sr !== undefined ? sr : null,
                textColorScheme: sr !== undefined ? sr : null,
              })
            }
          />
          <button type="button" className="react-props-btn" onClick={() => editorApi.addFormula()}>
            {ru ? 'Редактировать LaTeX…' : 'Edit LaTeX…'}
          </button>
          <button type="button" className="react-props-btn" onClick={() => void editorApi.buildGraphFromFormula()}>
            {ru ? 'Построить график' : 'Build graph'}
          </button>
          {el.formulaRaw ? (
            <p className="react-props-muted" style={{ wordBreak: 'break-all', fontFamily: 'ui-monospace, Consolas, monospace' }}>
              {el.formulaRaw}
            </p>
          ) : null}
        </div>
      ) : null}

      {el.type === 'lego' ? (
        <div className="react-props-stack">
          <div className="react-props-hdr">LEGO</div>
          <ColorField
            label={ru ? 'Цвет блока' : 'Brick color'}
            value={el.legoColor || '#906cf9'}
            onChange={(c) => patch({ legoColor: c })}
          />
          <label className="react-props-field">
            <span>{ru ? 'Форма' : 'Piece'}</span>
            <select
              value={
                LEGO_PIECES.find(
                  (p) =>
                    p.n === +(el.legoStuds || 2) &&
                    !!p.tall === !!el.legoTall &&
                    (p.slope || null) === (el.legoSlope || null) &&
                    (p.stair || null) === (el.legoStair || null)
                )?.id || '2f'
              }
              onChange={(e) => {
                const piece = LEGO_PIECES.find((p) => p.id === e.target.value) || LEGO_PIECES[1];
                const next = {
                  legoStuds: piece.n,
                  legoTall: !!piece.tall,
                  legoSlope: piece.slope || null,
                  legoStair: piece.stair || null,
                };
                Object.assign(next, legoSizeFor(next));
                patch(next);
              }}
            >
              {LEGO_PIECES.map((p) => (
                <option key={p.id} value={p.id}>
                  {ru ? p.labelRu : p.labelEn}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {el.type === 'graph' ? (
        <div className="react-props-stack">
          <div className="react-props-hdr">{ru ? '📈 График' : '📈 Graph'}</div>
          {el.graphKind === 'chem' ? (
            <label className="react-props-field">
              <span>{ru ? 'Формула' : 'Formula'}</span>
              <input
                value={el.chemKey || el.graphLatex || ''}
                onChange={(e) =>
                  patch({ chemKey: e.target.value, graphLatex: e.target.value })
                }
                onBlur={() => void editorApi.rebuildSelectedGraph()}
              />
            </label>
          ) : el.graphKind === 'logic' ? (
            <label className="react-props-field">
              <span>{ru ? 'Логика / LaTeX' : 'Logic / LaTeX'}</span>
              <input
                value={el.graphLatex || ''}
                onChange={(e) => patch({ graphLatex: e.target.value })}
                onBlur={() => void editorApi.rebuildSelectedGraph()}
                placeholder="A \land B"
              />
            </label>
          ) : (
            <label className="react-props-field">
              <span>{ru ? 'Выражения / LaTeX' : 'Exprs / LaTeX'}</span>
              <textarea
                rows={Math.min(6, Math.max(2, (el.graphLines || []).length || 2))}
                value={
                  Array.isArray(el.graphLines) && el.graphLines.length > 1
                    ? el.graphLines.join('\n')
                    : el.graphLatex || el.graphExpr || ''
                }
                onChange={(e) => {
                  const text = e.target.value;
                  const parts = text
                    .split(/\n/)
                    .map((l) => l.trim())
                    .filter(Boolean);
                  patch({
                    graphLatex: parts[0] || text,
                    graphLines: parts.length ? parts : [text],
                    graphExpr: '',
                    graphExprs: [],
                  });
                }}
                onBlur={() => void editorApi.rebuildSelectedGraph()}
                placeholder={ru ? 'y = x^2, x > 0\ny = sin(x)' : 'y = x^2, x > 0\ny = sin(x)'}
                spellCheck={false}
                style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 }}
              />
            </label>
          )}
          <ColorField
            label={ru ? 'Цвет' : 'Color'}
            value={el.graphColor || '#6366f1'}
            onChange={(c) => {
              patch({ graphColor: c });
              setTimeout(() => void editorApi.rebuildSelectedGraph(), 0);
            }}
          />
          {el.graphKind === 'logic' ? (
            <label className="react-props-field react-props-check">
              <input
                type="checkbox"
                checked={el.logicShowFormula !== false}
                onChange={(e) => {
                  patch({ logicShowFormula: e.target.checked });
                  setTimeout(() => void editorApi.rebuildSelectedGraph(), 0);
                }}
              />
              <span>{ru ? 'Показать формулу' : 'Show formula'}</span>
            </label>
          ) : null}
          {el.graphKind !== 'chem' && el.graphKind !== 'logic' ? (
            <ColorField
              label={ru ? 'Фон' : 'Background'}
              value={el.graphBg || '#16161e'}
              onChange={(c) => {
                patch({ graphBg: c });
                setTimeout(() => void editorApi.rebuildSelectedGraph(), 0);
              }}
            />
          ) : null}
          <button type="button" className="react-props-btn" onClick={() => void editorApi.rebuildSelectedGraph()}>
            {ru ? 'Перестроить' : 'Rebuild'}
          </button>
        </div>
      ) : null}

      {el.type === 'text' ? (
        <div className="react-props-stack">
          <div className="react-props-hdr">{ru ? 'Текст' : 'Text'}</div>
          <TextPropsFmt el={el} ru={ru} applyTextStyle={applyTextStyle} />
          {(htmlHasList(el.html, 'num') && !htmlHasList(el.html, 'bullet')) ? (
            <div className="react-props-field">
              <label className="react-props-field react-props-field-compact">
                <span>{ru ? 'Отступ маркера' : 'Marker gap'}</span>
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={el.bulletGap ?? 10}
                  onChange={(e) => {
                    const g = Math.max(0, Math.min(80, +e.target.value || 0));
                    patch(g === 10 ? { bulletGap: null } : { bulletGap: g });
                  }}
                />
              </label>
            </div>
          ) : null}
          <ColorField
            label={ru ? 'Цвет текста' : 'Text color'}
            value={resolveElTextColor(el, theme)}
            schemeRef={el.textColorScheme}
            onChange={(c, sr) => applyTextStyle({ color: c }, sr)}
            onClear={() => applyTextStyle({ color: '#ffffff' }, null)}
          />
          <ColorField
            label={ru ? 'Цвет фона' : 'Background'}
            value={el.textBg || ''}
            schemeRef={el.textBgScheme}
            onChange={(c, sr) => patch({ textBg: c, textBgScheme: sr })}
            onClear={() =>
              patch({
                textBg: '',
                textBgScheme: null,
                textBgGrad: false,
                textBgCol2: '',
                textBgCol2Scheme: null,
              })
            }
          />
          <GSlider
            label={ru ? 'Прозр. фона' : 'Bg opacity'}
            min={0}
            max={1}
            step={0.05}
            value={el.textBgOp != null ? +el.textBgOp : 1}
            onChange={(v) => patch({ textBgOp: v })}
          />
          <GSlider
            label={ru ? 'Размытие фона' : 'Bg blur'}
            min={0}
            max={40}
            step={1}
            value={el.textBgBlur != null ? +el.textBgBlur : 0}
            onChange={(v) => patch({ textBgBlur: v })}
          />
          <label className="react-props-check" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
            <input
              type="checkbox"
              checked={!!el.textBgGrad}
              onChange={(e) => {
                const on = e.target.checked;
                if (on) {
                  patch({
                    textBgGrad: true,
                    textBg: el.textBg || '#000000',
                    textBgCol2: el.textBgCol2 || '#ffffff',
                    textBgDir: el.textBgDir != null ? el.textBgDir : 90,
                  });
                } else {
                  patch({ textBgGrad: false });
                }
              }}
            />
            <span>{ru ? 'Градиент фона' : 'Background gradient'}</span>
          </label>
          {el.textBgGrad ? (
            <>
              <ColorField
                label={ru ? 'Фон 2' : 'Bg 2'}
                value={el.textBgCol2 || '#ffffff'}
                schemeRef={el.textBgCol2Scheme}
                onChange={(c, sr) => patch({ textBgCol2: c, textBgCol2Scheme: sr })}
                onClear={() => patch({ textBgCol2: '', textBgCol2Scheme: null })}
              />
              <div className="react-props-row react-props-seg" style={{ marginBottom: 8 }}>
                {[0, 45, 90, 135, 180].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    className={`react-props-btn${(el.textBgDir ?? 90) === deg ? ' is-active' : ''}`}
                    onClick={() => patch({ textBgDir: deg })}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <label className="react-props-check" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
            <input
              type="checkbox"
              checked={!!el.textColorGrad}
              onChange={(e) => {
                const on = e.target.checked;
                if (on) {
                  patch({
                    textColorGrad: true,
                    textColorGrad1: el.textColorGrad1 || el.textColor || '#ffffff',
                    textColorGrad2: el.textColorGrad2 || '#94a3b8',
                    textColorGradDir: el.textColorGradDir != null ? el.textColorGradDir : 90,
                  });
                } else {
                  patch({ textColorGrad: false });
                }
              }}
            />
            <span>{ru ? 'Градиент текста' : 'Text gradient'}</span>
          </label>
          {el.textColorGrad ? (
            <>
              <ColorField
                label={ru ? 'Текст 1' : 'Text 1'}
                value={el.textColorGrad1 || el.textColor || '#ffffff'}
                onChange={(c) => patch({ textColorGrad1: c })}
              />
              <ColorField
                label={ru ? 'Текст 2' : 'Text 2'}
                value={el.textColorGrad2 || '#94a3b8'}
                onChange={(c) => patch({ textColorGrad2: c })}
                onClear={() => patch({ textColorGrad2: 'transparent' })}
              />
              <div className="react-props-row react-props-seg" style={{ marginBottom: 8 }}>
                {[0, 45, 90, 135, 180].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    className={`react-props-btn${(el.textColorGradDir ?? 90) === deg ? ' is-active' : ''}`}
                    onClick={() => patch({ textColorGradDir: deg })}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <div className="react-props-grid">
            <label className="react-props-field react-props-field-compact">
              <span>{ru ? 'Рамка' : 'Border'}</span>
              <input
                type="number"
                min="0"
                max="24"
                value={el.textBorderW ?? 0}
                onChange={(e) => patch({ textBorderW: +e.target.value })}
              />
            </label>
          </div>
          <div className="react-props-field" style={{ marginBottom: 8 }}>
            <div className="react-props-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span>{ru ? 'Скругление' : 'Corner radius'}</span>
              <div className="react-props-seg" style={{ display: 'flex', gap: 2 }}>
                {['px', '%'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={`react-props-btn${(el.rxUnit || 'px') === u ? ' is-active' : ''}`}
                    style={{ padding: '2px 6px', fontSize: 9 }}
                    onClick={() => patch({ rxUnit: u })}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div className="react-props-grid">
              {[
                { k: 'rx_tl', label: '↖' },
                { k: 'rx_tr', label: '↗' },
                { k: 'rx_bl', label: '↙' },
                { k: 'rx_br', label: '↘' },
              ].map(({ k, label }) => (
                <label key={k} className="react-props-field react-props-field-compact">
                  <span>{label}</span>
                  <input
                    type="number"
                    min="0"
                    max={el.rxUnit === '%' ? 50 : 999}
                    value={el[k] ?? el.rx ?? 0}
                    onChange={(e) => {
                      const v = Math.max(0, +e.target.value || 0);
                      const base = el.rx ?? 0;
                      const next = {
                        rxUnit: el.rxUnit || 'px',
                        rx_tl: el.rx_tl ?? base,
                        rx_tr: el.rx_tr ?? base,
                        rx_br: el.rx_br ?? base,
                        rx_bl: el.rx_bl ?? base,
                        [k]: v,
                      };
                      next.rx = next.rx_tl;
                      patch(next);
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
          {(el.textBorderW || 0) > 0 ? (
            <>
              <ColorField
                label={ru ? 'Цвет рамки' : 'Border color'}
                value={el.textBorderColor || '#ffffff'}
                onChange={(c) => patch({ textBorderColor: c })}
              />
              <div className="react-props-field" style={{ marginBottom: 8 }}>
                <span>{ru ? 'Стиль рамки' : 'Border style'}</span>
                <div className="react-props-row react-props-seg" style={{ flexWrap: 'wrap', gap: 4 }}>
                  {[
                    { id: 'solid', title: ru ? 'Сплошная' : 'Solid', svg: '<line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" stroke-width="2"/>' },
                    { id: 'dashed', title: ru ? 'Пунктир' : 'Dashed', svg: '<line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" stroke-width="2" stroke-dasharray="5 3"/>' },
                    { id: 'dotted', title: ru ? 'Точки' : 'Dotted', svg: '<line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" stroke-width="2.5" stroke-dasharray="0.1 4" stroke-linecap="round"/>' },
                    { id: 'double', title: ru ? 'Двойная' : 'Double', svg: '<line x1="1" y1="3" x2="27" y2="3" stroke="currentColor" stroke-width="1.5"/><line x1="1" y1="7" x2="27" y2="7" stroke="currentColor" stroke-width="1.5"/>' },
                    { id: 'wave', title: ru ? 'Волна' : 'Wave', svg: '<path d="M1 5 Q4 1 7 5 Q10 9 13 5 Q16 1 19 5 Q22 9 25 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
                    { id: 'zigzag', title: ru ? 'Зигзаг' : 'Zigzag', svg: '<polyline points="1,8 5,2 9,8 13,2 17,8 21,2 25,8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      title={b.title}
                      className={`react-props-btn${(el.textBorderStyle || 'solid') === b.id ? ' is-active' : ''}`}
                      onClick={() => patch({ textBorderStyle: b.id })}
                      style={{ flex: '1 1 36px', minWidth: 36, padding: '3px 2px' }}
                    >
                      <svg viewBox="0 0 28 10" width="28" height="10" dangerouslySetInnerHTML={{ __html: b.svg }} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}
          <div className="react-props-field" style={{ marginTop: 8 }}>
            <div className="react-props-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span>{ru ? 'Отступ' : 'Padding'}</span>
              <div className="react-props-seg" style={{ display: 'flex', gap: 2 }}>
                {['px', '%'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={`react-props-btn${(el.padUnit || 'px') === u ? ' is-active' : ''}`}
                    style={{ padding: '2px 6px', fontSize: 9 }}
                    onClick={() => patch({ padUnit: u })}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div className="react-props-grid">
              {[
                { k: 'pad_t', label: ru ? 'Верх' : 'Top' },
                { k: 'pad_r', label: ru ? 'Право' : 'Right' },
                { k: 'pad_b', label: ru ? 'Низ' : 'Bottom' },
                { k: 'pad_l', label: ru ? 'Лево' : 'Left' },
              ].map(({ k, label }) => (
                <label key={k} className="react-props-field react-props-field-compact">
                  <span>{label}</span>
                  <input
                    type="number"
                    min="0"
                    max={el.padUnit === '%' ? 100 : 500}
                    value={el[k] ?? 0}
                    onChange={(e) => {
                      const v = Math.max(0, +e.target.value || 0);
                      const unit = el.padUnit || 'px';
                      const next = { [k]: v, padUnit: unit };
                      // Ensure all sides exist once user edits padding
                      ['pad_t', 'pad_r', 'pad_b', 'pad_l'].forEach((side) => {
                        if (side !== k && el[side] === undefined) next[side] = 0;
                      });
                      patch(next);
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
          <button type="button" className="react-props-btn" onClick={() => editorApi.autofitText(el.id)}>
            {ru ? 'Подогнать высоту' : 'Autofit height'}
          </button>
          <div className="react-props-grid" style={{ marginTop: 8 }}>
            <label className="react-props-field react-props-field-compact">
              <span>{ru ? 'Интервал' : 'Line H'}</span>
              <input
                type="number"
                min="0.5"
                max="5"
                step="0.1"
                value={parseCsNumber(el.cs, 'line-height') ?? 1.2}
                onChange={(e) => applyTextStyle({ lineHeight: +e.target.value || 1.2 })}
              />
            </label>
            <label className="react-props-field react-props-field-compact">
              <span>{ru ? 'Трекинг' : 'Spacing'}</span>
              <input
                type="number"
                min="-10"
                max="50"
                step="0.1"
                value={parseCsNumber(el.cs, 'letter-spacing') ?? 0}
                onChange={(e) => applyTextStyle({ letterSpacing: +e.target.value || 0 })}
              />
            </label>
          </div>
          <GSlider
            label={ru ? 'Прозрачность' : 'Opacity'}
            min={0}
            max={1}
            step={0.05}
            value={el.elOpacity ?? 1}
            onChange={(v) => patch({ elOpacity: v })}
          />
          <div className="react-props-field" style={{ marginTop: 8 }}>
            <span>{ru ? 'Тень текста' : 'Text shadow'}</span>
            <div className="react-props-grid">
              <label className="react-props-field react-props-field-compact">
                <span>{ru ? 'Размытие' : 'Blur'}</span>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={el.textShadowBlur ?? 0}
                  onChange={(e) => patch({ textShadowBlur: +e.target.value })}
                />
              </label>
              <label className="react-props-field react-props-field-compact">
                <span>{ru ? 'Размер' : 'Size'}</span>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={el.textShadowSize ?? 0}
                  onChange={(e) => patch({ textShadowSize: +e.target.value })}
                />
              </label>
            </div>
            {(+(el.textShadowBlur || 0) > 0 || +(el.textShadowSize || 0) > 0) ? (
              <ColorField
                label={ru ? 'Цвет тени' : 'Shadow color'}
                value={el.textShadowColor || '#000000'}
                onChange={(c) => patch({ textShadowColor: c })}
              />
            ) : null}
          </div>
          <div className="react-props-field" style={{ marginTop: 8 }}>
            <span>{ru ? 'Тень блока' : 'Block shadow'}</span>
            <div className="react-props-grid">
              <label className="react-props-field react-props-field-compact">
                <span>{ru ? 'Размытие' : 'Blur'}</span>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={el.textBlockShadowBlur ?? 0}
                  onChange={(e) => patch({ textBlockShadowBlur: +e.target.value })}
                />
              </label>
              <label className="react-props-field react-props-field-compact">
                <span>{ru ? 'Размер' : 'Size'}</span>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={el.textBlockShadowSize ?? 0}
                  onChange={(e) => patch({ textBlockShadowSize: +e.target.value })}
                />
              </label>
            </div>
            {(+(el.textBlockShadowBlur || 0) > 0 || +(el.textBlockShadowSize || 0) > 0) ? (
              <>
                <ColorField
                  label={ru ? 'Цвет тени' : 'Shadow color'}
                  value={el.textBlockShadowColor || '#000000'}
                  onChange={(c) => patch({ textBlockShadowColor: c })}
                />
                <label className="react-props-check" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
                  <input
                    type="checkbox"
                    checked={!!el.textBlockShadowInset}
                    onChange={(e) => {
                      const on = e.target.checked;
                      patch(
                        on && !(+(el.textBlockShadowBlur || 0) > 0) && !(+(el.textBlockShadowSize || 0) > 0)
                          ? { textBlockShadowInset: true, textBlockShadowBlur: 8, textBlockShadowSize: 2 }
                          : { textBlockShadowInset: on }
                      );
                    }}
                  />
                  <span>{ru ? 'Внутренняя' : 'Inset'}</span>
                </label>
              </>
            ) : null}
          </div>
          <ShadowFields el={el} patch={patch} ru={ru} />
        </div>
      ) : null}

      {el.type === 'shape' ? (
        <div className="react-props-stack">
          <div className="react-props-hdr">{ru ? 'Стиль фигуры' : 'Shape Style'}</div>
          <div className="react-props-row" style={{ gap: 6, marginBottom: 8 }}>
            <button
              type="button"
              className="react-props-btn"
              style={{ flex: 1, fontSize: 11, padding: '5px 8px' }}
              onClick={() => editorApi.openShapePickerReplace(el.id)}
            >
              {ru ? '■ Сменить фигуру' : '■ Change shape'}
            </button>
            <button
              type="button"
              className="react-props-btn"
              style={{ flex: 1, fontSize: 11, padding: '5px 8px' }}
              onClick={() => {
                editorApi.pickElement(el.id);
                useUiStore.getState().requestInlineEdit(el.id);
              }}
            >
              {ru ? '✎ Текст фигуры' : '✎ Shape text'}
            </button>
          </div>
          <ShapeGeomFields el={el} patch={patch} ru={ru} />
          <FlipIconButtons
            flipH={!!el.shapeFlipH}
            flipV={!!el.shapeFlipV}
            ru={ru}
            onFlipH={() => patch({ shapeFlipH: !el.shapeFlipH })}
            onFlipV={() => patch({ shapeFlipV: !el.shapeFlipV })}
          />
          {!shapeNoFill ? (
            <>
              <ColorField
                label={ru ? 'Цвет заливки' : 'Fill color'}
                value={el.fill && el.fill !== 'none' ? el.fill : '#3b82f6'}
                schemeRef={el.fillScheme}
                onChange={(c, sr) => patch({ fill: c, fillScheme: sr })}
                onClear={() => patch({ fill: 'none', fillScheme: null })}
              />
              <div className="react-tog-row">
                <Toggle
                  checked={!!(el.fillGrad && el.fillGrad2)}
                  title={ru ? 'Градиент' : 'Gradient'}
                  onChange={(on) => {
                    if (on) {
                      patch({
                        fillGrad: el.fillGrad || el.fill || '#3b82f6',
                        fillGrad2: el.fillGrad2 || '#1e40af',
                        fillGradDir: el.fillGradDir != null ? el.fillGradDir : 90,
                      });
                    } else {
                      patch({ fillGrad: null, fillGrad2: null });
                    }
                  }}
                />
                <span>{ru ? 'Градиент' : 'Gradient'}</span>
              </div>
              {el.fillGrad && el.fillGrad2 ? (
                <>
                  <ColorField
                    label={ru ? 'Цвет 2' : 'Color 2'}
                    value={el.fillGrad2}
                    onChange={(c) => patch({ fillGrad2: c })}
                    onClear={() => patch({ fillGrad2: 'transparent' })}
                  />
                  <GSlider
                    label={ru ? 'Угол °' : 'Angle °'}
                    min={0}
                    max={360}
                    step={1}
                    value={el.fillGradDir ?? 90}
                    onChange={(v) => patch({ fillGradDir: Math.round(v) })}
                  />
                </>
              ) : null}
              <div className="react-props-grid">
                <GSlider
                  label={ru ? 'Прозрачность заливки' : 'Fill opacity'}
                  min={0}
                  max={1}
                  step={0.05}
                  fadeTrack
                  value={el.fillOp ?? 1}
                  onChange={(v) => patch({ fillOp: v })}
                />
                <GSlider
                  label={ru ? 'Размытие под заливкой' : 'Fill blur'}
                  min={0}
                  max={40}
                  step={1}
                  value={el.shapeBlur ?? 0}
                  onChange={(v) => patch({ shapeBlur: Math.max(0, Math.min(40, v)) })}
                />
              </div>
            </>
          ) : null}
          {el.shape === 'line' ? (
            <div className="react-props-stack" style={{ gap: 8 }}>
              <div className="react-props-hdr" style={{ marginTop: 4 }}>
                {ru ? 'Геометрия' : 'Geometry'}
              </div>
              <div className="react-props-field">
                <span>{ru ? 'Метка' : 'Mark'}</span>
                <div className="react-props-row" style={{ flexWrap: 'wrap', gap: 3 }}>
                  {LINE_GEOM_MARKS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`react-props-btn${(el.lineMark || 'none') === m.id ? ' is-active' : ''}`}
                      title={ru ? m.titleRu : m.titleEn}
                      onClick={() => patch({ lineMark: m.id === 'none' ? 'none' : m.id })}
                      style={{ minWidth: 34, height: 28, padding: '2px 6px', flex: '0 0 auto', fontSize: 11 }}
                    >
                      {m.id === 'none'
                        ? '✕'
                        : m.id === 'tick1'
                          ? '|'
                          : m.id === 'tick2'
                            ? '||'
                            : m.id === 'tick3'
                              ? '|||'
                              : 'S'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="react-props-hdr" style={{ marginTop: 4 }}>
                {ru ? 'Маркеры' : 'Markers'}
              </div>
              {[
                { key: 'lineFromMarker', lab: ru ? 'Начало' : 'Start' },
                { key: 'lineToMarker', lab: ru ? 'Конец' : 'End' },
              ].map(({ key, lab }) => (
                <div key={key} className="react-props-field">
                  <span>{lab}</span>
                  <div className="react-props-row" style={{ flexWrap: 'wrap', gap: 3 }}>
                    {LINE_MARKER_TYPES.map((mk) => (
                      <button
                        key={mk}
                        type="button"
                        className={`react-props-btn${(el[key] || 'none') === mk ? ' is-active' : ''}`}
                        title={mk}
                        onClick={() => patch({ [key]: mk })}
                        style={{ width: 34, height: 34, padding: 3, flex: '0 0 auto' }}
                      >
                        <svg
                          viewBox="0 0 28 28"
                          width="100%"
                          height="100%"
                          fill="none"
                          dangerouslySetInnerHTML={{ __html: LINE_MARKER_PREVIEWS[mk] }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <ColorField
            label={ru ? 'Цвет обводки' : 'Stroke color'}
            value={el.stroke && el.stroke !== 'none' ? el.stroke : '#1d4ed8'}
            schemeRef={el.strokeScheme}
            onChange={(c, sr) => patch({ stroke: c, strokeScheme: sr })}
            onClear={() => patch({ stroke: 'transparent', strokeScheme: null, sw: 0 })}
          />
          <div className="react-props-grid">
            <GSlider
              label={ru ? 'Толщина обводки' : 'Stroke width'}
              min={0}
              max={50}
              step={0.5}
              value={el.sw ?? 2}
              onChange={(v) => editorApi.setStrokeWidth(v)}
            />
            {!shapeNoFill ? (
              <GSlider
                label={ru ? 'Скругление (%)' : 'Corner radius (%)'}
                min={0}
                max={100}
                step={1}
                value={el.rx ?? 0}
                onChange={(v) => patch({ rx: Math.max(0, Math.min(100, v)) })}
              />
            ) : null}
          </div>
          <div className="react-props-field">
            <span>{ru ? 'Штрих' : 'Stroke style'}</span>
            <div className="react-props-row react-props-seg" style={{ flexWrap: 'wrap', gap: 4 }}>
              {[
                { id: 'solid', title: ru ? 'Сплошная' : 'Solid', svg: '<line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" stroke-width="2"/>' },
                { id: 'dashed', title: ru ? 'Пунктир' : 'Dashed', svg: '<line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" stroke-width="2" stroke-dasharray="5 3"/>' },
                { id: 'dotted', title: ru ? 'Точки' : 'Dotted', svg: '<line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" stroke-width="2.5" stroke-dasharray="0.1 4" stroke-linecap="round"/>' },
                { id: 'double', title: ru ? 'Двойная' : 'Double', svg: '<line x1="1" y1="3" x2="27" y2="3" stroke="currentColor" stroke-width="1.5"/><line x1="1" y1="7" x2="27" y2="7" stroke="currentColor" stroke-width="1.5"/>' },
                { id: 'wave', title: ru ? 'Волна' : 'Wave', svg: '<path d="M1 5 Q4 1 7 5 Q10 9 13 5 Q16 1 19 5 Q22 9 25 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
                { id: 'zigzag', title: ru ? 'Зигзаг' : 'Zigzag', svg: '<polyline points="1,8 5,2 9,8 13,2 17,8 21,2 25,8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`react-props-btn${(el.strokeStyle || 'solid') === b.id ? ' is-active' : ''}`}
                  title={b.title}
                  onClick={() => patch({ strokeStyle: b.id })}
                  style={{ flex: '1 1 36px', minWidth: 36, padding: '4px 2px' }}
                >
                  <svg viewBox="0 0 28 10" width="28" height="10" dangerouslySetInnerHTML={{ __html: b.svg }} />
                </button>
              ))}
            </div>
          </div>
          <ShadowFields el={el} patch={patch} ru={ru} />
          <GSlider
            label={ru ? 'Прозрачность фигуры' : 'Shape opacity'}
            min={0}
            max={1}
            step={0.05}
            fadeTrack
            value={el.elOpacity ?? 1}
            onChange={(v) => patch({ elOpacity: v })}
          />
          {el.shape !== 'line' ? (
            <div className="react-props-stack" style={{ gap: 8 }}>
              <div className="react-props-hdr" style={{ marginTop: 4 }}>
                {ru ? 'Текст фигуры' : 'Shape text'}
              </div>
              <button
                type="button"
                className="react-props-btn"
                style={{ width: '100%' }}
                onClick={() => {
                  editorApi.pickElement(el.id);
                  useUiStore.getState().requestInlineEdit(el.id);
                }}
              >
                {ru ? '✏️ Редактировать (или двойной клик)' : '✏️ Edit (or double-click)'}
              </button>
              <ColorField
                label={ru ? 'Цвет текста' : 'Text color'}
                value={getShapeTextColor(el)}
                schemeRef={el.textColorScheme}
                onChange={(c, sr) =>
                  patch({
                    shapeTextCss: withShapeTextColor(el.shapeTextCss, c),
                    textColor: c,
                    textColorScheme: sr,
                  })
                }
                onClear={() =>
                  patch({
                    shapeTextCss: withShapeTextColor(el.shapeTextCss, '#ffffff'),
                    textColor: '#ffffff',
                    textColorScheme: null,
                  })
                }
              />
              <label className="react-props-field">
                <span>{ru ? 'Шрифт' : 'Font'}</span>
                <select
                  value={shapeTextFontFamily(el) || ''}
                  onChange={(e) =>
                    patch({
                      shapeTextCss: withShapeTextProp(el.shapeTextCss, 'font-family', e.target.value),
                    })
                  }
                >
                  <option value="">{ru ? '— по умолчанию —' : '— default —'}</option>
                  {FONT_FAMILIES.filter((f) => f.id).map((f) => (
                    <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="react-props-grid">
                <GSlider
                  label={ru ? 'Размер шрифта' : 'Font size'}
                  min={8}
                  max={200}
                  step={1}
                  value={shapeTextFontSizePx(el)}
                  onChange={(v) => {
                    const n = Math.max(8, Math.min(200, Math.round(v)));
                    patch({
                      shapeTextCss: withShapeTextProp(el.shapeTextCss, 'font-size', `${n}px`),
                    });
                  }}
                />
                <label className="react-props-field react-props-field-compact">
                  <span>{ru ? 'Насыщенность' : 'Weight'}</span>
                  <select
                    value={shapeTextFontWeight(el) === '400' ? '400' : '700'}
                    onChange={(e) =>
                      patch({
                        shapeTextCss: withShapeTextProp(el.shapeTextCss, 'font-weight', e.target.value),
                      })
                    }
                  >
                    <option value="400">{ru ? 'Обычный' : 'Regular'}</option>
                    <option value="700">{ru ? 'Жирный' : 'Bold'}</option>
                  </select>
                </label>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {el.type === 'table' ? (
        <div className="react-props-stack">
          <div className="react-props-row react-props-seg" style={{ marginBottom: 8 }}>
            <button
              type="button"
              className={`react-props-btn${!el.showChart ? ' primary' : ''}`}
              onClick={() => patch({ showChart: false })}
            >
              {ru ? 'Таблица' : 'Table'}
            </button>
            <button
              type="button"
              className={`react-props-btn${el.showChart ? ' primary' : ''}`}
              onClick={() => patch({ showChart: true })}
            >
              {ru ? 'Диаграмма' : 'Chart'}
            </button>
          </div>

          {!el.showChart ? (
            <>
              {/* Table structure grid — v7.1 tbl-struct-grid */}
              <div className="tbl-struct-grid">
                <label style={{ gridColumn: 'span 3' }}>{ru ? 'Строки' : 'Rows'}</label>
                <label style={{ gridColumn: 'span 3' }}>{ru ? 'Столбцы' : 'Columns'}</label>
                <button type="button" className="tbtn2" title={ru ? 'Вставить выше' : 'Insert above'} onClick={() => editorApi.tableAddRow({ before: true })}>▲</button>
                <button type="button" className="tbtn2" title={ru ? 'Вставить ниже' : 'Insert below'} onClick={() => editorApi.tableAddRow({ after: true })}>▼</button>
                <button type="button" className="tbtn2" title={ru ? 'Удалить строку' : 'Delete row'} onClick={() => editorApi.tableDelRow()} style={{ color: '#f87171' }}>✕</button>
                <button type="button" className="tbtn2" title={ru ? 'Вставить слева' : 'Insert left'} onClick={() => editorApi.tableAddCol({ before: true })}>◀</button>
                <button type="button" className="tbtn2" title={ru ? 'Вставить справа' : 'Insert right'} onClick={() => editorApi.tableAddCol({ after: true })}>▶</button>
                <button type="button" className="tbtn2" title={ru ? 'Удалить столбец' : 'Delete column'} onClick={() => editorApi.tableDelCol()} style={{ color: '#f87171' }}>✕</button>
                <button type="button" className="tbtn2 tbl-act-btn" title={ru ? 'Объединить выделенные ячейки' : 'Merge selected cells'} onClick={() => editorApi.tableMergeCells()}>⊞</button>
                <button type="button" className="tbtn2 tbl-act-btn" title={ru ? 'Разъединить ячейку' : 'Split cell'} onClick={() => editorApi.tableSplitCells()}>⊟</button>
                <button type="button" className="tbtn2 tbl-act-btn" title={ru ? 'Очистить формат ячеек' : 'Clear cell format'} onClick={() => editorApi.tableClearFormat()} style={{ color: 'var(--text3)' }}><svg viewBox="0 0 16 16" width="13" height="13" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="2.5" width="11" height="11" stroke="currentColor" strokeWidth="1.2"/><line x1="8" y1="2.5" x2="8" y2="13.5" stroke="currentColor" strokeWidth="1"/><line x1="2.5" y1="8" x2="13.5" y2="8" stroke="currentColor" strokeWidth="1"/><line x1="10.5" y1="3.5" x2="14.5" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="14.5" y1="3.5" x2="10.5" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
              </div>

              {(() => {
                const cellActive =
                  tableCell && String(tableCell.elId) === String(el.id)
                    ? getTableCell(el, tableCell.r, tableCell.c)
                    : null;
                if (!cellActive || tableCell == null) {
                  return (
                    <p className="react-props-muted">
                      {ru
                        ? 'Клик по ячейке — выделение и правка; тяните для выбора диапазона'
                        : 'Click a cell to select and edit; drag for a range'}
                    </p>
                  );
                }
                const cr = tableCell.r;
                const cc = tableCell.c;
                const selCount =
                  tableCellSel && String(tableCell.elId) === String(el.id)
                    ? tableCellSel.filter((k) => !getTableCell(el, +k.r, +k.c).hidden).length
                    : 0;
                return (
                  <div className="react-props-stack" style={{ gap: 6 }}>
                    <div className="react-props-hdr">
                      {selCount > 1
                        ? ru
                          ? `Ячейки: ${selCount} (от ${cr + 1}:${cc + 1})`
                          : `Cells: ${selCount} (from ${cr + 1}:${cc + 1})`
                        : ru
                          ? `Ячейка ${cr + 1}:${cc + 1}`
                          : `Cell ${cr + 1}:${cc + 1}`}
                    </div>
                    {/* Cell alignment — v7.1 layout with SVG icons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 3, marginBottom: 6, alignItems: 'end' }}>
                      <div style={{ margin: 0 }}>
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'По горизонтали' : 'Horizontal'}</span>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginTop: 2 }}>
                          {[
                            { a: 'left', svg: <svg width="13" height="11" viewBox="0 0 14 12"><line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1.5"/></svg> },
                            { a: 'center', svg: <svg width="13" height="11" viewBox="0 0 14 12"><line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="1.5"/><line x1="2.5" y1="5" x2="11.5" y2="5" stroke="currentColor" strokeWidth="1.5"/><line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="1.5"/></svg> },
                            { a: 'right', svg: <svg width="13" height="11" viewBox="0 0 14 12"><line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="1.5"/><line x1="5" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.5"/><line x1="2" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.5"/></svg> },
                          ].map(({ a, svg }) => (
                            <button key={a} type="button" className={`ftbtn${(cellActive.align || 'left') === a ? ' active' : ''}`} onClick={() => editorApi.patchSelectedTableCells({ align: a })}>
                              {svg}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ margin: 0 }}>
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'По вертикали' : 'Vertical'}</span>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginTop: 2 }}>
                          {[
                            { a: 'top', svg: <svg width="12" height="13" viewBox="0 0 12 14"><line x1="0" y1="0" x2="12" y2="0" stroke="currentColor" strokeWidth="1.5"/><path d="M6 2v9" stroke="currentColor" strokeWidth="1.5"/><path d="M3 5l3-4 3 4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg> },
                            { a: 'middle', svg: <svg width="12" height="13" viewBox="0 0 12 14"><line x1="0" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5"/><path d="M6 3v3M6 8v3" stroke="currentColor" strokeWidth="1.5"/></svg> },
                            { a: 'bottom', svg: <svg width="12" height="13" viewBox="0 0 12 14"><line x1="0" y1="14" x2="12" y2="14" stroke="currentColor" strokeWidth="1.5"/><path d="M6 5v7" stroke="currentColor" strokeWidth="1.5"/><path d="M3 9l3 4 3-4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg> },
                          ].map(({ a, svg }) => (
                            <button key={a} type="button" className={`ftbtn${(cellActive.valign || 'middle') === a ? ' active' : ''}`} onClick={() => editorApi.patchSelectedTableCells({ valign: a })}>
                              {svg}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button type="button" className="ftbtn" title={ru ? 'Сбросить форматирование текста' : 'Reset text formatting'} onClick={() => editorApi.tableResetCellFormat()} style={{ color: 'var(--text3)', flexShrink: 0, height: 22 }}>
                        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="1" y="12" fontFamily="serif" fontSize="12" fontWeight="700" fill="currentColor">A</text><line x1="10" y1="4" x2="15" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="15" y1="4" x2="10" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                    <GSlider
                      label={ru ? 'Размер шрифта' : 'Font size'}
                      min={8}
                      max={72}
                      step={1}
                      value={cellActive.fs != null ? +cellActive.fs : el.fs || 15}
                      onChange={(v) => editorApi.patchSelectedTableCells({ fs: +v })}
                    />
                    <label className="react-props-field">
                      <span>{ru ? 'Шрифт' : 'Font'}</span>
                      <select
                        value={cellActive.ff || el.ff || ''}
                        onChange={(e) =>
                          editorApi.patchSelectedTableCells({
                            ff: e.target.value || undefined,
                          })
                        }
                      >
                        <option value="">{ru ? '— по умолчанию —' : '— default —'}</option>
                        {FONT_FAMILIES.filter((f) => f.id).map((f) => (
                          <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <ColorField
                      label={ru ? 'Цвет текста' : 'Text color'}
                      value={cellActive.textColor || el.textColor || '#ffffff'}
                      onChange={(c) => editorApi.patchSelectedTableCells({ textColor: c })}
                      onClear={() => editorApi.patchSelectedTableCells({ textColor: '' })}
                    />
                    <ColorField
                      label={ru ? 'Цвет фона' : 'Background'}
                      value={cellActive.bg || 'transparent'}
                      onChange={(c) => editorApi.patchSelectedTableCells({ bg: c })}
                      onClear={() => editorApi.patchSelectedTableCells({ bg: '' })}
                    />
                  </div>
                );
              })()}

              <div className="react-props-grid">
                <GSlider
                  label={ru ? 'Скругление' : 'Rounding'}
                  min={0}
                  max={40}
                  step={1}
                  value={el.rx != null ? +el.rx : 8}
                  onChange={(v) => patch({ rx: +v })}
                />
                <GSlider
                  label={ru ? 'Прозр. фона' : 'Bg opacity'}
                  min={0}
                  max={1}
                  step={0.05}
                  value={el.tableBgOp != null ? +el.tableBgOp : 1}
                  onChange={(v) => patch({ tableBgOp: +v })}
                />
                <GSlider
                  label={ru ? 'Размытие' : 'Blur'}
                  min={0}
                  max={40}
                  step={1}
                  value={el.tableBgBlur != null ? +el.tableBgBlur : 0}
                  onChange={(v) => patch({ tableBgBlur: +v })}
                />
              </div>

              <ColorField
                label={ru ? 'Линии таблицы' : 'Table lines'}
                value={el.borderColor || el.stroke || '#3b82f680'}
                schemeRef={el.borderColorScheme}
                onChange={(c, sr) => patch({ borderColor: c, borderColorScheme: sr, stroke: c })}
              />
              <div className="react-props-el-rot">
                <GSlider
                  label={ru ? 'Толщина линии' : 'Line thickness'}
                  min={0}
                  max={10}
                  step={0.5}
                  value={el.borderW != null ? +el.borderW : 1}
                  onChange={(v) => patch({ borderW: +v })}
                />
                <button
                  type="button"
                  className="react-props-icon-btn"
                  title={ru ? 'Сбросить толщину' : 'Reset thickness'}
                  disabled={el.borderW == null || +el.borderW === 1}
                  onClick={() => patch({ borderW: 1 })}
                >
                  ✕
                </button>
              </div>
              <ColorField
                label={ru ? 'Цвет текста' : 'Text color'}
                value={el.textColor || '#ffffff'}
                schemeRef={el.textColorScheme}
                onChange={(c, sr) => patch({ textColor: c, textColorScheme: sr })}
              />
              <label className="react-props-field">
                <span>{ru ? 'Шрифт' : 'Font'}</span>
                <select
                  value={el.ff || ''}
                  onChange={(e) => patch({ ff: e.target.value || undefined })}
                >
                  <option value="">{ru ? '— по умолчанию —' : '— default —'}</option>
                  {FONT_FAMILIES.filter((f) => f.id).map((f) => (
                    <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="react-tog-row" style={{ justifyContent: 'space-between' }}>
                <span>{ru ? 'Заголовок · первая строка' : 'Header · first row'}</span>
                <Toggle
                  checked={el.headerRow !== false}
                  onChange={(v) => patch({ headerRow: !!v })}
                  aria-label={ru ? 'Первая строка' : 'First row'}
                />
              </div>
              {el.headerRow !== false ? (
                <ColorField
                  label={ru ? 'Фон заголовка' : 'Header bg'}
                  value={el.headerBg || '#3b82f6'}
                  schemeRef={el.headerBgScheme}
                  onChange={(c, sr) => patch({ headerBg: c, headerBgScheme: sr })}
                />
              ) : null}
              <ColorField
                label={ru ? 'Фон ячеек' : 'Cell bg'}
                value={el.cellBg || 'transparent'}
                schemeRef={el.cellBgScheme}
                onChange={(c, sr) => patch({ cellBg: c, cellBgScheme: sr })}
                onClear={() => patch({ cellBg: '', cellBgScheme: null })}
              />
              <div className="react-tog-row" style={{ justifyContent: 'space-between' }}>
                <span>{ru ? 'Чередовать цвет строк' : 'Alternate row colors'}</span>
                <Toggle
                  checked={!!el.altBg}
                  onChange={(v) => editorApi.setTableAltRows(!!v)}
                  aria-label={ru ? 'Чередовать цвет строк' : 'Alternate row colors'}
                />
              </div>
              {el.altBg ? (
                <ColorField
                  label={ru ? 'Чередование' : 'Alt rows'}
                  value={el.altBg}
                  schemeRef={el.altBgScheme}
                  onChange={(c, sr) => patch({ altBg: c, altBgScheme: sr })}
                  onClear={() => editorApi.setTableAltRows(false)}
                />
              ) : null}
            </>
          ) : (
            <>
              {/* Chart type — SVG icon grid (v7.1) */}
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Тип диаграммы' : 'Chart type'}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginTop: 3 }}>
                  {[
                    { id: 'bar', title: ru ? 'Столбцы' : 'Bars', svg: <svg width="16" height="14" viewBox="0 0 16 14"><rect x="1" y="4" width="3" height="10" rx="1" fill="currentColor"/><rect x="6" y="1" width="3" height="13" rx="1" fill="currentColor"/><rect x="11" y="6" width="3" height="8" rx="1" fill="currentColor"/></svg> },
                    { id: 'horizontalBar', title: ru ? 'Горизонтальные' : 'H-Bars', svg: <svg width="16" height="14" viewBox="0 0 16 14"><rect x="0" y="1" width="10" height="3" rx="1" fill="currentColor"/><rect x="0" y="6" width="14" height="3" rx="1" fill="currentColor"/><rect x="0" y="11" width="7" height="3" rx="1" fill="currentColor"/></svg> },
                    { id: 'line', title: ru ? 'Линия' : 'Line', svg: <svg width="16" height="14" viewBox="0 0 16 14"><polyline points="1,12 5,5 9,8 13,2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="1" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="5" r="1.5" fill="currentColor"/><circle cx="9" cy="8" r="1.5" fill="currentColor"/><circle cx="13" cy="2" r="1.5" fill="currentColor"/></svg> },
                    { id: 'pie', title: ru ? 'Круговая' : 'Pie', svg: <svg width="16" height="14" viewBox="0 0 14 14"><path d="M7 7 L7 1 A6 6 0 0 1 13 7 Z" fill="currentColor" opacity="0.9"/><path d="M7 7 L13 7 A6 6 0 0 1 1.8 10.5 Z" fill="currentColor" opacity="0.6"/><path d="M7 7 L1.8 10.5 A6 6 0 0 1 7 1 Z" fill="currentColor" opacity="0.35"/></svg> },
                    { id: 'donut', title: ru ? 'Пончик' : 'Donut', svg: <svg width="16" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="14 6" strokeDashoffset="3"/><circle cx="7" cy="7" r="2.5" fill="var(--surface)"/></svg> },
                    { id: 'explodedPie', title: ru ? 'Взрывная круговая' : 'Exploded pie', svg: <svg width="16" height="14" viewBox="0 0 16 14"><path d="M8 7 L8 1.5 A5.5 5.5 0 0 1 13 7 Z" fill="currentColor" opacity="0.9" transform="translate(1,0)"/><path d="M8 7 L13 7 A5.5 5.5 0 0 1 4 12 Z" fill="currentColor" opacity="0.6" transform="translate(0.5,0.5)"/><path d="M8 7 L4 12 A5.5 5.5 0 0 1 8 1.5 Z" fill="currentColor" opacity="0.35" transform="translate(-0.5,0)"/></svg> },
                    { id: 'explodedDonut', title: ru ? 'Взрывная кольцевая' : 'Exploded donut', svg: <svg width="16" height="14" viewBox="0 0 16 14"><circle cx="8" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeDasharray="10 4" strokeDashoffset="2" opacity="0.9"/><circle cx="8" cy="7" r="2.5" fill="var(--surface)"/></svg> },
                  ].map((ct) => (
                    <button key={ct.id} type="button" className={`tbtn2${(el.chartType || 'bar') === ct.id ? ' active' : ''}`} title={ct.title} onClick={() => patch({ chartType: ct.id })}>
                      {ct.svg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slice gap — exploded types only */}
              {(el.chartType === 'explodedPie' || el.chartType === 'explodedDonut') ? (
                <label className="react-props-field react-props-field-compact" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Отступ секторов' : 'Slice gap'}</span>
                  <input type="number" min="0" max="40" value={el.chartSliceGap != null ? el.chartSliceGap : 6} onChange={(e) => patch({ chartSliceGap: +e.target.value })} />
                </label>
              ) : null}

              {/* Legend source */}
              <label className="react-props-field" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Легенда из' : 'Legend from'}</span>
                <select value={el.chartLegend || 'row'} onChange={(e) => patch({ chartLegend: e.target.value })}>
                  <option value="row">{ru ? 'Первой строки' : 'First row'}</option>
                  <option value="col">{ru ? 'Первого столбца' : 'First column'}</option>
                </select>
              </label>

              {/* Legend position — SVG icon grid (v7.1) */}
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Расположение легенды' : 'Legend position'}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3, marginTop: 3 }}>
                  {[
                    { id: 'bottom-left', title: ru ? 'Снизу слева' : 'Bottom left', svg: <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="9" width="4" height="2" rx="1" fill="currentColor" opacity="0.5"/><rect x="1" y="12" width="6" height="2" rx="1" fill="currentColor"/><line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1" opacity="0.3"/></svg> },
                    { id: 'bottom-center', title: ru ? 'Снизу по центру' : 'Bottom center', svg: <svg width="14" height="14" viewBox="0 0 14 14"><rect x="4" y="9" width="4" height="2" rx="1" fill="currentColor" opacity="0.5"/><rect x="3" y="12" width="8" height="2" rx="1" fill="currentColor"/><line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1" opacity="0.3"/></svg> },
                    { id: 'bottom-right', title: ru ? 'Снизу справа' : 'Bottom right', svg: <svg width="14" height="14" viewBox="0 0 14 14"><rect x="9" y="9" width="4" height="2" rx="1" fill="currentColor" opacity="0.5"/><rect x="7" y="12" width="6" height="2" rx="1" fill="currentColor"/><line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1" opacity="0.3"/></svg> },
                    { id: 'left', title: ru ? 'Слева по вертикали' : 'Left', svg: <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="2" width="2" height="10" rx="1" fill="currentColor" opacity="0.3"/><rect x="1" y="3" width="3" height="2" rx="1" fill="currentColor"/><rect x="1" y="7" width="4" height="2" rx="1" fill="currentColor"/><rect x="1" y="11" width="3" height="2" rx="1" fill="currentColor" opacity="0.6"/></svg> },
                    { id: 'right', title: ru ? 'Справа по вертикали' : 'Right', svg: <svg width="14" height="14" viewBox="0 0 14 14"><rect x="11" y="2" width="2" height="10" rx="1" fill="currentColor" opacity="0.3"/><rect x="10" y="3" width="3" height="2" rx="1" fill="currentColor"/><rect x="9" y="7" width="4" height="2" rx="1" fill="currentColor"/><rect x="10" y="11" width="3" height="2" rx="1" fill="currentColor" opacity="0.6"/></svg> },
                  ].map((lp) => (
                    <button key={lp.id} type="button" className={`tbtn2${(el.chartLegendPos || 'bottom-left') === lp.id ? ' active' : ''}`} title={lp.title} onClick={() => patch({ chartLegendPos: lp.id })}>
                      {lp.svg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data labels */}
              <label className="react-props-field" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Подписи данных' : 'Data labels'}</span>
                <select value={el.chartLabels || 'none'} onChange={(e) => patch({ chartLabels: e.target.value })}>
                  <option value="none">{ru ? 'Скрыть' : 'Hide'}</option>
                  <option value="value">{ru ? 'Числовое значение' : 'Value'}</option>
                  <option value="percent">{ru ? 'Процент' : 'Percent'}</option>
                  <option value="both">{ru ? 'Значение и процент' : 'Value & percent'}</option>
                </select>
              </label>

              {/* Label settings: color + font size + offset */}
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Настройки подписей' : 'Label settings'}</span>
                <div style={{ marginTop: 3 }}>
                  <ColorField
                    label={ru ? 'Цвет подписей' : 'Label color'}
                    value={el.chartLabelColor || el.textColor || '#ffffff'}
                    schemeRef={el.chartLabelColorScheme}
                    onChange={(c, sr) => patch({ chartLabelColor: c, chartLabelColorScheme: sr })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
                  <label className="react-props-field react-props-field-compact" style={{ marginBottom: 0 }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Размер шрифта' : 'Font size'}</span>
                    <input type="number" min="6" max="48" value={el.chartLabelFs != null ? el.chartLabelFs : 11} onChange={(e) => patch({ chartLabelFs: +e.target.value })} />
                  </label>
                  <label className="react-props-field react-props-field-compact" style={{ marginBottom: 0 }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Отступ подписей' : 'Label offset'}</span>
                    <input type="number" min="-200" max="200" value={el.chartLabelOffset != null ? el.chartLabelOffset : 0} onChange={(e) => patch({ chartLabelOffset: +e.target.value })} />
                  </label>
                </div>
              </div>

              {/* Chart background */}
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Фон диаграммы' : 'Chart background'}</span>
                <div style={{ marginTop: 3 }}>
                  <ColorField
                    label={ru ? 'Цвет фона' : 'Bg color'}
                    value={el.chartBg || ''}
                    schemeRef={el.chartBgScheme}
                    onChange={(c, sr) => patch({ chartBg: c, chartBgScheme: sr })}
                    onClear={() => patch({ chartBg: '', chartBgScheme: null })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
                  <label className="react-props-field react-props-field-compact" style={{ marginBottom: 0 }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Прозрачность' : 'Opacity'}</span>
                    <input type="number" min="0" max="1" step="0.05" value={el.chartBgOp != null ? el.chartBgOp : 1} onChange={(e) => patch({ chartBgOp: +e.target.value })} />
                  </label>
                  <label className="react-props-field react-props-field-compact" style={{ marginBottom: 0 }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Размытие фона' : 'Bg blur'}</span>
                    <input type="number" min="0" max="40" value={el.chartBgBlur != null ? el.chartBgBlur : 0} onChange={(e) => patch({ chartBgBlur: +e.target.value })} />
                  </label>
                </div>
              </div>

              {/* Chart stroke */}
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Обводка диаграммы' : 'Chart stroke'}</span>
                <div style={{ marginTop: 3 }}>
                  <ColorField
                    label={ru ? 'Цвет обводки' : 'Stroke color'}
                    value={el.chartStroke || '#3b82f6'}
                    schemeRef={el.chartStrokeScheme}
                    onChange={(c, sr) => patch({ chartStroke: c, chartStrokeScheme: sr })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
                  <label className="react-props-field react-props-field-compact" style={{ marginBottom: 0 }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Толщина обводки' : 'Stroke width'}</span>
                    <input type="number" min="0" max="20" value={el.chartSw != null ? el.chartSw : 0} onChange={(e) => patch({ chartSw: +e.target.value })} />
                  </label>
                  <label className="react-props-field react-props-field-compact" style={{ marginBottom: 0 }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{ru ? 'Скругление' : 'Rounding'}</span>
                    <input type="number" min="0" max="100" value={el.chartRx || 0} onChange={(e) => patch({ chartRx: +e.target.value })} />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}

      {el.type === 'lineangle' ? (
        <div className="react-props-stack">
          <div className="react-props-hdr">{ru ? 'Угол' : 'Angle'}</div>
          <div className="react-props-el-rot">
            <GSlider
              label={ru ? 'Градусы' : 'Degrees'}
              min={0}
              max={360}
              step={0.1}
              value={
                el.displayDeg != null
                  ? +el.displayDeg
                  : Math.round((el.deg || 0) * 10) / 10
              }
              onChange={(v) => {
                const next = Math.round(+v * 10) / 10;
                patch({
                  displayDeg: next,
                  labelStyle: el.labelStyle === 'hidden' ? 'deg' : el.labelStyle,
                });
              }}
            />
            <button
              type="button"
              className="react-props-icon-btn"
              title={ru ? 'Удалить угол' : 'Delete angle'}
              onClick={() => editorApi.deleteSelected()}
            >
              ✕
            </button>
          </div>
          <div className="react-props-el-rot">
            <GSlider
              label={ru ? 'Размер шрифта' : 'Font size'}
              min={6}
              max={72}
              step={1}
              value={el.labelFs != null ? Math.round(+el.labelFs) : 18}
              onChange={(v) => patch({ labelFs: Math.max(6, Math.min(72, Math.round(+v || 18))) })}
            />
            <span className="react-props-unit" title="pt">
              pt
            </span>
          </div>
          <div className="react-props-field" style={{ margin: 0 }}>
            <span>{ru ? 'Подпись' : 'Label'}</span>
            <div className="react-la-btn-row" role="group" aria-label={ru ? 'Подпись' : 'Label'}>
              {[
                { id: 'hidden', label: '✕', title: ru ? 'Без подписи' : 'Hidden' },
                { id: 'deg', label: '°', title: ru ? 'Градусы' : 'Degrees' },
                { id: 'alpha', label: 'α', title: 'α' },
                { id: 'beta', label: 'β', title: 'β' },
                { id: 'gamma', label: 'γ', title: 'γ' },
                { id: 'qmark', label: '?', title: '?' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`react-la-btn${normLabelStyle(el.labelStyle) === b.id ? ' is-active' : ''}`}
                  title={b.title}
                  onClick={() => patch({ labelStyle: b.id })}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <div className="react-props-field" style={{ margin: 0 }}>
            <span>{ru ? 'Дуги' : 'Arcs'}</span>
            <div className="react-la-btn-row" role="group" aria-label={ru ? 'Дуги' : 'Arcs'}>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`react-la-btn${normMarkCount(el.markCount) === n ? ' is-active' : ''}`}
                  title={
                    n === 1
                      ? ru
                        ? 'Одинарный'
                        : 'Single'
                      : n === 2
                        ? ru
                          ? 'Двойной'
                          : 'Double'
                        : n === 3
                          ? ru
                            ? 'Тройной'
                            : 'Triple'
                          : ru
                            ? 'Четверной'
                            : 'Quad'
                  }
                  onClick={() => patch({ markCount: n })}
                >
                  <svg viewBox="0 0 28 16" width="22" height="12" aria-hidden="true">
                    {Array.from({ length: n }).map((_, i) => {
                      const rr = 12 - i * 2.5;
                      return (
                        <path
                          key={i}
                          d={`M${14 - rr} 14 A${rr} ${rr} 0 0 1 ${14 + rr} 14`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8 - i * 0.1}
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </svg>
                </button>
              ))}
            </div>
          </div>
          <ColorField
            label={ru ? 'Цвет' : 'Color'}
            value={el.color || '#64748b'}
            schemeRef={el.colorScheme}
            onChange={(c, sr) => patch({ color: c || '#64748b', colorScheme: sr })}
            onClear={() => patch({ color: '#64748b', colorScheme: { col: 0, row: 4 } })}
          />
          <p className="react-props-muted">
            {ru
              ? 'Градусы в панели — подпись на слайде (геометрия отрезков не меняется). Для 90° рисуется квадратный уголок.'
              : 'Degrees in the panel is the on-slide label (segment geometry stays put). At 90° a square corner is drawn.'}
          </p>
        </div>
      ) : null}

      {el.type === 'icon' ? (
        <div className="react-props-stack">
          <div className="react-props-hdr">
            <span>{ru ? 'Значок' : 'Icon'}</span>
            {el.iconId ? (
              <span style={{ fontWeight: 600, letterSpacing: 0, textTransform: 'none', color: 'var(--text2)' }}>
                {el.iconId}
              </span>
            ) : null}
          </div>
          <ColorField
            label={ru ? 'Цвет значка' : 'Icon color'}
            value={el.iconColor || el.textColor || '#6366f1'}
            onChange={(c) => patch({ iconColor: c, textColor: c })}
          />
          <GSlider
            label={ru ? 'Обводка' : 'Stroke'}
            value={el.iconSw != null ? +el.iconSw : 1.8}
            min={0}
            max={4}
            step={0.1}
            onChange={(v) => patch({ iconSw: v })}
          />
          <GSlider
            label={ru ? 'Заливка' : 'Fill opacity'}
            value={el.iconFillOp != null ? +el.iconFillOp : 1}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => patch({ iconFillOp: v })}
          />
          <button
            type="button"
            className="react-props-btn"
            onClick={() => void editorApi.fitSelectedIconBounds()}
          >
            {ru ? 'Подогнать рамку' : 'Fit frame'}
          </button>
          <div className="react-props-field">
            <span>{ru ? 'Отразить' : 'Flip'}</span>
            <FlipIconButtons
              flipH={!!el.shapeFlipH}
              flipV={!!el.shapeFlipV}
              ru={ru}
              onFlipH={() => patch({ shapeFlipH: !el.shapeFlipH })}
              onFlipV={() => patch({ shapeFlipV: !el.shapeFlipV })}
            />
          </div>
          {iconHasAnim(el.iconId ? getIconById(el.iconId) : null) ? (
            <div className="react-props-field react-props-row" style={{ alignItems: 'center' }}>
              <span style={{ flex: 1 }}>{ru ? 'Анимация значка' : 'Icon animation'}</span>
              <label className="react-sntog">
                <span className={`react-tog${iconAnimEnabled(el) ? ' on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={iconAnimEnabled(el)}
                    onChange={(e) => patch({ iconAnim: e.target.checked })}
                  />
                  <span className="react-tog-track" />
                  <span className="react-tog-thumb" />
                </span>
              </label>
            </div>
          ) : null}
          <button type="button" className="react-props-btn" onClick={() => editorApi.openIconPickerForElement(el.id)}>
            {ru ? 'Сменить значок…' : 'Change icon…'}
          </button>
          <button type="button" className="react-props-btn" onClick={() => editorApi.setIconAsSlideBg(el.id)}>
            {ru ? 'Как фон слайда' : 'Set as slide background'}
          </button>
          <ShadowFields el={el} patch={patch} ru={ru} />
          <GSlider
            label={ru ? 'Прозрачность' : 'Opacity'}
            value={el.elOpacity ?? 1}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => patch({ elOpacity: v })}
          />
        </div>
      ) : null}

      {(el.type === 'image' || el.type === 'video' || el.type === 'mediavideo' || el.type === 'mediaaudio') ? (
        <div className="react-props-stack">
          {el.type === 'image' ? (
            <>
              <div className="react-props-hdr">{el._isQR ? (ru ? '▦ QR-код' : '▦ QR code') : ru ? 'Изображение' : 'Image'}</div>
              {el._isQR ? (
                <div className="react-props-section" style={{ marginBottom: 8 }}>
                  <label className="react-props-field">
                    <span>{ru ? 'Текст / URL' : 'Text / URL'}</span>
                    <input
                      type="text"
                      value={el.qrText || ''}
                      onChange={(e) => patch({ qrText: e.target.value })}
                      onBlur={() => editorApi.refreshQr(el.id)}
                    />
                  </label>
                  <ColorField
                    label={ru ? 'Цвет' : 'Color'}
                    value={el.qrColor || '#000000'}
                    onChange={(c) => {
                      patch({ qrColor: c });
                      setTimeout(() => editorApi.refreshQr(el.id), 0);
                    }}
                  />
                  <ColorField
                    label={ru ? 'Фон' : 'Background'}
                    value={el.qrBg === 'transparent' ? '#ffffff' : el.qrBg || '#ffffff'}
                    onChange={(c) => {
                      patch({ qrBg: c });
                      setTimeout(() => editorApi.refreshQr(el.id), 0);
                    }}
                    onClear={() => {
                      patch({ qrBg: 'transparent' });
                      setTimeout(() => editorApi.refreshQr(el.id), 0);
                    }}
                  />
                  <label className="react-props-field react-props-field-compact">
                    <span>{ru ? 'Скругл.' : 'Radius'}</span>
                    <input
                      type="number"
                      min="0"
                      max="80"
                      value={el.qrRx ?? 16}
                      onChange={(e) => patch({ qrRx: +e.target.value, imgRx: +e.target.value })}
                    />
                  </label>
                </div>
              ) : null}
              {/* Frame (Шаблон) - visual buttons like v7.1 */}
              <div className="react-props-field">
                <span>{ru ? 'Шаблон' : 'Frame'}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 6 }}>
                  {[
                    { id: 'none', lab: ru ? 'Нет' : 'None', title: ru ? 'Без стиля' : 'No style' },
                    { id: 'ribbon', lab: ru ? 'Лента' : 'Ribbon', title: ru ? 'Ленточка' : 'Ribbon' },
                    { id: 'soft', lab: ru ? 'Край' : 'Soft', title: ru ? 'Мягкий край' : 'Soft edge' },
                    { id: 'polaroid', lab: ru ? 'Полар.' : 'Polar.', title: ru ? 'Полароид' : 'Polaroid' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`react-props-btn${(el.imgFrame || 'none') === f.id ? ' is-active' : ''}`}
                      title={f.title}
                      onClick={() => patch({ imgFrame: f.id })}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        padding: '4px 2px',
                        fontSize: 9,
                        minHeight: 40,
                      }}
                    >
                      <span className={`react-img-frame-thumb react-img-frame-thumb-${f.id}`} />
                      <span>{f.lab}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Caption for polaroid */}
              {el.imgFrame === 'polaroid' ? (
                <label className="react-props-field">
                  <span>{ru ? 'Подпись' : 'Caption'}</span>
                  <input
                    type="text"
                    value={el.imgCaption || ''}
                    placeholder={ru ? 'Текст под фото…' : 'Caption text…'}
                    onChange={(e) => patch({ imgCaption: e.target.value })}
                    style={{ fontFamily: "'Segoe Script','Comic Sans MS',cursive,sans-serif" }}
                  />
                </label>
              ) : null}
              {/* Accent */}
              <div className="react-props-field">
                <span>{ru ? 'Акцент' : 'Accent'}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 6 }}>
                  {[
                    { id: 'color', lab: ru ? 'Цвет' : 'Color', bg: 'linear-gradient(135deg,#f472b6,#818cf8,#34d399)' },
                    { id: 'bw', lab: ru ? 'Ч/Б' : 'B/W', bg: 'linear-gradient(135deg,#64748b,#cbd5e1)' },
                    { id: 'sepia', lab: ru ? 'Сепия' : 'Sepia', bg: 'linear-gradient(135deg,#92400e,#d6b48a)' },
                  ].map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`react-props-btn${(el.imgAccent || 'color') === a.id ? ' is-active' : ''}`}
                      title={a.lab}
                      onClick={() => patch({ imgAccent: a.id === 'color' ? null : a.id })}
                      style={{
                        aspectRatio: '1.35',
                        background: a.bg,
                        color: a.id === 'bw' ? '#334155' : '#fff',
                        textShadow: a.id === 'bw' ? 'none' : '0 1px 2px rgba(0,0,0,.35)',
                        fontWeight: 600,
                        fontSize: 10,
                      }}
                    >
                      {a.lab}
                    </button>
                  ))}
                </div>
              </div>
              {/* Crop button */}
              <button
                type="button"
                className="react-props-btn"
                onClick={() => editorApi.startImageCrop(el.id)}
                style={{ width: '100%', marginBottom: 2 }}
              >
                {ru ? '✂️ Обрезка' : '✂️ Crop'}
              </button>
              {/* Flip buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 2 }}>
                <FlipIconButtons
                  flipH={!!el.imgFlipH}
                  flipV={!!el.imgFlipV}
                  ru={ru}
                  onFlipH={() => patch({ imgFlipH: !el.imgFlipH })}
                  onFlipV={() => patch({ imgFlipV: !el.imgFlipV })}
                />
              </div>
              {/* Set as background button */}
              <button
                type="button"
                className="react-props-btn"
                onClick={() => editorApi.setImageAsSlideBg(el.id)}
                style={{ width: '100%' }}
              >
                {ru ? '🖼 Сделать фоном' : '🖼 Set as background'}
              </button>
              {/* Border/Stroke section */}
              <div className="react-props-field">
                <span>{ru ? 'Обводка' : 'Border'}</span>
                <ColorField
                  label={ru ? 'Цвет' : 'Color'}
                  value={el.imgBc || '#ffffff'}
                  onChange={(c) => patch({ imgBc: c })}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <label className="react-props-field react-props-field-compact">
                    <span>{ru ? 'Толщина' : 'Width'}</span>
                    <input type="number" min="0" max="20" value={el.imgBw ?? 0} onChange={(e) => patch({ imgBw: +e.target.value })} />
                  </label>
                  <label className="react-props-field react-props-field-compact">
                    <span>{ru ? 'Скругл.' : 'Radius'}</span>
                    <input type="number" min="0" max="600" value={el.imgRx ?? 0} onChange={(e) => patch({ imgRx: +e.target.value })} />
                  </label>
                </div>
                {/* Border style buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                  {[
                    { id: 'solid', title: ru ? 'Сплошная' : 'Solid', svg: '<line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" stroke-width="2"/>' },
                    { id: 'dashed', title: ru ? 'Пунктир' : 'Dashed', svg: '<line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" stroke-width="2" stroke-dasharray="5 3"/>' },
                    { id: 'dotted', title: ru ? 'Точки' : 'Dotted', svg: '<line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" stroke-width="2.5" stroke-dasharray="0.1 4" stroke-linecap="round"/>' },
                    { id: 'double', title: ru ? 'Двойная' : 'Double', svg: '<line x1="1" y1="3" x2="27" y2="3" stroke="currentColor" stroke-width="1.5"/><line x1="1" y1="7" x2="27" y2="7" stroke="currentColor" stroke-width="1.5"/>' },
                    { id: 'wave', title: ru ? 'Волна' : 'Wave', svg: '<path d="M1 5 Q4 1 7 5 Q10 9 13 5 Q16 1 19 5 Q22 9 25 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
                    { id: 'zigzag', title: ru ? 'Зигзаг' : 'Zigzag', svg: '<polyline points="1,8 5,2 9,8 13,2 17,8 21,2 25,8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      title={b.title}
                      className={`react-props-btn${(el.imgBorderStyle || 'solid') === b.id ? ' is-active' : ''}`}
                      onClick={() => patch({ imgBorderStyle: b.id, imgBw: el.imgBw > 0 ? el.imgBw : 3 })}
                      style={{ flex: '1 1 36px', minWidth: 36, padding: '3px 2px' }}
                    >
                      <svg viewBox="0 0 28 10" width="28" height="10" dangerouslySetInnerHTML={{ __html: b.svg }} />
                    </button>
                  ))}
                </div>
              </div>
              {/* Shadow section */}
              <div className="react-props-field">
                <span>{ru ? 'Тень' : 'Shadow'}</span>
                <label className="react-props-check" style={{ marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={!!el.imgShadow}
                    onChange={(e) => patch({ imgShadow: e.target.checked })}
                  />
                  {ru ? 'Включить тень' : 'Enable shadow'}
                </label>
                {el.imgShadow ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <ColorField
                        label=""
                        value={el.imgShadowColor || '#000000'}
                        onChange={(c) => patch({ imgShadowColor: c })}
                        compact
                      />
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={el.imgShadowBlur ?? 15}
                        title={ru ? 'Размытие' : 'Blur'}
                        placeholder="blur"
                        onChange={(e) => patch({ imgShadowBlur: +e.target.value })}
                        style={{ flex: 1, minWidth: 0, fontSize: 11 }}
                      />
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={el.imgShadowSize ?? 4}
                        title={ru ? 'Смещение' : 'Offset'}
                        placeholder="size"
                        onChange={(e) => patch({ imgShadowSize: +e.target.value })}
                        style={{ flex: 1, minWidth: 0, fontSize: 11 }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              {/* Opacity */}
              <label className="react-props-field">
                <span>{ru ? 'Прозрачность' : 'Opacity'}</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={el.imgOpacity ?? el.elOpacity ?? 1}
                  onChange={(e) => patch({ imgOpacity: +e.target.value, elOpacity: +e.target.value })}
                />
              </label>
              {/* Change image button */}
              <button type="button" className="react-props-btn" onClick={() => editorApi.openImagePicker()}>
                {ru ? 'Сменить картинку…' : 'Change image…'}
              </button>
            </>
          ) : null}
          {(el.type === 'mediavideo' || el.type === 'mediaaudio') && (
            <>
              <div className="react-props-hdr">{el.type === 'mediavideo' ? (ru ? '🎬 Видео' : '🎬 Video') : ru ? '🔊 Аудио' : '🔊 Audio'}</div>
              <label className="react-props-field">
                <span>{ru ? 'Ссылка (URL)' : 'URL'}</span>
                <input
                  type="text"
                  value={el.mediaSrc && String(el.mediaSrc).startsWith('data:') ? (el.mediaName || 'file') : el.mediaSrc || ''}
                  placeholder="https://…"
                  onChange={(e) =>
                    patch({ mediaSrc: e.target.value, mediaSrcType: 'url', mediaId: undefined })
                  }
                />
              </label>
              <div className="react-props-actions" style={{ marginBottom: 6 }}>
                <button
                  type="button"
                  className="react-props-btn"
                  onClick={() =>
                    editorApi.pickMediaFile(el.id, el.type === 'mediavideo' ? 'video/*' : 'audio/*')
                  }
                >
                  {ru ? '📁 Файл…' : '📁 File…'}
                </button>
                {el.type === 'mediaaudio' ? (
                  <label className="react-props-field" style={{ flex: 1, margin: 0 }}>
                    <span>{ru ? '♪ Звуки' : '♪ Sounds'}</span>
                    <select
                      value=""
                      onChange={(e) => {
                        const path = e.target.value;
                        if (path) editorApi.setMediaLibrarySound(el.id, path);
                        e.target.value = '';
                      }}
                    >
                      <option value="">{ru ? 'Выбрать…' : 'Pick…'}</option>
                      {editorApi.getAudioLibrary().map((a) => (
                        <option key={a.id || a.path} value={a.path}>
                          {a.name || a.file || a.path}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
              {el.mediaName ? (
                <div className="react-props-muted" style={{ marginBottom: 6 }}>
                  {el.mediaName}
                </div>
              ) : null}
              {el.type === 'mediavideo' ? (
                <>
                  <label className="react-props-field">
                    <span>{ru ? 'Отображение' : 'Display'}</span>
                    <select
                      value={el.mvDisplay || 'windowed'}
                      onChange={(e) => patch({ mvDisplay: e.target.value })}
                    >
                      <option value="windowed">{ru ? 'В окне (на слайде)' : 'On slide'}</option>
                      <option value="fullscreen">{ru ? 'На весь экран' : 'Fullscreen'}</option>
                    </select>
                  </label>
                  <label className="react-props-field">
                    <span>{ru ? 'Плеер' : 'Controls'}</span>
                    <select
                      value={el.mvControls || 'controls'}
                      onChange={(e) => patch({ mvControls: e.target.value })}
                    >
                      <option value="controls">{ru ? 'С элементами управления' : 'With controls'}</option>
                      <option value="none">{ru ? 'Без элементов' : 'No controls'}</option>
                    </select>
                  </label>
                  <label className="react-props-field">
                    <span>{ru ? 'Запуск' : 'Start'}</span>
                    <select
                      value={el.mvStart || 'click'}
                      onChange={(e) => patch({ mvStart: e.target.value })}
                    >
                      <option value="click">{ru ? 'По клику на объект' : 'Click object'}</option>
                      <option value="auto">{ru ? 'Автоматически' : 'Auto'}</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="react-props-field">
                    <span>{ru ? 'Громкость' : 'Volume'}</span>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={el.maVolume != null ? el.maVolume : 1}
                      onChange={(e) =>
                        patch({ maVolume: Math.max(0, Math.min(1, +e.target.value || 0)) })
                      }
                    />
                  </label>
                  <label className="react-props-field">
                    <span>{ru ? 'Запуск' : 'Start'}</span>
                    <select
                      value={el.maStart || 'click-el'}
                      onChange={(e) => patch({ maStart: e.target.value })}
                    >
                      <option value="click-el">{ru ? 'Клик по объекту на слайде' : 'Click object'}</option>
                      <option value="auto">{ru ? 'Автоматически' : 'Auto'}</option>
                      <option value="click-slide">{ru ? 'Клик по слайду' : 'Click slide'}</option>
                    </select>
                  </label>
                  {(el.maStart || 'click-el') === 'click-el' ? (
                    <div className="react-props-field">
                      <span>{ru ? 'Объекты-триггеры' : 'Trigger objects'}</span>
                      {(() => {
                        const trigIds = Array.isArray(el.maTriggerElIds)
                          ? el.maTriggerElIds
                          : el.maTriggerElId
                            ? [el.maTriggerElId]
                            : [];
                        const typeLabel = (t) =>
                          ({
                            text: ru ? 'Текст' : 'Text',
                            image: ru ? 'Изображение' : 'Image',
                            shape: ru ? 'Фигура' : 'Shape',
                            icon: ru ? 'Значок' : 'Icon',
                            table: ru ? 'Таблица' : 'Table',
                            code: ru ? 'Код' : 'Code',
                            markdown: 'Markdown',
                            mediavideo: ru ? 'Видео' : 'Video',
                            mediaaudio: ru ? 'Аудио' : 'Audio',
                            applet: ru ? 'Аплет' : 'Applet',
                          }[t] || t);
                        return (
                          <>
                            <div className="react-media-triggers">
                              {trigIds.length ? (
                                trigIds.map((tid) => {
                                  const te = els.find((e) => e && String(e.id) === String(tid));
                                  const lab =
                                    String(tid) === String(el.id)
                                      ? ru
                                        ? '♪ Этот объект'
                                        : '♪ This object'
                                      : te
                                        ? `${typeLabel(te.type)} (${tid})`
                                        : String(tid);
                                  return (
                                    <div key={tid} className="react-media-trigger-row">
                                      <span>{lab}</span>
                                      <button
                                        type="button"
                                        className="react-props-btn"
                                        onClick={() =>
                                          patch({
                                            maTriggerElIds: trigIds.filter((x) => String(x) !== String(tid)),
                                            maTriggerElId: undefined,
                                          })
                                        }
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="react-props-muted">{ru ? 'Не выбраны' : 'None'}</div>
                              )}
                            </div>
                            <div className="react-props-actions" style={{ marginTop: 4 }}>
                              <button
                                type="button"
                                className="react-props-btn"
                                onClick={() => {
                                  if (trigIds.some((x) => String(x) === String(el.id))) return;
                                  patch({
                                    maTriggerElIds: [...trigIds, el.id],
                                    maTriggerElId: undefined,
                                  });
                                }}
                              >
                                {ru ? '♪ Этот объект' : '♪ This object'}
                              </button>
                            </div>
                            <label className="react-props-field" style={{ marginTop: 4 }}>
                              <span>{ru ? 'Добавить объект' : 'Add object'}</span>
                              <select
                                value=""
                                onChange={(e) => {
                                  const id = e.target.value;
                                  if (!id) return;
                                  if (trigIds.some((x) => String(x) === String(id))) return;
                                  patch({
                                    maTriggerElIds: [...trigIds, id],
                                    maTriggerElId: undefined,
                                  });
                                  e.target.value = '';
                                }}
                              >
                                <option value="">{ru ? 'Выбрать…' : 'Pick…'}</option>
                                {els
                                  .filter((e) => e && e.id != null)
                                  .map((e) => (
                                    <option key={e.id} value={e.id}>
                                      {typeLabel(e.type)} ({e.id})
                                    </option>
                                  ))}
                              </select>
                            </label>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}
                  <label className="react-props-field react-props-check">
                    <input
                      type="checkbox"
                      checked={!!el.maLoop}
                      onChange={(e) => patch({ maLoop: e.target.checked })}
                    />
                    <span>{ru ? 'Зациклить' : 'Loop'}</span>
                  </label>
                </>
              )}
            </>
          )}
          <GSlider
            label={ru ? 'Прозрачность' : 'Opacity'}
            min={0}
            max={1}
            step={0.05}
            value={el.type === 'image' ? el.imgOpacity ?? el.elOpacity ?? 1 : el.elOpacity ?? 1}
            onChange={(v) =>
              el.type === 'image' ? patch({ imgOpacity: v, elOpacity: v }) : patch({ elOpacity: v })
            }
          />
        </div>
      ) : null}

      {el.type === 'markdown' ? (
        <div className="react-props-section" style={{ padding: 0 }}>
          <div className="react-props-hdr">Markdown</div>
          <div className="react-props-actions">
            <button type="button" className="react-props-btn" onClick={() => editorApi.editMarkdown(el.id)}>
              {ru ? 'Редактировать Markdown…' : 'Edit Markdown…'}
            </button>
          </div>
          <label className="react-props-field">
            <span>{ru ? 'Размер' : 'Size'}</span>
            <input
              type="number"
              min={8}
              max={72}
              value={el.mdFs != null ? el.mdFs : 16}
              onChange={(e) => patch({ mdFs: Math.max(8, Math.min(72, +e.target.value || 16)) })}
            />
          </label>
          <ColorField
            label={ru ? 'Цвет текста' : 'Text color'}
            value={el.mdColor || el.textColor || '#ffffff'}
            schemeRef={el.mdColorScheme || el.textColorScheme}
            onChange={(c, sr) => patch({ mdColor: c, textColor: c, mdColorScheme: sr, textColorScheme: sr })}
            onClear={() => patch({ mdColor: '#ffffff', textColor: '#ffffff', mdColorScheme: null })}
          />
          <ColorField
            label={ru ? 'Цвет фона' : 'Background'}
            value={el.textBg || ''}
            schemeRef={el.textBgScheme}
            onChange={(c, sr) => patch({ textBg: c, textBgScheme: sr })}
            onClear={() =>
              patch({
                textBg: '',
                textBgScheme: null,
                textBgGrad: false,
                textBgCol2: '',
                textBgCol2Scheme: null,
              })
            }
          />
          <GSlider
            label={ru ? 'Прозрачность фона' : 'Bg opacity'}
            min={0}
            max={1}
            step={0.05}
            value={el.textBgOp != null ? +el.textBgOp : 1}
            onChange={(v) => patch({ textBgOp: v })}
          />
          <GSlider
            label={ru ? 'Размытие фона' : 'Bg blur'}
            min={0}
            max={40}
            step={1}
            value={el.textBgBlur != null ? +el.textBgBlur : 0}
            onChange={(v) => patch({ textBgBlur: v })}
          />
          <div className="react-props-hdr" style={{ marginTop: 8 }}>
            {ru ? 'Скругление' : 'Corners'}
          </div>
          <div className="react-md-radius-grid">
            {[
              ['tl', '↖ TL'],
              ['tr', '↗ TR'],
              ['bl', '↙ BL'],
              ['br', '↘ BR'],
            ].map(([k, lab]) => (
              <label key={k}>
                <span>{lab}</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={el[`rx_${k}`] != null ? el[`rx_${k}`] : 0}
                  onChange={(e) =>
                    patch({ [`rx_${k}`]: Math.max(0, Math.min(999, +e.target.value || 0)) })
                  }
                />
              </label>
            ))}
          </div>
          <div className="react-props-hdr" style={{ marginTop: 8 }}>
            {ru ? 'Контур' : 'Border'}
          </div>
          <ColorField
            label={ru ? 'Цвет контура' : 'Border color'}
            value={el.textBorderColor || '#ffffff'}
            schemeRef={el.textBorderColorScheme}
            onChange={(c, sr) => patch({ textBorderColor: c, textBorderColorScheme: sr })}
            onClear={() => patch({ textBorderColor: '#ffffff', textBorderColorScheme: null })}
          />
          <label className="react-props-field">
            <span>{ru ? 'Толщина' : 'Width'}</span>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={el.textBorderW != null ? el.textBorderW : 0}
              onChange={(e) => patch({ textBorderW: Math.max(0, Math.min(20, +e.target.value || 0)) })}
            />
          </label>
        </div>
      ) : null}

      {el.type === 'code' ? (
        <div className="react-props-section" style={{ padding: 0 }}>
          <div className="react-props-hdr">{ru ? 'Блок кода' : 'Code Block'}</div>
          <div className="react-props-actions">
            <button type="button" className="react-props-btn" onClick={() => editorApi.editCode(el.id)}>
              {ru ? 'Редактировать код…' : 'Edit code…'}
            </button>
          </div>
          <label className="react-props-field">
            <span>{ru ? 'Язык' : 'Language'}</span>
            <select
              value={normalizeCodeLang(el.codeLang || 'js')}
              onChange={(e) => {
                const codeLang = normalizeCodeLang(e.target.value);
                const next = { ...el, codeLang };
                patch({ codeLang, ...ensureCodeHtml(next) });
              }}
            >
              {CODE_LANGS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label className="react-props-field">
            <span>{ru ? 'Тема' : 'Theme'}</span>
            <select
              value={el.codeTheme || 'dark'}
              onChange={(e) => {
                const codeTheme = e.target.value;
                const next = { ...el, codeTheme };
                patch({ codeTheme, ...ensureCodeHtml(next) });
              }}
            >
              {Object.keys(CODE_THEMES).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <label className="react-props-field">
            <span>{ru ? 'Размер шрифта' : 'Font size'}</span>
            <input
              type="number"
              min={10}
              max={28}
              step={1}
              value={el.codeFs != null ? el.codeFs : 14}
              onChange={(e) =>
                patch({ codeFs: Math.max(10, Math.min(28, +e.target.value || 14)) })
              }
            />
          </label>
          <label className="react-props-check">
            <input
              type="checkbox"
              checked={!!el.codeGlass}
              onChange={(e) => patch({ codeGlass: e.target.checked })}
            />
            {ru ? 'Стекло' : 'Glass'}
          </label>
        </div>
      ) : null}

      {el.type === 'htmlframe' ? (
        <div className="react-props-section" style={{ padding: 0 }}>
          <div className="react-props-hdr">{ru ? '🌐 HTML / Веб' : '🌐 HTML / Web'}</div>
          <button
            type="button"
            className="react-props-btn"
            style={{ width: '100%', marginBottom: 4, fontSize: 11 }}
            onClick={() => editorApi.openHtmlFrameModal()}
          >
            {ru ? '✏️ Редактировать источник' : '✏️ Edit source'}
          </button>
          <button
            type="button"
            className="react-props-btn"
            style={{ width: '100%', marginBottom: 6, fontSize: 11 }}
            onClick={() => editorApi.hfToggleLinkedCode()}
          >
            {editorApi.hfLinkedCodeFor(el.id)
              ? (ru ? '⛓ Скрыть код' : '⛓ Hide code')
              : (ru ? '⛓ Показать код' : '⛓ Show code')}
          </button>
          <div style={{ margin: '0 0 6px' }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{ru ? 'Шапка окна' : 'Window chrome'}</span>
            <div className="react-tog-row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{ru ? 'Показывать шапку' : 'Show chrome'}</span>
              <Toggle
                checked={el.hfChrome !== false}
                onChange={(v) => patch({ hfChrome: v })}
              />
            </div>
          </div>
        </div>
      ) : null}

      {el.type === 'svg' && !el._isDecor ? (
        <div className="react-props-section" style={{ padding: 0 }}>
          <div className="react-props-hdr">SVG</div>
          <div className="react-props-actions">
            <button type="button" className="react-props-btn" onClick={() => editorApi.openSvgModal()}>
              {ru ? 'Редактировать SVG…' : 'Edit SVG…'}
            </button>
          </div>
        </div>
      ) : null}

      {el.type === 'applet' ? (
        <div className="react-props-section">
          <div className="react-props-hdr">{appletSectionTitle(el, ru)}</div>
          {(el.appletId === 'generator' || el.appletId === 'counter') && (
            <div className="react-props-actions" style={{ marginBottom: 8 }}>
              <button type="button" className="react-props-btn" onClick={() => editorApi.appletStep(el.id)}>
                {el.appletId === 'generator'
                  ? ru
                    ? 'Сгенерировать'
                    : 'Generate'
                  : ru
                    ? 'Шаг +'
                    : 'Step +'}
              </button>
            </div>
          )}
          {el.appletId === 'notes' ? (
            <>
              <label className="react-props-field">
                <span>{ru ? 'Текст' : 'Text'}</span>
                <textarea
                  rows={4}
                  value={el.notesText || ''}
                  onChange={(e) => editorApi.patchApplet(el.id, { notesText: e.target.value })}
                />
              </label>
              <ColorField
                label={ru ? 'Фон' : 'Background'}
                value={el.notesBg || '#fef3c7'}
                onChange={(c) => editorApi.patchApplet(el.id, { notesBg: c })}
              />
              <p className="react-props-muted">
                {ru ? 'Выделите заметку на холсте, чтобы печатать прямо в ней.' : 'Select the note on canvas to type inside it.'}
              </p>
            </>
          ) : null}
          {el.appletId === 'flip' || isFlipAppletId(el.appletId) ? (
            (() => {
              const theme = getTheme(appliedThemeIdx);
              const colors = resolveFlipColors(el, theme);
              const back = el.flipFace === 'back';
              const sideText = back ? el.flipBackText || '' : el.flipFrontText || '';
              const sideFont = back ? el.flipBackFont || '' : el.flipFrontFont || '';
              const sideFs = back ? el.flipBackFs ?? 20 : el.flipFrontFs ?? 20;
              const sideImg = back ? el.flipBackImg : el.flipFrontImg;
              const patchSide = (patch) => {
                if (back) {
                  const mapped = {};
                  if (patch.text != null) mapped.flipBackText = patch.text;
                  if (patch.font != null) mapped.flipBackFont = patch.font;
                  if (patch.fs != null) mapped.flipBackFs = patch.fs;
                  editorApi.patchApplet(el.id, mapped);
                } else {
                  const mapped = {};
                  if (patch.text != null) mapped.flipFrontText = patch.text;
                  if (patch.font != null) mapped.flipFrontFont = patch.font;
                  if (patch.fs != null) mapped.flipFrontFs = patch.fs;
                  editorApi.patchApplet(el.id, mapped);
                }
              };
              return (
                <>
                  <label className="react-sntog" style={{ margin: '2px 0 8px' }}>
                    <Toggle
                      checked={back}
                      onChange={(on) =>
                        editorApi.setFlipFace(el.id, on ? 'back' : 'front')
                      }
                    />
                    <span>{ru ? 'Оборотная сторона' : 'Back side'}</span>
                  </label>
                  <label className="react-props-field">
                    <span>{ru ? 'Текст' : 'Text'}</span>
                    <textarea
                      rows={3}
                      placeholder={ru ? 'Текст на стороне…' : 'Side text…'}
                      value={sideText}
                      onChange={(e) => patchSide({ text: e.target.value })}
                    />
                  </label>
                  <div className="react-props-field">
                    <span>{ru ? 'Изображение' : 'Image'}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div
                        className="react-flip-img-prev"
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: sideImg
                            ? `center/contain no-repeat url(${sideImg})`
                            : 'var(--surface2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          color: 'var(--muted)',
                          flexShrink: 0,
                        }}
                      >
                        {!sideImg ? (ru ? 'нет' : 'none') : null}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button
                          type="button"
                          className="react-props-btn"
                          onClick={() => editorApi.pickFlipImage(el.id, back ? 'back' : 'front')}
                        >
                          {ru ? 'Выбрать…' : 'Select…'}
                        </button>
                        <button
                          type="button"
                          className="react-props-btn"
                          disabled={!sideImg}
                          onClick={() => editorApi.clearFlipImage(el.id, back ? 'back' : 'front')}
                        >
                          {ru ? 'Убрать' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <label className="react-props-field">
                    <span>{ru ? 'Шрифт' : 'Font'}</span>
                    <select
                      value={sideFont}
                      onChange={(e) => patchSide({ font: flipFontToken(e.target.value) })}
                    >
                      <option value="">{ru ? '— по умолчанию —' : '— default —'}</option>
                      {FONT_FAMILIES.filter((f) => f.id).map((f) => {
                        const tok = flipFontToken(f.id);
                        return (
                          <option key={f.id} value={tok} style={{ fontFamily: f.id }}>
                            {f.label}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <GSlider
                    label={ru ? 'пт' : 'pt'}
                    min={8}
                    max={120}
                    step={1}
                    value={sideFs}
                    onChange={(v) => patchSide({ fs: Math.max(8, Math.min(120, v)) })}
                  />
                  <ColorField
                    label={ru ? 'Цвет текста' : 'Text color'}
                    value={el.genColor || colors.fg}
                    schemeRef={el.genColorScheme}
                    allowClear={false}
                    onChange={(c, sr) =>
                      editorApi.patchApplet(el.id, { genColor: c, genColorScheme: sr || null })
                    }
                  />
                  <ColorField
                    label={ru ? 'Цвет фона' : 'Background'}
                    value={el.genBg || colors.bg}
                    schemeRef={el.genBgScheme}
                    allowClear
                    clearGlyph="x"
                    clearTitle={ru ? 'Вернуть градиент' : 'Restore gradient'}
                    onChange={(c) =>
                      editorApi.patchApplet(el.id, { genBg: c, genBgScheme: null })
                    }
                    onClear={() =>
                      editorApi.patchApplet(el.id, {
                        genBg: '',
                        genBgScheme: { col: 7, row: 7 },
                      })
                    }
                  />
                  <GSlider
                    label={ru ? 'Прозрачность фона' : 'Background opacity'}
                    min={0}
                    max={1}
                    step={0.02}
                    value={el.genBgOp != null ? +el.genBgOp : 0.92}
                    fadeTrack
                    onChange={(v) => editorApi.patchApplet(el.id, { genBgOp: v })}
                  />
                </>
              );
            })()
          ) : null}
          {el.appletId === 'periodic' ? (
            <>
              <div className="react-pte-el-name">
                {(() => {
                  const pte = pteBySymbol(el.pteSymbol) || pteBySymbol('Fe');
                  return pte ? `${pte.ru} (${pte.s})` : '—';
                })()}
              </div>
              <div className="react-props-actions" style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  className="react-props-btn"
                  style={{ width: '100%' }}
                  onClick={() => editorApi.reselectPeriodicElement(el.id)}
                >
                  {ru ? 'Сменить элемент' : 'Change element'}
                </button>
              </div>
              <label className="react-sntog" style={{ margin: '2px 0 8px' }}>
                <Toggle
                  checked={!!el.pteIcon}
                  onChange={(on) => editorApi.patchApplet(el.id, { pteIcon: on })}
                />
                <span>{el.pteIcon ? (ru ? 'Иконка' : 'Icon') : ru ? 'Карточка' : 'Card'}</span>
              </label>
              {(() => {
                const theme = getTheme(appliedThemeIdx);
                const colors = resolvePteColors(el, theme);
                return (
                  <>
                    <ColorField
                      label={ru ? 'Цвет текста' : 'Text color'}
                      value={el.genColor || colors.fg}
                      schemeRef={el.genColorScheme}
                      allowClear={false}
                      onChange={(c, sr) =>
                        editorApi.patchApplet(el.id, { genColor: c, genColorScheme: sr || null })
                      }
                    />
                    <ColorField
                      label={ru ? 'Цвет фона' : 'Background'}
                      value={el.genBg || colors.bg}
                      schemeRef={el.genBgScheme}
                      allowClear
                      clearGlyph="x"
                      clearTitle={ru ? 'Вернуть градиент' : 'Restore gradient'}
                      onChange={(c) =>
                        editorApi.patchApplet(el.id, { genBg: c, genBgScheme: null })
                      }
                      onClear={() => editorApi.clearPeriodicBg(el.id)}
                    />
                  </>
                );
              })()}
              <GSlider
                label={ru ? 'Прозрачность фона' : 'Background opacity'}
                min={0}
                max={1}
                step={0.02}
                value={el.genBgOp != null ? +el.genBgOp : 0.92}
                fadeTrack
                onChange={(v) => editorApi.patchApplet(el.id, { genBgOp: v })}
              />
              <GSlider
                label={ru ? 'Размытие фона' : 'Background blur'}
                min={0}
                max={40}
                step={1}
                value={el.genBgBlur != null ? +el.genBgBlur : 0}
                onChange={(v) => editorApi.patchApplet(el.id, { genBgBlur: v })}
              />
            </>
          ) : null}
          {el.appletId === 'timer' ? (
            <>
              <div className="react-props-grid">
                <label className="react-props-field react-props-field-compact">
                  <span>{ru ? 'Мин' : 'Min'}</span>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={el.tmMin ?? 5}
                    onChange={(e) => editorApi.patchApplet(el.id, { tmMin: Math.max(0, +e.target.value || 0) })}
                  />
                </label>
                <label className="react-props-field react-props-field-compact">
                  <span>{ru ? 'Сек' : 'Sec'}</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={el.tmSec ?? 0}
                    onChange={(e) => editorApi.patchApplet(el.id, { tmSec: Math.max(0, Math.min(59, +e.target.value || 0)) })}
                  />
                </label>
              </div>
              <AppletOnEndFields el={el} slides={slides} slide={slides[cur]} ru={ru} kind="timer" />
            </>
          ) : null}
          {el.appletId === 'generator' ? (
            <>
              <label className="react-props-field">
                <span>{ru ? 'Режим' : 'Mode'}</span>
                <select
                  value={el.genMode || 'number'}
                  onChange={(e) => editorApi.patchApplet(el.id, { genMode: e.target.value })}
                >
                  <option value="number">{ru ? 'Число' : 'Number'}</option>
                  <option value="text">{ru ? 'Список' : 'List'}</option>
                </select>
              </label>
              {(el.genMode || 'number') === 'number' ? (
                <div className="react-props-grid">
                  <label className="react-props-field react-props-field-compact">
                    <span>Min</span>
                    <input
                      type="number"
                      value={el.genMin ?? 1}
                      onChange={(e) => editorApi.patchApplet(el.id, { genMin: +e.target.value })}
                    />
                  </label>
                  <label className="react-props-field react-props-field-compact">
                    <span>Max</span>
                    <input
                      type="number"
                      value={el.genMax ?? 100}
                      onChange={(e) => editorApi.patchApplet(el.id, { genMax: +e.target.value })}
                    />
                  </label>
                  <label className="react-props-field react-props-field-compact">
                    <span>Step</span>
                    <input
                      type="number"
                      value={el.genStep ?? 1}
                      onChange={(e) => editorApi.patchApplet(el.id, { genStep: +e.target.value || 1 })}
                    />
                  </label>
                </div>
              ) : (
                <label className="react-props-field">
                  <span>{ru ? 'Строки (по одной)' : 'Lines (one per row)'}</span>
                  <textarea
                    rows={4}
                    value={el.genLines || ''}
                    onChange={(e) => editorApi.patchApplet(el.id, { genLines: e.target.value })}
                  />
                </label>
              )}
            </>
          ) : null}
          {el.appletId === 'counter' ? (
            <>
              <AppletOnEndFields el={el} slides={slides} slide={slides[cur]} ru={ru} kind="counter" />
              <div className="react-props-grid" style={{ marginBottom: 6 }}>
                <GSlider
                  label={ru ? 'Начало' : 'Start'}
                  min={-9999}
                  max={9999}
                  step={1}
                  value={el.cntStart != null && Number.isFinite(+el.cntStart) ? +el.cntStart : 0}
                  onChange={(v) =>
                    editorApi.patchApplet(el.id, {
                      cntStart: Number.isFinite(+v) ? +v : 0,
                    })
                  }
                />
                <GSlider
                  label={ru ? 'Шаг' : 'Step'}
                  min={-999}
                  max={999}
                  step={1}
                  value={el.genStep != null && Number.isFinite(+el.genStep) ? +el.genStep : 1}
                  onChange={(v) =>
                    editorApi.patchApplet(el.id, {
                      genStep: Number.isFinite(+v) ? +v : 1,
                    })
                  }
                />
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                <label className="react-props-field" style={{ flex: 1, margin: 0 }}>
                  <span>{ru ? 'Цель' : 'Goal'}</span>
                  <input
                    type="number"
                    value={el.cntGoal === '' || el.cntGoal == null ? '' : el.cntGoal}
                    placeholder="—"
                    onChange={(e) =>
                      editorApi.patchApplet(el.id, {
                        cntGoal: e.target.value === '' ? '' : +e.target.value,
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="react-props-btn"
                  title={ru ? 'Очистить' : 'Clear'}
                  style={{ padding: '2px 6px', fontSize: 12, lineHeight: 1, marginTop: 14 }}
                  onClick={() => editorApi.patchApplet(el.id, { cntGoal: '' })}
                >
                  ✕
                </button>
              </div>
              <label className="react-props-field">
                <span title={ru ? 'Счётчики с одинаковым ID делят настройки и продолжают счёт при показе' : 'Same ID shares settings and keeps counting across slides in presentation'}>
                  {ru ? 'ID (связать со счётчиком на др. слайде)' : 'ID (link across slides)'}
                </span>
                <input
                  type="text"
                  value={el.cntGroupId || ''}
                  placeholder={ru ? 'напр. score' : 'e.g. score'}
                  onChange={(e) => editorApi.patchApplet(el.id, { cntGroupId: e.target.value })}
                />
              </label>
            </>
          ) : null}
          {el.appletId === 'clock' ? (
            <>
              <label className="react-sntog" style={{ margin: '2px 0 6px' }}>
                <Toggle
                  checked={el.clockShowTime !== false}
                  onChange={(on) => {
                    if (!on && el.clockShowDate === false) return;
                    editorApi.patchApplet(el.id, { clockShowTime: on });
                  }}
                />
                <span>{ru ? 'Время' : 'Time'}</span>
              </label>
              <label className="react-sntog" style={{ margin: '2px 0 8px' }}>
                <Toggle
                  checked={el.clockShowDate !== false}
                  onChange={(on) => {
                    if (!on && el.clockShowTime === false) return;
                    editorApi.patchApplet(el.id, { clockShowDate: on });
                  }}
                />
                <span>{ru ? 'Дата' : 'Date'}</span>
              </label>
              <GenAppletVisualProps el={el} ru={ru} defFs={48} />
            </>
          ) : null}
          {['timer', 'generator', 'counter'].includes(el.appletId) ? (
            <GenAppletVisualProps
              el={el}
              ru={ru}
              defFs={el.appletId === 'timer' ? 72 : 64}
            />
          ) : null}
          <p className="react-props-muted">
            {el.appletId === 'generator' || el.appletId === 'counter'
              ? ru
                ? 'На холсте: двойной клик. В превью — клик.'
                : 'Canvas: double-click. Preview: click.'
              : el.appletId === 'flip'
                ? ru
                  ? 'Двойной клик на холсте / клик в превью.'
                  : 'Double-click on canvas / click in preview.'
                : el.appletId === 'timer'
                ? ru
                  ? 'В превью и экспорте таймер стартует сам.'
                  : 'Timer auto-starts in preview and export.'
                : null}
          </p>
        </div>
      ) : null}

      {el.type === 'pagenum' ? (
        <div className="react-props-section">
          <div className="react-props-hdr">{ru ? 'Номер слайда' : 'Page number'}</div>
          <label className="react-props-field">
            <span>{ru ? 'Стиль' : 'Style'}</span>
            <select
              value={el.pnStyle || 'simple'}
              onChange={(e) => editorApi.setPageNumbers({ style: e.target.value })}
            >
              {PN_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {ru ? s.labelRu : s.labelEn}
                </option>
              ))}
            </select>
          </label>
          <label className="react-props-check">
            <input
              type="checkbox"
              checked={!!el.pnShowTotal}
              onChange={(e) => editorApi.setPageNumbers({ showTotal: e.target.checked })}
            />
            {ru ? 'Показывать всего' : 'Show total'}
          </label>
          <ColorField
            label={ru ? 'Акцент' : 'Accent'}
            value={el.pnColor || '#3b82f6'}
            onChange={(c) => editorApi.setPageNumbers({ color: c, customColor: true })}
          />
          <ColorField
            label={ru ? 'Текст' : 'Text'}
            value={el.pnTextColor || '#ffffff'}
            onChange={(c) => editorApi.setPageNumbers({ textColor: c })}
          />
          <label className="react-props-field react-props-field-compact">
            <span>{ru ? 'Кегль' : 'Size'}</span>
            <input
              type="number"
              min="10"
              max="48"
              value={el.pnFontSize ?? 14}
              onChange={(e) =>
                editorApi.setPageNumbers({ fontSize: Math.max(10, Math.min(48, +e.target.value || 14)) })
              }
            />
          </label>
          <GSlider
            label={ru ? 'Прозрачность' : 'Opacity'}
            min={0.15}
            max={1}
            step={0.05}
            value={el.elOpacity ?? 1}
            onChange={(v) => editorApi.setPageNumbers({ opacity: v })}
          />
          <p className="react-props-muted">
            {ru
              ? 'Перетащите бейдж — позиция сохранится на всех слайдах. Сброс позиции — в свойствах слайда.'
              : 'Drag the badge to set position for all slides. Reset position in slide props.'}
          </p>
        </div>
      ) : null}

      {el.type === 'inkhost' ? (
        <div className="react-props-section">
          <div className="react-props-hdr">{ru ? 'Рисование' : 'Drawing'}</div>
          <p className="react-props-muted">
            {ru
              ? 'Штрихи редактируются на вкладке «Рисование». Здесь — положение хоста.'
              : 'Edit strokes on the Drawing tab. Position the host here.'}
          </p>
          <GSlider
            label={ru ? 'Прозрачность' : 'Opacity'}
            min={0}
            max={1}
            step={0.05}
            value={el.elOpacity ?? 1}
            onChange={(v) => patch({ elOpacity: v })}
          />
        </div>
      ) : null}

      {el.type === 'model3d' ? (
        <div className="react-props-section">
          <div className="react-props-hdr">{ru ? 'OBJ · 3D' : 'OBJ · 3D'}</div>
          <p className="react-props-muted" style={{ marginBottom: 8 }}>
            {el.objName || (ru ? 'файл не выбран' : 'no file')}
          </p>
          <div className="react-props-actions" style={{ marginBottom: 8 }}>
            <button type="button" className="react-props-btn" onClick={() => editorApi.replaceModel3dFile(el.id)}>
              {ru ? 'Заменить OBJ…' : 'Replace OBJ…'}
            </button>
          </div>
          <ColorField
            label={ru ? 'Цвет' : 'Color'}
            value={el.objColor || '#6366f1'}
            onChange={(c) => patch({ objColor: c })}
          />
          <ColorField
            label={ru ? 'Фон' : 'Background'}
            value={el.objBg || '#0f172a'}
            onChange={(c) => patch({ objBg: c, objBgCleared: false })}
          />
          <label className="react-props-check">
            <input
              type="checkbox"
              checked={!!el.objBgCleared}
              onChange={(e) => patch({ objBgCleared: e.target.checked })}
            />
            {ru ? 'Прозрачный фон' : 'Clear background'}
          </label>
          <label className="react-props-check">
            <input
              type="checkbox"
              checked={el.objAutoRot !== false}
              onChange={(e) => patch({ objAutoRot: e.target.checked })}
            />
            {ru ? 'Автоповорот' : 'Auto-rotate'}
          </label>
          <div className="react-props-grid">
            <label className="react-props-field react-props-field-compact">
              <span>Rot X</span>
              <input
                type="number"
                value={el.objRotX ?? -15}
                onChange={(e) => patch({ objRotX: +e.target.value || 0 })}
              />
            </label>
            <label className="react-props-field react-props-field-compact">
              <span>Rot Y</span>
              <input
                type="number"
                value={el.objRotY ?? 25}
                onChange={(e) => patch({ objRotY: +e.target.value || 0 })}
              />
            </label>
          </div>
          <GSlider
            label={ru ? 'Скорость' : 'Speed'}
            min={0}
            max={3}
            step={0.1}
            value={el.objRotSpeed ?? 1}
            onChange={(v) => patch({ objRotSpeed: v })}
          />
        </div>
      ) : null}

      {!el._isDecor && el.type !== 'inkhost' && el.type !== 'lineangle' && el.type !== 'pagenum' ? (
        <div className="react-props-section">
          <div className="react-props-hdr">{ru ? '🖱 Эффект при наведении' : '🖱 Hover effect'}</div>
          <label className="react-props-check">
            <input
              type="checkbox"
              checked={!!(el.hoverFx && el.hoverFx.enabled)}
              onChange={(e) => {
                const on = e.target.checked;
                if (!on) {
                  patch({ hoverFx: { ...normalizeHoverFx(el.hoverFx), enabled: false } });
                  return;
                }
                patch({
                  hoverFx: withHoverPreset(el, el.hoverFx || defaultHoverFx(), el.hoverFx?.preset || 'lighter'),
                });
              }}
            />
            {ru ? 'Эффект при наведении' : 'Hover effect'}
          </label>
          {el.hoverFx?.enabled ? (
            <>
              <label className="react-props-field">
                <span>{ru ? 'Эффект' : 'Effect'}</span>
                <select
                  value={el.hoverFx.preset || 'lighter'}
                  onChange={(e) =>
                    patch({ hoverFx: withHoverPreset(el, el.hoverFx, e.target.value) })
                  }
                >
                  {presetsForEl(el, ru).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="react-props-field react-props-field-compact">
                <span>{ru ? 'Длительность, с' : 'Duration, s'}</span>
                <input
                  type="number"
                  min="0.05"
                  max="2"
                  step="0.05"
                  value={el.hoverFx.dur ?? 0.3}
                  onChange={(e) =>
                    patch({
                      hoverFx: {
                        ...normalizeHoverFx(el.hoverFx),
                        dur: Math.max(0.05, Math.min(2, +e.target.value || 0.3)),
                      },
                    })
                  }
                />
              </label>
              {el.type === 'text' && !isFilterOnlyHoverPreset(el.hoverFx.preset) ? (
                <>
                  <ColorField
                    label={ru ? 'Цвет текста (hover)' : 'Text color (hover)'}
                    value={el.hoverFx.hover?.textColor || el.textColor || '#ffffff'}
                    onChange={(c) => patch({ hoverFx: patchHoverFxField(el.hoverFx, 'textColor', c) })}
                  />
                  <ColorField
                    label={ru ? 'Фон (hover)' : 'Background (hover)'}
                    value={el.hoverFx.hover?.textBg || el.textBg || '#000000'}
                    onChange={(c) => patch({ hoverFx: patchHoverFxField(el.hoverFx, 'textBg', c) })}
                  />
                  <div className="react-props-grid">
                    <label className="react-props-field react-props-field-compact">
                      <span>{ru ? 'Рамка, px' : 'Border, px'}</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={el.hoverFx.hover?.textBorderW ?? 0}
                        onChange={(e) =>
                          patch({
                            hoverFx: patchHoverFxField(
                              el.hoverFx,
                              'textBorderW',
                              Math.max(0, Math.min(20, +e.target.value || 0))
                            ),
                          })
                        }
                      />
                    </label>
                    {+(el.hoverFx.hover?.textBorderW || 0) > 0 ? (
                      <ColorField
                        label={ru ? 'Цвет рамки' : 'Border color'}
                        value={el.hoverFx.hover?.textBorderColor || '#ffffff'}
                        onChange={(c) =>
                          patch({ hoverFx: patchHoverFxField(el.hoverFx, 'textBorderColor', c) })
                        }
                      />
                    ) : null}
                  </div>
                </>
              ) : null}
              <p className="react-props-muted">
                {ru
                  ? 'Работает на холсте, в превью и HTML-экспорте.'
                  : 'Works on canvas, preview, and HTML export.'}
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="react-props-field">
        <span>{ru ? 'Стиль' : 'Style'}</span>
        <div className="react-props-row react-props-seg">
          <button type="button" className="react-props-btn" onClick={() => editorApi.copyStyle()} title="Ctrl+Shift+C">
            {ru ? 'Копировать' : 'Copy'}
          </button>
          <button type="button" className="react-props-btn" onClick={() => editorApi.pasteStyle()} title="Ctrl+Shift+V">
            {ru ? 'Вставить' : 'Paste'}
          </button>
          <button type="button" className="react-props-btn" onClick={() => editorApi.toggleStylePaint()} title={ru ? 'Кисть стиля' : 'Style paint'}>
            {ru ? 'Кисть' : 'Paint'}
          </button>
        </div>
      </div>

      <div className="react-props-hdr" style={{ marginTop: 8 }}>{ru ? 'Ссылка' : 'Link'}</div>
      <div className="react-props-field">
        <div className="react-props-row">
          <button type="button" className="react-props-btn" onClick={() => editorApi.openLinkModal()}>
            {el.link ? (ru ? 'Изменить…' : 'Edit…') : ru ? 'Добавить…' : 'Add…'}
          </button>
          {el.link ? (
            <button type="button" className="react-props-btn react-props-btn-ghost" onClick={() => editorApi.removeLink()}>
              {ru ? 'Убрать' : 'Remove'}
            </button>
          ) : null}
        </div>
        {el.link ? <p className="react-props-muted" style={{ marginTop: 4, wordBreak: 'break-all' }}>{el.link}</p> : null}
      </div>

      <div className="react-props-actions">
        <button type="button" className="react-props-btn" disabled={!canUndo} onClick={() => editorApi.undo()}>
          {ru ? 'Отменить' : 'Undo'}
        </button>
        <button type="button" className="react-props-btn" disabled={!canRedo} onClick={() => editorApi.redo()}>
          {ru ? 'Повторить' : 'Redo'}
        </button>
        <button type="button" className="react-props-btn react-props-btn-warn" onClick={() => editorApi.deleteSelected()}>
          {ru ? 'Удалить' : 'Delete'}
        </button>
      </div>
    </section>
  );
}

import React, { Suspense, lazy } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import { canDrawAngleBetweenSelected } from '../../editor/lineAngle.js';
import ColorField from '../ui/ColorField.jsx';
import GSlider from '../ui/GSlider.jsx';
import { FONT_FAMILIES, elementFontFamily, parseCsNumber } from '../../editor/fonts.js';
import { LEGO_COLOR_FALLBACK } from '../../editor/lego.js';
import {
  loadPropsPanel,
  loadSlidePropsPanel,
  loadDrawingPanel,
  loadAnimPanel,
  loadObjectsPanel,
} from './lazyPanels.js';

const ElementPropsPanel = lazy(loadPropsPanel);
const SlidePropsPanel = lazy(loadSlidePropsPanel);
const DrawingPanel = lazy(loadDrawingPanel);
const AnimPanel = lazy(loadAnimPanel);
const ObjectsPanel = lazy(loadObjectsPanel);

function PanelFallback() {
  return <p className="react-props-muted" style={{ padding: 12 }}>…</p>;
}

function wrap(node) {
  return <Suspense fallback={<PanelFallback />}>{node}</Suspense>;
}

/** v7.1: draw props for brush/neon/marker/fill, or when ink is selected (cursor). */
function isDrawPropsTool(tool) {
  return tool === 'brush' || tool === 'neon' || tool === 'marker' || tool === 'fill';
}

/** Shared "N objects selected" panel for the multi-select case, with a "Draw angle" button
 *  when the selection is exactly two joined line segments — this used to live only inside
 *  PropsPanel.jsx's own (differently-triggered, and for this case unreachable) multi-select
 *  branch, so it never actually rendered here where the real multi-select panel lives. */
function isTextLike(el) {
  return el && (el.type === 'text' || el.type === 'markdown' || el.type === 'code');
}

function liveSelected(selected) {
  return (selected || []).filter((e) => e && !e._isDecor);
}

function allLegoSelected(selected) {
  const live = liveSelected(selected);
  return live.length > 0 && live.every((e) => e.type === 'lego');
}

function allIconSelected(selected) {
  const live = liveSelected(selected);
  return live.length > 0 && live.every((e) => e.type === 'icon');
}

function multiFillSample(selected) {
  const live = liveSelected(selected);
  if (allLegoSelected(live)) {
    const e = live[0];
    return { color: e.legoColor || LEGO_COLOR_FALLBACK, scheme: e.legoColorScheme || null };
  }
  if (allIconSelected(live)) {
    const e = live[0];
    return { color: e.iconColor || e.textColor || '#6366f1', scheme: e.iconColorScheme || null };
  }
  for (const e of live) {
    if (e.type === 'icon' && (e.iconColor || e.textColor)) {
      return { color: e.iconColor || e.textColor, scheme: e.iconColorScheme || null };
    }
    if (e.type === 'lego' && e.legoColor) {
      return { color: e.legoColor, scheme: e.legoColorScheme || null };
    }
    if (e.type === 'formula' && (e.formulaColor || e.textColor)) {
      return { color: e.formulaColor || e.textColor, scheme: e.formulaColorScheme || e.textColorScheme || null };
    }
    if (e.type === 'graph' && e.graphColor) {
      return { color: e.graphColor, scheme: e.graphColorScheme || null };
    }
    if (isTextLike(e) && (e.textColor || e.textColorScheme)) {
      return { color: e.textColor || '', scheme: e.textColorScheme || null };
    }
    if (e.fill && e.fill !== 'none' && e.fill !== 'transparent') {
      return { color: e.fill, scheme: e.fillScheme || null };
    }
    if (e.textColor || e.textColorScheme) {
      return { color: e.textColor || '', scheme: e.textColorScheme || null };
    }
  }
  return { color: '#3b82f6', scheme: null };
}

function MultiSelectProps({ multi, multiSel, slideMode = false, slideCount = 0 }) {
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const slideMultiSel = usePresentationStore((s) => s.slideMultiSel);
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  let selected = [];
  if (slideMode) {
    const idxs =
      slideMultiSel?.length > 1 ? slideMultiSel : slideCount > 1 ? slideMultiSel : [];
    idxs.forEach((si) => {
      (slides[si]?.els || []).forEach((e) => {
        if (e && !e._isDecor) selected.push(e);
      });
    });
  } else {
    const els = slides[cur]?.els || [];
    const ids = (multiSel || []).map(String);
    selected = els.filter((e) => e && ids.includes(String(e.id)));
  }
  const elsOnCur = slides[cur]?.els || [];
  const canDrawAngle =
    !slideMode && multi === 2 && canDrawAngleBetweenSelected(elsOnCur, (multiSel || []).map(String));
  const fillSample = multiFillSample(selected);
  const legoOnly = allLegoSelected(selected);
  const iconOnly = allIconSelected(selected);
  const fontSample = elementFontFamily(selected.find((e) => isTextLike(e) || e.cs) || selected[0] || {}, '');
  const sizeSampleEl =
    selected.find((e) => isTextLike(e) || e.type === 'shape' || e.type === 'formula') || null;
  const sizeSample = sizeSampleEl
    ? Math.round(
        parseCsNumber(
          sizeSampleEl.type === 'shape' ? sizeSampleEl.shapeTextCss || '' : sizeSampleEl.cs || '',
          'font-size'
        ) || 24
      )
    : 24;
  const opSample = selected.reduce((acc, e) => Math.min(acc, e.elOpacity != null ? +e.elOpacity : 1), 1);
  const nSlides = slideCount || (slideMultiSel?.length > 1 ? slideMultiSel.length : 0);
  return (
    <section className="react-props-section">
      <div className="react-props-hdr">{ru ? 'ВЫДЕЛЕНИЕ' : 'SELECTION'}</div>
      <p className="react-props-muted">
        {slideMode
          ? ru
            ? `${nSlides} слайд(ов) · ${selected.length} объект(ов)`
            : `${nSlides} slides · ${selected.length} objects`
          : canDrawAngle
            ? ru
              ? 'Выбраны два связанных отрезка'
              : 'Two joined segments selected'
            : ru
              ? `${multi} объект(ов)`
              : `${multi} objects`}
      </p>
      <ColorField
        label={
          legoOnly
            ? ru
              ? 'Цвет блока'
              : 'Brick color'
            : iconOnly
              ? ru
                ? 'Цвет значка'
                : 'Icon color'
              : ru
                ? 'Заливка / цвет'
                : 'Fill / color'
        }
        value={fillSample.color}
        schemeRef={fillSample.scheme}
        onChange={(c, sr) => editorApi.patchMultiFill(c, sr)}
      />
      <label className="react-props-field">
        <span>{ru ? 'Шрифт' : 'Font'}</span>
        <select
          value={fontSample}
          onChange={(e) => editorApi.patchMultiFont(e.target.value)}
        >
          <option value="">{ru ? '— не менять —' : '— keep —'}</option>
          {FONT_FAMILIES.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <GSlider
        label={ru ? 'Кегль' : 'Size'}
        min={8}
        max={200}
        step={1}
        value={Number.isFinite(sizeSample) ? sizeSample : 24}
        onChange={(v) => editorApi.patchMultiFontSize(v)}
      />
      <GSlider
        label={ru ? 'Прозрачность' : 'Opacity'}
        min={0}
        max={1}
        step={0.05}
        fadeTrack
        value={Number.isFinite(opSample) ? opSample : 1}
        onChange={(v) => editorApi.patchMultiOpacity(v)}
      />
      {canDrawAngle ? (
        <button
          type="button"
          className="react-props-btn"
          style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '8px 10px', marginBottom: 8 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editorApi.addLineAngleBetweenSelected()}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19h16" />
            <path d="M4 19L16 5" />
            <path d="M11 19A7 7 0 0 0 8.6 13.7" />
          </svg>
          {ru ? 'Нарисовать угол' : 'Draw angle'}
        </button>
      ) : null}
      <div className="react-props-actions">
        <button
          type="button"
          className="react-props-btn"
          title={ru ? 'Очистить форматирование' : 'Clear formatting'}
          onClick={() => editorApi.resetFormattingSelected()}
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }}>
            <text x="1" y="12" fontFamily="serif" fontSize="12" fontWeight="700" fill="currentColor">
              A
            </text>
            <line x1="10" y1="4" x2="15" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="15" y1="4" x2="10" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {ru ? 'Очистить форматирование' : 'Clear formatting'}
        </button>
        <button
          type="button"
          className="react-props-btn"
          onClick={() => (slideMode ? editorApi.dupSlidesSelected() : editorApi.dupSelected())}
        >
          {ru ? 'Дублировать' : 'Duplicate'}
        </button>
        <button
          type="button"
          className="react-props-btn react-props-btn-warn"
          onClick={() =>
            slideMode
              ? editorApi.delSlides(usePresentationStore.getState().slideMultiSel)
              : editorApi.deleteSelected()
          }
        >
          {ru ? 'Удалить' : 'Delete'}
        </button>
      </div>
    </section>
  );
}

function DefaultProps({ hasElement, hasConn, multi, multiSel, guidesEditMode, slideMultiCount }) {
  if (multi > 1) {
    return <MultiSelectProps multi={multi} multiSel={multiSel} />;
  }
  if (hasElement || hasConn) return wrap(<ElementPropsPanel />);
  // Guides mode with nothing selected: ElementPropsPanel hosts GuidesPropsPanel.
  // Without this, SlidePropsPanel mounts and the guides UI never appears.
  if (guidesEditMode) return wrap(<ElementPropsPanel />);
  if (slideMultiCount > 1) {
    return <MultiSelectProps multi={0} multiSel={[]} slideMode slideCount={slideMultiCount} />;
  }
  return wrap(<SlidePropsPanel />);
}

export default function RightPanel() {
  const activeTab = useUiStore((s) => s.activeTab);
  const guidesEditMode = useUiStore((s) => s.guidesEditMode);
  const transformEditMode = useUiStore((s) => s.transformEditMode);
  const drawTool = usePresentationStore((s) => s.drawTool);
  const selId = useSelectionStore((s) => s.selId);
  const multiSel = useSelectionStore((s) => s.multiSel);
  const selInkIds = useSelectionStore((s) => s.selInkIds);
  const selConnId = useSelectionStore((s) => s.selConnId);
  const cur = usePresentationStore((s) => s.cur);
  const slides = usePresentationStore((s) => s.slides);
  const slideMultiSel = usePresentationStore((s) => s.slideMultiSel);
  const els = slides[cur]?.els || [];
  const liveMulti = (multiSel || []).filter((id) =>
    els.some((e) => e && String(e.id) === String(id))
  );
  const multi = liveMulti.length;
  const slideMultiCount = slideMultiSel?.length > 1 ? slideMultiSel.length : 0;
  const selOnSlide = !!(selId && els.some((e) => e && String(e.id) === String(selId)));
  const hasElement = !!(selOnSlide || multi > 0);
  const hasConn = !!selConnId;
  const hasInk = (selInkIds?.length || 0) > 0;
  const showDrawProps =
    isDrawPropsTool(drawTool) || (hasInk && (!drawTool || drawTool === 'cursor'));

  // Transform capture: show object props (with Save state) even if Anim tab is active.
  if (transformEditMode) {
    return (
      <aside className="react-right-panel" aria-label="Трансформация" {...versionAttr('RightPanel')}>
        {wrap(<ElementPropsPanel />)}
      </aside>
    );
  }

  // The Animation tab always wins over the drawing-tool properties panel — previously,
  // whenever ink was selected, the panel above rendered regardless of which tab was active,
  // so switching to "Animation" with a drawing selected still showed drawing properties
  // instead of the animation panel.
  if (activeTab === 'anim') {
    return (
      <aside className="react-right-panel" {...versionAttr('RightPanel')}>
        {wrap(<AnimPanel />)}
      </aside>
    );
  }

  if (showDrawProps) {
    return (
      <aside className="react-right-panel" aria-label="Рисование" {...versionAttr('RightPanel')}>
        {wrap(<DrawingPanel />)}
      </aside>
    );
  }

  if (activeTab === 'objects') {
    return (
      <aside className="react-right-panel" aria-label="Объекты" {...versionAttr('RightPanel')}>
        {wrap(
          <>
            <ObjectsPanel />
            {multi > 1 ? (
              <MultiSelectProps multi={multi} multiSel={liveMulti} />
            ) : hasElement || hasConn ? (
              <ElementPropsPanel />
            ) : guidesEditMode ? (
              <ElementPropsPanel />
            ) : slideMultiCount > 1 ? (
              <MultiSelectProps multi={0} multiSel={[]} slideMode slideCount={slideMultiCount} />
            ) : (
              <SlidePropsPanel />
            )}
          </>
        )}
      </aside>
    );
  }

  // home / insert / design / slideshow / tools / drawing(cursor|eraser)
  return (
    <aside className="react-right-panel" aria-label="Свойства" {...versionAttr('RightPanel')}>
      <DefaultProps
        hasElement={hasElement}
        hasConn={hasConn}
        multi={multi}
        multiSel={liveMulti}
        guidesEditMode={guidesEditMode}
        slideMultiCount={slideMultiCount}
      />
    </aside>
  );
}

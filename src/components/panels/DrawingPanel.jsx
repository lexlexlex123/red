import React, { useMemo } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import ColorField from '../ui/ColorField.jsx';
import GSlider from '../ui/GSlider.jsx';
import { PEN_SIZES, MARKER_SIZES, isBrushFamily } from '../../editor/inkBrush.js';
import { findInkById } from '../../editor/inkSelect.js';
import { versionAttr } from '../../editor/versions.js';

const FILL_GAPS = [0, 10, 20, 30, 50];

const FILL_PAT_ICONS = {
  solid: (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <rect x="3" y="3" width="14" height="14" rx="1.5" fill="currentColor" />
    </svg>
  ),
  fadeIn: (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <rect x="3" y="3" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="6.2" fill="none" stroke="currentColor" strokeWidth="2.4" opacity=".95" />
      <circle cx="10" cy="10" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".35" />
    </svg>
  ),
  fadeOut: (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <defs>
        <radialGradient id="dfp-ffo-panel" cx="10" cy="10" r="7">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="70%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="3" y="3" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="6.2" fill="url(#dfp-ffo-panel)" />
    </svg>
  ),
  lines: (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <rect x="3" y="3" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <g stroke="currentColor" strokeWidth="1.45">
        <path d="M-2 15.7 L15.7 -2" />
        <path d="M-2 22 L22 -2" />
        <path d="M0 26.3 L26.3 0" />
      </g>
    </svg>
  ),
  hatch: (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <rect x="3" y="3" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <g stroke="currentColor" strokeWidth="1.35">
        <path d="M-2 15.7 L15.7 -2" />
        <path d="M-2 22 L22 -2" />
        <path d="M0 26.3 L26.3 0" />
        <path d="M-2 4.3 L15.7 22.2" />
        <path d="M-2 -2 L22 22" />
        <path d="M4.3 -2 L22.2 15.7" />
      </g>
    </svg>
  ),
  dots: (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <rect x="3" y="3" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <g fill="currentColor">
        {[7, 10, 13].flatMap((y) =>
          [7, 10, 13].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.15" />)
        )}
      </g>
    </svg>
  ),
};

const TAPER_ICONS = {
  both: (
    <svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true">
      <path d="M2 7 L8 4.5 L14 3.5 L20 4.5 L26 7 L20 9.5 L14 10.5 L8 9.5 Z" fill="currentColor" />
    </svg>
  ),
  out: (
    <svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true">
      <path d="M2 3 L14 5.5 L26 7 L14 8.5 L2 11 Z" fill="currentColor" />
    </svg>
  ),
  in: (
    <svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true">
      <path d="M2 7 L14 5.5 L26 3 L26 11 L14 8.5 L2 7 Z" fill="currentColor" />
    </svg>
  ),
};

function StylusBtn({ on, onClick, title }) {
  return (
    <button type="button" className={`draw-size-btn draw-stylus-btn${on ? ' on' : ''}`} title={title} onClick={onClick}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v10" />
        <path d="M8 7l4-4 4 4" />
        <rect x="6" y="14" width="12" height="7" rx="1.5" />
      </svg>
    </button>
  );
}

function SelectedInkProps({ ru }) {
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const selInkIds = useSelectionStore((s) => s.selInkIds);
  const slide = slides[cur] || {};

  const { strokes, fills, primary } = useMemo(() => {
    const st = [];
    const fl = [];
    (selInkIds || []).forEach((id) => {
      const hit = findInkById(slide, id);
      if (!hit) return;
      if (hit.kind === 'fill') fl.push(hit.item);
      else st.push(hit.item);
    });
    return { strokes: st, fills: fl, primary: st[0] || fl[0] || null };
  }, [slide, selInkIds]);

  if (!primary) return null;

  const n = strokes.length + fills.length;
  const title =
    n > 1
      ? (ru ? `Выделено: ${n}` : `Selected: ${n}`)
      : fills.length && !strokes.length
        ? ru
          ? 'Выделенная заливка'
          : 'Selected fill'
        : ru
          ? 'Выделенный штрих'
          : 'Selected stroke';

  const stroke = strokes[0];
  const fill = fills[0];
  const sizes = stroke?.tool === 'marker' ? MARKER_SIZES : PEN_SIZES;
  const opacityPct = Math.round((+(primary.opacity != null ? primary.opacity : 1) || 1) * 100);
  const color = primary.color || '#64748b';
  const colorScheme = primary.colorScheme || null;

  return (
    <>
      <div className="react-props-hdr">{title}</div>

      {stroke ? (
        <div className="react-props-field">
          <span>{ru ? 'Толщина' : 'Size'}</span>
          <div className="draw-size-row">
            {sizes.map((sz) => (
              <button
                key={sz}
                type="button"
                className={`draw-size-btn${Math.abs((+stroke.width || 6) - sz) < 0.01 ? ' on' : ''}`}
                title={`${sz}px`}
                onClick={() => editorApi.setSelectedInkWidth(sz)}
              >
                <span
                  className="draw-size-dot"
                  style={{
                    width: Math.min(16, Math.max(2, sz * (sz < 4 ? 1.6 : 0.85))),
                    height: Math.min(16, Math.max(2, sz * (sz < 4 ? 1.6 : 0.85))),
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {fills.length ? (
        <div className="react-props-field">
          <span>{ru ? 'Стиль заливки' : 'Fill style'}</span>
          <div className="draw-size-row">
            {Object.keys(FILL_PAT_ICONS).map((id) => (
              <button
                key={id}
                type="button"
                className={`draw-size-btn draw-fill-pat-btn${(fill?.pattern || 'solid') === id ? ' on' : ''}`}
                onClick={() => editorApi.setSelectedInkFillPattern(id)}
              >
                {FILL_PAT_ICONS[id]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <GSlider
        label={ru ? 'Прозрачность' : 'Opacity'}
        min={5}
        max={100}
        step={1}
        value={opacityPct}
        onChange={(v) => editorApi.setSelectedInkOpacity(v)}
      />

      {stroke?.tool === 'neon' ? (
        <GSlider
          label={ru ? 'Яркость неона' : 'Neon brightness'}
          min={0}
          max={100}
          step={1}
          value={stroke.neonBright != null ? stroke.neonBright : 75}
          onChange={(v) => editorApi.setSelectedInkNeonBright(v)}
        />
      ) : null}

      <ColorField
        label={ru ? 'Цвет' : 'Color'}
        value={color}
        schemeRef={colorScheme}
        embedded
        defaultWheelOpen
        onChange={(c, sr) => editorApi.setDrawColor(c, sr)}
        onClear={() => editorApi.setDrawColor('#64748b', null)}
      />

      <div className="react-props-actions" style={{ marginTop: 8, display: 'flex', gap: 6 }}>
        <button type="button" className="react-props-btn" style={{ flex: 1 }} onClick={() => editorApi.copySelectedInk()}>
          {ru ? 'Копировать' : 'Copy'}
        </button>
        <button
          type="button"
          className="react-props-btn react-props-btn-warn"
          style={{ flex: 1 }}
          onClick={() => editorApi.deleteSelectedInk()}
        >
          {ru ? 'Удалить' : 'Delete'}
        </button>
      </div>
    </>
  );
}

export default function DrawingPanel() {
  const drawTool = usePresentationStore((s) => s.drawTool);
  const drawColor = usePresentationStore((s) => s.drawColor);
  const drawColorScheme = usePresentationStore((s) => s.drawColorScheme);
  const drawSize = usePresentationStore((s) => s.drawSize);
  const drawSmooth = usePresentationStore((s) => s.drawSmooth);
  const drawOpacity = usePresentationStore((s) => s.drawOpacity);
  const drawMarkerOpacity = usePresentationStore((s) => s.drawMarkerOpacity);
  const drawTaper = usePresentationStore((s) => s.drawTaper);
  const drawPressure = usePresentationStore((s) => s.drawPressure);
  const drawNeonBright = usePresentationStore((s) => s.drawNeonBright);
  const drawFillPattern = usePresentationStore((s) => s.drawFillPattern);
  const drawFillOpacity = usePresentationStore((s) => s.drawFillOpacity);
  const drawFillGap = usePresentationStore((s) => s.drawFillGap);
  const selInkIds = useSelectionStore((s) => s.selInkIds);
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';

  const showSel = (selInkIds?.length || 0) > 0 && (!drawTool || drawTool === 'cursor');
  const isPen = !showSel && (drawTool === 'brush' || drawTool === 'neon' || drawTool === 'marker');
  const isFill = !showSel && drawTool === 'fill';
  const sizes = drawTool === 'marker' ? MARKER_SIZES : PEN_SIZES;
  const opacity = drawTool === 'marker' ? drawMarkerOpacity : drawOpacity;

  return (
    <section className="react-props-section react-drawing-panel" {...versionAttr('DrawingPanel')}>
      {showSel ? (
        <SelectedInkProps ru={ru} />
      ) : (
        <>
          <div className="react-props-hdr">{ru ? 'РИСОВАНИЕ' : 'DRAWING'}</div>

          {isPen ? (
            <>
              <GSlider
                label={ru ? 'Сглаживание' : 'Smooth'}
                min={0}
                max={200}
                step={1}
                value={drawSmooth != null ? drawSmooth : 40}
                onChange={(v) => editorApi.setDrawSmooth(v)}
              />

              <div className="react-props-field">
                <span>{ru ? 'Толщина' : 'Size'}</span>
                <div className="draw-size-row">
                  {sizes.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      className={`draw-size-btn${Math.abs((drawSize || 6) - sz) < 0.01 ? ' on' : ''}`}
                      title={`${sz}px`}
                      onClick={() => editorApi.setDrawSize(sz)}
                    >
                      <span
                        className="draw-size-dot"
                        style={{
                          width: Math.min(16, Math.max(2, sz * (sz < 4 ? 1.6 : 0.85))),
                          height: Math.min(16, Math.max(2, sz * (sz < 4 ? 1.6 : 0.85))),
                        }}
                      />
                    </button>
                  ))}
                  {isBrushFamily(drawTool) ? (
                    <StylusBtn
                      on={!!drawPressure}
                      title={ru ? 'Нажим стилуса' : 'Stylus pressure'}
                      onClick={() => editorApi.setDrawPressure(!drawPressure)}
                    />
                  ) : null}
                </div>
              </div>

              {isBrushFamily(drawTool) ? (
                <div className="react-props-field">
                  <span>{ru ? 'Профиль' : 'Taper'}</span>
                  <div className="draw-size-row">
                    {['both', 'out', 'in'].map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={`draw-size-btn${(drawTaper || 'both') === id ? ' on' : ''}`}
                        title={id}
                        onClick={() => editorApi.setDrawTaper(id)}
                      >
                        {TAPER_ICONS[id]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <GSlider
                label={ru ? 'Прозрачность' : 'Opacity'}
                min={drawTool === 'marker' ? 5 : 0}
                max={100}
                step={1}
                value={opacity != null ? opacity : drawTool === 'marker' ? 40 : 100}
                onChange={(v) =>
                  drawTool === 'marker' ? editorApi.setDrawMarkerOpacity(v) : editorApi.setDrawOpacity(v)
                }
              />

              {drawTool === 'neon' ? (
                <GSlider
                  label={ru ? 'Яркость неона' : 'Neon brightness'}
                  min={0}
                  max={100}
                  step={1}
                  value={drawNeonBright != null ? drawNeonBright : 75}
                  onChange={(v) => editorApi.setDrawNeonBright(v)}
                />
              ) : null}

              <ColorField
                label={ru ? 'Цвет' : 'Color'}
                value={drawColor || '#64748b'}
                schemeRef={drawColorScheme || null}
                embedded
                defaultWheelOpen
                onChange={(c, sr) => editorApi.setDrawColor(c, sr)}
                onClear={() => editorApi.setDrawColor('#64748b', null)}
              />
            </>
          ) : null}

          {isFill ? (
            <>
              <div className="react-props-field">
                <span>{ru ? 'Стиль заливки' : 'Fill style'}</span>
                <div className="draw-size-row">
                  {Object.keys(FILL_PAT_ICONS).map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`draw-size-btn draw-fill-pat-btn${(drawFillPattern || 'solid') === id ? ' on' : ''}`}
                      onClick={() => editorApi.setDrawFillPattern(id)}
                    >
                      {FILL_PAT_ICONS[id]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="react-props-field">
                <span>{ru ? 'Замкнутость' : 'Gap'}</span>
                <div className="draw-size-row">
                  {FILL_GAPS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`draw-size-btn${(drawFillGap != null ? drawFillGap : 10) === g ? ' on' : ''}`}
                      onClick={() => editorApi.setDrawFillGap(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <GSlider
                label={ru ? 'Прозрачность' : 'Opacity'}
                min={5}
                max={100}
                step={1}
                value={drawFillOpacity != null ? drawFillOpacity : 55}
                onChange={(v) => editorApi.setDrawFillOpacity(v)}
              />
              <ColorField
                label={ru ? 'Цвет' : 'Color'}
                value={drawColor || '#64748b'}
                schemeRef={drawColorScheme || null}
                embedded
                defaultWheelOpen
                onChange={(c, sr) => editorApi.setDrawColor(c, sr)}
                onClear={() => editorApi.setDrawColor('#64748b', null)}
              />
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

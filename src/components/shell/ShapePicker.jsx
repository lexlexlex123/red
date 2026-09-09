import React, { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { SHAPE_PRESETS } from '../../editor/palette';
import { editorApi } from '../../editor/editorApi';
import { buildBasicShapeSVG } from '../../shared/shapes.js';
import { versionAttr } from '../../editor/versions.js';
import { defaultShapeFill, defaultShapeStroke } from '../../editor/shapeInsert.js';
import ColorField from '../ui/ColorField.jsx';
import GSlider from '../ui/GSlider.jsx';

/** Gallery icon opts so tails/tips stay inside the 100×100 tile (like v7.1 hardcoded paths). */
function galleryPreviewOpts(sh, fill, stroke, sw) {
  const noFill = !!sh.noFill;
  const base = {
    fill: noFill ? 'none' : fill,
    stroke: noFill ? fill : stroke,
    strokeWidth: noFill ? Math.max(2, sw || 2) : Math.max(0, sw),
    noFill,
    w: 100,
    h: 100,
  };
  if (sh.special === 'callout') {
    return {
      ...base,
      rx: 12,
      calloutForm: 'round',
      tailX: 0,
      tailY: 42,
      tailRoundX: 0,
      tailRoundY: 28,
      tailWFrac: 0.22,
    };
  }
  if (sh.special === 'polygon') {
    return { ...base, sides: 6 };
  }
  return base;
}

export default function ShapePicker() {
  const panel = useUiStore((s) => s.panel);
  const setPanel = useUiStore((s) => s.setPanel);
  const shapeReplaceId = useUiStore((s) => s.shapeReplaceId);
  const lang = useUiStore((s) => s.lang);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const fillDef = useMemo(() => defaultShapeFill(appliedThemeIdx), [appliedThemeIdx]);
  const strokeDef = useMemo(() => defaultShapeStroke(appliedThemeIdx), [appliedThemeIdx]);
  const [sel, setSel] = useState(SHAPE_PRESETS[0]?.id || 'rect');
  const [fill, setFill] = useState(fillDef.color);
  const [fillScheme, setFillScheme] = useState(fillDef.schemeRef);
  const [stroke, setStroke] = useState(strokeDef.color);
  const [strokeScheme, setStrokeScheme] = useState(strokeDef.schemeRef);
  const [sw, setSw] = useState(0);

  useEffect(() => {
    if (!shapeReplaceId) return;
    const st = usePresentationStore.getState();
    const el = (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === String(shapeReplaceId));
    if (!el || el.type !== 'shape') return;
    setSel(el.shape || 'rect');
    if (el.fill && el.fill !== 'none') {
      setFill(el.fill);
      setFillScheme(el.fillScheme || null);
    }
    if (el.stroke && el.stroke !== 'none') {
      setStroke(el.stroke);
      setStrokeScheme(el.strokeScheme || null);
    }
    if (el.sw != null) setSw(+el.sw || 0);
  }, [shapeReplaceId]);

  if (panel !== 'shapes') return null;
  const ru = lang !== 'en';
  const meta = SHAPE_PRESETS.find((s) => s.id === sel);

  function insert(id) {
    const shapeId = id || sel;
    if (!shapeId) return;
    const opts = { fill, stroke, sw, fillScheme, strokeScheme };
    if (shapeReplaceId) editorApi.replaceShape(shapeReplaceId, shapeId, opts);
    else editorApi.addShape(shapeId, opts);
    setPanel(null);
  }

  return (
    <div className="settings-backdrop" onClick={() => setPanel(null)} role="presentation">
      <div
        className="settings-modal shape-picker-modal picker-modal-v71"
        role="dialog"
        aria-modal="true"
        aria-label={shapeReplaceId ? (ru ? 'Сменить фигуру' : 'Change shape') : ru ? 'Вставить фигуру' : 'Insert shape'}
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('ShapePicker')}
      >
        <h2>{shapeReplaceId ? (ru ? 'Сменить фигуру' : 'Change shape') : ru ? 'Вставить фигуру' : 'Insert shape'}</h2>
        <div className="shape-gallery">
          {SHAPE_PRESETS.map((sh) => {
            return (
              <button
                key={sh.id}
                type="button"
                className={`shape-card${sel === sh.id ? ' is-selected' : ''}`}
                onClick={() => {
                  setSel(sh.id);
                }}
                onDoubleClick={() => insert(sh.id)}
                title={ru ? sh.name : sh.nameEn || sh.name}
              >
                <span
                  className="shape-card-preview"
                  dangerouslySetInnerHTML={{
                    __html: buildBasicShapeSVG(sh.id, galleryPreviewOpts(sh, fill, stroke, sw)),
                  }}
                />
                <span className="shape-card-label">{ru ? sh.name : sh.nameEn || sh.name}</span>
              </button>
            );
          })}
        </div>
        <div className="shape-picker-colors">
          <ColorField
            label={ru ? 'Заливка' : 'Fill'}
            value={fill}
            schemeRef={fillScheme}
            allowClear={false}
            onChange={(c, sr) => {
              if (meta?.noFill) return;
              setFill(c);
              setFillScheme(sr || null);
            }}
          />
          <ColorField
            label={ru ? 'Обводка' : 'Stroke'}
            value={stroke}
            schemeRef={strokeScheme}
            allowClear={false}
            onChange={(c, sr) => {
              setStroke(c);
              setStrokeScheme(sr || null);
            }}
          />
          <GSlider
            className="shape-picker-sw"
            label={ru ? 'Толщина' : 'Stroke W'}
            min={0}
            max={20}
            step={1}
            value={sw}
            onChange={(v) => setSw(Math.max(0, +v || 0))}
          />
        </div>
        <div className="picker-mfooter picker-mfooter-end">
          <div className="picker-mfooter-actions">
            <button type="button" className="react-props-btn" onClick={() => setPanel(null)}>
              {ru ? 'Отмена' : 'Cancel'}
            </button>
            <button type="button" className="primary" onClick={() => insert()} disabled={!sel}>
              {shapeReplaceId ? (ru ? 'Заменить' : 'Replace') : ru ? 'Вставить' : 'Insert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

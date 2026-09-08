import React from 'react';
import GSlider from '../ui/GSlider.jsx';
import ColorField from '../ui/ColorField.jsx';
import Toggle from '../ui/Toggle.jsx';
import { editorApi } from '../../editor/editorApi';
import { getTheme } from '../../editor/themes.js';
import { usePresentationStore } from '../../stores/presentationStore';

const ALIGN_H = [
  {
    id: 'left',
    title: 'Left',
    svg: (
      <svg width="14" height="12" viewBox="0 0 14 12">
        <line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="1.5" />
        <line x1="0" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="0" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'center',
    title: 'Center',
    svg: (
      <svg width="14" height="12" viewBox="0 0 14 12">
        <line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="1.5" />
        <line x1="2.5" y1="5" x2="11.5" y2="5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'right',
    title: 'Right',
    svg: (
      <svg width="14" height="12" viewBox="0 0 14 12">
        <line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="1.5" />
        <line x1="5" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="2" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
];

const ALIGN_V = [
  {
    id: 'top',
    title: 'Top',
    svg: (
      <svg width="12" height="14" viewBox="0 0 12 14">
        <line x1="0" y1="0" x2="12" y2="0" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="2" width="6" height="9" rx="1" fill="currentColor" opacity=".4" />
      </svg>
    ),
  },
  {
    id: 'middle',
    title: 'Middle',
    svg: (
      <svg width="12" height="14" viewBox="0 0 12 14">
        <line x1="0" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="1" width="6" height="5" rx="1" fill="currentColor" opacity=".4" />
        <rect x="3" y="8" width="6" height="5" rx="1" fill="currentColor" opacity=".4" />
      </svg>
    ),
  },
  {
    id: 'bottom',
    title: 'Bottom',
    svg: (
      <svg width="12" height="14" viewBox="0 0 12 14">
        <line x1="0" y1="14" x2="12" y2="14" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="3" width="6" height="9" rx="1" fill="currentColor" opacity=".4" />
      </svg>
    ),
  },
];

/** Shared visual props for clock / timer / generator / counter (v7.1 genprops). */
export default function GenAppletVisualProps({ el, ru, defFs = 48 }) {
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const theme = getTheme(appliedThemeIdx);
  const head = theme?.head || theme?.ac3 || theme?.ac1 || theme?.accents?.[0] || '#a5b4fc';
  const align = el.genAlign || 'center';
  const valign = el.genVAlign || 'middle';
  const textClr = el.genColor || head;
  const bgClr = el.genBg || '';
  const shOn = el.genShadowOn !== false;
  const borderClr = el.genBorderColor || '#ffffff';

  const patch = (p) => editorApi.patchApplet(el.id, p);

  return (
    <>
      <div className="react-fmt-inline" style={{ marginBottom: 6, gap: 6, alignItems: 'end' }}>
        <GSlider
          label={ru ? 'Размер' : 'Size'}
          min={8}
          max={400}
          step={1}
          value={el.genFontSize ?? defFs}
          onChange={(v) => patch({ genFontSize: Math.max(8, Math.min(400, v)) })}
        />
        <button
          type="button"
          className={`react-ftbtn${el.genBold ? ' on' : ''}`}
          title="Bold"
          style={{ height: 28, marginBottom: 1, flexShrink: 0 }}
          onClick={() => patch({ genBold: !el.genBold })}
        >
          <b>B</b>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
        {ALIGN_H.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`react-ftbtn${align === a.id ? ' on' : ''}`}
            title={a.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => patch({ genAlign: a.id })}
          >
            {a.svg}
          </button>
        ))}
        <span
          style={{
            width: 1,
            background: 'var(--border2)',
            margin: '0 2px',
            alignSelf: 'stretch',
            flexShrink: 0,
          }}
        />
        {ALIGN_V.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`react-ftbtn${valign === a.id ? ' on' : ''}`}
            title={a.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => patch({ genVAlign: a.id })}
          >
            {a.svg}
          </button>
        ))}
      </div>

      <ColorField
        label={ru ? 'Цвет текста' : 'Text color'}
        value={textClr}
        schemeRef={el.genColorScheme}
        allowClear
        clearGlyph="x"
        clearTitle={ru ? 'Цвет темы' : 'Theme color'}
        onChange={(c, sr) => patch({ genColor: c, genColorScheme: sr || null })}
        onClear={() => patch({ genColor: '', genColorScheme: null })}
      />
      <ColorField
        label={ru ? 'Цвет фона' : 'Background'}
        value={bgClr || 'transparent'}
        schemeRef={el.genBgScheme}
        allowClear
        clearGlyph="x"
        clearTitle={ru ? 'Без фона' : 'No fill'}
        onChange={(c, sr) => patch({ genBg: c === 'transparent' ? '' : c, genBgScheme: sr || null })}
        onClear={() => patch({ genBg: '', genBgScheme: null })}
      />

      <div className="react-props-grid" style={{ marginBottom: 4 }}>
        <GSlider
          label={ru ? 'Прозр. фона' : 'Bg opacity'}
          min={0}
          max={1}
          step={0.05}
          value={el.genBgOp != null ? +el.genBgOp : 0.2}
          fadeTrack
          onChange={(v) => patch({ genBgOp: v })}
        />
        <GSlider
          label={ru ? 'Размытие' : 'Blur'}
          min={0}
          max={60}
          step={1}
          value={el.genBgBlur != null ? +el.genBgBlur : 0}
          onChange={(v) => patch({ genBgBlur: v })}
        />
      </div>

      <label className="react-sntog" style={{ margin: '4px 0 6px' }}>
        <Toggle checked={shOn} onChange={(on) => patch({ genShadowOn: on })} />
        <span>{ru ? 'Тень текста' : 'Text shadow'}</span>
      </label>
      {shOn ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
          <ColorField
            label=""
            value={el.genShadowColor || '#000000'}
            schemeRef={el.genShadowScheme}
            allowClear={false}
            onChange={(c, sr) => patch({ genShadowColor: c, genShadowScheme: sr || null })}
          />
          <GSlider
            label=""
            min={0}
            max={60}
            step={1}
            value={el.genShadowBlur != null ? +el.genShadowBlur : 8}
            onChange={(v) => patch({ genShadowBlur: v })}
          />
        </div>
      ) : null}

      <div style={{ marginBottom: 8 }}>
        <div className="react-props-field-label" style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
          {ru ? 'Граница' : 'Border'}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <ColorField
            label=""
            value={borderClr}
            schemeRef={el.genBorderScheme}
            allowClear={false}
            onChange={(c, sr) => patch({ genBorderColor: c, genBorderScheme: sr || null })}
          />
          <GSlider
            label=""
            min={0}
            max={20}
            step={0.5}
            value={el.genBorderWidth != null ? +el.genBorderWidth : 0}
            onChange={(v) => patch({ genBorderWidth: v })}
          />
          <button
            type="button"
            className="react-props-btn"
            title={ru ? 'Сбросить' : 'Reset'}
            style={{ padding: '2px 6px', fontSize: 12, lineHeight: 1 }}
            onClick={() => patch({ genBorderWidth: 0 })}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="react-props-grid">
        <GSlider
          label={ru ? 'Прозрачность элемента' : 'Element opacity'}
          min={0}
          max={1}
          step={0.05}
          value={el.elOpacity ?? el.opacity ?? 1}
          fadeTrack
          onChange={(v) => editorApi.patchElementHistory(el.id, { elOpacity: v })}
        />
        <GSlider
          label={ru ? 'Скругление углов' : 'Corner radius'}
          min={0}
          max={500}
          step={1}
          value={el.rx ?? 0}
          onChange={(v) => editorApi.patchElementHistory(el.id, { rx: Math.max(0, v) })}
        />
      </div>
    </>
  );
}

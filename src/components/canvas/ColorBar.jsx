import React, { useMemo, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { PALETTE } from '../../editor/palette';
import { buildSchemeSwatches, getTheme, resolveElTextColor } from '../../editor/themes.js';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import { getShapeTextColor } from '../../editor/shapeText.js';
import GSlider from '../ui/GSlider.jsx';
import AppIcon from '../ui/AppIcon.jsx';
import { APP_CHROME } from '../../editor/app-icons-data.js';

export default function ColorBar() {
  const colorMode = usePresentationStore((s) => s.colorMode);
  const setColorMode = usePresentationStore((s) => s.setColorMode);
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const selId = useSelectionStore((s) => s.selId);
  const [glow, setGlow] = useState(null);

  const el = (slides[cur]?.els || []).find((e) => String(e.id) === String(selId));
  const current =
    colorMode === 'stroke'
      ? el?.stroke
      : colorMode === 'text'
        ? el?.type === 'shape'
          ? getShapeTextColor(el)
          : resolveElTextColor(el, getTheme(appliedThemeIdx))
        : el?.type === 'text'
          ? el?.textBg || ''
          : el?.fill || slides[cur]?.bgc;

  const theme = getTheme(appliedThemeIdx);
  const swatches = useMemo(() => {
    if (theme) return buildSchemeSwatches(theme);
    return PALETTE.flatMap((row, ri) => row.map((color, ci) => ({ color, key: `${ri}-${ci}`, col: null, row: null, pos: color })));
  }, [theme]);

  return (
    <div className="react-color-bar" aria-label="Палитра цветов" {...versionAttr('ColorBar')}>
      <div className="color-bar-modes">
        <button type="button" className={`color-bar-mode${colorMode === 'bg' ? ' active' : ''}`} title="Заливка" onClick={() => setColorMode('bg')}>
          <AppIcon id={APP_CHROME.colorFill} size={16} sw={1.6} fillOp={0.22} />
        </button>
        <button type="button" className={`color-bar-mode${colorMode === 'stroke' ? ' active' : ''}`} title="Обводка" onClick={() => setColorMode('stroke')}>
          <AppIcon id={APP_CHROME.colorStroke} size={16} sw={2} fillOp={0} />
        </button>
        <button type="button" className={`color-bar-mode color-bar-mode-text${colorMode === 'text' ? ' active' : ''}`} title="Текст" onClick={() => setColorMode('text')}>
          <span>T</span>
        </button>
      </div>
      <div className="color-bar-palette">
        <div className={`color-bar-grid${theme ? ' color-bar-grid--scheme' : ''}`} onMouseLeave={() => setGlow(null)}>
          {glow && (
            <div className="color-bar-glow-layer" aria-hidden="true">
              <div className="color-bar-glow-spot on" style={{ left: glow.x, top: glow.y, '--swatch-glow-color': glow.color }} />
            </div>
          )}
          {swatches.map((sw) => (
            <button
              key={sw.key}
              type="button"
              className={`color-bar-swatch${current === sw.color ? ' sel' : ''}`}
              style={{ background: sw.color }}
              title={sw.pos ? `${sw.pos} · ${sw.color}` : sw.color}
              onMouseEnter={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const gr = e.currentTarget.parentElement.getBoundingClientRect();
                setGlow({ color: sw.color, x: r.left - gr.left + r.width / 2, y: r.top - gr.top + r.height / 2 });
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                editorApi.applyColor(sw.color, {
                  shift: e.shiftKey,
                  ctrl: e.ctrlKey || e.metaKey,
                  schemeRef: sw.col != null ? { col: sw.col, row: sw.row } : null,
                });
              }}
            />
          ))}
          <button type="button" className="color-bar-swatch color-bar-clear" title="Убрать" onMouseDown={(e) => { e.preventDefault(); editorApi.clearColor(); }}>
            ✕
          </button>
        </div>
      </div>
      <div className="color-bar-fx">
        <div className="color-bar-fx-grid">
          <GSlider
            label="Прозрачность"
            min={0}
            max={1}
            step={0.05}
            value={el?.elOpacity ?? 1}
            fadeTrack
            onChange={(v) => editorApi.setOpacity(v)}
          />
          <GSlider
            label="Размытие"
            min={0}
            max={40}
            step={1}
            value={
              el?.type === 'shape'
                ? el?.shapeBlur ?? 0
                : el?.type === 'text' || el?.type === 'markdown'
                  ? el?.textBgBlur ?? 0
                  : el?.blur ?? 0
            }
            onChange={(v) => editorApi.setBlur(v)}
          />
          <GSlider label="Толщина" min={0} max={24} step={0.5} value={el?.sw ?? 2} row2 onChange={(v) => editorApi.setStrokeWidth(v)} />
        </div>
      </div>
    </div>
  );
}

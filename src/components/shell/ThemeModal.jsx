import React, { useEffect, useRef, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePresentationStore } from '../../stores/presentationStore';
import {
  THEMES,
  themeDisplayName,
  themeColors,
  schemeSwatchColor,
  solidColor,
} from '../../editor/themes.js';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';

function ThemeCard({ index, theme, active, lang, onSelect, onApply }) {
  const midRow = 4;
  const baseCols = themeColors(theme);
  const strips = [];
  for (let col = 0; col < 7; col++) {
    let hex = null;
    if (col === 0 && theme.headingColor) hex = theme.headingColor;
    else if (col === 1 && theme.shapeFill) hex = theme.shapeFill;
    else hex = schemeSwatchColor(theme, col, midRow);
    if (!hex) hex = baseCols[col];
    if (hex) strips.push(solidColor(hex));
  }
  const slideLight = theme.dark === false;

  return (
    <button
      type="button"
      className={`theme-card${active ? ' active' : ''}${slideLight ? ' theme-card--slide-light' : ' theme-card--slide-dark'}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.preventDefault();
        onApply(index);
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        onApply(index);
      }}
      title={themeDisplayName(theme, lang)}
    >
      <div className="theme-card-inner">
        <div className="tc-bg" style={{ background: theme.bg }} />
        <div className="tc-mock">
          <div className="tc-mock-h" style={{ background: theme.headingColor }} />
          <div className="tc-mock-b" style={{ background: theme.bodyColor, opacity: 0.45, width: '78%' }} />
          <div className="tc-mock-b" style={{ background: theme.bodyColor, opacity: 0.3, width: '52%' }} />
          <div className="tc-mock-shape" style={{ background: theme.shapeFill }} />
        </div>
        <div className="tc-swatches">
          {strips.map((c, i) => (
            <span key={i} style={{ background: c }} />
          ))}
        </div>
        <div className="tc-label">{themeDisplayName(theme, lang)}</div>
      </div>
    </button>
  );
}

function ThemeSection({ label, items, sel, lang, onSelect, onApply }) {
  if (!items.length) return null;
  return (
    <div className="theme-section">
      <div className="theme-section-hdr">{label}</div>
      <div className="theme-grid">
        {items.map(([i, t]) => (
          <ThemeCard
            key={i}
            index={i}
            theme={t}
            active={sel === i}
            lang={lang}
            onSelect={onSelect}
            onApply={onApply}
          />
        ))}
      </div>
    </div>
  );
}

export default function ThemeModal() {
  const open = useUiStore((s) => s.themeModalOpen);
  const closeThemeModal = useUiStore((s) => s.closeThemeModal);
  const lang = useUiStore((s) => s.lang);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const [sel, setSel] = useState(appliedThemeIdx);
  const scrollRef = useRef(null);
  const scrollPos = useRef(0);

  useEffect(() => {
    if (open) setSel(appliedThemeIdx >= 0 ? appliedThemeIdx : 0);
  }, [open, appliedThemeIdx]);

  if (!open) return null;
  const ru = lang !== 'en';
  const dark = THEMES.map((t, i) => [i, t]).filter(([, t]) => t.dark !== false);
  const light = THEMES.map((t, i) => [i, t]).filter(([, t]) => t.dark === false);

  const keepScroll = (fn) => {
    const el = scrollRef.current;
    if (el) scrollPos.current = el.scrollTop;
    fn();
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollPos.current;
    });
  };

  return (
    <div className="settings-backdrop" onClick={closeThemeModal} role="presentation">
      <div
        className="settings-modal theme-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('ThemeModal')}
      >
        <h2>{ru ? '🎨 Цветовая схема' : '🎨 Color scheme'}</h2>
        <p className="layout-modal-desc">
          {ru
            ? 'Палитра и фон презентации. Декор берёт акценты из выбранной схемы.'
            : 'Presentation palette and background. Decor uses scheme accents.'}
        </p>
        <div className="theme-modal-scroll" ref={scrollRef}>
          <ThemeSection
            label={ru ? 'Тёмные' : 'Dark'}
            items={dark}
            sel={sel}
            lang={lang}
            onSelect={(i) => keepScroll(() => setSel(i))}
            onApply={(i) => {
              setSel(i);
              editorApi.applyTheme(i);
            }}
          />
          <ThemeSection
            label={ru ? 'Светлые' : 'Light'}
            items={light}
            sel={sel}
            lang={lang}
            onSelect={(i) => keepScroll(() => setSel(i))}
            onApply={(i) => {
              setSel(i);
              editorApi.applyTheme(i);
            }}
          />
        </div>
        <div className="theme-modal-footer">
          <button type="button" onClick={closeThemeModal}>
            {ru ? 'Отмена' : 'Cancel'}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              if (sel < 0) {
                useUiStore.getState().showToast(ru ? 'Выберите тему' : 'Select a theme');
                return;
              }
              editorApi.applyTheme(sel);
            }}
          >
            {ru ? 'Применить ко всем' : 'Apply to all'}
          </button>
        </div>
      </div>
    </div>
  );
}

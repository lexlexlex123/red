import React, { useEffect, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { editorApi } from '../../editor/editorApi';
import { ensureLayoutsLoaded, getLayouts, layoutDisplayName } from '../../editor/layouts.js';
import { getTheme, themeDisplayName } from '../../editor/themes.js';
import { randomLayoutVariants, layoutVariantPreviewSvg } from '../../editor/autoplace.js';
import { versionAttr } from '../../editor/versions.js';

export default function AutoPlacePreviewModal() {
  const open = useUiStore((s) => s.autoPlacePreviewOpen);
  const close = useUiStore((s) => s.closeAutoPlacePreview);
  const lang = useUiStore((s) => s.lang);
  const slides = usePresentationStore((s) => s.slides);
  const slideMultiSel = usePresentationStore((s) => s.slideMultiSel);
  const [ready, setReady] = useState(false);
  const [variants, setVariants] = useState([]);
  const ru = lang !== 'en';
  const selN = (slideMultiSel && slideMultiSel.length) || 1;
  const keepLabel =
    ru
      ? selN > 1
        ? `Оставить тему и разместить (${selN})`
        : 'Оставить тему и разместить'
      : selN > 1
        ? `Keep theme and arrange (${selN})`
        : 'Keep theme and arrange';

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setReady(false);
    ensureLayoutsLoaded().then(() => {
      if (cancelled) return;
      setVariants(randomLayoutVariants(3));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, close]);

  if (!open) return null;

  const layouts = ready ? getLayouts() : [];

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal autoplace-preview-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('AutoPlacePreviewModal')}
      >
        <h2>{ru ? '✨ Выберите вариант компоновки' : '✨ Choose a layout'}</h2>
        <p className="layout-modal-desc">
          {ru
            ? 'Три случайных варианта: тема, декор и расположение объектов. Длинный текст может разбиться на продолжения.'
            : 'Three random variants: theme, decor, and object placement. Long text may split onto continuation slides.'}
        </p>
        {!ready ? (
          <p className="react-props-muted">{ru ? 'Загрузка…' : 'Loading…'}</p>
        ) : (
          <div className="autoplace-preview-grid">
            {variants.map((v, i) => {
              const theme = getTheme(v.tIdx);
              const layout = v.lIdx >= 0 ? layouts[v.lIdx] : null;
              return (
                <div key={`${v.tIdx}-${v.lIdx}-${i}`} className="lp-card">
                  <div
                    className="lp-thumb"
                    dangerouslySetInnerHTML={{ __html: layoutVariantPreviewSvg(theme) }}
                  />
                  <div className="lp-label">{themeDisplayName(theme, lang) || (ru ? 'Тема' : 'Theme')}</div>
                  <div className="lp-sub">
                    {layout
                      ? layoutDisplayName(layout, lang) || (ru ? 'Декор' : 'Decor')
                      : ru
                        ? 'Без декора'
                        : 'No decor'}
                  </div>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => editorApi.applyAutoPlaceVariant(v.tIdx, v.lIdx, v.align)}
                  >
                    {ru ? 'Применить' : 'Apply'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="autoplace-preview-actions">
          <button type="button" className="primary" onClick={() => editorApi.autoPlaceKeepTheme()}>
            {keepLabel}
          </button>
          <button type="button" onClick={close}>
            {ru ? 'Отмена' : 'Cancel'}
          </button>
        </div>
        {!slides.length ? (
          <p className="react-props-muted">{ru ? 'Нет слайдов' : 'No slides'}</p>
        ) : null}
      </div>
    </div>
  );
}

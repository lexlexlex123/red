import React, { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePresentationStore } from '../../stores/presentationStore';
import {
  ensureLayoutsLoaded,
  getLayouts,
  layoutDisplayName,
  modalPreviewSvg,
  solidPreviewBg,
} from '../../editor/layouts.js';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';

export default function LayoutModal() {
  const open = useUiStore((s) => s.layoutModalOpen);
  const close = useUiStore((s) => s.closeLayoutModal);
  const lang = useUiStore((s) => s.lang);
  const layoutIdx = usePresentationStore((s) => s.layoutIdx);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const [sel, setSel] = useState(layoutIdx);
  const [previews, setPreviews] = useState({});
  const [ready, setReady] = useState(false);

  const layouts = useMemo(() => (ready ? getLayouts() : []), [ready, open, appliedThemeIdx]);
  const bg = solidPreviewBg();
  const ru = lang !== 'en';

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    ensureLayoutsLoaded().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) setSel(layoutIdx >= 0 ? layoutIdx : -1);
  }, [open, layoutIdx]);

  useEffect(() => {
    if (!open || !ready) return undefined;
    const next = {};
    layouts.forEach((L, i) => {
      if (L?.hideFromModal) return;
      next[i] = modalPreviewSvg(i, 320, 180);
    });
    setPreviews(next);
  }, [open, ready, layouts, appliedThemeIdx]);

  if (!open) return null;

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal layout-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('LayoutModal')}
      >
        <h2>{ru ? '🖼 Тема оформления' : '🖼 Theme decor'}</h2>
        <p className="layout-modal-desc">
          {ru
            ? 'Декоративный стиль для всех слайдов. Использует цвета текущей схемы.'
            : 'Decorative style for all slides. Uses current color scheme.'}
        </p>
        <div className="layout-modal-scroll">
          {!ready ? (
            <p className="react-props-muted">{ru ? 'Загрузка тем…' : 'Loading themes…'}</p>
          ) : (
            <div className="layout-grid">
              <button
                type="button"
                className={`layout-item${sel === -1 ? ' active' : ''}`}
                style={{ background: bg }}
                title={ru ? 'Без декора' : 'No decor'}
                onClick={() => editorApi.applyLayout(-1)}
                onDoubleClick={() => editorApi.applyLayout(-1)}
              >
                <div className="layout-item-inner layout-item-none">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                    <line x1="8" y1="8" x2="40" y2="40" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="40" y1="8" x2="8" y2="40" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="li-label">{ru ? 'Без декора' : 'No decor'}</div>
              </button>

              {layouts.map((L, i) => {
                if (!L || L.hideFromModal) return null;
                return (
                  <button
                    type="button"
                    key={L.nameEn || L.name || i}
                    className={`layout-item${sel === i ? ' active' : ''}`}
                    style={{ background: bg }}
                    title={ru ? L.desc : L.descEn}
                    onClick={() => editorApi.applyLayout(i)}
                    onDoubleClick={() => editorApi.applyLayout(i)}
                  >
                    <div
                      className="layout-item-inner"
                      dangerouslySetInnerHTML={{ __html: previews[i] || '' }}
                    />
                    <div className="li-label">
                      {layoutDisplayName(L, lang)}
                      {L.animated ? (
                        <span className="li-anim-badge" title={ru ? 'Поддерживает анимацию' : 'Supports animation'}>
                          ✦
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="theme-modal-footer">
          <button type="button" onClick={close}>
            {ru ? 'Отмена' : 'Cancel'}
          </button>
          <button type="button" className="primary" onClick={() => editorApi.applyLayout(sel)} disabled={!ready}>
            {ru ? 'Применить к презентации' : 'Apply to presentation'}
          </button>
        </div>
      </div>
    </div>
  );
}

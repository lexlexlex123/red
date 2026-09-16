import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { editorApi } from '../../../editor/editorApi';
import { useUiStore } from '../../../stores/uiStore';
import { versionAttr } from '../../../editor/versions.js';
import { SLIDE_CONTENT_LAYOUTS } from '../../../editor/slideContentLayouts.js';
import { chromeIconId } from '../../../editor/app-icons-data.js';
import RibbonGroup from './RibbonGroup.jsx';
import RibbonButton from './RibbonButton.jsx';

function layoutPreviewSvg(layout) {
  const boxes = layout.boxes || [];
  const rects = boxes
    .map((b) => {
      const x = (b.x * 100).toFixed(1);
      const y = (b.y * 100).toFixed(1);
      const w = (b.w * 100).toFixed(1);
      const h = (b.h * 100).toFixed(1);
      const op = b.role === 'heading' ? '0.55' : '0.35';
      return `<rect x="${x}%" y="${y}%" width="${w}%" height="${h}%" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 2" opacity="${op}" rx="1"/>`;
    })
    .join('');
  return (
    `<svg viewBox="0 0 96 54" width="96" height="54" aria-hidden="true">` +
    `<rect x="0.5" y="0.5" width="95" height="53" rx="3" fill="var(--surface2)" stroke="var(--border2)" stroke-width="1"/>` +
    rects +
    `</svg>`
  );
}

/**
 * "Macет"/Layout button + popup grid. Extracted from DesignRibbon so the same picker can also
 * be shown on the Home tab (before the Objects group) without duplicating the implementation.
 */
export default function LayoutPickerGroup() {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [activeLayoutId, setActiveLayoutId] = useState(null);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 340));
      setMenuPos({ top: r.bottom + 6, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const t = e.target;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <RibbonGroup label={ru ? 'Макет' : 'Layout'}>
      <div className="react-ribbon-layout-wrap" ref={wrapRef} {...versionAttr('LayoutPickerGroup')}>
        <RibbonButton
          label={ru ? 'Макет' : 'Layout'}
          title={ru ? 'Макет слайда' : 'Slide layout'}
          icon={chromeIconId('table')}
          open={open}
          on={open}
          onClick={() => setOpen((v) => !v)}
        />
        {open
          ? createPortal(
              <div
                ref={menuRef}
                className="react-ribbon-layout-menu"
                role="menu"
                style={{ top: menuPos.top, left: menuPos.left }}
              >
                <div className="react-ribbon-layout-menu-title">
                  {ru ? 'Макет слайда' : 'Slide layout'}
                </div>
                <div className="react-ribbon-layout-grid">
                  {SLIDE_CONTENT_LAYOUTS.map((L) => (
                    <button
                      key={L.id}
                      type="button"
                      className={
                        'react-ribbon-layout-item' +
                        (activeLayoutId === L.id ? ' is-active' : '')
                      }
                      role="menuitem"
                      onClick={() => {
                        setActiveLayoutId(L.id);
                        editorApi.applySlideContentLayout(L.id);
                        setOpen(false);
                      }}
                      dangerouslySetInnerHTML={{
                        __html:
                          layoutPreviewSvg(L) +
                          `<span class="react-ribbon-layout-lbl">${
                            ru ? L.nameRu : L.nameEn
                          }</span>`,
                      }}
                    />
                  ))}
                </div>
              </div>,
              document.body
            )
          : null}
      </div>
    </RibbonGroup>
  );
}

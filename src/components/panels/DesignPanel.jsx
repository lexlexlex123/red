import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import { SLIDE_CONTENT_LAYOUTS } from '../../editor/slideContentLayouts.js';
import SlidePropsPanel from './SlidePropsPanel.jsx';

/**
 * Design tab: color scheme / decor theme modals + slide content layouts.
 */
export default function DesignPanel() {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';

  return (
    <aside className="react-design-wrap" {...versionAttr('DesignPanel')}>
      <div className="react-props-section" style={{ paddingBottom: 0 }}>
        <div className="react-props-hdr">{ru ? 'ДИЗАЙН' : 'DESIGN'}</div>
        <div className="react-props-row" style={{ marginBottom: 8 }}>
          <button type="button" className="react-props-btn" onClick={() => editorApi.openThemeModal()}>
            {ru ? 'Цветовая схема…' : 'Color scheme…'}
          </button>
          <button type="button" className="react-props-btn primary" onClick={() => editorApi.openLayoutModal()}>
            {ru ? 'Тема оформления…' : 'Decor theme…'}
          </button>
        </div>
        <div className="react-props-field" style={{ marginBottom: 8 }}>
          <span>{ru ? 'Макет слайда' : 'Slide layout'}</span>
          <div className="react-layout-chip-row">
            {SLIDE_CONTENT_LAYOUTS.map((L) => (
              <button
                key={L.id}
                type="button"
                className="react-layout-chip"
                onClick={() => editorApi.applySlideContentLayout(L.id)}
              >
                {ru ? L.nameRu : L.nameEn}
              </button>
            ))}
          </div>
        </div>
      </div>
      <SlidePropsPanel />
    </aside>
  );
}

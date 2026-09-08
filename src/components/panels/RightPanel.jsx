import React, { Suspense, lazy } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';

const ElementPropsPanel = lazy(() => import('./PropsPanel.jsx'));
const SlidePropsPanel = lazy(() => import('./SlidePropsPanel.jsx'));
const DrawingPanel = lazy(() => import('./DrawingPanel.jsx'));
const AnimPanel = lazy(() => import('./AnimPanel.jsx'));
const TransitionsPanel = lazy(() => import('./TransitionsPanel.jsx'));
const ObjectsPanel = lazy(() => import('./ObjectsPanel.jsx'));

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

function DefaultProps({ hasElement, hasConn, multi }) {
  if (multi > 1) {
    return (
      <section className="react-props-section">
        <div className="react-props-hdr">ВЫДЕЛЕНИЕ</div>
        <p className="react-props-muted">{multi} объект(ов)</p>
        <div className="react-props-actions">
          <button type="button" className="react-props-btn react-props-btn-warn" onClick={() => editorApi.deleteSelected()}>
            Удалить
          </button>
        </div>
      </section>
    );
  }
  if (hasElement || hasConn) return wrap(<ElementPropsPanel />);
  return wrap(<SlidePropsPanel />);
}

export default function RightPanel() {
  const activeTab = useUiStore((s) => s.activeTab);
  const drawTool = usePresentationStore((s) => s.drawTool);
  const selId = useSelectionStore((s) => s.selId);
  const multiSel = useSelectionStore((s) => s.multiSel);
  const selInkIds = useSelectionStore((s) => s.selInkIds);
  const selConnId = useSelectionStore((s) => s.selConnId);
  const multi = multiSel?.length || 0;
  const hasElement = !!(selId || multi > 0);
  const hasConn = !!selConnId;
  const hasInk = (selInkIds?.length || 0) > 0;
  const showDrawProps =
    isDrawPropsTool(drawTool) || (hasInk && (!drawTool || drawTool === 'cursor'));

  if (showDrawProps) {
    return (
      <aside className="react-right-panel" aria-label="Рисование" {...versionAttr('RightPanel')}>
        {wrap(<DrawingPanel />)}
      </aside>
    );
  }

  if (activeTab === 'anim') {
    return (
      <aside className="react-right-panel" {...versionAttr('RightPanel')}>
        {wrap(<AnimPanel />)}
      </aside>
    );
  }

  if (activeTab === 'transitions') {
    return (
      <aside className="react-right-panel" {...versionAttr('RightPanel')}>
        {wrap(<TransitionsPanel />)}
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
              <section className="react-props-section">
                <div className="react-props-hdr">ВЫДЕЛЕНИЕ</div>
                <p className="react-props-muted">{multi} объект(ов)</p>
                <div className="react-props-actions">
                  <button type="button" className="react-props-btn react-props-btn-warn" onClick={() => editorApi.deleteSelected()}>
                    Удалить
                  </button>
                </div>
              </section>
            ) : hasElement || hasConn ? (
              <ElementPropsPanel />
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
      <DefaultProps hasElement={hasElement} hasConn={hasConn} multi={multi} />
    </aside>
  );
}

import React, { Suspense, lazy } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import { canDrawAngleBetweenSelected } from '../../editor/lineAngle.js';

const ElementPropsPanel = lazy(() => import('./PropsPanel.jsx'));
const SlidePropsPanel = lazy(() => import('./SlidePropsPanel.jsx'));
const DrawingPanel = lazy(() => import('./DrawingPanel.jsx'));
const AnimPanel = lazy(() => import('./AnimPanel.jsx'));
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

/** Shared "N objects selected" panel for the multi-select case, with a "Draw angle" button
 *  when the selection is exactly two joined line segments — this used to live only inside
 *  PropsPanel.jsx's own (differently-triggered, and for this case unreachable) multi-select
 *  branch, so it never actually rendered here where the real multi-select panel lives. */
function MultiSelectProps({ multi, multiSel }) {
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const els = slides[cur]?.els || [];
  const ids = (multiSel || []).map(String);
  const canDrawAngle = multi === 2 && canDrawAngleBetweenSelected(els, ids);
  return (
    <section className="react-props-section">
      <div className="react-props-hdr">ВЫДЕЛЕНИЕ</div>
      <p className="react-props-muted">
        {canDrawAngle ? 'Выбраны два связанных отрезка' : `${multi} объект(ов)`}
      </p>
      {canDrawAngle ? (
        <button
          type="button"
          className="react-props-btn"
          style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '8px 10px', marginBottom: 8 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editorApi.addLineAngleBetweenSelected()}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19h16" />
            <path d="M4 19L16 5" />
            <path d="M11 19A7 7 0 0 0 8.6 13.7" />
          </svg>
          Нарисовать угол
        </button>
      ) : null}
      <div className="react-props-actions">
        <button type="button" className="react-props-btn react-props-btn-warn" onClick={() => editorApi.deleteSelected()}>
          Удалить
        </button>
      </div>
    </section>
  );
}

function DefaultProps({ hasElement, hasConn, multi, multiSel }) {
  if (multi > 1) {
    return <MultiSelectProps multi={multi} multiSel={multiSel} />;
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

  if (activeTab === 'objects') {
    return (
      <aside className="react-right-panel" aria-label="Объекты" {...versionAttr('RightPanel')}>
        {wrap(
          <>
            <ObjectsPanel />
            {multi > 1 ? (
              <MultiSelectProps multi={multi} multiSel={multiSel} />
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
      <DefaultProps hasElement={hasElement} hasConn={hasConn} multi={multi} multiSel={multiSel} />
    </aside>
  );
}

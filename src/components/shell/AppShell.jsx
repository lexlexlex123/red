import React, { Suspense, lazy } from 'react';
import Ribbon from './Ribbon.jsx';
import RibbonBody from './ribbon/RibbonBody.jsx';
import { AnimTimelineDock } from './ribbon/AnimTimeline.jsx';
import Toast from './Toast.jsx';
import LoadingSplash from './LoadingSplash.jsx';
import SlideCanvas from '../canvas/SlideCanvas.jsx';
import ThumbStrip from '../canvas/ThumbStrip.jsx';
import RightPanel from '../panels/RightPanel.jsx';
import ColorBar from '../canvas/ColorBar.jsx';
import FileDropOverlay from './FileDropOverlay.jsx';
import PreviewOverlay from '../canvas/PreviewOverlay.jsx';
import { useUiStore } from '../../stores/uiStore';
import FindBar from './FindBar.jsx';
import FpsOverlay from './FpsOverlay.jsx';
import { versionAttr } from '../../editor/versions.js';

const SettingsModal = lazy(() => import('./SettingsModal.jsx'));
const ConfigModal = lazy(() => import('./ConfigModal.jsx'));
const AiModal = lazy(() => import('./AiModal.jsx'));
const ShapePicker = lazy(() => import('./ShapePicker.jsx'));
const ThemeModal = lazy(() => import('./ThemeModal.jsx'));
const LayoutModal = lazy(() => import('./LayoutModal.jsx'));
const AutoPlacePreviewModal = lazy(() => import('./AutoPlacePreviewModal.jsx'));
const LinkModal = lazy(() => import('./LinkModal.jsx'));
const HistoryModal = lazy(() => import('./HistoryModal.jsx'));
const IconPicker = lazy(() => import('./IconPicker.jsx'));
const ImagePicker = lazy(() => import('./ImagePicker.jsx'));
const FormulaModal = lazy(() => import('./FormulaModal.jsx'));
const HtmlFrameModal = lazy(() => import('./HtmlFrameModal.jsx'));
const CodeModal = lazy(() => import('./CodeModal.jsx'));
const MarkdownModal = lazy(() => import('./MarkdownModal.jsx'));
const SvgModal = lazy(() => import('./SvgModal.jsx'));
const AppletModal = lazy(() => import('./AppletModal.jsx'));
const PeriodicPicker = lazy(() => import('./PeriodicPicker.jsx'));
const TableModal = lazy(() => import('./TableModal.jsx'));
const ImportModal = lazy(() => import('./ImportModal.jsx'));
const PngExportModal = lazy(() => import('./PngExportModal.jsx'));

function LazyMount({ when, children }) {
  if (!when) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
}

export default function AppShell() {
  const previewOpen = useUiStore((s) => s.previewOpen);
  const panel = useUiStore((s) => s.panel);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const configOpen = useUiStore((s) => s.configOpen);
  const colorBarEnabled = useUiStore((s) => s.colorBarEnabled);
  const aiFabEnabled = useUiStore((s) => s.aiFabEnabled);
  const openAiModal = useUiStore((s) => s.openAiModal);
  const themeModalOpen = useUiStore((s) => s.themeModalOpen);
  const layoutModalOpen = useUiStore((s) => s.layoutModalOpen);
  const autoPlacePreviewOpen = useUiStore((s) => s.autoPlacePreviewOpen);
  const linkModalOpen = useUiStore((s) => s.linkModalOpen);
  const historyModalOpen = useUiStore((s) => s.historyModalOpen);
  const formulaModalOpen = useUiStore((s) => s.formulaModalOpen);
  const htmlFrameModalOpen = useUiStore((s) => s.htmlFrameModalOpen);
  const codeModalOpen = useUiStore((s) => s.codeModalOpen);
  const markdownModalOpen = useUiStore((s) => s.markdownModalOpen);
  const importModalOpen = useUiStore((s) => s.importModalOpen);
  const pngExportModalOpen = useUiStore((s) => s.pngExportModalOpen);
  const aiModalOpen = useUiStore((s) => s.aiModalOpen);
  const svgModalOpen = useUiStore((s) => s.svgModalOpen);
  const appletModalOpen = useUiStore((s) => s.appletModalOpen);
  const periodicPickerOpen = useUiStore((s) => s.periodicPickerOpen);
  const activeTab = useUiStore((s) => s.activeTab);
  const animTlDocked = useUiStore((s) => s.animTlDocked);
  const animTlDockH = useUiStore((s) => s.animTlDockH);
  const ribbonCollapsed = useUiStore((s) => s.ribbonCollapsed);

  return (
    <div
      className={`app-shell${activeTab === 'anim' && animTlDocked ? ' has-anim-tl-dock' : ''}${ribbonCollapsed ? ' ribbon-collapsed' : ''}`}
      style={
        activeTab === 'anim' && animTlDocked
          ? { '--anim-tl-dock-h': `${animTlDockH}px` }
          : undefined
      }
      {...versionAttr('AppShell')}
    >
      <LoadingSplash />
      <Ribbon />
      {ribbonCollapsed ? null : <RibbonBody />}
      <div className="app-shell-main">
        <ThumbStrip />
        <SlideCanvas />
        <FindBar />
        {colorBarEnabled ? <ColorBar /> : null}
        <RightPanel />
      </div>
      <FileDropOverlay />
      <LazyMount when={panel === 'shapes'}>
        <ShapePicker />
      </LazyMount>
      <LazyMount when={panel === 'icons'}>
        <IconPicker />
      </LazyMount>
      <LazyMount when={panel === 'images'}>
        <ImagePicker />
      </LazyMount>
      <LazyMount when={panel === 'table'}>
        <TableModal />
      </LazyMount>
      <LazyMount when={formulaModalOpen}>
        <FormulaModal />
      </LazyMount>
      <LazyMount when={htmlFrameModalOpen}>
        <HtmlFrameModal />
      </LazyMount>
      <LazyMount when={codeModalOpen}>
        <CodeModal />
      </LazyMount>
      <LazyMount when={markdownModalOpen}>
        <MarkdownModal />
      </LazyMount>
      <LazyMount when={svgModalOpen}>
        <SvgModal />
      </LazyMount>
      <LazyMount when={appletModalOpen}>
        <AppletModal />
      </LazyMount>
      <LazyMount when={periodicPickerOpen}>
        <PeriodicPicker />
      </LazyMount>
      <LazyMount when={importModalOpen}>
        <ImportModal />
      </LazyMount>
      <LazyMount when={pngExportModalOpen}>
        <PngExportModal />
      </LazyMount>
      <LazyMount when={themeModalOpen}>
        <ThemeModal />
      </LazyMount>
      <LazyMount when={layoutModalOpen}>
        <LayoutModal />
      </LazyMount>
      <LazyMount when={autoPlacePreviewOpen}>
        <AutoPlacePreviewModal />
      </LazyMount>
      <LazyMount when={linkModalOpen}>
        <LinkModal />
      </LazyMount>
      <LazyMount when={historyModalOpen}>
        <HistoryModal />
      </LazyMount>
      <LazyMount when={settingsOpen}>
        <SettingsModal />
      </LazyMount>
      <LazyMount when={configOpen}>
        <ConfigModal />
      </LazyMount>
      {aiFabEnabled ? (
        <button type="button" className="react-ai-fab" title="AI" onClick={openAiModal}>
          ✦
        </button>
      ) : null}
      <LazyMount when={aiModalOpen}>
        <AiModal />
      </LazyMount>
      {previewOpen ? <PreviewOverlay /> : null}
      {activeTab === 'anim' && animTlDocked ? <AnimTimelineDock /> : null}
      <FpsOverlay />
      <Toast />
    </div>
  );
}

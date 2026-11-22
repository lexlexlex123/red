import React, { Suspense, lazy, useEffect, useState } from 'react';
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
import { useMobileLayout } from '../../hooks/useMobileLayout.js';

const SettingsModal = lazy(() => import('./SettingsModal.jsx'));
const ConfigModal = lazy(() => import('./ConfigModal.jsx'));
const AiModal = lazy(() => import('./AiModal.jsx'));
const ShapePicker = lazy(() => import('./ShapePicker.jsx'));
const LegoPicker = lazy(() => import('./LegoPicker.jsx'));
const ThemeModal = lazy(() => import('./ThemeModal.jsx'));
const LayoutModal = lazy(() => import('./LayoutModal.jsx'));
const AutoPlacePreviewModal = lazy(() => import('./AutoPlacePreviewModal.jsx'));
const LinkModal = lazy(() => import('./LinkModal.jsx'));
const SymbolsModal = lazy(() => import('./SymbolsModal.jsx'));
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

function OfflineBanner() {
  const lang = useUiStore((s) => s.lang);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="offline-banner" role="status">
      {lang === 'en' ? 'Offline — showing cache. Missing asset.' : 'Офлайн — показ из кэша. Нет сети / нет ассета.'}
    </div>
  );
}

export default function AppShell() {
  const previewOpen = useUiStore((s) => s.previewOpen);
  const panel = useUiStore((s) => s.panel);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const configOpen = useUiStore((s) => s.configOpen);
  const colorBarEnabled = useUiStore((s) => s.colorBarEnabled);
  const mobilePropsOpen = useUiStore((s) => s.mobilePropsOpen);
  const setMobilePropsOpen = useUiStore((s) => s.setMobilePropsOpen);
  const isMobile = useMobileLayout();
  const showColorBar = colorBarEnabled && !isMobile;
  const aiFabEnabled = useUiStore((s) => s.aiFabEnabled);
  const openAiModal = useUiStore((s) => s.openAiModal);
  const themeModalOpen = useUiStore((s) => s.themeModalOpen);
  const layoutModalOpen = useUiStore((s) => s.layoutModalOpen);
  const autoPlacePreviewOpen = useUiStore((s) => s.autoPlacePreviewOpen);
  const linkModalOpen = useUiStore((s) => s.linkModalOpen);
  const symbolsModalOpen = useUiStore((s) => s.symbolsModalOpen);
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
  const thumbsCollapsed = useUiStore((s) => s.thumbsCollapsed);

  return (
    <div
      className={`app-shell${activeTab === 'anim' && animTlDocked ? ' has-anim-tl-dock' : ''}${ribbonCollapsed ? ' ribbon-collapsed' : ''}${thumbsCollapsed ? ' thumbs-collapsed' : ''}`}
      style={
        activeTab === 'anim' && animTlDocked
          ? { '--anim-tl-dock-h': `${animTlDockH}px` }
          : undefined
      }
      {...versionAttr('AppShell')}
    >
      <OfflineBanner />
      <LoadingSplash />
      <Ribbon />
      {ribbonCollapsed ? null : <RibbonBody />}
      <div
        className={`app-shell-main${showColorBar ? '' : ' color-bar-hidden'}${
          isMobile && mobilePropsOpen ? ' mobile-props-open' : ''
        }${thumbsCollapsed ? ' thumbs-collapsed' : ''}`}
      >
        <ThumbStrip />
        <SlideCanvas />
        <FindBar />
        {showColorBar ? <ColorBar /> : null}
        {isMobile && mobilePropsOpen ? (
          <button
            type="button"
            className="mobile-props-backdrop"
            aria-label="Close"
            onClick={() => setMobilePropsOpen(false)}
          />
        ) : null}
        <RightPanel />
      </div>
      <FileDropOverlay />
      <LazyMount when={panel === 'shapes'}>
        <ShapePicker />
      </LazyMount>
      <LazyMount when={panel === 'lego'}>
        <LegoPicker />
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
      <LazyMount when={symbolsModalOpen}>
        <SymbolsModal />
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

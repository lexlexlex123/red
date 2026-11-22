/** Bump a key when that React module’s user-facing behavior changes. */
export const APP_VERSION = '8.2.350';

export const COMPONENT_VERSIONS = {
  AppShell: '1.26.0',
  Ribbon: '1.90.1',
  RibbonBody: '1.50.0',
  SlideCanvas: '1.173.0',
  ThumbStrip: '1.30.2',
  ColorBar: '1.17.0',
  RightPanel: '1.37.0',
  TextPropsPanel: '1.124.0',
  SlidePropsPanel: '1.20.0',
  ObjectsPanel: '1.16.0',
  DrawingPanel: '1.9.0',
  DesignPanel: '1.3.0',
  AnimPanel: '1.38.0',
  AnimTimeline: '1.1.0',
  TransitionsPanel: '1.1.0',
  SlideshowPanel: '1.9.0',
  SlideshowRibbon: '1.6.0',
  DesignRibbon: '1.2.0',
  TransitionsRibbon: '1.0.0',
  ShapePicker: '1.9.0',
  LegoPicker: '1.4.0',
  TableModal: '1.2.0',
  IconPicker: '1.9.0',
  ImagePicker: '1.4.0',
  FormulaModal: '1.4.0',
  HtmlFrameModal: '1.1.0',
  CodeModal: '1.2.1',
  MarkdownModal: '1.1.0',
  SvgModal: '1.1.0',
  AppletModal: '1.6.2',
  FileDropOverlay: '1.1.0',
  SettingsModal: '1.11.0',
  ConfigModal: '1.7.0',
  ImportModal: '1.11.0',
  PngExportModal: '1.0.0',
  AiModal: '1.2.0',
  ThemeModal: '1.3.0',
  LayoutModal: '1.1.0',
  AutoPlacePreviewModal: '1.0.0',
  PreviewOverlay: '1.139.0',
  PresenterView: '1.1.0',
  AlignBar: '1.10.0',
  Toast: '1.0.0',
  LoadingSplash: '1.2.0',
  FindBar: '1.2.0',
  GSlider: '1.3.0',
  ColorField: '1.4.1',
  PeriodicPicker: '1.2.0',
  CanvasCtxMenu: '1.6.0',
};

const LS_KEY = 'sf_react_component_versions';

export function readStoredComponentVersions() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
}

/** Compare current registry with last boot; persist new map. */
export function consumeComponentUpdates() {
  const prev = readStoredComponentVersions();
  const updates = [];
  Object.keys(COMPONENT_VERSIONS).forEach((id) => {
    const to = COMPONENT_VERSIONS[id];
    const from = prev[id] || null;
    if (from !== to) updates.push({ id, from, to, isNew: !from });
  });
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(COMPONENT_VERSIONS));
  } catch (e) {}
  return updates;
}

export function versionAttr(id) {
  return {
    'data-component': id,
    'data-version': COMPONENT_VERSIONS[id] || '0.0.0',
  };
}

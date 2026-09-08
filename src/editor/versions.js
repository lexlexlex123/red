/** Bump a key when that React module’s user-facing behavior changes. */
export const APP_VERSION = '8.2.198';

export const COMPONENT_VERSIONS = {
  AppShell: '1.23.0',
  Ribbon: '1.86.0',
  RibbonBody: '1.49.0',
  SlideCanvas: '1.120.0',
  ThumbStrip: '1.24.0',
  ColorBar: '1.15.0',
  RightPanel: '1.24.0',
  TextPropsPanel: '1.97.0',
  SlidePropsPanel: '1.14.0',
  ObjectsPanel: '1.15.0',
  DrawingPanel: '1.9.0',
  DesignPanel: '1.3.0',
  AnimPanel: '1.32.0',
  AnimTimeline: '1.1.0',
  TransitionsPanel: '1.1.0',
  SlideshowPanel: '1.6.0',
  SlideshowRibbon: '1.3.0',
  DesignRibbon: '1.2.0',
  TransitionsRibbon: '1.0.0',
  ShapePicker: '1.8.0',
  TableModal: '1.1.0',
  IconPicker: '1.9.0',
  ImagePicker: '1.4.0',
  FormulaModal: '1.4.0',
  HtmlFrameModal: '1.1.0',
  CodeModal: '1.1.0',
  MarkdownModal: '1.1.0',
  SvgModal: '1.1.0',
  AppletModal: '1.2.0',
  FileDropOverlay: '1.1.0',
  SettingsModal: '1.11.0',
  ConfigModal: '1.4.0',
  ImportModal: '1.6.0',
  PngExportModal: '1.0.0',
  AiModal: '1.2.0',
  ThemeModal: '1.3.0',
  LayoutModal: '1.1.0',
  AutoPlacePreviewModal: '1.0.0',
  PreviewOverlay: '1.73.0',
  AlignBar: '1.8.0',
  Toast: '1.0.0',
  LoadingSplash: '1.1.0',
  FindBar: '1.2.0',
  GSlider: '1.3.0',
  ColorField: '1.4.0',
  PeriodicPicker: '1.2.0',
  CanvasCtxMenu: '1.4.0',
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

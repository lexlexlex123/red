import { create } from 'zustand';

const PRES_DISPLAY_KEY = 'sf_pres_display';

function loadPresDisplay() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PRES_DISPLAY_KEY) : null;
    if (!raw) return { footer: true, sidenav: true, esc: true };
    const o = JSON.parse(raw);
    return {
      footer: typeof o.footer === 'boolean' ? o.footer : true,
      sidenav: typeof o.sidenav === 'boolean' ? o.sidenav : true,
      esc: typeof o.esc === 'boolean' ? o.esc : true,
    };
  } catch (e) {
    return { footer: true, sidenav: true, esc: true };
  }
}

function savePresDisplay(footer, sidenav, esc) {
  try {
    localStorage.setItem(
      PRES_DISPLAY_KEY,
      JSON.stringify({ footer: !!footer, sidenav: !!sidenav, esc: !!esc })
    );
  } catch (e) {}
}

const _presDisp = loadPresDisplay();

function lsGet(key, fallback = null) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}

function loadSnapStep() {
  const n = parseInt(lsGet('sf-snap-step', '20'), 10);
  return Number.isFinite(n) && n >= 1 && n <= 50 ? n : 20;
}

/** Normalize extra-guide mode; old thirds/golden keys still map. */
export function extraGuidesKind(mode) {
  if (mode === 'grid' || mode === 'thirds') return 'grid';
  if (mode === 'margin' || mode === 'golden') return 'margin';
  if (mode === 'col2') return 'col2';
  if (mode === 'col3') return 'col3';
  return 'none';
}

export const useUiStore = create((set, get) => ({
  bootProgress: 12,
  bootMsg: 'Загрузка…',
  bootDone: false,
  settingsOpen: false,
  configOpen: false,
  themeModalOpen: false,
  layoutModalOpen: false,
  activeTab: 'home',
  panel: null,
  /** Image gallery target: null | { kind:'insert' } | { kind:'slideBg' } | { kind:'flip', elId, side } */
  imagePickMode: null,
  pendingRideConnId: null,
  toast: null,
  previewOpen: false,
  previewFrom: 0,
  componentUpdates: [],
  themeMode: typeof localStorage !== 'undefined' ? localStorage.getItem('sf-theme') || 'dark' : 'dark',
  lang: typeof localStorage !== 'undefined' ? localStorage.getItem('sf-lang') || 'ru' : 'ru',
  snapEnabled: lsGet('sf-snap', '1') !== '0',
  snapStep: loadSnapStep(),
  colorBarEnabled: lsGet('sf-color-bar', '1') !== '0',
  aiFabEnabled: lsGet('sf-ai-fab', '0') === '1',
  voiceLogEnabled: lsGet('sf-voice-log-btn', '0') === '1',
  fpsEnabled: lsGet('sf-fps', '0') === '1',
  canvasZoom: 1,
  curveEditMode: false,
  extraGuidesMode: 'none', // 'none' | 'grid' | 'margin' (aliases: thirds→grid, golden→margin)
  linkModalOpen: false,
  historyModalOpen: false,
  formulaModalOpen: false,
  htmlFrameModalOpen: false,
  codeModalOpen: false,
  markdownModalOpen: false,
  importModalOpen: false,
  pngExportModalOpen: false,
  aiModalOpen: false,
  svgModalOpen: false,
  appletModalOpen: false,
  periodicPickerOpen: false,
  periodicPickerMode: 'insert',
  periodicPickerElId: null,
  autoPlacePreviewOpen: false,
  /** Connector draw mode: null | { step: 1|2, fromId: string|null, type: 'line' } */
  connectorMode: null,
  animPlay: null, // { [elId]: { hidden?, cls?, dur?, live? } }
  animPlayStartedAt: null,
  /** True while ribbon/canvas slide-anim preview is running. */
  slideAnimPlaying: false,
  /** Pick canvas object as anim trigger: { elId, ai } */
  animTriggerPick: null,
  animTlPxPerMs: 0.08,
  animTlDocked: false,
  animTlDockH: 176,
  /** Slideshow session flags (not persisted). */
  presLoop: false,
  presShuffle: false,
  presAutoDelay: 5,
  /** Slideshow chrome (localStorage sf_pres_display). */
  presShowFooter: _presDisp.footer,
  presShowSideNav: _presDisp.sidenav,
  presShowEsc: _presDisp.esc,
  ribbonCollapsed:
    typeof localStorage !== 'undefined' && localStorage.getItem('sf_ribbon_collapsed') === '1',
  findOpen: false,
  findQuery: '',
  findReplace: '',
  findHit: -1,
  findFocusSeq: 0,
  findFocusReplace: false,
  cropModeElId: null,
  shapeReplaceId: null,
  /** When set, IconPicker applies the icon to this text element's list markers. */
  iconPickerForList: null,
  /** When set, IconPicker replaces this icon element's iconId. */
  iconPickerForEl: null,

  /** Request canvas to enter inline edit for element id (text/shape). */
  inlineEditRequestId: null,

  styleClipboard: null, // { type, patch }
  stylePaintMode: false,
  voiceListening: false,
  dictationOn: false,
  dictationMode: null,

  setBootProgress: (bootProgress, bootMsg) =>
    set((s) => ({
      bootProgress: Math.max(s.bootProgress || 0, bootProgress),
      bootMsg: bootMsg != null ? bootMsg : s.bootMsg,
    })),
  finishBoot: () => set({ bootDone: true, bootProgress: 100, bootMsg: 'Готово' }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openConfig: () => set({ configOpen: true }),
  closeConfig: () => set({ configOpen: false }),
  /** Close the topmost modal/overlay. Returns true if something was closed. */
  closeTopOverlay() {
    const s = get();
    if (s.previewOpen) return false;
    if (s.animTriggerPick) {
      get().clearAnimTriggerPick();
      return true;
    }
    if (s.cropModeElId) {
      get().setCropModeElId(null);
      return true;
    }
    if (s.autoPlacePreviewOpen) {
      get().closeAutoPlacePreview();
      return true;
    }
    if (s.periodicPickerOpen) {
      get().closePeriodicPicker();
      return true;
    }
    if (s.appletModalOpen) {
      get().closeAppletModal();
      return true;
    }
    if (s.svgModalOpen) {
      get().closeSvgModal();
      return true;
    }
    if (s.formulaModalOpen) {
      get().closeFormulaModal();
      return true;
    }
    if (s.htmlFrameModalOpen) {
      get().closeHtmlFrameModal();
      return true;
    }
    if (s.codeModalOpen) {
      get().closeCodeModal();
      return true;
    }
    if (s.markdownModalOpen) {
      get().closeMarkdownModal();
      return true;
    }
    if (s.pngExportModalOpen) {
      get().closePngExportModal();
      return true;
    }
    if (s.importModalOpen) {
      get().closeImportModal();
      return true;
    }
    if (s.linkModalOpen) {
      get().closeLinkModal();
      return true;
    }
    if (s.historyModalOpen) {
      get().closeHistoryModal();
      return true;
    }
    if (s.themeModalOpen) {
      get().closeThemeModal();
      return true;
    }
    if (s.layoutModalOpen) {
      get().closeLayoutModal();
      return true;
    }
    if (s.aiModalOpen) {
      get().closeAiModal();
      return true;
    }
    if (s.configOpen) {
      get().closeConfig();
      return true;
    }
    if (s.settingsOpen) {
      get().closeSettings();
      return true;
    }
    if (s.panel) {
      get().setPanel(null);
      return true;
    }
    if (s.findOpen) {
      get().closeFind();
      return true;
    }
    if (s.connectorMode) {
      get().cancelConnectorMode();
      return true;
    }
    if (s.stylePaintMode) {
      get().setStylePaintMode(false);
      return true;
    }
    return false;
  },
  openThemeModal: () => set({ themeModalOpen: true }),
  closeThemeModal: () => set({ themeModalOpen: false }),
  openLayoutModal: () => set({ layoutModalOpen: true }),
  closeLayoutModal: () => set({ layoutModalOpen: false }),
  openLinkModal: () => set({ linkModalOpen: true }),
  closeLinkModal: () => set({ linkModalOpen: false }),
  openHistoryModal: () => set({ historyModalOpen: true }),
  closeHistoryModal: () => set({ historyModalOpen: false }),
  openFormulaModal: () => set({ formulaModalOpen: true }),
  closeFormulaModal: () => set({ formulaModalOpen: false }),
  openHtmlFrameModal: () => set({ htmlFrameModalOpen: true }),
  closeHtmlFrameModal: () => set({ htmlFrameModalOpen: false }),
  openCodeModal: () => set({ codeModalOpen: true }),
  closeCodeModal: () => set({ codeModalOpen: false }),
  openMarkdownModal: () => set({ markdownModalOpen: true }),
  closeMarkdownModal: () => set({ markdownModalOpen: false }),
  openAiModal: () => set({ aiModalOpen: true }),
  closeAiModal: () => set({ aiModalOpen: false }),
  openSvgModal: () => set({ svgModalOpen: true }),
  closeSvgModal: () => set({ svgModalOpen: false }),
  openAppletModal: () => set({ appletModalOpen: true }),
  closeAppletModal: () => set({ appletModalOpen: false }),
  openPeriodicPicker: (opts = {}) =>
    set({
      periodicPickerOpen: true,
      periodicPickerMode: opts.mode === 'reselect' ? 'reselect' : 'insert',
      periodicPickerElId: opts.elId || null,
    }),
  closePeriodicPicker: () =>
    set({ periodicPickerOpen: false, periodicPickerElId: null }),
  openAutoPlacePreview: () => set({ autoPlacePreviewOpen: true }),
  closeAutoPlacePreview: () => set({ autoPlacePreviewOpen: false }),
  startConnectorMode: (type = 'line') =>
    set((s) => {
      if (s.connectorMode && s.connectorMode.type === type) {
        return { connectorMode: null };
      }
      return { connectorMode: { step: 1, fromId: null, type: type || 'line' } };
    }),
  cancelConnectorMode: () => set({ connectorMode: null }),
  setConnectorMode: (connectorMode) => set({ connectorMode: connectorMode || null }),
  openImportModal: () => set({ importModalOpen: true }),
  closeImportModal: () => set({ importModalOpen: false }),
  openPngExportModal: () => set({ pngExportModalOpen: true }),
  closePngExportModal: () => set({ pngExportModalOpen: false }),
  setAnimPlay: (animPlay) =>
    set((s) => ({
      animPlay: animPlay || null,
      animPlayStartedAt: animPlay
        ? s.animPlayStartedAt || (typeof performance !== 'undefined' ? performance.now() : Date.now())
        : null,
    })),
  setSlideAnimPlaying: (slideAnimPlaying) => set({ slideAnimPlaying: !!slideAnimPlaying }),
  setAnimTriggerPick: (animTriggerPick) => set({ animTriggerPick: animTriggerPick || null }),
  clearAnimTriggerPick: () => set({ animTriggerPick: null }),
  setAnimTlPxPerMs: (v) =>
    set({ animTlPxPerMs: Math.max(0.025, Math.min(0.35, Number(v) || 0.08)) }),
  zoomAnimTl: (dir) =>
    set((s) => ({
      animTlPxPerMs: Math.max(
        0.025,
        Math.min(0.35, (s.animTlPxPerMs || 0.08) * (dir > 0 ? 1.25 : 0.8))
      ),
    })),
  setAnimTlDocked: (animTlDocked) => set({ animTlDocked: !!animTlDocked }),
  setAnimTlDockH: (h) => set({ animTlDockH: Math.max(100, Math.min(420, Math.round(h) || 176)) }),
  togglePresLoop: () => set((s) => ({ presLoop: !s.presLoop })),
  togglePresShuffle: () => set((s) => ({ presShuffle: !s.presShuffle })),
  setPresAutoDelay: (v) =>
    set({ presAutoDelay: Math.max(1, Math.min(60, Math.round(Number(v) || 5))) }),
  togglePresShowFooter: () =>
    set((s) => {
      const presShowFooter = !s.presShowFooter;
      savePresDisplay(presShowFooter, s.presShowSideNav, s.presShowEsc);
      return { presShowFooter };
    }),
  togglePresShowSideNav: () =>
    set((s) => {
      const presShowSideNav = !s.presShowSideNav;
      savePresDisplay(s.presShowFooter, presShowSideNav, s.presShowEsc);
      return { presShowSideNav };
    }),
  togglePresShowEsc: () =>
    set((s) => {
      const presShowEsc = !s.presShowEsc;
      savePresDisplay(s.presShowFooter, s.presShowSideNav, presShowEsc);
      return { presShowEsc };
    }),
  toggleRibbonCollapsed: () =>
    set((s) => {
      const ribbonCollapsed = !s.ribbonCollapsed;
      try {
        localStorage.setItem('sf_ribbon_collapsed', ribbonCollapsed ? '1' : '0');
      } catch (e) {}
      return { ribbonCollapsed };
    }),
  setCropModeElId: (cropModeElId) => set({ cropModeElId: cropModeElId || null }),
  openFind: (opts = {}) =>
    set((s) => ({
      findOpen: true,
      findFocusSeq: (s.findFocusSeq || 0) + 1,
      findFocusReplace: !!opts.focusReplace,
    })),
  closeFind: () => set({ findOpen: false, findFocusReplace: false }),
  setFindQuery: (findQuery) => set({ findQuery: String(findQuery || ''), findHit: -1 }),
  setFindReplace: (findReplace) => set({ findReplace: String(findReplace || '') }),
  setFindHit: (findHit) => set({ findHit: findHit | 0 }),
  requestInlineEdit: (id) => set({ inlineEditRequestId: id || null }),
  clearInlineEditRequest: () => set({ inlineEditRequestId: null }),
  setStyleClipboard: (styleClipboard) => set({ styleClipboard: styleClipboard || null }),
  setStylePaintMode: (stylePaintMode) => set({ stylePaintMode: !!stylePaintMode }),
  setVoiceListening: (voiceListening) => set({ voiceListening: !!voiceListening }),
  setDictationOn: (dictationOn, dictationMode = null) =>
    set({ dictationOn: !!dictationOn, dictationMode: dictationOn ? dictationMode || 'text' : null }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setPanel: (panel) =>
    set((s) => ({
      panel,
      shapeReplaceId: panel ? s.shapeReplaceId : null,
      iconPickerForList: panel === 'icons' ? s.iconPickerForList : null,
      iconPickerForEl: panel === 'icons' ? s.iconPickerForEl : null,
      imagePickMode: panel === 'images' ? s.imagePickMode : null,
    })),
  setImagePickMode: (imagePickMode) => set({ imagePickMode: imagePickMode || null }),
  setIconPickerForList: (id) => set({ iconPickerForList: id || null }),
  setIconPickerForEl: (id) => set({ iconPickerForEl: id || null }),
  setPendingRideConnId: (pendingRideConnId) => set({ pendingRideConnId: pendingRideConnId || null }),
  showToast: (msg, type = '') => set({ toast: { msg, type, id: Date.now() } }),
  clearToast: () => set({ toast: null }),
  openPreview: (from = 0) => set({ previewOpen: true, previewFrom: from | 0 }),
  closePreview: () => set({ previewOpen: false }),
  setComponentUpdates: (componentUpdates) => set({ componentUpdates }),
  setThemeMode: (themeMode) => {
    try {
      localStorage.setItem('sf-theme', themeMode);
    } catch (e) {}
    if (themeMode === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
    document.documentElement.style.colorScheme = themeMode === 'light' ? 'light' : 'dark';
    set({ themeMode });
  },
  setLang: (lang) => {
    try {
      localStorage.setItem('sf-lang', lang);
    } catch (e) {}
    set({ lang });
  },
  setSnapEnabled: (snapEnabled) => {
    lsSet('sf-snap', snapEnabled ? '1' : '0');
    set({ snapEnabled: !!snapEnabled });
  },
  setSnapStep: (n) => {
    const snapStep = Math.max(1, Math.min(50, Math.round(+n || 20)));
    lsSet('sf-snap-step', String(snapStep));
    set({ snapStep });
  },
  setColorBarEnabled: (on) => {
    lsSet('sf-color-bar', on ? '1' : '0');
    set({ colorBarEnabled: !!on });
  },
  setAiFabEnabled: (on) => {
    lsSet('sf-ai-fab', on ? '1' : '0');
    set({ aiFabEnabled: !!on });
  },
  setVoiceLogEnabled: (on) => {
    lsSet('sf-voice-log-btn', on ? '1' : '0');
    set({ voiceLogEnabled: !!on });
  },
  setFpsEnabled: (on) => {
    lsSet('sf-fps', on ? '1' : '0');
    set({ fpsEnabled: !!on });
  },
  setExtraGuidesMode: (mode) => set({ extraGuidesMode: extraGuidesKind(mode) }),
  toggleExtraGuides: (mode) =>
    set((s) => {
      const next = extraGuidesKind(mode);
      const cur = extraGuidesKind(s.extraGuidesMode);
      return { extraGuidesMode: cur === next ? 'none' : next };
    }),
  setCanvasZoom: (z) => {
    // Lazy import avoided — clamp lives in canvasViewport (no store cycle).
    const n = Number(z) || 1;
    set({ canvasZoom: Math.max(0.25, Math.min(20, n)) });
  },
  resetCanvasZoom: () => set({ canvasZoom: 1 }),
  setCurveEditMode: (on) => set({ curveEditMode: !!on }),
}));

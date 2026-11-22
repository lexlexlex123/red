import { create } from 'zustand';
import { useSelectionStore } from './selectionStore.js';

const PRES_DISPLAY_KEY = 'sf_pres_display';

function loadPresDisplay() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PRES_DISPLAY_KEY) : null;
    if (!raw) return { footer: true, sidenav: true, esc: true, brush: true, showScreen: '' };
    const o = JSON.parse(raw);
    return {
      footer: typeof o.footer === 'boolean' ? o.footer : true,
      sidenav: typeof o.sidenav === 'boolean' ? o.sidenav : true,
      esc: typeof o.esc === 'boolean' ? o.esc : true,
      brush: typeof o.brush === 'boolean' ? o.brush : true,
      showScreen: typeof o.showScreen === 'string' ? o.showScreen : '',
    };
  } catch (e) {
    return { footer: true, sidenav: true, esc: true, brush: true, showScreen: '' };
  }
}

function savePresDisplay(footer, sidenav, esc, showScreen, brush) {
  try {
    localStorage.setItem(
      PRES_DISPLAY_KEY,
      JSON.stringify({
        footer: !!footer,
        sidenav: !!sidenav,
        esc: !!esc,
        brush: brush !== false,
        showScreen: String(showScreen || ''),
      })
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

export const DEFAULT_TEXT_QUICK_SIZES = { h1: 40, h2: 36, h3: 32, h4: 20, p: 18 };

function loadTextQuickSizes() {
  const out = { ...DEFAULT_TEXT_QUICK_SIZES };
  try {
    const raw = lsGet('sf-text-quick-sizes', '');
    const o = raw ? JSON.parse(raw) : {};
    for (const k of Object.keys(out)) {
      const n = Math.round(+o[k]);
      if (Number.isFinite(n)) out[k] = Math.max(8, Math.min(200, n));
    }
  } catch (e) {}
  return out;
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
  /** Image gallery target: null | { kind:'insert' } | { kind:'slideBg' } | { kind:'flip', elId, side } | { kind:'shapeFill', elId } */
  imagePickMode: null,
  /** Shape fill-image transform edit (move / rotate / resize inside the shape). */
  shapeFillImgEditId: null,
  pendingRideConnId: null,
  toast: null,
  previewOpen: false,
  previewFrom: 0,
  componentUpdates: [],
  themeMode: typeof localStorage !== 'undefined' ? localStorage.getItem('sf-theme') || 'light' : 'light',
  lang: typeof localStorage !== 'undefined' ? localStorage.getItem('sf-lang') || 'ru' : 'ru',
  snapEnabled: lsGet('sf-snap', '1') !== '0',
  snapStep: loadSnapStep(),
  textQuickSizes: loadTextQuickSizes(),
  colorBarEnabled: lsGet('sf-color-bar', '1') !== '0',
  aiFabEnabled: lsGet('sf-ai-fab', '0') === '1',
  voiceLogEnabled: lsGet('sf-voice-log-btn', '0') === '1',
  fpsEnabled: lsGet('sf-fps', '0') === '1',
  canvasZoom: 1,
  curveEditMode: false,
  curveNodeSel: [],
  shapeNodeMode: false,
  /** Edit/manage deck-wide custom guides (Design → Guides). */
  guidesEditMode: false,
  /**
   * Live «Трансформация»: edit end-state of anim on canvas/props.
   * { elId, ai } while capturing the «to» snapshot.
   */
  transformEditMode: null,
  /** Show deck-wide guides on every slide (and use them for snap). Persisted. */
  guidesVisible: lsGet('sf_guides_visible', '1') !== '0',
  selGuideId: null,
  hfxHoverId: null,
  extraGuidesMode: 'none', // 'none' | 'grid' | 'margin' (aliases: thirds→grid, golden→margin)
  linkModalOpen: false,
  /** Inline link under caret while editing text/table: { href, hover, hostId, cellR, cellC } */
  caretLink: null,
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
  /** Pick canvas object as audio trigger: { audioElId, slideIdx } */
  mediaTriggerPick: null,
  /** Pick canvas object as timer start trigger: { timerElId, slideIdx } */
  timerTriggerPick: null,
  /** Selected image-sort marker id (while imagesort applet is selected). */
  imageSortMarkerId: null,
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
  presShowBrush: _presDisp.brush !== false,
  presShowScreenKey: _presDisp.showScreen || '',
  ribbonCollapsed:
    typeof localStorage !== 'undefined' && localStorage.getItem('sf_ribbon_collapsed') === '1',
  thumbsCollapsed:
    typeof localStorage !== 'undefined' && localStorage.getItem('sf_thumbs_collapsed') === '1',
  /** Mobile (≤900px): properties sheet open as overlay. */
  mobilePropsOpen: false,
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
  /** Optional paragraph indices for list marker icon apply (null = all bullets). */
  iconPickerListLines: null,
  /** When set, IconPicker replaces this icon element's iconId. */
  iconPickerForEl: null,

  /** Request canvas to enter inline edit for element id (text/shape). */
  inlineEditRequestId: null,
  /** Clear existing text when entering edit (type-to-replace). */
  inlineEditClear: false,
  /** First character to insert after clear/focus. */
  inlineEditSeed: null,
  symbolsModalOpen: false,

  styleClipboard: null, // { type, patch }
  stylePaintMode: false,
  /** Table border pencil: null | { color, width, erase } */
  tableBorderPaint: null,
  stylePipetteTargets: null,
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
    if (s.mediaTriggerPick) {
      get().clearMediaTriggerPick();
      return true;
    }
    if (s.timerTriggerPick) {
      get().clearTimerTriggerPick();
      return true;
    }
    if (s.cropModeElId) {
      get().setCropModeElId(null);
      return true;
    }
    if (s.shapeFillImgEditId) {
      get().setShapeFillImgEditId(null);
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
    if (s.symbolsModalOpen) {
      get().closeSymbolsModal();
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
    if (s.tableBorderPaint) {
      get().setTableBorderPaint(null);
      return true;
    }
    if (s.stylePipetteTargets) {
      get().setStylePipetteTargets(null);
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
  setCaretLink: (caretLink) => set({ caretLink: caretLink || null }),
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
  setAnimTriggerPick: (animTriggerPick) =>
    set({ animTriggerPick: animTriggerPick || null, mediaTriggerPick: null, timerTriggerPick: null }),
  clearAnimTriggerPick: () => set({ animTriggerPick: null }),
  setMediaTriggerPick: (mediaTriggerPick) =>
    set({ mediaTriggerPick: mediaTriggerPick || null, animTriggerPick: null, timerTriggerPick: null }),
  clearMediaTriggerPick: () => set({ mediaTriggerPick: null }),
  setTimerTriggerPick: (timerTriggerPick) =>
    set({ timerTriggerPick: timerTriggerPick || null, animTriggerPick: null, mediaTriggerPick: null }),
  clearTimerTriggerPick: () => set({ timerTriggerPick: null }),
  setImageSortMarkerId: (imageSortMarkerId) =>
    set({ imageSortMarkerId: imageSortMarkerId != null ? String(imageSortMarkerId) : null }),
  clearImageSortMarkerId: () => set({ imageSortMarkerId: null }),
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
      savePresDisplay(presShowFooter, s.presShowSideNav, s.presShowEsc, s.presShowScreenKey, s.presShowBrush);
      return { presShowFooter };
    }),
  togglePresShowSideNav: () =>
    set((s) => {
      const presShowSideNav = !s.presShowSideNav;
      savePresDisplay(s.presShowFooter, presShowSideNav, s.presShowEsc, s.presShowScreenKey, s.presShowBrush);
      return { presShowSideNav };
    }),
  togglePresShowEsc: () =>
    set((s) => {
      const presShowEsc = !s.presShowEsc;
      savePresDisplay(s.presShowFooter, s.presShowSideNav, presShowEsc, s.presShowScreenKey, s.presShowBrush);
      return { presShowEsc };
    }),
  togglePresShowBrush: () =>
    set((s) => {
      const presShowBrush = !s.presShowBrush;
      savePresDisplay(s.presShowFooter, s.presShowSideNav, s.presShowEsc, s.presShowScreenKey, presShowBrush);
      return { presShowBrush };
    }),
  setPresShowScreenKey: (key) =>
    set((s) => {
      const presShowScreenKey = String(key || '');
      savePresDisplay(s.presShowFooter, s.presShowSideNav, s.presShowEsc, presShowScreenKey, s.presShowBrush);
      return { presShowScreenKey };
    }),
  toggleRibbonCollapsed: () =>
    set((s) => {
      const ribbonCollapsed = !s.ribbonCollapsed;
      try {
        localStorage.setItem('sf_ribbon_collapsed', ribbonCollapsed ? '1' : '0');
      } catch (e) {}
      return { ribbonCollapsed };
    }),
  toggleThumbsCollapsed: () =>
    set((s) => {
      const thumbsCollapsed = !s.thumbsCollapsed;
      try {
        localStorage.setItem('sf_thumbs_collapsed', thumbsCollapsed ? '1' : '0');
      } catch (e) {}
      return { thumbsCollapsed };
    }),
  setCropModeElId: (cropModeElId) => set({ cropModeElId: cropModeElId || null }),
  setShapeFillImgEditId: (id) => set({ shapeFillImgEditId: id ? String(id) : null }),
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
  requestInlineEdit: (id, opts = {}) =>
    set({
      inlineEditRequestId: id || null,
      inlineEditClear: !!opts.clear,
      inlineEditSeed: opts.seed != null && opts.seed !== '' ? String(opts.seed) : null,
    }),
  /** Only drops the request id — clear/seed stay until the editor consumes them. */
  clearInlineEditRequest: () => set({ inlineEditRequestId: null }),
  clearInlineEditSeed: () => set({ inlineEditSeed: null }),
  consumeInlineEditFlags: () => set({ inlineEditClear: false, inlineEditSeed: null }),
  openSymbolsModal: () => set({ symbolsModalOpen: true }),
  closeSymbolsModal: () => {
    set({ symbolsModalOpen: false });
    // Restore text caret after any close path (X / outside / Esc / closeTopOverlay).
    void import('../editor/editorApi').then(({ editorApi }) => {
      editorApi.restoreSymbolsCaret?.();
    });
  },
  setStyleClipboard: (styleClipboard) => set({ styleClipboard: styleClipboard || null }),
  setStylePaintMode: (stylePaintMode) => set({ stylePaintMode: !!stylePaintMode }),
  setTableBorderPaint: (tableBorderPaint) => set({ tableBorderPaint: tableBorderPaint || null }),
  setStylePipetteTargets: (stylePipetteTargets) => set({ stylePipetteTargets: stylePipetteTargets || null }),
  setVoiceListening: (voiceListening) => set({ voiceListening: !!voiceListening }),
  setDictationOn: (dictationOn, dictationMode = null) =>
    set({ dictationOn: !!dictationOn, dictationMode: dictationOn ? dictationMode || 'text' : null }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setPanel: (panel) =>
    set((s) => ({
      panel,
      shapeReplaceId: panel ? s.shapeReplaceId : null,
      iconPickerForList: panel === 'icons' ? s.iconPickerForList : null,
      iconPickerListLines: panel === 'icons' ? s.iconPickerListLines : null,
      iconPickerForEl: panel === 'icons' ? s.iconPickerForEl : null,
      imagePickMode: panel === 'images' ? s.imagePickMode : null,
    })),
  setImagePickMode: (imagePickMode) => set({ imagePickMode: imagePickMode || null }),
  setIconPickerForList: (id) => set({ iconPickerForList: id || null }),
  setIconPickerListLines: (lines) =>
    set({
      iconPickerListLines: Array.isArray(lines) && lines.length ? lines.map((i) => +i) : null,
    }),
  setIconPickerForEl: (id) => set({ iconPickerForEl: id || null }),
  setPendingRideConnId: (pendingRideConnId) => set({ pendingRideConnId: pendingRideConnId || null }),
  showToast: (msg, type = '') => set({ toast: { msg, type, id: Date.now() } }),
  clearToast: () => set({ toast: null }),
  openPreview: (from = 0) => set({ previewOpen: true, previewFrom: from | 0 }),
  closePreview: () => {
    const tab = get().activeTab;
    // After show: drop stale selection so the right panel shows slide props
    // (selId from another slide left ElementPropsPanel empty).
    useSelectionStore.getState().clearSelection();
    set({
      previewOpen: false,
      // Anim/objects tabs hide plain slide props — return to home after show.
      activeTab: tab === 'anim' || tab === 'objects' ? 'home' : tab,
    });
  },
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
  setTextQuickSize: (id, n) => {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_TEXT_QUICK_SIZES, id)) return;
    const v = Math.max(8, Math.min(200, Math.round(+n || DEFAULT_TEXT_QUICK_SIZES[id])));
    const textQuickSizes = { ...get().textQuickSizes, [id]: v };
    lsSet('sf-text-quick-sizes', JSON.stringify(textQuickSizes));
    set({ textQuickSizes });
  },
  setColorBarEnabled: (on) => {
    lsSet('sf-color-bar', on ? '1' : '0');
    set({ colorBarEnabled: !!on });
  },
  setMobilePropsOpen: (on) => set({ mobilePropsOpen: !!on }),
  toggleMobileProps: () => set((s) => ({ mobilePropsOpen: !s.mobilePropsOpen })),
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
  setCurveEditMode: (on) =>
    set((s) => ({ curveEditMode: !!on, curveNodeSel: on ? s.curveNodeSel : [] })),
  setCurveNodeSel: (ids) => set({ curveNodeSel: Array.isArray(ids) ? ids.map((n) => +n) : [] }),
  setShapeNodeMode: (on) =>
    set((s) => ({ shapeNodeMode: !!on, shapeFillImgEditId: on ? null : s.shapeFillImgEditId })),
  setGuidesEditMode: (on) => {
    // Do not clear object selection — only switch the right-hand props panel.
    // Closing the panel leaves deck guides visible (unless guidesVisible is off).
    if (on) {
      set({
        guidesEditMode: true,
        shapeNodeMode: false,
        curveEditMode: false,
        curveNodeSel: [],
        transformEditMode: null,
      });
    } else {
      set({ guidesEditMode: false, selGuideId: null });
    }
  },
  setTransformEditMode: (mode) => {
    if (mode && mode.elId != null && mode.ai != null) {
      set({
        transformEditMode: { elId: String(mode.elId), ai: +mode.ai },
        guidesEditMode: false,
        selGuideId: null,
      });
    } else {
      set({ transformEditMode: null });
    }
  },
  setGuidesVisible: (on) => {
    const guidesVisible = !!on;
    lsSet('sf_guides_visible', guidesVisible ? '1' : '0');
    set({ guidesVisible });
  },
  toggleGuidesVisible: () => {
    const guidesVisible = !get().guidesVisible;
    lsSet('sf_guides_visible', guidesVisible ? '1' : '0');
    set({ guidesVisible });
  },
  setSelGuideId: (id) => set({ selGuideId: id != null ? String(id) : null }),
  setHfxHoverId: (id) => set({ hfxHoverId: id || null }),
}));

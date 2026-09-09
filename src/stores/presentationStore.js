import { create } from 'zustand';
import { applyThemeToSlides, getTheme, hydrateImportedTextColors, schemeSwatchColor } from '../editor/themes.js';
import { scheduleIdbSave } from '../editor/versionHistory.js';
import { pnDefaults } from '../editor/pagenum.js';
import { slimSlidesForPersist } from '../editor/mediaStore.js';
import { rebuildAppletHtml } from '../editor/applets.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H, DEFAULT_AR } from '../editor/canvasDims.js';
import { scaleSlidesToCanvas } from '../editor/scaleDeck.js';
import { fillHitsEraser, contourToSmoothPath } from '../editor/inkFill.js';
import {
  ensureAllInkHosts,
  ensureInkHostForItems,
  nextInkZ,
  pruneEmptyInkHosts,
  syncInkHostBBoxes,
} from '../editor/inkHost.js';
import { patchesSyncJoinsAfterMove } from '../editor/lineJoins.js';
import { normalizeLinesInSlides } from '../editor/lineGeom.js';

const LS_KEY = 'sf_react_v1';
const DEFAULT_THEME_IDX = 0;

function hydrateSlideApplets(slides, themeIdx) {
  const theme = getTheme(themeIdx);
  return (slides || []).map((s) => ({
    ...s,
    els: (s.els || []).map((el) => (el && el.type === 'applet' ? rebuildAppletHtml(el, theme) : el)),
  }));
}

function hydrateSlides(slides, themeIdx) {
  return normalizeLinesInSlides(hydrateSlideApplets(slides, themeIdx));
}

export const emptySlide = () => ({
  els: [],
  ink: [],
  inkFills: [],
  connectors: [],
  cameras: [],
  animOrder: [],
  lineJunctions: {},
  bg: 'solid',
  bgc: '#1e293b',
  bgImg: null,
  name: '',
  title: '',
  trans: null,
  transDur: 500,
});

function nextId(prefix = 'e') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function ensureElIds(els) {
  return (els || []).map((el) => {
    if (!el) return el;
    if (el.id) return el;
    return { ...el, id: nextId() };
  });
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function cloneSlideFresh(src) {
  const copy = clone(src);
  copy.els = (copy.els || []).map((el) => ({ ...el, id: nextId() }));
  copy.ink = (copy.ink || []).map((st) => ({ ...st, id: nextId('k') }));
  copy.inkFills = (copy.inkFills || []).map((f) => ({ ...f, id: nextId('f') }));
  copy.connectors = (copy.connectors || []).map((c) => ({ ...c, id: nextId('c') }));
  copy.cameras = (copy.cameras || []).map((c) => ({ ...c, id: nextId('cam') }));
  return copy;
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.slides) || !data.slides.length) return null;
    data.slides = hydrateSlides(data.slides, data.appliedThemeIdx);
    return data;
  } catch (e) {
    return null;
  }
}

function freshDeck() {
  const theme = getTheme(DEFAULT_THEME_IDX);
  const slides = theme ? applyThemeToSlides([emptySlide()], theme) : [emptySlide()];
  return {
    slides,
    cur: 0,
    canvasW: DEFAULT_CANVAS_W,
    canvasH: DEFAULT_CANVAS_H,
    ar: DEFAULT_AR,
    appliedThemeIdx: theme ? DEFAULT_THEME_IDX : -1,
    layoutIdx: -1,
    layoutAnimated: true,
    decorPausedAt: {},
    globalTrans: 'fade',
    globalTransDur: 500,
    title: 'Новая презентация',
    pnSettings: pnDefaults(),
  };
}

const saved = typeof localStorage !== 'undefined' ? loadSaved() : null;
const boot = saved
  ? {
      slides: saved.slides,
      cur: saved.cur || 0,
      canvasW: saved.canvasW || DEFAULT_CANVAS_W,
      canvasH: saved.canvasH || DEFAULT_CANVAS_H,
      ar: saved.ar || DEFAULT_AR,
      appliedThemeIdx:
        saved.appliedThemeIdx != null && saved.appliedThemeIdx >= 0
          ? saved.appliedThemeIdx
          : DEFAULT_THEME_IDX,
      layoutIdx: saved.layoutIdx != null ? saved.layoutIdx : -1,
      layoutAnimated: saved.layoutAnimated !== false,
      decorPausedAt:
        saved.layoutAnimated === false && saved.decorPausedAt && typeof saved.decorPausedAt === 'object'
          ? saved.decorPausedAt
          : {},
      globalTrans: saved.globalTrans || 'fade',
      globalTransDur: saved.globalTransDur > 0 ? saved.globalTransDur : 500,
      title: saved.title || 'Новая презентация',
      pnSettings: { ...pnDefaults(), ...(saved.pnSettings || {}) },
    }
  : freshDeck();

// If older save had no theme — apply first scheme once so palette matches v7.1 default
if (saved && (saved.appliedThemeIdx == null || saved.appliedThemeIdx < 0)) {
  const theme = getTheme(DEFAULT_THEME_IDX);
  if (theme) {
    boot.slides = applyThemeToSlides(boot.slides, theme);
    boot.appliedThemeIdx = DEFAULT_THEME_IDX;
  }
}
boot.slides = hydrateImportedTextColors(boot.slides, getTheme(boot.appliedThemeIdx));

export const usePresentationStore = create((set, get) => ({
  ...boot,
  ready: true,
  thumbEpoch: 0,
  thumbUrls: {},
  colorMode: 'bg',
  drawTool: 'cursor',
  drawColor: '#64748b',
  drawColorScheme: null,
  drawSize: 6,
  drawSmooth: 40,
  drawOpacity: 100,
  drawMarkerOpacity: 40,
  drawTaper: 'both',
  drawPressure: false,
  drawFillPattern: 'solid',
  drawFillOpacity: 55,
  drawFillGap: 10,
  drawNeonBright: 75,
  clipboard: null,
  slideClipboard: null,
  clipSource: 'elements',
  slideMultiSel: [],
  slideSelAnchor: 0,

  bumpThumbEpoch() {
    set({ thumbEpoch: (get().thumbEpoch || 0) + 1 });
  },

  persist() {
    try {
      const s = get();
      const payload = JSON.stringify({
        slides: slimSlidesForPersist(s.slides),
        cur: s.cur,
        title: s.title,
        canvasW: s.canvasW,
        canvasH: s.canvasH,
        ar: s.ar,
        appliedThemeIdx: s.appliedThemeIdx,
        layoutIdx: s.layoutIdx,
        layoutAnimated: s.layoutAnimated,
        decorPausedAt: s.layoutAnimated ? {} : s.decorPausedAt || {},
        globalTrans: s.globalTrans,
        globalTransDur: s.globalTransDur,
        pnSettings: s.pnSettings || pnDefaults(),
      });
      localStorage.setItem(LS_KEY, payload);
      scheduleIdbSave(payload);
    } catch (e) {}
  },

  setCanvasSize(w, h, ar) {
    set({
      canvasW: Math.max(320, Math.min(3840, Math.round(+w || DEFAULT_CANVAS_W))),
      canvasH: Math.max(180, Math.min(3840, Math.round(+h || DEFAULT_CANVAS_H))),
      ar: ar || get().ar,
    });
    get().persist();
  },

  /** Resize canvas and proportionally move/scale slide elements (legacy setAR). */
  resizeCanvasScaled(w, h, ar) {
    const W = Math.max(320, Math.min(3840, Math.round(+w || DEFAULT_CANVAS_W)));
    const H = Math.max(180, Math.min(3840, Math.round(+h || DEFAULT_CANVAS_H)));
    const oldW = get().canvasW || DEFAULT_CANVAS_W;
    const oldH = get().canvasH || DEFAULT_CANVAS_H;
    // scaleSlidesToCanvas scales line endpoints (preserves joins / angles).
    const slides = scaleSlidesToCanvas(clone(get().slides), oldW, oldH, W, H).map((s) =>
      s ? { ...s, ar: ar || s.ar } : s
    );
    set({ slides, canvasW: W, canvasH: H, ar: ar || get().ar });
    get().persist();
  },

  setPnSettings(patch) {
    const pnSettings = { ...pnDefaults(), ...(get().pnSettings || {}), ...patch };
    set({ pnSettings });
    get().persist();
  },

  restoreSnapshot(data) {
    set({
      slides: data.slides,
      cur: data.cur,
      title: data.title,
      canvasW: data.canvasW,
      canvasH: data.canvasH,
      ar: data.ar,
      appliedThemeIdx: data.appliedThemeIdx != null ? data.appliedThemeIdx : get().appliedThemeIdx,
      layoutIdx: data.layoutIdx != null ? data.layoutIdx : get().layoutIdx,
    });
    get().persist();
  },

  setTitle: (title) => {
    set({ title: String(title || '') });
    get().persist();
  },
  setCur: (cur) => set({ cur: Math.max(0, Math.min((get().slides.length || 1) - 1, cur | 0)) }),
  clearSlideMultiSel() {
    set({ slideMultiSel: [], slideSelAnchor: get().cur });
  },
  getSlideSelection() {
    const n = get().slides.length || 1;
    const sel = (get().slideMultiSel || []).filter((i) => i >= 0 && i < n);
    if (sel.length) return [...new Set(sel)].sort((a, b) => a - b);
    return [get().cur];
  },
  pickSlideWithMod(i, e) {
    const n = get().slides.length || 1;
    i = Math.max(0, Math.min(n - 1, i | 0));
    const shift = !!(e && e.shiftKey);
    const ctrl = !!(e && (e.ctrlKey || e.metaKey));
    if (shift) {
      const anchor = get().slideSelAnchor != null ? get().slideSelAnchor : get().cur;
      const from = Math.min(anchor, i);
      const to = Math.max(anchor, i);
      const slideMultiSel = [];
      for (let j = from; j <= to; j++) slideMultiSel.push(j);
      set({ slideMultiSel, cur: i });
      return;
    }
    if (ctrl) {
      let sel = [...(get().slideMultiSel || [])];
      if (!sel.length) sel = [get().cur];
      const idx = sel.indexOf(i);
      if (idx >= 0) {
        sel = sel.filter((x) => x !== i);
        if (!sel.length) {
          set({ slideMultiSel: [], cur: i, slideSelAnchor: i });
          return;
        }
        const cur = get().cur === i ? sel.slice().sort((a, b) => a - b)[0] : get().cur;
        set({ slideMultiSel: sel, cur, slideSelAnchor: i });
      } else {
        sel.push(i);
        set({ slideMultiSel: sel, cur: i, slideSelAnchor: i });
      }
      return;
    }
    set({ slideMultiSel: [], cur: i, slideSelAnchor: i });
  },
  setColorMode: (colorMode) => set({ colorMode }),
  setDrawTool: (drawTool) => set({ drawTool: drawTool || 'cursor' }),
  setDrawColor: (drawColor, drawColorScheme = undefined) =>
    set({
      drawColor: drawColor || '#64748b',
      ...(drawColorScheme !== undefined ? { drawColorScheme: drawColorScheme || null } : {}),
    }),
  setDrawColorScheme: (drawColorScheme) => set({ drawColorScheme: drawColorScheme || null }),
  setDrawSize: (drawSize) => set({ drawSize: Math.max(0.5, Math.min(64, Number(drawSize) || 4)) }),
  setDrawNeonBright: (drawNeonBright) =>
    set({ drawNeonBright: Math.max(0, Math.min(100, Number(drawNeonBright) || 75)) }),
  setDrawSmooth: (drawSmooth) => set({ drawSmooth: Math.max(0, Math.min(200, Number(drawSmooth) || 40)) }),
  setDrawOpacity: (drawOpacity) => set({ drawOpacity: Math.max(0, Math.min(100, Number(drawOpacity) || 100)) }),
  setDrawMarkerOpacity: (drawMarkerOpacity) =>
    set({ drawMarkerOpacity: Math.max(5, Math.min(100, Number(drawMarkerOpacity) || 40)) }),
  setDrawTaper: (drawTaper) =>
    set({ drawTaper: drawTaper === 'out' || drawTaper === 'in' ? drawTaper : 'both' }),
  setDrawPressure: (drawPressure) => set({ drawPressure: !!drawPressure }),
  setDrawFillPattern: (drawFillPattern) =>
    set({
      drawFillPattern: ['solid', 'fadeOut', 'fadeIn', 'lines', 'hatch', 'dots'].includes(drawFillPattern)
        ? drawFillPattern
        : 'solid',
    }),
  setDrawFillOpacity: (drawFillOpacity) =>
    set({ drawFillOpacity: Math.max(5, Math.min(100, Number(drawFillOpacity) || 55)) }),
  setDrawFillGap: (drawFillGap) => {
    const g = +drawFillGap;
    set({ drawFillGap: [0, 10, 20, 30, 50].includes(g) ? g : 10 });
  },

  patchSlide(i, patch) {
    const slides = clone(get().slides);
    if (!slides[i]) return;
    Object.assign(slides[i], patch);
    set({ slides });
    get().persist();
  },

  replaceSlideEls(i, els) {
    const slides = clone(get().slides);
    if (!slides[i]) return;
    slides[i].els = ensureElIds(els);
    set({ slides });
    get().persist();
  },

  replaceSlides(slides, cur) {
    set({
      slides: clone(slides),
      cur: cur != null ? cur : get().cur,
    });
    get().persist();
  },

  addSlide(at, draft) {
    const slides = clone(get().slides);
    const i = at == null ? slides.length : Math.max(0, Math.min(slides.length, at | 0));
    const next = draft ? { ...emptySlide(), ...clone(draft) } : emptySlide();
    if (!Array.isArray(next.els)) next.els = [];
    slides.splice(i, 0, next);
    set({ slides, cur: i, slideMultiSel: [], slideSelAnchor: i });
    get().persist();
  },

  dupSlide(i) {
    const slides = clone(get().slides);
    const src = slides[i];
    if (!src) return;
    const copy = cloneSlideFresh(src);
    slides.splice(i + 1, 0, copy);
    set({ slides, cur: i + 1, slideMultiSel: [], slideSelAnchor: i + 1 });
    get().persist();
  },

  copySlides(indices) {
    const slides = get().slides;
    const pack = (indices || [])
      .map((idx) => slides[idx])
      .filter(Boolean)
      .map((s) => clone(s));
    if (!pack.length) return 0;
    set({ slideClipboard: pack, clipboard: null, clipSource: 'slides' });
    return pack.length;
  },

  pasteSlides(at) {
    const pack = get().slideClipboard;
    if (!pack?.length) return 0;
    const slides = clone(get().slides);
    const i = Math.max(0, Math.min(slides.length, at == null ? slides.length : at | 0));
    const inserted = pack.map((s) => cloneSlideFresh(s));
    slides.splice(i, 0, ...inserted);
    const sel = inserted.map((_, k) => i + k);
    set({ slides, cur: i, slideMultiSel: sel, slideSelAnchor: i });
    get().persist();
    return inserted.length;
  },

  delSlides(indices) {
    const slides = clone(get().slides);
    const uniq = [...new Set(indices || [])]
      .filter((idx) => idx >= 0 && idx < slides.length)
      .sort((a, b) => b - a);
    if (!uniq.length) return 0;
    if (slides.length - uniq.length < 1) return 0;
    const wasCur = get().cur;
    uniq.forEach((idx) => slides.splice(idx, 1));
    let cur = wasCur;
    uniq.forEach((idx) => {
      if (idx < cur) cur -= 1;
    });
    if (uniq.includes(wasCur)) cur = Math.min(cur, slides.length - 1);
    cur = Math.max(0, Math.min(slides.length - 1, cur));
    set({ slides, cur, slideMultiSel: [], slideSelAnchor: cur });
    get().persist();
    return uniq.length;
  },

  delSlide(i) {
    const slides = clone(get().slides);
    if (slides.length <= 1) {
      set({ slides: [emptySlide()], cur: 0, slideMultiSel: [], slideSelAnchor: 0 });
      get().persist();
      return;
    }
    slides.splice(i, 1);
    const cur = Math.min(i, slides.length - 1);
    set({ slides, cur, slideMultiSel: [], slideSelAnchor: cur });
    get().persist();
  },

  moveSlide(from, to) {
    const slides = clone(get().slides);
    const n = slides.length;
    if (from < 0 || from >= n || to < 0 || to >= n || from === to) return;
    const [item] = slides.splice(from, 1);
    slides.splice(to, 0, item);
    const cur = get().cur;
    let nextCur = cur;
    if (cur === from) nextCur = to;
    else if (from < cur && to >= cur) nextCur = cur - 1;
    else if (from > cur && to <= cur) nextCur = cur + 1;
    set({ slides, cur: nextCur, slideMultiSel: [], slideSelAnchor: nextCur });
    get().persist();
  },

  reorderSlides(indices, insertAt) {
    const slides = clone(get().slides);
    const n = slides.length;
    const sorted = [...new Set(indices || [])].filter((i) => i >= 0 && i < n).sort((a, b) => a - b);
    if (!sorted.length) return;
    if (sorted.length === 1) {
      const from = sorted[0];
      if (from === insertAt || from === insertAt - 1) return;
      const [row] = slides.splice(from, 1);
      let to = insertAt;
      if (from < insertAt) to = insertAt - 1;
      slides.splice(to, 0, row);
      set({ slides, cur: to, slideMultiSel: [], slideSelAnchor: to });
      get().persist();
      return;
    }
    let to = insertAt == null ? n : insertAt | 0;
    sorted.forEach((idx) => {
      if (idx < insertAt) to -= 1;
    });
    if (to === sorted[0]) return;
    const curSlide = slides[get().cur];
    const selRefs = sorted.map((idx) => slides[idx]);
    for (let k = sorted.length - 1; k >= 0; k--) slides.splice(sorted[k], 1);
    slides.splice(Math.max(0, Math.min(slides.length, to)), 0, ...selRefs);
    const cur = Math.max(0, slides.indexOf(curSlide));
    const slideMultiSel = selRefs.map((ref) => slides.indexOf(ref)).filter((i) => i >= 0);
    set({ slides, cur, slideMultiSel, slideSelAnchor: slideMultiSel[0] ?? cur });
    get().persist();
  },

  newPresentation() {
    const deck = freshDeck();
    set({
      ...deck,
      thumbUrls: {},
      colorMode: 'bg',
      drawTool: 'cursor',
      slideMultiSel: [],
      slideSelAnchor: 0,
    });
    get().persist();
  },

  addElement(el) {
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) slides[i] = emptySlide();
    const item = { id: nextId(), rot: 0, elOpacity: 1, ...el };
    slides[i].els = [...(slides[i].els || []), item];
    set({ slides });
    get().persist();
    return item.id;
  },

  patchElement(id, data) {
    const slides = clone(get().slides);
    const i = get().cur;
    const els = slides[i]?.els || [];
    const el = els.find((e) => e && String(e.id) === String(id));
    if (!el) return;
    Object.assign(el, data);
    if (Object.prototype.hasOwnProperty.call(data, 'link') && !data.link) {
      delete el.link;
      delete el.linkt;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'linkt') && data.linkt == null) {
      delete el.linkt;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'morphName') && !data.morphName) {
      delete el.morphName;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'objHidden') && !data.objHidden) {
      delete el.objHidden;
    }
    if (
      Object.prototype.hasOwnProperty.call(data, 'lineMark') &&
      (!data.lineMark || data.lineMark === 'none')
    ) {
      delete el.lineMark;
    }
    set({ slides });
    get().persist();
  },

  /** Translate multiple elements by dx/dy (no history — caller handles undo).
   *  opts.live skips persist (use during continuous drag; persist on pointerup). */
  moveElements(ids, dx, dy, opts = {}) {
    const setIds = new Set((ids || []).map(String));
    if (!setIds.size || (!dx && !dy)) return;
    const state = get();
    const i = state.cur;
    if (!state.slides[i]) return;
    // Clone only the current slide — full-deck JSON clone was lagging every mousemove.
    const slides = state.slides.slice();
    const slide = clone(state.slides[i]);
    slides[i] = slide;
    const els = slide.els || [];
    els.forEach((el) => {
      if (!el || !setIds.has(String(el.id)) || el._isDecor) return;
      el.x = Math.round((el.x || 0) + dx);
      el.y = Math.round((el.y || 0) + dy);
    });
    // Keep joined line ends glued when only some members move
    const patches = patchesSyncJoinsAfterMove(slide, [...setIds]);
    Object.keys(patches || {}).forEach((id) => {
      const el = els.find((e) => e && String(e.id) === String(id));
      if (el) Object.assign(el, patches[id]);
    });
    set({ slides });
    if (!opts.live) get().persist();
  },

  /** Apply per-id patches. opts.live skips persist (during drag). */
  applyElementPatches(patches, opts = {}) {
    if (!patches || typeof patches !== 'object') return;
    const slides = clone(get().slides);
    const els = slides[get().cur]?.els || [];
    let n = 0;
    els.forEach((el) => {
      if (!el || el._isDecor) return;
      const p = patches[el.id] || patches[String(el.id)];
      if (!p) return;
      Object.assign(el, p);
      n += 1;
    });
    if (!n) return;
    set({ slides });
    if (!opts.live) get().persist();
  },

  /** Mutate current slide (+ els) then set. opts.live skips persist. */
  mutateCurrentSlide(fn, opts = {}) {
    if (typeof fn !== 'function') return;
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) return;
    if (!slides[i].lineJunctions) slides[i].lineJunctions = {};
    fn(slides[i]);
    set({ slides });
    if (!opts.live) get().persist();
  },

  addConnector(conn) {
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) return null;
    if (!slides[i].connectors) slides[i].connectors = [];
    const theme = getTheme(get().appliedThemeIdx);
    // Palette code "15" (col 0, row 4) — same default as lines / shape fill mid-tint.
    const colorScheme = { col: 0, row: 4 };
    const schemeColor = theme ? schemeSwatchColor(theme, colorScheme.col, colorScheme.row) : null;
    const item = {
      id: nextId('c'),
      route: 'curve',
      color: schemeColor || '#64748b',
      colorScheme,
      sw: 2,
      dash: 'solid',
      fromMarker: 'none',
      toMarker: 'none',
      gap: 0,
      opacity: 1,
      animated: false,
      ...conn,
    };
    slides[i].connectors.push(item);
    set({ slides });
    get().persist();
    return item.id;
  },

  patchConnector(id, patch, opts = {}) {
    const slides = clone(get().slides);
    const i = get().cur;
    const list = slides[i]?.connectors;
    if (!list) return;
    const c = list.find((x) => x && String(x.id) === String(id));
    if (!c) return;
    Object.assign(c, patch || {});
    if (Object.prototype.hasOwnProperty.call(patch || {}, 'objHidden') && !patch.objHidden) {
      delete c.objHidden;
    }
    set({ slides });
    if (!opts.live) get().persist();
  },

  deleteConnector(id) {
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]?.connectors) return;
    slides[i].connectors = slides[i].connectors.filter((c) => String(c.id) !== String(id));
    // Only remove elements whose rideConnId explicitly references this connector
    slides[i].els = (slides[i].els || []).filter((e) => {
      const rideConnId = e.rideConnId;
      return rideConnId == null || String(rideConnId) !== String(id);
    });
    set({ slides });
    get().persist();
  },

  deleteIds(ids) {
    const setIds = new Set((ids || []).map(String));
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) return;
    slides[i].els = (slides[i].els || []).filter((e) => !setIds.has(String(e.id)));
    if (slides[i].connectors) {
      slides[i].connectors = slides[i].connectors.filter(
        (c) => !setIds.has(String(c.fromId)) && !setIds.has(String(c.toId))
      );
    }
    set({ slides });
    get().persist();
  },

  /**
   * Reorder z-index. Moves whole groupId block; solo up/down jumps past groups.
   */
  layer(id, dir) {
    const slides = clone(get().slides);
    const els = slides[get().cur]?.els;
    if (!els?.length || !id) return;
    const idx = els.findIndex((e) => e && String(e.id) === String(id));
    if (idx < 0) return;
    const primary = els[idx];
    const gid = primary.groupId;
    const moveIds = new Set();
    if (gid) {
      els.forEach((e) => {
        if (e && e.groupId === gid) moveIds.add(String(e.id));
      });
    } else {
      moveIds.add(String(id));
    }

    const moving = els.filter((e) => e && moveIds.has(String(e.id)));
    const others = els.filter((e) => !(e && moveIds.has(String(e.id))));
    if (!moving.length) return;

    let insertAt = others.length;
    for (let i = 0; i < els.length; i++) {
      if (els[i] && moveIds.has(String(els[i].id))) {
        insertAt = els.slice(0, i).filter((e) => !(e && moveIds.has(String(e.id)))).length;
        break;
      }
    }

    let next;
    if (dir === 'front') {
      next = [...others, ...moving];
    } else if (dir === 'back') {
      let d = 0;
      while (d < others.length && others[d]?._isDecor) d++;
      next = [...others.slice(0, d), ...moving, ...others.slice(d)];
    } else if (dir === 'up') {
      if (insertAt >= others.length) return;
      let jump = insertAt;
      const nxt = others[jump];
      if (nxt?.groupId) {
        const g = nxt.groupId;
        while (jump < others.length && others[jump]?.groupId === g) jump++;
      } else {
        jump = insertAt + 1;
      }
      next = [...others.slice(0, jump), ...moving, ...others.slice(jump)];
    } else {
      if (insertAt <= 0) return;
      let jump = insertAt - 1;
      const prev = others[jump];
      if (prev?._isDecor) return;
      if (prev?.groupId) {
        const g = prev.groupId;
        while (jump > 0 && others[jump - 1]?.groupId === g) jump--;
      }
      next = [...others.slice(0, jump), ...moving, ...others.slice(jump)];
    }

    slides[get().cur].els = next;
    set({ slides });
    get().persist();
  },

  addInkStroke(stroke) {
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) slides[i] = emptySlide();
    const id = nextId('k');
    const item = {
      ...stroke,
      id,
      z: stroke.z != null ? stroke.z : nextInkZ(slides[i]),
    };
    slides[i].ink = [...(slides[i].ink || []), item];
    const layer = item.tool === 'marker' ? 'back' : 'front';
    ensureInkHostForItems(slides[i], [item], item.groupId || null, nextId, { layer });
    set({ slides });
    get().persist();
  },

  addInkFill(fill) {
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) slides[i] = emptySlide();
    const id = nextId('f');
    const item = {
      ...fill,
      id,
      z: fill.z != null ? fill.z : nextInkZ(slides[i]),
    };
    slides[i].inkFills = [...(slides[i].inkFills || []), item];
    ensureInkHostForItems(slides[i], [item], item.groupId || null, nextId);
    set({ slides });
    get().persist();
  },

  /** Migrate older slides that have ink without inkhost els. */
  ensureInkHosts() {
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) return false;
    if (!ensureAllInkHosts(slides[i], nextId)) return false;
    set({ slides });
    get().persist();
    return true;
  },

  /** Remove ink strokes that pass within `radius` of any eraser point. @returns {boolean} */
  eraseInkNear(points, radius = 16) {
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i] || !points?.length) return false;
    const r2 = radius * radius;
    const near = (st) =>
      (st.points || []).some((pt) => {
        const x = Array.isArray(pt) ? pt[0] : pt.x;
        const y = Array.isArray(pt) ? pt[1] : pt.y;
        return points.some(([px, py]) => {
          const dx = x - px;
          const dy = y - py;
          return dx * dx + dy * dy <= r2;
        });
      });
    let changed = false;
    if (slides[i].ink?.length) {
      const next = slides[i].ink.filter((st) => !near(st));
      if (next.length !== slides[i].ink.length) {
        slides[i].ink = next;
        changed = true;
      }
    }
    if (slides[i].inkFills?.length) {
      const nextF = slides[i].inkFills.filter(
        (f) => !points.some(([px, py]) => fillHitsEraser(f, px, py, radius))
      );
      if (nextF.length !== slides[i].inkFills.length) {
        slides[i].inkFills = nextF;
        changed = true;
      }
    }
    if (!changed) return false;
    pruneEmptyInkHosts(slides[i]);
    syncInkHostBBoxes(slides[i]);
    set({ slides });
    get().persist();
    return true;
  },

  clearInk() {
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) return;
    slides[i].ink = [];
    slides[i].inkFills = [];
    slides[i].els = (slides[i].els || []).filter((el) => !el || el.type !== 'inkhost');
    set({ slides });
    get().persist();
  },

  /** Patch strokes/fills by id. `patch` may be object or (item, kind) => patch. */
  patchInkByIds(ids, patch, opts = {}) {
    const idSet = new Set((ids || []).map(String).filter(Boolean));
    if (!idSet.size) return false;
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) return false;
    let changed = false;
    const apply = (item, kind) => {
      if (!item || !idSet.has(String(item.id))) return item;
      const p = typeof patch === 'function' ? patch(item, kind) : patch;
      if (!p || typeof p !== 'object') return item;
      changed = true;
      return { ...item, ...p };
    };
    if (slides[i].ink?.length) {
      slides[i].ink = slides[i].ink.map((s) => apply(s, 'stroke'));
    }
    if (slides[i].inkFills?.length) {
      slides[i].inkFills = slides[i].inkFills.map((f) => apply(f, 'fill'));
    }
    if (!changed) return false;
    syncInkHostBBoxes(slides[i]);
    set({ slides });
    if (opts.live) return true;
    get().persist();
    return true;
  },

  deleteInkByIds(ids) {
    const idSet = new Set((ids || []).map(String).filter(Boolean));
    if (!idSet.size) return false;
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) return false;
    let changed = false;
    if (slides[i].ink?.length) {
      const next = slides[i].ink.filter((s) => !s || !idSet.has(String(s.id)));
      if (next.length !== slides[i].ink.length) {
        slides[i].ink = next;
        changed = true;
      }
    }
    if (slides[i].inkFills?.length) {
      const next = slides[i].inkFills.filter((f) => !f || !idSet.has(String(f.id)));
      if (next.length !== slides[i].inkFills.length) {
        slides[i].inkFills = next;
        changed = true;
      }
    }
    if (!changed) return false;
    pruneEmptyInkHosts(slides[i]);
    set({ slides });
    get().persist();
    return true;
  },

  moveInkByIds(ids, dx, dy, opts = {}) {
    if ((!dx && !dy) || !ids?.length) return false;
    const idSet = new Set(ids.map(String));
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) return false;
    let changed = false;
    const shiftPts = (pts) =>
      (pts || []).map((p) => {
        if (Array.isArray(p)) return [+p[0] + dx, +p[1] + dy, p[2]];
        return { ...p, x: (+p.x || 0) + dx, y: (+p.y || 0) + dy };
      });
    if (slides[i].ink?.length) {
      slides[i].ink = slides[i].ink.map((s) => {
        if (!s || !idSet.has(String(s.id))) return s;
        changed = true;
        return { ...s, points: shiftPts(s.points) };
      });
    }
    if (slides[i].inkFills?.length) {
      slides[i].inkFills = slides[i].inkFills.map((f) => {
        if (!f || !idSet.has(String(f.id))) return f;
        changed = true;
        const points = shiftPts(f.points).map((p) =>
          Array.isArray(p) ? { x: +p[0] || 0, y: +p[1] || 0 } : { x: +p.x || 0, y: +p.y || 0 }
        );
        return { ...f, points, d: contourToSmoothPath(points) || f.d };
      });
    }
    if (!changed) return false;
    syncInkHostBBoxes(slides[i]);
    set({ slides });
    if (opts.live) return true;
    get().persist();
    return true;
  },

  copyInkByIds(ids, offset = 24) {
    const idSet = new Set((ids || []).map(String).filter(Boolean));
    if (!idSet.size) return [];
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) return [];
    const newIds = [];
    let zBase = nextInkZ(slides[i]);
    const shiftPts = (pts) =>
      (pts || []).map((p) => {
        if (Array.isArray(p)) return [+p[0] + offset, +p[1] + offset, p[2]];
        return { ...p, x: (+p.x || 0) + offset, y: (+p.y || 0) + offset };
      });
    const ink = [...(slides[i].ink || [])];
    const newStrokes = [];
    (slides[i].ink || []).forEach((s) => {
      if (!s || !idSet.has(String(s.id))) return;
      const id = nextId('k');
      newIds.push(id);
      const item = {
        ...clone(s),
        id,
        points: shiftPts(s.points),
        groupId: undefined,
        z: zBase++,
      };
      ink.push(item);
      newStrokes.push(item);
    });
    slides[i].ink = ink;
    const fills = [...(slides[i].inkFills || [])];
    const newFills = [];
    (slides[i].inkFills || []).forEach((f) => {
      if (!f || !idSet.has(String(f.id))) return;
      const id = nextId('f');
      newIds.push(id);
      const points = shiftPts(f.points).map((p) =>
        Array.isArray(p) ? { x: +p[0] || 0, y: +p[1] || 0 } : { x: +p.x || 0, y: +p.y || 0 }
      );
      const item = {
        ...clone(f),
        id,
        points,
        d: contourToSmoothPath(points) || f.d,
        groupId: undefined,
        z: zBase++,
      };
      fills.push(item);
      newFills.push(item);
    });
    slides[i].inkFills = fills;
    newStrokes.forEach((it) => ensureInkHostForItems(slides[i], [it], null, nextId));
    newFills.forEach((it) => ensureInkHostForItems(slides[i], [it], null, nextId));
    set({ slides });
    get().persist();
    return newIds;
  },

  dupElement(id) {
    const slides = clone(get().slides);
    const els = slides[get().cur]?.els || [];
    const el = els.find((e) => String(e.id) === String(id));
    if (!el) return null;
    const copy = clone(el);
    copy.id = nextId();
    copy.x = (copy.x || 0) + 24;
    copy.y = (copy.y || 0) + 24;
    els.push(copy);
    set({ slides });
    get().persist();
    return copy.id;
  },

  importDeck(data, opts = {}) {
    if (!data || !Array.isArray(data.slides) || !data.slides.length) return false;
    const fit = !!opts.fitToCurrentCanvas;
    const targetW = get().canvasW || DEFAULT_CANVAS_W;
    const targetH = get().canvasH || DEFAULT_CANVAS_H;
    const targetAr = get().ar || DEFAULT_AR;
    const srcW = Math.round(+data.canvasW || targetW);
    const srcH = Math.round(+data.canvasH || targetH);
    let slides = data.slides;
    let canvasW = srcW;
    let canvasH = srcH;
    let ar = data.ar || get().ar;
    if (fit && (srcW !== targetW || srcH !== targetH)) {
      slides = scaleSlidesToCanvas(slides, srcW, srcH, targetW, targetH);
      canvasW = targetW;
      canvasH = targetH;
      ar = targetAr;
    } else if (fit) {
      canvasW = targetW;
      canvasH = targetH;
      ar = targetAr;
    }
    set({
      slides: hydrateSlides(slides, data.appliedThemeIdx != null ? data.appliedThemeIdx : get().appliedThemeIdx),
      cur: Math.max(0, Math.min((data.cur | 0) || 0, slides.length - 1)),
      title: data.title != null ? String(data.title) : get().title,
      canvasW,
      canvasH,
      ar,
      appliedThemeIdx: data.appliedThemeIdx != null ? data.appliedThemeIdx : get().appliedThemeIdx,
      layoutIdx: data.layoutIdx != null ? data.layoutIdx : get().layoutIdx,
      layoutAnimated: data.layoutAnimated != null ? !!data.layoutAnimated : get().layoutAnimated,
      decorPausedAt:
        data.layoutAnimated === false && data.decorPausedAt && typeof data.decorPausedAt === 'object'
          ? data.decorPausedAt
          : {},
      globalTrans: data.globalTrans != null ? data.globalTrans : get().globalTrans,
      globalTransDur: data.globalTransDur != null ? data.globalTransDur : get().globalTransDur,
      slideMultiSel: [],
      slideSelAnchor: Math.max(0, Math.min((data.cur | 0) || 0, slides.length - 1)),
    });
    get().persist();
    return true;
  },

  exportDeck() {
    const s = get();
    return {
      v: 1,
      title: s.title,
      cur: s.cur,
      canvasW: s.canvasW,
      canvasH: s.canvasH,
      ar: s.ar,
      appliedThemeIdx: s.appliedThemeIdx,
      layoutIdx: s.layoutIdx,
      layoutAnimated: s.layoutAnimated,
      decorPausedAt: s.layoutAnimated ? {} : s.decorPausedAt || {},
      globalTrans: s.globalTrans,
      globalTransDur: s.globalTransDur,
      slides: s.slides,
    };
  },

  setAppliedThemeIdx(idx) {
    set({ appliedThemeIdx: idx == null ? -1 : idx | 0 });
    get().persist();
  },

  setLayoutAnimated(on) {
    set({ layoutAnimated: !!on });
    get().persist();
  },

  setDecorPausedAt(map) {
    const next =
      map && typeof map === 'object'
        ? Object.fromEntries(
            Object.entries(map).filter(([, v]) => v != null && Number.isFinite(+v)).map(([k, v]) => [String(k), +v])
          )
        : {};
    set({ decorPausedAt: next });
    get().persist();
  },

  /**
   * Reorder non-decor elements. `frontFirstIds` = panel order (index 0 = front / nearest).
   * Canvas array order stays back→front (last paints on top).
   */
  reorderElsFrontFirst(frontFirstIds) {
    const slides = clone(get().slides);
    const s = slides[get().cur];
    if (!s || !Array.isArray(frontFirstIds)) return;
    const els = s.els || [];
    const decor = els.filter((e) => e && e._isDecor);
    const rest = els.filter((e) => e && !e._isDecor);
    const byId = new Map(rest.map((e) => [String(e.id), e]));
    const orderedBackToFront = [];
    [...frontFirstIds].reverse().forEach((id) => {
      const el = byId.get(String(id));
      if (el) {
        orderedBackToFront.push(el);
        byId.delete(String(id));
      }
    });
    byId.forEach((el) => orderedBackToFront.push(el));
    s.els = [...decor, ...orderedBackToFront];
    set({ slides });
    get().persist();
  },

  setLayoutIdx(idx) {
    set({ layoutIdx: idx == null ? -1 : idx | 0 });
    get().persist();
  },

  replaceSlideDecor(slideIndex, decorEl) {
    const slides = clone(get().slides);
    const s = slides[slideIndex];
    if (!s) return;
    s.els = (s.els || []).filter((d) => !d._isDecor);
    if (decorEl) s.els.unshift(decorEl);
    set({ slides });
    get().persist();
  },

  clearAllDecor() {
    const slides = clone(get().slides);
    slides.forEach((s) => {
      s.els = (s.els || []).filter((d) => !d._isDecor);
    });
    set({ slides, layoutIdx: -1 });
    get().persist();
  },

  replaceDecorEls(builders) {
    if (!Array.isArray(builders)) return;
    const slides = clone(get().slides);
    let changed = false;
    slides.forEach((s, si) => {
      const decor = builders[si];
      if (!decor) return;
      s.els = (s.els || []).filter((d) => !d._isDecor);
      s.els.unshift(decor);
      changed = true;
    });
    if (!changed) return;
    set({ slides });
    get().persist();
  },

  applyDecorToAll(layoutIdx, builders) {
    const slides = clone(get().slides);
    slides.forEach((s, si) => {
      s.els = (s.els || []).filter((d) => !d._isDecor);
      const decor = builders[si];
      if (decor) s.els.unshift(decor);
    });
    set({ slides, layoutIdx: layoutIdx | 0 });
    get().persist();
  },

  /** Copy current slide bg + rebuild decor on every slide (legacy applySlideStyleToAll). */
  applySlideStyleFrom(srcIndex, builders, layoutIdx) {
    const slides = clone(get().slides);
    const src = slides[srcIndex];
    if (!src) return;
    const style = {
      bg: src.bg,
      bgc: src.bgc,
      bgScheme: src.bgScheme,
      bgImg: src.bgImg ? clone(src.bgImg) : null,
    };
    slides.forEach((s, i) => {
      if (i !== srcIndex) {
        s.bg = style.bg;
        s.bgc = style.bgc;
        if (style.bgScheme !== undefined) s.bgScheme = style.bgScheme;
        else delete s.bgScheme;
        if (style.bgImg) s.bgImg = clone(style.bgImg);
        else delete s.bgImg;
      }
      s.els = (s.els || []).filter((d) => !d._isDecor);
      const decor = builders[i];
      if (decor) s.els.unshift(decor);
    });
    set({ slides, layoutIdx: layoutIdx != null ? layoutIdx | 0 : -1 });
    get().persist();
  },

  applyTheme(theme, idx) {
    if (!theme) {
      set({ appliedThemeIdx: -1 });
      get().persist();
      return;
    }
    const slides = applyThemeToSlides(get().slides, theme).map((s) => ({
      ...s,
      els: (s.els || []).map((el) => (el && el.type === 'applet' ? rebuildAppletHtml(el, theme) : el)),
    }));
    set({ slides, appliedThemeIdx: idx | 0 });
    get().persist();
  },

  setGlobalTrans(id) {
    set({ globalTrans: id || 'none' });
    get().persist();
  },

  setGlobalTransDur(ms) {
    set({ globalTransDur: Math.max(0, +ms || 500) });
    get().persist();
  },

  applyTransitionToAll(id) {
    const slides = clone(get().slides);
    const curSlide = slides[get().cur] || {};
    const t = id || curSlide.trans || 'none';
    const dur =
      curSlide.transDur != null && +curSlide.transDur > 0
        ? +curSlide.transDur
        : Math.max(0, +get().globalTransDur || 500);
    slides.forEach((s) => {
      s.trans = t;
      s.transDur = dur;
    });
    set({ slides, globalTrans: t, globalTransDur: dur });
    get().persist();
  },

  applyAutoToAll(sec) {
    const v = Math.max(0, Math.min(120, +sec || 0));
    const slides = clone(get().slides);
    slides.forEach((s) => {
      s.auto = v;
    });
    set({ slides });
    get().persist();
  },

  groupElements(ids) {
    const list = (ids || []).map(String).filter(Boolean);
    if (list.length < 2) return null;
    const slides = clone(get().slides);
    const els = slides[get().cur]?.els || [];
    const gid = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    let n = 0;
    els.forEach((el) => {
      if (el && list.includes(String(el.id)) && !el._isDecor) {
        el.groupId = gid;
        n += 1;
      }
    });
    if (n < 2) return null;
    set({ slides });
    get().persist();
    return gid;
  },

  ungroupElements(ids) {
    const list = (ids || []).map(String).filter(Boolean);
    const slides = clone(get().slides);
    const els = slides[get().cur]?.els || [];
    const gids = new Set();
    els.forEach((el) => {
      if (el && list.includes(String(el.id)) && el.groupId) gids.add(el.groupId);
    });
    if (!gids.size) return 0;
    let n = 0;
    els.forEach((el) => {
      if (el && el.groupId && gids.has(el.groupId)) {
        delete el.groupId;
        n += 1;
      }
    });
    set({ slides });
    get().persist();
    return n;
  },

  addCamera(cam) {
    const slides = clone(get().slides);
    const s = slides[get().cur];
    if (!s) return null;
    if (!Array.isArray(s.cameras)) s.cameras = [];
    s.cameras.push(cam);
    set({ slides });
    get().persist();
    return cam.id;
  },

  removeCamera(camId) {
    const slides = clone(get().slides);
    const s = slides[get().cur];
    if (!s || !camId) return;
    s.cameras = (s.cameras || []).filter((c) => c.id !== camId);
    set({ slides });
    get().persist();
  },

  patchCamera(camId, patch, opts = {}) {
    const slides = clone(get().slides);
    const s = slides[get().cur];
    if (!s || !camId) return;
    if (!Array.isArray(s.cameras)) s.cameras = [];
    const cam = s.cameras.find((c) => c.id === camId);
    if (!cam) return;
    Object.assign(cam, patch);
    set({ slides });
    if (!opts.live) get().persist();
  },
}));

if (typeof localStorage !== 'undefined' && saved && (saved.appliedThemeIdx == null || saved.appliedThemeIdx < 0)) {
  try {
    usePresentationStore.getState().persist();
  } catch (e) {}
}

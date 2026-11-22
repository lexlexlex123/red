import { create } from 'zustand';
import { applyThemeToSlides, getTheme, hydrateImportedTextColors, schemeSwatchColor, THEMES } from '../editor/themes.js';
import { useUiStore } from './uiStore.js';
import { isQuotaError, scheduleIdbSave, scheduleLiveSave, idbLoadLive, idbClearLive } from '../editor/versionHistory.js';
import { pnDefaults, pnNormalize } from '../editor/pagenum.js';
import { slimSlidesForPersist, slimMediaEl } from '../editor/mediaStore.js';
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
import { inheritSectionsBeforeDelete } from '../editor/slideSections.js';
import { ensureSlideNums, nextSlideNum } from '../editor/slideElNum.js';
import { normalizeFontsInSlides } from '../editor/fonts.js';
import { liftGuidesFromSlides } from '../editor/slideGuides.js';
import { syncTransformRestFromElement } from '../editor/transformPlay.js';

const LS_KEY = 'sf_react_v1';
const DEFAULT_THEME_IDX = Math.max(0, THEMES.findIndex((theme) => theme.name === 'Clean White'));

function hydrateSlideApplets(slides, themeIdx) {
  const theme = getTheme(themeIdx);
  return (slides || []).map((s) => ({
    ...s,
    els: (s.els || []).map((el) => (el && el.type === 'applet' ? rebuildAppletHtml(el, theme) : el)),
  }));
}

function withStableSlideNums(slides) {
  return (slides || []).map((s) => {
    const { els } = ensureSlideNums(s?.els || []);
    return { ...s, els };
  });
}

function stripModel3dMesh(slides) {
  (slides || []).forEach((s) => {
    (s.els || []).forEach((el) => {
      if (el && el._mesh != null) delete el._mesh;
    });
  });
  return slides;
}

function hydrateSlides(slides, themeIdx) {
  return stripModel3dMesh(
    normalizeFontsInSlides(
      normalizeLinesInSlides(hydrateSlideApplets(withStableSlideNums(slides), themeIdx))
    )
  );
}

export const emptySlide = () => ({
  els: [],
  ink: [],
  inkFills: [],
  connectors: [],
  cameras: [],
  animOrder: [],
  lineJunctions: {},
  guides: [],
  bg: 'solid',
  bgc: '#1e293b',
  bgImg: null,
  name: '',
  title: '',
  trans: null,
  transDur: 500,
  hidden: false,
  notes: '',
  sectionTitle: '',
  sectionCollapsed: false,
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
  // Never serialize model3d._mesh — Float32Arrays become plain objects and the
  // WebGL viewer draws a blank box until objText is re-parsed.
  return JSON.parse(JSON.stringify(v, (k, val) => (k === '_mesh' ? undefined : val)));
}

function remapAnimOrderIds(order, elMap, camMap) {
  if (!Array.isArray(order)) return [];
  return order
    .map((e) => {
      if (!e) return null;
      if (e.kind === 'pause') return { ...e, id: e.id ? nextId('pau') : e.id };
      if (e.kind === 'repeat') {
        return {
          ...e,
          id: e.id ? nextId('rep') : e.id,
          children: remapAnimOrderIds(e.children || [], elMap, camMap),
        };
      }
      if (e.kind === 'camera') {
        const camId = camMap.get(String(e.camId));
        return camId ? { ...e, camId } : null;
      }
      if (e.elId != null) {
        const elId = elMap.get(String(e.elId));
        return elId ? { ...e, elId } : null;
      }
      return e;
    })
    .filter(Boolean);
}

function cloneSlideFresh(src) {
  const copy = clone(src);
  copy.id = nextId('s');

  const elMap = new Map();
  const groupMap = new Map();
  const inkMap = new Map();
  const fillMap = new Map();
  const camMap = new Map();

  copy.els = (copy.els || []).map((el) => {
    if (!el) return el;
    const oldId = String(el.id);
    const id = nextId();
    elMap.set(oldId, id);
    if (el.groupId) {
      const g = String(el.groupId);
      if (!groupMap.has(g)) groupMap.set(g, nextId('g'));
    }
    // Keep shared mediaId; drop heavy mediaSrc so duped slides don't re-embed audio bytes.
    return slimMediaEl({ ...el, id });
  });

  copy.ink = (copy.ink || []).map((st) => {
    if (!st) return st;
    const id = nextId('k');
    if (st.id != null) inkMap.set(String(st.id), id);
    return { ...st, id };
  });
  copy.inkFills = (copy.inkFills || []).map((f) => {
    if (!f) return f;
    const id = nextId('f');
    if (f.id != null) fillMap.set(String(f.id), id);
    return { ...f, id };
  });
  copy.cameras = (copy.cameras || []).map((c) => {
    if (!c) return c;
    const id = nextId('cam');
    if (c.id != null) camMap.set(String(c.id), id);
    return { ...c, id };
  });

  const mapElRef = (v) => (v != null && elMap.has(String(v)) ? elMap.get(String(v)) : v);
  const mapAnimRef = (ref) => {
    if (ref == null || ref === '') return ref;
    const s = String(ref);
    const m = s.match(/^([^:]+):(\d+)$/);
    if (m && elMap.has(m[1])) return `${elMap.get(m[1])}:${m[2]}`;
    return elMap.has(s) ? elMap.get(s) : ref;
  };

  copy.els = (copy.els || []).map((el) => {
    if (!el) return el;
    const next = { ...el };
    if (next.groupId && groupMap.has(String(next.groupId))) {
      next.groupId = groupMap.get(String(next.groupId));
    }
    if (next.tmStartElId) next.tmStartElId = mapElRef(next.tmStartElId);
    if (next.tmOnEndAnim) next.tmOnEndAnim = mapAnimRef(next.tmOnEndAnim);
    if (Array.isArray(next.inkIds)) {
      next.inkIds = next.inkIds.map((id) => (inkMap.has(String(id)) ? inkMap.get(String(id)) : id));
    }
    if (Array.isArray(next.anims)) {
      next.anims = next.anims.map((a) => {
        if (!a) return a;
        const anim = { ...a };
        if (anim.triggerElId) anim.triggerElId = mapElRef(anim.triggerElId);
        return anim;
      });
    }
    return next;
  });

  copy.connectors = (copy.connectors || []).map((c) => {
    if (!c) return c;
    return {
      ...c,
      id: nextId('c'),
      fromId: mapElRef(c.fromId),
      toId: mapElRef(c.toId),
    };
  });

  if (copy.lineJunctions && typeof copy.lineJunctions === 'object') {
    const junctions = {};
    Object.entries(copy.lineJunctions).forEach(([k, v]) => {
      junctions[mapElRef(k) || k] = v;
    });
    copy.lineJunctions = junctions;
  }

  copy.animOrder = remapAnimOrderIds(copy.animOrder || [], elMap, camMap);
  return copy;
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.idb && (!Array.isArray(data.slides) || !data.slides.length)) return null;
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
    /** Deck-wide guides — shown on every slide when visible. */
    guides: [],
  };
}

const saved = typeof localStorage !== 'undefined' ? loadSaved() : null;
const bootLifted = saved
  ? liftGuidesFromSlides(saved.slides, saved.guides)
  : { guides: [], slides: null };
const boot = saved
  ? {
      slides: bootLifted.slides,
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
      pnSettings: pnNormalize(saved.pnSettings || {}),
      guides: bootLifted.guides,
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
boot.slides = withStableSlideNums(
  hydrateImportedTextColors(boot.slides, getTheme(boot.appliedThemeIdx)),
);

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
    const s = get();
    const payload = {
      v: 1,
      savedAt: Date.now(),
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
      guides: Array.isArray(s.guides) ? s.guides : [],
    };
    scheduleLiveSave(payload, (err, quota) => {
      const ru = useUiStore.getState().lang !== 'en';
      useUiStore.getState().showToast(
        quota
          ? ru
            ? 'Не хватает места для сохранения. Сохраните файл (Ctrl+S) или удалите старые презентации.'
            : 'Storage is full. Save a file (Ctrl+S) or remove old presentations.'
          : ru
            ? 'Не удалось сохранить в браузере'
            : 'Could not save in the browser',
        'err'
      );
      console.warn('[persist] IDB error', err);
    });
    let str = '';
    try {
      str = JSON.stringify(payload);
      scheduleIdbSave(str);
    } catch (e) {
      console.warn('[persist] stringify', e);
    }
    try {
      if (str) localStorage.setItem(LS_KEY, str);
    } catch (e) {
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            idb: true,
            title: payload.title,
            ts: payload.savedAt,
            cur: payload.cur,
          })
        );
      } catch (_) {
        /* ignore pointer write */
      }
      if (isQuotaError(e)) {
        const ru = useUiStore.getState().lang !== 'en';
        useUiStore.getState().showToast(
          ru
            ? 'localStorage переполнен — презентация хранится в IndexedDB. Сохраните копию (Ctrl+S).'
            : 'localStorage is full — the deck is in IndexedDB. Save a copy (Ctrl+S).',
          'err'
        );
      }
    }
  },

  async hydrateFromIdb() {
    const rec = await idbLoadLive();
    const data = rec?.data;
    if (!data || !Array.isArray(data.slides) || !data.slides.length) return false;
    const localTs = (() => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed?.savedAt || 0;
      } catch (_) {
        return 0;
      }
    })();
    if (localTs && data.savedAt && data.savedAt < localTs - 2000) return false;
    const lifted = liftGuidesFromSlides(data.slides, data.guides);
    set({
      slides: hydrateSlides(lifted.slides, data.appliedThemeIdx),
      cur: Math.max(0, Math.min((data.cur | 0) || 0, data.slides.length - 1)),
      title: data.title != null ? String(data.title) : get().title,
      canvasW: data.canvasW || get().canvasW,
      canvasH: data.canvasH || get().canvasH,
      ar: data.ar || get().ar,
      appliedThemeIdx: data.appliedThemeIdx != null ? data.appliedThemeIdx : get().appliedThemeIdx,
      layoutIdx: data.layoutIdx != null ? data.layoutIdx : get().layoutIdx,
      layoutAnimated: data.layoutAnimated != null ? !!data.layoutAnimated : get().layoutAnimated,
      decorPausedAt: data.decorPausedAt && typeof data.decorPausedAt === 'object' ? data.decorPausedAt : get().decorPausedAt,
      globalTrans: data.globalTrans != null ? data.globalTrans : get().globalTrans,
      globalTransDur: data.globalTransDur != null ? data.globalTransDur : get().globalTransDur,
      pnSettings: data.pnSettings || get().pnSettings,
      guides: lifted.guides,
    });
    return true;
  },

  async clearPersistedSession() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch (_) {
      /* ignore */
    }
    await idbClearLive();
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
    const sx = W / Math.max(1, oldW);
    const sy = H / Math.max(1, oldH);
    const slides = scaleSlidesToCanvas(clone(get().slides), oldW, oldH, W, H).map((s) =>
      s ? { ...s, ar: ar || s.ar } : s
    );
    const guides = (get().guides || []).map((g) =>
      g
        ? {
            ...g,
            x: Math.round((+g.x || 0) * sx * 100) / 100,
            y: Math.round((+g.y || 0) * sy * 100) / 100,
          }
        : g
    );
    set({ slides, guides, canvasW: W, canvasH: H, ar: ar || get().ar });
    get().persist();
  },

  /**
   * Switch aspect ratio with per-format layout memory.
   * @param {object[]} slides already prepared (saved from-key + scaled or restored to-key)
   */
  applyAspectSlides(slides, w, h, ar) {
    const W = Math.max(320, Math.min(3840, Math.round(+w || DEFAULT_CANVAS_W)));
    const H = Math.max(180, Math.min(3840, Math.round(+h || DEFAULT_CANVAS_H)));
    const next = (slides || []).map((s) => (s ? { ...s, ar: ar || s.ar } : s));
    set({ slides: next, canvasW: W, canvasH: H, ar: ar || get().ar });
    get().persist();
  },

  setPnSettings(patch) {
    const pnSettings = pnNormalize({ ...get().pnSettings, ...patch });
    set({ pnSettings });
    get().persist();
  },

  restoreSnapshot(data) {
    const lifted = liftGuidesFromSlides(data.slides, data.guides);
    set({
      slides: lifted.slides,
      cur: data.cur,
      title: data.title,
      canvasW: data.canvasW,
      canvasH: data.canvasH,
      ar: data.ar,
      appliedThemeIdx: data.appliedThemeIdx != null ? data.appliedThemeIdx : get().appliedThemeIdx,
      layoutIdx: data.layoutIdx != null ? data.layoutIdx : get().layoutIdx,
      guides: lifted.guides,
    });
    get().persist();
  },

  /** Replace deck-wide guides. */
  setGuides(next, opts = {}) {
    set({ guides: Array.isArray(next) ? next : [] });
    if (!opts.live) get().persist();
  },

  /** Mutate a clone of deck guides (same pattern as mutateCurrentSlide). */
  mutateGuides(fn, opts = {}) {
    if (typeof fn !== 'function') return;
    const list = clone(Array.isArray(get().guides) ? get().guides : []);
    fn(list);
    set({ guides: list });
    if (!opts.live) get().persist();
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
    copy.sectionTitle = '';
    copy.sectionCollapsed = false;
    slides.splice(i + 1, 0, copy);
    set({ slides, cur: i + 1, slideMultiSel: [], slideSelAnchor: i + 1 });
    get().persist();
  },

  copySlides(indices) {
    const slides = get().slides;
    const pack = (indices || [])
      .map((idx) => slides[idx])
      .filter(Boolean)
      .map((s) => {
        const c = clone(s);
        c.els = (c.els || []).map((el) => slimMediaEl(el));
        return c;
      });
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
    inheritSectionsBeforeDelete(slides, uniq);
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
    inheritSectionsBeforeDelete(slides, [i]);
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
    const existing = slides[i].els || [];
    const want = Math.round(+item.slideNum);
    const taken = new Set(
      existing.map((e) => Math.round(+e?.slideNum)).filter((n) => Number.isFinite(n) && n >= 1),
    );
    if (!(want >= 1) || taken.has(want)) {
      item.slideNum = nextSlideNum(existing);
    } else {
      item.slideNum = want;
    }
    slides[i].els = [...existing, item];
    set({ slides });
    get().persist();
    return item.id;
  },

  /** Assign slideNum to elements that lack it; never renumbers existing. */
  ensureSlideNumsOnSlide(slideIdx) {
    const i = slideIdx == null ? get().cur : slideIdx;
    const slides = clone(get().slides);
    if (!slides[i]) return false;
    const { els, changed } = ensureSlideNums(slides[i].els || []);
    if (!changed) return false;
    slides[i].els = els;
    set({ slides });
    get().persist();
    return true;
  },

  /** Patch an element on a specific slide instead of the currently displayed slide. */
  patchElementOnSlide(slideIdx, id, data) {
    const slides = clone(get().slides);
    const els = slides[slideIdx]?.els || [];
    const el = els.find((e) => e && String(e.id) === String(id));
    if (!el) return false;
    Object.assign(el, data);
    if (Object.prototype.hasOwnProperty.call(data, 'link') && !data.link) {
      delete el.link;
      delete el.linkt;
    }
    set({ slides });
    get().persist();
    return true;
  },

  patchElement(id, data, opts = {}) {
    const state = get();
    const slides = opts.live ? state.slides.slice() : clone(state.slides);
    const i = state.cur;
    const els = slides[i]?.els || [];
    const elIdx = els.findIndex((e) => e && String(e.id) === String(id));
    if (elIdx < 0) return;
    const el = opts.live ? { ...els[elIdx] } : els[elIdx];
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
    // Outside transform capture: rest pose edits must refresh transform `from`
    // (and matching colors on `to`), otherwise playback keeps the old snapshot.
    if (!opts.skipTransformSync && data && !Object.prototype.hasOwnProperty.call(data, 'anims')) {
      const mode = useUiStore.getState().transformEditMode;
      if (!(mode && String(mode.elId) === String(id))) {
        const nextAnims = syncTransformRestFromElement(el, data);
        if (nextAnims) el.anims = nextAnims;
      }
    }
    if (opts.live) {
      const nextEls = els.slice();
      nextEls[elIdx] = el;
      slides[i] = { ...slides[i], els: nextEls };
    }
    set({ slides });
    if (!opts.live) get().persist();
  },

  /** Apply many element patches in one set (fill-image network sync, etc.). */
  patchElements(patchMap, opts = {}) {
    const entries = Object.entries(patchMap || {});
    if (!entries.length) return;
    const state = get();
    const i = state.cur;
    if (!state.slides[i]) return;
    const slides = opts.live ? state.slides.slice() : clone(state.slides);
    const baseEls = slides[i].els || [];
    const nextEls = opts.live ? baseEls.slice() : baseEls;
    const byId = new Map(nextEls.map((e, idx) => [String(e?.id), idx]));
    for (const [id, data] of entries) {
      const elIdx = byId.get(String(id));
      if (elIdx == null || !data) continue;
      const el = opts.live ? { ...nextEls[elIdx] } : nextEls[elIdx];
      Object.assign(el, data);
      if (opts.live) nextEls[elIdx] = el;
    }
    if (opts.live) slides[i] = { ...slides[i], els: nextEls };
    set({ slides });
    if (!opts.live) get().persist();
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
    const state = get();
    const slides = opts.live ? state.slides.slice() : clone(state.slides);
    const slideIdx = state.cur;
    const slide = slides[slideIdx];
    const els = slide?.els || [];
    let nextEls = els;
    let n = 0;
    els.forEach((el, idx) => {
      if (!el || el._isDecor) return;
      const p = patches[el.id] || patches[String(el.id)];
      if (!p) return;
      if (opts.live) {
        if (!n) {
          nextEls = els.slice();
          slides[slideIdx] = { ...slide, els: nextEls };
        }
        nextEls[idx] = Object.assign({ ...el }, p);
      } else {
        Object.assign(el, p);
      }
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

  /**
   * Merge several separately-hosted ink strokes/fills (e.g. from a rubber-band or shift
   * multi-select) into one combined inkhost, so a single animation (inkDraw in particular)
   * can address them all together instead of only the one host it happens to be attached
   * to. Reuses the same groupId-based consolidation ensureAllInkHosts already does for
   * migrating older decks — tag every item with a shared groupId, then rebuild just that
   * one host from them. @returns {string|null} the merged host's id.
   */
  mergeInkIntoOneHost(inkIds) {
    const ids = (inkIds || []).map(String).filter(Boolean);
    if (ids.length < 2) return null;
    const idSet = new Set(ids);
    const slides = clone(get().slides);
    const slide = slides[get().cur];
    if (!slide) return null;
    const gid = 'ig' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    let touched = 0;
    (slide.ink || []).forEach((s) => {
      if (s && idSet.has(String(s.id))) {
        s.groupId = gid;
        touched += 1;
      }
    });
    (slide.inkFills || []).forEach((f) => {
      if (f && idSet.has(String(f.id))) {
        f.groupId = gid;
        touched += 1;
      }
    });
    if (touched < 2) return null;
    const items = (slide.ink || [])
      .filter((s) => s && idSet.has(String(s.id)))
      .concat((slide.inkFills || []).filter((f) => f && idSet.has(String(f.id))));
    const host = ensureInkHostForItems(slide, items, gid, nextId);
    if (!host) return null;
    pruneEmptyInkHosts(slide);
    set({ slides });
    get().persist();
    return host.id;
  },

  /**
   * Undo mergeInkIntoOneHost: clear the shared groupId this host's strokes/fills were
   * merged under, drop the combined host itself, and let ensureAllInkHosts rebuild one
   * individual host per stroke again. @returns {number} strokes/fills split back out.
   */
  splitInkHost(hostId) {
    const slides = clone(get().slides);
    const i = get().cur;
    const slide = slides[i];
    if (!slide) return 0;
    const host = (slide.els || []).find(
      (e) => e && String(e.id) === String(hostId) && e.type === 'inkhost'
    );
    if (!host || !(host.inkIds || []).length) return 0;
    const idSet = new Set((host.inkIds || []).map(String));
    let touched = 0;
    (slide.ink || []).forEach((s) => {
      if (s && idSet.has(String(s.id)) && s.groupId) {
        s.groupId = null;
        touched += 1;
      }
    });
    (slide.inkFills || []).forEach((f) => {
      if (f && idSet.has(String(f.id)) && f.groupId) {
        f.groupId = null;
        touched += 1;
      }
    });
    if (!touched) return 0;
    slide.els = (slide.els || []).filter((e) => e && String(e.id) !== String(hostId));
    ensureAllInkHosts(slide, nextId);
    set({ slides });
    get().persist();
    return touched;
  },

  /** Remove ink strokes that pass within `radius` of any eraser point. @returns {boolean} */
  eraseInkNear(points, radius = 16, opts = {}) {
    const i = get().cur;
    const slidesBefore = get().slides;
    if (!slidesBefore[i] || !points?.length) return false;
    const r2 = radius * radius;
    // Point-to-segment squared distance (clamped projection onto [a,b]).
    const distSqToSeg = (px, py, ax, ay, bx, by) => {
      const abx = bx - ax;
      const aby = by - ay;
      const len2 = abx * abx + aby * aby;
      if (len2 < 1e-6) {
        const dx = px - ax;
        const dy = py - ay;
        return dx * dx + dy * dy;
      }
      let t = ((px - ax) * abx + (py - ay) * aby) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = ax + t * abx;
      const cy = ay + t * aby;
      const dx = px - cx;
      const dy = py - cy;
      return dx * dx + dy * dy;
    };
    // Both the eraser drag path *and* a stroke are polylines, not point clouds — checking
    // only point-to-point distance (as before) misses a hit whenever either side's points
    // are sparse relative to the other (a fast mouse move between two eraser samples, or a
    // long straight run of a stroke with few vertices): the two polylines can visibly cross
    // without any single pair of points landing within `radius` of each other. Testing each
    // side's points against the other side's *segments* catches that corridor-crossing case
    // in both directions without needing full segment-vs-segment intersection math.
    const near = (st) => {
      const sp = (st.points || []).map((pt) =>
        Array.isArray(pt) ? { x: +pt[0] || 0, y: +pt[1] || 0 } : { x: +pt.x || 0, y: +pt.y || 0 }
      );
      if (!sp.length) return false;
      for (let k = 0; k < points.length; k++) {
        const [px, py] = points[k];
        if (sp.length === 1) {
          const dx = sp[0].x - px;
          const dy = sp[0].y - py;
          if (dx * dx + dy * dy <= r2) return true;
        } else {
          for (let j = 1; j < sp.length; j++) {
            if (distSqToSeg(px, py, sp[j - 1].x, sp[j - 1].y, sp[j].x, sp[j].y) <= r2) return true;
          }
        }
      }
      if (points.length > 1) {
        for (let k = 0; k < sp.length; k++) {
          for (let i2 = 1; i2 < points.length; i2++) {
            const [ax, ay] = points[i2 - 1];
            const [bx, by] = points[i2];
            if (distSqToSeg(sp[k].x, sp[k].y, ax, ay, bx, by) <= r2) return true;
          }
        }
      }
      return false;
    };
    // Clone only the current slide, not the whole deck. This used to be
    // `clone(get().slides)` — a full JSON.parse(JSON.stringify(...)) of every slide — run on
    // every single pointermove sample while erasing, so cost scaled with total presentation
    // size rather than with how much ink there was to check, and made even the very first
    // erase (on pointerdown) feel delayed on anything but a tiny deck.
    const cur = clone(slidesBefore[i]);
    let changed = false;
    if (cur.ink?.length) {
      const next = cur.ink.filter((st) => !near(st));
      if (next.length !== cur.ink.length) {
        cur.ink = next;
        changed = true;
      }
    }
    if (cur.inkFills?.length) {
      const nextF = cur.inkFills.filter(
        (f) => !points.some(([px, py]) => fillHitsEraser(f, px, py, radius))
      );
      if (nextF.length !== cur.inkFills.length) {
        cur.inkFills = nextF;
        changed = true;
      }
    }
    if (!changed) return false;
    pruneEmptyInkHosts(cur);
    syncInkHostBBoxes(cur);
    const slides = slidesBefore.slice();
    slides[i] = cur;
    set({ slides });
    // `opts.live`: skip persist() during a continuous erase drag (mirrors moveInkByIds'
    // `{live:true}`) — the caller persists once when the gesture ends instead of on every
    // sample.
    if (opts.live) return true;
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

  /**
   * Scale ink strokes/fills belonging to `ids` from `fromBBox` to `toBBox` (both
   * {x,y,w,h}, in the same absolute/unrotated canvas space the points are stored in — any
   * rotation is applied later as a pure display transform on the host element, same as for
   * translation in moveInkByIds, so it doesn't need to be accounted for here).
   * Used when resizing an inkhost: previously resize only patched the host element's own
   * x/y/w/h, and since the rendered stroke content is positioned purely from its own
   * absolute point data (not from the host's box), the drawing never visibly changed size.
   */
  scaleInkByIds(ids, fromBBox, toBBox, opts = {}) {
    if (!ids?.length || !fromBBox || !toBBox) return false;
    if (!fromBBox.w || !fromBBox.h) return false;
    const idSet = new Set(ids.map(String));
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) return false;
    const sx = toBBox.w / fromBBox.w;
    const sy = toBBox.h / fromBBox.h;
    const tx = (x) => toBBox.x + (x - fromBBox.x) * sx;
    const ty = (y) => toBBox.y + (y - fromBBox.y) * sy;
    const scalePts = (pts) =>
      (pts || []).map((p) => {
        if (Array.isArray(p)) return [tx(+p[0] || 0), ty(+p[1] || 0), p[2]];
        return { ...p, x: tx(+p.x || 0), y: ty(+p.y || 0) };
      });
    const widthScale = Math.max(0.05, (Math.abs(sx) + Math.abs(sy)) / 2);
    let changed = false;
    if (slides[i].ink?.length) {
      slides[i].ink = slides[i].ink.map((s) => {
        if (!s || !idSet.has(String(s.id))) return s;
        changed = true;
        return {
          ...s,
          points: scalePts(s.points),
          width: s.width != null ? Math.max(0.5, (+s.width || 4) * widthScale) : s.width,
        };
      });
    }
    if (slides[i].inkFills?.length) {
      slides[i].inkFills = slides[i].inkFills.map((f) => {
        if (!f || !idSet.has(String(f.id))) return f;
        changed = true;
        const points = scalePts(f.points).map((p) =>
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

  /**
   * Rotate ink strokes/fills by `deltaDeg` around `pivot` ({x,y}), starting from the
   * `snapshot` point arrays (captured once when the gesture began) rather than whatever is
   * currently stored — so repeatedly calling this with the *total* delta for the drag so far
   * (the same pattern rotateGroupMembers already uses for regular elements) doesn't compound
   * rotation frame over frame. Used for a *grouped* multi-select that includes drawing
   * objects: rotating a group used to only patch each inkhost's own x/y/rot, which — since
   * the rendered stroke is positioned purely from its own absolute point data, not the host
   * box — just spun each drawing in place around its own center instead of orbiting the
   * whole group around one shared pivot like every other element type does.
   * @param snapshot {{strokes:[{id,points}], fills:[{id,points}]}}
   */
  rotateInkFromSnapshot(snapshot, pivot, deltaDeg, opts = {}) {
    if (!snapshot || !pivot) return false;
    const strokeMap = new Map((snapshot.strokes || []).map((s) => [String(s.id), s.points]));
    const fillMap = new Map((snapshot.fills || []).map((f) => [String(f.id), f.points]));
    if (!strokeMap.size && !fillMap.size) return false;
    const slides = clone(get().slides);
    const i = get().cur;
    if (!slides[i]) return false;
    const rad = (deltaDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const cx = pivot.x;
    const cy = pivot.y;
    const rot = (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
    };
    let changed = false;
    if (slides[i].ink?.length && strokeMap.size) {
      slides[i].ink = slides[i].ink.map((s) => {
        const orig = s && strokeMap.get(String(s.id));
        if (!orig) return s;
        changed = true;
        const points = orig.map((p) => {
          if (Array.isArray(p)) {
            const r = rot(+p[0] || 0, +p[1] || 0);
            return [r.x, r.y, p[2]];
          }
          const r = rot(+p.x || 0, +p.y || 0);
          return { ...p, x: r.x, y: r.y };
        });
        return { ...s, points };
      });
    }
    if (slides[i].inkFills?.length && fillMap.size) {
      slides[i].inkFills = slides[i].inkFills.map((f) => {
        const orig = f && fillMap.get(String(f.id));
        if (!orig) return f;
        changed = true;
        const points = orig
          .map((p) => {
            const px = Array.isArray(p) ? +p[0] || 0 : +p.x || 0;
            const py = Array.isArray(p) ? +p[1] || 0 : +p.y || 0;
            return rot(px, py);
          })
          .map((r) => ({ x: r.x, y: r.y }));
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

  dupElement(id, opts = {}) {
    const slides = clone(get().slides);
    const slide = slides[get().cur];
    const els = slide?.els || [];
    const el = els.find((e) => String(e.id) === String(id));
    if (!el) return null;
    const copy = slimMediaEl(clone(el));
    copy.id = nextId();
    copy.slideNum = nextSlideNum(els);
    copy.x = (copy.x || 0) + 24;
    copy.y = (copy.y || 0) + 24;
    // Keep multi-member groups together via groupMap; never stay linked to the originals.
    if (copy.groupId != null && copy.groupId !== '') {
      const g = String(copy.groupId);
      const map = opts.groupMap;
      if (map && map.has(g)) copy.groupId = map.get(g);
      else delete copy.groupId;
    }
    els.push(copy);
    // Keep timeline in sync — otherwise transform (etc.) sits on the el but not in animOrder
    // until ensureAnimOrder later appends it at the end in a surprising place.
    if (Array.isArray(copy.anims) && copy.anims.length) {
      if (!Array.isArray(slide.animOrder)) slide.animOrder = [];
      copy.anims.forEach((a, ai) => {
        if (a && a.name) slide.animOrder.push({ elId: copy.id, ai });
      });
    }
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
    const lifted = liftGuidesFromSlides(slides, data.guides);
    set({
      slides: hydrateSlides(lifted.slides, data.appliedThemeIdx != null ? data.appliedThemeIdx : get().appliedThemeIdx),
      cur: Math.max(0, Math.min((data.cur | 0) || 0, lifted.slides.length - 1)),
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
      guides: lifted.guides,
      slideMultiSel: [],
      slideSelAnchor: Math.max(0, Math.min((data.cur | 0) || 0, lifted.slides.length - 1)),
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
      guides: Array.isArray(s.guides) ? s.guides : [],
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

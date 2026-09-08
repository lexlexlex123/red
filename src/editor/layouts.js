/**
 * Decorative LAYOUTS from themes/ (v7.1 «Тема оформления»).
 * Loaded as classic scripts (shared window globals) — not ESM.
 */
import { installNotebookGlobals } from './notebookSvg.js';
import {
  THEMES,
  getTheme,
  schemeSwatchColor,
  solidColor,
} from './themes.js';
import { usePresentationStore } from '../stores/presentationStore.js';

installNotebookGlobals();

/** Theme script files (same order as themes/manifest.json / loader.js). */
const THEME_FILES = [
  '01-prism.js',
  '02-aurora.js',
  '03-grid-burst.js',
  '04-circuit.js',
  '05-origami.js',
  '06-halo.js',
  '07-dusk.js',
  '08-layers.js',
  '09-crystal.js',
  '10-metro.js',
  '11-topo.js',
  '12-cosmos.js',
  '13-ocean.js',
  '14-fire.js',
  '15-desert.js',
  '16-matrix.js',
  '17-forest.js',
  '18-storm.js',
  '19-city.js',
  '20-winter.js',
  '21-bloom.js',
  '22-wave.js',
  '23-sound.js',
  '24-mountains.js',
  '25-dna.js',
  '26-dust.js',
  '27-honeycomb.js',
  '28-galaxy.js',
  '29-caustics.js',
  '30-starfall.js',
  '31-sakura.js',
  '32-map.js',
  '33-ducks.js',
  '34-notebook-grid.js',
  '35-notebook-lined.js',
  '36-swamp.js',
  '37-tile.js',
];

const GL_RENDERER_VER = '20260906n';

const GL_RENDERER_FILES = [
  'renderers/gl-quality.js',
  'renderers/crystal-webgl.js',
  'renderers/dna-webgl.js',
  'renderers/galaxy-webgl.js',
  'renderers/caustics-webgl.js',
  'renderers/warp-canvas.js',
];

let loadPromise = null;
let glLoadPromise = null;
let svgUid = 0;

export function isGlDecorRenderer(r) {
  return r === 'crystal' || r === 'dna' || r === 'galaxy' || r === 'caustics' || r === 'warp';
}

/** True when this decor should mount a WebGL/canvas host (not every layoutIdx). */
export function decorUsesGl(el) {
  if (!el || !el._isDecor) return false;
  if (isGlDecorRenderer(el._decorRenderer)) return true;
  const L = getLayouts()[el._layoutIdx];
  if (!L) return false;
  if (isGlDecorRenderer(L.renderer)) return true;
  return L.nameEn === 'Cosmos' && el._decorStyle === 'void';
}

export function glApiForRenderer(r) {
  if (r === 'crystal' && typeof window.CrystalDecor !== 'undefined') return window.CrystalDecor;
  if (r === 'dna' && typeof window.DnaDecor !== 'undefined') return window.DnaDecor;
  if (r === 'galaxy' && typeof window.GalaxyDecor !== 'undefined') return window.GalaxyDecor;
  if (r === 'caustics' && typeof window.CausticsDecor !== 'undefined') return window.CausticsDecor;
  if (r === 'warp' && typeof window.WarpDecor !== 'undefined') return window.WarpDecor;
  return null;
}

function glRenderersCurrent() {
  return !!(
    window.GlQuality &&
    window.CrystalDecor &&
    window.DnaDecor &&
    window.DnaDecor._ver === GL_RENDERER_VER &&
    window.DnaDecor._api === 'v71' &&
    window.GalaxyDecor &&
    window.CausticsDecor &&
    window.WarpDecor
  );
}

/** Load WebGL/canvas decor renderer scripts once (reloads if DNA ver mismatches). */
export function ensureGlRenderersLoaded() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (glRenderersCurrent()) return Promise.resolve();
  if (glLoadPromise) return glLoadPromise;
  glLoadPromise = (async () => {
    for (const file of GL_RENDERER_FILES) {
      await loadScript('/themes/' + file + '?v=' + GL_RENDERER_VER);
    }
    if (!glRenderersCurrent()) {
      console.warn('[layouts] GL renderers stale after load', window.DnaDecor && window.DnaDecor._ver);
    }
  })().catch((e) => {
    glLoadPromise = null;
    throw e;
  });
  return glLoadPromise;
}

/**
 * Build / refresh _glCfg + _decorRenderer on a decor element (mutates + returns el).
 */
export function attachDecorGlCfg(el) {
  if (!el || !el._isDecor) return el;
  const L = getLayouts()[el._layoutIdx];
  // Layouts may not be loaded yet on first paint — keep existing GL fields.
  if (!L) return el;
  const { canvasW, canvasH, layoutAnimated } = usePresentationStore.getState();
  const [a1, a2] = decorAccents();
  const doAnim = !!(L.animated && layoutAnimated);
  const isTitle = el._decorStyle === 'title';
  let renderer = L.renderer || null;
  let cfg = null;

  if (renderer === 'crystal' && typeof L.buildCrystalCfg === 'function') {
    cfg = L.buildCrystalCfg(canvasW, canvasH, a1, a2, isTitle, doAnim);
  } else if (renderer === 'dna' && typeof L.buildDnaCfg === 'function') {
    cfg = L.buildDnaCfg(canvasW, canvasH, a1, a2, isTitle, doAnim);
  } else if (renderer === 'galaxy' && typeof L.buildGalaxyCfg === 'function') {
    cfg = L.buildGalaxyCfg(canvasW, canvasH, a1, a2, isTitle, doAnim);
  } else if (renderer === 'caustics' && typeof L.buildCausticsCfg === 'function') {
    cfg = L.buildCausticsCfg(canvasW, canvasH, a1, a2, isTitle, doAnim);
  } else {
    const isWarp =
      renderer === 'warp' || (L.nameEn === 'Cosmos' && el._decorStyle === 'void');
    if (isWarp && typeof L.buildWarpCfg === 'function') {
      renderer = 'warp';
      const warpTitle = el._decorStyle !== 'content';
      cfg = L.buildWarpCfg(canvasW, canvasH, a1, a2, warpTitle, doAnim);
      if (typeof L.glowSvg === 'function') {
        el.svgContent = L.glowSvg(canvasW, canvasH, a1, a2) || el.svgContent;
      }
    } else {
      renderer = null;
    }
  }

  if (cfg && renderer) {
    el._decorRenderer = renderer;
    el._glCfg = cfg;
    if (renderer === 'crystal') el._crystalCfg = cfg;
    else delete el._crystalCfg;
  } else {
    el._decorRenderer = L.renderer || null;
    delete el._glCfg;
    delete el._crystalCfg;
  }
  return el;
}

/** Resolve cfg for mount (always refreshes from layout + canvas). */
export function resolveDecorGlCfg(el) {
  if (!el) return null;
  attachDecorGlCfg(el);
  return el._glCfg || null;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const base = src.split('?')[0];
    const prev = document.querySelector(`script[data-layout-src="${base}"]`);
    if (prev) {
      if (prev.getAttribute('src') === src) {
        resolve();
        return;
      }
      prev.remove();
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.dataset.layoutSrc = base;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

function assembleLayouts() {
  const list = [
    window._THEME_01_PRISM,
    window._THEME_02_AURORA,
    window._THEME_03_GRID_BURST,
    window._THEME_04_CIRCUIT,
    window._THEME_05_ORIGAMI,
    window._THEME_06_HALO,
    window._THEME_07_DUSK,
    window._THEME_08_LAYERS,
    window._THEME_09_CRYSTAL,
    window._THEME_10_METRO,
    window._THEME_11_TOPO,
    window._THEME_12_COSMOS,
    window._THEME_13_OCEAN,
    window._THEME_14_FIRE,
    window._THEME_15_DESERT,
    window._THEME_16_MATRIX,
    window._THEME_17_FOREST,
    window._THEME_18_STORM,
    window._THEME_19_CITY,
    window._THEME_20_WINTER,
    window._THEME_21_BLOOM,
    window._THEME_22_WAVE,
    window._THEME_23_SOUND,
    window._THEME_24_MOUNTAINS,
    window._THEME_25_DNA,
    window._THEME_26_DUST,
    window._THEME_27_HONEYCOMB,
    window._THEME_28_GALAXY,
    window._THEME_29_CAUSTICS,
    window._THEME_30_STARFALL,
    window._THEME_31_SAKURA,
    window._THEME_32_MAP,
    window._THEME_33_DUCKS,
    window._THEME_34_NOTEBOOK_GRID,
    window._THEME_35_NOTEBOOK_LINED,
    window._THEME_36_SWAMP,
    window._THEME_37_TILE,
  ].filter(Boolean);
  window.LAYOUTS = list;
  return list;
}

/** Load all decorative theme scripts once. */
export function ensureLayoutsLoaded() {
  if (window.LAYOUTS && window.LAYOUTS.length) return Promise.resolve(window.LAYOUTS);
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    syncWindowThemeBridge();
    await loadScript('/themes/00-variants.js');
    await loadScript('/themes/forest/paths.js');
    await loadScript('/themes/forest/paths-content.js');
    await loadScript('/themes/forest/layout.js');
    for (const file of THEME_FILES) {
      await loadScript('/themes/' + file);
    }
    try {
      await ensureGlRenderersLoaded();
    } catch (e) {
      console.warn('GL decor renderers', e);
    }
    return assembleLayouts();
  })().catch((e) => {
    loadPromise = null;
    console.error(e);
    window.LAYOUTS = window.LAYOUTS || [];
    return window.LAYOUTS;
  });
  return loadPromise;
}

function syncWindowThemeBridge() {
  const st = usePresentationStore.getState();
  window.THEMES = THEMES;
  window.appliedThemeIdx = st.appliedThemeIdx;
  window.canvasW = st.canvasW;
  window.canvasH = st.canvasH;
  window._layoutAnimated = !!st.layoutAnimated;
  window._schemeSwatchColor = (theme, col, row) => schemeSwatchColor(theme, col, row);
  window._activeThemeForScheme = () => getTheme(st.appliedThemeIdx) || null;
  window._notebookLayoutSvg = window._notebookLayoutSvg || undefined;
  installNotebookGlobals();
}

export function getLayouts() {
  syncWindowThemeBridge();
  if (window.LAYOUTS && window.LAYOUTS.length) return window.LAYOUTS;
  return assembleLayouts();
}

export function layoutDisplayName(L, lang = 'ru') {
  if (!L) return '';
  return lang === 'en' ? L.nameEn || L.name || '' : L.name || L.nameEn || '';
}

export function decorAccents() {
  syncWindowThemeBridge();
  const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
  if (theme) return [theme.ac1 || '#6366f1', theme.ac2 || '#818cf8'];
  return ['#6366f1', '#818cf8'];
}

function isolateSvgIds(svg, uid) {
  if (!svg) return '';
  return svg
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${uid}_${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${uid}_${id})`)
    .replace(/\bhref="#([^"]+)"/g, (_, id) => `href="#${uid}_${id}"`)
    .replace(/\bxlink:href="#([^"]+)"/g, (_, id) => `xlink:href="#${uid}_${id}"`);
}

export function buildDecorSvg(layoutIdx, style = 'title', mirror = false, opts = {}) {
  syncWindowThemeBridge();
  const LAYOUTS = getLayouts();
  const L = LAYOUTS[layoutIdx];
  if (!L) return '';
  const { canvasW, canvasH } = usePresentationStore.getState();
  const w = opts.w || canvasW;
  const h = opts.h || canvasH;
  const [a1, a2] = decorAccents();
  // Bake SMIL when the theme is animated; pause/resume is handled live (layoutAnimated).
  // GL themes still animate on canvas — underlay SVG may be shown still for FPS.
  const doAnimate = opts.forceStill ? false : !!L.animated;
  let svg = '';
  try {
    if (typeof L.variantSvg === 'function') {
      svg = L.variantSvg.call(L, w, h, a1, a2, style || 'title') || '';
    } else {
      const fn = style === 'title' ? L.titleSvg : L.contentSvg;
      if (typeof fn === 'function') {
        svg = fn.call(L, w, h, a1, a2, doAnimate, !!mirror) || '';
      }
    }
  } catch (e) {
    console.warn('buildDecorSvg', L?.nameEn, e);
    svg = '';
  }
  if (!svg && L.renderer) {
    try {
      if (typeof L._buildLightSvg === 'function') {
        svg = L._buildLightSvg(w, h, a1, a2, style === 'title', doAnimate) || '';
      } else if (typeof L.titleSvg === 'function') {
        svg = L.titleSvg(w, h, a1, a2, false) || '';
      }
    } catch (e) {
      svg = '';
    }
  }
  if (!svg) return '';
  return isolateSvgIds(svg, 'u' + ++svgUid);
}

export function modalPreviewSvg(layoutIdx, w = 320, h = 180) {
  syncWindowThemeBridge();
  const L = getLayouts()[layoutIdx];
  if (!L) return '';
  const [a1, a2] = decorAccents();
  try {
    if (typeof L.modalPreview === 'function') return L.modalPreview.call(L, w, h, a1, a2) || '';
    if (typeof L.titleSvg === 'function') return L.titleSvg.call(L, w, h, a1, a2, false) || '';
  } catch (e) {
    return '';
  }
  return '';
}

export function tplVariantsFor(layoutIdx, isRu = true) {
  syncWindowThemeBridge();
  const L = getLayouts()[layoutIdx];
  if (!L) return [];
  if (typeof L.tplVariants === 'function') return L.tplVariants(isRu) || [];
  return [
    { style: 'title', mirror: false, tip: isRu ? 'Главный' : 'Title' },
    { style: 'content', mirror: false, tip: isRu ? 'Побочный' : 'Content' },
  ];
}

export function tplThumbSvg(layoutIdx, style, mirror = false, w = 160, h = 90) {
  syncWindowThemeBridge();
  const L = getLayouts()[layoutIdx];
  if (!L) return '';
  const [a1, a2] = decorAccents();
  try {
    if (typeof L.tplThumbSvg === 'function') {
      return L.tplThumbSvg.call(L, w, h, a1, a2, style, false) || '';
    }
    if (typeof L.variantSvg === 'function') {
      return L.variantSvg.call(L, w, h, a1, a2, style) || '';
    }
    const fn = style === 'title' ? L.titleSvg : L.contentSvg;
    if (typeof fn === 'function') return fn.call(L, w, h, a1, a2, false, !!mirror) || '';
  } catch (e) {
    return '';
  }
  return '';
}

export function makeDecorEl(si, layoutIdx, style, mirror = false) {
  const { canvasW, canvasH } = usePresentationStore.getState();
  const svg = buildDecorSvg(layoutIdx, style, mirror);
  if (!svg) return null;
  const L = getLayouts()[layoutIdx];
  const el = {
    id: 'decor_' + si + '_' + Date.now().toString(36),
    type: 'svg',
    x: 0,
    y: 0,
    w: canvasW,
    h: canvasH,
    rot: 0,
    anims: [],
    svgContent: svg,
    _isDecor: true,
    _decorStyle: style || 'content',
    _decorMirror: !!mirror,
    _layoutIdx: layoutIdx,
    _decorRenderer: L?.renderer || null,
  };
  attachDecorGlCfg(el);
  return el;
}

/** Rebuild baked decor SVG / GL cfg after a colour scheme change. */
export function rebuildDecorEls(slides) {
  const st = usePresentationStore.getState();
  const layoutIdx = st.layoutIdx;
  const theme = getTheme(st.appliedThemeIdx);
  let changed = false;
  const next = (slides || []).map((s, si) => {
    const els = s.els || [];
    const mapped = els.map((d) => {
      if (!d || !d._isDecor) return d;
      const li = d._layoutIdx != null && d._layoutIdx >= 0 ? d._layoutIdx : layoutIdx;
      if (li == null || li < 0) return d;
      const style = d._decorStyle || (si === 0 ? 'title' : 'content');
      const neu = makeDecorEl(si, li, style, !!d._decorMirror);
      if (!neu) return d;
      neu.id = d.id;
      changed = true;
      return neu;
    });
    let slide = mapped.some((el, i) => el !== els[i]) ? { ...s, els: mapped } : s;
    const decor = (slide.els || []).find((e) => e && e._isDecor);
    const L = decor ? getLayouts()[decor._layoutIdx] : null;
    if (L?.paper && theme?.bg) {
      changed = true;
      slide = { ...slide, bg: 'custom', bgc: solidColor(theme.bg) || theme.bg };
      delete slide.bgScheme;
    }
    return slide;
  });
  return changed ? next : slides;
}

export function solidPreviewBg() {
  const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
  if (!theme?.bg) return '#1e293b';
  return solidColor(theme.bg) || theme.bg;
}

export function prismLayoutIdx() {
  const i = getLayouts().findIndex((L) => L && L.nameEn === 'Prism');
  return i >= 0 ? i : 0;
}

// Kick off load early
if (typeof window !== 'undefined') {
  ensureLayoutsLoaded();
}

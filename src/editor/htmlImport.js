/** Import slides from exported HTML (legacy `_sl` or React `_deck`). */
import { THEMES } from './themes.js';
import { normalizeLinesInSlides } from './lineGeom.js';

function extractScriptJson(html, id) {
  const re = new RegExp(`<script[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i');
  const m = String(html || '').match(re);
  if (!m) return null;
  return m[1].trim().replace(/\\u003c/g, '<').replace(/\\u003e/g, '>');
}

function layoutIdxFromHtml(html, slides) {
  const mSel = String(html || '').match(/\bselLayout\s*[:=]\s*(-?\d+)/);
  if (mSel && +mSel[1] >= 0) return +mSel[1];
  const mIdx = String(html || '').match(/\bLAYOUT_IDX\s*=\s*(-?\d+)/);
  if (mIdx && +mIdx[1] >= 0) return +mIdx[1];
  for (const s of slides || []) {
    const d = (s.els || []).find((e) => e && e._isDecor && e._layoutIdx != null && e._layoutIdx >= 0);
    if (d) return d._layoutIdx | 0;
  }
  return undefined;
}

function themeIdxFromHtml(html) {
  if (!THEMES?.length) return null;
  let name = null;
  const mName = html.match(/\bTHEME_NAME\s*=\s*['"]([^'"]*)['"]/);
  if (mName) name = mName[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  if (name) {
    const byName = THEMES.findIndex((t) => t && t.name === name);
    if (byName >= 0) return byName;
  }
  const mIdx = html.match(/\bTHEME_IDX\s*=\s*(-?\d+)/);
  if (mIdx) {
    const idx = +mIdx[1];
    if (idx >= 0 && idx < THEMES.length) return idx;
  }
  const mDeck = html.match(/\bdata-theme-idx\s*=\s*["'](-?\d+)["']/i);
  if (mDeck) {
    const idx = +mDeck[1];
    if (idx >= 0 && idx < THEMES.length) return idx;
  }
  return null;
}

function normalizeImportedSlides(slidesArr) {
  (slidesArr || []).forEach((s) => {
    if (!s) return;
    if (s.bgImg) {
      if (typeof s.bgImg === 'object') {
        if (s.bgImg.exportBaked && !s.bgImg.src) s.bgImg.src = s.bgImg.exportBaked;
        if (s.bgImg.exportBaked) delete s.bgImg.exportBaked;
      }
    }
    (s.els || []).forEach((d) => {
      if (!d) return;
      if (d.type === 'model3d') delete d._mesh;
    });
  });
  return normalizeLinesInSlides(slidesArr);
}

function decodeTitle(raw) {
  return String(raw || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

/**
 * Parse exported slideshow HTML into a deck payload for importDeck / replaceSlides.
 * @returns {{ slides, title?, canvasW?, canvasH?, ar?, appliedThemeIdx? } | null}
 */
export function parseExportedHtml(html) {
  const src = String(html || '');
  if (!src.trim()) return null;

  // Prefer React deck blob
  const deckRaw = extractScriptJson(src, '_deck');
  if (deckRaw) {
    try {
      const deck = JSON.parse(deckRaw);
      if (Array.isArray(deck?.slides) && deck.slides.length) {
        normalizeImportedSlides(deck.slides);
        return {
          slides: deck.slides,
          title: deck.title,
          canvasW: deck.canvasW,
          canvasH: deck.canvasH,
          ar: deck.ar,
          appliedThemeIdx:
            deck.appliedThemeIdx != null ? deck.appliedThemeIdx : themeIdxFromHtml(src),
          globalTrans: deck.globalTrans,
          globalTransDur: deck.globalTransDur,
          layoutIdx:
            deck.layoutIdx != null && deck.layoutIdx >= 0
              ? deck.layoutIdx
              : deck.selLayout != null && deck.selLayout >= 0
                ? deck.selLayout
                : layoutIdxFromHtml(src, deck.slides),
          themeName: deck.themeName,
          cur: 0,
        };
      }
    } catch (e) {
      /* fall through */
    }
  }

  // Legacy SlideForge `_sl` array
  const rawSlides = extractScriptJson(src, '_sl');
  if (!rawSlides) return null;
  let slides;
  try {
    slides = JSON.parse(rawSlides);
  } catch (e) {
    return null;
  }
  if (!Array.isArray(slides) || !slides.length) return null;
  normalizeImportedSlides(slides);

  const mar = src.match(/\bar\s*=\s*['"]([^'"]+)['"]/);
  const mw = src.match(/\bvar\s+W\s*=\s*(\d+)/);
  const mh = src.match(/\bvar\s+H\s*=\s*(\d+)/);
  const mt = src.match(/<title[^>]*>([^<]*)<\/title>/i);
  const themeIdx = themeIdxFromHtml(src);
  const layoutIdx = layoutIdxFromHtml(src, slides);

  return {
    slides,
    title: mt ? decodeTitle(mt[1]) : undefined,
    canvasW: mw ? +mw[1] : undefined,
    canvasH: mh ? +mh[1] : undefined,
    ar: mar ? mar[1] : undefined,
    appliedThemeIdx: themeIdx != null ? themeIdx : undefined,
    layoutIdx,
    cur: 0,
  };
}

export async function importHtmlFile(file) {
  if (!file) return null;
  const text = await file.text();
  return parseExportedHtml(text);
}

import { flushSync } from 'react-dom';
import { usePresentationStore } from '../stores/presentationStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useHistoryStore } from '../stores/historyStore';
import { useUiStore } from '../stores/uiStore';
import { buildBasicShapeSVG } from '../shared/shapes.js';
import { getShapeMeta } from '../shared/shapesCatalog.js';
import { getTheme, resolveSchemeColor, hydrateImportedTextColors, stripInlineTextColors, parseCsColor, THEMES } from './themes.js';
import { buildInsertedShape } from './shapeInsert.js';
import { makeDecorEl, getLayouts, prismLayoutIdx, ensureLayoutsLoaded, rebuildDecorEls } from './layouts.js';
import { applyLayoutAnimatedToggle } from './decorAnim.js';
import { invalidateThumbCaches } from './slideThumb.js';
import {
  SLIDE_NAV_LINKS,
  slideLinkHrefForIndex,
  resolveSlideLinkIndex,
} from './links.js';
import { buildSlideContentLayout } from './slideContentLayouts.js';
import { paintTextPlaceholderHtml } from './textPlaceholder.js';
import { autoPlaceDeck, stampOrigFs } from './autoplace.js';
import { idbGetSnapshot } from './versionHistory.js';
import { markdownToHtml, DEFAULT_MD } from './markdown.js';
import { downloadHtml } from '../export/standaloneHtml.js';
import { exportAllSlidesPngZip, exportCurrentSlidePng } from '../export/exportPng.js';
import { exportAllSlidesPdf } from '../export/exportPdf.js';
import { exportAllSlidesOdp } from '../export/exportOdp.js';
import { exportAllSlidesPptx } from '../export/exportPptx.js';
import { measureTextHeight, fitTextsOnSlide } from './textFit.js';
import { nearestSides, riderPositionFor, findRiderForConn } from './connectors.js';
import { fillTocHtml } from './toc.js';
import { getIconById, ensureIcons, iconsReady } from './iconsLazy.js';
import { iconHasAnim, iconStaticPath } from './iconAnim.js';
import { buildIconSVG } from './iconSvg.js';
import { applyCsProp, applyFontFamily } from './fonts.js';
import { withShapeTextColor, DEFAULT_SHAPE_TEXT_CSS } from './shapeText.js';
import { computeAlignPatches, computeDistributePatches } from './align.js';
import {
  applyUnderlineToCs,
  applyUnderlineToSelection,
  detectUnderlineFromEditable,
  nextUnderline,
  parseUnderlineFromCs,
  stripUnderlineFromCs,
  applyStrikeToCs,
  applyStrikeToSelection,
  parseStrikeFromCs,
  detectStrikeFromEditable,
  nextStrike,
  stripStrikeFromCs,
} from './textUnderline.js';
import { toggleStressInEditable, toggleStressInHtml } from './textStress.js';
import { toggleScriptInEditable, toggleScriptInHtml } from './textScript.js';
import {
  makeBgImgFromSrc,
  normalizeBgImg,
  bgImgSrc,
} from './slideBgImg.js';
import { cellRangeKeys, getTableCell, mapTableCells, stripCellHtml } from './tableCells.js';
import { buildNewTableFields } from './tableDefaults.js';
import { importPptxFile } from './pptxImport.js';
import { pnBuildHtml, pnDefaults, pnPresetXY, pnSize } from './pagenum.js';
import { readOsClipboard, writeOsClipboard, writeOsSlideClipboard, markWindowBlur, readOsSlideClipboard, peekLocalSlides, getCopySourceSlideIdx } from './osClipboard.js';
import { handlePasteEvent, pasteWithoutEvent, buildPastedTextFields } from './osPaste.js';
import {
  toggleListHtml,
  htmlHasList,
  reapplyBulletMarkers,
  updateLiveBulletMarkers,
  DEFAULT_BULLET_ICON_ID,
  targetedLineIndices,
  placeCaretAfterLineMarker,
} from './textLists.js';
import {
  applyCssToSelection,
  editingTextRoot,
  execOnSelection,
  hasNonCollapsedSelection,
  htmlFromEditable,
  plainFromEditable,
} from './textInline.js';
import { defaultAnimFields } from './anims.js';
import {
  addAnimBlockToSlide,
  appendAnimLeafToOrder,
  ensureAnimOrder,
  moveAnimOrderEntry,
  moveAnimOrderToIndex,
  moveLeafIntoRepeat,
  moveOrderEntryIntoRepeat,
  patchAnimBlockOnSlide,
  relocateAnimOrderEntry,
  remapAnimOrderAfterRemove,
  remapAnimOrderAfterSwap,
  removeAnimBlockFromSlide,
} from './animOrder.js';
import {
  delayForTargetAbs,
  isCamElId,
  isPauElId,
  camIdFromElId,
  pauIdFromElId,
} from './animTimeline.js';
import {
  buildLineAngleContent,
  defaultLineAngleFields,
  findSharedJoin,
} from './lineAngle.js';
import { APPLET_INSERTS, COUNTER_LINK_KEYS, defaultAppletFields, rebuildAppletHtml } from './applets.js';
import { isFlipAppletId } from './flipApplet.js';
import {
  pteBySymbol,
  pteDefaultBgScheme,
  pteDefaultFgScheme,
  PTE_CARD_W,
  PTE_CARD_H,
  PTE_ICON_SIZE,
} from './periodicApplet.js';
import { defaultModel3dFields } from './model3d.js';
import { renderQRDataURL } from './qr.js';
import { putFromFile, resolveMediaSrc } from './mediaStore.js';
import { prepareDeckForHtmlExport } from '../export/prepareExportAssets.js';
import { getAudioLibrary } from './audioLibrary.js';
import { defaultCam, nudgeCameraInside } from './camera.js';
import { looksLikeHtmlDocument } from './htmlFrame.js';
import { ensureCodeHtml, normalizeCodeLang, CODE_THEMES } from './codeHighlight.js';
import {
  pickRandomQuote,
  buildQuoteHtml,
  quoteThemeColor,
  makeQuoteElement,
  getQuoteCat,
  setQuoteCat,
} from './quotes.js';
import { captureStyle, stylePatchForTarget } from './styleCopy.js';
import { canvasArDims, DEFAULT_CANVAS_W, DEFAULT_CANVAS_H, matchCanvasAr } from './canvasDims.js';
import { bucketFillAt as computeBucketFill } from './inkFill.js';
import { expandInkGroupIds, findInkById } from './inkSelect.js';
import { findInkHostsForIds } from './inkHost.js';
import {
  MARKER_SIZES,
  PEN_SIZES,
  nearestSizeIdx,
  sizesForDrawTool,
} from './inkBrush.js';

function lang() {
  return useUiStore.getState().lang;
}

function ru() {
  return lang() !== 'en';
}

function withHistory(fn) {
  try {
    const sp = new URLSearchParams(location.search);
    if (sp.get('import') || sp.get('prezi') || sp.get('src')) {
      import('./importGallery.js')
        .then((m) => m.clearAddressImportUrl())
        .catch(() => {});
    }
  } catch (e) {}
  useHistoryStore.getState().push();
  const out = fn();
  return out;
}

function elSearchText(el) {
  if (!el) return '';
  const bits = [
    el.html,
    el.text,
    el.shapeHtml,
    el.md,
    el.code,
    el.svgContent,
    el.alt,
    el.srcName,
    el.name,
    el.title,
    el.formula,
    el.latex,
    el.caption,
  ];
  if (el.cells) bits.push(typeof el.cells === 'string' ? el.cells : JSON.stringify(el.cells));
  if (el.rows) bits.push(typeof el.rows === 'string' ? el.rows : JSON.stringify(el.rows));
  return bits
    .map((s) =>
      String(s || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#\d+;/g, ' ')
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeFindRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceInPlain(str, needle, repl, all) {
  const src = String(str ?? '');
  if (!needle) return src;
  return src.replace(new RegExp(escapeFindRe(needle), all ? 'gi' : 'i'), repl);
}

function replaceInHtml(html, needle, repl, all) {
  let left = all ? Infinity : 1;
  const re = new RegExp(escapeFindRe(needle), 'i');
  return String(html ?? '').replace(/(<[^>]+>)|([^<]+)/g, (whole, tag, text) => {
    if (tag || left <= 0 || !text) return whole;
    if (all) return text.replace(new RegExp(escapeFindRe(needle), 'gi'), repl);
    if (!re.test(text)) return text;
    left -= 1;
    return text.replace(re, repl);
  });
}

function applyReplaceToEl(el, needle, repl, all) {
  if (!el) return null;
  if (el.html != null && String(el.html).length) {
    const html = replaceInHtml(el.html, needle, repl, all);
    if (html !== el.html) return { html };
  }
  if (el.shapeHtml) {
    const shapeHtml = replaceInHtml(el.shapeHtml, needle, repl, all);
    if (shapeHtml !== el.shapeHtml) return { shapeHtml };
  }
  if (el.md != null && String(el.md).length) {
    const md = replaceInPlain(el.md, needle, repl, all);
    if (md !== el.md) return { md };
  }
  if (el.code != null && String(el.code).length) {
    const code = replaceInPlain(el.code, needle, repl, all);
    if (code !== el.code) return { code };
  }
  if (el.text != null && String(el.text).length) {
    const text = replaceInPlain(el.text, needle, repl, all);
    if (text !== el.text) return { text };
  }
  return null;
}

function pick(id, opts = {}) {
  if (useUiStore.getState().dictationOn) {
    void import('./dictation.js')
      .then((m) => m.onEditorPick(id))
      .catch(() => {});
  }
  const ui = useUiStore.getState();
  if (ui.stylePaintMode && id && ui.styleClipboard) {
    const { slides, cur } = usePresentationStore.getState();
    const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
    if (el && !el._isDecor) {
      const patch = stylePatchForTarget(ui.styleClipboard, el);
      if (patch) {
        useHistoryStore.getState().push();
        usePresentationStore.getState().patchElement(el.id, patch);
        if (patch.textColor && el.type === 'text' && el.cs) {
          const cs = applyCsProp(el.cs, 'color', patch.textColor);
          usePresentationStore.getState().patchElement(el.id, { cs });
        }
        useUiStore.getState().showToast(
          useUiStore.getState().lang === 'en' ? 'Style applied' : 'Стиль применён',
          'ok'
        );
        if (!opts.keepPaint) {
          useUiStore.getState().setStylePaintMode(false);
        }
      }
      useSelectionStore.getState().pickOne(id);
      return;
    }
  }
  if (opts.shift && id) {
    useSelectionStore.getState().togglePick(id);
    useUiStore.getState().setCropModeElId(null);
    return;
  }
  if (id) {
    const { slides, cur } = usePresentationStore.getState();
    const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
    if (el?.groupId) {
      const members = (slides[cur].els || [])
        .filter((e) => e && e.groupId === el.groupId && !e._isDecor)
        .map((e) => String(e.id));
      if (members.length > 1) {
        useSelectionStore.getState().pickGroup(members, id);
        useUiStore.getState().setCropModeElId(null);
        return;
      }
    }
  }
  useSelectionStore.getState().pickOne(id || null);
  const cropId = useUiStore.getState().cropModeElId;
  if (cropId && String(cropId) !== String(id || '')) {
    useUiStore.getState().setCropModeElId(null);
  }
}

function currentEl() {
  const { slides, cur } = usePresentationStore.getState();
  const selId = useSelectionStore.getState().selId;
  return (slides[cur]?.els || []).find((e) => e && String(e.id) === String(selId)) || null;
}

function textBodyRoot(elId) {
  if (typeof document === 'undefined' || !elId) return null;
  return document.querySelector(`[data-id="${String(elId)}"] .react-text-body`);
}

function readLiveTextHtml(el) {
  const focused = el ? editingTextRoot(el.id) : null;
  if (focused) return htmlFromEditable(focused);
  // Color/icon pickers steal focus; keep reading the live editor while it is open.
  const body = el ? textBodyRoot(el.id) : null;
  if (body?.isContentEditable) return htmlFromEditable(body);
  return el?.html || '';
}

function writeLiveTextHtml(el, html, caretLine) {
  const root = el ? editingTextRoot(el.id) || textBodyRoot(el.id) : null;
  if (!root) return;
  if (root.innerHTML !== html) root.innerHTML = html;
  if (caretLine != null) placeCaretAfterLineMarker(root, caretLine);
}

function patchTextHtml(el, html, extra = {}, caretLine) {
  writeLiveTextHtml(el, html, caretLine);
  withHistory(() =>
    usePresentationStore.getState().patchElement(el.id, {
      html,
      text: String(html || '').replace(/<[^>]+>/g, ''),
      ...extra,
    })
  );
}

function selectedSlideTpl(st) {
  const d = (st.slides[st.cur]?.els || []).find((e) => e && e._isDecor);
  if (!d || d._layoutIdx == null || d._layoutIdx < 0) return null;
  return {
    layoutIdx: d._layoutIdx,
    style: d._decorStyle || 'content',
    mirror: !!d._decorMirror,
  };
}

/** v7.1 addSlide: inherit bg/scheme and current layout as a content (additional) slide. */
function buildAdditionalSlide(st, insertAt) {
  const src = st.slides[st.cur];
  const theme = getTheme(st.appliedThemeIdx);
  const s = {
    els: [],
    ink: [],
    inkFills: [],
    connectors: [],
    cameras: [],
    animOrder: [],
    bg: 'solid',
    bgc: theme?.bg || '#1e293b',
    bgImg: null,
    name: '',
    title: '',
    trans: src?.trans != null ? src.trans : null,
    transDur: src?.transDur != null ? src.transDur : 500,
  };
  if (src) {
    s.bg = src.bg || s.bg;
    s.bgc = src.bgc != null ? src.bgc : s.bgc;
    if (src.bgScheme !== undefined) s.bgScheme = src.bgScheme;
    if (src.bgImg) s.bgImg = JSON.parse(JSON.stringify(src.bgImg));
  }
  const tpl = selectedSlideTpl(st);
  if (tpl) {
    const addStyle = tpl.style === 'title' ? 'content' : tpl.style || 'content';
    const decor = makeDecorEl(insertAt, tpl.layoutIdx, addStyle, tpl.mirror);
    if (decor) s.els = [decor];
  }
  return s;
}

function inferLayoutIdxFromSlides(slides) {
  for (const s of slides || []) {
    const d = (s.els || []).find((e) => e && e._isDecor && e._layoutIdx != null && e._layoutIdx >= 0);
    if (d) return d._layoutIdx | 0;
  }
  return undefined;
}

function normalizeImportPayload(data) {
  if (!data || !Array.isArray(data.slides)) return data;
  const next = { ...data };
  if ((next.layoutIdx == null || next.layoutIdx < 0) && next.selLayout != null && next.selLayout >= 0) {
    next.layoutIdx = next.selLayout | 0;
  }
  if (next.layoutIdx == null || next.layoutIdx < 0) {
    const li = inferLayoutIdxFromSlides(next.slides);
    if (li != null) next.layoutIdx = li;
  }
  if ((next.appliedThemeIdx == null || next.appliedThemeIdx < 0) && next.themeName) {
    const i = THEMES.findIndex((t) => t && t.name === next.themeName);
    if (i >= 0) next.appliedThemeIdx = i;
  }
  return next;
}

function commitImportedDeck(data, opts = {}) {
  const payload = normalizeImportPayload(data);
  const ok = usePresentationStore.getState().importDeck(payload, { fitToCurrentCanvas: true });
  if (!ok) return false;
  const st = usePresentationStore.getState();
  let slides = hydrateImportedTextColors(st.slides, getTheme(st.appliedThemeIdx));
  if (slides !== st.slides) {
    usePresentationStore.setState({ slides });
    usePresentationStore.getState().persist();
  }
  // For JSON/slides.json imports: skip formatting reset — preserve as-is
  if (!opts.skipFormatReset) {
    slides = resetImportedTextFormatting(usePresentationStore.getState().slides, getTheme(st.appliedThemeIdx));
    if (slides !== usePresentationStore.getState().slides) {
      usePresentationStore.setState({ slides });
      usePresentationStore.getState().persist();
    }
    // Fit text boxes to actual content (grow if too small)
    const curSlides = usePresentationStore.getState().slides;
    for (let i = 0; i < curSlides.length; i++) {
      fitTextsOnSlide(curSlides[i]);
    }
    usePresentationStore.getState().persist();
  }
  rebuildDecorForAppliedTheme();
  return true;
}

/** After PPT/ODP import: strip colors, preserve bold/italic, keep text bg, reset shapes to theme, reset slide bg. */
function resetImportedTextFormatting(slides, theme) {
  if (!Array.isArray(slides)) return slides;
  const isDark = theme ? !!theme.dark : true;
  const defColor = isDark ? '#ffffff' : '#1e293b';
  const defBg = theme?.bg || (isDark ? '#1e293b' : '#ffffff');
  const defShapeFill = theme?.shapeFill || theme?.ac1 || (isDark ? '#6366f1' : '#3b82f6');
  const defShapeStroke = theme?.shapeStroke || theme?.ac2 || defShapeFill;
  let changed = false;
  const next = slides.map((s) => {
    const els = (s.els || []).map((el) => {
      if (!el) return el;
      if (el.type === 'text') {
        const rawText = (el.html || '').replace(/<[^>]+>/g, '');
        if (!rawText.trim()) return el;
        // Preserve bold/italic from original HTML, strip colors
        const preserved = preserveInlineWeight(el.html || '');
        const cs = `font-size:24px;color:${defColor};text-align:left;line-height:1.3;`;
        // Fit bounding box to text content
        const lines = rawText.split(/\r?\n/).filter((l) => l.trim());
        const maxLineLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
        const fs = 24;
        const charW = fs * 0.58;
        const fitW = Math.max(80, Math.min(1400, Math.round(maxLineLen * charW + 24)));
        const fitH = Math.max(36, Math.round(lines.length * fs * 1.35 + 12));
        // Only resize if current box is significantly larger than needed
        const curW = el.w || 0;
        const curH = el.h || 0;
        const patch = {
          html: preserved,
          cs,
          textColor: defColor,
          textColorScheme: null,
          textRole: 'body',
        };
        // Shrink box if it's much larger than content (but keep position)
        if (curW > fitW * 1.5) patch.w = fitW;
        if (curH > fitH * 1.5) patch.h = fitH;
        changed = true;
        return { ...el, ...patch };
      }
      if (el.type === 'shape') {
        // Reset shape colors to theme-appropriate values
        const patch = {
          fill: defShapeFill,
          stroke: defShapeStroke,
          fillScheme: null,
        };
        changed = true;
        return { ...el, ...patch };
      }
      return el;
    });
    // Reset slide background to match current theme
    const slidePatch = {};
    if (s.bgc !== defBg) {
      slidePatch.bgc = defBg;
      slidePatch.bg = 'solid';
      slidePatch.bgScheme = null;
      slidePatch.bgImg = null;
      changed = true;
    }
    return { ...s, els, ...slidePatch };
  });
  return changed ? next : slides;
}

/** Keep <b>/<i> tags from HTML, strip color/font-size styles. */
function preserveInlineWeight(html) {
  // Process each <div>...</div> paragraph
  return html.replace(/<div>(.*?)<\/div>/g, (_, inner) => {
    // Extract text segments with their bold/italic state
    let result = '';
    const re = /<(span|b|i|u|em|strong)[^>]*>(.*?)<\/\1>|([^<]+)/g;
    let m;
    while ((m = re.exec(inner)) !== null) {
      if (m[3]) {
        // Plain text segment
        result += m[3];
      } else {
        const tag = m[1].toLowerCase();
        const content = m[2];
        const style = (m[0].match(/style="([^"]*)"/) || [])[1] || '';
        const isBold = tag === 'b' || tag === 'strong' || /font-weight\s*:\s*[7-9]\d\d/.test(style);
        const isItalic = tag === 'i' || tag === 'em' || /font-style\s*:\s*italic/.test(style);
        if (isBold && isItalic) {
          result += `<b><i>${content}</i></b>`;
        } else if (isBold) {
          result += `<b>${content}</b>`;
        } else if (isItalic) {
          result += `<i>${content}</i>`;
        } else {
          result += content;
        }
      }
    }
    return `<div>${result}</div>`;
  });
}

function bustThumbCaches() {
  invalidateThumbCaches();
  usePresentationStore.getState().bumpThumbEpoch();
}

/** Rebuild decor SVG so thumbs / templates pick up the new scheme accents. */
function rebuildDecorForAppliedTheme() {
  bustThumbCaches();
  const st = usePresentationStore.getState();
  const next = rebuildDecorEls(st.slides);
  if (next === st.slides) return;
  usePresentationStore.setState({ slides: next });
  usePresentationStore.getState().persist();
}

export const editorApi = {
  undo() {
    useHistoryStore.getState().undo();
  },
  redo() {
    useHistoryStore.getState().redo();
  },

  setTitle(title) {
    usePresentationStore.getState().setTitle(title);
  },

  newPresentation() {
    // Preserve current theme and layout for the new presentation
    const st = usePresentationStore.getState();
    const curThemeIdx = st.appliedThemeIdx;
    const curLayoutIdx = st.layoutIdx;
    useHistoryStore.getState().clear();
    st.newPresentation();
    // Restore theme and layout
    if (curThemeIdx != null && curThemeIdx >= 0) {
      const theme = getTheme(curThemeIdx);
      if (theme) usePresentationStore.getState().applyTheme(theme, curThemeIdx);
    }
    if (curLayoutIdx != null && curLayoutIdx >= 0) {
      usePresentationStore.getState().setLayoutIdx(curLayoutIdx);
    }
    pick(null);
    useUiStore.getState().showToast(ru() ? 'Новая презентация создана' : 'New presentation created', 'ok');
  },

  addSlide(at) {
    withHistory(() => {
      const st = usePresentationStore.getState();
      const insertAt =
        at == null
          ? st.slides.length > 0
            ? st.cur + 1
            : 0
          : Math.max(0, Math.min(st.slides.length, at | 0));
      st.addSlide(insertAt, buildAdditionalSlide(st, insertAt));
      pick(null);
      const pn = usePresentationStore.getState().pnSettings;
      if (pn?.enabled) editorApi.applyPageNumbers(pn);
    });
  },

  dupSlide(i) {
    withHistory(() => {
      usePresentationStore.getState().dupSlide(i);
      pick(null);
      const pn = usePresentationStore.getState().pnSettings;
      if (pn?.enabled) editorApi.applyPageNumbers(pn);
    });
  },

  hasSlideClipboard() {
    if (usePresentationStore.getState().slideClipboard?.length) return true;
    return !!peekLocalSlides()?.length;
  },

  copySlidesSelected(indices) {
    const st = usePresentationStore.getState();
    const ids = indices?.length
      ? indices
      : st.slideMultiSel?.length
        ? st.slideMultiSel
        : [st.cur];
    const n = st.copySlides(ids);
    if (!n) return;
    const pack = usePresentationStore.getState().slideClipboard;
    if (pack?.length) writeOsSlideClipboard(pack).catch(() => {});
    useUiStore.getState().showToast(
      n > 1
        ? ru()
          ? `Скопировано: ${n}`
          : `Copied: ${n}`
        : ru()
          ? 'Скопировано'
          : 'Copied',
      'ok'
    );
  },

  copySlide(i) {
    const n = usePresentationStore.getState().copySlides([i]);
    if (!n) return;
    const pack = usePresentationStore.getState().slideClipboard;
    if (pack?.length) writeOsSlideClipboard(pack).catch(() => {});
    useUiStore.getState().showToast(ru() ? 'Скопировано' : 'Copied', 'ok');
  },

  async pasteSlide(at) {
    let pack = usePresentationStore.getState().slideClipboard;
    if (!pack?.length) {
      try {
        const fromOs = await readOsSlideClipboard();
        if (fromOs?.length) {
          usePresentationStore.setState({ slideClipboard: fromOs, clipboard: null });
          pack = fromOs;
        }
      } catch (e) {}
    }
    if (!pack?.length) return;
    withHistory(() => {
      usePresentationStore.getState().pasteSlides(at);
      pick(null);
      const pn = usePresentationStore.getState().pnSettings;
      if (pn?.enabled) editorApi.applyPageNumbers(pn);
    });
    useUiStore.getState().showToast(
      pack.length > 1
        ? ru()
          ? `Вставлено слайдов: ${pack.length}`
          : `Pasted slides: ${pack.length}`
        : ru()
          ? 'Слайд вставлен'
          : 'Slide pasted',
      'ok'
    );
  },

  delSlides(indices) {
    const list = Array.isArray(indices) ? indices : indices != null ? [indices] : [];
    if (!list.length) return;
    const n = usePresentationStore.getState().slides.length;
    if (n - new Set(list).size < 1) {
      useUiStore.getState().showToast(ru() ? 'Нужен хотя бы один слайд' : 'Need at least one slide', 'warn');
      return;
    }
    withHistory(() => {
      usePresentationStore.getState().delSlides(list);
      pick(null);
      const pn = usePresentationStore.getState().pnSettings;
      if (pn?.enabled) editorApi.applyPageNumbers(pn);
    });
  },

  delSlide(i) {
    withHistory(() => {
      usePresentationStore.getState().delSlide(i);
      pick(null);
      const pn = usePresentationStore.getState().pnSettings;
      if (pn?.enabled) editorApi.applyPageNumbers(pn);
    });
  },

  moveSlide(from, to) {
    withHistory(() => {
      usePresentationStore.getState().moveSlide(from, to);
      const pn = usePresentationStore.getState().pnSettings;
      if (pn?.enabled) editorApi.applyPageNumbers(pn);
    });
  },

  reorderSlides(indices, insertAt) {
    withHistory(() => {
      usePresentationStore.getState().reorderSlides(indices, insertAt);
      const pn = usePresentationStore.getState().pnSettings;
      if (pn?.enabled) editorApi.applyPageNumbers(pn);
    });
  },

  pickSlide(i, e) {
    void import('./slideAnimPlay.js').then((m) => m.stopSlideAnimPlay()).catch(() => {});
    usePresentationStore.getState().pickSlideWithMod(i, e || null);
    pick(null);
    useUiStore.getState().setCropModeElId(null);
  },

  pickElement(id, opts) {
    pick(id, opts || {});
  },

  addText() {
    const st = usePresentationStore.getState();
    const theme = getTheme(st.appliedThemeIdx);
    const defScheme = { col: 7, row: 0 };
    const isDark = theme ? !!theme.dark : true;
    let defColor = isDark ? '#ffffff' : '#000000';
    const resolved = resolveSchemeColor(defScheme, theme);
    if (resolved) defColor = resolved;
    const label = ru() ? 'Дважды кликните для редактирования' : 'Double-click to edit';
    const html = paintTextPlaceholderHtml(label);
    let w = 500;
    let h = 120;
    let x = 80;
    let y = 100;
    let fs = 36;
    const z = useUiStore.getState().canvasZoom || 1;
    if (z > 1.01) {
      const scale = 1 / z;
      w = Math.max(8, Math.round(w * scale));
      h = Math.max(8, Math.round(h * scale));
      fs = Math.max(10, Math.round(36 * scale));
      const W = st.canvasW || DEFAULT_CANVAS_W;
      const H = st.canvasH || DEFAULT_CANVAS_H;
      x = Math.max(0, Math.round((W - w) / 2));
      y = Math.max(0, Math.round((H - h) / 2));
    }
    const id = withHistory(() =>
      usePresentationStore.getState().addElement({
        type: 'text',
        x,
        y,
        w,
        h,
        html,
        cs: `font-size:${fs}px;font-weight:400;color:${defColor};text-align:left;line-height:1.2;`,
        textColor: defColor,
        textColorScheme: defScheme,
        textRole: 'body',
        textPlaceholder: true,
        textPlaceholderLabel: label,
      })
    );
    pick(id);
    return id;
  },

  addShape(shape = 'rect', opts = {}) {
    const id = withHistory(() =>
      usePresentationStore.getState().addElement(buildInsertedShape(shape, opts))
    );
    pick(id);
    useUiStore.getState().setPanel(null);
    return id;
  },

  replaceShape(elId, shape = 'rect', opts = {}) {
    const st = usePresentationStore.getState();
    const cur = st.slides[st.cur];
    const el = (cur?.els || []).find((e) => e && String(e.id) === String(elId));
    if (!el || el.type !== 'shape') {
      return editorApi.addShape(shape, opts);
    }
    const meta = getShapeMeta(shape) || getShapeMeta('rect');
    const id = meta?.id || 'rect';
    const isCallout = meta?.special === 'callout';
    const noFill = !!meta?.noFill;
    const patch = {
      shape: id,
      noFill,
      fill: opts.fill != null ? opts.fill : el.fill,
      stroke: opts.stroke != null ? opts.stroke : el.stroke,
      sw: opts.sw != null ? +opts.sw : el.sw,
      fillScheme: opts.fillScheme !== undefined ? opts.fillScheme : el.fillScheme,
      strokeScheme: opts.strokeScheme !== undefined ? opts.strokeScheme : el.strokeScheme,
    };
    if (noFill) patch.fill = 'none';
    if (isCallout) {
      if (el.tailX === undefined) patch.tailX = 0;
      if (el.tailY === undefined) patch.tailY = (el.h || 200) / 2 + 30;
      if (!(el.rx > 0)) patch.rx = el.rx || 35;
      if (!el.shapeTextCss) {
        patch.shapeTextCss = 'font-size:24px;font-weight:400;color:#ffffff;text-align:center;font-family:Boingster;';
      } else if (!/font-family/i.test(el.shapeTextCss)) {
        patch.shapeTextCss = `${el.shapeTextCss}font-family:Boingster;`;
      }
      if (el.tailRoundX === undefined) patch.tailRoundX = 0;
      if (el.tailRoundY === undefined) patch.tailRoundY = 90;
      if (el.tailWFrac === undefined) patch.tailWFrac = 0.2;
      if (!el.calloutForm) patch.calloutForm = 'round';
    }
    withHistory(() => usePresentationStore.getState().patchElement(elId, patch));
    useUiStore.setState({ panel: null, shapeReplaceId: null });
    return elId;
  },

  addImageFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      const img = new Image();
      img.onload = () => {
        const maxW = 480;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const id = withHistory(() =>
          usePresentationStore.getState().addElement({
            type: 'image',
            x: 120,
            y: 80,
            w: Math.round(img.width * scale),
            h: Math.round(img.height * scale),
            src,
          })
        );
        const rideId = useUiStore.getState().pendingRideConnId;
        if (rideId && id) {
          editorApi.attachElementAsRider(id, rideId);
          useUiStore.getState().setPendingRideConnId(null);
        } else {
          pick(id);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  },

  openImagePicker(mode) {
    useUiStore.setState({
      panel: 'images',
      imagePickMode: mode && mode.kind ? mode : { kind: 'insert' },
    });
  },

  openImageFilePicker() {
    const mode = useUiStore.getState().imagePickMode || { kind: 'insert' };
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (mode.kind === 'slideBg' || mode.kind === 'flip') {
        const reader = new FileReader();
        reader.onload = () => {
          editorApi.applyPickedImageSrc(String(reader.result || ''), file.name || '', mode);
        };
        reader.readAsDataURL(file);
        return;
      }
      editorApi.addImageFromFile(file);
    };
    input.click();
  },

  /** Apply gallery/file pick for insert | slideBg | flip. */
  applyPickedImageSrc(src, name, mode) {
    const m = mode || useUiStore.getState().imagePickMode || { kind: 'insert' };
    if (!src) return;
    if (m.kind === 'slideBg') {
      const { cur, patchSlide } = usePresentationStore.getState();
      withHistory(() => patchSlide(cur, { bgImg: makeBgImgFromSrc(src, name || 'bg') }));
      useUiStore.getState().setPanel(null);
      useUiStore.getState().showToast(ru() ? 'Фон слайда обновлён' : 'Slide background updated', 'ok');
      return;
    }
    if (m.kind === 'flip' && m.elId) {
      const key = m.side === 'back' ? 'flipBackImg' : 'flipFrontImg';
      editorApi.patchApplet(m.elId, { [key]: src });
      useUiStore.getState().setPanel(null);
      useUiStore.getState().showToast(ru() ? 'Картинка добавлена' : 'Image added', 'ok');
      return;
    }
    // insert as element — path-based helper for gallery; data URL via temp element
    if (String(src).startsWith('data:') || String(src).startsWith('blob:')) {
      editorApi.addImageFromFileDataUrl(src, name);
      return;
    }
    editorApi.addImageFromPath(src.startsWith('/') ? src.slice(1) : src);
  },

  addImageFromFileDataUrl(dataUrl, name) {
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => {
      const maxW = 640;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const id = withHistory(() =>
        usePresentationStore.getState().addElement({
          type: 'image',
          x: 120,
          y: 80,
          w: Math.round(img.width * scale),
          h: Math.round(img.height * scale),
          src: dataUrl,
          imgName: name || '',
        })
      );
      pick(id);
      useUiStore.getState().setPanel(null);
    };
    img.onerror = () => {
      useUiStore.getState().showToast(ru() ? 'Не удалось загрузить изображение' : 'Failed to load image', 'warn');
    };
    img.src = dataUrl;
  },

  addImageFromPath(path) {
    if (!path) return;
    const mode = useUiStore.getState().imagePickMode || { kind: 'insert' };
    const src = '/' + String(path).replace(/^\//, '');
    if (mode.kind === 'slideBg' || mode.kind === 'flip') {
      editorApi.applyPickedImageSrc(src, String(path).split('/').pop() || '', mode);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const maxW = 640;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const id = withHistory(() =>
        usePresentationStore.getState().addElement({
          type: 'image',
          x: 120,
          y: 80,
          w: Math.round(img.width * scale),
          h: Math.round(img.height * scale),
          src,
          imgPath: path,
        })
      );
      const rideId = useUiStore.getState().pendingRideConnId;
      if (rideId && id) {
        editorApi.attachElementAsRider(id, rideId);
        useUiStore.getState().setPendingRideConnId(null);
      } else {
        pick(id);
      }
      useUiStore.getState().setPanel(null);
    };
    img.onerror = () => {
      useUiStore.getState().showToast(ru() ? 'Не удалось загрузить изображение' : 'Failed to load image', 'warn');
    };
    img.src = src;
  },

  openShapePicker() {
    useUiStore.setState({ panel: 'shapes', shapeReplaceId: null });
  },

  openShapePickerReplace(id) {
    useUiStore.setState({ panel: 'shapes', shapeReplaceId: id || null });
  },

  openTablePicker() {
    useUiStore.getState().setPanel('table');
  },

  openIconPicker() {
    useUiStore.getState().setIconPickerForList(null);
    useUiStore.getState().setIconPickerForEl(null);
    useUiStore.getState().setPanel('icons');
  },

  openIconPickerForElement(elId) {
    const id = elId || useSelectionStore.getState().selId;
    if (id) pick(id);
    useUiStore.getState().setIconPickerForList(null);
    useUiStore.getState().setIconPickerForEl(id || null);
    useUiStore.getState().setPanel('icons');
  },

  openBulletIconPicker(elId) {
    const id = elId || useSelectionStore.getState().selId;
    if (id) pick(id);
    useUiStore.getState().setIconPickerForList(id || null);
    useUiStore.getState().setPanel('icons');
  },

  patchElement(id, data) {
    usePresentationStore.getState().patchElement(id, data);
  },

  patchElementHistory(id, data) {
    withHistory(() => usePresentationStore.getState().patchElement(id, data));
  },

  deleteSelected() {
    const { selId, multiSel, selConnId, selInkIds } = useSelectionStore.getState();
    // Always delete ink first if ink is selected (ink may be co-selected with objects)
    if (selInkIds?.length) {
      withHistory(() => usePresentationStore.getState().deleteInkByIds(selInkIds));
      useSelectionStore.getState().clearInkSelection();
    }
    if (selConnId && !selId && !(multiSel && multiSel.length)) {
      withHistory(() => usePresentationStore.getState().deleteConnector(selConnId));
      useSelectionStore.getState().setSelConnId(null);
      return;
    }
    const ids = multiSel?.length ? multiSel : selId ? [selId] : [];
    if (!ids.length) return;
    withHistory(() => usePresentationStore.getState().deleteIds(ids));
    pick(null);
  },

  layer(dir) {
    const { selId, multiSel, selInkIds } = useSelectionStore.getState();
    if (selInkIds?.length && !selId && !(multiSel && multiSel.length)) {
      usePresentationStore.getState().ensureInkHosts();
      const slide = usePresentationStore.getState().slides[usePresentationStore.getState().cur];
      const hosts = findInkHostsForIds(slide, selInkIds);
      if (!hosts.length) return;
      withHistory(() => {
        const host = hosts[hosts.length - 1];
        if (host) usePresentationStore.getState().layer(host.id, dir);
      });
      return;
    }
    const id = selId || (multiSel && multiSel.length === 1 ? multiSel[0] : null);
    if (!id) return;
    withHistory(() => usePresentationStore.getState().layer(id, dir));
  },

  setSlideTitle(title) {
    const { cur, patchSlide } = usePresentationStore.getState();
    patchSlide(cur, { title, name: title });
  },

  setSlideBg(color) {
    const { cur, patchSlide } = usePresentationStore.getState();
    withHistory(() => patchSlide(cur, { bgc: color, bg: 'custom', bgScheme: null }));
  },

  setSlideBgImage() {
    editorApi.openImagePicker({ kind: 'slideBg' });
  },

  patchSlideBgImg(patch, opts = {}) {
    const { cur, slides, patchSlide } = usePresentationStore.getState();
    const slide = slides[cur];
    if (!slide || !bgImgSrc(slide.bgImg)) return;
    const next = normalizeBgImg({
      ...(typeof slide.bgImg === 'string' ? { src: slide.bgImg, mode: 'cover' } : slide.bgImg),
      ...patch,
    });
    const apply = () => patchSlide(cur, { bgImg: next });
    if (opts.history === false) apply();
    else withHistory(apply);
  },

  clearSlideBgImage() {
    const { cur, patchSlide } = usePresentationStore.getState();
    withHistory(() => patchSlide(cur, { bgImg: null }));
  },

  resetSlideBg() {
    const { cur, patchSlide, appliedThemeIdx } = usePresentationStore.getState();
    const theme = getTheme(appliedThemeIdx);
    withHistory(() =>
      patchSlide(cur, {
        bgc: theme?.bg || '#1e293b',
        bg: 'custom',
        bgScheme: theme ? undefined : null,
        // Keep bgImg intact — only reset color
      })
    );
  },

  applyColor(color, modifiers = {}) {
    const mode = usePresentationStore.getState().colorMode;
    const el = currentEl();
    const shift = modifiers.shift;
    const ctrl = modifiers.ctrl;
    const schemeRef = modifiers.schemeRef || null;
    const useMode = shift ? 'stroke' : ctrl ? 'text' : mode;
    if (!el) {
      if (useMode === 'bg') {
        withHistory(() => {
          const { cur, patchSlide } = usePresentationStore.getState();
          patchSlide(cur, { bgc: color, bg: 'custom', bgScheme: schemeRef });
        });
      }
      return;
    }
    if (useMode === 'text' && el.type !== 'shape') {
      editorApi.applyTextInline({ color, schemeRef });
      return;
    }
    withHistory(() => {
      if (useMode === 'stroke') {
        usePresentationStore.getState().patchElement(el.id, { stroke: color, strokeScheme: schemeRef });
      } else if (useMode === 'text') {
        usePresentationStore.getState().patchElement(el.id, {
          shapeTextCss: withShapeTextColor(el.shapeTextCss, color),
          textColor: color,
          textColorScheme: schemeRef,
        });
      } else if (el.type === 'text') {
        usePresentationStore.getState().patchElement(el.id, { textBg: color, textBgScheme: schemeRef });
      } else {
        usePresentationStore.getState().patchElement(el.id, { fill: color, fillScheme: schemeRef });
      }
    });
  },

  clearColor() {
    const el = currentEl();
    if (!el) {
      editorApi.resetSlideBg();
      return;
    }
    const mode = usePresentationStore.getState().colorMode;
    withHistory(() => {
      if (mode === 'stroke') usePresentationStore.getState().patchElement(el.id, { stroke: 'transparent', sw: 0, strokeScheme: null });
      else if (mode === 'text') {
        if (el.type === 'shape') {
          usePresentationStore.getState().patchElement(el.id, {
            shapeTextCss: withShapeTextColor(el.shapeTextCss || DEFAULT_SHAPE_TEXT_CSS, '#ffffff'),
            textColor: '#ffffff',
            textColorScheme: null,
          });
        } else {
          let cs = el.cs || '';
          cs = cs.replace(/(?:^|;)\s*color\s*:\s*[^;]+;?/gi, '');
          usePresentationStore.getState().patchElement(el.id, { cs, textColor: '#ffffff', textColorScheme: null });
        }
      } else {
        usePresentationStore.getState().patchElement(el.id, { fill: 'none', textBg: '', fillScheme: null, textBgScheme: null });
      }
    });
  },

  openThemeModal() {
    useUiStore.getState().openThemeModal();
  },

  openLayoutModal() {
    useUiStore.getState().openLayoutModal();
  },

  async applyTheme(idx) {
    if (idx == null || idx < 0) {
      withHistory(() => {
        bustThumbCaches();
        usePresentationStore.getState().setAppliedThemeIdx(-1);
      });
      useUiStore.getState().closeThemeModal();
      useUiStore.getState().showToast(ru() ? 'Схема сброшена' : 'Scheme cleared', 'ok');
      return;
    }
    const theme = getTheme(idx);
    if (!theme) return;
    try {
      await ensureLayoutsLoaded();
    } catch (e) {}
    withHistory(() => {
      bustThumbCaches();
      usePresentationStore.getState().applyTheme(theme, idx);
      rebuildDecorForAppliedTheme();
    });
    useUiStore.getState().closeThemeModal();
    useUiStore.getState().showToast(ru() ? 'Цветовая схема применена' : 'Color scheme applied', 'ok');
  },

  /** Apply decorative layout to all slides (v7.1 «Тема оформления»). */
  applyLayout(idx) {
    if (idx == null || idx < 0) {
      withHistory(() => usePresentationStore.getState().clearAllDecor());
      useUiStore.getState().closeLayoutModal();
      useUiStore.getState().showToast(ru() ? 'Декор убран' : 'Decor cleared', 'ok');
      return;
    }
    const L = getLayouts()[idx];
    if (!L) return;
    withHistory(() => {
      bustThumbCaches();
      const st = usePresentationStore.getState();
      const builders = st.slides.map((_, si) => {
        const style = L.paper ? 'title' : si === 0 ? 'title' : 'content';
        return makeDecorEl(si, idx, style, false);
      });
      st.applyDecorToAll(idx, builders);
      const theme = getTheme(st.appliedThemeIdx);
      if (theme) st.applyTheme(theme, st.appliedThemeIdx);
    });
    useUiStore.getState().closeLayoutModal();
    useUiStore.getState().showToast(ru() ? 'Тема оформления применена' : 'Decor theme applied', 'ok');
  },

  applySlideTemplate(style = 'title', mirror = false) {
    const st = usePresentationStore.getState();
    let idx = st.layoutIdx;
    if (idx == null || idx < 0) {
      const meta = (st.slides[st.cur]?.els || []).find((e) => e && e._isDecor);
      idx = meta && meta._layoutIdx != null ? meta._layoutIdx : prismLayoutIdx();
    }
    const L = getLayouts()[idx];
    if (!L) return;
    withHistory(() => {
      bustThumbCaches();
      const store = usePresentationStore.getState();
      store.setLayoutIdx(idx);
      const useMirror = L.nameEn === 'Prism' && !!mirror;
      const decor = makeDecorEl(store.cur, idx, style || 'content', useMirror);
      store.replaceSlideDecor(store.cur, decor);
    });
  },

  clearSlideTemplate() {
    const { cur, slides } = usePresentationStore.getState();
    if (!(slides[cur]?.els || []).some((d) => d && d._isDecor)) return;
    withHistory(() => usePresentationStore.getState().replaceSlideDecor(cur, null));
  },

  applySlideStyleToAll() {
    const st = usePresentationStore.getState();
    const src = st.slides[st.cur];
    if (!src) return;
    const srcDecor = (src.els || []).find((d) => d && d._isDecor) || null;
    const decorTpl = srcDecor
      ? {
          layoutIdx: srcDecor._layoutIdx,
          style: srcDecor._decorStyle || 'content',
          mirror: !!srcDecor._decorMirror,
        }
      : null;
    withHistory(() => {
      const store = usePresentationStore.getState();
      const builders = store.slides.map((_, si) =>
        decorTpl ? makeDecorEl(si, decorTpl.layoutIdx, decorTpl.style, decorTpl.mirror) : null
      );
      store.applySlideStyleFrom(store.cur, builders, decorTpl ? decorTpl.layoutIdx : -1);
    });
    useUiStore.getState().showToast(
      ru() ? 'Стиль слайда применён ко всем слайдам' : 'Slide style applied to all slides',
      'ok'
    );
  },

  setLayoutAnimated(on) {
    withHistory(() => {
      applyLayoutAnimatedToggle(!!on);
      if (on) rebuildDecorForAppliedTheme();
    });
  },

  setOpacity(v) {
    const el = currentEl();
    if (!el) return;
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, { elOpacity: v, fillOp: v })
    );
  },

  setStrokeWidth(v) {
    const el = currentEl();
    if (!el) return;
    const sw = Math.max(0, +v || 0);
    const patch = { sw };
    // Panel may show a default stroke color while stroke is none/transparent —
    // enabling thickness should apply a real stroke so canvas matches the panel.
    if (
      sw > 0 &&
      (!el.stroke || el.stroke === 'none' || el.stroke === 'transparent')
    ) {
      const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
      const fromTheme = theme?.colors?.[4] || theme?.accent || null;
      patch.stroke = fromTheme || '#1d4ed8';
      if (!el.strokeScheme) patch.strokeScheme = { col: 0, row: 4 };
    }
    withHistory(() => usePresentationStore.getState().patchElement(el.id, patch));
  },

  setBlur(v) {
    const el = currentEl();
    if (!el) return;
    const n = Math.max(0, +v || 0);
    withHistory(() => {
      if (el.type === 'shape') {
        usePresentationStore.getState().patchElement(el.id, { shapeBlur: n });
      } else if (el.type === 'text' || el.type === 'markdown') {
        usePresentationStore.getState().patchElement(el.id, { textBgBlur: n });
      } else {
        usePresentationStore.getState().patchElement(el.id, { blur: n });
      }
    });
  },

  addTable(rows = 3, cols = 4) {
    const st = usePresentationStore.getState();
    const theme = getTheme(st.appliedThemeIdx);
    const fields = buildNewTableFields(rows, cols, theme, {
      canvasW: st.canvasW,
      canvasH: st.canvasH,
    });
    const id = withHistory(() => usePresentationStore.getState().addElement(fields));
    pick(id);
    return id;
  },

  addIcon(emoji = '⭐') {
    const id = withHistory(() =>
      usePresentationStore.getState().addElement({
        type: 'icon',
        x: 520,
        y: 220,
        w: 96,
        h: 96,
        emoji,
        textColor: '#fbbf24',
      })
    );
    pick(id);
    return id;
  },

  addIconFromLib(iconId, color = '#6366f1', sw = 1.8, fillOp = 1) {
    const run = async () => {
      const ic = getIconById(iconId);
      if (!ic) {
        useUiStore.getState().showToast(ru() ? 'Значок не найден' : 'Icon not found', 'warn');
        return null;
      }
      const iconSw = Number.isFinite(+sw) ? Math.max(0, +sw) : 1.8;
      const iconFillOp = Number.isFinite(+fillOp) ? Math.max(0, Math.min(1, +fillOp)) : 1;
      const st = usePresentationStore.getState();
      const sz = 180;
      const cw = Math.max(1, +st.canvasW || DEFAULT_CANVAS_W);
      const ch = Math.max(1, +st.canvasH || DEFAULT_CANVAS_H);
      let w = sz;
      let h = sz;
      let iconFitted = false;
      try {
        const { measureIconFit } = await import('./iconFit.js');
        const m = measureIconFit(ic, iconSw, iconFillOp, color, sz, sz);
        if (m) {
          w = m.w;
          h = m.h;
          iconFitted = true;
        }
      } catch (e) {}
      const id = withHistory(() =>
        usePresentationStore.getState().addElement({
          type: 'icon',
          x: Math.max(0, Math.round((cw - w) / 2)),
          y: Math.max(0, Math.round((ch - h) / 2)),
          w,
          h,
          iconId: String(ic.id),
          iconPath: ic.p || '',
          iconColor: color,
          iconColorScheme: { col: 0, row: 2 },
          iconColorCustom: false,
          iconSw,
          iconFillOp,
          iconFitted,
          iconAnim: iconHasAnim(ic),
          textColor: color,
        })
      );
      const rideId = useUiStore.getState().pendingRideConnId;
      if (rideId && id) {
        editorApi.attachElementAsRider(id, rideId);
        useUiStore.getState().setPendingRideConnId(null);
      } else {
        pick(id);
      }
      useUiStore.getState().setPanel(null);
      return id;
    };
    return ensureIcons().then(run);
  },

  /** One-shot: shrink icon frame to path bounds (for icons inserted before fit). */
  fitSelectedIconBounds({ silent } = {}) {
    const el = currentEl();
    if (!el || el.type !== 'icon' || !el.iconId) return;
    return ensureIcons().then(async () => {
      const { measureIconFitById } = await import('./iconFit.js');
      const m = measureIconFitById(el.iconId, {
        sw: el.iconSw,
        fillOp: el.iconFillOp,
        color: el.iconColor || el.textColor,
        w: el.w,
        h: el.h,
      });
      if (!m) return;
      const cx = (el.x || 0) + (el.w || 0) / 2;
      const cy = (el.y || 0) + (el.h || 0) / 2;
      const patch = {
        w: m.w,
        h: m.h,
        x: Math.round(cx - m.w / 2),
        y: Math.round(cy - m.h / 2),
        iconFitted: true,
      };
      if (silent) usePresentationStore.getState().patchElement(el.id, patch);
      else withHistory(() => usePresentationStore.getState().patchElement(el.id, patch));
    });
  },

  /** Fit all unfitted icons on the current slide. */
  fitAllIconBoundsOnSlide({ silent } = {}) {
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    if (!slide) return Promise.resolve();
    return ensureIcons().then(async () => {
      const { measureIconFitById } = await import('./iconFit.js');
      const patches = [];
      for (const el of slide.els || []) {
        if (!el || el.type !== 'icon' || !el.iconId || el.iconFitted) continue;
        const m = measureIconFitById(el.iconId, {
          sw: el.iconSw,
          fillOp: el.iconFillOp,
          color: el.iconColor || el.textColor,
          w: el.w,
          h: el.h,
        });
        if (!m) continue;
        const cx = (el.x || 0) + (el.w || 0) / 2;
        const cy = (el.y || 0) + (el.h || 0) / 2;
        patches.push({
          id: el.id,
          patch: {
            w: m.w,
            h: m.h,
            x: Math.round(cx - m.w / 2),
            y: Math.round(cy - m.h / 2),
            iconFitted: true,
          },
        });
      }
      if (!patches.length) return;
      const apply = () => {
        const store = usePresentationStore.getState();
        patches.forEach(({ id, patch }) => store.patchElement(id, patch));
      };
      if (silent) apply();
      else withHistory(apply);
    });
  },

  attachElementAsRider(elId, connId) {
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    if (!slide || !connId || !elId) return false;
    const els = slide.els || [];
    const conn = (slide.connectors || []).find((c) => c && String(c.id) === String(connId));
    const el = els.find((e) => e && String(e.id) === String(elId));
    if (!conn || !el) return false;
    const oldIds = els
      .filter((e) => e && String(e.rideConnId) === String(connId) && String(e.id) !== String(elId))
      .map((e) => e.id);
    withHistory(() => {
      if (oldIds.length) usePresentationStore.getState().deleteIds(oldIds);
      const pos = riderPositionFor(conn, usePresentationStore.getState().slides[st.cur]?.els || els, el);
      usePresentationStore.getState().patchElement(elId, {
        rideConnId: connId,
        ...(pos || {}),
      });
    });
    useSelectionStore.getState().pickConnector(connId);
    return true;
  },

  detachRideElement(connId) {
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    if (!slide || !connId) return;
    const rider = findRiderForConn(connId, slide.els);
    if (!rider) return;
    withHistory(() => usePresentationStore.getState().deleteIds([rider.id]));
    useSelectionStore.getState().pickConnector(connId);
  },

  beginAttachRideIcon(connId) {
    useUiStore.getState().setPendingRideConnId(connId);
    useUiStore.getState().setPanel('icons');
  },

  beginAttachRideImage(connId) {
    useUiStore.getState().setPendingRideConnId(connId);
    editorApi.openImagePicker();
  },

  formatText(cmd) {
    if (typeof document === 'undefined') return;
    if (cmd === 'underline') {
      editorApi.cycleTextUnderline();
      return;
    }
    const map = { bold: 'bold', italic: 'italic' };
    const exec = map[cmd] || cmd;
    try {
      document.execCommand(exec, false, null);
    } catch (e) {}
    const el = currentEl();
    const root = el ? editingTextRoot(el.id) : null;
    if (el && root) {
      withHistory(() =>
        usePresentationStore.getState().patchElement(el.id, {
          html: htmlFromEditable(root),
          text: plainFromEditable(root),
        })
      );
    }
  },

  cycleTextUnderline() {
    const el = currentEl();
    if (!el || el.type !== 'text') return;
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const editing = !!(active?.isContentEditable && active.closest?.(`[data-id="${el.id}"]`));
    
    if (editing) {
      // Use native execCommand for selection
      document.execCommand('underline', false, null);
      withHistory(() =>
        usePresentationStore.getState().patchElement(el.id, {
          html: htmlFromEditable(active),
          text: plainFromEditable(active),
        })
      );
    } else {
      // Apply to whole block
      const cur = parseUnderlineFromCs(el.cs);
      const next = nextUnderline(cur);
      withHistory(() =>
        usePresentationStore.getState().patchElement(el.id, {
          cs: applyUnderlineToCs(el.cs, next),
        })
      );
    }
  },

  cycleTextStrikethrough() {
    const el = currentEl();
    if (!el || el.type !== 'text') return;
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const editing = !!(active?.isContentEditable && active.closest?.(`[data-id="${el.id}"]`));
    
    if (editing) {
      // Use native execCommand for strikethrough
      document.execCommand('strikeThrough', false, null);
      withHistory(() =>
        usePresentationStore.getState().patchElement(el.id, {
          html: htmlFromEditable(active),
          text: plainFromEditable(active),
        })
      );
    } else {
      // Apply to WHOLE block via cs
      const cur = parseStrikeFromCs(el.cs);
      const next = nextStrike(cur);
      withHistory(() =>
        usePresentationStore.getState().patchElement(el.id, {
          cs: applyStrikeToCs(el.cs, next),
        })
      );
    }
  },

  toggleTextStress() {
    const el = currentEl();
    if (!el || el.type !== 'text') {
      useUiStore.getState().showToast(ru() ? 'Выберите текст' : 'Select text', 'warn');
      return;
    }
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const editing = !!(active?.isContentEditable && active.closest?.(`[data-id="${el.id}"]`));
    if (editing) {
      const html = toggleStressInEditable(active);
      if (html == null) return;
      withHistory(() =>
        usePresentationStore.getState().patchElement(el.id, {
          html,
          text: active.innerText || active.textContent || '',
        })
      );
      return;
    }
    const next = toggleStressInHtml(el.html || el.text || '');
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, {
        html: next,
        text: String(next).replace(/<[^>]+>/g, ''),
      })
    );
  },

  toggleTextScript(kind) {
    const el = currentEl();
    if (!el || el.type !== 'text') {
      useUiStore.getState().showToast(ru() ? 'Выберите текст' : 'Select text', 'warn');
      return;
    }
    const mode = kind === 'sub' ? 'sub' : 'super';
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const editing = !!(active?.isContentEditable && active.closest?.(`[data-id="${el.id}"]`));
    if (editing) {
      const html = toggleScriptInEditable(active, mode);
      if (html == null) return;
      withHistory(() =>
        usePresentationStore.getState().patchElement(el.id, {
          html,
          text: active.innerText || active.textContent || '',
        })
      );
      return;
    }
    const next = toggleScriptInHtml(el.html || el.text || '', mode);
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, {
        html: next,
        text: String(next).replace(/<[^>]+>/g, ''),
      })
    );
  },

  toggleBulletList() {
    if (!iconsReady()) {
      ensureIcons().then(() => editorApi.toggleBulletList());
      return;
    }
    const el = currentEl();
    if (!el || el.type !== 'text') {
      useUiStore.getState().showToast(ru() ? 'Выберите текст' : 'Select text', 'warn');
      return;
    }
    const root = editingTextRoot(el.id);
    const html = readLiveTextHtml(el);
    const indices = root ? targetedLineIndices(root) : null;
    const wasOn = htmlHasList(html, 'bullet');
    const iconId = el.bulletIconId || DEFAULT_BULLET_ICON_ID;
    const next = toggleListHtml(
      html,
      'bullet',
      {
        iconId,
        color: el.bulletIconColor || el.textColor || 'currentColor',
        sw: el.bulletIconSw != null ? el.bulletIconSw : 1.8,
        fillOp: 0,
      },
      indices
    );
    const extra = {};
    if (!wasOn || htmlHasList(next, 'bullet')) extra.bulletIconId = iconId;
    patchTextHtml(el, next, extra, indices && indices.length === 1 ? indices[0] : null);
  },

  setBulletIcon(iconId) {
    if (!iconsReady()) {
      ensureIcons().then(() => editorApi.setBulletIcon(iconId));
      return;
    }
    const el = currentEl();
    if (!el || el.type !== 'text') {
      useUiStore.getState().showToast(ru() ? 'Выберите текст' : 'Select text', 'warn');
      return;
    }
    const id = iconId || '';
    const opts = {
      iconId: id,
      color: el.bulletIconColor || el.textColor || 'currentColor',
      sw: el.bulletIconSw != null ? el.bulletIconSw : 1.8,
      fillOp: 0,
    };
    const live = editingTextRoot(el.id) || textBodyRoot(el.id);
    let html = null;
    if (live && htmlHasList(live.innerHTML || '', 'bullet')) {
      html = updateLiveBulletMarkers(live, opts);
    }
    if (html == null) {
      html = readLiveTextHtml(el);
      if (htmlHasList(html, 'bullet')) html = reapplyBulletMarkers(html, opts);
    }
    patchTextHtml(el, html, { bulletIconId: id || null });
  },

  setBulletColor(color, schemeRef) {
    if (!iconsReady()) {
      ensureIcons().then(() => editorApi.setBulletColor(color, schemeRef));
      return;
    }
    const el = currentEl();
    if (!el || el.type !== 'text') return;
    const c = color || el.textColor || 'currentColor';
    const opts = {
      iconId: el.bulletIconId || DEFAULT_BULLET_ICON_ID,
      color: c,
      sw: el.bulletIconSw != null ? el.bulletIconSw : 1.8,
      fillOp: 0,
    };
    const live = editingTextRoot(el.id) || textBodyRoot(el.id);
    let html = null;
    if (live && htmlHasList(live.innerHTML || '', 'bullet')) {
      html = updateLiveBulletMarkers(live, opts);
    }
    if (html == null) {
      html = readLiveTextHtml(el);
      if (htmlHasList(html, 'bullet')) html = reapplyBulletMarkers(html, opts);
    }
    patchTextHtml(el, html, {
      bulletIconColor: color || '',
      bulletIconScheme: schemeRef || null,
    });
  },

  setBulletGap(px) {
    const el = currentEl();
    if (!el || el.type !== 'text') return;
    const g = Math.max(0, Math.min(80, Math.round(+px || 0)));
    withHistory(() => usePresentationStore.getState().patchElement(el.id, { bulletGap: g }));
  },

  toggleElementLock(id) {
    const { slides, cur, patchElement } = usePresentationStore.getState();
    const elId = id || useSelectionStore.getState().selId;
    const el = elId ? (slides[cur]?.els || []).find((e) => e && String(e.id) === String(elId)) : null;
    if (!el || el._isDecor) return;
    withHistory(() => patchElement(el.id, { locked: !el.locked }));
  },

  addMarkdown(raw) {
    if (raw != null) {
      return editorApi.applyMarkdown({ mdRaw: String(raw) });
    }
    useSelectionStore.getState().pickOne(null);
    useUiStore.getState().openMarkdownModal();
    return null;
  },

  editMarkdown(id) {
    if (id) pick(id);
    useUiStore.getState().openMarkdownModal();
  },

  applyMarkdown(opts = {}) {
    const mdRaw = opts.mdRaw != null ? String(opts.mdRaw) : DEFAULT_MD;
    const patch = {
      mdRaw,
      mdHtml: markdownToHtml(mdRaw),
      mdFs: Math.max(10, Math.min(48, +opts.mdFs || 16)),
      mdColor: opts.mdColor || '#ffffff',
    };
    if (opts.id) {
      withHistory(() => usePresentationStore.getState().patchElement(opts.id, patch));
      pick(opts.id);
      useUiStore.getState().showToast(ru() ? 'Markdown обновлён' : 'Markdown updated', 'ok');
      return opts.id;
    }
    const id = withHistory(() =>
      usePresentationStore.getState().addElement({
        type: 'markdown',
        x: 60,
        y: 60,
        w: 550,
        h: 400,
        ...patch,
        anims: [],
      })
    );
    pick(id);
    useUiStore.getState().showToast(ru() ? 'Markdown вставлен' : 'Markdown inserted', 'ok');
    return id;
  },

  toggleNumberedList() {
    const el = currentEl();
    if (!el || el.type !== 'text') {
      useUiStore.getState().showToast(ru() ? 'Выберите текст' : 'Select text', 'warn');
      return;
    }
    const root = editingTextRoot(el.id);
    const html = readLiveTextHtml(el);
    const indices = root ? targetedLineIndices(root) : null;
    const next = toggleListHtml(html, 'num', {}, indices);
    patchTextHtml(el, next, {}, indices && indices.length === 1 ? indices[0] : null);
  },

  textHasList(listType) {
    const el = currentEl();
    if (!el || el.type !== 'text') return false;
    return htmlHasList(el.html, listType);
  },

  setTextFont(family) {
    editorApi.applyTextInline({ fontFamily: family });
  },

  /**
   * Size / color / font: selection when editing, otherwise the whole text box.
   * @param {{ fontSize?: number, color?: string, schemeRef?: object|null, fontFamily?: string }} patch
   */
  applyTextInline(patch = {}) {
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'formula')) return;
    const root = editingTextRoot(el.id);
    const selOn = !!(root && hasNonCollapsedSelection(root));
    if (selOn) {
      if (patch.color) execOnSelection('foreColor', patch.color);
      if (patch.fontFamily) execOnSelection('fontName', patch.fontFamily);
      if (patch.fontSize != null) applyCssToSelection({ fontSize: `${patch.fontSize}px` });
      withHistory(() =>
        usePresentationStore.getState().patchElement(el.id, {
          html: htmlFromEditable(root),
          text: plainFromEditable(root),
        })
      );
      return;
    }
    let cs = el.cs || '';
    const data = {};
    if (patch.fontSize != null) {
      cs = applyCsProp(cs, 'font-size', `${patch.fontSize}px`);
    }
    if (patch.fontFamily != null) {
      cs = applyFontFamily(cs, patch.fontFamily);
    }
    if (patch.color != null) {
      cs = applyCsProp(cs, 'color', patch.color);
      data.textColor = patch.color;
      data.textColorScheme = patch.schemeRef === undefined ? el.textColorScheme : patch.schemeRef;
      // Pass the box's PREVIOUS color so words deliberately highlighted in a different
      // color keep their own color/scheme mark instead of being wiped to the new scheme color.
      if (el.html) data.html = stripInlineTextColors(el.html, el.textColor || parseCsColor(el.cs));
    }
    data.cs = cs;
    withHistory(() => usePresentationStore.getState().patchElement(el.id, data));
  },

  setTextBold(on) {
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'formula')) return;
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, {
        cs: applyCsProp(el.cs, 'font-weight', on ? '700' : '400'),
      })
    );
  },

  setTextRole(role) {
    const el = currentEl();
    if (!el || el.type !== 'text') return;
    const next = role === 'heading' ? 'heading' : 'body';
    let cs = el.cs || '';
    cs = applyCsProp(cs, 'text-transform', next === 'heading' ? 'uppercase' : null);
    cs = applyCsProp(cs, 'font-weight', next === 'heading' ? '700' : '400');
    if (next === 'heading') {
      const fs = parseFloat((cs.match(/font-size\s*:\s*([\d.]+)px/i) || [])[1] || '36');
      if (fs < 36) cs = applyCsProp(cs, 'font-size', '48px');
    }
    const patch = { textRole: next, cs };
    if (next === 'heading') patch.valign = 'middle';
    withHistory(() => usePresentationStore.getState().patchElement(el.id, patch));
  },

  setTextItalic(on) {
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'formula')) return;
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, {
        cs: applyCsProp(el.cs, 'font-style', on ? 'italic' : 'normal'),
      })
    );
  },

  toggleTextStyle(kind) {
    const el = currentEl();
    if (!el || el.type !== 'text') return;
    const active = document.activeElement;
    if (active?.isContentEditable && active.closest(`[data-id="${el.id}"]`)) {
      const map = { bold: 'bold', italic: 'italic', underline: 'underline' };
      if (map[kind]) editorApi.formatText(map[kind]);
      return;
    }
    const cs = el.cs || '';
    if (kind === 'bold') {
      const on = !/font-weight\s*:\s*(bold|[6-9]00)/i.test(cs);
      editorApi.setTextBold(on);
    } else if (kind === 'italic') {
      const on = !/font-style\s*:\s*italic/i.test(cs);
      editorApi.setTextItalic(on);
    } else if (kind === 'underline') {
      editorApi.cycleTextUnderline();
    }
  },

  patchTableCell(id, r, c, html) {
    const { slides, cur } = usePresentationStore.getState();
    const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
    if (!el || el.type !== 'table') return;
    const cells = mapTableCells(el, (cell, rr, cc) =>
      rr === r && cc === c ? { ...cell, r: rr, c: cc, html } : { ...cell, r: rr, c: cc }
    );
    withHistory(() => usePresentationStore.getState().patchElement(id, { cells }));
  },

  patchTableCellProps(id, r, c, props) {
    const { slides, cur } = usePresentationStore.getState();
    const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
    if (!el || el.type !== 'table') return;
    const cells = mapTableCells(el, (cell, rr, cc) =>
      rr === r && cc === c ? { ...cell, r: rr, c: cc, ...props } : { ...cell, r: rr, c: cc }
    );
    withHistory(() => usePresentationStore.getState().patchElement(id, { cells }));
  },

  setTableAltRows(on) {
    const el = currentEl();
    if (!el || el.type !== 'table') return;
    if (on) {
      withHistory(() =>
        usePresentationStore.getState().patchElement(el.id, {
          altBg: '',
          altBgScheme: { col: 0, row: 7 },
        })
      );
    } else {
      withHistory(() =>
        usePresentationStore.getState().patchElement(el.id, { altBg: '', altBgScheme: null })
      );
    }
  },

  pickTableCell(elId, r, c, opts = {}) {
    if (elId == null || r == null || c == null) {
      useSelectionStore.getState().clearTableCells();
      return;
    }
    const st = useSelectionStore.getState();
    const anchor = st.tableCell;
    // v7.1 shift+click / drag: extend the range from the anchor cell
    if (opts.extend && anchor && String(anchor.elId) === String(elId)) {
      useSelectionStore
        .getState()
        .setTableCellSel(anchor, cellRangeKeys(+anchor.r, +anchor.c, +r, +c));
      return;
    }
    useSelectionStore.getState().setTableCell({ elId: String(elId), r: +r, c: +c });
  },

  /** v7.1 `tblSetCell*`: apply props to every selected cell (anchor only when none). */
  patchSelectedTableCells(props) {
    const el = currentEl();
    if (!el || el.type !== 'table') return;
    const st = useSelectionStore.getState();
    const sel = st.tableCell;
    const selSet = sel && String(sel.elId) === String(el.id) ? st.tableCellSel || [] : [];
    const keys = new Set(
      (selSet.length ? selSet : sel && String(sel.elId) === String(el.id) ? [{ r: sel.r, c: sel.c }] : []).map(
        (k) => `${+k.r}:${+k.c}`
      )
    );
    if (!keys.size) return;
    const cells = mapTableCells(el, (cell, rr, cc) => {
      if (!keys.has(`${rr}:${cc}`) || cell.hidden) return { ...cell, r: rr, c: cc };
      const next = { ...cell, r: rr, c: cc };
      Object.entries(props).forEach(([k, v]) => {
        if (v === '' || v == null || v === undefined) delete next[k];
        else next[k] = v;
      });
      return next;
    });
    withHistory(() => usePresentationStore.getState().patchElement(el.id, { cells }));
  },

  /** v7.1 `tblMerge`: merge the selected rectangle into a single cell. */
  tableMergeCells() {
    const el = currentEl();
    const st = useSelectionStore.getState();
    const sel = st.tableCell;
    if (!el || el.type !== 'table' || !sel || String(sel.elId) !== String(el.id)) {
      useUiStore.getState().showToast(ru() ? 'Выберите ячейки' : 'Select cells');
      return;
    }
    const keys = (st.tableCellSel || []).filter((k) => !getTableCell(el, +k.r, +k.c).hidden);
    if (keys.length < 2) {
      useUiStore.getState().showToast(ru() ? 'Выделите несколько ячеек' : 'Select several cells');
      return;
    }
    const rs = keys.map((k) => +k.r);
    const cs = keys.map((k) => +k.c);
    const minR = Math.min(...rs);
    const maxR = Math.max(...rs);
    const minC = Math.min(...cs);
    const maxC = Math.max(...cs);
    const spanR = maxR - minR + 1;
    const spanC = maxC - minC + 1;
    if (spanR * spanC !== keys.length) {
      useUiStore.getState().showToast(
        ru() ? 'Выделите прямоугольную область' : 'Select a rectangular area'
      );
      return;
    }
    let combined = '';
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const cell = getTableCell(el, r, c);
        if (cell && cell.html) combined += (combined ? ' ' : '') + cell.html;
      }
    }
    const cells = mapTableCells(el, (cell, r, c) => {
      if (r < minR || r > maxR || c < minC || c > maxC) return { ...cell, r, c };
      if (r === minR && c === minC) {
        return { ...cell, r, c, colspan: spanC, rowspan: spanR, html: combined, hidden: false };
      }
      return { ...cell, r, c, hidden: true, html: '', colspan: 1, rowspan: 1 };
    });
    withHistory(() => usePresentationStore.getState().patchElement(el.id, { cells }));
    useSelectionStore.getState().setTableCell({ elId: String(el.id), r: minR, c: minC });
  },

  /** v7.1 `tblSplit`: unmerge the anchor cell. */
  tableSplitCells() {
    const el = currentEl();
    const st = useSelectionStore.getState();
    const sel = st.tableCell;
    if (!el || el.type !== 'table' || !sel || String(sel.elId) !== String(el.id)) {
      useUiStore.getState().showToast(ru() ? 'Выберите ячейку' : 'Select a cell');
      return;
    }
    const { r, c } = sel;
    const anchor = getTableCell(el, r, c);
    const spanC = anchor.colspan || 1;
    const spanR = anchor.rowspan || 1;
    if (spanC <= 1 && spanR <= 1) {
      useUiStore.getState().showToast(ru() ? 'Ячейка не объединена' : 'Cell is not merged');
      return;
    }
    const cells = mapTableCells(el, (cell, rr, cc) => {
      if (rr === r && cc === c) return { ...cell, r, c, colspan: 1, rowspan: 1 };
      if (rr >= r && rr < r + spanR && cc >= c && cc < c + spanC) {
        return { ...cell, r: rr, c: cc, hidden: false, html: '', colspan: 1, rowspan: 1 };
      }
      return { ...cell, r: rr, c: cc };
    });
    withHistory(() => usePresentationStore.getState().patchElement(el.id, { cells }));
  },

  /** v7.1 `tblSet('colWidths'/'rowHeights')` for resize handles. */
  tableSetColWidths(id, colWidths, opts = {}) {
    const apply = () => usePresentationStore.getState().patchElement(id, { colWidths });
    if (opts.history === false) apply();
    else withHistory(apply);
  },

  tableSetRowHeights(id, rowHeights, opts = {}) {
    const apply = () => usePresentationStore.getState().patchElement(id, { rowHeights });
    if (opts.history === false) apply();
    else withHistory(apply);
  },

  /** v7.1 `tblClearTableFormat`. */
  tableClearFormat() {
    const el = currentEl();
    if (!el || el.type !== 'table') return;
    const cells = mapTableCells(el, (cell) => {
      if (cell.hidden) return { ...cell };
      const next = { ...cell };
      next.align = 'left';
      next.valign = 'middle';
      delete next.bg;
      delete next.bgScheme;
      delete next.fs;
      delete next.textColor;
      delete next.textColorScheme;
      delete next.ff;
      next.html = stripCellHtml(next.html);
      return next;
    });
    withHistory(() => usePresentationStore.getState().patchElement(el.id, { cells }));
    useUiStore.getState().showToast(ru() ? 'Формат таблицы очищен' : 'Table format cleared', 'ok');
  },

  /** v7.1 `tblResetCellTextFormat`: reset formatting of selected cells. */
  tableResetCellFormat() {
    const el = currentEl();
    const st = useSelectionStore.getState();
    const sel = st.tableCell;
    if (
      !el ||
      el.type !== 'table' ||
      !sel ||
      String(sel.elId) !== String(el.id) ||
      !(st.tableCellSel || []).length
    ) {
      useUiStore.getState().showToast(ru() ? 'Выберите ячейки' : 'Select cells');
      return;
    }
    const keys = new Set((st.tableCellSel || []).map((k) => `${+k.r}:${+k.c}`));
    const cells = mapTableCells(el, (cell, r, c) => {
      if (!keys.has(`${r}:${c}`) || cell.hidden) return { ...cell };
      const next = { ...cell };
      next.html = stripCellHtml(next.html);
      delete next.fs;
      delete next.textColor;
      return next;
    });
    withHistory(() => usePresentationStore.getState().patchElement(el.id, { cells }));
    useUiStore.getState().showToast(ru() ? 'Форматирование сброшено' : 'Formatting reset', 'ok');
  },

  tableAddRow(opts = {}) {
    const el = currentEl();
    if (!el || el.type !== 'table') return;
    const cols = el.cols || 1;
    const sel = useSelectionStore.getState().tableCell;
    let at = el.rows || 1;
    if (opts.before && sel && String(sel.elId) === String(el.id)) at = sel.r;
    else if (opts.after && sel && String(sel.elId) === String(el.id)) at = sel.r + 1;
    else if (opts.at != null) at = Math.max(0, Math.min(el.rows || 0, +opts.at));
    const rows = (el.rows || 1) + 1;
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r < at) cells.push({ ...getTableCell(el, r, c), r, c });
        else if (r === at) cells.push({ r, c, html: '', align: 'left', valign: 'middle', bg: '' });
        else cells.push({ ...getTableCell(el, r - 1, c), r, c });
      }
    }
    const rowHeights = Array(rows).fill(1 / rows);
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, { rows, cells, rowHeights })
    );
  },

  tableAddCol(opts = {}) {
    const el = currentEl();
    if (!el || el.type !== 'table') return;
    const rows = el.rows || 1;
    const sel = useSelectionStore.getState().tableCell;
    let at = el.cols || 1;
    if (opts.before && sel && String(sel.elId) === String(el.id)) at = sel.c;
    else if (opts.after && sel && String(sel.elId) === String(el.id)) at = sel.c + 1;
    else if (opts.at != null) at = Math.max(0, Math.min(el.cols || 0, +opts.at));
    const cols = (el.cols || 1) + 1;
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c < at) cells.push({ ...getTableCell(el, r, c), r, c });
        else if (c === at) cells.push({ r, c, html: '', align: 'left', valign: 'middle', bg: '' });
        else cells.push({ ...getTableCell(el, r, c - 1), r, c });
      }
    }
    const colWidths = Array(cols).fill(1 / cols);
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, { cols, cells, colWidths })
    );
  },

  tableDelRow() {
    const el = currentEl();
    if (!el || el.type !== 'table' || (el.rows || 1) <= 1) return;
    const st = useSelectionStore.getState();
    const sel = st.tableCell;
    const selSet = sel && String(sel.elId) === String(el.id) ? st.tableCellSel || [] : [];
    // v7.1: delete every unique selected row (desc), keep at least one row
    let delRows = selSet.length
      ? [...new Set(selSet.map((k) => +k.r))].sort((a, b) => b - a)
      : [(el.rows || 1) - 1];
    delRows = delRows.filter((r) => r >= 0 && r < (el.rows || 0)).slice(0, (el.rows || 1) - 1);
    if (!delRows.length) return;
    const delSet = new Set(delRows);
    const rows = (el.rows || 1) - delRows.length;
    const cols = el.cols || 1;
    const cells = [];
    let nr = 0;
    for (let r = 0; r < (el.rows || 0); r++) {
      if (delSet.has(r)) continue;
      for (let c = 0; c < cols; c++) cells.push({ ...getTableCell(el, r, c), r: nr, c });
      nr += 1;
    }
    const rowHeights = Array(rows).fill(1 / rows);
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, { rows, cells, rowHeights })
    );
    if (sel && String(sel.elId) === String(el.id)) {
      useSelectionStore.getState().setTableCell({
        elId: String(el.id),
        r: Math.min(sel.r, rows - 1),
        c: sel.c,
      });
    }
  },

  tableDelCol() {
    const el = currentEl();
    if (!el || el.type !== 'table' || (el.cols || 1) <= 1) return;
    const st = useSelectionStore.getState();
    const sel = st.tableCell;
    const selSet = sel && String(sel.elId) === String(el.id) ? st.tableCellSel || [] : [];
    // v7.1: delete every unique selected col (desc), keep at least one col
    let delCols = selSet.length
      ? [...new Set(selSet.map((k) => +k.c))].sort((a, b) => b - a)
      : [(el.cols || 1) - 1];
    delCols = delCols.filter((c) => c >= 0 && c < (el.cols || 0)).slice(0, (el.cols || 1) - 1);
    if (!delCols.length) return;
    const delSet = new Set(delCols);
    const cols = (el.cols || 1) - delCols.length;
    const rows = el.rows || 1;
    const cells = [];
    for (let r = 0; r < rows; r++) {
      let nc = 0;
      for (let c = 0; c < (el.cols || 0); c++) {
        if (delSet.has(c)) continue;
        cells.push({ ...getTableCell(el, r, c), r, c: nc });
        nc += 1;
      }
    }
    const colWidths = Array(cols).fill(1 / cols);
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, { cols, cells, colWidths })
    );
    if (sel && String(sel.elId) === String(el.id)) {
      useSelectionStore.getState().setTableCell({
        elId: String(el.id),
        r: sel.r,
        c: Math.min(sel.c, cols - 1),
      });
    }
  },

  addFormula() {
    import('./mathlive.js')
      .then((m) => m.loadMathLive())
      .catch(() => {});
    useUiStore.getState().openFormulaModal();
  },

  async commitFormula({ latex, svg, color, id, lines }) {
    if (!latex || !svg) return;
    useUiStore.getState().closeFormulaModal();
    const { extractFormulaLines } = await import('./graph.js');
    const { FORMULA_DEFAULT_COLOR_SCHEME } = await import('./formulaEditorData.js');
    const formulaLines =
      Array.isArray(lines) && lines.length
        ? lines.map((l) => String(l || '').trim()).filter(Boolean)
        : extractFormulaLines(latex);

    const st = usePresentationStore.getState();
    const theme = getTheme(st.appliedThemeIdx);
    const existing =
      id != null
        ? (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === String(id))
        : null;

    let scheme = FORMULA_DEFAULT_COLOR_SCHEME;
    let formulaColor =
      resolveSchemeColor(FORMULA_DEFAULT_COLOR_SCHEME, theme) ||
      (theme && !theme.dark ? '#000000' : '#ffffff');

    if (existing) {
      if (existing.formulaColorScheme != null) {
        scheme = existing.formulaColorScheme;
        formulaColor =
          resolveSchemeColor(scheme, theme) || existing.formulaColor || formulaColor;
      } else if (existing.textColorScheme != null && existing.type === 'formula') {
        scheme = existing.textColorScheme;
        formulaColor =
          resolveSchemeColor(scheme, theme) || existing.formulaColor || existing.textColor || formulaColor;
      } else if (existing.formulaColor || existing.textColor) {
        formulaColor = existing.formulaColor || existing.textColor;
        scheme = existing.formulaColorScheme ?? existing.textColorScheme ?? null;
      }
    }
    if (color) formulaColor = color;

    const patch = {
      formulaRaw: latex,
      formulaSvg: svg,
      formulaColor,
      formulaColorScheme: scheme,
      textColor: formulaColor,
      textColorScheme: scheme,
      html: latex,
    };
    if (formulaLines.length) patch.formulaLines = formulaLines;

    if (id) {
      withHistory(() => usePresentationStore.getState().patchElement(id, patch));
      pick(id);
      await editorApi.syncLinkedGraphsFromFormula(id);
      return id;
    }
    const nid = withHistory(() =>
      usePresentationStore.getState().addElement({
        type: 'formula',
        x: 200,
        y: 220,
        w: 480,
        h: 120,
        ...patch,
        cs: `font-size:40px;font-family:Georgia,serif;color:${formulaColor};text-align:center;`,
        valign: 'middle',
      })
    );
    pick(nid);
    return nid;
  },

  async syncLinkedGraphsFromFormula(formulaId) {
    const store = usePresentationStore.getState();
    const slide = store.slides[store.cur];
    if (!slide) return;
    const formula = (slide.els || []).find(
      (e) => e && String(e.id) === String(formulaId) && e.type === 'formula'
    );
    if (!formula) return;
    const linked = (slide.els || []).filter(
      (e) => e && e.type === 'graph' && String(e.linkedFormulaId) === String(formulaId)
    );
    if (!linked.length) return;
    const { ensureChemLoaded, ensureLogicLoaded, parseFnFormula, rebuildGraphElAsync } =
      await import('./graph.js');
    let chem = null;
    let logic = null;
    try {
      chem = await ensureChemLoaded();
    } catch (e) {}
    try {
      logic = await ensureLogicLoaded();
    } catch (e) {}
    const raw = formula.formulaRaw || '';
    for (const g of linked) {
      const next = { ...g };
      let asFn = true;
      try {
        if (logic?.isLogicFormula?.(raw)) {
          next.graphKind = 'logic';
          next.graphLatex = raw;
          next.graphLines = [raw];
          asFn = false;
        } else if (chem?.isChemFormula?.(raw) && typeof chem.chemRender === 'function') {
          const probe = chem.chemRender(raw, { w: 120, h: 100, fg: '#fff', isDark: true });
          if (probe?.dataUrl && probe.chemKey) {
            next.graphKind = 'chem';
            next.graphLatex = raw;
            next.chemKey = probe.chemKey;
            next.chemName = probe.chemName;
            next.graphLines = [raw];
            asFn = false;
          }
        }
      } catch (e) {}
      if (asFn) {
        const parsed = parseFnFormula(formula);
        if (!parsed.exprs.length) continue;
        next.graphKind = 'fn';
        next.graphExprs = parsed.exprs;
        next.graphLines = parsed.lines;
        next.graphExpr = parsed.exprs[0];
        next.graphLatex = parsed.lines[0];
      }
      await rebuildGraphElAsync(next);
      store.patchElement(g.id, {
        graphKind: next.graphKind,
        graphImg: next.graphImg,
        graphExpr: next.graphExpr,
        graphExprs: next.graphExprs,
        graphLines: next.graphLines,
        graphLatex: next.graphLatex,
        chemKey: next.chemKey,
        chemName: next.chemName,
      });
    }
  },

  importPPTX() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pptx,.ppt,.odp,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await editorApi.importDroppedFile(file);
    };
    input.click();
  },

  importHTML() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.htm,text/html';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await editorApi.importDroppedFile(file);
    };
    input.click();
  },

  async importHtmlContent(html) {
    const { parseExportedHtml } = await import('./htmlImport.js');
    const deck = parseExportedHtml(html);
    if (!deck?.slides?.length) {
      useUiStore
        .getState()
        .showToast(ru() ? 'Не файл «Слайды»' : 'Not a Slides export', 'err');
      return false;
    }
    useHistoryStore.getState().clear();
    stampOrigFs(deck.slides);
    const ok = commitImportedDeck(deck, { skipFormatReset: true });
    pick(null);
    useUiStore
      .getState()
      .showToast(
        ok
          ? ru()
            ? `Импортировано слайдов: ${deck.slides.length}`
            : `Imported slides: ${deck.slides.length}`
          : ru()
            ? 'Ошибка импорта'
            : 'Import failed',
        ok ? 'ok' : 'err'
      );
    return ok;
  },

  /** Import project JSON or HTML string (remote catalog / ?import=). */
  async importPresentationRaw(raw, fileHint = 'presentation.html') {
    const name = String(fileHint || '');
    const text = String(raw || '');
    const isLite = /\.json$/i.test(name) || text.trim().charAt(0) === '{';
    if (isLite) {
      try {
        const obj = JSON.parse(text);
        const deck = Array.isArray(obj) ? { slides: obj, cur: 0 } : obj;
        if (!deck?.slides?.length && !(Array.isArray(obj) && obj.length)) {
          useUiStore.getState().showToast(ru() ? 'Неверный JSON' : 'Invalid JSON', 'err');
          return false;
        }
        useHistoryStore.getState().clear();
        stampOrigFs(deck.slides);
        const ok = commitImportedDeck(
          Array.isArray(obj) ? { slides: obj, cur: 0 } : obj,
          { skipFormatReset: true }
        );
        pick(null);
        useUiStore
          .getState()
          .showToast(ok ? (ru() ? 'Импортировано' : 'Imported') : ru() ? 'Ошибка' : 'Failed', ok ? 'ok' : 'err');
        return ok;
      } catch (e) {
        useUiStore.getState().showToast(ru() ? 'Ошибка JSON' : 'JSON error', 'err');
        return false;
      }
    }
    return editorApi.importHtmlContent(text);
  },

  async importPresentationFromUrl(fileUrl) {
    const {
      fetchPresentationRaw,
      fetchCatalogFileRaw,
      normalizeImportAbs,
      joinUrl,
      getStoredImportBase,
      setAddressImportUrl,
      splitImportAbsFile,
    } = await import('./importGallery.js');
    let abs = normalizeImportAbs(String(fileUrl || '').trim());
    if (!abs) {
      useUiStore.getState().showToast(ru() ? 'Не указан URL' : 'No URL', 'err');
      return false;
    }
    if (!/^https?:\/\//i.test(abs)) {
      abs = joinUrl(getStoredImportBase(), abs);
    }
    useUiStore.getState().showToast(ru() ? 'Импорт…' : 'Importing…');
    try {
      let raw = '';
      try {
        let rel = '';
        const stored = getStoredImportBase();
        const a = String(abs);
        const b = String(stored || '');
        if (b && a.indexOf(b) === 0) rel = a.slice(b.length).replace(/^\/+/, '');
        raw = rel ? await fetchCatalogFileRaw(stored, rel) : await fetchPresentationRaw(abs);
      } catch (eFast) {
        raw = await fetchPresentationRaw(abs);
      }
      let fileName = 'presentation.html';
      let parsed = null;
      try {
        parsed = splitImportAbsFile(abs);
        fileName = parsed.file || fileName;
        abs = parsed.abs;
      } catch (e) {}
      const ok = await editorApi.importPresentationRaw(raw, fileName);
      if (ok) {
        try {
          if (parsed) setAddressImportUrl(joinUrl(parsed.base, parsed.file));
          else setAddressImportUrl(abs);
        } catch (e) {}
      }
      return ok;
    } catch (err) {
      console.warn('[importPresentationFromUrl]', err);
      useUiStore
        .getState()
        .showToast(
          ru() ? `Импорт: ${err.message || err}` : `Import: ${err.message || err}`,
          'err'
        );
      return false;
    }
  },

  async consumeImportUrl() {
    const { readImportParam, getStoredImportBase, joinUrl } = await import('./importGallery.js');
    let abs = readImportParam();
    if (!abs) return false;
    if (!/^https?:\/\//i.test(abs) && abs.indexOf('/') >= 0) {
      abs = joinUrl(getStoredImportBase(), abs);
    }
    return editorApi.importPresentationFromUrl(abs);
  },

  /**
   * Drop / open any supported file. Returns true if handled.
   */
  async importDroppedFile(file) {
    if (!file) return false;
    const name = String(file.name || '').toLowerCase();
    const ext = (name.split('.').pop() || '').toLowerCase();
    const {
      isVideoFile,
      isAudioFile,
      isMdFile,
      isCodeFile,
      isImageFile,
      extOf,
    } = await import('./fileDrop.js');
    const { codeLangFromFilename } = await import('./codeHighlight.js');

    // Presentations (.pptx ZIP, classic OLE .ppt, or ODP)
    if (['pptx', 'ppt', 'odp'].includes(ext)) {
      const kind = ext === 'odp' ? 'ODP' : ext === 'ppt' ? 'PPT' : 'PPTX';
      useUiStore.getState().showToast(ru() ? `Импорт ${kind}…` : `Importing ${kind}…`);
      try {
        const { canvasW, canvasH } = usePresentationStore.getState();
        const result = await importPptxFile(file, { canvasW, canvasH, filename: file.name });
        stampOrigFs(result.slides);
        useHistoryStore.getState().clear();
        commitImportedDeck({
          slides: result.slides,
          title: result.title,
          canvasW: result.canvasW || canvasW,
          canvasH: result.canvasH || canvasH,
          ar: result.ar,
          cur: 0,
        });
        pick(null);
        useUiStore
          .getState()
          .showToast(
            ru()
              ? `Импортировано слайдов: ${result.slides.length}`
              : `Imported slides: ${result.slides.length}`,
            'ok'
          );
        return true;
      } catch (e) {
        console.warn('[importDroppedFile pptx]', e);
        const msg = String(e && e.message ? e.message : e);
        let text;
        if (/ODP:|opendocument/i.test(msg) && /missing|no slides/i.test(msg)) {
          text = ru()
            ? `Не удалось прочитать ODP: ${msg}`
            : `Failed to read ODP: ${msg}`;
        } else if (/No PowerPoint Document|No slides\/text|OLE/i.test(msg)) {
          text = ru()
            ? `Не удалось прочитать .ppt: ${msg}. Попробуйте сохранить как .pptx`
            : `Failed to read .ppt: ${msg}. Try saving as .pptx`;
        } else {
          text = ru() ? `Ошибка импорта: ${msg}` : `Import error: ${msg}`;
        }
        useUiStore.getState().showToast(text, 'warn');
        return false;
      }
    }

    if (ext === 'html' || ext === 'htm') {
      useUiStore.getState().showToast(ru() ? 'Импорт HTML…' : 'Importing HTML…');
      try {
        const text = await file.text();
        return await editorApi.importHtmlContent(text);
      } catch (e) {
        useUiStore.getState().showToast(ru() ? 'Ошибка чтения HTML' : 'HTML read error', 'err');
        return false;
      }
    }

    // Project JSON
    if (name.endsWith('.slides.json') || ext === 'slides') {
      try {
        const data = JSON.parse(await file.text());
        useHistoryStore.getState().clear();
        const ok = commitImportedDeck(data, { skipFormatReset: true });
        pick(null);
        useUiStore
          .getState()
          .showToast(ok ? (ru() ? 'Импортировано' : 'Imported') : ru() ? 'Неверный файл' : 'Invalid file', ok ? 'ok' : 'err');
        return ok;
      } catch (e) {
        useUiStore.getState().showToast(ru() ? 'Ошибка JSON' : 'JSON error', 'err');
        return false;
      }
    }

    if (ext === 'json') {
      try {
        const text = await file.text();
        const obj = JSON.parse(text);
        const looksProject =
          obj &&
          (Array.isArray(obj.slides) ||
            (Array.isArray(obj) && obj.length && obj[0] && Array.isArray(obj[0].els)));
        if (looksProject) {
          const deck = Array.isArray(obj) ? { slides: obj, cur: 0 } : obj;
          useHistoryStore.getState().clear();
          const ok = commitImportedDeck(deck);
          pick(null);
          useUiStore
            .getState()
            .showToast(
              ok ? (ru() ? 'Импортировано' : 'Imported') : ru() ? 'Неверный файл' : 'Invalid file',
              ok ? 'ok' : 'err'
            );
          return ok;
        }
        editorApi.applyCode({ codeRaw: text, codeLang: 'json' });
        return true;
      } catch (e) {
        useUiStore.getState().showToast(ru() ? 'Ошибка JSON' : 'JSON error', 'err');
        return false;
      }
    }

    // SVG markup
    if (ext === 'svg' || file.type === 'image/svg+xml') {
      try {
        const text = await file.text();
        editorApi.applySvg({ svgContent: text });
        return true;
      } catch (e) {
        useUiStore.getState().showToast(ru() ? 'Ошибка SVG' : 'SVG error', 'err');
        return false;
      }
    }

    if (isImageFile(file)) {
      editorApi.addImageFromFile(file);
      return true;
    }

    if (isVideoFile(file) || isAudioFile(file)) {
      const kind = isVideoFile(file) ? 'mediavideo' : 'mediaaudio';
      const id = withHistory(() =>
        usePresentationStore.getState().addElement({
          type: kind,
          x: 80,
          y: 80,
          w: kind === 'mediavideo' ? 480 : 320,
          h: kind === 'mediavideo' ? 270 : 72,
          mediaSrc: '',
          mediaSrcType: 'url',
          mvControls: 'controls',
          maLoop: false,
          anims: [],
        })
      );
      pick(id);
      try {
        const mediaId = await putFromFile(file);
        const play = resolveMediaSrc({ mediaId, mediaSrc: '' });
        withHistory(() =>
          usePresentationStore.getState().patchElement(id, {
            mediaId,
            mediaSrc: play,
            mediaSrcType: 'idb',
            mediaName: file.name,
          })
        );
        useUiStore.getState().showToast(ru() ? 'Медиа загружено' : 'Media loaded', 'ok');
      } catch (e) {
        useUiStore.getState().showToast(ru() ? 'Ошибка загрузки медиа' : 'Media load failed', 'warn');
      }
      return true;
    }

    if (ext === 'obj') {
      try {
        const text = await file.text();
        if (!text || !/\bv\s+/.test(text)) {
          useUiStore.getState().showToast(ru() ? 'Не похоже на OBJ' : 'Not a valid OBJ', 'warn');
          return false;
        }
        const { defaultModel3dFields: mkObj } = await import('./model3d.js');
        const id = withHistory(() =>
          usePresentationStore.getState().addElement(
            mkObj({
              objText: text,
              objName: file.name || 'model.obj',
            })
          )
        );
        pick(id);
        useUiStore.getState().showToast(ru() ? 'Модель OBJ добавлена' : 'OBJ model added', 'ok');
        return true;
      } catch (e) {
        useUiStore.getState().showToast(ru() ? 'Ошибка чтения OBJ' : 'Failed to read OBJ', 'warn');
        return false;
      }
    }

    if (isMdFile(file)) {
      const text = await file.text();
      editorApi.applyMarkdown({ mdRaw: text });
      return true;
    }

    if (isCodeFile(file)) {
      const text = await file.text();
      const langId = codeLangFromFilename(file.name) || 'plain';
      editorApi.applyCode({ codeRaw: text, codeLang: langId });
      return true;
    }

    useUiStore
      .getState()
      .showToast(
        ru() ? `Неподдерживаемый формат: .${extOf(file.name)}` : `Unsupported: .${extOf(file.name)}`,
        'err'
      );
    return false;
  },

  dupSelected() {
    const id = useSelectionStore.getState().selId;
    if (!id) return;
    const nid = withHistory(() => usePresentationStore.getState().dupElement(id));
    if (nid) pick(nid);
  },

  align(mode, scope = 'slide') {
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
    if (!ids.length) return;
    const { slides, cur, canvasW, canvasH, patchElement } = usePresentationStore.getState();
    const all = slides[cur]?.els || [];
    const els = all.filter((e) => e && ids.includes(String(e.id)));
    if (!els.length) return;
    const result = computeAlignPatches(els, all, mode, scope, canvasW, canvasH);
    if (!result || !Object.keys(result.patches).length) return;
    withHistory(() => {
      Object.entries(result.patches).forEach(([id, patch]) => patchElement(id, patch));
    });
  },

  distribute(axis = 'h', scope = 'sel') {
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
    const { slides, cur, canvasW, canvasH, patchElement } = usePresentationStore.getState();
    const all = slides[cur]?.els || [];
    const els = all.filter((e) => e && ids.includes(String(e.id)));
    const result = computeDistributePatches(els, all, axis, scope, canvasW, canvasH);
    if (!result) return;
    if (result.toast === 'need2') {
      useUiStore.getState().showToast(ru() ? 'Выберите 2+ объекта' : 'Select 2+ objects');
      return;
    }
    if (!Object.keys(result.patches).length) return;
    withHistory(() => {
      Object.entries(result.patches).forEach(([id, patch]) => patchElement(id, patch));
    });
  },

  exportJSON() {
    const data = usePresentationStore.getState().exportDeck();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (data.title || 'slides') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    useUiStore.getState().showToast(ru() ? 'Экспортировано' : 'Exported', 'ok');
  },

  exportHTML() {
    const data = usePresentationStore.getState().exportDeck();
    (data.slides || []).forEach((slide) => {
      if (!slide?.els) return;
      slide.els = slide.els.map((el) =>
        el && el.type === 'applet'
          ? rebuildAppletHtml(el, getTheme(usePresentationStore.getState().appliedThemeIdx))
          : el
      );
    });
    useUiStore.getState().showToast(ru() ? 'Экспорт HTML…' : 'Exporting HTML…');
    ensureIcons()
      .then(() => prepareDeckForHtmlExport(data))
      .then((prepared) => {
        downloadHtml(prepared);
        useUiStore.getState().showToast(ru() ? 'HTML сохранён' : 'HTML saved', 'ok');
      })
      .catch((e) => {
        console.warn('[exportHTML]', e);
        downloadHtml(data);
        useUiStore.getState().showToast(ru() ? 'HTML сохранён' : 'HTML saved', 'ok');
      });
  },

  async exportPNG(mode = 'current') {
    const st = usePresentationStore.getState();
    useUiStore.getState().showToast(ru() ? 'Экспорт PNG…' : 'Exporting PNG…');
    try {
      const indices = Array.isArray(mode)
        ? mode
        : mode === 'all'
          ? null
          : mode === 'current'
            ? [st.cur | 0]
            : null;
      if (mode === 'current' || (Array.isArray(indices) && indices.length === 1)) {
        const only = Array.isArray(indices) ? indices[0] : st.cur | 0;
        const prev = st.cur | 0;
        if (only !== prev) st.setCur(only);
        try {
          await exportCurrentSlidePng({
            canvasW: st.canvasW,
            canvasH: st.canvasH,
            filename: `${st.title || 'slide'}-${only + 1}`,
          });
        } finally {
          if (only !== prev) st.setCur(prev);
        }
        useUiStore.getState().showToast(ru() ? 'PNG сохранён' : 'PNG saved', 'ok');
        return;
      }
      const n = await exportAllSlidesPngZip({
        slides: st.slides,
        canvasW: st.canvasW,
        canvasH: st.canvasH,
        setCur: (i) => st.setCur(i),
        cur: st.cur,
        title: st.title || 'slides',
        indices: indices || undefined,
      });
      useUiStore
        .getState()
        .showToast(ru() ? `PNG: ${n} слайдов в ZIP` : `PNG: ${n} slides in ZIP`, 'ok');
    } catch (e) {
      console.warn('[exportPNG]', e);
      useUiStore
        .getState()
        .showToast(ru() ? `Ошибка PNG: ${e.message || e}` : `PNG error: ${e.message || e}`, 'warn');
    }
  },

  async exportPDF() {
    const st = usePresentationStore.getState();
    if (!st.slides?.length) {
      useUiStore.getState().showToast(ru() ? 'Нет слайдов' : 'No slides', 'warn');
      return;
    }
    useUiStore.getState().showToast(ru() ? 'Экспорт PDF…' : 'Exporting PDF…');
    try {
      const n = await exportAllSlidesPdf({
        slides: st.slides,
        canvasW: st.canvasW,
        canvasH: st.canvasH,
        setCur: (i) => st.setCur(i),
        cur: st.cur,
        title: st.title || 'slides',
      });
      useUiStore
        .getState()
        .showToast(ru() ? `PDF: ${n} слайдов` : `PDF: ${n} slides`, 'ok');
    } catch (e) {
      console.warn('[exportPDF]', e);
      useUiStore
        .getState()
        .showToast(ru() ? `Ошибка PDF: ${e.message || e}` : `PDF error: ${e.message || e}`, 'warn');
    }
  },

  async exportPPTX() {
    const st = usePresentationStore.getState();
    if (!st.slides?.length) {
      useUiStore.getState().showToast(ru() ? 'Нет слайдов' : 'No slides', 'warn');
      return;
    }
    useUiStore.getState().showToast(ru() ? 'Экспорт PPTX…' : 'Exporting PPTX…');
    try {
      const n = await exportAllSlidesPptx({
        slides: st.slides,
        canvasW: st.canvasW,
        canvasH: st.canvasH,
        setCur: (i) => st.setCur(i),
        cur: st.cur,
        title: st.title || 'slides',
      });
      useUiStore
        .getState()
        .showToast(ru() ? `PPTX: ${n} слайдов` : `PPTX: ${n} slides`, 'ok');
    } catch (e) {
      console.warn('[exportPPTX]', e);
      useUiStore
        .getState()
        .showToast(ru() ? `Ошибка PPTX: ${e.message || e}` : `PPTX error: ${e.message || e}`, 'warn');
    }
  },

  async exportODP() {
    const st = usePresentationStore.getState();
    if (!st.slides?.length) {
      useUiStore.getState().showToast(ru() ? 'Нет слайдов' : 'No slides', 'warn');
      return;
    }
    useUiStore.getState().showToast(ru() ? 'Экспорт ODP…' : 'Exporting ODP…');
    try {
      const n = await exportAllSlidesOdp({
        slides: st.slides,
        canvasW: st.canvasW,
        canvasH: st.canvasH,
        setCur: (i) => st.setCur(i),
        cur: st.cur,
        title: st.title || 'slides',
      });
      useUiStore
        .getState()
        .showToast(ru() ? `ODP: ${n} слайдов` : `ODP: ${n} slides`, 'ok');
    } catch (e) {
      console.warn('[exportODP]', e);
      useUiStore
        .getState()
        .showToast(ru() ? `Ошибка ODP: ${e.message || e}` : `ODP error: ${e.message || e}`, 'warn');
    }
  },

  startImageCrop(id) {
    const { slides, cur } = usePresentationStore.getState();
    const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
    if (!el || el.type !== 'image') return;
    const ui = useUiStore.getState();
    if (String(ui.cropModeElId) === String(id)) ui.setCropModeElId(null);
    else ui.setCropModeElId(String(id));
  },

  endImageCrop() {
    useUiStore.getState().setCropModeElId(null);
  },

  /** Set the selected image as the slide background (like v7.1). */
  setImageAsSlideBg(id) {
    const { slides, cur } = usePresentationStore.getState();
    const slide = slides[cur];
    const el = (slide?.els || []).find((e) => e && String(e.id) === String(id));
    if (!el || el.type !== 'image' || !el.src) return;
    const ru = useUiStore.getState().lang !== 'en';
    withHistory(() => {
      const name = el.imgName || 'image';
      slide.bgImg = { src: el.src, name, mode: 'cover', opacity: 1, blur: 0, tileSize: 120, tileGap: 10, tileRot: 0 };
      slide.bg = 'custom';
      // Remove the image element from the slide
      slide.els = (slide.els || []).filter((e) => String(e.id) !== String(id));
      usePresentationStore.getState().persist();
    });
    // Deselect
    useSelectionStore.getState().pickOne(null);
    useUiStore.getState().setCropModeElId(null);
    useUiStore.getState().showToast(ru ? 'Установлено как фон' : 'Set as background', 'ok');
  },

  setIconAsSlideBg(id) {
    const { slides, cur } = usePresentationStore.getState();
    const slide = slides[cur];
    const el = (slide?.els || []).find((e) => e && String(e.id) === String(id));
    if (!el || el.type !== 'icon' || !el.iconId) return;
    const ru = useUiStore.getState().lang !== 'en';
    const ic = getIconById(el.iconId);
    if (!ic) return;
    const color = el.iconColor || el.textColor || '#6366f1';
    const sw = el.iconSw != null ? el.iconSw : 1.8;
    const fillOp = el.iconFillOp != null ? el.iconFillOp : 1;
    const pathOv = iconHasAnim(ic) ? iconStaticPath(ic, false) : null;
    let svg = buildIconSVG(ic, color, sw, fillOp, pathOv);
    const op = el.elOpacity != null ? Math.max(0, Math.min(1, +el.elOpacity)) : 1;
    const name = ic.name || 'Icon';
    withHistory(() => {
      slide.bgImg = {
        fromIcon: true,
        iconId: el.iconId,
        iconColor: color,
        iconSw: sw,
        iconFillOp: fillOp,
        iconFitted: !!el.iconFitted,
        shadow: el.shadow,
        shadowBlur: el.shadowBlur,
        shadowColor: el.shadowColor,
        shadowSize: el.shadowSize,
        name,
        mode: 'cover',
        opacity: op,
        blur: 0,
        tileSize: 120,
        tileGap: 10,
        tileRot: 0,
        src: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
      };
      slide.bg = 'custom';
      slide.els = (slide.els || []).filter((e) => String(e.id) !== String(id));
      usePresentationStore.getState().persist();
    });
    useSelectionStore.getState().pickOne(null);
    useUiStore.getState().showToast(ru ? 'Установлено как фон' : 'Set as background', 'ok');
  },

  addVideo() {
    const id = withHistory(() =>
      usePresentationStore.getState().addElement({
        type: 'mediavideo',
        x: 80,
        y: 80,
        w: 480,
        h: 270,
        mediaSrc: '',
        mediaSrcType: 'url',
        mvControls: 'controls',
        mvDisplay: 'windowed',
        mvStart: 'click',
        anims: [],
      })
    );
    pick(id);
    editorApi.pickMediaFile(id, 'video/*');
    return id;
  },

  addAudio() {
    const id = withHistory(() =>
      usePresentationStore.getState().addElement({
        type: 'mediaaudio',
        x: 80,
        y: 80,
        w: 320,
        h: 72,
        mediaSrc: '',
        mediaSrcType: 'url',
        maLoop: false,
        maVolume: 1,
        maStart: 'click-el',
        anims: [],
      })
    );
    pick(id);
    editorApi.pickMediaFile(id, 'audio/*');
    return id;
  },

  pickMediaFile(id, accept) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || 'video/*,audio/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !id) return;
      try {
        const mediaId = await putFromFile(file);
        const play = resolveMediaSrc({ mediaId, mediaSrc: '' });
        withHistory(() =>
          usePresentationStore.getState().patchElement(id, {
            mediaId,
            mediaSrc: play,
            mediaSrcType: 'idb',
            mediaName: file.name,
          })
        );
        useUiStore.getState().showToast(ru() ? 'Медиа загружено' : 'Media loaded', 'ok');
      } catch (e) {
        console.warn('[pickMediaFile]', e);
        useUiStore.getState().showToast(ru() ? 'Ошибка загрузки медиа' : 'Media load failed', 'warn');
      }
    };
    input.click();
  },

  getAudioLibrary() {
    return getAudioLibrary();
  },

  setMediaLibrarySound(id, path) {
    if (!id || !path) return;
    const item = getAudioLibrary().find((a) => a.path === path || a.id === path);
    const src = item?.path || path;
    withHistory(() =>
      usePresentationStore.getState().patchElement(id, {
        mediaSrc: src,
        mediaSrcType: 'url',
        mediaId: undefined,
        mediaName: item?.name || item?.file || src.split('/').pop(),
      })
    );
    useUiStore.getState().showToast(
      ru() ? `Звук: ${item?.name || src}` : `Sound: ${item?.name || src}`,
      'ok'
    );
  },

  openCodeModal() {
    useUiStore.getState().openCodeModal();
  },

  addCode(raw) {
    if (raw != null) {
      return editorApi.applyCode({ codeRaw: String(raw) });
    }
    useSelectionStore.getState().pickOne(null);
    useUiStore.getState().openCodeModal();
    return null;
  },

  editCode(id) {
    if (id) pick(id);
    useUiStore.getState().openCodeModal();
  },

  applyCode(opts = {}) {
    const st = usePresentationStore.getState();
    const themeObj = getTheme(st.appliedThemeIdx);
    const defTheme = themeObj && themeObj.dark === false ? 'light' : 'dark';
    const codeRaw =
      opts.codeRaw != null
        ? String(opts.codeRaw)
        : ru()
          ? '// код\nconsole.log("привет");'
          : '// code\nconsole.log("hello");';
    const base = {
      codeRaw,
      codeLang: normalizeCodeLang(opts.codeLang || 'js'),
      codeTheme: opts.codeTheme || defTheme,
      codeGlass: !!opts.codeGlass,
      codeFs: Math.max(10, Math.min(28, +opts.codeFs || 14)),
    };
    const hl = ensureCodeHtml(base, defTheme);
    const patch = { ...base, ...hl };
    if (opts.id) {
      withHistory(() => st.patchElement(opts.id, patch));
      pick(opts.id);
      // Sync to linked htmlframe if this code has a parent
      editorApi._hfSyncFromLinkedCode(opts.id);
      useUiStore.getState().showToast(ru() ? 'Код обновлён' : 'Code updated', 'ok');
      return opts.id;
    }
    const id = withHistory(() =>
      usePresentationStore.getState().addElement({
        type: 'code',
        x: 80,
        y: 80,
        w: Math.max(200, +opts.w || 520),
        h: Math.max(80, +opts.h || 280),
        ...patch,
        anims: [],
      })
    );
    pick(id);
    useUiStore.getState().showToast(ru() ? 'Код вставлен' : 'Code inserted', 'ok');
    return id;
  },

  insertQuote() {
    const st = usePresentationStore.getState();
    const color = quoteThemeColor(st.appliedThemeIdx);
    const q = pickRandomQuote(getQuoteCat());
    const el = makeQuoteElement(q, {
      canvasW: st.canvasW,
      canvasH: st.canvasH,
      color,
    });
    const id = withHistory(() => usePresentationStore.getState().addElement(el));
    pick(id);
    const short = (q.author || '').slice(0, 40);
    useUiStore.getState().showToast(ru() ? `Цитата${short ? ': ' + short : ''}` : `Quote${short ? ': ' + short : ''}`, 'ok');
    return id;
  },

  fillSelectedWithQuote() {
    const { selId } = useSelectionStore.getState();
    const { slides, cur, appliedThemeIdx, patchElement } = usePresentationStore.getState();
    const el = selId ? (slides[cur]?.els || []).find((e) => e && String(e.id) === String(selId)) : null;
    if (!el || el.type !== 'text') {
      useUiStore.getState().showToast(ru() ? 'Выберите текстовый блок' : 'Select a text block', 'err');
      return;
    }
    const q = pickRandomQuote(getQuoteCat());
    const html = buildQuoteHtml(q.text, q.author, '', { preserveBlockStyle: true });
    const next = { ...el, html };
    const h = measureTextHeight(next);
    withHistory(() => patchElement(el.id, { html, h: Math.max(el.h || 60, h) }));
    const short = (q.author || '').slice(0, 40);
    useUiStore.getState().showToast(ru() ? `Цитата${short ? ': ' + short : ''}` : `Quote${short ? ': ' + short : ''}`, 'ok');
  },

  setQuoteCategory(id) {
    const next = setQuoteCat(id);
    useUiStore.getState().showToast(ru() ? `Категория: ${next}` : `Category: ${next}`, 'ok');
    return next;
  },

  openHtmlFrameModal() {
    useUiStore.getState().openHtmlFrameModal();
  },

  addHtmlFrame() {
    useSelectionStore.getState().pickOne(null);
    useUiStore.getState().openHtmlFrameModal();
  },

  applyHtmlFrame(opts = {}) {
    const hfSrc = String(opts.hfSrc || '').trim();
    if (!hfSrc) return null;
    const w = Math.max(80, +opts.w || 640);
    const h = Math.max(60, +opts.h || 400);
    const patch = {
      hfSrc,
      hfScroll: !!opts.hfScroll,
      hfChrome: opts.hfChrome !== false,
      w,
      h,
    };
    if (opts.id) {
      withHistory(() => usePresentationStore.getState().patchElement(opts.id, patch));
      pick(opts.id);
      // Sync to linked code element if this htmlframe has one
      editorApi._hfSyncLinkedCode(opts.id);
      useUiStore.getState().showToast(ru() ? 'HTML-фрейм обновлён' : 'HTML frame updated', 'ok');
      return opts.id;
    }
    const id = withHistory(() =>
      usePresentationStore.getState().addElement({
        type: 'htmlframe',
        x: 60,
        y: 60,
        ...patch,
        rot: 0,
        anims: [],
        hfLinkedCodeId: null,
      })
    );
    pick(id);
    useUiStore.getState().showToast(ru() ? 'HTML-фрейм вставлен' : 'HTML frame inserted', 'ok');
    return id;
  },

  /** Find the linked code element for an htmlframe. */
  hfLinkedCodeFor(hfId) {
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    if (!slide) return null;
    const d = slide.els.find((e) => e && String(e.id) === String(hfId));
    if (!d || d.type !== 'htmlframe') return null;
    if (d.hfLinkedCodeId) {
      const byId = slide.els.find((e) => e && String(e.id) === String(d.hfLinkedCodeId));
      if (byId) return byId;
    }
    return slide.els.find((e) => e && e.type === 'code' && e.hfParentId === d.id) || null;
  },

  /** Toggle linked code element for the selected htmlframe. */
  hfToggleLinkedCode() {
    const { selId } = useSelectionStore.getState();
    if (!selId) return;
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    if (!slide) return;
    const d = slide.els.find((e) => e && String(e.id) === String(selId));
    if (!d || d.type !== 'htmlframe') return;
    const src = d.hfSrc || '';
    if (/^https?:\/\//i.test(src)) {
      useUiStore.getState().showToast(ru() ? 'Код доступен только для HTML-блоков' : 'Code view only for HTML blocks', 'warn');
      return;
    }
    const existing = editorApi.hfLinkedCodeFor(d.id);
    if (existing) {
      // Remove linked code
      withHistory(() => {
        const s = usePresentationStore.getState();
        s.deleteIds([existing.id]);
        s.patchElement(d.id, { hfLinkedCodeId: null });
      });
    } else {
      // Create linked code element
      const themeObj = getTheme(st.appliedThemeIdx);
      const defTheme = themeObj && themeObj.dark === false ? 'light' : 'dark';
      const T = CODE_THEMES[defTheme] || { bg: '#0d1117', text: '#e6edf3' };
      const codeRaw = src;
      const base = {
        codeRaw,
        codeLang: 'html',
        codeTheme: defTheme,
        codeGlass: false,
        codeFs: 16,
      };
      const hl = ensureCodeHtml(base, defTheme);
      const cd = {
        type: 'code',
        x: Math.round(d.x + d.w + 20),
        y: d.y,
        w: Math.min(d.w, 560),
        h: d.h,
        ...base,
        ...hl,
        rot: 0,
        anims: [],
        hfParentId: d.id,
      };
      const cdId = withHistory(() => {
        const id = usePresentationStore.getState().addElement(cd);
        usePresentationStore.getState().patchElement(d.id, { hfLinkedCodeId: id });
        return id;
      });
      pick(cdId);
    }
  },

  /** Sync htmlframe source → linked code element. */
  _hfSyncLinkedCode(hfId) {
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    if (!slide) return;
    const d = slide.els.find((e) => e && String(e.id) === String(hfId));
    if (!d || d.type !== 'htmlframe' || !d.hfLinkedCodeId) return;
    const cd = slide.els.find((e) => e && String(e.id) === String(d.hfLinkedCodeId));
    if (!cd || cd.type !== 'code') return;
    const src = d.hfSrc || '';
    if (/^https?:\/\//i.test(src)) return;
    const theme = cd.codeTheme || 'dark';
    const base = { codeRaw: src, codeLang: cd.codeLang || 'html', codeTheme: theme, codeGlass: !!cd.codeGlass, codeFs: cd.codeFs || 14 };
    const hl = ensureCodeHtml(base, theme);
    usePresentationStore.getState().patchElement(cd.id, { ...base, ...hl });
  },

  /** Sync code element → parent htmlframe source. */
  _hfSyncFromLinkedCode(codeId) {
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    if (!slide) return;
    const cd = slide.els.find((e) => e && String(e.id) === String(codeId));
    if (!cd || cd.type !== 'code') return;
    let parentId = cd.hfParentId || null;
    let parent = parentId ? slide.els.find((e) => e && String(e.id) === String(parentId)) : null;
    if (!parent || parent.type !== 'htmlframe') {
      parent = slide.els.find((e) => e && e.type === 'htmlframe' && e.hfLinkedCodeId === cd.id) || null;
      if (parent) {
        cd.hfParentId = parent.id;
        parentId = parent.id;
      }
    }
    if (!parent || parent.type !== 'htmlframe') return;
    const src = String(cd.codeRaw != null ? cd.codeRaw : '');
    if (/^https?:\/\//i.test(src.trim())) return;
    usePresentationStore.getState().patchElement(parent.id, { hfSrc: src });
  },

  cutSelected() {
    editorApi.copySelected();
    editorApi.deleteSelected();
  },

  moveSelectedBy(dx, dy) {
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = multiSel?.length ? multiSel : selId ? [selId] : [];
    if (!ids.length) return;
    usePresentationStore.getState().moveElements(ids, dx, dy);
  },

  copySelected() {
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
    if (!ids.length) return;
    const { slides, cur } = usePresentationStore.getState();
    const els = (slides[cur]?.els || [])
      .filter((e) => e && ids.includes(String(e.id)) && !e._isDecor && e.type !== 'pagenum')
      .map((e) => JSON.parse(JSON.stringify(e)));
    if (!els.length) return;
    usePresentationStore.setState({ clipboard: { els, sourceSlideIdx: cur }, slideClipboard: null, clipSource: 'elements' });
    writeOsClipboard(els, cur).catch(() => {});
    useUiStore.getState().showToast(ru() ? `Скопировано: ${els.length}` : `Copied: ${els.length}`, 'ok');
  },

  async pasteSelected(opts = {}) {
    const ok = await pasteWithoutEvent(editorApi._pasteFacade(), {
      preferThumbStrip: !!opts.preferThumbStrip,
    });
    if (!ok) {
      useUiStore.getState().showToast(ru() ? 'Нечего вставлять' : 'Nothing to paste', 'warn');
    }
    return ok;
  },

  async handlePasteEvent(e) {
    return handlePasteEvent(e, editorApi._pasteFacade());
  },

  markWindowBlur() {
    markWindowBlur();
  },

  _pasteFacade() {
    return {
      pasteTsvOrCreateTable: (...a) => editorApi.pasteTsvOrCreateTable(...a),
      applyHtmlFrame: (...a) => editorApi.applyHtmlFrame(...a),
      applyCode: (...a) => editorApi.applyCode(...a),
      addQrCode: (...a) => editorApi.addQrCode(...a),
      addImageFromFile: (...a) => editorApi.addImageFromFile(...a),
      addImageFromUrl: (src) => editorApi.addImageFromUrl(src),
      pasteSlide: (...a) => editorApi.pasteSlide(...a),
      _pasteRu: () => ru(),
      _pasteToast: (msg, kind) => useUiStore.getState().showToast(msg, kind),
      _pasteReadStore: () => usePresentationStore.getState(),
      _pasteSetElements: (els) =>
        usePresentationStore.setState({ clipboard: { els }, slideClipboard: null }),
      _pasteSetSlides: (slides) =>
        usePresentationStore.setState({ slideClipboard: slides, clipboard: null }),
      _pasteElements: (els) => {
        if (!els?.length) return;
        const newIds = [];
        const { cur, clipboard } = usePresentationStore.getState();
        // Only nudge the pasted copy away from the original when it lands on the SAME slide
        // it was copied from — otherwise you'd paste an exact duplicate stacked invisibly on
        // top of the original. Pasting onto a DIFFERENT slide keeps the exact x/y instead,
        // since there's no risk of overlap there and matching the original position is what's
        // expected when reusing an element across slides.
        const sourceSlideIdx = clipboard?.sourceSlideIdx != null ? clipboard.sourceSlideIdx : getCopySourceSlideIdx();
        const sameSlide = sourceSlideIdx != null && sourceSlideIdx === cur;
        const offset = sameSlide ? 28 : 0;
        withHistory(() => {
          els.forEach((src) => {
            const copy = JSON.parse(JSON.stringify(src));
            delete copy.id;
            copy.x = (copy.x || 0) + offset;
            copy.y = (copy.y || 0) + offset;
            delete copy.groupId;
            const id = usePresentationStore.getState().addElement(copy);
            if (id) newIds.push(String(id));
          });
        });
        if (newIds.length) {
          useSelectionStore.getState().setMultiSel(newIds);
          useSelectionStore.getState().setSelId(newIds[newIds.length - 1]);
        }
        useUiStore.getState().showToast(
          ru() ? `Вставлено: ${newIds.length}` : `Pasted: ${newIds.length}`,
          'ok'
        );
      },
      _pastePlainText: (content) => {
        const st = usePresentationStore.getState();
        const fields = buildPastedTextFields(content, st);
        const id = withHistory(() => usePresentationStore.getState().addElement(fields));
        pick(id);
        useUiStore.getState().showToast(ru() ? 'Текст вставлен' : 'Text pasted', 'ok');
      },
    };
  },

  addImageFromUrl(src) {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const maxW = 480;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const id = withHistory(() =>
        usePresentationStore.getState().addElement({
          type: 'image',
          x: 120,
          y: 80,
          w: Math.round(img.width * scale),
          h: Math.round(img.height * scale),
          src,
        })
      );
      pick(id);
      useUiStore.getState().showToast(ru() ? 'Изображение вставлено' : 'Image pasted', 'ok');
    };
    img.onerror = () => {
      useUiStore.getState().showToast(ru() ? 'Не удалось загрузить изображение' : 'Image load failed', 'err');
    };
    img.src = src;
  },

  selectAll() {
    const { slides, cur } = usePresentationStore.getState();
    const ids = (slides[cur]?.els || [])
      .filter((e) => e && !e._isDecor && e.type !== 'pagenum')
      .map((e) => String(e.id));
    if (!ids.length) return;
    useSelectionStore.getState().setMultiSel(ids);
    useSelectionStore.getState().setSelId(ids[ids.length - 1]);
  },

  setPageNumbers(patch) {
    const st = usePresentationStore.getState();
    const next = { ...pnDefaults(), ...(st.pnSettings || {}), ...patch };
    withHistory(() => {
      st.setPnSettings(next);
      editorApi.applyPageNumbers(next);
    });
  },

  applyPageNumbers(settings) {
    const st = usePresentationStore.getState();
    const s = settings || st.pnSettings || pnDefaults();
    const slides = JSON.parse(JSON.stringify(st.slides));
    const total = slides.length;
    const { canvasW, canvasH } = st;
    if (!s.enabled) {
      slides.forEach((slide) => {
        slide.els = (slide.els || []).filter((e) => e && e.type !== 'pagenum');
      });
      st.replaceSlides(slides, st.cur);
      return;
    }
    const color = s.color || '#3b82f6';
    const { w, h } = pnSize(s.fontSize);
    const xy = s.customXY || pnPresetXY(s.position, s.fontSize, canvasW, canvasH);
    slides.forEach((slide, si) => {
      slide.els = (slide.els || []).filter((e) => e && e.type !== 'pagenum');
      slide.els.push({
        id: 'pn_' + si,
        type: 'pagenum',
        x: xy.x,
        y: xy.y,
        w,
        h,
        rot: 0,
        anims: [],
        elOpacity: s.opacity,
        pnStyle: s.style,
        pnPos: s.position,
        pnColor: color,
        pnTextColor: s.textColor,
        pnFontSize: s.fontSize,
        pnShowTotal: s.showTotal,
        html: pnBuildHtml(si, total, s.style, s.showTotal, color, s.textColor, s.fontSize),
      });
    });
    st.replaceSlides(slides, st.cur);
  },

  /** After dragging a page-number badge — lock position for all slides. */
  syncPageNumFromElement(el) {
    if (!el || el.type !== 'pagenum') return;
    const x = Math.round(+el.x || 0);
    const y = Math.round(+el.y || 0);
    const st = usePresentationStore.getState();
    const next = { ...pnDefaults(), ...(st.pnSettings || {}), customXY: { x, y } };
    st.setPnSettings(next);
    editorApi.applyPageNumbers(next);
  },

  connectSelected() {
    const { multiSel, selId } = useSelectionStore.getState();
    let ids = (multiSel || []).map(String);
    if (ids.length < 2 && selId) ids = [String(selId)];
    if (ids.length !== 2) {
      useUiStore.getState().showToast(ru() ? 'Выберите ровно 2 объекта' : 'Select exactly 2 objects', 'warn');
      return;
    }
    const { slides, cur } = usePresentationStore.getState();
    const els = slides[cur]?.els || [];
    const a = els.find((e) => e && String(e.id) === ids[0]);
    const b = els.find((e) => e && String(e.id) === ids[1]);
    if (!a || !b || a._isDecor || b._isDecor) {
      useUiStore.getState().showToast(ru() ? 'Нельзя связать декор' : 'Cannot connect decor', 'warn');
      return;
    }
    editorApi.linkTwoElements(a.id, b.id);
  },

  linkTwoElements(fromId, toId) {
    const { slides, cur } = usePresentationStore.getState();
    const els = slides[cur]?.els || [];
    const a = els.find((e) => e && String(e.id) === String(fromId));
    const b = els.find((e) => e && String(e.id) === String(toId));
    if (!a || !b || a._isDecor || b._isDecor) return false;
    if (String(a.id) === String(b.id)) return false;
    const conns = slides[cur]?.connectors || [];
    const existing = conns.find(
      (c) =>
        c &&
        ((String(c.fromId) === String(a.id) && String(c.toId) === String(b.id)) ||
          (String(c.fromId) === String(b.id) && String(c.toId) === String(a.id)))
    );
    if (existing) {
      withHistory(() => usePresentationStore.getState().deleteConnector(existing.id));
      if (useSelectionStore.getState().selConnId && String(useSelectionStore.getState().selConnId) === String(existing.id)) {
        useSelectionStore.getState().setSelConnId(null);
      }
      useUiStore.getState().showToast(ru() ? 'Связь удалена' : 'Connector removed', 'ok');
      return true;
    }
    const sides = nearestSides(a, b);
    withHistory(() =>
      usePresentationStore.getState().addConnector({
        fromId: a.id,
        toId: b.id,
        fromSide: sides.fromSide,
        toSide: sides.toSide,
        route: 'curve',
      })
    );
    useUiStore.getState().showToast(ru() ? 'Связь создана' : 'Connector added', 'ok');
    return true;
  },

  startConnectorMode(type = 'line') {
    const ui = useUiStore.getState();
    const was = ui.connectorMode;
    ui.startConnectorMode(type);
    const now = useUiStore.getState().connectorMode;
    if (!now) {
      ui.showToast(ru() ? 'Режим связей выключен' : 'Connect mode off', 'ok');
      return;
    }
    if (!was) {
      ui.showToast(ru() ? 'Нажмите на первый объект' : 'Click the first object', 'ok');
    }
  },

  cancelConnectorMode() {
    useUiStore.getState().cancelConnectorMode();
  },

  /** Handle click while connector draw mode is active. Returns true if consumed. */
  connectorModeClick(elId) {
    const ui = useUiStore.getState();
    const mode = ui.connectorMode;
    if (!mode || !elId) return false;
    const { slides, cur } = usePresentationStore.getState();
    const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(elId));
    if (!el || el._isDecor || el.type === 'connector') return true;
    if (mode.step === 1) {
      ui.setConnectorMode({ ...mode, step: 2, fromId: String(elId) });
      ui.showToast(ru() ? 'Теперь второй объект' : 'Now click the second object', 'ok');
      return true;
    }
    if (mode.step === 2) {
      if (String(elId) === String(mode.fromId)) return true;
      editorApi.linkTwoElements(mode.fromId, elId);
      ui.setConnectorMode({ step: 1, fromId: null, type: mode.type || 'line' });
      ui.showToast(ru() ? 'Нажмите на первый объект (Esc — выход)' : 'Click first object (Esc to exit)', 'ok');
      return true;
    }
    return false;
  },

  setCanvasSize(w, h, ar) {
    const W = Math.max(320, Math.min(3840, Math.round(+w || DEFAULT_CANVAS_W)));
    const H = Math.max(180, Math.min(3840, Math.round(+h || DEFAULT_CANVAS_H)));
    withHistory(() => {
      usePresentationStore.getState().resizeCanvasScaled(W, H, ar || 'custom');
      editorApi._refreshDecorAfterResize();
    });
    useUiStore.getState().showToast(ru() ? `Холст ${W}×${H}` : `Canvas ${W}×${H}`, 'ok');
  },

  canvasArDims(ar) {
    return canvasArDims(ar);
  },

  setAspectRatio(ratio) {
    const next = ratio === '9:16' ? '9:16' : '16:9';
    const st = usePresentationStore.getState();
    // Keep current resolution — only swap orientation (e.g. 2560×1440 → 1440×2560).
    const longSide = Math.max(st.canvasW || DEFAULT_CANVAS_W, st.canvasH || DEFAULT_CANVAS_H);
    const shortSide = Math.min(st.canvasW || DEFAULT_CANVAS_W, st.canvasH || DEFAULT_CANVAS_H);
    const w = next === '16:9' ? longSide : shortSide;
    const h = next === '16:9' ? shortSide : longSide;
    if (st.ar === next && st.canvasW === w && st.canvasH === h) return;
    withHistory(() => {
      usePresentationStore.getState().resizeCanvasScaled(w, h, next);
      editorApi._refreshDecorAfterResize();
    });
    useUiStore.getState().showToast(
      ru()
        ? `Холст ${next} (${w}×${h})`
        : `Canvas ${next} (${w}×${h})`,
      'ok'
    );
  },

  toggleAspectRatio() {
    const st = usePresentationStore.getState();
    const cur = matchCanvasAr(st.canvasW, st.canvasH, st.ar);
    const portrait =
      cur === '9:16' || (cur === 'custom' && (st.canvasH || 0) > (st.canvasW || 0));
    editorApi.setAspectRatio(portrait ? '16:9' : '9:16');
  },

  _refreshDecorAfterResize() {
    const store = usePresentationStore.getState();
    store.slides.forEach((s, si) => {
      const d = (s.els || []).find((e) => e && e._isDecor);
      if (!d) return;
      const decor = makeDecorEl(si, d._layoutIdx, d._decorStyle || 'content', !!d._decorMirror);
      if (decor) store.replaceSlideDecor(si, decor);
    });
  },

  addLineAngleBetweenSelected() {
    const { multiSel, selId } = useSelectionStore.getState();
    let ids = (multiSel || []).map(String);
    if (ids.length < 2 && selId) ids = [String(selId)];
    if (ids.length !== 2) {
      useUiStore.getState().showToast(
        ru() ? 'Выделите два связанных отрезка' : 'Select two joined line segments',
        'warn'
      );
      return;
    }
    const { slides, cur } = usePresentationStore.getState();
    const els = slides[cur]?.els || [];
    const a = els.find((e) => e && String(e.id) === ids[0]);
    const b = els.find((e) => e && String(e.id) === ids[1]);
    if (!a || !b || a.shape !== 'line' || b.shape !== 'line') {
      useUiStore.getState().showToast(
        ru() ? 'Нужны две фигуры «линия»' : 'Need two line shapes',
        'warn'
      );
      return;
    }
    const join = findSharedJoin(a, b);
    if (!join) {
      useUiStore.getState().showToast(
        ru() ? 'Концы линий должны сходиться' : 'Line ends must meet',
        'warn'
      );
      return;
    }
    const existing = els.find(
      (e) =>
        e &&
        e.type === 'lineangle' &&
        ((e.lineIdA === a.id && e.lineIdB === b.id) || (e.lineIdA === b.id && e.lineIdB === a.id))
    );
    if (existing) {
      pick(existing.id);
      useUiStore.getState().showToast(ru() ? 'Угол уже нарисован' : 'Angle already exists', 'ok');
      return;
    }
    const draft = {
      ...defaultLineAngleFields({ d1: a, end1: join.end1, d2: b, end2: join.end2 }),
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    };
    const built = buildLineAngleContent(draft, els);
    if (!built) {
      useUiStore.getState().showToast(ru() ? 'Не удалось измерить угол' : 'Could not measure angle', 'warn');
      return;
    }
    const id = withHistory(() =>
      usePresentationStore.getState().addElement({
        ...draft,
        x: built.x,
        y: built.y,
        w: built.w,
        h: built.h,
        deg: built.deg,
        displayDeg: Math.round(built.deg * 10) / 10,
      })
    );
    pick(id);
    useUiStore.getState().showToast(ru() ? 'Угол добавлен' : 'Angle added', 'ok');
  },

  addApplet(kind) {
    if (kind === 'periodic') {
      useUiStore.getState().openPeriodicPicker({ mode: 'insert' });
      return null;
    }
    const meta = APPLET_INSERTS.find((a) => a.id === kind) || APPLET_INSERTS[0];
    const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
    const id = withHistory(() =>
      usePresentationStore.getState().addElement(rebuildAppletHtml(defaultAppletFields(meta.id), theme))
    );
    pick(id);
    useUiStore.getState().showToast(
      ru() ? `Аплет: ${meta.labelRu}` : `Applet: ${meta.labelEn}`,
      'ok'
    );
    return id;
  },

  insertPeriodicApplet(symbol) {
    const el = pteBySymbol(symbol) || pteBySymbol('Fe');
    if (!el) return null;
    const st = usePresentationStore.getState();
    const theme = getTheme(st.appliedThemeIdx);
    const bgScheme = pteDefaultBgScheme();
    const fgScheme = pteDefaultFgScheme();
    // Leave genBg/genColor empty so light UI gets grey→white→grey gradient (v7.1 default).
    const built = rebuildAppletHtml(
      {
        ...defaultAppletFields('periodic'),
        pteSymbol: el.s,
        pteIcon: false,
        genBg: '',
        genColor: '',
        genBgOp: 0.92,
        genBgBlur: 0,
        genBgScheme: bgScheme,
        genColorScheme: fgScheme,
        w: PTE_CARD_W,
        h: PTE_CARD_H,
      },
      theme
    );
    const id = withHistory(() => usePresentationStore.getState().addElement(built));
    pick(id);
    useUiStore.getState().showToast(ru() ? `${el.ru} (${el.s})` : `${el.en} (${el.s})`, 'ok');
    return id;
  },

  reselectPeriodicElement(elId) {
    const { slides, cur } = usePresentationStore.getState();
    const id = elId || useSelectionStore.getState().selId;
    const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
    if (!el || el.appletId !== 'periodic') return;
    useUiStore.getState().openPeriodicPicker({ mode: 'reselect', elId: el.id });
  },

  applyPeriodicSymbol(elId, symbol) {
    const el = pteBySymbol(symbol);
    if (!el || !elId) return;
    this.patchApplet(elId, { pteSymbol: el.s });
    useUiStore.getState().showToast(ru() ? `${el.ru} (${el.s})` : `${el.en} (${el.s})`, 'ok');
  },

  clearPeriodicBg(elId) {
    if (!elId) return;
    this.patchApplet(elId, { genBg: '', genBgScheme: pteDefaultBgScheme() });
  },

  /** Patch applet fields and rebuild appletHtml. */
  patchApplet(id, patch) {
    if (!id) return;
    const { slides, cur, appliedThemeIdx } = usePresentationStore.getState();
    const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
    if (!el || el.type !== 'applet') {
      withHistory(() => usePresentationStore.getState().patchElement(id, patch));
      return;
    }
    // Flip face: animate in-iframe; do not rebuild srcDoc (would kill the 3D flip).
    if (
      isFlipAppletId(el.appletId) &&
      patch &&
      Object.keys(patch).length === 1 &&
      Object.prototype.hasOwnProperty.call(patch, 'flipFace')
    ) {
      this.setFlipFace(id, patch.flipFace === 'back' ? 'back' : 'front');
      return;
    }
    let nextPatch = { ...patch };
    // Solid color → drop default gradient scheme; picking a non-default scheme slot also drops 7,7.
    if (el.appletId === 'periodic' && Object.prototype.hasOwnProperty.call(patch, 'genBg')) {
      if (patch.genBg && patch.genBgScheme == null) {
        nextPatch.genBgScheme = null;
      }
    }
    if (el.appletId === 'periodic' && Object.prototype.hasOwnProperty.call(patch, 'pteIcon')) {
      const icon = !!patch.pteIcon;
      const cx = (el.x || 0) + (el.w || PTE_CARD_W) / 2;
      const cy = (el.y || 0) + (el.h || PTE_CARD_H) / 2;
      const w = icon ? PTE_ICON_SIZE : PTE_CARD_W;
      const h = icon ? PTE_ICON_SIZE : PTE_CARD_H;
      nextPatch = { ...nextPatch, w, h, x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) };
    }
    const theme = getTheme(appliedThemeIdx);
    let next = rebuildAppletHtml({ ...el, ...nextPatch }, theme);

    // Linked counters (same cntGroupId): share settings across slides.
    if (el.appletId === 'counter') {
      const gid = String(next.cntGroupId || '').trim();
      const onlyGroupId =
        patch &&
        Object.keys(patch).length === 1 &&
        Object.prototype.hasOwnProperty.call(patch, 'cntGroupId');
      if (gid) {
        withHistory(() => {
          const st = usePresentationStore.getState();
          const deck = JSON.parse(JSON.stringify(st.slides));
          let primary = null;
          deck.forEach((slide) => {
            (slide.els || []).forEach((e, ei) => {
              if (e && String(e.id) === String(id)) {
                Object.assign(e, nextPatch, { appletHtml: next.appletHtml });
                primary = e;
                slide.els[ei] = e;
              }
            });
          });
          if (!primary) {
            st.patchElement(id, { ...nextPatch, appletHtml: next.appletHtml });
            return;
          }
          const peers = [];
          deck.forEach((slide) => {
            (slide.els || []).forEach((e) => {
              if (
                e &&
                e.type === 'applet' &&
                e.appletId === 'counter' &&
                String(e.cntGroupId || '').trim() === gid &&
                String(e.id) !== String(id)
              ) {
                peers.push(e);
              }
            });
          });
          if (onlyGroupId && peers.length) {
            // Joining an existing group → inherit shared settings from first peer.
            const src = peers[0];
            const inherit = {};
            COUNTER_LINK_KEYS.forEach((k) => {
              if (Object.prototype.hasOwnProperty.call(src, k)) inherit[k] = src[k];
            });
            next = rebuildAppletHtml({ ...primary, ...inherit, cntGroupId: gid }, theme);
            Object.assign(primary, inherit, { appletHtml: next.appletHtml, cntGroupId: gid });
          } else if (peers.length) {
            // Push shared settings from the edited counter to all peers.
            const shared = {};
            COUNTER_LINK_KEYS.forEach((k) => {
              if (Object.prototype.hasOwnProperty.call(primary, k)) shared[k] = primary[k];
            });
            peers.forEach((peer) => {
              const rebuilt = rebuildAppletHtml({ ...peer, ...shared, cntGroupId: gid }, theme);
              Object.assign(peer, shared, { appletHtml: rebuilt.appletHtml, cntGroupId: gid });
            });
          }
          st.replaceSlides(deck, st.cur);
        });
        return;
      }
    }

    withHistory(() =>
      usePresentationStore.getState().patchElement(id, {
        ...nextPatch,
        appletHtml: next.appletHtml,
      })
    );
  },

  /** Animate flip card to front/back without reloading the iframe. */
  setFlipFace(id, face) {
    const { slides, cur } = usePresentationStore.getState();
    const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
    if (!el || el.type !== 'applet' || !isFlipAppletId(el.appletId)) return;
    const next = face === 'back' ? 'back' : 'front';
    if (el.flipFace === next) return;
    withHistory(() => usePresentationStore.getState().patchElement(id, { flipFace: next }));
  },

  appletStep(id) {
    const { slides, cur } = usePresentationStore.getState();
    const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
    if (!el || el.type !== 'applet') return;
    if (isFlipAppletId(el.appletId)) {
      this.setFlipFace(id, el.flipFace === 'back' ? 'front' : 'back');
      return;
    }
    const host = document.querySelector(`.react-el-applet[data-id="${CSS.escape(String(id))}"] iframe`);
    if (!host) return;
    const msg =
      el.appletId === 'generator'
        ? { type: 'genStep' }
        : el.appletId === 'counter'
          ? { type: 'counterStep' }
          : null;
    if (!msg) return;
    try {
      host.contentWindow.postMessage(msg, '*');
    } catch (e) {}
  },

  async addQrCode(text) {
    const qrText = (text || 'https://example.com').trim() || 'https://example.com';
    try {
      const src = await renderQRDataURL(qrText, '#ffffff', '#000000', 400);
      const id = withHistory(() =>
        usePresentationStore.getState().addElement({
          type: 'image',
          x: 100,
          y: 80,
          w: 220,
          h: 220,
          src,
          imgFit: 'fill',
          imgRx: 16,
          _isQR: true,
          qrText,
          qrBg: '#ffffff',
          qrColor: '#000000',
          qrRx: 16,
          anims: [],
        })
      );
      pick(id);
      useUiStore.getState().showToast(ru() ? 'QR-код добавлен' : 'QR code added', 'ok');
      return id;
    } catch (e) {
      console.warn('[addQrCode]', e);
      useUiStore.getState().showToast(ru() ? 'Не удалось создать QR' : 'QR create failed', 'warn');
      return null;
    }
  },

  async refreshQr(id) {
    const { slides, cur } = usePresentationStore.getState();
    const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
    if (!el || !el._isQR) return;
    try {
      const bg = el.qrBg === 'transparent' ? null : el.qrBg || '#ffffff';
      const src = await renderQRDataURL(el.qrText || 'https://example.com', bg, el.qrColor || '#000000', 400);
      withHistory(() =>
        usePresentationStore.getState().patchElement(id, {
          src,
          imgRx: el.qrRx != null ? +el.qrRx : 16,
        })
      );
    } catch (e) {
      console.warn('[refreshQr]', e);
    }
  },

  /** Live notes typing — no history / no iframe rebuild; debounced persist. */
  patchNotesLive(id, fields) {
    if (!id || !fields) return;
    const patch = {};
    if (fields.notesText !== undefined) patch.notesText = fields.notesText;
    if (fields.notesBg !== undefined) patch.notesBg = fields.notesBg;
    if (!Object.keys(patch).length) return;
    usePresentationStore.getState().applyElementPatches({ [id]: patch }, { live: true });
    clearTimeout(editorApi._notesPersistT);
    editorApi._notesPersistT = setTimeout(() => {
      usePresentationStore.getState().persist();
    }, 600);
  },

  pickFlipImage(id, side) {
    if (!id) return;
    editorApi.openImagePicker({
      kind: 'flip',
      elId: id,
      side: side === 'back' ? 'back' : 'front',
    });
  },

  clearFlipImage(id, side) {
    if (!id) return;
    const key = side === 'back' ? 'flipBackImg' : 'flipFrontImg';
    editorApi.patchApplet(id, { [key]: '' });
  },

  addModel3dFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.obj,model/obj,text/plain';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        if (!text || !/\bv\s+/.test(text)) {
          useUiStore.getState().showToast(ru() ? 'Не похоже на OBJ' : 'Not a valid OBJ', 'warn');
          return;
        }
        const id = withHistory(() =>
          usePresentationStore.getState().addElement(
            defaultModel3dFields({
              objText: text,
              objName: file.name || 'model.obj',
            })
          )
        );
        pick(id);
        useUiStore.getState().showToast(ru() ? 'Модель OBJ добавлена' : 'OBJ model added', 'ok');
      } catch (e) {
        console.warn('[addModel3dFromFile]', e);
        useUiStore.getState().showToast(ru() ? 'Ошибка чтения OBJ' : 'Failed to read OBJ', 'warn');
      }
    };
    input.click();
  },

  replaceModel3dFile(id) {
    if (!id) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.obj,model/obj,text/plain';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        if (!text || !/\bv\s+/.test(text)) {
          useUiStore.getState().showToast(ru() ? 'Не похоже на OBJ' : 'Not a valid OBJ', 'warn');
          return;
        }
        withHistory(() =>
          usePresentationStore.getState().patchElement(id, {
            objText: text,
            objName: file.name || 'model.obj',
          })
        );
        useUiStore.getState().showToast(ru() ? 'Модель обновлена' : 'Model updated', 'ok');
      } catch (e) {
        console.warn('[replaceModel3dFile]', e);
        useUiStore.getState().showToast(ru() ? 'Ошибка чтения OBJ' : 'Failed to read OBJ', 'warn');
      }
    };
    input.click();
  },

  autofitText(id) {
    const { slides, cur } = usePresentationStore.getState();
    const el = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
    if (!el || (el.type !== 'text' && el.type !== 'formula' && el.type !== 'markdown')) return;
    const h = measureTextHeight(el);
    if (Math.abs((el.h || 0) - h) < 2) return;
    withHistory(() => usePresentationStore.getState().patchElement(id, { h }));
  },

  toggleTocEntry(id) {
    const textEl = id
      ? (usePresentationStore.getState().slides[usePresentationStore.getState().cur]?.els || []).find(
          (e) => e && String(e.id) === String(id)
        )
      : currentEl();
    if (!textEl || textEl.type !== 'text') {
      useUiStore.getState().showToast(ru() ? 'Выберите текстовый блок' : 'Select a text box', 'warn');
      return;
    }
    const next = textEl.textRole === 'tocEntry' ? 'body' : 'tocEntry';
    withHistory(() => usePresentationStore.getState().patchElement(textEl.id, { textRole: next }));
    useUiStore.getState().showToast(
      next === 'tocEntry'
        ? ru()
          ? 'Пункт оглавления'
          : 'Marked as chapter'
        : ru()
          ? 'Пункт оглавления снят'
          : 'Chapter mark removed',
      'ok'
    );
  },

  fillToc(id) {
    const textEl = id
      ? (usePresentationStore.getState().slides[usePresentationStore.getState().cur]?.els || []).find(
          (e) => e && String(e.id) === String(id)
        )
      : currentEl();
    if (!textEl || textEl.type !== 'text') {
      useUiStore.getState().showToast(ru() ? 'Выберите текстовый блок' : 'Select a text box', 'warn');
      return;
    }
    const { slides } = usePresentationStore.getState();
    const { html, count } = fillTocHtml(slides, textEl, lang());
    withHistory(() =>
      usePresentationStore.getState().patchElement(textEl.id, {
        html,
        text: String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        textRole: 'toc',
        textColorGrad: null,
        textColorGrad1: null,
        textColorGrad2: null,
        textColorGradDir: null,
      })
    );
    useUiStore.getState().showToast(
      count
        ? ru()
          ? 'Оглавление заполнено'
          : 'Table of contents filled'
        : ru()
          ? 'Нет пунктов оглавления'
          : 'No chapters marked yet',
      count ? 'ok' : 'warn'
    );
  },

  autofitSlideTexts(opts = {}) {
    const { cur, slides, replaceSlideEls } = usePresentationStore.getState();
    const slide = slides[cur];
    if (!slide) return 0;
    const next = JSON.parse(JSON.stringify(slide));
    const n = fitTextsOnSlide(next, { shrink: !!opts.shrink });
    if (!n) {
      useUiStore.getState().showToast(ru() ? 'Тексты уже подогнаны' : 'Texts already fit', 'ok');
      return 0;
    }
    withHistory(() => replaceSlideEls(cur, next.els));
    useUiStore.getState().showToast(
      ru() ? `Подогнано текстовстов: ${n}` : `Fitted texts: ${n}`,
      'ok'
    );
    return n;
  },

  setTextAlign(align) {
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'formula')) return;
    let cs = el.cs || '';
    cs = applyCsProp(cs, 'text-align', align);
    withHistory(() => usePresentationStore.getState().patchElement(el.id, { cs }));
  },

  resetTextFormatting() {
    const el = currentEl();
    if (!el || el.type !== 'text') return;
    let html = el.html || '';
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (active?.isContentEditable && active.closest?.(`[data-id="${el.id}"]`)) {
      html = active.innerHTML;
    }
    // Strip inline format tags / styles commonly used by rich text
    const cleaned = String(html)
      .replace(/<\/?(?:b|strong|i|em|u|s|strike|sub|sup|font)(?:\s[^>]*)?>/gi, '')
      .replace(/\sstyle="[^"]*"/gi, '')
      .replace(/\sclass="[^"]*"/gi, '');
    let cs = el.cs || '';
    cs = applyCsProp(cs, 'font-weight', '400');
    cs = applyCsProp(cs, 'font-style', 'normal');
    cs = stripUnderlineFromCs(cs);
    cs = applyCsProp(cs, 'text-transform', null);
    const cleanedUl = cleaned.replace(/\sdata-ul="[^"]*"/gi, '');
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, {
        html: cleanedUl,
        text: cleanedUl.replace(/<[^>]+>/g, ''),
        cs,
        textRole: el.textRole === 'heading' || el.textRole === 'title' ? 'body' : el.textRole,
      })
    );
  },

  setTextVAlign(valign) {
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'formula' && el.type !== 'markdown')) return;
    withHistory(() => usePresentationStore.getState().patchElement(el.id, { valign }));
  },

  importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,.slides.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await editorApi.importDroppedFile(file);
    };
    input.click();
  },

  setDrawTool(tool) {
    const next = tool || 'cursor';
    usePresentationStore.getState().setDrawTool(next);
    if (next !== 'cursor') {
      useSelectionStore.getState().clearInkSelection();
    }
    if (next !== 'cursor' && next !== 'clear') {
      useUiStore.getState().setActiveTab('drawing');
    }
  },

  openDrawingPanel() {
    useUiStore.getState().setActiveTab('drawing');
  },

  pickInk(ids, opts = {}) {
    const { slides, cur } = usePresentationStore.getState();
    const slide = slides[cur];
    let list = (Array.isArray(ids) ? ids : ids != null ? [ids] : []).map(String).filter(Boolean);
    if (!opts.additive && opts.expandGroup !== false) {
      list = expandInkGroupIds(slide, list);
    }
    useSelectionStore.getState().pickInk(list, {
      additive: !!opts.additive,
      keepObjectSel: !!opts.keepObjectSel,
    });
    if (!opts.additive && list.length && !opts.keepObjectSel) {
      const hosts = findInkHostsForIds(slide, list);
      if (hosts.length === 1) {
        useSelectionStore.getState().pickOne(hosts[0].id);
        useSelectionStore.getState().pickInk(list, { keepObjectSel: true });
      }
    }
    useUiStore.getState().setCropModeElId(null);
  },

  setDrawColor(color, schemeRef) {
    usePresentationStore.getState().setDrawColor(color, schemeRef !== undefined ? schemeRef : undefined);
    const { selInkIds } = useSelectionStore.getState();
    if (selInkIds?.length && color) {
      withHistory(() =>
        usePresentationStore.getState().patchInkByIds(selInkIds, {
          color,
          ...(schemeRef !== undefined ? { colorScheme: schemeRef || null } : {}),
        })
      );
    }
  },

  setDrawSize(size) {
    usePresentationStore.getState().setDrawSize(size);
  },

  /** Step brush/marker/eraser size presets ([ ] keys). Also nudges selected stroke width. */
  nudgeDrawSize(dir) {
    const step = dir < 0 ? -1 : 1;
    const st = usePresentationStore.getState();
    const { selInkIds } = useSelectionStore.getState();
    const tool = st.drawTool || 'cursor';
    if (selInkIds?.length && (!tool || tool === 'cursor')) {
      const slide = st.slides[st.cur];
      const hit = findInkById(slide, selInkIds[0]);
      if (!hit || hit.kind !== 'stroke') return false;
      const sizes = hit.item.tool === 'marker' ? MARKER_SIZES : PEN_SIZES;
      const idx = Math.max(
        0,
        Math.min(sizes.length - 1, nearestSizeIdx(sizes, +hit.item.width || 6) + step)
      );
      withHistory(() =>
        usePresentationStore.getState().patchInkByIds(selInkIds, (item, kind) =>
          kind === 'stroke' ? { width: sizes[idx] } : null
        )
      );
      return true;
    }
    if (tool === 'brush' || tool === 'neon' || tool === 'marker' || tool === 'eraser') {
      const sizes = sizesForDrawTool(tool);
      const idx = Math.max(
        0,
        Math.min(sizes.length - 1, nearestSizeIdx(sizes, st.drawSize || 6) + step)
      );
      st.setDrawSize(sizes[idx]);
      return true;
    }
    return false;
  },

  setSelectedInkWidth(sz) {
    const { selInkIds } = useSelectionStore.getState();
    if (!selInkIds?.length) return;
    withHistory(() =>
      usePresentationStore.getState().patchInkByIds(selInkIds, (item, kind) =>
        kind === 'stroke' ? { width: +sz } : null
      )
    );
  },

  setSelectedInkOpacity(v) {
    const { selInkIds } = useSelectionStore.getState();
    if (!selInkIds?.length) return;
    const opacity = Math.max(0.05, Math.min(1, (+v || 40) / 100));
    withHistory(() => usePresentationStore.getState().patchInkByIds(selInkIds, { opacity }));
  },

  setSelectedInkNeonBright(v) {
    const { selInkIds } = useSelectionStore.getState();
    if (!selInkIds?.length) return;
    const neonBright = Math.max(0, Math.min(100, +v || 0));
    withHistory(() =>
      usePresentationStore.getState().patchInkByIds(selInkIds, (item, kind) =>
        kind === 'stroke' && item.tool === 'neon' ? { neonBright } : null
      )
    );
  },

  setSelectedInkFillPattern(pat) {
    const { selInkIds } = useSelectionStore.getState();
    if (!selInkIds?.length) return;
    withHistory(() =>
      usePresentationStore.getState().patchInkByIds(selInkIds, (item, kind) =>
        kind === 'fill' ? { pattern: pat } : null
      )
    );
  },

  deleteSelectedInk() {
    const { selInkIds } = useSelectionStore.getState();
    if (!selInkIds?.length) return;
    withHistory(() => usePresentationStore.getState().deleteInkByIds(selInkIds));
    useSelectionStore.getState().clearInkSelection();
  },

  copySelectedInk() {
    const { selInkIds } = useSelectionStore.getState();
    if (!selInkIds?.length) return;
    let newIds = [];
    withHistory(() => {
      newIds = usePresentationStore.getState().copyInkByIds(selInkIds);
    });
    if (newIds?.length) useSelectionStore.getState().pickInk(newIds);
  },

  moveSelectedInk(dx, dy, opts = {}) {
    const { selInkIds } = useSelectionStore.getState();
    if (!selInkIds?.length) return;
    usePresentationStore.getState().moveInkByIds(selInkIds, dx, dy, opts);
  },

  setDrawNeonBright(v) {
    usePresentationStore.getState().setDrawNeonBright(v);
  },

  setDrawSmooth(v) {
    usePresentationStore.getState().setDrawSmooth(v);
  },

  setDrawOpacity(v) {
    usePresentationStore.getState().setDrawOpacity(v);
  },

  setDrawMarkerOpacity(v) {
    usePresentationStore.getState().setDrawMarkerOpacity(v);
  },

  setDrawTaper(v) {
    usePresentationStore.getState().setDrawTaper(v);
  },

  setDrawPressure(on) {
    usePresentationStore.getState().setDrawPressure(on);
  },

  setDrawFillPattern(pat) {
    const { selInkIds } = useSelectionStore.getState();
    const hasFillSel =
      selInkIds?.length &&
      selInkIds.some((id) => {
        const { slides, cur } = usePresentationStore.getState();
        return findInkById(slides[cur], id)?.kind === 'fill';
      });
    if (hasFillSel) {
      editorApi.setSelectedInkFillPattern(pat);
      return;
    }
    usePresentationStore.getState().setDrawFillPattern(pat);
  },

  setDrawFillOpacity(v) {
    usePresentationStore.getState().setDrawFillOpacity(v);
  },

  setDrawFillGap(v) {
    usePresentationStore.getState().setDrawFillGap(v);
  },

  clearInk() {
    withHistory(() => usePresentationStore.getState().clearInk());
  },

  addInkStroke(stroke) {
    withHistory(() => usePresentationStore.getState().addInkStroke(stroke));
  },

  addInkFill(fill) {
    withHistory(() => usePresentationStore.getState().addInkFill(fill));
  },

  bucketFillAt(x, y) {
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    const fill = computeBucketFill(x, y, {
      ink: slide?.ink || [],
      canvasW: st.canvasW,
      canvasH: st.canvasH,
      color: st.drawColor,
      colorScheme: st.drawColorScheme || null,
      fillOpacity: st.drawFillOpacity,
      fillPattern: st.drawFillPattern,
      fillGap: st.drawFillGap,
    });
    if (!fill) {
      useUiStore.getState().showToast(ru() ? 'Не удалось залить область' : 'Could not fill region', 'err');
      return false;
    }
    withHistory(() => usePresentationStore.getState().addInkFill(fill));
    return true;
  },

  eraseInkNear(points, radius) {
    const st = usePresentationStore.getState();
    const beforeInk = (st.slides[st.cur]?.ink || []).length;
    const beforeFills = (st.slides[st.cur]?.inkFills || []).length;
    useHistoryStore.getState().push();
    const ok = usePresentationStore.getState().eraseInkNear(points, radius);
    if (!ok) {
      const hist = useHistoryStore.getState();
      if (typeof hist.discardLast === 'function') hist.discardLast();
      else if (typeof hist.pop === 'function') hist.pop();
    }
    return ok && (beforeInk > 0 || beforeFills > 0);
  },

  startPreview(from) {
    try {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    } catch (e) {}
    const cur = usePresentationStore.getState().cur;
    flushSync(() => {
      useUiStore.getState().openPreview(from === '__cur__' || from == null ? cur : from | 0);
    });
    const po = document.querySelector('.preview-overlay');
    const el = po || document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      try {
        const p = req.call(el);
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) {}
    }
  },

  stopPreview() {
    if (!useUiStore.getState().previewOpen) return;
    useUiStore.getState().closePreview();
    const fn = document.exitFullscreen || document.webkitExitFullscreen;
    if (fn && (document.fullscreenElement || document.webkitFullscreenElement)) {
      try {
        const p = fn.call(document);
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) {}
    }
  },

  setSlideTrans(id) {
    const { cur, patchSlide } = usePresentationStore.getState();
    withHistory(() => patchSlide(cur, { trans: id || 'none' }));
  },

  setSlideAuto(sec) {
    const { cur, patchSlide } = usePresentationStore.getState();
    const v = Math.max(0, Math.min(120, +sec || 0));
    withHistory(() => patchSlide(cur, { auto: v }));
  },

  /** Ribbon «Вкл»: auto-advance on the current slide. Use applyAutoToAll to copy. */
  toggleAutoAdv(on) {
    const delay = Math.max(1, Math.min(60, +useUiStore.getState().presAutoDelay || 5));
    const { cur, patchSlide } = usePresentationStore.getState();
    withHistory(() => patchSlide(cur, { auto: on ? delay : 0 }));
  },

  applyAutoToAll(sec) {
    const raw = sec != null ? +sec : +useUiStore.getState().presAutoDelay || 5;
    const on = raw > 0;
    const delay = on ? Math.max(1, Math.min(120, raw)) : 0;
    withHistory(() => usePresentationStore.getState().applyAutoToAll(delay));
    useUiStore.getState().showToast(
      ru()
        ? on
          ? `Авто ${delay} с — ко всем слайдам`
          : 'Авто выключен на всех слайдах'
        : on
          ? `Auto ${delay}s applied to all`
          : 'Auto-off applied to all',
      'ok'
    );
  },

  setSlideClickNav(on) {
    const { cur, patchSlide } = usePresentationStore.getState();
    withHistory(() => patchSlide(cur, { clickNav: !!on }));
  },

  setGlobalTrans(id) {
    withHistory(() => usePresentationStore.getState().setGlobalTrans(id || 'none'));
  },

  applyTransitionToAll(id) {
    withHistory(() => usePresentationStore.getState().applyTransitionToAll(id || 'none'));
    useUiStore.getState().showToast(
      ru() ? 'Переход применён ко всем слайдам' : 'Transition applied to all slides',
      'ok'
    );
  },

  setTransitionDur(ms) {
    const { cur, patchSlide, setGlobalTransDur } = usePresentationStore.getState();
    withHistory(() => {
      patchSlide(cur, { transDur: Math.max(0, +ms || 500) });
      setGlobalTransDur(ms);
    });
  },

  addAnim(name) {
    if (name === 'animRepeat' || name === 'animPause') {
      this.addAnimBlock(name);
      return;
    }
    if (name === 'camera') {
      this.addCameraFrame();
      return;
    }
    const el = currentEl();
    if (!el || el._isDecor) {
      useUiStore.getState().showToast(ru() ? 'Выберите объект' : 'Select an object', 'warn');
      return;
    }
    if (name === 'langFade' && el.type !== 'text') {
      useUiStore.getState().showToast(
        ru() ? 'Анимация «Перевод» только для текста' : 'Translate fade is text-only',
        'err'
      );
      return;
    }
    withHistory(() => {
      const list = Array.isArray(el.anims) ? el.anims.slice() : [];
      const fields = defaultAnimFields(name);
      if (name === 'typewriter') {
        const prevTw = list.filter((x) => x && x.name === 'typewriter');
        const src =
          el.type === 'shape' ? el.shapeHtml || '' : el.html || el.text || '';
        if (prevTw.length) {
          const last = prevTw[prevTw.length - 1];
          fields.fromHtml = last.toHtml || '';
          fields.toHtml = last.toHtml || '';
        } else {
          fields.fromHtml = src;
          fields.toHtml = src;
        }
      }
      if (name === 'langFade') {
        const prevLf = list.filter((x) => x && x.name === 'langFade');
        const src = el.html || el.text || '';
        if (prevLf.length) {
          const last = prevLf[prevLf.length - 1];
          fields.fromHtml = last.toHtml || src;
          fields.toHtml = fields.fromHtml;
        } else {
          fields.fromHtml = src;
          fields.toHtml = src;
        }
        fields.fromLang = '';
        fields.toLang = '';
        fields.dur = 800;
      }
      list.push(fields);
      const ai = list.length - 1;
      usePresentationStore.getState().patchElement(el.id, { anims: list });
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (slide) {
        const orderSlide = {
          ...slide,
          animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
        };
        appendAnimLeafToOrder(orderSlide, el.id, ai);
        st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
      }
      if (name === 'langFade') {
        const elId = el.id;
        import('./langFadePlay.js')
          .then(({ prepareLangFadeAnim }) => {
            useUiStore.getState().showToast(ru() ? 'Перевод…' : 'Translating…', 'ok');
            return prepareLangFadeAnim(
              usePresentationStore.getState().slides[usePresentationStore.getState().cur]?.els?.find(
                (e) => e && String(e.id) === String(elId)
              ) || { ...el, anims: list },
              ai,
              (patch) => {
                const live = usePresentationStore
                  .getState()
                  .slides[usePresentationStore.getState().cur]?.els?.find(
                    (e) => e && String(e.id) === String(elId)
                  );
                if (!live || !Array.isArray(live.anims) || !live.anims[ai]) return;
                const next = live.anims.map((a, i) => (i === ai ? { ...a, ...patch } : a));
                usePresentationStore.getState().patchElement(elId, { anims: next });
              }
            );
          })
          .catch((e) => {
            console.warn('[langFade]', e);
            useUiStore.getState().showToast(
              ru() ? 'Не удалось перевести для анимации' : 'Could not translate for animation',
              'err'
            );
          });
      }
    });
    useUiStore.getState().showToast(ru() ? 'Анимация добавлена' : 'Animation added', 'ok');
  },

  addAnimBlock(blockType) {
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (!slide) return;
      const orderSlide = {
        ...slide,
        animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
      };
      const block = addAnimBlockToSlide(orderSlide, blockType);
      st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
      if (block) {
        useUiStore.getState().showToast(
          block.kind === 'pause'
            ? ru()
              ? 'Пауза добавлена'
              : 'Pause added'
            : ru()
              ? 'Цикл добавлен — перенесите в него анимации'
              : 'Repeat added — move anims into it',
          'ok'
        );
      }
    });
  },

  patchAnimBlock(blockId, prop, val) {
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (!slide) return;
      const orderSlide = {
        ...slide,
        animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
      };
      if (patchAnimBlockOnSlide(orderSlide, blockId, prop, val)) {
        st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
      }
    });
  },

  removeAnimBlock(blockId, dissolve = true) {
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (!slide) return;
      const orderSlide = {
        ...slide,
        animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
      };
      if (removeAnimBlockFromSlide(orderSlide, blockId, dissolve)) {
        st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
      }
    });
  },

  moveAnimIntoRepeat(blockId, elId, ai) {
    if (!blockId || elId == null || ai == null) return;
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (!slide) return;
      const orderSlide = {
        ...slide,
        animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
      };
      ensureAnimOrder(orderSlide);
      if (moveLeafIntoRepeat(orderSlide, blockId, elId, ai)) {
        st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
      }
    });
  },

  moveAnimOrder(index, delta) {
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (!slide) return;
      const orderSlide = {
        ...slide,
        animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
      };
      ensureAnimOrder(orderSlide);
      if (moveAnimOrderEntry(orderSlide, index, delta)) {
        st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
      }
    });
  },

  moveAnimOrderTo(from, to) {
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (!slide) return;
      const orderSlide = {
        ...slide,
        animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
      };
      ensureAnimOrder(orderSlide);
      if (moveAnimOrderToIndex(orderSlide, from, to)) {
        st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
      }
    });
  },

  nestAnimOrderIntoRepeat(fromIndex, repeatId) {
    if (fromIndex == null || !repeatId) return;
    this.relocateAnimOrder({ scope: 'top', index: fromIndex }, { scope: 'body', parentId: repeatId });
  },

  relocateAnimOrder(from, to) {
    if (!from || !to) return;
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (!slide) return;
      const orderSlide = {
        ...slide,
        animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
      };
      ensureAnimOrder(orderSlide);
      if (relocateAnimOrderEntry(orderSlide, from, to)) {
        st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
      }
    });
  },

  ensureSlideAnimOrder() {
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    if (!slide) return;
    const orderSlide = {
      ...slide,
      animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
    };
    ensureAnimOrder(orderSlide);
    const prev = JSON.stringify(slide.animOrder || []);
    const next = JSON.stringify(orderSlide.animOrder || []);
    if (prev !== next) st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
  },

  /** Re-run auto-translate for an existing langFade step. */
  prepareLangFade(index) {
    const el = currentEl();
    if (!el || !Array.isArray(el.anims) || !el.anims[index] || el.anims[index].name !== 'langFade') {
      return;
    }
    const elId = el.id;
    import('./langFadePlay.js')
      .then(({ prepareLangFadeAnim }) => {
        useUiStore.getState().showToast(ru() ? 'Перевод…' : 'Translating…', 'ok');
        return prepareLangFadeAnim(el, index, (patch) => {
          const live = usePresentationStore
            .getState()
            .slides[usePresentationStore.getState().cur]?.els?.find(
              (e) => e && String(e.id) === String(elId)
            );
          if (!live || !Array.isArray(live.anims) || !live.anims[index]) return;
          const next = live.anims.map((a, i) => (i === index ? { ...a, ...patch } : a));
          usePresentationStore.getState().patchElement(elId, { anims: next });
        });
      })
      .then(() => {
        useUiStore.getState().showToast(ru() ? 'Перевод готов' : 'Translation ready', 'ok');
      })
      .catch((e) => {
        console.warn('[langFade]', e);
        useUiStore.getState().showToast(
          ru() ? 'Не удалось перевести для анимации' : 'Could not translate for animation',
          'err'
        );
      });
  },

  /** Confirm typewriter «new text» from current DOM, restore original fromHtml on the element. */
  confirmTypewriterText(index) {
    const el = currentEl();
    if (!el || !Array.isArray(el.anims) || !el.anims[index] || el.anims[index].name !== 'typewriter') {
      return;
    }
    const dom = document.querySelector(`.react-slide-stage .react-el[data-id="${el.id}"]`);
    if (!dom) {
      useUiStore.getState().showToast(ru() ? 'Объект не найден на холсте' : 'Object not on canvas', 'warn');
      return;
    }
    const tel =
      dom.querySelector('.react-shape-text > div') ||
      dom.querySelector('.react-shape-text') ||
      dom.querySelector('[contenteditable]') ||
      [...dom.querySelectorAll(':scope > div')].find((d) => d.style.position !== 'absolute') ||
      null;
    if (!tel) {
      useUiStore.getState().showToast(ru() ? 'Нет текстового блока' : 'No text block', 'warn');
      return;
    }
    const newHtml = tel.innerHTML;
    withHistory(() => {
      const list = el.anims.map((a, i) => {
        if (i !== index) return a;
        return { ...a, toHtml: newHtml };
      });
      const next = list[index + 1];
      if (next && next.name === 'typewriter') {
        list[index + 1] = { ...next, fromHtml: newHtml };
      }
      const firstTw = list.find((x) => x && x.name === 'typewriter');
      const origHtml = firstTw ? firstTw.fromHtml || '' : '';
      const patch = { anims: list };
      if (el.type === 'shape') patch.shapeHtml = origHtml;
      else patch.html = origHtml;
      usePresentationStore.getState().patchElement(el.id, patch);
    });
    useUiStore.getState().showToast(ru() ? 'Новый текст сохранён' : 'New text saved', 'ok');
  },

  removeAnim(index) {
    const el = currentEl();
    if (!el || !Array.isArray(el.anims)) return;
    this.removeAnimAt(el.id, index);
  },

  removeAnimAt(elId, index) {
    if (elId == null || index == null) return;
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      const el = (slide?.els || []).find((e) => e && String(e.id) === String(elId));
      if (!el || !Array.isArray(el.anims) || !el.anims[index]) return;
      const list = el.anims.slice();
      list.splice(index, 1);
      st.patchElement(el.id, { anims: list });
      if (slide) {
        const orderSlide = {
          ...slide,
          animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
        };
        remapAnimOrderAfterRemove(orderSlide, el.id, index);
        st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
      }
    });
  },

  patchAnim(index, patch) {
    const el = currentEl();
    if (!el || !Array.isArray(el.anims) || !el.anims[index]) return;
    this.patchAnimAt(el.id, index, patch);
  },

  patchAnimAt(elId, index, patch) {
    if (elId == null || index == null || !patch) return;
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      const el = (slide?.els || []).find((e) => e && String(e.id) === String(elId));
      if (!el || !Array.isArray(el.anims) || !el.anims[index]) return;
      const next = { ...patch };
      if (next.dur != null) next.duration = next.dur;
      if (next.duration != null && next.dur == null) next.dur = next.duration;
      const list = el.anims.map((a, i) => (i === index ? { ...a, ...next } : a));
      st.patchElement(el.id, { anims: list });
    });
  },

  applyTimelineSeg(elId, ai, patch = {}) {
    if (elId == null) return;
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (!slide) return;
      const lang = useUiStore.getState().lang;
      const nextPatch = { ...patch };
      if (nextPatch.absDelay != null) {
        nextPatch.delay = delayForTargetAbs(slide, elId, ai, nextPatch.absDelay, lang);
      }
      if (nextPatch.dur != null) {
        const minDur = isPauElId(elId) ? 0 : 50;
        nextPatch.duration = Math.max(minDur, Math.round(nextPatch.dur));
        nextPatch.dur = nextPatch.duration;
      }
      if (isCamElId(elId)) {
        const camPatch = {};
        if (nextPatch.delay != null) camPatch.delay = nextPatch.delay;
        if (nextPatch.duration != null) camPatch.duration = nextPatch.duration;
        if (nextPatch.lane != null) camPatch.tlLane = Math.max(0, Math.round(nextPatch.lane));
        if (Object.keys(camPatch).length) st.patchCamera(camIdFromElId(elId), camPatch);
        return;
      }
      if (isPauElId(elId)) {
        if (nextPatch.duration == null) return;
        const orderSlide = {
          ...slide,
          animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
        };
        if (patchAnimBlockOnSlide(orderSlide, pauIdFromElId(elId), 'duration', Math.max(0, nextPatch.duration))) {
          st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
        }
        return;
      }
      const el = (slide.els || []).find((e) => e && String(e.id) === String(elId));
      if (!el || !Array.isArray(el.anims) || !el.anims[ai]) return;
      const rec = { ...el.anims[ai] };
      if (nextPatch.delay != null) rec.delay = nextPatch.delay;
      if (nextPatch.dur != null) {
        rec.dur = nextPatch.dur;
        rec.duration = nextPatch.duration;
      }
      if (nextPatch.trigger != null) rec.trigger = nextPatch.trigger;
      if (nextPatch.lane != null) rec.tlLane = Math.max(0, Math.round(nextPatch.lane));
      st.patchElement(el.id, { anims: el.anims.map((a, i) => (i === +ai ? rec : a)) });
    });
  },

  moveAnim(index, delta) {
    const el = currentEl();
    if (!el || !Array.isArray(el.anims)) return;
    const j = index + delta;
    if (j < 0 || j >= el.anims.length) return;
    withHistory(() => {
      const list = el.anims.slice();
      const [item] = list.splice(index, 1);
      list.splice(j, 0, item);
      usePresentationStore.getState().patchElement(el.id, { anims: list });
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (slide) {
        const orderSlide = {
          ...slide,
          animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
        };
        remapAnimOrderAfterSwap(orderSlide, el.id, index, j);
        st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
      }
    });
  },

  clearAnims() {
    const el = currentEl();
    if (!el) return;
    withHistory(() => {
      const n = Array.isArray(el.anims) ? el.anims.length : 0;
      usePresentationStore.getState().patchElement(el.id, { anims: [] });
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (slide && n) {
        const orderSlide = {
          ...slide,
          animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
        };
        for (let i = n - 1; i >= 0; i--) remapAnimOrderAfterRemove(orderSlide, el.id, i);
        st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
      }
    });
  },

  groupSelected() {
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = multiSel?.length ? multiSel : selId ? [selId] : [];
    if (ids.length < 2) {
      useUiStore.getState().showToast(ru() ? 'Выберите 2 или более объектов' : 'Select 2+ objects', 'warn');
      return;
    }
    const gid = withHistory(() => usePresentationStore.getState().groupElements(ids));
    if (gid) {
      useUiStore.getState().showToast(ru() ? `Сгруппировано: ${ids.length}` : `Grouped: ${ids.length}`, 'ok');
    }
  },

  ungroupSelected() {
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = multiSel?.length ? multiSel : selId ? [selId] : [];
    if (!ids.length) {
      useUiStore.getState().showToast(ru() ? 'Нет выбранных объектов' : 'Nothing selected', 'warn');
      return;
    }
    const n = withHistory(() => usePresentationStore.getState().ungroupElements(ids));
    if (!n) {
      useUiStore.getState().showToast(ru() ? 'Выбранные объекты не в группе' : 'Not in a group', 'warn');
      return;
    }
    useUiStore.getState().showToast(ru() ? 'Разгруппировано' : 'Ungrouped', 'ok');
  },

  pickCamera(camId) {
    useSelectionStore.getState().pickCamera(camId || null);
  },

  addCameraFrame() {
    const { canvasW, canvasH, slides, cur } = usePresentationStore.getState();
    const cams = slides[cur]?.cameras || [];
    const scale = cams.length ? Math.max(0.28, 0.55 - cams.length * 0.06) : 0.55;
    let cam = nudgeCameraInside(defaultCam(canvasW, canvasH, scale), canvasW, canvasH);
    if (cams.length) {
      const last = cams[cams.length - 1];
      cam.cx = Math.min(canvasW - cam.w / 2, Math.max(cam.w / 2, last.cx + 28));
      cam.cy = Math.min(canvasH - cam.h / 2, Math.max(cam.h / 2, last.cy + 20));
      cam = nudgeCameraInside(cam, canvasW, canvasH);
    }
    withHistory(() => usePresentationStore.getState().addCamera(cam));
    useSelectionStore.getState().pickCamera(cam.id);
    useUiStore.getState().setActiveTab('anim');
    useUiStore.getState().showToast(
      ru() ? `Камера ${cams.length + 1}` : `Camera ${cams.length + 1}`,
      'ok'
    );
    return cam.id;
  },

  removeCameraFrame(camId) {
    const id = camId || useSelectionStore.getState().selCamId;
    if (!id) return;
    withHistory(() => usePresentationStore.getState().removeCamera(id));
    useSelectionStore.getState().pickCamera(null);
  },

  startAnimTriggerPick(elId, ai) {
    if (elId == null || ai == null) return;
    const { cur, slides } = usePresentationStore.getState();
    const owner = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(elId));
    const anim = owner?.anims?.[ai];
    const trig = anim?.trigger === 'nav' ? anim.preNavTrigger : anim?.trigger;
    useUiStore.getState().setAnimTriggerPick({ elId, ai, slideIdx: cur, needApplet: trig === 'counter' || trig === 'timer' ? trig : null });
    const toast =
      trig === 'counter'
        ? ru()
          ? 'Кликните по счётчику на любом слайде'
          : 'Click a counter on any slide'
        : trig === 'timer'
          ? ru()
            ? 'Кликните по таймеру на любом слайде'
            : 'Click a timer on any slide'
          : ru()
            ? 'Кликните по объекту-триггеру на слайде'
            : 'Click the trigger object on the slide';
    useUiStore.getState().showToast(toast, 'ok');
  },

  cancelAnimTriggerPick() {
    useUiStore.getState().clearAnimTriggerPick();
  },

  completeAnimTriggerPick(targetElId) {
    const ctx = useUiStore.getState().animTriggerPick;
    if (!ctx || targetElId == null) {
      useUiStore.getState().clearAnimTriggerPick();
      return;
    }
    const st = usePresentationStore.getState();
    const ownerSlideIdx = ctx.slideIdx != null ? ctx.slideIdx : st.cur;
    const ownerSlide = st.slides[ownerSlideIdx];
    const owner = (ownerSlide?.els || []).find((e) => e && String(e.id) === String(ctx.elId));
    const anim = owner?.anims?.[ctx.ai];
    if (!anim) {
      useUiStore.getState().clearAnimTriggerPick();
      return;
    }
    const need =
      ctx.needApplet ||
      (anim.trigger === 'counter' || anim.trigger === 'timer'
        ? anim.trigger
        : anim.trigger === 'nav' && (anim.preNavTrigger === 'counter' || anim.preNavTrigger === 'timer')
          ? anim.preNavTrigger
          : null);
    const targetHit = (() => {
      for (const slide of st.slides || []) {
        const el = (slide?.els || []).find((e) => e && String(e.id) === String(targetElId));
        if (el) return el;
      }
      return null;
    })();
    if (need) {
      if (!targetHit || targetHit.type !== 'applet' || targetHit.appletId !== need) {
        useUiStore.getState().showToast(
          need === 'counter'
            ? ru()
              ? 'Нужно кликнуть по счётчику'
              : 'Click a counter'
            : ru()
              ? 'Нужно кликнуть по таймеру'
              : 'Click a timer',
          'warn'
        );
        return;
      }
    }
    useUiStore.getState().clearAnimTriggerPick();
    const patch = {
      triggerElId: targetElId,
      preNavTriggerElId: targetElId,
    };
    if (anim.trigger === 'nav') {
      patch.preNavTrigger = need || anim.preNavTrigger || 'element';
    } else if (need) {
      patch.trigger = need;
      patch.preNavTrigger = need;
    } else {
      patch.trigger = anim.trigger === 'element' ? 'element' : anim.trigger || 'element';
      patch.preNavTrigger = patch.trigger;
    }
    // Patch on the owner's slide (may differ from current if user navigated while picking).
    if (ownerSlideIdx !== st.cur) {
      withHistory(() => {
        const deck = JSON.parse(JSON.stringify(st.slides));
        const o = (deck[ownerSlideIdx]?.els || []).find((e) => e && String(e.id) === String(ctx.elId));
        if (!o?.anims?.[ctx.ai]) return;
        Object.assign(o.anims[ctx.ai], patch);
        usePresentationStore.getState().replaceSlides(deck, st.cur);
      });
    } else {
      this.patchAnimAt(ctx.elId, ctx.ai, patch);
    }
    useUiStore.getState().showToast(ru() ? 'Триггер выбран' : 'Trigger selected', 'ok');
  },

  patchCamera(camId, patch, opts = {}) {
    if (!camId || !patch) return;
    const { canvasW, canvasH } = usePresentationStore.getState();
    let next = { ...patch };
    if (patch.w != null || patch.rot != null || patch.cx != null || patch.cy != null) {
      const slides = usePresentationStore.getState().slides;
      const cur = usePresentationStore.getState().cur;
      const cam = (slides[cur]?.cameras || []).find((c) => c.id === camId);
      if (cam) {
        next = nudgeCameraInside({ ...cam, ...patch }, canvasW, canvasH);
      }
    }
    if (opts.noHistory || opts.live) {
      usePresentationStore.getState().patchCamera(camId, next, { live: !!opts.live });
      return;
    }
    withHistory(() => usePresentationStore.getState().patchCamera(camId, next));
  },

  openLinkModal() {
    const el = currentEl();
    if (!el || el._isDecor) {
      useUiStore.getState().showToast(ru() ? 'Выберите объект' : 'Select an element', 'warn');
      return;
    }
    useUiStore.getState().openLinkModal();
  },

  applyLink({ type, url, target, slideIdx }) {
    const el = currentEl();
    if (!el) return;
    const { slides, cur } = usePresentationStore.getState();
    let href = '';
    let linkt = undefined;
    if (type === 'url') {
      href = String(url || '').trim();
      linkt = target || '_blank';
    } else if (SLIDE_NAV_LINKS[type]) {
      href = SLIDE_NAV_LINKS[type];
    } else if (type === 'slide') {
      href = slideLinkHrefForIndex(slideIdx >= 0 ? slideIdx : cur, slides);
    }
    withHistory(() => {
      const store = usePresentationStore.getState();
      const els = store.slides[store.cur]?.els || [];
      const targets = el.groupId
        ? els.filter((e) => e && e.groupId === el.groupId)
        : [el];
      targets.forEach((t) => {
        if (href) {
          store.patchElement(t.id, { link: href, linkt: type === 'url' ? linkt : undefined });
        } else {
          store.patchElement(t.id, { link: '', linkt: undefined });
        }
      });
    });
    useUiStore.getState().closeLinkModal();
    useUiStore.getState().showToast(ru() ? 'Ссылка применена' : 'Link applied', 'ok');
  },

  removeLink() {
    const el = currentEl();
    if (!el) return;
    withHistory(() => {
      const store = usePresentationStore.getState();
      const els = store.slides[store.cur]?.els || [];
      const targets = el.groupId
        ? els.filter((e) => e && e.groupId === el.groupId)
        : [el];
      targets.forEach((t) => store.patchElement(t.id, { link: '', linkt: undefined }));
    });
    useUiStore.getState().closeLinkModal();
    useUiStore.getState().showToast(ru() ? 'Ссылка убрана' : 'Link removed', 'ok');
  },

  followLink(link, fromIdx) {
    if (!link) return false;
    if (String(link).startsWith('#slide-')) {
      const slides = usePresentationStore.getState().slides;
      const si = resolveSlideLinkIndex(link, fromIdx, slides);
      if (si == null) return false;
      useUiStore.getState().openPreview(si);
      return true;
    }
    try {
      window.open(link, '_blank', 'noopener,noreferrer');
      return true;
    } catch (e) {
      return false;
    }
  },

  toggleExtraGuides(mode) {
    useUiStore.getState().toggleExtraGuides(mode);
  },

  openVersionHistory() {
    useUiStore.getState().openHistoryModal();
  },

  async restoreVersion(id) {
    const snap = await idbGetSnapshot(id);
    if (!snap?.data) {
      useUiStore.getState().showToast(ru() ? 'Версия не найдена' : 'Version not found', 'err');
      return;
    }
    try {
      const data = JSON.parse(snap.data);
      if (!Array.isArray(data.slides) || !data.slides.length) throw new Error('bad');
      useHistoryStore.getState().clear();
      usePresentationStore.getState().importDeck({
        ...data,
        appliedThemeIdx: data.appliedThemeIdx,
      });
      // restore extra deck fields if present
      const st = usePresentationStore.getState();
      if (data.globalTrans) st.setGlobalTrans(data.globalTrans);
      if (data.globalTransDur) st.setGlobalTransDur(data.globalTransDur);
      if (data.layoutIdx != null) st.setLayoutIdx(data.layoutIdx);
      pick(null);
      useUiStore.getState().closeHistoryModal();
      useUiStore.getState().showToast(ru() ? 'Версия восстановлена' : 'Version restored', 'ok');
    } catch (e) {
      useUiStore.getState().showToast(ru() ? 'Не удалось восстановить' : 'Restore failed', 'err');
    }
  },

  applySlideContentLayout(layoutId) {
    const { cur, slides, canvasW, canvasH, replaceSlideEls } = usePresentationStore.getState();
    const slide = slides[cur];
    if (!slide) return;
    const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
    withHistory(() => {
      const els = buildSlideContentLayout(layoutId, slide, canvasW, canvasH, lang(), theme);
      // assign ids for new els without id
      const withIds = els.map((el) => (el.id ? el : { ...el }));
      replaceSlideEls(cur, withIds);
    });
    pick(null);
    useUiStore.getState().showToast(ru() ? 'Макет применён' : 'Layout applied', 'ok');
  },

  autoPlace() {
    const { slides } = usePresentationStore.getState();
    if (!slides.length) return;
    useUiStore.getState().openAutoPlacePreview();
  },

  autoPlaceKeepTheme() {
    const st = usePresentationStore.getState();
    const indices = st.getSlideSelection();
    const hasContent = indices.some((i) => (st.slides[i]?.els || []).some((e) => e && !e._isDecor));
    if (!hasContent) {
      useUiStore.getState().showToast(ru() ? 'Нет объектов для размещения' : 'Nothing to arrange', 'warn');
      return;
    }
    useUiStore.getState().closeAutoPlacePreview();
    withHistory(() => {
      const s = usePresentationStore.getState();
      const { slides, cur } = autoPlaceDeck(s.slides, s.getSlideSelection(), {
        canvasW: s.canvasW,
        canvasH: s.canvasH,
        cur: s.cur,
        theme: getTheme(s.appliedThemeIdx),
      });
      s.replaceSlides(slides, cur);
      s.clearSlideMultiSel();
    });
    useUiStore.getState().showToast(ru() ? 'Объекты размещены' : 'Objects arranged', 'ok');
  },

  async applyAutoPlaceVariant(tIdx, lIdx, align) {
    await ensureLayoutsLoaded();
    useUiStore.getState().closeAutoPlacePreview();
    const theme = getTheme(tIdx);
    withHistory(() => {
      const st = usePresentationStore.getState();
      if (theme) st.applyTheme(theme, tIdx);
      if (lIdx >= 0) {
        const L = getLayouts()[lIdx];
        if (L) {
          const st2 = usePresentationStore.getState();
          const builders = st2.slides.map((_, si) => {
            const style = L.paper ? 'title' : si === 0 ? 'title' : 'content';
            return makeDecorEl(si, lIdx, style, false);
          });
          st2.applyDecorToAll(lIdx, builders);
          if (L.paper) {
            const t = getTheme(st2.appliedThemeIdx);
            if (t) st2.applyTheme(t, st2.appliedThemeIdx);
          }
        }
      } else {
        usePresentationStore.getState().clearAllDecor();
      }
      const st3 = usePresentationStore.getState();
      const all = st3.slides.map((_, i) => i);
      const { slides, cur } = autoPlaceDeck(st3.slides, all, {
        canvasW: st3.canvasW,
        canvasH: st3.canvasH,
        align,
        cur: st3.cur,
        theme: getTheme(st3.appliedThemeIdx),
      });
      st3.replaceSlides(slides, cur);
      st3.clearSlideMultiSel();
    });
    useUiStore.getState().showToast(ru() ? '✨ Вариант применён' : 'Layout applied', 'ok');
  },

  shapeSvg(el) {
    return buildBasicShapeSVG(el.shape || 'rect', {
      fill: el.fill || '#3b82f6',
      stroke: el.stroke || 'none',
      strokeWidth: el.sw != null ? el.sw : 2,
    });
  },

  copyStyle() {
    const el = currentEl();
    const snap = captureStyle(el);
    if (!snap) {
      useUiStore.getState().showToast(ru() ? 'Выберите объект' : 'Select an object', 'warn');
      return;
    }
    useUiStore.getState().setStyleClipboard(snap);
    useUiStore.getState().showToast(ru() ? 'Стиль скопирован' : 'Style copied', 'ok');
  },

  pasteStyle() {
    const clip = useUiStore.getState().styleClipboard;
    const el = currentEl();
    if (!clip) {
      useUiStore.getState().showToast(ru() ? 'Буфер стиля пуст' : 'Style clipboard empty', 'warn');
      return;
    }
    if (!el) {
      useUiStore.getState().showToast(ru() ? 'Выберите объект' : 'Select an object', 'warn');
      return;
    }
    const patch = stylePatchForTarget(clip, el);
    if (!patch) {
      useUiStore.getState().showToast(ru() ? 'Нечего применить' : 'Nothing to apply', 'warn');
      return;
    }
    withHistory(() => {
      usePresentationStore.getState().patchElement(el.id, patch);
      if (patch.textColor && el.type === 'text') {
        const cs = applyCsProp(el.cs || '', 'color', patch.textColor);
        usePresentationStore.getState().patchElement(el.id, { cs });
      }
    });
    useUiStore.getState().showToast(ru() ? 'Стиль применён' : 'Style applied', 'ok');
  },

  toggleStylePaint() {
    const ui = useUiStore.getState();
    if (ui.stylePaintMode) {
      ui.setStylePaintMode(false);
      useUiStore.getState().showToast(ru() ? 'Кисть стиля выкл.' : 'Style paint off', 'ok');
      return;
    }
    const el = currentEl();
    const snap = captureStyle(el);
    if (!snap) {
      useUiStore.getState().showToast(ru() ? 'Сначала выберите объект-источник' : 'Select a source object first', 'warn');
      return;
    }
    ui.setStyleClipboard(snap);
    ui.setStylePaintMode(true);
    useUiStore.getState().showToast(
      ru() ? 'Кисть стиля: кликните по объекту' : 'Style paint: click a target',
      'ok'
    );
  },

  async translateSelection() {
    const { translateSelectionAction } = await import('./translateActions.js');
    return translateSelectionAction();
  },

  async transcribeSelection() {
    const { transcribeSelectionAction } = await import('./translateActions.js');
    return transcribeSelectionAction();
  },

  async translateDeck() {
    const { translateDeckAction } = await import('./translateActions.js');
    return translateDeckAction();
  },

  async toggleVoice() {
    if (useUiStore.getState().dictationOn) {
      const d = await import('./dictation.js');
      d.stopDictation();
    }
    const v = await import('./voiceControl.js');
    return v.toggleVoiceControl();
  },

  async toggleDictation() {
    if (useUiStore.getState().voiceListening) {
      const v = await import('./voiceControl.js');
      v.stopVoiceControl();
    }
    const d = await import('./dictation.js');
    return d.toggleTextDictation();
  },

  async toggleChatDictation() {
    if (useUiStore.getState().voiceListening) {
      const v = await import('./voiceControl.js');
      v.stopVoiceControl();
    }
    const d = await import('./dictation.js');
    return d.toggleChatDictation();
  },

  openAiPanel() {
    useUiStore.getState().openAiModal();
  },

  addLego(pieceId = '2f', color = '#906cf9') {
    return import('./lego.js').then(({ defaultLegoFields, LEGO_PIECES }) => {
      const piece = LEGO_PIECES.find((p) => p.id === pieceId) || LEGO_PIECES[1];
      const fields = defaultLegoFields(piece, color);
      const id = withHistory(() => usePresentationStore.getState().addElement(fields));
      pick(id);
      return id;
    });
  },

  addGraph(exprOrLatex = 'sin(x)') {
    return import('./graph.js').then(({ defaultGraphFields }) => {
      const fields = defaultGraphFields({ latex: exprOrLatex });
      const id = withHistory(() => usePresentationStore.getState().addElement(fields));
      pick(id);
      return id;
    });
  },

  async addChemGraph(key = 'H2O') {
    const { defaultChemGraphFields } = await import('./graph.js');
    const fields = await defaultChemGraphFields(key);
    const id = withHistory(() => usePresentationStore.getState().addElement(fields));
    pick(id);
    return id;
  },

  async addLogicGraph(latex = 'A \\land B') {
    const { defaultLogicGraphFields } = await import('./graph.js');
    const fields = await defaultLogicGraphFields(latex);
    const id = withHistory(() => usePresentationStore.getState().addElement(fields));
    pick(id);
    return id;
  },

  async rebuildSelectedGraph() {
    const el = currentEl();
    if (!el || el.type !== 'graph') return;
    const { rebuildGraphElAsync } = await import('./graph.js');
    const next = { ...el };
    await rebuildGraphElAsync(next);
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, {
        graphImg: next.graphImg,
        graphExpr: next.graphExpr,
        graphExprs: next.graphExprs,
        graphLines: next.graphLines,
        chemKey: next.chemKey,
        chemName: next.chemName,
        graphLatex: next.graphLatex,
      })
    );
  },

  async buildGraphFromFormula() {
    const el = currentEl();
    if (!el || el.type !== 'formula') {
      useUiStore.getState().showToast(ru() ? 'Выберите формулу' : 'Select a formula', 'warn');
      return;
    }
    const raw = el.formulaRaw || '';
    const {
      ensureChemLoaded,
      ensureLogicLoaded,
      parseFnFormula,
      defaultGraphFields,
      defaultChemGraphFields,
      defaultLogicGraphFields,
    } = await import('./graph.js');
    let chem = null;
    let logic = null;
    try {
      chem = await ensureChemLoaded();
    } catch (e) {}
    try {
      logic = await ensureLogicLoaded();
    } catch (e) {}
    let fields = null;
    try {
      if (logic?.isLogicFormula?.(raw)) {
        fields = await defaultLogicGraphFields(raw);
        fields.linkedFormulaId = el.id;
      }
    } catch (e) {}
    if (!fields) {
      try {
        if (chem?.isChemFormula?.(raw)) {
          const key =
            chem.normalizeChemFormula?.(raw) ||
            chem.lookupChem?.(raw)?.key ||
            raw;
          fields = await defaultChemGraphFields(key);
          fields.linkedFormulaId = el.id;
          fields.graphLatex = raw;
        } else if (typeof chem?.chemRender === 'function') {
          const probe = chem.chemRender(raw, { w: 40, h: 40, fg: '#fff', isDark: true });
          if (probe && probe.dataUrl && probe.chemKey) {
            fields = await defaultChemGraphFields(probe.chemKey);
            fields.linkedFormulaId = el.id;
          }
        }
      } catch (e) {}
    }
    if (!fields) {
      const parsed = parseFnFormula(el);
      if (!parsed.exprs.length) {
        useUiStore.getState().showToast(ru() ? 'Не удалось разобрать формулу' : 'Could not parse formula', 'err');
        return;
      }
      fields = defaultGraphFields({
        latex: parsed.lines[0],
        lines: parsed.lines,
        exprs: parsed.exprs,
      });
      fields.linkedFormulaId = el.id;
    }
    const id = withHistory(() => usePresentationStore.getState().addElement(fields));
    pick(id);
    useUiStore.getState().showToast(
      fields.graphKind === 'logic'
        ? ru()
          ? 'Схема построена'
          : 'Logic diagram built'
        : fields.graphKind === 'chem'
          ? ru()
            ? 'Структура построена'
            : 'Structure built'
          : ru()
            ? 'График построен'
            : 'Graph built',
      'ok'
    );
    return id;
  },

  /** Paste Excel/TSV into selected table or create a new one. Returns true if handled. */
  async pasteTsvOrCreateTable(text, html) {
    const { isTsvText, parseTsv, htmlTableToTsv, fillTableFromTsv, newTableFromTsv } = await import(
      './tablePaste.js'
    );
    let tsv = '';
    if (isTsvText(text)) tsv = text;
    else if (html) tsv = htmlTableToTsv(html);
    if (!tsv || !isTsvText(tsv)) return false;
    const rows = parseTsv(tsv);
    if (!rows.length) return false;
    const el = currentEl();
    if (el && el.type === 'table') {
      // v7.1: paste starting at the selected cell (anchor)
      const selCell = useSelectionStore.getState().tableCell;
      const anchored = selCell && String(selCell.elId) === String(el.id);
      const patch = fillTableFromTsv(
        el,
        rows,
        anchored ? +selCell.r : 0,
        anchored ? +selCell.c : 0
      );
      if (!patch) return false;
      withHistory(() => usePresentationStore.getState().patchElement(el.id, patch));
      useUiStore.getState().showToast(ru() ? 'Данные вставлены в таблицу' : 'Pasted into table', 'ok');
      return true;
    }
    const fields = newTableFromTsv(rows);
    if (!fields) return false;
    const id = withHistory(() => usePresentationStore.getState().addElement(fields));
    pick(id);
    useUiStore.getState().showToast(ru() ? 'Таблица из буфера' : 'Table from clipboard', 'ok');
    return true;
  },

  openSvgModal() {
    useUiStore.getState().openSvgModal();
  },

  openAppletModal() {
    useUiStore.getState().openAppletModal();
  },

  addSvg() {
    useSelectionStore.getState().pickOne(null);
    useUiStore.getState().openSvgModal();
  },

  applySvg(opts = {}) {
    let svgContent = String(opts.svgContent || '').trim();
    if (!svgContent) return null;
    if (!/<svg[\s>]/i.test(svgContent)) {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${svgContent}</svg>`;
    }
    // Strip scripts / event handlers for safety
    svgContent = svgContent
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
    const w = Math.max(40, +opts.w || 320);
    const h = Math.max(40, +opts.h || 240);
    const patch = { type: 'svg', svgContent, w, h };
    if (opts.id) {
      withHistory(() => usePresentationStore.getState().patchElement(opts.id, patch));
      pick(opts.id);
      useUiStore.getState().showToast(ru() ? 'SVG обновлён' : 'SVG updated', 'ok');
      return opts.id;
    }
    const id = withHistory(() =>
      usePresentationStore.getState().addElement({
        ...patch,
        x: 80,
        y: 80,
        rot: 0,
        anims: [],
      })
    );
    pick(id);
    useUiStore.getState().showToast(ru() ? 'SVG вставлен' : 'SVG inserted', 'ok');
    return id;
  },

  openFind(opts) {
    useUiStore.getState().openFind(opts || {});
  },

  openReplace() {
    useUiStore.getState().openFind({ focusReplace: true });
  },

  closeFind() {
    useUiStore.getState().closeFind();
  },

  collectFindHits(query) {
    const needle = String(query != null ? query : useUiStore.getState().findQuery || '')
      .trim()
      .toLowerCase();
    if (!needle) return [];
    const hits = [];
    (usePresentationStore.getState().slides || []).forEach((slide, si) => {
      const title = String(slide.title || slide.name || '').toLowerCase();
      if (title.includes(needle)) hits.push({ si, id: null, where: 'title' });
      (slide.els || []).forEach((el) => {
        if (!el || el._isDecor) return;
        if (elSearchText(el).toLowerCase().includes(needle)) hits.push({ si, id: el.id, where: 'el' });
      });
    });
    return hits;
  },

  gotoFindHit(hit) {
    if (!hit) return;
    editorApi.pickSlide(hit.si);
    if (hit.id) pick(hit.id);
  },

  findStep(dir = 1) {
    const ui = useUiStore.getState();
    const hits = editorApi.collectFindHits(ui.findQuery);
    if (!hits.length) {
      ui.showToast(ru() ? 'Ничего не найдено' : 'Nothing found');
      return 0;
    }
    const n = hits.length;
    let i = ui.findHit;
    if (i < 0 || i >= n) i = dir < 0 ? n - 1 : 0;
    else i = (i + (dir < 0 ? -1 : 1) + n) % n;
    ui.setFindHit(i);
    editorApi.gotoFindHit(hits[i]);
    return n;
  },

  replaceFind() {
    const ui = useUiStore.getState();
    const needle = String(ui.findQuery || '').trim();
    const repl = ui.findReplace ?? '';
    if (!needle) return 0;
    let hits = editorApi.collectFindHits(needle);
    if (!hits.length) {
      ui.showToast(ru() ? 'Ничего не найдено' : 'Nothing found');
      return 0;
    }
    let i = ui.findHit;
    if (i < 0 || i >= hits.length) i = 0;
    const hit = hits[i];
    withHistory(() => {
      const st = usePresentationStore.getState();
      if (!hit.id) {
        const slide = st.slides[hit.si];
        const prev = slide ? slide.title || slide.name || '' : '';
        const next = replaceInPlain(prev, needle, repl, false);
        if (slide && next !== prev) st.patchSlide(hit.si, { title: next, name: next });
        return;
      }
      const prevCur = st.cur;
      if (prevCur !== hit.si) st.setCur(hit.si);
      const el = (usePresentationStore.getState().slides[hit.si]?.els || []).find(
        (e) => e && String(e.id) === String(hit.id)
      );
      const patch = applyReplaceToEl(el, needle, repl, false);
      if (patch) usePresentationStore.getState().patchElement(hit.id, patch);
      if (prevCur !== hit.si) usePresentationStore.getState().setCur(prevCur);
    });
    hits = editorApi.collectFindHits(needle);
    if (!hits.length) {
      ui.setFindHit(-1);
      ui.showToast(ru() ? 'Заменено' : 'Replaced', 'ok');
      return 0;
    }
    i = Math.min(i, hits.length - 1);
    ui.setFindHit(i);
    editorApi.gotoFindHit(hits[i]);
    return hits.length;
  },

  replaceAllFind() {
    const ui = useUiStore.getState();
    const needle = String(ui.findQuery || '').trim();
    const repl = ui.findReplace ?? '';
    if (!needle) return 0;
    const hits = editorApi.collectFindHits(needle);
    if (!hits.length) {
      ui.showToast(ru() ? 'Ничего не найдено' : 'Nothing found');
      return 0;
    }
    let n = 0;
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slides = JSON.parse(JSON.stringify(st.slides || []));
      slides.forEach((slide) => {
        const prevTitle = slide.title || slide.name || '';
        const nextTitle = replaceInPlain(prevTitle, needle, repl, true);
        if (nextTitle !== prevTitle) {
          slide.title = nextTitle;
          slide.name = nextTitle;
          n += 1;
        }
        (slide.els || []).forEach((el) => {
          if (!el || el._isDecor) return;
          const patch = applyReplaceToEl(el, needle, repl, true);
          if (patch) {
            Object.assign(el, patch);
            n += 1;
          }
        });
      });
      usePresentationStore.setState({ slides });
      usePresentationStore.getState().persist();
    });
    ui.setFindHit(-1);
    ui.showToast(ru() ? `Заменено: ${n}` : `Replaced: ${n}`, 'ok');
    return n;
  },

  playSlideAnims() {
    return import('./slideAnimPlay.js').then((m) => m.playSlideAnimPlay());
  },

  stopSlideAnims() {
    return import('./slideAnimPlay.js').then((m) => m.stopSlideAnimPlay());
  },
};

export default editorApi;

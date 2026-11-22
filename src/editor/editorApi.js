import { flushSync } from 'react-dom';
import { usePresentationStore } from '../stores/presentationStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useHistoryStore } from '../stores/historyStore';
import { useUiStore } from '../stores/uiStore';
import { buildBasicShapeSVG } from '../shared/shapes.js';
import { getShapeMeta } from '../shared/shapesCatalog.js';
import { getTheme, resolveSchemeColor, hydrateImportedTextColors, stripInlineTextColors, parseCsColor, THEMES } from './themes.js';
import { parseJsonLenient } from './jsonLenient.js';
import { migrateSvgFieldsInSlides, repairImportedSvgMarkup } from './svgImport.js';
import { normalizeTableElement } from './tableCells.js';
import { buildInsertedShape } from './shapeInsert.js';
import { makeDecorEl, getLayouts, ensureLayoutsLoaded, rebuildDecorEls } from './layouts.js';
import { applyLayoutAnimatedToggle } from './decorAnim.js';
import { invalidateThumbCaches } from './slideThumb.js';
import { closePresenterWindow, openPresenterWindow } from './presenterChannel.js';
import {
  isMultiScreenNow,
  openPresenterForShow,
  placeSlideshowWindowsSync,
  requestScreenDetails,
} from './displayScreens.js';
import {
  applyRenameSection,
  applyRemoveSection,
  applyStartSection,
  applyToggleSectionCollapsed,
  sectionContaining,
} from './slideSections.js';
import {
  SLIDE_NAV_LINKS,
  slideLinkHrefForIndex,
  resolveSlideLinkIndex,
  captureInlineLinkSelection,
  peekInlineLinkSelection,
  clearInlineLinkSelection,
  applyInlineLinkToSelection,
  removeInlineLinkFromSelection,
  readCaretInlineLink,
  styleInlineAnchor,
  DEFAULT_LINK_HOVER,
} from './links.js';
import { buildSlideContentLayout } from './slideContentLayouts.js';
import { paintTextPlaceholderHtml, textPlaceholderLabel } from './textPlaceholder.js';
import { autoPlaceDeck, stampOrigFs } from './autoplace.js';
import {
  idbGetSnapshot,
  idbSaveLibrary,
  idbListLibrary,
  idbGetLibrary,
  idbDeleteLibrary,
} from './versionHistory.js';
import { markdownToHtml, DEFAULT_MD } from './markdown.js';
import { downloadHtml } from '../export/standaloneHtml.js';
import { exportAllSlidesPngZip, exportCurrentSlidePng } from '../export/exportPng.js';
import { exportAllSlidesPdf, printAllSlides } from '../export/exportPdf.js';
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
  LEGO_SNAP,
  LEGO_U,
  clientPointToCanvas,
  defaultLegoColor,
  defaultLegoFields,
  fieldsFromLegoPiece,
  isLegoTop,
  legoPieceById,
  legoSizeFor,
  resolveLegoFreePos,
  resolveLegoGroupOffset,
} from './lego.js';
import {
  applyUnderlineToCs,
  applyUnderlineToSelection,
  detectUnderlineFromEditable,
  detectStrikeFromEditable,
  nextUnderline,
  parseUnderlineFromCs,
  stripUnderlineFromCs,
  stripUnderlineFromHtml,
  underlineWrapHtml,
  hasStrikeInCs,
  hasStrikeInHtml,
  applyStrikeToCs,
  stripStrikeFromCs,
  stripStrikeFromHtml,
  applyStrikeToSelection,
  syncInlineUnderlineColors,
  unnestUnderlinesInHtml,
  captureSelectionOffsets,
  restoreSelectionOffsets,
  uniformUnderlineInHtml,
  htmlHasInlineColor,
  setElementUnderline,
  readUnderlineFromNode,
} from './textUnderline.js';
import { toggleStressInEditable, toggleStressInHtml } from './textStress.js';
import { toggleScriptInEditable, toggleScriptInHtml } from './textScript.js';
import {
  makeBgImgFromSrc,
  normalizeBgImg,
  bgImgSrc,
} from './slideBgImg.js';
import {
  cellRangeKeys,
  expandTableSelectionOccupied,
  getTableCell,
  mapTableCells,
  stripCellHtml,
} from './tableCells.js';
import {
  isNoneTableColor,
  paintSelectedCellBorders,
  paintTableEdgeOnCells,
  sameTableEdgeSpec,
} from './tableBorders.js';
import { altBgFromHeader, buildNewTableFields, hexWithAlpha, tableThemeColors } from './tableDefaults.js';
import { importPptxFile } from './pptxImport.js';
import { pnBuildHtml, pnDefaults, pnNormalize, pnPresetXY, pnSize } from './pagenum.js';
import {
  readOsClipboard,
  writeOsClipboard,
  writeOsSlideClipboard,
  markWindowBlur,
  readOsSlideClipboard,
  peekLocalSlides,
  getCopySourceSlideIdx,
  readCanvasTextSelection,
  writePlainTextClipboard,
  markPlainTextClipboard,
} from './osClipboard.js';
import { handlePasteEvent, pasteWithoutEvent, buildPastedTextFields } from './osPaste.js';
import {
  toggleListHtml,
  htmlHasList,
  reapplyBulletMarkers,
  updateLiveBulletMarkers,
  DEFAULT_BULLET_ICON_ID,
  targetedLineIndices,
  lineIndexOfNode,
  placeCaretAfterLineMarker,
} from './textLists.js';
import {
  applyCssToSelection,
  clampFontSizePx,
  editingTextRoot,
  execOnSelection,
  fontSizeNudgeStep,
  hasNonCollapsedSelection,
  htmlFromEditable,
  nudgeFontSizesInSelection,
  nudgeInlineFontSizes,
  plainFromEditable,
  restoreTextSelection,
  stripInlineFontSizes,
} from './textInline.js';
import { defaultAnimFields } from './anims.js';
import {
  snapshotTransformProps,
  transformPatchFromSnap,
} from './transformPlay.js';
import {
  addAnimBlockToSlide,
  appendAnimLeafToOrder,
  collectAnimOrderTargets,
  ensureAnimOrder,
  insertAnimOrderAfter,
  isElSpecificAnim,
  newAnimBlockId,
  peekAnimOrder,
  peekAnimOrderAt,
  slideAnimLeader,
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
import {
  clampImageSortMarker,
  defaultImageSortMarkerPos,
  getImageSortMarkers,
  newImageSortMarkerId,
} from './imageSortApplet.js';
import {
  defaultModel3dFields,
  MODEL3D_COLOR_SCHEME,
  MODEL3D_BG_SCHEME,
} from './model3d.js';

function model3dFieldsWithTheme(partial = {}) {
  const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
  const colorScheme = partial.objColorScheme || MODEL3D_COLOR_SCHEME;
  const bgScheme = partial.objBgScheme || MODEL3D_BG_SCHEME;
  return defaultModel3dFields({
    ...partial,
    objColorScheme: { ...colorScheme },
    objBgScheme: { ...bgScheme },
    objColor: partial.objColor || resolveSchemeColor(colorScheme, theme) || '#6366f1',
    objBg: partial.objBg || resolveSchemeColor(bgScheme, theme) || '#0f172a',
  });
}
import { renderQRDataURL } from './qr.js';
import {
  putFromFile,
  resolveMediaSrc,
  slimMediaEl,
  ensureElementMediaId,
  packDeckForFile,
  unpackDeckMedia,
  hydrateSlides as hydrateMediaSlides,
} from './mediaStore.js';
import { prepareDeckForHtmlExport } from '../export/prepareExportAssets.js';
import { getAudioLibrary } from './audioLibrary.js';
import { defaultCam, nudgeCameraInside } from './camera.js';
import { firstVisibleSlideIndex } from './slideVisibility.js';
import { looksLikeHtmlDocument } from './htmlFrame.js';
import { ensureCodeHtml, normalizeCodeLang } from './codeHighlight.js';
import { stripImportFlags, PRE_WRAP_CS, MONO_CS } from './importEnrich.js';
import { fitImportedImageAspect } from './imgAspect.js';
import {
  pickRandomQuote,
  buildQuoteHtml,
  quoteThemeColor,
  makeQuoteElement,
  getQuoteCat,
  setQuoteCat,
} from './quotes.js';
import { captureStyle, stylePatchForTarget } from './styleCopy.js';
import { DEFAULT_TEXT_FONT_FAMILY } from './fonts.js';
import { canvasArDims, DEFAULT_CANVAS_W, DEFAULT_CANVAS_H, matchCanvasAr } from './canvasDims.js';
import {
  arLayoutKey,
  saveSlidesArLayout,
  applySlideArLayout,
} from './arLayout.js';
import { scaleSlidesToCanvas } from './scaleDeck.js';
import { bucketFillAt as computeBucketFill } from './inkFill.js';
import { expandInkGroupIds, findInkById } from './inkSelect.js';
import { findInkHostsForIds } from './inkHost.js';
import {
  MARKER_SIZES,
  PEN_SIZES,
  nearestSizeIdx,
  sizesForDrawTool,
} from './inkBrush.js';
import { defaultCurvePoints, setCurveNodeWidth } from './curveEditor.js';
import {
  detachFillImg,
  fillImgPatchFromSrc,
  fillImgReplacePatch,
  syncFillImgNetwork,
} from './shapeFillImg.js';

function lang() {
  return useUiStore.getState().lang;
}

function ru() {
  return lang() !== 'en';
}

function cloneSlides(slides) {
  return JSON.parse(JSON.stringify(slides || [], (k, val) => (k === '_mesh' ? undefined : val)));
}

function graphThemeOptions() {
  const theme = getTheme(usePresentationStore.getState().appliedThemeIdx) || THEMES[0];
  const dark = theme?.dark !== false;
  const graphColorScheme = { col: 0, row: 4 };
  return {
    theme: 'system',
    dark,
    bg: dark ? '#16161e' : '#ffffff',
    color:
      resolveSchemeColor(graphColorScheme, theme) ||
      theme?.ac1 ||
      theme?.colors?.[0] ||
      '#6366f1',
    graphColorScheme,
  };
}

function presentationSystemDark() {
  const theme = getTheme(usePresentationStore.getState().appliedThemeIdx) || THEMES[0];
  return theme?.dark !== false;
}

/**
 * Read a local File/Blob as text, robust to non-UTF-8 encodings.
 *
 * `File.text()` / `Blob.text()` always decode as UTF-8 per spec, with no way to override
 * that — fine for files fetched over HTTP (the browser's fetch() implementation consults the
 * response's Content-Type charset when deciding how to decode), but a raw local file picked
 * from disk carries no such hint. A file actually saved in a different encoding (Windows-1251
 * is common for older Russian-language exports) then gets silently mis-decoded as UTF-8,
 * producing garbled/mojibake text — exactly the "works from a website, breaks from a local
 * file" pattern. Decode manually so a bad UTF-8 decode (signalled by replacement characters)
 * can fall back to trying Windows-1251 instead.
 */
async function readFileTextSmart(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const badCount = (text.match(/\uFFFD/g) || []).length;
  if (badCount > 0) {
    try {
      const alt = new TextDecoder('windows-1251', { fatal: false }).decode(bytes);
      const altBadCount = (alt.match(/\uFFFD/g) || []).length;
      if (altBadCount < badCount) text = alt;
    } catch (e) {
      /* windows-1251 decoder unsupported in this browser — keep the utf-8 result */
    }
  }
  // TextDecoder normally strips a leading UTF-8 BOM itself, but be defensive.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text;
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
  // Clicking the canvas / an object leaves slide multi-select (Ctrl/Shift on thumbs).
  // Otherwise the strip keeps two slides highlighted and the props panel stays in
  // "N slides" mode even after the user clearly focused the stage.
  if (!opts.keepSlideMulti) {
    const pst = usePresentationStore.getState();
    if (pst.slideMultiSel?.length) pst.clearSlideMultiSel();
  }
  if (useUiStore.getState().dictationOn) {
    void import('./dictation.js')
      .then((m) => m.onEditorPick(id))
      .catch(() => {});
  }
  const ui = useUiStore.getState();
  if (ui.stylePipetteTargets && id) {
    const targets = ui.stylePipetteTargets;
    const { slides, cur } = usePresentationStore.getState();
    const source = (slides[cur]?.els || []).find((el) => el && String(el.id) === String(id));
    if (source && !source._isDecor) {
      const captured = captureStyle(source);
      const targetEls = (slides[targets.slideIdx]?.els || []).filter(
        (el) => el && !el._isDecor && targets.ids.includes(String(el.id))
      );
      let applied = 0;
      if (captured && targetEls.length) {
        useHistoryStore.getState().push();
        targetEls.forEach((target) => {
          const patch = stylePatchForTarget(captured, target);
          if (!patch) return;
          usePresentationStore.getState().patchElementOnSlide(targets.slideIdx, target.id, patch);
          if (patch.textColor && target.type === 'text' && target.cs) {
            const cs = applyCsProp(target.cs, 'color', patch.textColor);
            usePresentationStore.getState().patchElementOnSlide(targets.slideIdx, target.id, { cs });
          }
          applied += 1;
        });
      }
      useUiStore.getState().setStylePipetteTargets(null);
      if (cur !== targets.slideIdx) usePresentationStore.getState().setCur(targets.slideIdx);
      if (targets.ids.length > 1) useSelectionStore.getState().setMultiSel(targets.ids);
      else useSelectionStore.getState().pickOne(targets.ids[0]);
      useUiStore.getState().showToast(
        applied
          ? ru() ? `Стиль снят с образца и применён (${applied})` : `Style picked and applied (${applied})`
          : ru() ? 'У образца нет совместимых параметров стиля' : 'No compatible style properties on sample',
        applied ? 'ok' : 'warn'
      );
      return;
    }
  }
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
  // Image-sort marker selection only while the imagesort applet is selected.
  {
    const uiState = useUiStore.getState();
    if (!id) {
      uiState.setImageSortMarkerId(null);
    } else {
      const { slides, cur } = usePresentationStore.getState();
      const picked = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
      if (!picked || picked.appletId !== 'imagesort') uiState.setImageSortMarkerId(null);
    }
  }
}

function currentEl() {
  const { slides, cur } = usePresentationStore.getState();
  const selId = useSelectionStore.getState().selId;
  return (slides[cur]?.els || []).find((e) => e && String(e.id) === String(selId)) || null;
}

function selectedColorTargets() {
  const { slides, cur } = usePresentationStore.getState();
  const { selId, multiSel } = useSelectionStore.getState();
  const ids = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
  const els = slides[cur]?.els || [];
  return ids
    .map((id) => els.find((e) => e && String(e.id) === id))
    .filter((e) => e && !e._isDecor);
}

function shapeIsLineLike(el) {
  if (!el || el.type !== 'shape') return false;
  if (el.shape === 'line' || el.shape === 'curve') return true;
  return !!getShapeMeta(el.shape || 'rect')?.noFill;
}

function resolveColorChannel(modifiers = {}, mode) {
  if (modifiers.shift) return 'stroke';
  if (modifiers.ctrl || modifiers.alt) return 'text';
  if (mode === 'stroke') return 'stroke';
  if (mode === 'text') return 'text';
  return 'fill';
}

function tableCellKeysForColor(el) {
  const st = useSelectionStore.getState();
  const sel = st.tableCell;
  if (sel && String(sel.elId) === String(el.id)) {
    const keys = (st.tableCellSel || []).length ? st.tableCellSel : [{ r: sel.r, c: sel.c }];
    if (keys.length) return keys;
  }
  const rows = +el.rows || 0;
  const cols = +el.cols || 0;
  const all = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) all.push({ r, c });
  }
  return all;
}

function tableColorPatch(el, channel, color, schemeRef) {
  const keys = tableCellKeysForColor(el);
  const keySet = new Set(keys.map((k) => `${+k.r}:${+k.c}`));
  if (channel === 'stroke') {
    const width = +el.borderW > 0 ? +el.borderW : 1;
    const spec =
      isNoneTableColor(color) || !(width > 0) ? { w: 0, color: 'transparent' } : { w: width, color };
    const cells = paintSelectedCellBorders(el, keys, spec);
    const patch = { cells, borderColor: color, stroke: color };
    if (schemeRef !== undefined) patch.borderColorScheme = schemeRef;
    if (!(+el.borderW > 0) && spec.w > 0) patch.borderW = spec.w;
    return patch;
  }
  const cells = mapTableCells(el, (cell, rr, cc) => {
    if (!keySet.has(`${rr}:${cc}`) || cell.hidden) return { ...cell, r: rr, c: cc };
    const next = { ...cell, r: rr, c: cc };
    if (channel === 'fill') {
      if (!color || color === 'none' || color === 'transparent') {
        delete next.bg;
        delete next.bgScheme;
      } else {
        next.bg = color;
        if (schemeRef === null) delete next.bgScheme;
        else if (schemeRef) next.bgScheme = schemeRef;
      }
    } else if (channel === 'text') {
      next.textColor = color;
      if (schemeRef === null) delete next.textColorScheme;
      else if (schemeRef) next.textColorScheme = schemeRef;
      next.html = stripInlineTextColors(next.html || '', cell.textColor);
    }
    return next;
  });
  return { cells };
}

function colorPatchForEl(el, channel, color, schemeRef) {
  if (!el) return null;
  if (el.type === 'table') return tableColorPatch(el, channel, color, schemeRef);
  if (channel === 'fill') {
    if (el.type === 'shape') {
      if (shapeIsLineLike(el)) {
        return { stroke: color, strokeScheme: schemeRef, ...(+(el.sw) > 0 ? {} : { sw: 2 }) };
      }
      return { fill: color, fillScheme: schemeRef };
    }
    if (el.type === 'text' || el.type === 'markdown') return { textBg: color, textBgScheme: schemeRef };
    if (el.type === 'icon') {
      return {
        iconColor: color,
        iconColorScheme: schemeRef,
        iconColorCustom: !schemeRef,
        textColor: color,
      };
    }
    if (el.type === 'lego') return { legoColor: color, legoColorScheme: schemeRef };
    if (el.type === 'formula') {
      return { formulaColor: color, formulaColorScheme: schemeRef, textColor: color, textColorScheme: schemeRef };
    }
    if (el.type === 'graph') {
      return { graphColor: color, graphColorScheme: schemeRef };
    }
    return null;
  }
  if (channel === 'stroke') {
    if (el.type === 'shape') {
      return { stroke: color, strokeScheme: schemeRef, ...(+(el.sw) > 0 ? {} : { sw: 2 }) };
    }
    if (el.type === 'text' || el.type === 'markdown') {
      return {
        textBorderColor: color,
        textBorderColorScheme: schemeRef,
        ...(+(el.textBorderW) > 0 ? {} : { textBorderW: 2 }),
      };
    }
    if (el.type === 'image') {
      return { imgBc: color, imgBcScheme: schemeRef, ...(+(el.imgBw) > 0 ? {} : { imgBw: 2 }) };
    }
    if (el.type === 'graph') {
      return { graphColor: color, graphColorScheme: schemeRef };
    }
    return null;
  }
  if (channel === 'text') {
    if (el.type === 'shape') {
      return {
        shapeTextCss: withShapeTextColor(el.shapeTextCss, color),
        textColor: color,
        textColorScheme: schemeRef,
      };
    }
    if (el.type === 'text' || el.type === 'formula' || el.type === 'markdown') {
      let cs = fmtCsOf(el);
      cs = applyCsProp(cs, 'color', color);
      const extra = { textColor: color, textColorScheme: schemeRef };
      if (el.type === 'formula') {
        extra.formulaColor = color;
        extra.formulaColorScheme = schemeRef;
      }
      const srcHtml = fmtHtmlOf(el);
      if (srcHtml) extra.html = stripInlineTextColors(srcHtml, el.textColor || parseCsColor(fmtCsOf(el)));
      if (el.type === 'text' || el.type === 'markdown' || el.type === 'formula') extra.cs = cs;
      return extra;
    }
    if (el.type === 'graph') {
      return { graphColor: color, graphColorScheme: schemeRef };
    }
    return null;
  }
  return null;
}

/** After graphColor changes, bake new curve bitmaps/paths (same as PropsPanel color field). */
async function rebuildGraphElementsByIds(ids) {
  const want = new Set((ids || []).map(String).filter(Boolean));
  if (!want.size) return;
  const { rebuildGraphElAsync } = await import('./graph.js');
  const dark = presentationSystemDark();
  const slides = usePresentationStore.getState().slides || [];
  for (let si = 0; si < slides.length; si++) {
    const els = slides[si]?.els || [];
    for (const el of els) {
      if (!el || el.type !== 'graph' || !want.has(String(el.id))) continue;
      const next = { ...el };
      await rebuildGraphElAsync(next, { systemDark: dark });
      const patch = {
        graphImg: next.graphImg,
        graphAxesImg: next.graphAxesImg || null,
        graphCurveImg: next.graphCurveImg || null,
        graphPaths: next.graphPaths || null,
        graphPathW: next.graphPathW || null,
        graphPathH: next.graphPathH || null,
        graphColor: next.graphColor,
        graphColorScheme: next.graphColorScheme,
        graphBg: next.graphBg,
        graphDark: next.graphDark,
        graphChromeVer: next.graphChromeVer,
      };
      const st = usePresentationStore.getState();
      if (si === st.cur) st.patchElement(el.id, patch);
      else st.patchElementOnSlide(si, el.id, patch);
    }
  }
}

function defaultPaletteStroke() {
  const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
  return theme?.colors?.[4] || theme?.accent || '#1d4ed8';
}

function opacityPatchForEl(el, v) {
  const op = Math.max(0, Math.min(1, +v));
  if (el.type === 'image') return { imgOpacity: op, elOpacity: op };
  return { elOpacity: op, fillOp: op };
}

function blurPatchForEl(el, n) {
  const v = Math.max(0, +n || 0);
  if (el.type === 'shape') return { shapeBlur: v };
  if (el.type === 'text' || el.type === 'markdown') return { textBgBlur: v };
  return { blur: v };
}

function strokeWidthPatchForEl(el, v) {
  const sw = Math.max(0, +v || 0);
  if (el.type === 'shape') {
    const ensureStroke =
      sw > 0 && (!el.stroke || el.stroke === 'none' || el.stroke === 'transparent')
        ? {
            stroke: defaultPaletteStroke(),
            ...(!el.strokeScheme ? { strokeScheme: { col: 0, row: 4 } } : {}),
          }
        : {};
    // Curve node edit: thickness applies to the selected node (taper), not the whole stroke.
    if (el.shape === 'curve') {
      const ui = useUiStore.getState();
      if (ui.curveEditMode) {
        const sel = ui.curveNodeSel || [];
        const idx = sel.length ? sel[sel.length - 1] : -1;
        if (idx >= 0) {
          const base = el.sw != null ? +el.sw : 2;
          const next = setCurveNodeWidth(
            el.curvePoints || defaultCurvePoints(),
            idx,
            Math.max(0.5, sw || 0.5),
            base
          );
          return { curvePoints: next, ...ensureStroke };
        }
      }
      // Whole-curve thickness: clear per-node widths so el.sw drives a uniform stroke again.
      if (Array.isArray(el.curvePoints) && el.curvePoints.some((p) => p && p.sw != null)) {
        return {
          sw,
          ...ensureStroke,
          curvePoints: el.curvePoints.map((p) => {
            if (!p || p.sw == null) return p;
            const { sw: _nodeSw, ...rest } = p;
            return rest;
          }),
        };
      }
    }
    return { sw, ...ensureStroke };
  }
  if (el.type === 'text' || el.type === 'markdown') {
    const patch = { textBorderW: sw };
    if (sw > 0 && (!el.textBorderColor || el.textBorderColor === 'none' || el.textBorderColor === 'transparent')) {
      patch.textBorderColor = defaultPaletteStroke();
    }
    return patch;
  }
  if (el.type === 'image') {
    const patch = { imgBw: sw };
    if (sw > 0 && (!el.imgBc || el.imgBc === 'none' || el.imgBc === 'transparent')) {
      patch.imgBc = defaultPaletteStroke();
    }
    return patch;
  }
  if (el.type === 'table') {
    const sel = useSelectionStore.getState().tableCell;
    if (sel && String(sel.elId) === String(el.id)) {
      const keys = (useSelectionStore.getState().tableCellSel || []).length
        ? useSelectionStore.getState().tableCellSel
        : [{ r: sel.r, c: sel.c }];
      const color = el.borderColor || el.stroke || '#64748b';
      const spec = sw > 0 && !isNoneTableColor(color) ? { w: sw, color } : { w: 0, color: 'transparent' };
      return { cells: paintSelectedCellBorders(el, keys, spec), borderW: sw };
    }
    return { borderW: sw };
  }
  if (el.type === 'icon') return { iconSw: sw };
  return null;
}

function patchSelectedEls(makePatch) {
  const targets = selectedColorTargets();
  if (!targets.length) return false;
  withHistory(() => {
    const st = usePresentationStore.getState();
    targets.forEach((el) => {
      const patch = makePatch(el);
      if (patch && Object.keys(patch).length) st.patchElement(el.id, patch);
    });
  });
  return true;
}

function isRichTextEl(el) {
  return !!(el && (el.type === 'text' || el.type === 'formula' || el.type === 'shape'));
}

function fmtCsOf(el) {
  if (!el) return '';
  return el.type === 'shape' ? el.shapeTextCss || DEFAULT_SHAPE_TEXT_CSS : el.cs || '';
}

function fmtHtmlOf(el) {
  if (!el) return '';
  return el.type === 'shape' ? el.shapeHtml || '' : el.html || '';
}

function stripRichHtml(html) {
  return String(html || '')
    .replace(/<\/?(?:b|strong|i|em|u|s|strike|sub|sup|font)(?:\s[^>]*)?>/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sclass="[^"]*"/gi, '')
    .replace(/\sdata-ul="[^"]*"/gi, '');
}

/** Build a patch that clears formatting for one element (or null if N/A). */
function formattingPatchForEl(el) {
  if (!el || el._isDecor) return null;
  if (el.type === 'text') {
    const cleaned = stripRichHtml(el.html);
    let cs = el.cs || '';
    cs = applyCsProp(cs, 'font-weight', '400');
    cs = applyCsProp(cs, 'font-style', 'normal');
    cs = stripUnderlineFromCs(cs);
    cs = applyCsProp(cs, 'text-transform', null);
    return {
      html: cleaned,
      text: cleaned.replace(/<[^>]+>/g, ''),
      cs,
      textRole: el.textRole === 'heading' || el.textRole === 'title' ? 'body' : el.textRole,
    };
  }
  if (el.type === 'shape') {
    return {
      shapeHtml: stripRichHtml(el.shapeHtml),
      shapeTextCss: DEFAULT_SHAPE_TEXT_CSS,
      textColor: '#ffffff',
      textColorScheme: null,
    };
  }
  if (el.type === 'table') {
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
      delete next.fw;
      delete next.fst;
      delete next.borders;
      next.html = stripCellHtml(next.html);
      return next;
    });
    return { cells };
  }
  if (el.type === 'formula' || el.type === 'markdown' || el.type === 'code') {
    const patch = {};
    if (el.cs) {
      let cs = el.cs;
      cs = applyCsProp(cs, 'font-weight', '400');
      cs = applyCsProp(cs, 'font-style', 'normal');
      cs = stripUnderlineFromCs(cs);
      patch.cs = cs;
    }
    if (el.html) {
      const cleaned = stripRichHtml(el.html);
      patch.html = cleaned;
      patch.text = cleaned.replace(/<[^>]+>/g, '');
    }
    return Object.keys(patch).length ? patch : null;
  }
  return null;
}

function patchRichText(el, fields = {}) {
  if (!el) return;
  const data = { ...(fields.extra || {}) };
  if (el.type === 'shape') {
    if (fields.html !== undefined) data.shapeHtml = fields.html;
    if (fields.cs !== undefined) data.shapeTextCss = fields.cs;
  } else {
    if (fields.html !== undefined) {
      data.html = fields.html;
      data.text = fields.text !== undefined ? fields.text : String(fields.html || '').replace(/<[^>]+>/g, '');
    }
    if (fields.cs !== undefined) data.cs = fields.cs;
  }
  if (fields.textColor !== undefined) data.textColor = fields.textColor;
  if (fields.textColorScheme !== undefined) data.textColorScheme = fields.textColorScheme;
  withHistory(() => usePresentationStore.getState().patchElement(el.id, data));
}

function textBodyRoot(elId) {
  if (typeof document === 'undefined' || !elId) return null;
  return document.querySelector(`[data-id="${String(elId)}"] .react-text-body`);
}

function liveEditableRoot(el) {
  if (!el || typeof document === 'undefined') return null;
  const fromActive = editingTextRoot(el.id);
  if (fromActive) return fromActive;
  const wrap = document.querySelector(`[data-id="${String(el.id)}"]`);
  return wrap?.querySelector?.('[contenteditable="true"]') || null;
}

function readLiveTextHtml(el) {
  const focused = el ? editingTextRoot(el.id) : null;
  if (focused) return htmlFromEditable(focused);
  // Prefer painted DOM (editing or not) so inline font-size spans match what the user sees.
  const body = el ? textBodyRoot(el.id) : null;
  if (body?.innerHTML) return body.innerHTML;
  if (el?.type === 'table') {
    const sel = useSelectionStore.getState().tableCell;
    if (sel && String(sel.elId) === String(el.id)) return getTableCell(el, +sel.r, +sel.c).html || '';
  }
  if (el?.type === 'shape') return el.shapeHtml || '';
  return el?.html || '';
}

function editingTableCell(el) {
  if (!el || el.type !== 'table') return null;
  const root = editingTextRoot(el.id);
  if (!root) return null;
  const td = root.closest?.('td,th');
  if (!td || td.dataset?.r == null) return null;
  return { root, r: +td.dataset.r, c: +td.dataset.c };
}

function selectedTableKeys(el) {
  const st = useSelectionStore.getState();
  const sel = st.tableCell;
  if (!sel || String(sel.elId) !== String(el.id)) return [];
  const set = st.tableCellSel || [];
  return set.length ? set : [{ r: sel.r, c: sel.c }];
}

function tableCellFmtCs(el) {
  const keys = selectedTableKeys(el);
  if (!keys.length) return '';
  const cell = getTableCell(el, +keys[0].r, +keys[0].c);
  const isH = +keys[0].r === 0 && el.headerRow !== false;
  const fw = cell.fw != null ? cell.fw : isH ? 700 : 400;
  const fst = cell.fst || 'normal';
  return `font-weight:${fw};font-style:${fst}`;
}

function tableHtmlUnderline(html) {
  const m = String(html || '').match(/data-ul="([^"]*)"/i);
  if (m) {
    const map = {
      single: 'underline',
      double: 'underline double',
      wavy: 'underline wavy',
      dashed: 'underline dashed',
      'dash-dot': 'underline dash-dot',
    };
    return map[m[1]] || 'underline';
  }
  if (/text-decoration[^;"']*underline/i.test(html || '')) return 'underline';
  return 'none';
}

function saveFmtHtml(el, html, extra = {}) {
  if (el?.type === 'table') {
    patchLiveTableCell(el, html);
    return;
  }
  if (el?.type === 'shape') {
    patchRichText(el, { html, extra });
    return;
  }
  withHistory(() =>
    usePresentationStore.getState().patchElement(el.id, {
      html,
      text: String(html || '').replace(/<[^>]+>/g, ''),
      ...extra,
    })
  );
}

function patchLiveTableCell(el, html, extra = {}) {
  const hit = editingTableCell(el);
  const keys = selectedTableKeys(el);
  const r = hit ? hit.r : keys[0] != null ? +keys[0].r : null;
  const c = hit ? hit.c : keys[0] != null ? +keys[0].c : null;
  if (r == null || c == null) return;
  if (hit?.root && html != null && hit.root.innerHTML !== html) hit.root.innerHTML = html;
  const cells = mapTableCells(el, (cell, rr, cc) =>
    rr === r && cc === c
      ? { ...cell, r: rr, c: cc, ...(html != null ? { html } : {}), ...extra }
      : { ...cell, r: rr, c: cc }
  );
  withHistory(() => usePresentationStore.getState().patchElement(el.id, { cells }));
}

function writeLiveTextHtml(el, html, caretLine) {
  const root = el ? editingTextRoot(el.id) || textBodyRoot(el.id) : null;
  if (!root) return;
  if (root.innerHTML !== html) root.innerHTML = html;
  if (caretLine != null) placeCaretAfterLineMarker(root, caretLine);
}

function patchTextHtml(el, html, extra = {}, caretLine) {
  if (el?.type === 'table') {
    patchLiveTableCell(el, html, extra);
    return;
  }
  writeLiveTextHtml(el, html, caretLine);
  if (el?.type === 'shape') {
    patchRichText(el, { html, extra });
    return;
  }
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
  // -1 means “keep current theme” (LLM decks); do not overwrite with invalid index.
  if (next.appliedThemeIdx != null && next.appliedThemeIdx < 0) {
    if (next.themeName) {
      const i = THEMES.findIndex((t) => t && t.name === next.themeName);
      if (i >= 0) next.appliedThemeIdx = i;
      else delete next.appliedThemeIdx;
    } else {
      delete next.appliedThemeIdx;
    }
  } else if ((next.appliedThemeIdx == null || next.appliedThemeIdx < 0) && next.themeName) {
    const i = THEMES.findIndex((t) => t && t.name === next.themeName);
    if (i >= 0) next.appliedThemeIdx = i;
  }
  return next;
}

/** Map LLM/legacy anim aliases to editor schema (name + click|withPrev|auto|element). */
function normalizeImportedAnim(a) {
  if (!a || typeof a !== 'object') return a;
  let next = a;
  let changed = false;
  const name = a.name || a.type || a.effect;
  if (name && a.name !== name) {
    next = { ...next, name };
    changed = true;
    if (next.type != null && next.type === name) {
      const { type: _t, ...rest } = next;
      next = rest;
      changed = true;
    }
  }
  const trigRaw = String(a.trigger || '').trim();
  const trigMap = {
    onClick: 'click',
    onclick: 'click',
    on_click: 'click',
    slideClick: 'click',
    click: 'click',
    withPrevious: 'withPrev',
    withprevious: 'withPrev',
    simultaneous: 'withPrev',
    afterPrevious: 'auto',
    after: 'auto',
    object: 'element',
    objectClick: 'element',
    onObject: 'element',
  };
  if (trigRaw && trigMap[trigRaw]) {
    if (next.trigger !== trigMap[trigRaw]) {
      next = { ...next, trigger: trigMap[trigRaw] };
      changed = true;
    }
  } else if (trigRaw === 'onClick' || trigRaw === 'onclick') {
    next = { ...next, trigger: 'click' };
    changed = true;
  }
  if (a.triggerElId == null && a.triggerId != null) {
    next = { ...next, triggerElId: a.triggerId };
    changed = true;
  }
  if (a.dur == null && a.duration != null) {
    next = { ...next, dur: a.duration };
    changed = true;
  }
  return changed ? next : a;
}

function normalizeImportedElements(data) {
  if (!data || !Array.isArray(data.slides)) return data;
  let changed = false;
  const slides = data.slides.map((s) => {
    if (!s?.els) return s;
    let elsChanged = false;
    let orderLeaves = [];
    const els = s.els.map((el) => {
      if (!el) return el;
      let nextEl = el;
      if (Array.isArray(el.anims) && el.anims.length) {
        let animsChanged = false;
        const anims = el.anims.map((a, ai) => {
          const na = normalizeImportedAnim(a);
          if (na !== a) animsChanged = true;
          if (na && na.name) orderLeaves.push({ elId: el.id, ai });
          return na;
        });
        if (animsChanged) {
          nextEl = { ...nextEl, anims };
          elsChanged = true;
        }
      }
      if (nextEl.type === 'table') {
        const next = normalizeTableElement(nextEl);
        if (next !== nextEl) elsChanged = true;
        return next;
      }
      if (nextEl.type === 'formula') {
        let next = nextEl;
        const raw = String(nextEl.formulaRaw || '').trim();
        // Drop unusable placeholder SVG so hydrate/rebake can run.
        if (nextEl.formulaSvg && !/<svg[\s>]/i.test(String(nextEl.formulaSvg))) {
          next = { ...next, formulaSvg: '' };
          elsChanged = true;
        }
        // Strip \( \) / $$ wrappers LLM often wraps around formulaRaw.
        if (raw && (/\\\(|\\\[|^\$\$/.test(raw) || raw.startsWith('$'))) {
          // Sync strip — full bake path also uses latexForSvgBake.
          let t = raw;
          t = t.replace(/^\$\$([\s\S]*)\$\$$/, '$1');
          t = t.replace(/^\$([^$]*)\$$/, '$1');
          t = t.replace(/^\\\(([\s\S]*)\\\)$/, '$1');
          t = t.replace(/^\\\[([\s\S]*)\\\]$/, '$1');
          t = t.replace(/\\\(/g, '').replace(/\\\)/g, '');
          t = t.replace(/\\\[/g, '').replace(/\\\]/g, '');
          t = t.trim();
          if (t && t !== raw) {
            next = { ...next, formulaRaw: t };
            elsChanged = true;
          }
        }
        return next;
      }
      return nextEl;
    });
    let slideOut = elsChanged ? { ...s, els } : s;
    // If LLM left animOrder empty but elements have anims, build a linear order.
    if (orderLeaves.length && (!Array.isArray(s.animOrder) || !s.animOrder.length)) {
      slideOut = { ...slideOut, animOrder: orderLeaves };
      elsChanged = true;
    }
    if (!elsChanged && slideOut === s) return s;
    changed = true;
    return slideOut;
  });
  const withTables = changed ? { ...data, slides } : data;
  // LLM decks use "svg" instead of editor field "svgContent".
  const migrated = migrateSvgFieldsInSlides(withTables.slides);
  if (migrated === withTables.slides) return withTables;
  return { ...withTables, slides: migrated };
}

function commitImportedDeck(data, opts = {}) {
  const payload = normalizeImportedElements(normalizeImportPayload(data));
  // Always open on slide 1 after import — exported JSON/HTML often keep the
  // editor's `cur` from the moment of export, which is confusing on reload.
  if (payload && typeof payload === 'object') payload.cur = 0;
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
  // Shared media map + content-hash dedupe, then formulas.
  void (async () => {
    try {
      const deckNow = usePresentationStore.getState();
      const mediaMap = payload?.media || data?.media;
      await unpackDeckMedia({ slides: deckNow.slides, media: mediaMap });
      await hydrateMediaSlides(deckNow.slides);
      usePresentationStore.setState({ slides: [...deckNow.slides] });
      usePresentationStore.getState().persist();
    } catch (e) {
      console.warn('[commitImportedDeck media]', e);
    }
    try {
      const { hydrateMissingFormulas, cloneSlidesAfterFormulaHydrate } = await import('./slideThumb.js');
      const slidesNow = usePresentationStore.getState().slides;
      const n = await hydrateMissingFormulas(slidesNow);
      if (!(n > 0)) return;
      usePresentationStore.setState({ slides: cloneSlidesAfterFormulaHydrate(slidesNow) });
      usePresentationStore.getState().persist();
      usePresentationStore.getState().bumpThumbEpoch?.();
    } catch (e) {
      console.warn('[commitImportedDeck formulas]', e);
    }
  })();
  return true;
}

/** After PPT/ODP import: pin colors to current theme scheme so theme switches rematch from-scratch slides. */
function resetImportedTextFormatting(slides, theme) {
  if (!Array.isArray(slides)) return slides;
  const isDark = theme ? !!theme.dark : true;
  // Same pins as addText / remapElementForTheme defaults
  const textScheme = { col: 7, row: 0 };
  const headingScheme = { col: 0, row: 0 };
  const shapeFillScheme = { col: 0, row: 4 };
  const shapeStrokeScheme = { col: 0, row: 3 };
  const defColor =
    resolveSchemeColor(textScheme, theme) || (isDark ? '#ffffff' : '#1e293b');
  const defHeading =
    resolveSchemeColor(headingScheme, theme) || theme?.headingColor || defColor;
  const defBg = theme?.bg || (isDark ? '#1e293b' : '#ffffff');
  const defShapeFill =
    resolveSchemeColor(shapeFillScheme, theme) ||
    theme?.shapeFill ||
    theme?.ac1 ||
    (isDark ? '#6366f1' : '#3b82f6');
  const defShapeStroke =
    resolveSchemeColor(shapeStrokeScheme, theme) ||
    theme?.shapeStroke ||
    theme?.ac2 ||
    defShapeFill;
  let changed = false;
  const next = slides.map((s) => {
    const els = (s.els || []).map((el) => {
      if (!el) return el;
      // Code blocks keep their own palette; just drop ephemeral import flags
      if (el.type === 'code') {
        changed = true;
        return stripImportFlags(el);
      }
      if (el.type === 'image') {
        // Fit box to natural aspect (no stretch); drop invented borders
        const next = stripImportFlags(fitImportedImageAspect({ ...el }));
        if (!(+(next.imgBw) > 0)) {
          next.imgBw = 0;
          delete next.imgBc;
          delete next.imgBcScheme;
        }
        changed = true;
        return next;
      }
      if (el.type === 'text') {
        const rawText = String(el.html || '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/div>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/gi, ' ');
        // Drop empty text boxes left by import
        if (!rawText.trim()) {
          changed = true;
          return null;
        }
        const hasList =
          !!el.bulletIconId ||
          !!el._importList ||
          /data-list-bullet|data-list-num/i.test(el.html || '');
        const keepMono = !!el._importMono || /font-family\s*:[^;]*(?:mono|consolas|courier)/i.test(el.cs || '');
        const csSrc = String(el.cs || '');
        const alignM = csSrc.match(/text-align\s*:\s*([^;]+)/i);
        const fsM = csSrc.match(/font-size\s*:\s*([\d.]+)/i);
        const align = (alignM && alignM[1].trim()) || 'left';
        let fs = fsM ? Math.round(+fsM[1]) : 24;
        if (!Number.isFinite(fs) || fs < 10) fs = 24;
        if (fs > 96) fs = 96;
        const preserved = preserveInlineWeight(el.html || '');
        const isHeading =
          el.textRole === 'heading' ||
          el.textRole === 'title' ||
          (fs >= 36 && rawText.replace(/\s+/g, ' ').trim().length < 80 && !hasList);
        const scheme = isHeading ? headingScheme : textScheme;
        const color = isHeading ? defHeading : defColor;
        let cs = `font-size:${fs}px;color:${color};text-align:${align};line-height:1.3;${PRE_WRAP_CS}`;
        if (keepMono) cs += MONO_CS;
        const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const maxLineLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
        const charW = fs * (keepMono ? 0.62 : 0.58);
        const fitW = Math.max(120, Math.min(1600, Math.round(maxLineLen * charW + 32)));
        const fitH = Math.max(36, Math.round(Math.max(1, lines.length) * fs * 1.35 + 16));
        const curW = el.w || 0;
        const curH = el.h || 0;
        const patch = {
          html: preserved,
          cs,
          textColor: color,
          textColorScheme: scheme,
          textRole: isHeading ? 'heading' : 'body',
        };
        if (hasList) patch.bulletIconId = el.bulletIconId || DEFAULT_BULLET_ICON_ID;
        // Expand collapsed/narrow boxes (char-column bug); only gently shrink huge ones
        if (curW < fitW * 0.5 || curW < 48) patch.w = fitW;
        else if (!hasList && !keepMono && curW > fitW * 2.2) patch.w = fitW;
        if (curH < fitH * 0.5 || curH < 24) patch.h = fitH;
        else if (!hasList && !keepMono && curH > fitH * 2.5) patch.h = fitH;
        changed = true;
        return stripImportFlags({ ...el, ...patch });
      }
      if (el.type === 'shape') {
        // Drop tiny decorative shapes left by import
        if ((el.w || 0) < 28 && (el.h || 0) < 28) {
          changed = true;
          return null;
        }
        changed = true;
        return {
          ...el,
          fill: defShapeFill,
          stroke: defShapeStroke,
          fillScheme: shapeFillScheme,
          strokeScheme: shapeStrokeScheme,
        };
      }
      return el;
    }).filter(Boolean);
    // Leave bgScheme undefined (not null) so applyThemeToSlides remaps bg like new slides
    const slideNext = {
      ...s,
      els,
      bgc: defBg,
      bg: 'solid',
      bgImg: null,
    };
    delete slideNext.bgScheme;
    changed = true;
    return slideNext;
  });
  return changed ? next : slides;
}

/** Keep <b>/<i>, <br>, and list markers; strip color/font-size styles. */
function preserveInlineWeight(html) {
  const src = String(html || '');
  const preserveLine = (inner) => {
    let rest = String(inner || '');
    let marker = '';
    // Keep list marker spans intact (may contain nested SVG)
    const markRe =
      /^(<span[^>]*(?:data-list-bullet|data-list-num)[^>]*>[\s\S]*?<\/span>)([\s\S]*)$/i;
    const mm = rest.match(markRe);
    if (mm) {
      marker = mm[1];
      rest = mm[2];
    }
    // Protect soft breaks first — naive /(b|...)/ matches the "b" inside <br>
    const brs = [];
    rest = rest.replace(/<br\s*\/?>/gi, () => {
      const tok = `\uE000BR${brs.length}\uE001`;
      brs.push('<br>');
      return tok;
    });
    let result = '';
    // longer names before "b"/"i"; require tag boundary so "br" never matches "b"
    const re =
      /<(span|strong|em|b|i|u)(?=[\s>/])([^>]*)>([\s\S]*?)<\/\1>|([^<]+)/gi;
    let m;
    while ((m = re.exec(rest)) !== null) {
      if (m[4]) {
        result += m[4];
      } else {
        const tag = m[1].toLowerCase();
        const content = m[3];
        const style = (m[0].match(/style="([^"]*)"/) || [])[1] || '';
        const isBold = tag === 'b' || tag === 'strong' || /font-weight\s*:\s*[7-9]\d\d/.test(style);
        const isItalic = tag === 'i' || tag === 'em' || /font-style\s*:\s*italic/.test(style);
        if (isBold && isItalic) result += `<b><i>${content}</i></b>`;
        else if (isBold) result += `<b>${content}</b>`;
        else if (isItalic) result += `<i>${content}</i>`;
        else result += content;
      }
    }
    let out = marker + result;
    brs.forEach((br, i) => {
      out = out.split(`\uE000BR${i}\uE001`).join(br);
    });
    return out;
  };

  if (/<div[\s>]/i.test(src)) {
    return src.replace(/<div([^>]*)>([\s\S]*?)<\/div>/gi, (_, attrs, inner) => {
      // Keep indent padding on list items
      const style = (attrs.match(/style="([^"]*)"/i) || [])[1] || '';
      const pad = (style.match(/padding-left\s*:\s*[^;]+/i) || [])[0] || '';
      const open = pad ? `<div style="${pad}">` : '<div>';
      return `${open}${preserveLine(inner)}</div>`;
    });
  }
  if (/<br\s*\/?>/i.test(src)) {
    return src.split(/<br\s*\/?>/i).map(preserveLine).join('<br>');
  }
  return preserveLine(src);
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

let autoPlaceLayoutVariant = 0;
let animClipboard = null;

function cloneAnimOrderSlide(slide) {
  return {
    ...slide,
    animOrder: JSON.parse(JSON.stringify(slide.animOrder || [])),
  };
}

function snapshotAnimOrderEntry(slide, entry) {
  if (!slide || !entry) return null;
  if (entry.kind === 'pause') {
    return { type: 'pause', duration: entry.duration != null ? entry.duration : 1000 };
  }
  if (entry.kind === 'repeat') {
    return {
      type: 'repeat',
      delay: entry.delay || 0,
      count: entry.count != null ? entry.count : 2,
      infinite: !!entry.infinite,
      children: (entry.children || []).map((ch) => snapshotAnimOrderEntry(slide, ch)).filter(Boolean),
    };
  }
  if (entry.kind === 'camera') {
    const cam = (slide.cameras || []).find((c) => c && c.id === entry.camId);
    if (!cam) return null;
    const { id, ...rest } = cam;
    return { type: 'camera', cam: JSON.parse(JSON.stringify(rest)) };
  }
  if (entry.elId != null) {
    const el = (slide.els || []).find((e) => e && String(e.id) === String(entry.elId));
    const anim = el?.anims?.[entry.ai];
    if (!anim) return null;
    return { type: 'leaf', elId: el.id, anim: JSON.parse(JSON.stringify(anim)) };
  }
  return null;
}

function materializeAnimClipboard(snap) {
  if (!snap) return null;
  const st = usePresentationStore.getState();
  const slide = st.slides[st.cur];
  if (!slide) return null;
  if (snap.type === 'pause') {
    return { kind: 'pause', id: newAnimBlockId('pau'), duration: snap.duration != null ? snap.duration : 1000 };
  }
  if (snap.type === 'repeat') {
    return {
      kind: 'repeat',
      id: newAnimBlockId('rep'),
      delay: snap.delay || 0,
      count: snap.count != null ? snap.count : 2,
      infinite: !!snap.infinite,
      children: (snap.children || []).map((ch) => materializeAnimClipboard(ch)).filter(Boolean),
    };
  }
  if (snap.type === 'camera') {
    const cw = Math.max(100, +st.canvasW || DEFAULT_CANVAS_W);
    const ch = Math.max(100, +st.canvasH || DEFAULT_CANVAS_H);
    let cam = nudgeCameraInside({ ...defaultCam(cw, ch), ...(snap.cam || {}) }, cw, ch);
    cam.id = 'cam' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    cam.cx = Math.min(cw - cam.w / 2, (cam.cx || cw / 2) + 28);
    cam.cy = Math.min(ch - cam.h / 2, (cam.cy || ch / 2) + 20);
    cam = nudgeCameraInside(cam, cw, ch);
    const id = st.addCamera(cam);
    return id ? { kind: 'camera', camId: id } : null;
  }
  if (snap.type === 'leaf' && snap.anim) {
    const live = usePresentationStore.getState();
    const sl = live.slides[live.cur];
    let el = (sl?.els || []).find((e) => e && String(e.id) === String(snap.elId));
    if (!el || el._isDecor) el = currentEl();
    if (!el || el._isDecor) return null;
    if (snap.anim.name === 'inkDraw' && (el.anims || []).some((a) => a?.name === 'inkDraw')) {
      useUiStore.getState().showToast(
        ru() ? 'У этого объекта уже есть анимация «Рисование»' : 'This drawing already has an Ink draw animation',
        'warn'
      );
      return null;
    }
    const list = Array.isArray(el.anims) ? el.anims.slice() : [];
    list.push(JSON.parse(JSON.stringify(snap.anim)));
    live.patchElement(el.id, { anims: list });
    return { elId: el.id, ai: list.length - 1 };
  }
  return null;
}

function insertMaterializedAnim(loc, entry) {
  if (!entry) return false;
  const st = usePresentationStore.getState();
  const slide = st.slides[st.cur];
  if (!slide) return false;
  const orderSlide = cloneAnimOrderSlide(slide);
  if (!insertAnimOrderAfter(orderSlide, loc, entry)) return false;
  st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
  return true;
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

  /** Duplicate all multi-selected slides (or the current one). */
  dupSlidesSelected() {
    const st = usePresentationStore.getState();
    const ids = (
      st.slideMultiSel?.length > 1 ? st.slideMultiSel : [st.cur]
    )
      .map((i) => i | 0)
      .filter((i) => i >= 0 && i < (st.slides?.length || 0));
    if (!ids.length) return;
    const sorted = [...new Set(ids)].sort((a, b) => a - b);
    withHistory(() => {
      const store = usePresentationStore.getState();
      store.copySlides(sorted);
      store.pasteSlides(Math.max(...sorted) + 1);
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
    // Set multi-sel first; pick(null) clears object selection but must keep
    // slideMultiSel — otherwise Ctrl/Shift thumb clicks never stick.
    usePresentationStore.getState().pickSlideWithMod(i, e || null);
    pick(null, { keepSlideMulti: true });
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
        cs: `font-size:${fs}px;font-family:${DEFAULT_TEXT_FONT_FAMILY};font-weight:400;color:${defColor};text-align:left;line-height:1.2;`,
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
    if (meta?.special === 'trapezoid') {
      if (el.trapTop == null) patch.trapTop = 0.15;
      if (el.trapBot == null) patch.trapBot = 0;
    }
    if (el.shapePts) patch.shapePts = null;
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
      if (mode.kind === 'slideBg' || mode.kind === 'flip' || mode.kind === 'shapeFill') {
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

  openShapeFillImagePicker(elId) {
    const id = elId || useSelectionStore.getState().selId;
    if (!id) return;
    editorApi.openImagePicker({ kind: 'shapeFill', elId: id });
  },

  /** Remove image from this shape only (other linked shapes keep it). */
  clearShapeFillImage(elId) {
    const id = elId || useSelectionStore.getState().selId;
    if (!id) return;
    withHistory(() => {
      const st = usePresentationStore.getState();
      const els = st.slides[st.cur]?.els || [];
      const patches = detachFillImg(els, id);
      if (Object.keys(patches).length) st.patchElements(patches);
    });
    const editId = useUiStore.getState().shapeFillImgEditId;
    if (editId && String(editId) === String(id)) {
      useUiStore.getState().setShapeFillImgEditId(null);
    }
  },

  /** Toggle paint: image vs solid/gradient fill (keeps image data). */
  setShapeFillImgShow(elId, show) {
    const id = elId || useSelectionStore.getState().selId;
    if (!id) return;
    withHistory(() => {
      usePresentationStore.getState().patchElement(id, { fillImgShow: !!show });
    });
    if (!show) {
      const editId = useUiStore.getState().shapeFillImgEditId;
      if (editId && String(editId) === String(id)) {
        useUiStore.getState().setShapeFillImgEditId(null);
      }
    }
  },

  startShapeFillImgEdit(elId) {
    const id = elId || useSelectionStore.getState().selId;
    if (!id) return;
    useUiStore.getState().setCropModeElId(null);
    useUiStore.getState().setShapeNodeMode(false);
    useUiStore.getState().setCurveEditMode(false);
    const st = usePresentationStore.getState();
    const els = st.slides[st.cur]?.els || [];
    const el = els.find((e) => e && String(e.id) === String(id));
    if (el?.fillImg && el.fillImgShow === false) {
      st.patchElement(id, { fillImgShow: true });
    }
    useUiStore.getState().setShapeFillImgEditId(String(id));
  },

  endShapeFillImgEdit() {
    useUiStore.getState().setShapeFillImgEditId(null);
  },

  /**
   * Live / commit fill-image transform.
   * While scaling/moving, if the image rectangle overlaps other shapes they
   * receive the same image (shared mosaic). Insert/replace stay single-shape.
   */
  patchShapeFillImgLayout(elId, layout, opts = {}) {
    const id = elId;
    if (!id || !layout) return;
    const st = usePresentationStore.getState();
    const els = st.slides[st.cur]?.els || [];
    const source = els.find((e) => e && String(e.id) === String(id));
    if (!source?.fillImg) return;
    const patches = syncFillImgNetwork(els, id, layout);
    if (!Object.keys(patches).length) {
      st.patchElement(
        id,
        {
          fillImgX: layout.x,
          fillImgY: layout.y,
          fillImgW: layout.w,
          fillImgH: layout.h,
          fillImgRot: layout.rot,
          fillImgShow: true,
        },
        opts
      );
      return;
    }
    st.patchElements(patches, opts);
  },

  /** Apply gallery/file pick for insert | slideBg | flip | shapeFill. */
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
    if (m.kind === 'shapeFill' && m.elId) {
      const elId = String(m.elId);
      const finishUi = () => {
        useUiStore.getState().setPanel(null);
        useUiStore.getState().setShapeFillImgEditId(null);
        useUiStore.getState().showToast(ru() ? 'Изображение в фигуре' : 'Shape image set', 'ok');
      };
      const st0 = usePresentationStore.getState();
      const el0 = (st0.slides[st0.cur]?.els || []).find((e) => e && String(e.id) === elId);
      if (!el0 || el0.type !== 'shape') return;

      // Replace: only the selected shape. Fresh link + cover layout (centered on this shape).
      if (el0.fillImg) {
        const applyReplace = (nw, nh) => {
          withHistory(() => {
            usePresentationStore.getState().patchElement(
              elId,
              fillImgReplacePatch(el0, src, name || '', {
                keepLink: false,
                natW: nw,
                natH: nh,
              })
            );
          });
          finishUi();
        };
        const img = new Image();
        img.onload = () =>
          applyReplace(img.naturalWidth || img.width || 100, img.naturalHeight || img.height || 100);
        img.onerror = () => applyReplace(+el0.w || 100, +el0.h || 100);
        img.src = src;
        return;
      }

      const applyFirst = (nw, nh) => {
        withHistory(() => {
          const st = usePresentationStore.getState();
          const el = (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === elId);
          if (!el || el.type !== 'shape') return;
          // Insert: only the target shape — never auto-spread to neighbors.
          st.patchElement(el.id, fillImgPatchFromSrc(src, name || '', el.w, el.h, nw, nh));
        });
        finishUi();
      };
      const img = new Image();
      img.onload = () => applyFirst(img.naturalWidth || img.width || 100, img.naturalHeight || img.height || 100);
      img.onerror = () => applyFirst(+el0.w || 100, +el0.h || 100);
      img.src = src;
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
    if (mode.kind === 'slideBg' || mode.kind === 'flip' || mode.kind === 'shapeFill') {
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

  /**
   * Remember which list paragraphs the caret/selection covers (before a panel steals focus).
   * @param {string} [elId]
   */
  snapshotBulletTargetLines(elId) {
    const id = elId || useSelectionStore.getState().selId;
    const root = id ? editingTextRoot(id) || textBodyRoot(id) : null;
    const lines = root ? targetedLineIndices(root) : null;
    useUiStore.getState().setIconPickerListLines(lines && lines.length ? lines : null);
    return lines;
  },

  /**
   * Open icon picker for list markers.
   * @param {string} [elId]
   * @param {number[]|Element|null} [markerOrLines] clicked marker node, or explicit line indices
   */
  openBulletIconPicker(elId, markerOrLines = null) {
    const id = elId || useSelectionStore.getState().selId;
    if (id) pick(id);
    const root = id ? editingTextRoot(id) || textBodyRoot(id) : null;
    // Snapshot selection first — marker pointerdown may collapse the caret next.
    const selLines = root ? targetedLineIndices(root) : null;
    let lines = null;
    if (Array.isArray(markerOrLines)) {
      lines = markerOrLines.filter((i) => Number.isFinite(+i)).map((i) => +i);
    } else if (markerOrLines && markerOrLines.nodeType === 1 && root) {
      const clicked = lineIndexOfNode(root, markerOrLines);
      if (selLines && selLines.length > 1) {
        lines = selLines.includes(clicked)
          ? selLines
          : [...new Set([...selLines, clicked])].sort((a, b) => a - b);
      } else {
        lines = [clicked];
      }
    } else if (root) {
      lines = selLines;
    }
    useUiStore.getState().setIconPickerForList(id || null);
    useUiStore.getState().setIconPickerListLines(lines && lines.length ? lines : null);
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

  startSection(index) {
    const st = usePresentationStore.getState();
    const i = index != null ? index : st.cur;
    withHistory(() => {
      const slides = cloneSlides(usePresentationStore.getState().slides);
      applyStartSection(slides, i, ru());
      usePresentationStore.getState().replaceSlides(slides);
    });
  },

  renameSection(index, title) {
    const st = usePresentationStore.getState();
    const i = index != null ? index : st.cur;
    withHistory(() => {
      const slides = cloneSlides(usePresentationStore.getState().slides);
      applyRenameSection(slides, i, title);
      usePresentationStore.getState().replaceSlides(slides);
    });
  },

  removeSection(index) {
    const st = usePresentationStore.getState();
    const i = index != null ? index : st.cur;
    withHistory(() => {
      const slides = cloneSlides(usePresentationStore.getState().slides);
      applyRemoveSection(slides, i);
      usePresentationStore.getState().replaceSlides(slides);
    });
  },

  toggleSectionCollapsed(index) {
    const st = usePresentationStore.getState();
    const i = index != null ? index : st.cur;
    const slides = cloneSlides(st.slides);
    applyToggleSectionCollapsed(slides, i);
    st.replaceSlides(slides);
  },

  pickSection(index) {
    const st = usePresentationStore.getState();
    const i = index != null ? index : st.cur;
    const sec = sectionContaining(st.slides, i, ru());
    pick(null);
    if (!sec || sec.count <= 1) {
      st.pickSlideWithMod(i, null);
      return;
    }
    const slideMultiSel = [];
    for (let j = sec.start; j < sec.end; j++) slideMultiSel.push(j);
    usePresentationStore.setState({ slideMultiSel, cur: i, slideSelAnchor: sec.start });
  },

  toggleSlideHidden(index) {
    const { cur, slides, patchSlide } = usePresentationStore.getState();
    const i = index != null ? index : cur;
    const slide = slides[i];
    if (!slide) return;
    withHistory(() => patchSlide(i, { hidden: !slide.hidden }));
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
    const schemeRef = modifiers.schemeRef === undefined ? null : modifiers.schemeRef;
    const channel = resolveColorChannel(modifiers, mode);
    let targets = selectedColorTargets();
    if (!targets.length) {
      if (channel === 'fill') {
        withHistory(() => {
          const { cur, patchSlide } = usePresentationStore.getState();
          patchSlide(cur, { bgc: color, bg: 'custom', bgScheme: schemeRef });
        });
      }
      return;
    }
    if (channel === 'text') {
      const live = currentEl();
      if (live && targets.some((t) => String(t.id) === String(live.id))) {
        if (live.type === 'text' || live.type === 'formula' || live.type === 'table') {
          const root = live.type === 'table' ? editingTableCell(live)?.root : editingTextRoot(live.id);
          if (root && hasNonCollapsedSelection(root)) {
            editorApi.applyTextInline({ color, schemeRef });
            targets = targets.filter((t) => String(t.id) !== String(live.id));
            if (!targets.length) return;
          }
        }
      }
    }
    const graphIds = [];
    withHistory(() => {
      const st = usePresentationStore.getState();
      targets.forEach((el) => {
        const patch = colorPatchForEl(el, channel, color, schemeRef);
        if (patch && Object.keys(patch).length) {
          st.patchElement(el.id, patch);
          if (el.type === 'graph' && patch.graphColor != null) graphIds.push(String(el.id));
        }
      });
    });
    if (graphIds.length) void rebuildGraphElementsByIds(graphIds);
  },

  clearColor(modifiers = {}) {
    const targets = selectedColorTargets();
    if (!targets.length) {
      editorApi.resetSlideBg();
      return;
    }
    const mode = usePresentationStore.getState().colorMode;
    const channel = resolveColorChannel(modifiers, mode);
    withHistory(() => {
      const st = usePresentationStore.getState();
      const graphIds = [];
      targets.forEach((el) => {
        if (channel === 'stroke') {
          if (el.type === 'shape') st.patchElement(el.id, { stroke: 'transparent', sw: 0, strokeScheme: null });
          else if (el.type === 'text' || el.type === 'markdown') {
            st.patchElement(el.id, { textBorderW: 0, textBorderColorScheme: null });
          } else if (el.type === 'image') {
            st.patchElement(el.id, { imgBw: 0, imgBcScheme: null });
          } else if (el.type === 'table') {
            st.patchElement(el.id, tableColorPatch(el, 'stroke', 'transparent', null));
          } else if (el.type === 'graph') {
            st.patchElement(el.id, { graphColor: '#ffffff', graphColorScheme: null });
            graphIds.push(String(el.id));
          }
          return;
        }
        if (channel === 'text') {
          if (el.type === 'shape') {
            st.patchElement(el.id, {
              shapeTextCss: withShapeTextColor(el.shapeTextCss || DEFAULT_SHAPE_TEXT_CSS, '#ffffff'),
              textColor: '#ffffff',
              textColorScheme: null,
            });
          } else if (el.type === 'table') {
            st.patchElement(el.id, tableColorPatch(el, 'text', '#ffffff', null));
          } else if (el.type === 'graph') {
            st.patchElement(el.id, { graphColor: '#ffffff', graphColorScheme: null });
            graphIds.push(String(el.id));
          } else {
            const patch = colorPatchForEl(el, 'text', '#ffffff', null);
            if (patch) st.patchElement(el.id, patch);
          }
          return;
        }
        if (el.type === 'shape') {
          if (shapeIsLineLike(el)) st.patchElement(el.id, { stroke: 'transparent', sw: 0, strokeScheme: null });
          else st.patchElement(el.id, { fill: 'none', fillScheme: null });
        } else if (el.type === 'text' || el.type === 'markdown') {
          st.patchElement(el.id, { textBg: '', textBgScheme: null });
        } else if (el.type === 'icon') {
          st.patchElement(el.id, { iconColor: '#6366f1', iconColorScheme: null, iconColorCustom: true });
        } else if (el.type === 'lego') {
          st.patchElement(el.id, { legoColor: null, legoColorScheme: null });
        } else if (el.type === 'table') {
          st.patchElement(el.id, tableColorPatch(el, 'fill', '', null));
        } else if (el.type === 'formula') {
          st.patchElement(el.id, { formulaColor: '#ffffff', formulaColorScheme: null, textColor: '#ffffff' });
        } else if (el.type === 'graph') {
          st.patchElement(el.id, { graphColor: '#ffffff', graphColorScheme: null });
          graphIds.push(String(el.id));
        }
      });
      if (graphIds.length) void rebuildGraphElementsByIds(graphIds);
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
    const graphIds = [];
    withHistory(() => {
      bustThumbCaches();
      usePresentationStore.getState().applyTheme(theme, idx);
      rebuildDecorForAppliedTheme();
      const pn = usePresentationStore.getState().pnSettings;
      if (pn?.enabled) editorApi.applyPageNumbers(pn);
      (usePresentationStore.getState().slides || []).forEach((s) => {
        (s?.els || []).forEach((el) => {
          if (el && el.type === 'graph') graphIds.push(String(el.id));
        });
      });
    });
    if (graphIds.length) void rebuildGraphElementsByIds(graphIds);
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
      idx = meta && meta._layoutIdx != null ? meta._layoutIdx : -1;
    }
    // Do not silently fall back to Prism — user must pick a decor theme first.
    if (idx == null || idx < 0) {
      useUiStore.getState().showToast(
        ru() ? 'Сначала выберите тему оформления' : 'Pick a decor theme first',
        'warn'
      );
      return;
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
    const st = usePresentationStore.getState();
    const { cur, slides, layoutIdx } = st;
    const decor = (slides[cur]?.els || []).find((d) => d && d._isDecor);
    if (!decor) return;
    withHistory(() => {
      const store = usePresentationStore.getState();
      // Keep the current decor family (e.g. Cosmos) so clearing a slide does not
      // fall back to Prism in the template picker.
      if (
        (layoutIdx == null || layoutIdx < 0) &&
        decor._layoutIdx != null &&
        decor._layoutIdx >= 0
      ) {
        store.setLayoutIdx(decor._layoutIdx);
      }
      store.replaceSlideDecor(cur, null);
    });
  },

  applySlideStyleToAll() {
    const st = usePresentationStore.getState();
    const src = st.slides[st.cur];
    if (!src) return;
    const srcDecor = (src.els || []).find((d) => d && d._isDecor) || null;
    // Keep the decor family (Matrix / Cosmos / …) even when the source slide
    // uses the empty "X" template — otherwise apply-to-all wipes layoutIdx and
    // the variant strip disappears for every slide.
    const keptLayoutIdx =
      srcDecor && srcDecor._layoutIdx != null && srcDecor._layoutIdx >= 0
        ? srcDecor._layoutIdx | 0
        : st.layoutIdx != null && st.layoutIdx >= 0
          ? st.layoutIdx | 0
          : -1;
    const decorTpl = srcDecor
      ? {
          layoutIdx: srcDecor._layoutIdx,
          style: srcDecor._decorStyle || 'content',
          mirror: !!srcDecor._decorMirror,
        }
      : null;
    withHistory(() => {
      const store = usePresentationStore.getState();
      if (keptLayoutIdx >= 0 && (store.layoutIdx == null || store.layoutIdx < 0)) {
        store.setLayoutIdx(keptLayoutIdx);
      }
      const builders = store.slides.map((_, si) =>
        decorTpl ? makeDecorEl(si, decorTpl.layoutIdx, decorTpl.style, decorTpl.mirror) : null
      );
      store.applySlideStyleFrom(store.cur, builders, keptLayoutIdx);
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
    patchSelectedEls((el) => opacityPatchForEl(el, v));
  },

  setStrokeWidth(v) {
    patchSelectedEls((el) => strokeWidthPatchForEl(el, v));
  },

  setBlur(v) {
    patchSelectedEls((el) => blurPatchForEl(el, v));
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
          iconColorScheme: { col: 0, row: 4 },
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
      if (el.type === 'table') {
        patchLiveTableCell(el, htmlFromEditable(root));
        return;
      }
      patchRichText(el, { html: htmlFromEditable(root), text: plainFromEditable(root) });
    }
  },

  /** Save caret before symbols modal steals focus; restore on insert. */
  _symbolsSel: null,

  restoreSymbolsCaret() {
    const saved = editorApi._symbolsSel;
    if (!saved?.elId) return;
    requestAnimationFrame(() => {
      const root =
        document.querySelector(`[data-id="${saved.elId}"] .react-text-body[contenteditable="true"]`) ||
        document.querySelector(`[data-id="${saved.elId}"] [contenteditable="true"]`);
      if (!root) return;
      try {
        root.focus({ preventScroll: true });
      } catch (e) {}
      const sel = window.getSelection();
      if (saved.range) {
        try {
          sel.removeAllRanges();
          sel.addRange(saved.range);
          return;
        } catch (e) {}
      }
      try {
        const range = document.createRange();
        range.selectNodeContents(root);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {}
    });
  },

  openSymbolsModal() {
    const el = currentEl();
    const root = el ? liveEditableRoot(el) || textBodyRoot(el.id) : null;
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    if (root && sel && sel.rangeCount && root.contains(sel.anchorNode)) {
      try {
        editorApi._symbolsSel = {
          elId: el.id,
          range: sel.getRangeAt(0).cloneRange(),
        };
      } catch (e) {
        editorApi._symbolsSel = { elId: el?.id, range: null };
      }
    } else if (el && (el.type === 'text' || el.type === 'shape' || el.type === 'table')) {
      editorApi._symbolsSel = { elId: el.id, range: null };
      if (el.type === 'text' || el.type === 'shape') {
        useUiStore.getState().requestInlineEdit(el.id);
      }
    } else {
      editorApi._symbolsSel = null;
    }
    useUiStore.getState().openSymbolsModal();
  },

  insertSpecialSymbol(ch) {
    if (!ch) return;
    const saved = editorApi._symbolsSel;
    const el = currentEl() || (saved?.elId
      ? (usePresentationStore.getState().slides[usePresentationStore.getState().cur]?.els || []).find(
          (x) => x && String(x.id) === String(saved.elId)
        )
      : null);
    if (!el) return;
    let root = liveEditableRoot(el) || textBodyRoot(el.id);
    if (root && !root.isContentEditable) {
      useUiStore.getState().requestInlineEdit(el.id);
      // Wait a frame for contentEditable to mount.
      requestAnimationFrame(() => editorApi.insertSpecialSymbol(ch));
      return;
    }
    root = liveEditableRoot(el) || textBodyRoot(el.id);
    if (!root) return;
    try {
      root.focus({ preventScroll: true });
    } catch (e) {}
    const sel = window.getSelection();
    if (saved?.range && root.contains(saved.range.startContainer)) {
      try {
        sel.removeAllRanges();
        sel.addRange(saved.range);
      } catch (e) {}
    } else if (!sel.rangeCount || !root.contains(sel.anchorNode)) {
      try {
        const range = document.createRange();
        range.selectNodeContents(root);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {}
    }
    try {
      document.execCommand('insertText', false, ch);
    } catch (e) {
      try {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(ch));
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (err) {}
    }
    try {
      if (sel.rangeCount) {
        editorApi._symbolsSel = { elId: el.id, range: sel.getRangeAt(0).cloneRange() };
      }
    } catch (e) {}
    if (el.type === 'table') {
      patchLiveTableCell(el, htmlFromEditable(root));
      return;
    }
    if (el.type === 'shape') {
      withHistory(() =>
        usePresentationStore.getState().patchElement(el.id, {
          shapeHtml: htmlFromEditable(root),
        })
      );
      return;
    }
    patchRichText(el, { html: htmlFromEditable(root), text: plainFromEditable(root) });
  },

  cycleTextUnderline() {
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'table' && el.type !== 'shape')) return;
    const cs0 = fmtCsOf(el);
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const editing = !!(active?.isContentEditable && active.closest?.(`[data-id="${el.id}"]`));
    const selOn = !!(editing && hasNonCollapsedSelection(active));
    // Caret inside an inline <a>: cycle underline on the link itself (incl. remove).
    if (editing && active && !selOn) {
      const sel = window.getSelection?.();
      const node = sel?.anchorNode;
      const startEl = node?.nodeType === 1 ? node : node?.parentElement;
      const linkA = startEl?.closest?.('a[href]');
      if (linkA && active.contains(linkA)) {
        const curUl = readUnderlineFromNode(linkA, active);
        // Bare <a> without data-ul still draws dashed via CSS — treat as dashed for the cycle.
        const effective =
          curUl === 'none' && linkA.getAttribute('data-ul') == null ? 'underline dashed' : curUl;
        setElementUnderline(linkA, nextUnderline(effective));
        saveFmtHtml(el, htmlFromEditable(active));
        editorApi.syncCaretLink();
        return;
      }
    }
    const liveHtml = editing ? htmlFromEditable(active) : fmtHtmlOf(el);
    const inlineKind = uniformUnderlineInHtml(liveHtml);
    const inlineCs =
      inlineKind && inlineKind !== 'none' ? `text-decoration:${inlineKind}` : '';
    const cur = editing
      ? detectUnderlineFromEditable(active, inlineCs || cs0)
      : inlineKind && inlineKind !== 'none'
        ? inlineKind
        : parseUnderlineFromCs(cs0);
    const next = nextUnderline(cur);
    if (selOn) {
      // Restyle the selection cleanly instead of stacking. Because we move the box's
      // decoration onto the selected run, clear element-level underline/strike so the
      // wrapper can't draw a second line underneath the new inline span.
      const savedSel = captureSelectionOffsets(active);
      let applied = false;
      let usedNextCs = cs0;
      try {
        applied = applyUnderlineToSelection(next, active, hasStrikeInCs(cs0));
      } catch (e) {}
      if (applied) {
        usedNextCs = stripUnderlineFromCs(usedNextCs);
        usedNextCs = stripStrikeFromCs(usedNextCs);
        const html = unnestUnderlinesInHtml(htmlFromEditable(active));
        try {
          if (html !== active.innerHTML) active.innerHTML = html;
        } catch (e) {}
        restoreSelectionOffsets(active, savedSel);
        if (el.type === 'table') {
          saveFmtHtml(el, html);
          return;
        }
        patchRichText(el, { html, text: plainFromEditable(active), cs: usedNextCs });
        restoreSelectionOffsets(active, savedSel);
        return;
      }
    }
    if (el.type === 'table') {
      const html = htmlFromEditable(active) || readLiveTextHtml(el);
      const curUl = editing ? detectUnderlineFromEditable(active, '') : tableHtmlUnderline(html);
      const nextUl = nextUnderline(curUl);
      const cleaned = stripUnderlineFromHtml(html);
      saveFmtHtml(el, nextUl === 'none' ? cleaned : underlineWrapHtml(cleaned, nextUl));
      return;
    }
    // Mixed colors: the line lives on each colored run. Box CSS would paint one color,
    // and after the first press cs is cleared — keep cycling the inline kind in the editor.
    if (editing && active && htmlHasInlineColor(htmlFromEditable(active))) {
      const cleaned = stripUnderlineFromHtml(htmlFromEditable(active));
      let nextHtml = next === 'none' ? cleaned : underlineWrapHtml(cleaned, next);
      nextHtml = unnestUnderlinesInHtml(syncInlineUnderlineColors(nextHtml));
      const savedSel = captureSelectionOffsets(active);
      try {
        active.innerHTML = nextHtml;
      } catch (e) {}
      restoreSelectionOffsets(active, savedSel);
      patchRichText(el, {
        html: nextHtml,
        text: plainFromEditable(active),
        cs: stripUnderlineFromCs(cs0),
      });
      restoreSelectionOffsets(active, savedSel);
      return;
    }
    // Whole-box path: strip any leftover inline underline from html first so repeated
    // presses cycle cleanly off the box-level cs instead of stacking lines.
    patchRichText(el, {
      html: stripUnderlineFromHtml(fmtHtmlOf(el)),
      cs: applyUnderlineToCs(cs0, next),
    });
  },

  /** Strikethrough is a simple on/off toggle (unlike underline's style cycle), and combines
   *  with whatever underline is currently active — see textUnderline.js. */
  toggleTextStrike() {
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'table' && el.type !== 'shape')) return;
    const cs0 = fmtCsOf(el);
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const editing = !!(active?.isContentEditable && active.closest?.(`[data-id="${el.id}"]`));
    const selOn = !!(editing && hasNonCollapsedSelection(active));
    if (selOn) {
      // Determine current strike from BOTH the inline content and the element-level cs
      // marker, BEFORE mutating the DOM. Then apply the opposite to the selection and
      // clear the box-level marker so the wrapper can't double-draw.
      let alreadyStruck = false;
      try {
        alreadyStruck = detectStrikeFromEditable(active, cs0);
      } catch (e) {
        alreadyStruck = hasStrikeInCs(cs0);
      }
      let applied = false;
      let usedNextCs = cs0;
      try {
        applied = applyStrikeToSelection(!alreadyStruck, active);
      } catch (e) {}
      if (applied) {
        usedNextCs = stripUnderlineFromCs(usedNextCs);
        usedNextCs = stripStrikeFromCs(usedNextCs);
        if (el.type === 'table') {
          saveFmtHtml(el, htmlFromEditable(active));
          return;
        }
        patchRichText(el, {
          html: htmlFromEditable(active),
          text: plainFromEditable(active),
          cs: usedNextCs,
        });
        return;
      }
    }
    if (el.type === 'table') {
      const html = htmlFromEditable(active) || readLiveTextHtml(el);
      const curStruck = hasStrikeInHtml(html);
      saveFmtHtml(el, curStruck ? stripStrikeFromHtml(html) : `<span style="text-decoration:line-through">${html}</span>`);
      return;
    }
    // Whole-box path: consider BOTH the cs marker and any inline strike in html. When
    // turning it off, strip the inline strike too so the line reliably clears.
    const html0 = fmtHtmlOf(el);
    const curStruck = hasStrikeInCs(cs0) || hasStrikeInHtml(html0);
    patchRichText(el, {
      html: curStruck ? stripStrikeFromHtml(html0) : html0,
      cs: applyStrikeToCs(cs0, !curStruck),
    });
  },

  toggleTextStress() {
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'table' && el.type !== 'shape')) {
      useUiStore.getState().showToast(ru() ? 'Выберите текст' : 'Select text', 'warn');
      return;
    }
    const root = liveEditableRoot(el);
    if (root) {
      const html = toggleStressInEditable(root);
      if (html == null) return;
      saveFmtHtml(el, html);
      return;
    }
    if (el.type === 'table') {
      saveFmtHtml(el, toggleStressInHtml(readLiveTextHtml(el)));
      return;
    }
    const next = toggleStressInHtml(fmtHtmlOf(el) || el.text || '');
    patchRichText(el, { html: next });
  },

  toggleTextScript(kind) {
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'table' && el.type !== 'shape')) {
      useUiStore.getState().showToast(ru() ? 'Выберите текст' : 'Select text', 'warn');
      return;
    }
    const mode = kind === 'sub' ? 'sub' : 'super';
    const root = liveEditableRoot(el);
    if (root) {
      const html = toggleScriptInEditable(root, mode);
      if (html == null) return;
      saveFmtHtml(el, html);
      return;
    }
    if (el.type === 'table') {
      saveFmtHtml(el, toggleScriptInHtml(readLiveTextHtml(el), mode));
      return;
    }
    const next = toggleScriptInHtml(fmtHtmlOf(el) || el.text || '', mode);
    patchRichText(el, { html: next });
  },

  toggleBulletList() {
    if (!iconsReady()) {
      ensureIcons().then(() => editorApi.toggleBulletList());
      return;
    }
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'table' && el.type !== 'shape')) {
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
    if (!el || (el.type !== 'text' && el.type !== 'shape')) {
      useUiStore.getState().showToast(ru() ? 'Выберите текст' : 'Select text', 'warn');
      return;
    }
    const id = iconId || '';
    const live = editingTextRoot(el.id) || textBodyRoot(el.id);
    const stored = useUiStore.getState().iconPickerListLines;
    const indices =
      stored && stored.length
        ? stored
        : live
          ? targetedLineIndices(live)
          : null;
    const opts = {
      mode: 'icon',
      iconId: id,
      color: el.bulletIconColor || el.textColor || 'currentColor',
      sw: el.bulletIconSw != null ? el.bulletIconSw : 1.8,
      fillOp: 0,
    };
    let html = null;
    if (live && htmlHasList(live.innerHTML || '', 'bullet')) {
      html = updateLiveBulletMarkers(live, opts, indices);
    }
    if (html == null) {
      html = readLiveTextHtml(el);
      if (htmlHasList(html, 'bullet')) html = reapplyBulletMarkers(html, opts, indices);
    }
    useUiStore.getState().setIconPickerListLines(null);
    patchTextHtml(el, html, { bulletIconId: id || null }, indices && indices.length === 1 ? indices[0] : null);
  },

  setBulletColor(color, schemeRef) {
    if (!iconsReady()) {
      ensureIcons().then(() => editorApi.setBulletColor(color, schemeRef));
      return;
    }
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'shape')) return;
    const c = color || el.textColor || 'currentColor';
    const live = editingTextRoot(el.id) || textBodyRoot(el.id);
    const stored = useUiStore.getState().iconPickerListLines;
    const indices =
      stored && stored.length
        ? stored
        : live
          ? targetedLineIndices(live)
          : null;
    const opts = {
      mode: 'color',
      iconId: el.bulletIconId || DEFAULT_BULLET_ICON_ID,
      color: c,
      sw: el.bulletIconSw != null ? el.bulletIconSw : 1.8,
      fillOp: 0,
    };
    let html = null;
    if (live && htmlHasList(live.innerHTML || '', 'bullet')) {
      html = updateLiveBulletMarkers(live, opts, indices);
    }
    if (html == null) {
      html = readLiveTextHtml(el);
      if (htmlHasList(html, 'bullet')) html = reapplyBulletMarkers(html, opts, indices);
    }
    useUiStore.getState().setIconPickerListLines(null);
    patchTextHtml(
      el,
      html,
      {
        bulletIconColor: color || '',
        bulletIconScheme: schemeRef || null,
      },
      indices && indices.length === 1 ? indices[0] : null
    );
  },

  setBulletGap(px) {
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'shape')) return;
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
    if (!el || (el.type !== 'text' && el.type !== 'table' && el.type !== 'shape')) {
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
    if (!el || (el.type !== 'text' && el.type !== 'table' && el.type !== 'shape')) return false;
    return htmlHasList(readLiveTextHtml(el), listType);
  },

  setTextFont(family) {
    editorApi.applyTextInline({ fontFamily: family });
  },

  /**
   * Grow/shrink font size. Step = floor(size/10) so 10→±1, 20→±2, 30→±3…
   * Multi-select: each text box / inline run moves by its own step (sizes stay different).
   * Object selected: box cs AND every inline font-size in html are nudged.
   * @param {1|-1} dir
   */
  nudgeTextFontSize(dir) {
    const sign = dir < 0 ? -1 : 1;
    const el = currentEl();
    if (el?.type === 'table') return;

    // Prefer focused editable; fall back to any live contentEditable on the element
    // (toolbar mousedown can briefly move focus even when selection is kept).
    const root = el && isRichTextEl(el) ? liveEditableRoot(el) : null;
    if (root && hasNonCollapsedSelection(root)) {
      // Change sizes in-place and keep the selection (do not rewrite root.innerHTML).
      const offsets = nudgeFontSizesInSelection(root, sign);
      const html = htmlFromEditable(root);
      const text = plainFromEditable(root);
      // Patch store without nested history / without touching the live DOM again.
      withHistory(() => {
        const data =
          el.type === 'shape'
            ? { shapeHtml: html }
            : { html, text };
        usePresentationStore.getState().patchElement(el.id, data);
      });
      if (offsets) {
        const { start, end } = offsets;
        restoreTextSelection(root, start, end);
        // After React commits the store patch, restore again so the highlight sticks.
        requestAnimationFrame(() => {
          restoreTextSelection(root, start, end);
          requestAnimationFrame(() => restoreTextSelection(root, start, end));
        });
      }
      return;
    }

    const targets = selectedColorTargets().filter(isRichTextEl);
    if (!targets.length && isRichTextEl(el)) targets.push(el);
    if (!targets.length) return;

    withHistory(() => {
      const st = usePresentationStore.getState();
      targets.forEach((t0) => {
        // Fresh copy from store (not a stale selection snapshot).
        const t =
          (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === String(t0.id)) || t0;
        let cs = fmtCsOf(t);
        const fs =
          Math.round(parseFloat((cs.match(/font-size\s*:\s*([\d.]+)/i) || [])[1]) || 0) || 24;
        const next = clampFontSizePx(fs + sign * fontSizeNudgeStep(fs));
        cs = applyCsProp(cs, 'font-size', `${next}px`);
        // Prefer live DOM html (has the latest inline sizes) over possibly-stale store.
        const srcHtml = readLiveTextHtml(t) || fmtHtmlOf(t) || '';
        const html = srcHtml ? nudgeInlineFontSizes(srcHtml, sign) : '';
        const data =
          t.type === 'shape'
            ? { shapeTextCss: cs, ...(html ? { shapeHtml: html } : null) }
            : {
                cs,
                ...(html
                  ? { html, text: String(html).replace(/<[^>]+>/g, '') }
                  : null),
              };
        st.patchElement(t.id, data);
      });
    });
  },

  /**
   * Size / color / font: selection when editing, otherwise the whole text box.
   * @param {{ fontSize?: number, color?: string, schemeRef?: object|null, fontFamily?: string }} patch
   */
  applyTextInline(patch = {}) {
    const el = currentEl();
    if (el?.type === 'table') {
      editorApi.applyTableTextInline(patch);
      return;
    }
    if (!el || (el.type !== 'text' && el.type !== 'formula' && el.type !== 'shape')) return;
    const root = editingTextRoot(el.id);
    const selOn = !!(root && hasNonCollapsedSelection(root));
    if (selOn) {
      if (patch.color) execOnSelection('foreColor', patch.color);
      if (patch.fontFamily) execOnSelection('fontName', patch.fontFamily);
      if (patch.fontSize != null) applyCssToSelection({ fontSize: `${patch.fontSize}px` });
      let html = htmlFromEditable(root);
      // Recolor underline to match newly colored runs (parent wavy line stays black otherwise)
      if (patch.color) {
        const synced = syncInlineUnderlineColors(html);
        if (synced !== html) {
          html = synced;
          try {
            root.innerHTML = html;
          } catch (e) {}
        }
      }
      patchRichText(el, { html, text: plainFromEditable(root) });
      return;
    }
    let cs = fmtCsOf(el);
    const extra = {};
    if (patch.fontSize != null) {
      cs = applyCsProp(cs, 'font-size', `${patch.fontSize}px`);
      // Block selected, not editing: one size for the whole text.
      if (!root) {
        const srcHtml = fmtHtmlOf(el);
        if (srcHtml) extra.html = stripInlineFontSizes(srcHtml);
      }
    }
    if (patch.fontFamily != null) {
      cs = applyFontFamily(cs, patch.fontFamily);
    }
    if (patch.color != null) {
      cs = applyCsProp(cs, 'color', patch.color);
      extra.textColor = patch.color;
      extra.textColorScheme = patch.schemeRef === undefined ? el.textColorScheme : patch.schemeRef;
      // Pass the box's PREVIOUS color so words deliberately highlighted in a different
      // color keep their own color/scheme mark instead of being wiped to the new scheme color.
      const srcHtml = fmtHtmlOf(el);
      if (srcHtml) {
        extra.html = stripInlineTextColors(srcHtml, el.textColor || parseCsColor(fmtCsOf(el)));
      }
    }
    const extraOut = {};
    if (extra.textColor !== undefined) extraOut.textColor = extra.textColor;
    if (extra.textColorScheme !== undefined) extraOut.textColorScheme = extra.textColorScheme;
    let htmlOut = extra.html;
    if (patch.fontSize != null && !root && fmtHtmlOf(el)) {
      htmlOut = stripInlineFontSizes(htmlOut != null ? htmlOut : fmtHtmlOf(el));
    }
    patchRichText(
      el,
      htmlOut !== undefined ? { html: htmlOut, cs, extra: extraOut } : { cs, extra: extraOut }
    );
  },

  applyTableTextInline(patch = {}) {
    const el = currentEl();
    if (!el || el.type !== 'table') return;
    const hit = editingTableCell(el);
    const selOn = !!(hit?.root && hasNonCollapsedSelection(hit.root));
    if (selOn) {
      if (patch.color) execOnSelection('foreColor', patch.color);
      if (patch.fontFamily) execOnSelection('fontName', patch.fontFamily);
      if (patch.fontSize != null) applyCssToSelection({ fontSize: `${patch.fontSize}px` });
      let html = htmlFromEditable(hit.root);
      if (patch.color) {
        const synced = syncInlineUnderlineColors(html);
        if (synced !== html) {
          html = synced;
          try {
            hit.root.innerHTML = html;
          } catch (e) {}
        }
      }
      patchLiveTableCell(el, html);
      return;
    }
    const keys = new Set(selectedTableKeys(el).map((k) => `${+k.r}:${+k.c}`));
    if (hit) keys.add(`${hit.r}:${hit.c}`);
    if (!keys.size) return;
    const liveHtml = hit?.root ? htmlFromEditable(hit.root) : null;
    const cells = mapTableCells(el, (cell, rr, cc) => {
      if (!keys.has(`${rr}:${cc}`) || cell.hidden) return { ...cell, r: rr, c: cc };
      const next = { ...cell, r: rr, c: cc };
      if (patch.fontSize != null) next.fs = +patch.fontSize;
      if (patch.fontFamily != null) next.ff = patch.fontFamily;
      if (patch.color != null) {
        next.textColor = patch.color;
        if (patch.schemeRef === undefined) {
          /* keep existing scheme */
        } else if (patch.schemeRef == null) {
          delete next.textColorScheme;
        } else {
          next.textColorScheme = patch.schemeRef;
        }
        const src = hit && hit.r === rr && hit.c === cc && liveHtml != null ? liveHtml : next.html;
        next.html = stripInlineTextColors(src || '', cell.textColor);
      }
      return next;
    });
    if (hit?.root) {
      const updated = cells.find((c) => c.r === hit.r && c.c === hit.c);
      if (updated && updated.html != null && hit.root.innerHTML !== updated.html) {
        try {
          hit.root.innerHTML = updated.html;
        } catch (e) {}
      }
    }
    withHistory(() => usePresentationStore.getState().patchElement(el.id, { cells }));
  },

  setTextBold(on) {
    const el = currentEl();
    if (el?.type === 'table') {
      editorApi.patchSelectedTableCells({ fw: on ? 700 : 400 });
      return;
    }
    if (!isRichTextEl(el)) return;
    patchRichText(el, { cs: applyCsProp(fmtCsOf(el), 'font-weight', on ? '700' : '400') });
  },

  setTextRole(role) {
    const el = currentEl();
    if (!el || el.type !== 'text') return;
    const next = role === 'heading' ? 'heading' : 'body';
    let cs = el.cs || '';
    cs = applyCsProp(cs, 'text-transform', next === 'heading' ? 'uppercase' : null);
    cs = applyCsProp(cs, 'font-weight', next === 'heading' ? '700' : '400');
    // Heading styling is caps + bold — it shouldn't also silently bump the font size up to
    // 48px. The person's chosen size stays whatever it already was.
    const patch = { textRole: next, cs };
    if (next === 'heading') patch.valign = 'middle';
    withHistory(() => usePresentationStore.getState().patchElement(el.id, patch));
  },

  setTextItalic(on) {
    const el = currentEl();
    if (el?.type === 'table') {
      editorApi.patchSelectedTableCells({ fst: on ? 'italic' : 'normal' });
      return;
    }
    if (!isRichTextEl(el)) return;
    patchRichText(el, { cs: applyCsProp(fmtCsOf(el), 'font-style', on ? 'italic' : 'normal') });
  },

  toggleTextStyle(kind) {
    const el = currentEl();
    if (!el || (el.type !== 'text' && el.type !== 'table' && el.type !== 'shape')) return;
    const active = document.activeElement;
    if (active?.isContentEditable && active.closest(`[data-id="${el.id}"]`)) {
      const map = { bold: 'bold', italic: 'italic', underline: 'underline' };
      if (map[kind]) editorApi.formatText(map[kind]);
      return;
    }
    const cs = el.type === 'table' ? tableCellFmtCs(el) : fmtCsOf(el);
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
      const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
      const tc = tableThemeColors(theme);
      const fallback = altBgFromHeader(el.headerBg) || hexWithAlpha(tc.ac1, '12');
      withHistory(() =>
        usePresentationStore.getState().patchElement(el.id, {
          altBg: fallback,
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

  /** Internal TSV clipboard for table cell copy/paste (also written to system clipboard). */
  _tableCellClipboard: '',

  /** Copy selected table cells as TSV (Excel-friendly). */
  copySelectedTableCells() {
    const el = currentEl();
    const st = useSelectionStore.getState();
    const sel = st.tableCell;
    if (!el || el.type !== 'table' || !sel || String(sel.elId) !== String(el.id)) {
      useUiStore.getState().showToast(ru() ? 'Выберите ячейки' : 'Select cells');
      return false;
    }
    const keys = (st.tableCellSel || []).length ? st.tableCellSel : [{ r: sel.r, c: sel.c }];
    const rs = keys.map((k) => +k.r);
    const cs = keys.map((k) => +k.c);
    const minR = Math.min(...rs);
    const maxR = Math.max(...rs);
    const minC = Math.min(...cs);
    const maxC = Math.max(...cs);
    const lines = [];
    const tmp = typeof document !== 'undefined' ? document.createElement('div') : null;
    for (let r = minR; r <= maxR; r++) {
      const row = [];
      for (let c = minC; c <= maxC; c++) {
        const cell = getTableCell(el, r, c);
        let plain = '';
        if (tmp) {
          tmp.innerHTML = cell.html || '';
          plain = (tmp.textContent || '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
        } else {
          plain = stripCellHtml(cell.html || '');
        }
        row.push(plain);
      }
      lines.push(row.join('\t'));
    }
    const tsv = lines.join('\n');
    editorApi._tableCellClipboard = tsv;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(tsv).catch(() => {});
      }
    } catch (e) {}
    useUiStore.getState().showToast(ru() ? 'Ячейки скопированы' : 'Cells copied', 'ok');
    return true;
  },

  /** Paste TSV / plain text into the selected table cell (expands as needed). */
  async pasteIntoSelectedTableCells() {
    let text = String(editorApi._tableCellClipboard || '');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const clip = await navigator.clipboard.readText();
        if (clip != null && String(clip).length) text = String(clip);
      }
    } catch (e) {}
    text = String(text || '');
    if (!text) {
      useUiStore.getState().showToast(ru() ? 'Нечего вставлять' : 'Nothing to paste', 'warn');
      return false;
    }
    const el = currentEl();
    const sel = useSelectionStore.getState().tableCell;
    if (!el || el.type !== 'table' || !sel || String(sel.elId) !== String(el.id)) {
      return editorApi.pasteTsvOrCreateTable(text, '');
    }
    if (!text.includes('\t') && !/\r?\n/.test(text)) {
      const esc = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      editorApi.patchTableCell(el.id, sel.r, sel.c, esc);
      useUiStore.getState().showToast(ru() ? 'Вставлено' : 'Pasted', 'ok');
      return true;
    }
    return editorApi.pasteTsvOrCreateTable(text, '');
  },

  /** v7.1 `tblMerge`: merge the selected rectangle into a single cell (incl. re-merge). */
  tableMergeCells() {
    const el = currentEl();
    const st = useSelectionStore.getState();
    const sel = st.tableCell;
    if (!el || el.type !== 'table' || !sel || String(sel.elId) !== String(el.id)) {
      useUiStore.getState().showToast(ru() ? 'Выберите ячейки' : 'Select cells');
      return;
    }
    const rawKeys = (st.tableCellSel || []).length ? st.tableCellSel : [{ r: sel.r, c: sel.c }];
    const occupied = expandTableSelectionOccupied(el, rawKeys);
    if (occupied.size < 2) {
      useUiStore.getState().showToast(ru() ? 'Выделите несколько ячеек' : 'Select several cells');
      return;
    }
    const parsed = [...occupied].map((s) => {
      const [r, c] = s.split(':').map(Number);
      return { r, c };
    });
    const minR = Math.min(...parsed.map((p) => p.r));
    const maxR = Math.max(...parsed.map((p) => p.r));
    const minC = Math.min(...parsed.map((p) => p.c));
    const maxC = Math.max(...parsed.map((p) => p.c));
    const spanR = maxR - minR + 1;
    const spanC = maxC - minC + 1;
    if (occupied.size !== spanR * spanC) {
      useUiStore.getState().showToast(
        ru() ? 'Выделите прямоугольную область' : 'Select a rectangular area'
      );
      return;
    }
    // Merges that only partially overlap the box can't be re-merged cleanly.
    const rows = el.rows || 1;
    const cols = el.cols || 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = getTableCell(el, r, c);
        if (!cell || cell.hidden) continue;
        const cs = Math.max(1, +cell.colspan || 1);
        const rs = Math.max(1, +cell.rowspan || 1);
        if (cs <= 1 && rs <= 1) continue;
        const overlaps = r <= maxR && r + rs - 1 >= minR && c <= maxC && c + cs - 1 >= minC;
        if (!overlaps) continue;
        if (r < minR || c < minC || r + rs - 1 > maxR || c + cs - 1 > maxC) {
          useUiStore.getState().showToast(
            ru()
              ? 'Разъедините ячейки на границе выделения'
              : 'Unmerge cells on the selection border'
          );
          return;
        }
      }
    }
    let combined = '';
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const cell = getTableCell(el, r, c);
        if (!cell || cell.hidden) continue;
        if (cell.html) combined += (combined ? ' ' : '') + cell.html;
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
      delete next.fw;
      delete next.fst;
      delete next.borders;
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
      delete next.ff;
      delete next.fw;
      delete next.fst;
      delete next.textColor;
      delete next.textColorScheme;
      return next;
    });
    withHistory(() => usePresentationStore.getState().patchElement(el.id, { cells }));
    useUiStore.getState().showToast(ru() ? 'Форматирование сброшено' : 'Formatting reset', 'ok');
  },

  tablePaintSpec() {
    const p = useUiStore.getState().tableBorderPaint;
    const el = currentEl();
    const color = p?.color != null ? p.color : el?.borderColor || el?.stroke || '#64748b';
    const width = p?.width != null ? +p.width : el?.borderW != null ? +el.borderW : 1;
    if (p?.erase || isNoneTableColor(color) || !(width > 0)) {
      return { w: 0, color: 'transparent' };
    }
    return { w: width, color };
  },

  tableToggleBorderPaint(on) {
    const ui = useUiStore.getState();
    if (on === false || (on == null && ui.tableBorderPaint)) {
      ui.setTableBorderPaint(null);
      return;
    }
    const el = currentEl();
    const prev = ui.tableBorderPaint || {};
    let color = prev.color != null ? prev.color : el?.borderColor || el?.stroke || '';
    let width = prev.width != null ? +prev.width : el?.borderW != null ? +el.borderW : 1;
    if (isNoneTableColor(color)) color = '#3b82f680';
    if (!(width > 0)) width = 1;
    ui.setTableBorderPaint({
      color,
      width,
      erase: false,
    });
  },

  tableSetBorderPaint(patch) {
    const ui = useUiStore.getState();
    const cur = ui.tableBorderPaint || { color: '#64748b', width: 1, erase: false };
    ui.setTableBorderPaint({ ...cur, ...patch });
  },

  tablePaintBorder(id, r, c, side, opts = {}) {
    const st = usePresentationStore.getState();
    const el = (st.slides[st.cur]?.els || []).find((x) => x && String(x.id) === String(id));
    if (!el || el.type !== 'table' || !side) return false;
    const spec = this.tablePaintSpec();
    if (sameTableEdgeSpec(el, +r, +c, side, spec)) return false;
    const cells = paintTableEdgeOnCells(el, +r, +c, side, spec);
    const apply = () =>
      usePresentationStore.getState().patchElement(el.id, { cells }, { live: !!opts.live });
    if (opts.history === false) apply();
    else withHistory(apply);
    return true;
  },

  /** Apply color/width to all sides of the selected cells (pencil off). */
  tableApplySelBorders(specIn = {}, opts = {}) {
    const el = currentEl();
    if (!el || el.type !== 'table') return false;
    const st = useSelectionStore.getState();
    const sel = st.tableCell;
    if (!sel || String(sel.elId) !== String(el.id)) return false;
    const keys = (st.tableCellSel || []).length
      ? st.tableCellSel
      : [{ r: sel.r, c: sel.c }];
    if (!keys.length) return false;
    const color = specIn.color != null ? specIn.color : el.borderColor || el.stroke || '#64748b';
    let width = specIn.width != null ? +specIn.width : el.borderW != null ? +el.borderW : 1;
    if (specIn.color != null && specIn.width == null && !(width > 0) && !isNoneTableColor(color)) {
      width = 1;
    }
    const spec =
      isNoneTableColor(color) || !(width > 0) ? { w: 0, color: 'transparent' } : { w: width, color };
    const cells = paintSelectedCellBorders(el, keys, spec);
    const patch = { cells };
    if (specIn.color != null) {
      patch.borderColor = specIn.color;
      patch.stroke = specIn.color;
      if (Object.prototype.hasOwnProperty.call(specIn, 'schemeRef')) {
        patch.borderColorScheme = specIn.schemeRef || null;
      }
    }
    if (specIn.width != null) patch.borderW = +specIn.width;
    else if (spec.w > 0 && !(+el.borderW > 0)) patch.borderW = spec.w;
    const apply = () =>
      usePresentationStore.getState().patchElement(el.id, patch, { live: !!opts.live });
    if (opts.history === false) apply();
    else withHistory(apply);
    return true;
  },

  tableAddRow(opts = {}) {
    const el = currentEl();
    if (!el || el.type !== 'table') return;
    const cols = el.cols || 1;
    const oldRows = el.rows || 1;
    const sel = useSelectionStore.getState().tableCell;
    let at = oldRows;
    if (opts.before && sel && String(sel.elId) === String(el.id)) at = sel.r;
    else if (opts.after && sel && String(sel.elId) === String(el.id)) at = sel.r + 1;
    else if (opts.at != null) at = Math.max(0, Math.min(oldRows, +opts.at));
    at = Math.max(0, Math.min(oldRows, at));
    const rows = oldRows + 1;

    // Shift cells below the insert line; grow rowspans that cross it.
    const cells = [];
    for (let r = 0; r < oldRows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = getTableCell(el, r, c);
        const nr = r >= at ? r + 1 : r;
        let next = { ...cell, r: nr, c };
        if (!cell.hidden) {
          const rs = cell.rowspan || 1;
          if (rs > 1 && r < at && r + rs > at) next = { ...next, rowspan: rs + 1 };
        }
        cells.push(next);
      }
    }
    for (let c = 0; c < cols; c++) {
      let covered = false;
      for (let r = 0; r < at && !covered; r++) {
        for (let cc = 0; cc <= c; cc++) {
          const cell = getTableCell(el, r, cc);
          if (!cell || cell.hidden) continue;
          const rs = cell.rowspan || 1;
          const cs = cell.colspan || 1;
          if (rs > 1 && r + rs > at && cc + cs > c) {
            covered = true;
            break;
          }
        }
      }
      cells.push({
        r: at,
        c,
        html: '',
        align: 'left',
        valign: 'middle',
        bg: '',
        hidden: covered,
        colspan: 1,
        rowspan: 1,
      });
    }

    // Grow table height by one row — keep existing row pixel sizes.
    const oldH = Math.max(14 * oldRows, +el.h || 60);
    const base =
      Array.isArray(el.rowHeights) && el.rowHeights.length === oldRows
        ? el.rowHeights.map((f) => Math.max(0.0001, +f || 0))
        : Array(oldRows).fill(1 / oldRows);
    const sum = base.reduce((a, b) => a + b, 0) || 1;
    const norm = base.map((f) => f / sum);
    const refFr = norm[Math.min(Math.max(0, at > 0 ? at - 1 : 0), oldRows - 1)] ?? 1 / oldRows;
    const newRowPx = Math.max(14, refFr * oldH);
    const px = norm.map((f) => f * oldH);
    px.splice(at, 0, newRowPx);
    const totalPx = oldH + newRowPx;
    const newH = Math.round(totalPx);
    const rowHeights = px.map((p) => p / totalPx);
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, { rows, cells, rowHeights, h: newH })
    );
  },

  tableAddCol(opts = {}) {
    const el = currentEl();
    if (!el || el.type !== 'table') return;
    const rows = el.rows || 1;
    const oldCols = el.cols || 1;
    const sel = useSelectionStore.getState().tableCell;
    let at = oldCols;
    if (opts.before && sel && String(sel.elId) === String(el.id)) at = sel.c;
    else if (opts.after && sel && String(sel.elId) === String(el.id)) at = sel.c + 1;
    else if (opts.at != null) at = Math.max(0, Math.min(oldCols, +opts.at));
    at = Math.max(0, Math.min(oldCols, at));
    const cols = oldCols + 1;

    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < oldCols; c++) {
        const cell = getTableCell(el, r, c);
        const nc = c >= at ? c + 1 : c;
        let next = { ...cell, r, c: nc };
        if (!cell.hidden) {
          const cs = cell.colspan || 1;
          if (cs > 1 && c < at && c + cs > at) next = { ...next, colspan: cs + 1 };
        }
        cells.push(next);
      }
      let covered = false;
      for (let c = 0; c < at && !covered; c++) {
        for (let rr = 0; rr <= r; rr++) {
          const cell = getTableCell(el, rr, c);
          if (!cell || cell.hidden) continue;
          const cs = cell.colspan || 1;
          const rs = cell.rowspan || 1;
          if (cs > 1 && c + cs > at && rr + rs > r) {
            covered = true;
            break;
          }
        }
      }
      cells.push({
        r,
        c: at,
        html: '',
        align: 'left',
        valign: 'middle',
        bg: '',
        hidden: covered,
        colspan: 1,
        rowspan: 1,
      });
    }

    // Grow table width by one column — keep existing column pixel sizes.
    const oldW = Math.max(20 * oldCols, +el.w || 100);
    const base =
      Array.isArray(el.colWidths) && el.colWidths.length === oldCols
        ? el.colWidths.map((f) => Math.max(0.0001, +f || 0))
        : Array(oldCols).fill(1 / oldCols);
    const sum = base.reduce((a, b) => a + b, 0) || 1;
    const norm = base.map((f) => f / sum);
    const refFr = norm[Math.min(Math.max(0, at > 0 ? at - 1 : 0), oldCols - 1)] ?? 1 / oldCols;
    const newColPx = Math.max(20, refFr * oldW);
    const px = norm.map((f) => f * oldW);
    px.splice(at, 0, newColPx);
    const totalPx = oldW + newColPx;
    const newW = Math.round(totalPx);
    const colWidths = px.map((p) => p / totalPx);
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, { cols, cells, colWidths, w: newW })
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
    const { formulaLatexForStore } = await import('./mathjax.js');
    const { FORMULA_DEFAULT_COLOR_SCHEME } = await import('./formulaEditorData.js');

    const st = usePresentationStore.getState();
    const theme = getTheme(st.appliedThemeIdx);
    const existing =
      id != null
        ? (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === String(id))
        : null;

    // Keep \\tag in stored latex; assign next index when pasting a fresh numbered equation.
    let startTag = 1;
    if (!/\\tag\s*\{/.test(String(latex))) {
      startTag =
        (st.slides[st.cur]?.els || []).filter(
          (e) =>
            e &&
            e.type === 'formula' &&
            String(e.id) !== String(id) &&
            (/\\tag\s*\{/.test(String(e.formulaRaw || '')) ||
              /\\begin\{equation\}/.test(String(e.formulaRaw || '')))
        ).length + 1;
    }
    const storeLatex = formulaLatexForStore(latex, startTag);

    const formulaLines =
      Array.isArray(lines) && lines.length
        ? lines.map((l) => String(l || '').trim()).filter(Boolean)
        : extractFormulaLines(storeLatex);

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
      formulaRaw: storeLatex,
      formulaSvg: svg,
      formulaColor,
      formulaColorScheme: scheme,
      textColor: formulaColor,
      textColorScheme: scheme,
      html: storeLatex,
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
        cs: `font-size:40px;font-family:Georgia,serif;color:${formulaColor};text-align:left;`,
        valign: 'middle',
      })
    );
    pick(nid);
    return nid;
  },

  /** Re-bake formula SVG after align / size change. opts.silent skips undo history (import hydrate). */
  async rebakeFormulaSvg(id, opts = {}) {
    const st = usePresentationStore.getState();
    const el = (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === String(id));
    if (!el || el.type !== 'formula' || !el.formulaRaw) return;
    try {
      const { renderFormulaSvg, formulaAlignOf, latexForSvgBake, formulaSvgUsable } = await import(
        './mathjax.js'
      );
      const raw = latexForSvgBake(el.formulaRaw);
      const svg = await renderFormulaSvg(raw || el.formulaRaw, {
        displayAlign: formulaAlignOf(el),
        containerWidth: el.w || 480,
      });
      if (!formulaSvgUsable(svg)) return;
      const patch = { formulaSvg: svg };
      if (raw && raw !== el.formulaRaw) patch.formulaRaw = raw;
      const apply = () => usePresentationStore.getState().patchElement(el.id, patch);
      if (opts.silent) apply();
      else withHistory(apply);
    } catch (err) {
      console.warn('[rebakeFormulaSvg]', err);
    }
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
        const obj = parseJsonLenient(text);
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
        useUiStore
          .getState()
          .showToast(
            ru()
              ? `Ошибка JSON: ${e.message || e}`
              : `JSON error: ${e.message || e}`,
            'err'
          );
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
        commitImportedDeck(
          {
            slides: result.slides,
            title: result.title,
            canvasW: result.canvasW || canvasW,
            canvasH: result.canvasH || canvasH,
            ar: result.ar,
            cur: 0,
          },
          { skipFormatReset: true }
        );
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
        const text = await readFileTextSmart(file);
        return await editorApi.importHtmlContent(text);
      } catch (e) {
        useUiStore.getState().showToast(ru() ? 'Ошибка чтения HTML' : 'HTML read error', 'err');
        return false;
      }
    }

    // Project JSON
    if (name.endsWith('.slides.json') || ext === 'slides') {
      try {
        const data = parseJsonLenient(await readFileTextSmart(file));
        useHistoryStore.getState().clear();
        const ok = commitImportedDeck(data, { skipFormatReset: true });
        pick(null);
        useUiStore
          .getState()
          .showToast(ok ? (ru() ? 'Импортировано' : 'Imported') : ru() ? 'Неверный файл' : 'Invalid file', ok ? 'ok' : 'err');
        return ok;
      } catch (e) {
        useUiStore
          .getState()
          .showToast(ru() ? `Ошибка JSON: ${e.message || e}` : `JSON error: ${e.message || e}`, 'err');
        return false;
      }
    }

    if (ext === 'json') {
      try {
        const text = await readFileTextSmart(file);
        const obj = parseJsonLenient(text);
        const looksProject =
          obj &&
          (Array.isArray(obj.slides) ||
            (Array.isArray(obj) && obj.length && obj[0] && Array.isArray(obj[0].els)));
        if (looksProject) {
          const deck = Array.isArray(obj) ? { slides: obj, cur: 0 } : obj;
          useHistoryStore.getState().clear();
          // skipFormatReset: true — same as the .slides.json path below. Without it, this
          // went through resetImportedTextFormatting, which is meant to clean up *lossy*
          // PowerPoint/ODP imports (force every text box to the theme color, force every
          // text role to "body", and reconstruct bold/italic from HTML via a fragile
          // <div>-only regex). That's wrong for a native project export — it stripped
          // <font color> spans (color not preserved), overwrote heading roles with "body"
          // (headings stopped being headings), and the regex reconstruction left stray
          // unmatched tags showing up as literal text for markup it didn't handle (e.g.
          // <font> outside a <div>). A native deck's own HTML is already exact and should
          // just be kept as-is, whatever the file happens to be named.
          const ok = commitImportedDeck(deck, { skipFormatReset: true });
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
        useUiStore
          .getState()
          .showToast(ru() ? `Ошибка JSON: ${e.message || e}` : `JSON error: ${e.message || e}`, 'err');
        return false;
      }
    }

    // SVG markup
    if (ext === 'svg' || file.type === 'image/svg+xml') {
      try {
        const text = await readFileTextSmart(file);
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
        const text = await readFileTextSmart(file);
        if (!text || !/\bv\s+/.test(text)) {
          useUiStore.getState().showToast(ru() ? 'Не похоже на OBJ' : 'Not a valid OBJ', 'warn');
          return false;
        }
        const id = withHistory(() =>
          usePresentationStore.getState().addElement(
            model3dFieldsWithTheme({
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
      const text = await readFileTextSmart(file);
      editorApi.applyMarkdown({ mdRaw: text });
      return true;
    }

    if (isCodeFile(file)) {
      const text = await readFileTextSmart(file);
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
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
    if (!ids.length) return;
    const nids = withHistory(() => {
      const st = usePresentationStore.getState();
      const slideEls = st.slides[st.cur]?.els || [];
      const selected = ids
        .map((id) => slideEls.find((e) => e && String(e.id) === String(id)))
        .filter(Boolean);
      const gidCount = new Map();
      selected.forEach((el) => {
        if (el.groupId == null || el.groupId === '') return;
        const g = String(el.groupId);
        gidCount.set(g, (gidCount.get(g) || 0) + 1);
      });
      const groupMap = new Map();
      gidCount.forEach((n, g) => {
        if (n > 1) {
          groupMap.set(
            g,
            'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
          );
        }
      });
      const created = ids
        .map((id) => st.dupElement(id, { groupMap }))
        .filter(Boolean);
      const st2 = usePresentationStore.getState();
      const els = st2.slides[st2.cur]?.els || [];
      created.forEach((nid) => {
        const el = els.find((e) => e && String(e.id) === String(nid));
        if (!el || el.type !== 'lego') return;
        const pos = resolveLegoFreePos(el, els, st2.canvasW, st2.canvasH);
        if (pos.x !== el.x || pos.y !== el.y) {
          st2.patchElement(el.id, { x: pos.x, y: pos.y });
          el.x = pos.x;
          el.y = pos.y;
        }
      });
      return created;
    });
    if (!nids.length) return;
    if (nids.length > 1) {
      useSelectionStore.getState().setMultiSel(nids);
      useSelectionStore.getState().setSelId(nids[nids.length - 1]);
    } else {
      pick(nids[0]);
    }
  },

  patchMultiFill(color, schemeRef) {
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
    const st0 = usePresentationStore.getState();
    const slideIdxs =
      !ids.length && st0.slideMultiSel?.length > 1
        ? st0.slideMultiSel.map((i) => i | 0)
        : null;
    if (!ids.length && !slideIdxs) return;

    const applyFill = (el) => {
      if (!el || el._isDecor) return null;
      if (el.type === 'text' || el.type === 'markdown' || el.type === 'code') {
        const cs = applyCsProp(el.cs || '', 'color', color);
        return { cs, textColor: color, textColorScheme: schemeRef ?? null };
      }
      if (el.type === 'formula') {
        return colorPatchForEl(el, 'fill', color, schemeRef ?? null);
      }
      if (el.type === 'graph') {
        return colorPatchForEl(el, 'fill', color, schemeRef ?? null);
      }
      return (
        colorPatchForEl(el, 'fill', color, schemeRef ?? null) || {
          fill: color,
          fillScheme: schemeRef ?? null,
        }
      );
    };

    const graphIds = [];
    withHistory(() => {
      if (slideIdxs) {
        const store = usePresentationStore.getState();
        const slides = JSON.parse(JSON.stringify(store.slides || []));
        slideIdxs.forEach((si) => {
          (slides[si]?.els || []).forEach((el) => {
            const patch = applyFill(el);
            if (patch) {
              Object.assign(el, patch);
              if (el.type === 'graph' && patch.graphColor != null) graphIds.push(String(el.id));
            }
          });
        });
        usePresentationStore.setState({ slides });
        store.persist?.();
        return;
      }
      const st = usePresentationStore.getState();
      const els = st.slides[st.cur]?.els || [];
      ids.forEach((id) => {
        const el = els.find((e) => e && String(e.id) === String(id));
        const patch = applyFill(el);
        if (patch) {
          st.patchElement(id, patch);
          if (el?.type === 'graph' && patch.graphColor != null) graphIds.push(String(id));
        }
      });
    });
    if (graphIds.length) void rebuildGraphElementsByIds(graphIds);
  },

  patchMultiFont(family) {
    if (!family) return;
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
    const st0 = usePresentationStore.getState();
    const slideIdxs =
      !ids.length && st0.slideMultiSel?.length > 1
        ? st0.slideMultiSel.map((i) => i | 0)
        : null;
    if (!ids.length && !slideIdxs) return;

    const applyFont = (el) => {
      if (!el || el._isDecor) return null;
      if (el.type === 'shape') {
        const cs = applyFontFamily(el.shapeTextCss || DEFAULT_SHAPE_TEXT_CSS, family);
        return { shapeTextCss: cs, ff: family, fontFamily: family };
      }
      const cs = applyFontFamily(el.cs || '', family);
      return { cs, ff: family, fontFamily: family };
    };

    withHistory(() => {
      if (slideIdxs) {
        const store = usePresentationStore.getState();
        const slides = JSON.parse(JSON.stringify(store.slides || []));
        slideIdxs.forEach((si) => {
          (slides[si]?.els || []).forEach((el) => {
            const patch = applyFont(el);
            if (patch) Object.assign(el, patch);
          });
        });
        usePresentationStore.setState({ slides });
        store.persist?.();
        return;
      }
      const st = usePresentationStore.getState();
      const els = st.slides[st.cur]?.els || [];
      ids.forEach((id) => {
        const el = els.find((e) => e && String(e.id) === String(id));
        const patch = applyFont(el);
        if (patch) st.patchElement(id, patch);
      });
    });
  },

  /** Set font size (кегль) on multi-selected objects / all objects on multi-selected slides. */
  patchMultiFontSize(px) {
    const size = Math.max(8, Math.min(200, Math.round(+px || 0)));
    if (!Number.isFinite(size) || size < 8) return;
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
    const st0 = usePresentationStore.getState();
    const slideIdxs =
      !ids.length && st0.slideMultiSel?.length > 1
        ? st0.slideMultiSel.map((i) => i | 0)
        : null;
    if (!ids.length && !slideIdxs) return;

    const applySize = (el) => {
      if (!el || el._isDecor) return null;
      if (el.type === 'shape') {
        let cs = applyCsProp(el.shapeTextCss || DEFAULT_SHAPE_TEXT_CSS, 'font-size', `${size}px`);
        const patch = { shapeTextCss: cs };
        const src = el.shapeHtml || '';
        if (src) patch.shapeHtml = stripInlineFontSizes(src);
        return patch;
      }
      if (
        el.type === 'text' ||
        el.type === 'markdown' ||
        el.type === 'code' ||
        el.type === 'formula'
      ) {
        let cs = applyCsProp(el.cs || '', 'font-size', `${size}px`);
        const patch = { cs };
        const src = el.html || '';
        if (src && el.type === 'text') {
          patch.html = stripInlineFontSizes(src);
          patch.text = String(patch.html).replace(/<[^>]+>/g, '');
        }
        return patch;
      }
      return null;
    };

    withHistory(() => {
      if (slideIdxs) {
        const store = usePresentationStore.getState();
        const slides = JSON.parse(JSON.stringify(store.slides || []));
        slideIdxs.forEach((si) => {
          (slides[si]?.els || []).forEach((el) => {
            const patch = applySize(el);
            if (patch) Object.assign(el, patch);
          });
        });
        usePresentationStore.setState({ slides });
        store.persist?.();
        return;
      }
      const st = usePresentationStore.getState();
      const els = st.slides[st.cur]?.els || [];
      ids.forEach((id) => {
        const el = els.find((e) => e && String(e.id) === String(id));
        const patch = applySize(el);
        if (patch) st.patchElement(id, patch);
      });
    });
  },

  patchMultiOpacity(v) {
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
    const st0 = usePresentationStore.getState();
    const slideIdxs =
      !ids.length && st0.slideMultiSel?.length > 1
        ? st0.slideMultiSel.map((i) => i | 0)
        : null;
    if (!ids.length && !slideIdxs) return;
    const op = Math.max(0, Math.min(1, +v));
    withHistory(() => {
      if (slideIdxs) {
        const store = usePresentationStore.getState();
        const slides = JSON.parse(JSON.stringify(store.slides || []));
        slideIdxs.forEach((si) => {
          (slides[si]?.els || []).forEach((el) => {
            if (!el || el._isDecor) return;
            el.elOpacity = op;
            el.fillOp = op;
          });
        });
        usePresentationStore.setState({ slides });
        store.persist?.();
        return;
      }
      ids.forEach((id) => {
        usePresentationStore.getState().patchElement(id, { elOpacity: op, fillOp: op });
      });
    });
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

  async exportJSON() {
    const raw = usePresentationStore.getState().exportDeck();
    useUiStore.getState().showToast(ru() ? 'Экспорт JSON…' : 'Exporting JSON…');
    try {
      const data = await packDeckForFile(raw);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (data.title || 'slides') + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      useUiStore.getState().showToast(ru() ? 'Экспортировано' : 'Exported', 'ok');
    } catch (e) {
      console.warn('[exportJSON]', e);
      useUiStore
        .getState()
        .showToast(
          ru() ? `Ошибка JSON: ${e.message || e}` : `JSON error: ${e.message || e}`,
          'err'
        );
    }
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
      .catch((e) => {
        console.warn('[exportHTML]', e);
        return data;
      })
      .then((prepared) => {
        const ui = useUiStore.getState();
        return downloadHtml(prepared, {
          footer: !!ui.presShowFooter,
          sidenav: !!ui.presShowSideNav,
          esc: !!ui.presShowEsc,
          brush: !!ui.presShowBrush,
        });
      })
      .then(() => {
        useUiStore.getState().showToast(ru() ? 'HTML сохранён' : 'HTML saved', 'ok');
      })
      .catch((e) => {
        console.warn('[exportHTML]', e);
        useUiStore.getState().showToast(
          ru() ? `Ошибка экспорта HTML: ${e.message || e}` : `HTML export error: ${e.message || e}`,
          'err'
        );
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
            slide: st.slides[only],
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

  // Print the slides only — not the whole app page. window.print() (or the browser's own
  // Ctrl+P) prints whatever is currently on screen, ribbons and panels included, since
  // there's no @media print rule scoping that down to just the canvas. Generating the same
  // PDF the "Export PDF" button produces and printing *that* (in a hidden iframe) sidesteps
  // that entirely, and gets each page's orientation right for free — a 16:9 deck's pages
  // are wider than tall (landscape), a 9:16 deck's are taller than wide (portrait), because
  // that's just what canvasW × canvasH already is for each.
  async printSlides() {
    const st = usePresentationStore.getState();
    if (!st.slides?.length) {
      useUiStore.getState().showToast(ru() ? 'Нет слайдов' : 'No slides', 'warn');
      return;
    }
    useUiStore.getState().showToast(ru() ? 'Подготовка к печати…' : 'Preparing to print…');
    try {
      await printAllSlides({
        slides: st.slides,
        canvasW: st.canvasW,
        canvasH: st.canvasH,
        setCur: (i) => st.setCur(i),
        cur: st.cur,
      });
    } catch (e) {
      console.warn('[printSlides]', e);
      useUiStore
        .getState()
        .showToast(ru() ? `Ошибка печати: ${e.message || e}` : `Print error: ${e.message || e}`, 'warn');
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
    const name = el.imgName || 'image';
    const bgImg = {
      src: el.src,
      name,
      mode: 'cover',
      opacity: 1,
      blur: 0,
      tileSize: 120,
      tileGap: 10,
      tileRot: 0,
    };
    const nextEls = (slide.els || []).filter((e) => String(e.id) !== String(id));
    withHistory(() => {
      // Must go through patchSlide so Zustand notifies the canvas (in-place mutate only persists).
      usePresentationStore.getState().patchSlide(cur, {
        bgImg,
        bg: 'custom',
        els: nextEls,
      });
    });
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
    const bgImg = {
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
    const nextEls = (slide.els || []).filter((e) => String(e.id) !== String(id));
    withHistory(() => {
      usePresentationStore.getState().patchSlide(cur, {
        bgImg,
        bg: 'custom',
        els: nextEls,
      });
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
        w: 360,
        h: 40,
        mediaSrc: '',
        mediaSrcType: 'url',
        maLoop: false,
        maVolume: 1,
        maStart: 'click-el',
        maTriggerElIds: [],
        anims: [],
      })
    );
    pick(id);
    return id;
  },

  startMediaTriggerPick(audioElId) {
    if (audioElId == null) return;
    const cur = usePresentationStore.getState().cur;
    useUiStore.getState().clearAnimTriggerPick();
    useUiStore.getState().clearTimerTriggerPick();
    useUiStore.getState().setMediaTriggerPick({ audioElId, slideIdx: cur });
    useUiStore.getState().showToast(
      ru() ? 'Кликните по объекту-триггеру на слайде' : 'Click the trigger object on the slide',
      'ok'
    );
  },

  cancelMediaTriggerPick() {
    useUiStore.getState().clearMediaTriggerPick();
  },

  startTimerTriggerPick(timerElId) {
    if (timerElId == null) return;
    const cur = usePresentationStore.getState().cur;
    useUiStore.getState().clearAnimTriggerPick();
    useUiStore.getState().clearMediaTriggerPick();
    useUiStore.getState().setTimerTriggerPick({ timerElId, slideIdx: cur });
    useUiStore.getState().showToast(
      ru() ? 'Кликните по объекту, который запустит таймер' : 'Click the object that starts the timer',
      'ok'
    );
  },

  cancelTimerTriggerPick() {
    useUiStore.getState().clearTimerTriggerPick();
  },

  completeTimerTriggerPick(targetElId) {
    const ctx = useUiStore.getState().timerTriggerPick;
    if (!ctx || targetElId == null) {
      useUiStore.getState().clearTimerTriggerPick();
      return;
    }
    const st = usePresentationStore.getState();
    const ownerSlideIdx = ctx.slideIdx != null ? ctx.slideIdx : st.cur;
    const ownerSlide = st.slides[ownerSlideIdx];
    const owner = (ownerSlide?.els || []).find((e) => e && String(e.id) === String(ctx.timerElId));
    if (!owner || owner.type !== 'applet' || owner.appletId !== 'timer') {
      useUiStore.getState().clearTimerTriggerPick();
      return;
    }
    useUiStore.getState().clearTimerTriggerPick();
    withHistory(() => {
      usePresentationStore.getState().patchElementOnSlide(ownerSlideIdx, ctx.timerElId, {
        tmStart: 'click-el',
        tmStartElId: String(targetElId),
      });
    });
    useUiStore.getState().showToast(ru() ? 'Триггер таймера выбран' : 'Timer trigger set', 'ok');
  },

  completeMediaTriggerPick(targetElId) {
    const ctx = useUiStore.getState().mediaTriggerPick;
    if (!ctx || targetElId == null) {
      useUiStore.getState().clearMediaTriggerPick();
      return;
    }
    const st = usePresentationStore.getState();
    const ownerSlideIdx = ctx.slideIdx != null ? ctx.slideIdx : st.cur;
    const ownerSlide = st.slides[ownerSlideIdx];
    const owner = (ownerSlide?.els || []).find((e) => e && String(e.id) === String(ctx.audioElId));
    if (!owner || owner.type !== 'mediaaudio') {
      useUiStore.getState().clearMediaTriggerPick();
      return;
    }
    const prev = Array.isArray(owner.maTriggerElIds)
      ? owner.maTriggerElIds.map(String)
      : owner.maTriggerElId != null && owner.maTriggerElId !== ''
        ? [String(owner.maTriggerElId)]
        : [];
    const tid = String(targetElId);
    if (prev.includes(tid)) {
      useUiStore.getState().clearMediaTriggerPick();
      useUiStore.getState().showToast(ru() ? 'Уже в списке триггеров' : 'Already a trigger', 'ok');
      return;
    }
    useUiStore.getState().clearMediaTriggerPick();
    const nextIds = [...prev, tid];
    withHistory(() => {
      usePresentationStore.getState().patchElementOnSlide(ownerSlideIdx, ctx.audioElId, {
        maTriggerElIds: nextIds,
        maTriggerElId: undefined,
      });
    });
    useUiStore.getState().showToast(ru() ? 'Триггер добавлен' : 'Trigger added', 'ok');
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
    const codeRaw =
      opts.codeRaw != null
        ? String(opts.codeRaw)
        : ru()
          ? '// код\nconsole.log("привет");'
          : '// code\nconsole.log("hello");';
    const base = {
      codeRaw,
      codeLang: normalizeCodeLang(opts.codeLang || 'js'),
      codeTheme: opts.codeTheme || 'system',
      codeGlass: !!opts.codeGlass,
      codeLineNums: !!opts.codeLineNums,
      codeFs: Math.max(10, Math.min(28, +opts.codeFs || 18)),
    };
    const hl = ensureCodeHtml(base, 'system');
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
    const next = { ...el, html, textPlaceholder: false };
    const h = measureTextHeight(next);
    withHistory(() =>
      patchElement(el.id, {
        html,
        h: Math.max(el.h || 60, h),
        textPlaceholder: false,
      })
    );
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
      const codeRaw = src;
      const base = {
        codeRaw,
        codeLang: 'html',
        codeTheme: 'system',
        codeGlass: false,
        codeLineNums: false,
        codeFs: 18,
      };
      const hl = ensureCodeHtml(base, 'system');
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
    const theme = cd.codeTheme || 'system';
    const base = {
      codeRaw: src,
      codeLang: cd.codeLang || 'html',
      codeTheme: theme,
      codeGlass: !!cd.codeGlass,
      codeLineNums: !!cd.codeLineNums,
      codeFs: cd.codeFs != null ? cd.codeFs : 18,
    };
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
    if (editorApi.cutInlineTextSelection()) return;
    editorApi.copySelected();
    editorApi.deleteSelected();
  },

  moveSelectedBy(dx, dy) {
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = multiSel?.length ? multiSel : selId ? [selId] : [];
    if (!ids.length) return;
    const st = usePresentationStore.getState();
    const els = st.slides[st.cur]?.els || [];
    const selected = els.filter((e) => e && ids.map(String).includes(String(e.id)));
    const legoSel = selected.filter((e) => e.type === 'lego');
    if (legoSel.length && legoSel.length === selected.length) {
      const stepX = LEGO_U;
      const stepY = legoSel.every(isLegoTop) ? LEGO_U : LEGO_SNAP;
      const odx = dx ? Math.sign(dx) * Math.max(stepX, Math.abs(dx)) : 0;
      const ody = dy ? Math.sign(dy) * Math.max(stepY, Math.abs(dy)) : 0;
      const off = resolveLegoGroupOffset(legoSel, odx, ody, els, st.canvasW, st.canvasH);
      st.moveElements(ids, off.dx, off.dy);
      return;
    }
    st.moveElements(ids, dx, dy);
  },

  /**
   * Copy a non-collapsed text selection inside a text/shape contentEditable.
   * Returns true when handled (incl. when focus is on the format toolbar).
   */
  copyInlineTextSelection() {
    const payload = readCanvasTextSelection();
    if (!payload) return false;
    writePlainTextClipboard(payload.text, payload.html).catch(() => {
      markPlainTextClipboard();
    });
    // Drop stale element clip in the store so paste doesn't resurrect the whole box.
    usePresentationStore.setState({ clipboard: null, clipSource: 'text' });
    useUiStore.getState().showToast(
      ru() ? 'Текст скопирован' : 'Text copied',
      'ok'
    );
    return true;
  },

  /** Cut inline text selection (copy + delete range, commit html). */
  cutInlineTextSelection() {
    const payload = readCanvasTextSelection();
    if (!payload) return false;
    const sel = window.getSelection?.();
    if (!sel || !sel.rangeCount) return false;
    const range = sel.getRangeAt(0);
    const editable = (
      range.commonAncestorContainer.nodeType === 1
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement
    )?.closest?.('[contenteditable="true"]');
    if (!editable) return false;
    writePlainTextClipboard(payload.text, payload.html).catch(() => {
      markPlainTextClipboard();
    });
    usePresentationStore.setState({ clipboard: null, clipSource: 'text' });
    try {
      range.deleteContents();
    } catch (e) {
      return true;
    }
    const host = editable.closest?.('.react-el[data-id]');
    const id = host?.getAttribute?.('data-id');
    if (id) {
      withHistory(() => {
        usePresentationStore.getState().patchElement(id, { html: editable.innerHTML });
      });
    }
    useUiStore.getState().showToast(ru() ? 'Текст вырезан' : 'Text cut', 'ok');
    return true;
  },

  copySelected() {
    if (editorApi.copyInlineTextSelection()) return;
    const { selId, multiSel } = useSelectionStore.getState();
    let ids = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
    if (!ids.length) return;
    const { slides, cur } = usePresentationStore.getState();
    const slideEls = slides[cur]?.els || [];
    // Expand to full groups so a partial selection still copies every member together.
    const gidSet = new Set();
    slideEls.forEach((e) => {
      if (e && ids.includes(String(e.id)) && e.groupId != null && e.groupId !== '') {
        gidSet.add(String(e.groupId));
      }
    });
    if (gidSet.size) {
      const expanded = new Set(ids);
      slideEls.forEach((e) => {
        if (e && !e._isDecor && e.groupId != null && gidSet.has(String(e.groupId))) {
          expanded.add(String(e.id));
        }
      });
      ids = [...expanded];
    }
    const els = slideEls
      .filter((e) => e && ids.includes(String(e.id)) && !e._isDecor && e.type !== 'pagenum')
      .map((e) => slimMediaEl(JSON.parse(JSON.stringify(e))));
    if (!els.length) return;
    usePresentationStore.setState({ clipboard: { els, sourceSlideIdx: cur }, slideClipboard: null, clipSource: 'elements' });
    writeOsClipboard(els, cur).catch(() => {});
    // Promote inline data: audio/video into the shared media store (async; paste still has mediaId).
    void (async () => {
      let changed = false;
      for (let i = 0; i < els.length; i++) {
        const next = await ensureElementMediaId(els[i]);
        if (next !== els[i]) {
          els[i] = next;
          changed = true;
        }
      }
      if (!changed) return;
      usePresentationStore.setState({ clipboard: { els, sourceSlideIdx: cur }, slideClipboard: null, clipSource: 'elements' });
      writeOsClipboard(els, cur).catch(() => {});
    })();
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
      pastePresentationJson: (text) => editorApi.importPresentationRaw(text, 'presentation.json'),
      applyHtmlFrame: (...a) => editorApi.applyHtmlFrame(...a),
      applyCode: (...a) => editorApi.applyCode(...a),
      addQrCode: (...a) => editorApi.addQrCode(...a),
      addImageFromFile: (...a) => editorApi.addImageFromFile(...a),
      addImageFromUrl: (src) => editorApi.addImageFromUrl(src),
      pasteSlide: (...a) => editorApi.pasteSlide(...a),
      pasteModel3d: async (text, name) => {
        let src = String(text || '');
        try {
          const { extractObjText, looksLikeObjText } = await import('./detectPasteObj.js');
          if (looksLikeObjText(src)) src = extractObjText(src) || src;
          else src = extractObjText(src) || src;
        } catch (_) {
          /* keep raw */
        }
        if (!src || !/\bv\s+[-+]?\d/i.test(src)) return false;
        const vN = (src.match(/^\s*v\s+[-+]?\d/gim) || []).length;
        const hasFL = /^\s*[fl]\s+[-+]?\d/im.test(src);
        if (!hasFL && vN < 24) return false;
        try {
          // Ensure the mesh can be built (incl. vertex-only ring reconstruction).
          const { parseObj } = await import('./model3d.js');
          if (!parseObj(src)) {
            useUiStore.getState().showToast(
              ru() ? 'OBJ: нет граней (f) и не удалось собрать сетку' : 'OBJ: no faces (f) and mesh rebuild failed',
              'warn'
            );
            return false;
          }
          const id = withHistory(() =>
            usePresentationStore.getState().addElement(
              model3dFieldsWithTheme({
                objText: src,
                objName: name || 'model.obj',
              })
            )
          );
          pick(id);
          useUiStore.getState().showToast(ru() ? 'Модель OBJ вставлена' : 'OBJ model pasted', 'ok');
          return !!id;
        } catch (err) {
          console.warn('[pasteModel3d]', err);
          return false;
        }
      },
      pasteLatexFormula: async (latex) => {
        const src = String(latex || '').trim();
        if (!src) return false;
        try {
          const { renderFormulaSvg, formulaLatexForStore } = await import('./mathjax.js');
          const st = usePresentationStore.getState();
          const startTag =
            (st.slides[st.cur]?.els || []).filter(
              (e) =>
                e &&
                e.type === 'formula' &&
                (/\\tag\s*\{/.test(String(e.formulaRaw || '')) ||
                  /\\begin\{equation\}/.test(String(e.formulaRaw || '')))
            ).length + 1;
          const storeLatex = formulaLatexForStore(src, startTag);
          const svg = await renderFormulaSvg(src, {
            startTag,
            displayAlign: 'left',
            containerWidth: 480,
          });
          if (!svg) return false;
          await editorApi.commitFormula({ latex: storeLatex, svg });
          useUiStore.getState().showToast(ru() ? 'Формула вставлена' : 'Formula pasted', 'ok');
          return true;
        } catch (err) {
          console.warn('[pasteLatexFormula]', err);
          return false;
        }
      },
      _pasteRu: () => ru(),
      _pasteToast: (msg, kind) => useUiStore.getState().showToast(msg, kind),
      _pasteReadStore: () => usePresentationStore.getState(),
      _pasteSetElements: (els) =>
        usePresentationStore.setState({ clipboard: { els }, slideClipboard: null }),
      _pasteSetSlides: (slides) =>
        usePresentationStore.setState({ slideClipboard: slides, clipboard: null }),
      _pasteElements: async (els) => {
        if (!els?.length) return;
        const prepared = [];
        for (const src of els) {
          let copy = JSON.parse(JSON.stringify(src));
          copy = await ensureElementMediaId(copy);
          copy = slimMediaEl(copy);
          // Restore playable blob URL for this session without embedding bytes in the deck.
          if (copy.mediaId) {
            const play = resolveMediaSrc(copy);
            if (play) copy.mediaSrc = play;
          }
          prepared.push(copy);
        }
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
        // Remap shared groupIds so pasted members stay a group, but do not join the originals.
        const gidCount = new Map();
        prepared.forEach((src) => {
          if (src?.groupId == null || src.groupId === '') return;
          const g = String(src.groupId);
          gidCount.set(g, (gidCount.get(g) || 0) + 1);
        });
        const groupMap = new Map();
        gidCount.forEach((n, g) => {
          if (n > 1) {
            groupMap.set(
              g,
              'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
            );
          }
        });
        withHistory(() => {
          prepared.forEach((src) => {
            const copy = JSON.parse(JSON.stringify(src));
            delete copy.id;
            copy.x = (copy.x || 0) + offset;
            copy.y = (copy.y || 0) + offset;
            if (copy.groupId != null && copy.groupId !== '') {
              const g = String(copy.groupId);
              if (groupMap.has(g)) copy.groupId = groupMap.get(g);
              else delete copy.groupId;
            }
            const id = usePresentationStore.getState().addElement(copy);
            if (!id) return;
            newIds.push(String(id));
            // Register pasted anims on the slide timeline (incl. transform) so they don't
            // appear as a surprise "extra" step when ensureAnimOrder later appends them.
            const anims = Array.isArray(copy.anims) ? copy.anims : [];
            if (!anims.length) return;
            const st = usePresentationStore.getState();
            const slide = st.slides[st.cur];
            if (!slide) return;
            const order = Array.isArray(slide.animOrder) ? slide.animOrder.slice() : [];
            anims.forEach((a, ai) => {
              if (a && a.name) order.push({ elId: id, ai });
            });
            st.patchSlide(st.cur, { animOrder: order });
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
    const next = pnNormalize({ ...st.pnSettings, ...patch });
    withHistory(() => {
      st.setPnSettings(next);
      editorApi.applyPageNumbers(next);
    });
  },

  applyPageNumbers(settings) {
    const st = usePresentationStore.getState();
    const s = pnNormalize(settings || st.pnSettings);
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
    const theme = getTheme(st.appliedThemeIdx);
    const color = resolveSchemeColor(s.colorScheme, theme) || s.color || '#3b82f6';
    const textColor = resolveSchemeColor(s.textColorScheme, theme) || s.textColor || '#ffffff';
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
        pnTextColor: textColor,
        pnColorScheme: s.colorScheme || null,
        pnTextColorScheme: s.textColorScheme || null,
        pnFontSize: s.fontSize,
        pnShowTotal: s.showTotal,
        html: pnBuildHtml(si, total, s.style, s.showTotal, color, textColor, s.fontSize),
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
    const fromKey = arLayoutKey(st.canvasW, st.canvasH, st.ar);
    const toKey = next;
    withHistory(() => {
      // Remember current format (author edits) before leaving it
      let slides = saveSlidesArLayout(
        JSON.parse(JSON.stringify(st.slides || [])),
        fromKey,
        st.canvasW,
        st.canvasH
      );
      slides = slides.map((s) => {
        if (!s) return s;
        const saved = s.arLayouts && s.arLayouts[toKey];
        if (saved && saved.els && Object.keys(saved.els).length) {
          let applied = applySlideArLayout(s, saved);
          // Elements added after the snapshot was taken — scale from current format
          applied = {
            ...applied,
            els: (applied.els || []).map((el) => {
              if (!el || el._isDecor || saved.els[el.id]) return el;
              const scaled = scaleSlidesToCanvas(
                [{ els: [el] }],
                st.canvasW,
                st.canvasH,
                w,
                h
              )[0];
              return (scaled.els || [])[0] || el;
            }),
          };
          // Snapshot was for a different pixel size — remap into new canvas
          if (
            saved.canvasW &&
            saved.canvasH &&
            (saved.canvasW !== w || saved.canvasH !== h)
          ) {
            applied = scaleSlidesToCanvas([applied], saved.canvasW, saved.canvasH, w, h)[0];
          }
          return applied;
        }
        // First visit to this format — auto-scale (images keep aspect)
        return scaleSlidesToCanvas([s], st.canvasW, st.canvasH, w, h)[0];
      });
      // Store the result as the baseline for this format (first time or refreshed)
      slides = saveSlidesArLayout(slides, toKey, w, h);
      usePresentationStore.getState().applyAspectSlides(slides, w, h, next);
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
    if (kind === 'imagesort') {
      useUiStore.getState().setImageSortMarkerId(null);
    }
    useUiStore.getState().showToast(
      ru() ? `Аплет: ${meta.labelRu}` : `Applet: ${meta.labelEn}`,
      'ok'
    );
    return id;
  },

  addImageSortMarker(appletId) {
    const st = usePresentationStore.getState();
    const el = (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === String(appletId));
    if (!el || el.appletId !== 'imagesort') return null;
    const markers = getImageSortMarkers(el);
    const id = newImageSortMarkerId();
    const pos = defaultImageSortMarkerPos(el, st.canvasW, st.canvasH, markers.length);
    const next = [...markers, { id, x: pos.x, y: pos.y, answer: '' }];
    this.patchApplet(appletId, { sortMarkers: next });
    useUiStore.getState().setImageSortMarkerId(id);
    pick(appletId);
    return id;
  },

  updateImageSortMarker(appletId, markerId, patch, opts = {}) {
    const st = usePresentationStore.getState();
    const el = (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === String(appletId));
    if (!el || el.appletId !== 'imagesort') return;
    const mid = String(markerId);
    const markers = getImageSortMarkers(el).map((m) => {
      if (m.id !== mid) return m;
      const next = { ...m, ...patch };
      if (patch.x != null || patch.y != null) {
        const c = clampImageSortMarker(
          patch.x != null ? patch.x : m.x,
          patch.y != null ? patch.y : m.y,
          st.canvasW,
          st.canvasH
        );
        next.x = c.x;
        next.y = c.y;
      }
      if (patch.answer != null) next.answer = String(patch.answer);
      return next;
    });
    // Marker moves don't change iframe HTML — patch live without history spam.
    if (opts.live) {
      usePresentationStore.getState().patchElement(appletId, { sortMarkers: markers }, { live: true });
      return;
    }
    this.patchApplet(appletId, { sortMarkers: markers });
  },

  removeImageSortMarker(appletId, markerId) {
    const st = usePresentationStore.getState();
    const el = (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === String(appletId));
    if (!el || el.appletId !== 'imagesort') return;
    const mid = String(markerId);
    const markers = getImageSortMarkers(el).filter((m) => m.id !== mid);
    this.patchApplet(appletId, { sortMarkers: markers });
    const ui = useUiStore.getState();
    if (String(ui.imageSortMarkerId || '') === mid) ui.setImageSortMarkerId(null);
  },

  selectImageSortMarker(appletId, markerId) {
    if (appletId) pick(appletId);
    useUiStore.getState().setImageSortMarkerId(markerId != null ? String(markerId) : null);
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
        const text = await readFileTextSmart(file);
        if (!text || !/\bv\s+/.test(text)) {
          useUiStore.getState().showToast(ru() ? 'Не похоже на OBJ' : 'Not a valid OBJ', 'warn');
          return;
        }
        const id = withHistory(() =>
          usePresentationStore.getState().addElement(
            model3dFieldsWithTheme({
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
        const text = await readFileTextSmart(file);
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

  /**
   * Grow-only text boxes that overflow after OS/font metric changes (e.g. Linux → Windows).
   * Silent, no history — used on boot after document.fonts.ready.
   */
  growOverflowingDeckTexts() {
    const st = usePresentationStore.getState();
    const slides = st.slides || [];
    let total = 0;
    const nextSlides = slides.map((slide) => {
      if (!slide?.els?.length) return slide;
      const copy = JSON.parse(JSON.stringify(slide));
      const n = fitTextsOnSlide(copy, { shrink: false });
      if (!n) return slide;
      total += n;
      return copy;
    });
    if (!total) return 0;
    usePresentationStore.setState({ slides: nextSlides });
    st.persist?.();
    st.bumpThumbEpoch?.();
    return total;
  },

  autofitSlideTexts(opts = {}) {
    const st = usePresentationStore.getState();
    const indices = st.getSlideSelection();
    let total = 0;
    const nextSlides = (st.slides || []).map((slide, i) => {
      if (!indices.includes(i) || !slide?.els?.length) return slide;
      const copy = JSON.parse(JSON.stringify(slide));
      const n = fitTextsOnSlide(copy, { shrink: !!opts.shrink });
      if (!n) return slide;
      total += n;
      return copy;
    });
    if (!total) {
      useUiStore.getState().showToast(ru() ? 'Тексты уже подогнаны' : 'Texts already fit', 'ok');
      return 0;
    }
    withHistory(() => {
      usePresentationStore.getState().replaceSlides(nextSlides, st.cur);
    });
    useUiStore.getState().showToast(
      indices.length > 1
        ? ru()
          ? `Подогнано текстовстов: ${total} (${indices.length} сл.)`
          : `Fitted texts: ${total} (${indices.length} slides)`
        : ru()
          ? `Подогнано текстовстов: ${total}`
          : `Fitted texts: ${total}`,
      'ok'
    );
    return total;
  },

  setTextAlign(align) {
    const el = currentEl();
    if (el?.type === 'table') {
      editorApi.patchSelectedTableCells({ align });
      return;
    }
    if (!isRichTextEl(el)) return;
    patchRichText(el, { cs: applyCsProp(fmtCsOf(el), 'text-align', align) });
    if (el.type === 'formula') void editorApi.rebakeFormulaSvg(el.id);
  },

  clearSelectedText() {
    const el = currentEl();
    if (!el || el.type !== 'text') return;
    const lang = useUiStore.getState().lang;
    const label =
      el.textPlaceholderLabel ||
      (el._fromSlideLayout
        ? textPlaceholderLabel(el, lang)
        : ru()
          ? 'Дважды кликните для редактирования'
          : 'Double-click to edit');
    const html = paintTextPlaceholderHtml(label);
    const root = liveEditableRoot(el);
    if (root && root.isContentEditable) {
      root.innerHTML = html;
      root.focus();
      root.blur();
      return;
    }
    patchRichText(el, {
      html,
      text: label,
      extra: { textPlaceholder: true, textPlaceholderLabel: label },
    });
  },

  resetTextFormatting() {
    const el = currentEl();
    if (el?.type === 'table') {
      editorApi.tableResetCellFormat();
      return;
    }
    if (el?.type === 'shape') {
      editorApi.resetShapeTextFormatting();
      return;
    }
    if (!el || el.type !== 'text') return;
    let html = el.html || '';
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (active?.isContentEditable && active.closest?.(`[data-id="${el.id}"]`)) {
      html = active.innerHTML;
    }
    const patch = formattingPatchForEl({ ...el, html });
    if (!patch) return;
    withHistory(() => usePresentationStore.getState().patchElement(el.id, patch));
  },

  /**
   * Clear formatting on multi-selected objects, or — when several slides are
   * selected and no objects are — on every object on those slides.
   */
  resetFormattingSelected() {
    const st = usePresentationStore.getState();
    const { selId, multiSel } = useSelectionStore.getState();
    const objIds = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
    const slideIdxs =
      st.slideMultiSel?.length > 1
        ? st.slideMultiSel.map((i) => i | 0)
        : [];

    const targets = [];
    if (objIds.length) {
      const els = st.slides[st.cur]?.els || [];
      objIds.forEach((id) => {
        const el = els.find((e) => e && String(e.id) === String(id));
        if (el && !el._isDecor) targets.push({ slideIndex: st.cur, el });
      });
    } else if (slideIdxs.length) {
      slideIdxs.forEach((si) => {
        const els = st.slides[si]?.els || [];
        els.forEach((el) => {
          if (el && !el._isDecor) targets.push({ slideIndex: si, el });
        });
      });
    } else {
      editorApi.resetTextFormatting();
      return;
    }

    if (!targets.length) {
      useUiStore.getState().showToast(ru() ? 'Нет объектов для очистки' : 'Nothing to clear', 'warn');
      return;
    }

    let n = 0;
    withHistory(() => {
      const store = usePresentationStore.getState();
      const slides = JSON.parse(JSON.stringify(store.slides || []));
      targets.forEach(({ slideIndex, el }) => {
        const patch = formattingPatchForEl(el);
        if (!patch) return;
        const s = slides[slideIndex];
        if (!s) return;
        const d = (s.els || []).find((e) => e && String(e.id) === String(el.id));
        if (!d) return;
        Object.assign(d, patch);
        n += 1;
      });
      usePresentationStore.setState({ slides });
      store.persist?.();
    });
    useUiStore.getState().showToast(
      ru() ? `Форматирование очищено (${n})` : `Formatting cleared (${n})`,
      'ok'
    );
  },

  resetShapeTextFormatting() {
    const el = currentEl();
    if (!el || el.type !== 'shape') return;
    let html = el.shapeHtml || '';
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (active?.isContentEditable && active.closest?.(`[data-id="${el.id}"]`)) {
      html = active.innerHTML;
    }
    const cleaned = String(html)
      .replace(/<\/?(?:b|strong|i|em|u|s|strike|sub|sup|font)(?:\s[^>]*)?>/gi, '')
      .replace(/\sstyle="[^"]*"/gi, '')
      .replace(/\sclass="[^"]*"/gi, '');
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, {
        shapeHtml: cleaned,
        shapeTextCss: DEFAULT_SHAPE_TEXT_CSS,
        textColor: '#ffffff',
        textColorScheme: null,
      })
    );
  },

  setTextVAlign(valign) {
    const el = currentEl();
    if (el?.type === 'table') {
      editorApi.patchSelectedTableCells({ valign });
      return;
    }
    if (!el || (el.type !== 'text' && el.type !== 'formula' && el.type !== 'markdown' && el.type !== 'shape')) return;
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
    const pst = usePresentationStore.getState();
    if (pst.slideMultiSel?.length) pst.clearSlideMultiSel();
    const { slides, cur } = pst;
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

  eraseInkNear(points, radius, opts = {}) {
    const st = usePresentationStore.getState();
    const beforeInk = (st.slides[st.cur]?.ink || []).length;
    const beforeFills = (st.slides[st.cur]?.inkFills || []).length;
    // Only push one history snapshot per erase gesture (the caller passes {live:true} for
    // every sample during the drag itself) instead of a full-deck snapshot on every single
    // pointermove — same reasoning as the store-level fix above.
    if (!opts.live) useHistoryStore.getState().push();
    const ok = usePresentationStore.getState().eraseInkNear(points, radius, opts);
    if (!opts.live && !ok) {
      const hist = useHistoryStore.getState();
      if (typeof hist.discardLast === 'function') hist.discardLast();
      else if (typeof hist.pop === 'function') hist.pop();
    }
    return ok && (beforeInk > 0 || beforeFills > 0);
  },

  openPresenter() {
    if (!isMultiScreenNow()) return null;
    const key = useUiStore.getState().presShowScreenKey;
    const w = openPresenterForShow(key) || openPresenterWindow();
    if (!w) {
      useUiStore.getState().showToast(
        ru() ? 'Разрешите всплывающие окна для окна докладчика' : 'Allow pop-ups for the presenter window',
        'warn'
      );
      return null;
    }
    return w;
  },

  startPreview(from) {
    try {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    } catch (e) {}
    const { cur, slides } = usePresentationStore.getState();
    const raw = from === '__cur__' || from == null ? cur : from | 0;
    const start =
      from === '__cur__' || from == null
        ? firstVisibleSlideIndex(slides, raw, 1)
        : firstVisibleSlideIndex(slides, raw, 1);
    flushSync(() => {
      useUiStore.getState().openPreview(start);
    });
    const po = document.querySelector('.preview-overlay');
    const el = po || document.documentElement;
    const showKey = useUiStore.getState().presShowScreenKey;
    const toastBlocked = () => {
      useUiStore.getState().showToast(
        ru()
          ? 'Разрешите всплывающие окна — окно докладчика на втором мониторе'
          : 'Allow pop-ups for the presenter window on the other display',
        'warn'
      );
    };
    const placed = placeSlideshowWindowsSync(el, showKey);
    if (placed.pair.multi && !placed.presenter) toastBlocked();
    if (!placed.pair.multi) {
      void requestScreenDetails().then(() => {
        if (!useUiStore.getState().previewOpen) return;
        const again = placeSlideshowWindowsSync(el, showKey);
        if (again.pair.multi && !again.presenter) toastBlocked();
      });
    }
  },

  stopPreview() {
    if (!useUiStore.getState().previewOpen) return;
    useUiStore.getState().closePreview();
    closePresenterWindow();
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
    if (name === 'inkDraw') {
      // "Ink draw" only makes sense for drawing objects — restrict it here rather than
      // letting it get assigned to a shape/text/image and silently doing nothing at
      // playback (resolveNodes in inkDrawPlay.js has nothing to reveal for those).
      const { selInkIds, multiSel, selId } = useSelectionStore.getState();
      const st0 = usePresentationStore.getState();
      const slide0 = st0.slides[st0.cur];
      const els0 = slide0?.els || [];
      const idsFromHosts = (multiSel?.length ? multiSel : selId ? [selId] : [])
        .map((mid) => els0.find((e) => e && String(e.id) === String(mid)))
        .filter((e) => e?.type === 'inkhost')
        .flatMap((e) => e.inkIds || []);
      const allInkIds = Array.from(new Set([...(selInkIds || []), ...idsFromHosts].map(String)));
      if (!allInkIds.length) {
        useUiStore.getState().showToast(
          ru() ? 'Анимация «Рисование» — выберите объект(ы) рисования' : 'Ink draw needs a drawing selected',
          'warn'
        );
        return;
      }
      const targetHostId = withHistory(() => {
        // Several separately-hosted lines selected (rubber-band / shift multi-select) —
        // merge them into one host first so this one animation entry can draw every
        // selected stroke together, in sequence, instead of only whichever single host it
        // ends up attached to.
        if (allInkIds.length > 1) {
          const merged = usePresentationStore.getState().mergeInkIntoOneHost(allInkIds);
          if (merged) return merged;
        }
        const els = usePresentationStore.getState().slides[usePresentationStore.getState().cur]?.els || [];
        const single = els.find(
          (e) => e?.type === 'inkhost' && (e.inkIds || []).some((id) => allInkIds.includes(String(id)))
        );
        return single?.id || null;
      });
      if (!targetHostId) {
        useUiStore.getState().showToast(
          ru() ? 'Анимация «Рисование» — выберите объект(ы) рисования' : 'Ink draw needs a drawing selected',
          'warn'
        );
        return;
      }
      useSelectionStore.getState().pickOne(targetHostId);
    }
    let el = currentEl();
    if (!el || el._isDecor) {
      useUiStore.getState().showToast(ru() ? 'Выберите объект' : 'Select an object', 'warn');
      return;
    }
    // Group-wide anims live on the leader so playback can fan out to every member.
    if (el.groupId && (name === 'cosmosTitle' || !isElSpecificAnim(name))) {
      const stLead = usePresentationStore.getState();
      el = slideAnimLeader(el, stLead.slides[stLead.cur]) || el;
    }
    if (name === 'inkDraw' && el.type !== 'inkhost') {
      useUiStore.getState().showToast(
        ru() ? 'Анимация «Рисование» — только для объектов рисования' : 'Ink draw is drawing-objects only',
        'err'
      );
      return;
    }
    if (name === 'inkDraw' && Array.isArray(el.anims) && el.anims.some((a) => a?.name === 'inkDraw')) {
      // This host already has an inkDraw entry — adding a second one means both would fire
      // independently during playback, each cancelling and restarting the other's reveal
      // partway through (a stroke would look like it draws, snaps fully visible, hides and
      // restarts, draws again...). Select the existing one in the timeline instead of
      // silently stacking a duplicate.
      useUiStore.getState().showToast(
        ru() ? 'У этого объекта уже есть анимация «Рисование»' : 'This drawing already has an Ink draw animation',
        'warn'
      );
      return;
    }
    if (name === 'langFade' && el.type !== 'text') {
      useUiStore.getState().showToast(
        ru() ? 'Анимация «Перевод» только для текста' : 'Translate fade is text-only',
        'err'
      );
      return;
    }
    if (name === 'uncrop' && el.type !== 'image') {
      useUiStore.getState().showToast(
        ru() ? 'Анимация «Не обрезать» только для изображений' : 'Uncrop is image-only',
        'err'
      );
      return;
    }
    withHistory(() => {
      const list = Array.isArray(el.anims) ? el.anims.slice() : [];
      const fields = defaultAnimFields(name);
      if (name === 'orbitTo') {
        const r = Math.max(80, Math.round(Math.min(el.w || 120, el.h || 120) * 0.7));
        fields.orbitR = r;
        fields.orbitCx = 0;
        fields.orbitCy = -r;
      }
      if (name === 'moveTo') {
        fields.tx = Math.max(80, Math.round((el.w || 100) * 0.85));
        fields.ty = 0;
      }
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
      if (name === 'transform') {
        const prevTf = list.filter((x) => x && x.name === 'transform');
        const snap = prevTf.length
          ? prevTf[prevTf.length - 1].to || snapshotTransformProps(el)
          : snapshotTransformProps(el);
        fields.from = snap ? JSON.parse(JSON.stringify(snap)) : null;
        fields.to = snap ? JSON.parse(JSON.stringify(snap)) : null;
        fields.dur = 800;
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

  /**
   * Enter transform capture: apply existing `to` (if any) onto the element,
   * show object props, allow canvas/props edits for the end state.
   */
  startTransformEdit(elId, index) {
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    const el = (slide?.els || []).find((e) => e && String(e.id) === String(elId));
    if (!el || !Array.isArray(el.anims) || !el.anims[index] || el.anims[index].name !== 'transform') {
      return;
    }
    const anim = el.anims[index];
    const from = anim.from || snapshotTransformProps(el);
    const to = anim.to || from;
    withHistory(() => {
      const list = el.anims.map((a, i) => {
        if (i !== index) return a;
        return { ...a, from: a.from || from, to: a.to || to };
      });
      const patch = { ...transformPatchFromSnap(to), anims: list };
      st.patchElement(el.id, patch);
    });
    useSelectionStore.getState().pickOne(el.id);
    useUiStore.getState().setTransformEditMode({ elId: el.id, ai: index });
    useUiStore.getState().setActiveTab('home');
    useUiStore.getState().showToast(
      ru() ? 'Измените объект, затем «Сохранить состояние»' : 'Edit the object, then Save state',
      'ok'
    );
  },

  /** Save current element as transform `to`, restore `from` on canvas. */
  confirmTransformState(elId, index) {
    const id = elId != null ? elId : currentEl()?.id;
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    const el = (slide?.els || []).find((e) => e && String(e.id) === String(id));
    const ai = index != null ? index : useUiStore.getState().transformEditMode?.ai;
    if (
      !el ||
      ai == null ||
      !Array.isArray(el.anims) ||
      !el.anims[ai] ||
      el.anims[ai].name !== 'transform'
    ) {
      return;
    }
    const anim = el.anims[ai];
    const from = anim.from || snapshotTransformProps(el);
    const to = snapshotTransformProps(el);
    withHistory(() => {
      const list = el.anims.map((a, i) => {
        if (i !== +ai) return a;
        return { ...a, from, to };
      });
      // Rest pose on the slide = first transform's `from` (like typewriter).
      const firstTf = list.find((x) => x && x.name === 'transform');
      const rest = firstTf?.from || from;
      const patch = { ...transformPatchFromSnap(rest), anims: list };
      st.patchElement(el.id, patch);
    });
    useUiStore.getState().setTransformEditMode(null);
    useUiStore.getState().setActiveTab('anim');
    useUiStore.getState().showToast(ru() ? 'Состояние сохранено' : 'State saved', 'ok');
  },

  /** Abort transform edit and restore rest pose without updating `to`. */
  cancelTransformEdit() {
    const mode = useUiStore.getState().transformEditMode;
    if (!mode) return;
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    const el = (slide?.els || []).find((e) => e && String(e.id) === String(mode.elId));
    if (el && Array.isArray(el.anims)) {
      const firstTf = el.anims.find((x) => x && x.name === 'transform');
      const rest = firstTf?.from || el.anims[mode.ai]?.from;
      if (rest) {
        withHistory(() => {
          st.patchElement(el.id, transformPatchFromSnap(rest));
        });
      }
    }
    useUiStore.getState().setTransformEditMode(null);
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
    const mode = useUiStore.getState().transformEditMode;
    if (mode && String(mode.elId) === String(elId) && +mode.ai === +index) {
      this.cancelTransformEdit();
    }
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

  clearSlideAnims() {
    const st0 = usePresentationStore.getState();
    const slide0 = st0.slides[st0.cur];
    if (!slide0) return;
    const hasEl = (slide0.els || []).some((e) => e && !e._isDecor && (e.anims || []).length);
    const hasOrder = !!(slide0.animOrder || []).length;
    const hasCams = !!(slide0.cameras || []).length;
    if (!hasEl && !hasOrder && !hasCams) {
      useUiStore.getState().showToast(ru() ? 'На слайде нет анимаций' : 'No animations on this slide', 'warn');
      return;
    }
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (!slide) return;
      (slide.els || []).forEach((e) => {
        if (e && !e._isDecor && (e.anims || []).length) st.patchElement(e.id, { anims: [] });
      });
      usePresentationStore.getState().patchSlide(st.cur, { animOrder: [], cameras: [] });
    });
    useUiStore.getState().showToast(ru() ? 'Анимации слайда удалены' : 'Slide animations cleared', 'ok');
  },

  hasAnimClipboard() {
    return !!animClipboard;
  },

  copyAnimEntry(loc) {
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    if (!slide || !loc || loc.scope === 'end') return false;
    const entry = peekAnimOrderAt(peekAnimOrder(slide), loc);
    const snap = snapshotAnimOrderEntry(slide, entry);
    if (!snap) return false;
    animClipboard = snap;
    useUiStore.getState().showToast(ru() ? 'Анимация скопирована' : 'Animation copied', 'ok');
    return true;
  },

  pasteAnimEntry(loc) {
    if (!animClipboard) {
      useUiStore.getState().showToast(ru() ? 'Буфер анимаций пуст' : 'Animation clipboard is empty', 'warn');
      return false;
    }
    let ok = false;
    withHistory(() => {
      const entry = materializeAnimClipboard(JSON.parse(JSON.stringify(animClipboard)));
      ok = insertMaterializedAnim(loc, entry);
    });
    if (ok) useUiStore.getState().showToast(ru() ? 'Анимация вставлена' : 'Animation pasted', 'ok');
    return ok;
  },

  duplicateAnimEntry(loc) {
    const st = usePresentationStore.getState();
    const slide = st.slides[st.cur];
    if (!slide || !loc || loc.scope === 'end') return false;
    const entry = peekAnimOrderAt(peekAnimOrder(slide), loc);
    const snap = snapshotAnimOrderEntry(slide, entry);
    if (!snap) return false;
    let ok = false;
    withHistory(() => {
      const created = materializeAnimClipboard(JSON.parse(JSON.stringify(snap)));
      ok = insertMaterializedAnim(loc, created);
    });
    if (ok) useUiStore.getState().showToast(ru() ? 'Анимация продублирована' : 'Animation duplicated', 'ok');
    return ok;
  },

  deleteAnimEntry(loc) {
    const st0 = usePresentationStore.getState();
    const slide0 = st0.slides[st0.cur];
    if (!slide0 || !loc || loc.scope === 'end') return false;
    const entry = peekAnimOrderAt(peekAnimOrder(slide0), loc);
    if (!entry) return false;
    withHistory(() => {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      if (!slide) return;
      if (entry.kind === 'pause') {
        const orderSlide = cloneAnimOrderSlide(slide);
        if (removeAnimBlockFromSlide(orderSlide, entry.id, false)) {
          st.patchSlide(st.cur, { animOrder: orderSlide.animOrder });
        }
        return;
      }
      if (entry.kind === 'camera') {
        st.removeCamera(entry.camId);
        return;
      }
      if (entry.kind === 'repeat') {
        const acc = collectAnimOrderTargets(entry);
        const byEl = new Map();
        acc.leaves.forEach((leaf) => {
          const id = String(leaf.elId);
          if (!byEl.has(id)) byEl.set(id, []);
          byEl.get(id).push(+leaf.ai);
        });
        let orderSlide = cloneAnimOrderSlide(usePresentationStore.getState().slides[st.cur]);
        byEl.forEach((ais, elId) => {
          ais.sort((a, b) => b - a);
          const live = usePresentationStore.getState();
          const el = (live.slides[live.cur]?.els || []).find((e) => e && String(e.id) === String(elId));
          if (!el || !Array.isArray(el.anims)) return;
          const next = el.anims.slice();
          ais.forEach((ai) => {
            if (ai < 0 || ai >= next.length) return;
            next.splice(ai, 1);
            remapAnimOrderAfterRemove(orderSlide, el.id, ai);
          });
          live.patchElement(el.id, { anims: next });
        });
        acc.cams.forEach((camId) => usePresentationStore.getState().removeCamera(camId));
        orderSlide = {
          ...usePresentationStore.getState().slides[st.cur],
          animOrder: orderSlide.animOrder,
        };
        removeAnimBlockFromSlide(orderSlide, entry.id, false);
        usePresentationStore.getState().patchSlide(st.cur, { animOrder: orderSlide.animOrder });
        return;
      }
      if (entry.elId != null) {
        const live = usePresentationStore.getState();
        const el = (live.slides[live.cur]?.els || []).find((e) => e && String(e.id) === String(entry.elId));
        if (!el || !Array.isArray(el.anims) || !el.anims[entry.ai]) return;
        const list = el.anims.slice();
        list.splice(entry.ai, 1);
        live.patchElement(el.id, { anims: list });
        const curSlide = live.slides[live.cur];
        if (curSlide) {
          const orderSlide = cloneAnimOrderSlide(curSlide);
          remapAnimOrderAfterRemove(orderSlide, el.id, entry.ai);
          live.patchSlide(live.cur, { animOrder: orderSlide.animOrder });
        }
      }
    });
    return true;
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
    // A drawing "grouped" via inkDraw's multi-select (mergeInkIntoOneHost, when applying the
    // animation to several separately-selected lines at once) is really ONE inkhost element
    // wrapping several strokes under a shared groupId — not a normal multi-element .els
    // group. The groupId-based ungroupElements below has nothing to act on for a single
    // selected element, so it silently did nothing. Handle that case first.
    if (ids.length === 1) {
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      const el = (slide?.els || []).find((e) => e && String(e.id) === String(ids[0]));
      if (el?.type === 'inkhost' && (el.inkIds || []).length > 1) {
        const n = withHistory(() => usePresentationStore.getState().splitInkHost(el.id));
        if (n) {
          useUiStore.getState().showToast(ru() ? 'Разгруппировано' : 'Ungrouped', 'ok');
          return;
        }
      }
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
    useUiStore.getState().clearMediaTriggerPick();
    useUiStore.getState().clearTimerTriggerPick();
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
    // Capture text/table selection before the modal steals focus.
    captureInlineLinkSelection();
    useUiStore.getState().openLinkModal();
  },

  syncCaretLink() {
    const info = readCaretInlineLink();
    if (!info) {
      useUiStore.getState().setCaretLink(null);
      return null;
    }
    useUiStore.getState().setCaretLink({
      href: info.existingHref || '',
      hover: info.existingHover || DEFAULT_LINK_HOVER,
      hoverScheme: info.existingHoverScheme || null,
      hostId: info.hostId,
      cellR: info.cellR,
      cellC: info.cellC,
    });
    return info;
  },

  /** Update hover color on the inline <a> under the caret (or saved selection). */
  setInlineLinkHover(color, schemeRef) {
    const hover = String(color || DEFAULT_LINK_HOVER).trim() || DEFAULT_LINK_HOVER;
    captureInlineLinkSelection();
    const info = peekInlineLinkSelection() || readCaretInlineLink();
    if (!info?.editable) return;
    const a =
      info.anchor ||
      (() => {
        try {
          const sel = window.getSelection();
          const n = sel?.anchorNode;
          const el = n?.nodeType === 1 ? n : n?.parentElement;
          return el?.closest?.('a[href]') || null;
        } catch (_) {
          return null;
        }
      })();
    if (!a || !info.editable.contains(a)) return;
    styleInlineAnchor(a, { hover, schemeRef: schemeRef === undefined ? undefined : schemeRef });
    const el = currentEl();
    if (!el) return;
    const html = info.editable.innerHTML;
    withHistory(() => {
      if (info.cellR != null && info.cellC != null) {
        const id = info.hostId || el.id;
        const { slides, cur } = usePresentationStore.getState();
        const tbl = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
        if (tbl?.type === 'table') {
          const cells = mapTableCells(tbl, (cell, rr, cc) =>
            rr === info.cellR && cc === info.cellC
              ? { ...cell, r: rr, c: cc, html }
              : { ...cell, r: rr, c: cc }
          );
          usePresentationStore.getState().patchElement(id, { cells });
        }
      } else {
        usePresentationStore.getState().patchElement(info.hostId || el.id, { html });
      }
    });
    editorApi.syncCaretLink();
  },

  applyLink({ type, url, target, slideIdx, hover, hoverScheme }) {
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
    const hoverColor = hover != null && hover !== '' ? hover : DEFAULT_LINK_HOVER;
    const hoverSr = hoverScheme === undefined ? undefined : hoverScheme;
    // Prefer wrapping the current text selection (incl. table cell) when present.
    if (href && peekInlineLinkSelection()) {
      const inline = applyInlineLinkToSelection(href, type === 'url' ? linkt : undefined, {
        hover: hoverColor,
        schemeRef: hoverSr === undefined ? null : hoverSr,
      });
      if (inline?.html != null) {
        withHistory(() => {
          const id = inline.hostId || el.id;
          if (inline.cellR != null && inline.cellC != null) {
            const { slides, cur } = usePresentationStore.getState();
            const tbl = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
            if (tbl?.type === 'table') {
              const cells = mapTableCells(tbl, (cell, rr, cc) =>
                rr === inline.cellR && cc === inline.cellC
                  ? { ...cell, r: rr, c: cc, html: inline.html }
                  : { ...cell, r: rr, c: cc }
              );
              usePresentationStore.getState().patchElement(id, { cells });
            }
          } else {
            usePresentationStore.getState().patchElement(id, { html: inline.html });
          }
        });
        clearInlineLinkSelection();
        useUiStore.getState().closeLinkModal();
        useUiStore.getState().showToast(ru() ? 'Ссылка применена' : 'Link applied', 'ok');
        return;
      }
    }
    withHistory(() => {
      const store = usePresentationStore.getState();
      const els = store.slides[store.cur]?.els || [];
      const targets = el.groupId
        ? els.filter((e) => e && e.groupId === el.groupId)
        : [el];
      targets.forEach((t) => {
        if (href) {
          store.patchElement(t.id, {
            link: href,
            linkt: type === 'url' ? linkt : undefined,
            linkHover: hoverColor,
            linkHoverScheme: hoverSr === undefined ? null : hoverSr,
          });
        } else {
          store.patchElement(t.id, {
            link: '',
            linkt: undefined,
            linkHover: undefined,
            linkHoverScheme: undefined,
          });
        }
      });
    });
    clearInlineLinkSelection();
    useUiStore.getState().closeLinkModal();
    useUiStore.getState().showToast(ru() ? 'Ссылка применена' : 'Link applied', 'ok');
  },

  removeLink() {
    const el = currentEl();
    if (!el) return;
    if (peekInlineLinkSelection()) {
      const inline = removeInlineLinkFromSelection();
      if (inline?.html != null) {
        withHistory(() => {
          const id = inline.hostId || el.id;
          if (inline.cellR != null && inline.cellC != null) {
            const { slides, cur } = usePresentationStore.getState();
            const tbl = (slides[cur]?.els || []).find((e) => e && String(e.id) === String(id));
            if (tbl?.type === 'table') {
              const cells = mapTableCells(tbl, (cell, rr, cc) =>
                rr === inline.cellR && cc === inline.cellC
                  ? { ...cell, r: rr, c: cc, html: inline.html }
                  : { ...cell, r: rr, c: cc }
              );
              usePresentationStore.getState().patchElement(id, { cells });
            }
          } else {
            usePresentationStore.getState().patchElement(id, { html: inline.html });
          }
        });
        clearInlineLinkSelection();
        useUiStore.getState().closeLinkModal();
        useUiStore.getState().showToast(ru() ? 'Ссылка убрана' : 'Link removed', 'ok');
        return;
      }
    }
    withHistory(() => {
      const store = usePresentationStore.getState();
      const els = store.slides[store.cur]?.els || [];
      const targets = el.groupId
        ? els.filter((e) => e && e.groupId === el.groupId)
        : [el];
      targets.forEach((t) => store.patchElement(t.id, { link: '', linkt: undefined }));
    });
    clearInlineLinkSelection();
    useUiStore.getState().closeLinkModal();
    useUiStore.getState().showToast(ru() ? 'Ссылка убрана' : 'Link removed', 'ok');
  },

  /** Editor Ctrl/Cmd+click: jump to slide in the editor, or open URL in a new tab. */
  followLink(link, fromIdx) {
    if (!link) return false;
    if (String(link).startsWith('#slide-')) {
      const store = usePresentationStore.getState();
      const si = resolveSlideLinkIndex(link, fromIdx != null ? fromIdx : store.cur, store.slides);
      if (si == null) return false;
      store.setCur(si);
      useSelectionStore.getState().clearSelection?.();
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

  async saveToLibrary(title) {
    const data = usePresentationStore.getState().exportDeck();
    const rec = await idbSaveLibrary(title || data.title || 'Без названия', data);
    useUiStore.getState().showToast(ru() ? 'Сохранено в библиотеку' : 'Saved to library', 'ok');
    return rec;
  },

  async listLibrary() {
    return idbListLibrary();
  },

  async openLibraryItem(id) {
    const rec = await idbGetLibrary(id);
    if (!rec?.data?.slides?.length) {
      useUiStore.getState().showToast(ru() ? 'Презентация не найдена' : 'Presentation not found', 'err');
      return;
    }
    useHistoryStore.getState().clear();
    usePresentationStore.getState().importDeck(rec.data);
    pick(null);
    useUiStore.getState().showToast(ru() ? `Открыто: ${rec.title}` : `Opened: ${rec.title}`, 'ok');
  },

  async deleteLibraryItem(id) {
    await idbDeleteLibrary(id);
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
    editorApi.autoPlaceKeepTheme();
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
    const variant = autoPlaceLayoutVariant;
    autoPlaceLayoutVariant = (autoPlaceLayoutVariant + 1) % 3;
    withHistory(() => {
      const s = usePresentationStore.getState();
      const { slides, cur } = autoPlaceDeck(s.slides, s.getSlideSelection(), {
        canvasW: s.canvasW,
        canvasH: s.canvasH,
        cur: s.cur,
        theme: getTheme(s.appliedThemeIdx),
        variant,
        splitOverflow: false,
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

  startStylePipette() {
    const { selId, multiSel } = useSelectionStore.getState();
    const ids = (multiSel?.length ? multiSel : selId ? [selId] : []).map(String);
    if (!ids.length) {
      useUiStore.getState().showToast(ru() ? 'Сначала выберите объект-получатель' : 'Select a target object first', 'warn');
      return;
    }
    const { cur } = usePresentationStore.getState();
    useUiStore.getState().setStylePaintMode(false);
    useUiStore.getState().setStylePipetteTargets({ slideIdx: cur, ids });
    useUiStore.getState().showToast(
      ru() ? 'Щёлкните объект-образец, чтобы снять с него стиль' : 'Click a sample object to pick up its style',
      'ok'
    );
  },

  cancelStylePipette() {
    useUiStore.getState().setStylePipetteTargets(null);
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

  addLego(pieceId = '2f', opts = {}) {
    if (typeof opts === 'string') opts = { color: opts };
    const st = usePresentationStore.getState();
    const def = defaultLegoColor(st.appliedThemeIdx);
    const color = opts.color || def.color;
    const schemeRef = opts.schemeRef !== undefined ? opts.schemeRef : def.schemeRef;
    const piece = legoPieceById(pieceId);
    const fields = defaultLegoFields(piece, color, schemeRef);
    if (opts.clientX != null && opts.clientY != null) {
      const pt = clientPointToCanvas(opts.clientX, opts.clientY, st.canvasW, st.canvasH);
      if (!pt) return null;
      const sz = legoSizeFor(fields);
      fields.x = pt.x - sz.w / 2;
      fields.y = pt.y - sz.h / 2;
    } else if (opts.x != null) {
      fields.x = opts.x;
      if (opts.y != null) fields.y = opts.y;
    }
    const pos = resolveLegoFreePos(fields, st.slides[st.cur]?.els || [], st.canvasW, st.canvasH);
    fields.x = pos.x;
    fields.y = pos.y;
    const id = withHistory(() => usePresentationStore.getState().addElement(fields));
    pick(id);
    return id;
  },

  applyLegoPiece(pieceId) {
    const el = currentEl();
    if (!el || el.type !== 'lego') return;
    const piece = legoPieceById(pieceId);
    const st = usePresentationStore.getState();
    const next = {
      ...el,
      ...fieldsFromLegoPiece(piece),
    };
    Object.assign(next, legoSizeFor(next));
    const pos = resolveLegoFreePos(next, st.slides[st.cur]?.els || [], st.canvasW, st.canvasH);
    withHistory(() =>
      st.patchElement(el.id, {
        legoView: next.legoView,
        legoCols: next.legoCols,
        legoRows: next.legoRows,
        legoStuds: next.legoStuds,
        legoTall: next.legoTall,
        legoSlope: next.legoSlope,
        legoStair: next.legoStair,
        w: next.w,
        h: next.h,
        x: pos.x,
        y: pos.y,
      })
    );
  },

  openLegoPicker() {
    useUiStore.getState().closeAppletModal();
    const open = () => useUiStore.getState().setPanel('lego');
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(open));
    } else {
      setTimeout(open, 0);
    }
  },

  addGraph(exprOrLatex = 'sin(x)') {
    return import('./graph.js').then(({ defaultGraphFields }) => {
      const fields = defaultGraphFields({ latex: exprOrLatex, ...graphThemeOptions() });
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
    await rebuildGraphElAsync(next, { systemDark: presentationSystemDark() });
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, {
        graphImg: next.graphImg,
        graphAxesImg: next.graphAxesImg || null,
        graphCurveImg: next.graphCurveImg || null,
        graphPaths: next.graphPaths || null,
        graphPathW: next.graphPathW || null,
        graphPathH: next.graphPathH || null,
        graphColor: next.graphColor,
        graphColorScheme: next.graphColorScheme,
        graphBg: next.graphBg,
        graphDark: next.graphDark,
        graphChromeVer: next.graphChromeVer,
        graphTheme: next.graphTheme,
        graphShowLabel: next.graphShowLabel,
        graphAnimate: next.graphAnimate,
        graphLineWidth: next.graphLineWidth,
        graphAnimDur: next.graphAnimDur,
        graphXMin: next.graphXMin,
        graphXMax: next.graphXMax,
        graphYMin: next.graphYMin,
        graphYMax: next.graphYMax,
        graphYCenter: next.graphYCenter,
        graphScale: next.graphScale,
        graphExpr: next.graphExpr,
        graphExprs: next.graphExprs,
        graphLines: next.graphLines,
        chemKey: next.chemKey,
        chemName: next.chemName,
        graphLatex: next.graphLatex,
      })
    );
  },

  /** One-shot: bake graphs whose axis chrome predates GRAPH_CHROME_VER. */
  async rebuildStaleGraphs() {
    const { GRAPH_CHROME_VER } = await import('./graph.js');
    const ids = [];
    (usePresentationStore.getState().slides || []).forEach((s) => {
      (s?.els || []).forEach((el) => {
        if (el && el.type === 'graph' && +el.graphChromeVer !== GRAPH_CHROME_VER) {
          ids.push(String(el.id));
        }
      });
    });
    if (ids.length) await rebuildGraphElementsByIds(ids);
  },

  async nudgeSelectedGraph(dx = 0, dy = 0) {
    const el = currentEl();
    if (!el || el.type !== 'graph' || el.graphKind === 'chem' || el.graphKind === 'logic') return;
    const { nudgeGraphView, rebuildGraphElAsync } = await import('./graph.js');
    const next = { ...el };
    nudgeGraphView(next, dx, dy);
    await rebuildGraphElAsync(next, { systemDark: presentationSystemDark() });
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, {
        graphImg: next.graphImg,
        graphAxesImg: next.graphAxesImg || null,
        graphCurveImg: next.graphCurveImg || null,
        graphPaths: next.graphPaths || null,
        graphPathW: next.graphPathW || null,
        graphPathH: next.graphPathH || null,
        graphXMin: next.graphXMin,
        graphXMax: next.graphXMax,
        graphYMin: next.graphYMin,
        graphYMax: next.graphYMax,
        graphYCenter: next.graphYCenter,
        graphScale: next.graphScale,
      })
    );
  },

  async zoomSelectedGraph(factor = 1) {
    const el = currentEl();
    if (!el || el.type !== 'graph' || el.graphKind === 'chem' || el.graphKind === 'logic') return;
    const { zoomGraphView, rebuildGraphElAsync } = await import('./graph.js');
    const next = { ...el };
    zoomGraphView(next, factor);
    await rebuildGraphElAsync(next, { systemDark: presentationSystemDark() });
    withHistory(() =>
      usePresentationStore.getState().patchElement(el.id, {
        graphImg: next.graphImg,
        graphAxesImg: next.graphAxesImg || null,
        graphCurveImg: next.graphCurveImg || null,
        graphPaths: next.graphPaths || null,
        graphPathW: next.graphPathW || null,
        graphPathH: next.graphPathH || null,
        graphXMin: next.graphXMin,
        graphXMax: next.graphXMax,
        graphYMin: next.graphYMin,
        graphYMax: next.graphYMax,
        graphYCenter: next.graphYCenter,
        graphScale: next.graphScale,
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
        ...graphThemeOptions(),
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
    svgContent = repairImportedSvgMarkup(svgContent);
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

  playSlideAnims(opts) {
    return import('./slideAnimPlay.js').then((m) => m.playSlideAnimPlay(opts || {}));
  },

  stopSlideAnims() {
    return import('./slideAnimPlay.js').then((m) => m.stopSlideAnimPlay());
  },
};

export default editorApi;

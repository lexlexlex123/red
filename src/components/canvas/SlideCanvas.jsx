import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { extraGuidesKind, useUiStore } from '../../stores/uiStore';
import { classificationGuideLines } from '../../editor/classificationApplet.js';
import ImageSortMarkersLayer from './ImageSortMarkersLayer.jsx';
import { useHistoryStore } from '../../stores/historyStore';
import { editorApi } from '../../editor/editorApi';
import { buildBasicShapeSVG, shapeOptsFromEl, shapeRxPx } from '../../shared/shapes.js';
import { getShapeMeta, shapeNeedsOverflowVisible } from '../../shared/shapesCatalog.js';
import AlignBar from './AlignBar.jsx';
import CanvasCtxMenu, {
  canPasteElements,
  canPasteTableCells,
  ctxGroupMenuState,
  qrTextFromEl,
} from './CanvasCtxMenu.jsx';
import EditableHtml from './EditableHtml.jsx';
import TextQuickBar from './TextQuickBar.jsx';
import { versionAttr } from '../../editor/versions.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from '../../editor/canvasDims.js';
import { snapBox } from '../../editor/objectSnap.js';
import { connectorPathFor, resolveControlPoints, connectorDashArray, connectorMarkerUrl, connectorEndpoints, snapToNearestEdge, defaultControlPoints, connectorsMarkerDefsSvg, connectorLinecap, connectorsAnimStyleCss, connectorAnimStyle, riderPositionFor, resolveConnectorStroke, elWithRideDisplay } from '../../editor/connectors.js';
import { inkStrokeSvgMarkup } from '../../editor/inkRender.js';
import { inkFillsSvgMarkup } from '../../editor/inkFill.js';
import { pickInkAt, inkIntersectsRect, inkSelectionHaloMarkup } from '../../editor/inkSelect.js';
import {
  hostedInkIdSet,
  inkHostInnerMarkup,
  inkHostHitMarkup,
} from '../../editor/inkHost.js';
import { isInkDrawActiveFor } from '../../editor/inkDrawPlay.js';
import {
  brushStamps,
  fillBrushStamps,
  paintNeonStamps,
  hardStrokeGeom,
  isBrushFamily,
  normalizeInkPoints,
} from '../../editor/inkBrush.js';
import { measureTextHeight } from '../../editor/textFit.js';
import {
  TEXT_PH_COLOR,
  isLayoutTextPlaceholder,
  textPlainIsBlank,
  restoreTextPlaceholderPatch,
} from '../../editor/textPlaceholder.js';
import {
  CANVAS_ZOOM_PAD,
  clampCanvasZoom,
  centerCanvasViewport,
  isCanvasZoomedIn,
} from '../../editor/canvasViewport.js';
import { listShapeAdjHandles, patchFromAdjDrag } from '../../editor/shapeAdjHandles.js';
import { listShapeNodeHandles, patchShapeNodeDrag, shapeSupportsNodes } from '../../editor/shapeNodes.js';
import { listLineEpHandles, migrateLineCapGeometry, lineCanvasEnds } from '../../editor/lineGeom.js';
import {
  lineEndLooksJoined,
  collectMateDragState,
  patchesDragJunction,
  snapLineEpToGeometry,
  joinLineEnds,
  clearLineJoin,
  coalesceJunction,
  endJunctionId,
  migrateSlideLineJoins,
  isLegacyJoinRef,
} from '../../editor/lineJoins.js';
import {
  listCurveEditorHandles,
  moveCurveNode,
  moveCurveCp,
  bendCurveSegment,
  nearestCurveSegment,
  cycleCurveNodeType,
  defaultCurvePoints,
  curveCanvasToNorm,
  curveNormToCanvas,
  applyCurveBBox,
} from '../../editor/curveEditor.js';
import {
  createGuide,
  clipGuideToSlide,
  guideIntersectsSlide,
  hitTestGuide,
  customGuidesToSnapLines,
  snapPointToGuideLines,
  snapBoxToGuideLines,
  snapGuideToObjectEdges,
  projectPointOntoGuide,
} from '../../editor/slideGuides.js';
import { getIconById, onIconsReady } from '../../editor/iconsLazy.js';
import { iconAnimEnabled } from '../../editor/iconAnim.js';
import AnimatedIcon from './AnimatedIcon.jsx';
import { DEFAULT_TEXT_FONT_FAMILY, elementFontFamily, parseCsNumber } from '../../editor/fonts.js';
import { getTheme, resolveElTextColor, resolveSchemeColor } from '../../editor/themes.js';
import { underlineBoxProps, prepareTextUnderlineHtml } from '../../editor/textUnderline.js';
import { getTableCell, tableCellBg, tableCellFontStyle, tableCellRadiusStyle, tableColWidthsPx, tableRowHeightsPx } from '../../editor/tableCells.js';
import { hitTableBorderSide, paintHoverShadow, sideOnGridLine, tableCellBorderStyle, tableGridLineId } from '../../editor/tableBorders.js';
import { imageRenderStyles, normImgFrame, imgBorderSvgMarkup, getCropFullBox, imgRibbonTapeStyle, imgRibbonTapeMarkup, polaroidCaptionStyle } from '../../editor/imgStyles.js';
import {
  imageHasCrop,
  imageShowsUncrop,
  isUncropHoverPreset,
  uncropViewEl,
  uncropWindowStyles,
} from '../../editor/imgUncrop.js';
import ImageCropOverlay from './ImageCropOverlay.jsx';
import ShapeFillImgOverlay from './ShapeFillImgOverlay.jsx';
import { normalizeFillImgLayout, shapeHasFillImg } from '../../editor/shapeFillImg.js';
import CameraOverlay from './CameraOverlay.jsx';
import MotionOverlay from './MotionOverlay.jsx';
import SlideBgImgLayer from './SlideBgImgLayer.jsx';
import { slideSolidBg } from '../../editor/slideBgImg.js';
import { elBoxTransform, applyResize, preserveResizeAspect, resizeHandleCenters, resizeHandleCursor, nearCornerRot, elRotationDeg } from '../../editor/elTransform.js';
import { resolveMediaSrc } from '../../editor/mediaStore.js';
import { audioPlayerHostStyle } from '../../editor/mediaPlay.js';
import { formulaTagLabelOf } from '../../editor/formulaLayout.js';
import ThemedAudioPlayer from './ThemedAudioPlayer.jsx';
import { unionBBox, scaleGroupMembers, rotateGroupMembers } from '../../editor/groupGeom.js';
import {
  buildHfSrcdocClickThrough,
  hfTitleFromSrc,
  installHtmlFrameTransparentPointerListener,
  isHttpUrl,
  HF_SANDBOX,
} from '../../editor/htmlFrame.js';
import {
  codeBlockSurfaceStyle,
  codeDisplayHtml,
  codeGutterCss,
  codeLineNumbersText,
} from '../../editor/codeHighlight.js';
import { elFilterCss, elInsetShadowSvgMarkup, hasElShadow, isElShadowInset } from '../../editor/elShadow.js';
import { recolorReactFilter } from '../../editor/recolorPlay.js';
import { shapeBlurOverlayStyle, shapeBlurPx } from '../../editor/shapeBlur.js';
import { shapeHitMode, shapeClipPath, shapeLineHitSvg, shapeCurveHitSvg } from '../../editor/shapeHit.js';
import { shapeTextBoxStyle, shapeTextWarpCss } from '../../editor/shapeText.js';
import { buildLineAngleContent } from '../../editor/lineAngle.js';
import { hoverMotionStyle, hoverTargetIdAt, opaqueElAt, isImgColorHoverPreset } from '../../editor/hoverFx.js';
import { buildChartSvg, chartWrapStyle } from '../../editor/tableChart.js';
import { floatFramesForEl, floatIsInfinite } from '../../editor/floatPlay.js';
import { danceKeyframesCss, danceIsInfinite } from '../../editor/dancePlay.js';
import { swingKeyframesCss, swingIsInfinite, swingOriginCss } from '../../editor/swingPlay.js';
import { isPulseFamilyAnim, pulseCssIteration, pulseKeyframesName } from '../../editor/pulsePlay.js';
import Model3dView from './Model3dView.jsx';
import AppletView from './AppletView.jsx';
import DecorGlView from './DecorGlView.jsx';
import DecorSvgHost from './DecorSvgHost.jsx';
import { attachDecorGlCfg, decorUsesGl } from '../../editor/layouts.js';
import {
  buildLegoSvg,
  isLegoTop,
  LEGO_SNAP,
  LEGO_U,
  legoSnapSteps,
  resolveLegoFreePos,
  resolveLegoGroupOffset,
  snapLegoCoord,
} from '../../editor/lego.js';
import { textBgLayerStyle, textColorGradStyle } from '../../editor/textBg.js';
import {
  textBorderBoxStyle,
  textBorderSvgMarkup,
  needsTextBorderOverflow,
} from '../../editor/textBorder.js';
import { textGlyphShadowStyle, textBlockShadowStyle, textNeedsOverflowVisible } from '../../editor/textShadow.js';
import { textPadCss } from '../../editor/textPad.js';
import { textBorderRadiusCss } from '../../editor/textRadius.js';
import { textAlignSelf } from '../../editor/textAlign.js';

const RESIZE_HANDLES = [
  { id: 'tl', dx: -1, dy: -1, cursor: 'nwse-resize' },
  { id: 'tm', dx: 0, dy: -1, cursor: 'ns-resize' },
  { id: 'tr', dx: 1, dy: -1, cursor: 'nesw-resize' },
  { id: 'ml', dx: -1, dy: 0, cursor: 'ew-resize' },
  { id: 'mr', dx: 1, dy: 0, cursor: 'ew-resize' },
  { id: 'bl', dx: -1, dy: 1, cursor: 'nesw-resize' },
  { id: 'bm', dx: 0, dy: 1, cursor: 'ns-resize' },
  { id: 'br', dx: 1, dy: 1, cursor: 'nwse-resize' },
];

function pulseNameFromCls(cls) {
  const s = String(cls || '');
  if (s.includes('pulse')) return 'pulse';
  if (s.includes('shake')) return 'shake';
  if (s.includes('flash')) return 'flash';
  return '';
}

const EXTRA_GUIDE_TH = 7;
const GRID_GUIDE_STEP = 120;
const MARGIN_GUIDE_INSET = 40;
const COL_GUTTER = 40;
const COL_TOP_GUIDE_1 = 120;
const COL_TOP_GUIDE_2 = 160;

function extraGuideLines(mode, canvasW, canvasH) {
  const kind = extraGuidesKind(mode);
  const lines = [];
  if (kind === 'grid') {
    for (let x = GRID_GUIDE_STEP; x < canvasW; x += GRID_GUIDE_STEP) lines.push({ t: 'v', pos: x });
    for (let y = GRID_GUIDE_STEP; y < canvasH; y += GRID_GUIDE_STEP) lines.push({ t: 'h', pos: y });
  } else if (kind === 'margin') {
    lines.push({ t: 'v', pos: MARGIN_GUIDE_INSET }, { t: 'v', pos: canvasW - MARGIN_GUIDE_INSET });
    lines.push({ t: 'h', pos: MARGIN_GUIDE_INSET }, { t: 'h', pos: canvasH - MARGIN_GUIDE_INSET });
  } else if (kind === 'col2' || kind === 'col3') {
    // Same outer margins as "Поля", plus vertical gutter guides splitting the content area
    // into 2 or 3 equal columns (each gutter COL_GUTTER px wide), plus two fixed horizontal
    // guides near the top for aligning a title/header block.
    lines.push({ t: 'v', pos: MARGIN_GUIDE_INSET }, { t: 'v', pos: canvasW - MARGIN_GUIDE_INSET });
    const contentW = Math.max(0, canvasW - MARGIN_GUIDE_INSET * 2);
    const cols = kind === 'col2' ? 2 : 3;
    const gutters = cols - 1;
    const colW = Math.max(0, (contentW - gutters * COL_GUTTER) / cols);
    let x = MARGIN_GUIDE_INSET;
    for (let i = 0; i < gutters; i++) {
      x += colW;
      lines.push({ t: 'v', pos: x }, { t: 'v', pos: x + COL_GUTTER });
      x += COL_GUTTER;
    }
    lines.push({ t: 'h', pos: MARGIN_GUIDE_INSET }, { t: 'h', pos: canvasH - MARGIN_GUIDE_INSET });
    lines.push({ t: 'h', pos: COL_TOP_GUIDE_1 }, { t: 'h', pos: COL_TOP_GUIDE_2 });
  }
  return lines;
}

function snapPointToGuides(x, y, lines, th = EXTRA_GUIDE_TH) {
  return snapPointToGuideLines(x, y, lines, th);
}

function snapTranslateToExtraGuides(x, y, w, h, lines, th = EXTRA_GUIDE_TH) {
  return snapBoxToGuideLines(x, y, w, h, lines, th);
}

function snapResizeToGuides(box, handle, lines, others, canvasW, canvasH, th = EXTRA_GUIDE_TH) {
  let { x, y, w, h } = box;
  const min = 1;
  const hit = [];
  const vertical = [...lines.filter((g) => g.t === 'v')];
  const horizontal = [...lines.filter((g) => g.t === 'h')];
  [0, canvasW / 2, canvasW].forEach((pos) => vertical.push({ t: 'v', pos }));
  [0, canvasH / 2, canvasH].forEach((pos) => horizontal.push({ t: 'h', pos }));
  (others || []).forEach((el) => {
    if (!el || el._isDecor) return;
    const ex = +el.x || 0;
    const ey = +el.y || 0;
    const ew = +el.w || 0;
    const eh = +el.h || 0;
    [ex, ex + ew / 2, ex + ew].forEach((pos) => vertical.push({ t: 'v', pos }));
    [ey, ey + eh / 2, ey + eh].forEach((pos) => horizontal.push({ t: 'h', pos }));
  });

  function snapEdge(candidates, edge, axis, direction) {
    if (!direction) return;
    let best = null;
    candidates.forEach((guide) => {
      const dist = Math.abs(edge - guide.pos);
      if (dist >= th || (best && dist >= best.dist)) return;
      best = { ...guide, dist };
    });
    if (!best) return;
    if (axis === 'x') {
      if (direction > 0) w = Math.max(min, best.pos - x);
      else {
        const right = x + w;
        x = best.pos;
        w = Math.max(min, right - x);
      }
    } else if (direction > 0) h = Math.max(min, best.pos - y);
    else {
      const bottom = y + h;
      y = best.pos;
      h = Math.max(min, bottom - y);
    }
    hit.push({ t: best.t, pos: best.pos });
  }

  if (handle.dx) snapEdge(vertical, handle.dx > 0 ? x + w : x, 'x', handle.dx);
  if (handle.dy) snapEdge(horizontal, handle.dy > 0 ? y + h : y, 'y', handle.dy);

  // Angled guides: snap the moving corner (or mid-edge) onto the line.
  const angled = lines.filter((g) => g && g.t === 'a');
  if (angled.length) {
    const mx = handle.dx < 0 ? x : handle.dx > 0 ? x + w : x + w / 2;
    const my = handle.dy < 0 ? y : handle.dy > 0 ? y + h : y + h / 2;
    let best = null;
    angled.forEach((g) => {
      const p = projectPointOntoGuide(mx, my, g);
      if (p.dist < th && (!best || p.dist < best.dist)) best = { ...p, g };
    });
    if (best) {
      const dx = best.x - mx;
      const dy = best.y - my;
      if (handle.dx > 0) w = Math.max(min, w + dx);
      else if (handle.dx < 0) {
        x += dx;
        w = Math.max(min, w - dx);
      }
      if (handle.dy > 0) h = Math.max(min, h + dy);
      else if (handle.dy < 0) {
        y += dy;
        h = Math.max(min, h - dy);
      }
      hit.push({ t: 'a', x: best.g.x, y: best.g.y, angle: best.g.angle });
    }
  }

  const q = (n) => Math.round(n * 100) / 100;
  return { x: q(x), y: q(y), w: q(w), h: q(h), hit };
}

function snapResizeToGrid(box, handle, step, skip = { v: false, h: false }) {
  const st = Math.max(1, Math.round(step) || 20);
  let { x, y, w, h } = box;
  const min = 1;
  if (!skip.v) {
    if (handle.dx > 0) {
      w = Math.max(min, Math.round((x + w) / st) * st - x);
    } else if (handle.dx < 0) {
      const right = x + w;
      x = Math.round(x / st) * st;
      w = Math.max(min, right - x);
    }
  }
  if (!skip.h) {
    if (handle.dy > 0) {
      h = Math.max(min, Math.round((y + h) / st) * st - y);
    } else if (handle.dy < 0) {
      const bottom = y + h;
      y = Math.round(y / st) * st;
      h = Math.max(min, bottom - y);
    }
  }
  const q = (n) => Math.round(n * 100) / 100;
  return { x: q(x), y: q(y), w: q(w), h: q(h) };
}

function textFromEl(el) {
  if (el.html) return String(el.html).replace(/<[^>]+>/g, '');
  return el.text || '';
}

function ShapeTextLayer({ el, editing, onCommitText }) {
  return (
    <div className={`react-shape-text${editing ? ' is-editing' : ''}`} style={shapeTextBoxStyle(el, { editing })}>
      <EditableHtml
        html={el.shapeHtml || ''}
        editing={editing}
        onCommit={onCommitText}
        style={{
          width: '100%',
          textAlign: 'inherit',
          minHeight: 0,
          outline: 'none',
          lineHeight: 1.15,
          margin: 0,
          padding: 0,
          transform: 'translateY(-0.07em)',
        }}
      />
    </div>
  );
}

function ElementView({ el, els, selected, onPointerDown, onDoubleClick, editing, onCommitText, editingCell, onEditCell, onCommitCell, onEndCellEdit, onTableCellContextMenu, cropActive, onNotesLive, scale, onTableStripDown }) {
  const hfxHoverId = useUiStore((s) => s.hfxHoverId);
  const shapeFillImgEditId = useUiStore((s) => s.shapeFillImgEditId);
  const inlineEditClear = useUiStore((s) => s.inlineEditClear);
  const inlineEditSeed = useUiStore((s) => s.inlineEditSeed);
  const symbolsModalOpen = useUiStore((s) => s.symbolsModalOpen);
  const tableCell = useSelectionStore((s) => s.tableCell);
  const tableCellSel = useSelectionStore((s) => s.tableCellSel);
  const tableBorderPaint = useUiStore((s) => s.tableBorderPaint);
  const lang = useUiStore((s) => s.lang);
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const slideCur = usePresentationStore((s) => s.cur);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const [paintHover, setPaintHover] = useState(null);
  const paintDragRef = useRef(null);
  const selInkIds = useSelectionStore((s) => s.selInkIds);
  const frozenInkHtmlRef = useRef('');
  const animSt = useUiStore((s) => (s.animPlay ? s.animPlay[el.id] : null));
  const animPlayOn = useUiStore((s) => !!s.animPlay);
  const connectorMode = useUiStore((s) => s.connectorMode);
  const hfxOn =
    !!(el.hoverFx && el.hoverFx.enabled) &&
    !editing &&
    !cropActive &&
    !el._isDecor &&
    el.type !== 'inkhost';
  const hovered = hfxOn && !selected && String(hfxHoverId) === String(el.id);
  const hfx = hfxOn ? hoverMotionStyle(el, el.hoverFx, hovered) : null;
  const hfxBind = {};
  const grouped = !!el.groupId;
  const floatAnimName = animSt?.float
    ? `rf_${String(el.id).replace(/[^\w-]/g, '_')}`
    : null;
  const danceAnimName = animSt?.dance
    ? `rd_${String(el.id).replace(/[^\w-]/g, '_')}`
    : null;
  const swingAnimName = animSt?.swing
    ? `rs_${String(el.id).replace(/[^\w-]/g, '_')}`
    : null;

  useEffect(() => {
    if (!floatAnimName) return undefined;
    const frames = floatFramesForEl(el, els);
    const rot = el.rot || 0;
    const n = Math.max(1, frames.length - 1);
    const body = frames
      .map((f, i) => {
        const m = String(f.transform || '').match(/translate\(([^)]+)\)/);
        const tr = m ? m[1] : '0px, 0px';
        const ease = f.easing ? `animation-timing-function:${f.easing};` : '';
        return `${(i / n) * 100}%{transform:rotate(${rot}deg) translate(${tr});${ease}}`;
      })
      .join('');
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-float-kf', floatAnimName);
    styleEl.textContent = `@keyframes ${floatAnimName}{${body}}`;
    document.head.appendChild(styleEl);
    return () => {
      try {
        styleEl.remove();
      } catch (e) {}
    };
  }, [floatAnimName, el, els]);

  useEffect(() => {
    if (!danceAnimName) return undefined;
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-dance-kf', danceAnimName);
    styleEl.textContent = danceKeyframesCss(danceAnimName, el.rot || 0);
    document.head.appendChild(styleEl);
    return () => {
      try {
        styleEl.remove();
      } catch (e) {}
    };
  }, [danceAnimName, el.rot]);

  useEffect(() => {
    if (!swingAnimName) return undefined;
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-swing-kf', swingAnimName);
    styleEl.textContent = swingKeyframesCss(swingAnimName, el.rot || 0);
    document.head.appendChild(styleEl);
    return () => {
      try {
        styleEl.remove();
      } catch (e) {}
    };
  }, [swingAnimName, el.rot]);

  // JSON/LLM imports often omit formulaSvg — bake MathJax once when the el appears.
  useEffect(() => {
    if (el?.type !== 'formula' || !el.formulaRaw) return undefined;
    const svg = el.formulaSvg;
    if (typeof svg === 'string' && /<svg[\s>]/i.test(svg) && svg.length > 40) return undefined;
    void editorApi.rebakeFormulaSvg(el.id, { silent: true });
    return undefined;
  }, [el?.id, el?.type, el?.formulaRaw, el?.formulaSvg]);

  const motionTx = +(animSt?.motionTx || 0);
  const motionTy = +(animSt?.motionTy || 0);
  const motionPlaying = !!animSt?.motionPlaying;
  const authoredXf = elBoxTransform(el);
  const motionTransform = (() => {
    const parts = [];
    if (motionTx || motionTy) parts.push(`translate(${motionTx}px, ${motionTy}px)`);
    if (authoredXf) parts.push(authoredXf);
    return parts.length ? parts.join(' ') : undefined;
  })();
  // During WAAPI move: authored left/top + transform offset. After settle: bake into left/top
  // so CSS entrance/emphasis anims do not leave a ghost at the original box.
  const style = {
    position: 'absolute',
    left: motionPlaying ? el.x || 0 : (el.x || 0) + motionTx,
    top: motionPlaying ? el.y || 0 : (el.y || 0) + motionTy,
    width: el.w || 100,
    height: el.h || 60,
    transform: motionPlaying ? motionTransform : authoredXf,
    // Authored rotate/flip for CSS entrance keyframes (App.css --el-xf).
    ...(authoredXf ? { ['--el-xf']: authoredXf } : null),
    opacity: animSt?.hidden || animSt?.particles ? 0 : el.elOpacity != null ? el.elOpacity : 1,
    visibility: animSt?.hidden || animSt?.particles ? 'hidden' : undefined,
    filter: animPlayOn
      ? recolorReactFilter(elFilterCss(el), el.id, '#000000', animSt, el)
      : elFilterCss(el),
    outline:
      el.type === 'shape'
        ? 'none'
        : grouped && !selected
          ? '1px dashed rgba(167,139,250,.7)'
          : 'none',
    outlineOffset: 0,
    boxSizing: 'border-box',
    cursor: editing ? 'text' : el.locked ? 'default' : hfxOn ? 'pointer' : 'move',
    background: 'transparent',
    userSelect: editing ? 'text' : 'none',
    animationDuration:
      animSt?.dur && !animSt?.float && !animSt?.dance && !animSt?.swing && !animSt?.pulseName
        ? `${animSt.dur}ms`
        : undefined,
    border: el.type === 'text' ? textBorderBoxStyle(el)?.border : undefined,
    borderRadius: el.type === 'text' ? textBorderRadiusCss(el) : undefined,
      overflow:
        el.type === 'icon' ||
        needsTextBorderOverflow(el) ||
        textNeedsOverflowVisible(el) ||
        animSt?.live ||
        animSt?.float ||
        animSt?.dance ||
        animSt?.swing ||
        animSt?.pulseName
          ? 'visible'
          : 'hidden',
    ...(hfx || {}),
  };
  if (animSt?.float && floatAnimName) {
    const dur = Math.max(400, +(animSt.dur || 5000) || 5000);
    const infinite = floatIsInfinite({ swingCount: animSt.swingCount != null ? animSt.swingCount : 10 });
    const loops = infinite ? 'infinite' : Math.max(1, +(animSt.swingCount || 1));
    style.transform = undefined;
    // Longhand properties instead of the `animation` shorthand: mixing the shorthand here
    // with the plain `animationDuration` set above (for the CSS-class entrance/emphasis
    // case) made React warn on transitions between animation states — the shorthand
    // implicitly resets sub-properties the longhand form doesn't touch, so which one was
    // set on the *previous* render matters. Longhand throughout avoids that entirely.
    style.animationName = floatAnimName;
    style.animationDuration = `${dur}ms`;
    style.animationTimingFunction = 'ease-in-out';
    style.animationIterationCount = loops;
  } else if (animSt?.dance && danceAnimName) {
    const dur = Math.max(200, +(animSt.dur || 1200) || 1200);
    const infinite = danceIsInfinite({ swingCount: animSt.swingCount != null ? animSt.swingCount : 1 });
    const loops = infinite ? 'infinite' : Math.max(1, +(animSt.swingCount || 1));
    style.transform = undefined;
    style.animationName = danceAnimName;
    style.animationDuration = `${dur}ms`;
    style.animationTimingFunction = 'ease-in-out';
    style.animationIterationCount = loops;
  } else if (animSt?.swing && swingAnimName) {
    const dur = Math.max(200, +(animSt.dur || 1200) || 1200);
    const infinite = swingIsInfinite({ swingCount: animSt.swingCount != null ? animSt.swingCount : 1 });
    const loops = infinite ? 'infinite' : Math.max(1, +(animSt.swingCount || 1));
    style.transform = undefined;
    style.transformOrigin = swingOriginCss(el, {
      swingOx: animSt.swingOx,
      swingOy: animSt.swingOy,
    });
    style.animationName = swingAnimName;
    style.animationDuration = `${dur}ms`;
    style.animationTimingFunction = 'ease-in-out';
    style.animationIterationCount = loops;
  } else if (animSt?.pulseName || (animSt?.cls && isPulseFamilyAnim(pulseNameFromCls(animSt.cls)))) {
    const pname = animSt.pulseName || pulseNameFromCls(animSt.cls);
    const dur = Math.max(50, +(animSt.dur || 600) || 600);
    const kf = pulseKeyframesName(pname);
    const iter = pulseCssIteration({
      swingCount: animSt.swingCount != null ? animSt.swingCount : 1,
    });
    style.animationName = kf;
    style.animationDuration = `${dur}ms`;
    style.animationTimingFunction = 'ease';
    style.animationIterationCount = iter;
  } else if (hfx?.transform) {
    style.transform = hfx.transform;
    style['--el-xf'] = hfx.transform;
  } else {
    const xf = motionPlaying ? motionTransform : authoredXf;
    style.transform = xf;
    if (authoredXf) style['--el-xf'] = authoredXf;
  }
  if (hfx?.filter) style.filter = [elFilterCss(el), hfx.filter].filter(Boolean).join(' ');
  if (hfx?.opacity != null && !animSt?.hidden) style.opacity = hfx.opacity;

  const skipCls =
    animSt?.float ||
    animSt?.dance ||
    animSt?.swing ||
    animSt?.pulseName ||
    (animSt?.cls && isPulseFamilyAnim(pulseNameFromCls(animSt.cls)));
  const connCls =
    connectorMode && !el._isDecor
      ? connectorMode.fromId && String(connectorMode.fromId) === String(el.id)
        ? ' conn-source'
        : ' conn-target'
      : '';
  const fillImgEditChrome =
    el.type === 'shape' &&
    shapeHasFillImg(el) &&
    shapeFillImgEditId &&
    String(shapeFillImgEditId) === String(el.id);
  const elClass = `react-el${grouped ? ' in-group' : ''}${el.link ? ' has-link' : ''}${el.locked ? ' is-locked' : ''}${hfxOn ? ' has-hover-fx' : ''}${el.textRole === 'toc' ? ' has-toc' : ''}${animSt?.cls && !skipCls ? ` ${animSt.cls}` : ''}${animSt?.particles ? ' has-particles' : ''}${shapeHasFillImg(el) ? ' has-fill-img' : ''}${fillImgEditChrome ? ' has-fill-img-edit' : ''}${connCls}`;
  const wrapMotionCssAnim = (node) => node;

  if (el.type === 'formula') {
    const fAlign = ((el.cs || '').match(/text-align\s*:\s*([^;]+)/i) || [])[1]?.trim().toLowerCase();
    const align = fAlign === 'center' || fAlign === 'right' ? fAlign : 'left';
    const justify =
      align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
    const tagLabel = formulaTagLabelOf(el.formulaRaw || el.html || '');
    return (
      <div
        className={elClass}
        data-id={el.id}
        style={{
          ...style,
          color: el.formulaColor || el.textColor || '#fff',
          padding: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxSizing: 'border-box',
        }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        {...hfxBind}
      >
        {typeof el.formulaSvg === 'string' &&
        /<svg[\s>]/i.test(el.formulaSvg) &&
        el.formulaSvg.length > 40 ? (
          <div
            className="react-formula-math"
            style={{
              flex: '1 1 auto',
              minWidth: 0,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: justify,
            }}
            dangerouslySetInnerHTML={{ __html: el.formulaSvg }}
          />
        ) : (
          <div
            className="react-formula-math"
            style={{
              flex: '1 1 auto',
              minWidth: 0,
              opacity: 0.55,
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {el.formulaRaw || '…'}
          </div>
        )}
        {tagLabel ? (
          <div
            className="react-formula-tag"
            style={{
              flex: '0 0 auto',
              fontFamily: 'Cambria, MathJax_NonItalic, serif',
              fontSize: '0.85em',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            {tagLabel}
          </div>
        ) : null}
      </div>
    );
  }

  if (el.type === 'text' || el.type === 'formula') {
    const css = el.cs || '';
    const fs = (css.match(/font-size\s*:\s*([\d.]+)px/i) || [])[1];
    const align = (css.match(/text-align\s*:\s*([^;]+)/i) || [])[1] || 'left';
    const weight = (css.match(/font-weight\s*:\s*([^;]+)/i) || [])[1];
    const fontStyle = (css.match(/font-style\s*:\s*([^;]+)/i) || [])[1];
    const family = elementFontFamily(
      el,
      el.type === 'formula' ? 'Cambria, MathJax_NonItalic, serif' : DEFAULT_TEXT_FONT_FAMILY
    );
    const lineH = parseCsNumber(css, 'line-height');
    const letterSp = parseCsNumber(css, 'letter-spacing');
    const textTransform = (css.match(/text-transform\s*:\s*([^;]+)/i) || [])[1];
    const valign = el.valign || (el.type === 'formula' ? 'middle' : 'top');
    const justify =
      valign === 'middle' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start';
    // Mixed-color runs: underline wraps use each glyph's color; plain text keeps box CSS.
    const rawHtml = el.html != null && el.html !== '' ? el.html : textFromEl(el);
    const ulPrep =
      el.type === 'text'
        ? prepareTextUnderlineHtml(rawHtml, css)
        : { html: rawHtml, paintBoxUnderline: false, kind: 'none' };
    const html = ulPrep.html;
    const ulBox =
      el.type === 'text'
        ? underlineBoxProps(css, { paintBoxUnderline: ulPrep.paintBoxUnderline })
        : { style: {}, className: '', kind: 'none' };
    const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
    const showAsPlaceholder = !!el.textPlaceholder && !editing;
    const resolvedText = showAsPlaceholder
      ? TEXT_PH_COLOR
      : resolveElTextColor(el, theme);
    const bgLayer = el.type === 'text' ? textBgLayerStyle(el, { matchBorder: true }) : null;
    const colorGrad =
      el.type === 'text' && el.textRole !== 'toc' && !showAsPlaceholder
        ? textColorGradStyle(el)
        : null;
    const borderSvg = el.type === 'text' ? textBorderSvgMarkup(el) : '';
    const glyphSh = el.type === 'text' ? textGlyphShadowStyle(el) : null;
    const blockSh = el.type === 'text' ? textBlockShadowStyle(el) : null;
    const warpCss = el.type === 'text' && !editing ? shapeTextWarpCss(el) : null;
    const hasList =
      el.type === 'text' &&
      (/(data-list-bullet|data-list-num)/i.test(html) || el.bulletIconId);
    const textStyle = {
      ...style,
      overflow: warpCss || textNeedsOverflowVisible(el) || style.overflow === 'visible' ? 'visible' : style.overflow,
      border: undefined,
      borderRadius: undefined,
      position: 'absolute',
    };
    const textBodyStyle = {
      position: 'absolute',
      inset: 0,
      boxSizing: 'border-box',
      transformOrigin: '0 0',
      transform: warpCss || undefined,
      color: colorGrad ? undefined : (hfx && hfx.color) || resolvedText,
      fontSize: fs ? Number(fs) : el.type === 'formula' ? 40 : 36,
      padding: el.type === 'text' ? textPadCss(el) : 8,
      lineHeight: lineH != null ? lineH : 1.2,
      letterSpacing: letterSp != null ? `${letterSp}px` : undefined,
      textTransform: textTransform ? textTransform.trim() : undefined,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      fontFamily: family,
      fontWeight: weight || undefined,
      fontStyle: fontStyle || undefined,
      ...ulBox.style,
      textAlign: align.trim(),
      display: 'flex',
      flexDirection: 'column',
      // While editing, pin to top so new lines grow down instead of shifting the block up
      // (middle/bottom valign) before the live height patch lands.
      justifyContent: editing ? 'flex-start' : justify,
      border: style.border,
      borderRadius: style.borderRadius,
      ...(hasList ? { ['--rt-bullet-gap']: `${el.bulletGap != null ? el.bulletGap : 10}px` } : {}),
      ...(blockSh || {}),
    };
    const growTextBoxLive = (nextHtml) => {
      if (el.type !== 'text' || el.locked) return;
      const text = String(nextHtml || '').replace(/<[^>]+>/g, '');
      const measured = measureTextHeight({ ...el, html: nextHtml, text });
      const curH = el.h || 0;
      if (measured <= curH + 1) return;
      usePresentationStore.getState().applyElementPatches({ [el.id]: { h: measured } }, { live: true });
    };
    const inner = (
      <EditableHtml
        className="react-text-body"
        html={html}
        editing={editing}
        clearOnEdit={!!el.textPlaceholder || (editing && inlineEditClear)}
        seedText={editing && inlineEditSeed ? inlineEditSeed : null}
        onSeedConsumed={() => useUiStore.getState().consumeInlineEditFlags()}
        suppressBlurCommit={!!symbolsModalOpen}
        onCommit={onCommitText}
        onLiveChange={el.type === 'text' ? growTextBoxLive : undefined}
        onBulletClick={(marker) => editorApi.openBulletIconPicker(el.id, marker || null)}
        style={{
          position: 'relative',
          zIndex: 1,
          flex: '0 1 auto',
          width: 'fit-content',
          maxWidth: '100%',
          minWidth: 0,
          alignSelf: textAlignSelf(align),
          outline: 'none',
          cursor: editing ? 'text' : undefined,
          color: colorGrad ? undefined : (hfx && hfx.color) || resolvedText,
          ...(colorGrad || {}),
          ...(glyphSh || {}),
        }}
      />
    );
    return (
      <div
        className={`${elClass} react-el-text${editing ? ' is-editing' : ''}${ulBox.className ? ` ${ulBox.className}` : ''}`}
        data-id={el.id}
        data-group-id={el.groupId || undefined}
        style={textStyle}
        onPointerDown={(e) => {
          const marker = e.target.closest?.('[data-list-bullet]');
          if (marker) {
            e.stopPropagation();
            e.preventDefault();
            editorApi.openBulletIconPicker(el.id, marker);
            return;
          }
          onPointerDown(e);
        }}
        onDoubleClick={onDoubleClick}
        {...hfxBind}
      >
        {wrapMotionCssAnim(
          <div className="react-text-warp" style={textBodyStyle}>
            {bgLayer ? <div className="react-el-bg-layer" aria-hidden="true" style={bgLayer} /> : null}
            {borderSvg ? (
              <div
                aria-hidden="true"
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}
                dangerouslySetInnerHTML={{ __html: borderSvg }}
              />
            ) : null}
            {inner}
          </div>
        )}
      </div>
    );
  }

  if (el.type === 'image' && el.src) {
    // While crop mode is open, show the image the way ImageCropOverlay expects: the full
    // (pre-crop) picture at its full box, with the crop handles positioned at the current
    // crop percentages on top of it — not the already-cropped, shrunk-down box. Otherwise
    // reopening crop on an already-cropped image only ever showed the small cropped result
    // (nothing left to expand back into), and the overlay's frame — sized to the *current*
    // small box — no longer matched the picture it was drawn over.
    const hoverUncropOn = hfxOn && isUncropHoverPreset(el.hoverFx?.preset);
    const showUncrop = imageShowsUncrop(el, {
      cropActive,
      hovered: hovered && !selected,
      preset: el.hoverFx?.preset,
      uncrop: animSt?.uncrop,
      uncropDone: animSt?.uncropDone,
    });
    // Crop-mode overlay still needs the full pre-crop box. Hover/anim uncrop keep the
    // cropped window in place and only open clip-path — otherwise the picture appears
    // to fly out of a corner while left/top/width/height and the inner % crop both tween.
    const fullBox = cropActive ? getCropFullBox(el) : null;
    const elForImg = fullBox ? uncropViewEl(el) : el;
    const canUncrop = imageHasCrop(el) && !cropActive;
    const uncropArmed =
      canUncrop && ((hoverUncropOn && !selected) || !!(animSt?.uncrop || animSt?.uncropDone));
    const uncropDur = hoverUncropOn
      ? +(el.hoverFx?.dur || 0.3)
      : animSt?.dur
        ? (+animSt.dur || 400) / 1000
        : 0.3;
    const colorHover =
      hfxOn && hovered && !selected && isImgColorHoverPreset(el.hoverFx?.preset);
    const rs = imageRenderStyles(elForImg, {
      colorHover,
      canvasW,
      canvasH,
      transition: hfxOn ? `filter ${Math.max(0.05, +(el.hoverFx?.dur || 0.3))}s ease` : undefined,
    });
    if (canUncrop) {
      const win = uncropWindowStyles(el, showUncrop && !cropActive, uncropArmed ? uncropDur : 0);
      rs.inner = { ...rs.inner, ...win.inner };
      rs.img = { ...rs.img, ...win.img, pointerEvents: showUncrop ? 'auto' : 'none' };
    }
    const frame = normImgFrame(el.imgFrame);
    const borderSvg = frame === 'none' ? imgBorderSvgMarkup(el) : '';
    const frameChrome = frame === 'ribbon' || frame === 'polaroid';
    const tapeHoverFilt = frameChrome ? hfx?.filter : null;
    const hostFilt = (
      tapeHoverFilt
        ? [elFilterCss(el), rs.box.filter]
        : [style.filter, rs.box.filter]
    )
      .filter(Boolean)
      .join(' ') || undefined;
    return (
      <div
        className={`${elClass} ${rs.frameClass}`.trim()}
        data-id={el.id}
        style={{
          ...style,
          ...rs.box,
          ...(fullBox
            ? { left: fullBox.x, top: fullBox.y, width: fullBox.w, height: fullBox.h }
            : null),
          ...(showUncrop && !cropActive ? { zIndex: 24 } : null),
          // rs.box.filter (the image's own contour-following drop-shadow) and style.filter
          // (blur / the element's generic shadow) are independent effects that should both
          // apply — the plain spread above would let whichever one comes from rs.box just
          // replace style.filter instead of combining with it.
          // Ribbon tape sits on this host, so hover filters go on the inner picture only.
          filter: hostFilt,
          // Ribbon tape / Polaroid caption sit on this host — keep host opacity so
          // the chrome fades with the picture. Other frames paint opacity on the <img>.
          ...(frameChrome ? null : { opacity: 1 }),
          // While crop mode is active, the crop handles sit right at (and slightly outside)
          // the box edges — clipping them here cut off their outer half, on top of which
          // they used to live *inside* the overflow:hidden `inner` wrapper below and got
          // clipped a second time by that.
          overflow:
            cropActive || canUncrop || borderSvg || style.overflow === 'visible'
              ? 'visible'
              : rs.box.overflow,
        }}
        onPointerDown={onPointerDown}
        {...hfxBind}
      >
        {wrapMotionCssAnim(
          <>
            {rs.borderFilterSvg ? (
              <div
                aria-hidden="true"
                style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
                dangerouslySetInnerHTML={{ __html: rs.borderFilterSvg }}
              />
            ) : null}
            <div
              style={{
                ...rs.inner,
                ...(tapeHoverFilt
                  ? { filter: [rs.inner.filter, tapeHoverFilt].filter(Boolean).join(' ') }
                  : null),
              }}
            >
              <img alt="" src={el.src} draggable={false} style={rs.img} />
            </div>
            {cropActive ? <ImageCropOverlay el={el} /> : null}
            {borderSvg ? (
              <div
                aria-hidden="true"
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, overflow: 'visible' }}
                dangerouslySetInnerHTML={{ __html: borderSvg }}
              />
            ) : null}
            {frame === 'ribbon' ? (
              <div
                className="react-img-ribbon-bar"
                style={imgRibbonTapeStyle()}
                dangerouslySetInnerHTML={{ __html: imgRibbonTapeMarkup() }}
              />
            ) : null}
            {frame === 'polaroid' ? (
              <div
                className={`react-img-polaroid-cap${!el.imgCaption && !editing ? ' is-empty' : ''}`}
                style={polaroidCaptionStyle(el, canvasW, canvasH, { editing })}
                data-ph={lang === 'en' ? 'Caption' : 'Подпись'}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDoubleClick?.(e);
                }}
                onPointerDown={(e) => {
                  // Keep selection/edit on the caption; do not start a move-drag (that ate dblclicks).
                  e.stopPropagation();
                  if (editing) return;
                  onPointerDown?.(e);
                }}
              >
                <EditableHtml
                  html={el.imgCaption || ''}
                  editing={editing}
                  onCommit={onCommitText}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '1em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }

  if (el.type === 'shape') {
    const shapeMeta = getShapeMeta(el.shape || 'rect');
    const rectSelOnly = shapeMeta?.special === 'cloud';
    // Transform chrome only on the shape being edited — never on neighbors.
    const fillImgEdit =
      !grouped &&
      shapeHasFillImg(el) &&
      !!shapeFillImgEditId &&
      String(shapeFillImgEditId) === String(el.id);
    const hasFillImg = shapeHasFillImg(el);
    const fillImgLayout = hasFillImg ? normalizeFillImgLayout(el, el.w, el.h) : null;
    // Don't inset the photo clip by a phantom stroke when stroke is off (default sw=2).
    const fillImgClip = hasFillImg
      ? shapeClipPath({
          ...el,
          sw:
            el.stroke && el.stroke !== 'none' && el.stroke !== 'transparent' && +(el.sw || 0) > 0
              ? el.sw
              : 0,
        })
      : null;
    // Editor paints the photo via a clipped HTML layer — SVG pattern fills fringe dark on rotate.
    // Do not set noFill:true: that path forces a thick line stroke and drops corner rx.
    const shapeOpts = shapeOptsFromEl(el);
    const svg = buildBasicShapeSVG(el.shape || 'rect', {
      ...shapeOpts,
      ...(hasFillImg
        ? { fill: 'none', fillGrad: null, fillGrad2: null, fillImg: null }
        : null),
    });
    const ringSvg =
      selected && !grouped && !rectSelOnly
        ? buildBasicShapeSVG(el.shape || 'rect', {
            ...shapeOpts,
            fill: 'none',
            fillOp: 1,
            fillGrad: null,
            fillGrad2: null,
            fillImg: null,
            stroke: '#3b82f6',
            // Canvas units / zoom → ~1.5 screen px after stage CSS scale.
            strokeWidth: 1.5 / Math.max(0.001, scale || 1),
            noStrokeInset: true,
            // Selection ring must not redraw end markers (looked like a second cross/arrow).
            lineFromMarker: 'none',
            lineToMarker: 'none',
          })
        : null;
    const sb = shapeBlurPx(el);
    const blurStyle = sb > 0 ? shapeBlurOverlayStyle(el) : null;
    const hitMode = shapeHitMode(el);
    const hitClip = hitMode === 'clip' ? shapeClipPath(el) : null;
    const lineHit = hitMode === 'line' ? shapeLineHitSvg(el) : null;
    const curveHit = hitMode === 'curve' ? shapeCurveHitSvg(el) : null;
    const useHitOverlay =
      !editing &&
      !fillImgEdit &&
      (hitMode === 'clip' || hitMode === 'line' || hitMode === 'box' || hitMode === 'curve');
    const hitBind = useHitOverlay
      ? { onPointerDown, onDoubleClick, ...(hfxBind || {}) }
      : {};
    const hostBind = useHitOverlay
      ? {}
      : { onPointerDown, onDoubleClick, ...(hfxBind || {}) };
    return (
      <div
        className={elClass}
        data-id={el.id}
        style={{
          ...style,
          overflow:
            // Keep image fill clipped to the silhouette unless actively transforming it.
            hasFillImg && !fillImgEdit
              ? 'hidden'
              : sb > 0 || editing || fillImgEdit || shapeNeedsOverflowVisible(el.shape, el)
                ? 'visible'
                : style.overflow,
          // Transform chrome must sit above neighboring shapes (same base z-index otherwise).
          ...(fillImgEdit ? { zIndex: 60 } : null),
          transformOrigin: el.shape === 'line' ? 'center center' : style.transformOrigin,
          pointerEvents: useHitOverlay ? 'none' : style.cursor === 'text' ? 'auto' : undefined,
        }}
        {...hostBind}
      >
        {wrapMotionCssAnim(
          <>
            {blurStyle ? (
              <div className="react-shape-blur-overlay" aria-hidden="true" style={blurStyle} />
            ) : null}
            {hasFillImg && fillImgLayout ? (
              <div
                className="react-shape-fillimg-clip"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 0,
                  overflow: 'hidden',
                  // Axis-aligned round only when nodes are not customized (clip-path handles shapePts).
                  borderRadius:
                    !(Array.isArray(el.shapePts) && el.shapePts.length >= 3) &&
                    (shapeMeta?.special === 'rect' || el.shape === 'rect' || el.shape === 'roundrect')
                      ? shapeRxPx(el.rx, el.w, el.h)
                      : undefined,
                  pointerEvents: 'none',
                  clipPath: fillImgClip || undefined,
                  WebkitClipPath: fillImgClip || undefined,
                }}
              >
                <img
                  key={`${el.fillImgKey || ''}:${el.fillImg}`}
                  src={el.fillImg}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    // Bleed 1px so clip AA does not sample empty pixels (dark fringe).
                    left: fillImgLayout.x - 1,
                    top: fillImgLayout.y - 1,
                    width: fillImgLayout.w + 2,
                    height: fillImgLayout.h + 2,
                    maxWidth: 'none',
                    transform: fillImgLayout.rot ? `rotate(${fillImgLayout.rot}deg)` : undefined,
                    transformOrigin: 'center center',
                    display: 'block',
                  }}
                />
              </div>
            ) : null}
            <div
              style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', pointerEvents: 'none' }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            {hasElShadow(el) && isElShadowInset(el) ? (
              <div
                className="react-shape-inset-shadow"
                aria-hidden="true"
                style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
                dangerouslySetInnerHTML={{ __html: elInsetShadowSvgMarkup(el) }}
              />
            ) : null}
            {ringSvg ? (
              <div
                className="react-shape-sel-ring"
                aria-hidden="true"
                style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}
                dangerouslySetInnerHTML={{ __html: ringSvg }}
              />
            ) : null}
            {fillImgEdit ? (
              <ShapeFillImgOverlay
                el={el}
                scale={scale}
                primary={String(el.id) === String(shapeFillImgEditId)}
              />
            ) : null}
            <ShapeTextLayer el={el} editing={editing} onCommitText={onCommitText} />
          </>
        )}
        {useHitOverlay && hitMode === 'line' && lineHit ? (
          <svg
            className="react-shape-hit-area"
            viewBox={`0 0 ${lineHit.w} ${lineHit.h}`}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: lineHit.w,
              height: lineHit.h,
              overflow: 'visible',
              pointerEvents: 'none',
              zIndex: 10,
              cursor: el.locked ? 'default' : 'move',
            }}
          >
            <path
              d={lineHit.d}
              fill="none"
              stroke="transparent"
              strokeWidth={lineHit.hitSw}
              strokeLinecap="round"
              style={{ pointerEvents: 'stroke', cursor: el.locked ? 'default' : 'move' }}
              {...hitBind}
            />
          </svg>
        ) : null}
        {useHitOverlay && hitMode === 'curve' && curveHit ? (
          <svg
            className="react-shape-hit-area"
            viewBox={`0 0 ${curveHit.w} ${curveHit.h}`}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: curveHit.w,
              height: curveHit.h,
              overflow: 'visible',
              pointerEvents: 'none',
              zIndex: 10,
              cursor: el.locked ? 'default' : 'move',
            }}
          >
            <path
              d={curveHit.strokeD}
              fill="none"
              stroke="transparent"
              strokeWidth={curveHit.hitSw}
              strokeLinecap="round"
              style={{ pointerEvents: 'stroke', cursor: el.locked ? 'default' : 'move' }}
              {...hitBind}
            />
            {curveHit.fillD ? (
              <path
                d={curveHit.fillD}
                fill="transparent"
                stroke="none"
                style={{ pointerEvents: 'fill', cursor: el.locked ? 'default' : 'move' }}
                {...hitBind}
              />
            ) : null}
          </svg>
        ) : null}
        {useHitOverlay && hitMode === 'clip' && hitClip ? (
          <div
            className="react-shape-hit-area"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              pointerEvents: 'auto',
              cursor: el.locked ? 'default' : 'move',
              clipPath: hitClip,
              WebkitClipPath: hitClip,
              background: 'transparent',
            }}
            {...hitBind}
          />
        ) : null}
        {useHitOverlay && hitMode === 'box' ? (
          <div
            className="react-shape-hit-area"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              pointerEvents: 'auto',
              cursor: el.locked ? 'default' : 'move',
              background: 'transparent',
            }}
            {...hitBind}
          />
        ) : null}
      </div>
    );
  }

  if (el.type === 'icon') {
    const ic = el.iconId ? getIconById(el.iconId) : null;
    const color = el.iconColor || el.textColor || '#6366f1';
    if (ic) {
      return (
        <div
          className={`${elClass} react-el-icon`}
          data-id={el.id}
          style={{ ...style, padding: 0, overflow: 'visible' }}
          onPointerDown={onPointerDown}
          onDoubleClick={() => editorApi.openIconPickerForElement(el.id)}
        {...hfxBind}
        >
          <AnimatedIcon
            ic={ic}
            color={color}
            sw={el.iconSw != null ? el.iconSw : 1.8}
            fillOp={el.iconFillOp != null ? el.iconFillOp : 1}
            play={iconAnimEnabled(el) ? 'loop' : 'off'}
          />
        </div>
      );
    }
    return (
      <div
        className={elClass}
        data-id={el.id}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.min(el.w || 96, el.h || 96) * 0.7,
        }}
        onPointerDown={onPointerDown}
        {...hfxBind}
      >
        {el.emoji || '⭐'}
      </div>
    );
  }

  if (el.type === 'table') {
    if (el.showChart) {
      const svg = buildChartSvg(el);
      return (
        <div
          className={`${elClass} react-el-chart`}
          data-id={el.id}
          style={{ ...style, overflow: 'visible' }}
          onPointerDown={onPointerDown}
          {...hfxBind}
        >
          <div style={chartWrapStyle(el)} dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      );
    }
    const rows = el.rows || 3;
    const cols = el.cols || 3;
    const rx = +(el.rx || 0);
    const blur = +(el.tableBgBlur || 0);
    const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
    const textColor = resolveElTextColor(el, theme);
    const W = el.w || 100;
    const H = el.h || 60;
    const cws = tableColWidthsPx(el, W);
    const rhs = tableRowHeightsPx(el, H);
    const colFr =
      Array.isArray(el.colWidths) && el.colWidths.length === cols ? el.colWidths : Array(cols).fill(1 / cols);
    const rowFr =
      Array.isArray(el.rowHeights) && el.rowHeights.length === rows ? el.rowHeights : Array(rows).fill(1 / rows);
    const selActive = !!(tableCell && String(tableCell.elId) === String(el.id));
    const selKeys = new Set((selActive ? tableCellSel || [] : []).map((k) => `${+k.r}:${+k.c}`));
    const editingThisTable = !!(editingCell && String(editingCell).startsWith(`${el.id}:`));
    const z = scale || 1;

    function paintFromPoint(clientX, clientY, history) {
      const target = document.elementFromPoint(clientX, clientY);
      const tc = target && (target.matches?.('td,th') ? target : target.closest?.('td,th'));
      if (!tc || tc.dataset?.r == null) return false;
      const wrap = tc.closest('.react-el-table');
      if (!wrap || String(wrap.dataset?.id) !== String(el.id)) return false;
      const side = hitTableBorderSide(tc, { clientX, clientY });
      if (!side) return false;
      const rr = +tc.dataset.r;
      const cc = +tc.dataset.c;
      const line = tableGridLineId(el, rr, cc, side);
      if (line && paintDragRef.current?.line === line) return false;
      const ok = editorApi.tablePaintBorder(el.id, rr, cc, side, { history, live: true });
      if (ok && paintDragRef.current) paintDragRef.current.line = line;
      return ok;
    }

    // v7.1 cell mousedown: pick anchor, drag = range select, plain click = edit
    function cellPointerDown(ev, r, c) {
      // Right-click opens the cell menu — do not collapse a multi-cell selection.
      if (ev.button != null && ev.button !== 0) return;
      if (tableBorderPaint) {
        ev.stopPropagation();
        ev.preventDefault();
        if (!selected) editorApi.pickElement(el.id);
        paintDragRef.current = { line: null };
        let pushed = paintFromPoint(ev.clientX, ev.clientY, true);
        const mm = (ev2) => {
          ev2.preventDefault();
          if (paintFromPoint(ev2.clientX, ev2.clientY, !pushed)) pushed = true;
        };
        const mu = () => {
          paintDragRef.current = null;
          window.removeEventListener('pointermove', mm);
          window.removeEventListener('pointerup', mu);
          if (pushed) usePresentationStore.getState().persist();
        };
        window.addEventListener('pointermove', mm, { passive: false });
        window.addEventListener('pointerup', mu);
        return;
      }
      const key = `${el.id}:${r}:${c}`;
      if (editingCell === key) return; // let the browser place the caret
      ev.stopPropagation();
      ev.preventDefault();
      if (!selected) editorApi.pickElement(el.id);
      if (ev.shiftKey && selActive) {
        editorApi.pickTableCell(el.id, r, c, { extend: true });
        return;
      }
      editorApi.pickTableCell(el.id, r, c);
      const wrap = ev.currentTarget.closest('.react-tbl-wrap');
      const sx = ev.clientX;
      const sy = ev.clientY;
      let didDrag = false;
      const mm = (ev2) => {
        const dx = Math.abs(ev2.clientX - sx);
        const dy = Math.abs(ev2.clientY - sy);
        if (!didDrag && dx < 4 && dy < 4) return; // ignore tiny jitter
        didDrag = true;
        const target = document.elementFromPoint(ev2.clientX, ev2.clientY);
        const tc = target && (target.matches?.('td,th') ? target : target.closest?.('td,th'));
        if (tc && tc.dataset?.r != null && wrap && wrap.contains(tc)) {
          editorApi.pickTableCell(el.id, +tc.dataset.r, +tc.dataset.c, { extend: true });
        }
      };
      const mu = () => {
        window.removeEventListener('pointermove', mm);
        window.removeEventListener('pointerup', mu);
        if (!didDrag) onEditCell?.(el.id, r, c);
      };
      window.addEventListener('pointermove', mm);
      window.addEventListener('pointerup', mu);
    }

    // Tab = next cell (last cell → new row); Enter = cell below; F5 = preview
    function cellKeyDown(ev, r, c) {
      if (ev.key === 'Tab') {
        ev.preventDefault();
        if (ev.shiftKey) {
          if (c > 0) onEditCell?.(el.id, r, c - 1);
          else if (r > 0) onEditCell?.(el.id, r - 1, cols - 1);
          return;
        }
        if (c + 1 < cols) {
          onEditCell?.(el.id, r, c + 1);
          return;
        }
        if (r + 1 < rows) {
          onEditCell?.(el.id, r + 1, 0);
          return;
        }
        editorApi.pickTableCell(el.id, r, c);
        editorApi.tableAddRow({ after: true });
        onEditCell?.(el.id, r + 1, 0, { focus: true });
      } else if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        if (r + 1 < rows) onEditCell?.(el.id, r + 1, c);
        else onEndCellEdit?.(el.id);
      } else if (ev.key === 'F5') {
        ev.preventDefault();
        ev.stopPropagation();
        ev.currentTarget.blur(); // commit the edited cell first
        editorApi.startPreview('__cur__');
      }
    }

    // v7.1 _tblColHandles: drag boundary between two columns, next column absorbs delta
    function colResizeDown(ev, ci) {
      ev.preventDefault();
      ev.stopPropagation();
      const sx = ev.clientX;
      const st = usePresentationStore.getState();
      const live = (st.slides[st.cur]?.els || []).find((x) => x && String(x.id) === String(el.id)) || el;
      const w0 = live.w || 100;
      const base =
        Array.isArray(live.colWidths) && live.colWidths.length === cols
          ? [...live.colWidths]
          : Array(cols).fill(1 / cols);
      const sw0 = base[ci];
      const sw1 = base[ci + 1];
      const minF = 24 / w0;
      let pushed = false;
      const mm = (ev2) => {
        ev2.preventDefault();
        const dxF = (ev2.clientX - sx) / (z * w0);
        const next = [...base];
        next[ci] = Math.max(minF, Math.min(sw0 + sw1 - minF, sw0 + dxF));
        next[ci + 1] = sw0 + sw1 - next[ci];
        if (!pushed) {
          useHistoryStore.getState().push();
          pushed = true;
        }
        editorApi.tableSetColWidths(el.id, next, { history: false });
      };
      const mu = () => {
        window.removeEventListener('pointermove', mm);
        window.removeEventListener('pointerup', mu);
        if (pushed) usePresentationStore.getState().persist();
      };
      window.addEventListener('pointermove', mm, { passive: false });
      window.addEventListener('pointerup', mu);
    }

    // v7.1 _tblRowHandles
    function rowResizeDown(ev, ri) {
      ev.preventDefault();
      ev.stopPropagation();
      const sy = ev.clientY;
      const st = usePresentationStore.getState();
      const live = (st.slides[st.cur]?.els || []).find((x) => x && String(x.id) === String(el.id)) || el;
      const h0 = live.h || 60;
      const base =
        Array.isArray(live.rowHeights) && live.rowHeights.length === rows
          ? [...live.rowHeights]
          : Array(rows).fill(1 / rows);
      const sh0 = base[ri];
      const sh1 = base[ri + 1];
      const minF = 14 / h0;
      let pushed = false;
      const mm = (ev2) => {
        ev2.preventDefault();
        const dyF = (ev2.clientY - sy) / (z * h0);
        const next = [...base];
        next[ri] = Math.max(minF, Math.min(sh0 + sh1 - minF, sh0 + dyF));
        next[ri + 1] = sh0 + sh1 - next[ri];
        if (!pushed) {
          useHistoryStore.getState().push();
          pushed = true;
        }
        editorApi.tableSetRowHeights(el.id, next, { history: false });
      };
      const mu = () => {
        window.removeEventListener('pointermove', mm);
        window.removeEventListener('pointerup', mu);
        if (pushed) usePresentationStore.getState().persist();
      };
      window.addEventListener('pointermove', mm, { passive: false });
      window.addEventListener('pointerup', mu);
    }

    const colHandleLefts = [];
    let cxAcc = 0;
    for (let c = 0; c < cols - 1; c++) {
      cxAcc += colFr[c] * W;
      colHandleLefts.push(Math.round(cxAcc) - 3);
    }
    const rowHandleTops = [];
    let cyAcc = 0;
    for (let r = 0; r < rows - 1; r++) {
      cyAcc += rowFr[r] * H;
      rowHandleTops.push(Math.round(cyAcc) - 3);
    }

    return (
      <div
        className={`${elClass} react-el-table${selected ? ' is-selected' : ''}${tableBorderPaint ? ' is-border-paint' : ''}`}
        data-id={el.id}
        data-editing={editingThisTable ? 'true' : undefined}
        style={{
          ...style,
          background: 'transparent',
          cursor: tableBorderPaint ? 'none' : style.cursor,
        }}
        onPointerDown={onPointerDown}
        {...hfxBind}
      >
        {blur > 0 ? (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: rx || undefined,
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        ) : null}
        <div
          className="react-tbl-wrap"
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: rx || undefined,
            overflow: 'hidden',
            zIndex: 1,
          }}
        >
          <table
            style={{
              width: '100%',
              height: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'fixed',
              fontSize: el.fs || 15,
              color: textColor,
              fontFamily: el.ff || DEFAULT_TEXT_FONT_FAMILY,
              userSelect: 'none',
              background: 'transparent',
            }}
          >
            <colgroup>
              {cws.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <tbody>
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} style={{ height: rhs[r] || 30 }}>
                  {Array.from({ length: cols }).map((__, c) => {
                    const cell = getTableCell(el, r, c);
                    if (cell.hidden) return null;
                    const cs = cell.colspan || 1;
                    const rs = cell.rowspan || 1;
                    const isH = r === 0 && el.headerRow !== false;
                    const key = `${el.id}:${r}:${c}`;
                    const isEdit = editingCell === key;
                    const isCellSel = selKeys.has(`${r}:${c}`);
                    const cellTc =
                      cell.textColor || cell.textColorScheme != null
                        ? resolveSchemeColor(cell.textColorScheme, theme) || cell.textColor
                        : '';
                    const Tag = isH ? 'th' : 'td';
                    return (
                      <Tag
                        key={c}
                        data-r={r}
                        data-c={c}
                        colSpan={cs > 1 ? cs : undefined}
                        rowSpan={rs > 1 ? rs : undefined}
                        style={{
                          background: tableCellBg(el, r, c, cell, theme),
                          ...tableCellBorderStyle(el, r, c, cell, theme),
                          textAlign: cell.align || 'left',
                          verticalAlign: cell.valign || 'middle',
                          padding: '3px 8px',
                          overflow: 'hidden',
                          wordBreak: 'normal',
                          overflowWrap: 'break-word',
                          ...tableCellFontStyle(el, r, c, cell),
                          boxSizing: 'border-box',
                          fontSize: cell.fs != null ? +cell.fs : undefined,
                          fontFamily: cell.ff || el.ff || DEFAULT_TEXT_FONT_FAMILY,
                          color: cellTc || undefined,
                          outline: isCellSel && !tableBorderPaint ? '2px solid #3b82f6' : undefined,
                          outlineOffset: isCellSel && !tableBorderPaint ? -1 : undefined,
                          boxShadow:
                            tableBorderPaint && paintHover?.line
                              ? paintHoverShadow(
                                  sideOnGridLine(el, r, c, paintHover.line),
                                  tableBorderPaint.erase || !tableBorderPaint.color || tableBorderPaint.color === 'transparent'
                                    ? '#f87171'
                                    : tableBorderPaint.color
                                )
                              : undefined,
                          cursor: tableBorderPaint ? 'none' : undefined,
                          ...tableCellRadiusStyle(el, r, c, cs, rs),
                        }}
                        onPointerDown={(ev) => cellPointerDown(ev, r, c)}
                        onContextMenu={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          onTableCellContextMenu?.(el, r, c, ev);
                        }}
                        onPointerMove={
                          tableBorderPaint
                            ? (ev) => {
                                if (paintDragRef.current) return;
                                const side = hitTableBorderSide(ev.currentTarget, ev);
                                const line = side ? tableGridLineId(el, r, c, side) : null;
                                setPaintHover((prev) =>
                                  prev?.line === line ? prev : line ? { line } : null
                                );
                              }
                            : undefined
                        }
                        onPointerLeave={tableBorderPaint ? () => setPaintHover(null) : undefined}
                      >
                        <EditableHtml
                          html={cell.html || ''}
                          editing={isEdit}
                          onCommit={(html) => onCommitCell?.(el.id, r, c, html)}
                          onKeyDown={(ev) => cellKeyDown(ev, r, c)}
                          style={{
                            outline: 'none',
                            minHeight: '1em',
                            width: '100%',
                            cursor: isEdit ? 'text' : undefined,
                            color: cellTc || 'inherit',
                          }}
                        />
                      </Tag>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tableBorderPaint
          ? null
          : colHandleLefts.map((left, ci) => (
              <div
                key={`tch-${ci}`}
                className="react-tbl-crh"
                style={{
                  position: 'absolute',
                  left,
                  top: 0,
                  width: 6,
                  height: '100%',
                  cursor: 'col-resize',
                  zIndex: 30,
                }}
                onPointerDown={(ev) => colResizeDown(ev, ci)}
              />
            ))}
        {tableBorderPaint
          ? null
          : rowHandleTops.map((top, ri) => (
              <div
                key={`trh-${ri}`}
                className="react-tbl-rrh"
                style={{
                  position: 'absolute',
                  left: 0,
                  top,
                  width: '100%',
                  height: 6,
                  cursor: 'row-resize',
                  zIndex: 30,
                }}
                onPointerDown={(ev) => rowResizeDown(ev, ri)}
              />
            ))}
        {tableBorderPaint
          ? null
          : [
              { side: 'top', st: { left: 0, top: 0, width: '100%', height: 14 } },
              { side: 'bottom', st: { left: 0, bottom: 0, width: '100%', height: 14 } },
              { side: 'left', st: { left: 0, top: 0, width: 14, height: '100%' } },
              { side: 'right', st: { right: 0, top: 0, width: 14, height: '100%' } },
            ].map((s) => (
              <div
                key={`tbs-${s.side}`}
                className="react-tbl-drag-border"
                data-side={s.side}
                style={{ position: 'absolute', zIndex: 25, cursor: 'move', ...s.st }}
                onPointerDown={(ev) => onTableStripDown?.(el, ev)}
              />
            ))}
      </div>
    );
  }

  if (el.type === 'mediavideo') {
    const src = resolveMediaSrc(el);
    const full = el.mvDisplay === 'fullscreen';
    const badgeText =
      (full ? '⛶ ' : '▣ ') + (el.mvStart === 'auto' ? 'Авто' : 'По клику');
    return (
      <div className={elClass} data-id={el.id} style={{ ...style, background: '#000', position: 'relative' }} onPointerDown={onPointerDown}
        {...hfxBind}>
        {full ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,.55)', fontSize: 12, pointerEvents: 'none' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
            </svg>
            <span>Fullscreen</span>
          </div>
        ) : src ? (
          <video
            src={src}
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
            Video
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            top: 5,
            left: 5,
            background: 'rgba(0,0,0,.55)',
            color: 'rgba(255,255,255,.7)',
            fontSize: 9,
            padding: '2px 5px',
            borderRadius: 3,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {badgeText}
        </div>
      </div>
    );
  }

  if (el.type === 'mediaaudio') {
    const src = resolveMediaSrc(el);
    const host = audioPlayerHostStyle(appliedThemeIdx);
    return (
      <div
        className={`${elClass} react-el-audio`}
        data-id={el.id}
        style={{ ...style, ...host }}
        onPointerDown={onPointerDown}
        {...hfxBind}
      >
        <ThemedAudioPlayer
          elId={el.id}
          src={src}
          themeOrIdx={appliedThemeIdx}
          volume={el.maVolume != null ? +el.maVolume : 1}
          loop={!!el.maLoop}
        />
      </div>
    );
  }

  if (el.type === 'markdown') {
    const bgLayer = textBgLayerStyle(el);
    const radius = textBorderRadiusCss(el);
    const borderBox = textBorderBoxStyle(el);
    const borderSvg = textBorderSvgMarkup(el);
    return (
      <div
        className={`${elClass} react-el-md`}
        data-id={el.id}
        style={{
          ...style,
          color: el.mdColor || el.textColor || '#fff',
          fontSize: el.mdFs || 16,
          padding: 10,
          overflow: needsTextBorderOverflow(el) ? 'visible' : 'auto',
          borderRadius: radius || undefined,
          border: borderBox?.border,
          background: 'transparent',
        }}
        onPointerDown={onPointerDown}
        {...hfxBind}
        onDoubleClick={(e) => {
          e.stopPropagation();
          editorApi.editMarkdown(el.id);
        }}
      >
        {bgLayer ? <div aria-hidden="true" style={bgLayer} /> : null}
        {borderSvg ? (
          <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}
            dangerouslySetInnerHTML={{ __html: borderSvg }}
          />
        ) : null}
        <div
          className="md"
          style={{ position: 'relative', zIndex: 1 }}
          dangerouslySetInnerHTML={{ __html: el.mdHtml || '' }}
        />
      </div>
    );
  }

  if (el.type === 'code') {
    const slideOpts = { themeIdx: appliedThemeIdx };
    const surface = codeBlockSurfaceStyle(el, slideOpts);
    const html = codeDisplayHtml(el, slideOpts);
    return (
      <div
        className={elClass}
        data-id={el.id}
        style={{ ...style, padding: 0, overflow: 'hidden', background: 'transparent' }}
        onPointerDown={onPointerDown}
        {...hfxBind}
        onDoubleClick={(e) => {
          e.stopPropagation();
          editorApi.editCode(el.id);
        }}
      >
        <div style={surface}>
          {el.codeLineNums ? (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <pre style={codeGutterCss(el, slideOpts)} aria-hidden="true">
                {codeLineNumbersText(el.codeRaw)}
              </pre>
              <pre
                style={{ margin: 0, whiteSpace: 'pre-wrap', flex: 1, minWidth: 0 }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          ) : (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    );
  }

  if (el.type === 'svg' || el.svgContent || el.svg) {
    const isDecor = !!el._isDecor;
    if (isDecor) attachDecorGlCfg(el);
    const useGl = isDecor && decorUsesGl(el);
    const svgHtml = el.svgContent || el.svg || '';
    const boxStyle = {
      ...style,
      outline: isDecor ? 'none' : style.outline,
      pointerEvents: isDecor ? 'none' : 'auto',
      overflow: 'visible',
      zIndex: isDecor ? 0 : undefined,
    };
    if (useGl) {
      return (
        <div className={`${elClass}${isDecor ? ' react-el-decor' : ''}`} data-id={el.id} style={boxStyle}>
          {svgHtml ? (
            <DecorSvgHost
              html={svgHtml}
              still
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            />
          ) : null}
          <DecorGlView el={el} />
        </div>
      );
    }
    if (isDecor) {
      return (
        <DecorSvgHost
          className={`${elClass} react-el-decor`}
          dataId={el.id}
          style={boxStyle}
          html={svgHtml}
        />
      );
    }
    return (
      <div
        className={`${elClass} react-el-svg`}
        data-id={el.id}
        style={boxStyle}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        {...hfxBind}
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
    );
  }

  if (el.type === 'pagenum') {
    return (
      <div
        className={`${elClass} react-el-pagenum`}
        data-id={el.id}
        style={{
          ...style,
          overflow: 'visible',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
        }}
        onPointerDown={onPointerDown}
        {...hfxBind}
        dangerouslySetInnerHTML={{ __html: el.html || String(el.text || '') }}
      />
    );
  }

  if (el.type === 'htmlframe') {
    const src = el.hfSrc || '';
    const showChrome = el.hfChrome !== false;
    const url = isHttpUrl(src);
    const title = hfTitleFromSrc(src);
    return (
      <div
        className={`${elClass} react-el-hf`}
        data-id={el.id}
        style={{
          ...style,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: showChrome ? 6 : 0,
          border: showChrome ? '1px solid rgba(128,128,128,.25)' : 'none',
          background: 'transparent',
          padding: 0,
        }}
        onPointerDown={onPointerDown}
        {...hfxBind}
        onDoubleClick={(e) => {
          e.stopPropagation();
          editorApi.openHtmlFrameModal();
        }}
      >
        {showChrome ? (
          <div className="react-hf-bar">
            <div className="react-hf-dots">
              <span className="r" />
              <span className="y" />
              <span className="g" />
            </div>
            <div className="react-hf-tab">
              <span className="react-hf-tab-ico">{url ? '🌐' : '⌨'}</span>
              <span className="react-hf-tab-title">{title}</span>
            </div>
          </div>
        ) : null}
        <div className={`react-hf-iframe-wrap${showChrome ? ' has-chrome' : ''}`}>
          <iframe
            className="react-hf-iframe"
            title={title}
            sandbox={HF_SANDBOX}
            allowFullScreen
            scrolling={el.hfScroll ? 'auto' : 'no'}
            src={url ? src : undefined}
            srcDoc={url ? undefined : buildHfSrcdocClickThrough(src, { captureOpaque: true })}
            style={{ pointerEvents: 'auto' }}
          />
        </div>
      </div>
    );
  }

  if (el.type === 'lineangle') {
    const built = buildLineAngleContent(el, els || []);
    const html = built?.html || '';
    return (
      <div
        className={elClass}
        data-id={el.id}
        style={{
          ...style,
          left: built?.x != null ? built.x : style.left,
          top: built?.y != null ? built.y : style.top,
          width: built?.w != null ? built.w : style.width,
          height: built?.h != null ? built.h : style.height,
          overflow: 'visible',
          background: 'transparent',
          pointerEvents: 'none',
        }}
        onPointerDown={onPointerDown}
        {...hfxBind}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (el.type === 'inkhost') {
    const canvasW = usePresentationStore.getState().canvasW || DEFAULT_CANVAS_W;
    const canvasH = usePresentationStore.getState().canvasH || DEFAULT_CANVAS_H;
    const slide = usePresentationStore.getState().slides[usePresentationStore.getState().cur] || {};
    const rawInner = inkHostInnerMarkup(slide, el, inkStrokeSvgMarkup, inkFillsSvgMarkup);
    const hit = inkHostHitMarkup(slide, el);
    // Selection halo for this host's own strokes, rendered *inside* the same SVG as the
    // stroke content (below) instead of the stage-level free-ink layer — that global layer
    // sits outside this div and never rotates with it, so a rotated stroke's halo used to
    // stay stuck at its original, unrotated position while the stroke itself visibly turned.
    const selHere = (el.inkIds || []).map(String).filter((id) => (selInkIds || []).includes(id));
    const rawHalo = selHere.length ? inkSelectionHaloMarkup(slide, selHere) : '';
    const rawCombined = rawHalo + rawInner;
    // While the inkDraw animation is actively revealing this host's strokes, it drives the
    // rendered <path>/<g> nodes directly via stroke-dashoffset/opacity — completely outside
    // React. If this component re-renders for any other reason meanwhile (selection change,
    // an unrelated animPlay flag, etc.), recomputing dangerouslySetInnerHTML here would
    // silently replace those nodes with fresh, fully-visible ones and the animation would
    // appear to just not play (every stroke visible immediately). Freeze the markup we feed
    // React while that's happening; isInkDrawActiveFor is set by inkDrawPlay.js itself, so
    // this covers both the real slide-play pipeline and the editor's hover-preview.
    const inkDrawFrozenRef = frozenInkHtmlRef;
    const animating = isInkDrawActiveFor(el.id);
    if (!animating) inkDrawFrozenRef.current = rawCombined;
    const combined = animating ? inkDrawFrozenRef.current : rawCombined;
    const op = el.elOpacity != null ? +el.elOpacity : 1;
    return (
      <div
        className={`${elClass} react-el-inkhost`}
        data-id={el.id}
        style={{
          ...style,
          // Only the actual stroke/fill hit-paths below should be clickable, not the whole
          // rectangular bounding box — a click on the transparent gap inside it should fall
          // through to whatever's behind the drawing.
          pointerEvents: 'none',
          background: 'transparent',
          border: selected ? '1px dashed rgba(59,130,246,0.55)' : '1px dashed transparent',
          overflow: 'visible',
          opacity: op < 1 ? op : undefined,
        }}
        onPointerDown={onPointerDown}
        title="ink"
      >
        {combined ? (
          <svg
            className="react-inkhost-svg"
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            width={canvasW}
            height={canvasH}
            style={{
              position: 'absolute',
              left: -(el.x || 0),
              top: -(el.y || 0),
              width: canvasW,
              height: canvasH,
              overflow: 'visible',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: combined }}
          />
        ) : null}
        {hit ? (
          <svg
            className="react-inkhost-hit-svg"
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            width={canvasW}
            height={canvasH}
            style={{
              position: 'absolute',
              left: -(el.x || 0),
              top: -(el.y || 0),
              width: canvasW,
              height: canvasH,
              overflow: 'visible',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: hit }}
          />
        ) : null}
      </div>
    );
  }

  if (el.type === 'applet') {
    return (
      <AppletView
        el={el}
        mode="edit"
        selected={selected}
        className={`${elClass} react-el-applet`}
        style={style}
        onPointerDown={onPointerDown}
        {...hfxBind}
        onNotesLive={onNotesLive}
      />
    );
  }

  if (el.type === 'model3d') {
    return (
      <div
        className={`${elClass} react-el-model3d`}
        data-id={el.id}
        style={{ ...style, padding: 0, overflow: 'hidden', background: el.objBgCleared ? 'transparent' : el.objBg || '#0f172a' }}
        onPointerDown={onPointerDown}
        {...hfxBind}
      >
        <Model3dView key={`m3d-${el.id}-${slideCur}`} el={el} slideKey={slideCur} />
      </div>
    );
  }

  if (el.type === 'lego') {
    return (
      <div
        className={`${elClass} react-el-lego`}
        data-id={el.id}
        style={{ ...style, overflow: 'visible', background: 'transparent', padding: 0 }}
        onPointerDown={onPointerDown}
        {...hfxBind}
        dangerouslySetInnerHTML={{ __html: buildLegoSvg(el, els) }}
      />
    );
  }

  if (el.type === 'graph') {
    const graphTheme = el.graphTheme;
    const graphBlur = graphTheme === 'blur';
    const graphTransparent = graphTheme === 'transparent' || graphBlur || el.graphKind === 'chem';
    const graphBg = graphTransparent
      ? 'transparent'
      : el.graphBg || (el.graphDark === false ? '#ffffff' : '#16161e');
    const paths = Array.isArray(el.graphPaths) ? el.graphPaths : [];
    const animateCurve = !!(el.graphAnimate && el.graphAxesImg && paths.length);
    const animDur = Math.max(0.4, Math.min(12, +(el.graphAnimDur ?? 1.8) || 1.8));
    const holdSec = 1;
    const eraseSec = 0.28;
    const animTotal = animDur + holdSec + eraseSec;
    const pDraw = Math.max(1, Math.min(90, (animDur / animTotal) * 100));
    const pHold = Math.max(pDraw + 1, Math.min(99, ((animDur + holdSec) / animTotal) * 100));
    const kfName = `rgstroke_${String(el.id).replace(/[^\w-]/g, '_')}`;
    const showNav = !!(selected && el.graphKind !== 'chem' && el.graphKind !== 'logic' && !animPlayOn);
    const imgFit = {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      display: 'block',
      pointerEvents: 'none',
    };
    const stopNav = (e) => {
      e.stopPropagation();
      e.preventDefault();
    };
    return (
      <div
        className={`${elClass} react-el-graph`}
        data-id={el.id}
        style={{
          ...style,
          padding: 0,
          overflow: 'hidden',
          background: graphBg,
          borderRadius: el.graphRadius ?? 16,
          ...(graphBlur
            ? { backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }
            : null),
        }}
        onPointerDown={onPointerDown}
        {...hfxBind}
      >
        {animateCurve ? (
          <style>{`@keyframes ${kfName}{0%{stroke-dashoffset:1}${pDraw}%{stroke-dashoffset:0}${pHold}%{stroke-dashoffset:0}100%{stroke-dashoffset:1}}`}</style>
        ) : null}
        {el.graphImg ? (
          animateCurve ? (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <img src={el.graphAxesImg} alt="" style={{ ...imgFit, position: 'absolute', inset: 0 }} />
              <svg
                className="react-graph-curves"
                viewBox={`0 0 ${el.graphPathW || 800} ${el.graphPathH || 560}`}
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              >
                {paths.map((p, i) => (
                  <path
                    key={i}
                    className="react-graph-stroke-draw"
                    d={p.d}
                    fill="none"
                    stroke={p.color || el.graphColor || '#6366f1'}
                    strokeWidth={p.width ?? el.graphLineWidth ?? 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength="1"
                    style={{
                      animationName: kfName,
                      animationDuration: `${animTotal}s`,
                      ['--graph-anim-total']: `${animTotal}s`,
                    }}
                  />
                ))}
              </svg>
            </div>
          ) : (
            <img
              src={el.graphImg}
              alt=""
              style={imgFit}
            />
          )
        ) : (
          <div style={{ padding: 8, fontSize: 12, color: '#94a3b8' }}>{el.graphLatex || el.graphExpr || 'graph'}</div>
        )}
        {showNav ? (
          <div className="react-graph-nav" onPointerDown={stopNav} onDoubleClick={stopNav}>
            <button type="button" className="react-graph-nav-btn is-left" title={lang === 'en' ? 'Pan left' : 'Влево'} onClick={() => void editorApi.nudgeSelectedGraph(-1, 0)}>◀</button>
            <button type="button" className="react-graph-nav-btn is-right" title={lang === 'en' ? 'Pan right' : 'Вправо'} onClick={() => void editorApi.nudgeSelectedGraph(1, 0)}>▶</button>
            <button type="button" className="react-graph-nav-btn is-up" title={lang === 'en' ? 'Pan up' : 'Вверх'} onClick={() => void editorApi.nudgeSelectedGraph(0, 1)}>▲</button>
            <button type="button" className="react-graph-nav-btn is-down" title={lang === 'en' ? 'Pan down' : 'Вниз'} onClick={() => void editorApi.nudgeSelectedGraph(0, -1)}>▼</button>
            <button type="button" className="react-graph-nav-btn is-zoom-in" title={lang === 'en' ? 'Zoom in' : 'Крупнее'} onClick={() => void editorApi.zoomSelectedGraph(0.8)}>+</button>
            <button type="button" className="react-graph-nav-btn is-zoom-out" title={lang === 'en' ? 'Zoom out' : 'Мельче'} onClick={() => void editorApi.zoomSelectedGraph(1.25)}>−</button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`${elClass} react-el-stub`} data-id={el.id} style={{ ...style, background: '#334155', color: '#cbd5e1', fontSize: 12, padding: 8 }} onPointerDown={onPointerDown}
        {...hfxBind}>
      {el.type}
    </div>
  );
}

function captureTrustedPointer(e, target = e.currentTarget) {
  if (e.isTrusted) target?.setPointerCapture?.(e.pointerId);
}

export default function SlideCanvas() {
  const hostRef = useRef(null);
  useEffect(() => installHtmlFrameTransparentPointerListener(), []);
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const drawTool = usePresentationStore((s) => s.drawTool);
  const drawColor = usePresentationStore((s) => s.drawColor);
  const drawColorScheme = usePresentationStore((s) => s.drawColorScheme);
  const drawSize = usePresentationStore((s) => s.drawSize);
  const drawNeonBright = usePresentationStore((s) => s.drawNeonBright);
  const drawSmooth = usePresentationStore((s) => s.drawSmooth);
  const drawOpacity = usePresentationStore((s) => s.drawOpacity);
  const drawMarkerOpacity = usePresentationStore((s) => s.drawMarkerOpacity);
  const drawTaper = usePresentationStore((s) => s.drawTaper);
  const drawPressure = usePresentationStore((s) => s.drawPressure);
  const selId = useSelectionStore((s) => s.selId);
  const multiSel = useSelectionStore((s) => s.multiSel);
  const selConnId = useSelectionStore((s) => s.selConnId);
  const selInkIds = useSelectionStore((s) => s.selInkIds);
  const canvasZoom = useUiStore((s) => s.canvasZoom);
  const setCanvasZoom = useUiStore((s) => s.setCanvasZoom);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const snapStep = useUiStore((s) => s.snapStep);
  const extraGuidesMode = useUiStore((s) => s.extraGuidesMode);
  const guidesEditMode = useUiStore((s) => s.guidesEditMode);
  const guidesVisible = useUiStore((s) => s.guidesVisible);
  const selGuideId = useUiStore((s) => s.selGuideId);
  const cropModeElId = useUiStore((s) => s.cropModeElId);
  const shapeFillImgEditId = useUiStore((s) => s.shapeFillImgEditId);
  const tableBorderPaint = useUiStore((s) => s.tableBorderPaint);
  const [fitScale, setFitScale] = useState(1);
  const [hostSize, setHostSize] = useState({ w: 0, h: 0 });
  const [iconsTick, setIconsTick] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [elCtxMenu, setElCtxMenu] = useState(null);
  const lang = useUiStore((s) => s.lang);
  const inlineEditRequestId = useUiStore((s) => s.inlineEditRequestId);
  useEffect(() => onIconsReady(() => setIconsTick((t) => t + 1)), []);
  useEffect(() => {
    if (!iconsTick) return;
    void editorApi.fitAllIconBoundsOnSlide({ silent: true });
  }, [iconsTick, cur]);
  useEffect(() => {
    void import('../../editor/decorAnim.js').then((m) => m.ensureDecorVisibilityResume?.());
  }, []);
  useEffect(() => {
    if (!inlineEditRequestId) return;
    setEditingId(inlineEditRequestId);
    useUiStore.getState().clearInlineEditRequest();
  }, [inlineEditRequestId]);
  const [editingCell, setEditingCell] = useState(null);
  // Leaving a slide must end in-place text/table edit (and drop the DOM selection).
  useEffect(() => {
    setEditingId(null);
    setEditingCell(null);
    try {
      const sel = window.getSelection?.();
      if (sel && !sel.isCollapsed) sel.removeAllRanges();
    } catch (_) {}
  }, [cur]);
  const [band, setBand] = useState(null);
  const [snapGuides, setSnapGuides] = useState([]);
  const [epGhost, setEpGhost] = useState(null);
  const [brushCur, setBrushCur] = useState(null);
  const overlayCurRef = useRef(null);
  const overlayCurOnRef = useRef(false);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const rotDragRef = useRef(null);
  const adjRef = useRef(null);
  const shapeNodeRef = useRef(null);
  const lineEpRef = useRef(null);
  const curveDragRef = useRef(null);
  const guideDragRef = useRef(null);
  const [ctrlNodes, setCtrlNodes] = useState(false);
  const curveEditMode = useUiStore((s) => s.curveEditMode);
  const curveNodeSel = useUiStore((s) => s.curveNodeSel);
  const shapeNodeMode = useUiStore((s) => s.shapeNodeMode);

  useEffect(() => {
    if (!shapeFillImgEditId) return;
    if (String(selId) !== String(shapeFillImgEditId)) {
      useUiStore.getState().setShapeFillImgEditId(null);
    }
  }, [selId, shapeFillImgEditId]);
  const groupResizeRef = useRef(null);
  const groupRotRef = useRef(null);
  const epDragRef = useRef(null);
  const inkRef = useRef(null);
  const inkDragRef = useRef(null);
  const liveInkCanvasRef = useRef(null);
  const livePaintRafRef = useRef(null);
  const cpDragRef = useRef(null);
  const bandRef = useRef(null);
  const movedRef = useRef(false);
  const stageRef = useRef(null);
  const zoomOriginRef = useRef(null);

  const slide = slides[cur] || { els: [], ink: [], connectors: [] };
  const connectorMode = useUiStore((s) => s.connectorMode);
  const drawing = drawTool && drawTool !== 'cursor';
  const showBrushCursor =
    drawTool === 'brush' ||
    drawTool === 'neon' ||
    drawTool === 'marker' ||
    drawTool === 'eraser' ||
    drawTool === 'fill';
  const showTablePaintCursor = !!tableBorderPaint;
  const showOverlayCursor = showBrushCursor || showTablePaintCursor;

  useEffect(() => {
    if (!showOverlayCursor) {
      overlayCurOnRef.current = false;
      setBrushCur(null);
    }
  }, [showOverlayCursor]);

  useEffect(() => {
    if (!connectorMode && (!drawTool || drawTool === 'cursor')) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (editingId) return;
      if (connectorMode) {
        editorApi.cancelConnectorMode();
        useUiStore.getState().showToast(
          useUiStore.getState().lang !== 'en' ? 'Режим связей выключен' : 'Connect mode off',
          'ok'
        );
        return;
      }
      if (drawTool && drawTool !== 'cursor') {
        editorApi.setDrawTool('cursor');
      }
    };
    const onDocPointer = (e) => {
      if (!connectorMode) return;
      const host = hostRef.current;
      if (host && host.contains(e.target)) return;
      // Click completely outside the canvas host exits connect mode.
      editorApi.cancelConnectorMode();
      useUiStore.getState().showToast(
        useUiStore.getState().lang !== 'en' ? 'Режим связей выключен' : 'Connect mode off',
        'ok'
      );
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDocPointer, true);
    if (connectorMode || (drawTool && drawTool !== 'cursor' && drawTool !== 'eraser')) {
      document.body.style.cursor = showBrushCursor ? 'none' : 'crosshair';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDocPointer, true);
      document.body.style.cursor = '';
    };
  }, [connectorMode, editingId, drawTool, showBrushCursor]);
  const scale = fitScale * canvasZoom;
  const zoomPad = CANVAS_ZOOM_PAD;
  const slideDispW = Math.round(canvasW * scale);
  const slideDispH = Math.round(canvasH * scale);
  const spaceW = Math.max(hostSize.w || 0, slideDispW + zoomPad * 2);
  const spaceH = Math.max(hostSize.h || 0, slideDispH + zoomPad * 2);
  const stageLeft = (spaceW - slideDispW) / 2;
  const stageTop = (spaceH - slideDispH) / 2;
  const selectedIds = useMemo(() => {
    const set = new Set((multiSel || []).map(String));
    if (selId) set.add(String(selId));
    return set;
  }, [selId, multiSel]);

  const soleSelected = useMemo(() => {
    if (selectedIds.size !== 1) return null;
    const id = [...selectedIds][0];
    const el = (slide.els || []).find((e) => e && String(e.id) === id && !e._isDecor) || null;
    // Grouped objects are never resized/rotated alone — chrome is on the group bbox.
    if (el?.groupId) {
      const n = (slide.els || []).filter((e) => e && e.groupId === el.groupId && !e._isDecor).length;
      if (n > 1) return null;
    }
    return el;
  }, [selectedIds, slide.els]);

  /** Selection chrome follows ride-anchor display position. */
  const soleSelectedView = useMemo(
    () => (soleSelected ? elWithRideDisplay(soleSelected, slide) : null),
    [soleSelected, slide]
  );

  const multiMembers = useMemo(() => {
    const els = (slide.els || []).filter((e) => e && !e._isDecor);
    if (!selectedIds.size) return null;
    const picked = els.filter((e) => selectedIds.has(String(e.id)));
    if (!picked.length) return null;
    const gid = picked.find((e) => e.groupId)?.groupId;
    if (gid) {
      const members = els.filter((e) => e.groupId === gid);
      if (members.length >= 2) return members;
    }
    if (selectedIds.size < 2) return null;
    return picked.length >= 2 ? picked : null;
  }, [selectedIds, slide.els]);

  const groupBBox = useMemo(() => (multiMembers ? unionBBox(multiMembers) : null), [multiMembers]);

  const adjHandles = useMemo(
    () => (soleSelected && soleSelected.type === 'shape' ? listShapeAdjHandles(soleSelected) : []),
    [soleSelected]
  );

  const lineEpHandles = useMemo(() => {
    if (!soleSelected || soleSelected.shape !== 'line') return [];
    let el = soleSelected;
    if (el._lineCapV !== 2) {
      const mig = migrateLineCapGeometry(el);
      if (mig) el = { ...el, ...mig };
    }
    return listLineEpHandles(el, {
      joinedA: lineEndLooksJoined(slide, el, 'a'),
      joinedB: lineEndLooksJoined(slide, el, 'b'),
    });
  }, [soleSelected, slide]);

  useEffect(() => {
    if (!soleSelected || soleSelected.shape !== 'line' || soleSelected._lineCapV === 2) return;
    const mig = migrateLineCapGeometry(soleSelected);
    if (mig) usePresentationStore.getState().patchElement(soleSelected.id, mig);
  }, [soleSelected?.id, soleSelected?.shape, soleSelected?._lineCapV]);

  useEffect(() => {
    const store = usePresentationStore.getState();
    const sl = store.slides[store.cur];
    if (!sl) return;
    const hasLegacy = (sl.els || []).some(
      (el) =>
        el &&
        el.shape === 'line' &&
        el.lineJoin &&
        (isLegacyJoinRef(el.lineJoin.a) || isLegacyJoinRef(el.lineJoin.b))
    );
    if (!hasLegacy && sl.lineJunctions) return;
    store.mutateCurrentSlide((s) => {
      if (!s.lineJunctions) s.lineJunctions = {};
      migrateSlideLineJoins(s);
    }, { live: true });
  }, [cur]);

  const curveOverlay = useMemo(() => {
    if (!curveEditMode || !soleSelected || soleSelected.shape !== 'curve') {
      return { nodes: [], cps: [], lines: [] };
    }
    return listCurveEditorHandles(soleSelected, curveNodeSel);
  }, [curveEditMode, soleSelected, curveNodeSel]);

  useEffect(() => {
    if (!soleSelected || soleSelected.shape !== 'curve') {
      if (useUiStore.getState().curveEditMode) useUiStore.getState().setCurveEditMode(false);
      if ((useUiStore.getState().curveNodeSel || []).length) useUiStore.getState().setCurveNodeSel([]);
    }
  }, [soleSelected?.id, soleSelected?.shape]);

  useEffect(() => {
    if (!curveEditMode) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' && e.key !== 'Enter') return;
      if (editingId) return;
      e.preventDefault();
      const el = soleSelected;
      useUiStore.getState().setCurveEditMode(false);
      if (el && el.shape === 'curve') {
        const patch = applyCurveBBox(el);
        if (patch) editorApi.patchElementHistory(el.id, patch);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [curveEditMode, soleSelected, editingId]);

  const showShapeNodes = !!(
    soleSelected &&
    !soleSelected.locked &&
    shapeSupportsNodes(soleSelected) &&
    (shapeNodeMode || ctrlNodes)
  );

  const shapeNodeHandles = useMemo(
    () => (showShapeNodes ? listShapeNodeHandles(soleSelected) : []),
    [showShapeNodes, soleSelected]
  );

  useEffect(() => {
    const onDown = (e) => {
      if (e.key === 'Control' || e.key === 'Meta') setCtrlNodes(true);
    };
    const onUp = (e) => {
      if (e.key === 'Control' || e.key === 'Meta') setCtrlNodes(false);
    };
    const onBlur = () => setCtrlNodes(false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    if (!soleSelected || !shapeSupportsNodes(soleSelected)) {
      if (useUiStore.getState().shapeNodeMode) useUiStore.getState().setShapeNodeMode(false);
    }
  }, [soleSelected?.id, soleSelected?.type, soleSelected?.shape]);

  useEffect(() => {
    if (!shapeNodeMode) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' && e.key !== 'Enter') return;
      if (editingId) return;
      e.preventDefault();
      useUiStore.getState().setShapeNodeMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shapeNodeMode, editingId]);

  const guideLines = useMemo(() => {
    if (extraGuidesKind(extraGuidesMode) === 'none') return [];
    return extraGuideLines(extraGuidesMode, canvasW, canvasH);
  }, [extraGuidesMode, canvasW, canvasH]);

  /** Classification zone guides — only while the Check button is selected. */
  const classGuideLines = useMemo(() => {
    const els = slide?.els || [];
    const selected =
      (selId && els.find((e) => e && String(e.id) === String(selId))) ||
      null;
    if (!selected || selected.type !== 'applet' || selected.appletId !== 'classification') {
      return [];
    }
    return classificationGuideLines(selected, canvasW, canvasH);
  }, [slide?.els, selId, canvasW, canvasH]);

  // Deck-wide guides: same on every slide; visibility toggle hides draw + snap.
  const deckGuides = usePresentationStore((s) => (Array.isArray(s.guides) ? s.guides : []));
  const customSlideGuides = guidesVisible ? deckGuides : [];
  const allGuideLines = useMemo(
    () => [...guideLines, ...classGuideLines, ...customGuidesToSnapLines(customSlideGuides)],
    [guideLines, classGuideLines, customSlideGuides],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const fit = () => {
      const vw = host.clientWidth;
      const vh = host.clientHeight;
      setHostSize({ w: vw, h: vh });
      const w = vw - zoomPad * 2;
      const h = vh - zoomPad * 2;
      if (w < 8 || h < 8) return;
      // Fill height or width (whichever binds) with pad margins — do not cap at 1.
      setFitScale(Math.min(w / canvasW, h / canvasH));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    return () => ro.disconnect();
  }, [canvasW, canvasH, zoomPad]);

  useLayoutEffect(() => {
    const vp = hostRef.current;
    if (!vp) return;
    const origin = zoomOriginRef.current;
    if (origin) {
      zoomOriginRef.current = null;
      vp.scrollLeft = origin.contentX * scale + stageLeft - origin.vx;
      vp.scrollTop = origin.contentY * scale + stageTop - origin.vy;
      return;
    }
    // Button / fit / reset: keep slide centered in the scrollport.
    centerCanvasViewport();
  }, [scale, stageLeft, stageTop, spaceW, spaceH]);

  useEffect(() => {
    const vp = hostRef.current;
    if (!vp) return undefined;
    const onWheel = (e) => {
      if (editingId) return;
      e.preventDefault();
      const zoomed = isCanvasZoomedIn();
      if (e.shiftKey && zoomed) {
        vp.scrollTop += e.deltaY;
        return;
      }
      if (e.ctrlKey && zoomed) {
        vp.scrollLeft += e.deltaY;
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        // Browser page-zoom gesture: still zoom the slide.
      }
      const factor = Math.pow(0.999, e.deltaY);
      const next = clampCanvasZoom(canvasZoom * factor);
      if (Math.abs(next - canvasZoom) < 0.0005) return;
      const rect = vp.getBoundingClientRect();
      const vx = e.clientX - rect.left;
      const vy = e.clientY - rect.top;
      const contentX = (vp.scrollLeft + vx - stageLeft) / Math.max(0.001, scale);
      const contentY = (vp.scrollTop + vy - stageTop) / Math.max(0.001, scale);
      zoomOriginRef.current = { contentX, contentY, vx, vy };
      setCanvasZoom(next);
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [editingId, canvasZoom, scale, stageLeft, stageTop, setCanvasZoom]);

  function gridSnap(v) {
    // Without snap: keep sub-pixels (hundredths) so zoomed edits are smooth.
    if (!snapEnabled) return Math.round(v * 100) / 100;
    const step = Math.max(1, snapStep || 20);
    return Math.round(v / step) * step;
  }

  const inkPath = useMemo(() => {
    const hosted = hostedInkIdSet(slide);
    return (slide.ink || [])
      .filter((st) => st && !hosted.has(String(st.id)))
      .map((st) => inkStrokeSvgMarkup(st))
      .filter(Boolean)
      .join('');
  }, [slide.ink, slide.els]);

  const freeInkFills = useMemo(() => {
    const hosted = hostedInkIdSet(slide);
    return (slide.inkFills || []).filter((f) => f && !hosted.has(String(f.id)));
  }, [slide.inkFills, slide.els]);

  useEffect(() => {
    const hasInk = (slide.ink || []).length || (slide.inkFills || []).length;
    if (!hasInk) return;
    const hosted = hostedInkIdSet(slide);
    const orphan =
      (slide.ink || []).some((s) => s?.id && !hosted.has(String(s.id))) ||
      (slide.inkFills || []).some((f) => f?.id && !hosted.has(String(f.id)));
    if (orphan) usePresentationStore.getState().ensureInkHosts();
  }, [cur, slide.ink, slide.inkFills, slide.els]);

  const inkHaloMarkup = useMemo(() => {
    // Hosted strokes get their halo drawn inside their own (correctly rotating) inkhost SVG
    // instead — see ElementView's `el.type === 'inkhost'` branch. Only genuinely free/
    // unhosted strokes belong in this stage-level, non-rotating layer.
    const hosted = hostedInkIdSet(slide);
    const freeSelIds = (selInkIds || []).filter((id) => !hosted.has(String(id)));
    return inkSelectionHaloMarkup(slide, freeSelIds);
  }, [slide.ink, slide.inkFills, slide.els, selInkIds]);

  function canvasPoint(e) {
    const stage = stageRef.current || hostRef.current?.querySelector('.react-slide-stage');
    if (!stage) return null;
    const r = stage.getBoundingClientRect();
    return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
  }

  /** Cache DOM nodes once; move via GPU translate3d — no React re-render during drag. */
  function ensureDragDom(drag) {
    if (drag.domReady) return;
    const stage = stageRef.current;
    if (!stage) return;
    const idSet = new Set((drag.ids || []).map(String));
    drag.domEls = [];
    idSet.forEach((id) => {
      const node = stage.querySelector(`.react-el[data-id="${CSS.escape(String(id))}"]`);
      if (!node) return;
      drag.domEls.push({
        node,
        baseTranslate: node.style.translate,
      });
      node.style.willChange = 'transform';
    });
    drag.domChrome = [];
    stage
      .querySelectorAll(
        '.react-sel-outline, .react-rh, .react-group-outline, .react-group-rh, .react-group-rot, .react-adj-handle, .react-line-ep, .react-ep-handle, .react-curve-handle, .react-sel-frame'
      )
      .forEach((node) => {
        drag.domChrome.push({
          node,
          baseTranslate: node.style.translate,
        });
        node.style.willChange = 'transform';
      });
    drag.guideLayer = stage.querySelector('.react-snap-guides-live');
    if (!drag.guideLayer) {
      drag.guideLayer = document.createElement('div');
      drag.guideLayer.className = 'react-snap-guides-live';
      stage.appendChild(drag.guideLayer);
    }
    drag.domReady = true;
  }

  function applyDragDom(drag, dx, dy) {
    ensureDragDom(drag);
    const translation = dx || dy ? `${dx}px ${dy}px` : '';
    (drag.domEls || []).forEach(({ node }) => {
      node.style.translate = translation;
    });
    (drag.domChrome || []).forEach(({ node }) => {
      node.style.translate = translation;
    });
  }

  function syncDragGuidesDom(drag, guides) {
    ensureDragDom(drag);
    const layer = drag.guideLayer;
    if (!layer) return;
    const list = guides || [];
    while (layer.childNodes.length > list.length) layer.removeChild(layer.lastChild);
    list.forEach((g, i) => {
      let el = layer.childNodes[i];
      if (!el) {
        el = document.createElement('div');
        layer.appendChild(el);
      }
      el.className = `react-guide-extra snap ${g.t === 'h' ? 'h' : 'v'}`;
      if (g.t === 'h') {
        el.style.top = `${g.pos}px`;
        el.style.left = '';
      } else {
        el.style.left = `${g.pos}px`;
        el.style.top = '';
      }
    });
  }

  function clearDragDom(drag) {
    if (!drag) return;
    (drag.domEls || []).forEach(({ node, baseTranslate }) => {
      node.style.translate = baseTranslate;
      node.style.willChange = '';
    });
    (drag.domChrome || []).forEach(({ node, baseTranslate }) => {
      node.style.translate = baseTranslate;
      node.style.willChange = '';
    });
    if (drag.guideLayer) {
      drag.guideLayer.remove();
      drag.guideLayer = null;
    }
    if (drag.winMove) {
      window.removeEventListener('pointermove', drag.winMove);
      window.removeEventListener('pointerup', drag.winUp);
      window.removeEventListener('pointercancel', drag.winUp);
      drag.winMove = null;
      drag.winUp = null;
    }
  }

  function bindDragWindowListeners(drag) {
    if (drag.winMove) return;
    drag.winMove = (e) => {
      if (!dragRef.current) return;
      onStagePointerMove(e);
    };
    drag.winUp = () => {
      onStagePointerUp();
    };
    window.addEventListener('pointermove', drag.winMove, { passive: false });
    window.addEventListener('pointerup', drag.winUp);
    window.addEventListener('pointercancel', drag.winUp);
  }

  function liveCanvasPad(stroke) {
    let pad = Math.max(120, Math.ceil(Math.max(canvasW, canvasH) * 0.25));
    const pts = stroke?.points;
    if (pts?.length) {
      let minX = pts[0].x;
      let minY = pts[0].y;
      let maxX = pts[0].x;
      let maxY = pts[0].y;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      const w = +stroke.width || 6;
      const glowExtra =
        stroke.tool === 'neon' ? Math.ceil(Math.max(8, w * 4) * (0.75 + ((+stroke.neonBright || 75) / 100) * 0.8)) : 0;
      const sw = Math.max(8, w * 2) + glowExtra;
      pad = Math.max(
        pad,
        Math.ceil(-minX + sw),
        Math.ceil(-minY + sw),
        Math.ceil(maxX - canvasW + sw),
        Math.ceil(maxY - canvasH + sw)
      );
    }
    return Math.min(pad, Math.max(canvasW, canvasH) * 2);
  }

  function paintLiveInk(stroke) {
    const cnv = liveInkCanvasRef.current;
    if (!cnv || !stroke) return;
    const ctx = cnv.getContext('2d');
    if (!ctx) return;
    const pad = liveCanvasPad(stroke);
    const prevPad = +cnv.dataset.pad || 0;
    const usePad = Math.max(pad, prevPad);
    const cssW = canvasW + usePad * 2;
    const cssH = canvasH + usePad * 2;
    if (cnv.width !== cssW || cnv.height !== cssH || prevPad !== usePad) {
      cnv.width = cssW;
      cnv.height = cssH;
      cnv.dataset.pad = String(usePad);
      cnv.style.left = `${-usePad}px`;
      cnv.style.top = `${-usePad}px`;
      cnv.style.width = `${cssW}px`;
      cnv.style.height = `${cssH}px`;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cnv.width, cnv.height);
    ctx.setTransform(1, 0, 0, 1, usePad, usePad);
    if (stroke.tool === 'eraser' || !stroke.points?.length) return;
    const st = { ...stroke, points: normalizeInkPoints(stroke.points) };
    const op = st.opacity != null ? +st.opacity : 1;
    if (isBrushFamily(st.tool)) {
      const stamps = brushStamps(st, 1, 1);
      if (st.tool === 'neon') paintNeonStamps(ctx, stamps, st.color || '#38bdf8', st, op);
      else {
        ctx.save();
        ctx.globalAlpha = op;
        ctx.fillStyle = st.color || '#64748b';
        fillBrushStamps(ctx, stamps);
        ctx.restore();
      }
      return;
    }
    const geom = hardStrokeGeom(st.tool === 'marker' ? { ...st, pressure: false } : st, 1, 1);
    if (!geom) return;
    ctx.save();
    ctx.globalAlpha = op;
    ctx.strokeStyle = st.color || '#64748b';
    ctx.fillStyle = st.color || '#64748b';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (geom.circle) {
      ctx.beginPath();
      ctx.arc(geom.circle.cx, geom.circle.cy, geom.circle.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (geom.d) {
      ctx.lineWidth = geom.width;
      try {
        ctx.stroke(new Path2D(geom.d));
      } catch (err) {}
    }
    ctx.restore();
  }

  function scheduleLivePaint() {
    // Coalesce live-preview repaints to at most one per animation frame. Pointer/pen input
    // can fire pointermove far more often than the screen refreshes (high-poll-rate mice,
    // most styluses), and neon's live preview redraws its whole accumulated stroke with two
    // blur passes every call — repainting once per raw event instead of once per frame means
    // doing that expensive work multiple times for a single visible frame. This doesn't drop
    // or simplify any point: inkRef.current.points still gets every sample in full, and the
    // committed stroke is unaffected — only how often the (in-progress) preview repaints.
    if (livePaintRafRef.current != null) return;
    livePaintRafRef.current = requestAnimationFrame(() => {
      livePaintRafRef.current = null;
      if (inkRef.current) paintLiveInk(inkRef.current);
    });
  }

  function clearLiveInkCanvas() {
    if (livePaintRafRef.current != null) {
      cancelAnimationFrame(livePaintRafRef.current);
      livePaintRafRef.current = null;
    }
    const cnv = liveInkCanvasRef.current;
    if (!cnv) return;
    const ctx = cnv.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cnv.width, cnv.height);
    }
    cnv.dataset.pad = '0';
    cnv.width = canvasW;
    cnv.height = canvasH;
    cnv.style.left = '0';
    cnv.style.top = '0';
    cnv.style.width = '100%';
    cnv.style.height = '100%';
  }

  /** Start corner-rotate if the pointer is in the selection's rotate zone.
   * Must win over other objects' boxes (incl. transparent PNG padding) under the corner. */
  function tryBeginCornerRotate(e) {
    if (e.target.closest?.('.react-rh, .react-group-rh, .react-group-rot, .react-cp-handle, .react-ep-handle, .react-adj-handle, .react-line-ep, .react-curve-handle')) {
      return false;
    }
    if (
      groupBBox &&
      multiMembers &&
      !multiMembers.some((el) => el.locked)
    ) {
      const pt0 = canvasPoint(e);
      const virt = { x: groupBBox.x, y: groupBBox.y, w: groupBBox.w, h: groupBBox.h, rot: 0 };
      if (pt0 && nearCornerRot(virt, pt0[0], pt0[1], scale)) {
        e.preventDefault();
        e.stopPropagation();
        onGroupRotPointerDown(e);
        return true;
      }
      return false;
    }
    if (
      soleSelectedView &&
      !soleSelectedView.locked &&
      soleSelectedView.type !== 'lego' &&
      soleSelectedView.type !== 'lineangle' &&
      soleSelectedView.shape !== 'line' &&
      !(curveEditMode && soleSelectedView.shape === 'curve') &&
      !shapeNodeMode
    ) {
      const pt0 = canvasPoint(e);
      if (pt0 && nearCornerRot(soleSelectedView, pt0[0], pt0[1], scale)) {
        e.preventDefault();
        e.stopPropagation();
        const cx = (soleSelectedView.x || 0) + (soleSelectedView.w || 0) / 2;
        const cy = (soleSelectedView.y || 0) + (soleSelectedView.h || 0) / 2;
        rotDragRef.current = {
          id: soleSelectedView.id,
          cx,
          cy,
          a0: (Math.atan2(pt0[1] - cy, pt0[0] - cx) * 180) / Math.PI,
          rot0: elRotationDeg(soleSelectedView),
        };
        movedRef.current = false;
        captureTrustedPointer(e);
        return true;
      }
    }
    return false;
  }

  function onStagePointerDown(e) {
    if (guidesEditMode) {
      const gpt = canvasPoint(e);
      if (gpt) {
        const th = Math.max(4, 10 / Math.max(0.001, scale));
        let best = null;
        (customSlideGuides || []).forEach((g) => {
          if (!g) return;
          const d = hitTestGuide(g, gpt[0], gpt[1], canvasW, canvasH, th);
          if (d != null && (!best || d < best.d)) best = { g, d };
        });
        if (best) {
          onGuidePointerDown(best.g, e);
          return;
        }
        useUiStore.getState().setSelGuideId(null);
      }
    }
    if (drawing) {
      const pt = canvasPoint(e);
      if (!pt) return;
      e.preventDefault();
      e.stopPropagation();
      if (drawTool === 'fill') {
        const fillHit = pickInkAt(pt[0], pt[1], [], slide.inkFills || []);
        if (fillHit && fillHit.tool == null) {
          const additive = !!(e.shiftKey || e.ctrlKey || e.metaKey);
          editorApi.pickInk(fillHit.id, { additive });
          if (!additive) {
            inkDragRef.current = { px: pt[0], py: pt[1], lastX: pt[0], lastY: pt[1] };
            captureTrustedPointer(e);
          }
          return;
        }
        editorApi.bucketFillAt(pt[0], pt[1]);
        return;
      }
      const size =
        drawTool === 'eraser'
          ? Math.max(6, drawSize || 20)
          : drawTool === 'marker'
            ? Math.max(drawSize || 14, 6)
            : drawTool === 'neon'
              ? Math.max(drawSize || 6, 1.5)
              : drawSize || 6;
      const opPct = drawTool === 'marker' ? drawMarkerOpacity ?? 40 : drawOpacity ?? 100;
      const color = drawTool === 'eraser' ? 'transparent' : drawColor || '#64748b';
      const pressure = e.pressure > 0 && e.pointerType === 'pen' ? e.pressure : 0.5;
      inkRef.current = {
        tool: drawTool,
        color,
        colorScheme: drawTool === 'eraser' ? null : drawColorScheme || null,
        width: size,
        points: [{ x: pt[0], y: pt[1], p: pressure, t: performance.now() }],
        smooth: drawSmooth ?? 40,
        taper: drawTaper || 'both',
        pressure: !!drawPressure,
        opacity: Math.max(0.05, Math.min(1, opPct / 100)),
        neonBright: drawTool === 'neon' ? drawNeonBright ?? 75 : undefined,
      };
      if (drawTool !== 'eraser') {
        paintLiveInk(inkRef.current);
      } else {
        // Erase right away from the initial touch point too — previously the first erase
        // pass only ran on the first pointermove, so a stationary tap (press + release with
        // no drag) never erased anything even when it landed squarely on a stroke.
        const pts = inkRef.current.points.map((p) => [p.x, p.y]);
        editorApi.eraseInkNear(pts, (inkRef.current.width || 10) * 0.75);
      }
      captureTrustedPointer(e);
      return;
    }
    // Corner rotate before ignoring .react-el — transparent padding of a neighbour image
    // still targets that .react-el, which used to swallow the rotate gesture.
    if (tryBeginCornerRotate(e)) return;
    if (e.target.closest('.react-el') || e.target.closest('.react-rh') || e.target.closest('.react-cp-handle') || e.target.closest('.react-group-rh') || e.target.closest('.react-group-rot') || e.target.closest('.react-ep-handle') || e.target.closest('.react-adj-handle') || e.target.closest('.react-line-ep') || e.target.closest('.react-curve-handle')) return;
    if (useUiStore.getState().connectorMode) {
      // Click outside objects (empty slide / chrome) exits connect mode.
      editorApi.cancelConnectorMode();
      useUiStore.getState().showToast(
        useUiStore.getState().lang !== 'en' ? 'Режим связей выключен' : 'Connect mode off',
        'ok'
      );
      return;
    }
    const pt = canvasPoint(e);
    if (!pt) return;
    const hit = pickInkAt(pt[0], pt[1], slide.ink || [], slide.inkFills || []);
    if (hit?.id) {
      const additive = !!(e.shiftKey || e.ctrlKey || e.metaKey);
      const already = (selInkIds || []).map(String).includes(String(hit.id));
      if (additive) {
        editorApi.pickInk(hit.id, { additive: true });
      } else if (!already) {
        editorApi.pickInk(hit.id);
      }
      if (!additive) {
        inkDragRef.current = { px: pt[0], py: pt[1], lastX: pt[0], lastY: pt[1] };
      }
      setEditingId(null);
      setEditingCell(null);
      captureTrustedPointer(e);
      return;
    }
    bandRef.current = { x0: pt[0], y0: pt[1], x1: pt[0], y1: pt[1] };
    setBand({ ...bandRef.current });
    editorApi.pickElement(null);
    setEditingId(null);
    setEditingCell(null);
    captureTrustedPointer(e);
  }

  function moveOverlayCursor(x, y) {
    const node = overlayCurRef.current;
    if (node) node.style.transform = `translate(${x}px, ${y}px)`;
  }

  function onStagePointerMove(e) {
    if (!drawing && !dragRef.current && !resizeRef.current && !inkRef.current) {
      const root = stageRef.current || hostRef.current;
      const id = hoverTargetIdAt(slide.els, root, e.clientX, e.clientY, {
        skipId: selId,
        editingId,
      });
      if (useUiStore.getState().hfxHoverId !== id) useUiStore.getState().setHfxHoverId(id);
    }
    if (showTablePaintCursor) {
      if (!overlayCurOnRef.current) {
        overlayCurOnRef.current = true;
        setBrushCur({ x: e.clientX, y: e.clientY });
      }
      moveOverlayCursor(e.clientX, e.clientY);
    } else if (showBrushCursor) {
      setBrushCur({ x: e.clientX, y: e.clientY });
    }
    if (
      !rotDragRef.current &&
      !resizeRef.current &&
      !dragRef.current &&
      !groupRotRef.current &&
      !groupResizeRef.current &&
      groupBBox &&
      multiMembers &&
      !multiMembers.some((el) => el.locked)
    ) {
      const ptHover = canvasPoint(e);
      const stage = stageRef.current;
      if (stage && ptHover) {
        const virt = { x: groupBBox.x, y: groupBBox.y, w: groupBBox.w, h: groupBBox.h, rot: 0 };
        const near = nearCornerRot(virt, ptHover[0], ptHover[1], scale);
        stage.classList.toggle('is-rot-hover', !!near);
      }
    } else if (
      !rotDragRef.current &&
      !resizeRef.current &&
      !dragRef.current &&
      !groupRotRef.current &&
      !groupResizeRef.current &&
      soleSelectedView &&
      !soleSelectedView.locked &&
      soleSelectedView.type !== 'lego' &&
      soleSelectedView.type !== 'lineangle' &&
      soleSelectedView.shape !== 'line' &&
      !(curveEditMode && soleSelectedView.shape === 'curve') &&
      !shapeNodeMode
    ) {
      const ptHover = canvasPoint(e);
      const stage = stageRef.current;
      if (stage && ptHover) {
        const near = nearCornerRot(soleSelectedView, ptHover[0], ptHover[1], scale);
        stage.classList.toggle('is-rot-hover', !!near);
      }
    } else if (stageRef.current) {
      stageRef.current.classList.remove('is-rot-hover');
    }
    if (cpDragRef.current) {
      const pt = canvasPoint(e);
      if (!pt) return;
      const d = cpDragRef.current;
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      const patch =
        d.which === 'cp1'
          ? { cp1: { x: pt[0], y: pt[1] }, _cpManual: true }
          : { cp2: { x: pt[0], y: pt[1] }, _cpManual: true };
      // keep the other cp from start
      if (d.which === 'cp1' && d.startCp2) patch.cp2 = d.startCp2;
      if (d.which === 'cp2' && d.startCp1) patch.cp1 = d.startCp1;
      usePresentationStore.getState().patchConnector(d.id, patch);
      return;
    }
    if (inkRef.current) {
      const pt = canvasPoint(e);
      if (pt) {
        const pressure = e.pressure > 0 && e.pointerType === 'pen' ? e.pressure : 0.5;
        inkRef.current.points.push({ x: pt[0], y: pt[1], p: pressure, t: performance.now() });
        if (inkRef.current.tool === 'eraser') {
          // Erase immediately while moving (like v7.1). {live:true}: cheap per-move update,
          // no history snapshot / persist on every sample — see onStagePointerUp for the
          // single persist() at the end of the gesture. Only test the newest travelled
          // segment (previous point → this one), not the whole accumulated path: strokes
          // only ever get removed here, never added, so anything near an earlier segment
          // was already caught (and erased) on the move that produced it — rescanning the
          // full growing history every single move is wasted, compounding work for no
          // benefit.
          const n = inkRef.current.points.length;
          const from = n >= 2 ? n - 2 : 0;
          const pts = inkRef.current.points.slice(from).map((p) => [p.x, p.y]);
          editorApi.eraseInkNear(pts, (inkRef.current.width || 10) * 0.75, { live: true });
        } else {
          scheduleLivePaint();
        }
      }
      return;
    }
    if (inkDragRef.current) {
      const pt = canvasPoint(e);
      if (!pt) return;
      const d = inkDragRef.current;
      const dx = pt[0] - d.lastX;
      const dy = pt[1] - d.lastY;
      if (!dx && !dy) return;
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      d.lastX = pt[0];
      d.lastY = pt[1];
      editorApi.moveSelectedInk(dx, dy, { live: true });
      return;
    }
    if (guideDragRef.current) {
      const gd = guideDragRef.current;
      const pt = canvasPoint(e);
      if (!pt) return;
      let next = {
        id: gd.id,
        x: gd.ox + (pt[0] - gd.px),
        y: gd.oy + (pt[1] - gd.py),
        angle: gd.start.angle,
      };
      const th = Math.max(3, EXTRA_GUIDE_TH / Math.max(0.001, scale));
      const snapped = snapGuideToObjectEdges(next, slide.els || [], th);
      next = { id: gd.id, x: snapped.x, y: snapped.y, angle: next.angle };
      const hvHits = (snapped.hit || []).filter((h) => h.t === 'h' || h.t === 'v');
      setSnapGuides(hvHits);
      if (!movedRef.current) {
        if (!gd.copied) useHistoryStore.getState().push();
        movedRef.current = true;
      }
      usePresentationStore.getState().mutateGuides((list) => {
        for (let i = 0; i < list.length; i++) {
          if (list[i] && String(list[i].id) === String(gd.id)) {
            list[i] = { ...list[i], ...next };
            break;
          }
        }
      }, { live: true });
      return;
    }
    if (bandRef.current) {
      const pt = canvasPoint(e);
      if (!pt) return;
      bandRef.current.x1 = pt[0];
      bandRef.current.y1 = pt[1];
      setBand({ ...bandRef.current });
      return;
    }
    if (epDragRef.current) {
      const d = epDragRef.current;
      const pt = canvasPoint(e);
      if (!pt) return;
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      const otherId = d.which === 'from' ? d.toId : d.fromId;
      const snap = snapToNearestEdge(
        { x: pt[0], y: pt[1] },
        slide.els || [],
        { threshold: 56, excludeId: otherId, includeCenter: true }
      );
      d.ghost = snap ? snap.point : { x: pt[0], y: pt[1] };
      d.snap = snap;
      setEpGhost({ ...d.ghost, ok: !!snap });
      if (snap) {
        const patch =
          d.which === 'from'
            ? { fromId: snap.elId, fromSide: snap.side }
            : { toId: snap.elId, toSide: snap.side };
        if ((d.route || 'curve') === 'curve' && !d.cpManual) {
          const ends = connectorEndpoints(
            {
              fromId: d.which === 'from' ? snap.elId : d.fromId,
              toId: d.which === 'to' ? snap.elId : d.toId,
              fromSide: d.which === 'from' ? snap.side : d.fromSide,
              toSide: d.which === 'to' ? snap.side : d.toSide,
            },
            slide.els || []
          );
          if (ends) {
            const def = defaultControlPoints(ends.p1, ends.p2);
            patch.cp1 = def.cp1;
            patch.cp2 = def.cp2;
          }
        }
        usePresentationStore.getState().patchConnector(d.id, patch, { live: true });
      }
      return;
    }
    if (groupRotRef.current) {
      const g = groupRotRef.current;
      const pt = canvasPoint(e);
      if (!pt) return;
      let ang = (Math.atan2(pt[1] - g.cy, pt[0] - g.cx) * 180) / Math.PI;
      let delta = ang - g.a0;
      if (e.shiftKey) delta = Math.round(delta / 15) * 15;
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      const patches = rotateGroupMembers(g.bbox, delta, g.startMembers);
      if (g.inkHostIds && g.inkHostIds.size) {
        // Drawing objects in the group orbit via their own point data (see
        // rotateInkFromSnapshot) instead of the x/y/rot patch rotateGroupMembers computed
        // for them above — applying that too would spin the host's CSS box on top of the
        // already-rotated points, rotating it twice.
        g.inkHostIds.forEach((id) => delete patches[id]);
      }
      if (Object.keys(patches).length) {
        usePresentationStore.getState().applyElementPatches(patches, { live: true });
      }
      if (g.inkSnapshot) {
        usePresentationStore.getState().rotateInkFromSnapshot(
          g.inkSnapshot,
          { x: g.cx, y: g.cy },
          delta,
          { live: true }
        );
      }
      return;
    }
    if (rotDragRef.current) {
      const rd = rotDragRef.current;
      const pt = canvasPoint(e);
      if (!pt) return;
      const a = (Math.atan2(pt[1] - rd.cy, pt[0] - rd.cx) * 180) / Math.PI;
      let next = rd.rot0 + (a - rd.a0);
      if (e.shiftKey) next = Math.round(next / 15) * 15;
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      usePresentationStore.getState().applyElementPatches(
        { [rd.id]: { rot: Math.round(next * 10) / 10 } },
        { live: true }
      );
      if (stageRef.current) stageRef.current.classList.add('is-rot-dragging');
      return;
    }
    if (groupResizeRef.current) {
      const g = groupResizeRef.current;
      const pt = canvasPoint(e);
      if (!pt) return;
      let rdx = pt[0] - g.px;
      let rdy = pt[1] - g.py;
      if (snapEnabled) {
        const next = applyResize(g.bbox, g.handle, rdx, rdy, {
          keepAspect: e.shiftKey,
          min: 1,
        });
        const groupIds = new Set(g.startMembers.map((el) => String(el.id)));
        const others = (slide.els || []).filter(
          (el) => el && !el._isDecor && !groupIds.has(String(el.id))
        );
        const snapped = snapResizeToGuides(
          next,
          g.handle,
          allGuideLines,
          others,
          canvasW,
          canvasH
        );
        const skipV = snapped.hit.some((line) => line.t === 'v');
        const skipH = snapped.hit.some((line) => line.t === 'h');
        const gridSnapped = snapResizeToGrid(
          snapped,
          g.handle,
          snapStep || 20,
          { v: skipV, h: skipH }
        );
        setSnapGuides(snapped.hit);
        if (g.handle.dx > 0) {
          rdx = gridSnapped.x + gridSnapped.w - (g.bbox.x + g.bbox.w);
        } else if (g.handle.dx < 0) {
          rdx = gridSnapped.x - g.bbox.x;
        }
        if (g.handle.dy > 0) {
          rdy = gridSnapped.y + gridSnapped.h - (g.bbox.y + g.bbox.h);
        } else if (g.handle.dy < 0) {
          rdy = gridSnapped.y - g.bbox.y;
        }
      } else {
        setSnapGuides([]);
      }
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      const { patches } = scaleGroupMembers(g.bbox, g.handle, rdx, rdy, g.startMembers, e.shiftKey);
      usePresentationStore.getState().applyElementPatches(patches, { live: true });
      return;
    }
    if (resizeRef.current) {
      const rz = resizeRef.current;
      const pt = canvasPoint(e);
      if (!pt) return;
      const dx = pt[0] - rz.px;
      const dy = pt[1] - rz.py;
      const live = (slide.els || []).find((el) => el && String(el.id) === String(rz.id));
      const typ = live?.type || rz.type;
      const hx = rz.handle?.dx || 0;
      const hy = rz.handle?.dy || 0;
      const corner = hx !== 0 && hy !== 0;
      // Images & SVG: corner scales proportionally, side stretches freely.
      // Shift on a side handle still keeps the current box aspect. Icons / chem stay locked.
      const keepAspect =
        e.shiftKey ||
        typ === 'icon' ||
        ((typ === 'image' || typ === 'svg') && corner) ||
        (typ === 'graph' && (live?.graphKind === 'chem' || live?.graphKind === 'logic'));
      let next = applyResize(rz.start, rz.handle, dx, dy, {
        keepAspect,
        rot: rz.rot || 0,
        min: 1,
      });
      if (rz.rideConnId) {
        const rconn = (slide.connectors || []).find((c) => c && String(c.id) === String(rz.rideConnId));
        if (rconn) {
          const pos = riderPositionFor(rconn, slide.els || [], {
            ...(live || {}),
            w: next.w,
            h: next.h,
          });
          if (pos) next = { ...next, ...pos };
        }
      }
      if (snapEnabled && Math.abs(rz.rot || 0) < 0.001 && !rz.rideConnId) {
        let skipV = false;
        let skipH = false;
        const others = (slide.els || []).filter(
          (el) => el && !el._isDecor && String(el.id) !== String(rz.id)
        );
        if (allGuideLines.length || others.length) {
          const snapped = snapResizeToGuides(next, rz.handle, allGuideLines, others, canvasW, canvasH);
          next = { x: snapped.x, y: snapped.y, w: snapped.w, h: snapped.h };
          skipV = snapped.hit.some((g) => g.t === 'v');
          skipH = snapped.hit.some((g) => g.t === 'h');
          setSnapGuides(snapped.hit);
        } else setSnapGuides([]);
        next = snapResizeToGrid(next, rz.handle, snapStep || 20, { v: skipV, h: skipH });
        if ((typ === 'image' || typ === 'svg') && keepAspect) {
          next = preserveResizeAspect(rz.start, next, rz.handle);
        }
      } else setSnapGuides([]);
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      if (typ === 'inkhost') {
        // Resizing an inkhost used to just patch the host's own x/y/w/h — but the actual
        // stroke content is rendered from its own absolute point data, not from the host
        // box, so the drawing never visibly changed size. Scale the underlying points
        // instead; syncInkHostBBoxes (inside scaleInkByIds) brings the host box back in
        // sync with the result.
        usePresentationStore.getState().scaleInkByIds(live?.inkIds || [], rz.start, next, { live: true });
      } else if (typ === 'graph' && live?.graphKind !== 'chem' && live?.graphKind !== 'logic') {
        // Keep units/px; grow/shrink the plotted window with the box (don't squash axes).
        const scale =
          rz.graphScale > 0
            ? rz.graphScale
            : ((rz.startXMax ?? 10) - (rz.startXMin ?? -10)) / Math.max(1, rz.start.w || 1);
        rz.graphScale = scale;
        const cx = ((rz.startXMin ?? -10) + (rz.startXMax ?? 10)) / 2;
        const half = Math.max(0.5, (scale * next.w) / 2);
        const patch = {
          ...next,
          graphScale: scale,
          graphXMin: cx - half,
          graphXMax: cx + half,
          graphYMin: null,
          graphYMax: null,
        };
        usePresentationStore.getState().applyElementPatches({ [rz.id]: patch }, { live: true });
        if (rz.rebuildTimer) clearTimeout(rz.rebuildTimer);
        rz.rebuildTimer = setTimeout(() => {
          void editorApi.rebuildSelectedGraph();
        }, 48);
      } else {
        const patch = typ === 'image' && !keepAspect ? { ...next, imgFit: 'fill' } : next;
        usePresentationStore.getState().applyElementPatches({ [rz.id]: patch }, { live: true });
      }
      return;
    }
    if (adjRef.current) {
      const ad = adjRef.current;
      const pt = canvasPoint(e);
      if (!pt) return;
      const liveEl = (slide.els || []).find((el) => el && String(el.id) === String(ad.id)) || ad.start;
      const patch = patchFromAdjDrag(liveEl, ad.kind, pt[0], pt[1]);
      if (!patch) return;
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      usePresentationStore.getState().patchElement(ad.id, patch);
      return;
    }
    if (shapeNodeRef.current) {
      const nd = shapeNodeRef.current;
      const pt = canvasPoint(e);
      if (!pt) return;
      const th = Math.max(3, EXTRA_GUIDE_TH / Math.max(0.001, scale));
      const snapped = snapPointToGuides(pt[0], pt[1], allGuideLines, th);
      if (snapped.hit.length) setSnapGuides(snapped.hit);
      else setSnapGuides([]);
      const liveEl = (slide.els || []).find((el) => el && String(el.id) === String(nd.id)) || nd.start;
      const patch = patchShapeNodeDrag(liveEl, nd.idx, snapped.x, snapped.y);
      if (!patch) return;
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      usePresentationStore.getState().patchElement(nd.id, patch);
      return;
    }
    if (lineEpRef.current) {
      const le = lineEpRef.current;
      const raw = canvasPoint(e);
      if (!raw) return;
      let px = raw[0];
      let py = raw[1];
      if (e.shiftKey && le.fixed) {
        const dx = px - le.fixed.x;
        const dy = py - le.fixed.y;
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        const snapped = Math.round(ang / 15) * 15;
        const rad = (snapped * Math.PI) / 180;
        const len = Math.hypot(dx, dy);
        px = le.fixed.x + Math.cos(rad) * len;
        py = le.fixed.y + Math.sin(rad) * len;
      }
      const guideTh = Math.max(3, EXTRA_GUIDE_TH / Math.max(0.001, scale));
      const guideSnap = snapPointToGuides(px, py, allGuideLines, guideTh);
      if (guideSnap.hit.length) {
        px = guideSnap.x;
        py = guideSnap.y;
      }
      const store = usePresentationStore.getState();
      const liveSlide = store.slides[store.cur];
      let snap = snapLineEpToGeometry(liveSlide, { x: px, y: py }, le.id, 14);
      if (snap && e.shiftKey && snap.kind !== 'endpoint') snap = null;
      if (snap && le.jid && snap.kind === 'endpoint') {
        const od = (liveSlide?.els || []).find((el) => el && String(el.id) === String(snap.targetId));
        if (od && endJunctionId(od, snap.targetEnd) === le.jid) snap = null;
      }
      if (snap) {
        px = snap.x;
        py = snap.y;
        le.lastSnap = snap;
        setEpGhost({ x: snap.x, y: snap.y, ok: snap.kind === 'endpoint' });
        setSnapGuides([
          { t: 'v', pos: snap.x, kind: 'element' },
          { t: 'h', pos: snap.y, kind: 'element' },
        ]);
      } else if (guideSnap.hit.length) {
        le.lastSnap = null;
        setEpGhost(null);
        setSnapGuides(guideSnap.hit);
      } else {
        le.lastSnap = null;
        setEpGhost(null);
        setSnapGuides([]);
      }
      const primary = { ...le.start, ...(le.mig || {}) };
      // Keep start geometry as pin base; pinned opposite end never drifts
      const patches = patchesDragJunction(primary, le.which, le.fixed, le.mates, { x: px, y: py });
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      store.applyElementPatches(patches, { live: true });
      return;
    }
    if (curveDragRef.current) {
      const cd = curveDragRef.current;
      const pt = canvasPoint(e);
      if (!pt) return;
      const closed = !!cd.startEl.curveClosed;
      const n0 = curveCanvasToNorm(cd.startEl, cd.px, cd.py);
      const n1 = curveCanvasToNorm(cd.startEl, pt[0], pt[1]);
      const dx = n1.x - n0.x;
      const dy = n1.y - n0.y;
      const guideTh = Math.max(3, EXTRA_GUIDE_TH / Math.max(0.001, scale));
      const snapNormTarget = (nx, ny) => {
        const c = curveNormToCanvas(cd.startEl, nx, ny);
        const snapped = snapPointToGuides(c.x, c.y, allGuideLines, guideTh);
        if (snapped.hit.length) {
          setSnapGuides(snapped.hit);
          return curveCanvasToNorm(cd.startEl, snapped.x, snapped.y);
        }
        setSnapGuides([]);
        return { x: nx, y: ny };
      };
      let nextPts = null;
      if (cd.kind === 'node') {
        const base = cd.basePts[cd.idx];
        if (base) {
          const t = snapNormTarget(base.x + dx, base.y + dy);
          nextPts = moveCurveNode(cd.basePts, cd.idx, t.x, t.y);
        }
      } else if (cd.kind === 'bend') {
        nextPts = bendCurveSegment(cd.basePts, cd.idx, dx, dy, closed, cd.t);
        setSnapGuides([]);
      } else if (cd.kind === 'cp1' || cd.kind === 'cp2') {
        const base = cd.basePts[cd.idx];
        if (base) {
          const ox = cd.kind === 'cp1' ? (base.cp1x != null ? base.cp1x : base.x) : base.cp2x != null ? base.cp2x : base.x;
          const oy = cd.kind === 'cp1' ? (base.cp1y != null ? base.cp1y : base.y) : base.cp2y != null ? base.cp2y : base.y;
          const t = snapNormTarget(ox + dx, oy + dy);
          nextPts = moveCurveCp(cd.basePts, cd.idx, cd.kind, t.x, t.y);
        }
      }
      if (!nextPts) return;
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      // Keep the original box while dragging — remapping every move stretches the levers.
      usePresentationStore.getState().patchElement(cd.id, { curvePoints: nextPts }, { live: true });
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const pt = canvasPoint(e);
    if (!pt) return;
    const dragEls = (slide.els || []).filter((el) => el && drag.ids.includes(String(el.id)));
    const legoDrag = dragEls.length > 0 && dragEls.every((el) => el.type === 'lego');
    let nx;
    let ny;
    let guides = [];
    const primary = (slide.els || []).find((el) => el && String(el.id) === String(drag.id));
    const w = primary?.w || drag.w || 100;
    const h = primary?.h || drag.h || 60;
    if (legoDrag) {
      const steps = dragEls.every(isLegoTop) ? { x: LEGO_U, y: LEGO_U } : legoSnapSteps(dragEls[0]);
      nx = snapLegoCoord(drag.ox + (pt[0] - drag.px), steps.x);
      ny = snapLegoCoord(drag.oy + (pt[1] - drag.py), steps.y);
      const off = resolveLegoGroupOffset(dragEls, nx - drag.ox, ny - drag.oy, slide.els, canvasW, canvasH);
      nx = drag.ox + off.dx;
      ny = drag.oy + off.dy;
    } else {
      nx = gridSnap(drag.ox + (pt[0] - drag.px));
      ny = gridSnap(drag.oy + (pt[1] - drag.py));
      if (snapEnabled && primary) {
        const others = (slide.els || []).filter(
          (el) => el && !el._isDecor && !drag.ids.includes(String(el.id))
        );
        const snapped = snapBox({ x: nx, y: ny, w, h }, others, { canvasW, canvasH });
        nx = snapped.x;
        ny = snapped.y;
        guides = snapped.guides || [];
      }
      if (allGuideLines.length) {
        const extra = snapTranslateToExtraGuides(nx, ny, w, h, allGuideLines);
        nx = extra.x;
        ny = extra.y;
        if (extra.hit.length) guides = [...guides, ...extra.hit];
      }
    }
    const dx = nx - drag.ox;
    const dy = ny - drag.oy;
    if (!dx && !dy && !movedRef.current) return;
    if (!movedRef.current) {
      useHistoryStore.getState().push();
      movedRef.current = true;
    }
    drag.pendingNx = nx;
    drag.pendingNy = ny;
    if (drag.liveJoinedLineMove) {
      usePresentationStore.getState().moveElements(
        drag.ids,
        dx - drag.liveDx,
        dy - drag.liveDy,
        { live: true }
      );
      drag.liveDx = dx;
      drag.liveDy = dy;
    } else {
      // Every pointer sample — no rAF coalesce, no React setState.
      applyDragDom(drag, dx, dy);
    }
    syncDragGuidesDom(drag, guides);
  }

  function onStagePointerUp() {
    if (inkRef.current) {
      const stroke = inkRef.current;
      if (stroke.tool === 'eraser') {
        // No re-scan needed here: pointerdown tested the first point and every pointermove
        // already tested its own newest travelled segment (see above), so the whole path
        // has already been covered incrementally. Just persist the accumulated result once
        // for the whole gesture instead of on every intermediate sample.
        if (stroke.points.length >= 1) usePresentationStore.getState().persist();
      } else if (stroke.points.length >= 1) {
        editorApi.addInkStroke(stroke);
      }
    }
    inkRef.current = null;
    clearLiveInkCanvas();
    if (inkDragRef.current) {
      if (movedRef.current) usePresentationStore.getState().persist();
      inkDragRef.current = null;
    }
    cpDragRef.current = null;
    if (epDragRef.current) {
      if (movedRef.current) usePresentationStore.getState().persist();
      epDragRef.current = null;
      setEpGhost(null);
    }
    if (groupResizeRef.current || groupRotRef.current) {
      if (movedRef.current) usePresentationStore.getState().persist();
      groupResizeRef.current = null;
      groupRotRef.current = null;
    }
    if (bandRef.current) {
      const b = bandRef.current;
      const L = Math.min(b.x0, b.x1);
      const T = Math.min(b.y0, b.y1);
      const R = Math.max(b.x0, b.x1);
      const B = Math.max(b.y0, b.y1);
      const tiny = Math.abs(b.x1 - b.x0) < 4 && Math.abs(b.y1 - b.y0) < 4;
      const hits = (slide.els || [])
        .filter((el) => {
          if (!el || el._isDecor || el.objHidden) return false;
          if (tiny) return false;
          const x = el.x || 0;
          const y = el.y || 0;
          const w = el.w || 0;
          const h = el.h || 0;
          const rot = +el.rot || 0;
          if (!rot) {
            return x < R && x + w > L && y < B && y + h > T;
          }
          // Rotated elements (very commonly true for the "Line" shape, which is usually a
          // thin rotated rectangle) live on-screen somewhere quite different from their raw,
          // pre-rotation x/y/w/h box — testing against that raw box made a marquee drawn
          // around the actual (rotated) line miss it entirely. Test against the bounding box
          // of its 4 rotated corners instead.
          const cx = x + w / 2;
          const cy = y + h / 2;
          const rad = (rot * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const hw = w / 2;
          const hh = h / 2;
          const corners = [
            [-hw, -hh],
            [hw, -hh],
            [hw, hh],
            [-hw, hh],
          ].map(([dx, dy]) => [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]);
          const minX = Math.min(...corners.map((p) => p[0]));
          const maxX = Math.max(...corners.map((p) => p[0]));
          const minY = Math.min(...corners.map((p) => p[1]));
          const maxY = Math.max(...corners.map((p) => p[1]));
          return minX < R && maxX > L && minY < B && maxY > T;
        })
        .map((el) => String(el.id));
      const inkHits = [];
      if (!tiny) {
        (slide.ink || []).forEach((s) => {
          if (s?.id && inkIntersectsRect(s, L, T, R, B)) inkHits.push(String(s.id));
        });
        (slide.inkFills || []).forEach((f) => {
          if (f?.id && inkIntersectsRect(f, L, T, R, B)) inkHits.push(String(f.id));
        });
      }
      if (hits.length) {
        useSelectionStore.getState().setMultiSel(hits);
        useSelectionStore.getState().setSelId(hits[hits.length - 1]);
        useSelectionStore.getState().setSelInkIds(inkHits);
      } else if (inkHits.length) {
        useSelectionStore.getState().pickInk(inkHits);
      }
      bandRef.current = null;
      setBand(null);
    }
    if (dragRef.current && movedRef.current) {
      const drag = dragRef.current;
      let dx = 0;
      let dy = 0;
      if (drag.pendingNx != null) {
        dx = drag.pendingNx - drag.ox;
        dy = drag.pendingNy - drag.oy;
      }
      clearDragDom(drag);
      if ((dx || dy) && !drag.liveJoinedLineMove) {
        usePresentationStore.getState().moveElements(drag.ids, dx, dy);
      } else if (drag.liveJoinedLineMove && movedRef.current) {
        usePresentationStore.getState().persist();
      }
      const ids = drag.ids || [];
      const patches = {};
      let pnEl = null;
      const afterEls = usePresentationStore.getState().slides[cur]?.els || [];
      afterEls.forEach((el) => {
        if (!el || !ids.includes(String(el.id))) return;
        if (el.type === 'pagenum') pnEl = el;
        if (el.type !== 'lego') return;
        const snapped = resolveLegoFreePos(el, afterEls, canvasW, canvasH);
        if (snapped.x !== el.x || snapped.y !== el.y) {
          patches[el.id] = { x: snapped.x, y: snapped.y };
        }
      });
      if (Object.keys(patches).length) {
        usePresentationStore.getState().applyElementPatches(patches);
      } else if (!(dx || dy)) {
        usePresentationStore.getState().persist();
      }
      if (pnEl) editorApi.syncPageNumFromElement(pnEl);
    } else if (dragRef.current) {
      clearDragDom(dragRef.current);
    }
    dragRef.current = null;
    if (movedRef.current && (resizeRef.current || rotDragRef.current)) {
      // Resize/rotate patch the store with {live:true} while dragging (same as every other
      // drag ref in this function) but — unlike adjRef/curveDragRef/groupResizeRef/
      // inkDragRef/epDragRef just above and below — nothing here persisted the final result
      // once the pointer was released. In-memory state (undo included) was still correct,
      // but the change wasn't guaranteed to make it to disk until some unrelated later
      // action happened to call persist(). This also covers the new inkhost point-scaling
      // added above, which relies on the same persist-once-on-release pattern.
      usePresentationStore.getState().persist();
    }
    if (resizeRef.current?.rebuildTimer) {
      clearTimeout(resizeRef.current.rebuildTimer);
      if (
        movedRef.current &&
        resizeRef.current.type === 'graph'
      ) {
        void editorApi.rebuildSelectedGraph();
      }
    }
    resizeRef.current = null;
    rotDragRef.current = null;
    if (stageRef.current) {
      stageRef.current.classList.remove('is-rot-dragging', 'is-rot-hover');
    }
    if (adjRef.current) {
      if (movedRef.current) usePresentationStore.getState().persist();
      adjRef.current = null;
    }
    if (shapeNodeRef.current) {
      if (movedRef.current) usePresentationStore.getState().persist();
      shapeNodeRef.current = null;
    }
    if (lineEpRef.current) {
      const le = lineEpRef.current;
      const lastSnap = le.lastSnap;
      if (movedRef.current) {
        usePresentationStore.getState().mutateCurrentSlide((sl) => {
          const d = (sl.els || []).find((el) => el && String(el.id) === String(le.id));
          if (!d || d.shape !== 'line') return;
          migrateSlideLineJoins(sl);
          if (lastSnap && lastSnap.kind === 'endpoint' && lastSnap.targetId && lastSnap.targetEnd) {
            const od = (sl.els || []).find((el) => el && String(el.id) === String(lastSnap.targetId));
            if (od) {
              const jid = joinLineEnds(sl, d, le.which, od, lastSnap.targetEnd);
              if (jid) {
                const c = coalesceJunction(sl, jid, { x: lastSnap.x, y: lastSnap.y });
                if (c?.patches) {
                  Object.keys(c.patches).forEach((id) => {
                    const el = (sl.els || []).find((e) => e && String(e.id) === String(id));
                    if (el) Object.assign(el, c.patches[id]);
                  });
                }
              }
            }
          } else if (!le.joined) {
            clearLineJoin(sl, d, le.which);
          } else {
            const jid = endJunctionId(d, le.which);
            if (jid) {
              const ends = lineCanvasEnds(d);
              const c = coalesceJunction(sl, jid, ends[le.which]);
              if (c?.patches) {
                Object.keys(c.patches).forEach((id) => {
                  const el = (sl.els || []).find((e) => e && String(e.id) === String(id));
                  if (el) Object.assign(el, c.patches[id]);
                });
              }
            }
          }
        });
      }
      setEpGhost(null);
      lineEpRef.current = null;
    }
    if (curveDragRef.current) {
      const cd = curveDragRef.current;
      curveDragRef.current = null;
      if (movedRef.current) {
        const st = usePresentationStore.getState();
        const live = (st.slides[st.cur]?.els || []).find((el) => el && String(el.id) === String(cd.id));
        if (live && live.shape === 'curve') {
          const fitted = applyCurveBBox(live);
          if (fitted) st.patchElement(cd.id, fitted, { live: true });
        }
        st.persist();
      }
    }
    if (guideDragRef.current) {
      const gd = guideDragRef.current;
      guideDragRef.current = null;
      const st = usePresentationStore.getState();
      const live = (st.guides || []).find((g) => g && String(g.id) === String(gd.id));
      if (live && !guideIntersectsSlide(live, canvasW, canvasH)) {
        // History already snapshot at drag/copy start — removing is part of this gesture.
        if (!movedRef.current && !gd.copied) useHistoryStore.getState().push();
        st.mutateGuides((list) => {
          for (let i = list.length - 1; i >= 0; i--) {
            if (list[i] && String(list[i].id) === String(gd.id)) list.splice(i, 1);
          }
        });
        if (String(useUiStore.getState().selGuideId) === String(gd.id)) {
          useUiStore.getState().setSelGuideId(null);
        }
      } else if (movedRef.current || gd.copied) {
        st.persist();
      }
    }
    movedRef.current = false;
    setSnapGuides([]);
  }

  function onGuidePointerDown(g, e) {
    if (!guidesEditMode || !g) return;
    e.stopPropagation();
    e.preventDefault();
    const pt = canvasPoint(e);
    if (!pt) return;
    let id = g.id;
    let start = { id: g.id, x: +g.x || 0, y: +g.y || 0, angle: +g.angle || 0 };
    let copied = false;
    if (e.altKey) {
      useHistoryStore.getState().push();
      const copy = createGuide({ x: start.x, y: start.y, angle: start.angle });
      usePresentationStore.getState().mutateGuides((list) => {
        list.push(copy);
      }, { live: true });
      id = copy.id;
      start = { ...copy };
      copied = true;
      useUiStore.getState().setSelGuideId(copy.id);
    } else {
      useUiStore.getState().setSelGuideId(g.id);
    }
    guideDragRef.current = {
      id,
      start,
      px: pt[0],
      py: pt[1],
      ox: start.x,
      oy: start.y,
      copied,
    };
    movedRef.current = false;
    captureTrustedPointer(e);
  }

  function startInlineEdit(el) {
    if (el.type === 'formula') {
      editorApi.addFormula();
      return;
    }
    if (el.type === 'svg' || (el.svgContent && !el._isDecor) || (el.svg && !el._isDecor)) {
      editorApi.pickElement(el.id);
      editorApi.openSvgModal();
      return;
    }
    if (el.type === 'applet' && el.appletId === 'periodic') {
      editorApi.reselectPeriodicElement(el.id);
      return;
    }
    if (el.type === 'text' || el.type === 'shape') setEditingId(el.id);
    else if (el.type === 'image' && normImgFrame(el.imgFrame) === 'polaroid') setEditingId(el.id);
    else if (el.type === 'markdown') editorApi.editMarkdown(el.id);
    else if (el.type === 'code') editorApi.editCode(el.id);
    else if (el.type === 'htmlframe') editorApi.openHtmlFrameModal();
  }

  /** v7.1 `_tblDragBorder`: 14px strips on the table edges — clear cell selection, drag the table. */
  function onTableStripDown(el, e) {
    if (tableBorderPaint || drawing || el._isDecor) return;
    e.preventDefault();
    e.stopPropagation();
    // Clicking the table border exits cell selection/editing (v7.1 tblClearSel)
    useSelectionStore.getState().clearTableCells();
    setEditingCell(null);
    const selSt = useSelectionStore.getState();
    if (!selSt.selId || String(selSt.selId) !== String(el.id)) {
      editorApi.pickElement(el.id);
    }
    if (el.locked) return;
    const pt = canvasPoint(e);
    dragRef.current = {
      id: el.id,
      ids: [String(el.id)],
      ox: el.x || 0,
      oy: el.y || 0,
      w: el.w || 100,
      h: el.h || 60,
      px: pt?.[0] || 0,
      py: pt?.[1] || 0,
    };
    movedRef.current = false;
    bindDragWindowListeners(dragRef.current);
  }

  function onElPointerDown(el, e) {
    // Ctrl/Cmd+click follows links in the editor (inline <a> or whole-object link).
    if ((e.ctrlKey || e.metaKey) && e.button === 0 && !drawing) {
      const inlineA = e.target?.closest?.('a[href]');
      const href = inlineA?.getAttribute?.('href') || el.link || '';
      if (href) {
        e.preventDefault();
        e.stopPropagation();
        editorApi.followLink(href);
        return;
      }
    }
    if (tableBorderPaint && el.type === 'table') {
      e.stopPropagation();
      e.preventDefault();
      if (!useSelectionStore.getState().selId || String(useSelectionStore.getState().selId) !== String(el.id)) {
        editorApi.pickElement(el.id);
      }
      return;
    }
    if (drawing || el._isDecor) return;
    // Selected corner-rotate wins over whatever box is under the cursor (other image,
    // this image's own transparent PNG padding, etc.).
    if (tryBeginCornerRotate(e)) return;
    // Transparent image pixels: pick/drag the opaque object behind instead.
    if (el.type === 'image' && normImgFrame(el.imgFrame) === 'none') {
      const root = stageRef.current || hostRef.current;
      const hit = opaqueElAt(slide?.els || [], root, e.clientX, e.clientY);
      if (!hit) return; // empty air — let the canvas handle rubber-band / deselect
      if (String(hit.id) !== String(el.id)) {
        onElPointerDown(hit, e);
        return;
      }
    }
    if (el.type === 'inkhost') {
      e.stopPropagation();
      e.preventDefault();
      const additive = !!(e.shiftKey || e.ctrlKey || e.metaKey);
      // If several drawing objects are already selected together (rubber-band, shift-click),
      // and this host is one of them, keep that whole selection intact instead of
      // collapsing it down to just this host. pickElement/pickInk below are non-additive by
      // default and would otherwise silently deselect every other picked stroke, so only the
      // one actually clicked would end up in the drag (and therefore be the only one that
      // visibly moves).
      const before = useSelectionStore.getState();
      const beforeMultiSel = (
        before.multiSel?.length ? before.multiSel : before.selId ? [before.selId] : []
      ).map(String);
      const beforeInkIds = (before.selInkIds || []).map(String);
      const hostInkIds = (el.inkIds || []).map(String);
      const alreadyGrouped =
        (beforeMultiSel.includes(String(el.id)) && beforeMultiSel.length > 1) ||
        (hostInkIds.some((id) => beforeInkIds.includes(id)) && beforeInkIds.length > hostInkIds.length);
      if (!additive && alreadyGrouped) {
        // Selection already covers this host (and more) — leave it as-is.
      } else if (additive) {
        // Compute the merged/toggled ink-id set *before* touching selection state.
        // pickElement()/togglePick() (shift-click) unconditionally clears selInkIds as a
        // side effect of updating multiSel — calling pickInk({additive:true}) afterwards
        // would then be toggling against an already-wiped set, silently dropping every
        // previously-selected stroke except the one just clicked. That's exactly why
        // shift-selecting a second drawing only ever moved the one clicked last.
        const nextInkSet = new Set(beforeInkIds);
        hostInkIds.forEach((id) => {
          if (nextInkSet.has(id)) nextInkSet.delete(id);
          else nextInkSet.add(id);
        });
        editorApi.pickElement(el.id, { shift: true });
        useSelectionStore.getState().setSelInkIds([...nextInkSet]);
      } else {
        editorApi.pickElement(el.id, { shift: false });
        // pickElement() above may have expanded the selection to the whole group (when
        // el.groupId is set, pick() auto-selects every member into multiSel) — gather every
        // grouped member's own ink ids too, not just the one host actually clicked, or
        // dragging a *grouped* set of drawings would (like the ungrouped multi-select case
        // above) only ever move the single stroke you happened to press on.
        const afterMultiSel = (useSelectionStore.getState().multiSel || []).map(String);
        const curSlideEls =
          usePresentationStore.getState().slides[usePresentationStore.getState().cur]?.els || [];
        const groupInkIds =
          afterMultiSel.length > 1
            ? afterMultiSel.flatMap((mid) => {
                const memberEl = curSlideEls.find((e) => e && String(e.id) === mid);
                return memberEl?.type === 'inkhost' ? (memberEl.inkIds || []) : [];
              })
            : el.inkIds || [];
        if (groupInkIds.length) editorApi.pickInk(groupInkIds, { additive: false, keepObjectSel: true });
      }
      movedRef.current = false;
      const pt = canvasPoint(e);
      if (pt && !additive) {
        inkDragRef.current = { px: pt[0], py: pt[1], lastX: pt[0], lastY: pt[1] };
        captureTrustedPointer(e);
      }
      return;
    }
    if (
      editingId &&
      String(editingId) === String(el.id) &&
      (el.type === 'text' ||
        el.type === 'shape' ||
        (el.type === 'image' && normImgFrame(el.imgFrame) === 'polaroid'))
    ) {
      return;
    }
    if (editingCell && String(editingCell).startsWith(`${el.id}:`)) {
      return;
    }
    e.stopPropagation();
    const pickCtx = useUiStore.getState().animTriggerPick;
    if (pickCtx && pickCtx.elId != null && pickCtx.ai != null) {
      editorApi.completeAnimTriggerPick(el.id);
      return;
    }
    const mediaPick = useUiStore.getState().mediaTriggerPick;
    if (mediaPick && mediaPick.audioElId != null) {
      editorApi.completeMediaTriggerPick(el.id);
      return;
    }
    const timerPick = useUiStore.getState().timerTriggerPick;
    if (timerPick && timerPick.timerElId != null) {
      editorApi.completeTimerTriggerPick(el.id);
      return;
    }
    if (useUiStore.getState().connectorMode) {
      editorApi.connectorModeClick(el.id);
      return;
    }
    // Capture multi-sel before pick — pickOne would collapse it to the clicked id.
    const before = useSelectionStore.getState();
    const beforeIds = (
      before.multiSel?.length ? before.multiSel : before.selId ? [before.selId] : []
    ).map(String);
    const alreadySelected = beforeIds.includes(String(el.id));
    const multiDrag = alreadySelected && beforeIds.length > 1 && !e.shiftKey;
    if (!multiDrag) {
      editorApi.pickElement(el.id, { shift: e.shiftKey });
    }
    if (curveEditMode && el.shape === 'curve' && e.button === 0) {
      const ptBend = canvasPoint(e);
      if (ptBend) {
        const hit = nearestCurveSegment(el, ptBend[0], ptBend[1], Math.max(12, 18 / (scale || 1)));
        if (hit) {
          e.stopPropagation();
          e.preventDefault();
          const pts = (el.curvePoints || defaultCurvePoints()).map((p) => ({ ...p }));
          const n = pts.length;
          const a = hit.seg;
          const b = (hit.seg + 1) % n;
          useUiStore.getState().setCurveNodeSel(a === b ? [a] : [a, b]);
          curveDragRef.current = {
            id: el.id,
            kind: 'bend',
            idx: hit.seg,
            t: hit.t != null ? hit.t : 0.5,
            px: ptBend[0],
            py: ptBend[1],
            startEl: { ...el, curvePoints: pts },
            basePts: pts,
          };
          movedRef.current = false;
          captureTrustedPointer(e);
          return;
        }
      }
    }
    if (e.detail >= 2) {
      startInlineEdit(el);
      return;
    }
    // Caption clicks select / start edit, but must not begin a move-drag — otherwise the
    // pointer capture from the first click of a double-click swallows the second click.
    if (
      el.type === 'image' &&
      normImgFrame(el.imgFrame) === 'polaroid' &&
      e.target?.closest?.('.react-img-polaroid-cap')
    ) {
      return;
    }
    if (el.locked) return;
    const pt = canvasPoint(e);
    const viewEl = elWithRideDisplay(el, slide);
    // Corner rotate before move-drag (v7.1 zones around corners)
    if (
      pt &&
      viewEl.type !== 'lego' &&
      viewEl.type !== 'lineangle' &&
      viewEl.shape !== 'line' &&
      !(curveEditMode && viewEl.shape === 'curve') &&
      !shapeNodeMode &&
      nearCornerRot(viewEl, pt[0], pt[1], scale)
    ) {
      const cx = (viewEl.x || 0) + (viewEl.w || 0) / 2;
      const cy = (viewEl.y || 0) + (viewEl.h || 0) / 2;
      rotDragRef.current = {
        id: el.id,
        cx,
        cy,
        a0: (Math.atan2(pt[1] - cy, pt[0] - cx) * 180) / Math.PI,
        rot0: elRotationDeg(viewEl),
      };
      movedRef.current = false;
      captureTrustedPointer(e);
      return;
    }
    const { multiSel: ms, selId: sid } = useSelectionStore.getState();
    let ids = multiDrag ? beforeIds : (ms || []).map(String);
    if (!ids.includes(String(el.id))) ids = [String(el.id)];
    if (!ids.length && sid) ids = [String(sid)];
    const st = usePresentationStore.getState();
    const lockedIds = new Set(
      (st.slides[st.cur]?.els || []).filter((x) => x && x.locked).map((x) => String(x.id))
    );
    ids = ids.filter((id) => !lockedIds.has(String(id)));
    if (!ids.length) return;
    dragRef.current = {
      id: el.id,
      ids,
      ox: el.x || 0,
      oy: el.y || 0,
      w: el.w || 100,
      h: el.h || 60,
      px: pt?.[0] || 0,
      py: pt?.[1] || 0,
      liveJoinedLineMove: ids.some((id) => {
        const member = st.slides[st.cur]?.els?.find((item) => item && String(item.id) === String(id));
        return (
          member?.shape === 'line' &&
          (lineEndLooksJoined(slide, member, 'a') || lineEndLooksJoined(slide, member, 'b'))
        );
      }),
      liveDx: 0,
      liveDy: 0,
    };
    movedRef.current = false;
    bindDragWindowListeners(dragRef.current);
    captureTrustedPointer(e);
  }

  function onResizePointerDown(handle, e) {
    if (!soleSelectedView || soleSelectedView.locked) return;
    e.stopPropagation();
    e.preventDefault();
    const pt = canvasPoint(e);
    const el = soleSelectedView;
    resizeRef.current = {
      id: el.id,
      type: el.type,
      rideConnId: el.rideConnId || null,
      handle,
      rot: elRotationDeg(el),
      start: { x: el.x || 0, y: el.y || 0, w: el.w || 100, h: el.h || 60 },
      startXMin: el.graphXMin ?? -10,
      startXMax: el.graphXMax ?? 10,
      graphScale:
        el.graphScale > 0
          ? el.graphScale
          : ((el.graphXMax ?? 10) - (el.graphXMin ?? -10)) / Math.max(1, el.w || 1),
      px: pt?.[0] || 0,
      py: pt?.[1] || 0,
    };
    movedRef.current = false;
    captureTrustedPointer(e);
  }

  function onAdjPointerDown(handle, e) {
    if (!soleSelected || soleSelected.locked || soleSelected.type !== 'shape') return;
    e.stopPropagation();
    e.preventDefault();
    adjRef.current = {
      id: soleSelected.id,
      kind: handle.kind,
      start: { ...soleSelected },
    };
    movedRef.current = false;
    captureTrustedPointer(e);
  }

  function onShapeNodePointerDown(handle, e) {
    if (!soleSelected || soleSelected.locked || !shapeSupportsNodes(soleSelected)) return;
    e.stopPropagation();
    e.preventDefault();
    shapeNodeRef.current = {
      id: soleSelected.id,
      idx: handle.idx,
      start: { ...soleSelected },
    };
    movedRef.current = false;
    captureTrustedPointer(e);
  }

  function onLineEpPointerDown(handle, e) {
    if (!soleSelected || soleSelected.locked || soleSelected.shape !== 'line') return;
    // Let double-click disconnect run without starting a drag
    if (e.detail > 1 && handle.joined) return;
    e.stopPropagation();
    e.preventDefault();
    const store = usePresentationStore.getState();
    let el = soleSelected;
    let mig = null;
    if (el._lineCapV !== 2) {
      mig = migrateLineCapGeometry(el);
      if (mig) el = { ...el, ...mig };
    }
    let jid = null;
    let mates = [];
    store.mutateCurrentSlide((sl) => {
      if (mig) {
        const live = (sl.els || []).find((x) => x && String(x.id) === String(el.id));
        if (live) Object.assign(live, mig);
      }
      migrateSlideLineJoins(sl);
      const live = (sl.els || []).find((x) => x && String(x.id) === String(el.id)) || el;
      const info = collectMateDragState(sl, live, handle.which);
      jid = info.jid;
      mates = info.mates;
      el = { ...live };
    }, { live: true });
    const ends = lineCanvasEnds(el);
    lineEpRef.current = {
      id: el.id,
      which: handle.which,
      start: { ...el },
      mig,
      fixed: handle.which === 'a' ? { ...ends.b } : { ...ends.a },
      jid,
      mates,
      joined: !!handle.joined,
      lastSnap: null,
    };
    movedRef.current = false;
    captureTrustedPointer(e);
  }

  function onCurveHandlePointerDown(handle, e) {
    if (!soleSelected || soleSelected.shape !== 'curve') return;
    e.stopPropagation();
    e.preventDefault();
    if (handle.kind === 'node') {
      const prev = useUiStore.getState().curveNodeSel || [];
      if (e.shiftKey) {
        const has = prev.includes(handle.idx);
        const nextSel = has ? prev.filter((i) => i !== handle.idx) : [...prev, handle.idx].slice(-2);
        useUiStore.getState().setCurveNodeSel(nextSel.length ? nextSel : [handle.idx]);
      } else {
        useUiStore.getState().setCurveNodeSel([handle.idx]);
      }
    }
    const pt = canvasPoint(e);
    const pts = (soleSelected.curvePoints || defaultCurvePoints()).map((p) => ({ ...p }));
    curveDragRef.current = {
      id: soleSelected.id,
      kind: handle.kind,
      idx: handle.idx,
      px: pt?.[0] || 0,
      py: pt?.[1] || 0,
      startEl: { ...soleSelected, curvePoints: pts },
      basePts: pts,
    };
    movedRef.current = false;
    captureTrustedPointer(e);
  }

  function onGroupResizePointerDown(handle, e) {
    if (!multiMembers || !groupBBox) return;
    if (multiMembers.some((el) => el.locked)) return;
    e.stopPropagation();
    e.preventDefault();
    const pt = canvasPoint(e);
    groupResizeRef.current = {
      handle,
      bbox: { ...groupBBox },
      startMembers: multiMembers.map((el) => ({
        id: el.id,
        x: el.x || 0,
        y: el.y || 0,
        w: el.w || 100,
        h: el.h || 60,
        rot: el.rot || 0,
      })),
      px: pt?.[0] || 0,
      py: pt?.[1] || 0,
    };
    movedRef.current = false;
    captureTrustedPointer(e);
  }

  function onGroupRotPointerDown(e) {
    if (!multiMembers || !groupBBox) return;
    if (multiMembers.some((el) => el.locked)) return;
    e.stopPropagation();
    e.preventDefault();
    const pt = canvasPoint(e);
    const cx = groupBBox.x + groupBBox.w / 2;
    const cy = groupBBox.y + groupBBox.h / 2;
    // Snapshot the original (pre-rotation) points of every drawing object in the group, so
    // the group can orbit them around the shared pivot (cx, cy) as one rigid body instead of
    // just spinning each one's own host box in place — see rotateInkFromSnapshot.
    const inkHostIds = new Set(
      multiMembers.filter((el) => el.type === 'inkhost').map((el) => String(el.id))
    );
    let inkSnapshot = null;
    if (inkHostIds.size) {
      const allInkIds = new Set();
      multiMembers.forEach((el) => {
        if (inkHostIds.has(String(el.id))) (el.inkIds || []).forEach((id) => allInkIds.add(String(id)));
      });
      inkSnapshot = {
        strokes: (slide.ink || [])
          .filter((s) => s && allInkIds.has(String(s.id)))
          .map((s) => ({ id: s.id, points: JSON.parse(JSON.stringify(s.points || [])) })),
        fills: (slide.inkFills || [])
          .filter((f) => f && allInkIds.has(String(f.id)))
          .map((f) => ({ id: f.id, points: JSON.parse(JSON.stringify(f.points || [])) })),
      };
    }
    groupRotRef.current = {
      bbox: { ...groupBBox },
      cx,
      cy,
      a0: pt ? (Math.atan2(pt[1] - cy, pt[0] - cx) * 180) / Math.PI : 0,
      startMembers: multiMembers.map((el) => ({
        id: el.id,
        x: el.x || 0,
        y: el.y || 0,
        w: el.w || 100,
        h: el.h || 60,
        rot: el.rot || 0,
      })),
      inkHostIds,
      inkSnapshot,
    };
    movedRef.current = false;
    captureTrustedPointer(e);
  }

  function onStageContextMenu(e) {
    if (drawing) return;
    const node = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
    const id = node && stageRef.current && stageRef.current.contains(node) ? node.getAttribute('data-id') : null;
    const el = id ? (slide.els || []).find((x) => x && String(x.id) === String(id)) : null;
    if (el && !el._isDecor && el.type !== 'pagenum') {
      if (editingId && String(editingId) === String(el.id) && el.type !== 'text') return;
      const active = document.activeElement;
      if (el.type !== 'text' && active && active.contentEditable === 'true' && node && node.contains(active)) {
        return;
      }
    }
    e.preventDefault();
    e.stopPropagation();
    if (!el || el._isDecor || el.type === 'pagenum') {
      setElCtxMenu({
        kind: 'canvas',
        x: e.clientX,
        y: e.clientY,
        canPaste: canPasteElements(),
      });
      return;
    }
    const sel = useSelectionStore.getState();
    const ids = (sel.multiSel?.length ? sel.multiSel : sel.selId ? [sel.selId] : []).map(String);
    if (!ids.includes(String(el.id))) editorApi.pickElement(el.id);
    const after = useSelectionStore.getState();
    const pickedIds = (after.multiSel?.length ? after.multiSel : after.selId ? [after.selId] : []).map(String);
    const elems = (slide.els || []).filter((x) => x && pickedIds.includes(String(x.id)) && !x._isDecor);
    const st = ctxGroupMenuState(elems, slide.els || []);
    setElCtxMenu({
      kind: 'el',
      x: e.clientX,
      y: e.clientY,
      canPaste: canPasteElements(),
      count: Math.max(1, elems.length),
      showGroup: st.showGroup,
      showUngroup: st.showUngroup,
      qrText: qrTextFromEl(el),
    });
  }

  // Screen-space rubberband (sibling of scaled stage) — keeps 1px dashed border crisp.
  const bandStyle = band
    ? {
        left: stageLeft + Math.min(band.x0, band.x1) * scale,
        top: stageTop + Math.min(band.y0, band.y1) * scale,
        width: Math.abs(band.x1 - band.x0) * scale,
        height: Math.abs(band.y1 - band.y0) * scale,
      }
    : null;

  const brushCursorPx = (() => {
    if (!showBrushCursor || drawTool === 'fill') return 24;
    let size = drawSize || 6;
    if (drawTool === 'eraser') size = Math.max(4, drawSize || 10);
    else if (drawTool === 'marker') size = Math.max(drawSize || 14, 6);
    else if (drawTool === 'neon') size = Math.max(drawSize || 6, 1.5);
    return Math.max(4, size * scale);
  })();

  return (
    <div className="slide-canvas-host react-canvas-host" {...versionAttr('SlideCanvas')}>
      <AlignBar />
      {showTablePaintCursor && brushCur ? (
        <div
          ref={overlayCurRef}
          className={`react-table-paint-cursor${tableBorderPaint.erase || !tableBorderPaint.color || tableBorderPaint.color === 'transparent' ? ' eraser' : ''}`}
          style={{ transform: `translate(${brushCur.x}px, ${brushCur.y}px)` }}
          aria-hidden="true"
        >
          {tableBorderPaint.erase || !tableBorderPaint.color || tableBorderPaint.color === 'transparent' ? (
            <svg viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 30 11.2 8.4 24.6 13.5 16.4 35.1Z" fill="#f9a8d4" />
              <path d="M3 30 11.2 8.4 15.4 10 7.2 31.6Z" fill="#db2777" />
              <path d="M11.2 8.4 16.8 3.2 26.2 6.8 24.6 13.5Z" fill="#fda4af" />
              <path d="M9.4 13.2 21.8 17.9 20.2 22.2 7.8 17.5Z" fill="#f8fafc" />
              <path d="M8.6 15.4 20.8 20 20.2 21.6 8 17Z" fill="#cbd5e1" />
              <path
                d="M3 30 11.2 8.4 24.6 13.5 16.4 35.1Z"
                stroke="#831843"
                strokeWidth="1.05"
                strokeLinejoin="round"
              />
              <path d="M3 30 5.8 29.1" stroke="#4c0519" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24.53 19.78 28.14 15.75C29.1 14.79 29.05 13.4 27.9 12.4L24.25 11.86 20.22 15.47Z" fill="#fb7185" />
              <path d="M25.4 14.4 27.9 12.4 28.14 15.75Z" fill="#fda4af" />
              <path d="M21.84 23.03 24.53 19.78 20.22 15.47 16.97 18.16Z" fill="#c0c7d1" />
              <path d="M22.7 21.4 24.9 19.2" stroke="#f8fafc" strokeWidth="0.7" />
              <path d="M21.3 20.7 23.5 18.5" stroke="#64748b" strokeWidth="0.55" />
              <path d="M12.93 31.94 21.84 23.03 16.97 18.16 8.06 27.07Z" fill="#f5c518" />
              <path d="M12.93 31.94 21.84 23.03 19.4 20.6 10.5 29.5Z" fill="#c4920a" />
              <path d="M10.5 29.5 19.4 20.6 16.97 18.16 8.06 27.07Z" fill="#fde047" />
              <path d="M7 34.77 12.93 31.94 8.06 27.07 5.23 33Z" fill="#e8c39e" />
              <path d="M7 34.77 12.93 31.94 10.5 29.5 6.11 33.89Z" fill="#c4a06a" />
              <path
                d="M3 37 7 34.77 5.23 33Z"
                fill={tableBorderPaint.color && tableBorderPaint.color !== 'transparent' ? tableBorderPaint.color : '#1e293b'}
              />
              <path d="M3 37 5.4 35.4 4.2 34.6Z" fill="#111827" />
              <path
                d="M3 37 7 34.77 12.93 31.94 21.84 23.03 24.53 19.78 28.14 15.75C29.1 14.79 29.05 13.4 27.9 12.4L24.25 11.86 20.22 15.47 16.97 18.16 8.06 27.07 5.23 33Z"
                stroke="#334155"
                strokeWidth="1.05"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      ) : null}
      {showBrushCursor && brushCur ? (
        <div
          className={`react-ink-brush-cursor show${drawTool === 'eraser' ? ' eraser' : ''}${drawTool === 'marker' ? ' marker' : ''}${drawTool === 'neon' ? ' neon' : ''}${drawTool === 'fill' ? ' fill' : ''}`}
          style={
            drawTool === 'fill'
              ? { left: brushCur.x, top: brushCur.y, width: 24, height: 24 }
              : drawTool === 'eraser'
                ? {
                    left: brushCur.x,
                    top: brushCur.y,
                    width: Math.max(10, Math.min(28, brushCursorPx * 0.7)),
                    height: Math.max(12, Math.min(34, brushCursorPx * 0.9)),
                  }
                : {
                    left: brushCur.x,
                    top: brushCur.y,
                    width: brushCursorPx,
                    height: brushCursorPx,
                  }
          }
          aria-hidden="true"
        >
          <span className="ink-eraser-ico" />
        </div>
      ) : null}
      <CanvasCtxMenu menu={elCtxMenu} ru={lang !== 'en'} onClose={() => setElCtxMenu(null)} />
      <div
        className={`react-canvas-viewport${drawing ? ' is-drawing' : ''}${showBrushCursor ? ' has-brush-cursor' : ''}${showTablePaintCursor ? ' has-table-paint-cursor' : ''}`}
        ref={hostRef}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
        onPointerLeave={(e) => {
          const rel = e.relatedTarget;
          const leftHost =
            !rel ||
            typeof rel !== 'object' ||
            typeof rel.nodeType !== 'number' ||
            !e.currentTarget.contains(rel);
          if (leftHost && useUiStore.getState().hfxHoverId) {
            useUiStore.getState().setHfxHoverId(null);
          }
          if (!inkRef.current) {
            overlayCurOnRef.current = false;
            setBrushCur(null);
          }
        }}
        onPointerEnter={(e) => {
          if (showOverlayCursor) {
            overlayCurOnRef.current = true;
            setBrushCur({ x: e.clientX, y: e.clientY });
            moveOverlayCursor(e.clientX, e.clientY);
          }
        }}
        onContextMenu={(e) => {
          if (drawing) return;
          if (e.target && e.target.closest && e.target.closest('.react-slide-stage')) return;
          e.preventDefault();
          e.stopPropagation();
          setElCtxMenu({
            kind: 'canvas',
            x: e.clientX,
            y: e.clientY,
            canPaste: canPasteElements(),
          });
        }}
      >
        <div
          className="react-slide-zoom-space"
          style={{ width: spaceW, height: spaceH }}
        >
        <div
          ref={stageRef}
          className={`react-slide-stage${drawing ? ' is-drawing' : ''}${guidesEditMode ? ' is-guides-edit' : ''}`}
          data-icons-tick={iconsTick}
          onContextMenu={onStageContextMenu}
          style={{
            width: canvasW,
            height: canvasH,
            left: stageLeft,
            top: stageTop,
            transform: `scale(${scale})`,
            '--react-chrome-inverse-scale': 1 / scale,
            background: slideSolidBg(slide),
          }}
        >
          <div className="react-slide-frame" aria-hidden="true" />
          <SlideBgImgLayer slide={slide} canvasW={canvasW} canvasH={canvasH} />
          <svg
            className="react-ink-layer"
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            overflow="visible"
            aria-hidden="true"
          >
            {(freeInkFills || []).length ? (
              <g
                className="react-ink-fills"
                dangerouslySetInnerHTML={{ __html: inkFillsSvgMarkup(freeInkFills) }}
              />
            ) : null}
            {inkHaloMarkup ? (
              <g className="react-ink-sel" dangerouslySetInnerHTML={{ __html: inkHaloMarkup }} />
            ) : null}
            {inkPath ? <g className="react-ink-strokes" dangerouslySetInnerHTML={{ __html: inkPath }} /> : null}
          </svg>
          <canvas
            ref={liveInkCanvasRef}
            className={`react-ink-live${drawTool === 'marker' ? ' is-under' : ''}`}
            width={canvasW}
            height={canvasH}
            aria-hidden="true"
          />
          {(() => {
            const animCss = connectorsAnimStyleCss(slide.connectors || []);
            return animCss ? <style data-conn-anim="1">{animCss}</style> : null;
          })()}
          <svg className="react-conn-layer" viewBox={`0 0 ${canvasW} ${canvasH}`} aria-hidden="true">
            <defs
              dangerouslySetInnerHTML={{
                __html: (() => {
                  const conns = slide.connectors || [];
                  const theme = getTheme(appliedThemeIdx);
                  return connectorsMarkerDefsSvg(conns, 'react', theme);
                })(),
              }}
            />
            {(slide.connectors || []).map((conn) => {
              if (conn.objHidden) return null;
              const d = connectorPathFor(conn, slide.els || []);
              if (!d) return null;
              const selected = selConnId && String(selConnId) === String(conn.id);
              const sw = conn.sw != null ? conn.sw : 2;
              const dashArr = connectorDashArray(conn.dash, sw);
              const fromType = conn.fromMarker || 'none';
              const toType = conn.toMarker || 'none';
              const strokeCol = resolveConnectorStroke(conn, getTheme(appliedThemeIdx));
              const lineVisible = strokeCol !== 'none';
              const fromMk = lineVisible
                ? connectorMarkerUrl('start', fromType, conn.id, 'react')
                : undefined;
              const toMk = lineVisible
                ? connectorMarkerUrl('end', toType, conn.id, 'react')
                : undefined;
              const linecap = connectorLinecap(conn.dash, fromType, toType);
              const animStyle = connectorAnimStyle(conn);
              return (
                <g key={conn.id}>
                  <path
                    className="react-conn-hit"
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      useSelectionStore.getState().pickConnector(conn.id);
                    }}
                  />
                  {selected ? (
                    <path
                      className="react-conn-selection"
                      d={d}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={sw + 4}
                      strokeLinecap={linecap}
                      strokeLinejoin="round"
                      opacity={0.35}
                      style={{ pointerEvents: 'none' }}
                    />
                  ) : null}
                  {lineVisible ? (
                    <path
                      d={d}
                      fill="none"
                      stroke={strokeCol}
                      strokeWidth={sw}
                      strokeLinecap={linecap}
                      strokeLinejoin="round"
                      strokeDasharray={dashArr}
                      markerStart={fromMk}
                      markerEnd={toMk}
                      opacity={conn.opacity != null ? conn.opacity : 1}
                      style={{ pointerEvents: 'none', ...(animStyle || {}) }}
                    />
                  ) : null}
                </g>
              );
            })}
            {(() => {
              if (!selConnId) return null;
              const conn = (slide.connectors || []).find((c) => c && String(c.id) === String(selConnId));
              if (!conn || conn.objHidden) return null;
              const ends = connectorEndpoints(conn, slide.els || []);
              if (!ends) return null;
              const cps = (conn.route || '') === 'curve' ? resolveControlPoints(conn, slide.els || []) : null;
              return (
                <g className="react-conn-handles" key={`h-${conn.id}`}>
                  {cps ? (
                    <>
                      <line
                        x1={cps.p1.x}
                        y1={cps.p1.y}
                        x2={cps.cp1.x}
                        y2={cps.cp1.y}
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray={`${4 / scale} ${3 / scale}`}
                        pointerEvents="none"
                      />
                      <line
                        x1={cps.p2.x}
                        y1={cps.p2.y}
                        x2={cps.cp2.x}
                        y2={cps.cp2.y}
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray={`${4 / scale} ${3 / scale}`}
                        pointerEvents="none"
                      />
                      {[
                        { which: 'cp1', p: cps.cp1 },
                        { which: 'cp2', p: cps.cp2 },
                      ].map((h) => (
                        <rect
                          key={h.which}
                          className="react-cp-handle"
                          x={h.p.x - 5}
                          y={h.p.y - 5}
                          width={10}
                          height={10}
                          transform={`rotate(45 ${h.p.x} ${h.p.y})`}
                          fill="#fff"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          style={{ cursor: 'move', pointerEvents: 'all' }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            cpDragRef.current = {
                              id: conn.id,
                              which: h.which,
                              startCp1: { ...cps.cp1 },
                              startCp2: { ...cps.cp2 },
                            };
                            movedRef.current = false;
                            captureTrustedPointer(e, hostRef.current);
                          }}
                        />
                      ))}
                    </>
                  ) : null}
                  {[
                    { which: 'from', p: ends.p1 },
                    { which: 'to', p: ends.p2 },
                  ].map((h) => (
                    <circle
                      key={h.which}
                      className="react-ep-handle"
                      cx={h.p.x}
                      cy={h.p.y}
                      r={7 / scale}
                      fill="#6366f1"
                      stroke="#fff"
                      strokeWidth={2.5}
                      style={{ cursor: 'move', pointerEvents: 'all' }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        epDragRef.current = {
                          id: conn.id,
                          which: h.which,
                          fromId: conn.fromId,
                          toId: conn.toId,
                          fromSide: conn.fromSide,
                          toSide: conn.toSide,
                          route: conn.route,
                          cpManual: !!conn._cpManual,
                        };
                        movedRef.current = false;
                        setEpGhost({ x: h.p.x, y: h.p.y, ok: true });
                        captureTrustedPointer(e, hostRef.current);
                      }}
                    />
                  ))}
                </g>
              );
            })()}
          </svg>
          {epGhost ? (
            <div
              className={`react-ep-ghost${epGhost.ok ? ' is-snap' : ''}`}
              style={{ left: epGhost.x, top: epGhost.y }}
            />
          ) : null}
          {(slide.els || []).map((el) => {
            if (el.objHidden) return null;
            const displayEl = elWithRideDisplay(el, slide);
            return (
            <ElementView
              key={el._isDecor ? `${el.id}:t${appliedThemeIdx}` : el.id}
              el={displayEl}
              els={slide.els}
              selected={selectedIds.has(String(el.id))}
              editing={String(editingId) === String(el.id)}
              editingCell={editingCell}
              scale={scale}
              onTableStripDown={onTableStripDown}
              onPointerDown={(e) => onElPointerDown(el, e)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                startInlineEdit(el);
              }}
              onCommitText={(html) => {
                if (el.type === 'image') {
                  const text = String(html || '').replace(/<[^>]+>/g, '').replace(/\u00a0/g, ' ').trim();
                  editorApi.patchElementHistory(el.id, { imgCaption: text });
                  setEditingId(null);
                  return;
                }
                if (el.type === 'shape') {
                  editorApi.patchElementHistory(el.id, { shapeHtml: html });
                  setEditingId(null);
                  return;
                }
                const text = String(html || '').replace(/<[^>]+>/g, '');
                const plain = String(html || '')
                  .replace(/<[^>]+>/g, '')
                  .replace(/\u00a0/g, ' ')
                  .trim();
                const lang = useUiStore.getState().lang;
                const prompt = isLayoutTextPlaceholder(el)
                  ? el.textPlaceholderLabel
                  : el.textPlaceholderLabel ||
                    (lang === 'en' ? 'Double-click to edit' : 'Дважды кликните для редактирования');
                if (textPlainIsBlank(html) || (prompt && plain === prompt)) {
                  const st = usePresentationStore.getState();
                  const fresh = (st.slides[st.cur]?.els || []).find((e) => e && String(e.id) === String(el.id));
                  if (fresh?.textPlaceholder && prompt && String(fresh.text || '').trim() === prompt) {
                    setEditingId(null);
                    return;
                  }
                  editorApi.patchElementHistory(
                    el.id,
                    restoreTextPlaceholderPatch({ ...el, textPlaceholderLabel: prompt }, lang)
                  );
                  setEditingId(null);
                  return;
                }
                // Grow only — keep user-resized box height (same as fitTextsOnSlide).
                const measured = measureTextHeight({ ...el, html, text });
                const h = Math.max(el.h || 0, measured);
                const patch = { html, text, h, textPlaceholder: false };
                editorApi.patchElementHistory(el.id, patch);
                setEditingId(null);
              }}
              onEditCell={(id, r, c, opts) => {
                editorApi.pickElement(id);
                const key = `${id}:${r}:${c}`;
                setEditingCell(key);
                setEditingId(null);
                if (!opts?.focus) return;
                // Row insert commits the previous cell and re-renders the table;
                // focus after that paint so the caret lands in the new first cell.
                requestAnimationFrame(() => {
                  setEditingCell(key);
                  requestAnimationFrame(() => {
                    let root = null;
                    try {
                      root = document.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
                    } catch (e) {
                      root = document.querySelector(`[data-id="${String(id)}"]`);
                    }
                    const cell = root?.querySelector(`[data-r="${r}"][data-c="${c}"]`);
                    const ed = cell?.querySelector('[contenteditable="true"]');
                    if (!ed) return;
                    ed.focus();
                    try {
                      const range = document.createRange();
                      range.selectNodeContents(ed);
                      range.collapse(true);
                      const sel = window.getSelection();
                      sel?.removeAllRanges();
                      sel?.addRange(range);
                    } catch (e) {}
                  });
                });
              }}
              onEndCellEdit={() => setEditingCell(null)}
              onTableCellContextMenu={(tel, r, c, ev) => {
                if (!tel) return;
                const st0 = useSelectionStore.getState();
                if (!st0.selId || String(st0.selId) !== String(tel.id)) {
                  editorApi.pickElement(tel.id);
                }
                const st = useSelectionStore.getState();
                const sameTable = st.tableCell && String(st.tableCell.elId) === String(tel.id);
                const covered =
                  sameTable && (st.tableCellSel || []).some((k) => +k.r === r && +k.c === c);
                // Keep multi-selection when RMB is inside it; only retarget if outside.
                if (!covered) editorApi.pickTableCell(tel.id, r, c);
                setEditingCell(null);
                const live =
                  (usePresentationStore.getState().slides[usePresentationStore.getState().cur]?.els || []).find(
                    (x) => x && String(x.id) === String(tel.id)
                  ) || tel;
                const st1 = useSelectionStore.getState();
                const selCount =
                  (st1.tableCellSel || []).filter(
                    (k) => !getTableCell(live, +k.r, +k.c).hidden
                  ).length || 1;
                const anchor =
                  st1.tableCell && String(st1.tableCell.elId) === String(tel.id)
                    ? getTableCell(live, st1.tableCell.r, st1.tableCell.c)
                    : getTableCell(live, r, c);
                const canSplit = !!(anchor && ((anchor.colspan || 1) > 1 || (anchor.rowspan || 1) > 1));
                setElCtxMenu({
                  kind: 'table-cells',
                  x: ev.clientX,
                  y: ev.clientY,
                  elId: String(tel.id),
                  canPaste: canPasteTableCells(),
                  rows: live.rows || 1,
                  cols: live.cols || 1,
                  selCount,
                  canSplit,
                });
              }}
              onCommitCell={(id, r, c, html) => {
                editorApi.patchTableCell(id, r, c, html);
                // Drop edit mode only if we are still on the cell that just committed.
                // Tab-to-new-row already moved the caret; don't clear that target.
                setEditingCell((cur) => (cur === `${id}:${r}:${c}` ? null : cur));
              }}
              cropActive={!!cropModeElId && String(cropModeElId) === String(el.id)}
              onNotesLive={(id, patch) => editorApi.patchNotesLive(id, patch)}
            />
            );
          })}
          <ImageSortMarkersLayer
            slide={slide}
            canvasW={canvasW}
            canvasH={canvasH}
            mode="edit"
          />
          {allGuideLines
            .filter((g) => g && (g.t === 'h' || g.t === 'v') && !g.guideId)
            .map((g, i) => (
              <div
                key={`eg-${i}`}
                className={`react-guide-extra ${g.t === 'h' ? 'h' : 'v'}`}
                style={g.t === 'h' ? { top: g.pos } : { left: g.pos }}
              />
            ))}
          <svg className="react-custom-guides" aria-hidden="true">
            {(customSlideGuides || []).map((g) => {
              if (!g) return null;
              const clip = clipGuideToSlide(g, canvasW, canvasH);
              if (!clip) return null;
              const selected = String(selGuideId) === String(g.id);
              return (
                <g key={g.id}>
                  <line
                    className="react-custom-guide-hit"
                    x1={clip.x1}
                    y1={clip.y1}
                    x2={clip.x2}
                    y2={clip.y2}
                    onPointerDown={(e) => onGuidePointerDown(g, e)}
                  />
                  <line
                    className="react-custom-guide-edge"
                    x1={clip.x1}
                    y1={clip.y1}
                    x2={clip.x2}
                    y2={clip.y2}
                  />
                  <line
                    className={`react-custom-guide-vis${selected ? ' is-sel' : ''}`}
                    x1={clip.x1}
                    y1={clip.y1}
                    x2={clip.x2}
                    y2={clip.y2}
                  />
                </g>
              );
            })}
          </svg>
          {snapGuides
            .filter((g) => g && (g.t === 'h' || g.t === 'v'))
            .map((g, i) => (
              <div
                key={`sg-${i}`}
                className={`react-guide-extra snap ${g.t === 'h' ? 'h' : 'v'}`}
                style={g.t === 'h' ? { top: g.pos } : { left: g.pos }}
              />
            ))}
          {soleSelectedView &&
          !(cropModeElId && String(cropModeElId) === String(soleSelectedView.id)) &&
          (soleSelectedView.type !== 'shape' && soleSelectedView.type !== 'lineangle'
            ? true
            : soleSelectedView.type === 'shape' &&
              getShapeMeta(soleSelectedView.shape || 'rect')?.special === 'cloud') ? (
            <div
              className="react-sel-outline"
              style={{
                left: soleSelectedView.x || 0,
                top: soleSelectedView.y || 0,
                width: soleSelectedView.w || 100,
                height: soleSelectedView.h || 60,
                transform: elBoxTransform(soleSelectedView),
              }}
            >
              {soleSelectedView.type === 'text' ? <TextQuickBar el={soleSelectedView} /> : null}
              <svg
                className="react-selection-stroke"
                viewBox={`0 0 ${soleSelectedView.w || 100} ${soleSelectedView.h || 60}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <rect
                  x="0"
                  y="0"
                  width={soleSelectedView.w || 100}
                  height={soleSelectedView.h || 60}
                  style={{ strokeWidth: 1.5 / scale }}
                />
              </svg>
            </div>
          ) : null}
          {soleSelectedView &&
          !soleSelectedView.locked &&
          !(tableBorderPaint && soleSelectedView.type === 'table') &&
          !(cropModeElId && String(cropModeElId) === String(soleSelectedView.id)) &&
          !(shapeFillImgEditId && String(shapeFillImgEditId) === String(soleSelectedView.id)) &&
          !(curveEditMode && soleSelectedView.shape === 'curve') &&
          !shapeNodeMode &&
          soleSelectedView.shape !== 'line' &&
          soleSelectedView.type !== 'lineangle'
            ? resizeHandleCenters(soleSelectedView, RESIZE_HANDLES).map((h) => {
                const rot = elRotationDeg(soleSelectedView);
                return (
                  <div
                    key={h.id}
                    className="react-rh"
                    style={{
                      left: h.cx,
                      top: h.cy,
                      cursor: resizeHandleCursor(h.id, rot),
                    }}
                    onPointerDown={(e) => onResizePointerDown(h, e)}
                  />
                );
              })
            : null}
          {adjHandles.length && !showShapeNodes && !(curveEditMode && soleSelected?.shape === 'curve')
            ? adjHandles.map((h) => (
                <div
                  key={h.id}
                  role="button"
                  className={`react-adj-handle${h.square ? ' is-square' : ''}`}
                  title={h.title}
                  aria-label={h.title}
                  style={{ left: h.x, top: h.y, cursor: h.cursor }}
                  onPointerDown={(e) => onAdjPointerDown(h, e)}
                />
              ))
            : null}
          {showShapeNodes
            ? shapeNodeHandles.map((h) => (
                <div
                  key={h.id}
                  role="button"
                  className="react-adj-handle"
                  title={h.title}
                  aria-label={h.title}
                  style={{ left: h.x, top: h.y, cursor: h.cursor }}
                  onPointerDown={(e) => onShapeNodePointerDown(h, e)}
                />
              ))
            : null}
          {lineEpHandles.length
            ? lineEpHandles.map((h) => (
                <div
                  key={h.id}
                  className={`react-line-ep${h.joined ? ' is-joined' : ''}`}
                  title={h.title}
                  style={{ left: h.x, top: h.y, cursor: h.cursor }}
                  onPointerDown={(e) => onLineEpPointerDown(h, e)}
                  onDoubleClick={(e) => {
                    if (!h.joined || !soleSelected) return;
                    e.stopPropagation();
                    e.preventDefault();
                    useHistoryStore.getState().push();
                    usePresentationStore.getState().mutateCurrentSlide((sl) => {
                      const d = (sl.els || []).find((el) => el && String(el.id) === String(soleSelected.id));
                      if (d) clearLineJoin(sl, d, h.which);
                    });
                    useUiStore.getState().showToast(
                      useUiStore.getState().lang !== 'en' ? 'Отсоединено от стыка' : 'Detached from junction',
                      'ok'
                    );
                  }}
                />
              ))
            : null}
          {curveEditMode && curveOverlay.lines?.length ? (
            <svg
              className="react-curve-levers"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 91 }}
            >
              {curveOverlay.lines.map((ln) => (
                <line
                  key={ln.id}
                  x1={ln.x1}
                  y1={ln.y1}
                  x2={ln.x2}
                  y2={ln.y2}
                  stroke="rgba(255,255,255,0.65)"
                  strokeWidth="1"
                  strokeDasharray={`${3 / scale} ${2 / scale}`}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          ) : null}
          {curveEditMode
            ? curveOverlay.nodes.map((h) => (
                <div
                  key={h.id}
                  className={`react-curve-handle is-node is-${h.type || 'corner'}${h.selected ? ' is-sel' : ''}`}
                  title={h.title}
                  style={{ left: h.x, top: h.y }}
                  onPointerDown={(e) => onCurveHandlePointerDown(h, e)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const pts = soleSelected.curvePoints || defaultCurvePoints();
                    const next = cycleCurveNodeType(pts, [h.idx], !!soleSelected.curveClosed);
                    editorApi.patchElementHistory(soleSelected.id, { curvePoints: next });
                    useUiStore.getState().setCurveNodeSel([h.idx]);
                  }}
                />
              ))
            : null}
          {curveEditMode
            ? curveOverlay.cps.map((h) => (
                <div
                  key={h.id}
                  className="react-curve-handle is-cp"
                  style={{ left: h.x, top: h.y }}
                  onPointerDown={(e) => onCurveHandlePointerDown(h, e)}
                />
              ))
            : null}
          {groupBBox ? (
            <>
              <div
                className="react-group-outline"
                style={{
                  left: groupBBox.x,
                  top: groupBBox.y,
                  width: groupBBox.w,
                  height: groupBBox.h,
                }}
              >
                <svg
                  className="react-selection-stroke"
                  viewBox={`0 0 ${groupBBox.w} ${groupBBox.h}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <rect
                    x="0"
                    y="0"
                    width={groupBBox.w}
                    height={groupBBox.h}
                    style={{ strokeWidth: 1.5 / scale }}
                    strokeDasharray={`${6 / scale} ${4 / scale}`}
                  />
                </svg>
                <span className="react-group-label">Группа</span>
              </div>
              <div
                className="react-group-rot"
                title="Rotate"
                style={{
                  left: groupBBox.x + groupBBox.w / 2,
                  top: groupBBox.y - 22 / scale,
                }}
                onPointerDown={onGroupRotPointerDown}
              />
              {RESIZE_HANDLES.map((h) => {
                const bx = groupBBox.x;
                const by = groupBBox.y;
                const bw = groupBBox.w;
                const bh = groupBBox.h;
                const left = h.dx < 0 ? bx : h.dx > 0 ? bx + bw : bx + bw / 2;
                const top = h.dy < 0 ? by : h.dy > 0 ? by + bh : by + bh / 2;
                return (
                  <div
                    key={`g-${h.id}`}
                    className="react-group-rh"
                    style={{ left, top, cursor: h.cursor }}
                    onPointerDown={(e) => onGroupResizePointerDown(h, e)}
                  />
                );
              })}
            </>
          ) : null}
          <CameraOverlay />
          <MotionOverlay />
        </div>
          {bandStyle ? <div className="react-rubberband" style={bandStyle} /> : null}
        </div>
      </div>
    </div>
  );
}

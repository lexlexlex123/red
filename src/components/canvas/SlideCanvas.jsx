import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { extraGuidesKind, useUiStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../stores/historyStore';
import { editorApi } from '../../editor/editorApi';
import { buildBasicShapeSVG, shapeOptsFromEl } from '../../shared/shapes.js';
import { getShapeMeta, shapeNeedsOverflowVisible } from '../../shared/shapesCatalog.js';
import AlignBar from './AlignBar.jsx';
import CanvasCtxMenu, {
  canPasteElements,
  ctxGroupMenuState,
  qrTextFromEl,
} from './CanvasCtxMenu.jsx';
import EditableHtml from './EditableHtml.jsx';
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
} from '../../editor/inkHost.js';
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
  toggleCurveNodeType,
  defaultCurvePoints,
  curveCanvasToNorm,
  applyCurveBBox,
} from '../../editor/curveEditor.js';
import { getIconById, onIconsReady } from '../../editor/iconsLazy.js';
import { iconAnimEnabled } from '../../editor/iconAnim.js';
import AnimatedIcon from './AnimatedIcon.jsx';
import { parseFontFamily, parseCsNumber } from '../../editor/fonts.js';
import { getTheme, resolveElTextColor, resolveSchemeColor } from '../../editor/themes.js';
import { underlineBoxProps } from '../../editor/textUnderline.js';
import { getTableCell, tableCellBg, tableCellRadiusStyle, tableColWidthsPx, tableRowHeightsPx } from '../../editor/tableCells.js';
import { imageRenderStyles, normImgFrame, imgBorderSvgMarkup } from '../../editor/imgStyles.js';
import ImageCropOverlay from './ImageCropOverlay.jsx';
import CameraOverlay from './CameraOverlay.jsx';
import MotionOverlay from './MotionOverlay.jsx';
import SlideBgImgLayer from './SlideBgImgLayer.jsx';
import { slideSolidBg } from '../../editor/slideBgImg.js';
import { elBoxTransform, applyResize, resizeHandleCenters, resizeHandleCursor, nearCornerRot, elRotationDeg } from '../../editor/elTransform.js';
import { resolveMediaSrc } from '../../editor/mediaStore.js';
import { unionBBox, scaleGroupMembers, rotateGroupMembers } from '../../editor/groupGeom.js';
import { buildHfSrcdoc, hfTitleFromSrc, isHttpUrl, HF_SANDBOX } from '../../editor/htmlFrame.js';
import {
  CODE_THEMES,
  syntaxHighlight,
  codeBlockSurfaceStyle,
} from '../../editor/codeHighlight.js';
import { elFilterCss } from '../../editor/elShadow.js';
import { shapeBlurOverlayStyle, shapeBlurPx } from '../../editor/shapeBlur.js';
import { shapeHitMode, shapeClipPath, shapeLineHitSvg, shapeCurveHitSvg } from '../../editor/shapeHit.js';
import { shapeTextBoxStyle } from '../../editor/shapeText.js';
import { buildLineAngleContent } from '../../editor/lineAngle.js';
import { hoverMotionStyle } from '../../editor/hoverFx.js';
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
import { buildLegoSvg, snapLegoPos } from '../../editor/lego.js';
import { textBgLayerStyle, textColorGradStyle } from '../../editor/textBg.js';
import {
  textBorderBoxStyle,
  textBorderSvgMarkup,
  needsTextBorderOverflow,
} from '../../editor/textBorder.js';
import { textGlyphShadowStyle, textBlockShadowStyle } from '../../editor/textShadow.js';
import { textPadCss } from '../../editor/textPad.js';
import { textBorderRadiusCss } from '../../editor/textRadius.js';

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

function extraGuideLines(mode, canvasW, canvasH) {
  const kind = extraGuidesKind(mode);
  const lines = [];
  if (kind === 'grid') {
    for (let x = GRID_GUIDE_STEP; x < canvasW; x += GRID_GUIDE_STEP) lines.push({ t: 'v', pos: x });
    for (let y = GRID_GUIDE_STEP; y < canvasH; y += GRID_GUIDE_STEP) lines.push({ t: 'h', pos: y });
  } else if (kind === 'margin') {
    lines.push({ t: 'v', pos: MARGIN_GUIDE_INSET }, { t: 'v', pos: canvasW - MARGIN_GUIDE_INSET });
    lines.push({ t: 'h', pos: MARGIN_GUIDE_INSET }, { t: 'h', pos: canvasH - MARGIN_GUIDE_INSET });
  }
  return lines;
}

function snapTranslateToExtraGuides(x, y, w, h, lines, th = EXTRA_GUIDE_TH) {
  let nx = x;
  let ny = y;
  const hit = [];
  for (const g of lines) {
    if (g.t === 'v') {
      if (Math.abs(nx - g.pos) < th) {
        nx = g.pos;
        hit.push(g);
      } else if (Math.abs(nx + w / 2 - g.pos) < th) {
        nx = g.pos - w / 2;
        hit.push(g);
      } else if (Math.abs(nx + w - g.pos) < th) {
        nx = g.pos - w;
        hit.push(g);
      }
    } else if (Math.abs(ny - g.pos) < th) {
      ny = g.pos;
      hit.push(g);
    } else if (Math.abs(ny + h / 2 - g.pos) < th) {
      ny = g.pos - h / 2;
      hit.push(g);
    } else if (Math.abs(ny + h - g.pos) < th) {
      ny = g.pos - h;
      hit.push(g);
    }
  }
  return { x: nx, y: ny, hit };
}

function snapResizeToExtraGuides(box, handle, lines, th = EXTRA_GUIDE_TH) {
  let { x, y, w, h } = box;
  const min = 24;
  const hit = [];
  for (const g of lines) {
    if (g.t === 'v') {
      if (handle.dx > 0 && Math.abs(x + w - g.pos) < th) {
        w = Math.max(min, g.pos - x);
        hit.push(g);
      } else if (handle.dx < 0 && Math.abs(x - g.pos) < th) {
        const right = x + w;
        x = g.pos;
        w = Math.max(min, right - x);
        hit.push(g);
      }
    } else if (g.t === 'h') {
      if (handle.dy > 0 && Math.abs(y + h - g.pos) < th) {
        h = Math.max(min, g.pos - y);
        hit.push(g);
      } else if (handle.dy < 0 && Math.abs(y - g.pos) < th) {
        const bottom = y + h;
        y = g.pos;
        h = Math.max(min, bottom - y);
        hit.push(g);
      }
    }
  }
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), hit };
}

function snapResizeToGrid(box, handle, step, skip = { v: false, h: false }) {
  const st = Math.max(1, Math.round(step) || 20);
  let { x, y, w, h } = box;
  const min = 24;
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
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

function textFromEl(el) {
  if (el.html) return String(el.html).replace(/<[^>]+>/g, '');
  return el.text || '';
}

function ShapeTextLayer({ el, editing, onCommitText }) {
  return (
    <div className="react-shape-text" style={shapeTextBoxStyle(el, { editing })}>
      <EditableHtml
        html={el.shapeHtml || ''}
        editing={editing}
        onCommit={onCommitText}
        style={{
          width: '100%',
          textAlign: 'center',
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

function ElementView({ el, els, selected, onPointerDown, onDoubleClick, editing, onCommitText, editingCell, onEditCell, onCommitCell, onEndCellEdit, cropActive, onNotesLive, scale, onTableStripDown }) {
  const [hovered, setHovered] = useState(false);
  const tableCell = useSelectionStore((s) => s.tableCell);
  const tableCellSel = useSelectionStore((s) => s.tableCellSel);
  const animSt = useUiStore((s) => (s.animPlay ? s.animPlay[el.id] : null));
  const connectorMode = useUiStore((s) => s.connectorMode);
  const hfxOn =
    !!(el.hoverFx && el.hoverFx.enabled) &&
    !editing &&
    !cropActive &&
    !el._isDecor &&
    el.type !== 'inkhost';
  const hfx = hfxOn ? hoverMotionStyle(el, el.hoverFx, hovered && !selected) : null;
  const hfxBind = hfxOn
    ? {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      }
    : {};
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

  const style = {
    position: 'absolute',
    left: el.x || 0,
    top: el.y || 0,
    width: el.w || 100,
    height: el.h || 60,
    transform: elBoxTransform(el),
    opacity: animSt?.hidden ? 0 : el.elOpacity != null ? el.elOpacity : 1,
    visibility: animSt?.hidden ? 'hidden' : undefined,
    filter: elFilterCss(el),
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
      needsTextBorderOverflow(el) ||
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
    style.animation = `${floatAnimName} ${dur}ms ease-in-out ${loops}`;
  } else if (animSt?.dance && danceAnimName) {
    const dur = Math.max(200, +(animSt.dur || 1200) || 1200);
    const infinite = danceIsInfinite({ swingCount: animSt.swingCount != null ? animSt.swingCount : 1 });
    const loops = infinite ? 'infinite' : Math.max(1, +(animSt.swingCount || 1));
    style.transform = undefined;
    style.animation = `${danceAnimName} ${dur}ms ease-in-out ${loops}`;
  } else if (animSt?.swing && swingAnimName) {
    const dur = Math.max(200, +(animSt.dur || 1200) || 1200);
    const infinite = swingIsInfinite({ swingCount: animSt.swingCount != null ? animSt.swingCount : 1 });
    const loops = infinite ? 'infinite' : Math.max(1, +(animSt.swingCount || 1));
    style.transform = undefined;
    style.transformOrigin = swingOriginCss(el, {
      swingOx: animSt.swingOx,
      swingOy: animSt.swingOy,
    });
    style.animation = `${swingAnimName} ${dur}ms ease-in-out ${loops}`;
  } else if (animSt?.pulseName || (animSt?.cls && isPulseFamilyAnim(pulseNameFromCls(animSt.cls)))) {
    const pname = animSt.pulseName || pulseNameFromCls(animSt.cls);
    const dur = Math.max(50, +(animSt.dur || 600) || 600);
    const kf = pulseKeyframesName(pname);
    const iter = pulseCssIteration({
      swingCount: animSt.swingCount != null ? animSt.swingCount : 1,
    });
    style.animation = `${kf} ${dur}ms ease ${iter}`;
  } else if (hfx?.transform) {
    style.transform = hfx.transform;
  } else {
    style.transform = elBoxTransform(el);
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
  const elClass = `react-el${grouped ? ' in-group' : ''}${el.link ? ' has-link' : ''}${el.locked ? ' is-locked' : ''}${hfxOn ? ' has-hover-fx' : ''}${el.textRole === 'toc' ? ' has-toc' : ''}${animSt?.cls && !skipCls ? ` ${animSt.cls}` : ''}${connCls}`;

  if (el.type === 'formula' && el.formulaSvg) {
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
          justifyContent: 'center',
        }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        {...hfxBind}
        dangerouslySetInnerHTML={{ __html: el.formulaSvg }}
      />
    );
  }

  if (el.type === 'text' || el.type === 'formula') {
    const css = el.cs || '';
    const fs = (css.match(/font-size\s*:\s*([\d.]+)px/i) || [])[1];
    const align = (css.match(/text-align\s*:\s*([^;]+)/i) || [])[1] || (el.type === 'formula' ? 'center' : 'left');
    const weight = (css.match(/font-weight\s*:\s*([^;]+)/i) || [])[1];
    const fontStyle = (css.match(/font-style\s*:\s*([^;]+)/i) || [])[1];
    const ulBox = el.type === 'text' ? underlineBoxProps(css) : { style: {}, className: '', kind: 'none' };
    const family = parseFontFamily(css) || 'Georgia, serif';
    const lineH = parseCsNumber(css, 'line-height');
    const letterSp = parseCsNumber(css, 'letter-spacing');
    const textTransform = (css.match(/text-transform\s*:\s*([^;]+)/i) || [])[1];
    const valign = el.valign || (el.type === 'formula' ? 'middle' : 'top');
    const justify =
      valign === 'middle' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start';
    const html = el.html != null && el.html !== '' ? el.html : textFromEl(el);
    const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
    const showAsPlaceholder = !!el.textPlaceholder && !editing;
    const resolvedText = showAsPlaceholder
      ? TEXT_PH_COLOR
      : resolveElTextColor(el, theme);
    const bgLayer = el.type === 'text' ? textBgLayerStyle(el) : null;
    const colorGrad =
      el.type === 'text' && el.textRole !== 'toc' && !showAsPlaceholder
        ? textColorGradStyle(el)
        : null;
    const borderSvg = el.type === 'text' ? textBorderSvgMarkup(el) : '';
    const glyphSh = el.type === 'text' ? textGlyphShadowStyle(el) : null;
    const blockSh = el.type === 'text' ? textBlockShadowStyle(el) : null;
    const hasList =
      el.type === 'text' &&
      (/(data-list-bullet|data-list-num)/i.test(html) || el.bulletIconId);
    const textStyle = {
      ...style,
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
      justifyContent: justify,
      position: 'absolute',
      ...(hasList ? { ['--rt-bullet-gap']: `${el.bulletGap != null ? el.bulletGap : 10}px` } : {}),
      ...(blockSh || {}),
    };
    const inner = (
      <EditableHtml
        className="react-text-body"
        html={html}
        editing={editing}
        clearOnEdit={!!el.textPlaceholder}
        onCommit={onCommitText}
        onBulletClick={() => editorApi.openBulletIconPicker(el.id)}
        style={{
          position: 'relative',
          zIndex: 1,
          flex: '0 1 auto',
          width: '100%',
          outline: 'none',
          cursor: editing ? 'text' : undefined,
          ...(colorGrad || {}),
          ...(glyphSh || {}),
          color: colorGrad ? undefined : (hfx && hfx.color) || resolvedText,
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
          if (e.target.closest?.('[data-list-bullet]')) {
            e.stopPropagation();
            e.preventDefault();
            editorApi.openBulletIconPicker(el.id);
            return;
          }
          onPointerDown(e);
        }}
        onDoubleClick={onDoubleClick}
        {...hfxBind}
      >
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
    );
  }

  if (el.type === 'image' && el.src) {
    const rs = imageRenderStyles(el);
    const frame = normImgFrame(el.imgFrame);
    const borderSvg = frame === 'none' ? imgBorderSvgMarkup(el) : '';
    return (
      <div
        className={`${elClass} ${rs.frameClass}`.trim()}
        data-id={el.id}
        style={{ ...style, ...rs.box, opacity: 1, overflow: borderSvg ? 'visible' : style.overflow }}
        onPointerDown={onPointerDown}
        {...hfxBind}
      >
        <div style={rs.inner}>
          <img alt="" src={el.src} draggable={false} style={rs.img} />
          {cropActive ? <ImageCropOverlay el={el} /> : null}
        </div>
        {borderSvg ? (
          <div
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, overflow: 'visible' }}
            dangerouslySetInnerHTML={{ __html: borderSvg }}
          />
        ) : null}
        {frame === 'ribbon' ? <div className="react-img-ribbon-bar" /> : null}
        {frame === 'polaroid' && el.imgCaption ? (
          <div className="react-img-polaroid-cap">{el.imgCaption}</div>
        ) : null}
      </div>
    );
  }

  if (el.type === 'shape') {
    const shapeMeta = getShapeMeta(el.shape || 'rect');
    const rectSelOnly = shapeMeta?.special === 'cloud';
    const svg = buildBasicShapeSVG(el.shape || 'rect', shapeOptsFromEl(el));
    const ringSvg =
      selected && !grouped && !rectSelOnly
        ? buildBasicShapeSVG(el.shape || 'rect', {
            ...shapeOptsFromEl(el),
            fill: 'none',
            fillOp: 1,
            fillGrad: null,
            fillGrad2: null,
            stroke: '#3b82f6',
            // Fixed thin ring — must not grow with stroke width (that looked like wrong stroke color).
            strokeWidth: 2,
          })
        : null;
    const sb = shapeBlurPx(el);
    const blurStyle = sb > 0 ? shapeBlurOverlayStyle(el) : null;
    const hitMode = shapeHitMode(el);
    const hitClip = hitMode === 'clip' ? shapeClipPath(el) : null;
    const lineHit = hitMode === 'line' ? shapeLineHitSvg(el) : null;
    const curveHit = hitMode === 'curve' ? shapeCurveHitSvg(el) : null;
    const useHitOverlay =
      !editing && (hitMode === 'clip' || hitMode === 'line' || hitMode === 'box' || hitMode === 'curve');
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
            sb > 0 || editing || shapeNeedsOverflowVisible(el.shape)
              ? 'visible'
              : style.overflow,
          transformOrigin: el.shape === 'line' ? 'center center' : style.transformOrigin,
          pointerEvents: useHitOverlay ? 'none' : style.cursor === 'text' ? 'auto' : undefined,
        }}
        {...hostBind}
      >
        {blurStyle ? (
          <div className="react-shape-blur-overlay" aria-hidden="true" style={blurStyle} />
        ) : null}
        <div
          style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', pointerEvents: 'none' }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {ringSvg ? (
          <div
            className="react-shape-sel-ring"
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
            dangerouslySetInnerHTML={{ __html: ringSvg }}
          />
        ) : null}
        <ShapeTextLayer el={el} editing={editing} onCommitText={onCommitText} />
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
          className={elClass}
          data-id={el.id}
          style={{ ...style, padding: 0 }}
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
    const bw = el.borderW != null ? +el.borderW : 1;
    const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
    // v7.1: borderless only when explicitly transparent and no scheme ref
    const bc =
      (!el.borderColor || el.borderColor === 'transparent') && !el.borderColorScheme
        ? 'transparent'
        : resolveSchemeColor(el.borderColorScheme, theme) || el.borderColor || el.stroke || 'transparent';
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

    // v7.1 cell mousedown: pick anchor, drag = range select, plain click = edit
    function cellPointerDown(ev, r, c) {
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

    // v7.1 cell keydown: Tab = next cell, Enter = cell below, F5 = preview
    function cellKeyDown(ev, r, c) {
      if (ev.key === 'Tab') {
        ev.preventDefault();
        const nc = c + 1 < cols ? c + 1 : 0;
        const nr = c + 1 < cols ? r : r + 1 < rows ? r + 1 : 0;
        onEditCell?.(el.id, nr, nc);
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
        className={`${elClass} react-el-table${selected ? ' is-selected' : ''}`}
        data-id={el.id}
        data-editing={editingThisTable ? 'true' : undefined}
        style={{
          ...style,
          background: 'transparent',
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
              fontFamily: el.ff || undefined,
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
                    const isLastC = c + cs - 1 >= cols - 1;
                    const isLastR = r + rs - 1 >= rows - 1;
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
                          borderTop: `${bw}px solid ${bc}`,
                          borderLeft: `${bw}px solid ${bc}`,
                          borderRight: isLastC ? `${bw}px solid ${bc}` : undefined,
                          borderBottom: isLastR ? `${bw}px solid ${bc}` : undefined,
                          textAlign: cell.align || 'left',
                          verticalAlign: cell.valign || 'middle',
                          padding: '5px 9px',
                          overflow: 'hidden',
                          wordBreak: 'normal',
                          overflowWrap: 'break-word',
                          fontWeight: isH ? 700 : 400,
                          boxSizing: 'border-box',
                          fontSize: cell.fs != null ? +cell.fs : undefined,
                          fontFamily: cell.ff || undefined,
                          color: cellTc || undefined,
                          outline: isCellSel ? '2px solid #3b82f6' : undefined,
                          outlineOffset: isCellSel ? -1 : undefined,
                          ...tableCellRadiusStyle(el, r, c, cs, rs),
                        }}
                        onPointerDown={(ev) => cellPointerDown(ev, r, c)}
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
        {colHandleLefts.map((left, ci) => (
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
        {rowHandleTops.map((top, ri) => (
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
        {[
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
    return (
      <div
        className={elClass}
        data-id={el.id}
        style={{ ...style, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}
        onPointerDown={onPointerDown}
        {...hfxBind}
      >
        {src ? (
          <audio src={src} controls style={{ width: '100%', pointerEvents: 'none' }} />
        ) : (
          <span style={{ color: '#94a3b8', fontSize: 13 }}>Audio</span>
        )}
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
    const surface = codeBlockSurfaceStyle(el);
    const T = CODE_THEMES[el.codeTheme || 'dark'] || CODE_THEMES.dark;
    const html = el.codeHtml || syntaxHighlight(el.codeRaw || '', el.codeLang || 'js', el.codeTheme || 'dark');
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
          <div style={{ fontSize: 9, color: T.cmt, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {el.codeLang || 'code'}
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    );
  }

  if (el.type === 'svg' || el.svgContent) {
    const isDecor = !!el._isDecor;
    if (isDecor) attachDecorGlCfg(el);
    const useGl = isDecor && decorUsesGl(el);
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
          {el.svgContent ? (
            <DecorSvgHost
              html={el.svgContent}
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
          html={el.svgContent || ''}
        />
      );
    }
    return (
      <div
        className={elClass}
        data-id={el.id}
        style={boxStyle}
        onPointerDown={onPointerDown}
        {...hfxBind}
        dangerouslySetInnerHTML={{ __html: el.svgContent || '' }}
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
            srcDoc={url ? undefined : buildHfSrcdoc(src)}
          />
          <div className="react-hf-overlay" />
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
          pointerEvents: 'auto',
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
    const inner = inkHostInnerMarkup(slide, el, inkStrokeSvgMarkup, inkFillsSvgMarkup);
    const op = el.elOpacity != null ? +el.elOpacity : 1;
    return (
      <div
        className={`${elClass} react-el-inkhost`}
        data-id={el.id}
        style={{
          ...style,
          background: 'transparent',
          border: selected ? '1px dashed rgba(59,130,246,0.55)' : '1px dashed transparent',
          overflow: 'visible',
          opacity: op < 1 ? op : undefined,
        }}
        onPointerDown={onPointerDown}
        title="ink"
      >
        {inner ? (
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
            dangerouslySetInnerHTML={{ __html: inner }}
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
        <Model3dView el={el} />
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
        dangerouslySetInnerHTML={{ __html: buildLegoSvg(el) }}
      />
    );
  }

  if (el.type === 'graph') {
    return (
      <div
        className={`${elClass} react-el-graph`}
        data-id={el.id}
        style={{
          ...style,
          padding: 0,
          overflow: 'hidden',
          background: el.graphKind === 'chem' ? (el.graphBg || 'transparent') : el.graphBg || '#16161e',
        }}
        onPointerDown={onPointerDown}
        {...hfxBind}
      >
        {el.graphImg ? (
          <img src={el.graphImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
        ) : (
          <div style={{ padding: 8, fontSize: 12, color: '#94a3b8' }}>{el.graphLatex || el.graphExpr || 'graph'}</div>
        )}
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

export default function SlideCanvas() {
  const hostRef = useRef(null);
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
  const finishBoot = useUiStore((s) => s.finishBoot);
  const canvasZoom = useUiStore((s) => s.canvasZoom);
  const setCanvasZoom = useUiStore((s) => s.setCanvasZoom);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const snapStep = useUiStore((s) => s.snapStep);
  const extraGuidesMode = useUiStore((s) => s.extraGuidesMode);
  const cropModeElId = useUiStore((s) => s.cropModeElId);
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
  const [band, setBand] = useState(null);
  const [snapGuides, setSnapGuides] = useState([]);
  const [epGhost, setEpGhost] = useState(null);
  const [brushCur, setBrushCur] = useState(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const rotDragRef = useRef(null);
  const adjRef = useRef(null);
  const lineEpRef = useRef(null);
  const curveDragRef = useRef(null);
  const [curveSelIdx, setCurveSelIdx] = useState(0);
  const curveEditMode = useUiStore((s) => s.curveEditMode);
  const groupResizeRef = useRef(null);
  const groupRotRef = useRef(null);
  const epDragRef = useRef(null);
  const inkRef = useRef(null);
  const inkDragRef = useRef(null);
  const liveInkCanvasRef = useRef(null);
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

  useEffect(() => {
    if (!showBrushCursor) setBrushCur(null);
  }, [showBrushCursor]);

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
    return listCurveEditorHandles(soleSelected, curveSelIdx);
  }, [curveEditMode, soleSelected, curveSelIdx]);

  useEffect(() => {
    if (!soleSelected || soleSelected.shape !== 'curve') {
      if (useUiStore.getState().curveEditMode) useUiStore.getState().setCurveEditMode(false);
      setCurveSelIdx(0);
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

  const guideLines = useMemo(() => {
    if (extraGuidesKind(extraGuidesMode) === 'none') return [];
    return extraGuideLines(extraGuidesMode, canvasW, canvasH);
  }, [extraGuidesMode, canvasW, canvasH]);

  useEffect(() => {
    finishBoot();
  }, [finishBoot]);

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
    if (!snapEnabled) return Math.round(v);
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

  const inkHaloMarkup = useMemo(
    () => inkSelectionHaloMarkup(slide, selInkIds),
    [slide.ink, slide.inkFills, selInkIds]
  );

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
      const el = (slide.els || []).find((e) => e && String(e.id) === String(id));
      drag.domEls.push({
        node,
        baseTransform: elBoxTransform(el) || '',
      });
      node.style.willChange = 'transform';
    });
    drag.domChrome = [];
    stage
      .querySelectorAll(
        '.react-sel-outline, .react-rh, .react-group-outline, .react-group-label, .react-group-rh, .react-group-rot, .react-adj-handle, .react-line-ep, .react-ep-handle, .react-curve-handle, .react-sel-frame'
      )
      .forEach((node) => {
        drag.domChrome.push({
          node,
          baseTransform: node.style.transform || '',
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
    const t = dx || dy ? `translate3d(${dx}px, ${dy}px, 0)` : '';
    (drag.domEls || []).forEach(({ node, baseTransform }) => {
      const next = t ? (baseTransform ? `${t} ${baseTransform}` : t) : baseTransform || '';
      node.style.transform = next;
    });
    (drag.domChrome || []).forEach(({ node, baseTransform }) => {
      const next = t ? (baseTransform ? `${t} ${baseTransform}` : t) : baseTransform || '';
      node.style.transform = next;
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
    (drag.domEls || []).forEach(({ node, baseTransform }) => {
      node.style.transform = baseTransform || '';
      node.style.willChange = '';
    });
    (drag.domChrome || []).forEach(({ node, baseTransform }) => {
      node.style.transform = baseTransform || '';
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

  function clearLiveInkCanvas() {
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

  function onStagePointerDown(e) {
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
            e.currentTarget.setPointerCapture?.(e.pointerId);
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
      }
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
    if (e.target.closest('.react-el') || e.target.closest('.react-rh') || e.target.closest('.react-cp-handle') || e.target.closest('.react-group-rh') || e.target.closest('.react-group-rot') || e.target.closest('.react-ep-handle') || e.target.closest('.react-adj-handle') || e.target.closest('.react-line-ep') || e.target.closest('.react-curve-handle')) return;
    // Corner rotate zone (v7.1): just outside resize handles — single el or whole group
    if (
      groupBBox &&
      multiMembers &&
      !multiMembers.some((el) => el.locked)
    ) {
      const pt0 = canvasPoint(e);
      const virt = { x: groupBBox.x, y: groupBBox.y, w: groupBBox.w, h: groupBBox.h, rot: 0 };
      if (pt0 && nearCornerRot(virt, pt0[0], pt0[1])) {
        e.preventDefault();
        e.stopPropagation();
        onGroupRotPointerDown(e);
        return;
      }
    } else if (
      soleSelectedView &&
      !soleSelectedView.locked &&
      soleSelectedView.type !== 'lego' &&
      soleSelectedView.type !== 'lineangle' &&
      soleSelectedView.shape !== 'line' &&
      !(curveEditMode && soleSelectedView.shape === 'curve')
    ) {
      const pt0 = canvasPoint(e);
      if (pt0 && nearCornerRot(soleSelectedView, pt0[0], pt0[1])) {
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
        e.currentTarget.setPointerCapture?.(e.pointerId);
        return;
      }
    }
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
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
    bandRef.current = { x0: pt[0], y0: pt[1], x1: pt[0], y1: pt[1] };
    setBand({ ...bandRef.current });
    editorApi.pickElement(null);
    setEditingId(null);
    setEditingCell(null);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onStagePointerMove(e) {
    if (showBrushCursor) {
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
        const near = nearCornerRot(virt, ptHover[0], ptHover[1]);
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
      !(curveEditMode && soleSelectedView.shape === 'curve')
    ) {
      const ptHover = canvasPoint(e);
      const stage = stageRef.current;
      if (stage && ptHover) {
        const near = nearCornerRot(soleSelectedView, ptHover[0], ptHover[1]);
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
          // Erase immediately while moving (like v7.1)
          const pts = inkRef.current.points.map((p) => [p.x, p.y]);
          editorApi.eraseInkNear(pts, (inkRef.current.width || 10) * 0.75);
        } else {
          paintLiveInk(inkRef.current);
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
      usePresentationStore.getState().applyElementPatches(patches, { live: true });
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
        const st = Math.max(1, snapStep || 20);
        rdx = Math.round(rdx / st) * st;
        rdy = Math.round(rdy / st) * st;
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
      const keepAspect =
        e.shiftKey ||
        typ === 'icon' ||
        typ === 'image' ||
        typ === 'svg' ||
        (typ === 'graph' && (live?.graphKind === 'chem' || live?.graphKind === 'logic'));
      let next = applyResize(rz.start, rz.handle, dx, dy, {
        keepAspect,
        rot: rz.rot || 0,
        min: typ === 'icon' ? 16 : 24,
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
        if (guideLines.length) {
          const snapped = snapResizeToExtraGuides(next, rz.handle, guideLines);
          next = { x: snapped.x, y: snapped.y, w: snapped.w, h: snapped.h };
          skipV = snapped.hit.some((g) => g.t === 'v');
          skipH = snapped.hit.some((g) => g.t === 'h');
          setSnapGuides(snapped.hit);
        }
        next = snapResizeToGrid(next, rz.handle, snapStep || 20, { v: skipV, h: skipH });
      }
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      usePresentationStore.getState().applyElementPatches({ [rz.id]: next }, { live: true });
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
      const liveEl = (slide.els || []).find((el) => el && String(el.id) === String(cd.id)) || cd.start;
      const pts0 = liveEl.curvePoints || defaultCurvePoints();
      const norm = curveCanvasToNorm(liveEl, pt[0], pt[1]);
      let nextPts;
      if (cd.kind === 'node') nextPts = moveCurveNode(pts0, cd.idx, norm.x, norm.y, !!liveEl.curveClosed);
      else nextPts = moveCurveCp(pts0, cd.idx, cd.kind, norm.x, norm.y, !!liveEl.curveClosed);
      if (!movedRef.current) {
        useHistoryStore.getState().push();
        movedRef.current = true;
      }
      usePresentationStore.getState().patchElement(cd.id, { curvePoints: nextPts });
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const pt = canvasPoint(e);
    if (!pt) return;
    let nx = gridSnap(drag.ox + (pt[0] - drag.px));
    let ny = gridSnap(drag.oy + (pt[1] - drag.py));
    const primary = (slide.els || []).find((el) => el && String(el.id) === String(drag.id));
    const w = primary?.w || drag.w || 100;
    const h = primary?.h || drag.h || 60;
    let guides = [];
    if (snapEnabled && primary) {
      const others = (slide.els || []).filter(
        (el) => el && !el._isDecor && !drag.ids.includes(String(el.id))
      );
      const snapped = snapBox({ x: nx, y: ny, w, h }, others, { canvasW, canvasH });
      nx = snapped.x;
      ny = snapped.y;
      guides = snapped.guides || [];
    }
    if (guideLines.length) {
      const extra = snapTranslateToExtraGuides(nx, ny, w, h, guideLines);
      nx = extra.x;
      ny = extra.y;
      if (extra.hit.length) guides = [...guides, ...extra.hit];
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
    // Every pointer sample — no rAF coalesce, no React setState.
    applyDragDom(drag, dx, dy);
    syncDragGuidesDom(drag, guides);
  }

  function onStagePointerUp() {
    if (inkRef.current) {
      const stroke = inkRef.current;
      if (stroke.tool === 'eraser') {
        if (stroke.points.length >= 1) {
          const pts = stroke.points.map((p) => [p.x, p.y]);
          editorApi.eraseInkNear(pts, (stroke.width || 16) * 0.75);
        }
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
          return x < R && x + w > L && y < B && y + h > T;
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
      if (dx || dy) {
        usePresentationStore.getState().moveElements(drag.ids, dx, dy);
      }
      const ids = drag.ids || [];
      const patches = {};
      let pnEl = null;
      const afterEls = usePresentationStore.getState().slides[cur]?.els || [];
      afterEls.forEach((el) => {
        if (!el || !ids.includes(String(el.id))) return;
        if (el.type === 'pagenum') pnEl = el;
        if (el.type !== 'lego') return;
        const snapped = snapLegoPos(el.x, el.y);
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
    resizeRef.current = null;
    rotDragRef.current = null;
    if (stageRef.current) {
      stageRef.current.classList.remove('is-rot-dragging', 'is-rot-hover');
    }
    if (adjRef.current) {
      if (movedRef.current) usePresentationStore.getState().persist();
      adjRef.current = null;
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
      if (movedRef.current) usePresentationStore.getState().persist();
      curveDragRef.current = null;
    }
    movedRef.current = false;
    setSnapGuides([]);
  }

  function startInlineEdit(el) {
    if (el.type === 'formula') {
      editorApi.addFormula();
      return;
    }
    if (el.type === 'applet' && el.appletId === 'periodic') {
      editorApi.reselectPeriodicElement(el.id);
      return;
    }
    if (el.type === 'text' || el.type === 'shape') setEditingId(el.id);
    else if (el.type === 'markdown') editorApi.editMarkdown(el.id);
    else if (el.type === 'code') editorApi.editCode(el.id);
    else if (el.type === 'htmlframe') editorApi.openHtmlFrameModal();
  }

  /** v7.1 `_tblDragBorder`: 14px strips on the table edges — clear cell selection, drag the table. */
  function onTableStripDown(el, e) {
    if (drawing || el._isDecor) return;
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
    if (drawing || el._isDecor) return;
    if (el.type === 'inkhost') {
      e.stopPropagation();
      e.preventDefault();
      const additive = !!(e.shiftKey || e.ctrlKey || e.metaKey);
      editorApi.pickElement(el.id, { shift: additive });
      if (el.inkIds?.length) editorApi.pickInk(el.inkIds, { additive, keepObjectSel: true });
      movedRef.current = false;
      const pt = canvasPoint(e);
      if (pt && !additive) {
        inkDragRef.current = { px: pt[0], py: pt[1], lastX: pt[0], lastY: pt[1] };
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      return;
    }
    if (editingId && String(editingId) === String(el.id) && (el.type === 'text' || el.type === 'shape')) {
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
    if (e.detail >= 2) {
      startInlineEdit(el);
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
      nearCornerRot(viewEl, pt[0], pt[1])
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
      e.currentTarget.setPointerCapture?.(e.pointerId);
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
    };
    movedRef.current = false;
    bindDragWindowListeners(dragRef.current);
    e.currentTarget.setPointerCapture?.(e.pointerId);
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
      px: pt?.[0] || 0,
      py: pt?.[1] || 0,
    };
    movedRef.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
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
    e.currentTarget.setPointerCapture?.(e.pointerId);
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
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onCurveHandlePointerDown(handle, e) {
    if (!soleSelected || soleSelected.shape !== 'curve') return;
    e.stopPropagation();
    e.preventDefault();
    if (handle.kind === 'node') setCurveSelIdx(handle.idx);
    curveDragRef.current = {
      id: soleSelected.id,
      kind: handle.kind,
      idx: handle.idx,
      start: { ...soleSelected },
    };
    movedRef.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
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
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onGroupRotPointerDown(e) {
    if (!multiMembers || !groupBBox) return;
    if (multiMembers.some((el) => el.locked)) return;
    e.stopPropagation();
    e.preventDefault();
    const pt = canvasPoint(e);
    const cx = groupBBox.x + groupBBox.w / 2;
    const cy = groupBBox.y + groupBBox.h / 2;
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
    };
    movedRef.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
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

  const bandStyle = band
    ? {
        left: Math.min(band.x0, band.x1),
        top: Math.min(band.y0, band.y1),
        width: Math.abs(band.x1 - band.x0),
        height: Math.abs(band.y1 - band.y0),
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
        className={`react-canvas-viewport${drawing ? ' is-drawing' : ''}${showBrushCursor ? ' has-brush-cursor' : ''}`}
        ref={hostRef}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
        onPointerLeave={() => {
          if (!inkRef.current) setBrushCur(null);
        }}
        onPointerEnter={(e) => {
          if (showBrushCursor) setBrushCur({ x: e.clientX, y: e.clientY });
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
          className={`react-slide-stage${drawing ? ' is-drawing' : ''}`}
          data-icons-tick={iconsTick}
          onContextMenu={onStageContextMenu}
          style={{
            width: canvasW,
            height: canvasH,
            left: stageLeft,
            top: stageTop,
            transform: `scale(${scale})`,
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
                        strokeDasharray="4 3"
                        pointerEvents="none"
                      />
                      <line
                        x1={cps.p2.x}
                        y1={cps.p2.y}
                        x2={cps.cp2.x}
                        y2={cps.cp2.y}
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray="4 3"
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
                            hostRef.current?.setPointerCapture?.(e.pointerId);
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
                      r={7}
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
                        hostRef.current?.setPointerCapture?.(e.pointerId);
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
                if (el.type === 'shape') {
                  editorApi.patchElementHistory(el.id, { shapeHtml: html });
                  setEditingId(null);
                  return;
                }
                const text = String(html || '').replace(/<[^>]+>/g, '');
                if (textPlainIsBlank(html) && isLayoutTextPlaceholder(el)) {
                  const lang = useUiStore.getState().lang;
                  editorApi.patchElementHistory(el.id, restoreTextPlaceholderPatch(el, lang));
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
              onEditCell={(id, r, c) => {
                editorApi.pickElement(id);
                setEditingCell(`${id}:${r}:${c}`);
                setEditingId(null);
              }}
              onEndCellEdit={() => setEditingCell(null)}
              onCommitCell={(id, r, c, html) => {
                editorApi.patchTableCell(id, r, c, html);
                // Keep a cell that was just entered via Tab/Enter in edit mode.
                setEditingCell((cur) => (cur === `${id}:${r}:${c}` ? null : cur));
              }}
              cropActive={!!cropModeElId && String(cropModeElId) === String(el.id)}
              onNotesLive={(id, patch) => editorApi.patchNotesLive(id, patch)}
            />
            );
          })}
          {guideLines.map((g, i) => (
            <div
              key={`eg-${i}`}
              className={`react-guide-extra ${g.t === 'h' ? 'h' : 'v'}`}
              style={g.t === 'h' ? { top: g.pos } : { left: g.pos }}
            />
          ))}
          {snapGuides.map((g, i) => (
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
            />
          ) : null}
          {soleSelectedView &&
          !soleSelectedView.locked &&
          !(cropModeElId && String(cropModeElId) === String(soleSelectedView.id)) &&
          !(curveEditMode && soleSelectedView.shape === 'curve') &&
          soleSelectedView.shape !== 'line' &&
          soleSelectedView.type !== 'lineangle'
            ? resizeHandleCenters(soleSelectedView, RESIZE_HANDLES).map((h) => {
                const rot = elRotationDeg(soleSelectedView);
                return (
                  <div
                    key={h.id}
                    className="react-rh"
                    style={{
                      left: h.cx - 4,
                      top: h.cy - 4,
                      cursor: resizeHandleCursor(h.id, rot),
                    }}
                    onPointerDown={(e) => onResizePointerDown(h, e)}
                  />
                );
              })
            : null}
          {adjHandles.length && !(curveEditMode && soleSelected?.shape === 'curve')
            ? adjHandles.map((h) => (
                <div
                  key={h.id}
                  className={`react-adj-handle${h.square ? ' is-square' : ''}`}
                  title={h.title}
                  style={{ left: h.x, top: h.y, cursor: h.cursor }}
                  onPointerDown={(e) => onAdjPointerDown(h, e)}
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
                  strokeDasharray="3 2"
                />
              ))}
            </svg>
          ) : null}
          {curveEditMode
            ? curveOverlay.nodes.map((h) => (
                <div
                  key={h.id}
                  className={`react-curve-handle is-node${h.selected ? ' is-sel' : ''}`}
                  title={h.title}
                  style={{ left: h.x, top: h.y }}
                  onPointerDown={(e) => onCurveHandlePointerDown(h, e)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const pts = soleSelected.curvePoints || defaultCurvePoints();
                    const next = toggleCurveNodeType(pts, h.idx, !!soleSelected.curveClosed);
                    editorApi.patchElementHistory(soleSelected.id, { curvePoints: next });
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
                <span className="react-group-label">Группа</span>
              </div>
              <div
                className="react-group-rot"
                title="Rotate"
                style={{
                  left: groupBBox.x + groupBBox.w / 2 - 6,
                  top: groupBBox.y - 28,
                }}
                onPointerDown={onGroupRotPointerDown}
              />
              {RESIZE_HANDLES.map((h) => {
                const bx = groupBBox.x;
                const by = groupBBox.y;
                const bw = groupBBox.w;
                const bh = groupBBox.h;
                const left = h.dx < 0 ? bx - 4 : h.dx > 0 ? bx + bw - 4 : bx + bw / 2 - 4;
                const top = h.dy < 0 ? by - 4 : h.dy > 0 ? by + bh - 4 : by + bh / 2 - 4;
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
          {bandStyle ? <div className="react-rubberband" style={bandStyle} /> : null}
          <CameraOverlay />
          <MotionOverlay />
        </div>
        </div>
      </div>
    </div>
  );
}

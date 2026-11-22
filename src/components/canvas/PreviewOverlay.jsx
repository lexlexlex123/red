import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { usePresentationStore } from '../../stores/presentationStore';
import { useUiStore } from '../../stores/uiStore';
import { arLayoutKey, resolveDeckForAr } from '../../editor/arLayout.js';
import { buildBasicShapeSVG, shapeOptsFromEl, shapeRxPx } from '../../shared/shapes.js';
import { shapeNeedsOverflowVisible } from '../../shared/shapesCatalog.js';
import { shapeBlurOverlayStyle, shapeBlurPx } from '../../editor/shapeBlur.js';
import { shapeTextBoxStyle } from '../../editor/shapeText.js';
import { formulaTagLabelOf } from '../../editor/formulaLayout.js';
import { versionAttr } from '../../editor/versions.js';
import { HsvWheel } from '../ui/ColorField.jsx';
import { effectiveTrans, effectiveTransDur, enterClass, exitClass } from '../../editor/transitions.js';
import { elHasInlineLink, readGroupLink, resolveSlideLinkIndex } from '../../editor/links.js';
import {
  animCssClass,
  animDuration,
  collectSlidePlaybackSteps,
  isEntranceAnim,
  isExitAnim,
  isLiveAnim,
  stepFromAnim,
} from '../../editor/anims.js';
import { isSlideHidden, nextVisibleSlideIndex, nextVisibleSlideLooped, visibleSlideIndices } from '../../editor/slideVisibility.js';
import {
  closePresenterWindow,
  makePresenterState,
  postPresenter,
  subscribePresenter,
} from '../../editor/presenterChannel.js';
import { getLiveScreenByKey, isMultiScreenNow, openPresenterForShow } from '../../editor/displayScreens.js';
import { resolveNavTargetSlideIndex } from '../../editor/slideTitles.js';
import { isPulseFamilyAnim, pulseCssIteration, pulseIsInfinite, pulseWaitMs } from '../../editor/pulsePlay.js';
import { hoverMotionStyle, hoverTargetIdAt, opaqueElAt, isImgColorHoverPreset } from '../../editor/hoverFx.js';
import { elBoxTransform } from '../../editor/elTransform.js';
import { connectorPathFor, connectorDashArray, connectorMarkerUrl, connectorsMarkerDefsSvg, connectorLinecap, connectorsAnimStyleCss, connectorAnimStyle, startRideAnim, collectSlideRideSpecs, resolveConnectorStroke } from '../../editor/connectors.js';
import { inkStrokeSvgMarkup } from '../../editor/inkRender.js';
import { inkFillsSvgMarkup } from '../../editor/inkFill.js';
import { hostedInkIdSet, inkHostInnerMarkup } from '../../editor/inkHost.js';
import { getIconById, onIconsReady } from '../../editor/iconsLazy.js';
import { iconAnimEnabled } from '../../editor/iconAnim.js';
import AnimatedIcon from './AnimatedIcon.jsx';
import { getTableCell, tableCellBg, tableCellFontStyle, tableCellRadiusStyle, tableColWidthsPx, tableRowHeightsPx } from '../../editor/tableCells.js';
import { tableCellBorderStyle } from '../../editor/tableBorders.js';
import { getTheme, resolveElTextColor, resolveSchemeColor } from '../../editor/themes.js';
import { buildChartSvg, chartWrapStyle } from '../../editor/tableChart.js';
import { DEFAULT_TEXT_FONT_FAMILY, elementFontFamily, parseCsNumber } from '../../editor/fonts.js';
import { underlineBoxProps, prepareTextUnderlineHtml } from '../../editor/textUnderline.js';
import { imageRenderStyles, normImgFrame, imgBorderSvgMarkup, imgRibbonTapeStyle, imgRibbonTapeMarkup, polaroidCaptionStyle } from '../../editor/imgStyles.js';
import {
  imageHasCrop,
  imageShowsUncrop,
  isUncropAnim,
  isUncropHoverPreset,
  uncropWindowStyles,
} from '../../editor/imgUncrop.js';
import { resolveMediaSrc } from '../../editor/mediaStore.js';
import {
  audioPlayerHostStyle,
  playMediaEl,
  stopMediaPool,
  shouldPlayAudioOnElClick,
  slideAudiosForMode,
  openFullscreenVideo,
  isFullscreenVideo,
} from '../../editor/mediaPlay.js';
import ThemedAudioPlayer from './ThemedAudioPlayer.jsx';
import {
  fireCameraAnim,
  fullSlideCam,
  cameraCssTransform,
  applyCameraTransform,
} from '../../editor/camera.js';
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
import { buildLineAngleContent } from '../../editor/lineAngle.js';
import { fireMotionAnim, isMotionAnim, clearMotionTransforms } from '../../editor/motionPlay.js';
import {
  animEasingCss,
  moveToDelta,
  orbitRadius,
  pathEndDelta,
  pathPtsOf,
  samplePathFrames,
} from '../../editor/motionGeom.js';
import {
  fireRecolorAnim,
  isRecolorAnim,
  prepareRecolorEl,
  recolorReactFilter,
  clearRecolorTransforms,
} from '../../editor/recolorPlay.js';
import { fireTypewriterAnim, isTypewriterAnim } from '../../editor/typewriterPlay.js';
import { fireTransformAnim, isTransformAnim, snapshotTransformProps } from '../../editor/transformPlay.js';
import { fireLangFadeAnim, isLangFadeAnim } from '../../editor/langFadePlay.js';
import { fireSplitHalfAnim, isSplitHalfAnim, clearSplitHalf } from '../../editor/splitHalfPlay.js';
import { fireCaptionSlideAnim, isCaptionSlideAnim } from '../../editor/captionSlidePlay.js';
import { fireCosmosTitleForEl, isCosmosTitleAnim, clearCosmosTitle } from '../../editor/cosmosTitlePlay.js';
import { fireParticlesAnim, isParticlesAnim, clearParticles } from '../../editor/particlesPlay.js';
import { fireInkDrawAnim, isInkDrawAnim, clearInkDraw } from '../../editor/inkDrawPlay.js';
import {
  fireFloatAnim,
  isFloatAnim,
  clearFloat,
  floatAnimForRepeatCycle,
  floatFramesForGroup,
  floatWaitMsForPlayback,
} from '../../editor/floatPlay.js';
import {
  resetCounterGroupVals,
  setCounterGroupVal,
  shouldStartTimerOnElClick,
  slideTimersForMode,
  startTimerElInRoot,
  startTimersInRoot,
  timerStartMode,
} from '../../editor/applets.js';
import {
  resolveAppletAnimRef,
} from '../../editor/appletOnEnd.js';
import {
  fireDanceAnim,
  isDanceAnim,
  clearDance,
  danceAnimForRepeatCycle,
  danceWaitMsForPlayback,
} from '../../editor/dancePlay.js';
import {
  fireSwingAnim,
  isSwingAnim,
  clearSwing,
  swingAnimForRepeatCycle,
  swingWaitMsForPlayback,
} from '../../editor/swingPlay.js';
import Model3dView from './Model3dView.jsx';
import AppletView from './AppletView.jsx';
import DecorGlView from './DecorGlView.jsx';
import DecorSvgHost from './DecorSvgHost.jsx';
import { attachDecorGlCfg, decorUsesGl } from '../../editor/layouts.js';
import { buildLegoSvg } from '../../editor/lego.js';
import { hasTextBg, textBgLayerStyle, textColorGradStyle } from '../../editor/textBg.js';
import { textBorderBoxStyle, textBorderSvgMarkup, needsTextBorderOverflow } from '../../editor/textBorder.js';
import { textGlyphShadowStyle, textBlockShadowStyle, textNeedsOverflowVisible } from '../../editor/textShadow.js';
import { textPadCss } from '../../editor/textPad.js';
import { textBorderRadiusCss } from '../../editor/textRadius.js';
import { shapeTextWarpCss } from '../../editor/shapeText.js';
import { textAlignSelf } from '../../editor/textAlign.js';
import SlideBgImgLayer from './SlideBgImgLayer.jsx';
import { morphMatchKey, morphEligible, lerpHexColor, lerpMorphEl, morphGeomDirty } from '../../editor/morphPlay.js';
import { slideSolidBg } from '../../editor/slideBgImg.js';
import {
  findClassificationApplet,
  classificationMovableIds,
  shuffleClassificationPositions,
  checkClassification,
  clampClassificationPos,
  classificationGuideLines,
  snapTranslateToClassGuides,
  postClassificationBtnMode,
  CLASSIFICATION_DEFAULTS,
} from '../../editor/classificationApplet.js';
import {
  findImageSortApplet,
  getImageSortMarkers,
  imageSortOptionList,
  shuffleImageSortOptions,
  checkImageSort,
  postImageSortBtnMode,
  normalizeImageSortAnswer,
  imageSortAnswerKey,
  IMAGE_SORT_DEFAULTS,
} from '../../editor/imageSortApplet.js';
import ImageSortMarkersLayer from './ImageSortMarkersLayer.jsx';

// Morph helper: plain text content comparison
function morphPlainText(d) {
  if (!d || d.type !== 'text') return null;
  const tmp = document.createElement('div');
  tmp.innerHTML = d.html || '';
  return (tmp.textContent || '').trim().replace(/\s+/g, ' ');
}

function morphTextBlocksMatch(fd, td) {
  if (!fd || !td || fd.type !== 'text' || td.type !== 'text') return false;
  const hasLink = (fd.morphName && String(fd.morphName).trim()) || (td.morphName && String(td.morphName).trim());
  if (hasLink) return false;
  const a = morphPlainText(fd), b = morphPlainText(td);
  return a !== null && b !== null && a !== b;
}

function isSpecialAnim(name) {
  return (
    isMotionAnim(name) ||
    isRecolorAnim(name) ||
    isTypewriterAnim(name) ||
    isTransformAnim(name) ||
    isLangFadeAnim(name) ||
    isSplitHalfAnim(name) ||
    isCaptionSlideAnim(name) ||
    isCosmosTitleAnim(name) ||
    isParticlesAnim(name) ||
    isInkDrawAnim(name) ||
    isFloatAnim(name) ||
    isDanceAnim(name) ||
    isSwingAnim(name) ||
    isUncropAnim(name)
  );
}

function previewElIsInteractive(el, slide) {
  if (!el || el._isDecor) return false;
  if (el.link || elHasInlineLink(el)) return true;
  if (el.hoverFx && el.hoverFx.enabled) return true;
  // Audio chrome owns clicks (play/pause/seek) — must not bubble as «click slide».
  if (el.type === 'mediaaudio') return true;
  if (
    el.type === 'applet' &&
    (el.appletId === 'flip' ||
      el.appletId === 'counter' ||
      el.appletId === 'classification' ||
      el.appletId === 'imagesort' ||
      // Timer with click-el can start on self-click when no other trigger is set.
      (el.appletId === 'timer' && timerStartMode(el) === 'click-el'))
  ) {
    return true;
  }
  if (el.type === 'mediavideo' && isFullscreenVideo(el)) return true;
  const anims = el.anims || [];
  if (anims.some((a) => a && (a.trigger === 'element' || a.trigger === 'nav' || a.isTrigger))) return true;
  const id = String(el.id);
  return (slide?.els || []).some((o) => {
    if (!o || o._isDecor) return false;
    if (shouldPlayAudioOnElClick(o, id)) return true;
    if (shouldStartTimerOnElClick(o, id)) return true;
    return (o.anims || []).some((a) => {
      if (!a) return false;
      if (String(a.triggerElId) === id || String(a.preNavTriggerElId || '') === id) return true;
      if ((a.maTriggerElIds || []).map(String).includes(id)) return true;
      return false;
    });
  });
}

function PreviewImageBody({ el, showUncrop, uncropArmed, uncropDur, colorHover, hoverFilter }) {
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const rs = imageRenderStyles(el, {
    colorHover,
    canvasW,
    canvasH,
    transition: el.hoverFx?.enabled ? `filter ${Math.max(0.05, +(el.hoverFx?.dur || 0.3))}s ease` : undefined,
  });
  const win = imageHasCrop(el) ? uncropWindowStyles(el, showUncrop, uncropArmed ? uncropDur : 0) : null;
  const frame = normImgFrame(el.imgFrame);
  const borderSvg = frame === 'none' ? imgBorderSvgMarkup(el) : '';
  return (
    <div
      style={{
        ...rs.box,
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: borderSvg || imageHasCrop(el) ? 'visible' : undefined,
      }}
      className={rs.frameClass}
    >
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
          ...(win
            ? win.inner
            : // Polaroid: keep relative fill inside rs.box padding (same as editor/export).
              // Absolute + inset + width/height 100% overflows the photo well.
              frame === 'polaroid'
              ? null
              : {
                  position: 'absolute',
                  inset: 0,
                }),
          ...(hoverFilter
            ? { filter: [rs.inner.filter, hoverFilter].filter(Boolean).join(' ') }
            : null),
        }}
      >
        <img alt="" src={el.src} style={{ ...rs.img, ...(win ? win.img : null), pointerEvents: showUncrop ? 'auto' : 'none' }} />
      </div>
      {borderSvg ? (
        <div
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
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
      {frame === 'polaroid' && el.imgCaption ? (
        <div className="react-img-polaroid-cap" style={polaroidCaptionStyle(el, canvasW, canvasH)}>
          {el.imgCaption}
        </div>
      ) : null}
    </div>
  );
}

function composeMotionTransform(el, motionTx, motionTy, extra) {
  const parts = [];
  const tx = +(motionTx || 0);
  const ty = +(motionTy || 0);
  if (tx || ty) parts.push(`translate(${tx}px, ${ty}px)`);
  const base = elBoxTransform(el);
  if (base) parts.push(base);
  if (extra) parts.push(extra);
  return parts.length ? parts.join(' ') : undefined;
}

function HoverWrap({
  el,
  link,
  hidden,
  playing,
  live,
  justify,
  animDur,
  animIter,
  onElClick,
  interactive,
  backdrop,
  zIndex,
  recolorDone,
  recolorPlaying,
  uncropDone,
  motionTx,
  motionTy,
  motionPlaying,
  particles,
  hovered: hoveredProp,
  classMovable,
  onClassPointerDown,
  children,
}) {
  const hfxOn = !!(el.hoverFx && el.hoverFx.enabled);
  const hovered = hfxOn && !!hoveredProp;
  const hfx = hfxOn ? hoverMotionStyle(el, el.hoverFx, hovered) : null;
  const hideVis = !!hidden || !!particles;
  const showUncrop = imageShowsUncrop(el, {
    hovered,
    preset: el.hoverFx?.preset,
    uncropDone,
  });
  const uncropArmed =
    imageHasCrop(el) && (isUncropHoverPreset(el.hoverFx?.preset) || uncropDone || showUncrop);
  const uncropDur =
    uncropDone && animDur
      ? (+animDur || 400) / 1000
      : el.hoverFx?.dur != null
        ? +el.hoverFx.dur
        : 0.3;
  const mtx = +(motionTx || 0);
  const mty = +(motionTy || 0);
  // Motion offset is ONLY left/top via motionTx/Ty. Never put translate into transform —
  // WAAPI transform fought React and often animated only the group leader.
  const inMotion = !!motionPlaying;
  const motionXf = elBoxTransform(el);
  // backdrop-filter dies under opacity animations — keep bg outside entrance anim only.
  const isExitCls =
    !!playing &&
    (playing.includes('fadeout') || playing.includes('slideout') || playing.includes('zoomout'));
  const splitAnim = !!(backdrop && playing && !isExitCls);
  const frameChrome =
    el.type === 'image' &&
    (normImgFrame(el.imgFrame) === 'ribbon' || normImgFrame(el.imgFrame) === 'polaroid');
  const hfxWrap = frameChrome && hfx ? { ...hfx, filter: undefined } : hfx;
  const style = {
    position: 'absolute',
    left: (el.x || 0) + mtx,
    top: (el.y || 0) + mty,
    // Avoid CSS transitions fighting the rAF motion tween.
    transition: inMotion ? 'none' : undefined,
    width: el.w || 100,
    height: el.h || 60,
    // Explicit z-index matching the element's stacking order in the slide data. Without this,
    // paint order relies on plain DOM order — which elements with a `filter` (drop-shadow) or
    // that render as an <iframe> (HTML/code blocks) don't reliably respect in every browser,
    // since both create their own compositing surface. This pins the intended layering so
    // shadowed elements and HTML/code blocks always stack the same as in the editor.
    zIndex: zIndex != null ? zIndex : undefined,
    opacity: hideVis
      ? 0
      : readMorphFx(el.id)?.opacity != null
        ? readMorphFx(el.id).opacity
        : el.elOpacity != null
          ? el.elOpacity
          : 1,
    filter:
      readMorphFx(el.id)?.filter != null
        ? readMorphFx(el.id).filter
        : recolorReactFilter(elFilterCss(el), el.id, '#000000', { recolorDone, recolorPlaying }, el),
    overflow:
      el.type === 'icon' ||
      live ||
      uncropArmed ||
      imageHasCrop(el) ||
      frameChrome ||
      shapeNeedsOverflowVisible(el.shape, el) ||
      needsTextBorderOverflow(el) ||
      textNeedsOverflowVisible(el) ||
      (el.type === 'text' && Array.isArray(el.shapePts) && el.shapePts.length >= 3)
        ? 'visible'
        : 'hidden',
    cursor: classMovable ? 'grab' : el.type === 'model3d' ? 'grab' : interactive ? 'pointer' : 'default',
    touchAction: classMovable || el.type === 'model3d' ? 'none' : undefined,
    // Hover accent for show mode (inline <a> may also set --sf-link-hover on itself).
    ...(el.linkHover || el.link
      ? { ['--sf-link-hover']: el.linkHover || '#93c5fd' }
      : elHasInlineLink(el)
        ? { ['--sf-link-hover']: '#93c5fd' }
        : null),
    visibility: hideVis ? 'hidden' : 'visible',
    animationDuration: !splitAnim && animDur ? `${animDur}ms` : undefined,
    animationIterationCount: !splitAnim ? animIter || undefined : undefined,
    display: el.type === 'text' || el.type === 'formula' ? 'flex' : undefined,
    alignItems: el.type === 'text' || el.type === 'formula' ? justify : undefined,
    // The text background layer (`backdrop`, rendered as a sibling of `children` below, not
    // nested inside it) relies on `border-radius: inherit` — needs the radius set here on
    // its actual parent, or it just inherits nothing and renders square-cornered even though
    // the text content div right next to it has the correct rounded corners.
    borderRadius: el.type === 'text' ? textBorderRadiusCss(el) : undefined,
    ...(el.type === 'graph' ? { borderRadius: el.graphRadius ?? 16 } : {}),
    transform: motionXf,
    // Keep authored rotate/flip under CSS entrance keyframes (see App.css --el-xf).
    ...(motionXf ? { ['--el-xf']: motionXf } : null),
    ...hfxWrap,
  };
  if (hfxWrap?.transform) {
    style.transform = hfxWrap.transform;
    style['--el-xf'] = hfxWrap.transform;
  } else {
    style.transform = motionXf;
    if (motionXf) style['--el-xf'] = motionXf;
  }
  if (hfx?.filter && !frameChrome) {
    const merged = [elFilterCss(el), hfx.filter].filter(Boolean).join(' ');
    style.filter = recolorReactFilter(merged, el.id, '#000000', { recolorDone, recolorPlaying }, el);
  }
  if (hfx?.opacity != null && !hideVis) style.opacity = hfx.opacity;
  if (showUncrop) style.zIndex = 24;

  let kids = children;
  if (el.type === 'image' && React.isValidElement(children)) {
    kids = React.cloneElement(children, {
      showUncrop,
      uncropArmed,
      uncropDur,
      colorHover: hfxOn && hovered && isImgColorHoverPreset(el.hoverFx?.preset),
      hoverFilter: frameChrome ? hfx?.filter : undefined,
    });
  }
  if (React.isValidElement(kids) && hfx && (hfx.color || hfx.background || hfx.border)) {
    kids = React.cloneElement(kids, {
        style: {
          ...(kids.props.style || {}),
          color: hfx.color || kids.props.style?.color,
          background: hfx.background || kids.props.style?.background,
          border: hfx.border || kids.props.style?.border,
        },
      });
  }

  const animInnerStyle = splitAnim
    ? {
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: justify,
        animationDuration: animDur ? `${animDur}ms` : undefined,
        animationIterationCount: animIter || undefined,
        boxSizing: 'border-box',
      }
    : null;

  return (
    <div
      data-id={el.id}
      data-gid={el.groupId != null && el.groupId !== '' ? String(el.groupId) : undefined}
      className={`react-el${!splitAnim && playing ? ` ${playing}` : ''}${hfxOn ? ' has-hover-fx' : ''}${el.textRole === 'toc' ? ' has-toc' : ''}${particles ? ' has-particles' : ''}`}
      style={style}
      data-hfx-hit={hfxOn ? '1' : undefined}
      onPointerDown={
        classMovable
          ? (e) => {
              onClassPointerDown?.(e, el);
            }
          : undefined
      }
      onClick={(e) => {
        const toc = e.target?.closest?.('[data-toc-slide]');
        if (toc) {
          e.stopPropagation();
          const si = +toc.getAttribute('data-toc-slide');
          if (Number.isFinite(si)) onElClick?.(el, `#slide-${si + 1}`);
          return;
        }
        // Inline hyperlink inside text / table cell — take precedence over object link.
        const inlineA = e.target?.closest?.('a[href]');
        if (inlineA && e.currentTarget.contains(inlineA)) {
          e.preventDefault();
          e.stopPropagation();
          onElClick?.(el, inlineA.getAttribute('href') || null, {
            linkt: inlineA.getAttribute('target') || '_blank',
            inline: true,
          });
          return;
        }
        if (el.type === 'applet') {
          e.stopPropagation();
          // Counters/flips handle their own iframe clicks; still forward so
          // timer click-el / object triggers on applets can fire.
          if (interactive) onElClick?.(el, link || null);
          return;
        }
        // Audio chrome owns play/pause/seek — never bubble as slide click.
        if (el.type === 'mediaaudio' || e.target?.closest?.('.react-el-audio,[data-audio-player],.react-themed-audio')) {
          e.stopPropagation();
          return;
        }
        // OBJ drag-rotate owns the gesture — never advance the slide.
        if (el.type === 'model3d' || e.target?.closest?.('.react-el-model3d,[data-model3d-viewer]')) {
          e.stopPropagation();
          return;
        }
        if (classMovable) {
          e.stopPropagation();
          return;
        }
        if (interactive) {
          e.stopPropagation();
          onElClick?.(el, link || null);
          return;
        }
      }}
    >
      {backdrop || null}
      {splitAnim ? (
        <div className={playing || undefined} style={animInnerStyle}>
          {kids}
        </div>
      ) : (
        kids
      )}
    </div>
  );
}

function isDocFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function exitDocFullscreen() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen;
  if (!fn || !isDocFullscreen()) return;
  try {
    const p = fn.call(document);
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (e) {}
}

function requestElFullscreen(el) {
  if (!el) return Promise.reject(new Error('no el'));
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return Promise.reject(new Error('no fs'));
  const key = useUiStore.getState().presShowScreenKey;
  const live = key ? getLiveScreenByKey(key) : null;
  if (live && el.requestFullscreen) {
    return Promise.resolve(el.requestFullscreen({ screen: live })).catch(() => Promise.resolve(req.call(el)));
  }
  return Promise.resolve(req.call(el));
}

/** Copy the painted look onto a clone and kill CSS animations so they do not restart at 100%. */
function freezeClonedStage(sourceRoot, cloneRoot) {
  if (!sourceRoot || !cloneRoot) return;
  const walk = (src, dst) => {
    if (!src || !dst || src.nodeType !== 1 || dst.nodeType !== 1) return;
    try {
      const cs = getComputedStyle(src);
      dst.style.opacity = cs.opacity;
      dst.style.visibility = cs.visibility;
      dst.style.animation = 'none';
      dst.style.animationName = 'none';
    } catch (e) {}
    const sc = src.children;
    const dc = dst.children;
    const n = Math.min(sc.length, dc.length);
    for (let i = 0; i < n; i++) walk(sc[i], dc[i]);
  };
  walk(sourceRoot, cloneRoot);
}

function paintedNodeOpacity(node) {
  if (!node) return 1;
  try {
    const cs = getComputedStyle(node);
    if (cs.visibility === 'hidden' || cs.visibility === 'collapse') return 0;
    const op = parseFloat(cs.opacity);
    return Number.isFinite(op) ? Math.min(1, Math.max(0, op)) : 1;
  } catch (e) {
    return 1;
  }
}

/** Live morph opacity / blur so React re-renders keep the interpolated look. */
const morphFxLive = new Map();

function readMorphFx(id) {
  if (id == null) return null;
  return morphFxLive.get(String(id)) || null;
}

function writeMorphFx(id, patch) {
  if (id == null) return;
  const key = String(id);
  morphFxLive.set(key, { ...(morphFxLive.get(key) || {}), ...patch });
}

function clearMorphFx(id) {
  if (id == null) return;
  morphFxLive.delete(String(id));
}

function morphElOpacity(d) {
  if (!d) return 1;
  if (d.type === 'image' && d.imgOpacity != null) return Math.max(0, Math.min(1, +d.imgOpacity));
  return d.elOpacity != null ? Math.max(0, Math.min(1, +d.elOpacity)) : 1;
}

function morphLayerBlurPx(d) {
  if (!d) return 0;
  if (d.type === 'shape') return Math.max(0, +(d.shapeBlur || 0));
  if (d.type === 'text' || d.type === 'markdown') return Math.max(0, +(d.textBgBlur || 0));
  if (d.type === 'table') return Math.max(0, +(d.tableBgBlur || d.blur || 0));
  return 0;
}

/**
 * Chromium snaps `backdrop-filter` near 0. When either endpoint is clear, keep a fixed
 * peak radius and fade overlay opacity instead — reads as a smooth frost in/out.
 * When both sides have blur, lerp the radius (geometry pad stays at the peak).
 */
function morphLayerBlurPaint(fromB, toB, ease) {
  const a = Math.max(0, +fromB || 0);
  const b = Math.max(0, +toB || 0);
  const cur = a + (b - a) * ease;
  const peak = Math.max(a, b, 0.001);
  const crossesZero = a < 0.01 || b < 0.01;
  return {
    cur,
    peak,
    crossesZero,
    filterBlur: crossesZero ? peak : Math.max(cur, 0.001),
    opacity: crossesZero ? Math.max(0, Math.min(1, cur / peak)) : 1,
  };
}

/** CSS `filter: blur()` from the color-bar slider (images / icons / leftover table blur). */
function morphCssBlurPx(d) {
  if (!d) return 0;
  if (d.type === 'shape' || d.type === 'text' || d.type === 'markdown') return 0;
  if (d.type === 'table' && +(d.tableBgBlur || 0) > 0) return 0;
  return Math.max(0, +(d.blur || 0));
}

function elWithMorphLayerBlur(el) {
  const fx = readMorphFx(el?.id);
  if (!el || fx?.layerBlur == null) return el;
  // Geometry / mask pad must stay on the peak so the frost region doesn't jump each frame.
  const peak = fx.layerBlurPeak != null ? fx.layerBlurPeak : fx.layerBlur;
  if (el.type === 'shape') return { ...el, shapeBlur: peak };
  if (el.type === 'text' || el.type === 'markdown') return { ...el, textBgBlur: peak };
  if (el.type === 'table') return { ...el, tableBgBlur: peak };
  return el;
}

function paintBackdropBlur(overlay, style, blurPx, opacity) {
  if (!overlay) return;
  if (style) {
    overlay.style.position = style.position || 'absolute';
    if (style.top != null) overlay.style.top = typeof style.top === 'number' ? `${style.top}px` : style.top;
    if (style.left != null) overlay.style.left = typeof style.left === 'number' ? `${style.left}px` : style.left;
    if (style.width != null) overlay.style.width = typeof style.width === 'number' ? `${style.width}px` : style.width;
    if (style.height != null) overlay.style.height = typeof style.height === 'number' ? `${style.height}px` : style.height;
    if (style.inset != null) overlay.style.inset = style.inset;
    if (style.zIndex != null) overlay.style.zIndex = String(style.zIndex);
    overlay.style.pointerEvents = 'none';
    if (style.clipPath) overlay.style.clipPath = style.clipPath;
    if (style.WebkitClipPath) overlay.style.webkitClipPath = style.WebkitClipPath;
    if (style.maskImage) overlay.style.maskImage = style.maskImage;
    if (style.WebkitMaskImage) overlay.style.webkitMaskImage = style.WebkitMaskImage;
    if (style.maskSize) overlay.style.maskSize = style.maskSize;
    if (style.WebkitMaskSize) overlay.style.webkitMaskSize = style.WebkitMaskSize;
    if (style.maskRepeat) overlay.style.maskRepeat = style.maskRepeat;
    if (style.WebkitMaskRepeat) overlay.style.webkitMaskRepeat = style.WebkitMaskRepeat;
    if (style.borderRadius) overlay.style.borderRadius = style.borderRadius;
    if (style.background) overlay.style.background = style.background;
  }
  const css = blurPx > 0.01 ? `blur(${blurPx}px)` : 'none';
  overlay.style.backdropFilter = css;
  overlay.style.webkitBackdropFilter = css;
  if (opacity != null) overlay.style.opacity = String(Math.max(0, Math.min(1, +opacity)));
}

function ensureBlurOverlay(host, className) {
  if (!host) return null;
  let overlay =
    host.querySelector(`:scope > .${className}`) ||
    host.querySelector(':scope > [data-morph-blur="1"]') ||
    [...host.children].find(
      (c) => c.getAttribute('aria-hidden') === 'true' && !c.classList.contains('react-shape-text')
    );
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.dataset.morphBlur = '1';
    host.insertBefore(overlay, host.firstChild);
  }
  overlay.classList.add(className);
  return overlay;
}

function SlidePreview({
  slide,
  slideKey = 0,
  canvasW,
  canvasH,
  onElClick,
  animState,
  stageRef,
  vpW,
  vpH,
  classLivePos,
  classMovableIds,
  onClassPointerDown,
  imageSortChoices = null,
  imageSortPickId = null,
  imageSortHints = null,
  onImageSortPick = null,
  onImageSortSuppressNav = null,
}) {
  const scale = Math.min((vpW || window.innerWidth) / canvasW, (vpH || window.innerHeight) / canvasH);
  const els = slide.els || [];
  const [hfxHoverId, setHfxHoverId] = useState(null);

  // Seed fit transform before paint. Do not put transform in React `style` — camera
  // writes it on the DOM; React would overwrite and flash white.
  useLayoutEffect(() => {
    const node = stageRef?.current;
    if (!node) return;
    const ctl = node._camCtl;
    // Only skip while a camera is mid-flight. A finished ctl used to keep
    // `aborted===false` forever and blocked fit updates → stage stuck smaller
    // than the outer wrapper (slide tucked in the top-left with black bars).
    if (ctl && !ctl.aborted && !ctl.finished) {
      ctl.fit = scale;
      const cam = node._pvCamState || fullSlideCam(canvasW, canvasH);
      applyCameraTransform(node, cam, scale, canvasW, canvasH);
      return;
    }
    const cam = node._pvCamState || fullSlideCam(canvasW, canvasH);
    applyCameraTransform(node, cam, scale, canvasW, canvasH);
  }, [stageRef, canvasW, canvasH, scale, slideKey]);

  function wrap(el, node, backdrop) {
    const link = readGroupLink(el, els, 'link');
    const st = animState?.[el.id] ?? animState?.[String(el.id)];
    const hidden = st?.hidden;
    const playing = st?.cls;
    // Els are already in z-order (their array position IS the stacking order) — pin it as an
    // explicit z-index rather than relying on paint order (see the comment on `style.zIndex`
    // in HoverWrap for why that isn't reliable for shadowed/iframe elements).
    const zIndex = els.indexOf(el) + 1;
    const live =
      st?.live ||
      (playing && (playing.includes('dance') || playing.includes('swing') || playing.includes('float')));
    const valign = el.valign || (el.type === 'formula' ? 'middle' : 'top');
    const justify =
      valign === 'middle' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start';
    const animIter =
      playing && (playing.includes('pulse') || playing.includes('shake') || playing.includes('flash'))
        ? pulseCssIteration({ swingCount: st?.swingCount != null ? st.swingCount : 1 })
        : undefined;
    const movable = !!(classMovableIds && classMovableIds.has(String(el.id)));
    const livePos =
      classLivePos && (classLivePos[String(el.id)] || classLivePos[el.id]);
    const elDisp = livePos ? { ...el, x: livePos.x, y: livePos.y } : el;
    return (
      <HoverWrap
        key={el.id}
        el={elDisp}
        hovered={hfxHoverId === String(el.id)}
        link={link}
        hidden={hidden}
        playing={playing}
        live={live}
        justify={justify}
        animDur={st?.dur}
        animIter={animIter}
        interactive={previewElIsInteractive(el, slide) || !!link || movable}
        onElClick={onElClick}
        backdrop={backdrop || null}
        zIndex={movable ? Math.max(zIndex, els.length + 2) : zIndex}
        recolorDone={!!st?.recolorDone}
        recolorPlaying={!!st?.recolorPlaying}
        uncropDone={!!st?.uncropDone}
        motionTx={st?.motionTx}
        motionTy={st?.motionTy}
        motionPlaying={!!st?.motionPlaying}
        particles={!!st?.particles}
        classMovable={movable}
        onClassPointerDown={onClassPointerDown}
      >
        {node}
      </HoverWrap>
    );
  }

  return (
    <div
      style={{
        width: canvasW * scale,
        height: canvasH * scale,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        ref={stageRef}
        className="preview-slide"
        style={{
          width: canvasW,
          height: canvasH,
          // Never set transform from React — it clears fireCameraAnim's inline value.
          transformOrigin: 'top left',
          background: slideSolidBg(slide),
          overflow: 'hidden',
          position: 'absolute',
          left: 0,
          top: 0,
        }}
        onMouseMove={(e) => {
          const root = stageRef?.current || e.currentTarget;
          const id = hoverTargetIdAt(els, root, e.clientX, e.clientY);
          setHfxHoverId((prev) => (prev === id ? prev : id));
        }}
        onMouseLeave={() => setHfxHoverId(null)}
      >
      <SlideBgImgLayer slide={slide} canvasW={canvasW} canvasH={canvasH} />
      {(() => {
        const hosted = hostedInkIdSet(slide);
        const freeFills = (slide.inkFills || []).filter((f) => f && !hosted.has(String(f.id)));
        const freeInk = (slide.ink || []).filter((s) => s && !hosted.has(String(s.id)));
        if (!freeFills.length && !freeInk.length) return null;
        return (
          <svg
            className="react-ink-layer"
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
            aria-hidden="true"
          >
            {freeFills.length ? (
              <g dangerouslySetInnerHTML={{ __html: inkFillsSvgMarkup(freeFills) }} />
            ) : null}
            {freeInk.length ? (
              <g
                dangerouslySetInnerHTML={{
                  __html: freeInk.map((st) => inkStrokeSvgMarkup(st)).filter(Boolean).join(''),
                }}
              />
            ) : null}
          </svg>
        );
      })()}
      {(() => {
        const animCss = connectorsAnimStyleCss(slide.connectors || []);
        return animCss ? <style data-conn-anim-pv="1">{animCss}</style> : null;
      })()}
      <svg
        className="react-conn-layer"
        viewBox={`0 0 ${canvasW} ${canvasH}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        aria-hidden="true"
      >
            <defs
              dangerouslySetInnerHTML={{
                __html: (() => {
                  const conns = slide.connectors || [];
                  return connectorsMarkerDefsSvg(conns, 'pv');
                })(),
              }}
            />
            {(slide.connectors || []).map((conn) => {
              if (conn.objHidden) return null;
              const d = connectorPathFor(conn, els);
              if (!d) return null;
              const sw = conn.sw != null ? conn.sw : 2;
              const fromType = conn.fromMarker || 'none';
              const toType = conn.toMarker || 'none';
              const strokeCol = resolveConnectorStroke(conn, null);
              if (strokeCol === 'none') return null;
              return (
                <path
                  key={conn.id}
                  d={d}
                  fill="none"
                  stroke={strokeCol}
                  strokeWidth={sw}
                  strokeLinecap={connectorLinecap(conn.dash, fromType, toType)}
                  strokeLinejoin="round"
                  strokeDasharray={connectorDashArray(conn.dash, sw)}
                  markerStart={connectorMarkerUrl('start', fromType, conn.id, 'pv')}
                  markerEnd={connectorMarkerUrl('end', toType, conn.id, 'pv')}
                  style={connectorAnimStyle(conn)}
                />
              );
            })}
      </svg>
      {els.map((el) => {
        if (el.objHidden) return null;
        if (el.type === 'formula' && el.formulaSvg) {
          const fAlign = ((el.cs || '').match(/text-align\s*:\s*([^;]+)/i) || [])[1]?.trim().toLowerCase();
          const align = fAlign === 'center' || fAlign === 'right' ? fAlign : 'left';
          const justify =
            align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
          const tagLabel = formulaTagLabelOf(el.formulaRaw || el.html || '');
          return wrap(
            el,
            <div
              style={{
                width: '100%',
                height: '100%',
                color: el.formulaColor || el.textColor || '#fff',
                padding: 8,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
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
              {tagLabel ? (
                <div
                  style={{
                    flex: '0 0 auto',
                    fontFamily: 'Cambria, MathJax_NonItalic, serif',
                    fontSize: '0.85em',
                    lineHeight: 1,
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
          const htmlRaw = el.html != null && el.html !== '' ? el.html : String(el.text || '');
          const bgLayer = el.type === 'text' ? textBgLayerStyle(elWithMorphLayerBlur(el)) : null;
          const colorGrad = el.type === 'text' && el.textRole !== 'toc' ? textColorGradStyle(el) : null;
          const borderSvg = el.type === 'text' ? textBorderSvgMarkup(el) : '';
          const borderBox = el.type === 'text' ? textBorderBoxStyle(el) : null;
          const glyphSh = el.type === 'text' ? textGlyphShadowStyle(el) : null;
          const blockSh = el.type === 'text' ? textBlockShadowStyle(el) : null;
          const warpCss = el.type === 'text' ? shapeTextWarpCss(el) : null;
          const hasList =
            el.type === 'text' &&
            (/(data-list-bullet|data-list-num)/i.test(htmlRaw) || el.bulletIconId);
          const valign = el.valign || (el.type === 'formula' ? 'middle' : 'top');
          const justify =
            valign === 'middle' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start';
          const ulPrep =
            el.type === 'text'
              ? prepareTextUnderlineHtml(htmlRaw, css)
              : { html: htmlRaw, paintBoxUnderline: false };
          const html = ulPrep.html;
          const ulBox =
            el.type === 'text'
              ? underlineBoxProps(css, { paintBoxUnderline: ulPrep.paintBoxUnderline })
              : { style: {}, className: '' };
          return wrap(
            el,
            <div
              className={`react-el-text${ulBox.className ? ` ${ulBox.className}` : ''}`}
              style={{
                position: 'relative',
                fontSize: fs ? Number(fs) : el.type === 'formula' ? 40 : 36,
                padding: el.type === 'text' ? textPadCss(el) : 8,
                lineHeight: lineH != null ? lineH : 1.2,
                letterSpacing: letterSp != null ? `${letterSp}px` : undefined,
                textTransform: textTransform ? textTransform.trim() : undefined,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: justify,
                fontFamily: family,
                fontWeight: weight || undefined,
                fontStyle: fontStyle || undefined,
                textAlign: align.trim(),
                boxSizing: 'border-box',
                border: borderBox?.border,
                borderRadius: el.type === 'text' ? textBorderRadiusCss(el) : undefined,
                overflow: needsTextBorderOverflow(el) || textNeedsOverflowVisible(el) || warpCss ? 'visible' : undefined,
                transformOrigin: warpCss ? '0 0' : undefined,
                transform: warpCss || undefined,
                ...(hasList ? { ['--rt-bullet-gap']: `${el.bulletGap != null ? el.bulletGap : 10}px` } : {}),
                ...(blockSh || {}),
                ...(ulBox.style || {}),
              }}
            >
              {borderSvg ? (
                <div
                  aria-hidden="true"
                  style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}
                  dangerouslySetInnerHTML={{ __html: borderSvg }}
                />
              ) : null}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: 'fit-content',
                  maxWidth: '100%',
                  minWidth: 0,
                  alignSelf: textAlignSelf(align),
                  color: colorGrad ? undefined : el.textColor || '#fff',
                  ...(colorGrad || {}),
                  ...(glyphSh || {}),
                }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>,
            bgLayer ? <div aria-hidden="true" style={bgLayer} /> : null
          );
        }
        if (el.type === 'image' && el.src) {
          return wrap(el, <PreviewImageBody el={el} />);
        }
        if (el.type === 'pagenum') {
          return wrap(
            el,
            <div
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: el.html || '' }}
            />
          );
        }
        if (el.type === 'shape') {
          const shapeEl = elWithMorphLayerBlur(el);
          const fx = readMorphFx(el.id);
          const sb = shapeBlurPx(el);
          const peak =
            fx?.layerBlurPeak != null
              ? fx.layerBlurPeak
              : fx?.layerBlur != null
                ? fx.layerBlur
                : sb;
          const morphingBlur = fx?.layerBlur != null;
          const blurStyle =
            peak > 0 || morphingBlur
              ? shapeBlurOverlayStyle({ ...shapeEl, shapeBlur: Math.max(peak, 0.001) })
              : null;
          if (blurStyle && morphingBlur) {
            const op = fx.layerBlurOpacity != null ? fx.layerBlurOpacity : 1;
            const filterBlur =
              fx.layerBlurFilter != null ? fx.layerBlurFilter : Math.max(peak, 0.001);
            blurStyle.opacity = op;
            blurStyle.backdropFilter = filterBlur > 0.01 ? `blur(${filterBlur}px)` : 'none';
            blurStyle.WebkitBackdropFilter = blurStyle.backdropFilter;
          }
          return wrap(
            el,
            <div
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow:
                  peak > 0 || morphingBlur || shapeNeedsOverflowVisible(el.shape, el)
                    ? 'visible'
                    : undefined,
              }}
            >
              {blurStyle ? (
                <div className="react-shape-blur-overlay" aria-hidden="true" style={blurStyle} />
              ) : null}
              <div
                style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}
                dangerouslySetInnerHTML={{
                  __html: buildBasicShapeSVG(el.shape || 'rect', shapeOptsFromEl(el)),
                }}
              />
              {hasElShadow(el) && isElShadowInset(el) ? (
                <div
                  className="react-shape-inset-shadow"
                  aria-hidden="true"
                  style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
                  dangerouslySetInnerHTML={{ __html: elInsetShadowSvgMarkup(el) }}
                />
              ) : null}
              {el.shapeHtml ? (
                <div className="react-shape-text" style={shapeTextBoxStyle(el)}>
                  <div
                    style={{
                      width: '100%',
                      textAlign: 'inherit',
                      minHeight: 0,
                      lineHeight: 1.15,
                      margin: 0,
                      padding: 0,
                      transform: 'translateY(-0.07em)',
                    }}
                    dangerouslySetInnerHTML={{ __html: el.shapeHtml }}
                  />
                </div>
              ) : null}
            </div>
          );
        }
        if (el.type === 'svg' && (el.svg || el.svgContent)) {
          if (el._isDecor) attachDecorGlCfg(el);
          if (el._isDecor && decorUsesGl(el)) {
            return wrap(
              el,
              <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'visible' }} className="react-el-decor">
                <DecorSvgHost
                  html={el.svg || el.svgContent || ''}
                  role="preview"
                  still
                  style={{ position: 'absolute', inset: 0 }}
                />
                <DecorGlView el={el} role="preview" />
              </div>
            );
          }
          if (el._isDecor) {
            return wrap(
              el,
              <DecorSvgHost
                className="react-el-decor"
                role="preview"
                html={el.svg || el.svgContent || ''}
                style={{ width: '100%', height: '100%' }}
              />
            );
          }
          return wrap(el, <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: el.svg || el.svgContent }} />);
        }
        if (el.type === 'mediavideo') {
          const src = resolveMediaSrc(el);
          const showControls = el.mvControls !== 'none';
          const full = isFullscreenVideo(el);
          if (full) {
            return wrap(
              el,
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#000',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,.55)',
                  fontSize: 12,
                }}
              >
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.3">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <polygon points="10,8 16,12 10,16" fill="rgba(255,255,255,.8)" stroke="none" />
                </svg>
                <span>Нажмите для просмотра</span>
              </div>
            );
          }
          return wrap(
            el,
            src ? (
              <video
                src={src}
                controls={showControls}
                autoPlay={el.mvStart === 'auto'}
                muted={el.mvStart === 'auto'}
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#000' }} />
            )
          );
        }
        if (el.type === 'mediaaudio') {
          const src = resolveMediaSrc(el);
          const vol = el.maVolume != null ? +el.maVolume : 1;
          const themeIdx = usePresentationStore.getState().appliedThemeIdx;
          const host = audioPlayerHostStyle(themeIdx, { width: '100%', height: '100%' });
          return wrap(
            el,
            <div className="react-el-audio" style={host}>
              <ThemedAudioPlayer
                elId={el.id}
                src={src}
                themeOrIdx={themeIdx}
                volume={vol}
                loop={!!el.maLoop}
                autoPlay={el.maStart === 'auto'}
                isolatePointer
              />
            </div>
          );
        }
        if (el.type === 'htmlframe') {
          const src = el.hfSrc || '';
          const showChrome = el.hfChrome !== false;
          const url = isHttpUrl(src);
          const title = hfTitleFromSrc(src);
          return wrap(
            el,
            <div
              className="react-el-hf"
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: showChrome ? 6 : 0,
                border: showChrome ? '1px solid rgba(128,128,128,.25)' : 'none',
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
                  srcDoc={url ? undefined : buildHfSrcdocClickThrough(src)}
                  style={{ pointerEvents: 'auto' }}
                />
              </div>
            </div>
          );
        }
        if (el.type === 'markdown') {
          const bgLayer = textBgLayerStyle(elWithMorphLayerBlur(el));
          const radius = textBorderRadiusCss(el);
          const borderBox = textBorderBoxStyle(el);
          const borderSvg = textBorderSvgMarkup(el);
          return wrap(
            el,
            <div
              className="react-el-md"
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: needsTextBorderOverflow(el) ? 'visible' : 'auto',
                padding: 10,
                color: el.mdColor || el.textColor || '#fff',
                fontSize: el.mdFs || 16,
                borderRadius: radius || undefined,
                border: borderBox?.border,
                background: 'transparent',
                boxSizing: 'border-box',
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
          const html = codeDisplayHtml(el);
          return wrap(
            el,
            <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
              <div style={surface}>
                {el.codeLineNums ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <pre style={codeGutterCss(el)} aria-hidden="true">
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
        if (el.type === 'icon') {
          const ic = el.iconId ? getIconById(el.iconId) : null;
          const color = el.iconColor || el.textColor || '#6366f1';
          if (ic) {
            return wrap(
              el,
              <div className="react-el-icon" style={{ width: '100%', height: '100%', boxSizing: 'border-box', overflow: 'visible' }}>
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
          return wrap(
            el,
            <div
              style={{
                width: '100%',
                height: '100%',
                fontSize: Math.min(el.w || 96, el.h || 96) * 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {el.emoji || '⭐'}
            </div>
          );
        }
        if (el.type === 'table') {
          if (el.showChart) {
            return wrap(
              el,
              <div style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <div
                  style={chartWrapStyle(el)}
                  dangerouslySetInnerHTML={{ __html: buildChartSvg(el) }}
                />
              </div>
            );
          }
          const rows = el.rows || 3;
          const cols = el.cols || 3;
          const rx = +(el.rx || 0);
          const blur = +(elWithMorphLayerBlur(el).tableBgBlur || 0);
          const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
          const textColor = resolveElTextColor(el, theme);
          const cws = tableColWidthsPx(el, el.w || 100);
          const rhs = tableRowHeightsPx(el, el.h || 60);
          return wrap(
            el,
            <div
              className="react-el-table"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: rx || undefined,
                overflow: 'hidden',
                position: 'relative',
                background: 'transparent',
              }}
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
                    pointerEvents: 'none',
                  }}
                />
              ) : null}
              <table
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  color: textColor,
                  background: 'transparent',
                  fontSize: el.fs || 15,
                  fontFamily: el.ff || DEFAULT_TEXT_FONT_FAMILY,
                  tableLayout: 'fixed',
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
                        const rad = tableCellRadiusStyle(el, r, c, cs, rs);
                        const isH = r === 0 && el.headerRow !== false;
                        const cellTc =
                          cell.textColor || cell.textColorScheme != null
                            ? resolveSchemeColor(cell.textColorScheme, theme) || cell.textColor
                            : '';
                        const Tag = isH ? 'th' : 'td';
                        return (
                          <Tag
                            key={c}
                            colSpan={cs > 1 ? cs : undefined}
                            rowSpan={rs > 1 ? rs : undefined}
                            style={{
                              background: tableCellBg(el, r, c, cell, theme),
                              ...tableCellBorderStyle(el, r, c, cell, theme),
                              padding: '3px 8px',
                              verticalAlign: cell.valign || 'middle',
                              textAlign: cell.align || 'left',
                              ...tableCellFontStyle(el, r, c, cell),
                              fontSize: cell.fs || undefined,
                              fontFamily: cell.ff || el.ff || DEFAULT_TEXT_FONT_FAMILY,
                              color: cellTc || undefined,
                              ...rad,
                            }}
                            dangerouslySetInnerHTML={{ __html: cell.html || '' }}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (el.type === 'lineangle') {
          const built = buildLineAngleContent(el, els);
          if (!built) return null;
          const proxy = { ...el, x: built.x, y: built.y, w: built.w, h: built.h };
          return wrap(
            proxy,
            <div
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
              dangerouslySetInnerHTML={{ __html: built.html }}
            />
          );
        }
        if (el.type === 'inkhost') {
          const inner = inkHostInnerMarkup(slide, el, inkStrokeSvgMarkup, inkFillsSvgMarkup);
          if (!inner) return null;
          const op = el.elOpacity != null ? +el.elOpacity : 1;
          return wrap(
            el,
            <svg
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
                opacity: op < 1 ? op : undefined,
              }}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: inner }}
            />
          );
        }
        if (el.type === 'applet') {
          return wrap(
            el,
            <AppletView el={el} mode="preview" style={{ width: '100%', height: '100%' }} />
          );
        }
        if (el.type === 'model3d') {
          return wrap(
            el,
            <div
              className="react-el-model3d"
              data-model3d-viewer="1"
              style={{
                width: '100%',
                height: '100%',
                background: el.objBgCleared ? 'transparent' : el.objBg || '#0f172a',
                touchAction: 'none',
              }}
            >
              <Model3dView key={`m3d-${el.id}-${slideKey}`} el={el} interactive slideKey={slideKey} />
            </div>
          );
        }
        if (el.type === 'lego') {
          return wrap(
            el,
            <div
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
              dangerouslySetInnerHTML={{ __html: buildLegoSvg(el, slide.els) }}
            />
          );
        }
        if (el.type === 'graph') {
          const graphBlur = el.graphTheme === 'blur';
          const graphTransparent =
            el.graphTheme === 'transparent' || graphBlur || el.graphKind === 'chem';
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
          const kfName = `rgstroke_pv_${String(el.id).replace(/[^\w-]/g, '_')}`;
          const imgFit = { width: '100%', height: '100%', objectFit: 'fill', display: 'block' };
          return wrap(
            el,
            <div
              style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                borderRadius: el.graphRadius ?? 16,
                background: graphBg,
                ...(graphBlur
                  ? { backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }
                  : null),
              }}
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
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
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
                  <img src={el.graphImg} alt="" style={imgFit} />
                )
              ) : (
                <div style={{ padding: 8, fontSize: 12, color: '#94a3b8' }}>{el.graphLatex || 'graph'}</div>
              )}
            </div>
          );
        }
        return null;
      })}
      <ImageSortMarkersLayer
        slide={slide}
        canvasW={canvasW}
        canvasH={canvasH}
        mode="preview"
        choices={imageSortChoices}
        pickId={imageSortPickId}
        resultHints={imageSortHints}
        onPickMarker={onImageSortPick}
        onSuppressNav={onImageSortSuppressNav}
      />
    </div>
    </div>
  );
}

const DRAW_COLOR = '#ef4444';
const DRAW_WIDTH = 11;
const DRAW_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#111827', '#f8fafc'];
const DRAW_WIDTHS = [5, 11, 18, 24];
const BRUSH_PREF_KEY = 'sf_pres_brush';

function brushFeel(baseW) {
  const w = Math.max(5, Math.min(24, +baseW || DRAW_WIDTH));
  const t = (w - 5) / 19;
  const lerp = (a, b) => a + (b - a) * t;
  return {
    // Always Chaikin at least once — thin strokes looked faceted without it.
    chaikin: t < 0.35 ? 2 : 3,
    smoothWin: Math.max(4, Math.round(lerp(5, 10))),
    smoothPasses: Math.max(3, Math.round(lerp(3, 6))),
    smoothSpacing: lerp(1.05, 1.9),
    leashPx: lerp(5.5, 22),
    minDistPx: lerp(0.4, 1.1),
    widthWin: lerp(14, 42),
    widthSmooth: Math.max(3, Math.round(lerp(3.2, 12))),
    widthPasses: t < 0.35 ? 2 : 4,
    paintSpacing: Math.max(0.55, w * (t < 0.3 ? 0.09 : 0.13)),
  };
}

function nearestDrawWidth(w) {
  const n = +w;
  if (!Number.isFinite(n)) return DRAW_WIDTH;
  let best = DRAW_WIDTHS[1];
  let d = Infinity;
  for (const x of DRAW_WIDTHS) {
    const dd = Math.abs(x - n);
    if (dd < d) {
      d = dd;
      best = x;
    }
  }
  return best;
}

function loadBrushPref() {
  try {
    const o = JSON.parse(typeof localStorage !== 'undefined' ? localStorage.getItem(BRUSH_PREF_KEY) || '' : '');
    const color =
      typeof o.color === 'string' && /^#([0-9a-fA-F]{6})$/.test(o.color) ? o.color : DRAW_COLOR;
    return { color, width: nearestDrawWidth(o.width) };
  } catch (e) {
    return { color: DRAW_COLOR, width: DRAW_WIDTH };
  }
}

function saveBrushPref(color, width) {
  try {
    localStorage.setItem(BRUSH_PREF_KEY, JSON.stringify({ color, width }));
  } catch (e) {}
}

function appendBrushPoint(pts, p, minDist) {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const last = pts[pts.length - 1];
  if (!last) {
    pts.push({ x: p.x, y: p.y, t: now });
    return;
  }
  if (Math.hypot(p.x - last.x, p.y - last.y) < minDist) return;
  pts.push({ x: p.x, y: p.y, t: now });
}

function pullFollow(stroke, p, leash) {
  if (!stroke.follow) {
    stroke.follow = { x: p.x, y: p.y };
    return stroke.follow;
  }
  const dx = p.x - stroke.follow.x;
  const dy = p.y - stroke.follow.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= 1e-6) return stroke.follow;
  if (dist > leash) {
    const keep = leash / dist;
    stroke.follow = { x: p.x - dx * keep, y: p.y - dy * keep };
  } else {
    stroke.follow = { x: stroke.follow.x + dx * 0.18, y: stroke.follow.y + dy * 0.18 };
  }
  return stroke.follow;
}

function cssPoints(pts, W, H) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    out.push({ x: pts[i].x * W, y: pts[i].y * H, t: pts[i].t || 0 });
  }
  return out;
}




function chaikinOnce(pts) {
  const n = pts.length;
  if (n < 3) return pts;
  const next = [pts[0]];
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    next.push({
      x: a.x * 0.75 + b.x * 0.25,
      y: a.y * 0.75 + b.y * 0.25,
      t: a.t,
    });
    next.push({
      x: a.x * 0.25 + b.x * 0.75,
      y: a.y * 0.25 + b.y * 0.75,
      t: b.t,
    });
  }
  next.push(pts[n - 1]);
  return next;
}

function resamplePx(pts, spacing) {
  const n = pts.length;
  if (!n) return [];
  if (n === 1) return [{ x: pts[0].x, y: pts[0].y, t: pts[0].t || 0 }];
  const gap = Math.max(0.7, spacing);
  const out = [{ x: pts[0].x, y: pts[0].y, t: pts[0].t || 0 }];
  let acc = 0;
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg < 1e-6) continue;
    let d = gap - acc;
    while (d <= seg) {
      const u = d / seg;
      out.push({
        x: a.x + (b.x - a.x) * u,
        y: a.y + (b.y - a.y) * u,
        t: (a.t || 0) * (1 - u) + (b.t || 0) * u,
      });
      d += gap;
    }
    acc = seg - (d - gap);
    if (acc < 0) acc = 0;
  }
  const last = pts[n - 1];
  const prev = out[out.length - 1];
  if (!prev || Math.hypot(last.x - prev.x, last.y - prev.y) > 0.4) {
    out.push({ x: last.x, y: last.y, t: last.t || 0 });
  }
  return out;
}

function photoshopSmooth(pts, feel) {
  const spacing = feel?.smoothSpacing || 2.6;
  const halfWin = feel?.smoothWin || 6;
  const passes = feel?.smoothPasses || 4;
  let out = resamplePx(pts, spacing);
  if (out.length < 3) return out;
  for (let pass = 0; pass < passes; pass++) {
    const next = [out[0]];
    for (let i = 1; i < out.length - 1; i++) {
      let sx = 0;
      let sy = 0;
      let wsum = 0;
      for (let k = -halfWin; k <= halfWin; k++) {
        const j = Math.max(0, Math.min(out.length - 1, i + k));
        const w = 1 - Math.abs(k) / (halfWin + 0.01);
        sx += out[j].x * w;
        sy += out[j].y * w;
        wsum += w;
      }
      next.push({ x: sx / wsum, y: sy / wsum, t: out[i].t });
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

function angleDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function ribbonHalfWidths(px, baseW, feel) {
  const n = px.length;
  // Straight ≈ 55% radius, bends swell toward full — visible, but not sausage-linked.
  const fat = Math.max(1.2, (baseW || DRAW_WIDTH) * 0.5);
  const body = fat * 0.55;
  if (n < 2) return new Array(n).fill(fat);
  if (n < 3) return new Array(n).fill(fat);
  const acc = new Array(n);
  const head = new Array(n).fill(0);
  acc[0] = 0;
  for (let i = 1; i < n; i++) {
    acc[i] = acc[i - 1] + Math.hypot(px[i].x - px[i - 1].x, px[i].y - px[i - 1].y);
    head[i] = Math.atan2(px[i].y - px[i - 1].y, px[i].x - px[i - 1].x);
  }
  head[0] = head[1];
  for (let i = 1; i < n; i++) head[i] = head[i - 1] + angleDelta(head[i - 1], head[i]);
  const win = Math.max(16, (feel?.widthWin || 42) * 0.75);
  const raw = new Array(n);
  for (let i = 0; i < n; i++) {
    let local = 0;
    if (i > 0 && i < n - 1) {
      // Only stronger corners count (ignore tiny jitter).
      const turn = Math.abs(angleDelta(head[i], head[i + 1]));
      local = turn < 0.22 ? 0 : Math.min(1, (turn - 0.22) / (Math.PI * 0.45));
    }
    let i0 = i;
    let i1 = i;
    while (i0 > 0 && acc[i] - acc[i0] < win * 0.5) i0--;
    while (i1 < n - 1 && acc[i1] - acc[i] < win * 0.5) i1++;
    const ds = Math.max(3, acc[i1] - acc[i0]);
    const windowed = Math.min(1, Math.abs(head[i1] - head[i0]) / ds / 0.055);
    const k = Math.min(1, Math.max(local * 0.85, windowed));
    const ease = k * k * (3 - 2 * k);
    raw[i] = body + (fat - body) * ease;
  }
  // Moderate arc-length blur: smooth ramps, keep bend contrast.
  let cur = raw;
  const blurR = Math.max(10, fat * 1.8);
  for (let pass = 0; pass < 2; pass++) {
    const next = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      let w = 0;
      for (let j = i; j >= 0 && acc[i] - acc[j] <= blurR; j--) {
        const d = acc[i] - acc[j];
        const kk = 1 - d / (blurR + 0.01);
        s += cur[j] * kk;
        w += kk;
      }
      for (let j = i + 1; j < n && acc[j] - acc[i] <= blurR; j++) {
        const d = acc[j] - acc[i];
        const kk = 1 - d / (blurR + 0.01);
        s += cur[j] * kk;
        w += kk;
      }
      next[i] = s / Math.max(1e-6, w);
    }
    cur = next;
  }
  if (n > 1) {
    cur[0] = cur[1];
    cur[n - 1] = cur[n - 2];
  }
  return cur;
}

function paintRibbon(ctx, px, half, color) {
  const n = px.length;
  ctx.fillStyle = color;
  if (!n) return;
  if (n === 1) {
    ctx.beginPath();
    ctx.arc(px[0].x, px[0].y, half[0], 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const nx = new Array(n);
  const ny = new Array(n);
  let pnx = 0;
  let pny = -1;
  for (let i = 0; i < n; i++) {
    let tx;
    let ty;
    if (i === 0) {
      tx = px[1].x - px[0].x;
      ty = px[1].y - px[0].y;
    } else if (i === n - 1) {
      tx = px[n - 1].x - px[n - 2].x;
      ty = px[n - 1].y - px[n - 2].y;
    } else {
      tx = px[i + 1].x - px[i - 1].x;
      ty = px[i + 1].y - px[i - 1].y;
    }
    const len = Math.hypot(tx, ty) || 1;
    let x = -ty / len;
    let y = tx / len;
    if (x * pnx + y * pny < 0) {
      x = -x;
      y = -y;
    }
    pnx = x;
    pny = y;
    nx[i] = x;
    ny[i] = y;
  }
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(px[i].x, px[i].y, half[i], 0, Math.PI * 2);
    ctx.fill();
    if (i === n - 1) break;
    const l0x = px[i].x + nx[i] * half[i];
    const l0y = px[i].y + ny[i] * half[i];
    const r0x = px[i].x - nx[i] * half[i];
    const r0y = px[i].y - ny[i] * half[i];
    const l1x = px[i + 1].x + nx[i + 1] * half[i + 1];
    const l1y = px[i + 1].y + ny[i + 1] * half[i + 1];
    const r1x = px[i + 1].x - nx[i + 1] * half[i + 1];
    const r1y = px[i + 1].y - ny[i + 1] * half[i + 1];
    ctx.beginPath();
    ctx.moveTo(l0x, l0y);
    ctx.lineTo(l1x, l1y);
    ctx.lineTo(r1x, r1y);
    ctx.lineTo(r0x, r0y);
    ctx.closePath();
    ctx.fill();
  }
}

function paintPtsStroke(ctx, pts, w, h, stroke) {
  if (!pts || !pts.length) return;
  const baseW = stroke.w || DRAW_WIDTH;
  const feel = brushFeel(baseW);
  let px = cssPoints(pts, w, h);
  for (let i = 0; i < feel.chaikin; i++) {
    if (px.length > 2) px = chaikinOnce(px);
  }
  px = photoshopSmooth(px, feel);
  px = resamplePx(px, feel.paintSpacing);
  paintRibbon(ctx, px, ribbonHalfWidths(px, baseW, feel), stroke.color || DRAW_COLOR);
}

function paintOneStroke(ctx, stroke, w, h, tip) {
  const raw = stroke.pts;
  if (!raw || !raw.length) return;
  paintPtsStroke(ctx, tip ? raw.concat(tip) : raw, w, h, stroke);
}

function paintInkStrokes(ctx, strokes, w, h) {
  for (const s of strokes || []) paintOneStroke(ctx, s, w, h, null);
}

function eraseInkAt(strokes, p, stageW, stageH) {
  const next = [];
  for (const s of strokes || []) {
    const rad = Math.max(18, (s.w || DRAW_WIDTH) * 0.7 + 12);
    const rX = rad / Math.max(1, stageW);
    const rY = rad / Math.max(1, stageH);
    let cur = [];
    for (const q of s.pts) {
      const dx = (q.x - p.x) / rX;
      const dy = (q.y - p.y) / rY;
      if (dx * dx + dy * dy <= 1) {
        if (cur.length > 1) next.push({ ...s, pts: cur });
        cur = [];
      } else {
        cur.push(q);
      }
    }
    if (cur.length > 1) next.push({ ...s, pts: cur });
  }
  return next;
}

export default function PreviewOverlay() {
  useEffect(() => installHtmlFrameTransparentPointerListener(), []);
  const open = useUiStore((s) => s.previewOpen);
  const from = useUiStore((s) => s.previewFrom);
  const closePreview = useUiStore((s) => s.closePreview);
  const presLoop = useUiStore((s) => s.presLoop);
  const presShuffle = useUiStore((s) => s.presShuffle);
  const presShowFooter = useUiStore((s) => s.presShowFooter);
  const presShowSideNav = useUiStore((s) => s.presShowSideNav);
  const presShowEsc = useUiStore((s) => s.presShowEsc);
  const presShowBrush = useUiStore((s) => s.presShowBrush);
  const lang = useUiStore((s) => s.lang);
  const ruHud = lang !== 'en';
  const storeSlides = usePresentationStore((s) => s.slides);
  const storeCanvasW = usePresentationStore((s) => s.canvasW);
  const storeCanvasH = usePresentationStore((s) => s.canvasH);
  const storeAr = usePresentationStore((s) => s.ar);
  const globalTrans = usePresentationStore((s) => s.globalTrans);
  const globalTransDur = usePresentationStore((s) => s.globalTransDur);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  // Phone rotate during preview: prefer authored layout for that orientation
  const previewDeck = useMemo(() => {
    const want = vp.h > vp.w + 8 ? '9:16' : '16:9';
    const resolved = resolveDeckForAr(storeSlides, storeCanvasW, storeCanvasH, storeAr, want);
    if (resolved) return resolved;
    return {
      slides: storeSlides,
      canvasW: storeCanvasW,
      canvasH: storeCanvasH,
      key: arLayoutKey(storeCanvasW, storeCanvasH, storeAr),
    };
  }, [storeSlides, storeCanvasW, storeCanvasH, storeAr, vp.w, vp.h]);
  const slides = previewDeck.slides;
  const canvasW = previewDeck.canvasW;
  const canvasH = previewDeck.canvasH;
  const [idx, setIdx] = useState(from);
  const [animKey, setAnimKey] = useState(0);
  const [animClass, setAnimClass] = useState('');
  const [dur, setDur] = useState(500);
  const [pvDir, setPvDir] = useState(1);
  const [pvShift, setPvShift] = useState({ x: 0, y: 0 });
  const [animState, setAnimState] = useState({});
  const [iconsTick, setIconsTick] = useState(0);
  // Tick so draw overlay can resync; never passed into React transform style.
  const [camTransform, setCamTransform] = useState(null);
  const [black, setBlack] = useState(false);
  const morphPairsRef = useRef([]);
  const busy = useRef(false);
  const overlayRef = useRef(null);
  const idxRef = useRef(from);
  const fsArmRef = useRef(null);
  const jumpBufRef = useRef('');
  const jumpTimerRef = useRef(null);
  const [jumpHint, setJumpHint] = useState('');
  const busyTimerRef = useRef(null);
  const autoTimerRef = useRef(null);
  const shuffleHistRef = useRef([]);
  const stepsRef = useRef([]);
  const stepIRef = useRef(0);
  const autoStartAnimTimerRef = useRef(null);
  const stageRef = useRef(null);
  const swipeRef = useRef(null);
  const camAbortRef = useRef(null);
  const rideCancelRef = useRef([]);
  const cumMotionRef = useRef({});
  /** Bumped on each motion start / repeat reset so stale WAAPI onfinish cannot re-bake offsets. */
  const motionGenRef = useRef({});
  /**
   * Intended end offset for an in-flight moveTo/pathTo/orbitTo tween.
   * If the next bundle starts a hair early (rAF vs setTimeout), we commit this into
   * cumMotionRef so the chain/repeat does not resume from a half-finished position.
   */
  const pendingMotionEndRef = useRef({});
  /** Bumped on every slide enter so late settleMotion from a previous visit cannot re-bake. */
  const slidePlayGenRef = useRef(0);
  /** Slide passed to the latest initSlideAnims — playBundle must not use stale slides[idx]. */
  const animSlideRef = useRef(null);
  /** Always-current preview deck slides (avoids stale closures in deferred auto-start). */
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const mediaPoolRef = useRef([]);
  const fsVideoCloseRef = useRef(null);
  /** slideIdx → Set(elId) hidden by exit / nav-trigger (persist across return). */
  const hiddenElsRef = useRef({});
  const startedAtRef = useRef(0);
  const blackRef = useRef(false);
  const goToRef = useRef(() => {});
  const goNextRef = useRef(() => {});
  const goPrevRef = useRef(() => {});
  /** Space / → / presenter «Далее»: same path as show keyboard (timers → triggers → goNext). */
  const runShowNextRef = useRef(() => {});
  /** Same side-effects as a blank-slide click: click-slide timers / audios. */
  const fireClickSlideTriggersRef = useRef(() => {});
  /** Returns true when this click/key only armed click-slide timers (no advance yet). */
  const armClickSlideTimersOnlyRef = useRef(() => false);
  /** Play on-slide builds without leaving the slide (used when arming click-slide timers). */
  const playNextAnimStepRef = useRef(() => false);
  /** Timer elIds already started by a prior click-slide arm on the current slide. */
  const clickSlideTimersArmedRef = useRef(new Set());
  /** Repeat blocks the user skipped mid-run (click jumps past the whole block). */
  const skippedRepeatRef = useRef(new Set());
  const closePreviewRef = useRef(closePreview);
  const [drawTool, setDrawTool] = useState(null);
  const [hasInk, setHasInk] = useState(false);
  const [drawColor, setDrawColor] = useState(() => loadBrushPref().color);
  const [drawWidth, setDrawWidth] = useState(() => loadBrushPref().width);
  const [colorWheelOpen, setColorWheelOpen] = useState(false);
  const [classLivePos, setClassLivePos] = useState(null);
  const [classResult, setClassResult] = useState(null);
  const classDragRef = useRef(null);
  const classLivePosRef = useRef(null);
  const classReplayRef = useRef(false);
  classLivePosRef.current = classLivePos;
  const [imageSortChoices, setImageSortChoices] = useState({});
  const [imageSortPickId, setImageSortPickId] = useState(null);
  const [imageSortOptions, setImageSortOptions] = useState([]);
  const [imageSortHints, setImageSortHints] = useState(null);
  const [imageSortResult, setImageSortResult] = useState(null);
  const imageSortChoicesRef = useRef({});
  const imageSortReplayRef = useRef(false);
  /** Ignore the click that follows a pin pointerdown (would otherwise advance the slide). */
  const imageSortSuppressNavRef = useRef(0);
  imageSortChoicesRef.current = imageSortChoices;

  const suppressImageSortNav = () => {
    imageSortSuppressNavRef.current = Date.now() + 450;
  };
  const drawToolRef = useRef(null);
  const drawStrokesRef = useRef({});
  const drawingRef = useRef(null);
  const drawPointerIdRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const bakeCanvasRef = useRef(null);
  const brushCurRef = useRef(null);
  const drawBoxRef = useRef({ w: 0, h: 0, dpr: 1 });
  drawToolRef.current = drawTool;

  function brushCursorSizePx() {
    if (drawTool === 'erase') return Math.max(22, drawWidth * 0.7 + 14);
    return Math.max(4, drawWidth);
  }

  function moveBrushCursor(clientX, clientY) {
    const node = brushCurRef.current;
    if (!node || !drawTool) return;
    node.classList.remove('is-hidden');
    node.style.transform = `translate(${clientX}px, ${clientY}px) translate(-50%, -50%)`;
  }

  function hideBrushCursor() {
    const node = brushCurRef.current;
    if (!node) return;
    node.classList.add('is-hidden');
  }

  useEffect(() => onIconsReady(() => setIconsTick((t) => t + 1)), []);

  function fitDrawCanvas(canvas, r, dpr) {
    if (!canvas) return false;
    canvas.style.left = `${r.left}px`;
    canvas.style.top = `${r.top}px`;
    canvas.style.width = `${r.width}px`;
    canvas.style.height = `${r.height}px`;
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w;
    canvas.height = h;
    return true;
  }

  function layoutDrawCanvases() {
    const stage = stageRef.current;
    const live = drawCanvasRef.current;
    const bake = bakeCanvasRef.current;
    if (!stage || !live || !bake) return null;
    const r = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    fitDrawCanvas(live, r, dpr);
    fitDrawCanvas(bake, r, dpr);
    drawBoxRef.current = { w: r.width, h: r.height, dpr };
    return r;
  }

  function clearCanvas(canvas) {
    if (!canvas) return;
    const { w, h, dpr } = drawBoxRef.current;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
  }

  function redrawBake() {
    const r = layoutDrawCanvases();
    const bake = bakeCanvasRef.current;
    if (!r || !bake) return;
    const { w, h, dpr } = drawBoxRef.current;
    const ctx = bake.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const live = drawingRef.current && !drawingRef.current.erase ? drawingRef.current : null;
    const list = drawStrokesRef.current[idxRef.current] || [];
    paintInkStrokes(ctx, live ? list.filter((s) => s !== live) : list, w, h);
  }

  function redrawLive() {
    const liveCv = drawCanvasRef.current;
    if (!liveCv) return;
    if (!drawBoxRef.current.w) layoutDrawCanvases();
    const { w, h, dpr } = drawBoxRef.current;
    const ctx = liveCv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const live = drawingRef.current && !drawingRef.current.erase ? drawingRef.current : null;
    if (!live) return;
    paintOneStroke(ctx, live, w, h, live.tip);
  }

  function commitLiveToBake() {
    const live = drawingRef.current && !drawingRef.current.erase ? drawingRef.current : null;
    const bake = bakeCanvasRef.current;
    if (live && bake) {
      if (!drawBoxRef.current.w) layoutDrawCanvases();
      const { w, h, dpr } = drawBoxRef.current;
      const ctx = bake.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintOneStroke(ctx, live, w, h, null);
    }
    clearCanvas(drawCanvasRef.current);
  }

  function syncDrawCanvas() {
    redrawBake();
    const liveCv = drawCanvasRef.current;
    if (liveCv) clearCanvas(liveCv);
  }

  function recountInk() {
    let n = 0;
    for (const list of Object.values(drawStrokesRef.current)) n += list?.length || 0;
    setHasInk(n > 0);
  }

  function slidePointFromEvent(e) {
    const stage = stageRef.current;
    if (!stage) return null;
    const r = stage.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return null;
    return {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    };
  }

  function applyErase(p) {
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const i = idxRef.current;
    const next = eraseInkAt(drawStrokesRef.current[i] || [], p, r.width, r.height);
    drawStrokesRef.current[i] = next;
    if (!next.length && drawToolRef.current === 'erase') setDrawTool('brush');
    recountInk();
    syncDrawCanvas();
  }

  function setBrushColor(color) {
    setDrawColor(color);
    saveBrushPref(color, drawWidth);
  }

  function setBrushWidth(width) {
    setDrawWidth(width);
    saveBrushPref(drawColor, width);
  }

  useEffect(() => {
    if (drawTool !== 'brush') setColorWheelOpen(false);
  }, [drawTool]);

  useEffect(() => {
    if (!colorWheelOpen) return undefined;
    const onDoc = (e) => {
      const t = e.target;
      if (t?.closest?.('.preview-draw-color-wheel') || t?.closest?.('.preview-draw-c-custom')) return;
      setColorWheelOpen(false);
    };
    document.addEventListener('pointerdown', onDoc, true);
    return () => document.removeEventListener('pointerdown', onDoc, true);
  }, [colorWheelOpen]);

  function clearAllDrawings() {
    drawStrokesRef.current = {};
    drawingRef.current = null;
    setHasInk(false);
    syncDrawCanvas();
  }

  /** Drop presentation ink tool + any stuck pointer capture / body cursor. */
  function endPresentationDrawing() {
    const live = drawCanvasRef.current;
    const pid = drawPointerIdRef.current;
    if (live && pid != null) {
      try {
        live.releasePointerCapture(pid);
      } catch (err) {}
    }
    drawPointerIdRef.current = null;
    const stroke = drawingRef.current;
    if (stroke?.raf) cancelAnimationFrame(stroke.raf);
    if (stroke?.pauseT) clearTimeout(stroke.pauseT);
    drawingRef.current = null;
    setDrawTool(null);
    setColorWheelOpen(false);
    hideBrushCursor();
    try {
      document.body.style.cursor = '';
    } catch (err) {}
    // Editor draw mode blocks element hits (is-drawing). Leaving the show must restore clicks.
    try {
      const st = usePresentationStore.getState();
      if (st.drawTool && st.drawTool !== 'cursor') st.setDrawTool('cursor');
    } catch (err) {}
  }

  useEffect(() => {
    if (!open) {
      endPresentationDrawing();
      drawStrokesRef.current = {};
      setHasInk(false);
      return undefined;
    }
    // Don't leave the editor brush armed under the slideshow (body cursor:none / no hit-targets).
    try {
      const st = usePresentationStore.getState();
      if (st.drawTool && st.drawTool !== 'cursor') st.setDrawTool('cursor');
    } catch (err) {}
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    syncDrawCanvas();
    const onResize = () => syncDrawCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, idx, vp.w, vp.h, camTransform, animKey]);

  useEffect(() => {
    if (!presShowBrush) setDrawTool(null);
  }, [presShowBrush]);

  function clearMediaPool() {
    stopMediaPool(mediaPoolRef.current);
  }

  function closeFsVideo() {
    if (fsVideoCloseRef.current) {
      try {
        fsVideoCloseRef.current();
      } catch (e) {}
      fsVideoCloseRef.current = null;
    }
  }

  function openFsForEl(el) {
    const src = resolveMediaSrc(el);
    if (!src) return;
    closeFsVideo();
    fsVideoCloseRef.current = openFullscreenVideo(src, {
      controls: el.mvControls !== 'none',
      onClose: () => {
        fsVideoCloseRef.current = null;
      },
    });
  }

  function clearAutoTimer() {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }

  function clearStageFx(root) {
    if (!root) return;
    clearMotionTransforms(root);
    clearRecolorTransforms(root);
    clearSplitHalf(root);
    clearCosmosTitle(root);
    clearParticles(root);
    clearInkDraw(root);
    clearFloat(root);
    clearDance(root);
    clearSwing(root);
  }

  function findStageEl(elId) {
    const root = stageRef.current;
    if (!root || elId == null) return null;
    try {
      return root.querySelector(`[data-id="${CSS.escape(String(elId))}"]`);
    } catch (e) {
      return root.querySelector(`[data-id="${String(elId).replace(/"/g, '\\"')}"]`);
    }
  }

  /** '#rgb' / '#rrggbb' → normalized '#rrggbb', else null (skip gradients/'none'/'transparent'). */
  function morphHexOrNull(c) {
    if (!c || typeof c !== 'string') return null;
    const s = c.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
    if (/^#[0-9a-fA-F]{3}$/.test(s)) return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return null;
  }

  /** Interpolate shadow / blur `filter` CSS between two element states during a morph transition. */
  function applyMorphFilter(domEl, fromData, toData, ease) {
    try {
      const fromShadowOn = !!(fromData?.shadow === true || fromData?.shadow === 'true');
      const toShadowOn = !!(toData?.shadow === true || toData?.shadow === 'true');
      const parts = [];
      const fromBlur = morphCssBlurPx(fromData);
      const toBlur = morphCssBlurPx(toData);
      const curBlur = fromBlur + (toBlur - fromBlur) * ease;
      if (curBlur > 0.01) parts.push(`blur(${curBlur}px)`);
      if (fromShadowOn || toShadowOn) {
        const fromBlurS = fromShadowOn ? (fromData.shadowBlur != null ? +fromData.shadowBlur : 4) : 0;
        const toBlurS = toShadowOn ? (toData.shadowBlur != null ? +toData.shadowBlur : 4) : 0;
        const fromSize = fromShadowOn ? (fromData.shadowSize != null ? +fromData.shadowSize : 3) : 0;
        const toSize = toShadowOn ? (toData.shadowSize != null ? +toData.shadowSize : 3) : 0;
        const colorA = morphHexOrNull(fromData?.shadowColor) || morphHexOrNull(toData?.shadowColor) || '#000000';
        const colorB = morphHexOrNull(toData?.shadowColor) || morphHexOrNull(fromData?.shadowColor) || '#000000';
        const color = lerpHexColor(colorA, colorB, ease);
        const curBlurS = fromBlurS + (toBlurS - fromBlurS) * ease;
        const curSize = fromSize + (toSize - fromSize) * ease;
        if (curBlurS > 0.01 || curSize > 0.01) {
          parts.push(`drop-shadow(0 ${curSize}px ${Math.max(0, curBlurS)}px ${color})`);
        }
      }
      const filterCss = parts.length ? parts.join(' ') : '';
      writeMorphFx(toData?.id, { filter: filterCss });
      domEl.style.filter = filterCss;
    } catch (e) {}
  }

  function applyMorphOpacity(domEl, fromData, toData, ease) {
    try {
      const a = morphElOpacity(fromData);
      const b = morphElOpacity(toData);
      const cur = a + (b - a) * ease;
      writeMorphFx(toData?.id, { opacity: cur });
      domEl.style.opacity = String(cur);
      if (toData?.type === 'image') {
        const img = domEl.querySelector('img');
        if (!img) return;
        const frame = toData.imgFrame || fromData?.imgFrame;
        if (frame === 'ribbon' || frame === 'polaroid') return;
        img.style.opacity = String(cur);
      }
    } catch (e) {}
  }

  function resetMorphOpacity(domEl, toData) {
    try {
      const op = morphElOpacity(toData);
      writeMorphFx(toData?.id, { opacity: op });
      domEl.style.opacity = String(op);
      if (toData?.type === 'image') {
        const img = domEl.querySelector('img');
        const frame = toData.imgFrame;
        if (img && frame !== 'ribbon' && frame !== 'polaroid') img.style.opacity = String(op);
      }
    } catch (e) {}
  }

  function applyMorphLayerBlur(domEl, fromData, toData, ease) {
    try {
      const type = toData?.type;
      const fromB = morphLayerBlurPx(fromData);
      const toB = morphLayerBlurPx(toData);
      if (fromB < 0.01 && toB < 0.01) return;
      const paint = morphLayerBlurPaint(fromB, toB, ease);
      writeMorphFx(toData?.id, {
        layerBlur: paint.cur,
        layerBlurPeak: paint.peak,
        layerBlurOpacity: paint.opacity,
        layerBlurFilter: paint.filterBlur,
      });
      if (type === 'shape') {
        const host =
          domEl.querySelector('.react-shape-blur-overlay')?.parentElement ||
          [...domEl.children].find((c) => c.querySelector?.('svg')) ||
          domEl.querySelector(':scope > div');
        if (!host) return;
        const synth = lerpMorphEl(fromData, toData, ease);
        // Keep mask/clip pad on the peak so the frost box doesn't shrink each frame.
        synth.shapeBlur = Math.max(paint.peak, 0.001);
        const style = shapeBlurOverlayStyle(synth);
        const overlay = ensureBlurOverlay(host, 'react-shape-blur-overlay');
        if (!style) {
          paintBackdropBlur(overlay, null, 0, 0);
          return;
        }
        paintBackdropBlur(overlay, style, paint.filterBlur, paint.opacity);
        return;
      }
      if (type === 'text') {
        // Text bg layer may also carry solid/gradient fill — only opacity-fade when blur-only,
        // otherwise lerp the filter radius so the fill doesn't ghost-fade.
        const blurOnly = !toData?.textBg && !toData?.textBgGrad && !fromData?.textBg && !fromData?.textBgGrad;
        const synth = {
          ...toData,
          textBgBlur: Math.max(blurOnly ? paint.peak : paint.cur, 0.001),
        };
        const style = textBgLayerStyle(synth) || {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        };
        const overlay = ensureBlurOverlay(domEl, 'react-text-bg-layer');
        paintBackdropBlur(
          overlay,
          style,
          blurOnly ? paint.filterBlur : Math.max(paint.cur, 0.001),
          blurOnly ? paint.opacity : 1
        );
        return;
      }
      if (type === 'markdown') {
        const host = domEl.querySelector('.react-el-md');
        if (!host) return;
        const blurOnly = !toData?.textBg && !toData?.textBgGrad && !fromData?.textBg && !fromData?.textBgGrad;
        const synth = {
          ...toData,
          textBgBlur: Math.max(blurOnly ? paint.peak : paint.cur, 0.001),
        };
        const style = textBgLayerStyle(synth) || {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        };
        const overlay = ensureBlurOverlay(host, 'react-text-bg-layer');
        paintBackdropBlur(
          overlay,
          style,
          blurOnly ? paint.filterBlur : Math.max(paint.cur, 0.001),
          blurOnly ? paint.opacity : 1
        );
        return;
      }
      if (type === 'table') {
        const host = domEl.querySelector(':scope > div');
        if (!host) return;
        const overlay = ensureBlurOverlay(host, 'react-table-blur-overlay');
        overlay.style.position = 'absolute';
        overlay.style.inset = '0';
        overlay.style.pointerEvents = 'none';
        paintBackdropBlur(overlay, null, paint.filterBlur, paint.opacity);
      }
    } catch (e) {}
  }

  function resetMorphLayerBlur(domEl, toData) {
    try {
      const toB = morphLayerBlurPx(toData);
      applyMorphLayerBlur(domEl, toData, toData, 1);
      if (toData?.type === 'shape') {
        const overlay =
          domEl.querySelector('.react-shape-blur-overlay') ||
          domEl.querySelector('[data-morph-blur="1"]');
        if (toB <= 0.01) {
          overlay?.remove();
        } else if (overlay) {
          // Restore real radius (not peak) and full opacity for the settled slide.
          const style = shapeBlurOverlayStyle(toData);
          paintBackdropBlur(overlay, style, toB, 1);
        }
      }
      if (toData?.type === 'text' && !hasTextBg(toData)) {
        domEl.querySelector('[data-morph-blur="1"]')?.remove();
      }
      if (toData?.type === 'markdown' && !hasTextBg(toData)) {
        domEl.querySelector('.react-el-md [data-morph-blur="1"]')?.remove();
      }
      if (toData?.type === 'table' && !(+(toData.tableBgBlur || 0) > 0)) {
        domEl.querySelector('[data-morph-blur="1"]')?.remove();
      }
    } catch (e) {}
  }

  /** Interpolate the most common color fields (text color, shape fill/stroke) during a morph. */
  function applyMorphColor(domEl, fromData, toData, ease) {
    try {
      if (toData?.type === 'text' || toData?.type === 'formula') {
        const fromC = morphHexOrNull(fromData?.textColor);
        const toC = morphHexOrNull(toData?.textColor);
        if (fromC && toC && fromC !== toC) {
          const holder = Array.from(domEl.querySelectorAll('.react-el-text > div')).find(
            (d) => !d.hasAttribute('aria-hidden')
          );
          if (holder) holder.style.color = lerpHexColor(fromC, toC, ease);
        }
      } else if (toData?.type === 'shape') {
        const fromFill = morphHexOrNull(fromData?.fill);
        const toFill = morphHexOrNull(toData?.fill);
        const fromStroke = morphHexOrNull(fromData?.stroke);
        const toStroke = morphHexOrNull(toData?.stroke);
        const fromRx = fromData?.rx != null ? +fromData.rx : 0;
        const toRx = toData?.rx != null ? +toData.rx : 0;
        const fillChanged = fromFill && toFill && fromFill !== toFill;
        const strokeChanged = fromStroke && toStroke && fromStroke !== toStroke;
        const rxChanged = fromRx !== toRx;
        const geomChanged = morphGeomDirty(fromData, toData);
        if (fillChanged || strokeChanged || rxChanged || geomChanged) {
          const svg = domEl.querySelector('svg');
          if (svg) {
            const curFill = fillChanged ? lerpHexColor(fromFill, toFill, ease) : null;
            const curStroke = strokeChanged ? lerpHexColor(fromStroke, toStroke, ease) : null;
            const synth = lerpMorphEl(fromData, toData, ease);
            synth.fill = curFill || toData.fill;
            synth.stroke = curStroke || toData.stroke;
            // Fast path: a plain rect (the common rounded-rectangle case, including gradient
            // fills which just add a sibling <defs>) is one or two <rect> nodes — update
            // their attributes IN PLACE instead of tearing down and rebuilding the whole SVG
            // every frame. Rebuilding via innerHTML each frame is what caused the rounded
            // corners to visibly flicker along the straight edges (the browser has to
            // re-parse/re-rasterize brand new nodes 60 times/sec instead of just tweaking a
            // number on ones already there).
            const svgChildren = Array.from(svg.children);
            const rectEls = svgChildren.filter((c) => c.tagName?.toLowerCase() === 'rect');
            const otherEls = svgChildren.filter(
              (c) => !['rect', 'defs'].includes(c.tagName?.toLowerCase())
            );
            const plainRect = !geomChanged && rectEls.length > 0 && otherEls.length === 0;
            if (plainRect) {
              const rxAttr = shapeRxPx(synth.rx, toData.w, toData.h);
              rectEls.forEach((rectEl) => {
                rectEl.setAttribute('rx', rxAttr);
                rectEl.setAttribute('ry', rxAttr);
                if (curFill) rectEl.setAttribute('fill', curFill);
                if (curStroke) rectEl.setAttribute('stroke', curStroke);
              });
            } else if (svg.parentNode) {
              svg.parentNode.innerHTML = buildBasicShapeSVG(toData.shape || fromData.shape || 'rect', shapeOptsFromEl(synth));
            }
          }
          const shapeText = domEl.querySelector('.react-shape-text');
          if (shapeText && geomChanged) {
            const box = shapeTextBoxStyle(lerpMorphEl(fromData, toData, ease));
            Object.assign(shapeText.style, box);
          }
        }
      }
    } catch (e) {}
  }

  /** Undo any DOM color override left by applyMorphColor once the morph completes. */
  function resetMorphColor(domEl, toData) {
    try {
      if (toData?.type === 'text' || toData?.type === 'formula') {
        const holder = Array.from(domEl.querySelectorAll('.react-el-text > div')).find(
          (d) => !d.hasAttribute('aria-hidden')
        );
        // Set the exact final color rather than clearing to '' — clearing removes the
        // inline override entirely (rather than "restoring" React's own value), which is
        // what caused text to flash black right as the morph finished.
        if (holder) holder.style.color = toData.textColor || '#fff';
      } else if (toData?.type === 'shape') {
        const svg = domEl.querySelector('svg');
        if (svg && svg.parentNode) {
          svg.parentNode.innerHTML = buildBasicShapeSVG(toData.shape || 'rect', shapeOptsFromEl(toData));
        }
        const shapeText = domEl.querySelector('.react-shape-text');
        if (shapeText) Object.assign(shapeText.style, shapeTextBoxStyle(toData));
      }
    } catch (e) {}
  }

  /**
   * Build the wrapper's `transform` for one morph frame: translate (center-to-center offset)
   * + rotate + scale, composed so the box — whose actual left/top/width/height are fixed at
   * the TO values for the whole animation — visually sits at/looks like the FROM box at
   * ease=0 and eases to identity (its own natural TO look) at ease=1. Doing geometry purely
   * through `transform` (never touching width/height per frame) keeps this reflow-free, so
   * text inside doesn't re-wrap/jitter while the box appears to resize.
   */
  function buildMorphGeometryTransform(fromData, toData, ease) {
    const fromW = fromData.w || 100;
    const fromH = fromData.h || 60;
    const toW = toData.w || 100;
    const toH = toData.h || 60;
    const fCx = (fromData.x || 0) + fromW / 2;
    const fCy = (fromData.y || 0) + fromH / 2;
    const tCx = (toData.x || 0) + toW / 2;
    const tCy = (toData.y || 0) + toH / 2;
    const dx0 = fCx - tCx;
    const dy0 = fCy - tCy;
    const scaleX0 = fromW / Math.max(1, toW);
    const scaleY0 = fromH / Math.max(1, toH);
    const fromRot = +(fromData.rot || 0);
    const toRot = +(toData.rot || 0);

    const curDX = dx0 * (1 - ease);
    const curDY = dy0 * (1 - ease);
    let curScaleX = scaleX0 + (1 - scaleX0) * ease;
    let curScaleY = scaleY0 + (1 - scaleY0) * ease;
    const curRot = fromRot + (toRot - fromRot) * ease;
    if (toData.shapeFlipH) curScaleX *= -1;
    if (toData.shapeFlipV) curScaleY *= -1;

    const parts = [];
    if (curDX || curDY) parts.push(`translate(${curDX}px, ${curDY}px)`);
    if (curRot) parts.push(`rotate(${curRot}deg)`);
    if (curScaleX !== 1 || curScaleY !== 1) parts.push(`scale(${curScaleX}, ${curScaleY})`);
    return parts.length ? parts.join(' ') : '';
  }

  /** Parse `font-size:Npx` out of an element's raw `cs` style string, or null. */
  function morphFontSizePx(d) {
    const m = String(d?.cs || '').match(/font-size\s*:\s*([\d.]+)px/i);
    return m ? parseFloat(m[1]) : null;
  }

  /** Compute a text's true alignment anchor as a CSS transform-origin ("x% y%") so a font-size
   *  scale grows/shrinks from where the text actually reads from, not the box's geometric
   *  center (which visually "drags" left/top-anchored text sideways as it scales). */
  function morphTextOrigin(d) {
    const css = d?.cs || '';
    const alignRaw = (css.match(/text-align\s*:\s*([^;]+)/i) || [])[1];
    const align = (alignRaw || 'left').trim();
    const valign = d?.valign || (d?.type === 'formula' ? 'middle' : 'top');
    const xPct = align === 'center' ? '50%' : align === 'right' || align === 'end' ? '100%' : '0%';
    const yPct = valign === 'middle' ? '50%' : valign === 'bottom' ? '100%' : '0%';
    return `${xPct} ${yPct}`;
  }

  /**
   * Animate a font-size change during morph via a nested CSS scale on `.react-el-text`
   * rather than by literally changing the `fontSize` style each frame. Changing font-size
   * is a layout property — animating it directly forces the browser to re-wrap/re-flow the
   * text on every frame, which is what caused the text to visibly jitter/shake. Scaling is
   * compositor-only and reflow-free, and reaches an exact identity transform (no visible
   * distortion) at ease=1.
   */
  function applyMorphTextSize(el, fromData, toData, ease) {
    try {
      if (toData?.type !== 'text' && toData?.type !== 'formula') return;
      const dflt = toData?.type === 'formula' ? 40 : 36;
      const fromFs = morphFontSizePx(fromData) ?? dflt;
      const toFs = morphFontSizePx(toData) ?? dflt;
      const holder = el.querySelector('.react-el-text');
      if (!holder) return;
      const synth = lerpMorphEl(fromData, toData, ease);
      const warp = toData.type === 'text' ? shapeTextWarpCss(synth) : null;
      const sizeChanged = fromFs && toFs && fromFs !== toFs;
      const scale0 = sizeChanged ? fromFs / toFs : 1;
      const curScale = sizeChanged ? scale0 + (1 - scale0) * ease : 1;
      const parts = [];
      if (warp) parts.push(warp);
      if (Math.abs(curScale - 1) > 0.001) parts.push(`scale(${curScale})`);
      holder.style.transformOrigin = warp ? '0 0' : morphTextOrigin(toData);
      holder.style.transform = parts.join(' ');
    } catch (e) {}
  }

  /** Undo the temporary scale left by applyMorphTextSize — keep the destination warp. */
  function resetMorphTextSize(el, toData) {
    try {
      const holder = el.querySelector('.react-el-text');
      if (!holder) return;
      const warp = toData?.type === 'text' ? shapeTextWarpCss(toData) : null;
      holder.style.transform = warp || '';
      holder.style.transformOrigin = warp ? '0 0' : '';
    } catch (e) {}
  }

  function revealEl(elId, patch = {}) {
    setAnimState((prev) => ({
      ...prev,
      [elId]: { ...(prev[elId] || {}), hidden: false, ...patch },
    }));
  }

  function groupMembers(el, slide) {
    if (!el) return [];
    const pick = (lead, s) => {
      if (!lead || lead.groupId == null || lead.groupId === '' || !s?.els) return null;
      const gid = String(lead.groupId);
      const members = s.els.filter(
        (x) => x && !x._isDecor && x.groupId != null && x.groupId !== '' && String(x.groupId) === gid
      );
      return members.length > 1 ? members : null;
    };
    let out = pick(el, slide);
    if (out) return out;
    // Deferred playBundle can still hold a stale slides[idx] after goTo — recover from store.
    const storeSlide = usePresentationStore.getState().slides[idxRef.current];
    const storeEl =
      (storeSlide?.els || []).find((e) => e && String(e.id) === String(el.id)) || el;
    out = pick(storeEl, storeSlide);
    if (out) return out;
    out = pick(storeEl, slidesRef.current[idxRef.current]);
    if (out) return out;
    // Last resort: stage DOM already has data-gid on every member.
    const gid =
      storeEl?.groupId != null && storeEl.groupId !== ''
        ? String(storeEl.groupId)
        : el.groupId != null && el.groupId !== ''
          ? String(el.groupId)
          : '';
    if (gid && stageRef.current) {
      const nodes = [
        ...stageRef.current.querySelectorAll(`[data-gid="${CSS.escape(gid)}"]`),
      ];
      if (nodes.length > 1) {
        const pool = [
          ...(slide?.els || []),
          ...(storeSlide?.els || []),
          ...(slidesRef.current[idxRef.current]?.els || []),
        ];
        const byId = new Map();
        pool.forEach((e) => {
          if (e?.id != null && !byId.has(String(e.id))) byId.set(String(e.id), e);
        });
        const fromDom = nodes
          .map((n) => {
            const id = n.getAttribute('data-id');
            if (id == null || id === '') return null;
            return byId.get(String(id)) || { id, groupId: gid };
          })
          .filter(Boolean);
        if (fromDom.length > 1) return fromDom;
      }
    }
    return [el];
  }

  /** Snap every slide el back to authored box (clears baked moveTo left/top). */
  function resetAuthoredElBoxes(slide) {
    const root = stageRef.current;
    if (!root || !slide) return;
    (slide.els || []).forEach((d) => {
      if (!d || d._isDecor || d.id == null) return;
      const node = findStageEl(d.id);
      if (!node) return;
      cancelDomAnims(node);
      node.style.left = `${d.x || 0}px`;
      node.style.top = `${d.y || 0}px`;
      node.style.transform = elBoxTransform(d) || '';
      node.style.transition = '';
    });
  }

  function markGroupHidden(slideIdx, el, slide) {
    if (slideIdx == null || !el) return;
    if (!hiddenElsRef.current[slideIdx]) hiddenElsRef.current[slideIdx] = new Set();
    const set = hiddenElsRef.current[slideIdx];
    groupMembers(el, slide || usePresentationStore.getState().slides[slideIdx]).forEach((m) => {
      if (m?.id != null) set.add(String(m.id));
    });
  }

  function hideElsNow(ids) {
    if (!ids?.length) return;
    setAnimState((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = { ...(next[id] || {}), hidden: true, cls: null, live: false };
      });
      return next;
    });
  }

  function scheduleNavAfterAnim(slideIdx, el, anim, waitMs) {
    if (!anim || anim.navTarget == null) return;
    const list = usePresentationStore.getState().slides;
    const si = resolveNavTargetSlideIndex(anim.navTarget, list);
    if (si == null) return;
    const slide = list[slideIdx];
    window.setTimeout(() => {
      if (!useUiStore.getState().previewOpen) return;
      if (idxRef.current !== slideIdx) return;
      markGroupHidden(slideIdx, el, slide);
      flushSync(() => {
        hideElsNow(groupMembers(el, slide).map((m) => String(m.id)));
      });
      clearAutoTimer();
      goTo(si);
    }, Math.max(0, waitMs || 0));
  }

  function clearRideAnims() {
    (rideCancelRef.current || []).forEach((fn) => {
      try {
        fn();
      } catch (e) {}
    });
    rideCancelRef.current = [];
  }

  function startSlideRides(slide) {
    clearRideAnims();
    if (!slide || !stageRef.current) return;
    const root = stageRef.current;
    collectSlideRideSpecs(slide).forEach((spec) => {
      const node = root.querySelector(`[data-id="${CSS.escape(String(spec.elId))}"]`);
      if (!node) return;
      node.style.left = '0px';
      node.style.top = '0px';
      const cancel = startRideAnim(node, spec.d, {
        duration: spec.duration,
        gap: spec.gap,
        invert: spec.invert,
        opacity: spec.opacity,
        baseRot: spec.baseRot,
      });
      rideCancelRef.current.push(cancel);
    });
  }

  function clearBusyTimer() {
    if (busyTimerRef.current) {
      clearTimeout(busyTimerRef.current);
      busyTimerRef.current = null;
    }
  }

  /**
   * Always measure the live overlay/window — never trust a closed-over `vp` from an
   * earlier render. A busy-timer refit after moveTo/group anim used to re-apply the
   * pre-fullscreen scale while the outer box was already full-size → slide tucked
   * top-left with black bars.
   */
  function viewportSize() {
    const node = overlayRef.current;
    if (node && node.clientWidth > 2 && node.clientHeight > 2) {
      return { w: node.clientWidth, h: node.clientHeight };
    }
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      const fs = document.fullscreenElement;
      if (fs.clientWidth > 2 && fs.clientHeight > 2) {
        return { w: fs.clientWidth, h: fs.clientHeight };
      }
    }
    return {
      w: window.innerWidth || vp.w || 1,
      h: window.innerHeight || vp.h || 1,
    };
  }

  function fitScale() {
    const { w, h } = viewportSize();
    return Math.min(w / canvasW, h / canvasH);
  }

  function bumpCamTick(el) {
    const node = el || stageRef.current;
    if (node) setCamTransform(node.style.transform || '');
  }

  /**
   * Keep stage CSS scale in sync with the outer fit box.
   * When they drift (skip mid-enter zoom, fullscreen resize, abort camera with a
   * stale fit), the slide sits top-left at a partial scale with black bars.
   */
  function refitStage(cam) {
    const el = stageRef.current;
    if (!el) return;
    const { w, h } = viewportSize();
    // Keep React `vp` / outer box size aligned with what we just measured.
    if (Math.abs((vp.w || 0) - w) > 1 || Math.abs((vp.h || 0) - h) > 1) {
      setVp({ w, h });
    }
    const state = cam || el._pvCamState || fullSlideCam(canvasW, canvasH);
    applyCameraTransform(el, state, Math.min(w / canvasW, h / canvasH), canvasW, canvasH);
    bumpCamTick(el);
  }

  /** Instantly finish in-progress transition / camera / anim wait (2nd keypress). */
  function skipBusy() {
    // Camera may still be flying after the bundle busy timer cleared — treat that as busy too.
    if (!busy.current && !camAbortRef.current) return false;
    clearBusyTimer();
    if (camAbortRef.current) {
      try {
        camAbortRef.current.abort({ finish: true });
      } catch (e) {
        try {
          camAbortRef.current.abort();
        } catch (e2) {}
      }
      camAbortRef.current = null;
    }
    busy.current = false;
    setAnimClass('');
    // Clean up any outgoing-slide snapshot left over from an interrupted transition
    // (e.g. the user advanced again before the previous transition finished).
    try {
      overlayRef.current?.querySelectorAll('.pv-exit-snapshot').forEach((n) => n.remove());
    } catch (e) {}
    // abort({ finish }) rewrites transform with the fit captured at camera start —
    // always re-fit to the current viewport after clearing busy/enter anim.
    refitStage();
    return true;
  }

  function startStageCamera(el, cam, animOpts = {}) {
    if (!el || !cam) return null;
    const userDone = animOpts.onDone;
    return fireCameraAnim(el, cam, {
      W: canvasW,
      H: canvasH,
      fitScale: fitScale(),
      ...animOpts,
      onDone: () => {
        camAbortRef.current = null;
        // Viewport may have changed during the flight — re-fit with current scale.
        if (el._pvCamState) {
          applyCameraTransform(el, el._pvCamState, fitScale(), canvasW, canvasH);
        }
        bumpCamTick(el);
        userDone?.();
      },
    });
  }

  /**
   * @param {object} slide
   * @param {{ autoStartAfter?: number }} [opts]
   *   autoStartAfter — ms to wait before auto-firing the first camera/bundle.
   *   Must cover the slide enter transition: starting a camera while `.pv-enter-zoom`
   *   (scale 0.86→1) is still running makes the zoom look like it begins from a
   *   shrunk screen; click-advance works because the enter anim has already finished.
   */
  function initSlideAnims(slide, opts = {}) {
    if (camAbortRef.current) {
      camAbortRef.current.abort();
      camAbortRef.current = null;
    }
    clearBusyTimer();
    busy.current = false;
    cumMotionRef.current = {};
    motionGenRef.current = {};
    pendingMotionEndRef.current = {};
    skippedRepeatRef.current = new Set();
    slidePlayGenRef.current += 1;
    clickSlideTimersArmedRef.current = new Set();
    clearStageFx(stageRef.current);
    animSlideRef.current = slide || null;
    stepsRef.current = collectSlidePlaybackSteps(slide);
    stepIRef.current = 0;
    const state = {};
    const slideIdx = idxRef.current;
    const persisted = hiddenElsRef.current[slideIdx] || new Set();
    (slide?.els || []).forEach((el) => {
      if (!el || el._isDecor) return;
      if (persisted.has(String(el.id))) {
        state[el.id] = { hidden: true };
        return;
      }
      if (!Array.isArray(el.anims) || !el.anims.length) return;
      const hasEntrance = el.anims.some((a) => a && isEntranceAnim(a.name));
      const hasCosmosOrCaption = el.anims.some(
        (a) => a && (a.name === 'cosmosTitle' || a.name === 'captionSlide')
      );
      if (hasEntrance || hasCosmosOrCaption) {
        // Entrance on any member hides the whole group until playback reveals them together.
        groupMembers(el, slide).forEach((m) => {
          if (m?.id != null) state[m.id] = { hidden: true };
        });
      }
    });
    // Full replace — drop any leftover motionTx/Ty from a previous visit so a
    // returning group moveTo starts every member from the authored box again.
    flushSync(() => setAnimState(state));
    // After React commits the cleared offsets, snap any leftover inline left/top.
    requestAnimationFrame(() => resetAuthoredElBoxes(slide));
    const fit = fitScale();
    if (stageRef.current) {
      stageRef.current._pvCamInited = true;
      applyCameraTransform(stageRef.current, fullSlideCam(canvasW, canvasH), fit, canvasW, canvasH);
      bumpCamTick(stageRef.current);
      // Prepare non-invert recolor silhouettes
      (slide?.els || []).forEach((d) => {
        if (!d || d._isDecor) return;
        const node = findStageEl(d.id);
        if (node) prepareRecolorEl(node, d);
      });
    }
    // Kick off the slide's own first step if it doesn't need a click to start —
    // a camera move, or a bundle whose trigger is "auto" ("after previous"; there's no
    // previous step on a fresh slide, so its "previous" is the slide appearing). Without
    // this, nothing ever called playNextAnimStep() until the *next* navigation action, so
    // every animation effectively behaved like "on click" regardless of its own trigger.
    const first = stepsRef.current[0];
    if (first && (first.kind === 'camera' || (first.kind === 'bundle' && first.auto))) {
      // Cancel any not-yet-fired auto-start from a previous call — initSlideAnims can run
      // twice in a row for the same slide (e.g. React StrictMode double-invoking the mount
      // effect in dev), and without this both scheduled calls would fire, each resetting
      // stepIRef back to 0 and independently kicking off playNextAnimStep(): the animation
      // would visibly restart partway through and play twice.
      if (autoStartAnimTimerRef.current) {
        clearTimeout(autoStartAnimTimerRef.current);
        autoStartAnimTimerRef.current = null;
      }
      const wait = Math.max(30, Math.round(+opts.autoStartAfter || 30));
      autoStartAnimTimerRef.current = setTimeout(() => {
        autoStartAnimTimerRef.current = null;
        if (idxRef.current !== slideIdx) return;
        // User already click-advanced — don't fire the deferred auto start.
        if (stepIRef.current !== 0) return;
        // Re-sync full-slide camera + fit so we don't inherit a mid-enter scale.
        const el = stageRef.current;
        if (el) {
          el._pvCamInited = true;
          applyCameraTransform(el, fullSlideCam(canvasW, canvasH), fitScale(), canvasW, canvasH);
          bumpCamTick(el);
        }
        // Ref — not playNextAnimStep from this render (stale slides[idx] after goTo).
        playNextAnimStepRef.current();
      }, wait);
    }
  }

  function cancelDomAnims(el) {
    if (!el || typeof el.getAnimations !== 'function') return;
    try {
      el.getAnimations().forEach((a) => {
        try {
          a.cancel();
        } catch (_) {
          /* ignore */
        }
      });
    } catch (_) {
      /* ignore */
    }
  }

  /** Bake unfinished moveTo ends into cum so the next step/repeat does not drift. */
  function commitPendingMotion(onlyIds) {
    const pending = pendingMotionEndRef.current;
    const ids = onlyIds
      ? onlyIds.map(String).filter((id) => pending[id])
      : Object.keys(pending);
    if (!ids.length) return;
    const patch = {};
    ids.forEach((elId) => {
      const p = pending[elId];
      if (!p) return;
      cumMotionRef.current[elId] = { tx: +p.tx || 0, ty: +p.ty || 0 };
      patch[elId] = {
        motionTx: +p.tx || 0,
        motionTy: +p.ty || 0,
        motionPlaying: false,
      };
      delete pending[elId];
    });
    if (!Object.keys(patch).length) return;
    setAnimState((s) => {
      const next = { ...s };
      Object.keys(patch).forEach((elId) => {
        next[elId] = { ...(s[elId] || {}), hidden: false, ...patch[elId] };
      });
      return next;
    });
  }

  function resetMotionForRepeatCycle(bundle) {
    const ids = new Set();
    const liveIds = new Set();
    const rid = bundle?.repeatId;
    const slide =
      animSlideRef.current || slidesRef.current[idxRef.current] || slides[idx] || {};
    const collect = (step) => {
      if (!step?.elId) return;
      const elData = (slide.els || []).find((e) => e && String(e.id) === String(step.elId));
      const members = groupMembers(elData || { id: step.elId }, slide);
      if (isMotionAnim(step.name)) {
        members.forEach((m) => {
          if (m?.id != null) ids.add(String(m.id));
        });
      }
      if (isFloatAnim(step.name) || isDanceAnim(step.name) || isSwingAnim(step.name)) {
        members.forEach((m) => {
          if (m?.id != null) liveIds.add(String(m.id));
        });
      }
    };
    (bundle?.items || []).forEach(collect);
    // Whole repeat body (pause may lead the cycle — still reset later moveTos).
    if (rid) {
      (stepsRef.current || []).forEach((b) => {
        if (!b || b.repeatId !== rid) return;
        (b.items || []).forEach(collect);
      });
    }
    liveIds.forEach((elId) => {
      const el = findStageEl(elId);
      if (!el) return;
      clearFloat(el);
      clearDance(el);
      clearSwing(el);
      cancelDomAnims(el);
    });
    if (!ids.size) return;
    const resetPatch = {};
    ids.forEach((elId) => {
      // Drop unfinished ends — cycle restarts from authored origin, not mid-move.
      delete pendingMotionEndRef.current[elId];
      // Invalidate in-flight settles from the previous cycle before they bake left/top.
      motionGenRef.current[elId] = (motionGenRef.current[elId] || 0) + 1;
      cumMotionRef.current[elId] = { tx: 0, ty: 0 };
      const elData = (slide.els || []).find((e) => e && String(e.id) === String(elId));
      const el = findStageEl(elId);
      if (el) {
        cancelDomAnims(el);
        if (elData) {
          el.style.left = `${elData.x || 0}px`;
          el.style.top = `${elData.y || 0}px`;
          el.style.transform = elBoxTransform(elData) || '';
        }
        el.style.transition = '';
      }
      resetPatch[elId] = true;
    });
    setAnimState((s) => {
      const next = { ...s };
      Object.keys(resetPatch).forEach((elId) => {
        next[elId] = {
          ...(s[elId] || {}),
          hidden: false,
          motionTx: 0,
          motionTy: 0,
          motionPlaying: false,
        };
      });
      return next;
    });
  }

  function playBundle(bundle) {
    const items = bundle.items || [];
    if (!items.length) return 0;
    // Prefer the slide initSlideAnims collected steps from. slides[idx] is wrong when
    // this function is invoked from a deferred auto-start that closed over the previous render.
    const slide =
      animSlideRef.current || slidesRef.current[idxRef.current] || slides[idx] || {};
    const hiddenSet = hiddenElsRef.current[idxRef.current] || new Set();
    let maxWait = 0;
    const inRepeat = !!(
      bundle.repeatId ||
      bundle.repeatCycleStart ||
      bundle.repeatInfinite ||
      items.some((it) => it && (it.repeatId || it.repeatCycleStart || it.repeatInfinite))
    );
    // Start of a repeat cycle → snap motion els back to authored origin (loop from start).
    if (bundle.repeatCycleStart || items.some((it) => it && it.repeatCycleStart)) {
      resetMotionForRepeatCycle(bundle);
    }
    items.forEach((step) => {
      if (step.kind === 'camera') {
        const el = stageRef.current;
        if (el) {
          if (camAbortRef.current) {
            try {
              camAbortRef.current.abort();
            } catch (e) {}
            camAbortRef.current = null;
          }
          camAbortRef.current = startStageCamera(el, step.cam, {
            delay: step.delay || 0,
            duration: step.dur,
          });
        }
        const wait = (step.delay || 0) + (step.dur || 1200);
        if (wait > maxWait) maxWait = wait;
        return;
      }
      if (step.elId && hiddenSet.has(String(step.elId))) return;
      if (step.pause || step.name === 'pause') {
        const wait = Math.max(0, (step.delay || 0) + (step.dur || 0));
        if (wait > maxWait) maxWait = wait;
        return;
      }

      if (isSpecialAnim(step.name)) {
        const elDataRaw =
          (slide.els || []).find((e) => e && String(e.id) === String(step.elId)) || null;
        const elData = elDataRaw
          ? { ...elDataRaw }
          : { id: step.elId, rot: step.rot || 0 };

        // Motion must not bail on a missing leader node — after slide switch the stage
        // remounts and siblings can appear a frame later than the anim auto-start.
        if (isMotionAnim(step.name)) {
          const members = groupMembers(elDataRaw || elData, slide);
          const slideIdx = idxRef.current;
          const playGen = slidePlayGenRef.current;
          const dur = Math.max(50, +(step.dur || 600));
          const delay = Math.max(0, +(step.delay || 0));
          // rAF tween + setTimeout chain in repeat: leave slack so the next auto
          // step does not cut the move short mid-flight.
          const theoreticalWait = delay + dur + 64;
          if (theoreticalWait > maxWait) maxWait = theoreticalWait;

          const memberIds = members
            .filter((m) => m?.id != null)
            .map((m) => String(m.id));
          // Kill in-flight tweens first, then bake their intended ends into cum so a
          // Repeat/auto chain never resumes from a half-finished offset.
          memberIds.forEach((id) => {
            motionGenRef.current[id] = (motionGenRef.current[id] || 0) + 1;
          });
          commitPendingMotion(memberIds);

          const starts = [];
          const startPatch = {};
          members.forEach((member) => {
            if (member?.id == null) return;
            const memberId = String(member.id);
            const prev = cumMotionRef.current[memberId] || { tx: 0, ty: 0 };
            const tx0 = +prev.tx || 0;
            const ty0 = +prev.ty || 0;
            starts.push({ member, memberId, tx0, ty0 });
            startPatch[memberId] = {
              hidden: false,
              motionTx: tx0,
              motionTy: ty0,
              motionPlaying: true,
              cls: undefined,
            };
            // Gen already bumped above; keep the same token for this tween.
          });
          if (!starts.length) return;

          // rotate / mirror still need WAAPI on each node (no left/top delta).
          if (step.name === 'rotate' || step.name === 'mirror') {
            setAnimState((s) => {
              const next = { ...s };
              Object.keys(startPatch).forEach((id) => {
                next[id] = { ...(s[id] || {}), ...startPatch[id] };
              });
              return next;
            });
            const motionOpts = {
              name: step.name,
              dur: step.dur,
              delay: step.delay,
              rotateDir: step.rotateDir,
              rotateDeg: step.rotateDeg,
              mirrorAxis: step.mirrorAxis,
              easing: step.easing,
            };
            let left = starts.length;
            starts.forEach(({ member, memberId, tx0, ty0 }) => {
              const gen = motionGenRef.current[memberId];
              const dom = findStageEl(member.id);
              if (!dom) {
                left -= 1;
                return;
              }
              cancelDomAnims(dom);
              fireMotionAnim(
                dom,
                { rot: step.rot || member.rot || 0 },
                motionOpts,
                tx0,
                ty0,
                () => {
                  if (slidePlayGenRef.current !== playGen) return;
                  if (idxRef.current !== slideIdx) return;
                  if (motionGenRef.current[memberId] !== gen) return;
                  left -= 1;
                  if (left > 0) return;
                  setAnimState((s) => {
                    const next = { ...s };
                    starts.forEach((st) => {
                      const prior = next[st.memberId] || {};
                      next[st.memberId] = {
                        ...prior,
                        motionTx: st.tx0,
                        motionTy: st.ty0,
                        motionPlaying: false,
                      };
                    });
                    return next;
                  });
                }
              );
            });
            return;
          }

          // moveTo / pathTo / orbitTo: tween motionTx/Ty for EVERY group member in one
          // setState per frame — no WAAPI transform (that only moved the leader).
          const offsetAt = (t) => {
            if (step.name === 'pathTo' || (step.name === 'moveTo' && step.pathPts?.length)) {
              const frames = samplePathFrames(pathPtsOf(step), Math.max(24, Math.round(dur / 20)));
              if (!frames.length) return pathEndDelta(step);
              const idxF = Math.min(frames.length - 1, Math.round(t * (frames.length - 1)));
              const p = frames[idxF] || frames[frames.length - 1];
              return { tx: p.x || 0, ty: p.y || 0 };
            }
            if (step.name === 'orbitTo') {
              const dir = (step.orbitDir || 'cw') === 'cw' ? 1 : -1;
              const totalDeg = (step.orbitDeg != null ? step.orbitDeg : 360) * dir;
              const ocx = step.orbitCx || 0;
              const ocy = step.orbitCy || 0;
              const r = Math.sqrt(ocx * ocx + ocy * ocy) || orbitRadius(step) || 120;
              const startAngle = Math.atan2(-ocy, -ocx);
              const ang = startAngle + ((totalDeg * Math.PI) / 180) * t;
              return {
                tx: ocx + r * Math.cos(ang),
                ty: ocy + r * Math.sin(ang),
              };
            }
            const d = moveToDelta(step);
            return { tx: d.tx * t, ty: d.ty * t };
          };
          const endDelta = offsetAt(1);
          starts.forEach((st) => {
            pendingMotionEndRef.current[st.memberId] = {
              tx: st.tx0 + endDelta.tx,
              ty: st.ty0 + endDelta.ty,
            };
          });

          setAnimState((s) => {
            const next = { ...s };
            Object.keys(startPatch).forEach((id) => {
              next[id] = { ...(s[id] || {}), ...startPatch[id] };
            });
            return next;
          });

          const easeName = animEasingCss(step.easing);
          const ease = (t) => {
            if (easeName === 'ease-in') return t * t;
            if (easeName === 'ease-out') return 1 - (1 - t) * (1 - t);
            if (easeName === 'ease-in-out') {
              return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            }
            return t;
          };

          const gens = {};
          starts.forEach((st) => {
            gens[st.memberId] = motionGenRef.current[st.memberId];
          });
          const stillCurrent = () =>
            slidePlayGenRef.current === playGen &&
            idxRef.current === slideIdx &&
            starts.every((st) => motionGenRef.current[st.memberId] === gens[st.memberId]);

          const settleTween = () => {
            starts.forEach((st) => {
              const endTx = st.tx0 + endDelta.tx;
              const endTy = st.ty0 + endDelta.ty;
              cumMotionRef.current[st.memberId] = { tx: endTx, ty: endTy };
              delete pendingMotionEndRef.current[st.memberId];
            });
            setAnimState((s) => {
              const next = { ...s };
              starts.forEach((st) => {
                const prior = next[st.memberId] || {};
                const stayHidden = !!prior.particles || !!prior.hidden;
                next[st.memberId] = {
                  ...prior,
                  hidden: stayHidden,
                  motionTx: st.tx0 + endDelta.tx,
                  motionTy: st.ty0 + endDelta.ty,
                  motionPlaying: false,
                };
              });
              return next;
            });
            requestAnimationFrame(() => refitStage());
          };

          const runTween = () => {
            if (!stillCurrent()) {
              // Superseded before start — keep pending end for the next starter to commit.
              return;
            }
            const t0 = performance.now();
            const tick = (now) => {
              if (!stillCurrent()) return;
              const raw = Math.min(1, (now - t0) / dur);
              const e = ease(raw);
              const off = offsetAt(e);
              setAnimState((s) => {
                const next = { ...s };
                starts.forEach((st) => {
                  const prior = next[st.memberId] || {};
                  next[st.memberId] = {
                    ...prior,
                    hidden: false,
                    motionTx: st.tx0 + off.tx,
                    motionTy: st.ty0 + off.ty,
                    motionPlaying: true,
                  };
                });
                return next;
              });
              if (raw < 1) {
                requestAnimationFrame(tick);
                return;
              }
              settleTween();
            };
            // Start this frame (no extra outer rAF) so delay+dur matches the busy timer.
            tick(t0);
          };
          if (delay > 0) setTimeout(runTween, delay);
          else runTween();
          return;
        }

        const el = findStageEl(step.elId);
        if (!el) return;
        const keepHidden =
          isCosmosTitleAnim(step.name) ||
          isCaptionSlideAnim(step.name) ||
          isParticlesAnim(step.name);
        revealEl(step.elId, {
          live: !keepHidden,
          cls: null,
          hidden: keepHidden,
          particles: isParticlesAnim(step.name),
        });
        if (!keepHidden) {
          el.style.visibility = 'visible';
          el.style.opacity = '';
        } else {
          el.style.visibility = 'hidden';
          el.style.pointerEvents = 'none';
        }
        el.style.overflow = 'visible';

        // Enrich elData from live DOM when the store stub was minimal.
        if (elData.x == null) {
          elData.x = parseFloat(el.style.left) || 0;
          elData.y = parseFloat(el.style.top) || 0;
          elData.w = parseFloat(el.style.width) || el.offsetWidth;
          elData.h = parseFloat(el.style.height) || el.offsetHeight;
          elData.type = el.dataset?.type;
        }

        if (isFloatAnim(step.name)) {
          const members = groupMembers(elData, slide);
          const raw = {
            name: 'float',
            dur: step.dur,
            delay: step.delay,
            swingCount: step.swingCount,
          };
          const anim = inRepeat ? floatAnimForRepeatCycle(raw) : raw;
          const frames =
            members.length > 1 ? floatFramesForGroup(members, elData.groupId) : undefined;
          members.forEach((m) => {
            const dom = findStageEl(m.id) || (String(m.id) === String(step.elId) ? el : null);
            if (!dom) return;
            revealEl(m.id, { live: true, cls: null, hidden: false });
            fireFloatAnim(dom, m, anim, {
              frames,
              groupMembers: members,
              groupId: elData.groupId,
            });
          });
          const wait = floatWaitMsForPlayback(raw, { inRepeat });
          if (wait > maxWait) maxWait = wait;
          return;
        }
        if (isDanceAnim(step.name)) {
          const members = groupMembers(elData, slide);
          const raw = {
            name: 'dance',
            dur: step.dur,
            delay: step.delay,
            swingCount: step.swingCount,
          };
          const anim = inRepeat ? danceAnimForRepeatCycle(raw) : raw;
          members.forEach((m) => {
            const dom = findStageEl(m.id) || (String(m.id) === String(step.elId) ? el : null);
            if (!dom) return;
            revealEl(m.id, { live: true, cls: null, hidden: false });
            fireDanceAnim(dom, m, anim);
          });
          const wait = danceWaitMsForPlayback(raw, { inRepeat });
          if (wait > maxWait) maxWait = wait;
          return;
        }
        if (isSwingAnim(step.name)) {
          const members = groupMembers(elData, slide);
          const raw = {
            name: 'swing',
            dur: step.dur,
            delay: step.delay,
            swingCount: step.swingCount,
            swingOx: step.swingOx,
            swingOy: step.swingOy,
          };
          const anim = inRepeat ? swingAnimForRepeatCycle(raw) : raw;
          members.forEach((m) => {
            const dom = findStageEl(m.id) || (String(m.id) === String(step.elId) ? el : null);
            if (!dom) return;
            revealEl(m.id, { live: true, cls: null, hidden: false });
            fireSwingAnim(dom, m, anim);
          });
          const wait = swingWaitMsForPlayback(raw, { inRepeat });
          if (wait > maxWait) maxWait = wait;
          return;
        }
        if (isInkDrawAnim(step.name)) {
          const result = fireInkDrawAnim(el, elData, {
            name: 'inkDraw',
            dur: step.dur,
            delay: step.delay,
            swingCount: step.swingCount,
            inkParallel: step.inkParallel,
          });
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isParticlesAnim(step.name)) {
          const elId = step.elId;
          const slideIdx = idxRef.current;
          const result = fireParticlesAnim(el, elData, {
            name: 'particles',
            dur: step.dur,
            delay: step.delay,
            particleCount: step.particleCount,
            ptDir: step.ptDir,
            ptLife: step.ptLife,
            ptSizeRand: step.ptSizeRand,
            ptRot: step.ptRot,
            ptSpread: step.ptSpread,
            swingCount: step.swingCount,
          }, {
            onDone: () => {
              if (idxRef.current !== slideIdx) return;
              markGroupHidden(slideIdx, elData, slide);
              setAnimState((prev) => ({
                ...prev,
                [elId]: {
                  ...(prev[elId] || {}),
                  hidden: true,
                  particles: false,
                  live: false,
                },
              }));
            },
          });
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isCosmosTitleAnim(step.name)) {
          hideElsNow(groupMembers(elData, slide).map((m) => String(m.id)));
          const result = fireCosmosTitleForEl(
            elData,
            slide,
            { name: 'cosmosTitle', dur: step.dur, delay: step.delay },
            {
              hideAfter: true,
              onHide: (ids) => {
                hideElsNow(ids);
                markGroupHidden(idxRef.current, elData, slide);
              },
            },
            (id) => findStageEl(id)
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isCaptionSlideAnim(step.name)) {
          const result = fireCaptionSlideAnim(
            el,
            {
              name: 'captionSlide',
              dur: step.dur,
              delay: step.delay,
              holdDuration: step.holdDuration,
              captionDir: step.captionDir,
            },
            {
              hideAfter: true,
              onHide: () => revealEl(step.elId, { hidden: true, live: false }),
            }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isSplitHalfAnim(step.name)) {
          const result = fireSplitHalfAnim(
            el,
            { name: 'splitHalf', dur: step.dur, delay: step.delay },
            {
              hideAfter: true,
              onHide: () => {
                const elData2 =
                  (slide.els || []).find((e) => e && String(e.id) === String(step.elId)) || {
                    id: step.elId,
                  };
                markGroupHidden(idxRef.current, elData2, slide);
                hideElsNow(groupMembers(elData2, slide).map((m) => String(m.id)));
              },
            }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isLangFadeAnim(step.name)) {
          const result = fireLangFadeAnim(el, elData, {
            name: 'langFade',
            dur: step.dur,
            delay: step.delay,
            fromHtml: step.fromHtml,
            toHtml: step.toHtml,
          });
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isTypewriterAnim(step.name)) {
          const result = fireTypewriterAnim(el, elData, {
            name: 'typewriter',
            dur: step.dur,
            delay: step.delay,
            charDelay: step.charDelay,
            fromHtml: step.fromHtml,
            toHtml: step.toHtml,
          });
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isTransformAnim(step.name)) {
          const from = step.from || snapshotTransformProps(elData);
          const to = step.to || from;
          const result = fireTransformAnim(
            el,
            from,
            to,
            {
              name: 'transform',
              dur: step.dur,
              delay: step.delay,
              easing: step.easing,
            },
            { theme: getTheme(usePresentationStore.getState().appliedThemeIdx) }
          );
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isRecolorAnim(step.name)) {
          const elId = step.elId;
          const slideIdx = idxRef.current;
          const wait = fireRecolorAnim(
            el,
            elData,
            {
              name: 'recolor',
              dur: step.dur,
              delay: step.delay,
              recolorColor: step.recolorColor,
              recolorInvert: step.recolorInvert,
            },
            {
              onStart: () => {
                if (idxRef.current !== slideIdx) return;
                setAnimState((prev) => ({
                  ...prev,
                  [elId]: { ...(prev[elId] || {}), recolorPlaying: true, recolorDone: false },
                }));
              },
              onDone: (info) => {
                if (idxRef.current !== slideIdx) return;
                setAnimState((prev) => ({
                  ...prev,
                  [elId]: {
                    ...(prev[elId] || {}),
                    recolorPlaying: false,
                    recolorDone: !!info?.toColor,
                  },
                }));
              },
            }
          );
          if (wait > maxWait) maxWait = wait;
          return;
        }
        if (isUncropAnim(step.name)) {
          const elId = step.elId;
          const waitU = (step.delay || 0) + (step.dur || 400);
          const apply = () => {
            setAnimState((prev) => {
              const revealing = !prev[elId]?.uncropDone;
              return {
                ...prev,
                [elId]: {
                  ...(prev[elId] || {}),
                  hidden: false,
                  uncrop: revealing,
                  uncropDone: revealing,
                  dur: step.dur || 400,
                },
              };
            });
          };
          if (step.delay > 0) setTimeout(apply, step.delay);
          else apply();
          if (waitU > maxWait) maxWait = waitU;
          return;
        }
        return;
      }

      const live =
        isLiveAnim(step.name) || (isPulseFamilyAnim(step.name) && pulseIsInfinite(step));
      // Outside a repeat, live/infinite anims don't block the timeline (wait 0).
      // Inside a repeat they must occupy their authored duration so the cycle can
      // finish and restart cleanly.
      const wait = live
        ? inRepeat
          ? Math.max(0, (step.delay || 0) + (step.dur || 600))
          : 0
        : isPulseFamilyAnim(step.name)
          ? pulseWaitMs(step)
          : (step.delay || 0) + (step.dur || 600);
      if (wait > maxWait) maxWait = wait;
      const elData =
        (slide.els || []).find((e) => e && String(e.id) === String(step.elId)) || { id: step.elId };
      const members = groupMembers(elData, slide);
      const apply = () => {
        setAnimState((prev) => {
          const next = { ...prev };
          members.forEach((m) => {
            if (!m?.id) return;
            const prior = next[m.id] || {};
            next[m.id] = {
              ...prior,
              hidden: false,
              cls: animCssClass(step.name),
              dur: step.dur,
              live,
              // Keep baked post-moveTo offset (applied via left/top when !motionPlaying).
              motionTx: prior.motionTx,
              motionTy: prior.motionTy,
              motionPlaying: false,
              swingCount: isPulseFamilyAnim(step.name)
                ? step.swingCount != null
                  ? step.swingCount
                  : 1
                : undefined,
            };
          });
          return next;
        });
      };
      if (step.delay > 0) setTimeout(apply, step.delay);
      else apply();
      if (!live && isExitAnim(step.name)) {
        window.setTimeout(() => {
          if (idxRef.current !== idx) return;
          markGroupHidden(idx, elData, slide);
          hideElsNow(members.map((m) => String(m.id)));
        }, wait);
      }
    });
    return maxWait;
  }

  /** Last camera payload inside a playback step (top-level or bundle item). */
  function cameraItemFromStep(step) {
    if (!step) return null;
    if (step.kind === 'camera' && step.cam) return step;
    if (step.kind === 'bundle') {
      const items = step.items || [];
      for (let k = items.length - 1; k >= 0; k--) {
        const it = items[k];
        if (it?.kind === 'camera' && it.cam) return it;
      }
    }
    return null;
  }

  /** Camera view after all camera steps with index < beforeIdx (else full slide). */
  function cameraStateBefore(beforeIdx) {
    const steps = stepsRef.current || [];
    let target = fullSlideCam(canvasW, canvasH);
    for (let j = 0; j < beforeIdx; j++) {
      const camStep = cameraItemFromStep(steps[j]);
      if (!camStep?.cam) continue;
      const c = camStep.cam;
      target = {
        cx: +c.cx,
        cy: +c.cy,
        w: +c.w || canvasW,
        h: +c.h || canvasH,
        rot: +c.rot || 0,
        duration: c.duration != null ? +c.duration : camStep.dur || 600,
      };
    }
    return target;
  }

  function runCameraTo(targetCam, dur) {
    const el = stageRef.current;
    if (!el) return false;
    busy.current = true;
    if (camAbortRef.current) {
      try {
        camAbortRef.current.abort();
      } catch (e) {}
      camAbortRef.current = null;
    }
    camAbortRef.current = startStageCamera(el, targetCam, {
      delay: 0,
      duration: Math.max(200, +(dur || 600)),
      onDone: () => {
        busy.current = false;
      },
    });
    return true;
  }

  /** Undo last played step; reverse camera to the prior view. */
  function playPrevAnimStep() {
    const steps = stepsRef.current;
    const i = stepIRef.current;
    // Cameras live inside bundles — treat any in-flight camera as reversible.
    if (i <= 0 && !camAbortRef.current) return false;

    if (autoStartAnimTimerRef.current) {
      clearTimeout(autoStartAnimTimerRef.current);
      autoStartAnimTimerRef.current = null;
    }

    // Mid-flight camera → snap back to where this step started.
    if (camAbortRef.current) {
      try {
        camAbortRef.current.abort({ revert: true });
      } catch (e) {
        try {
          camAbortRef.current.abort();
        } catch (e2) {}
      }
      camAbortRef.current = null;
      busy.current = false;
      clearBusyTimer();
      stepIRef.current = Math.max(0, i - 1);
      bumpCamTick(stageRef.current);
      return true;
    }

    if (busy.current) skipBusy();

    const undoIdx = stepIRef.current - 1;
    if (undoIdx < 0) return false;
    const undone = steps[undoIdx];
    stepIRef.current = undoIdx;

    const camStep = cameraItemFromStep(undone);
    if (camStep) {
      const target = cameraStateBefore(undoIdx);
      const dur = camStep.dur || camStep.cam?.duration || 600;
      return runCameraTo(target, dur);
    }

    // Non-camera: index rewound; camera view unchanged.
    return true;
  }

  function playNextAnimStep() {
    const steps = stepsRef.current;
    let i = stepIRef.current;
    if (i >= steps.length) return false;

    const runFrom = (startIdx) => {
      let idx = startIdx;
      const step = steps[idx];
      if (!step) return false;
      stepIRef.current = idx + 1;

      if (step.kind === 'camera') {
        const el = stageRef.current;
        if (!el) return true;
        busy.current = true;
        if (camAbortRef.current) {
          try {
            camAbortRef.current.abort();
          } catch (e) {}
          camAbortRef.current = null;
        }
        camAbortRef.current = startStageCamera(el, step.cam, {
          delay: step.delay || 0,
          duration: step.dur,
          onDone: () => {
            busy.current = false;
            const next = steps[stepIRef.current];
            if (next && next.kind === 'bundle' && next.auto) {
              busy.current = true;
              clearBusyTimer();
              busyTimerRef.current = setTimeout(() => {
                busyTimerRef.current = null;
                busy.current = false;
                runFrom(stepIRef.current);
              }, 0);
            }
          },
        });
        return true;
      }

      if (step.kind === 'bundle') {
        busy.current = true;
        const wait = playBundle(step);
        clearBusyTimer();
        const slideIdxAtPlay = idxRef.current;
        busyTimerRef.current = setTimeout(() => {
          busyTimerRef.current = null;
          busy.current = false;
          // Long transform / enter can leave stage scale behind the outer fit box.
          refitStage();
          if (idxRef.current !== slideIdxAtPlay) return;
          const next = steps[stepIRef.current];
          if (next && next.kind === 'bundle' && next.auto) {
            runFrom(stepIRef.current);
            return;
          }
          // Infinite repeat: only after the *last* step of this cycle (not mid-cycle).
          if (
            step.repeatInfinite &&
            step.repeatId &&
            !skippedRepeatRef.current.has(step.repeatId)
          ) {
            const moreInCycle =
              next && next.kind === 'bundle' && next.repeatId === step.repeatId;
            if (!moreInCycle) {
              const start = steps.findIndex(
                (b) =>
                  b &&
                  b.kind === 'bundle' &&
                  b.repeatId === step.repeatId &&
                  b.repeatCycleStart
              );
              if (start >= 0) {
                stepIRef.current = start;
                runFrom(start);
              }
            }
          }
        }, Math.max(50, wait));
        return true;
      }

      if (step.elId) {
        playBundle({ items: [step] });
        return true;
      }
      return false;
    };

    return runFrom(i);
  }

  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);

  const classSlide = open ? slides[idx] || {} : null;
  const classAppletForSlide = classSlide ? findClassificationApplet(classSlide) : null;
  const classIdsKey = classAppletForSlide
    ? `${classAppletForSlide.classLayout || '2col'}|${
        Array.isArray(classAppletForSlide.classZones)
          ? classAppletForSlide.classZones.join(';')
          : `${classAppletForSlide.classLeftIds || ''}|${classAppletForSlide.classRightIds || ''}`
      }`
    : '';

  // Classification: reshuffle listed elements each time the slide is shown.
  useEffect(() => {
    if (!open) {
      setClassLivePos(null);
      setClassResult(null);
      return;
    }
    const s = slides[idx] || {};
    const applet = findClassificationApplet(s);
    if (!applet) {
      setClassLivePos(null);
      setClassResult(null);
      return;
    }
    const movable = classificationMovableIds(applet, s.els || []);
    setClassLivePos(shuffleClassificationPositions(s.els || [], movable, canvasW, canvasH));
    setClassResult(null);
    classReplayRef.current = false;
    window.setTimeout(() => {
      postClassificationBtnMode(stageRef.current, applet, 'check');
    }, 80);
    // Only on enter / orientation / id-list change — not every slides identity tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idx, canvasW, canvasH, classIdsKey]);

  useEffect(() => {
    if (!open) return undefined;
    const onMsg = (e) => {
      const type = e?.data?.type;
      if (type !== 'classificationCheck' && type !== 'classificationReplay') return;
      const s = slides[idxRef.current] || {};
      const applet = findClassificationApplet(s);
      if (!applet) return;

      if (type === 'classificationReplay' || classReplayRef.current) {
        const movable = classificationMovableIds(applet, s.els || []);
        setClassLivePos(shuffleClassificationPositions(s.els || [], movable, canvasW, canvasH));
        setClassResult(null);
        classReplayRef.current = false;
        postClassificationBtnMode(stageRef.current, applet, 'check');
        return;
      }

      const ok = checkClassification(applet, s.els || [], classLivePosRef.current, canvasW, canvasH);
      const text = ok
        ? applet.classOkText || CLASSIFICATION_DEFAULTS.classOkText
        : applet.classFailText || CLASSIFICATION_DEFAULTS.classFailText;
      setClassResult({ ok, text });
      if (ok) {
        classReplayRef.current = true;
        postClassificationBtnMode(
          stageRef.current,
          applet,
          'replay',
          applet.classReplayLabel || CLASSIFICATION_DEFAULTS.classReplayLabel,
        );
      } else {
        classReplayRef.current = false;
        postClassificationBtnMode(stageRef.current, applet, 'check');
      }
      window.clearTimeout(onMsg._t);
      onMsg._t = window.setTimeout(() => setClassResult(null), 2200);
    };
    window.addEventListener('message', onMsg);
    return () => {
      window.removeEventListener('message', onMsg);
      window.clearTimeout(onMsg._t);
    };
  }, [open, slides, canvasW, canvasH]);

  const imageSortSlide = open ? slides[idx] || {} : null;
  const imageSortAppletForSlide = imageSortSlide ? findImageSortApplet(imageSortSlide) : null;
  const imageSortKey = imageSortAppletForSlide
    ? `${imageSortAppletForSlide.id}|${getImageSortMarkers(imageSortAppletForSlide)
        .map((m) => `${m.id}:${m.answer}`)
        .join(';')}`
    : '';

  // Image-sort: reset choices when entering the slide / markers change.
  useEffect(() => {
    if (!open) {
      setImageSortChoices({});
      setImageSortPickId(null);
      setImageSortOptions([]);
      setImageSortHints(null);
      setImageSortResult(null);
      imageSortReplayRef.current = false;
      return;
    }
    const s = slides[idx] || {};
    const applet = findImageSortApplet(s);
    if (!applet) {
      setImageSortChoices({});
      setImageSortPickId(null);
      setImageSortOptions([]);
      setImageSortHints(null);
      setImageSortResult(null);
      imageSortReplayRef.current = false;
      return;
    }
    setImageSortChoices({});
    setImageSortPickId(null);
    setImageSortOptions([]);
    setImageSortHints(null);
    setImageSortResult(null);
    imageSortReplayRef.current = false;
    window.setTimeout(() => {
      postImageSortBtnMode(stageRef.current, applet, 'check');
    }, 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idx, canvasW, canvasH, imageSortKey]);

  useEffect(() => {
    if (!open) return undefined;
    const onMsg = (e) => {
      const type = e?.data?.type;
      if (type !== 'imageSortCheck' && type !== 'imageSortReplay') return;
      const s = slides[idxRef.current] || {};
      const applet = findImageSortApplet(s);
      if (!applet) return;

      if (type === 'imageSortReplay' || imageSortReplayRef.current) {
        setImageSortChoices({});
        setImageSortPickId(null);
        setImageSortOptions([]);
        setImageSortHints(null);
        setImageSortResult(null);
        imageSortReplayRef.current = false;
        postImageSortBtnMode(stageRef.current, applet, 'check');
        return;
      }

      const choices = imageSortChoicesRef.current || {};
      const ok = checkImageSort(applet, choices);
      const markers = getImageSortMarkers(applet);
      const hints = {};
      markers.forEach((m) => {
        const want = imageSortAnswerKey(m.answer);
        if (!want) return;
        const got = imageSortAnswerKey(choices[m.id]);
        hints[m.id] = got && got === want ? 'ok' : 'bad';
      });
      setImageSortHints(hints);
      const text = ok
        ? applet.sortOkText || IMAGE_SORT_DEFAULTS.sortOkText
        : applet.sortFailText || IMAGE_SORT_DEFAULTS.sortFailText;
      setImageSortResult({ ok, text });
      if (ok) {
        imageSortReplayRef.current = true;
        postImageSortBtnMode(
          stageRef.current,
          applet,
          'replay',
          applet.sortReplayLabel || IMAGE_SORT_DEFAULTS.sortReplayLabel
        );
      } else {
        imageSortReplayRef.current = false;
        postImageSortBtnMode(stageRef.current, applet, 'check');
      }
      window.clearTimeout(onMsg._t);
      onMsg._t = window.setTimeout(() => setImageSortResult(null), 2200);
    };
    window.addEventListener('message', onMsg);
    return () => {
      window.removeEventListener('message', onMsg);
      window.clearTimeout(onMsg._t);
    };
  }, [open, slides]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add('preview-mode');
    let cancelled = false;
    let enteredFs = isDocFullscreen();
    const syncVp = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    if (enteredFs) syncVp();
    const onFsChange = () => {
      syncVp();
      if (cancelled) return;
      if (isDocFullscreen()) {
        enteredFs = true;
        return;
      }
      if (enteredFs && useUiStore.getState().previewOpen) {
        closePreview();
      }
    };
    const armFs = (e) => {
      // Clicks on the audio chrome are for play/pause/seek — don't steal them for fullscreen.
      if (e?.target?.closest?.('.react-el-audio,[data-audio-player],.react-themed-audio')) return;
      const node = overlayRef.current;
      if (!node || cancelled) return;
      node.removeEventListener('pointerdown', armFs, true);
      fsArmRef.current = null;
      const target = node.requestFullscreen || node.webkitRequestFullscreen ? node : document.documentElement;
      requestElFullscreen(target).then(syncVp).catch(() => {});
    };
    const armTimer = window.setTimeout(() => {
      if (cancelled || isDocFullscreen()) return;
      const node = overlayRef.current;
      if (!node) return;
      fsArmRef.current = armFs;
      node.addEventListener('pointerdown', armFs, true);
      const ru = useUiStore.getState().lang !== 'en';
      useUiStore.getState().showToast(
        ru ? 'Кликните по экрану для полного экрана' : 'Click the screen for fullscreen',
        'ok'
      );
    }, 280);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    window.addEventListener('resize', syncVp);
    return () => {
      cancelled = true;
      clearTimeout(armTimer);
      document.body.classList.remove('preview-mode');
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      window.removeEventListener('resize', syncVp);
      const node = overlayRef.current;
      if (node && fsArmRef.current) {
        node.removeEventListener('pointerdown', fsArmRef.current, true);
        fsArmRef.current = null;
      }
      try {
        usePresentationStore.getState().setCur(idxRef.current);
      } catch (e) {}
      if (!useUiStore.getState().previewOpen) {
        exitDocFullscreen();
      }
    };
  }, [open, closePreview]);

  useEffect(() => {
    if (open) {
      hiddenElsRef.current = {};
      setIdx(from);
      idxRef.current = from | 0;
      shuffleHistRef.current = [from | 0];
      setAnimClass('');
      setBlack(false);
      setJumpHint('');
      jumpBufRef.current = '';
      if (jumpTimerRef.current) {
        clearTimeout(jumpTimerRef.current);
        jumpTimerRef.current = null;
      }
      setVp({ w: window.innerWidth, h: window.innerHeight });
      setAnimKey((k) => k + 1);
      initSlideAnims(slides[from] || {});
    } else {
      clearMediaPool();
      closeFsVideo();
    }
  }, [open, from]);

  useEffect(() => {
    if (!open) return undefined;
    clearMediaPool();
    closeFsVideo();
    const els = slides[idx]?.els || [];
    slideAudiosForMode(els, 'auto').forEach((a) => playMediaEl(a, { audioPool: mediaPoolRef.current }));
    const timers = [];
    els.forEach((el) => {
      if (isFullscreenVideo(el) && el.mvStart === 'auto') {
        timers.push(window.setTimeout(() => openFsForEl(el), 80));
      }
    });
    return () => {
      timers.forEach((t) => clearTimeout(t));
      clearMediaPool();
      closeFsVideo();
    };
  }, [open, idx, animKey]);

  useEffect(() => {
    if (!open || !stageRef.current) return;
    const el = stageRef.current;
    const fit = fitScale();
    const ctl = el._camCtl;
    if (ctl && !ctl.aborted && !ctl.finished) ctl.fit = fit;
    // Preserve resting/in-flight camera; only refresh fit so outer box and stage
    // scale stay matched after fullscreen / resize (avoids top-left shrink).
    // New slide remounts the stage node (no _pvCamState) → full frame.
    el._pvCamInited = true;
    applyCameraTransform(
      el,
      el._pvCamState || fullSlideCam(canvasW, canvasH),
      fit,
      canvasW,
      canvasH
    );
    bumpCamTick(el);
  }, [animKey, open, canvasW, canvasH, vp.w, vp.h]);

  useEffect(() => {
    if (!open) {
      clearRideAnims();
      clearAutoTimer();
      clearStageFx(stageRef.current);
      cumMotionRef.current = {};
      motionGenRef.current = {};
      pendingMotionEndRef.current = {};
      return undefined;
    }
    const slide = slides[idx];
    const t = window.setTimeout(() => startSlideRides(slide), 80);
    return () => {
      clearTimeout(t);
      clearRideAnims();
    };
  }, [open, idx, animKey, slides]);

  const goTo = (next) => {
    const list = usePresentationStore.getState().slides;
    const dest = Math.max(0, Math.min(list.length - 1, next | 0));
    if (dest === idxRef.current) return;
    clearAutoTimer();
    const fromSlide = slides[idxRef.current] || {};
    const toSlide = list[dest] || {};
    // Under black screen: switch slide silently so the audience overlay never flickers.
    if (blackRef.current) {
      if (busy.current) skipBusy();
      document.querySelectorAll('.pv-exit-snapshot').forEach((n) => {
        try {
          n.remove();
        } catch (e) {}
      });
      idxRef.current = dest;
      setDur(0);
      setPvDir(1);
      setAnimClass('');
      setIdx(dest);
      setAnimKey((k) => k + 1);
      initSlideAnims(toSlide);
      return;
    }
    const gTrans = usePresentationStore.getState().globalTrans;
    const gDur = usePresentationStore.getState().globalTransDur;
    const trans = effectiveTrans(toSlide, gTrans);
    const ms = effectiveTransDur(toSlide, gDur);

    // Morph transition: animate existing DOM elements
    if (trans === 'morph' && ms > 0 && stageRef.current) {
      // Build element pairs BEFORE React re-render (fromSlide's DOM is still present here).
      const pairs = [];
      const usedTo = new Set();
      const usedFrom = new Set();

      toSlide.els?.forEach((td) => {
        if (!td || td._isDecor) return;
        const hasEntrance = td.anims?.some((a) => a && isEntranceAnim(a.name));
        if (hasEntrance) return;

        // Find matching from element by id
        let fd = fromSlide.els?.find((e) => e && e.id === td.id && !e._isDecor);
        if (fd && !morphTextBlocksMatch(fd, td)) {
          pairs.push({ fromId: fd.id, toId: td.id, fromData: fd, toData: td });
          usedTo.add(td.id);
          usedFrom.add(fd.id);
        } else {
          // Match by morphName or auto-label
          const key = morphMatchKey(td, toSlide.els);
          if (key) {
            fd = fromSlide.els?.find((e) => 
              e && !e._isDecor && !usedFrom.has(e.id) && e.type === td.type && 
              !morphTextBlocksMatch(e, td) && 
              morphMatchKey(e, fromSlide.els) === key
            );
          }
        }
        if (fd && !usedTo.has(td.id) && !usedFrom.has(fd.id)) {
          pairs.push({ fromId: fd.id, toId: td.id, fromData: fd, toData: td });
          usedTo.add(td.id);
          usedFrom.add(fd.id);
        }
      });

      // Elements that only exist on the FROM slide: capture a DOM snapshot now (before the
      // slide switches) so they can fade out in place instead of just vanishing instantly.
      const exitSnapshots = [];
      (fromSlide.els || []).forEach((fd) => {
        if (!fd || fd._isDecor || fd.type === 'pagenum' || usedFrom.has(fd.id)) return;
        const node = findStageEl(fd.id);
        if (!node) return;
        const painted = paintedNodeOpacity(node);
        if (painted <= 0.01) return;
        try {
          const clone = node.cloneNode(true);
          clone.removeAttribute('data-id');
          clone.style.position = 'absolute';
          clone.style.margin = '0';
          clone.style.left = (fd.x || 0) + 'px';
          clone.style.top = (fd.y || 0) + 'px';
          clone.style.width = (fd.w || 100) + 'px';
          clone.style.height = (fd.h || 60) + 'px';
          clone.style.transformOrigin = 'center center';
          clone.style.transform = elBoxTransform(fd) || '';
          clone.style.animation = 'none';
          clone.style.animationName = 'none';
          clone.style.opacity = String(painted);
          clone.style.pointerEvents = 'none';
          clone.style.transition = 'none';
          exitSnapshots.push({ clone, fromData: { ...fd, elOpacity: painted } });
        } catch (e) {}
      });

      // Elements that only exist on the TO slide (and have no entrance animation of their
      // own — those already fade in via the normal entrance system): fade them in instead of
      // popping in instantly.
      const enterIds = new Set(
        (toSlide.els || [])
          .filter((e) => e && !e._isDecor && e.type !== 'pagenum' && !usedTo.has(e.id))
          .filter((e) => !e.anims?.some((a) => a && isEntranceAnim(a.name)))
          .map((e) => e.id)
      );

      if (pairs.length > 0 || exitSnapshots.length > 0 || enterIds.size > 0) {
        // Save pairs for animation
        morphPairsRef.current = pairs;
        pairs.forEach((p) => {
          const fromB = morphLayerBlurPx(p.fromData);
          const toB = morphLayerBlurPx(p.toData);
          const fromCss = morphCssBlurPx(p.fromData);
          // Seed at ease≈0; for 0→N nudge slightly so React mounts the frost overlay.
          const seedEase = fromB < 0.01 && toB > 0.01 ? 0.001 / Math.max(toB, 0.001) : 0;
          const paint = morphLayerBlurPaint(fromB, toB, seedEase);
          writeMorphFx(p.toId, {
            opacity: morphElOpacity(p.fromData),
            layerBlur: paint.cur,
            layerBlurPeak: paint.peak,
            layerBlurOpacity: paint.opacity,
            layerBlurFilter: paint.filterBlur,
            filter: fromCss > 0.01 ? `blur(${fromCss}px)` : '',
          });
        });
        
        // Update state - React will render toSlide (opacity/blur already snapped via morphFxLive)
        idxRef.current = dest;
        setDur(ms);
        setIdx(dest);
        
        // After React renders, animate from new positions back to old positions
        requestAnimationFrame(() => {
          const duration = Math.max(200, ms);
          const startTime = performance.now();
          const stage = stageRef.current;

          if (!stage) return;

          // Find DOM elements. Only the TO node exists in the DOM right now — the FROM
          // slide's elements were already unmounted the moment React switched to `dest`.
          // We manipulate the TO node directly: snap it to look like the FROM box/color/
          // shadow, then animate it toward its own natural (TO) state.
          const domPairs = pairs
            .map((p) => ({ ...p, el: findStageEl(p.toId) }))
            .filter((p) => p.el);
          const enterPairs = (toSlide.els || [])
            .filter((td) => enterIds.has(td.id))
            .map((td) => ({ toData: td, el: findStageEl(td.id) }))
            .filter((p) => p.el);

          // Drop the exit clones into the stage now, on top of the freshly-rendered slide.
          exitSnapshots.forEach(({ clone }) => {
            try { stage.appendChild(clone); } catch (e) {}
          });

          if (domPairs.length > 0 || enterPairs.length > 0 || exitSnapshots.length > 0) {
            busy.current = true;

            // Snap elements to look like the FROM box (position/size/rotation/color/shadow/
            // font-size), then animate every property toward the TO state below.
            // IMPORTANT: left/top/width/height are set ONCE here to their FINAL (TO) values
            // and never touched again — all geometry animation happens purely through
            // `transform` (translate+rotate+scale). Continuously changing width/height (and
            // literally changing font-size) forces the browser to re-layout text every frame,
            // which is what caused text to visibly jitter/shake while resizing during morph.
            // Transform-only animation is compositor-driven and reflow-free.
            domPairs.forEach((pair) => {
              const { el, fromData, toData } = pair;
              el.style.left = (toData.x || 0) + 'px';
              el.style.top = (toData.y || 0) + 'px';
              el.style.width = (toData.w || 100) + 'px';
              el.style.height = (toData.h || 60) + 'px';
              el.style.transformOrigin = 'center center';
              el.style.transform = buildMorphGeometryTransform(fromData, toData, 0);
              // NOTE: must pass the real (fromData, toData) pair here, not (fromData,
              // fromData) — applyMorphColor decides WHETHER to touch fill/stroke/rx by
              // comparing the two inputs directly (not just multiplying by ease), so passing
              // the same object twice made it think nothing had changed and skip updating
              // rx/fill/stroke at the snap step entirely. That left the shape showing
              // React's own TO-rounded corners for one frame before the real animation loop
              // corrected it a frame later — the visible "flicker" right as morph started.
              applyMorphFilter(el, fromData, toData, 0);
              applyMorphColor(el, fromData, toData, 0);
              applyMorphTextSize(el, fromData, toData, 0);
              applyMorphOpacity(el, fromData, toData, 0);
              applyMorphLayerBlur(el, fromData, toData, 0);
            });
            enterPairs.forEach(({ el }) => {
              el.style.opacity = '0';
            });

            // Force reflow
            void stage.offsetHeight;

            // Animate to TO rotation / scale / color / shadow / font-size, and fade
            // unmatched elements in/out. Position/size never change again (see above).
            function frame(now) {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const ease = 1 - Math.pow(1 - progress, 3);

              domPairs.forEach((pair) => {
                const { el, fromData, toData } = pair;
                if (!el) return;
                el.style.transform = buildMorphGeometryTransform(fromData, toData, ease);
                applyMorphFilter(el, fromData, toData, ease);
                applyMorphColor(el, fromData, toData, ease);
                applyMorphTextSize(el, fromData, toData, ease);
                applyMorphOpacity(el, fromData, toData, ease);
                applyMorphLayerBlur(el, fromData, toData, ease);
              });

              enterPairs.forEach(({ el, toData }) => {
                if (!el) return;
                const target = toData.elOpacity != null ? toData.elOpacity : 1;
                el.style.opacity = String(target * ease);
              });

              exitSnapshots.forEach(({ clone, fromData }) => {
                const start = fromData.elOpacity != null ? fromData.elOpacity : 1;
                clone.style.opacity = String(start * (1 - ease));
              });

              if (progress < 1) {
                requestAnimationFrame(frame);
              } else {
                // Cleanup — explicitly set the exact final values (position/rotation/filter/
                // color/font-size) rather than clearing styles to '': clearing a direct-style
                // override doesn't "restore" React's own computed value, it just removes it —
                // which is what caused rotation/shadow to snap back to their unrotated/
                // unshadowed defaults right as the morph finished.
                // NOTE: deliberately NOT bumping animKey here — animKey is used as a React
                // `key` on the slide wrapper, so changing it would force a full unmount/
                // remount of the slide (replaying entrance CSS animations for everything),
                // causing a visible flash right as the morph settles.
                domPairs.forEach(({ el, toData }) => {
                  if (!el) return;
                  el.style.left = (toData.x || 0) + 'px';
                  el.style.top = (toData.y || 0) + 'px';
                  el.style.width = (toData.w || 100) + 'px';
                  el.style.height = (toData.h || 60) + 'px';
                  el.style.transform = elBoxTransform(toData) || '';
                  el.style.transformOrigin = '';
                  el.style.filter = elFilterCss(toData) || '';
                  resetMorphColor(el, toData);
                  resetMorphTextSize(el, toData);
                  resetMorphOpacity(el, toData);
                  resetMorphLayerBlur(el, toData);
                  clearMorphFx(toData?.id);
                });
                enterPairs.forEach(({ el, toData }) => {
                  if (!el) return;
                  el.style.opacity = String(toData.elOpacity != null ? toData.elOpacity : 1);
                });
                exitSnapshots.forEach(({ clone }) => {
                  try { clone.remove(); } catch (e) {}
                });
                busy.current = false;
                morphPairsRef.current = [];
              }
            }

            requestAnimationFrame(frame);
          } else {
            // No DOM elements found, fall back to normal transition
            pairs.forEach((p) => clearMorphFx(p.toId));
            setAnimKey((k) => k + 1);
            initSlideAnims(toSlide);
          }
        });
        return;
      }
    }

    // Default path: change animKey to trigger React re-render
    // Direction: forward (going to a later slide) pushes content left/up, like flipping
    // ahead in a filmstrip; backward reverses it — matching how these push-style
    // transitions read directionally rather than always sliding the same way.
    const dir = dest > idxRef.current ? 1 : -1;
    // Measure the shift in real pixels from ONE shared element (the overlay), and use that
    // SAME number for both the outgoing snapshot and the incoming slide. Using CSS `100%`
    // independently on each of the two layers can round to a fractional-pixel-different
    // value between them (each is its own box), leaving a hairline seam/gap where the black
    // background peeks through right at the join. A single shared pixel measurement can't
    // disagree with itself.
    const overlayRect = overlayRef.current?.getBoundingClientRect();
    const shiftXPx = Math.ceil(overlayRect?.width || window.innerWidth) + 1;
    const shiftYPx = Math.ceil(overlayRect?.height || window.innerHeight) + 1;
    // Capture a snapshot of the OUTGOING slide first, so it can visibly leave (fade/slide/
    // zoom away) at the same time the new slide arrives, instead of the new slide just
    // materializing over the preview's black background on its own.
    let exitSnap = null;
    if (trans !== 'none' && ms > 0 && stageRef.current && overlayRef.current) {
      try {
        const clone = stageRef.current.cloneNode(true);
        freezeClonedStage(stageRef.current, clone);
        const wrap = document.createElement('div');
        wrap.className = `pv-exit-snapshot ${exitClass(trans)}`;
        wrap.style.position = 'absolute';
        wrap.style.inset = '0';
        wrap.style.display = 'flex';
        wrap.style.alignItems = 'center';
        wrap.style.justifyContent = 'center';
        wrap.style.pointerEvents = 'none';
        wrap.style.zIndex = '5';
        wrap.style.setProperty('--pv-dur', `${ms}ms`);
        wrap.style.setProperty('--pv-dir', String(dir));
        wrap.style.setProperty('--pv-shift-x', `${shiftXPx}px`);
        wrap.style.setProperty('--pv-shift-y', `${shiftYPx}px`);
        wrap.appendChild(clone);
        overlayRef.current.appendChild(wrap);
        exitSnap = wrap;
      } catch (e) {}
    }

    idxRef.current = dest;
    setDur(ms);
    setPvDir(dir);
    setPvShift({ x: shiftXPx, y: shiftYPx });
    setIdx(dest);
    setAnimKey((k) => k + 1);
    // Wait out the slide enter transition before auto camera/bundle — otherwise the
    // camera starts while the wrap is still scaled down (e.g. zoom enter 0.86→1).
    initSlideAnims(toSlide, {
      autoStartAfter: trans !== 'none' && ms > 0 ? ms + 40 : 30,
    });

    if (trans !== 'none' && ms > 0) {
      setAnimClass(enterClass(trans));
      busy.current = true;
      clearBusyTimer();
      busyTimerRef.current = window.setTimeout(() => {
        busyTimerRef.current = null;
        busy.current = false;
        setAnimClass('');
        if (exitSnap) {
          try { exitSnap.remove(); } catch (e) {}
        }
        // Enter zoom/scale lives on the wrap; once it ends, re-assert stage fit
        // so a mid-transition skip/resize cannot leave a partial scale behind.
        refitStage(fullSlideCam(canvasW, canvasH));
      }, ms);
    } else if (exitSnap) {
      try { exitSnap.remove(); } catch (e) {}
    }
  };

  /** Resolve next slide index for advance (shuffle / loop / linear). */
  function resolveNextSlideIndex() {
    const list = usePresentationStore.getState().slides;
    const i = idxRef.current;
    const shuffle = useUiStore.getState().presShuffle;
    const loop = useUiStore.getState().presLoop;
    if (shuffle) {
      const available = list.map((_, j) => j).filter((j) => j !== i && !isSlideHidden(list[j]));
      if (!available.length) return -1;
      const next = available[Math.floor(Math.random() * available.length)];
      shuffleHistRef.current.push(next);
      return next;
    }
    return loop ? nextVisibleSlideLooped(list, i, 1) : nextVisibleSlideIndex(list, i, 1);
  }

  /**
   * Timer / applet nav must change slides even while a long transform (or enter
   * transition) still holds `busy`. Click-advance keeps skip-then-return; timers
   * must not stick at 0:00 with a half-scaled stage.
   */
  function forceGoNextSlide() {
    if (autoStartAnimTimerRef.current) {
      clearTimeout(autoStartAnimTimerRef.current);
      autoStartAnimTimerRef.current = null;
    }
    skipBusy();
    refitStage(fullSlideCam(canvasW, canvasH));
    stepIRef.current = (stepsRef.current || []).length;
    const i = idxRef.current;
    const next = resolveNextSlideIndex();
    if (next < 0 || next === i) {
      if (stepIRef.current >= (stepsRef.current || []).length) closePreview();
      return;
    }
    goTo(next);
  }

  function stepRepeatId(step) {
    if (!step) return null;
    if (step.repeatId) return step.repeatId;
    const hit = (step.items || []).find((it) => it && it.repeatId);
    return hit?.repeatId || null;
  }

  function stepRepeatInfinite(step) {
    if (!step) return false;
    if (step.repeatInfinite) return true;
    return (step.items || []).some((it) => it && it.repeatInfinite);
  }

  /** True when playback is already inside a Repeat (not merely about to start one). */
  function findActiveRepeatId() {
    const steps = stepsRef.current || [];
    const i = stepIRef.current;
    const prev = i > 0 ? steps[i - 1] : null;
    const rid = stepRepeatId(prev);
    if (!rid || skippedRepeatRef.current.has(rid)) return null;
    if (busy.current || camAbortRef.current) return rid;
    const next = steps[i];
    if (stepRepeatId(next) === rid) return rid;
    if (stepRepeatInfinite(prev)) return rid;
    return null;
  }

  /** Jump past every remaining step of this Repeat; do not cut one iteration short mid-click. */
  function skipEntireRepeat(rid) {
    if (!rid) return;
    skippedRepeatRef.current.add(rid);
    clearBusyTimer();
    if (camAbortRef.current) {
      try {
        camAbortRef.current.abort({ finish: true });
      } catch (e) {
        try {
          camAbortRef.current.abort();
        } catch (e2) {}
      }
      camAbortRef.current = null;
    }
    busy.current = false;
    slidePlayGenRef.current += 1;
    commitPendingMotion();
    const steps = stepsRef.current || [];
    let i = stepIRef.current;
    while (i < steps.length && stepRepeatId(steps[i]) === rid) i += 1;
    stepIRef.current = i;
    refitStage();
  }

  /** Advance builds; if mid-Repeat, skip the whole block instead of the next iteration step. */
  function advanceAnimsOrSkipRepeat() {
    const rid = findActiveRepeatId();
    if (rid) {
      skipEntireRepeat(rid);
      return playNextAnimStep();
    }
    if (busy.current || camAbortRef.current) skipBusy();
    return playNextAnimStep();
  }

  const goNext = () => {
    if (autoStartAnimTimerRef.current) {
      clearTimeout(autoStartAnimTimerRef.current);
      autoStartAnimTimerRef.current = null;
    }
    // Mid-Repeat: skip the entire block (not the current iteration only).
    // Otherwise finish busy work then play the next build.
    if (advanceAnimsOrSkipRepeat()) return;
    const i = idxRef.current;
    const loop = useUiStore.getState().presLoop;
    const next = resolveNextSlideIndex();
    if (next < 0 || (next === i && !loop)) {
      if (stepIRef.current >= stepsRef.current.length) closePreview();
      return;
    }
    goTo(next);
  };

  /** Play one or more anims the same way as click-advance (recolor/motion/typewriter/…). */
  const playTriggeredAnims = (hits, slideIdx, list) => {
    const items = [];
    let navAfter = null;
    hits.forEach(({ o, a, ai }) => {
      const step = stepFromAnim(o, a, ai != null ? ai : (o.anims || []).indexOf(a));
      if (step) items.push(step);
      const dur = animDuration(a, 600);
      const delay = Math.max(0, +(a.delay || 0));
      const wait = dur + delay + 80;
      if (a.trigger === 'nav' && a.navTarget != null) {
        const si = resolveNavTargetSlideIndex(a.navTarget, list);
        if (si != null) {
          if (!navAfter || wait > navAfter.wait) navAfter = { wait, o, a };
        }
      }
    });
    if (items.length) playBundle({ items });
    if (navAfter) {
      scheduleNavAfterAnim(slideIdx, navAfter.o, navAfter.a, navAfter.wait);
    }
  };

  const fireAppletAnimRef = (ref, appletElId, appletVal) => {
    if (!ref) return;
    const list = usePresentationStore.getState().slides;
    const slideIdx = idxRef.current;
    const slide = list[slideIdx];
    if (!slide) return;
    let useRef = String(ref);
    if (appletElId) {
      const ad = (slide.els || []).find((x) => x && String(x.id) === String(appletElId));
      if (ad && (ad.appletId === 'counter' || ad.appletId === 'timer')) {
        const trig = ad.appletId === 'timer' ? 'timer' : 'counter';
        const resolved = resolveAppletAnimRef(slide, ad.id, useRef, trig);
        if (resolved) useRef = resolved;
      }
    }
    const parts = useRef.split(':');
    if (parts.length < 2) return;
    const elId = parts[0];
    const ai = +parts[1];
    if (!Number.isFinite(ai) || ai < 0) return;
    const o = (slide.els || []).find((e) => e && String(e.id) === String(elId));
    const a = o && o.anims && o.anims[ai];
    if (!o || !a) return;
    playTriggeredAnims([{ o, a, ai }], slideIdx, list);
  };

  const fireElementTriggers = (el) => {
    if (!el) return false;
    const list = usePresentationStore.getState().slides;
    const slideIdx = idxRef.current;
    const slide = list[slideIdx];
    const id = String(el.id);
    const hits = [];
    (slide?.els || []).forEach((o) => {
      (o.anims || []).forEach((a, ai) => {
        if (!a) return;
        if (String(a.triggerElId) === id || String(a.preNavTriggerElId || '') === id) {
          hits.push({ o, a, ai });
        } else if ((a.maTriggerElIds || []).map(String).includes(id)) hits.push({ o, a, ai });
        else if (o === el && (a.trigger === 'element' || a.trigger === 'nav')) hits.push({ o, a, ai });
      });
    });
    if (!hits.length) return false;
    playTriggeredAnims(hits, slideIdx, list);
    return true;
  };

  const goPrev = () => {
    if (autoStartAnimTimerRef.current) {
      clearTimeout(autoStartAnimTimerRef.current);
      autoStartAnimTimerRef.current = null;
    }
    // Click-trigger cameras: ←/↑ rewind the last camera (or mid-flight reverse) before
    // leaving the slide — same idea as stepping back through builds.
    if (playPrevAnimStep()) return;
    const list = usePresentationStore.getState().slides;
    const i = idxRef.current;
    const shuffle = useUiStore.getState().presShuffle;
    if (shuffle && shuffleHistRef.current.length > 1) {
      shuffleHistRef.current.pop();
      goTo(shuffleHistRef.current[shuffleHistRef.current.length - 1]);
      return;
    }
    const prev = nextVisibleSlideIndex(list, i, -1);
    if (prev < 0) return;
    goTo(prev);
  };

  goToRef.current = goTo;
  const fireClickSlideTriggers = () => {
    const list = usePresentationStore.getState().slides;
    const els = list[idxRef.current]?.els || [];
    slideAudiosForMode(els, 'click-slide').forEach((a) =>
      playMediaEl(a, { audioPool: mediaPoolRef.current })
    );
    slideTimersForMode(els, 'click-slide').forEach((t) => {
      startTimerElInRoot(stageRef.current, t.id);
      clickSlideTimersArmedRef.current.add(String(t.id));
    });
  };
  /**
   * First click/key with pending click-slide timers: arm them and return true
   * (caller must NOT advance). Later clicks while timers already run → false → advance.
   */
  const armClickSlideTimersOnly = () => {
    const list = usePresentationStore.getState().slides;
    const els = list[idxRef.current]?.els || [];
    const timers = slideTimersForMode(els, 'click-slide');
    if (!timers.length) return false;
    const pending = timers.filter((t) => !clickSlideTimersArmedRef.current.has(String(t.id)));
    if (!pending.length) return false;
    pending.forEach((t) => {
      startTimerElInRoot(stageRef.current, t.id);
      clickSlideTimersArmedRef.current.add(String(t.id));
    });
    // Fallback scan by data-tm-start (covers nested hosts / missing data-id).
    startTimersInRoot(stageRef.current, { mode: 'click-slide' });
    // Still fire click-slide audio on the arming click.
    slideAudiosForMode(els, 'click-slide').forEach((a) =>
      playMediaEl(a, { audioPool: mediaPoolRef.current })
    );
    return true;
  };
  fireClickSlideTriggersRef.current = fireClickSlideTriggers;
  armClickSlideTimersOnlyRef.current = armClickSlideTimersOnly;
  playNextAnimStepRef.current = playNextAnimStep;
  goNextRef.current = goNext;
  goPrevRef.current = goPrev;
  runShowNextRef.current = () => {
    if (autoStartAnimTimerRef.current) {
      clearTimeout(autoStartAnimTimerRef.current);
      autoStartAnimTimerRef.current = null;
    }
    // First press with a click-slide timer: arm timer and stay on slide.
    // Mid-Repeat: do not skip the block on that same press.
    // Used by show ←/Space and by presenter «Далее» / Space.
    if (armClickSlideTimersOnly()) {
      if (!findActiveRepeatId()) playNextAnimStep();
      return;
    }
    fireClickSlideTriggers();
    goNext();
  };
  closePreviewRef.current = closePreview;
  blackRef.current = black;

  useEffect(() => {
    if (!open) return undefined;
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    return () => {
      startedAtRef.current = 0;
      postPresenter({ t: 'bye' });
      closePresenterWindow();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const shuffle = useUiStore.getState().presShuffle;
    const loop = useUiStore.getState().presLoop;
    const list = slides;
    const i = idx;
    const next = shuffle
      ? -1
      : loop
        ? nextVisibleSlideLooped(list, i, 1)
        : nextVisibleSlideIndex(list, i, 1);
    const vis = visibleSlideIndices(list);
    const visPos = vis.indexOf(i);
    const payload = makePresenterState({
      idx: i,
      nextIdx: next === i ? -1 : next,
      notes: list[i]?.notes || '',
      title: usePresentationStore.getState().title || '',
      n: list.length,
      visPos: visPos >= 0 ? visPos + 1 : i + 1,
      visN: vis.length || list.length,
      startedAt: startedAtRef.current,
      black,
      shuffle,
      live: true,
    });
    const send = () => postPresenter(payload);
    send();
    return subscribePresenter((msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'hello') send();
      if (msg.t !== 'cmd') return;
      if (msg.cmd === 'next') runShowNextRef.current();
      else if (msg.cmd === 'prev') goPrevRef.current();
      else if (msg.cmd === 'exit') closePreviewRef.current();
      else if (msg.cmd === 'black') setBlack((v) => !v);
      else if (msg.cmd === 'goto' && msg.idx != null) goToRef.current(msg.idx | 0);
      else if (msg.cmd === 'notes') {
        const i = msg.idx != null ? msg.idx | 0 : idxRef.current;
        try {
          usePresentationStore.getState().patchSlide(i, { notes: String(msg.text || '') });
        } catch (e) {}
      }
    });
  }, [open, idx, black, slides, presShuffle, presLoop]);

  useEffect(() => {
    clearAutoTimer();
    if (!open) return undefined;
    const slide = slides[idx] || {};
    const sec = +(slide.auto || 0);
    if (!(sec > 0)) return undefined;
    autoTimerRef.current = window.setTimeout(() => {
      autoTimerRef.current = null;
      const list = usePresentationStore.getState().slides;
      const i = idxRef.current;
      const shuffle = useUiStore.getState().presShuffle;
      if (shuffle) {
        const available = list.map((_, j) => j).filter((j) => j !== i && !isSlideHidden(list[j]));
        if (available.length) {
          const next = available[Math.floor(Math.random() * available.length)];
          shuffleHistRef.current.push(next);
          goTo(next);
        }
        return;
      }
      const next = nextVisibleSlideLooped(list, i, 1);
      goTo(next);
    }, sec * 1000);
    return () => clearAutoTimer();
  }, [open, idx, animKey, slides]);

  const wasPreviewOpen = useRef(false);
  if (open && !wasPreviewOpen.current) {
    resetCounterGroupVals();
  }
  wasPreviewOpen.current = open;

  useEffect(() => {
    if (!open) return undefined;
    const onMsg = (e) => {
      const d = e.data;
      if (!d) return;
      if (d.type === 'timerNav') {
        if (d.mode === 'next') {
          forceGoNextSlide();
          return;
        }
        if (d.mode === 'slide') {
          skipBusy();
          refitStage(fullSlideCam(canvasW, canvasH));
          stepIRef.current = (stepsRef.current || []).length;
          goTo(Math.max(0, Math.min(slides.length - 1, +d.slide || 0)));
        }
        return;
      }
      if (d.type === 'counterSync' && d.gid) {
        const gid = String(d.gid).trim();
        if (!gid) return;
        setCounterGroupVal(gid, d.val);
        document.querySelectorAll('.preview-overlay [data-applet-id="counter"]').forEach((wrap) => {
          if ((wrap.getAttribute('data-cnt-group-id') || '') !== gid) return;
          const ifr = wrap.querySelector('iframe');
          if (!ifr) return;
          try {
            if (ifr.contentWindow === e.source) return;
          } catch (_) {}
          try {
            ifr.contentWindow.postMessage({ type: 'counterSync', val: d.val }, '*');
          } catch (_) {}
        });
        return;
      }
      if (d.type === 'appletAnim' && d.ref) {
        let appletElId = null;
        document.querySelectorAll('.preview-overlay iframe').forEach((ifr) => {
          try {
            if (ifr.contentWindow === e.source) {
              const wrap = ifr.closest('[data-id]');
              if (wrap) appletElId = wrap.getAttribute('data-id');
            }
          } catch (_) {}
        });
        fireAppletAnimRef(d.ref, appletElId, d.appletVal);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [open, idx, slides.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        endPresentationDrawing();
        closePreview();
        return;
      }
      if (e.code === 'KeyB') {
        e.preventDefault();
        e.stopPropagation();
        setBlack((v) => !v);
        return;
      }
      if (e.code === 'KeyL') {
        e.preventDefault();
        useUiStore.getState().togglePresLoop();
        return;
      }
      if (e.code === 'KeyS') {
        e.preventDefault();
        useUiStore.getState().togglePresShuffle();
        return;
      }
      if (e.code === 'KeyP') {
        e.preventDefault();
        if (!isMultiScreenNow()) return;
        const w = openPresenterForShow(useUiStore.getState().presShowScreenKey);
        if (!w) {
          useUiStore.getState().showToast(
            ruHud ? 'Разрешите всплывающие окна для окна докладчика' : 'Allow pop-ups for the presenter window',
            'warn'
          );
        }
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        jumpBufRef.current += e.key;
        setJumpHint(jumpBufRef.current);
        if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
        jumpTimerRef.current = window.setTimeout(() => {
          const n = parseInt(jumpBufRef.current, 10);
          jumpBufRef.current = '';
          setJumpHint('');
          jumpTimerRef.current = null;
          const list = usePresentationStore.getState().slides;
          if (n >= 1 && n <= list.length) goTo(n - 1);
        }, 700);
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        goTo(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        goTo(slides.length - 1);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        // Ignore key-repeat: holding Space used to skipBusy+chain into the next slide
        // while the stage was still at a camera zoom (looked like going past the slide).
        if (e.repeat) return;
        // Always call through refs — the effect closure otherwise keeps a stale goNext/goPrev
        // (click uses the fresh render path, which is why only keyboard looked broken).
        runShowNextRef.current();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (e.repeat) return;
        goPrevRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      if (jumpTimerRef.current) {
        clearTimeout(jumpTimerRef.current);
        jumpTimerRef.current = null;
      }
    };
  }, [open, idx, slides, globalTrans, globalTransDur, closePreview]);

  if (!open) return null;
  const slide = slides[idx] || slides[0];
  const classApplet = findClassificationApplet(slide);
  const classMovableIds = classApplet
    ? classificationMovableIds(classApplet, slide?.els || [])
    : null;
  const classGuides = classApplet ? classificationGuideLines(classApplet, canvasW, canvasH) : [];

  function onClassPointerDown(e, el) {
    if (!classMovableIds || !classMovableIds.has(String(el.id))) return;
    if (e.button != null && e.button !== 0) return;
    const stage = stageRef.current;
    if (!stage) return;
    // Transparent image pixels → drag the opaque movable object behind.
    const hit =
      opaqueElAt(slide?.els || [], stage, e.clientX, e.clientY, { ids: classMovableIds }) || null;
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    const dragEl = hit;
    const rect = stage.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return;
    const scaleX = canvasW / rect.width;
    const scaleY = canvasH / rect.height;
    const idKey = String(dragEl.id);
    const cur =
      classLivePosRef.current?.[idKey] ||
      classLivePosRef.current?.[dragEl.id] ||
      { x: +dragEl.x || 0, y: +dragEl.y || 0 };
    const guideSnap = classGuides;
    classDragRef.current = {
      id: idKey,
      ox: cur.x,
      oy: cur.y,
      w: +dragEl.w || 80,
      h: +dragEl.h || 60,
      sx: e.clientX,
      sy: e.clientY,
      scaleX,
      scaleY,
    };
    const move = (ev) => {
      const d = classDragRef.current;
      if (!d) return;
      let nx = d.ox + (ev.clientX - d.sx) * d.scaleX;
      let ny = d.oy + (ev.clientY - d.sy) * d.scaleY;
      if (guideSnap.length) {
        const sn = snapTranslateToClassGuides(nx, ny, d.w, d.h, guideSnap);
        nx = sn.x;
        ny = sn.y;
      }
      const clamped = clampClassificationPos(nx, ny, d.w, d.h, canvasW, canvasH);
      setClassLivePos((prev) => ({
        ...(prev || {}),
        [d.id]: clamped,
      }));
    };
    const up = () => {
      classDragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  const animProgress = stepsRef.current.length
    ? ` · ${Math.min(stepIRef.current, stepsRef.current.length)}/${stepsRef.current.length}`
    : '';
  const clickNav = slide?.clickNav !== false;

  return (
    <div
      ref={overlayRef}
      className="preview-overlay"
      {...versionAttr('PreviewOverlay')}
      onClick={(e) => {
        if (drawTool) return;
        if (black) {
          setBlack(false);
          return;
        }
        // Clicks on the audio chrome / OBJ viewer must never count as slide/anim advance.
        if (e?.target?.closest?.('.react-el-audio,[data-audio-player],.react-themed-audio')) return;
        if (e?.target?.closest?.('.react-el-model3d,[data-model3d-viewer],.react-model3d-interactive')) return;
        if (e?.target?.closest?.('.react-imagesort-pin,.preview-imagesort-pick,[data-imagesort-layer]')) return;
        if (imageSortSuppressNavRef.current > Date.now()) return;
        if (imageSortPickId) return;
        // First click with a click-slide timer: arm timer, never leave the slide.
        // Mid-Repeat: do not skip the block on that same click — timer wins.
        if (armClickSlideTimersOnly()) {
          if (autoStartAnimTimerRef.current) {
            clearTimeout(autoStartAnimTimerRef.current);
            autoStartAnimTimerRef.current = null;
          }
          if (!findActiveRepeatId()) playNextAnimStep();
          return;
        }
        fireClickSlideTriggers();
        if (clickNav) goNext();
        else {
          if (autoStartAnimTimerRef.current) {
            clearTimeout(autoStartAnimTimerRef.current);
            autoStartAnimTimerRef.current = null;
          }
          advanceAnimsOrSkipRepeat();
        }
      }}
      onTouchStart={(e) => {
        if (drawTool) return;
        // Finger on OBJ → rotate, not swipe slides.
        if (e?.target?.closest?.('.react-el-model3d,[data-model3d-viewer],.react-model3d-interactive')) {
          swipeRef.current = null;
          return;
        }
        if (e?.target?.closest?.('.react-imagesort-pin,.preview-imagesort-pick,[data-imagesort-layer]')) {
          swipeRef.current = null;
          suppressImageSortNav();
          return;
        }
        if (imageSortPickId) {
          swipeRef.current = null;
          return;
        }
        const t = e.changedTouches?.[0] || e.touches?.[0];
        if (!t) return;
        swipeRef.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        if (drawTool) return;
        if (imageSortPickId || imageSortSuppressNavRef.current > Date.now()) {
          swipeRef.current = null;
          return;
        }
        const start = swipeRef.current;
        swipeRef.current = null;
        if (!start) return;
        const t = e.changedTouches?.[0];
        if (!t) return;
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0) goNext();
          else goPrev();
        }
      }}
      role="presentation"
    >
      <div
        key={`${animKey}-${iconsTick}`}
        className={`preview-anim-wrap ${animClass}`}
        style={{
          '--pv-dur': `${dur}ms`,
          '--pv-dir': pvDir,
          '--pv-shift-x': `${pvShift.x}px`,
          '--pv-shift-y': `${pvShift.y}px`,
        }}
      >
        <SlidePreview
          slide={slide}
          slideKey={idx}
          canvasW={canvasW}
          canvasH={canvasH}
          animState={animState}
          stageRef={stageRef}
          vpW={vp.w}
          vpH={vp.h}
          classLivePos={classLivePos}
          classMovableIds={classMovableIds}
          onClassPointerDown={onClassPointerDown}
          imageSortChoices={imageSortChoices}
          imageSortPickId={imageSortPickId}
          imageSortHints={imageSortHints}
          onImageSortSuppressNav={suppressImageSortNav}
          onImageSortPick={(markerId) => {
            suppressImageSortNav();
            const applet = findImageSortApplet(slide);
            if (!applet) return;
            const opts = shuffleImageSortOptions(imageSortOptionList(applet));
            if (!opts.length) {
              useUiStore.getState().showToast(
                ruHud ? 'Задайте ответы меткам в панели свойств' : 'Set marker answers in the properties panel',
                'warn'
              );
              return;
            }
            setImageSortPickId(String(markerId));
            setImageSortOptions(opts);
          }}
          onElClick={(_el, link, meta) => {
            // Audio handled inside ThemedAudioPlayer; HoverWrap already stops slide advance.
            if (_el?.type === 'mediaaudio') return;
            // OBJ owns drag-rotate — don't treat click as nav.
            if (_el?.type === 'model3d') return;
            const els = slide?.els || [];
            els.forEach((a) => {
              if (shouldPlayAudioOnElClick(a, _el.id)) {
                playMediaEl(a, { audioPool: mediaPoolRef.current });
              }
              if (shouldStartTimerOnElClick(a, _el.id)) {
                startTimerElInRoot(stageRef.current, a.id);
              }
            });
            // Inline text/table links skip element-trigger steal.
            if (!meta?.inline && fireElementTriggers(_el)) return;
            if (isFullscreenVideo(_el)) {
              openFsForEl(_el);
              return;
            }
            if (_el.type === 'mediavideo' && (_el.mvStart || 'click') === 'click') {
              const node = stageRef.current?.querySelector?.(
                `[data-id="${CSS.escape(String(_el.id))}"] video`
              );
              if (node) {
                try {
                  if (node.paused) node.play();
                  else node.pause();
                } catch (e) {}
              }
            }
            if (!link) return;
            if (String(link).startsWith('#slide-')) {
              const si = resolveSlideLinkIndex(link, idx, slides);
              if (si != null) goTo(si);
              return;
            }
            const tgt = meta?.linkt || _el.linkt || '_blank';
            try {
              window.open(link, tgt, 'noopener,noreferrer');
            } catch (e) {}
          }}
        />
      </div>
      {black ? <div className="preview-black" aria-hidden="true" /> : null}
      {jumpHint ? (
        <div className="preview-jump-hint on" aria-hidden="true">
          {jumpHint}
        </div>
      ) : null}
      {classResult ? (
        <div
          className={`preview-class-result${classResult.ok ? ' is-ok' : ' is-fail'}`}
          role="status"
          aria-live="polite"
        >
          {classResult.text}
        </div>
      ) : null}
      {imageSortResult ? (
        <div
          className={`preview-class-result${imageSortResult.ok ? ' is-ok' : ' is-fail'}`}
          role="status"
          aria-live="polite"
        >
          {imageSortResult.text}
        </div>
      ) : null}
      {imageSortPickId ? (
        <div
          className={`preview-imagesort-pick${getTheme(appliedThemeIdx)?.dark === false ? ' is-scheme-light' : ' is-scheme-dark'}`}
          role="dialog"
          aria-modal="true"
          aria-label={ruHud ? 'Выбор названия' : 'Choose a label'}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="preview-imagesort-pick-card">
            <button
              type="button"
              className="preview-imagesort-back"
              onClick={(e) => {
                e.stopPropagation();
                setImageSortPickId(null);
                setImageSortOptions([]);
              }}
            >
              {ruHud ? 'назад' : 'back'}
            </button>
            <div className="preview-imagesort-options" role="listbox">
              {imageSortOptions.map((opt) => (
                <button
                  key={imageSortAnswerKey(opt) || opt}
                  type="button"
                  className="preview-imagesort-option"
                  role="option"
                  onClick={(e) => {
                    e.stopPropagation();
                    suppressImageSortNav();
                    const mid = String(imageSortPickId);
                    setImageSortChoices((prev) => ({ ...(prev || {}), [mid]: opt }));
                    setImageSortPickId(null);
                    setImageSortOptions([]);
                    setImageSortHints(null);
                    setImageSortResult(null);
                    imageSortReplayRef.current = false;
                    const applet = findImageSortApplet(slide);
                    if (applet) postImageSortBtnMode(stageRef.current, applet, 'check');
                  }}
                >
                  {normalizeImageSortAnswer(opt)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {presShowSideNav ? (
        <>
          <button
            type="button"
            className="preview-nav preview-nav-prev"
            style={{
              opacity: idx > 0 || presLoop || presShuffle ? 1 : 0.55,
            }}
            aria-label={ruHud ? 'Предыдущий слайд' : 'Previous slide'}
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            className="preview-nav preview-nav-next"
            style={{
              opacity: idx < slides.length - 1 || presLoop || presShuffle ? 1 : 0.55,
            }}
            aria-label={ruHud ? 'Следующий слайд' : 'Next slide'}
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      ) : null}
      {presShowBrush ? (
        <div className="preview-draw-tools" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`preview-nav${drawTool === 'brush' ? ' on' : ''}`}
            style={
              drawTool === 'brush'
                ? {
                    background: drawColor,
                    color: drawColor === '#f8fafc' || drawColor === '#eab308' ? '#111827' : '#fff',
                    borderColor: 'rgba(255,255,255,0.55)',
                  }
                : undefined
            }
            aria-label={ruHud ? 'Кисть' : 'Brush'}
            aria-pressed={drawTool === 'brush'}
            onClick={(e) => {
              e.stopPropagation();
              setDrawTool((t) => {
                if (t === 'brush') {
                  clearAllDrawings();
                  return null;
                }
                return 'brush';
              });
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.2 3.8a2.4 2.4 0 010 3.4l-1.2 1.2-3.4-3.4 1.2-1.2a2.4 2.4 0 013.4 0z" />
              <path d="M14.8 5.8l3.4 3.4-1.5.7-2.6-2.6.7-1.5z" />
              <path d="M13.2 8.1L4.6 16.7c-1.1 1.1-1.8 3.3-2.3 4.8 1.7-.3 4-.9 5.2-2.1l8.6-8.6-2.9-2.7z" />
              <path d="M3.2 21.1c1.1-1.8 2.3-3.1 3.6-3.8-.5 1.3-1.4 2.7-2.6 4-.5.5-1.3.3-1-.2z" />
            </svg>
          </button>
          {hasInk ? (
            <button
              type="button"
              className={`preview-nav${drawTool === 'erase' ? ' on' : ''}`}
              aria-label={ruHud ? 'Ластик' : 'Eraser'}
              aria-pressed={drawTool === 'erase'}
              onClick={(e) => {
                e.stopPropagation();
                setDrawTool((t) => (t === 'erase' ? 'brush' : 'erase'));
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.1 3.7l4.2 4.2a2 2 0 010 2.8l-8.5 8.5H7.4l-4.2-4.2a2 2 0 010-2.8l8.5-8.5a2 2 0 012.8 0z" />
                <path d="M7.5 20.5h12" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </button>
          ) : null}
          {drawTool === 'brush' ? (
            <div className="preview-draw-opts" role="group" aria-label={ruHud ? 'Кисть' : 'Brush'}>
              <div className="preview-draw-widths">
                {DRAW_WIDTHS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`preview-draw-w${drawWidth === w ? ' on' : ''}`}
                    aria-label={ruHud ? `Толщина ${w}` : `Width ${w}`}
                    aria-pressed={drawWidth === w}
                    onClick={(e) => {
                      e.stopPropagation();
                      setBrushWidth(w);
                    }}
                  >
                    <span
                      style={{
                        width: 6 + DRAW_WIDTHS.indexOf(w) * 5,
                        height: 6 + DRAW_WIDTHS.indexOf(w) * 5,
                      }}
                    />
                  </button>
                ))}
              </div>
              <div className="preview-draw-colors">
                {DRAW_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`preview-draw-c${drawColor === c ? ' on' : ''}`}
                    style={{ background: c }}
                    aria-label={c}
                    aria-pressed={drawColor === c}
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorWheelOpen(false);
                      setBrushColor(c);
                    }}
                  />
                ))}
                <button
                  type="button"
                  className={`preview-draw-c-custom${colorWheelOpen || !DRAW_COLORS.includes(drawColor) ? ' on' : ''}`}
                  title={ruHud ? 'Свой цвет' : 'Custom color'}
                  aria-label={ruHud ? 'Свой цвет' : 'Custom color'}
                  aria-pressed={colorWheelOpen}
                  style={
                    !DRAW_COLORS.includes(drawColor)
                      ? { background: drawColor, boxShadow: `inset 0 0 0 2px ${drawColor}` }
                      : undefined
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorWheelOpen((v) => !v);
                  }}
                />
              </div>
              {colorWheelOpen ? (
                <div
                  className="preview-draw-color-wheel"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <HsvWheel
                    hex={/^#[0-9a-fA-F]{6}$/i.test(drawColor) ? drawColor : '#3b82f6'}
                    onChange={(hex) => setBrushColor(hex)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <canvas ref={bakeCanvasRef} className="preview-draw-layer" aria-hidden />
      {drawTool ? (
        <div
          ref={brushCurRef}
          className={`preview-brush-cursor is-hidden${drawTool === 'erase' ? ' is-erase' : ''}`}
          style={{
            width: brushCursorSizePx(),
            height: brushCursorSizePx(),
            borderColor:
              drawTool === 'brush' && drawColor && drawColor !== '#f8fafc'
                ? drawColor
                : undefined,
          }}
          aria-hidden
        />
      ) : null}
      <canvas
        ref={drawCanvasRef}
        className={`preview-draw-layer${drawTool ? ' is-active' : ''}${drawTool === 'erase' ? ' is-erase' : ''}`}
        onPointerDown={(e) => {
          if (!drawTool) return;
          e.stopPropagation();
          e.preventDefault();
          moveBrushCursor(e.clientX, e.clientY);
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawPointerIdRef.current = e.pointerId;
          } catch (err) {}
          const p = slidePointFromEvent(e);
          if (!p) return;
          if (drawTool === 'erase') {
            drawingRef.current = { erase: true };
            applyErase(p);
            return;
          }
          const stroke = {
            pts: [{ x: p.x, y: p.y, t: performance.now() }],
            w: drawWidth,
            color: drawColor,
            follow: { x: p.x, y: p.y },
          };
          const i = idxRef.current;
          const list = drawStrokesRef.current[i] || [];
          list.push(stroke);
          drawStrokesRef.current[i] = list;
          drawingRef.current = stroke;
          if (!hasInk) setHasInk(true);
          clearCanvas(drawCanvasRef.current);
          redrawLive();
        }}
        onPointerMove={(e) => {
          if (drawTool) moveBrushCursor(e.clientX, e.clientY);
          if (!drawingRef.current) return;
          e.stopPropagation();
          const p = slidePointFromEvent(e);
          if (!p) return;
          if (drawingRef.current.erase) {
            applyErase(p);
            return;
          }
          const stroke = drawingRef.current;
          const stage = stageRef.current?.getBoundingClientRect();
          const feel = brushFeel(stroke.w);
          const minDist = stage ? feel.minDistPx / Math.max(stage.width, stage.height) : 0.0006;
          const leash = stage ? feel.leashPx / Math.max(stage.width, stage.height) : 0.005;
          const follow = pullFollow(stroke, p, leash);
          appendBrushPoint(stroke.pts, follow, minDist);
          stroke.tip = { x: follow.x, y: follow.y, t: performance.now() };
          if (stroke.raf) return;
          stroke.raf = requestAnimationFrame(() => {
            if (drawingRef.current !== stroke) return;
            stroke.raf = 0;
            redrawLive();
          });
        }}
        onPointerEnter={(e) => {
          if (drawTool) moveBrushCursor(e.clientX, e.clientY);
        }}
        onPointerLeave={() => {
          if (!drawingRef.current) hideBrushCursor();
        }}
        onPointerUp={(e) => {
          const stroke = drawingRef.current;
          if (stroke?.raf) cancelAnimationFrame(stroke.raf);
          if (stroke?.pauseT) clearTimeout(stroke.pauseT);
          try {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
          } catch (err) {}
          drawPointerIdRef.current = null;
          if (stroke && !stroke.erase) {
            const p = slidePointFromEvent(e);
            const last = stroke.pts[stroke.pts.length - 1];
            const prev = stroke.pts[stroke.pts.length - 2] || last;
            if (p && last && prev) {
              const tx = last.x - prev.x;
              const ty = last.y - prev.y;
              const len = Math.hypot(tx, ty);
              if (len > 1e-6) {
                const along = ((p.x - last.x) * tx + (p.y - last.y) * ty) / len;
                if (along > 0) {
                  appendBrushPoint(
                    stroke.pts,
                    { x: last.x + (tx / len) * along, y: last.y + (ty / len) * along },
                    0,
                  );
                }
              }
            } else if (stroke.tip) {
              appendBrushPoint(stroke.pts, stroke.tip, 0);
            }
            stroke.tip = null;
            commitLiveToBake();
            drawingRef.current = null;
          } else {
            drawingRef.current = null;
          }
          if (drawTool) e.stopPropagation();
        }}
        onPointerCancel={(e) => {
          const stroke = drawingRef.current;
          if (stroke?.raf) cancelAnimationFrame(stroke.raf);
          if (stroke?.pauseT) clearTimeout(stroke.pauseT);
          try {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
          } catch (err) {}
          drawPointerIdRef.current = null;
          if (stroke && !stroke.erase) {
            stroke.tip = null;
            commitLiveToBake();
            drawingRef.current = null;
          } else {
            drawingRef.current = null;
          }
        }}
        onClick={(e) => e.stopPropagation()}
      />
      {presShowFooter || presShowEsc ? (
        <div
          className="preview-hud"
          onClick={(e) => e.stopPropagation()}
        >
          {presShowFooter ? (
            <span>
              {idx + 1} / {slides.length}
              {animProgress}
            </span>
          ) : null}
          {presShowEsc ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                endPresentationDrawing();
                closePreview();
              }}
            >
              Esc / F5
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

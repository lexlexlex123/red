import React, { useEffect, useRef, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useUiStore } from '../../stores/uiStore';
import { buildBasicShapeSVG, shapeOptsFromEl, shapeRxPx } from '../../shared/shapes.js';
import { shapeNeedsOverflowVisible } from '../../shared/shapesCatalog.js';
import { shapeBlurOverlayStyle, shapeBlurPx } from '../../editor/shapeBlur.js';
import { shapeTextBoxStyle } from '../../editor/shapeText.js';
import { versionAttr } from '../../editor/versions.js';
import { effectiveTrans, effectiveTransDur, enterClass, exitClass } from '../../editor/transitions.js';
import { readGroupLink, resolveSlideLinkIndex } from '../../editor/links.js';
import { animCssClass, animDuration, collectSlidePlaybackSteps, isEntranceAnim, isExitAnim, isLiveAnim } from '../../editor/anims.js';
import { resolveNavTargetSlideIndex } from '../../editor/slideTitles.js';
import { isPulseFamilyAnim, pulseCssIteration, pulseIsInfinite, pulseWaitMs } from '../../editor/pulsePlay.js';
import { hoverMotionStyle } from '../../editor/hoverFx.js';
import { elBoxTransform } from '../../editor/elTransform.js';
import { connectorPathFor, connectorDashArray, connectorMarkerUrl, connectorsMarkerDefsSvg, connectorLinecap, connectorsAnimStyleCss, connectorAnimStyle, startRideAnim, collectSlideRideSpecs, resolveConnectorStroke } from '../../editor/connectors.js';
import { inkStrokeSvgMarkup } from '../../editor/inkRender.js';
import { inkFillsSvgMarkup } from '../../editor/inkFill.js';
import { hostedInkIdSet, inkHostInnerMarkup } from '../../editor/inkHost.js';
import { getIconById, onIconsReady } from '../../editor/iconsLazy.js';
import { iconAnimEnabled } from '../../editor/iconAnim.js';
import AnimatedIcon from './AnimatedIcon.jsx';
import { getTableCell, tableCellBg, tableCellRadiusStyle, tableColWidthsPx, tableRowHeightsPx } from '../../editor/tableCells.js';
import { getTheme, resolveElTextColor, resolveSchemeColor } from '../../editor/themes.js';
import { buildChartSvg, chartWrapStyle } from '../../editor/tableChart.js';
import { parseFontFamily, parseCsNumber } from '../../editor/fonts.js';
import { underlineBoxProps, dashDotWrapHtml } from '../../editor/textUnderline.js';
import { imageRenderStyles, normImgFrame, imgBorderSvgMarkup } from '../../editor/imgStyles.js';
import { resolveMediaSrc } from '../../editor/mediaStore.js';
import {
  playMediaEl,
  stopMediaPool,
  shouldPlayAudioOnElClick,
  slideAudiosForMode,
  openFullscreenVideo,
  isFullscreenVideo,
} from '../../editor/mediaPlay.js';
import {
  fireCameraAnim,
  fullSlideCam,
  cameraCssTransform,
} from '../../editor/camera.js';
import { buildHfSrcdoc, hfTitleFromSrc, isHttpUrl, HF_SANDBOX } from '../../editor/htmlFrame.js';
import {
  CODE_THEMES,
  syntaxHighlight,
  codeBlockSurfaceStyle,
} from '../../editor/codeHighlight.js';
import { elFilterCss } from '../../editor/elShadow.js';
import { buildLineAngleContent } from '../../editor/lineAngle.js';
import { fireMotionAnim, isMotionAnim, clearMotionTransforms } from '../../editor/motionPlay.js';
import {
  fireRecolorAnim,
  isRecolorAnim,
  prepareRecolorEl,
  clearRecolorTransforms,
} from '../../editor/recolorPlay.js';
import { fireTypewriterAnim, isTypewriterAnim } from '../../editor/typewriterPlay.js';
import { fireLangFadeAnim, isLangFadeAnim } from '../../editor/langFadePlay.js';
import { fireSplitHalfAnim, isSplitHalfAnim, clearSplitHalf } from '../../editor/splitHalfPlay.js';
import { fireCaptionSlideAnim, isCaptionSlideAnim } from '../../editor/captionSlidePlay.js';
import { fireCosmosTitleAnim, isCosmosTitleAnim, clearCosmosTitle } from '../../editor/cosmosTitlePlay.js';
import { fireParticlesAnim, isParticlesAnim, clearParticles } from '../../editor/particlesPlay.js';
import { fireInkDrawAnim, isInkDrawAnim, clearInkDraw } from '../../editor/inkDrawPlay.js';
import { fireFloatAnim, isFloatAnim, clearFloat } from '../../editor/floatPlay.js';
import {
  resetCounterGroupVals,
  setCounterGroupVal,
} from '../../editor/applets.js';
import {
  resolveAppletAnimRef,
} from '../../editor/appletOnEnd.js';
import { fireDanceAnim, isDanceAnim, clearDance } from '../../editor/dancePlay.js';
import { fireSwingAnim, isSwingAnim, clearSwing } from '../../editor/swingPlay.js';
import Model3dView from './Model3dView.jsx';
import AppletView from './AppletView.jsx';
import DecorGlView from './DecorGlView.jsx';
import DecorSvgHost from './DecorSvgHost.jsx';
import { attachDecorGlCfg, decorUsesGl } from '../../editor/layouts.js';
import { buildLegoSvg } from '../../editor/lego.js';
import { textBgLayerStyle, textColorGradStyle } from '../../editor/textBg.js';
import { textBorderBoxStyle, textBorderSvgMarkup, needsTextBorderOverflow } from '../../editor/textBorder.js';
import { textGlyphShadowStyle, textBlockShadowStyle } from '../../editor/textShadow.js';
import { textPadCss } from '../../editor/textPad.js';
import { textBorderRadiusCss } from '../../editor/textRadius.js';
import SlideBgImgLayer from './SlideBgImgLayer.jsx';
import { morphMatchKey, morphEligible, lerpHexColor } from '../../editor/morphPlay.js';
import { slideSolidBg } from '../../editor/slideBgImg.js';

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
    isLangFadeAnim(name) ||
    isSplitHalfAnim(name) ||
    isCaptionSlideAnim(name) ||
    isCosmosTitleAnim(name) ||
    isParticlesAnim(name) ||
    isInkDrawAnim(name) ||
    isFloatAnim(name) ||
    isDanceAnim(name) ||
    isSwingAnim(name)
  );
}

function previewElIsInteractive(el, slide) {
  if (!el || el._isDecor) return false;
  if (el.link) return true;
  if (el.hoverFx && el.hoverFx.enabled) return true;
  if (el.type === 'applet' && (el.appletId === 'flip' || el.appletId === 'counter' || el.appletId === 'generator')) {
    return true;
  }
  if (el.type === 'mediavideo' && isFullscreenVideo(el)) return true;
  const anims = el.anims || [];
  if (anims.some((a) => a && (a.trigger === 'element' || a.trigger === 'nav' || a.isTrigger))) return true;
  const id = String(el.id);
  return (slide?.els || []).some((o) =>
    (o.anims || []).some((a) => {
      if (!a) return false;
      if (String(a.triggerElId) === id) return true;
      if ((a.maTriggerElIds || []).map(String).includes(id)) return true;
      return false;
    })
  );
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
  children,
}) {
  const [hovered, setHovered] = useState(false);
  const hfxOn = !!(el.hoverFx && el.hoverFx.enabled);
  const hfx = hfxOn ? hoverMotionStyle(el, el.hoverFx, hovered) : null;
  // backdrop-filter dies under opacity animations — keep bg outside entrance anim only.
  const isExitCls =
    !!playing &&
    (playing.includes('fadeout') || playing.includes('slideout') || playing.includes('zoomout'));
  const splitAnim = !!(backdrop && playing && !isExitCls);
  const style = {
    position: 'absolute',
    left: el.x || 0,
    top: el.y || 0,
    width: el.w || 100,
    height: el.h || 60,
    // Explicit z-index matching the element's stacking order in the slide data. Without this,
    // paint order relies on plain DOM order — which elements with a `filter` (drop-shadow) or
    // that render as an <iframe> (HTML/code blocks) don't reliably respect in every browser,
    // since both create their own compositing surface. This pins the intended layering so
    // shadowed elements and HTML/code blocks always stack the same as in the editor.
    zIndex: zIndex != null ? zIndex : undefined,
    opacity: hidden ? 0 : el.elOpacity != null ? el.elOpacity : 1,
    filter: elFilterCss(el),
    overflow:
      live || shapeNeedsOverflowVisible(el.shape) || needsTextBorderOverflow(el) ? 'visible' : 'hidden',
    cursor: interactive ? 'pointer' : 'default',
    outline: link ? '1px solid rgba(56,189,248,.35)' : undefined,
    visibility: hidden ? 'hidden' : 'visible',
    animationDuration: !splitAnim && animDur ? `${animDur}ms` : undefined,
    animationIterationCount: !splitAnim ? animIter || undefined : undefined,
    display: el.type === 'text' || el.type === 'formula' ? 'flex' : undefined,
    alignItems: el.type === 'text' || el.type === 'formula' ? justify : undefined,
    transform: elBoxTransform(el),
    ...hfx,
  };
  if (hfx?.transform) style.transform = hfx.transform;
  else style.transform = elBoxTransform(el);
  if (hfx?.filter) style.filter = [elFilterCss(el), hfx.filter].filter(Boolean).join(' ');
  if (hfx?.opacity != null && !hidden) style.opacity = hfx.opacity;

  let kids = children;
  if (React.isValidElement(children) && hfx && (hfx.color || hfx.background || hfx.border)) {
    kids = React.cloneElement(children, {
      style: {
        ...(children.props.style || {}),
        color: hfx.color || children.props.style?.color,
        background: hfx.background || children.props.style?.background,
        border: hfx.border || children.props.style?.border,
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
      className={`${!splitAnim && playing ? playing : ''}${hfxOn ? ' has-hover-fx' : ''}${el.textRole === 'toc' ? ' has-toc' : ''}`.trim() || undefined}
      style={style}
      onMouseEnter={hfxOn ? () => setHovered(true) : undefined}
      onMouseLeave={hfxOn ? () => setHovered(false) : undefined}
      onClick={(e) => {
        const toc = e.target?.closest?.('[data-toc-slide]');
        if (toc) {
          e.stopPropagation();
          const si = +toc.getAttribute('data-toc-slide');
          if (Number.isFinite(si)) onElClick?.(el, `#slide-${si + 1}`);
          return;
        }
        if (el.type === 'applet') {
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
  return Promise.resolve(req.call(el));
}

function SlidePreview({ slide, canvasW, canvasH, onElClick, animState, stageRef, stageTransform, vpW, vpH }) {
  const scale = Math.min((vpW || window.innerWidth) / canvasW, (vpH || window.innerHeight) / canvasH);
  const els = slide.els || [];

  function wrap(el, node, backdrop) {
    const link = readGroupLink(el, els, 'link');
    const st = animState?.[el.id];
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
    return (
      <HoverWrap
        key={el.id}
        el={el}
        link={link}
        hidden={hidden}
        playing={playing}
        live={live}
        justify={justify}
        animDur={st?.dur}
        animIter={animIter}
        interactive={previewElIsInteractive(el, slide) || !!link}
        onElClick={onElClick}
        backdrop={backdrop || null}
        zIndex={zIndex}
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
          transform: stageTransform || `scale(${scale})`,
          transformOrigin: 'top left',
          background: slideSolidBg(slide),
          overflow: 'hidden',
          position: 'absolute',
          left: 0,
          top: 0,
        }}
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
                justifyContent: 'center',
              }}
              dangerouslySetInnerHTML={{ __html: el.formulaSvg }}
            />
          );
        }
        if (el.type === 'text' || el.type === 'formula') {
          const css = el.cs || '';
          const fs = (css.match(/font-size\s*:\s*([\d.]+)px/i) || [])[1];
          const align =
            (css.match(/text-align\s*:\s*([^;]+)/i) || [])[1] ||
            (el.type === 'formula' ? 'center' : 'left');
          const weight = (css.match(/font-weight\s*:\s*([^;]+)/i) || [])[1];
          const fontStyle = (css.match(/font-style\s*:\s*([^;]+)/i) || [])[1];
          const family = parseFontFamily(css) || 'Georgia, serif';
          const lineH = parseCsNumber(css, 'line-height');
          const letterSp = parseCsNumber(css, 'letter-spacing');
          const textTransform = (css.match(/text-transform\s*:\s*([^;]+)/i) || [])[1];
          const htmlRaw = el.html != null && el.html !== '' ? el.html : String(el.text || '');
          const bgLayer = el.type === 'text' ? textBgLayerStyle(el) : null;
          const colorGrad = el.type === 'text' && el.textRole !== 'toc' ? textColorGradStyle(el) : null;
          const borderSvg = el.type === 'text' ? textBorderSvgMarkup(el) : '';
          const borderBox = el.type === 'text' ? textBorderBoxStyle(el) : null;
          const glyphSh = el.type === 'text' ? textGlyphShadowStyle(el) : null;
          const blockSh = el.type === 'text' ? textBlockShadowStyle(el) : null;
          const hasList =
            el.type === 'text' &&
            (/(data-list-bullet|data-list-num)/i.test(htmlRaw) || el.bulletIconId);
          const valign = el.valign || (el.type === 'formula' ? 'middle' : 'top');
          const justify =
            valign === 'middle' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start';
          const ulBox = el.type === 'text' ? underlineBoxProps(css) : { style: {}, className: '' };
          // Whole-box dash-dot is drawn via inline [data-ul="dash-dot"] spans (see textUnderline),
          // so wrap the text runs here — a block-level background would span the whole box width.
          const html = ulBox.kind === 'underline dash-dot' ? dashDotWrapHtml(htmlRaw) : htmlRaw;
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
                overflow: needsTextBorderOverflow(el) ? 'visible' : undefined,
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
                  width: '100%',
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
          const rs = imageRenderStyles(el);
          const frame = normImgFrame(el.imgFrame);
          const borderSvg = frame === 'none' ? imgBorderSvgMarkup(el) : '';
          return wrap(
            el,
            <div style={{ ...rs.box, width: '100%', height: '100%', position: 'relative', overflow: borderSvg ? 'visible' : undefined }} className={rs.frameClass}>
              <div style={{ ...rs.inner, position: 'absolute', inset: frame === 'polaroid' ? '8px 8px 28px' : frame === 'ribbon' ? '0 0 18px' : 0 }}>
                <img alt="" src={el.src} style={rs.img} />
              </div>
              {borderSvg ? (
                <div
                  aria-hidden="true"
                  style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
                  dangerouslySetInnerHTML={{ __html: borderSvg }}
                />
              ) : null}
              {frame === 'ribbon' ? <div className="react-img-ribbon-bar" /> : null}
            </div>
          );
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
          const sb = shapeBlurPx(el);
          const blurStyle = sb > 0 ? shapeBlurOverlayStyle(el) : null;
          return wrap(
            el,
            <div
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: sb > 0 || shapeNeedsOverflowVisible(el.shape) ? 'visible' : undefined,
              }}
            >
              {blurStyle ? <div aria-hidden="true" style={blurStyle} /> : null}
              <div
                style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}
                dangerouslySetInnerHTML={{
                  __html: buildBasicShapeSVG(el.shape || 'rect', shapeOptsFromEl(el)),
                }}
              />
              {el.shapeHtml ? (
                <div className="react-shape-text" style={shapeTextBoxStyle(el)}>
                  <div
                    style={{
                      width: '100%',
                      textAlign: 'center',
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
          return wrap(
            el,
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
              {src ? (
                <audio
                  src={src}
                  controls
                  loop={!!el.maLoop}
                  autoPlay={el.maStart === 'auto'}
                  ref={(node) => {
                    if (node) node.volume = Math.max(0, Math.min(1, vol));
                  }}
                  style={{ width: '90%' }}
                />
              ) : null}
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
                  srcDoc={url ? undefined : buildHfSrcdoc(src)}
                  style={{ pointerEvents: 'auto' }}
                />
              </div>
            </div>
          );
        }
        if (el.type === 'markdown') {
          const bgLayer = textBgLayerStyle(el);
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
          const T = CODE_THEMES[el.codeTheme || 'dark'] || CODE_THEMES.dark;
          const html =
            el.codeHtml || syntaxHighlight(el.codeRaw || '', el.codeLang || 'js', el.codeTheme || 'dark');
          return wrap(
            el,
            <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
              <div style={surface}>
                <div style={{ fontSize: 9, color: T.cmt, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {el.codeLang || 'code'}
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: html }} />
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
              <div style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}>
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
          const blur = +(el.tableBgBlur || 0);
          const bw = el.borderW != null ? +el.borderW : 1;
          const theme = getTheme(usePresentationStore.getState().appliedThemeIdx);
          const bc =
            (!el.borderColor || el.borderColor === 'transparent') && !el.borderColorScheme
              ? 'transparent'
              : resolveSchemeColor(el.borderColorScheme, theme) || el.borderColor || el.stroke || 'transparent';
          const textColor = resolveElTextColor(el, theme);
          const cws = tableColWidthsPx(el, el.w || 100);
          const rhs = tableRowHeightsPx(el, el.h || 60);
          return wrap(
            el,
            <div
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
                  fontFamily: el.ff || undefined,
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
                        const isLastC = c + cs - 1 >= cols - 1;
                        const isLastR = r + rs - 1 >= rows - 1;
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
                              borderTop: `${bw}px solid ${bc}`,
                              borderLeft: `${bw}px solid ${bc}`,
                              borderRight: isLastC ? `${bw}px solid ${bc}` : undefined,
                              borderBottom: isLastR ? `${bw}px solid ${bc}` : undefined,
                              padding: '5px 9px',
                              verticalAlign: cell.valign || 'middle',
                              textAlign: cell.align || 'left',
                              fontWeight: isH ? 700 : 400,
                              fontSize: cell.fs || undefined,
                              fontFamily: cell.ff || undefined,
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
              style={{
                width: '100%',
                height: '100%',
                background: el.objBgCleared ? 'transparent' : el.objBg || '#0f172a',
              }}
            >
              <Model3dView el={el} />
            </div>
          );
        }
        if (el.type === 'lego') {
          return wrap(
            el,
            <div
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
              dangerouslySetInnerHTML={{ __html: buildLegoSvg(el) }}
            />
          );
        }
        if (el.type === 'graph') {
          return wrap(
            el,
            el.graphImg ? (
              <img
                src={el.graphImg}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <div style={{ padding: 8, fontSize: 12, color: '#94a3b8' }}>{el.graphLatex || 'graph'}</div>
            )
          );
        }
        return null;
      })}
    </div>
    </div>
  );
}

export default function PreviewOverlay() {
  const open = useUiStore((s) => s.previewOpen);
  const from = useUiStore((s) => s.previewFrom);
  const closePreview = useUiStore((s) => s.closePreview);
  const presLoop = useUiStore((s) => s.presLoop);
  const presShuffle = useUiStore((s) => s.presShuffle);
  const presShowFooter = useUiStore((s) => s.presShowFooter);
  const presShowSideNav = useUiStore((s) => s.presShowSideNav);
  const presShowEsc = useUiStore((s) => s.presShowEsc);
  const lang = useUiStore((s) => s.lang);
  const ruHud = lang !== 'en';
  const slides = usePresentationStore((s) => s.slides);
  const canvasW = usePresentationStore((s) => s.canvasW);
  const canvasH = usePresentationStore((s) => s.canvasH);
  const globalTrans = usePresentationStore((s) => s.globalTrans);
  const globalTransDur = usePresentationStore((s) => s.globalTransDur);
  const [idx, setIdx] = useState(from);
  const [animKey, setAnimKey] = useState(0);
  const [animClass, setAnimClass] = useState('');
  const [dur, setDur] = useState(500);
  const [pvDir, setPvDir] = useState(1);
  const [pvShift, setPvShift] = useState({ x: 0, y: 0 });
  const [animState, setAnimState] = useState({});
  const [iconsTick, setIconsTick] = useState(0);
  const [camTransform, setCamTransform] = useState(null);
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [black, setBlack] = useState(false);
  const [morphing, setMorphing] = useState(false);
  const [morphFromIdx, setMorphFromIdx] = useState(-1);
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
  const stageRef = useRef(null);
  const swipeRef = useRef(null);
  const camAbortRef = useRef(null);
  const rideCancelRef = useRef([]);
  const cumMotionRef = useRef({});
  const mediaPoolRef = useRef([]);
  const fsVideoCloseRef = useRef(null);
  /** slideIdx → Set(elId) hidden by exit / nav-trigger (persist across return). */
  const hiddenElsRef = useRef({});

  useEffect(() => onIconsReady(() => setIconsTick((t) => t + 1)), []);

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
      const fromBlur = +(fromData?.blur || 0);
      const toBlur = +(toData?.blur || 0);
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
      domEl.style.filter = parts.length ? parts.join(' ') : '';
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
        if (fillChanged || strokeChanged || rxChanged) {
          const svg = domEl.querySelector('svg');
          if (svg) {
            const curFill = fillChanged ? lerpHexColor(fromFill, toFill, ease) : null;
            const curStroke = strokeChanged ? lerpHexColor(fromStroke, toStroke, ease) : null;
            const curRx = rxChanged ? fromRx + (toRx - fromRx) * ease : toRx;
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
            if (rectEls.length > 0 && otherEls.length === 0) {
              const rxAttr = shapeRxPx(curRx, toData.w, toData.h);
              rectEls.forEach((rectEl) => {
                rectEl.setAttribute('rx', rxAttr);
                rectEl.setAttribute('ry', rxAttr);
                if (curFill) rectEl.setAttribute('fill', curFill);
                if (curStroke) rectEl.setAttribute('stroke', curStroke);
              });
            } else if (svg.parentNode) {
              const synth = {
                ...toData,
                fill: curFill || toData.fill,
                stroke: curStroke || toData.stroke,
                rx: curRx,
              };
              svg.parentNode.innerHTML = buildBasicShapeSVG(toData.shape || 'rect', shapeOptsFromEl(synth));
            }
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
    const align = (alignRaw || (d?.type === 'formula' ? 'center' : 'left')).trim();
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
      if (!fromFs || !toFs || fromFs === toFs) return;
      const holder = el.querySelector('.react-el-text');
      if (!holder) return;
      const scale0 = fromFs / toFs;
      const curScale = scale0 + (1 - scale0) * ease;
      holder.style.transformOrigin = morphTextOrigin(toData);
      holder.style.transform = Math.abs(curScale - 1) > 0.001 ? `scale(${curScale})` : '';
    } catch (e) {}
  }

  /** Undo the temporary scale left by applyMorphTextSize — the correct rest state is none. */
  function resetMorphTextSize(el) {
    try {
      const holder = el.querySelector('.react-el-text');
      if (holder) {
        holder.style.transform = '';
        holder.style.transformOrigin = '';
      }
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
    if (!el.groupId || !slide?.els) return [el];
    const members = slide.els.filter((x) => x && x.groupId === el.groupId);
    return members.length > 1 ? members : [el];
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
      hideElsNow(groupMembers(el, slide).map((m) => String(m.id)));
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

  /** Instantly finish in-progress transition / camera / anim wait (2nd keypress). */
  function skipBusy() {
    if (!busy.current) return false;
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
    if (stageRef.current) {
      setCamTransform(stageRef.current.style.transform);
    }
    return true;
  }

  function fitScale() {
    const w = vp.w || window.innerWidth;
    const h = vp.h || window.innerHeight;
    return Math.min(w / canvasW, h / canvasH);
  }

  function initSlideAnims(slide) {
    if (camAbortRef.current) {
      camAbortRef.current.abort();
      camAbortRef.current = null;
    }
    clearBusyTimer();
    busy.current = false;
    cumMotionRef.current = {};
    clearStageFx(stageRef.current);
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
        state[el.id] = { hidden: true };
        if (hasCosmosOrCaption && el.groupId) {
          (slide.els || []).forEach((m) => {
            if (m && m.groupId === el.groupId) state[m.id] = { hidden: true };
          });
        }
      }
    });
    setAnimState(state);
    const fit = fitScale();
    setCamTransform(cameraCssTransform(fullSlideCam(canvasW, canvasH), fit, canvasW, canvasH));
    if (stageRef.current) {
      stageRef.current._pvCamState = fullSlideCam(canvasW, canvasH);
      // Prepare non-invert recolor silhouettes
      (slide?.els || []).forEach((d) => {
        if (!d || d._isDecor) return;
        const node = findStageEl(d.id);
        if (node) prepareRecolorEl(node, d);
      });
    }
  }

  function playBundle(bundle) {
    const items = bundle.items || [];
    if (!items.length) return 0;
    const slide = slides[idx] || {};
    const hiddenSet = hiddenElsRef.current[idxRef.current] || new Set();
    let maxWait = 0;
    items.forEach((step) => {
      if (step.elId && hiddenSet.has(String(step.elId))) return;
      if (step.pause || step.name === 'pause') {
        const wait = Math.max(0, (step.delay || 0) + (step.dur || 0));
        if (wait > maxWait) maxWait = wait;
        return;
      }

      if (isSpecialAnim(step.name)) {
        const el = findStageEl(step.elId);
        if (!el) return;
        const keepHidden =
          isCosmosTitleAnim(step.name) ||
          isCaptionSlideAnim(step.name) ||
          isParticlesAnim(step.name);
        revealEl(step.elId, { live: !keepHidden, cls: null, hidden: keepHidden });
        if (!keepHidden) {
          el.style.visibility = 'visible';
          el.style.opacity = '';
        } else {
          el.style.visibility = 'hidden';
          el.style.pointerEvents = 'none';
        }
        el.style.overflow = 'visible';

        const elData =
          (slide.els || []).find((e) => e && String(e.id) === String(step.elId)) || {
            id: step.elId,
            type: el.dataset?.type,
            x: parseFloat(el.style.left) || 0,
            y: parseFloat(el.style.top) || 0,
            w: parseFloat(el.style.width) || el.offsetWidth,
            h: parseFloat(el.style.height) || el.offsetHeight,
            rot: step.rot || 0,
          };

        if (isFloatAnim(step.name)) {
          const result = fireFloatAnim(el, elData, {
            name: 'float',
            dur: step.dur,
            delay: step.delay,
            swingCount: step.swingCount,
          });
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isDanceAnim(step.name)) {
          const result = fireDanceAnim(el, elData, {
            name: 'dance',
            dur: step.dur,
            delay: step.delay,
            swingCount: step.swingCount,
          });
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isSwingAnim(step.name)) {
          const result = fireSwingAnim(el, elData, {
            name: 'swing',
            dur: step.dur,
            delay: step.delay,
            swingCount: step.swingCount,
            swingOx: step.swingOx,
            swingOy: step.swingOy,
          });
          if (result.waitMs > maxWait) maxWait = result.waitMs;
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
          });
          if (result.waitMs > maxWait) maxWait = result.waitMs;
          return;
        }
        if (isCosmosTitleAnim(step.name)) {
          const result = fireCosmosTitleAnim(
            el,
            elData,
            { name: 'cosmosTitle', dur: step.dur, delay: step.delay },
            {
              hideAfter: true,
              onHide: () => revealEl(step.elId, { hidden: true, live: false }),
            }
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
        if (isRecolorAnim(step.name)) {
          const wait = fireRecolorAnim(el, elData, {
            name: 'recolor',
            dur: step.dur,
            delay: step.delay,
            recolorColor: step.recolorColor,
            recolorInvert: step.recolorInvert,
          });
          if (wait > maxWait) maxWait = wait;
          return;
        }
        if (isMotionAnim(step.name)) {
          const prev = cumMotionRef.current[step.elId] || { tx: 0, ty: 0 };
          const result = fireMotionAnim(
            el,
            { rot: step.rot || elData.rot || 0 },
            {
              name: step.name,
              dur: step.dur,
              delay: step.delay,
              tx: step.tx,
              ty: step.ty,
              orbitR: step.orbitR,
              orbitDir: step.orbitDir,
              orbitDeg: step.orbitDeg,
              orbitCx: step.orbitCx,
              orbitCy: step.orbitCy,
              rotateDir: step.rotateDir,
              rotateDeg: step.rotateDeg,
              mirrorAxis: step.mirrorAxis,
            },
            prev.tx,
            prev.ty
          );
          cumMotionRef.current[step.elId] = { tx: result.endTx, ty: result.endTy };
          if (result.waitMs > maxWait) maxWait = result.waitMs;
        }
        return;
      }

      const live =
        isLiveAnim(step.name) || (isPulseFamilyAnim(step.name) && pulseIsInfinite(step));
      const wait = live
        ? 0
        : isPulseFamilyAnim(step.name)
          ? pulseWaitMs(step)
          : (step.delay || 0) + (step.dur || 600);
      if (wait > maxWait) maxWait = wait;
      const apply = () => {
        setAnimState((prev) => ({
          ...prev,
          [step.elId]: {
            hidden: false,
            cls: animCssClass(step.name),
            dur: step.dur,
            live,
            swingCount: isPulseFamilyAnim(step.name)
              ? step.swingCount != null
                ? step.swingCount
                : 1
              : undefined,
          },
        }));
      };
      if (step.delay > 0) setTimeout(apply, step.delay);
      else apply();
      if (!live && isExitAnim(step.name)) {
        const elData = (slide.els || []).find((e) => e && String(e.id) === String(step.elId));
        window.setTimeout(() => {
          if (idxRef.current !== idx) return;
          markGroupHidden(idx, elData || { id: step.elId }, slide);
          hideElsNow(
            groupMembers(elData || { id: step.elId }, slide).map((m) => String(m.id))
          );
        }, wait);
      }
    });
    return maxWait;
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
        if (camAbortRef.current) camAbortRef.current.abort();
        let watching = true;
        camAbortRef.current = fireCameraAnim(el, step.cam, {
          W: canvasW,
          H: canvasH,
          fitScale: fitScale(),
          delay: step.delay || 0,
          duration: step.dur,
          onDone: () => {
            watching = false;
            busy.current = false;
            camAbortRef.current = null;
            setCamTransform(el.style.transform);
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
        const watch = () => {
          if (!watching || !el) return;
          setCamTransform(el.style.transform);
          requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
        return true;
      }

      if (step.kind === 'bundle') {
        const wait = playBundle(step);
        busy.current = true;
        clearBusyTimer();
        busyTimerRef.current = setTimeout(() => {
          busyTimerRef.current = null;
          busy.current = false;
          const next = steps[stepIRef.current];
          if (next && next.kind === 'bundle' && next.auto) {
            runFrom(stepIRef.current);
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
    const armFs = () => {
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
    stageRef.current._pvCamState = fullSlideCam(canvasW, canvasH);
    const fit = fitScale();
    const t = cameraCssTransform(fullSlideCam(canvasW, canvasH), fit, canvasW, canvasH);
    stageRef.current.style.transform = t;
    setCamTransform(t);
  }, [animKey, open, canvasW, canvasH, vp.w, vp.h]);

  useEffect(() => {
    if (!open) {
      clearRideAnims();
      clearAutoTimer();
      clearStageFx(stageRef.current);
      cumMotionRef.current = {};
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
          clone.style.opacity = String(fd.elOpacity != null ? fd.elOpacity : 1);
          clone.style.pointerEvents = 'none';
          clone.style.transition = 'none';
          exitSnapshots.push({ clone, fromData: fd });
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
        
        // Update state - React will render toSlide
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
            setMorphing(true);

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
                  resetMorphTextSize(el);
                });
                enterPairs.forEach(({ el, toData }) => {
                  if (!el) return;
                  el.style.opacity = String(toData.elOpacity != null ? toData.elOpacity : 1);
                });
                exitSnapshots.forEach(({ clone }) => {
                  try { clone.remove(); } catch (e) {}
                });
                busy.current = false;
                setMorphing(false);
                morphPairsRef.current = [];
              }
            }

            requestAnimationFrame(frame);
          } else {
            // No DOM elements found, fall back to normal transition
            setMorphing(false);
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
    initSlideAnims(toSlide);

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
      }, ms);
    } else if (exitSnap) {
      try { exitSnap.remove(); } catch (e) {}
    }
  };

  const goNext = () => {
    // If a transition is still mid-flight, cut it short AND still advance right away —
    // previously this just snapped the current transition to its end state and stopped,
    // requiring a second click/keypress to actually move to the next slide.
    if (busy.current) {
      skipBusy();
    }
    if (playNextAnimStep()) return;
    const list = usePresentationStore.getState().slides;
    const i = idxRef.current;
    const shuffle = useUiStore.getState().presShuffle;
    const loop = useUiStore.getState().presLoop;
    if (shuffle) {
      const available = list.map((_, j) => j).filter((j) => j !== i);
      if (!available.length) return;
      const next = available[Math.floor(Math.random() * available.length)];
      shuffleHistRef.current.push(next);
      goTo(next);
      return;
    }
    if (i >= list.length - 1) {
      if (loop) {
        goTo(0);
        return;
      }
      if (stepIRef.current >= stepsRef.current.length) closePreview();
      return;
    }
    goTo(i + 1);
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
    const dur = animDuration(a, 600);
    const delay = Math.max(0, +(a.delay || 0));
    const wait = dur + delay + 80;
    setAnimState((prev) => ({
      ...prev,
      [o.id]: {
        hidden: false,
        cls: animCssClass(a.name),
        dur,
        live: isLiveAnim(a.name),
      },
    }));
    if (a.trigger === 'nav' && a.navTarget != null) {
      scheduleNavAfterAnim(slideIdx, o, a, wait);
    } else if (isExitAnim(a.name)) {
      window.setTimeout(() => {
        if (idxRef.current !== slideIdx) return;
        markGroupHidden(slideIdx, o, slide);
        hideElsNow(groupMembers(o, slide).map((m) => String(m.id)));
      }, wait);
    }
  };

  const fireElementTriggers = (el) => {
    if (!el) return false;
    const list = usePresentationStore.getState().slides;
    const slideIdx = idxRef.current;
    const slide = list[slideIdx];
    const id = String(el.id);
    const hits = [];
    (slide?.els || []).forEach((o) => {
      (o.anims || []).forEach((a) => {
        if (!a) return;
        if (String(a.triggerElId) === id) hits.push({ o, a });
        else if ((a.maTriggerElIds || []).map(String).includes(id)) hits.push({ o, a });
        else if (o === el && (a.trigger === 'element' || a.trigger === 'nav')) hits.push({ o, a });
      });
    });
    if (!hits.length) return false;
    let navAfter = null;
    hits.forEach(({ o, a }) => {
      const dur = animDuration(a, 600);
      const delay = Math.max(0, +(a.delay || 0));
      const wait = dur + delay + 80;
      setAnimState((prev) => ({
        ...prev,
        [o.id]: {
          hidden: false,
          cls: animCssClass(a.name),
          dur,
          live: isLiveAnim(a.name),
        },
      }));
      if (a.trigger === 'nav' && a.navTarget != null) {
        const si = resolveNavTargetSlideIndex(a.navTarget, list);
        if (si != null) {
          if (!navAfter || wait > navAfter.wait) navAfter = { si, wait, o, a };
        }
      } else if (isExitAnim(a.name)) {
        window.setTimeout(() => {
          if (idxRef.current !== slideIdx) return;
          markGroupHidden(slideIdx, o, slide);
          hideElsNow(groupMembers(o, slide).map((m) => String(m.id)));
        }, wait);
      }
    });
    if (navAfter) {
      scheduleNavAfterAnim(slideIdx, navAfter.o, navAfter.a, navAfter.wait);
    }
    return true;
  };

  const goPrev = () => {
    if (busy.current) {
      skipBusy();
    }
    const list = usePresentationStore.getState().slides;
    const i = idxRef.current;
    const shuffle = useUiStore.getState().presShuffle;
    if (shuffle && shuffleHistRef.current.length > 1) {
      shuffleHistRef.current.pop();
      goTo(shuffleHistRef.current[shuffleHistRef.current.length - 1]);
      return;
    }
    if (i <= 0) return;
    goTo(i - 1);
  };

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
        const available = list.map((_, j) => j).filter((j) => j !== i);
        if (available.length) {
          const next = available[Math.floor(Math.random() * available.length)];
          shuffleHistRef.current.push(next);
          goTo(next);
        }
        return;
      }
      if (i >= list.length - 1) {
        goTo(0);
        return;
      }
      goTo(i + 1);
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
          goNext();
          return;
        }
        if (d.mode === 'slide') {
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
        closePreview();
        return;
      }
      if (e.code === 'KeyB') {
        e.preventDefault();
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
        goNext();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
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
  const animProgress = stepsRef.current.length
    ? ` · ${Math.min(stepIRef.current, stepsRef.current.length)}/${stepsRef.current.length}`
    : '';
  const clickNav = slide?.clickNav !== false;

  return (
    <div
      ref={overlayRef}
      className="preview-overlay"
      {...versionAttr('PreviewOverlay')}
      onClick={() => {
        if (black) {
          setBlack(false);
          return;
        }
        const els = slide?.els || [];
        slideAudiosForMode(els, 'click-slide').forEach((a) =>
          playMediaEl(a, { audioPool: mediaPoolRef.current })
        );
        if (clickNav) goNext();
        else playNextAnimStep();
      }}
      onTouchStart={(e) => {
        const t = e.changedTouches?.[0] || e.touches?.[0];
        if (!t) return;
        swipeRef.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = swipeRef.current;
        swipeRef.current = null;
        const t = e.changedTouches?.[0];
        if (!start || !t) return;
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
          canvasW={canvasW}
          canvasH={canvasH}
          animState={animState}
          stageRef={stageRef}
          stageTransform={camTransform}
          vpW={vp.w}
          vpH={vp.h}
          onElClick={(_el, link) => {
            // Nav/exit triggers own the click — don't also follow el.link (that skipped the anim).
            if (fireElementTriggers(_el)) return;
            const els = slide?.els || [];
            els.forEach((a) => {
              if (shouldPlayAudioOnElClick(a, _el.id)) {
                playMediaEl(a, { audioPool: mediaPoolRef.current });
              }
            });
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
            const tgt = _el.linkt || '_blank';
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

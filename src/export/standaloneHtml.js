/**
 * Self-contained HTML slideshow export for React deck.
 */

import { buildBasicShapeSVG, shapeOptsFromEl } from '../shared/shapes.js';
import { shapeNeedsOverflowVisible } from '../shared/shapesCatalog.js';
import { shapeBlurOverlayStyle, shapeBlurPx } from '../editor/shapeBlur.js';
import { shapeTextExportHtml, shapeTextWarpCss } from '../editor/shapeText.js';
import { buildIconSVG } from '../editor/iconSvg.js';
import { iconPathForRender } from '../editor/iconAnim.js';
import { getIconById } from '../editor/iconsLazy.js';
import { imageRenderStyles, normImgFrame, imgBorderSvgMarkup, imgRibbonTapeStyle, imgRibbonTapeMarkup, polaroidCaptionStyle, POLAROID_CAPTION_FONT_NAMES } from '../editor/imgStyles.js';
import { imageHasCrop, uncropWindowStyles } from '../editor/imgUncrop.js';
import { elBoxTransform } from '../editor/elTransform.js';
import { getTableCell, tableCellBg, tableCellFontStyle, tableCellRadiusCss, tableColWidthsPx, tableRowHeightsPx } from '../editor/tableCells.js';
import { tableCellBorderStyle } from '../editor/tableBorders.js';
import { getTheme, resolveSchemeColor, resolveElTextColor } from '../editor/themes.js';
import { audioPlayerTheme } from '../editor/mediaPlay.js';
import { buildChartSvg, chartWrapStyle } from '../editor/tableChart.js';
import { connectorPathFor, connectorDashArray, connectorMarkerUrl, connectorsMarkerDefsSvg, connectorLinecap, connectorsAnimStyleCss, connectorAnimName, collectSlideRideSpecs } from '../editor/connectors.js';
import { inkStrokeSvgMarkup } from '../editor/inkRender.js';
import { inkFillsSvgMarkup } from '../editor/inkFill.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from '../editor/canvasDims.js';
import {
  buildHfSrcdoc,
  hfTitleFromSrc,
  isHttpUrl,
  HF_SANDBOX,
} from '../editor/htmlFrame.js';
import { codeBlockSurfaceStyle, codeBlockInnerHtml } from '../editor/codeHighlight.js';
import { elFilterCss, elInsetShadowSvgMarkup, hasElShadow, isElShadowInset } from '../editor/elShadow.js';
import { buildLineAngleContent } from '../editor/lineAngle.js';
import { appletSandbox } from '../editor/appletSandbox.js';
import { counterMountHtml } from '../editor/applets.js';
import { buildLegoSvg } from '../editor/lego.js';
import { textBgExportCss, textColorGradStyle } from '../editor/textBg.js';
import { textBorderBoxStyle, textBorderSvgMarkup, needsTextBorderOverflow } from '../editor/textBorder.js';
import { textGlyphShadowStyle, textBlockShadowStyle, textNeedsOverflowVisible } from '../editor/textShadow.js';
import { textPadCss } from '../editor/textPad.js';
import { textBorderRadiusCss } from '../editor/textRadius.js';
import { textAlignSelf } from '../editor/textAlign.js';
import {
  DEFAULT_TEXT_FONT_FAMILY,
  canonicalFontFamily,
  elementFontFamily,
  parseCsNumber,
} from '../editor/fonts.js';
import { underlineBoxProps, prepareTextUnderlineHtml, TEXT_UL_DASH_DOT_CSS } from '../editor/textUnderline.js';
import { TEXT_STRESS_CSS } from '../editor/textStress.js';
import {
  PLAYBACK_ANIM_CSS,
  PLAYBACK_HOVER_CSS,
  decorateExportEl,
  serializePlaybackSteps,
  deckPlaybackSteps,
  buildStandalonePlaybackScript,
  compactArLayoutsForExport,
} from './playbackAnim.js';
import { isEntranceAnim } from '../editor/anims.js';
import { saveSlidesArLayout, arLayoutKey } from '../editor/arLayout.js';
import { slideBgImgExportHtml, slideSolidBg } from '../editor/slideBgImg.js';
import { deckTransData, PLAYBACK_TRANS_CSS } from '../editor/transitions.js';
import { model3dCfgJson, model3dExportIife, model3dBootSnippet } from './model3dExport.js';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function css(obj) {
  return Object.entries(obj || {})
    .filter(([, v]) => v != null && v !== '' && v !== false)
    .map(([k, v]) => {
      const prop = k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
      // Values go into style="…"; raw " would terminate the HTML attribute
      // (e.g. font-family:"Tobi Greek" stored from the editor).
      const val = String(v).replace(/"/g, "'");
      return `${prop}:${val}`;
    })
    .join(';');
}

function normalizeFontFamily(family) {
  return String(family || '')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')
    .replace(/^["']+|["']+$/g, '')
    .trim()
    .toLowerCase();
}

function firstFontFamily(value) {
  let s = String(value || '').trim();
  // Scraping style="font-family:Name" often leaves a dangling attribute quote.
  s = s.replace(/["']+$/g, '').trim();
  const quoted = s.match(/^(['"])(.*?)\1/);
  return normalizeFontFamily(quoted ? quoted[2] : s.split(',')[0]);
}

/** Safe font-family for HTML style="…" (single-quoted multi-word names). */
function exportFontFamily(value, fallback = DEFAULT_TEXT_FONT_FAMILY) {
  return canonicalFontFamily(value, fallback) || DEFAULT_TEXT_FONT_FAMILY;
}

function usedFontFamilies(deck) {
  const families = new Set();
  const visited = new WeakSet();

  function addFamily(value) {
    const family = firstFontFamily(value);
    if (family && family !== 'inherit' && family !== 'unset') families.add(family);
  }

  function addFromCss(value) {
    const text = String(value || '');
    // Pull font-family out of style="…" first so HTML attribute quotes are not part of the name.
    const styleRe = /style\s*=\s*(["'])([\s\S]*?)\1/gi;
    let styleMatch;
    while ((styleMatch = styleRe.exec(text))) {
      const re = /font-family\s*:\s*([^;]+)/gi;
      let match;
      while ((match = re.exec(styleMatch[2]))) addFamily(match[1]);
    }
    // Also scan raw CSS / leftover declarations (cs, shapeTextCss, etc.).
    const re = /font-family\s*:\s*([^;<>]+)/gi;
    let match;
    while ((match = re.exec(text))) addFamily(match[1]);
  }

  function visit(value, key = '') {
    if (!value || typeof value !== 'object') {
      if (typeof value !== 'string') return;
      if (/^(ff|fontFamily)$/i.test(key)) {
        addFamily(value);
      } else if (/^(cs|shapeTextCss|codeCs)$/i.test(key) || /html$/i.test(key) || key === 'md') {
        addFromCss(value);
      } else if (key === 'imgFrame' && value === 'polaroid') {
        POLAROID_CAPTION_FONT_NAMES.forEach((name) => families.add(normalizeFontFamily(name)));
      }
      return;
    }
    if (visited.has(value)) return;
    visited.add(value);
    Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
  }

  visit(deck);
  // Export always applies this fallback when a text/shape box has no explicit family.
  addFamily(DEFAULT_TEXT_FONT_FAMILY);
  return families;
}

function fontsCssForDeck(fontCss, deck) {
  const used = usedFontFamilies(deck);
  if (!used.size) return '';
  return (String(fontCss || '').match(/@font-face\s*\{[^}]*\}/gi) || [])
    .filter((rule) => {
      const match = rule.match(/font-family\s*:\s*(?:"([^"]+)"|'([^']+)'|([^;]+))/i);
      const family = normalizeFontFamily(match?.[1] || match?.[2] || match?.[3]);
      return used.has(family);
    })
    .join('\n');
}

function baseStyle(el) {
  const op = el.elOpacity != null ? el.elOpacity : 1;
  const xf = elBoxTransform(el);
  return {
    position: 'absolute',
    left: `${el.x || 0}px`,
    top: `${el.y || 0}px`,
    width: `${el.w || 100}px`,
    height: `${el.h || 60}px`,
    opacity: op,
    transform: xf,
    // Authored rotation/flip — CSS entrance keyframes end at var(--el-xf) so
    // fill:both does not wipe the pose (same idea as preview keeping elBoxTransform).
    ...(xf ? { ['--el-xf']: xf } : null),
    filter: elFilterCss(el),
    boxSizing: 'border-box',
    overflow: 'hidden',
  };
}

function resolveExportMediaSrc(el, mediaMap) {
  if (!el) return '';
  const src = el.mediaSrc || '';
  if (src && !String(src).startsWith('blob:')) return src;
  if (el.mediaId && mediaMap && mediaMap[el.mediaId]) return mediaMap[el.mediaId];
  return src;
}

function elHtml(el, slideEls, theme, canvasW, canvasH, mediaMap) {
  if (!el || el.objHidden) return '';
  if (el._isDecor && (el.svgContent || el.svg)) {
    return `<div class="el decor-el" data-decor="1" style="${css({
      ...baseStyle(el),
      pointerEvents: 'none',
      zIndex: 0,
      overflow: 'visible',
    })}">${el.svgContent || el.svg || ''}</div>`;
  }
  if (el._isDecor) return '';
  if (el.type === 'inkhost') return '';

  const style = baseStyle(el);

  if (el.type === 'lineangle') {
    const built = buildLineAngleContent(el, slideEls || []);
    if (!built) return '';
    return `<div class="el" style="${css({
      ...style,
      left: `${built.x}px`,
      top: `${built.y}px`,
      width: `${built.w}px`,
      height: `${built.h}px`,
      overflow: 'visible',
      background: 'transparent',
    })}">${built.html}</div>`;
  }

  if (el.type === 'applet') {
    const html =
      el.appletId === 'counter' ? counterMountHtml(el) || el.appletHtml || '' : el.appletHtml || '';
    if (!html) return '';
    const cntGid =
      el.appletId === 'counter' && el.cntGroupId ? String(el.cntGroupId).trim() : '';
    const isGen = ['clock', 'timer', 'generator', 'counter'].includes(el.appletId);
    const brdW = isGen && el.genBorderWidth != null ? +el.genBorderWidth : 0;
    const brdC = el.genBorderColor || 'rgba(99,102,241,0.22)';
    const rx = el.rx != null ? +el.rx : el.appletId === 'flip' || el.appletId === 'periodic' ? 14 : 0;
    const bord =
      brdW > 0
        ? `<div class="applet-border-overlay" style="position:absolute;inset:0;border-radius:${rx}px;border:${brdW}px solid ${esc(brdC)};box-sizing:border-box;pointer-events:none;z-index:2"></div>`
        : '';
    const tmStart =
      el.appletId === 'timer'
        ? el.tmStart === 'click-slide' || el.tmStart === 'click-el'
          ? el.tmStart
          : 'auto'
        : '';
    const tmTrig =
      el.appletId === 'timer' && tmStart === 'click-el' && el.tmStartElId
        ? String(el.tmStartElId)
        : '';
    const tmAttrs =
      el.appletId === 'timer'
        ? ` data-tm-start="${esc(tmStart)}"${tmTrig ? ` data-tm-trigger="${esc(tmTrig)}"` : ''}`
        : '';
    return `<div class="el" data-applet-id="${esc(el.appletId || '')}"${
      cntGid ? ` data-cnt-group-id="${esc(cntGid)}"` : ''
    }${tmAttrs} style="${css({
      ...style,
      padding: 0,
      overflow: 'hidden',
      background: 'transparent',
      borderRadius: rx > 0 ? `${rx}px` : undefined,
      position: 'absolute',
      boxSizing: 'border-box',
    })}"><iframe title="${esc(el.appletId || 'applet')}" data-applet-id="${esc(el.appletId || '')}"${tmAttrs} sandbox="${appletSandbox(el)}" srcdoc="${esc(html)}" style="width:100%;height:100%;border:0;display:block;background:transparent;pointer-events:${el.appletId === 'calculator' || el.appletId === 'counter' || el.appletId === 'flip' || el.appletId === 'notes' ? 'auto' : 'none'}"></iframe>${bord}</div>`;
  }

  if (el.type === 'model3d') {
    const bg = el.objBgCleared ? 'transparent' : el.objBg || '#0f172a';
    const cfg = model3dCfgJson(el);
    return `<div class="el model3d-host" data-model3d-viewer="1" data-id="${esc(el.id)}" style="${css({
      ...style,
      padding: 0,
      overflow: 'hidden',
      background: bg,
      touchAction: 'none',
      cursor: 'grab',
    })}"><script type="application/json" class="model3d-cfg">${cfg}</script></div>`;
  }

  if (el.type === 'lego') {
    return `<div class="el" style="${css({
      ...style,
      padding: 0,
      overflow: 'visible',
      background: 'transparent',
    })}">${buildLegoSvg(el, slideEls)}</div>`;
  }

  if (el.type === 'graph') {
    if (el.graphImg) {
      const graphBlur = el.graphTheme === 'blur';
      const graphTransparent =
        el.graphTheme === 'transparent' || graphBlur || el.graphKind === 'chem';
      const graphBg = graphTransparent
        ? 'transparent'
        : el.graphBg || (el.graphDark === false ? '#ffffff' : '#16161e');
      const chrome = {
        ...style,
        padding: 0,
        overflow: 'hidden',
        background: graphBg,
        borderRadius: el.graphRadius ?? 16,
      };
      if (graphBlur) {
        chrome.backdropFilter = 'blur(14px)';
        chrome.WebkitBackdropFilter = 'blur(14px)';
      }
      const paths = Array.isArray(el.graphPaths) ? el.graphPaths : [];
      if (el.graphAnimate && el.graphAxesImg && paths.length) {
        const animDur = Math.max(0.4, Math.min(12, +(el.graphAnimDur ?? 1.8) || 1.8));
        const holdSec = 1;
        const eraseSec = 0.28;
        const animTotal = animDur + holdSec + eraseSec;
        const pDraw = Math.max(1, Math.min(90, (animDur / animTotal) * 100));
        const pHold = Math.max(pDraw + 1, Math.min(99, ((animDur + holdSec) / animTotal) * 100));
        const kf = `rgstroke_${String(el.id || 'g').replace(/[^\w-]/g, '_')}`;
        const pw = el.graphPathW || 800;
        const ph = el.graphPathH || 560;
        const pathMarkup = paths
          .map(
            (p) =>
              `<path class="react-graph-stroke-draw" d="${esc(p.d)}" fill="none" stroke="${esc(p.color || el.graphColor || '#6366f1')}" stroke-width="${p.width ?? el.graphLineWidth ?? 2.5}" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="animation-name:${kf};animation-duration:${animTotal}s;--graph-anim-total:${animTotal}s"/>`
          )
          .join('');
        return `<div class="el" style="${css(chrome)}"><style>@keyframes ${kf}{0%{stroke-dashoffset:1}${pDraw}%{stroke-dashoffset:0}${pHold}%{stroke-dashoffset:0}100%{stroke-dashoffset:1}}</style><div style="position:relative;width:100%;height:100%"><img src="${esc(el.graphAxesImg)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block"/><svg class="react-graph-curves" viewBox="0 0 ${pw} ${ph}" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${pathMarkup}</svg></div></div>`;
      }
      return `<div class="el" style="${css(chrome)}"><img src="${esc(el.graphImg)}" alt="" style="width:100%;height:100%;object-fit:contain;display:block"/></div>`;
    }
    return `<div class="el" style="${css({ ...style, padding: '8px', color: '#94a3b8', fontSize: '12px' })}">${esc(el.graphLatex || 'graph')}</div>`;
  }

  if (el.type === 'formula' && el.formulaSvg) {
    const fAlign = ((el.cs || '').match(/text-align\s*:\s*([^;]+)/i) || [])[1]?.trim().toLowerCase();
    const align = fAlign === 'center' || fAlign === 'right' ? fAlign : 'left';
    const justify =
      align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
    const tagM = String(el.formulaRaw || '').match(/\\tag\s*\{([^}]*)\}/);
    let tagLabel = '';
    if (tagM) {
      const raw = String(tagM[1] || '').trim();
      tagLabel = raw ? (/^\(.*\)$/.test(raw) ? raw : `(${raw})`) : '';
    }
    const tagHtml = tagLabel
      ? `<div style="flex:0 0 auto;font-family:Cambria, MathJax_NonItalic, serif;font-size:0.85em;line-height:1">${esc(tagLabel)}</div>`
      : '';
    return `<div class="el" style="${css({
      ...style,
      color: el.formulaColor || el.textColor || '#fff',
      padding: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      overflow: 'visible',
      boxSizing: 'border-box',
    })}"><div style="flex:1 1 auto;min-width:0;height:100%;display:flex;align-items:center;justify-content:${justify}">${el.formulaSvg}</div>${tagHtml}</div>`;
  }

  if (el.type === 'text' || el.type === 'formula') {
    const color = el.textColor || '#fff';
    const body = el.html || el.text || '';
    const cs = el.cs || '';
    const family = exportFontFamily(
      elementFontFamily(
        el,
        el.type === 'formula' ? 'Cambria, MathJax_NonItalic, serif' : DEFAULT_TEXT_FONT_FAMILY
      ),
      el.type === 'formula' ? 'Cambria, MathJax_NonItalic, serif' : DEFAULT_TEXT_FONT_FAMILY
    );
    const fs = (cs.match(/font-size\s*:\s*([\d.]+)px/i) || [])[1] || (el.type === 'formula' ? 40 : 36);
    const align = (cs.match(/text-align\s*:\s*([^;]+)/i) || [])[1] || 'left';
    const weight = (cs.match(/font-weight\s*:\s*([^;]+)/i) || [])[1];
    const fontStyle = (cs.match(/font-style\s*:\s*([^;]+)/i) || [])[1];
    const rx = el.type === 'text' ? textBorderRadiusCss(el) : undefined;
    const bgCss = el.type === 'text' ? textBgExportCss(el) : {};
    const isToc = el.type === 'text' && el.textRole === 'toc';
    const grad = el.type === 'text' && !isToc ? textColorGradStyle(el) : null;
    const borderBox = el.type === 'text' ? textBorderBoxStyle(el) : null;
    const borderSvg = el.type === 'text' ? textBorderSvgMarkup(el) : '';
    const glyphSh = el.type === 'text' ? textGlyphShadowStyle(el) : null;
    const blockSh = el.type === 'text' ? textBlockShadowStyle(el) : null;
    const warpCss = el.type === 'text' ? shapeTextWarpCss(el) : null;
    const gradCss = grad
      ? {
          display: 'inline-block',
          width: 'fit-content',
          maxWidth: '100%',
          backgroundImage: grad.backgroundImage,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        }
      : { color };
    const lineH = parseCsNumber(cs, 'line-height');
    const letterSp = parseCsNumber(cs, 'letter-spacing');
    const textTransform = (cs.match(/text-transform\s*:\s*([^;]+)/i) || [])[1];
    const valign = el.valign || (el.type === 'formula' ? 'middle' : 'top');
    const justify =
      valign === 'middle' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start';
    const ulPrep =
      el.type === 'text'
        ? prepareTextUnderlineHtml(body, cs)
        : { html: body, paintBoxUnderline: false };
    let bodyOut = ulPrep.html;
    const ulBox =
      el.type === 'text'
        ? underlineBoxProps(cs, { paintBoxUnderline: ulPrep.paintBoxUnderline })
        : { style: {}, className: '' };
    // Add font-family to all spans that don't have it yet (for text elements with nested spans)
    if (family && el.type === 'text') {
      bodyOut = String(bodyOut).replace(
        /<span([^>]*)>/gi,
        (match, attrs) => {
          if (/font-family/i.test(attrs)) return match; // already has font-family
          const styleAttr = attrs.trim() ? ' ' + attrs : attrs;
          const hasStyle = /style\s*=/i.test(styleAttr);
          const newStyle = hasStyle
            ? styleAttr.replace(/style\s*="([^"]*)"/i, (m, existingStyle) => {
                return ' style="' + existingStyle + '; font-family:' + family + '"';
              })
            : ' style="font-family:' + family + '"';
          return '<span' + newStyle + '>';
        }
      );
    }
    // Wrap each list marker+text pair in a flex container so they stay on the same line
    bodyOut = String(bodyOut).replace(
      /(<span[^>]*data-list-(?:bullet|num)[^>]*>[\s\S]*?<\/span>)([^<]*)/g,
      '<div data-export-list-line style="display:flex;align-items:center">$1$2</div>'
    );
    // The block wrapper already starts a new line; keep only additional BRs that
    // represent intentional blank lines between list items.
    bodyOut = bodyOut.replace(
      /(<div data-export-list-line[^>]*>[\s\S]*?<\/div>)<br\s*\/?>/gi,
      '$1'
    );
    const hasList =
      el.type === 'text' &&
      (/(data-list-bullet|data-list-num)/i.test(bodyOut) || el.bulletIconId);
    const boxCss = {
      ...style,
      overflow: needsTextBorderOverflow(el) || textNeedsOverflowVisible(el) || warpCss ? 'visible' : undefined,
    };
    const innerCss = {
      position: 'absolute',
      inset: 0,
      boxSizing: 'border-box',
      transformOrigin: '0 0',
      transform: warpCss || undefined,
      padding: el.type === 'text' ? textPadCss(el) : '8px',
      fontFamily: family,
      fontSize: `${fs}px`,
      fontWeight: weight || undefined,
      fontStyle: fontStyle || undefined,
      textAlign: align.trim(),
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      lineHeight: lineH != null ? lineH : 1.2,
      letterSpacing: letterSp != null ? `${letterSp}px` : undefined,
      textTransform: textTransform ? textTransform.trim() : undefined,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: justify,
      border: borderBox?.border,
      borderRadius: rx,
      ...(hasList ? { '--rt-bullet-gap': `${el.bulletGap != null ? el.bulletGap : 10}px` } : {}),
      ...bgCss,
      ...(blockSh || {}),
      ...(ulBox.style || {}),
    };
    const ulCls = `el react-el-text${isToc ? ' has-toc' : ''}${ulBox.className ? ` ${ulBox.className}` : ''}`;
    const textBodyCss = {
      position: 'relative',
      zIndex: 1,
      width: 'fit-content',
      maxWidth: '100%',
      minWidth: 0,
      alignSelf: textAlignSelf(align),
      ...gradCss,
      ...(glyphSh || {}),
    };
    return `<div class="${ulCls}" style="${css(boxCss)}"><div style="${css(innerCss)}">${borderSvg}<div style="${css(textBodyCss)}">${bodyOut}</div></div></div>`;
  }

  if (el.type === 'image' && el.src) {
    const rs = imageRenderStyles(el, { canvasW, canvasH });
    const frame = normImgFrame(el.imgFrame);
    const borderSvg = frame === 'none' ? imgBorderSvgMarkup(el) : '';
    const hasCrop = imageHasCrop(el);
    // Match PreviewImageBody: pixel-locked crop window (not only % crop on <img>).
    const win = hasCrop ? uncropWindowStyles(el, false, 0) : null;
    const ribbon =
      frame === 'ribbon'
        ? `<div class="react-img-ribbon-bar" style="${css(imgRibbonTapeStyle())}">${imgRibbonTapeMarkup()}</div>`
        : '';
    const cap =
      frame === 'polaroid' && el.imgCaption
        ? `<div class="react-img-polaroid-cap" style="${css(polaroidCaptionStyle(el, canvasW, canvasH))}">${esc(el.imgCaption)}</div>`
        : '';
    const borderLayer = borderSvg
      ? `<div style="position:absolute;inset:0;pointer-events:none;z-index:3;overflow:visible">${borderSvg}</div>`
      : '';
    const hostOverflow =
      borderSvg || frame !== 'none' || hasCrop ? 'visible' : rs.box.overflow || 'hidden';
    const innerStyle = win
      ? { ...rs.inner, ...win.inner }
      : frame === 'polaroid'
        ? { ...rs.inner, position: 'relative', width: '100%', height: '100%' }
        : {
            ...rs.inner,
            position: 'absolute',
            inset: 0,
          };
    const imgStyle = win ? { ...rs.img, ...win.img, pointerEvents: 'none' } : rs.img;
    return `<div class="el${rs.frameClass ? ` ${rs.frameClass}` : ''}" style="${css({ ...style, ...rs.box, opacity: frame === 'ribbon' || frame === 'polaroid' ? style.opacity : 1, overflow: hostOverflow })}">${rs.borderFilterSvg}<div style="${css(innerStyle)}"><img alt="" src="${esc(el.src)}" style="${css(imgStyle)}"/></div>${borderLayer}${ribbon}${cap}</div>`;
  }

  if (el.type === 'markdown') {
    const rx = textBorderRadiusCss(el);
    const bgCss = textBgExportCss(el);
    const borderBox = textBorderBoxStyle(el);
    const borderSvg = textBorderSvgMarkup(el);
    const borderLayer = borderSvg
      ? `<div style="position:absolute;inset:0;pointer-events:none;z-index:5;overflow:visible">${borderSvg}</div>`
      : '';
    return `<div class="el md react-el-md" style="${css({
      ...style,
      color: el.mdColor || el.textColor || '#fff',
      fontSize: `${el.mdFs || 16}px`,
      overflow: needsTextBorderOverflow(el) ? 'visible' : 'auto',
      padding: '10px',
      borderRadius: rx,
      border: borderBox?.border,
      background: 'transparent',
      ...bgCss,
    })}">${borderLayer}<div class="md" style="position:relative;z-index:1">${el.mdHtml || ''}</div></div>`;
  }

  if (el.type === 'code') {
    const surface = codeBlockSurfaceStyle(el);
    const inner = codeBlockInnerHtml(el);
    return `<div class="el" style="${css({ ...style, padding: 0, overflow: 'hidden', background: 'transparent' })}"><div style="${css(surface)}">${inner}</div></div>`;
  }

  if (el.type === 'htmlframe') {
    const src = el.hfSrc || '';
    const showChrome = el.hfChrome !== false;
    const url = isHttpUrl(src);
    const title = hfTitleFromSrc(src);
    const chrome = showChrome
      ? `<div class="react-hf-bar" style="display:flex;align-items:flex-end;gap:8px;padding:6px 8px 0;background:#e8eaed;flex:0 0 auto"><div style="display:flex;gap:5px;padding:0 4px 8px"><span style="width:10px;height:10px;border-radius:50%;background:#ff5f57"></span><span style="width:10px;height:10px;border-radius:50%;background:#febc2e"></span><span style="width:10px;height:10px;border-radius:50%;background:#28c840"></span></div><div style="flex:1;background:#fff;border-radius:6px 6px 0 0;padding:4px 10px;font:11px/1.2 system-ui,sans-serif;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(title)}</div></div>`
      : '';
    const iframeAttrs = url
      ? `src="${esc(src)}"`
      : `srcdoc="${esc(buildHfSrcdoc(src))}"`;
    return `<div class="el react-el-hf" style="${css({
      ...style,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRadius: showChrome ? 6 : 0,
      border: showChrome ? '1px solid rgba(128,128,128,.25)' : 'none',
      background: 'transparent',
      padding: 0,
    })}">${chrome}<div style="flex:1;min-height:0;position:relative"><iframe title="${esc(title)}" sandbox="${HF_SANDBOX}" allowfullscreen ${iframeAttrs} scrolling="${el.hfScroll ? 'auto' : 'no'}" style="position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff"></iframe></div></div>`;
  }

  if (el.type === 'mediavideo' && (el.mediaSrc || el.mediaId)) {
    const playSrc = resolveExportMediaSrc(el, mediaMap);
    const full = el.mvDisplay === 'fullscreen';
    const ctrl = el.mvControls !== 'none';
    const auto = el.mvStart === 'auto';
    const midAttr = el.mediaId ? ` data-mv-id="${esc(el.mediaId)}"` : '';
    // Prefer mediaId lookup in the shared MEDIA map so copies don't re-embed the file.
    const inlineSrc = el.mediaId && mediaMap && mediaMap[el.mediaId] ? '' : playSrc;
    if (full) {
      return `<div class="el mv-fs"${midAttr} data-mv-src="${esc(inlineSrc)}" data-mv-ctrl="${ctrl ? '1' : '0'}" data-mv-auto="${auto ? '1' : '0'}" style="${css({
        ...style,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexDirection: 'column',
        gap: '10px',
        color: 'rgba(255,255,255,.5)',
        fontSize: '12px',
      })}"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.3"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,8 16,12 10,16" fill="rgba(255,255,255,.8)" stroke="none"/></svg><span>Нажмите для просмотра</span></div>`;
    }
    const srcAttr = inlineSrc ? ` src="${esc(inlineSrc)}"` : '';
    return `<video class="el"${midAttr}${srcAttr} ${ctrl ? 'controls' : ''} ${auto ? 'autoplay muted' : ''} playsinline style="${css({ ...style, background: '#000', objectFit: 'contain' })}"></video>`;
  }

  if (el.type === 'mediaaudio') {
    const t = audioPlayerTheme(theme);
    const playSrc = resolveExportMediaSrc(el, mediaMap);
    const midAttr = el.mediaId ? ` data-ma-id="${esc(el.mediaId)}"` : '';
    const inlineSrc = el.mediaId && mediaMap && mediaMap[el.mediaId] ? '' : playSrc;
    const vol = el.maVolume != null ? +el.maVolume : 1;
    const auto = el.maStart === 'auto';
    // Track ends at pill end-cap centre (radius ≈ height/2), not in the rounded tip.
    const endPad = Math.max(14, Math.round((el.h || 48) / 2));
    return `<div class="el react-el-audio" data-audio-player="1"${midAttr} data-ma-src="${esc(inlineSrc)}" data-ma-loop="${el.maLoop ? '1' : '0'}" data-ma-vol="${vol}" data-ma-auto="${auto ? '1' : '0'}" style="${css({
      ...style,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      padding: 0,
      overflow: 'visible',
      ['--react-audio-accent']: t.accent,
      ['--react-audio-controls']: t.controls,
      ['--react-audio-panel']: t.panel,
      ['--react-audio-time']: t.time,
      colorScheme: t.colorScheme,
    })}"><div class="react-themed-audio" style="width:100%;height:100%;display:flex;align-items:center;gap:8px;padding-left:10px;padding-right:0;box-sizing:border-box;border-radius:999px;background:${esc(t.panel)};color:${esc(t.controls)}">
<button type="button" class="ta-play" aria-label="Play" style="flex:0 0 auto;width:22px;height:22px;border:0;padding:0;background:transparent;color:inherit;cursor:pointer;display:grid;place-items:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5L7 4.5z"/></svg></button>
<span class="ta-time" style="flex:0 0 auto;font:600 11px/1 system-ui,sans-serif;color:${esc(t.time)};min-width:64px;font-variant-numeric:tabular-nums">0:00 / 0:00</span>
<div class="ta-track" style="flex:1;min-width:24px;height:14px;display:flex;align-items:center;cursor:pointer"><div style="width:100%;height:3px;border-radius:2px;background:color-mix(in srgb, ${esc(t.controls)} 28%, ${esc(t.panel)});overflow:hidden"><div class="ta-fill" style="width:0%;height:100%;background:${esc(t.controls)};border-radius:2px"></div></div></div>
<div class="ta-endpad" aria-hidden="true" style="flex:0 0 auto;width:${endPad}px;height:1px;pointer-events:none"></div>
</div></div>`;
  }

  if (el.type === 'icon') {
    const ic = el.iconId ? getIconById(el.iconId) : null;
    const color = el.iconColor || el.textColor || '#6366f1';
    if (ic) {
      return `<div class="el react-el-icon" style="${css({ ...style, padding: '0', overflow: 'visible' })}">${buildIconSVG(ic, color, el.iconSw != null ? el.iconSw : 1.8, el.iconFillOp != null ? el.iconFillOp : 1, iconPathForRender(ic, el))}</div>`;
    }
    return `<div class="el" style="${css({
      ...style,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${Math.min(el.w || 96, el.h || 96) * 0.7}px`,
    })}">${esc(el.emoji || '⭐')}</div>`;
  }

  if (el.type === 'shape') {
    const svg = buildBasicShapeSVG(el.shape || 'rect', shapeOptsFromEl(el));
    const txt = shapeTextExportHtml(el, esc);
    const sb = shapeBlurPx(el);
    const insetSvg = hasElShadow(el) && isElShadowInset(el) ? elInsetShadowSvgMarkup(el) : '';
    const insetHtml = insetSvg
      ? `<div style="${css({
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
        })}">${insetSvg}</div>`
      : '';
    const shapeStyle = {
      ...style,
      position: 'absolute',
      overflow: shapeNeedsOverflowVisible(el.shape, el) ? 'visible' : style.overflow,
    };
    if (sb > 0) {
      const blur = shapeBlurOverlayStyle(el) || {};
      return `<div class="el" style="${css({ ...shapeStyle, overflow: 'visible' })}"><div style="${css(blur)}"></div><div style="position:relative;z-index:1;width:100%;height:100%">${svg}</div>${insetHtml}${txt}</div>`;
    }
    return `<div class="el" style="${css(shapeStyle)}"><div style="position:relative;z-index:1;width:100%;height:100%">${svg}</div>${insetHtml}${txt}</div>`;
  }

  if (el.type === 'table') {
    if (el.showChart) {
      const wrap = chartWrapStyle(el);
      const wrapCss = css({
        ...wrap,
        width: '100%',
        height: '100%',
      });
      return `<div class="el" style="${css({ ...style, overflow: 'visible' })}"><div style="${wrapCss}">${buildChartSvg(el)}</div></div>`;
    }
    // v7.1 export parity: separate borders, colgroup px widths, merged cells, per-edge borders
    const rows = el.rows || 3;
    const cols = el.cols || 3;
    const rx = +(el.rx || 0);
    const blur = +(el.tableBgBlur || 0);
    const textColor = resolveElTextColor(el, theme);
    const cws = tableColWidthsPx(el, el.w || 200);
    const rhs = tableRowHeightsPx(el, el.h || 150, 12);
    let body = `<colgroup>${cws.map((w) => `<col style="width:${w}px">`).join('')}</colgroup><tbody>`;
    for (let r = 0; r < rows; r++) {
      body += `<tr style="height:${rhs[r] || 30}px">`;
      for (let c = 0; c < cols; c++) {
        const cell = getTableCell(el, r, c);
        if (cell.hidden) continue;
        const cs = cell.colspan || 1;
        const rs = cell.rowspan || 1;
        const isH = r === 0 && el.headerRow !== false;
        const bg = tableCellBg(el, r, c, cell, theme) || '';
        const rad = tableCellRadiusCss(el, r, c, cs, rs) || '';
        const span = (cs > 1 ? ` colspan="${cs}"` : '') + (rs > 1 ? ` rowspan="${rs}"` : '');
        const bs = tableCellBorderStyle(el, r, c, cell, theme);
        const brd =
          `border-top:${esc(bs.borderTop)};border-left:${esc(bs.borderLeft)};` +
          `border-right:${esc(bs.borderRight)};border-bottom:${esc(bs.borderBottom)};`;
        const fs = cell.fs != null ? `font-size:${+cell.fs}px;` : '';
        const tc =
          cell.textColor || cell.textColorScheme != null
            ? `color:${esc(resolveSchemeColor(cell.textColorScheme, theme) || cell.textColor || textColor)};`
            : '';
        const ff = cell.ff ? `font-family:${esc(exportFontFamily(cell.ff))};` : '';
        const face = tableCellFontStyle(el, r, c, cell);
        const fw = face.fontWeight != null ? `font-weight:${esc(face.fontWeight)};` : '';
        const fst = face.fontStyle ? `font-style:${esc(face.fontStyle)};` : '';
        const tag = isH ? 'th' : 'td';
        body += `<${tag}${span} style="background:${esc(bg)};${brd}text-align:${esc(cell.align || 'left')};vertical-align:${esc(cell.valign || 'middle')};padding:3px 8px;overflow:hidden;word-break:normal;overflow-wrap:break-word;box-sizing:border-box;${fw}${fst}${fs}${tc}${ff}${rad}">${cell.html || ''}</${tag}>`;
      }
      body += '</tr>';
    }
    body += '</tbody>';
    const blurLayer =
      blur > 0
        ? `<div style="position:absolute;inset:0;border-radius:${rx}px;backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);z-index:0;pointer-events:none"></div>`
        : '';
    const table = `<table style="width:100%;height:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:${el.fs || 15}px;color:${esc(textColor)};font-family:${esc(exportFontFamily(el.ff || DEFAULT_TEXT_FONT_FAMILY))}">${body}</table>`;
    return `<div class="el" style="${css({
      ...style,
      background: 'transparent',
    })}">${blurLayer}<div style="position:relative;width:100%;height:100%;border-radius:${rx}px;overflow:hidden;z-index:1">${table}</div></div>`;
  }

  if (el.type === 'pagenum') {
    return `<div class="el" style="${css({
      ...style,
      overflow: 'visible',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
    })}">${el.html || ''}</div>`;
  }

  if (el.type === 'svg' || el.svgContent) {
    return `<div class="el" style="${css(style)}">${el.svgContent || el.svg || ''}</div>`;
  }

  return '';
}

function connectorsSvg(slide, W, H) {
  const conns = slide.connectors || [];
  if (!conns.length) return '';
  const paths = conns
    .map((conn) => {
      if (conn.objHidden) return '';
      const d = connectorPathFor(conn, slide.els || []);
      if (!d) return '';
      const sw = conn.sw != null ? conn.sw : 2;
      const dash = connectorDashArray(conn.dash, sw);
      const dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
      const fromType = conn.fromMarker || 'none';
      const toType = conn.toMarker || 'none';
      const ms = connectorMarkerUrl('start', fromType, conn.id, 'ex');
      const me = connectorMarkerUrl('end', toType, conn.id, 'ex');
      const msAttr = ms ? ` marker-start="${ms}"` : '';
      const meAttr = me ? ` marker-end="${me}"` : '';
      const cap = connectorLinecap(conn.dash, fromType, toType);
      let animAttr = '';
      if (conn.animated && conn.dash && conn.dash !== 'solid') {
        const dur = conn.dash === 'dot' ? '1s' : '0.8s';
        animAttr = ` style="animation:${connectorAnimName(conn.id)} ${dur} linear infinite"`;
      }
      return `<path d="${d}" fill="none" stroke="${esc(conn.color || '#94a3b8')}" stroke-width="${sw}" stroke-linecap="${cap}" stroke-linejoin="round"${dashAttr}${msAttr}${meAttr}${animAttr}/>`;
    })
    .join('');
  const animCss = connectorsAnimStyleCss(conns);
  const defs = connectorsMarkerDefsSvg(conns, 'ex') + (animCss ? `<style>${animCss}</style>` : '');
  return `<svg class="el" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs>${defs}</defs>${paths}</svg>`;
}

function inkSvg(slide, W, H) {
  const ink = slide.ink || [];
  const fills = slide.inkFills || [];
  if (!ink.length && !fills.length) return '';
  const fillMarkup = inkFillsSvgMarkup(fills);
  const paths = ink
    .map((st) => {
      const d =
        st.d ||
        (st.points || []).map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
      if (!d) return '';
      return inkStrokeSvgMarkup({ ...st, d });
    })
    .join('');
  return `<svg class="el react-ink-layer" data-ink-layer="1" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible" viewBox="0 0 ${W} ${H}" aria-hidden="true">${fillMarkup}${paths}</svg>`;
}

/** Inner HTML of one slide (ink + connectors + els) for playback / export. */
export function renderSlideInnerHtml(slide, W, H, theme, mediaMap) {
  const s = slide || { els: [] };
  const slideEls = s.els || [];
  const entranceGroups = new Set(
    slideEls
      .filter(
        (e) =>
          e &&
          e.groupId &&
          (e.anims || []).some(
            (a) => a && (isEntranceAnim(a.name) || a.name === 'cosmosTitle' || a.name === 'captionSlide')
          )
      )
      .map((e) => e.groupId)
  );
  const cosmosGroups = new Set(
    slideEls
      .filter((e) => e?.groupId && (e.anims || []).some((a) => a && a.name === 'cosmosTitle'))
      .map((e) => e.groupId)
  );
  const els = slideEls
    .map((el) =>
      decorateExportEl(el, elHtml(el, slideEls, theme, W, H, mediaMap), { cosmosGroups, entranceGroups })
    )
    .join('');
  return `${inkSvg(s, W, H)}${connectorsSvg(s, W, H)}${els}`;
}

export function slideBackgroundStyle(slide) {
  const bg = slideSolidBg(slide);
  // Image is a separate layer in export HTML; keep solid on the section.
  return {
    background: bg,
  };
}

export function buildStandaloneHtml(deck, fontCss = '', chrome = {}) {
  const title = esc(deck.title || 'Слайды');
  const W = deck.canvasW || DEFAULT_CANVAS_W;
  const H = deck.canvasH || DEFAULT_CANVAS_H;
  const showFooter = chrome.footer !== false;
  const showSidenav = chrome.sidenav !== false;
  const showEsc = chrome.esc !== false;
  const showBrush = chrome.brush === true;
  // Ensure current format is stored so phone rotation can adapt
  const curKey = arLayoutKey(W, H, deck.ar);
  const slides = saveSlidesArLayout(deck.slides || [], curKey, W, H);
  const mediaMap = deck.media && typeof deck.media === 'object' ? deck.media : {};
  const theme = getTheme(deck.appliedThemeIdx);
  const animData = deckPlaybackSteps(slides).map((s) => serializePlaybackSteps(s, theme));
  const transData = deckTransData(slides, deck.globalTrans, deck.globalTransDur);
  const rideData = slides.map((s) => collectSlideRideSpecs(s));
  const arLayouts = compactArLayoutsForExport(slides);
  const slidesHtml = slides
    .map((s, i) => {
      const bg = slideSolidBg(s);
      const bgLayer = slideBgImgExportHtml(s.bgImg, W, H);
      const slideTitle = esc((s.title || s.name || '').trim());
      return `<div class="slide-frame" data-i="${i}" data-title="${slideTitle}"><section class="slide" style="background:${esc(bg)};position:relative">${bgLayer}${renderSlideInnerHtml(s, W, H, theme, mediaMap)}</section></div>`;
    })
    .join('\n');

  const script = buildStandalonePlaybackScript({
    W,
    H,
    animData,
    transData,
    rideData,
    arLayouts,
    chrome: { footer: showFooter, sidenav: showSidenav, esc: showEsc, brush: showBrush },
  });

  const chromeCss = [
    showFooter || showEsc
      ? `#hud{position:fixed;right:12px;bottom:12px;background:rgba(0,0,0,.55);padding:8px 12px;border-radius:8px;font-size:13px;display:flex;gap:10px;align-items:center;z-index:5}
button{background:#1e293b;border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:4px 10px;cursor:pointer}`
      : 'button{background:#1e293b;border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:4px 10px;cursor:pointer}',
    showSidenav || showBrush
      ? `.ex-nav{position:fixed;top:50%;transform:translateY(-50%);z-index:6;width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(15,23,42,.55);color:rgba(255,255,255,.85);cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);padding:0}
.ex-nav:hover{background:rgba(15,23,42,.9);border-color:rgba(255,255,255,.4);color:#fff}
.ex-nav svg{width:20px;height:20px}`
      : '',
    showSidenav ? `.ex-nav-prev{left:16px}.ex-nav-next{right:16px}` : '',
    showBrush
      ? `.ex-draw-tools{position:fixed;left:16px;bottom:16px;z-index:7;display:flex;flex-direction:row;gap:10px;align-items:center}
.ex-draw-tools .ex-nav{position:static;transform:none}
.ex-draw-tools .ex-nav.on{background:rgba(239,68,68,.88);border-color:rgba(255,255,255,.55);color:#fff}
.ex-draw-layer{position:fixed;z-index:5;pointer-events:none;touch-action:none}
.ex-draw-layer.is-active{pointer-events:auto;cursor:crosshair}
.ex-draw-opts{display:none;flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 8px;border-radius:999px;background:rgba(15,23,42,.62);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(8px)}
.ex-draw-widths,.ex-draw-colors{display:flex;align-items:center;gap:4px}
.ex-draw-w{width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(15,23,42,.35);padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer}
.ex-draw-w span{display:block;border-radius:50%;background:#e2e8f0}
.ex-draw-w.on{border-color:rgba(255,255,255,.7);background:rgba(255,255,255,.16)}
.ex-draw-c{width:20px;height:20px;border-radius:50%;border:1px solid rgba(255,255,255,.28);padding:0;cursor:pointer}
.ex-draw-c.on{box-shadow:0 0 0 2px #fff,0 0 0 3px rgba(15,23,42,.7)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const hudParts = [];
  if (showFooter) hudParts.push(`<span id="n">1 / ${slides.length}</span>`);
  if (showEsc) hudParts.push('<button type="button" id="esc-btn">Esc / F5</button>');
  const hudHtml =
    hudParts.length > 0 ? `<div id="hud">${hudParts.join('')}</div>` : '';

  const sidenavHtml = showSidenav
    ? `<button type="button" class="ex-nav ex-nav-prev" id="nav-prev" aria-label="Предыдущий слайд"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><button type="button" class="ex-nav ex-nav-next" id="nav-next" aria-label="Следующий слайд"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>`
    : '';

  const brushHtml = showBrush
    ? `<div class="ex-draw-tools" id="draw-tools">
<button type="button" class="ex-nav" id="draw-brush" aria-label="Кисть"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.2 3.8a2.4 2.4 0 010 3.4l-1.2 1.2-3.4-3.4 1.2-1.2a2.4 2.4 0 013.4 0z"/><path d="M14.8 5.8l3.4 3.4-1.5.7-2.6-2.6.7-1.5z"/><path d="M13.2 8.1L4.6 16.7c-1.1 1.1-1.8 3.3-2.3 4.8 1.7-.3 4-.9 5.2-2.1l8.6-8.6-2.9-2.7z"/><path d="M3.2 21.1c1.1-1.8 2.3-3.1 3.6-3.8-.5 1.3-1.4 2.7-2.6 4-.5.5-1.3.3-1-.2z"/></svg></button>
<button type="button" class="ex-nav" id="draw-erase" aria-label="Ластик" style="display:none"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.1 3.7l4.2 4.2a2 2 0 010 2.8l-8.5 8.5H7.4l-4.2-4.2a2 2 0 010-2.8l8.5-8.5a2 2 0 012.8 0z"/><path d="M7.5 20.5h12" stroke="currentColor" stroke-width="2" fill="none"/></svg></button>
<div class="ex-draw-opts" id="draw-opts" role="group" aria-label="Кисть">
<div class="ex-draw-widths">
<button type="button" class="ex-draw-w" id="draw-w-0" aria-label="Толщина 2"><span style="width:6px;height:6px"></span></button>
<button type="button" class="ex-draw-w on" id="draw-w-1" aria-label="Толщина 4"><span style="width:11px;height:11px"></span></button>
<button type="button" class="ex-draw-w" id="draw-w-2" aria-label="Толщина 8"><span style="width:16px;height:16px"></span></button>
<button type="button" class="ex-draw-w" id="draw-w-3" aria-label="Толщина 14"><span style="width:21px;height:21px"></span></button>
</div>
<div class="ex-draw-colors">
<button type="button" class="ex-draw-c on" id="draw-c-0" style="background:#ef4444" aria-label="#ef4444"></button>
<button type="button" class="ex-draw-c" id="draw-c-1" style="background:#eab308" aria-label="#eab308"></button>
<button type="button" class="ex-draw-c" id="draw-c-2" style="background:#22c55e" aria-label="#22c55e"></button>
<button type="button" class="ex-draw-c" id="draw-c-3" style="background:#3b82f6" aria-label="#3b82f6"></button>
<button type="button" class="ex-draw-c" id="draw-c-4" style="background:#a855f7" aria-label="#a855f7"></button>
<button type="button" class="ex-draw-c" id="draw-c-5" style="background:#f8fafc" aria-label="#f8fafc"></button>
<button type="button" class="ex-draw-c" id="draw-c-6" style="background:#111827" aria-label="#111827"></button>
</div>
</div>
</div>
<canvas id="draw-bake" class="ex-draw-layer" aria-hidden="true"></canvas>
<canvas id="draw-layer" class="ex-draw-layer" aria-hidden="true"></canvas>`
    : '';
  const model3dRuntime = model3dExportIife();
  const model3dBoot = model3dBootSnippet();

  const slimSlides = slides.map((s) => ({
    ...s,
    els: (s.els || []).map((el) => {
      if (!el || (el.type !== 'mediaaudio' && el.type !== 'mediavideo')) return el;
      if (el.mediaId && mediaMap[el.mediaId]) {
        return { ...el, mediaSrc: '', mediaSrcType: 'idb' };
      }
      return el;
    }),
  }));
  const deckPayload = {
    v: 1,
    title: deck.title || 'Слайды',
    canvasW: W,
    canvasH: H,
    ar: deck.ar,
    appliedThemeIdx: deck.appliedThemeIdx,
    layoutIdx: deck.layoutIdx,
    layoutAnimated: deck.layoutAnimated !== false,
    decorPausedAt: deck.layoutAnimated === false ? deck.decorPausedAt || {} : {},
    globalTrans: deck.globalTrans,
    globalTransDur: deck.globalTransDur,
    slides: slimSlides,
  };
  if (Object.keys(mediaMap).length) deckPayload.media = mediaMap;
  const deckJson = JSON.stringify(deckPayload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
  const la = deck.layoutAnimated !== false;
  const dp = JSON.stringify(deck.layoutAnimated === false ? deck.decorPausedAt || {} : {});
  const themeIdxLine =
    deck.appliedThemeIdx != null && deck.appliedThemeIdx >= 0
      ? `var THEME_IDX=${deck.appliedThemeIdx | 0};`
      : 'var THEME_IDX=-1;';
  const decorAnimBoot = `var _layoutAnimated=${la ? 'true' : 'false'};var _decorPausedAt=${dp};
function _freezeDecorIn(frame, si){
  if(_layoutAnimated) return;
  var t=_decorPausedAt[String(si)];
  if(t==null) t=_decorPausedAt[si];
  (frame||document).querySelectorAll('.decor-el svg').forEach(function(svg){
    try{
      if(t!=null && svg.setCurrentTime) svg.setCurrentTime(+t);
      if(svg.pauseAnimations) svg.pauseAnimations();
    }catch(e){}
  });
}
document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('.slide-frame').forEach(function(fr){
    _freezeDecorIn(fr, +(fr.getAttribute('data-i')||0));
  });
});`;

  return `<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>${fontsCssForDeck(fontCss, deck)}</style>
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#000;color:#fff;font-family:system-ui,sans-serif}
#stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}
.slide-frame{display:none;overflow:hidden;position:relative;flex-shrink:0}
.slide-frame.on{display:block}
.slide{position:relative;width:${W}px;height:${H}px;overflow:hidden;transform-origin:top left}
.slide svg,.slide .react-el-svg{shape-rendering:geometricPrecision;text-rendering:geometricPrecision}
.el{position:absolute;box-sizing:border-box}
.el svg{width:100%;height:100%;display:block}
.react-graph-stroke-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:react-graph-stroke-loop var(--graph-anim-total,3s) linear infinite}
@keyframes react-graph-stroke-loop{0%{stroke-dashoffset:1}55%{stroke-dashoffset:0}88%{stroke-dashoffset:0}100%{stroke-dashoffset:1}}
@media(prefers-reduced-motion:reduce){.react-graph-stroke-draw{animation:none;stroke-dashoffset:0}}
.el span[data-list-bullet],.el span[data-list-num]{display:inline-flex;align-items:center;justify-content:center;margin-right:var(--rt-bullet-gap,10px);color:currentColor;user-select:none;vertical-align:-0.2em;line-height:1;flex-shrink:0}
.el span[data-list-num]{display:inline-block;min-width:1.2em;width:auto;height:auto;vertical-align:0;font-variant-numeric:tabular-nums}
.el span[data-list-bullet]{width:1em;height:1em}
.el span[data-list-bullet] svg{width:1em;height:1em;display:block;flex-shrink:0;overflow:visible;pointer-events:none}
${chromeCss}
.md h1,.md h2,.md h3{margin:.4em 0}.md p,.md li{margin:.25em 0}.md a{color:#93c5fd}
.el.has-toc{-webkit-text-fill-color:initial;background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important}
.el.has-toc .toc-item{pointer-events:auto;cursor:pointer;opacity:.55;transition:opacity .15s;-webkit-text-fill-color:currentColor!important;background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important}
.el.has-toc .toc-item:hover{opacity:1}
.toc-item{-webkit-text-fill-color:currentColor!important}
.toc-empty{opacity:.65;font-style:italic}
.el.react-el-text span{color:inherit}
.el a[href],.el.react-el-text a[href],table a[href]{color:inherit!important;-webkit-text-fill-color:inherit;cursor:pointer;text-underline-offset:.12em;text-decoration-thickness:1.25px;text-decoration-skip-ink:none}
.el a[href]:visited,table a[href]:visited{color:inherit!important}
.el a[href]:hover,.el a[href]:hover *,table a[href]:hover,table a[href]:hover *{color:var(--sf-link-hover,#93c5fd)!important;-webkit-text-fill-color:var(--sf-link-hover,#93c5fd)!important}
.el a[href]:not([data-ul]),.el a[href][data-ul=dashed],table a[href]:not([data-ul]),table a[href][data-ul=dashed]{text-decoration:underline dashed}
.el a[href][data-ul=single],table a[href][data-ul=single]{text-decoration:underline}
.el a[href][data-ul=double],table a[href][data-ul=double]{text-decoration:underline double}
.el a[href][data-ul=none],table a[href][data-ul=none]{text-decoration:none!important}
.react-el-audio{background:transparent!important}
.react-audio-player{width:100%;height:100%;accent-color:var(--react-audio-accent,#6366f1);color:var(--react-audio-controls,#6366f1);color-scheme:inherit}
.react-audio-player::-webkit-media-controls-enclosure{background:transparent;border-radius:999px;overflow:hidden}
.react-audio-player::-webkit-media-controls-panel{background-color:var(--react-audio-panel,#f1f5f9);border-radius:999px;color:var(--react-audio-controls,#6366f1)}
.react-audio-player::-webkit-media-controls-current-time-display,.react-audio-player::-webkit-media-controls-time-remaining-display{color:var(--react-audio-time,#0f172a)!important}
.react-audio-player::-webkit-media-controls-timeline,.react-audio-player::-webkit-media-controls-volume-slider{accent-color:var(--react-audio-accent,#6366f1)}
${PLAYBACK_ANIM_CSS}
${PLAYBACK_HOVER_CSS}
${PLAYBACK_TRANS_CSS}
${TEXT_UL_DASH_DOT_CSS}
${TEXT_STRESS_CSS}
</style>
</head><body data-theme-idx="${deck.appliedThemeIdx != null ? deck.appliedThemeIdx : -1}">
<script type="application/json" id="_deck">${deckJson}</script>
<script>var W=${W},H=${H};${themeIdxLine}
${decorAnimBoot}
</script>
<div id="stage">${slidesHtml}</div>
${sidenavHtml}
${brushHtml}
${hudHtml}
<script>
${model3dRuntime.replace(/<\/script/gi, '<\\/script')}
${model3dBoot.replace(/<\/script/gi, '<\\/script')}
${script}
(function(){
  var MEDIA=(function(){try{var d=JSON.parse(document.getElementById('_deck').textContent);return d&&d.media||{};}catch(e){return {};}})();
  function mediaSrc(host, srcAttr, idAttr){
    var src=host.getAttribute(srcAttr)||'';
    if(src) return src;
    var id=host.getAttribute(idAttr)||'';
    return (id&&MEDIA&&MEDIA[id])||'';
  }
  document.querySelectorAll('video[data-mv-id]').forEach(function(v){
    if(v.getAttribute('src')) return;
    var s=mediaSrc(v,'','data-mv-id');
    if(s) v.src=s;
  });
  document.querySelectorAll('.mv-fs[data-mv-id]').forEach(function(host){
    if(host.getAttribute('data-mv-src')) return;
    var s=mediaSrc(host,'data-mv-src','data-mv-id');
    if(s) host.setAttribute('data-mv-src',s);
  });
  function fmt(sec){sec=Math.max(0,Math.floor(sec||0));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');}
  function stopSlide(e){if(e){e.stopPropagation();}}
  function layoutOf(w,h){
    h=Math.max(1,h||1);w=Math.max(0,w||0);
    var aspect=w/h, endPad=Math.max(14,Math.round(h/2));
    if(h>=52&&aspect<1.55) return 'icon';
    if(aspect<1.25&&h>=44) return 'icon';
    if(w<72) return 'icon';
    var btn=Math.max(18,Math.round(h*0.58));
    var timeW=Math.max(56,Math.round(h*0.34*5.6));
    var gap=Math.max(6,Math.round(h*0.14));
    var padL=Math.max(8,Math.round(h*0.2));
    if(w>=padL+btn+gap+timeW+gap+Math.max(48,h)+endPad) return 'full';
    if(w>=padL+btn+gap+36+endPad) return 'notime';
    return 'icon';
  }
  function glyph(playing, size){
    size=size||14;
    return playing
      ? '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>'
      : '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5L7 4.5z"/></svg>';
  }
  function bind(host){
    if(!host||host._taBound) return;
    host._taBound=1;
    var src=mediaSrc(host,'data-ma-src','data-ma-id');
    var a=new Audio(src||'');
    a.loop=host.getAttribute('data-ma-loop')==='1';
    a.volume=Math.max(0,Math.min(1,+(host.getAttribute('data-ma-vol')||1)));
    var ui=host.querySelector('.react-themed-audio');
    if(!ui) return;
    var playBtn=ui.querySelector('.ta-play');
    var timeEl=ui.querySelector('.ta-time');
    var track=ui.querySelector('.ta-track');
    var fill=ui.querySelector('.ta-fill');
    var endPadEl=ui.querySelector('.ta-endpad');
    var layout='full';
    var glyphSize=14;
    function applyLayout(){
      var w=ui.clientWidth||host.clientWidth||0;
      var h=ui.clientHeight||host.clientHeight||48;
      layout=layoutOf(w,h);
      ui.setAttribute('data-audio-layout',layout);
      var pad=Math.max(14,Math.round(h/2));
      var iconOnly=layout==='icon';
      var iconSize=iconOnly?Math.max(22,Math.round(Math.min(w,h)*0.5)):Math.max(18,Math.round(h*0.58));
      glyphSize=Math.max(12,Math.round(iconSize*(iconOnly?0.72:0.66)));
      var timeFont=Math.max(11,Math.round(h*0.34));
      var trackHit=Math.max(14,Math.round(h*0.5));
      var trackBar=Math.max(3,Math.round(h*0.11));
      ui.style.justifyContent=iconOnly?'center':'flex-start';
      ui.style.gap=iconOnly?'0':Math.max(6,Math.round(h*0.14))+'px';
      ui.style.paddingLeft=iconOnly?'0':Math.max(8,Math.round(h*0.2))+'px';
      ui.style.cursor=iconOnly?'pointer':'';
      if(playBtn){playBtn.style.width=iconSize+'px';playBtn.style.height=iconSize+'px';}
      if(timeEl){
        timeEl.style.display=layout==='full'?'':'none';
        timeEl.style.font='600 '+timeFont+'px/1 system-ui,sans-serif';
        timeEl.style.minWidth=Math.max(56,Math.round(timeFont*5.6))+'px';
      }
      if(track){
        track.style.display=(layout==='full'||layout==='notime')?'flex':'none';
        track.style.height=trackHit+'px';
        var bar=track.firstElementChild;
        if(bar){bar.style.height=trackBar+'px';bar.style.borderRadius=Math.max(2,Math.round(trackBar/2))+'px';}
      }
      if(endPadEl){
        endPadEl.style.display=(layout==='full'||layout==='notime')?'':'none';
        endPadEl.style.width=pad+'px';
      }
      sync();
    }
    applyLayout();
    if(typeof ResizeObserver!=='undefined'){
      try{new ResizeObserver(applyLayout).observe(ui);}catch(e){}
    }
    var raf=0;
    function sync(){
      var d=a.duration||0,c=a.currentTime||0;
      if(timeEl) timeEl.textContent=fmt(c)+' / '+fmt(d);
      if(fill) fill.style.width=(d?Math.max(0,Math.min(1,c/d))*100:0)+'%';
      if(playBtn) playBtn.innerHTML=glyph(!a.paused, glyphSize);
    }
    function tick(){sync();if(!a.paused&&!a.ended)raf=requestAnimationFrame(tick);}
    function toggle(e){
      stopSlide(e);
      if(!src&&!a.src)return;
      if(a.paused)a.play().catch(function(){});else a.pause();
    }
    function seekTo(clientX){
      var d=a.duration||0;
      if(!d||!track) return;
      var r=track.getBoundingClientRect();
      a.currentTime=Math.max(0,Math.min(1,(clientX-r.left)/Math.max(1,r.width)))*d;
      sync();
    }
    function onTrackDown(e){
      if(layout==='icon') return;
      if(e.pointerType==='mouse'&&e.button!=null&&e.button!==0) return;
      stopSlide(e);
      var pid=e.pointerId;
      seekTo(e.clientX);
      try{track.setPointerCapture&&track.setPointerCapture(pid);}catch(err){}
      function onMove(ev){if(ev.pointerId!==pid)return;stopSlide(ev);seekTo(ev.clientX);}
      function onUp(ev){
        if(ev.pointerId!==pid)return;
        stopSlide(ev);
        window.removeEventListener('pointermove',onMove,true);
        window.removeEventListener('pointerup',onUp,true);
        window.removeEventListener('pointercancel',onUp,true);
        try{track.releasePointerCapture&&track.releasePointerCapture(pid);}catch(err){}
      }
      window.addEventListener('pointermove',onMove,true);
      window.addEventListener('pointerup',onUp,true);
      window.addEventListener('pointercancel',onUp,true);
    }
    a.addEventListener('timeupdate',sync);
    a.addEventListener('loadedmetadata',sync);
    a.addEventListener('play',function(){cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);sync();});
    a.addEventListener('pause',function(){cancelAnimationFrame(raf);sync();});
    a.addEventListener('ended',function(){cancelAnimationFrame(raf);sync();});
    host.addEventListener('click',stopSlide);
    ui.addEventListener('click',stopSlide);
    ui.addEventListener('pointerdown',function(e){
      if(playBtn&&(e.target===playBtn||playBtn.contains(e.target))) return;
      stopSlide(e);
    });
    if(playBtn) playBtn.addEventListener('pointerdown',toggle);
    if(track) track.addEventListener('pointerdown',onTrackDown);
    if(src&&host.getAttribute('data-ma-auto')==='1') a.play().catch(function(){});
    sync();
  }
  document.querySelectorAll('.react-el-audio').forEach(bind);
})();
</script>
</body></html>`;
}

export async function downloadHtml(deck, chrome) {
  const fontsLink = [...document.querySelectorAll('link[rel="stylesheet"]')].find((link) => {
    try {
      return new URL(link.href).pathname.endsWith('/fonts/fonts.css');
    } catch {
      return false;
    }
  });
  const fontsUrl = fontsLink?.href || new URL('/fonts/fonts.css', location.href).href;
  const response = await fetch(fontsUrl);
  if (!response.ok) {
    throw new Error(`Could not load local fonts (${response.status})`);
  }
  const fontCss = await response.text();
  const html = buildStandaloneHtml(deck, fontCss, chrome);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (deck.title || 'slides') + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
}

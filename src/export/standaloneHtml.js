/**
 * Self-contained HTML slideshow export for React deck.
 */

import { buildBasicShapeSVG, shapeOptsFromEl } from '../shared/shapes.js';
import { shapeBlurOverlayStyle, shapeBlurPx } from '../editor/shapeBlur.js';
import { shapeTextExportHtml } from '../editor/shapeText.js';
import { buildIconSVG } from '../editor/iconSvg.js';
import { iconPathForRender } from '../editor/iconAnim.js';
import { getIconById } from '../editor/iconsLazy.js';
import { imageRenderStyles, normImgFrame, imgBorderSvgMarkup } from '../editor/imgStyles.js';
import { elBoxTransform } from '../editor/elTransform.js';
import { getTableCell, tableCellBg, tableCellRadiusCss, tableColWidthsPx, tableRowHeightsPx } from '../editor/tableCells.js';
import { getTheme, resolveSchemeColor, resolveElTextColor } from '../editor/themes.js';
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
import {
  CODE_THEMES,
  syntaxHighlight,
  codeBlockSurfaceStyle,
} from '../editor/codeHighlight.js';
import { elFilterCss } from '../editor/elShadow.js';
import { buildLineAngleContent } from '../editor/lineAngle.js';
import { appletSandbox } from '../editor/appletSandbox.js';
import { counterMountHtml } from '../editor/applets.js';
import { buildLegoSvg } from '../editor/lego.js';
import { textBgExportCss, textColorGradStyle } from '../editor/textBg.js';
import { textBorderBoxStyle, textBorderSvgMarkup, needsTextBorderOverflow } from '../editor/textBorder.js';
import { textGlyphShadowStyle, textBlockShadowStyle } from '../editor/textShadow.js';
import { textPadCss } from '../editor/textPad.js';
import { textBorderRadiusCss } from '../editor/textRadius.js';
import { parseCsNumber, parseFontFamily } from '../editor/fonts.js';
import { underlineBoxProps, TEXT_UL_DASH_DOT_CSS } from '../editor/textUnderline.js';
import { TEXT_STRESS_CSS } from '../editor/textStress.js';
import {
  PLAYBACK_ANIM_CSS,
  PLAYBACK_HOVER_CSS,
  decorateExportEl,
  serializePlaybackSteps,
  deckPlaybackSteps,
  buildStandalonePlaybackScript,
} from './playbackAnim.js';
import { slideBgImgExportHtml, slideSolidBg } from '../editor/slideBgImg.js';
import { deckTransData, PLAYBACK_TRANS_CSS } from '../editor/transitions.js';

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
      return `${prop}:${v}`;
    })
    .join(';');
}

function baseStyle(el) {
  const op = el.elOpacity != null ? el.elOpacity : 1;
  return {
    position: 'absolute',
    left: `${el.x || 0}px`,
    top: `${el.y || 0}px`,
    width: `${el.w || 100}px`,
    height: `${el.h || 60}px`,
    opacity: op,
    transform: elBoxTransform(el),
    filter: elFilterCss(el),
    boxSizing: 'border-box',
    overflow: 'hidden',
  };
}

function elHtml(el, slideEls, theme) {
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
    return `<div class="el" data-applet-id="${esc(el.appletId || '')}"${
      cntGid ? ` data-cnt-group-id="${esc(cntGid)}"` : ''
    } style="${css({
      ...style,
      padding: 0,
      overflow: 'hidden',
      background: 'transparent',
      borderRadius: rx > 0 ? `${rx}px` : undefined,
      position: 'absolute',
      boxSizing: 'border-box',
    })}"><iframe title="${esc(el.appletId || 'applet')}" data-applet-id="${esc(el.appletId || '')}" sandbox="${appletSandbox(el)}" srcdoc="${esc(html)}" style="width:100%;height:100%;border:0;display:block;background:transparent;pointer-events:${el.appletId === 'calculator' || el.appletId === 'generator' || el.appletId === 'counter' || el.appletId === 'flip' || el.appletId === 'notes' ? 'auto' : 'none'}"></iframe>${bord}</div>`;
  }

  if (el.type === 'model3d') {
    const bg = el.objBgCleared ? 'transparent' : el.objBg || '#0f172a';
    const label = esc(el.objName || 'OBJ');
    return `<div class="el" style="${css({
      ...style,
      padding: 0,
      overflow: 'hidden',
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(255,255,255,.55)',
      font: '13px system-ui,sans-serif',
    })}"><div style="text-align:center"><div style="font-weight:600;margin-bottom:4px;color:${esc(el.objColor || '#6366f1')}">3D</div><div>${label}</div></div></div>`;
  }

  if (el.type === 'lego') {
    return `<div class="el" style="${css({
      ...style,
      padding: 0,
      overflow: 'visible',
      background: 'transparent',
    })}">${buildLegoSvg(el)}</div>`;
  }

  if (el.type === 'graph') {
    if (el.graphImg) {
      return `<div class="el" style="${css({
        ...style,
        padding: 0,
        overflow: 'hidden',
        background: el.graphBg || (el.graphKind === 'chem' ? 'transparent' : '#16161e'),
      })}"><img src="${esc(el.graphImg)}" alt="" style="width:100%;height:100%;object-fit:contain;display:block"/></div>`;
    }
    return `<div class="el" style="${css({ ...style, padding: '8px', color: '#94a3b8', fontSize: '12px' })}">${esc(el.graphLatex || 'graph')}</div>`;
  }

  if (el.type === 'formula' && el.formulaSvg) {
    return `<div class="el" style="${css({
      ...style,
      color: el.formulaColor || el.textColor || '#fff',
      padding: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
    })}">${el.formulaSvg}</div>`;
  }

  if (el.type === 'text' || el.type === 'formula') {
    const color = el.textColor || '#fff';
    const body = el.html || el.text || '';
    const cs = el.cs || '';
    const family = parseFontFamily(cs) || 'Georgia, serif';
    const fs = (cs.match(/font-size\s*:\s*([\d.]+)px/i) || [])[1] || (el.type === 'formula' ? 40 : 36);
    const align =
      (cs.match(/text-align\s*:\s*([^;]+)/i) || [])[1] ||
      (el.type === 'formula' ? 'center' : 'left');
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
    const gradCss = grad
      ? {
          background: grad.background,
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
    const hasList =
      el.type === 'text' &&
      (/(data-list-bullet|data-list-num)/i.test(body) || el.bulletIconId);
    const ulBox = el.type === 'text' ? underlineBoxProps(cs) : { style: {}, className: '' };
    const boxCss = {
      ...style,
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
      overflow: needsTextBorderOverflow(el) ? 'visible' : undefined,
      ...(hasList ? { '--rt-bullet-gap': `${el.bulletGap != null ? el.bulletGap : 10}px` } : {}),
      ...bgCss,
      ...(blockSh || {}),
      ...(ulBox.style || {}),
    };
    const ulCls = `el react-el-text${isToc ? ' has-toc' : ''}${ulBox.className ? ` ${ulBox.className}` : ''}`;
    if (bgCss.background && grad) {
      return `<div class="${ulCls}" style="${css(boxCss)}">${borderSvg}<div style="${css({ ...gradCss, ...(glyphSh || {}) })}">${body}</div></div>`;
    }
    return `<div class="${ulCls}" style="${css({ ...boxCss, ...gradCss, ...(glyphSh || {}) })}">${borderSvg}${body}</div>`;
  }

  if (el.type === 'image' && el.src) {
    const rs = imageRenderStyles(el);
    const frame = normImgFrame(el.imgFrame);
    const borderSvg = frame === 'none' ? imgBorderSvgMarkup(el) : '';
    const ribbon =
      frame === 'ribbon' ? '<div style="position:absolute;left:0;right:0;bottom:0;height:14px;background:linear-gradient(90deg,#ef4444,#f97316,#eab308)"></div>' : '';
    const cap =
      frame === 'polaroid' && el.imgCaption
        ? `<div style="position:absolute;left:8px;right:8px;bottom:6px;text-align:center;font-size:11px;color:#334155">${esc(el.imgCaption)}</div>`
        : '';
    const borderLayer = borderSvg
      ? `<div style="position:absolute;inset:0;pointer-events:none;z-index:3;overflow:visible">${borderSvg}</div>`
      : '';
    return `<div class="el" style="${css({ ...style, ...rs.box, opacity: 1, overflow: borderSvg || frame !== 'none' ? 'visible' : 'hidden' })}"><div style="${css({ ...rs.inner, position: 'relative', width: '100%', height: '100%' })}"><img alt="" src="${esc(el.src)}" style="${css(rs.img)}"/></div>${borderLayer}${ribbon}${cap}</div>`;
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
    const theme = el.codeTheme || 'dark';
    const T = CODE_THEMES[theme] || CODE_THEMES.dark;
    const surface = codeBlockSurfaceStyle(el);
    const html =
      el.codeHtml || syntaxHighlight(el.codeRaw || '', el.codeLang || 'js', theme);
    return `<div class="el" style="${css({ ...style, padding: 0, overflow: 'hidden', background: 'transparent' })}"><div style="${css(surface)}"><div style="font-size:9px;color:${esc(T.cmt)};margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px">${esc(el.codeLang || 'code')}</div><pre style="margin:0;white-space:pre-wrap">${html}</pre></div></div>`;
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

  if (el.type === 'mediavideo' && el.mediaSrc) {
    const playSrc = el.mediaSrc;
    const full = el.mvDisplay === 'fullscreen';
    const ctrl = el.mvControls !== 'none';
    const auto = el.mvStart === 'auto';
    if (full) {
      return `<div class="el mv-fs" data-mv-src="${esc(playSrc)}" data-mv-ctrl="${ctrl ? '1' : '0'}" data-mv-auto="${auto ? '1' : '0'}" style="${css({
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
    return `<video class="el" ${ctrl ? 'controls' : ''} ${auto ? 'autoplay muted' : ''} playsinline src="${esc(playSrc)}" style="${css({ ...style, background: '#000', objectFit: 'contain' })}"></video>`;
  }

  if (el.type === 'mediaaudio' && el.mediaSrc) {
    return `<div class="el" style="${css({
      ...style,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1e293b',
    })}"><audio controls src="${esc(el.mediaSrc)}" style="width:90%"></audio></div>`;
  }

  if (el.type === 'icon') {
    const ic = el.iconId ? getIconById(el.iconId) : null;
    const color = el.iconColor || el.textColor || '#6366f1';
    if (ic) {
      return `<div class="el" style="${css({ ...style, padding: '0', overflow: 'visible' })}">${buildIconSVG(ic, color, el.iconSw != null ? el.iconSw : 1.8, el.iconFillOp != null ? el.iconFillOp : 1, iconPathForRender(ic, el))}</div>`;
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
    if (sb > 0) {
      const blur = shapeBlurOverlayStyle(el) || {};
      return `<div class="el" style="${css({ ...style, overflow: 'visible', position: 'absolute' })}"><div style="${css(blur)}"></div><div style="position:relative;z-index:1;width:100%;height:100%">${svg}</div>${txt}</div>`;
    }
    return `<div class="el" style="${css({ ...style, position: 'absolute' })}">${svg}${txt}</div>`;
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
    const bw = el.borderW != null ? +el.borderW : 1;
    // v7.1: borderless only when explicitly transparent and no scheme ref
    const bc =
      (!el.borderColor || el.borderColor === 'transparent') && !el.borderColorScheme
        ? 'transparent'
        : resolveSchemeColor(el.borderColorScheme, theme) || el.borderColor || el.stroke || '#3b82f680';
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
        const isLastC = c + cs - 1 >= cols - 1;
        const isLastR = r + rs - 1 >= rows - 1;
        const isH = r === 0 && el.headerRow !== false;
        const bg = tableCellBg(el, r, c, cell, theme) || '';
        const rad = tableCellRadiusCss(el, r, c, cs, rs) || '';
        const span = (cs > 1 ? ` colspan="${cs}"` : '') + (rs > 1 ? ` rowspan="${rs}"` : '');
        const brd =
          `border-top:${bw}px solid ${esc(bc)};border-left:${bw}px solid ${esc(bc)};` +
          (isLastC ? `border-right:${bw}px solid ${esc(bc)};` : '') +
          (isLastR ? `border-bottom:${bw}px solid ${esc(bc)};` : '');
        const fs = cell.fs != null ? `font-size:${+cell.fs}px;` : '';
        const tc =
          cell.textColor || cell.textColorScheme != null
            ? `color:${esc(resolveSchemeColor(cell.textColorScheme, theme) || cell.textColor || textColor)};`
            : '';
        const ff = cell.ff ? `font-family:${esc(cell.ff)};` : '';
        const tag = isH ? 'th' : 'td';
        body += `<${tag}${span} style="background:${esc(bg)};${brd}text-align:${esc(cell.align || 'left')};vertical-align:${esc(cell.valign || 'middle')};padding:5px 9px;overflow:hidden;word-break:normal;overflow-wrap:break-word;font-weight:${isH ? 700 : 400};box-sizing:border-box;${fs}${tc}${ff}${rad}">${cell.html || ''}</${tag}>`;
      }
      body += '</tr>';
    }
    body += '</tbody>';
    const blurLayer =
      blur > 0
        ? `<div style="position:absolute;inset:0;border-radius:${rx}px;backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);z-index:0;pointer-events:none"></div>`
        : '';
    const table = `<table style="width:100%;height:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:${el.fs || 15}px;color:${esc(textColor)};${el.ff ? `font-family:${esc(el.ff)};` : ''}">${body}</table>`;
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
export function renderSlideInnerHtml(slide, W, H, theme) {
  const s = slide || { els: [] };
  const slideEls = s.els || [];
  const els = slideEls.map((el) => decorateExportEl(el, elHtml(el, slideEls, theme))).join('');
  return `${inkSvg(s, W, H)}${connectorsSvg(s, W, H)}${els}`;
}

export function slideBackgroundStyle(slide) {
  const bg = slideSolidBg(slide);
  // Image is a separate layer in export HTML; keep solid on the section.
  return {
    background: bg,
  };
}

export function buildStandaloneHtml(deck) {
  const title = esc(deck.title || 'Слайды');
  const W = deck.canvasW || DEFAULT_CANVAS_W;
  const H = deck.canvasH || DEFAULT_CANVAS_H;
  const slides = deck.slides || [];
  const theme = getTheme(deck.appliedThemeIdx);
  const animData = deckPlaybackSteps(slides).map(serializePlaybackSteps);
  const transData = deckTransData(slides, deck.globalTrans, deck.globalTransDur);
  const rideData = slides.map((s) => collectSlideRideSpecs(s));
  const slidesHtml = slides
    .map((s, i) => {
      const bg = slideSolidBg(s);
      const bgLayer = slideBgImgExportHtml(s.bgImg, W, H);
      const slideTitle = esc((s.title || s.name || '').trim());
      return `<div class="slide-frame" data-i="${i}" data-title="${slideTitle}"><section class="slide" style="background:${esc(bg)};position:relative">${bgLayer}${renderSlideInnerHtml(s, W, H, theme)}</section></div>`;
    })
    .join('\n');

  const script = buildStandalonePlaybackScript({ W, H, animData, transData, rideData });

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
    slides,
  };
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
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#000;color:#fff;font-family:system-ui,sans-serif}
#stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}
.slide-frame{display:none;overflow:hidden;position:relative;flex-shrink:0}
.slide-frame.on{display:block}
.slide{position:relative;width:${W}px;height:${H}px;overflow:hidden;transform-origin:top left}
.el{position:absolute;box-sizing:border-box}
.el svg{width:100%;height:100%;display:block}
.el span[data-list-bullet],.el span[data-list-num]{display:inline-flex;align-items:center;justify-content:center;margin-right:var(--rt-bullet-gap,10px);color:currentColor;user-select:none;vertical-align:-0.2em;line-height:1;flex-shrink:0}
.el span[data-list-num]{display:inline-block;min-width:1.2em;width:auto;height:auto;vertical-align:0;font-variant-numeric:tabular-nums}
.el span[data-list-bullet]{width:1em;height:1em}
.el span[data-list-bullet] svg{width:1em;height:1em;display:block;flex-shrink:0;overflow:visible;pointer-events:none}
#hud{position:fixed;right:12px;bottom:12px;background:rgba(0,0,0,.55);padding:8px 12px;border-radius:8px;font-size:13px;display:flex;gap:10px;align-items:center;z-index:5}
button{background:#1e293b;border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:4px 10px;cursor:pointer}
.md h1,.md h2,.md h3{margin:.4em 0}.md p,.md li{margin:.25em 0}.md a{color:#93c5fd}
.el.has-toc{-webkit-text-fill-color:initial;background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important}
.el.has-toc .toc-item{pointer-events:auto;cursor:pointer;opacity:.55;transition:opacity .15s;-webkit-text-fill-color:currentColor!important;background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important}
.el.has-toc .toc-item:hover{opacity:1}
.toc-item{-webkit-text-fill-color:currentColor!important}
.toc-empty{opacity:.65;font-style:italic}
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
<div id="hud"><span id="n">1 / ${slides.length}</span><button type="button" id="prev">←</button><button type="button" id="next">→</button></div>
<script>
${script}
</script>
</body></html>`;
}

export function downloadHtml(deck) {
  const html = buildStandaloneHtml(deck);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (deck.title || 'slides') + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
}

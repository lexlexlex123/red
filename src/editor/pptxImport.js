/**
 * PPTX → React slides (text, pictures, audio/video, tables, shapes, formulas, connectors, ink).
 * Theme / schemeClr / slide bg / OMML via pptxTheme.js
 */

import {
  NS_A,
  NS_P,
  NS_R,
  NS_M,
  ommlToLatex,
  pptxLoadTheme,
  pptxColorFromSolidFill,
  pptxDefaultTextColor,
  pptxSpStyle,
  pptxSlideBgChain,
  pptxDirectChild,
  pptxAlphaFromClr,
} from './pptxTheme.js';
import { applyPptxTiming } from './pptxTimingImport.js';
import { renderFormulaSvg } from './mathjax.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';
import { ensureJSZip } from '../shared/jszip.js';
import { makeBgImgFromSrc } from './slideBgImg.js';
import { enrichImportedTextEl, isMonoFace } from './importEnrich.js';
import { bulletMarker, numMarker, DEFAULT_BULLET_ICON_ID } from './textLists.js';
import { fitImportedImageAspect } from './imgAspect.js';
import { fontCssFamily } from './fonts.js';

/**
 * Extract background image from slide XML.
 * Returns data URL if found, null otherwise.
 */
function pptxExtractBgImage(doc, mediaMap, nsP, nsA, nsR) {
  try {
    const cSld = doc.getElementsByTagNameNS(nsP, 'cSld')[0];
    if (!cSld) return null;
    const bg = cSld.getElementsByTagNameNS(nsP, 'bg')[0];
    if (!bg) return null;
    const bgPr = bg.getElementsByTagNameNS(nsP, 'bgPr')[0] || bg.getElementsByTagNameNS(nsA, 'bgPr')[0];
    if (!bgPr) return null;
    const blipFill = bgPr.getElementsByTagNameNS(nsA, 'blipFill')[0];
    if (!blipFill) return null;
    const blip = blipFill.getElementsByTagNameNS(nsA, 'blip')[0];
    if (!blip) return null;
    const embedId = blip.getAttributeNS(nsR, 'embed') || blip.getAttribute('r:embed');
    if (!embedId) return null;
    return mediaMap[embedId] || null;
  } catch (e) {
    return null;
  }
}

const PRST_MAP = {
  rect: 'rect',
  roundRect: 'rect',
  ellipse: 'ellipse',
  triangle: 'triangle',
  rtTriangle: 'triangle',
  star4: 'star',
  star5: 'star',
  star6: 'star',
  star8: 'star',
  leftArrow: 'arrow',
  rightArrow: 'arrow',
  upArrow: 'arrow',
  downArrow: 'arrow',
  leftRightArrow: 'arrow',
  chevron: 'arrow',
  diamond: 'rect',
  parallelogram: 'rect',
  trapezoid: 'rect',
  line: 'line',
  flowChartTerminator: 'rect',
  flowChartProcess: 'rect',
  flowChartDecision: 'rect',
  snip1Rect: 'rect',
  snip2SameRect: 'rect',
  snipRoundRect: 'rect',
  round1Rect: 'rect',
  round2SameRect: 'rect',
  homePlate: 'arrow',
  wedge: 'triangle',
  pie: 'ellipse',
  donut: 'noSymbol',
  noSmoking: 'noSymbol',
};

function colorFromSolidFill(sf, theme) {
  return pptxColorFromSolidFill(sf, theme) || null;
}

function faceFromRPr(rPr) {
  if (!rPr) return '';
  const latin = rPr.getElementsByTagNameNS(NS_A, 'latin')[0];
  const ea = rPr.getElementsByTagNameNS(NS_A, 'ea')[0];
  const cs = rPr.getElementsByTagNameNS(NS_A, 'cs')[0];
  return (
    latin?.getAttribute('typeface') ||
    ea?.getAttribute('typeface') ||
    cs?.getAttribute('typeface') ||
    ''
  );
}

function listInfoFromPPr(pPr, lstStyle) {
  if (!pPr && !lstStyle) return null;
  const lvl = Math.max(0, Math.min(8, +(pPr?.getAttribute('lvl') || 0)));
  const check = (node) => {
    if (!node) return null;
    if (node.getElementsByTagNameNS(NS_A, 'buNone')[0]) return { type: null, lvl };
    if (node.getElementsByTagNameNS(NS_A, 'buAutoNum')[0]) return { type: 'num', lvl };
    if (
      node.getElementsByTagNameNS(NS_A, 'buChar')[0] ||
      node.getElementsByTagNameNS(NS_A, 'buFont')[0] ||
      node.getElementsByTagNameNS(NS_A, 'buBlip')[0]
    ) {
      return { type: 'bullet', lvl };
    }
    return undefined;
  };
  const direct = check(pPr);
  if (direct !== undefined) return direct;
  if (!lstStyle) return null;
  const key = `lvl${lvl + 1}pPr`;
  const stylePr =
    lstStyle.getElementsByTagNameNS(NS_A, key)[0] ||
    lstStyle.getElementsByTagNameNS(NS_A, 'defPPr')[0];
  const inherited = check(stylePr);
  return inherited === undefined ? null : inherited;
}

function runHlinkInfo(rNode) {
  if (!rNode) return null;
  const rPr = rNode.getElementsByTagNameNS(NS_A, 'rPr')[0];
  if (!rPr) return null;
  const h =
    rPr.getElementsByTagNameNS(NS_A, 'hlinkClick')[0] ||
    rPr.getElementsByTagNameNS(NS_P, 'hlinkClick')[0];
  return pptxHlinkInfoFromNode(h);
}

function escHrefAttr(href) {
  return String(href || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function wrapRunHtmlWithLink(inner, href) {
  if (!href || !inner) return inner;
  const safe = escHrefAttr(href);
  const ul =
    'data-sf-link="1" data-ul="dashed" data-hover="#93c5fd" style="color:inherit;text-decoration:underline dashed;text-decoration-thickness:1.25px;text-underline-offset:0.12em;text-decoration-skip-ink:none;--sf-link-hover:#93c5fd"';
  if (String(href).startsWith('#')) return `<a href="${safe}" ${ul}>${inner}</a>`;
  return `<a href="${safe}" target="_blank" rel="noopener noreferrer" ${ul}>${inner}</a>`;
}

function textFromTxBody(txBody, theme, defaultColor, rels) {
  if (!txBody) {
    return {
      html: '',
      fs: 24,
      color: defaultColor || '#ffffff',
      align: 'left',
      mono: false,
      listKind: null,
    };
  }
  let html = '';
  let fs = 24;
  let color = defaultColor || '#ffffff';
  let align = 'left';
  let mono = false;
  let listKind = null;
  let bulletCount = 0;
  let numCount = 0;
  let paraCount = 0;
  let numSeq = 0;
  const lstStyle = txBody.getElementsByTagNameNS(NS_A, 'lstStyle')[0];
  if (lstStyle) {
    const defRPr = lstStyle.getElementsByTagNameNS(NS_A, 'defRPr')[0];
    if (defRPr) {
      const defSf = defRPr.getElementsByTagNameNS(NS_A, 'solidFill')[0];
      const dc = colorFromSolidFill(defSf, theme);
      if (dc) color = dc;
      if (isMonoFace(faceFromRPr(defRPr))) mono = true;
    }
  }
  const paras = txBody.getElementsByTagNameNS(NS_A, 'p');
  for (const para of paras) {
    const pPr = para.getElementsByTagNameNS(NS_A, 'pPr')[0];
    if (pPr) {
      const a = pPr.getAttribute('algn');
      if (a === 'ctr') align = 'center';
      else if (a === 'r') align = 'right';
      else if (a === 'l' || a === 'just') align = 'left';
    }
    const li = listInfoFromPPr(pPr, lstStyle);
    const lines = [''];
    // Soft breaks (a:br) → separate <div> lines (never raw <br> inside a div)
    for (const child of Array.from(para.childNodes)) {
      if (!child.localName) continue;
      if (child.localName === 'br') {
        lines.push('');
        continue;
      }
      if (child.localName !== 'r' && child.localName !== 'fld') continue;
      const t = child.getElementsByTagNameNS(NS_A, 't')[0];
      if (!t) continue;
      const txt = t.textContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      if (!txt && txt !== '0') continue;
      const rPr = child.getElementsByTagNameNS(NS_A, 'rPr')[0];
      let st = '';
      if (rPr) {
        const sz = +rPr.getAttribute('sz');
        if (sz) fs = Math.round((sz / 100) * (96 / 72));
        if (rPr.getAttribute('b') === '1') st += 'font-weight:700;';
        if (rPr.getAttribute('i') === '1') st += 'font-style:italic;';
        if (rPr.getAttribute('u') && rPr.getAttribute('u') !== 'none') st += 'text-decoration:underline;';
        const face = faceFromRPr(rPr);
        if (face && !String(face).startsWith('+')) {
          if (isMonoFace(face)) {
            mono = true;
            st += "font-family:ui-monospace, Consolas, 'Courier New', monospace;";
          } else {
            st += `font-family:${fontCssFamily(face)};`;
          }
        }
        const sf = rPr.getElementsByTagNameNS(NS_A, 'solidFill')[0];
        const c = colorFromSolidFill(sf, theme);
        if (c) {
          color = c;
          st += `color:${c};`;
        }
      }
      let chunk = st ? `<span style="${st}">${txt}</span>` : txt;
      const linkHref = hrefFromPptxHlink(runHlinkInfo(child), rels || {});
      if (linkHref) chunk = wrapRunHtmlWithLink(chunk, linkHref);
      lines[lines.length - 1] += chunk;
    }
    const nonEmpty = lines.filter((ln) => ln.replace(/<[^>]+>/g, '').trim());
    const hasText = nonEmpty.length > 0;
    if (hasText) paraCount += 1;
    const pad = li?.lvl > 0 ? `padding-left:${li.lvl * 1.2}em;` : '';
    const open = pad ? `<div style="${pad}">` : '<div>';
    if (hasText && li?.type === 'bullet') {
      bulletCount += 1;
      const marker = bulletMarker({ iconId: DEFAULT_BULLET_ICON_ID });
      lines.forEach((ph, idx) => {
        const body = ph || '<br>';
        html += `${open}${idx === 0 ? marker : ''}${body}</div>`;
      });
      continue;
    }
    if (hasText && li?.type === 'num') {
      numCount += 1;
      numSeq += 1;
      const marker = numMarker(numSeq, 'decimal');
      lines.forEach((ph, idx) => {
        const body = ph || '<br>';
        html += `${open}${idx === 0 ? marker : ''}${body}</div>`;
      });
      continue;
    }
    if (!li?.type) numSeq = 0;
    if (!hasText) {
      html += '<div><br></div>';
    } else {
      lines.forEach((ph) => {
        html += `${open}${ph || '<br>'}</div>`;
      });
    }
  }
  if (paraCount > 0) {
    if (bulletCount >= Math.max(1, Math.ceil(paraCount * 0.5))) listKind = 'bullet';
    else if (numCount >= Math.max(1, Math.ceil(paraCount * 0.5))) listKind = 'num';
  }
  return { html, fs, color, align, mono, listKind };
}

function nvId(node) {
  if (!node) return null;
  const pr = node.getElementsByTagNameNS(NS_P, 'cNvPr')[0];
  const id = pr?.getAttribute('id');
  return id != null && id !== '' ? String(id) : null;
}

function pptxHlinkInfoFromNode(h) {
  if (!h) return null;
  const rid = h.getAttributeNS(NS_R, 'id') || h.getAttribute('r:id') || '';
  const action = h.getAttribute('action') || '';
  if (!rid && !action) return null;
  return { rid: rid || null, action };
}

function pptxHlinkIsOnShape(h, sp) {
  let p = h.parentNode;
  while (p && p !== sp) {
    const ln = p.localName;
    if (ln === 'cNvPr' || ln === 'nvSpPr' || ln === 'nvPicPr' || ln === 'nvCxnSpPr') return true;
    p = p.parentNode;
  }
  return false;
}

/** Shape-level action only — text-run hyperlinks become inline <a> in html. */
function pptxHlinkClick(sp) {
  const clicks = [
    ...sp.getElementsByTagNameNS(NS_A, 'hlinkClick'),
    ...sp.getElementsByTagNameNS(NS_P, 'hlinkClick'),
  ];
  for (const h of clicks) {
    const info = pptxHlinkInfoFromNode(h);
    if (!info) continue;
    if (pptxHlinkIsOnShape(h, sp)) return info;
  }
  return null;
}

function hrefFromPptxHlink(info, rels = {}) {
  if (!info) return '';
  const action = String(info.action || '');
  const jump = (action.match(/[?&]jump=([a-z]+)/i) || [])[1] || '';
  if (jump === 'firstslide') return '#slide-first';
  if (jump === 'lastslide') return '#slide-last';
  if (jump === 'nextslide') return '#slide-next';
  if (jump === 'previousslide' || jump === 'prevslide') return '#slide-prev';
  const rid = info.rid;
  if (rid && rels.slides && rels.slides[rid] != null) return `#slide-${rels.slides[rid] + 1}`;
  if (rid && rels.urls && rels.urls[rid]) return rels.urls[rid];
  return '';
}

function spPrNoFill(spPr) {
  return !!pptxDirectChild(spPr, 'noFill');
}

function spPrSolidFill(spPr) {
  return pptxDirectChild(spPr, 'solidFill');
}

function textBgFromSpPr(spPr, theme) {
  if (!spPr || spPrNoFill(spPr)) return {};
  const sf = spPrSolidFill(spPr);
  if (!sf) return {};
  const fc = colorFromSolidFill(sf, theme);
  if (!fc) return {};
  const op = pptxAlphaFromClr(sf);
  return op < 1 ? { textBg: fc, textBgOp: op } : { textBg: fc };
}

function nvMeta(node) {
  const pr = node.getElementsByTagNameNS(NS_P, 'cNvPr')[0];
  return {
    name: pr?.getAttribute('name') || '',
    descr: pr?.getAttribute('descr') || '',
  };
}

function isInkStrokeNode(node) {
  const { name, descr } = nvMeta(node);
  return /^InkStroke/i.test(name) || descr === 'ink';
}

function isInkFillNode(node) {
  const { name, descr } = nvMeta(node);
  return /^InkFill/i.test(name) || descr === 'inkFill';
}

function xfrmBox(xfrm, scX, scY) {
  if (!xfrm) return null;
  const off = xfrm.getElementsByTagNameNS(NS_A, 'off')[0];
  const ext = xfrm.getElementsByTagNameNS(NS_A, 'ext')[0];
  if (!off || !ext) return null;
  return {
    x: Math.round(+off.getAttribute('x') * scX),
    y: Math.round(+off.getAttribute('y') * scY),
    w: Math.max(1, Math.round(+ext.getAttribute('cx') * scX)),
    h: Math.max(1, Math.round(+ext.getAttribute('cy') * scY)),
    flipH: xfrm.getAttribute('flipH') === '1',
    flipV: xfrm.getAttribute('flipV') === '1',
  };
}

/** Walk parent grpSp nodes (inner→outer) for child→slide EMU mapping. */
function pptxGroupChain(node) {
  const chain = [];
  let cur = node?.parentNode;
  while (cur) {
    if (cur.localName === 'grpSp') {
      const grpSpPr =
        cur.getElementsByTagNameNS(NS_P, 'grpSpPr')[0] ||
        cur.getElementsByTagNameNS(NS_A, 'grpSpPr')[0];
      const xfrm = grpSpPr?.getElementsByTagNameNS(NS_A, 'xfrm')[0];
      if (xfrm) {
        const off = xfrm.getElementsByTagNameNS(NS_A, 'off')[0];
        const ext = xfrm.getElementsByTagNameNS(NS_A, 'ext')[0];
        const chOff = xfrm.getElementsByTagNameNS(NS_A, 'chOff')[0];
        const chExt = xfrm.getElementsByTagNameNS(NS_A, 'chExt')[0];
        if (off && ext && chOff && chExt) {
          chain.push({
            gx: +off.getAttribute('x') || 0,
            gy: +off.getAttribute('y') || 0,
            gw: Math.max(1, +ext.getAttribute('cx') || 1),
            gh: Math.max(1, +ext.getAttribute('cy') || 1),
            chx: +chOff.getAttribute('x') || 0,
            chy: +chOff.getAttribute('y') || 0,
            chw: Math.max(1, +chExt.getAttribute('cx') || 1),
            chh: Math.max(1, +chExt.getAttribute('cy') || 1),
          });
        }
      }
    }
    cur = cur.parentNode;
  }
  return chain;
}

/** Map child EMU box through group chain into slide EMU, then to canvas px. */
function pptxSpBox(sp, scX, scY) {
  const spPr =
    sp.getElementsByTagNameNS(NS_P, 'spPr')[0] ||
    sp.getElementsByTagNameNS(NS_A, 'spPr')[0] ||
    sp;
  const xfrm =
    spPr.getElementsByTagNameNS?.(NS_A, 'xfrm')?.[0] ||
    sp.getElementsByTagNameNS(NS_A, 'xfrm')[0] ||
    sp.getElementsByTagNameNS(NS_P, 'xfrm')[0];
  if (!xfrm) return null;
  const off = xfrm.getElementsByTagNameNS(NS_A, 'off')[0];
  const ext = xfrm.getElementsByTagNameNS(NS_A, 'ext')[0];
  if (!off || !ext) return null;
  let x = +off.getAttribute('x') || 0;
  let y = +off.getAttribute('y') || 0;
  let w = Math.max(1, +ext.getAttribute('cx') || 1);
  let h = Math.max(1, +ext.getAttribute('cy') || 1);
  for (const g of pptxGroupChain(sp)) {
    const sx = g.gw / g.chw;
    const sy = g.gh / g.chh;
    x = g.gx + (x - g.chx) * sx;
    y = g.gy + (y - g.chy) * sy;
    w *= sx;
    h *= sy;
  }
  return {
    x: Math.max(0, Math.round(x * scX)),
    y: Math.max(0, Math.round(y * scY)),
    w: Math.max(1, Math.round(w * scX)),
    h: Math.max(1, Math.round(h * scY)),
  };
}

/** If PPTX left a degenerate box, size it from text content. */
function autofitDegenerateTextBox(el) {
  if (!el || el.type !== 'text') return el;
  const plain = String(el.html || el.text || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ');
  const lines = plain.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return el;
  const fsM = String(el.cs || '').match(/font-size\s*:\s*([\d.]+)/i);
  let fs = fsM ? Math.round(+fsM[1]) : 24;
  if (!Number.isFinite(fs) || fs < 10) fs = 24;
  const maxLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const needW = Math.max(120, Math.min(1600, Math.round(maxLen * fs * 0.58 + 32)));
  const needH = Math.max(36, Math.round(lines.length * fs * 1.35 + 16));
  if ((el.w || 0) < Math.max(40, needW * 0.45)) {
    el.w = needW;
  }
  if ((el.h || 0) < Math.max(24, needH * 0.45)) {
    el.h = needH;
  }
  return el;
}

function isEmptyTextEl(el) {
  if (!el || el.type !== 'text') return false;
  const plain = String(el.html || el.text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return !plain;
}

function ptsFromCustGeom(spPr, box) {
  const path = spPr?.getElementsByTagNameNS(NS_A, 'path')[0];
  if (!path || !box) return [];
  const pw = Math.max(1, +path.getAttribute('w') || box.w);
  const ph = Math.max(1, +path.getAttribute('h') || box.h);
  const pts = [];
  const add = (ptEl) => {
    if (!ptEl) return;
    let lx = +ptEl.getAttribute('x') || 0;
    let ly = +ptEl.getAttribute('y') || 0;
    if (box.flipH) lx = pw - lx;
    if (box.flipV) ly = ph - ly;
    pts.push({
      x: box.x + (lx / pw) * box.w,
      y: box.y + (ly / ph) * box.h,
    });
  };
  for (const child of Array.from(path.childNodes)) {
    if (!child.localName) continue;
    const ptEls = child.getElementsByTagNameNS ? child.getElementsByTagNameNS(NS_A, 'pt') : [];
    if (child.localName === 'moveTo' || child.localName === 'lnTo') add(ptEls[0]);
    else if (child.localName === 'cubicBezTo') add(ptEls[2] || ptEls[ptEls.length - 1]);
    else if (child.localName === 'quadBezTo') add(ptEls[1] || ptEls[ptEls.length - 1]);
  }
  return pts;
}

function lnStyle(spPr, scX, theme) {
  const ln = spPr?.getElementsByTagNameNS(NS_A, 'ln')[0];
  if (!ln) return { width: 2, color: '#94a3b8', dash: 'solid', fromMarker: 'none', toMarker: 'none' };
  const lnW = +ln.getAttribute('w') || 0;
  const width = lnW ? Math.max(0.5, lnW * scX) : 2;
  const color = colorFromSolidFill(ln.getElementsByTagNameNS(NS_A, 'solidFill')[0], theme) || '#94a3b8';
  const dashEl = ln.getElementsByTagNameNS(NS_A, 'prstDash')[0];
  const dv = dashEl?.getAttribute('val') || 'solid';
  let dash = 'solid';
  if (/dot/i.test(dv)) dash = 'dot';
  else if (/dash/i.test(dv)) dash = 'dash';
  const unmap = (t) => {
    if (!t || t === 'none') return 'none';
    if (t === 'oval') return 'circle';
    if (t === 'diamond') return 'square';
    if (t === 'stealth') return 'bar';
    return 'arrow';
  };
  const head = ln.getElementsByTagNameNS(NS_A, 'headEnd')[0]?.getAttribute('type');
  const tail = ln.getElementsByTagNameNS(NS_A, 'tailEnd')[0]?.getAttribute('type');
  return { width, color, dash, fromMarker: unmap(head), toMarker: unmap(tail) };
}

const IDX_TO_SIDE = ['right', 'bottom', 'left', 'top'];
const PPTX_LN_TO_SIDE = { lnL: 'l', lnR: 'r', lnT: 't', lnB: 'b' };

/** 1px ≈ 9525 EMU at 96dpi (12700 EMU/pt × 72/96). */
function pptxEmuToPx(emu) {
  const n = +emu;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round((n / 9525) * 2) / 2;
}

function parseTcLn(tcPr, tag, theme) {
  if (!tcPr) return { w: 0, color: 'transparent' };
  const ln = pptxDirectChild(tcPr, tag);
  if (!ln) return { w: 0, color: 'transparent' };
  if (pptxDirectChild(ln, 'noFill')) return { w: 0, color: 'transparent' };
  const w = pptxEmuToPx(ln.getAttribute('w'));
  const sf = pptxDirectChild(ln, 'solidFill');
  const color = colorFromSolidFill(sf, theme) || '#000000';
  if (!(w > 0)) return { w: 0, color: 'transparent' };
  return { w, color };
}

function parseTcFill(tcPr, theme) {
  if (!tcPr) return 'transparent';
  if (pptxDirectChild(tcPr, 'noFill')) return 'transparent';
  const sf = pptxDirectChild(tcPr, 'solidFill');
  if (!sf) return 'transparent';
  return colorFromSolidFill(sf, theme) || 'transparent';
}

function parseTables(doc, scX, scY, idBase, startN, theme, rels) {
  const els = [];
  let n = startN;
  for (const gf of doc.getElementsByTagNameNS(NS_P, 'graphicFrame')) {
    try {
      const tbl = gf.getElementsByTagNameNS(NS_A, 'tbl')[0];
      if (!tbl) continue;
      const xfrm =
        gf.getElementsByTagNameNS(NS_P, 'xfrm')[0] || gf.getElementsByTagNameNS(NS_A, 'xfrm')[0];
      if (!xfrm) continue;
      const off = xfrm.getElementsByTagNameNS(NS_A, 'off')[0];
      const ext = xfrm.getElementsByTagNameNS(NS_A, 'ext')[0];
      if (!off || !ext) continue;
      const x = Math.max(0, Math.round(+off.getAttribute('x') * scX));
      const y = Math.max(0, Math.round(+off.getAttribute('y') * scY));
      const w = Math.max(80, Math.round(+ext.getAttribute('cx') * scX));
      const h = Math.max(40, Math.round(+ext.getAttribute('cy') * scY));
      const trs = Array.from(tbl.childNodes).filter(
        (node) => node.localName === 'tr' && node.namespaceURI === NS_A
      );
      if (!trs.length) continue;
      const rows = trs.length;
      const cols = Array.from(trs[0].childNodes).filter(
        (node) => node.localName === 'tc' && node.namespaceURI === NS_A
      ).length;
      if (!cols) continue;

      const grid = tbl.getElementsByTagNameNS(NS_A, 'tblGrid')[0];
      const gridCols = grid
        ? Array.from(grid.getElementsByTagNameNS(NS_A, 'gridCol')).map((g) => +g.getAttribute('w') || 0)
        : [];
      const colSum = gridCols.reduce((a, b) => a + b, 0);
      const colWidths =
        gridCols.length === cols && colSum > 0 ? gridCols.map((v) => v / colSum) : Array(cols).fill(1 / cols);
      const rowEmu = trs.map((tr) => +tr.getAttribute('h') || 0);
      const rowSum = rowEmu.reduce((a, b) => a + b, 0);
      const rowHeights =
        rowSum > 0 && rowEmu.length === rows ? rowEmu.map((v) => v / rowSum) : Array(rows).fill(1 / rows);

      const cells = [];
      let textColor = '#ffffff';
      let fs = 14;

      trs.forEach((tr, ri) => {
        Array.from(tr.childNodes)
          .filter((node) => node.localName === 'tc' && node.namespaceURI === NS_A)
          .forEach((tc, ci) => {
            const tcPr = tc.getElementsByTagNameNS(NS_A, 'tcPr')[0];
            const bg = parseTcFill(tcPr, theme);
            const borders = {};
            Object.entries(PPTX_LN_TO_SIDE).forEach(([tag, side]) => {
              borders[side] = parseTcLn(tcPr, tag, theme);
            });
            let html = '';
            let align = 'left';
            const txBody = tc.getElementsByTagNameNS(NS_A, 'txBody')[0];
            if (txBody) {
              const parsed = textFromTxBody(txBody, theme, undefined, rels);
              html = parsed.html;
              align = parsed.align;
              if (ri === 0 && ci === 0) {
                fs = parsed.fs || fs;
                textColor = parsed.color || textColor;
              }
            }
            const gridSpan = Math.max(1, +(tc.getAttribute('gridSpan') || 1));
            const rowSpan = Math.max(1, +(tc.getAttribute('rowSpan') || 1));
            const hidden = tc.getAttribute('hMerge') === '1' || tc.getAttribute('vMerge') === '1';
            cells.push({
              r: ri,
              c: ci,
              html,
              align,
              valign: 'middle',
              bg,
              borders,
              colspan: gridSpan,
              rowspan: rowSpan,
              hidden,
            });
          });
      });

      els.push({
        id: `${idBase}${++n}`,
        type: 'table',
        x,
        y,
        w,
        h,
        rot: 0,
        anims: [],
        rows,
        cols,
        cells,
        colWidths,
        rowHeights,
        borderW: 0,
        borderColor: 'transparent',
        stroke: 'transparent',
        headerRow: false,
        fs,
        textColor,
        headerBg: 'transparent',
        cellBg: 'transparent',
        altBg: '',
        fill: 'transparent',
        _pptxId: nvId(gf),
      });
    } catch (e) {
      console.warn('[PPTX] table', e);
    }
  }
  return { els, n };
}

function parsePureShapes(doc, scX, scY, idBase, startN, theme, rels) {
  const els = [];
  let n = startN;
  const seen = new Set();
  for (const sp of doc.getElementsByTagNameNS(NS_P, 'sp')) {
    try {
      if (sp.getElementsByTagNameNS(NS_M, 'oMath').length) continue;
      const txBody =
        sp.getElementsByTagNameNS(NS_P, 'txBody')[0] || sp.getElementsByTagNameNS(NS_A, 'txBody')[0];
      let shapeHtml = '';
      let shapeTextCss = '';
      if (txBody) {
        const parsed = textFromTxBody(txBody, theme, undefined, rels);
        const plain = (parsed.html || '').replace(/<[^>]+>/g, '').trim();
        if (plain) {
          shapeHtml = parsed.html;
          shapeTextCss = `font-size:${parsed.fs || 24}px;font-weight:700;color:${parsed.color || '#ffffff'};text-align:center;`;
        }
      }
      const style = pptxSpStyle(sp, theme);
      const spPr =
        sp.getElementsByTagNameNS(NS_P, 'spPr')[0] || sp.getElementsByTagNameNS(NS_A, 'spPr')[0];
      if (!spPr) continue;
      const prstGeom = spPr.getElementsByTagNameNS(NS_A, 'prstGeom')[0];
      if (!prstGeom) continue;
      const prst = prstGeom.getAttribute('prst');
      if (!prst) continue;
      if (isInkStrokeNode(sp) || isInkFillNode(sp)) continue;
      const txBox = sp.getElementsByTagNameNS(NS_P, 'cNvSpPr')[0]?.getAttribute('txBox') === '1';
      const noFill = spPrNoFill(spPr);
      // Skip shapes already handled as text elements in the main loop
      if (shapeHtml) {
        const isTextLike = txBox || noFill || !prst || prst === 'rect' || prst === 'roundRect';
        if (isTextLike) continue;
      }
      const shapeId = PRST_MAP[prst] || 'rect';
      const box = pptxSpBox(sp, scX, scY);
      if (!box) continue;
      const { x, y, w, h } = box;
      // Tiny decorative dots / zero boxes — skip (look like empty junk)
      if (w < 28 && h < 28) continue;
      if (w < 8 || h < 8) continue;
      const uid = `${x}_${y}_${w}_${h}_${prst}`;
      if (seen.has(uid)) continue;
      seen.add(uid);
      const xfrm = spPr.getElementsByTagNameNS(NS_A, 'xfrm')[0];
      const rot = Math.round((+(xfrm?.getAttribute('rot') || 0)) / 60000);
      let fill = style.fill || '#3b82f6';
      let stroke = style.stroke || fill || '#1d4ed8';
      let fillOp = style.fillOp != null ? style.fillOp : 1;
      let sw = style.sw != null ? style.sw : 2;
      if (!style.fill) {
        const solidFill = spPrSolidFill(spPr);
        const fc = colorFromSolidFill(solidFill, theme);
        if (fc) {
          fill = fc;
          stroke = fc;
        }
      }
      if (spPrNoFill(spPr)) fillOp = 0;
      if (!style.stroke) {
        const ln = pptxDirectChild(spPr, 'ln');
        if (ln) {
          const lnW = +ln.getAttribute('w') || 0;
          if (lnW > 0) sw = Math.max(1, Math.round(lnW / 12700));
          const sc = colorFromSolidFill(pptxDirectChild(ln, 'solidFill'), theme);
          if (sc) stroke = sc;
        }
      }
      // Empty decorative shapes (no text): drop invisible / bullet-dot junk
      if (!shapeHtml) {
        if (fillOp <= 0 && (!sw || sw <= 0)) continue;
        if (shapeId === 'ellipse' && w < 64 && h < 64 && fillOp <= 0) continue;
      }
      let rx = 0;
      if (/round/i.test(prst)) rx = 12;
      els.push({
        id: `${idBase}${++n}`,
        type: 'shape',
        shape: shapeId,
        x,
        y,
        w,
        h,
        rot,
        fill: fillOp > 0 ? fill : 'transparent',
        stroke,
        sw,
        fillOp,
        rx,
        anims: [],
        _pptxId: nvId(sp),
        _pptxLink: pptxHlinkClick(sp),
        ...(shapeHtml ? { shapeHtml, shapeTextCss } : {}),
      });
    } catch (e) {
      console.warn('[PPTX] shape', e);
    }
  }
  return { els, n };
}

function parseFormulas(doc, scX, scY, idBase, startN, formulaColor) {
  const els = [];
  let n = startN;
  const oMathNodes = [
    ...Array.from(doc.getElementsByTagNameNS(NS_M, 'oMath')),
    ...Array.from(doc.getElementsByTagNameNS(NS_M, 'oMathPara')),
  ];
  for (const mathNode of oMathNodes) {
    try {
      if (
        mathNode.localName === 'oMath' &&
        mathNode.parentNode &&
        mathNode.parentNode.localName === 'oMathPara'
      ) {
        continue;
      }
      let container = mathNode.parentNode;
      let xfrm = null;
      for (let depth = 0; depth < 12; depth++) {
        if (!container) break;
        const xfrms = container.getElementsByTagNameNS?.(NS_A, 'xfrm');
        if (xfrms?.length) {
          xfrm = xfrms[0];
          break;
        }
        container = container.parentNode;
      }
      if (!xfrm) continue;
      const off = xfrm.getElementsByTagNameNS(NS_A, 'off')[0];
      const extEl = xfrm.getElementsByTagNameNS(NS_A, 'ext')[0];
      if (!off || !extEl) continue;
      const x = Math.max(0, Math.round(+off.getAttribute('x') * scX));
      const y = Math.max(0, Math.round(+off.getAttribute('y') * scY));
      const w = Math.max(80, Math.round(+extEl.getAttribute('cx') * scX));
      const h = Math.max(40, Math.round(+extEl.getAttribute('cy') * scY));
      const latex = ommlToLatex(mathNode);
      if (!latex.trim()) continue;
      const color = formulaColor || '#ffffff';
      els.push({
        id: `${idBase}${++n}`,
        type: 'formula',
        x,
        y,
        w,
        h,
        formulaRaw: latex,
        formulaSvg: '',
        formulaColor: color,
        textColor: color,
        html: latex,
        cs: `font-size:28px;font-family:Georgia,serif;color:${color};text-align:center;`,
        valign: 'middle',
        rot: 0,
        anims: [],
        _pptxId: nvId(container) || nvId(mathNode.parentNode),
      });
    } catch (e) {
      console.warn('[PPTX] formula', e);
    }
  }
  return { els, n };
}

function pptxSlideDrawables(doc) {
  const tree = doc.getElementsByTagNameNS(NS_P, 'spTree')[0];
  const out = [];
  const walk = (node) => {
    if (!node?.childNodes) return;
    for (const ch of node.childNodes) {
      const ln = ch.localName;
      if (ln === 'sp' || ln === 'pic') out.push(ch);
      else if (ln === 'grpSp' || ln === 'spTree') walk(ch);
    }
  };
  walk(tree || doc);
  return out;
}

function parseSlideXml(xml, slideW, slideH, canvasW, canvasH, mediaMap, idBase, theme, bgColor, rels) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const els = [];
  let n = 0;
  const scX = canvasW / (slideW || 12192000);
  const scY = canvasH / (slideH || 6858000);
  const defText = pptxDefaultTextColor(bgColor || '#1e293b', theme);

  const shapes = pptxSlideDrawables(doc);

  for (const sp of shapes) {
    try {
      if (sp.localName === 'sp' && sp.getElementsByTagNameNS(NS_M, 'oMath').length) continue;
      if (sp.localName === 'sp' && (isInkStrokeNode(sp) || isInkFillNode(sp))) continue;

      const box = pptxSpBox(sp, scX, scY);
      if (!box) continue;
      let { x, y, w, h } = box;

      if (sp.localName === 'pic') {
        const mediaRef = pptxPicMediaRef(sp);
        if (mediaRef?.rid) {
          const audioSrc =
            rels?.audio?.[mediaRef.rid] ||
            (mediaRef.kind === 'audio' ? mediaMap?.[mediaRef.rid] : null);
          const videoSrc =
            rels?.video?.[mediaRef.rid] ||
            (mediaRef.kind === 'video' ? mediaMap?.[mediaRef.rid] : null);
          const asAudio =
            mediaRef.kind === 'audio' ||
            (!!audioSrc && mediaRef.kind === 'media') ||
            (!!audioSrc && !videoSrc);
          const asVideo =
            !asAudio &&
            (mediaRef.kind === 'video' || (!!videoSrc && mediaRef.kind === 'media'));
          if (asAudio && audioSrc) {
            const name = rels?.audioNames?.[mediaRef.rid] || 'Audio';
            els.push({
              id: `${idBase}${++n}`,
              type: 'mediaaudio',
              x,
              y,
              w: Math.max(200, Math.min(520, w || 360)),
              h: Math.max(36, Math.min(56, h > 80 ? 40 : Math.max(36, h || 40))),
              mediaSrc: audioSrc,
              mediaSrcType: 'url',
              mediaName: name,
              maLoop: false,
              maVolume: 1,
              maStart: 'click-el',
              maTriggerElIds: [],
              rot: 0,
              anims: [],
              _pptxId: nvId(sp),
              _pptxAudioRid: mediaRef.rid,
            });
            continue;
          }
          if (asVideo && videoSrc) {
            const name = rels?.videoNames?.[mediaRef.rid] || 'Video';
            els.push({
              id: `${idBase}${++n}`,
              type: 'mediavideo',
              x,
              y,
              w: Math.max(160, w || 480),
              h: Math.max(90, h || 270),
              mediaSrc: videoSrc,
              mediaSrcType: 'url',
              mediaName: name,
              mvControls: 'bar',
              mvDisplay: 'inline',
              mvStart: 'click',
              rot: 0,
              anims: [],
              _pptxId: nvId(sp),
              _pptxVideoRid: mediaRef.rid,
            });
            continue;
          }
          // Media ref present but bytes missing — skip speaker artwork (not a real image).
          if (mediaRef.kind === 'audio' || mediaRef.kind === 'video' || mediaRef.kind === 'media') {
            continue;
          }
        }
        const blip = sp.getElementsByTagNameNS(NS_A, 'blip')[0];
        const embed = blip?.getAttributeNS(NS_R, 'embed') || blip?.getAttribute('r:embed');
        const src = embed && mediaMap[embed];
        if (src) {
          els.push(
            fitImportedImageAspect({
              id: `${idBase}${++n}`,
              type: 'image',
              x,
              y,
              w,
              h,
              src,
              imgBw: 0,
              rot: 0,
              anims: [],
              _pptxId: nvId(sp),
              _pptxLink: pptxHlinkClick(sp),
            })
          );
        }
        continue;
      }

      const txBody =
        sp.getElementsByTagNameNS(NS_P, 'txBody')[0] || sp.getElementsByTagNameNS(NS_A, 'txBody')[0];
      const spPr =
        sp.getElementsByTagNameNS(NS_P, 'spPr')[0] || sp.getElementsByTagNameNS(NS_A, 'spPr')[0];
      const prst = spPr?.getElementsByTagNameNS(NS_A, 'prstGeom')[0]?.getAttribute('prst') || '';
      const txBox = sp.getElementsByTagNameNS(NS_P, 'cNvSpPr')[0]?.getAttribute('txBox') === '1';
      const noFill = spPrNoFill(spPr);
      // Extract text from any shape with txBody — not just explicit txBox='1'
      if (txBody) {
        const { html, fs, color, align, mono, listKind } = textFromTxBody(
          txBody,
          theme,
          defText,
          rels
        );
        const plainText = html ? html.replace(/<[^>]+>/g, '').trim() : '';
        if (plainText) {
          // Treat as text element if it's a text box or a filled/empty rectangle
          const isTextLike = txBox || noFill || !prst || prst === 'rect' || prst === 'roundRect';
          if (isTextLike) {
            const bgFromShape = textBgFromSpPr(spPr, theme);
            const shapeName = nvMeta(sp).name || '';
            const bgHex = String(bgColor || '#1e293b').replace('#', '');
            const bgLum =
              bgHex.length >= 6
                ? (parseInt(bgHex.slice(0, 2), 16) * 299 +
                    parseInt(bgHex.slice(2, 4), 16) * 587 +
                    parseInt(bgHex.slice(4, 6), 16) * 114) /
                  1000
                : 40;
            const el = autofitDegenerateTextBox(
              enrichImportedTextEl(
                {
                  id: `${idBase}${++n}`,
                  x,
                  y,
                  w,
                  h,
                  html,
                  text: plainText,
                  cs: `font-size:${fs}px;color:${color};text-align:${align};`,
                  textColor: color,
                  textColorScheme: null,
                  rot: 0,
                  anims: [],
                  _pptxId: nvId(sp),
                  _pptxLink: pptxHlinkClick(sp),
                  ...bgFromShape,
                },
                {
                  shapeName,
                  mono,
                  listKind,
                  fs,
                  themeDark: bgLum < 160,
                }
              )
            );
            if (!isEmptyTextEl(el)) els.push(el);
            continue;
          }
        }
      }
    } catch (e) {}
  }

  const tables = parseTables(doc, scX, scY, idBase, n, theme, rels);
  n = tables.n;
  els.push(...tables.els);

  const pure = parsePureShapes(doc, scX, scY, idBase, n, theme, rels);
  n = pure.n;
  els.push(...pure.els);

  const formulas = parseFormulas(doc, scX, scY, idBase, n, defText);
  els.push(...formulas.els);

  const ink = [];
  const inkFills = [];
  for (const sp of Array.from(doc.getElementsByTagNameNS(NS_P, 'sp'))) {
    try {
      const spPr = sp.getElementsByTagNameNS(NS_P, 'spPr')[0] || sp.getElementsByTagNameNS(NS_A, 'spPr')[0];
      if (!spPr || !spPr.getElementsByTagNameNS(NS_A, 'custGeom')[0]) continue;
      const xfrm = spPr.getElementsByTagNameNS(NS_A, 'xfrm')[0];
      const box = xfrmBox(xfrm, scX, scY);
      if (!box) continue;
      const pts = ptsFromCustGeom(spPr, box);
      if (isInkFillNode(sp)) {
        if (pts.length < 3) continue;
        const fillC =
          colorFromSolidFill(spPr.getElementsByTagNameNS(NS_A, 'solidFill')[0], theme) || '#64748b';
        const d = `M${pts.map((p, i) => `${i ? 'L' : ''}${Math.round(p.x)},${Math.round(p.y)}`).join('')}Z`;
        inkFills.push({
          id: `${idBase}f${inkFills.length + 1}`,
          color: fillC,
          opacity: 0.55,
          pattern: 'solid',
          points: pts,
          d,
        });
        continue;
      }
      if (isInkStrokeNode(sp) || (pts.length >= 2 && !spPr.getElementsByTagNameNS(NS_A, 'prstGeom')[0] && nvMeta(sp).descr === 'ink')) {
        if (pts.length < 2) continue;
        const ln = lnStyle(spPr, scX, theme);
        ink.push({
          id: `${idBase}k${ink.length + 1}`,
          tool: 'pen',
          color: ln.color,
          width: ln.width,
          points: pts,
          opacity: 1,
        });
      }
    } catch (e) {}
  }

  const idByPptx = new Map();
  for (const el of els) {
    if (el && el._pptxId != null) idByPptx.set(String(el._pptxId), el.id);
  }
  const connectors = [];
  for (const cxn of Array.from(doc.getElementsByTagNameNS(NS_P, 'cxnSp'))) {
    try {
      const stCxn = cxn.getElementsByTagNameNS(NS_A, 'stCxn')[0];
      const endCxn = cxn.getElementsByTagNameNS(NS_A, 'endCxn')[0];
      const fromId = stCxn ? idByPptx.get(String(stCxn.getAttribute('id'))) : null;
      const toId = endCxn ? idByPptx.get(String(endCxn.getAttribute('id'))) : null;
      if (!fromId || !toId) continue;
      const spPr = cxn.getElementsByTagNameNS(NS_P, 'spPr')[0] || cxn.getElementsByTagNameNS(NS_A, 'spPr')[0];
      const prst = spPr?.getElementsByTagNameNS(NS_A, 'prstGeom')[0]?.getAttribute('prst') || '';
      let route = 'straight';
      if (/bent/i.test(prst)) route = 'orthogonal';
      else if (/curved/i.test(prst)) route = 'curve';
      const fromIdx = stCxn ? +stCxn.getAttribute('idx') : 0;
      const toIdx = endCxn ? +endCxn.getAttribute('idx') : 2;
      const ln = lnStyle(spPr, scX, theme);
      connectors.push({
        id: `${idBase}c${connectors.length + 1}`,
        fromId,
        toId,
        fromSide: IDX_TO_SIDE[fromIdx] || 'right',
        toSide: IDX_TO_SIDE[toIdx] || 'left',
        route,
        color: ln.color,
        sw: ln.width,
        dash: ln.dash,
        fromMarker: ln.fromMarker,
        toMarker: ln.toMarker === 'none' ? 'arrow' : ln.toMarker,
      });
    } catch (e) {}
  }

  // Orphan audio on the slide (linked in rels but not attached to a pic) → audio objects.
  const usedAudio = new Set(
    els.filter((e) => e && e._pptxAudioRid).map((e) => String(e._pptxAudioRid))
  );
  const audioMap = rels?.audio || {};
  let orphanY = 80;
  Object.keys(audioMap).forEach((rid) => {
    if (usedAudio.has(String(rid))) return;
    const src = audioMap[rid];
    if (!src) return;
    els.push({
      id: `${idBase}${++n}`,
      type: 'mediaaudio',
      x: 80,
      y: orphanY,
      w: 360,
      h: 40,
      mediaSrc: src,
      mediaSrcType: 'url',
      mediaName: rels?.audioNames?.[rid] || 'Audio',
      maLoop: false,
      maVolume: 1,
      maStart: 'click-el',
      maTriggerElIds: [],
      rot: 0,
      anims: [],
      _pptxAudioRid: rid,
    });
    orphanY += 56;
  });

  return { els, ink, inkFills, connectors };
}

const PPTX_AUDIO_MIME = {
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  wave: 'audio/wav',
  wma: 'audio/x-ms-wma',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  flac: 'audio/flac',
};
const PPTX_VIDEO_MIME = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv',
};

function pptxMediaPathFromRel(target, slidePath) {
  const base = slidePath.replace(/[^/]+$/, '');
  let mediaPath = String(target || '').replace(/^\.\.\//, 'ppt/');
  if (!mediaPath.startsWith('ppt/')) {
    mediaPath = base.replace(/slides\/$/, '') + String(target || '').replace(/^\//, '');
    if (String(target || '').startsWith('../')) mediaPath = 'ppt/' + String(target).replace(/^\.\.\//, '');
  }
  return mediaPath;
}

function pptxAttrRid(node, ...names) {
  if (!node) return '';
  for (const name of names) {
    const v =
      node.getAttributeNS?.(NS_R, name) ||
      node.getAttribute?.(`r:${name}`) ||
      node.getAttribute?.(name);
    if (v) return String(v);
  }
  return '';
}

/** Detect audio/video attachment on a p:pic (speaker icon / media placeholder). */
function pptxPicMediaRef(sp) {
  if (!sp) return null;
  const audio =
    sp.getElementsByTagNameNS(NS_A, 'audioFile')[0] ||
    sp.getElementsByTagNameNS(NS_P, 'audioFile')[0];
  if (audio) {
    const rid = pptxAttrRid(audio, 'link', 'embed', 'id');
    if (rid) return { kind: 'audio', rid };
  }
  const video =
    sp.getElementsByTagNameNS(NS_A, 'videoFile')[0] ||
    sp.getElementsByTagNameNS(NS_P, 'videoFile')[0];
  if (video) {
    const rid = pptxAttrRid(video, 'link', 'embed', 'id');
    if (rid) return { kind: 'video', rid };
  }
  // p14:media / mc:AlternateContent media embeds
  const all = sp.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const n = all[i];
    if (!n || n.localName !== 'media') continue;
    const rid = pptxAttrRid(n, 'embed', 'link', 'id');
    if (rid) return { kind: 'media', rid };
  }
  const hlinks = [
    ...sp.getElementsByTagNameNS(NS_A, 'hlinkClick'),
    ...sp.getElementsByTagNameNS(NS_P, 'hlinkClick'),
  ];
  for (const h of hlinks) {
    if (!/ppaction:\/\/media/i.test(h.getAttribute('action') || '')) continue;
    const rid = pptxAttrRid(h, 'id');
    if (rid) return { kind: 'media', rid };
  }
  return null;
}

function pptxMediaFileName(src, fallback) {
  if (!src) return fallback;
  const m = String(src).match(/[/\\]([^/\\]+)$/);
  return (m && m[1]) || fallback;
}

async function relsFromSlide(zip, slidePath, relsPath) {
  const images = {};
  const audio = {};
  const video = {};
  const audioNames = {};
  const videoNames = {};
  const slides = {};
  const urls = {};
  try {
    const relsXml = await zip.file(relsPath)?.async('string');
    if (!relsXml) return { images, audio, video, audioNames, videoNames, slides, urls };
    const doc = new DOMParser().parseFromString(relsXml, 'application/xml');
    const rels = [...doc.getElementsByTagName('Relationship')];
    for (const r of rels) {
      const id = r.getAttribute('Id');
      const target = r.getAttribute('Target');
      const type = r.getAttribute('Type') || '';
      if (!id || !target) continue;
      if (/hyperlink/i.test(type)) {
        let href = String(target).trim();
        try {
          href = decodeURI(href);
        } catch (e) {}
        if (href) urls[id] = href;
        continue;
      }
      if (/\/slide$/i.test(type) || /relationships\/slide$/i.test(type)) {
        const m = String(target).match(/slide(\d+)\.xml/i);
        if (m) slides[id] = +m[1] - 1;
        continue;
      }
      const mediaPath = pptxMediaPathFromRel(target, slidePath);
      const ext = (mediaPath.split('.').pop() || '').toLowerCase();
      const isImage = /image/i.test(type);
      const isAudio =
        /\/audio$/i.test(type) ||
        (!!PPTX_AUDIO_MIME[ext] && (/\/media$/i.test(type) || /audio/i.test(type) || /media\//i.test(mediaPath)));
      const isVideo =
        /\/video$/i.test(type) ||
        (!!PPTX_VIDEO_MIME[ext] && (/\/media$/i.test(type) || /video/i.test(type)));
      // Generic office/2007 media relationship — classify by extension.
      const isOfficeMedia = /\/media$/i.test(type) || /office\/2007\/relationships\/media/i.test(type);
      if (!isImage && !isAudio && !isVideo && !isOfficeMedia) continue;
      const f = zip.file(mediaPath) || zip.file(decodeURIComponent(mediaPath));
      if (!f) continue;
      const buf = await f.async('base64');
      const name = pptxMediaFileName(mediaPath, `${id}.${ext || 'bin'}`);
      if (isAudio || (isOfficeMedia && PPTX_AUDIO_MIME[ext])) {
        const mime = PPTX_AUDIO_MIME[ext] || 'audio/mpeg';
        audio[id] = `data:${mime};base64,${buf}`;
        audioNames[id] = name;
        continue;
      }
      if (isVideo || (isOfficeMedia && PPTX_VIDEO_MIME[ext])) {
        const mime = PPTX_VIDEO_MIME[ext] || 'video/mp4';
        video[id] = `data:${mime};base64,${buf}`;
        videoNames[id] = name;
        continue;
      }
      if (!isImage && !isOfficeMedia) continue;
      const mime =
        ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'svg'
            ? 'image/svg+xml'
            : ext === 'gif'
              ? 'image/gif'
              : ext === 'webp'
                ? 'image/webp'
                : 'image/png';
      images[id] = `data:${mime};base64,${buf}`;
    }
  } catch (e) {}
  return { images, audio, video, audioNames, videoNames, slides, urls };
}

/**
 * @param {File|ArrayBuffer} file
 * @param {{canvasW?:number,canvasH?:number}} [opts]
 * @returns {Promise<{slides:object[], title:string, canvasW?:number, canvasH?:number, ar?:string}>}
 */
export async function importPptxFile(file, opts = {}) {
  let canvasW = opts.canvasW || DEFAULT_CANVAS_W;
  let canvasH = opts.canvasH || DEFAULT_CANVAS_H;

  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const { isOleCompound, importPptBinaryFile } = await import('./pptBinaryImport.js');
  if (isOleCompound(buf)) {
    const name = file && file.name ? String(file.name) : opts.filename || 'file.ppt';
    return importPptBinaryFile(buf, { ...opts, filename: name });
  }

  const JSZip = await ensureJSZip();
  const zip = await JSZip.loadAsync(buf);

  const { isOdpArchive, importOdpZip } = await import('./odpImport.js');
  if (isOdpArchive(zip)) {
    const name = file && file.name ? String(file.name) : opts.filename || 'file.odp';
    return importOdpZip(zip, { ...opts, filename: name });
  }

  let slideW = 12192000;
  let slideH = 6858000;
  let ar = '16:9';
  try {
    const pres = await zip.file('ppt/presentation.xml')?.async('string');
    if (pres) {
      const doc = new DOMParser().parseFromString(pres, 'application/xml');
      const sldSz = doc.getElementsByTagNameNS(NS_P, 'sldSz')[0];
      if (sldSz) {
        slideW = +sldSz.getAttribute('cx') || slideW;
        slideH = +sldSz.getAttribute('cy') || slideH;
      }
      const ratio = slideW / slideH;
      ar = Math.abs(ratio - 16 / 9) < 0.1 ? '16:9' : '4:3';
      if (!opts.canvasH) canvasH = ar === '4:3' ? 1440 : DEFAULT_CANVAS_H;
      if (!opts.canvasW) canvasW = ar === '4:3' ? 1920 : DEFAULT_CANVAS_W;
    }
  } catch (e) {}

  const slideFiles = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
    .sort((a, b) => {
      const na = +(a.match(/slide(\d+)/i) || [])[1] || 0;
      const nb = +(b.match(/slide(\d+)/i) || [])[1] || 0;
      return na - nb;
    });

  if (!slideFiles.length) throw new Error('No slides in PPTX');

  const theme = await pptxLoadTheme(zip);
  const parser = new DOMParser();
  const slides = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const path = slideFiles[i];
    const xml = await zip.file(path).async('string');
    const num = (path.match(/slide(\d+)/i) || [])[1] || String(i + 1);
    const relsPath = `ppt/slides/_rels/slide${num}.xml.rels`;
    const rels = await relsFromSlide(zip, path, relsPath);
    const mediaMap = rels.images;
    const doc = parser.parseFromString(xml, 'application/xml');
    let bgc = '#1e293b';
    let bgImgData = null;
    try {
      const slideBg = await pptxSlideBgChain(zip, path, doc, theme, parser, NS_P, NS_A, NS_R);
      if (slideBg) bgc = slideBg;
      // Check for background image
      bgImgData = pptxExtractBgImage(doc, mediaMap, NS_P, NS_A, NS_R);
    } catch (e) {}
    const parsed = parseSlideXml(
      xml,
      slideW,
      slideH,
      canvasW,
      canvasH,
      mediaMap,
      `e${i}_`,
      theme,
      bgc,
      rels
    );
    const els = parsed.els || parsed;
    applyPptxTiming(doc, els, rels.slides);
    for (const el of els) {
      if (!el) continue;
      const href = hrefFromPptxHlink(el._pptxLink, rels);
      if (href) el.link = href;
      delete el._pptxId;
      delete el._pptxLink;
      delete el._pptxLinkRid;
      delete el._pptxAudioRid;
      delete el._pptxVideoRid;
    }

    let title = `Слайд ${i + 1}`;
    try {
      const ts = Array.from(doc.getElementsByTagNameNS(NS_P, 'sp')).find((sp) => {
        const ph = sp.getElementsByTagNameNS(NS_P, 'ph')[0];
        return ph && (ph.getAttribute('type') === 'title' || ph.getAttribute('type') === 'ctrTitle');
      });
      if (ts) {
        const tx = Array.from(ts.getElementsByTagNameNS(NS_A, 't'))
          .map((t) => t.textContent)
          .join('')
          .trim();
        if (tx) title = tx.slice(0, 60);
      }
    } catch (e) {}

    const slideObj = {
      id: `s${Date.now()}_${i}`,
      title,
      name: title,
      bg: 'custom',
      bgc,
      els,
      ink: parsed.ink || [],
      inkFills: parsed.inkFills || [],
      connectors: parsed.connectors || [],
    };
    if (bgImgData) {
      slideObj.bgImg = makeBgImgFromSrc(bgImgData, 'bg');
    }
    slides.push(slideObj);
  }

  // Bake OMML → SVG via MathJax
  const formulas = slides.flatMap((s) => (s.els || []).filter((e) => e.type === 'formula' && e.formulaRaw));
  if (formulas.length) {
    for (const d of formulas) {
      try {
        d.formulaSvg = await renderFormulaSvg(d.formulaRaw);
      } catch (e) {
        console.warn('[PPTX] formula render', e);
      }
    }
  }

  const title = (file && file.name ? String(file.name).replace(/\.pptx?$/i, '') : '') || 'Import';
  return { slides, title, canvasW, canvasH, ar };
}

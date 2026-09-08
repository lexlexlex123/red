/**
 * PPTX → React slides (text, pictures, tables, shapes, formulas, connectors, ink).
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
} from './pptxTheme.js';
import { renderFormulaSvg } from './mathjax.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';
import { ensureJSZip } from '../shared/jszip.js';
import { makeBgImgFromSrc } from './slideBgImg.js';

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
};

function colorFromSolidFill(sf, theme) {
  return pptxColorFromSolidFill(sf, theme) || null;
}

function textFromTxBody(txBody, theme, defaultColor) {
  if (!txBody) return { html: '', fs: 24, color: defaultColor || '#ffffff', align: 'left' };
  let html = '';
  let fs = 24;
  let color = defaultColor || '#ffffff';
  let align = 'left';
  const lstStyle = txBody.getElementsByTagNameNS(NS_A, 'lstStyle')[0];
  if (lstStyle) {
    const defRPr = lstStyle.getElementsByTagNameNS(NS_A, 'defRPr')[0];
    if (defRPr) {
      const defSf = defRPr.getElementsByTagNameNS(NS_A, 'solidFill')[0];
      const dc = colorFromSolidFill(defSf, theme);
      if (dc) color = dc;
    }
  }
  const paras = txBody.getElementsByTagNameNS(NS_A, 'p');
  for (const para of paras) {
    const pPr = para.getElementsByTagNameNS(NS_A, 'pPr')[0];
    if (pPr) {
      const a = pPr.getAttribute('algn');
      if (a === 'ctr') align = 'center';
      else if (a === 'r') align = 'right';
    }
    let ph = '';
    const runs = para.getElementsByTagNameNS(NS_A, 'r');
    for (const run of runs) {
      const t = run.getElementsByTagNameNS(NS_A, 't')[0];
      if (!t) continue;
      const txt = t.textContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      if (!txt) continue;
      const rPr = run.getElementsByTagNameNS(NS_A, 'rPr')[0];
      let st = '';
      if (rPr) {
        const sz = +rPr.getAttribute('sz');
        if (sz) fs = Math.round((sz / 100) * (96 / 72));
        if (rPr.getAttribute('b') === '1') st += 'font-weight:700;';
        if (rPr.getAttribute('i') === '1') st += 'font-style:italic;';
        if (rPr.getAttribute('u') && rPr.getAttribute('u') !== 'none') st += 'text-decoration:underline;';
        const sf = rPr.getElementsByTagNameNS(NS_A, 'solidFill')[0];
        const c = colorFromSolidFill(sf, theme);
        if (c) {
          color = c;
          st += `color:${c};`;
        }
      }
      ph += st ? `<span style="${st}">${txt}</span>` : txt;
    }
    html += ph ? `<div>${ph}</div>` : '<div><br></div>';
  }
  return { html, fs, color, align };
}

function nvId(node) {
  if (!node) return null;
  const pr = node.getElementsByTagNameNS(NS_P, 'cNvPr')[0];
  const id = pr?.getAttribute('id');
  return id != null && id !== '' ? String(id) : null;
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

function parseTables(doc, scX, scY, idBase, startN, theme) {
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

      const cells = [];
      let headerBg = '#3b82f6';
      let cellBg = 'rgba(255,255,255,0.08)';
      let textColor = '#ffffff';
      let fs = 14;

      trs.forEach((tr, ri) => {
        Array.from(tr.childNodes)
          .filter((node) => node.localName === 'tc' && node.namespaceURI === NS_A)
          .forEach((tc, ci) => {
            const tcPr = tc.getElementsByTagNameNS(NS_A, 'tcPr')[0];
            let bg = '';
            if (tcPr) {
              const c = colorFromSolidFill(tcPr.getElementsByTagNameNS(NS_A, 'solidFill')[0], theme);
              if (c) bg = c;
            }
            let html = '';
            let align = 'left';
            const txBody = tc.getElementsByTagNameNS(NS_A, 'txBody')[0];
            if (txBody) {
              const parsed = textFromTxBody(txBody, theme);
              html = parsed.html;
              align = parsed.align;
              if (ri === 0 && ci === 0) {
                fs = parsed.fs || fs;
                textColor = parsed.color || textColor;
              }
            }
            if (ri === 0 && ci === 0 && bg) headerBg = bg;
            else if (ri === 1 && ci === 0 && bg) cellBg = bg;
            cells.push({ r: ri, c: ci, html, align, valign: 'middle', bg: bg || undefined });
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
        borderW: 1,
        stroke: 'rgba(255,255,255,0.25)',
        headerRow: true,
        fs,
        textColor,
        headerBg,
        cellBg,
        altBg: '',
        fill: '#1e293b',
        _pptxId: nvId(gf),
      });
    } catch (e) {
      console.warn('[PPTX] table', e);
    }
  }
  return { els, n };
}

function parsePureShapes(doc, scX, scY, idBase, startN, theme) {
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
        const parsed = textFromTxBody(txBody, theme);
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
      const noFill = !!(spPr && spPr.getElementsByTagNameNS(NS_A, 'noFill')[0]);
      // Skip shapes already handled as text elements in the main loop
      if (shapeHtml) {
        const isTextLike = txBox || noFill || (!prst) || prst === 'rect' || prst === 'roundRect';
        if (isTextLike) continue;
      }
      const shapeId = PRST_MAP[prst] || 'rect';
      const xfrm = spPr.getElementsByTagNameNS(NS_A, 'xfrm')[0];
      if (!xfrm) continue;
      const off = xfrm.getElementsByTagNameNS(NS_A, 'off')[0];
      const extEl = xfrm.getElementsByTagNameNS(NS_A, 'ext')[0];
      if (!off || !extEl) continue;
      const x = Math.max(0, Math.round(+off.getAttribute('x') * scX));
      const y = Math.max(0, Math.round(+off.getAttribute('y') * scY));
      const w = Math.max(20, Math.round(+extEl.getAttribute('cx') * scX));
      const h = Math.max(20, Math.round(+extEl.getAttribute('cy') * scY));
      const uid = `${x}_${y}_${w}_${h}_${prst}`;
      if (seen.has(uid)) continue;
      seen.add(uid);
      const rot = Math.round((+xfrm.getAttribute('rot') || 0) / 60000);
      let fill = style.fill || '#3b82f6';
      let stroke = style.stroke || fill || '#1d4ed8';
      let fillOp = style.fillOp != null ? style.fillOp : 1;
      let sw = style.sw != null ? style.sw : 2;
      if (!style.fill) {
        const solidFill = spPr.getElementsByTagNameNS(NS_A, 'solidFill')[0];
        const fc = colorFromSolidFill(solidFill, theme);
        if (fc) {
          fill = fc;
          stroke = fc;
        }
      }
      if (spPr.getElementsByTagNameNS(NS_A, 'noFill')[0]) fillOp = 0;
      if (!style.stroke) {
        const ln = spPr.getElementsByTagNameNS(NS_A, 'ln')[0];
        if (ln) {
          const lnW = +ln.getAttribute('w') || 0;
          if (lnW > 0) sw = Math.max(1, Math.round(lnW / 12700));
          const sc = colorFromSolidFill(ln.getElementsByTagNameNS(NS_A, 'solidFill')[0], theme);
          if (sc) stroke = sc;
        }
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
        elOpacity: fillOp,
        rx,
        anims: [],
        _pptxId: nvId(sp),
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

function parseSlideXml(xml, slideW, slideH, canvasW, canvasH, mediaMap, idBase, theme, bgColor) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const els = [];
  let n = 0;
  const scX = canvasW / (slideW || 12192000);
  const scY = canvasH / (slideH || 6858000);
  const defText = pptxDefaultTextColor(bgColor || '#1e293b', theme);

  const shapes = [
    ...doc.getElementsByTagNameNS(NS_P, 'sp'),
    ...doc.getElementsByTagNameNS(NS_P, 'pic'),
  ];

  for (const sp of shapes) {
    try {
      if (sp.localName === 'sp' && sp.getElementsByTagNameNS(NS_M, 'oMath').length) continue;
      if (sp.localName === 'sp' && (isInkStrokeNode(sp) || isInkFillNode(sp))) continue;

      const xfrm =
        sp.getElementsByTagNameNS(NS_A, 'xfrm')[0] || sp.getElementsByTagNameNS(NS_P, 'xfrm')[0];
      if (!xfrm) continue;
      const off = xfrm.getElementsByTagNameNS(NS_A, 'off')[0];
      const ext = xfrm.getElementsByTagNameNS(NS_A, 'ext')[0];
      if (!off || !ext) continue;
      const x = Math.max(0, Math.round(+off.getAttribute('x') * scX));
      const y = Math.max(0, Math.round(+off.getAttribute('y') * scY));
      const w = Math.max(24, Math.round(+ext.getAttribute('cx') * scX));
      const h = Math.max(24, Math.round(+ext.getAttribute('cy') * scY));

      if (sp.localName === 'pic') {
        const blip = sp.getElementsByTagNameNS(NS_A, 'blip')[0];
        const embed = blip?.getAttributeNS(NS_R, 'embed') || blip?.getAttribute('r:embed');
        const src = embed && mediaMap[embed];
        if (src) {
          els.push({
            id: `${idBase}${++n}`,
            type: 'image',
            x,
            y,
            w,
            h,
            src,
            rot: 0,
            anims: [],
            _pptxId: nvId(sp),
          });
        }
        continue;
      }

      const txBody =
        sp.getElementsByTagNameNS(NS_P, 'txBody')[0] || sp.getElementsByTagNameNS(NS_A, 'txBody')[0];
      const spPr =
        sp.getElementsByTagNameNS(NS_P, 'spPr')[0] || sp.getElementsByTagNameNS(NS_A, 'spPr')[0];
      const prst = spPr?.getElementsByTagNameNS(NS_A, 'prstGeom')[0]?.getAttribute('prst') || '';
      const txBox = sp.getElementsByTagNameNS(NS_P, 'cNvSpPr')[0]?.getAttribute('txBox') === '1';
      const noFill = !!(spPr && spPr.getElementsByTagNameNS(NS_A, 'noFill')[0]);
      // Extract text from any shape with txBody — not just explicit txBox='1'
      if (txBody) {
        const { html, fs, color, align } = textFromTxBody(txBody, theme, defText);
        const plainText = html ? html.replace(/<[^>]+>/g, '').trim() : '';
        if (plainText) {
          // Treat as text element if it's a text box or a shape with no visible fill
          const isTextLike = txBox || noFill || (!prst) || prst === 'rect' || prst === 'roundRect';
          if (isTextLike) {
            // Detect text block background fill from shape
            let textBg = '';
            if (!noFill) {
              const solidFill = spPr?.getElementsByTagNameNS(NS_A, 'solidFill')[0];
              if (solidFill) {
                const fc = colorFromSolidFill(solidFill, theme);
                if (fc) textBg = fc;
              }
            }
            const el = {
              id: `${idBase}${++n}`,
              type: 'text',
              x,
              y,
              w,
              h,
              html,
              text: html.replace(/<[^>]+>/g, ''),
              cs: `font-size:${fs}px;color:${color};text-align:${align};`,
              textColor: color,
              textColorScheme: null,
              rot: 0,
              anims: [],
              _pptxId: nvId(sp),
            };
            if (textBg) el.textBg = textBg;
            els.push(el);
            continue;
          }
        }
      }
    } catch (e) {}
  }

  const tables = parseTables(doc, scX, scY, idBase, n, theme);
  n = tables.n;
  els.push(...tables.els);

  const pure = parsePureShapes(doc, scX, scY, idBase, n, theme);
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

  for (const el of els) delete el._pptxId;
  return { els, ink, inkFills, connectors };
}

async function mediaFromRels(zip, slidePath, relsPath) {
  const map = {};
  try {
    const relsXml = await zip.file(relsPath)?.async('string');
    if (!relsXml) return map;
    const doc = new DOMParser().parseFromString(relsXml, 'application/xml');
    const rels = [...doc.getElementsByTagName('Relationship')];
    const base = slidePath.replace(/[^/]+$/, '');
    for (const r of rels) {
      const id = r.getAttribute('Id');
      const target = r.getAttribute('Target');
      const type = r.getAttribute('Type') || '';
      if (!id || !target || !/image/i.test(type)) continue;
      let mediaPath = target.replace(/^\.\.\//, 'ppt/');
      if (!mediaPath.startsWith('ppt/')) {
        mediaPath = base.replace(/slides\/$/, '') + target.replace(/^\//, '');
        if (target.startsWith('../')) mediaPath = 'ppt/' + target.replace(/^\.\.\//, '');
      }
      const f = zip.file(mediaPath) || zip.file(decodeURIComponent(mediaPath));
      if (!f) continue;
      const buf = await f.async('base64');
      const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
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
      map[id] = `data:${mime};base64,${buf}`;
    }
  } catch (e) {}
  return map;
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
    const mediaMap = await mediaFromRels(zip, path, relsPath);
    const doc = parser.parseFromString(xml, 'application/xml');
    let bgc = '#1e293b';
    let bgImgData = null;
    try {
      const slideBg = await pptxSlideBgChain(zip, path, doc, theme, parser, NS_P, NS_A, NS_R);
      if (slideBg) bgc = slideBg;
      // Check for background image
      bgImgData = pptxExtractBgImage(doc, mediaMap, NS_P, NS_A, NS_R);
    } catch (e) {}
    const parsed = parseSlideXml(xml, slideW, slideH, canvasW, canvasH, mediaMap, `e${i}_`, theme, bgc);
    const els = parsed.els || parsed;

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

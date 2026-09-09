/**
 * Auto-layout port of v7.1 33b-autoplace: overflow split, multi-slide, keep-theme place.
 */

import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';
import { fitTextsOnSlide } from './textFit.js';
import { THEMES, getTheme, resolveSchemeColor, stripInlineTextColors } from './themes.js';
import { applyCsProp } from './fonts.js';
import { getLayouts } from './layouts.js';

function isDecor(el) {
  return !!(el && el._isDecor);
}

function fontSizePx(el) {
  const m = String(el?.cs || '').match(/font-size\s*:\s*([\d.]+)/i);
  if (m) return +m[1];
  return el && el._origFs ? +el._origFs : 0;
}

function plainText(el) {
  if (!el) return '';
  const html = String(el.html || el.text || '');
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escHtml(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function uid(prefix = 'e') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** v7.1: remember imported text size so autoplace / fit can restore it. */
export function stampOrigFs(slides) {
  (slides || []).forEach((s) => {
    (s.els || []).forEach((el) => {
      if (!el || el.type !== 'text' || el._origFs) return;
      const m = String(el.cs || '').match(/font-size\s*:\s*([\d.]+)/i);
      if (m) el._origFs = +m[1];
    });
  });
}

function isHeading(el) {
  if (!el || el.type !== 'text') return false;
  if (el.textRole === 'heading' || el.textRole === 'title') return true;
  return fontSizePx(el) >= 36;
}

function wordCount(el) {
  const p = plainText(el).trim();
  return p ? p.split(/\s+/).filter(Boolean).length : 0;
}

function applyHeadingStyle(el, fs, noUppercase, theme) {
  const headScheme = { col: 0, row: 2 };
  const resolved = resolveSchemeColor(headScheme, theme) || '#ffffff';
  let cs = el.cs || '';
  cs = applyCsProp(cs, 'font-size', `${fs}px`);
  cs = applyCsProp(cs, 'font-weight', '700');
  cs = applyCsProp(cs, 'text-transform', noUppercase ? null : 'uppercase');
  cs = applyCsProp(cs, 'color', resolved);
  el.cs = cs;
  el.textRole = 'heading';
  el.textColor = resolved;
  el.textColorScheme = headScheme;
  delete el.textColorGrad;
  delete el.textColorGrad1;
  delete el.textColorGrad2;
  delete el.textColorGradDir;
  if (el.html) el.html = stripInlineTextColors(el.html);
}

/** v7.1 _apHeading subset: one heading from roles, top short text, or largest font. */
function pickHeading(texts, H) {
  const list = (texts || []).filter((e) => e && e.type === 'text');
  if (!list.length) return null;
  const byY = [...list].sort((a, b) => (a.y || 0) - (b.y || 0));
  if (byY.length === 1) {
    const el = byY[0];
    if (el.textRole === 'body' || el.textRole === 'subtitle') return null;
    return el;
  }
  const explicitHead = byY.find((e) => e.textRole === 'title' || e.textRole === 'heading');
  if (explicitHead) return explicitHead;
  for (const el of byY) {
    if (el.textRole === 'body' || el.textRole === 'subtitle') continue;
    const n = wordCount(el);
    if ((el.y || 0) < H * 0.35 && n >= 1 && n <= 8) return el;
  }
  const byFs = [...byY].sort((a, b) => fontSizePx(b) - fontSizePx(a));
  for (const el of byFs) {
    if (wordCount(el) <= 12) return el;
  }
  return isHeading(byFs[0]) ? byFs[0] : byY[0];
}

function isCaption(el, nImages) {
  if (!el || el.type !== 'text') return false;
  if (el.textRole === 'heading' || el.textRole === 'title') return false;
  if (el.textRole === 'caption') return true;
  if (!nImages) return false;
  const plain = plainText(el);
  const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
  const fs = fontSizePx(el) || 24;
  if (words <= 0) return false;
  if (words <= 14 && plain.length <= 90) return true;
  if (fs <= 18 && words <= 22 && plain.length <= 120) return true;
  return false;
}

function isVisual(el) {
  return el && (el.type === 'image' || el.type === 'shape' || el.type === 'icon' || el.type === 'svg' || el.type === 'formula' || el.type === 'graph');
}

/** v7.1 default cell size for formula / chem / logic / graph. */
function visualDefaults(el, zw, zh) {
  if (el.type === 'formula') return { w: Math.min(zw, 420), h: Math.min(zh, Math.round(Math.min(zw, 420) * 0.35)) };
  if (el.type === 'graph' && el.graphKind === 'logic') return { w: Math.min(zw, 520), h: Math.min(zh, Math.round(Math.min(zw, 520) * 0.62)) };
  if (el.type === 'graph' && el.graphKind === 'chem') return { w: Math.min(zw, 360), h: Math.min(zh, Math.round(Math.min(zw, 360) * 0.95)) };
  if (el.type === 'graph') return { w: Math.min(zw, 480), h: Math.min(zh, Math.round(Math.min(zw, 480) * 0.7)) };
  return { w: zw, h: zh };
}

/** v7.1: keep aspect, center in the cell; use defaults if the box is tiny. */
function fitVisual(el, zx, zy, zw, zh) {
  let ow = el.w || 0;
  let oh = el.h || 0;
  if (ow < 20 || oh < 20) {
    const d = visualDefaults(el, zw, zh);
    ow = d.w;
    oh = d.h;
  }
  if (ow <= zw && oh <= zh) {
    el.w = Math.round(ow);
    el.h = Math.round(oh);
  } else {
    const sc = Math.min(zw / ow, zh / oh);
    el.w = Math.round(ow * sc);
    el.h = Math.round(oh * sc);
  }
  el.x = Math.round(zx + (zw - el.w) / 2);
  el.y = Math.round(zy + (zh - el.h) / 2);
}

function fixTypo(el) {
  if (!el || !el.html) return;
  el.html = String(el.html).replace(/(>[^<]*)/g, (chunk) => {
    if (chunk.startsWith('><') || chunk === '>') return chunk;
    return chunk
      .replace(/  +/g, ' ')
      .replace(/ +([,;:!?])/g, '$1')
      .replace(/([,;:])([^\s\d"'»)\]\n])/g, '$1 $2')
      .replace(/\s+-\s+/g, ' — ')
      .replace(/\s+–\s+/g, ' — ')
      .replace(/\.{3}/g, '…');
  });
}

function isTable(el) {
  return el && el.type === 'table';
}

function dist(a, b) {
  const ax = (a.x || 0) + (a.w || 0) / 2;
  const ay = (a.y || 0) + (a.h || 0) / 2;
  const bx = (b.x || 0) + (b.w || 0) / 2;
  const by = (b.y || 0) + (b.h || 0) / 2;
  return Math.hypot(ax - bx, ay - by);
}

/** Pair each image with nearest caption (legacy _apPairCaptions subset). */
export function pairCaptions(images, captions) {
  const used = new Set();
  const pairs = [];
  const maxD = 420;
  (images || []).forEach((img) => {
    let best = null;
    let bestD = Infinity;
    (captions || []).forEach((cap) => {
      if (used.has(cap)) return;
      const d = dist(img, cap);
      if (d < bestD) {
        bestD = d;
        best = cap;
      }
    });
    if (best && bestD < maxD) {
      used.add(best);
      pairs.push({ img, caption: best });
    } else {
      pairs.push({ img, caption: null });
    }
  });
  return {
    pairs,
    orphanCaptions: (captions || []).filter((c) => !used.has(c)),
  };
}

function putCaption(cap, x, y, w, h) {
  if (!cap) return;
  cap.x = x;
  cap.y = y;
  cap.w = w;
  cap.h = Math.max(24, h);
  cap.textRole = 'caption';
  if (cap.cs) {
    cap.cs = cap.cs.replace(/text-align\s*:\s*[^;]+;?/gi, '');
    cap.cs = cap.cs.replace(/font-size\s*:\s*[^;]+;?/gi, '');
    cap.cs += 'text-align:center;font-size:14px;';
  } else {
    cap.cs = 'font-size:14px;text-align:center;color:#ffffff;';
  }
}

function layoutGridWithCaptions(pairs, ax, ay, aw, ah, gap) {
  const n = pairs.length;
  if (!n) return;
  let cols = 1;
  let rows = n;
  if (n === 2) {
    cols = 2;
    rows = 1;
  } else if (n <= 4) {
    cols = 2;
    rows = Math.ceil(n / 2);
  } else if (n <= 6) {
    cols = 3;
    rows = 2;
  } else {
    cols = 3;
    rows = Math.ceil(n / 3);
  }
  const cW = Math.floor((aw - gap * (cols - 1)) / cols);
  const cH = Math.floor((ah - gap * (rows - 1)) / rows);
  pairs.forEach((pair, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const zx = ax + col * (cW + gap);
    const zy = ay + row * (cH + gap);
    const capH = pair.caption ? Math.max(26, Math.round(cH * 0.22)) : 0;
    const imgH = cH - capH - (pair.caption ? Math.round(gap * 0.4) : 0);
    pair.img.x = zx;
    pair.img.y = zy;
    pair.img.w = cW;
    pair.img.h = Math.max(40, imgH);
    if (pair.caption) putCaption(pair.caption, zx, zy + imgH + Math.round(gap * 0.4), cW, capH);
  });
}

/**
 * @param {object} slide
 * @param {{ canvasW:number, canvasH:number }} opts
 * @returns {object} mutated clone of slide (els only)
 */
export function autoPlaceSlide(slide, opts) {
  const W = opts.canvasW || DEFAULT_CANVAS_W;
  const H = opts.canvasH || DEFAULT_CANVAS_H;
  const align = opts.align === 'center' || opts.align === 'right' ? opts.align : 'left';
  const PAD = 66;
  const GAP = 24;
  const els = JSON.parse(JSON.stringify(slide?.els || []));
  const decor = els.filter(isDecor);
  const content = els.filter((e) => !isDecor(e));
  if (!content.length) return { ...slide, els };
  content.forEach((el) => {
    if (el.type === 'text') fixTypo(el);
  });

  const tables = content.filter(isTable);
  const images = content.filter((e) => e.type === 'image');
  const otherVisuals = content.filter((e) => isVisual(e) && e.type !== 'image');
  const captions = content.filter((e) => isCaption(e, images.length));
  const head = pickHeading(
    content.filter((e) => e.type === 'text' && !captions.includes(e)),
    H
  );
  const headings = head ? [head] : [];
  const bodies = content.filter(
    (e) => e !== head && !isVisual(e) && !isTable(e) && !captions.includes(e)
  );

  let y = PAD;
  const contentW = W - PAD * 2;

  headings.forEach((el, i) => {
    el.x = PAD;
    el.y = y;
    el.w = contentW;
    el.h = Math.max(el.h || 60, i === 0 ? 72 : 56);
    el.cs = String(el.cs || '').replace(/text-align\s*:\s*[^;]+;?/gi, '');
    el.cs = (el.cs ? el.cs.replace(/;?$/, ';') : '') + `text-align:${align};`;
    applyHeadingStyle(el, opts.isTitle ? 50 : 40, !!opts.isTitle, opts.theme);
    y += el.h + GAP;
  });

  const { pairs, orphanCaptions } = pairCaptions(images, captions);
  const hasCaptionPairs = pairs.some((p) => p.caption);
  const visuals = [...images, ...otherVisuals];

  if (hasCaptionPairs && !bodies.length && !otherVisuals.length) {
    const areaH = Math.max(160, H - PAD - y);
    layoutGridWithCaptions(pairs, PAD, y, contentW, areaH, GAP);
    orphanCaptions.forEach((cap, i) => {
      putCaption(cap, PAD, H - PAD - 40 - i * 36, contentW, 32);
    });
  } else if (tables.length && !visuals.length && !bodies.length) {
    tables.forEach((el) => {
      el.x = PAD;
      el.y = y;
      el.w = contentW;
      el.h = Math.min(H - PAD - y, Math.max(el.h || 200, 180));
      y += el.h + GAP;
    });
  } else if (visuals.length && bodies.length) {
    const leftW = Math.round(contentW * 0.48);
    const rightW = contentW - leftW - GAP;
    const areaH = Math.max(160, H - PAD - y);
    bodies.forEach((el, i) => {
      el.x = PAD;
      el.y = y + i * (areaH / Math.max(bodies.length, 1) + GAP * 0.2);
      el.w = leftW;
      el.h = Math.max(80, Math.floor(areaH / bodies.length) - GAP);
    });
    if (hasCaptionPairs && !otherVisuals.length) {
      layoutGridWithCaptions(pairs, PAD + leftW + GAP, y, rightW, areaH, GAP);
    } else {
      const cols = Math.min(2, visuals.length);
      const cellW = Math.floor((rightW - GAP * (cols - 1)) / cols);
      const rows = Math.ceil(visuals.length / cols);
      const cellH = Math.floor((areaH - GAP * (rows - 1)) / rows);
      visuals.forEach((el, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        fitVisual(el, PAD + leftW + GAP + c * (cellW + GAP), y + r * (cellH + GAP), cellW, cellH);
      });
      captions.forEach((cap, i) => {
        putCaption(cap, PAD, H - PAD - 36 - i * 28, contentW, 28);
      });
    }
    tables.forEach((el) => {
      el.x = PAD;
      el.y = H - PAD - 160;
      el.w = contentW;
      el.h = 140;
    });
  } else if (visuals.length) {
    if (hasCaptionPairs && !otherVisuals.length) {
      const areaH = Math.max(160, H - PAD - y);
      layoutGridWithCaptions(pairs, PAD, y, contentW, areaH, GAP);
      orphanCaptions.forEach((cap, i) => {
        putCaption(cap, PAD, H - PAD - 40 - i * 36, contentW, 32);
      });
    } else {
      const cols = Math.min(3, visuals.length);
      const rows = Math.ceil(visuals.length / cols);
      const areaH = Math.max(160, H - PAD - y);
      const cellW = Math.floor((contentW - GAP * (cols - 1)) / cols);
      const cellH = Math.floor((areaH - GAP * (rows - 1)) / rows);
      visuals.forEach((el, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        fitVisual(el, PAD + c * (cellW + GAP), y + r * (cellH + GAP), cellW, cellH);
      });
      captions.forEach((cap, i) => {
        putCaption(cap, PAD, H - PAD - 36 - i * 28, contentW, 28);
      });
    }
  } else {
    bodies.forEach((el) => {
      el.x = PAD;
      el.y = y;
      el.w = contentW;
      el.h = Math.min(Math.max(el.h || 120, 100), H - PAD - y);
      y += el.h + GAP;
    });
    captions.forEach((cap) => {
      putCaption(cap, PAD, y, contentW, 36);
      y += 44;
    });
    tables.forEach((el) => {
      el.x = PAD;
      el.y = Math.min(y, H - PAD - 160);
      el.w = contentW;
      el.h = 160;
    });
  }

  return { ...slide, els: decor.concat(content) };
}

function detectAlign(slideList) {
  const counts = { center: 0, left: 0, right: 0 };
  (slideList || []).forEach((s) => {
    (s.els || [])
      .filter((e) => e && !e._isDecor && e.type === 'text')
      .forEach((el) => {
        const m = String(el.cs || '').match(/text-align\s*:\s*(\w+)/i);
        if (m && counts[m[1]] != null) counts[m[1]]++;
      });
  });
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : 'left';
}

function chunkText(text, chunkSize) {
  const paras = String(text || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks = [];
  let cur = '';
  const flush = () => {
    if (cur.trim()) {
      chunks.push(cur.trim());
      cur = '';
    }
  };
  paras.forEach((p) => {
    if (p.length <= chunkSize) {
      if (cur && (cur + '\n\n' + p).length <= chunkSize) cur += '\n\n' + p;
      else {
        flush();
        cur = p;
      }
    } else {
      flush();
      const sents = p.match(/[^.!?…]+[.!?…]+(?:\s+|$)|[^.!?…]+$/g) || [p];
      sents.forEach((sent) => {
        const t = sent.trim();
        if (!t) return;
        if (cur && (cur + ' ' + t).length <= chunkSize) cur += ' ' + t;
        else {
          flush();
          cur = t;
        }
      });
    }
  });
  flush();
  return chunks.length ? chunks : [String(text || '')];
}

function textFromPlain(src, plain) {
  const el = JSON.parse(JSON.stringify(src));
  const parts = String(plain || '').split(/\n\n+/);
  el.html = parts.map((p) => '<div>' + escHtml(p).replace(/\n/g, '<br>') + '</div>').join('');
  delete el.text;
  el.textRole = 'body';
  el.id = uid('b');
  return el;
}

function cloneContinuation(s, decor) {
  return {
    title: s.title,
    name: s.name,
    bg: s.bg,
    bgc: s.bgc,
    bgScheme: s.bgScheme,
    ar: s.ar,
    trans: s.trans || null,
    transDur: s.transDur,
    auto: s.auto || 0,
    bgImg: s.bgImg ? JSON.parse(JSON.stringify(s.bgImg)) : null,
    els: (decor || []).map((d) => {
      const copy = JSON.parse(JSON.stringify(d));
      copy.id = uid('d');
      return copy;
    }),
    ink: [],
    inkFills: [],
    connectors: [],
    cameras: [],
    animOrder: [],
    _apTarget: !!s._apTarget,
  };
}

function stripApMeta(s) {
  if (!s) return s;
  const { _apTarget, ...rest } = s;
  return rest;
}

/** v7.1 _apSplitOverflowSlides: long body text → continuation slides. */
function splitOverflowSlides(slides, canvasH, limit, chunkSize, cur) {
  const out = [];
  let newCur = cur | 0;
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (!s._apTarget) {
      out.push(s);
      continue;
    }
    const decor = (s.els || []).filter(isDecor);
    const content = (s.els || []).filter((e) => !isDecor(e));
    const texts = content.filter((e) => e.type === 'text');
    const media = content.filter((e) => e.type !== 'text');
    if (!texts.length) {
      out.push(s);
      continue;
    }
    const head = pickHeading(texts, canvasH);
    const bodies = texts.filter((e) => e !== head);
    const bodyChars = bodies.reduce((n, e) => n + plainText(e).length, 0);
    if (bodyChars <= limit || !bodies.length) {
      out.push(s);
      continue;
    }
    const full = bodies.map((e) => plainText(e)).filter(Boolean).join('\n\n');
    const chunks = chunkText(full, chunkSize);
    if (chunks.length < 2) {
      out.push(s);
      continue;
    }
    const firstBody = textFromPlain(bodies[0], chunks[0]);
    s.els = [...decor, ...(head ? [head] : []), firstBody, ...media, ...bodies.slice(1)];
    out.push(s);
    if (i < cur) newCur += chunks.length - 1;
    for (let c = 1; c < chunks.length; c++) {
      const ns = cloneContinuation(s, decor);
      const id = uid('sp') + c;
      if (head) {
        const nh = JSON.parse(JSON.stringify(head));
        nh.id = id + 'h';
        const ht = plainText(head);
        nh.html = escHtml(
          chunks.length > 2 ? ht + ' (' + (c + 1) + '/' + chunks.length + ')' : ht + ' (продолжение)'
        );
        delete nh.text;
        nh.textRole = 'heading';
        ns.els.push(nh);
      }
      const nb = textFromPlain(bodies[0], chunks[c]);
      nb.id = id + 'b';
      ns.els.push(nb);
      out.push(ns);
    }
  }
  return { slides: out, cur: newCur };
}

/**
 * Place marked slides (overflow split first). Returns { slides, cur }.
 * @param {object[]} slides
 * @param {number[]} indices
 * @param {{ canvasW?:number, canvasH?:number, align?:string, cur?:number }} opts
 */
export function autoPlaceDeck(slides, indices, opts = {}) {
  const canvasW = opts.canvasW || DEFAULT_CANVAS_W;
  const canvasH = opts.canvasH || DEFAULT_CANVAS_H;
  const list = JSON.parse(JSON.stringify(slides || []));
  const uniq = [...new Set(indices || [])]
    .filter((i) => i >= 0 && i < list.length)
    .sort((a, b) => a - b);
  if (!uniq.length && list.length) uniq.push(0);
  list.forEach((s, i) => {
    s._apTarget = uniq.indexOf(i) >= 0;
  });
  const split = splitOverflowSlides(list, canvasH, 280, 200, opts.cur != null ? opts.cur : 0);
  const align = opts.align || detectAlign(split.slides.filter((s) => s && s._apTarget));
  const placed = split.slides.map((s, si) => {
    if (!s._apTarget) return stripApMeta(s);
    const done = autoPlaceSlide(s, {
      canvasW,
      canvasH,
      align,
      isTitle: si === 0,
      theme: opts.theme || getTheme(opts.themeIdx),
    });
    fitTextsOnSlide(done, { shrink: true });
    return stripApMeta(done);
  });
  return {
    slides: placed,
    cur: Math.max(0, Math.min(placed.length - 1, split.cur)),
  };
}

/** v7.1 openLayoutPreview: three random theme + layout + align combos. */
export function randomLayoutVariants(count = 3) {
  const nT = THEMES.length || 1;
  const layouts = getLayouts();
  const nL = layouts.length;
  const usedThemes = new Set();
  const usedLayouts = new Set();
  const variants = [];
  for (let i = 0; i < count; i++) {
    let tIdx = 0;
    let tries = 0;
    do {
      tIdx = Math.floor(Math.random() * nT);
      tries++;
    } while (usedThemes.has(tIdx) && tries < 20 && nT > 1);
    usedThemes.add(tIdx);
    let lIdx = -1;
    if (nL && Math.random() >= 0.3) {
      tries = 0;
      do {
        lIdx = Math.floor(Math.random() * nL);
        tries++;
      } while (usedLayouts.has(lIdx) && tries < 20 && nL > 1);
      usedLayouts.add(lIdx);
    }
    variants.push({ tIdx, lIdx, align: ['center', 'left', 'right'][i % 3] });
  }
  return variants;
}

/** Simplified 240×135 mock used by v7.1 layout preview cards. */
export function layoutVariantPreviewSvg(theme) {
  const w = 240;
  const h = 135;
  const bg = theme?.dark ? theme.bg || '#1e1b4b' : theme?.bg || '#f8fafc';
  const ac = theme?.ac1 || '#6366f1';
  const solidBg = String(bg).includes('gradient') ? (theme?.dark ? '#1a1a2e' : '#f0f4ff') : bg;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="${solidBg}" rx="6"/>
    <rect x="16" y="14" width="${w * 0.55}" height="12" rx="3" fill="${ac}" opacity="0.9"/>
    <rect x="16" y="34" width="${w * 0.45}" height="7" rx="2" fill="${ac}" opacity="0.4"/>
    <rect x="16" y="49" width="${w * 0.48}" height="6" rx="2" fill="${ac}" opacity="0.25"/>
    <rect x="16" y="59" width="${w * 0.38}" height="6" rx="2" fill="${ac}" opacity="0.2"/>
    <rect x="16" y="69" width="${w * 0.43}" height="6" rx="2" fill="${ac}" opacity="0.2"/>
    <rect x="${w * 0.62}" y="32" width="${w * 0.3}" height="${h * 0.5}" rx="4" fill="${ac}" opacity="0.18"/>
    <rect x="16" y="${h - 22}" width="${w - 32}" height="1" fill="${ac}" opacity="0.15"/>
    <rect x="${w * 0.62 + 6}" y="${h - 16}" width="40" height="6" rx="2" fill="${ac}" opacity="0.3"/>
  </svg>`;
}

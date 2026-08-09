// ══════════════ RICH TEXT ENGINE v3 ══════════════

let _rtEl        = null;
let _rtColorPickInProgress = false;
let _rtElId      = null;
let _savedSelIdx = null;

const _RT_MARKER_BULLET_VA = '-0.2em';
const _RT_MARKER_NUM_VA = '0';
const _RT_MARKER_GAP_DEFAULT = 10;
window._RT_MARKER_BULLET_VA = _RT_MARKER_BULLET_VA;
window._RT_MARKER_NUM_VA = _RT_MARKER_NUM_VA;

function _rtMarkerGapPx(explicit, rootEl) {
  if (explicit != null && !isNaN(+explicit)) return Math.max(0, +explicit);
  if (typeof sel !== 'undefined' && sel && sel.dataset.bulletGap != null) return Math.max(0, +sel.dataset.bulletGap);
  const wrap = rootEl && rootEl.closest && rootEl.closest('.el');
  if (wrap && wrap.dataset.bulletGap != null) return Math.max(0, +wrap.dataset.bulletGap);
  return _RT_MARKER_GAP_DEFAULT;
}

function _rtMarkerBulletCss(gapPx, rootEl) {
  const g = _rtMarkerGapPx(gapPx, rootEl);
  return 'display:inline-flex;align-items:center;margin-right:' + g + 'px;cursor:pointer;user-select:none;vertical-align:' + _RT_MARKER_BULLET_VA;
}

function _rtMarkerNumCss(gapPx, rootEl, color) {
  const g = _rtMarkerGapPx(gapPx, rootEl);
  const numColorStyle = color ? ';color:' + color : '';
  return 'display:inline-block;margin-right:' + g + 'px;min-width:1.2em;font-variant-numeric:tabular-nums;user-select:none;vertical-align:' + _RT_MARKER_NUM_VA + numColorStyle;
}

function _rtLineFontSizeForMarker(markerSpan, baseFs) {
  baseFs = baseFs || 24;
  let n = markerSpan.nextSibling;
  while (n) {
    if (n.nodeType === 3) {
      if (n.textContent && n.textContent.trim()) return baseFs;
      n = n.nextSibling;
      continue;
    }
    if (n.nodeType !== 1) { n = n.nextSibling; continue; }
    if (n.hasAttribute('data-list-bullet') || n.hasAttribute('data-list-num')) return baseFs;
    if (n.tagName === 'BR') return baseFs;
    const fs = parseFloat(n.style.fontSize);
    if (fs && !isNaN(fs)) return fs;
    if (n.hasAttribute('data-ch')) return baseFs;
    const inner = n.querySelector && n.querySelector('span[data-ch]');
    if (inner) {
      const ifs = parseFloat(inner.style.fontSize);
      if (ifs && !isNaN(ifs)) return ifs;
    }
    if ((n.textContent || '').trim()) return baseFs;
    n = n.nextSibling;
  }
  return baseFs;
}

function _rtApplyMarkerVerticalAlign(root, baseFs, gapPx) {
  if (!root) return;
  baseFs = baseFs || _lastBulletFontSize || 24;
  const gap = _rtMarkerGapPx(gapPx, root);
  root.querySelectorAll('span[data-list-bullet]').forEach(sp => {
    const lineFs = _rtLineFontSizeForMarker(sp, baseFs);
    const sz = Math.round(lineFs);
    sp.style.fontSize = sz + 'px';
    sp.style.lineHeight = '1';
    sp.style.verticalAlign = _RT_MARKER_BULLET_VA;
    sp.style.marginRight = gap + 'px';
    sp.style.transform = 'translateY(' + Math.max(1, Math.round(lineFs * 0.06)) + 'px)';
    const iconId = sp.getAttribute('data-icon-id');
    if (iconId && typeof _getBulletSvg === 'function') {
      const iconStyle = sp.getAttribute('data-icon-style') || 'stroke';
      const iconColor = sp.getAttribute('data-icon-color') || 'currentColor';
      const iconSw = parseFloat(sp.getAttribute('data-icon-sw')) || 1.8;
      sp.innerHTML = _getBulletSvg(iconId, sz, iconStyle, iconColor, iconSw);
    }
  });
  root.querySelectorAll('span[data-list-num]').forEach(sp => {
    const lineFs = _rtLineFontSizeForMarker(sp, baseFs);
    sp.style.fontSize = Math.round(lineFs) + 'px';
    sp.style.lineHeight = '1';
    sp.style.verticalAlign = _RT_MARKER_NUM_VA;
    sp.style.marginRight = gap + 'px';
    // Raise numbers to match text baseline, then nudge 3px down
    sp.style.transform = 'translateY(' + (-Math.max(1, Math.round(lineFs * 0.1)) + 3) + 'px)';
  });
}
window._rtApplyMarkerVerticalAlign = _rtApplyMarkerVerticalAlign;

// ─── HTML ↔ char-objects ──────────────────────────────────────────
// Rebuild a list marker span from saved data attributes
// (avoids relying on outerHTML which Chrome corrupts when contenteditable=true)
function _rebuildMarkerHtml(m) {
  if (m.type === 'bullet') {
    const svg = _getBulletSvg(m.iconId, _lastBulletFontSize || 24, m.iconStyle, m.iconColor, parseFloat(m.iconSw) || 1.8);
    const schemeAttr = m.iconSchemeRef ? ` data-icon-schemeref="${JSON.stringify(m.iconSchemeRef).replace(/"/g,'&quot;')}"` : '';
    return `<span data-list-bullet data-icon-id="${m.iconId}" data-icon-style="${m.iconStyle}" data-icon-color="${m.iconColor}" data-icon-sw="${m.iconSw}"${schemeAttr} contenteditable="false" style="${_rtMarkerBulletCss(null, null)}" onclick="rtChangeBulletIcon(this)">${svg}</span>`;
  } else {
    const schemeAttr = m.numSchemeRef ? ` data-num-schemeref="${JSON.stringify(m.numSchemeRef).replace(/"/g,'&quot;')}"` : '';
    return `<span data-list-num data-num-style="${m.numStyle || 'decimal'}" data-num-color="${m.color||''}"${schemeAttr} contenteditable="false" style="${_rtMarkerNumCss(null, null, m.color)}">${m.text}</span>`;
  }
}
let _lastBulletFontSize = 24;

function _rtFontSizeFromCs(cs) {
  const m = (cs || '').match(/font-size:\s*([\d.]+)px/);
  return m ? parseFloat(m[1]) : null;
}
window._rtFontSizeFromCs = _rtFontSizeFromCs;

function _rtApplyBulletFontSize(fontSizePx) {
  const fs = parseFloat(fontSizePx);
  if (!isNaN(fs) && fs > 0) _lastBulletFontSize = fs;
}

function _rtStyleSpansInTel(tel) {
  if (!tel) return [];
  return [...tel.querySelectorAll('span')].filter(sp =>
    !sp.hasAttribute('data-list-bullet') &&
    !sp.hasAttribute('data-list-num') &&
    !sp.hasAttribute('data-br-anchor') &&
    // Ударение — вложенный span без собственных метрик; иначе normalize ставит
    // baseFs и буква с ударением становится меньше соседних.
    !(sp.dataset && (sp.dataset.stress === '1' || sp.dataset.stress === 'true'))
  );
}

function _rtAppendInlineMetrics(css, style) {
  let out = css || '';
  const va = style && style.verticalAlign;
  if (va !== 'super' && va !== 'sub' && !/vertical-align\s*:/i.test(out)) {
    out += (out ? ';' : '') + 'vertical-align:baseline';
  }
  if (!/line-height\s*:/i.test(out)) {
    out += (out ? ';' : '') + 'line-height:1.25';
  }
  return out;
}

/** Fix line box / valign when container font-size differs from per-span sizes (preview, editor view). */
function _rtNormalizeTextDisplay(tel, cs, gapPx) {
  if (!tel) return;
  const baseFs = _rtFontSizeFromCs(cs) || _lastBulletFontSize || 24;
  const spans = _rtStyleSpansInTel(tel);
  const hasMarkers = tel.querySelector('span[data-list-bullet], span[data-list-num]');

  if (spans.length) {
    const usedSizes = new Set();
    spans.forEach(sp => {
      let fs = parseFloat(sp.style.fontSize);
      if (!fs || isNaN(fs)) {
        sp.style.fontSize = baseFs + 'px';
        fs = baseFs;
      }
      usedSizes.add(Math.round(fs));
      const va = sp.style.verticalAlign;
      if (va !== 'super' && va !== 'sub' && !va) sp.style.verticalAlign = 'baseline';
      if (!sp.style.lineHeight) sp.style.lineHeight = '1.25';
    });
    // Сбросить ошибочный font-size на вложенных [data-stress] (раньше normalize его проставлял)
    tel.querySelectorAll('[data-stress]').forEach(sp => {
      if (sp.style && sp.style.fontSize) sp.style.fontSize = '';
      if (sp.style && sp.style.lineHeight) sp.style.lineHeight = '';
      if (sp.style && sp.style.verticalAlign) sp.style.verticalAlign = '';
    });

    const needsZeroStrut = usedSizes.size > 1 ||
      (usedSizes.size === 1 && Math.round(baseFs) !== [...usedSizes][0]);
    if (needsZeroStrut) {
      tel.style.fontSize = '0';
      tel.style.lineHeight = '0';
      // Bare <br> elements (representing blank lines with no text of their
      // own) have no span to carry a font-size, so once the container's
      // font-size is zeroed, blank lines collapse to 0 height — Enter
      // presses appear to do nothing. Give each bare <br> a zero-width
      // strut span sized like the surrounding text so blank lines keep
      // their visual height.
      tel.querySelectorAll('br').forEach(br => {
        const next = br.nextSibling;
        const isBareBlankLine =
          !next ||
          (next.nodeType === 1 && next.tagName === 'BR') ||
          (next.nodeType === 3 && !next.textContent.trim());
        if (!isBareBlankLine) return;
        if (br.previousSibling && br.previousSibling.nodeType === 1 &&
            br.previousSibling.classList && br.previousSibling.classList.contains('_rt-blank-strut')) return;
        let prevSpan = br.previousElementSibling;
        while (prevSpan && (prevSpan.tagName === 'BR' || !prevSpan.style || !parseFloat(prevSpan.style.fontSize))) {
          prevSpan = prevSpan.previousElementSibling;
        }
        const strutFs = (prevSpan && parseFloat(prevSpan.style.fontSize)) || baseFs;
        const strutLh = (prevSpan && prevSpan.style.lineHeight) || '1.25';
        const strut = document.createElement('span');
        strut.className = '_rt-blank-strut';
        strut.setAttribute('data-br-anchor', '');
        strut.style.cssText = `display:inline-block;width:100%;font-size:${strutFs}px;line-height:${strutLh};vertical-align:baseline`;
        strut.textContent = '\u200b';
        br.parentNode.insertBefore(strut, br.nextSibling);
      });
    } else {
      tel.querySelectorAll('span._rt-blank-strut').forEach(s => s.remove());
    }
  }

  if (hasMarkers) _rtApplyMarkerVerticalAlign(tel, baseFs, gapPx);
}
window._rtNormalizeTextDisplay = _rtNormalizeTextDisplay;

// ─── Character counter badge (shown only while the text block is selected in the editor) ──
function _rtUpdateCharCounter(elWrap, telOrEc) {
  if (!elWrap) return;
  const badge = elWrap.querySelector('.char-counter');
  if (!badge) return;
  const root = (typeof _rtContent === 'function' && telOrEc) ? _rtContent(telOrEc) : telOrEc;
  if (!root) return;
  const chars = _toCharObjs(root.innerHTML);
  let count = 0;
  for (const c of chars) {
    if (c.ch === '\n' || c.ch === '\x00' || c.ch === '\u200b') continue; // breaks / markers / blank-line struts
    if (!/[\p{L}\p{N}]/u.test(c.ch)) continue; // skip spaces, punctuation, symbols — letters & digits only
    count++;
  }
  badge.textContent = count + ' с.';
}
window._rtUpdateCharCounter = _rtUpdateCharCounter;

function _toCharObjs(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const out = [];
  // Block-level tags that represent line breaks
  const _block = new Set(['div','p','li','tr','h1','h2','h3','h4','h5','h6']);
  function walk(node, inh, isFirstChild) {
    if (node.nodeType === 3) {
      for (const ch of node.textContent)
        out.push({ ch, style: Object.assign({}, inh) });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') { out.push({ ch: '\n', style: Object.assign({}, inh) }); return; }
    // Skip caret anchor spans (legacy) but preserve any text typed inside them
    if (node.hasAttribute('data-br-anchor')) {
      for (const child of node.childNodes) {
        if (child.nodeType === 3 && !child.textContent.replace(/\u200B/g, '')) continue;
        walk(child, inh, false);
      }
      return;
    }
    // Preserve list markers as opaque data — do NOT walk into them
    // Note: we save attributes, NOT outerHTML, because Chrome strips contenteditable="false"
    // from outerHTML of child elements when parent has contenteditable="true"
    if (node.hasAttribute('data-list-bullet')) {
      const iconSchemeRef = node.getAttribute('data-icon-schemeref');
      out.push({ ch: '\x00', _listMarker: {
        type: 'bullet',
        iconId:    node.getAttribute('data-icon-id') || '',
        iconStyle: node.getAttribute('data-icon-style') || 'stroke',
        iconColor: node.getAttribute('data-icon-color') || 'currentColor',
        iconSw:    node.getAttribute('data-icon-sw') || '1.8',
        iconSchemeRef: iconSchemeRef ? (() => { try { return JSON.parse(iconSchemeRef); } catch(e) { return null; } })() : null,
      }, style: {} });
      return;
    }
    if (node.hasAttribute('data-list-num')) {
      const numColor = node.style.color || node.getAttribute('data-num-color') || '';
      const numSchemeRaw = node.getAttribute('data-num-schemeref');
      out.push({ ch: '\x00', _listMarker: {
        type: 'num',
        text: node.textContent || '',
        color: numColor,
        numStyle: node.getAttribute('data-num-style') || 'decimal',
        numSchemeRef: numSchemeRaw ? (() => { try { return JSON.parse(numSchemeRaw); } catch(e) { return null; } })() : null,
      }, style: {} });
      return;
    }
    const m = Object.assign({}, inh);
    const raw = node.getAttribute('style') || '';
    raw.split(';').forEach(part => {
      const ci = part.indexOf(':');
      if (ci < 0) return;
      let k = part.slice(0, ci).trim();
      const v = part.slice(ci + 1).trim();
      if (!k || !v || k === 'display') return;
      k = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      m[k] = v;
    });
    if (tag==='b'||tag==='strong') m.fontWeight='700';
    if (tag==='i'||tag==='em')     m.fontStyle='italic';
    if (tag==='u')                 m._ul = 'underline';
    if (tag==='sup')               m.verticalAlign='super';
    if (tag==='sub')               m.verticalAlign='sub';
    // Restore per-char schemeRef from data-scheme attribute
    if(node.dataset && node.dataset.scheme){
      try{ m._schemeRef=JSON.parse(node.dataset.scheme); }catch(e){}
    } else {
      delete m._schemeRef;
    }
    if (node.dataset && node.dataset.ul) {
      m._ul = _rtParseUnderline(node.dataset.ul);
      _rtClearUlPaint(m);
    } else if (m.textDecoration) {
      const ul = _rtParseUnderline(m.textDecoration);
      if (ul !== 'none') m._ul = ul;
      _rtClearUlPaint(m);
    } else if (/repeating-linear-gradient|radial-gradient/i.test(m.backgroundImage || '')) {
      // Legacy dash-dot stored only as background paint
      m._ul = 'underline dash-dot';
      _rtClearUlPaint(m);
    }
    // Stress on letter wrap (accent via CSS ::after). Legacy mark-only sibling also OK.
    if (node.dataset && (node.dataset.stress === '1' || node.dataset.stress === 'true')) {
      const raw = node.textContent || '';
      const markOnly = !/\p{L}/u.test(raw) && /[\u00B4\u02CA\u02B9\u0301]/.test(raw);
      if (markOnly) {
        if (out.length) {
          const prev = out[out.length - 1];
          prev.style = Object.assign({}, prev.style, { _stress: true });
        }
        return;
      }
      m._stress = true;
      // Метрики только от родителя — свои font-size на обёртке ударения игнорируем
      // (раньше delete m.fontSize снимал и унаследованный размер → буква становилась другой)
      if (inh.fontSize) m.fontSize = inh.fontSize;
      else delete m.fontSize;
      if (inh.lineHeight) m.lineHeight = inh.lineHeight;
      else delete m.lineHeight;
      if (inh.verticalAlign && inh.verticalAlign !== 'super' && inh.verticalAlign !== 'sub') {
        m.verticalAlign = inh.verticalAlign;
      } else {
        delete m.verticalAlign;
      }
    }
    // Block elements: inject leading \n (except for first/only child)
    const isBlock = _block.has(tag);
    if (isBlock && !isFirstChild && out.length && out[out.length-1].ch !== '\n') {
      out.push({ ch: '\n', style: Object.assign({}, inh) });
    }
    const children = Array.from(node.childNodes);
    children.forEach((child, ci2) => walk(child, m, ci2 === 0));
    // After block: trailing \n only if next sibling exists and last char isn't already \n
    // (handled by next sibling's leading \n above)
  }
  Array.from(tmp.childNodes).forEach((child, ci2) => walk(child, {}, ci2 === 0));
  return _rtFoldCombiningStress(out);
}

/** Merge legacy combining acute (U+0301) into style._stress on the base letter.
 *  Keeps decorative fonts intact (combining marks force system-font fallback). */
function _rtFoldCombiningStress(chars) {
  if (!chars || !chars.length) return chars || [];
  const out = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c.ch === '\u0301' && out.length) {
      const prev = out[out.length - 1];
      if (prev && !prev._listMarker && prev.ch && /\p{L}/u.test(prev.ch) && !/[\u0300-\u036f]/.test(prev.ch)) {
        prev.style = Object.assign({}, prev.style, { _stress: true });
        continue;
      }
    }
    out.push(c);
  }
  return out;
}

function _rtUlDataValue(kind) {
  const k = _rtParseUnderline(kind);
  if (!k || k === 'none') return '';
  if (k === 'underline') return 'single';
  if (k === 'underline double') return 'double';
  if (k === 'underline wavy') return 'wavy';
  if (k === 'underline dashed') return 'dashed';
  if (k === 'underline dash-dot') return 'dash-dot';
  return '';
}

/** Inline CSS for underline kinds. Wavy/dashed use thin native decoration;
 *  dash-dot uses dash + circular dot backgrounds (no CSS dash-dot style). */
function _rtUlCss(kind) {
  const k = _rtParseUnderline(kind);
  const thin = 'text-decoration-thickness:1.25px;text-underline-offset:0.12em;text-decoration-skip-ink:none;';
  const clearBg = 'background-image:none;background-size:auto;background-position:0 0;background-repeat:no-repeat;padding-bottom:0;';
  if (!k || k === 'none') return 'text-decoration:none;' + clearBg;
  if (k === 'underline') return 'text-decoration:underline;' + thin + clearBg;
  if (k === 'underline double') return 'text-decoration:underline double;' + thin + clearBg;
  if (k === 'underline wavy') return 'text-decoration:underline wavy;' + thin + clearBg;
  // Dashed tends to sit a hair higher than solid in some browsers; keep same offset as solid
  if (k === 'underline dashed') {
    return 'text-decoration:underline dashed;text-decoration-thickness:1.25px;' +
      'text-underline-offset:0.12em;text-decoration-skip-ink:none;' + clearBg;
  }
  if (k === 'underline dash-dot') {
    // Paint is in css/styles.css ([data-ul="dash-dot"] + box-decoration-break).
    // Do not set background here — it would fight the stylesheet and break clone-per-line.
    return 'text-decoration:none;';
  }
  return '';
}

function _rtClearUlPaint(style) {
  if (!style) return;
  delete style.textDecoration;
  delete style.textDecorationLine;
  delete style.textDecorationStyle;
  delete style.textDecorationThickness;
  delete style.textDecorationColor;
  delete style.textUnderlineOffset;
  delete style.backgroundImage;
  delete style.backgroundSize;
  delete style.backgroundRepeat;
  delete style.backgroundPosition;
  delete style.backgroundOrigin;
  delete style.paddingBottom;
}

function _rtSetCharUl(style, kind) {
  if (!style) return;
  const k = _rtParseUnderline(kind);
  // Strip previous underline paint (esp. dash-dot backgrounds) so "none"
  // does not keep looking like dash-dot and stall the cycle.
  _rtClearUlPaint(style);
  if (!k || k === 'none') delete style._ul;
  else style._ul = k;
}

function _rtCharUl(style) {
  if (!style) return 'none';
  if (style._ul) return _rtParseUnderline(style._ul);
  return _rtParseUnderline(style.textDecoration || '');
}

function _rtStyleToCssText(style) {
  if (!style) return '';
  let css = Object.entries(style)
    .filter(([k]) => k !== 'display' && k !== '_schemeRef' && k !== '_ul' && k !== '_stress'
      && k !== 'textDecoration' && k !== 'textDecorationLine' && k !== 'textDecorationStyle'
      && k !== 'textDecorationThickness' && k !== 'textDecorationColor' && k !== 'textUnderlineOffset'
      && k !== 'backgroundImage' && k !== 'backgroundSize' && k !== 'backgroundRepeat'
      && k !== 'backgroundPosition' && k !== 'backgroundOrigin' && k !== 'paddingBottom')
    .map(([k, v]) => k.replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + v)
    .join(';');
  const ulKind = _rtCharUl(style);
  if (ulKind !== 'none') {
    const ulCss = _rtUlCss(ulKind);
    if (ulCss) css = css ? (css + ';' + ulCss) : ulCss;
  }
  return css;
}

/** Group key ignores _stress so underline runs stay one continuous span;
 *  accents are nested as inner [data-stress] spans. */
function _rtStyleGroupKey(style) {
  if (!style) return '{}';
  const o = Object.assign({}, style);
  delete o._stress;
  return JSON.stringify(o);
}

function _rtEscText(ch) {
  return String(ch).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Render char objects as HTML spans. Groups consecutive identical styles so
 *  wavy / dash-dot underlines stay continuous (not one jagged segment per glyph).
 *  Stress marks nest inside the underline span (do not split the run). */
function _renderCharSpans(chars, withDataCh) {
  const groups = [];
  let cur = null;
  for (const c of chars) {
    if (c._listMarker) { groups.push({ markerData: c._listMarker }); cur = null; continue; }
    if (c.ch === '\n') { groups.push({ br: true }); cur = null; continue; }
    const key = _rtStyleGroupKey(c.style);
    const stress = !!(c.style && c.style._stress);
    if (!cur || cur.key !== key) {
      const baseStyle = c.style ? Object.assign({}, c.style) : {};
      delete baseStyle._stress;
      cur = { key, style: baseStyle, parts: [{ ch: c.ch, stress }] };
      groups.push(cur);
    } else {
      cur.parts.push({ ch: c.ch, stress });
    }
  }
  return groups.map(g => {
    if (g.markerData) return _rebuildMarkerHtml(g.markerData);
    if (g.br) return '<br>';
    const schemeRef = g.style && g.style._schemeRef;
    const ulKind = _rtCharUl(g.style);
    const ulData = _rtUlDataValue(ulKind);
    const css = _rtAppendInlineMetrics(_rtStyleToCssText(g.style), g.style);
    const schemeAttr = schemeRef ? ` data-scheme='${JSON.stringify(schemeRef)}'` : '';
    const ulAttr = ulData ? ` data-ul="${ulData}"` : '';
    const chAttr = withDataCh ? ' data-ch' : '';
    let inner = '';
    for (const p of g.parts) {
      const esc = _rtEscText(p.ch);
      if (p.stress) {
        // Wrap letter only; accent is absolute ::after (does not shift following text)
        inner += `<span data-stress="1" data-stress-case="${_rtStressCase(p.ch)}">${esc}</span>`;
      } else {
        inner += esc;
      }
    }
    if (css || ulAttr || schemeAttr || withDataCh) {
      return `<span${chAttr}${schemeAttr}${ulAttr} style="display:inline;${css}">${inner}</span>`;
    }
    return inner;
  }).join('');
}

function _charObjsToHtml(chars) {
  return _renderCharSpans(chars, true);
}

function _groupedHtml(chars) {
  return _renderCharSpans(chars, false);
}

function rtMigrateHtml(html, fontSizePx) {
  if (!html) return '';
  if (fontSizePx != null) _rtApplyBulletFontSize(fontSizePx);
  // Always run through _toCharObjs/_charObjsToHtml to rebuild list marker SVGs
  // (they may have been stripped during saveState to reduce localStorage size)
  if (html.includes('data-ch')) {
    // Re-process when markers need rebuild, or when underlines need regrouping
    // (old per-char wavy/dotted looked jagged — regroup into continuous runs).
    if (html.includes('data-list-bullet') || html.includes('data-list-num')
        || /data-ul=|data-stress=|text-decoration[^;]*(wavy|dotted|dashed|double)|repeating-linear-gradient|radial-gradient|\u0301/i.test(html)) {
      return _charObjsToHtml(_toCharObjs(html));
    }
    return html;
  }
  return _charObjsToHtml(_toCharObjs(html));
}

// ─── Edit / Save mode ─────────────────────────────────────────────
function _rtContent(el) {
  if (!el) return null;
  let node = el;
  if (!node.classList || (!node.classList.contains('ec') && !node.classList.contains('tel'))) {
    node = el.querySelector('.tel') || el.querySelector('.ec') || el;
  }
  const valign = node.querySelector('.ec-valign-wrap');
  if (valign) return valign;
  const inner = node.querySelector('._txt_sh_inner');
  if (inner) return inner;
  return node;
}
function _rtWrapEl(el) {
  if (!el) return null;
  if (el.classList && el.classList.contains('el')) return el;
  return el.closest('.el') || el.closest('.psel');
}
function _rtReapplyTextShadow(el) {
  const wrap = _rtWrapEl(el);
  if (!wrap || wrap.dataset.type !== 'text') return;
  if (typeof window._textShadowActive === 'function' && window._textShadowActive(wrap.dataset)
      && typeof applyTextShadowStyle === 'function') {
    applyTextShadowStyle(wrap);
  }
  if (typeof applyTextBlockShadowStyle === 'function') applyTextBlockShadowStyle(wrap);
}

function _stripBrAnchors(root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('[data-br-anchor]').forEach(a => {
    const t = (a.textContent || '').replace(/\u200B/g, '');
    if (t) {
      a.parentNode.insertBefore(document.createTextNode(t), a);
    }
    a.remove();
  });
}

// Returns root's innerHTML with visual-only blank-line struts removed,
// WITHOUT mutating root itself (struts must stay visible in the live,
// still-being-edited DOM — only the saved copy should be clean).
function _htmlWithoutStruts(html) {
  if (!html || html.indexOf('_rt-blank-strut') === -1) return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  _stripBrAnchors(tmp);
  return tmp.innerHTML;
}
window._htmlWithoutStruts = _htmlWithoutStruts;

function _toEditMode(el) {
  const root = _rtContent(el);
  if (!root.querySelector('span[data-ch]')) return;
  root.innerHTML = _groupedHtml(_toCharObjs(root.innerHTML));
}

function _toSaveMode(el) {
  const root = _rtContent(el);
  const cs = el.getAttribute('style') || '';
  const fsMatch = cs.match(/font-size:\s*([\d.]+)px/);
  if (fsMatch) _lastBulletFontSize = parseFloat(fsMatch[1]);
  _stripBrAnchors(root);
  const chars = _toCharObjs(root.innerHTML);
  const inEditMode = !root.querySelector('span[data-ch]');
  root.innerHTML = inEditMode ? _groupedHtml(chars) : _charObjsToHtml(chars);
}

// ─── Normalize contenteditable Enter → <br> ───────────────────────
function _interceptEnter(e) {
  // ── Backspace inside a blank-line strut: delete just that blank line's
  // newline in one keystroke, not the invisible placeholder character first.
  // Without this, the first Backspace on a blank line silently consumes the
  // zero-width-space with no visible effect, making it look like Backspace
  // "does nothing" — which leads users to keep pressing it and eventually
  // delete real text once they run out of patience.
  if (e.key === 'Backspace') {
    const sel0 = window.getSelection();
    if (sel0 && sel0.rangeCount > 0 && sel0.getRangeAt(0).collapsed) {
      const r0 = sel0.getRangeAt(0);
      const n0 = r0.startContainer;
      const strutEl = n0.nodeType === 3 ? n0.parentElement : n0;
      if (strutEl && strutEl.classList && strutEl.classList.contains('_rt-blank-strut')) {
        const root = e.currentTarget;
        e.preventDefault();
        // Remove one <br> immediately after this strut — this is one of the
        // blank line's closing newlines. Leaves the strut's own opening <br>
        // (the one before it) untouched, so the remaining structure stays
        // well-formed for any further blank lines before/after.
        let brAfter = strutEl.nextSibling;
        while (brAfter && brAfter.nodeType === 1 && brAfter.hasAttribute &&
               brAfter.hasAttribute('data-br-anchor') && brAfter.tagName !== 'BR') {
          brAfter = brAfter.nextSibling;
        }
        if (brAfter && brAfter.nodeName === 'BR') {
          brAfter.remove();
          if (typeof _rtNormalizeTextDisplay === 'function') {
            const _dNorm = slides[cur] && slides[cur].els.find(x => x.id === _rtElId);
            _rtNormalizeTextDisplay(_rtEl, (_dNorm && _dNorm.cs) || '', _dNorm && _dNorm.bulletGap);
          }
          // _rtNormalizeTextDisplay preserves already-correct strut nodes
          // (it only adds missing ones), so strutEl is still in the DOM —
          // just put the caret back where it was.
          if (strutEl.isConnected && strutEl.firstChild) {
            const r2 = document.createRange();
            r2.setStart(strutEl.firstChild, Math.min(1, strutEl.firstChild.textContent.length));
            r2.collapse(true);
            const s2 = window.getSelection();
            s2.removeAllRanges();
            s2.addRange(r2);
          }
        } else {
          // This was the only blank line here — remove the strut and its
          // opening <br> entirely, merging the surrounding lines back together.
          const brBefore = strutEl.previousSibling;
          const prevNode = brBefore && brBefore.nodeName === 'BR' ? brBefore.previousSibling : strutEl.previousSibling;
          if (brBefore && brBefore.nodeName === 'BR') brBefore.remove();
          strutEl.remove();
          if (typeof _rtNormalizeTextDisplay === 'function') {
            const _dNorm = slides[cur] && slides[cur].els.find(x => x.id === _rtElId);
            _rtNormalizeTextDisplay(_rtEl, (_dNorm && _dNorm.cs) || '', _dNorm && _dNorm.bulletGap);
          }
          const r2 = document.createRange();
          if (prevNode && prevNode.nodeType === 3) {
            r2.setStart(prevNode, prevNode.textContent.length);
          } else if (prevNode) {
            r2.selectNodeContents(prevNode);
            r2.collapse(false);
          } else {
            r2.selectNodeContents(root);
            r2.collapse(true);
          }
          r2.collapse(true);
          const s2 = window.getSelection();
          s2.removeAllRanges();
          s2.addRange(r2);
        }
        clearTimeout(_enterCommitTimer);
        _enterCommitTimer = setTimeout(_rtCommit, 80);
        return;
      }
    }
  }
  // ── Backspace at start of list line: remove marker, keep text on same line ──
  if (e.key === 'Backspace') {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (!r.collapsed) return;

    const node = r.startContainer;
    const offset = r.startOffset;

    function isMarker(n) {
      return n && n.nodeType === 1 &&
        (n.hasAttribute('data-list-bullet') || n.hasAttribute('data-list-num'));
    }

    // Walk up from cursor to contenteditable root.
    // At each level: if we are at the very start (offset 0),
    // check the previous sibling — if it's a marker, remove it.
    // "At start" means: text node at offset 0, OR element node at child-index 0.
    let cur = node;
    let curOffset = offset;
    let markerSpan = null;

    while (cur) {
      // Stop at the contenteditable root itself
      if (cur.nodeType === 1 && cur.getAttribute && cur.getAttribute('contenteditable')) break;

      const atStart = curOffset === 0;
      if (!atStart) break;

      // Find previous meaningful sibling (skip br-anchors)
      let prev = cur.previousSibling;
      while (prev && prev.nodeType === 1 && prev.getAttribute && prev.getAttribute('data-br-anchor')) {
        prev = prev.previousSibling;
      }

      if (isMarker(prev)) { markerSpan = prev; break; }
      if (prev) break; // non-marker sibling exists — not at list-line start

      // No previous sibling — go up
      const parent = cur.parentElement;
      if (!parent) break;
      curOffset = Array.from(parent.childNodes).indexOf(cur);
      cur = parent;
    }

    if (markerSpan) {
      e.preventDefault();
      markerSpan.remove();
      clearTimeout(_enterCommitTimer);
      _enterCommitTimer = setTimeout(_rtCommit, 80);
      return;
    }
    return; // not at marker — browser handles normally
  }

    if (e.key !== 'Enter' || e.shiftKey) return;
  e.preventDefault();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const r = sel.getRangeAt(0);
  const root = e.currentTarget;
  r.deleteContents();

  // Find the inline ancestor (direct child of root) the caret is inside, and
  // split it at the caret so the <br> we insert next lands as a direct child
  // of root — never nested inside a text span. _rtNormalizeTextDisplay (and
  // the blank-line Backspace/typing logic) assume <br>s are root-level
  // siblings; a <br> buried inside a span breaks that assumption silently.
  {
    let node = r.startContainer, offset = r.startOffset;
    let inlineAncestor = null;
    let n = node;
    while (n && n !== root) {
      if (n.parentNode === root) { inlineAncestor = n; break; }
      n = n.parentNode;
    }
    if (inlineAncestor && inlineAncestor.nodeType === 1 && node !== inlineAncestor) {
      // Build a range from the caret to the end of inlineAncestor, extract it
      // into a clone placed right after inlineAncestor — this is the
      // standard "split element at caret" operation.
      const tailRange = document.createRange();
      tailRange.setStart(node, offset);
      tailRange.setEndAfter(inlineAncestor.lastChild || inlineAncestor);
      const tailFragment = tailRange.extractContents();
      const clone = inlineAncestor.cloneNode(false); // same tag/attrs, no children
      clone.appendChild(tailFragment);
      if (clone.textContent.length > 0 || clone.querySelector('*')) {
        inlineAncestor.parentNode.insertBefore(clone, inlineAncestor.nextSibling);
      }
      // Caret now belongs right after the (now-truncated) inlineAncestor
      r.setStartAfter(inlineAncestor);
      r.collapse(true);
    }
  }

  const br = document.createElement('br');
  r.insertNode(br);

  // Check if br is at the very end of the whole editable block (no meaningful
  // content after it anywhere), not just within its immediate parent span —
  // otherwise pressing Enter at the end of a colored span that is followed by
  // another colored span (e.g. "FIRSTRED|SECONDBLUE") is wrongly treated as
  // "end of text" and an extra <br> gets inserted, producing a blank line.
  function nextMeaningful(node) {
    let n = node;
    while (n) {
      let sib = n.nextSibling;
      while (sib) {
        if (!(sib.nodeType === 3 && sib.textContent === '')) return sib;
        sib = sib.nextSibling;
      }
      n = n.parentNode;
      if (!n || n === root) return null;
    }
    return null;
  }
  const atEnd = !nextMeaningful(br);

  const r2 = document.createRange();
  if (atEnd) {
    const br2 = document.createElement('br');
    br.parentNode.insertBefore(br2, br.nextSibling);
    r2.setStartAfter(br);
  } else {
    r2.setStartAfter(br);
  }
  r2.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r2);

  if (typeof _rtNormalizeTextDisplay === 'function') {
    const _dNorm = slides[cur] && slides[cur].els.find(x => x.id === _rtElId);
    _rtNormalizeTextDisplay(root, (_dNorm && _dNorm.cs) || '', _dNorm && _dNorm.bulletGap);
  }
  // Re-place the caret explicitly: normalize may have inserted a strut span
  // right after `br`, and relying on the browser to keep the old Range
  // pointing at the right spot through that DOM mutation isn't reliable —
  // it was landing the caret on the .tel container itself, which then made
  // the next typed character get inserted in the wrong place entirely.
  {
    const r3 = document.createRange();
    const afterBr = br.nextSibling;
    if (afterBr && afterBr.nodeType === 1 && afterBr.classList && afterBr.classList.contains('_rt-blank-strut') && afterBr.firstChild) {
      r3.setStart(afterBr.firstChild, 0);
    } else {
      r3.setStartAfter(br);
    }
    r3.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r3);
  }

  clearTimeout(_enterCommitTimer);
  _enterCommitTimer = setTimeout(_rtCommit, 80);
  // Сразу расширить рамку под новую строку (Enter не даёт input → без этого высота не растёт)
  requestAnimationFrame(() => {
    _rtGrowEditBox();
    requestAnimationFrame(_rtGrowEditBox);
  });
}
let _enterCommitTimer = null;

/** Подгонка высоты текстового блока во время редактирования (Enter / ввод). */
function _rtGrowEditBox(){
  if(!_rtEl || !_rtElId) return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === _rtElId);
  if(!d || d.type !== 'text') return;
  if(typeof window._fitTextHeight !== 'function') return;
  if(window._fitTextHeight(d)){
    const wrap = _rtEl.closest('.el');
    if(wrap) wrap.style.height = d.h + 'px';
    if(typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
  }
}

// ─── Selection: char-index based ──────────────────────────────────
function _charOffset(targetNode, targetOffset, root) {
  // If the boundary is "inside an element, before child #targetOffset" (common
  // when the boundary sits right before/after a contenteditable="false" marker
  // span, rather than inside a text node), count chars in just the preceding
  // siblings within that element instead of falling through to a full walk
  // (which would never match targetNode itself and run to the document's end).
  if (targetNode.nodeType === 1) {
    let count = 0;
    function countNode(node) {
      if (node.nodeType === 3) { count += node.textContent.length; return; }
      if (node.nodeType === 1) {
        if (node.tagName === 'BR') { count += 1; return; }
        if (node.hasAttribute && (node.hasAttribute('data-list-bullet') || node.hasAttribute('data-list-num'))) { count += 1; return; }
        if (node.hasAttribute && node.hasAttribute('data-br-anchor')) return;
        for (const child of node.childNodes) countNode(child);
      }
    }
    // Count everything before targetNode itself (its preceding siblings, walked
    // from root), plus the children of targetNode up to targetOffset.
    let found = false;
    function walkToTarget(node) {
      for (const child of node.childNodes) {
        if (child === targetNode) { found = true; return true; }
        countNode(child);
      }
      return false;
    }
    if (targetNode !== root) walkToTarget(root);
    else found = true;
    if (found) {
      for (let i = 0; i < targetOffset && i < targetNode.childNodes.length; i++) {
        countNode(targetNode.childNodes[i]);
      }
      return count;
    }
    // targetNode not found under root — fall through to generic walk below.
  }
  let count = 0;
  function walk(node) {
    if (node === targetNode && node.nodeType === 3) { count += targetOffset; return true; }
    if (node.nodeType === 3) { count += node.textContent.length; return false; }
    if (node.nodeType === 1) {
      if (node.tagName === 'BR') { if (node === targetNode) return true; count += 1; return false; }
      // List markers are stored as single \x00 char in _toCharObjs — count as 1
      if (node.hasAttribute && (node.hasAttribute('data-list-bullet') || node.hasAttribute('data-list-num'))) {
        if (node === targetNode) return true;
        count += 1; return false;
      }
      // br-anchor spans are skipped by _toCharObjs — skip here too
      if (node.hasAttribute && node.hasAttribute('data-br-anchor')) return false;
      for (const child of node.childNodes) { if (walk(child)) return true; }
    }
    return false;
  }
  for (const child of root.childNodes) { if (walk(child)) break; }
  return count;
}

// Single source of truth for "what range should line-targeting operations
// (bullet/numbered list toggle, marker icon change, marker color change) use":
// a real selection, falling back to a saved fragment selection, falling back
// to the collapsed caret position. Without the caret fallback, simply placing
// the cursor in a line (no highlighting) would fall through to "no selection
// = whole block" instead of targeting just that line.
function _getSelOrCaretIdx(root) {
  return _readSelFromDOM(root) || _savedSelIdx || _readCollapsedCaretIdx(root);
}

function _readSelFromDOM(el) {
  const s = window.getSelection();
  if (!s || s.rangeCount === 0 || s.isCollapsed) return null;
  const r = s.getRangeAt(0);
  if (!el.contains(r.commonAncestorContainer)) return null;
  const start = _charOffset(r.startContainer, r.startOffset, el);
  const end   = _charOffset(r.endContainer,   r.endOffset,   el);
  return start < end ? { start, end } : null;
}

// Returns a zero-width {start,end} at the caret position when the selection
// is collapsed (just a blinking cursor, nothing highlighted) — lets
// line-targeting logic treat "caret in line X" the same as "selection within
// line X", instead of only handling real (non-collapsed) selections.
function _readCollapsedCaretIdx(el) {
  const s = window.getSelection();
  if (!s || s.rangeCount === 0 || !s.isCollapsed) return null;
  const r = s.getRangeAt(0);
  if (!el.contains(r.startContainer) && r.startContainer !== el) return null;
  const pos = _charOffset(r.startContainer, r.startOffset, el);
  return { start: pos, end: pos };
}

function _restoreSelToDOM(idx, el) {
  if (!idx || !el) return;
  let startNode=null, startOff=0, endNode=null, endOff=0;
  let count = 0;
  function walk(node) {
    if (node.nodeType === 3) {
      const len = node.textContent.length;
      if (!startNode && count + len > idx.start) { startNode=node; startOff=idx.start-count; }
      if (!endNode   && count + len >= idx.end)  { endNode=node;   endOff=idx.end-count; return true; }
      count += len; return false;
    }
    if (node.nodeType === 1) {
      if (node.tagName === 'BR') { count += 1; return false; }
      // List markers count as 1 char — skip internals
      if (node.hasAttribute && (node.hasAttribute('data-list-bullet') || node.hasAttribute('data-list-num'))) {
        count += 1; return false;
      }
      // br-anchor spans are invisible — skip
      if (node.hasAttribute && node.hasAttribute('data-br-anchor')) return false;
      for (const child of node.childNodes) { if (walk(child)) return true; }
    }
    return false;
  }
  for (const child of el.childNodes) { if (walk(child)) break; }
  if (!startNode || !endNode) return;
  try {
    const r = document.createRange();
    r.setStart(startNode, startOff);
    r.setEnd(endNode, endOff);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  } catch(e) {}
}

// Places a collapsed caret at a single char-index position (counting the
// same way _charOffset/_toCharObjs do: <br> and list markers count as 1,
// data-br-anchor / blank-line struts are skipped entirely).
function _restoreCaretToCharIndex(targetIdx, root) {
  if (targetIdx < 0) targetIdx = 0;
  let count = 0, node = null, off = 0;
  function walk(n) {
    if (n.nodeType === 3) {
      const len = n.textContent.length;
      if (count + len >= targetIdx) { node = n; off = targetIdx - count; return true; }
      count += len; return false;
    }
    if (n.nodeType === 1) {
      if (n.hasAttribute && n.hasAttribute('data-br-anchor')) return false;
      if (n.tagName === 'BR') {
        count += 1;
        if (count === targetIdx) { node = n.parentNode; off = Array.prototype.indexOf.call(n.parentNode.childNodes, n) + 1; return true; }
        return false;
      }
      if (n.hasAttribute && (n.hasAttribute('data-list-bullet') || n.hasAttribute('data-list-num'))) {
        count += 1;
        if (count === targetIdx) { node = n.parentNode; off = Array.prototype.indexOf.call(n.parentNode.childNodes, n) + 1; return true; }
        return false;
      }
      for (const c of n.childNodes) { if (walk(c)) return true; }
    }
    return false;
  }
  for (const c of root.childNodes) { if (walk(c)) break; }
  if (!node) { node = root; off = root.childNodes.length; }
  try {
    const r = document.createRange();
    r.setStart(node, off);
    r.collapse(true);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  } catch (e) {}
}

// ─── Panel mousedown ──────────────────────────────────────────────
// Saved Range object for visual highlight restoration
let _savedRange = null;

function _rtSaveRange() {
  if (!_rtEl) return;
  const s = window.getSelection();
  if (s && s.rangeCount > 0 && !s.isCollapsed) {
    const r = s.getRangeAt(0);
    if (_rtEl.contains(r.commonAncestorContainer)) {
      _savedRange = r.cloneRange();
      const idx = _readSelFromDOM(_rtEl);
      if (idx) _savedSelIdx = idx;
    }
  }
}

function _rtRestoreRange() {
  if (!_savedRange || !_rtEl) return;
  try {
    // Don't restore a range that's no longer connected to the live document
    // (e.g. the element it pointed into was rebuilt) or that doesn't belong
    // to the currently-focused text element.
    if (!_savedRange.startContainer || !_savedRange.startContainer.isConnected ||
        !_rtEl.contains(_savedRange.commonAncestorContainer)) {
      _savedRange = null;
      return;
    }
    _rtEl.focus();
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(_savedRange);
  } catch(e) {}
}

let _rtPanelInteracting = false;
// True for one tick when the mousedown that's about to steal focus from the
// text editor landed inside an open modal (e.g. the bullet icon picker).
// document.activeElement isn't usable for this inside a blur handler: clicking
// a plain non-focusable element (like an icon-picker cell, a <div>) leaves
// activeElement as <body>, not the modal — so we capture the click target
// directly, in the mousedown capture phase, before focus is actually lost.
let _rtModalInteracting = false;
window._rtModalInteracting = false;
document.addEventListener('mousedown', function(e) {
  if (e.target.closest && e.target.closest('.modal-ov.open')) {
    _rtModalInteracting = true;
    window._rtModalInteracting = true;
    setTimeout(() => { _rtModalInteracting = false; window._rtModalInteracting = false; }, 300);
  }
}, true);

function _rtOnPanelMousedown(e) {
  if (!_rtEl) return;
  // Save both Range object and char index BEFORE browser clears selection
  _rtSaveRange();

  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
    // Inputs need focus — but restore focus to text element after interaction
    const savedRange = _savedRange;
    const savedEl = _rtEl;
    // After input/select loses focus (on change/blur), refocus text element
    const restoreFocus = () => {
      if (savedEl && savedEl.isConnected) {
        savedEl.focus();
        if (savedRange) {
          try {
            const s = window.getSelection();
            s.removeAllRanges();
            s.addRange(savedRange);
          } catch(e) {}
        }
      }
    };
    // Save selection index now so oninput handlers can use it
    if (!_savedSelIdx) {
      const idx = _readSelFromDOM(_rtContent(savedEl));
      if (idx) _savedSelIdx = idx;
    }
    e.target.addEventListener('change', () => setTimeout(restoreFocus, 0), {once: true});
    e.target.addEventListener('blur', () => setTimeout(restoreFocus, 50), {once: true});
  } else {
    // Buttons — block focus steal, restore range synchronously
    e.preventDefault();
    _rtRestoreRange();
  }
}

// ─── Attach ───────────────────────────────────────────────────────
function rtAttachSelectionTracking(wrapEl, telEl) {
  const id = wrapEl.dataset.id;

  telEl.addEventListener('focus', () => {
    // Only clear saved selection when switching to a different text element
    if (_rtElId && _rtElId !== id) _savedSelIdx = null;
    _rtEl = telEl; _rtElId = id;
    // No mode conversion needed — edit directly in place
    // Update toolbar immediately so buttons reflect whole-text state before any selection
    setTimeout(() => { if (typeof rtUpdateToolbarState === 'function') rtUpdateToolbarState(); }, 0);
  });

  telEl.addEventListener('keydown', _interceptEnter);

  telEl.addEventListener('beforeinput', (e) => {
    if (e.inputType && e.inputType.indexOf('delete') === 0) return; // deletions handled by _interceptEnter
    const s = window.getSelection();
    if (!s || s.rangeCount === 0) return;
    const r = s.getRangeAt(0);
    const n0 = r.startContainer;
    const strutEl = n0.nodeType === 3 ? n0.parentElement : (n0.nodeType === 1 ? n0 : null);
    if (!strutEl || !strutEl.classList || !strutEl.classList.contains('_rt-blank-strut')) return;
    // Typed text must not land inside the strut's text node (it would inherit
    // no real style and be invisible to _toCharObjs, which skips struts
    // entirely) — insert it as a real sibling text node right after the
    // strut instead, then place the caret after what we inserted.
    const text = e.data;
    if (!text) return; // composition events etc. — let the browser handle it
    e.preventDefault();
    // Wrap in a span carrying real style — a bare text node here would
    // inherit font-size:0 from the zero-strut container and stay invisible
    // until the next full re-render rewraps it through _toCharObjs.
    let styleSrc = strutEl.previousElementSibling;
    while (styleSrc && (styleSrc.tagName === 'BR' ||
           (styleSrc.hasAttribute && styleSrc.hasAttribute('data-br-anchor') && styleSrc.tagName !== 'BR' && (!styleSrc.style || !styleSrc.style.fontSize)))) {
      styleSrc = styleSrc.previousElementSibling;
    }
    const baseFs = (typeof _rtFontSizeFromCs === 'function' && _rtFontSizeFromCs(telEl.getAttribute('style') || '')) || 24;
    const fs = (styleSrc && styleSrc.style && parseFloat(styleSrc.style.fontSize)) || baseFs;
    const lh = (styleSrc && styleSrc.style && styleSrc.style.lineHeight) || '1.25';
    const span = document.createElement('span');
    span.style.cssText = `display:inline;font-size:${fs}px;line-height:${lh};vertical-align:baseline`;
    span.textContent = text;
    if (strutEl.nextSibling) strutEl.parentNode.insertBefore(span, strutEl.nextSibling);
    else strutEl.parentNode.appendChild(span);
    const after = document.createRange();
    after.setStart(span.firstChild, span.firstChild.textContent.length);
    after.collapse(true);
    s.removeAllRanges();
    s.addRange(after);
    if (typeof _rtCommit === 'function') _rtCommit();
  });

  telEl.addEventListener('blur', (e) => {
    // _toSaveMode is called by 13-images.js blur handler which fires first
    if (_rtModalInteracting) return;
    if (!_rtColorPickInProgress) _rtCommit();
    // Clear saved selection when leaving text editing without clicking props panel
    // _rtPanelInteracting is set synchronously in capture phase before this blur fires
    if (!_rtPanelInteracting) {
      _savedSelIdx = null;
      _savedRange = null;
    }
  });

  telEl.addEventListener('mouseup', rtUpdateToolbarState);
  telEl.addEventListener('keyup',   rtUpdateToolbarState);
  telEl.addEventListener('input',  rtUpdateToolbarState);
}

document.addEventListener('selectionchange', () => {
  const s = window.getSelection();
  if (!s || s.rangeCount === 0) return;
  const anc = s.getRangeAt(0).commonAncestorContainer;
  const el2 = anc.nodeType === 3 ? anc.parentElement : anc;
  // Track selection inside .tel regardless of contentEditable state
  const telEl = el2 && el2.closest('.tel');
  if (telEl) {
    const p = telEl.closest('.el');
    const newId = p ? p.dataset.id : null;
    // Clear saved selection when switching to a different element
    if (_rtElId && newId && _rtElId !== newId) _savedSelIdx = null;
    _rtEl = telEl;
    if (p) _rtElId = p.dataset.id;
    const idx = _readSelFromDOM(telEl);
    if (idx) _savedSelIdx = idx;
    else if (s.isCollapsed) { _savedSelIdx = null; _savedRange = null; } // cursor placed with no highlight — stop using the old fragment range
    if (typeof rtUpdateToolbarState === 'function') rtUpdateToolbarState();
  }
});

// ─── Commit ───────────────────────────────────────────────────────
function _rtCommit() {
  if (!_rtEl || !_rtElId) return;
  const wrapEl = _rtEl.closest('.el');
  if (wrapEl && wrapEl.dataset.editing !== 'true') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === _rtElId);
  if (d) {
    // Try to get pre-normalization HTML from dataset (set by 13-images blur before contentEditable=false)
    const wrapEl = _rtEl.closest('.el');
    const savedHtml = wrapEl && wrapEl.dataset._savedHtml;
    if (savedHtml != null) {
      d.html = savedHtml;
    } else {
      const vw = _rtEl.querySelector('.ec-valign-wrap');
      const root = _rtContent(_rtEl);
      const _liveHtml = vw ? vw.innerHTML : root.innerHTML;
      d.html = _htmlWithoutStruts(_liveHtml);
    }
    if (typeof window._fitTextHeight === 'function' && window._fitTextHeight(d)) {
      if (wrapEl) wrapEl.style.height = d.h + 'px';
      if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
    }
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
  }
}

// ─── Apply style to selection ─────────────────────────────────────
function _applyToSelection(prop, val) {
  if (!_rtEl) return false;
  const root = _rtContent(_rtEl);
  let idx = _readSelFromDOM(root);
  if (!idx) idx = _savedSelIdx;
  if (!idx) return false;

  const chars = _toCharObjs(root.innerHTML);
  if (!chars.length || idx.start >= chars.length) return false;
  const end = Math.min(idx.end, chars.length);
  const selected = chars.slice(idx.start, end);
  if (!selected.length) return false;

  const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  if (prop === 'font-weight') {
    const allBold = selected.every(c => parseInt(c.style.fontWeight||'400') >= 600);
    selected.forEach(c => { c.style.fontWeight = allBold ? '400' : val; });
  } else if (prop === 'font-style') {
    const allItalic = selected.every(c => c.style.fontStyle === 'italic');
    selected.forEach(c => { c.style.fontStyle = allItalic ? 'normal' : 'italic'; });
  } else if (prop === 'text-decoration') {
    const styles = selected.map(c => _rtCharUl(c.style));
    const allSame = styles.every(s => s === styles[0]);
    const next = allSame ? _rtNextUnderline(styles[0]) : 'underline';
    selected.forEach(c => { _rtSetCharUl(c.style, next); });
  } else if (prop === 'vertical-align') {
    const allSuper = selected.every(c => c.style.verticalAlign === 'super');
    const allSub   = selected.every(c => c.style.verticalAlign === 'sub');
    const isToggleOff = (val === 'super' && allSuper) || (val === 'sub' && allSub);
    selected.forEach(c => {
      c.style.verticalAlign = isToggleOff ? '' : val;
      // When toggling super/sub also reset font-size if it was shrunk for script
      if (isToggleOff) c.style.fontSize = c.style.fontSize || '';
    });
  } else {
    selected.forEach(c => {
      c.style[camel] = val;
    });
    // Store schemeRef on color chars so applyTheme can remap them
    if (camel === 'color') {
      const sr = _applyToSelection._schemeRef;
      selected.forEach(c => {
        if (sr) c.style._schemeRef = sr;
        else delete c.style._schemeRef;
      });
    }
  }

  const inEditMode = !root.querySelector('span[data-ch]');
  const newHtml = inEditMode ? _groupedHtml(chars) : _charObjsToHtml(chars);
  root.innerHTML = newHtml;
  if (typeof _rtNormalizeTextDisplay === 'function') {
    const _dNorm = slides[cur] && slides[cur].els.find(e => e.id === _rtElId);
    _rtNormalizeTextDisplay(_rtEl, (_dNorm && _dNorm.cs) || (_rtEl.getAttribute('style') || ''), _dNorm && _dNorm.bulletGap);
  }
  _rtReapplyTextShadow(_rtEl);
  // After innerHTML rebuild the browser clears the selection. We restore it,
  // but first ensure the editor has focus — without focus the browser won't
  // display the selection highlight even if the Range is correctly set.
  // We do this inside rAF so the browser has laid out the new DOM first.
  const _idxToRestore = idx;
  const _rootToRestore = root;
  requestAnimationFrame(() => {
    if (_rtEl && _rtEl.contentEditable === 'true' && document.activeElement !== _rtEl) {
      _rtEl.focus({ preventScroll: true });
    }
    _restoreSelToDOM(_idxToRestore, _rootToRestore);
    if (typeof rtUpdateToolbarState === 'function') rtUpdateToolbarState();
  });
  _savedSelIdx = idx;
  return true;
}

// ─── Whole-element style ──────────────────────────────────────────
function _setTSWhole(prop, val, skipHtmlSync) {
  if (!sel || sel.dataset.type !== 'text') return;
  debouncedPushUndo();
  const c = sel.querySelector('.ec'); if (!c) return;
  // Underlines live on grouped char spans (continuous wavy / dash-dot).
  // Do not also put text-decoration on .ec — that doubles the line.
  if (prop === 'text-decoration') {
    c.setAttribute('style', _rtStripUlFromEcStyle(c.getAttribute('style') || ''));
    if (!skipHtmlSync) _syncUlToHtml(val);
    const _dUl = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
    const _fitUl = () => {
      if (_dUl && typeof window._fitTextHeight === 'function' && window._fitTextHeight(_dUl)) {
        sel.style.height = _dUl.h + 'px';
      }
      save(); saveState(); drawThumbs(); syncProps();
    };
    _fitUl();
    _rtReapplyTextShadow(sel);
    setTimeout(() => { if (typeof rtUpdateToolbarState === 'function') rtUpdateToolbarState(); }, 0);
    return;
  }
  let cs = c.getAttribute('style') || '';
  // Don't overwrite padding-top (managed by applyTextVAlign)
  if (prop === 'padding-top') return;
  const re = new RegExp(prop + '\\s*:[^;]+;?', 'i');
  cs = re.test(cs) ? cs.replace(re, prop+':'+val+';') : cs+prop+':'+val+';';
  c.setAttribute('style', cs);
  // Recalculate valign padding if font-size changed (text height changes)
  // Sync prop into d.html char-objects so the value survives preview round-trip.
  // Skip when called after a partial selection apply (rtColor with selection)
  // to avoid overwriting per-character colors.
  if (!skipHtmlSync) {
    if (prop === 'color') {
      // When setting color on the whole block, strip per-char colors so
      // container color takes effect uniformly (no stale per-char overrides).
      _clearCharColors();
    } else {
      _syncPropToHtml(prop, val);
    }
  }
  const _dForFit = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  const _fitNow = () => {
    // After whole-block font-size change, shrink or grow the box to the text
    const fitOpts = prop === 'font-size' ? { shrink: true } : undefined;
    if (_dForFit && typeof window._fitTextHeight === 'function' && window._fitTextHeight(_dForFit, fitOpts)) {
      sel.style.height = _dForFit.h + 'px';
      if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
    }
    save(); saveState(); drawThumbs(); syncProps();
  };
  // font-size: wait a frame, re-apply valign, then measure (so shrink sees real height)
  if (prop === 'font-size') {
    requestAnimationFrame(() => {
      if (sel && sel.dataset.valign && typeof applyTextVAlign === 'function') {
        applyTextVAlign(sel, sel.dataset.valign);
      }
      _fitNow();
    });
  } else {
    _fitNow();
  }
  _rtReapplyTextShadow(sel);
  // Update button highlight state after whole-element formatting
  setTimeout(() => { if (typeof rtUpdateToolbarState === 'function') rtUpdateToolbarState(); }, 0);
}

// Strip explicit color from every char-span so the container .ec color takes over.
function _clearCharColors() {
  if (!sel || sel.dataset.type !== 'text') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);
  const chars = _toCharObjs(root.innerHTML);
  if (!chars.length) return;
  chars.forEach(ch => { delete ch.style.color; delete ch.style._schemeRef; });
  const newHtml = _charObjsToHtml(chars);
  root.innerHTML = newHtml;
  d.html = newHtml;
  if (typeof _rtNormalizeTextDisplay === 'function') _rtNormalizeTextDisplay(c, c.getAttribute('style') || '', d.bulletGap);
  _rtReapplyTextShadow(sel);
}


// Update a CSS property on every char in d.html AND in the DOM.
// Must update DOM BEFORE save() is called, so save() reads correct innerHTML.
function _syncPropToHtml(prop, val) {
  if (!sel || sel.dataset.type !== 'text') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);
  const camel = prop.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());

  const sourceHtml = root.innerHTML;

  const chars = _toCharObjs(sourceHtml);

  if (!chars.length) return;
  // Never overwrite per-char colors via _syncPropToHtml —
  // partial selections would be wiped out.
  if (camel === 'color') return;
  if (camel === 'textDecoration') {
    chars.forEach(ch => { _rtSetCharUl(ch.style, val); });
  } else {
    chars.forEach(ch => { ch.style[camel] = val; });
  }
  const newHtml = _charObjsToHtml(chars);

  root.innerHTML = newHtml;
  d.html = newHtml;
  if (typeof _rtNormalizeTextDisplay === 'function') _rtNormalizeTextDisplay(c, c.getAttribute('style') || '', d.bulletGap);
  _rtReapplyTextShadow(sel);

}

// ─── Public functions ─────────────────────────────────────────────
function rtBold() {
  if (!_applyToSelection('font-weight','700')) {
    if (!sel||sel.dataset.type!=='text') return;
    const cs = sel.querySelector('.ec').getAttribute('style')||'';
    _setTSWhole('font-weight', /font-weight:(700|800|900)/.test(cs)?'400':'700');
  } else {
    _rtCommit();
  }
  rtUpdateToolbarState();
}

function rtItalic() {
  if (!_applyToSelection('font-style','italic')) {
    if (!sel||sel.dataset.type!=='text') return;
    const cs = sel.querySelector('.ec').getAttribute('style')||'';
    _setTSWhole('font-style', cs.includes('font-style:italic')?'normal':'italic');
  } else {
    _rtCommit();
  }
  rtUpdateToolbarState();
}

// Cycle: none → single → double → wavy → dashed → dash-dot → none
const _RT_UL_CYCLE = [
  'underline',
  'underline double',
  'underline wavy',
  'underline dashed',
  'underline dash-dot',
  'none'
];
const _RT_UL_TITLES = {
  'underline': 'одинарное',
  'underline double': 'двойное',
  'underline wavy': 'волнистая',
  'underline dashed': 'пунктирная',
  'underline dash-dot': 'штрихпунктирная',
  'none': 'нет'
};

function _rtParseUnderline(dec) {
  const d = String(dec || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!d || d === 'none') return 'none';
  // data-ul short values
  if (d === 'single') return 'underline';
  if (d === 'double') return 'underline double';
  if (d === 'wavy') return 'underline wavy';
  if (d === 'dashed') return 'underline dashed';
  if (d === 'dash-dot' || d === 'dashdot') return 'underline dash-dot';
  if (d.indexOf('underline') < 0 && d !== 'dotted') return 'none';
  if (/\bdouble\b/.test(d)) return 'underline double';
  if (/\bwavy\b/.test(d)) return 'underline wavy';
  // Old "dotted" → dash-dot (штрих-точка)
  if (/\bdotted\b/.test(d) || /\bdash-dot\b/.test(d) || /\bdashdot\b/.test(d)) return 'underline dash-dot';
  if (/\bdashed\b/.test(d)) return 'underline dashed';
  return 'underline';
}

function _rtNextUnderline(cur) {
  const i = _RT_UL_CYCLE.indexOf(cur);
  return _RT_UL_CYCLE[(i < 0 ? 0 : i + 1) % _RT_UL_CYCLE.length];
}

function _rtUnderlineFromStyleAttr(styleAttr) {
  const s = styleAttr || '';
  if (/repeating-linear-gradient/i.test(s) && (/radial-gradient/i.test(s) || /0\.4em|5\.5px/i.test(s))) {
    return 'underline dash-dot';
  }
  if (/data-ul\s*=\s*["']?dash-dot/i.test(s)) return 'underline dash-dot';
  const m = /text-decoration(?:-line|-style)?\s*:\s*([^;]+)/i.exec(s);
  return _rtParseUnderline(m ? m[1] : '');
}

function _rtUlFromNode(n) {
  if (!n) return 'none';
  if (n.getAttribute) {
    const du = n.getAttribute('data-ul');
    if (du) return _rtParseUnderline(du);
  }
  const inline = n.style && (n.style.textDecoration || n.style.textDecorationLine);
  if (inline) {
    const parsed = _rtParseUnderline(inline + ' ' + (n.style.textDecorationStyle || ''));
    if (parsed !== 'none') return parsed;
  }
  return _rtUnderlineFromStyleAttr(n.getAttribute && n.getAttribute('style') || '');
}

function _rtCurrentUnderline(el) {
  if (!el) return 'none';
  const ec = el.querySelector ? el.querySelector('.ec') : null;
  if (!ec) return 'none';
  const root = _rtContent(ec);
  const nodes = root ? Array.from(root.querySelectorAll('span[data-ch], span[data-ul]')) : [];
  const styled = nodes.length ? nodes : (root ? Array.from(root.querySelectorAll('span[style]')) : []);
  if (styled.length) {
    const styles = styled.map(_rtUlFromNode);
    if (styles.every(s => s === styles[0])) {
      if (styles[0] !== 'none') return styles[0];
      return _rtUnderlineFromStyleAttr(ec.getAttribute('style') || '');
    }
    return styles.find(s => s !== 'none') || styles[0];
  }
  return _rtUnderlineFromStyleAttr(ec.getAttribute('style') || '');
}

function _rtUpdateUnderlineBtn(activeVal) {
  const b = document.getElementById('ft-u');
  if (!b) return;
  const on = !!(activeVal && activeVal !== 'none');
  b.classList.toggle('on', on);
  const label = _RT_UL_TITLES[activeVal] || _RT_UL_TITLES.none;
  b.title = 'Подчёркивание: ' + label + ' → следующее (Ctrl+U)';
}

function _rtStripUlFromEcStyle(cs) {
  return String(cs || '')
    .replace(/text-decoration(?:-line|-style|-thickness|-color)?\s*:[^;]+;?/gi, '')
    .replace(/text-underline-offset\s*:[^;]+;?/gi, '')
    .replace(/;;+/g, ';')
    .replace(/^;|;$/g, '');
}

function rtUnderline() {
  if (!_applyToSelection('text-decoration', 'cycle')) {
    if (!sel || sel.dataset.type !== 'text') return;
    const next = _rtNextUnderline(_rtCurrentUnderline(sel));
    _setTSWhole('text-decoration', next);
  } else {
    _rtCommit();
  }
  rtUpdateToolbarState();
}

const _RT_STRESS = '\u0301'; // combining acute — legacy only; UI uses data-stress

/** upper | lower — for CSS accent height (capitals need more lift). */
function _rtStressCase(ch) {
  if (!ch) return 'lower';
  const c = [...String(ch)][0];
  if (!c) return 'lower';
  try {
    if (/\p{Lu}|\p{Lt}/u.test(c)) return 'upper';
  } catch (e) {}
  return (c.toUpperCase() === c && c.toLowerCase() !== c) ? 'upper' : 'lower';
}

function _rtIsStressableLetter(ch) {
  return !!ch && /\p{L}/u.test(ch) && !/[\u0300-\u036f]/.test(ch);
}

function _rtLetterHasStress(chars, i) {
  const c = chars[i];
  if (!c || !_rtIsStressableLetter(c.ch)) return false;
  if (c.style && c.style._stress) return true;
  return !!(chars[i + 1] && chars[i + 1].ch === _RT_STRESS);
}

/** Collect indices of base letters inside [start, end). */
function _rtStressTargets(chars, start, end) {
  const targets = [];
  for (let i = start; i < end && i < chars.length; i++) {
    if (_rtIsStressableLetter(chars[i].ch)) targets.push(i);
  }
  return targets;
}

function _rtSelectionHasStress(chars, start, end) {
  const targets = _rtStressTargets(chars, start, end);
  if (!targets.length) return false;
  return targets.every(i => _rtLetterHasStress(chars, i));
}

function rtStress() {
  // Prefer live editor; fall back to selected text block
  let root = null;
  if (_rtEl) root = _rtContent(_rtEl);
  else if (sel && sel.dataset.type === 'text') {
    const ec = sel.querySelector('.ec');
    root = ec ? _rtContent(ec) : null;
  }
  if (!root) return;

  let idx = _readSelFromDOM(root) || _savedSelIdx;
  if (!idx) {
    // Collapsed caret: toggle the letter immediately before the caret
    const caret = typeof _readCollapsedCaretIdx === 'function' ? _readCollapsedCaretIdx(root) : null;
    if (!caret) return;
    let i = caret.start;
    const chars0 = _toCharObjs(root.innerHTML);
    if (i > 0 && chars0[i - 1] && chars0[i - 1].ch === _RT_STRESS) i--;
    if (i > 0 && _rtIsStressableLetter(chars0[i - 1].ch)) {
      idx = { start: i - 1, end: i };
    } else if (i < chars0.length && _rtIsStressableLetter(chars0[i].ch)) {
      idx = { start: i, end: i + 1 };
    } else {
      return;
    }
  }

  if (typeof pushUndo === 'function') pushUndo();
  else if (typeof debouncedPushUndo === 'function') debouncedPushUndo();

  const chars = _toCharObjs(root.innerHTML);
  if (!chars.length) return;
  const start = Math.max(0, idx.start);
  const end = Math.min(idx.end, chars.length);
  const targets = _rtStressTargets(chars, start, end);
  if (!targets.length) return;

  const remove = targets.every(i => _rtLetterHasStress(chars, i));
  // Toggle style._stress (CSS paints the mark). Drop any leftover combining accents.
  for (let t = targets.length - 1; t >= 0; t--) {
    const i = targets[t];
    if (!chars[i].style) chars[i].style = {};
    if (remove) delete chars[i].style._stress;
    else chars[i].style._stress = true;
    if (chars[i + 1] && chars[i + 1].ch === _RT_STRESS) chars.splice(i + 1, 1);
  }

  const inEditMode = !root.querySelector('span[data-ch]');
  const newHtml = inEditMode ? _groupedHtml(chars) : _charObjsToHtml(chars);
  root.innerHTML = newHtml;

  // Persist into slide data
  const wrap = (_rtEl && _rtEl.closest('.el')) || sel;
  const id = (_rtElId) || (wrap && wrap.dataset && wrap.dataset.id);
  const d = id && slides[cur] && slides[cur].els.find(e => e.id === id);
  if (d) d.html = typeof _htmlWithoutStruts === 'function' ? _htmlWithoutStruts(newHtml) : newHtml;

  if (typeof _rtNormalizeTextDisplay === 'function') {
    const tel = wrap && wrap.querySelector ? wrap.querySelector('.ec') : null;
    _rtNormalizeTextDisplay(tel || root, (d && d.cs) || '', d && d.bulletGap);
  }
  if (wrap && typeof _rtReapplyTextShadow === 'function') _rtReapplyTextShadow(wrap);
  if (wrap && typeof window._rtUpdateCharCounter === 'function') {
    window._rtUpdateCharCounter(wrap, wrap.querySelector('.ec') || root);
  }

  const _idxToRestore = { start, end: Math.min(end, chars.length) };
  const _rootToRestore = root;
  requestAnimationFrame(() => {
    if (_rtEl && _rtEl.contentEditable === 'true' && document.activeElement !== _rtEl) {
      _rtEl.focus({ preventScroll: true });
    }
    if (typeof _restoreSelToDOM === 'function') _restoreSelToDOM(_idxToRestore, _rootToRestore);
    if (typeof rtUpdateToolbarState === 'function') rtUpdateToolbarState();
  });
  _savedSelIdx = _idxToRestore;

  if (typeof _rtCommit === 'function') _rtCommit();
  if (typeof save === 'function') save();
  if (typeof saveState === 'function') saveState();
  if (typeof drawThumbs === 'function') drawThumbs();
  rtUpdateToolbarState();
}
window.rtStress = rtStress;

function _syncUlToHtml(kind) {
  if (!sel || sel.dataset.type !== 'text') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);
  const chars = _toCharObjs(root.innerHTML);
  if (!chars.length) return;
  chars.forEach(ch => { _rtSetCharUl(ch.style, kind); });
  // Prefer grouped spans so underlines are continuous
  const newHtml = _charObjsToHtml(chars);
  root.innerHTML = newHtml;
  d.html = newHtml;
  if (typeof _rtNormalizeTextDisplay === 'function') _rtNormalizeTextDisplay(c, c.getAttribute('style') || '', d.bulletGap);
  _rtReapplyTextShadow(sel);
}

function rtSuperscript() {
  if (!_applyToSelection('vertical-align','super')) {
    if (!sel||sel.dataset.type!=='text') return;
    const root = _rtContent(sel.querySelector('.ec'));
    const allChars = root ? Array.from(root.querySelectorAll('span[data-ch]')) : [];
    const allSuper = allChars.length > 0 && allChars.every(c => c.style.verticalAlign === 'super');
    _setTSWhole('vertical-align', allSuper ? '' : 'super');
  } else {
    _rtCommit();
  }
  rtUpdateToolbarState();
}

function rtSubscript() {
  if (!_applyToSelection('vertical-align','sub')) {
    if (!sel||sel.dataset.type!=='text') return;
    const root = _rtContent(sel.querySelector('.ec'));
    const allChars = root ? Array.from(root.querySelectorAll('span[data-ch]')) : [];
    const allSub = allChars.length > 0 && allChars.every(c => c.style.verticalAlign === 'sub');
    _setTSWhole('vertical-align', allSub ? '' : 'sub');
  } else {
    _rtCommit();
  }
  rtUpdateToolbarState();
}

function rtColor(color, schemeRef) {
  // hasSelection: live selection OR saved selection from before color picker click
  const wSel = window.getSelection();
  const hasLive = wSel && !wSel.isCollapsed && wSel.toString().length > 0;
  const hasSaved = !!_savedSelIdx;
  const hasSelection = hasLive || hasSaved;
  // Debug: log state to console
  if (window._rtDebug) console.log('[rtColor]', {color, hasLive, hasSaved, _rtEl: !!_rtEl, _savedSelIdx});

  if (hasSelection && _rtEl) {
    _applyToSelection._schemeRef = schemeRef;
    const applied = _applyToSelection('color', color);
    _applyToSelection._schemeRef = undefined;
    if (!applied) { if (!sel || sel.dataset.type !== 'text') return; _setTSWhole('color', color); return; }
    _rtCommit();
    saveState();
  } else {
    if (!sel || sel.dataset.type !== 'text') return;
    _savedSelIdx = null; // whole-element color — clear any saved fragment selection
    _setTSWhole('color', color);
  }
  try { const _sw=document.getElementById('p-col-preview');if(_sw)_sw.style.background=color; document.getElementById('p-hex').value=(typeof _colorFieldDisplay==='function')?_colorFieldDisplay(color,schemeRef||null):color; } catch(e) {}
}

function rtFontSize(size) {
  if (!size || size < 1) return;
  size = Math.round(size * 96 / 72); // pt -> px
  // Use live selection OR saved selection (same as rtColor)
  const hasLive = (function() {
    if (!_rtEl) return false;
    const root = _rtContent(_rtEl);
    const parentEl = _rtEl.closest('.el');
    if (!parentEl || !sel || parentEl !== sel) return false;
    const idx = _readSelFromDOM(root);
    return !!(idx && idx.end > idx.start);
  })();
  const hasSaved = !!_savedSelIdx && !!_rtEl;

  if (hasLive || hasSaved) {
    _applyToSelection('font-size', size + 'px');
    _rtCommit();
  } else {
    if (_rtEl) _rtCommit();
    _setTSWhole('font-size', size + 'px');
  }
  if (typeof rtUpdateListIconSize === 'function') rtUpdateListIconSize();
}

function rtFontFamily(family) {
  const val = family ? `'${family}'` : '';
  const hasSelection = _applyToSelection('font-family', val);
  if (hasSelection) {
    _rtCommit();
  } else {
    // Apply to whole block — also clear font-family from all child spans
    // so container font-family actually takes effect
    if (sel && sel.dataset.type === 'text') {
      const ec = sel.querySelector('.ec');
      if (ec) {
        ec.querySelectorAll('span[style]').forEach(sp => {
          sp.style.fontFamily = '';
          if (!sp.getAttribute('style').trim().replace(/;/g,'')) sp.removeAttribute('style');
        });
      }
    }
    _setTSWhole('font-family', val);
  }
}

function rtFontWeight(weight) {
  if (_applyToSelection('font-weight', weight)) _rtCommit();
  else _setTSWhole('font-weight', weight);
}

function resetTextFormatting() {
  if (!sel||sel.dataset.type!=='text') return;
  pushUndo();
  const d = slides[cur].els.find(e=>e.id===sel.dataset.id); if (!d) return;
  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);
  const text = _toCharObjs(root.innerHTML).map(o=>o.ch==='\n'?'\n':o.ch).join('');
  root.innerHTML = _charObjsToHtml([...text].map(ch=>({ch,style:{}})));
  d.html = root.innerHTML;
  if (typeof _rtNormalizeTextDisplay === 'function') _rtNormalizeTextDisplay(c, c.getAttribute('style') || '', d.bulletGap);
  _rtReapplyTextShadow(sel);
  commitAll(); syncProps();
  toast((t('toastFormattingReset')),'ok');
}

function toggleFmt(fmt) {
  if (fmt==='bold')           rtBold();
  else if (fmt==='italic')    rtItalic();
  else if (fmt==='underline') rtUnderline();
}

function setTS(prop, val) {
  if (!sel||sel.dataset.type!=='text') return;
  if (['text-align','line-height','letter-spacing','text-transform'].includes(prop)) {
    _setTSWhole(prop,val); return;
  }
  if (_applyToSelection(prop,val)) {
    _rtCommit();
    // Keep .cs in sync so styles survive reload
    _setTSWhole(prop,val);
  } else _setTSWhole(prop,val);
}

function onColorPick(v, mode, schemeRef) {
  if (mode==='text') { if(typeof applyTextColor==='function') applyTextColor(v, schemeRef); else rtColor(v); }
  else if (mode==='fill') applyFillColor(v, schemeRef);
}

function onColorHex(v, mode) {
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
  if (mode==='text') { rtColor(v); try{const _sw=document.getElementById('p-col-preview');if(_sw)_sw.style.background=v;}catch(e){} }
  else if (mode==='fill') applyFillColor(v);
}

// ─── Toolbar state ────────────────────────────────────────────────
function _rtPxToPt(px) {
  return Math.round(parseFloat(px) * 72 / 96);
}

function _rtCursorFontSizePx(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root) return null;
  const r = sel.getRangeAt(0);
  if (!root.contains(r.commonAncestorContainer)) return null;
  let node = r.startContainer;
  if (node.nodeType === 3) node = node.parentElement;
  while (node && node !== root) {
    if (node.nodeType === 1) {
      if (node.hasAttribute && node.hasAttribute('data-br-anchor')) {
        node = node.parentElement;
        continue;
      }
      const st = (node.getAttribute && node.getAttribute('style')) || '';
      const m = st.match(/font-size\s*:\s*([\d.]+)px/i);
      if (m) return parseFloat(m[1]);
      if (node.hasAttribute && node.hasAttribute('data-ch')) {
        const fs = parseFloat(window.getComputedStyle(node).fontSize);
        if (fs) return fs;
      }
    }
    node = node.parentElement;
  }
  const tel = root.closest('.tel') || root.closest('.ec') || root;
  const cs = (tel.getAttribute && tel.getAttribute('style')) || '';
  const m = cs.match(/font-size\s*:\s*([\d.]+)px/i);
  if (m) return parseFloat(m[1]);
  return parseFloat(window.getComputedStyle(tel).fontSize) || null;
}

function _rtUpdateFontSizeInput(root) {
  try {
    const inp = document.getElementById('p-fs');
    if (!inp) return;
    const fsPx = root ? _rtCursorFontSizePx(root) : null;
    if (fsPx) {
      inp.value = String(_rtPxToPt(fsPx));
      inp.placeholder = '';
    }
  } catch (e) {}
}

function rtUpdateToolbarState() {
  try {
    const hint = document.getElementById('sel-hint');
    const s = window.getSelection();
    const hasSel = s && s.rangeCount > 0 && !s.isCollapsed;
    if (hint) hint.style.display = hasSel ? 'inline' : 'none';
    const setOn = (id,on) => { const b=document.getElementById(id); if(b) b.classList.toggle('on',!!on); };
    const ulOf = (dec) => _rtParseUnderline(dec);

    // When no text is selected, reflect the state of ALL chars in the active editor
    if (!hasSel && _rtEl) {
      const root = _rtContent(_rtEl);
      const allChars = Array.from(root.querySelectorAll('span[data-ch], span[data-ul]'));
      if (allChars.length > 0) {
        setOn('ft-b',   allChars.every(c => parseInt(window.getComputedStyle(c).fontWeight||'400') >= 600));
        setOn('ft-i',   allChars.every(c => window.getComputedStyle(c).fontStyle === 'italic'));
        {
          const uls = allChars.map(_rtUlFromNode);
          const ul = uls.every(s => s === uls[0]) ? uls[0] : (uls.find(s => s !== 'none') || 'none');
          _rtUpdateUnderlineBtn(ul);
        }
        setOn('ft-sup', allChars.every(c => c.style.verticalAlign === 'super'));
        setOn('ft-sub', allChars.every(c => c.style.verticalAlign === 'sub'));
        {
          setOn('ft-stress', !!root.querySelector('[data-stress]'));
        }
        _updateListButtonState();
        _rtUpdateFontSizeInput(root);
        _rtUpdateColorInputForCaret(s, root);
        return;
      }
      // Fallback: no spans yet — read from element style
      const cs0 = window.getComputedStyle(root);
      setOn('ft-b',   parseInt(cs0.fontWeight||'400') >= 600);
      setOn('ft-i',   cs0.fontStyle === 'italic');
      _rtUpdateUnderlineBtn(ulOf(cs0.textDecoration));
      setOn('ft-sup', false);
      setOn('ft-sub', false);
      setOn('ft-stress', false);
      _updateListButtonState();
      _rtUpdateFontSizeInput(root);
      _rtUpdateColorInputForCaret(s, root);
      return;
    }

    let el2 = null;
    if (s && s.rangeCount > 0) {
      const anc = s.getRangeAt(0).commonAncestorContainer;
      el2 = anc.nodeType===3 ? anc.parentElement : anc;
    }
    if (!el2) return;
    const cs = window.getComputedStyle(el2);
    setOn('ft-b',   parseInt(cs.fontWeight)>=600);
    setOn('ft-i',   cs.fontStyle==='italic');
    _rtUpdateUnderlineBtn(_rtUlFromNode(el2));
    setOn('ft-sup', !!(el2.style&&el2.style.verticalAlign==='super'));
    setOn('ft-sub', !!(el2.style&&el2.style.verticalAlign==='sub'));
    if (hasSel && _rtEl) {
      try {
        const root = _rtContent(_rtEl);
        const idx = _readSelFromDOM(root) || _savedSelIdx;
        if (idx) {
          const chars = _toCharObjs(root.innerHTML);
          setOn('ft-stress', _rtSelectionHasStress(chars, idx.start, idx.end));
        } else {
          setOn('ft-stress', (s.toString() || '').indexOf(_RT_STRESS) >= 0);
        }
      } catch (e) { setOn('ft-stress', false); }
    } else {
      setOn('ft-stress', false);
    }
    _updateListButtonState();
    if (hasSel) {
      try {
        const swEl = document.getElementById('p-col-preview');
        const hexEl = document.getElementById('p-hex');
        const colors = _rtColorsInSelection(s);
        if (colors && colors.length === 1) {
          if (swEl) swEl.style.background = colors[0];
          if (hexEl) hexEl.value = colors[0];
        } else if (colors && colors.length > 1) {
          if (swEl) swEl.style.background = '';
          if (hexEl) hexEl.value = '';
        } else {
          const hex = _rgbToHex(cs.color);
          if (hex) { if (swEl) swEl.style.background = hex; if (hexEl) hexEl.value = hex; }
        }
      } catch(e) {}
      // Font size: show value only if all selected chars are same size, else blank
      try {
        const inp = document.getElementById('p-fs');
        if (inp) {
          const selChars = _getSelectionCharEls();
          if (selChars && selChars.length > 0) {
            const sizes = [...new Set(selChars.map(c => Math.round(parseFloat(window.getComputedStyle(c).fontSize)||0)))];
            inp.value = sizes.length === 1 ? String(_rtPxToPt(sizes[0])) : '';
            inp.placeholder = sizes.length === 1 ? '' : '—';
          } else {
            const fs = parseFloat(cs.fontSize);
            if (fs) inp.value = String(_rtPxToPt(fs));
          }
        }
      } catch(e){}
    } else {
      _rtUpdateFontSizeInput(_rtEl ? _rtContent(_rtEl) : null);
    }
  } catch(e) {}
}

// Returns array of char span elements currently selected (via browser selection in _rtEl)
// Sync the text-color swatch/hex field to the color at the caret (collapsed
// selection — no text highlighted). Looks at the char immediately before the
// caret first (matches how typing/IME and most editors define "current
// color"), falling back to the char immediately after if at the very start.
function _rtUpdateColorInputForCaret(s, root) {
  try {
    if (!s || s.rangeCount === 0) return;
    const r = s.getRangeAt(0);
    const node = r.startContainer;
    const offset = r.startOffset;
    let charSpan = null;

    // Find the nearest ancestor (up to root) that actually carries an
    // explicit inline color — covers both per-character data-ch spans and
    // plain multi-character spans produced by coloring a whole selection.
    function nearestColoredAncestor(n) {
      let cur = n && n.nodeType === 3 ? n.parentElement : n;
      while (cur && cur !== root) {
        if (cur.style && cur.style.color) return cur;
        cur = cur.parentElement;
      }
      return null;
    }

    if (node.nodeType === 3) {
      charSpan = nearestColoredAncestor(node);
    } else if (node.nodeType === 1) {
      // Caret between element children — pick the char right before the
      // caret (offset-1), falling back to right after (offset) at position 0.
      const before = node.childNodes[offset - 1];
      const after = node.childNodes[offset];
      charSpan = nearestColoredAncestor(before) || nearestColoredAncestor(after);
    }

    const swEl = document.getElementById('p-col-preview');
    const hexEl = document.getElementById('p-hex');
    if (charSpan) {
      const hex = _rgbToHex(window.getComputedStyle(charSpan).color);
      if (hex) { if (swEl) swEl.style.background = hex; if (hexEl) hexEl.value = hex; }
    } else if (root) {
      // No explicitly-colored ancestor here — fall back to the block's base color.
      const hex = _rgbToHex(window.getComputedStyle(root).color);
      if (hex) { if (swEl) swEl.style.background = hex; if (hexEl) hexEl.value = hex; }
    }
  } catch(e) {}
}

// Returns the set of distinct text colors (as hex) found among the text
// nodes that intersect the given Selection's range. Works for both
// per-character data-ch spans and plain multi-character colored spans.
function _rtColorsInSelection(s) {
  if (!s || s.rangeCount === 0) return null;
  const range = s.getRangeAt(0);
  const root = range.commonAncestorContainer.nodeType === 3
    ? range.commonAncestorContainer.parentElement
    : range.commonAncestorContainer;
  if (!root) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const colors = new Set();
  let node;
  while ((node = walker.nextNode())) {
    if (!range.intersectsNode(node)) continue;
    if (!node.textContent || !node.textContent.length) continue;
    const hex = _rgbToHex(window.getComputedStyle(node.parentElement).color);
    if (hex) colors.add(hex);
  }
  return [...colors];
}

function _getSelectionCharEls() {
  if (!_rtEl) return null;
  const root = _rtContent(_rtEl);
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const spans = Array.from(root.querySelectorAll('span[data-ch]'));
  return spans.filter(sp => range.intersectsNode(sp));
}

function _rgbToHex(rgb) {
  if (!rgb) return null;
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return null;
  return '#'+[m[1],m[2],m[3]].map(n=>(+n).toString(16).padStart(2,'0')).join('');
}


// ─── List helpers ─────────────────────────────────────────────────

// Current bullet icon id (stored on active text element)
function _getBulletIconId() {
  if (!sel || sel.dataset.type !== 'text') return null;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  return (d && d.bulletIconId) || (typeof ICONS !== 'undefined' && ICONS[0] ? ICONS[0].id : null);
}

function _getBulletSvg(iconId, fontSize, style, color, sw) {
  if (typeof ICONS === 'undefined') return '•';
  const ic = ICONS.find(i => i.id === iconId) || ICONS[0];
  if (!ic) return '•';
  const sz = Math.round(parseFloat(fontSize) || 24);
  // Use _buildBulletIconSVG if available (from 29-icons.js), fallback to simple SVG
  if (typeof _buildBulletIconSVG === 'function') {
    return _buildBulletIconSVG(ic, sz, style || 'stroke', color || 'currentColor', sw || 1.8);
  }
  // Fallback: simple stroke SVG using ic.p
  const paths = (ic.p || '').split('||').map(p => p.trim()).filter(Boolean);
  const pathEls = paths.map(p => `<path d="${p}"/>`).join('');
  return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0;pointer-events:none">${pathEls}</svg>`;
}

// Split d.html into lines (by <br>), apply/remove markers, rejoin
function _getHtmlLines(html) {
  // Split on <br> tags (various forms)
  return html.split(/<br\s*\/?>/i);
}

function _joinHtmlLines(lines) {
  return lines.join('<br>');
}

function _lineHasMarker(line) {
  return /<span[^>]*data-list-/i.test(line);
}

function _stripLineMarker(line) {
  return line.replace(/<span[^>]*data-list-[^>]*>[\s\S]*?<\/span>/i, '').replace(/^(&nbsp;|\s)+/, '');
}

const _RT_NUM_STYLES = ['decimal', 'roman', 'alpha'];

function _rtToRoman(n) {
  const pairs = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let v = Math.max(1, Math.floor(n) || 1);
  let out = '';
  for (const [val, sym] of pairs) {
    while (v >= val) { out += sym; v -= val; }
  }
  return out;
}

function _rtToAlpha(n) {
  let v = Math.max(1, Math.floor(n) || 1);
  let out = '';
  while (v > 0) {
    v--;
    out = String.fromCharCode(65 + (v % 26)) + out;
    v = Math.floor(v / 26);
  }
  return out;
}

function _rtFormatListNum(n, style) {
  if (style === 'roman') return _rtToRoman(n) + '.';
  if (style === 'alpha') return _rtToAlpha(n) + '.';
  return n + '.';
}

function _rtDetectNumStyleFromText(text) {
  const t = String(text || '').replace(/\.$/, '').trim();
  if (/^\d+$/.test(t)) return 'decimal';
  if (/^[IVXLCDM]+$/i.test(t)) return 'roman';
  if (/^[A-Za-z]+$/.test(t)) return 'alpha';
  return 'decimal';
}

function _lineNumStyle(line) {
  if (!/data-list-num/i.test(line)) return null;
  const m = line.match(/data-num-style="([^"]+)"/i);
  if (m && _RT_NUM_STYLES.indexOf(m[1]) >= 0) return m[1];
  const tm = line.match(/data-list-num[^>]*>([^<]*)/i);
  return _rtDetectNumStyleFromText(tm ? tm[1] : '');
}

function _lineNumColor(line) {
  const m = line.match(/data-num-color="([^"]*)"/i);
  return m ? m[1] : '';
}

function _lineNumSchemeRef(line) {
  const m = line.match(/data-num-schemeref="([^"]*)"/i);
  if (!m) return null;
  try { return JSON.parse(m[1].replace(/&quot;/g, '"')); } catch (e) { return null; }
}

function _rtCountLineChars(lineHtml) {
  const tmp = document.createElement('div');
  tmp.innerHTML = lineHtml;
  let lineLen = 0;
  function countNode(node) {
    if (node.nodeType === 3) { lineLen += node.textContent.length; return; }
    if (node.nodeType === 1) {
      if (node.tagName === 'BR') { lineLen += 1; return; }
      if (node.hasAttribute('data-list-bullet') || node.hasAttribute('data-list-num')) { lineLen += 1; return; }
      if (node.hasAttribute('data-br-anchor')) return;
      for (const ch of node.childNodes) countNode(ch);
    }
  }
  for (const ch of tmp.childNodes) countNode(ch);
  return lineLen;
}

function _rtMapSelThroughLines(oldIdx, lineOffsets, newLines) {
  function mapOne(oldPos) {
    let newPos = 0;
    for (let i = 0; i < lineOffsets.length; i++) {
      const oldLen = lineOffsets[i].end - lineOffsets[i].start;
      const newLen = _rtCountLineChars(newLines[i]);
      if (oldPos >= lineOffsets[i].start && oldPos <= lineOffsets[i].end) {
        const withinLine = oldPos - lineOffsets[i].start;
        const shifted = Math.max(0, Math.min(newLen, withinLine + (newLen - oldLen)));
        return newPos + shifted;
      }
      newPos += newLen + 1;
    }
    return newPos;
  }
  const start = mapOne(oldIdx.start);
  const end = mapOne(oldIdx.end);
  return start <= end ? { start, end } : { start: end, end: start };
}

// Returns the set of marker spans (span[data-list-bullet] or span[data-list-num])
// that fall within the current selection on `root`, using the same line-overlap
// logic as _applyListToElement. If there's no selection, returns ALL markers
// (matching the "no selection = whole block" convention used elsewhere).
function _getTargetedMarkers(root) {
  const allMarkers = Array.from(root.querySelectorAll('span[data-list-bullet], span[data-list-num]'));
  const selIdx = _getSelOrCaretIdx(root);
  if (!selIdx) return allMarkers;

  const html = _htmlWithoutStruts(root.innerHTML);
  const lines = _getHtmlLines(html);
  const lineOffsets = [];
  {
    let pos = 0;
    lines.forEach((lineHtml) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = lineHtml;
      let lineLen = 0;
      function countNode(node) {
        if (node.nodeType === 3) { lineLen += node.textContent.length; return; }
        if (node.nodeType === 1) {
          if (node.tagName === 'BR') { lineLen += 1; return; }
          if (node.hasAttribute('data-list-bullet') || node.hasAttribute('data-list-num')) { lineLen += 1; return; }
          if (node.hasAttribute('data-br-anchor')) return;
          for (const ch of node.childNodes) countNode(ch);
        }
      }
      for (const ch of tmp.childNodes) countNode(ch);
      lineOffsets.push({ start: pos, end: pos + lineLen });
      pos += lineLen + 1;
    });
  }
  const selectedLineIndices = new Set();
  const isCaretPoint = selIdx.start === selIdx.end;
  lineOffsets.forEach(({ start, end }, i) => {
    const overlaps = isCaretPoint
      ? (selIdx.start >= start && selIdx.start < end) || (selIdx.start === end && i === lineOffsets.length - 1)
      : (selIdx.start < end && selIdx.end > start);
    if (overlaps) selectedLineIndices.add(i);
  });
  // Map each live marker span to its line index by counting <br>s before it.
  let lineIdx = 0;
  const targeted = [];
  const root2 = root;
  (function walk(node) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 1 && child.tagName === 'BR') { lineIdx++; continue; }
      if (child.nodeType === 1 && child.hasAttribute && child.hasAttribute('data-br-anchor')) continue;
      if (child.nodeType === 1 && (child.hasAttribute('data-list-bullet') || child.hasAttribute('data-list-num'))) {
        if (selectedLineIndices.has(lineIdx)) targeted.push(child);
        continue;
      }
      if (child.nodeType === 1) walk(child);
    }
  })(root2);
  return targeted;
}
window._getTargetedMarkers = _getTargetedMarkers;

function _applyListToElement(listType) {
  if (!sel || sel.dataset.type !== 'text') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  debouncedPushUndo();

  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);

  // Get font size from element style
  const cs = c.getAttribute('style') || '';
  const fsMatch = cs.match(/font-size:\s*([\d.]+)px/);
  const fontSize = fsMatch ? fsMatch[1] : '24';
  _lastBulletFontSize = parseFloat(fontSize);

  // Bullet markers always use currentColor so they inherit text color from scheme
  const iconStyle = document.getElementById('ic-style') ? document.getElementById('ic-style').value : 'stroke';
  const iconColor = 'currentColor';
  const iconSw = parseFloat(document.getElementById('ic-sw') ? document.getElementById('ic-sw').value : '1.8') || 1.8;
  const iconId = _getBulletIconId();

  // Determine which lines are "selected" (by char offset range).
  // Only a real non-collapsed text selection targets specific lines.
  // Caret-only or just the text block selected (not editing) → all lines.
  const isEditing = sel.dataset.editing === 'true';
  const liveRange = isEditing ? _readSelFromDOM(root) : null;
  const savedRange = (isEditing && _savedSelIdx && _savedSelIdx.start < _savedSelIdx.end)
    ? _savedSelIdx : null;
  const selIdx = liveRange || savedRange;
  const caretForRestore = (!selIdx && isEditing)
    ? (_readCollapsedCaretIdx(root) || (_savedSelIdx && _savedSelIdx.start === _savedSelIdx.end ? _savedSelIdx : null))
    : null;
  const html = _htmlWithoutStruts(root.innerHTML);
  const lines = _getHtmlLines(html);

  // Build cumulative char-offset ranges per line (counting markers as 1, brs as 1)
  // We track start-offset of each line's content in the flattened char stream
  const lineOffsets = []; // [{start, end}] for each line
  {
    let pos = 0;
    lines.forEach((lineHtml, i) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = lineHtml;
      // Count chars in this line the same way _toCharObjs does
      let lineLen = 0;
      function countNode(node) {
        if (node.nodeType === 3) { lineLen += node.textContent.length; return; }
        if (node.nodeType === 1) {
          if (node.tagName === 'BR') { lineLen += 1; return; }
          if (node.hasAttribute('data-list-bullet') || node.hasAttribute('data-list-num')) { lineLen += 1; return; }
          if (node.hasAttribute('data-br-anchor')) return;
          for (const ch of node.childNodes) countNode(ch);
        }
      }
      for (const ch of tmp.childNodes) countNode(ch);
      lineOffsets.push({ start: pos, end: pos + lineLen });
      pos += lineLen + 1; // +1 for the <br> separator between lines
    });
  }

  // Which line indices are covered by the selection?
  let selectedLineIndices;
  if (selIdx) {
    selectedLineIndices = new Set();
    lineOffsets.forEach(({ start, end }, i) => {
      if (selIdx.start < end && selIdx.end > start) selectedLineIndices.add(i);
    });
  } else {
    // No text highlight — apply to all lines of the block
    selectedLineIndices = new Set(lines.map((_, i) => i));
  }

  // Targeted non-empty lines decide apply / cycle / toggle-off
  const targetedNonEmpty = lines.filter((l, i) =>
    selectedLineIndices.has(i) && l.replace(/<[^>]*>/g,'').trim()
  );

  let applyMode = 'on'; // 'on' | 'off'
  let numStyle = 'decimal';
  if (listType === 'bullet') {
    const allHaveBullet = targetedNonEmpty.length > 0 && targetedNonEmpty.every(l =>
      /data-list-bullet/i.test(l)
    );
    applyMode = allHaveBullet ? 'off' : 'on';
  } else {
    // Numbered: decimal → roman → alpha → off
    const styles = targetedNonEmpty.map(l => _lineNumStyle(l));
    const allHaveNum = styles.length > 0 && styles.every(s => s != null);
    const uniform = allHaveNum && styles.every(s => s === styles[0]) ? styles[0] : null;
    if (uniform === 'decimal') numStyle = 'roman';
    else if (uniform === 'roman') numStyle = 'alpha';
    else if (uniform === 'alpha') applyMode = 'off';
    else numStyle = 'decimal';
  }

  let numIdx = 0; // running index for numbered list (only targeted lines)
  const newLines = lines.map((line, i) => {
    const stripped = _stripLineMarker(line);
    if (!selectedLineIndices.has(i)) return line; // not targeted — leave untouched
    if (applyMode === 'off') return stripped;
    if (!stripped.replace(/<[^>]*>/g,'').trim()) return stripped; // skip empty

    numIdx++;
    let marker;
    if (listType === 'bullet') {
      const svg = _getBulletSvg(iconId, fontSize, iconStyle, iconColor, iconSw);
      marker = `<span data-list-bullet data-icon-id="${iconId}" data-icon-style="${iconStyle}" data-icon-color="${iconColor}" data-icon-sw="${iconSw}" contenteditable="false" style="${_rtMarkerBulletCss(null, root)}" onclick="rtChangeBulletIcon(this)">${svg}</span>`;
    } else {
      const prevColor = _lineNumColor(line);
      const prevScheme = _lineNumSchemeRef(line);
      const colorAttr = prevColor ? ` data-num-color="${prevColor}"` : '';
      const schemeAttr = prevScheme ? ` data-num-schemeref="${JSON.stringify(prevScheme).replace(/"/g,'&quot;')}"` : '';
      const colorStyle = prevColor ? _rtMarkerNumCss(null, root, prevColor) : _rtMarkerNumCss(null, root);
      marker = `<span data-list-num data-num-style="${numStyle}"${colorAttr}${schemeAttr} contenteditable="false" style="${colorStyle}">${_rtFormatListNum(numIdx, numStyle)}</span>`;
    }
    return marker + stripped;
  });

  const newHtml = _joinHtmlLines(newLines);
  // Map caret / selection through line length changes (marker add/remove = ±1).
  let selToRestore = null;
  if (selIdx) {
    selToRestore = _rtMapSelThroughLines(selIdx, lineOffsets, newLines);
  } else if (caretForRestore) {
    selToRestore = _rtMapSelThroughLines(caretForRestore, lineOffsets, newLines);
  }
  root.innerHTML = newHtml;
  d.html = newHtml;
  if (listType === 'bullet') d.bulletIconId = iconId;
  _attachBulletClickHandlers(root);
  _rtApplyMarkerVerticalAlign(root, parseFloat(fontSize));
  if (typeof _rtNormalizeTextDisplay === 'function') _rtNormalizeTextDisplay(c, cs, d.bulletGap);
  _rtReapplyTextShadow(sel);
  if (selToRestore) {
    // Keep mapped indices so the next toolbar click can still target the same
    // lines even if the live DOM selection briefly disappears.
    if (selToRestore.start < selToRestore.end) _savedSelIdx = selToRestore;
    const focusEl = (typeof _rtEl !== 'undefined' && _rtEl) || root;
    const _idx = selToRestore;
    const _root = root;
    requestAnimationFrame(() => {
      if (focusEl && focusEl.contentEditable === 'true' && document.activeElement !== focusEl) {
        try { focusEl.focus({ preventScroll: true }); } catch (e) { try { focusEl.focus(); } catch (e2) {} }
      }
      if (_idx.start === _idx.end) {
        _restoreCaretToCharIndex(_idx.start, _root);
      } else {
        _restoreSelToDOM(_idx, _root);
        _savedSelIdx = _idx;
        _rtSaveRange();
      }
      _updateListButtonState();
    });
  }
  commitAll();
  _updateListButtonState();
}

function rtBulletList() { _applyListToElement('bullet'); }
function rtNumberedList() { _applyListToElement('num'); }
window.rtBulletList = rtBulletList;
window.rtNumberedList = rtNumberedList;

// Attach click handlers to bullet icons in a root element
function _attachBulletClickHandlers(root) {
  root.querySelectorAll('span[data-list-bullet]').forEach(span => {
    span.onclick = function() { rtChangeBulletIcon(this); };
  });
}
window._attachBulletClickHandlers = _attachBulletClickHandlers;

// Called when user clicks a bullet icon — opens icon picker
function rtChangeBulletIcon(bulletSpan) {
  if (!sel || sel.dataset.type !== 'text') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  // Flush any pending deferred commit first — otherwise it can fire while
  // the picker is open (after the user already chose an icon) and rebuild
  // the whole .tel DOM from the not-yet-updated data, silently discarding
  // the icon change. This is what made it "work on the second try": by then
  // the stale timer had already fired and there was nothing left to race.
  if (typeof _enterCommitTimer !== 'undefined' && _enterCommitTimer) {
    clearTimeout(_enterCommitTimer);
    _enterCommitTimer = null;
    if (typeof _rtCommit === 'function') _rtCommit();
    // Re-resolve bulletSpan: _rtCommit may have rebuilt the DOM, so the
    // original reference passed in could now be detached.
    if (bulletSpan && !bulletSpan.isConnected) {
      const idx = Array.prototype.indexOf.call(
        (bulletSpan.closest('.ec') || document).querySelectorAll?.('span[data-list-bullet]') || [],
        bulletSpan
      );
      const freshContainer = sel.querySelector('.ec');
      if (freshContainer) {
        const freshMarkers = freshContainer.querySelectorAll('span[data-list-bullet]');
        if (idx >= 0 && freshMarkers[idx]) bulletSpan = freshMarkers[idx];
      }
    }
  }
  // Open icon picker with callback to replace icon
  if (typeof openIconPickerForList === 'function') {
    openIconPickerForList(bulletSpan, d);
  }
}
window.rtChangeBulletIcon = rtChangeBulletIcon;

// Update bullet icon size when font size changes
function rtUpdateListIconSize() {
  if (!sel || sel.dataset.type !== 'text') return;
  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);
  const cs = c.getAttribute('style') || '';
  const fsMatch = cs.match(/font-size:\s*([\d.]+)px/);
  const sz = Math.round(parseFloat(fsMatch ? fsMatch[1] : '24'));
  _rtApplyMarkerVerticalAlign(root, sz);
}
window.rtUpdateListIconSize = rtUpdateListIconSize;

function _updateListButtonState() {
  if (!sel || sel.dataset.type !== 'text') return;
  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);
  const hasBullet = !!root.querySelector('span[data-list-bullet]');
  const hasNum    = !!root.querySelector('span[data-list-num]');
  const hasList   = hasBullet || hasNum;
  const setOn = (id, on) => { const b = document.getElementById(id); if (b) b.classList.toggle('on', on); };
  setOn('ft-ul', hasBullet);
  setOn('ft-ol', hasNum);
  const row = document.getElementById('bullet-color-row');
  if (row) row.style.display = hasList ? '' : 'none';
  if (!hasList) return;

  // Read color from data model (d.html) — reliable even after save/load round-trip
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  let col = null;
  let schemeRef = null;
  if (d && d.html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = d.html;
    const sp = tmp.querySelector('span[data-list-bullet]');
    if (sp) {
      col = sp.getAttribute('data-icon-color');
      const sr = sp.getAttribute('data-icon-schemeref');
      if (sr) { try { schemeRef = JSON.parse(sr); } catch (e) {} }
    }
    if (!col || col === 'currentColor') {
      const spn = tmp.querySelector('span[data-list-num]');
      if (spn) {
        const nc = spn.getAttribute('data-num-color') || spn.style.color || null;
        if (nc) col = nc;
        const sr = spn.getAttribute('data-num-schemeref');
        if (sr) { try { schemeRef = JSON.parse(sr); } catch (e) {} }
      }
    }
  }

  const preview = document.getElementById('bullet-color-preview');
  const hex = document.getElementById('bullet-color-hex');
  const gapEl = document.getElementById('bullet-marker-gap');
  let displayColor = (!col || col === 'currentColor') ? _getCurrentTextColor(c) : col;
  if (schemeRef && typeof _resolveSchemeColor === 'function') {
    const th = typeof _activeThemeForScheme === 'function' ? _activeThemeForScheme() : null;
    const resolved = th ? _resolveSchemeColor(schemeRef, th) : null;
    if (resolved) displayColor = resolved;
  }
  if (preview) preview.style.background = displayColor || '#ffffff';
  if (hex) {
    hex.value = (!col || col === 'currentColor')
      ? ''
      : ((typeof _colorFieldDisplay === 'function') ? _colorFieldDisplay(displayColor, schemeRef) : col);
  }
  if (gapEl) gapEl.value = _rtMarkerGapPx(null, sel);
}
window.rtUpdateListButtonState = _updateListButtonState;
let _lastBulletColor = null;

// Get resolved text color from .ec style (for currentColor display)
function _getCurrentTextColor(ecEl) {
  const cs = ecEl ? ecEl.getAttribute('style') || '' : '';
  const m = cs.match(/\bcolor:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
  return m ? m[1] : '#ffffff';
}

// Selected lines with markers → only those; no real text highlight → all markers
function _rtMarkersForColorUpdate(root) {
  const wrap = root && root.closest && root.closest('.el');
  const isEditing = wrap && wrap.dataset.editing === 'true';
  const liveRange = isEditing ? _readSelFromDOM(root) : null;
  const savedRange = (isEditing && _savedSelIdx && _savedSelIdx.start < _savedSelIdx.end)
    ? _savedSelIdx : null;
  const selIdx = liveRange || savedRange;
  const lines = _getHtmlLines(root.innerHTML);
  let targetLines = null;
  if (selIdx) {
    let pos = 0;
    const indices = new Set();
    lines.forEach((lineHtml, i) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = lineHtml;
      let lineLen = 0;
      function countNode(node) {
        if (node.nodeType === 3) { lineLen += node.textContent.length; return; }
        if (node.nodeType === 1) {
          if (node.tagName === 'BR') { lineLen += 1; return; }
          if (node.hasAttribute('data-list-bullet') || node.hasAttribute('data-list-num')) { lineLen += 1; return; }
          if (node.hasAttribute('data-br-anchor')) return;
          for (const ch of node.childNodes) countNode(ch);
        }
      }
      for (const ch of tmp.childNodes) countNode(ch);
      const start = pos, end = pos + lineLen;
      if (selIdx.start < end && selIdx.end > start) indices.add(i);
      pos += lineLen + 1;
    });
    const anyMarker = [...indices].some(i => _lineHasMarker(lines[i]));
    if (anyMarker) targetLines = indices;
  }

  const bullets = [], nums = [];
  let lineIdx = 0;
  function walk(node) {
    if (node.nodeType !== 1) return;
    if (node.tagName === 'BR') { lineIdx++; return; }
    if (node.hasAttribute('data-list-bullet')) {
      if (!targetLines || targetLines.has(lineIdx)) bullets.push(node);
      return;
    }
    if (node.hasAttribute('data-list-num')) {
      if (!targetLines || targetLines.has(lineIdx)) nums.push(node);
      return;
    }
    for (const ch of node.childNodes) walk(ch);
  }
  for (const ch of root.childNodes) walk(ch);
  return { bullets, nums };
}

function rtBulletColorPick(color, schemeRef) {
  if (!sel || sel.dataset.type !== 'text') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  debouncedPushUndo();
  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);
  const cs = c.getAttribute('style') || '';
  const fsMatch = cs.match(/font-size:\s*([\d.]+)px/);
  const sz = Math.round(parseFloat(fsMatch ? fsMatch[1] : '24'));
  _lastBulletFontSize = sz;

  const { bullets, nums } = _rtMarkersForColorUpdate(root);
  bullets.forEach(sp => {
    sp.setAttribute('data-icon-color', color);
    if (schemeRef) sp.setAttribute('data-icon-schemeref', JSON.stringify(schemeRef));
    else sp.removeAttribute('data-icon-schemeref');
  });
  nums.forEach(sp => {
    if (color !== 'currentColor') {
      sp.style.color = color;
      sp.setAttribute('data-num-color', color);
      if (schemeRef) sp.setAttribute('data-num-schemeref', JSON.stringify(schemeRef));
      else sp.removeAttribute('data-num-schemeref');
    } else {
      sp.style.color = '';
      sp.removeAttribute('data-num-color');
      sp.removeAttribute('data-num-schemeref');
    }
  });
  _rtApplyMarkerVerticalAlign(root, sz);

  d.html = _htmlWithoutStruts(root.innerHTML);
  commitAll();

  // Force swatch update AFTER commitAll (syncProps may have reset it)
  const displayColor = color === 'currentColor' ? _getCurrentTextColor(c) : color;
  const preview = document.getElementById('bullet-color-preview');
  const hex = document.getElementById('bullet-color-hex');
  if (preview) preview.style.background = displayColor;
  if (hex) {
    hex.value = color === 'currentColor'
      ? ''
      : ((typeof _colorFieldDisplay === 'function') ? _colorFieldDisplay(color, schemeRef || null) : color);
  }
  // Cache the last picked bullet color so _updateListButtonState always shows it
  _lastBulletColor = color;
}

function rtBulletColorHex(val) {
  if (!val || !String(val).trim()) {
    rtBulletColorPick('currentColor', null);
    return;
  }
  if (typeof colorFieldOnInput === 'function') {
    colorFieldOnInput(val, 'bullet-color-preview', rtBulletColorPick);
    return;
  }
  const v = String(val).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    const preview = document.getElementById('bullet-color-preview');
    if (preview) preview.style.background = v;
    rtBulletColorPick(v, null);
  }
}
window.rtBulletColorHex = rtBulletColorHex;

function rtSetBulletGap(val) {
  if (!sel || sel.dataset.type !== 'text') return;
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;
  debouncedPushUndo();
  const g = Math.max(0, Math.min(80, isNaN(+val) ? _RT_MARKER_GAP_DEFAULT : +val));
  if (g === _RT_MARKER_GAP_DEFAULT) delete sel.dataset.bulletGap;
  else sel.dataset.bulletGap = g;
  const c = sel.querySelector('.ec'); if (!c) return;
  const root = _rtContent(c);
  const cs = c.getAttribute('style') || '';
  const fsMatch = cs.match(/font-size:\s*([\d.]+)px/);
  const sz = parseFloat(fsMatch ? fsMatch[1] : '24');
  _rtApplyMarkerVerticalAlign(root, sz, g);
  d.html = _htmlWithoutStruts(root.innerHTML);
  if (g === _RT_MARKER_GAP_DEFAULT) delete d.bulletGap;
  else d.bulletGap = g;
  save(); drawThumbs(); saveState();
}
window.rtSetBulletGap = rtSetBulletGap;

// Attach panel mousedown to save selection before toolbar button click steals focus
document.addEventListener('DOMContentLoaded', function(){
  const props = document.getElementById('props');
  if(props) props.addEventListener('mousedown', _rtOnPanelMousedown);
  // Capture-phase: set flag BEFORE blur fires when clicking props panel
  document.addEventListener('mousedown', function(e) {
    const propsEl = document.getElementById('props');
    if (propsEl && propsEl.contains(e.target)) {
      _rtPanelInteracting = true;
      _rtSaveRange();
      // For inputs/selects keep flag alive until they lose focus
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        e.target.addEventListener('blur', function() {
          _rtPanelInteracting = false;
        }, {once: true});
      } else {
        setTimeout(() => { _rtPanelInteracting = false; }, 300);
      }
    } else {
      _rtPanelInteracting = false;
    }
  }, true);
  // Keep _savedRange fresh whenever selection changes inside contenteditable
  document.addEventListener('selectionchange', function() {
    if (!_rtEl) return;
    const s = window.getSelection();
    if (s && s.rangeCount > 0 && !s.isCollapsed) {
      const r = s.getRangeAt(0);
      if (_rtEl.contains(r.commonAncestorContainer)) {
        _savedRange = r.cloneRange();
      }
    }
  });
});

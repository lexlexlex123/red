/**
 * Normalize LLM / external SVG elements for the editor.
 * Editor field is svgContent; decks often ship "svg" instead.
 */

/** Fix common LLM SVG markup so it paints in the editor / thumbs / export. */
export function repairImportedSvgMarkup(svg) {
  let t = String(svg || '').trim();
  if (!t) return t;
  if (!/^<svg\b/i.test(t) && /<svg\b/i.test(t)) {
    t = t.slice(t.search(/<svg\b/i));
  }
  if (/<svg\b/i.test(t) && !/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(t)) {
    t = t.replace(/<svg\b([^>]*)>/i, (_full, attrs) => {
      const a = String(attrs || '').replace(/\s*xmlns\s*=\s*["'][^"']*["']/i, '');
      return `<svg xmlns="http://www.w3.org/2000/svg"${a}>`;
    });
  }
  t = t.replace(
    /<text\b([^>]*)>([^<]*?)(?=<(?:\/?text|\/svg|circle|line|path|polygon|polyline|rect|g)\b)/gi,
    (m, attrs, body) => {
      if (/<\/text>\s*$/i.test(m)) return m;
      return `<text${attrs}>${body}</text>`;
    }
  );
  t = t.replace(/<text\b([^>]*)>([^<]*)$/i, (m, attrs, body) => {
    if (/<\/text>/i.test(m)) return m;
    return `<text${attrs}>${body}</text>`;
  });
  if (/<svg\b/i.test(t) && !/<\/svg>/i.test(t)) t += '</svg>';
  t = t.replace(/<svg\b([^>]*)>/i, (_m, attrs) => {
    const a = String(attrs || '')
      .replace(/\s*width\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*height\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*style\s*=\s*["'][^"']*["']/gi, '')
      // Fill the element box (side handles stretch like images; corners keep box aspect).
      .replace(/\s*preserveAspectRatio\s*=\s*["'][^"']*["']/gi, '');
    return `<svg${a} width="100%" height="100%" preserveAspectRatio="none" style="display:block;width:100%;height:100%">`;
  });
  return t;
}

/** Map el.svg → el.svgContent and repair markup. Returns new slides or same ref. */
export function migrateSvgFieldsInSlides(slides) {
  if (!Array.isArray(slides) || !slides.length) return slides;
  let changed = false;
  const next = slides.map((s) => {
    if (!s?.els) return s;
    let elsChanged = false;
    const els = s.els.map((el) => {
      if (!el) return el;
      const raw = el.svgContent || el.svg;
      if (!(el.type === 'svg' || raw) || !raw) return el;
      const fixed = repairImportedSvgMarkup(String(raw));
      if (el.svgContent === fixed && !el.svg && el.type === 'svg') return el;
      elsChanged = true;
      changed = true;
      const out = { ...el, type: el.type || 'svg', svgContent: fixed };
      delete out.svg;
      return out;
    });
    return elsChanged ? { ...s, els } : s;
  });
  return changed ? next : slides;
}

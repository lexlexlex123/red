/**
 * OS paste dispatch (v7.1 js/21-keyboard.js parity):
 * TSV → image → MAGIC/app clip → HTML frame → URL/QR → code → text → app clip.
 */

import { looksLikeHtmlDocument, containsHtmlTags } from './htmlFrame.js';
import { extractPasteUrl } from './pasteUrl.js';
import { detectPasteCodeLang, stripCodeFence } from './detectPasteCode.js';
import { htmlTableToTsv, isTsvText } from './tablePaste.js';
import {
  getAppClipAt,
  getLastBlurAt,
  getClipSource,
  hydrateFromSystemText,
  isSystemClipText,
  readOsClipboard,
  readOsSlideClipboard,
  peekLocalSlides,
} from './osClipboard.js';
import { getTheme, resolveSchemeColor } from './themes.js';
import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

function imgRank(t, name) {
  t = String(t || '').toLowerCase();
  name = String(name || '').toLowerCase();
  if (t === 'image/gif' || name.endsWith('.gif')) return 0;
  if (t === 'image/webp' || name.endsWith('.webp')) return 1;
  if (t === 'image/png') return 2;
  if (t === 'image/jpeg' || t === 'image/jpg') return 3;
  return 4;
}

function looksAnimatedSrc(src) {
  const s = String(src || '').toLowerCase();
  return /\.gif(\?|$)/i.test(s) || /\.webp(\?|$)/i.test(s) || s.startsWith('data:image/gif') || s.startsWith('data:image/webp');
}

function pushClipImg(list, f) {
  if (!f || !f.size) return;
  const t = String(f.type || '');
  const n = String(f.name || '').toLowerCase();
  if (
    t &&
    !t.startsWith('image/') &&
    t !== 'application/octet-stream' &&
    !/\.(gif|webp|png|jpe?g|bmp|avif)$/.test(n)
  ) {
    return;
  }
  list.push(f);
}

function collectOsImages(cd) {
  const osImageFiles = [];
  const items = cd?.items ? [...cd.items] : [];
  for (const it of items) {
    if (!it.type) continue;
    if (it.type.startsWith('image/') || it.kind === 'file') {
      try {
        pushClipImg(osImageFiles, it.getAsFile());
      } catch (e) {}
    }
  }
  if (cd?.files?.length) {
    for (const f of cd.files) {
      const t = String(f.type || '');
      const n = String(f.name || '').toLowerCase();
      if ((t.startsWith('image/') || /\.(gif|webp|png|jpe?g|bmp|avif)$/i.test(n)) && f.size) {
        pushClipImg(osImageFiles, f);
      }
    }
  }
  osImageFiles.sort((a, b) => imgRank(a.type, a.name) - imgRank(b.type, b.name));
  return { osImageFiles, items };
}

function parseHtmlImg(html) {
  if (!html) return null;
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const img = tmp.querySelector('img');
    if (!img) return null;
    const text = (tmp.innerText || tmp.textContent || '').trim();
    if (text && text.length > 40) return null;
    return img;
  } catch (e) {
    return null;
  }
}

function hasRealText(plain, html) {
  const p = String(plain || '').trim();
  if (p && !isSystemClipText(p)) return true;
  if (!html) return false;
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const t = (tmp.innerText || tmp.textContent || '').trim();
    return !!(t && t.length > 0 && !isSystemClipText(t));
  } catch (e) {
    return false;
  }
}

/**
 * @param {object} api editorApi
 * @param {{ plain?: string, html?: string, customClip?: string, osImageFiles?: Blob[], htmlImgEl?: Element|null, preferThumbStrip?: boolean }} bag
 */
export async function dispatchPaste(api, bag = {}) {
  const {
    plain = '',
    html = '',
    customClip = '',
    osImageFiles = [],
    htmlImgEl = null,
    preferThumbStrip = false,
  } = bag;

  const plainTrim = String(plain || '').trim();
  const isSysClip = isSystemClipText(plainTrim);
  const hasRealExternalText = !!plainTrim && !isSysClip;
  const copiedOutside = getLastBlurAt() > getAppClipAt();
  const osHasBitmap = osImageFiles.length > 0 || !!htmlImgEl;

  const pasteAppElements = async () => {
    const st = api._pasteReadStore?.() || null;
    let els = st?.clipboard?.els;
    try {
      const fromOs = await readOsClipboard(els || null);
      if (fromOs?.length) {
        els = fromOs;
        api._pasteSetElements?.(els);
      }
    } catch (e) {}
    if (!els?.length) return false;
    api._pasteElements?.(els);
    return true;
  };

  const pasteAppSlides = async () => {
    let slides = api._pasteReadStore?.()?.slideClipboard;
    // Match v7.1: always try localStorage first (like _xclipHydrateSlides)
    if (!slides?.length) {
      try {
        const fromOs = await readOsSlideClipboard();
        if (fromOs?.length) {
          slides = fromOs;
          api._pasteSetSlides?.(fromOs);
        }
      } catch (e) {}
    }
    // Fallback: try peeking directly from localStorage
    if (!slides?.length) {
      const localSlides = peekLocalSlides();
      if (localSlides?.length) {
        slides = localSlides;
        api._pasteSetSlides?.(localSlides);
      }
    }
    if (!slides?.length) return false;
    await api.pasteSlide?.();
    return true;
  };

  const pasteLastAppClip = async () => {
    // Use clipSource from store (set by copySlides)
    const storeClipSource = api._pasteReadStore?.()?.clipSource;
    const src = storeClipSource || getClipSource();
    // Match v7.1: if clipSource is 'slides', paste slides first
    if (src === 'slides') {
      if (await pasteAppSlides()) return true;
    }
    if (preferThumbStrip) {
      if (await pasteAppSlides()) return true;
    }
    if (await pasteAppElements()) return true;
    if (await pasteAppSlides()) return true;
    return false;
  };

  const applyMagic = async (text) => {
    if (!text) return false;
    if (osHasBitmap && copiedOutside) return false;
    const hydrated = hydrateFromSystemText(text, api._pasteReadStore?.()?.clipboard?.els || null);
    if (!hydrated) return false;
    if (hydrated.kind === 'slides' && hydrated.slides?.length) {
      api._pasteSetSlides?.(hydrated.slides);
      await api.pasteSlide?.();
      return true;
    }
    if (hydrated.kind === 'elements' && hydrated.elements?.length) {
      api._pasteSetElements?.(hydrated.elements);
      api._pasteElements?.(hydrated.elements);
      return true;
    }
    return false;
  };

  const pasteOsBitmap = async () => {
    const htmlSrc = htmlImgEl ? htmlImgEl.src || htmlImgEl.getAttribute?.('src') || '' : '';
    const htmlAnim = htmlSrc && looksAnimatedSrc(htmlSrc);
    if (!osImageFiles.length && !htmlSrc) return false;
    if (htmlAnim && (htmlSrc.startsWith('http') || htmlSrc.startsWith('data:') || htmlSrc.startsWith('blob:'))) {
      await api.addImageFromUrl?.(htmlSrc);
      return true;
    }
    const best = osImageFiles[0];
    if (best) {
      api.addImageFromFile?.(best);
      api._pasteToast?.(
        api._pasteRu?.() ? 'Изображение вставлено' : 'Image pasted',
        'ok'
      );
      return true;
    }
    if (htmlSrc && (htmlSrc.startsWith('http') || htmlSrc.startsWith('data:') || htmlSrc.startsWith('blob:'))) {
      await api.addImageFromUrl?.(htmlSrc);
      return true;
    }
    return false;
  };

  // Thumb strip: prefer slides
  if (preferThumbStrip) {
    if (await applyMagic(customClip) || await applyMagic(plain)) return true;
    if (await pasteAppSlides()) return true;
  }

  // 0. TSV / Excel
  if (plain && isTsvText(plain)) {
    if (await api.pasteTsvOrCreateTable?.(plain, html)) return true;
  }
  if (html && html.includes('<table')) {
    const tsv = htmlTableToTsv(html);
    if (tsv && isTsvText(tsv)) {
      if (await api.pasteTsvOrCreateTable?.(tsv, html)) return true;
    }
  }

  const pasteUrl = extractPasteUrl(plain, html);
  const textIsOnlyUrl = !!(
    pasteUrl &&
    plainTrim &&
    (plainTrim === pasteUrl || plainTrim.replace(/\/$/, '') === String(pasteUrl).replace(/\/$/, ''))
  );

  const isImagePaste =
    !isTsvText(plain) &&
    (osImageFiles.length > 0 || !!htmlImgEl) &&
    (!!htmlImgEl ||
      (!hasRealExternalText && !pasteUrl) ||
      (!!htmlImgEl && (textIsOnlyUrl || !hasRealExternalText)));

  // 1. Bitmap
  if (isImagePaste && (await pasteOsBitmap())) return true;

  // 2. MAGIC / app clip
  if (await applyMagic(customClip) || await applyMagic(plain)) return true;
  if (!isImagePaste && !pasteUrl && !(copiedOutside && hasRealExternalText) && (await pasteLastAppClip())) {
    return true;
  }

  // 2b. Code / text / HTML document — priority: code > htmlframe > plain text
  const hasHtmlContent = !!(html && html.trim());
  if (hasRealExternalText || hasHtmlContent) {
    let content = plainTrim;
    if (!content && html) {
      try {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        content = (tmp.innerText || tmp.textContent || '').trim();
      } catch (e) {}
    }
    if (content && !isSysClip) {
      // HTML content → htmlframe (check before code — HTML tags are a stronger signal)
      // 1) Plain text with HTML tags (user copied HTML source code as text)
      let htmlSrc = '';
      if (hasRealExternalText && (looksLikeHtmlDocument(plainTrim) || containsHtmlTags(plainTrim))) {
        htmlSrc = plainTrim;
      }
      // 2) Raw clipboard HTML with full document structure (user selected rendered page in browser)
      if (!htmlSrc && html && html.trim() && looksLikeHtmlDocument(String(html).trim())) {
        htmlSrc = String(html).trim();
      }
      if (htmlSrc) {
        api.applyHtmlFrame?.({ hfSrc: htmlSrc, w: 640, h: 400, hfScroll: true, hfChrome: true });
        api._pasteToast?.(api._pasteRu?.() ? 'HTML-блок вставлен' : 'HTML block pasted', 'ok');
        return true;
      }
      // Code detection — after HTML check so HTML tags aren't mistaken for code
      let codeSrc = stripCodeFence(content);
      const codeLang = detectPasteCodeLang(content);
      if (codeLang) {
        const lines = Math.max(1, codeSrc.split(/\r?\n/).length);
        const longest = codeSrc.split(/\r?\n/).reduce((m, l) => Math.max(m, l.length), 0);
        const h = Math.min(520, Math.max(140, 56 + lines * 20));
        const w = Math.min(760, Math.max(420, 80 + longest * 8));
        api.applyCode?.({ codeRaw: codeSrc, codeLang, w, h });
        return true;
      }
      // Pure URL → QR
      if (pasteUrl && textIsOnlyUrl && !htmlImgEl) {
        await api.addQrCode?.(pasteUrl);
        return true;
      }
      // Plain text
      api._pastePlainText?.(content);
      return true;
    }
  }

  // 5. Last app clip
  return await pasteLastAppClip();
}

/**
 * Handle document paste event.
 * @param {ClipboardEvent} e
 * @param {object} api editorApi facade hooks
 */
export async function handlePasteEvent(e, api) {
  const ae = document.activeElement;
  const editing = ae && (ae.isContentEditable || ae.contentEditable === 'true');
  const tag = ae?.tagName || '';
  const inInput = ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag);
  const inPreview = !!document.querySelector('.react-preview-ov.active, #preview-ov.active');
  if (inPreview) return false;

  const inTableCell =
    editing && ae?.closest?.('td,th') && ae?.closest?.('.react-el-table, .react-el[data-id]');
  if ((editing && !inTableCell) || (inTableCell && ae?.closest?.('[data-editing="true"]'))) {
    return false;
  }

  if (inInput) {
    const cd = e.clipboardData;
    let plain = '';
    let html = '';
    try {
      plain = cd?.getData('text/plain') || '';
      html = cd?.getData('text/html') || '';
    } catch (err) {}
    if (hasRealText(plain, html)) return false;
    // Object paste while focus in empty prop field
    const customClip = (() => {
      try {
        return cd?.getData('application/x-red-slides') || '';
      } catch (err) {
        return '';
      }
    })();
    const ok =
      (await dispatchPaste(api, { plain, html, customClip })) ||
      false;
    if (ok) {
      e.preventDefault();
      try {
        ae.blur?.();
      } catch (err) {}
    }
    return ok;
  }

  const cd = e.clipboardData;
  let { osImageFiles, items } = collectOsImages(cd);
  let html = '';
  let plain = '';
  let customClip = '';
  if (cd) {
    const textPromises = [];
    for (const item of items) {
      if (item.type === 'text/html') {
        textPromises.push(
          new Promise((res) => {
            try {
              item.getAsString((s) => {
                html = s;
                res();
              });
            } catch (err) {
              res();
            }
          })
        );
      } else if (item.type === 'text/plain') {
        textPromises.push(
          new Promise((res) => {
            try {
              item.getAsString((s) => {
                plain = s;
                res();
              });
            } catch (err) {
              res();
            }
          })
        );
      }
    }
    if (textPromises.length) await Promise.all(textPromises);
    if (!plain && typeof cd.getData === 'function') {
      try {
        plain = cd.getData('text/plain') || '';
      } catch (err) {}
      try {
        if (!html) html = cd.getData('text/html') || '';
      } catch (err) {}
    }
    try {
      customClip = cd.getData('application/x-red-slides') || '';
    } catch (err) {}
  }

  const needClipboardApi = !osImageFiles.some((f) => imgRank(f.type, f.name) <= 1);
  if (needClipboardApi && navigator.clipboard?.read) {
    try {
      const clipItems = await navigator.clipboard.read();
      for (const it of clipItems) {
        const types = (it.types || []).filter((t) => String(t).startsWith('image/'));
        types.sort((a, b) => imgRank(a) - imgRank(b));
        for (const typ of types) {
          try {
            const blob = await it.getType(typ);
            if (blob?.size) osImageFiles.push(blob);
          } catch (err) {}
        }
      }
      osImageFiles.sort((a, b) => imgRank(a.type, a.name) - imgRank(b.type, b.name));
    } catch (err) {}
  }

  const htmlImgEl = parseHtmlImg(html);
  const preferThumbStrip = !!document.activeElement?.closest?.('.thumb-strip') ||
    !!e.target?.closest?.('.thumb-strip');

  e.preventDefault();
  const ok = await dispatchPaste(api, {
    plain,
    html,
    customClip,
    osImageFiles,
    htmlImgEl,
    preferThumbStrip,
  });
  if (!ok) {
    api._pasteToast?.(
      api._pasteRu?.() ? 'Нечего вставлять' : 'Nothing to paste',
      'warn'
    );
  }
  return ok;
}

/**
 * Clipboard API path for context-menu Paste (no ClipboardEvent).
 */
export async function pasteWithoutEvent(api, opts = {}) {
  const preferThumbStrip = !!opts.preferThumbStrip;
  let plain = '';
  let html = '';
  const osImageFiles = [];
  try {
    if (navigator.clipboard?.read) {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const types = [...(it.types || [])];
        for (const typ of types) {
          if (String(typ).startsWith('image/')) {
            try {
              const blob = await it.getType(typ);
              if (blob?.size) osImageFiles.push(blob);
            } catch (e) {}
          } else if (typ === 'text/plain') {
            try {
              plain = await (await it.getType(typ)).text();
            } catch (e) {}
          } else if (typ === 'text/html') {
            try {
              html = await (await it.getType(typ)).text();
            } catch (e) {}
          }
        }
      }
      osImageFiles.sort((a, b) => imgRank(a.type, a.name) - imgRank(b.type, b.name));
    }
  } catch (e) {
    try {
      plain = (await navigator.clipboard.readText()) || '';
    } catch (err) {}
  }
  if (!plain) {
    try {
      plain = (await navigator.clipboard.readText()) || '';
    } catch (e) {}
  }

  const htmlImgEl = parseHtmlImg(html);

  // Fallback: if preferThumbStrip and no clipboard data, try localStorage for slides
  // This matches v7.1 behavior where slides are read from localStorage on paste
  if (preferThumbStrip) {
    const localSlides = peekLocalSlides();
    if (localSlides?.length) {
      // Set slides in store so pasteAppSlides can find them
      api._pasteSetSlides?.(localSlides);
    }
  }

  return dispatchPaste(api, {
    plain,
    html,
    customClip: isSystemClipText(plain) ? plain : '',
    osImageFiles,
    htmlImgEl,
    preferThumbStrip,
  });
}

/** Insert escaped plain text as a text element via api hooks. */
export function buildPastedTextFields(content, st) {
  const theme = getTheme(st.appliedThemeIdx);
  const scheme = { col: 7, row: 0 };
  const isDark = theme ? !!theme.dark : true;
  let color = isDark ? '#ffffff' : '#000000';
  const resolved = resolveSchemeColor(scheme, theme);
  if (resolved) color = resolved;
  const canvasW = st.canvasW || DEFAULT_CANVAS_W;
  const canvasH = st.canvasH || DEFAULT_CANVAS_H;
  const w = Math.min(Math.max(String(content).length * 14, 300), canvasW * 0.7);
  const h = Math.max(80, Math.ceil(String(content).split('\n').length * 48));
  const x = Math.round((canvasW - w) / 2);
  const y = Math.round((canvasH - h) / 2);
  const safeHtml = String(content)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  return {
    type: 'text',
    x,
    y,
    w,
    h,
    html: safeHtml,
    cs: `font-size:32px;font-weight:400;color:${color};text-align:left;line-height:1.3;`,
    textColor: color,
    textColorScheme: scheme,
    textRole: 'body',
    anims: [],
  };
}

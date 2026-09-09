/**
 * Presentation text translation (React port of Google path from js/47-translate.js).
 * Pair: localStorage sf-tr-lang1 / sf-tr-lang2 / sf-tr-deck.
 */

export const TRANSLATE_LANGS = [
  { code: 'ru', script: 'cyrl', nameRu: 'Русский', nameEn: 'Russian', btnRu: 'русский', btnEn: 'russian' },
  { code: 'en', script: 'latn', nameRu: 'Английский', nameEn: 'English', btnRu: 'английский', btnEn: 'english' },
  { code: 'zh-CN', script: 'hans', nameRu: 'Китайский', nameEn: 'Chinese', btnRu: 'китайский', btnEn: 'chinese' },
  { code: 'de', script: 'latn', nameRu: 'Немецкий', nameEn: 'German', btnRu: 'немецкий', btnEn: 'german' },
  { code: 'fr', script: 'latn', nameRu: 'Французский', nameEn: 'French', btnRu: 'французский', btnEn: 'french' },
  { code: 'es', script: 'latn', nameRu: 'Испанский', nameEn: 'Spanish', btnRu: 'испанский', btnEn: 'spanish' },
  { code: 'it', script: 'latn', nameRu: 'Итальянский', nameEn: 'Italian', btnRu: 'итальянский', btnEn: 'italian' },
  { code: 'pt', script: 'latn', nameRu: 'Португальский', nameEn: 'Portuguese', btnRu: 'португальский', btnEn: 'portuguese' },
  { code: 'pl', script: 'latn', nameRu: 'Польский', nameEn: 'Polish', btnRu: 'польский', btnEn: 'polish' },
  { code: 'uk', script: 'cyrl', nameRu: 'Украинский', nameEn: 'Ukrainian', btnRu: 'украинский', btnEn: 'ukrainian' },
  { code: 'be', script: 'cyrl', nameRu: 'Белорусский', nameEn: 'Belarusian', btnRu: 'белорусский', btnEn: 'belarusian' },
  { code: 'ja', script: 'jpan', nameRu: 'Японский', nameEn: 'Japanese', btnRu: 'японский', btnEn: 'japanese' },
  { code: 'ko', script: 'hang', nameRu: 'Корейский', nameEn: 'Korean', btnRu: 'корейский', btnEn: 'korean' },
  { code: 'ar', script: 'arab', nameRu: 'Арабский', nameEn: 'Arabic', btnRu: 'арабский', btnEn: 'arabic' },
  { code: 'tr', script: 'latn', nameRu: 'Турецкий', nameEn: 'Turkish', btnRu: 'турецкий', btnEn: 'turkish' },
  { code: 'kk', script: 'cyrl', nameRu: 'Казахский', nameEn: 'Kazakh', btnRu: 'казахский', btnEn: 'kazakh' },
];

const LS_TR1 = 'sf-tr-lang1';
const LS_TR2 = 'sf-tr-lang2';
const LS_TR_DECK = 'sf-tr-deck';
const DEF_TR1 = 'ru';
const DEF_TR2 = 'en';

let busy = false;

export function isTranslateBusy() {
  return busy;
}

export function setTranslateBusy(on) {
  busy = !!on;
}

export function normLangCode(code) {
  const c = String(code || '').trim();
  if (c === 'zh' || c === 'zh-Hans') return 'zh-CN';
  if (c === 'zh-Hant' || c === 'zh-TW') return 'zh-CN';
  return c;
}

export function langMeta(code) {
  const c = normLangCode(code);
  return TRANSLATE_LANGS.find((x) => x.code === c) || null;
}

export function langDisplayName(code, ru = true) {
  const m = langMeta(code);
  if (!m) return String(code || '');
  return ru ? m.nameRu : m.nameEn;
}

export function langBtnLabel(code, ru = true) {
  const m = langMeta(code);
  if (!m) return String(code || '');
  return ru ? m.btnRu : m.btnEn;
}

export function getTranslatePair() {
  let a = DEF_TR1;
  let b = DEF_TR2;
  try {
    a = localStorage.getItem(LS_TR1) || DEF_TR1;
    b = localStorage.getItem(LS_TR2) || DEF_TR2;
  } catch (e) {}
  a = normLangCode(a);
  b = normLangCode(b);
  if (!langMeta(a)) a = DEF_TR1;
  if (!langMeta(b)) b = DEF_TR2;
  if (a === b) b = a === 'en' ? 'ru' : 'en';
  return { lang1: a, lang2: b };
}

export function setTranslatePair(lang1, lang2) {
  const a = normLangCode(lang1);
  const b = normLangCode(lang2);
  if (!langMeta(a) || !langMeta(b) || a === b) return false;
  try {
    localStorage.setItem(LS_TR1, a);
    localStorage.setItem(LS_TR2, b);
  } catch (e) {}
  return true;
}

export function getTranslateDeckLang() {
  const pair = getTranslatePair();
  let code = pair.lang2;
  try {
    code = localStorage.getItem(LS_TR_DECK) || code;
  } catch (e) {}
  code = normLangCode(code);
  if (!langMeta(code)) code = pair.lang2;
  return code;
}

export function setTranslateDeckLang(code) {
  const c = normLangCode(code);
  if (!langMeta(c)) return false;
  try {
    localStorage.setItem(LS_TR_DECK, c);
  } catch (e) {}
  return true;
}

function scriptScores(text) {
  const s = String(text || '');
  const scores = { cyrl: 0, latn: 0, hans: 0, jpan: 0, hang: 0, arab: 0 };
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    const cp = s.codePointAt(i);
    if (cp > 0xffff) i++;
    if (/[а-яА-ЯёЁіІїЇєЄґҐўЎәӘөӨүҮңҢқҚһҺ]/.test(ch)) scores.cyrl++;
    else if (/[a-zA-Z]/.test(ch)) scores.latn++;
    else if (cp >= 0x4e00 && cp <= 0x9fff) scores.hans++;
    else if ((cp >= 0x3040 && cp <= 0x30ff) || (cp >= 0x31f0 && cp <= 0x31ff)) scores.jpan++;
    else if (cp >= 0xac00 && cp <= 0xd7af) scores.hang++;
    else if (cp >= 0x0600 && cp <= 0x06ff) scores.arab++;
  }
  return scores;
}

function scriptOfCode(code) {
  const m = langMeta(code);
  return m ? m.script : 'latn';
}

export function detectTextLang(text) {
  const pair = getTranslatePair();
  const scores = scriptScores(text);
  let total = 0;
  for (const k in scores) total += scores[k];
  if (!total) return 'empty';
  const s1 = scriptOfCode(pair.lang1);
  const s2 = scriptOfCode(pair.lang2);
  if (s1 !== s2) {
    const n1 = scores[s1] || 0;
    const n2 = scores[s2] || 0;
    if (n1 + n2 === 0) return 'mixed';
    if (n1 / (n1 + n2) >= 0.7) return pair.lang1;
    if (n2 / (n1 + n2) >= 0.7) return pair.lang2;
    return 'mixed';
  }
  if (s1 === 'latn' && (pair.lang1 === 'en' || pair.lang2 === 'en') && (pair.lang1 === 'ru' || pair.lang2 === 'ru')) {
    if ((scores.latn || 0) / total >= 0.7) return pair.lang1 === 'en' ? pair.lang1 : pair.lang2;
  }
  return 'mixed';
}

export function translateTargetFromText(text) {
  const pair = getTranslatePair();
  const det = detectTextLang(text);
  if (det === pair.lang2) {
    return { from: pair.lang2, to: pair.lang1, detected: det };
  }
  return { from: pair.lang1, to: pair.lang2, detected: det };
}

export function plainFromHtml(html) {
  if (!html) return '';
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.innerText || tmp.textContent || '').replace(/\u200b/g, '');
  } catch (e) {
    return String(html)
      .replace(/<[^>]*>/g, '')
      .replace(/\u200b/g, '');
  }
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Replace HTML text content with translated text, preserving tags and formatting. */
export function applyTranslationToHtml(html, translatedPlain) {
  const plain = String(translatedPlain == null ? '' : translatedPlain);
  if (!html || !/<[a-z]/i.test(html)) {
    return escHtml(plain).replace(/\n/g, '<br>');
  }
  // Parse HTML and rebuild with translated text, preserving structure
  try {
    // Check if original HTML has list markers
    const hasListMarkers = /data-list-bullet|data-list-num/i.test(html);
    // Collect character-level style info from original HTML (like v7.1 _toCharObjs)
    const oldChars = htmlToChars(html);
    // Split translated text into lines
    const newLines = plain.split('\n');
    // Group old chars by lines
    const oldLines = [[]];
    for (const c of oldChars) {
      if (c.ch === '\n') oldLines.push([]);
      else oldLines[oldLines.length - 1].push(c);
    }
    // Build output chars: map translated text onto original styles
    const outChars = [];
    for (let li = 0; li < newLines.length; li++) {
      if (li > 0) outChars.push({ ch: '\n', style: {} });
      const srcLine = oldLines[Math.min(li, oldLines.length - 1)] || [];
      // Find base style from original line
      let base = {};
      for (const sc of srcLine) {
        if (sc.style && Object.keys(sc.style).length) {
          base = { ...sc.style };
          break;
        }
      }
      if (!Object.keys(base).length && oldChars.length) {
        for (const oc of oldChars) {
          if (oc.ch !== '\n' && oc.style && Object.keys(oc.style).length) {
            base = { ...oc.style };
            break;
          }
        }
      }
      for (const ch of newLines[li]) {
        outChars.push({ ch, style: { ...base } });
      }
    }
    let result = charsToHtml(outChars);
    // If original had list markers, we need to re-apply them
    // The markers are per-line, so we need to extract and re-insert them
    if (hasListMarkers) {
      result = reapplyListMarkersFromOriginal(html, result);
    }
    return result;
  } catch (e) {
    // Fallback: plain escape + br
    return escHtml(plain).replace(/\n/g, '<br>');
  }
}

/** Re-apply list markers from original HTML to translated HTML. */
function reapplyListMarkersFromOriginal(originalHtml, translatedHtml) {
  if (typeof DOMParser === 'undefined') return translatedHtml;
  try {
    const origDoc = new DOMParser().parseFromString(`<div>${originalHtml}</div>`, 'text/html');
    const origRoot = origDoc.body.firstChild;
    if (!origRoot) return translatedHtml;
    // Extract markers per line from original
    const origLines = splitHtmlLines(originalHtml);
    const transLines = translatedHtml.split(/<br\s*\/?>/i);
    const result = [];
    for (let i = 0; i < transLines.length; i++) {
      const origLine = origLines[i] || '';
      const transLine = transLines[i] || '';
      // Extract marker from original line
      const markerMatch = origLine.match(/^(<span[^>]*data-list-(?:bullet|num)[^>]*>.*?<\/span>\s*)/i);
      if (markerMatch) {
        result.push(markerMatch[1] + transLine);
      } else {
        result.push(transLine);
      }
    }
    return result.join('<br>');
  } catch (e) {
    return translatedHtml;
  }
}

/** Split HTML into lines (by <br> and block elements). */
function splitHtmlLines(html) {
  if (typeof document === 'undefined') return html.split(/<br\s*\/?>/i);
  const wrap = document.createElement('div');
  wrap.innerHTML = String(html || '').replace(/<\/div>\s*<div[^>]*>/gi, '<br>').replace(/<\/p>\s*<p[^>]*>/gi, '<br>');
  const lines = [''];
  for (const child of [...wrap.childNodes]) {
    if (child.nodeName === 'BR') lines.push('');
    else if (child.nodeType === 1) lines[lines.length - 1] += child.outerHTML;
    else if (child.nodeType === 3) lines[lines.length - 1] += child.textContent;
  }
  return lines;
}

/** Parse HTML into character objects with style info (simplified from v7.1 _toCharObjs). */
function htmlToChars(html) {
  if (typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild;
  if (!root) return [];
  const out = [];
  const block = new Set(['div','p','li','tr','h1','h2','h3','h4','h5','h6']);
  function walk(node, inh) {
    if (node.nodeType === 3) {
      for (const ch of node.textContent) out.push({ ch, style: { ...inh } });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    // Skip list marker elements (bullet/number icons)
    if (node.hasAttribute?.('data-list-bullet') || node.hasAttribute?.('data-list-num')) return;
    // Skip SVG elements (used for icon markers)
    if (tag === 'svg') return;
    if (tag === 'br') { out.push({ ch: '\n', style: { ...inh } }); return; }
    if (block.has(tag) && out.length && out[out.length - 1].ch !== '\n') {
      out.push({ ch: '\n', style: { ...inh } });
    }
    const m = { ...inh };
    const raw = node.getAttribute('style') || '';
    raw.split(';').forEach(part => {
      const ci = part.indexOf(':');
      if (ci < 0) return;
      const k = part.slice(0, ci).trim();
      const v = part.slice(ci + 1).trim();
      if (!k || !v || k === 'display') return;
      m[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
    });
    if (tag === 'b' || tag === 'strong') m.fontWeight = '700';
    if (tag === 'i' || tag === 'em') m.fontStyle = 'italic';
    if (tag === 'u') m.textDecoration = 'underline';
    if (tag === 'sup') m.verticalAlign = 'super';
    if (tag === 'sub') m.verticalAlign = 'sub';
    for (const child of node.childNodes) walk(child, m);
    if (block.has(tag) && out.length && out[out.length - 1].ch !== '\n') {
      out.push({ ch: '\n', style: { ...inh } });
    }
  }
  for (const child of root.childNodes) walk(child, {});
  // Trim leading/trailing newlines
  while (out.length && out[0].ch === '\n') out.shift();
  while (out.length && out[out.length - 1].ch === '\n') out.pop();
  return out;
}

/** Rebuild HTML from character objects (simplified from v7.1 _charObjsToHtml). */
function charsToHtml(chars) {
  let html = '';
  // Track open tags as { tag, key } where key is used for matching
  let openStack = [];
  
  function closeAll() {
    while (openStack.length) {
      const item = openStack.pop();
      html += `</${item.tag}>`;
    }
  }
  
  function getStyleItems(style) {
    const items = [];
    if (style.fontWeight === '700' || style.fontWeight === 'bold') items.push({ tag: 'b', key: 'b' });
    if (style.fontStyle === 'italic') items.push({ tag: 'i', key: 'i' });
    if (style.textDecoration === 'underline') items.push({ tag: 'u', key: 'u' });
    if (style.verticalAlign === 'super') items.push({ tag: 'sup', key: 'sup' });
    if (style.verticalAlign === 'sub') items.push({ tag: 'sub', key: 'sub' });
    // Color: only preserve if it's a custom color (not default text color)
    const color = style.color || style.Color;
    if (color && color !== 'currentColor' && color !== 'inherit') {
      items.push({ tag: `span style="color:${color}"`, key: `color:${color}`, closeTag: 'span' });
    }
    return items;
  }
  
  function stackMatch(prevItems, wantItems) {
    if (prevItems.length !== wantItems.length) return false;
    for (let i = 0; i < prevItems.length; i++) {
      if (prevItems[i].key !== wantItems[i].key) return false;
    }
    return true;
  }
  
  let prevItems = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c.ch === '\n') {
      closeAll();
      openStack = [];
      html += '<br>';
      prevItems = [];
      continue;
    }
    const wantItems = getStyleItems(c.style);
    // Find common prefix
    let common = 0;
    while (common < openStack.length && common < wantItems.length && openStack[common].key === wantItems[common].key) common++;
    // Close tags that differ
    while (openStack.length > common) {
      const item = openStack.pop();
      html += `</${item.closeTag || item.tag}>`;
    }
    // Open new tags
    for (let t = common; t < wantItems.length; t++) {
      html += `<${wantItems[t].tag}>`;
      openStack.push(wantItems[t]);
    }
    html += escHtml(c.ch);
    prevItems = wantItems;
  }
  closeAll();
  return html;
}

async function googleTranslateChunk(text, from, to) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
    encodeURIComponent(from) +
    '&tl=' +
    encodeURIComponent(to) +
    '&dt=t&q=' +
    encodeURIComponent(text);
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl
      ? setTimeout(() => {
          try {
            ctrl.abort();
          } catch (e) {}
        }, 10000)
      : null;
    let res;
    try {
      res = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        signal: ctrl ? ctrl.signal : undefined,
      });
    } catch (e) {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 300 * attempt));
        continue;
      }
      throw new Error('GOOGLE_FETCH_FAIL');
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res || !res.ok) {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 300 * attempt));
        continue;
      }
      throw new Error('GOOGLE_HTTP ' + (res && res.status));
    }
    const data = await res.json();
    if (!data || !data[0]) {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 300 * attempt));
        continue;
      }
      throw new Error('GOOGLE_BAD_JSON');
    }
    let out = '';
    for (let i = 0; i < data[0].length; i++) {
      if (data[0][i] && data[0][i][0] != null) out += data[0][i][0];
    }
    return out;
  }
}

/** Fallback: MyMemory Translation API (free, no key required). */
async function myMemoryTranslate(text, from, to) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 12000) : null;
  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!res || !res.ok) throw new Error('MYMEMORY_HTTP ' + (res && res.status));
  const data = await res.json();
  if (!data || !data.responseData || !data.responseData.translatedText) {
    throw new Error('MYMEMORY_BAD_JSON');
  }
  return data.responseData.translatedText;
}

/** Try Google first, then fall back to MyMemory. */
async function translateChunkWithFallback(text, from, to) {
  try {
    return await googleTranslateChunk(text, from, to);
  } catch (e) {
    console.warn('[translate] Google failed, trying MyMemory:', e.message);
    try {
      return await myMemoryTranslate(text, from, to);
    } catch (e2) {
      console.warn('[translate] MyMemory also failed:', e2.message);
      throw e; // Throw original error
    }
  }
}

export async function translatePlain(text, from, to, onProgress) {
  const trimmed = String(text || '');
  if (!trimmed.trim()) return trimmed;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('NO_ENGINE');
  }
  const raw = trimmed;
  if (raw.length <= 1500) {
    if (typeof onProgress === 'function') onProgress(100);
    return await translateChunkWithFallback(raw, from, to);
  }
  const lines = raw.split('\n');
  const out = [];
  let done = 0;
  const total = lines.filter((l) => l.trim()).length || 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      out.push(line);
      continue;
    }
    if (line.length <= 1500) {
      out.push(await translateChunkWithFallback(line, from, to));
    } else {
      let rest = line;
      let built = '';
      while (rest.length > 1500) {
        let cut = rest.lastIndexOf('. ', 1500);
        if (cut < 600) cut = rest.lastIndexOf(' ', 1500);
        if (cut < 600) cut = 1500;
        else cut += 1;
        built += await translateChunkWithFallback(rest.slice(0, cut).trimEnd(), from, to);
        rest = rest.slice(cut).trimStart();
        if (rest) built += ' ';
      }
      if (rest) built += await translateChunkWithFallback(rest, from, to);
      out.push(built);
    }
    done++;
    if (typeof onProgress === 'function') onProgress(Math.round((done / total) * 100));
  }
  return out.join('\n');
}

export async function resolveFromLang(plain, to) {
  const tgt = translateTargetFromText(plain);
  let from = tgt.from;
  if (tgt.detected === 'mixed' || tgt.detected === 'empty') {
    from = tgt.to === 'en' ? 'ru' : 'en';
    if (from === to) from = to === 'en' ? 'ru' : 'en';
  }
  if (from === to) {
    const pair = getTranslatePair();
    from = to === pair.lang1 ? pair.lang2 : pair.lang1;
  }
  return from;
}

const RU_LAT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: "'", ы: 'y', ь: "'", э: 'e', ю: 'yu', я: 'ya',
};

function translitRuToLat(text) {
  let out = '';
  const s = String(text || '');
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    const low = ch.toLowerCase();
    const lat = RU_LAT[low];
    if (lat == null) {
      out += ch;
      continue;
    }
    if (!lat) continue;
    out += ch === low ? lat : lat.charAt(0).toUpperCase() + lat.slice(1);
  }
  return out;
}

function srcTranslitFromPayload(data) {
  if (!data) return '';
  if (data.sentences && data.sentences.length) {
    let out = '';
    for (let i = 0; i < data.sentences.length; i++) {
      const s = data.sentences[i];
      if (s && s.src_translit) out += s.src_translit;
    }
    return String(out).trim();
  }
  if (Array.isArray(data) && data[0] && data[0].length) {
    const last = data[0][data[0].length - 1];
    if (Array.isArray(last) && last.length > 3 && last[3]) return String(last[3]).trim();
  }
  return '';
}

function toRuSchoolIpa(ipa) {
  let s = String(ipa || '').trim();
  s = s.replace(/^[\/\[\(]+/, '').replace(/[\/\]\)]+$/, '');
  s = s.replace(/ː/g, ':').replace(/ˑ/g, '');
  s = s.replace(/[.|]/g, '').replace(/\s+/g, '');
  s = s.replace(/ˌ/g, '');
  s = s.replace(/oʊ/g, 'əʊ').replace(/ɔʊ/g, 'əʊ');
  s = s.replace(/ɛə/g, 'eə');
  s = s.replace(/ɜɹ/g, 'ɜ:').replace(/ɝ:?/g, 'ɜ:').replace(/ɚ/g, 'ə');
  s = s.replace(/əɹ/g, 'ə');
  s = s.replace(/ɑɹ/g, 'ɑ:').replace(/ɔɹ/g, 'ɔ:');
  s = s.replace(/ɪɹ/g, 'ɪə').replace(/ɛɹ/g, 'eə').replace(/eɹ/g, 'eə').replace(/ʊɹ/g, 'ʊə');
  s = s.replace(/ɹ/g, 'r');
  s = s.replace(/ɡ/g, 'g').replace(/ɫ/g, 'l');
  s = s.replace(/ɛ/g, 'e').replace(/ɑɪ/g, 'aɪ').replace(/ɑ:/g, 'a:').replace(/ɑ/g, 'a');
  s = s.replace(/ʧ/g, 'tʃ').replace(/ʤ/g, 'dʒ');
  s = s.replace(/ˈ/g, "'");
  return s;
}

function pickDictPhonetic(entries) {
  const cands = [];
  if (!Array.isArray(entries)) return '';
  entries.forEach((en) => {
    if (en && en.phonetic) cands.push({ text: en.phonetic, uk: false });
    (en && en.phonetics ? en.phonetics : []).forEach((p) => {
      if (!p || !p.text) return;
      const audio = String(p.audio || '');
      cands.push({ text: p.text, uk: /uk|gb|oxford/i.test(audio) });
    });
  });
  if (!cands.length) return '';
  cands.sort((a, b) => {
    const score = (x) => {
      let n = 0;
      if (x.uk) n += 10;
      if (/əʊ|ɪə|eə|ɒ|ɜ:|ɜː/.test(x.text)) n += 6;
      if (/oʊ|ɝ|ɚ|ɑɹ/.test(x.text) && !x.uk) n -= 4;
      return n;
    };
    return score(b) - score(a);
  });
  return toRuSchoolIpa(cands[0].text);
}

const ipaCache = Object.create(null);

async function dictIpa(word) {
  const key = String(word || '').toLowerCase();
  if (!key) return '';
  if (Object.prototype.hasOwnProperty.call(ipaCache, key)) return ipaCache[key];
  try {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 6000) : null;
    let res;
    try {
      res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(key), {
        method: 'GET',
        credentials: 'omit',
        signal: ctrl ? ctrl.signal : undefined,
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res || !res.ok) {
      ipaCache[key] = '';
      return '';
    }
    const ipa = pickDictPhonetic(await res.json());
    ipaCache[key] = ipa || '';
    return ipaCache[key];
  } catch (e) {
    ipaCache[key] = '';
    return '';
  }
}

async function googleTranscribeChunk(text, from) {
  const to = from === 'en' ? 'ru' : 'en';
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&dj=1&sl=' +
    encodeURIComponent(from) +
    '&tl=' +
    encodeURIComponent(to) +
    '&dt=t&dt=rm&q=' +
    encodeURIComponent(text);
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 8000) : null;
  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!res || !res.ok) throw new Error('GOOGLE_HTTP ' + (res && res.status));
  const out = srcTranslitFromPayload(await res.json());
  if (!out) throw new Error('GOOGLE_NO_TRANSLIT');
  return out;
}

async function transcribeEnglishWord(word) {
  const dict = await dictIpa(word);
  if (dict) return dict;
  try {
    return toRuSchoolIpa(await googleTranscribeChunk(word, 'en'));
  } catch (e) {
    return '';
  }
}

async function transcribeEnglish(text) {
  const parts = String(text || '').split(/([A-Za-z]+(?:'[A-Za-z]+)?)/);
  for (let i = 0; i < parts.length; i++) {
    if (!/^[A-Za-z]/.test(parts[i])) continue;
    const ipa = await transcribeEnglishWord(parts[i]);
    if (ipa) parts[i] = '[' + ipa + ']';
  }
  return parts.join('');
}

/** IPA / latin transcription of a text block (v7.1 transcribeSelectedText). */
export async function transcribePlain(text, from) {
  const trimmed = String(text || '');
  if (!trimmed.trim()) return trimmed;
  let en = trimmed;
  if (from !== 'en') {
    try {
      en = await translatePlain(trimmed, from === 'ru' ? 'ru' : from, 'en');
    } catch (e) {
      if (from === 'ru') return translitRuToLat(trimmed);
      throw e;
    }
  }
  const out = await transcribeEnglish(en);
  if (!out.trim() || out === trimmed) throw new Error('NO_ENGINE');
  return out;
}

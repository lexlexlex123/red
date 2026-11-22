/**
 * Shared PPT/PPTX import enrichment: map to editor code / lists / preformatted text.
 */

import { detectPasteCodeLang, stripCodeFence } from './detectPasteCode.js';
import { ensureCodeHtml, normalizeCodeLang } from './codeHighlight.js';
import { bulletMarker, numMarker, DEFAULT_BULLET_ICON_ID } from './textLists.js';

export const MONO_FACE_RE =
  /consolas|courier|cascadia|fira\s*code|jetbrains|source\s*code|lucida\s*console|menlo|monaco|monospace|ibm\s*plex\s*mono|ubuntu\s*mono|dejavu\s*sans\s*mono|nimbus\s*mono|pt\s*mono|roboto\s*mono|sf\s*mono|ui-monospace/i;

export const PRE_WRAP_CS = 'white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;';
export const MONO_CS =
  "font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace;";

const BULLET_LINE_RE =
  /^\s*(?:[•●○◦▪▫◆◇►▶➢➤✓✔■□·∙]|&bull;|[-*–—])\s+(\S[\s\S]*)$/;
const NUM_LINE_RE =
  /^\s*(?:\(?\d+[.)]|[a-zA-Z][.)]|[ivxlcdmIVXLCDM]+[.)])\s+(\S[\s\S]*)$/;

export function plainFromHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:div|p)>\s*<(?:div|p)[^>]*>/gi, '\n')
    .replace(/<\/(?:div|p)>/gi, '\n')
    .replace(/<(?:div|p)[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n');
}

export function isMonoFace(face) {
  return MONO_FACE_RE.test(String(face || ''));
}

export function looksLikeCodeShapeName(name) {
  const n = String(name || '').trim();
  return /^code\b/i.test(n) || /\bcode\s*block\b/i.test(n);
}

export function stripLeadingListMarker(line) {
  const s = String(line || '');
  let m = s.match(BULLET_LINE_RE);
  if (m) return { kind: 'bullet', text: m[1] };
  m = s.match(NUM_LINE_RE);
  if (m) return { kind: 'num', text: m[1] };
  return null;
}

export function detectPlainListKind(plain) {
  const lines = String(plain || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  let bullets = 0;
  let nums = 0;
  for (const ln of lines) {
    if (BULLET_LINE_RE.test(ln)) bullets += 1;
    else if (NUM_LINE_RE.test(ln)) nums += 1;
  }
  const thr = Math.max(2, Math.ceil(lines.length * 0.55));
  if (bullets >= thr) return 'bullet';
  if (nums >= thr) return 'num';
  return null;
}

function splitHtmlBlocks(html) {
  const s = String(html || '');
  if (/<div[\s>]/i.test(s)) {
    const blocks = [];
    const re = /<div[^>]*>([\s\S]*?)<\/div>/gi;
    let m;
    while ((m = re.exec(s)) !== null) blocks.push(m[1]);
    if (blocks.length) return { kind: 'div', blocks };
  }
  if (/<br\s*\/?>/i.test(s)) {
    return { kind: 'br', blocks: s.split(/<br\s*\/?>/i) };
  }
  return { kind: 'div', blocks: [s] };
}

function joinHtmlBlocks(kind, blocks) {
  if (kind === 'br') return blocks.join('<br>');
  return blocks.map((b) => `<div>${b || '<br>'}</div>`).join('');
}

function stripHtmlTags(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

/**
 * Add editor list markers to HTML blocks (or convert plain bullet/number prefixes).
 * @param {string} html
 * @param {'bullet'|'num'|null} kind
 * @param {{ iconId?: string }} [opts]
 */
export function applyListMarkersToHtml(html, kind, opts = {}) {
  if (!kind || !html) return html || '';
  const { kind: joinKind, blocks } = splitHtmlBlocks(html);
  const iconId = opts.iconId || DEFAULT_BULLET_ICON_ID;
  let num = 0;
  const next = blocks.map((block) => {
    if (/data-list-bullet|data-list-num/i.test(block)) return block;
    const plain = stripHtmlTags(block);
    if (!plain) return block;
    let content = block;
    const stripped = stripLeadingListMarker(plain);
    if (stripped) {
      // Rebuild from plain when the whole line was "• item" / "1. item"
      const esc = stripped.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      // Prefer keeping original inline markup if prefix was only in plain text start
      const prefixLen = plain.length - stripped.text.length;
      if (prefixLen > 0 && stripHtmlTags(block).length === plain.length) {
        content = esc;
      } else {
        content = block.replace(/^\s*(?:<[^>]+>)*\s*(?:[•●○◦▪▫◆◇►▶➢➤✓✔■□·∙]|&bull;|[-*–—]|\(?\d+[.)]|[a-zA-Z][.)]|[ivxlcdmIVXLCDM]+[.)])\s+/i, '');
      }
    }
    if (!stripHtmlTags(content)) return block;
    num += 1;
    const marker =
      kind === 'num' ? numMarker(num, 'decimal') : bulletMarker({ iconId });
    return marker + content.replace(/^\s+/, '');
  });
  return joinHtmlBlocks(joinKind, next);
}

/**
 * Turn an imported text box into code / list / preformatted text when appropriate.
 * @param {object} base text-like element fields (id,x,y,w,h,html,cs,...)
 * @param {{ shapeName?: string, mono?: boolean, listKind?: 'bullet'|'num'|null, fs?: number, themeDark?: boolean }} [meta]
 */
export function enrichImportedTextEl(base, meta = {}) {
  if (!base) return base;
  const plain = plainFromHtml(base.html || base.text || '');
  const trim = plain.trim();
  if (!trim) return { ...base, type: 'text' };

  const shapeCode = looksLikeCodeShapeName(meta.shapeName);
  const mono = !!meta.mono || shapeCode;
  let codeLang = detectPasteCodeLang(plain);
  if (!codeLang && (shapeCode || (mono && trim.split(/\n/).filter((l) => l.trim()).length >= 2))) {
    // Monospace / named Code shape with multi-line body → code even if lang unknown
    if (shapeCode || /[{};]|=>|\bdef\b|\bfunction\b|\bclass\b|\bimport\b|#include/.test(trim)) {
      codeLang = 'plain';
    }
  }

  if (codeLang) {
    const codeRaw = stripCodeFence(plain).replace(/\n$/, '');
    const theme = meta.themeDark === false ? 'light' : 'dark';
    const codeFs = Math.max(10, Math.min(22, +(meta.fs || 14) || 14));
    const hl = ensureCodeHtml(
      {
        codeRaw,
        codeLang: normalizeCodeLang(codeLang),
        codeTheme: theme,
        codeFs,
      },
      theme
    );
    return {
      id: base.id,
      type: 'code',
      x: base.x,
      y: base.y,
      w: Math.max(120, base.w || 400),
      h: Math.max(60, base.h || 160),
      codeRaw,
      codeLang: normalizeCodeLang(codeLang),
      codeTheme: theme,
      codeGlass: false,
      codeFs,
      ...hl,
      rot: base.rot || 0,
      anims: base.anims || [],
      textBg: base.textBg || undefined,
    };
  }

  let html = base.html || '';
  let listKind = meta.listKind || null;
  if (!listKind && !/data-list-bullet|data-list-num/i.test(html)) {
    listKind = detectPlainListKind(plain);
  }
  if (listKind && !/data-list-bullet|data-list-num/i.test(html)) {
    html = applyListMarkersToHtml(html, listKind);
  }

  let cs = String(base.cs || '');
  if (!/white-space\s*:/.test(cs)) cs += PRE_WRAP_CS;
  if (mono && !/font-family\s*:/.test(cs)) cs += MONO_CS;

  const el = {
    ...base,
    type: 'text',
    html,
    text: plainFromHtml(html),
    cs,
    _importPre: true,
  };
  if (listKind || /data-list-bullet|data-list-num/i.test(html)) {
    el.bulletIconId = DEFAULT_BULLET_ICON_ID;
    el._importList = true;
  }
  if (mono) el._importMono = true;
  return el;
}

/** Strip ephemeral import flags before persist. */
export function stripImportFlags(el) {
  if (!el || typeof el !== 'object') return el;
  const next = { ...el };
  delete next._importPre;
  delete next._importList;
  delete next._importMono;
  delete next._pptxId;
  return next;
}

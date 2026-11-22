/** Lightweight code highlighting — ported from js/11-elements.js. */

import { getTheme } from './themes.js';
import { usePresentationStore } from '../stores/presentationStore.js';

export const CODE_THEMES = {
  dark: {
    bg: '#0d1117',
    text: '#e6edf3',
    kw: '#ff7b72',
    str: '#a5d6ff',
    cmt: '#6e7781',
    num: '#79c0ff',
    fn: '#d2a8ff',
    ty: '#ffa657',
  },
  monokai: {
    bg: '#272822',
    text: '#f8f8f2',
    kw: '#f92672',
    str: '#e6db74',
    cmt: '#75715e',
    num: '#ae81ff',
    fn: '#a6e22e',
    ty: '#66d9ef',
  },
  dracula: {
    bg: '#282a36',
    text: '#f8f8f2',
    kw: '#ff79c6',
    str: '#f1fa8c',
    cmt: '#6272a4',
    num: '#bd93f9',
    fn: '#50fa7b',
    ty: '#8be9fd',
  },
  light: {
    bg: '#f8f9fa',
    text: '#24292e',
    kw: '#d73a49',
    str: '#032f62',
    cmt: '#6a737d',
    num: '#005cc5',
    fn: '#6f42c1',
    ty: '#e36209',
  },
};

export const CODE_LANGS = [
  { id: 'js', label: 'JavaScript' },
  { id: 'ts', label: 'TypeScript' },
  { id: 'py', label: 'Python' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'sql', label: 'SQL' },
  { id: 'bash', label: 'Bash' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C / C++' },
  { id: 'cs', label: 'C#' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'yaml', label: 'YAML' },
  { id: 'plain', label: 'Plain' },
];

/** Map filename → code language id (ported from js/26-export.js). */
export function codeLangFromFilename(name) {
  const n = String(name || '').toLowerCase();
  const ext = n.split('.').pop() || '';
  const map = {
    js: 'js',
    mjs: 'js',
    cjs: 'js',
    jsx: 'js',
    ts: 'ts',
    tsx: 'ts',
    py: 'py',
    pyw: 'py',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    c: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
    hh: 'cpp',
    cs: 'cs',
    css: 'css',
    scss: 'css',
    less: 'css',
    html: 'html',
    htm: 'html',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    bat: 'bash',
    cmd: 'bash',
    ps1: 'bash',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    txt: 'plain',
    text: 'plain',
    log: 'plain',
    rb: 'plain',
    php: 'plain',
    kt: 'plain',
    swift: 'plain',
    r: 'plain',
    dart: 'plain',
    lua: 'plain',
    pl: 'plain',
    pm: 'plain',
    xml: 'plain',
    toml: 'plain',
    ini: 'plain',
    cfg: 'plain',
    conf: 'plain',
    vue: 'html',
    svelte: 'html',
  };
  return map[ext] || null;
}

const KW_MAP = {
  js: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'this',
    'typeof', 'instanceof', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch',
    'throw', 'switch', 'case', 'break', 'continue', 'null', 'undefined', 'true', 'false', 'of', 'in',
  ],
  ts: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'this',
    'typeof', 'instanceof', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch',
    'throw', 'switch', 'case', 'break', 'continue', 'null', 'undefined', 'true', 'false', 'type',
    'interface', 'extends', 'implements', 'enum', 'namespace', 'declare', 'abstract', 'readonly',
    'private', 'public', 'protected', 'static',
  ],
  py: [
    'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'with',
    'try', 'except', 'finally', 'raise', 'pass', 'break', 'continue', 'None', 'True', 'False', 'and',
    'or', 'not', 'in', 'is', 'lambda', 'yield', 'async', 'await', 'del', 'global', 'nonlocal', 'print',
  ],
  rust: [
    'fn', 'let', 'mut', 'const', 'struct', 'enum', 'impl', 'trait', 'use', 'mod', 'pub', 'return',
    'if', 'else', 'for', 'while', 'loop', 'match', 'break', 'continue', 'true', 'false', 'self', 'Self',
    'where', 'type', 'unsafe', 'async', 'await', 'dyn', 'Box', 'Vec', 'Option', 'Result', 'Some',
    'None', 'Ok', 'Err',
  ],
  go: [
    'func', 'var', 'const', 'type', 'struct', 'interface', 'return', 'if', 'else', 'for', 'range',
    'switch', 'case', 'break', 'continue', 'true', 'false', 'nil', 'package', 'import', 'map', 'chan',
    'go', 'defer', 'select', 'make', 'new', 'len', 'cap', 'append',
  ],
  java: [
    'class', 'public', 'private', 'protected', 'static', 'void', 'return', 'if', 'else', 'for', 'while',
    'new', 'this', 'super', 'import', 'package', 'interface', 'extends', 'implements', 'try', 'catch',
    'throw', 'throws', 'finally', 'true', 'false', 'null', 'int', 'long', 'double', 'float', 'boolean',
    'char', 'byte', 'short', 'String',
  ],
  cpp: [
    'auto', 'const', 'int', 'long', 'double', 'float', 'char', 'bool', 'void', 'return', 'if', 'else',
    'for', 'while', 'class', 'struct', 'enum', 'namespace', 'using', 'template', 'typename', 'public',
    'private', 'protected', 'virtual', 'override', 'new', 'delete', 'true', 'false', 'nullptr',
    'include', 'define',
  ],
  cs: [
    'class', 'public', 'private', 'protected', 'static', 'void', 'return', 'if', 'else', 'for', 'while',
    'foreach', 'new', 'this', 'base', 'using', 'namespace', 'interface', 'abstract', 'override',
    'virtual', 'try', 'catch', 'throw', 'true', 'false', 'null', 'var', 'int', 'string', 'bool',
    'double', 'float',
  ],
  html: [
    'html', 'head', 'body', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'a', 'img', 'input', 'button',
    'form', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'nav', 'section', 'article', 'header',
    'footer', 'main', 'style', 'script', 'link', 'meta', 'title',
  ],
  css: [
    'color', 'background', 'margin', 'padding', 'width', 'height', 'display', 'position', 'flex',
    'grid', 'font', 'border', 'top', 'left', 'right', 'bottom', 'overflow', 'transform', 'transition',
    'animation', 'opacity', 'z-index', 'content', 'important',
  ],
  sql: [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'INSERT', 'INTO',
    'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'DISTINCT', 'AS',
    'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'BETWEEN', 'LIMIT', 'OFFSET', 'INNER', 'LEFT',
    'RIGHT', 'OUTER', 'CROSS', 'UNION', 'ALL', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
  ],
  bash: [
    'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'in', 'esac', 'function',
    'return', 'exit', 'echo', 'cd', 'ls', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'sed', 'awk',
    'export', 'source', 'alias', 'unset', 'local', 'readonly',
  ],
  json: [],
  yaml: [],
  plain: [],
};

export function normalizeCodeLang(lang) {
  const m = {
    javascript: 'js',
    jsx: 'js',
    typescript: 'ts',
    tsx: 'ts',
    python: 'py',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    c: 'cpp',
    'c++': 'cpp',
    csharp: 'cs',
    'c#': 'cs',
    yml: 'yaml',
    htm: 'html',
  };
  const raw = String(lang || 'plain').toLowerCase();
  return m[raw] || raw || 'plain';
}

export function syntaxHighlight(code, lang, theme = 'dark') {
  const L = normalizeCodeLang(lang);
  const T = CODE_THEMES[theme] || CODE_THEMES.dark;
  const raw = String(code ?? '');

  if (L === 'html') {
    let h = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    h = h.replace(
      /(&lt;!--[\s\S]*?--&gt;)/g,
      `<span style="color:${T.cmt};font-style:italic">$1</span>`
    );
    h = h.replace(
      /(&lt;\/?)([\w-]+)((?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?)*\s*\/?)(&gt;)/g,
      (m, open, tag, attrs, close) => {
        const attrHl = attrs.replace(
          /([\w:-]+)(\s*=\s*)("([^"]*)"|'([^']*)')/g,
          `<span style="color:${T.fn}">$1</span>$2<span style="color:${T.str}">$3</span>`
        );
        return `<span style="color:${T.kw}">${open}${tag}</span>${attrHl}<span style="color:${T.kw}">${close}</span>`;
      }
    );
    return h;
  }

  let h = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (L === 'plain') return `<span style="color:${T.text}">${h}</span>`;

  const cmts = [];
  const saveCmt = (m) => {
    cmts.push(m);
    return `\0CMT${cmts.length - 1}\0`;
  };
  if (['js', 'ts', 'java', 'cpp', 'cs', 'rust', 'go'].includes(L)) {
    h = h.replace(/\/\/[^\n]*/g, saveCmt);
    h = h.replace(/\/\*[\s\S]*?\*\//g, saveCmt);
  } else if (L === 'py') {
    h = h.replace(/#[^\n]*/g, saveCmt);
  } else if (L === 'css') {
    h = h.replace(/\/\*[\s\S]*?\*\//g, saveCmt);
  } else if (['sql', 'bash'].includes(L)) {
    h = h.replace(/--[^\n]*|#[^\n]*/g, saveCmt);
  }

  h = h.replace(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
    `<span style="color:${T.str}">$1</span>`
  );
  h = h.replace(/\b(\d+\.?\d*)\b/g, `<span style="color:${T.num}">$1</span>`);

  const kws = KW_MAP[L] || [];
  if (kws.length) {
    const kwRe = new RegExp('\\b(' + kws.join('|') + ')\\b', 'g');
    h = h.replace(kwRe, `<span style="color:${T.kw}">$1</span>`);
  }

  h = h.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*&lt;\/span&gt;\s*\(|\s*\()/g, (m, fn) => {
    if (kws.includes(fn)) return m;
    return `<span style="color:${T.fn}">${fn}</span>`;
  });

  h = h.replace(/\0CMT(\d+)\0/g, (_, i) => `<span style="color:${T.cmt};font-style:italic">${cmts[+i]}</span>`);
  return h;
}

/** Virtual id that follows the slide design theme (not editor chrome). */
export const CODE_THEME_SYSTEM = 'system';

export const CODE_THEME_CHOICES = [CODE_THEME_SYSTEM, ...Object.keys(CODE_THEMES)];

export function codeThemeLabel(id, ru) {
  if (id === CODE_THEME_SYSTEM) return ru ? 'Системная' : 'System';
  return id;
}

/** Whether the current presentation design theme is light (`theme.dark === false`). */
export function isSlideThemeLight(opts = {}) {
  if (opts.slideLight != null) return !!opts.slideLight;
  // legacy alias from earlier chrome-based wiring
  if (opts.uiLight != null) return !!opts.uiLight;
  if (opts.theme && typeof opts.theme === 'object') return opts.theme.dark === false;
  try {
    const theme =
      opts.themeIdx != null
        ? getTheme(opts.themeIdx)
        : getTheme(usePresentationStore.getState().appliedThemeIdx);
    return !!(theme && theme.dark === false);
  } catch (e) {}
  return false;
}

/** Resolve stored theme id (`system` / dark / light / …) to a CODE_THEMES key. */
export function resolveCodeThemeId(themeId, opts = {}) {
  const raw = themeId || CODE_THEME_SYSTEM;
  if (raw === CODE_THEME_SYSTEM) {
    return isSlideThemeLight(opts) ? 'light' : 'dark';
  }
  return CODE_THEMES[raw] ? raw : 'dark';
}

export function codeBlockThemeId(el, fallback = CODE_THEME_SYSTEM) {
  if (el?.codeTheme) return el.codeTheme;
  return fallback || CODE_THEME_SYSTEM;
}

export function codeBlockSurfaceStyle(el, themeIdOrOpts, maybeOpts) {
  const opts =
    themeIdOrOpts && typeof themeIdOrOpts === 'object' && !Array.isArray(themeIdOrOpts)
      ? themeIdOrOpts
      : { ...(maybeOpts || {}), themeId: themeIdOrOpts };
  const stored = opts.themeId || codeBlockThemeId(el);
  const th = resolveCodeThemeId(stored, opts);
  const T = CODE_THEMES[th] || CODE_THEMES.dark;
  const fs = el?.codeFs != null ? +el.codeFs : 18;
  const glass = !!el?.codeGlass;
  let bg = T.bg;
  if (glass) bg = th === 'light' ? 'rgba(248,249,250,0.58)' : 'rgba(13,17,23,0.58)';
  return {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    borderRadius: '6px',
    fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace",
    fontSize: `${fs}px`,
    lineHeight: 1.6,
    padding: el?.codeLineNums ? '14px 16px 14px 10px' : '14px 16px',
    boxSizing: 'border-box',
    background: bg,
    color: T.text,
    border: `1px solid rgba(128,128,128,${glass ? 0.22 : 0.15})`,
    backdropFilter: glass ? 'blur(10px)' : undefined,
    WebkitBackdropFilter: glass ? 'blur(10px)' : undefined,
  };
}

export function codeLineCount(raw) {
  return Math.max(1, String(raw ?? '').split('\n').length);
}

export function codeLineNumbersText(raw) {
  const n = codeLineCount(raw);
  let out = '';
  for (let i = 1; i <= n; i++) out += (i > 1 ? '\n' : '') + i;
  return out;
}

export function ensureCodeHtml(el, themeFallback = CODE_THEME_SYSTEM, opts = {}) {
  const stored = codeBlockThemeId(el, themeFallback);
  const theme = resolveCodeThemeId(stored, opts);
  const lang = normalizeCodeLang(el?.codeLang || 'js');
  const raw = el?.codeRaw != null ? String(el.codeRaw) : '';
  return {
    codeLang: lang,
    codeTheme: stored === CODE_THEME_SYSTEM || stored === 'system' ? CODE_THEME_SYSTEM : theme,
    codeHtml: syntaxHighlight(raw, lang, theme),
    codeBg: (CODE_THEMES[theme] || CODE_THEMES.dark).bg,
  };
}

/** Highlighted HTML for display; always re-resolves `system` against current UI. */
export function codeDisplayHtml(el, opts = {}) {
  const stored = codeBlockThemeId(el);
  const theme = resolveCodeThemeId(stored, opts);
  const lang = normalizeCodeLang(el?.codeLang || 'js');
  const raw = el?.codeRaw != null ? String(el.codeRaw) : '';
  if (stored === CODE_THEME_SYSTEM || !el?.codeHtml) {
    return syntaxHighlight(raw, lang, theme);
  }
  return el.codeHtml;
}

export function codeGutterCss(el, opts = {}) {
  const th = resolveCodeThemeId(codeBlockThemeId(el), opts);
  const T = CODE_THEMES[th] || CODE_THEMES.dark;
  return {
    flex: '0 0 auto',
    margin: 0,
    padding: '0 10px 0 0',
    textAlign: 'right',
    color: T.cmt,
    userSelect: 'none',
    whiteSpace: 'pre',
    lineHeight: 1.6,
    fontFamily: 'inherit',
    fontSize: 'inherit',
  };
}

/** Standalone HTML body for a code element (surface children). */
export function codeBlockInnerHtml(el, opts = {}) {
  const html = codeDisplayHtml(el, opts);
  const pre = `<pre style="margin:0;white-space:pre-wrap;flex:1;min-width:0">${html}</pre>`;
  if (!el?.codeLineNums) return pre;
  const gutter = codeGutterCss(el, opts);
  const gStyle = Object.entries(gutter)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v}`)
    .join(';');
  return `<div style="display:flex;align-items:flex-start"><pre style="${gStyle}" aria-hidden="true">${codeLineNumbersText(el.codeRaw)}</pre>${pre}</div>`;
}

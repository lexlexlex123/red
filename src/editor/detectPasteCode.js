/** Detect programming language for pasted text (from js/11-elements.js). */

export function detectPasteCodeLang(raw) {
  let text = String(raw || '').replace(/^\uFEFF/, '');
  let fenceLang = null;
  const fm = text.match(/^```([a-zA-Z0-9_+-]*)[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/);
  if (fm) {
    text = fm[2];
    const fl = (fm[1] || '').toLowerCase();
    const fmap = {
      python: 'py',
      py: 'py',
      javascript: 'js',
      js: 'js',
      jsx: 'js',
      typescript: 'ts',
      ts: 'ts',
      tsx: 'ts',
      rust: 'rust',
      rs: 'rust',
      go: 'go',
      golang: 'go',
      java: 'java',
      c: 'cpp',
      cpp: 'cpp',
      'c++': 'cpp',
      csharp: 'cs',
      cs: 'cs',
      'c#': 'cs',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'css',
      sql: 'sql',
      bash: 'bash',
      sh: 'bash',
      shell: 'bash',
      zsh: 'bash',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
    };
    fenceLang = fmap[fl] || (fl ? 'plain' : null);
  }
  const trim = text.trim();
  if (trim.length < 20) return null;
  const lines = trim.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim().length);
  if (nonEmpty.length < 2 && !/[{};]|=>|\bdef\b|\bfunction\b|\bclass\b/.test(trim)) return null;

  if (/^\s*[\[{]/.test(trim) && /[\]}]\s*$/.test(trim)) {
    try {
      JSON.parse(trim);
      return 'json';
    } catch (e) {}
  }

  let score = 0;
  const L = {
    py: 0,
    js: 0,
    ts: 0,
    java: 0,
    cpp: 0,
    cs: 0,
    go: 0,
    rust: 0,
    html: 0,
    css: 0,
    sql: 0,
    bash: 0,
    yaml: 0,
  };

  const indented = lines.filter((l) => /^[ \t]{2,}\S/.test(l)).length;
  if (indented >= 1) score += 2;
  if (indented >= 3) score += 1;
  if (nonEmpty.length >= 3) score += 1;
  if (nonEmpty.length >= 6) score += 1;
  if (/[{}]/.test(trim) && /;/.test(trim)) score += 2;
  if (/\w+\s*\([^)]*\)\s*\{/.test(trim)) score += 2;
  if (/\w+\s*\([^)]*\)\s*:/.test(trim)) {
    score += 2;
    L.py += 2;
  }

  if (/(^|\n)\s*#(?!!|include)/.test(trim)) {
    score += 1;
    L.py += 1;
    L.bash += 0.5;
  }
  if (/\/\/|\/\*|\*\//.test(trim)) {
    score += 1;
    L.js += 1;
    L.java += 0.5;
    L.cpp += 0.5;
    L.cs += 0.5;
  }

  if (/\b(def|elif|except|lambda|None|True|False|yield|nonlocal|asyncio)\b/.test(trim)) L.py += 4;
  if (/\bfor\s+\w+\s+in\s+/.test(trim)) L.py += 2;
  if (/\[[^\]]*\bfor\b[^\]]*\bin\b[^\]]*\]/.test(trim)) L.py += 3;
  if (/\bprint\s*\(/.test(trim)) L.py += 1;
  if (/\binput\s*\(/.test(trim)) L.py += 1;
  if (/f["']/.test(trim)) L.py += 3;
  if (/\bself\b/.test(trim) && /\bdef\b/.test(trim)) L.py += 2;

  if (/\b(const|let|var|function|console\.log|typeof|undefined|=>)\b/.test(trim)) L.js += 3;
  if (/\b(interface|type\s+[A-Z]\w*\s*=|:\s*(string|number|boolean|any))\b/.test(trim)) L.ts += 4;
  if (/\b(public|private|protected|static|void|System\.out)\b/.test(trim)) L.java += 3;
  if (/#include\b|\bstd::|\bnullptr\b|\bint\s+main\s*\(/.test(trim)) L.cpp += 4;
  if (/\b(namespace|using\s+System|Console\.Write)\b/.test(trim)) L.cs += 3;
  if (/\b(func|package\s+main|fmt\.|:=)\b/.test(trim)) L.go += 3;
  if (/\b(fn\s+|let\s+mut|impl\s+|pub\s+fn)\b/.test(trim)) L.rust += 4;
  if (/<\/?[a-zA-Z][\w:-]*[^>]*>/.test(trim) && /<\w+/.test(trim)) {
    L.html += 4;
    score += 2;
  }
  if (/\{[^}]*:[^}]*;[^}]*\}/.test(trim) && /\b(color|margin|display|flex)\b/.test(trim)) L.css += 3;
  if (/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\b/i.test(trim)) L.sql += 4;
  if (/(^|\n)\s*(#!\/bin\/|echo\s+|export\s+\w+=)/.test(trim)) L.bash += 3;
  if (/^\s*\w+:\s*.+$/m.test(trim) && !/[{};]/.test(trim) && nonEmpty.length >= 3) L.yaml += 2;

  let best = 'plain';
  let bestN = 0;
  Object.keys(L).forEach((k) => {
    if (L[k] > bestN) {
      bestN = L[k];
      best = k;
    }
  });
  score += bestN;

  if (fenceLang) return fenceLang === 'plain' && bestN >= 2 ? best : fenceLang;
  if (bestN >= 3 && score >= 5) return best;
  if (bestN >= 2 && score >= 7) return best;
  if (bestN >= 4 && nonEmpty.length >= 2) return best;
  if (score >= 9 && (indented >= 2 || /[{};]/.test(trim))) return bestN >= 1 ? best : 'plain';
  return null;
}

/** Strip markdown fence wrapper; return body. */
export function stripCodeFence(raw) {
  const codeSrc = String(raw || '');
  const fence = codeSrc.match(/^```([a-zA-Z0-9_+-]*)[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/);
  return fence ? fence[2] : codeSrc;
}

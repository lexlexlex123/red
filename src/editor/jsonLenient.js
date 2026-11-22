/**
 * Parse project JSON from LLMs / editors.
 * Common failures:
 * - TeX with single backslashes (\frac, \( … \))
 * - Unescaped " inside SVG/HTML string values (viewBox="0 0 …")
 * - Literal newlines / tabs inside string values (LLM html/text fields)
 */

function isLetter(ch) {
  return ch && /[a-zA-Z]/.test(ch);
}

function isWs(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/** Skip whitespace; return index of next non-ws (or length). */
function skipWs(s, i) {
  while (i < s.length && isWs(s[i])) i += 1;
  return i;
}

/**
 * True if " at index i is a real JSON string terminator given context.
 * @param {'key'|'value'} kind
 */
function isRealStringEnd(s, i, kind) {
  const j = skipWs(s, i + 1);
  if (j >= s.length) return true;
  const c = s[j];
  if (kind === 'key') return c === ':';
  // value: followed by , } ] or end
  return c === ',' || c === '}' || c === ']';
}

/** Double invalid / TeX-like backslash escapes inside JSON strings. */
export function repairJsonBackslashes(text) {
  const s = String(text || '');
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      const next = s[i + 1] || '';
      const after = s[i + 2] || '';
      // Always keep JSON string escapes that can't be TeX.
      if (next === '"' || next === '\\' || next === '/') {
        out += ch;
        escaped = true;
        continue;
      }
      // \n \r \t — keep only when not starting a longer word (\not, \rightarrow…)
      if ((next === 'n' || next === 'r' || next === 't') && !isLetter(after)) {
        out += ch;
        escaped = true;
        continue;
      }
      // \b \f — in LLM dumps almost always \begin / \frac, not JSON controls
      if ((next === 'b' || next === 'f') && !isLetter(after)) {
        out += ch;
        escaped = true;
        continue;
      }
      if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) {
        out += ch;
        escaped = true;
        continue;
      }
      // \( \) \sqrt \frac \text … → literal backslash for TeX
      out += '\\\\';
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

/** Escape a raw control char for JSON string content. */
function escapeJsonControlChar(ch) {
  if (ch === '\n') return '\\n';
  if (ch === '\r') return '\\r';
  if (ch === '\t') return '\\t';
  const code = ch.charCodeAt(0);
  if (code < 32) return '\\u' + code.toString(16).padStart(4, '0');
  return ch;
}

/**
 * Escape bare " inside JSON strings when they are not terminators, and
 * escape literal control chars (newlines in html/text from LLMs).
 * Fixes: "svg": "<svg viewBox="0 0 …">" and "html": "line1\nline2".
 */
export function repairJsonUnescapedQuotes(text) {
  const s = String(text || '');
  let out = '';
  let inString = false;
  let escaped = false;
  /** @type {'key'|'value'} */
  let stringKind = 'value';
  /** After `{` or `,` in object → next string is a key. */
  let expectKey = true;
  /** Stack: 'obj' | 'arr' */
  const stack = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        if (isRealStringEnd(s, i, stringKind)) {
          inString = false;
          out += ch;
          if (stringKind === 'key') {
            // after key, expect value
            expectKey = false;
          } else {
            // after value in object, next key; in array stay values
            expectKey = stack[stack.length - 1] === 'obj';
          }
        } else {
          out += '\\"';
        }
        continue;
      }
      if (ch.charCodeAt(0) < 32) {
        out += escapeJsonControlChar(ch);
        continue;
      }
      out += ch;
      continue;
    }

    if (ch === '"') {
      inString = true;
      stringKind = expectKey && stack[stack.length - 1] === 'obj' ? 'key' : 'value';
      // top-level / array values are never keys
      if (!stack.length || stack[stack.length - 1] === 'arr') stringKind = 'value';
      out += ch;
      continue;
    }

    if (ch === '{') {
      stack.push('obj');
      expectKey = true;
      out += ch;
      continue;
    }
    if (ch === '[') {
      stack.push('arr');
      expectKey = false;
      out += ch;
      continue;
    }
    if (ch === '}' || ch === ']') {
      stack.pop();
      expectKey = stack[stack.length - 1] === 'obj';
      out += ch;
      continue;
    }
    if (ch === ',') {
      expectKey = stack[stack.length - 1] === 'obj';
      out += ch;
      continue;
    }
    if (ch === ':') {
      expectKey = false;
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

/** Strip Copilot/Cursor/ChatGPT caution banners that break LLM-exported JSON. */
export function stripAiCautionNoise(text) {
  return String(text || '')
    .replace(/^\s*Используйте код с осторожностью\.?\s*$/gim, '')
    .replace(/^\s*Use code with caution\.?\s*$/gim, '')
    .replace(/^\s*Warning:\s*Use code with caution\.?\s*$/gim, '')
    .replace(/^\s*⚠️?\s*Use code with caution\.?\s*$/gim, '');
}

export function stripJsonFence(text) {
  return stripAiCautionNoise(
    String(text || '')
      .replace(/^\uFEFF/, '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
  ).trim();
}

/**
 * Cheap structural check (no full parse): looks like a deck JSON object/array.
 * Used to avoid turning broken deck JSON into an HTML frame on paste.
 */
export function looksLikePresentationJsonRough(text) {
  const t = stripJsonFence(text);
  if (!t) return false;
  if (t[0] === '{') return /"slides"\s*:/.test(t);
  if (t[0] === '[') return /"els"\s*:/.test(t) || /"type"\s*:/.test(t);
  return false;
}

export function parseJsonLenient(text) {
  const unfenced = stripJsonFence(text);

  const attempts = [
    unfenced,
    () => repairJsonUnescapedQuotes(unfenced),
    () => repairJsonBackslashes(unfenced),
    () => repairJsonBackslashes(repairJsonUnescapedQuotes(unfenced)),
    () => repairJsonUnescapedQuotes(repairJsonBackslashes(unfenced)),
  ];

  let lastErr = null;
  for (const a of attempts) {
    const candidate = typeof a === 'function' ? a() : a;
    try {
      return JSON.parse(candidate);
    } catch (e) {
      lastErr = e;
    }
  }
  const err = new Error(lastErr?.message || 'Invalid JSON');
  err.cause = lastErr;
  throw err;
}

/**
 * True when clipboard/file text looks like a Slidy deck JSON
 * ({ slides: [...] } or a bare slides array), not a random object.
 */
export function looksLikePresentationJson(text) {
  const t = stripJsonFence(text);
  if (!t || (t[0] !== '{' && t[0] !== '[')) return false;
  // Cheap prefilter before parse (LLM decks always mention slides / els).
  if (t[0] === '{') {
    if (!/"slides"\s*:/.test(t)) return false;
  } else if (!/"els"\s*:/.test(t) && !/"type"\s*:/.test(t)) {
    return false;
  }
  try {
    const obj = parseJsonLenient(t);
    if (Array.isArray(obj)) {
      return obj.length > 0 && obj.some((s) => s && typeof s === 'object' && Array.isArray(s.els));
    }
    if (obj && typeof obj === 'object' && Array.isArray(obj.slides) && obj.slides.length > 0) {
      return obj.slides.some((s) => s && typeof s === 'object');
    }
  } catch (_) {
    /* not JSON */
  }
  return false;
}

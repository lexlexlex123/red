/** Detect Wavefront OBJ mesh text in clipboard paste. */

const OBJ_CMD = /^(o|g|s|v|vn|vt|vp|f|l|p|mtllib|usemtl)\b/i;

/**
 * Strip fences / junk and keep OBJ-looking lines so paste still works
 * with markdown wrappers or stray characters around the model.
 * @param {string} raw
 * @returns {string}
 */
export function extractObjText(raw) {
  let t = String(raw || '').replace(/^\uFEFF/, '');
  t = t.replace(/```(?:obj|wavefront)?\s*/gi, '').replace(/```/g, '');
  const lines = t.split(/\r?\n/);
  const kept = [];
  let sawGeom = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const s = line.trim();
    if (!s) {
      if (sawGeom) kept.push('');
      continue;
    }
    if (s[0] === '#') {
      kept.push(line);
      continue;
    }
    if (OBJ_CMD.test(s)) {
      kept.push(line);
      if (/^(v|vn|vt|f|l)\b/i.test(s)) sawGeom = true;
      continue;
    }
    // Drop non-OBJ noise; keep going so trailing prose does not kill the paste.
  }
  return kept.join('\n').trim();
}

/**
 * @param {string} raw
 * @returns {boolean}
 */
export function looksLikeObjText(raw) {
  const t = extractObjText(raw);
  if (t.length < 20 || t.length > 8_000_000) return false;
  const vCount = (t.match(/^\s*v\s+[-+]?\d/gim) || []).length;
  if (vCount < 3) return false;
  const fCount = (t.match(/^\s*f\s+[-+]?\d/gim) || []).length;
  const lCount = (t.match(/^\s*l\s+[-+]?\d/gim) || []).length;
  // Faces / wireframe lines — or a dense vertex-only Wavefront dump (AI meshes often ship verts first / omit f).
  if (fCount < 1 && lCount < 1) {
    if (vCount < 24) return false;
    if (!/^\s*o\s+/im.test(t) && !/wavefront|\.obj\b/i.test(raw) && !/^\s*#/m.test(t)) return false;
  }
  if (/^\s*(function|class|import|export|const|let|var)\b/m.test(t) && vCount < 8) return false;
  return true;
}

/**
 * @param {File|Blob} file
 * @returns {boolean}
 */
export function isObjFile(file) {
  if (!file) return false;
  const name = String(file.name || '').toLowerCase();
  const type = String(file.type || '').toLowerCase();
  if (name.endsWith('.obj')) return true;
  if (type === 'model/obj' || type === 'text/plain') return name.endsWith('.obj');
  return false;
}

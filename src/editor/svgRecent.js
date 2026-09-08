/** Recent SVG snippets — shared with legacy key sf_svg_recent. */

const KEY = 'sf_svg_recent';
const MAX = 12;

export function loadSvgRecent() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function saveSvgRecent(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch (e) {}
}

export function addSvgRecent(name, code) {
  const c = String(code || '').trim();
  if (!c) return loadSvgRecent();
  const items = loadSvgRecent().filter((it) => it && it.code !== c);
  items.unshift({ name: name || 'SVG', code: c });
  saveSvgRecent(items);
  return items;
}

export function clearSvgRecent() {
  saveSvgRecent([]);
  return [];
}

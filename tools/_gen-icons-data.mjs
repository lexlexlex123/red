import fs from 'fs';
const src = fs.readFileSync('js/02b-icons.js', 'utf8');
let s = src.replace(/^[\s\S]*?(?=const ICONS =)/, '');
s = s.replace('const ICONS =', 'export const ICONS =');
s = s.replace('const ICON_CATS =', 'export const ICON_CATS =');
s = s.replace(/\/\/ Быстрый поиск[\s\S]*$/, '');
s += `
const _ICON_BY_ID = Object.create(null);
ICONS.forEach((ic) => {
  _ICON_BY_ID[String(ic.id)] = ic;
  if (ic.alias) _ICON_BY_ID[ic.alias] = ic;
});
export function getIconById(id) {
  if (id == null || id === '') return null;
  return _ICON_BY_ID[String(id)] || null;
}
export function iconsForCategory(catId) {
  if (!catId || catId === 'all') return ICONS.slice();
  const cat = ICON_CATS.find((c) => c.id === catId);
  if (!cat || !cat.icons) return ICONS.slice();
  return cat.icons.map((n) => getIconById(String(n))).filter(Boolean);
}
`;
fs.writeFileSync('src/editor/icons-data.js', s);
console.log('wrote', fs.statSync('src/editor/icons-data.js').size);

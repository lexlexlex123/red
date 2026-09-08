import fs from 'fs';

const path = 'c:/github/red/js/01-state.js';
let s = fs.readFileSync(path, 'utf8');

function parse(h) {
  const m = (h || '').match(/#?([0-9a-fA-F]{6})/);
  if (!m) return null;
  const x = m[1];
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
}

function mid(a, b) {
  const pa = parse(a), pb = parse(b);
  if (!pa || !pb) return null;
  return '#' + pa.map((v, i) => Math.round((v + pb[i]) / 2).toString(16).padStart(2, '0')).join('');
}

const m = s.match(/const THEMES=(\[[\s\S]*?\]);\r?\nconst THEME_NAMES_RU/);
if (!m) throw new Error('THEMES block not found');
const themes = eval(m[1]);

for (const t of themes) {
  const c0 = t.headingColor || t.ac1;
  const c2 = (t.colors && t.colors[2]) || t.ac3;
  const mcol = mid(c0, c2);
  if (!mcol) continue;
  t.shapeFill = mcol;
  if (t.colors && t.colors.length > 1) t.colors[1] = mcol;
}

for (const t of themes) {
  const name = t.name.replace(/'/g, "\\'");
  const re = new RegExp(
    `(\\{name:'${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[\\s\\S]*?shapeFill:')#[0-9a-fA-F]{6}(')`
  );
  if (!re.test(s)) {
    console.warn('no shapeFill match', t.name);
    continue;
  }
  s = s.replace(re, `$1${t.shapeFill}$2`);

  if (t.colors) {
    const reColors = new RegExp(
      `(\\{name:'${t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[\\s\\S]*?colors:\\[)'#[0-9a-fA-F]{6}','#[0-9a-fA-F]{6}'`
    );
    if (reColors.test(s)) {
      s = s.replace(reColors, `$1'${t.colors[0]}','${t.colors[1]}'`);
    }
  }
  console.log(t.name, '->', t.shapeFill);
}

fs.writeFileSync(path, s);
console.log('done');

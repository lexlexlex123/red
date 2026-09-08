import fs from 'fs';
import path from 'path';

const THEMES = path.resolve('c:/github/red/themes');
const files = fs.readdirSync(THEMES).filter(f => /^\d{2}-/.test(f));

for (const f of files) {
  let s = fs.readFileSync(path.join(THEMES, f), 'utf8');
  s = s.replace(/,\s*,/g, ',');
  s = s.replace(/(\)\s*;\s*),(\s*\n\s*tplVariants)/g, '$1},$2');
  s = s.replace(/(\}\s*);,(\s*\n\s*tplVariants)/g, '$1},$2');
  fs.writeFileSync(path.join(THEMES, f), s, 'utf8');
  try {
    new Function(s);
    console.log('OK', f);
  } catch (e) {
    console.error('ERR', f, e.message);
  }
}

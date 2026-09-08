const fs = require('fs');
const vm = require('vm');
const ctx = { window: {}, console };
vm.runInNewContext(fs.readFileSync('js/01-state.js', 'utf8'), ctx);
const THEMES = ctx.THEMES;
const fn = ctx._schemeSwatchColor;
if (!THEMES || !fn) {
  console.log('THEMES', !!THEMES, 'fn', !!fn);
  process.exit(1);
}
THEMES.filter(t => !t.dark).slice(0, 5).forEach(th => {
  const c28 = fn(th, 1, 7);
  const c29 = fn(th, 1, 8);
  console.log(th.name, '28=', c28, '29=', c29, 'same?', c28 === c29);
});

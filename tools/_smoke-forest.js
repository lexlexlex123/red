const fs = require('fs');
const vm = require('vm');

const ctx = {
  window: {},
  _activeThemeForScheme: () => ({ dark: true }),
  _schemeSwatchColor: (t, c, r) => '#' + c + '' + r,
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);

const build = ctx.window._buildForestInkscape;
const title = build(1200, 675, '#111', '#222', true, true);
const content = build(1200, 675, '#111', '#222', false, true);
const light = build(1200, 675, '#111', '#222', true, false);
const ctxLight = { window: {}, _activeThemeForScheme: () => ({ dark: false }), _schemeSwatchColor: (t, c, r) => '#' + c + '' + r };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths.js', 'utf8'), ctxLight);
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctxLight);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctxLight);
const titleLight = ctxLight.window._buildForestInkscape(1200, 675, '#111', '#222', true, false);

const checks = [
  ['title size', title.length > 50000],
  ['content size', content.length > 50000],
  ['fogG', content.includes('fogG')],
  ['fogBlur', content.includes('fogBlur')],
  ['skewX sway', content.includes('skewX')],
  ['yDown 20', content.includes('translate(0,20)')],
  ['opacity anim', content.includes('attributeName="opacity"')],
  ['dark fog', title.includes('stop-color="#07"')],
  ['light fog', titleLight.includes('stop-color="#78"')],
  ['single content mist fn', (content.match(/<path d="/g) || []).length >= 2],
];
checks.forEach(([n, ok]) => console.log(ok ? 'OK' : 'FAIL', n));

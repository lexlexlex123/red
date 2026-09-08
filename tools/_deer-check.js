const fs = require('fs');
const vm = require('vm');
const c = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), c);
const ctx = {
  window: { FOREST_PATHS_CONTENT: c.window.FOREST_PATHS_CONTENT },
  slides: [{ bgc: '#112233' }], cur: 0,
  _activeThemeForScheme: () => ({ dark: true }),
  _resolveSchemeColor: () => '#112233',
  _schemeSwatchColor: (t, col, row) => '#' + col + row,
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const s = ctx.window._buildForestInkscape(1200, 675, '#111', '#222', false, true);
const i0 = s.indexOf('<svg x="');
const i1 = s.indexOf('<svg x="', i0 + 1);
const chunk = i1 < 0 ? s.slice(i0) : s.slice(i0, i1 + 500000);
const find = (label, needle) => ({ label, pos: chunk.indexOf(needle) });
const m = [
  find('deer', 'id="g10692"'),
  find('deer2', 'id="path10598"'),
  find('trees', 'id="g11470"'),
  find('fog', 'fogG)"'),
  find('grass', 'id="g9841"'),
].filter(x => x.pos >= 0).sort((a, b) => a.pos - b.pos);
console.log(m.map(x => x.label + '@' + x.pos).join(' < '));
console.log('trees len', (ctx.window.FOREST_PATHS_CONTENT.markup.match(/id="g11470"/) || []).length);

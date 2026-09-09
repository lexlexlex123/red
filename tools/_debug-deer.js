const fs = require('fs');
const vm = require('vm');
const ctx = {
  window: {},
  slides: [{ bgc: '#fff' }],
  cur: 0,
  _activeThemeForScheme: () => ({ dark: false }),
  _schemeSwatchColor: (th, c, r) => `SW_${c}_${r}`,
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const svg = ctx.window._buildForestInkscape(1200, 675, 'fb', 'fb', false, true);

const gi = svg.indexOf('id="g11102"');
console.log('g11102 tag:', svg.slice(gi - 120, gi + 80));

const raw = ctx.window.FOREST_PATHS_CONTENT.markup;
const ri = raw.indexOf('g11102');
const chunk = raw.slice(ri, ri + 12000);
console.log('raw deer paths with fill/style:');
[...chunk.matchAll(/<path[^>]+>/g)].slice(0, 8).forEach(p => {
  const tag = p[0];
  if (tag.length > 200) return;
  console.log(tag.slice(0, 180));
});

// parent groups in raw g11102 area
const parentFills = [...chunk.matchAll(/<g[^>]*fill="([^"]+)"/g)];
console.log('parent group fills in deer chunk:', parentFills.map(m => m[1]));

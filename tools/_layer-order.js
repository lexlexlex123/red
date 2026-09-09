const fs = require('fs');
const vm = require('vm');
const c = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), c);
const ctx = {
  window: { FOREST_PATHS_CONTENT: c.window.FOREST_PATHS_CONTENT },
  _activeThemeForScheme: () => ({ dark: true }),
  _schemeSwatchColor: (t, col, row) => '#' + col + '' + row,
};
vm.runInNewContext(fs.readFileSync('js/23a-forest-layout.js', 'utf8'), ctx);
const svg = ctx.window._buildForestInkscape(1200, 675, '#111', '#222', false, false);

// find nested svg open tags and what follows
let pos = 0;
let n = 0;
while ((pos = svg.indexOf('<svg ', pos + 1)) >= 0) {
  const chunk = svg.slice(pos, pos + 200);
  const hasDeer = chunk.includes('path10598') || svg.slice(pos, pos + 50000).includes('path10598');
  const hasGrass = svg.slice(pos, pos + 80000).includes('g9841');
  const hasTrees = svg.slice(pos, pos + 80000).includes('g11470');
  console.log(n++, 'at', pos, { trees: hasTrees, deer: hasDeer, grass: hasGrass });
  if (n > 10) break;
}

const fogPos = svg.indexOf('fogG');
const deerPos = svg.indexOf('path10598');
const grassPos = svg.indexOf('g9841');
console.log('fog use', fogPos, 'deer', deerPos, 'grass', grassPos);

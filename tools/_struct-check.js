const fs = require('fs');
const vm = require('vm');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const m = ctx.window.FOREST_PATHS_CONTENT.markup;
const ids = ['g11470', 'g10692', 'g9841', 'path10598', 'path4345'];
ids.forEach(id => {
  const i = m.indexOf('id="' + id + '"');
  console.log(id, 'at', i);
});
// is g10692 inside g11470?
const gStart = m.indexOf('id="g11470"');
const g106 = m.indexOf('id="g10692"');
const g11470Close = m.indexOf('</g>', gStart + 1000); // wrong - need depth
let depth = 0, pos = gStart;
const open = m.indexOf('>', gStart) + 1;
depth = 1;
let p = open;
while (p < m.length && depth > 0) {
  const no = m.indexOf('<g', p);
  const nc = m.indexOf('</g>', p);
  if (nc < 0) break;
  if (no >= 0 && no < nc) { depth++; p = no + 2; }
  else { depth--; if (depth === 0) { console.log('g11470 ends at', nc, 'g10692 at', g106, 'inside', g106 < nc); break; } p = nc + 4; }
}

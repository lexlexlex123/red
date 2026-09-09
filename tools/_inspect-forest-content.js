const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const code = fs.readFileSync('js/23a-forest-paths-content.js', 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(code, sandbox);
const FP = sandbox.window.FOREST_PATHS_CONTENT;

const html = `<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform || ''}">${FP.markup}</g></svg>`;
const doc = new JSDOM(html, { contentType: 'image/svg+xml' }).window.document;

function bbox(el) {
  const paths = el.querySelectorAll ? [...el.querySelectorAll('path')] : [];
  let minY = Infinity, maxY = -Infinity, n = 0;
  paths.forEach(p => {
    const d = p.getAttribute('d') || '';
    const nums = d.match(/-?\d+\.?\d*/g);
    if (!nums) return;
    for (let i = 1; i < nums.length; i += 2) {
      const y = +nums[i];
      if (!isNaN(y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); n++; }
    }
  });
  return { minY, maxY, paths: paths.length };
}

const ids = ['g11470', 'g9841', 'g9841-2', 'path10598', 'path10595',
  'path10138', 'path4345', 'path4349', 'path4487', 'path4507', 'path4517', 'path4539', 'path4551', 'path4583'];
ids.forEach(id => {
  const el = doc.getElementById(id);
  if (!el) { console.log(id, 'MISSING'); return; }
  const b = bbox(el);
  const fill = el.getAttribute('fill') || '(inherit)';
  console.log(id, 'paths', b.paths, 'y', b.minY.toFixed(0), '-', b.maxY.toFixed(0), 'fill', fill);
});

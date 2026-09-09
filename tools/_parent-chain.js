const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const FP = ctx.window.FOREST_PATHS_CONTENT;
const html = `<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform || ''}">${FP.markup}</g></svg>`;
const doc = new JSDOM(html, { contentType: 'image/svg+xml' }).window.document;

['g9841', 'g9841-2', 'path10598', 'path10595', 'g11102'].forEach(id => {
  const el = doc.getElementById(id);
  if (!el) { console.log(id, 'MISSING'); return; }
  let chain = [];
  let p = el;
  while (p && p.tagName !== 'svg') {
    chain.push(p.id || p.tagName);
    p = p.parentElement;
  }
  console.log(id, 'chain:', chain.join(' < '));
});

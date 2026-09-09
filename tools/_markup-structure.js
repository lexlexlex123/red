const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('js/23a-forest-paths-content.js', 'utf8'), ctx);
const FP = ctx.window.FOREST_PATHS_CONTENT;

const html = `<svg xmlns="http://www.w3.org/2000/svg"><g transform="${FP.groupTransform || ''}">${FP.markup}</g></svg>`;
const doc = new JSDOM(html, { contentType: 'image/svg+xml' }).window.document;
const root = doc.querySelector('g[transform]');
console.log('top-level children in markup root:');
[...root.children].forEach(ch => {
  console.log(' ', ch.tagName, ch.id || '(no id)', 'paths:', ch.querySelectorAll('path').length);
});

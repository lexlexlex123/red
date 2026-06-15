#!/usr/bin/env node
const fs = require('fs');
const path = process.argv[2];
const JSZip = require('../libs/jszip.min.js');

function normPptPath(base, target) {
  let p = target || '';
  if (p.startsWith('../')) p = base.replace(/\/[^/]+$/, '/') + p.slice(3);
  else if (!p.startsWith('ppt/')) p = base.replace(/\/[^/]+$/, '/') + p;
  return p.replace(/\/\.\//g, '/');
}

async function parseRels(zip, relsPath) {
  const map = {};
  const f = zip.file(relsPath);
  if (!f) return map;
  const xml = await f.async('text');
  const re = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g;
  let m;
  while ((m = re.exec(xml))) map[m[1]] = m[2];
  return map;
}

JSZip.loadAsync(fs.readFileSync(path)).then(async (zip) => {
  const slides = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort();
  const sf = slides[0];
  const slideRels = await parseRels(zip, 'ppt/slides/_rels/' + sf.split('/').pop() + '.rels');
  const layoutTarget = Object.values(slideRels).find((t) => t.includes('slideLayout'));
  const layoutPath = normPptPath('ppt/slides', layoutTarget);
  console.log('layoutTarget', layoutTarget, '->', layoutPath);
  const layoutFile = zip.file(layoutPath);
  if (!layoutFile) { console.log('layout not found'); process.exit(1); }
  const layoutXml = await layoutFile.async('text');
  console.log('layout', layoutPath);
  console.log('pics', (layoutXml.match(/<p:pic/g) || []).length);
  console.log('sp', (layoutXml.match(/<p:sp/g) || []).length);
  console.log('bg', layoutXml.includes('p:bg'));
  console.log('blips', (layoutXml.match(/<a:blip /g) || []).length);
  const idx = layoutXml.indexOf('p:pic');
  if (idx >= 0) console.log('sample pic', layoutXml.slice(idx, idx + 400));
});

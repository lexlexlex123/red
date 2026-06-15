#!/usr/bin/env node
/* Мини-тест: сколько картинок извлекается после чтения layout */
const fs = require('fs');
const path = process.argv[2];
const JSZip = require('../libs/jszip.min.js');
// blip count only — no browser DOM needed
function normPptPath(baseDir, target) {
  if (!target) return '';
  let p = target;
  if (p.startsWith('../')) {
    const parts = baseDir.split('/').filter(Boolean);
    const segs = p.split('/');
    let ups = 0; const rest = [];
    segs.forEach((s) => { if (s === '..') ups++; else if (s && s !== '.') rest.push(s); });
    p = [...parts.slice(0, Math.max(0, parts.length - ups)), ...rest].join('/');
  } else if (!p.startsWith('ppt/')) p = baseDir.replace(/\/[^/]*$/, '') + '/' + p;
  return p.replace(/\/\.\//g, '/');
}

JSZip.loadAsync(fs.readFileSync(path)).then(async (zip) => {
  const slides = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort();
  let total = 0;
  for (const sf of slides) {
    const xml = await zip.file(sf).async('text');
    const slideBlips = (xml.match(/<a:blip /g) || []).length;
    const rels = await zip.file('ppt/slides/_rels/' + sf.split('/').pop() + '.rels').async('text');
    const lt = rels.match(/Target="([^"]*slideLayout[^"]*)"/);
    let layoutBlips = 0;
    if (lt) {
      const lp = normPptPath('ppt/slides', lt[1]);
      const lxml = await zip.file(lp).async('text');
      layoutBlips = (lxml.match(/<a:blip /g) || []).length;
    }
    const n = slideBlips + layoutBlips;
    total += n;
    if (n > 0) console.log(sf, 'slide', slideBlips, '+ layout', layoutBlips, '=', n);
  }
  let layoutOnly = 0;
  for (const sf of slides) {
    const xml = await zip.file(sf).async('text');
    const slideBlips = (xml.match(/<a:blip /g) || []).length;
    const rels = await zip.file('ppt/slides/_rels/' + sf.split('/').pop() + '.rels').async('text');
    const lt = rels.match(/Target="([^"]*slideLayout[^"]*)"/);
    let layoutBlips = 0;
    if (lt) {
      const lp = normPptPath('ppt/slides', lt[1]);
      const lxml = await zip.file(lp).async('text');
      layoutBlips = (lxml.match(/<a:blip /g) || []).length;
    }
    if (slideBlips === 0 && layoutBlips > 0) layoutOnly++;
  }
  console.log('slides with layout-only images:', layoutOnly, 'of', slides.length);
  console.log('total blips (slide+layout):', total);
}).catch((e) => console.error(e));

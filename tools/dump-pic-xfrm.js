#!/usr/bin/env node
const fs = require('fs');
const path = process.argv[2];
const n = +(process.argv[3] || 8);
const JSZip = require('../libs/jszip.min.js');

function normPptPath(baseDir, target) {
  let p = target;
  if (p.startsWith('../')) {
    const parts = baseDir.split('/').filter(Boolean);
    const segs = p.split('/');
    let ups = 0;
    const rest = [];
    segs.forEach((s) => { if (s === '..') ups++; else if (s && s !== '.') rest.push(s); });
    p = [...parts.slice(0, Math.max(0, parts.length - ups)), ...rest].join('/');
  } else if (!p.startsWith('ppt/')) p = baseDir.replace(/\/[^/]*$/, '') + '/' + p;
  return p.replace(/\/\.\//g, '/');
}

JSZip.loadAsync(fs.readFileSync(path)).then(async (zip) => {
  const slideRels = await zip.file('ppt/slides/_rels/slide1.xml.rels').async('text');
  const lt = slideRels.match(/Target="([^"]*slideLayout[^"]*)"/)[1];
  const lp = normPptPath('ppt/slides', lt);
  const lxml = await zip.file(lp).async('text');
  const pics = lxml.split('<p:pic').slice(1);
  const chunk = pics[n - 1];
  const name = (chunk.match(/name="([^"]+)"/) || [])[1];
  console.log('pic', n, name);
  const xfrms = chunk.match(/<a:xfrm[\s\S]*?<\/a:xfrm>/g) || [];
  xfrms.forEach((x, i) => console.log('xfrm', i, x));
}).catch(console.error);

#!/usr/bin/env node
const fs = require('fs');
const path = process.argv[2];
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
  const slideNum = +(process.argv[3] || 1);
  const slideRels = await (await zip.file('ppt/slides/_rels/slide' + slideNum + '.xml.rels').async('text'));
  const lt = slideRels.match(/Target="([^"]*slideLayout[^"]*)"/)[1];
  const lp = normPptPath('ppt/slides', lt);
  const lxml = await zip.file(lp).async('text');
  const grps = (lxml.match(/<p:grpSp[\s\S]*?<\/p:grpSp>/g) || []).length;
  const grps2 = (lxml.match(/<p:grpSp/g) || []).length;
  console.log('grpSp count', grps2);
  // show first 3 grpSp with child pic count and group xfrm
  let idx = 0;
  let pos = 0;
  while ((pos = lxml.indexOf('<p:grpSp', pos)) >= 0 && idx < 8) {
    const end = lxml.indexOf('</p:grpSp>', pos);
    const chunk = lxml.slice(pos, end + 10);
    const goff = chunk.match(/<a:off x="(\d+)" y="(\d+)"/);
    const gext = chunk.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
    const pics = (chunk.match(/<p:pic/g) || []).length;
    const name = (chunk.match(/name="([^"]+)"/) || [])[1] || '?';
    console.log('grp', idx + 1, name, 'pics', pics, goff ? `off ${goff[1]},${goff[2]}` : '', gext ? `ext ${gext[1]}x${gext[2]}` : '');
    pos = end + 10;
    idx++;
  }
}).catch(console.error);

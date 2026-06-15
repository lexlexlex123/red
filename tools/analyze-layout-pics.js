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

let sW = 9144000, sH = 6858000, W = 1200, H = 675;

JSZip.loadAsync(fs.readFileSync(path)).then(async (zip) => {
  try {
    const pxml = await zip.file('ppt/presentation.xml').async('text');
    const m = pxml.match(/sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
    if (m) { sW = +m[1]; sH = +m[2]; }
    const ratio = sW / sH;
    H = Math.abs(ratio - 16 / 9) < 0.1 ? 675 : 900;
    W = 1200;
    console.log('EMU', sW, sH, 'canvas', W, 'x', H);
  } catch (e) {}
  const scX = W / sW, scY = H / sH;
  const slideNum = +(process.argv[3] || 1);
  const sf = 'ppt/slides/slide' + slideNum + '.xml';
  const slideRels = await parseRels(zip, 'ppt/slides/_rels/slide' + slideNum + '.xml.rels');
  const layoutTarget = Object.values(slideRels).find((t) => t && t.includes('slideLayout'));
  const layoutPath = normPptPath('ppt/slides', layoutTarget);
  const layoutName = layoutPath.split('/').pop();
  const layoutMap = await parseRels(zip, 'ppt/slideLayouts/_rels/' + layoutName + '.rels');
  const lxml = await zip.file(layoutPath).async('text');

  console.log('===', sf, 'layout', layoutPath, '===');

  // bg blip
  const bgMatch = lxml.match(/<p:bg[\s\S]*?<\/p:bg>/);
  if (bgMatch) {
    const embed = bgMatch[0].match(/r:embed="([^"]+)"/);
    const tile = /tile|stretch/i.test(bgMatch[0]);
    console.log('p:bg embed', embed ? embed[1] : 'none', 'tile/stretch', tile);
    if (embed) console.log('  ->', layoutMap[embed[1]]);
  } else console.log('no p:bg');

  const pics = lxml.split('<p:pic').slice(1);
  const byMedia = {};
  pics.forEach((chunk, i) => {
    const off = chunk.match(/<a:off x="(\d+)" y="(\d+)"/);
    const ext = chunk.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
    const embed = chunk.match(/r:embed="([^"]+)"/);
    const rid = embed ? embed[1] : '?';
    const target = (layoutMap[rid] || '?').split('/').pop();
    const name = (chunk.match(/name="([^"]+)"/) || [])[1] || '?';
    const x = off ? Math.round(+off[1] * scX) : 0;
    const y = off ? Math.round(+off[2] * scY) : 0;
    const w = ext ? Math.round(+ext[1] * scX) : 0;
    const h = ext ? Math.round(+ext[2] * scY) : 0;
    const full = w >= W * 0.88 && h >= H * 0.88 && x <= W * 0.06 && y <= H * 0.06;
    const tileFill = /<a:tile[^/]/i.test(chunk);
    const stretchFill = /<a:stretch/i.test(chunk);
    const key = target;
    if (!byMedia[key]) byMedia[key] = [];
    byMedia[key].push({ name, x, y, w, h, full, tileFill, stretchFill });
    console.log(
      String(i + 1).padStart(2),
      name.slice(0, 24).padEnd(24),
      target.padEnd(14),
      `pos ${x},${y} ${w}x${h}`,
      full ? 'FULL' : '',
      tileFill ? 'TILE' : '',
      stretchFill ? 'STRETCH' : ''
    );
  });

  console.log('\n--- grouped by media file ---');
  Object.entries(byMedia).forEach(([media, arr]) => {
    console.log(media, 'x' + arr.length, arr.map((a) => `${a.x},${a.y} ${a.w}x${a.h}`).join(' | '));
  });
}).catch((e) => console.error(e));

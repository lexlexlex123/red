import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = 'C:/github/red v8/tools/_pptx_ugaday_mem/unzip/ppt/slides';
const files = readdirSync(dir).filter((f) => /^slide\d+\.xml$/.test(f)).sort((a, b) => {
  return parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10);
});

function extractTcPr(tbl) {
  const cells = [];
  const re = /<a:tc\b([^>]*)>([\s\S]*?)<\/a:tc>/g;
  let m;
  while ((m = re.exec(tbl))) {
    const inner = m[2];
    const texts = [...inner.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((x) => x[1]);
    const tcPr = inner.match(/<a:tcPr([^>]*)>([\s\S]*?)<\/a:tcPr>/);
    const info = { text: texts.join(' | '), attrs: (m[1] || '').trim(), sides: {}, noFill: false, fill: null };
    if (tcPr) {
      const body = tcPr[2];
      info.noFill = body.includes('<a:noFill');
      const sf = body.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
      info.fill = sf ? sf[1].replace(/\s+/g, '') : null;
      for (const s of ['lnL', 'lnR', 'lnT', 'lnB']) {
        const sm = body.match(new RegExp(`<a:${s}\\b([^>]*)>([\\s\\S]*?)</a:${s}>`));
        if (!sm) {
          info.sides[s] = null;
          continue;
        }
        const w = /w="(\d+)"/.exec(sm[1]);
        const no = sm[2].includes('<a:noFill');
        const col = sm[2].match(/<(?:a:srgbClr|a:schemeClr)[^>]*val="([^"]+)"/);
        info.sides[s] = { w: w ? +w[1] : null, noFill: no, color: col ? col[1] : null, raw: (sm[1] + sm[2]).slice(0, 160) };
      }
    }
    cells.push(info);
  }
  return cells;
}

for (const file of files) {
  const xml = readFileSync(join(dir, file), 'utf8');
  if (!xml.includes('<a:tbl')) continue;
  const tbls = [...xml.matchAll(/<a:tbl\b[\s\S]*?<\/a:tbl>/g)].map((x) => x[0]);
  console.log('\n====', file, 'tables', tbls.length);
  tbls.forEach((tbl, ti) => {
    const style = (tbl.match(/<a:tableStyleId>([^<]+)<\/a:tableStyleId>/) || [])[1];
    const tblPr = (tbl.match(/<a:tblPr([^>]*)>/) || [])[1];
    const cells = extractTcPr(tbl);
    console.log(' table', ti, 'tblPr', tblPr, 'style', style, 'cells', cells.length);
    cells.forEach((c, i) => {
      console.log('  cell', i, JSON.stringify({ text: c.text, noFill: c.noFill, fill: c.fill, sides: c.sides }));
    });
  });
}

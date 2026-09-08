#!/usr/bin/env node
const fs = require('fs');
const transcript = 'C:/Users/q3lex/.cursor/projects/c-github-red/agent-transcripts/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66.jsonl';

let src = fs.readFileSync('c:/github/red/.restore-layouts/23-layout-from-head.js', 'utf8');
const lines = fs.readFileSync(transcript, 'utf8').split('\n');
let applied = 0, skipped = 0;

const kw = /forestLayer|FOREST_PATHS|fogFlame|mistBefore|mistBelt|forestPart|recolorMarkup|P\.trees|P\.grass|fogG|cForest|mistContent/i;

for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  if (!line.includes('StrReplace') || !line.includes('23-layout')) continue;
  let o;
  try { o = JSON.parse(line); } catch (e) { continue; }
  const parts = (o.message && o.message.content) || [];
  for (const p of parts) {
    if (p.name !== 'StrReplace' || !p.input) continue;
    const inp = p.input;
    if (!inp.path || !String(inp.path).includes('23-layout.js')) continue;
    const old = (inp.old_string || '').replace(/\r\n/g, '\n');
    const neu = (inp.new_string || '').replace(/\r\n/g, '\n');
    if (!kw.test(old) && !kw.test(neu)) continue;
    if (!old || !src.includes(old)) { skipped++; continue; }
    src = src.replace(old, neu);
    applied++;
  }
}

fs.writeFileSync('c:/github/red/.restore-layouts/23-layout-forest-replayed.js', src);
console.log('applied', applied, 'skipped', skipped);
console.log('has forestLayer', src.includes('forestLayer'));
console.log('has FOREST_PATHS', src.includes('FOREST_PATHS'));
console.log('has fogFlameBand', src.includes('fogFlameBand'));
console.log('has recolorMarkup', src.includes('recolorMarkup'));

const m = src.match(/name:'Лес'[\s\S]*?titleSvg\(w,h,a1,a2/);
if (m) {
  fs.writeFileSync('c:/github/red/.restore-layouts/forest-block-snippet.txt', m[0].slice(0, 80000));
  console.log('forest block len', m[0].length);
}

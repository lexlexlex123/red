#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const ROOT = 'c:/github/red';
const transcript = 'C:/Users/q3lex/.cursor/projects/c-github-red/agent-transcripts/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66.jsonl';

let src = execSync('git show HEAD:js/23-layout.js', { cwd: ROOT, encoding: 'utf8' });
src = src.replace(/\r\n/g, '\n');

const lines = fs.readFileSync(transcript, 'utf8').split('\n');
let applied = 0, skipped = 0;

for (const line of lines) {
  if (!line.includes('StrReplace')) continue;
  let o;
  try { o = JSON.parse(line); } catch (e) { continue; }
  const parts = (o.message && o.message.content) || [];
  for (const p of parts) {
    if (p.name !== 'StrReplace' || !p.input) continue;
    const inp = p.input;
    if (!inp.path || !String(inp.path).replace(/\\/g, '/').endsWith('js/23-layout.js')) continue;
    let old = (inp.old_string || '').replace(/\r\n/g, '\n');
    let neu = (inp.new_string || '').replace(/\r\n/g, '\n');
    if (!old || !neu) continue;
    if (!src.includes(old)) { skipped++; continue; }
    src = src.replace(old, neu);
    applied++;
  }
}

const out = ROOT + '/.restore-layouts/23-layout-from-head.js';
fs.mkdirSync(ROOT + '/.restore-layouts', { recursive: true });
fs.writeFileSync(out, src);

const checks = [
  "name:'Утки'", "name:'Птицы'", "name:'Болото'", "name:'Плитка'",
  'forestLayer', 'FOREST_PATHS', '_swimDuck', '_buildSwimmers', '_leafD'
];
console.log('Applied:', applied, 'Skipped:', skipped, 'Len:', src.length);
checks.forEach(k => console.log(k + ':', src.includes(k)));

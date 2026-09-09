#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const transcript = 'C:/Users/q3lex/.cursor/projects/c-github-red/agent-transcripts/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66.jsonl';
const layoutFile = path.join(__dirname, '..', 'js', '23-layout.js');
const outDir = path.join(__dirname, '..', '.restore-layouts');

let content = fs.readFileSync(layoutFile, 'utf8');
const lines = fs.readFileSync(transcript, 'utf8').split('\n');
let applied = 0;
let skipped = 0;

for (const line of lines) {
  if (!line.includes('"StrReplace"') || !line.includes('23-layout.js')) continue;
  let o;
  try { o = JSON.parse(line); } catch (e) { continue; }
  const parts = (o.message && o.message.content) || [];
  for (const p of parts) {
    if (p.name !== 'StrReplace' || !p.input) continue;
    const inp = p.input;
    if (!inp.path || !inp.path.replace(/\\/g, '/').endsWith('js/23-layout.js')) continue;
    if (!inp.old_string || !inp.new_string) continue;
    if (!content.includes(inp.old_string)) {
      skipped++;
      continue;
    }
    content = content.replace(inp.old_string, inp.new_string);
    applied++;
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, '23-layout-replayed.js'), content);

const checks = [
  "name:'Утки'", "name:'Болото'", "name:'Плитка'",
  'forestLayer', 'FOREST_PATHS', '_swimDuck', '_buildSwimmers'
];
console.log('Applied:', applied, 'Skipped:', skipped);
checks.forEach(k => console.log(k + ':', content.includes(k)));

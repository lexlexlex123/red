#!/usr/bin/env node
const fs = require('fs');
const transcript = 'C:/Users/q3lex/.cursor/projects/c-github-red/agent-transcripts/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66.jsonl';
const lines = fs.readFileSync(transcript, 'utf8').split('\n');
let n = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.includes('FOREST_PATHS') || !line.includes('23-layout')) continue;
  let o;
  try { o = JSON.parse(line); } catch (e) { continue; }
  const parts = (o.message && o.message.content) || [];
  for (const p of parts) {
    if (p.name !== 'StrReplace' || !p.input || !p.input.new_string) continue;
    if (!String(p.input.path).includes('23-layout')) continue;
    const ns = p.input.new_string;
    if (!ns.includes('FOREST_PATHS')) continue;
    n++;
    console.log('line', i + 1, 'patch', n, 'new len', ns.length, 'old len', (p.input.old_string || '').length);
    if (ns.includes('forestSilhouette') || ns.includes('forestLayer')) {
      console.log('  has forestSilhouette/layer');
    }
    if (n <= 3) {
      fs.writeFileSync(`c:/github/red/.restore-layouts/forest-patch-${n}-new.txt`, ns);
      fs.writeFileSync(`c:/github/red/.restore-layouts/forest-patch-${n}-old.txt`, p.input.old_string || '');
    }
  }
}

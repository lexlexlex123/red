#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const transcript = 'C:/Users/q3lex/.cursor/projects/c-github-red/agent-transcripts/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66.jsonl';

let src = fs.readFileSync('c:/github/red/.restore-layouts/23-layout-from-head.js', 'utf8');
const lines = fs.readFileSync(transcript, 'utf8').split('\n');
let applied = 0;

for (const line of lines) {
  if (!line.includes('StrReplace') || !line.includes('forestLayer')) continue;
  let o;
  try { o = JSON.parse(line); } catch (e) { continue; }
  const parts = (o.message && o.message.content) || [];
  for (const p of parts) {
    if (p.name !== 'StrReplace' || !p.input) continue;
    const inp = p.input;
    if (!inp.path || !String(inp.path).includes('23-layout')) continue;
    let old = (inp.old_string || '').replace(/\r\n/g, '\n');
    let neu = (inp.new_string || '').replace(/\r\n/g, '\n');
    if (!old.includes('forest') && !neu.includes('forest') && !old.includes('Лес') && !neu.includes('FOREST')) continue;
    if (!src.includes(old)) continue;
    src = src.replace(old, neu);
    applied++;
    console.log('applied forest patch', applied, 'old len', old.length);
  }
}

fs.writeFileSync('c:/github/red/.restore-layouts/23-layout-forest-pass.js', src);
console.log('forestLayer:', src.includes('forestLayer'), 'FOREST_PATHS:', src.includes('FOREST_PATHS'));

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const transcript = 'C:/Users/q3lex/.cursor/projects/c-github-red/agent-transcripts/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66/fc017b5e-ee5c-415b-91e5-8a8ec37d7f66.jsonl';
const outDir = path.join(__dirname, '..', '.restore-layouts');
fs.mkdirSync(outDir, { recursive: true });

const lines = fs.readFileSync(transcript, 'utf8').split('\n');
const markers = [
  { key: 'ducks', test: s => s.includes("name:'Утки'") || s.includes("name:'Птицы'") && s.includes('_swimDuck') },
  { key: 'swamp', test: s => s.includes("name:'Болото'") },
  { key: 'tile', test: s => s.includes("name:'Плитка'") },
  { key: 'forest', test: s => s.includes('forestLayer') && s.includes('FOREST_PATHS') },
  { key: 'forest-full', test: s => s.includes("name:'Лес'") && s.includes('forestLayer') },
];

const found = {};
for (const line of lines) {
  if (!line.includes('StrReplace')) continue;
  let o;
  try { o = JSON.parse(line); } catch (e) { continue; }
  const parts = (o.message && o.message.content) || [];
  for (const p of parts) {
    if (p.name !== 'StrReplace' || !p.input || !p.input.new_string) continue;
    const ns = p.input.new_string;
    if (!p.input.path || !String(p.input.path).includes('23-layout')) continue;
    for (const m of markers) {
      if (m.test(ns)) {
        if (!found[m.key] || ns.length > found[m.key].len) {
          found[m.key] = { len: ns.length, ns, old: (p.input.old_string || '').slice(0, 200) };
        }
      }
    }
  }
}

for (const [k, v] of Object.entries(found)) {
  const file = path.join(outDir, k + '.txt');
  fs.writeFileSync(file, v.ns);
  console.log(k, 'len', v.len, '->', file);
  console.log('  old head:', v.old.replace(/\n/g, '\\n').slice(0, 120));
}

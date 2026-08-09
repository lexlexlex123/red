const fs = require('fs');
const s = fs.readFileSync('c:/github/red/js/26-export.js', 'utf8');
const mediaIdx = s.indexOf("else if(d.type==='mediaaudio')");
const chunk = s.slice(mediaIdx, mediaIdx + 1200);
console.log(chunk);
console.log('---');
console.log('has style+=', chunk.includes("el.style.cssText+="));
const m = chunk.match(/el\.style\.cssText\+=.{0,80}/);
console.log('match', m && m[0]);

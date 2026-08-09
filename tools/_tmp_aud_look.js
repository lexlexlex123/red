const fs = require('fs');
const path = 'c:/github/red/js/26-export.js';
const s = fs.readFileSync(path, 'utf8');
const idx = s.indexOf("else if(d.type==='mediaaudio')");
console.log(s.slice(idx, idx + 900));

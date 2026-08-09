const fs = require('fs');
const s = fs.readFileSync('c:/github/red/js/26-export.js', 'utf8');
const idx = s.indexOf("else if(mmode==='click-el')");
console.log(s.slice(idx, idx + 1800));

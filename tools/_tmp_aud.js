const fs = require('fs');
const L = fs.readFileSync('c:/github/red/js/26-export.js', 'utf8');
const needle = "else if(d.type==='mediaaudio')";
const idx = L.indexOf(needle);
console.log(L.slice(idx, idx + 2200));

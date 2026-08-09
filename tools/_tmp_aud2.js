const fs = require('fs');
const L = fs.readFileSync('c:/github/red/js/26-export.js', 'utf8');
const idx = L.indexOf("else if(mmode==='click-el')");
console.log(L.slice(idx, idx + 1800));

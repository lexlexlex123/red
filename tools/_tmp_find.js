const fs = require('fs');
const path = 'c:/github/red/js/26-export.js';
let s = fs.readFileSync(path, 'utf8');
const i = s.indexOf('if(t._mAudioTrig)');
console.log('idx', i);
console.log(JSON.stringify(s.slice(i, i + 350)));

const fs=require('fs');
const p='c:/github/red/js/08-serialize.js';
let s=fs.readFileSync(p,'utf8');
const a="if(el.dataset.pteShowHistory !== undefined) d.pteShowHistory = el.dataset.pteShowHistory !== 'false';";
const b="if(el.dataset.pteIcon !== undefined) d.pteIcon = el.dataset.pteIcon === 'true';";
if(!s.includes(a)) throw new Error('old string missing');
s=s.replace(a,b);
fs.writeFileSync(p,s);
console.log('serialize ok');

const fs = require('fs');
const path = 'c:/github/red/js/26-export.js';
let s = fs.readFileSync(path, 'utf8');

const mediaIdx = s.indexOf("else if(d.type==='mediaaudio')");
const marker = "el.style.cssText+=";
const styleStart = s.indexOf(marker, mediaIdx);
const afterStyle = s.indexOf("var _d=function(m,c2)", styleStart);
console.log({ mediaIdx, styleStart, afterStyle, snippet: s.slice(styleStart, styleStart + 60) });

const neuVis =
  "el.style.cssText+='display:flex;flex-direction:column;align-items:stretch;justify-content:center;background:rgba(25,25,45,.92);border:1px solid rgba(255,255,255,.1);border-radius:8px;overflow:hidden;box-sizing:border-box;';" +
  "var _aLbl=msrc?(msrc.indexOf('data:')===0?'\\u0410\\u0443\\u0434\\u0438\\u043e\\u0444\\u0430\\u0439\\u043b':'\\u0410\\u0443\\u0434\\u0438\\u043e'):'\\u0410\\u0443\\u0434\\u0438\\u043e';" +
  "el.innerHTML='<div style=\"display:flex;align-items:center;gap:10px;padding:0 12px;width:100%;height:100%;box-sizing:border-box;pointer-events:none;\">" +
  "<svg class=\"_ma-ico\" width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"rgba(255,255,255,.7)\" stroke-width=\"1.5\" style=\"flex-shrink:0\"><path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/></svg>" +
  "<div style=\"flex:1;min-width:0;\"><div style=\"font-size:11px;color:rgba(255,255,255,.75);font-family:sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\">'+_aLbl+'</div>" +
  "<div style=\"height:2px;background:rgba(255,255,255,.18);border-radius:2px;margin-top:4px;\"></div></div>" +
  "<svg class=\"_ma-play\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"rgba(255,255,255,.7)\" stroke=\"none\" style=\"flex-shrink:0\"><polygon points=\"5,3 19,12 5,21\"/></svg></div>';";

// Actually use real Cyrillic - file is UTF-8
const neuVis2 =
  "el.style.cssText+='display:flex;flex-direction:column;align-items:stretch;justify-content:center;background:rgba(25,25,45,.92);border:1px solid rgba(255,255,255,.1);border-radius:8px;overflow:hidden;box-sizing:border-box;';" +
  "var _aLbl=msrc?(msrc.indexOf('data:')===0?'Аудиофайл':'Аудио'):'Аудио';" +
  "el.innerHTML='<div style=\"display:flex;align-items:center;gap:10px;padding:0 12px;width:100%;height:100%;box-sizing:border-box;pointer-events:none;\">" +
  "<svg class=\"_ma-ico\" width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"rgba(255,255,255,.7)\" stroke-width=\"1.5\" style=\"flex-shrink:0\"><path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/></svg>" +
  "<div style=\"flex:1;min-width:0;\"><div style=\"font-size:11px;color:rgba(255,255,255,.75);font-family:sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\">'+_aLbl+'</div>" +
  "<div style=\"height:2px;background:rgba(255,255,255,.18);border-radius:2px;margin-top:4px;\"></div></div>" +
  "<svg class=\"_ma-play\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"rgba(255,255,255,.7)\" stroke=\"none\" style=\"flex-shrink:0\"><polygon points=\"5,3 19,12 5,21\"/></svg></div>';";

if (styleStart < 0 || afterStyle < 0) process.exit(1);
s = s.slice(0, styleStart) + neuVis2 + s.slice(afterStyle);

const oldIco = "var _ico=function(p){var s=el.querySelector('svg');if(s)s.style.stroke=p?'rgba(99,210,150,.9)':mic;};";
const neuIco = "var _ico=function(p){var c=p?'rgba(99,210,150,.9)':'rgba(255,255,255,.7)';var ico=el.querySelector('._ma-ico');if(ico)ico.style.stroke=c;var pl=el.querySelector('._ma-play');if(pl)pl.setAttribute('fill',c);};";
if (!s.includes(oldIco)) {
  console.error('ico missing');
  process.exit(1);
}
s = s.replace(oldIco, neuIco);
s = s.split("e.target.closest('#nav,#p-nav,.nb')").join("e.target.closest('#nav,#p-nav,#bp,#bn,#bx,#info,.nb')");

fs.writeFileSync(path, s);
console.log('patched ok', s.includes('_ma-ico'), s.includes('_expApplyNavUI'));

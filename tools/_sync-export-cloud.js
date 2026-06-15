const fs = require('fs');

/** Sync cloud generator from 09-shapes.js into 26-export.js (no nested backticks — export embeds code in html template). */
const shapes = fs.readFileSync('c:/github/red/js/09-shapes.js', 'utf8');
const exportPath = 'c:/github/red/js/26-export.js';
let exp = fs.readFileSync(exportPath, 'utf8');

let cloudBlock = shapes.slice(
  shapes.indexOf('// ══════════════ CLOUD SHAPE GENERATOR ══════════════'),
  shapes.indexOf('function renderShapeEl(el,d){')
).trim();

cloudBlock = cloudBlock.replace(
  /function _circlePathD\(c\) \{[\s\S]*?\n\}\n\nfunction _cloudBlobsPath/,
  "function _circlePathD(c){var cx=c.cx,cy=c.cy,r=c.r;return 'M '+(cx-r).toFixed(2)+' '+cy.toFixed(2)+' A '+r.toFixed(2)+' '+r.toFixed(2)+' 0 1 1 '+(cx+r).toFixed(2)+' '+cy.toFixed(2)+' A '+r.toFixed(2)+' '+r.toFixed(2)+' 0 1 1 '+(cx-r).toFixed(2)+' '+cy.toFixed(2)+' Z ';}\n\nfunction _cloudBlobsPath"
);
cloudBlock = cloudBlock.replace(
  /return `#\$\{sr\.toString\(16\)\.padStart\(2, '0'\)\}[\s\S]*?padStart\(2, '0'\)\}`;/,
  "return '#'+sr.toString(16).padStart(2,'0')+sg.toString(16).padStart(2,'0')+sb.toString(16).padStart(2,'0');"
);
cloudBlock = cloudBlock.replace(
  /return `#\$\{Math\.min\(255, r \+ 38\)[\s\S]*?padStart\(2, '0'\)\}`;/,
  "return '#'+Math.min(255,r+38).toString(16).padStart(2,'0')+Math.min(255,g+42).toString(16).padStart(2,'0')+Math.min(255,b+28).toString(16).padStart(2,'0');"
);
cloudBlock = cloudBlock.replace(
  /function _buildCloudArtSvg[\s\S]*?\n\}\n\nfunction _generateCloudPath/,
  "function _buildCloudArtSvg(circles,fill,shade,op,uid,extra,shadow,w,h){var path=_cloudBlobsPath(circles,0),gid='cg_'+uid,opAttr=op<1?' opacity=\"'+op.toFixed(3)+'\"':'',defs='<linearGradient id=\"'+gid+'\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"'+(h*0.08).toFixed(1)+'\" x2=\"0\" y2=\"'+h.toFixed(1)+'\"><stop offset=\"0%\" stop-color=\"'+_cloudHighlightFromFill(fill)+'\"/><stop offset=\"45%\" stop-color=\"'+fill+'\"/><stop offset=\"100%\" stop-color=\"'+shade+'\"/></linearGradient>',body='<path d=\"'+path+'\" fill-rule=\"nonzero\" fill=\"url(#'+gid+')\" stroke=\"none\" '+extra+shadow+opAttr+'/>';return '<defs>'+defs+'</defs>'+body;}\n\nfunction _generateCloudPath"
);
if (cloudBlock.includes('`')) throw new Error('cloud block still contains backticks');

cloudBlock += '\n';

const oldStart = exp.indexOf('// ══════════════ CLOUD SHAPE GENERATOR ══════════════');
const oldEnd = exp.indexOf('function _expArcPath(', oldStart);
if (oldStart < 0 || oldEnd < 0) throw new Error('export cloud markers missing');
exp = exp.slice(0, oldStart) + cloudBlock + exp.slice(oldEnd);

const newCloudBranch = "if(sh.special==='cloud'){var _circles=_cloudResolveCircles(d,w,h);var _cPath=_cloudBlobsPath(_circles,0);var _strokePart='';if(sw>0){var _sPath=_cloudBlobsPath(_circles,sw/2);_strokePart='<path d=\"'+_sPath+'\" fill-rule=\"nonzero\" fill=\"'+sc+'\" stroke=\"none\" '+ex+'/>';}var _fillPart='';if(hasFill){if(d.fillGrad&&d.fillGrad2){_fillPart='<path d=\"'+_cPath+'\" fill-rule=\"nonzero\" '+fA+' stroke=\"none\" '+ex+' '+shadow+'/>';}else{_fillPart=_buildCloudArtSvg(_circles,fill,_cloudShadeFromFill(fill),op,d.id,ex,shadow,w,h);}}return _strokePart+_fillPart;}";
if (!exp.includes('_cloudResolveCircles(d,w,h)')) {
  const oldCloudBranch = "if(sh.special==='cloud'){var _cPath=_generateCloudPath(w,h,d.cloudSeed||42);var _fillPart='<path d=\"'+_cPath+'\" fill-rule=\"nonzero\" '+fA+' stroke=\"none\" '+ex+' '+shadow+'/>';var _strokePart='';if(sw>0){var _mId='cldm_'+d.id;_strokePart='<defs><mask id=\"'+_mId+'\"><rect width=\"'+w+'\" height=\"'+h+'\" fill=\"white\"/><path d=\"'+_cPath+'\" fill-rule=\"nonzero\" fill=\"black\"/></mask></defs><path d=\"'+_cPath+'\" fill-rule=\"nonzero\" fill=\"none\" '+sA+' mask=\"url(#'+_mId+')\" '+ex+'/>';}return _fillPart+_strokePart;}";
  const oldCloudBranch2 = "if(sh.special==='cloud'){var _circles=_generateCloudCircles(w,h,d.cloudSeed||42,d.cloudForm||'puff');var _cPath=_cloudBlobsPath(_circles,0);var _strokePart='';if(sw>0){var _sPath=_cloudBlobsPath(_circles,sw/2);_strokePart='<path d=\"'+_sPath+'\" fill-rule=\"nonzero\" fill=\"'+sc+'\" stroke=\"none\" '+ex+'/>';}var _fillPart='';if(hasFill){if(d.fillGrad&&d.fillGrad2){_fillPart='<path d=\"'+_cPath+'\" fill-rule=\"nonzero\" '+fA+' stroke=\"none\" '+ex+' '+shadow+'/>';}else{_fillPart=_buildCloudArtSvg(_circles,fill,_cloudShadeFromFill(fill),op,d.id,ex,shadow,w,h);}}return _strokePart+_fillPart;}";
  if (exp.includes(oldCloudBranch2)) exp = exp.replace(oldCloudBranch2, newCloudBranch);
  else if (exp.includes(oldCloudBranch)) exp = exp.replace(oldCloudBranch, newCloudBranch);
}
exp = exp.replace(
  /var _circles=_generateCloudCircles\(w,h,d\.cloudSeed\|\|42,d\.cloudForm\|\|'puff'\);/g,
  'var _circles=_cloudResolveCircles(d,w,h);'
);

fs.writeFileSync(exportPath, exp);
require('child_process').execSync('node --check ' + exportPath, { stdio: 'inherit' });
console.log('export.js cloud sync OK');

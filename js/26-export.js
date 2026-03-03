// ══════════════ EXPORT ══════════════
function exportHTML(){
  save();const title=document.getElementById('pres-title').value||'Presentation';
  const sd=JSON.stringify(slides),bgsd=JSON.stringify(BGS);const W=canvasW,H=canvasH;
  const html=buildExportHTML(title,sd,bgsd,W,H);
  dl(html,title.replace(/[^a-z0-9]/gi,'_')+'.html','text/html');
  toast('Exported! Open in browser, press F for fullscreen','ok');
}
function buildExportHTML(title,sd,bgsd,W,H){
  const ANIM_CSS_EXPORT=`@keyframes el-fadein{from{opacity:0}to{opacity:1}}@keyframes el-slideup{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}@keyframes el-slidedown{from{opacity:0;transform:translateY(-40px)}to{opacity:1;transform:translateY(0)}}@keyframes el-slideleft{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}@keyframes el-slideright{from{opacity:0;transform:translateX(-60px)}to{opacity:1;transform:translateX(0)}}@keyframes el-zoomin{from{opacity:0;transform:scale(0.4)}to{opacity:1;transform:scale(1)}}@keyframes el-spin{from{opacity:0;transform:rotate(-90deg) scale(0.6)}to{opacity:1;transform:rotate(0) scale(1)}}@keyframes el-bounce{0%{opacity:0;transform:scale(0.3)}60%{transform:scale(1.1)}80%{transform:scale(0.95)}100%{opacity:1;transform:scale(1)}}@keyframes el-fadeout{from{opacity:1}to{opacity:0}}@keyframes el-slideout{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(40px)}}@keyframes el-zoomout{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(1.5)}}@keyframes el-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes el-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}@keyframes el-flash{0%,50%,100%{opacity:1}25%,75%{opacity:0}}`;
  return `<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><title>${esc(title)}</title>\n<meta name="sf-data" content='${encodeURIComponent(sd)}'>\n<meta name="sf-ar" content="${ar}">\n<meta name="sf-w" content="${W}">\n<meta name="sf-h" content="${H}">\n<meta name="sf-title" content="${esc(title)}">\n<style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:100vw;height:100vh;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;}#stage{position:relative;overflow:hidden;}#sa,#sb{position:absolute;inset:0;overflow:hidden;}.psel{position:absolute;}.psel-txt{width:100%;height:100%;overflow:hidden;word-break:break-word;padding:6px 8px;}#nav{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:6px;align-items:center;z-index:10;opacity:0;transition:opacity .3s;}body:hover #nav{opacity:1;}.nb{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.8);width:38px;height:38px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;backdrop-filter:blur(6px);transition:.15s;}.nb:hover{background:rgba(255,255,255,.25);color:#fff;}.nb:disabled{opacity:.2;}#ctr{color:rgba(255,255,255,.4);font-size:11px;font-family:monospace;background:rgba(0,0,0,.3);padding:3px 10px;border-radius:10px;}.dots{display:flex;gap:4px;background:rgba(0,0,0,.3);padding:4px 8px;border-radius:10px;}.dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.3);cursor:pointer;}.dot.active{background:#fff;}#prog{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#3b82f6,#06b6d4);transition:width .3s;z-index:10;}.aind{position:fixed;top:12px;left:14px;color:#22c55e;font-size:10px;background:rgba(0,0,0,.3);padding:3px 10px;border-radius:10px;display:none;}.aind.on{display:block;}.md-e h1{font-size:2em;font-weight:700;margin:0 0 .4em;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:.2em;}.md-e h2{font-size:1.5em;font-weight:600;margin:0 0 .35em;}.md-e h3{font-size:1.17em;font-weight:600;margin:0 0 .3em;}.md-e p{margin:0 0 .6em;}.md-e code{font-family:monospace;font-size:.85em;background:rgba(255,255,255,.08);padding:2px 5px;border-radius:3px;}.md-e pre{background:rgba(0,0,0,.3);border-radius:5px;padding:10px 12px;margin:0 0 .6em;overflow-x:auto;}.md-e pre code{background:none;padding:0;}.md-e ul,.md-e ol{margin:0 0 .6em;padding-left:1.4em;}.md-e li{margin-bottom:.2em;}.md-e blockquote{border-left:3px solid #6366f1;padding-left:.8em;color:rgba(255,255,255,.55);margin:.4em 0;}.md-e strong{font-weight:700;}.md-e em{font-style:italic;}${ANIM_CSS_EXPORT}</style>\n</head><body>\n<div id="prog"></div><div class="aind" id="aind">▶ Auto</div>\n<div id="stage"><div id="sa"></div><div id="sb"></div></div>\n<div id="nav"><button class="nb" id="bp" onclick="prev()">&#8592;</button><div class="dots" id="dots"></div><span id="ctr"></span><button class="nb" id="bn" onclick="next()">&#8594;</button></div>\n<script>\nconst SL=${sd};const BG=${bgsd};const W=${W},H=${H},GT='${globalTrans}',TD=${transitionDur};\nconst AMAP={fadeIn:'el-fadein',slideUp:'el-slideup',slideDown:'el-slidedown',slideLeft:'el-slideleft',slideRight:'el-slideright',zoomIn:'el-zoomin',spinIn:'el-spin',bounceIn:'el-bounce',fadeOut:'el-fadeout',slideOut:'el-slideout',zoomOut:'el-zoomout',pulse:'el-pulse',shake:'el-shake',flash:'el-flash'};\nconst CODE_THEMES={dark:{bg:'#0d1117',text:'#e6edf3',kw:'#ff7b72',str:'#a5d6ff',cmt:'#6e7781',num:'#79c0ff',fn:'#d2a8ff',ty:'#ffa657'},monokai:{bg:'#272822',text:'#f8f8f2',kw:'#f92672',str:'#e6db74',cmt:'#75715e',num:'#ae81ff',fn:'#a6e22e',ty:'#66d9ef'},dracula:{bg:'#282a36',text:'#f8f8f2',kw:'#ff79c6',str:'#f1fa8c',cmt:'#6272a4',num:'#bd93f9',fn:'#50fa7b',ty:'#8be9fd'},light:{bg:'#f8f9fa',text:'#24292e',kw:'#d73a49',str:'#032f62',cmt:'#6a737d',num:'#005cc5',fn:'#6f42c1',ty:'#e36209'}};\nlet idx=0,busy=false,aT=null,looping=false;\nfunction sc(){return Math.min(window.innerWidth/W,window.innerHeight/H);}\nfunction resize(){const s=sc();const st=document.getElementById('stage');st.style.width=Math.round(W*s)+'px';st.style.height=Math.round(H*s)+'px';[sa(),sb()].forEach(e=>{e.style.width=W+'px';e.style.height=H+'px';e.style.transform='scale('+s+')';e.style.transformOrigin='top left';});}\nwindow.addEventListener('resize',resize);\nfunction sa(){return document.getElementById('sa');}\nfunction sb(){return document.getElementById('sb');}\nfunction hex2rgba(h,op){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return 'rgba('+r+','+g+','+b+','+op+')';}\nfunction buildShapeSVG(d,w,h){const SHAPES=${JSON.stringify(SHAPES)};const sh=SHAPES.find(s=>s.id===d.shape)||SHAPES[0];const op=d.fillOp===undefined?1:+d.fillOp;const fill=d.fill||'#3b82f6';const sw=d.sw===undefined?2:+d.sw;const m=sw>0?sw:0;const ew=Math.max(1,w-m*2);const eh=Math.max(1,h-m*2);let sd2='';let filterDef='';if(d.shadow){const sc2=d.shadowColor||'#000';const sb2=d.shadowBlur||8;filterDef='<defs><filter id="sh_'+d.id+'" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="3" dy="3" stdDeviation="'+sb2+'" flood-color="'+sc2+'" flood-opacity="0.6"/></filter></defs>';}const shadow=d.shadow?'filter="url(#sh_'+d.id+')"':'';const fa='fill="'+fill+'" fill-opacity="'+op+'"';const sa2=sw>0?'stroke="'+(d.stroke||'#1d4ed8')+'" stroke-width="'+sw+'"':'stroke="none"';if(sh.special==='rect')sd2='<rect x="'+m+'" y="'+m+'" width="'+ew+'" height="'+eh+'" rx="'+(d.rx||0)+'" '+fa+' '+sa2+' '+shadow+'/>';else if(sh.special==='rounded')sd2='<rect x="'+m+'" y="'+m+'" width="'+ew+'" height="'+eh+'" rx="'+(d.rx||15)+'" '+fa+' '+sa2+' '+shadow+'/>';else if(sh.special==='ellipse')sd2='<ellipse cx="'+(w/2)+'" cy="'+(h/2)+'" rx="'+(ew/2)+'" ry="'+(eh/2)+'" '+fa+' '+sa2+' '+shadow+'/>';else{const sx=ew/90,sy=eh/90;const sp=sh.path.replace(/(-?\\d+(?:\\.\\d+)?)/g,(mv,v,off,str)=>{const before=str.slice(0,off);const nums=(before.match(/(-?\\d+(?:\\.\\d+)?)/g)||[]).length;return nums%2===0?String(Math.round((+v-5)*sx+m)):String(Math.round((+v-5)*sy+m));});sd2='<path d="'+sp+'" '+fa+' '+sa2+' '+shadow+'/>';}return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+filterDef+sd2+'</svg>';}\nfunction applyHoverFx(el,fx){\n  if(!fx||!fx.enabled)return;\n  const dur=(fx.dur||0.2)+'s';\n  const orig={transform:el.style.transform||'',opacity:el.style.opacity||'1',filter:el.style.filter||'',background:el.style.background||''};\n  el.style.transition='transform '+dur+' ease,opacity '+dur+' ease,filter '+dur+' ease,background '+dur+' ease,box-shadow '+dur+' ease';\n  el.style.cursor='pointer';\n  el.addEventListener('mouseenter',()=>{\n    const sc=fx.scale||1.05;el.style.transform=orig.transform?orig.transform.replace(/scale\\([^)]*\\)/,'scale('+sc+')'):'scale('+sc+')';\n    if(fx.opacity!=null)el.style.opacity=fx.opacity;\n    if(fx.shadow){el.style.boxShadow='0 0 '+fx.shadow+'px '+(fx.shadowColor||'#000');}\n    if(fx.color){el.style.background=fx.color;}\n  });\n  el.addEventListener('mouseleave',()=>{\n    el.style.transform=orig.transform;\n    el.style.opacity=orig.opacity;\n    el.style.boxShadow='';\n    el.style.background=orig.background;\n  });\n}\nfunction build(c,i){const s=SL[i];c.innerHTML='';const bg=document.createElement('div');bg.style.cssText='position:absolute;inset:0;z-index:0;';if(s.bg==='custom')bg.style.background=s.bgc||'#fff';else{const b=BG.find(b=>b.id===s.bg);bg.style.background=b?b.s:'#ddd';}c.appendChild(bg);const ca=[];s.els.forEach(d=>{const el=document.createElement('div');el.className='psel';const rot=d.rot||0;\n  let rxStr='';\n  if(d.rx_tl!=null||d.rx_tr!=null||d.rx_bl!=null||d.rx_br!=null){const u=d.rxUnit||'px';rxStr='border-radius:'+(d.rx_tl||0)+u+' '+(d.rx_tr||0)+u+' '+(d.rx_br||0)+u+' '+(d.rx_bl||0)+u+';overflow:hidden;';}\n  el.style.cssText='position:absolute;left:'+d.x+'px;top:'+d.y+'px;width:'+d.w+'px;height:'+d.h+'px;z-index:2;transform:rotate('+rot+'deg);'+rxStr+(d.elOpacity!=null&&+d.elOpacity!==1?'opacity:'+d.elOpacity+';':'');\n  if(d.type==='text'){\n    const jc=d.valign==='middle'?'center':d.valign==='bottom'?'flex-end':'flex-start';\n    const v=document.createElement('div');v.className='psel-txt';\n    v.style.cssText=(d.cs||'')+'display:flex;flex-direction:column;justify-content:'+jc+';width:100%;height:100%;overflow:hidden;word-break:break-word;';\n    if(d.textBg){const op2=d.textBgOp!=null?d.textBgOp:1;v.style.background=hex2rgba(d.textBg,op2);}\n    v.innerHTML=d.html||'';el.appendChild(v);\n  }else if(d.type==='image'){const img=document.createElement('img');img.src=d.src;const fit=d.imgFit||'contain';img.style.cssText='width:100%;height:100%;object-fit:'+fit+';display:block;object-position:'+(d.imgPosX||'center')+' '+(d.imgPosY||'center')+';opacity:'+(d.imgOpacity!=null?d.imgOpacity:1)+';';el.style.borderRadius=(d.imgRx||0)+'px';el.style.overflow='hidden';if(d.imgBw&&+d.imgBw>0){el.style.border=d.imgBw+'px solid '+(d.imgBc||'#fff');el.style.boxSizing='border-box';}el.appendChild(img);}else if(d.type==='shape'){el.style.overflow='visible';el.innerHTML=buildShapeSVG(d,d.w,d.h);if(d.shapeHtml){const txt=document.createElement('div');txt.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px;word-break:break-word;text-align:center;'+(d.shapeTextCss||'font-size:24px;font-weight:700;color:#fff;');txt.innerHTML=d.shapeHtml;el.appendChild(txt);}}else if(d.type==='svg'){el.style.overflow='visible';el.innerHTML=d.svgContent||'';const sve=el.querySelector('svg');if(sve){sve.style.width='100%';sve.style.height='100%';}}else if(d.type==='applet'){el.style.overflow='hidden';const fr=document.createElement('iframe');fr.srcdoc=d.appletHtml||'';fr.style.cssText='width:100%;height:100%;border:none;';fr.sandbox='allow-scripts allow-same-origin';el.appendChild(fr);}else if(d.type==='code'){const T=CODE_THEMES[d.codeTheme||'dark']||CODE_THEMES.dark;const cv=document.createElement('div');cv.style.cssText='width:100%;height:100%;overflow:auto;border-radius:6px;font-family:monospace;font-size:'+(d.codeFs||13)+'px;line-height:1.6;padding:14px 16px;box-sizing:border-box;background:'+T.bg+';color:'+T.text+';border:1px solid rgba(128,128,128,.15);';cv.innerHTML='<div style="font-size:9px;color:'+T.cmt+';margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px">'+(d.codeLang||'')+'</div><pre style="margin:0;white-space:pre;overflow:visible">'+(d.codeHtml||'')+'</pre>';el.appendChild(cv);}else if(d.type==='markdown'){const mv=document.createElement('div');mv.className='md-e';mv.style.cssText='width:100%;height:100%;overflow:auto;padding:14px 16px;box-sizing:border-box;line-height:1.65;font-size:'+(d.mdFs||16)+'px;color:#fff;';mv.innerHTML=d.mdHtml||'';el.appendChild(mv);}if(d.link){el.style.cursor='pointer';(function(lk,lt){el.addEventListener('click',()=>{if(lk.startsWith('#slide-')){const si=parseInt(lk.replace('#slide-',''))-1;if(si>=0&&si<SL.length)goto(si,si>idx?'next':'prev');}else window.open(lk,lt||'_blank');});})(d.link,d.linkt);}if(d.hoverFx)applyHoverFx(el,d.hoverFx);const anims=(d.anims||[]).filter(a=>a.category!=='exit'&&!a.onClick);const ea=(d.anims||[]).filter(a=>a.category==='exit');const cla=(d.anims||[]).filter(a=>a.onClick);anims.forEach(a=>{el.style.animation='';requestAnimationFrame(()=>{const nm=AMAP[a.name]||'el-fadein';el.style.animation=nm+' '+(a.dur||0.5)+'s ease-out '+(a.delay||0)+'s both';});});ea.forEach(a=>{setTimeout(()=>{const nm=AMAP[a.name]||'el-fadeout';el.style.animation=nm+' '+(a.dur||0.5)+'s ease-out both';},(a.delay||0)*1000);});if(cla.length)ca.push({el,anims:cla});c.appendChild(el);});let ci=0;c.addEventListener('click',()=>{if(ci<ca.length){ca[ci].anims.forEach(a=>{const nm=AMAP[a.name]||'el-fadein';ca[ci].el.style.animation='';requestAnimationFrame(()=>{ca[ci].el.style.animation=nm+' '+(a.dur||0.5)+'s ease-out '+(a.delay||0)+'s both';});});ci++;}});}\nfunction next(){if(busy)return;cla();if(idx>=SL.length-1){if(looping)goto(0,'next');}else goto(idx+1,'next');}\nfunction prev(){if(busy||idx<=0)return;cla();goto(idx-1,'prev');}\nfunction goto(to,dir){const trans=(SL[to]&&SL[to].trans)||GT||'none';if(trans==='none'||TD===0){build(sa(),to);idx=to;ui();sched();return;}busy=true;build(sb(),to);anim(sa(),sb(),trans,dir==='next',TD,()=>{build(sa(),to);const s=sc();sb().style.cssText='position:absolute;inset:0;opacity:0;pointer-events:none;width:'+W+'px;height:'+H+'px;transform:scale('+s+');transform-origin:top left;';sa().style.cssText='position:absolute;inset:0;width:'+W+'px;height:'+H+'px;transform:scale('+s+');transform-origin:top left;';idx=to;ui();busy=false;sched();});}\nfunction anim(a,b,trans,fwd,dur,cb){const d=dur+'ms',s=sc();a.style.transition='none';b.style.transition='none';requestAnimationFrame(()=>requestAnimationFrame(()=>{if(trans==='fade'){b.style.opacity='0';b.style.pointerEvents='auto';a.style.transition='opacity '+d+' ease';b.style.transition='opacity '+d+' ease';a.style.opacity='0';b.style.opacity='1';setTimeout(cb,dur+60);}else if(trans==='slide'){const dr=fwd?1:-1;b.style.transform='scale('+s+') translateX('+(dr*100)+'%)';b.style.opacity='1';b.style.pointerEvents='auto';a.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';b.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';a.style.transform='scale('+s+') translateX('+(-dr*100)+'%)';b.style.transform='scale('+s+') translateX(0)';setTimeout(cb,dur+60);}else if(trans==='zoom'){b.style.opacity='0';b.style.transform='scale('+(s*.8)+')';b.style.pointerEvents='auto';a.style.transition='opacity '+d+' ease,transform '+d+' ease';b.style.transition='opacity '+d+' ease,transform '+d+' ease';a.style.opacity='0';a.style.transform='scale('+(s*1.1)+')';b.style.opacity='1';b.style.transform='scale('+s+')';setTimeout(cb,dur+60);}else if(trans==='morph'){const bEls=b.querySelectorAll('.psel');bEls.forEach((bel,ii)=>{bel.style.transition='none';bel.style.opacity='0';bel.style.transform='scale(0.8) translateY(20px)';requestAnimationFrame(()=>requestAnimationFrame(()=>{bel.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1),opacity '+(dur*.5)+'ms ease '+((ii*0.06)*1000)+'ms';bel.style.opacity='1';bel.style.transform='scale(1) translateY(0)';}));});a.style.transition='opacity '+(dur*.6)+'ms ease';a.style.opacity='0';setTimeout(cb,dur+80);}else{b.style.opacity='1';cb();}}));}\nfunction sched(){cla2();const s=SL[idx];const delay=(s&&s.auto>0)?s.auto*1000:0;const isLast=idx>=SL.length-1;if(delay>0&&(!isLast||looping)){aT=setTimeout(()=>{if(isLast&&looping)goto(0,'next');else goto(idx+1,'next');},delay);document.getElementById('aind').classList.add('on');}else document.getElementById('aind').classList.remove('on');}\nfunction cla(){clearTimeout(aT);aT=null;}\nfunction cla2(){clearTimeout(aT);aT=null;}\nfunction ui(){document.getElementById('ctr').textContent=(idx+1)+' / '+SL.length;document.getElementById('prog').style.width=((idx+1)/SL.length*100)+'%';document.getElementById('bp').disabled=idx===0;document.getElementById('bn').disabled=idx===SL.length-1&&!looping;const dn=document.getElementById('dots');dn.innerHTML='';const max=Math.min(SL.length,25);for(let i=0;i<max;i++){const dd=document.createElement('div');dd.className='dot'+(i===idx?' active':'');(function(j){dd.onclick=()=>{cla();if(!busy)goto(j,j>idx?'next':'prev');};})(i);dn.appendChild(dd);}}\ndocument.addEventListener('keydown',e=>{if(['ArrowRight','ArrowDown',' '].includes(e.key)){e.preventDefault();next();}if(['ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();prev();}if(e.key==='l'||e.key==='L'){looping=!looping;document.getElementById('aind').textContent=looping?'↺ Loop':'▶ Auto';}if(e.key==='f'||e.key==='F')document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();if(e.key==='Escape'&&document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen();});\nresize();build(sa(),0);ui();sched();\ndocument.addEventListener('DOMContentLoaded',()=>{document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{});});\n<\/script>\n</body></html>`;
}

// ══════════════ IMPORT ══════════════
function handleFileImport(e){
  const f=e.target.files[0];if(!f)return;
  const ext=f.name.split('.').pop().toLowerCase();
  if(ext==='html')importHTMLFile(f);
  else if(['pptx','ppt','odp'].includes(ext))importPPTX(f);
  else toast('Unsupported: .'+ext);
  e.target.value='';
}
function importHTMLFile(f){
  const r=new FileReader();r.onload=ev=>{
    try{
      const html=ev.target.result;
      const m=html.match(/name="sf-data" content='([^']+)'/);
      if(!m)return toast('Not a SlideForge file');
      slides=JSON.parse(decodeURIComponent(m[1]));cur=0;
      const mar=html.match(/name="sf-ar" content="([^"]+)"/);
      const mw=html.match(/name="sf-w" content="(\d+)"/);const mh=html.match(/name="sf-h" content="(\d+)"/);
      const mt=html.match(/name="sf-title" content="([^"]+)"/);
      if(mar)ar=mar[1];if(mw)canvasW=+mw[1];if(mh)canvasH=+mh[1];
      document.getElementById('canvas').style.width=canvasW+'px';document.getElementById('canvas').style.height=canvasH+'px';
      document.querySelectorAll('.ar-btn').forEach(b=>b.classList.toggle('active',b.textContent===ar));
      if(mt)document.getElementById('pres-title').value=mt[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
      renderAll();saveState();toast('Imported '+slides.length+' slides','ok');
    }catch(err){toast('Import error: '+err.message);}
  };r.readAsText(f);
}
function importPPTX(file){
  showLoading('Loading '+file.name+'…',10);
  const reader=new FileReader();
  reader.onload=ev=>{
    if(!window.JSZip){
      showLoading('Loading JSZip…',30);
      const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload=()=>doParsePPTX(ev.target.result,file.name);
      s.onerror=()=>{hideLoading();toast('Cannot load JSZip - need internet');};document.head.appendChild(s);
    }else doParsePPTX(ev.target.result,file.name);
  };reader.readAsArrayBuffer(file);
}
async function doParsePPTX(buf,filename){
  try{
    showLoading('Parsing…',50);
    const zip=await JSZip.loadAsync(buf);
    const parser=new DOMParser();
    const nsA='http://schemas.openxmlformats.org/drawingml/2006/main';
    const nsP='http://schemas.openxmlformats.org/presentationml/2006/main';
    const nsR='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    let W=1200,H=675,arOut='16:9',sW=9144000,sH=6858000;
    try{
      const pxml=await zip.file('ppt/presentation.xml')?.async('text');
      if(pxml){const pd=parser.parseFromString(pxml,'text/xml');const sz=pd.getElementsByTagNameNS(nsP,'sldSz')[0];if(sz){sW=+sz.getAttribute('cx')||sW;sH=+sz.getAttribute('cy')||sH;}const ratio=sW/sH;arOut=Math.abs(ratio-16/9)<0.1?'16:9':'4:3';H=arOut==='4:3'?900:675;}
    }catch(e){}
    const scX=W/sW,scY=H/sH;
    const slideFiles=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a,b)=>+a.match(/\d+/)[0]-+b.match(/\d+/)[0]);
    const total=slideFiles.length;
    const slides_out=[];
    // Helper: get image as base64 data URI
    async function getImgSrc(zip,relsTarget){
      let p=relsTarget;
      if(p.startsWith('../'))p='ppt/'+p.slice(3);
      else if(!p.startsWith('ppt/'))p='ppt/slides/'+p;
      p=p.replace(/\/\.\//g,'/');
      const variants=[p,p.replace('ppt/slides/','ppt/'),p.replace('ppt/',''),'ppt/media/'+p.split('/').pop()];
      for(const v of variants){const f=zip.file(v);if(f){
        const ab=await f.async('arraybuffer');
        const ext=v.split('.').pop().toLowerCase();
        const mime=ext==='png'?'image/png':ext==='gif'?'image/gif':ext==='webp'?'image/webp':ext==='svg'?'image/svg+xml':'image/jpeg';
        const bytes=new Uint8Array(ab);let b64='';for(let i=0;i<bytes.length;i+=8192)b64+=String.fromCharCode(...bytes.subarray(i,i+8192));
        return 'data:'+mime+';base64,'+btoa(b64);
      }}return null;
    }
    // Helper: find xfrm by walking up DOM from any node
    function getXfrmFromEl(el){
      let node=el;
      for(let depth=0;depth<10;depth++){
        if(!node||!node.getElementsByTagNameNS)break;
        const xfrms=node.getElementsByTagNameNS(nsA,'xfrm');
        if(xfrms.length)return xfrms[0];
        node=node.parentNode;
      }
      return null;
    }
    for(let si=0;si<total;si++){
      const sf=slideFiles[si];showLoading('Slide '+(si+1)+'/'+total,50+Math.round(si/total*40));
      const xml=await zip.file(sf)?.async('text');if(!xml)continue;
      const doc=parser.parseFromString(xml,'text/xml');
      const els=[];let bgColor='#1a1a2e';let ec2=0;
      // BG
      try{const nodes=doc.getElementsByTagNameNS(nsA,'srgbClr');if(nodes.length){const v=nodes[0].getAttribute('val');if(v&&v.length===6)bgColor='#'+v.toLowerCase();}}catch(e){}
      // Relationships
      const relsPath='ppt/slides/_rels/'+sf.split('/').pop()+'.rels';
      const imgMap={};
      try{const rxml=await zip.file(relsPath)?.async('text');if(rxml){const rd=parser.parseFromString(rxml,'text/xml');Array.from(rd.getElementsByTagName('Relationship')).forEach(r=>{imgMap[r.getAttribute('Id')]=r.getAttribute('Target');});}}catch(e){}
      // TEXT SHAPES
      for(const sp of doc.getElementsByTagNameNS(nsP,'sp')){
        try{
          const xfrm=sp.getElementsByTagNameNS(nsA,'xfrm')[0];if(!xfrm)continue;
          const off=xfrm.getElementsByTagNameNS(nsA,'off')[0];const ext=xfrm.getElementsByTagNameNS(nsA,'ext')[0];if(!off||!ext)continue;
          const x=Math.max(0,Math.round(+off.getAttribute('x')*scX));const y=Math.max(0,Math.round(+off.getAttribute('y')*scY));
          const w=Math.max(40,Math.round(+ext.getAttribute('cx')*scX));const h=Math.max(20,Math.round(+ext.getAttribute('cy')*scY));
          const txBody=sp.getElementsByTagNameNS(nsP,'txBody')[0]||sp.getElementsByTagNameNS(nsA,'txBody')[0];if(!txBody)continue;
          const paras=txBody.getElementsByTagNameNS(nsA,'p');if(!paras.length)continue;
          let html='',domFS=36,domColor='#ffffff',domW='700',domAlign='left';
          for(const para of paras){
            const pPr=para.getElementsByTagNameNS(nsA,'pPr')[0];
            if(pPr){const a2=pPr.getAttribute('algn');if(a2==='ctr')domAlign='center';else if(a2==='r')domAlign='right';}
            const runs=para.getElementsByTagNameNS(nsA,'r');let ph='';
            for(const run of runs){
              const rPr=run.getElementsByTagNameNS(nsA,'rPr')[0];const t=run.getElementsByTagNameNS(nsA,'t')[0];if(!t)continue;
              const txt=t.textContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');if(!txt.trim())continue;
              let st='';
              if(rPr){
                const sz=+rPr.getAttribute('sz');if(sz){domFS=Math.round(sz/100*96/72);st+='font-size:'+domFS+'px;';}
                if(rPr.getAttribute('b')==='1')st+='font-weight:700;';if(rPr.getAttribute('i')==='1')st+='font-style:italic;';
                if(rPr.getAttribute('u')&&rPr.getAttribute('u')!=='none')st+='text-decoration:underline;';
                const sf2=rPr.getElementsByTagNameNS(nsA,'solidFill')[0];
                if(sf2){const sc2=sf2.getElementsByTagNameNS(nsA,'srgbClr')[0];if(sc2){domColor='#'+sc2.getAttribute('val').toLowerCase();st+='color:'+domColor+';';}}
              }
              ph+=st?'<span style="'+st+'">'+txt+'</span>':txt;
            }
            if(ph)html+='<div>'+ph+'</div>';
          }
          if(html)els.push({id:'e'+ec2++,type:'text',x,y,w,h,html,
            cs:'font-size:'+domFS+'px;font-weight:400;color:'+domColor+';text-align:'+domAlign+';line-height:1.25;',
            rot:0,anims:[],textRole:'body'});
        }catch(e2){}
      }
      // IMAGES — universal scan: find ALL a:blip elements in the slide
      const seenRids=new Set();
      // Scan all blip elements in the entire document
      const allBlips=doc.getElementsByTagNameNS(nsA,'blip');
      for(const blip of allBlips){
        try{
          const rId=blip.getAttributeNS(nsR,'embed');
          if(!rId||!imgMap[rId]||seenRids.has(rId))continue;
          seenRids.add(rId);
          const src=await getImgSrc(zip,imgMap[rId]);if(!src)continue;
          const xfrm=getXfrmFromEl(blip);if(!xfrm)continue;
          const off=xfrm.getElementsByTagNameNS(nsA,'off')[0];
          const extEl=xfrm.getElementsByTagNameNS(nsA,'ext')[0];if(!off||!extEl)continue;
          const x=Math.max(0,Math.round(+off.getAttribute('x')*scX));
          const y=Math.max(0,Math.round(+off.getAttribute('y')*scY));
          const w=Math.max(40,Math.round(+extEl.getAttribute('cx')*scX));
          const h=Math.max(40,Math.round(+extEl.getAttribute('cy')*scY));
          els.push({id:'e'+ec2++,type:'image',x,y,w,h,src,rot:0,anims:[]});
        }catch(e3){console.warn('img err',e3);}
      }
      // Slide title
      let title='Slide '+(slides_out.length+1);
      try{const ts=Array.from(doc.getElementsByTagNameNS(nsP,'sp')).find(sp=>{const ph=sp.getElementsByTagNameNS(nsP,'ph')[0];return ph&&(ph.getAttribute('type')==='title'||ph.getAttribute('type')==='ctrTitle');});if(ts){const tx=Array.from(ts.getElementsByTagNameNS(nsA,'t')).map(t=>t.textContent).join('').trim();if(tx)title=tx.slice(0,60);}}catch(e){}
      slides_out.push({title,bg:'custom',bgc:bgColor,ar:arOut,trans:'',auto:0,els});
    }
    slides=slides_out;cur=0;ar=arOut;canvasW=W;canvasH=H;
    document.getElementById('canvas').style.width=W+'px';document.getElementById('canvas').style.height=H+'px';
    document.querySelectorAll('.ar-btn').forEach(b=>b.classList.toggle('active',b.textContent===arOut));
    clampEls(W,H);
    showLoading('Finalizing…',95);renderAll();saveState();
    hideLoading();
    const imgCnt=slides_out.reduce((n,s)=>n+s.els.filter(e=>e.type==='image').length,0);
    toast('Imported '+slides.length+' slides, '+imgCnt+' images from '+filename,'ok');
  }catch(err){hideLoading();toast('Parse error: '+err.message);}
}

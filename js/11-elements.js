// ══════════════ ELEMENTS ══════════════
function addText(){
  pushUndo();
  const d={id:'e'+(++ec),type:'text',x:snapV(80),y:snapV(100),w:snapV(500),h:snapV(120),
    html:'Double-click to edit',cs:'font-size:36px;font-weight:400;color:#ffffff;text-align:left;line-height:1.2;',rot:0,anims:[],textRole:'body'};
  slides[cur].els.push(d);mkEl(d);save();drawThumbs();saveState();
}
function handleImg(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=ev=>{
    pushUndo();
    const d={id:'e'+(++ec),type:'image',x:snapV(100),y:snapV(100),w:snapV(400),h:snapV(300),src:ev.target.result,rot:0,anims:[],imgFit:'contain',imgRx:0,imgBw:0,imgBc:'#ffffff',imgShadow:false,imgShadowBlur:15,imgShadowColor:'#000000',imgOpacity:1};
    slides[cur].els.push(d);mkEl(d);save();drawThumbs();saveState();
  };
  r.readAsDataURL(f);e.target.value='';
}

// ══════════════ CODE BLOCK ══════════════
let _codeEditId=null;
const CODE_THEMES={
  dark:{bg:'#0d1117',text:'#e6edf3',kw:'#ff7b72',str:'#a5d6ff',cmt:'#6e7781',num:'#79c0ff',fn:'#d2a8ff',ty:'#ffa657'},
  monokai:{bg:'#272822',text:'#f8f8f2',kw:'#f92672',str:'#e6db74',cmt:'#75715e',num:'#ae81ff',fn:'#a6e22e',ty:'#66d9ef'},
  dracula:{bg:'#282a36',text:'#f8f8f2',kw:'#ff79c6',str:'#f1fa8c',cmt:'#6272a4',num:'#bd93f9',fn:'#50fa7b',ty:'#8be9fd'},
  light:{bg:'#f8f9fa',text:'#24292e',kw:'#d73a49',str:'#032f62',cmt:'#6a737d',num:'#005cc5',fn:'#6f42c1',ty:'#e36209'},
};

function syntaxHighlight(code,lang,theme='dark'){
  const T=CODE_THEMES[theme]||CODE_THEMES.dark;
  let h=code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if(lang==='plain')return `<span style="color:${T.text}">${h}</span>`;
  // Comments
  if(['js','ts','java','cpp','cs','rust','go'].includes(lang)){
    h=h.replace(/(\/\/[^\n]*)/g,`<span style="color:${T.cmt};font-style:italic">$1</span>`);
    h=h.replace(/(\/\*[\s\S]*?\*\/)/g,`<span style="color:${T.cmt};font-style:italic">$1</span>`);
  } else if(lang==='py'){
    h=h.replace(/(#[^\n]*)/g,`<span style="color:${T.cmt};font-style:italic">$1</span>`);
  } else if(['html','css'].includes(lang)){
    h=h.replace(/(&lt;!--[\s\S]*?--&gt;)/g,`<span style="color:${T.cmt};font-style:italic">$1</span>`);
  } else if(['sql','bash'].includes(lang)){
    h=h.replace(/(--[^\n]*|#[^\n]*)/g,`<span style="color:${T.cmt};font-style:italic">$1</span>`);
  }
  // Strings
  h=h.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,`<span style="color:${T.str}">$1</span>`);
  // Numbers
  h=h.replace(/\b(\d+\.?\d*)\b/g,`<span style="color:${T.num}">$1</span>`);
  // Keywords per language
  const kwMap={
    js:['const','let','var','function','return','if','else','for','while','class','new','this','typeof','instanceof','import','export','default','from','async','await','try','catch','throw','switch','case','break','continue','null','undefined','true','false','of','in'],
    ts:['const','let','var','function','return','if','else','for','while','class','new','this','typeof','instanceof','import','export','default','from','async','await','try','catch','throw','switch','case','break','continue','null','undefined','true','false','type','interface','extends','implements','enum','namespace','declare','abstract','readonly','private','public','protected','static'],
    py:['def','class','return','if','elif','else','for','while','import','from','as','with','try','except','finally','raise','pass','break','continue','None','True','False','and','or','not','in','is','lambda','yield','async','await','del','global','nonlocal','print'],
    rust:['fn','let','mut','const','struct','enum','impl','trait','use','mod','pub','return','if','else','for','while','loop','match','break','continue','true','false','self','Self','where','type','unsafe','async','await','dyn','Box','Vec','Option','Result','Some','None','Ok','Err'],
    go:['func','var','const','type','struct','interface','return','if','else','for','range','switch','case','break','continue','true','false','nil','package','import','map','chan','go','defer','select','make','new','len','cap','append'],
    java:['class','public','private','protected','static','void','return','if','else','for','while','new','this','super','import','package','interface','extends','implements','try','catch','throw','throws','finally','true','false','null','int','long','double','float','boolean','char','byte','short','String'],
    cpp:['auto','const','int','long','double','float','char','bool','void','return','if','else','for','while','class','struct','enum','namespace','using','template','typename','public','private','protected','virtual','override','new','delete','true','false','nullptr','include','define'],
    cs:['class','public','private','protected','static','void','return','if','else','for','while','foreach','new','this','base','using','namespace','interface','abstract','override','virtual','try','catch','throw','true','false','null','var','int','string','bool','double','float'],
    html:['html','head','body','div','span','p','h1','h2','h3','h4','a','img','input','button','form','table','tr','td','th','ul','ol','li','nav','section','article','header','footer','main','style','script','link','meta','title'],
    css:['color','background','margin','padding','width','height','display','position','flex','grid','font','border','top','left','right','bottom','overflow','transform','transition','animation','opacity','z-index','content','important'],
    sql:['SELECT','FROM','WHERE','JOIN','ON','GROUP','BY','ORDER','HAVING','INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','DROP','ALTER','INDEX','DISTINCT','AS','AND','OR','NOT','IN','IS','NULL','LIKE','BETWEEN','LIMIT','OFFSET','INNER','LEFT','RIGHT','OUTER','CROSS','UNION','ALL','COUNT','SUM','AVG','MAX','MIN'],
    bash:['if','then','else','elif','fi','for','while','do','done','case','in','esac','function','return','exit','echo','cd','ls','mkdir','rm','cp','mv','cat','grep','sed','awk','export','source','alias','unset','local','readonly'],
    json:[],yaml:[],plain:[],
  };
  const kws=(kwMap[lang]||[]);
  if(kws.length){
    const kwRe=new RegExp('\\b('+kws.join('|')+')\\b','g');
    h=h.replace(kwRe,`<span style="color:${T.kw}">$1</span>`);
  }
  // Function calls (word followed by open paren)
  h=h.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*&lt;\/span&gt;\s*\(|\s*\()/g,(m,fn)=>{
    if(kws.includes(fn))return m;
    return `<span style="color:${T.fn}">${fn}</span>`;
  });
  return h;
}

function addCodeBlock(){
  _codeEditId=null;
  document.getElementById('cm-lang').value='js';
  document.getElementById('cm-code').value='// Your code here\nconsole.log("Hello, World!");';
  const th=getCodeThemeForPresTheme();
  const thNames={dark:'GitHub Dark',monokai:'Monokai',dracula:'Dracula',light:'Light'};
  const lbl=document.getElementById('cm-theme-label');
  if(lbl)lbl.textContent='Theme: '+(thNames[th]||th);
  document.getElementById('code-modal').classList.add('open');
}

function openCodeEditor(){
  if(!sel||sel.dataset.type!=='code')return;
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  _codeEditId=d.id;
  document.getElementById('cm-lang').value=d.codeLang||'js';
  document.getElementById('cm-code').value=d.codeRaw||'';
  const th=getCodeThemeForPresTheme();
  const thNames={dark:'GitHub Dark',monokai:'Monokai',dracula:'Dracula',light:'Light'};
  const lbl=document.getElementById('cm-theme-label');
  if(lbl)lbl.textContent='Theme: '+(thNames[th]||th);
  document.getElementById('code-modal').classList.add('open');
}

function insertCodeBlock(){
  const lang=document.getElementById('cm-lang').value;
  const theme=getCodeThemeForPresTheme();
  const raw=document.getElementById('cm-code').value;
  document.getElementById('code-modal').classList.remove('open');
  pushUndo();
  if(_codeEditId){
    const d=slides[cur].els.find(e=>e.id===_codeEditId);
    if(d){d.codeLang=lang;d.codeTheme=theme;d.codeRaw=raw;d.codeHtml=syntaxHighlight(raw,lang,theme);
      const domEl=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
      if(domEl)renderCodeEl(domEl,d);}
  } else {
    const T=CODE_THEMES[theme]||CODE_THEMES.dark;
    const d={id:'e'+(++ec),type:'code',x:snapV(60),y:snapV(60),w:snapV(680),h:snapV(400),
      codeLang:lang,codeTheme:theme,codeRaw:raw,codeHtml:syntaxHighlight(raw,lang,theme),
      codeBg:T.bg,codeFs:13,rot:0,anims:[]};
    slides[cur].els.push(d);mkEl(d);
  }
  save();drawThumbs();saveState();
}

function renderCodeEl(el,d){
  const theme=d.codeTheme||getCodeThemeForPresTheme();
  const T=CODE_THEMES[theme]||CODE_THEMES.dark;
  const c=el.querySelector('.ec');if(!c)return;
  c.style.cssText=`width:100%;height:100%;overflow:auto;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:${d.codeFs||13}px;line-height:1.6;padding:14px 16px;box-sizing:border-box;background:${T.bg};color:${T.text};border:1px solid rgba(128,128,128,.15);`;
  c.innerHTML=`<div style="font-size:9px;color:${T.cmt};margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px">${d.codeLang||''}</div><pre style="margin:0;white-space:pre;overflow:visible">${d.codeHtml||''}</pre>`;
}

function updateCodeLang(v){if(!sel||sel.dataset.type!=='code')return;const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;d.codeLang=v;d.codeHtml=syntaxHighlight(d.codeRaw||'',v,getCodeThemeForPresTheme());renderCodeEl(sel,d);save();drawThumbs();}
function updateCodeFontSize(v){if(!sel||sel.dataset.type!=='code')return;const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;d.codeFs=+v;renderCodeEl(sel,d);save();}

// ══════════════ ELEMENTS ══════════════
function addText(){
  pushUndo();
  // col=7 is always #000000. Tint rows give: 0=#000,1=#383838,2=#707070,3=#a8a8a8,4=#e0e0e0
  // dark bg → light text: row 4 (#e0e0e0)
  // light bg → dark text: row 1 (#383838)
  const _ti = typeof appliedThemeIdx!=='undefined' ? appliedThemeIdx : -1;
  const _theme = _ti>=0 ? THEMES[_ti] : null;
  const _isDark = _theme ? _theme.dark : true;
  const _defScheme = {col:7, row:0}; // row 0: dark=white, light=black
  let _defColor = _isDark ? '#ffffff' : '#000000';
  if(typeof _resolveSchemeColor==='function'&&_theme){
    _defColor = _resolveSchemeColor(_defScheme, _theme) || _defColor;
  }
  // Build html as char-objects with _schemeRef so applyTheme can remap color correctly
  const _defText = (typeof getLang==='function'&&getLang()==='ru') ? '\u0414\u0432\u0430\u0436\u0434\u044b \u043a\u043b\u0438\u043a\u043d\u0438\u0442\u0435 \u0434\u043b\u044f \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f' : 'Double-click to edit';
  const _defHtml = typeof _charObjsToHtml==='function'
    ? _charObjsToHtml([..._defText].map(ch=>({ch, style:{color:_defColor, _schemeRef:_defScheme}})))
    : _defText;
  const d={id:'e'+(++ec),type:'text',x:snapV(80),y:snapV(100),w:snapV(500),h:snapV(120),
    html:_defHtml,
    cs:'font-size:36px;font-weight:400;color:'+_defColor+';text-align:left;line-height:1.2;',
    rot:0,anims:[],textRole:'body',
    textColorScheme: _defScheme};
  if(typeof _insertGeom==='function'){
    const g=_insertGeom(d.w,d.h);
    d.x=g.x; d.y=g.y; d.w=g.w; d.h=g.h;
    const fs=Math.max(10, Math.round(36*(g.scale||1)));
    d.cs='font-size:'+fs+'px;font-weight:400;color:'+_defColor+';text-align:left;line-height:1.2;';
  }
  slides[cur].els.push(d);mkEl(d);save();drawThumbs();saveState();
}
function handleImg(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=ev=>{
    pushUndo();
    const src=ev.target.result;
    const tmp=new Image();
    tmp.onload=()=>{
      const maxW=canvasW*0.6,maxH=canvasH*0.6;
      let w=tmp.naturalWidth||400,h=tmp.naturalHeight||300;
      const scale=Math.min(maxW/w,maxH/h,1);
      w=Math.round(w*scale);h=Math.round(h*scale);
      const g=typeof _insertGeom==='function'?_insertGeom(w,h):{x:Math.round((canvasW-w)/2),y:Math.round((canvasH-h)/2),w,h};
      const d={id:'e'+(++ec),type:'image',x:g.x,y:g.y,w:g.w,h:g.h,src,imgName:f.name,rot:0,anims:[],imgFit:'fill',imgRx:0,imgBw:0,imgBc:'#ffffff',imgShadow:false,imgShadowBlur:15,imgShadowColor:'#000000',imgOpacity:1};
      slides[cur].els.push(d);mkEl(d);
      const el=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
      if(el)pick(el);
      save();drawThumbs();saveState();
    };
    tmp.src=src;
  };
  r.readAsDataURL(f);e.target.value='';
}

// ══════════════ CODE BLOCK ══════════════
let _codeEditId=null;
var CODE_THEMES=window.CODE_THEMES||{
  dark:{bg:'#0d1117',text:'#e6edf3',kw:'#ff7b72',str:'#a5d6ff',cmt:'#6e7781',num:'#79c0ff',fn:'#d2a8ff',ty:'#ffa657'},
  monokai:{bg:'#272822',text:'#f8f8f2',kw:'#f92672',str:'#e6db74',cmt:'#75715e',num:'#ae81ff',fn:'#a6e22e',ty:'#66d9ef'},
  dracula:{bg:'#282a36',text:'#f8f8f2',kw:'#ff79c6',str:'#f1fa8c',cmt:'#6272a4',num:'#bd93f9',fn:'#50fa7b',ty:'#8be9fd'},
  light:{bg:'#f8f9fa',text:'#24292e',kw:'#d73a49',str:'#032f62',cmt:'#6a737d',num:'#005cc5',fn:'#6f42c1',ty:'#e36209'},
};

function syntaxHighlight(code,lang,theme='dark'){
  const T=CODE_THEMES[theme]||CODE_THEMES.dark;
  // HTML gets its own tag-aware highlighter to avoid corrupting attribute values
  if(lang==='html'){
    let h=code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    // Comments
    h=h.replace(/(&lt;!--[\s\S]*?--&gt;)/g,`<span style="color:${T.cmt};font-style:italic">$1</span>`);
    // Tags: color tag name + attributes differently
    h=h.replace(/(&lt;\/?)([\w-]+)((?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?)*\s*\/?)(&gt;)/g,(m,open,tag,attrs,close)=>{
      const attrHl=attrs.replace(/([\w:-]+)(\s*=\s*)("([^"]*)"|'([^']*)')/g,
        `<span style="color:${T.fn}">$1</span>$2<span style="color:${T.str}">$3</span>`);
      return `<span style="color:${T.kw}">${open}${tag}</span>${attrHl}<span style="color:${T.kw}">${close}</span>`;
    });
    return h;
  }
  let h=code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if(lang==='plain')return `<span style="color:${T.text}">${h}</span>`;
  // Extract comments into placeholders BEFORE other passes mangle their content
  const _cmts=[];
  const _saveCmt=m=>{_cmts.push(m);return `\x00CMT${_cmts.length-1}\x00`;};
  if(['js','ts','java','cpp','cs','rust','go'].includes(lang)){
    h=h.replace(/\/\/[^\n]*/g,_saveCmt);
    h=h.replace(/\/\*[\s\S]*?\*\//g,_saveCmt);
  } else if(lang==='py'){
    h=h.replace(/#[^\n]*/g,_saveCmt);
  } else if(['html','css'].includes(lang)){
    h=h.replace(/&lt;!--[\s\S]*?--&gt;/g,_saveCmt);
  } else if(['sql','bash'].includes(lang)){
    h=h.replace(/--[^\n]*|#[^\n]*/g,_saveCmt);
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
  // Restore comments last — wrap in span without any inner highlighting
  h=h.replace(/ CMT(\d+) /g,(_,i)=>`<span style="color:${T.cmt};font-style:italic">${_cmts[+i]}</span>`);
  return h;
}

function getCodeBlockTheme(d){
  if(d && d.codeTheme) return d.codeTheme;
  return getCodeThemeForPresTheme();
}

function codeBlockSurfaceCss(d, T){
  const theme = getCodeBlockTheme(d);
  T = T || CODE_THEMES[theme] || CODE_THEMES.dark;
  const fs = d.codeFs || 16;
  let bg = T.bg;
  let glass = '';
  if(d.codeGlass){
    bg = theme === 'light' ? 'rgba(248,249,250,0.58)' : 'rgba(13,17,23,0.58)';
    glass = 'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);';
  }
  return `width:100%;height:100%;overflow:auto;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:${fs}px;line-height:1.6;padding:14px 16px;box-sizing:border-box;background:${bg};color:${T.text};border:1px solid rgba(128,128,128,${d.codeGlass ? 0.22 : 0.15});${glass}`;
}

function applyCodeModalChrome(){
  const wrap = document.getElementById('cm-editor-wrap');
  const lines = document.getElementById('cm-lines');
  const pre = document.getElementById('cm-highlight');
  const ta = document.getElementById('cm-code');
  const themeEl = document.getElementById('cm-theme');
  const glassEl = document.getElementById('cm-glass');
  if(!wrap) return;
  const th = themeEl ? themeEl.value : 'dark';
  const T = CODE_THEMES[th] || CODE_THEMES.dark;
  const isGlass = !!(glassEl && glassEl.checked);
  const bg = isGlass ? (th === 'light' ? 'rgba(248,249,250,0.58)' : 'rgba(13,17,23,0.58)') : T.bg;
  const borderC = th === 'light' ? '#d0d7de' : '#21262d';
  const lineNumC = th === 'light' ? '#8c959f' : '#4a5568';
  wrap.style.background = bg;
  wrap.style.borderColor = borderC;
  wrap.style.backdropFilter = isGlass ? 'blur(10px)' : '';
  wrap.style.webkitBackdropFilter = isGlass ? 'blur(10px)' : '';
  if(lines){
    lines.style.background = bg;
    lines.style.borderRight = '1px solid ' + borderC;
    lines.style.color = lineNumC;
  }
  if(pre) pre.style.color = T.text;
  if(ta) ta.style.caretColor = T.text;
}
window.applyCodeModalChrome = applyCodeModalChrome;
window.codeBlockSurfaceCss = codeBlockSurfaceCss;

function refreshAllCodeBlocks(){
  // При смене цветовой схемы презентации — тёмная/светлая тема кода
  const theme = getCodeThemeForPresTheme();
  const T = CODE_THEMES[theme] || CODE_THEMES.dark;
  (slides||[]).forEach(s=>{
    (s.els||[]).forEach(d=>{
      if(d.type!=='code' || !d.codeRaw) return;
      d.codeTheme = theme;
      d.codeBg = T.bg;
      d.codeHtml = syntaxHighlight(d.codeRaw, d.codeLang||'js', theme);
    });
  });
}

function getCodeThemeForPresTheme(){
  const ti=typeof appliedThemeIdx!=='undefined'?appliedThemeIdx:-1;
  const t=(ti>=0&&typeof THEMES!=='undefined')?THEMES[ti]:null;
  if(!t)return 'dark';
  return t.dark?'dark':'light';
}

/**
 * Эвристика: похож ли текст из буфера на исходный код.
 * Возвращает код языка (py/js/…) или null — вставлять как обычный текст.
 */
function _detectPasteCodeLang(raw){
  let text=String(raw||'').replace(/^\uFEFF/,'');
  let fenceLang=null;
  const fm=text.match(/^```([a-zA-Z0-9_+-]*)[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/);
  if(fm){
    text=fm[2];
    const fl=(fm[1]||'').toLowerCase();
    const fmap={
      python:'py',py:'py',javascript:'js',js:'js',jsx:'js',typescript:'ts',ts:'ts',tsx:'ts',
      rust:'rust',rs:'rust',go:'go',golang:'go',java:'java',c:'cpp',cpp:'cpp','c++':'cpp',
      csharp:'cs',cs:'cs','c#':'cs',html:'html',htm:'html',css:'css',scss:'css',
      sql:'sql',bash:'bash',sh:'bash',shell:'bash',zsh:'bash',json:'json',yaml:'yaml',yml:'yaml'
    };
    fenceLang=fmap[fl]||(fl? 'plain':null);
  }
  const trim=text.trim();
  if(trim.length<20) return null;
  const lines=trim.split(/\r?\n/);
  const nonEmpty=lines.filter(l=>l.trim().length);
  if(nonEmpty.length<2 && !/[{};]|=>|\bdef\b|\bfunction\b|\bclass\b/.test(trim)) return null;

  // Явный JSON
  if(/^\s*[\[{]/.test(trim) && /[\]}]\s*$/.test(trim)){
    try{ JSON.parse(trim); return 'json'; }catch(e){}
  }

  let score=0;
  const L={py:0,js:0,ts:0,java:0,cpp:0,cs:0,go:0,rust:0,html:0,css:0,sql:0,bash:0,yaml:0};

  const indented=lines.filter(l=>/^[ \t]{2,}\S/.test(l)).length;
  if(indented>=1) score+=2;
  if(indented>=3) score+=1;
  if(nonEmpty.length>=3) score+=1;
  if(nonEmpty.length>=6) score+=1;
  if(/[{}]/.test(trim) && /;/.test(trim)) score+=2;
  if(/\w+\s*\([^)]*\)\s*\{/.test(trim)) score+=2;
  if(/\w+\s*\([^)]*\)\s*:/.test(trim)){ score+=2; L.py+=2; }

  if(/(^|\n)\s*#(?!!|include)/.test(trim)){ score+=1; L.py+=1; L.bash+=0.5; }
  if(/\/\/|\/\*|\*\//.test(trim)){ score+=1; L.js+=1; L.java+=0.5; L.cpp+=0.5; L.cs+=0.5; }

  if(/\b(def|elif|except|lambda|None|True|False|yield|nonlocal|asyncio)\b/.test(trim)) L.py+=4;
  if(/\bfor\s+\w+\s+in\s+/.test(trim)) L.py+=2;
  if(/\[[^\]]*\bfor\b[^\]]*\bin\b[^\]]*\]/.test(trim)) L.py+=3;
  if(/\bprint\s*\(/.test(trim)) L.py+=1;
  if(/\bself\b/.test(trim) && /\bdef\b/.test(trim)) L.py+=2;

  if(/\b(const|let|var|function|console\.log|typeof|undefined|=>)\b/.test(trim)) L.js+=3;
  if(/\b(interface|type\s+[A-Z]\w*\s*=|:\s*(string|number|boolean|any))\b/.test(trim)) L.ts+=4;
  if(/\b(public|private|protected|static|void|System\.out)\b/.test(trim)) L.java+=3;
  if(/#include\b|\bstd::|\bnullptr\b|\bint\s+main\s*\(/.test(trim)) L.cpp+=4;
  if(/\b(namespace|using\s+System|Console\.Write)\b/.test(trim)) L.cs+=3;
  if(/\b(func|package\s+main|fmt\.|:=)\b/.test(trim)) L.go+=3;
  if(/\b(fn\s+|let\s+mut|impl\s+|pub\s+fn)\b/.test(trim)) L.rust+=4;
  if(/<\/?[a-zA-Z][\w:-]*[^>]*>/.test(trim) && /<\w+/.test(trim)){ L.html+=4; score+=2; }
  if(/\{[^}]*:[^}]*;[^}]*\}/.test(trim) && /\b(color|margin|display|flex)\b/.test(trim)) L.css+=3;
  if(/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\b/i.test(trim)) L.sql+=4;
  if(/(^|\n)\s*(#!\/bin\/|echo\s+|export\s+\w+=)/.test(trim)) L.bash+=3;
  if(/^\s*\w+:\s*.+$/m.test(trim) && !/[{};]/.test(trim) && nonEmpty.length>=3) L.yaml+=2;

  let best='plain', bestN=0;
  Object.keys(L).forEach(k=>{ if(L[k]>bestN){ bestN=L[k]; best=k; } });
  score+=bestN;

  if(fenceLang) return fenceLang==='plain' && bestN>=2 ? best : fenceLang;
  // Порог: нужна явная языковая сигнатура или сильная структура
  if(bestN>=3 && score>=5) return best;
  if(bestN>=2 && score>=7) return best;
  if(score>=9 && (indented>=2 || /[{};]/.test(trim))) return bestN>=1?best:'plain';
  return null;
}
window._detectPasteCodeLang=_detectPasteCodeLang;

/** Текст + язык → блок кода на слайде (для paste / импорта). */
function insertCodeFromText(raw, lang, toastMsg){
  if(typeof syntaxHighlight!=='function'){
    if(typeof toast==='function') toast('Блок кода недоступен','err');
    return false;
  }
  const code=String(raw||'');
  const theme=(typeof getCodeThemeForPresTheme==='function')?getCodeThemeForPresTheme():'dark';
  const T=(typeof CODE_THEMES!=='undefined'&&CODE_THEMES[theme])||{bg:'#0d1117'};
  if(typeof pushUndo==='function') pushUndo();
  const lines=Math.max(1, code.split(/\r?\n/).length);
  const h=typeof snapV==='function'?snapV(Math.min(520, Math.max(140, 56+lines*20))):Math.min(520, Math.max(140, 56+lines*20));
  const longest=code.split(/\r?\n/).reduce((m,l)=>Math.max(m,l.length),0);
  const w=typeof snapV==='function'?snapV(Math.min(760, Math.max(420, 80+longest*8))):Math.min(760, Math.max(420, 80+longest*8));
  const g=typeof _insertGeom==='function'?_insertGeom(w,h):{x:60,y:60,w,h};
  const d={id:'e'+(++ec),type:'code',x:g.x,y:g.y,w:g.w,h:g.h,
    codeLang:lang||'plain',codeTheme:theme,codeGlass:false,codeRaw:code,
    codeHtml:syntaxHighlight(code,lang||'plain',theme),
    codeBg:T.bg,codeFs:16,rot:0,anims:[]};
  slides[cur].els.push(d);
  if(typeof mkEl==='function') mkEl(d);
  const el=document.getElementById('canvas')&&document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
  if(el&&typeof pick==='function') pick(el);
  if(typeof save==='function') save();
  if(typeof drawThumbs==='function') drawThumbs();
  if(typeof saveState==='function') saveState();
  if(typeof toast==='function'){
    const msg=toastMsg||(typeof t==='function'?t('toastCodePasted'):'Код вставлен');
    toast(msg,'ok');
  }
  return true;
}
window.insertCodeFromText=insertCodeFromText;

function _openCodeModalReady(){
  const modal=document.getElementById('code-modal');
  if(modal) modal.classList.add('open');
  applyCodeModalChrome();
  // Refresh после открытия: при display:none scrollHeight=0 → textarea height:0 и клик не работает
  requestAnimationFrame(function(){
    if(typeof _cmRefreshHL==='function') _cmRefreshHL();
    const ta=document.getElementById('cm-code');
    if(ta){
      try{ ta.focus(); }catch(e){}
    }
  });
}

function addCodeBlock(){
  _codeEditId=null;
  document.getElementById('cm-lang').value='js';
  document.getElementById('cm-code').value='// Your code here\nconsole.log("Hello, World!");';
  const thEl=document.getElementById('cm-theme');
  if(thEl) thEl.value=getCodeThemeForPresTheme();
  const gEl=document.getElementById('cm-glass');
  if(gEl) gEl.checked=false;
  _openCodeModalReady();
}

function openCodeEditor(){
  if(!sel||sel.dataset.type!=='code')return;
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  _codeEditId=d.id;
  document.getElementById('cm-lang').value=d.codeLang||'js';
  document.getElementById('cm-code').value=d.codeRaw||'';
  const thEl=document.getElementById('cm-theme');
  if(thEl) thEl.value=d.codeTheme||getCodeThemeForPresTheme();
  const gEl=document.getElementById('cm-glass');
  if(gEl) gEl.checked=!!d.codeGlass;
  _openCodeModalReady();
}

function insertCodeBlock(){
  const lang=document.getElementById('cm-lang').value;
  const themeEl=document.getElementById('cm-theme');
  const theme=themeEl?themeEl.value:getCodeThemeForPresTheme();
  const glassEl=document.getElementById('cm-glass');
  const codeGlass=!!(glassEl&&glassEl.checked);
  const raw=document.getElementById('cm-code').value;
  document.getElementById('code-modal').classList.remove('open');
  pushUndo();
  if(_codeEditId){
    const d=slides[cur].els.find(e=>e.id===_codeEditId);
    if(d){
      d.codeLang=lang;d.codeTheme=theme;d.codeGlass=codeGlass;d.codeRaw=raw;
      d.codeHtml=syntaxHighlight(raw,lang,theme);
      const T=CODE_THEMES[theme]||CODE_THEMES.dark;
      d.codeBg=T.bg;
      const domEl=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
      if(domEl)renderCodeEl(domEl,d);
      // Связанный HTML-фрейм («Показать код») — обновить отображение
      if(typeof _hfSyncFromLinkedCode==='function') _hfSyncFromLinkedCode(d);
    }
  } else {
    const T=CODE_THEMES[theme]||CODE_THEMES.dark;
    const d={id:'e'+(++ec),type:'code',x:snapV(60),y:snapV(60),w:snapV(680),h:snapV(400),
      codeLang:lang,codeTheme:theme,codeGlass:codeGlass,codeRaw:raw,codeHtml:syntaxHighlight(raw,lang,theme),
      codeBg:T.bg,codeFs:16,rot:0,anims:[]};
    slides[cur].els.push(d);mkEl(d);
  }
  save();drawThumbs();saveState();
}

function renderCodeEl(el,d){
  const c=el.querySelector('.ec');if(!c)return;
  const theme=getCodeBlockTheme(d);
  const T=CODE_THEMES[theme]||CODE_THEMES.dark;
  c.style.cssText=codeBlockSurfaceCss(d,T);
  c.innerHTML=`<div style="font-size:9px;color:${T.cmt};margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px">${d.codeLang||''}</div><pre style="margin:0;white-space:pre;overflow:visible">${d.codeHtml||''}</pre>`;
}

function updateCodeLang(v){if(!sel||sel.dataset.type!=='code')return;const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;d.codeLang=v;d.codeHtml=syntaxHighlight(d.codeRaw||'',v,getCodeThemeForPresTheme());renderCodeEl(sel,d);save();drawThumbs();}
function updateCodeFontSize(v){if(!sel||sel.dataset.type!=='code')return;const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;d.codeFs=+v;renderCodeEl(sel,d);save();}

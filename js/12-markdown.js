// ══════════════ MARKDOWN ══════════════
let _mdEditId=null;
function markdownToHtml(md){
  let h=md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Headings
  h=h.replace(/^######\s(.+)$/gm,'<h6>$1</h6>');
  h=h.replace(/^#####\s(.+)$/gm,'<h5>$1</h5>');
  h=h.replace(/^####\s(.+)$/gm,'<h4>$1</h4>');
  h=h.replace(/^###\s(.+)$/gm,'<h3>$1</h3>');
  h=h.replace(/^##\s(.+)$/gm,'<h2>$1</h2>');
  h=h.replace(/^#\s(.+)$/gm,'<h1>$1</h1>');
  // Code blocks
  h=h.replace(/```[\s\S]*?```/g,m=>'<pre><code>'+m.replace(/^```[a-z]*\n?/,'').replace(/```$/,'')+'</code></pre>');
  // Inline code
  h=h.replace(/`([^`]+)`/g,'<code>$1</code>');
  // Bold & italic
  h=h.replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>');
  h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  h=h.replace(/\*(.+?)\*/g,'<em>$1</em>');
  h=h.replace(/__(.+?)__/g,'<strong>$1</strong>');
  h=h.replace(/_(.+?)_/g,'<em>$1</em>');
  // HR
  h=h.replace(/^[-*]{3,}$/gm,'<hr>');
  // Blockquotes
  h=h.replace(/^&gt;\s(.+)$/gm,'<blockquote>$1</blockquote>');
  // Unordered lists
  h=h.replace(/^[-*+]\s(.+)$/gm,'<li>$1</li>');
  h=h.replace(/(<li>.*<\/li>\n?)+/g,'<ul>$&</ul>');
  // Ordered lists
  h=h.replace(/^\d+\.\s(.+)$/gm,'<li>$1</li>');
  // Links
  h=h.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');
  // Paragraphs — wrap remaining non-tag lines
  h=h.replace(/^(?!<[a-zA-Z]).+$/gm,line=>line.trim()?`<p>${line}</p>`:'');
  return h;
}

function updateMdPreview(){
  const src=document.getElementById('md-source').value;
  document.getElementById('md-preview').innerHTML=markdownToHtml(src);
}

function addMarkdownBlock(){
  _mdEditId=null;
  document.getElementById('md-source').value='# Title\n\nWrite **markdown** here.\n\n- Item one\n- Item two\n- Item three';
  updateMdPreview();
  document.getElementById('md-modal').classList.add('open');
}

function openMdEditor(){
  if(!sel||sel.dataset.type!=='markdown')return;
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  _mdEditId=d.id;
  document.getElementById('md-source').value=d.mdRaw||'';
  updateMdPreview();
  document.getElementById('md-modal').classList.add('open');
}

function insertMarkdownBlock(){
  const raw=document.getElementById('md-source').value;
  const html=markdownToHtml(raw);
  document.getElementById('md-modal').classList.remove('open');
  if(typeof pushUndo==="function")pushUndo();
  if(_mdEditId){
    const d=slides[cur].els.find(e=>e.id===_mdEditId);
    if(d){d.mdRaw=raw;d.mdHtml=html;
      const domEl=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
      if(domEl){const c=domEl.querySelector('.ec');if(c)c.innerHTML=html;}}
  } else {
    const defMdColor=document.documentElement.classList.contains('light')?'#000000':'#ffffff';
    const d={id:'e'+(++ec),type:'markdown',x:snapV(60),y:snapV(60),w:snapV(550),h:snapV(400),mdRaw:raw,mdHtml:html,mdFs:16,mdColor:defMdColor,mdColorScheme:{col:7,row:0},rot:0,anims:[]};
    slides[cur].els.push(d);mkEl(d);
  }
  if(typeof save==="function")save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();
}

function updateMdFontSize(v){
  if(!sel||sel.dataset.type!=='markdown')return;
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  d.mdFs=+v;
  const c=sel.querySelector('.ec');if(c)c.style.fontSize=v+'px';
  if(typeof save==="function")save();
}

function updateMdColor(v, schemeRef){
  if(!sel||sel.dataset.type!=='markdown')return;
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  d.mdColor=v;
  d.mdColorScheme = schemeRef !== undefined ? schemeRef : null;
  const c=sel.querySelector('.ec');
  if(c){c.style.color=v;c.style.setProperty('--md-c',v);}
  try{document.getElementById('md-color-hex').value=v;document.getElementById('md-color-preview').style.background=v;}catch(e){}
  if(typeof save==="function")save();
}

// ── Markdown background ──────────────────────────────────────────────────────
function setMdBg(col, schemeRef){
  if(!sel||sel.dataset.type!=='markdown')return;
  sel.dataset.textBg=col;
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(d) d.textBgScheme = schemeRef!==undefined ? (schemeRef||null) : d.textBgScheme;
  if(typeof applyTextBg==='function') applyTextBg(sel);
  if(typeof commitAll==='function') commitAll();
}
function setMdBgOp(op){
  if(!sel||sel.dataset.type!=='markdown')return;
  sel.dataset.textBgOp=op;
  if(typeof applyTextBg==='function') applyTextBg(sel);
  if(typeof commitAll==='function') commitAll();
}
function setMdBgBlur(v){
  if(!sel||sel.dataset.type!=='markdown')return;
  sel.dataset.textBgBlur=v;
  if(typeof applyTextBg==='function') applyTextBg(sel);
  if(typeof commitAll==='function') commitAll();
}
function clearMdBg(){
  if(!sel||sel.dataset.type!=='markdown')return;
  delete sel.dataset.textBg; delete sel.dataset.textBgOp; delete sel.dataset.textBgBlur;
  const ec=sel.querySelector('.ec'); if(ec) ec.style.background='';
  sel.style.background=''; sel.style.backdropFilter=''; sel.style.webkitBackdropFilter='';
  try{document.getElementById('md-bg-hex').value='';document.getElementById('md-bg-swatch-inner').style.background='';}catch(e){}
  if(typeof commitAll==='function') commitAll();
}

// ── Markdown radius ───────────────────────────────────────────────────────────
function setMdRadius(corner, val){
  if(!sel||sel.dataset.type!=='markdown')return;
  sel.dataset['rx_'+corner]=val;
  _applyMdRadius(sel);
  if(typeof save==='function') save();
  if(typeof drawThumbs==='function') drawThumbs();
  if(typeof saveState==='function') saveState();
}
function _applyMdRadius(el){
  const tl=el.dataset.rx_tl||0, tr=el.dataset.rx_tr||0, bl=el.dataset.rx_bl||0, br=el.dataset.rx_br||0;
  const rx=`${tl}px ${tr}px ${br}px ${bl}px`;
  el.style.borderRadius=rx; el.style.overflow='hidden';
  const ec=el.querySelector('.ec'); if(ec){ec.style.borderRadius=rx; ec.style.overflow='hidden';}
}

// ── Markdown border ───────────────────────────────────────────────────────────
function setMdBorder(prop, val, schemeRef){
  if(!sel||sel.dataset.type!=='markdown')return;
  if(prop==='color'){
    sel.dataset.textBorderColor=val;
    const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d) d.borderScheme = schemeRef!==undefined ? (schemeRef||null) : d.borderScheme;
    try{document.getElementById('md-border-hex').value=val;}catch(e){}
  }
  if(prop==='width') sel.dataset.textBorderW=val;
  _applyMdBorder(sel);
  if(typeof save==='function') save();
  if(typeof drawThumbs==='function') drawThumbs();
  if(typeof saveState==='function') saveState();
}
function _applyMdBorder(el){
  const w=+(el.dataset.textBorderW||0);
  const c=el.dataset.textBorderColor||'#ffffff';
  if(w>0){ el.style.border=w+'px solid '+c; }
  else { el.style.border=''; }
}


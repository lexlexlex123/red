// ══════════════ HTML FRAME ELEMENT ══════════════
let _hfEditId=null;

function addHtmlFrame(){
  _hfEditId=null;
  document.getElementById('hf-src').value='';
  document.getElementById('hf-w').value=640;
  document.getElementById('hf-h').value=400;
  document.getElementById('hf-scrollable').checked=false;
  document.getElementById('htmlframe-modal').classList.add('open');
}

function openHtmlFrameEditor(){
  if(!sel||sel.dataset.type!=='htmlframe')return;
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  _hfEditId=d.id;
  document.getElementById('hf-src').value=d.hfSrc||'';
  document.getElementById('hf-w').value=d.w||640;
  document.getElementById('hf-h').value=d.h||400;
  document.getElementById('hf-scrollable').checked=!!d.hfScroll;
  document.getElementById('htmlframe-modal').classList.add('open');
}

function insertHtmlFrame(){
  const src=document.getElementById('hf-src').value.trim();
  const fw=+document.getElementById('hf-w').value||640;
  const fh=+document.getElementById('hf-h').value||400;
  const scroll=document.getElementById('hf-scrollable').checked;
  if(!src)return;
  document.getElementById('htmlframe-modal').classList.remove('open');
  pushUndo();
  if(_hfEditId){
    const d=slides[cur].els.find(e=>e.id===_hfEditId);
    if(d){
      d.hfSrc=src;d.hfScroll=scroll;
      const domEl=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
      if(domEl)renderHtmlFrameEl(domEl,d);
    }
  } else {
    const d={id:'e'+(++ec),type:'htmlframe',x:snapV(60),y:snapV(60),
      w:snapV(fw),h:snapV(fh),rot:0,anims:[],
      hfSrc:src,hfScroll:scroll,hfLinkedCodeId:null};
    slides[cur].els.push(d);mkEl(d);
  }
  save();drawThumbs();saveState();
  if(_hfEditId){
    const d2=slides[cur].els.find(e=>e.id===_hfEditId);
    if(d2)_hfSyncLinkedCode(d2);
  }
}

// ── Shared: build srcdoc ─────────────────────────
function _hfBuildSrcdoc(src){
  const hasDoc=/<!doctype/i.test(src)||/<html/i.test(src);
  return hasDoc?src:'<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:8px;box-sizing:border-box;}</style></head><body>'+src+'</body></html>';
}

// ── Shared: build the chrome (bar + iframeWrap) into a container el ──
// editorMode=true: overlay blocks clicks, iframe pointer-events:none
// editorMode=false: iframe fully interactive, fullscreen btn works
function _hfBuildChrome(container, d, editorMode){
  const src=d.hfSrc||'';
  const isUrl=/^https?:\/\//i.test(src);

  // Title
  let title='New Tab';
  if(!isUrl){
    const tm=src.match(/<title[^>]*>([^<]*)<\/title>/i);
    if(tm&&tm[1].trim())title=tm[1].trim().slice(0,40);
  } else {
    title=src.replace(/^https?:\/\//,'').split('/')[0].slice(0,40);
  }
  const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');

  // Outer container style — use individual properties to not clobber caller's left/top/w/h
  container.style.overflow='hidden';
  container.style.borderRadius='6px';
  container.style.display='flex';
  container.style.flexDirection='column';
  container.style.background='transparent';
  container.style.border='1px solid rgba(128,128,128,.25)';
  container.style.boxSizing='border-box';

  // ── Tab bar ──
  const bar=document.createElement('div');
  bar.className='hf-bar';
  bar.style.cssText='display:flex;align-items:flex-end;background:rgba(40,40,50,.92);'+
    'padding:0 8px;height:32px;flex-shrink:0;';
  bar.innerHTML=
    '<div style="display:flex;gap:5px;align-items:center;margin-right:8px;padding-bottom:6px;">'+
      '<div style="width:11px;height:11px;border-radius:50%;background:#ff5f57;"></div>'+
      '<div style="width:11px;height:11px;border-radius:50%;background:#ffbd2e;"></div>'+
      '<div class="hf-btn-max" style="width:11px;height:11px;border-radius:50%;background:#28c940;cursor:'+(editorMode?'default':'pointer')+';"></div>'+
    '</div>'+
    '<div class="hf-tab" style="display:flex;align-items:center;gap:5px;'+
      'background:rgba(255,255,255,.13);border-radius:5px 5px 0 0;'+
      'padding:4px 10px 5px 10px;font-size:11px;color:rgba(255,255,255,.85);'+
      'max-width:200px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;'+
      'align-self:flex-end;border:1px solid rgba(255,255,255,.12);border-bottom:none;'+
      'margin-bottom:-1px;box-sizing:border-box;">'+
      '<span style="font-size:10px;opacity:.6;">'+(isUrl?'&#127760;':'&#9000;')+'</span>'+
      '<span>'+esc(title)+'</span>'+
    '</div>';

  // ── iframe wrap ──
  const iframeWrap=document.createElement('div');
  iframeWrap.className='hf-iframe-wrap';
  iframeWrap.style.cssText='flex:1;position:relative;overflow:hidden;background:#fff;'+
    'border-top:1px solid rgba(255,255,255,.12);';

  const iframe=document.createElement('iframe');
  iframe.className='hf-iframe';
  iframe.setAttribute('sandbox','allow-scripts allow-forms allow-popups allow-presentation allow-top-navigation-by-user-activation');
  iframe.setAttribute('allowfullscreen','');
  iframe.style.cssText='width:100%;height:100%;border:none;display:block;'+
    'pointer-events:'+(editorMode?'none':'auto')+';';

  if(isUrl){
    iframe.src=src;
  } else {
    iframe.srcdoc=_hfBuildSrcdoc(src);
  }

  iframeWrap.appendChild(iframe);

  if(editorMode){
    // Transparent overlay to block all mouse interaction
    const overlay=document.createElement('div');
    overlay.className='hf-overlay';
    overlay.style.cssText='position:absolute;inset:0;z-index:10;background:transparent;';
    iframeWrap.appendChild(overlay);
  }

  container.appendChild(bar);
  container.appendChild(iframeWrap);
}

// ── Editor render ────────────────────────────────
function renderHtmlFrameEl(el,d){
  const container=el.querySelector('.ec');if(!container)return;

  // Write all fields to dataset so save() reads fresh values
  el.dataset.hfSrc=d.hfSrc||'';
  el.dataset.hfScroll=d.hfScroll?'1':'0';
  el.dataset.hfLinkedCodeId=d.hfLinkedCodeId||'';

  // Rebuild chrome (always fresh to reflect src changes)
  container.innerHTML='';
  container.style.cssText='width:100%;height:100%;';  // reset .ec before chrome sets flex
  _hfBuildChrome(container, d, true);

  _hfSyncCodeBtn();
}

function _escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;');}

// ── Preview render (called from 24-preview.js) ───
function _hfBuildPreview(el, d){
  // Capture original geometry BEFORE any style changes
  const origLeft=el.style.left,origTop=el.style.top,
        origW=el.style.width,origH=el.style.height,origZ=el.style.zIndex||'2';

  _hfBuildChrome(el, d, false);

  // Fullscreen toggle on green button
  const bar=el.querySelector('.hf-bar');
  const maxBtn=bar&&bar.querySelector('.hf-btn-max');
  if(!maxBtn)return;
  maxBtn.addEventListener('click',function(e){
    e.stopPropagation();
    if(el.dataset.hfFs==='1'){
      el.style.left=origLeft;el.style.top=origTop;
      el.style.width=origW;el.style.height=origH;el.style.zIndex=origZ;
      el.dataset.hfFs='0';
    } else {
      const st=el.parentElement;
      el.style.left='0';el.style.top='0';
      el.style.width=(st?st.offsetWidth:1280)+'px';
      el.style.height=(st?st.offsetHeight:720)+'px';
      el.style.zIndex=999;
      el.dataset.hfFs='1';
    }
  });
}

// ── Linked code block ────────────────────────────
function _hfSyncCodeBtn(){
  const btn=document.getElementById('hf-codebtn');
  if(!btn||!sel||sel.dataset.type!=='htmlframe')return;
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  const linked=d.hfLinkedCodeId&&slides[cur].els.find(e=>e.id===d.hfLinkedCodeId);
  btn.textContent=linked?'\uD83D\uDDD1 Hide code':'📄 Show code';
}

function hfToggleLinkedCode(){
  if(!sel||sel.dataset.type!=='htmlframe')return;
  const d=slides[cur].els.find(e=>e.id===sel.dataset.id);if(!d)return;
  const src=d.hfSrc||'';
  const isUrl=/^https?:\/\//i.test(src);
  if(isUrl){if(typeof toast==='function')toast('Code view only works for HTML blocks','warn');return;}
  const existing=d.hfLinkedCodeId&&slides[cur].els.find(e=>e.id===d.hfLinkedCodeId);
  pushUndo();
  if(existing){
    const idx=slides[cur].els.indexOf(existing);
    if(idx>=0)slides[cur].els.splice(idx,1);
    const domEl=document.getElementById('canvas').querySelector('[data-id="'+existing.id+'"]');
    if(domEl)domEl.remove();
    d.hfLinkedCodeId=null;
    const hfDom=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
    if(hfDom)hfDom.dataset.hfLinkedCodeId='';
  } else {
    const theme=typeof getCodeThemeForPresTheme==='function'?getCodeThemeForPresTheme():'dark';
    const T=(typeof CODE_THEMES!=='undefined'&&CODE_THEMES[theme])||{bg:'#0d1117',text:'#e6edf3'};
    const cd={id:'e'+(++ec),type:'code',
      x:snapV(d.x+d.w+20),y:snapV(d.y),w:snapV(Math.min(d.w,560)),h:snapV(d.h),
      codeLang:'html',codeTheme:theme,codeRaw:src,
      codeHtml:typeof syntaxHighlight==='function'?syntaxHighlight(src,'html',theme):src,
      codeBg:T.bg,codeFs:12,rot:0,anims:[],hfParentId:d.id};
    d.hfLinkedCodeId=cd.id;
    const hfDom=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
    if(hfDom)hfDom.dataset.hfLinkedCodeId=cd.id;
    slides[cur].els.push(cd);mkEl(cd);
  }
  _hfSyncCodeBtn();
  save();drawThumbs();saveState();
}

function _hfSyncLinkedCode(d){
  if(!d||!d.hfLinkedCodeId)return;
  const cd=slides[cur].els.find(e=>e.id===d.hfLinkedCodeId);if(!cd)return;
  const src=d.hfSrc||'';
  if(/^https?:\/\//i.test(src))return;
  const theme=typeof getCodeThemeForPresTheme==='function'?getCodeThemeForPresTheme():'dark';
  cd.codeRaw=src;
  cd.codeHtml=typeof syntaxHighlight==='function'?syntaxHighlight(src,'html',theme):src;
  cd.codeTheme=theme;
  const domEl=document.getElementById('canvas').querySelector('[data-id="'+cd.id+'"]');
  if(domEl&&typeof renderCodeEl==='function')renderCodeEl(domEl,cd);
}

// ── Delete hook ──────────────────────────────────
function _hfOnDelete(elData){
  if(!elData)return;
  if(elData.type==='htmlframe'&&elData.hfLinkedCodeId){
    const idx=slides[cur].els.findIndex(e=>e.id===elData.hfLinkedCodeId);
    if(idx>=0){
      const domEl=document.getElementById('canvas').querySelector('[data-id="'+elData.hfLinkedCodeId+'"]');
      if(domEl)domEl.remove();
      slides[cur].els.splice(idx,1);
    }
  }
  if(elData.type==='code'&&elData.hfParentId){
    const parent=slides[cur].els.find(e=>e.id===elData.hfParentId);
    if(parent){
      parent.hfLinkedCodeId=null;
      const hfDom=document.getElementById('canvas').querySelector('[data-id="'+parent.id+'"]');
      if(hfDom)hfDom.dataset.hfLinkedCodeId='';
    }
  }
}

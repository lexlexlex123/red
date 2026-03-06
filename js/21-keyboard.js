// ══════════════ KEYBOARD ══════════════
let elClipboard=null; // stores copied element data

// Russian ↔ Latin key mapping for Ctrl shortcuts
const RU_TO_EN={'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']','ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':"'",'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m',',':'<','.':'>','Й':'Q','Ц':'W','У':'E','К':'R','Е':'T','Н':'Y','Г':'U','Ш':'I','Щ':'O','З':'P','Ф':'A','Ы':'S','В':'D','А':'F','П':'G','Р':'H','О':'J','Л':'K','Д':'L','Я':'Z','Ч':'X','С':'C','М':'V','И':'B','Т':'N','Ь':'M'};
function latinKey(e){return RU_TO_EN[e.key]||e.key;}

function onKey(e){
  const editing=document.activeElement.contentEditable==='true';
  const inInput=['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName);
  const inPreview=document.getElementById('preview-ov').classList.contains('active');
  const lk=latinKey(e);
  if(inPreview){
    if(e.key==='Escape'){if(typeof pidx!=='undefined')cur=pidx;stopPreview();}
    else if(['ArrowRight','ArrowDown',' '].includes(e.key)){e.preventDefault();nextPreview();}
    else if(['ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();prevPreview();}
    return;
  }
  if(e.key==='Escape'){if(pipetteMode){cancelPipetteMode();return;}clearMultiSel();desel();}
  if(e.ctrlKey||e.metaKey){
    if(lk==='z'&&!editing){e.preventDefault();doUndo();return;}
    if((lk==='y'||lk==='Z')&&!editing){e.preventDefault();doRedo();return;}
    if(lk==='d'&&!editing){e.preventDefault();if(multiSel.size>1){copySelected();pasteSelected();}else dupEl();return;}
    if(lk==='c'&&!editing){e.preventDefault();copySelected();return;}
    if(lk==='v'&&!editing){
      // If internal clipboard has data — paste element; otherwise let system paste event handle it
      const hasInternal=(typeof clipboard!=='undefined'&&clipboard.length)||(typeof elClipboard!=='undefined'&&elClipboard);
      if(hasInternal){e.preventDefault();pasteSelected();return;}
      // No internal clipboard — let browser paste event fire (images, text, TSV from Excel)
      return;
    }
    if(lk==='a'&&!editing){
      e.preventDefault();
      clearMultiSel();
      document.getElementById('canvas').querySelectorAll('.el').forEach(el=>addToMultiSel(el));
      if(multiSel.size===1){const only=[...multiSel][0];clearMultiSel();pick(only);}
      else if(multiSel.size>1){pick([...multiSel].slice(-1)[0]);if(typeof toast==="function")toast(multiSel.size+(getLang()==='ru'?' элементов выбрано':' elements selected'),'ok');}
      return;
    }
  }
  if(editing||inInput)return;
  if(sel||multiSel.size>0){
    const step=e.shiftKey?SNAP*5:SNAP;
    const allEls=multiSel.size>1?[...multiSel]:(sel?[sel]:[]);
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown'){
      if(allEls.length===0)return;
      e.preventDefault();
      if(typeof pushUndo==="function")pushUndo();
      allEls.forEach(el=>{
        if(e.key==='ArrowLeft')el.style.left=(parseInt(el.style.left)-step)+'px';
        else if(e.key==='ArrowRight')el.style.left=(parseInt(el.style.left)+step)+'px';
        else if(e.key==='ArrowUp')el.style.top=(parseInt(el.style.top)-step)+'px';
        else if(e.key==='ArrowDown')el.style.top=(parseInt(el.style.top)+step)+'px';
      });
      syncPos();save();return;
    }
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelected();return;}
  } else {
    // No element selected — Delete removes current slide
    if(e.key==='Delete'){e.preventDefault();delSlide();return;}
  }
  if(e.key==='F5'){
    e.preventDefault();
    // If preview is active, stop it and return to the slide where it paused
    const po=document.getElementById('preview-ov');
    if(po&&po.classList.contains('active')){
      if(typeof pidx!=='undefined') cur=pidx;
      if(typeof stopPreview==='function') stopPreview();
    } else {
      if(typeof startPreview==='function') startPreview(cur);
    }
    return;
  }
}
function copyEl(){
  if(!sel)return;
  const d=slides[cur].els.find(el=>el.id===sel.dataset.id);if(!d)return;
  elClipboard=JSON.parse(JSON.stringify(d));
  if(typeof toast==="function")toast(t('toastCopied'),'ok');
}
function pasteEl(){
  if(!elClipboard)return (typeof toast==="function")&&toast(t('toastNothingPaste'));
  if(typeof pushUndo==="function")pushUndo();
  const nd=JSON.parse(JSON.stringify(elClipboard));
  nd.id='e'+(++ec); // no offset — paste at same position
  slides[cur].els.push(nd);mkEl(nd);
  // Select the pasted element
  const newEl=document.getElementById('canvas').querySelector('[data-id="'+nd.id+'"]');
  if(newEl)pick(newEl);
  save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();
  if(typeof toast==="function")toast(t('toastPasted'),'ok');
}
function dupEl(){
  if(!sel)return;if(typeof pushUndo==="function")pushUndo();
  const d=slides[cur].els.find(el=>el.id===sel.dataset.id);if(!d)return;
  const nd=JSON.parse(JSON.stringify(d));nd.id='e'+(++ec);nd.x+=20;nd.y+=20;
  slides[cur].els.push(nd);mkEl(nd);save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();
}


// Convert HTML <table> to TSV string for table paste
function _htmlTableToTSV(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const table = tmp.querySelector('table');
  if (!table) return '';
  const rows = [];
  table.querySelectorAll('tr').forEach(tr => {
    const cells = [];
    tr.querySelectorAll('td,th').forEach(td => {
      cells.push(td.innerText || td.textContent || '');
    });
    if (cells.length) rows.push(cells.join('\t'));
  });
  return rows.join('\n');
}

// ══════════════ SYSTEM CLIPBOARD PASTE ══════════════
document.addEventListener('paste', async (e) => {
  // Don't intercept when editing text or typing in inputs
  const ae = document.activeElement;
  const editing = ae.contentEditable === 'true';
  const inInput = ['INPUT','SELECT','TEXTAREA'].includes(ae.tagName);
  const inPreview = document.getElementById('preview-ov').classList.contains('active');
  // Allow paste into table cells only when actually double-click editing (el has data-editing)
  const inTableCell = ae.matches && ae.matches('td,th') && editing;
  const elEditing = ae.closest && ae.closest('.el[data-editing="true"]');
  if ((editing && !inTableCell) || (inTableCell && elEditing) || inInput || inPreview) return;
  if (!slides[cur]) return;

  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;

  // Collect all types available
  const types = e.clipboardData.types || [];
  const hasHTML = types.includes('text/html');
  const hasPlain = types.includes('text/plain');

  // Pre-read text items (needed to detect TSV before deciding on image)
  let html = '', plain = '';
  const textPromises = [];
  for (const item of items) {
    if (item.type === 'text/html') textPromises.push(new Promise(res => item.getAsString(s => { html = s; res(); })));
    else if (item.type === 'text/plain') textPromises.push(new Promise(res => item.getAsString(s => { plain = s; res(); })));
  }
  await Promise.all(textPromises);

  // 0. TSV / Excel table — highest priority (Excel also puts image/png in clipboard)
  const isTSV = plain && plain.includes('\t');
  if (isTSV && typeof tblPasteData === 'function') {
    e.preventDefault();
    if (tblPasteData(plain)) return;
  }

  // Also check text/html for <table> tag (Google Sheets, web tables)
  if (!isTSV && html && html.includes('<table') && typeof tblPasteData === 'function') {
    const tsv = _htmlTableToTSV(html);
    if (tsv && tsv.includes('\t')) {
      e.preventDefault();
      if (tblPasteData(tsv)) return;
    }
  }

  // 1. Check for image (skip if we also have text — that means it's Excel/app screenshot)
  const hasText = plain.trim() || html.trim();
  for (const item of items) {
    if (item.type.startsWith('image/') && !hasText) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = ev => {
        if(typeof pushUndo==="function")pushUndo();
        const img = new Image();
        img.onload = () => {
          // Fit image to canvas keeping aspect ratio, max 60% of canvas
          const maxW = canvasW * 0.6, maxH = canvasH * 0.6;
          let w = img.naturalWidth || 400, h = img.naturalHeight || 300;
          const scale = Math.min(maxW / w, maxH / h, 1);
          w = Math.round(w * scale); h = Math.round(h * scale);
          const x = Math.round((canvasW - w) / 2);
          const y = Math.round((canvasH - h) / 2);
          const d = {
            id:'e'+(++ec), type:'image',
            x, y, w, h,
            src: ev.target.result,
            rot:0, anims:[], imgFit:'contain', imgRx:0,
            imgBw:0, imgBc:'#ffffff', imgShadow:false,
            imgShadowBlur:15, imgShadowColor:'#000000', imgOpacity:1
          };
          slides[cur].els.push(d); mkEl(d);
          const el = document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
          if (el) pick(el);
          save(); if(typeof drawThumbs==="function")drawThumbs(); if(typeof saveState==="function")saveState();
          if(typeof toast==="function")toast((getLang()==='ru'?'Изображение вставлено':'Image pasted'),'ok');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      return;
    }
  }

  // text was already read above — proceed with plain/html
  const text = plain || html;
  if (!text || !text.trim()) return;

  e.preventDefault();
  if(typeof pushUndo==="function")pushUndo();

  // Strip HTML tags to get clean text, preserve line breaks
  let content = plain || '';
  if (!content && html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    content = tmp.innerText || tmp.textContent || '';
  }
  content = content.trim();
  if (!content) return;

  // Create text element centered on canvas
  const w = Math.min(Math.max(content.length * 14, 300), canvasW * 0.7);
  const h = Math.max(80, Math.ceil(content.split('\n').length * 48));
  const x = Math.round((canvasW - w) / 2);
  const y = Math.round((canvasH - h) / 2);

  // Escape for HTML display, preserve newlines as <br>
  const safeHtml = content
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\n/g,'<br>');

  const d = {
    id:'e'+(++ec), type:'text',
    x, y, w, h,
    html: safeHtml,
    cs: 'font-size:32px;font-weight:400;color:#ffffff;text-align:left;line-height:1.3;',
    rot:0, anims:[], textRole:'body'
  };
  slides[cur].els.push(d); mkEl(d);
  const el = document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
  if (el) pick(el);
  save(); if(typeof drawThumbs==="function")drawThumbs(); if(typeof saveState==="function")saveState();
  if(typeof toast==="function")toast((getLang()==='ru'?'Текст вставлен':'Text pasted'),'ok');
});

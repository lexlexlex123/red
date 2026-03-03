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
    if(e.key==='Escape')stopPreview();
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
    if(lk==='v'&&!editing){e.preventDefault();pasteSelected();return;}
    if(lk==='a'&&!editing){
      e.preventDefault();
      clearMultiSel();
      document.getElementById('canvas').querySelectorAll('.el').forEach(el=>addToMultiSel(el));
      if(multiSel.size===1){const only=[...multiSel][0];clearMultiSel();pick(only);}
      else if(multiSel.size>1){pick([...multiSel].slice(-1)[0]);toast(multiSel.size+' elements selected','ok');}
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
      pushUndo();
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
  if(e.key==='F5'){e.preventDefault();startPreview(cur);}
}
function copyEl(){
  if(!sel)return;
  const d=slides[cur].els.find(el=>el.id===sel.dataset.id);if(!d)return;
  elClipboard=JSON.parse(JSON.stringify(d));
  toast('Copied — Ctrl+V to paste','ok');
}
function pasteEl(){
  if(!elClipboard)return toast('Nothing to paste — copy an element first with Ctrl+C');
  pushUndo();
  const nd=JSON.parse(JSON.stringify(elClipboard));
  nd.id='e'+(++ec); // no offset — paste at same position
  slides[cur].els.push(nd);mkEl(nd);
  // Select the pasted element
  const newEl=document.getElementById('canvas').querySelector('[data-id="'+nd.id+'"]');
  if(newEl)pick(newEl);
  save();drawThumbs();saveState();
  toast('Pasted','ok');
}
function dupEl(){
  if(!sel)return;pushUndo();
  const d=slides[cur].els.find(el=>el.id===sel.dataset.id);if(!d)return;
  const nd=JSON.parse(JSON.stringify(d));nd.id='e'+(++ec);nd.x+=20;nd.y+=20;
  slides[cur].els.push(nd);mkEl(nd);save();drawThumbs();saveState();
}

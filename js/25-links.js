// ══════════════ LINK MODAL ══════════════
let lmSel=-1;
function openLinkModal(){
  if(!sel)return toast('Select an element first');
  const link=sel.dataset.link||'';const isSlide=link.startsWith('#slide-');
  document.getElementById('lm-type').value=isSlide?'slide':'url';
  document.getElementById('lm-url').value=isSlide?'':link;
  document.getElementById('lm-target').value=sel.dataset.linkt||'_blank';
  lmSel=isSlide?parseInt(link.replace('#slide-',''))-1:-1;
  onLMTypeChange(isSlide?'slide':'url');buildLMSlides();
  document.getElementById('link-modal').classList.add('open');
}
function closeLinkModal(){document.getElementById('link-modal').classList.remove('open');}
function onLMTypeChange(v){document.getElementById('lm-url-wrap').style.display=v==='url'?'flex':'none';document.getElementById('lm-slide-wrap').style.display=v==='slide'?'block':'none';}
function buildLMSlides(){
  const c=document.getElementById('lm-slides');c.innerHTML='';
  slides.forEach((s,i)=>{
    const d=document.createElement('div');d.className='lsi'+(i===lmSel?' on':'');
    d.textContent=(i+1)+'. '+s.title;(function(idx){d.onclick=()=>{lmSel=idx;buildLMSlides();};})(i);c.appendChild(d);
  });
}
function applyLink(){
  if(!sel)return;const t=document.getElementById('lm-type').value;
  let href=t==='url'?document.getElementById('lm-url').value.trim():(lmSel>=0?'#slide-'+(lmSel+1):'');
  if(href){sel.dataset.link=href;sel.classList.add('has-link');}else{delete sel.dataset.link;sel.classList.remove('has-link');}
  sel.dataset.linkt=document.getElementById('lm-target').value;
  document.getElementById('p-link').value=href;save();saveState();closeLinkModal();toast('Link applied','ok');
}
function removeLink(){if(!sel)return;delete sel.dataset.link;delete sel.dataset.linkt;sel.classList.remove('has-link');document.getElementById('p-link').value='';save();saveState();closeLinkModal();}

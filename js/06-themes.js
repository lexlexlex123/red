// ══════════════ THEMES ══════════════
function openThemeModal(){selTheme=-1;buildThemeGrid();document.getElementById('theme-modal').classList.add('open');}
function closeThemeModal(){document.getElementById('theme-modal').classList.remove('open');}
function applyTheme(){
  if(selTheme<0)return toast('Select a theme first');
  const t=THEMES[selTheme];pushUndo();
  // Save current slide DOM state FIRST before modifying data
  save();

  // Helper: strip all inline color styles from HTML string via DOM
  function stripInlineColors(html){
    const tmp=document.createElement('div');
    tmp.innerHTML=html;
    tmp.querySelectorAll('[style]').forEach(el=>{
      let st=el.getAttribute('style');
      st=st.replace(/\bcolor\s*:[^;]+;?/gi,'').replace(/\s*;\s*;/g,';').trim().replace(/^;|;$/g,'');
      if(st)el.setAttribute('style',st);
      else el.removeAttribute('style');
    });
    // Also strip font color attributes (legacy)
    tmp.querySelectorAll('[color]').forEach(el=>el.removeAttribute('color'));
    return tmp.innerHTML;
  }

  slides.forEach(s=>{
    s.bg='custom';s.bgc=t.bg;
    s.els.forEach(el=>{
      if(el.type==='text'){
        const isHeading=el.textRole==='heading';
        const newColor=isHeading?(t.headingColor||t.tc):(t.bodyColor||t.tc);
        // Ensure cs exists
        if(!el.cs)el.cs='font-size:36px;';
        // Replace or add color in cs
        if(/color\s*:/.test(el.cs)){
          el.cs=el.cs.replace(/\bcolor\s*:\s*[^;]+;?/g,'color:'+newColor+';');
        } else {
          el.cs=(el.cs.endsWith(';')?el.cs:el.cs+';')+'color:'+newColor+';';
        }
        // Strip ALL inline colors from html content via DOM (not just regex)
        el.html=stripInlineColors(el.html||'');
        // Bold: headings stay bold, body text gets weight:400
        if(isHeading){
          el.cs=el.cs.replace(/\bfont-weight\s*:[^;]+;?/g,'');
          el.cs=(el.cs.endsWith(';')?el.cs:el.cs+';')+'font-weight:700;';
        } else {
          // Remove any bold from body text
          el.cs=el.cs.replace(/\bfont-weight\s*:[^;]+;?/g,'');
          el.cs=(el.cs.endsWith(';')?el.cs:el.cs+';')+'font-weight:400;';
        }
        // Uppercase for headings
        if(isHeading){
          el.cs=el.cs.replace(/\btext-transform\s*:[^;]+;?/g,'');
          el.cs=(el.cs.endsWith(';')?el.cs:el.cs+';')+'text-transform:uppercase;';
        } else {
          el.cs=el.cs.replace(/\btext-transform\s*:[^;]+;?/g,'');
        }
        // Theme accent bg — remove (keep text clean, no bg tint)
        delete el.textBg;delete el.textBgOp;
      }
      if(el.type==='shape'){
        if(t.shapeFill)el.fill=t.shapeFill;
        if(t.shapeStroke)el.stroke=t.shapeStroke;
      }
    });
  });
  // Render all slides from updated data (do NOT call save() again)
  renderAll();
  // Force-sync textBg to DOM dataset for current slide
  slides[cur].els.forEach(d=>{
    if(d.type!=='text')return;
    const domEl=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
    if(!domEl)return;
    if(d.textBg){
      domEl.dataset.textBg=d.textBg;
      domEl.dataset.textBgOp=d.textBgOp!=null?d.textBgOp:0.12;
      applyTextBg(domEl);
    } else {
      delete domEl.dataset.textBg;
      delete domEl.dataset.textBgOp;
      const ec2=domEl.querySelector('.ec');if(ec2)ec2.style.background='';
    }
  });
  // Refresh decor elements with new accent colors
  invalidateThumbCache();
  refreshDecorColors(t.ac1||'#6366f1', t.ac2||'#818cf8');
  appliedThemeIdx=selTheme;
  refreshAllCodeBlocks();
  saveState();closeThemeModal();
  toast('Theme "'+t.name+'" applied','ok');
}

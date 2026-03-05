// ══════════════ THEMES ══════════════
function openThemeModal(){selTheme=-1;buildThemeGrid();document.getElementById('theme-modal').classList.add('open');}
function closeThemeModal(){document.getElementById('theme-modal').classList.remove('open');}
function applyTheme(){
  if(selTheme<0)return toast(t('toastSelectTheme'));
  const theme=THEMES[selTheme];pushUndo();
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
    s.bg='custom';s.bgc=theme.bg;
    s.els.forEach(el=>{
      if(el.type==='text'){
        const isHeading=el.textRole==='heading';
        const newColor=isHeading?(theme.headingColor||theme.tc):(theme.bodyColor||theme.tc);
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
        if(theme.shapeFill)el.fill=theme.shapeFill;
        if(theme.shapeStroke)el.stroke=theme.shapeStroke;
        // Update shadow color to accent if shadow is enabled
        if(el.shadow) el.shadowColor=theme.ac1||theme.shapeFill||el.shadowColor||'#000000';
      }
      if(el.type==='table'){
        const tc=theme.ac1||'#3b82f6';
        const tc2=theme.ac2||'#1d4ed8';
        const textC=theme.bodyColor||'#ffffff';
        el.headerBg=tc;
        el.cellBg=tc2+'20';
        el.altBg=tc+'12';
        el.borderColor=tc+'80';
        el.textColor=textC;
      }
      if(el.type==='icon'){
        const newColor=theme.shapeFill||theme.tc||'#3b82f6';
        el.iconColor=newColor;
        // Update shadow color to accent if shadow is enabled
        if(el.shadow) el.shadowColor=theme.ac1||newColor;
        const ic=ICONS.find(function(x){return x.id===el.iconId;});
        if(ic)el.svgContent=_buildIconSVG(ic,newColor,el.iconSw!=null?el.iconSw:1.8,el.iconStyle||'stroke',el.shadow,el.shadowBlur,el.shadowColor);
      }
    });
  });
  // Set theme index FIRST so all refresh functions use correct colors
  appliedThemeIdx=selTheme;
  // Refresh decor SVGs with new accent colors (updates d.svgContent in data)
  refreshDecorColors(theme.ac1||'#6366f1', theme.ac2||'#818cf8', true);
  // Refresh applets with new theme colors
  if(typeof refreshAppletThemes==='function')refreshAppletThemes();
  if(typeof refreshAllCodeBlocks==='function')refreshAllCodeBlocks();
  // Now render all slides from fully updated data
  renderAll();
  // Force-update decor SVG elements in DOM (in case load() used cached content)
  document.getElementById('canvas').querySelectorAll('.el').forEach(el=>{
    const id=el.dataset.id;
    const d=slides[cur].els.find(x=>x.id===id);
    if(!d||!d._isDecor)return;
    const ec=el.querySelector('.ec');
    if(ec){ec.innerHTML=d.svgContent||'';}
  });
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
  invalidateThumbCache();
  saveState();closeThemeModal();
  drawThumbs();
  toast(t('toastThemeApplied')+': '+theme.name,'ok');
}

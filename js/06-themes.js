
// Resolve a scheme-pinned color in the given theme.
// Returns null if no schemeRef (custom color — keep as-is).
function _resolveSchemeColor(schemeRef, theme) {
  if (!schemeRef) return null;
  const base8 = _themeColors(theme);
  const isLastCol = schemeRef.col === base8.length - 1;
  const isLightTheme = !theme.dark;
  const tintLevels = [0, 0.22, 0.44, 0.66, 0.88];
  const tint = tintLevels[schemeRef.row] || 0;
  if (isLastCol) {
    // Dark theme: row 0=white → row 4=black
    // Light theme: row 0=black → row 4=white
    if (isLightTheme) {
      const isLastRow = schemeRef.row === tintLevels.length - 1;
      return isLastRow ? '#ffffff' : (tint === 0 ? '#000000' : _blendToWhite('#000000', tint));
    } else {
      return tint === 0 ? '#ffffff' : _blendToBlack('#ffffff', tint);
    }
  }
  const hex = _solidColor(base8[schemeRef.col] || '#888888');
  return tint === 0 ? hex : _blendToWhite(hex, tint);
}
// ══════════════ THEMES ══════════════
function openThemeModal(){selTheme=-1;buildThemeGrid();document.getElementById('theme-modal').classList.add('open');}
function closeThemeModal(){document.getElementById('theme-modal').classList.remove('open');}
function applyTheme(){
  if(selTheme===-2){
    appliedThemeIdx=-1;
    save();drawThumbs();saveState();
    return;
  }
  if(selTheme<0)return toast(t('toastSelectTheme'));
  const theme=THEMES[selTheme];pushUndo();
  // Commit any active text editor BEFORE modifying data.
  // Must call _toSaveMode first (converts edit-mode groupedHtml → data-ch format),
  // then _rtCommit (writes innerHTML to d.html), then clear refs so the blur
  // triggered by load() removing DOM elements doesn't overwrite d.html again.
  if(typeof _rtEl!=='undefined'&&_rtEl){
    if(typeof _toSaveMode==='function') _toSaveMode(_rtEl);
    if(typeof _rtCommit==='function') _rtCommit();
    _rtEl.contentEditable='false';
    _rtEl=null;_rtElId=null;_savedSelIdx=null;
  }
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

  slides.forEach((s,si)=>{
    if(s.bgScheme !== null && s.bgScheme !== undefined){
      const resolved = _resolveSchemeColor(s.bgScheme, theme);
      s.bg='custom'; s.bgc = resolved || theme.bg;
    } else if(s.bgScheme === null){
      // Custom bg — leave unchanged
    } else {
      s.bg='custom'; s.bgc=theme.bg;
    }
    s.els.forEach(el=>{
      if(el.type==='text'){
        const isHeading=el.textRole==='heading';
        // If color was pinned to a scheme swatch, remap to same position in new theme.
        // If custom color (textColorScheme===null/undefined), skip color change.
        // col=7 = #000000. dark→row 4 (#e0e0e0 light), light→row 1 (#383838 dark)
        const _defScheme = {col:7, row:0}; // row 0: dark theme=#ffffff, light theme=#000000
        const _defColor = _resolveSchemeColor(_defScheme, theme);

        let newColor;
        if(el.textColorScheme !== null && el.textColorScheme !== undefined){
          // Scheme-pinned: remap to same position in new theme
          newColor = _resolveSchemeColor(el.textColorScheme, theme) || _defColor;
        } else if(el.textColorScheme === undefined){
          // Legacy/default: assign scheme-based default and pin it going forward
          el.textColorScheme = _defScheme;
          newColor = _defColor;
        } else {
          newColor = null; // custom (null) — skip
        }
        // Ensure cs exists
        if(!el.cs)el.cs='font-size:36px;';

        // Update per-char colors: remap scheme-pinned, leave custom, leave uncolored
        if(typeof _toCharObjs==='function' && el.html){
          const chars=_toCharObjs(el.html);
          let changed=false;
          chars.forEach(ch=>{
            if(ch._listMarker && ch._listMarker.type==='bullet'){
              // If marker has a schemeRef, remap it
              if(ch._listMarker.iconSchemeRef){
                const resolved=_resolveSchemeColor(ch._listMarker.iconSchemeRef, theme);
                if(resolved){ ch._listMarker.iconColor=resolved; changed=true; }
              }
              // currentColor markers stay as-is (inherit from .cs)
            }
            if(ch.style._schemeRef){
              // Scheme-pinned: remap to same position in new theme
              const resolved=_resolveSchemeColor(ch.style._schemeRef, theme);
              if(resolved){ ch.style.color=resolved; changed=true; }
            }
            // No color → inherits from .cs (correct)
            // Custom color (no _schemeRef) → leave as-is
          });
          if(changed) el.html=_charObjsToHtml(chars);
        }
        // Update .cs so chars without explicit color inherit the new default
        if(newColor){
          if(/color\s*:/.test(el.cs)){
            el.cs=el.cs.replace(/\bcolor\s*:\s*[^;]+;?/g,'color:'+newColor+';');
          } else {
            el.cs=(el.cs.endsWith(';')?el.cs:el.cs+';')+'color:'+newColor+';';
          }
        }
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
        // textBg: remap if scheme-pinned, keep if custom (null), remove if legacy
        if(el.textBgScheme !== null && el.textBgScheme !== undefined){
          const resolved = _resolveSchemeColor(el.textBgScheme, theme);
          if(resolved){ el.textBg = resolved; }
          else { delete el.textBg; delete el.textBgOp; }
        } else if(el.textBgScheme === undefined){
          // Legacy — remove bg (old behaviour)
          delete el.textBg; delete el.textBgOp;
        }
        // textBgScheme===null: custom color — leave textBg unchanged

        // Border color: remap if scheme-pinned, keep if custom
        if(el.borderScheme !== null && el.borderScheme !== undefined){
          const resolved = _resolveSchemeColor(el.borderScheme, theme);
          if(resolved) el.textBorderColor = resolved;
        }
        // borderScheme===null: custom — leave unchanged
      }
      if(el.type==='shape'){
        // Remap fill
        if(el.fillScheme !== null && el.fillScheme !== undefined){
          // Pinned to scheme swatch — remap to same position in new theme
          const resolved = _resolveSchemeColor(el.fillScheme, theme);
          if(resolved) { el.fill = resolved; }
        } else if(el.fillScheme === undefined){
          // Legacy element — apply theme default fill
          if(theme.shapeFill) el.fill = theme.shapeFill;
        }
        // else fillScheme===null: custom color — leave el.fill unchanged
        // Ensure fill is never empty
        if(!el.fill) el.fill = theme.shapeFill || '#3b82f6';
        // Remap stroke
        if(el.strokeScheme !== null && el.strokeScheme !== undefined){
          const resolved = _resolveSchemeColor(el.strokeScheme, theme);
          if(resolved) { el.stroke = resolved; }
        } else if(el.strokeScheme === undefined){
          if(theme.shapeStroke) el.stroke = theme.shapeStroke;
        }
        // else strokeScheme===null: custom — leave unchanged
        if(!el.stroke) el.stroke = theme.shapeStroke || '#1d4ed8';
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
        if(!el.iconColorCustom){
          const newColor=theme.shapeFill||theme.tc||'#3b82f6';
          el.iconColor=newColor;
          // Update shadow color to accent if shadow is enabled
          if(el.shadow) el.shadowColor=theme.ac1||newColor;
          const ic=ICONS.find(function(x){return x.id===el.iconId;});
          if(ic){
            const _newSvg=_buildIconSVG(ic,newColor,el.iconSw!=null?el.iconSw:1.8,el.iconStyle||'stroke',el.shadow,el.shadowBlur,el.shadowColor);
            // Re-fit viewBox after color change to preserve tight bounds
            try{
              const _pm=[..._newSvg.matchAll(/d="([^"]+)"/g)].map(m=>m[1]);
              if(_pm.length>0){
                const _wr=document.createElement('div');_wr.style.cssText='position:fixed;left:-9999px;top:-9999px;width:200px;height:200px;';
                const _ts=document.createElementNS('http://www.w3.org/2000/svg','svg');_ts.setAttribute('viewBox','0 0 24 24');_ts.style.cssText='width:200px;height:200px;';
                const _g=document.createElementNS('http://www.w3.org/2000/svg','g');
                _pm.forEach(pd=>{const _p=document.createElementNS('http://www.w3.org/2000/svg','path');_p.setAttribute('d',pd);_g.appendChild(_p);});
                _ts.appendChild(_g);_wr.appendChild(_ts);document.body.appendChild(_wr);
                const bb=_g.getBBox();document.body.removeChild(_wr);
                if(bb&&bb.width>0&&bb.height>0){
                  const sw2=(parseFloat(el.iconSw)||1.8)/2;
                  const vx=bb.x-sw2,vy=bb.y-sw2,vw=bb.width+sw2*2,vh=bb.height+sw2*2;
                  el.svgContent=_newSvg.replace(/viewBox="[^"]*"/,'viewBox="'+vx+' '+vy+' '+vw+' '+vh+'"');
                  el.iconFitted=true;
                } else { el.svgContent=_newSvg; el.iconFitted=false; }
              } else { el.svgContent=_newSvg; el.iconFitted=false; }
            }catch(_e){ el.svgContent=_newSvg; el.iconFitted=false; }
          }
        }
      }
      if(el.type==='markdown'){
        const ref = el.mdColorScheme !== undefined ? el.mdColorScheme : {col:7,row:0};
        if(ref){
          const resolved = _resolveSchemeColor(ref, theme);
          if(resolved) el.mdColor = resolved;
        }
      }
      if(el.type==='formula'){
        const _defScheme = {col:7, row:0}; // col:7=neutral, row:0 → white on dark, black on light
        const _defColor  = _resolveSchemeColor(_defScheme, theme);
        let newFc;
        if(el.formulaColorScheme !== null && el.formulaColorScheme !== undefined){
          newFc = _resolveSchemeColor(el.formulaColorScheme, theme) || _defColor;
        } else if(el.formulaColorScheme === undefined){
          el.formulaColorScheme = _defScheme;
          newFc = _defColor;
        } else {
          newFc = null; // custom — skip
        }
        if(newFc){ el.formulaColor = newFc; }
      }
      if(el.type==='applet' && el.appletId==='generator'){
        // Remap scheme-pinned colors; leave custom (null) unchanged
        if(el.genColorScheme){
          const r=_resolveSchemeColor(el.genColorScheme,theme);
          if(r) el.genColor=r;
        }
        if(el.genBgScheme){
          const r=_resolveSchemeColor(el.genBgScheme,theme);
          if(r) el.genBg=r;
        }
        if(el.genBorderScheme){
          const r=_resolveSchemeColor(el.genBorderScheme,theme);
          if(r) el.genBorderColor=r;
        }
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
  if(typeof refreshAllGraphs==='function')refreshAllGraphs(theme);
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
      applyTextBg(domEl);
    }
  });
  // Force-sync formula colors in DOM
  slides[cur].els.forEach(d=>{
    if(d.type!=='formula')return;
    const domEl=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
    if(!domEl)return;
    domEl.dataset.formulaColor=d.formulaColor;
    const ec=domEl.querySelector('.ec');
    if(ec) ec.style.color=d.formulaColor;
  });
  invalidateThumbCache();
  saveState();
  drawThumbs();
  toast(t('toastThemeApplied')+': '+theme.name,'ok');
}

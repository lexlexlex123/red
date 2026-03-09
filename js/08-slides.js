// ══════════════ SLIDES ══════════════
function addSlide(tmpl){
  pushUndo();
  // Inherit background from current slide if no template given
  const curSlide=slides[cur];
  const inheritBg=curSlide?curSlide.bg:'b1';
  const inheritBgc=curSlide?curSlide.bgc:null;
  const s={title:'Slide '+(slides.length+1),bg:inheritBg,bgc:inheritBgc,ar,trans:'',auto:0,els:[]};
  if(tmpl){const t=JSON.parse(JSON.stringify(tmpl));s.bg=t.bg;s.bgc=t.bgc;s.els=t.els;s.trans=t.trans||'';}
  slides.push(s);
  // Apply active layout decor to the new slide (content style, not title)
  if(typeof makeDecorEl==='function'&&typeof selLayout!=='undefined'&&selLayout>=0){
    const d=makeDecorEl(slides.length-1);
    if(d)s.els.unshift(d);
  }
  cur=slides.length-1;renderAll();saveState();
}
function dupSlide(){if(slides.length)addSlide(slides[cur]);}
function delSlide(){
  if(slides.length<=1)return toast(t('toastNeedSlide'));
  pushUndo();slides.splice(cur,1);cur=Math.min(cur,slides.length-1);renderAll();saveState();
  if(typeof renderAnimPanel==='function')renderAnimPanel();
  if(typeof renderMotionOverlay==='function')renderMotionOverlay();
}
function pickSlide(i){if(typeof tblClearSel==='function')tblClearSel();save();cur=i;load();drawThumbs();}
function save(){
  if(!slides[cur])return;
  const canvas=document.getElementById('canvas');
  // Build lookup of existing decor flags before overwriting
  const decorMeta={};
  const oldEls=slides[cur].els||[]; // snapshot BEFORE overwriting
  oldEls.forEach(d=>{if(d._isDecor)decorMeta[d.id]={_isDecor:true,_decorStyle:d._decorStyle,_layoutIdx:d._layoutIdx};});
  const oldElsById={}; oldEls.forEach(d=>oldElsById[d.id]=d);
  // Snapshot table data keyed by id so the table branch below always finds fresh data
  const tableSnap={}; oldEls.forEach(d=>{if(d.type==='table')tableSnap[d.id]=d;});
  slides[cur].els=Array.from(canvas.querySelectorAll('.el')).map(el=>{
    const d={id:el.dataset.id,type:el.dataset.type,
      x:parseInt(el.style.left),y:parseInt(el.style.top),
      w:parseInt(el.style.width),h:parseInt(el.style.height),
      rot:el.dataset.rot?+el.dataset.rot:0,
      anims:el.dataset.anims?JSON.parse(el.dataset.anims):[],
      isTrigger:el.dataset.isTrigger==='true',
    };
    if(el.dataset.link)d.link=el.dataset.link;if(el.dataset.linkt)d.linkt=el.dataset.linkt;
    if(d.type==='text'){const c=el.querySelector('.ec');
      // Strip valign wrapper — it's a DOM-only helper, not part of saved content
      const vw=c.querySelector('.ec-valign-wrap');
      d.html=vw?vw.innerHTML:c.innerHTML;
      // Strip layout/background props from cs (stored separately or computed dynamically)
      let cs=c.getAttribute('style')||'';
      cs=cs.replace(/\bbackground\s*:[^;]+;?/gi,'')
           .replace(/\bdisplay\s*:[^;]+;?/gi,'')
           .replace(/\bflex-direction\s*:[^;]+;?/gi,'')
           .replace(/\bjustify-content\s*:[^;]+;?/gi,'')
           .replace(/\bpadding-top\s*:[^;]+;?/gi,'')
           .replace(/\s{2,}/g,' ').trim();
      d.cs=cs;
      // Preserve scheme refs — not stored in DOM, only in data object
      const _od=oldElsById[d.id];
      if(_od){
        if(_od.textColorScheme!==undefined)d.textColorScheme=_od.textColorScheme;
        if(_od.textBgScheme!==undefined)d.textBgScheme=_od.textBgScheme;
        if(_od.borderScheme!==undefined)d.borderScheme=_od.borderScheme;
      }
      if(el.dataset.valign)d.valign=el.dataset.valign;
      if(el.dataset.textBg)d.textBg=el.dataset.textBg;
      // Always save textBgOp when textBg is set so opacity is preserved on re-render
      if(el.dataset.textBg){d.textBgOp=el.dataset.textBgOp!==undefined?+el.dataset.textBgOp:1;}
      else if(el.dataset.textBgOp!=null){d.textBgOp=+el.dataset.textBgOp;}
      if(el.dataset.textBgBlur>0)d.textBgBlur=+el.dataset.textBgBlur;
      // Table bg opacity/blur — stored in dataset.tableData via _tblSaveToDataset
      if(d.type==='table'&&_od){
        if(_od.tableBgOp!=null)d.tableBgOp=_od.tableBgOp;
        if(_od.tableBgBlur!=null)d.tableBgBlur=_od.tableBgBlur;
      }
      if(el.dataset.textRole)d.textRole=el.dataset.textRole;
      if(el.dataset.textBorderW&&+el.dataset.textBorderW>0){d.textBorderW=+el.dataset.textBorderW;d.textBorderColor=el.dataset.textBorderColor||'#ffffff';}
      if(el.dataset.rx_tl||el.dataset.rx_tr||el.dataset.rx_bl||el.dataset.rx_br){
        d.rx_tl=+(el.dataset.rx_tl||0);d.rx_tr=+(el.dataset.rx_tr||0);
        d.rx_bl=+(el.dataset.rx_bl||0);d.rx_br=+(el.dataset.rx_br||0);
        d.rxUnit=el.dataset.rxUnit||'px';
      }
    }
    if(d.type==='table'){
      // Primary: read from DOM dataset (written by renderTableEl every time table is drawn)
      // Fallback: use tableSnap from slides[cur].els
      let tdata=null;
      if(el.dataset.tableData){try{tdata=JSON.parse(el.dataset.tableData);}catch(e){}}
      const tsrc=tdata||tableSnap[d.id];
      if(tsrc){Object.keys(tsrc).forEach(k=>{ d[k]=tsrc[k]; });}
    }
    if(el.dataset.hoverFx)d.hoverFx=JSON.parse(el.dataset.hoverFx);
    if(el.dataset.elOpacity!=null&&+el.dataset.elOpacity!==1)d.elOpacity=+el.dataset.elOpacity;
    if(el.dataset.objHidden==='1')d.objHidden=true;else delete d.objHidden;
    if(d.type==='image'){
      const dd=oldElsById[d.id];
      d.src=el.querySelector('img').src;
      d.imgFit=el.dataset.imgFit||(dd&&dd.imgFit)||'contain';
      d.imgRx=el.dataset.imgRx!=null?+el.dataset.imgRx:(dd&&dd.imgRx)||0;
      d.imgBw=el.dataset.imgBw!=null?+el.dataset.imgBw:(dd&&dd.imgBw)||0;
      d.imgBc=el.dataset.imgBc||(dd&&dd.imgBc)||'#ffffff';
      d.imgShadow=el.dataset.imgShadow==='true'||(dd&&dd.imgShadow)||false;
      d.imgShadowBlur=el.dataset.imgShadowBlur!=null?+el.dataset.imgShadowBlur:(dd&&dd.imgShadowBlur)||15;
      d.imgShadowColor=el.dataset.imgShadowColor||(dd&&dd.imgShadowColor)||'#000000';
      d.imgOpacity=el.dataset.imgOpacity!=null?+el.dataset.imgOpacity:(dd&&dd.imgOpacity!=null?dd.imgOpacity:1);
      d.imgPosX=el.dataset.imgPosX||(dd&&dd.imgPosX)||'center';
      d.imgPosY=el.dataset.imgPosY||(dd&&dd.imgPosY)||'center';
      // crop: read from dataset (written on exit crop mode), fallback to live d value
      d.imgCropL = el.dataset.imgCropL != null ? +el.dataset.imgCropL : (d.imgCropL || 0);
      d.imgCropT = el.dataset.imgCropT != null ? +el.dataset.imgCropT : (d.imgCropT || 0);
      d.imgCropR = el.dataset.imgCropR != null ? +el.dataset.imgCropR : (d.imgCropR || 0);
      d.imgCropB = el.dataset.imgCropB != null ? +el.dataset.imgCropB : (d.imgCropB || 0);
      // preserve full-image coords so re-entering crop mode works correctly
      if(dd&&dd._cropFullW)d._cropFullW=dd._cropFullW;
      if(dd&&dd._cropFullH)d._cropFullH=dd._cropFullH;
      if(dd&&dd._cropFullX!=null)d._cropFullX=dd._cropFullX;
      if(dd&&dd._cropFullY!=null)d._cropFullY=dd._cropFullY;
    }
    else if(d.type==='shape'){
      d.shape=el.dataset.shape;d.fill=el.dataset.fill||'#3b82f6';d.stroke=el.dataset.stroke||'#1d4ed8';
      // Preserve scheme refs
      const _ods=oldElsById[d.id];
      if(_ods){
        if(_ods.fillScheme!==undefined)d.fillScheme=_ods.fillScheme;
        if(_ods.strokeScheme!==undefined)d.strokeScheme=_ods.strokeScheme;
      }
      d.sw=el.dataset.sw!=null?+el.dataset.sw:2;d.rx=+(el.dataset.rx||0);d.fillOp=el.dataset.fillOp!=null?+el.dataset.fillOp:1;
      d.shadow=el.dataset.shadow==='true';d.shadowBlur=+(el.dataset.shadowBlur||8);d.shadowColor=el.dataset.shadowColor||'#000000';
      if(el.dataset.shapeBlur>0) d.shapeBlur=+el.dataset.shapeBlur;
      else if(_ods&&_ods.shapeBlur>0) d.shapeBlur=_ods.shapeBlur;
      const st=el.querySelector('.shape-text');d.shapeHtml=st?st.innerHTML:'';
      d.shapeTextCss=st?st.getAttribute('style')||'':'';
    }
    else if(d.type==='svg')d.svgContent=el.querySelector('.ec').innerHTML;
    else if(d.type==='code'){const dd=oldElsById[d.id];if(dd){d.codeLang=dd.codeLang;d.codeTheme=dd.codeTheme;d.codeRaw=dd.codeRaw;d.codeHtml=dd.codeHtml;d.codeFs=dd.codeFs;d.codeBg=dd.codeBg;}}
    else if(d.type==='markdown'){const dd=oldElsById[d.id];if(dd){d.mdRaw=dd.mdRaw;d.mdHtml=dd.mdHtml;d.mdFs=dd.mdFs;d.mdColor=dd.mdColor||'#ffffff';d.mdColorScheme=dd.mdColorScheme!==undefined?dd.mdColorScheme:{col:7,row:0};}
      if(el.dataset.textBg)d.textBg=el.dataset.textBg;
      if(el.dataset.textBg){d.textBgOp=el.dataset.textBgOp!==undefined?+el.dataset.textBgOp:1;}
      else if(el.dataset.textBgOp!=null){d.textBgOp=+el.dataset.textBgOp;}
      if(el.dataset.textBgBlur>0)d.textBgBlur=+el.dataset.textBgBlur;
      if(el.dataset.textBorderW&&+el.dataset.textBorderW>0){d.textBorderW=+el.dataset.textBorderW;d.textBorderColor=el.dataset.textBorderColor||'#ffffff';}
      if(el.dataset.rx_tl||el.dataset.rx_tr||el.dataset.rx_bl||el.dataset.rx_br){d.rx_tl=+(el.dataset.rx_tl||0);d.rx_tr=+(el.dataset.rx_tr||0);d.rx_bl=+(el.dataset.rx_bl||0);d.rx_br=+(el.dataset.rx_br||0);}
      const _odmd=oldElsById[d.id];if(_odmd){if(_odmd.textBgScheme!==undefined)d.textBgScheme=_odmd.textBgScheme;if(_odmd.borderScheme!==undefined)d.borderScheme=_odmd.borderScheme;}
    }
    else if(d.type==='icon'){
      d.iconId=el.dataset.iconId||'';
      d.iconColor=el.dataset.iconColor||'#3b82f6';
      d.iconSw=el.dataset.iconSw!=null?+el.dataset.iconSw:1.8;
      d.iconStyle=el.dataset.iconStyle||'stroke';
      d.shadow=el.dataset.shadow==='true'||el.dataset.shadow===true;
      d.shadowBlur=+(el.dataset.shadowBlur||8);
      d.shadowColor=el.dataset.shadowColor||'#000000';
      // Rebuild svgContent so it's always up to date
      const _ic=typeof ICONS!=='undefined'?ICONS.find(function(x){return x.id===d.iconId;}):null;
      if(_ic&&typeof _buildIconSVG==='function'){
        d.svgContent=_buildIconSVG(_ic,d.iconColor,d.iconSw,d.iconStyle,d.shadow,d.shadowBlur,d.shadowColor);
      }else{
        d.svgContent=el.querySelector('.ec').innerHTML;
      }
    }
    else if(d.type==='applet'){
      d.appletId=el.dataset.appletId;
      d.appletHtml=el.dataset.appletHtml||'';
      if(el.dataset.appletAspect)d._appletAspect=+el.dataset.appletAspect;
      // Read generator fields from dataset (kept in sync by refreshGeneratorEl)
      const _gk=['tmMin','tmSec','tmOnEnd','tmOnEndSlide','genMin','genMax','genStep','genFontSize','genColor','genBg','genBgBlur','genBgOp',
        'genBorderColor','genBorderWidth','genBold','genAlign','genVAlign',
        'genShadowOn','genShadowBlur','genShadowColor',
        'genColorScheme','genBgScheme','genBorderScheme'];
      _gk.forEach(k=>{
        if(el.dataset[k]!==undefined){
          const v=el.dataset[k];
          // convert numerics and booleans
          if(k==='genBold') d[k]=(v==='true');
          else if(k==='genShadowOn') d[k]=(v==='true');
          else if(['tmMin','tmSec','tmOnEndSlide','genMin','genMax','genStep','genFontSize','genBgBlur','genBgOp','genBorderWidth','genShadowBlur'].includes(k)) d[k]=+v;
          else if(['genColorScheme','genBgScheme','genBorderScheme'].includes(k)){
            try{d[k]=JSON.parse(v);}catch(e){d[k]=null;}
          }
          else d[k]=v;
        }
      });
      if(el.dataset.genRx!==undefined) d.rx=+el.dataset.genRx;
    }
    else if(d.type==='pagenum'){
      // page number element — data stored in slide data, no DOM reading needed
      const dd=oldElsById[d.id];
      if(dd){d.html=dd.html;d.pnStyle=dd.pnStyle;d.pnPos=dd.pnPos;d.pnColor=dd.pnColor;d.pnTextColor=dd.pnTextColor;d.pnFontSize=dd.pnFontSize;d.pnShowTotal=dd.pnShowTotal;}
    }
    // Restore decor flags
    if(decorMeta[d.id])Object.assign(d,decorMeta[d.id]);
    return d;
  });
}
function load(){
  clearMultiSel();sel=null;clearGuides();
  const canvas=document.getElementById('canvas');canvas.querySelectorAll('.el').forEach(e=>e.remove());
  const s=slides[cur];loadBg(s);s.els.forEach(mkEl);
  document.getElementById('p-st').value=s.title;
  // Highlight active transition button in slide props
  const _st=s.trans||'';
  document.querySelectorAll('#slide-trans-grid .tbtn2[data-st]').forEach(b=>
    b.classList.toggle('active', b.dataset.st===_st)
  );
  document.getElementById('p-auto').value=s.auto||0;
  const navChk=document.getElementById('slide-click-nav');
  if(navChk)navChk.checked=s.clickNav!==false; // default true
  // Highlight active global transition button
  const activeTrans=globalTrans||'none';
  document.querySelectorAll('.tbtn2[data-t]').forEach(b=>b.classList.toggle('active',b.dataset.t===activeTrans));
  syncProps();
  if(document.getElementById('props-anim-wrap')?.style.display==='flex'){renderAnimPanel();if(typeof renderMotionOverlay==='function')renderMotionOverlay();}
  const _objSec=document.getElementById('objects-panel-section');
  if(_objSec&&_objSec.style.display!=='none'&&typeof renderObjectsPanel==='function')renderObjectsPanel();
}
function onTitleInput(v){slides[cur].title=v;drawThumbs();saveState();}

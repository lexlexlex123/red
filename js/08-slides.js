// ══════════════ SLIDES ══════════════
function addSlide(tmpl){
  pushUndo();
  // Inherit background from current slide if no template given
  const curSlide=slides[cur];
  const inheritBg=curSlide?curSlide.bg:'b1';
  const inheritBgc=curSlide?curSlide.bgc:null;
  const s={title:'Slide '+(slides.length+1),bg:inheritBg,bgc:inheritBgc,ar,trans:'',auto:0,els:[]};
  if(tmpl){const t=JSON.parse(JSON.stringify(tmpl));s.bg=t.bg;s.bgc=t.bgc;s.els=t.els;s.trans=t.trans||'';}
  slides.push(s);cur=slides.length-1;renderAll();saveState();
}
function dupSlide(){if(slides.length)addSlide(slides[cur]);}
function delSlide(){
  if(slides.length<=1)return toast('Need at least one slide');
  pushUndo();slides.splice(cur,1);cur=Math.min(cur,slides.length-1);renderAll();saveState();
}
function pickSlide(i){save();cur=i;load();drawThumbs();}
function save(){
  if(!slides[cur])return;
  const canvas=document.getElementById('canvas');
  // Build lookup of existing decor flags before overwriting
  const decorMeta={};
  const oldEls=slides[cur].els||[]; // snapshot BEFORE overwriting
  oldEls.forEach(d=>{if(d._isDecor)decorMeta[d.id]={_isDecor:true,_decorStyle:d._decorStyle};});
  const oldElsById={}; oldEls.forEach(d=>oldElsById[d.id]=d);
  slides[cur].els=Array.from(canvas.querySelectorAll('.el')).map(el=>{
    const d={id:el.dataset.id,type:el.dataset.type,
      x:parseInt(el.style.left),y:parseInt(el.style.top),
      w:parseInt(el.style.width),h:parseInt(el.style.height),
      rot:el.dataset.rot?+el.dataset.rot:0,
      anims:el.dataset.anims?JSON.parse(el.dataset.anims):[],
      isTrigger:el.dataset.isTrigger==='true',
    };
    if(el.dataset.link)d.link=el.dataset.link;if(el.dataset.linkt)d.linkt=el.dataset.linkt;
    if(d.type==='text'){const c=el.querySelector('.ec');d.html=c.innerHTML;
      // Strip background from cs - it's stored separately in textBg/textBgOp
      let cs=c.getAttribute('style')||'';
      cs=cs.replace(/\bbackground\s*:[^;]+;?/gi,'').replace(/\s{2,}/g,' ').trim();
      d.cs=cs;
      if(el.dataset.valign)d.valign=el.dataset.valign;
      if(el.dataset.textBg)d.textBg=el.dataset.textBg;
      // Always save textBgOp when textBg is set so opacity is preserved on re-render
      if(el.dataset.textBg){d.textBgOp=el.dataset.textBgOp!==undefined?+el.dataset.textBgOp:1;}
      else if(el.dataset.textBgOp!=null){d.textBgOp=+el.dataset.textBgOp;}
      if(el.dataset.textRole)d.textRole=el.dataset.textRole;
      if(el.dataset.textBorderW&&+el.dataset.textBorderW>0){d.textBorderW=+el.dataset.textBorderW;d.textBorderColor=el.dataset.textBorderColor||'#ffffff';}
      if(el.dataset.rx_tl||el.dataset.rx_tr||el.dataset.rx_bl||el.dataset.rx_br){
        d.rx_tl=+(el.dataset.rx_tl||0);d.rx_tr=+(el.dataset.rx_tr||0);
        d.rx_bl=+(el.dataset.rx_bl||0);d.rx_br=+(el.dataset.rx_br||0);
        d.rxUnit=el.dataset.rxUnit||'px';
      }
    }
    if(el.dataset.hoverFx)d.hoverFx=JSON.parse(el.dataset.hoverFx);
    if(el.dataset.elOpacity!=null&&+el.dataset.elOpacity!==1)d.elOpacity=+el.dataset.elOpacity;
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
    }
    else if(d.type==='shape'){
      d.shape=el.dataset.shape;d.fill=el.dataset.fill||'#3b82f6';d.stroke=el.dataset.stroke||'#1d4ed8';
      d.sw=el.dataset.sw!=null?+el.dataset.sw:2;d.rx=+(el.dataset.rx||0);d.fillOp=el.dataset.fillOp!=null?+el.dataset.fillOp:1;
      d.shadow=el.dataset.shadow==='true';d.shadowBlur=+(el.dataset.shadowBlur||8);d.shadowColor=el.dataset.shadowColor||'#000000';
      const st=el.querySelector('.shape-text');d.shapeHtml=st?st.innerHTML:'';
      d.shapeTextCss=st?st.getAttribute('style')||'':'';
    }
    else if(d.type==='svg')d.svgContent=el.querySelector('.ec').innerHTML;
    else if(d.type==='code'){const dd=oldElsById[d.id];if(dd){d.codeLang=dd.codeLang;d.codeTheme=dd.codeTheme;d.codeRaw=dd.codeRaw;d.codeHtml=dd.codeHtml;d.codeFs=dd.codeFs;d.codeBg=dd.codeBg;}}
    else if(d.type==='markdown'){const dd=oldElsById[d.id];if(dd){d.mdRaw=dd.mdRaw;d.mdHtml=dd.mdHtml;d.mdFs=dd.mdFs;}}
    else if(d.type==='applet'){d.appletId=el.dataset.appletId;d.appletHtml=el.dataset.appletHtml||'';}
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
  document.getElementById('p-auto').value=s.auto||0;
  const navChk=document.getElementById('slide-click-nav');
  if(navChk)navChk.checked=s.clickNav!==false;
  // Highlight active global transition button in ribbon
  const activeTrans=globalTrans||'none';
  document.querySelectorAll('.tbtn2[data-t]').forEach(b=>b.classList.toggle('active',b.dataset.t===activeTrans));
  // Update per-slide transition buttons in props panel
  if(typeof buildSlidePropTransBtns==='function') buildSlidePropTransBtns();
  syncProps();
  if(document.getElementById('anim-panel').classList.contains('open'))renderAnimPanel();
}
function onTitleInput(v){slides[cur].title=v;drawThumbs();saveState();}

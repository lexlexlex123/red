// ══════════════ PROPS ══════════════
function formatTiming(a){
  const dur = a.duration ? (a.duration/1000).toFixed(1)+'s' : '';
  const del = a.delay ? '+'+a.delay+'ms' : '';
  return [dur,del].filter(Boolean).join(' ') || '—';
}
function syncPos(){
  if(!sel)return;
  document.getElementById('p-x').value=parseInt(sel.style.left);document.getElementById('p-y').value=parseInt(sel.style.top);
  document.getElementById('p-w').value=parseInt(sel.style.width);document.getElementById('p-h').value=parseInt(sel.style.height);
}
function syncProps(){
  const ep=document.getElementById('elprops'),ns=document.getElementById('nosel');
  const tp=document.getElementById('tprops'),shp=document.getElementById('shprops'),ap=document.getElementById('animprops');
  const sp=document.getElementById('slide-props');
  const spn=document.getElementById('slide-props-pn');
  const hp=document.getElementById('hoverprops');
  const imp=document.getElementById('imgprops');
  const cdp=document.getElementById('codeprops');
  const mdp=document.getElementById('mdprops');
  const icp=document.getElementById('iconprops');
  const tblp=document.getElementById('tableprops');
  const genp=document.getElementById('genprops');
  const fmp=document.getElementById('formulaprops');
  if(!sel || multiSel.size > 1){
    ep.style.display='none';
    if(hp)hp.style.display='none';
    if(multiSel.size > 1 || (typeof _justClearedMulti!=='undefined' && _justClearedMulti)){
      ns.style.display='none';
      if(sp)sp.style.display='none';
      return;
    }
    ns.style.display='block';
    if(sp)sp.style.display='block';
    if(typeof _syncSlidePropsAnimRow==='function')_syncSlidePropsAnimRow();
    return;
  }
  if(sp)sp.style.display='none';
  ep.style.display='flex';ep.style.flexDirection='column';ns.style.display='none';
  if(hp)hp.style.display='flex';if(hp)hp.style.flexDirection='column';
  syncPos();
  document.getElementById('p-rot').value=sel.dataset.rot||0;
  document.getElementById('p-link').value=sel.dataset.link||'';document.getElementById('p-linkt').value=sel.dataset.linkt||'_blank';
  const t=sel.dataset.type;
  // Show/hide type panels
  tp.style.display=t==='text'?'flex':'none';tp.style.flexDirection='column';
  shp.style.display=t==='shape'?'flex':'none';shp.style.flexDirection='column';
  if(imp){imp.style.display=t==='image'?'flex':'none';imp.style.flexDirection='column';}
  if(cdp){cdp.style.display=t==='code'?'flex':'none';cdp.style.flexDirection='column';}
  const hfp=document.getElementById('hfprops');
  if(hfp){hfp.style.display=t==='htmlframe'?'flex':'none';
    if(t==='htmlframe'&&typeof _hfSyncCodeBtn==='function')_hfSyncCodeBtn();}
  if(mdp){mdp.style.display=t==='markdown'?'flex':'none';mdp.style.flexDirection='column';}
  if(fmp){fmp.style.display=t==='formula'?'flex':'none';fmp.style.flexDirection='column';if(t==='formula'&&typeof syncFormulaProps==='function')syncFormulaProps();}
  const gmp=document.getElementById('graphprops');
  if(gmp){gmp.style.display=t==='graph'?'block':'none';if(t==='graph'&&typeof syncGraphProps==='function')syncGraphProps();}
  if(tblp){tblp.style.display=t==='table'?'flex':'none';tblp.style.flexDirection='column';if(t==='table')syncTableProps();}
  const isGen   = t==='applet' && sel.dataset.appletId==='generator';
  const isTimer = t==='applet' && (sel.dataset.appletId==='timer'||sel.dataset.appletId==='clock');
  if(genp){genp.style.display=(isGen||isTimer)?'flex':'none';genp.style.flexDirection='column';if(isGen)syncGenProps();if(isTimer&&sel.dataset.appletId==='clock'&&typeof syncClockProps==='function')syncClockProps();else if(isTimer&&typeof syncTimerProps==='function')syncTimerProps();}
  if(icp){
    icp.style.display=t==='icon'?'flex':'none';icp.style.flexDirection='column';
    if(t==='icon'){
      const ic_col=sel.dataset.iconColor||'#3b82f6';
      const ic_sw=sel.dataset.iconSw||'1.8';
      const ic_st=sel.dataset.iconStyle||'stroke';
      const ic_sh=sel.dataset.shadow==='true';
      try{document.getElementById('ic-p-color-swatch').style.background=ic_col;}catch(e){}
      try{document.getElementById('ic-p-color-hex').value=ic_col;}catch(e){}
      try{document.getElementById('ic-p-sw').value=ic_sw;}catch(e){}
      const styleEl=document.getElementById('ic-p-style');
      if(styleEl)styleEl.value=ic_st;
      const shEl=document.getElementById('ic-p-shadow');
      if(shEl){shEl.checked=ic_sh;const opts=document.getElementById('ic-p-shadow-opts');if(opts)opts.style.display=ic_sh?'flex':'none';}
      const ic_sc=sel.dataset.shadowColor||'#000000';
      try{const scInner=document.getElementById('ic-p-sc-inner');if(scInner)scInner.style.background=ic_sc;}catch(e){}
      try{const icInner=document.getElementById('ic-p-color-inner');if(icInner)icInner.style.background=ic_col;}catch(e){}
      try{document.getElementById('ic-p-op').value=parseFloat(sel.dataset.elOpacity!=null?sel.dataset.elOpacity:1);}catch(e){}
    }
  }
  if(t==='text'){
    const cs=(sel.querySelector('.tel')||sel.querySelector('.ec')).getAttribute('style')||'';
    const m=(re,fb)=>{const x=cs.match(re);return x?x[1]:fb;};
    document.getElementById('p-fs').value=parseFloat(m(/font-size:([\d.]+)px/,'48'));
    // Check if all chars have same font size; if mixed, blank the field
    try {
      const _d = slides[cur] && slides[cur].els.find(e=>e.id===sel.dataset.id);
      if (_d && _d.html) {
        const _spans = document.createElement('div');
        _spans.innerHTML = _d.html;
        const _fsVals = [...new Set(Array.from(_spans.querySelectorAll('span[data-ch]')).map(s=>{
          const _m = (s.getAttribute('style')||'').match(/font-size:([\d.]+)px/);
          return _m ? Math.round(parseFloat(_m[1])) : null;
        }).filter(v=>v!==null))];
        const _inp = document.getElementById('p-fs');
        if (_fsVals.length > 1) { _inp.value = ''; _inp.placeholder = '—'; }
        else if (_fsVals.length === 1) { _inp.value = _fsVals[0]; _inp.placeholder = ''; }
      }
    } catch(e){}
    const col=m(/(?:^|;|\s)color:(#[0-9a-fA-F]{3,8})/,'#ffffff');
    try{const _sw=document.getElementById('p-col-preview');if(_sw)_sw.style.background=col;document.getElementById('p-hex').value=col;}catch(e){}
    document.getElementById('p-lh').value=parseFloat(m(/line-height:([\d.]+)/,'1.2'));
    document.getElementById('p-ls').value=parseFloat(m(/letter-spacing:([-\d.]+)px/,'0'));
    document.getElementById('ft-b').classList.toggle('on',/font-weight:(700|800|900)/.test(cs));
    document.getElementById('ft-i').classList.toggle('on',cs.includes('font-style:italic'));
    document.getElementById('ft-u').classList.toggle('on',cs.includes('text-decoration:underline'));
    const aln=m(/text-align:(\w+)/,'left');
    ['al','ac','ar'].forEach((id,i)=>document.getElementById('ft-'+id).classList.toggle('on',['left','center','right'][i]===aln));
    // Vertical align
    const va=sel.dataset.valign||'top';
    ['vt','vm','vb'].forEach((id,i)=>document.getElementById('ft-'+id).classList.toggle('on',['top','middle','bottom'][i]===va));
    // Background color
    const bgCol=sel.dataset.textBg||'';
    const bgOp=parseFloat(sel.dataset.textBgOp!=null?sel.dataset.textBgOp:1);
    try{
      const _bgsw=document.getElementById('p-bg-swatch-inner');if(_bgsw)_bgsw.style.background=bgCol||'';
      document.getElementById('p-bg-hex').value=bgCol||'';
      document.getElementById('p-bg-op').value=bgOp;
      const bgBlur=parseFloat(sel.dataset.textBgBlur!=null?sel.dataset.textBgBlur:0);
      document.getElementById('p-bg-blur').value=bgBlur;
      // Gradient state
      const isGrad=sel.dataset.textBgGrad==='1';
      const gradChk=document.getElementById('p-bg-grad-check');if(gradChk)gradChk.checked=isGrad;
      const gradRow=document.getElementById('p-bg-grad-row');if(gradRow)gradRow.style.display=isGrad?'flex':'none';
      const col2=sel.dataset.textBgCol2||'';
      const _bgsw2=document.getElementById('p-bg-swatch2-inner');if(_bgsw2)_bgsw2.style.background=col2;
      document.getElementById('p-bg-hex2').value=col2;
      const bgDir=sel.dataset.textBgDir!=null?+sel.dataset.textBgDir:90;
      document.querySelectorAll('.p-bg-dir-btn').forEach(b=>b.classList.toggle('on',+b.dataset.deg===bgDir));
    }catch(e){}
    // Text role
    const role=sel.dataset.textRole||'body';
    try{document.getElementById('role-body').classList.toggle('active',role==='body');document.getElementById('role-heading').classList.toggle('active',role==='heading');}catch(e){}
    // Border
    try{const _brd=document.getElementById('p-border-preview');if(_brd)_brd.style.background=sel.dataset.textBorderColor||'#ffffff';document.getElementById('p-border-w').value=sel.dataset.textBorderW||0;}catch(e){}
    // Opacity
    try{const op=parseFloat(sel.dataset.elOpacity!=null?sel.dataset.elOpacity:1);document.getElementById('p-el-op').value=op;}catch(e){}
    // Padding - parse 4-sided
    try{
      const padMatch=cs.match(/\bpadding:([\d.\s]+px(?:\s[\d.\s]+px){0,3})/);
      if(padMatch){
        const parts=padMatch[1].trim().split(/\s+/).map(p=>parseFloat(p));
        const t=parts[0]||0,r=parts.length>1?parts[1]:t,b=parts.length>2?parts[2]:t,l=parts.length>3?parts[3]:r;
        document.getElementById('p-pad-t').value=t;
        document.getElementById('p-pad-r').value=r;
        document.getElementById('p-pad-b').value=b;
        document.getElementById('p-pad-l').value=l;
      } else {
        document.getElementById('p-pad-t').value=6;
        document.getElementById('p-pad-r').value=8;
        document.getElementById('p-pad-b').value=6;
        document.getElementById('p-pad-l').value=8;
      }
    }catch(e){}
  } // end if(t==='text')
  // Update list button state and bullet color row
  if (sel && sel.dataset.type === 'text' && typeof _updateListButtonState === 'function') {
    try { _updateListButtonState(); } catch(e) {}
  } else {
    // Hide bullet color row when not a text element
    try { const r = document.getElementById('bullet-color-row'); if(r) r.style.display = 'none'; } catch(e) {}
  }
  if(sel.dataset.type==='shape'){
    try{const _fsw=document.getElementById('sh-fill-preview');if(_fsw)_fsw.style.background=sel.dataset.fill||'#3b82f6';document.getElementById('sh-fill-hex').value=sel.dataset.fill||'#3b82f6';}catch(e){}
    try{const _strk=document.getElementById('sh-stroke-preview');if(_strk)_strk.style.background=sel.dataset.stroke||'#1d4ed8';document.getElementById('sh-stroke-hex').value=sel.dataset.stroke||'#1d4ed8';}catch(e){}
    document.getElementById('sh-sw').value=sel.dataset.sw!=null?sel.dataset.sw:2;
    const sw0=+(sel.dataset.sw!=null?sel.dataset.sw:2)===0;
    
    document.getElementById('sh-rx').value=sel.dataset.rx||0;
    document.getElementById('sh-fill-op').value=sel.dataset.fillOp||1;
    document.getElementById('sh-shadow').checked=sel.dataset.shadow==='true';
    document.getElementById('sh-sb').value=sel.dataset.shadowBlur||8;
    try{const sc=sel.dataset.shadowColor||'#000000';document.getElementById('sh-sc-preview').style.background=sc;document.getElementById('sh-sc-hex').value=sc;}catch(e){}
    try{document.getElementById('sh-el-blur').value=parseFloat(sel.dataset.shapeBlur||0);}catch(e){}
    const st=sel.querySelector('.shape-text');
    if(st){
      const cs=st.getAttribute('style')||'';
      const m=(re,fb)=>{const x=cs.match(re);return x?x[1]:fb;};
      document.getElementById('sh-fs').value=parseFloat(m(/font-size:([\d.]+)px/,'24'));
      document.getElementById('sh-fw').value=m(/font-weight:(\d+)/,'700');
      const tc=m(/(?:^|;|\s)color:(#[0-9a-fA-F]{3,8})/,'#ffffff');
      try{document.getElementById('sh-tc').value=tc;document.getElementById('sh-tc-hex').value=tc;}catch(e){}
    }
  }
  // Image props sync
  if(t==='image'){
    const d=slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d)syncImgProps(sel,d);
  }
  // Code props sync
  if(t==='code'){
    const d=slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d){try{document.getElementById('code-lang').value=d.codeLang||'js';document.getElementById('code-fs').value=d.codeFs||13;}catch(e){}}
  }
  // Markdown props sync
  if(t==='markdown'){
    const d=slides[cur].els.find(e=>e.id===sel.dataset.id);
    if(d){
      try{document.getElementById('md-fs').value=d.mdFs||16;}catch(e){}
      try{
        const col=d.mdColor||'#ffffff';
        document.getElementById('md-color-hex').value=col;
        document.getElementById('md-color-preview').style.background=col;
      }catch(e){}
      // bg
      try{
        const bg=sel.dataset.textBg||'';
        document.getElementById('md-bg-hex').value=bg;
        document.getElementById('md-bg-swatch-inner').style.background=bg||'';
        document.getElementById('md-bg-op').value=sel.dataset.textBgOp!=null?sel.dataset.textBgOp:1;
        document.getElementById('md-bg-blur').value=sel.dataset.textBgBlur||0;
      }catch(e){}
      // radius
      try{
        ['tl','tr','bl','br'].forEach(c=>{const inp=document.getElementById('md-rx-'+c);if(inp)inp.value=sel.dataset['rx_'+c]||0;});
      }catch(e){}
      // border
      try{
        const bw=sel.dataset.textBorderW||0, bc=sel.dataset.textBorderColor||'#ffffff';
        document.getElementById('md-border-w').value=bw;
        document.getElementById('md-border-hex').value=bc;
        document.getElementById('md-border-preview').style.background=bc;
      }catch(e){}
    }
  }
  // Animations count badge
  if(ap){
    const anims=JSON.parse(sel.dataset.anims||'[]');
    if(anims.length){ap.style.display='flex';ap.style.flexDirection='column';const animList=document.getElementById('el-anim-list');if(animList){animList.innerHTML='';anims.forEach((a,i)=>{const item=document.createElement('div');item.className='anim-item';const cat=a.category||'entrance';const catColor=cat==='entrance'?'#22c55e':cat==='exit'?'#ec4899':'#f59e0b';item.innerHTML='<span style="width:16px;height:16px;border-radius:50%;background:'+catColor+'20;color:'+catColor+';font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+(i+1)+'</span><span style="flex:1;font-size:10px">'+(ANIM_INFO[a.name]?.label||a.name)+'</span><span style="font-size:9px;color:var(--text3)">'+formatTiming(a)+'</span>';item.style.cssText='background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:4px 8px;display:flex;align-items:center;gap:6px;margin-bottom:3px;';animList.appendChild(item);});}}else ap.style.display='none';
    // Always sync hover fx UI when animprops is shown
    syncHoverFxUI();
  }
  // Sync text radius
  if(sel.dataset.type==='text')syncTextRadiusUI();
}
function setES(prop,val,u){if(!sel)return;sel.style[prop]=val+u;save();drawThumbs();}
function setElRotation(deg){
  if(!sel)return;sel.style.transform='rotate('+deg+'deg)';sel.dataset.rot=deg;
  const pRot=document.getElementById('p-rot');if(pRot)pRot.value=deg;
  if(typeof _updateHandlesOverlay==='function')_updateHandlesOverlay();
  if(typeof updateConnectorsFor==='function')updateConnectorsFor(sel.dataset.id);
  commitAll();
}
// Debounced undo: pushes at most once per 800ms during continuous changes
let _undoTimer=null;
function debouncedPushUndo(){
  if(_undoTimer)return; // already pending - don't push again until debounce fires
  // Push immediately on first change in a burst
  pushUndo();
  _undoTimer=setTimeout(()=>{_undoTimer=null;},800);
}
function setTS(prop,val){
  if(!sel||sel.dataset.type!=='text')return;
  debouncedPushUndo();
  const c=sel.querySelector('.tel')||sel.querySelector('.ec');let cs=c.getAttribute('style')||'';
  const re=new RegExp(prop+'\\s*:[^;]+;?','i');
  cs=re.test(cs)?cs.replace(re,prop+':'+val+';'):cs+prop+':'+val+';';
  c.setAttribute('style',cs);save();drawThumbs();syncProps();
}
function toggleFmt_props_noop(){} // handled by 30-rich-text.js toggleFmt
function setTextVAlign(va){
  if(!sel||sel.dataset.type!=='text')return;
  pushUndo();
  sel.dataset.valign=va;
  applyTextVAlign(sel,va);
  commitAll();syncProps();
}
function applyTextVAlign(el,va){
  const ec=el.querySelector('.ec.tel');if(!ec)return;
  // Remove legacy padding-top approach
  ec.style.paddingTop='';
  // Remove any old wrapper from previous implementations
  const oldWrap=ec.querySelector('.ec-valign-wrap');
  if(oldWrap){while(oldWrap.firstChild)ec.insertBefore(oldWrap.firstChild,oldWrap);oldWrap.remove();}
  el.dataset.valign=va||'top';
  // Flex on the .el container — .ec.tel becomes the flex child
  // This is pure CSS math, no scrollHeight hacks needed
  if(!va||va==='top'){
    delete el.dataset.valign;
    el.style.display='';
    el.style.flexDirection='';
    el.style.alignItems='';
    el.style.justifyContent='';
    ec.style.flex='';
    ec.style.width='';
    return;
  }
  el.style.display='flex';
  el.style.flexDirection='column';
  el.style.alignItems='stretch'; // ec stretches to full width always
  if(va==='middle') el.style.justifyContent='center';
  else if(va==='bottom') el.style.justifyContent='flex-end';
  // ec is a flex child — no fixed height, sized by content
  ec.style.flex='none';
  ec.style.width='100%';
}
function setTextBg(col, schemeRef){
  if(!sel||sel.dataset.type!=='text')return;
  sel.dataset.textBg=col;
  const d=slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
  if(d) d.textBgScheme = (schemeRef !== undefined ? (schemeRef || null) : d.textBgScheme);
  applyTextBg(sel);
  commitAll();
}
function clearTextBgCol1(){
  if(!sel||sel.dataset.type!=='text')return;
  delete sel.dataset.textBg;
  try{
    document.getElementById('p-bg-hex').value='';
    const _bgsw=document.getElementById('p-bg-swatch-inner');if(_bgsw)_bgsw.style.background='';
  }catch(e){}
  applyTextBg(sel);
  commitAll();
}
function clearTextBg(){
  if(!sel||sel.dataset.type!=='text')return;
  delete sel.dataset.textBg;delete sel.dataset.textBgOp;delete sel.dataset.textBgBlur;
  delete sel.dataset.textBgGrad;delete sel.dataset.textBgCol2;delete sel.dataset.textBgDir;
  // Clear both .ec and .el styles
  const c=sel.querySelector('.ec');if(c)c.style.background='';
  sel.style.background='';sel.style.backdropFilter='';sel.style.webkitBackdropFilter='';
  try{
    document.getElementById('p-bg-hex').value='';
    const _bgsw=document.getElementById('p-bg-swatch-inner');if(_bgsw)_bgsw.style.background='';
    // Reset gradient UI
    const gradRow=document.getElementById('p-bg-grad-row');if(gradRow)gradRow.style.display='none';
    const gradChk=document.getElementById('p-bg-grad-check');if(gradChk)gradChk.checked=false;
  }catch(e){}
  commitAll();
}
function setTextBgGrad(on){
  if(!sel||sel.dataset.type!=='text')return;
  if(on){ sel.dataset.textBgGrad='1'; } else { delete sel.dataset.textBgGrad; }
  applyTextBg(sel);
  commitAll();
  // Show/hide gradient row
  const gradRow=document.getElementById('p-bg-grad-row');
  if(gradRow) gradRow.style.display=on?'flex':'none';
}
function setTextBgCol2(col){
  if(!sel||sel.dataset.type!=='text')return;
  sel.dataset.textBgCol2=col;
  applyTextBg(sel);
  commitAll();
}
function setTextBgDir(deg){
  if(!sel||sel.dataset.type!=='text')return;
  sel.dataset.textBgDir=deg;
  applyTextBg(sel);
  commitAll();
  // Update direction button active state
  document.querySelectorAll('.p-bg-dir-btn').forEach(b=>b.classList.toggle('on',+b.dataset.deg===+deg));
}
function setTextBgOp(op){
  if(!sel||sel.dataset.type!=='text')return;
  sel.dataset.textBgOp=op;
  applyTextBg(sel);
  commitAll();
}
function setTextBgBlur(v){
  if(!sel||sel.dataset.type!=='text')return;
  sel.dataset.textBgBlur=v;
  applyTextBg(sel);
  commitAll();
}
function _getBgLayer(el){
  let layer=el.querySelector('.el-bg-layer');
  if(!layer){
    layer=document.createElement('div');
    layer.className='el-bg-layer';
    layer.style.cssText='position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:inherit;';
    el.insertBefore(layer,el.firstChild);
  }
  return layer;
}
function applyTextBg(el){
  const c=el.querySelector('.ec');if(!c)return;
  const col=el.dataset.textBg;
  const blur=parseFloat(el.dataset.textBgBlur!=null?el.dataset.textBgBlur:0);
  const isGrad=el.dataset.textBgGrad==='1';
  // Always clear el.style.background — use bg-layer div instead to avoid white-strip under text
  el.style.background='';
  c.style.background='';
  if(!col && !blur && !isGrad){
    const old=el.querySelector('.el-bg-layer');if(old)old.remove();
    el.style.backdropFilter='';el.style.webkitBackdropFilter='';
    return;
  }
  const layer=_getBgLayer(el);
  const toRgba=(hex,a)=>{if(!hex)return`rgba(0,0,0,0)`;const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;};
  if(col || isGrad){
    const op=parseFloat(el.dataset.textBgOp!=null?el.dataset.textBgOp:1);
    const dir=el.dataset.textBgDir!=null?+el.dataset.textBgDir:90;
    if(isGrad){
      const c2val=el.dataset.textBgCol2?toRgba(el.dataset.textBgCol2,op):`rgba(0,0,0,0)`;
      layer.style.background=`linear-gradient(${dir}deg,${toRgba(col,op)},${c2val})`;
    } else {
      layer.style.background=toRgba(col,op);
    }
  } else {
    layer.style.background='';
  }
  if(blur>0){
    el.style.backdropFilter=`blur(${blur}px)`;
    el.style.webkitBackdropFilter=`blur(${blur}px)`;
  } else {
    el.style.backdropFilter='';
    el.style.webkitBackdropFilter='';
  }
}
// ══════════════ TEXT ROLE ══════════════
function setTextRole(role){
  if(!sel||sel.dataset.type!=='text')return;
  sel.dataset.textRole=role;
  try{document.getElementById('role-body').classList.toggle('active',role==='body');document.getElementById('role-heading').classList.toggle('active',role==='heading');}catch(e){}
  const c=sel.querySelector('.tel')||sel.querySelector('.ec');
  if(c){
    let cs=c.getAttribute('style')||'';
    // Remove text-transform
    cs=cs.replace(/text-transform\s*:[^;]+;?/gi,'').trim();
    if(role==='heading'){
      cs=(cs.endsWith(';')?cs:cs+';')+'text-transform:uppercase;';
    }
    // Bold: heading → bold, body → remove bold (set 400)
    cs=cs.replace(/font-weight\s*:[^;]+;?/gi,'').trim();
    if(role==='heading'){
      cs=(cs.endsWith(';')?cs:cs+';')+'font-weight:700;';
      // Increase font size if small
      const fs=parseFloat((cs.match(/font-size:([\d.]+)px/)||['','36'])[1]);
      if(fs<36){cs=cs.replace(/font-size:[^;]+;?/g,'')+(cs.endsWith(';')?'':'')+'font-size:48px;';}
    } else {
      cs=(cs.endsWith(';')?cs:cs+';')+'font-weight:400;';
    }
    c.setAttribute('style',cs);
    // Update bold button state
    try{document.getElementById('ft-b').classList.toggle('on',role==='heading');}catch(e){}
  }
  commitAll();
}

function setTextPadding4(){
  if(!sel||sel.dataset.type!=='text')return;
  const c=sel.querySelector('.tel')||sel.querySelector('.ec');if(!c)return;
  const t=+(document.getElementById('p-pad-t').value||0);
  const r=+(document.getElementById('p-pad-r').value||0);
  const b=+(document.getElementById('p-pad-b').value||0);
  const l=+(document.getElementById('p-pad-l').value||0);
  let cs=c.getAttribute('style')||'';
  cs=cs.replace(/\bpadding\s*:[^;]+;?/gi,'').trim();
  const padStr=(t===r&&r===b&&b===l)?t+'px':t+'px '+r+'px '+b+'px '+l+'px';
  cs=(cs.endsWith(';')?cs:cs+';')+'padding:'+padStr+';';
  c.setAttribute('style',cs);
  commitAll();
}
// Keep backward compat
function setTextPadding(v){
  const ids=['p-pad-t','p-pad-r','p-pad-b','p-pad-l'];
  ids.forEach(id=>{try{document.getElementById(id).value=v;}catch(e){}});
  setTextPadding4();
}
// ══════════════ RESET TEXT FORMATTING ══════════════
function resetTextFormatting() {
  if (!sel || sel.dataset.type !== 'text') return;
  pushUndo();
  const d = slides[cur] && slides[cur].els.find(e => e.id === sel.dataset.id);
  if (!d) return;

  // 1. Strip ALL inline styles from every element inside the html content
  const tmp = document.createElement('div');
  tmp.innerHTML = d.html || '';
  // Remove style attrs recursively
  tmp.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
  tmp.querySelectorAll('[color]').forEach(el => el.removeAttribute('color'));
  tmp.querySelectorAll('[face]').forEach(el => el.removeAttribute('face'));
  tmp.querySelectorAll('[size]').forEach(el => el.removeAttribute('size'));
  // Remove empty <span> and <font> wrappers that only carried formatting
  tmp.querySelectorAll('span,font').forEach(el => {
    if (!el.attributes.length) {
      const frag = document.createDocumentFragment();
      while (el.firstChild) frag.appendChild(el.firstChild);
      el.replaceWith(frag);
    }
  });
  d.html = tmp.innerHTML;

  // 2. Reset container style (cs) to clean defaults — keep font-size if set
  const prevCs = d.cs || '';
  const fsMatch = prevCs.match(/font-size:([\d.]+px)/);
  const fs = fsMatch ? fsMatch[1] : '32px';
  const _rstTheme = (typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?THEMES[appliedThemeIdx]:null;
  const _rstScheme = {col:7, row:0};
  const _rstColor = (typeof _resolveSchemeColor==='function'&&_rstTheme)
    ? (_resolveSchemeColor(_rstScheme,_rstTheme)||'#ffffff')
    : (_rstTheme&&!_rstTheme.dark?'#000000':'#ffffff');
  d.cs = 'font-size:' + fs + ';font-weight:400;color:'+_rstColor+';text-align:left;line-height:1.3;';
  d.textColorScheme = _rstScheme;

  // 3. Clear text background
  delete d.textBg; delete d.textBgOp; delete d.textBgBlur;
  sel.dataset.textBg = ''; sel.dataset.textBgOp = ''; sel.dataset.textBgBlur = '';
  sel.style.backdropFilter=''; sel.style.webkitBackdropFilter='';
  const ec2 = sel.querySelector('.ec'); if (ec2) ec2.style.background = '';

  // 4. Re-render element
  const ecEl = sel.querySelector('.tel') || sel.querySelector('.ec');
  if (ecEl) {
    ecEl.setAttribute('style', d.cs);
    ecEl.innerHTML = d.html;
  }

  commitAll(); syncProps();
  toast((t('toastFormattingReset')),'ok');
}

// ══════════════ GENERATOR PROPS ══════════════
function syncGenProps(){
  const s=slides[cur]||null;
  if(!sel||!s) return;
  const d=s.els.find(x=>x.id===sel.dataset.id);
  if(!d) return;
  // Restore generator UI
  const ph2=document.querySelector('#genprops .ph'); if(ph2) ph2.textContent='🎲 Генератор';
  const rr=document.getElementById('gen-range-row'); if(rr) rr.style.display='';
  const tr=document.getElementById('tm-row'); if(tr) tr.style.display='none';
  const oer2=document.getElementById('tm-onend-row'); if(oer2) oer2.style.display='none';
  try{document.getElementById('gen-min').value  = d.genMin  !== undefined ? d.genMin  : 1;}catch(e){}
  try{document.getElementById('gen-max').value  = d.genMax  !== undefined ? d.genMax  : 100;}catch(e){}
  try{document.getElementById('gen-step').value = d.genStep !== undefined ? d.genStep : 1;}catch(e){}
  try{document.getElementById('gen-fs').value   = d.genFontSize || 64;}catch(e){}
  const bold = d.genBold || false;
  try{document.getElementById('gen-bold').classList.toggle('active', bold);}catch(e){}
  // align buttons
  const al = d.genAlign || 'center';
  ['l','c','r'].forEach(k=>{
    try{document.getElementById('gen-a'+k).classList.toggle('active', al==={l:'left',c:'center',r:'right'}[k]);}catch(e){}
  });
  const va = d.genVAlign || 'middle';
  ['t','m','b'].forEach(k=>{
    try{document.getElementById('gen-v'+k).classList.toggle('active', va==={t:'top',m:'middle',b:'bottom'}[k]);}catch(e){}
  });
  const _pc=typeof _appletTheme==='function'?_appletTheme():{ac1:'#6366f1',head:'#a5b4fc'};
  const col = d.genColor || '';
  const _colDisp = col || _pc.head || _pc.ac1;
  try{document.getElementById('gen-color-hex').value=col; document.getElementById('gen-color-preview').style.background=_colDisp;}catch(e){}
  const _p2=typeof _appletTheme==='function'?_appletTheme():{ac1:'#6366f1'};
  const bg = d.genBg || '';
  const _bgHex = bg || (_p2.ac1||'#6366f1');
  const _bgOp = d.genBgOp !== undefined ? d.genBgOp : (bg ? 1 : 0.2);
  try{document.getElementById('gen-bg-hex').value=bg; document.getElementById('gen-bg-swatch').style.background=_bgHex;}catch(e){}
  try{document.getElementById('gen-bg-blur').value = d.genBgBlur !== undefined ? d.genBgBlur : 0;}catch(e){}
  try{document.getElementById('gen-bg-op').value = _bgOp;}catch(e){}
  try{document.getElementById('gen-sh-enable').checked = d.genShadowOn !== undefined ? !!d.genShadowOn : true;}catch(e){}
  try{document.getElementById('gen-sh-blur').value = d.genShadowBlur !== undefined ? d.genShadowBlur : 8;}catch(e){}
  try{const sc=d.genShadowColor||'#000000';document.getElementById('gen-sh-preview').style.background=sc;}catch(e){}
  try{
    const bc = d.genBorderColor || '#ffffff';
    const bw = d.genBorderWidth !== undefined ? d.genBorderWidth : 0;
    document.getElementById('gen-border-preview').style.background = bc || '';
    document.getElementById('gen-border-w').value = bw;
  }catch(e){}
  try{document.getElementById('gen-op').value = sel.style.opacity||1;}catch(e){}
  try{document.getElementById('gen-rx').value = parseInt(sel.style.borderRadius)||0;}catch(e){}
}

// Map from gen color prop → its scheme key
const _genSchemeKeys = {genColor:'genColorScheme', genBg:'genBgScheme', genBorderColor:'genBorderScheme'};

function syncClockProps(){
  if(!sel) return;
  const d_= slides[cur] && slides[cur].els.find(x=>x.id===sel.dataset.id);
  if(!d_) return;
  const ph = document.querySelector('#genprops .ph');
  if(ph) ph.textContent = '🕐 Часы';
  const rangeRow = document.getElementById('gen-range-row');
  const timerRow = document.getElementById('tm-row');
  const oer = document.getElementById('tm-onend-row');
  if(rangeRow) rangeRow.style.display = 'none';
  if(timerRow) timerRow.style.display = 'none';
  if(oer) oer.style.display = 'none';
  // Sync shared visual props (same as timer)
  try{document.getElementById('gen-fs').value = d_.genFontSize !== undefined ? d_.genFontSize : 48;}catch(e){}
  try{document.getElementById('gen-bold').classList.toggle('active', !!d_.genBold);}catch(e){}
  try{document.getElementById('gen-al').classList.toggle('active', (d_.genAlign||'center')==='left');}catch(e){}
  try{document.getElementById('gen-ac').classList.toggle('active', (d_.genAlign||'center')==='center');}catch(e){}
  try{document.getElementById('gen-ar').classList.toggle('active', (d_.genAlign||'center')==='right');}catch(e){}
  try{document.getElementById('gen-vt').classList.toggle('active', (d_.genVAlign||'middle')==='top');}catch(e){}
  try{document.getElementById('gen-vm').classList.toggle('active', (d_.genVAlign||'middle')==='middle');}catch(e){}
  try{document.getElementById('gen-vb').classList.toggle('active', (d_.genVAlign||'middle')==='bottom');}catch(e){}
  const _pct=typeof _appletTheme==='function'?_appletTheme():{ac1:'#6366f1',head:'#a5b4fc'};
  const tc=d_.genColor||''; const _tcDisp=tc||_pct.head||_pct.ac1;
  try{document.getElementById('gen-color-preview').style.background=_tcDisp;document.getElementById('gen-color-hex').value=tc;}catch(e){}
  const _pt=typeof _appletTheme==='function'?_appletTheme():{ac1:'#6366f1'};
  const bg=d_.genBg||''; const _bgHexT=bg||(_pt.ac1||'#6366f1');
  const _bgOpT=d_.genBgOp!==undefined?d_.genBgOp:(bg?1:0.2);
  try{document.getElementById('gen-bg-swatch').style.background=_bgHexT;document.getElementById('gen-bg-hex').value=bg;}catch(e){}
  try{document.getElementById('gen-bg-op').value=_bgOpT;}catch(e){}
  try{document.getElementById('gen-bg-blur').value=d_.genBgBlur!==undefined?d_.genBgBlur:0;}catch(e){}
  try{document.getElementById('gen-shad').classList.toggle('active',d_.genShadowOn!==false);}catch(e){}
  const brd=d_.genBorderColor||''; try{document.getElementById('gen-border-swatch').style.background=brd||_pt.ac1;document.getElementById('gen-border-w').value=d_.genBorderWidth!==undefined?d_.genBorderWidth:0;}catch(e){}
}

function syncTimerProps(){
  if(!sel) return;
  const d_= slides[cur] && slides[cur].els.find(x=>x.id===sel.dataset.id);
  if(!d_) return;
  // Update header label
  const ph = document.querySelector('#genprops .ph');
  if(ph) ph.textContent = '⏱ Таймер';
  // Show timer duration row, hide generator range row
  const rangeRow = document.getElementById('gen-range-row');
  const timerRow = document.getElementById('tm-row');
  if(rangeRow) rangeRow.style.display = 'none';
  if(timerRow) timerRow.style.display = 'flex';
  // Sync timer duration fields
  try{document.getElementById('tm-min').value = d_.tmMin !== undefined ? d_.tmMin : 5;}catch(e){}
  try{document.getElementById('tm-sec').value = d_.tmSec !== undefined ? d_.tmSec : 0;}catch(e){}
  // On-end action
  try{
    const oe = d_.tmOnEnd || 'none';
    document.getElementById('tm-onend').value = oe;
    const slideRow = document.getElementById('tm-onend-slide-row');
    if(slideRow) slideRow.style.display = oe==='slide' ? 'flex' : 'none';
    // Populate slide select
    const slideSel = document.getElementById('tm-onend-slide');
    if(slideSel){
      const curVal = d_.tmOnEndSlide !== undefined ? +d_.tmOnEndSlide : 0;
      slideSel.innerHTML = slides.map((s,i)=>{
        const label = s.title && s.title.trim() ? s.title.trim() : ('Слайд '+(i+1));
        const sel2 = i===curVal ? ' selected' : '';
        return `<option value="${i}"${sel2}>${i+1}. ${label}</option>`;
      }).join('');
    }
  }catch(e){}
  // Show onend row
  const oer = document.getElementById('tm-onend-row'); if(oer) oer.style.display='flex';
  // Sync shared visual props
  try{document.getElementById('gen-fs').value = d_.genFontSize !== undefined ? d_.genFontSize : 72;}catch(e){}
  try{document.getElementById('gen-bold').classList.toggle('active', !!d_.genBold);}catch(e){}
  try{document.getElementById('gen-al').classList.toggle('active', (d_.genAlign||'center')==='left');}catch(e){}
  try{document.getElementById('gen-ac').classList.toggle('active', (d_.genAlign||'center')==='center');}catch(e){}
  try{document.getElementById('gen-ar').classList.toggle('active', (d_.genAlign||'center')==='right');}catch(e){}
  try{document.getElementById('gen-vt').classList.toggle('active', (d_.genVAlign||'middle')==='top');}catch(e){}
  try{document.getElementById('gen-vm').classList.toggle('active', (d_.genVAlign||'middle')==='middle');}catch(e){}
  try{document.getElementById('gen-vb').classList.toggle('active', (d_.genVAlign||'middle')==='bottom');}catch(e){}
  const _pct=typeof _appletTheme==='function'?_appletTheme():{ac1:'#6366f1',head:'#a5b4fc'};
  const tc=d_.genColor||'';
  const _tcDisp = tc || _pct.head || _pct.ac1;
  try{document.getElementById('gen-color-preview').style.background=_tcDisp;document.getElementById('gen-color-hex').value=tc;}catch(e){}
  const _pt=typeof _appletTheme==='function'?_appletTheme():{ac1:'#6366f1'};
  const bg=d_.genBg||'';
  const _bgHexT = bg || (_pt.ac1||'#6366f1');
  const _bgOpT = d_.genBgOp !== undefined ? d_.genBgOp : (bg ? 1 : 0.2);
  try{document.getElementById('gen-bg-swatch').style.background=_bgHexT;document.getElementById('gen-bg-hex').value=bg;}catch(e){}
  try{document.getElementById('gen-bg-op').value=_bgOpT;}catch(e){}
  try{document.getElementById('gen-bg-blur').value=d_.genBgBlur!==undefined?d_.genBgBlur:0;}catch(e){}
  try{document.getElementById('gen-sh-enable').checked=d_.genShadowOn!==undefined?!!d_.genShadowOn:true;}catch(e){}
  try{document.getElementById('gen-sh-blur').value=d_.genShadowBlur!==undefined?d_.genShadowBlur:8;}catch(e){}
  try{const sc=d_.genShadowColor||'#000000';document.getElementById('gen-sh-preview').style.background=sc;document.getElementById('gen-sh-hex').value=sc;}catch(e){}
  try{document.getElementById('gen-op').value=d_.opacity!==undefined?d_.opacity:1;}catch(e){}
  try{document.getElementById('gen-rx').value=d_.rx!==undefined?d_.rx:0;}catch(e){}
}

window.setTimerProp = function(prop, val){
  if(!sel) return;
  const elId = sel.dataset.id;
  const s = slides[cur];
  if(!s) return;
  const d_ = s.els.find(x=>x.id===elId);
  if(!d_) return;
  d_[prop] = val;
  _refreshAppletEl(d_);
  if(typeof save==='function') save();
  if(typeof saveState==='function') saveState();
};


window.setTimerOnEnd = function(val){
  if(!sel) return;
  const elId = sel.dataset.id;
  const s = slides[cur]; if(!s) return;
  const d_ = s.els.find(x=>x.id===elId); if(!d_) return;
  d_.tmOnEnd = val;
  // show/hide slide select
  try{
    const slideRow2 = document.getElementById('tm-onend-slide-row');
    if(slideRow2) slideRow2.style.display = val==='slide' ? 'flex' : 'none';
    if(val==='slide'){
      const slideSel2 = document.getElementById('tm-onend-slide');
      if(slideSel2 && slideSel2.options.length===0){
        const curVal2 = d_.tmOnEndSlide !== undefined ? +d_.tmOnEndSlide : 0;
        slideSel2.innerHTML = slides.map((s,i)=>{
          const label2 = s.title && s.title.trim() ? s.title.trim() : ('Слайд '+(i+1));
          return `<option value="${i}"${i===curVal2?' selected':''}>${i+1}. ${label2}</option>`;
        }).join('');
      }
    }
  }catch(e){}
  if(d.appletId==='clock' && typeof refreshClockEl==='function') refreshClockEl(elId);
  else if(typeof refreshTimerEl==='function') refreshTimerEl(elId);
  if(typeof save==='function') save();
  if(typeof saveState==='function') saveState();
};



// Unified refresh for generator/timer — picks right function by appletId
function _refreshAppletEl(d){
  if(!d) return;
  if(d.appletId==='timer'     && typeof refreshTimerEl    ==='function') refreshTimerEl(d.id);
  if(d.appletId==='clock'     && typeof refreshClockEl     ==='function') refreshClockEl(d.id);
  if(d.appletId==='generator' && typeof refreshGeneratorEl==='function') refreshGeneratorEl(d.id);
}

window.setGenProp = function(prop, val, sr){
  if(!sel) return;
  const elId = sel.dataset.id;
  const s=slides[cur]||null; if(!s) return;
  const d=s.els.find(x=>x.id===elId); if(!d) return;
  d[prop] = val;
  // Store or clear scheme reference for color props
  const sk = _genSchemeKeys[prop];
  if(sk){
    d[sk] = (sr !== undefined) ? sr : null;  // null = custom color
  }
  _refreshAppletEl(d);
  if(typeof saveState==='function') saveState();
};

window.toggleGenBold = function(){
  if(!sel) return;
  const elId = sel.dataset.id;
  const s=slides[cur]||null; if(!s) return;
  const d=s.els.find(x=>x.id===elId); if(!d) return;
  d.genBold = !d.genBold;
  document.getElementById('gen-bold').classList.toggle('active', d.genBold);
  _refreshAppletEl(d);
  if(typeof saveState==='function') saveState();
};

window.setGenAlign = function(val){
  if(!sel) return;
  const s=slides[cur]||null; if(!s) return;
  const d=s.els.find(x=>x.id===sel.dataset.id); if(!d) return;
  d.genAlign = val;
  ['l','c','r'].forEach(k=>{
    try{document.getElementById('gen-a'+k).classList.toggle('active', val==={l:'left',c:'center',r:'right'}[k]);}catch(e){}
  });
  _refreshAppletEl(d);
  if(typeof saveState==='function') saveState();
};

window.setGenVAlign = function(val){
  if(!sel) return;
  const s=slides[cur]||null; if(!s) return;
  const d=s.els.find(x=>x.id===sel.dataset.id); if(!d) return;
  d.genVAlign = val;
  ['t','m','b'].forEach(k=>{
    try{document.getElementById('gen-v'+k).classList.toggle('active', val==={t:'top',m:'middle',b:'bottom'}[k]);}catch(e){}
  });
  _refreshAppletEl(d);
  if(typeof saveState==='function') saveState();
};

window.setGenElOpacity = function(v){
  if(!sel) return;
  sel.style.opacity = v;
  const s=slides[cur]||null; if(!s) return;
  const d=s.els.find(x=>x.id===sel.dataset.id); if(!d) return;
  d.opacity = v;
  if(typeof saveState==='function') saveState();
};

window.setGenElRadius = function(v){
  if(!sel) return;
  const r = v+'px';
  sel.style.borderRadius = r;
  const wrap = sel.querySelector('.applet-el');
  if(wrap) wrap.style.borderRadius = r;
  sel.dataset.genRx = v;
  const s=slides[cur]||null; if(!s) return;
  const d=s.els.find(x=>x.id===sel.dataset.id); if(!d) return;
  d.rx = v;
  if(typeof saveState==='function') saveState();
};

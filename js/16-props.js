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
  if(!sel){
    ep.style.display='none';ns.style.display='block';
    if(sp)sp.style.display='block';
    if(spn)spn.style.display='block';
    if(hp)hp.style.display='none';
    return;
  }
  if(sp)sp.style.display='none';
  if(spn)spn.style.display='none';
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
  if(mdp){mdp.style.display=t==='markdown'?'flex':'none';mdp.style.flexDirection='column';}
  if(tblp){tblp.style.display=t==='table'?'flex':'none';tblp.style.flexDirection='column';if(t==='table')syncTableProps();}
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
      try{document.getElementById('ic-p-op').value=parseFloat(sel.dataset.elOpacity!=null?sel.dataset.elOpacity:1);}catch(e){}
    }
  }
  if(t==='text'){
    const cs=(sel.querySelector('.tel')||sel.querySelector('.ec')).getAttribute('style')||'';
    const m=(re,fb)=>{const x=cs.match(re);return x?x[1]:fb;};
    document.getElementById('p-fs').value=parseFloat(m(/font-size:([\d.]+)px/,'48'));
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
    }catch(e){}
    // Text role
    const role=sel.dataset.textRole||'body';
    try{document.getElementById('role-body').classList.toggle('active',role==='body');document.getElementById('role-heading').classList.toggle('active',role==='heading');}catch(e){}
    // Border
    try{const _brd=document.getElementById('p-border-preview');if(_brd)_brd.style.background=sel.dataset.textBorderColor||'#ffffff';document.getElementById('p-border-hex').value=sel.dataset.textBorderColor||'';document.getElementById('p-border-w').value=sel.dataset.textBorderW||0;}catch(e){}
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
    if(d){try{document.getElementById('md-fs').value=d.mdFs||16;}catch(e){}}
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
  if(!sel)return;sel.style.transform='rotate('+deg+'deg)';sel.dataset.rot=deg;commitAll();
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
function toggleFmt(fmt){
  if(!sel||sel.dataset.type!=='text')return;
  const c=sel.querySelector('.tel')||sel.querySelector('.ec');const cs=c.getAttribute('style')||'';
  if(fmt==='bold')setTS('font-weight',/font-weight:(700|800|900)/.test(cs)?'400':'700');
  else if(fmt==='italic')setTS('font-style',cs.includes('font-style:italic')?'normal':'italic');
  else if(fmt==='underline')setTS('text-decoration',cs.includes('text-decoration:underline')?'none':'underline');
}
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
function clearTextBg(){
  if(!sel||sel.dataset.type!=='text')return;
  delete sel.dataset.textBg;delete sel.dataset.textBgOp;delete sel.dataset.textBgBlur;
  const c=sel.querySelector('.ec');if(c)c.style.background='';
  try{document.getElementById('p-bg-hex').value='';const _bgsw=document.getElementById('p-bg-swatch-inner');if(_bgsw)_bgsw.style.background='';}catch(e){}
  commitAll();
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
function applyTextBg(el){
  const c=el.querySelector('.ec');if(!c)return;
  const col=el.dataset.textBg;
  const blur=parseFloat(el.dataset.textBgBlur!=null?el.dataset.textBgBlur:0);
  if(!col && !blur){el.style.background='';el.style.backdropFilter='';el.style.webkitBackdropFilter='';c.style.background='';return;}
  if(col){
    const op=parseFloat(el.dataset.textBgOp!=null?el.dataset.textBgOp:1);
    const r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);
    el.style.background=`rgba(${r},${g},${b},${op})`;
  } else {
    el.style.background='';
  }
  c.style.background='';
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
  d.cs = 'font-size:' + fs + ';font-weight:400;color:#ffffff;text-align:left;line-height:1.3;';

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
  toast((getLang()==='ru'?'Форматирование сброшено':'Formatting reset'),'ok');
}

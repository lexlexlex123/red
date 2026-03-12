// ══════════════ ICON MODAL ══════════════
let selIconId = null;
let _iconSearchVal = '';
let _iconCurCat = 'arrows';

function openIconModal(){
  if(appliedThemeIdx>=0&&appliedThemeIdx<THEMES.length){
    const t=THEMES[appliedThemeIdx];
    const ci=document.getElementById('ic-color');
    if(ci)ci.value=t.shapeFill||'#3b82f6';
  }
  document.getElementById('icon-modal').classList.add('open');
  buildIconCatTabs();
  buildIconGrid(_iconCurCat);
}

function buildIconCatTabs(){
  const tabs=document.getElementById('icon-cat-tabs');
  if(!tabs)return;
  tabs.innerHTML='';
  ICON_CATS.forEach(c=>{
    const b=document.createElement('button');
    b.className='tbtn2'+(c.id===_iconCurCat?' active':'');
    b.textContent=c.name;
    b.onclick=()=>{
      _iconCurCat=c.id;
      _iconSearchVal='';
      const si=document.getElementById('icon-search');
      if(si)si.value='';
      tabs.querySelectorAll('.tbtn2').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      buildIconGrid(c.id);
    };
    tabs.appendChild(b);
  });
}

function filterIcons(val){
  _iconSearchVal=val.toLowerCase().trim();
  if(_iconSearchVal) buildIconGridFiltered(_iconSearchVal);
  else buildIconGrid(_iconCurCat);
}

function buildIconGridFiltered(q){
  const grid=document.getElementById('icon-grid');
  if(!grid)return;
  grid.innerHTML='';
  const icons=ICONS.filter(ic=>ic.name.toLowerCase().includes(q)||ic.cat.includes(q));
  _renderIconCells(grid,icons);
  const info=document.getElementById('icon-count');
  if(info)info.textContent=icons.length+' иконок';
}

function buildIconGrid(catId){
  const grid=document.getElementById('icon-grid');
  if(!grid)return;
  grid.innerHTML='';
  const icons=ICONS.filter(ic=>ic.cat===catId);
  _renderIconCells(grid,icons);
  const info=document.getElementById('icon-count');
  if(info)info.textContent=icons.length+' иконок';
}

function _buildIconSVG(ic, color, sw, style, shadow, shadowBlur, shadowColor){
  const paths=ic.p.split('||').map(p=>p.trim()).filter(Boolean);
  const pathEls=paths.map(p=>`<path d="${p}"/>`).join('');
  let attrs='';
  if(style==='fill') attrs=`fill="${color}" stroke="none"`;
  else if(style==='duotone') attrs=`fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  else attrs=`fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  // For fill-based icons (custom vb), force fill style
  const vb=ic.vb||'0 0 24 24';
  if(ic.vb && style==='fill') attrs=`fill="${color}" stroke="none"`;
  else if(ic.vb && style==='duotone') attrs=`fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="${sw}"`;
  else if(ic.vb) attrs=`fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  let filterDef='', filterAttr='';
  if(shadow){
    const sb=shadowBlur||8, sc=shadowColor||'#000000';
    filterDef=`<defs><filter id="isf_${ic.id}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="2" dy="2" stdDeviation="${sb*0.4}" flood-color="${sc}" flood-opacity="0.7"/></filter></defs>`;
    filterAttr=`filter="url(#isf_${ic.id})"`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${attrs} ${filterAttr} style="width:100%;height:100%;overflow:hidden">${filterDef}<g>${pathEls}</g></svg>`;
}

function _renderIconCells(grid,icons){
  const style=document.getElementById('ic-style')?.value||'stroke';
  const color=document.getElementById('ic-color')?.value||'#3b82f6';
  const sw=parseFloat(document.getElementById('ic-sw')?.value)||1.8;
  icons.forEach(ic=>{
    const cell=document.createElement('div');
    cell.className='icon-cell'+(ic.id===selIconId?' selected':'');
    cell.title=ic.name;
    cell.innerHTML=_buildIconSVG(ic, color, sw, style);
    cell.onclick=()=>{
      selIconId=ic.id;
      grid.querySelectorAll('.icon-cell').forEach(x=>x.classList.remove('selected'));
      cell.classList.add('selected');
      const nm=document.getElementById('icon-sel-name');
      if(nm)nm.textContent=ic.name;
    };
    cell.ondblclick=()=>{selIconId=ic.id; insertIconSelected();};
    grid.appendChild(cell);
  });
  if(!icons.length){
    const msg=document.createElement('div');
    msg.style.cssText='grid-column:1/-1;text-align:center;padding:20px;color:var(--text3);font-size:12px';
    msg.textContent='Ничего не найдено';
    grid.appendChild(msg);
  }
}

function refreshIconGrid(){
  if(_iconSearchVal) buildIconGridFiltered(_iconSearchVal);
  else buildIconGrid(_iconCurCat);
}

function insertIconSelected(){
  if(!selIconId)return (typeof toast==="function")&&toast('Выберите иконку');
  const ic=ICONS.find(x=>x.id===selIconId);
  if(!ic)return;
  // If opened from bullet list picker — use callback instead of inserting as element
  if(typeof window._listIconInsertCallback==='function'){
    window._listIconInsertCallback(ic);
    window._listIconInsertCallback=null;
    document.getElementById('icon-modal').classList.remove('open');
    return;
  }
  const color=document.getElementById('ic-color').value||'#3b82f6';
  const sw=parseFloat(document.getElementById('ic-sw').value)||1.8;
  const style=document.getElementById('ic-style').value||'stroke';
  // Replace mode: update existing selected icon element
  if(window._iconReplaceMode && sel && sel.dataset.type==='icon'){
    window._iconReplaceMode=false;
    if(typeof pushUndo==="function")pushUndo();
    const d=slides[cur].els.find(function(e){return e.id===sel.dataset.id;});
    if(d){
      d.iconId=ic.id; d.iconPath=ic.p;
      // Keep existing color/sw/style unless user changed ic-style
      d.iconStyle=style;
      d.svgContent=_buildIconSVG(ic,d.iconColor||color,d.iconSw||sw,style,d.shadow,d.shadowBlur,d.shadowColor);
      sel.dataset.iconId=ic.id;
      sel.dataset.iconStyle=style;
      const c=sel.querySelector('.ec');
      if(c){c.innerHTML=d.svgContent;var s=c.querySelector('svg');if(s){s.style.width='100%';s.style.height='100%';}}
      save();if(typeof drawThumbs==="function")drawThumbs();if(typeof saveState==="function")saveState();
    }
    document.getElementById('icon-modal').classList.remove('open');
    return;
  }
  const sz=snapV(180);
  const svgContent=_buildIconSVG(ic, color, sw, style);
  if(typeof pushUndo==="function")pushUndo();
  const d={
    id:'e'+(++ec), type:'icon',
    x:snapV(200), y:snapV(150), w:sz, h:sz,
    iconId:ic.id, iconPath:ic.p, iconColor:color, iconSw:sw, iconStyle:style,
    svgContent, rot:0, anims:[], shadow:false, shadowBlur:8, shadowColor:'#000000',
  };
  // Tighten viewBox: parse SVG paths and compute bounds from path geometry
  try{
    // Extract path data strings from svgContent
    const _pathMatches=[...svgContent.matchAll(/d="([^"]+)"/g)].map(m=>m[1]);
    if(_pathMatches.length>0){
      // Use a temporary visible SVG appended off-screen to get reliable getBBox
      const _wrap=document.createElement('div');
      _wrap.style.cssText='position:fixed;left:-9999px;top:-9999px;width:200px;height:200px;';
      const _tmpSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      _tmpSvg.setAttribute('viewBox','0 0 24 24');
      _tmpSvg.style.cssText='width:200px;height:200px;';
      const _g=document.createElementNS('http://www.w3.org/2000/svg','g');
      _pathMatches.forEach(pd=>{
        const _p=document.createElementNS('http://www.w3.org/2000/svg','path');
        _p.setAttribute('d',pd);_g.appendChild(_p);
      });
      _tmpSvg.appendChild(_g);
      _wrap.appendChild(_tmpSvg);
      document.body.appendChild(_wrap);
      const bbox=_g.getBBox();
      document.body.removeChild(_wrap);
      if(bbox&&bbox.width>0&&bbox.height>0){
        const sw2=(parseFloat(sw)||1.8)/2;
        const vx=bbox.x-sw2, vy=bbox.y-sw2, vw=bbox.width+sw2*2, vh=bbox.height+sw2*2;
        const tightSvg=svgContent.replace(/viewBox="[^"]*"/,'viewBox="'+vx+' '+vy+' '+vw+' '+vh+'"');
        d.svgContent=tightSvg;
        const aspect=vw/vh;
        const nh=Math.round(Math.sqrt(sz*sz/aspect));
        const nw=Math.round(nh*aspect);
        d.w=nw; d.h=nh;
        d.iconFitted=true;
      }
    }
  }catch(_e){console.warn('icon fit failed',_e);}
  slides[cur].els.push(d); mkEl(d);
  save(); if(typeof drawThumbs==="function")drawThumbs(); if(typeof saveState==="function")saveState();
  if(typeof _refreshHandlesOverlay==='function')_refreshHandlesOverlay();
  document.getElementById('icon-modal').classList.remove('open');
}

// ── inject icon cell CSS ──
(function(){
  const s=document.createElement('style');
  s.textContent=`
.icon-cell{
  width:52px;height:52px;display:flex;align-items:center;justify-content:center;
  border-radius:8px;cursor:pointer;border:1.5px solid transparent;
  background:var(--surface2);transition:.12s;flex-direction:column;gap:2px;
}
.icon-cell:hover{background:var(--surface3);border-color:var(--border);}
.icon-cell.selected{border-color:var(--accent4);background:color-mix(in srgb,var(--accent4) 15%,transparent);}
.icon-cell svg{width:28px;height:28px;pointer-events:none;}
  `;
  document.head.appendChild(s);
})();

function updateIconStyle(prop,val){
  if(!sel||sel.dataset.type!=='icon')return;
  if(typeof pushUndo==="function")pushUndo();
  var d=slides[cur].els.find(function(e){return e.id===sel.dataset.id;});
  if(!d)return;
  if(prop==='color'){d.iconColor=val;sel.dataset.iconColor=val;d.iconColorCustom=true;}
  else if(prop==='sw'){d.iconSw=parseFloat(val);sel.dataset.iconSw=val;}
  else if(prop==='style'){d.iconStyle=val;sel.dataset.iconStyle=val;}
  else if(prop==='shadow'){d.shadow=val;sel.dataset.shadow=val;
    var shOpts=document.getElementById('ic-p-shadow-opts');
    if(shOpts)shOpts.style.display=val?'flex':'none';}
  else if(prop==='shadowBlur'){d.shadowBlur=parseFloat(val);sel.dataset.shadowBlur=val;}
  else if(prop==='shadowColor'){d.shadowColor=val;sel.dataset.shadowColor=val;}
  else if(prop==='op'){d.elOpacity=parseFloat(val);sel.dataset.elOpacity=val;sel.style.opacity=val;}
  var ic=ICONS.find(function(x){return x.id===d.iconId;});
  if(ic){
    var _newSvg=_buildIconSVG(ic,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke',d.shadow,d.shadowBlur,d.shadowColor);
    // Re-fit viewBox after rebuild
    try{
      const _pathMatches=[..._newSvg.matchAll(/d="([^"]+)"/g)].map(m=>m[1]);
      if(_pathMatches.length>0){
        const _wrap=document.createElement('div');
        _wrap.style.cssText='position:fixed;left:-9999px;top:-9999px;width:200px;height:200px;';
        const _tmpSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
        _tmpSvg.setAttribute('viewBox','0 0 24 24');_tmpSvg.style.cssText='width:200px;height:200px;';
        const _g=document.createElementNS('http://www.w3.org/2000/svg','g');
        _pathMatches.forEach(pd=>{const _p=document.createElementNS('http://www.w3.org/2000/svg','path');_p.setAttribute('d',pd);_g.appendChild(_p);});
        _tmpSvg.appendChild(_g);_wrap.appendChild(_tmpSvg);document.body.appendChild(_wrap);
        const bbox=_g.getBBox();document.body.removeChild(_wrap);
        if(bbox&&bbox.width>0&&bbox.height>0){
          const sw2=(parseFloat(d.iconSw)||1.8)/2;
          const vx=bbox.x-sw2,vy=bbox.y-sw2,vw=bbox.width+sw2*2,vh=bbox.height+sw2*2;
          _newSvg=_newSvg.replace(/viewBox="[^"]*"/,'viewBox="'+vx+' '+vy+' '+vw+' '+vh+'"');
          // Resize element to match new aspect ratio, preserve area
          const _area=d.w*d.h;
          const _aspect=vw/vh;
          const _nh=Math.round(Math.sqrt(_area/_aspect));
          const _nw=Math.round(_nh*_aspect);
          d.w=_nw;d.h=_nh;
          sel.style.width=_nw+'px';sel.style.height=_nh+'px';
          d.iconFitted=true;
        }
      }
    }catch(_e){}
    d.svgContent=_newSvg;
    var c=sel.querySelector('.ec');
    if(c){c.innerHTML=d.svgContent;var s=c.querySelector('svg');if(s){s.style.width='100%';s.style.height='100%';}}
  }
  save();if(typeof saveState==="function")saveState();
}


// ── Icon picker for bullet list — reuses the main icon modal ───────────────
function openIconPickerForList(bulletSpan, textData) {
  // Set callback — insertIconSelected() checks this before inserting as element
  window._listIconInsertCallback = function(ic) {
    if (textData) textData.bulletIconId = ic.id;
    var c = bulletSpan && bulletSpan.closest('.ec');
    if (!c) { window._listIconInsertCallback = null; return; }
    var cs = c.getAttribute('style') || '';
    var fsMatch = cs.match(/font-size:\s*([\d.]+)px/);
    var sz = Math.round(parseFloat(fsMatch ? fsMatch[1] : '24'));
    var style = document.getElementById('ic-style') ? document.getElementById('ic-style').value : 'stroke';
    var color = 'currentColor'; // always inherit text color for scheme-awareness
    var sw = parseFloat(document.getElementById('ic-sw') ? document.getElementById('ic-sw').value : '1.8') || 1.8;
    c.querySelectorAll('span[data-list-bullet]').forEach(function(sp) {
      sp.setAttribute('data-icon-id', ic.id);
      sp.setAttribute('data-icon-style', style);
      sp.setAttribute('data-icon-color', color);
      sp.setAttribute('data-icon-sw', sw);
      sp.innerHTML = _buildBulletIconSVG(ic, sz, style, color, sw);
    });
    var root = c.querySelector('.ec-valign-wrap') || c;
    if (textData) textData.html = root.innerHTML;
    if (typeof commitAll === 'function') commitAll();
    window._listIconInsertCallback = null;
  };
  openIconModal();
}
window.openIconPickerForList = openIconPickerForList;

// Cancel clears the callback
var _iconModalCancelBtn = document.querySelector && document.querySelector('#icon-modal .mbtn:not(.pri)');
// (cancel is handled inline in HTML — _listIconInsertCallback is auto-cleared by insertIconSelected or on next open)

// Build SVG for bullet icon with proper style/color/sw
function _buildBulletIconSVG(ic, sz, style, color, sw) {
  var svgStr = _buildIconSVG(ic, color || 'currentColor', sw || 1.8, style || 'stroke', false, null, null);
  return svgStr
    .replace('<svg ', '<svg width="' + sz + '" height="' + sz + '" ')
    .replace('style="width:100%;height:100%;overflow:hidden"', 'style="display:inline-block;vertical-align:middle;overflow:visible;flex-shrink:0;pointer-events:none"');
}
window._buildBulletIconSVG = _buildBulletIconSVG;


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

function _buildIconSVG(ic, color, sw, style){
  const paths=ic.p.split('||').map(p=>p.trim()).filter(Boolean);
  const pathEls=paths.map(p=>`<path d="${p}"/>`).join('');
  let attrs='';
  if(style==='fill') attrs=`fill="${color}" stroke="none"`;
  else if(style==='duotone') attrs=`fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  else attrs=`fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${attrs} style="width:100%;height:100%">${pathEls}</svg>`;
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
  if(!selIconId)return toast('Выберите иконку');
  const ic=ICONS.find(x=>x.id===selIconId);
  if(!ic)return;
  const color=document.getElementById('ic-color').value||'#3b82f6';
  const sw=parseFloat(document.getElementById('ic-sw').value)||1.8;
  const style=document.getElementById('ic-style').value||'stroke';
  const sz=snapV(180);
  const svgContent=_buildIconSVG(ic, color, sw, style);
  pushUndo();
  const d={
    id:'e'+(++ec), type:'icon',
    x:snapV(200), y:snapV(150), w:sz, h:sz,
    iconId:ic.id, iconPath:ic.p, iconColor:color, iconSw:sw, iconStyle:style,
    svgContent, rot:0, anims:[], shadow:false, shadowBlur:8, shadowColor:'#000000',
  };
  slides[cur].els.push(d); mkEl(d); save(); drawThumbs(); saveState();
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
  pushUndo();
  var d=slides[cur].els.find(function(e){return e.id===sel.dataset.id;});
  if(!d)return;
  if(prop==='color')d.iconColor=val;
  else if(prop==='sw')d.iconSw=parseFloat(val);
  else if(prop==='style')d.iconStyle=val;
  else if(prop==='shadow')d.shadow=val;
  else if(prop==='shadowBlur')d.shadowBlur=parseFloat(val);
  else if(prop==='shadowColor')d.shadowColor=val;
  var ic=ICONS.find(function(x){return x.id===d.iconId;});
  if(ic){
    d.svgContent=_buildIconSVG(ic,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke');
    var c=sel.querySelector('.ec');
    if(c){c.innerHTML=d.svgContent;var s=c.querySelector('svg');if(s){s.style.width='100%';s.style.height='100%';}}
  }
  save();saveState();
}

// ══════════════ ANIMATION PANEL ══════════════
const ANIM_CSS={
  fadeIn:'el-fadein',slideUp:'el-slideup',slideDown:'el-slidedown',slideLeft:'el-slideleft',slideRight:'el-slideright',
  zoomIn:'el-zoomin',spinIn:'el-spin',bounceIn:'el-bounce',
  fadeOut:'el-fadeout',slideOut:'el-slideout',zoomOut:'el-zoomout',
  pulse:'el-pulse',shake:'el-shake',flash:'el-flash',
};

const ANIM_CATS = [
  {
    cat: 'entrance', label: 'Вход',
    items: [
      {name:'fadeIn',    label:'Появление',  icon:'✨'},
      {name:'slideUp',   label:'Подъём',     icon:'⬆'},
      {name:'slideDown', label:'Спуск',      icon:'⬇'},
      {name:'slideLeft', label:'Влево',      icon:'⬅'},
      {name:'slideRight',label:'Вправо',     icon:'➡'},
      {name:'zoomIn',    label:'Увеличение', icon:'🔍'},
      {name:'bounceIn',  label:'Отскок',     icon:'⚡'},
      {name:'spinIn',    label:'Вращение',   icon:'🔄'},
    ]
  },
  {
    cat: 'emphasis', label: 'Выделение',
    items: [
      {name:'pulse', label:'Пульсация', icon:'💓'},
      {name:'shake', label:'Дрожание',  icon:'〰'},
      {name:'flash', label:'Мигание',   icon:'🔦'},
    ]
  },
  {
    cat: 'exit', label: 'Выход',
    items: [
      {name:'fadeOut',  label:'Исчезновение', icon:'💨'},
      {name:'slideOut', label:'Выезд',        icon:'↩'},
      {name:'zoomOut',  label:'Уменьшение',   icon:'🔎'},
    ]
  },
];

const ANIM_INFO = {};
ANIM_CATS.forEach(g => g.items.forEach(it => { ANIM_INFO[it.name] = {label:it.label, icon:it.icon, cat:g.cat}; }));

// Exposed globals so inline onclick handlers can access them
window._selectedAnimName = null;
window._selectedAnimCat  = null;
let _animPreviewTimer = null;

(function(){
  const _sel       = ()=> (typeof sel!=='undefined')?sel:null;
  const _slides    = ()=> (typeof slides!=='undefined')?slides:[];
  const _cur       = ()=> (typeof cur!=='undefined')?cur:0;
  const _save      = ()=> typeof save      ==='function'&&save();
  const _saveState = ()=> typeof saveState ==='function'&&saveState();
  const _pushUndo  = ()=> typeof pushUndo  ==='function'&&pushUndo();
  const _toast     = (m,t)=> typeof toast  ==='function'&&toast(m,t);

  window.openAnimPanel = function(){
    try{
      document.getElementById('anim-panel').classList.add('open');
      renderAnimPanel();
    }catch(e){ console.warn('[10-animations] openAnimPanel:', e.message); }
  };

  window.closeAnimPanel = function(){
    try{ document.getElementById('anim-panel').classList.remove('open'); }catch(e){}
  };

  window.setElTrigger = function(val){
    try{
      const el=_sel(); if(!el) return;
      if(val) el.dataset.isTrigger='true'; else delete el.dataset.isTrigger;
      _save(); renderAnimPanel(); _saveState();
    }catch(e){}
  };

  window.addAnim = function(animName, cat){ window.addAnimToSel(animName, cat); };

  // When adding new anim - just set delay=0 (relative), keep existing anims untouched
  // When removing - don't touch delays, they're relative and still correct
  function recalcDelays(anims){
    // Only reset the last anim's delay to 0 when freshly added
    // (called after push, so last element is new)
    if(anims.length > 0) anims[anims.length-1].delay = 0;
  }

  // Compute absolute start times for an array of anims (for preview/playback)
  // Returns array of {anim, absDelay} in ms
  window.computeAbsDelays = function(anims){
    let prevStart = 0;
    let prevDur = 0;
    return anims.map((a, i) => {
      const trigger = a.trigger || 'auto';
      const relDelay = a.delay || 0;
      let absDelay;
      if(i === 0){
        absDelay = relDelay;
      } else if(trigger === 'withPrev'){
        // Start at same time as previous + relative offset
        absDelay = prevStart + relDelay;
      } else {
        // auto/afterPrev: start after previous ends + relative offset
        absDelay = prevStart + prevDur + relDelay;
      }
      prevStart = absDelay;
      prevDur = a.duration || 600;
      return {anim: a, absDelay};
    });
  };

  window.addAnimToSel = function(animName, cat){
    try{
      const el=_sel(); if(!el){ alert('Выберите объект на слайде'); return; }
      _pushUndo();
      const s=_slides()[_cur()]; if(!s) return;
      const d=s.els.find(x=>x.id===el.dataset.id); if(!d) return;
      if(!d.anims) d.anims=[];
      d.anims.push({name:animName, cat, duration:600, delay:0, trigger:'auto'});
      el.dataset.anims=JSON.stringify(d.anims);
      _save(); renderAnimPanel(); _saveState();
    }catch(e){ console.warn('[10-animations] addAnimToSel:', e.message); }
  };

  // Called from "Добавить" button in HTML
  window.doAddSelectedAnim = function(){
    if(!window._selectedAnimName) return;
    window.addAnimToSel(window._selectedAnimName, window._selectedAnimCat);
  };

  window.removeAnim = function(elId, animIdx){
    try{
      _pushUndo();
      const s=_slides()[_cur()]; if(!s) return;
      const d=s.els.find(x=>x.id===elId); if(!d||!d.anims) return;
      d.anims.splice(animIdx,1);
      // No delay recalc - delays are relative, they stay valid
      const domEl=document.getElementById('canvas').querySelector('[data-id="'+elId+'"]');
      if(domEl) domEl.dataset.anims=JSON.stringify(d.anims);
      _save(); renderAnimPanel(); _saveState();
    }catch(e){}
  };

  window.updateAnimProp = function(elId, animIdx, prop, val){
    try{
      const s=_slides()[_cur()]; if(!s) return;
      const d=s.els.find(x=>x.id===elId); if(!d||!d.anims||!d.anims[animIdx]) return;
      if(val === undefined){ delete d.anims[animIdx][prop]; }
      else if(prop==='duration'||prop==='delay'||prop==='navTarget') d.anims[animIdx][prop]=+val;
      else d.anims[animIdx][prop]=val;
      const domEl=document.getElementById('canvas').querySelector('[data-id="'+elId+'"]');
      if(domEl) domEl.dataset.anims=JSON.stringify(d.anims);
      _save(); _saveState();
    }catch(e){}
  };

  window.clearAllAnims = function(){
    try{
      _pushUndo();
      const s=_slides()[_cur()]; if(!s) return;
      s.els.forEach(d=>{d.anims=[];});
      document.getElementById('canvas').querySelectorAll('.el').forEach(el=>{el.dataset.anims='[]';});
      _save(); renderAnimPanel(); _saveState();
      _toast('Все анимации удалены','ok');
    }catch(e){}
  };

  // Play single animation on element without accumulated delay
  function playAnimOnEl(animName){
    const el = _sel(); if(!el) return;
    const cssClass = ANIM_CSS[animName]; if(!cssClass) return;
    el.style.animation = '';
    void el.offsetWidth;
    el.style.animation = cssClass + ' 0.6s ease-out 0s both';
    clearTimeout(_animPreviewTimer);
    _animPreviewTimer = setTimeout(()=>{ el.style.animation = ''; }, 700);
  }

  window.renderAnimPanel = function(){
    try{
      renderAnimCategoryGrid();
      renderAssignedAnims();
    }catch(e){ console.warn('[10-animations] renderAnimPanel:', e.message); }
  };

  function renderAnimCategoryGrid(){
    const container = document.getElementById('anim-slide-list');
    if(!container) return;
    container.innerHTML = '';
    const el = _sel();
    const assignedNames = new Set();
    if(el){
      const s=_slides()[_cur()];
      const d=s&&s.els.find(x=>x.id===el.dataset.id);
      if(d&&d.anims) d.anims.forEach(a=>assignedNames.add(a.name));
    }
    ANIM_CATS.forEach(group => {
      const section = document.createElement('div');
      section.className = 'anim-cat-section';
      const title = document.createElement('div');
      title.className = 'anim-cat-title ' + group.cat;
      title.textContent = group.label;
      section.appendChild(title);
      const grid = document.createElement('div');
      grid.className = 'anim-cat-grid';
      group.items.forEach(it => {
        const item = document.createElement('div');
        const isAssigned = assignedNames.has(it.name);
        const isSelected = window._selectedAnimName === it.name;
        item.className = 'anim-item' + (isAssigned?' assigned':'') + (isSelected?' selected':'');
        item.dataset.anim = it.name;
        item.title = it.label;
        const iconDiv = document.createElement('div');
        iconDiv.className = 'anim-item-icon ' + group.cat;
        iconDiv.textContent = it.icon;
        const labelDiv = document.createElement('div');
        labelDiv.className = 'anim-item-label';
        labelDiv.textContent = it.label;
        item.appendChild(iconDiv);
        item.appendChild(labelDiv);
        item.addEventListener('mousedown', e => e.preventDefault());
        item.addEventListener('click', e => {
          e.preventDefault();
          window._selectedAnimName = it.name;
          window._selectedAnimCat  = group.cat;
          // highlight selected
          container.querySelectorAll('.anim-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          // update button text
          const addBtn = document.getElementById('anim-add-btn');
          if(addBtn){ addBtn.disabled=false; addBtn.textContent='Добавить «'+it.label+'»'; }
          // play on canvas element
          playAnimOnEl(it.name);
        });
        grid.appendChild(item);
      });
      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  function renderAssignedAnims(){
    const container = document.getElementById('anim-assigned-list');
    if(!container) return;

    const s = _slides()[_cur()];
    const selEl = _sel();
    const typeIcons = {text:'T', image:'🖼', shape:'◆', table:'⊞', icon:'★', code:'<>', markdown:'M'};
    const typeNames = {text:'Текст', image:'Изображение', shape:'Фигура', table:'Таблица', icon:'Иконка', code:'Код', markdown:'Markdown'};

    const byEl = [];
    if(s && s.els) s.els.forEach(d=>{ if(d.anims&&d.anims.length) byEl.push({d,anims:d.anims}); });
    const total = byEl.reduce((n,x)=>n+x.anims.length, 0);

    // Always reset container
    container.innerHTML = '';

    if(!total){
      container.innerHTML = '<div style="font-size:10px;color:var(--text3);text-align:center;padding:16px 8px">Нет анимаций на слайде</div>';
      return;
    }

    // Header
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);padding:3px 0 5px;border-bottom:1px solid var(--border);margin-bottom:5px;';
    lbl.textContent = 'Анимации слайда (' + total + ')';
    container.appendChild(lbl);

    byEl.forEach(({d, anims}) => {
      const isSelected = selEl && selEl.dataset.id === d.id;
      const sameType = (s&&s.els||[]).filter(x=>x.type===d.type);
      const idx = sameType.length > 1 ? sameType.findIndex(x=>x.id===d.id)+1 : 0;
      const typeName = (typeNames[d.type]||d.type||'Объект') + (idx>0?' '+idx:'');

      const elHdr = document.createElement('div');
      elHdr.style.cssText = 'font-size:9px;color:'+(isSelected?'var(--accent)':'var(--text2)')+';font-weight:600;padding:6px 0 3px;';
      elHdr.textContent = (typeIcons[d.type]||'◆') + ' ' + typeName;
      container.appendChild(elHdr);

      anims.forEach((a, ai) => {
        const info = ANIM_INFO[a.name] || {label:a.name, cat:'entrance'};
        const catLabel = info.cat==='entrance'?'Вход':info.cat==='exit'?'Выход':'Акцент';
        const trigger = a.trigger || 'auto';
        const slideCount = _slides().length;

        const row = document.createElement('div');
        row.className = 'anim-row';
        if(isSelected) row.style.borderColor = 'color-mix(in srgb, var(--accent) 40%, transparent)';

        const head = document.createElement('div');
        head.className = 'anim-row-head';
        head.innerHTML = `<span class="anim-cat ${info.cat}">${catLabel}</span><span class="anim-name">${info.label}</span>`;
        const delBtn = document.createElement('button');
        delBtn.className = 'anim-del'; delBtn.title = 'Удалить'; delBtn.textContent = '✕';
        delBtn.addEventListener('mousedown', e=>e.preventDefault());
        delBtn.addEventListener('click', ()=>removeAnim(d.id, ai));
        head.appendChild(delBtn);
        row.appendChild(head);

        const props = document.createElement('div');
        props.className = 'anim-row-props';
        props.innerHTML = `
          <label>Задержка, мс<input type="number" value="${a.delay||0}" min="0" max="10000" step="100" onchange="updateAnimProp('${d.id}',${ai},'delay',this.value)"></label>
          <label>Длит., мс<input type="number" value="${a.duration||600}" min="50" max="5000" step="50" onchange="updateAnimProp('${d.id}',${ai},'duration',this.value)"></label>`;
        row.appendChild(props);

        const trigSel = document.createElement('select');
        trigSel.style.cssText = 'width:100%;background:var(--surface3);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:2px 5px;font-size:9px;font-family:inherit;margin-top:4px;';
        [{v:'auto',l:'▶ Авто'},{v:'click',l:'🖱 После клика'},{v:'withPrev',l:'⟳ Вместе с предыдущей'}].forEach(opt=>{
          const o=document.createElement('option'); o.value=opt.v; o.textContent=opt.l;
          if(trigger===opt.v) o.selected=true;
          trigSel.appendChild(o);
        });
        trigSel.addEventListener('mousedown', e=>e.stopPropagation());
        trigSel.addEventListener('change', ()=>updateAnimProp(d.id, ai, 'trigger', trigSel.value));
        row.appendChild(trigSel);

        const navRow = document.createElement('div');
        navRow.style.cssText = 'margin-top:4px;display:flex;align-items:center;gap:4px;';
        const navCheck = document.createElement('input');
        navCheck.type='checkbox'; navCheck.style.cssText='accent-color:var(--accent);flex-shrink:0;';
        navCheck.checked = (trigger==='nav' || typeof a.navTarget==='number');
        const navLabel = document.createElement('label');
        navLabel.style.cssText='font-size:9px;color:var(--text2);display:flex;align-items:center;gap:4px;cursor:pointer;flex:1;min-width:0;';
        navLabel.textContent='→ Слайд:';
        // Build slide select
        const navSel = document.createElement('select');
        navSel.style.cssText='flex:1;min-width:0;background:var(--surface3);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:2px 4px;font-size:9px;font-family:inherit;';
        navSel.disabled = !navCheck.checked;
        _slides().forEach((ss, si) => {
          const o = document.createElement('option');
          o.value = si;
          o.textContent = (si+1) + '. ' + (ss.title||('Слайд '+(si+1)));
          if(si === (typeof a.navTarget==='number' ? a.navTarget : _cur()+1)) o.selected = true;
          navSel.appendChild(o);
        });
        const applyNav = ()=>{
          if(navCheck.checked){ updateAnimProp(d.id,ai,'trigger','nav'); updateAnimProp(d.id,ai,'navTarget',+navSel.value); }
          else { updateAnimProp(d.id,ai,'trigger',trigSel.value); updateAnimProp(d.id,ai,'navTarget',undefined); }
        };
        navCheck.addEventListener('mousedown', e=>e.stopPropagation());
        navCheck.addEventListener('change', ()=>{ navSel.disabled=!navCheck.checked; applyNav(); });
        navSel.addEventListener('mousedown', e=>e.stopPropagation());
        navSel.addEventListener('change', applyNav);
        navLabel.prepend(navCheck); navLabel.appendChild(navSel);
        navRow.appendChild(navLabel);
        row.appendChild(navRow);
        container.appendChild(row);
      });
    });
  }

})();

// Close anim-more-menu when clicking outside
document.addEventListener('mousedown', function(e) {
  var menu = document.getElementById('anim-more-menu');
  if(menu && menu.style.display==='block' && !menu.contains(e.target)){
    menu.style.display='none';
  }
});

// Play animations on element click while anim panel is open
document.addEventListener('mousedown', function(e) {
  var panel = document.getElementById('anim-panel');
  if(!panel || !panel.classList.contains('open')) return;
  var el = e.target.closest('.el');
  if(!el) return;
  try{
    var anims = el.dataset.anims ? JSON.parse(el.dataset.anims) : [];
    if(!anims.length) return;
    // Use inner .ec for shapes (they have transform:rotate on .el)
    var target = (el.dataset.type === 'shape' || el.dataset.type === 'icon') ? (el.querySelector('.ec') || el) : el;
    target.style.animation = '';
    void target.offsetWidth;
    var parts = anims.map(function(a){
      var cssName = ANIM_CSS[a.name] || 'el-fadein';
      var dur = (a.duration || 600) / 1000;
      return cssName + ' ' + dur + 's ease-out 0s both';
    });
    target.style.animation = parts.join(',');
    var maxDur = anims.reduce(function(m,a){ return Math.max(m, a.duration||600); }, 600);
    setTimeout(function(){ target.style.animation = ''; }, maxDur + 100);
  }catch(ex){}
});

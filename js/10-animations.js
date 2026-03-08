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
  {
    cat: 'motion', label: 'Перемещение',
    items: [
      {name:'moveTo', label:'Переместить', icon:'↗'},
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
      // Show anim panel in props (handled by 04-ui.js switchTab)
      // Just ensure panel body exists and render
      const wrap = document.getElementById('props-anim-wrap');
      const body = document.getElementById('anim-panel-body');
      if(wrap && body && !window._animInProps){
        wrap.appendChild(body);
        window._animInProps = true;
      }
      if(wrap) wrap.style.display='flex';
      const scroll = document.getElementById('props-scroll');
      if(scroll) scroll.style.display='none';
      renderAnimPanel();
    }catch(e){ console.warn('[10-animations] openAnimPanel:', e.message); }
  };

  window.closeAnimPanel = function(){
    try{
      const wrap = document.getElementById('props-anim-wrap');
      const scroll = document.getElementById('props-scroll');
      if(wrap) wrap.style.display='none';
      if(scroll) scroll.style.display='';
    }catch(e){}
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
      const anim = {name:animName, cat, duration:600, delay:0, trigger:'auto'};
      // For moveTo: default offset = 100px right, initial ghost visible
      if(animName==='moveTo'){ anim.tx=100; anim.ty=0; }
      d.anims.push(anim);
      el.dataset.anims=JSON.stringify(d.anims);
      _save(); renderAnimPanel(); _saveState();
      if(animName==='moveTo' && typeof renderMotionOverlay==='function') renderMotionOverlay();
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
      if(typeof renderMotionOverlay==='function') renderMotionOverlay();
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
    if(!window._openAnimCat) window._openAnimCat = 'entrance';

    ANIM_CATS.forEach(group => {
      const section = document.createElement('div');
      section.className = 'anim-cat-section';

      const title = document.createElement('div');
      title.className = 'anim-cat-title ' + group.cat;
      title.style.cursor = 'pointer';
      title.style.display = 'flex';
      title.style.justifyContent = 'space-between';
      title.style.alignItems = 'center';
      const titleText = document.createElement('span');
      titleText.textContent = group.label;
      const chevron = document.createElement('span');
      chevron.style.cssText = 'font-size:9px;transition:transform .2s;display:inline-block;opacity:.7';
      chevron.textContent = '▼';
      title.appendChild(titleText);
      title.appendChild(chevron);
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'anim-cat-grid';
      const isOpen = window._openAnimCat === group.cat;
      grid.style.display = isOpen ? '' : 'none';
      chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';

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
          container.querySelectorAll('.anim-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          const addBtn = document.getElementById('anim-add-btn');
          if(addBtn){ addBtn.disabled=false; addBtn.textContent='Добавить «'+it.label+'»'; }
          playAnimOnEl(it.name);
        });
        grid.appendChild(item);
      });

      title.addEventListener('click', () => {
        if(window._openAnimCat === group.cat) return;
        window._openAnimCat = group.cat;
        container.querySelectorAll('.anim-cat-grid').forEach(g => { g.style.display = 'none'; });
        container.querySelectorAll('.anim-cat-title span:last-child').forEach(c => { c.style.transform = 'rotate(-90deg)'; });
        grid.style.display = '';
        chevron.style.transform = 'rotate(0deg)';
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
    const typeNames = {text:'Текст', image:'Изображение', shape:'Фигура', table:'Таблица', icon:'Иконка', code:'Код', markdown:'Markdown', svg:'SVG'};

    // Build flat list of all anims across all elements
    const allAnims = [];
    if(s && s.els) s.els.forEach(d=>{
      if(d.anims && d.anims.length){
        const sameType = s.els.filter(x=>x.type===d.type);
        const idx = sameType.length > 1 ? sameType.findIndex(x=>x.id===d.id)+1 : 0;
        const elName = (typeNames[d.type]||d.type||'Объект') + (idx>0?' '+idx:'');
        d.anims.forEach((a, ai) => allAnims.push({d, a, ai, elName}));
      }
    });

    container.innerHTML = '';

    if(!allAnims.length){
      container.innerHTML = '<div style="font-size:10px;color:var(--text3);text-align:center;padding:16px 8px">Нет анимаций на слайде</div>';
      return;
    }

    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);padding:3px 0 5px;border-bottom:1px solid var(--border);margin-bottom:4px;';
    lbl.textContent = 'Анимации слайда (' + allAnims.length + ')';
    container.appendChild(lbl);

    allAnims.forEach(({d, a, ai, elName}, flatIdx) => {
      const info = ANIM_INFO[a.name] || {label:a.name, cat:'entrance'};
      const catLabel = info.cat==='entrance'?'Вход':info.cat==='exit'?'Выход':info.cat==='motion'?'Движение':'Акцент';
      const trigger = a.trigger || 'auto';
      const isSelected = selEl && selEl.dataset.id === d.id;

      const row = document.createElement('div');
      row.className = 'anim-row' + (isSelected ? ' anim-row-sel' : '');
      row.dataset.elId = d.id;
      row.dataset.ai = ai;
      row.dataset.animJson = JSON.stringify(a);

      // ── Header (drag handle + click to toggle) ──
      const TRIGGER_ICONS = {
        auto: '▶',
        click: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" width="10" height="10" style="vertical-align:middle"><path d="M5 1v7l2-1.5 1.5 3 1-.5-1.5-3 2.5-.5z"/></svg>',
        withPrev: '⟳'
      };
      const trigIcon = TRIGGER_ICONS[trigger] || '▶';
      const head = document.createElement('div');
      head.className = 'anim-row-head';
      head.innerHTML = `<span class="anim-drag-handle" title="Перетащить" style="cursor:grab;color:var(--text3);font-size:10px;flex-shrink:0;padding:0 2px;user-select:none">⠿</span><span class="anim-cat ${info.cat}">${catLabel}</span><span class="anim-name">${info.label}</span><span class="anim-trig-icon" style="font-size:10px;color:var(--text3);flex-shrink:0;line-height:1">${trigIcon}</span><span class="anim-el-name">${elName}</span>`;

      const delBtn = document.createElement('button');
      delBtn.className = 'anim-del'; delBtn.title = 'Удалить'; delBtn.textContent = '✕';
      delBtn.addEventListener('mousedown', e=>e.preventDefault());
      delBtn.addEventListener('click', e=>{e.stopPropagation(); removeAnim(d.id, ai);});
      head.appendChild(delBtn);
      row.appendChild(head);

      // Drag-to-reorder
      const handle = head.querySelector('.anim-drag-handle');
      handle.addEventListener('mousedown', e=>{
        e.preventDefault(); e.stopPropagation();
        row.style.opacity = '0.5';
        let didDrag = false;

        const onMove = mv => {
          didDrag = true;
          const rows = [...container.querySelectorAll('.anim-row')];
          const target = rows.find(r => {
            if(r === row) return false;
            const rect = r.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            const rowRect = row.getBoundingClientRect();
            const rowMid = rowRect.top + rowRect.height / 2;
            // Insert before if dragging up and cursor above target mid, insert after if dragging down and cursor below target mid
            if(rowMid < rect.top) return mv.clientY > mid; // row is above target
            if(rowMid > rect.bottom) return mv.clientY < mid; // row is below target
            return false;
          });
          if(target){
            const rows2 = [...container.querySelectorAll('.anim-row')];
            const fromIdx = rows2.indexOf(row);
            const toIdx = rows2.indexOf(target);
            if(toIdx > fromIdx) target.after(row); else target.before(row);
          }
        };

        const onUp = e2=>{
          row.style.opacity = '';
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);

          if(!didDrag) return; // normal click — let it propagate naturally

          // Rebuild anim arrays from DOM order + stored JSON
          if(s && s.els){
            const finalRows = [...container.querySelectorAll('.anim-row')];

            // Group new anim order by elId
            const newAnimsByEl = {};
            finalRows.forEach(r => {
              const elId = r.dataset.elId;
              if(!elId || !r.dataset.animJson) return;
              if(!newAnimsByEl[elId]) newAnimsByEl[elId] = [];
              try{ newAnimsByEl[elId].push(JSON.parse(r.dataset.animJson)); } catch(e){}
            });

            // Update data model
            s.els.forEach(dd => {
              if(newAnimsByEl[dd.id] !== undefined) dd.anims = newAnimsByEl[dd.id];
            });

            // Update canvas DOM dataset.anims so save() reads correct order
            const canvas = document.getElementById('canvas');
            s.els.forEach(dd => {
              if(!dd.anims) return;
              const domEl = canvas ? canvas.querySelector(`.el[data-id="${dd.id}"]`) : null;
              if(domEl) domEl.dataset.anims = JSON.stringify(dd.anims);
            });

            _save(); _saveState();
          }
          renderAnimPanel();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // ── Props (collapsed by default) ──
      const props = document.createElement('div');
      props.className = 'anim-row-props-wrap';
      props.style.display = 'none';

      const propGrid = document.createElement('div');
      propGrid.className = 'anim-row-props';
      propGrid.innerHTML = `
        <label>Задержка, мс<input type="number" value="${a.delay||0}" min="0" max="10000" step="100" onchange="updateAnimProp('${d.id}',${ai},'delay',this.value)"></label>
        <label>Длит., мс<input type="number" value="${a.duration||600}" min="50" max="5000" step="50" onchange="updateAnimProp('${d.id}',${ai},'duration',this.value)"></label>`;
      props.appendChild(propGrid);

      // moveTo: show tx/ty fields + trigger
      if(a.name === 'moveTo'){
        const motionGrid = document.createElement('div');
        motionGrid.className = 'anim-row-props';
        motionGrid.style.marginTop = '4px';
        motionGrid.innerHTML = `
          <label>Смещение X<input type="number" value="${a.tx||0}" step="1" onchange="updateAnimProp('${d.id}',${ai},'tx',+this.value);if(typeof renderMotionOverlay==='function')renderMotionOverlay()"></label>
          <label>Смещение Y<input type="number" value="${a.ty||0}" step="1" onchange="updateAnimProp('${d.id}',${ai},'ty',+this.value);if(typeof renderMotionOverlay==='function')renderMotionOverlay()"></label>`;
        props.appendChild(motionGrid);
        const hint = document.createElement('div');
        hint.style.cssText='font-size:8px;color:var(--text3);margin-top:5px;line-height:1.4;';
        hint.textContent='↗ Перетащите бледную копию объекта чтобы задать точку назначения';
        props.appendChild(hint);
      }

      // Trigger select for all anims
      {
        const trigSel = document.createElement('select');
        trigSel.style.cssText = 'width:100%;background:var(--surface3);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:2px 5px;font-size:9px;font-family:inherit;margin-top:4px;';
        [{v:'auto',l:'▶ Авто'},{v:'click',l:'После клика'},{v:'withPrev',l:'⟳ Вместе с предыдущей'}].forEach(opt=>{
          const o=document.createElement('option'); o.value=opt.v; o.textContent=opt.l;
          if(trigger===opt.v) o.selected=true;
          trigSel.appendChild(o);
        });
        trigSel.addEventListener('mousedown', e=>e.stopPropagation());
        trigSel.addEventListener('change', ()=>{
          updateAnimProp(d.id, ai, 'trigger', trigSel.value);
          const iconSpan = head.querySelector('.anim-trig-icon');
          if(iconSpan) iconSpan.innerHTML = TRIGGER_ICONS[trigSel.value] || '▶';
        });
        props.appendChild(trigSel);
      }

      const navRow = document.createElement('div');
      navRow.style.cssText = 'margin-top:4px;display:flex;align-items:center;gap:4px;';
      const navCheck = document.createElement('input');
      navCheck.type='checkbox';
      navCheck.className='tog'; // use CSS later — for now inline
      navCheck.style.cssText='accent-color:var(--accent);flex-shrink:0;';
      navCheck.checked = (trigger==='nav' || typeof a.navTarget==='number');
      const navLabel = document.createElement('label');
      navLabel.style.cssText='font-size:9px;color:var(--text2);display:flex;align-items:center;gap:4px;cursor:pointer;flex:1;min-width:0;';
      navLabel.textContent='→ Слайд:';
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
      props.appendChild(navRow);

      row.appendChild(props);

      // Toggle on header click
      head.addEventListener('click', e=>{
        if(e._fromDrag) return;
        const open = props.style.display !== 'none';
        props.style.display = open ? 'none' : 'block';
        row.classList.toggle('anim-row-open', !open);
      });

      container.appendChild(row);
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

let pidx=0,pTransiting=false,autoTimer=null;
const playedAnimSlides=new Set(); // tracks which slides had their nav-anims already played
const hiddenElsPerSlide={}; // slideIdx -> Set of elIds that have been hidden by nav trigger
function startPreview(startIdx){
  // If a table cell is being edited, save its content first
  if(typeof tblClearSel==='function') tblClearSel();
  if(typeof pnLock==='function') pnLock(); // freeze PN settings during preview
  const editingCell=document.querySelector('.el[data-editing="true"] td[contenteditable="true"],.el[data-editing="true"] th[contenteditable="true"]');
  if(editingCell){ editingCell.contentEditable='false'; }
  save();pidx=startIdx||0;pTransiting=false;

  _shuffleHistory=[pidx];
  // Apply theme accent color to progress bar — prefer appliedThemeIdx (persisted) over selTheme
  {const _ti=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx:(typeof selTheme!=='undefined'&&selTheme>=0?selTheme:-1);
  if(_ti>=0&&_ti<THEMES.length){
    const t=THEMES[_ti];
    const ac1=t.ac1||'#6366f1',ac2=t.ac2||'#818cf8';
    document.getElementById('p-prog').style.background=`linear-gradient(90deg,${ac1},${ac2})`;
  } else {
    document.getElementById('p-prog').style.background='linear-gradient(90deg,var(--accent),var(--accent3))';
  }}
  // Blur any focused input to prevent cursor blinking in preview
  if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur();
  // Also exit any text editing mode
  document.querySelectorAll('.el[data-editing=true]').forEach(el=>{
    const c=el.querySelector('.tel');if(c){c.contentEditable='false';delete el.dataset.editing;el.style.cursor='';}
  });
  playedAnimSlides.clear();Object.keys(hiddenElsPerSlide).forEach(k=>delete hiddenElsPerSlide[k]);
  const po=document.getElementById('preview-ov');po.classList.add('active');
  resizePStage();window.addEventListener('resize',resizePStage);
  // Click anywhere on stage (not on nav buttons or link elements) advances or fires next anim step
  const po2=document.getElementById('preview-ov');
  po2._stageClick=function(e){
    if(e.target.closest('#p-prev,#p-next,#p-exit,#p-info'))return;
    const psel=e.target.closest('.psel');
    if(psel&&psel._hasLink)return;
    if(psel&&psel._isTrigger)return;
    // Check per-slide clickNav (default true)
    if(slides[pidx]&&slides[pidx].clickNav===false){
      // Still fire click-triggered animations, just don't advance to next slide
      const psa=document.getElementById('psa');
      if(psa._fireNextStep)psa._fireNextStep();
      return;
    }
    nextPreview();
  };
  po2.addEventListener('click',po2._stageClick);
  // Listen for timer navigation messages from applet iframes
  window._timerNavHandler = function(e){
    if(!e.data || e.data.type!=='timerNav') return;
    if(e.data.mode==='next'){
      nextPreview();
    } else if(e.data.mode==='slide'){
      const to=e.data.slide;
      if(typeof to==='number' && to>=0 && to<slides.length) gotoPreview(to,'next');
    }
  };
  window.addEventListener('message', window._timerNavHandler);
  const sc=pScale();
  buildPSlide(document.getElementById('psa'),pidx);
  document.getElementById('psb').innerHTML='';
  document.getElementById('psa').style.cssText='position:absolute;inset:0;width:'+canvasW+'px;height:'+canvasH+'px;transform:scale('+sc+');transform-origin:top left;';
  document.getElementById('psb').style.cssText='position:absolute;inset:0;opacity:0;pointer-events:none;width:'+canvasW+'px;height:'+canvasH+'px;transform:scale('+sc+');transform-origin:top left;';
  updatePUI();scheduleAuto();
  po.requestFullscreen&&po.requestFullscreen().then(()=>resizePStage()).catch(()=>{});
}
function stopPreview(){
  clearAutoTimer();

  const po=document.getElementById('preview-ov');
  if(po._stageClick){po.removeEventListener('click',po._stageClick);delete po._stageClick;}
  if(window._timerNavHandler){window.removeEventListener('message',window._timerNavHandler);delete window._timerNavHandler;}
  po.classList.remove('active');
  document.fullscreenElement&&document.exitFullscreen&&document.exitFullscreen();
  window.removeEventListener('resize',resizePStage);
  // Remember selected id before load() clears sel
  const _prevSelId = sel ? sel.dataset.id : null;
  // Re-render current slide from data so all styles (textBg etc.) are restored
  load();
  // Re-apply text backgrounds from model data (dataset may be stale after preview)
  requestAnimationFrame(()=>{
    const _cv=document.getElementById('canvas');
    _cv.querySelectorAll('.el').forEach(el=>{
      // Re-render tables that may have lost their DOM after preview
      if(el.dataset.type==='table'&&typeof renderTableEl==='function'){
        const d=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);
        if(d){ d.w=parseInt(el.style.width)||d.w; d.h=parseInt(el.style.height)||d.h; renderTableEl(el,d); }
      }
      if(el.dataset.type==='text'){
        // Re-stamp dataset from model to guarantee it's current
        const d=slides[cur]&&slides[cur].els.find(x=>x.id===el.dataset.id);
        if(d){
          if(d.textBg)el.dataset.textBg=d.textBg; else delete el.dataset.textBg;
          if(d.textBgOp!=null)el.dataset.textBgOp=d.textBgOp; else delete el.dataset.textBgOp;
          if(d.textBgBlur>0)el.dataset.textBgBlur=d.textBgBlur; else delete el.dataset.textBgBlur;
          if(d.textBgGrad)el.dataset.textBgGrad='1'; else delete el.dataset.textBgGrad;
          if(d.textBgCol2)el.dataset.textBgCol2=d.textBgCol2; else delete el.dataset.textBgCol2;
          if(d.textBgDir!=null)el.dataset.textBgDir=d.textBgDir; else delete el.dataset.textBgDir;
        }
        if(typeof applyTextBg==='function') applyTextBg(el);
      }
      // Force-rebuild icon SVG from data so shadow is always correct after preview
      if(el.dataset.type==='icon'){
        const d=slides[cur].els.find(function(e){return e.id===el.dataset.id;});
        if(!d)return;
        // If icon was fitted (tight viewBox saved in svgContent), use that directly
        const svg=d.iconFitted&&d.svgContent
          ? d.svgContent
          : (()=>{ const ic=typeof ICONS!=='undefined'?ICONS.find(function(x){return x.id===d.iconId;}):null;
              return (ic&&typeof _buildIconSVG!=='undefined')
                ?_buildIconSVG(ic,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke',d.shadow,d.shadowBlur,d.shadowColor)
                :(d.svgContent||''); })();
        const c=el.querySelector('.ec');
        if(c){c.innerHTML=svg;const s=c.querySelector('svg');if(s){s.style.width='100%';s.style.height='100%';}}
      }
    });
  });
  // Restore page numbering UI state (pnUnlock also calls pnSyncUI)
  if(typeof pnUnlock==='function') pnUnlock();
  // Re-apply page numbers after rAF finishes rebuilding DOM
  requestAnimationFrame(()=>{ if(typeof pnApplyAll==='function') pnApplyAll(); requestAnimationFrame(()=>{ if(_prevSelId){const _resel=document.querySelector(`.el[data-id="${_prevSelId}"]`);if(_resel&&typeof pick==='function')pick(_resel);} }); });
}
function resizePStage(){
  const stage=document.getElementById('preview-stage');const sc=pScale();
  stage.style.width=Math.round(canvasW*sc)+'px';stage.style.height=Math.round(canvasH*sc)+'px';
  [document.getElementById('psa'),document.getElementById('psb')].forEach(s=>{
    s.style.width=canvasW+'px';s.style.height=canvasH+'px';s.style.transform='scale('+sc+')';s.style.transformOrigin='top left';
  });
}
function pScale(){return Math.min(window.innerWidth/canvasW,window.innerHeight/canvasH);}
function gotoPreview(to,dir){
  const trans=(slides[to]&&slides[to].trans)||globalTrans||'none';
  if(trans==='none'||transitionDur===0){
    // Cancel any running transition immediately
    if(pTransiting){
      const a=document.getElementById('psa'),b=document.getElementById('psb');
      a.style.transition='none';b.style.transition='none';
      pTransiting=false;
    }
    buildPSlide(document.getElementById('psa'),to);
    pidx=to;updatePUI();scheduleAuto();return;
  }
  // If already transitioning — finish it instantly then start new
  if(pTransiting){
    const _a=document.getElementById('psa'),_b=document.getElementById('psb');
    _a.style.transition='none';_b.style.transition='none';
    pTransiting=false;
  }
  pTransiting=true;const a=document.getElementById('psa'),b=document.getElementById('psb');buildPSlide(b,to,transitionDur);
  if(trans==='morph')doMorphTransition(a,b,to,()=>{finalizePreview(a,b,to);});
  else animTrans(a,b,trans,dir==='next',transitionDur,()=>{finalizePreview(a,b,to);});
}
function finalizePreview(a,b,to){
  // Stop any ongoing transitions
  a.style.transition='none'; b.style.transition='none';
  const sc=pScale();
  // Swap IDs so b becomes psa (active) without moving any DOM nodes.
  // Moving srcdoc iframes in DOM causes browser to reload them — killing live timers.
  a.id='psb'; b.id='psa';
  b.style.cssText='position:absolute;inset:0;width:'+canvasW+'px;height:'+canvasH+'px;transform:scale('+sc+');transform-origin:top left;';
  a.style.cssText='position:absolute;inset:0;opacity:0;pointer-events:none;width:'+canvasW+'px;height:'+canvasH+'px;transform:scale('+sc+');transform-origin:top left;';
  pidx=to;updatePUI();pTransiting=false;scheduleAuto();
}
// Morph transition — match elements by position/size similarity
function doMorphTransition(a,b,to,cb){
  const sc=pScale(),dur=transitionDur;
  b.style.opacity='1';b.style.pointerEvents='auto';
  // Animate b-elements from a-positions where matched
  const fromSlide=slides[pidx]||{els:[]};const toSlide=slides[to]||{els:[]};
  const bEls=b.querySelectorAll('.psel');
  bEls.forEach((bel,i)=>{
    const td=toSlide.els[i];const fd=fromSlide.els.find(f=>f.type===td.type)||(fromSlide.els[0]);
    if(fd){
      const dx=fd.x-td.x,dy=fd.y-td.y;
      const sw=fd.w/td.w,sh=fd.h/td.h;
      bel.style.transition='none';bel.style.transform=`translate(${dx}px,${dy}px) scale(${sw},${sh})`;bel.style.opacity='0';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        bel.style.transition=`transform ${dur}ms cubic-bezier(.4,0,.2,1), opacity ${dur*.4}ms ease`;
        bel.style.transform='translate(0,0) scale(1,1)';bel.style.opacity='1';
      }));
    }
  });
  a.style.transition='opacity '+dur+'ms ease';a.style.opacity='0';
  setTimeout(cb,dur+80);
}
let presShuffle=false,presLoop=false,_shuffleHistory=[];

function togglePresShuffle(){
  presShuffle=!presShuffle;
  const btn=document.getElementById('p-shuffle-btn');
  if(btn)btn.classList.toggle('active',presShuffle);
  if(presShuffle){_shuffleHistory=[pidx];}
  updatePUI(); // refresh next/prev button states
}
function togglePresLoop(){
  presLoop=!presLoop;
  const btn=document.getElementById('p-loop-btn');
  if(btn)btn.classList.toggle('active',presLoop);
  updatePUI(); // refresh next/prev button states
}

function nextPreview(){
  if(pTransiting)return;
  const psa=document.getElementById('psa');
  if(psa._fireNextStep&&psa._fireNextStep())return;
  if(presShuffle){
    const available=slides.map((_,i)=>i).filter(i=>i!==pidx);
    if(!available.length)return; // only 1 slide
    const next=available[Math.floor(Math.random()*available.length)];
    clearAutoTimer();_shuffleHistory.push(next);gotoPreview(next,'next');
    return;
  }
  if(pidx>=slides.length-1){
    if(presLoop){clearAutoTimer();gotoPreview(0,'next');}
    return;
  }
  clearAutoTimer();gotoPreview(pidx+1,'next');
}
function prevPreview(){
  if(pTransiting)return;
  if(presShuffle&&_shuffleHistory.length>1){
    _shuffleHistory.pop();
    clearAutoTimer();gotoPreview(_shuffleHistory[_shuffleHistory.length-1],'prev');
    return;
  }
  if(pidx<=0)return;
  clearAutoTimer();gotoPreview(pidx-1,'prev');
}
function scheduleAuto(){
  clearAutoTimer();const s=slides[pidx];const delay=(s&&s.auto>0)?s.auto*1000:0;
  const isLast=pidx>=slides.length-1;
  if(delay>0){
    const doNext=()=>{
      if(presShuffle){
        const available=slides.map((_,i)=>i).filter(i=>i!==pidx);
        if(available.length){const next=available[Math.floor(Math.random()*available.length)];_shuffleHistory.push(next);gotoPreview(next,'next');}
      } else if(isLast&&presLoop){
        gotoPreview(0,'next'); // loop back when loop is enabled
      } else if(isLast){
        gotoPreview(0,'next'); // always loop from last if auto-advance is set on last slide
      } else {
        gotoPreview(pidx+1,'next');
      }
    };
    autoTimer=setTimeout(doNext,delay);
    document.getElementById('p-auto-indicator').classList.add('on');
  } else {
    document.getElementById('p-auto-indicator').classList.remove('on');
  }
}
function clearAutoTimer(){clearTimeout(autoTimer);autoTimer=null;}
function updatePUI(){
  const total=slides.length;
  document.getElementById('p-counter').textContent=(pidx+1)+' / '+total;
  document.getElementById('p-prog').style.width=((pidx+1)/total*100)+'%';
  document.getElementById('p-prev').style.opacity=(pidx>0||presLoop||presShuffle)?'1':'0.2';
  document.getElementById('p-next').style.opacity=(pidx<total-1||presLoop||presShuffle)?'1':'0.2';
  const dn=document.getElementById('p-dot-nav');dn.innerHTML='';
  const max=Math.min(total,25);
  for(let i=0;i<max;i++){
    const d=document.createElement('div');d.className='p-dot'+(i===pidx?' active':'');
    (function(idx){d.onclick=()=>{clearAutoTimer();if(!pTransiting)gotoPreview(idx,idx>pidx?'next':'prev');};})(i);dn.appendChild(d);
  }
}
function buildPSlide(container,idx,transOffset){
  transOffset=transOffset||0;
  const s=slides[idx];const sc=pScale();
  container.innerHTML='';container.style.width=canvasW+'px';container.style.height=canvasH+'px';
  container.style.transform='scale('+sc+')';container.style.transformOrigin='top left';
  const bg=document.createElement('div');bg.style.cssText='position:absolute;inset:0;z-index:0;';
  if(s.bg==='custom'||s.bg==='theme'){
    const _ti2=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx:-1;
    const _tb2=_ti2>=0?THEMES[_ti2].bg:'#1a1a2e';
    bg.style.background=s.bgc||_tb2;
  }
  else{const b=BGS.find(b=>b.id===s.bg);bg.style.background=b?b.s:'#ddd';}
  container.appendChild(bg);

  const hiddenSet=hiddenElsPerSlide[idx]||new Set();

  // --- Build global click/key queue for non-trigger animations ---
  // Each entry: array of {el, anim} to fire together on one advance
  // We group by: all 'click' anims on elements that are NOT triggers, in order of their delay
  const globalClickSteps=[]; // [{el,anim}, ...] per step

  // --- Global anim classification ---
  // Pass 1: flatten all anims across all elements with their effective trigger
  // Rule: if any anim in the global sequence is 'click', all following auto/withPrev
  // anims (on any element) are also treated as click until a new explicit non-withPrev auto appears
  const globalAnimList = []; // {d, a, i (anim index)}
  s.els.forEach(d => {
    if(hiddenSet.has(d.id)) return;
    (d.anims||[]).forEach((a, i) => globalAnimList.push({d, a, i}));
  });

  // Compute effective trigger for each anim globally
  // Rule: 'withPrev' inherits trigger from previous anim
  // 'auto'/'afterPrev' after a click (same or different element) = autoAfter (fires after click group ends)
  // New explicit 'click' resets; new 'auto' on a NEW element that has no prior click = plain auto
  let lastEffTrig = 'auto';
  let lastEffEl = null;
  const globalEffTrig = globalAnimList.map(({a, d}) => {
    const t = a.trigger||'auto';
    if(t === 'click') { lastEffTrig = 'click'; lastEffEl = d.id; return 'click'; }
    if(t === 'withPrev') { return lastEffTrig; }
    // auto / afterPrev
    if(lastEffTrig === 'click') {
      // Still in the wake of a click — this auto is autoAfter regardless of element
      // but only update lastEffEl to current, keep lastEffTrig as 'click' so chain continues
      lastEffEl = d.id;
      return 'autoAfter';
    }
    lastEffTrig = 'auto'; lastEffEl = null;
    return 'auto';
  });

  // Build per-element maps: autoMap and clickMap
  const globalAutoMap = new Map();  // elId -> [{anim, absDelay}]
  const globalClickMap = new Map(); // elId -> [{anim, autoAfter?}]
  {
    let gPrevStart = 0, gPrevDur = 0;
    globalAnimList.forEach(({d, a}, gi) => {
      const eff = globalEffTrig[gi];
      if(eff === 'auto' || eff === 'withPrev') {
        const relDelay = a.delay||0;
        let absDelay;
        if(gPrevStart===0 && gPrevDur===0){
          absDelay = relDelay;
        } else if((a.trigger||'auto')==='withPrev'){
          absDelay = gPrevStart + relDelay;
        } else {
          absDelay = gPrevStart + gPrevDur + relDelay;
        }
        gPrevStart = absDelay;
        gPrevDur = a.duration||600;
        const arr = globalAutoMap.get(d.id) || [];
        arr.push({anim:a, absDelay});
        globalAutoMap.set(d.id, arr);
      } else if(eff === 'click' || eff === 'autoAfter') {
        const arr = globalClickMap.get(d.id) || [];
        arr.push({anim:a, autoAfter: eff==='autoAfter'});
        globalClickMap.set(d.id, arr);
      }
    });
  }

  s.els.forEach(d=>{
    if(hiddenSet.has(d.id))return;
    const el=document.createElement('div');el.className='psel';
    const rot=d.rot||0;
    // Build border-radius string (text boxes use rx_tl etc, shapes use d.rx)
    let rxStr='';
    if(d.type==='text'&&(d.rx_tl!=null||d.rx_tr!=null||d.rx_bl!=null||d.rx_br!=null)){
      const u=d.rxUnit||'px';
      rxStr='border-radius:'+(d.rx_tl||0)+u+' '+(d.rx_tr||0)+u+' '+(d.rx_br||0)+u+' '+(d.rx_bl||0)+u+';';
    }
    // Determine cursor
    const hasCursor=(d.link||( d.hoverFx&&d.hoverFx.enabled));
    const elOp=d.elOpacity!=null?d.elOpacity:1;
    const _previewBdBlur=(d.type==='text'&&d.textBgBlur>0)?'backdrop-filter:blur('+d.textBgBlur+'px);-webkit-backdrop-filter:blur('+d.textBgBlur+'px);':'';
    el.style.cssText='position:absolute;left:'+d.x+'px;top:'+d.y+'px;width:'+d.w+'px;height:'+d.h+'px;z-index:2;overflow:hidden;transform:rotate('+rot+'deg);'+rxStr+(hasCursor?'cursor:pointer;':'cursor:default;')+(elOp!==1?'opacity:'+elOp+';':'')+_previewBdBlur;

    // Build content
    if(d.type==='text'){
      const jc=d.valign==='middle'?'center':d.valign==='bottom'?'flex-end':'flex-start';
      const c=document.createElement('div');
      const csStr=(d.cs||'').trim();
      c.style.cssText=(csStr?(csStr.endsWith(';')?csStr:csStr+';'):'')+'width:100%;height:100%;overflow:hidden;padding:6px 8px;display:flex;flex-direction:column;justify-content:'+jc+';pointer-events:none;user-select:none;';
      if(d.textBg||d.textBgGrad){
        const op2=d.textBgOp!=null?d.textBgOp:1;
        const toRgba2=(hex,a)=>{if(!hex)return`rgba(0,0,0,0)`;const rv=parseInt(hex.slice(1,3),16),gv=parseInt(hex.slice(3,5),16),bv=parseInt(hex.slice(5,7),16);return`rgba(${rv},${gv},${bv},${a})`;};
        if(d.textBgGrad){
          const dir2=d.textBgDir!=null?d.textBgDir:90;
          el.style.background=`linear-gradient(${dir2}deg,${toRgba2(d.textBg,op2)},${toRgba2(d.textBgCol2,op2)})`;
        } else {
          el.style.background=toRgba2(d.textBg,op2);
        }
      } // Wrap in inner div so mixed text/span nodes don't become separate flex items
      const _pvHtml = (typeof rtMigrateHtml==='function') ? rtMigrateHtml(d.html||'') : (d.html||'');
      c.innerHTML='<div style="width:100%;white-space:normal;word-break:break-word;">'+_pvHtml+'</div>';
      // Re-attach bullet click handlers in preview (pointer-events:none on parent, so clicks won't work — that's fine for preview)
      el.appendChild(c);
      // Border for text boxes
      if(d.textBorderW&&+d.textBorderW>0){el.style.border=(d.textBorderW||0)+'px solid '+(d.textBorderColor||'#ffffff');el.style.overflow='hidden';}
    }else if(d.type==='image'){
      const img=document.createElement('img');img.src=d.src;
      const cL=d.imgCropL||0,cT=d.imgCropT||0,cR=d.imgCropR||0,cB=d.imgCropB||0;
      const hasCrop=cL||cT||cR||cB;
      if(hasCrop){
        const wPct=((d.w+cL+cR)/d.w*100).toFixed(4)+'%';
        const hPct=((d.h+cT+cB)/d.h*100).toFixed(4)+'%';
        const lPct=(-cL/d.w*100).toFixed(4)+'%';
        const tPct=(-cT/d.h*100).toFixed(4)+'%';
        img.style.cssText=`position:absolute;left:${lPct};top:${tPct};width:${wPct};height:${hPct};object-fit:fill;display:block;opacity:${d.imgOpacity!=null?d.imgOpacity:1};`;
        el.style.overflow='hidden';
      } else {
        img.style.cssText=`width:100%;height:100%;object-fit:${d.imgFit||'contain'};object-position:${d.imgPosX||'center'} ${d.imgPosY||'center'};display:block;opacity:${d.imgOpacity!=null?d.imgOpacity:1};`;
      }
      if(d.imgShadow){el.style.filter=`drop-shadow(0 4px ${d.imgShadowBlur||15}px ${d.imgShadowColor||'#000'})`;if(!hasCrop)el.style.overflow='visible';}
      else{el.style.filter='';}
      if(d.imgRx)el.style.borderRadius=d.imgRx+'px';
      if(d.imgBw&&+d.imgBw>0){el.style.border=`${d.imgBw}px solid ${d.imgBc||'#fff'}`;el.style.boxSizing='border-box';}
      el.appendChild(img);
    }else if(d.type==='shape'){
      // Mirror editor DOM: el > blur_overlay? > ec > sel-el > shape-svg + shape-text
      el.style.overflow='visible';
      // Don't change position — el is already position:absolute from cssText
      if(d.shapeBlur>0){
        const _pcp=_shapeClipPath(d,d.w,d.h);
        const _pov=document.createElement('div');
        _pov.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:0;backdrop-filter:blur('+d.shapeBlur+'px);-webkit-backdrop-filter:blur('+d.shapeBlur+'px);'+(_pcp!=='none'?'clip-path:'+_pcp+';-webkit-clip-path:'+_pcp+';':'');
        el.appendChild(_pov);
      }
      const _ec=document.createElement('div');
      _ec.className='ec';
      _ec.style.cssText='width:100%;height:100%;overflow:visible;position:relative;z-index:1;';
      const _selEl=document.createElement('div');
      _selEl.style.cssText='position:absolute;inset:0;';
      const _svgDiv=document.createElement('div');
      _svgDiv.style.cssText='position:absolute;inset:0;';
      _svgDiv.innerHTML=buildShapeSVG(d,d.w,d.h);
      _selEl.appendChild(_svgDiv);
      if(d.shapeHtml){
        const txt=document.createElement('div');
        txt.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px;text-align:center;pointer-events:none;'+(d.shapeTextCss||'font-size:24px;font-weight:700;color:#fff;');
        txt.innerHTML=d.shapeHtml;_selEl.appendChild(txt);
      }
      _ec.appendChild(_selEl);el.appendChild(_ec);
    }else if(d.type==='svg'){
      el.style.overflow='visible';
      const _svgStr2=d.svgContent||'';
      try{const _dp2=new DOMParser();const _doc2=_dp2.parseFromString(_svgStr2,'image/svg+xml');const _p2=_doc2.documentElement;if(_p2&&_p2.tagName!=='parsererror'){el.appendChild(document.adoptNode(_p2));}else{el.innerHTML=_svgStr2;}}catch(e){el.innerHTML=_svgStr2;}
      const svgEl=el.querySelector('svg');if(svgEl){svgEl.style.width='100%';svgEl.style.height='100%';}
    }else if(d.type==='icon'){
      el.style.overflow='visible';el.style.display='flex';el.style.alignItems='center';el.style.justifyContent='center';
      const _pvSvg=d.iconFitted&&d.svgContent
        ? d.svgContent
        : (()=>{const _pvIc=typeof ICONS!=='undefined'?ICONS.find(function(x){return x.id===d.iconId;}):null;
            return (_pvIc&&typeof _buildIconSVG==='function')
              ?_buildIconSVG(_pvIc,d.iconColor||'#3b82f6',d.iconSw!=null?d.iconSw:1.8,d.iconStyle||'stroke',d.shadow,d.shadowBlur,d.shadowColor)
              :(d.svgContent||'');})();
      el.innerHTML=_pvSvg;
      var svgI=el.querySelector('svg');if(svgI){svgI.style.width='100%';svgI.style.height='100%';}
    }else if(d.type==='formula'){
      el.style.overflow='visible';el.style.display='flex';el.style.alignItems='center';el.style.justifyContent='center';
      el.style.color=d.formulaColor||'#ffffff';
      if(d.formulaSvg){el.innerHTML=d.formulaSvg;var _fsvgP=el.querySelector('svg');if(_fsvgP){_fsvgP.style.width='100%';_fsvgP.style.height='100%';}}
    }else if(d.type==='graph'){
      el.style.overflow='hidden';el.style.borderRadius='6px';
      if(d.graphImg){var _gi=document.createElement('img');_gi.src=d.graphImg;_gi.style.cssText='width:100%;height:100%;object-fit:fill;display:block;';el.appendChild(_gi);}
    }else if(d.type==='applet'){
      var _aRx=(d.rx?d.rx+'px':'0px');
      // el already has position:absolute — must keep it. Remove overflow:hidden so border overlay shows.
      el.style.overflow='visible';
      el.style.borderRadius=_aRx;
      // Layer 1: clip div — clips iframe to border-radius
      var _aClip=document.createElement('div');
      _aClip.style.cssText='position:absolute;inset:0;overflow:hidden;border-radius:'+_aRx+';';
      var iframe=document.createElement('iframe');iframe.srcdoc=d.appletHtml||'';
      var _pvPE = (d.appletId==='generator'||d.appletId==='timer') ? 'none' : 'auto';
      iframe.style.cssText='width:100%;height:100%;border:none;background:transparent;pointer-events:'+_pvPE+';user-select:none;';
      iframe.setAttribute('allowtransparency','true');
      iframe.sandbox = (d.appletId==='timer') ? 'allow-scripts allow-same-origin' : 'allow-scripts';
      if(d.appletId==='timer'){
        iframe.addEventListener('load', function(){
          try{ iframe.contentWindow.postMessage({type:'timerStart'}, '*'); }catch(e){}
        }, {once:true});
      }
      _aClip.appendChild(iframe);
      el.appendChild(_aClip);
      // Layer 2: border overlay — after clip in DOM, not clipped by anything
      if(d.appletId==='generator'||d.appletId==='timer'){
        var _bw=d.genBorderWidth!==undefined?+d.genBorderWidth:0;
        var _bordDiv=document.createElement('div');
        _bordDiv.className='applet-border-overlay';
        var _bordCss='position:absolute;inset:0;border-radius:'+_aRx+';pointer-events:none;box-sizing:border-box;z-index:2;';
        if(_bw>0){
          var _pvP=typeof _appletTheme==='function'?_appletTheme():{ac1:'#6366f1'};
          var _bc=d.genBorderColor&&d.genBorderColor!==''?d.genBorderColor:(_pvP.ac1+'33');
          _bordCss+='border:'+_bw+'px solid '+_bc+';';
        }
        _bordDiv.style.cssText=_bordCss;
        el.appendChild(_bordDiv);
      }
    }else if(d.type==='htmlframe'){
      if(typeof _hfBuildPreview==='function'){_hfBuildPreview(el,d);}
    }else if(d.type==='code'){
      const T=CODE_THEMES[d.codeTheme||'dark']||CODE_THEMES.dark;
      const c=document.createElement('div');
      c.style.cssText=`width:100%;height:100%;overflow:auto;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:${d.codeFs||13}px;line-height:1.6;padding:14px 16px;box-sizing:border-box;background:${T.bg};color:${T.text};border:1px solid rgba(128,128,128,.15);`;
      c.innerHTML=`<div style="font-size:9px;color:${T.cmt};margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px">${d.codeLang||''}</div><pre style="margin:0;white-space:pre;overflow:visible">${d.codeHtml||''}</pre>`;
      el.appendChild(c);
    }else if(d.type==='table'){
      const v=document.createElement('div');v.style.cssText='width:100%;height:100%;overflow:visible;position:relative;';
      const bw2=d.borderW||1,bc2=d.borderColor||'#3b82f680',rx2=d.rx||0,fs2=d.fs||15;
      const _pvOp=d.tableBgOp!=null?+d.tableBgOp:1;
      const _pvBlur=d.tableBgBlur||0;
      function _pvRgba(hex){if(!hex)return hex;const h=hex.replace('#','');let r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16),a=h.length===8?parseInt(h.slice(6,8),16)/255:1;return 'rgba('+r+','+g+','+b+','+(a*_pvOp).toFixed(3)+')';}
      const tcols=d.cols||1,trows=d.rows||1;
      const cws2=(d.colWidths||[]).map(f=>Math.max(20,Math.round(f*(d.w||200))));
      const rhs2=(d.rowHeights||[]).map(f=>Math.max(12,Math.round(f*(d.h||150))));
      let t2=`<table style="width:100%;height:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:${fs2}px;color:${d.textColor||'#fff'};">`;
      t2+=`<colgroup>${cws2.map(w=>`<col style="width:${w}px">`).join('')}</colgroup><tbody>`;
      let ci2=0;
      for(let pr=0;pr<trows;pr++){
        const rh2=rhs2[pr]||30;t2+=`<tr style="height:${rh2}px">`;
        for(let pc=0;pc<tcols;pc++,ci2++){
          const cell2=(d.cells||[])[ci2]||{html:'',align:'left',valign:'middle',bg:'',colspan:1,rowspan:1,hidden:false};
          if(cell2.hidden)continue;
          const isH2=d.headerRow&&pr===0,isAlt2=!isH2&&d.altBg&&pr%2===0;
          const bg2=_pvRgba(cell2.bg||(isH2?d.headerBg||'#3b82f6':isAlt2?d.altBg||'':d.cellBg||'#1e293b')||'');
          const cs2=cell2.colspan||1, rs2=cell2.rowspan||1;
          const isLastC2=(pc+cs2-1)>=tcols-1, isLastR2=(pr+rs2-1)>=trows-1;
          const brd2=`border-top:${bw2}px solid ${bc2};border-left:${bw2}px solid ${bc2};`
            +(isLastC2?`border-right:${bw2}px solid ${bc2};`:'')
            +(isLastR2?`border-bottom:${bw2}px solid ${bc2};`:'');
          let cr2='';
          if(rx2>0){if(pr===0&&pc===0)cr2+=`border-top-left-radius:${rx2}px;`;if(pr===0&&isLastC2)cr2+=`border-top-right-radius:${rx2}px;`;if(isLastR2&&pc===0)cr2+=`border-bottom-left-radius:${rx2}px;`;if(isLastR2&&isLastC2)cr2+=`border-bottom-right-radius:${rx2}px;`;}
          const span2=(cs2>1?` colspan="${cs2}"`:'')+( rs2>1?` rowspan="${rs2}"`:'');
          const tag2=isH2?'th':'td';
          t2+=`<${tag2}${span2} style="background:${bg2};${brd2}text-align:${cell2.align||'left'};vertical-align:${cell2.valign||'middle'};padding:5px 9px;overflow:hidden;word-break:normal;overflow-wrap:break-word;font-weight:${isH2?700:400};box-sizing:border-box;${cr2}">${cell2.html||''}</${tag2}>`;
        }
        t2+='</tr>';
      }
      t2+='</tbody></table>';
      const _pvBlurLayer=_pvBlur>0?'<div style="position:absolute;inset:0;border-radius:'+rx2+'px;backdrop-filter:blur('+_pvBlur+'px);-webkit-backdrop-filter:blur('+_pvBlur+'px);z-index:0;pointer-events:none;"></div>':'';
      v.innerHTML=_pvBlurLayer+'<div style="position:relative;width:100%;height:100%;border-radius:'+rx2+'px;overflow:hidden;z-index:1;">'+t2+'</div>';
      el.appendChild(v);
    }else if(d.type==='markdown'){
      const c=document.createElement('div');
      c.style.cssText=`width:100%;height:100%;overflow:auto;padding:14px 16px;box-sizing:border-box;line-height:1.65;font-size:${d.mdFs||16}px;color:${d.mdColor||'#ffffff'};`;
      // Inject scoped styles for markdown content
      const scope='md-pv-'+d.id;
      c.setAttribute('data-md',scope);
      const col=d.mdColor||'#ffffff';
      const styleEl=document.createElement('style');
      const s=`[data-md="${scope}"]`;
      styleEl.textContent=`${s} h1{font-size:2em;font-weight:700;margin:0 0 .4em;border-bottom:1px solid ${col}33;padding-bottom:.2em}${s} h2{font-size:1.5em;font-weight:600;margin:0 0 .35em}${s} h3{font-size:1.17em;font-weight:600;margin:0 0 .3em}${s} p{margin:0 0 .6em}${s} code{font-family:monospace;font-size:.85em;background:${col}18;padding:2px 5px;border-radius:3px}${s} pre{background:${col}18;border-radius:5px;padding:10px 12px;margin:0 0 .6em;overflow-x:auto}${s} pre code{background:none;padding:0}${s} ul,${s} ol{margin:0 0 .6em;padding-left:1.4em}${s} li{margin-bottom:.2em}${s} blockquote{border-left:3px solid ${col}88;padding-left:.8em;color:${col}99;margin:.4em 0}${s} strong{font-weight:700}${s} em{font-style:italic}${s} hr{border:none;border-top:1px solid ${col}33;margin:.6em 0}${s} a{color:${col};text-decoration:underline}`;
      document.head.appendChild(styleEl);
      c.innerHTML=d.mdHtml||'';el.appendChild(c);
    }else if(d.type==='pagenum'){
      const c=document.createElement('div');
      c.style.cssText='width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:visible;';
      c.innerHTML=d.html||'';
      el.appendChild(c);
    }

    const anims=d.anims||[];
    const isTrigger=d.isTrigger||anims.some(a=>a.trigger==='nav');

    // Auto anims — from global map (already classified)
    const autoTimed = globalAutoMap.get(d.id) || [];
    if(autoTimed.length>0){
      const cssAnims    = autoTimed.filter(({anim:a})=>a.name!=='moveTo'&&a.name!=='orbitTo'&&a.name!=='rotate');
      const motionAnims = autoTimed.filter(({anim:a})=>a.name==='moveTo'||a.name==='orbitTo');
      const rotateAnims = autoTimed.filter(({anim:a})=>a.name==='rotate');

      // If first auto anim is entrance with delay > 0 — hide element until it starts
      const firstCss = cssAnims[0];
      if(firstCss && firstCss.anim.cat==='entrance' && (firstCss.absDelay||0) > 0){
        el.style.visibility='hidden';
      }

      // Group cssAnims by absDelay AND by target element:
      // entrance/exit anims go on .el (they may affect opacity+transform together)
      // emphasis anims go on .ec (inner) so they don't conflict with motion transform on .el
      const ecEl = el.querySelector('.ec') || null;
      const groupsEl = {}, groupsEc = {};
      cssAnims.forEach(({anim:a,absDelay})=>{
        const isEmphasis = a.cat === 'emphasis';
        // Put emphasis on .ec only if it exists; otherwise fall through to .el
        const grps = (isEmphasis && ecEl) ? groupsEc : groupsEl;
        if(!grps[absDelay]) grps[absDelay]=[];
        grps[absDelay].push(a);
      });
      Object.entries(groupsEl).forEach(([delayStr,grp])=>{
        const absDelay=+delayStr;
        setTimeout(()=>{
          el.style.visibility='';
          el.style.animation='none';
          void el.offsetWidth;
          el.style.animation=grp.map(a=>{
            const cssName=ANIM_CSS[a.name]||'el-fadein';
            const dur=(a.duration||600)/1000;
            return `${cssName} ${dur}s ease-out 0s both`;
          }).join(',');
        }, absDelay + transOffset);
      });
      Object.entries(groupsEc).forEach(([delayStr,grp])=>{
        const absDelay=+delayStr;
        setTimeout(()=>{
          ecEl.style.animation='none';
          void ecEl.offsetWidth;
          ecEl.style.animation=grp.map(a=>{
            const cssName=ANIM_CSS[a.name]||'el-fadein';
            const dur=(a.duration||600)/1000;
            return `${cssName} ${dur}s ease-out 0s both`;
          }).join(',');
          setTimeout(()=>{ ecEl.style.animation=''; }, Math.max(...grp.map(a=>a.duration||600)) + 50);
        }, absDelay + transOffset);
      });
      // Fire motion anims in original order — each needs cumulative offset from previous
      {
        let cumTx=0, cumTy=0;
        motionAnims.forEach(({anim:a,absDelay})=>{
          fireAnim(el,d,a,idx,absDelay + transOffset,cumTx,cumTy);
          if(a.name==='moveTo'){
            cumTx=a.tx||0; cumTy=a.ty||0;
          } else if(a.name==='orbitTo'){
            const r=a.orbitR||120, ocx=a.orbitCx||0, ocy=a.orbitCy||0;
            const dir=(a.orbitDir||'cw')==='cw'?1:-1;
            const deg=(a.orbitDeg!=null?a.orbitDeg:360)*dir;
            const sa=Math.atan2(-ocy,-ocx), ea=sa+deg*Math.PI/180;
            cumTx+=(ocx+r*Math.cos(ea))-(ocx+r*Math.cos(sa));
            cumTy+=(ocy+r*Math.sin(ea))-(ocy+r*Math.sin(sa));
          }
        });
      }
      rotateAnims.forEach(({anim:a,absDelay})=>fireAnim(el,d,a,idx,absDelay + transOffset));
    }

    // Click anims — from global click map + nav triggers
    const clickAnimsGlobal = globalClickMap.get(d.id) || [];
    const navAnims = anims.filter(a=>a.trigger==='nav');
    const allClickEntries = [...clickAnimsGlobal, ...navAnims.filter(a=>!clickAnimsGlobal.find(x=>x.anim===a)).map(a=>({anim:a,autoAfter:false}))];
    const clickAnims = allClickEntries.filter(x=>!x.autoAfter).map(x=>x.anim);
    const autoAfterAnims = allClickEntries.filter(x=>x.autoAfter).map(x=>x.anim);
    if(clickAnims.length>0||autoAfterAnims.length>0){
      const firstIsEntrance = clickAnims.length>0 && clickAnims[0].cat==='entrance';
      if(firstIsEntrance) el.style.visibility='hidden';
      if(isTrigger && clickAnims.length>0){
        el.style.cursor='pointer';
        el.addEventListener('click',(e)=>{
          e.stopPropagation();
          const timed=typeof computeAbsDelays==='function'?computeAbsDelays(clickAnims):clickAnims.map(a=>({anim:a,absDelay:a.delay||0}));
          timed.forEach(({anim:a,absDelay})=>setTimeout(()=>fireAnim(el,d,a,idx),absDelay));
          // fire autoAfter anims after click group
          let autoDelay = Math.max(...timed.map(({anim:a,absDelay})=>(absDelay||0)+(a.duration||600)));
          autoAfterAnims.forEach(a=>{
            const t=autoDelay; autoDelay+=a.duration||600;
            setTimeout(()=>fireAnim(el,d,a,idx,0), t);
          });
        });
      } else {
        const timed=typeof computeAbsDelays==='function'?computeAbsDelays(clickAnims):clickAnims.map(a=>({anim:a,absDelay:a.delay||0}));
        timed.forEach(({anim:a,absDelay})=>{
          globalClickSteps.push({el,d,a,absDelay,wasHidden:firstIsEntrance,autoAfter:false});
        });
        autoAfterAnims.forEach(a=>{
          globalClickSteps.push({el,d,a,absDelay:0,wasHidden:false,autoAfter:true});
        });
      }
    }

    // Link navigation — always attach if link is set (works alongside animations)
    if(d.link){
      el._hasLink=true;
      el.style.cursor='pointer';
      (function(link,linkt){el.addEventListener('click',(e)=>{
        // Don't fire if this element already handled it as a trigger (nav trigger does its own navigation)
        if(isTrigger&&(d.anims||[]).some(a=>a.trigger==='nav'))return;
        if(link.startsWith('#slide-')){const si=parseInt(link.replace('#slide-',''))-1;
          if(si>=0&&si<slides.length){clearAutoTimer();gotoPreview(si,si>pidx?'next':'prev');}}
        else window.open(link,linkt||'_blank');
      });})(d.link,d.linkt);
    }
    if(isTrigger)el._isTrigger=true;

    // Apply hover effects
    if(d.hoverFx&&d.hoverFx.enabled){
      applyHoverFxPreview(el,d.hoverFx,d.type==='shape');
    }

    container.appendChild(el);
  });

  // ── Draw connectors on top of elements ───────────────────────────────────
  if (s.connectors && s.connectors.length) {
    const elMap = {};
    s.els.forEach(d => { elMap[d.id] = d; });

    function _pAnchor(elId, otherElId, fromEdge, gap) {
      const d = elMap[elId]; if (!d) return {x:0,y:0};
      const cx = d.x+d.w/2, cy = d.y+d.h/2;
      gap = gap || 0;
      const od = elMap[otherElId];
      const ox = od ? od.x+od.w/2 : cx, oy = od ? od.y+od.h/2 : cy;
      const dx = ox-cx, dy = oy-cy;
      const dist = Math.sqrt(dx*dx+dy*dy)||1;
      const ux = dx/dist, uy = dy/dist;
      if (!fromEdge) return {x: cx+ux*gap, y: cy+uy*gap};
      let ex, ey;
      if (Math.abs(dx)*d.h > Math.abs(dy)*d.w) { ex = dx>0?d.x+d.w:d.x; ey = cy; }
      else { ex = cx; ey = dy>0?d.y+d.h:d.y; }
      return {x: ex+ux*gap, y: ey+uy*gap};
    }

    function _pMakeMarker(defs, markerId, type, color, atStart) {
      if (type === 'none') return;
      const m = document.createElementNS('http://www.w3.org/2000/svg','marker');
      m.setAttribute('id', markerId);
      m.setAttribute('markerUnits','strokeWidth');
      m.setAttribute('orient','auto');
      m.setAttribute('fill', color);
      m.setAttribute('stroke', color);
      if (type === 'arrow') {
        m.setAttribute('markerWidth','3.1'); m.setAttribute('markerHeight','3.5');
        m.setAttribute('refX', atStart?'1.386':'1.386'); m.setAttribute('refY','1.6');
        const poly = document.createElementNS('http://www.w3.org/2000/svg','path');
        const pathEnd   = 'M2.555,1.475 L2.555,1.475 Q2.771,1.600 2.555,1.725 L0.217,3.075 Q0.000,3.200 0.000,2.950 L0.000,0.250 Q0.000,0.000 0.217,0.125 Z';
        const pathStart = 'M0.216,1.475 L0.216,1.475 Q0.000,1.600 0.216,1.725 L2.554,3.075 Q2.771,3.200 2.771,2.950 L2.771,0.250 Q2.771,0.000 2.554,0.125 Z';
        poly.setAttribute('d', atStart ? pathStart : pathEnd);
        poly.setAttribute('fill', color); poly.setAttribute('stroke', 'none');
        m.appendChild(poly);
      } else if (type === 'square') {
        m.setAttribute('markerWidth','3.4'); m.setAttribute('markerHeight','3.4');
        m.setAttribute('refX', atStart?'1.7':'1.7'); m.setAttribute('refY','1.7');
        const r2 = document.createElementNS('http://www.w3.org/2000/svg','rect');
        r2.setAttribute('x','0.2');r2.setAttribute('y','0.2');r2.setAttribute('width','3.0');r2.setAttribute('height','3.0');
        r2.setAttribute('rx','0.5');r2.setAttribute('ry','0.5');r2.setAttribute('stroke-width','0');
        m.appendChild(r2);
      } else if (type === 'cross') {
        m.setAttribute('orient','0');
        m.setAttribute('markerWidth','3.0'); m.setAttribute('markerHeight','3.0');
        m.setAttribute('refX','1.5'); m.setAttribute('refY','1.5');
        ['M0.3,0.3 L2.7,2.7','M2.7,0.3 L0.3,2.7'].forEach(d2 => {
          const ln = document.createElementNS('http://www.w3.org/2000/svg','path');
          ln.setAttribute('d',d2); ln.setAttribute('stroke',color);
          ln.setAttribute('stroke-width','1'); ln.setAttribute('stroke-linecap','round'); ln.setAttribute('fill','none');
          m.appendChild(ln);
        });
      }
      defs.appendChild(m);
    }

    const psvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    psvg.setAttribute('style','position:absolute;left:0;top:0;width:'+canvasW+'px;height:'+canvasH+'px;pointer-events:none;overflow:visible;z-index:1;');
    psvg.innerHTML = '<defs></defs>';
    const pdefs = psvg.querySelector('defs');

    // Helper: get edge midpoint anchor from data model, accounting for rotation
    function _pEdgeMid(elId, sideKey, otherElId, gap) {
      gap = gap || 0;
      const d = elMap[elId]; if (!d) return {x:0,y:0};
      const cx=d.x+d.w/2, cy=d.y+d.h/2;
      const deg = d.rot || 0;
      function rot(px, py) {
        if (!deg) return {x:px, y:py};
        const rad=deg*Math.PI/180, cos=Math.cos(rad), sin=Math.sin(rad);
        const rx=px-cx, ry=py-cy;
        return {x: cx+rx*cos-ry*sin, y: cy+rx*sin+ry*cos};
      }
      function rotDir(nx, ny) {
        if (!deg) return {nx, ny};
        const rad=deg*Math.PI/180, cos=Math.cos(rad), sin=Math.sin(rad);
        return {nx: nx*cos-ny*sin, ny: nx*sin+ny*cos};
      }
      const raw = {
        top:    {...rot(cx,      d.y     ), ...rotDir( 0,-1)},
        right:  {...rot(d.x+d.w, cy      ), ...rotDir( 1, 0)},
        bottom: {...rot(cx,      d.y+d.h ), ...rotDir( 0, 1)},
        left:   {...rot(d.x,     cy      ), ...rotDir(-1, 0)},
      };
      if (raw[sideKey]) {
        const pt = raw[sideKey];
        if (gap) return {x: pt.x + pt.nx*gap, y: pt.y + pt.ny*gap};
        return pt;
      }
      // fallback: closest rotated side toward other element
      const od=elMap[otherElId];
      const tx=od?od.x+od.w/2:cx, ty=od?od.y+od.h/2:cy;
      let best=raw.right, bestD=Infinity;
      for (const [,pt] of Object.entries(raw)) {
        const d2=(pt.x-tx)**2+(pt.y-ty)**2;
        if (d2<bestD){bestD=d2;best=pt;}
      }
      if (gap) return {x: best.x + best.nx*gap, y: best.y + best.ny*gap};
      return best;
    }
    // Helper: default bezier control points
    function _pDefaultCP(p1, p2) {
      const dx=p2.x-p1.x, dy=p2.y-p1.y;
      const dist=Math.sqrt(dx*dx+dy*dy), bend=Math.min(dist*0.45,220);
      const hBias = Math.abs(dx) > Math.abs(dy)*0.6;
      if (hBias) return {
        cp1:{x:p1.x+bend*Math.sign(dx||1), y:p1.y},
        cp2:{x:p2.x-bend*Math.sign(dx||1), y:p2.y},
      };
      return {
        cp1:{x:p1.x, y:p1.y+bend*Math.sign(dy||1)},
        cp2:{x:p2.x, y:p2.y-bend*Math.sign(dy||1)},
      };
    }

    // Side normals for gap offset
    const _pSideN = { top:{x:0,y:-1}, right:{x:1,y:0}, bottom:{x:0,y:1}, left:{x:-1,y:0} };
    function _pApplyGap(pt, gap) {
      if (!gap) return pt;
      const n = _pSideN[pt.side] || {x:0,y:0};
      return { ...pt, x: pt.x + n.x * gap, y: pt.y + n.y * gap };
    }

    s.connectors.forEach(conn => {
      const gap = conn.gap || 0;
      const p1 = _pEdgeMid(conn.fromId, conn.fromSide, conn.toId, gap);
      const p2 = _pEdgeMid(conn.toId,   conn.toSide,   conn.fromId, gap);
      // Use stored control points if available, else compute defaults
      const def = _pDefaultCP(p1, p2);
      const cp1 = conn.cp1 || def.cp1;
      const cp2 = conn.cp2 || def.cp2;

      const sw = conn.sw || 2;
      const dash = conn.dash || 'solid';
      const color = conn.color || '#60a5fa';
      const fromMk = conn.fromMarker || 'none';
      const toMk   = conn.toMarker   || (conn.type==='arrow'?'arrow':'none');
      const animated = !!conn.animated;

      const mkFId = conn.id+'_pmf', mkTId = conn.id+'_pmt';
      _pMakeMarker(pdefs, mkFId, fromMk, color, true);
      _pMakeMarker(pdefs, mkTId, toMk,   color, false);

      let dashArr, linecap;
      if (dash==='dot')  { dashArr=`0 ${sw*4}`; linecap='round'; }
      else if (dash==='dash') { dashArr=`${sw*5} ${sw*3}`; linecap='round'; }
      else { dashArr=null; linecap='round'; }

      if (animated && dash !== 'solid') {
        const style = document.createElementNS('http://www.w3.org/2000/svg','style');
        const animOff = dash==='dot' ? sw*4 : sw*8;
        style.textContent = `@keyframes pconn_${conn.id}{from{stroke-dashoffset:${animOff}}to{stroke-dashoffset:0}}`;
        pdefs.appendChild(style);
      }

      function pMkDist(t){return t==='arrow'?1.386:t==='square'?1.7:t==='cross'?1.5:0;}
      function pMkRetract(pt, cpNear, d) {
        if (!d || sw <= 0) return pt;
        const tdx=cpNear.x-pt.x, tdy=cpNear.y-pt.y, tl=Math.sqrt(tdx*tdx+tdy*tdy)||1;
        return {x: pt.x+(tdx/tl)*sw*d, y: pt.y+(tdy/tl)*sw*d};
      }
      const rp2=toMk  !=='none' ? pMkRetract(p2, cp2, pMkDist(toMk))   : p2;
      const rp1=fromMk!=='none' ? pMkRetract(p1, cp1, pMkDist(fromMk)) : p1;
      const pd = `M${rp1.x.toFixed(1)},${rp1.y.toFixed(1)} C${cp1.x.toFixed(1)},${cp1.y.toFixed(1)} ${cp2.x.toFixed(1)},${cp2.y.toFixed(1)} ${rp2.x.toFixed(1)},${rp2.y.toFixed(1)}`;
      const line = document.createElementNS('http://www.w3.org/2000/svg','path');
      line.setAttribute('d', pd);
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', sw);
      line.setAttribute('stroke-linecap', (dash === 'dot') ? 'round' : ((fromMk !== 'none' || toMk !== 'none') ? 'butt' : linecap));
      line.setAttribute('stroke-linejoin', 'round');
      if (dashArr) {
        line.setAttribute('stroke-dasharray', dashArr);
        if (animated) line.style.animation = `pconn_${conn.id} ${dash==='dot'?'1s':'0.8s'} linear infinite`;
      }
      if (fromMk !== 'none') line.setAttribute('marker-start', `url(#${mkFId})`);
      if (toMk   !== 'none') line.setAttribute('marker-end',   `url(#${mkTId})`);
      psvg.appendChild(line);
    });

    container.appendChild(psvg);
  }
  globalClickSteps.sort((a,b)=>(a.absDelay||0)-(b.absDelay||0));

  // Group into click-steps: each explicit 'click' starts a new group,
  // 'withPrev' joins the current group, autoAfter fires automatically after the group
  const clickGroups = [];
  globalClickSteps.forEach(step => {
    const origTrigger = step.a.trigger||'auto';
    if(step.autoAfter) {
      if(clickGroups.length > 0) clickGroups[clickGroups.length-1].autoAfter.push(step);
    } else if(origTrigger === 'click') {
      clickGroups.push({items:[step], autoAfter:[]});
    } else if(origTrigger === 'withPrev' && clickGroups.length > 0) {
      clickGroups[clickGroups.length-1].items.push(step);
    } else {
      clickGroups.push({items:[step], autoAfter:[]});
    }
  });

  let groupIdx=0;
  container._fireNextStep=function(){
    if(groupIdx>=clickGroups.length)return false;
    const group=clickGroups[groupIdx];
    // Find base delay of group (first item's absDelay)
    const baseDelay = group.items.length>0 ? (group.items[0].absDelay||0) : 0;
    group.items.forEach(({el,d,a,absDelay,wasHidden})=>{
      if(wasHidden)el.style.visibility='visible';
      // absDelay is relative to group start (subtract base so group fires from t=0)
      fireAnim(el,d,a,idx,(absDelay||0)-baseDelay);
    });
    // auto-fire autoAfter items after click group ends
    let autoDelay = 0;
    group.items.forEach(({a,absDelay})=>{ autoDelay = Math.max(autoDelay, ((absDelay||0)-baseDelay)+(a.duration||600)); });
    group.autoAfter.forEach(({el,d,a,wasHidden})=>{
      const t=autoDelay; autoDelay+=a.duration||600;
      setTimeout(()=>{ if(wasHidden)el.style.visibility='visible'; fireAnim(el,d,a,idx,0); }, t);
    });
    groupIdx++;
    return true;
  };
  container._hasSteps=()=>groupIdx<clickGroups.length;
}

function fireAnim(el,d,a,idx,overrideDelay,_cumTx,_cumTy){
  if(a.name==='moveTo'){
    const dur=(a.duration||600);
    const delay=typeof overrideDelay==='number' ? overrideDelay : (a.delay||0);
    // tx/ty are absolute offsets from original element position (stored in data model)
    // but when chaining after orbitTo we need to jump from cumulative position
    const baseTx = typeof _cumTx==='number' ? _cumTx : 0;
    const baseTy = typeof _cumTy==='number' ? _cumTy : 0;
    const tx=a.tx||0, ty=a.ty||0;
    setTimeout(()=>{
      if(el.animate){
        // Set final in style + start animation atomically in same rAF
        // fill:'none' means Web Anim overrides style during playback, style holds after finish
        requestAnimationFrame(()=>{
          el.style.transform = `translate(${tx}px,${ty}px)`;
          el.animate(
            [{transform:`translate(${baseTx.toFixed(2)}px,${baseTy.toFixed(2)}px)`},
             {transform:`translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px)`}],
            {duration:dur, easing:'cubic-bezier(0.4,0,0.2,1)', fill:'none', composite:'replace'}
          );
        });
      } else {
        requestAnimationFrame(()=>{
          el.style.transition=`transform ${dur}ms cubic-bezier(0.4,0,0.2,1)`;
          el.style.transform=`translate(${tx}px,${ty}px)`;
        });
      }
    }, delay);
    return;
  }
  if(a.name==='orbitTo'){
    const dur = a.duration||1200;
    const delay = typeof overrideDelay==='number' ? overrideDelay : (a.delay||0);
    const r = a.orbitR || 120;
    const dir = (a.orbitDir||'cw')==='cw' ? 1 : -1;
    const totalDeg = (a.orbitDeg != null ? a.orbitDeg : 360) * dir;
    const ocx = (a.orbitCx||0);
    const ocy = (a.orbitCy||0);
    const baseTx = typeof _cumTx==='number' ? _cumTx : 0;
    const baseTy = typeof _cumTy==='number' ? _cumTy : 0;
    const startAngle = Math.atan2(-ocy, -ocx);
    const steps = Math.max(60, Math.abs(totalDeg) * 2);
    const frames = [];
    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const angle = startAngle + (totalDeg * Math.PI/180) * t;
      const ftx = baseTx + ocx + r*Math.cos(angle);
      const fty = baseTy + ocy + r*Math.sin(angle);
      frames.push({transform:`translate(${ftx.toFixed(2)}px,${fty.toFixed(2)}px)`});
    }
    const endTx = baseTx + ocx + r*Math.cos(startAngle + totalDeg*Math.PI/180);
    const endTy = baseTy + ocy + r*Math.sin(startAngle + totalDeg*Math.PI/180);
    setTimeout(()=>{
      if(el.animate){
        requestAnimationFrame(()=>{
          el.style.transform = `translate(${endTx.toFixed(2)}px,${endTy.toFixed(2)}px)`;
          el.animate(frames, {duration:dur, easing:'linear', fill:'none', composite:'replace'});
        });
      }
    }, delay);
    return;
  }
  if(a.name==='rotate'){
    const dur = a.duration||600;
    const delay = typeof overrideDelay==='number' ? overrideDelay : (a.delay||0);
    const dir = (a.rotateDir||'cw')==='cw' ? 1 : -1;
    const deg = (a.rotateDeg!=null ? a.rotateDeg : 360) * dir;
    // Use composite:'add' so rotate stacks on top of existing translate (from moveTo/orbitTo)
    // Apply on inner .ec if available, otherwise on el itself with composite
    const ecEl = el.querySelector('.ec') || null;
    setTimeout(()=>{
      if(ecEl && ecEl.animate){
        const anim = ecEl.animate(
          [{transform:'rotate(0deg)'},{transform:`rotate(${deg}deg)`}],
          {duration:dur, easing:'linear', fill:'forwards'}
        );
        anim.onfinish = ()=>{ try{ anim.commitStyles(); }catch(e){} anim.cancel(); };
      } else if(el.animate){
        const anim = el.animate(
          [{transform:'rotate(0deg)'},{transform:`rotate(${deg}deg)`}],
          {duration:dur, easing:'linear', fill:'forwards', composite:'add'}
        );
        anim.onfinish = ()=>{ try{ anim.commitStyles(); }catch(e){} anim.cancel(); };
      }
    }, delay);
    return;
  }
  const cssName=ANIM_CSS[a.name]||'el-fadein';
  const dur=(a.duration||600)/1000;
  const delay=typeof overrideDelay==='number' ? overrideDelay/1000 : (a.delay||0)/1000;
  el.style.animation='';
  requestAnimationFrame(()=>{
    el.style.animation=`${cssName} ${dur}s ease-out ${delay}s both`;
  });
  if(a.trigger==='nav'){
    const navTarget=typeof a.navTarget==='number'?a.navTarget:0;
    const wait=(a.delay||0)+(a.duration||600);
    setTimeout(()=>{
      if(!hiddenElsPerSlide[idx])hiddenElsPerSlide[idx]=new Set();
      hiddenElsPerSlide[idx].add(d.id);
      clearAutoTimer();
      gotoPreview(navTarget,navTarget>pidx?'next':'prev');
    },wait);
  }
}
function animTrans(a,b,trans,fwd,dur,cb){
  const d=dur+'ms',sc=pScale(),dir=fwd?1:-1;
  // Phase 1: disable transitions
  a.style.transition='none';b.style.transition='none';
  b.style.pointerEvents='auto';
  requestAnimationFrame(()=>{
    // Phase 2: set initial state for b (and a if needed)
    if(trans==='fade'){
      b.style.opacity='0';
    } else if(trans==='slide'){
      b.style.transform='scale('+sc+') translateX('+(dir*100)+'%)';b.style.opacity='1';
    } else if(trans==='slideUp'){
      b.style.transform='scale('+sc+') translateY('+(dir*100)+'%)';b.style.opacity='1';
    } else if(trans==='zoom'){
      b.style.opacity='0';b.style.transform='scale('+(sc*.8)+')';
    } else if(trans==='zoomOut'){
      b.style.opacity='0';b.style.transform='scale('+(sc*1.2)+')';
    } else if(trans==='flip'){
      document.getElementById('preview-stage').style.perspective='1500px';
      b.style.opacity='0';b.style.transform='scale('+sc+') rotateY('+(dir*90)+'deg)';
    } else if(trans==='flipV'){
      document.getElementById('preview-stage').style.perspective='1500px';
      b.style.opacity='0';b.style.transform='scale('+sc+') rotateX('+(dir*-90)+'deg)';
    } else if(trans==='cube'){
      document.getElementById('preview-stage').style.perspective='2000px';
      b.style.transform='scale('+sc+') rotateY('+(dir*-90)+'deg)';b.style.opacity='1';
    } else if(trans==='dissolve'){
      b.style.opacity='0';
    } else if(trans==='push'){
      b.style.transform='scale('+sc+') translateX('+(dir*100)+'%)';b.style.opacity='1';
    } else if(trans==='wipe'){
      b.style.clipPath=fwd?'inset(0 100% 0 0)':'inset(0 0 0 100%)';b.style.opacity='1';
    } else if(trans==='split'){
      b.style.clipPath='inset(50% 0)';b.style.opacity='1';
    } else if(trans==='reveal'){
      b.style.opacity='1';b.style.zIndex='0';a.style.zIndex='2';
    }
    requestAnimationFrame(()=>{
      // Phase 3: set transitions and final state
      if(trans==='fade'){
        a.style.transition='opacity '+d+' ease';b.style.transition='opacity '+d+' ease';
        a.style.opacity='0';b.style.opacity='1';setTimeout(cb,dur+16);
      } else if(trans==='slide'){
        a.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';b.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';
        a.style.transform='scale('+sc+') translateX('+(-dir*100)+'%)';b.style.transform='scale('+sc+') translateX(0)';
        setTimeout(cb,dur+16);
      } else if(trans==='slideUp'){
        a.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';b.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';
        a.style.transform='scale('+sc+') translateY('+(-dir*100)+'%)';b.style.transform='scale('+sc+') translateY(0)';
        setTimeout(cb,dur+16);
      } else if(trans==='zoom'){
        a.style.transition='opacity '+d+' ease,transform '+d+' ease';b.style.transition='opacity '+d+' ease,transform '+d+' ease';
        a.style.opacity='0';a.style.transform='scale('+(sc*1.1)+')';b.style.opacity='1';b.style.transform='scale('+sc+')';
        setTimeout(cb,dur+16);
      } else if(trans==='zoomOut'){
        a.style.transition='opacity '+d+' ease,transform '+d+' ease';b.style.transition='opacity '+d+' ease,transform '+d+' ease';
        a.style.opacity='0';a.style.transform='scale('+(sc*.85)+')';b.style.opacity='1';b.style.transform='scale('+sc+')';
        setTimeout(cb,dur+16);
      } else if(trans==='flip'){
        a.style.transition='transform '+d+' ease,opacity '+(dur/2)+'ms ease';
        b.style.transition='transform '+d+' ease,opacity '+(dur/2)+'ms '+(dur/2)+'ms ease';
        a.style.transform='scale('+sc+') rotateY('+(-dir*90)+'deg)';a.style.opacity='0';b.style.opacity='1';b.style.transform='scale('+sc+') rotateY(0)';
        setTimeout(()=>{document.getElementById('preview-stage').style.perspective='';cb();},dur+16);
      } else if(trans==='flipV'){
        a.style.transition='transform '+d+' ease,opacity '+(dur/2)+'ms ease';
        b.style.transition='transform '+d+' ease,opacity '+(dur/2)+'ms '+(dur/2)+'ms ease';
        a.style.transform='scale('+sc+') rotateX('+(dir*90)+'deg)';a.style.opacity='0';b.style.opacity='1';b.style.transform='scale('+sc+') rotateX(0)';
        setTimeout(()=>{document.getElementById('preview-stage').style.perspective='';cb();},dur+16);
      } else if(trans==='cube'){
        a.style.transition='transform '+d+' ease';b.style.transition='transform '+d+' ease';
        a.style.transform='scale('+sc+') rotateY('+(dir*90)+'deg)';b.style.transform='scale('+sc+') rotateY(0)';
        setTimeout(()=>{document.getElementById('preview-stage').style.perspective='';cb();},dur+16);
      } else if(trans==='dissolve'){
        a.style.transition='opacity '+d+' steps(12,end)';b.style.transition='opacity '+d+' steps(12,start)';
        a.style.opacity='0';b.style.opacity='1';setTimeout(cb,dur+16);
      } else if(trans==='push'){
        a.style.transition='transform '+d+' cubic-bezier(.25,.46,.45,.94)';
        b.style.transition='transform '+d+' cubic-bezier(.25,.46,.45,.94)';
        a.style.transform='scale('+sc+') translateX('+(-dir*40)+'%)';b.style.transform='scale('+sc+') translateX(0)';
        setTimeout(cb,dur+16);
      } else if(trans==='wipe'){
        b.style.transition='clip-path '+d+' cubic-bezier(.4,0,.2,1)';
        b.style.clipPath='inset(0 0% 0 0%)';
        a.style.transition='opacity '+(dur*.3)+'ms '+(dur*.7)+'ms ease';a.style.opacity='0';
        setTimeout(cb,dur+16);
      } else if(trans==='split'){
        b.style.transition='clip-path '+d+' cubic-bezier(.4,0,.2,1)';
        b.style.clipPath='inset(0% 0)';
        a.style.transition='opacity '+(dur*.4)+'ms '+(dur*.6)+'ms ease';a.style.opacity='0';
        setTimeout(cb,dur+16);
      } else if(trans==='reveal'){
        a.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';
        a.style.transform='scale('+sc+') translateX('+(dir*100)+'%)';
        setTimeout(cb,dur+16);
      } else if(trans==='glitch'){
        b.style.opacity='1';
        const steps=6,stepDur=dur/steps;
        let step=0;
        const glitchFilter=[
          'hue-rotate(90deg) saturate(3)','hue-rotate(180deg) contrast(2)',
          'hue-rotate(270deg) brightness(2)','saturate(0) brightness(1.5)',
          'hue-rotate(45deg) contrast(1.5)','none'
        ];
        const run=()=>{
          if(step>=steps){b.style.filter='none';a.style.opacity='0';cb();return;}
          const t2=step/steps;
          const dx=(Math.random()-.5)*30*(1-t2);
          b.style.transform='scale('+sc+') translateX('+dx+'px)';
          b.style.filter=glitchFilter[step]||'none';
          a.style.opacity=String(1-t2);
          step++;setTimeout(run,stepDur);
        };
        run();
      } else {
        b.style.opacity='1';cb();
      }
    });
  });
}

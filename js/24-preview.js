let pidx=0,pTransiting=false,autoTimer=null;
const playedAnimSlides=new Set(); // tracks which slides had their nav-anims already played
const hiddenElsPerSlide={}; // slideIdx -> Set of elIds that have been hidden by nav trigger
function startPreview(startIdx){
  save();pidx=startIdx||0;pTransiting=false;
  _shuffleHistory=[pidx];
  // Apply theme accent color to progress bar
  if(selTheme>=0&&selTheme<THEMES.length){
    const t=THEMES[selTheme];
    const ac1=t.ac1||'#6366f1',ac2=t.ac2||'#818cf8';
    document.getElementById('p-prog').style.background=`linear-gradient(90deg,${ac1},${ac2})`;
  } else {
    document.getElementById('p-prog').style.background='linear-gradient(90deg,var(--accent),var(--accent3))';
  }
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
    if(slides[pidx]&&slides[pidx].clickNav===false)return;
    nextPreview();
  };
  po2.addEventListener('click',po2._stageClick);
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
  po.classList.remove('active');
  document.fullscreenElement&&document.exitFullscreen&&document.exitFullscreen();
  window.removeEventListener('resize',resizePStage);
  // Re-render current slide from data so all styles (textBg etc.) are restored
  load();
  // Explicitly re-apply textBg/textBgOp to all text elements (fix: backgrounds can be lost during preview)
  requestAnimationFrame(()=>{
    document.getElementById('canvas').querySelectorAll('.el').forEach(el=>{
      if(el.dataset.type==='text'&&el.dataset.textBg){
        const c=el.querySelector('.ec');if(!c)return;
        const col=el.dataset.textBg;
        const op=parseFloat(el.dataset.textBgOp!=null?el.dataset.textBgOp:1);
        const r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);
        c.style.background=`rgba(${r},${g},${b},${op})`;
      }
    });
  });
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
  const dur=(slides[to]&&slides[to].transDur)||transitionDur||500;
  if(trans==='none'||dur===0){buildPSlide(document.getElementById('psa'),to);pidx=to;updatePUI();scheduleAuto();return;}
  pTransiting=true;const a=document.getElementById('psa'),b=document.getElementById('psb');buildPSlide(b,to);
  if(trans==='morph')doMorphTransition(a,b,to,dur,()=>{finalizePreview(a,b,to);});
  else animTrans(a,b,trans,dir==='next',dur,()=>{finalizePreview(a,b,to);});
}
function finalizePreview(a,b,to){
  const sc=pScale();buildPSlide(a,to);
  b.style.cssText='position:absolute;inset:0;opacity:0;pointer-events:none;width:'+canvasW+'px;height:'+canvasH+'px;transform:scale('+sc+');transform-origin:top left;';
  a.style.cssText='position:absolute;inset:0;width:'+canvasW+'px;height:'+canvasH+'px;transform:scale('+sc+');transform-origin:top left;';
  pidx=to;updatePUI();pTransiting=false;scheduleAuto();
}
// Morph transition — match elements by position/size similarity
function doMorphTransition(a,b,to,dur,cb){
  const sc=pScale();
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
function buildPSlide(container,idx){
  const s=slides[idx];const sc=pScale();
  container.innerHTML='';container.style.width=canvasW+'px';container.style.height=canvasH+'px';
  container.style.transform='scale('+sc+')';container.style.transformOrigin='top left';
  const bg=document.createElement('div');bg.style.cssText='position:absolute;inset:0;z-index:0;';
  if(s.bg==='custom')bg.style.background=s.bgc||'#fff';
  else{const b=BGS.find(b=>b.id===s.bg);bg.style.background=b?b.s:'#ddd';}
  container.appendChild(bg);

  const hiddenSet=hiddenElsPerSlide[idx]||new Set();

  // --- Build global click/key queue for non-trigger animations ---
  // Each entry: array of {el, anim} to fire together on one advance
  // We group by: all 'click' anims on elements that are NOT triggers, in order of their delay
  const globalClickSteps=[]; // [{el,anim}, ...] per step

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
    el.style.cssText='position:absolute;left:'+d.x+'px;top:'+d.y+'px;width:'+d.w+'px;height:'+d.h+'px;z-index:2;overflow:hidden;transform:rotate('+rot+'deg);'+rxStr+(hasCursor?'cursor:pointer;':'cursor:default;')+(elOp!==1?'opacity:'+elOp+';':'');

    // Build content
    if(d.type==='text'){
      const jc=d.valign==='middle'?'center':d.valign==='bottom'?'flex-end':'flex-start';
      // Outer: flex container for vertical alignment only
      const outer=document.createElement('div');
      outer.style.cssText='width:100%;height:100%;overflow:hidden;padding:6px 8px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:'+jc+';pointer-events:none;user-select:none;';
      if(d.textBg){const op2=d.textBgOp!=null?d.textBgOp:1;const r2=parseInt(d.textBg.slice(1,3),16),g2=parseInt(d.textBg.slice(3,5),16),b2=parseInt(d.textBg.slice(5,7),16);outer.style.background='rgba('+r2+','+g2+','+b2+','+op2+')';}
      // Inner: text content — strip layout props from d.cs to avoid conflicts
      const c=document.createElement('div');
      const csStr=(d.cs||'').trim();
      const csClean=csStr.replace(/\b(display|flex[^:]*|justify-content|align-items|width|height|overflow|padding|box-sizing)\s*:[^;]+;?/gi,'').trim();
      c.style.cssText=(csClean?csClean+';':'')+'display:block;word-break:break-word;white-space:normal;';
      c.innerHTML=d.html||'';
      // Ensure all spans are inline
      c.querySelectorAll('span').forEach(s=>{if(!s.style.display)s.style.display='inline';});
      outer.appendChild(c);el.appendChild(outer);
      if(d.textBorderW&&+d.textBorderW>0){el.style.border=(d.textBorderW||0)+'px solid '+(d.textBorderColor||'#ffffff');el.style.overflow='hidden';}
    }else if(d.type==='image'){
      const img=document.createElement('img');img.src=d.src;
      img.style.cssText=`width:100%;height:100%;object-fit:${d.imgFit||'contain'};object-position:${d.imgPosX||'center'} ${d.imgPosY||'center'};display:block;opacity:${d.imgOpacity!=null?d.imgOpacity:1};`;
      if(d.imgShadow){el.style.filter=`drop-shadow(0 4px ${d.imgShadowBlur||15}px ${d.imgShadowColor||'#000'})`;el.style.overflow='visible';}
      else{el.style.filter='';}
      if(d.imgRx)el.style.borderRadius=d.imgRx+'px';
      if(d.imgBw&&+d.imgBw>0){el.style.border=`${d.imgBw}px solid ${d.imgBc||'#fff'}`;el.style.boxSizing='border-box';}
      el.appendChild(img);
    }else if(d.type==='shape'){
      el.style.overflow='visible';
      el.innerHTML=buildShapeSVG(d,d.w,d.h);
      if(d.shapeHtml){
        const txt=document.createElement('div');
        txt.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px;word-break:break-word;text-align:center;'+(d.shapeTextCss||'font-size:24px;font-weight:700;color:#fff;');
        txt.innerHTML=d.shapeHtml;el.appendChild(txt);
      }
    }else if(d.type==='svg'){
      el.style.overflow='visible';el.innerHTML=d.svgContent||'';
      const svgEl=el.querySelector('svg');if(svgEl){svgEl.style.width='100%';svgEl.style.height='100%';}
    }else if(d.type==='applet'){
      el.style.overflow='hidden';
      const iframe=document.createElement('iframe');iframe.srcdoc=d.appletHtml||'';
      iframe.style.cssText='width:100%;height:100%;border:none;';
      iframe.sandbox='allow-scripts allow-same-origin';el.appendChild(iframe);
    }else if(d.type==='code'){
      const T=CODE_THEMES[d.codeTheme||'dark']||CODE_THEMES.dark;
      const c=document.createElement('div');
      c.style.cssText=`width:100%;height:100%;overflow:auto;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:${d.codeFs||13}px;line-height:1.6;padding:14px 16px;box-sizing:border-box;background:${T.bg};color:${T.text};border:1px solid rgba(128,128,128,.15);`;
      c.innerHTML=`<div style="font-size:9px;color:${T.cmt};margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px">${d.codeLang||''}</div><pre style="margin:0;white-space:pre;overflow:visible">${d.codeHtml||''}</pre>`;
      el.appendChild(c);
    }else if(d.type==='markdown'){
      const c=document.createElement('div');
      c.style.cssText=`width:100%;height:100%;overflow:auto;padding:14px 16px;box-sizing:border-box;line-height:1.65;font-size:${d.mdFs||16}px;color:#ffffff;`;
      // Inject scoped styles for markdown content
      const scope='md-pv-'+d.id;
      c.setAttribute('data-md',scope);
      const styleEl=document.createElement('style');
      styleEl.textContent=`[data-md="${scope}"] h1{font-size:2em;font-weight:700;margin:0 0 .4em;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:.2em}[data-md="${scope}"] h2{font-size:1.5em;font-weight:600;margin:0 0 .35em}[data-md="${scope}"] h3{font-size:1.17em;font-weight:600;margin:0 0 .3em}[data-md="${scope}"] p{margin:0 0 .6em}[data-md="${scope}"] code{font-family:monospace;font-size:.85em;background:rgba(255,255,255,.08);padding:2px 5px;border-radius:3px}[data-md="${scope}"] pre{background:rgba(0,0,0,.3);border-radius:5px;padding:10px 12px;margin:0 0 .6em;overflow-x:auto}[data-md="${scope}"] pre code{background:none;padding:0}[data-md="${scope}"] ul,[data-md="${scope}"] ol{margin:0 0 .6em;padding-left:1.4em}[data-md="${scope}"] li{margin-bottom:.2em}[data-md="${scope}"] blockquote{border-left:3px solid rgba(255,255,255,.3);padding-left:.8em;color:rgba(255,255,255,.6);margin:.4em 0}[data-md="${scope}"] strong{font-weight:700}[data-md="${scope}"] em{font-style:italic}[data-md="${scope}"] hr{border:none;border-top:1px solid rgba(255,255,255,.12);margin:.6em 0}`;
      document.head.appendChild(styleEl);
      c.innerHTML=d.mdHtml||'';el.appendChild(c);
    }

    const anims=d.anims||[];
    const isTrigger=d.isTrigger||anims.some(a=>a.trigger==='nav');

    // Auto-play animations (trigger=auto or afterPrev)
    const autoAnims=anims.filter(a=>(a.trigger||'auto')==='auto'||(a.trigger==='afterPrev'));
    autoAnims.forEach(a=>{
      // If entrance anim with click trigger on same element would hide it, don't auto-hide for auto anims
      const cssName=ANIM_CSS[a.name]||'el-fadein';
      if(a.category!=='exit'){
        requestAnimationFrame(()=>{el.style.animation=`${cssName} ${a.dur||0.5}s ease-out ${a.delay||0}s both`;});
      }else{
        setTimeout(()=>{requestAnimationFrame(()=>{el.style.animation=`${cssName} ${a.dur||0.5}s ease-out both`;});},(a.delay||0)*1000);
      }
    });

    // Click trigger animations — split into trigger-object vs global-click
    const clickAnims=anims.filter(a=>a.trigger==='click'||a.trigger==='nav');
    if(clickAnims.length>0){
      if(isTrigger){
        // This element is a trigger — only clicking IT fires the animations
        el.style.cursor='pointer';
        el.addEventListener('click',(e)=>{
          e.stopPropagation();
          clickAnims.forEach(a=>fireAnim(el,d,a,idx));
        });
      }else{
        // Non-trigger click anims go into global queue (fired by click/space/arrow anywhere)
        // If the first anim on this element is an entrance, hide element initially
        const firstIsEntrance=clickAnims.length>0&&clickAnims[0].category==='entrance';
        if(firstIsEntrance)el.style.visibility='hidden';
        // Each click anim is a separate step
        clickAnims.forEach(a=>{
          globalClickSteps.push({el,d,a,wasHidden:firstIsEntrance});
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

  // Sort global click steps by their delay value (presentation order)
  globalClickSteps.sort((a,b)=>(a.a.delay||0)-(b.a.delay||0));

  // Attach click/space/arrow handler to container for global queue
  let stepIdx=0;
  container._fireNextStep=function(){
    if(stepIdx>=globalClickSteps.length)return false; // nothing left → allow slide advance
    const {el,d,a,wasHidden}=globalClickSteps[stepIdx];
    if(wasHidden)el.style.visibility='visible';
    fireAnim(el,d,a,idx);
    stepIdx++;
    return true; // consumed the advance
  };
  container._hasSteps=()=>stepIdx<globalClickSteps.length;
}

function fireAnim(el,d,a,idx){
  const cssName=ANIM_CSS[a.name]||'el-fadein';
  el.style.animation='';
  requestAnimationFrame(()=>{
    el.style.animation=`${cssName} ${a.dur||0.5}s ease-out ${a.delay||0}s both`;
  });
  if(a.trigger==='nav'){
    const navTarget=typeof a.navTarget==='number'?a.navTarget:0;
    const wait=((a.delay||0)+(a.dur||0.5))*1000;
    setTimeout(()=>{
      if(!hiddenElsPerSlide[idx])hiddenElsPerSlide[idx]=new Set();
      hiddenElsPerSlide[idx].add(d.id);
      clearAutoTimer();
      gotoPreview(navTarget,navTarget>pidx?'next':'prev');
    },wait);
  }
}
function animTrans(a,b,trans,fwd,dur,cb){
  const d=dur+'ms',sc=pScale();
  a.style.transition='none';b.style.transition='none';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(trans==='fade'){b.style.opacity='0';b.style.pointerEvents='auto';a.style.transition='opacity '+d+' ease';b.style.transition='opacity '+d+' ease';a.style.opacity='0';b.style.opacity='1';setTimeout(cb,dur+60);}
    else if(trans==='slide'){const dir=fwd?1:-1;b.style.transform='scale('+sc+') translateX('+(dir*100)+'%)';b.style.opacity='1';b.style.pointerEvents='auto';a.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';b.style.transition='transform '+d+' cubic-bezier(.4,0,.2,1)';a.style.transform='scale('+sc+') translateX('+(-dir*100)+'%)';b.style.transform='scale('+sc+') translateX(0)';setTimeout(cb,dur+60);}
    else if(trans==='zoom'){b.style.opacity='0';b.style.transform='scale('+(sc*.8)+')';b.style.pointerEvents='auto';a.style.transition='opacity '+d+' ease,transform '+d+' ease';b.style.transition='opacity '+d+' ease,transform '+d+' ease';a.style.opacity='0';a.style.transform='scale('+(sc*1.1)+')';b.style.opacity='1';b.style.transform='scale('+sc+')';setTimeout(cb,dur+60);}
    else if(trans==='flip'){const stage=document.getElementById('preview-stage');stage.style.perspective='1500px';const dir=fwd?1:-1;b.style.opacity='0';b.style.transform='scale('+sc+') rotateY('+(dir*90)+'deg)';b.style.pointerEvents='auto';a.style.transition='transform '+d+' ease,opacity '+(dur/2)+'ms ease';b.style.transition='transform '+d+' ease,opacity '+(dur/2)+'ms '+(dur/2)+'ms ease';a.style.transform='scale('+sc+') rotateY('+(-dir*90)+'deg)';a.style.opacity='0';b.style.opacity='1';b.style.transform='scale('+sc+') rotateY(0)';setTimeout(()=>{stage.style.perspective='';cb();},dur+60);}
    else if(trans==='cube'){const stage=document.getElementById('preview-stage');stage.style.perspective='2000px';const dir=fwd?1:-1;b.style.transform='scale('+sc+') rotateY('+(dir*-90)+'deg)';b.style.opacity='1';b.style.pointerEvents='auto';a.style.transition='transform '+d+' ease';b.style.transition='transform '+d+' ease';a.style.transform='scale('+sc+') rotateY('+(dir*90)+'deg)';b.style.transform='scale('+sc+') rotateY(0)';setTimeout(()=>{document.getElementById('preview-stage').style.perspective='';cb();},dur+60);}
    else if(trans==='dissolve'){b.style.opacity='0';b.style.pointerEvents='auto';a.style.transition='opacity '+d+' steps(12,end)';b.style.transition='opacity '+d+' steps(12,start)';a.style.opacity='0';b.style.opacity='1';setTimeout(cb,dur+60);}
    else{b.style.opacity='1';cb();}
  }));
}

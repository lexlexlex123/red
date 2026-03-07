// ══════════════ GRID ══════════════
function drawGrid(){
  const gc=document.getElementById('grid-canvas');const wrap=document.getElementById('cwrap');
  const W=wrap.clientWidth||800,H=wrap.clientHeight||600;
  gc.width=W;gc.height=H;gc.style.width=W+'px';gc.style.height=H+'px';
  const ctx=gc.getContext('2d');ctx.clearRect(0,0,W,H);
  const _isLight=document.documentElement.classList.contains('light');ctx.fillStyle=_isLight?'rgba(80,80,120,0.25)':'rgba(180,180,200,0.18)';
  for(let x=0;x<W;x+=SNAP)for(let y=0;y<H;y+=SNAP)ctx.fillRect(x,y,1,1);
}

// ══════════════ TABS ══════════════
function switchTab(name,btn){
  document.querySelectorAll('.rtab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');
  document.querySelectorAll('[data-tab]').forEach(g=>g.style.display=g.dataset.tab===name?'flex':'none');
  if(name==='anim'){openAnimPanel();}else{closeAnimPanel();}
  try{localStorage.setItem('sf_active_tab',name);}catch(e){}
  // Show/hide objects panel in props
  const objSec=document.getElementById('objects-panel-section');
  const slidePr=document.getElementById('slide-props');
  const elPr=document.getElementById('el-props');
  if(objSec){
    const isObj=name==='objects';
    objSec.style.display=isObj?'block':'none';
    if(slidePr)slidePr.style.display=isObj?'none':'';
    if(elPr)elPr.style.display=isObj?'none':'';
    if(isObj&&typeof renderObjectsPanel==='function')renderObjectsPanel();
  }
}

// Move anim-panel-body into #props when anim tab is active
window._animInProps = false;
window.openAnimPanel = function(){
  const body = document.getElementById('anim-panel-body');
  const wrap = document.getElementById('props-anim-wrap');
  const scroll = document.getElementById('props-scroll');
  if(!body||!wrap||!scroll) return;
  if(!window._animInProps){
    wrap.appendChild(body);
    window._animInProps = true;
  }
  wrap.style.display='flex';
  scroll.style.display='none';
};
window.closeAnimPanel = function(){
  const wrap = document.getElementById('props-anim-wrap');
  const scroll = document.getElementById('props-scroll');
  if(wrap) wrap.style.display='none';
  if(scroll) scroll.style.display='';
};

// ══════════════ SNAP / GUIDES ══════════════
function snapV(v){return document.getElementById('snap-chk').checked?Math.round(v/SNAP)*SNAP:v;}
let guides=[];
function clearGuides(){guides.forEach(g=>g.remove());guides=[];}
function showGuides(el){
  clearGuides();if(!document.getElementById('snap-chk').checked)return;
  const x=parseInt(el.style.left),y=parseInt(el.style.top),w=parseInt(el.style.width),h=parseInt(el.style.height);
  const cx=canvasW/2,cy=canvasH/2,TH=7;
  if(Math.abs(x+w/2-cx)<TH){addGuide('v',cx);el.style.left=(cx-w/2)+'px';}
  if(Math.abs(y+h/2-cy)<TH){addGuide('h',cy);el.style.top=(cy-h/2)+'px';}
  if(Math.abs(x)<TH){addGuide('v',0);el.style.left='0px';}
  if(Math.abs(y)<TH){addGuide('h',0);el.style.top='0px';}
  if(Math.abs(x+w-canvasW)<TH){addGuide('v',canvasW-1);el.style.left=(canvasW-w)+'px';}
  if(Math.abs(y+h-canvasH)<TH){addGuide('h',canvasH-1);el.style.top=(canvasH-h)+'px';}
}
function addGuide(t,pos){
  const cv=document.getElementById('canvas');const g=document.createElement('div');g.className='guide '+t;
  if(t==='h')g.style.top=pos+'px';else g.style.left=pos+'px';cv.appendChild(g);guides.push(g);
}

// ══════════════ AR ══════════════
function clampEls(newW,newH){
  slides.forEach(s=>{
    (s.els||[]).forEach(d=>{
      if(d._isDecor){d.w=newW;d.h=newH;return;}
      // Clamp position so element is visible on slide
      if(d.x+d.w>newW)d.x=Math.max(0,newW-d.w);
      if(d.y+d.h>newH)d.y=Math.max(0,newH-d.h);
      if(d.x<0)d.x=0;if(d.y<0)d.y=0;
    });
  });
}
function setAR(ratio,btn){
  pushUndo();
  ar=ratio;document.querySelectorAll('.ar-btn').forEach(b=>b.classList.toggle('active',b===btn));
  const oldW=canvasW,oldH=canvasH;
  canvasW=1200;canvasH=ratio==='4:3'?900:675;
  document.getElementById('canvas').style.width=canvasW+'px';document.getElementById('canvas').style.height=canvasH+'px';
  // Scale element positions proportionally
  const sx=canvasW/oldW,sy=canvasH/oldH;
  // Types that must NOT be stretched - preserve aspect ratio
  const noStretch=new Set(['image','icon','svg','shape']);
  slides.forEach(s=>{
    s.ar=ratio;
    (s.els||[]).forEach(d=>{
      if(d._isDecor){d.w=canvasW;d.h=canvasH;return;}
      d.x=Math.round(d.x*sx);
      d.y=Math.round(d.y*sy);
      if(!noStretch.has(d.type)){
        // Text, code, markdown, applets scale with canvas
        d.w=Math.round(d.w*sx);
        d.h=Math.round(d.h*sy);
      }
    });
  });
  clampEls(canvasW,canvasH);
  // Regenerate decor SVGs for new canvas dimensions
  if(typeof refreshDecorColors==='function')refreshDecorColors();
  else{renderAll();saveState();drawThumbs();}
}

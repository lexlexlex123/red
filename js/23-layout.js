// ══════════════ LAYOUT DECOR ══════════════
let selLayout=-1;

// Six premium decorative layout styles
// Each has titleSvg (hero slide) + contentSvg (inner slides)
const LAYOUTS=[
  {
    name:'Neon Split',
    desc:'Bold diagonal with glowing accents',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="glow1"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <polygon points="0,0 ${w*.42},0 ${w*.26},${h} 0,${h}" fill="${a1}" opacity="0.22"/>
      <polygon points="${w*.35},0 ${w*.48},0 ${w*.32},${h} ${w*.19},${h}" fill="${a2}" opacity="0.12"/>
      <line x1="${w*.42}" y1="0" x2="${w*.26}" y2="${h}" stroke="${a1}" stroke-width="2" opacity="0.8" filter="url(#glow1)"/>
      <circle cx="${w*.04}" cy="${h*.18}" r="${h*.22}" fill="${a1}" opacity="0.07"/>
      <circle cx="${w*.04}" cy="${h*.18}" r="${h*.10}" fill="${a1}" opacity="0.09"/>
      <line x1="${w*.55}" y1="${h*.9}" x2="${w}" y2="${h*.9}" stroke="${a2}" stroke-width="1" opacity="0.2"/>
      <line x1="${w*.55}" y1="${h*.94}" x2="${w*.8}" y2="${h*.94}" stroke="${a1}" stroke-width="1" opacity="0.15"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="glow2"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x="0" y="0" width="6" height="${h}" fill="${a1}" opacity="0.7"/>
      <rect x="9" y="${h*.1}" width="2" height="${h*.8}" fill="${a2}" opacity="0.35"/>
      <line x1="0" y1="6" x2="6" y2="6" stroke="${a1}" stroke-width="1" opacity="1" filter="url(#glow2)"/>
      <rect x="0" y="${h-3}" width="${w*.55}" height="2" fill="${a1}" opacity="0.3" rx="1"/>
      <rect x="0" y="${h-7}" width="${w*.3}" height="1" fill="${a2}" opacity="0.2" rx="1"/>
      <circle cx="${w*.96}" cy="${h*.08}" r="${h*.18}" fill="none" stroke="${a1}" stroke-width="1" opacity="0.12"/>
    </svg>`,
  },
  {
    name:'Arc Elegance',
    desc:'Sweeping arcs for premium look',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="sf"><feGaussianBlur stdDeviation="25"/></filter></defs>
      <ellipse cx="${w*1.05}" cy="${h*.5}" rx="${w*.7}" ry="${h*.85}" fill="none" stroke="${a1}" stroke-width="80" opacity="0.07" filter="url(#sf)"/>
      <ellipse cx="${w*1.05}" cy="${h*.5}" rx="${w*.55}" ry="${h*.65}" fill="none" stroke="${a1}" stroke-width="2" opacity="0.25"/>
      <ellipse cx="${w*1.05}" cy="${h*.5}" rx="${w*.62}" ry="${h*.73}" fill="none" stroke="${a2}" stroke-width="1" opacity="0.14"/>
      <ellipse cx="${w*1.05}" cy="${h*.5}" rx="${w*.46}" ry="${h*.55}" fill="none" stroke="${a2}" stroke-width="1" opacity="0.10"/>
      <line x1="${w*.06}" y1="${h*.82}" x2="${w*.52}" y2="${h*.82}" stroke="${a1}" stroke-width="3" opacity="0.55" stroke-linecap="round"/>
      <line x1="${w*.06}" y1="${h*.88}" x2="${w*.34}" y2="${h*.88}" stroke="${a2}" stroke-width="2" opacity="0.35" stroke-linecap="round"/>
      <circle cx="${w*.06}" cy="${h*.18}" r="5" fill="${a1}" opacity="0.6"/>
      <circle cx="${w*.06}" cy="${h*.18}" r="12" fill="${a1}" opacity="0.15"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="sf2"><feGaussianBlur stdDeviation="15"/></filter></defs>
      <ellipse cx="${w}" cy="0" rx="${w*.6}" ry="${h*.7}" fill="none" stroke="${a1}" stroke-width="50" opacity="0.06" filter="url(#sf2)"/>
      <ellipse cx="${w}" cy="0" rx="${w*.48}" ry="${h*.55}" fill="none" stroke="${a1}" stroke-width="1.5" opacity="0.2"/>
      <ellipse cx="${w}" cy="0" rx="${w*.38}" ry="${h*.43}" fill="none" stroke="${a2}" stroke-width="1" opacity="0.12"/>
      <line x1="0" y1="${h-3}" x2="${w*.5}" y2="${h-3}" stroke="${a1}" stroke-width="2.5" opacity="0.4" stroke-linecap="round"/>
      <line x1="0" y1="${h-8}" x2="${w*.28}" y2="${h-8}" stroke="${a2}" stroke-width="1.5" opacity="0.25" stroke-linecap="round"/>
      <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.45" rx="0"/>
    </svg>`,
  },
  {
    name:'Wave Horizon',
    desc:'Organic flowing waves',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="wf"><feGaussianBlur stdDeviation="20"/></filter></defs>
      <path d="M0,${h*.52} C${w*.2},${h*.3} ${w*.4},${h*.62} ${w*.6},${h*.48} C${w*.8},${h*.34} ${w*.9},${h*.55} ${w},${h*.45} L${w},${h} L0,${h} Z" fill="${a1}" opacity="0.16"/>
      <path d="M0,${h*.65} C${w*.25},${h*.48} ${w*.5},${h*.72} ${w*.75},${h*.58} C${w*.88},${h*.5} ${w*.95},${h*.65} ${w},${h*.62} L${w},${h} L0,${h} Z" fill="${a2}" opacity="0.11"/>
      <path d="M0,${h*.78} C${w*.3},${h*.65} ${w*.6},${h*.82} ${w},${h*.72}" fill="none" stroke="${a1}" stroke-width="1.5" opacity="0.3"/>
      <ellipse cx="${w*.88}" cy="${h*.18}" rx="${w*.18}" ry="${h*.28}" fill="${a1}" opacity="0.08" filter="url(#wf)"/>
      <circle cx="${w*.88}" cy="${h*.18}" r="${h*.1}" fill="none" stroke="${a1}" stroke-width="1.5" opacity="0.2"/>
      <line x1="${w*.06}" y1="${h*.2}" x2="${w*.06}" y2="${h*.75}" stroke="${a1}" stroke-width="3" opacity="0.25" stroke-linecap="round"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <path d="M0,0 C${w*.15},${h*.12} ${w*.35},0 ${w*.55},${h*.1} C${w*.75},${h*.2} ${w*.88},${h*.05} ${w},${h*.1} L${w},0 Z" fill="${a1}" opacity="0.18"/>
      <path d="M0,0 C${w*.2},${h*.18} ${w*.45},${h*.06} ${w*.65},${h*.16} C${w*.82},${h*.24} ${w*.92},${h*.1} ${w},${h*.18} L${w},0 Z" fill="${a2}" opacity="0.10"/>
      <line x1="0" y1="${h-2}" x2="${w*.65}" y2="${h-2}" stroke="${a1}" stroke-width="2" opacity="0.3" stroke-linecap="round"/>
      <line x1="0" y1="${h-7}" x2="${w*.38}" y2="${h-7}" stroke="${a2}" stroke-width="1.5" opacity="0.2" stroke-linecap="round"/>
      <rect x="0" y="0" width="4" height="${h}" fill="${a1}" opacity="0.5"/>
    </svg>`,
  },
  {
    name:'Dot Matrix',
    desc:'Tech-inspired grid pattern',
    titleSvg:(w,h,a1,a2)=>{
      let d2='';
      for(let x=Math.round(w*.48);x<=w+5;x+=36)
        for(let y=0;y<=h+5;y+=36){
          const fade=Math.max(0,1-(x-w*.48)/(w*.55));
          const sz=2+fade*1.5;
          d2+=`<circle cx="${x}" cy="${y}" r="${sz.toFixed(1)}" fill="${a1}" opacity="${(0.06+0.12*fade).toFixed(2)}"/>`;
        }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${d2}
        <polygon points="${w*.42},0 ${w},0 ${w},${h*.62}" fill="${a1}" opacity="0.06"/>
        <rect x="${w*.95}" y="0" width="5" height="${h}" fill="${a1}" opacity="0.35"/>
        <rect x="${w*.91}" y="0" width="2" height="${h}" fill="${a2}" opacity="0.2"/>
        <line x1="${w*.06}" y1="${h*.88}" x2="${w*.55}" y2="${h*.88}" stroke="${a1}" stroke-width="3" opacity="0.5" stroke-linecap="round"/>
        <line x1="${w*.06}" y1="${h*.93}" x2="${w*.35}" y2="${h*.93}" stroke="${a2}" stroke-width="2" opacity="0.3" stroke-linecap="round"/>
      </svg>`;
    },
    contentSvg:(w,h,a1,a2)=>{
      let d2='';
      for(let x=Math.round(w*.68);x<=w+5;x+=28)
        for(let y=0;y<=Math.round(h*.5);y+=28){
          const fade=Math.max(0,1-(x-w*.68)/(w*.35));
          d2+=`<circle cx="${x}" cy="${y}" r="1.8" fill="${a1}" opacity="${(0.07+0.1*fade).toFixed(2)}"/>`;
        }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${d2}
        <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.55"/>
        <rect x="8" y="${h*.08}" width="2" height="${h*.84}" fill="${a2}" opacity="0.25"/>
        <rect x="${w*.97}" y="0" width="3" height="${h}" fill="${a2}" opacity="0.15"/>
        <line x1="0" y1="${h-2}" x2="${w*.62}" y2="${h-2}" stroke="${a1}" stroke-width="2" opacity="0.3" stroke-linecap="round"/>
      </svg>`;
    },
  },
  {
    name:'Morphic Blobs',
    desc:'Soft organic shapes, modern look',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="bf1"><feGaussianBlur stdDeviation="30"/></filter><filter id="bf2"><feGaussianBlur stdDeviation="18"/></filter></defs>
      <ellipse cx="${w*.82}" cy="${h*.22}" rx="${w*.32}" ry="${h*.42}" fill="${a1}" opacity="0.18" transform="rotate(-30,${w*.82},${h*.22})" filter="url(#bf1)"/>
      <ellipse cx="${w*.78}" cy="${h*.8}" rx="${w*.22}" ry="${h*.28}" fill="${a2}" opacity="0.14" transform="rotate(20,${w*.78},${h*.8})" filter="url(#bf2)"/>
      <ellipse cx="${w*.05}" cy="${h*.1}" rx="${w*.14}" ry="${h*.18}" fill="${a1}" opacity="0.10" filter="url(#bf2)"/>
      <ellipse cx="${w*.82}" cy="${h*.22}" rx="${w*.18}" ry="${h*.24}" fill="none" stroke="${a1}" stroke-width="1.5" opacity="0.25" transform="rotate(-30,${w*.82},${h*.22})"/>
      <line x1="${w*.07}" y1="${h*.84}" x2="${w*.52}" y2="${h*.84}" stroke="${a1}" stroke-width="3" opacity="0.5" stroke-linecap="round"/>
      <line x1="${w*.07}" y1="${h*.9}" x2="${w*.34}" y2="${h*.9}" stroke="${a2}" stroke-width="2" opacity="0.32" stroke-linecap="round"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="bf3"><feGaussianBlur stdDeviation="22"/></filter></defs>
      <ellipse cx="${w}" cy="${h*.55}" rx="${w*.22}" ry="${h*.72}" fill="${a1}" opacity="0.12" transform="rotate(-8,${w},${h*.55})" filter="url(#bf3)"/>
      <ellipse cx="${w*.02}" cy="${h*.85}" rx="${w*.12}" ry="${h*.3}" fill="${a2}" opacity="0.09" filter="url(#bf3)"/>
      <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.5"/>
      <line x1="0" y1="${h-2}" x2="${w*.55}" y2="${h-2}" stroke="${a1}" stroke-width="2" opacity="0.28" stroke-linecap="round"/>
    </svg>`,
  },
  {
    name:'Clean Lines',
    desc:'Minimalist professional style',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect x="${w*.05}" y="${h*.06}" width="4" height="${h*.6}" fill="${a1}" opacity="0.55" rx="2"/>
      <rect x="${w*.05}" y="${h*.72}" width="4" height="${h*.06}" fill="${a2}" opacity="0.4" rx="2"/>
      <line x1="${w*.05}" y1="${h*.84}" x2="${w*.58}" y2="${h*.84}" stroke="${a1}" stroke-width="2.5" opacity="0.5" stroke-linecap="round"/>
      <line x1="${w*.05}" y1="${h*.9}" x2="${w*.36}" y2="${h*.9}" stroke="${a2}" stroke-width="1.5" opacity="0.3" stroke-linecap="round"/>
      <circle cx="${w*.92}" cy="${h*.12}" r="${w*.055}" fill="none" stroke="${a1}" stroke-width="2" opacity="0.2"/>
      <circle cx="${w*.92}" cy="${h*.12}" r="${w*.028}" fill="${a1}" opacity="0.18"/>
      <circle cx="${w*.92}" cy="${h*.12}" r="4" fill="${a1}" opacity="0.5"/>
      <line x1="${w*.78}" y1="${h*.9}" x2="${w*.98}" y2="${h*.9}" stroke="${a1}" stroke-width="1" opacity="0.2"/>
      <line x1="${w*.78}" y1="${h*.94}" x2="${w*.90}" y2="${h*.94}" stroke="${a2}" stroke-width="1" opacity="0.15"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.55" rx="0"/>
      <rect x="8" y="${h*.12}" width="2" height="${h*.76}" fill="${a2}" opacity="0.22" rx="1"/>
      <line x1="0" y1="${h-3}" x2="${w*.6}" y2="${h-3}" stroke="${a1}" stroke-width="2.5" opacity="0.4" stroke-linecap="round"/>
      <line x1="0" y1="${h-8}" x2="${w*.36}" y2="${h-8}" stroke="${a2}" stroke-width="1.5" opacity="0.25" stroke-linecap="round"/>
      <circle cx="${w*.96}" cy="${h*.5}" r="${h*.35}" fill="none" stroke="${a1}" stroke-width="1" opacity="0.08"/>
      <circle cx="${w*.96}" cy="${h*.5}" r="${h*.22}" fill="none" stroke="${a2}" stroke-width="1" opacity="0.06"/>
    </svg>`,
  },
];

// Update decor elements across all slides with new accent colors
function refreshDecorColors(ac1,ac2){
  invalidateThumbCache();
  slides.forEach((s,si)=>{
    s.els.forEach(d=>{
      if(!d._isDecor||d._decorStyle==null)return;
      const lay=LAYOUTS[d._decorStyle];if(!lay)return;
      const isTitle=si===0;
      d.svgContent=isTitle?lay.titleSvg(canvasW,canvasH,ac1,ac2):lay.contentSvg(canvasW,canvasH,ac1,ac2);
    });
  });
  // Re-render current slide so decor is visible immediately
  renderAll();
}

// Map presentation theme to code color theme
function getCodeThemeForPresTheme(){
  if(appliedThemeIdx<0||appliedThemeIdx>=THEMES.length)return'dark';
  const t=THEMES[appliedThemeIdx];
  // Light presentation themes → light code theme
  if(t.dark===false)return'light';
  // Dark themes — pick by accent color feel
  const ac=(t.ac1||'').toLowerCase();
  if(ac.includes('f92672')||ac.includes('ff79c6')||ac.includes('f472b6'))return'dracula';
  if(ac.includes('fbbf24')||ac.includes('f59e0b')||ac.includes('ffa657'))return'monokai';
  return'dark'; // default GitHub dark
}

// Refresh all code blocks in all slides with current pres theme
function refreshAllCodeBlocks(){
  const theme=getCodeThemeForPresTheme();
  slides.forEach(s=>{
    s.els.forEach(d=>{
      if(d.type!=='code')return;
      d.codeTheme=theme;
      const T=CODE_THEMES[theme]||CODE_THEMES.dark;
      d.codeBg=T.bg;
      d.codeHtml=syntaxHighlight(d.codeRaw||'',d.codeLang||'js',theme);
    });
  });
  // Re-render current slide code blocks in DOM
  document.querySelectorAll('#canvas .el[data-type="code"]').forEach(el=>{
    const d=slides[cur]&&slides[cur].els.find(e=>e.id===el.dataset.id);
    if(d)renderCodeEl(el,d);
  });
}

function getThemeAccents(){
  // Try to get accent from currently applied theme, fallback to default blue
  if(selTheme>=0&&selTheme<THEMES.length){
    const t=THEMES[selTheme];
    return{ac1:t.ac1||'#6366f1',ac2:t.ac2||'#818cf8'};
  }
  // Guess from current slide bg or use neutral
  return{ac1:'#6366f1',ac2:'#818cf8'};
}

function buildLayoutGrid(){
  const g=document.getElementById('layout-grid');if(!g)return;g.innerHTML='';
  const{ac1,ac2}=getThemeAccents();
  const slideBg=(slides[0]&&slides[0].bg)||'#0f172a';
  const PW=280,PH=157;

  // None/Clear card
  const none=document.createElement('div');
  none.className='lcard';
  none.style.cssText='border:2px solid var(--border2);border-radius:10px;cursor:pointer;overflow:hidden;transition:.15s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:var(--surface2);';
  none.innerHTML='<div style="width:'+PW+'px;height:'+PH+'px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:var(--surface2)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:34px;height:34px;opacity:.3"><path d="M18 6L6 18M6 6l12 12"/></svg><span style="font-size:11px;color:var(--text2);font-weight:600">Без оформления</span></div>';
  none.onclick=()=>{selLayout=-1;g.querySelectorAll('.lcard').forEach(c=>c.style.borderColor='var(--border2)');none.style.borderColor='var(--accent)';};
  g.appendChild(none);

  LAYOUTS.forEach((lay,i)=>{
    const card=document.createElement('div');
    card.className='lcard';
    card.style.cssText='border:2px solid var(--border2);border-radius:10px;cursor:pointer;overflow:hidden;transition:.15s;background:var(--surface);';
    // Full-width 16:9 title slide preview
    const pw=320,ph=180;
    const titleSvg=lay.titleSvg(pw,ph,ac1,ac2);
    // Realistic slide mockup with text placeholders on dark bg
    const fakeTitle=`<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${pw} ${ph}">
      <rect width="${pw}" height="${ph}" fill="#0f1117"/>
      <rect x="44" y="${ph*0.32}" width="${pw*0.52}" height="14" rx="3" fill="rgba(255,255,255,.22)"/>
      <rect x="44" y="${ph*0.32+20}" width="${pw*0.36}" height="9" rx="2" fill="rgba(255,255,255,.12)"/>
      <rect x="44" y="${ph*0.32+36}" width="${pw*0.24}" height="7" rx="2" fill="rgba(255,255,255,.07)"/>
      <rect x="44" y="${ph*0.32+52}" width="${pw*0.42}" height="5" rx="2" fill="rgba(255,255,255,.05)"/>
    </svg>`;
    card.innerHTML=`
      <div style="position:relative;overflow:hidden;aspect-ratio:16/9;">
        <div style="position:absolute;inset:0;">${fakeTitle}</div>
        <div style="position:absolute;inset:0;">${titleSvg}</div>
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.25) 0%,transparent 50%)"></div>
        <div style="position:absolute;bottom:7px;left:10px;font-size:8px;font-weight:700;color:rgba(255,255,255,.85);letter-spacing:.8px;text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,.8)">${lay.name}</div>
      </div>
      <div style="padding:7px 10px;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:9px;color:var(--text3)">${lay.desc}</div>
        <div class="lcard-dot" style="width:9px;height:9px;border-radius:50%;border:2px solid var(--border2);transition:.15s;flex-shrink:0"></div>
      </div>`;
    card.onclick=()=>{
      selLayout=i;
      g.querySelectorAll('.lcard').forEach(c=>{
        c.style.borderColor='var(--border2)';
        const dot=c.querySelector('.lcard-dot');
        if(dot){dot.style.background='transparent';dot.style.borderColor='var(--border2)';}
      });
      card.style.borderColor='var(--accent)';
      const dot=card.querySelector('.lcard-dot');
      if(dot){dot.style.background='var(--accent)';dot.style.borderColor='var(--accent)';}
    };
    g.appendChild(card);
  });
}


function openLayoutModal(){
  selLayout=-1;
  buildLayoutGrid();
  document.getElementById('layout-modal').classList.add('open');
}
function closeLayoutModal(){document.getElementById('layout-modal').classList.remove('open');}

function applyLayoutDecor(){
  pushUndo();
  const{ac1,ac2}=getThemeAccents();
  const W=canvasW,H=canvasH;

  // Remove existing decor elements
  slides.forEach(s=>{s.els=s.els.filter(el=>!el._isDecor);});

  if(selLayout<0){
    // Clear decor only
    renderAll();saveState();closeLayoutModal();
    toast('Decorative layout cleared','ok');
    return;
  }

  const lay=LAYOUTS[selLayout];

  slides.forEach((s,si)=>{
    const isTitle=si===0;
    const svgContent=isTitle?lay.titleSvg(W,H,ac1,ac2):lay.contentSvg(W,H,ac1,ac2);
    const decor={
      id:'decor_'+si+'_'+Date.now(),
      type:'svg',
      svgContent,
      x:0,y:0,w:W,h:H,
      rot:0,anims:[],
      _isDecor:true,
      _decorStyle:selLayout,
    };
    // Insert at the beginning (behind all elements)
    s.els.unshift(decor);
  });

  renderAll();saveState();closeLayoutModal();
  toast('Layout "'+lay.name+'" applied','ok');
}

// Rebuild layout grid when theme is applied (to update accent colors)
const _origCloseThemeModal=closeThemeModal;
// (auto-called via applyTheme which calls closeThemeModal)
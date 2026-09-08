
// ══════════════ STATE ══════════════
const SNAP=10;
let slides=[],cur=0,sel=null,ec=0,ar='16:9',canvasW=1200,canvasH=675;
let multiSel=new Set(),rbStart=null,clipboard=[];
let slideMultiSel=new Set(),slideSelAnchor=0;
let _justClearedMulti=false;
let globalTrans='none',transitionDur=500,autoDelay=5;
let undoStack=[],redoStack=[];
let selTheme=-1,selShape='rect',selApplet=null,appliedThemeIdx=-1,_alignScope='sel';
let recentColors=[];

const BGS=[
  {id:'b1',s:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)'},
  {id:'b2',s:'linear-gradient(135deg,#f093fb,#f5576c)'},
  {id:'b3',s:'linear-gradient(135deg,#0575e6,#021b79)'},
  {id:'b4',s:'linear-gradient(135deg,#11998e,#38ef7d)'},
  {id:'b5',s:'linear-gradient(135deg,#f7971e,#ffd200)'},
  {id:'b6',s:'linear-gradient(135deg,#8e2de2,#4a00e0)'},
  {id:'b7',s:'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)'},
  {id:'b8',s:'linear-gradient(135deg,#232526,#414345)'},
  {id:'wh',s:'#f8fafc'},{id:'dk',s:'#0d0d12'},
];
// 8-color scheme for palette grid (8 cols × 9 lightness rows)
// Base colors harmonize with the theme background — no pure white in base row.
// col[7] is neutral: theme-aware (row 0 = text contrast), remaps on theme change.
// Lightness steps 0.1…0.9; scheme refs are {col,row} (0-based). Custom = hex, no scheme.
const SCHEME_TINT_LEVELS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

function _themeColors(t){
  // 8 columns: [0]=heading stripe, [1]=shape stripe (as on theme thumbnail), then accents, last=neutral
  let base;
  if(t.colors && t.colors.length){
    base=t.colors.slice();
  } else {
    const c1 = t.ac1 || '#6366f1';
    const c2 = t.ac2 || '#4338ca';
    const c3 = t.ac3 || '#c7d2fe';
    const c4 = t.shapeFill || c2;
    const c5 = t.shapeStroke || c1;
    const c6 = t.headingColor || c1;
    const c7 = t.bodyColor || (t.dark ? '#e2e8f0' : '#1e293b');
    base = [c1, c2, c3, c4, c5, c6, c7, t.dark ? '#000000' : '#ffffff'];
  }
  if(t.headingColor) base[0]=t.headingColor;
  if(t.shapeFill) base[1]=t.shapeFill;
  while(base.length<8) base.push(t.dark?'#000000':'#ffffff');
  return base.slice(0,8);
}

/** Position label: col/row 1-based, e.g. "11" = first swatch. */
function _schemePosCode(col, row){
  return String((col|0)+1)+String((row|0)+1);
}

/** Default stroke for line segments & angle marks — palette "15". */
const DEFAULT_LINE_COLOR_SCHEME = {col:0, row:4};
/** Default shape fill — palette "15". */
const DEFAULT_SHAPE_FILL_SCHEME = {col:0, row:4};
/** Default shape stroke — palette "14". */
const DEFAULT_SHAPE_STROKE_SCHEME = {col:0, row:3};
/** Default shape outline width (filled shapes). */
const DEFAULT_SHAPE_STROKE_W = 0;
/** Default LEGO block color — palette "11". */
const DEFAULT_LEGO_COLOR_SCHEME = {col:0, row:0};
/** Default icon color — palette "13". */
const DEFAULT_ICON_COLOR_SCHEME = {col:0, row:2};

function _schemeColorFromDefaults(scheme, fallback){
  const th = typeof _activeThemeForScheme === 'function' ? _activeThemeForScheme() : null;
  let color = null;
  if(th && typeof _schemeSwatchColor === 'function')
    color = _schemeSwatchColor(th, scheme.col, scheme.row);
  if(!color && typeof THEMES !== 'undefined' && THEMES[0] && typeof _schemeSwatchColor === 'function')
    color = _schemeSwatchColor(THEMES[0], scheme.col, scheme.row);
  return {color: color || fallback, schemeRef: {col: scheme.col, row: scheme.row}};
}

function _defaultShapeFill(){
  return _schemeColorFromDefaults(DEFAULT_SHAPE_FILL_SCHEME, '#64748b');
}

function _defaultShapeStroke(){
  return _schemeColorFromDefaults(DEFAULT_SHAPE_STROKE_SCHEME, '#475569');
}

function _defaultLineColor(){
  const scheme = {col: DEFAULT_LINE_COLOR_SCHEME.col, row: DEFAULT_LINE_COLOR_SCHEME.row};
  const th = typeof _activeThemeForScheme === 'function' ? _activeThemeForScheme() : null;
  let color = null;
  if(th && typeof _schemeSwatchColor === 'function')
    color = _schemeSwatchColor(th, scheme.col, scheme.row);
  if(!color && typeof THEMES !== 'undefined' && THEMES[0] && typeof _schemeSwatchColor === 'function')
    color = _schemeSwatchColor(THEMES[0], scheme.col, scheme.row);
  return {color: color || '#64748b', schemeRef: scheme};
}

function _defaultLegoColor(){
  const scheme = {col: DEFAULT_LEGO_COLOR_SCHEME.col, row: DEFAULT_LEGO_COLOR_SCHEME.row};
  const th = typeof _activeThemeForScheme === 'function' ? _activeThemeForScheme() : null;
  let color = null;
  if(th && typeof _schemeSwatchColor === 'function')
    color = _schemeSwatchColor(th, scheme.col, scheme.row);
  if(!color && typeof THEMES !== 'undefined' && THEMES[0] && typeof _schemeSwatchColor === 'function')
    color = _schemeSwatchColor(THEMES[0], scheme.col, scheme.row);
  return {color: color || '#906cf9', schemeRef: scheme};
}

function _defaultIconColor(){
  const scheme = {col: DEFAULT_ICON_COLOR_SCHEME.col, row: DEFAULT_ICON_COLOR_SCHEME.row};
  const th = typeof _activeThemeForScheme === 'function' ? _activeThemeForScheme() : null;
  let color = null;
  if(th && typeof _schemeSwatchColor === 'function')
    color = _schemeSwatchColor(th, scheme.col, scheme.row);
  if(!color && typeof THEMES !== 'undefined' && THEMES[0] && typeof _schemeSwatchColor === 'function')
    color = _schemeSwatchColor(THEMES[0], scheme.col, scheme.row);
  if(!color && th && th.shapeFill) color = th.shapeFill;
  return {color: color || '#6366f1', schemeRef: scheme};
}

function _activeThemeForScheme(){
  const idx=(typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0)?appliedThemeIdx
    :((typeof selTheme!=='undefined'&&selTheme>=0)?selTheme:-1);
  return (idx>=0&&typeof THEMES!=='undefined'&&THEMES[idx])?THEMES[idx]:null;
}

/** Input display: scheme → "11", custom → "#rrggbb". */
function _colorFieldDisplay(hex, schemeRef){
  if(schemeRef&&schemeRef.col!=null&&schemeRef.row!=null)
    return _schemePosCode(schemeRef.col, schemeRef.row);
  return hex||'';
}

/** Parse field: "11" → scheme color, "#rrggbb" → custom. */
function _parseColorField(str){
  const s=(str||'').trim();
  const pos=s.match(/^([1-8])([1-9])$/);
  if(pos){
    const scheme={col:+pos[1]-1, row:+pos[2]-1};
    const theme=_activeThemeForScheme();
    const color=theme&&typeof _schemeSwatchColor==='function'
      ?_schemeSwatchColor(theme, scheme.col, scheme.row):null;
    if(color) return {color, schemeRef:scheme};
  }
  if(/^#[0-9a-fA-F]{6}$/.test(s)) return {color:s, schemeRef:null};
  if(/^[0-9a-fA-F]{6}$/.test(s)) return {color:'#'+s, schemeRef:null};
  return null;
}

function _setColorFieldValue(inputId, previewId, color, schemeRef){
  try{
    let c=color;
    // Если цвет из схемы — всегда резолвим актуальный hex (после смены темы)
    if(schemeRef&&typeof _resolveSchemeColor==='function'){
      const th=typeof _activeThemeForScheme==='function'?_activeThemeForScheme():null;
      const resolved=th?_resolveSchemeColor(schemeRef,th):null;
      if(resolved) c=resolved;
    }
    const inp=document.getElementById(inputId);
    if(inp) inp.value=_colorFieldDisplay(c, schemeRef);
    if(previewId){
      const prev=document.getElementById(previewId);
      if(prev&&c) prev.style.background=c;
    }
  }catch(e){}
}

/** onPick for openColorPanel — пишет позицию или #hex в поле. */
function colorPickHandler(inputId, previewId, applyFn){
  return function(c, sr){
    _setColorFieldValue(inputId, previewId, c, sr);
    if(typeof applyFn==='function') applyFn(c, sr);
  };
}

/** oninput для поля цвета: "11" или "#rrggbb". */
function colorFieldOnInput(value, previewId, applyFn){
  const p=typeof _parseColorField==='function'&&_parseColorField(value);
  if(!p) return;
  if(previewId){
    const el=document.getElementById(previewId);
    if(el) el.style.background=p.color;
  }
  if(typeof applyFn==='function') applyFn(p.color, p.schemeRef);
  // Sync open «Свой цвет» bar + triangle when typing hex / palette code
  if(typeof _cpSyncCustomColor==='function'){
    let panelId=null;
    if(typeof document!=='undefined'){
      const ae=document.activeElement;
      const map={'draw-hex':'cp-draw-slot','draw-fill-hex':'cp-draw-fill-slot','draw-sel-hex':'cp-draw-sel-slot'};
      if(ae&&ae.id&&map[ae.id]) panelId=map[ae.id];
    }
    _cpSyncCustomColor(p.color, panelId);
  }
}

function _parseHexRgb(hex){
  if(!hex||typeof hex!=='string') return null;
  const m=hex.match(/#?([0-9a-fA-F]{6})/);
  if(!m) return null;
  const h=m[1];
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}

function _rgbToHsl(r,g,b){
  r/=255; g/=255; b/=255;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
  const l=(mx+mn)/2;
  if(mx===mn) return {h:0,s:0,l};
  const d=mx-mn;
  const s=l>0.5?d/(2-mx-mn):d/(mx+mn);
  let h;
  if(mx===r) h=((g-b)/d+(g<b?6:0))/6;
  else if(mx===g) h=((b-r)/d+2)/6;
  else h=((r-g)/d+4)/6;
  return {h:h*360,s,l};
}

function _hslToHex(h,s,l){
  h=(((h%360)+360)%360)/360;
  let r,g,b;
  if(s===0){ r=g=b=l; }
  else{
    const hue2rgb=(p,q,t)=>{
      if(t<0) t+=1; if(t>1) t-=1;
      if(t<1/6) return p+(q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    const q=l<0.5?l*(1+s):l+s-l*s;
    const p=2*l-q;
    r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
  }
  const to=x=>Math.round(Math.max(0,Math.min(1,x))*255).toString(16).padStart(2,'0');
  return '#'+to(r)+to(g)+to(b);
}

function _setHexLightness(hex, L){
  const rgb=_parseHexRgb(hex);
  if(!rgb) return hex;
  const hsl=_rgbToHsl(rgb[0],rgb[1],rgb[2]);
  return _hslToHex(hsl.h, hsl.s, Math.max(0, Math.min(1, L)));
}

function _grayHex(L){
  const v=Math.round(Math.max(0,Math.min(1,L))*255);
  const h=v.toString(16).padStart(2,'0');
  return '#'+h+h+h;
}

/** Lightness for row: light theme dark→light, dark theme light→dark (so "11" stays readable). */
function _schemeRowLightness(row, isLightTheme){
  const levels=SCHEME_TINT_LEVELS;
  const n=levels.length;
  row=row|0;
  if(row<0||row>=n) return levels[0];
  return isLightTheme ? levels[row] : levels[n-1-row];
}

/** Palette swatch at (col,row). Dark themes reverse order so row0 is light. */
function _schemeSwatchColor(theme, col, row){
  if(!theme) return null;
  const levels=SCHEME_TINT_LEVELS;
  const base8=_themeColors(theme);
  const isLightTheme=!theme.dark;
  const n=levels.length;
  col=col|0; row=row|0;
  if(row<0||row>=n||col<0||col>=base8.length) return null;
  const L=_schemeRowLightness(row, isLightTheme);
  const isLastCol=col===base8.length-1;
  if(isLastCol){
    if(row===0) return isLightTheme?'#000000':'#ffffff';
    if(row===n-1) return isLightTheme?'#ffffff':'#000000';
    if(row===7 && isLightTheme) return '#dddddd';
    return _grayHex(L);
  }
  let hex=base8[col]||'#888888';
  if(typeof hex==='string'&&!hex.startsWith('#')){
    const m=hex.match(/#[0-9a-fA-F]{6}/);
    hex=m?m[0]:'#888888';
  }
  return _setHexLightness(hex, L);
}

/** Nearest palette swatch for a hex (for default shape fill/stroke → "41" etc.). */
function _closestSchemeRef(hex, theme){
  if(!theme||!hex||hex==='none'||hex==='transparent') return null;
  const target=_parseHexRgb(hex);
  if(!target) return null;
  let best=null, bestDist=Infinity;
  for(let col=0; col<8; col++){
    for(let row=0; row<SCHEME_TINT_LEVELS.length; row++){
      const c=_schemeSwatchColor(theme, col, row);
      const rgb=_parseHexRgb(c);
      if(!rgb) continue;
      const d=(rgb[0]-target[0])*(rgb[0]-target[0])
        +(rgb[1]-target[1])*(rgb[1]-target[1])
        +(rgb[2]-target[2])*(rgb[2]-target[2]);
      if(d<bestDist){ bestDist=d; best={col, row}; if(d===0) return best; }
    }
  }
  return best;
}
window._closestSchemeRef=_closestSchemeRef;

const THEMES=[
  // ── DARK ──
  // colors[]: 8 palette columns. Order = distinct hues (no near-duplicate col1/col2).
  // Layout: former [2,3,4, bridge,5,6,7,8] — bridge sits between warm/cool neighbours.
  {name:'Ocean Night', dark:true,  bg:'linear-gradient(135deg,#0f0c29,#302b63)',
   ac1:'#818cf8',ac2:'#6366f1',ac3:'#c7d2fe',shapeFill:'#bb7fd7',shapeStroke:'#a5b4fc',headingColor:'#818cf8',bodyColor:'#e2e8f0',
   colors:['#c7d2fe','#bb7fd7','#f472b6','#fb923c','#fbbf24','#67e8f9','#a78bfa','#000000']},

  {name:'Midnight',    dark:true,  bg:'#0d1117',
   ac1:'#60a5fa',ac2:'#3b82f6',ac3:'#93c5fd',shapeFill:'#aeb28f',shapeStroke:'#3b82f6',headingColor:'#60a5fa',bodyColor:'#c9d1d9',
   colors:['#34d399','#aeb28f','#fbbf24','#4ade80','#a78bfa','#38bdf8','#fb923c','#000000']},

  {name:'Neon City',   dark:true,  bg:'#0a0010',
   ac1:'#c084fc',ac2:'#a855f7',ac3:'#e879f9',shapeFill:'#85b1be',shapeStroke:'#c084fc',headingColor:'#c084fc',bodyColor:'#e0e0ff',
   colors:['#e879f9','#85b1be','#4ade80','#a3e635','#f472b6','#fbbf24','#67e8f9','#000000']},

  {name:'Coral Blaze', dark:true,  bg:'linear-gradient(135deg,#1a0533,#8b2252)',
   ac1:'#f472b6',ac2:'#ec4899',ac3:'#fbcfe8',shapeFill:'#ce7fd8',shapeStroke:'#f9a8d4',headingColor:'#f472b6',bodyColor:'#fce7f3',
   colors:['#fb923c','#ce7fd8','#a78bfa','#818cf8','#38bdf8','#4ade80','#f9a8d4','#000000']},

  {name:'Forest Deep', dark:true,  bg:'linear-gradient(135deg,#0a2010,#1a4a2a)',
   ac1:'#4ade80',ac2:'#22c55e',ac3:'#bbf7d0',shapeFill:'#41cebc',shapeStroke:'#4ade80',headingColor:'#4ade80',bodyColor:'#d1fae5',
   colors:['#a3e635','#41cebc','#38bdf8','#818cf8','#f472b6','#86efac','#d9f99d','#000000']},

  {name:'Solar Flare', dark:true,  bg:'linear-gradient(135deg,#1a0a00,#4a1500)',
   ac1:'#fbbf24',ac2:'#f59e0b',ac3:'#fde68a',shapeFill:'#a3cf52',shapeStroke:'#fbbf24',headingColor:'#fbbf24',bodyColor:'#fef3c7',
   colors:['#fb923c','#a3cf52','#4ade80','#2dd4bf','#38bdf8','#a78bfa','#fde68a','#000000']},

  {name:'Rose Gold',   dark:true,  bg:'linear-gradient(135deg,#1a0a10,#3d1520)',
   ac1:'#fda4af',ac2:'#fb7185',ac3:'#fecdd3',shapeFill:'#c2caae',shapeStroke:'#fb7185',headingColor:'#fda4af',bodyColor:'#ffe4e6',
   colors:['#fb923c','#c2caae','#86efac','#2dd4bf','#93c5fd','#c4b5fd','#fecdd3','#000000']},

  {name:'Arctic Blue', dark:true,  bg:'linear-gradient(135deg,#003d5c,#0369a1)',
   ac1:'#7dd3fc',ac2:'#38bdf8',ac3:'#bae6fd',shapeFill:'#bcc990',shapeStroke:'#38bdf8',headingColor:'#7dd3fc',bodyColor:'#f0f9ff',
   colors:['#bae6fd','#bcc990','#fbbf24','#fb923c','#f472b6','#a5f3fc','#c7d2fe','#000000']},

  {name:'Sage Night',  dark:true,  bg:'linear-gradient(135deg,#1a2e1a,#2d4a2d)',
   ac1:'#86efac',ac2:'#4ade80',ac3:'#bbf7d0',shapeFill:'#77ecd3',shapeStroke:'#4ade80',headingColor:'#86efac',bodyColor:'#f0fdf4',
   colors:['#d9f99d','#77ecd3','#67e8f9','#818cf8','#f472b6','#a78bfa','#bbf7d0','#000000']},

  {name:'Citrus Dark', dark:true,  bg:'linear-gradient(135deg,#1a1200,#3d2c00)',
   ac1:'#fbbf24',ac2:'#f59e0b',ac3:'#bef264',shapeFill:'#9abe8e',shapeStroke:'#f59e0b',headingColor:'#fbbf24',bodyColor:'#fffbeb',
   colors:['#bef264','#9abe8e','#38bdf8','#c084fc','#f87171','#a78bfa','#fde68a','#000000']},

  {name:'Crimson',     dark:true,  bg:'linear-gradient(135deg,#1a0000,#450000)',
   ac1:'#f87171',ac2:'#ef4444',ac3:'#fca5a5',shapeFill:'#a1a879',shapeStroke:'#f87171',headingColor:'#f87171',bodyColor:'#fee2e2',
   colors:['#fb923c','#a1a879','#4ade80','#2dd4bf','#38bdf8','#c084fc','#fca5a5','#000000']},

  {name:'Deep Teal',   dark:true,  bg:'linear-gradient(135deg,#042f2e,#065f46)',
   ac1:'#5eead4',ac2:'#14b8a6',ac3:'#99f6e4',shapeFill:'#add57c',shapeStroke:'#5eead4',headingColor:'#5eead4',bodyColor:'#ccfbf1',
   colors:['#a7f3d0','#add57c','#fbbf24','#fb923c','#f472b6','#86efac','#99f6e4','#000000']},

  {name:'Slate Storm', dark:true,  bg:'linear-gradient(135deg,#0f172a,#1e293b)',
   ac1:'#94a3b8',ac2:'#64748b',ac3:'#cbd5e1',shapeFill:'#efd48a',shapeStroke:'#94a3b8',headingColor:'#e2e8f0',bodyColor:'#cbd5e1',
   colors:['#60a5fa','#efd48a','#fbbf24','#fb923c','#f472b6','#a78bfa','#94a3b8','#000000']},

  {name:'Aurora',      dark:true,  bg:'linear-gradient(135deg,#042f2e,#0f0c29,#1a0533)',
   ac1:'#a78bfa',ac2:'#34d399',ac3:'#67e8f9',shapeFill:'#ce7fd8',shapeStroke:'#a78bfa',headingColor:'#a78bfa',bodyColor:'#e0f2fe',
   colors:['#34d399','#ce7fd8','#f472b6','#fb923c','#fbbf24','#818cf8','#6ee7b7','#000000']},

  {name:'Copper',      dark:true,  bg:'linear-gradient(135deg,#1c0a00,#3b1f0a)',
   ac1:'#fb923c',ac2:'#f97316',ac3:'#fdba74',shapeFill:'#a3b85e',shapeStroke:'#fb923c',headingColor:'#fb923c',bodyColor:'#fff7ed',
   colors:['#fbbf24','#a3b85e','#4ade80','#2dd4bf','#38bdf8','#f472b6','#fdba74','#000000']},

  {name:'Galaxy',      dark:true,  bg:'linear-gradient(135deg,#000010,#0a0030,#200040)',
   ac1:'#e879f9',ac2:'#d946ef',ac3:'#f0abfc',shapeFill:'#99acbd',shapeStroke:'#e879f9',headingColor:'#e879f9',bodyColor:'#fae8ff',
   colors:['#818cf8','#99acbd','#4ade80','#a3e635','#fbbf24','#f472b6','#c084fc','#000000']},

  // ── LIGHT ──
  {name:'Clean White', dark:false, bg:'#ffffff',
   ac1:'#3b82f6',ac2:'#2563eb',ac3:'#bfdbfe',shapeFill:'#694a5c',shapeStroke:'#1d4ed8',headingColor:'#1e40af',bodyColor:'#1e293b',
   colors:['#0f766e','#694a5c','#b45309','#3f6212','#9333ea','#be123c','#475569','#000000']},

  {name:'Warm Paper',  dark:false, bg:'linear-gradient(135deg,#fefce8,#fef9c3)',
   ac1:'#92400e',ac2:'#b45309',ac3:'#fcd34d',shapeFill:'#4b4274',shapeStroke:'#92400e',headingColor:'#78350f',bodyColor:'#292524',
   colors:['#92400e','#4b4274','#1d4ed8','#0e7490','#6b21a8','#9f1239','#374151','#000000']},

  {name:'Soft Indigo', dark:false, bg:'linear-gradient(135deg,#eef2ff,#e0e7ff)',
   ac1:'#4338ca',ac2:'#6366f1',ac3:'#c7d2fe',shapeFill:'#265870',shapeStroke:'#4338ca',headingColor:'#3730a3',bodyColor:'#1e1b4b',
   colors:['#1d4ed8','#265870','#15803d','#a16207','#9333ea','#be123c','#1e1b4b','#000000']},

  {name:'Mint Fresh',  dark:false, bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)',
   ac1:'#166534',ac2:'#16a34a',ac3:'#86efac',shapeFill:'#12654e',shapeStroke:'#15803d',headingColor:'#14532d',bodyColor:'#052e16',
   colors:['#166534','#12654e','#0f766e','#a16207','#0369a1','#4338ca','#3f6212','#000000']},

  {name:'Rose Petal',  dark:false, bg:'linear-gradient(135deg,#fff1f2,#ffe4e6)',
   ac1:'#be123c',ac2:'#e11d48',ac3:'#fda4af',shapeFill:'#a03a20',shapeStroke:'#be123c',headingColor:'#9f1239',bodyColor:'#1c1917',
   colors:['#be123c','#a03a20','#a16207','#166534','#6b21a8','#1d4ed8','#374151','#000000']},

  {name:'Sky Day',     dark:false, bg:'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
   ac1:'#0369a1',ac2:'#0284c7',ac3:'#7dd3fc',shapeFill:'#0e6d61',shapeStroke:'#0369a1',headingColor:'#075985',bodyColor:'#0c4a6e',
   colors:['#0369a1','#0e6d61','#15803d','#a16207','#4338ca','#6b21a8','#0c4a6e','#000000']},

  {name:'Утки',nameEn:'Ducks', dark:false, bg:'linear-gradient(165deg,#ffffff 0%,#eef6ff 42%,#dbeafe 100%)',
   ac1:'#1e40af',ac2:'#2563eb',ac3:'#60a5fa',shapeFill:'#175867',shapeStroke:'#1e40af',headingColor:'#1e3a5f',bodyColor:'#1e293b',
   colors:['#1e40af','#175867','#0f766e','#a16207','#15803d','#7c3aed','#334155','#000000']},

  {name:'Corporate',   dark:false, bg:'linear-gradient(135deg,#f8fafc,#f1f5f9)',
   ac1:'#1d4ed8',ac2:'#2563eb',ac3:'#93c5fd',shapeFill:'#1a505f',shapeStroke:'#1d4ed8',headingColor:'#1e3a8a',bodyColor:'#0f172a',
   colors:['#1d4ed8','#1a505f','#166534','#a16207','#6b21a8','#9f1239','#334155','#000000']},

  {name:'Lavender',    dark:false, bg:'linear-gradient(135deg,#faf5ff,#f3e8ff)',
   ac1:'#7c3aed',ac2:'#9333ea',ac3:'#d8b4fe',shapeFill:'#34497b',shapeStroke:'#7c3aed',headingColor:'#581c87',bodyColor:'#2e1065',
   colors:['#7c3aed','#34497b','#0f766e','#166534','#be123c','#a16207','#2e1065','#000000']},

  {name:'Peach',       dark:false, bg:'linear-gradient(135deg,#fff7ed,#ffedd5)',
   ac1:'#c2410c',ac2:'#ea580c',ac3:'#fdba74',shapeFill:'#494923',shapeStroke:'#c2410c',headingColor:'#7c2d12',bodyColor:'#1c1917',
   colors:['#c2410c','#494923','#166534','#0e7490','#1d4ed8','#6b21a8','#374151','#000000']},

  {name:'Slate Clean', dark:false, bg:'linear-gradient(135deg,#f8fafc,#e2e8f0)',
   ac1:'#334155',ac2:'#475569',ac3:'#94a3b8',shapeFill:'#583d19',shapeStroke:'#334155',headingColor:'#0f172a',bodyColor:'#1e293b',
   colors:['#1d4ed8','#583d19','#a16207','#166534','#6b21a8','#9f1239','#334155','#000000']},

  {name:'Teal Light',  dark:false, bg:'linear-gradient(135deg,#f0fdfa,#ccfbf1)',
   ac1:'#0f766e',ac2:'#14b8a6',ac3:'#5eead4',shapeFill:'#0b5c76',shapeStroke:'#0f766e',headingColor:'#134e4a',bodyColor:'#042f2e',
   colors:['#0f766e','#0b5c76','#0369a1','#a16207','#4338ca','#be123c','#042f2e','#000000']},

  {name:'Newspaper',   dark:false, bg:'#f5f0e8',
   ac1:'#1c1c1c',ac2:'#374151',ac3:'#9ca3af',shapeFill:'#143f2e',shapeStroke:'#111827',headingColor:'#111827',bodyColor:'#374151',
   colors:['#374151','#143f2e','#166534','#a16207','#92400e','#6b21a8','#9ca3af','#000000']},

  {name:'Sakura',      dark:false, bg:'linear-gradient(135deg,#fdf2f8,#fce7f3)',
   ac1:'#9d174d',ac2:'#db2777',ac3:'#f9a8d4',shapeFill:'#923d25',shapeStroke:'#9d174d',headingColor:'#831843',bodyColor:'#1c1917',
   colors:['#9d174d','#923d25','#a16207','#3f6212','#15803d','#1d4ed8','#374151','#000000']},

  {name:'Lemon',       dark:false, bg:'linear-gradient(135deg,#fefce8,#fffbeb)',
   ac1:'#713f12',ac2:'#a16207',ac3:'#fde047',shapeFill:'#436028',shapeStroke:'#713f12',headingColor:'#713f12',bodyColor:'#1c1917',
   colors:['#a16207','#436028','#15803d','#0e7490','#0369a1','#6b21a8','#374151','#000000']},

  {name:'Olive',       dark:false, bg:'linear-gradient(135deg,#f7fee7,#ecfccb)',
   ac1:'#3f6212',ac2:'#65a30d',ac3:'#bef264',shapeFill:'#6c5b0e',shapeStroke:'#3f6212',headingColor:'#365314',bodyColor:'#1c2a0f',
   colors:['#3f6212','#6c5b0e','#a16207','#166534','#1d4ed8','#6b21a8','#1c2a0f','#000000']},

  // ── EXTRA DARK ──
  {name:'Navy Gold',   dark:true,  bg:'linear-gradient(135deg,#0a1628,#1e3a5f)',
   ac1:'#fbbf24',ac2:'#f59e0b',ac3:'#fde68a',shapeFill:'#f8a382',shapeStroke:'#fbbf24',headingColor:'#fcd34d',bodyColor:'#e2e8f0',
   colors:['#60a5fa','#f8a382','#f472b6','#fbbf24','#a78bfa','#fb923c','#e2e8f0','#000000']},

  {name:'Obsidian',    dark:true,  bg:'linear-gradient(135deg,#000000,#111111)',
   ac1:'#6ee7b7',ac2:'#10b981',ac3:'#a7f3d0',shapeFill:'#b5d36e',shapeStroke:'#34d399',headingColor:'#6ee7b7',bodyColor:'#d1fae5',
   colors:['#38bdf8','#b5d36e','#fbbf24','#fb923c','#f472b6','#4ade80','#a7f3d0','#000000']},

  {name:'Blood Moon',  dark:true,  bg:'linear-gradient(135deg,#0d0000,#2d0a0a)',
   ac1:'#f87171',ac2:'#dc2626',ac3:'#fca5a5',shapeFill:'#a3c293',shapeStroke:'#f87171',headingColor:'#fca5a5',bodyColor:'#fee2e2',
   colors:['#fb923c','#a3c293','#4ade80','#2dd4bf','#38bdf8','#c084fc','#fca5a5','#000000']},

  {name:'Matrix',      dark:true,  bg:'#000a00',
   ac1:'#4ade80',ac2:'#16a34a',ac3:'#86efac',shapeFill:'#84e872',shapeStroke:'#4ade80',headingColor:'#4ade80',bodyColor:'#bbf7d0',
   colors:['#86efac','#84e872','#bef264','#fbbf24','#67e8f9','#38bdf8','#bbf7d0','#000000']},

  {name:'Ocean Deep',  dark:true,  bg:'linear-gradient(135deg,#020617,#0c1445,#0a2e5c)',
   ac1:'#38bdf8',ac2:'#0ea5e9',ac3:'#7dd3fc',shapeFill:'#92affb',shapeStroke:'#38bdf8',headingColor:'#7dd3fc',bodyColor:'#e0f2fe',
   colors:['#7dd3fc','#92affb','#a78bfa','#c084fc','#f472b6','#fbbf24','#bae6fd','#000000']},

  {name:'Void',        dark:true,  bg:'linear-gradient(135deg,#09090b,#18181b)',
   ac1:'#d4d4d8',ac2:'#a1a1aa',ac3:'#e4e4e7',shapeFill:'#f8da8d',shapeStroke:'#d4d4d8',headingColor:'#f4f4f5',bodyColor:'#d4d4d8',
   colors:['#60a5fa','#f8da8d','#fbbf24','#fb923c','#f472b6','#a78bfa','#d4d4d8','#000000']},
];
const THEME_NAMES_RU={
  'Ocean Night':'Океанская ночь','Midnight':'Полночь','Neon City':'Неоновый город',
  'Coral Blaze':'Коралловое пламя','Forest Deep':'Глубокий лес','Solar Flare':'Солнечная вспышка',
  'Rose Gold':'Розовое золото','Arctic Blue':'Арктический синий','Sage Night':'Ночной шалфей',
  'Citrus Dark':'Тёмный цитрус','Crimson':'Багровый','Deep Teal':'Глубокий бирюзовый',
  'Slate Storm':'Грозовой сланец','Aurora':'Аврора','Copper':'Медный','Galaxy':'Галактика',
  'Clean White':'Чистый белый','Warm Paper':'Тёплая бумага','Soft Indigo':'Мягкий индиго',
  'Mint Fresh':'Свежая мята','Rose Petal':'Лепесток розы','Sky Day':'Дневное небо',
  'Corporate':'Корпоративный','Lavender':'Лавандовый','Peach':'Персиковый',
  'Slate Clean':'Чистый сланец','Teal Light':'Светлая бирюза','Newspaper':'Газета',
  'Sakura':'Сакура','Lemon':'Лимонный','Olive':'Оливковый',
  'Navy Gold':'Синий и золото','Obsidian':'Обсидиан','Blood Moon':'Кровавая луна',
  'Matrix':'Матрица','Ocean Deep':'Глубокий океан','Void':'Пустота',
};
THEMES.forEach(th=>{ if(THEME_NAMES_RU[th.name]) th.nameRu=THEME_NAMES_RU[th.name]; });
window._themeDisplayName=function(th){
  if(!th) return '';
  const ru=typeof getLang==='function'&&getLang()==='ru';
  return ru?(th.nameRu||th.name):(th.nameEn||th.name);
};
window.THEMES = THEMES;
// PowerPoint-like color palette rows
const PALETTE=[
  ['#000000','#262626','#404040','#595959','#737373','#8c8c8c','#a6a6a6','#bfbfbf','#d9d9d9','#f2f2f2','#ffffff'],
  ['#c00000','#ff0000','#ffc000','#ffff00','#92d050','#00b050','#00b0f0','#0070c0','#002060','#7030a0','#843c0c'],
  ['#ff99cc','#ffcc99','#ffff99','#ccffcc','#ccffff','#99ccff','#cc99ff','#ff99ff','#ff6600','#0099cc','#339933'],
  ['#4472c4','#ed7d31','#a9d18e','#ffc000','#5b9bd5','#70ad47','#ff0000','#ff7f50','#6495ed','#dc143c','#00ced1'],
  ['#2e75b6','#c55a11','#70ad47','#d4a017','#2f5496','#548235','#c00000','#ff0000','#ffc000','#00b050','#0070c0'],
];
const SHAPES=[
  {id:'rect',name:'Прямоугольник',path:null,special:'rect'},
  {id:'ellipse',name:'Эллипс',path:null,special:'ellipse'},
  {id:'polygon',name:'Многоугольник',path:null,special:'polygon'},
  {id:'star',name:'Звезда',path:null,special:'star'},
  {id:'heart',name:'Сердце',path:'M 50 85 C 10 60 5 30 20 20 C 32 12 45 18 50 28 C 55 18 68 12 80 20 C 95 30 90 60 50 85 Z'},
  {id:'arrow',name:'Стрелка →',path:'M 5 35 L 60 35 L 60 15 L 95 50 L 60 85 L 60 65 L 5 65 Z'},
  {id:'arrowLeft',name:'Стрелка ←',path:'M 95 35 L 40 35 L 40 15 L 5 50 L 40 85 L 40 65 L 95 65 Z'},
  {id:'arrowUp',name:'Стрелка ↑',path:'M 35 95 L 35 40 L 15 40 L 50 5 L 85 40 L 65 40 L 65 95 Z'},
  {id:'arrowDown',name:'Стрелка ↓',path:'M 35 5 L 35 60 L 15 60 L 50 95 L 85 60 L 65 60 L 65 5 Z'},
  {id:'arrowDouble',name:'Стрелка ↔',path:'M 5 50 L 30 20 L 30 37 L 70 37 L 70 20 L 95 50 L 70 80 L 70 63 L 30 63 L 30 80 Z'},
  {id:'cross',name:'Крест',path:'M 35 5 L 65 5 L 65 35 L 95 35 L 95 65 L 65 65 L 65 95 L 35 95 L 35 65 L 5 65 L 5 35 L 35 35 Z'},
  {id:'parallelogram',name:'Параллелогр.',path:null,special:'parallelogram'},
  {id:'cloud',name:'Облако',path:null,special:'cloud'},
  // Extended shapes for better PPTX import coverage
  {id:'chevron',name:'Шеврон →',path:null,special:'chevron'},
  {id:'chevronLeft',name:'Шеврон ←',path:null,special:'chevron'},
  {id:'callout',name:'Выноска',path:null,special:'callout'},
  {id:'calloutRound',name:'Выноска О',path:null,special:'callout'},
  {id:'trapezoid',name:'Трапеция',path:null,special:'trapezoid'},
  {id:'cylinder',name:'Цилиндр',path:'M 5 20 Q 5 5 50 5 Q 95 5 95 20 L 95 80 Q 95 95 50 95 Q 5 95 5 80 Z'},
  {id:'cube',name:'Куб',path:'M 25 5 L 95 5 L 95 70 L 25 70 Z M 25 5 L 5 25 L 5 90 L 25 70 Z M 5 90 L 75 90 L 95 70'},
  {id:'brace',name:'Скобка',path:'M 70 5 Q 50 5 50 25 L 50 42 Q 50 50 35 50 Q 50 50 50 58 L 50 75 Q 50 95 70 95'},
  {id:'arc',name:'Дуга',path:'M 5 95 Q 5 5 95 5'},
  {id:'line',name:'Линия',path:'M 5 50 L 95 50',noFill:true},
  {id:'wave',name:'Волна',path:'M 5 60 C 20 20 35 80 50 50 C 65 20 80 80 95 40',noFill:true},
  {id:'curve',name:'Кривая',path:null,special:'curve'},
  {id:'plus',name:'Плюс',path:'M 35 5 L 65 5 L 65 35 L 95 35 L 95 65 L 65 65 L 65 95 L 35 95 L 35 65 L 5 65 L 5 35 L 35 35 Z'},
  {id:'ribbon',name:'Лента',path:'M 5 30 L 20 5 L 80 5 L 95 30 L 80 55 L 60 55 L 50 70 L 40 55 L 20 55 Z'},
  {id:'shield',name:'Щит',path:'M 50 5 L 90 20 L 90 55 Q 90 80 50 95 Q 10 80 10 55 L 10 20 Z'},
  {id:'badge',name:'Значок',path:'M 50 5 L 63 15 L 80 12 L 85 28 L 95 38 L 88 55 L 95 70 L 83 80 L 80 95 L 63 90 L 50 95 L 37 90 L 20 95 L 17 80 L 5 70 L 12 55 L 5 38 L 15 28 L 20 12 L 37 15 Z'},
  {id:'funnel',name:'Воронка',path:'M 5 5 L 95 5 L 65 50 L 65 90 L 35 90 L 35 50 Z'},
  {id:'gear',name:'Шестерня',path:null,special:'gear'},
  {id:'moon',name:'Луна',path:null,special:'moon'},
  {id:'noSymbol',name:'Запрет',path:null,special:'noSymbol'},
];
// APPLETS defined in 02-applets.js (after getXHTML functions)

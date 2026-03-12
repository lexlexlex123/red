
// ══════════════ STATE ══════════════
const SNAP=10;
let slides=[],cur=0,sel=null,ec=0,ar='16:9',canvasW=1200,canvasH=675;
let multiSel=new Set(),rbStart=null,clipboard=[];
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
// 8-color scheme for palette grid (8 cols × 6 tint rows like PowerPoint)
// Base colors harmonize with the theme background — no pure white in base row.
// col[7] is always black: its tints produce the full dark→light neutral range.
function _themeColors(t){
  if(t.colors) return t.colors;
  // Build from theme properties
  const c1 = t.ac1 || '#6366f1';
  const c2 = t.ac2 || '#4338ca';
  const c3 = t.ac3 || '#c7d2fe';
  const c4 = t.shapeFill || c2;
  const c5 = t.shapeStroke || c1;
  const c6 = t.headingColor || c1;
  const c7 = t.bodyColor || (t.dark ? '#e2e8f0' : '#1e293b');
  return [c1, c2, c3, c4, c5, c6, c7, t.dark ? '#000000' : '#ffffff'];
}

const THEMES=[
  // ── DARK ──
  {name:'Ocean Night', dark:true,  bg:'linear-gradient(135deg,#0f0c29,#302b63)',
   ac1:'#818cf8',ac2:'#6366f1',ac3:'#c7d2fe',shapeFill:'#6366f1',shapeStroke:'#a5b4fc',headingColor:'#818cf8',bodyColor:'#e2e8f0',
   colors:['#818cf8','#c7d2fe','#34d399','#f472b6','#fbbf24','#67e8f9','#a78bfa','#000000']},

  {name:'Midnight',    dark:true,  bg:'#0d1117',
   ac1:'#60a5fa',ac2:'#3b82f6',ac3:'#93c5fd',shapeFill:'#1d4ed8',shapeStroke:'#3b82f6',headingColor:'#60a5fa',bodyColor:'#c9d1d9',
   colors:['#60a5fa','#34d399','#f87171','#fbbf24','#a78bfa','#38bdf8','#fb923c','#000000']},

  {name:'Neon City',   dark:true,  bg:'#0a0010',
   ac1:'#c084fc',ac2:'#a855f7',ac3:'#e879f9',shapeFill:'#7c3aed',shapeStroke:'#c084fc',headingColor:'#c084fc',bodyColor:'#e0e0ff',
   colors:['#c084fc','#e879f9','#38bdf8','#4ade80','#f472b6','#fbbf24','#67e8f9','#000000']},

  {name:'Coral Blaze', dark:true,  bg:'linear-gradient(135deg,#1a0533,#8b2252)',
   ac1:'#f472b6',ac2:'#ec4899',ac3:'#fbcfe8',shapeFill:'#ec4899',shapeStroke:'#f9a8d4',headingColor:'#f472b6',bodyColor:'#fce7f3',
   colors:['#f472b6','#fb923c','#fbbf24','#a78bfa','#38bdf8','#4ade80','#f9a8d4','#000000']},

  {name:'Forest Deep', dark:true,  bg:'linear-gradient(135deg,#0a2010,#1a4a2a)',
   ac1:'#4ade80',ac2:'#22c55e',ac3:'#bbf7d0',shapeFill:'#16a34a',shapeStroke:'#4ade80',headingColor:'#4ade80',bodyColor:'#d1fae5',
   colors:['#4ade80','#a3e635','#fbbf24','#38bdf8','#f472b6','#86efac','#d9f99d','#000000']},

  {name:'Solar Flare', dark:true,  bg:'linear-gradient(135deg,#1a0a00,#4a1500)',
   ac1:'#fbbf24',ac2:'#f59e0b',ac3:'#fde68a',shapeFill:'#d97706',shapeStroke:'#fbbf24',headingColor:'#fbbf24',bodyColor:'#fef3c7',
   colors:['#fbbf24','#fb923c','#f87171','#4ade80','#38bdf8','#a78bfa','#fde68a','#000000']},

  {name:'Rose Gold',   dark:true,  bg:'linear-gradient(135deg,#1a0a10,#3d1520)',
   ac1:'#fda4af',ac2:'#fb7185',ac3:'#fecdd3',shapeFill:'#e11d48',shapeStroke:'#fb7185',headingColor:'#fda4af',bodyColor:'#ffe4e6',
   colors:['#fda4af','#fb923c','#fbbf24','#86efac','#93c5fd','#c4b5fd','#fecdd3','#000000']},

  {name:'Arctic Blue', dark:true,  bg:'linear-gradient(135deg,#003d5c,#0369a1)',
   ac1:'#7dd3fc',ac2:'#38bdf8',ac3:'#bae6fd',shapeFill:'#0284c7',shapeStroke:'#38bdf8',headingColor:'#7dd3fc',bodyColor:'#f0f9ff',
   colors:['#7dd3fc','#bae6fd','#4ade80','#fbbf24','#f472b6','#a5f3fc','#c7d2fe','#000000']},

  {name:'Sage Night',  dark:true,  bg:'linear-gradient(135deg,#1a2e1a,#2d4a2d)',
   ac1:'#86efac',ac2:'#4ade80',ac3:'#bbf7d0',shapeFill:'#16a34a',shapeStroke:'#4ade80',headingColor:'#86efac',bodyColor:'#f0fdf4',
   colors:['#86efac','#d9f99d','#fbbf24','#67e8f9','#f472b6','#a78bfa','#bbf7d0','#000000']},

  {name:'Citrus Dark', dark:true,  bg:'linear-gradient(135deg,#1a1200,#3d2c00)',
   ac1:'#fbbf24',ac2:'#f59e0b',ac3:'#bef264',shapeFill:'#a16207',shapeStroke:'#f59e0b',headingColor:'#fbbf24',bodyColor:'#fffbeb',
   colors:['#fbbf24','#bef264','#4ade80','#38bdf8','#f87171','#a78bfa','#fde68a','#000000']},

  {name:'Crimson',     dark:true,  bg:'linear-gradient(135deg,#1a0000,#450000)',
   ac1:'#f87171',ac2:'#ef4444',ac3:'#fca5a5',shapeFill:'#b91c1c',shapeStroke:'#f87171',headingColor:'#f87171',bodyColor:'#fee2e2',
   colors:['#f87171','#fb923c','#fbbf24','#4ade80','#38bdf8','#c084fc','#fca5a5','#000000']},

  {name:'Deep Teal',   dark:true,  bg:'linear-gradient(135deg,#042f2e,#065f46)',
   ac1:'#5eead4',ac2:'#14b8a6',ac3:'#99f6e4',shapeFill:'#0d9488',shapeStroke:'#5eead4',headingColor:'#5eead4',bodyColor:'#ccfbf1',
   colors:['#5eead4','#a7f3d0','#67e8f9','#fbbf24','#f472b6','#86efac','#99f6e4','#000000']},

  {name:'Slate Storm', dark:true,  bg:'linear-gradient(135deg,#0f172a,#1e293b)',
   ac1:'#94a3b8',ac2:'#64748b',ac3:'#cbd5e1',shapeFill:'#475569',shapeStroke:'#94a3b8',headingColor:'#e2e8f0',bodyColor:'#cbd5e1',
   colors:['#e2e8f0','#60a5fa','#4ade80','#fbbf24','#f472b6','#a78bfa','#94a3b8','#000000']},

  {name:'Aurora',      dark:true,  bg:'linear-gradient(135deg,#042f2e,#0f0c29,#1a0533)',
   ac1:'#a78bfa',ac2:'#34d399',ac3:'#67e8f9',shapeFill:'#6366f1',shapeStroke:'#a78bfa',headingColor:'#a78bfa',bodyColor:'#e0f2fe',
   colors:['#a78bfa','#34d399','#67e8f9','#f472b6','#fbbf24','#818cf8','#6ee7b7','#000000']},

  {name:'Copper',      dark:true,  bg:'linear-gradient(135deg,#1c0a00,#3b1f0a)',
   ac1:'#fb923c',ac2:'#f97316',ac3:'#fdba74',shapeFill:'#c2410c',shapeStroke:'#fb923c',headingColor:'#fb923c',bodyColor:'#fff7ed',
   colors:['#fb923c','#fbbf24','#fde68a','#4ade80','#38bdf8','#f472b6','#fdba74','#000000']},

  {name:'Galaxy',      dark:true,  bg:'linear-gradient(135deg,#000010,#0a0030,#200040)',
   ac1:'#e879f9',ac2:'#d946ef',ac3:'#f0abfc',shapeFill:'#9333ea',shapeStroke:'#e879f9',headingColor:'#e879f9',bodyColor:'#fae8ff',
   colors:['#e879f9','#818cf8','#38bdf8','#4ade80','#fbbf24','#f472b6','#c084fc','#000000']},

  // ── LIGHT ──
  {name:'Clean White', dark:false, bg:'#ffffff',
   ac1:'#3b82f6',ac2:'#2563eb',ac3:'#bfdbfe',shapeFill:'#3b82f6',shapeStroke:'#1d4ed8',headingColor:'#1e40af',bodyColor:'#1e293b',
   colors:['#1e40af','#0f766e','#15803d','#b45309','#9333ea','#be123c','#475569','#000000']},

  {name:'Warm Paper',  dark:false, bg:'linear-gradient(135deg,#fefce8,#fef9c3)',
   ac1:'#92400e',ac2:'#b45309',ac3:'#fcd34d',shapeFill:'#d97706',shapeStroke:'#92400e',headingColor:'#78350f',bodyColor:'#292524',
   colors:['#78350f','#92400e','#166534','#1d4ed8','#6b21a8','#9f1239','#374151','#000000']},

  {name:'Soft Indigo', dark:false, bg:'linear-gradient(135deg,#eef2ff,#e0e7ff)',
   ac1:'#4338ca',ac2:'#6366f1',ac3:'#c7d2fe',shapeFill:'#6366f1',shapeStroke:'#4338ca',headingColor:'#3730a3',bodyColor:'#1e1b4b',
   colors:['#3730a3','#1d4ed8','#0f766e','#15803d','#9333ea','#be123c','#1e1b4b','#000000']},

  {name:'Mint Fresh',  dark:false, bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)',
   ac1:'#166534',ac2:'#16a34a',ac3:'#86efac',shapeFill:'#16a34a',shapeStroke:'#15803d',headingColor:'#14532d',bodyColor:'#052e16',
   colors:['#14532d','#166534','#15803d','#0f766e','#0369a1','#4338ca','#3f6212','#000000']},

  {name:'Rose Petal',  dark:false, bg:'linear-gradient(135deg,#fff1f2,#ffe4e6)',
   ac1:'#be123c',ac2:'#e11d48',ac3:'#fda4af',shapeFill:'#e11d48',shapeStroke:'#be123c',headingColor:'#9f1239',bodyColor:'#1c1917',
   colors:['#9f1239','#be123c','#c2410c','#a16207','#6b21a8','#1d4ed8','#374151','#000000']},

  {name:'Sky Day',     dark:false, bg:'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
   ac1:'#0369a1',ac2:'#0284c7',ac3:'#7dd3fc',shapeFill:'#0284c7',shapeStroke:'#0369a1',headingColor:'#075985',bodyColor:'#0c4a6e',
   colors:['#075985','#0369a1','#0f766e','#15803d','#4338ca','#6b21a8','#0c4a6e','#000000']},

  {name:'Corporate',   dark:false, bg:'linear-gradient(135deg,#f8fafc,#f1f5f9)',
   ac1:'#1d4ed8',ac2:'#2563eb',ac3:'#93c5fd',shapeFill:'#2563eb',shapeStroke:'#1d4ed8',headingColor:'#1e3a8a',bodyColor:'#0f172a',
   colors:['#1e3a8a','#1d4ed8','#0f766e','#166534','#6b21a8','#9f1239','#334155','#000000']},

  {name:'Lavender',    dark:false, bg:'linear-gradient(135deg,#faf5ff,#f3e8ff)',
   ac1:'#7c3aed',ac2:'#9333ea',ac3:'#d8b4fe',shapeFill:'#9333ea',shapeStroke:'#7c3aed',headingColor:'#581c87',bodyColor:'#2e1065',
   colors:['#581c87','#7c3aed','#1d4ed8','#0f766e','#be123c','#a16207','#2e1065','#000000']},

  {name:'Peach',       dark:false, bg:'linear-gradient(135deg,#fff7ed,#ffedd5)',
   ac1:'#c2410c',ac2:'#ea580c',ac3:'#fdba74',shapeFill:'#ea580c',shapeStroke:'#c2410c',headingColor:'#7c2d12',bodyColor:'#1c1917',
   colors:['#7c2d12','#c2410c','#a16207','#166534','#1d4ed8','#6b21a8','#374151','#000000']},

  {name:'Slate Clean', dark:false, bg:'linear-gradient(135deg,#f8fafc,#e2e8f0)',
   ac1:'#334155',ac2:'#475569',ac3:'#94a3b8',shapeFill:'#475569',shapeStroke:'#334155',headingColor:'#0f172a',bodyColor:'#1e293b',
   colors:['#0f172a','#1d4ed8','#0f766e','#a16207','#6b21a8','#9f1239','#334155','#000000']},

  {name:'Teal Light',  dark:false, bg:'linear-gradient(135deg,#f0fdfa,#ccfbf1)',
   ac1:'#0f766e',ac2:'#14b8a6',ac3:'#5eead4',shapeFill:'#14b8a6',shapeStroke:'#0f766e',headingColor:'#134e4a',bodyColor:'#042f2e',
   colors:['#134e4a','#0f766e','#15803d','#0369a1','#4338ca','#be123c','#042f2e','#000000']},

  {name:'Newspaper',   dark:false, bg:'#f5f0e8',
   ac1:'#1c1c1c',ac2:'#374151',ac3:'#9ca3af',shapeFill:'#374151',shapeStroke:'#111827',headingColor:'#111827',bodyColor:'#374151',
   colors:['#111827','#374151','#1d4ed8','#166534','#92400e','#6b21a8','#9ca3af','#000000']},

  {name:'Sakura',      dark:false, bg:'linear-gradient(135deg,#fdf2f8,#fce7f3)',
   ac1:'#9d174d',ac2:'#db2777',ac3:'#f9a8d4',shapeFill:'#db2777',shapeStroke:'#9d174d',headingColor:'#831843',bodyColor:'#1c1917',
   colors:['#831843','#9d174d','#be123c','#a16207','#15803d','#1d4ed8','#374151','#000000']},

  {name:'Lemon',       dark:false, bg:'linear-gradient(135deg,#fefce8,#fffbeb)',
   ac1:'#713f12',ac2:'#a16207',ac3:'#fde047',shapeFill:'#ca8a04',shapeStroke:'#713f12',headingColor:'#713f12',bodyColor:'#1c1917',
   colors:['#713f12','#a16207','#ca8a04','#15803d','#0369a1','#6b21a8','#374151','#000000']},

  {name:'Olive',       dark:false, bg:'linear-gradient(135deg,#f7fee7,#ecfccb)',
   ac1:'#3f6212',ac2:'#65a30d',ac3:'#bef264',shapeFill:'#65a30d',shapeStroke:'#3f6212',headingColor:'#365314',bodyColor:'#1c2a0f',
   colors:['#365314','#3f6212','#0f766e','#a16207','#1d4ed8','#6b21a8','#1c2a0f','#000000']},

  // ── EXTRA DARK ──
  {name:'Navy Gold',   dark:true,  bg:'linear-gradient(135deg,#0a1628,#1e3a5f)',
   ac1:'#fbbf24',ac2:'#f59e0b',ac3:'#fde68a',shapeFill:'#b45309',shapeStroke:'#fbbf24',headingColor:'#fcd34d',bodyColor:'#e2e8f0',
   colors:['#fcd34d','#60a5fa','#34d399','#f472b6','#a78bfa','#fb923c','#e2e8f0','#000000']},

  {name:'Obsidian',    dark:true,  bg:'linear-gradient(135deg,#000000,#111111)',
   ac1:'#6ee7b7',ac2:'#10b981',ac3:'#a7f3d0',shapeFill:'#059669',shapeStroke:'#34d399',headingColor:'#6ee7b7',bodyColor:'#d1fae5',
   colors:['#6ee7b7','#38bdf8','#a78bfa','#fbbf24','#f472b6','#fb923c','#a7f3d0','#000000']},

  {name:'Blood Moon',  dark:true,  bg:'linear-gradient(135deg,#0d0000,#2d0a0a)',
   ac1:'#f87171',ac2:'#dc2626',ac3:'#fca5a5',shapeFill:'#dc2626',shapeStroke:'#f87171',headingColor:'#fca5a5',bodyColor:'#fee2e2',
   colors:['#f87171','#fb923c','#fbbf24','#4ade80','#38bdf8','#c084fc','#fca5a5','#000000']},

  {name:'Matrix',      dark:true,  bg:'#000a00',
   ac1:'#4ade80',ac2:'#16a34a',ac3:'#86efac',shapeFill:'#15803d',shapeStroke:'#4ade80',headingColor:'#4ade80',bodyColor:'#bbf7d0',
   colors:['#4ade80','#86efac','#a3e635','#bef264','#67e8f9','#fbbf24','#bbf7d0','#000000']},

  {name:'Ocean Deep',  dark:true,  bg:'linear-gradient(135deg,#020617,#0c1445,#0a2e5c)',
   ac1:'#38bdf8',ac2:'#0ea5e9',ac3:'#7dd3fc',shapeFill:'#0369a1',shapeStroke:'#38bdf8',headingColor:'#7dd3fc',bodyColor:'#e0f2fe',
   colors:['#38bdf8','#7dd3fc','#34d399','#a78bfa','#f472b6','#fbbf24','#bae6fd','#000000']},

  {name:'Void',        dark:true,  bg:'linear-gradient(135deg,#09090b,#18181b)',
   ac1:'#d4d4d8',ac2:'#a1a1aa',ac3:'#e4e4e7',shapeFill:'#52525b',shapeStroke:'#d4d4d8',headingColor:'#f4f4f5',bodyColor:'#d4d4d8',
   colors:['#f4f4f5','#60a5fa','#4ade80','#fbbf24','#f472b6','#a78bfa','#d4d4d8','#000000']},
];
// PowerPoint-like color palette rows
const PALETTE=[
  ['#000000','#262626','#404040','#595959','#737373','#8c8c8c','#a6a6a6','#bfbfbf','#d9d9d9','#f2f2f2','#ffffff'],
  ['#c00000','#ff0000','#ffc000','#ffff00','#92d050','#00b050','#00b0f0','#0070c0','#002060','#7030a0','#843c0c'],
  ['#ff99cc','#ffcc99','#ffff99','#ccffcc','#ccffff','#99ccff','#cc99ff','#ff99ff','#ff6600','#0099cc','#339933'],
  ['#4472c4','#ed7d31','#a9d18e','#ffc000','#5b9bd5','#70ad47','#ff0000','#ff7f50','#6495ed','#dc143c','#00ced1'],
  ['#2e75b6','#c55a11','#70ad47','#d4a017','#2f5496','#548235','#c00000','#ff0000','#ffc000','#00b050','#0070c0'],
];
const SHAPES=[
  {id:'rect',name:'Rect',path:null,special:'rect'},
  {id:'ellipse',name:'Ellipse',path:null,special:'ellipse'},
  {id:'triangle',name:'Triangle',path:'M 50 5 L 95 95 L 5 95 Z'},
  {id:'rtriangle',name:'R-Triangle',path:'M 5 95 L 95 95 L 95 5 Z'},
  {id:'pentagon',name:'Pentagon',path:'M 50 5 L 95 38 L 79 95 L 21 95 L 5 38 Z'},
  {id:'hexagon',name:'Hexagon',path:'M 50 5 L 93 27.5 L 93 72.5 L 50 95 L 7 72.5 L 7 27.5 Z'},
  {id:'star4',name:'Star 4',path:'M 50 5 L 60 40 L 95 50 L 60 60 L 50 95 L 40 60 L 5 50 L 40 40 Z'},
  {id:'star5',name:'Star 5',path:'M 50 5 L 61 35 L 95 35 L 68 57 L 79 91 L 50 70 L 21 91 L 32 57 L 5 35 L 39 35 Z'},
  {id:'arrow',name:'Arrow',path:'M 5 35 L 60 35 L 60 15 L 95 50 L 60 85 L 60 65 L 5 65 Z'},
  {id:'heart',name:'Heart',path:'M 50 85 C 10 60 5 30 20 20 C 32 12 45 18 50 28 C 55 18 68 12 80 20 C 95 30 90 60 50 85 Z'},
  {id:'cross',name:'Cross',path:'M 35 5 L 65 5 L 65 35 L 95 35 L 95 65 L 65 65 L 65 95 L 35 95 L 35 65 L 5 65 L 5 35 L 35 35 Z'},
  {id:'diamond',name:'Diamond',path:'M 50 5 L 95 50 L 50 95 L 5 50 Z'},
  {id:'parallelogram',name:'Parallelo',path:'M 20 5 L 95 5 L 80 95 L 5 95 Z'},
  {id:'cloud',name:'Cloud',path:'M 25 70 Q 5 70 5 55 Q 5 40 20 38 Q 18 20 35 18 Q 42 5 58 12 Q 70 5 80 15 Q 95 15 95 32 Q 98 50 88 58 Q 90 70 75 70 Z'},
  // Extended shapes for better PPTX import coverage
  {id:'arrowLeft',name:'Arrow L',path:'M 95 35 L 40 35 L 40 15 L 5 50 L 40 85 L 40 65 L 95 65 Z'},
  {id:'arrowUp',name:'Arrow U',path:'M 35 95 L 35 40 L 15 40 L 50 5 L 85 40 L 65 40 L 65 95 Z'},
  {id:'arrowDown',name:'Arrow D',path:'M 35 5 L 35 60 L 15 60 L 50 95 L 85 60 L 65 60 L 65 5 Z'},
  {id:'arrowDouble',name:'Arrow 2',path:'M 5 50 L 30 20 L 30 37 L 70 37 L 70 20 L 95 50 L 70 80 L 70 63 L 30 63 L 30 80 Z'},
  {id:'chevron',name:'Chevron',path:'M 5 5 L 70 5 L 95 50 L 70 95 L 5 95 L 30 50 Z'},
  {id:'chevronLeft',name:'Chevron L',path:'M 95 5 L 30 5 L 5 50 L 30 95 L 95 95 L 70 50 Z'},
  {id:'star6',name:'Star 6',path:'M 50 5 L 58 35 L 83 20 L 68 45 L 95 50 L 68 55 L 83 80 L 58 65 L 50 95 L 42 65 L 17 80 L 32 55 L 5 50 L 32 45 L 17 20 L 42 35 Z'},
  {id:'star8',name:'Star 8',path:'M 50 5 L 56 38 L 79 21 L 62 44 L 95 50 L 62 56 L 79 79 L 56 62 L 50 95 L 44 62 L 21 79 L 38 56 L 5 50 L 38 44 L 21 21 L 44 38 Z'},
  {id:'callout',name:'Callout',path:null,special:'callout'},
  {id:'calloutRound',name:'Callout R',path:null,special:'callout'},
  {id:'trapezoid',name:'Trapezoid',path:'M 15 95 L 85 95 L 95 5 L 5 5 Z'},
  {id:'trapezoidFlip',name:'Trapezoid F',path:'M 5 95 L 95 95 L 85 5 L 15 5 Z'},
  {id:'octagon',name:'Octagon',path:'M 30 5 L 70 5 L 95 30 L 95 70 L 70 95 L 30 95 L 5 70 L 5 30 Z'},
  {id:'heptagon',name:'Heptagon',path:'M 50 5 L 85 22 L 97 60 L 76 93 L 24 93 L 3 60 L 15 22 Z'},
  {id:'decagon',name:'Decagon',path:'M 50 5 L 74 11 L 91 29 L 97 53 L 88 76 L 69 91 L 45 95 L 21 88 L 5 71 L 3 47 L 14 24 L 33 9 Z'},
  {id:'cylinder',name:'Cylinder',path:'M 5 20 Q 5 5 50 5 Q 95 5 95 20 L 95 80 Q 95 95 50 95 Q 5 95 5 80 Z'},
  {id:'cube',name:'Cube',path:'M 25 5 L 95 5 L 95 70 L 25 70 Z M 25 5 L 5 25 L 5 90 L 25 70 Z M 5 90 L 75 90 L 95 70'},
  {id:'brace',name:'Brace',path:'M 70 5 Q 50 5 50 25 L 50 42 Q 50 50 35 50 Q 50 50 50 58 L 50 75 Q 50 95 70 95'},
  {id:'arc',name:'Arc',path:'M 5 95 Q 5 5 95 5'},
  {id:'line',name:'Line',path:'M 5 50 L 95 50'},
  {id:'wave',name:'Wave',path:'M 5 60 C 20 20 35 80 50 50 C 65 20 80 80 95 40'},
  {id:'plus',name:'Plus',path:'M 35 5 L 65 5 L 65 35 L 95 35 L 95 65 L 65 65 L 65 95 L 35 95 L 35 65 L 5 65 L 5 35 L 35 35 Z'},
  {id:'ribbon',name:'Ribbon',path:'M 5 30 L 20 5 L 80 5 L 95 30 L 80 55 L 60 55 L 50 70 L 40 55 L 20 55 Z'},
  {id:'shield',name:'Shield',path:'M 50 5 L 90 20 L 90 55 Q 90 80 50 95 Q 10 80 10 55 L 10 20 Z'},
  {id:'badge',name:'Badge',path:'M 50 5 L 63 15 L 80 12 L 85 28 L 95 38 L 88 55 L 95 70 L 83 80 L 80 95 L 63 90 L 50 95 L 37 90 L 20 95 L 17 80 L 5 70 L 12 55 L 5 38 L 15 28 L 20 12 L 37 15 Z'},
  {id:'funnel',name:'Funnel',path:'M 5 5 L 95 5 L 65 50 L 65 90 L 35 90 L 35 50 Z'},
  {id:'gear',name:'Gear',path:'M 38 5 L 42 18 Q 46 20 50 20 Q 54 20 58 18 L 62 5 L 74 10 L 68 22 Q 72 28 74 35 L 88 34 L 90 47 L 77 50 Q 77 54 75 58 L 85 68 L 77 78 L 65 71 Q 60 74 55 75 L 53 89 L 47 89 L 45 75 Q 40 74 35 71 L 23 78 L 15 68 L 25 58 Q 23 54 23 50 L 10 47 L 12 34 L 26 35 Q 28 28 32 22 L 26 10 Z'},
  {id:'moon',name:'Moon',path:'M 80 15 Q 45 20 40 50 Q 35 80 65 90 Q 30 95 15 70 Q 5 50 20 28 Q 35 5 80 15 Z'},
  {id:'noSymbol',name:'No',path:'M 50 5 A 45 45 0 1 0 50 95 A 45 45 0 1 0 50 5 Z M 20 20 L 80 80'},
];
// APPLETS defined in 02-applets.js (after getXHTML functions)

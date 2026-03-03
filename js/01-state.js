
// ══════════════ STATE ══════════════
const SNAP=10;
let slides=[],cur=0,sel=null,ec=0,ar='16:9',canvasW=1200,canvasH=675;
let multiSel=new Set(),rbStart=null,clipboard=[];
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
const THEMES=[
  // dark themes: heading=ac1 (accent/bright), body=tc (light readable)
  {name:'Ocean Night', dark:true,  bg:'linear-gradient(135deg,#0f0c29,#302b63)',  ac1:'#818cf8',ac2:'#6366f1',ac3:'#c7d2fe', shapeFill:'#6366f1',shapeStroke:'#a5b4fc', headingColor:'#818cf8', bodyColor:'#e2e8f0', textBgAccent:'#6366f1',textBgAccentOp:0.12},
  {name:'Coral Blaze', dark:true,  bg:'linear-gradient(135deg,#1a0533,#8b2252)',  ac1:'#f472b6',ac2:'#ec4899',ac3:'#fbcfe8', shapeFill:'#ec4899',shapeStroke:'#f9a8d4', headingColor:'#f472b6', bodyColor:'#fce7f3', textBgAccent:'#ec4899',textBgAccentOp:0.12},
  {name:'Forest Deep', dark:true,  bg:'linear-gradient(135deg,#0a2010,#1a4a2a)',  ac1:'#4ade80',ac2:'#22c55e',ac3:'#bbf7d0', shapeFill:'#16a34a',shapeStroke:'#4ade80', headingColor:'#4ade80', bodyColor:'#d1fae5', textBgAccent:'#22c55e',textBgAccentOp:0.1},
  {name:'Solar Flare', dark:true,  bg:'linear-gradient(135deg,#1a0a00,#4a2000)',  ac1:'#fbbf24',ac2:'#f59e0b',ac3:'#fde68a', shapeFill:'#d97706',shapeStroke:'#fbbf24', headingColor:'#fbbf24', bodyColor:'#fef3c7', textBgAccent:'#f59e0b',textBgAccentOp:0.1},
  {name:'Arctic Blue', dark:true,  bg:'linear-gradient(135deg,#0369a1,#0ea5e9)',  ac1:'#7dd3fc',ac2:'#38bdf8',ac3:'#bae6fd', shapeFill:'#0284c7',shapeStroke:'#38bdf8', headingColor:'#7dd3fc', bodyColor:'#f0f9ff'},
  {name:'Midnight',    dark:true,  bg:'#0d1117',                                   ac1:'#60a5fa',ac2:'#3b82f6',ac3:'#93c5fd', shapeFill:'#1d4ed8',shapeStroke:'#3b82f6', headingColor:'#60a5fa', bodyColor:'#c9d1d9', textBgAccent:'#3b82f6',textBgAccentOp:0.1},
  {name:'Neon City',   dark:true,  bg:'#0a0010',                                   ac1:'#c084fc',ac2:'#a855f7',ac3:'#e879f9', shapeFill:'#7c3aed',shapeStroke:'#c084fc', headingColor:'#c084fc', bodyColor:'#e0e0ff', textBgAccent:'#a855f7',textBgAccentOp:0.15},
  {name:'Sage Green',  dark:true,  bg:'linear-gradient(135deg,#1a2e1a,#2d4a2d)',   ac1:'#86efac',ac2:'#4ade80',ac3:'#bbf7d0', shapeFill:'#16a34a',shapeStroke:'#4ade80', headingColor:'#86efac', bodyColor:'#f0fdf4', textBgAccent:'#4ade80',textBgAccentOp:0.08},
  {name:'Rose Gold',   dark:true,  bg:'linear-gradient(135deg,#1a0a10,#3d1520)',   ac1:'#fda4af',ac2:'#fb7185',ac3:'#fecdd3', shapeFill:'#e11d48',shapeStroke:'#fb7185', headingColor:'#fda4af', bodyColor:'#ffe4e6', textBgAccent:'#fb7185',textBgAccentOp:0.12},
  {name:'Citrus',      dark:true,  bg:'linear-gradient(135deg,#1a1200,#3d2c00)',   ac1:'#fbbf24',ac2:'#f59e0b',ac3:'#bef264', shapeFill:'#a16207',shapeStroke:'#f59e0b', headingColor:'#fbbf24', bodyColor:'#fffbeb', textBgAccent:'#f59e0b',textBgAccentOp:0.1},
  // light themes: heading=ac2 (saturated dark accent), body=dark readable text
  {name:'Ivory Light', dark:false, bg:'#f8f8f2',                                   ac1:'#4f46e5',ac2:'#6366f1',ac3:'#e0e7ff', shapeFill:'#6366f1',shapeStroke:'#4f46e5', headingColor:'#4f46e5', bodyColor:'#1e293b'},
  {name:'Corporate',   dark:false, bg:'linear-gradient(160deg,#1e293b,#0f172a)',   ac1:'#38bdf8',ac2:'#0ea5e9',ac3:'#7dd3fc', shapeFill:'#0284c7',shapeStroke:'#0ea5e9', headingColor:'#38bdf8', bodyColor:'#e2e8f0', textBgAccent:'#0ea5e9',textBgAccentOp:0.08},
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
  {id:'rounded',name:'Rounded',path:null,special:'rounded'},
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
];
// APPLETS defined in 02-applets.js (after getXHTML functions)

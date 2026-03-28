// ══════════════════════════════════════════════════════════════════
// 41-lego.js  —  Лего-блоки  v5.0
// ══════════════════════════════════════════════════════════════════
(function(){
'use strict';

// ── размеры ───────────────────────────────────────────────────────
// Сетка ячеек: U × GY пикселей каждая
// Деталь стоит на ячейке: её тело = GY px, пупырышки = SH px
// Деталь СВЕРХУ перекрывает пупырышки детали СНИЗУ своим телом
// => деталь с меньшим row (выше) = больший z-index
const U   = 40;   // ширина ячейки (= ширина шипа)
const GY  = 12;   // высота ячейки = высота тела плоского блока
const SH  = 10;   // высота пупырышка (рисуется ВЫШЕ тела, перекрывается деталью сверху)
const SW  = 26;   // ширина пупырышка
const FH  = GY;   // тело плоского блока = 1 ячейка
const TH  = GY*3; // тело высокого блока = 3 ячейки

// ── SVG детальки ──────────────────────────────────────────────────
function makeSVG(n, tall, base) {
  const bh  = tall ? TH : FH;   // высота тела
  const bw  = n * U;
  const col = _colors(base);

  let studs = '';
  for (let i = 0; i < n; i++) {
    const sx = i * U + (U - SW) / 2;
    studs += `<rect x="${sx}" y="0" width="${SW}" height="${SH}" rx="1" fill="${col.stud}"/>` +
             `<rect x="${sx+2}" y="1" width="${SW-6}" height="${Math.max(2,SH-4)}" rx="1" fill="${col.hl}" opacity="0.5"/>`;
  }

  const hlH = 2;   // блик сверху — фиксированная высота
  const shH = 3;   // тень снизу — фиксированная высота (одинакова для всех)

  // SVG viewBox: ширина bw, высота bh+SH
  // y=0..SH: пупырышки  |  y=SH..SH+bh: тело
  return `<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${bw} ${bh+SH}" width="${bw}" height="${bh+SH}"
     style="display:block;overflow:visible">
  ${studs}
  <rect x="0" y="${SH}" width="${bw}" height="${bh}" rx="1" fill="${col.mid}"/>
  <rect x="1" y="${SH+1}" width="${bw-2}" height="${hlH}" rx="1" fill="${col.hl}" opacity="0.4"/>
  <rect x="0" y="${SH+bh-shH}" width="${bw}" height="${shH}" rx="1" fill="${col.dark}" opacity="0.5"/>
  <rect x="0" y="${SH}" width="2" height="${bh}" rx="1" fill="${col.dark}" opacity="0.28"/>
  <rect x="${bw-2}" y="${SH}" width="2" height="${bh}" rx="1" fill="${col.dark}" opacity="0.38"/>
</svg>`;
}

// ── SVG скошенной детали ─────────────────────────────────────────
// Деталь: 1×1 высокий блок с шипом + скосная плоская часть рядом
// dir='slope-right': высокий блок СЛЕВА, скос идёт вправо вниз
// dir='slope-left':  высокий блок СПРАВА, скос идёт влево вниз
function makeSlopeSVG(n, dir, base) {
  const bw  = n * U;
  const col = _colors(base);
  // SVG layout (y от верха):
  //   0..SH        — шип
  //   SH..SH+TH    — тело (totalH = SH+TH)
  // Высокий блок = TH, низкий конец = FH
  const totalH = SH + TH;
  const yStudTop = 0;
  const yBodyTop = SH;
  const yBot     = totalH;          // низ всего SVG
  const yLoTop   = yBot - FH;       // верх низкого конца

  // Индекс высокого блока
  const hiIdx = dir === 'slope-right' ? 0 : n - 1;
  const hiX   = hiIdx * U;

  // Шип над высоким блоком
  const sx   = hiX + (U - SW) / 2;
  const stud = `<rect x="${sx}" y="${yStudTop}" width="${SW}" height="${SH}" rx="1" fill="${col.stud}"/>` +
               `<rect x="${sx+2}" y="1" width="${SW-6}" height="${Math.max(2,SH-4)}" rx="1" fill="${col.hl}" opacity="0.5"/>`;

  // Высокий блок 1×TH
  const hiBlock = `<rect x="${hiX}" y="${yBodyTop}" width="${U}" height="${TH}" rx="1" fill="${col.mid}"/>` +
                  `<rect x="${hiX+1}" y="${yBodyTop+1}" width="${U-2}" height="2" fill="${col.hl}" opacity="0.4"/>`;

  // Скосная часть: трапеция от низа высокого блока (y=yBodyTop..yBot)
  // до верха низкого конца (y=yLoTop..yBot) по горизонтали
  // slope-right: блок слева [0..U], скос [U..bw] — трапеция
  //   точки: (U, yBodyTop), (bw, yLoTop), (bw, yBot), (U, yBot)
  // slope-left: блок справа [(n-1)U..bw], скос [0..(n-1)U]
  //   точки: (0, yLoTop), ((n-1)U, yBodyTop), ((n-1)U, yBot), (0, yBot)
  let slopePts;
  if (dir === 'slope-right') {
    slopePts = `${U},${yBodyTop} ${bw},${yLoTop} ${bw},${yBot} ${U},${yBot}`;
  } else {
    slopePts = `0,${yLoTop} ${(n-1)*U},${yBodyTop} ${(n-1)*U},${yBot} 0,${yBot}`;
  }
  const slopeBody = `<polygon points="${slopePts}" fill="${col.mid}"/>`;

  // Блик вдоль наклонной верхней грани
  let blikPts;
  if (dir === 'slope-right') {
    blikPts = `${U},${yBodyTop} ${bw},${yLoTop} ${bw},${yLoTop+2} ${U},${yBodyTop+2}`;
  } else {
    blikPts = `0,${yLoTop} ${(n-1)*U},${yBodyTop} ${(n-1)*U},${yBodyTop+2} 0,${yLoTop+2}`;
  }
  const blik   = `<polygon points="${blikPts}" fill="${col.hl}" opacity="0.4"/>`;
  const shadow = `<rect x="0" y="${yBot-3}" width="${bw}" height="3" fill="${col.dark}" opacity="0.5"/>`;
  // Боковые тени
  const sideL = dir === 'slope-right'
    ? `<rect x="0" y="${yBodyTop}" width="2" height="${TH}" fill="${col.dark}" opacity="0.28"/>`
    : `<rect x="0" y="${yLoTop}" width="2" height="${FH}" fill="${col.dark}" opacity="0.28"/>`;
  const sideR = dir === 'slope-right'
    ? `<rect x="${bw-2}" y="${yLoTop}" width="2" height="${FH}" fill="${col.dark}" opacity="0.38"/>`
    : `<rect x="${bw-2}" y="${yBodyTop}" width="2" height="${TH}" fill="${col.dark}" opacity="0.38"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${bw} ${totalH}" width="${bw}" height="${totalH}"
     style="display:block;overflow:hidden">
  ${stud}${slopeBody}${hiBlock}${blik}${shadow}${sideL}${sideR}
</svg>`;
}

// ── Обратный скос ─────────────────────────────────────────────────
// Сверху горизонталь 2U (два шипа), правая сторона опускается вертикально
// на (TH-FH), затем наклон к низу левой стороны. Низ = 1U слева.
// dir='right': вертикаль СПРАВА, наклон к нижнему левому углу
// dir='left':  вертикаль СЛЕВА, наклон к нижнему правому углу
function makeStairSVG(base, dir) {
  const col    = _colors(base);
  const bw     = 2 * U;
  const totalH = SH + TH;
  const yTop   = SH;
  const yBot   = totalH;
  const yVert  = yTop + FH;  // низ вертикальной части = yLoTop

  // Два шипа сверху
  let studs = '';
  for (let i = 0; i < 2; i++) {
    const sx = i * U + (U - SW) / 2;
    studs += `<rect x="${sx}" y="0" width="${SW}" height="${SH}" rx="1" fill="${col.stud}"/>` +
             `<rect x="${sx+2}" y="1" width="${SW-6}" height="${Math.max(2,SH-4)}" rx="1" fill="${col.hl}" opacity="0.5"/>`;
  }

  // Пятиугольник:
  // dir='right':
  //   (0,yTop) → (bw,yTop) → (bw,yVert) → (0,yBot) — ∧ нижний левый угол
  //   закрываем: (0,yBot) → (0,yTop)
  // dir='left':
  //   (0,yTop) → (bw,yTop) → (bw,yBot) → (0,yVert)
  let bodyPts;
  if (dir === 'right') {
    bodyPts = `0,${yTop} ${bw},${yTop} ${bw},${yVert} ${U},${yBot} 0,${yBot}`;
  } else {
    bodyPts = `0,${yTop} ${bw},${yTop} ${bw},${yBot} ${U},${yBot} 0,${yVert}`;
  }
  const body = `<polygon points="${bodyPts}" fill="${col.mid}"/>`;

  // Блик по верхней горизонтали
  const topBlik = `<rect x="0" y="${yTop}" width="${bw}" height="2" fill="${col.hl}" opacity="0.4"/>`;

  // Блик вдоль наклонной грани
  let blikPts;
  if (dir === 'right') {
    blikPts = `${bw},${yVert} 0,${yBot} 0,${yBot+2} ${bw},${yVert+2}`;
  } else {
    blikPts = `0,${yVert} ${bw},${yBot} ${bw},${yBot+2} 0,${yVert+2}`;  // нет, блик выше диагонали
  }
  // Блик чуть выше диагонали (тонкая полоска)
  const blik = dir === 'right'
    ? `<polygon points="${bw},${yVert} ${U},${yBot} ${U},${yBot+2} ${bw},${yVert+2}" fill="${col.hl}" opacity="0.25"/>`
    : `<polygon points="0,${yVert} ${U},${yBot} ${U},${yBot+2} 0,${yVert+2}" fill="${col.hl}" opacity="0.25"/>`;

  const shadow = `<rect x="${dir==='right'?0:U}" y="${yBot-3}" width="${U}" height="3" fill="${col.dark}" opacity="0.5"/>`;

  // Вертикальная боковая тень (высокая сторона)
  const sideVert = '';

  return `<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${bw} ${totalH}" width="${bw}" height="${totalH}"
     style="display:block;overflow:hidden">
  ${studs}${body}${topBlik}${blik}${shadow}${sideVert}
</svg>`;
}

// Экспортируем функции глобально
window._legoMakeSVG = function(n,tall,base){ return makeSVG(n,tall,base); };
window._legoMakeSlopeSVG = function(n,dir,base){ return makeSlopeSVG(n,dir,base); };
window._legoMakeStairSVG = function(base,dir){ return makeStairSVG(base,dir); };
window._refreshAllLegoZ = function(){ _refreshAllZOrders(); };
window._legoHit = '<div class="lego-hit" style="position:absolute;inset:0;z-index:1;cursor:move;"></div>';

function _colors(hex) {
  const [r,g,b] = _fromHex(hex);
  return {
    mid:  hex,
    stud: _blend(r,g,b, 0,0,0, 0.20),
    hl:   _blend(r,g,b, 255,255,255, 0.65),
    dark: _blend(r,g,b, 0,0,0, 0.30),
  };
}
function _fromHex(h) {
  h = h.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function _blend(r,g,b,r2,g2,b2,t) {
  return '#'+[r,g,b].map((v,i)=>Math.round(v+(([r2,g2,b2][i])-v)*t).toString(16).padStart(2,'0')).join('');
}

// ── Координаты пикселей ↔ ячейки сетки ───────────────────────────
// el.style.top  = row * GY   (Y позиция верха SVG, включая пупырышки — они рисуются выше)
// el.style.left = col * U
function _pxToCell(px, py) {
  return [Math.round(px / U), Math.round(py / GY)];
}
function _cellToPx(col, row) {
  return [col * U, row * GY];
}

// ── Занятые ячейки детали ─────────────────────────────────────────
// Возвращает Set строк "col,row"
function _occupiedCells(col, row, n, tall) {
  const rows = tall ? 3 : 1;
  const cells = new Set();
  for (let c = 0; c < n; c++)
    for (let r = 0; r < rows; r++)
      cells.add((col+c)+','+(row+r));
  return cells;
}

// Все занятые ячейки на слайде (кроме skipId)
function _allOccupied(skipId) {
  const cv = _legoLayer(); if (!cv) return new Set();
  const occupied = new Set();
  cv.querySelectorAll('.el[data-type="lego"]').forEach(el => {
    if (skipId && el.dataset.id === skipId) return;
    const col = Math.round(parseInt(el.style.left) / U);
    const row = Math.round(parseInt(el.style.top)  / GY);
    const n   = +el.dataset.legoStuds || 2;
    // slope and stair are 3 rows tall like tall blocks
    const tall = el.dataset.legoTall === 'true' || !!el.dataset.legoSlope || !!el.dataset.legoStair;
    _occupiedCells(col, row, n, tall).forEach(c => occupied.add(c));
  });
  return occupied;
}

// ── Найти ближайшую свободную позицию ────────────────────────────
// Возвращает {col, row} или null если нет места
function _findFreePos(wantCol, wantRow, n, tall, skipId) {
  const occ = _allOccupied(skipId);
  const rows = tall ? 3 : 1;

  function isFree(col, row) {
    const cells = _occupiedCells(col, row, n, tall);
    for (const c of cells) if (occ.has(c)) return false;
    return true;
  }

  // Сначала проверяем точную позицию
  if (isFree(wantCol, wantRow)) return { col: wantCol, row: wantRow };

  // Ищем по спирали: ближайшая свободная
  for (let d = 1; d <= 8; d++) {
    // по горизонтали рядом
    for (let dc = -d; dc <= d; dc++) {
      for (let dr of [0, -d, d]) {
        const col = wantCol + dc, row = wantRow + dr;
        if (col < 0 || row < 0) continue;
        if (isFree(col, row)) return { col, row };
      }
    }
  }
  return null; // нет места
}

// ── z-index: деталь ВЫШЕ (меньший row) = больший z-index ─────────
// Это позволяет телу верхней детали перекрывать пупырышки нижней
function _updateZOrder(el) {
  // Не используем z-index — порядок через DOM
  // Убираем inline z-index чтобы не мешал layerEl
  el.style.zIndex = '';
}

function _legoLayer() {
  return document.getElementById('lego-layer') || document.getElementById('canvas');
}

function _refreshAllZOrders() {
  const ll = _legoLayer(); if (!ll) return;
  ll.querySelectorAll('.el[data-type="lego"]').forEach(el => { el.style.zIndex = ''; });
  const legoEls = Array.from(ll.querySelectorAll('.el[data-type="lego"]'));
  if (legoEls.length < 2) return;
  const selId = typeof sel !== 'undefined' && sel ? sel.dataset.id : null;
  const selEl = selId ? legoEls.find(e => e.dataset.id === selId) : null;
  const rest = selEl ? legoEls.filter(e => e !== selEl) : legoEls;
  rest.sort((a, b) => {
    const ay = parseInt(a.style.top)||0, by = parseInt(b.style.top)||0;
    if (by !== ay) return by - ay;
    const aSloped = !!(a.dataset.legoSlope || a.dataset.legoStair);
    const bSloped = !!(b.dataset.legoSlope || b.dataset.legoStair);
    if (aSloped && !bSloped) return -1;
    if (!aSloped && bSloped) return 1;
    return 0;
  });

  rest.forEach(el => { ll.appendChild(el); });
  if (selEl) ll.appendChild(selEl);
  const overlay = document.getElementById('handles-overlay');
  if (overlay && overlay.parentElement !== ll) {
    const cv2 = document.getElementById('canvas');
    if (cv2) cv2.appendChild(overlay);
  }
}
// ── Состояние ─────────────────────────────────────────────────────
let _color = '#e3000b';
let _colorScheme = null; // null=кастомный, {col,row}=из палитры схемы

// ── Типы деталей ──────────────────────────────────────────────────
const PIECES = [
  { id:'f1', n:1, tall:false, label:'1×1 плоский' },
  { id:'f2', n:2, tall:false, label:'1×2 плоский' },
  { id:'f3', n:3, tall:false, label:'1×3 плоский' },
  { id:'f4', n:4, tall:false, label:'1×4 плоский' },
  { id:'t1', n:1, tall:true,  label:'1×1 блок'    },
  { id:'t2', n:2, tall:true,  label:'1×2 блок'    },
  { id:'t3', n:3, tall:true,  label:'1×3 блок'    },
  { id:'t4', n:4, tall:true,  label:'1×4 блок'    },
  { id:'sr', n:2, slope:'slope-right', label:'Скос →' },
  { id:'sl', n:2, slope:'slope-left',  label:'Скос ←' },
  { id:'stair-r', n:2, stair:'right', label:'Обратный скос →' },
  { id:'stair-l', n:2, stair:'left',  label:'Обратный скос ←' },
];

// ── Панель ────────────────────────────────────────────────────────
function buildPanel() {
  if (document.getElementById('legoprops')) return;
  const scroll = document.getElementById('props-scroll');
  if (!scroll) return;

  const p = document.createElement('div');
  p.id = 'legoprops';
  p.style.cssText = 'display:none;flex-direction:column;';
  p.innerHTML = `
    <div class="ph" style="display:flex;align-items:center;gap:6px">
      <svg width="14" height="12" viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="1" y="9" width="22" height="10" rx="1.5"/>
        <rect x="3"   y="3" width="5" height="7" rx="1.5"/>
        <rect x="9.5" y="3" width="5" height="7" rx="1.5"/>
        <rect x="16"  y="3" width="5" height="7" rx="1.5"/>
      </svg>
      Лего-блоки
    </div>
    <div class="psec">
      <div style="font-size:10px;color:var(--text3);margin-bottom:5px">Цвет блока</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <div id="lego-color-swatch"
             style="width:26px;height:26px;border-radius:4px;border:1px solid var(--border2);
                    cursor:pointer;overflow:hidden;flex-shrink:0"
             onmousedown="event.preventDefault();openColorPanel('cp-lego-slot','lego',function(c,sr){legoOnColorPick(c,sr)})">
          <div id="lego-color-inner" style="width:100%;height:100%;background:#e3000b"></div>
        </div>
        <input id="lego-color-hex" type="text" maxlength="7" value="#e3000b" readonly
               style="width:64px;background:var(--surface2);border:1px solid var(--border2);
                      border-radius:5px;padding:3px 6px;color:var(--text1);font-size:11px;
                      font-family:monospace;cursor:pointer"
               onmousedown="event.preventDefault();openColorPanel('cp-lego-slot','lego',function(c,sr){legoOnColorPick(c,sr)})"/>
      </div>
      <div id="cp-lego-slot" class="cp-slot" style="display:none;margin-bottom:6px"
           onmousedown="event.preventDefault()"></div>
    </div>
    <div class="psec">
      <div style="font-size:10px;color:var(--text3);margin-bottom:5px">Перетащи на слайд</div>
      <div id="lego-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:5px"></div>
    </div>`;

  const nosel = document.getElementById('nosel');
  if (nosel) scroll.insertBefore(p, nosel); else scroll.appendChild(p);
  _buildGrid();
}

window.legoOnColorPick = function(c, sr) {
  _color = c;         // запоминаем как цвет для новых блоков
  _colorScheme = sr !== undefined ? (sr || null) : null; // null=кастом, {col,row}=схема
  const inner = document.getElementById('lego-color-inner');
  if (inner) inner.style.background = c;
  const hex = document.getElementById('lego-color-hex');
  if (hex) hex.value = c;
  // Меняем цвет всех выделенных лего-деталей
  const _legoTargets = [];
  if (typeof multiSel!=='undefined' && multiSel.size > 1) {
    multiSel.forEach(m => { if (m.dataset.type==='lego') _legoTargets.push(m); });
  } else if (typeof sel!=='undefined' && sel && sel.dataset.type==='lego') {
    _legoTargets.push(sel);
  }
  if (_legoTargets.length > 0) {
    if (typeof pushUndo==='function') pushUndo();
    _legoTargets.forEach(m => {
      m.dataset.legoColor = c;
      m.dataset.legoColorScheme = JSON.stringify(_colorScheme);
      const ec_ = m.querySelector('.ec');
      if (ec_) {
        const n = +m.dataset.legoStuds||2;
        const tall = m.dataset.legoTall==='true';
        const slope_ = m.dataset.legoSlope||null;
        const stair_ = m.dataset.legoStair||null;
        ec_.innerHTML = (slope_ ? makeSlopeSVG(n, slope_, c) : stair_ ? makeStairSVG(c, stair_) : makeSVG(n, tall, c)) + '<div class="lego-hit" style="position:absolute;inset:0;z-index:1;cursor:move;"></div>';
      }
      const d = slides[cur]&&slides[cur].els.find(e=>e.id===m.dataset.id);
      if (d) { d.legoColor = c; d.legoColorScheme = _colorScheme; }
    });
    if (typeof save==='function') save();
    if (typeof drawThumbs==='function') drawThumbs();
    if (typeof saveState==='function') saveState();
  }
  _buildGrid(); // перерисовываем галерею с новым цветом
};

function _buildGrid() {
  const grid = document.getElementById('lego-grid');
  if (!grid) return;
  grid.innerHTML = '';
  PIECES.forEach(piece => {
    const isSlope = !!piece.slope;
    const isStair = !!piece.stair;
    const bh = isStair ? (TH+FH+SH) : isSlope ? (TH+SH) : ((piece.tall ? TH : FH) + SH);
    const svg = isSlope ? makeSlopeSVG(piece.n, piece.slope, _color) : isStair ? makeStairSVG(_color, piece.stair) : makeSVG(piece.n, piece.tall, _color);
    const cell = document.createElement('div');
    cell.style.cssText = 'background:var(--surface2);border:1px solid var(--border2);border-radius:6px;padding:8px 4px 5px;cursor:grab;display:flex;flex-direction:column;align-items:center;gap:3px;transition:border-color .15s,background .15s;user-select:none;overflow:hidden;';
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;justify-content:center;align-items:flex-end;min-height:'+(bh+4)+'px';
    d.innerHTML = svg;
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:9px;color:var(--text3);text-align:center';
    lbl.textContent = piece.label;
    cell.appendChild(d); cell.appendChild(lbl);
    cell.addEventListener('mouseenter',()=>{cell.style.borderColor='var(--accent)';cell.style.background='var(--surface3)';});
    cell.addEventListener('mouseleave',()=>{cell.style.borderColor='var(--border2)';cell.style.background='var(--surface2)';});
    cell.addEventListener('mousedown', e => {
      if (e.button!==0) return;
      e.preventDefault();
      _startPanelDrag(e, piece, _color);
    });
    grid.appendChild(cell);
  });
}

// ── syncProps ─────────────────────────────────────────────────────
(function(){
  const _orig = window.syncProps;
  window.syncProps = function() {
    const isLego = typeof sel !== 'undefined' && sel && sel.dataset.type === 'lego';
    const panelOpen = (function(){
      const p = document.getElementById('legoprops');
      return p && p.style.display === 'flex';
    })();
    if (isLego) {
      // Pre-hide slide-props so _orig cannot show it
      const sp = document.getElementById('slide-props');
      if (sp) sp.style.display = 'none';
      const ns = document.getElementById('nosel');
      if (ns) ns.style.display = 'none';
    }

    if (_orig) _orig();

    const panel = document.getElementById('legoprops');
    if (!panel) return;

    if (isLego) {
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';

      // Re-hide everything _orig may have re-shown
      ['slide-props','tprops','shprops','imgprops','codeprops','mdprops','formulaprops',
       'graphprops','tableprops','genprops','qrprops','iconprops','hfprops','hoverprops',
       'nosel'].forEach(id => {
        const el_ = document.getElementById(id);
        if (el_) el_.style.display = 'none';
      });
      ['lego-hide-dims','lego-hide-link-ph','lego-hide-link-body'].forEach(id => {
        const e_ = document.getElementById(id);
        if (e_) e_.style.display = 'none';
      });
      const elph = document.querySelector('#elprops > .ph');
      if (elph) elph.style.display = 'none';

      // Sync color to selected block
      const c = sel.dataset.legoColor || '#e3000b';
      const inner = document.getElementById('lego-color-inner');
      if (inner) inner.style.background = c;
      const hexEl = document.getElementById('lego-color-hex');
      if (hexEl) hexEl.value = c;
      if (c !== _color) { _color = c; _buildGrid(); }

    } else {
      // Not lego selected — hide lego panel, restore everything
      panel.style.display = 'none';
      ['lego-hide-dims','lego-hide-link-ph','lego-hide-link-body'].forEach(id => {
        const e_ = document.getElementById(id);
        if (e_) e_.style.display = '';
      });
      const elph = document.querySelector('#elprops > .ph');
      if (elph) elph.style.display = '';
    }
  };
})();

// ── Патч save(): сортируем лего по Y чтобы в экспорте был правильный DOM-порядок
(function(){
  const _origSave = window.save;
  window.save = function() {
    if (_origSave) _origSave();
    if (typeof slides==='undefined' || typeof cur==='undefined') return;
    const s = slides[cur]; if (!s || !s.els) return;
    // Сортируем лего-детали среди всех els по Y убыванию (нижние Y = раньше в массиве)
    // Это гарантирует что в экспорте/превью детали с меньшим Y (выше) идут позже => выше визуально
    const legoIds = new Set(s.els.filter(e=>e.type==='lego').map(e=>e.id));
    if (legoIds.size < 2) return;
    const nonLego = s.els.filter(e=>e.type!=='lego');
    const lego    = s.els.filter(e=>e.type==='lego');
    // Больший Y → раньше (ниже в DOM = ниже визуально)
    lego.sort((a,b) => (b.y||0) - (a.y||0));
    s.els = [...nonLego, ...lego];
  };
})();

// ── патч mkEl ─────────────────────────────────────────────────────
(function(){
  const _orig = window.mkEl;
  window.mkEl = function(d) {
    if (d.type === 'lego') { _mkLegoEl(d); return; }
    if (_orig) _orig(d);
  };
})();

function _mkLegoEl(d) {
  const cv = _legoLayer(); if (!cv) return;

  // Snap к сетке при создании из сохранённых данных
  d.x = Math.round(d.x / U) * U;
  d.y = Math.round(d.y / GY) * GY;
  const bh = d.legoStair ? TH : d.legoSlope ? TH : (d.legoTall ? TH : FH);
  d.w = d.legoStuds * U;
  d.h = bh + SH;

  const el = document.createElement('div');
  el.className = 'el';
  el.dataset.id        = d.id;
  el.dataset.type      = 'lego';
  el.dataset.legoStuds = d.legoStuds;
  el.dataset.legoTall  = d.legoTall ? 'true' : 'false';
  el.dataset.legoSlope = d.legoSlope || '';
  el.dataset.legoStair = d.legoStair || '';
  el.dataset.legoColor       = d.legoColor || '#e3000b';
  // null → 'null' (кастомный), {col,row} → '{...}', undefined → '' (не задан)
  el.dataset.legoColorScheme = d.legoColorScheme !== undefined ? JSON.stringify(d.legoColorScheme) : '';
  el.dataset.anims           = JSON.stringify(d.anims || []);
  el.dataset.rot       = '0';

  el.style.cssText = `left:${d.x}px;top:${d.y}px;width:${d.w}px;height:${d.h}px;
    transform:rotate(0deg);overflow:visible;`;

  const ec_ = document.createElement('div');
  ec_.className = 'ec';
  ec_.style.cssText = 'width:100%;height:100%;overflow:visible;position:relative;';
  const _lc = d.legoColor||'#e3000b';
  ec_.innerHTML = d.legoSlope ? makeSlopeSVG(d.legoStuds, d.legoSlope, _lc) : d.legoStair ? makeStairSVG(_lc, d.legoStair) : makeSVG(d.legoStuds, d.legoTall, _lc);

  // Hit-area для надёжного клика
  const hit = document.createElement('div');
  hit.className = 'lego-hit';
  hit.style.cssText = 'position:absolute;inset:0;z-index:1;cursor:move;';
  ec_.appendChild(hit);
  el.appendChild(ec_);

  // Ручки resize (без поворота)
  [
    {cls:'rh br',dx:1, dy:1, ax:0,ay:0},
    {cls:'rh tr',dx:1, dy:-1,ax:0,ay:1},
    {cls:'rh bl',dx:-1,dy:1, ax:1,ay:0},
    {cls:'rh tl',dx:-1,dy:-1,ax:1,ay:1},
  ].forEach(h => {
    const rh = document.createElement('div');
    rh.className = h.cls;
    if (typeof mkResize==='function') mkResize(el, rh, h);
    el.appendChild(rh);
  });

  // Drag + клик/Shift объединены в _mkLegoDrag
  _mkLegoDrag(el, ec_);

  cv.appendChild(el);
  // Сортируем DOM сразу после вставки
  setTimeout(_refreshAllZOrders, 0);
}

// ── Drag по сетке с проверкой коллизий + группа ──────────────────
function _mkLegoDrag(el, c) {
  let startX, startY, on = false;
  let groupStart = null; // Map<element, {x,y,n,tall,id}>

  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const cn = e.target.className || '';
    if (typeof cn==='string' && cn.includes('rh')) return;
    e.preventDefault();
    e.stopPropagation();
    // Shift+клик: добавить/убрать из мульти-выделения, не начинать drag
    if (e.shiftKey) {
      if (typeof pickMulti==='function') pickMulti(el, true);
      else if (typeof pick==='function') pick(el);
      return; // shift-клик = только выделение, не drag
    }
    // Без Shift: выделяем если не выделен, затем начинаем drag
    if (!el.classList.contains('sel') && !(multiSel.size>1 && multiSel.has(el))) {
      if (typeof pickMulti==='function') pickMulti(el, false);
      else if (typeof pick==='function') pick(el);
    }
    on = true;
    window._anyDragging = true;
    startX = e.clientX; startY = e.clientY;
    if (typeof pushUndo==='function') pushUndo();

    const zoom = (typeof _canvasZoom!=='undefined'&&_canvasZoom) ? _canvasZoom : 1;

    // Собираем группу — все выделенные лего-элементы
    const isGroup = multiSel.size > 1 && multiSel.has(el);
    const targets = isGroup
      ? Array.from(multiSel).filter(m => m.dataset.type==='lego')
      : [el];

    // Запоминаем начальные позиции всех элементов группы
    groupStart = new Map();
    targets.forEach(m => {
      groupStart.set(m, {
        x:    parseInt(m.style.left),
        y:    parseInt(m.style.top),
        n:    +m.dataset.legoStuds || 2,
        tall: m.dataset.legoTall === 'true',
        slope: m.dataset.legoSlope || null,
        stair: m.dataset.legoStair || null,
        id:   m.dataset.id,
      });
    });

    const mm = ev => {
      if (!on) return;
      if (ev.buttons === 0) { mu(); return; }
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      // Snap к сетке прямо во время движения
      const snapDx = Math.round(dx / U) * U;
      const snapDy = Math.round(dy / GY) * GY;
      groupStart.forEach((orig, mEl) => {
        mEl.style.left = (orig.x + snapDx) + 'px';
        mEl.style.top  = (orig.y + snapDy) + 'px';
        _updateZOrder(mEl);
      });
      if (typeof syncPos==='function') syncPos();
      if (typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
    };

    const mu = () => {
      if (!on) return;
      on = false; window._anyDragging = false;
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);

      // Для каждого элемента группы: проверяем коллизии
      // Собираем ID всех перемещаемых — они не считаются занятыми друг для друга
      const movingIds = new Set(Array.from(groupStart.keys()).map(m => m.dataset.id));

      // Вычисляем смещение в ячейках
      const refOrig = groupStart.get(el);
      const refCurL = parseInt(el.style.left);
      const refCurT = parseInt(el.style.top);
      const dCol = Math.round((refCurL - refOrig.x) / U);
      const dRow = Math.round((refCurT - refOrig.y) / GY);

      // Строим занятые ячейки НЕ перемещаемых элементов
      const cv = _legoLayer();
      const fixedOcc = new Set();
      if (cv) {
        cv.querySelectorAll('.el[data-type="lego"]').forEach(ot => {
          if (movingIds.has(ot.dataset.id)) return;
          const col = Math.round(parseInt(ot.style.left) / U);
          const row = Math.round(parseInt(ot.style.top) / GY);
          const isTallEl = ot.dataset.legoTall==='true' || !!ot.dataset.legoSlope || !!ot.dataset.legoStair;
          _occupiedCells(col, row, +ot.dataset.legoStuds||2, isTallEl)
            .forEach(c_ => fixedOcc.add(c_));
        });
      }

      // Проверяем нет ли коллизий среди перемещаемых элементов между собой
      let hasCollision = false;
      const newPositions = new Map();
      groupStart.forEach((orig, mEl) => {
        const newCol = Math.round(orig.x / U) + dCol;
        const newRow = Math.round(orig.y / GY) + dRow;
        if (newCol < 0 || newRow < 0) { hasCollision = true; return; }
        const cells = _occupiedCells(newCol, newRow, orig.n, orig.tall || !!orig.slope || !!orig.stair);
        for (const c_ of cells) {
          if (fixedOcc.has(c_)) { hasCollision = true; return; }
        }
        newPositions.set(mEl, { col: newCol, row: newRow });
      });

      if (!hasCollision) {
        // Применяем новые позиции
        newPositions.forEach(({col, row}, mEl) => {
          const [px, py] = _cellToPx(col, row);
          mEl.style.left = px + 'px';
          mEl.style.top  = py + 'px';
          const d = slides[cur]&&slides[cur].els.find(e=>e.id===mEl.dataset.id);
          if (d) { d.x=px; d.y=py; }
        });
      } else {
        // Возвращаем всю группу на исходные позиции
        groupStart.forEach((orig, mEl) => {
          mEl.style.left = orig.x + 'px';
          mEl.style.top  = orig.y + 'px';
          const d = slides[cur]&&slides[cur].els.find(e=>e.id===mEl.dataset.id);
          if (d) { d.x=orig.x; d.y=orig.y; }
        });
        if (typeof toast==='function') toast('Нет места', 'err');
      }

      _refreshAllZOrders();
      if (typeof commitAll==='function') commitAll();
      groupStart = null;
    };

    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  });
}

// ── Drag с панели на слайд ────────────────────────────────────────
let _ghost = null;
let _dragPiece = null;

function _startPanelDrag(e, piece, color) {
  _dragPiece = piece;
  _ghost = document.createElement('div');
  _ghost.style.cssText = `position:fixed;pointer-events:none;z-index:99999;
    opacity:.82;transform:translate(-50%,-50%);`;
  _ghost.innerHTML = piece.slope ? makeSlopeSVG(piece.n, piece.slope, color) : piece.stair ? makeStairSVG(color, piece.stair) : makeSVG(piece.n, piece.tall, color);
  document.body.appendChild(_ghost);
  _moveGhost(e.clientX, e.clientY);
  const mv = ev => _moveGhost(ev.clientX, ev.clientY);
  const up = ev => {
    document.removeEventListener('mousemove', mv);
    document.removeEventListener('mouseup',   up);
    if (_ghost) { _ghost.remove(); _ghost = null; }
    _dragPiece = null;
    _dropOnCanvas(ev, piece, color);
  };
  document.addEventListener('mousemove', mv);
  document.addEventListener('mouseup',   up);
}

function _moveGhost(cx, cy) {
  if (!_ghost || !_dragPiece) return;
  const cv = document.getElementById('canvas');
  if (cv) {
    const rect = cv.getBoundingClientRect();
    const zoom = (typeof _canvasZoom!=='undefined'&&_canvasZoom) ? _canvasZoom : 1;
    const rx = (cx - rect.left) / zoom;
    const ry = (cy - rect.top)  / zoom;
    if (rx >= 0 && ry >= 0) {
      const bw = _dragPiece.n * U;
      const bh = _dragPiece.stair ? (TH+FH+SH) : _dragPiece.slope ? (TH+SH) : ((_dragPiece.tall ? TH : FH) + SH);
      // Снапим ЛЕВЫЙ КРАЙ детали (не центр курсора)
      const snappedLeft = Math.round((rx - bw/2) / U) * U;
      const snappedTop  = Math.round((ry - bh/2) / GY) * GY;
      // Ghost имеет transform:translate(-50%,-50%), центр = левый+bw/2
      const ghostCx = (snappedLeft + bw/2) * zoom + rect.left;
      const ghostCy = (snappedTop  + bh/2) * zoom + rect.top;
      _ghost.style.left = ghostCx + 'px';
      _ghost.style.top  = ghostCy + 'px';
      return;
    }
  }
  _ghost.style.left = cx + 'px';
  _ghost.style.top  = cy + 'px';
}

function _dropOnCanvas(ev, piece, color) {
  const cv = document.getElementById('canvas'); if (!cv) return;
  const rect = cv.getBoundingClientRect();
  const zoom = (typeof _canvasZoom!=='undefined'&&_canvasZoom) ? _canvasZoom : 1;
  const cw   = typeof canvasW!=='undefined' ? canvasW : 1200;
  const ch   = typeof canvasH!=='undefined' ? canvasH : 675;
  const rx   = (ev.clientX - rect.left) / zoom;
  const ry   = (ev.clientY - rect.top)  / zoom;
  if (rx<0||ry<0||rx>cw||ry>ch) return;

  const bw = piece.n * U;
  const bh = piece.stair ? (TH+FH+SH) : piece.slope ? (TH+SH) : ((piece.tall ? TH : FH) + SH);
  // Центрируем по телу блока (не по SVG целиком)
  const wantX = Math.round((rx - bw/2) / U) * U;
  const wantY = Math.round((ry - (bh-SH)/2) / GY) * GY;
  const [wantCol, wantRow] = _pxToCell(wantX, wantY);

  const pos = _findFreePos(wantCol, wantRow, piece.n, piece.tall || !!piece.slope || !!piece.stair, null);
  if (!pos) {
    if (typeof toast==='function') toast('Нет места для блока', 'err');
    return;
  }
  const [px, py] = _cellToPx(pos.col, pos.row);
  _addLegoEl(piece, color, px, py);
}

function _addLegoEl(piece, color, x, y) {
  if (typeof pushUndo==='function') pushUndo();
  const bw = piece.n * U;
  const bh = piece.stair ? (TH+FH+SH) : piece.slope ? (TH+SH) : ((piece.tall ? TH : FH) + SH);
  const d = {
    id:'e'+(++ec), type:'lego',
    x, y, w:bw, h:bh, rot:0, anims:[],
    legoStuds: piece.n, legoTall: piece.tall, legoSlope: piece.slope||null, legoStair: piece.stair||null, legoColor: color,
    legoColorScheme: _colorScheme,
  };
  slides[cur].els.push(d);
  _mkLegoEl(d);
  _refreshAllZOrders();
  if (typeof save==='function') save();
  if (typeof drawThumbs==='function') drawThumbs();
  if (typeof saveState==='function') saveState();
  const cv = document.getElementById('canvas');
  const el = cv && cv.querySelector('.el[data-id="'+d.id+'"]');
  if (el && typeof pick==='function') pick(el);
}

// ── Ribbon button ─────────────────────────────────────────────────
function _addRibbonBtn() {
  if (document.getElementById('rb-lego')) return;
  const rg = document.querySelector('.rg[data-tab="insert"]');
  if (!rg) return;
  const btn = document.createElement('button');
  btn.id = 'rb-lego'; btn.className = 'rb';
  btn.onclick = () => _openLego();
  btn.innerHTML = `<svg viewBox="0 0 24 20" width="20" height="17" fill="none" stroke="currentColor" stroke-width="1.7">
    <rect x="1" y="9" width="22" height="10" rx="1.5"/>
    <rect x="3"   y="3" width="5" height="7" rx="1.5"/>
    <rect x="9.5" y="3" width="5" height="7" rx="1.5"/>
    <rect x="16"  y="3" width="5" height="7" rx="1.5"/>
  </svg><span class="rbl">Блоки</span>`;
  const ref = rg.querySelector('[onclick*="addFormula"]');
  if (ref) ref.insertAdjacentElement('afterend', btn);
  else rg.insertBefore(btn, rg.querySelector('.rglbl'));
}

function _openLego() {
  buildPanel();
  const panel = document.getElementById('legoprops');
  if (!panel) return;
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.scrollIntoView({ behavior:'smooth', block:'nearest' });
  if (typeof toast==='function') toast('🧱 Перетащи деталь на слайд');
}

// ── init ──────────────────────────────────────────────────────────
function _init() {
  buildPanel();
  _addRibbonBtn();
  if (!document.getElementById('lego-style')) {
    const s = document.createElement('style');
    s.id = 'lego-style';
    s.textContent = '.el[data-type="lego"] .rh { display:none!important; }';
    document.head.appendChild(s);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
else setTimeout(_init, 250);

})();
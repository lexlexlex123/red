// ══════════════ TABLES ══════════════
let _tblSel = null;     // { elId, r, c }          — anchor cell
let _tblSelSet = new Set(); // Set of "r:c" strings  — all selected cells
let _tblDragSel = false;    // dragging cell selection

// ── theme defaults ──
function getThemeAccents() {
  if (typeof THEMES !== 'undefined' && typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0) {
    return THEMES[appliedThemeIdx] || THEMES[0];
  }
  return { ac1:'#3b82f6', ac2:'#1d4ed8', ac3:'#93c5fd', dark:true };
}
function _tblColors() {
  const t = getThemeAccents();
  const isDark = t.dark !== false;
  return { ac1: t.ac1||'#3b82f6', ac2: t.ac2||'#1d4ed8', text: isDark ? '#ffffff' : '#1e293b' };
}
function _tblMakeCells(rows, cols) {
  return Array.from({length:rows*cols}, ()=>({html:'',align:'left',valign:'middle',bg:'',colspan:1,rowspan:1,hidden:false}));
}
function _tblEqCols(n){ return Array(n).fill(1/n); }
function _tblEqRows(n){ return Array(n).fill(1/n); }

// ── Insert table ──
function addTable(rows, cols) {
  rows=Math.max(1,rows||3); cols=Math.max(1,cols||4);
  pushUndo();
  const tc=_tblColors();
  const d={
    id:'e'+(++ec), type:'table',
    x:snapV(60), y:snapV(80),
    w:snapV(Math.min(960,canvasW-120)),
    h:snapV(Math.min(420,canvasH-160)),
    rot:0, anims:[],
    rows, cols,
    cells:_tblMakeCells(rows,cols),
    colWidths:_tblEqCols(cols),
    rowHeights:_tblEqRows(rows),
    borderW:1, borderColor:tc.ac1+'80',
    headerRow:true, rx:8, fs:15,
    textColor:tc.text, headerBg:tc.ac1,
    cellBg:tc.ac2+'20', altBg:tc.ac1+'12',
  };
  for(let c=0;c<cols;c++) d.cells[c].html=String.fromCharCode(65+c);
  slides[cur].els.push(d);
  mkEl(d);
  const el=document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
  if(el) pick(el);
  save(); drawThumbs(); saveState();
}


const _TBL_FIELDS=['cells','colWidths','rowHeights','rows','cols','borderW','borderColor','headerRow','rx','fs','textColor','headerBg','cellBg','altBg','tableBgOp','tableBgBlur','showChart','chartType','chartLegend','chartLabels'];
function _tblSaveToDataset(el, d){
  const data={};
  _TBL_FIELDS.forEach(k=>{ if(d[k]!==undefined) data[k]=d[k]; });
  el.dataset.tableData=JSON.stringify(data);
}
function _tblReadFromDataset(el){
  try{ return el.dataset.tableData?JSON.parse(el.dataset.tableData):null; }catch(e){return null;}
}

// ── Render table into .ec ──
function renderTableEl(el, d) {
  if(!el||!d) return;
  const ecEl=el.querySelector('.ec'); if(!ecEl){console.error('[TBL] no .ec in',el);return;}
  // Sync size from DOM to data
  d.w=parseInt(el.style.width)||d.w;
  d.h=parseInt(el.style.height)||d.h;
  const W=d.w, H=d.h;
  // If d has tableData in dataset but not in d, restore it now
  if((!d.cells||!d.colWidths)&&el.dataset.tableData){
    try{const td=JSON.parse(el.dataset.tableData);Object.assign(d,td);}catch(e){}
  }
  const bw=d.borderW||1, bc=d.borderColor||'#3b82f680';
  const rx=d.rx||0, fs=d.fs||15;
  const textColor=d.textColor||'#fff';
  const _tblOp=d.tableBgOp!=null?+d.tableBgOp:1;
  // Apply tableBgOp by converting hex colors to rgba — so opacity and backdrop-filter coexist
  function _tblRgba(hex,extraOp){
    if(!hex)return hex;
    // Handle hex with alpha (#rrggbbaa) or 8-char hex
    let r,g,b,a=1;
    const h=hex.replace('#','');
    if(h.length>=6){r=parseInt(h.slice(0,2),16);g=parseInt(h.slice(2,4),16);b=parseInt(h.slice(4,6),16);}
    else return hex;
    if(h.length===8)a=parseInt(h.slice(6,8),16)/255;
    a=a*(extraOp!=null?extraOp:_tblOp);
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  const headerBg=_tblRgba(d.headerBg||'#3b82f6');
  const cellBg=_tblRgba(d.cellBg||'#1e293b');
  const altBg=d.altBg?_tblRgba(d.altBg):'';

  // Guard: all essential fields must be valid numbers/arrays
  if(!d.rows||d.rows<1) d.rows=1;
  if(!d.cols||d.cols<1) d.cols=1;
  if(!W||W<10) return; // element not yet laid out — skip silently
  if(!H||H<10) return;
  if(!d.colWidths||d.colWidths.length!==d.cols) d.colWidths=Array(d.cols).fill(1/d.cols);
  if(!d.rowHeights||d.rowHeights.length!==d.rows) d.rowHeights=Array(d.rows).fill(1/d.rows);
  if(!d.cells||d.cells.length!==d.rows*d.cols){
    d.cells=Array.from({length:d.rows*d.cols},()=>({html:'',align:'left',valign:'middle',bg:'',colspan:1,rowspan:1,hidden:false}));
  }
  const cws=d.colWidths.map(f=>Math.max(20,Math.round(f*W)));
  const rhs=d.rowHeights.map(f=>Math.max(14,Math.round(f*H)));

  let t=`<table style="width:100%;height:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:${fs}px;color:${textColor};user-select:none;">`; 
  t+=`<colgroup>${cws.map(w=>`<col style="width:${w}px">`).join('')}</colgroup><tbody>`;

  let ci=0;
  for(let r=0;r<d.rows;r++){
    const rh=rhs[r]||30;
    t+=`<tr data-r="${r}" style="height:${rh}px">`;
    for(let c=0;c<d.cols;c++,ci++){
      const cell=d.cells[ci]||{html:'',align:'left',valign:'middle',bg:'',colspan:1,rowspan:1,hidden:false};
      if(cell.hidden) continue;
      const isH=d.headerRow&&r===0;
      const isAlt=!isH&&altBg&&r%2===0;
      const bg=cell.bg?_tblRgba(cell.bg):(isH?headerBg:isAlt?altBg:cellBg);
      const selected=sel&&sel.dataset.id===d.id&&_tblSel&&_tblSel.elId===d.id&&_tblSelSet.has(r+':'+c);
      const cs=cell.colspan||1,rs=cell.rowspan||1;
      const isLastC=(c+cs-1)>=d.cols-1, isLastR=(r+rs-1)>=d.rows-1;
      const borders=`border-top:${bw}px solid ${bc};border-left:${bw}px solid ${bc};`+(isLastC?`border-right:${bw}px solid ${bc};`:'')+(isLastR?`border-bottom:${bw}px solid ${bc};`:'');
      let cr='';
      if(rx>0){if(r===0&&c===0)cr+=`border-top-left-radius:${rx}px;`;if(r===0&&isLastC)cr+=`border-top-right-radius:${rx}px;`;if(isLastR&&c===0)cr+=`border-bottom-left-radius:${rx}px;`;if(isLastR&&isLastC)cr+=`border-bottom-right-radius:${rx}px;`;}
      // (cr and borders computed above)
      const span=(cell.colspan>1?` colspan="${cell.colspan}"`:'')+((cell.rowspan||1)>1?` rowspan="${cell.rowspan}"`:'');
      const tag=isH?'th':'td';
      const selStyle=selected?`outline:2px solid var(--selb);outline-offset:-1px;`:'';
      const cellFs=cell.fs?(`;font-size:${cell.fs}px`):'';
      const cellTc=cell.tc?(`;color:${cell.tc}`):'';
      t+=`<${tag} data-r="${r}" data-c="${c}"${span} style="background:${bg};${borders}text-align:${cell.align||'left'};vertical-align:${cell.valign||'middle'};padding:5px 9px;overflow:hidden;word-break:normal;overflow-wrap:break-word;font-weight:${isH?700:400};box-sizing:border-box;${cr}${selStyle}${cellFs}${cellTc}">${cell.html||''}</${tag}>`; 
    }
    t+='</tr>';
  }
  t+='</tbody></table>';
  const _tblBlur=d.tableBgBlur||0;
  el.style.backdropFilter='';
  el.style.webkitBackdropFilter='';
  // Blur layer: absolutely positioned div behind the table, outside overflow:hidden wrapper
  const _blurLayer=_tblBlur>0
    ?`<div style="position:absolute;inset:0;border-radius:${rx}px;backdrop-filter:blur(${_tblBlur}px);-webkit-backdrop-filter:blur(${_tblBlur}px);z-index:0;pointer-events:none;"></div>`
    :'';

  // ── Chart mode ──
  if(d.showChart){
    const chartSvg = typeof _buildChartSvg==='function' ? _buildChartSvg(d) : '';
    ecEl.innerHTML=`<div style="position:relative;width:${W}px;height:${H}px;">${chartSvg}</div>`;
    _tblSaveToDataset(el, d);
    return;
  }

  ecEl.innerHTML=`<div style="position:relative;width:${W}px;height:${H}px;">${_blurLayer}<div class="tbl-wrap" style="position:relative;width:${W}px;height:${H}px;border-radius:${rx}px;overflow:hidden;z-index:1;">${t}</div></div>`;

  // Persist full table data on DOM element so save() can always recover it
  _tblSaveToDataset(el, d);

  _tblAttachCellEvents(el, d, ecEl);
  _tblColHandles(el, d, ecEl);
  _tblRowHandles(el, d, ecEl);
  _tblDragBorder(el, d, ecEl);
}

// NEW _tblAttachCellEvents — lightweight, no full re-render on selection change
function _tblAttachCellEvents(el, d, ecEl) {
  let dragStartR=-1, dragStartC=-1;

  // Visual-only highlight without re-render
  function _highlightSel(){
    const active=sel&&sel.dataset.id===d.id&&_tblSel&&_tblSel.elId===d.id;
    ecEl.querySelectorAll('td,th').forEach(c2=>{
      const k=(c2.dataset.r||'?')+':'+(c2.dataset.c||'?');
      const on=active&&_tblSelSet.has(k);
      c2.style.outline=on?'2px solid var(--selb)':'';
      c2.style.outlineOffset=on?'-1px':'';
    });
  }

  // Save cell content immediately when text changes
  function _saveCellNow(cell){
    const r=+cell.dataset.r, c=+cell.dataset.c, i=r*d.cols+c;
    if(d.cells[i]) d.cells[i].html=cell.innerHTML;
    _tblSaveToDataset(el,d);
    save();
  }

  ecEl.querySelectorAll('td,th').forEach(cell=>{
    cell.addEventListener('mousedown', ev=>{
      // If already editing this cell — let browser handle normally (cursor placement)
      if(cell.contentEditable==='true') return;

      // Pick the table element first
      if(sel!==el) pick(el);
      ev.stopPropagation();
      ev.preventDefault();

      const r=+cell.dataset.r, c=+cell.dataset.c;

      if(ev.shiftKey && _tblSel && _tblSel.elId===d.id){
        // Shift+click: range select, no editing
        _tblExtendSel(d, _tblSel.r, _tblSel.c, r, c);
        _highlightSel(); syncProps();
        return;
      }

      // Exit previous editing cell
      const prevEdit=ecEl.querySelector('td[contenteditable="true"],th[contenteditable="true"]');
      if(prevEdit&&prevEdit!==cell){ _saveCellNow(prevEdit); prevEdit.contentEditable='false'; }

      // Select this cell as anchor
      _tblSel={elId:d.id, r, c};
      _tblSelSet=new Set([r+':'+c]);
      dragStartR=r; dragStartC=c;
      _tblDragSel=true;
      let didDrag=false;
      _highlightSel(); syncProps();

      // Drag to select range
      const mm=ev2=>{
        if(!_tblDragSel) return;
        const dx=Math.abs(ev2.clientX-ev.clientX), dy=Math.abs(ev2.clientY-ev.clientY);
        if(!didDrag && dx<4 && dy<4) return; // ignore tiny jitter
        didDrag=true;
        const target=document.elementFromPoint(ev2.clientX, ev2.clientY);
        const tc2=target&&(target.matches('td,th')?target:target.closest('td,th'));
        if(tc2&&tc2.dataset.r!=null&&tc2.closest('.tbl-wrap')){
          _tblExtendSel(d, dragStartR, dragStartC, +tc2.dataset.r, +tc2.dataset.c);
          _highlightSel(); syncProps();
        }
      };

      const mu=()=>{
        _tblDragSel=false;
        document.removeEventListener('mousemove',mm);
        document.removeEventListener('mouseup',mu);
        // Only activate editing if this was a plain click (no drag)
        if(!didDrag){
          cell.contentEditable='true';
          cell.focus();
          try{const range=document.createRange();range.selectNodeContents(cell);range.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(range);}catch(e){}
          el.dataset.editing='true';
        }
      };

      document.addEventListener('mousemove',mm);
      document.addEventListener('mouseup',mu);
    });

    cell.addEventListener('blur', ev=>{
      if(cell.contentEditable!=='true') return;
      // Check if focus moved outside this table entirely
      setTimeout(()=>{
        const focused=document.activeElement;
        const stillInTable=focused&&el.contains(focused);
        if(!stillInTable){
          cell.contentEditable='false';
          delete el.dataset.editing;
        }
        _saveCellNow(cell);
        drawThumbs(); saveState();
      },0);
    });

    cell.addEventListener('input', ()=>{ _saveCellNow(cell); });

    cell.addEventListener('keydown', ev=>{
      if(cell.contentEditable!=='true') return;
      if(ev.key==='Escape'){
        cell.contentEditable='false'; delete el.dataset.editing;
        _saveCellNow(cell); cell.blur();
      } else if(ev.key==='Tab'){
        ev.preventDefault();
        _saveCellNow(cell); cell.contentEditable='false';
        const r=+cell.dataset.r, c=+cell.dataset.c;
        const nc=c+1<d.cols?c+1:0, nr=c+1<d.cols?r:(r+1<d.rows?r+1:0);
        const nx=ecEl.querySelector(`[data-r="${nr}"][data-c="${nc}"]`);
        if(nx){ nx.contentEditable='true'; nx.focus(); }
      } else if(ev.key==='Enter'&&!ev.shiftKey){
        ev.preventDefault();
        _saveCellNow(cell); cell.contentEditable='false';
        const r=+cell.dataset.r, c=+cell.dataset.c;
        if(r+1<d.rows){
          const nx=ecEl.querySelector(`[data-r="${r+1}"][data-c="${c}"]`);
          if(nx){ nx.contentEditable='true'; nx.focus(); }
        }
      } else if(ev.key==='F5'){
        // Intercept F5 while editing a cell — save and start preview
        ev.preventDefault(); ev.stopPropagation();
        _saveCellNow(cell); cell.contentEditable='false';
        delete el.dataset.editing;
        save(); drawThumbs(); saveState();
        if(typeof startPreview==='function') startPreview(cur);
        return;
      }
      ev.stopPropagation();
    });
  });
}



// ── Drag border zone around table (for moving the table) ──
function _tblDragBorder(el, d, ecEl){
  ecEl.querySelectorAll('.tbl-drag-border').forEach(h=>h.remove());
  // 4 sides — thick invisible hit area for dragging
  const BORDER = 14; // px wide drag zone
  const W = d.w, H = d.h;
  const sides = [
    {side:'top',    style:`left:0;top:0;width:100%;height:${BORDER}px;cursor:move;`},
    {side:'bottom', style:`left:0;bottom:0;width:100%;height:${BORDER}px;cursor:move;`},
    {side:'left',   style:`left:0;top:0;width:${BORDER}px;height:100%;cursor:move;`},
    {side:'right',  style:`right:0;top:0;width:${BORDER}px;height:100%;cursor:move;`},
  ];
  sides.forEach(({side, style})=>{
    const h = document.createElement('div');
    h.className = 'tbl-drag-border';
    h.style.cssText = `position:absolute;z-index:25;${style}`;
    h.dataset.side = side;
    h.addEventListener('mousedown', ev=>{
      ev.preventDefault(); ev.stopPropagation();
      // Clicking table border — clear cell selection
      tblClearSel();
      if(sel!==el) pick(el);
      // Trigger drag directly — replicate mkDrag logic
      let ox=ev.clientX, oy=ev.clientY;
      let ol=parseInt(el.style.left), ot=parseInt(el.style.top);
      pushUndo();
      const mm=e2=>{
        const _z=typeof _canvasZoom==='number'?_canvasZoom:1;
        let nx=ol+(e2.clientX-ox)/_z, ny=ot+(e2.clientY-oy)/_z;
        if(document.getElementById('snap-chk')&&document.getElementById('snap-chk').checked){nx=snapV(nx);ny=snapV(ny);}
        el.style.left=nx+'px'; el.style.top=ny+'px';
        if(typeof showGuides==='function') showGuides(el);
        if(typeof syncPos==='function') syncPos();
        if(typeof _updateHandlesOverlay==='function') _updateHandlesOverlay();
      };
      const mu=()=>{
        document.removeEventListener('mousemove',mm);
        document.removeEventListener('mouseup',mu);
        if(typeof clearGuides==='function') clearGuides();
        save(); drawThumbs(); saveState();
      };
      document.addEventListener('mousemove',mm);
      document.addEventListener('mouseup',mu);
    });
    ecEl.appendChild(h);
  });
}

function _tblExtendSel(d, r0, c0, r1, c1){
  const minR=Math.min(r0,r1), maxR=Math.max(r0,r1);
  const minC=Math.min(c0,c1), maxC=Math.max(c0,c1);
  _tblSelSet=new Set();
  for(let r=minR;r<=maxR;r++) for(let c=minC;c<=maxC;c++) _tblSelSet.add(r+':'+c);
}

// ── Column resize handles ──
function _tblColHandles(el, d, ecEl){
  ecEl.querySelectorAll('.tbl-crh').forEach(h=>h.remove());
  let cx=0;
  for(let c=0;c<d.cols-1;c++){
    cx+=d.colWidths[c]*d.w;
    const h=document.createElement('div');
    h.className='tbl-crh';
    h.style.cssText=`position:absolute;left:${Math.round(cx)-3}px;top:0;width:6px;height:100%;cursor:col-resize;z-index:30;`;
    h.dataset.c=c;
    h.addEventListener('mousedown',ev=>{
      ev.preventDefault();ev.stopPropagation();
      const sx=ev.clientX,sw0=d.colWidths[c],sw1=d.colWidths[c+1],minF=24/d.w;
      const prevSel=document.body.style.userSelect;
      document.body.style.userSelect='none';
      const mm=e2=>{ e2.preventDefault();
        const _z=typeof _canvasZoom==='number'?_canvasZoom:1;
        const dx=(e2.clientX-sx)/(_z*d.w);
        d.colWidths[c]=Math.max(minF,Math.min(sw0+sw1-minF,sw0+dx));
        d.colWidths[c+1]=sw0+sw1-d.colWidths[c];
        renderTableEl(el,d); save();
      };
      const mu=()=>{ document.body.style.userSelect=prevSel;
        document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);saveState();
      };
      document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
    });
    ecEl.appendChild(h);
  }
}

// ── Row resize handles ──
function _tblRowHandles(el, d, ecEl){
  ecEl.querySelectorAll('.tbl-rrh').forEach(h=>h.remove());
  let cy=0;
  for(let r=0;r<d.rows-1;r++){
    cy+=d.rowHeights[r]*d.h;
    const h=document.createElement('div');
    h.className='tbl-rrh';
    h.style.cssText=`position:absolute;left:0;top:${Math.round(cy)-3}px;width:100%;height:6px;cursor:row-resize;z-index:30;`;
    h.addEventListener('mousedown',ev=>{
      ev.preventDefault();ev.stopPropagation();
      const sy=ev.clientY,sh0=d.rowHeights[r],sh1=d.rowHeights[r+1],minF=14/d.h;
      const prevSel=document.body.style.userSelect;
      document.body.style.userSelect='none';
      const mm=e2=>{ e2.preventDefault();
        const _z=typeof _canvasZoom==='number'?_canvasZoom:1;
        const dy=(e2.clientY-sy)/(_z*d.h);
        d.rowHeights[r]=Math.max(minF,Math.min(sh0+sh1-minF,sh0+dy));
        d.rowHeights[r+1]=sh0+sh1-d.rowHeights[r];
        renderTableEl(el,d); save();
      };
      const mu=()=>{ document.body.style.userSelect=prevSel;
        document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);saveState();
      };
      document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
    });
    ecEl.appendChild(h);
  }
}

// ── Selected cells list ──
function _tblSelectedCells(d){
  if(!_tblSel||_tblSel.elId!==d.id||_tblSelSet.size===0) return [];
  return [..._tblSelSet].map(k=>{
    const [r,c]=k.split(':').map(Number);
    return {r,c,i:r*d.cols+c};
  }).filter(x=>d.cells[x.i]&&!d.cells[x.i].hidden);
}

// ── Clear cell selection (called when table is deselected) ──
function tblClearSel(){
  if(_tblSel){
    const canvas=document.getElementById('canvas');
    if(canvas){
      const prevEl=canvas.querySelector('[data-id="'+_tblSel.elId+'"]');
      if(prevEl){
        // Exit any active cell editing and clear highlights
        prevEl.querySelectorAll('td[contenteditable="true"],th[contenteditable="true"]').forEach(c=>{
          c.contentEditable='false';
          // Save cell content
          const r=+c.dataset.r,col=+c.dataset.c;
          const d=slides[cur]&&slides[cur].els.find(x=>x.id===_tblSel.elId);
          if(d&&d.cells){const i=r*d.cols+col;if(d.cells[i])d.cells[i].html=c.innerHTML;}
        });
        if(prevEl.dataset.editing) delete prevEl.dataset.editing;
        prevEl.querySelectorAll('td,th').forEach(c=>{c.style.outline='';c.style.outlineOffset='';});
      }
    }
  }
  _tblSel=null;
  _tblSelSet=new Set();
}

// ── Data accessor ──
function tblData(){
  if(!sel||sel.dataset.type!=='table') return null;
  return slides[cur]&&slides[cur].els.find(e=>e.id===sel.dataset.id);
}

// ══ TABLE MANIPULATION ══

function tblAddRow(after=true){
  const d=tblData();if(!d)return;pushUndo();
  const r=(_tblSel&&_tblSel.elId===d.id)?_tblSel.r:d.rows-1;
  d.cells.splice((after?r+1:r)*d.cols,0,..._tblMakeCells(1,d.cols));
  d.rows++;d.rowHeights=_tblEqRows(d.rows);
  renderTableEl(sel,d);save();drawThumbs();saveState();syncProps();
}
function tblDelRow(){
  const d=tblData();if(!d||d.rows<=1)return;pushUndo();
  // Collect unique selected rows, sorted descending so splices don't shift indices
  let rows;
  if(_tblSel&&_tblSel.elId===d.id&&_tblSelSet.size>0){
    rows=[...new Set([..._tblSelSet].map(k=>+k.split(':')[0]))].sort((a,b)=>b-a);
  } else {
    rows=[d.rows-1];
  }
  // Keep at least 1 row
  rows=rows.slice(0,d.rows-1);
  rows.forEach(r=>{d.cells.splice(r*d.cols,d.cols);d.rows--;});
  d.rowHeights=_tblEqRows(d.rows);
  if(_tblSel)_tblSel.r=Math.min(_tblSel.r,d.rows-1);
  _tblSelSet=new Set();
  renderTableEl(sel,d);save();drawThumbs();saveState();syncProps();
}
function tblAddCol(after=true){
  const d=tblData();if(!d)return;pushUndo();
  const c=(_tblSel&&_tblSel.elId===d.id)?_tblSel.c:d.cols-1;
  const at=after?c+1:c;
  for(let r=d.rows-1;r>=0;r--) d.cells.splice(r*d.cols+at,0,{html:'',align:'left',valign:'middle',bg:'',colspan:1,rowspan:1,hidden:false});
  d.cols++;d.colWidths=_tblEqCols(d.cols);
  renderTableEl(sel,d);save();drawThumbs();saveState();syncProps();
}
function tblDelCol(){
  const d=tblData();if(!d||d.cols<=1)return;pushUndo();
  // Collect unique selected cols, sorted descending
  let cols;
  if(_tblSel&&_tblSel.elId===d.id&&_tblSelSet.size>0){
    cols=[...new Set([..._tblSelSet].map(k=>+k.split(':')[1]))].sort((a,b)=>b-a);
  } else {
    cols=[d.cols-1];
  }
  // Keep at least 1 col
  cols=cols.slice(0,d.cols-1);
  cols.forEach(c=>{for(let r=d.rows-1;r>=0;r--) d.cells.splice(r*d.cols+c,1);d.cols--;});
  d.colWidths=_tblEqCols(d.cols);
  if(_tblSel)_tblSel.c=Math.min(_tblSel.c,d.cols-1);
  _tblSelSet=new Set();
  renderTableEl(sel,d);save();drawThumbs();saveState();syncProps();
}
function tblSetBgOp(v){
  const d=tblData();if(!d)return;
  d.tableBgOp=+v;
  renderTableEl(sel,d);save();drawThumbs();saveState();
}
function tblSetBgBlur(v){
  const d=tblData();if(!d)return;
  d.tableBgBlur=+v;
  renderTableEl(sel,d);save();drawThumbs();saveState();
}
function tblMerge(){
  const d=tblData();if(!d||!_tblSel||_tblSel.elId!==d.id)return toast('Выберите ячейки');
  // Collect bounding box of selection
  const keys=[..._tblSelSet];
  if(keys.length<2)return toast('Выделите несколько ячеек');
  const rs=keys.map(k=>+k.split(':')[0]), cs=keys.map(k=>+k.split(':')[1]);
  const minR=Math.min(...rs),maxR=Math.max(...rs),minC=Math.min(...cs),maxC=Math.max(...cs);
  const spanR=maxR-minR+1, spanC=maxC-minC+1;
  if(spanR*spanC!==keys.length) return toast('Выделите прямоугольную область');
  pushUndo();
  // Collect HTML from all cells in range
  let combined='';
  for(let r=minR;r<=maxR;r++) for(let c=minC;c<=maxC;c++){
    const cell=d.cells[r*d.cols+c];
    if(cell&&cell.html) combined+=(combined?' ':'')+cell.html;
  }
  // Set anchor cell (top-left) with full span
  const anchor=d.cells[minR*d.cols+minC];
  anchor.colspan=spanC; anchor.rowspan=spanR; anchor.html=combined; anchor.hidden=false;
  // Hide all others in the range
  for(let r=minR;r<=maxR;r++) for(let c=minC;c<=maxC;c++){
    if(r===minR&&c===minC) continue;
    const cell=d.cells[r*d.cols+c];
    if(cell){cell.hidden=true;cell.html='';}
  }
  _tblSel={elId:d.id,r:minR,c:minC};
  _tblSelSet=new Set([minR+':'+minC]);
  renderTableEl(sel,d);save();drawThumbs();saveState();
}
function tblSplit(){
  const d=tblData();if(!d||!_tblSel||_tblSel.elId!==d.id)return toast('Выберите ячейку');
  const{r,c}=_tblSel;const i=r*d.cols+c;const cell=d.cells[i];
  if((cell.colspan||1)<=1&&(cell.rowspan||1)<=1)return toast('Ячейка не объединена');
  pushUndo();
  const spanC=cell.colspan||1, spanR=cell.rowspan||1;
  // Unhide all covered cells and reset spans
  for(let dr=0;dr<spanR;dr++) for(let dc=0;dc<spanC;dc++){
    if(dr===0&&dc===0) continue;
    const ni=(r+dr)*d.cols+(c+dc);
    if(d.cells[ni]){d.cells[ni].hidden=false;d.cells[ni].html='';d.cells[ni].colspan=1;d.cells[ni].rowspan=1;}
  }
  cell.colspan=1; cell.rowspan=1;
  renderTableEl(sel,d);save();drawThumbs();saveState();
}

// ── Apply to all selected cells ──
function tblSetCellAlign(a){
  const d=tblData();if(!d)return;
  _tblSelectedCells(d).forEach(({i})=>{if(d.cells[i])d.cells[i].align=a;});
  renderTableEl(sel,d);save();drawThumbs();saveState();syncProps();
}
function tblSetCellVAlign(a){
  const d=tblData();if(!d)return;
  _tblSelectedCells(d).forEach(({i})=>{if(d.cells[i])d.cells[i].valign=a;});
  renderTableEl(sel,d);save();drawThumbs();saveState();
}
function tblSetCellBg(v){
  const d=tblData();if(!d)return;
  _tblSelectedCells(d).forEach(({i})=>{if(d.cells[i])d.cells[i].bg=v;});
  renderTableEl(sel,d);save();drawThumbs();saveState();
}
function tblSetCellTextColor(v){
  const d=tblData();if(!d)return;
  _tblSelectedCells(d).forEach(({i})=>{if(d.cells[i])d.cells[i].tc=v||'';});
  renderTableEl(sel,d);save();drawThumbs();saveState();
}
function tblSetCellFs(v){
  const d=tblData();if(!d)return;
  const cells=_tblSelectedCells(d);
  if(cells.length){
    cells.forEach(({r,c})=>{const i=r*d.cols+c;if(d.cells[i])d.cells[i].fs=+v;});
  } else {
    // No selection — set global fallback
    d.fs=+v;
  }
  renderTableEl(sel,d);save();drawThumbs();saveState();
}
function tblSet(prop,val){
  const d=tblData();if(!d)return;
  d[prop]=val;
  renderTableEl(sel,d);save();drawThumbs();saveState();
}

// ══ PROPS SYNC ══
function syncTableProps(){
  if(!sel||sel.dataset.type!=='table')return;
  const d=tblData();if(!d)return;
  const sc6=v=>typeof v==='string'&&v.length>7?v.slice(0,7):v;
  const sv=(id,v)=>{try{const e=document.getElementById(id);if(!e)return;e.value=v;}catch(e){}};
  const sw=(id,v)=>{try{const e=document.getElementById(id);if(!e)return;e.style.background=v;}catch(e){}};
  const sc=(id,v)=>{try{document.getElementById(id).checked=v;}catch(e){}};
  // Show per-cell fs if a single cell is selected, else global
  const _cellFsVal = (_tblSel&&_tblSel.elId===d.id&&_tblSelSet.size===1)
    ? (()=>{const k=[..._tblSelSet][0].split(':');const ci=+k[0]*d.cols+ +k[1];return d.cells[ci]&&d.cells[ci].fs||d.fs||15;})()
    : (d.fs||15);
  sv('tbl-fs',_cellFsVal); sv('tbl-rx',d.rx||0); sv('tbl-bw',d.borderW||1);
  try{document.getElementById('tbl-bg-op').value=d.tableBgOp!=null?d.tableBgOp:1;document.getElementById('tbl-bg-blur').value=d.tableBgBlur||0;}catch(e){}
  sw('tbl-bc-swatch',d.borderColor||'#3b82f6'); sv('tbl-bc-hex',d.borderColor||'#3b82f6');
  sw('tbl-tc-swatch',d.textColor||'#ffffff');   sv('tbl-tc-hex',d.textColor||'#ffffff');
  sw('tbl-hbg-swatch',d.headerBg||'#3b82f6');  sv('tbl-hbg-hex',d.headerBg||'#3b82f6');
  sw('tbl-cbg-swatch',d.cellBg||'#1e293b');     sv('tbl-cbg-hex',d.cellBg||'#1e293b');
  sc('tbl-hrow',d.headerRow!==false); sc('tbl-alt',!!d.altBg);

  // ── Chart props sync ──
  try{
    const chkEl=document.getElementById('tbl-chart-on');
    if(chkEl) chkEl.checked=!!d.showChart;
    // Подсвечиваем активный лейбл в шапке
    const _lblT=document.getElementById('tbl-mode-lbl-table');
    const _lblC=document.getElementById('tbl-mode-lbl-chart');
    if(_lblT) _lblT.style.color=d.showChart?'var(--text3)':'var(--text)';
    if(_lblC) _lblC.style.color=d.showChart?'var(--text)':'var(--text3)';
    const chartPanel=document.getElementById('tbl-chart-panel');
    if(chartPanel) chartPanel.style.display=d.showChart?'flex':'none';
    const tableSettings=document.getElementById('tbl-table-settings');
    if(tableSettings) tableSettings.style.display=d.showChart?'none':'';
    const ctSel=document.getElementById('tbl-chart-type');
    if(ctSel) ctSel.value=d.chartType||'bar';
    // Highlight active chart type button
    const _ct=d.chartType||'bar';
    ['bar','hbar','line','pie','donut'].forEach(function(t){
      const b=document.getElementById('ct-'+t);
      if(b) b.classList.toggle('active', t===_ct||(_ct==='horizontalBar'&&t==='hbar'));
    });
    const clSel=document.getElementById('tbl-chart-legend');
    if(clSel) clSel.value=d.chartLegend||'row';
    const clbSel=document.getElementById('tbl-chart-labels');
    if(clbSel) clbSel.value=d.chartLabels||'none';
  }catch(e){}

  const hasSel=_tblSel&&_tblSel.elId===d.id&&_tblSelSet.size>0;
  const cp=document.getElementById('tbl-cell-panel');
  if(cp)cp.style.display=hasSel?'flex':'none';
  if(hasSel){
    const cnt=_tblSelSet.size;
    const lbl=document.getElementById('tbl-cell-lbl');
    if(lbl) lbl.textContent=cnt>1?`${cnt} ячеек`:`Ячейка ${_tblSel.r+1}:${_tblSel.c+1}`;
    const anch=d.cells[_tblSel.r*d.cols+_tblSel.c];
    if(anch){
      ['left','center','right'].forEach(a=>{const b=document.getElementById('tbl-ca-'+a);if(b)b.classList.toggle('active',(anch.align||'left')===a);});
      ['top','middle','bottom'].forEach(a=>{const b=document.getElementById('tbl-va-'+a);if(b)b.classList.toggle('active',(anch.valign||'middle')===a);});
      sw('tbl-own-bg-swatch',anch.bg||d.cellBg||'#1e293b');
      sv('tbl-own-bg-hex',anch.bg||'');
      sw('tbl-cell-tc-swatch',anch.tc||'');
      sv('tbl-cell-tc-hex',anch.tc||'');
    }
  }
}

// ══ GRID PICKER MODAL ══
let _tblPickR=3,_tblPickC=4;
function openTableModal(){
  let m=document.getElementById('table-modal');
  if(!m){
    m=document.createElement('div');m.id='table-modal';
    m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:3000;backdrop-filter:blur(4px)';
    m.innerHTML=`<div style="background:var(--surface);border:1px solid var(--border2);border-radius:12px;padding:20px;display:inline-block;box-shadow:0 24px 64px rgba(0,0,0,.5)">
<div style="font-weight:700;font-size:14px;margin-bottom:14px;color:var(--text)">Вставить таблицу</div>
<div id="tbl-grid" style="display:grid;grid-template-columns:repeat(10,24px);gap:3px;margin-bottom:6px;cursor:pointer;"></div>
<div id="tbl-grid-lbl" style="font-size:11px;color:var(--text3);text-align:center;margin-bottom:14px;height:14px"></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;width:267px">
  <div class="pr" style="margin:0">
    <label>Строк</label>
    <input id="tbl-ri" type="number" min="1" max="30" value="3" style="-moz-appearance:textfield;text-align:center">
  </div>
  <div class="pr" style="margin:0">
    <label>Столбцов</label>
    <input id="tbl-ci" type="number" min="1" max="30" value="4" style="-moz-appearance:textfield;text-align:center">
  </div>
</div>
<div style="display:flex;gap:8px;justify-content:flex-end;width:267px">
  <button onclick="document.getElementById('table-modal').style.display='none'" style="background:var(--surface2);border:1px solid var(--border);color:var(--text2);border-radius:6px;padding:7px 16px;cursor:pointer;font-size:12px">Отмена</button>
  <button onclick="_tblInsert()" style="background:var(--accent);border:none;color:#fff;border-radius:6px;padding:7px 18px;cursor:pointer;font-size:12px;font-weight:600">Вставить</button>
</div></div>`;
    document.body.appendChild(m);
    m.addEventListener('mousedown',ev=>{if(ev.target===m)m.style.display='none';});
  }
  m.style.display='flex';
  const g=document.getElementById('tbl-grid');g.innerHTML='';
  for(let r=1;r<=8;r++) for(let c=1;c<=10;c++){
    const cell=document.createElement('div');cell.dataset.r=r;cell.dataset.c=c;
    cell.style.cssText='width:24px;height:24px;border:1.5px solid var(--border2);border-radius:3px;transition:.06s;background:var(--surface2)';
    cell.addEventListener('mouseenter',()=>{
      _tblPickR=r;_tblPickC=c;
      document.getElementById('tbl-grid-lbl').textContent=`${r} × ${c}`;
      try{document.getElementById('tbl-ri').value=r;document.getElementById('tbl-ci').value=c;}catch(e){}
      g.querySelectorAll('div').forEach(x=>{const on=+x.dataset.r<=r&&+x.dataset.c<=c;x.style.background=on?'var(--accent)':'var(--surface2)';x.style.borderColor=on?'var(--accent)':'var(--border2)';});
    });
    cell.addEventListener('click',_tblInsert);
    g.appendChild(cell);
  }
}
function _tblInsert(){
  const r=+(document.getElementById('tbl-ri')?.value||_tblPickR);
  const c=+(document.getElementById('tbl-ci')?.value||_tblPickC);
  document.getElementById('table-modal').style.display='none';
  addTable(Math.max(1,Math.min(30,r)),Math.max(1,Math.min(30,c)));
}

// ══ PASTE FROM EXCEL / TSV ══
// Called from 21-keyboard.js paste handler when TSV data is detected
function _tblParseTSV(text){
  // Parse tab-separated values (Excel copy format)
  return text.split('\n').filter(r=>r.trim()).map(r=>r.split('\t'));
}

function tblPasteData(tsvText){
  const rows=_tblParseTSV(tsvText);
  if(!rows.length||!rows[0].length) return false;

  const numRows=rows.length, numCols=Math.max(...rows.map(r=>r.length));

  // If a table is selected and cells are selected — paste into it starting at anchor
  const d=tblData();
  if(d&&_tblSel&&_tblSel.elId===d.id){
    pushUndo();
    const startR=_tblSel.r, startC=_tblSel.c;
    // Expand table if needed
    while(d.rows<startR+numRows) tblAddRow(true);
    while(d.cols<startC+numCols) tblAddCol(true);
    for(let r=0;r<numRows;r++){
      for(let c=0;c<rows[r].length;c++){
        const i=(startR+r)*d.cols+(startC+c);
        if(d.cells[i]) d.cells[i].html=_escHTML(rows[r][c]);
      }
    }
    renderTableEl(sel,d);save();drawThumbs();saveState();
    toast('Данные вставлены в таблицу','ok');
    return true;
  }

  // No table selected — create a new one
  addTable(numRows, numCols);
  // Wait for mkEl to finish, then fill
  setTimeout(()=>{
    const d2=tblData();if(!d2)return;
    for(let r=0;r<numRows;r++)
      for(let c=0;c<(rows[r]||[]).length;c++){
        const i=r*d2.cols+c;
        if(d2.cells[i]) d2.cells[i].html=_escHTML(rows[r][c]);
      }
    renderTableEl(sel,d2);save();drawThumbs();saveState();
    toast('Таблица создана из данных буфера','ok');
  },50);
  return true;
}

function _escHTML(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ══ RESIZE OBSERVER — re-render on size change ══
function _tblAttachResizeObs(el, d){
  if(el._tblRO) el._tblRO.disconnect();
  const ro=new ResizeObserver(()=>{
    const nw=parseInt(el.style.width), nh=parseInt(el.style.height);
    if(nw&&nh&&(nw!==d.w||nh!==d.h)){d.w=nw;d.h=nh;renderTableEl(el,d);}
  });
  ro.observe(el);
  el._tblRO=ro;
}

// ══════════════════════════════════════════════════════════════════
// CHART RENDERING  (bar | pie | line | donut | horizontalBar)
// ══════════════════════════════════════════════════════════════════

// Palette for series / slices — uses theme accent colours + fallbacks
function _chartPalette(n, ac1, ac2) {
  const base = [
    ac1  || '#6366f1',
    ac2  || '#818cf8',
    '#22d3ee','#f59e0b','#10b981','#f43f5e',
    '#a78bfa','#fb923c','#34d399','#60a5fa',
    '#e879f9','#fbbf24','#4ade80','#38bdf8',
  ];
  const out = [];
  for (let i = 0; i < n; i++) out.push(base[i % base.length]);
  return out;
}

// Parse plain-text cell content to a number (strip HTML tags)
function _cellNum(html) {
  const t = (html || '').replace(/<[^>]*>/g, '').replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

// Extract chart data from table data object d
// Returns { series:[{label,values:[]}], categories:[], hasHeader }
function _chartExtract(d) {
  const legendOnRow = (d.chartLegend || 'row') === 'row'; // first ROW = series labels
  const rows = d.rows, cols = d.cols;
  const cells = d.cells;
  const get = (r, c) => cells[r * cols + c] ? (cells[r * cols + c].html || '') : '';
  const getNum = (r, c) => _cellNum(get(r, c));

  if (legendOnRow) {
    // First row = series labels, first col = category labels (optional)
    const hasHeader = d.headerRow !== false;
    const dataStartR = hasHeader ? 1 : 0;
    const dataStartC = 1; // first col = categories
    const categories = [];
    for (let r = dataStartR; r < rows; r++) categories.push(get(r, 0).replace(/<[^>]*>/g, '') || ('R' + r));
    const series = [];
    for (let c = dataStartC; c < cols; c++) {
      const label = hasHeader ? get(0, c).replace(/<[^>]*>/g, '') : ('S' + c);
      const values = [];
      for (let r = dataStartR; r < rows; r++) values.push(getNum(r, c));
      series.push({ label, values });
    }
    return { series, categories, legendOnRow };
  } else {
    // First col = series labels, first row = category labels (optional)
    const hasHeader = d.headerRow !== false;
    const dataStartC = hasHeader ? 1 : 0;
    const dataStartR = 1; // first row = categories
    const categories = [];
    for (let c = dataStartC; c < cols; c++) categories.push(get(0, c).replace(/<[^>]*>/g, '') || ('C' + c));
    const series = [];
    for (let r = dataStartR; r < rows; r++) {
      const label = get(r, 0).replace(/<[^>]*>/g, '') || ('S' + r);
      const values = [];
      for (let c = dataStartC; c < cols; c++) values.push(getNum(r, c));
      series.push({ label, values });
    }
    return { series, categories, legendOnRow };
  }
}

// Format label string based on chartLabels setting
function _fmtLabel(val, total, mode) {
  if (!mode || mode === 'none' || val === null) return '';
  const num = (typeof val === 'number') ? val : 0;
  const pct = total > 0 ? ((num / total) * 100).toFixed(1) + '%' : '';
  const numStr = Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, '');
  if (mode === 'value')   return numStr;
  if (mode === 'percent') return pct;
  if (mode === 'both')    return `${numStr} (${pct})`;
  return '';
}

// Build SVG string for chart
function _buildChartSvg(d) {
  const W = d.w || 600, H = d.h || 400;
  const type = d.chartType || 'bar';
  const labelMode = d.chartLabels || 'none';
  const { series, categories } = _chartExtract(d);
  if (!series.length) return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><text x="${W/2}" y="${H/2}" text-anchor="middle" fill="#888" font-size="14">Нет данных</text></svg>`;

  const th = getThemeAccents ? getThemeAccents() : {};
  const palette = _chartPalette(series.length, th.ac1, th.ac2);
  const textCol = d.textColor || '#ffffff';
  const fs = Math.max(9, Math.min(14, (d.fs || 13) * 0.85));

  // Legend
  const legendH = 22;
  const legendY = H - legendH;
  let legendSvg = '';
  const itemW = Math.min(120, (W - 20) / series.length);
  series.forEach((s, i) => {
    const lx = 10 + i * itemW;
    legendSvg += `<rect x="${lx}" y="${legendY + 4}" width="12" height="12" rx="3" fill="${palette[i]}"/>`;
    legendSvg += `<text x="${lx + 16}" y="${legendY + 14}" font-size="${fs}" fill="${textCol}" font-family="sans-serif" dominant-baseline="middle">${_escHTML(s.label)}</text>`;
  });

  const plotH = legendY - 30; // space above legend
  const plotY = 10;
  const plotX = 40;
  const plotW = W - plotX - 10;

  if (type === 'pie' || type === 'donut') {
    return _buildPieChart(d, W, H, series, palette, textCol, fs, labelMode, type === 'donut');
  }
  if (type === 'line') {
    return _buildLineChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg);
  }
  if (type === 'horizontalBar') {
    return _buildHBarChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg);
  }
  // default: bar
  return _buildBarChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg);
}

function _buildBarChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg) {
  const catCount = categories.length || 1;
  const serCount = series.length;
  const groupW = plotW / catCount;
  const barW = Math.max(4, groupW / (serCount + 1));
  const gap = (groupW - barW * serCount) / 2;

  // Find max value for scale
  let maxVal = 0;
  series.forEach(s => s.values.forEach(v => { if (v !== null && v > maxVal) maxVal = v; }));
  if (maxVal === 0) maxVal = 1;

  // Y gridlines
  const gridLines = 5;
  let gridSvg = '';
  for (let i = 0; i <= gridLines; i++) {
    const gy = plotY + plotH - (i / gridLines) * plotH;
    const val = (maxVal * i / gridLines);
    const valStr = Number.isInteger(val) ? val : val.toFixed(1);
    gridSvg += `<line x1="${plotX}" y1="${gy}" x2="${plotX + plotW}" y2="${gy}" stroke="${textCol}22" stroke-width="1"/>`;
    gridSvg += `<text x="${plotX - 4}" y="${gy}" text-anchor="end" dominant-baseline="middle" font-size="${fs - 1}" fill="${textCol}88" font-family="sans-serif">${valStr}</text>`;
  }

  // Bars + labels
  let barsSvg = '';
  const totalPerCat = categories.map((_, ci) => series.reduce((s, sr) => s + (sr.values[ci] || 0), 0));
  series.forEach((s, si) => {
    categories.forEach((cat, ci) => {
      const val = s.values[ci];
      if (val === null) return;
      const bh = Math.max(2, (val / maxVal) * plotH);
      const bx = plotX + ci * groupW + gap + si * barW;
      const by = plotY + plotH - bh;
      barsSvg += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${palette[si]}"/>`;
      const lbl = _fmtLabel(val, totalPerCat[ci], labelMode);
      if (lbl) {
        const inside = bh > fs * 1.8;
        barsSvg += `<text x="${(bx + barW/2).toFixed(1)}" y="${inside ? (by + bh/2).toFixed(1) : (by - 4).toFixed(1)}" text-anchor="middle" dominant-baseline="${inside ? 'middle' : 'auto'}" font-size="${fs - 1}" fill="${inside ? '#fff' : textCol}" font-family="sans-serif">${_escHTML(lbl)}</text>`;
      }
    });
  });

  // Category labels
  let catSvg = '';
  categories.forEach((cat, ci) => {
    const cx = plotX + ci * groupW + groupW / 2;
    catSvg += `<text x="${cx.toFixed(1)}" y="${(plotY + plotH + 14).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${textCol}cc" font-family="sans-serif">${_escHTML(cat)}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${gridSvg}${barsSvg}${catSvg}${legendSvg}</svg>`;
}

function _buildHBarChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg) {
  const catCount = categories.length || 1;
  const serCount = series.length;
  const groupH = plotH / catCount;
  const barH = Math.max(4, groupH / (serCount + 1));
  const gap = (groupH - barH * serCount) / 2;

  let maxVal = 0;
  series.forEach(s => s.values.forEach(v => { if (v !== null && v > maxVal) maxVal = v; }));
  if (maxVal === 0) maxVal = 1;

  const labelColW = 60;
  const bplotX = plotX + labelColW;
  const bplotW = plotW - labelColW;

  let gridSvg = '';
  for (let i = 0; i <= 4; i++) {
    const gx = bplotX + (i / 4) * bplotW;
    const val = (maxVal * i / 4);
    const valStr = Number.isInteger(val) ? val : val.toFixed(1);
    gridSvg += `<line x1="${gx}" y1="${plotY}" x2="${gx}" y2="${plotY + plotH}" stroke="${textCol}22" stroke-width="1"/>`;
    gridSvg += `<text x="${gx}" y="${plotY + plotH + 14}" text-anchor="middle" font-size="${fs - 1}" fill="${textCol}88" font-family="sans-serif">${valStr}</text>`;
  }

  const totalPerCat = categories.map((_, ci) => series.reduce((s, sr) => s + (sr.values[ci] || 0), 0));
  let barsSvg = '';
  series.forEach((s, si) => {
    categories.forEach((cat, ci) => {
      const val = s.values[ci];
      if (val === null) return;
      const bw = Math.max(2, (val / maxVal) * bplotW);
      const bx = bplotX;
      const by = plotY + ci * groupH + gap + si * barH;
      barsSvg += `<rect x="${bx}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH.toFixed(1)}" rx="2" fill="${palette[si]}"/>`;
      const lbl = _fmtLabel(val, totalPerCat[ci], labelMode);
      if (lbl) {
        const inside = bw > 40;
        barsSvg += `<text x="${inside ? (bx + bw - 4).toFixed(1) : (bx + bw + 4).toFixed(1)}" y="${(by + barH/2).toFixed(1)}" text-anchor="${inside ? 'end' : 'start'}" dominant-baseline="middle" font-size="${fs - 1}" fill="${inside ? '#fff' : textCol}" font-family="sans-serif">${_escHTML(lbl)}</text>`;
      }
    });
  });

  let catSvg = '';
  categories.forEach((cat, ci) => {
    const cy = plotY + ci * groupH + groupH / 2;
    catSvg += `<text x="${plotX + labelColW - 6}" y="${cy.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="${fs}" fill="${textCol}cc" font-family="sans-serif">${_escHTML(cat)}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${gridSvg}${barsSvg}${catSvg}${legendSvg}</svg>`;
}

function _buildLineChart(d, W, H, series, categories, palette, textCol, fs, labelMode, plotX, plotY, plotW, plotH, legendSvg) {
  const catCount = Math.max(categories.length, 2);

  let maxVal = 0, minVal = 0;
  series.forEach(s => s.values.forEach(v => { if (v !== null) { if (v > maxVal) maxVal = v; if (v < minVal) minVal = v; } }));
  if (maxVal === minVal) maxVal = minVal + 1;

  const toX = i => plotX + (i / (catCount - 1)) * plotW;
  const toY = v => plotY + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

  let gridSvg = '';
  for (let i = 0; i <= 5; i++) {
    const gy = plotY + plotH - (i / 5) * plotH;
    const val = minVal + (maxVal - minVal) * i / 5;
    const valStr = Number.isInteger(val) ? val : val.toFixed(1);
    gridSvg += `<line x1="${plotX}" y1="${gy.toFixed(1)}" x2="${plotX + plotW}" y2="${gy.toFixed(1)}" stroke="${textCol}22" stroke-width="1"/>`;
    gridSvg += `<text x="${plotX - 4}" y="${gy.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="${fs - 1}" fill="${textCol}88" font-family="sans-serif">${valStr}</text>`;
  }

  const totalPerCat = categories.map((_, ci) => series.reduce((s, sr) => s + (sr.values[ci] || 0), 0));
  let linesSvg = '';
  series.forEach((s, si) => {
    const pts = s.values.map((v, i) => v !== null ? `${toX(i).toFixed(1)},${toY(v).toFixed(1)}` : null).filter(Boolean);
    if (pts.length < 2) return;
    linesSvg += `<polyline points="${pts.join(' ')}" fill="none" stroke="${palette[si]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.values.forEach((v, i) => {
      if (v === null) return;
      const cx = toX(i), cy = toY(v);
      linesSvg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${palette[si]}" stroke="${textCol}44" stroke-width="1"/>`;
      const lbl = _fmtLabel(v, totalPerCat[i], labelMode);
      if (lbl) linesSvg += `<text x="${cx.toFixed(1)}" y="${(cy - 8).toFixed(1)}" text-anchor="middle" font-size="${fs - 1}" fill="${textCol}" font-family="sans-serif">${_escHTML(lbl)}</text>`;
    });
  });

  let catSvg = '';
  categories.forEach((cat, i) => {
    catSvg += `<text x="${toX(i).toFixed(1)}" y="${(plotY + plotH + 14).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${textCol}cc" font-family="sans-serif">${_escHTML(cat)}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${gridSvg}${linesSvg}${catSvg}${legendSvg}</svg>`;
}

function _buildPieChart(d, W, H, series, palette, textCol, fs, labelMode, isDonut) {
  // For pie/donut: single series = slice per category; multiple series = first series only
  // Use first series, its values = slices; categories = series labels
  const { categories } = _chartExtract(d);
  // Flatten: if multiple series use all series summed per category, or first series
  const sliceData = series[0] ? series[0].values.map((v, i) => ({
    val: v || 0,
    label: categories[i] || series[0].label,
    color: palette[i % palette.length]
  })) : [];

  const total = sliceData.reduce((s, sl) => s + sl.val, 0);
  if (total === 0) return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><text x="${W/2}" y="${H/2}" text-anchor="middle" fill="#888" font-size="14">Нет данных</text></svg>`;

  const legendH = 22;
  const cx = W / 2, cy = (H - legendH) / 2;
  const R = Math.min(cx - 10, cy - 10);
  const r = isDonut ? R * 0.52 : 0;

  const deg = v => (v / total) * Math.PI * 2;
  const px = (angle, radius) => cx + radius * Math.cos(angle - Math.PI / 2);
  const py = (angle, radius) => cy + radius * Math.sin(angle - Math.PI / 2);
  const arc = (r1, r2, a1, a2) => {
    const large = (a2 - a1) > Math.PI ? 1 : 0;
    if (isDonut) {
      return `M ${px(a1,r2).toFixed(2)} ${py(a1,r2).toFixed(2)} A ${r2} ${r2} 0 ${large} 1 ${px(a2,r2).toFixed(2)} ${py(a2,r2).toFixed(2)} L ${px(a2,r1).toFixed(2)} ${py(a2,r1).toFixed(2)} A ${r1} ${r1} 0 ${large} 0 ${px(a1,r1).toFixed(2)} ${py(a1,r1).toFixed(2)} Z`;
    }
    return `M ${cx} ${cy} L ${px(a1,r2).toFixed(2)} ${py(a1,r2).toFixed(2)} A ${r2} ${r2} 0 ${large} 1 ${px(a2,r2).toFixed(2)} ${py(a2,r2).toFixed(2)} Z`;
  };

  let slicesSvg = '', labelsSvg = '', legendSvg = '';
  let angle = 0;
  const itemW = Math.min(110, (W - 20) / Math.max(sliceData.length, 1));
  sliceData.forEach((sl, i) => {
    if (sl.val <= 0) { angle += deg(sl.val); return; }
    const a1 = angle, a2 = angle + deg(sl.val);
    slicesSvg += `<path d="${arc(r, R, a1, a2)}" fill="${sl.color}" stroke="${textCol}22" stroke-width="1"/>`;
    const mid = (a1 + a2) / 2;
    const lr = isDonut ? (r + R) / 2 : R * 0.65;
    const lbl = _fmtLabel(sl.val, total, labelMode);
    if (lbl) labelsSvg += `<text x="${px(mid,lr).toFixed(1)}" y="${py(mid,lr).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${fs - 1}" fill="#fff" font-family="sans-serif" font-weight="600">${_escHTML(lbl)}</text>`;
    const lx = 10 + i * itemW;
    const legendY = H - legendH;
    legendSvg += `<rect x="${lx}" y="${legendY + 4}" width="12" height="12" rx="3" fill="${sl.color}"/>`;
    legendSvg += `<text x="${lx + 16}" y="${legendY + 14}" font-size="${fs}" fill="${textCol}" font-family="sans-serif" dominant-baseline="middle">${_escHTML(sl.label)}</text>`;
    angle = a2;
  });

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${slicesSvg}${labelsSvg}${legendSvg}</svg>`;
}

// Toggle between table and chart view
window.tblToggleChart = function(on) {
  if(!sel) return;
  const d = tblData(); if(!d) return;
  d.showChart = !!on;
  const el = document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
  if(el) renderTableEl(el, d);
  // Немедленно показываем/скрываем панель диаграммы без ожидания syncTableProps
  const _cp = document.getElementById('tbl-chart-panel');
  if(_cp) _cp.style.display = on ? 'flex' : 'none';
  const _lblT=document.getElementById('tbl-mode-lbl-table');
  const _lblC=document.getElementById('tbl-mode-lbl-chart');
  if(_lblT) _lblT.style.color=on?'var(--text3)':'var(--text)';
  if(_lblC) _lblC.style.color=on?'var(--text)':'var(--text3)';
  // Скрываем/показываем стандартные настройки таблицы
  const _tp = document.getElementById('tbl-table-settings');
  if(_tp) _tp.style.display = on ? 'none' : '';
  save(); drawThumbs(); saveState();
  syncTableProps();
};

window.tblSetChart = function(prop, val) {
  if(!sel) return;
  const d = tblData(); if(!d) return;
  d[prop] = val;
  if(d.showChart) {
    const el = document.getElementById('canvas').querySelector('[data-id="'+d.id+'"]');
    if(el) renderTableEl(el, d);
    save(); drawThumbs(); saveState();
  }
  syncTableProps();
};

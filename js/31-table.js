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


const _TBL_FIELDS=['cells','colWidths','rowHeights','rows','cols','borderW','borderColor','headerRow','rx','fs','textColor','headerBg','cellBg','altBg'];
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
  console.log('[TBL] renderTableEl id='+d.id+' rows='+d.rows+' cols='+d.cols+' cells='+(d.cells&&d.cells.length)+' W='+W+' H='+H);
  const bw=d.borderW||1, bc=d.borderColor||'#3b82f680';
  const rx=d.rx||0, fs=d.fs||15;
  const textColor=d.textColor||'#fff';
  const headerBg=d.headerBg||'#3b82f6';
  const cellBg=d.cellBg||'#1e293b44';
  const altBg=d.altBg||'';

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
      const bg=cell.bg||(isH?headerBg:isAlt?altBg:cellBg);
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
      t+=`<${tag} data-r="${r}" data-c="${c}"${span} style="background:${bg};${borders}text-align:${cell.align||'left'};vertical-align:${cell.valign||'middle'};padding:5px 9px;overflow:hidden;word-break:normal;overflow-wrap:break-word;font-weight:${isH?700:400};box-sizing:border-box;${cr}${selStyle}">${cell.html||''}</${tag}>`; 
    }
    t+='</tr>';
  }
  t+='</tbody></table>';
  ecEl.innerHTML=`<div class="tbl-wrap" style="width:${W}px;height:${H}px;border-radius:${rx}px;overflow:hidden;position:relative;">${t}</div>`;

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
      if(sel!==el) pick(el);
      // Trigger drag directly — replicate mkDrag logic
      let ox=ev.clientX, oy=ev.clientY;
      let ol=parseInt(el.style.left), ot=parseInt(el.style.top);
      pushUndo();
      const mm=e2=>{
        let nx=ol+(e2.clientX-ox), ny=ot+(e2.clientY-oy);
        if(document.getElementById('snap-chk')&&document.getElementById('snap-chk').checked){nx=snapV(nx);ny=snapV(ny);}
        el.style.left=nx+'px'; el.style.top=ny+'px';
        if(typeof showGuides==='function') showGuides(el);
        if(typeof syncPos==='function') syncPos();
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
        const dx=(e2.clientX-sx)/d.w;
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
        const dy=(e2.clientY-sy)/d.h;
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
  const r=(_tblSel&&_tblSel.elId===d.id)?_tblSel.r:d.rows-1;
  d.cells.splice(r*d.cols,d.cols);d.rows--;d.rowHeights=_tblEqRows(d.rows);
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
  const c=(_tblSel&&_tblSel.elId===d.id)?_tblSel.c:d.cols-1;
  for(let r=d.rows-1;r>=0;r--) d.cells.splice(r*d.cols+c,1);
  d.cols--;d.colWidths=_tblEqCols(d.cols);
  if(_tblSel)_tblSel.c=Math.min(_tblSel.c,d.cols-1);
  _tblSelSet=new Set();
  renderTableEl(sel,d);save();drawThumbs();saveState();syncProps();
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
function tblSetCellFs(v){
  const d=tblData();if(!d)return;
  // per-cell font size not in model yet — set global for now, or store per-cell
  d.fs=+v; renderTableEl(sel,d);save();drawThumbs();saveState();
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
  const sv=(id,v)=>{try{const e=document.getElementById(id);if(!e)return;e.value=e.type==='color'?sc6(v):v;}catch(e){}};
  const sc=(id,v)=>{try{document.getElementById(id).checked=v;}catch(e){}};
  sv('tbl-fs',d.fs||15); sv('tbl-rx',d.rx||0); sv('tbl-bw',d.borderW||1);
  sv('tbl-bc',d.borderColor||'#3b82f6'); sv('tbl-bc-hex',d.borderColor||'#3b82f6');
  sv('tbl-tc',d.textColor||'#ffffff'); sv('tbl-tc-hex',d.textColor||'#ffffff');
  sv('tbl-hbg',d.headerBg||'#3b82f6'); sv('tbl-hbg-hex',d.headerBg||'#3b82f6');
  sv('tbl-cbg',d.cellBg||'#1e293b'); sv('tbl-cbg-hex',d.cellBg||'#1e293b');
  sc('tbl-hrow',d.headerRow!==false); sc('tbl-alt',!!d.altBg);

  const hasSel=_tblSel&&_tblSel.elId===d.id&&_tblSelSet.size>0;
  const cp=document.getElementById('tbl-cell-panel');
  if(cp)cp.style.display=hasSel?'flex':'none';
  if(hasSel){
    const cnt=_tblSelSet.size;
    const lbl=document.getElementById('tbl-cell-lbl');
    if(lbl) lbl.textContent=cnt>1?`${cnt} ячеек`:`Ячейка ${_tblSel.r+1}:${_tblSel.c+1}`;
    // Show props of anchor cell
    const anch=d.cells[_tblSel.r*d.cols+_tblSel.c];
    if(anch){
      ['left','center','right'].forEach(a=>{const b=document.getElementById('tbl-ca-'+a);if(b)b.classList.toggle('active',(anch.align||'left')===a);});
      ['top','middle','bottom'].forEach(a=>{const b=document.getElementById('tbl-va-'+a);if(b)b.classList.toggle('active',(anch.valign||'middle')===a);});
      sv('tbl-own-bg',anch.bg||d.cellBg||'#1e293b');
      sv('tbl-own-bg-hex',anch.bg||'');
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

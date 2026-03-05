// ══════════════ UNDO/REDO ══════════════
function _snapState(){
  return JSON.stringify({slides,cur,ar,canvasW,canvasH,globalTrans,transitionDur,autoDelay,
    pnSettings:typeof pnSettings!=='undefined'?pnSettings:null});
}
function pushUndo(){
  save();undoStack.push(_snapState());
  if(undoStack.length>40)undoStack.shift();redoStack=[];
}
function doUndo(){if(!undoStack.length)return toast('Nothing to undo');redoStack.push(_snapState());restoreSnap(JSON.parse(undoStack.pop()));}
function doRedo(){if(!redoStack.length)return toast('Nothing to redo');undoStack.push(_snapState());restoreSnap(JSON.parse(redoStack.pop()));}
function restoreSnap(s){
  slides=s.slides;cur=s.cur;ar=s.ar||'16:9';canvasW=s.canvasW||1200;canvasH=s.canvasH||675;
  globalTrans=s.globalTrans||'none';transitionDur=s.transitionDur||500;
  if(s.pnSettings&&typeof pnGetSettings==='function'){const def=pnGetSettings();pnSettings=Object.assign({},def,s.pnSettings);}
  document.getElementById('canvas').style.width=canvasW+'px';document.getElementById('canvas').style.height=canvasH+'px';
  renderAll();saveState();
  if(typeof pnSyncUI==='function')pnSyncUI();
}

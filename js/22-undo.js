// ══════════════ UNDO/REDO ══════════════
function pushUndo(){
  save();undoStack.push(JSON.stringify({slides,cur,ar,canvasW,canvasH,globalTrans,transitionDur,autoDelay}));
  if(undoStack.length>40)undoStack.shift();redoStack=[];
}
function doUndo(){if(!undoStack.length)return toast('Nothing to undo');redoStack.push(JSON.stringify({slides,cur,ar,canvasW,canvasH,globalTrans,transitionDur,autoDelay}));restoreSnap(JSON.parse(undoStack.pop()));}
function doRedo(){if(!redoStack.length)return toast('Nothing to redo');undoStack.push(JSON.stringify({slides,cur,ar,canvasW,canvasH,globalTrans,transitionDur,autoDelay}));restoreSnap(JSON.parse(redoStack.pop()));}
function restoreSnap(s){
  slides=s.slides;cur=s.cur;ar=s.ar||'16:9';canvasW=s.canvasW||1200;canvasH=s.canvasH||675;
  globalTrans=s.globalTrans||'none';transitionDur=s.transitionDur||500;
  document.getElementById('canvas').style.width=canvasW+'px';document.getElementById('canvas').style.height=canvasH+'px';
  renderAll();saveState();
}

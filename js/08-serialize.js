// ══════════════ ELEMENT SERIALIZATION HELPERS ══════════════
// Extracted from save() — applet fields synced via dataset + refresh*El.

window._serializeAppletFromDom = function(el, d){
  d.appletId = el.dataset.appletId;
  d.appletHtml = el.dataset.appletHtml || '';
  if(el.dataset.appletAspect) d._appletAspect = +el.dataset.appletAspect;

  const _gk = [
    'tmMin','tmSec','tmOnEnd','tmOnEndSlide','tmOnEndAnim','genMode','genLines','cntStart','cntGoal','cntOnEnd','cntOnEndSlide','cntOnEndAnim','cntGroupId','genMin','genMax','genStep',
    'genFontSize','genColor','genBg','genBgBlur','genBgOp','genBorderColor','genBorderWidth',
    'genBold','genAlign','genVAlign','genShadowOn','genShadowBlur','genShadowColor',
    'genColorScheme','genBgScheme','genBorderScheme'
  ];
  _gk.forEach(k=>{
    if(el.dataset[k] === undefined) return;
    const v = el.dataset[k];
    if(k === 'genBold' || k === 'genShadowOn') d[k] = (v === 'true');
    else if(['tmMin','tmSec','tmOnEndSlide','cntStart','cntOnEndSlide','genMin','genMax','genStep','genFontSize','genBgBlur','genBgOp','genBorderWidth','genShadowBlur'].includes(k)) d[k] = +v;
    else if(['genColorScheme','genBgScheme','genBorderScheme'].includes(k)){
      try{ d[k] = JSON.parse(v); }catch(e){ d[k] = null; }
    }
    else if(k === 'genLines'){
      try{ d[k] = decodeURIComponent(v); }catch(e){ d[k] = v; }
    }
    else if(k === 'cntGoal'){
      if(v !== '') d[k] = +v;
    }
    else d[k] = v;
  });

  if(d.appletId === 'notes'){
    if(el.dataset.notesText !== undefined){
      try{ d.notesText = decodeURIComponent(el.dataset.notesText); }catch(e){ d.notesText = el.dataset.notesText; }
    }
    if(el.dataset.notesBg !== undefined) d.notesBg = el.dataset.notesBg;
  }

  if(el.dataset.genRx !== undefined) d.rx = +el.dataset.genRx;
};

/** 35 — Notebook · Lined */
(function(){
window._THEME_35_NOTEBOOK_LINED = {
name:'Тетрадь · линия', nameEn:'Notebook · Lined',
    desc:'Линовка — крупная / мелкая в шаблонах', descEn:'Lined — large / fine in templates',
    animated:false,
    paper:{kind:'lined', pitch:36, pitchFine:24, fade:0.08},
    variantSvg(w,h,a1,a2,style){
      const st = style || 'title';
      const p = Object.assign({}, this.paper);
      if(st === 'content' || st === 'fine') p.pitch = this.paper.pitchFine != null ? this.paper.pitchFine : 24;
      return _notebookLayoutSvg(w,h,p,a1,a2);
    },
    titleSvg(w,h,a1,a2){ return this.variantSvg(w,h,a1,a2,'title'); },
    contentSvg(w,h,a1,a2){ return this.variantSvg(w,h,a1,a2,'content'); },
  tplVariants(isRu){ return _themeTplFor('Notebook · Lined', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

/** 34 — Notebook · Grid */
(function(){
window._THEME_34_NOTEBOOK_GRID = {
name:'Тетрадь · клетка', nameEn:'Notebook · Grid',
    desc:'Клетка — размер и оси координат', descEn:'Grid — size and coordinate axes',
    animated:false,
    paper:{kind:'grid', cell:48, cellFine:28, fade:0.08},
    variantSvg(w,h,a1,a2,style){
      const st = style || 'title';
      const p = Object.assign({}, this.paper);
      if(st === 'content' || st === 'fine') p.cell = this.paper.cellFine != null ? this.paper.cellFine : 28;
      const axes = (st === 'axes-center' || st === 'axes-q1' || st === 'axes-q1inv' || st === 'axes-q1right') ? st : null;
      return _notebookLayoutSvg(w,h,p,a1,a2,axes);
    },
    titleSvg(w,h,a1,a2){ return this.variantSvg(w,h,a1,a2,'title'); },
    contentSvg(w,h,a1,a2){ return this.variantSvg(w,h,a1,a2,'content');},
  tplVariants(isRu){ return _themeTplFor('Notebook · Grid', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

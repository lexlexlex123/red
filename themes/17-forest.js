/** 17 — Forest */
(function(){
window._THEME_17_FOREST = {
name:'Лес', nameEn:'Forest',
    desc:'Силуэты из Inkscape, дымка и палитра темы', descEn:'Inkscape silhouettes, mist and theme palette',
    animated: true,
    _layoutRev: 21,
    _build:(w,h,a1,a2,isTitle,doAnimate)=>
      window._buildForestInkscape(w,h,a1,a2,isTitle,doAnimate!==false),
    titleSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,true,doAnimate!==false);},
    contentSvg(w,h,a1,a2,doAnimate){return this._build(w,h,a1,a2,false,doAnimate!==false);},
  tplVariants(isRu){ return _themeTplFor('Forest', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

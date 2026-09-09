/** 29 — Caustics */
(function(){
window._THEME_29_CAUSTICS = {
name:'Каустика', nameEn:'Caustics',
    desc:'Подводные блики света',descEn:'Underwater caustic light',
    animated: true,
    renderer: 'caustics',
    buildCausticsCfg(w,h,a1,a2,isTitle,animated){
      return {w,h,a1,a2,isTitle,animated:animated!==false,alpha:isTitle?0.48:0.38,speed:isTitle?1.0:0.85};
    },
    _buildBg(w,h,a1,a2,isTitle){
      const uid='cau'+Math.random().toString(36).slice(2,7);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
        <defs><linearGradient id="${uid}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${a2}" stop-opacity="0.16"/><stop offset="100%" stop-color="${a1}" stop-opacity="0.22"/></linearGradient></defs>
        <rect width="${w}" height="${h}" fill="url(#${uid}bg)"/></svg>`;
    },
    titleSvg(w,h,a1,a2){return this._buildBg(w,h,a1,a2,true);},
    contentSvg(w,h,a1,a2){return this._buildBg(w,h,a1,a2,false);},
  tplVariants(isRu){ return _themeTplFor('Caustics', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

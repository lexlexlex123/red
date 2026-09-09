/** 28 — Galaxy */
(function(){
window._THEME_28_GALAXY = {
name:'Галактика', nameEn:'Galaxy',
    desc:'Спираль звёзд, медленное вращение',descEn:'Spiral star disk, slow rotation',
    animated: true,
    renderer: 'galaxy',
    buildGalaxyCfg(w,h,a1,a2,isTitle,animated){
      return {w,h,a1,a2,isTitle,animated:animated!==false,particles:isTitle?1800:1100,cx:isTitle?0.52:0.54,cy:isTitle?0.48:0.50,maxR:isTitle?0.56:0.48,rotSpeed:isTitle?0.052:0.044,tilt:0.38,arms:4,twist:3.4,flat:0.28,depthScale:0.38,brightness:isTitle?1.85:1.65};
    },
    _buildBg(w,h,a1,a2,isTitle){
      const uid='gal'+Math.random().toString(36).slice(2,7);
      const f=n=>n.toFixed(0);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
        <defs><radialGradient id="${uid}g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff" stop-opacity="0.22"/><stop offset="35%" stop-color="${a1}" stop-opacity="0.12"/><stop offset="70%" stop-color="${a2}" stop-opacity="0.06"/><stop offset="100%" stop-opacity="0"/></radialGradient></defs>
        <circle cx="${f(w*(isTitle?0.52:0.54))}" cy="${f(h*(isTitle?0.48:0.50))}" r="${f(Math.min(w,h)*(isTitle?0.20:0.16))}" fill="url(#${uid}g)"/></svg>`;
    },
    titleSvg(w,h,a1,a2){return this._buildBg(w,h,a1,a2,true);},
    contentSvg(w,h,a1,a2){return this._buildBg(w,h,a1,a2,false);},
  tplVariants(isRu){ return _themeTplFor('Galaxy', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

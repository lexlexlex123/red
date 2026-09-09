/** 09 — Crystal */
(function(){
window._THEME_09_CRYSTAL = {
name:'Кристалл',nameEn:'Crystal',
    desc:'Прозрачный октаэдр, вращение как в Sims',descEn:'Transparent spinning octahedron gem',
    animated: true,
    renderer: 'crystal',

    buildCrystalCfg(w, h, a1, a2, isTitle, animated){
      const scale = isTitle ? h * 0.2 : h * 0.1;
      return { w, h, a1, a2, isTitle, animated: animated !== false, scale, spinDur: isTitle ? 12 : 10 };
    },

    _buildLightSvg(w, h, a1, a2, isTitle, doAnimate){
      const uid = 'cry' + Math.random().toString(36).slice(2, 7);
      if (isTitle){
        const lr = Math.max(w, h) * 0.62;
        const l0x = w * 1.06, l0y = -h * 0.06;
        const l1x = -w * 0.06, l1y = h * 1.04;
        const l2x = w * 1.06, l2y = h * 1.04;
        const l3x = -w * 0.06, l3y = -h * 0.06;
        const hopKt = '0;0.20;0.22;0.42;0.44;0.64;0.66;0.86;0.88;1';
        const hopLx = `${l0x};${l0x};${l1x};${l1x};${l2x};${l2x};${l3x};${l3x};${l0x};${l0x}`;
        const hopLy = `${l0y};${l0y};${l1y};${l1y};${l2y};${l2y};${l3y};${l3y};${l0y};${l0y}`;
        const pulse = doAnimate
          ? `<animate attributeName="opacity" values="0.32;0.58;0.32" dur="2.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"/>
             <animate attributeName="r" values="${lr.toFixed(1)};${(lr * 1.12).toFixed(1)};${lr.toFixed(1)}" dur="2.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"/>`
          : '';
        const hopAnim = doAnimate
          ? `<animate attributeName="cx" values="${hopLx}" keyTimes="${hopKt}" dur="18s" repeatCount="indefinite" calcMode="linear"/>
             <animate attributeName="cy" values="${hopLy}" keyTimes="${hopKt}" dur="18s" repeatCount="indefinite" calcMode="linear"/>`
          : '';
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
          <defs>
            <radialGradient id="${uid}corner" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="${a1}" stop-opacity="0.55"/>
              <stop offset="45%" stop-color="${a2}" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="${a2}" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="${l0x.toFixed(1)}" cy="${l0y.toFixed(1)}" r="${lr.toFixed(1)}" fill="url(#${uid}corner)" opacity="0.42">${hopAnim}${pulse}</circle>
        </svg>`;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
      <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.5"/>
        <polygon points="0,0 ${(w * .14).toFixed(1)},0 0,${(h * .28).toFixed(1)}" fill="${a1}" opacity="0.08"/>
      </svg>`;
    },

    titleSvg(w, h, a1, a2, doAnimate){ return this._buildLightSvg(w, h, a1, a2, true, doAnimate !== false); },
    contentSvg(w, h, a1, a2, doAnimate){ return this._buildLightSvg(w, h, a1, a2, false, doAnimate !== false); },
  tplVariants(isRu){ return _themeTplFor('Crystal', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

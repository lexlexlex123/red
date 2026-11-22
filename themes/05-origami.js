/** 05 — Origami */
(function(){
window._THEME_05_ORIGAMI = {
name:'Оригами',nameEn:'Origami',
    desc:'Грани сложенной бумаги, оригами',descEn:'Paper folds, origami geometry',
    // Tip inset from min(w,h) keeps fold angles stable on 9:16.
    titleSvg:(w,h,a1,a2)=>{
      const m=Math.min(w,h);
      const tipX=w-m*0.45, tipY=h*0.5;
      const midX=w-m*0.22;
      const rGlow=m*0.04, rCore=m*0.015;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="ff"><feGaussianBlur stdDeviation="10"/></filter></defs>
      <polygon points="${w},0 ${w},${h} ${tipX.toFixed(1)},${tipY.toFixed(1)}" fill="${a1}" opacity="0.14"/>
      <polygon points="${w},0 ${tipX.toFixed(1)},${tipY.toFixed(1)} ${midX.toFixed(1)},0" fill="${a2}" opacity="0.18"/>
      <polygon points="${w},${h} ${tipX.toFixed(1)},${tipY.toFixed(1)} ${midX.toFixed(1)},${h}" fill="${a1}" opacity="0.10"/>
      <polygon points="${tipX.toFixed(1)},${tipY.toFixed(1)} ${midX.toFixed(1)},0 ${midX.toFixed(1)},${h}" fill="${a2}" opacity="0.08"/>
      <line x1="${tipX.toFixed(1)}" y1="${tipY.toFixed(1)}" x2="${w}" y2="0" stroke="${a1}" stroke-width="1" opacity="0.3"/>
      <line x1="${tipX.toFixed(1)}" y1="${tipY.toFixed(1)}" x2="${w}" y2="${h}" stroke="${a1}" stroke-width="1" opacity="0.3"/>
      <line x1="${tipX.toFixed(1)}" y1="${tipY.toFixed(1)}" x2="${midX.toFixed(1)}" y2="0" stroke="${a2}" stroke-width="0.8" opacity="0.35"/>
      <line x1="${tipX.toFixed(1)}" y1="${tipY.toFixed(1)}" x2="${midX.toFixed(1)}" y2="${h}" stroke="${a2}" stroke-width="0.8" opacity="0.35"/>
      <circle cx="${tipX.toFixed(1)}" cy="${tipY.toFixed(1)}" r="${rGlow.toFixed(1)}" fill="${a1}" opacity="0.4" filter="url(#ff)"/>
      <circle cx="${tipX.toFixed(1)}" cy="${tipY.toFixed(1)}" r="${rCore.toFixed(1)}" fill="${a1}" opacity="0.9"/>
    </svg>`;
    },
    contentSvg:(w,h,a1,a2)=>{
      const m=Math.min(w,h);
      const tipX=w-m*0.28, tipY=h*0.5;
      const midX=w-m*0.15;
      const cDeep=m*0.18, cTall=m*0.35;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polygon points="${w},0 ${w},${h} ${tipX.toFixed(1)},${tipY.toFixed(1)}" fill="${a1}" opacity="0.12"/>
      <polygon points="${w},0 ${tipX.toFixed(1)},${tipY.toFixed(1)} ${midX.toFixed(1)},0" fill="${a2}" opacity="0.16"/>
      <polygon points="${w},${h} ${tipX.toFixed(1)},${tipY.toFixed(1)} ${midX.toFixed(1)},${h}" fill="${a1}" opacity="0.09"/>
      <line x1="${tipX.toFixed(1)}" y1="${tipY.toFixed(1)}" x2="${w}" y2="0" stroke="${a1}" stroke-width="0.8" opacity="0.28"/>
      <line x1="${tipX.toFixed(1)}" y1="${tipY.toFixed(1)}" x2="${w}" y2="${h}" stroke="${a1}" stroke-width="0.8" opacity="0.28"/>
      <polygon points="0,0 ${cDeep.toFixed(1)},0 0,${cTall.toFixed(1)}" fill="${a1}" opacity="0.1"/>
      <polygon points="0,${h} ${cDeep.toFixed(1)},${h} 0,${(h-cTall).toFixed(1)}" fill="${a2}" opacity="0.08"/>
    </svg>`;
    },
  tplVariants(isRu){ return _themeTplFor('Origami', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

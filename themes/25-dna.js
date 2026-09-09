/** 25 — DNA */
(function(){
window._THEME_25_DNA = {
name:'ДНК', nameEn:'DNA',
    desc:'Двойная спираль, молекулярные связи',descEn:'Double helix, molecular bonds',
    animated: true,
    renderer: 'dna',

    buildDnaCfg(w, h, a1, a2, isTitle, animated){
      const th = typeof _activeTheme === 'function' ? _activeTheme() : null;
      const dark = th ? th.dark !== false : true;
      return {
        w, h, a1, a2, isTitle, animated: animated !== false, dark,
        cx: isTitle ? w * 0.84 : w * 0.88,
        radius: isTitle ? w * 0.12 : w * 0.085,
        depth: isTitle ? w * 0.065 : w * 0.045,
        turns: isTitle ? 3.8 : 2.8,
        segments: isTitle ? 96 : 72,
        scrollSpeed: isTitle ? 30 : 24,
        rotSpeed: isTitle ? 0.38 : 0.30
      };
    },

    _buildBgSvg(w, h, a1, a2, isTitle, doAnimate){
      const uid = 'dn' + Math.random().toString(36).slice(2, 7);
      const sp = '0.42 0 0.58 1';
      const th = typeof _activeTheme === 'function' ? _activeTheme() : null;
      const dark = th ? th.dark !== false : true;
      const g1a = dark ? [0.28, 0.12, 0] : [0.14, 0.05, 0];
      const g2a = dark ? [0.22, 0.10, 0] : [0.11, 0.04, 0];
      const blobs = isTitle ? [
        {cx:w*.12, cy:h*.22, r:h*.18, g:'g1', dcx:w*.09, dcy:h*.12, dcx2:-w*.05, dcy2:h*.07, dr:.14, dur:9,  begin:0},
        {cx:w*.08, cy:h*.72, r:h*.14, g:'g2', dcx:w*.06, dcy:-h*.10, dcx2:-w*.07, dcy2:-h*.05, dr:.16, dur:11, begin:2.4},
        {cx:w*.22, cy:h*.48, r:h*.11, g:'g1', dcx:-w*.08, dcy:h*.09, dcx2:w*.04, dcy2:-h*.06, dr:.12, dur:13, begin:4.8},
        {cx:w*.04, cy:h*.42, r:h*.09, g:'g2', dcx:w*.05, dcy:h*.06, dcx2:-w*.03, dcy2:h*.08, dr:.11, dur:15, begin:1.2},
      ] : [
        {cx:w*.10, cy:h*.55, r:h*.12, g:'g1', dcx:w*.07, dcy:-h*.08, dcx2:-w*.04, dcy2:h*.05, dr:.13, dur:10, begin:0},
        {cx:w*.18, cy:h*.28, r:h*.09, g:'g2', dcx:-w*.06, dcy:h*.07, dcx2:w*.05, dcy2:-h*.04, dr:.12, dur:12, begin:3.1},
      ];
      let blobSvg = '';
      blobs.forEach((b) => {
        const cx0 = b.cx, cy0 = b.cy, r0 = b.r;
        const cx1 = b.cx + b.dcx, cy1 = b.cy + b.dcy;
        const cx2 = b.cx + b.dcx2, cy2 = b.cy + b.dcy2;
        const r1 = r0 * (1 + b.dr), r2 = r0 * (1 - b.dr * 0.55);
        const f = (n) => n.toFixed(1);
        const grad = `url(#${uid}${b.g})`;
        const blurAttr = doAnimate ? ` filter="url(#${uid}blur)"` : '';
        if (doAnimate) {
          const beg = b.begin.toFixed(1);
          const durCy = (b.dur * 1.19).toFixed(1);
          const durR = (b.dur * 0.88).toFixed(1);
          const durOp = (b.dur * 1.07).toFixed(1);
          blobSvg += `<circle cx="${f(cx0)}" cy="${f(cy0)}" r="${f(r0)}" fill="${grad}"${blurAttr} opacity="0.92">
            <animate attributeName="cx" values="${f(cx0)};${f(cx1)};${f(cx2)};${f(cx0)}" dur="${b.dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
            <animate attributeName="cy" values="${f(cy0)};${f(cy1)};${f(cy2)};${f(cy0)}" dur="${durCy}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
            <animate attributeName="r" values="${f(r0)};${f(r1)};${f(r2)};${f(r0)}" dur="${durR}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
            <animate attributeName="opacity" values="0.92;0.72;0.98;0.92" dur="${durOp}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines="${sp};${sp};${sp}"/>
          </circle>`;
        } else {
          // No feGaussianBlur — SVG filters dominate cost under WebGL DNA, especially fullscreen.
          blobSvg += `<circle cx="${f(cx0)}" cy="${f(cy0)}" r="${f(r0 * 1.35)}" fill="${grad}" opacity="0.7"/>`;
        }
      });
      const blurDev = isTitle ? 14 : 10;
      const filterDef = doAnimate
        ? `<filter id="${uid}blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${blurDev}"/></filter>`
        : '';
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
        <defs>
          ${filterDef}
          <radialGradient id="${uid}g1" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${a1}" stop-opacity="${g1a[0]}"/><stop offset="70%" stop-color="${a1}" stop-opacity="${g1a[1]}"/><stop offset="100%" stop-color="${a1}" stop-opacity="${g1a[2]}"/></radialGradient>
          <radialGradient id="${uid}g2" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${a2}" stop-opacity="${g2a[0]}"/><stop offset="70%" stop-color="${a2}" stop-opacity="${g2a[1]}"/><stop offset="100%" stop-color="${a2}" stop-opacity="${g2a[2]}"/></radialGradient>
        </defs>${blobSvg}</svg>`;
    },

    titleSvg(w, h, a1, a2, doAnimate){ return this._buildBgSvg(w, h, a1, a2, true, doAnimate !== false); },
    contentSvg(w, h, a1, a2, doAnimate){ return this._buildBgSvg(w, h, a1, a2, false, doAnimate !== false);},
  tplVariants(isRu){ return _themeTplFor('DNA', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

/** 01 — Prism */
(function(){
window._THEME_01_PRISM = {
name:'Призма',nameEn:'Prism',
    desc:'Острые грани, световые блики',descEn:'Sharp refracting light beams',
    animated: true,
    _layoutRev: 9,

    _peekStripe(x1, y1, x2, y2, cx, cy, color, doAnimate, begin, dur, fillOp){
      const peek = 0.34;
      const hx = ((cx - (x1 + x2) * 0.5) * peek).toFixed(1);
      const hy = ((cy - (y1 + y2) * 0.5) * peek).toFixed(1);
      const pts = (cx > 0 && cy === 0)
        ? `${x1.toFixed(1)},${y1.toFixed(1)} ${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`
        : `${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
      const fo = fillOp != null ? fillOp : 0.82;
      const shape = `<polygon points="${pts}" fill="${color}" fill-opacity="${fo}"/>`;
      if (!doAnimate) return `<g opacity="0.5">${shape}</g>`;
      const spl = '0.42 0 0.58 1;0.42 0 0.58 1';
      return `<g opacity="0">
        <g>${shape}
          <animateTransform attributeName="transform" type="translate"
            values="${hx},${hy};0,0;${hx},${hy}" keyTimes="0;0.48;1"
            dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="${spl}"/>
        </g>
        <animate attributeName="opacity" values="0;0.72;0" keyTimes="0;0.45;1"
          dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="${spl}"/>
      </g>`;
    },

    _cornerStripes(w, h, corner, specs, cx, cy, doAnimate, dur, cycleBegin){
      let out = '';
      const n = specs.length;
      const off = cycleBegin != null ? parseFloat(cycleBegin) : 0;
      specs.forEach((sp, i) => {
        const begin = (off + i * dur / n).toFixed(2);
        out += this._peekStripe(sp[0], sp[1], sp[2], sp[3], cx, cy, sp[4], doAnimate, begin, dur, sp[5]);
      });
      return out;
    },

    _build(w, h, a1, a2, isTitle, doAnimate, mirror){
      const uid = 'prm' + Math.random().toString(36).slice(2, 7);
      const dur = isTitle ? 8 : 6.4;
      const rng = s => { let x = Math.sin(s * 41.7 + 9.2) * 43758.5; return x - Math.floor(x); };
      const midBegin = (seed, d, lo, hi) => { const p = lo + rng(seed) * (hi - lo); return (-p * d).toFixed(2); };
      const cycleBegin = doAnimate ? midBegin(3.7, dur, 0.12, 0.88) : '0';
      let extra = '';
      const mir = !!mirror;

      const trTitle = [
        [w * .52, 0, w, h * .68, a1, 0.30],
        [w * .64, 0, w, h * .42, a2, 0.26],
        [w * .74, 0, w, h * .24, a1, 0.22],
        [w * .84, 0, w, h * .10, a2, 0.18],
      ];
      const trContent = [
        [w * .76, 0, w, h * .30, a1, 0.24],
        [w * .88, 0, w, h * .12, a2, 0.18],
      ];
      const blTitle = [
        [0, h * .66, w * .34, h, a1, 0.30],
        [0, h * .76, w * .20, h, a2, 0.26],
        [0, h * .86, w * .12, h, a1, 0.22],
        [0, h * .94, w * .06, h, a2, 0.18],
      ];
      const blContent = [
        [0, h * .82, w * .16, h, a1, 0.22],
        [0, h * .92, w * .08, h, a2, 0.16],
      ];
      const tlTitle = [
        [0, h * .68, w * .48, 0, a1, 0.30],
        [0, h * .42, w * .36, 0, a2, 0.26],
        [0, h * .24, w * .26, 0, a1, 0.22],
        [0, h * .10, w * .16, 0, a2, 0.18],
      ];
      const tlContent = [
        [0, h * .30, w * .24, 0, a1, 0.24],
        [0, h * .12, w * .12, 0, a2, 0.18],
      ];
      const brTitle = [
        [w * .66, h, w, h * .66, a1, 0.30],
        [w * .80, h, w, h * .76, a2, 0.26],
        [w * .88, h, w, h * .86, a1, 0.22],
        [w * .94, h, w, h * .94, a2, 0.18],
      ];
      const brContent = [
        [w * .84, h, w, h * .82, a1, 0.22],
        [w * .92, h, w, h * .92, a2, 0.16],
      ];

      if (isTitle){
        const gx = mir ? w * .18 : w * .82;
        extra = `<defs><filter id="${uid}pgf"><feGaussianBlur stdDeviation="16"/></filter></defs>
          <ellipse cx="${gx.toFixed(1)}" cy="${(h * .72).toFixed(1)}" rx="${(h * .28).toFixed(1)}" ry="${(h * .28).toFixed(1)}" fill="${a1}" opacity="0.04" filter="url(#${uid}pgf)"/>`;
      }

      let a, b;
      if (mir){
        a = this._cornerStripes(w, h, 'tl', isTitle ? tlTitle : tlContent, 0, 0, doAnimate, dur, cycleBegin);
        b = this._cornerStripes(w, h, 'br', isTitle ? brTitle : brContent, w, h, doAnimate, dur, cycleBegin);
      } else {
        a = this._cornerStripes(w, h, 'tr', isTitle ? trTitle : trContent, w, 0, doAnimate, dur, cycleBegin);
        b = this._cornerStripes(w, h, 'bl', isTitle ? blTitle : blContent, 0, h, doAnimate, dur, cycleBegin);
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${extra}${a}${b}</svg>`;
    },

    titleSvg(w, h, a1, a2, doAnimate, mirror){ return this._build(w, h, a1, a2, true, doAnimate !== false, !!mirror); },
    contentSvg(w, h, a1, a2, doAnimate, mirror){ return this._build(w, h, a1, a2, false, doAnimate !== false, !!mirror); },
  tplVariants(isRu){ return _themeTplFor('Prism', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

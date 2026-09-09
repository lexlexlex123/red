/** 15 — Desert */
(function(){
window._THEME_15_DESERT = {
name:'Пустыня', nameEn:'Desert',
    desc:'Барханы, верблюд и ветер', descEn:'Dunes, camel and desert wind',
    animated: true,

    _build(w, h, a1, a2, isTitle, doAnimate) {
      const uid = 'ds' + Math.random().toString(36).slice(2,8);
      const W = w, H = h;

      // ── Бесшовный тайл бархана ──────────────────────────────────────────────
      // Используем ЦЕЛОЕ число периодов синуса на тайл => y[0] == y[W] => шов невидим
      // nPeriods должно быть целым числом
      const makeDuneTile = (yTop, amp, nPeriods) => {
        const steps = 120;
        const pts = [];
        for (let i = 0; i <= steps; i++) {
          const xi = (i / steps) * W;
          const y  = yTop + amp * Math.sin((i / steps) * Math.PI * 2 * nPeriods);
          pts.push(`${xi.toFixed(1)},${y.toFixed(1)}`);
        }
        // Замыкаем вниз
        pts.push(`${W.toFixed(1)},${H}`);
        pts.push(`0,${H}`);
        return pts.join(' ');
      };

      // 3 уровня: дальний (медленно), средний, ближний (быстро)
      const p3 = makeDuneTile(H * 0.52, H * 0.055, 2);
      const p2 = makeDuneTile(H * 0.64, H * 0.048, 3);
      const p1 = makeDuneTile(H * 0.77, H * 0.038, 2);

      const sunX = W * 0.72, sunY = H * 0.38;

      const camelEl = '';





                  // ── Песчинки — рои, взлетающие с барханов ───────────────────────────────
      // Много частиц, появляются группами, взлетают вверх и исчезают
      const rng = s => { let x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
      let grains = '';
      const nG = 80;
      for (let i = 0; i < nG; i++) {
        // Случайная X-позиция старта (по всей ширине)
        const gx   = (rng(i * 7    ) * W).toFixed(1);
        // Y старта — на поверхности одного из барханов (между ~55% и 85%)
        const gyFrac = 0.55 + rng(i * 7 + 1) * 0.30;
        const gy   = (H * gyFrac).toFixed(1);
        const gr   = (rng(i * 7 + 2) * 2.2 + 0.5).toFixed(2);
        // Дрейф: вверх и немного вбок
        const driftX = ((rng(i * 7 + 3) - 0.4) * W * 0.12).toFixed(1);
        const riseY  = (-(H * (0.08 + rng(i * 7 + 4) * 0.18))).toFixed(1);
        const dur    = (1.5 + rng(i * 7 + 5) * 3.5).toFixed(2);
        // Начало — разброс по времени чтобы не все сразу
        const beg    = (rng(i * 7 + 6) * 8).toFixed(2);
        const op     = (0.15 + rng(i * 7 + 0.5) * 0.6).toFixed(2);

        if (doAnimate) {
          grains +=
            `<circle cx="${gx}" cy="${gy}" r="${gr}" fill="${a2}" opacity="0">` +
              // Появление -> полная видимость -> исчезновение вверху
              `<animate attributeName="opacity" ` +
                `values="0;${op};${op};0" ` +
                `keyTimes="0;0.1;0.7;1" ` +
                `dur="${dur}s" begin="${beg}s" repeatCount="indefinite"/>` +
              // Дрейф X
              `<animate attributeName="cx" ` +
                `values="${gx};${(+gx + +driftX).toFixed(1)}" ` +
                `dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines=".2 0 .8 1"/>` +
              // Взлёт Y
              `<animate attributeName="cy" ` +
                `values="${gy};${(+gy + +riseY).toFixed(1)}" ` +
                `dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines=".4 0 .6 1"/>` +
              // Радиус чуть уменьшается при подъёме
              `<animate attributeName="r" ` +
                `values="${gr};${(+gr * 0.3).toFixed(2)}" ` +
                `dur="${dur}s" begin="${beg}s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .7 1"/>` +
            `</circle>`;
        } else {
          grains += `<circle cx="${gx}" cy="${gy}" r="${gr}" fill="${a2}" opacity="${(+op * 0.4).toFixed(2)}"/>`;
        }
      }

      // ── Скролл барханов (параллакс) ─────────────────────────────────────────
      // Ближний dur=5s, средний dur=11s, дальний dur=20s — движение ВПРАВО
      // translate от 0 до -W (влево), визуально контент уходит влево, 
      // т.е. "пейзаж едет вправо под верблюдом"
      const scrollDune = (prof, fill, op, dur, sd) => {
        if (!doAnimate)
          return `<polygon points="${prof}" fill="${fill}" opacity="${op}"/>`;
        const anim =
          `<animateTransform attributeName="transform" type="translate" ` +
          `values="0,0; -${W},0" ` +
          `dur="${dur}s" begin="${sd}s" repeatCount="indefinite" calcMode="linear"/>`;
        const shift = (prof, ox) =>
          prof.split(' ').map(pt => {
            const [x, y] = pt.split(',');
            return `${(+x + ox).toFixed(1)},${y}`;
          }).join(' ');
        // 3 тайла: 0, W, 2W
        return `<g>${anim}` +
          `<polygon points="${shift(prof, 0)}"   fill="${fill}" opacity="${op}"/>` +
          `<polygon points="${shift(prof, W)}"   fill="${fill}" opacity="${op}"/>` +
          `<polygon points="${shift(prof, W*2)}" fill="${fill}" opacity="${op}"/>` +
          `</g>`;
      };

      const defs =
        `<defs>` +
          `<radialGradient id="${uid}sun" cx="${(sunX/W*100).toFixed(1)}%" cy="${(sunY/H*100).toFixed(1)}%" r="55%">` +
            `<stop offset="0%"   stop-color="${a2}" stop-opacity="0.65"/>` +
            `<stop offset="30%"  stop-color="${a2}" stop-opacity="0.25"/>` +
            `<stop offset="70%"  stop-color="${a1}" stop-opacity="0.07"/>` +
            `<stop offset="100%" stop-color="${a1}" stop-opacity="0"/>` +
          `</radialGradient>` +
          `<filter id="${uid}sf" x="-60%" y="-60%" width="220%" height="220%">` +
            `<feGaussianBlur stdDeviation="${(H*0.09).toFixed(0)}"/>` +
          `</filter>` +
        `</defs>`;

      const sunHalo =
        `<ellipse cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" ` +
        `rx="${(W*0.40).toFixed(1)}" ry="${(H*0.38).toFixed(1)}" ` +
        `fill="url(#${uid}sun)" filter="url(#${uid}sf)"/>`;

      // Порядок рендера: dune3, dune2, ВЕРБЛЮД (за dune2!), dune1, песчинки
      return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" overflow="hidden">` +
          defs +
          sunHalo +
          scrollDune(p3, a1, 0.30, 20, 0) +
          scrollDune(p2, a2, 0.55, 11, 0) +
          camelEl +
          scrollDune(p1, a1, 0.80, 5, 0) +
          grains +
        `</svg>`
      );
    },

    titleSvg(w,h,a1,a2,doAnimate){ return this._build(w,h,a1,a2,true, doAnimate!==false); },
    contentSvg(w,h,a1,a2,doAnimate){
      // Для контентных слайдов — пустыня ниже (сдвинута вниз на 15%)
      const H2 = h, W2 = w;
      const svg = this._build(W2, H2, a1, a2, false, doAnimate!==false);
      // Оборачиваем в группу со сдвигом вниз
      return svg.replace('<svg ', `<svg `).replace(
        /(<svg[^>]*>)/,
        `$1<g transform="translate(0,${(H2*0.15).toFixed(0)})">`
      ).replace('</svg>', '</g></svg>');
    },
  tplVariants(isRu){ return _themeTplFor('Desert', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

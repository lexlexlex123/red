/** 14 — Fire */
(function(){
window._THEME_14_FIRE = {
name:'Огонь', nameEn:'Fire',
    desc:'Живое пламя', descEn:'Living fire',
    animated: true,

    _fireSvg(w, h, a1, a2, doAnimate, yOffset, masterOp, staticSeed) {
      if(yOffset===undefined)yOffset=0;
      if(masterOp===undefined)masterOp=1.0;
      if(staticSeed===undefined)staticSeed=null;
      const uid = 'fx' + Math.random().toString(36).slice(2,9);
      const cx  = w * 0.5;

      // ── Одна органическая волна пламени ──────────────────────────────────
      function flamePath(seed, heightFactor) {
        const pts  = 14;
        const overshoot = w * 0.18;  // выход за края
        const step = (w + overshoot * 2) / pts;
        const peakY = h * (1 - heightFactor);
        const segs = [];
        for (let i = 0; i <= pts; i++) {
          const phase = (i / pts) * Math.PI * 2 + seed;
          const sway  = Math.sin(phase) * w * 0.09;  // шире волны
          const yVar  = Math.sin(phase * 2.1 + seed * 0.8) * h * 0.1;
          const edge  = 1 - Math.pow((i / pts - 0.5) * 2, 2) * 0.75;
          const y     = Math.max(peakY * 0.5, peakY + yVar + (1 - edge) * h * 0.32);
          segs.push({ x: -overshoot + i * step + sway, y });
        }
        let d = `M0,${h} `;
        segs.forEach((p, i) => {
          if (i === 0) {
            d += `L${p.x.toFixed(1)},${p.y.toFixed(1)} `;
          } else {
            const prev = segs[i - 1];
            const cpX  = (prev.x + p.x) / 2;
            const cpY  = (prev.y + p.y) / 2;
            d += `Q${cpX.toFixed(1)},${cpY.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)} `;
          }
        });
        return d + `L${w + overshoot},${h} L${-overshoot},${h} Z`;
      }

      function flameKF(seed, hf, n) {
        // Последний кадр = первому, чтобы анимация не прыгала при повторе
        const frames = Array.from({length: n}, (_, i) =>
          flamePath(seed + i * Math.PI * 2 / n, hf));
        frames.push(frames[0]);
        return frames.join(';');
      }

      // heightFactor 0.45 — пламя на нижней половине слайда
      // Статичный кадр: staticSeed=текущая фаза анимации, иначе кадр 8
      const _staticSeed = staticSeed !== null ? staticSeed : (8 * Math.PI * 2 / 12);
      const f1s  = doAnimate ? flamePath(0, 0.45) : flamePath(_staticSeed, 0.45);
      const f1kf = flameKF(0, 0.45, 12);

      // ── 32 искры-палочки, тлеющие при подъёме ───────────────────────────
      // Тление: opacity нарастает быстро, потом медленно угасает по мере подъёма
      // + уменьшение толщины (r) — искра "догорает"
      const NSPARKS = 32; // всегда 32, в статике рендерим без анимации
      const sparks = Array.from({length: NSPARKS}, (_, i) => {
        // Детерминированные псевдорандомные значения
        const r1 = (i * 137 + 31)  % 100 / 100;   // 0..1
        const r2 = (i * 251 + 71)  % 100 / 100;
        const r3 = (i * 97  + 13)  % 100 / 100;
        const r4 = (i * 179 + 53)  % 100 / 100;
        const r5 = (i * 313 + 89)  % 100 / 100;

        // Стартовая позиция — у основания в зоне пламени (центр ±40%)
        const sx   = w * (0.1 + r1 * 0.8);
        const sy   = h * (0.88 + r2 * 0.10);

        // Параметры полёта
        const dur  = (1.6 + r3 * 1.8).toFixed(2);        // 1.6–3.4s
        const beg  = (r4 * +dur).toFixed(2);              // случайный старт

        // Форма искры: тонкая палочка, разная толщина
        const thick = (1.2 + r5 * 3.2).toFixed(1);        // 1.2–4.4px
        const len   = Math.round(5 + r1 * 20);             // 5–25px

        // Траектория: вверх с дрейфом и изгибом
        const drift = (r2 * 80 - 40);                     // -40..+40px горизонтально
        const rise  = h * (0.55 + r3 * 0.35);             // насколько поднимается
        const wobX  = w * 0.06 * (i % 2 === 0 ? 1 : -1); // изгиб
        const mx    = sx + drift * 0.45 + wobX;           // mid control point x
        const my    = sy - rise * 0.55;
        const ex    = sx + drift;
        const ey    = sy - rise;

        // Вращение при подъёме
        const rot0  = Math.round(-20 - r4 * 60);          // -20...-80°
        const rotD  = Math.round(25 + r5 * 55);           // доп. поворот

        // Цвет: горячий центр a2, края a1
        const col = r1 > 0.65 ? a2 : a1;

        // Тление opacity: 0 → яркая вспышка → медленно догорает → 0
        // keyTimes: 0, появление(0.08), пик(0.20), тление(0.70), угасание(1)
        const opPeak = (0.7 + r2 * 0.28).toFixed(2);

        // В статике: позиция на 65% подъёма (≈кадр 8), прозрачность тления
        const t65 = 0.65; // позиция вдоль траектории при кадре 8
        const staticX = (sx + (mx - sx) * t65 * 2 > ex ? ex : sx + (mx - sx) * t65).toFixed(1);
        // квадратичная интерполяция Q sx,sy mx,my ex,ey при t=0.65
        const qt = t65;
        const qx = ((1-qt)*(1-qt)*sx + 2*(1-qt)*qt*mx + qt*qt*ex).toFixed(1);
        const qy = ((1-qt)*(1-qt)*sy + 2*(1-qt)*qt*my + qt*qt*ey).toFixed(1);
        const staticOp = (opPeak * 0.22).toFixed(2); // тлеющая прозрачность
        const staticW = (thick * 0.55).toFixed(1);
        const staticH = Math.round(len * 0.5);
        const staticRot = rot0 + rotD;

        if(!doAnimate){
          // Только если искра "видима" на этом кадре (не все 32 — берём каждую вторую)
          if(i % 2 !== 0) return '';
          return `<g transform="translate(${qx},${qy}) rotate(${staticRot})">
            <rect x="${(-staticW/2).toFixed(1)}" y="${-staticH}" width="${staticW}" height="${staticH}"
              rx="${(staticW/2).toFixed(1)}" fill="${col}" opacity="${staticOp}"/>
          </g>`;
        }

        return `<g>
          <rect x="${(-thick/2).toFixed(1)}" y="${-len}" width="${thick}" height="${len}"
            rx="${(thick/2).toFixed(1)}" fill="${col}" opacity="0"
            stroke="${col}" stroke-width="0.5" stroke-opacity="0.5">
            <animate attributeName="opacity" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.08;0.22;0.65;1"
              keySplines="0.1 0 0.3 1;0.2 0 0.5 1;0.4 0 0.7 1;0.7 0 1 1"
              values="0;${opPeak};${(opPeak*0.75).toFixed(2)};${(opPeak*0.18).toFixed(2)};0"/>
            <animate attributeName="height" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"
              calcMode="spline" keySplines="0.3 0 0.7 1;0.5 0 0.9 1" keyTimes="0;0.5;1"
              values="${len};${Math.round(len*0.7)};${Math.round(len*0.25)}"/>
            <animate attributeName="width" dur="${dur}s" begin="${beg}s" repeatCount="indefinite"
              calcMode="spline" keySplines="0.4 0 0.8 1" keyTimes="0;1"
              values="${thick};${(thick*0.3).toFixed(1)}"/>
          </rect>
          <animateMotion dur="${dur}s" begin="${beg}s" repeatCount="indefinite"
            calcMode="spline" keySplines="0.3 0.8 0.6 1;0.4 0 0.8 0.6" keyTimes="0;0.5;1"
            path="M${sx.toFixed(1)},${sy.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}"/>
          <animateTransform attributeName="transform" type="rotate" additive="sum"
            dur="${dur}s" begin="${beg}s" repeatCount="indefinite"
            calcMode="spline" keySplines="0.25 0 0.75 1;0.25 0 0.75 1" keyTimes="0;0.5;1"
            values="${rot0};${rot0 + rotD};${rot0 + rotD * 2}"/>
        </g>`;
      }).filter(Boolean).join('\n  ');

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
  <defs>
    <radialGradient id="${uid}gl" cx="50%" cy="100%" r="60%">
      <stop offset="0%"   stop-color="${a2}" stop-opacity="1"/>
      <stop offset="35%"  stop-color="${a1}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${a1}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${uid}fg" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%"   stop-color="${a2}" stop-opacity="1"/>
      <stop offset="28%"  stop-color="${a1}" stop-opacity="0.85"/>
      <stop offset="70%"  stop-color="${a1}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${a1}" stop-opacity="0"/>
    </linearGradient>
    <!-- Сильный blur для пламени -->
    <filter id="${uid}fb" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="45"/>
    </filter>
    <!-- Средний blur для свечения -->
    <filter id="${uid}gb" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="36"/>
    </filter>
  </defs>

  <g transform="translate(0,${yOffset})" opacity="${masterOp}">
  <!-- Пульсирующее свечение у основания (сильный blur) -->
  <ellipse cx="${cx}" cy="${h}" rx="${w * 0.42}" ry="${h * 0.22}"
    fill="url(#${uid}gl)" filter="url(#${uid}gb)">
    ${doAnimate ? (
      '<animate attributeName="ry" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" values="'+h*0.22+';'+h*0.38+';'+h*0.22+'"/>'+
      '<animate attributeName="rx" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" values="'+w*0.42+';'+w*0.62+';'+w*0.42+'"/>'+
      '<animate attributeName="opacity" dur="1.7s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" values="0.9;0.42;0.9"/>'
    ) : ''}
  </ellipse>

  <!-- Одна волна пламени с сильным размытием -->
  <path d="${f1s}" fill="url(#${uid}fg)" filter="url(#${uid}fb)">
    ${doAnimate ? '<animate attributeName="d" dur="5.5s" repeatCount="indefinite" calcMode="linear" values="'+f1kf+'"/>' : ''}
  </path>

  <!-- Искры-палочки, тлеющие при подъёме -->
  ${sparks}
  </g>
</svg>`;
    },

    titleSvg(w, h, a1, a2, doAnimate, _u1, _u2, staticSeed)   { return this._fireSvg(w, h, a1, a2, doAnimate !== false, 100,  1.0,  staticSeed); },
    contentSvg(w, h, a1, a2, doAnimate, _u1, _u2, staticSeed) { return this._fireSvg(w, h, a1, a2, doAnimate !== false, 260, 0.55, staticSeed); },
  tplVariants(isRu){ return _themeTplFor('Fire', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

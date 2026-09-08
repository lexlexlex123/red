/** 16 — Matrix */
(function(){
window._THEME_16_MATRIX = {
name:'Матрица',nameEn:'Matrix',
    desc:'Цифровой дождь, символы кода',descEn:'Digital rain, falling code symbols',
    animated: true,

    _build:(w,h,a1,a2,isTitle,doAnimate)=>{
      const uid='mx'+Math.random().toString(36).slice(2,7);
      const rng=(s)=>{ let x=Math.sin(s*127.1+311.7)*43758.5; return x-Math.floor(x); };

      const CHARS='アイウエオカキクケコサシスセソタチツテト01ナニヌネノ10ハヒフヘホ';
      const nCols  = isTitle ? 36 : 26;
      const colW   = w / nCols;
      const fs     = (colW * 0.75).toFixed(1);
      const lineH  = +fs * 1.48;
      const charsPerCol = Math.ceil((h + 200) / lineH) + 2;
      const baseOp = isTitle ? 1.0 : 0.2;

      // Угловые рамки
      const cs = 14;
      const cornerSvg = [
        `M 0,${cs} L 0,0 L ${cs},0`,
        `M ${w-cs},0 L ${w},0 L ${w},${cs}`,
        `M ${w},${h-cs} L ${w},${h} L ${w-cs},${h}`,
        `M ${cs},${h} L 0,${h} L 0,${h-cs}`,
      ].map(d=>`<path d="${d}" fill="none" stroke="${a1}" stroke-width="1.2" opacity="${isTitle?0.5:0.25}" stroke-linecap="square"/>`).join('');

      // Фильтры свечения
      const defs=`<defs>
        <filter id="${uid}gh" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="${uid}gb" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id="${uid}cp"><rect width="${w}" height="${h}"/></clipPath>
      </defs>`;

      let cols = '';

      for(let c=0;c<nCols;c++){
        const x        = (colW*(c+0.5)).toFixed(1);
        const dur      = (rng(c*3+0.1)*7+4).toFixed(1);
        const delay    = (-rng(c*3+0.7)*10).toFixed(2);
        const tailLen  = Math.round(rng(c*3+1.3)*9+5);
        const isBright = (c % 6 === 1);
        const colColor = isBright ? a2 : a1;
        const colOp    = ((rng(c*3+2.1)*0.3+0.55)*baseOp).toFixed(2);

        if(doAnimate){
          const totalH = (charsPerCol * lineH).toFixed(0);
          const startY = (-charsPerCol * lineH).toFixed(0);

          // Строим символы колонки — каждый на своей позиции Y, фиксированный
          let bodyChars = '';
          let glowChars = '';

          for(let ri=0;ri<charsPerCol;ri++){
            const cy       = (ri * lineH + lineH).toFixed(1);
            const ch       = CHARS[Math.floor(rng(c*31+ri*17)*CHARS.length)];
            const isHead   = ri === tailLen - 1;
            const isNeck   = ri >= tailLen - 3 && !isHead;
            const charOp   = isHead ? 1.0
                           : isNeck ? (0.55 + (tailLen-1-ri)*0.12)
                           : Math.max(0.05, (tailLen-ri)/(tailLen*1.6));
            const color    = isHead ? '#ffffff' : colColor;
            const t = `<text x="${x}" y="${cy}" text-anchor="middle" fill="${color}" opacity="${charOp.toFixed(2)}">${ch}</text>`;
            if(isHead || (isBright && isNeck)) glowChars += t;
            else bodyChars += t;
          }

          cols += `<g opacity="${colOp}" font-size="${fs}" font-family="'Courier New',monospace">
            <g>
              <animateTransform attributeName="transform" type="translate"
                values="0,${startY};0,${(h+lineH*2).toFixed(0)}"
                dur="${dur}s" begin="${delay}s" repeatCount="indefinite" calcMode="linear"/>
              <g filter="url(#${uid}gb)">${bodyChars}</g>
              <g filter="url(#${uid}gh)">${glowChars}</g>
            </g>
          </g>`;

        } else {
          // Статика
          const startY = h*0.15 + rng(c*5)*h*0.55;
          let staticChars = '';
          for(let ri=0;ri<tailLen;ri++){
            const cy = (startY + ri*lineH).toFixed(1);
            if(+cy < 0 || +cy > h+10) continue;
            const isHead = ri === tailLen-1;
            const charOp = (isHead ? 0.95 : Math.max(0.06,(tailLen-ri)/(tailLen*1.5))).toFixed(2);
            const ch = CHARS[Math.floor(rng(c*31+ri*17)*CHARS.length)];
            staticChars += `<text x="${x}" y="${cy}" text-anchor="middle" fill="${isHead?'#ffffff':colColor}" opacity="${charOp}">${ch}</text>`;
          }
          const flt = isBright ? `filter="url(#${uid}gb)"` : '';
          cols += `<g opacity="${colOp}" font-size="${fs}" font-family="'Courier New',monospace" ${flt}>${staticChars}</g>`;
        }
      }

      // 01 в правом нижнем углу
      const bigChar = isTitle
        ? `<text x="${(w*0.88).toFixed(0)}" y="${(h*0.96).toFixed(0)}"
            font-size="${(w*0.22).toFixed(0)}" font-family="'Courier New',monospace"
            fill="${a1}" opacity="0.05" text-anchor="middle">01</text>`
        : '';

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${defs}
        <g clip-path="url(#${uid}cp)">
          ${bigChar}${cols}${cornerSvg}
        </g>
      </svg>`;
    },

    titleSvg(w,h,a1,a2,doAnimate){ return this._build(w,h,a1,a2,true,doAnimate!==false); },
    contentSvg(w,h,a1,a2,doAnimate){ return this._build(w,h,a1,a2,false,doAnimate!==false); },
  tplVariants(isRu){ return _themeTplFor('Matrix', isRu); },
  modalPreview(w,h,a1,a2){ return typeof this.titleSvg==='function'?this.titleSvg(w,h,a1,a2,false):''; }
};
})();

// ══════════════ LAYOUT DECOR ══════════════
let selLayout=-1;

const LAYOUTS=[

  // ── 1. PRISM ── острый свет, преломление
  {
    name:'Призма',nameEn:'Prism',
    desc:'Острые грани, световые блики',descEn:'Sharp refracting light beams',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="pg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${a1}" stop-opacity="0.35"/>
          <stop offset="1" stop-color="${a2}" stop-opacity="0"/>
        </linearGradient>
        <filter id="pgf"><feGaussianBlur stdDeviation="16"/></filter>
      </defs>
      <polygon points="${w*.55},0 ${w},0 ${w},${h*.65}" fill="url(#pg1)"/>
      <polygon points="${w*.68},0 ${w},0 ${w},${h*.38}" fill="${a2}" opacity="0.18"/>
      <polygon points="${w*.78},0 ${w},0 ${w},${h*.18}" fill="${a1}" opacity="0.25"/>
      <line x1="${w*.55}" y1="0" x2="${w}" y2="${h*.65}" stroke="${a1}" stroke-width="1" opacity="0.4"/>
      <line x1="${w*.68}" y1="0" x2="${w}" y2="${h*.38}" stroke="${a2}" stroke-width="0.8" opacity="0.5"/>
      <line x1="${w*.78}" y1="0" x2="${w}" y2="${h*.18}" stroke="${a1}" stroke-width="0.6" opacity="0.6"/>
      <ellipse cx="${w*.82}" cy="${h*.72}" rx="${h*.28}" ry="${h*.28}" fill="${a1}" opacity="0.04" filter="url(#pgf)"/>
      <polygon points="0,${h} ${w*.32},${h} 0,${h*.62}" fill="${a1}" opacity="0.08"/>
      <polygon points="0,${h} ${w*.18},${h} 0,${h*.78}" fill="${a2}" opacity="0.06"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="pcg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${a1}" stop-opacity="0.55"/>
          <stop offset="1" stop-color="${a2}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${w},0 ${w},${h*.5} ${w*.65},0" fill="${a1}" opacity="0.12"/>
      <polygon points="${w},0 ${w},${h*.28}" fill="${a2}" opacity="0.22"/>
      <rect x="0" y="0" width="${w}" height="3" fill="url(#pcg)"/>
      <rect x="0" y="${h-3}" width="${w*.5}" height="3" fill="url(#pcg)"/>
      <polygon points="0,${h} ${w*.22},${h} 0,${h*.72}" fill="${a1}" opacity="0.07"/>
    </svg>`,
  },

  // ── 2. AURORA ── северное сияние, плавные цветные полосы
  {
    name:'Аврора',nameEn:'Aurora',
    desc:'Плавные цветные ленты, северное сияние',descEn:'Flowing colour bands, aurora borealis',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <filter id="af"><feGaussianBlur stdDeviation="28"/></filter>
        <filter id="af2"><feGaussianBlur stdDeviation="18"/></filter>
      </defs>
      <ellipse cx="${w*.1}" cy="${h*.3}" rx="${w*.7}" ry="${h*.18}" fill="${a1}" opacity="0.22" transform="rotate(-12,${w*.1},${h*.3})" filter="url(#af)"/>
      <ellipse cx="${w*.2}" cy="${h*.55}" rx="${w*.65}" ry="${h*.14}" fill="${a2}" opacity="0.18" transform="rotate(-8,${w*.2},${h*.55})" filter="url(#af)"/>
      <ellipse cx="${w*.05}" cy="${h*.12}" rx="${w*.55}" ry="${h*.1}" fill="${a1}" opacity="0.28" transform="rotate(-6,${w*.05},${h*.12})" filter="url(#af2)"/>
      <path d="M-${w*.1},${h*.2} Q${w*.3},${h*.05} ${w*.7},${h*.22} Q${w*1.1},${h*.38} ${w*1.2},${h*.18}" fill="none" stroke="${a1}" stroke-width="${h*.06}" stroke-linecap="round" opacity="0.12" filter="url(#af2)"/>
      <path d="M-${w*.1},${h*.42} Q${w*.25},${h*.28} ${w*.65},${h*.44} Q${w},${h*.58} ${w*1.1},${h*.38}" fill="none" stroke="${a2}" stroke-width="${h*.05}" stroke-linecap="round" opacity="0.10" filter="url(#af2)"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="acf"><feGaussianBlur stdDeviation="20"/></filter></defs>
      <ellipse cx="${w*.5}" cy="-${h*.1}" rx="${w*.6}" ry="${h*.35}" fill="${a1}" opacity="0.18" filter="url(#acf)"/>
      <ellipse cx="${w*.7}" cy="-${h*.05}" rx="${w*.45}" ry="${h*.28}" fill="${a2}" opacity="0.14" filter="url(#acf)"/>
      <ellipse cx="${w*.5}" cy="${h*1.1}" rx="${w*.55}" ry="${h*.3}" fill="${a1}" opacity="0.12" filter="url(#acf)"/>
    </svg>`,
  },

  // ── 3. GRID BURST ── сетка с радиальным взрывом из центра
  {
    name:'Взрыв',nameEn:'Grid Burst',
    desc:'Радиальные лучи из точки, энергия',descEn:'Radial rays from focal point',
    titleSvg:(w,h,a1,a2)=>{
      const cx=w*.78,cy=h*.28;
      let rays='';
      for(let i=0;i<18;i++){
        const ang=(i/18)*Math.PI*2;
        const len=Math.max(w,h)*1.2;
        const op=(0.03+0.06*(i%3===0?1:0.5)).toFixed(3);
        const x2=(cx+Math.cos(ang)*len).toFixed(1);
        const y2=(cy+Math.sin(ang)*len).toFixed(1);
        rays+=`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x2}" y2="${y2}" stroke="${i%2?a2:a1}" stroke-width="${i%3===0?1.2:0.6}" opacity="${op}"/>`;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs><filter id="rbf"><feGaussianBlur stdDeviation="20"/></filter></defs>
        ${rays}
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.3}" fill="${a1}" opacity="0.06" filter="url(#rbf)"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.14}" fill="${a1}" opacity="0.08"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.06}" fill="${a1}" opacity="0.22"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.02}" fill="${a1}" opacity="0.8"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.22}" fill="none" stroke="${a1}" stroke-width="1" opacity="0.2"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.32}" fill="none" stroke="${a2}" stroke-width="0.8" opacity="0.12"/>
      </svg>`;
    },
    contentSvg:(w,h,a1,a2)=>{
      const cx=w*.88,cy=h*.5;
      let rays='';
      for(let i=0;i<12;i++){
        const ang=(i/12)*Math.PI*2;
        const len=Math.max(w,h);
        rays+=`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx+Math.cos(ang)*len).toFixed(1)}" y2="${(cy+Math.sin(ang)*len).toFixed(1)}" stroke="${i%2?a2:a1}" stroke-width="0.7" opacity="${(0.04+0.04*(i%3===0?1:0)).toFixed(2)}"/>`;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs><filter id="rcf"><feGaussianBlur stdDeviation="14"/></filter></defs>
        ${rays}
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.35}" fill="${a1}" opacity="0.05" filter="url(#rcf)"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.18}" fill="${a1}" opacity="0.07"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.06}" fill="${a1}" opacity="0.25"/>
        <rect x="0" y="0" width="4" height="${h}" fill="${a1}" opacity="0.45"/>
        <rect x="7" y="${h*.08}" width="1.5" height="${h*.84}" fill="${a2}" opacity="0.22"/>
      </svg>`;
    },
  },

  // ── 4. CIRCUIT ── плата, дорожки, узлы
  {
    name:'Схема',nameEn:'Circuit',
    desc:'Печатная плата, технологичность',descEn:'PCB traces, tech hardware',
    titleSvg:(w,h,a1,a2)=>{
      const nodes=[[.52,.15],[.65,.35],[.72,.18],[.82,.42],[.58,.55],[.88,.25],[.78,.62],[.92,.48],[.62,.72],[.75,.82]];
      let lines='',dots='';
      const pairs=[[0,1],[1,2],[1,3],[2,5],[3,4],[3,6],[5,7],[6,9],[4,8],[7,3]];
      pairs.forEach(([a,b])=>{
        const ax=(w*nodes[a][0]).toFixed(1),ay=(h*nodes[a][1]).toFixed(1);
        const bx=(w*nodes[b][0]).toFixed(1),by=(h*nodes[b][1]).toFixed(1);
        const mx=(w*nodes[a][0]).toFixed(1);
        lines+=`<polyline points="${ax},${ay} ${mx},${by} ${bx},${by}" fill="none" stroke="${a1}" stroke-width="1" opacity="0.18"/>`;
      });
      nodes.forEach(([px,py],i)=>{
        const r=i<3?3.5:2;
        dots+=`<circle cx="${(w*px).toFixed(1)}" cy="${(h*py).toFixed(1)}" r="${r}" fill="${i<3?a1:a2}" opacity="${i<3?0.55:0.35}"/>`;
        if(i<3)dots+=`<circle cx="${(w*px).toFixed(1)}" cy="${(h*py).toFixed(1)}" r="${r*2.5}" fill="${a1}" opacity="0.08"/>`;
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs><filter id="cf"><feGaussianBlur stdDeviation="12"/></filter></defs>
        ${lines}${dots}
        <rect x="${w*.48}" y="0" width="${w*.52}" height="${h}" fill="${a1}" opacity="0.025"/>
        <rect x="0" y="0" width="${w*.06}" height="${h}" fill="${a1}" opacity="0.04"/>
      </svg>`;
    },
    contentSvg:(w,h,a1,a2)=>{
      const nodes=[[.72,.12],[.82,.32],[.88,.18],[.94,.45],[.78,.55],[.68,.35],[.92,.65]];
      let lines='',dots='';
      [[0,1],[1,2],[1,3],[0,5],[3,4],[3,6]].forEach(([a,b])=>{
        const ax=(w*nodes[a][0]).toFixed(1),ay=(h*nodes[a][1]).toFixed(1);
        const bx=(w*nodes[b][0]).toFixed(1),by=(h*nodes[b][1]).toFixed(1);
        lines+=`<polyline points="${ax},${ay} ${ax},${by} ${bx},${by}" fill="none" stroke="${a1}" stroke-width="0.9" opacity="0.2"/>`;
      });
      nodes.forEach(([px,py])=>{
        dots+=`<circle cx="${(w*px).toFixed(1)}" cy="${(h*py).toFixed(1)}" r="2.5" fill="${a1}" opacity="0.4"/>`;
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${lines}${dots}
        <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.5"/>
        <rect x="0" y="0" width="${w}" height="3" fill="${a1}" opacity="0.12"/>
      </svg>`;
    },
  },

  // ── 5. FOLD ── сложенная бумага, оригами
  {
    name:'Оригами',nameEn:'Origami',
    desc:'Грани сложенной бумаги, оригами',descEn:'Paper folds, origami geometry',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="ff"><feGaussianBlur stdDeviation="10"/></filter></defs>
      <polygon points="${w},0 ${w},${h} ${w*.55},${h*.5}" fill="${a1}" opacity="0.14"/>
      <polygon points="${w},0 ${w*.55},${h*.5} ${w*.78},0" fill="${a2}" opacity="0.18"/>
      <polygon points="${w},${h} ${w*.55},${h*.5} ${w*.78},${h}" fill="${a1}" opacity="0.10"/>
      <polygon points="${w*.55},${h*.5} ${w*.78},0 ${w*.78},${h}" fill="${a2}" opacity="0.08"/>
      <line x1="${w*.55}" y1="${h*.5}" x2="${w}" y2="0" stroke="${a1}" stroke-width="1" opacity="0.3"/>
      <line x1="${w*.55}" y1="${h*.5}" x2="${w}" y2="${h}" stroke="${a1}" stroke-width="1" opacity="0.3"/>
      <line x1="${w*.55}" y1="${h*.5}" x2="${w*.78}" y2="0" stroke="${a2}" stroke-width="0.8" opacity="0.35"/>
      <line x1="${w*.55}" y1="${h*.5}" x2="${w*.78}" y2="${h}" stroke="${a2}" stroke-width="0.8" opacity="0.35"/>
      <circle cx="${w*.55}" cy="${h*.5}" r="${h*.04}" fill="${a1}" opacity="0.4" filter="url(#ff)"/>
      <circle cx="${w*.55}" cy="${h*.5}" r="${h*.015}" fill="${a1}" opacity="0.9"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polygon points="${w},0 ${w},${h} ${w*.72},${h*.5}" fill="${a1}" opacity="0.12"/>
      <polygon points="${w},0 ${w*.72},${h*.5} ${w*.85},0" fill="${a2}" opacity="0.16"/>
      <polygon points="${w},${h} ${w*.72},${h*.5} ${w*.85},${h}" fill="${a1}" opacity="0.09"/>
      <line x1="${w*.72}" y1="${h*.5}" x2="${w}" y2="0" stroke="${a1}" stroke-width="0.8" opacity="0.28"/>
      <line x1="${w*.72}" y1="${h*.5}" x2="${w}" y2="${h}" stroke="${a1}" stroke-width="0.8" opacity="0.28"/>
      <polygon points="0,0 ${w*.18},0 0,${h*.35}" fill="${a1}" opacity="0.1"/>
      <polygon points="0,${h} ${w*.18},${h} 0,${h*.65}" fill="${a2}" opacity="0.08"/>
    </svg>`,
  },

  // ── 6. HALO ── концентрические кольца, свет вокруг объекта
  {
    name:'Ореол',nameEn:'Halo',
    desc:'Концентрические кольца, свечение',descEn:'Concentric rings, radiant glow',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="hf"><feGaussianBlur stdDeviation="24"/></filter></defs>
      <circle cx="${w*.75}" cy="${h*.45}" r="${h*.55}" fill="${a1}" opacity="0.06" filter="url(#hf)"/>
      <circle cx="${w*.75}" cy="${h*.45}" r="${h*.45}" fill="none" stroke="${a1}" stroke-width="1" opacity="0.18"/>
      <circle cx="${w*.75}" cy="${h*.45}" r="${h*.35}" fill="none" stroke="${a2}" stroke-width="1" opacity="0.14"/>
      <circle cx="${w*.75}" cy="${h*.45}" r="${h*.25}" fill="none" stroke="${a1}" stroke-width="1.2" opacity="0.18"/>
      <circle cx="${w*.75}" cy="${h*.45}" r="${h*.15}" fill="none" stroke="${a2}" stroke-width="1.5" opacity="0.22"/>
      <circle cx="${w*.75}" cy="${h*.45}" r="${h*.07}" fill="${a1}" opacity="0.3"/>
      <circle cx="${w*.75}" cy="${h*.45}" r="${h*.03}" fill="${a1}" opacity="0.7"/>
      <circle cx="${w*.75}" cy="${h*.45}" r="${h*.55}" fill="${a2}" opacity="0.04" filter="url(#hf)"/>
      <line x1="0" y1="${h*.38}" x2="${w*.3}" y2="${h*.45}" stroke="${a1}" stroke-width="1" opacity="0.1" stroke-dasharray="3 6"/>
      <line x1="0" y1="${h*.52}" x2="${w*.28}" y2="${h*.45}" stroke="${a2}" stroke-width="1" opacity="0.1" stroke-dasharray="3 6"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="hcf"><feGaussianBlur stdDeviation="18"/></filter></defs>
      <circle cx="${w*.88}" cy="${h*.5}" r="${h*.55}" fill="${a1}" opacity="0.05" filter="url(#hcf)"/>
      <circle cx="${w*.88}" cy="${h*.5}" r="${h*.42}" fill="none" stroke="${a1}" stroke-width="1" opacity="0.14"/>
      <circle cx="${w*.88}" cy="${h*.5}" r="${h*.30}" fill="none" stroke="${a2}" stroke-width="0.8" opacity="0.11"/>
      <circle cx="${w*.88}" cy="${h*.5}" r="${h*.18}" fill="none" stroke="${a1}" stroke-width="1" opacity="0.14"/>
      <circle cx="${w*.88}" cy="${h*.5}" r="${h*.06}" fill="${a1}" opacity="0.3"/>
      <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.5"/>
    </svg>`,
  },

  // ── 7. ARCH ── арочные своды, архитектура
  {
    name:'Аркада',nameEn:'Arcade',
    desc:'Арки, архитектурная торжественность',descEn:'Arches, architectural grandeur',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="arf"><feGaussianBlur stdDeviation="20"/></filter></defs>
      <path d="M${w*.62},${h} L${w*.62},${h*.55} A${w*.19},${h*.45} 0 0,1 ${w},${h*.55} L${w},${h} Z" fill="${a1}" opacity="0.14"/>
      <path d="M${w*.62},${h} L${w*.62},${h*.55} A${w*.19},${h*.45} 0 0,1 ${w},${h*.55} L${w},${h} Z" fill="none" stroke="${a1}" stroke-width="1.2" opacity="0.35"/>
      <path d="M${w*.72},${h} L${w*.72},${h*.62} A${w*.14},${h*.38} 0 0,1 ${w},${h*.62} L${w},${h} Z" fill="${a2}" opacity="0.10"/>
      <path d="M${w*.72},${h} L${w*.72},${h*.62} A${w*.14},${h*.38} 0 0,1 ${w},${h*.62} L${w},${h} Z" fill="none" stroke="${a2}" stroke-width="0.8" opacity="0.25"/>
      <ellipse cx="${w*.81}" cy="${h*.55}" rx="${w*.2}" ry="${h*.45}" fill="${a1}" opacity="0.04" filter="url(#arf)"/>
      <line x1="${w*.05}" y1="${h*.82}" x2="${w*.55}" y2="${h*.82}" stroke="${a1}" stroke-width="2" opacity="0.35"/>
      <line x1="${w*.05}" y1="${h*.88}" x2="${w*.38}" y2="${h*.88}" stroke="${a2}" stroke-width="1.5" opacity="0.25"/>
      <line x1="${w*.05}" y1="${h*.94}" x2="${w*.26}" y2="${h*.94}" stroke="${a1}" stroke-width="1" opacity="0.15"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <path d="M${w*.7},${h} L${w*.7},${h*.4} A${w*.15},${h*.55} 0 0,1 ${w},${h*.4} L${w},${h} Z" fill="${a1}" opacity="0.12"/>
      <path d="M${w*.7},${h} L${w*.7},${h*.4} A${w*.15},${h*.55} 0 0,1 ${w},${h*.4} L${w},${h} Z" fill="none" stroke="${a1}" stroke-width="1" opacity="0.3"/>
      <path d="M${w*.8},${h} L${w*.8},${h*.5} A${w*.1},${h*.45} 0 0,1 ${w},${h*.5} L${w},${h} Z" fill="${a2}" opacity="0.08"/>
      <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.5"/>
      <rect x="0" y="0" width="${w}" height="4" fill="${a1}" opacity="0.14"/>
    </svg>`,
  },

  // ── 8. DUSK ── закат, горизонт, солнце
  {
    name:'Закат',nameEn:'Dusk',
    desc:'Горизонт, рассвет, атмосферный свет',descEn:'Horizon, sunrise atmospheric depth',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <radialGradient id="dg1" cx="${w*.82}" cy="${h*.62}" r="${h*.6}" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${a1}" stop-opacity="0.35"/>
          <stop offset="1" stop-color="${a1}" stop-opacity="0"/>
        </radialGradient>
        <filter id="df"><feGaussianBlur stdDeviation="22"/></filter>
      </defs>
      <ellipse cx="${w*.82}" cy="${h*.62}" rx="${h*.6}" ry="${h*.6}" fill="url(#dg1)"/>
      <ellipse cx="${w*.82}" cy="${h*.62}" rx="${h*.38}" ry="${h*.38}" fill="${a1}" opacity="0.09" filter="url(#df)"/>
      <circle cx="${w*.82}" cy="${h*.62}" r="${h*.14}" fill="${a1}" opacity="0.22"/>
      <circle cx="${w*.82}" cy="${h*.62}" r="${h*.07}" fill="${a1}" opacity="0.55"/>
      <circle cx="${w*.82}" cy="${h*.62}" r="${h*.025}" fill="${a1}" opacity="0.9"/>
      <line x1="0" y1="${h*.62}" x2="${w}" y2="${h*.62}" stroke="${a1}" stroke-width="0.8" opacity="0.12"/>
      <line x1="0" y1="${h*.68}" x2="${w}" y2="${h*.68}" stroke="${a2}" stroke-width="0.6" opacity="0.08"/>
      <line x1="0" y1="${h*.74}" x2="${w}" y2="${h*.74}" stroke="${a1}" stroke-width="0.5" opacity="0.06"/>
      <path d="M0,${h*.62} L${w*.15},${h*.58} L${w*.28},${h*.62} L${w*.42},${h*.56} L${w*.55},${h*.62}" fill="none" stroke="${a1}" stroke-width="1" opacity="0.15"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <radialGradient id="dcg" cx="${w*.85}" cy="${h*.5}" r="${h*.5}" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${a1}" stop-opacity="0.22"/>
          <stop offset="1" stop-color="${a1}" stop-opacity="0"/>
        </radialGradient>
        <filter id="dcf"><feGaussianBlur stdDeviation="16"/></filter>
      </defs>
      <ellipse cx="${w*.85}" cy="${h*.5}" r="${h*.45}" fill="url(#dcg)"/>
      <circle cx="${w*.85}" cy="${h*.5}" r="${h*.1}" fill="${a1}" opacity="0.18"/>
      <circle cx="${w*.85}" cy="${h*.5}" r="${h*.04}" fill="${a1}" opacity="0.55"/>
      <line x1="0" y1="${h*.5}" x2="${w}" y2="${h*.5}" stroke="${a1}" stroke-width="0.7" opacity="0.1"/>
      <line x1="0" y1="${h*.56}" x2="${w}" y2="${h*.56}" stroke="${a2}" stroke-width="0.5" opacity="0.07"/>
      <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.45"/>
    </svg>`,
  },

  // ── 9. WAVE STACK ── слои волн, глубина
  {
    name:'Слои',nameEn:'Layers',
    desc:'Параллельные волны, глубина слоёв',descEn:'Layered wave planes, depth',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="lf"><feGaussianBlur stdDeviation="15"/></filter></defs>
      <path d="M0,${h*.38} C${w*.12},${h*.28} ${w*.28},${h*.44} ${w*.44},${h*.35} C${w*.6},${h*.26} ${w*.76},${h*.42} ${w},${h*.32} L${w},0 L0,0 Z" fill="${a1}" opacity="0.10"/>
      <path d="M0,${h*.52} C${w*.15},${h*.42} ${w*.32},${h*.58} ${w*.5},${h*.48} C${w*.68},${h*.38} ${w*.82},${h*.55} ${w},${h*.46} L${w},0 L0,0 Z" fill="${a2}" opacity="0.08"/>
      <path d="M0,${h*.38} C${w*.12},${h*.28} ${w*.28},${h*.44} ${w*.44},${h*.35} C${w*.6},${h*.26} ${w*.76},${h*.42} ${w},${h*.32}" fill="none" stroke="${a1}" stroke-width="1.5" opacity="0.4"/>
      <path d="M0,${h*.52} C${w*.15},${h*.42} ${w*.32},${h*.58} ${w*.5},${h*.48} C${w*.68},${h*.38} ${w*.82},${h*.55} ${w},${h*.46}" fill="none" stroke="${a2}" stroke-width="1" opacity="0.3"/>
      <path d="M0,${h*.66} C${w*.18},${h*.56} ${w*.36},${h*.72} ${w*.56},${h*.62} C${w*.74},${h*.52} ${w*.88},${h*.68} ${w},${h*.6}" fill="none" stroke="${a1}" stroke-width="0.8" opacity="0.2"/>
      <path d="M0,${h*.78} C${w*.2},${h*.7} ${w*.42},${h*.84} ${w*.62},${h*.76} C${w*.8},${h*.68} ${w*.92},${h*.8} ${w},${h*.74}" fill="none" stroke="${a2}" stroke-width="0.6" opacity="0.15"/>
      <ellipse cx="${w*.85}" cy="${h*.25}" rx="${w*.2}" ry="${h*.2}" fill="${a1}" opacity="0.06" filter="url(#lf)"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <path d="M0,0 C${w*.15},${h*.12} ${w*.35},${h*.02} ${w*.55},${h*.1} C${w*.75},${h*.18} ${w*.88},${h*.06} ${w},${h*.12} L${w},0 Z" fill="${a1}" opacity="0.16"/>
      <path d="M0,0 C${w*.18},${h*.2} ${w*.4},${h*.08} ${w*.6},${h*.18} C${w*.78},${h*.26} ${w*.92},${h*.12} ${w},${h*.2} L${w},0 Z" fill="${a2}" opacity="0.10"/>
      <path d="M0,${h} C${w*.18},${h*.82} ${w*.4},${h*.92} ${w*.62},${h*.85} C${w*.8},${h*.78} ${w*.92},${h*.88} ${w},${h*.84} L${w},${h} Z" fill="${a1}" opacity="0.12"/>
      <path d="M0,0 C${w*.15},${h*.12} ${w*.35},${h*.02} ${w*.55},${h*.1} C${w*.75},${h*.18} ${w*.88},${h*.06} ${w},${h*.12}" fill="none" stroke="${a1}" stroke-width="1.2" opacity="0.35"/>
    </svg>`,
  },

  // ── 10. DIAMOND ── кристалл, огранка
  {
    name:'Кристалл',nameEn:'Crystal',
    desc:'Огранка кристалла, отражения',descEn:'Gem facets, crystalline reflections',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs><filter id="crf"><feGaussianBlur stdDeviation="18"/></filter></defs>
      <polygon points="${w*.78},${h*.08} ${w*.92},${h*.22} ${w*.78},${h*.58} ${w*.58},${h*.35}" fill="${a1}" opacity="0.14"/>
      <polygon points="${w*.78},${h*.08} ${w*.92},${h*.22} ${w*.95},${h*.08}" fill="${a2}" opacity="0.22"/>
      <polygon points="${w*.92},${h*.22} ${w*.78},${h*.58} ${w*.95},${h*.42}" fill="${a1}" opacity="0.18"/>
      <polygon points="${w*.78},${h*.08} ${w*.58},${h*.35} ${w*.68},${h*.08}" fill="${a2}" opacity="0.12"/>
      <polygon points="${w*.58},${h*.35} ${w*.78},${h*.58} ${w*.62},${h*.58}" fill="${a1}" opacity="0.10"/>
      <line x1="${w*.78}" y1="${h*.08}" x2="${w*.92}" y2="${h*.22}" stroke="${a1}" stroke-width="1" opacity="0.5"/>
      <line x1="${w*.92}" y1="${h*.22}" x2="${w*.78}" y2="${h*.58}" stroke="${a1}" stroke-width="0.8" opacity="0.4"/>
      <line x1="${w*.78}" y1="${h*.58}" x2="${w*.58}" y2="${h*.35}" stroke="${a2}" stroke-width="0.8" opacity="0.35"/>
      <line x1="${w*.58}" y1="${h*.35}" x2="${w*.78}" y2="${h*.08}" stroke="${a2}" stroke-width="0.8" opacity="0.35"/>
      <line x1="${w*.78}" y1="${h*.08}" x2="${w*.78}" y2="${h*.58}" stroke="${a1}" stroke-width="0.5" opacity="0.2"/>
      <circle cx="${w*.78}" cy="${h*.33}" r="${h*.3}" fill="${a1}" opacity="0.04" filter="url(#crf)"/>
      <polygon points="${w*.78},${h*.08} ${w*.92},${h*.22} ${w*.78},${h*.58} ${w*.58},${h*.35}" fill="none" stroke="${a1}" stroke-width="0.6" opacity="0.25"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polygon points="${w*.82},${h*.05} ${w*.96},${h*.22} ${w*.82},${h*.55} ${w*.65},${h*.3}" fill="${a1}" opacity="0.12"/>
      <polygon points="${w*.82},${h*.05} ${w*.96},${h*.22} ${w*.98},${h*.05}" fill="${a2}" opacity="0.2"/>
      <polygon points="${w*.96},${h*.22} ${w*.82},${h*.55} ${w*.98},${h*.42}" fill="${a1}" opacity="0.15"/>
      <line x1="${w*.82}" y1="${h*.05}" x2="${w*.96}" y2="${h*.22}" stroke="${a1}" stroke-width="0.9" opacity="0.45"/>
      <line x1="${w*.96}" y1="${h*.22}" x2="${w*.82}" y2="${h*.55}" stroke="${a1}" stroke-width="0.7" opacity="0.35"/>
      <line x1="${w*.82}" y1="${h*.55}" x2="${w*.65}" y2="${h*.3}" stroke="${a2}" stroke-width="0.7" opacity="0.3"/>
      <line x1="${w*.65}" y1="${h*.3}" x2="${w*.82}" y2="${h*.05}" stroke="${a2}" stroke-width="0.7" opacity="0.3"/>
      <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.5"/>
      <polygon points="0,0 ${w*.14},0 0,${h*.28}" fill="${a1}" opacity="0.08"/>
    </svg>`,
  },

  // ── 11. METRO ── плитки, плоский дизайн, bold цвет
  {
    name:'Метро',nameEn:'Metro',
    desc:'Цветные плитки, плоский bold-дизайн',descEn:'Bold flat tiles, metro UI style',
    titleSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect x="${w*.62}" y="0" width="${w*.38}" height="${h*.5}" fill="${a1}" opacity="0.2" rx="0"/>
      <rect x="${w*.62}" y="${h*.52}" width="${w*.22}" height="${h*.48}" fill="${a2}" opacity="0.16" rx="0"/>
      <rect x="${w*.86}" y="${h*.52}" width="${w*.14}" height="${h*.48}" fill="${a1}" opacity="0.25" rx="0"/>
      <rect x="${w*.62}" y="0" width="${w*.38}" height="${h*.5}" fill="none" stroke="${a1}" stroke-width="1" opacity="0.2"/>
      <rect x="${w*.62}" y="${h*.52}" width="${w*.22}" height="${h*.48}" fill="none" stroke="${a2}" stroke-width="0.8" opacity="0.2"/>
      <rect x="${w*.86}" y="${h*.52}" width="${w*.14}" height="${h*.48}" fill="none" stroke="${a1}" stroke-width="0.8" opacity="0.25"/>
      <rect x="0" y="0" width="${w*.08}" height="${h}" fill="${a1}" opacity="0.55"/>
      <rect x="${w*.09}" y="0" width="${w*.025}" height="${h}" fill="${a2}" opacity="0.3"/>
    </svg>`,
    contentSvg:(w,h,a1,a2)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect x="${w*.72}" y="0" width="${w*.28}" height="${h*.55}" fill="${a1}" opacity="0.18"/>
      <rect x="${w*.72}" y="${h*.57}" width="${w*.16}" height="${h*.43}" fill="${a2}" opacity="0.14"/>
      <rect x="${w*.9}" y="${h*.57}" width="${w*.1}" height="${h*.43}" fill="${a1}" opacity="0.22"/>
      <rect x="0" y="0" width="${w*.06}" height="${h}" fill="${a1}" opacity="0.55"/>
      <rect x="${w*.07}" y="0" width="${w*.02}" height="${h}" fill="${a2}" opacity="0.28"/>
    </svg>`,
  },

  // ── 12. TOPOGRAPHY ── топографические контуры, рельеф
  {
    name:'Рельеф',nameEn:'Topo',
    desc:'Топографические линии, карта высот',descEn:'Topographic contour lines',
    titleSvg:(w,h,a1,a2)=>{
      let paths='';
      const levels=[
        {r:0.88,o:0.06},{r:0.75,o:0.09},{r:0.60,o:0.12},
        {r:0.46,o:0.15},{r:0.33,o:0.18},{r:0.21,o:0.12},{r:0.11,o:0.08}
      ];
      const cx=w*.78,cy=h*.42;
      levels.forEach(({r,o},i)=>{
        const rx=w*r*0.9, ry=h*r*0.75;
        const rot=-15+i*4;
        paths+=`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${i%2?a2:a1}" stroke-width="${i<3?0.8:0.6}" opacity="${o}" transform="rotate(${rot},${cx.toFixed(1)},${cy.toFixed(1)})"/>`;
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs><filter id="tf"><feGaussianBlur stdDeviation="25"/></filter></defs>
        <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${w*.35}" ry="${h*.32}" fill="${a1}" opacity="0.06" filter="url(#tf)"/>
        ${paths}
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.03}" fill="${a1}" opacity="0.6"/>
      </svg>`;
    },
    contentSvg:(w,h,a1,a2)=>{
      let paths='';
      const cx=w*.85,cy=h*.5;
      [{r:.55,o:.1},{r:.42,o:.13},{r:.3,o:.15},{r:.19,o:.12},{r:.09,o:.08}].forEach(({r,o},i)=>{
        paths+=`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(w*r*.9).toFixed(1)}" ry="${(h*r*.8).toFixed(1)}" fill="none" stroke="${i%2?a2:a1}" stroke-width="0.7" opacity="${o}"/>`;
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${paths}
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${h*.025}" fill="${a1}" opacity="0.5"/>
        <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.5"/>
      </svg>`;
    },
  },

  // ── SPACE ── космос: звёзды, орбиты, планета
  {
    name:'Космос',nameEn:'Space',
    desc:'Звёзды, орбиты, планеты',descEn:'Stars, orbits, celestial bodies',
    titleSvg:(w,h,a1,a2)=>(()=>{
      const pts=[[.08,.06],[.18,.12],[.32,.04],[.48,.09],[.58,.18],[.70,.07],[.82,.14],[.90,.22],[.95,.06],
                 [.12,.28],[.25,.38],[.40,.22],[.52,.32],[.64,.25],[.76,.35],[.88,.42],[.94,.32],
                 [.06,.52],[.20,.58],[.35,.48],[.50,.55],[.62,.45],[.72,.60],[.85,.52],[.92,.62],
                 [.10,.72],[.28,.68],[.44,.75],[.60,.70],[.74,.80],[.88,.72],[.96,.82]];
      let stars='';
      pts.forEach(([px,py],i)=>{
        const r=(i%5===0?1.8:i%3===0?1.3:0.8).toFixed(1);
        const op=(i%5===0?0.7:i%3===0?0.5:0.3).toFixed(2);
        stars+=`<circle cx="${(w*px).toFixed(1)}" cy="${(h*py).toFixed(1)}" r="${r}" fill="${i%4===0?a2:a1}" opacity="${op}"/>`;
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs>
          <radialGradient id="spg" cx="${w*.78}" cy="${h*.32}" r="${h*.5}" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="${a1}" stop-opacity="0.2"/>
            <stop offset="1" stop-color="${a1}" stop-opacity="0"/>
          </radialGradient>
          <filter id="spf"><feGaussianBlur stdDeviation="22"/></filter>
          <filter id="spf2"><feGaussianBlur stdDeviation="8"/></filter>
        </defs>
        ${stars}
        <ellipse cx="${w*.78}" cy="${h*.32}" rx="${h*.5}" ry="${h*.5}" fill="url(#spg)"/>
        <circle cx="${w*.78}" cy="${h*.32}" r="${h*.22}" fill="${a1}" opacity="0.08" filter="url(#spf)"/>
        <circle cx="${w*.78}" cy="${h*.32}" r="${h*.13}" fill="${a1}" opacity="0.14"/>
        <circle cx="${w*.78}" cy="${h*.32}" r="${h*.07}" fill="${a1}" opacity="0.35"/>
        <circle cx="${w*.78}" cy="${h*.32}" r="${h*.025}" fill="${a1}" opacity="0.85"/>
        <ellipse cx="${w*.78}" cy="${h*.32}" rx="${h*.32}" ry="${h*.09}" fill="none" stroke="${a2}" stroke-width="1" opacity="0.28" transform="rotate(-22,${w*.78},${h*.32})"/>
        <ellipse cx="${w*.78}" cy="${h*.32}" rx="${h*.42}" ry="${h*.12}" fill="none" stroke="${a1}" stroke-width="0.7" opacity="0.15" transform="rotate(-22,${w*.78},${h*.32})"/>
        <circle cx="${w*.78}" cy="${h*.32}" r="${h*.22}" fill="none" stroke="${a1}" stroke-width="1" opacity="0.2"/>
        <circle cx="${w*.78}" cy="${h*.32}" r="${h*.35}" fill="none" stroke="${a2}" stroke-width="0.6" opacity="0.1"/>
        <circle cx="${(w*.78-h*.32*Math.cos(22*Math.PI/180)).toFixed(1)}" cy="${(h*.32-h*.32*Math.sin(22*Math.PI/180)).toFixed(1)}" r="3" fill="${a2}" opacity="0.7" filter="url(#spf2)"/>
      </svg>`;
    })(),
    contentSvg:(w,h,a1,a2)=>(()=>{
      const pts=[[.08,.08],[.22,.04],[.38,.14],[.52,.06],[.68,.12],[.78,.20],[.90,.08],[.95,.18],
                 [.12,.35],[.30,.28],[.48,.38],[.65,.30],[.82,.42],[.94,.35],
                 [.06,.58],[.25,.65],[.45,.55],[.62,.62],[.80,.55],[.92,.65]];
      let stars='';
      pts.forEach(([px,py],i)=>{
        stars+=`<circle cx="${(w*px).toFixed(1)}" cy="${(h*py).toFixed(1)}" r="${(i%4===0?1.5:0.8).toFixed(1)}" fill="${i%3===0?a2:a1}" opacity="${(i%4===0?0.55:0.3).toFixed(2)}"/>`;
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs>
          <radialGradient id="spcg" cx="${w*.86}" cy="${h*.5}" r="${h*.42}" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="${a1}" stop-opacity="0.18"/>
            <stop offset="1" stop-color="${a1}" stop-opacity="0"/>
          </radialGradient>
          <filter id="spcf"><feGaussianBlur stdDeviation="16"/></filter>
        </defs>
        ${stars}
        <circle cx="${w*.86}" cy="${h*.5}" r="${h*.42}" fill="url(#spcg)"/>
        <circle cx="${w*.86}" cy="${h*.5}" r="${h*.14}" fill="${a1}" opacity="0.1"/>
        <circle cx="${w*.86}" cy="${h*.5}" r="${h*.06}" fill="${a1}" opacity="0.3"/>
        <circle cx="${w*.86}" cy="${h*.5}" r="${h*.02}" fill="${a1}" opacity="0.75"/>
        <ellipse cx="${w*.86}" cy="${h*.5}" rx="${h*.24}" ry="${h*.07}" fill="none" stroke="${a2}" stroke-width="0.9" opacity="0.25" transform="rotate(-18,${w*.86},${h*.5})"/>
        <circle cx="${w*.86}" cy="${h*.5}" r="${h*.28}" fill="none" stroke="${a1}" stroke-width="0.7" opacity="0.15"/>
        <rect x="0" y="0" width="5" height="${h}" fill="${a1}" opacity="0.45"/>
      </svg>`;
    })(),
  },

];
// ══════════════ LAYOUT ENGINE ══════════════

// Get current theme accent colours (fallback to CSS vars)
function _decorAccents(){
  const ti=typeof appliedThemeIdx!=='undefined'&&appliedThemeIdx>=0?appliedThemeIdx
          :(typeof selTheme!=='undefined'&&selTheme>=0?selTheme:-1);
  if(ti>=0&&typeof THEMES!=='undefined'&&THEMES[ti]){
    return [THEMES[ti].ac1||'#6366f1', THEMES[ti].ac2||'#818cf8'];
  }
  return ['#6366f1','#818cf8'];
}

// Build the SVG string for a decor element using current canvas dimensions.
// Scopes all defs IDs with a unique prefix so multiple slides never share filter/gradient IDs.
let _svgUidCounter=0;
function _buildDecorSvg(layoutIdx, style){
  const L=LAYOUTS[layoutIdx];
  if(!L)return '';
  const [a1,a2]=_decorAccents();
  const fn=(style==='title')?L.titleSvg:L.contentSvg;
  if(typeof fn!=='function')return '';
  let svg=fn(canvasW, canvasH, a1, a2)||'';;
  // Make every defs id unique to avoid cross-slide collisions in the DOM
  const uid='u'+(++_svgUidCounter);
  svg=svg.replace(/\bid="([^"]+)"/g, (_,id)=>`id="${uid}_${id}"`);
  svg=svg.replace(/url\(#([^)]+)\)/g, (_,id)=>`url(#${uid}_${id})`);
  return svg;
}

// Create a new decor element data object for slide index si
function makeDecorEl(si, style){
  if(selLayout<0||selLayout>=LAYOUTS.length)return null;
  const decorStyle=style||'content';
  const svg=_buildDecorSvg(selLayout, decorStyle);
  if(!svg)return null;
  return {
    id:'decor_'+(si||0)+'_'+Date.now(),
    type:'svg',
    x:0, y:0, w:canvasW, h:canvasH,
    rot:0, anims:[], isTrigger:false,
    svgContent:svg,
    _isDecor:true,
    _decorStyle:decorStyle,
    _layoutIdx:selLayout,
  };
}

// Regenerate SVG strings for all decor elements across all slides
// Called after: theme change (new colors), AR change (new dimensions)
// skipRender=true: only update data, caller handles rendering
function refreshDecorColors(ac1, ac2, skipRender){
  // Override _decorAccents temporarily if explicit colors passed
  const _oa1=ac1||_decorAccents()[0], _oa2=ac2||_decorAccents()[1];
  slides.forEach(s=>{
    (s.els||[]).forEach(d=>{
      if(!d._isDecor)return;
      const li=d._layoutIdx;
      if(li==null||li<0||li>=LAYOUTS.length)return;
      const L=LAYOUTS[li];
      const fn=(d._decorStyle==='title')?L.titleSvg:L.contentSvg;
      if(typeof fn!=='function')return;
      // Generate SVG with explicit colors then apply uid scoping
      let svg=fn(canvasW, canvasH, _oa1, _oa2)||'';;
      const uid='u'+(++_svgUidCounter);
      svg=svg.replace(/\bid="([^"]+)"/g, (_,id)=>`id="${uid}_${id}"`);
      svg=svg.replace(/url\(#([^)]+)\)/g, (_,id)=>`url(#${uid}_${id})`);
      d.svgContent=svg;
      d.w=canvasW;
      d.h=canvasH;
    });
  });
  if(!skipRender){
    if(typeof renderAll==="function")renderAll();
    if(typeof saveState==='function')if(typeof saveState==="function")saveState();
    if(typeof drawThumbs==='function')if(typeof drawThumbs==="function")drawThumbs();
  }
}

// Layout picker UI
function buildLayoutGrid(){
  const grid=document.getElementById('layout-grid');
  if(!grid)return;
  grid.innerHTML='';
  const [a1,a2]=_decorAccents();
  const PW=320,PH=180;

  // "No layout" card
  const none=document.createElement('div');
  none.className='layout-item'+(selLayout===-1?' active':'');
  none.title='Без декора';
  none.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;';
  none.innerHTML=`<svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="opacity:.35"><line x1="8" y1="8" x2="40" y2="40" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="40" y1="8" x2="8" y2="40" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>`;
  const noneLbl=document.createElement('div');
  noneLbl.className='li-label';
  noneLbl.textContent='Без декора';
  none.appendChild(noneLbl);
  none.onclick=()=>{
    selLayout=-1;
    grid.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
    none.classList.add('active');
  };
  grid.appendChild(none);
  LAYOUTS.forEach((L,i)=>{
    const isRu=typeof lang!=='undefined'&&lang==='ru';
    const btn=document.createElement('div');
    btn.className='layout-item'+(selLayout===i?' active':'');
    btn.title=(isRu?L.desc:L.descEn)||'';
    const svgStr=typeof L.titleSvg==='function'?L.titleSvg(PW,PH,a1,a2):'';
    const lbl=document.createElement('div');
    lbl.className='li-label';
    lbl.textContent=isRu?L.name:L.nameEn;
    btn.innerHTML=svgStr;
    btn.appendChild(lbl);
    btn.onclick=()=>{
      selLayout=i;
      grid.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    };
    grid.appendChild(btn);
  });
}

function applyLayout(idx,btn){
  selLayout=idx;
  document.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');

  const [a1,a2]=_decorAccents();
  const L=LAYOUTS[idx];

  // Apply to every slide: replace or add decor
  slides.forEach((s,si)=>{
    // Remove old decor
    s.els=s.els.filter(d=>!d._isDecor);
    // Determine style — first slide is title, rest are content
    const decorStyle=si===0?'title':'content';
    const svg=_buildDecorSvg(idx, decorStyle);
    if(!svg)return;
    const d={
      id:'decor_'+si+'_'+Date.now(),
      type:'svg',
      x:0,y:0,w:canvasW,h:canvasH,
      rot:0,anims:[],isTrigger:false,
      svgContent:svg,
      _isDecor:true,
      _decorStyle:decorStyle,
      _layoutIdx:idx,
    };
    s.els.unshift(d);
  });

  if(typeof renderAll==="function")renderAll();if(typeof saveState==="function")saveState();
  if(typeof drawThumbs==='function')if(typeof drawThumbs==="function")drawThumbs();
}

function clearLayout(){
  selLayout=-1;
  document.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
  slides.forEach(s=>{s.els=s.els.filter(d=>!d._isDecor);});
  if(typeof renderAll==="function")renderAll();if(typeof saveState==="function")saveState();
  if(typeof drawThumbs==='function')if(typeof drawThumbs==="function")drawThumbs();
}

function openLayoutModal(){
  buildLayoutGrid();
  document.getElementById('layout-modal').classList.add('open');
}
function closeLayoutModal(){
  document.getElementById('layout-modal').classList.remove('open');
}
function applyLayoutDecor(){
  if(selLayout<0){clearLayout();closeLayoutModal();return;}
  applyLayout(selLayout,null);
  closeLayoutModal();
}

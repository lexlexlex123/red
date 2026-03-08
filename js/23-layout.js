// ══════════════ LAYOUT DECOR ══════════════
let selLayout=-1;
let _layoutAnimated=true; // animation toggle for layouts that support it

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


  // ── COSMOS ── планета с орбитами и спутниками
  {
    name:'Космос', nameEn:'Cosmos',
    desc:'Планета, орбиты, спутники — анимированный или статичный',
    descEn:'Planet with orbiting satellites — animated or static',
    animated: true,   // this layout supports animation toggle

    // helper: build the orbit+satellite SVG structure
    // animated=true → CSS keyframe animation, false → static snapshot
    _build:(w,h,a1,a2,isTitleSlide,doAnimate)=>{
      const cx = isTitleSlide ? w*0.72 : w*0.82;
      const cy = isTitleSlide ? h*0.52 : h*0.50;
      const pr = isTitleSlide ? h*0.13  : h*0.10;

      // orbits: rx, ry — semi-axes of ellipse; rot — tilt deg; period — seconds; sat — satellite radius
      const orbits = [
        {rx:pr*2.2, ry:pr*0.65, rot:-22, period:8,  sat:pr*0.10, op:0.80, phase:0.00, color:a1},
        {rx:pr*3.2, ry:pr*1.00, rot:-10, period:15, sat:pr*0.075,op:0.65, phase:0.35, color:a2},
        {rx:pr*4.2, ry:pr*1.40, rot:  6, period:25, sat:pr*0.06, op:0.50, phase:0.65, color:a1},
        {rx:pr*5.3, ry:pr*1.70, rot: 18, period:38, sat:pr*0.045,op:0.40, phase:0.15, color:a2},
      ];

      const uid = 'csm_' + (w|0) + '_' + (h|0) + '_' + (isTitleSlide?'t':'c');

      // Stars (deterministic)
      const rng=(s)=>{let x=Math.sin(s+1.7)*93741;return x-Math.floor(x);};
      let stars='';
      for(let i=0;i<65;i++){
        const sx=(rng(i*3  )*w).toFixed(1);
        const sy=(rng(i*3+1)*h).toFixed(1);
        const sr=(rng(i*3+2)*1.4+0.3).toFixed(2);
        const sop=(rng(i*3+0.5)*0.55+0.12).toFixed(2);
        stars+=`<circle cx="${sx}" cy="${sy}" r="${sr}" fill="${a1}" opacity="${sop}"/>`;
      }

      // Orbit ellipse paths (dashed rings)
      let orbitRings='';
      orbits.forEach(o=>{
        orbitRings+=`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}"
          rx="${o.rx.toFixed(1)}" ry="${o.ry.toFixed(1)}"
          fill="none" stroke="${o.color}" stroke-width="0.6" opacity="${(o.op*0.38).toFixed(2)}"
          stroke-dasharray="3 5"
          transform="rotate(${o.rot} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
      });

      // Planet glow + body
      const glowR=(pr*3.0).toFixed(1);
      const planet=`
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${glowR}" fill="${a1}" opacity="0.08" filter="url(#${uid}_bf)"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${pr.toFixed(1)}" fill="url(#${uid}_pg)"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${pr.toFixed(1)}" fill="none" stroke="${a1}" stroke-width="0.8" opacity="0.25"/>
        <circle cx="${(cx-pr*0.28).toFixed(1)}" cy="${(cy-pr*0.28).toFixed(1)}" r="${(pr*0.32).toFixed(1)}" fill="${a1}" opacity="0.10"/>`;

      // Satellites
      let sats='';
      orbits.forEach((o,i)=>{
        const glowSr=(o.sat*2.2).toFixed(1);
        const satR=o.sat.toFixed(1);
        const color=o.color;
        const opG=(o.op*0.3).toFixed(2);
        const opS=o.op.toFixed(2);
        const startDeg=(o.phase*360).toFixed(1);

        if(doAnimate){
          // Use SVG animateTransform: rotate the whole group around planet center
          // Satellite sits at (cx+rx, cy) in pre-tilt space; we rotate orbit+tilt together
          sats+=`
          <g transform="rotate(${o.rot} ${cx.toFixed(1)} ${cy.toFixed(1)})">
            <g>
              <animateTransform attributeName="transform" type="rotate"
                from="${startDeg} ${cx.toFixed(1)} ${cy.toFixed(1)}"
                to="${(parseFloat(startDeg)+360).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}"
                dur="${o.period}s" repeatCount="indefinite"/>
              <!-- satellite at right side of ellipse, then scale Y to squash to orbit -->
              <g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(1 ${(o.ry/o.rx).toFixed(4)}) translate(-${cx.toFixed(1)} -${cy.toFixed(1)})">
                <circle cx="${(cx+o.rx).toFixed(1)}" cy="${cy.toFixed(1)}" r="${glowSr}" fill="${color}" opacity="${opG}" filter="url(#${uid}_sbf)"/>
                <circle cx="${(cx+o.rx).toFixed(1)}" cy="${cy.toFixed(1)}" r="${satR}" fill="${color}" opacity="${opS}"/>
              </g>
            </g>
          </g>`;
        } else {
          // Static: position satellite at phase angle on ellipse
          const ang=o.phase*Math.PI*2;
          const ex=o.rx*Math.cos(ang), ey=o.ry*Math.sin(ang);
          const rad=o.rot*Math.PI/180;
          const sx=cx + ex*Math.cos(rad) - ey*Math.sin(rad);
          const sy=cy + ex*Math.sin(rad) + ey*Math.cos(rad);
          sats+=`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${glowSr}" fill="${color}" opacity="${opG}" filter="url(#${uid}_sbf)"/>`;
          sats+=`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${satR}" fill="${color}" opacity="${opS}"/>`;
        }
      });

      const defs=`<defs>
        <radialGradient id="${uid}_pg" cx="38%" cy="32%" r="68%">
          <stop offset="0%"   stop-color="${a1}" stop-opacity="0.95"/>
          <stop offset="45%"  stop-color="${a2}" stop-opacity="0.65"/>
          <stop offset="100%" stop-color="#050510" stop-opacity="0.92"/>
        </radialGradient>
        <filter id="${uid}_bf" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>
        <filter id="${uid}_sbf" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.5"/></filter>
      </defs>`;

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${defs}
        ${stars}
        ${orbitRings}
        ${sats}
        ${planet}
      </svg>`;
    },
    titleSvg(w,h,a1,a2,doAnimate){
      return this._build(w,h,a1,a2,true, doAnimate!==false);
    },
    contentSvg(w,h,a1,a2,doAnimate){
      return this._build(w,h,a1,a2,false, doAnimate!==false);
    },
  },

  // ── OCEAN ── волны и рыбки
  {
    name:'Океан', nameEn:'Ocean',
    desc:'Волны и рыбки под водой', descEn:'Animated waves and swimming fish',

    titleSvg(w, h, a1, a2, doAnimate) {
      const uid = 'oc' + Math.random().toString(36).slice(2,7);
      const anim = doAnimate !== false;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
  <defs>
    <linearGradient id="${uid}wg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a1}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${a1}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${a2}" stop-opacity="0.38"/>
    </linearGradient>
    <linearGradient id="${uid}wg2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a1}" stop-opacity="0"/>
      <stop offset="1" stop-color="${a1}" stop-opacity="0.22"/>
    </linearGradient>
    ${anim ? `
    <style>
      @keyframes ${uid}w1{0%,100%{d:path("M0,${h*.52} C${w*.15},${h*.46} ${w*.35},${h*.58} ${w*.5},${h*.52} C${w*.65},${h*.46} ${w*.85},${h*.58} ${w},${h*.52} L${w},${h} L0,${h} Z")} 50%{d:path("M0,${h*.55} C${w*.15},${h*.61} ${w*.35},${h*.49} ${w*.5},${h*.55} C${w*.65},${h*.61} ${w*.85},${h*.49} ${w},${h*.55} L${w},${h} L0,${h} Z")}}
      @keyframes ${uid}w2{0%,100%{d:path("M0,${h*.62} C${w*.18},${h*.56} ${w*.38},${h*.68} ${w*.55},${h*.62} C${w*.72},${h*.56} ${w*.88},${h*.68} ${w},${h*.62} L${w},${h} L0,${h} Z")} 50%{d:path("M0,${h*.65} C${w*.18},${h*.71} ${w*.38},${h*.59} ${w*.55},${h*.65} C${w*.72},${h*.71} ${w*.88},${h*.59} ${w},${h*.65} L${w},${h} L0,${h} Z")}}
      @keyframes ${uid}w3{0%,100%{d:path("M0,${h*.73} C${w*.2},${h*.67} ${w*.42},${h*.79} ${w*.6},${h*.73} C${w*.78},${h*.67} ${w*.9},${h*.79} ${w},${h*.73} L${w},${h} L0,${h} Z")} 50%{d:path("M0,${h*.76} C${w*.2},${h*.82} ${w*.42},${h*.70} ${w*.6},${h*.76} C${w*.78},${h*.82} ${w*.9},${h*.70} ${w},${h*.76} L${w},${h} L0,${h} Z")}}
      .${uid}w1{animation:${uid}w1 5s ease-in-out infinite;}
      .${uid}w2{animation:${uid}w2 6.5s ease-in-out infinite;}
      .${uid}w3{animation:${uid}w3 4.8s ease-in-out infinite;}
      @keyframes ${uid}f1{0%{transform:translate(${w*.05}px,${h*.64}px) scaleX(1);}45%{transform:translate(${w*.9}px,${h*.58}px) scaleX(1);}50%{transform:translate(${w*.9}px,${h*.58}px) scaleX(-1);}95%{transform:translate(${w*.05}px,${h*.64}px) scaleX(-1);}100%{transform:translate(${w*.05}px,${h*.64}px) scaleX(1);}}
      @keyframes ${uid}f2{0%{transform:translate(${w*.8}px,${h*.76}px) scaleX(-1);}48%{transform:translate(${w*.08}px,${h*.71}px) scaleX(-1);}52%{transform:translate(${w*.08}px,${h*.71}px) scaleX(1);}98%{transform:translate(${w*.8}px,${h*.76}px) scaleX(1);}100%{transform:translate(${w*.8}px,${h*.76}px) scaleX(-1);}}
      @keyframes ${uid}f3{0%{transform:translate(${w*.25}px,${h*.82}px) scaleX(1);}47%{transform:translate(${w*.75}px,${h*.87}px) scaleX(1);}53%{transform:translate(${w*.75}px,${h*.87}px) scaleX(-1);}97%{transform:translate(${w*.25}px,${h*.82}px) scaleX(-1);}100%{transform:translate(${w*.25}px,${h*.82}px) scaleX(1);}}
      @keyframes ${uid}f4{0%{transform:translate(${w*.6}px,${h*.69}px) scaleX(-1);}44%{transform:translate(${w*.15}px,${h*.74}px) scaleX(-1);}56%{transform:translate(${w*.15}px,${h*.74}px) scaleX(1);}96%{transform:translate(${w*.6}px,${h*.69}px) scaleX(1);}100%{transform:translate(${w*.6}px,${h*.69}px) scaleX(-1);}}
      .${uid}f1{animation:${uid}f1 9s ease-in-out infinite;}
      .${uid}f2{animation:${uid}f2 12s ease-in-out infinite 2s;}
      .${uid}f3{animation:${uid}f3 10s ease-in-out infinite 4s;}
      .${uid}f4{animation:${uid}f4 8s ease-in-out infinite 1s;}
      @keyframes ${uid}b{0%,100%{opacity:.4;transform:translateY(0) scale(1);}50%{opacity:.7;transform:translateY(-${h*.02}px) scale(1.15);}}
      .${uid}b1{animation:${uid}b 3s ease-in-out infinite;}
      .${uid}b2{animation:${uid}b 4s ease-in-out infinite 1s;}
      .${uid}b3{animation:${uid}b 5s ease-in-out infinite 2s;}
    </style>` : ''}
  </defs>

  <!-- Underwater fill -->
  <rect x="0" y="${h*.5}" width="${w}" height="${h*.5}" fill="url(#${uid}wg)"/>

  <!-- Bubbles -->
  <circle class="${uid}b1" cx="${w*.18}" cy="${h*.72}" r="${w*.006}" fill="${a1}" opacity=".4"/>
  <circle class="${uid}b2" cx="${w*.44}" cy="${h*.65}" r="${w*.004}" fill="${a2}" opacity=".35"/>
  <circle class="${uid}b3" cx="${w*.71}" cy="${h*.78}" r="${w*.005}" fill="${a1}" opacity=".3"/>

  <!-- Fish (tiny, schematic) -->
  <g class="${uid}f1" opacity=".6">
    <ellipse cx="0" cy="0" rx="${w*.022}" ry="${w*.009}" fill="${a1}" opacity=".7"/>
    <polygon points="${w*.022},0 ${w*.034},${-w*.007} ${w*.034},${w*.007}" fill="${a1}" opacity=".5"/>
    <circle cx="${-w*.008}" cy="${-w*.002}" r="${w*.002}" fill="${a2}"/>
  </g>
  <g class="${uid}f2" opacity=".5">
    <ellipse cx="0" cy="0" rx="${w*.018}" ry="${w*.007}" fill="${a2}" opacity=".7"/>
    <polygon points="${w*.018},0 ${w*.028},${-w*.005} ${w*.028},${w*.005}" fill="${a2}" opacity=".5"/>
    <circle cx="${-w*.006}" cy="${-w*.002}" r="${w*.0015}" fill="${a1}"/>
  </g>
  <g class="${uid}f3" opacity=".55">
    <ellipse cx="0" cy="0" rx="${w*.016}" ry="${w*.006}" fill="${a1}" opacity=".6"/>
    <polygon points="${w*.016},0 ${w*.025},${-w*.005} ${w*.025},${w*.005}" fill="${a1}" opacity=".4"/>
    <circle cx="${-w*.005}" cy="${-w*.0015}" r="${w*.0013}" fill="${a2}"/>
  </g>
  <g class="${uid}f4" opacity=".5">
    <ellipse cx="0" cy="0" rx="${w*.02}" ry="${w*.008}" fill="${a2}" opacity=".65"/>
    <polygon points="${w*.02},0 ${w*.031},${-w*.006} ${w*.031},${w*.006}" fill="${a2}" opacity=".45"/>
    <circle cx="${-w*.007}" cy="${-w*.002}" r="${w*.0017}" fill="${a1}"/>
  </g>

  <!-- 3 waves top to bottom -->
  <path class="${uid}w1" d="M0,${h*.52} C${w*.15},${h*.46} ${w*.35},${h*.58} ${w*.5},${h*.52} C${w*.65},${h*.46} ${w*.85},${h*.58} ${w},${h*.52} L${w},${h} L0,${h} Z" fill="${a1}" opacity=".13"/>
  <path class="${uid}w2" d="M0,${h*.62} C${w*.18},${h*.56} ${w*.38},${h*.68} ${w*.55},${h*.62} C${w*.72},${h*.56} ${w*.88},${h*.68} ${w},${h*.62} L${w},${h} L0,${h} Z" fill="${a1}" opacity=".18"/>
  <path class="${uid}w3" d="M0,${h*.73} C${w*.2},${h*.67} ${w*.42},${h*.79} ${w*.6},${h*.73} C${w*.78},${h*.67} ${w*.9},${h*.79} ${w},${h*.73} L${w},${h} L0,${h} Z" fill="url(#${uid}wg2)" opacity=".9"/>
</svg>`;
    },

    contentSvg(w, h, a1, a2, doAnimate) {
      const uid = 'ocs' + Math.random().toString(36).slice(2,7);
      const anim = doAnimate !== false;
      // Content slides: one wave at bottom + fish that jump out
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
  <defs>
    <linearGradient id="${uid}wg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a1}" stop-opacity="0"/>
      <stop offset="1" stop-color="${a2}" stop-opacity="0.3"/>
    </linearGradient>
    ${anim ? `
    <style>
      @keyframes ${uid}w{0%,100%{d:path("M0,${h*.82} C${w*.18},${h*.76} ${w*.4},${h*.88} ${w*.6},${h*.82} C${w*.8},${h*.76} ${w*.9},${h*.88} ${w},${h*.82} L${w},${h} L0,${h} Z")} 50%{d:path("M0,${h*.86} C${w*.18},${h*.92} ${w*.4},${h*.80} ${w*.6},${h*.86} C${w*.8},${h*.92} ${w*.9},${h*.80} ${w},${h*.86} L${w},${h} L0,${h} Z")}}
      .${uid}wv{animation:${uid}w 5s ease-in-out infinite;}

      @keyframes ${uid}j1{0%,70%,100%{transform:translate(${w*.28}px,${h*.82}px) rotate(0deg) scaleX(1);opacity:0;}72%{opacity:.8;}75%{transform:translate(${w*.3}px,${h*.55}px) rotate(-30deg) scaleX(1);opacity:.8;}80%{transform:translate(${w*.32}px,${h*.48}px) rotate(-45deg) scaleX(1);opacity:.6;}88%{transform:translate(${w*.29}px,${h*.72}px) rotate(10deg) scaleX(1);opacity:.5;}92%{transform:translate(${w*.28}px,${h*.85}px) rotate(0deg) scaleX(1);opacity:0;}}
      @keyframes ${uid}j2{0%,40%,100%{transform:translate(${w*.6}px,${h*.84}px) rotate(0deg) scaleX(-1);opacity:0;}42%{opacity:.7;}45%{transform:translate(${w*.58}px,${h*.58}px) rotate(25deg) scaleX(-1);opacity:.7;}50%{transform:translate(${w*.57}px,${h*.5}px) rotate(40deg) scaleX(-1);opacity:.5;}58%{transform:translate(${w*.59}px,${h*.75}px) rotate(-5deg) scaleX(-1);opacity:.4;}63%{transform:translate(${w*.6}px,${h*.86}px) rotate(0deg) scaleX(-1);opacity:0;}}
      @keyframes ${uid}j3{0%,85%,100%{transform:translate(${w*.45}px,${h*.83}px) rotate(0deg) scaleX(1);opacity:0;}87%{opacity:.75;}90%{transform:translate(${w*.47}px,${h*.6}px) rotate(-20deg) scaleX(1);opacity:.75;}94%{transform:translate(${w*.48}px,${h*.54}px) rotate(-35deg) scaleX(1);opacity:.55;}98%{transform:translate(${w*.46}px,${h*.78}px) rotate(5deg) scaleX(1);opacity:.2;}}

      .${uid}j1{animation:${uid}j1 8s ease-in-out infinite;}
      .${uid}j2{animation:${uid}j2 11s ease-in-out infinite 3s;}
      .${uid}j3{animation:${uid}j3 9s ease-in-out infinite 6s;}
    </style>` : ''}
  </defs>

  <!-- Wave fill -->
  <rect x="0" y="${h*.8}" width="${w}" height="${h*.2}" fill="url(#${uid}wg)"/>

  <!-- Jumping fish -->
  <g class="${uid}j1" opacity="0">
    <ellipse cx="0" cy="0" rx="${w*.022}" ry="${w*.009}" fill="${a1}" opacity=".75"/>
    <polygon points="${w*.022},0 ${w*.034},${-w*.007} ${w*.034},${w*.007}" fill="${a1}" opacity=".55"/>
    <circle cx="${-w*.008}" cy="${-w*.002}" r="${w*.002}" fill="${a2}"/>
  </g>
  <g class="${uid}j2" opacity="0">
    <ellipse cx="0" cy="0" rx="${w*.019}" ry="${w*.008}" fill="${a2}" opacity=".7"/>
    <polygon points="${w*.019},0 ${w*.03},${-w*.006} ${w*.03},${w*.006}" fill="${a2}" opacity=".5"/>
    <circle cx="${-w*.007}" cy="${-w*.002}" r="${w*.0017}" fill="${a1}"/>
  </g>
  <g class="${uid}j3" opacity="0">
    <ellipse cx="0" cy="0" rx="${w*.017}" ry="${w*.007}" fill="${a1}" opacity=".65"/>
    <polygon points="${w*.017},0 ${w*.026},${-w*.005} ${w*.026},${w*.005}" fill="${a1}" opacity=".45"/>
    <circle cx="${-w*.006}" cy="${-w*.0015}" r="${w*.0014}" fill="${a2}"/>
  </g>

  <!-- Wave -->
  <path class="${uid}wv" d="M0,${h*.82} C${w*.18},${h*.76} ${w*.4},${h*.88} ${w*.6},${h*.82} C${w*.8},${h*.76} ${w*.9},${h*.88} ${w},${h*.82} L${w},${h} L0,${h} Z" fill="url(#${uid}wg)" opacity=".9"/>
</svg>`;
    },
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
  const doAnimate = L.animated ? _layoutAnimated : false;
  let svg=fn.call(L, canvasW, canvasH, a1, a2, doAnimate)||'';;
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
      const doAnim = L.animated ? _layoutAnimated : false;
      let svg=fn.call(L, canvasW, canvasH, _oa1, _oa2, doAnim)||'';;
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
    const isRu=typeof getLang==='function'&&getLang()==='ru';
    const btn=document.createElement('div');
    btn.className='layout-item'+(selLayout===i?' active':'');
    btn.title=(isRu?L.desc:L.descEn)||'';
    const doAnim = L.animated ? _layoutAnimated : false;
    const svgStr=typeof L.titleSvg==='function'?L.titleSvg.call(L,PW,PH,a1,a2,doAnim):'';
    const lbl=document.createElement('div');
    lbl.className='li-label';
    lbl.textContent=isRu?L.name:L.nameEn;
    if(L.animated){
      const badge=document.createElement('span');
      badge.className='li-anim-badge';
      badge.textContent='✦';
      badge.title=isRu?'Поддерживает анимацию':'Supports animation';
      lbl.appendChild(badge);
    }
    btn.innerHTML=svgStr;
    btn.appendChild(lbl);
    btn.onclick=()=>{
      selLayout=i;
      grid.querySelectorAll('.layout-item').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      _updateAnimToggleVisibility();
    };
    grid.appendChild(btn);
  });
  _updateAnimToggleVisibility();
}

function _updateAnimToggleVisibility(){
  const wrap = document.getElementById('layout-anim-toggle-wrap');
  if(!wrap) return;
  const L = selLayout>=0 ? LAYOUTS[selLayout] : null;
  const show = !!(L && L.animated);
  wrap.style.display = show ? '' : 'none';
  if(show) _syncAnimToggleBtns();
}

function _syncAnimToggleBtns(){
  const on  = document.getElementById('layout-anim-btn-on');
  const off = document.getElementById('layout-anim-btn-off');
  if(!on||!off) return;
  if(_layoutAnimated){
    on.classList.add('pri');    off.classList.remove('pri');
    on.style.opacity='1';       off.style.opacity='0.55';
  } else {
    off.classList.add('pri');   on.classList.remove('pri');
    off.style.opacity='1';      on.style.opacity='0.55';
  }
}

window.setLayoutAnimated = function(val){
  _layoutAnimated = val;
  _syncAnimToggleBtns();
  buildLayoutGrid();
};

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
  _updateAnimToggleVisibility();
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

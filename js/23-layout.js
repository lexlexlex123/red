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


  // ── COSMOS ── планета с орбитами и спутниками
  {
    name:'Космос', nameEn:'Cosmos',
    desc:'Планета, орбиты, спутники — анимированный или статичный',
    descEn:'Planet with orbiting satellites — animated or static',
    animated: true,   // this layout supports animation toggle

    // helper: build the orbit+satellite SVG structure
    // animated=true → CSS keyframe animation, false → static snapshot
    _build:(w,h,a1,a2,isTitleSlide,doAnimate)=>{
      const cx = isTitleSlide ? w*0.72 : w*0.88;
      const cy = isTitleSlide ? h*0.52 : h*0.82;
      const pr = isTitleSlide ? h*0.13  : h*0.10;

      const orbits = [
        {rx:pr*2.2, ry:pr*0.65, rot:-22, period:8,  sat:pr*0.10,  phase:0.00, color:a1},
        {rx:pr*3.2, ry:pr*1.00, rot:-10, period:15, sat:pr*0.075, phase:0.35, color:a2},
        {rx:pr*4.2, ry:pr*1.40, rot:  6, period:25, sat:pr*0.06,  phase:0.65, color:a1},
        {rx:pr*5.3, ry:pr*1.70, rot: 18, period:38, sat:pr*0.045, phase:0.15, color:a2},
      ];

      // Pre-compute ellipse orbit points: returns "x,y;x,y;..." string
      function orbitVals(rx, ry, rotDeg, phase, n){
        const r=rotDeg*Math.PI/180, pts=[];
        for(let i=0;i<=n;i++){
          const a=2*Math.PI*(phase+i/n);
          const ex=rx*Math.cos(a), ey=ry*Math.sin(a);
          const x=cx + ex*Math.cos(r) - ey*Math.sin(r);
          const y=cy + ex*Math.sin(r) + ey*Math.cos(r);
          pts.push(x.toFixed(1)+','+y.toFixed(1));
        }
        return pts.join(';');
      }

      const uid = 'csm' + Math.random().toString(36).slice(2,7);

      // Stars (deterministic)
      const rng=(s)=>{let x=Math.sin(s+1.7)*93741;return x-Math.floor(x);};
      let stars='';
      for(let i=0;i<65;i++){
        stars+=`<circle cx="${(rng(i*3)*w).toFixed(1)}" cy="${(rng(i*3+1)*h).toFixed(1)}" r="${(rng(i*3+2)*1.4+0.3).toFixed(2)}" fill="${a1}" opacity="${(rng(i*3+0.5)*0.55+0.12).toFixed(2)}"/>`;
      }

      // Dashed orbit rings
      let orbitRings='';
      orbits.forEach(o=>{
        orbitRings+=`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${o.rx.toFixed(1)}" ry="${o.ry.toFixed(1)}" fill="none" stroke="${o.color}" stroke-width="0.6" opacity="0.28" stroke-dasharray="3 5" transform="rotate(${o.rot} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
      });

      // Planet: solid fill so satellites don't show through.
      // Glow is drawn BEFORE satellites (behind them); body drawn AFTER (on top).
      const planetGlow=`
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(pr*2.4).toFixed(1)}" fill="${a1}" opacity="0.15" filter="url(#${uid}bf)"/>`;
      const planetBody=`
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${pr.toFixed(1)}" fill="${a1}" opacity="1"/>
        <circle cx="${(cx-pr*0.3).toFixed(1)}" cy="${(cy-pr*0.3).toFixed(1)}" r="${(pr*0.28).toFixed(1)}" fill="${a2}" opacity="0.22"/>`;

      // Satellites: CORRECT pattern — <g transform="translate(x,y)"> animates,
      // child <circle cx="0" cy="0"> stays at origin of the group
      let sats='';
      orbits.forEach((o,i)=>{
        const satR=o.sat.toFixed(2);
        if(doAnimate){
          const vals=orbitVals(o.rx,o.ry,o.rot,o.phase,48);
          const firstPt=vals.split(';')[0];
          sats+=`<g transform="translate(${firstPt})">
            <animateTransform attributeName="transform" type="translate"
              dur="${o.period}s" repeatCount="indefinite" calcMode="linear"
              values="${vals}"/>
            <circle cx="0" cy="0" r="${satR}" fill="${o.color}" opacity="0.82"/>
          </g>`;
        } else {
          const ang=o.phase*Math.PI*2, r=o.rot*Math.PI/180;
          const ex=o.rx*Math.cos(ang), ey=o.ry*Math.sin(ang);
          const sx=cx + ex*Math.cos(r) - ey*Math.sin(r);
          const sy=cy + ex*Math.sin(r) + ey*Math.cos(r);
          sats+=`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${satR}" fill="${o.color}" opacity="0.82"/>`;
        }
      });

      const defs=`<defs>
        <filter id="${uid}bf" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="18"/></filter>
      </defs>`;

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${defs}${stars}${planetGlow}${orbitRings}${sats}${planetBody}
      </svg>`;
    },

    titleSvg(w,h,a1,a2,doAnimate){
      return this._build(w,h,a1,a2,true, doAnimate!==false);
    },
    contentSvg(w,h,a1,a2,doAnimate){
      return this._build(w,h,a1,a2,false, doAnimate!==false);
    },
  },
  // -- OCEAN -- волны и рыбки
  {
    name:'Океан', nameEn:'Ocean',
    desc:'Волны и рыбки под водой', descEn:'Animated waves and swimming fish',
    animated: true,

    titleSvg(w, h, a1, a2, doAnimate) {
      const uid = 'oc' + Math.random().toString(36).slice(2,8);
      const W1 = "M0.0,374.4 C30.4,377.5 99.2,386.3 160.0,390.7 C220.8,395.1 259.2,397.4 320.0,397.4 C380.8,397.4 419.2,395.1 480.0,390.7 C540.8,386.3 579.2,380.6 640.0,374.4 C700.8,368.2 739.2,362.5 800.0,358.1 C860.8,353.7 899.2,351.4 960.0,351.4 C1020.8,351.4 1059.2,353.7 1120.0,358.1 C1180.8,362.5 1249.6,371.3 1280.0,374.4 L1280.0,720.0 L0,720.0 Z;M0.0,385.9 C30.4,388.0 99.2,395.1 160.0,396.7 C220.8,398.3 259.2,397.4 320.0,394.4 C380.8,391.3 419.2,386.3 480.0,380.4 C540.8,374.4 579.2,368.2 640.0,362.9 C700.8,357.5 739.2,353.7 800.0,352.1 C860.8,350.5 899.2,351.4 960.0,354.4 C1020.8,357.5 1059.2,362.5 1120.0,368.4 C1180.8,374.4 1249.6,382.6 1280.0,385.9 L1280.0,720.0 L0,720.0 Z;M0.0,394.4 C30.4,394.8 99.2,398.3 160.0,396.7 C220.8,395.1 259.2,391.3 320.0,385.9 C380.8,380.6 419.2,374.4 480.0,368.4 C540.8,362.5 579.2,357.5 640.0,354.4 C700.8,351.4 739.2,350.5 800.0,352.1 C860.8,353.7 899.2,357.5 960.0,362.9 C1020.8,368.2 1059.2,374.4 1120.0,380.4 C1180.8,386.3 1249.6,391.7 1280.0,394.4 L1280.0,720.0 L0,720.0 Z;M0.0,397.4 C30.4,396.2 99.2,395.1 160.0,390.7 C220.8,386.3 259.2,380.6 320.0,374.4 C380.8,368.2 419.2,362.5 480.0,358.1 C540.8,353.7 579.2,351.4 640.0,351.4 C700.8,351.4 739.2,353.7 800.0,358.1 C860.8,362.5 899.2,368.2 960.0,374.4 C1020.8,380.6 1059.2,386.3 1120.0,390.7 C1180.8,395.1 1249.6,396.2 1280.0,397.4 L1280.0,720.0 L0,720.0 Z;M0.0,394.4 C30.4,391.7 99.2,386.3 160.0,380.4 C220.8,374.4 259.2,368.2 320.0,362.9 C380.8,357.5 419.2,353.7 480.0,352.1 C540.8,350.5 579.2,351.4 640.0,354.4 C700.8,357.5 739.2,362.5 800.0,368.4 C860.8,374.4 899.2,380.6 960.0,385.9 C1020.8,391.3 1059.2,395.1 1120.0,396.7 C1180.8,398.3 1249.6,394.8 1280.0,394.4 L1280.0,720.0 L0,720.0 Z;M0.0,385.9 C30.4,382.6 99.2,374.4 160.0,368.4 C220.8,362.5 259.2,357.5 320.0,354.4 C380.8,351.4 419.2,350.5 480.0,352.1 C540.8,353.7 579.2,357.5 640.0,362.9 C700.8,368.2 739.2,374.4 800.0,380.4 C860.8,386.3 899.2,391.3 960.0,394.4 C1020.8,397.4 1059.2,398.3 1120.0,396.7 C1180.8,395.1 1249.6,388.0 1280.0,385.9 L1280.0,720.0 L0,720.0 Z;M0.0,374.4 C30.4,371.3 99.2,362.5 160.0,358.1 C220.8,353.7 259.2,351.4 320.0,351.4 C380.8,351.4 419.2,353.7 480.0,358.1 C540.8,362.5 579.2,368.2 640.0,374.4 C700.8,380.6 739.2,386.3 800.0,390.7 C860.8,395.1 899.2,397.4 960.0,397.4 C1020.8,397.4 1059.2,395.1 1120.0,390.7 C1180.8,386.3 1249.6,377.5 1280.0,374.4 L1280.0,720.0 L0,720.0 Z;M0.0,362.9 C30.4,360.8 99.2,353.7 160.0,352.1 C220.8,350.5 259.2,351.4 320.0,354.4 C380.8,357.5 419.2,362.5 480.0,368.4 C540.8,374.4 579.2,380.6 640.0,385.9 C700.8,391.3 739.2,395.1 800.0,396.7 C860.8,398.3 899.2,397.4 960.0,394.4 C1020.8,391.3 1059.2,386.3 1120.0,380.4 C1180.8,374.4 1249.6,366.2 1280.0,362.9 L1280.0,720.0 L0,720.0 Z;M0.0,354.4 C30.4,354.0 99.2,350.5 160.0,352.1 C220.8,353.7 259.2,357.5 320.0,362.9 C380.8,368.2 419.2,374.4 480.0,380.4 C540.8,386.3 579.2,391.3 640.0,394.4 C700.8,397.4 739.2,398.3 800.0,396.7 C860.8,395.1 899.2,391.3 960.0,385.9 C1020.8,380.6 1059.2,374.4 1120.0,368.4 C1180.8,362.5 1249.6,357.1 1280.0,354.4 L1280.0,720.0 L0,720.0 Z;M0.0,351.4 C30.4,352.6 99.2,353.7 160.0,358.1 C220.8,362.5 259.2,368.2 320.0,374.4 C380.8,380.6 419.2,386.3 480.0,390.7 C540.8,395.1 579.2,397.4 640.0,397.4 C700.8,397.4 739.2,395.1 800.0,390.7 C860.8,386.3 899.2,380.6 960.0,374.4 C1020.8,368.2 1059.2,362.5 1120.0,358.1 C1180.8,353.7 1249.6,352.6 1280.0,351.4 L1280.0,720.0 L0,720.0 Z;M0.0,354.4 C30.4,357.1 99.2,362.5 160.0,368.4 C220.8,374.4 259.2,380.6 320.0,385.9 C380.8,391.3 419.2,395.1 480.0,396.7 C540.8,398.3 579.2,397.4 640.0,394.4 C700.8,391.3 739.2,386.3 800.0,380.4 C860.8,374.4 899.2,368.2 960.0,362.9 C1020.8,357.5 1059.2,353.7 1120.0,352.1 C1180.8,350.5 1249.6,354.0 1280.0,354.4 L1280.0,720.0 L0,720.0 Z;M0.0,362.9 C30.4,366.2 99.2,374.4 160.0,380.4 C220.8,386.3 259.2,391.3 320.0,394.4 C380.8,397.4 419.2,398.3 480.0,396.7 C540.8,395.1 579.2,391.3 640.0,385.9 C700.8,380.6 739.2,374.4 800.0,368.4 C860.8,362.5 899.2,357.5 960.0,354.4 C1020.8,351.4 1059.2,350.5 1120.0,352.1 C1180.8,353.7 1249.6,360.8 1280.0,362.9 L1280.0,720.0 L0,720.0 Z;M0.0,374.4 C30.4,377.5 99.2,386.3 160.0,390.7 C220.8,395.1 259.2,397.4 320.0,397.4 C380.8,397.4 419.2,395.1 480.0,390.7 C540.8,386.3 579.2,380.6 640.0,374.4 C700.8,368.2 739.2,362.5 800.0,358.1 C860.8,353.7 899.2,351.4 960.0,351.4 C1020.8,351.4 1059.2,353.7 1120.0,358.1 C1180.8,362.5 1249.6,371.3 1280.0,374.4 L1280.0,720.0 L0,720.0 Z";
      const W2 = "M0.0,464.6 C30.4,464.8 99.2,467.2 160.0,465.4 C220.8,463.5 259.2,459.9 320.0,455.0 C380.8,450.1 419.2,444.7 480.0,439.6 C540.8,434.5 579.2,430.5 640.0,428.2 C700.8,425.9 739.2,425.6 800.0,427.4 C860.8,429.3 899.2,432.9 960.0,437.8 C1020.8,442.7 1059.2,448.1 1120.0,453.2 C1180.8,458.3 1249.6,462.5 1280.0,464.6 L1280.0,720.0 L0,720.0 Z;M0.0,466.5 C30.4,465.1 99.2,463.5 160.0,459.4 C220.8,455.3 259.2,450.1 320.0,444.7 C380.8,439.3 419.2,434.5 480.0,431.0 C540.8,427.5 579.2,425.9 640.0,426.3 C700.8,426.8 739.2,429.3 800.0,433.4 C860.8,437.5 899.2,442.7 960.0,448.1 C1020.8,453.5 1059.2,458.3 1120.0,461.8 C1180.8,465.3 1249.6,465.6 1280.0,466.5 L1280.0,720.0 L0,720.0 Z;M0.0,463.0 C30.4,460.5 99.2,455.3 160.0,450.0 C220.8,444.6 259.2,439.3 320.0,434.9 C380.8,430.4 419.2,427.5 480.0,426.6 C540.8,425.6 579.2,426.8 640.0,429.8 C700.8,432.9 739.2,437.5 800.0,442.8 C860.8,448.2 899.2,453.5 960.0,457.9 C1020.8,462.4 1059.2,465.3 1120.0,466.2 C1180.8,467.2 1249.6,463.6 1280.0,463.0 L1280.0,720.0 L0,720.0 Z;M0.0,455.0 C30.4,452.1 99.2,444.7 160.0,439.6 C220.8,434.5 259.2,430.5 320.0,428.2 C380.8,425.9 419.2,425.6 480.0,427.4 C540.8,429.3 579.2,432.9 640.0,437.8 C700.8,442.7 739.2,448.1 800.0,453.2 C860.8,458.3 899.2,462.3 960.0,464.6 C1020.8,466.9 1059.2,467.2 1120.0,465.4 C1180.8,463.5 1249.6,457.0 1280.0,455.0 L1280.0,720.0 L0,720.0 Z;M0.0,444.7 C30.4,442.1 99.2,434.5 160.0,431.0 C220.8,427.5 259.2,425.9 320.0,426.3 C380.8,426.8 419.2,429.3 480.0,433.4 C540.8,437.5 579.2,442.7 640.0,448.1 C700.8,453.5 739.2,458.3 800.0,461.8 C860.8,465.3 899.2,466.9 960.0,466.5 C1020.8,466.0 1059.2,463.5 1120.0,459.4 C1180.8,455.3 1249.6,447.5 1280.0,444.7 L1280.0,720.0 L0,720.0 Z;M0.0,434.9 C30.4,433.3 99.2,427.5 160.0,426.6 C220.8,425.6 259.2,426.8 320.0,429.8 C380.8,432.9 419.2,437.5 480.0,442.8 C540.8,448.2 579.2,453.5 640.0,457.9 C700.8,462.4 739.2,465.3 800.0,466.2 C860.8,467.2 899.2,466.0 960.0,463.0 C1020.8,459.9 1059.2,455.3 1120.0,450.0 C1180.8,444.6 1249.6,437.8 1280.0,434.9 L1280.0,720.0 L0,720.0 Z;M0.0,428.2 C30.4,428.0 99.2,425.6 160.0,427.4 C220.8,429.3 259.2,432.9 320.0,437.8 C380.8,442.7 419.2,448.1 480.0,453.2 C540.8,458.3 579.2,462.3 640.0,464.6 C700.8,466.9 739.2,467.2 800.0,465.4 C860.8,463.5 899.2,459.9 960.0,455.0 C1020.8,450.1 1059.2,444.7 1120.0,439.6 C1180.8,434.5 1249.6,430.3 1280.0,428.2 L1280.0,720.0 L0,720.0 Z;M0.0,426.3 C30.4,427.7 99.2,429.3 160.0,433.4 C220.8,437.5 259.2,442.7 320.0,448.1 C380.8,453.5 419.2,458.3 480.0,461.8 C540.8,465.3 579.2,466.9 640.0,466.5 C700.8,466.0 739.2,463.5 800.0,459.4 C860.8,455.3 899.2,450.1 960.0,444.7 C1020.8,439.3 1059.2,434.5 1120.0,431.0 C1180.8,427.5 1249.6,427.2 1280.0,426.3 L1280.0,720.0 L0,720.0 Z;M0.0,429.8 C30.4,432.3 99.2,437.5 160.0,442.8 C220.8,448.2 259.2,453.5 320.0,457.9 C380.8,462.4 419.2,465.3 480.0,466.2 C540.8,467.2 579.2,466.0 640.0,463.0 C700.8,459.9 739.2,455.3 800.0,450.0 C860.8,444.6 899.2,439.3 960.0,434.9 C1020.8,430.4 1059.2,427.5 1120.0,426.6 C1180.8,425.6 1249.6,429.2 1280.0,429.8 L1280.0,720.0 L0,720.0 Z;M0.0,437.8 C30.4,440.7 99.2,448.1 160.0,453.2 C220.8,458.3 259.2,462.3 320.0,464.6 C380.8,466.9 419.2,467.2 480.0,465.4 C540.8,463.5 579.2,459.9 640.0,455.0 C700.8,450.1 739.2,444.7 800.0,439.6 C860.8,434.5 899.2,430.5 960.0,428.2 C1020.8,425.9 1059.2,425.6 1120.0,427.4 C1180.8,429.3 1249.6,435.8 1280.0,437.8 L1280.0,720.0 L0,720.0 Z;M0.0,448.1 C30.4,450.7 99.2,458.3 160.0,461.8 C220.8,465.3 259.2,466.9 320.0,466.5 C380.8,466.0 419.2,463.5 480.0,459.4 C540.8,455.3 579.2,450.1 640.0,444.7 C700.8,439.3 739.2,434.5 800.0,431.0 C860.8,427.5 899.2,425.9 960.0,426.3 C1020.8,426.8 1059.2,429.3 1120.0,433.4 C1180.8,437.5 1249.6,445.3 1280.0,448.1 L1280.0,720.0 L0,720.0 Z;M0.0,457.9 C30.4,459.5 99.2,465.3 160.0,466.2 C220.8,467.2 259.2,466.0 320.0,463.0 C380.8,459.9 419.2,455.3 480.0,450.0 C540.8,444.6 579.2,439.3 640.0,434.9 C700.8,430.4 739.2,427.5 800.0,426.6 C860.8,425.6 899.2,426.8 960.0,429.8 C1020.8,432.9 1059.2,437.5 1120.0,442.8 C1180.8,448.2 1249.6,455.0 1280.0,457.9 L1280.0,720.0 L0,720.0 Z;M0.0,464.6 C30.4,464.8 99.2,467.2 160.0,465.4 C220.8,463.5 259.2,459.9 320.0,455.0 C380.8,450.1 419.2,444.7 480.0,439.6 C540.8,434.5 579.2,430.5 640.0,428.2 C700.8,425.9 739.2,425.6 800.0,427.4 C860.8,429.3 899.2,432.9 960.0,437.8 C1020.8,442.7 1059.2,448.1 1120.0,453.2 C1180.8,458.3 1249.6,462.5 1280.0,464.6 L1280.0,720.0 L0,720.0 Z";
      const W3 = "M0.0,529.4 C30.4,526.8 99.2,520.4 160.0,515.5 C220.8,510.5 259.2,506.2 320.0,503.3 C380.8,500.3 419.2,499.1 480.0,499.9 C540.8,500.7 579.2,503.3 640.0,507.4 C700.8,511.5 739.2,516.4 800.0,521.3 C860.8,526.3 899.2,530.6 960.0,533.5 C1020.8,536.5 1059.2,537.7 1120.0,536.9 C1180.8,536.1 1249.6,530.8 1280.0,529.4 L1280.0,720.0 L0,720.0 Z;M0.0,520.4 C30.4,517.7 99.2,510.5 160.0,506.6 C220.8,502.7 259.2,500.3 320.0,499.8 C380.8,499.3 419.2,500.7 480.0,503.9 C540.8,507.0 579.2,511.4 640.0,516.4 C700.8,521.4 739.2,526.3 800.0,530.2 C860.8,534.1 899.2,536.5 960.0,537.0 C1020.8,537.5 1059.2,536.1 1120.0,532.9 C1180.8,529.8 1249.6,522.7 1280.0,520.4 L1280.0,720.0 L0,720.0 Z;M0.0,510.8 C30.4,508.9 99.2,502.7 160.0,500.9 C220.8,499.1 259.2,499.3 320.0,501.3 C380.8,503.3 419.2,507.0 480.0,511.7 C540.8,516.4 579.2,521.4 640.0,526.0 C700.8,530.6 739.2,534.1 800.0,535.9 C860.8,537.7 899.2,537.5 960.0,535.5 C1020.8,533.5 1059.2,529.8 1120.0,525.1 C1180.8,520.4 1249.6,513.5 1280.0,510.8 L1280.0,720.0 L0,720.0 Z;M0.0,503.3 C30.4,502.6 99.2,499.1 160.0,499.9 C220.8,500.7 259.2,503.3 320.0,507.4 C380.8,511.5 419.2,516.4 480.0,521.3 C540.8,526.3 579.2,530.6 640.0,533.5 C700.8,536.5 739.2,537.7 800.0,536.9 C860.8,536.1 899.2,533.5 960.0,529.4 C1020.8,525.3 1059.2,520.4 1120.0,515.5 C1180.8,510.5 1249.6,505.6 1280.0,503.3 L1280.0,720.0 L0,720.0 Z;M0.0,499.8 C30.4,500.6 99.2,500.7 160.0,503.9 C220.8,507.0 259.2,511.4 320.0,516.4 C380.8,521.4 419.2,526.3 480.0,530.2 C540.8,534.1 579.2,536.5 640.0,537.0 C700.8,537.5 739.2,536.1 800.0,532.9 C860.8,529.8 899.2,525.4 960.0,520.4 C1020.8,515.4 1059.2,510.5 1120.0,506.6 C1180.8,502.7 1249.6,501.1 1280.0,499.8 L1280.0,720.0 L0,720.0 Z;M0.0,501.3 C30.4,503.3 99.2,507.0 160.0,511.7 C220.8,516.4 259.2,521.4 320.0,526.0 C380.8,530.6 419.2,534.1 480.0,535.9 C540.8,537.7 579.2,537.5 640.0,535.5 C700.8,533.5 739.2,529.8 800.0,525.1 C860.8,520.4 899.2,515.4 960.0,510.8 C1020.8,506.2 1059.2,502.7 1120.0,500.9 C1180.8,499.1 1249.6,501.2 1280.0,501.3 L1280.0,720.0 L0,720.0 Z;M0.0,507.4 C30.4,510.0 99.2,516.4 160.0,521.3 C220.8,526.3 259.2,530.6 320.0,533.5 C380.8,536.5 419.2,537.7 480.0,536.9 C540.8,536.1 579.2,533.5 640.0,529.4 C700.8,525.3 739.2,520.4 800.0,515.5 C860.8,510.5 899.2,506.2 960.0,503.3 C1020.8,500.3 1059.2,499.1 1120.0,499.9 C1180.8,500.7 1249.6,506.0 1280.0,507.4 L1280.0,720.0 L0,720.0 Z;M0.0,516.4 C30.4,519.1 99.2,526.3 160.0,530.2 C220.8,534.1 259.2,536.5 320.0,537.0 C380.8,537.5 419.2,536.1 480.0,532.9 C540.8,529.8 579.2,525.4 640.0,520.4 C700.8,515.4 739.2,510.5 800.0,506.6 C860.8,502.7 899.2,500.3 960.0,499.8 C1020.8,499.3 1059.2,500.7 1120.0,503.9 C1180.8,507.0 1249.6,514.1 1280.0,516.4 L1280.0,720.0 L0,720.0 Z;M0.0,526.0 C30.4,527.9 99.2,534.1 160.0,535.9 C220.8,537.7 259.2,537.5 320.0,535.5 C380.8,533.5 419.2,529.8 480.0,525.1 C540.8,520.4 579.2,515.4 640.0,510.8 C700.8,506.2 739.2,502.7 800.0,500.9 C860.8,499.1 899.2,499.3 960.0,501.3 C1020.8,503.3 1059.2,507.0 1120.0,511.7 C1180.8,516.4 1249.6,523.3 1280.0,526.0 L1280.0,720.0 L0,720.0 Z;M0.0,533.5 C30.4,534.2 99.2,537.7 160.0,536.9 C220.8,536.1 259.2,533.5 320.0,529.4 C380.8,525.3 419.2,520.4 480.0,515.5 C540.8,510.5 579.2,506.2 640.0,503.3 C700.8,500.3 739.2,499.1 800.0,499.9 C860.8,500.7 899.2,503.3 960.0,507.4 C1020.8,511.5 1059.2,516.4 1120.0,521.3 C1180.8,526.3 1249.6,531.2 1280.0,533.5 L1280.0,720.0 L0,720.0 Z;M0.0,537.0 C30.4,536.2 99.2,536.1 160.0,532.9 C220.8,529.8 259.2,525.4 320.0,520.4 C380.8,515.4 419.2,510.5 480.0,506.6 C540.8,502.7 579.2,500.3 640.0,499.8 C700.8,499.3 739.2,500.7 800.0,503.9 C860.8,507.0 899.2,511.4 960.0,516.4 C1020.8,521.4 1059.2,526.3 1120.0,530.2 C1180.8,534.1 1249.6,535.7 1280.0,537.0 L1280.0,720.0 L0,720.0 Z;M0.0,535.5 C30.4,533.5 99.2,529.8 160.0,525.1 C220.8,520.4 259.2,515.4 320.0,510.8 C380.8,506.2 419.2,502.7 480.0,500.9 C540.8,499.1 579.2,499.3 640.0,501.3 C700.8,503.3 739.2,507.0 800.0,511.7 C860.8,516.4 899.2,521.4 960.0,526.0 C1020.8,530.6 1059.2,534.1 1120.0,535.9 C1180.8,537.7 1249.6,535.6 1280.0,535.5 L1280.0,720.0 L0,720.0 Z;M0.0,529.4 C30.4,526.8 99.2,520.4 160.0,515.5 C220.8,510.5 259.2,506.2 320.0,503.3 C380.8,500.3 419.2,499.1 480.0,499.9 C540.8,500.7 579.2,503.3 640.0,507.4 C700.8,511.5 739.2,516.4 800.0,521.3 C860.8,526.3 899.2,530.6 960.0,533.5 C1020.8,536.5 1059.2,537.7 1120.0,536.9 C1180.8,536.1 1249.6,530.8 1280.0,529.4 L1280.0,720.0 L0,720.0 Z";
      const KS = '0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1';
      const W1s=W1.split(';')[0], W2s=W2.split(';')[0], W3s=W3.split(';')[0];
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
  <defs>
    <linearGradient id="${uid}g1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a1}" stop-opacity="0"/>
      <stop offset="1" stop-color="${a2}" stop-opacity="0.38"/>
    </linearGradient>
    <linearGradient id="${uid}g2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a1}" stop-opacity="0.06"/>
      <stop offset="1" stop-color="${a1}" stop-opacity="0.32"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${h*.5}" width="${w}" height="${h*.5}" fill="url(#${uid}g1)"/>
  <path d="${W1s}" fill="${a1}" opacity=".11">
    ${doAnimate?`<animate attributeName="d" dur="8s" repeatCount="indefinite" calcMode="spline" keySplines="${KS}" values="${W1}"/>`:''}
  </path>
  <path d="${W2s}" fill="${a1}" opacity=".16">
    ${doAnimate?`<animate attributeName="d" dur="11s" repeatCount="indefinite" calcMode="spline" keySplines="${KS}" values="${W2}"/>`:''}
  </path>
  <path d="${W3s}" fill="url(#${uid}g2)" opacity=".9">
    ${doAnimate?`<animate attributeName="d" dur="7s" repeatCount="indefinite" calcMode="spline" keySplines="${KS}" values="${W3}"/>`:''}
  </path>
  <circle cx="${w*.22}" cy="${h*.79}" r="${w*.005}" opacity="0" fill="${a1}">
    ${doAnimate?`<animate attributeName="cy" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines="0.3 0 0.7 1" values="${h*.79};${h*.56}"/><animate attributeName="opacity" dur="4s" repeatCount="indefinite" keyTimes="0;0.08;0.65;1" values="0;0.5;0.4;0"/>`:''}
  </circle>
  <circle cx="${w*.5}" cy="${h*.83}" r="${w*.0035}" opacity="0" fill="${a2}">
    ${doAnimate?`<animate attributeName="cy" dur="5.5s" repeatCount="indefinite" begin="1.5s" calcMode="spline" keySplines="0.3 0 0.7 1" values="${h*.83};${h*.59}"/><animate attributeName="opacity" dur="5.5s" repeatCount="indefinite" begin="1.5s" keyTimes="0;0.08;0.7;1" values="0;0.45;0.35;0"/>`:''}
  </circle>
  <circle cx="${w*.72}" cy="${h*.76}" r="${w*.004}" opacity="0" fill="${a1}">
    ${doAnimate?`<animate attributeName="cy" dur="3.8s" repeatCount="indefinite" begin="3s" calcMode="spline" keySplines="0.3 0 0.7 1" values="${h*.76};${h*.55}"/><animate attributeName="opacity" dur="3.8s" repeatCount="indefinite" begin="3s" keyTimes="0;0.1;0.65;1" values="0;0.42;0.32;0"/>`:''}
  </circle>
  <!-- Fish 1 -->
  <g transform="translate(51.2,460.8)">
    <animateTransform attributeName="transform" type="translate"
      dur="9s" repeatCount="indefinite" begin="0s"
      calcMode="spline" keySplines="0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1;0 0 1 1"
      keyTimes="0;0.47;0.5;0.97;1"
      values="51.2 460.8;1152.0 424.8;1152.0 424.8;51.2 460.8;51.2 460.8"/>
    <g transform="scale(1,1)">
      <animateTransform attributeName="transform" type="scale"
        dur="9s" repeatCount="indefinite" begin="0s"
        keyTimes="0;0.469;0.5;0.969;1"
        values="1 1;1 1;-1 1;-1 1;1 1"/>
      <ellipse cx="0" cy="0" rx="28.16" ry="11.52" fill="${a1}" opacity=".72"/>
      <polygon points="-28.16,0 -43.65,-9.79 -43.65,9.79" fill="${a1}" opacity=".5"/>
      <circle cx="15.49" cy="-2.88" r="2.53" fill="${a2}"/>
    </g>
  </g>
  <!-- Fish 2 -->
  <g transform="translate(1126.4,547.2)">
    <animateTransform attributeName="transform" type="translate"
      dur="12s" repeatCount="indefinite" begin="0s"
      calcMode="spline" keySplines="0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1;0 0 1 1"
      keyTimes="0;0.47;0.5;0.97;1"
      values="1126.4 547.2;102.4 511.2;102.4 511.2;1126.4 547.2;1126.4 547.2"/>
    <g transform="scale(-1,1)">
      <animateTransform attributeName="transform" type="scale"
        dur="12s" repeatCount="indefinite" begin="2s"
        keyTimes="0;0.469;0.5;0.969;1"
        values="-1 1;-1 1;1 1;1 1;-1 1"/>
      <ellipse cx="0" cy="0" rx="24.32" ry="10.24" fill="${a2}" opacity=".72"/>
      <polygon points="-24.32,0 -37.70,-8.70 -37.70,8.70" fill="${a2}" opacity=".5"/>
      <circle cx="13.38" cy="-2.56" r="2.25" fill="${a1}"/>
    </g>
  </g>
  <!-- Fish 3 -->
  <g transform="translate(384.0,597.6)">
    <animateTransform attributeName="transform" type="translate"
      dur="10s" repeatCount="indefinite" begin="0s"
      calcMode="spline" keySplines="0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1;0 0 1 1"
      keyTimes="0;0.47;0.5;0.97;1"
      values="384.0 597.6;998.4 568.8;998.4 568.8;384.0 597.6;384.0 597.6"/>
    <g transform="scale(1,1)">
      <animateTransform attributeName="transform" type="scale"
        dur="10s" repeatCount="indefinite" begin="5s"
        keyTimes="0;0.469;0.5;0.969;1"
        values="1 1;1 1;-1 1;-1 1;1 1"/>
      <ellipse cx="0" cy="0" rx="20.48" ry="8.96" fill="${a1}" opacity=".72"/>
      <polygon points="-20.48,0 -31.74,-7.62 -31.74,7.62" fill="${a1}" opacity=".5"/>
      <circle cx="11.26" cy="-2.24" r="1.97" fill="${a2}"/>
    </g>
  </g>
  <!-- Fish 4 -->
  <g transform="translate(832.0,496.8)">
    <animateTransform attributeName="transform" type="translate"
      dur="8s" repeatCount="indefinite" begin="0s"
      calcMode="spline" keySplines="0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1;0 0 1 1"
      keyTimes="0;0.47;0.5;0.97;1"
      values="832.0 496.8;153.6 532.8;153.6 532.8;832.0 496.8;832.0 496.8"/>
    <g transform="scale(-1,1)">
      <animateTransform attributeName="transform" type="scale"
        dur="8s" repeatCount="indefinite" begin="1s"
        keyTimes="0;0.469;0.5;0.969;1"
        values="-1 1;-1 1;1 1;1 1;-1 1"/>
      <ellipse cx="0" cy="0" rx="25.60" ry="10.24" fill="${a2}" opacity=".72"/>
      <polygon points="-25.60,0 -39.68,-8.70 -39.68,8.70" fill="${a2}" opacity=".5"/>
      <circle cx="14.08" cy="-2.56" r="2.25" fill="${a1}"/>
    </g>
  </g>

</svg>`;
    },

    contentSvg(w, h, a1, a2, doAnimate) {
      const uid = 'ocs' + Math.random().toString(36).slice(2,8);
      const WC = "M0.0,597.6 C30.4,601.0 99.2,610.6 160.0,615.4 C220.8,620.2 259.2,622.8 320.0,622.8 C380.8,622.8 419.2,620.2 480.0,615.4 C540.8,610.6 579.2,604.4 640.0,597.6 C700.8,590.8 739.2,584.6 800.0,579.8 C860.8,575.0 899.2,572.4 960.0,572.4 C1020.8,572.4 1059.2,575.0 1120.0,579.8 C1180.8,584.6 1249.6,594.2 1280.0,597.6 L1280.0,720.0 L0,720.0 Z;M0.0,610.2 C30.4,612.4 99.2,620.2 160.0,621.9 C220.8,623.7 259.2,622.8 320.0,619.4 C380.8,616.0 419.2,610.7 480.0,604.1 C540.8,597.6 579.2,590.9 640.0,585.0 C700.8,579.1 739.2,575.0 800.0,573.3 C860.8,571.5 899.2,572.4 960.0,575.8 C1020.8,579.2 1059.2,584.5 1120.0,591.1 C1180.8,597.6 1249.6,606.6 1280.0,610.2 L1280.0,720.0 L0,720.0 Z;M0.0,619.4 C30.4,619.9 99.2,623.7 160.0,621.9 C220.8,620.2 259.2,616.1 320.0,610.2 C380.8,604.3 419.2,597.6 480.0,591.1 C540.8,584.5 579.2,579.2 640.0,575.8 C700.8,572.4 739.2,571.5 800.0,573.3 C860.8,575.0 899.2,579.1 960.0,585.0 C1020.8,590.9 1059.2,597.6 1120.0,604.1 C1180.8,610.7 1249.6,616.5 1280.0,619.4 L1280.0,720.0 L0,720.0 Z;M0.0,622.8 C30.4,621.4 99.2,620.2 160.0,615.4 C220.8,610.6 259.2,604.4 320.0,597.6 C380.8,590.8 419.2,584.6 480.0,579.8 C540.8,575.0 579.2,572.4 640.0,572.4 C700.8,572.4 739.2,575.0 800.0,579.8 C860.8,584.6 899.2,590.8 960.0,597.6 C1020.8,604.4 1059.2,610.6 1120.0,615.4 C1180.8,620.2 1249.6,621.4 1280.0,622.8 L1280.0,720.0 L0,720.0 Z;M0.0,619.4 C30.4,616.5 99.2,610.7 160.0,604.1 C220.8,597.6 259.2,590.9 320.0,585.0 C380.8,579.1 419.2,575.0 480.0,573.3 C540.8,571.5 579.2,572.4 640.0,575.8 C700.8,579.2 739.2,584.5 800.0,591.1 C860.8,597.6 899.2,604.3 960.0,610.2 C1020.8,616.1 1059.2,620.2 1120.0,621.9 C1180.8,623.7 1249.6,619.9 1280.0,619.4 L1280.0,720.0 L0,720.0 Z;M0.0,610.2 C30.4,606.6 99.2,597.6 160.0,591.1 C220.8,584.5 259.2,579.2 320.0,575.8 C380.8,572.4 419.2,571.5 480.0,573.3 C540.8,575.0 579.2,579.1 640.0,585.0 C700.8,590.9 739.2,597.6 800.0,604.1 C860.8,610.7 899.2,616.0 960.0,619.4 C1020.8,622.8 1059.2,623.7 1120.0,621.9 C1180.8,620.2 1249.6,612.4 1280.0,610.2 L1280.0,720.0 L0,720.0 Z;M0.0,597.6 C30.4,594.2 99.2,584.6 160.0,579.8 C220.8,575.0 259.2,572.4 320.0,572.4 C380.8,572.4 419.2,575.0 480.0,579.8 C540.8,584.6 579.2,590.8 640.0,597.6 C700.8,604.4 739.2,610.6 800.0,615.4 C860.8,620.2 899.2,622.8 960.0,622.8 C1020.8,622.8 1059.2,620.2 1120.0,615.4 C1180.8,610.6 1249.6,601.0 1280.0,597.6 L1280.0,720.0 L0,720.0 Z;M0.0,585.0 C30.4,582.8 99.2,575.0 160.0,573.3 C220.8,571.5 259.2,572.4 320.0,575.8 C380.8,579.2 419.2,584.5 480.0,591.1 C540.8,597.6 579.2,604.3 640.0,610.2 C700.8,616.1 739.2,620.2 800.0,621.9 C860.8,623.7 899.2,622.8 960.0,619.4 C1020.8,616.0 1059.2,610.7 1120.0,604.1 C1180.8,597.6 1249.6,588.6 1280.0,585.0 L1280.0,720.0 L0,720.0 Z;M0.0,575.8 C30.4,575.3 99.2,571.5 160.0,573.3 C220.8,575.0 259.2,579.1 320.0,585.0 C380.8,590.9 419.2,597.6 480.0,604.1 C540.8,610.7 579.2,616.0 640.0,619.4 C700.8,622.8 739.2,623.7 800.0,621.9 C860.8,620.2 899.2,616.1 960.0,610.2 C1020.8,604.3 1059.2,597.6 1120.0,591.1 C1180.8,584.5 1249.6,578.7 1280.0,575.8 L1280.0,720.0 L0,720.0 Z;M0.0,572.4 C30.4,573.8 99.2,575.0 160.0,579.8 C220.8,584.6 259.2,590.8 320.0,597.6 C380.8,604.4 419.2,610.6 480.0,615.4 C540.8,620.2 579.2,622.8 640.0,622.8 C700.8,622.8 739.2,620.2 800.0,615.4 C860.8,610.6 899.2,604.4 960.0,597.6 C1020.8,590.8 1059.2,584.6 1120.0,579.8 C1180.8,575.0 1249.6,573.8 1280.0,572.4 L1280.0,720.0 L0,720.0 Z;M0.0,575.8 C30.4,578.7 99.2,584.5 160.0,591.1 C220.8,597.6 259.2,604.3 320.0,610.2 C380.8,616.1 419.2,620.2 480.0,621.9 C540.8,623.7 579.2,622.8 640.0,619.4 C700.8,616.0 739.2,610.7 800.0,604.1 C860.8,597.6 899.2,590.9 960.0,585.0 C1020.8,579.1 1059.2,575.0 1120.0,573.3 C1180.8,571.5 1249.6,575.3 1280.0,575.8 L1280.0,720.0 L0,720.0 Z;M0.0,585.0 C30.4,588.6 99.2,597.6 160.0,604.1 C220.8,610.7 259.2,616.0 320.0,619.4 C380.8,622.8 419.2,623.7 480.0,621.9 C540.8,620.2 579.2,616.1 640.0,610.2 C700.8,604.3 739.2,597.6 800.0,591.1 C860.8,584.5 899.2,579.2 960.0,575.8 C1020.8,572.4 1059.2,571.5 1120.0,573.3 C1180.8,575.0 1249.6,582.8 1280.0,585.0 L1280.0,720.0 L0,720.0 Z;M0.0,597.6 C30.4,601.0 99.2,610.6 160.0,615.4 C220.8,620.2 259.2,622.8 320.0,622.8 C380.8,622.8 419.2,620.2 480.0,615.4 C540.8,610.6 579.2,604.4 640.0,597.6 C700.8,590.8 739.2,584.6 800.0,579.8 C860.8,575.0 899.2,572.4 960.0,572.4 C1020.8,572.4 1059.2,575.0 1120.0,579.8 C1180.8,584.6 1249.6,594.2 1280.0,597.6 L1280.0,720.0 L0,720.0 Z";
      const KS = '0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1;0.5 0 0.5 1';
      const WCs = WC.split(';')[0];
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
  <defs>
    <linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a1}" stop-opacity="0"/>
      <stop offset="1" stop-color="${a2}" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <path d="${WCs}" fill="url(#${uid}g)" opacity=".9">
    ${doAnimate?`<animate attributeName="d" dur="7s" repeatCount="indefinite" calcMode="spline" keySplines="${KS}" values="${WC}"/>`:''}
  </path>
  <!-- Jump fish 1 -->
  <g opacity="0" transform="translate(358.4,622.8)">
    <animateTransform attributeName="transform" type="translate"
      dur="8s" repeatCount="indefinite" 
      keyTimes="0;0.70;0.72;0.79;0.86;0.92;0.96;1"
      calcMode="spline" keySplines="0 0 1 1;0.1 0 0.5 1;0.2 0 0.5 1;0.5 0 0.8 1;0.3 0 0.6 1;0.5 0 0.5 1;0 0 1 1"
      values="358.4 622.8;358.4 622.8;358.4 619.7;384.0 338.4;390.4 351.9;377.6 635.3;358.4 625.9;358.4 622.8"/>
    <animate attributeName="opacity"
      dur="8s" repeatCount="indefinite" 
      keyTimes="0;0.70;0.72;0.78;0.85;0.92;0.96;1"
      values="0;0;0.8;0.8;0.6;0.3;0;0"/>
    <g>
      <animateTransform attributeName="transform" type="rotate"
        dur="8s" repeatCount="indefinite" 
        keyTimes="0;0.70;0.79;0.86;0.92;1"
        values="0;0;-42.0;-18.9;5.0;0"/>
      <ellipse cx="0" cy="0" rx="28.16" ry="11.52" fill="${a1}" opacity="1"/>
      <polygon points="-28.16,0 -43.65,-9.79 -43.65,9.79" fill="${a1}" opacity="1"/>
      <circle cx="15.49" cy="-2.88" r="2.53" fill="${a2}"/>
    </g>
  </g>
  <!-- Jump fish 2 -->
  <g opacity="0" transform="translate(793.6,626.4)">
    <animateTransform attributeName="transform" type="translate"
      dur="11s" repeatCount="indefinite" begin="3.5s"
      keyTimes="0;0.70;0.72;0.79;0.86;0.92;0.96;1"
      calcMode="spline" keySplines="0 0 1 1;0.1 0 0.5 1;0.2 0 0.5 1;0.5 0 0.8 1;0.3 0 0.6 1;0.5 0 0.5 1;0 0 1 1"
      values="793.6 626.4;793.6 626.4;793.6 623.3;819.2 331.2;825.6 344.4;812.8 638.9;793.6 629.5;793.6 626.4"/>
    <animate attributeName="opacity"
      dur="11s" repeatCount="indefinite" begin="3.5s"
      keyTimes="0;0.70;0.72;0.78;0.85;0.92;0.96;1"
      values="0;0;0.8;0.8;0.6;0.3;0;0"/>
    <g>
      <animateTransform attributeName="transform" type="rotate"
        dur="11s" repeatCount="indefinite" begin="3.5s"
        keyTimes="0;0.70;0.79;0.86;0.92;1"
        values="0;0;-38.0;-17.1;4.6;0"/>
      <ellipse cx="0" cy="0" rx="24.32" ry="10.24" fill="${a2}" opacity="1"/>
      <polygon points="-24.32,0 -37.70,-8.70 -37.70,8.70" fill="${a2}" opacity="1"/>
      <circle cx="13.38" cy="-2.56" r="2.25" fill="${a1}"/>
    </g>
  </g>
  <!-- Jump fish 3 -->
  <g opacity="0" transform="translate(576.0,615.6)">
    <animateTransform attributeName="transform" type="translate"
      dur="9s" repeatCount="indefinite" begin="7s"
      keyTimes="0;0.70;0.72;0.79;0.86;0.92;0.96;1"
      calcMode="spline" keySplines="0 0 1 1;0.1 0 0.5 1;0.2 0 0.5 1;0.5 0 0.8 1;0.3 0 0.6 1;0.5 0 0.5 1;0 0 1 1"
      values="576.0 615.6;576.0 615.6;576.0 612.5;601.6 345.6;608.0 359.4;595.2 627.9;576.0 618.7;576.0 615.6"/>
    <animate attributeName="opacity"
      dur="9s" repeatCount="indefinite" begin="7s"
      keyTimes="0;0.70;0.72;0.78;0.85;0.92;0.96;1"
      values="0;0;0.8;0.8;0.6;0.3;0;0"/>
    <g>
      <animateTransform attributeName="transform" type="rotate"
        dur="9s" repeatCount="indefinite" begin="7s"
        keyTimes="0;0.70;0.79;0.86;0.92;1"
        values="0;0;-40.0;-18.0;4.8;0"/>
      <ellipse cx="0" cy="0" rx="21.76" ry="8.96" fill="${a1}" opacity="1"/>
      <polygon points="-21.76,0 -33.73,-7.62 -33.73,7.62" fill="${a1}" opacity="1"/>
      <circle cx="11.97" cy="-2.24" r="1.97" fill="${a2}"/>
    </g>
  </g>

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

/** Periodic-element card applet (ported subset of js/02b-periodic.js). */

import PTE_ELEMENTS from './periodic-elements.json';
import PTE_PROP from './periodic-props.json';
import { resolveSchemeColor } from './themes.js';

export { PTE_ELEMENTS };

export const PTE_CAT_LABEL = {
  alkali: 'Щелочной металл',
  'alkaline-earth': 'Щёлочноземельный',
  transition: 'Переходный металл',
  'post-transition': 'Постпереходный металл',
  metalloid: 'Металлоид',
  nonmetal: 'Неметалл',
  halogen: 'Галоген',
  noble: 'Инертный газ',
  lanthanide: 'Лантаноид',
  actinide: 'Актиноид',
};

export const PTE_CAT_COLOR = {
  alkali: '#ef4444',
  'alkaline-earth': '#f97316',
  transition: '#3b82f6',
  'post-transition': '#6366f1',
  metalloid: '#14b8a6',
  nonmetal: '#22c55e',
  halogen: '#a855f7',
  noble: '#06b6d4',
  lanthanide: '#ec4899',
  actinide: '#eab308',
};

export const PTE_CARD_W = 300;
export const PTE_CARD_H = 540;
export const PTE_ICON_SIZE = 200;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hexRgba(hex, a) {
  if (!hex || hex === 'transparent' || hex === 'none') return 'rgba(0,0,0,0)';
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const alpha = a == null || Number.isNaN(+a) ? 1 : Math.max(0, Math.min(1, +a));
  return `rgba(${r},${g},${b},${alpha})`;
}

function luma(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return 0;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function shadeHex(hex, t) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return hex || '#888';
  const mix = (c) => Math.max(0, Math.min(255, Math.round(c * (1 - t))));
  const r = mix(parseInt(h.slice(0, 2), 16));
  const g = mix(parseInt(h.slice(2, 4), 16));
  const b = mix(parseInt(h.slice(4, 6), 16));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function mixHex(hex, other, t) {
  const h = String(hex || '').replace('#', '');
  const o = String(other || '').replace('#', '');
  if (h.length !== 6 || o.length !== 6) return hex || other || '#888888';
  const mix = (a, b) => Math.max(0, Math.min(255, Math.round(a + (b - a) * t)));
  const r = mix(parseInt(h.slice(0, 2), 16), parseInt(o.slice(0, 2), 16));
  const g = mix(parseInt(h.slice(2, 4), 16), parseInt(o.slice(2, 4), 16));
  const b = mix(parseInt(h.slice(4, 6), 16), parseInt(o.slice(4, 6), 16));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export function pteDefaultBgScheme() {
  return { col: 7, row: 7 };
}

export function pteDefaultFgScheme() {
  return { col: 7, row: 0 };
}

function editorThemeDark() {
  if (typeof document === 'undefined') return true;
  return !document.documentElement.classList.contains('light');
}

/** v7.1 _pteResolveColors: scheme 7,7 → diagonal gray–white–gray; other color → solid. */
export function resolvePteColors(d = {}, theme = null) {
  const editorDark = editorThemeDark();
  let bg = d.genBg || '';
  let fg = d.genColor || '';
  const s = d.genBgScheme;
  const useGrad = !!(s && +s.col === 7 && +s.row === 7);
  if (!bg && theme) bg = resolveSchemeColor(d.genBgScheme || pteDefaultBgScheme(), theme) || '';
  if (!bg) bg = editorDark ? '#1e293b' : '#f8fafc';
  // Light UI: default gradient card is always light grey→white→grey, not the dark theme slot.
  if (useGrad && !editorDark) bg = '#f8fafc';
  const isDark = luma(bg) < 0.45;
  if (!fg && theme) fg = resolveSchemeColor(d.genColorScheme || pteDefaultFgScheme(), theme) || '';
  if (!fg) fg = isDark ? '#f8fafc' : '#0f172a';
  if (isDark && luma(fg) < 0.55) fg = '#f8fafc';
  else if (!isDark && luma(fg) > 0.45) fg = '#0f172a';
  const accent = d.accent || (theme && theme.ac1) || (isDark ? '#818cf8' : '#4f46e5');
  let bg88 = bg;
  let bg89 = mixHex(bg, isDark ? '#000000' : '#ffffff', isDark ? 0.42 : 0.62);
  if (useGrad && !editorDark) {
    bg88 = '#dddddd';
    bg89 = '#ffffff';
  } else if (useGrad && theme) {
    const c88 = resolveSchemeColor({ col: 7, row: 7 }, theme);
    const c89 = resolveSchemeColor({ col: 7, row: 8 }, theme);
    if (c88 && c89 && luma(c88) < 0.45 === isDark) {
      bg88 = c88;
      bg89 = c89;
    }
  } else if (useGrad && !theme && !isDark) {
    bg88 = '#dddddd';
    bg89 = '#ffffff';
  }
  return { bg, fg, isDark, accent, bg88, bg89, useGrad };
}

export function pteBySymbol(sym) {
  if (!sym) return null;
  const s = String(sym).trim();
  return PTE_ELEMENTS.find((e) => e.s === s || e.s.toLowerCase() === s.toLowerCase()) || null;
}

export function pteSymbolList() {
  return PTE_ELEMENTS.map((e) => ({ s: e.s, ru: e.ru, en: e.en, Z: e.Z }));
}

function propsFor(el) {
  const row = el && el.Z >= 1 && el.Z <= 118 ? PTE_PROP[el.Z - 1] : null;
  if (!row) return { v: '', den: null, xt: 'unk' };
  return { v: row[0] || '', den: row[1], xt: row[2] || 'unk' };
}

function fmtDensity(den) {
  if (den == null || den === '' || (typeof den === 'number' && Number.isNaN(den))) return '—';
  const n = +den;
  if (n < 0.01) return `${n.toExponential(1)} г/см³`;
  if (n < 1) return `${n.toFixed(3)} г/см³`;
  if (n < 10) return `${n.toFixed(2)} г/см³`;
  return `${n.toFixed(1)} г/см³`;
}

const CUBE = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 1, 0],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
];

function latticePoints(xt) {
  if (xt === 'bcc') return CUBE.concat([[0.5, 0.5, 0.5]]);
  if (xt === 'fcc')
    return CUBE.concat([
      [0.5, 0.5, 0],
      [0.5, 0, 0.5],
      [0, 0.5, 0.5],
      [0.5, 0.5, 1],
      [0.5, 1, 0.5],
      [1, 0.5, 0.5],
    ]);
  if (xt === 'dia')
    return [
      ...CUBE,
      [0.25, 0.25, 0.25],
      [0.75, 0.75, 0.25],
      [0.75, 0.25, 0.75],
      [0.25, 0.75, 0.75],
    ];
  if (xt === 'hcp')
    return [
      [0.15, 0.2, 0.15],
      [0.85, 0.2, 0.15],
      [0.5, 0.2, 0.85],
      [0.15, 0.55, 0.5],
      [0.85, 0.55, 0.5],
      [0.15, 0.9, 0.15],
      [0.85, 0.9, 0.15],
      [0.5, 0.9, 0.85],
    ];
  if (xt === 'hex')
    return [
      [0.25, 0.2, 0.2],
      [0.75, 0.2, 0.2],
      [0.9, 0.2, 0.5],
      [0.75, 0.2, 0.8],
      [0.25, 0.2, 0.8],
      [0.1, 0.2, 0.5],
      [0.25, 0.8, 0.2],
      [0.75, 0.8, 0.2],
      [0.9, 0.8, 0.5],
      [0.75, 0.8, 0.8],
      [0.25, 0.8, 0.8],
      [0.1, 0.8, 0.5],
    ];
  if (xt === 'unk') return [];
  return CUBE;
}

function latticeEdgePairs(xt) {
  const cube = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 4],
    [1, 5],
    [2, 4],
    [2, 6],
    [3, 5],
    [3, 6],
    [4, 7],
    [5, 7],
    [6, 7],
  ].map((ij) => [CUBE[ij[0]], CUBE[ij[1]]]);
  if (xt === 'bcc') {
    const mid = [0.5, 0.5, 0.5];
    return cube.concat(CUBE.map((c) => [c, mid]));
  }
  if (xt === 'fcc' || xt === 'cub' || xt === 'tet' || xt === 'ort' || xt === 'mon') return cube;
  if (xt === 'dia') {
    const t = [
      [0.25, 0.25, 0.25],
      [0.75, 0.75, 0.25],
      [0.75, 0.25, 0.75],
      [0.25, 0.75, 0.75],
    ];
    const bonds = [
      [CUBE[0], t[0]],
      [CUBE[4], t[1]],
      [CUBE[5], t[2]],
      [CUBE[6], t[3]],
      [t[0], t[1]],
      [t[0], t[2]],
      [t[0], t[3]],
      [t[1], t[2]],
      [t[1], t[3]],
      [t[2], t[3]],
    ];
    return cube.concat(bonds);
  }
  if (xt === 'hcp') {
    const p = latticePoints('hcp');
    return [
      [p[0], p[1]],
      [p[1], p[2]],
      [p[2], p[0]],
      [p[5], p[6]],
      [p[6], p[7]],
      [p[7], p[5]],
      [p[0], p[3]],
      [p[1], p[4]],
      [p[2], p[3]],
      [p[2], p[4]],
      [p[3], p[5]],
      [p[4], p[6]],
      [p[3], p[7]],
      [p[4], p[7]],
      [p[0], p[5]],
      [p[1], p[6]],
      [p[2], p[7]],
    ];
  }
  if (xt === 'hex') {
    const p = latticePoints('hex');
    const e = [];
    for (let i = 0; i < 6; i++) {
      e.push([p[i], p[(i + 1) % 6]]);
      e.push([p[6 + i], p[6 + ((i + 1) % 6)]]);
      e.push([p[i], p[6 + i]]);
    }
    return e;
  }
  return cube;
}

function bondHTML(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 0.5) return '';
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const mz = (a[2] + b[2]) / 2;
  const ry = (-Math.atan2(dz, dx) * 180) / Math.PI;
  const rz = (Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)) * 180) / Math.PI;
  return (
    `<b class="bond" style="width:${len.toFixed(1)}px;margin-left:${(-len / 2).toFixed(1)}px;` +
    `transform:translate3d(${mx.toFixed(1)}px,${my.toFixed(1)}px,${mz.toFixed(1)}px) ` +
    `rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)"></b>`
  );
}

function latticeHTML(xt) {
  const pts = latticePoints(xt);
  if (!pts.length) {
    return '<div class="lat-wrap"><div class="lat-empty">решётка неизвестна</div></div>';
  }
  const HALF = 50;
  const to3 = (p) => [(p[0] - 0.5) * 2 * HALF, (p[1] - 0.5) * 2 * HALF, (p[2] - 0.5) * 2 * HALF];
  const edges = latticeEdgePairs(xt)
    .map((pair) => bondHTML(to3(pair[0]), to3(pair[1])))
    .join('');
  const atoms = pts
    .map((p) => {
      const q = to3(p);
      return `<span class="atom-pos" style="transform:translate3d(${q[0].toFixed(1)}px,${q[1].toFixed(1)}px,${q[2].toFixed(1)}px)"><i class="atom-ball"></i></span>`;
    })
    .join('');
  return `<div class="lat-wrap"><div class="lat-stage"><div class="lat-spin">${edges}${atoms}</div></div></div>`;
}

export function getPeriodicHTML(cfg = {}, theme = null) {
  const el = pteBySymbol(cfg.pteSymbol) || pteBySymbol('Fe');
  const isIcon = !!cfg.pteIcon;
  const colors = resolvePteColors(cfg, theme);
  const op = cfg.genBgOp != null ? +cfg.genBgOp : 0.92;
  const blur = cfg.genBgBlur != null ? +cfg.genBgBlur : 0;
  const catLabel = PTE_CAT_LABEL[el.c] || el.c;
  const catCol = PTE_CAT_COLOR[el.c] || colors.accent;
  const mass =
    typeof el.m === 'number'
      ? Number.isInteger(el.m)
        ? String(el.m)
        : el.m.toFixed(el.m < 10 ? 3 : 2)
      : String(el.m);
  const group = el.g != null ? el.g : '—';
  const prop = propsFor(el);
  const densTxt = fmtDensity(prop.den);
  const valTxt = prop.v || '—';
  const histLine = isIcon ? '' : el.y != null ? `Открыл: ${el.d} · ${el.y}` : `Известен: ${el.d}`;
  const bgCss = colors.useGrad
    ? `linear-gradient(135deg,${hexRgba(colors.bg88, op)} 0%,${hexRgba(colors.bg89, op)} 50%,${hexRgba(colors.bg88, op)} 100%)`
    : hexRgba(colors.bg, op);
  const accent = colors.accent;
  const accentMid = shadeHex(accent, 0.25);
  const accentDark = shadeHex(accent, 0.55);
  const fg = colors.fg;
  const bondLo = hexRgba(fg, colors.isDark ? 0.45 : 0.62);
  const bondHi = hexRgba(fg, colors.isDark ? 0.88 : 0.95);
  const blurCss =
    blur > 0 ? `backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);` : '';
  const pad = isIcon ? '12px 14px 12px 20px' : '12px 14px 10px 20px';
  const justify = isIcon ? 'center' : 'flex-start';
  const lattice = isIcon ? '' : latticeHTML(prop.xt);
  const propsBlock = isIcon
    ? ''
    : `<div class="props"><div class="prop"><span class="pl">Валентность</span><span class="pv">${esc(valTxt)}</span></div><div class="prop"><span class="pl">Плотность</span><span class="pv">${esc(densTxt)}</span></div></div>`;
  const refW = isIcon ? PTE_ICON_SIZE : PTE_CARD_W;
  const refH = isIcon ? PTE_ICON_SIZE : PTE_CARD_H;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:transparent;font-family:system-ui,sans-serif;display:block}
.stage{width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
.design{width:${refW}px;height:${refH}px;flex-shrink:0;transform-origin:center center}
.wrap{width:100%;height:100%;border-radius:14px;box-shadow:none}
.card{width:100%;height:100%;padding:${pad};display:flex;flex-direction:column;justify-content:${justify};gap:6px;background:${bgCss};${blurCss}color:${fg};border-radius:14px;position:relative;overflow:hidden}
.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:10px;background:${catCol}}
.top{display:flex;justify-content:space-between;align-items:flex-start}
.z{font-size:14px;font-weight:700;opacity:.7}.mass{font-size:12px;opacity:.6;font-variant-numeric:tabular-nums}
.sym{font-size:56px;font-weight:800;line-height:1;letter-spacing:-.03em;margin:2px 0 0;color:${accent};text-shadow:0 2px 14px ${accent}33}
.name{font-size:18px;font-weight:700;line-height:1.15}.en{font-size:11px;opacity:.55;margin-top:1px}
.meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.chip{font-size:10px;padding:2px 7px;border-radius:999px;background:${catCol}22;border:1px solid ${catCol}55}
.props{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
.prop{background:${fg}0d;border:1px solid ${fg}18;border-radius:8px;padding:5px 8px}
.pl{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.04em;opacity:.55;margin-bottom:2px}
.pv{font-size:12px;font-weight:700;font-variant-numeric:tabular-nums}
.lat-wrap{margin-top:8px;display:flex;align-items:center;justify-content:center;min-height:148px}
.lat-stage{width:148px;height:148px;perspective:320px}
.lat-spin{width:148px;height:148px;position:relative;transform-style:preserve-3d;animation:pteSpin 10s linear infinite}
@keyframes pteSpin{from{transform:rotateX(-24deg) rotateY(0)}to{transform:rotateX(-24deg) rotateY(360deg)}}
@keyframes pteFace{from{transform:rotateY(0) rotateX(24deg)}to{transform:rotateY(-360deg) rotateX(24deg)}}
.bond{position:absolute;left:50%;top:50%;height:3.5px;margin-top:-1.75px;border-radius:2px;background:linear-gradient(90deg,${bondLo},${bondHi},${bondLo});box-shadow:0 0 3px ${hexRgba(fg, colors.isDark ? 0.55 : 0.5)};transform-style:preserve-3d;transform-origin:center center;opacity:1;z-index:0}
.atom-pos{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d;z-index:1}
.atom-ball{position:absolute;left:-11px;top:-11px;width:22px;height:22px;border-radius:50%;animation:pteFace 10s linear infinite;box-shadow:inset -5px -6px 12px rgba(0,0,0,.55),1px 4px 10px rgba(0,0,0,.45);
background:radial-gradient(circle at 30% 26%,#fff 0%,rgba(255,255,255,.75) 8%,transparent 40%),radial-gradient(circle at 50% 46%,${accent} 0%,${accentMid} 42%,${accentDark} 78%,#0a0a0a 100%)}
.lat-empty{width:148px;height:148px;display:flex;align-items:center;justify-content:center;font-size:12px;opacity:.45}
.hist{margin-top:auto;padding-top:8px;font-size:10px;line-height:1.35;opacity:.72;border-top:1px solid ${fg}22}
</style></head><body><div class="stage"><div class="design" id="pte-design"><div class="wrap"><div class="card">
<div class="top"><span class="z">${el.Z}</span><span class="mass">${esc(mass)}</span></div>
<div class="sym">${esc(el.s)}</div>
<div class="name">${esc(el.ru)}</div>
<div class="en">${esc(el.en)}</div>
${
  isIcon
    ? ''
    : `<div class="meta"><span class="chip">${esc(catLabel)}</span><span class="chip">период ${el.p}</span><span class="chip">группа ${group}</span></div>`
}
${propsBlock}${lattice}${histLine ? `<div class="hist">${esc(histLine)}</div>` : ''}
</div></div></div></div>
<script>(function(){
var RW=${refW},RH=${refH},design=document.getElementById('pte-design');
function fit(){if(!design)return;var w=document.documentElement.clientWidth||RW,h=document.documentElement.clientHeight||RH;var s=Math.min(w/RW,h/RH);if(!(s>0)||!isFinite(s))s=1;design.style.transform='scale('+s+')';}
fit();window.addEventListener('resize',fit);
})();<\/script></body></html>`;
}

export const PERIODIC_DEFAULTS = {
  pteSymbol: 'Fe',
  pteIcon: false,
  genBg: '',
  genColor: '',
  genBgOp: 0.92,
  genBgBlur: 0,
  genBgScheme: { col: 7, row: 7 },
  genColorScheme: { col: 7, row: 0 },
  w: PTE_CARD_W,
  h: PTE_CARD_H,
};

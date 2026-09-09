/** Flip-card applet HTML — ported from js/02b-flip.js (v7.1 colors + gradient). */

import { resolveSchemeColor } from './themes.js';
import { useUiStore } from '../stores/uiStore.js';

const FLIP_PAD = 15;
const FLIP_FS = 20;
const FLIP_W = 300;
const FLIP_H = 400;
const FLIP_RX = 14;

export const FLIP_DEFAULT_BG_SCHEME = { col: 7, row: 7 };
export const FLIP_DEFAULT_FG_SCHEME = { col: 7, row: 0 };

/** Legacy / import aliases → canonical appletId `flip`. */
const FLIP_ALIASES = new Set([
  'flip',
  'flipcard',
  'flip-card',
  'flip_card',
  'flipcardapplet',
  'flashcard',
  'flash-card',
  'cardflip',
  'перевертыш',
  'перевёртыш',
  'перевертышь',
]);

export function isFlipAppletId(id) {
  if (!id) return false;
  const s = String(id).trim().toLowerCase();
  if (FLIP_ALIASES.has(s)) return true;
  // Loose match for Russian/English labels stored as id
  if (s.includes('переверт') || s.includes('flipcard') || s.includes('flashcard')) return true;
  return false;
}

/** Normalize element so old decks with alternate ids still rebuild. */
export function normalizeFlipApplet(el) {
  if (!el || el.type !== 'applet') return el;
  if (isFlipAppletId(el.appletId) && el.appletId !== 'flip') {
    return { ...el, appletId: 'flip' };
  }
  // Heuristic: flip fields without appletId / wrong id
  if (
    (!el.appletId || !isFlipAppletId(el.appletId)) &&
    (el.flipFrontText != null ||
      el.flipBackText != null ||
      el.flipFrontImg != null ||
      el.flipBackImg != null ||
      (typeof el.appletHtml === 'string' &&
        (el.appletHtml.includes('id="flip-card"') || el.appletHtml.includes("id='flip-card'"))))
  ) {
    return { ...el, appletId: 'flip' };
  }
  return el;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escAttr(s) {
  return esc(s).replace(/'/g, '&#39;');
}

export function flipFontToken(family) {
  const first = String(family || '')
    .split(',')[0]
    .trim()
    .replace(/^["']|["']$/g, '');
  return first;
}

export function flipFontFaceCss(families) {
  const want = new Set();
  (families || []).forEach((f) => {
    const n = flipFontToken(f).toLowerCase();
    if (n) want.add(n);
  });
  if (!want.size || typeof document === 'undefined') return '';
  let out = '';
  try {
    for (let si = 0; si < document.styleSheets.length; si++) {
      let rules;
      try {
        rules = document.styleSheets[si].cssRules || document.styleSheets[si].rules;
      } catch (e) {
        continue;
      }
      if (!rules) continue;
      for (let ri = 0; ri < rules.length; ri++) {
        const rule = rules[ri];
        if (!rule || rule.type !== CSSRule.FONT_FACE_RULE) continue;
        const fam = (rule.style.getPropertyValue('font-family') || '')
          .trim()
          .replace(/^['"]|['"]$/g, '');
        if (fam && want.has(fam.toLowerCase())) out += rule.cssText + '\n';
      }
    }
  } catch (e) {}
  return out;
}

function flipRxPx(w, h) {
  const bw = +w > 0 ? +w : FLIP_W;
  const bh = +h > 0 ? +h : FLIP_H;
  const s = Math.min(bw / FLIP_W, bh / FLIP_H);
  return Math.max(2, Math.min(FLIP_RX, Math.round(FLIP_RX * s)));
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

function mixHex(a, b, t) {
  const ha = String(a || '').replace('#', '');
  const hb = String(b || '').replace('#', '');
  if (ha.length !== 6 || hb.length !== 6) return a;
  const mix = (i) => {
    const ca = parseInt(ha.slice(i, i + 2), 16);
    const cb = parseInt(hb.slice(i, i + 2), 16);
    return Math.round(ca + (cb - ca) * t)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${mix(0)}${mix(2)}${mix(4)}`;
}

function editorThemeDark() {
  try {
    return useUiStore.getState().theme !== 'light';
  } catch (e) {
    return true;
  }
}

/** v7.1 `_flipResolveColors` — scheme 7,7 → diagonal gradient like PTE cards. */
export function resolveFlipColors(d = {}, theme = null) {
  const editorDark = editorThemeDark();
  let bg = d.genBg || '';
  let fg = d.genColor || '';
  const s = d.genBgScheme;
  const useGrad = !!(s && +s.col === 7 && +s.row === 7);
  if (!bg && theme) bg = resolveSchemeColor(d.genBgScheme || FLIP_DEFAULT_BG_SCHEME, theme) || '';
  if (!bg) bg = editorDark ? '#1e293b' : '#f8fafc';
  if (useGrad && !editorDark) bg = '#f8fafc';
  const isDark = luma(bg) < 0.45;
  if (!fg && theme) fg = resolveSchemeColor(d.genColorScheme || FLIP_DEFAULT_FG_SCHEME, theme) || '';
  if (!fg) fg = isDark ? '#f8fafc' : '#0f172a';
  if (isDark && luma(fg) < 0.55) fg = '#f8fafc';
  else if (!isDark && luma(fg) > 0.45) fg = '#0f172a';
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
  return { bg, fg, isDark, bg88, bg89, useGrad };
}

function resolveImgSrc(src) {
  if (!src) return '';
  const s = String(src).trim();
  if (!s) return '';
  if (/^(data:|blob:|https?:)/i.test(s)) return s;
  try {
    if (typeof location !== 'undefined' && location.href) return new URL(s, location.href).href;
  } catch (e) {}
  return s;
}

function faceInner(text, img) {
  const hasTxt = !!(text && String(text).trim());
  const hasImg = !!(img && String(img).trim());
  const mode = hasTxt && hasImg ? 'both' : hasImg ? 'img' : hasTxt ? 'txt' : 'empty';
  let html = `<div class="face-clip"><div class="inner mode-${mode}">`;
  if (hasImg) {
    html += `<div class="img-wrap" style="background-image:url('${escAttr(resolveImgSrc(img))}')"></div>`;
  }
  if (hasTxt) html += `<div class="txt">${esc(text).replace(/\n/g, '<br>')}</div>`;
  html += '</div></div>';
  return html;
}

function txtCss(side, font, fs) {
  const size = +fs > 0 ? +fs : FLIP_FS;
  const fam = flipFontToken(font);
  let css = `.face.${side} .txt{font-size:${size}px!important;`;
  if (fam) css += `font-family:'${escAttr(fam)}',system-ui,sans-serif!important;`;
  css += '}';
  return css;
}

export function getFlipHTML(cfg = {}, theme = null) {
  const colors = resolveFlipColors(cfg, theme);
  const op = cfg.genBgOp != null ? +cfg.genBgOp : 0.92;
  const bgCss = colors.useGrad
    ? `linear-gradient(135deg,${hexRgba(colors.bg88, op)} 0%,${hexRgba(colors.bg89, op)} 50%,${hexRgba(colors.bg88, op)} 100%)`
    : hexRgba(colors.bg, op);
  const fg = colors.fg;
  const flipped = cfg.flipFace === 'back';
  const front = faceInner(cfg.flipFrontText, cfg.flipFrontImg);
  const back = faceInner(cfg.flipBackText, cfg.flipBackImg);
  const pad = FLIP_PAD;
  const rx = flipRxPx(cfg.w, cfg.h);
  const sideCss =
    txtCss('front', cfg.flipFrontFont, cfg.flipFrontFs) +
    txtCss('back', cfg.flipBackFont, cfg.flipBackFs);
  const faceCss = flipFontFaceCss([cfg.flipFrontFont, cfg.flipBackFont]);
  const base =
    typeof location !== 'undefined' && location.href
      ? location.href.replace(/[^/\\]*$/, '')
      : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><base href="${escAttr(base)}"><style>
${faceCss}
*{box-sizing:border-box;margin:0;padding:0;cursor:pointer!important;user-select:none!important}
html,body{width:100%;height:100%;overflow:hidden;background:transparent;font-family:system-ui,sans-serif;display:block}
.scene{position:relative;width:100%;height:100%;perspective:1400px;overflow:hidden;border-radius:${rx}px;background:transparent}
.card{position:relative;width:100%;height:100%;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;transform:rotateY(0deg) scale(1);transform-origin:50% 50%;border-radius:${rx}px;background:transparent}
.card.flipped{transform:rotateY(180deg) scale(1)}
.face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;border-radius:${rx}px;color:${fg}}
.face.front{transform:rotateY(0deg)}.face.back{transform:rotateY(180deg)}
.face-clip{width:100%;height:100%;border-radius:${rx}px;overflow:hidden;background:${bgCss}}
.inner{position:relative;width:100%;height:100%;padding:clamp(2px,4%,${pad}px);box-sizing:border-box;display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:clamp(2px,2%,${Math.max(4, Math.round(pad * 0.6))}px);min-height:0}
.img-wrap{flex:1 1 auto;min-height:0;width:100%;background-position:center;background-repeat:no-repeat;background-size:contain}
.inner.mode-img .img-wrap{height:100%}
.txt{flex:0 0 auto;max-width:100%;font-size:${FLIP_FS}px;line-height:1.35;text-align:center;color:${fg};word-break:break-word;overflow-wrap:anywhere;pointer-events:none}
.inner.mode-both .txt{max-height:45%;overflow:hidden}
.inner.mode-txt{justify-content:center;align-items:center}
${sideCss}
</style></head><body>
<div class="scene"><div class="card${flipped ? ' flipped' : ''}" id="flip-card" style="transform:rotateY(${flipped ? 180 : 0}deg) scale(1)">
<div class="face front">${front}</div><div class="face back">${back}</div>
</div></div>
<script>
(function(){
  var card=document.getElementById('flip-card'),busy=false;
  function flipTo(back){
    if(!card||busy)return;busy=true;
    var from=card.classList.contains('flipped')?180:0,to=back?180:0;
    if(from===to){busy=false;return;}
    card.classList.toggle('flipped',!!back);
    var mid=(from+to)/2;
    var anim=card.animate([
      {transform:'rotateY('+from+'deg) scale(1)'},
      {transform:'rotateY('+mid+'deg) scale(0.88)'},
      {transform:'rotateY('+to+'deg) scale(1)'}
    ],{duration:650,easing:'cubic-bezier(0.4,0.05,0.2,1)',fill:'forwards'});
    anim.finished.then(function(){busy=false;}).catch(function(){busy=false;});
  }
  function toggle(){flipTo(!card.classList.contains('flipped'));}
  document.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggle();});
  window.addEventListener('message',function(e){
    try{var d=e.data||{};if(d.type==='flipToggle')toggle();else if(d.type==='flipSet')flipTo(!!d.back);}catch(err){}
  });
})();
<\/script></body></html>`;
}

export function flipCfgFromEl(d) {
  return {
    flipFace: d.flipFace === 'back' ? 'back' : 'front',
    flipFrontText: d.flipFrontText || '',
    flipFrontImg: d.flipFrontImg || '',
    flipBackText: d.flipBackText || '',
    flipBackImg: d.flipBackImg || '',
    flipFrontFont: d.flipFrontFont || '',
    flipBackFont: d.flipBackFont || '',
    flipFrontFs: d.flipFrontFs != null ? +d.flipFrontFs : FLIP_FS,
    flipBackFs: d.flipBackFs != null ? +d.flipBackFs : FLIP_FS,
    w: d.w,
    h: d.h,
    genBg: d.genBg || '',
    genColor: d.genColor || '',
    genBgOp: d.genBgOp != null ? d.genBgOp : 0.92,
    genBgScheme: d.genBgScheme,
    genColorScheme: d.genColorScheme,
  };
}

export const FLIP_DEFAULTS = {
  flipFace: 'front',
  flipFrontText: 'Лицо',
  flipBackText: 'Оборот',
  flipFrontImg: '',
  flipBackImg: '',
  flipFrontFont: '',
  flipBackFont: '',
  flipFrontFs: FLIP_FS,
  flipBackFs: FLIP_FS,
  genBg: '',
  genColor: '',
  genBgOp: 0.92,
  genBgScheme: { ...FLIP_DEFAULT_BG_SCHEME },
  genColorScheme: { ...FLIP_DEFAULT_FG_SCHEME },
  w: FLIP_W,
  h: FLIP_H,
};

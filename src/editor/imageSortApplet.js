/** Image-sort applet — pin markers on the slide, pick labels in slideshow, check answers. */

import { resolveSchemeColor } from './themes.js';

export const IMAGE_SORT_DEFAULTS = {
  w: 200,
  h: 56,
  sortMarkers: [],
  sortBtnLabel: 'Проверить',
  sortReplayLabel: 'Обновить',
  sortOkText: 'Успех',
  sortFailText: 'Неудача',
  sortBtnLabelEn: 'Check',
  sortReplayLabelEn: 'Reset',
  sortOkTextEn: 'Success',
  sortFailTextEn: 'Try again',
  sortBtnColor: '',
  sortBtnColorScheme: { col: 0, row: 4 },
};

/** Icon library id 107 — map pin. Color follows button / scheme. */
export const IMAGE_SORT_PIN_ICON_ID = '107';
export const IMAGE_SORT_PIN_PATH =
  'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z';
export const IMAGE_SORT_PIN_COLOR = '#3b82f6';
export const IMAGE_SORT_PIN_W = 40;
export const IMAGE_SORT_PIN_H = 48;

/** Pin / button accent: solid color, else scheme slot, else theme accent. */
export function resolveImageSortAccent(applet, theme) {
  const solid = applet?.sortBtnColor && String(applet.sortBtnColor).trim();
  if (solid) return solid;
  const scheme =
    applet?.sortBtnColorScheme ||
    (!applet?.sortBtnColor ? IMAGE_SORT_DEFAULTS.sortBtnColorScheme : null);
  const fromScheme = resolveSchemeColor(scheme, theme);
  if (fromScheme) return fromScheme;
  return (theme && (theme.ac1 || theme.accent)) || IMAGE_SORT_PIN_COLOR;
}

let _markerSeq = 0;
export function newImageSortMarkerId() {
  _markerSeq += 1;
  return `ism${Date.now().toString(36)}${_markerSeq}`;
}

export function findImageSortApplet(slide) {
  return (slide?.els || []).find((e) => e && e.type === 'applet' && e.appletId === 'imagesort') || null;
}

export function getImageSortMarkers(applet) {
  const list = Array.isArray(applet?.sortMarkers) ? applet.sortMarkers : [];
  return list
    .filter((m) => m && m.id)
    .map((m) => ({
      id: String(m.id),
      x: Math.round(+m.x || 0),
      y: Math.round(+m.y || 0),
      answer: String(m.answer ?? ''),
    }));
}

/** Interpret typed `\\n` as a real line break for display / matching. */
export function normalizeImageSortAnswer(s) {
  return String(s ?? '')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();
}

/** Canonical key so duplicate answers (вирус / вирус) collapse to one option. */
export function imageSortAnswerKey(s) {
  return normalizeImageSortAnswer(s);
}

/** All unique non-empty answers for the substitution list (stable order by first occurrence). */
export function imageSortOptionList(applet) {
  const seen = new Set();
  const out = [];
  getImageSortMarkers(applet).forEach((m) => {
    const raw = String(m.answer ?? '');
    const key = imageSortAnswerKey(raw);
    if (!key || seen.has(key)) return;
    seen.add(key);
    // Keep first raw spelling; display layer turns `\\n` into a break.
    out.push(raw);
  });
  return out;
}

export function shuffleImageSortOptions(options) {
  const arr = [...(options || [])];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

export function clampImageSortMarker(x, y, canvasW, canvasH) {
  const W = Math.max(1, +canvasW || 1);
  const H = Math.max(1, +canvasH || 1);
  const pad = 8;
  return {
    x: Math.min(W - pad, Math.max(pad, Math.round(+x || 0))),
    y: Math.min(H - pad, Math.max(pad + 20, Math.round(+y || 0))),
  };
}

export function defaultImageSortMarkerPos(applet, canvasW, canvasH, index = 0) {
  const markers = getImageSortMarkers(applet);
  const i = index != null ? index : markers.length;
  const W = Math.max(120, +canvasW || 1200);
  const H = Math.max(80, +canvasH || 675);
  const col = i % 3;
  const row = Math.floor(i / 3);
  return clampImageSortMarker(
    W * (0.22 + col * 0.28),
    H * (0.28 + row * 0.32),
    W,
    H
  );
}

/** True when every marker with an answer has a matching chosen label. */
export function checkImageSort(applet, choices) {
  const markers = getImageSortMarkers(applet);
  const map = choices && typeof choices === 'object' ? choices : {};
  let any = false;
  for (const m of markers) {
    const want = imageSortAnswerKey(m.answer);
    if (!want) continue;
    any = true;
    const got = imageSortAnswerKey(map[m.id]);
    if (got !== want) return false;
  }
  return any;
}

export function getImageSortHTML(cfg = {}) {
  const label = String(cfg.sortBtnLabel || IMAGE_SORT_DEFAULTS.sortBtnLabel)
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
  const checkRaw = JSON.stringify(String(cfg.sortBtnLabel || IMAGE_SORT_DEFAULTS.sortBtnLabel));
  const replayRaw = JSON.stringify(String(cfg.sortReplayLabel || IMAGE_SORT_DEFAULTS.sortReplayLabel));
  const ac =
    (cfg.sortBtnColor && String(cfg.sortBtnColor).trim()) ||
    (cfg.palette && cfg.palette.ac1) ||
    '#3b82f6';
  const text = (cfg.palette && cfg.palette.text) || '#ffffff';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;user-select:none}
html,body{width:100%;height:100%;background:transparent;overflow:hidden}
button{width:100%;height:100%;border:0;border-radius:10px;cursor:pointer;font-size:clamp(20px,6vw,28px);font-weight:700;
letter-spacing:.02em;background:${ac};color:${text};box-shadow:0 4px 14px ${ac}55;padding:0 12px}
button:active{transform:scale(.98)}
</style></head><body>
<button type="button" id="chk">${label}</button>
<script>
(function(){
  var btn=document.getElementById('chk');
  var checkLabel=${checkRaw};
  var replayLabel=${replayRaw};
  var mode='check';
  function setMode(m,label){
    mode=m==='replay'?'replay':'check';
    btn.textContent=label!=null&&label!==''?String(label):(mode==='replay'?replayLabel:checkLabel);
  }
  btn.onclick=function(){
    try{
      parent.postMessage({type:mode==='replay'?'imageSortReplay':'imageSortCheck'},'*');
    }catch(e){}
  };
  window.addEventListener('message',function(e){
    var d=e&&e.data;
    if(!d||d.type!=='imageSortSetMode')return;
    setMode(d.mode,d.label);
  });
})();
<\/script></body></html>`;
}

export function postImageSortBtnMode(stageEl, applet, mode, label) {
  if (!stageEl || !applet?.id) return;
  let wrap = null;
  try {
    wrap = stageEl.querySelector(`[data-id="${CSS.escape(String(applet.id))}"]`);
  } catch (e) {
    wrap = stageEl.querySelector(`[data-id="${String(applet.id)}"]`);
  }
  const ifr = wrap?.querySelector?.('iframe');
  if (!ifr?.contentWindow) return;
  const fallback =
    mode === 'replay'
      ? applet.sortReplayLabel || IMAGE_SORT_DEFAULTS.sortReplayLabel
      : applet.sortBtnLabel || IMAGE_SORT_DEFAULTS.sortBtnLabel;
  try {
    ifr.contentWindow.postMessage(
      {
        type: 'imageSortSetMode',
        mode: mode === 'replay' ? 'replay' : 'check',
        label: label != null ? label : fallback,
      },
      '*'
    );
  } catch (e) {}
}

/** Inline SVG pin (icon 107 path) for overlays. */
export function imageSortPinSvgMarkup(color = IMAGE_SORT_PIN_COLOR, size = 36) {
  const s = Math.max(16, +size || 36);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path fill="${color}" stroke="${color}" stroke-width="0.6" stroke-linejoin="round" d="${IMAGE_SORT_PIN_PATH}"/></svg>`;
}

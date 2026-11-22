/** Classification applet — sort slide elements into layout zones. */

import { slideElementNumber } from './slideElNum.js';

export { slideElementNumber };

/** Zone grid templates shown before the id editors. */
export const CLASS_LAYOUTS = [
  { id: '2col', cols: 2, rows: 1, labelRu: 'Два столбика', labelEn: 'Two columns' },
  { id: '3col', cols: 3, rows: 1, labelRu: 'Три столбика', labelEn: 'Three columns' },
  { id: '2x2', cols: 2, rows: 2, labelRu: 'Два на два', labelEn: 'Two by two' },
  { id: '2x3', cols: 3, rows: 2, labelRu: 'Две × три', labelEn: 'Two × three' },
];

/** Match Home «2/3 колонки» guide metrics (SlideCanvas). */
export const CLASS_GUIDE_MARGIN = 40;
export const CLASS_GUIDE_GUTTER = 40;
export const CLASS_GUIDE_TOP_1 = 120;
export const CLASS_GUIDE_TOP_2 = 160;
const CLASS_SNAP_TH = 7;

export const CLASSIFICATION_DEFAULTS = {
  w: 200,
  h: 56,
  classLayout: '2col',
  classZones: ['', ''],
  classLeftIds: '',
  classRightIds: '',
  classOkText: 'Успех',
  classFailText: 'Неудача',
  classBtnLabel: 'Проверить',
  classReplayLabel: 'Обновить',
  /** Palette code «15» — theme accent column 1, tint row 5. */
  classBtnColor: '',
  classBtnColorScheme: { col: 0, row: 4 },
};

function formatClassIds(nums) {
  return [...nums].sort((a, b) => a - b).join(', ');
}

export function getClassLayout(applet) {
  const id = applet?.classLayout || CLASSIFICATION_DEFAULTS.classLayout;
  return CLASS_LAYOUTS.find((L) => L.id === id) || CLASS_LAYOUTS[0];
}

/** Normalize / migrate zone string arrays to the current layout size. */
export function getClassZones(applet) {
  const layout = getClassLayout(applet);
  const n = layout.cols * layout.rows;
  let zones;
  if (Array.isArray(applet?.classZones) && applet.classZones.length) {
    zones = applet.classZones.map((z) => String(z ?? ''));
  } else {
    zones = Array.from({ length: n }, () => '');
    if (applet?.classLeftIds != null) zones[0] = String(applet.classLeftIds);
    if (n > 1 && applet?.classRightIds != null) zones[1] = String(applet.classRightIds);
  }
  while (zones.length < n) zones.push('');
  return zones.slice(0, n);
}

export function classZoneLabel(layout, zi, ru) {
  const L = layout || CLASS_LAYOUTS[0];
  const i = Math.max(0, +zi || 0);
  if (L.id === '2col') {
    return i === 0 ? (ru ? 'Левый' : 'Left') : ru ? 'Правый' : 'Right';
  }
  if (L.id === '3col') {
    return ru ? `Столбик ${i + 1}` : `Column ${i + 1}`;
  }
  if (L.id === '2x2') {
    const names = ru
      ? ['Верх-лево', 'Верх-право', 'Низ-лево', 'Низ-право']
      : ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'];
    return names[i] || (ru ? `Зона ${i + 1}` : `Zone ${i + 1}`);
  }
  if (L.id === '2x3') {
    const row = Math.floor(i / L.cols) + 1;
    const col = (i % L.cols) + 1;
    return ru ? `Ряд ${row}, ст. ${col}` : `Row ${row}, col ${col}`;
  }
  return ru ? `Зона ${i + 1}` : `Zone ${i + 1}`;
}

/** Skip only slide theme decor, page numbers, and the check button itself. */
export function isClassificationRememberSkip(el) {
  if (!el) return true;
  if (el._isDecor) return true;
  if (el.type === 'pagenum') return true;
  if (el.type === 'applet' && el.appletId === 'classification') return true;
  return false;
}

/** Keep the element's box fully inside the slide. */
export function clampClassificationPos(x, y, w, h, canvasW, canvasH) {
  const W = Math.max(1, +canvasW || 1);
  const H = Math.max(1, +canvasH || 1);
  const ew = Math.max(1, +w || 1);
  const eh = Math.max(1, +h || 1);
  const maxX = Math.max(0, W - ew);
  const maxY = Math.max(0, H - eh);
  return {
    x: Math.min(maxX, Math.max(0, Math.round(+x || 0))),
    y: Math.min(maxY, Math.max(0, Math.round(+y || 0))),
  };
}

/**
 * Snapshot current element positions into zone id lists.
 * Remembers any object except theme decor, page numbers, and the check button.
 */
export function rememberClassificationIds(els, canvasW, canvasH, applet) {
  const layout = getClassLayout(applet);
  const n = layout.cols * layout.rows;
  const buckets = Array.from({ length: n }, () => []);
  const seen = new Set();
  (els || []).forEach((e) => {
    if (isClassificationRememberSkip(e)) return;
    const num = slideElementNumber(els, e);
    if (!num || seen.has(num)) return;
    seen.add(num);
    const zi = classificationZoneOf(e, null, canvasW, canvasH, layout);
    buckets[zi].push(num);
  });
  const classZones = buckets.map(formatClassIds);
  return {
    classLayout: layout.id,
    classZones,
    classLeftIds: classZones[0] || '',
    classRightIds: classZones[1] || '',
  };
}

/** Parse "1, 3 5;7" → unique positive ints. */
export function parseClassIds(raw) {
  const seen = new Set();
  const out = [];
  String(raw || '')
    .split(/[\s,;]+/)
    .forEach((part) => {
      const n = Math.round(+part);
      if (!Number.isFinite(n) || n < 1 || seen.has(n)) return;
      seen.add(n);
      out.push(n);
    });
  return out;
}

export function findClassificationApplet(slide) {
  return (slide?.els || []).find((e) => e && e.type === 'applet' && e.appletId === 'classification') || null;
}

/** Landscape / 16:9 → vertical midline. Portrait / 9:16 → horizontal midline. (legacy 2-way) */
export function classificationIsVerticalSplit(canvasW, canvasH) {
  return !(+canvasH > +canvasW);
}

/**
 * Guide lines for a classification layout — same look as Home «2/3 колонки»:
 * outer margins, gutters between cells, and title horizontals for single-row layouts.
 */
export function classificationGuideLines(applet, canvasW, canvasH) {
  const L = getClassLayout(applet);
  const W = Math.max(1, +canvasW || 1);
  const H = Math.max(1, +canvasH || 1);
  const M = CLASS_GUIDE_MARGIN;
  const G = CLASS_GUIDE_GUTTER;
  const lines = [];
  lines.push({ t: 'v', pos: M }, { t: 'v', pos: W - M });
  lines.push({ t: 'h', pos: M }, { t: 'h', pos: H - M });

  const contentW = Math.max(0, W - M * 2);
  const contentH = Math.max(0, H - M * 2);
  const cols = Math.max(1, L.cols);
  const rows = Math.max(1, L.rows);
  const colW = Math.max(0, (contentW - (cols - 1) * G) / cols);
  let x = M;
  for (let i = 0; i < cols - 1; i++) {
    x += colW;
    lines.push({ t: 'v', pos: x }, { t: 'v', pos: x + G });
    x += G;
  }
  if (rows > 1) {
    const rowH = Math.max(0, (contentH - (rows - 1) * G) / rows);
    let y = M;
    for (let i = 0; i < rows - 1; i++) {
      y += rowH;
      lines.push({ t: 'h', pos: y }, { t: 'h', pos: y + G });
      y += G;
    }
  } else {
    lines.push({ t: 'h', pos: CLASS_GUIDE_TOP_1 }, { t: 'h', pos: CLASS_GUIDE_TOP_2 });
  }
  return lines;
}

/** Snap translate to classification guide lines (same rules as Home guides). */
export function snapTranslateToClassGuides(x, y, w, h, lines, th = CLASS_SNAP_TH) {
  let nx = x;
  let ny = y;
  const hit = [];
  for (const g of lines || []) {
    if (g.t === 'v') {
      if (Math.abs(nx - g.pos) < th) {
        nx = g.pos;
        hit.push(g);
      } else if (Math.abs(nx + w / 2 - g.pos) < th) {
        nx = g.pos - w / 2;
        hit.push(g);
      } else if (Math.abs(nx + w - g.pos) < th) {
        nx = g.pos - w;
        hit.push(g);
      }
    } else if (Math.abs(ny - g.pos) < th) {
      ny = g.pos;
      hit.push(g);
    } else if (Math.abs(ny + h / 2 - g.pos) < th) {
      ny = g.pos - h / 2;
      hit.push(g);
    } else if (Math.abs(ny + h - g.pos) < th) {
      ny = g.pos - h;
      hit.push(g);
    }
  }
  return { x: nx, y: ny, hit };
}

function zoneIndexFromCenter(cx, cy, layout, canvasW, canvasH) {
  const L = layout || CLASS_LAYOUTS[0];
  const W = Math.max(1, +canvasW || 1);
  const H = Math.max(1, +canvasH || 1);
  const M = CLASS_GUIDE_MARGIN;
  const G = CLASS_GUIDE_GUTTER;
  const cols = Math.max(1, L.cols);
  const rows = Math.max(1, L.rows);
  const contentW = Math.max(0, W - M * 2);
  const contentH = Math.max(0, H - M * 2);
  const colW = Math.max(0, (contentW - (cols - 1) * G) / cols);
  const rowH = Math.max(0, (contentH - (rows - 1) * G) / rows);

  let col = cols - 1;
  let x = M;
  for (let i = 0; i < cols; i++) {
    const midNext = i < cols - 1 ? x + colW + G / 2 : Infinity;
    if (cx < midNext) {
      col = i;
      break;
    }
    x += colW + G;
  }

  let row = 0;
  if (rows > 1) {
    row = rows - 1;
    let y = M;
    for (let i = 0; i < rows; i++) {
      const midNext = i < rows - 1 ? y + rowH + G / 2 : Infinity;
      if (cy < midNext) {
        row = i;
        break;
      }
      y += rowH + G;
    }
  }
  return row * cols + col;
}

/** 0-based zone index from element center (margin + gutter cells). */
export function classificationZoneOf(el, livePos, canvasW, canvasH, layout) {
  const L = layout || CLASS_LAYOUTS[0];
  const pos = livePos && livePos[el.id] != null ? livePos[el.id] : null;
  const x = pos?.x != null ? +pos.x : +el.x || 0;
  const y = pos?.y != null ? +pos.y : +el.y || 0;
  const w = Math.max(1, +el.w || 1);
  const h = Math.max(1, +el.h || 1);
  return zoneIndexFromCenter(x + w / 2, y + h / 2, L, canvasW, canvasH);
}

/** @deprecated Prefer classificationZoneOf — left/right for 2-column layout. */
export function classificationSideOf(el, livePos, canvasW, canvasH) {
  const zi = classificationZoneOf(el, livePos, canvasW, canvasH, CLASS_LAYOUTS[0]);
  return zi === 0 ? 'left' : 'right';
}

/** Element ids that appear in any zone (movable + shuffled). */
export function classificationMovableIds(applet, els) {
  const listed = new Set();
  getClassZones(applet).forEach((raw) => {
    parseClassIds(raw).forEach((n) => listed.add(n));
  });
  const out = new Set();
  (els || []).forEach((e) => {
    if (!e || e._isDecor || e.type === 'pagenum') return;
    if (e.type === 'applet' && e.appletId === 'classification') return;
    const n = slideElementNumber(els, e);
    if (listed.has(n)) out.add(String(e.id));
  });
  return out;
}

/**
 * Scatter movable elements to random free-ish slots across the slide
 * so a new round never starts already sorted.
 * @returns {Record<string,{x:number,y:number}>}
 */
export function shuffleClassificationPositions(els, movableIds, canvasW, canvasH) {
  const items = (els || []).filter((e) => e && movableIds.has(String(e.id)));
  const map = {};
  if (!items.length) return map;

  const W = Math.max(120, +canvasW || 1200);
  const H = Math.max(80, +canvasH || 675);

  function randomSlot(e) {
    const w = Math.max(1, +e.w || 80);
    const h = Math.max(1, +e.h || 60);
    const maxX = Math.max(0, W - w);
    const maxY = Math.max(0, H - h);
    return clampClassificationPos(Math.random() * maxX, Math.random() * maxY, w, h, W, H);
  }

  const slots = items.map((e) => randomSlot(e));

  const authored = items.map((e) => `${Math.round(+e.x || 0)},${Math.round(+e.y || 0)}`);
  let same = true;
  for (let attempt = 0; attempt < 6 && same; attempt++) {
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = slots[i];
      slots[i] = slots[j];
      slots[j] = tmp;
    }
    same = slots.length > 1 && slots.every((p, i) => `${p.x},${p.y}` === authored[i]);
    if (same) {
      items.forEach((e, i) => {
        slots[i] = randomSlot(e);
      });
      same = false;
    }
  }

  items.forEach((e, i) => {
    map[String(e.id)] = clampClassificationPos(slots[i].x, slots[i].y, e.w, e.h, W, H);
  });
  return map;
}

/** True when every listed element sits in its required zone. */
export function checkClassification(applet, els, livePos, canvasW, canvasH) {
  const layout = getClassLayout(applet);
  const zones = getClassZones(applet).map(parseClassIds);
  const expect = new Map();
  let any = false;
  zones.forEach((nums, zi) => {
    nums.forEach((n) => {
      any = true;
      if (!expect.has(n)) expect.set(n, new Set());
      expect.get(n).add(zi);
    });
  });
  if (!any) return false;
  for (let i = 0; i < (els || []).length; i++) {
    const e = els[i];
    if (!e || e._isDecor || e.type === 'pagenum') continue;
    if (e.type === 'applet' && e.appletId === 'classification') continue;
    const n = slideElementNumber(els, e);
    const want = expect.get(n);
    if (!want) continue;
    const zi = classificationZoneOf(e, livePos, canvasW, canvasH, layout);
    if (!want.has(zi)) return false;
  }
  return true;
}

export function getClassificationHTML(cfg = {}) {
  const label = String(cfg.classBtnLabel || CLASSIFICATION_DEFAULTS.classBtnLabel)
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
  const checkRaw = JSON.stringify(String(cfg.classBtnLabel || CLASSIFICATION_DEFAULTS.classBtnLabel));
  const replayRaw = JSON.stringify(String(cfg.classReplayLabel || CLASSIFICATION_DEFAULTS.classReplayLabel));
  const ac =
    (cfg.classBtnColor && String(cfg.classBtnColor).trim()) ||
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
      parent.postMessage({type:mode==='replay'?'classificationReplay':'classificationCheck'},'*');
    }catch(e){}
  };
  window.addEventListener('message',function(e){
    var d=e&&e.data;
    if(!d||d.type!=='classificationSetMode')return;
    setMode(d.mode,d.label);
  });
})();
<\/script></body></html>`;
}

/** Post mode/label into the classification applet iframe inside a stage root. */
export function postClassificationBtnMode(stageEl, applet, mode, label) {
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
      ? applet.classReplayLabel || CLASSIFICATION_DEFAULTS.classReplayLabel
      : applet.classBtnLabel || CLASSIFICATION_DEFAULTS.classBtnLabel;
  try {
    ifr.contentWindow.postMessage(
      { type: 'classificationSetMode', mode: mode === 'replay' ? 'replay' : 'check', label: label != null ? label : fallback },
      '*',
    );
  } catch (e) {}
}

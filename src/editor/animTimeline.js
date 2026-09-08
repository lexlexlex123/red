/**
 * Visual animation timeline (Gantt) — port of js/10c-anim-engine.js
 * computeSlideAnimTimeline / _computeAnimAbsStarts.
 */
import { expandAnimOrderForTimeline } from './animOrder.js';
import { ANIM_CATS, animDuration, findAnimItem } from './anims.js';

export const CAM_PREFIX = '__cam_';
export const PAU_PREFIX = '__pau_';

export const LIVE_LOOP_NAMES = { dance: 1, swing: 1, float: 1, inkDraw: 1 };

const PX_MIN = 0.025;
const PX_MAX = 0.35;

export function clampTlPxPerMs(v) {
  const n = +v;
  if (!Number.isFinite(n)) return 0.08;
  return Math.max(PX_MIN, Math.min(PX_MAX, n));
}

export function zoomTlPxPerMs(cur, dir) {
  const next = dir > 0 ? (cur || 0.08) * 1.25 : (cur || 0.08) * 0.8;
  return clampTlPxPerMs(next);
}

export function isCamElId(elId) {
  return typeof elId === 'string' && elId.startsWith(CAM_PREFIX);
}

export function camIdFromElId(elId) {
  return isCamElId(elId) ? elId.slice(CAM_PREFIX.length) : '';
}

export function isPauElId(elId) {
  return typeof elId === 'string' && elId.startsWith(PAU_PREFIX);
}

export function pauIdFromElId(elId) {
  return isPauElId(elId) ? elId.slice(PAU_PREFIX.length) : '';
}

export function timelineSegKey(elId, ai) {
  return `${elId}:${ai}`;
}

function catOfName(name, fallback) {
  if (name === 'camera') return 'camera';
  if (name === 'pause') return 'blocks';
  for (const g of ANIM_CATS) {
    if (g.items.some((it) => it.name === name)) return g.cat;
  }
  return fallback || 'entrance';
}

export function animChainDuration(a) {
  if (!a) return 600;
  if (a.name === 'pause') return Math.max(0, +(a.duration != null ? a.duration : a.dur) || 0);
  if (a.name === 'captionSlide') {
    const d = +(a.duration != null ? a.duration : a.dur) || 600;
    const h = +(a.holdDuration || 2000) || 2000;
    return d + h + d;
  }
  if (a.name === 'cosmosTitle') return Math.max(200, +(a.duration != null ? a.duration : a.dur) || 4000);
  if (a.name === 'splitHalf') return +(a.duration != null ? a.duration : a.dur) || 800;
  if (a.name === 'particles') {
    const spawn = +(a.duration != null ? a.duration : a.dur) || 3550;
    const life = +(a.ptLife || 900) || 900;
    const perLoop = spawn + life * 1.5;
    const cnt = a.swingCount != null ? a.swingCount : 1;
    const loops = !Number.isFinite(+cnt) || +cnt >= 10 ? 1 : Math.max(1, +cnt || 1);
    return perLoop * loops;
  }
  if (a.name === 'inkDraw') {
    const per = +(a.duration != null ? a.duration : a.dur) || 1400;
    const cnt = a.swingCount != null ? a.swingCount : 1;
    const loops = !Number.isFinite(+cnt) || +cnt >= 10 ? 1 : Math.max(1, +cnt || 1);
    return per * loops;
  }
  if (a.name === 'camera') return +(a.duration != null ? a.duration : a.dur) || 1200;
  if (a.name === 'typewriter') {
    const cd = a.charDelay || 40;
    const fromLen = String(a.fromHtml || '').replace(/<[^>]*>/g, '').length;
    const toLen = String(a.toHtml || '').replace(/<[^>]*>/g, '').length;
    return (fromLen + toLen) * cd + 200;
  }
  if (a.name === 'langFade') return +(a.duration != null ? a.duration : a.dur) || 800;
  return animDuration(a, 600);
}

function animLabelOf(a, isCamera, camNum, lang = 'ru') {
  if (isCamera) return (lang === 'en' ? 'Camera' : 'Камера') + (camNum ? ` ${camNum}` : '');
  if (a?.name === 'pause') return lang === 'en' ? 'Pause' : 'Пауза';
  const hit = findAnimItem(a?.name);
  if (hit) return lang === 'en' ? hit.labelEn : hit.labelRu;
  return a?.name || '';
}

function toGList(slide) {
  const { list, repeatBands } = expandAnimOrderForTimeline(slide);
  const gList = [];
  list.forEach((row, idx) => {
    if (!row) return;
    if (row.kind === 'pause') {
      const a = {
        name: 'pause',
        duration: row.dur || 0,
        delay: 0,
        trigger: 'auto',
        cat: 'blocks',
      };
      const d = {
        id: PAU_PREFIX + (row.pauseId != null ? row.pauseId : idx),
        _isPause: true,
        anims: [a],
      };
      gList.push({ d, a, gIdx: idx, kind: 'pause', pauseId: row.pauseId, ai: 0 });
      return;
    }
    if (row.kind === 'camera') {
      const cam = row.cam;
      if (!cam) return;
      const a = {
        name: 'camera',
        duration: row.dur != null ? row.dur : 1200,
        delay: row.delay || 0,
        trigger: cam.trigger || 'auto',
        tlLane: cam.tlLane,
        camId: cam.id,
        cat: 'camera',
      };
      const d = {
        id: CAM_PREFIX + cam.id,
        _isCamera: true,
        type: 'camera',
        camId: cam.id,
        anims: [a],
      };
      gList.push({ d, a, gIdx: idx, kind: 'camera', ai: 0 });
      return;
    }
    const d = row.el;
    const a = row.anim;
    if (!d || !a || d._isDecor) return;
    gList.push({ d, a, gIdx: idx, kind: 'el', ai: row.ai != null ? row.ai : 0 });
  });
  gList._repeatBands = repeatBands;
  return gList;
}

function isCameraEntry(d, a) {
  return !!(d && (d._isCamera || d.type === 'camera' || (a && a.name === 'camera')));
}

function isTimedAnimEntry(a) {
  const t = (a && a.trigger) || 'auto';
  return t !== 'element' && t !== 'nav' && t !== 'click' && t !== 'counter' && t !== 'timer';
}

function effTriggers(gList) {
  let lastTrig = 'auto';
  let lastRes = 'auto';
  return gList.map((item) => {
    const t = item.a.trigger || 'auto';
    if (t === 'element') {
      lastTrig = 'auto';
      lastRes = 'element';
      return 'element';
    }
    if (t === 'counter') {
      lastTrig = 'auto';
      lastRes = 'counter';
      return 'counter';
    }
    if (t === 'timer') {
      lastTrig = 'auto';
      lastRes = 'timer';
      return 'timer';
    }
    if (t === 'nav') {
      lastTrig = 'auto';
      lastRes = 'nav';
      return 'nav';
    }
    if (t === 'click') {
      lastTrig = 'click';
      lastRes = 'click';
      return 'click';
    }
    if (t === 'withPrev') return lastRes;
    if (lastTrig === 'click') return 'autoAfter';
    lastTrig = 'auto';
    lastRes = 'auto';
    return 'auto';
  });
}

function computeAbsStarts(gList) {
  const out = [];
  let chainPS = 0;
  let chainPD = 0;
  let prevTimedStart = 0;
  gList.forEach(({ d, a, ai }) => {
    if (!isTimedAnimEntry(a)) {
      out.push({ elId: d.id, ai, skip: true, abs: null });
      return;
    }
    const isCam = isCameraEntry(d, a);
    let t = a.trigger || 'auto';
    if (isCam && t === 'withPrev') t = 'auto';
    const rd = a.delay || 0;
    let abs;
    if (t === 'withPrev') abs = prevTimedStart + rd;
    else if (chainPS === 0 && chainPD === 0) abs = rd;
    else abs = chainPS + chainPD + rd;
    out.push({ elId: d.id, ai, skip: false, abs });
    const dur = animChainDuration(a);
    if (t === 'withPrev') {
      chainPD = Math.max(chainPS + chainPD, abs + dur) - chainPS;
      prevTimedStart = abs;
    } else {
      prevTimedStart = abs;
      chainPS = abs;
      chainPD = dur;
    }
  });
  return out;
}

function overlap(a, b) {
  return a.absDelay < b.absDelay + b.dur && b.absDelay < a.absDelay + a.dur;
}

export function computeSlideAnimTimeline(slide, lang = 'ru') {
  if (!slide) return { totalMs: 800, segments: [], laneCount: 1, repeatBands: [] };
  const gList = toGList(slide);
  const gEffTrig = effTriggers(gList);
  const absStarts = computeAbsStarts(gList);
  const absStartMap = new Map();
  absStarts.forEach((s) => {
    if (!s.skip) absStartMap.set(`${s.elId}:${s.ai}`, s.abs);
  });

  const segments = [];
  let gPS = 0;
  let gPD = 0;
  let autoEnd = 0;
  let camSeq = 0;

  const entries = [];
  gList.forEach((item, compactI) => {
    const { d, a, ai, gIdx } = item;
    if (!d || !a || d._isDecor) return;
    const isCamera = isCameraEntry(d, a);
    if (isCamera) camSeq += 1;
    entries.push({ d, a, ai, isCamera, camNum: isCamera ? camSeq : 0, gIdx, compactI });
  });

  entries.forEach(({ d, a, ai, isCamera, camNum, gIdx, compactI }) => {
    const eff = compactI >= 0 ? gEffTrig[compactI] : 'auto';
    const trigger = a.trigger || 'auto';
    if (trigger === 'element' || trigger === 'nav' || trigger === 'counter' || trigger === 'timer' || eff === 'nav') {
      return;
    }
    const dur = animChainDuration(a);
    const cat = catOfName(a.name, a.cat);
    const label = animLabelOf(a, isCamera, camNum, lang);
    const isClick = trigger === 'click' || eff === 'click';
    let absDelay;
    if (isClick) {
      absDelay = autoEnd + (a.delay || 0);
    } else if (eff === 'autoAfter') {
      absDelay = gPS + gPD + (a.delay || 0);
      gPS = absDelay;
      gPD = dur;
      autoEnd = Math.max(autoEnd, absDelay + dur);
    } else {
      absDelay = absStartMap.has(`${d.id}:${ai}`) ? absStartMap.get(`${d.id}:${ai}`) : a.delay || 0;
      if ((a.trigger || 'auto') === 'withPrev' && !isCamera) {
        gPD = Math.max(gPS + gPD, absDelay + dur) - gPS;
      } else {
        gPS = absDelay;
        gPD = dur;
      }
      autoEnd = Math.max(autoEnd, absDelay + dur);
    }
    segments.push({
      elId: d.id,
      ai,
      anim: a,
      absDelay,
      dur,
      cat,
      label,
      trigger,
      isClick,
      lane: 0,
      isCamera: !!isCamera,
      camId: isCamera ? a.camId || d.camId : null,
      isPause: !!d._isPause,
      gIdx,
    });
  });

  // Click segments: place after everything before them in order (advance runEnd)
  let runEnd = 0;
  segments.forEach((seg) => {
    if (seg.isClick) {
      seg.absDelay = runEnd + (seg.anim.delay || 0);
      runEnd = Math.max(runEnd, seg.absDelay + seg.dur);
    } else {
      runEnd = Math.max(runEnd, seg.absDelay + seg.dur);
    }
  });

  let camT = 0;
  segments.forEach((seg) => {
    if (!seg.isCamera) return;
    if (seg.absDelay < camT) seg.absDelay = camT;
    camT = Math.max(camT, seg.absDelay + seg.dur);
  });

  let cameraLane = null;
  segments.forEach((seg, si) => {
    const laneTaken = (lane) => segments.some((s, j) => j < si && s.lane === lane && overlap(seg, s));
    if (seg.isCamera) {
      if (cameraLane == null) {
        const manual = seg.anim && seg.anim.tlLane;
        cameraLane = manual != null && manual >= 0 && !Number.isNaN(+manual) ? +manual : 0;
        while (laneTaken(cameraLane)) cameraLane += 1;
      }
      seg.lane = cameraLane;
      return;
    }
    // withPrev runs with previous — put on next free row, never on top of it
    if (seg.trigger === 'withPrev' && si > 0) {
      let lane = segments[si - 1].lane + 1;
      while (laneTaken(lane)) lane += 1;
      seg.lane = lane;
      return;
    }
    const manualLane = seg.anim && seg.anim.tlLane;
    if (manualLane != null && manualLane >= 0 && !Number.isNaN(+manualLane) && !laneTaken(+manualLane)) {
      seg.lane = +manualLane;
      return;
    }
    // Sequential (non-overlapping) stay on lowest free lane — not stacked in parallel.
    let lane = 0;
    while (laneTaken(lane)) lane += 1;
    seg.lane = lane;
  });

  const rawBands = (gList._repeatBands || []).slice().sort((a, b) => a.startIdx - b.startIdx);
  const repeatBands = [];
  rawBands.forEach((band) => {
    const count = Math.max(1, +(band.count || 1));
    const members = segments.filter((s) => s.gIdx >= band.startIdx && s.gIdx < band.endIdx);
    if (!members.length) return;
    let cycleStart = Infinity;
    let cycleEnd = 0;
    members.forEach((s) => {
      cycleStart = Math.min(cycleStart, s.absDelay);
      cycleEnd = Math.max(cycleEnd, s.absDelay + s.dur);
      if (!s._inRepeatBands) s._inRepeatBands = new Set();
      s._inRepeatBands.add(band.id);
    });
    if (!Number.isFinite(cycleStart)) return;
    const cycleDur = Math.max(0, cycleEnd - cycleStart);
    const extra = cycleDur * (count - 1);
    const bandEnd = cycleStart + cycleDur * count;
    if (extra > 0) {
      segments.forEach((s) => {
        if (s._inRepeatBands && s._inRepeatBands.has(band.id)) return;
        if (s.gIdx >= band.endIdx || s.absDelay >= cycleEnd - 0.01) {
          s.absDelay += extra;
        }
      });
    }
    const foreigners = segments
      .filter((s) => !(s._inRepeatBands && s._inRepeatBands.has(band.id)))
      .filter((s) => s.absDelay < bandEnd && s.absDelay + s.dur > cycleStart)
      .sort((a, b) => a.gIdx - b.gIdx || a.absDelay - b.absDelay);
    let t = bandEnd;
    foreigners.forEach((s) => {
      if (s.absDelay < t) s.absDelay = t;
      t = Math.max(t, s.absDelay + s.dur);
    });
    repeatBands.push({
      id: band.id,
      count,
      absDelay: cycleStart,
      dur: cycleDur * count,
      cycleDur,
      label: '×' + count,
    });
  });
  repeatBands.sort((a, b) => a.absDelay - b.absDelay || b.dur - a.dur);

  const laneCount = segments.length ? Math.max(...segments.map((s) => s.lane)) + 1 : 1;
  const contentMs = segments.reduce((m, s) => Math.max(m, s.absDelay + s.dur), 0);
  const bandMs = repeatBands.reduce((m, b) => Math.max(m, b.absDelay + b.dur), 0);
  const totalMs = Math.max(contentMs, bandMs) + 400;
  return { totalMs: Math.max(totalMs, 800), segments, laneCount, repeatBands };
}

/** Inverse of chain placement: delay so the segment lands at targetAbs. */
export function delayForTargetAbs(slide, elId, ai, targetAbs, lang = 'ru') {
  const tl = computeSlideAnimTimeline(slide, lang);
  const idx = tl.segments.findIndex((s) => String(s.elId) === String(elId) && +s.ai === +ai);
  const target = Math.max(0, Math.round(targetAbs));
  if (idx < 0) return target;
  const seg = tl.segments[idx];
  const prevEnd = tl.segments.slice(0, idx).reduce((m, s) => Math.max(m, s.absDelay + s.dur), 0);
  const prevStart = idx > 0 ? tl.segments[idx - 1].absDelay : 0;
  const t = seg.trigger || 'auto';
  if (t === 'withPrev') return Math.max(0, Math.round(target - prevStart));
  return Math.max(0, Math.round(target - prevEnd));
}

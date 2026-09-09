/** Element animation catalog (subset of js/10-animations.js). */

import { expandAnimOrderFlat } from './animOrder.js';

export const ANIM_CATS = [
  {
    cat: 'entrance',
    labelRu: 'Вход',
    labelEn: 'Entrance',
    items: [
      { name: 'fadeIn', labelRu: 'Появление', labelEn: 'Fade in', icon: '✨' },
      { name: 'slideUp', labelRu: 'Подъём', labelEn: 'Slide up', icon: '⬆' },
      { name: 'slideDown', labelRu: 'Спуск', labelEn: 'Slide down', icon: '⬇' },
      { name: 'slideLeft', labelRu: 'Влево', labelEn: 'Slide left', icon: '⬅' },
      { name: 'slideRight', labelRu: 'Вправо', labelEn: 'Slide right', icon: '➡' },
      { name: 'zoomIn', labelRu: 'Увеличение', labelEn: 'Zoom in', icon: '🔍' },
      { name: 'bounceIn', labelRu: 'Отскок', labelEn: 'Bounce', icon: '⚡' },
      { name: 'spinIn', labelRu: 'Вращение', labelEn: 'Spin', icon: '🔄' },
    ],
  },
  {
    cat: 'emphasis',
    labelRu: 'Выделение',
    labelEn: 'Emphasis',
    items: [
      { name: 'pulse', labelRu: 'Пульсация', labelEn: 'Pulse', icon: '💓' },
      { name: 'shake', labelRu: 'Дрожание', labelEn: 'Shake', icon: '〰' },
      { name: 'flash', labelRu: 'Мигание', labelEn: 'Flash', icon: '🔦' },
      { name: 'recolor', labelRu: 'Цвет', labelEn: 'Recolor', icon: '🎨' },
      { name: 'rotate', labelRu: 'Вращение', labelEn: 'Rotate', icon: '🔁' },
      { name: 'mirror', labelRu: 'Зеркало', labelEn: 'Mirror', icon: '⇆' },
    ],
  },
  {
    cat: 'exit',
    labelRu: 'Выход',
    labelEn: 'Exit',
    items: [
      { name: 'fadeOut', labelRu: 'Исчезновение', labelEn: 'Fade out', icon: '💨' },
      { name: 'slideOut', labelRu: 'Выезд', labelEn: 'Slide out', icon: '↩' },
      { name: 'zoomOut', labelRu: 'Уменьшение', labelEn: 'Zoom out', icon: '🔎' },
      { name: 'splitHalf', labelRu: 'Пополам', labelEn: 'Split half', icon: '✂' },
    ],
  },
  {
    cat: 'motion',
    labelRu: 'Движение',
    labelEn: 'Motion',
    items: [
      { name: 'moveTo', labelRu: 'Переместить', labelEn: 'Move to', icon: '↗' },
      { name: 'orbitTo', labelRu: 'По окружности', labelEn: 'Orbit', icon: '⭕' },
    ],
  },
  {
    cat: 'live',
    labelRu: 'Живая',
    labelEn: 'Live',
    items: [
      { name: 'dance', labelRu: 'Танец', labelEn: 'Dance', icon: '💃' },
      { name: 'swing', labelRu: 'Качение', labelEn: 'Swing', icon: '🎷' },
      { name: 'float', labelRu: 'Плавание', labelEn: 'Float', icon: '🌊' },
      { name: 'inkDraw', labelRu: 'Рисование', labelEn: 'Ink draw', icon: '✏' },
      { name: 'camera', labelRu: 'Камера', labelEn: 'Camera', icon: '📷' },
      { name: 'particles', labelRu: 'Частицы', labelEn: 'Particles', icon: '✨' },
      { name: 'typewriter', labelRu: 'Смена текста', labelEn: 'Typewriter', icon: '⌨' },
      { name: 'langFade', labelRu: 'Перевод', labelEn: 'Translate fade', icon: '🌐' },
      { name: 'captionSlide', labelRu: 'Титр в сторону', labelEn: 'Caption slide', icon: '📰' },
      { name: 'cosmosTitle', labelRu: 'Титр в космос', labelEn: 'Cosmos title', icon: '🛰' },
    ],
  },
  {
    cat: 'blocks',
    labelRu: 'Блоки',
    labelEn: 'Blocks',
    items: [
      { name: 'animRepeat', labelRu: 'Повторение', labelEn: 'Repeat', icon: '🔁' },
      { name: 'animPause', labelRu: 'Пауза', labelEn: 'Pause', icon: '⏸' },
    ],
  },
];

export function animLabel(item, lang) {
  if (!item) return '';
  return lang === 'en' ? item.labelEn : item.labelRu;
}

export function findAnimItem(name) {
  for (const g of ANIM_CATS) {
    const hit = g.items.find((it) => it.name === name);
    if (hit) return hit;
  }
  return null;
}

export function findAnimCat(name) {
  for (const g of ANIM_CATS) {
    if (g.items.some((it) => it.name === name)) return g.cat;
  }
  return null;
}

export const ENTRANCE_ANIMS = new Set([
  'fadeIn',
  'slideUp',
  'slideDown',
  'slideLeft',
  'slideRight',
  'zoomIn',
  'bounceIn',
  'spinIn',
]);

export const EXIT_ANIMS = new Set(['fadeOut', 'slideOut', 'zoomOut', 'splitHalf']);

export const LIVE_ANIMS = new Set(['dance', 'swing', 'float']);

export function isEntranceAnim(name) {
  return ENTRANCE_ANIMS.has(name);
}

export function isExitAnim(name) {
  return EXIT_ANIMS.has(name);
}

export function isLiveAnim(name) {
  return LIVE_ANIMS.has(name);
}

/** Normalize duration from React `dur` or legacy `duration`. */
export function animDuration(a, fallback = 600) {
  if (!a) return fallback;
  if (a.dur != null && a.dur !== '') return Math.max(50, +a.dur || fallback);
  if (a.duration != null && a.duration !== '') return Math.max(50, +a.duration || fallback);
  return fallback;
}

/** Defaults when adding an animation from the panel. */
export function defaultAnimFields(name) {
  const base = { name, dur: 600, delay: 0, trigger: 'auto' };
  if (name === 'dance') return { ...base, dur: 1200, swingCount: 1 };
  if (name === 'swing') return { ...base, dur: 1200, swingCount: 1, swingOx: 0, swingOy: null };
  if (name === 'float') return { ...base, dur: 5000, swingCount: 10 };
  if (name === 'pulse' || name === 'shake' || name === 'flash') return { ...base, dur: 600, swingCount: 1 };
  if (name === 'moveTo') return { ...base, dur: 800, tx: 100, ty: 0 };
  if (name === 'orbitTo') {
    return { ...base, dur: 1200, orbitR: 120, orbitDir: 'cw', orbitDeg: 360, orbitCx: 0, orbitCy: -120 };
  }
  if (name === 'rotate') return { ...base, dur: 800, rotateDir: 'cw', rotateDeg: 360 };
  if (name === 'mirror') return { ...base, dur: 600, mirrorAxis: 'h' };
  if (name === 'recolor') return { ...base, dur: 600, recolorColor: '#000000', recolorInvert: false };
  if (name === 'typewriter') return { ...base, dur: 600, charDelay: 40, fromHtml: '', toHtml: '' };
  if (name === 'langFade') {
    return { ...base, dur: 800, fromHtml: '', toHtml: '', fromLang: '', toLang: '' };
  }
  if (name === 'splitHalf') return { ...base, dur: 800 };
  if (name === 'captionSlide') {
    return { ...base, dur: 600, holdDuration: 2000, captionDir: 'right' };
  }
  if (name === 'cosmosTitle') return { ...base, dur: 4000 };
  if (name === 'particles') {
    return {
      ...base,
      dur: 3550,
      particleCount: 14,
      ptDir: 0,
      ptLife: 900,
      ptSizeRand: 51,
      ptRot: 32,
      ptSpread: 100,
      swingCount: 1,
    };
  }
  if (name === 'inkDraw') {
    return { ...base, dur: 1400, swingCount: 1, inkParallel: 1 };
  }
  return base;
}

/** CSS class for preview playback of a single anim step. */
export function animCssClass(name) {
  const map = {
    fadeIn: 'el-anim-fadein',
    slideUp: 'el-anim-slideup',
    slideDown: 'el-anim-slidedown',
    slideLeft: 'el-anim-slideleft',
    slideRight: 'el-anim-slideright',
    zoomIn: 'el-anim-zoomin',
    bounceIn: 'el-anim-bounce',
    spinIn: 'el-anim-spin',
    fadeOut: 'el-anim-fadeout',
    slideOut: 'el-anim-slideout',
    zoomOut: 'el-anim-zoomout',
    pulse: 'el-anim-pulse',
    shake: 'el-anim-shake',
    flash: 'el-anim-flash',
    dance: 'el-anim-dance',
    swing: 'el-anim-swing',
    float: 'el-anim-float',
  };
  return map[name] || 'el-anim-fadein';
}

function stepFromAnim(el, a, ai) {
  if (!el || !a || !a.name) return null;
  const step = {
    kind: 'el',
    elId: el.id,
    ai,
    name: a.name,
    dur: animDuration(a, isLiveAnim(a.name) ? (a.name === 'float' ? 3000 : 1200) : 600),
    delay: a.delay != null ? +a.delay : 0,
    trigger: a.trigger || 'click',
    rot: el.rot || 0,
  };
  if (a.name === 'moveTo') {
    step.tx = a.tx || 0;
    step.ty = a.ty || 0;
  }
  if (a.name === 'orbitTo') {
    step.orbitR = a.orbitR;
    step.orbitDir = a.orbitDir || 'cw';
    step.orbitDeg = a.orbitDeg != null ? a.orbitDeg : 360;
    step.orbitCx = a.orbitCx || 0;
    step.orbitCy = a.orbitCy || 0;
  }
  if (a.name === 'rotate') {
    step.rotateDir = a.rotateDir || 'cw';
    step.rotateDeg = a.rotateDeg != null ? a.rotateDeg : 360;
  }
  if (a.name === 'mirror') {
    step.mirrorAxis = a.mirrorAxis === 'v' ? 'v' : 'h';
  }
  if (a.name === 'recolor') {
    step.recolorColor = a.recolorColor || '#000000';
    step.recolorInvert = !!a.recolorInvert;
  }
  if (a.name === 'typewriter') {
    step.charDelay = a.charDelay != null ? +a.charDelay : 40;
    step.fromHtml = a.fromHtml || '';
    step.toHtml = a.toHtml || '';
  }
  if (a.name === 'langFade') {
    step.fromHtml = a.fromHtml || '';
    step.toHtml = a.toHtml || '';
    step.fromLang = a.fromLang || '';
    step.toLang = a.toLang || '';
  }
  if (a.name === 'captionSlide') {
    step.holdDuration = a.holdDuration != null ? +a.holdDuration : 2000;
    step.captionDir = a.captionDir || 'right';
  }
  if (a.name === 'particles') {
    step.particleCount = a.particleCount != null ? +a.particleCount : 14;
    step.ptDir = a.ptDir != null ? +a.ptDir : 0;
    step.ptLife = a.ptLife != null ? +a.ptLife : 900;
    step.ptSizeRand = a.ptSizeRand != null ? +a.ptSizeRand : 51;
    step.ptRot = a.ptRot != null ? +a.ptRot : 32;
    step.ptSpread = a.ptSpread != null ? +a.ptSpread : 100;
    step.swingCount = a.swingCount != null ? +a.swingCount : 1;
  }
  if (a.name === 'inkDraw') {
    step.swingCount = a.swingCount != null ? +a.swingCount : 1;
    step.inkParallel = a.inkParallel != null ? +a.inkParallel : 1;
  }
  if (a.name === 'float') {
    step.swingCount = a.swingCount != null ? +a.swingCount : 10;
  }
  if (a.name === 'dance') {
    step.swingCount = a.swingCount != null ? +a.swingCount : 1;
  }
  if (a.name === 'swing') {
    step.swingCount = a.swingCount != null ? +a.swingCount : 1;
    if (a.swingOx != null) step.swingOx = +a.swingOx;
    if (a.swingOy != null) step.swingOy = +a.swingOy;
  }
  if (a.name === 'pulse' || a.name === 'shake' || a.name === 'flash') {
    step.swingCount = a.swingCount != null ? +a.swingCount : 1;
  }
  return step;
}

/** Flatten anims into click-advance steps (respects slide.animOrder + pause/repeat). */
export function collectSlideAnimSteps(slide) {
  return bundleFlatSteps(flattenOrderedAnimRows(slide, { includeCameras: false }));
}

/**
 * Full slideshow steps: cameras interleaved with anim bundles via animOrder.
 * Fallback: all cameras first, then el bundles (legacy React behaviour).
 */
export function collectSlidePlaybackSteps(slide) {
  const ordered = expandAnimOrderFlat(slide, { includeCameras: true });
  const hasCamInOrder = ordered.some((r) => r.kind === 'camera');
  const hasAnyOrder = (slide?.animOrder && slide.animOrder.length) || ordered.length;

  if (!hasAnyOrder) {
    const cams = (slide?.cameras || []).map((cam) => ({
      kind: 'camera',
      cam,
      dur: cam.duration != null ? +cam.duration : 1200,
      delay: cam.delay != null ? +cam.delay : 0,
    }));
    return [...cams, ...collectSlideAnimSteps(slide)];
  }

  // If cameras exist but none appear in order (older decks), prepend them once.
  const steps = [];
  if (!hasCamInOrder && (slide?.cameras || []).length) {
    (slide.cameras || []).forEach((cam) => {
      if (!cam) return;
      steps.push({
        kind: 'camera',
        cam,
        dur: cam.duration != null ? +cam.duration : 1200,
        delay: cam.delay != null ? +cam.delay : 0,
      });
    });
  }

  const flat = [];
  ordered.forEach((row) => {
    if (row.kind === 'camera') {
      flat.push({ kind: 'camera', cam: row.cam, dur: row.dur, delay: row.delay });
      return;
    }
    if (row.kind === 'pause') {
      flat.push({
        kind: 'pause',
        elId: `__pause_${row.pauseId || 'x'}`,
        name: 'pause',
        dur: row.dur || 0,
        delay: 0,
        trigger: 'auto',
      });
      return;
    }
    if (row.kind === 'el' && row.el && row.anim) {
      if (row.el.objHidden) return;
      const step = stepFromAnim(row.el, row.anim, row.ai);
      if (step) flat.push(step);
    }
  });

  let cur = null;
  flat.forEach((s) => {
    if (s.kind === 'camera') {
      cur = null;
      steps.push(s);
      return;
    }
    const t = s.trigger || 'click';
    if (t === 'withPrev' && cur && cur.kind === 'bundle') {
      cur.items.push(s);
      return;
    }
    cur = {
      kind: 'bundle',
      items: [s],
      auto: t === 'auto',
    };
    steps.push(cur);
  });
  return steps;
}

function flattenOrderedAnimRows(slide, opts) {
  const flat = [];
  const ordered = expandAnimOrderFlat(slide, opts);
  if (ordered.length) {
    ordered.forEach((row) => {
      if (row.kind === 'pause') {
        flat.push({
          kind: 'pause',
          elId: `__pause_${row.pauseId || 'x'}`,
          name: 'pause',
          dur: row.dur || 0,
          delay: 0,
          trigger: 'auto',
        });
        return;
      }
      if (row.kind === 'el' && row.el && row.anim) {
        if (row.el.objHidden) return;
        const step = stepFromAnim(row.el, row.anim, row.ai);
        if (step) flat.push(step);
      }
    });
  } else {
    (slide?.els || []).forEach((el) => {
      if (!el || el._isDecor || el.objHidden || !Array.isArray(el.anims)) return;
      el.anims.forEach((a, ai) => {
        const step = stepFromAnim(el, a, ai);
        if (step) flat.push(step);
      });
    });
  }
  return flat;
}

function bundleFlatSteps(flat) {
  const steps = [];
  let cur = null;
  flat.forEach((s) => {
    const t = s.trigger || 'click';
    if (t === 'withPrev' && cur) {
      cur.items.push(s);
      return;
    }
    cur = {
      kind: 'bundle',
      items: [s],
      auto: t === 'auto',
    };
    steps.push(cur);
  });
  return steps;
}

export const ANIM_TRIGGERS = [
  { id: 'click', labelRu: 'По клику', labelEn: 'On click' },
  { id: 'withPrev', labelRu: 'С предыдущей', labelEn: 'With previous' },
  { id: 'auto', labelRu: 'После предыдущей', labelEn: 'After previous' },
];

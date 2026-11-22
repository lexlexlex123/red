/**
 * PowerPoint p:timing for fade / slide / moveTo / orbitTo / pathTo.
 * Click / with previous / after previous map to clickEffect / withEffect / afterEffect.
 */

import { collectSlidePlaybackSteps } from '../editor/anims.js';
import { isMotionAnim } from '../editor/motionPlay.js';
import { moveToDelta, pathPtsOf } from '../editor/motionGeom.js';

function nodeTypeOf(trigger) {
  if (trigger === 'withPrev') return 'withEffect';
  if (trigger === 'click' || trigger === 'element' || trigger === 'counter' || trigger === 'timer') {
    return 'clickEffect';
  }
  return 'afterEffect';
}

function pptxFilter(name) {
  if (name === 'fadeIn' || name === 'fadeOut') return { trans: name === 'fadeOut' ? 'out' : 'in', filter: 'fade' };
  if (name === 'slideUp') return { trans: 'in', filter: 'wipe(up)' };
  if (name === 'slideDown') return { trans: 'in', filter: 'wipe(down)' };
  if (name === 'slideLeft') return { trans: 'in', filter: 'wipe(left)' };
  if (name === 'slideRight') return { trans: 'in', filter: 'wipe(right)' };
  if (name === 'slideOut') return { trans: 'out', filter: 'wipe(right)' };
  if (name === 'zoomIn') return { trans: 'in', filter: 'box' };
  if (name === 'zoomOut') return { trans: 'out', filter: 'box' };
  if (name === 'bounceIn' || name === 'spinIn') return { trans: 'in', filter: 'fade' };
  return null;
}

function motionPathXml(step, canvasW, canvasH) {
  const W = Math.max(1, canvasW);
  const H = Math.max(1, canvasH);
  let pts = [];
  if (step.name === 'pathTo') {
    pts = pathPtsOf(step).map((p) => ({ x: p.x / W, y: p.y / H }));
  } else if (step.name === 'moveTo') {
    const d = moveToDelta(step);
    pts = [{ x: d.tx / W, y: d.ty / H }];
  } else if (step.name === 'orbitTo') {
    const dir = (step.orbitDir || 'cw') === 'cw' ? 1 : -1;
    const deg = (step.orbitDeg != null ? +step.orbitDeg : 360) * dir;
    const ocx = (+step.orbitCx || 0) / W;
    const ocy = (+step.orbitCy || 0) / H;
    const r = Math.sqrt(ocx * ocx + ocy * ocy) || (+step.orbitR || 120) / W;
    const start = Math.atan2(-ocy, -ocx);
    const n = Math.max(8, Math.min(36, Math.round(Math.abs(deg) / 12)));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const a = start + ((deg * Math.PI) / 180) * t;
      pts.push({ x: ocx + r * Math.cos(a), y: ocy + r * Math.sin(a) });
    }
  }
  if (!pts.length) return '';
  let d = 'M 0 0';
  pts.forEach((p) => {
    d += ` L ${p.x.toFixed(5)} ${p.y.toFixed(5)}`;
  });
  return d;
}

function cBhvr(id, dur, delay, spid) {
  return (
    `<p:cBhvr><p:cTn id="${id}" dur="${Math.max(1, dur | 0)}"${delay ? ` delay="${delay | 0}"` : ''} fill="hold"/>` +
    `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr>`
  );
}

/**
 * @param {object} slide
 * @param {Map<string, number>} elPptxId
 * @param {{ canvasW:number, canvasH:number }} geom
 */
export function pptxTimingXml(slide, elPptxId, geom = {}) {
  const bundles = collectSlidePlaybackSteps(slide) || [];
  const canvasW = geom.canvasW || 1280;
  const canvasH = geom.canvasH || 720;
  let id = 3;
  const nextId = () => {
    id += 1;
    return id;
  };

  const groups = [];
  bundles.forEach((bundle) => {
    const items = (bundle.items || []).filter((it) => it && it.kind !== 'camera' && it.name !== 'pause');
    if (!items.length) return;
    const effects = [];
    items.forEach((step) => {
      const spid = elPptxId.get(String(step.elId));
      if (spid == null) return;
      const dur = Math.max(1, step.dur || 600);
      const delay = step.delay || 0;
      const filt = pptxFilter(step.name);
      if (filt) {
        effects.push(
          `<p:animEffect transition="${filt.trans}" filter="${filt.filter}">${cBhvr(nextId(), dur, delay, spid)}</p:animEffect>`
        );
        return;
      }
      if (isMotionAnim(step.name) && (step.name === 'moveTo' || step.name === 'orbitTo' || step.name === 'pathTo')) {
        const path = motionPathXml(step, canvasW, canvasH);
        if (!path) return;
        effects.push(
          `<p:animMotion origin="layout" path="${path}" pathEditMode="relative" ptsTypes="">${cBhvr(nextId(), dur, delay, spid)}</p:animMotion>`
        );
      }
    });
    if (!effects.length) return;
    const first = items[0];
    const nt = nodeTypeOf(first.trigger || (bundle.auto ? 'auto' : 'click'));
    groups.push({ nt, effects });
  });

  if (!groups.length) return '';

  let inner = '';
  groups.forEach((g) => {
    const gid = nextId();
    const hid = nextId();
    inner +=
      `<p:par><p:cTn id="${gid}" fill="hold" nodeType="${g.nt}">` +
      `<p:stCondLst><p:cond delay="0"/></p:stCondLst>` +
      `<p:childTnLst><p:par><p:cTn id="${hid}" fill="hold">` +
      `<p:stCondLst><p:cond delay="0"/></p:stCondLst>` +
      `<p:childTnLst>${g.effects.join('')}</p:childTnLst>` +
      `</p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
  });

  return (
    '<p:timing><p:tnLst><p:par>' +
    '<p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">' +
    '<p:childTnLst><p:seq concurrent="1" nextAc="seek">' +
    '<p:cTn id="2" dur="indefinite" nodeType="mainSeq">' +
    `<p:childTnLst>${inner}</p:childTnLst>` +
    '</p:cTn>' +
    '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>' +
    '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>' +
    '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>'
  );
}

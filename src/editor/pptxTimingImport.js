/**
 * PPTX p:timing → editor anims (click / withPrev / auto / element / nav).
 */

import { NS_P } from './pptxTheme.js';

function mapPptxAnim(presetClass, presetID, filter, transition) {
  const isOut = presetClass === 'exit' || transition === 'out';
  const f = String(filter || '').toLowerCase();
  if (f.includes('wipe')) {
    if (isOut) return 'slideOut';
    if (f.includes('up')) return 'slideUp';
    if (f.includes('down')) return 'slideDown';
    if (f.includes('left')) return 'slideLeft';
    if (f.includes('right')) return 'slideRight';
    return 'slideRight';
  }
  if (f.includes('box') || presetID === 4) return isOut ? 'zoomOut' : 'zoomIn';
  if (presetClass === 'emph') return 'pulse';
  return isOut ? 'fadeOut' : 'fadeIn';
}

function ancestorSeq(node) {
  let n = node;
  while (n) {
    if (n.localName === 'seq') return n;
    n = n.parentNode;
  }
  return null;
}

function interactiveTriggerSpid(seq) {
  if (!seq) return null;
  const cTns = seq.getElementsByTagNameNS(NS_P, 'cTn');
  let root = null;
  for (const c of cTns) {
    if (c.getAttribute('nodeType') === 'interactiveSeq') {
      root = c;
      break;
    }
  }
  if (!root) return null;
  const st = root.getElementsByTagNameNS(NS_P, 'stCondLst')[0];
  if (!st) return null;
  const conds = st.getElementsByTagNameNS(NS_P, 'cond');
  for (const cond of conds) {
    if (cond.getAttribute('evt') !== 'onClick') continue;
    const tgt = cond.getElementsByTagNameNS(NS_P, 'spTgt')[0];
    const spid = tgt?.getAttribute('spid');
    if (spid) return String(spid);
  }
  return null;
}

function firstNumericDur(cTn) {
  const inner = cTn.getElementsByTagNameNS(NS_P, 'cTn');
  for (const n of inner) {
    const d = n.getAttribute('dur');
    if (!d || d === 'indefinite') continue;
    const ms = +d;
    if (Number.isFinite(ms) && ms > 1) return Math.round(ms);
  }
  return 500;
}

function effectTargetSpid(cTn) {
  const effects = [
    ...cTn.getElementsByTagNameNS(NS_P, 'animEffect'),
    ...cTn.getElementsByTagNameNS(NS_P, 'animMotion'),
    ...cTn.getElementsByTagNameNS(NS_P, 'set'),
  ];
  for (const ef of effects) {
    const tgt = ef.getElementsByTagNameNS(NS_P, 'spTgt')[0];
    const spid = tgt?.getAttribute('spid');
    if (spid) return String(spid);
  }
  const any = cTn.getElementsByTagNameNS(NS_P, 'spTgt')[0];
  return any?.getAttribute('spid') ? String(any.getAttribute('spid')) : null;
}

/**
 * @param {Document} doc
 * @returns {{ spid:string, name:string, dur:number, delay:number, trigger:string, triggerSpid?:string }[]}
 */
export function parsePptxTiming(doc) {
  const timing = doc.getElementsByTagNameNS(NS_P, 'timing')[0];
  if (!timing) return [];
  const steps = [];
  const cTns = timing.getElementsByTagNameNS(NS_P, 'cTn');
  for (const cTn of cTns) {
    const presetClass = cTn.getAttribute('presetClass');
    if (!presetClass) continue;
    const nodeType = cTn.getAttribute('nodeType') || 'clickEffect';
    const presetID = +(cTn.getAttribute('presetID') || 0);
    const animEffect = cTn.getElementsByTagNameNS(NS_P, 'animEffect')[0];
    const filter = animEffect?.getAttribute('filter') || '';
    const transition =
      animEffect?.getAttribute('transition') || (presetClass === 'exit' ? 'out' : 'in');
    const spid = effectTargetSpid(cTn);
    if (!spid) continue;
    let trigger = 'click';
    if (nodeType === 'withEffect') trigger = 'withPrev';
    else if (nodeType === 'afterEffect') trigger = 'auto';
    const seq = ancestorSeq(cTn);
    const triggerSpid = interactiveTriggerSpid(seq);
    if (triggerSpid) trigger = 'element';
    steps.push({
      spid,
      name: mapPptxAnim(presetClass, presetID, filter, transition),
      dur: firstNumericDur(cTn),
      delay: 0,
      trigger,
      triggerSpid: triggerSpid || undefined,
    });
  }
  return steps;
}

/**
 * Attach parsed timing to imported elements. Combines interactive click + slide jump into nav.
 * @param {Document} doc
 * @param {object[]} els
 * @param {Record<string, number>} slideRidMap rId → 0-based slide index
 */
export function applyPptxTiming(doc, els, slideRidMap = {}) {
  const byPptx = new Map();
  for (const el of els || []) {
    if (el && el._pptxId != null) byPptx.set(String(el._pptxId), el);
  }
  const parsed = parsePptxTiming(doc);
  for (const step of parsed) {
    const el = byPptx.get(String(step.spid));
    if (!el) continue;
    const anim = {
      name: step.name,
      dur: step.dur || 500,
      delay: step.delay || 0,
      trigger: 'click',
      easing: 'linear',
    };
    if (step.trigger === 'withPrev') anim.trigger = 'withPrev';
    else if (step.trigger === 'auto') anim.trigger = 'auto';
    else if (step.trigger === 'element' || step.triggerSpid) {
      const trig = byPptx.get(String(step.triggerSpid || step.spid));
      if (trig) {
        anim.trigger = 'element';
        anim.triggerElId = trig.id;
      }
    }
    const linkRid = el._pptxLink?.rid || el._pptxLinkRid;
    const navIdx = linkRid != null ? slideRidMap[linkRid] : null;
    if (navIdx != null && (anim.trigger === 'element' || anim.trigger === 'click')) {
      const pre = anim.triggerElId ? 'element' : 'click';
      anim.trigger = 'nav';
      anim.navTarget = navIdx;
      anim.preNavTrigger = pre;
      if (anim.triggerElId) anim.preNavTriggerElId = anim.triggerElId;
    }
    if (!Array.isArray(el.anims)) el.anims = [];
    el.anims.push(anim);
  }
}

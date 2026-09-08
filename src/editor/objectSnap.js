/** Snap dragged box to slide edges/center and nearest neighbors. */

import { DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './canvasDims.js';

const TH = 7;

/**
 * Nearest neighbors: one left, one right, one above, one below (by center).
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {object[]} others
 * @returns {object[]}
 */
function nearestAxisNeighbors(box, others) {
  const cx = (box.x || 0) + (box.w || 0) / 2;
  const cy = (box.y || 0) + (box.h || 0) / 2;
  let left = null;
  let right = null;
  let top = null;
  let bottom = null;
  let dL = Infinity;
  let dR = Infinity;
  let dT = Infinity;
  let dB = Infinity;

  (others || []).forEach((d) => {
    if (!d) return;
    const ox = d.x || 0;
    const oy = d.y || 0;
    const ow = d.w || 0;
    const oh = d.h || 0;
    const ocx = ox + ow / 2;
    const ocy = oy + oh / 2;
    const dx = Math.abs(ocx - cx);
    const dy = Math.abs(ocy - cy);
    if (ocx < cx && dx < dL) {
      dL = dx;
      left = d;
    }
    if (ocx > cx && dx < dR) {
      dR = dx;
      right = d;
    }
    if (ocy < cy && dy < dT) {
      dT = dy;
      top = d;
    }
    if (ocy > cy && dy < dB) {
      dB = dy;
      bottom = d;
    }
  });

  const out = [];
  const seen = new Set();
  [left, right, top, bottom].forEach((d) => {
    if (!d || seen.has(d)) return;
    seen.add(d);
    out.push(d);
  });
  return out;
}

/**
 * @param {{x:number,y:number,w:number,h:number}} box
 * @param {object[]} others - other elements (non-decor)
 * @param {{canvasW:number,canvasH:number}} opts
 * @returns {{ x:number, y:number, guides:{t:'h'|'v',pos:number}[] }}
 */
export function snapBox(box, others, opts) {
  const W = opts.canvasW || DEFAULT_CANVAS_W;
  const H = opts.canvasH || DEFAULT_CANVAS_H;
  let { x, y, w, h } = box;

  const vCands = [];
  const hCands = [];

  function considerV(pos, setX) {
    const dist = Math.abs(setX - pos);
    if (dist < TH) vCands.push({ dist, pos, x: pos - (setX - x) });
  }
  function considerH(pos, setY) {
    const dist = Math.abs(setY - pos);
    if (dist < TH) hCands.push({ dist, pos, y: pos - (setY - y) });
  }

  // Slide center / edges
  considerV(W / 2, x + w / 2);
  considerH(H / 2, y + h / 2);
  considerV(0, x);
  considerH(0, y);
  considerV(W, x + w);
  considerH(H, y + h);

  nearestAxisNeighbors({ x, y, w, h }, others).forEach((d) => {
    const ox = d.x || 0;
    const oy = d.y || 0;
    const ow = d.w || 0;
    const oh = d.h || 0;
    [ox, ox + ow / 2, ox + ow].forEach((pos) => {
      considerV(pos, x);
      considerV(pos, x + w / 2);
      considerV(pos, x + w);
    });
    [oy, oy + oh / 2, oy + oh].forEach((pos) => {
      considerH(pos, y);
      considerH(pos, y + h / 2);
      considerH(pos, y + h);
    });
  });

  const guides = [];

  if (vCands.length) {
    const best = Math.min(...vCands.map((c) => c.dist));
    const win = vCands.filter((c) => c.dist <= best + 0.001);
    x = win[0].x;
    const seen = new Set();
    win.forEach((c) => {
      if (Math.abs(c.x - x) > 0.5) return;
      const k = Math.round(c.pos);
      if (seen.has(k)) return;
      seen.add(k);
      guides.push({ t: 'v', pos: c.pos });
    });
  }

  if (hCands.length) {
    const best = Math.min(...hCands.map((c) => c.dist));
    const win = hCands.filter((c) => c.dist <= best + 0.001);
    y = win[0].y;
    const seen = new Set();
    win.forEach((c) => {
      if (Math.abs(c.y - y) > 0.5) return;
      const k = Math.round(c.pos);
      if (seen.has(k)) return;
      seen.add(k);
      guides.push({ t: 'h', pos: c.pos });
    });
  }

  return { x: Math.round(x), y: Math.round(y), guides };
}

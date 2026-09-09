/** Cloud geometry — ported from js/09-shapes.js (v7.1). */
'use strict';

const CLOUD_FORMS = ['puff', 'ring', 'burst', 'trail', 'stack'];
const _CLOUD_INSERT_SIZE = 500;

function _cloudNormForm(form) {
  return CLOUD_FORMS.includes(form) ? form : 'puff';
}

function _generateCloudCircles(w, h, seed, form) {
  form = _cloudNormForm(form);
  let s = (seed || 42) >>> 0;
  function rnd() {
    s += 0x6D2B79F5; let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 0xFFFFFFFF;
  }

  const ccx = w / 2;
  const ccy = h * (0.50 + rnd() * 0.04);
  const baseR = Math.min(w, h) * (0.12 + rnd() * 0.02);
  const tiers = [
    { mul: 0.40, count: 10 + Math.floor(rnd() * 10), maxD: 0.14 },
    { mul: 0.27, count: 20 + Math.floor(rnd() * 10), maxD: 0.26 },
    { mul: 0.17, count: 30 + Math.floor(rnd() * 10), maxD: 0.36 },
    { mul: 0.10, count: 40 + Math.floor(rnd() * 20), maxD: 0.46 }
  ];
  const totalTarget = tiers.reduce((n, t) => n + t.count, 0);

  if (form === 'ring') {
    const ringRx = w * (0.34 + rnd() * 0.02);
    const ringRy = h * (0.34 + rnd() * 0.02);
    const holeRatio = 0.40 + rnd() * 0.06;
    const ringTiers = [
      { mul: 0.40, count: 30 + Math.floor(rnd() * 12), maxD: 0.16 },
      { mul: 0.27, count: 50 + Math.floor(rnd() * 16), maxD: 0.28 },
      { mul: 0.17, count: 70 + Math.floor(rnd() * 20), maxD: 0.38 },
      { mul: 0.10, count: 90 + Math.floor(rnd() * 24), maxD: 0.48 }
    ];
    const bigMul = ringTiers[0].mul;
    const nAnchor = 28 + Math.floor(rnd() * 10);
    const circles = [];

    function _ringNormDist(cx, cy) {
      return Math.hypot((cx - ccx) / ringRx, (cy - ccy) / ringRy);
    }

    function _ringSizeScale(normDist) {
      const delta = Math.abs(normDist - 1) / 0.16;
      return Math.max(0.14, 1 - delta * 0.68);
    }

    function _ringDup(cx, cy, r, tight) {
      const k = tight ? 0.10 : 0.14;
      for (const c of circles) {
        if (Math.hypot(cx - c.cx, cy - c.cy) < (r + c.r) * k) return true;
      }
      return false;
    }

    function _ringTryPush(cx, cy, r, tightDup) {
      if (r < baseR * 0.05) return false;
      if (_ringNormDist(cx, cy) < holeRatio * 0.92) return false;
      if (cx - r < w * 0.02 || cx + r > w * 0.98 || cy - r < h * 0.03 || cy + r > h * 0.97) return false;
      if (_ringDup(cx, cy, r, tightDup)) return false;
      circles.push({ cx, cy, r });
      return true;
    }

    for (let i = 0; i < nAnchor; i++) {
      const ang = (i / nAnchor) * Math.PI * 2 + (rnd() - 0.5) * 0.22;
      const cx = ccx + Math.cos(ang) * ringRx;
      const cy = ccy + Math.sin(ang) * ringRy;
      _ringTryPush(cx, cy, baseR * bigMul * (0.94 + rnd() * 0.12), true);
    }

    for (let ti = 0; ti < ringTiers.length; ti++) {
      const tier = ringTiers[ti];
      let placed = 0;
      const target = tier.count;
      const bandNorm = (baseR * (0.42 + tier.maxD * 0.62)) / Math.max(ringRx, ringRy);
      for (let att = 0; placed < target && att < target * 55; att++) {
        const ang = rnd() * Math.PI * 2;
        const normDist = 1 + (rnd() - 0.5) * bandNorm * 2.2;
        if (normDist < holeRatio) continue;
        const cx = ccx + Math.cos(ang) * ringRx * normDist + (rnd() - 0.5) * baseR * 0.14;
        const cy = ccy + Math.sin(ang) * ringRy * normDist + (rnd() - 0.5) * baseR * 0.14;
        const nd = _ringNormDist(cx, cy);
        const scale = _ringSizeScale(nd);
        let r = baseR * tier.mul * scale * (0.90 + rnd() * 0.20);
        if (ti > 0) {
          const anchor = circles[Math.floor(rnd() * circles.length)];
          const pull = 0.48 + ti * 0.05;
          const px = cx * pull + anchor.cx * (1 - pull);
          const py = cy * pull + anchor.cy * (1 - pull);
          const pd = _ringNormDist(px, py);
          if (pd < holeRatio * 0.92) continue;
          r *= _ringSizeScale(pd) / Math.max(0.2, scale);
          if (_ringTryPush(px, py, r, false)) placed++;
        } else if (_ringTryPush(cx, cy, r, false)) {
          placed++;
        }
      }
    }

    const nFill = 48 + Math.floor(rnd() * 20);
    for (let i = 0; i < nFill; i++) {
      const ang = (i / nFill) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
      const normDist = 1 + (rnd() - 0.5) * 0.10;
      const cx = ccx + Math.cos(ang) * ringRx * normDist + (rnd() - 0.5) * baseR * 0.10;
      const cy = ccy + Math.sin(ang) * ringRy * normDist + (rnd() - 0.5) * baseR * 0.10;
      const r = baseR * (0.22 + rnd() * 0.14) * _ringSizeScale(_ringNormDist(cx, cy));
      _ringTryPush(cx, cy, r, true);
    }

    return circles;
  }

  if (form === 'burst') {
    const maxR = Math.min(w, h) * (0.44 + rnd() * 0.04);
    const coreR = baseR * tiers[0].mul * (0.88 + rnd() * 0.14);
    const circles = [{ cx: ccx, cy: ccy, r: coreR }];

    function _burstDup(cx, cy, r, k) {
      k = k == null ? 0.12 : k;
      for (const c of circles) {
        if (Math.hypot(cx - c.cx, cy - c.cy) < (r + c.r) * k) return true;
      }
      return false;
    }

    function _burstTry(cx, cy, r, tight) {
      if (r < baseR * 0.035) return false;
      if (cx - r < w * 0.02 || cx + r > w * 0.98 || cy - r < h * 0.03 || cy + r > h * 0.97) return false;
      if (_burstDup(cx, cy, r, tight ? 0.08 : 0.11)) return false;
      circles.push({ cx, cy, r });
      return true;
    }

    const nRays = 32 + Math.floor(rnd() * 14);
    for (let ri = 0; ri < nRays; ri++) {
      const ang = (ri / nRays) * Math.PI * 2 + (rnd() - 0.5) * 0.3;
      const dustN = 10 + Math.floor(rnd() * 8);
      for (let di = 0; di < dustN; di++) {
        const t = (di + 0.35) / (dustN + 0.5);
        const dist = coreR * 0.55 + t * maxR * (0.92 + rnd() * 0.12);
        const perp = (rnd() - 0.5) * baseR * (0.08 + t * 0.28);
        const cx = ccx + Math.cos(ang) * dist + Math.cos(ang + Math.PI / 2) * perp;
        const cy = ccy + Math.sin(ang) * dist * 0.62 + Math.sin(ang + Math.PI / 2) * perp * 0.62;
        const r = baseR * (0.05 + (1 - t * 0.82) * 0.11) * (0.65 + rnd() * 0.55);
        _burstTry(cx, cy, r, true);
      }
    }

    const nDust = 160 + Math.floor(rnd() * 90);
    for (let i = 0; i < nDust; i++) {
      const ang = rnd() * Math.PI * 2;
      const distPow = Math.pow(rnd(), 0.48);
      const dist = coreR * 0.25 + distPow * maxR;
      const cx = ccx + Math.cos(ang) * dist + (rnd() - 0.5) * baseR * 0.22;
      const cy = ccy + Math.sin(ang) * dist * 0.62 + (rnd() - 0.5) * baseR * 0.16;
      const r = baseR * (0.04 + (1 - distPow) * 0.09 + rnd() * 0.07);
      _burstTry(cx, cy, r, false);
    }

    const burstTiers = [
      { mul: 0.32, count: 24 + Math.floor(rnd() * 10), maxD: 0.18 },
      { mul: 0.20, count: 40 + Math.floor(rnd() * 14), maxD: 0.32 },
      { mul: 0.12, count: 55 + Math.floor(rnd() * 18), maxD: 0.42 }
    ];
    for (let ti = 0; ti < burstTiers.length; ti++) {
      const tier = burstTiers[ti];
      let placed = 0;
      for (let att = 0; placed < tier.count && att < tier.count * 40; att++) {
        const ang = rnd() * Math.PI * 2;
        const dist = tier.maxD * Math.min(w, h) * (0.35 + rnd() * 0.95);
        const cx = ccx + Math.cos(ang) * dist + (rnd() - 0.5) * baseR * 0.14;
        const cy = ccy + Math.sin(ang) * dist * 0.62 + (rnd() - 0.5) * baseR * 0.12;
        const r = baseR * tier.mul * (0.82 + rnd() * 0.22);
        if (_burstTry(cx, cy, r, false)) placed++;
      }
    }

    return circles;
  }

  let totalPlaced = 0;
  const circles = [];

  if (form === 'trail') {
    circles.push({ cx: w * 0.10, cy: ccy, r: baseR * 0.38 * (0.92 + rnd() * 0.12) });
  } else if (form === 'burst') {
    circles.push({ cx: ccx, cy: ccy, r: baseR * tiers[0].mul * (0.92 + rnd() * 0.12) });
  } else if (form === 'stack') {
    circles.push({ cx: ccx, cy: h * 0.28, r: baseR * 0.34 * (0.9 + rnd() * 0.15) });
  } else {
    circles.push({
      cx: ccx + (rnd() - 0.5) * baseR * 0.35,
      cy: ccy + baseR * 0.08,
      r: baseR * tiers[0].mul * (0.92 + rnd() * 0.12)
    });
  }
  totalPlaced++;

  function _candidate(tier) {
    const ratio = totalPlaced / Math.max(1, totalTarget);
    if (form === 'burst') {
      const ang = rnd() * Math.PI * 2;
      const dist = tier.maxD * Math.min(w, h) * (0.4 + rnd() * 0.95);
      return { cx: ccx + Math.cos(ang) * dist, cy: ccy + Math.sin(ang) * dist * 0.62, maxD: tier.maxD * Math.min(w, h) * 1.25, rScale: 1 };
    }
    if (form === 'trail') {
      const t = ratio;
      return { cx: w * (0.06 + t * 0.88) + (rnd() - 0.5) * baseR * 0.5, cy: ccy + (rnd() - 0.5) * baseR * 2.2, maxD: tier.maxD * Math.min(w, h) * 1.1, rScale: Math.max(0.32, 1 - t * 0.58) };
    }
    if (form === 'stack') {
      const layer = Math.min(2, Math.floor(ratio * 3 + rnd() * 0.5));
      return { cx: ccx + (rnd() - 0.5) * w * (0.22 + layer * 0.08), cy: h * (0.24 + layer * 0.16 + rnd() * 0.07), maxD: tier.maxD * Math.min(w, h) * (0.95 - layer * 0.1), rScale: 1 - layer * 0.07 };
    }
    return null;
  }

  for (let ti = 0; ti < tiers.length; ti++) {
    const tier = tiers[ti];
    let placed = 1;
    for (let att = 0; placed < tier.count && att < tier.count * 30; att++) {
      let r = baseR * tier.mul * (0.88 + rnd() * 0.2);
      let cx, cy, maxD = tier.maxD * Math.min(w, h);
      const cand = _candidate(tier);
      if (cand) {
        r *= cand.rScale || 1;
        maxD = cand.maxD || maxD;
        const anchor = circles[Math.floor(rnd() * circles.length)];
        const pull = form === 'trail' ? 0.35 : 0.55;
        cx = cand.cx * pull + anchor.cx * (1 - pull) + (rnd() - 0.5) * r * 0.35;
        cy = cand.cy * pull + anchor.cy * (1 - pull) + (rnd() - 0.5) * r * 0.35;
      } else {
        const anchor = circles[Math.floor(rnd() * circles.length)];
        const ang = -Math.PI * 0.92 + rnd() * Math.PI * 0.84;
        const dist = (anchor.r + r) * (0.48 + rnd() * 0.24);
        cx = anchor.cx + Math.cos(ang) * dist;
        cy = anchor.cy + Math.sin(ang) * dist * 0.62;
        if (Math.hypot(cx - ccx, (cy - ccy) * 1.25) > maxD) continue;
      }
      if (cx - r < w * 0.03 || cx + r > w * 0.97 || cy - r < h * 0.04 || cy + r > h * 0.94) continue;
      let dup = false;
      for (const c of circles) {
        if (Math.hypot(cx - c.cx, cy - c.cy) < (r + c.r) * 0.18) { dup = true; break; }
      }
      if (dup) continue;
      circles.push({ cx, cy, r });
      placed++;
      totalPlaced++;
    }
  }
  return circles;
}

function _circlePathD(c) {
  const { cx, cy, r } = c;
  return `M ${(cx - r).toFixed(2)} ${cy.toFixed(2)} `
    + `A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 1 ${(cx + r).toFixed(2)} ${cy.toFixed(2)} `
    + `A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 1 ${(cx - r).toFixed(2)} ${cy.toFixed(2)} Z `;
}

function _cloudBlobsPath(circles, expandR) {
  if (!circles || !circles.length) return '';
  const exp = expandR || 0;
  return circles.map(c => _circlePathD({ cx: c.cx, cy: c.cy, r: c.r + exp })).join('').trim();
}

function _cloudCircleBounds(circles, expandR) {
  if (!circles || !circles.length) return { x: 0, y: 0, w: 1, h: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const exp = expandR || 0;
  for (const c of circles) {
    const r = c.r + exp;
    if (c.cx - r < minX) minX = c.cx - r;
    if (c.cy - r < minY) minY = c.cy - r;
    if (c.cx + r > maxX) maxX = c.cx + r;
    if (c.cy + r > maxY) maxY = c.cy + r;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function _cloudContentPad(d) {
  const sw = d && d.sw != null ? +d.sw : 0;
  let pad = Math.max(3, sw / 2 + 2);
  if (d && d.shadow) {
    const sb = d.shadowBlur != null ? +d.shadowBlur : 4;
    const ss = d.shadowSize != null ? +d.shadowSize : 3;
    pad += Math.ceil(ss + sb * 2);
  }
  return pad;
}

function _cloudResolveCircles(d, w, h) {
  if (!d) return _generateCloudCircles(w, h, 42, 'puff');
  const form = _cloudNormForm(d.cloudForm);
  const circlesForm = d.cloudCirclesForm ? _cloudNormForm(d.cloudCirclesForm) : null;
  const canScale = d.cloudCircles && d.cloudCircles.length && d.cloudRefW > 0 && d.cloudRefH > 0 &&
    circlesForm === form;
  if (!canScale) {
    if (d.cloudFramed && w > 0 && h > 0) {
      d.cloudCircles = _cloudBuildAtSize(d, w, h);
      d.cloudCirclesForm = form;
      d.cloudRefW = w;
      d.cloudRefH = h;
      return d.cloudCircles;
    }
    return _generateCloudCircles(w, h, (d.cloudSeed) || 42, form);
  }
  const sx = w / d.cloudRefW;
  const sy = h / d.cloudRefH;
  const sm = Math.min(sx, sy);
  return d.cloudCircles.map(c => ({ cx: c.cx * sx, cy: c.cy * sy, r: c.r * sm }));
}

function _cloudFillFrame(circles, w, h, inset) {
  if (!circles || !circles.length) return circles;
  inset = inset == null ? 0 : inset;
  const b = _cloudCircleBounds(circles, 0);
  if (b.w < 1 || b.h < 1) return circles;
  const tw = Math.max(1, w - inset * 2);
  const th = Math.max(1, h - inset * 2);
  const sm = Math.max(tw / b.w, th / b.h);
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  return circles.map(c => ({
    cx: (c.cx - bcx) * sm + w / 2,
    cy: (c.cy - bcy) * sm + h / 2,
    r: c.r * sm
  }));
}

function _cloudSyncMeta(el, d) {
  if (!d) return;
  if (el) {
    if (el.dataset.cloudForm) d.cloudForm = el.dataset.cloudForm;
    if (el.dataset.cloudSeed != null && el.dataset.cloudSeed !== '') d.cloudSeed = +el.dataset.cloudSeed;
    if (el.dataset.cloudRefW) d.cloudRefW = +el.dataset.cloudRefW;
    if (el.dataset.cloudRefH) d.cloudRefH = +el.dataset.cloudRefH;
    if (el.dataset.cloudFramed === '1') d.cloudFramed = true;
  }
  if (d.cloudForm) {
    d.cloudForm = _cloudNormForm(d.cloudForm);
    _cloudPersistDataset(el, d);
  } else if (el && el.dataset.cloudForm) {
    d.cloudForm = _cloudNormForm(el.dataset.cloudForm);
  }
}

function _cloudPersistDataset(el, d) {
  if (!el || !d) return;
  if (d.cloudForm) el.dataset.cloudForm = d.cloudForm;
  if (d.cloudSeed != null) el.dataset.cloudSeed = d.cloudSeed;
  if (d.cloudRefW > 0) el.dataset.cloudRefW = d.cloudRefW;
  if (d.cloudRefH > 0) el.dataset.cloudRefH = d.cloudRefH;
  if (d.cloudFramed) el.dataset.cloudFramed = '1';
}

function _cloudBuildAtSize(d, w, h) {
  const form = _cloudNormForm(d.cloudForm);
  d.cloudForm = form;
  let circles = _generateCloudCircles(w, h, d.cloudSeed || 42, form);
  d.cloudCirclesForm = form;
  return _cloudFillFrame(circles, w, h, Math.max(2, _cloudContentPad(d) * 0.4));
}

function _cloudRemapToFrame(d, w, h) {
  d.cloudCircles = _cloudBuildAtSize(d, w, h);
  d.cloudRefW = w;
  d.cloudRefH = h;
  d.cloudFrameW = w;
  d.cloudFrameH = h;
  d.w = w;
  d.h = h;
}

function _cloudRegenerate(d, el) {
  if (!d) return;
  if (el) _cloudSyncMeta(el, d);
  // Keep element box size — only reshuffle puffs inside current w×h
  const w = Math.max(24, +d.w || (el && parseInt(el.style.width, 10)) || 200);
  const h = Math.max(24, +d.h || (el && parseInt(el.style.height, 10)) || 200);
  d.w = w;
  d.h = h;
  d.cloudFrameW = w;
  d.cloudFrameH = h;
  d.cloudFramed = true;
  d.cloudCircles = _cloudBuildAtSize(d, w, h);
  d.cloudCirclesForm = _cloudNormForm(d.cloudForm);
  d.cloudRefW = w;
  d.cloudRefH = h;
  if (el) {
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    _cloudPersistDataset(el, d);
  }
}

function _cloudBakeAndFit(d, el) {
  if (!d) return;
  if (el) _cloudSyncMeta(el, d);
  const w = d.w || (el && parseInt(el.style.width)) || 200;
  const h = d.h || (el && parseInt(el.style.height)) || 200;
  const raw = _generateCloudCircles(w, h, d.cloudSeed || 42, d.cloudForm);
  const pad = _cloudContentPad(d);
  const b = _cloudCircleBounds(raw, pad * 0.45);
  const ox = Math.floor(b.x - pad);
  const oy = Math.floor(b.y - pad);
  const refW = Math.max(24, Math.ceil(b.w + pad * 2));
  const refH = Math.max(24, Math.ceil(b.h + pad * 2));
  d.cloudCircles = raw.map(c => ({ cx: c.cx - ox, cy: c.cy - oy, r: c.r }));
  d.cloudCirclesForm = _cloudNormForm(d.cloudForm);
  d.cloudRefW = refW;
  d.cloudRefH = refH;
  d.cloudFrameW = refW;
  d.cloudFrameH = refH;
  d.cloudFramed = true;
  d.x = Math.round((d.x || 0) + ox);
  d.y = Math.round((d.y || 0) + oy);
  d.w = refW;
  d.h = refH;
  if (el) {
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    el.style.width = refW + 'px';
    el.style.height = refH + 'px';
    _cloudPersistDataset(el, d);
  }
}

function _cloudShadeFromFill(fill) {
  if (!fill || fill === 'none') return '#8eb8dc';
  const hex = fill.replace('#', '');
  if (hex.length !== 6) return '#8eb8dc';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (r > 225 && g > 225 && b > 225) return '#b8ced9';
  const sr = Math.min(255, Math.round(r * 0.78 + 8));
  const sg = Math.min(255, Math.round(g * 0.82 + 12));
  const sb = Math.min(255, Math.round(b * 0.88 + 18));
  return `#${sr.toString(16).padStart(2, '0')}${sg.toString(16).padStart(2, '0')}${sb.toString(16).padStart(2, '0')}`;
}

function _cloudHighlightFromFill(fill) {
  if (!fill || fill === 'none') return '#eef6fc';
  const hex = fill.replace('#', '');
  if (hex.length !== 6) return '#eef6fc';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `#${Math.min(255, r + 38).toString(16).padStart(2, '0')}${Math.min(255, g + 42).toString(16).padStart(2, '0')}${Math.min(255, b + 28).toString(16).padStart(2, '0')}`;
}

function _buildCloudArtSvg(circles, fill, shade, op, uid, extra, shadow, w, h) {
  const path = _cloudBlobsPath(circles, 0);
  const gid = `cg_${uid}`;
  const opAttr = op < 1 ? ` opacity="${op.toFixed(3)}"` : '';
  const defs = `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="${(h * 0.08).toFixed(1)}" x2="0" y2="${h.toFixed(1)}">`
    + `<stop offset="0%" stop-color="${_cloudHighlightFromFill(fill)}"/>`
    + `<stop offset="45%" stop-color="${fill}"/>`
    + `<stop offset="100%" stop-color="${shade}"/>`
    + `</linearGradient>`;
  const body = `<path d="${path}" fill-rule="nonzero" fill="url(#${gid})" stroke="none" ${extra}${shadow}${opAttr}/>`;
  return `<defs>${defs}</defs>` + body;
}

function _generateCloudPath(w, h, seed, form, d) {
  const circles = d ? _cloudResolveCircles(d, w, h) : _generateCloudCircles(w, h, seed, form);
  return _cloudBlobsPath(circles, 0);
}

function _generateCloudStrokePath(w, h, seed, sw, form, d) {
  if (!sw || sw <= 0) return '';
  const circles = d ? _cloudResolveCircles(d, w, h) : _generateCloudCircles(w, h, seed, form);
  return _cloudBlobsPath(circles, sw / 2);
}

export function cloudNormForm(form) { return _cloudNormForm(form); }
export function generateCloudCircles(w, h, seed, form) { return _generateCloudCircles(w, h, seed, form); }
export function cloudResolveCircles(d, w, h) { return _cloudResolveCircles(d, w, h); }
export function cloudBlobsPath(circles, expandR) { return _cloudBlobsPath(circles, expandR); }
export function cloudCircleBounds(circles, expandR) { return _cloudCircleBounds(circles, expandR); }
export function cloudBakeAndFit(d, el) { return _cloudBakeAndFit(d, el); }
export function cloudRegenerate(d, el) { return _cloudRegenerate(d, el); }
export function cloudForms() { return CLOUD_FORMS.slice(); }
export function buildCloudArtSvg(circles, fill, shade, op, uid, extra, shadow, w, h) {
  return _buildCloudArtSvg(circles, fill, shade, op, uid, extra, shadow, w, h);
}
export function cloudShadeFromFill(fill) { return _cloudShadeFromFill(fill); }
export function cloudHighlightFromFill(fill) { return _cloudHighlightFromFill(fill); }
export function generateCloudPath(w, h, seed, form, d) { return _generateCloudPath(w, h, seed, form, d); }

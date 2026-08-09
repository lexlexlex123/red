// ══════════════ LINE ANGLE MARKERS ══════════════
// Angle arc / square-corner between two joined line segments.

(function () {
  'use strict';

  const DEFAULT_R = 36;
  const DEFAULT_LABEL_FS = 18; // pt (UI); rendered as px via 96/72
  const LABEL_STYLES = ['hidden', 'deg', 'alpha', 'beta', 'gamma', 'qmark'];

  function _defaultAngleColor() {
    if (typeof _defaultLineColor === 'function') {
      const r = _defaultLineColor();
      return { color: r.color, scheme: r.schemeRef };
    }
    return { color: '#64748b', scheme: { col: 0, row: 4 } };
  }
  function _fallbackAngleColor() {
    return _defaultAngleColor().color;
  }

  function _labelFsPt(d) {
    const v = d && d.labelFs != null ? +d.labelFs : DEFAULT_LABEL_FS;
    if (!isFinite(v) || v < 6) return DEFAULT_LABEL_FS;
    return Math.min(72, Math.max(6, Math.round(v)));
  }
  function _labelFsPx(pt) {
    return Math.round((+pt || DEFAULT_LABEL_FS) * 96 / 72);
  }

  function _langIsEn() {
    return typeof getLang === 'function' && getLang() === 'en';
  }

  function _selectedLineAngleEl() {
    if (typeof sel !== 'undefined' && sel && sel.dataset && sel.dataset.type === 'lineangle') return sel;
    return document.querySelector('#canvas .el.sel[data-type="lineangle"]');
  }

  function _findSharedJoin(d1, d2) {
    if (!d1 || !d2 || d1.shape !== 'line' || d2.shape !== 'line') return null;
    if (typeof _migrateSlideLineJoins === 'function') _migrateSlideLineJoins();
    if (typeof _endJunctionId === 'function') {
      for (const e1 of ['a', 'b']) {
        const j1 = _endJunctionId(d1, e1);
        if (!j1) continue;
        for (const e2 of ['a', 'b']) {
          if (_endJunctionId(d2, e2) === j1) return { jid: j1, end1: e1, end2: e2 };
        }
      }
    }
    // Fallback: ends that nearly coincide (joined visually / legacy data)
    if (typeof _findLineEl !== 'function' || typeof _lineCanvasEnds !== 'function') return null;
    const el1 = _findLineEl(d1.id), el2 = _findLineEl(d2.id);
    if (!el1 || !el2) return null;
    const ends1 = _lineCanvasEnds(el1, d1), ends2 = _lineCanvasEnds(el2, d2);
    const TH = 12;
    for (const e1 of ['a', 'b']) {
      for (const e2 of ['a', 'b']) {
        const p1 = ends1[e1], p2 = ends2[e2];
        if (Math.hypot(p1.x - p2.x, p1.y - p2.y) <= TH) {
          return { jid: null, end1: e1, end2: e2, geometric: true };
        }
      }
    }
    return null;
  }

  function _measurePair(dA, endA, dB, endB) {
    const elA = typeof _findLineEl === 'function' ? _findLineEl(dA.id) : null;
    const elB = typeof _findLineEl === 'function' ? _findLineEl(dB.id) : null;
    if (!elA || !elB || typeof _lineCanvasEnds !== 'function') return null;
    const eA = _lineCanvasEnds(elA, dA);
    const eB = _lineCanvasEnds(elB, dB);
    const ea = endA === 'b' ? 'b' : 'a';
    const eb = endB === 'b' ? 'b' : 'a';
    const j = eA[ea];
    const pA = eA[ea === 'a' ? 'b' : 'a'];
    const pB = eB[eb === 'a' ? 'b' : 'a'];
    const a1 = Math.atan2(pA.y - j.y, pA.x - j.x);
    const a2 = Math.atan2(pB.y - j.y, pB.x - j.x);
    let delta = a2 - a1;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta <= -Math.PI) delta += 2 * Math.PI;
    return {
      j, a1, a2, delta,
      deg: Math.abs(delta) * 180 / Math.PI,
      pA, pB, elA, elB, endA: ea, endB: eb
    };
  }

  function _pairFromMulti() {
    if (typeof multiSel === 'undefined' || !multiSel || multiSel.size !== 2) return null;
    if (typeof slides === 'undefined' || !slides[cur]) return null;
    const els = [...multiSel];
    if (els.some(el => el.dataset.type !== 'shape' || el.dataset.shape !== 'line')) return null;
    const d1 = slides[cur].els.find(e => e && e.id === els[0].dataset.id);
    const d2 = slides[cur].els.find(e => e && e.id === els[1].dataset.id);
    let shared = _findSharedJoin(d1, d2);
    if (!shared) return null;
    // Formalize geometric proximity into a real junction and coalesce ends
    if (shared.geometric && typeof _joinLineEnds === 'function') {
      const jid = _joinLineEnds(d1, shared.end1, d2, shared.end2);
      if (jid && typeof _coalesceJunction === 'function') _coalesceJunction(jid, null);
      shared = _findSharedJoin(d1, d2) || shared;
    }
    return { d1, d2, end1: shared.end1, end2: shared.end2, jid: shared.jid };
  }

  window._canDrawAngleBetweenMulti = function () {
    return !!_pairFromMulti();
  };

  function _fmtDeg(deg) {
    const v = Math.round(deg * 10) / 10;
    return (Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) : v.toFixed(1)) + '°';
  }

  function _normLabelStyle(s) {
    // Migrate legacy combined styles (markN used to wipe label)
    if (s === 'mark1' || s === 'mark2' || s === 'mark3' || s === 'mark4') return 'deg';
    return LABEL_STYLES.includes(s) ? s : 'deg';
  }

  function _normMarkCount(n, legacyStyle) {
    if (legacyStyle === 'mark1') return 1;
    if (legacyStyle === 'mark2') return 2;
    if (legacyStyle === 'mark3') return 3;
    if (legacyStyle === 'mark4') return 4;
    const v = parseInt(n, 10);
    if (v >= 1 && v <= 4) return v;
    return 1;
  }

  function _labelText(style, deg, displayDeg) {
    if (style === 'deg') {
      const v = (displayDeg != null && isFinite(+displayDeg)) ? +displayDeg : deg;
      return _fmtDeg(v);
    }
    if (style === 'alpha') return 'α';
    if (style === 'beta') return 'β';
    if (style === 'gamma') return 'γ';
    if (style === 'qmark') return '?';
    return '';
  }

  function _arcPath(j, a1, a2, r, ox, oy) {
    const x1 = j.x + Math.cos(a1) * r, y1 = j.y + Math.sin(a1) * r;
    const x2 = j.x + Math.cos(a2) * r, y2 = j.y + Math.sin(a2) * r;
    let delta = a2 - a1;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta <= -Math.PI) delta += 2 * Math.PI;
    const large = Math.abs(delta) > Math.PI ? 1 : 0;
    const sweep = delta > 0 ? 1 : 0;
    return `M ${x1 - ox} ${y1 - oy} A ${r} ${r} 0 ${large} ${sweep} ${x2 - ox} ${y2 - oy}`;
  }

  function _buildAngleSvg(m, radius, color, labelStyle, markCount, displayDeg, labelFs) {
    const r = radius || DEFAULT_R;
    const col = color || _fallbackAngleColor();
    const style = _normLabelStyle(labelStyle);
    const nMarks = _normMarkCount(markCount);
    const fsPt = (labelFs != null && isFinite(+labelFs)) ? Math.min(72, Math.max(6, +labelFs)) : DEFAULT_LABEL_FS;
    const fsPx = _labelFsPx(fsPt);
    // Square corner only for exact measured 90° with a single arc mark
    const useSquare = Math.abs(m.deg - 90) < 0.6 && nMarks === 1;
    const j = m.j;
    const pad = r + Math.max(28, Math.ceil(fsPx * 1.2));
    const ox = j.x - pad, oy = j.y - pad;
    const size = pad * 2;
    const u1x = Math.cos(m.a1), u1y = Math.sin(m.a1);
    const u2x = Math.cos(m.a2), u2y = Math.sin(m.a2);
    let mark = '';
    if (useSquare) {
      const s = Math.min(r, 28);
      const qx = j.x + u1x * s, qy = j.y + u1y * s;
      const sx = j.x + u2x * s, sy = j.y + u2y * s;
      const rx = j.x + u1x * s + u2x * s, ry = j.y + u1y * s + u2y * s;
      mark = `<path d="M ${qx - ox} ${qy - oy} L ${rx - ox} ${ry - oy} L ${sx - ox} ${sy - oy}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" style="pointer-events:stroke;cursor:pointer"/>`;
    } else {
      for (let i = 0; i < nMarks; i++) {
        const rr = Math.max(10, r - i * 6);
        mark += `<path d="${_arcPath(j, m.a1, m.a2, rr, ox, oy)}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" style="pointer-events:stroke;cursor:pointer"/>`;
      }
    }
    const label = _labelText(style, m.deg, displayDeg);
    if (label) {
      const mid = m.a1 + m.delta / 2;
      const lr = r + 14 + fsPx * 0.35;
      const lx = j.x + Math.cos(mid) * lr;
      const ly = j.y + Math.sin(mid) * lr;
      mark += `<text class="lineangle-label" x="${lx - ox}" y="${ly - oy}" text-anchor="middle" dominant-baseline="middle" fill="${col}" font-size="${fsPx}" font-family="Segoe UI,system-ui,sans-serif" font-weight="600" style="cursor:pointer;pointer-events:auto">${label}</text>`;
    }
    return {
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible;pointer-events:none">${mark}</svg>`,
      x: ox, y: oy, w: size, h: size, label
    };
  }

  function _migrateAngleFields(d) {
    if (!d) return;
    const legacy = d.labelStyle;
    if (legacy === 'mark1' || legacy === 'mark2' || legacy === 'mark3' || legacy === 'mark4') {
      if (d.markCount == null) d.markCount = _normMarkCount(null, legacy);
      d.labelStyle = 'deg';
    }
    d.labelStyle = _normLabelStyle(d.labelStyle);
    d.markCount = _normMarkCount(d.markCount, null);
    if (!d.color) {
      const def = _defaultAngleColor();
      d.color = def.color;
      if (d.colorScheme === undefined) d.colorScheme = def.scheme;
    } else if (d.colorScheme === undefined) {
      // Legacy angles without scheme stay custom (null) so theme won't remap them
      d.colorScheme = null;
    }
    d.labelFs = _labelFsPt(d);
  }

  function _lineDataCanvasEnds(d) {
    if (!d) return null;
    const w = d.w || 100, h = d.h || 24;
    const ends = (typeof _lineLocalEnds === 'function')
      ? _lineLocalEnds(d, w, h)
      : { x1: 0, y1: h / 2, x2: Math.max(1, w), y2: h / 2 };
    const L = d.x || 0, T = d.y || 0;
    const rot = (d.rot || 0) * Math.PI / 180;
    const fx = d.shapeFlipH ? -1 : 1;
    const fy = d.shapeFlipV ? -1 : 1;
    const cosr = Math.cos(rot), sinr = Math.sin(rot);
    const cx = L + w / 2, cy = T + h / 2;
    function map(lx, ly) {
      const dx = (lx - w / 2) * fx, dy = (ly - h / 2) * fy;
      return { x: cx + dx * cosr - dy * sinr, y: cy + dx * sinr + dy * cosr };
    }
    return { a: map(ends.x1, ends.y1), b: map(ends.x2, ends.y2) };
  }

  function _measurePairFromData(dA, endA, dB, endB) {
    const eA = _lineDataCanvasEnds(dA);
    const eB = _lineDataCanvasEnds(dB);
    if (!eA || !eB) return null;
    const ea = endA === 'b' ? 'b' : 'a';
    const eb = endB === 'b' ? 'b' : 'a';
    const j = eA[ea];
    const pA = eA[ea === 'a' ? 'b' : 'a'];
    const pB = eB[eb === 'a' ? 'b' : 'a'];
    const a1 = Math.atan2(pA.y - j.y, pA.x - j.x);
    const a2 = Math.atan2(pB.y - j.y, pB.x - j.x);
    let delta = a2 - a1;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta <= -Math.PI) delta += 2 * Math.PI;
    return {
      j, a1, a2, delta,
      deg: Math.abs(delta) * 180 / Math.PI,
      pA, pB
    };
  }

  /** Build angle SVG from slide data (preview / export — no editor canvas DOM) */
  window.buildLineAngleContent = function (d, els) {
    if (!d || d.type !== 'lineangle' || !els) return null;
    const dA = els.find(e => e && e.id === d.lineIdA && e.shape === 'line');
    const dB = els.find(e => e && e.id === d.lineIdB && e.shape === 'line');
    if (!dA || !dB) return null;
    const m = _measurePairFromData(dA, d.endA || 'a', dB, d.endB || 'a');
    if (!m) return null;
    _migrateAngleFields(d);
    return _buildAngleSvg(
      m,
      d.radius || DEFAULT_R,
      d.color || _fallbackAngleColor(),
      d.labelStyle,
      d.markCount,
      d.displayDeg,
      _labelFsPt(d)
    );
  };

  function _persistAngleDataset(el, d) {
    try {
      el.dataset.lineAngle = JSON.stringify({
        lineIdA: d.lineIdA, endA: d.endA, lineIdB: d.lineIdB, endB: d.endB,
        radius: d.radius || DEFAULT_R, color: d.color || _fallbackAngleColor(), moveLine: d.moveLine || 'B',
        labelStyle: _normLabelStyle(d.labelStyle), markCount: _normMarkCount(d.markCount),
        deg: d.deg, displayDeg: d.displayDeg != null ? d.displayDeg : null,
        labelFs: _labelFsPt(d),
        colorScheme: d.colorScheme !== undefined ? d.colorScheme : undefined
      });
    } catch (e) {}
  }

  function renderLineAngleEl(el, d) {
    if (!el || !d || d.type !== 'lineangle') return;
    if (typeof slides === 'undefined' || !slides[cur]) return;
    const dA = slides[cur].els.find(e => e && e.id === d.lineIdA && e.shape === 'line');
    const dB = slides[cur].els.find(e => e && e.id === d.lineIdB && e.shape === 'line');
    const c = el.querySelector('.ec');
    if (!dA || !dB) {
      el.style.opacity = '0.35';
      if (c) c.innerHTML = '<span style="opacity:.6;font-size:12px;color:#888">∠</span>';
      return;
    }
    const m = _measurePair(dA, d.endA || 'a', dB, d.endB || 'a');
    if (!m) return;
    d.deg = m.deg;
    _migrateAngleFields(d);
    const built = _buildAngleSvg(m, d.radius || DEFAULT_R, d.color || _fallbackAngleColor(), d.labelStyle, d.markCount, d.displayDeg, _labelFsPt(d));
    d.x = built.x; d.y = built.y; d.w = built.w; d.h = built.h;
    el.style.left = d.x + 'px';
    el.style.top = d.y + 'px';
    el.style.width = d.w + 'px';
    el.style.height = d.h + 'px';
    el.style.transform = 'none';
    el.dataset.rot = '0';
    el.style.opacity = '1';
    el.style.zIndex = '6';
    el.style.pointerEvents = 'none'; // box passes through; path/label re-enable hits
    if (c) {
      c.style.pointerEvents = 'none';
      c.innerHTML = built.html;
      const svg = c.querySelector('svg');
      if (svg) {
        svg.style.pointerEvents = 'none';
        svg.querySelectorAll('path').forEach(p => {
          p.style.pointerEvents = 'stroke';
          p.style.cursor = 'pointer';
        });
        svg.querySelectorAll('text, .lineangle-label').forEach(t => {
          t.style.pointerEvents = 'auto';
          t.style.cursor = 'pointer';
        });
      }
    }
    _persistAngleDataset(el, d);
  }
  window.renderLineAngleEl = renderLineAngleEl;

  /** Prefer a line (or other element) under an angle marker at screen point */
  window._findElUnderLineAngle = function (clientX, clientY, angleEl) {
    if (!angleEl) return null;
    let saved = [];
    function disableTree(root) {
      saved.push([root, root.style.pointerEvents]);
      root.style.pointerEvents = 'none';
      root.querySelectorAll('*').forEach(n => {
        saved.push([n, n.style.pointerEvents]);
        n.style.pointerEvents = 'none';
      });
    }
    function restoreTree() {
      saved.forEach(([n, pe]) => { n.style.pointerEvents = pe; });
      saved = [];
    }
    const canvas = document.getElementById('canvas');
    const angles = canvas
      ? Array.from(canvas.querySelectorAll('.el[data-type="lineangle"]'))
      : [angleEl];
    angles.forEach(disableTree);
    const stack = document.elementsFromPoint(clientX, clientY);
    restoreTree();

    for (const node of stack) {
      const owner = node.closest && node.closest('.el');
      if (!owner || owner === angleEl || owner.classList.contains('decor-el')) continue;
      if (owner.dataset.type === 'lineangle') continue;
      if (owner.dataset.type === 'shape' && owner.dataset.shape === 'line') return owner;
    }
    for (const node of stack) {
      const owner = node.closest && node.closest('.el');
      if (!owner || owner === angleEl || owner.classList.contains('decor-el')) continue;
      if (owner.dataset.type === 'lineangle') continue;
      if (typeof _pointHitsEl === 'function' && (owner.dataset.type === 'shape' || owner.dataset.type === 'image' || owner.dataset.type === 'svg')) {
        angles.forEach(disableTree);
        const ok = _pointHitsEl(owner, clientX, clientY);
        restoreTree();
        if (!ok) continue;
      }
      return owner;
    }
    return null;
  };

  window.refreshAllLineAngles = function () {
    if (typeof slides === 'undefined' || !slides[cur]) return;
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    (slides[cur].els || []).forEach(d => {
      if (!d || d.type !== 'lineangle') return;
      const el = canvas.querySelector('.el[data-id="' + d.id + '"]');
      if (el) renderLineAngleEl(el, d);
    });
  };

  function _promptDeg(current) {
    const msg = _langIsEn() ? 'Angle (degrees):' : 'Угол (градусы):';
    const raw = window.prompt(msg, String(Math.round(current * 10) / 10));
    if (raw == null) return null;
    const v = parseFloat(String(raw).replace(',', '.').replace('°', ''));
    if (!isFinite(v) || v <= 0 || v >= 180) {
      if (typeof toast === 'function') {
        toast(_langIsEn() ? 'Enter an angle between 0 and 180' : 'Введите угол от 0 до 180', 'err');
      }
      return null;
    }
    return v;
  }

  function _rotateLineToAngle(d, m, targetDeg, moveB) {
    const target = Math.max(0.5, Math.min(179.5, +targetDeg));
    const targetRad = target * Math.PI / 180;
    const sign = m.delta >= 0 ? 1 : -1;
    const fixedA = moveB ? m.a1 : m.a2;
    const newA = moveB ? (fixedA + sign * targetRad) : (fixedA - sign * targetRad);
    const moveD = moveB ? slides[cur].els.find(e => e && e.id === d.lineIdB) : slides[cur].els.find(e => e && e.id === d.lineIdA);
    const moveEl = moveB ? m.elB : m.elA;
    if (!moveD || !moveEl || typeof _setLineEndCanvas !== 'function' || typeof _lineCanvasEnds !== 'function') return false;
    const jEnd = moveB ? (d.endB === 'b' ? 'b' : 'a') : (d.endA === 'b' ? 'b' : 'a');
    const freeEnd = jEnd === 'a' ? 'b' : 'a';
    const curEnds = _lineCanvasEnds(moveEl, moveD);
    const j = curEnds[jEnd];
    const free = curEnds[freeEnd];
    const len = Math.max(8, Math.hypot(free.x - j.x, free.y - j.y));
    const newPt = { x: j.x + Math.cos(newA) * len, y: j.y + Math.sin(newA) * len };
    _setLineEndCanvas(moveEl, moveD, freeEnd, newPt);
    const freeJid = typeof _endJunctionId === 'function' ? _endJunctionId(moveD, freeEnd) : null;
    if (freeJid && typeof _moveJunctionTo === 'function') {
      _moveJunctionTo(freeJid, newPt, moveD.id, freeEnd);
    }
    // Keep the shared vertex glued
    const jid = typeof _endJunctionId === 'function' ? _endJunctionId(moveD, jEnd) : null;
    if (jid && typeof _coalesceJunction === 'function') {
      _coalesceJunction(jid, j);
    }
    return true;
  }

  window.applyLineAngleDeg = function (angleId, newDeg, opts) {
    opts = opts || {};
    if (typeof slides === 'undefined' || !slides[cur]) return;
    const d = slides[cur].els.find(e => e && e.id === angleId && e.type === 'lineangle');
    if (!d) return;
    const dA = slides[cur].els.find(e => e && e.id === d.lineIdA && e.shape === 'line');
    const dB = slides[cur].els.find(e => e && e.id === d.lineIdB && e.shape === 'line');
    if (!dA || !dB) return;
    const m = _measurePair(dA, d.endA || 'a', dB, d.endB || 'a');
    if (!m) return;
    const target = Math.max(0.5, Math.min(179.5, +newDeg));
    if (!isFinite(target)) return;
    if (Math.abs(m.deg - target) < 0.05) {
      d.deg = m.deg;
      return;
    }
    if (!opts.skipUndo) {
      if (typeof debouncedPushUndo === 'function') debouncedPushUndo();
      else if (typeof pushUndo === 'function') pushUndo();
    }
    const preferB = (d.moveLine || 'B') !== 'A';
    _rotateLineToAngle(d, m, target, preferB);
    // If geometry barely changed (locked network), try the other ray
    const m2 = _measurePair(dA, d.endA || 'a', dB, d.endB || 'a');
    if (m2 && Math.abs(m2.deg - target) > 1.5) {
      _rotateLineToAngle(d, m2, target, !preferB);
    }
    window.refreshAllLineAngles();
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
    if (typeof _updateHandlesOverlay === 'function') _updateHandlesOverlay();
    if (typeof syncProps === 'function') syncProps();
  };

  window.editLineAngleInteractive = function (angleId) {
    if (typeof slides === 'undefined' || !slides[cur]) return;
    const d = slides[cur].els.find(e => e && e.id === angleId && e.type === 'lineangle');
    if (!d) return;
    const shown = d.displayDeg != null ? d.displayDeg : (d.deg || 90);
    const v = _promptDeg(shown);
    if (v == null) return;
    applySelectedLineAngle(v, true, angleId);
  };

  window.deleteSelectedLineAngle = function () {
    const el = _selectedLineAngleEl();
    if (!el) return;
    if (typeof pick === 'function') pick(el);
    if (typeof deleteSelected === 'function') deleteSelected();
  };

  window.setLineAngleLabelStyle = function (style) {
    const el = _selectedLineAngleEl();
    if (!el || typeof slides === 'undefined' || !slides[cur]) return;
    const d = slides[cur].els.find(e => e && e.id === el.dataset.id && e.type === 'lineangle');
    if (!d) return;
    _migrateAngleFields(d);
    const next = _normLabelStyle(style);
    if (d.labelStyle === next) return;
    if (typeof debouncedPushUndo === 'function') debouncedPushUndo();
    else if (typeof pushUndo === 'function') pushUndo();
    d.labelStyle = next;
    renderLineAngleEl(el, d);
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
    if (typeof syncProps === 'function') syncProps();
  };

  window.setLineAngleMarkCount = function (n) {
    const el = _selectedLineAngleEl();
    if (!el || typeof slides === 'undefined' || !slides[cur]) return;
    const d = slides[cur].els.find(e => e && e.id === el.dataset.id && e.type === 'lineangle');
    if (!d) return;
    _migrateAngleFields(d);
    const next = _normMarkCount(n);
    if (d.markCount === next) return;
    if (typeof debouncedPushUndo === 'function') debouncedPushUndo();
    else if (typeof pushUndo === 'function') pushUndo();
    d.markCount = next;
    renderLineAngleEl(el, d);
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
    if (typeof syncProps === 'function') syncProps();
  };

  window.setLineAngleColor = function (c, sr) {
    const el = _selectedLineAngleEl();
    if (!el || typeof slides === 'undefined' || !slides[cur]) return;
    const d = slides[cur].els.find(e => e && e.id === el.dataset.id && e.type === 'lineangle');
    if (!d) return;
    const col = (c && c !== 'none') ? c : _fallbackAngleColor();
    const nextSr = sr !== undefined ? (sr || null) : d.colorScheme;
    if (d.color === col && JSON.stringify(d.colorScheme || null) === JSON.stringify(nextSr || null)) return;
    if (typeof debouncedPushUndo === 'function') debouncedPushUndo();
    else if (typeof pushUndo === 'function') pushUndo();
    d.color = col;
    if (sr !== undefined) d.colorScheme = sr || null;
    renderLineAngleEl(el, d);
    if (typeof _setColorFieldValue === 'function') {
      _setColorFieldValue('p-lineangle-hex', 'p-lineangle-preview', col, d.colorScheme);
    } else {
      const prev = document.getElementById('p-lineangle-preview');
      if (prev) prev.style.background = col;
      const hex = document.getElementById('p-lineangle-hex');
      if (hex && document.activeElement !== hex) {
        hex.value = (typeof _colorFieldDisplay === 'function')
          ? _colorFieldDisplay(col, d.colorScheme)
          : col;
      }
    }
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
  };

  window.setLineAngleLabelFs = function (pt) {
    const el = _selectedLineAngleEl();
    if (!el || typeof slides === 'undefined' || !slides[cur]) return;
    const d = slides[cur].els.find(e => e && e.id === el.dataset.id && e.type === 'lineangle');
    if (!d) return;
    const next = _labelFsPt({ labelFs: pt });
    if (_labelFsPt(d) === next) return;
    if (typeof debouncedPushUndo === 'function') debouncedPushUndo();
    else if (typeof pushUndo === 'function') pushUndo();
    d.labelFs = next;
    renderLineAngleEl(el, d);
    const inp = document.getElementById('p-lineangle-fs');
    if (inp && document.activeElement !== inp) {
      inp.value = next;
      if (typeof refreshNumScrubber === 'function') refreshNumScrubber(inp);
    }
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
  };

  window.drawAngleBetweenSelectedLines = function () {
    const pair = _pairFromMulti();
    if (!pair) {
      if (typeof toast === 'function') {
        toast(_langIsEn()
          ? 'Select two joined line segments'
          : 'Выделите два связанных отрезка', 'err');
      }
      return;
    }
    if (typeof slides === 'undefined' || !slides[cur]) return;
    const existing = (slides[cur].els || []).find(e =>
      e && e.type === 'lineangle' &&
      ((e.lineIdA === pair.d1.id && e.lineIdB === pair.d2.id) ||
       (e.lineIdA === pair.d2.id && e.lineIdB === pair.d1.id))
    );
    if (existing) {
      const el = document.getElementById('canvas') &&
        document.getElementById('canvas').querySelector('.el[data-id="' + existing.id + '"]');
      if (el && typeof renderLineAngleEl === 'function') renderLineAngleEl(el, existing);
      if (el && typeof pick === 'function') {
        if (typeof clearMultiSel === 'function') clearMultiSel();
        pick(el);
      }
      if (typeof toast === 'function') {
        toast(_langIsEn() ? 'Angle already exists' : 'Угол уже нарисован', 'ok');
      }
      return;
    }
    if (typeof pushUndo === 'function') pushUndo();
    const m = _measurePair(pair.d1, pair.end1, pair.d2, pair.end2);
    if (!m) {
      if (typeof toast === 'function') {
        toast(_langIsEn() ? 'Could not measure angle' : 'Не удалось измерить угол', 'err');
      }
      return;
    }
    const id = 'e' + (++ec);
    const _ac = _defaultAngleColor();
    const d = {
      id,
      type: 'lineangle',
      x: m.j.x - DEFAULT_R - 28,
      y: m.j.y - DEFAULT_R - 28,
      w: (DEFAULT_R + 28) * 2,
      h: (DEFAULT_R + 28) * 2,
      rot: 0,
      lineIdA: pair.d1.id,
      endA: pair.end1,
      lineIdB: pair.d2.id,
      endB: pair.end2,
      radius: DEFAULT_R,
      color: _ac.color,
      colorScheme: _ac.scheme,
      moveLine: 'B',
      labelStyle: 'deg',
      markCount: 1,
      labelFs: DEFAULT_LABEL_FS,
      deg: m.deg,
      displayDeg: Math.round(m.deg * 10) / 10,
      anims: []
    };
    slides[cur].els.push(d);
    if (typeof mkEl === 'function') mkEl(d);
    const el = document.getElementById('canvas').querySelector('.el[data-id="' + id + '"]');
    if (el && typeof renderLineAngleEl === 'function') renderLineAngleEl(el, d);
    if (typeof clearMultiSel === 'function') clearMultiSel();
    if (el && typeof pick === 'function') pick(el);
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
    if (typeof toast === 'function') {
      toast(_langIsEn() ? 'Angle added' : 'Угол добавлен', 'ok');
    }
  };

  window.applySelectedLineAngle = function (v, force, angleId) {
    const el = angleId
      ? (document.getElementById('canvas') && document.getElementById('canvas').querySelector('.el[data-id="' + angleId + '"]'))
      : _selectedLineAngleEl();
    if (!el || typeof slides === 'undefined' || !slides[cur]) return;
    if (!isFinite(+v)) return;
    const inp = document.getElementById('p-lineangle-deg');
    // Scrubber blurs before input; while typing wait for change (force)
    if (!force && !angleId && inp && document.activeElement === inp) return;
    const d = slides[cur].els.find(e => e && e.id === el.dataset.id && e.type === 'lineangle');
    if (!d) return;
    const next = Math.round(+v * 10) / 10;
    if (d.displayDeg != null && Math.abs(+d.displayDeg - next) < 0.001) return;
    if (typeof debouncedPushUndo === 'function') debouncedPushUndo();
    else if (typeof pushUndo === 'function') pushUndo();
    d.displayDeg = next;
    // Prefer showing degrees when user edits the number
    if (d.labelStyle === 'hidden') d.labelStyle = 'deg';
    renderLineAngleEl(el, d);
    if (typeof save === 'function') save();
    if (typeof drawThumbs === 'function') drawThumbs();
    if (typeof saveState === 'function') saveState();
    if (typeof syncProps === 'function') syncProps();
  };

  window._syncLineAngleLabelBtns = function (style, markCount) {
    const s = _normLabelStyle(style);
    const n = _normMarkCount(markCount);
    document.querySelectorAll('#la-label-btns .la-label-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.la === s);
    });
    document.querySelectorAll('#la-mark-btns .la-label-btn').forEach(btn => {
      btn.classList.toggle('active', +btn.dataset.marks === n);
    });
  };

  // Hook: keep markers glued after line geometry changes
  const _origSync = window._syncLineJoinsAfterMove;
  if (typeof _origSync === 'function') {
    window._syncLineJoinsAfterMove = function (el) {
      _origSync(el);
      window.refreshAllLineAngles();
    };
  }
})();

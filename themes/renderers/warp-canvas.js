/* Cosmos star-warp — canvas 2D · v2.8 */
(function(){
  const _active = new Map();
  const NEAR_U = 0.78;
  const WARP_VERSION = '2.8';

  function _hexRgb(hex){
    const h = String(hex || '#fff').replace('#', '');
    if (h.length === 3) {
      return h.split('').map(c => parseInt(c + c, 16));
    }
    return [
      parseInt(h.slice(0, 2), 16) || 255,
      parseInt(h.slice(2, 4), 16) || 255,
      parseInt(h.slice(4, 6), 16) || 255
    ];
  }

  function _rng(s){
    let x = Math.sin(s * 91.3 + 17.4) * 43758.5;
    return x - Math.floor(x);
  }

  function _rgbStr(rgb){
    return rgb[0] + ',' + rgb[1] + ',' + rgb[2];
  }

  function _sizeK(w, h){
    const ref = Math.min(w, h);
    return Math.min(1.55, Math.max(0.32, ref / 320));
  }

  function _starCount(w, h, isTitle){
    const area = w * h;
    const cap = isTitle ? 420 : 320;
    const floor = isTitle ? 280 : 210;
    return Math.max(floor, Math.min(cap, Math.round(area / 1600)));
  }

  class WarpRenderer {
    constructor(cfg){
      this.cfg = Object.assign({
        w: 960, h: 540, a1: '#6366f1', a2: '#818cf8',
        isTitle: true, animated: true, isLight: false
      }, cfg || {});
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      this.ctx = null;
      const se = cfg && cfg.startElapsed != null ? +cfg.startElapsed : 0;
      this.t0 = performance.now() - se * 1000;
      this.pausedAt = null;
      this.raf = null;
      this._alive = true;
      this.stars = [];
    }

    _rebuild(){
      const c = this.cfg;
      const w = Math.max(1, Math.round(c.w));
      const h = Math.max(1, Math.round(c.h));
      c.w = w; c.h = h;
      const dpr = Math.min(1.25, window.devicePixelRatio || 1);
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      const ctx = this.canvas.getContext('2d', { alpha: true });
      if (!ctx) return false;
      this.ctx = ctx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._makeStars();
      return true;
    }

    _makeStars(){
      const c = this.cfg;
      const w = c.w, h = c.h;
      const isTitle = !!c.isTitle;
      const isLight = !!c.isLight;
      const rgb1 = _hexRgb(c.a1), rgb2 = _hexRgb(c.a2);
      const white = isLight ? rgb1 : [255, 255, 255];
      const cx = w * 0.5, cy = h * 0.5;
      const focal = Math.min(w, h) * 0.28;
      const aspect = h / Math.max(1, w);
      const zFar = 1, zNear = 0.042, dz = 0.06;
      const rhoMax = 0.95 * Math.max(w, h) / Math.max(1, focal);
      const sk = _sizeK(w, h);
      const cols = [_rgbStr(rgb1), _rgbStr(rgb2), _rgbStr(white)];
      const pickCol = (seed) => {
        if (_rng(seed) > 0.55) return 0;
        if (_rng(seed + 1) > 0.5) return 1;
        return 2;
      };

      const n = _starCount(w, h, isTitle);
      this.stars = new Array(n);
      for (let i = 0; i < n; i++) {
        const seed = i * 17 + 3;
        const ang = _rng(seed) * Math.PI * 2;
        const rho = Math.sqrt(_rng(seed + 1)) * rhoMax;
        this.stars[i] = {
          ux: Math.cos(ang) * rho,
          uy: Math.sin(ang) * rho,
          r: (0.55 + _rng(seed + 2) * 0.85) * sk,
          sw: (0.35 + _rng(seed + 3) * 0.45) * sk,
          ci: pickCol(seed + 4),
          cols: cols,
          peak: (isLight ? 0.42 : 0.52) + _rng(seed + 5) * (isLight ? 0.4 : 0.36),
          dur: 1.8 + _rng(seed + 6) * 9.5,
          off: _rng(seed + 7)
        };
      }

      this._proj = { cx, cy, focal, aspect, zFar, zNear, dz };
    }

    _depth(uLin){
      if (uLin <= NEAR_U) return uLin;
      const tn = (uLin - NEAR_U) / (1 - NEAR_U);
      return NEAR_U + (1 - NEAR_U) * tn * tn;
    }

    _phase(star, t){
      const uLin = ((t / star.dur) + star.off) % 1;
      return this._depth(uLin);
    }

    _elapsed(now){
      if (!this.cfg.animated && this.pausedAt != null) return this.pausedAt;
      return (now - this.t0) / 1000;
    }

    _starOp(u){
      if (u < 0.04) return u / 0.04;
      if (u < 0.90) return 1;
      return 1 - (u - 0.90) / 0.10;
    }

    _stretch(u){
      if (u <= NEAR_U) return 0;
      const t = (u - NEAR_U) / (1 - NEAR_U);
      return t * t;
    }

    _xy(ux, uy, z){
      const p = this._proj;
      const inv = 1 / z;
      return {
        x: p.cx + ux * p.focal * inv,
        y: p.cy + uy * (p.focal * p.aspect) * inv
      };
    }

    _drawStarsAt(ctx, t, phaseFn){
      const p = this._proj;
      const zFar = p.zFar, zNear = p.zNear, dz = p.dz;
      const zSpan = zNear - zFar;
      ctx.lineCap = 'round';

      for (let i = 0, n = this.stars.length; i < n; i++) {
        const s = this.stars[i];
        const u = phaseFn ? phaseFn(s, i) : this._phase(s, t);
        const op = s.peak * this._starOp(u);
        if (op <= 0.015) continue;

        const z = zFar + zSpan * u;
        const invZ = 1 / z;
        const headX = p.cx + s.ux * p.focal * invZ;
        const headY = p.cy + s.uy * (p.focal * p.aspect) * invZ;
        const stretch = this._stretch(u);
        const col = s.cols[s.ci];

        if (stretch <= 0.01) {
          const r = s.r * (0.72 + u * 0.42);
          if (r < 1.05) {
            const sz = Math.max(1.8, r * 2.6);
            ctx.fillStyle = 'rgba(' + col + ',' + (op * (0.58 + u * 0.32)).toFixed(3) + ')';
            ctx.fillRect(headX - sz * 0.5, headY - sz * 0.5, sz, sz);
          } else {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(' + col + ',' + (op * (0.5 + u * 0.3)).toFixed(3) + ')';
            ctx.arc(headX, headY, r, 0, 6.2832);
            ctx.fill();
          }
          continue;
        }

        const tailZ = Math.min(zFar, z + dz * (0.35 + stretch * 5.5));
        const invTail = 1 / tailZ;
        const tailX = p.cx + s.ux * p.focal * invTail;
        const tailY = p.cy + s.uy * (p.focal * p.aspect) * invTail;
        const sw = Math.max(0.3, s.sw * (0.22 + stretch * 0.78));
        ctx.strokeStyle = 'rgba(' + col + ',' + (op * (0.4 + stretch * 0.55)).toFixed(3) + ')';
        ctx.lineWidth = sw;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();
      }
    }

    drawFrame(now){
      const ctx = this.ctx;
      if (!ctx) return;
      const w = this.cfg.w, h = this.cfg.h;
      ctx.clearRect(0, 0, w, h);
      this._drawStarsAt(ctx, this._elapsed(now));
    }

    _drawPreview(){
      const ctx = this.ctx;
      if (!ctx) return;
      const w = this.cfg.w, h = this.cfg.h;
      ctx.clearRect(0, 0, w, h);
      const p = this._proj;
      const sk = _sizeK(w, h);
      const col1 = _rgbStr(_hexRgb(this.cfg.a1));
      const col2 = _rgbStr(_hexRgb(this.cfg.a2));

      for (let i = 0; i < 18; i++) {
        const seed = i * 13 + 7;
        const ang = _rng(seed) * 6.2832;
        const dist = (0.08 + _rng(seed + 1) * 0.46) * Math.min(w, h) * 0.48;
        const x = p.cx + Math.cos(ang) * dist;
        const y = p.cy + Math.sin(ang) * dist;
        ctx.fillStyle = 'rgba(' + (_rng(seed + 2) > 0.5 ? col1 : col2) + ',' + (0.28 + _rng(seed + 3) * 0.38).toFixed(2) + ')';
        const dr = 1.4 + _rng(seed + 4) * 1.2;
        ctx.fillRect(x - dr * 0.5, y - dr * 0.5, dr, dr);
      }

      ctx.lineCap = 'round';
      const rhoMax = 0.95 * Math.max(w, h) / Math.max(1, p.focal);
      for (let i = 0; i < 9; i++) {
        const seed = i * 19 + 200;
        const ang = _rng(seed) * 6.2832;
        const rho = Math.sqrt(_rng(seed + 1)) * rhoMax;
        const ux = Math.cos(ang) * rho;
        const uy = Math.sin(ang) * rho;
        const u = 0.84 + _rng(seed + 2) * 0.1;
        const z = p.zFar + (p.zNear - p.zFar) * u;
        const head = this._xy(ux, uy, z);
        const stretch = this._stretch(u);
        const tailZ = Math.min(p.zFar, z + p.dz * (0.35 + stretch * 5.5));
        const tail = this._xy(ux, uy, tailZ);
        ctx.strokeStyle = 'rgba(' + (_rng(seed + 4) > 0.5 ? col1 : col2) + ',' + (0.45 + _rng(seed + 5) * 0.35).toFixed(2) + ')';
        ctx.lineWidth = Math.max(0.35, (0.38 + _rng(seed + 3) * 0.32) * sk);
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();
      }
    }

    resize(){
      if (!this._rebuild()) return;
      this.drawFrame(performance.now());
    }

    update(cfg){
      const prev = this.cfg;
      Object.assign(this.cfg, cfg);
      if (cfg.w != null || cfg.h != null || cfg.a1 || cfg.a2 || cfg.isTitle != null || cfg.isLight != null) {
        this.resize();
      }
      if (cfg.animated === false && prev.animated !== false) this.pause();
      if (cfg.animated === true && prev.animated === false) this.resume();
    }

    pause(){
      if (this.pausedAt == null) this.pausedAt = this._elapsed(performance.now());
      this.cfg.animated = false;
      this._running = false;
      if (this.raf){ cancelAnimationFrame(this.raf); this.raf = null; }
      this.drawFrame(performance.now());
    }

    resume(){
      if (this.pausedAt != null) {
        this.t0 = performance.now() - this.pausedAt * 1000;
        this.pausedAt = null;
      }
      this.cfg.animated = true;
      this._startLoop();
    }

    _startLoop(){
      if (!this._alive || this._running) return;
      this._running = true;
      const loop = (t) => {
        if (!this._alive || !this._running) return;
        this.drawFrame(t);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }

    start(){
      this._alive = true;
      if (this.cfg.animated === false){
        this.pause();
        return;
      }
      this._startLoop();
    }

    stop(){
      this._alive = false;
      this._running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    destroy(){
      this.stop();
      if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
      this.ctx = null;
    }

    mount(parent){
      parent.appendChild(this.canvas);
      if (!this._rebuild()) return;
      this.start();
    }
  }

  window.WarpDecor = {
    VERSION: WARP_VERSION,
    /** Сколько звёзд создаётся для размера холста (отладка). */
    plannedStarCount(w, h, isTitle){
      return _starCount(w, h, !!isTitle);
    },
    /** Быстрая проверка в консоли: WarpDecor.debug() */
    debug(){
      const r = _active.values().next().value;
      const c = r && r.cfg;
      const w = (typeof canvasW !== 'undefined' && canvasW) ? canvasW : (c ? c.w : 1280);
      const h = (typeof canvasH !== 'undefined' && canvasH) ? canvasH : (c ? c.h : 720);
      const planned = _starCount(w, h, true);
      const decor = typeof document !== 'undefined'
        ? document.querySelector('.decor-el[data-type="decor"]')
        : null;
      return {
        version: WARP_VERSION,
        swCache: 'slides-pwa-v330',
        instances: _active.size,
        stars: r ? r.stars.length : null,
        plannedStars: planned,
        canvas: c ? { w: c.w, h: c.h, isTitle: c.isTitle } : { w: w, h: h, isTitle: true },
        decorOnSlide: !!decor,
        hint: _active.size ? null : 'Выберите слайд с «Звёздный разгон», затем вызовите debug() снова'
      };
    },
    mount(parent, cfg){
      const id = (cfg && cfg.id) || ('warp_' + Math.random().toString(36).slice(2, 8));
      this.unmount(id);
      const r = new WarpRenderer(cfg);
      r.mount(parent);
      if (cfg && cfg.animated === false) {
        r.pause();
        r.drawFrame(performance.now());
      }
      _active.set(id, r);
      return () => this.unmount(id);
    },
    unmount(id){
      const r = _active.get(id);
      if (r) { r.destroy(); _active.delete(id); }
    },
    unmountAll(){
      _active.forEach(r => r.destroy());
      _active.clear();
    },
    update(id, cfg){
      const r = _active.get(id);
      if (r) r.update(cfg);
    },
    pauseAll(){ _active.forEach(r => r.pause()); },
    resumeAll(){ _active.forEach(r => r.resume()); },
    getElapsed(id){
      const r = _active.get(id);
      if (!r || typeof r._elapsed !== 'function') return null;
      return r._elapsed(performance.now());
    },
    renderStill(cfg, w, h){
      const r = new WarpRenderer(Object.assign({}, cfg, { w, h, animated: false }));
      if (!r._rebuild()) return null;
      r._drawPreview();
      r.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;background:transparent;';
      return r.canvas;
    }
  };
})();

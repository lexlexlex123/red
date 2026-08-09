/* DNA layout — WebGL double helix */
(function(){
  const _active = new Map();

  const VS = [
    'attribute vec3 aPos;',
    'attribute vec4 aColor;',
    'uniform mat4 uMVP;',
    'varying vec4 vColor;',
    'void main(){',
    '  gl_Position = uMVP * vec4(aPos, 1.0);',
    '  vColor = aColor;',
    '}'
  ].join('\n');

  const FS = [
    'precision mediump float;',
    'varying vec4 vColor;',
    'void main(){ gl_FragColor = vColor; }'
  ].join('\n');

  function _hexRgb(hex){
    const h = (hex || '#6366f1').replace('#', '');
    const n = h.length === 3
      ? h.split('').map(c => parseInt(c + c, 16))
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    return [n[0] / 255, n[1] / 255, n[2] / 255];
  }

  function _mat4Identity(){
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  }

  function _mat4Multiply(out, a, b){
    const t = new Float32Array(16);
    for (let c = 0; c < 4; c++){
      for (let r = 0; r < 4; r++){
        t[c * 4 + r] =
          a[0 * 4 + r] * b[c * 4 + 0] +
          a[1 * 4 + r] * b[c * 4 + 1] +
          a[2 * 4 + r] * b[c * 4 + 2] +
          a[3 * 4 + r] * b[c * 4 + 3];
      }
    }
    out.set(t);
    return out;
  }

  function _mat4Ortho(out, l, r, b, t, n, f){
    const lr = 1 / (l - r), bt = 1 / (b - t), nf = 1 / (n - f);
    out[0] = -2 * lr; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = -2 * bt; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = 2 * nf; out[11] = 0;
    out[12] = (l + r) * lr; out[13] = (t + b) * bt; out[14] = (f + n) * nf; out[15] = 1;
    return out;
  }

  const _OCT = [
    [0, -1, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, 1, 0]
  ];
  const _OCT_FACES = [
    [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1],
    [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]
  ];

  function _accentRgb(hex, cfg){
    const rgb = _hexRgb(hex);
    if (!cfg || !cfg.dark) return rgb;
    // На тёмном фоне подмешиваем белый — акценты темы часто близки к фону
    const k = cfg.lift != null ? cfg.lift : 0.38;
    return [
      rgb[0] + (1 - rgb[0]) * k,
      rgb[1] + (1 - rgb[1]) * k,
      rgb[2] + (1 - rgb[2]) * k
    ];
  }

  function _depthAlpha(z, depth, cfg){
    const t = (z / (depth || 1) + 1) * 0.5;
    if (cfg && cfg.dark) return 0.48 + t * 0.42; // 0.48–0.90
    return 0.14 + t * 0.22;
  }

  function _helixY(i, cfg, scroll){
    const h = cfg.h;
    const pitch = h / (cfg.turns || 3);
    const span = pitch * (cfg.turns || 3) * 1.15;
    let y = i * (span / (cfg.segments || 80)) - scroll;
    const pad = h * 0.06;
    while (y < -pad) y += span;
    while (y > h + pad) y -= span;
    return y;
  }

  function _helixPoint(i, cfg, scroll, rotPhase){
    const n = cfg.segments || 80;
    const y = _helixY(i, cfg, scroll);
    const t = (i / n) * (cfg.turns || 3) * Math.PI * 2 + rotPhase;
    const R = cfg.radius || 40;
    const depth = cfg.depth || R * 0.55;
    const cx = cfg.cx != null ? cfg.cx : cfg.w * 0.84;
    return {
      x: cx + Math.cos(t) * R,
      y,
      z: Math.sin(t) * depth,
      t
    };
  }

  function _pushOct(pos, col, cx, cy, cz, scale, rgb, alpha){
    _OCT_FACES.forEach(f => {
      f.forEach(vi => {
        const v = _OCT[vi];
        pos.push(cx + v[0] * scale, cy + v[1] * scale, cz + v[2] * scale);
        col.push(rgb[0], rgb[1], rgb[2], alpha);
      });
    });
  }

  function _pushLine(pos, col, ax, ay, az, bx, by, bz, rgb, alpha){
    pos.push(ax, ay, az, bx, by, bz);
    col.push(rgb[0], rgb[1], rgb[2], alpha, rgb[0], rgb[1], rgb[2], alpha);
  }

  function _buildHelixMesh(cfg, scroll, rotPhase){
    const n = cfg.segments || 80;
    const rgb1 = _accentRgb(cfg.a1, cfg);
    const rgb2 = _accentRgb(cfg.a2, cfg);
    const dark = !!(cfg && cfg.dark);
    const bead = cfg.h * (dark ? 0.014 : 0.011);
    const beadBoost = dark ? 0.18 : 0.12;
    const beadBoost2 = dark ? 0.15 : 0.10;
    const triPos = [], triCol = [];
    const linePos = [], lineCol = [];
    const ptsA = [], ptsB = [];

    for (let i = 0; i <= n; i++){
      const pa = _helixPoint(i, cfg, scroll, rotPhase);
      const pb = _helixPoint(i, cfg, scroll, rotPhase + Math.PI);
      ptsA.push(pa);
      ptsB.push(pb);

      if (i > 0){
        const p0 = ptsA[i - 1], p1 = pa;
        _pushLine(linePos, lineCol, p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, rgb1, _depthAlpha((p0.z + p1.z) * 0.5, cfg.depth, cfg));
        const q0 = ptsB[i - 1], q1 = pb;
        _pushLine(linePos, lineCol, q0.x, q0.y, q0.z, q1.x, q1.y, q1.z, rgb2, _depthAlpha((q0.z + q1.z) * 0.5, cfg.depth, cfg));
      }

      if (i % 2 === 0){
        _pushOct(triPos, triCol, pa.x, pa.y, pa.z, bead, rgb1, Math.min(1, _depthAlpha(pa.z, cfg.depth, cfg) + beadBoost));
        _pushOct(triPos, triCol, pb.x, pb.y, pb.z, bead * 0.92, rgb2, Math.min(1, _depthAlpha(pb.z, cfg.depth, cfg) + beadBoost2));
      }

      if (i > 0 && i % 4 === 0){
        const rungA = dark
          ? (0.32 + Math.abs(Math.cos(pa.t)) * 0.28)
          : (0.08 + Math.abs(Math.cos(pa.t)) * 0.14);
        const mix = [(rgb1[0] + rgb2[0]) * 0.5, (rgb1[1] + rgb2[1]) * 0.5, (rgb1[2] + rgb2[2]) * 0.5];
        _pushLine(linePos, lineCol, pa.x, pa.y, pa.z, pb.x, pb.y, pb.z, mix, rungA);
      }
    }

    return {
      triPos: new Float32Array(triPos),
      triCol: new Float32Array(triCol),
      linePos: new Float32Array(linePos),
      lineCol: new Float32Array(lineCol),
      triCount: triPos.length / 3,
      lineCount: linePos.length / 3
    };
  }

  class DnaRenderer {
    constructor(cfg){
      this.cfg = Object.assign({
        w: 960, h: 540, a1: '#6366f1', a2: '#818cf8',
        isTitle: true, animated: true,
        cx: 0.84, radius: 48, depth: 28, turns: 3.5, segments: 88,
        scrollSpeed: 26, rotSpeed: 0.32
      }, cfg);
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      this.gl = null;
      this.prog = null;
      this.bufTriPos = null;
      this.bufTriCol = null;
      this.bufLinePos = null;
      this.bufLineCol = null;
      this.triCount = 0;
      this.lineCount = 0;
      const _se = cfg.startElapsed != null ? +cfg.startElapsed : 0;
      this.t0 = performance.now() - _se * 1000;
      this.pausedAt = null;
      this.raf = null;
      this._alive = true;
    }

    init(){
      const w = Math.max(1, Math.round(this.cfg.w));
      const h = Math.max(1, Math.round(this.cfg.h));
      this.canvas.width = w;
      this.canvas.height = h;
      this.cfg.w = w;
      this.cfg.h = h;
      if (this.cfg.cx <= 1) this.cfg.cx = w * this.cfg.cx;
      if (this.cfg.radius <= 1) this.cfg.radius = w * this.cfg.radius;
      if (this.cfg.depth <= 1) this.cfg.depth = w * this.cfg.depth;

      const gl = this.canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
        || this.canvas.getContext('experimental-webgl');
      if (!gl) return false;
      this.gl = gl;

      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, VS);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)){
        console.warn('DNA VS:', gl.getShaderInfoLog(vs));
        return false;
      }
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, FS);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)){
        console.warn('DNA FS:', gl.getShaderInfoLog(fs));
        return false;
      }
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)){
        console.warn('DNA WebGL:', gl.getProgramInfoLog(prog));
        return false;
      }
      this.prog = prog;
      this.uMVP = gl.getUniformLocation(prog, 'uMVP');
      this.bufTriPos = gl.createBuffer();
      this.bufTriCol = gl.createBuffer();
      this.bufLinePos = gl.createBuffer();
      this.bufLineCol = gl.createBuffer();
      return true;
    }

    _elapsed(now){
      if (!this.cfg.animated && this.pausedAt != null) return this.pausedAt;
      return (now - this.t0) / 1000;
    }

    _uploadMesh(mesh){
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTriPos);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.triPos, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufTriCol);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.triCol, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufLinePos);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.linePos, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufLineCol);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.lineCol, gl.DYNAMIC_DRAW);
      this.triCount = mesh.triCount;
      this.lineCount = mesh.lineCount;
    }

    _bindAttribs(gl){
      const aPos = gl.getAttribLocation(this.prog, 'aPos');
      const aColor = gl.getAttribLocation(this.prog, 'aColor');
      return { aPos, aColor };
    }

    _drawBuf(gl, bufPos, bufCol, aPos, aColor, mode, count){
      if (!count) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufCol);
      gl.enableVertexAttribArray(aColor);
      gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);
      gl.drawArrays(mode, 0, count);
    }

    drawFrame(now){
      const gl = this.gl;
      if (!gl || !this.prog) return;
      const cfg = this.cfg;
      const w = cfg.w, h = cfg.h;
      const elapsed = this._elapsed(now);
      const scroll = elapsed * (cfg.scrollSpeed || 26);
      const rotPhase = elapsed * (cfg.rotSpeed || 0.32);

      const mesh = _buildHelixMesh(cfg, scroll, rotPhase);
      this._uploadMesh(mesh);

      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const depth = cfg.depth || 30;
      const proj = _mat4Ortho(_mat4Identity(), 0, w, h, 0, -depth * 3, depth * 3);
      const mvp = proj;

      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.uMVP, false, mvp);

      const { aPos, aColor } = this._bindAttribs(gl);
      this._drawBuf(gl, this.bufLinePos, this.bufLineCol, aPos, aColor, gl.LINES, this.lineCount);
      this._drawBuf(gl, this.bufTriPos, this.bufTriCol, aPos, aColor, gl.TRIANGLES, this.triCount);
    }

    resize(){
      if (!this.init()) return;
      this.drawFrame(performance.now());
    }

    update(cfg){
      const prev = this.cfg;
      Object.assign(this.cfg, cfg);
      if (cfg.w != null || cfg.h != null) this.resize();
      if (cfg.animated === false && prev.animated !== false) this.pause();
      if (cfg.animated === true && prev.animated === false) this.resume();
    }

    pause(){
      if (this.pausedAt == null) this.pausedAt = this._elapsed(performance.now());
    }

    resume(){
      if (this.pausedAt != null){
        this.t0 = performance.now() - this.pausedAt * 1000;
        this.pausedAt = null;
      }
    }

    start(){
      const loop = (t) => {
        if (!this._alive) return;
        this.drawFrame(t);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }

    stop(){
      this._alive = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    destroy(){
      this.stop();
      if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
      this.gl = null;
    }

    mount(parent){
      parent.appendChild(this.canvas);
      if (!this.init()) return;
      this.start();
    }
  }

  window.DnaDecor = {
    mount(parent, cfg){
      const id = cfg.id || ('dna_' + Math.random().toString(36).slice(2, 8));
      this.unmount(id);
      const r = new DnaRenderer(cfg);
      r.mount(parent);
      if (cfg && cfg.animated === false) r.pause();
      _active.set(id, r);
      return () => this.unmount(id);
    },

    unmount(id){
      const r = _active.get(id);
      if (r){ r.destroy(); _active.delete(id); }
    },

    unmountAll(){
      _active.forEach(r => r.destroy());
      _active.clear();
    },

    update(id, cfg){
      const r = _active.get(id);
      if (r) r.update(cfg);
    },

    pauseAll(){
      _active.forEach(r => r.pause());
    },

    resumeAll(){
      _active.forEach(r => r.resume());
    },

    renderStill(cfg, w, h){
      const r = new DnaRenderer(Object.assign({}, cfg, { w, h, animated: false }));
      if (!r.init()) return null;
      r.t0 = performance.now() - 1800;
      r.drawFrame(performance.now());
      return r.canvas;
    }
  };
})();

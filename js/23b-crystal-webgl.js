/* Crystal layout — WebGL octahedron (Sims-style gem) */
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

  // Column-major (WebGL): m[col * 4 + row]
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

  function _mat4RotX(rad){
    const m = _mat4Identity();
    const c = Math.cos(rad), s = Math.sin(rad);
    m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
    return m;
  }

  function _mat4RotY(rad){
    const m = _mat4Identity();
    const c = Math.cos(rad), s = Math.sin(rad);
    m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
    return m;
  }

  function _mat4Trans(x, y, z){
    const m = _mat4Identity();
    m[12] = x; m[13] = y; m[14] = z;
    return m;
  }

  function _mat4ScaleMat(sx, sy, sz){
    const m = _mat4Identity();
    m[0] = sx; m[5] = sy; m[10] = sz;
    return m;
  }

  function _composeModel(pos, angX, angY, scale){
    const S = _mat4ScaleMat(scale, scale, scale);
    const tmp = new Float32Array(16);
    const tmp2 = new Float32Array(16);
    _mat4Multiply(tmp, _mat4RotX(angX), S);
    _mat4Multiply(tmp2, _mat4RotY(angY), tmp);
    const model = new Float32Array(16);
    _mat4Multiply(model, _mat4Trans(pos.x, pos.y, 0), tmp2);
    return model;
  }

  function _mat4Ortho(out, l, r, b, t, n, f){
    const lr = 1 / (l - r), bt = 1 / (b - t), nf = 1 / (n - f);
    out[0] = -2 * lr; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = -2 * bt; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = 2 * nf; out[11] = 0;
    out[12] = (l + r) * lr; out[13] = (t + b) * bt; out[14] = (f + n) * nf; out[15] = 1;
    return out;
  }

  function _mat4Translate(out, x, y, z){
    const m = _mat4Identity();
    m[12] = x; m[13] = y; m[14] = z;
    return _mat4Multiply(out, out, m);
  }

  function _mat4RotateX(out, rad){
    const c = Math.cos(rad), s = Math.sin(rad);
    const m = _mat4Identity();
    m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
    return _mat4Multiply(out, out, m);
  }

  function _mat4RotateY(out, rad){
    const c = Math.cos(rad), s = Math.sin(rad);
    const m = _mat4Identity();
    m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
    return _mat4Multiply(out, out, m);
  }

  function _mat4Scale(out, sx, sy, sz){
    const m = _mat4Identity();
    m[0] = sx; m[5] = sy; m[10] = sz;
    return _mat4Multiply(out, out, m);
  }

  // Unit octahedron — same topology as SVG mesh
  const _VERTS = [
    [0, -1, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, 1, 0]
  ];
  const _FACES = [
    [0, 1, 2, 0], [0, 2, 3, 1], [0, 3, 4, 0], [0, 4, 1, 1],
    [5, 2, 1, 0], [5, 3, 2, 1], [5, 4, 3, 0], [5, 1, 4, 1]
  ];
  const _FILL_A = [0.68, 0.62, 0.58, 0.65, 0.56, 0.54, 0.52, 0.55];

  function _titlePos(phase, w, h){
    const c = [[0.72, 0.30], [0.18, 0.72], [0.84, 0.70], [0.14, 0.22]];
    const lerp = (a, b, t) => a + (b - a) * t;
    if (phase < 0.20) return { x: c[0][0] * w, y: c[0][1] * h };
    if (phase < 0.22){
      const t = (phase - 0.20) / 0.02;
      return { x: lerp(c[0][0], c[1][0], t) * w, y: lerp(c[0][1], c[1][1], t) * h };
    }
    if (phase < 0.42) return { x: c[1][0] * w, y: c[1][1] * h };
    if (phase < 0.44){
      const t = (phase - 0.42) / 0.02;
      return { x: lerp(c[1][0], c[2][0], t) * w, y: lerp(c[1][1], c[2][1], t) * h };
    }
    if (phase < 0.64) return { x: c[2][0] * w, y: c[2][1] * h };
    if (phase < 0.66){
      const t = (phase - 0.64) / 0.02;
      return { x: lerp(c[2][0], c[3][0], t) * w, y: lerp(c[2][1], c[3][1], t) * h };
    }
    if (phase < 0.86) return { x: c[3][0] * w, y: c[3][1] * h };
    if (phase < 0.88){
      const t = (phase - 0.86) / 0.02;
      return { x: lerp(c[3][0], c[0][0], t) * w, y: lerp(c[3][1], c[0][1], t) * h };
    }
    return { x: c[0][0] * w, y: c[0][1] * h };
  }

  function _crystalPos(cfg, elapsed){
    const w = cfg.w || 960, h = cfg.h || 540;
    if (!cfg.isTitle) return { x: w * 0.88, y: h * 0.84 };
    const phase = ((elapsed % 18) + 18) % 18 / 18;
    return _titlePos(phase, w, h);
  }

  function _buildMeshBuffers(gl, cfg){
    const rgb1 = _hexRgb(cfg.a1), rgb2 = _hexRgb(cfg.a2);
    const pos = [], col = [];
    _FACES.forEach((f, fi) => {
      const rgb = f[3] === 0 ? rgb1 : rgb2;
      const a = _FILL_A[fi];
      f.slice(0, 3).forEach(vi => {
        const v = _VERTS[vi];
        pos.push(v[0], v[1], v[2]);
        col.push(rgb[0], rgb[1], rgb[2], a);
      });
    });
    const bufPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    const bufCol = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufCol);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(col), gl.STATIC_DRAW);
    return { bufPos, bufCol, count: pos.length / 3 };
  }

  function _rebuildColors(gl, mesh, cfg){
    const rgb1 = _hexRgb(cfg.a1), rgb2 = _hexRgb(cfg.a2);
    const col = [];
    _FACES.forEach((f, fi) => {
      const rgb = f[3] === 0 ? rgb1 : rgb2;
      const a = _FILL_A[fi];
      f.slice(0, 3).forEach(() => col.push(rgb[0], rgb[1], rgb[2], a));
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.bufCol);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(col), gl.STATIC_DRAW);
  }

  class CrystalRenderer {
    constructor(cfg){
      this.cfg = Object.assign({
        w: 960, h: 540, a1: '#6366f1', a2: '#818cf8',
        isTitle: true, animated: true, scale: 108, spinDur: 12
      }, cfg);
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      this.gl = null;
      this.prog = null;
      this.mesh = null;
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
      const gl = this.canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
        || this.canvas.getContext('experimental-webgl');
      if (!gl) return false;
      this.gl = gl;
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, VS);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)){
        console.warn('Crystal VS:', gl.getShaderInfoLog(vs));
        return false;
      }
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, FS);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)){
        console.warn('Crystal FS:', gl.getShaderInfoLog(fs));
        return false;
      }
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)){
        console.warn('Crystal WebGL:', gl.getProgramInfoLog(prog));
        return false;
      }
      this.prog = prog;
      this.uMVP = gl.getUniformLocation(prog, 'uMVP');
      this.mesh = _buildMeshBuffers(gl, this.cfg);
      return true;
    }

    _elapsed(now){
      if (!this.cfg.animated && this.pausedAt != null) return this.pausedAt;
      return (now - this.t0) / 1000;
    }

    drawFrame(now){
      const gl = this.gl;
      if (!gl || !this.prog || !this.mesh) return;
      const cfg = this.cfg;
      const w = cfg.w, h = cfg.h;
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const elapsed = this._elapsed(now);
      const scale = cfg.scale != null ? cfg.scale : (cfg.isTitle ? h * 0.2 : h * 0.1);
      const pos = _crystalPos(cfg, elapsed);
      const spin = cfg.spinDur || 12;
      const angY = elapsed * (Math.PI * 2 / spin);
      const angX = 0.4 + Math.sin(elapsed * 0.7) * 0.35 + elapsed * 0.12;

      const model = _composeModel(pos, angX, angY, scale);
      const proj = _mat4Ortho(_mat4Identity(), 0, w, h, 0, -scale * 4, scale * 4);
      const mvp = new Float32Array(16);
      _mat4Multiply(mvp, proj, model);

      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.uMVP, false, mvp);

      const aPos = gl.getAttribLocation(this.prog, 'aPos');
      const aColor = gl.getAttribLocation(this.prog, 'aColor');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.bufPos);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.bufCol);
      gl.enableVertexAttribArray(aColor);
      gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, this.mesh.count);
    }

    resize(){
      if (!this.init()) return;
      this.drawFrame(performance.now());
    }

    update(cfg){
      const prev = this.cfg;
      Object.assign(this.cfg, cfg);
      if (this.gl && this.mesh && (cfg.a1 || cfg.a2)) _rebuildColors(this.gl, this.mesh, this.cfg);
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

  window.CrystalDecor = {
    mount(parent, cfg){
      const id = cfg.id || ('cry_' + Math.random().toString(36).slice(2, 8));
      this.unmount(id);
      const r = new CrystalRenderer(cfg);
      r.mount(parent);
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
      const r = new CrystalRenderer(Object.assign({}, cfg, { w, h, animated: false }));
      if (!r.init()) return null;
      r.t0 = performance.now() - 2400;
      r.drawFrame(performance.now());
      return r.canvas;
    }
  };
})();

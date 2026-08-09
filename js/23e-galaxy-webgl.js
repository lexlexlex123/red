/* Galaxy layout — WebGL spiral star disk with 3D rotation */
(function(){
  const _active = new Map();

  const VS = [
    'attribute vec3 aPos;',
    'attribute vec4 aColor;',
    'uniform mat4 uMVP;',
    'uniform float uPointScale;',
    'uniform float uRotY;',
    'uniform float uRotX;',
    'uniform vec2 uCenter;',
    'varying vec4 vColor;',
    'void main(){',
    '  vec3 p = aPos;',
    '  float cy = cos(uRotY), sy = sin(uRotY);',
    '  vec3 rY = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);',
    '  float cx = cos(uRotX), sx = sin(uRotX);',
    '  vec3 r = vec3(rY.x, cx * rY.y - sx * rY.z, sx * rY.y + cx * rY.z);',
    '  float depth = 1.0 + r.z * 0.006;',
    '  vec2 screen = uCenter + r.xy / depth;',
    '  gl_Position = uMVP * vec4(screen, r.z, 1.0);',
    '  float sz = uPointScale * (0.65 + aColor.a * 2.6) / depth;',
    '  gl_PointSize = clamp(sz, 1.2, 10.0);',
    '  float da = clamp(0.45 + 0.55 / depth, 0.35, 1.0);',
    '  vColor = vec4(aColor.rgb, aColor.a * da);',
    '}'
  ].join('\n');

  const FS = [
    'precision mediump float;',
    'varying vec4 vColor;',
    'void main(){',
    '  vec2 c = gl_PointCoord - vec2(0.5);',
    '  float d = dot(c,c);',
    '  if(d > 0.25) discard;',
    '  float a = vColor.a * (1.0 - smoothstep(0.1, 0.25, d));',
    '  gl_FragColor = vec4(vColor.rgb, a);',
    '}'
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

  function _mat4Ortho(out, l, r, b, t, n, f){
    const lr = 1 / (l - r), bt = 1 / (b - t), nf = 1 / (n - f);
    out[0] = -2 * lr; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = -2 * bt; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = 2 * nf; out[11] = 0;
    out[12] = (l + r) * lr; out[13] = (t + b) * bt; out[14] = (f + n) * nf; out[15] = 1;
    return out;
  }

  function _rng(i){
    let x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function _buildParticles(cfg){
    const n = cfg.particles || 1200;
    const maxR = cfg.maxR != null ? cfg.maxR : 240;
    const rgb1 = _hexRgb(cfg.a1), rgb2 = _hexRgb(cfg.a2);
    const pos = [], col = [];
    const arms = cfg.arms || 4;
    const flat = cfg.flat || 0.36;
    const twist = cfg.twist || 2.6;
    const depthScale = cfg.depthScale != null ? cfg.depthScale : 0.48;

    for (let i = 0; i < n; i++){
      const arm = i % arms;
      const t = _rng(i * 3.1) * Math.PI * 4.5;
      const rNorm = Math.pow(_rng(i * 3.1 + 1), 0.52);
      const r = rNorm * maxR;
      const ang = t + arm * (Math.PI * 2 / arms) + (r / maxR) * twist;
      const lx = Math.cos(ang) * r;
      const ly = Math.sin(ang) * r * flat;
      const lz = (_rng(i * 3.1 + 2) - 0.5) * maxR * depthScale;
      pos.push(lx, ly, lz);
      const mix = _rng(i * 3.1 + 3);
      const rgb = mix > 0.55 ? rgb1 : (mix > 0.25 ? rgb2 : [1, 1, 1]);
      const br = cfg.brightness != null ? cfg.brightness : 1.4;
      const a = Math.min(0.78, (0.12 + (1 - rNorm) * 0.4 + _rng(i * 3.1 + 4) * 0.2) * br * (cfg.isTitle ? 1 : 0.9));
      col.push(rgb[0], rgb[1], rgb[2], a);
    }

    return { pos: new Float32Array(pos), col: new Float32Array(col), count: n };
  }

  class GalaxyRenderer {
    constructor(cfg){
      this.cfg = Object.assign({
        w: 960, h: 540, a1: '#6366f1', a2: '#818cf8',
        isTitle: true, animated: true, particles: 1200,
        rotSpeed: 0.055, tilt: 0.42, cx: 0.52, cy: 0.48,
        maxR: 0.55, arms: 4, twist: 2.8, flat: 0.36, depthScale: 0.48, brightness: 1.5
      }, cfg);
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      this.gl = null;
      this.prog = null;
      this.bufPos = null;
      this.bufCol = null;
      this.count = 0;
      const _se = cfg.startElapsed != null ? +cfg.startElapsed : 0;
      this.t0 = performance.now() - _se * 1000;
      this.pausedAt = null;
      this.raf = null;
      this._alive = true;
    }

    _resolveCfg(){
      const c = this.cfg, w = c.w, h = c.h;
      if (c.cx <= 1) c.cx = w * c.cx;
      if (c.cy <= 1) c.cy = h * c.cy;
      if (c.maxR <= 1) c.maxR = Math.min(w, h) * c.maxR;
    }

    _uploadMesh(){
      const gl = this.gl;
      if (!gl) return;
      const mesh = _buildParticles(this.cfg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.pos, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.col, gl.STATIC_DRAW);
      this.count = mesh.count;
    }

    init(){
      const w = Math.max(1, Math.round(this.cfg.w));
      const h = Math.max(1, Math.round(this.cfg.h));
      this.canvas.width = w;
      this.canvas.height = h;
      this.cfg.w = w;
      this.cfg.h = h;
      this._resolveCfg();

      const gl = this.canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
        || this.canvas.getContext('experimental-webgl');
      if (!gl) return false;
      this.gl = gl;

      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, VS);
      gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, FS);
      gl.compileShader(fs);
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      this.prog = prog;
      this.uMVP = gl.getUniformLocation(prog, 'uMVP');
      this.uPointScale = gl.getUniformLocation(prog, 'uPointScale');
      this.uRotY = gl.getUniformLocation(prog, 'uRotY');
      this.uRotX = gl.getUniformLocation(prog, 'uRotX');
      this.uCenter = gl.getUniformLocation(prog, 'uCenter');
      this.bufPos = gl.createBuffer();
      this.bufCol = gl.createBuffer();
      this._uploadMesh();
      return true;
    }

    _elapsed(now){
      if (!this.cfg.animated && this.pausedAt != null) return this.pausedAt;
      return (now - this.t0) / 1000;
    }

    drawFrame(now){
      const gl = this.gl;
      if (!gl || !this.prog) return;
      const cfg = this.cfg;
      const w = cfg.w, h = cfg.h;
      const elapsed = this._elapsed(now);
      const rotY = elapsed * (cfg.rotSpeed || 0.055);
      const rotX = (cfg.tilt != null ? cfg.tilt : 0.42) + Math.sin(elapsed * 0.12) * 0.08;
      const zRange = cfg.maxR * 0.6;

      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const mvp = _mat4Ortho(_mat4Identity(), 0, w, h, 0, -zRange, zRange);

      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.uMVP, false, mvp);
      const base = Math.min(w, h) / 108;
      gl.uniform1f(this.uPointScale, base * (cfg.isTitle ? 6.8 : 5.6));
      gl.uniform1f(this.uRotY, rotY);
      gl.uniform1f(this.uRotX, rotX);
      gl.uniform2f(this.uCenter, cfg.cx, cfg.cy);

      const aPos = gl.getAttribLocation(this.prog, 'aPos');
      const aColor = gl.getAttribLocation(this.prog, 'aColor');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
      gl.enableVertexAttribArray(aColor);
      gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, this.count);
    }

    resize(){
      if (!this.init()) return;
      this.drawFrame(performance.now());
    }

    update(cfg){
      const prev = this.cfg;
      Object.assign(this.cfg, cfg);
      this._resolveCfg();
      if (cfg.a1 || cfg.a2 || cfg.particles || cfg.maxR) this._uploadMesh();
      else if (cfg.a1 || cfg.a2){
        const gl = this.gl;
        if (gl){
          const mesh = _buildParticles(this.cfg);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
          gl.bufferData(gl.ARRAY_BUFFER, mesh.col, gl.STATIC_DRAW);
        }
      }
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
      this.t0 = performance.now() - 12000;
      this.start();
    }
  }

  window.GalaxyDecor = {
    mount(parent, cfg){
      const id = cfg.id || ('gal_' + Math.random().toString(36).slice(2, 8));
      this.unmount(id);
      const r = new GalaxyRenderer(cfg);
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
    pauseAll(){ _active.forEach(r => r.pause()); },
    resumeAll(){ _active.forEach(r => r.resume()); },
    renderStill(cfg, w, h){
      const r = new GalaxyRenderer(Object.assign({}, cfg, { w, h, animated: false }));
      if (!r.init()) return null;
      r.t0 = performance.now() - 12000;
      r.drawFrame(performance.now());
      return r.canvas;
    }
  };
})();

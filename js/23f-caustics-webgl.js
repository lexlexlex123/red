/* Caustics layout — WebGL underwater light caustics */
(function(){
  const _active = new Map();

  const VS = [
    'attribute vec2 aPos;',
    'varying vec2 vUV;',
    'void main(){',
    '  vUV = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  const FS = [
    'precision mediump float;',
    'varying vec2 vUV;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform vec3 uCol1;',
    'uniform vec3 uCol2;',
    'uniform float uAlpha;',
    'void main(){',
    '  vec2 uv = vUV;',
    '  float spd = 0.35;',
    '  float t = uTime * spd;',
    '  float c = 0.0;',
    '  c += sin(uv.x * 10.0 + t * 1.2) * sin(uv.y * 9.0 - t);',
    '  c += sin(uv.x * 16.0 - t * 0.8) * sin(uv.y * 12.0 + t * 1.4) * 0.65;',
    '  c += sin((uv.x + uv.y) * 11.0 + t * 0.9) * sin((uv.x - uv.y) * 8.0 - t * 0.7) * 0.45;',
    '  c = c * 0.28 + 0.52;',
    '  float caust = pow(clamp(c, 0.0, 1.0), 1.65);',
    '  float vign = smoothstep(1.15, 0.4, length(uv - vec2(0.5)));',
    '  vec3 col = mix(uCol1, uCol2, caust) * (0.72 + caust * 0.6);',
    '  gl_FragColor = vec4(col, caust * max(vign, 0.55) * uAlpha);',
    '}'
  ].join('\n');

  function _hexRgb(hex){
    const h = (hex || '#6366f1').replace('#', '');
    const n = h.length === 3
      ? h.split('').map(c => parseInt(c + c, 16))
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    return [n[0] / 255, n[1] / 255, n[2] / 255];
  }

  class CausticsRenderer {
    constructor(cfg){
      this.cfg = Object.assign({
        w: 960, h: 540, a1: '#6366f1', a2: '#818cf8',
        isTitle: true, animated: true, alpha: 0.48, speed: 1.0
      }, cfg);
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      this.gl = null;
      this.prog = null;
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

      const gl = this.canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false })
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

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
      ]), gl.STATIC_DRAW);
      this.buf = buf;

      this.uRes = gl.getUniformLocation(prog, 'uRes');
      this.uTime = gl.getUniformLocation(prog, 'uTime');
      this.uCol1 = gl.getUniformLocation(prog, 'uCol1');
      this.uCol2 = gl.getUniformLocation(prog, 'uCol2');
      this.uAlpha = gl.getUniformLocation(prog, 'uAlpha');
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
      const rgb1 = _hexRgb(cfg.a1), rgb2 = _hexRgb(cfg.a2);
      const alpha = cfg.alpha != null ? cfg.alpha : (cfg.isTitle ? 0.48 : 0.38);
      const spd = cfg.speed != null ? cfg.speed : 1.0;

      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(this.prog);
      gl.uniform2f(this.uRes, w, h);
      gl.uniform1f(this.uTime, this._elapsed(now) * spd);
      gl.uniform3f(this.uCol1, rgb1[0], rgb1[1], rgb1[2]);
      gl.uniform3f(this.uCol2, rgb2[0], rgb2[1], rgb2[2]);
      gl.uniform1f(this.uAlpha, alpha);

      const aPos = gl.getAttribLocation(this.prog, 'aPos');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
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
      this.t0 = performance.now() - 5000;
      this.start();
    }
  }

  window.CausticsDecor = {
    mount(parent, cfg){
      const id = cfg.id || ('cau_' + Math.random().toString(36).slice(2, 8));
      this.unmount(id);
      const r = new CausticsRenderer(cfg);
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
      const r = new CausticsRenderer(Object.assign({}, cfg, { w, h, animated: false }));
      if (!r.init()) return null;
      r.t0 = performance.now() - 4000;
      r.drawFrame(performance.now());
      return r.canvas;
    }
  };
})();

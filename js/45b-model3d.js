// ══════════════ OBJ / 3D MODEL ══════════════
// Импорт .obj (кнопка / перетаскивание), WebGL-просмотр, поворот ±10°, авто-вращение.

(function () {
  const DEG = Math.PI / 180;
  const _viewers = new Map(); // elId -> viewer state

  // ─── Math (column-major) ───────────────────────────────────────────────────
  function _id() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  }
  function _mul(out, a, b) {
    const t = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
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
  function _rotX(rad) {
    const m = _id(), c = Math.cos(rad), s = Math.sin(rad);
    m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
    return m;
  }
  function _rotY(rad) {
    const m = _id(), c = Math.cos(rad), s = Math.sin(rad);
    m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
    return m;
  }
  function _trans(x, y, z) {
    const m = _id();
    m[12] = x; m[13] = y; m[14] = z;
    return m;
  }
  function _scale(sx, sy, sz) {
    const m = _id();
    m[0] = sx; m[5] = sy; m[10] = sz;
    return m;
  }
  function _perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
    out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
    return out;
  }
  function _lookAt(out, eye, center, up) {
    let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len; zy /= len; zz /= len;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1;
    xx /= len; xy /= len; xz /= len;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
    return out;
  }

  // ─── OBJ parse ─────────────────────────────────────────────────────────────
  function parseObj(text) {
    const verts = [];
    const norms = [];
    const faces = []; // each: [{v,n}, ...]
    const lines = String(text || '').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line[0] === '#') continue;
      const parts = line.split(/\s+/);
      const tag = parts[0];
      if (tag === 'v' && parts.length >= 4) {
        verts.push([+parts[1], +parts[2], +parts[3]]);
      } else if (tag === 'vn' && parts.length >= 4) {
        norms.push([+parts[1], +parts[2], +parts[3]]);
      } else if (tag === 'f' && parts.length >= 4) {
        const idxs = [];
        for (let k = 1; k < parts.length; k++) {
          const bits = parts[k].split('/');
          idxs.push({
            v: (parseInt(bits[0], 10) || 0) - 1,
            n: bits[2] ? (parseInt(bits[2], 10) || 0) - 1 : -1
          });
        }
        for (let t = 1; t < idxs.length - 1; t++) {
          faces.push([idxs[0], idxs[t], idxs[t + 1]]);
        }
      }
    }
    if (!verts.length || !faces.length) return null;

    // Bounds + center
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < verts.length; i++) {
      const v = verts[i];
      if (v[0] < minX) minX = v[0]; if (v[0] > maxX) maxX = v[0];
      if (v[1] < minY) minY = v[1]; if (v[1] > maxY) maxY = v[1];
      if (v[2] < minZ) minZ = v[2]; if (v[2] > maxZ) maxZ = v[2];
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    const scale = 1.6 / span;

    const pos = [];
    const nrm = [];
    function pushTri(a, b, c) {
      const va = verts[a.v], vb = verts[b.v], vc = verts[c.v];
      if (!va || !vb || !vc) return;
      let na, nb, nc;
      if (a.n >= 0 && norms[a.n] && b.n >= 0 && norms[b.n] && c.n >= 0 && norms[c.n]) {
        na = norms[a.n]; nb = norms[b.n]; nc = norms[c.n];
      } else {
        const ax = vb[0] - va[0], ay = vb[1] - va[1], az = vb[2] - va[2];
        const bx = vc[0] - va[0], by = vc[1] - va[1], bz = vc[2] - va[2];
        let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        na = nb = nc = [nx, ny, nz];
      }
      [va, vb, vc].forEach((v, i) => {
        pos.push((v[0] - cx) * scale, (v[1] - cy) * scale, (v[2] - cz) * scale);
        const n = i === 0 ? na : i === 1 ? nb : nc;
        nrm.push(n[0], n[1], n[2]);
      });
    }
    for (let i = 0; i < faces.length; i++) pushTri(faces[i][0], faces[i][1], faces[i][2]);
    if (!pos.length) return null;
    return {
      positions: new Float32Array(pos),
      normals: new Float32Array(nrm),
      count: pos.length / 3
    };
  }
  window.parseObj = parseObj;

  /** After JSON round-trip Float32Array becomes a plain object — re-parse from objText. */
  function ensureMesh(d) {
    const m = d && d._mesh;
    if (m && m.positions instanceof Float32Array && m.normals instanceof Float32Array &&
        m.count > 0 && m.positions.length === m.count * 3) {
      return m;
    }
    if (d && d.objText) {
      try {
        d._mesh = parseObj(d.objText);
        return d._mesh;
      } catch (e) {
        console.warn('[model3d] parse failed', e);
        d._mesh = null;
        return null;
      }
    }
    if (d) d._mesh = null;
    return null;
  }
  window._model3dEnsureMesh = ensureMesh;

  // ─── WebGL viewer ──────────────────────────────────────────────────────────
  const VS = [
    'attribute vec3 aPos;',
    'attribute vec3 aNrm;',
    'uniform mat4 uMVP;',
    'uniform mat4 uModel;',
    'varying vec3 vN;',
    'varying vec3 vW;',
    'void main(){',
    '  vec4 w = uModel * vec4(aPos, 1.0);',
    '  vW = w.xyz;',
    '  vN = mat3(uModel) * aNrm;',
    '  gl_Position = uMVP * vec4(aPos, 1.0);',
    '}'
  ].join('\n');

  const FS = [
    'precision mediump float;',
    'varying vec3 vN;',
    'varying vec3 vW;',
    'uniform vec3 uColor;',
    'uniform vec3 uLight;',
    'void main(){',
    '  vec3 n = normalize(vN);',
    '  float diff = max(dot(n, normalize(uLight - vW)), 0.0);',
    '  float amb = 0.28;',
    '  vec3 col = uColor * (amb + diff * 0.85);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function _compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('Model3D shader', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function _createProgram(gl) {
    const vs = _compile(gl, gl.VERTEX_SHADER, VS);
    const fs = _compile(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('Model3D program', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  function _hexRgb(hex) {
    const h = String(hex || '#7dd3fc').replace('#', '');
    const n = h.length === 3
      ? h.split('').map(c => parseInt(c + c, 16))
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    return [n[0] / 255, n[1] / 255, n[2] / 255];
  }

  function _activeTheme() {
    try {
      const ti = typeof appliedThemeIdx !== 'undefined' && appliedThemeIdx >= 0 ? appliedThemeIdx
        : (typeof selTheme !== 'undefined' && selTheme >= 0 ? selTheme : -1);
      return ti >= 0 && typeof THEMES !== 'undefined' ? THEMES[ti] : null;
    } catch (e) { return null; }
  }

  function _themeColor() {
    const th = _activeTheme();
    if (th && th.ac1) return th.ac1;
    if (th && th.palette && th.palette[0]) return th.palette[0];
    return '#7dd3fc';
  }

  /** Default object / background from palette (scheme cells). */
  const DEFAULT_OBJ_COLOR_SCHEME = { col: 1, row: 3 };
  const DEFAULT_OBJ_BG_SCHEME = { col: 0, row: 8 };

  function _schemeColor(scheme, fallback) {
    const th = _activeTheme();
    let color = fallback;
    if (th && typeof _schemeSwatchColor === 'function') {
      color = _schemeSwatchColor(th, scheme.col, scheme.row) || color;
    } else if (th && typeof _resolveSchemeColor === 'function') {
      color = _resolveSchemeColor(scheme, th) || color;
    }
    return color;
  }

  function _defaultObjColor() {
    const scheme = { col: DEFAULT_OBJ_COLOR_SCHEME.col, row: DEFAULT_OBJ_COLOR_SCHEME.row };
    return { color: _schemeColor(scheme, _themeColor()), scheme };
  }

  function _defaultObjBg() {
    const scheme = { col: DEFAULT_OBJ_BG_SCHEME.col, row: DEFAULT_OBJ_BG_SCHEME.row };
    return { color: _schemeColor(scheme, '#0f172a'), scheme };
  }

  function _resolveObjColor(d) {
    if (!d) return _themeColor();
    let color = d.objColor || '';
    if (d.objColorScheme && typeof _resolveSchemeColor === 'function') {
      const th = _activeTheme();
      const r = th ? _resolveSchemeColor(d.objColorScheme, th) : null;
      if (r) color = r;
    }
    if (!color) color = _defaultObjColor().color;
    return color;
  }

  function _objSpeed(d) {
    if (!d || d.objRotSpeed == null || d.objRotSpeed === '') return 1;
    const s = +d.objRotSpeed;
    if (isNaN(s)) return 1;
    return Math.max(0, Math.min(10, s));
  }

  function _resolveObjBg(d) {
    if (!d) return { color: '', op: 1, cleared: true };
    if (d.objBgCleared) return { color: '', op: 0, cleared: true };
    let color = d.objBg || '';
    if (d.objBgScheme && typeof _resolveSchemeColor === 'function') {
      const th = _activeTheme();
      const r = th ? _resolveSchemeColor(d.objBgScheme, th) : null;
      if (r) color = r;
    }
    if (!color) {
      const def = _defaultObjBg();
      color = def.color;
    }
    const op = d.objBgOp != null ? Math.max(0, Math.min(1, +d.objBgOp)) : 1;
    return { color, op, cleared: false };
  }

  function _applyClearColor(gl, wrap, d) {
    const bg = _resolveObjBg(d);
    if (bg.cleared || !bg.color || bg.op <= 0) {
      gl.clearColor(0, 0, 0, 0);
      if (wrap) wrap.style.background = 'transparent';
      return;
    }
    const rgb = _hexRgb(bg.color);
    gl.clearColor(rgb[0], rgb[1], rgb[2], bg.op);
    if (wrap) {
      if (bg.op >= 1) wrap.style.background = bg.color;
      else {
        const a = bg.op;
        const r = Math.round(rgb[0] * 255), g = Math.round(rgb[1] * 255), b = Math.round(rgb[2] * 255);
        wrap.style.background = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
      }
    }
  }

  function destroyViewer(id) {
    const st = _viewers.get(id);
    if (!st) return;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0;
    st.alive = false;
    try { if (st.ro) st.ro.disconnect(); } catch (e) {}
    try {
      if (st.gl && st.canvas) {
        const ext = st.gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    } catch (e) {}
    _viewers.delete(id);
  }
  window._model3dDestroy = destroyViewer;

  function mountViewer(host, d, opts) {
    opts = opts || {};
    if (!host || !d) return null;
    destroyViewer(d.id);
    host.innerHTML = '';
    const mesh = ensureMesh(d);

    const wrap = document.createElement('div');
    wrap.className = 'model3d-wrap';
    wrap.style.cssText = 'width:100%;height:100%;position:relative;overflow:hidden;';

    if (!mesh) {
      wrap.style.background = '#0f172a';
      wrap.innerHTML =
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:rgba(255,255,255,.55);font:12px sans-serif;pointer-events:none">' +
        '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/></svg>' +
        '<span>OBJ</span></div>';
      host.appendChild(wrap);
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none;';
    wrap.appendChild(canvas);
    host.appendChild(wrap);

    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: !!opts.still })
      || canvas.getContext('experimental-webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
    if (!gl) {
      wrap.innerHTML = '<div style="color:#fff;padding:12px;font:12px sans-serif">WebGL недоступен</div>';
      return null;
    }

    const prog = _createProgram(gl);
    if (!prog) return null;

    const bufP = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufP);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    const bufN = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufN);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

    const locPos = gl.getAttribLocation(prog, 'aPos');
    const locNrm = gl.getAttribLocation(prog, 'aNrm');
    const uMVP = gl.getUniformLocation(prog, 'uMVP');
    const uModel = gl.getUniformLocation(prog, 'uModel');
    const uColor = gl.getUniformLocation(prog, 'uColor');
    const uLight = gl.getUniformLocation(prog, 'uLight');

    const st = {
      id: d.id,
      gl, canvas, wrap, prog, bufP, bufN, locPos, locNrm, uMVP, uModel, uColor, uLight,
      count: mesh.count,
      dRef: d,
      alive: true,
      raf: 0,
      t0: performance.now(),
      autoAngle: 0,
      color: _hexRgb(_resolveObjColor(d)),
      still: !!opts.still
    };
    _viewers.set(d.id, st);

    function resize() {
      const w = Math.max(1, host.clientWidth | 0);
      const h = Math.max(1, host.clientHeight | 0);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.max(1, Math.round(w * dpr));
      const bh = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function draw(now) {
      if (!st.alive) return;
      resize();
      const d0 = st.dRef || d;
      const rotX = (+d0.objRotX || 0) * DEG;
      let rotY = (+d0.objRotY || 0) * DEG;
      if (d0.objAutoRot) {
        const speed = _objSpeed(d0);
        if (speed > 0) {
          // ~36°/s at speed 1; speed 0 → freeze
          st.autoAngle = ((now - st.t0) / 1000) * speed * 36 * DEG;
        }
        rotY += st.autoAngle;
      }

      const tmp = new Float32Array(16);
      const model = new Float32Array(16);
      _mul(tmp, _rotX(rotX), _id());
      _mul(model, _rotY(rotY), tmp);

      const view = _id();
      _lookAt(view, [0, 0.35, 3.2], [0, 0, 0], [0, 1, 0]);
      const proj = _id();
      const aspect = canvas.width / Math.max(1, canvas.height);
      _perspective(proj, 40 * DEG, aspect, 0.1, 40);
      const vp = new Float32Array(16);
      _mul(vp, proj, view);
      const mvp = new Float32Array(16);
      _mul(mvp, vp, model);

      _applyClearColor(gl, wrap, d0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.useProgram(prog);

      gl.bindBuffer(gl.ARRAY_BUFFER, bufP);
      gl.enableVertexAttribArray(locPos);
      gl.vertexAttribPointer(locPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufN);
      gl.enableVertexAttribArray(locNrm);
      gl.vertexAttribPointer(locNrm, 3, gl.FLOAT, false, 0, 0);

      gl.uniformMatrix4fv(uMVP, false, mvp);
      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform3fv(uColor, st.color);
      gl.uniform3fv(uLight, [2.5, 3.5, 4.0]);
      gl.drawArrays(gl.TRIANGLES, 0, st.count);
    }

    function loop(now) {
      if (!st.alive) return;
      draw(now || performance.now());
      if (!st.still && st.dRef && st.dRef.objAutoRot && _objSpeed(st.dRef) > 0) {
        st.raf = requestAnimationFrame(loop);
      } else {
        st.raf = 0;
      }
    }

    draw(performance.now());
    if (!st.still && d.objAutoRot && _objSpeed(d) > 0) st.raf = requestAnimationFrame(loop);
    if (typeof ResizeObserver !== 'undefined') {
      try {
        const ro = new ResizeObserver(() => {
          if (!st.alive) return;
          if (!st.raf) draw(performance.now());
        });
        ro.observe(host);
        st.ro = ro;
      } catch (e) {}
    }
    return st;
  }
  window._model3dMount = mountViewer;

  function refreshViewer(d) {
    if (!d) return;
    const st = _viewers.get(d.id);
    if (!st || !st.alive) return;
    st.dRef = d;
    st.color = _hexRgb(_resolveObjColor(d));
    const speed = _objSpeed(d);
    if (d.objAutoRot && speed > 0) {
      st.t0 = performance.now() - (st.autoAngle / (speed * 36 * DEG)) * 1000;
      if (!st.raf) {
        const loop = function (now) {
          if (!st.alive) return;
          drawFrame(st, now);
          if (st.dRef && st.dRef.objAutoRot && _objSpeed(st.dRef) > 0) st.raf = requestAnimationFrame(loop);
          else st.raf = 0;
        };
        st.raf = requestAnimationFrame(loop);
      }
    } else {
      if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
      drawFrame(st, performance.now());
    }
  }

  function drawFrame(st, now) {
    const gl = st.gl;
    const canvas = st.canvas;
    const d0 = st.dRef;
    if (!gl || !d0) return;
    const host = canvas.parentElement && canvas.parentElement.parentElement;
    if (host) {
      const w = Math.max(1, host.clientWidth | 0);
      const h = Math.max(1, host.clientHeight | 0);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.max(1, Math.round(w * dpr));
      const bh = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw; canvas.height = bh;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    const rotX = (+d0.objRotX || 0) * DEG;
    let rotY = (+d0.objRotY || 0) * DEG;
    if (d0.objAutoRot) {
      const speed = _objSpeed(d0);
      if (speed > 0) {
        st.autoAngle = ((now - st.t0) / 1000) * speed * 36 * DEG;
      }
      rotY += st.autoAngle;
    }
    const tmp = new Float32Array(16);
    const model = new Float32Array(16);
    _mul(tmp, _rotX(rotX), _id());
    _mul(model, _rotY(rotY), tmp);
    const view = _id();
    _lookAt(view, [0, 0.35, 3.2], [0, 0, 0], [0, 1, 0]);
    const proj = _id();
    _perspective(proj, 40 * DEG, canvas.width / Math.max(1, canvas.height), 0.1, 40);
    const vp = new Float32Array(16);
    _mul(vp, proj, view);
    const mvp = new Float32Array(16);
    _mul(mvp, vp, model);
    gl.clearColor(0, 0, 0, 0);
    _applyClearColor(gl, st.wrap, d0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.useProgram(st.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, st.bufP);
    gl.enableVertexAttribArray(st.locPos);
    gl.vertexAttribPointer(st.locPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, st.bufN);
    gl.enableVertexAttribArray(st.locNrm);
    gl.vertexAttribPointer(st.locNrm, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(st.uMVP, false, mvp);
    gl.uniformMatrix4fv(st.uModel, false, model);
    gl.uniform3fv(st.uColor, st.color);
    gl.uniform3fv(st.uLight, [2.5, 3.5, 4.0]);
    gl.drawArrays(gl.TRIANGLES, 0, st.count);
  }
  window._model3dRefresh = refreshViewer;

  // ─── Element data helpers ──────────────────────────────────────────────────
  function _defaultModel3d(partial) {
    const bg = _defaultObjBg();
    const col = _defaultObjColor();
    return Object.assign({
      id: 'e' + (++ec),
      type: 'model3d',
      x: 80, y: 60, w: 360, h: 320,
      rot: 0, anims: [],
      objText: '',
      objName: '',
      objRotX: 0,
      objRotY: 0,
      objAutoRot: false,
      objRotSpeed: 1,
      objColor: col.color,
      objColorScheme: col.scheme,
      objBg: bg.color,
      objBgScheme: bg.scheme,
      objBgOp: 1,
      objBgCleared: false
    }, partial || {});
  }

  function _getModelData(el) {
    if (!el || typeof slides === 'undefined') return null;
    const slide = slides[typeof cur !== 'undefined' ? cur : 0];
    if (!slide) return null;
    return (slide.els || []).find(e => e && e.id === el.dataset.id) || null;
  }

  function _commitModel3d() {
    if (typeof save === 'function') save();
    if (typeof saveState === 'function') saveState();
    if (typeof drawThumbs === 'function') drawThumbs();
  }

  function addModel3dEl() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.obj,model/obj,text/plain';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.onchange = function () {
      const f = inp.files && inp.files[0];
      inp.remove();
      if (f) importObjFile(f);
    };
    inp.click();
  }
  window.addModel3dEl = addModel3dEl;

  function importObjFile(file) {
    if (!file || !slides || !slides[cur]) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const text = String(ev.target.result || '');
      const mesh = parseObj(text);
      if (!mesh) {
        if (typeof toast === 'function') toast('Не удалось разобрать OBJ', 'err');
        return;
      }
      if (typeof pushUndo === 'function') pushUndo();
      const snap = typeof _importSnap === 'function' ? _importSnap : (v => v);
      const d = _defaultModel3d({
        x: snap(80), y: snap(60), w: snap(360), h: snap(320),
        objText: text,
        objName: file.name || 'model.obj'
      });
      d._mesh = mesh;
      slides[cur].els.push(d);
      if (typeof mkEl === 'function') mkEl(d);
      const cv = document.getElementById('canvas');
      const el = cv && cv.querySelector('[data-id="' + d.id + '"]');
      if (el && typeof pick === 'function') pick(el);
      if (typeof save === 'function') save();
      if (typeof drawThumbs === 'function') drawThumbs();
      if (typeof saveState === 'function') saveState();
      if (typeof toast === 'function') toast('OBJ добавлен', 'ok');
    };
    reader.onerror = function () {
      if (typeof toast === 'function') toast('Не удалось прочитать OBJ', 'err');
    };
    reader.readAsText(file);
  }
  window.importObjFile = importObjFile;

  // ─── mkEl ──────────────────────────────────────────────────────────────────
  function _mkModel3dEl(d) {
    const cv = document.getElementById('canvas');
    if (!cv) return;
    const el = document.createElement('div');
    el.className = 'el';
    el.dataset.id = d.id;
    el.dataset.type = 'model3d';
    el.dataset.anims = JSON.stringify(d.anims || []);
    el.dataset.rot = d.rot || 0;
    el.style.cssText = 'left:' + d.x + 'px;top:' + d.y + 'px;width:' + d.w + 'px;height:' + d.h + 'px;transform:rotate(' + (d.rot || 0) + 'deg);overflow:hidden;';

    const ec_ = document.createElement('div');
    ec_.className = 'ec';
    ec_.style.cssText = 'width:100%;height:100%;position:relative;pointer-events:none;';
    el.appendChild(ec_);

    [{ cls: 'rh br', dx: 1, dy: 1, ax: 0, ay: 0 }, { cls: 'rh tr', dx: 1, dy: -1, ax: 0, ay: 1 },
      { cls: 'rh bl', dx: -1, dy: 1, ax: 1, ay: 0 }, { cls: 'rh tl', dx: -1, dy: -1, ax: 1, ay: 1 },
      { cls: 'rh tm', dx: 0, dy: -1, ax: 0, ay: 1 }, { cls: 'rh bm', dx: 0, dy: 1, ax: 0, ay: 0 },
      { cls: 'rh ml', dx: -1, dy: 0, ax: 1, ay: 0 }, { cls: 'rh mr', dx: 1, dy: 0, ax: 0, ay: 0 }
    ].forEach(h => {
      const rh = document.createElement('div');
      rh.setAttribute('class', h.cls);
      if (typeof mkResize === 'function') mkResize(el, rh, h);
      el.appendChild(rh);
    });

    if (typeof mkDrag === 'function') mkDrag(el, ec_);
    el.addEventListener('mousedown', ev => {
      const cn = ev.target.className || '';
      if (typeof cn === 'string' && (cn.includes('rh') || cn.includes('db'))) return;
      ev.stopPropagation();
      if (multiSel.size > 1 && multiSel.has(el) && !ev.shiftKey) return;
      if (typeof pickMulti === 'function') pickMulti(el, ev.shiftKey);
      else if (typeof pick === 'function') pick(el);
    });

    cv.appendChild(el);
    ensureMesh(d);
    mountViewer(ec_, d);
  }

  (function () {
    const _orig = window.mkEl;
    window.mkEl = function (d) {
      if (d && d.type === 'model3d') { _mkModel3dEl(d); return; }
      if (_orig) _orig.apply(this, arguments);
    };
  })();

  // Cleanup on slide reload
  (function () {
    const _orig = window.load;
    if (typeof _orig !== 'function') return;
    window.load = function () {
      _viewers.forEach((_, id) => destroyViewer(id));
      return _orig.apply(this, arguments);
    };
  })();

  // ─── Props ─────────────────────────────────────────────────────────────────
  function syncModel3dProps() {
    if (!sel || sel.dataset.type !== 'model3d') return;
    const d = _getModelData(sel);
    if (!d) return;
    const nameEl = document.getElementById('m3d-name');
    if (nameEl) nameEl.textContent = d.objName || 'model.obj';
    const rx = document.getElementById('m3d-rotx');
    const ry = document.getElementById('m3d-roty');
    if (rx) rx.textContent = Math.round(+(d.objRotX || 0)) + '°';
    if (ry) ry.textContent = Math.round(+(d.objRotY || 0)) + '°';
    const auto = document.getElementById('m3d-autorot');
    if (auto) auto.checked = !!d.objAutoRot;
    const spd = document.getElementById('m3d-speed');
    if (spd && document.activeElement !== spd) spd.value = d.objRotSpeed != null ? d.objRotSpeed : 1;

    const objCol = _resolveObjColor(d);
    if (typeof _setColorFieldValue === 'function') {
      _setColorFieldValue('m3d-col-hex', 'm3d-col-preview', objCol, d.objColorScheme || null);
    } else {
      const cprev = document.getElementById('m3d-col-preview');
      const chex = document.getElementById('m3d-col-hex');
      if (cprev) cprev.style.background = objCol;
      if (chex && document.activeElement !== chex) chex.value = objCol;
    }

    const bg = _resolveObjBg(d);
    const prev = document.getElementById('m3d-bg-preview');
    const hex = document.getElementById('m3d-bg-hex');
    if (d.objBgCleared) {
      if (prev) prev.style.background = 'transparent';
      if (hex && document.activeElement !== hex) hex.value = '';
    } else if (typeof _setColorFieldValue === 'function') {
      _setColorFieldValue('m3d-bg-hex', 'm3d-bg-preview', bg.color, d.objBgScheme || null);
    } else {
      if (prev) prev.style.background = bg.color || 'transparent';
      if (hex && document.activeElement !== hex) hex.value = bg.color || '';
    }
    const op = document.getElementById('m3d-bg-op');
    if (op && document.activeElement !== op) op.value = d.objBgCleared ? 0 : (d.objBgOp != null ? d.objBgOp : 1);
  }
  window.syncModel3dProps = syncModel3dProps;

  function updateModel3dRot(axis, delta) {
    if (!sel || sel.dataset.type !== 'model3d') return;
    if (typeof pushUndo === 'function') pushUndo();
    const d = _getModelData(sel);
    if (!d) return;
    if (axis === 'x') d.objRotX = Math.round(+(d.objRotX || 0) + delta);
    else d.objRotY = Math.round(+(d.objRotY || 0) + delta);
    refreshViewer(d);
    syncModel3dProps();
    _commitModel3d();
  }
  window.updateModel3dRot = updateModel3dRot;

  function setModel3dAutoRot(on) {
    if (!sel || sel.dataset.type !== 'model3d') return;
    if (typeof pushUndo === 'function') pushUndo();
    const d = _getModelData(sel);
    if (!d) return;
    d.objAutoRot = !!on;
    const auto = document.getElementById('m3d-autorot');
    if (auto) auto.checked = !!d.objAutoRot;
    refreshViewer(d);
    syncModel3dProps();
    _commitModel3d();
  }
  window.setModel3dAutoRot = setModel3dAutoRot;

  function setModel3dSpeed(v) {
    if (!sel || sel.dataset.type !== 'model3d') return;
    const d = _getModelData(sel);
    if (!d) return;
    // Keep explicit 0 (do not coerce via ||)
    const n = +v;
    d.objRotSpeed = isNaN(n) ? 1 : Math.max(0, Math.min(10, n));
    refreshViewer(d);
    if (typeof save === 'function') save();
    if (typeof saveState === 'function') saveState();
  }
  window.setModel3dSpeed = setModel3dSpeed;

  function setModel3dColor(col, schemeRef) {
    if (!sel || sel.dataset.type !== 'model3d') return;
    if (typeof pushUndo === 'function') pushUndo();
    const d = _getModelData(sel);
    if (!d) return;
    d.objColor = col || '';
    d.objColorScheme = schemeRef !== undefined ? (schemeRef || null) : d.objColorScheme;
    refreshViewer(d);
    syncModel3dProps();
    _commitModel3d();
  }
  window.setModel3dColor = setModel3dColor;

  function setModel3dBg(col, schemeRef) {
    if (!sel || sel.dataset.type !== 'model3d') return;
    if (typeof pushUndo === 'function') pushUndo();
    const d = _getModelData(sel);
    if (!d) return;
    d.objBgCleared = false;
    d.objBg = col || '';
    d.objBgScheme = schemeRef !== undefined ? (schemeRef || null) : d.objBgScheme;
    if (d.objBgOp == null || +d.objBgOp === 0) d.objBgOp = 1;
    refreshViewer(d);
    syncModel3dProps();
    _commitModel3d();
  }
  window.setModel3dBg = setModel3dBg;

  function clearModel3dBg() {
    if (!sel || sel.dataset.type !== 'model3d') return;
    if (typeof pushUndo === 'function') pushUndo();
    const d = _getModelData(sel);
    if (!d) return;
    d.objBgCleared = true;
    d.objBg = '';
    d.objBgScheme = null;
    refreshViewer(d);
    syncModel3dProps();
    _commitModel3d();
  }
  window.clearModel3dBg = clearModel3dBg;

  function setModel3dBgOp(op) {
    if (!sel || sel.dataset.type !== 'model3d') return;
    const d = _getModelData(sel);
    if (!d) return;
    d.objBgOp = Math.max(0, Math.min(1, +op || 0));
    if (d.objBgOp > 0) d.objBgCleared = false;
    refreshViewer(d);
    if (typeof save === 'function') save();
    if (typeof saveState === 'function') saveState();
  }
  window.setModel3dBgOp = setModel3dBgOp;

  function replaceModel3dFile(input) {
    if (!sel || sel.dataset.type !== 'model3d' || !input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function (ev) {
      const text = String(ev.target.result || '');
      const mesh = parseObj(text);
      if (!mesh) {
        if (typeof toast === 'function') toast('Не удалось разобрать OBJ', 'err');
        return;
      }
      if (typeof pushUndo === 'function') pushUndo();
      const d = _getModelData(sel);
      if (!d) return;
      d.objText = text;
      d.objName = file.name || 'model.obj';
      d._mesh = mesh;
      const ec_ = sel.querySelector('.ec');
      if (ec_) mountViewer(ec_, d);
      syncModel3dProps();
      _commitModel3d();
      if (typeof toast === 'function') toast('OBJ заменён', 'ok');
    };
    reader.readAsText(file);
    input.value = '';
  }
  window.replaceModel3dFile = replaceModel3dFile;

  (function () {
    const _orig = window.syncProps;
    window.syncProps = function () {
      if (typeof _orig === 'function') _orig.apply(this, arguments);
      const panel = document.getElementById('model3dprops');
      if (!panel) return;
      const t = sel && sel.dataset.type;
      panel.style.display = t === 'model3d' ? 'flex' : 'none';
      if (t === 'model3d') {
        panel.style.flexDirection = 'column';
        syncModel3dProps();
      }
    };
  })();

  // ─── Preview ───────────────────────────────────────────────────────────────
  (function () {
    const _orig = window.buildPSlide;
    if (typeof _orig !== 'function') return;
    window.buildPSlide = function (container, idx) {
      _orig.apply(this, arguments);
      const s = typeof slides !== 'undefined' ? slides[idx] : null;
      if (!s) return;
      const hiddenSet = (typeof hiddenElsPerSlide !== 'undefined' ? hiddenElsPerSlide[idx] : null) || new Set();
      (s.els || []).forEach(d => {
        if (!d || d.type !== 'model3d') return;
        if (hiddenSet.has(d.id)) return;
        const el = container.querySelector('.psel[data-id="' + d.id + '"]');
        if (!el) return;
        el.innerHTML = '';
        el.style.overflow = 'hidden';
        const host = document.createElement('div');
        host.style.cssText = 'width:100%;height:100%;';
        el.appendChild(host);
        ensureMesh(d);
        mountViewer(host, d, { animate: true });
      });
    };
  })();

  // ─── Thumbnails ────────────────────────────────────────────────────────────
  window.drawThumbModel3d = function (ctx, d, scaleX, scaleY) {
    const x = d.x * scaleX, y = d.y * scaleY, w = d.w * scaleX, h = d.h * scaleY;
    const bg = _resolveObjBg(d);
    if (!bg.cleared && bg.color && bg.op > 0) {
      ctx.globalAlpha = bg.op;
      ctx.fillStyle = bg.color;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = 'rgba(15,23,42,.35)';
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeStyle = 'rgba(125,211,252,.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
    ctx.fillStyle = 'rgba(125,211,252,.75)';
    ctx.font = Math.max(8, Math.min(14, h * 0.22)) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OBJ', x + w / 2, y + h / 2);
  };
})();

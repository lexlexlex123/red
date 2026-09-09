/** OBJ parse + WebGL viewer (ported subset of js/45b-model3d.js). */

const DEG = Math.PI / 180;
const viewers = new Map();

function matId() {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}
function matMul(out, a, b) {
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
function rotX(rad) {
  const m = matId();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  return m;
}
function rotY(rad) {
  const m = matId();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  m[0] = c;
  m[2] = -s;
  m[8] = s;
  m[10] = c;
  return m;
}
function perspective(out, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = 2 * far * near * nf;
  out[15] = 0;
  return out;
}
function lookAt(out, eye, center, up) {
  let zx = eye[0] - center[0];
  let zy = eye[1] - center[1];
  let zz = eye[2] - center[2];
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len;
  zy /= len;
  zz /= len;
  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  len = Math.hypot(xx, xy, xz) || 1;
  xx /= len;
  xy /= len;
  xz /= len;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  out[0] = xx;
  out[1] = yx;
  out[2] = zx;
  out[3] = 0;
  out[4] = xy;
  out[5] = yy;
  out[6] = zy;
  out[7] = 0;
  out[8] = xz;
  out[9] = yz;
  out[10] = zz;
  out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}

function hexRgb(hex) {
  const h = String(hex || '#6366f1').replace('#', '');
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}

export function parseObj(text) {
  const verts = [];
  const norms = [];
  const faces = [];
  const lines = String(text || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line[0] === '#') continue;
    const parts = line.split(/\s+/);
    const tag = parts[0];
    if (tag === 'v' && parts.length >= 4) verts.push([+parts[1], +parts[2], +parts[3]]);
    else if (tag === 'vn' && parts.length >= 4) norms.push([+parts[1], +parts[2], +parts[3]]);
    else if (tag === 'f' && parts.length >= 4) {
      const idxs = [];
      for (let k = 1; k < parts.length; k++) {
        const bits = parts[k].split('/');
        idxs.push({ v: (parseInt(bits[0], 10) || 0) - 1, n: bits[2] ? (parseInt(bits[2], 10) || 0) - 1 : -1 });
      }
      for (let t = 1; t < idxs.length - 1; t++) faces.push([idxs[0], idxs[t], idxs[t + 1]]);
    }
  }
  if (!verts.length || !faces.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  verts.forEach((v) => {
    if (v[0] < minX) minX = v[0];
    if (v[0] > maxX) maxX = v[0];
    if (v[1] < minY) minY = v[1];
    if (v[1] > maxY) maxY = v[1];
    if (v[2] < minZ) minZ = v[2];
    if (v[2] > maxZ) maxZ = v[2];
  });
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
  const scale = 1.6 / span;

  const pos = [];
  const nrm = [];
  function pushTri(a, b, c) {
    const va = verts[a.v];
    const vb = verts[b.v];
    const vc = verts[c.v];
    if (!va || !vb || !vc) return;
    let na;
    let nb;
    let nc;
    if (a.n >= 0 && norms[a.n] && b.n >= 0 && norms[b.n] && c.n >= 0 && norms[c.n]) {
      na = norms[a.n];
      nb = norms[b.n];
      nc = norms[c.n];
    } else {
      const ax = vb[0] - va[0];
      const ay = vb[1] - va[1];
      const az = vb[2] - va[2];
      const bx = vc[0] - va[0];
      const by = vc[1] - va[1];
      const bz = vc[2] - va[2];
      let nx = ay * bz - az * by;
      let ny = az * bx - ax * bz;
      let nz = ax * by - ay * bx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      na = nb = nc = [nx, ny, nz];
    }
    [va, vb, vc].forEach((v, i) => {
      pos.push((v[0] - cx) * scale, (v[1] - cy) * scale, (v[2] - cz) * scale);
      const n = i === 0 ? na : i === 1 ? nb : nc;
      nrm.push(n[0], n[1], n[2]);
    });
  }
  faces.forEach((f) => pushTri(f[0], f[1], f[2]));
  if (!pos.length) return null;
  return {
    positions: new Float32Array(pos),
    normals: new Float32Array(nrm),
    count: pos.length / 3,
  };
}

export function ensureMesh(d) {
  const m = d && d._mesh;
  if (
    m &&
    m.positions instanceof Float32Array &&
    m.normals instanceof Float32Array &&
    m.count > 0 &&
    m.positions.length === m.count * 3
  ) {
    return m;
  }
  if (d?.objText) {
    try {
      d._mesh = parseObj(d.objText);
      return d._mesh;
    } catch (e) {
      d._mesh = null;
      return null;
    }
  }
  if (d) d._mesh = null;
  return null;
}

const VS = `attribute vec3 aPos;attribute vec3 aNrm;uniform mat4 uMVP;uniform mat4 uModel;varying vec3 vN;void main(){vN=mat3(uModel)*aNrm;gl_Position=uMVP*vec4(aPos,1.0);}`;
const FS = `precision mediump float;varying vec3 vN;uniform vec3 uColor;uniform vec3 uLight;void main(){vec3 n=normalize(vN);float diff=max(dot(n,normalize(uLight)),0.0);float amb=0.28;gl_FragColor=vec4(uColor*(amb+diff*0.9),1.0);}`;

function createProgram(gl) {
  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  }
  const vs = sh(gl.VERTEX_SHADER, VS);
  const fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  return p;
}

export function destroyModel3dViewer(id) {
  const st = viewers.get(id);
  if (!st) return;
  st.alive = false;
  if (st.raf) cancelAnimationFrame(st.raf);
  viewers.delete(id);
}

/**
 * Mount WebGL viewer into host. Returns cleanup fn.
 */
export function mountModel3dViewer(host, d, opts = {}) {
  if (!host || !d) return () => {};
  destroyModel3dViewer(d.id);
  host.innerHTML = '';
  const mesh = ensureMesh(d);
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;height:100%;position:relative;overflow:hidden;';
  const bg = d.objBgCleared ? 'transparent' : d.objBg || '#0f172a';
  wrap.style.background = bg;

  if (!mesh) {
    wrap.innerHTML =
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:rgba(255,255,255,.55);font:12px sans-serif;pointer-events:none">' +
      '<span>OBJ</span><span style="opacity:.7">' +
      (d.objName || '') +
      '</span></div>';
    host.appendChild(wrap);
    return () => {
      host.innerHTML = '';
    };
  }

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none;';
  wrap.appendChild(canvas);
  host.appendChild(wrap);

  const gl =
    canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false }) ||
    canvas.getContext('experimental-webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) {
    wrap.innerHTML = '<div style="color:#fff;padding:12px;font:12px sans-serif">WebGL недоступен</div>';
    return () => {
      host.innerHTML = '';
    };
  }

  const prog = createProgram(gl);
  if (!prog) return () => {};

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
    alive: true,
    raf: 0,
    t0: performance.now(),
    autoAngle: 0,
    dRef: d,
    color: hexRgb(d.objColor || '#6366f1'),
  };
  viewers.set(d.id, st);

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
    wrap.style.background = d0.objBgCleared ? 'transparent' : d0.objBg || '#0f172a';
    st.color = hexRgb(d0.objColor || '#6366f1');
    const rx = (+d0.objRotX || 0) * DEG;
    let ry = (+d0.objRotY || 0) * DEG;
    if (d0.objAutoRot) {
      const speed = d0.objRotSpeed != null ? +d0.objRotSpeed : 1;
      if (speed > 0) st.autoAngle = ((now - st.t0) / 1000) * speed * 36 * DEG;
      ry += st.autoAngle;
    }
    const tmp = new Float32Array(16);
    const model = new Float32Array(16);
    matMul(tmp, rotX(rx), matId());
    matMul(model, rotY(ry), tmp);
    const view = matId();
    lookAt(view, [0, 0.35, 3.2], [0, 0, 0], [0, 1, 0]);
    const proj = matId();
    perspective(proj, 40 * DEG, canvas.width / Math.max(1, canvas.height), 0.1, 40);
    const vp = new Float32Array(16);
    matMul(vp, proj, view);
    const mvp = new Float32Array(16);
    matMul(mvp, vp, model);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
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
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  }

  function loop(now) {
    if (!st.alive) return;
    draw(now);
    if (!opts.still && (d.objAutoRot || true)) st.raf = requestAnimationFrame(loop);
  }
  // Always animate a bit so resize/redraw stays fresh; cheap when auto-rot off
  st.raf = requestAnimationFrame(loop);

  return () => {
    destroyModel3dViewer(d.id);
    host.innerHTML = '';
  };
}

export function defaultModel3dFields(partial = {}) {
  return {
    type: 'model3d',
    x: 80,
    y: 60,
    w: 360,
    h: 320,
    rot: 0,
    anims: [],
    objText: '',
    objName: '',
    objRotX: -15,
    objRotY: 25,
    objAutoRot: true,
    objRotSpeed: 1,
    objColor: '#6366f1',
    objBg: '#0f172a',
    objBgOp: 1,
    objBgCleared: false,
    ...partial,
  };
}

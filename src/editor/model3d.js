/** OBJ parse + WebGL viewer (ported subset of js/45b-model3d.js). */

const DEG = Math.PI / 180;
const viewers = new Map();
let viewerSeq = 0;

/** Fixed attrib slots — must match bindAttribLocation in compileProgram. */
const ATTR_POS = 0;
const ATTR_NRM = 1;

/**
 * WebGL1 attribute enable state is GLOBAL (not per-program). If aNrm (slot 1)
 * stays enabled while drawing lines with a larger vertex count than the normals
 * buffer, Chrome reports: "Vertex buffer is not big enough for the draw call".
 */
function disableAttribs(gl, maxAttribs) {
  if (!gl) return;
  const n = maxAttribs > 0 ? maxAttribs : 16;
  for (let i = 0; i < n; i++) gl.disableVertexAttribArray(i);
}

function bindAttrib(gl, loc, buf, size) {
  if (!gl || loc < 0 || !buf) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
}

/** Clip-space pixel offset: gl_Position.xy += (dx,dy) * gl_Position.w after MVP. */
function mvpWithPixelOffset(out, mvp, dxPx, dyPx, canvasW, canvasH) {
  out.set(mvp);
  const dx = (dxPx * 2) / Math.max(1, canvasW);
  const dy = (dyPx * 2) / Math.max(1, canvasH);
  for (let i = 0; i < 4; i++) {
    out[i * 4] += dx * out[i * 4 + 3];
    out[i * 4 + 1] += dy * out[i * 4 + 3];
  }
  return out;
}

/**
 * WebGL1 often clamps gl.lineWidth to 1 — thicken strokes by re-drawing with
 * small screen-space offsets (works for wireframe edges and authored `l` lines).
 */
function normObjLineWidth(el) {
  const v = el && el.objLineWidth != null ? +el.objLineWidth : 1.5;
  return Math.max(0.5, Math.min(12, Number.isFinite(v) ? v : 1.5));
}

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

function parseVertIndex(tok, vertCount) {
  const bits = String(tok || '').split('/');
  let vi = parseInt(bits[0], 10);
  if (!Number.isFinite(vi) || vi === 0) return -1;
  // OBJ allows relative indices (−1 = last vertex).
  if (vi < 0) vi = (vertCount | 0) + vi + 1;
  return vi - 1;
}

/** `o Label_*` / names containing Label → camera-facing billboards. */
function isLabelObjName(name) {
  const n = String(name || '').trim();
  if (!n) return false;
  return /^label\b/i.test(n) || /^label[_-]/i.test(n) || /\blabel[_-]/i.test(n);
}

function matTranslate(tx, ty, tz) {
  const m = matId();
  m[12] = tx;
  m[13] = ty;
  m[14] = tz;
  return m;
}

function xformPoint(m, p) {
  const x = p[0];
  const y = p[1];
  const z = p[2];
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

/** Spherical billboard: local +Z faces the eye; local XY keeps the letter upright. */
function billboardFacing(eye, pos) {
  // forward = toward camera (label local +Z)
  let zx = eye[0] - pos[0];
  let zy = eye[1] - pos[1];
  let zz = eye[2] - pos[2];
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len;
  zy /= len;
  zz /= len;
  // right = worldUp × forward — matches camera right when looking at the label.
  // (forward × up mirrored glyph X so B/Е читались задом наперёд.)
  let rx = zz;
  let ry = 0;
  let rz = -zx;
  len = Math.hypot(rx, ry, rz);
  if (len < 1e-5) {
    rx = 1;
    ry = 0;
    rz = 0;
  } else {
    rx /= len;
    ry /= len;
    rz /= len;
  }
  // up = forward × right (column basis: right, up, forward)
  const ux = zy * rz - zz * ry;
  const uy = zz * rx - zx * rz;
  const uz = zx * ry - zy * rx;
  const m = matId();
  m[0] = rx;
  m[1] = ry;
  m[2] = rz;
  m[4] = ux;
  m[5] = uy;
  m[6] = uz;
  m[8] = zx;
  m[9] = zy;
  m[10] = zz;
  return m;
}

/**
 * When an OBJ has only vertices (common AI dumps), rebuild faces by clustering
 * connected parts and stitching latitude rings inside each cluster.
 */
function reconstructFacesFromRings(verts) {
  if (!verts || verts.length < 24) return [];
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
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
  const linkDist = span * 0.18;
  const linkDist2 = linkDist * linkDist;
  const n = verts.length;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (i) => {
    let a = i;
    while (parent[a] !== a) a = parent[a];
    let b = i;
    while (parent[b] !== a) {
      const p = parent[b];
      parent[b] = a;
      b = p;
    }
    return a;
  };
  const unite = (a, b) => {
    a = find(a);
    b = find(b);
    if (a !== b) parent[b] = a;
  };
  // Spatial hash to avoid O(n²) on large clouds.
  const cell = Math.max(linkDist, span / 32);
  const buckets = new Map();
  const key = (ix, iy, iz) => `${ix},${iy},${iz}`;
  for (let i = 0; i < n; i++) {
    const v = verts[i];
    const ix = Math.floor(v[0] / cell);
    const iy = Math.floor(v[1] / cell);
    const iz = Math.floor(v[2] / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = buckets.get(key(ix + dx, iy + dy, iz + dz));
          if (!list) continue;
          for (let k = 0; k < list.length; k++) {
            const j = list[k];
            const w = verts[j];
            const ddx = v[0] - w[0];
            const ddy = v[1] - w[1];
            const ddz = v[2] - w[2];
            if (ddx * ddx + ddy * ddy + ddz * ddz <= linkDist2) unite(i, j);
          }
        }
      }
    }
    const k0 = key(ix, iy, iz);
    if (!buckets.has(k0)) buckets.set(k0, []);
    buckets.get(k0).push(i);
  }
  const clusters = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!clusters.has(r)) clusters.set(r, []);
    clusters.get(r).push(i);
  }
  const faces = [];
  const yEps = Math.max(span * 0.0015, 1e-4);
  clusters.forEach((idxs) => {
    if (idxs.length < 8) return;
    const items = idxs
      .map((i) => ({ i, v: verts[i] }))
      .sort((a, b) => a.v[1] - b.v[1] || a.v[0] - b.v[0]);
    const groups = [];
    items.forEach((it) => {
      const g = groups[groups.length - 1];
      if (g && Math.abs(g.y - it.v[1]) <= yEps) g.items.push(it);
      else groups.push({ y: it.v[1], items: [it] });
    });
    const rings = [];
    groups.forEach((g) => {
      if (g.items.length === 1) {
        rings.push({ type: 'pole', idxs: [g.items[0].i] });
        return;
      }
      if (g.items.length < 6) return;
      let cx = 0;
      let cz = 0;
      g.items.forEach((it) => {
        cx += it.v[0];
        cz += it.v[2];
      });
      cx /= g.items.length;
      cz /= g.items.length;
      const ordered = g.items.slice().sort((a, b) => {
        const aa = Math.atan2(a.v[2] - cz, a.v[0] - cx);
        const bb = Math.atan2(b.v[2] - cz, b.v[0] - cx);
        return aa - bb;
      });
      const rads = ordered.map((it) => Math.hypot(it.v[0] - cx, it.v[2] - cz));
      const rMean = rads.reduce((s, r) => s + r, 0) / rads.length;
      if (rMean < 1e-6) return;
      let rDev = 0;
      rads.forEach((r) => {
        rDev += (r - rMean) * (r - rMean);
      });
      rDev = Math.sqrt(rDev / rads.length) / rMean;
      if (rDev > 0.4) return;
      rings.push({ type: 'ring', idxs: ordered.map((it) => it.i) });
    });
    for (let r = 0; r < rings.length - 1; r++) {
      const A = rings[r];
      const B = rings[r + 1];
      if (A.type === 'pole' && B.type === 'ring') {
        for (let i = 0; i < B.idxs.length; i++) {
          const j = (i + 1) % B.idxs.length;
          faces.push([
            { v: A.idxs[0], n: -1 },
            { v: B.idxs[i], n: -1 },
            { v: B.idxs[j], n: -1 },
          ]);
        }
      } else if (A.type === 'ring' && B.type === 'pole') {
        for (let i = 0; i < A.idxs.length; i++) {
          const j = (i + 1) % A.idxs.length;
          faces.push([
            { v: A.idxs[i], n: -1 },
            { v: A.idxs[j], n: -1 },
            { v: B.idxs[0], n: -1 },
          ]);
        }
      } else if (A.type === 'ring' && B.type === 'ring' && A.idxs.length === B.idxs.length) {
        const m = A.idxs.length;
        for (let i = 0; i < m; i++) {
          const i1 = (i + 1) % m;
          faces.push([
            { v: A.idxs[i], n: -1 },
            { v: A.idxs[i1], n: -1 },
            { v: B.idxs[i1], n: -1 },
          ]);
          faces.push([
            { v: A.idxs[i], n: -1 },
            { v: B.idxs[i1], n: -1 },
            { v: B.idxs[i], n: -1 },
          ]);
        }
      }
    }
  });
  return faces;
}

/** Closed circular polyline in a Y≈const plane → ring for silhouette of revolution. */
function detectRing(idxs, xVerts) {
  if (!idxs || idxs.length < 9) return null;
  let ids = idxs.slice();
  const a = xVerts[ids[0]];
  const b = xVerts[ids[ids.length - 1]];
  if (!a || !b) return null;
  const closed =
    ids[0] === ids[ids.length - 1] || Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-4;
  if (!closed) return null;
  if (ids[0] === ids[ids.length - 1] || Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-4) {
    ids = ids.slice(0, -1);
  }
  if (ids.length < 8) return null;
  const pts = [];
  for (let i = 0; i < ids.length; i++) {
    const p = xVerts[ids[i]];
    if (!p) return null;
    pts.push(p);
  }
  let mx = 0;
  let my = 0;
  let mz = 0;
  pts.forEach((p) => {
    mx += p[0];
    my += p[1];
    mz += p[2];
  });
  mx /= pts.length;
  my /= pts.length;
  mz /= pts.length;
  let yDev = 0;
  const radii = [];
  pts.forEach((p) => {
    yDev += (p[1] - my) * (p[1] - my);
    radii.push(Math.hypot(p[0] - mx, p[2] - mz));
  });
  yDev = Math.sqrt(yDev / pts.length);
  const rMean = radii.reduce((s, r) => s + r, 0) / radii.length;
  if (rMean < 1e-5) return null;
  let rDev = 0;
  radii.forEach((r) => {
    rDev += (r - rMean) * (r - rMean);
  });
  rDev = Math.sqrt(rDev / radii.length) / rMean;
  if (yDev > rMean * 0.18 || rDev > 0.14) return null;
  return {
    ids,
    idSet: new Set(ids),
    pts: pts.map((p) => [p[0], p[1], p[2]]),
    cx: mx,
    cy: my,
    cz: mz,
    r: rMean,
  };
}

const SIL_RING_SAMPLES = 96;

/** Dense analytical samples on a Y-plane circle (model space). */
function sampleRingCircle(ring, n = SIL_RING_SAMPLES) {
  const pts = [];
  const cx = ring.cx;
  const cy = ring.cy;
  const cz = ring.cz;
  const r = ring.r;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([cx + r * Math.cos(t), cy, cz + r * Math.sin(t)]);
  }
  return pts;
}

/** Append a closed circle as line segments into linePos array. */
function pushCircleLines(linePos, ring, n = SIL_RING_SAMPLES) {
  const pts = sampleRingCircle(ring, n);
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    linePos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
}

/** Camera eye → model space (model is rotation-only). */
function eyeModelSpace(model, eye) {
  const x = eye[0];
  const y = eye[1];
  const z = eye[2];
  return [
    model[0] * x + model[1] * y + model[2] * z,
    model[4] * x + model[5] * y + model[6] * z,
    model[8] * x + model[9] * y + model[10] * z,
  ];
}

function projectMvp(mvp, p) {
  const x = p[0];
  const y = p[1];
  const z = p[2];
  const X = mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12];
  const Y = mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13];
  const W = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15];
  const iw = W !== 0 ? 1 / W : 0;
  return { x: X * iw, y: Y * iw, w: W };
}

/**
 * Perspective tangents from eye to a horizontal circle in XZ (exact, not vertex-snapped).
 * Returns [pA, pB] ordered stably by signed cross with view.
 */
function circlePerspectiveTangents(ring, eyeM) {
  const cx = ring.cx;
  const cy = ring.cy;
  const cz = ring.cz;
  const r = ring.r;
  const dx = eyeM[0] - cx;
  const dz = eyeM[2] - cz;
  const d2 = dx * dx + dz * dz;
  const r2 = r * r;
  let p1;
  let p2;
  if (d2 <= r2 * 1.0001) {
    const hx = eyeM[0];
    const hz = eyeM[2];
    const hl = Math.hypot(hx, hz) || 1;
    const sx = -hz / hl;
    const sz = hx / hl;
    p1 = [cx - r * sx, cy, cz - r * sz];
    p2 = [cx + r * sx, cy, cz + r * sz];
  } else {
    const s = Math.sqrt(d2 - r2);
    const a = r2 / d2;
    const b = (r * s) / d2;
    p1 = [cx + a * dx - b * dz, cy, cz + a * dz + b * dx];
    p2 = [cx + a * dx + b * dz, cy, cz + a * dz - b * dx];
  }
  const c1 = (p1[0] - cx) * dz - (p1[2] - cz) * dx;
  return c1 >= 0 ? [p1, p2] : [p2, p1];
}

/**
 * Screen-space extremes of a continuous circle (matches tilted projected ellipses).
 * Returns 3D points [left, right] in model space.
 */
function ringScreenExtremes(ring, mvp, n = 192) {
  let pL = [ring.cx + ring.r, ring.cy, ring.cz];
  let pR = [ring.cx - ring.r, ring.cy, ring.cz];
  let xL = Infinity;
  let xR = -Infinity;
  let tL = 0;
  let tR = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const ang = t * Math.PI * 2;
    const p = [ring.cx + ring.r * Math.cos(ang), ring.cy, ring.cz + ring.r * Math.sin(ang)];
    const pr = projectMvp(mvp, p);
    if (pr.w <= 0) continue;
    if (pr.x < xL) {
      xL = pr.x;
      pL = p;
      tL = t;
    }
    if (pr.x > xR) {
      xR = pr.x;
      pR = p;
      tR = t;
    }
  }
  const refine = (tBest, wantMax) => {
    let half = 1 / n;
    let bestT = tBest;
    let bestX = wantMax ? -Infinity : Infinity;
    let bestP = wantMax ? pR : pL;
    for (let iter = 0; iter < 10; iter++) {
      for (let s = -4; s <= 4; s++) {
        let t = bestT + (s * half) / 4;
        t = ((t % 1) + 1) % 1;
        const ang = t * Math.PI * 2;
        const p = [ring.cx + ring.r * Math.cos(ang), ring.cy, ring.cz + ring.r * Math.sin(ang)];
        const pr = projectMvp(mvp, p);
        if (pr.w <= 0) continue;
        if (wantMax ? pr.x >= bestX : pr.x <= bestX) {
          bestX = pr.x;
          bestT = t;
          bestP = p;
        }
      }
      half *= 0.35;
    }
    return bestP;
  };
  return [refine(tL, false), refine(tR, true)];
}

/**
 * Build dynamic silhouette segments for revolution solids (cylinder / cone / sphere).
 * Writes into out Float32Array, returns vertex count for gl.LINES.
 * Pass mvp so side edges match the projected ellipse outline (not coarse OBJ verts).
 */
export function fillRevolutionSilhouette(rev, model, eye, out, mvp) {
  if (!rev || !out) return 0;
  const eyeM = eyeModelSpace(model, eye);
  if (rev.type === 'sphere') {
    const [cx, cy, cz] = rev.c;
    const r = rev.r;
    let vx = eyeM[0] - cx;
    let vy = eyeM[1] - cy;
    let vz = eyeM[2] - cz;
    let vl = Math.hypot(vx, vy, vz) || 1;
    vx /= vl;
    vy /= vl;
    vz /= vl;
    let ux;
    let uy;
    let uz;
    if (Math.abs(vy) < 0.9) {
      ux = vz;
      uy = 0;
      uz = -vx;
    } else {
      ux = 0;
      uy = -vz;
      uz = vy;
    }
    let ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const wx = vy * uz - vz * uy;
    const wy = vz * ux - vx * uz;
    const wz = vx * uy - vy * ux;
    const n = 64;
    let o = 0;
    for (let i = 0; i < n; i++) {
      const t0 = (i / n) * Math.PI * 2;
      const t1 = ((i + 1) / n) * Math.PI * 2;
      const c0 = Math.cos(t0);
      const s0 = Math.sin(t0);
      const c1 = Math.cos(t1);
      const s1 = Math.sin(t1);
      out[o++] = cx + r * (ux * c0 + wx * s0);
      out[o++] = cy + r * (uy * c0 + wy * s0);
      out[o++] = cz + r * (uz * c0 + wz * s0);
      out[o++] = cx + r * (ux * c1 + wx * s1);
      out[o++] = cy + r * (uy * c1 + wy * s1);
      out[o++] = cz + r * (uz * c1 + wz * s1);
    }
    return n * 2;
  }

  // Cone/pyramid: ribs stay in the static line buffer — no extra silhouette here.

  if ((rev.type === 'cylinder' || rev.type === 'frustum') && rev.bottom && rev.top) {
    // Side edges must share the same azimuth on both caps. Connecting independent
    // screen-left/right points (different angles) cuts across the cylinder when tilted.
    const [bMin, bMax] = circlePerspectiveTangents(rev.bottom, eyeM);
    let tMin;
    let tMax;
    if (rev.type === 'cylinder' || Math.abs(rev.bottom.r - rev.top.r) < 1e-4) {
      tMin = pointOnRingAngle(rev.top, ringAngleOfPoint(rev.bottom, bMin));
      tMax = pointOnRingAngle(rev.top, ringAngleOfPoint(rev.bottom, bMax));
    } else {
      [tMin, tMax] = circlePerspectiveTangents(rev.top, eyeM);
    }
    out[0] = bMin[0];
    out[1] = bMin[1];
    out[2] = bMin[2];
    out[3] = tMin[0];
    out[4] = tMin[1];
    out[5] = tMin[2];
    out[6] = bMax[0];
    out[7] = bMax[1];
    out[8] = bMax[2];
    out[9] = tMax[0];
    out[10] = tMax[1];
    out[11] = tMax[2];
    return 4;
  }
  return 0;
}

function buildRevolution(xVerts, polylines) {
  const rings = [];
  for (let i = 0; i < polylines.length; i++) {
    const ring = detectRing(polylines[i], xVerts);
    if (ring) rings.push(ring);
  }
  rings.sort((a, b) => b.r - a.r);

  // Sphere: most verts sit on one radius from center.
  if (xVerts.length >= 24) {
    let sx = 0;
    let sy = 0;
    let sz = 0;
    xVerts.forEach((v) => {
      sx += v[0];
      sy += v[1];
      sz += v[2];
    });
    const n = xVerts.length;
    const cx = sx / n;
    const cy = sy / n;
    const cz = sz / n;
    const dists = xVerts.map((v) => Math.hypot(v[0] - cx, v[1] - cy, v[2] - cz));
    const rMean = dists.reduce((a, b) => a + b, 0) / n;
    if (rMean > 1e-4) {
      let varR = 0;
      dists.forEach((r) => {
        varR += (r - rMean) * (r - rMean);
      });
      varR = Math.sqrt(varR / n) / rMean;
      // Sphere-like cloud and not a clear 2-ring cylinder diagram.
      if (varR < 0.08 && rings.length < 2) {
        return { type: 'sphere', c: [cx, cy, cz], r: rMean, hideGens: false };
      }
    }
  }

  if (rings.length >= 2) {
    const a = rings[0];
    const b = rings[1];
    const cDist = Math.hypot(a.cx - b.cx, a.cz - b.cz);
    if (cDist < Math.max(a.r, b.r) * 0.25) {
      const bottom = a.cy <= b.cy ? a : b;
      const top = a.cy <= b.cy ? b : a;
      const rRatio = Math.abs(a.r - b.r) / Math.max(a.r, b.r);
      const type = rRatio < 0.1 ? 'cylinder' : 'frustum';
      return { type, bottom, top, hideGens: true };
    }
  }

  if (rings.length >= 1) {
    const base = rings[0];
    let apex = null;
    let apexScore = Infinity;
    for (let i = 0; i < xVerts.length; i++) {
      if (base.idSet.has(i)) continue;
      const v = xVerts[i];
      const rad = Math.hypot(v[0] - base.cx, v[2] - base.cz);
      if (rad > base.r * 0.18) continue;
      const dy = Math.abs(v[1] - base.cy);
      if (dy < base.r * 0.35) continue;
      if (rad < apexScore) {
        apexScore = rad;
        apex = [v[0], v[1], v[2]];
      }
    }
    if (apex) {
      // Never strip cone/pyramid ribs — only cylinders replace fixed generators.
      // (Stripping made pyramids / low-poly cones vanish or look empty.)
      return { type: 'cone', base, apex, hideGens: false };
    }
  }
  return null;
}

function nearRingRim(p, ring, yTol, rTol) {
  if (!p || !ring) return false;
  if (Math.abs(p[1] - ring.cy) > yTol) return false;
  const rad = Math.hypot(p[0] - ring.cx, p[2] - ring.cz);
  return Math.abs(rad - ring.r) <= rTol;
}

function isGeneratorSegment(i0, i1, rev, xVerts) {
  if (!rev || !rev.hideGens) return false;
  if (rev.type === 'cone') return false;
  if ((rev.type === 'cylinder' || rev.type === 'frustum') && rev.bottom && rev.top) {
    const a0 = rev.bottom.idSet.has(i0);
    const a1 = rev.bottom.idSet.has(i1);
    const b0 = rev.top.idSet.has(i0);
    const b1 = rev.top.idSet.has(i1);
    if ((a0 && b1) || (a1 && b0)) return true;
    // Geometric fallback — catches OBJ ribs even if index sets drifted.
    if (xVerts) {
      const p0 = xVerts[i0];
      const p1 = xVerts[i1];
      const ySpan = Math.abs(rev.top.cy - rev.bottom.cy) || 1;
      const yTol = ySpan * 0.1 + 1e-4;
      const rTol = Math.max(rev.bottom.r, rev.top.r) * 0.14 + 1e-4;
      const up =
        (nearRingRim(p0, rev.bottom, yTol, rTol) && nearRingRim(p1, rev.top, yTol, rTol)) ||
        (nearRingRim(p0, rev.top, yTol, rTol) && nearRingRim(p1, rev.bottom, yTol, rTol));
      if (up) return true;
    }
  }
  return false;
}

function pointOnRingAngle(ring, ang) {
  return [ring.cx + ring.r * Math.cos(ang), ring.cy, ring.cz + ring.r * Math.sin(ang)];
}

function ringAngleOfPoint(ring, p) {
  return Math.atan2(p[2] - ring.cz, p[0] - ring.cx);
}

/** Parse 0..1 opacity from "0.4", "40%", "40", "a40", "op0.5". */
function parseOpacityValue(raw) {
  const s = String(raw || '')
    .trim()
    .replace(/^a(?:lpha)?_?/i, '')
    .replace(/^op(?:acity)?_?/i, '');
  if (!s) return null;
  if (/%$/.test(s)) {
    const p = parseFloat(s);
    if (!Number.isFinite(p)) return null;
    return Math.max(0, Math.min(1, p / 100));
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  if (n > 1 && n <= 100) return Math.max(0, Math.min(1, n / 100));
  return Math.max(0, Math.min(1, n));
}

/**
 * Opacity from object/group name: Glass_a40, Window_op50, Lid_alpha0.35, Part_opacity70%.
 * Returns null if no suffix — keep previous / default alpha.
 */
function opacityFromObjName(name) {
  const m = String(name || '').match(
    /(?:^|[_\-\s])(?:a|op|alpha|opacity)[_-]?(\d{1,3}(?:\.\d+)?%?)$/i
  );
  if (!m) return null;
  return parseOpacityValue(m[1]);
}

/** `# opacity 0.4` / bare `opacity 0.4` / `alpha 50%` directives. */
function opacityFromComment(line) {
  const m = String(line || '').match(/^#?\s*(?:opacity|alpha|op)\s*[:=]?\s*(.+)$/i);
  if (!m) return null;
  // Require leading # OR a line that is only the opacity directive (no other OBJ tags).
  const raw = String(line || '').trim();
  if (raw[0] !== '#' && !/^(?:opacity|alpha|op)\b/i.test(raw)) return null;
  return parseOpacityValue(m[1].split(/\s+/)[0]);
}

export function parseObj(text) {
  const verts = [];
  const norms = [];
  const faces = [];
  const polylines = [];
  let curObj = '';
  let curAlpha = 1;
  const lines = String(text || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line[0] === '#') {
      const fromC = opacityFromComment(line);
      if (fromC != null) curAlpha = fromC;
      continue;
    }
    // Bare `opacity 0.4` / `alpha 50%` (LLMs often omit #).
    if (/^(?:opacity|alpha|op)\b/i.test(line)) {
      const fromC = opacityFromComment(line);
      if (fromC != null) curAlpha = fromC;
      continue;
    }
    const parts = line.split(/\s+/);
    const tag = String(parts[0] || '').toLowerCase();
    if (tag === 'o' || tag === 'g') {
      curObj = parts.slice(1).join(' ').trim();
      const fromName = opacityFromObjName(curObj);
      if (fromName != null) curAlpha = fromName;
      else curAlpha = 1;
      continue;
    }
    if (tag === 'v' && parts.length >= 4) {
      const x = +parts[1];
      const y = +parts[2];
      const z = +parts[3];
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) verts.push([x, y, z]);
    } else if (tag === 'vn' && parts.length >= 4) {
      norms.push([+parts[1], +parts[2], +parts[3]]);
    } else if (tag === 'f' && parts.length >= 4) {
      const idxs = [];
      for (let k = 1; k < parts.length; k++) {
        const bits = parts[k].split('/');
        let vi = parseInt(bits[0], 10);
        if (!Number.isFinite(vi) || vi === 0) continue;
        if (vi < 0) vi = verts.length + vi + 1;
        let ni = -1;
        if (bits[2]) {
          ni = parseInt(bits[2], 10);
          if (!Number.isFinite(ni) || ni === 0) ni = -1;
          else if (ni < 0) ni = norms.length + ni + 1;
          if (ni > 0) ni -= 1;
          else ni = -1;
        }
        idxs.push({ v: vi - 1, n: ni });
      }
      const label = isLabelObjName(curObj);
      const alpha = label ? 1 : curAlpha;
      for (let t = 1; t < idxs.length - 1; t++) {
        faces.push({ tri: [idxs[0], idxs[t], idxs[t + 1]], label, obj: curObj, alpha });
      }
    } else if (tag === 'l' && parts.length >= 3) {
      const idxs = [];
      for (let k = 1; k < parts.length; k++) {
        const vi = parseVertIndex(parts[k], verts.length);
        if (vi >= 0) idxs.push(vi);
      }
      if (idxs.length >= 2) {
        polylines.push({ idxs, label: isLabelObjName(curObj), obj: curObj });
      }
    }
  }
  const mainFaces = faces.filter((f) => !f.label);
  const labelFaceGroups = new Map();
  faces.forEach((f) => {
    if (!f.label) return;
    const key = f.obj || 'Label';
    if (!labelFaceGroups.has(key)) labelFaceGroups.set(key, []);
    labelFaceGroups.get(key).push(f.tri);
  });
  const mainPolys = polylines.filter((p) => !p.label).map((p) => p.idxs);
  const labelPolyGroups = new Map();
  polylines.forEach((p) => {
    if (!p.label) return;
    const key = p.obj || 'Label';
    if (!labelPolyGroups.has(key)) labelPolyGroups.set(key, []);
    labelPolyGroups.get(key).push(p.idxs);
  });

  if (!mainFaces.length && !mainPolys.length && verts.length >= 24 && !labelPolyGroups.size && !labelFaceGroups.size) {
    const built = reconstructFacesFromRings(verts);
    for (let i = 0; i < built.length; i++) mainFaces.push({ tri: built[i], alpha: 1 });
  }
  if (
    !verts.length ||
    (!mainFaces.length && !mainPolys.length && !labelPolyGroups.size && !labelFaceGroups.size)
  ) {
    return null;
  }

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

  const xform = (v) => [(v[0] - cx) * scale, (v[1] - cy) * scale, (v[2] - cz) * scale];
  const xVerts = verts.map(xform);

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
      const p = xform(v);
      pos.push(p[0], p[1], p[2]);
      const n = i === 0 ? na : i === 1 ? nb : nc;
      nrm.push(n[0], n[1], n[2]);
    });
  }

  // Opaque first, then transparent (grouped by alpha) for correct blending.
  const opaqueFaces = [];
  const transparentFaces = [];
  mainFaces.forEach((f) => {
    const a = f.alpha != null && Number.isFinite(f.alpha) ? f.alpha : 1;
    const face = { tri: f.tri, alpha: Math.max(0, Math.min(1, a)) };
    if (face.alpha >= 0.999) opaqueFaces.push(face);
    else if (face.alpha > 0.001) transparentFaces.push(face);
  });
  transparentFaces.sort((a, b) => a.alpha - b.alpha);

  const drawRuns = [];
  function emitFaceList(list) {
    if (!list.length) return;
    let runStart = (pos.length / 3) | 0;
    let runAlpha = list[0].alpha;
    let runCount = 0;
    for (let i = 0; i < list.length; i++) {
      const face = list[i];
      if (Math.abs(face.alpha - runAlpha) > 0.002 && runCount > 0) {
        drawRuns.push({ start: runStart, count: runCount, alpha: runAlpha });
        runStart = (pos.length / 3) | 0;
        runAlpha = face.alpha;
        runCount = 0;
      }
      runAlpha = face.alpha;
      const before = pos.length;
      pushTri(face.tri[0], face.tri[1], face.tri[2]);
      if (pos.length > before) runCount += 3;
    }
    if (runCount > 0) drawRuns.push({ start: runStart, count: runCount, alpha: runAlpha });
  }
  emitFaceList(opaqueFaces);
  emitFaceList(transparentFaces);

  // Unique edges for wireframe mode (from main faces only).
  const edgeKeys = new Set();
  mainFaces.forEach((f) => {
    const tri = f.tri || f;
    const a = tri[0].v;
    const b = tri[1].v;
    const c = tri[2].v;
    const add = (i, j) => {
      if (i < 0 || j < 0) return;
      edgeKeys.add(i < j ? `${i},${j}` : `${j},${i}`);
    };
    add(a, b);
    add(b, c);
    add(c, a);
  });
  const edgePos = [];
  edgeKeys.forEach((k) => {
    const [i, j] = k.split(',').map(Number);
    const a = xVerts[i];
    const b = xVerts[j];
    if (!a || !b) return;
    edgePos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  });

  const rev = buildRevolution(xVerts, mainPolys);

  // Replace coarse ring polylines with dense circles only for cylinders (silhouette match).
  // Cones/pyramids must keep the authored base loop — replacing it and stripping ribs made them empty.
  const ringPolyIdx = new Set();
  if (rev && (rev.type === 'cylinder' || rev.type === 'frustum')) {
    for (let i = 0; i < mainPolys.length; i++) {
      if (detectRing(mainPolys[i], xVerts)) ringPolyIdx.add(i);
    }
  }

  const linePos = [];
  mainPolys.forEach((pl, pi) => {
    if (ringPolyIdx.has(pi)) return;
    for (let i = 0; i < pl.length - 1; i++) {
      const i0 = pl[i];
      const i1 = pl[i + 1];
      if (isGeneratorSegment(i0, i1, rev, xVerts)) continue;
      const a = xVerts[i0];
      const b = xVerts[i1];
      if (!a || !b) continue;
      linePos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
  });
  if (rev?.bottom) pushCircleLines(linePos, rev.bottom);
  if (rev?.top) pushCircleLines(linePos, rev.top);

  // Billboard labels: geometry relative to centroid, anchor follows model transform.
  const labels = [];
  const labelNames = new Set([...labelPolyGroups.keys(), ...labelFaceGroups.keys()]);
  labelNames.forEach((name) => {
    const polys = labelPolyGroups.get(name) || [];
    const tris = labelFaceGroups.get(name) || [];
    const used = new Set();
    polys.forEach((pl) => pl.forEach((i) => used.add(i)));
    tris.forEach((t) => {
      used.add(t[0].v);
      used.add(t[1].v);
      used.add(t[2].v);
    });
    if (!used.size) return;
    let lx = 0;
    let ly = 0;
    let lz = 0;
    let n = 0;
    used.forEach((i) => {
      const p = xVerts[i];
      if (!p) return;
      lx += p[0];
      ly += p[1];
      lz += p[2];
      n += 1;
    });
    if (!n) return;
    lx /= n;
    ly /= n;
    lz /= n;
    const lLines = [];
    polys.forEach((pl) => {
      for (let i = 0; i < pl.length - 1; i++) {
        const a = xVerts[pl[i]];
        const b = xVerts[pl[i + 1]];
        if (!a || !b) continue;
        lLines.push(a[0] - lx, a[1] - ly, a[2] - lz, b[0] - lx, b[1] - ly, b[2] - lz);
      }
    });
    // Face edges as wire for filled label glyphs too.
    const lEdgeKeys = new Set();
    tris.forEach((t) => {
      const add = (i, j) => {
        if (i < 0 || j < 0) return;
        lEdgeKeys.add(i < j ? `${i},${j}` : `${j},${i}`);
      };
      add(t[0].v, t[1].v);
      add(t[1].v, t[2].v);
      add(t[2].v, t[0].v);
    });
    lEdgeKeys.forEach((k) => {
      const [i, j] = k.split(',').map(Number);
      const a = xVerts[i];
      const b = xVerts[j];
      if (!a || !b) return;
      lLines.push(a[0] - lx, a[1] - ly, a[2] - lz, b[0] - lx, b[1] - ly, b[2] - lz);
    });
    if (!lLines.length) return;
    labels.push({
      name,
      c: [lx, ly, lz],
      linePositions: new Float32Array(lLines),
      lineCount: lLines.length / 3,
    });
  });

  if (
    !pos.length &&
    !linePos.length &&
    !edgePos.length &&
    !labels.length &&
    !(rev && rev.type === 'sphere')
  ) {
    return null;
  }
  return {
    positions: new Float32Array(pos),
    normals: new Float32Array(nrm),
    count: pos.length / 3,
    drawRuns: drawRuns.length
      ? drawRuns
      : pos.length
        ? [{ start: 0, count: pos.length / 3, alpha: 1 }]
        : [],
    linePositions: new Float32Array(linePos),
    lineCount: linePos.length / 3,
    edgePositions: new Float32Array(edgePos),
    edgeCount: edgePos.length / 3,
    labels,
    rev: rev || null,
    silExact: 7,
  };
}

/** True only when GPU-ready typed arrays are intact (JSON round-trip destroys them). */
function meshCacheOk(m) {
  if (!m || m.silExact !== 7 || m.rev === undefined) return false;
  if (!Array.isArray(m.drawRuns)) return false;
  const hasSolid = m.count > 0;
  const hasLines = m.lineCount > 0;
  const hasEdges = m.edgeCount > 0;
  const hasLabels = !!(m.labels && m.labels.length);
  const hasRev = !!m.rev;
  if (!hasSolid && !hasLines && !hasEdges && !hasLabels && !hasRev) return false;
  if (
    hasSolid &&
    !(
      m.positions instanceof Float32Array &&
      m.normals instanceof Float32Array &&
      m.positions.length === m.count * 3 &&
      m.normals.length === m.count * 3
    )
  ) {
    return false;
  }
  if (
    hasLines &&
    !(m.linePositions instanceof Float32Array && m.linePositions.length === m.lineCount * 3)
  ) {
    return false;
  }
  if (
    hasEdges &&
    !(m.edgePositions instanceof Float32Array && m.edgePositions.length === m.edgeCount * 3)
  ) {
    return false;
  }
  if (hasLabels) {
    for (let i = 0; i < m.labels.length; i++) {
      const lab = m.labels[i];
      if (
        !(lab.linePositions instanceof Float32Array) ||
        lab.linePositions.length !== lab.lineCount * 3
      ) {
        return false;
      }
    }
  }
  return true;
}

export function ensureMesh(d) {
  if (!d) return null;
  if (meshCacheOk(d._mesh)) return d._mesh;
  // Drop JSON-revived / partial caches — must rebuild from objText.
  d._mesh = null;
  if (d.objText) {
    try {
      d._mesh = parseObj(d.objText);
      return d._mesh;
    } catch (e) {
      d._mesh = null;
      return null;
    }
  }
  return null;
}

const VS = `attribute vec3 aPos;attribute vec3 aNrm;uniform mat4 uMVP;uniform mat4 uModel;varying vec3 vN;void main(){vN=mat3(uModel)*aNrm;gl_Position=uMVP*vec4(aPos,1.0);}`;
const FS = `precision mediump float;varying vec3 vN;uniform vec3 uColor;uniform vec3 uLight;uniform float uAlpha;void main(){vec3 n=normalize(vN);float diff=max(dot(n,normalize(uLight)),0.0);float amb=0.28;gl_FragColor=vec4(uColor*(amb+diff*0.9),uAlpha);}`;
const VS_LINE = `attribute vec3 aPos;uniform mat4 uMVP;void main(){gl_Position=uMVP*vec4(aPos,1.0);}`;
const FS_LINE = `precision mediump float;uniform vec3 uColor;void main(){gl_FragColor=vec4(uColor,1.0);}`;

function compileProgram(gl, vsSrc, fsSrc, attribLocs) {
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
  const vs = sh(gl.VERTEX_SHADER, vsSrc);
  const fs = sh(gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  // Bind before link so mesh aNrm never aliases line aPos across draws.
  if (attribLocs) {
    Object.keys(attribLocs).forEach((name) => {
      gl.bindAttribLocation(p, attribLocs[name], name);
    });
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  return p;
}

function createProgram(gl) {
  return compileProgram(gl, VS, FS, { aPos: ATTR_POS, aNrm: ATTR_NRM });
}

function createLineProgram(gl) {
  return compileProgram(gl, VS_LINE, FS_LINE, { aPos: ATTR_POS });
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
 * Each mount gets a unique instance id — do NOT key by element id (editor + preview +
 * slide switches would kill each other's RAF and leave a dead canvas).
 */
export function mountModel3dViewer(host, d, opts = {}) {
  if (!host || !d) return () => {};
  const instanceId = `m3d_${++viewerSeq}_${d.id || 'x'}`;
  host.innerHTML = '';
  // Drop stale caches so rib-stripping / silhouette / wireframe / label / opacity fixes apply.
  if (d._mesh && d._mesh.silExact !== 7) d._mesh = null;
  const mesh = ensureMesh(d);
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;height:100%;position:relative;overflow:hidden;';
  const bg = d.objBgCleared ? 'transparent' : d.objBg || '#0f172a';
  wrap.style.background = bg;

  const hasSolid = !!(mesh && mesh.count > 0);
  const hasLines = !!(mesh && mesh.lineCount > 0);
  let hasEdges = !!(mesh && mesh.edgeCount > 0);
  const hasLabels = !!(mesh && mesh.labels && mesh.labels.length);
  const hasRev = !!(mesh && mesh.rev);
  if (!mesh || (!hasSolid && !hasLines && !hasEdges && !hasRev && !hasLabels)) {
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

  const interactive = !!opts.interactive;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = interactive
    ? 'width:100%;height:100%;display:block;pointer-events:auto;touch-action:none;cursor:grab;'
    : 'width:100%;height:100%;display:block;pointer-events:none;';
  if (interactive) {
    wrap.style.touchAction = 'none';
    wrap.setAttribute('data-model3d-viewer', '1');
    canvas.setAttribute('data-model3d-viewer', '1');
  }
  wrap.appendChild(canvas);
  host.appendChild(wrap);

  const gl =
    canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false }) ||
    canvas.getContext('experimental-webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl || (gl.isContextLost && gl.isContextLost())) {
    // Often transient after slide-switch context churn — caller remounts via slideKey.
    wrap.innerHTML =
      '<div style="color:#fff;padding:12px;font:12px sans-serif;opacity:.7">WebGL…</div>';
    return () => {
      host.innerHTML = '';
    };
  }

  // Cache while context is healthy — never query inside resize/draw (can return 0 after GL errors).
  const maxAttribs = Math.max(8, gl.getParameter(gl.MAX_VERTEX_ATTRIBS) | 0);

  const prog = hasSolid ? createProgram(gl) : null;
  // Always prepare line program when we have faces — wireframe toggle is live (no remount).
  const needLines = hasLines || hasEdges || hasRev || hasLabels || hasSolid;
  const lineProg = needLines ? createLineProgram(gl) : null;
  if ((hasSolid && !prog) || (needLines && !lineProg)) {
    wrap.innerHTML =
      '<div style="color:#fff;padding:12px;font:12px sans-serif">WebGL shader error</div>';
    return () => {
      host.innerHTML = '';
    };
  }

  let bufP = null;
  let bufN = null;
  let uMVP = null;
  let uModel = null;
  let uColor = null;
  let uLight = null;
  let uAlpha = null;
  if (hasSolid) {
    uMVP = gl.getUniformLocation(prog, 'uMVP');
    uModel = gl.getUniformLocation(prog, 'uModel');
    uColor = gl.getUniformLocation(prog, 'uColor');
    uLight = gl.getUniformLocation(prog, 'uLight');
    uAlpha = gl.getUniformLocation(prog, 'uAlpha');
  }

  let bufL = null;
  let bufE = null;
  let uLineMVP = null;
  let uLineColor = null;
  if (needLines) {
    uLineMVP = gl.getUniformLocation(lineProg, 'uMVP');
    uLineColor = gl.getUniformLocation(lineProg, 'uColor');
  }
  if (!hasEdges && hasSolid && mesh.count >= 3) {
    // Fallback wireframe from triangle soup if edge list missing.
    const ep = [];
    const p = mesh.positions;
    for (let i = 0; i + 8 < p.length; i += 9) {
      ep.push(p[i], p[i + 1], p[i + 2], p[i + 3], p[i + 4], p[i + 5]);
      ep.push(p[i + 3], p[i + 4], p[i + 5], p[i + 6], p[i + 7], p[i + 8]);
      ep.push(p[i + 6], p[i + 7], p[i + 8], p[i], p[i + 1], p[i + 2]);
    }
    if (ep.length) {
      mesh.edgePositions = new Float32Array(ep);
      mesh.edgeCount = ep.length / 3;
      hasEdges = true;
    }
  }
  const silScratch = hasRev ? new Float32Array(64 * 6) : null;
  let bufSil = null;
  let bufLabel = null;
  const EYE = [0, 0.05, 5.6];

  function deleteBuf(b) {
    if (b) {
      try {
        gl.deleteBuffer(b);
      } catch (_) {
        /* ignore */
      }
    }
    return null;
  }

  function makeBuf(data) {
    if (!data || !data.byteLength) return null;
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  }

  /** (Re)create all static GPU buffers — required after some canvas resizes wipe buffer storage. */
  function rebuildStaticBuffers() {
    bufP = deleteBuf(bufP);
    bufN = deleteBuf(bufN);
    bufL = deleteBuf(bufL);
    bufE = deleteBuf(bufE);
    bufSil = deleteBuf(bufSil);
    bufLabel = deleteBuf(bufLabel);
    disableAttribs(gl, maxAttribs);
    if (hasSolid && mesh.positions && mesh.normals) {
      bufP = makeBuf(mesh.positions);
      bufN = makeBuf(mesh.normals);
    }
    if (hasLines && mesh.linePositions) bufL = makeBuf(mesh.linePositions);
    if (hasEdges && mesh.edgePositions) bufE = makeBuf(mesh.edgePositions);
    if (hasRev) bufSil = gl.createBuffer();
    if (hasLabels) bufLabel = gl.createBuffer();
  }

  rebuildStaticBuffers();

  const st = {
    id: instanceId,
    elId: d.id,
    alive: true,
    raf: 0,
    t0: performance.now(),
    autoAngle: 0,
    dRef: d,
    color: hexRgb(d.objColor || '#6366f1'),
    userRx: 0,
    userRy: 0,
    userSpin: 0,
    dragging: false,
    dragMode: 'spin', // 'spin' = around object axis; 'orbit' = Rot Y
    lastX: 0,
    lastY: 0,
    ptrs: new Map(),
    dragPausedAuto: 0,
  };
  viewers.set(instanceId, st);

  function resize() {
    const w = Math.max(1, host.clientWidth | 0);
    const h = Math.max(1, host.clientHeight | 0);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      // Some drivers invalidate ARRAY_BUFFER storage on drawing-buffer resize.
      rebuildStaticBuffers();
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw(now) {
    if (!st.alive) return;
    if (gl.isContextLost && gl.isContextLost()) {
      st.alive = false;
      return;
    }
    resize();
    // Live element from React (pose / color) without remounting the GL context.
    const d0 = (typeof opts.getEl === 'function' && opts.getEl()) || st.dRef || d;
    st.dRef = d0 || d;
    wrap.style.background = d0.objBgCleared ? 'transparent' : d0.objBg || '#0f172a';
    st.color = hexRgb(d0.objColor || '#6366f1');
    const rx = ((+d0.objRotX || 0) + st.userRx) * DEG;
    const ry = ((+d0.objRotY || 0) + st.userRy) * DEG;
    let spin = ((+d0.objSpin || 0) + st.userSpin) * DEG;
    if (d0.objAutoRot && !st.dragging) {
      const speed = d0.objRotSpeed != null ? +d0.objRotSpeed : 1;
      if (speed > 0) {
        // Auto-spin around the object's own axis (innermost Ry).
        st.autoAngle = ((now - st.t0) / 1000) * speed * 36 * DEG;
      }
      spin += st.autoAngle;
    } else if (d0.objAutoRot && st.dragging) {
      spin += st.autoAngle;
    }
    // model = Ry(orbit) * Rx(tilt) * Ry(spin) — spin stays around the figure's axis when tilted.
    const tmp = new Float32Array(16);
    const model = new Float32Array(16);
    matMul(tmp, rotX(rx), rotY(spin));
    matMul(model, rotY(ry), tmp);
    // Mild perspective: farther camera + narrower FOV so cylinders stay cylindrical.
    const view = matId();
    lookAt(view, EYE, [0, 0, 0], [0, 1, 0]);
    const proj = matId();
    perspective(proj, 24 * DEG, canvas.width / Math.max(1, canvas.height), 0.1, 60);
    const vp = new Float32Array(16);
    matMul(vp, proj, view);
    const mvp = new Float32Array(16);
    matMul(mvp, vp, model);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    // Always start clean — leftover enabled attribs from the previous pass are what
    // trigger "Vertex buffer is not big enough" when line count > normals count.
    disableAttribs(gl, maxAttribs);

    // Wireframe: hide opaque fills (show edges instead), but ALWAYS keep translucent
    // sections — educational figures are often "каркас + полупрозрачное сечение".
    const wire = !!d0.objWireframe;
    const drawFill = hasSolid && prog;
    // Authored `l` polylines / labels / silhouettes always draw; face-edges only in wire mode.
    const drawWire = !!(lineProg && (hasLines || hasRev || hasLabels || (wire && hasEdges) || (wire && !hasSolid)));

    const solidVerts = Math.min(
      mesh.count | 0,
      (mesh.positions && (mesh.positions.length / 3) | 0) || 0,
      (mesh.normals && (mesh.normals.length / 3) | 0) || 0
    );

    if (drawFill && bufP && bufN && solidVerts > 0) {
      // Disable culling — OBJ winding is often inconsistent; pyramids vanished with CULL_FACE on.
      gl.disable(gl.CULL_FACE);
      gl.useProgram(prog);
      disableAttribs(gl, maxAttribs);
      bindAttrib(gl, ATTR_POS, bufP, 3);
      bindAttrib(gl, ATTR_NRM, bufN, 3);
      gl.uniformMatrix4fv(uMVP, false, mvp);
      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform3fv(uColor, st.color);
      gl.uniform3fv(uLight, [2.5, 3.5, 4.0]);
      const runs =
        Array.isArray(mesh.drawRuns) && mesh.drawRuns.length
          ? mesh.drawRuns
          : [{ start: 0, count: solidVerts, alpha: 1 }];
      // Opaque first (depth write on), then translucent with blending.
      const opaqueRuns = [];
      const glassRuns = [];
      for (let ri = 0; ri < runs.length; ri++) {
        const r = runs[ri];
        const a = r.alpha != null && Number.isFinite(r.alpha) ? r.alpha : 1;
        const start = Math.max(0, r.start | 0);
        const count = Math.min(r.count | 0, solidVerts - start);
        if (count <= 0) continue;
        if (a >= 0.999) opaqueRuns.push({ start, count, alpha: 1 });
        else if (a > 0.001) glassRuns.push({ start, count, alpha: a });
      }
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      // In wireframe mode skip opaque solids (edges replace them); glass still draws.
      if (!wire) {
        for (let i = 0; i < opaqueRuns.length; i++) {
          const r = opaqueRuns[i];
          gl.uniform1f(uAlpha, 1);
          gl.drawArrays(gl.TRIANGLES, r.start, r.count);
        }
      }
      if (glassRuns.length) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        for (let i = 0; i < glassRuns.length; i++) {
          const r = glassRuns[i];
          gl.uniform1f(uAlpha, r.alpha);
          gl.drawArrays(gl.TRIANGLES, r.start, r.count);
        }
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
      disableAttribs(gl, maxAttribs);
    }

    if (drawWire && lineProg) {
      gl.disable(gl.CULL_FACE);
      gl.useProgram(lineProg);
      gl.uniform3fv(uLineColor, st.color);
      const lineW = normObjLineWidth(d0);
      try {
        gl.lineWidth(Math.min(8, lineW));
      } catch (_) {
        /* browsers often clamp to 1 */
      }
      const mvpOff = new Float32Array(16);
      const drawLineBuf = (buf, data, count, mvpUse) => {
        const n = Math.min(count | 0, data ? (data.length / 3) | 0 : 0);
        if (!buf || n <= 0) return;
        gl.uniformMatrix4fv(uLineMVP, false, mvpUse);
        disableAttribs(gl, maxAttribs);
        bindAttrib(gl, ATTR_POS, buf, 3);
        gl.drawArrays(gl.LINES, 0, n);
        disableAttribs(gl, maxAttribs);
      };
      let silN = 0;
      if (hasRev && bufSil && silScratch) {
        silN = Math.min(
          fillRevolutionSilhouette(mesh.rev, model, EYE, silScratch, mvp) | 0,
          (silScratch.length / 3) | 0
        );
        if (silN > 0) {
          gl.bindBuffer(gl.ARRAY_BUFFER, bufSil);
          gl.bufferData(gl.ARRAY_BUFFER, silScratch.subarray(0, silN * 3), gl.DYNAMIC_DRAW);
        }
      }
      const drawSil = (m) => {
        if (silN <= 0 || !bufSil) return;
        gl.uniformMatrix4fv(uLineMVP, false, m);
        disableAttribs(gl, maxAttribs);
        bindAttrib(gl, ATTR_POS, bufSil, 3);
        gl.drawArrays(gl.LINES, 0, silN);
        disableAttribs(gl, maxAttribs);
      };
      const drawThick = (drawOnce) => {
        drawOnce(mvp);
        if (lineW <= 1.25) return;
        const r = (lineW - 1) * 0.5;
        const nPass = Math.min(12, Math.max(4, Math.ceil(lineW * 2)));
        for (let pi = 0; pi < nPass; pi++) {
          const a = (pi / nPass) * Math.PI * 2;
          mvpWithPixelOffset(mvpOff, mvp, Math.cos(a) * r, Math.sin(a) * r, canvas.width, canvas.height);
          drawOnce(mvpOff);
        }
      };
      drawThick((m) => {
        if (hasEdges && bufE && wire) drawLineBuf(bufE, mesh.edgePositions, mesh.edgeCount, m);
        if (hasLines && bufL) drawLineBuf(bufL, mesh.linePositions, mesh.lineCount, m);
        drawSil(m);
      });
    }

    // Label_* objects: anchor follows model pose, glyph always faces the camera.
    if (hasLabels && lineProg && bufLabel) {
      gl.disable(gl.CULL_FACE);
      gl.useProgram(lineProg);
      gl.uniform3fv(uLineColor, st.color);
      try {
        gl.lineWidth(Math.min(8, normObjLineWidth(d0)));
      } catch (_) {
        /* ignore */
      }
      const tmpW = new Float32Array(16);
      const mvpL = new Float32Array(16);
      for (let li = 0; li < mesh.labels.length; li++) {
        const lab = mesh.labels[li];
        const n = Math.min(lab.lineCount | 0, lab.linePositions ? (lab.linePositions.length / 3) | 0 : 0);
        if (n <= 0) continue;
        const anchor = xformPoint(model, lab.c);
        const B = billboardFacing(EYE, anchor);
        const T = matTranslate(anchor[0], anchor[1], anchor[2]);
        matMul(tmpW, T, B);
        matMul(mvpL, vp, tmpW);
        gl.uniformMatrix4fv(uLineMVP, false, mvpL);
        disableAttribs(gl, maxAttribs);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufLabel);
        gl.bufferData(gl.ARRAY_BUFFER, lab.linePositions, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(ATTR_POS);
        gl.vertexAttribPointer(ATTR_POS, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, n);
        disableAttribs(gl, maxAttribs);
      }
    }
  }

  function loop(now) {
    if (!st.alive) return;
    try {
      draw(now);
    } catch (err) {
      console.warn('[model3d draw]', err);
      st.alive = false;
      return;
    }
    if (!opts.still && st.alive) st.raf = requestAnimationFrame(loop);
  }
  // Always animate a bit so resize/redraw stays fresh; cheap when auto-rot off
  st.raf = requestAnimationFrame(loop);

  const ptrCleanups = [];
  if (interactive) {
    const eventX = (e) =>
      Number.isFinite(e.clientX) ? e.clientX : e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX;
    const eventY = (e) =>
      Number.isFinite(e.clientY) ? e.clientY : e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY;

    const avgPtrs = () => {
      let sx = 0;
      let sy = 0;
      let n = 0;
      st.ptrs.forEach((p) => {
        sx += p.x;
        sy += p.y;
        n += 1;
      });
      return n ? { x: sx / n, y: sy / n } : { x: st.lastX, y: st.lastY };
    };

    const zoneMode = (clientY) => {
      const rect = canvas.getBoundingClientRect();
      const h = Math.max(1, rect.height);
      const ny = (clientY - rect.top) / h;
      // Top / bottom band → orbit Rot Y; center → spin around object axis.
      if (ny < 0.28 || ny > 0.72) return 'orbit';
      return 'spin';
    };

    const resumeAuto = () => {
      if (st.dRef?.objAutoRot) {
        const speed = st.dRef.objRotSpeed != null ? +st.dRef.objRotSpeed : 1;
        if (speed > 0) {
          const now = performance.now();
          st.t0 = now - (st.autoAngle / (speed * 36 * DEG)) * 1000;
        }
      }
    };

    const onDown = (e) => {
      if (e.pointerType === 'mouse' && e.button != null && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const x = eventX(e) || 0;
      const y = eventY(e) || 0;
      st.ptrs.set(e.pointerId, { x, y });
      st.dragging = true;
      if (st.ptrs.size >= 2) {
        st.dragMode = 'orbit';
        const a = avgPtrs();
        st.lastX = a.x;
        st.lastY = a.y;
      } else {
        st.dragMode = zoneMode(y);
        st.lastX = x;
        st.lastY = y;
      }
      canvas.style.cursor = 'grabbing';
      try {
        canvas.setPointerCapture?.(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    };
    const onMove = (e) => {
      if (!st.ptrs.has(e.pointerId)) return;
      e.preventDefault();
      e.stopPropagation();
      const x = eventX(e);
      const y = eventY(e);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      st.ptrs.set(e.pointerId, { x, y });

      if (st.ptrs.size >= 2) {
        // Two fingers → rotate around Y (orbit).
        st.dragMode = 'orbit';
        const a = avgPtrs();
        const dx = a.x - st.lastX;
        st.lastX = a.x;
        st.lastY = a.y;
        st.userRy += dx * 0.45;
        return;
      }

      const dx = x - st.lastX;
      const dy = y - st.lastY;
      st.lastX = x;
      st.lastY = y;
      // Vertical always tilts (Rot X).
      st.userRx += dy * 0.45;
      st.userRx = Math.max(-89, Math.min(89, st.userRx));
      if (st.dragMode === 'orbit') st.userRy += dx * 0.45;
      else st.userSpin += dx * 0.45;
    };
    const onUp = (e) => {
      if (!st.ptrs.has(e.pointerId) && !st.dragging) return;
      st.ptrs.delete(e.pointerId);
      try {
        canvas.releasePointerCapture?.(e.pointerId);
      } catch (_) {
        /* ignore */
      }
      if (st.ptrs.size >= 2) {
        st.dragMode = 'orbit';
        const a = avgPtrs();
        st.lastX = a.x;
        st.lastY = a.y;
        return;
      }
      if (st.ptrs.size === 1) {
        const only = st.ptrs.values().next().value;
        st.dragMode = zoneMode(only.y);
        st.lastX = only.x;
        st.lastY = only.y;
        return;
      }
      st.dragging = false;
      st.dragMode = 'spin';
      canvas.style.cursor = 'grab';
      resumeAuto();
    };
    const stopBubble = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('click', stopBubble);
    canvas.addEventListener('mousedown', stopBubble);
    ptrCleanups.push(() => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('click', stopBubble);
      canvas.removeEventListener('mousedown', stopBubble);
    });
  }

  return () => {
    st.alive = false;
    if (st.raf) {
      cancelAnimationFrame(st.raf);
      st.raf = 0;
    }
    ptrCleanups.forEach((fn) => {
      try {
        fn();
      } catch (_) {
        /* ignore */
      }
    });
    destroyModel3dViewer(instanceId);
    // Drop the canvas first so the browser can reclaim the GL context before the
    // next slide remounts. Avoid loseContext() here — it races remount on slide
    // switch and left a dead/blank viewer when returning to the OBJ slide.
    host.innerHTML = '';
  };
}

/** Default palette pins: accent «15», dark bg «19». */
export const MODEL3D_COLOR_SCHEME = { col: 0, row: 4 };
export const MODEL3D_BG_SCHEME = { col: 0, row: 8 };

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
    objSpin: 0,
    objAutoRot: true,
    objRotSpeed: 1,
    objWireframe: false,
    /** Wireframe / edge / polyline stroke width in CSS px (multi-pass for WebGL1). */
    objLineWidth: 1.5,
    objColorScheme: { ...MODEL3D_COLOR_SCHEME },
    objBgScheme: { ...MODEL3D_BG_SCHEME },
    objColor: '#6366f1',
    objBg: '#0f172a',
    objBgOp: 1,
    objBgCleared: true,
    ...partial,
  };
}

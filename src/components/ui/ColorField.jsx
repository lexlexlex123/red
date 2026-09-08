import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import {
  SCHEME_TINT_LEVELS,
  colorFieldDisplay,
  getTheme,
  parseColorField,
  schemeSwatchColor,
  themeColors,
} from '../../editor/themes.js';

function hsv2rgb(h, s, v) {
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const map = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ][i];
  return map.map((c) => Math.round(c * 255));
}

function rgb2hex(r, g, b) {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function hex2hsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d + 6) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, mx ? d / mx : 0, mx];
}

/** Photoshop-style HSV ring + triangle (ported from v7.1 js/03-boot.js). */
function HsvWheel({ hex, onChange }) {
  const cvRef = useRef(null);
  const state = useRef({ hue: 210, sat: 0.65, val: 0.9, drag: null });
  const ringCache = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const PAD = 6;
  const INNER = 180;
  const SIZE = INNER + PAD * 2;
  const RING = 15;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const Ro = INNER / 2 - 2;
  const Ri = Ro - RING;
  const Tr = Ri - 5;

  function triVerts(hue) {
    const a0 = ((hue - 90) * Math.PI) / 180;
    return [0, 1, 2].map((i) => {
      const a = a0 + i * ((2 * Math.PI) / 3);
      return [cx + Tr * Math.cos(a), cy + Tr * Math.sin(a)];
    });
  }

  function triBaryAt(x, y, v0, v1, v2, denom) {
    const b0 = ((v1[1] - v2[1]) * (x - v2[0]) + (v2[0] - v1[0]) * (y - v2[1])) / denom;
    const b1 = ((v2[1] - v0[1]) * (x - v2[0]) + (v0[0] - v2[0]) * (y - v2[1])) / denom;
    return [b0, b1, 1 - b0 - b1];
  }

  function draw() {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const { hue, sat, val } = state.current;
    ctx.clearRect(0, 0, SIZE, SIZE);

    if (!ringCache.current) {
      const off = document.createElement('canvas');
      off.width = SIZE;
      off.height = SIZE;
      const offCtx = off.getContext('2d');
      const img = offCtx.createImageData(SIZE, SIZE);
      const data = img.data;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < Ri - 0.5 || d > Ro + 0.5) continue;
          const h = (((Math.atan2(dy, dx) * 180) / Math.PI) + 90 + 360) % 360;
          let alpha = 1;
          if (d < Ri + 0.5) alpha = d - (Ri - 0.5);
          else if (d > Ro - 0.5) alpha = Ro + 0.5 - d;
          alpha = Math.max(0, Math.min(1, alpha));
          const [r, g, b] = hsv2rgb(h, 1, 1);
          const idx = (y * SIZE + x) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = Math.round(alpha * 255);
        }
      }
      offCtx.putImageData(img, 0, 0);
      ringCache.current = off;
    }
    ctx.drawImage(ringCache.current, 0, 0);

    // Triangle with supersampling AA
    const [v0, v1, v2] = triVerts(hue);
    const denom = (v1[1] - v2[1]) * (v0[0] - v2[0]) + (v2[0] - v1[0]) * (v0[1] - v2[1]);
    if (Math.abs(denom) > 0.001) {
      const SS = 2;
      const w = SIZE * SS;
      const h = SIZE * SS;
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const offCtx = off.getContext('2d');
      const img = offCtx.createImageData(w, h);
      const data = img.data;
      const samp = [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
      ];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let cov = 0;
          for (let i = 0; i < 4; i++) {
            const [b0, b1, b2] = triBaryAt((x + samp[i][0]) / SS, (y + samp[i][1]) / SS, v0, v1, v2, denom);
            if (b0 >= 0 && b1 >= 0 && b2 >= 0) cov += 0.25;
          }
          if (cov <= 0) continue;
          const [b0, b1, b2] = triBaryAt((x + 0.5) / SS, (y + 0.5) / SS, v0, v1, v2, denom);
          const vv = b0 + b2;
          const ss = vv > 0.0001 ? b2 / vv : 0;
          const [r, g, b] = hsv2rgb(hue, ss, vv);
          const idx = (y * w + x) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = Math.round(cov * 255);
        }
      }
      offCtx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, 0, 0, SIZE, SIZE);
    }

    // Hue pill indicator
    const ha = ((hue - 90) * Math.PI) / 180;
    const half = (11 * Math.PI) / 180;
    const midR = (Ri + Ro) / 2;
    const thick = RING + 6;
    const [hr, hg, hb] = hsv2rgb(hue, 1, 1);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, midR, ha - half, ha + half);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = thick + 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, midR, ha - half, ha + half);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = thick + 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, midR, ha - half, ha + half);
    ctx.strokeStyle = `rgb(${hr},${hg},${hb})`;
    ctx.lineWidth = thick - 2;
    ctx.stroke();
    ctx.restore();

    // SV marker — barycentric: b0=white, b1=black, b2=hue
    const b2 = sat * val;
    const b0 = val * (1 - sat);
    const b1 = 1 - val;
    const px = b0 * v0[0] + b1 * v1[0] + b2 * v2[0];
    const py = b0 * v0[1] + b1 * v1[1] + b2 * v2[1];
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    const [cr, cg, cb] = hsv2rgb(hue, sat, val);
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = rgb2hex(cr, cg, cb);
    ctx.fill();
  }

  function emit() {
    const { hue, sat, val } = state.current;
    const [r, g, b] = hsv2rgb(hue, sat, val);
    onChangeRef.current?.(rgb2hex(r, g, b), null);
    draw();
  }

  function applyRing(x, y) {
    state.current.hue = (((Math.atan2(y - cy, x - cx) * 180) / Math.PI) + 90 + 360) % 360;
  }

  function applyTri(x, y) {
    const [v0, v1, v2] = triVerts(state.current.hue);
    const d = (v1[1] - v2[1]) * (v0[0] - v2[0]) + (v2[0] - v1[0]) * (v0[1] - v2[1]);
    if (Math.abs(d) < 0.001) return;
    let b0 = ((v1[1] - v2[1]) * (x - v2[0]) + (v2[0] - v1[0]) * (y - v2[1])) / d;
    let b1 = ((v2[1] - v0[1]) * (x - v2[0]) + (v0[0] - v2[0]) * (y - v2[1])) / d;
    let b2 = 1 - b0 - b1;
    b0 = Math.max(0, b0);
    b1 = Math.max(0, b1);
    b2 = Math.max(0, b2);
    const sum = b0 + b1 + b2;
    if (sum < 0.0001) return;
    b0 /= sum;
    b1 /= sum;
    b2 /= sum;
    const v = b0 + b2;
    state.current.sat = v > 0.0001 ? Math.max(0, Math.min(1, b2 / v)) : 0;
    state.current.val = Math.max(0, Math.min(1, v));
  }

  function hit(e) {
    const rect = cvRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * SIZE;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (state.current.drag === 'ring' || (!state.current.drag && dist >= Ri - 1 && dist <= Ro + 1)) {
      state.current.drag = 'ring';
      applyRing(x, y);
      emit();
      return;
    }
    if (state.current.drag === 'tri' || !state.current.drag) {
      const [v0, v1, v2] = triVerts(state.current.hue);
      const d = (v1[1] - v2[1]) * (v0[0] - v2[0]) + (v2[0] - v1[0]) * (v0[1] - v2[1]);
      if (Math.abs(d) < 0.001) return;
      const [b0, b1, b2] = triBaryAt(x, y, v0, v1, v2, d);
      if (state.current.drag === 'tri' || (b0 >= -0.02 && b1 >= -0.02 && b2 >= -0.02)) {
        state.current.drag = 'tri';
        applyTri(x, y);
        emit();
      }
    }
  }

  useEffect(() => {
    if (hex && /^#[0-9a-fA-F]{6}$/i.test(hex)) {
      const [h, s, v] = hex2hsv(hex);
      state.current.hue = h;
      state.current.sat = s;
      state.current.val = v;
    }
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  useEffect(() => {
    const onMove = (e) => {
      if (!state.current.drag) return;
      hit(e);
    };
    const onUp = () => {
      state.current.drag = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={cvRef}
      className="react-cp-wheel"
      width={SIZE}
      height={SIZE}
      onPointerDown={(e) => {
        e.preventDefault();
        hit(e);
      }}
    />
  );
}

/**
 * Color field + expandable panel matching v7.1 props (swatch, scheme code, grid, wheel).
 */
export default function ColorField({
  label,
  value = '#3b82f6',
  schemeRef = null,
  onChange,
  onClear,
  allowClear = true,
  clearGlyph = 'trash',
  clearTitle,
  /** Keep picker open (v7.1 drawing panel style). */
  embedded = false,
  /** Start with HSV wheel visible when embedded/open. */
  defaultWheelOpen = false,
}) {
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const theme = getTheme(appliedThemeIdx);
  const [open, setOpen] = useState(!!embedded);
  const [wheelOpen, setWheelOpen] = useState(!!(embedded || defaultWheelOpen));
  const [draft, setDraft] = useState(colorFieldDisplay(value, schemeRef));
  const [liveHex, setLiveHex] = useState(value && String(value).startsWith('#') ? value : '#3b82f6');

  useEffect(() => {
    if (embedded) setOpen(true);
  }, [embedded]);

  useEffect(() => {
    setDraft(colorFieldDisplay(value, schemeRef));
    if (value && String(value).startsWith('#')) setLiveHex(value);
  }, [value, schemeRef]);

  const swatches = useMemo(() => {
    if (!theme) return [];
    const nCols = themeColors(theme).length;
    const out = [];
    for (let row = 0; row < SCHEME_TINT_LEVELS.length; row++) {
      for (let col = 0; col < nCols; col++) {
        out.push({
          color: schemeSwatchColor(theme, col, row),
          col,
          row,
          key: `${col}-${row}`,
        });
      }
    }
    return out;
  }, [theme]);

  const isEmpty = !value || value === 'none' || value === 'transparent';
  const solid = !isEmpty && liveHex && String(liveHex).startsWith('#') ? liveHex : '#3b82f6';

  function pickScheme(color, sr) {
    onChange?.(color, sr);
    setDraft(colorFieldDisplay(color, sr));
    setLiveHex(color);
    if (!embedded) {
      setOpen(false);
      setWheelOpen(false);
    }
  }

  function pickCustom(hex) {
    setLiveHex(hex);
    setDraft(hex);
    onChange?.(hex, null);
  }

  function commitDraft() {
    const parsed = parseColorField(draft, theme);
    if (parsed) {
      if (parsed.schemeRef) pickScheme(parsed.color, parsed.schemeRef);
      else {
        pickCustom(parsed.color);
      }
    } else setDraft(colorFieldDisplay(value, schemeRef));
  }

  const showPanel = embedded || open;

  return (
    <div className={`react-color-field${embedded ? ' is-embedded' : ''}`}>
      {label ? <div className="react-color-field-label">{label}</div> : null}
      <div className="react-color-field-row">
        <button
          type="button"
          className={`react-color-field-swatch${isEmpty ? ' is-empty' : ''}`}
          style={isEmpty ? undefined : { background: solid }}
          title={label || 'Цвет'}
          onMouseDown={(e) => {
            e.preventDefault();
            if (embedded) {
              setWheelOpen((v) => !v);
              return;
            }
            setOpen((v) => {
              if (v) setWheelOpen(false);
              return !v;
            });
          }}
        />
        <input
          className="react-color-field-input"
          value={draft}
          placeholder="11 или #hex"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitDraft();
          }}
          spellCheck={false}
        />
        {allowClear ? (
          <button
            type="button"
            className="react-color-field-icon"
            title={clearTitle || (clearGlyph === 'x' ? 'Вернуть градиент' : 'Очистить')}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClear?.();
              setDraft('');
              setOpen(false);
              setWheelOpen(false);
            }}
          >
            {clearGlyph === 'x' ? (
              <span aria-hidden="true">✕</span>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
              </svg>
            )}
          </button>
        ) : null}
        {typeof window !== 'undefined' && window.EyeDropper ? (
          <button
            type="button"
            className="react-color-field-icon"
            title="Пипетка"
            onClick={async () => {
              try {
                const dropper = new window.EyeDropper();
                const result = await dropper.open();
                if (result?.sRGBHex) pickCustom(result.sRGBHex);
              } catch (e) {
                /* cancelled */
              }
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.12 3.12-1.41-1.42-1.42 1.42 1.41 1.41-6.6 6.6A2 2 0 0 0 5 16v3h3a2 2 0 0 0 1.42-.59l6.6-6.6 1.41 1.42 1.42-1.42-1.42-1.41 3.12-3.12a1 1 0 0 0 0-1.65z" />
            </svg>
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div className="react-cp-slot" onMouseDown={(e) => e.preventDefault()}>
          {swatches.length ? (
            <div className="react-cp-grid">
              {swatches.map((sw) => (
                <button
                  key={sw.key}
                  type="button"
                  className={`react-cp-cell${schemeRef && schemeRef.col === sw.col && schemeRef.row === sw.row ? ' sel' : ''}`}
                  style={{ background: sw.color }}
                  title={`${sw.col + 1}${sw.row + 1} · ${sw.color}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickScheme(sw.color, { col: sw.col, row: sw.row });
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="react-props-muted">Нет схемы — выберите тему в Дизайне</p>
          )}

          <button
            type="button"
            className="react-cp-custom-bar"
            style={{ background: solid }}
            title="Свой цвет"
            onMouseDown={(e) => {
              e.preventDefault();
              setWheelOpen((v) => !v);
            }}
          />

          {wheelOpen ? (
            <div className="react-cp-wheel-wrap">
              <HsvWheel hex={solid} onChange={pickCustom} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

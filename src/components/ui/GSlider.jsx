import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

const H = 28;
const R = 4;

function buildPath(w) {
  const width = Math.max(48, Math.round(w) || 100);
  const xL = 4;
  const xLi = 7;
  const xR = width - 4;
  const xRi = width - 7;
  const yTL = 12;
  const yTR = 1.5;
  const yB = 27.5;
  const yMid = 15;
  return (
    `M ${xLi} ${yTL}` +
    ` L ${xRi} ${yTR}` +
    ` Q ${xR} ${yTR} ${xR} ${yTR + R}` +
    ` L ${xR} ${yB - R}` +
    ` Q ${xR} ${yB} ${xRi} ${yB}` +
    ` L ${xLi} ${yB}` +
    ` Q ${xL} ${yB} ${xL} ${yB - R}` +
    ` L ${xL} ${yMid}` +
    ` Q ${xL} ${yTL} ${xLi} ${yTL}` +
    ` Z`
  );
}

function formatValue(value, min, max) {
  if (max <= 1 && min === 0) return String(Math.round(+value * 100) / 100);
  if (Math.abs(max - min) <= 30) return String(Math.round(+value * 10) / 10);
  return String(Math.round(+value));
}

function valueFromTrackX(clientX, el, min, max, step) {
  if (!el) return +min;
  const rect = el.getBoundingClientRect();
  const w = Math.max(40, rect.width);
  let ratio = (clientX - rect.left) / w;
  ratio = Math.max(0, Math.min(1, ratio));
  let v = +min + ratio * (+max - +min);
  const st = +step;
  if (st > 0) v = Math.round(v / st) * st;
  return Math.max(+min, Math.min(+max, v));
}

/**
 * Trapezoid scrubber matching legacy .color-bar-gslider-outer / .app-gslider-outer.
 * The whole bar including the value text is draggable; click without move edits.
 */
export default function GSlider({
  label,
  min = 0,
  max = 1,
  step = 0.05,
  value = 0,
  onChange,
  hidden = false,
  row2 = false,
  className = '',
  disabled = false,
  fadeTrack = false,
}) {
  const uid = useId().replace(/:/g, '');
  const outerRef = useRef(null);
  const dragRef = useRef(null);
  const [width, setWidth] = useState(100);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      setWidth(Math.max(48, Math.round(el.clientWidth) || 100));
    });
    ro.observe(el);
    setWidth(Math.max(48, Math.round(el.clientWidth) || 100));
    return () => ro.disconnect();
  }, []);

  const d = useMemo(() => buildPath(width), [width]);
  const frac = (() => {
    const lo = +min;
    const hi = +max;
    const v = +value;
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi === lo || !Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  })();
  const display = formatValue(value, min, max);
  const fillW = frac * width;

  if (hidden) return null;

  function commitDraft() {
    setEditing(false);
    if (disabled) return;
    const n = parseFloat(String(draft).replace(',', '.'));
    if (!Number.isFinite(n)) return;
    onChange?.(Math.max(+min, Math.min(+max, n)));
  }

  function onTrackPointerDown(e) {
    if (disabled || e.button !== 0 || editing) return;
    if (e.target.closest?.('.color-bar-gslider-edit')) return;
    e.preventDefault();
    dragRef.current = { id: e.pointerId, x0: e.clientX, scrubbing: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
  }

  function onTrackPointerMove(e) {
    const d0 = dragRef.current;
    if (!d0 || e.pointerId !== d0.id || disabled) return;
    const dx = e.clientX - d0.x0;
    if (!d0.scrubbing && Math.abs(dx) > 4) {
      d0.scrubbing = true;
      setScrubbing(true);
    }
    if (d0.scrubbing) onChange?.(valueFromTrackX(e.clientX, outerRef.current, min, max, step));
  }

  function endTrackDrag(e) {
    const d0 = dragRef.current;
    if (!d0 || e.pointerId !== d0.id) return;
    const wasScrub = d0.scrubbing;
    dragRef.current = null;
    setScrubbing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    if (!wasScrub && !disabled) {
      setDraft(display);
      setEditing(true);
    }
  }

  return (
    <div
      className={`color-bar-gslider-wrap${row2 ? ' color-bar-gslider-wrap--row2' : ''}${fadeTrack ? ' color-bar-gslider-wrap--fade' : ''}${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}
    >
      {label ? <label className="color-bar-gslider-lbl">{label}</label> : null}
      <div
        className={`color-bar-gslider-outer${scrubbing ? ' is-scrubbing' : ''}`}
        ref={outerRef}
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={endTrackDrag}
        onPointerCancel={endTrackDrag}
      >
        <svg className="color-bar-gslider-svg" viewBox={`0 0 ${width} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <clipPath id={`${uid}-clip`}>
              <path d={d} />
            </clipPath>
            {fadeTrack ? (
              <linearGradient
                id={`${uid}-fade`}
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2={width}
                y2="0"
              >
                <stop className="color-bar-gslider-fade-a" offset="0%" />
                <stop className="color-bar-gslider-fade-mid" offset="45%" />
                <stop className="color-bar-gslider-fade-b" offset="100%" />
              </linearGradient>
            ) : null}
          </defs>
          <path className="color-bar-gslider-bg-path" d={d} />
          <g clipPath={`url(#${uid}-clip)`}>
            <rect
              className="color-bar-gslider-fill"
              x="0"
              y="0"
              width={fillW}
              height={H}
              style={fadeTrack ? { fill: `url(#${uid}-fade)` } : undefined}
            />
          </g>
          <path className="color-bar-gslider-stroke" d={d} />
        </svg>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          tabIndex={-1}
          aria-label={label || 'slider'}
          onChange={(e) => {
            if (disabled) return;
            onChange?.(+e.target.value);
          }}
        />
        {editing && !disabled ? (
          <input
            className="color-bar-gslider-edit"
            style={{ left: 17 }}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDraft();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <span className={`color-bar-gslider-val${scrubbing ? ' is-scrubbing' : ''}`} title={disabled ? undefined : 'Перетащите полоску или кликните число'}>
            {display}
          </span>
        )}
      </div>
    </div>
  );
}

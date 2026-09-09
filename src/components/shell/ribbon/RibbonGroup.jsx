import React, { useId } from 'react';

/**
 * Tab / «пенёк»: узкий верх, широкое дно, S-бока.
 * Fill = --ribbon-edge. Soft INNER shade on top + sides only (no bottom edge).
 */
function rglblPath() {
  return (
    'M 20 0 ' +
    'L 80 0 ' +
    'C 90 0 95 2.5 96.5 8.5 ' +
    'C 98 14.5 100 17.2 100 20 ' +
    'L 0 20 ' +
    'C 0 17.2 2 14.5 3.5 8.5 ' +
    'C 5 2.5 10 0 20 0 ' +
    'Z'
  );
}

/** Open path: left side + top + right side — no bottom baseline stroke. */
function rglblShadePath() {
  return (
    'M 0 20 ' +
    'C 0 17.2 2 14.5 3.5 8.5 ' +
    'C 5 2.5 10 0 20 0 ' +
    'L 80 0 ' +
    'C 90 0 95 2.5 96.5 8.5 ' +
    'C 98 14.5 100 17.2 100 20'
  );
}

export default function RibbonGroup({ label, children }) {
  const uid = useId().replace(/:/g, '');
  const clipId = `rglbl-c-${uid}`;
  const blurId = `rglbl-b-${uid}`;
  const d = rglblPath();
  return (
    <div className="react-rg">
      {children}
      {label ? (
        <div className="react-rglbl" aria-hidden="true">
          <svg className="react-rglbl-shape" viewBox="0 0 100 20" preserveAspectRatio="none">
            <defs>
              <clipPath id={clipId}>
                <path d={d} />
              </clipPath>
              <filter id={blurId} x="-5%" y="-50%" width="110%" height="160%" colorInterpolationFilters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.9" />
              </filter>
            </defs>
            <path className="react-rglbl-fill" d={d} />
            {/* Inset shade: stroke only top+sides, clipped inside — no bottom darkening */}
            <g clipPath={`url(#${clipId})`}>
              <path
                d={rglblShadePath()}
                fill="none"
                stroke="rgba(15, 23, 42, 0.4)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#${blurId})`}
              />
            </g>
          </svg>
          <span className="react-rglbl-text">{label}</span>
        </div>
      ) : null}
    </div>
  );
}

/** Marker button icons for connector props (JSX — keep out of connectors.js). */

export const CONN_MARKER_SVGS = {
  none: (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <line x1="4" y1="14" x2="24" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <line x1="4" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M16.5,12.1 Q20,14 16.5,15.9 L13.2,17.8 Q10,19.5 10,17.2 L10,10.8 Q10,8.5 13.2,10.2 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  ),
  square: (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <line x1="4" y1="14" x2="18" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="18" y="9" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.25" />
    </svg>
  ),
  circle: (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <line x1="4" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="14" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.25" />
    </svg>
  ),
  bar: (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <line x1="4" y1="14" x2="22" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="7" x2="22" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  cross: (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <line x1="4" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="19" y1="8" x2="25" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="8" x2="19" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

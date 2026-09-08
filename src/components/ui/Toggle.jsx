import React from 'react';

/** Pill on/off switch (v7.1 `.tog`), muted fill. */
export default function Toggle({ checked, onChange, disabled, title, 'aria-label': ariaLabel }) {
  return (
    <span className={`react-tog${checked ? ' on' : ''}${disabled ? ' is-disabled' : ''}`}>
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="react-tog-track" />
      <span className="react-tog-thumb" />
    </span>
  );
}

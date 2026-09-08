import React from 'react';
import { RibbonIcon } from './icons.jsx';

export default function RibbonButton({
  label,
  title,
  icon,
  onClick,
  primary = false,
  open = false,
  on = false,
  className = '',
  children,
}) {
  const lines = String(label || '')
    .split('\n')
    .filter(Boolean);
  const aria = title || lines.join(' ') || label || '';
  return (
    <button
      type="button"
      className={`react-rb${primary ? ' pri' : ''}${open ? ' is-open' : ''}${on ? ' is-on' : ''}${className ? ` ${className}` : ''}`}
      aria-label={aria || undefined}
      aria-expanded={open || undefined}
      aria-pressed={on || undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children ||
        (icon != null && icon !== '' ? (
          <RibbonIcon
            id={typeof icon === 'number' || (typeof icon === 'string' && /^\d+$/.test(icon)) ? icon : undefined}
            name={typeof icon === 'string' && !/^\d+$/.test(icon) ? icon : undefined}
          />
        ) : null)}
      {lines.length ? (
        <span className="react-rbl">
          {lines.map((line, i) => (
            <React.Fragment key={i}>
              {i ? <br /> : null}
              {line}
            </React.Fragment>
          ))}
        </span>
      ) : null}
    </button>
  );
}

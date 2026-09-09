import React from 'react';
import AppIcon from '../../ui/AppIcon.jsx';

/** Chrome icon from catalog category «Приложение», by numeric id. Color / sw / fillOp are per-component. */
export function RibbonIcon({ id, name, size = 18, color = 'currentColor', sw = 1.8, fillOp = 0, className }) {
  const num = typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id)) ? id : typeof name === 'number' ? name : undefined;
  const key = num == null ? name : undefined;
  const isFormula =
    key === 'formula' ||
    num === 1038 ||
    num === '1038' ||
    String(id) === '1038' ||
    String(name) === 'formula';
  // Legacy ribbon used italic Georgia «f» — clearer than the stroke path.
  if (isFormula) {
    return (
      <span
        className={`react-rb-formula-ico${className ? ` ${className}` : ''}`}
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          fontStyle: 'italic',
          fontFamily: 'Georgia, "Times New Roman", Times, serif',
          fontSize: Math.round(size * 1.05),
          fontWeight: 700,
          lineHeight: 1,
          color,
          userSelect: 'none',
        }}
      >
        f
      </span>
    );
  }
  return <AppIcon id={num} name={key} size={size} color={color} sw={sw} fillOp={fillOp} className={className} />;
}

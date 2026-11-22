import React, { useMemo, useRef, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { versionAttr } from '../../editor/versions.js';
import { defaultLegoColor } from '../../editor/lego.js';
import { beginLegoPaletteDrag } from '../../editor/legoPaletteDrag.js';
import ColorField from '../ui/ColorField.jsx';
import LegoPieceGrid from '../ui/LegoPieceGrid.jsx';

export default function LegoPicker() {
  const panel = useUiStore((s) => s.panel);
  const setPanel = useUiStore((s) => s.setPanel);
  const lang = useUiStore((s) => s.lang);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const def = useMemo(() => defaultLegoColor(appliedThemeIdx), [appliedThemeIdx]);
  const [color, setColor] = useState(def.color);
  const [schemeRef, setSchemeRef] = useState(def.schemeRef);
  const ru = lang !== 'en';
  const openedAt = useRef(typeof performance !== 'undefined' ? performance.now() : Date.now());

  if (panel !== 'lego') return null;

  function dismissBackdrop(e) {
    if (e.target !== e.currentTarget) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - openedAt.current < 400) return;
    setPanel(null);
  }

  return (
    <div className="settings-backdrop" onPointerDown={dismissBackdrop} role="presentation">
      <div
        className="settings-modal shape-picker-modal picker-modal-v71 lego-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-label={ru ? 'Вставить LEGO' : 'Insert LEGO'}
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('LegoPicker')}
      >
        <h2>{ru ? 'LEGO-детали' : 'LEGO bricks'}</h2>
        <p className="react-props-muted" style={{ margin: '0 0 8px' }}>
          {ru ? 'Перетащите деталь на холст или нажмите, чтобы вставить.' : 'Drag a brick onto the slide, or click to insert.'}
        </p>
        <LegoPieceGrid
          color={color}
          ru={ru}
          onPointerDrag={(e, p) =>
            beginLegoPaletteDrag(e, p, { color, schemeRef, insertOnClick: true, closeOnDrag: true })
          }
        />
        <ColorField
          label={ru ? 'Цвет' : 'Color'}
          value={color}
          schemeRef={schemeRef}
          allowClear={false}
          onChange={(c, sr) => {
            setColor(c);
            setSchemeRef(sr || null);
          }}
        />
        <div className="picker-mfooter picker-mfooter-end">
          <div className="picker-mfooter-actions">
            <button type="button" className="react-props-btn" onClick={() => setPanel(null)}>
              {ru ? 'Отмена' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

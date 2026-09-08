import React, { useEffect, useRef, useState } from 'react';
import RibbonButton from './RibbonButton.jsx';
import { getImportExportActions } from './tabTools.js';
import { useUiStore } from '../../../stores/uiStore';

export default function RibbonImportExport({ compact = false }) {
  const lang = useUiStore((s) => s.lang);
  const io = getImportExportActions(lang);
  const wrapRef = useRef(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!exportOpen) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setExportOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [exportOpen]);

  return (
    <div className={`react-ribbon-io${compact ? ' is-compact' : ''}`}>
      <RibbonButton
        label={io.import.label}
        title={io.import.title}
        icon={io.import.icon}
        onClick={io.import.onClick}
      />
      <div className="react-export-wrap" ref={wrapRef}>
        <RibbonButton
          label={io.export.label}
          title={io.export.title}
          icon={io.export.icon}
          primary
          open={exportOpen}
          onClick={(e) => {
            e?.preventDefault?.();
            e?.stopPropagation?.();
            setExportOpen((v) => !v);
          }}
        />
        {exportOpen ? (
          <div className="react-export-menu" role="menu">
            {io.exportItems.map((item) => (
              <button
                key={item.ext}
                type="button"
                className="react-export-menu-item"
                role="menuitem"
                onClick={() => {
                  setExportOpen(false);
                  item.onClick();
                }}
              >
                <span className="react-export-menu-ext">{item.ext}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

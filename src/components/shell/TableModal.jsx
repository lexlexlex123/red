import React, { useEffect, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';

const GRID_R = 8;
const GRID_C = 10;

export default function TableModal() {
  const panel = useUiStore((s) => s.panel);
  const setPanel = useUiStore((s) => s.setPanel);
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);

  useEffect(() => {
    if (panel !== 'table') return undefined;
    setRows(3);
    setCols(4);
    const onKey = (e) => {
      if (e.key === 'Escape') setPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, setPanel]);

  if (panel !== 'table') return null;

  function clamp(n, lo, hi) {
    const v = Math.round(+n || 0);
    return Math.max(lo, Math.min(hi, v));
  }

  function insert(r, c) {
    const rr = clamp(r, 1, 30);
    const cc = clamp(c, 1, 30);
    editorApi.addTable(rr, cc);
    setPanel(null);
  }

  return (
    <div className="settings-backdrop" onClick={() => setPanel(null)} role="presentation">
      <div
        className="settings-modal picker-modal-v71 react-table-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="react-tbl-title"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('TableModal')}
      >
        <h2 id="react-tbl-title">{ru ? 'Вставить таблицу' : 'Insert table'}</h2>
        <div className="react-tbl-grid">
          {Array.from({ length: GRID_R * GRID_C }, (_, i) => {
            const r = Math.floor(i / GRID_C) + 1;
            const c = (i % GRID_C) + 1;
            const on = r <= rows && c <= cols;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={`react-tbl-cell${on ? ' on' : ''}`}
                aria-label={`${r} × ${c}`}
                onMouseEnter={() => {
                  setRows(r);
                  setCols(c);
                }}
                onClick={() => insert(r, c)}
              />
            );
          })}
        </div>
        <div className="react-tbl-lbl">
          {rows} × {cols}
        </div>
        <div className="react-tbl-nums">
          <label className="react-props-field react-props-field-compact">
            <span>{ru ? 'Строк' : 'Rows'}</span>
            <input
              type="number"
              min={1}
              max={30}
              value={rows}
              onChange={(e) => setRows(clamp(e.target.value, 1, 30))}
            />
          </label>
          <label className="react-props-field react-props-field-compact">
            <span>{ru ? 'Столбцов' : 'Columns'}</span>
            <input
              type="number"
              min={1}
              max={30}
              value={cols}
              onChange={(e) => setCols(clamp(e.target.value, 1, 30))}
            />
          </label>
        </div>
        <div className="theme-modal-footer">
          <button type="button" className="react-props-btn" onClick={() => setPanel(null)}>
            {ru ? 'Отмена' : 'Cancel'}
          </button>
          <button type="button" className="react-props-btn primary" onClick={() => insert(rows, cols)}>
            {ru ? 'Вставить' : 'Insert'}
          </button>
        </div>
      </div>
    </div>
  );
}

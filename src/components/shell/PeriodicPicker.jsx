import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import { PTE_ELEMENTS, PTE_CAT_COLOR } from '../../editor/periodicApplet.js';
import { versionAttr } from '../../editor/versions.js';

const TABLE_SLOTS = [
  [1, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 2],
  [3, 4, null, null, null, null, null, null, null, null, null, null, 5, 6, 7, 8, 9, 10],
  [11, 12, null, null, null, null, null, null, null, null, null, null, 13, 14, 15, 16, 17, 18],
  [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
  [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],
  [55, 56, 57, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86],
  [87, 88, 89, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118],
];

function matchesQuery(e, q) {
  if (!q) return true;
  return (
    e.s.toLowerCase().includes(q) ||
    e.ru.toLowerCase().includes(q) ||
    e.en.toLowerCase().includes(q) ||
    String(e.Z) === q
  );
}

function Cell({ e, onPick }) {
  const col = PTE_CAT_COLOR[e.c] || '#64748b';
  return (
    <button
      type="button"
      className="pte-cell"
      title={`${e.ru} (${e.en})`}
      style={{ borderColor: `${col}66`, background: `${col}22` }}
      onClick={() => onPick(e.s)}
    >
      <span className="pte-cell-z">{e.Z}</span>
      <span className="pte-cell-s" style={{ color: col }}>
        {e.s}
      </span>
    </button>
  );
}

export default function PeriodicPicker() {
  const open = useUiStore((s) => s.periodicPickerOpen);
  const close = useUiStore((s) => s.closePeriodicPicker);
  const mode = useUiStore((s) => s.periodicPickerMode);
  const elId = useUiStore((s) => s.periodicPickerElId);
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setQ('');
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const byZ = useMemo(() => {
    const m = {};
    PTE_ELEMENTS.forEach((e) => {
      m[e.Z] = e;
    });
    return m;
  }, []);

  const query = String(q || '').trim().toLowerCase();
  const filtered = useMemo(
    () => (query ? PTE_ELEMENTS.filter((e) => matchesQuery(e, query)) : null),
    [query]
  );

  function pick(symbol) {
    close();
    if (mode === 'reselect' && elId) editorApi.applyPeriodicSymbol(elId, symbol);
    else editorApi.insertPeriodicApplet(symbol);
  }

  if (!open) return null;

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal pte-picker-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('PeriodicPicker')}
      >
        <h2>{ru ? '🧪 Таблица Менделеева' : '🧪 Periodic table'}</h2>
        <div className="pte-picker-toolbar">
          <input
            ref={inputRef}
            type="search"
            className="pte-picker-search"
            placeholder={ru ? 'Поиск: Fe, железо, 26…' : 'Search: Fe, iron, 26…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="button" className="react-props-btn" onClick={close}>
            {ru ? 'Отмена' : 'Cancel'}
          </button>
        </div>
        <div className="pte-picker-scroll">
          {filtered ? (
            <div className="pte-search-grid">
              {filtered.map((e) => (
                <Cell key={e.s} e={e} onPick={pick} />
              ))}
            </div>
          ) : (
            <>
              <div className="pte-table-grid">
                {TABLE_SLOTS.flatMap((row, ri) =>
                  row.map((z, ci) => {
                    const e = z ? byZ[z] : null;
                    if (!e) return <div key={`${ri}-${ci}`} />;
                    return <Cell key={e.s} e={e} onPick={pick} />;
                  })
                )}
              </div>
              <div className="pte-series-label">{ru ? 'Лантаноиды' : 'Lanthanides'}</div>
              <div className="pte-series-grid">
                {PTE_ELEMENTS.filter((e) => e.Z >= 57 && e.Z <= 71).map((e) => (
                  <Cell key={e.s} e={e} onPick={pick} />
                ))}
              </div>
              <div className="pte-series-label">{ru ? 'Актиноиды' : 'Actinides'}</div>
              <div className="pte-series-grid">
                {PTE_ELEMENTS.filter((e) => e.Z >= 89 && e.Z <= 103).map((e) => (
                  <Cell key={e.s} e={e} onPick={pick} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

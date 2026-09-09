import React, { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';

/** Parse "1,3-5,8" → 0-based unique sorted indices. null if invalid. */
export function parseSlideRangeSpec(spec, total) {
  if (total <= 0) return [];
  const raw = String(spec == null ? '' : spec).trim();
  if (!raw) return null;
  const set = new Set();
  const parts = raw
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*[-–—:]\s*(\d+)$/);
    if (m) {
      let a = +m[1];
      let b = +m[2];
      if (!a || !b || a > total || b > total) return null;
      if (a > b) {
        const t = a;
        a = b;
        b = t;
      }
      for (let n = a; n <= b; n++) set.add(n - 1);
      continue;
    }
    if (!/^\d+$/.test(part)) return null;
    const n = +part;
    if (!n || n > total) return null;
    set.add(n - 1);
  }
  return Array.from(set).sort((a, b) => a - b);
}

export default function PngExportModal() {
  const open = useUiStore((s) => s.pngExportModalOpen);
  const close = useUiStore((s) => s.closePngExportModal);
  const lang = useUiStore((s) => s.lang);
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const total = slides?.length || 0;
  const [range, setRange] = useState('1');

  useEffect(() => {
    if (!open) return;
    setRange(String((cur | 0) + 1));
  }, [open, cur]);

  const idxs = useMemo(() => parseSlideRangeSpec(range, total), [range, total]);
  const ru = lang !== 'en';

  if (!open) return null;

  const preview =
    idxs && idxs.length
      ? (ru ? 'Будут экспортированы: ' : 'Will export: ') +
        idxs.map((i) => i + 1).join(', ') +
        ` (${idxs.length})`
      : ru
        ? 'Некорректный диапазон'
        : 'Invalid range';

  const confirm = () => {
    if (!idxs || !idxs.length) {
      useUiStore.getState().showToast(ru ? 'Некорректный диапазон' : 'Invalid range', 'err');
      return;
    }
    close();
    void editorApi.exportPNG(idxs);
  };

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal png-export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="png-export-title"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('PngExportModal')}
      >
        <h2 id="png-export-title">{ru ? 'Экспорт PNG' : 'Export PNG'}</h2>
        <p className="layout-modal-desc">
          {ru
            ? 'Укажите номера слайдов: один (3), диапазон (1-4), список (1,3,5) или комбинацию (1-3,5,8-10).'
            : 'Slide numbers: one (3), range (1-4), list (1,3,5), or mix (1-3,5,8-10).'}
        </p>
        <label className="png-export-label">{ru ? 'Слайды' : 'Slides'}</label>
        <input
          type="text"
          className="png-export-input"
          value={range}
          autoComplete="off"
          spellCheck={false}
          placeholder="1-3, 5"
          onChange={(e) => setRange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
          }}
        />
        <div className="png-export-quick">
          <button type="button" className="react-props-btn" onClick={() => setRange(String((cur | 0) + 1))}>
            {ru ? 'Текущий' : 'Current'}
          </button>
          <button type="button" className="react-props-btn" onClick={() => setRange(total ? `1-${total}` : '1')}>
            {ru ? 'Все' : 'All'}
          </button>
        </div>
        <div className={`png-export-preview${idxs?.length ? '' : ' is-err'}`}>{preview}</div>
        <div className="theme-modal-footer">
          <button type="button" onClick={close}>
            {ru ? 'Отмена' : 'Cancel'}
          </button>
          <button type="button" className="primary" onClick={confirm} disabled={!idxs?.length}>
            {ru ? 'Экспорт' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';

/** Base set + math/greek/arrows + geometry. */
export const SPECIAL_SYMBOLS = [
  '§',
  '¬',
  '⊂',
  '⊃',
  '⋮',
  '∨',
  '∧',
  '≡',
  '⊕',
  '˙',
  '·',
  '±',
  '≠',
  '≈',
  '°',
  '∠',
  '△',
  '⌀',
  'Σ',
  'π',
  'α',
  'β',
  'γ',
  '→',
  '←',
  '↑',
  '↓',
];

export default function SymbolsModal() {
  const open = useUiStore((s) => s.symbolsModalOpen);
  const close = useUiStore((s) => s.closeSymbolsModal);
  const lang = useUiStore((s) => s.lang);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    // Keep focus in the dialog so Esc / a11y work, without wiping the text caret save.
    requestAnimationFrame(() => panelRef.current?.focus?.({ preventScroll: true }));
  }, [open]);

  if (!open) return null;
  const ru = lang !== 'en';

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        ref={panelRef}
        className="settings-modal symbols-modal"
        role="dialog"
        aria-modal="true"
        aria-label={ru ? 'Спецсимволы' : 'Special symbols'}
        data-keep-text-edit="1"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="symbols-modal-head">
          <h2>{ru ? 'Спецсимволы' : 'Special symbols'}</h2>
          <button type="button" className="symbols-modal-close" title="Esc" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="symbols-modal-grid" role="list">
          {SPECIAL_SYMBOLS.map((ch) => (
            <button
              key={ch}
              type="button"
              className="symbols-modal-cell"
              role="listitem"
              title={ch}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editorApi.insertSpecialSymbol(ch)}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

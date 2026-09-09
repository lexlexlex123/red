import React, { useEffect, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import { formatSnapTime, idbListSnapshots } from '../../editor/versionHistory.js';

export default function HistoryModal() {
  const open = useUiStore((s) => s.historyModalOpen);
  const close = useUiStore((s) => s.closeHistoryModal);
  const lang = useUiStore((s) => s.lang);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    idbListSnapshots()
      .then((rows) => setList(rows || []))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;
  const ru = lang !== 'en';

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal history-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{ru ? 'История версий' : 'Version history'}</h2>
        <p className="layout-modal-desc">
          {ru
            ? 'Автоснимки презентации. Восстановление заменит текущий документ.'
            : 'Autosaved deck snapshots. Restore replaces the current document.'}
        </p>
        {loading ? (
          <p className="react-props-muted">{ru ? 'Загрузка…' : 'Loading…'}</p>
        ) : !list.length ? (
          <p className="react-props-muted">{ru ? 'Нет сохранённых версий' : 'No saved versions'}</p>
        ) : (
          <ul className="history-list">
            {list.map((snap, i) => (
              <li key={snap.id || i} className="history-item">
                <div>
                  <strong>{formatSnapTime(snap.ts, lang)}</strong>
                  <span className="react-props-muted"> · #{snap.id}</span>
                </div>
                <button type="button" className="react-props-btn" onClick={() => editorApi.restoreVersion(snap.id)}>
                  {ru ? 'Восстановить' : 'Restore'}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="theme-modal-footer">
          <button type="button" onClick={close}>
            {ru ? 'Закрыть' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

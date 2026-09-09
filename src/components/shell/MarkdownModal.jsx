import React, { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import { markdownToHtml, DEFAULT_MD } from '../../editor/markdown.js';

export default function MarkdownModal() {
  const open = useUiStore((s) => s.markdownModalOpen);
  const close = useUiStore((s) => s.closeMarkdownModal);
  const langUi = useUiStore((s) => s.lang);
  const selId = useSelectionStore((s) => s.selId);
  const cur = usePresentationStore((s) => s.cur);
  const slides = usePresentationStore((s) => s.slides);
  const [raw, setRaw] = useState(DEFAULT_MD);
  const [fs, setFs] = useState(16);
  const [color, setColor] = useState('#ffffff');
  const [editId, setEditId] = useState(null);
  const ru = langUi !== 'en';

  useEffect(() => {
    if (!open) return;
    const el = selId ? (slides[cur]?.els || []).find((e) => e && String(e.id) === String(selId)) : null;
    if (el && el.type === 'markdown') {
      setEditId(el.id);
      setRaw(el.mdRaw || '');
      setFs(el.mdFs || 16);
      setColor(el.mdColor || '#ffffff');
    } else {
      setEditId(null);
      setRaw(DEFAULT_MD);
      setFs(16);
      setColor('#ffffff');
    }
  }, [open, selId, slides, cur]);

  const preview = useMemo(() => markdownToHtml(raw), [raw]);

  if (!open) return null;

  function apply() {
    editorApi.applyMarkdown({
      id: editId,
      mdRaw: raw,
      mdFs: Math.max(10, Math.min(48, +fs || 16)),
      mdColor: color || '#ffffff',
    });
    close();
  }

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal react-md-modal react-md-modal-v71"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('MarkdownModal')}
      >
        <h2>{editId ? 'Markdown' : ru ? 'Вставить Markdown' : 'Insert Markdown'}</h2>
        <div className="md-modal-toolbar">
          <label className="md-modal-fs">
            <span>{ru ? 'Кегль' : 'Size'}</span>
            <input type="number" min="10" max="48" value={fs} onChange={(e) => setFs(+e.target.value)} />
          </label>
          <label className="md-modal-fs">
            <span>{ru ? 'Цвет' : 'Color'}</span>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#ffffff'}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
        </div>
        <div className="md-modal-split">
          <div className="md-modal-pane">
            <div className="md-modal-pane-label">{ru ? 'Исходник' : 'Source'}</div>
            <textarea
              className="react-md-ta"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              spellCheck={false}
              placeholder="# Title"
            />
          </div>
          <div className="md-modal-pane">
            <div className="md-modal-pane-label">{ru ? 'Превью' : 'Preview'}</div>
            <div
              className="react-md-preview md"
              style={{ color, fontSize: `${Math.max(12, fs)}px` }}
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        </div>
        <div className="theme-modal-footer" style={{ marginTop: 12 }}>
          <button type="button" className="react-props-btn" onClick={close}>
            {ru ? 'Отмена' : 'Cancel'}
          </button>
          <button type="button" className="react-props-btn primary" onClick={apply}>
            {editId ? (ru ? 'Сохранить' : 'Save') : ru ? 'Вставить' : 'Insert'}
          </button>
        </div>
      </div>
    </div>
  );
}

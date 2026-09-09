import React, { useEffect, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import { addSvgRecent, clearSvgRecent, loadSvgRecent } from '../../editor/svgRecent.js';

export default function SvgModal() {
  const open = useUiStore((s) => s.svgModalOpen);
  const close = useUiStore((s) => s.closeSvgModal);
  const lang = useUiStore((s) => s.lang);
  const selId = useSelectionStore((s) => s.selId);
  const cur = usePresentationStore((s) => s.cur);
  const slides = usePresentationStore((s) => s.slides);
  const [code, setCode] = useState('');
  const [w, setW] = useState(320);
  const [h, setH] = useState(240);
  const [editId, setEditId] = useState(null);
  const [recent, setRecent] = useState(() => loadSvgRecent());
  const [picked, setPicked] = useState(-1);
  const ru = lang !== 'en';

  useEffect(() => {
    if (!open) return;
    setRecent(loadSvgRecent());
    setPicked(-1);
    const el = selId ? (slides[cur]?.els || []).find((e) => e && String(e.id) === String(selId)) : null;
    if (el && el.type === 'svg' && !el._isDecor) {
      setEditId(el.id);
      setCode(el.svgContent || el.svg || '');
      setW(el.w || 320);
      setH(el.h || 240);
    } else {
      setEditId(null);
      setCode('');
      setW(320);
      setH(240);
    }
  }, [open, selId, slides, cur]);

  if (!open) return null;

  function loadFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg,image/svg+xml';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        setCode(text);
        setRecent(addSvgRecent(file.name.replace(/\.svg$/i, ''), text));
        setPicked(0);
        useUiStore.getState().showToast(ru ? 'SVG загружен' : 'SVG loaded', 'ok');
      } catch (e) {
        useUiStore.getState().showToast(ru ? 'Ошибка чтения' : 'Read error', 'err');
      }
    };
    input.click();
  }

  function apply() {
    const trimmed = String(code || '').trim();
    if (!trimmed) {
      useUiStore.getState().showToast(ru ? 'Вставьте SVG-код' : 'Paste SVG markup', 'warn');
      return;
    }
    if (!trimmed.includes('<svg')) {
      useUiStore.getState().showToast(ru ? 'Некорректный SVG' : 'Invalid SVG', 'warn');
      return;
    }
    setRecent(addSvgRecent(editId ? 'edited' : 'SVG', trimmed));
    editorApi.applySvg({
      id: editId,
      svgContent: trimmed,
      w: Math.max(40, +w || 320),
      h: Math.max(40, +h || 240),
    });
    close();
  }

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal svg-modal-v71"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 10 }}
        {...versionAttr('SvgModal')}
      >
        <h2>{editId ? (ru ? 'Редактировать SVG' : 'Edit SVG') : ru ? 'Вставить SVG' : 'Insert SVG'}</h2>
        <p className="react-props-muted" style={{ margin: 0 }}>
          {ru ? 'Вставьте разметку <svg>… или загрузите .svg файл.' : 'Paste <svg>… markup or load a .svg file.'}
        </p>

        {recent.length ? (
          <div className="svg-recent-wrap">
            <div className="svg-recent-hdr">
              <span className="fm-section-label" style={{ margin: 0 }}>
                {ru ? 'Недавние' : 'Recent'}
              </span>
              <button
                type="button"
                className="react-props-btn"
                style={{ fontSize: 10, padding: '2px 8px' }}
                onClick={() => {
                  setRecent(clearSvgRecent());
                  setPicked(-1);
                }}
              >
                {ru ? 'Очистить' : 'Clear'}
              </button>
            </div>
            <div className="svg-recent-grid">
              {recent.map((it, i) => (
                <button
                  key={`${it.name}-${i}-${(it.code || '').length}`}
                  type="button"
                  className={`svg-recent-cell${picked === i ? ' is-picked' : ''}`}
                  title={it.name}
                  onClick={() => {
                    setCode(it.code || '');
                    setPicked(i);
                  }}
                >
                  <span
                    className="svg-recent-thumb"
                    dangerouslySetInnerHTML={{ __html: it.code || '' }}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <textarea
          rows={10}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">…</svg>'
          style={{ width: '100%', fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, resize: 'vertical' }}
        />
        <div className="react-props-grid">
          <label className="react-props-field react-props-field-compact">
            <span>W</span>
            <input type="number" min="40" value={w} onChange={(e) => setW(+e.target.value || 320)} />
          </label>
          <label className="react-props-field react-props-field-compact">
            <span>H</span>
            <input type="number" min="40" value={h} onChange={(e) => setH(+e.target.value || 240)} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button type="button" onClick={loadFile}>
            {ru ? 'Файл…' : 'File…'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={close}>
              {ru ? 'Отмена' : 'Cancel'}
            </button>
            <button type="button" className="primary" onClick={apply}>
              {editId ? (ru ? 'Применить' : 'Apply') : ru ? 'Вставить' : 'Insert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import { isHttpUrl } from '../../editor/htmlFrame.js';
import { CODE_THEMES, syntaxHighlight } from '../../editor/codeHighlight.js';
import { getTheme } from '../../editor/themes.js';
import CodeEditorPane, { countCodeLines } from './CodeEditorPane.jsx';

export default function HtmlFrameModal() {
  const open = useUiStore((s) => s.htmlFrameModalOpen);
  const close = useUiStore((s) => s.closeHtmlFrameModal);
  const lang = useUiStore((s) => s.lang);
  const selId = useSelectionStore((s) => s.selId);
  const cur = usePresentationStore((s) => s.cur);
  const slides = usePresentationStore((s) => s.slides);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const [src, setSrc] = useState('');
  const [w, setW] = useState(640);
  const [h, setH] = useState(400);
  const [scroll, setScroll] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [editId, setEditId] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [glass, setGlass] = useState(false);
  const ru = lang !== 'en';

  useEffect(() => {
    if (!open) return;
    const themeObj = getTheme(appliedThemeIdx);
    const defTheme = themeObj && themeObj.dark === false ? 'light' : 'dark';
    const el = selId ? (slides[cur]?.els || []).find((e) => e && String(e.id) === String(selId)) : null;
    if (el && el.type === 'htmlframe') {
      setEditId(el.id);
      setSrc(el.hfSrc || '');
      setW(el.w || 640);
      setH(el.h || 400);
      setScroll(!!el.hfScroll);
      setChrome(el.hfChrome !== false);
      setTheme(defTheme);
      setGlass(false);
    } else {
      setEditId(null);
      setSrc('');
      setW(640);
      setH(400);
      setScroll(false);
      setChrome(true);
      setTheme(defTheme);
      setGlass(false);
    }
  }, [open, selId, slides, cur, appliedThemeIdx]);

  const T = CODE_THEMES[theme] || CODE_THEMES.dark;
  const hlLang = isHttpUrl(src) ? 'plain' : 'html';
  const preview = useMemo(() => syntaxHighlight(src, hlLang, theme), [src, hlLang, theme]);
  const lines = countCodeLines(src);

  if (!open) return null;

  function apply() {
    const trimmed = src.trim();
    if (!trimmed) {
      useUiStore.getState().showToast(ru ? 'Введите URL или HTML' : 'Enter URL or HTML', 'warn');
      return;
    }
    editorApi.applyHtmlFrame({
      id: editId,
      hfSrc: trimmed,
      w: Math.max(80, +w || 640),
      h: Math.max(60, +h || 400),
      hfScroll: scroll,
      hfChrome: chrome,
    });
    close();
  }

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal react-hf-modal react-hf-modal-v71"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('HtmlFrameModal')}
      >
        <h2>{editId ? (ru ? 'HTML-фрейм' : 'HTML frame') : ru ? 'HTML / Веб-страница' : 'HTML / Web page'}</h2>
        <div className="code-modal-toolbar">
          <span className="react-props-muted" style={{ margin: 0 }}>
            {ru ? 'URL или HTML' : 'URL or HTML'}
            {isHttpUrl(src)
              ? ru
                ? ' · ссылка'
                : ' · URL'
              : src.trim()
                ? ru
                  ? ' · HTML'
                  : ' · HTML'
                : ''}
          </span>
          <select value={theme} onChange={(e) => setTheme(e.target.value)} aria-label={ru ? 'Тема' : 'Theme'}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>
            {Object.keys(CODE_THEMES).map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
          <label className="react-props-check" style={{ margin: 0 }}>
            <input type="checkbox" checked={glass} onChange={(e) => setGlass(e.target.checked)} />
            {ru ? 'Стекло (blur)' : 'Glass blur'}
          </label>
          <span className="code-modal-lines">
            {lines} {ru ? 'стр.' : 'lines'}
          </span>
        </div>
        <CodeEditorPane
          value={src}
          onChange={setSrc}
          highlightHtml={preview}
          themeBg={T.bg}
          themeText={T.text}
          themeBorder={theme === 'light' ? '#d0d7de' : '#21262d'}
          themeGutter={T.cmt}
          glass={glass}
          placeholder={ru ? 'https://example.com или <!DOCTYPE html>…' : 'https://example.com or <!DOCTYPE html>…'}
        />
        <div className="hf-modal-footer">
          <label className="hf-size">
            <span>{ru ? 'Размер' : 'Size'}</span>
            <input type="number" min="80" max="2000" value={w} onChange={(e) => setW(+e.target.value)} />
            <span>×</span>
            <input type="number" min="60" max="2000" value={h} onChange={(e) => setH(+e.target.value)} />
            <span>px</span>
          </label>
          <label className="react-props-check" style={{ margin: 0 }}>
            <input type="checkbox" checked={scroll} onChange={(e) => setScroll(e.target.checked)} />
            {ru ? 'Скроллинг' : 'Scroll'}
          </label>
          <label className="react-props-check" style={{ margin: 0 }}>
            <input type="checkbox" checked={chrome} onChange={(e) => setChrome(e.target.checked)} />
            {ru ? 'Шапка' : 'Chrome'}
          </label>
          <span style={{ flex: 1 }} />
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

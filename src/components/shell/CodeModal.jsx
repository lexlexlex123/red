import React, { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import { CODE_LANGS, CODE_THEMES, syntaxHighlight, normalizeCodeLang } from '../../editor/codeHighlight.js';
import { getTheme } from '../../editor/themes.js';
import CodeEditorPane, { countCodeLines } from './CodeEditorPane.jsx';

export default function CodeModal() {
  const open = useUiStore((s) => s.codeModalOpen);
  const close = useUiStore((s) => s.closeCodeModal);
  const langUi = useUiStore((s) => s.lang);
  const selId = useSelectionStore((s) => s.selId);
  const cur = usePresentationStore((s) => s.cur);
  const slides = usePresentationStore((s) => s.slides);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('js');
  const [theme, setTheme] = useState('dark');
  const [glass, setGlass] = useState(false);
  const [fs, setFs] = useState(14);
  const [editId, setEditId] = useState(null);
  const ru = langUi !== 'en';

  useEffect(() => {
    if (!open) return;
    const themeObj = getTheme(appliedThemeIdx);
    const defTheme = themeObj && themeObj.dark === false ? 'light' : 'dark';
    const el = selId ? (slides[cur]?.els || []).find((e) => e && String(e.id) === String(selId)) : null;
    if (el && el.type === 'code') {
      setEditId(el.id);
      setCode(el.codeRaw || '');
      setLang(normalizeCodeLang(el.codeLang || 'js'));
      setTheme(el.codeTheme || defTheme);
      setGlass(!!el.codeGlass);
      setFs(el.codeFs || 14);
    } else {
      setEditId(null);
      setCode(ru ? '// код\nconsole.log("привет");' : '// code\nconsole.log("hello");');
      setLang('js');
      setTheme(defTheme);
      setGlass(false);
      setFs(14);
    }
  }, [open, selId, slides, cur, appliedThemeIdx, ru]);

  const T = CODE_THEMES[theme] || CODE_THEMES.dark;
  const preview = useMemo(() => syntaxHighlight(code, lang, theme), [code, lang, theme]);
  const lines = countCodeLines(code);

  if (!open) return null;

  function apply() {
    editorApi.applyCode({
      id: editId,
      codeRaw: code,
      codeLang: lang,
      codeTheme: theme,
      codeGlass: glass,
      codeFs: Math.max(10, Math.min(28, +fs || 14)),
    });
    close();
  }

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal react-code-modal react-code-modal-v71"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('CodeModal')}
      >
        <h2>{editId ? (ru ? 'Редактировать код' : 'Edit code') : ru ? 'Вставить код' : 'Insert code'}</h2>
        <div className="code-modal-toolbar">
          <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={ru ? 'Язык' : 'Language'}>
            {CODE_LANGS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <select value={theme} onChange={(e) => setTheme(e.target.value)} aria-label={ru ? 'Тема' : 'Theme'}>
            {Object.keys(CODE_THEMES).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <label className="react-props-check" style={{ margin: 0 }}>
            <input type="checkbox" checked={glass} onChange={(e) => setGlass(e.target.checked)} />
            {ru ? 'Стекло (blur)' : 'Glass blur'}
          </label>
          <label className="code-modal-fs">
            <span>pt</span>
            <input type="number" min="10" max="28" value={fs} onChange={(e) => setFs(+e.target.value || 14)} />
          </label>
          <span className="code-modal-lines">
            {lines} {ru ? 'стр.' : 'lines'}
          </span>
        </div>
        <CodeEditorPane
          value={code}
          onChange={setCode}
          highlightHtml={preview}
          themeBg={T.bg}
          themeText={T.text}
          themeBorder={theme === 'light' ? '#d0d7de' : '#21262d'}
          themeGutter={T.cmt}
          glass={glass}
          placeholder={ru ? 'Вставьте код…' : 'Paste your code…'}
        />
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

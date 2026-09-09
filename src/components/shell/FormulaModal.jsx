import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { editorApi } from '../../editor/editorApi';
import { renderFormulaSvg } from '../../editor/mathjax.js';
import {
  FORMULA_STRUCTS,
  FORMULA_SYMBOL_GROUPS,
  structLatexForMathLive,
  structLatexForTextarea,
} from '../../editor/formulaEditorData.js';
import { loadMathLive, mfHasSelection } from '../../editor/mathlive.js';
import { versionAttr } from '../../editor/versions.js';

const DEFAULT_LATEX = '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}';

function insertIntoTextarea(ta, text, setLatex) {
  if (!ta) return;
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? start;
  const next = ta.value.slice(0, start) + text + ta.value.slice(end);
  const ph = text.indexOf('\\placeholder{}');
  const caret = ph >= 0 ? start + ph + 1 : start + text.length;
  setLatex(next);
  requestAnimationFrame(() => {
    try {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = caret;
    } catch (e) {}
  });
}

function FormulaSvgPreview({ latex, className }) {
  const [html, setHtml] = useState('');
  useEffect(() => {
    let cancelled = false;
    const clean = String(latex || '').replace(/#\d/g, '\\square');
    renderFormulaSvg(clean)
      .then((svg) => {
        if (cancelled) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = svg;
        tmp.querySelectorAll('text').forEach((t) => {
          if (t.textContent.includes('square')) t.textContent = '□';
        });
        const svgEl = tmp.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxHeight = '36px';
          svgEl.style.width = 'auto';
          svgEl.style.height = '36px';
          svgEl.style.color = 'currentColor';
          svgEl.querySelectorAll('[fill]').forEach((n) => {
            if (n.getAttribute('fill') !== 'none') n.setAttribute('fill', 'currentColor');
          });
        }
        setHtml(tmp.innerHTML);
      })
      .catch(() => {
        if (!cancelled) setHtml('');
      });
    return () => {
      cancelled = true;
    };
  }, [latex]);
  if (!html) return <span className={className}>…</span>;
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function FormulaModal() {
  const open = useUiStore((s) => s.formulaModalOpen);
  const close = useUiStore((s) => s.closeFormulaModal);
  const lang = useUiStore((s) => s.lang);
  const selId = useSelectionStore((s) => s.selId);
  const cur = usePresentationStore((s) => s.cur);
  const slides = usePresentationStore((s) => s.slides);
  const [latex, setLatex] = useState(DEFAULT_LATEX);
  const [previewSvg, setPreviewSvg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [mfReady, setMfReady] = useState(false);
  const [mfFailed, setMfFailed] = useState(false);
  const [structOpen, setStructOpen] = useState(null);
  const [ddPos, setDdPos] = useState({ top: 0, left: 0 });

  const taRef = useRef(null);
  const mfHostRef = useRef(null);
  const mfRef = useRef(null);
  const syncingRef = useRef(false);
  const structBtnRefs = useRef([]);

  const ru = lang !== 'en';

  const openRef = useRef(false);
  const latexRef = useRef(latex);
  latexRef.current = latex;

  // Seed editor fields when modal opens (not on every slides tick)
  useEffect(() => {
    if (!open) {
      openRef.current = false;
      return;
    }
    const justOpened = !openRef.current;
    openRef.current = true;
    if (!justOpened) return;

    const el = selId ? (slides[cur]?.els || []).find((e) => e && String(e.id) === String(selId)) : null;
    if (el && el.type === 'formula') {
      setEditId(el.id);
      setLatex(el.formulaRaw || el.html || DEFAULT_LATEX);
      setPreviewSvg(el.formulaSvg || '');
    } else {
      setEditId(null);
      setLatex(DEFAULT_LATEX);
      setPreviewSvg('');
    }
    setErr('');
    setStructOpen(null);
    setMfReady(false);
    setMfFailed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open edge
  }, [open]);

  // MathLive host — resolve host at mount time; never clear ready on slides updates
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    let mfEl = null;
    let onInput = null;

    loadMathLive().then((ok) => {
      if (cancelled) return;
      const host = mfHostRef.current;
      if (!ok || !host) {
        setMfFailed(true);
        return;
      }
      host.innerHTML = '';
      mfEl = document.createElement('math-field');
      mfEl.id = 'fm-mf';
      mfEl.style.cssText =
        'width:100%;font-size:24px;min-height:54px;user-select:text;-webkit-user-select:text;caret-color:auto;';
      try {
        mfEl.style.setProperty('--selection-background-color', 'rgba(56,189,248,.35)');
        mfEl.style.setProperty('--contains-highlight-background-color', 'transparent');
        mfEl.style.setProperty('--placeholder-opacity', '0.3');
      } catch (e) {}
      try {
        Object.assign(mfEl, {
          mathModeSpace: '\\,',
          smartMode: false,
          virtualKeyboardMode: 'off',
          menuMode: 'none',
          readOnly: false,
        });
      } catch (e) {}
      host.appendChild(mfEl);
      mfRef.current = mfEl;
      try {
        mfEl.setValue(latexRef.current || '', { suppressChangeNotifications: true });
      } catch (e) {}
      try {
        mfEl.focus();
      } catch (e) {}
      onInput = () => {
        if (syncingRef.current) return;
        try {
          setLatex(mfEl.getValue('latex') || '');
        } catch (e) {}
      };
      mfEl.addEventListener('input', onInput);
      setMfReady(true);
      setMfFailed(false);
    });

    return () => {
      cancelled = true;
      if (mfEl && onInput) {
        try {
          mfEl.removeEventListener('input', onInput);
        } catch (e) {}
      }
      mfRef.current = null;
      const host = mfHostRef.current;
      if (host) host.innerHTML = '';
      setMfReady(false);
    };
  }, [open]);

  // Keep MathLive in sync when latex changes from textarea / inserts
  useEffect(() => {
    if (!open || !mfReady || !mfRef.current) return;
    const mf = mfRef.current;
    if (document.activeElement === mf) return;
    try {
      const curVal = mf.getValue('latex') || '';
      if (curVal !== latex) {
        syncingRef.current = true;
        mf.setValue(latex || '', { suppressChangeNotifications: true });
        syncingRef.current = false;
      }
    } catch (e) {
      syncingRef.current = false;
    }
  }, [latex, open, mfReady]);

  // MathJax SVG for commit + interim preview while MathLive loads
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!latex.trim()) {
        setPreviewSvg('');
        return;
      }
      setBusy(true);
      try {
        const svg = await renderFormulaSvg(latex.trim());
        if (!cancelled) {
          setPreviewSvg(svg);
          setErr('');
        }
      } catch (e) {
        if (!cancelled) {
          setErr(String(e.message || e));
          setPreviewSvg('');
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [latex, open]);

  useEffect(() => {
    if (structOpen == null) return undefined;
    const onDoc = (e) => {
      if (e.target?.closest?.('.fm-struct') || e.target?.closest?.('.fm-struct-dropdown')) return;
      setStructOpen(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [structOpen]);

  const insertSymbol = useCallback((symLatex) => {
    const mf = mfRef.current;
    if (mf && customElements.get('math-field')) {
      try {
        mf.focus();
        mf.insert(symLatex, { insertionMode: 'replaceSelection' });
        setLatex(mf.getValue('latex') || '');
        return;
      } catch (e) {}
    }
    insertIntoTextarea(taRef.current, symLatex, setLatex);
  }, []);

  const insertStruct = useCallback((template) => {
    const mf = mfRef.current;
    if (mf && customElements.get('math-field')) {
      try {
        mf.focus();
        const hasSel = mfHasSelection(mf);
        const ins = structLatexForMathLive(template, hasSel);
        try {
          mf.insert(ins, { insertionMode: 'replaceSelection', selectionMode: 'placeholder' });
        } catch (e) {
          let selText = '';
          if (hasSel) {
            try {
              selText = mf.getValue('selection', 'latex') || '';
            } catch (err) {}
          }
          mf.insert(structLatexForTextarea(template, selText), {
            insertionMode: 'replaceSelection',
            selectionMode: 'placeholder',
          });
        }
        setLatex(mf.getValue('latex') || '');
        setStructOpen(null);
        return;
      } catch (e) {}
    }
    const ta = taRef.current;
    if (ta) {
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? 0;
      const sel = start !== end ? ta.value.slice(start, end) : '';
      const ins = structLatexForTextarea(template, sel);
      insertIntoTextarea(ta, ins, setLatex);
    }
    setStructOpen(null);
  }, []);

  const openStructMenu = (si) => {
    const btn = structBtnRefs.current[si];
    if (!btn) {
      setStructOpen(si);
      return;
    }
    const r = btn.getBoundingClientRect();
    setDdPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 320) });
    setStructOpen((curSi) => (curSi === si ? null : si));
  };

  if (!open) return null;

  const activeStruct = structOpen != null ? FORMULA_STRUCTS[structOpen] : null;

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal formula-modal formula-modal-v71"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('FormulaModal')}
      >
        <h2>∑ {ru ? 'Редактор формулы' : 'Formula editor'}</h2>

        <div className="fm-section">
          <div className="fm-section-label">{ru ? 'Структуры' : 'Structures'}</div>
          <div className="fm-structs">
            {FORMULA_STRUCTS.map((s, si) => (
              <button
                key={s.titleRu}
                type="button"
                className={`fm-struct${structOpen === si ? ' is-open' : ''}`}
                title={ru ? s.titleRu : s.titleEn}
                ref={(el) => {
                  structBtnRefs.current[si] = el;
                }}
                onClick={() => openStructMenu(si)}
              >
                <FormulaSvgPreview latex={s.icon} className="fm-struct-preview" />
                <span className="fm-struct-title">
                  {ru ? s.titleRu : s.titleEn}
                  <svg width="7" height="5" viewBox="0 0 7 5" fill="currentColor" aria-hidden="true">
                    <path d="M0 0l3.5 5L7 0z" />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        </div>

        {activeStruct ? (
          <div
            className="fm-struct-dropdown"
            style={{ top: ddPos.top, left: ddPos.left }}
            role="menu"
          >
            {activeStruct.variants.map((v) => (
              <button
                key={v.latex + (v.labelRu || '')}
                type="button"
                className="fm-struct-variant"
                title={ru ? v.labelRu : v.labelEn}
                onClick={() => insertStruct(v.latex)}
              >
                <FormulaSvgPreview latex={v.latex} className="fm-variant-preview" />
                <span className="fm-variant-label">{ru ? v.labelRu : v.labelEn}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="fm-section">
          <div className="fm-section-label">{ru ? 'Символы' : 'Symbols'}</div>
          <div className="fm-syms">
            {FORMULA_SYMBOL_GROUPS.map((g) =>
              g.syms.map(([label, symLatex, title]) => (
                <button
                  key={`${g.nameRu}-${label}-${symLatex}`}
                  type="button"
                  className="fm-sym"
                  title={`${ru ? g.nameRu : g.nameEn}: ${title}`}
                  onClick={() => insertSymbol(symLatex)}
                >
                  {label}
                </button>
              ))
            )}
          </div>
        </div>

        <textarea
          ref={taRef}
          className="fm-latex"
          rows={2}
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          spellCheck={false}
        />

        <div className="fm-mathlive-wrap" onClick={() => mfRef.current?.focus?.()}>
          {!mfReady ? (
            <div className="fm-mf-placeholder fm-mf-fallback">
              {previewSvg ? (
                <div
                  className="fm-mj-preview"
                  style={{ color: 'var(--text)' }}
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                />
              ) : (
                <span>
                  <span className="fm-spin">⟳</span>{' '}
                  {mfFailed
                    ? ru
                      ? 'Правьте LaTeX выше — визуальный редактор недоступен'
                      : 'Edit LaTeX above — visual editor unavailable'
                    : ru
                      ? 'Загрузка редактора формул…'
                      : 'Loading formula editor…'}
                </span>
              )}
            </div>
          ) : null}
          <div
            ref={mfHostRef}
            className="fm-mf-host"
            style={{ display: mfReady ? 'block' : 'none' }}
          />
        </div>

        {err ? <div className="fm-error">{ru ? 'Ошибка: ' : 'Error: '}{err}</div> : null}

        <p className="fm-hint">
          {ru
            ? 'Несколько функций: структура «Система ур-й». Ограничение области: через запятую, например y = x^2, x > 0'
            : 'Several functions: use the Cases structure. Domain limits: comma, e.g. y = x^2, x > 0'}
        </p>

        <div className="fm-footer">
          <div className="fm-footer-actions">
            <button type="button" className="react-props-btn" onClick={close}>
              {ru ? 'Отмена' : 'Cancel'}
            </button>
            <button
              type="button"
              className="primary"
              disabled={!previewSvg || busy}
              onClick={() =>
                void editorApi.commitFormula({
                  latex: latex.trim(),
                  svg: previewSvg,
                  id: editId,
                })
              }
            >
              {editId ? (ru ? 'Применить' : 'Apply') : ru ? 'Вставить' : 'Insert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

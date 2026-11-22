import React, { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { editorApi } from '../../editor/editorApi';
import ColorField from '../ui/ColorField.jsx';
import {
  DEFAULT_LINK_HOVER,
  LINK_TYPE_OPTIONS,
  linkTypeFromHref,
  peekInlineLinkSelection,
  readGroupLink,
  resolveSlideLinkIndex,
  slideDisplayTitle,
} from '../../editor/links.js';

export default function LinkModal() {
  const open = useUiStore((s) => s.linkModalOpen);
  const close = useUiStore((s) => s.closeLinkModal);
  const lang = useUiStore((s) => s.lang);
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const selId = useSelectionStore((s) => s.selId);
  const el = useMemo(() => {
    const list = slides[cur]?.els || [];
    return list.find((e) => e && String(e.id) === String(selId)) || null;
  }, [slides, cur, selId]);

  const [type, setType] = useState('url');
  const [url, setUrl] = useState('');
  const [target, setTarget] = useState('_blank');
  const [slideIdx, setSlideIdx] = useState(0);
  const [hover, setHover] = useState(DEFAULT_LINK_HOVER);
  const [hoverScheme, setHoverScheme] = useState(null);

  useEffect(() => {
    if (!open || !el) return;
    const els = slides[cur]?.els || [];
    const inline = peekInlineLinkSelection();
    const link = inline?.existingHref || readGroupLink(el, els, 'link');
    const lt = linkTypeFromHref(link);
    setType(lt);
    setUrl(lt === 'url' ? link || '' : '');
    setTarget(
      inline?.existingHref
        ? inline.existingTarget || '_blank'
        : readGroupLink(el, els, 'linkt') || '_blank'
    );
    setHover(inline?.existingHover || el.linkHover || DEFAULT_LINK_HOVER);
    setHoverScheme(inline?.existingHoverScheme || el.linkHoverScheme || null);
    if (lt === 'slide') {
      const si = resolveSlideLinkIndex(link, cur, slides);
      setSlideIdx(si != null ? si : cur);
    } else {
      setSlideIdx(cur);
    }
  }, [open, el, slides, cur]);

  if (!open) return null;
  const ru = lang !== 'en';
  const inlineSel = peekInlineLinkSelection();

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal link-modal"
        role="dialog"
        aria-modal="true"
        data-keep-text-edit="1"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{ru ? 'Ссылка' : 'Link'}</h2>
        {!el ? (
          <p className="react-props-muted">{ru ? 'Выберите объект' : 'Select an element'}</p>
        ) : (
          <>
            {inlineSel ? (
              <p className="react-props-muted">
                {ru
                  ? 'На выделенный фрагмент текста (в т.ч. в ячейке таблицы)'
                  : 'Applies to the selected text (including table cells)'}
              </p>
            ) : null}
            <label className="react-props-field">
              <span>{ru ? 'Тип' : 'Type'}</span>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {LINK_TYPE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {ru ? o.labelRu : o.labelEn}
                  </option>
                ))}
              </select>
            </label>

            {type === 'url' ? (
              <>
                <label className="react-props-field">
                  <span>URL</span>
                  <input
                    type="text"
                    value={url}
                    placeholder="https://…"
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </label>
                <label className="react-props-field">
                  <span>{ru ? 'Открывать' : 'Target'}</span>
                  <select value={target} onChange={(e) => setTarget(e.target.value)}>
                    <option value="_blank">{ru ? 'В новой вкладке' : 'New tab'}</option>
                    <option value="_self">{ru ? 'В этой вкладке' : 'Same tab'}</option>
                  </select>
                </label>
              </>
            ) : null}

            {type === 'slide' ? (
              <div className="link-slide-list">
                {slides.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`link-slide-item${i === slideIdx ? ' on' : ''}`}
                    onClick={() => setSlideIdx(i)}
                  >
                    {i + 1}. {slideDisplayTitle(s, i)}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="react-props-field">
              <span>{ru ? 'Цвет при наведении' : 'Hover color'}</span>
              <ColorField
                value={hover}
                schemeRef={hoverScheme}
                onChange={(c, sr) => {
                  setHover(c);
                  setHoverScheme(sr ?? null);
                }}
              />
              <p className="react-props-muted" style={{ marginTop: 4 }}>
                {ru
                  ? 'Обычный цвет = цвет текста. Посещённые без синего. Палитра — код из двух цифр.'
                  : 'Normal color matches text. No visited blue. Palette uses a two-digit code.'}
              </p>
            </div>

            <div className="theme-modal-footer">
              <button type="button" onClick={close}>
                {ru ? 'Отмена' : 'Cancel'}
              </button>
              <button type="button" onClick={() => editorApi.removeLink()}>
                {ru ? 'Убрать' : 'Remove'}
              </button>
              <button
                type="button"
                className="primary"
                onClick={() =>
                  editorApi.applyLink({
                    type,
                    url,
                    target,
                    slideIdx,
                    hover,
                    hoverScheme,
                  })
                }
              >
                {ru ? 'Применить' : 'Apply'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

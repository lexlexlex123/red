import React, { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { editorApi } from '../../editor/editorApi';
import {
  LINK_TYPE_OPTIONS,
  linkTypeFromHref,
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

  useEffect(() => {
    if (!open || !el) return;
    const els = slides[cur]?.els || [];
    const link = readGroupLink(el, els, 'link');
    const lt = linkTypeFromHref(link);
    setType(lt);
    setUrl(lt === 'url' ? link || '' : '');
    setTarget(readGroupLink(el, els, 'linkt') || '_blank');
    if (lt === 'slide') {
      const si = resolveSlideLinkIndex(link, cur, slides);
      setSlideIdx(si != null ? si : cur);
    } else {
      setSlideIdx(cur);
    }
  }, [open, el, slides, cur]);

  if (!open) return null;
  const ru = lang !== 'en';

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal link-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{ru ? 'Ссылка' : 'Link'}</h2>
        {!el ? (
          <p className="react-props-muted">{ru ? 'Выберите объект' : 'Select an element'}</p>
        ) : (
          <>
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

import React, { useEffect, useMemo, useRef } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import { RibbonIcon } from './ribbon/icons.jsx';
import { APP_CHROME } from '../../editor/app-icons-data.js';

export default function FindBar() {
  const open = useUiStore((s) => s.findOpen);
  const query = useUiStore((s) => s.findQuery);
  const replace = useUiStore((s) => s.findReplace);
  const hit = useUiStore((s) => s.findHit);
  const focusSeq = useUiStore((s) => s.findFocusSeq);
  const focusReplace = useUiStore((s) => s.findFocusReplace);
  const lang = useUiStore((s) => s.lang);
  const slides = usePresentationStore((s) => s.slides);
  const inputRef = useRef(null);
  const replaceRef = useRef(null);
  const ru = lang !== 'en';

  const hits = useMemo(() => editorApi.collectFindHits(query), [query, slides]);
  const total = hits.length;
  const shown = hit < 0 ? 0 : hit + 1;

  useEffect(() => {
    if (!open) return undefined;
    const el = focusReplace ? replaceRef.current : inputRef.current;
    if (!el) return undefined;
    el.focus();
    el.select();
    return undefined;
  }, [open, focusSeq, focusReplace]);

  if (!open) return null;

  const onFindKey = (e) => {
    if (e.key === 'Enter' || e.key === 'F3') {
      e.preventDefault();
      e.stopPropagation();
      editorApi.findStep(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editorApi.closeFind();
    }
  };

  const onReplaceKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      editorApi.replaceFind();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editorApi.closeFind();
    }
  };

  return (
    <div className="find-bar" role="search" {...versionAttr('FindBar')}>
      <div className="find-bar-row">
        <span className="find-bar-ico" aria-hidden="true">
          <RibbonIcon id={APP_CHROME.search} size={14} />
        </span>
        <input
          ref={inputRef}
          className="find-bar-input"
          value={query}
          onChange={(e) => useUiStore.getState().setFindQuery(e.target.value)}
          onKeyDown={onFindKey}
          placeholder={ru ? 'Поиск по слайдам…' : 'Find in slides…'}
          aria-label={ru ? 'Поиск по слайдам' : 'Find in slides'}
        />
        <span className="find-bar-count">
          {query.trim() ? (total ? `${shown}/${total}` : ru ? 'нет' : 'none') : ''}
        </span>
        <button
          type="button"
          className="find-bar-btn"
          title={ru ? 'Назад (Shift+F3)' : 'Previous (Shift+F3)'}
          onClick={() => editorApi.findStep(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="find-bar-btn"
          title={ru ? 'Далее (F3)' : 'Next (F3)'}
          onClick={() => editorApi.findStep(1)}
        >
          ↓
        </button>
        <button
          type="button"
          className="find-bar-btn find-bar-close"
          title={ru ? 'Закрыть (Esc)' : 'Close (Esc)'}
          onClick={() => editorApi.closeFind()}
        >
          ×
        </button>
      </div>
      <div className="find-bar-row">
        <input
          ref={replaceRef}
          className="find-bar-input"
          value={replace}
          onChange={(e) => useUiStore.getState().setFindReplace(e.target.value)}
          onKeyDown={onReplaceKey}
          placeholder={ru ? 'Заменить на…' : 'Replace with…'}
          aria-label={ru ? 'Заменить на' : 'Replace with'}
        />
        <button
          type="button"
          className="find-bar-btn find-bar-btn-text"
          title={ru ? 'Заменить текущее (Enter)' : 'Replace current (Enter)'}
          onClick={() => editorApi.replaceFind()}
        >
          {ru ? 'Заменить' : 'Replace'}
        </button>
        <button
          type="button"
          className="find-bar-btn find-bar-btn-text"
          title={ru ? 'Заменить все' : 'Replace all'}
          onClick={() => editorApi.replaceAllFind()}
        >
          {ru ? 'Все' : 'All'}
        </button>
      </div>
    </div>
  );
}

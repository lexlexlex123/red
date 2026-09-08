import React, { useMemo } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useUiStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../stores/historyStore';
import { editorApi } from '../../editor/editorApi';
import {
  TRANSITION_DEFS,
  TRANS_DUR_OPTIONS,
  transitionDef,
  effectiveTrans,
} from '../../editor/transitions.js';

export default function TransitionsPanel({ embedded = false }) {
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const globalTrans = usePresentationStore((s) => s.globalTrans);
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const slide = slides[cur] || {};
  const activeId = effectiveTrans(slide, globalTrans);
  const def = transitionDef(activeId);
  const dur = slide.transDur != null && +slide.transDur > 0 ? +slide.transDur : 500;

  const hint = useMemo(
    () => (ru ? def.descRu : def.descEn),
    [def, ru]
  );

  return (
    <section
      className={`react-props-section${embedded ? ' react-props-section-embedded' : ''}`}
      aria-label={ru ? 'Переход' : 'Transition'}
    >
      <div className="react-props-hdr">{ru ? (embedded ? 'переход' : 'переходы') : (embedded ? 'transition' : 'transitions')}</div>

      <div className="slide-trans-grid">
        {TRANSITION_DEFS.map((t) => {
          const label = ru ? t.nameRu : t.nameEn;
          const active = activeId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`trans-btn${active ? ' active' : ''}`}
              title={ru ? t.descRu : t.descEn}
              onClick={() => editorApi.setSlideTrans(t.id)}
            >
              <span
                className="trans-btn-icon"
                dangerouslySetInnerHTML={{ __html: t.icon }}
              />
              <span className="trans-btn-label">{label}</span>
            </button>
          );
        })}
      </div>

      <p className="react-trans-hint">{hint}</p>

      {!embedded ? (
        <>
          <label className="react-props-field">
            <span>{ru ? 'Длительность' : 'Duration'}</span>
            <select
              value={String(dur)}
              onChange={(e) => editorApi.setTransitionDur(+e.target.value)}
            >
              {TRANS_DUR_OPTIONS.map((ms) => (
                <option key={ms} value={ms}>
                  {ms === 0 ? (ru ? 'Мгновенно' : 'Instant') : `${ms} ms`}
                </option>
              ))}
            </select>
          </label>

          <div className="react-props-actions">
            <button
              type="button"
              className="react-props-btn"
              onClick={() => editorApi.applyTransitionToAll(activeId)}
            >
              {ru ? 'Ко всем слайдам' : 'Apply to all'}
            </button>
            <button
              type="button"
              className="react-props-btn react-props-btn-ghost"
              onClick={() => {
                useHistoryStore.getState().push();
                usePresentationStore.getState().setGlobalTrans(activeId);
                useUiStore
                  .getState()
                  .showToast(ru ? 'Задан как переход по умолчанию' : 'Set as default transition', 'ok');
              }}
            >
              {ru ? 'По умолчанию' : 'Make default'}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

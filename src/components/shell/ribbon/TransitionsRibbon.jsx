import React from 'react';
import { editorApi } from '../../../editor/editorApi';
import { usePresentationStore } from '../../../stores/presentationStore';
import { useUiStore } from '../../../stores/uiStore';
import {
  TRANSITION_DEFS,
  TRANS_RIBBON_DURS,
  transitionDef,
  effectiveTrans,
} from '../../../editor/transitions.js';
import { versionAttr } from '../../../editor/versions.js';
import RibbonGroup from './RibbonGroup.jsx';

export default function TransitionsRibbon() {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const globalTrans = usePresentationStore((s) => s.globalTrans);
  const slide = slides[cur] || {};
  const activeId = effectiveTrans(slide, globalTrans);
  const def = transitionDef(activeId);
  const dur = slide.transDur != null && +slide.transDur > 0 ? +slide.transDur : 500;
  const durOpts = TRANS_RIBBON_DURS.some((d) => d.ms === dur)
    ? TRANS_RIBBON_DURS
    : [{ ms: dur, nameRu: `${dur} мс`, nameEn: `${dur} ms` }, ...TRANS_RIBBON_DURS];

  return (
    <RibbonGroup label={ru ? 'Переход' : 'Transition'}>
      <div className="react-trans-ribbon" {...versionAttr('TransitionsRibbon')}>
        <div className="react-trans-grid" role="listbox" aria-label={ru ? 'Переходы' : 'Transitions'}>
          {TRANSITION_DEFS.map((t) => {
            const label = ru ? t.nameRu : t.nameEn;
            const on = activeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`react-trans-chip${on ? ' is-on' : ''}`}
                title={ru ? t.descRu : t.descEn}
                aria-selected={on}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editorApi.setSlideTrans(t.id)}
              >
                <span
                  className="react-trans-chip-icon"
                  dangerouslySetInnerHTML={{ __html: t.icon }}
                />
                <span className="react-trans-chip-label">{label}</span>
              </button>
            );
          })}
        </div>
        <div className="react-trans-vdiv" />
        <div className="react-trans-side">
          <select
            className="react-trans-dur"
            value={String(dur)}
            title={ru ? 'Длительность перехода' : 'Transition duration'}
            onChange={(e) => editorApi.setTransitionDur(+e.target.value)}
          >
            {durOpts.map((d) => (
              <option key={d.ms} value={d.ms}>
                {ru ? d.nameRu : d.nameEn}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="react-trans-apply"
            onClick={() => editorApi.applyTransitionToAll(activeId)}
          >
            {ru ? 'Применить ко всем' : 'Apply to all'}
          </button>
        </div>
        <div className="react-trans-vdiv" />
        <p className="react-trans-ribbon-hint">{ru ? def.descRu : def.descEn}</p>
      </div>
    </RibbonGroup>
  );
}

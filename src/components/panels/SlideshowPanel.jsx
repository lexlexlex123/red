import React from 'react';
import { editorApi } from '../../editor/editorApi';
import { usePresentationStore } from '../../stores/presentationStore';
import { useUiStore } from '../../stores/uiStore';
import { versionAttr } from '../../editor/versions.js';

export default function SlideshowPanel() {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const slideAuto = usePresentationStore((s) => +(s.slides[s.cur]?.auto || 0));
  const presAutoDelay = useUiStore((s) => s.presAutoDelay);
  const presLoop = useUiStore((s) => s.presLoop);
  const presShuffle = useUiStore((s) => s.presShuffle);
  const autoOn = slideAuto > 0;
  const delay = autoOn ? Math.max(1, Math.min(60, slideAuto)) : presAutoDelay;

  return (
    <section className="react-props-section" {...versionAttr('SlideshowPanel')} aria-label={ru ? 'Показ' : 'Slideshow'}>
      <div className="react-props-hdr">{ru ? 'Показ' : 'Present'}</div>
      <div className="react-props-actions" style={{ flexDirection: 'column', gap: 6 }}>
        <button type="button" className="react-props-btn primary" onClick={() => editorApi.startPreview(0)}>
          {ru ? 'С начала (F5)' : 'From start (F5)'}
        </button>
        <button type="button" className="react-props-btn" onClick={() => editorApi.startPreview('__cur__')}>
          {ru ? 'С текущего (Shift+F5)' : 'From current (Shift+F5)'}
        </button>
      </div>

      <div className="react-props-hdr" style={{ marginTop: 14 }}>
        {ru ? 'Авто-переход' : 'Auto-advance'}
      </div>
      <label className="react-props-check" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          checked={autoOn}
          onChange={(e) => editorApi.toggleAutoAdv(e.target.checked)}
        />
        {ru ? 'Включить на текущем слайде' : 'Enable on current slide'}
      </label>
      <label className="react-props-field react-props-field-compact">
        <span>{ru ? 'Задержка (сек)' : 'Delay (sec)'}</span>
        <input
          type="number"
          min={1}
          max={60}
          value={delay}
          onChange={(e) => {
            const v = Math.max(1, Math.min(60, +e.target.value || 5));
            useUiStore.getState().setPresAutoDelay(v);
            if (autoOn) editorApi.setSlideAuto(v);
          }}
        />
      </label>
      <button
        type="button"
        className="react-props-btn"
        onClick={() => editorApi.applyAutoToAll(autoOn ? delay : 0)}
      >
        {ru ? 'Применить ко всем' : 'Apply to all'}
      </button>

      <div className="react-props-hdr" style={{ marginTop: 14 }}>
        {ru ? 'Воспроизведение' : 'Playback'}
      </div>
      <label className="react-props-check" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          checked={presLoop}
          onChange={() => useUiStore.getState().togglePresLoop()}
        />
        {ru ? 'Цикл' : 'Loop'}
      </label>
      <label className="react-props-check" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          checked={presShuffle}
          onChange={() => useUiStore.getState().togglePresShuffle()}
        />
        {ru ? 'Случайный порядок' : 'Shuffle'}
      </label>
    </section>
  );
}

import React from 'react';
import { editorApi } from '../../../editor/editorApi';
import { usePresentationStore } from '../../../stores/presentationStore';
import { useUiStore } from '../../../stores/uiStore';
import { versionAttr } from '../../../editor/versions.js';
import RibbonGroup from './RibbonGroup.jsx';
import RibbonButton from './RibbonButton.jsx';
import Toggle from '../../ui/Toggle.jsx';

export default function SlideshowRibbon() {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const slideAuto = usePresentationStore((s) => +(s.slides[s.cur]?.auto || 0));
  const presAutoDelay = useUiStore((s) => s.presAutoDelay);
  const presLoop = useUiStore((s) => s.presLoop);
  const presShuffle = useUiStore((s) => s.presShuffle);
  const presShowFooter = useUiStore((s) => s.presShowFooter);
  const presShowSideNav = useUiStore((s) => s.presShowSideNav);
  const presShowEsc = useUiStore((s) => s.presShowEsc);

  const autoOn = slideAuto > 0;
  const delay = autoOn ? Math.max(1, Math.min(60, slideAuto)) : presAutoDelay;

  return (
    <>
      <RibbonGroup label={ru ? 'Авто-переход' : 'Auto-advance'}>
        <div className="react-ss-auto" {...versionAttr('SlideshowRibbon')}>
          <label className="react-ss-auto-tog">
            <Toggle
              checked={autoOn}
              onChange={(v) => editorApi.toggleAutoAdv(v)}
              aria-label={ru ? 'Авто-переход' : 'Auto-advance'}
            />
            <span>{ru ? 'Вкл' : 'On'}</span>
          </label>
          <label className="react-ss-auto-delay">
            <span>{ru ? 'Задержка' : 'Delay'}</span>
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
            <span>{ru ? 'сек' : 'sec'}</span>
          </label>
          <button
            type="button"
            className="react-ss-auto-apply"
            title={ru ? 'Применить ко всем слайдам' : 'Apply to all slides'}
            onClick={() => editorApi.applyAutoToAll(autoOn ? delay : 0)}
          >
            {ru ? 'Ко всем' : 'Apply all'}
          </button>
        </div>
      </RibbonGroup>
      <RibbonGroup label={ru ? 'Воспроизведение' : 'Playback'}>
        <RibbonButton
          label={ru ? 'Цикл' : 'Loop'}
          title={ru ? 'Повторять показ с начала' : 'Loop slideshow'}
          icon="loop"
          on={presLoop}
          onClick={() => useUiStore.getState().togglePresLoop()}
        />
        <RibbonButton
          label={ru ? 'Случайно' : 'Shuffle'}
          title={ru ? 'Случайный порядок слайдов' : 'Shuffle slides'}
          icon="shuffle"
          on={presShuffle}
          onClick={() => useUiStore.getState().togglePresShuffle()}
        />
      </RibbonGroup>
      <RibbonGroup label={ru ? 'Отображение' : 'Display'}>
        <RibbonButton
          label={ru ? 'Футер' : 'Footer'}
          title={ru ? 'Номер слайда при показе' : 'Slide number during preview'}
          icon="footer"
          on={presShowFooter}
          onClick={() => useUiStore.getState().togglePresShowFooter()}
        />
        <RibbonButton
          label={ru ? 'Стрелки' : 'Arrows'}
          title={ru ? 'Боковые стрелки при показе' : 'Side arrows during preview'}
          icon="sidenav"
          on={presShowSideNav}
          onClick={() => useUiStore.getState().togglePresShowSideNav()}
        />
        <RibbonButton
          label="Esc"
          title={ru ? 'Кнопка выхода при показе' : 'Exit button during preview'}
          icon="escx"
          on={presShowEsc}
          onClick={() => useUiStore.getState().togglePresShowEsc()}
        />
      </RibbonGroup>
    </>
  );
}

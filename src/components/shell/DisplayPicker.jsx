import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import {
  pickShowAndPresenter,
  screenLabel,
  useDisplayScreens,
} from '../../editor/displayScreens.js';

export default function DisplayPicker({ compact = false }) {
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';
  const savedKey = useUiStore((s) => s.presShowScreenKey);
  const setKey = useUiStore((s) => s.setPresShowScreenKey);
  const { screens, supported, needsPermission, multi, request } = useDisplayScreens();
  const pair = pickShowAndPresenter(screens, savedKey);
  const presenterName = pair.presenter
    ? screenLabel(pair.presenter, screens.indexOf(pair.presenter), ru)
    : '';

  if (!supported) return null;

  if (needsPermission && !multi) {
    return (
      <div className={`react-ss-display${compact ? ' is-compact' : ''}`}>
        <button
          type="button"
          className={compact ? 'react-ss-display-ask' : 'react-props-btn'}
          onClick={() => request()}
          title={
            ru
              ? 'Если подключён второй монитор — слайды на одном, окно докладчика на другом'
              : 'With a second display, slides go on one screen and the presenter on the other'
          }
        >
          {ru ? 'Второй монитор…' : 'Second display…'}
        </button>
      </div>
    );
  }

  if (!multi) return null;

  const select = (
    <select
      className="react-ss-display-select"
      value={pair.show?.key || ''}
      onChange={(e) => setKey(e.target.value)}
      aria-label={ru ? 'Монитор для слайдов' : 'Display for slides'}
    >
      {screens.map((s, i) => (
        <option key={s.key} value={s.key}>
          {screenLabel(s, i, ru)}
        </option>
      ))}
    </select>
  );

  if (compact) {
    return (
      <div className="react-ss-display is-compact">
        <label className="react-ss-display-row">
          <span>{ru ? 'Слайды' : 'Slides'}</span>
          {select}
        </label>
        {presenterName ? (
          <div className="react-ss-display-hint">
            {ru ? 'Докладчик' : 'Presenter'}: {presenterName}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="react-ss-display">
      <label className="react-props-field">
        <span>{ru ? 'Слайды показывать на' : 'Show slides on'}</span>
        {select}
      </label>
      {presenterName ? (
        <div className="react-ss-display-hint">
          {ru
            ? `Окно докладчика — на другом мониторе (${presenterName}).`
            : `Presenter window opens on the other display (${presenterName}).`}
        </div>
      ) : null}
    </div>
  );
}

import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { installPwaApp } from '../../features/pwa';
import { APP_VERSION, versionAttr } from '../../editor/versions.js';
import Toggle from '../ui/Toggle.jsx';

const APP_AUTHOR = 'Некрасов Александр';

export default function SettingsModal() {
  const open = useUiStore((s) => s.settingsOpen);
  const closeSettings = useUiStore((s) => s.closeSettings);
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const lang = useUiStore((s) => s.lang);
  const setLang = useUiStore((s) => s.setLang);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const setSnapEnabled = useUiStore((s) => s.setSnapEnabled);
  const showToast = useUiStore((s) => s.showToast);

  if (!open) return null;
  const ru = lang !== 'en';

  return (
    <div className="settings-backdrop" onClick={closeSettings} role="presentation">
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label={ru ? 'Параметры' : 'Settings'}
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('SettingsModal')}
      >
        <h2>{ru ? '⚙ Параметры' : '⚙ Settings'}</h2>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">{ru ? 'Тема интерфейса' : 'Interface theme'}</div>
            <div className="settings-row-sub">{ru ? 'Цветовая схема интерфейса' : 'UI color scheme'}</div>
          </div>
          <div className="theme-toggle">
            <button
              type="button"
              className={themeMode === 'dark' ? 'active' : ''}
              onClick={() => setThemeMode('dark')}
            >
              🌙 {ru ? 'Тёмная' : 'Dark'}
            </button>
            <button
              type="button"
              className={themeMode === 'light' ? 'active' : ''}
              onClick={() => setThemeMode('light')}
            >
              ☀ {ru ? 'Светлая' : 'Light'}
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">{ru ? 'Привязка к сетке' : 'Snap to grid'}</div>
            <div className="settings-row-sub">{ru ? 'Выравнивание элементов по сетке' : 'Align objects to the grid'}</div>
          </div>
          <Toggle
            checked={!!snapEnabled}
            onChange={(v) => setSnapEnabled(v)}
            title={ru ? 'Привязка' : 'Snap'}
          />
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">{ru ? 'Язык' : 'Language'}</div>
            <div className="settings-row-sub">{ru ? 'Язык интерфейса' : 'Interface language'}</div>
          </div>
          <div className="theme-toggle">
            <button type="button" className={lang === 'ru' ? 'active' : ''} onClick={() => setLang('ru')}>
              Русский
            </button>
            <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
              English
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">{ru ? 'Установить приложение' : 'Install app'}</div>
            <div className="settings-row-sub">
              {ru ? 'Ярлык на рабочем столе, офлайн' : 'Desktop shortcut, offline'}
            </div>
          </div>
          <button
            type="button"
            className="settings-link-btn"
            onClick={() => {
              installPwaApp().then((ok) => {
                showToast(
                  ok
                    ? ru
                      ? 'Установлено'
                      : 'Installed'
                    : ru
                      ? 'Меню браузера → Установить'
                      : 'Use browser install menu',
                  ok ? 'ok' : ''
                );
              });
            }}
          >
            {ru ? 'Установить' : 'Install'}
          </button>
        </div>

        <div className="settings-meta">
          <div className="settings-meta-row">
            <span>{ru ? 'Версия' : 'Version'}</span>
            <span className="settings-meta-val">{APP_VERSION}</span>
          </div>
          <div className="settings-meta-row">
            <span>{ru ? 'Автор' : 'Author'}</span>
            <span className="settings-meta-val">{APP_AUTHOR}</span>
          </div>
        </div>

        <button type="button" className="settings-done" onClick={closeSettings}>
          {ru ? 'Готово' : 'Done'}
        </button>
      </div>
    </div>
  );
}

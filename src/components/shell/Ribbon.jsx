import React, { useLayoutEffect, useRef, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import { APP_VERSION, versionAttr } from '../../editor/versions.js';
import { APP_ICON_URL } from '../../editor/appBrand.js';
import { RibbonIcon } from './ribbon/icons.jsx';
import { APP_CHROME } from '../../editor/app-icons-data.js';
import { RIBBON_TAB_H, ribbonTabPath } from './ribbon/ribbonGeom.js';
import RibbonImportExport from './ribbon/RibbonImportExport.jsx';

function RibbonTab({ tab, active, zIndex, isLast, onClick, onDoubleClick, title }) {
  const btnRef = useRef(null);
  const [w, setW] = useState(88);
  useLayoutEffect(() => {
    const el = btnRef.current;
    if (!el) return undefined;
    const measure = () => setW(Math.max(40, Math.round(el.getBoundingClientRect().width)));
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    return () => ro?.disconnect();
  }, [tab.label]);
  const d = ribbonTabPath(w, RIBBON_TAB_H);
  return (
    <button
      ref={btnRef}
      type="button"
      role="tab"
      aria-selected={active}
      className={`react-rtab${active ? ' active' : ''}${isLast ? ' last' : ''}`}
      data-tab={tab.id}
      title={title}
      style={{ zIndex }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <span className="react-rtab-shade" aria-hidden="true">
        <svg className="react-rtab-shape" viewBox={`0 0 ${w} ${RIBBON_TAB_H}`} preserveAspectRatio="none" overflow="visible">
          <path d={d} />
        </svg>
      </span>
      <span className="react-rtab-label">{tab.label}</span>
    </button>
  );
}

export default function Ribbon() {
  const title = usePresentationStore((s) => s.title);
  const setTitle = usePresentationStore((s) => s.setTitle);
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const openSettings = useUiStore((s) => s.openSettings);
  const openConfig = useUiStore((s) => s.openConfig);
  const lang = useUiStore((s) => s.lang);
  const ribbonCollapsed = useUiStore((s) => s.ribbonCollapsed);
  const toggleRibbonCollapsed = useUiStore((s) => s.toggleRibbonCollapsed);

  const tabs = [
    { id: 'home', label: lang === 'en' ? 'Home' : 'Главная' },
    { id: 'insert', label: lang === 'en' ? 'Insert' : 'Вставка' },
    { id: 'objects', label: lang === 'en' ? 'Objects' : 'Объекты' },
    { id: 'design', label: lang === 'en' ? 'Design' : 'Дизайн' },
    { id: 'tools', label: lang === 'en' ? 'Tools' : 'Сервис' },
    { id: 'anim', label: lang === 'en' ? 'Animations' : 'Анимации' },
    { id: 'transitions', label: lang === 'en' ? 'Transitions' : 'Переходы' },
    { id: 'drawing', label: lang === 'en' ? 'Drawing' : 'Рисование' },
    { id: 'slideshow', label: lang === 'en' ? 'Slideshow' : 'Показ' },
  ];

  return (
    <header className="react-ribbon" {...versionAttr('Ribbon')}>
      <div className="react-ribbon-top">
        <div className="app-logo">
          <img
            className="app-logo-icon"
            src={APP_ICON_URL}
            width={18}
            height={18}
            alt=""
            aria-hidden="true"
          />
          <span className="app-logo-title">{lang === 'en' ? 'Slides' : 'Слайды'}</span>
          <span className="app-logo-ver">v {APP_VERSION}</span>
        </div>
        <input
          className="react-pres-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            editorApi.setTitle(e.target.value);
          }}
          placeholder={lang === 'en' ? 'New presentation' : 'Новая презентация'}
        />
        <button type="button" className="react-ribbon-iconbtn" title="Новая" onClick={() => editorApi.newPresentation()}>
          +
        </button>
        <div className="spacer" />
      </div>
      <div className="react-ribbon-tabs" role="tablist">
        <button type="button" className="react-rtab react-rtab-util" onMouseDown={(e) => e.preventDefault()} onClick={openSettings} title={lang === 'en' ? 'Settings' : 'Параметры'}>
          <RibbonIcon id={APP_CHROME.settings} size={14} />
        </button>
        <button type="button" className="react-rtab react-rtab-util" onMouseDown={(e) => e.preventDefault()} onClick={openConfig} title={lang === 'en' ? 'Configuration' : 'Конфигурация'}>
          <RibbonIcon id={APP_CHROME.wrench} size={14} />
        </button>
        {tabs.map((tab, i) => (
          <RibbonTab
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            isLast={i === tabs.length - 1}
            zIndex={activeTab === tab.id ? 40 : tabs.length - i + 2}
            onClick={() => {
              if (tab.id !== 'drawing') {
                const tool = usePresentationStore.getState().drawTool;
                if (tool && tool !== 'cursor') usePresentationStore.getState().setDrawTool('cursor');
              }
              setActiveTab(tab.id);
            }}
            onDoubleClick={() => toggleRibbonCollapsed()}
            title={lang === 'en' ? 'Double-click to collapse ribbon' : 'Двойной щелчок — свернуть ленту'}
          />
        ))}
        {ribbonCollapsed ? <RibbonImportExport compact /> : null}
      </div>
    </header>
  );
}

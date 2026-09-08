import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useUiStore } from '../../../stores/uiStore';
import { usePresentationStore } from '../../../stores/presentationStore';
import RibbonGroup from './RibbonGroup.jsx';
import RibbonButton from './RibbonButton.jsx';
import { getTabGroups } from './tabTools.js';
import AnimTimeline from './AnimTimeline.jsx';
import SlideshowRibbon from './SlideshowRibbon.jsx';
import TransitionsRibbon from './TransitionsRibbon.jsx';
import DesignRibbon from './DesignRibbon.jsx';
import RibbonImportExport from './RibbonImportExport.jsx';
import { versionAttr } from '../../../editor/versions.js';
import { RIBBON_BODY_H, ribbonTrapGeom } from './ribbonGeom.js';

const TAB_RGB = {
  home: '59, 130, 246',
  insert: '20, 184, 166',
  objects: '217, 119, 6',
  design: '139, 92, 246',
  tools: '14, 165, 233',
  anim: '236, 72, 153',
  transitions: '99, 102, 241',
  drawing: '249, 115, 22',
  slideshow: '34, 197, 94',
};

function ribbonSurfaceCss(el) {
  if (!el) return '#ffffff';
  const cs = getComputedStyle(el);
  const bg = cs.backgroundColor;
  if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return bg;
  return (cs.getPropertyValue('--surface') || '').trim() || '#ffffff';
}

function ribbonWashStartCss(host, rgb, surface, tab) {
  const path = tab && tab.querySelector('.react-rtab-shape path');
  if (path) {
    const fill = getComputedStyle(path).fill;
    if (fill && fill !== 'none' && fill !== 'rgba(0, 0, 0, 0)') return fill;
  }
  const pct = (
    getComputedStyle(document.documentElement).getPropertyValue('--ribbon-wash-pct') || '32%'
  ).trim() || '32%';
  if (!host) return `rgb(${rgb})`;
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;left:-9999px;pointer-events:none;';
  probe.style.color = `color-mix(in srgb, rgb(${rgb}) ${pct}, ${surface})`;
  host.appendChild(probe);
  const mixed = getComputedStyle(probe).color;
  probe.remove();
  return mixed || `rgb(${rgb})`;
}

function RibbonTrap({ tabWidth, height, startColor, endColor }) {
  const uid = useId().replace(/:/g, '');
  const g = ribbonTrapGeom(tabWidth, height);
  const gradId = `rtg-${uid}`;
  return (
    <svg className="react-ribbon-trap" viewBox={`0 0 ${g.w} ${g.h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          spreadMethod="pad"
          x1={g.gx1}
          y1={g.gy1}
          x2={g.gx2}
          y2={g.gy2}
        >
          <stop offset="0" stopColor={startColor} />
          <stop offset="0.4" stopColor={startColor} />
          <stop offset="1" stopColor={endColor} stopOpacity="1" />
        </linearGradient>
      </defs>
      <polygon points={g.trapPoints} fill={`url(#${gradId})`} />
    </svg>
  );
}

function measureTrap(activeTab) {
  const fallback = {
    trapLeft: 0,
    trapTabW: 88,
    trapH: RIBBON_BODY_H,
    tabsH: 36,
    startColor: 'rgb(59, 130, 246)',
    endColor: '#ffffff',
  };
  if (typeof document === 'undefined') return fallback;
  const body = document.querySelector('.react-ribbon-body');
  const tabs = document.querySelector('.react-ribbon-tabs');
  const tab = document.querySelector(`.react-rtab.active[data-tab="${activeTab}"]`);
  const rgb = TAB_RGB[activeTab] || TAB_RGB.home;
  const endColor = ribbonSurfaceCss(body);
  const startColor = ribbonWashStartCss(body, rgb, endColor, tab);
  if (!body || !tab) {
    return {
      ...fallback,
      trapLeft: 0,
      tabsH: tabs ? Math.round(tabs.getBoundingClientRect().height) : 36,
      startColor,
      endColor,
    };
  }
  const br = body.getBoundingClientRect();
  const tr = tab.getBoundingClientRect();
  const tabsH = tabs ? Math.max(28, Math.round(br.top - tabs.getBoundingClientRect().top)) : 36;
  return {
    trapLeft: 0,
    trapTabW: Math.max(36, Math.round(tr.right - br.left)),
    trapH: Math.max(24, Math.round(br.height)),
    tabsH,
    startColor,
    endColor,
  };
}

export default function RibbonBody() {
  const activeTab = useUiStore((s) => s.activeTab);
  const lang = useUiStore((s) => s.lang);
  const animTlDocked = useUiStore((s) => s.animTlDocked);
  const extraGuidesMode = useUiStore((s) => s.extraGuidesMode);
  const connectorMode = useUiStore((s) => s.connectorMode);
  const voiceListening = useUiStore((s) => s.voiceListening);
  const stylePaintMode = useUiStore((s) => s.stylePaintMode);
  const findOpen = useUiStore((s) => s.findOpen);
  const drawTool = usePresentationStore((s) => s.drawTool);
  const slideAnimPlaying = useUiStore((s) => s.slideAnimPlaying);
  const groups = getTabGroups(activeTab, lang, {
    extraGuidesMode,
    connectorMode,
    voiceListening,
    stylePaintMode,
    findOpen,
    drawTool,
    slideAnimPlaying,
  });
  const bodyRef = useRef(null);
  const scrollRef = useRef(null);
  const [trapLeft, setTrapLeft] = useState(0);
  const [trapTabW, setTrapTabW] = useState(88);
  const [trapH, setTrapH] = useState(RIBBON_BODY_H);
  const [tabsH, setTabsH] = useState(36);
  const [trapStart, setTrapStart] = useState('rgb(59, 130, 246)');
  const [trapEnd, setTrapEnd] = useState('#ffffff');

  useLayoutEffect(() => {
    const update = () => {
      const m = measureTrap(activeTab);
      setTrapLeft(m.trapLeft);
      setTrapTabW(m.trapTabW);
      setTrapH(m.trapH);
      setTabsH(m.tabsH);
      setTrapStart(m.startColor);
      setTrapEnd(m.endColor);
    };
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro) {
      if (bodyRef.current) ro.observe(bodyRef.current);
      const tab = document.querySelector(`.react-rtab.active[data-tab="${activeTab}"]`);
      const tabs = document.querySelector('.react-ribbon-tabs');
      if (tab) ro.observe(tab);
      if (tabs) ro.observe(tabs);
    }
    window.addEventListener('resize', update);
    const mo = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(update)
      : null;
    if (mo) mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => {
      ro?.disconnect();
      mo?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [activeTab]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const m = measureTrap(activeTab);
      setTrapLeft(m.trapLeft);
      setTrapTabW(m.trapTabW);
      setTrapH(m.trapH);
      setTabsH(m.tabsH);
      setTrapStart(m.startColor);
      setTrapEnd(m.endColor);
    });
    return () => cancelAnimationFrame(id);
  }, [activeTab]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollTop = 0;
      el.scrollLeft += e.deltaY;
    };
    const onScroll = () => {
      if (el.scrollTop) el.scrollTop = 0;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', onScroll);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  const rgb = TAB_RGB[activeTab] || TAB_RGB.home;

  return (
    <div
      ref={bodyRef}
      className="react-ribbon-body"
      role="toolbar"
      aria-label="Инструменты"
      data-tab={activeTab}
      style={{
        '--ribbon-trap-left': `${trapLeft}px`,
        '--ribbon-trap-w': `${ribbonTrapGeom(trapTabW, trapH).w}px`,
        '--ribbon-trap-h': `${trapH}px`,
        '--ribbon-trap-tabs-h': `${tabsH}px`,
        '--ribbon-trap-rgb': rgb,
      }}
      {...versionAttr('RibbonBody')}
    >
      <RibbonTrap tabWidth={trapTabW} height={trapH} startColor={trapStart} endColor={trapEnd} />
      <div className="react-ribbon-scroll" ref={scrollRef}>
        {groups.map((group) => (
          <RibbonGroup key={group.label} label={group.label}>
            {group.buttons.map((btn) => (
              <RibbonButton
                key={btn.className?.includes('react-rb-anim-toggle') ? 'anim-play-toggle' : `${btn.icon}-${btn.label}`}
                label={btn.label}
                title={btn.title}
                icon={btn.icon}
                primary={btn.primary}
                on={btn.on}
                className={btn.className}
                onClick={btn.onClick}
              />
            ))}
          </RibbonGroup>
        ))}
        {activeTab === 'anim' && !animTlDocked ? <AnimTimeline /> : null}
        {activeTab === 'transitions' ? <TransitionsRibbon /> : null}
        {activeTab === 'design' ? <DesignRibbon /> : null}
        {activeTab === 'slideshow' ? <SlideshowRibbon /> : null}
      </div>
      <div className="react-ribbon-right">
        <RibbonImportExport />
      </div>
    </div>
  );
}

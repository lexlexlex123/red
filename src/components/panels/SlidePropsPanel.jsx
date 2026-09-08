import React, { useEffect, useMemo, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { useUiStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../stores/historyStore';
import { editorApi } from '../../editor/editorApi';
import {
  ensureLayoutsLoaded,
  getLayouts,
  layoutDisplayName,
  prismLayoutIdx,
  solidPreviewBg,
  tplThumbSvg,
  tplVariantsFor,
} from '../../editor/layouts.js';
import { PN_POSITIONS, PN_STYLES } from '../../editor/pagenum.js';
import ColorField from '../ui/ColorField.jsx';
import Toggle from '../ui/Toggle.jsx';
import { solidColor } from '../../editor/themes.js';
import {
  SBG_MODES,
  SBG_ANCHORS,
  bgImgSrc,
  normalizeBgImg,
} from '../../editor/slideBgImg.js';
import GSlider from '../ui/GSlider.jsx';
import TransitionsPanel from './TransitionsPanel.jsx';

function slideLabel(slide, i, ru) {
  const t = slide?.title || slide?.name;
  if (t) return t;
  return ru ? `Слайд ${i + 1}` : `Slide ${i + 1}`;
}

function currentDecorMeta(slide) {
  const d = (slide?.els || []).find((e) => e && e._isDecor);
  if (!d) return null;
  return {
    layoutIdx: d._layoutIdx,
    style: d._decorStyle || 'content',
    mirror: !!d._decorMirror,
  };
}

export default function SlidePropsPanel() {
  const slides = usePresentationStore((s) => s.slides);
  const cur = usePresentationStore((s) => s.cur);
  const layoutIdx = usePresentationStore((s) => s.layoutIdx);
  const layoutAnimated = usePresentationStore((s) => s.layoutAnimated);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const pnSettings = usePresentationStore((s) => s.pnSettings);
  const lang = useUiStore((s) => s.lang);
  const [layoutsReady, setLayoutsReady] = useState(
    !!(typeof window !== 'undefined' && window.LAYOUTS?.length)
  );
  const slide = slides[cur] || {};
  const ru = lang !== 'en';
  const title = slide.title || slide.name || '';
  const previewBg = solidPreviewBg();
  const bgSolid =
    typeof slide.bgc === 'string' && slide.bgc.startsWith('#')
      ? slide.bgc.slice(0, 7)
      : solidColor(slide.bgc) || previewBg || '#1e293b';
  const meta = currentDecorMeta(slide);
  const bgImg = normalizeBgImg(slide.bgImg);
  const hasBgImg = !!bgImgSrc(bgImg);

  useEffect(() => {
    ensureLayoutsLoaded().then(() => setLayoutsReady(true));
  }, []);

  const layouts = layoutsReady ? getLayouts() : [];

  const tplIdx = useMemo(() => {
    if (meta && meta.layoutIdx != null && meta.layoutIdx >= 0) return meta.layoutIdx;
    if (layoutIdx >= 0) return layoutIdx;
    return prismLayoutIdx();
  }, [meta, layoutIdx, layoutsReady]);

  const L = layouts[tplIdx];
  const variants = useMemo(
    () => (layoutsReady ? tplVariantsFor(tplIdx, ru) : []),
    [tplIdx, ru, appliedThemeIdx, layoutsReady]
  );
  const layoutName = layoutDisplayName(L, lang);
  const supportsAnim = !!(L && L.animated);

  return (
    <section className="react-props-section" aria-label={ru ? 'Слайд' : 'Slide'}>
      <div className="react-props-hdr">{ru ? 'слайд' : 'slide'}</div>

      <label className="react-props-field">
        <span>{ru ? 'Заголовок слайда' : 'Slide title'}</span>
        <input
          type="text"
          value={title}
          placeholder={slideLabel(slide, cur, ru)}
          onChange={(e) => editorApi.setSlideTitle(e.target.value)}
        />
      </label>

      <div className="react-props-field">
        <span>
          {ru ? 'Шаблоны' : 'Templates'}
          {layoutName ? <span className="react-tpl-layout-name"> · {layoutName}</span> : null}
        </span>
        <div className="slide-tpl-grid">
          <button
            type="button"
            className={`slide-tpl-item${!meta ? ' active' : ''}`}
            style={{ background: previewBg }}
            title={ru ? 'Пустой шаблон' : 'Empty template'}
            onClick={() => editorApi.clearSlideTemplate()}
          >
            <span className="slide-tpl-inner slide-tpl-none">
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <line
                  x1="8"
                  y1="8"
                  x2="40"
                  y2="40"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <line
                  x1="40"
                  y1="8"
                  x2="8"
                  y2="40"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </button>
          {variants.map((v) => {
            const active =
              !!meta &&
              meta.layoutIdx === tplIdx &&
              meta.style === v.style &&
              !!meta.mirror === !!v.mirror;
            const svg = tplThumbSvg(tplIdx, v.style, !!v.mirror);
            return (
              <button
                key={`${v.style}-${v.mirror ? 1 : 0}`}
                type="button"
                className={`slide-tpl-item${active ? ' active' : ''}`}
                style={{ background: previewBg }}
                title={`${layoutName} — ${v.tip}`}
                onClick={() => editorApi.applySlideTemplate(v.style, !!v.mirror)}
              >
                <span className="slide-tpl-inner" dangerouslySetInnerHTML={{ __html: svg }} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="react-props-field">
        <span>{ru ? 'Фон слайда' : 'Slide background'}</span>
        <div className="react-slide-bg-row">
          <ColorField
            value={bgSolid}
            schemeRef={slide.bgScheme}
            onChange={(c, sr) => {
              useHistoryStore.getState().push();
              usePresentationStore.getState().patchSlide(cur, {
                bgc: c,
                bg: 'custom',
                bgScheme: sr,
              });
            }}
            onClear={() => editorApi.resetSlideBg()}
            allowClear={false}
          />
          <button
            type="button"
            className="slide-bg-theme-btn"
            title={ru ? 'Сбросить к фону темы' : 'Reset to theme background'}
            onClick={() => editorApi.resetSlideBg()}
          >
            ↺ {ru ? 'Тема' : 'Theme'}
          </button>
        </div>
        <button
          type="button"
          className="react-props-btn"
          style={{ marginTop: 6 }}
          onClick={() => editorApi.setSlideBgImage()}
        >
          {ru ? '🖼 Выбрать фоновое изображение' : '🖼 Pick background image'}
        </button>
        {hasBgImg ? (
          <div className="react-sbg-img-props" style={{ marginTop: 8 }}>
            <div
              style={{
                width: '100%',
                aspectRatio: '16/9',
                borderRadius: 6,
                overflow: 'hidden',
                border: '1px solid var(--border2)',
                background: 'repeating-conic-gradient(#aaa 0% 25%, #fff 0% 50%) 0 0 / 8px 8px',
                marginBottom: 6,
                position: 'relative',
              }}
            >
              <img
                src={bgImgSrc(bgImg)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <button
                type="button"
                className="react-bg-img-clear"
                title={ru ? 'Убрать фоновое изображение' : 'Remove background image'}
                onClick={() => editorApi.clearSlideBgImage()}
              >
                ✕
              </button>
            </div>
            <div className="react-props-row react-props-seg" style={{ flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {SBG_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`react-props-btn${(bgImg.mode || 'cover') === m.id ? ' is-active' : ''}`}
                  title={ru ? m.labelRu : m.labelEn}
                  onClick={() => editorApi.patchSlideBgImg({ mode: m.id })}
                  style={{ flex: '1 1 36px', minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 4px' }}
                >
                  {m.id === 'stretch' ? <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><rect x="1" y="1" width="16" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/><line x1="1" y1="1" x2="17" y2="13" stroke="currentColor" strokeWidth="1.2" opacity=".5"/><line x1="17" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="1.2" opacity=".5"/></svg> : null}
                  {m.id === 'cover' ? <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><rect x="1" y="1" width="16" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="4" y="3" width="10" height="8" rx="1" fill="currentColor" opacity=".45"/></svg> : null}
                  {m.id === 'tile' ? <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><rect x="1" y="1" width="6" height="5" rx=".5" stroke="currentColor" strokeWidth="1.2"/><rect x="9" y="1" width="6" height="5" rx=".5" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8" width="6" height="5" rx=".5" stroke="currentColor" strokeWidth="1.2"/><rect x="9" y="8" width="6" height="5" rx=".5" stroke="currentColor" strokeWidth="1.2"/></svg> : null}
                  {m.id === 'custom' ? <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><rect x="1" y="1" width="16" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="5" y="4" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" fill="currentColor" opacity=".35"/></svg> : null}
                </button>
              ))}
            </div>
            {(bgImg.mode || 'cover') === 'tile' ? (
              <div style={{ marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <GSlider
                  label={ru ? 'Размер' : 'Size'}
                  min={20}
                  max={800}
                  step={1}
                  value={bgImg.tileSize ?? 120}
                  onChange={(v) => editorApi.patchSlideBgImg({ tileSize: +v })}
                />
                <GSlider
                  label={ru ? 'Зазор' : 'Gap'}
                  min={0}
                  max={200}
                  step={1}
                  value={bgImg.tileGap ?? 10}
                  onChange={(v) => editorApi.patchSlideBgImg({ tileGap: +v })}
                />
                <GSlider
                  label={ru ? 'Поворот' : 'Rot'}
                  min={-180}
                  max={180}
                  step={1}
                  value={bgImg.tileRot ?? 0}
                  onChange={(v) => editorApi.patchSlideBgImg({ tileRot: +v })}
                />
              </div>
            ) : null}
            {(bgImg.mode || 'cover') === 'custom' ? (
              <>
                <div style={{ marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <GSlider
                    label={ru ? 'Размер' : 'Size'}
                    min={20}
                    max={1200}
                    step={1}
                    value={bgImg.customSize ?? 300}
                    onChange={(v) => editorApi.patchSlideBgImg({ customSize: +v })}
                  />
                  <GSlider
                    label={ru ? 'Отступ X' : 'Margin X'}
                    min={0}
                    max={300}
                    step={1}
                    value={bgImg.customMarginX ?? bgImg.customMargin ?? 0}
                    onChange={(v) => editorApi.patchSlideBgImg({ customMarginX: +v })}
                  />
                  <GSlider
                    label={ru ? 'Отступ Y' : 'Margin Y'}
                    min={0}
                    max={300}
                    step={1}
                    value={bgImg.customMarginY ?? bgImg.customMargin ?? 0}
                    onChange={(v) => editorApi.patchSlideBgImg({ customMarginY: +v })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 28px)', gridTemplateRows: 'repeat(3, 24px)', gap: 3, width: 'fit-content', marginBottom: 6 }}>
                  <button
                    type="button"
                    className={`react-props-btn${(bgImg.customAnchor || 'center') === 'tl' ? ' is-active' : ''}`}
                    title={ru ? 'Верхний левый' : 'Top left'}
                    onClick={() => editorApi.patchSlideBgImg({ customAnchor: 'tl' })}
                    style={{ padding: 0, fontSize: 10 }}
                  >↖</button>
                  <span />
                  <button
                    type="button"
                    className={`react-props-btn${(bgImg.customAnchor || 'center') === 'tr' ? ' is-active' : ''}`}
                    title={ru ? 'Верхний правый' : 'Top right'}
                    onClick={() => editorApi.patchSlideBgImg({ customAnchor: 'tr' })}
                    style={{ padding: 0, fontSize: 10 }}
                  >↗</button>
                  <span />
                  <button
                    type="button"
                    className={`react-props-btn${(bgImg.customAnchor || 'center') === 'center' ? ' is-active' : ''}`}
                    title={ru ? 'По центру' : 'Center'}
                    onClick={() => editorApi.patchSlideBgImg({ customAnchor: 'center' })}
                    style={{ padding: 0, fontSize: 10 }}
                  >◎</button>
                  <span />
                  <button
                    type="button"
                    className={`react-props-btn${(bgImg.customAnchor || 'center') === 'bl' ? ' is-active' : ''}`}
                    title={ru ? 'Нижний левый' : 'Bottom left'}
                    onClick={() => editorApi.patchSlideBgImg({ customAnchor: 'bl' })}
                    style={{ padding: 0, fontSize: 10 }}
                  >↙</button>
                  <span />
                  <button
                    type="button"
                    className={`react-props-btn${(bgImg.customAnchor || 'center') === 'br' ? ' is-active' : ''}`}
                    title={ru ? 'Нижний правый' : 'Bottom right'}
                    onClick={() => editorApi.patchSlideBgImg({ customAnchor: 'br' })}
                    style={{ padding: 0, fontSize: 10 }}
                  >↘</button>
                </div>
              </>
            ) : null}
            <GSlider
              label={ru ? 'Прозрачность' : 'Opacity'}
              min={0}
              max={100}
              step={1}
              value={Math.round((bgImg.opacity ?? 1) * 100)}
              onChange={(v) => editorApi.patchSlideBgImg({ opacity: Math.max(0, Math.min(1, (+v || 0) / 100)) }, { history: false })}
            />
            <GSlider
              label={ru ? 'Размытие' : 'Blur'}
              min={0}
              max={100}
              step={1}
              value={bgImg.blur ?? 0}
              onChange={(v) => editorApi.patchSlideBgImg({ blur: Math.max(0, Math.min(100, +v || 0)) }, { history: false })}
            />
          </div>
        ) : null}
        <button
          type="button"
          className="react-props-btn"
          style={{ marginTop: 8, width: '100%' }}
          onClick={() => editorApi.applySlideStyleToAll()}
        >
          {ru ? 'Применить ко всем слайдам' : 'Apply to all slides'}
        </button>
      </div>

      {supportsAnim ? (
        <div className="react-props-field react-props-row" style={{ alignItems: 'center' }}>
          <span style={{ flex: 1 }}>{ru ? 'Анимация фона' : 'Background animation'}</span>
          <label className="react-sntog">
            <Toggle
              checked={layoutAnimated}
              onChange={(v) => editorApi.setLayoutAnimated(v)}
              aria-label={ru ? 'Анимация фона' : 'Background animation'}
            />
          </label>
        </div>
      ) : null}

      <TransitionsPanel embedded />

      <GSlider
        label={ru ? 'Авто (сек)' : 'Auto (sec)'}
        min={0}
        max={120}
        step={1}
        value={slide.auto ?? 0}
        onChange={(v) => editorApi.setSlideAuto(+v)}
      />
      <div className="react-props-field react-props-row" style={{ alignItems: 'center' }}>
        <span style={{ flex: 1 }}>{ru ? 'Клик по слайду — следующий' : 'Click anywhere to advance'}</span>
        <label className="react-sntog">
          <Toggle
            checked={slide.clickNav !== false}
            onChange={(v) => editorApi.setSlideClickNav(v)}
            aria-label={ru ? 'Клик по слайду — следующий' : 'Click anywhere to advance'}
          />
        </label>
      </div>

      <div className="slide-action-icons">
        <button
          type="button"
          className="slide-action-rb"
          title={ru ? 'Новый слайд' : 'New slide'}
          onClick={() => editorApi.addSlide(cur + 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          <span className="slide-action-rbl">{ru ? 'Новый слайд' : 'New slide'}</span>
        </button>
        <button
          type="button"
          className="slide-action-rb"
          title={ru ? 'Дублировать' : 'Duplicate'}
          onClick={() => editorApi.dupSlide(cur)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          <span className="slide-action-rbl">{ru ? 'Дублировать' : 'Duplicate'}</span>
        </button>
        <button
          type="button"
          className="slide-action-rb warn"
          title={ru ? 'Удалить' : 'Delete'}
          onClick={() => editorApi.delSlide(cur)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
          <span className="slide-action-rbl">{ru ? 'Удалить' : 'Delete'}</span>
        </button>
      </div>

      <div className="react-props-hdr">
        {ru ? 'номера слайдов' : 'page numbers'}
      </div>
      <label className="react-props-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Toggle
          checked={!!pnSettings?.enabled}
          onChange={(v) => editorApi.setPageNumbers({ enabled: v })}
        />
        <span>{ru ? 'Показывать номера' : 'Show page numbers'}</span>
      </label>
      {pnSettings?.enabled ? (
        <div className="react-props-stack">
          <label className="react-props-field">
            <span>{ru ? 'Стиль' : 'Style'}</span>
            <select
              value={pnSettings.style || 'simple'}
              onChange={(e) => editorApi.setPageNumbers({ style: e.target.value })}
            >
              {PN_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {ru ? s.labelRu : s.labelEn}
                </option>
              ))}
            </select>
          </label>
          <div className="react-props-field">
            <span>{ru ? 'Позиция' : 'Position'}</span>
            <div className="react-props-row react-props-seg">
              {PN_POSITIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`react-props-btn${(pnSettings.position || 'br') === p.id ? ' is-active' : ''}`}
                  onClick={() => editorApi.setPageNumbers({ position: p.id, customXY: null })}
                >
                  {ru ? p.labelRu : p.labelEn}
                </button>
              ))}
            </div>
          </div>
          <label className="react-props-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Toggle
              checked={!!pnSettings.showTotal}
              onChange={(v) => editorApi.setPageNumbers({ showTotal: v })}
            />
            <span>{ru ? 'Показывать всего' : 'Show total'}</span>
          </label>
          <ColorField
            label={ru ? 'Цвет' : 'Color'}
            value={pnSettings.color || '#3b82f6'}
            onChange={(c) => editorApi.setPageNumbers({ color: c, customColor: true })}
          />
          <ColorField
            label={ru ? 'Текст' : 'Text'}
            value={pnSettings.textColor || '#ffffff'}
            onChange={(c) => editorApi.setPageNumbers({ textColor: c })}
          />
          <label className="react-props-field react-props-field-compact">
            <span>{ru ? 'Кегль' : 'Size'}</span>
            <input
              type="number"
              min="10"
              max="48"
              value={pnSettings.fontSize ?? 14}
              onChange={(e) =>
                editorApi.setPageNumbers({
                  fontSize: Math.max(10, Math.min(48, +e.target.value || 14)),
                })
              }
            />
          </label>
          <GSlider
            label={ru ? 'Прозрачность' : 'Opacity'}
            min={0.15}
            max={1}
            step={0.05}
            value={pnSettings.opacity ?? 1}
            onChange={(v) => editorApi.setPageNumbers({ opacity: v })}
          />
          {pnSettings.customXY ? (
            <button
              type="button"
              className="react-props-btn"
              onClick={() => editorApi.setPageNumbers({ customXY: null })}
            >
              {ru ? 'Сбросить позицию' : 'Reset position'}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

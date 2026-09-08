import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePresentationStore } from '../../stores/presentationStore';
import { useHistoryStore } from '../../stores/historyStore';
import { editorApi } from '../../editor/editorApi';
import { ICON_CATS, iconsForCategory, getIconById } from '../../editor/icons-data.js';
import { buildIconSVG } from '../../editor/iconSvg.js';
import { iconHasAnim } from '../../editor/iconAnim.js';
import { measureIconFit } from '../../editor/iconFit.js';
import { getTheme, schemeSwatchColor } from '../../editor/themes.js';
import { versionAttr } from '../../editor/versions.js';
import GSlider from '../ui/GSlider.jsx';
import PickerPager from './PickerPager.jsx';
import AnimatedIcon from '../canvas/AnimatedIcon.jsx';

const PAGE = 72; // 12×6 like v7.1
const ICON_NAV_KEY = 'sf_icon_nav';
const ICON_SCHEME = { col: 0, row: 2 };

function loadIconNav() {
  try {
    const o = JSON.parse(localStorage.getItem(ICON_NAV_KEY) || '{}');
    const cat = typeof o.cat === 'string' ? o.cat : 'all';
    const pages = o.pages && typeof o.pages === 'object' ? o.pages : {};
    const saved = pages[cat];
    const page = saved != null && Number.isFinite(+saved) ? Math.max(0, +saved) : 0;
    return { cat, page, pages };
  } catch {
    return { cat: 'all', page: 0, pages: {} };
  }
}

function saveIconNav(cat, page, pages, searching) {
  try {
    const next = { ...pages };
    if (!searching) next[cat] = page;
    localStorage.setItem(ICON_NAV_KEY, JSON.stringify({ cat, pages: next }));
  } catch {
    /* ignore */
  }
}

function catPreviewColor() {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--text2').trim();
    if (v) return v;
  } catch (_) {
    /* ignore */
  }
  return document.documentElement.classList.contains('light') ? '#64748b' : '#9aa2b4';
}

function defaultIconColor(themeIdx) {
  const theme = getTheme(themeIdx) || getTheme(0);
  const c = theme ? schemeSwatchColor(theme, ICON_SCHEME.col, ICON_SCHEME.row) : null;
  if (c) return c;
  if (theme?.shapeFill) return theme.shapeFill;
  return '#6366f1';
}

function IconPickerCell({ ic, color, sw, fillOp, selected, onSelect, onInsert }) {
  const [hover, setHover] = useState(false);
  const hasAnim = iconHasAnim(ic);
  return (
    <button
      type="button"
      className={`icon-picker-cell${selected ? ' is-selected' : ''}`}
      title={(ic.id ? ic.id + '. ' : '') + (ic.name || ic.alias || '')}
      onMouseEnter={() => hasAnim && setHover(true)}
      onMouseLeave={() => hasAnim && setHover(false)}
      onClick={() => onSelect(ic.id)}
      onDoubleClick={() => {
        onSelect(ic.id);
        onInsert(ic.id);
      }}
    >
      <AnimatedIcon
        ic={ic}
        color={color}
        sw={sw}
        fillOp={fillOp}
        play={hasAnim ? 'hover' : 'off'}
        hovering={hover}
      />
    </button>
  );
}

export default function IconPicker() {
  const panel = useUiStore((s) => s.panel);
  const setPanel = useUiStore((s) => s.setPanel);
  const listElId = useUiStore((s) => s.iconPickerForList);
  const editElId = useUiStore((s) => s.iconPickerForEl);
  const lang = useUiStore((s) => s.lang);
  const appliedThemeIdx = usePresentationStore((s) => s.appliedThemeIdx);
  const nav0 = useRef(loadIconNav());
  const pagesRef = useRef(nav0.current.pages);
  const [cat, setCat] = useState(() =>
    ICON_CATS.some((c) => c.id === nav0.current.cat) ? nav0.current.cat : 'all'
  );
  const [q, setQ] = useState('');
  const [page, setPage] = useState(nav0.current.page);
  const [sw, setSw] = useState(1.4);
  const [fillOp, setFillOp] = useState(0.3);
  const [selected, setSelected] = useState(null);

  const color = useMemo(() => defaultIconColor(appliedThemeIdx), [appliedThemeIdx]);

  const filtered = useMemo(() => {
    let list = iconsForCategory(cat);
    const needle = q.trim();
    if (!needle) return list;
    if (/^\d+$/.test(needle)) {
      const ic = getIconById(needle);
      return ic ? [ic] : [];
    }
    const ql = needle.toLowerCase();
    return list.filter(
      (ic) =>
        String(ic.name || '').toLowerCase().includes(ql) ||
        String(ic.alias || '').toLowerCase().includes(ql) ||
        String(ic.id).includes(needle)
    );
  }, [cat, q]);

  const searching = !!q.trim();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const curPage = Math.min(page, totalPages - 1);

  useEffect(() => {
    saveIconNav(cat, curPage, pagesRef.current, searching);
    if (!searching) pagesRef.current = { ...pagesRef.current, [cat]: curPage };
  }, [cat, curPage, searching]);

  if (panel !== 'icons') return null;
  const ru = lang !== 'en';

  const pageIcons = searching
    ? filtered.slice(0, PAGE)
    : filtered.slice(curPage * PAGE, (curPage + 1) * PAGE);
  const showPager = !searching && totalPages > 1;
  const from = filtered.length ? curPage * PAGE + 1 : 0;
  const to = Math.min(filtered.length, (curPage + 1) * PAGE);
  const countLab = showPager
    ? `${from}–${to} / ${filtered.length}`
    : ru
      ? `${filtered.length} иконок`
      : `${filtered.length} icons`;

  const previewColor = catPreviewColor();
  const selIc = selected ? getIconById(selected) : null;
  const previewFillOp = listElId ? 0 : fillOp;

  function applyIcon(id) {
    if (!id) {
      useUiStore.getState().showToast(ru ? 'Выберите иконку' : 'Pick an icon', 'warn');
      return;
    }
    if (listElId) {
      editorApi.setBulletIcon(id);
      setPanel(null);
      return;
    }
    if (editElId) {
      const ic = getIconById(id);
      if (!ic) return;
      const st = usePresentationStore.getState();
      const slide = st.slides[st.cur];
      const el = (slide?.els || []).find((e) => String(e.id) === String(editElId));
      const baseW = el?.w || 180;
      const baseH = el?.h || 180;
      const elColor = el?.iconColor || el?.textColor || color;
      const elSw = el?.iconSw != null ? el.iconSw : sw;
      const elFillOp = el?.iconFillOp != null ? el.iconFillOp : fillOp;
      const m = measureIconFit(ic, elSw, elFillOp, elColor, baseW, baseH);
      const patch = {
        iconId: String(ic.id),
        iconPath: ic.p || '',
        iconAnim: iconHasAnim(ic),
      };
      if (m) {
        patch.w = m.w;
        patch.h = m.h;
        patch.iconFitted = true;
      }
      useHistoryStore.getState().push();
      usePresentationStore.getState().patchElement(editElId, patch);
      setPanel(null);
      return;
    }
    editorApi.addIconFromLib(id, color, sw, fillOp);
  }

  function insert() {
    applyIcon(selected);
  }

  return (
    <div className="settings-backdrop" onClick={() => setPanel(null)} role="presentation">
      <div
        className="settings-modal icon-picker-modal picker-modal-v71"
        role="dialog"
        aria-modal="true"
        aria-label={listElId ? (ru ? 'Маркер списка' : 'List marker') : ru ? 'Значки' : 'Icons'}
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('IconPicker')}
      >
        <h2>{listElId ? (ru ? '🔍 Маркер списка' : '🔍 List marker') : ru ? '🔍 Значки' : '🔍 Icons'}</h2>
        <div className="icon-picker-toolbar">
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder={ru ? 'Поиск значков…' : 'Search icons…'}
          />
          {listElId ? null : (
          <GSlider
            className="icon-picker-gslider"
            label={ru ? 'Прозр. заливки' : 'Fill opacity'}
            min={0}
            max={1}
            step={0.05}
            value={fillOp}
            onChange={(v) => setFillOp(Math.max(0, Math.min(1, +v || 0)))}
          />
          )}
          <GSlider
            className="icon-picker-gslider"
            label={ru ? 'Толщина' : 'Stroke W'}
            min={0}
            max={20}
            step={0.1}
            value={sw}
            onChange={(v) => setSw(Math.max(0, +v || 0))}
          />
        </div>

        <div className="icon-cat-tabs">
          {ICON_CATS.map((c) => {
            const preview = c.id === 'all' ? null : iconsForCategory(c.id)[0];
            return (
              <button
                key={c.id}
                type="button"
                className={`icon-cat-cell${cat === c.id ? ' is-active' : ''}`}
                title={c.name}
                onClick={() => {
                  setCat(c.id);
                  const saved = pagesRef.current[c.id];
                  setPage(saved != null && Number.isFinite(+saved) ? Math.max(0, +saved) : 0);
                  setQ('');
                }}
              >
                {c.id === 'all' ? (
                  <span className="icon-cat-label">{ru ? 'Все' : 'All'}</span>
                ) : preview ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: buildIconSVG(preview, previewColor, 1.4, 0.3),
                    }}
                  />
                ) : (
                  <span className="icon-cat-label">?</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="icon-picker-grid icon-picker-grid-fixed">
          {pageIcons.map((ic) => (
            <IconPickerCell
              key={ic.id}
              ic={ic}
              color={color}
              sw={sw}
              fillOp={previewFillOp}
              selected={selected === ic.id}
              onSelect={setSelected}
              onInsert={(id) => applyIcon(id)}
            />
          ))}
        </div>

        <div className="picker-sel-name">{selIc ? (selIc.id ? selIc.id + '. ' : '') + (selIc.name || selIc.alias || '') : ''}</div>

        <div className="picker-mfooter">
          <span className="picker-count">{countLab}</span>
          <PickerPager
            page={curPage}
            totalPages={totalPages}
            hidden={!showPager}
            onPrev={() => setPage(curPage - 1)}
            onNext={() => setPage(curPage + 1)}
          />
          <div className="picker-mfooter-actions">
            <button type="button" className="react-props-btn" onClick={() => setPanel(null)}>
              {ru ? 'Отмена' : 'Cancel'}
            </button>
            <button type="button" className="primary" onClick={insert} disabled={!selected}>
              {listElId ? (ru ? 'Выбрать' : 'Choose') : ru ? 'Вставить' : 'Insert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

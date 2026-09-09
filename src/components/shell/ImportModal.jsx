import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { editorApi } from '../../editor/editorApi';
import { versionAttr } from '../../editor/versions.js';
import {
  getStoredImportBase,
  setStoredImportBase,
  listCatalogDir,
  prettyCatalogName,
  joinUrl,
  DEFAULT_IMPORT_BASE,
  fetchCatalogItemThumb,
} from '../../editor/importGallery.js';
import { APP_ICON_URL } from '../../editor/appBrand.js';

const LS_VIEW = 'slides_import_view';
const APP_ICON = APP_ICON_URL;

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] || null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function readViewMode() {
  try {
    const v = localStorage.getItem(LS_VIEW);
    if (v === 'list' || v === 'grid') return v;
  } catch (e) {}
  return 'grid';
}

function FolderIcon({ list }) {
  const w = list ? 16 : 64;
  const h = list ? 13 : 52;
  return (
    <svg className="ig-folder-svg" viewBox="0 0 64 52" width={w} height={h} aria-hidden>
      <path
        fill="#f59e0b"
        d="M2 10c0-2.2 1.8-4 4-4h16l4 5h32c2.2 0 4 1.8 4 4v29c0 2.2-1.8 4-4 4H6c-2.2 0-4-1.8-4-4V10z"
      />
      <path fill="#fbbf24" d="M2 18h60v25c0 2.2-1.8 4-4 4H6c-2.2 0-4-1.8-4-4V18z" />
    </svg>
  );
}

export default function ImportModal() {
  const open = useUiStore((s) => s.importModalOpen);
  const close = useUiStore((s) => s.closeImportModal);
  const lang = useUiStore((s) => s.lang);
  const ru = lang !== 'en';

  const stored0 = getStoredImportBase();
  const [baseDraft, setBaseDraft] = useState(stored0);
  const [base, setBase] = useState(stored0);
  const [relPath, setRelPath] = useState('');
  const [items, setItems] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusErr, setStatusErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(readViewMode);
  const [helpOpen, setHelpOpen] = useState(false);
  const gridRef = useRef(null);
  const thumbGen = useRef(0);

  const loadDir = useCallback(
    async (path, catalogBase) => {
      const b = catalogBase || base;
      thumbGen.current += 1;
      setLoading(true);
      setStatusErr(false);
      setThumbs({});
      setHelpOpen(false);
      setStatus(ru ? `Читаю ${joinUrl(b, path)}` : `Reading ${joinUrl(b, path)}`);
      try {
        const list = await listCatalogDir(b, path);
        setItems(list);
        setStatus(
          list.length
            ? ru
              ? `Найдено: ${list.length}`
              : `Found: ${list.length}`
            : ru
              ? 'Папка пуста'
              : 'Empty folder'
        );
      } catch (err) {
        setItems([]);
        setStatus(String(err.message || err));
        setStatusErr(true);
        setHelpOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [base, ru]
  );

  useEffect(() => {
    if (!open) return;
    const stored = getStoredImportBase();
    setBase(stored);
    setBaseDraft(stored);
    setRelPath('');
    setHelpOpen(false);
    setView(readViewMode());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void loadDir(relPath, base);
  }, [open, relPath, base, loadDir]);

  useEffect(() => {
    if (!open || loading || helpOpen || view === 'list' || busy) return undefined;
    const grid = gridRef.current;
    if (!grid || !items.length) return undefined;
    const gen = ++thumbGen.current;
    const pending = [];
    let running = 0;
    let cancelled = false;

    const pump = () => {
      while (!cancelled && running < 2 && pending.length) {
        const it = pending.shift();
        if (!it || it.type !== 'pres') continue;
        const key = String(it.file || it.name || '');
        running += 1;
        Promise.resolve()
          .then(() => fetchCatalogItemThumb(base, relPath, it))
          .then((url) => {
            if (cancelled || gen !== thumbGen.current || !url) return;
            setThumbs((prev) => (prev[key] ? prev : { ...prev, [key]: url }));
          })
          .catch(() => {})
          .finally(() => {
            running -= 1;
            pump();
          });
      }
    };

    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (gen !== thumbGen.current) return;
              entries.forEach((en) => {
                if (!en.isIntersecting) return;
                io.unobserve(en.target);
                const idx = +en.target.getAttribute('data-ig-i');
                const it = items[idx];
                if (it && it.type === 'pres') {
                  pending.push(it);
                  pump();
                }
              });
            },
            { root: grid, rootMargin: '120px' }
          );

    const cards = grid.querySelectorAll('[data-ig-i]');
    if (io) {
      cards.forEach((el) => io.observe(el));
    } else {
      items.forEach((it) => {
        if (it && it.type === 'pres') pending.push(it);
      });
      pump();
    }

    return () => {
      cancelled = true;
      thumbGen.current += 1;
      if (io) io.disconnect();
    };
  }, [open, loading, helpOpen, view, busy, items, base, relPath]);

  if (!open) return null;

  const applyBase = () => {
    const next = setStoredImportBase(baseDraft);
    setBase(next);
    setBaseDraft(next);
    setRelPath('');
  };

  const crumbs = (() => {
    const parts = relPath.replace(/\/$/, '').split('/').filter(Boolean);
    const rootLabel = (() => {
      try {
        const u = new URL(normSafe(base));
        const segs = u.pathname.split('/').filter(Boolean);
        return segs[segs.length - 1] || 'prezi';
      } catch (e) {
        return 'prezi';
      }
    })();
    const nodes = [{ label: rootLabel, depth: 0 }];
    parts.forEach((p, i) => nodes.push({ label: p, depth: i + 1 }));
    return nodes;
  })();

  function normSafe(u) {
    return String(u || '').endsWith('/') ? u : `${u}/`;
  }

  const goDepth = (depth) => {
    const all = relPath.replace(/\/$/, '').split('/').filter(Boolean);
    setRelPath(depth <= 0 ? '' : `${all.slice(0, depth).join('/')}/`);
  };

  const goUp = () => {
    if (!relPath) return;
    goDepth(Math.max(0, crumbs.length - 2));
  };

  const setViewMode = (mode) => {
    const v = mode === 'list' ? 'list' : 'grid';
    setView(v);
    setHelpOpen(false);
    try {
      localStorage.setItem(LS_VIEW, v);
    } catch (e) {}
  };

  const onItem = async (it) => {
    if (!it || busy) return;
    if (it.type === 'folder') {
      const id = String(it.id || it.name || '').replace(/^\/+|\/+$/g, '');
      setRelPath(`${relPath}${id}/`);
      return;
    }
    setBusy(true);
    try {
      const abs = joinUrl(base, `${relPath}${String(it.file || '').replace(/^\//, '')}`);
      const ok = await editorApi.importPresentationFromUrl(abs);
      if (ok) close();
    } finally {
      setBusy(false);
    }
  };

  const onLocal = async () => {
    const file = await pickFile(
      '.json,.slides.json,.html,.htm,.pptx,.ppt,.odp,application/json,text/html'
    );
    if (!file || busy) return;
    setBusy(true);
    close();
    try {
      await editorApi.importDroppedFile(file);
    } finally {
      setBusy(false);
    }
  };

  const listMode = view === 'list';

  return (
    <div className="settings-backdrop" onClick={close} role="presentation">
      <div
        className="settings-modal ig-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        onClick={(e) => e.stopPropagation()}
        {...versionAttr('ImportModal')}
      >
        <div className="ig-head">
          <h2 id="import-modal-title">{ru ? 'Импорт презентации' : 'Import presentation'}</h2>
          <button
            type="button"
            className={`ig-info-btn${helpOpen ? ' on' : ''}`}
            title={ru ? 'Справка по подключению каталога' : 'Catalog setup help'}
            aria-pressed={helpOpen}
            onClick={() => setHelpOpen((v) => !v)}
          >
            i
          </button>
        </div>

        <div className="ig-toolbar">
          <input
            type="url"
            spellCheck={false}
            value={baseDraft}
            onChange={(e) => setBaseDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyBase();
            }}
            placeholder={DEFAULT_IMPORT_BASE}
            aria-label={ru ? 'URL каталога' : 'Catalog URL'}
          />
          <button type="button" className="ig-mbtn" onClick={applyBase}>
            {ru ? 'Изменить' : 'Change'}
          </button>
        </div>

        {!helpOpen ? (
          <div className="ig-nav">
            <button
              type="button"
              className="ig-mbtn ig-back"
              disabled={!relPath || loading}
              onClick={goUp}
              title={ru ? 'Назад' : 'Back'}
            >
              ←
            </button>
            <div className="ig-crumbs">
              {crumbs.map((c, i) => (
                <React.Fragment key={`${c.depth}-${c.label}`}>
                  {i > 0 ? <span className="ig-sep">/</span> : null}
                  <button type="button" className="ig-crumb" onClick={() => goDepth(c.depth)}>
                    {c.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : null}

        <div className={`ig-status${statusErr ? ' err' : ''}`} hidden={helpOpen && !statusErr}>
          {helpOpen && !statusErr ? '' : status}
        </div>

        <div className={`ig-grid${listMode ? ' ig-list' : ''}`} ref={gridRef}>
          {helpOpen ? (
            <div className="ig-help ig-empty">
              {statusErr ? (
                <>
                  {ru ? 'Не удалось загрузить каталог.' : 'Could not load catalog.'}
                  <br />
                  <span className="ig-help-detail">{status}</span>
                  <br />
                  <br />
                </>
              ) : null}
              <span className="ig-help-note">
                {ru ? (
                  <>
                    Залейте в <code>prezi/</code> на сайте файлы <code>list.php</code> и{' '}
                    <code>get.php</code> из проекта. На HTTPS-сайте в корень (рядом с{' '}
                    <code>index.html</code>) также нужен <code>prezi-proxy.php</code>.
                  </>
                ) : (
                  <>
                    Upload <code>list.php</code> and <code>get.php</code> into the site{' '}
                    <code>prezi/</code> folder. On HTTPS also put <code>prezi-proxy.php</code>{' '}
                    next to <code>index.html</code>.
                  </>
                )}
              </span>
              {!statusErr ? (
                <p className="ig-help-note">
                  {ru
                    ? 'Укажите URL каталога в поле сверху и нажмите «Изменить».'
                    : 'Set the catalog URL above and click Change.'}
                </p>
              ) : null}
            </div>
          ) : loading ? (
            <div className="ig-loading">{ru ? 'Загрузка…' : 'Loading…'}</div>
          ) : !items.length ? (
            <div className="ig-empty">{ru ? 'Папка пуста' : 'Empty folder'}</div>
          ) : (
            items.map((it, i) => {
              const key = `${it.type}-${it.id || it.file || it.name}`;
              const thumbKey = String(it.file || it.name || '');
              const thumbSrc = thumbs[thumbKey] || it.thumb || '';
              const ready = !!thumbSrc;
              return (
                <button
                  key={key}
                  type="button"
                  className={`ig-card${it.type === 'folder' ? ' is-folder' : ''}`}
                  data-ig-i={i}
                  disabled={busy}
                  onClick={() => void onItem(it)}
                >
                  {it.type === 'folder' ? (
                    <span className="ig-folder-ico">
                      <FolderIcon list={listMode} />
                    </span>
                  ) : (
                    <div className={`ig-thumb${ready ? ' is-ready' : ''}`}>
                      {thumbSrc ? (
                        <img className="ig-thumb-preview" src={thumbSrc} alt="" />
                      ) : null}
                      <img className="ig-thumb-app" src={APP_ICON} alt="" />
                    </div>
                  )}
                  <div className="ig-label" title={it.name}>
                    {prettyCatalogName(it.name)}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="ig-footer">
          <button type="button" className="ig-mbtn" onClick={close}>
            {ru ? 'Закрыть' : 'Close'}
          </button>
          <div className="ig-view-toggle" role="group" aria-label={ru ? 'Вид' : 'View'}>
            <button
              type="button"
              className={`ig-view-btn${view === 'grid' ? ' on' : ''}`}
              title={ru ? 'Плитка' : 'Grid'}
              onClick={() => setViewMode('grid')}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              className={`ig-view-btn${view === 'list' ? ' on' : ''}`}
              title={ru ? 'Список' : 'List'}
              onClick={() => setViewMode('list')}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 6h13M8 12h13M8 18h13" />
                <rect x="3" y="4" width="3" height="3" rx="0.5" />
                <rect x="3" y="10" width="3" height="3" rx="0.5" />
                <rect x="3" y="16" width="3" height="3" rx="0.5" />
              </svg>
            </button>
          </div>
          <button type="button" className="ig-mbtn ig-mbtn-pri" onClick={() => void onLocal()} disabled={busy}>
            📁 {ru ? 'С компьютера…' : 'From computer…'}
          </button>
        </div>
      </div>
    </div>
  );
}

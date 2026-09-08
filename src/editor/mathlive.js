/** Lazy-load local MathLive for the formula editor. */

let loading = null;

function ensureMathLiveCss() {
  if (document.getElementById('mathlive-fonts-css')) return;
  const lnk = document.createElement('link');
  lnk.id = 'mathlive-fonts-css';
  lnk.rel = 'stylesheet';
  lnk.href = '/libs/mathlive/mathlive-static.css';
  document.head.appendChild(lnk);
}

function ensureMathLiveThemeCss() {
  const css = `
    math-field {
      --hue: 240;
      --caret-color: var(--accent, #6366f1);
      --selection-background-color: color-mix(in srgb, var(--accent, #6366f1) 35%, transparent);
      --contains-highlight-background-color: transparent;
      --placeholder-color: color-mix(in srgb, var(--text, #111) 45%, transparent);
      --placeholder-opacity: 0.35;
      --primary-color: var(--accent, #6366f1);
      background: transparent;
      color: var(--text, #111);
      border: none;
      outline: none;
      padding: 4px;
      min-height: 54px;
      width: 100%;
      font-size: 24px;
      cursor: text;
    }
    math-field:focus { outline: none; }
    math-field::part(toolbar) { display: none !important; }
    math-field::part(virtual-keyboard-toggle) { display: none !important; }
    .ML__keyboard { display: none !important; }
    .ML__popover { z-index: 99999; }
  `;
  let style = document.getElementById('mathlive-theme-css');
  if (!style) {
    style = document.createElement('style');
    style.id = 'mathlive-theme-css';
    document.head.appendChild(style);
  }
  style.textContent = css;
}

function isMathFieldDefined() {
  try {
    return !!(typeof customElements !== 'undefined' && customElements.get('math-field'));
  } catch (e) {
    return false;
  }
}

/** Some UMD builds expose MathfieldElement without auto-define in edge cases. */
function ensureMathFieldDefined() {
  if (isMathFieldDefined()) return true;
  const MFE =
    (typeof globalThis !== 'undefined' && globalThis.MathfieldElement) ||
    (typeof window !== 'undefined' && window.MathLive && window.MathLive.MathfieldElement);
  if (MFE && typeof customElements !== 'undefined') {
    try {
      if (!customElements.get('math-field')) customElements.define('math-field', MFE);
    } catch (e) {}
  }
  return isMathFieldDefined();
}

function loadScriptOnce(id, src) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      if (ensureMathFieldDefined()) {
        resolve(true);
        return;
      }
      existing.addEventListener('load', () => resolve(ensureMathFieldDefined()));
      existing.addEventListener('error', () => reject(new Error('MathLive script error')));
      return;
    }
    const s = document.createElement('script');
    s.id = id;
    s.src = src;
    s.async = true;
    s.onload = () => resolve(ensureMathFieldDefined());
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Resolves true when math-field is available.
 * Prefers local /libs/mathlive; CDN only as last resort.
 */
export function loadMathLive() {
  ensureMathLiveCss();
  ensureMathLiveThemeCss();

  if (ensureMathFieldDefined()) return Promise.resolve(true);
  if (loading) return loading;

  loading = (async () => {
    try {
      const ok = await loadScriptOnce('mathlive-local', '/libs/mathlive/mathlive.min.js');
      if (ok) return true;
    } catch (e) {
      console.warn('[mathlive] local load failed', e);
    }
    // Poll briefly — define sometimes runs after onload microtasks
    for (let i = 0; i < 20; i++) {
      if (ensureMathFieldDefined()) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const okCdn = await loadScriptOnce(
          'mathlive-cdn',
          'https://unpkg.com/mathlive@0.109.0/dist/mathlive.min.js'
        );
        if (okCdn) return true;
      } catch (e) {
        console.warn('[mathlive] CDN load failed', e);
      }
    }
    return ensureMathFieldDefined();
  })().finally(() => {
    loading = null;
  });

  return loading;
}

export function mfHasSelection(mf) {
  if (!mf) return false;
  try {
    const sel = mf.selection;
    if (sel?.ranges?.length) {
      const [a, b] = sel.ranges[0];
      if (a !== b) return true;
    }
  } catch (e) {}
  try {
    const t = mf.getValue('selection', 'latex');
    if (t && String(t).trim()) return true;
  } catch (e) {}
  return false;
}

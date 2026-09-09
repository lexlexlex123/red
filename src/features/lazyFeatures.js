/**
 * Lazy-load heavy editor features in the React host (no legacy iframe).
 */

const cache = new Map();

async function once(key, loader) {
  if (cache.has(key)) return cache.get(key);
  const p = loader().catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, p);
  return p;
}

export function loadMathJax() {
  return once('mathjax', async () => {
    const { loadMathJax: load } = await import('../editor/mathjax.js');
    return load();
  });
}

export function loadVoiceModule() {
  return once('voice', async () => import('./voiceLazy.js'));
}

export function loadTranslateModule() {
  return once('translate', async () => import('./translateLazy.js'));
}

export function loadModel3dModule() {
  return once('model3d', async () => import('./model3dLazy.js'));
}

export function loadAiModule() {
  return once('ai', async () => import('./aiLazy.js'));
}

export function loadPptxImport() {
  return once('pptx', async () => import('./pptxLazy.js'));
}

export function loadThemeRenderer(name) {
  return once(`theme:${name}`, async () => {
    const { ensureGlRenderersLoaded } = await import('../editor/layouts.js');
    await ensureGlRenderersLoaded();
    return true;
  });
}

export const lazyFeatures = {
  loadMathJax,
  loadVoiceModule,
  loadTranslateModule,
  loadModel3dModule,
  loadAiModule,
  loadPptxImport,
  loadThemeRenderer,
};

export default lazyFeatures;

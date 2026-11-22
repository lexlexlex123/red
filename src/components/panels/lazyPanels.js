/**
 * Shared dynamic imports for right-panel chunks.
 * Boot awaits these so the splash stays up until PropsPanel (etc.) is cached —
 * otherwise selecting an object shows "…" for many seconds on slow hosts.
 */

export const loadPropsPanel = () => import('./PropsPanel.jsx');
export const loadSlidePropsPanel = () => import('./SlidePropsPanel.jsx');
export const loadDrawingPanel = () => import('./DrawingPanel.jsx');
export const loadAnimPanel = () => import('./AnimPanel.jsx');
export const loadObjectsPanel = () => import('./ObjectsPanel.jsx');

/** Prefetch panels the editor needs right away (properties on select). */
export async function preloadCriticalPanels(onStep) {
  const steps = [
    ['props', loadPropsPanel],
    ['slide', loadSlidePropsPanel],
    ['drawing', loadDrawingPanel],
    ['anim', loadAnimPanel],
    ['objects', loadObjectsPanel],
  ];
  for (let i = 0; i < steps.length; i++) {
    const [id, load] = steps[i];
    try {
      onStep?.(id, i, steps.length);
      await load();
    } catch (e) {
      console.warn('[preloadCriticalPanels]', id, e);
    }
  }
}

/** Sandbox attrs for applet iframes (kept free of heavy applet deps). */

export const APPLET_SANDBOX = 'allow-scripts';
export const APPLET_SANDBOX_FLIP = 'allow-scripts allow-same-origin';

export function appletSandbox(el) {
  return el?.appletId === 'flip' ? APPLET_SANDBOX_FLIP : APPLET_SANDBOX;
}

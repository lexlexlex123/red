import { loadScript } from './loadScript.js';

export async function ensureJSZip() {
  if (window.JSZip) return window.JSZip;
  await loadScript('/libs/jszip.min.js');
  if (!window.JSZip) throw new Error('JSZip unavailable');
  return window.JSZip;
}

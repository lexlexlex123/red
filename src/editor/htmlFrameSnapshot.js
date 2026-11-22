import { buildHfSrcdoc, HF_SANDBOX } from './htmlFrame.js';
import { loadScript } from '../shared/loadScript.js';

const SNAPSHOT_TIMEOUT_MS = 20000;

function snapshotBridge(token) {
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  const start = Date.now();
  const minWait = 300;
  const maxWait = 12000;
  const stableWait = 500;
  let changedAt = start;
  let sent = false;
  const pendingTimers = new Set();
  let pendingRequests = 0;

  window.setTimeout = function (callback, delay, ...args) {
    const wait = Math.max(0, Number(delay) || 0);
    if (typeof callback !== 'function' || wait < 100 || wait > maxWait) {
      return nativeSetTimeout(callback, delay, ...args);
    }
    let timer;
    timer = nativeSetTimeout(() => {
      pendingTimers.delete(timer);
      changedAt = Date.now();
      callback(...args);
    }, wait);
    pendingTimers.add(timer);
    return timer;
  };

  window.clearTimeout = function (timer) {
    pendingTimers.delete(timer);
    return nativeClearTimeout(timer);
  };

  if (typeof window.fetch === 'function') {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (...args) => {
      pendingRequests += 1;
      changedAt = Date.now();
      let request;
      try {
        request = nativeFetch(...args);
      } catch (error) {
        pendingRequests -= 1;
        changedAt = Date.now();
        throw error;
      }
      request.then(
        () => {
          pendingRequests = Math.max(0, pendingRequests - 1);
          changedAt = Date.now();
        },
        () => {
          pendingRequests = Math.max(0, pendingRequests - 1);
          changedAt = Date.now();
        }
      );
      return request;
    };
  }

  const nativeXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    pendingRequests += 1;
    changedAt = Date.now();
    this.addEventListener(
      'loadend',
      () => {
        pendingRequests = Math.max(0, pendingRequests - 1);
        changedAt = Date.now();
      },
      { once: true }
    );
    try {
      return nativeXhrSend.apply(this, args);
    } catch (error) {
      pendingRequests = Math.max(0, pendingRequests - 1);
      changedAt = Date.now();
      throw error;
    }
  };

  function sendSnapshot() {
    if (sent) return;
    sent = true;
    try {
      document.getAnimations({ subtree: true }).forEach((animation) => {
        const timing = animation.effect?.getComputedTiming();
        if (timing?.endTime !== Infinity && animation.playState !== 'finished') {
          animation.finish();
        }
      });
      const originalNodes = [document.body, ...document.body.querySelectorAll('*')];
      const body = document.body.cloneNode(true);
      const clonedNodes = [body, ...body.querySelectorAll('*')];
      originalNodes.forEach((original, index) => {
        const clone = clonedNodes[index];
        if (!clone || original.nodeType !== Node.ELEMENT_NODE) return;
        const computed = getComputedStyle(original);
        for (let i = 0; i < computed.length; i++) {
          const property = computed[i];
          clone.style.setProperty(
            property,
            computed.getPropertyValue(property),
            computed.getPropertyPriority(property)
          );
        }
        if (original instanceof HTMLCanvasElement) {
          const image = document.createElement('img');
          image.src = original.toDataURL('image/png');
          image.alt = '';
          image.width = original.width;
          image.height = original.height;
          image.style.cssText = clone.style.cssText;
          for (const attr of [...clone.attributes]) {
            if (attr.name !== 'style' && attr.name !== 'width' && attr.name !== 'height') {
              image.setAttribute(attr.name, attr.value);
            }
          }
          image.style.objectFit = computed.objectFit;
          clone.replaceWith(image);
        } else if (original instanceof HTMLVideoElement && original.readyState >= 2) {
          const frame = document.createElement('canvas');
          frame.width = Math.max(1, original.videoWidth);
          frame.height = Math.max(1, original.videoHeight);
          frame.getContext('2d').drawImage(original, 0, 0, frame.width, frame.height);
          const image = document.createElement('img');
          image.src = frame.toDataURL('image/png');
          image.alt = '';
          image.width = frame.width;
          image.height = frame.height;
          image.style.cssText = clone.style.cssText;
          for (const attr of [...clone.attributes]) {
            if (attr.name !== 'style' && attr.name !== 'width' && attr.name !== 'height') {
              image.setAttribute(attr.name, attr.value);
            }
          }
          image.style.objectFit = computed.objectFit;
          clone.replaceWith(image);
        } else if (original instanceof HTMLInputElement) {
          clone.setAttribute('value', original.value);
          if (original.checked) clone.setAttribute('checked', '');
          else clone.removeAttribute('checked');
        } else if (original instanceof HTMLTextAreaElement) {
          clone.textContent = original.value;
        } else if (original instanceof HTMLSelectElement) {
          [...clone.options].forEach((option, optionIndex) => {
            if (original.options[optionIndex]?.selected) option.setAttribute('selected', '');
            else option.removeAttribute('selected');
          });
        }
      });
      body.querySelectorAll('script, style, link, meta, base, iframe, object, embed').forEach((node) => node.remove());
      body.querySelectorAll('*').forEach((node) => {
        for (const attr of [...node.attributes]) {
          if (
            /^on/i.test(attr.name) ||
            (/^(href|src|xlink:href)$/i.test(attr.name) && /^\s*javascript:/i.test(attr.value))
          ) {
            node.removeAttribute(attr.name);
          }
        }
      });
      parent.postMessage({ type: 'html-frame-snapshot', token, html: body.outerHTML }, '*');
    } catch (error) {
      parent.postMessage(
        {
          type: 'html-frame-snapshot-error',
          token,
          error: error instanceof Error ? error.message : String(error),
        },
        '*'
      );
    }
  }

  function checkStable() {
    try {
      const elapsed = Date.now() - start;
      const imagesReady = [...document.images].every((image) => image.complete);
      const stable =
        elapsed >= minWait &&
        Date.now() - changedAt >= stableWait &&
        document.readyState === 'complete' &&
        pendingTimers.size === 0 &&
        pendingRequests === 0 &&
        imagesReady;
      if (elapsed >= maxWait || stable) {
        const fontsReady = document.fonts?.ready || Promise.resolve();
        const imageDecodes = [...document.images]
          .filter((image) => image.complete && image.naturalWidth > 0 && image.decode)
          .map((image) => image.decode().catch(() => {}));
        Promise.all([
          Promise.race([
            fontsReady,
            new Promise((resolve) => nativeSetTimeout(resolve, 2000)),
          ]),
          Promise.race([
            Promise.all(imageDecodes),
            new Promise((resolve) => nativeSetTimeout(resolve, 3000)),
          ]),
          new Promise((resolve) => nativeSetTimeout(resolve, 50)),
        ]).then(sendSnapshot, sendSnapshot);
        return;
      }
      nativeSetTimeout(checkStable, 100);
    } catch (error) {
      if (sent) return;
      sent = true;
      parent.postMessage(
        {
          type: 'html-frame-snapshot-error',
          token,
          error: error instanceof Error ? error.message : String(error),
        },
        '*'
      );
    }
  }

  function observe() {
    if (!document.body) {
      nativeSetTimeout(observe, 25);
      return;
    }
    const observer = new MutationObserver(() => {
      changedAt = Date.now();
    });
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
    nativeSetTimeout(checkStable, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observe, { once: true });
  } else {
    observe();
  }
}

function addSnapshotBridge(src, token) {
  const parsed = new DOMParser().parseFromString(src, 'text/html');
  const bridge = parsed.createElement('script');
  bridge.textContent = `(${snapshotBridge.toString()})(${JSON.stringify(token)});`;
  parsed.head.prepend(bridge);
  return `${parsed.doctype?.outerHTML || '<!doctype html>'}${parsed.documentElement.outerHTML}`;
}

async function ensureSnapdom() {
  if (typeof window.snapdom === 'function') return window.snapdom;
  await loadScript('/libs/snapdom.min.js');
  if (typeof window.snapdom !== 'function') throw new Error('snapdom unavailable');
  return window.snapdom;
}

export async function captureHtmlFrameSnapshot(src, width, height) {
  const frameWidth = Math.max(1, Math.round(width || 1));
  const frameHeight = Math.max(1, Math.round(height || 1));
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const renderer = document.createElement('iframe');
  renderer.setAttribute('sandbox', HF_SANDBOX);
  renderer.title = 'HTML frame snapshot';
  renderer.style.cssText =
    `position:fixed;left:-10000px;top:0;width:${frameWidth}px;height:${frameHeight}px;border:0;`;
  const html = addSnapshotBridge(buildHfSrcdoc(src), token);

  let removeListener = () => {};
  const snapshotPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      removeListener();
      reject(new Error('Embedded HTML did not finish rendering in time'));
    }, SNAPSHOT_TIMEOUT_MS);
    const onMessage = (event) => {
      if (
        event.source !== renderer.contentWindow ||
        !['html-frame-snapshot', 'html-frame-snapshot-error'].includes(event.data?.type) ||
        event.data?.token !== token
      ) {
        return;
      }
      clearTimeout(timeout);
      removeListener();
      if (event.data.type === 'html-frame-snapshot-error') {
        reject(new Error(`Could not serialize embedded HTML: ${event.data.error || 'unknown error'}`));
      } else {
        resolve(event.data.html);
      }
    };
    removeListener = () => window.removeEventListener('message', onMessage);
    window.addEventListener('message', onMessage);
  });

  let renderRoot;
  document.body.appendChild(renderer);
  try {
    renderer.srcdoc = html;
    const serializedBody = await snapshotPromise;
    const parsed = new DOMParser().parseFromString(serializedBody, 'text/html');
    renderRoot = document.createElement('div');
    renderRoot.setAttribute('aria-hidden', 'true');
    renderRoot.style.cssText =
      `all:initial;display:block;position:fixed;left:-10000px;top:0;width:${frameWidth}px;height:${frameHeight}px;overflow:hidden;pointer-events:none;`;
    renderRoot.appendChild(document.importNode(parsed.body, true));
    document.body.appendChild(renderRoot);

    const snap = await ensureSnapdom();
    let canvas = null;
    const options = {
      width: frameWidth,
      height: frameHeight,
      scale: 1,
      dpr: 1,
      backgroundColor: null,
      embedFonts: false,
    };
    if (typeof snap.toCanvas === 'function') {
      canvas = await snap.toCanvas(renderRoot, options);
    } else {
      const result = await snap(renderRoot, options);
      if (result && typeof result.toCanvas === 'function') canvas = await result.toCanvas();
      else if (result instanceof HTMLCanvasElement) canvas = result;
    }
    if (!canvas?.width) throw new Error('Empty HTML frame snapshot');
    return canvas;
  } finally {
    renderRoot?.remove();
    renderer.remove();
  }
}

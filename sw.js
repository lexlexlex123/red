/* Service worker — офлайн-кэш для PWA «Слайды» */
importScripts('./pwa-precache-images.js');

const CACHE = 'slides-pwa-v7';

/** Критичные файлы оболочки (галерея — в PRECACHE_IMAGES). */
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './fonts/fonts.css',
  './fonts/fonts-list.js',
  './fonts/fonts-data.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './libs/qrcode.min.js',
  './libs/jszip.min.js',
  './libs/jquery.min.js',
  './libs/turn.min.js',
  './images/image-index.js',
  './js/00-file-protocol.js',
  './js/00-pwa.js',
  './js/00-i18n.js',
  './js/00-bus.js',
  './js/00-guard.js',
  './js/01-state.js',
  './js/02-applets.js',
  './js/02b-icons.js',
  './js/03-boot.js',
  './js/04-ui.js',
  './js/05-backgrounds.js',
  './js/06-themes.js',
  './js/07-transitions.js',
  './js/08-serialize.js',
  './js/08-slides.js',
  './js/09-shapes.js',
  './js/10-animations.js',
  './js/11-elements.js',
  './js/12-markdown.js',
  './js/13-images.js',
  './js/13b-imgcrop.js',
  './js/14-drag.js',
  './js/15-align.js',
  './js/16-props.js',
  './js/17-text.js',
  './js/18-motion.js',
  './js/19-hover.js',
  './js/20-thumbnails.js',
  './js/21-keyboard.js',
  './js/22-undo.js',
  './js/23-layout.js',
  './js/23b-crystal-webgl.js',
  './js/23d-dna-webgl.js',
  './js/23e-galaxy-webgl.js',
  './js/23f-caustics-webgl.js',
  './js/24-preview.js',
  './js/25-links.js',
  './js/26-export.js',
  './js/27-persist.js',
  './js/28-multisel.js',
  './js/28-filedrop.js',
  './js/29-icons.js',
  './js/30-rich-text.js',
  './js/31-table.js',
  './js/32-scrubber.js',
  './js/33-objects.js',
  './js/33-pagenum.js',
  './js/33b-autoplace.js',
  './js/33c-autofit.js',
  './js/34-config.js',
  './js/35-htmlframe.js',
  './js/35-ai.js',
  './js/36-formula.js',
  './js/36-ai.js',
  './js/37-graph.js',
  './js/38-connectors.js',
  './js/39-improvements.js',
  './js/40-images-modal.js',
  './js/40-local-ai.js',
  './js/41-lego.js',
  './js/42-dictation.js',
  './js/44-group.js',
  './js/45-media.js',
  './js/46-cross-clipboard.js',
  './js/50-voice.js',
  './config/canvas.js',
  './config/animations.js',
  './config/themes.js',
  './config/shapes.js',
  './config/ui.js',
  './config/persist.js',
  './config/loader.js',
  './config/backgrounds.js',
  './config/transitions.js',
  './config/pagenum.js',
  './config/applets.js',
  './config/images.js',
  './config/code.js',
  './config/drag.js',
  './config/export.js',
  './config/preview.js',
  './config/text.js'
];

function allPrecacheUrls() {
  const extra = typeof PRECACHE_IMAGES !== 'undefined' ? PRECACHE_IMAGES : [];
  return PRECACHE.concat(extra);
}

function cacheMatchUrl(cache, req) {
  return cache.match(req).then((hit) => {
    if (hit) return hit;
    try {
      const u = new URL(req.url);
      const dec = u.pathname
        .split('/')
        .map((s) => {
          try {
            return decodeURIComponent(s);
          } catch (e) {
            return s;
          }
        })
        .join('/');
      if (dec !== u.pathname) {
        return cache.match(u.origin + dec + u.search);
      }
    } catch (e) {}
    return null;
  });
}

function precacheAll(cache, urls) {
  return Promise.allSettled(
    urls.map((u) =>
      cache.add(u).catch(() => cache.add(new URL(u, self.location).href))
    )
  );
}

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE).then((cache) => precacheAll(cache, allPrecacheUrls())).then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (ev) => {
  if (ev.data && ev.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function sameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch (e) {
    return false;
  }
}

function isCacheable(req) {
  if (req.method !== 'GET') return false;
  const u = new URL(req.url);
  if (!sameOrigin(req.url)) return false;
  if (u.pathname.includes('/.')) return false;
  return true;
}

/** JS/CSS — сначала сеть, иначе кэш (чтобы обновления AI и логики доходили сразу). */
function isNetworkFirst(req) {
  const p = new URL(req.url).pathname.toLowerCase();
  return p.endsWith('.js') || p.endsWith('.css');
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (!isCacheable(req)) return;

  const accept = req.headers.get('accept') || '';
  const nav = req.mode === 'navigate' || accept.includes('text/html');

  if (nav) {
    ev.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('./index.html'))
        )
    );
    return;
  }

  if (isNetworkFirst(req)) {
    ev.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.open(CACHE).then((cache) => cacheMatchUrl(cache, req))
        )
    );
    return;
  }

  ev.respondWith(
    caches.open(CACHE).then((cache) =>
      cacheMatchUrl(cache, req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              cache.put(req, copy);
            }
            return res;
          })
          .catch(() => cacheMatchUrl(cache, req));
      })
    )
  );
});

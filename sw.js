/* Service worker — офлайн-кэш для PWA «Слайды» (React v8 shell + on-demand legacy) */
importScripts('./pwa-precache-images.js');

const CACHE = 'slides-pwa-v384';

/**
 * Shell-only install precache. Themes/fonts/js load via fetch→cache
 * (stale-while-revalidate). legacy.html is not on the React editor path.
 */
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './fonts/fonts.css',
  './fonts/fonts-list.js',
  './fonts/fonts-data.js',
  './icon-192.png',
  './icon-512.png',
  './icon.svg',
  './icons/icon.svg',
  './icons/file-document-192.png',
  './icons/file-document-512.png',
  './libs/qrcode.min.js',
  './libs/jszip.min.js',
  './libs/snapdom.min.js',
  './images/image-index.js',
  './audio/audio-list.js',
];

const HEAVY_PRECACHE = [
  './libs/mathjax/tex-svg.js',
  './libs/mathlive/mathlive.min.js',
  './libs/mathlive/mathlive-static.css',
  './libs/mathlive/mathlive-fonts.css',
  './libs/bergamot/translator-worker.js',
  './libs/bergamot/bergamot-translator-worker.js',
  './libs/bergamot/bergamot-translator-worker.wasm',
  './libs/translate-models/enru/model.enru.intgemm.alphas.bin',
  './libs/translate-models/enru/lex.50.50.enru.s2t.bin',
  './libs/translate-models/enru/vocab.enru.spm',
  './libs/translate-models/ruen/model.ruen.intgemm.alphas.bin',
  './libs/translate-models/ruen/lex.50.50.ruen.s2t.bin',
  './libs/translate-models/ruen/vocab.ruen.spm',
];

function shellPrecacheUrls() {
  return PRECACHE.slice();
}

function heavyPrecacheUrls() {
  const extra = typeof PRECACHE_IMAGES !== 'undefined' ? PRECACHE_IMAGES : [];
  return HEAVY_PRECACHE.concat(extra);
}

function stripSearchHash(url) {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    return u.href;
  } catch (e) {
    return String(url).split('#')[0].split('?')[0];
  }
}

function isNavigationRequest(req) {
  const accept = req.headers.get('accept') || '';
  return req.mode === 'navigate' || accept.includes('text/html');
}

function cacheLookupUrls(req) {
  const out = [];
  const add = (u) => {
    if (u && out.indexOf(u) === -1) out.push(u);
  };
  add(req.url);
  add(stripSearchHash(req.url));
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
    add(u.origin + dec);
    add(u.origin + dec + u.search);
    if (isNavigationRequest(req)) {
      add(new URL('./index.html', self.location).href);
      add(new URL('./', self.location).href);
      add(u.origin + '/index.html');
      add(u.origin + '/');
    }
  } catch (e) {}
  return out;
}

function cacheMatchUrl(cache, req) {
  const urls = cacheLookupUrls(req);
  let i = 0;
  function next() {
    if (i >= urls.length) return Promise.resolve(null);
    const url = urls[i++];
    return cache.match(url).then((hit) => (hit ? hit : next()));
  }
  return next();
}

function cachePutNormalized(cache, req, res) {
  // Keep ?v= for theme/renderers so version bumps are not collapsed onto one stale entry.
  const u = String(req.url || '');
  const key = /\/themes\//i.test(u) ? stripHashOnly(u) : stripSearchHash(u);
  return cache.put(key, res);
}

function stripHashOnly(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.href;
  } catch (e) {
    return String(url).split('#')[0];
  }
}

/** Network first for theme scripts — SW must not serve yesterday's dna-webgl.js. */
function networkFirst(req) {
  return fetch(req, { cache: 'no-store' })
    .then((res) => {
      if (res && res.ok) {
        caches.open(CACHE).then((cache) => cachePutNormalized(cache, req, res.clone())).catch(() => {});
      }
      return res;
    })
    .catch(() =>
      caches.open(CACHE).then((cache) =>
        cache.match(req.url).then((hit) => hit || cacheMatchUrl(cache, req))
      )
    );
}

/** Кэш сразу (офлайн), сеть — для обновления в фоне. */
function staleWhileRevalidate(req) {
  return caches.open(CACHE).then((cache) =>
    cacheMatchUrl(cache, req).then((cached) => {
      const net = fetch(req, { cache: 'no-store' })
        .then((res) => {
          if (res && res.ok) cachePutNormalized(cache, req, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        net;
        return cached;
      }
      return net.then((r) => r);
    })
  );
}

function respondNavigation(req) {
  return caches.open(CACHE).then((cache) =>
    cacheMatchUrl(cache, req).then((cached) => {
      const net = fetch(req, { cache: 'no-store' })
        .then((res) => {
          if (res && res.ok) cachePutNormalized(cache, req, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        net;
        return cached;
      }
      return net.then((r) => {
        if (r) return r;
        return cacheMatchUrl(cache, new Request(new URL('./index.html', self.location).href));
      });
    })
  );
}

function precacheAll(cache, urls) {
  return Promise.allSettled(
    urls.map((u) => cache.add(u).catch(() => cache.add(new URL(u, self.location).href)))
  );
}

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE).then((cache) => precacheAll(cache, shellPrecacheUrls())).then(() => {
      if (!self.registration.active) return self.skipWaiting();
    })
  );
});

self.addEventListener('message', (ev) => {
  if (ev.data && ev.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        caches.open(CACHE).then((cache) => precacheAll(cache, heavyPrecacheUrls()));
      })
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
  if (u.pathname.toLowerCase().endsWith('.php')) return false;
  return true;
}

/** JS/CSS/HTML-оболочка — кэш первым (офлайн), сеть обновляет в фоне. */
function isShellAsset(req) {
  const p = new URL(req.url).pathname.toLowerCase();
  return p.endsWith('.js') || p.endsWith('.css');
}

function isThemeAsset(req) {
  const p = new URL(req.url).pathname.toLowerCase();
  return p.includes('/themes/');
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (!isCacheable(req)) return;

  if (isNavigationRequest(req)) {
    ev.respondWith(respondNavigation(req));
    return;
  }

  // Theme/WebGL renderers change often — never serve stripped-query stale JS first.
  if (isThemeAsset(req)) {
    ev.respondWith(networkFirst(req));
    return;
  }

  if (isShellAsset(req)) {
    ev.respondWith(staleWhileRevalidate(req));
    return;
  }

  ev.respondWith(
    caches.open(CACHE).then((cache) =>
      cacheMatchUrl(cache, req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res && res.ok) cachePutNormalized(cache, req, res.clone());
            return res;
          })
          .catch(() => cacheMatchUrl(cache, req));
      })
    )
  );
});

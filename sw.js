/* Service worker — офлайн-кэш для PWA «Слайды» (React v8 shell + on-demand legacy) */
importScripts('./pwa-precache-images.js');
try {
  importScripts('./pwa-precache-assets.js');
} catch (e) {}

const CACHE = 'slides-pwa-v389';
const SW_VERSION = 'react389';

/**
 * Shell + classroom pack (fonts, one theme, a few gallery images).
 * Remaining themes/fonts/js load via fetch→cache. Hashed Vite bundles
 * come from pwa-precache-assets.js (written on build).
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
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/file-document-192.png',
  './icons/file-document-512.png',
  './screenshots/wide.jpg',
  './screenshots/narrow.jpg',
  './libs/qrcode.min.js',
  './libs/jszip.min.js',
  './libs/snapdom.min.js',
  './images/image-index.js',
  './audio/audio-list.js',
  './src/export/playback.html',
  './themes/00-engine.js',
  './themes/00-variants.js',
  './themes/07-dusk.js',
  './themes/loader.js',
  './themes/manifest.json',
  './themes/forest/paths.js',
  './themes/forest/paths-content.js',
  './themes/forest/layout.js',
  './images/nature/wild (14).png',
  './images/nature/wild (15).png',
  './images/nature/wild (16).png',
  './images/animals/123.png',
  './images/animals/wild.png',
  './images/birds/122 (1).png',
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
  const extra = typeof PRECACHE_ASSETS !== 'undefined' ? PRECACHE_ASSETS : [];
  return PRECACHE.concat(extra);
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

function stripHashOnly(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.href;
  } catch (e) {
    return String(url).split('#')[0];
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

function matchAnyCache(req) {
  return caches.open(CACHE).then((cache) =>
    cacheMatchUrl(cache, req).then((hit) => {
      if (hit) return hit;
      return caches.keys().then((keys) => {
        const rest = keys.filter((k) => k !== CACHE);
        const walk = (i) => {
          if (i >= rest.length) return Promise.resolve(null);
          return caches.open(rest[i]).then((c) => cacheMatchUrl(c, req).then((h) => (h ? h : walk(i + 1))));
        };
        return walk(0);
      });
    })
  );
}

function cachePutNormalized(cache, req, res) {
  const u = String(req.url || '');
  const key = /\/themes\//i.test(u) ? stripHashOnly(u) : stripSearchHash(u);
  return cache.put(key, res);
}

function sameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch (e) {
    return false;
  }
}

function urlsFromHtml(html, baseHref) {
  const found = [];
  const add = (raw) => {
    if (!raw || raw.startsWith('data:')) return;
    try {
      const abs = new URL(raw, baseHref).href;
      if (!sameOrigin(abs)) return;
      const path = new URL(abs).pathname;
      if (/\.(js|mjs|css|jsx)(\?|$)/i.test(path) || path.includes('/assets/')) {
        if (found.indexOf(abs) === -1) found.push(abs);
      }
    } catch (e) {}
  };
  const re = /\b(?:src|href)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html || ''))) add(m[1]);
  return found;
}

function precacheAll(cache, urls) {
  return Promise.allSettled(
    urls.map((u) => cache.add(u).catch(() => cache.add(new URL(u, self.location).href)))
  );
}

async function precacheDocumentAssets(cache) {
  const indexUrl = new URL('./index.html', self.location).href;
  let res = await cache.match(indexUrl);
  if (!res) {
    try {
      res = await fetch(indexUrl, { cache: 'no-store' });
      if (res && res.ok) await cache.put(indexUrl, res.clone());
    } catch (e) {
      return;
    }
  }
  if (!res || !res.ok) return;
  let html = '';
  try {
    html = await res.clone().text();
  } catch (e) {
    return;
  }
  const urls = urlsFromHtml(html, indexUrl);
  const playUrl = new URL('./src/export/playback.html', self.location).href;
  try {
    const play = (await cache.match(playUrl)) || (await fetch(playUrl, { cache: 'no-store' }).catch(() => null));
    if (play && play.ok) {
      await cache.put(playUrl, play.clone());
      const phtml = await play.clone().text();
      urlsFromHtml(phtml, playUrl).forEach((u) => urls.push(u));
    }
  } catch (e) {}
  if (urls.length) await precacheAll(cache, urls);
}

function networkFirst(req, ms) {
  const net = fetch(req, { cache: 'no-store' })
    .then((res) => {
      if (res && res.ok) {
        caches.open(CACHE).then((cache) => cachePutNormalized(cache, req, res.clone())).catch(() => {});
      }
      return res;
    })
    .catch(() => null);
  const limit = new Promise((resolve) => setTimeout(() => resolve(null), ms || 2500));
  return Promise.race([net, limit]).then((res) => {
    if (res && res.ok) return res;
    return matchAnyCache(req).then((cached) => cached || net.then((r) => r));
  });
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
        net.catch(() => {});
        return cached;
      }
      return net.then((r) => r || matchAnyCache(req));
    })
  );
}

/** HTML: сеть первая, чтобы бандлы совпали с index.html. Офлайн — кэш. */
function respondNavigation(req) {
  const net = fetch(req, { cache: 'no-store' })
    .then((res) => {
      if (res && res.ok) {
        caches.open(CACHE).then(async (cache) => {
          await cachePutNormalized(cache, req, res.clone());
          try {
            const html = await res.clone().text();
            const urls = urlsFromHtml(html, req.url);
            if (urls.length) await precacheAll(cache, urls);
          } catch (e) {}
        });
      }
      return res;
    })
    .catch(() => null);
  const limit = new Promise((resolve) => setTimeout(() => resolve(null), 2500));
  return Promise.race([net, limit]).then((res) => {
    if (res && res.ok) return res;
    return matchAnyCache(req).then((cached) => cached || net.then((r) => r));
  });
}

async function warmCache() {
  const cache = await caches.open(CACHE);
  await precacheAll(cache, shellPrecacheUrls());
  await precacheDocumentAssets(cache);
  await precacheAll(cache, heavyPrecacheUrls());
}

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        await precacheAll(cache, shellPrecacheUrls());
        await precacheDocumentAssets(cache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (ev) => {
  const type = ev.data && ev.data.type;
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'WARM_CACHE') {
    ev.waitUntil(warmCache());
  }
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    (async () => {
      await self.clients.claim();
      const cache = await caches.open(CACHE);
      await precacheDocumentAssets(cache);
      const cachedKeys = await cache.keys();
      const hasApp = cachedKeys.some((r) => {
        try {
          const p = new URL(r.url).pathname;
          return p.includes('/assets/') || /main\.(jsx|js)$/i.test(p) || p.includes('/src/');
        } catch (e) {
          return false;
        }
      });
      if (hasApp) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      }
      precacheAll(cache, heavyPrecacheUrls()).catch(() => {});
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.postMessage({ type: 'SW_ACTIVATED', version: SW_VERSION }));
    })()
  );
});

function missingAssetPlaceholder(req) {
  let path = '';
  try {
    path = new URL(req.url).pathname.toLowerCase();
  } catch (e) {
    path = String(req.url || '').toLowerCase();
  }
  const isImg =
    /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?|$)/.test(path) ||
    path.includes('/images/') ||
    path.includes('/icons/') ||
    path.includes('/screenshots/');
  const isFont = /\.(woff2?|ttf|otf|eot)(\?|$)/.test(path) || path.includes('/fonts/');
  const isTheme = path.includes('/themes/');
  if (!isImg && !isFont && !isTheme) return null;
  const label = isFont ? 'нет шрифта' : isTheme ? 'нет темы' : 'нет ассета';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">` +
    `<rect width="100%" height="100%" fill="#0f172a"/>` +
    `<text x="50%" y="46%" fill="#94a3b8" font-size="16" text-anchor="middle">${label}</text>` +
    `<text x="50%" y="66%" fill="#64748b" font-size="12" text-anchor="middle">офлайн</text></svg>`;
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Offline-Missing': '1',
    },
  });
}

function isCacheable(req) {
  if (req.method !== 'GET') return false;
  const u = new URL(req.url);
  if (!sameOrigin(req.url)) return false;
  if (u.pathname.includes('/.')) return false;
  if (u.pathname.toLowerCase().endsWith('.php')) return false;
  if (u.pathname.startsWith('/@')) return false;
  if (u.pathname.includes('/node_modules/')) return false;
  if (u.pathname.includes('/.vite/')) return false;
  return true;
}

function isShellAsset(req) {
  const p = new URL(req.url).pathname.toLowerCase();
  return p.endsWith('.js') || p.endsWith('.css') || p.endsWith('.mjs') || p.endsWith('.jsx');
}

function isThemeAsset(req) {
  const p = new URL(req.url).pathname.toLowerCase();
  return p.includes('/themes/');
}

function isHashedAsset(req) {
  const p = new URL(req.url).pathname;
  return p.startsWith('/assets/') || /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css)$/.test(p);
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (!isCacheable(req)) return;

  if (isNavigationRequest(req)) {
    ev.respondWith(respondNavigation(req));
    return;
  }

  if (isThemeAsset(req)) {
    ev.respondWith(networkFirst(req, 4000));
    return;
  }

  if (isHashedAsset(req) || isShellAsset(req)) {
    ev.respondWith(staleWhileRevalidate(req));
    return;
  }

  ev.respondWith(
    caches.open(CACHE).then((cache) =>
      cacheMatchUrl(cache, req).then((cached) => {
        if (cached) {
          fetch(req, { cache: 'no-store' })
            .then((res) => {
              if (res && res.ok) cachePutNormalized(cache, req, res.clone());
            })
            .catch(() => {});
          return cached;
        }
        return fetch(req)
          .then((res) => {
            if (res && res.ok) cachePutNormalized(cache, req, res.clone());
            return res;
          })
          .catch(() =>
            matchAnyCache(req).then((hit) => hit || missingAssetPlaceholder(req) || Response.error())
          );
      })
    )
  );
});

/* =============================================================
   Neo Copilot — Service Worker
   Estratégia:
   - CACHE_FIRST para o shell (HTML, CSS, JS locais, ícones e PDF.js)
     → permite abrir o app offline (a extração de texto do PDF continua
        funcionando sem rede; só as chamadas de IA precisam de conexão).
   - NETWORK_ONLY para tudo em generativelanguage.googleapis.com
     → chamadas de IA nunca são cacheadas (dados dinâmicos e potencialmente
        sensíveis, além de custo/rate limit).
   ============================================================= */

const CACHE_VERSION = 'v5';
const CACHE_NAME = `neo-copilot-${CACHE_VERSION}`;

// Recursos essenciais do shell (pré-cacheados no install)
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/config.js',
  './js/dom-util.js',
  './js/api-key-store.js',
  './js/pipeline.js',
  './js/pdf-extractor.js',
  './js/product-knowledge.js',
  './js/ai-client.js',
  './js/ui-renderer.js',
  './js/chat-controller.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // addAll é all-or-nothing; se algum recurso falhar, o install falha.
    await cache.addAll(CORE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Remove caches antigos de versões anteriores
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Chamadas de IA: nunca cacheia
  if (url.hostname.endsWith('generativelanguage.googleapis.com')) {
    return; // deixa passar direto pela rede
  }

  // 2) Só cacheia GETs (POST vai direto)
  if (req.method !== 'GET') return;

  // 3) Stale-while-revalidate para PDF.js CDN (funciona offline após 1º load)
  if (url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // 4) Same-origin: cache-first com fallback à rede
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 5) Fontes Google e outros externos: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    // Fallback simples para navegação: devolve o index.html cacheado
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => cached); // se der ruim, devolve o cache
  return cached || network;
}

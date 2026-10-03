// Builds the source of the service worker that keeps the app working without a connection.
// It stores every file of the build on the first visit and serves them from that store afterwards.
// A new build has a new version. Its service worker waits until the app has been closed, so a page
// that is open keeps the files it started with; the old store is removed when the new one takes over.

export function serviceWorkerSource(version: string, files: readonly string[]): string {
  return `const CACHE = ${JSON.stringify(`bridge-${version}`)};
const FILES = ${JSON.stringify(['./', ...files], null, 2)};

self.addEventListener('install', (event) => {
  // 'reload' skips the browser's own cache, so an old copy of a file never ends up in the store
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((stored) => stored ?? fetch(event.request)),
  );
});
`;
}

// A short stable fingerprint of the file list, so that every build gets its own store
export function versionOf(files: readonly string[]): string {
  let hash = 5381;
  for (const char of [...files].sort().join('|')) {
    hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

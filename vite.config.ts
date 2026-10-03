import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';
import { serviceWorkerSource, versionOf } from './src/pwa/serviceWorker';

// Writes sw.js next to the built files, listing all of them for offline use
function offlineSupport(): Plugin {
  return {
    name: 'offline-support',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = [
        ...Object.keys(bundle),
        'index.html',
        'manifest.webmanifest',
        'icon-180.png',
        'icon-192.png',
        'icon-512.png',
      ];
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        // The build time makes every build a new version, also when only index.html changed
        source: serviceWorkerSource(`${versionOf(files)}-${Date.now().toString(36)}`, files),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineSupport()],
  // Relative paths, so the built app works from any folder on a static host
  base: './',
});

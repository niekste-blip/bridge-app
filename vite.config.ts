import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Relative paths, so the built app works from any folder on a static host
  base: './',
});

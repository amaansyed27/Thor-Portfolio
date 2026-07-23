import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    sourcemap: true,
  },
  server: {
    strictPort: true,
  },
});

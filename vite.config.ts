import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Kuromi-World/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        suika: 'suika/index.html',
        tetris: 'tetris/index.html'
      }
    }
  }
});

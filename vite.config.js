import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  if (mode === 'docs') {
    return {
      base: './',
      plugins: [tailwindcss()],
      build: {
        outDir: 'docs',
        emptyOutDir: true,
      },
    };
  }

  return {
    plugins: [tailwindcss()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.js'),
        name: 'LinkedArtViewer',
        fileName: 'linked-art-viewer',
      },
      cssCodeSplit: false,
    },
  };
});
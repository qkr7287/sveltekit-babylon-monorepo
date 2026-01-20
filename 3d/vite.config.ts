import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/bundle.ts',
      name: 'babylonBundle',
      formats: ['es'],
      fileName: () => 'bundle.js'
    }
  }
});


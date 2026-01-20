import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // web(dev/build)에서 3d dev 서버의 모듈을 cross-origin으로 import 할 수 있게
    cors: true,
    port: 5173,
    strictPort: true
  },
  build: {
    lib: {
      entry: 'src/bundle.ts',
      name: 'babylonBundle',
      formats: ['es'],
      fileName: () => 'bundle.js'
    }
  }
});


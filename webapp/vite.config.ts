import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The build is emitted straight into the Android assets so the phone can serve
// the whole web app itself (100% serverless). `base: './'`-style absolute
// "/assets/*" paths are served by MediaHttpServer.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../android/app/src/main/assets/webapp',
    emptyOutDir: true,
    target: 'es2019',
  },
});

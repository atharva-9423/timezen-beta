import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/edutrack/',
  plugins: [],
  server: {
    host: '0.0.0.0',
    port: 5000,
    hmr: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        about: resolve(__dirname, 'about.html'),
        pdfViewer: resolve(__dirname, 'pdf-viewer.html'),
        imageViewer: resolve(__dirname, 'image-viewer.html'),
      },
    },
  },
})

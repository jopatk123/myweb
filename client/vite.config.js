import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3302',
        changeOrigin: true,
      },
      '/internal': {
        target: 'http://localhost:3302',
        changeOrigin: true,
      },
        // 代理 WebSocket 到后端，开发时前端通过 vite server 转发 /ws
        '/ws': {
          target: 'ws://localhost:3302',
          ws: true,
          changeOrigin: true,
        },
      '/uploads': {
        target: 'http://localhost:3302',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});

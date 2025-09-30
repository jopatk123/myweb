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
    // 支持通过 FRONTEND_PORT 覆盖前端端口，默认使用 Vite 5173，避免与后端冲突
    port: Number(process.env.FRONTEND_PORT || 5173),
    host: true,
    proxy: (() => {
      const backendPort = process.env.BACKEND_PORT || process.env.PORT || 3000;
      const backendHost =
        process.env.BACKEND_HOST || `localhost:${backendPort}`;
      const httpTarget = `http://${backendHost}`;
      const wsTarget = `ws://${backendHost}`;
      return {
        '/api': { target: httpTarget, changeOrigin: true },
        '/internal': { target: httpTarget, changeOrigin: true },
        // 代理 WebSocket 到后端，开发时前端通过 vite server 转发 /ws
        '/ws': { target: wsTarget, ws: true, changeOrigin: true },
        '/uploads': { target: httpTarget, changeOrigin: true },
      };
    })(),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup/vitest.setup.js',
    env: {
      VITE_ENABLE_AI_LOGGING: 'true',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,vue}'],
      exclude: ['src/main.js'],
    },
  },
});

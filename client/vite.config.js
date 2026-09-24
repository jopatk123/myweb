import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
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
    rollupOptions: {
      output: {
        // 白名单模式：仅稳定的入口依赖（vue 生态/axios/uuid）进 vendor，
        // 应用代码迭代时 vendor 命中长期缓存。其余 node_modules 模块（含
        // mammoth/jszip 等懒加载库的传递依赖）返回 undefined，交给 Rollup
        // 按动态 import 自动分包——黑名单排除法会漏掉传递依赖，导致懒加载
        // 库被打进静态 vendor、拖累首屏。
        manualChunks(id) {
          if (/[\\/]node_modules[\\/]@vue[\\/]/.test(id)) return 'vendor';
          if (
            /[\\/]node_modules[\\/](vue|vue-router|axios|uuid)[\\/]/.test(id)
          ) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup/vitest.setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,vue}'],
      exclude: ['src/main.js'],
      // 阈值锁定当前实测基线（vitest 5 AST 级重映射后的真实值），允许小幅波动；
      // 新增模块若降低覆盖，应优先补测试而非下调阈值。
      // 历史注：旧基线 86.8/74.3/64.4/86.8 是 vitest 0.34 时代的失真值
      // （.vue 文件 sourcemap 重映射不准导致覆盖虚高），2026-09 升级 vitest 5
      // 后重测修正。views 层（Home/各管理页）缺直接测试是当前主要欠账。
      thresholds: {
        lines: 50,
        statements: 49,
        branches: 41,
        functions: 44,
      },
    },
  },
});

import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/vue';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.resetModules();
  vi.useRealTimers();
  if (typeof vi.unstubAllGlobals === 'function') {
    vi.unstubAllGlobals();
  }
  if (typeof vi.unstubAllEnvs === 'function') {
    vi.unstubAllEnvs();
  }
});

beforeAll(() => {
  // 默认启用 AI 日志测试时的环境变量
  vi.stubEnv('VITE_ENABLE_AI_LOGGING', 'true');
});

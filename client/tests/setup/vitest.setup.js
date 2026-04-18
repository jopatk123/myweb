import { afterEach, vi } from 'vitest';
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

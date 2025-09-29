import { afterEach, vi } from 'vitest';

afterEach(() => {
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

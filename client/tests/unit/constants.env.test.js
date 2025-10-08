import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadEnvModule() {
  vi.resetModules();
  return import('@/constants/env.js');
}

describe('constants/env', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('normalizes API base paths consistently', async () => {
    const { normalizeApiBase } = await loadEnvModule();

    expect(normalizeApiBase('https://example.com/')).toBe(
      'https://example.com'
    );
    expect(normalizeApiBase('https://example.com////')).toBe(
      'https://example.com'
    );
    expect(normalizeApiBase('')).toBe('/api');
    expect(normalizeApiBase(null)).toBe('/api');
  });

  it('hydrates appEnv from Vite env variables', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.com/');
    vi.stubEnv('VITE_ENABLE_AI_LOGGING', 'true');
    vi.stubEnv('MODE', 'production');

    const { appEnv } = await loadEnvModule();

    expect(appEnv.apiBase).toBe('https://api.example.com');
    expect(appEnv.enableAiLogging).toBe(true);
    expect(appEnv.isProduction).toBe(true);
  });
});

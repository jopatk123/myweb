import { describe, expect, it, vi } from 'vitest';

// Mock env module
vi.mock('@/constants/env.js', () => ({
  appEnv: {
    apiBase: '/api',
    rawApiBase: '/api',
  },
  normalizeApiBase: base => base,
}));

import {
  getApiBase,
  buildApiUrl,
  getServerOrigin,
  buildServerUrl,
} from '@/api/httpClient.js';

describe('httpClient', () => {
  describe('getApiBase', () => {
    it('returns the API base URL', () => {
      const base = getApiBase();
      expect(typeof base).toBe('string');
      expect(base).toBeTruthy();
    });
  });

  describe('buildApiUrl', () => {
    it('returns base URL when no path given', () => {
      const url = buildApiUrl();
      expect(url).toBe(getApiBase());
    });

    it('appends path to base URL', () => {
      const url = buildApiUrl('files');
      expect(url).toContain('files');
    });

    it('strips leading slashes from path', () => {
      const url = buildApiUrl('/users');
      expect(url).not.toContain('//users');
    });

    it('returns full URL if path is already absolute', () => {
      const url = buildApiUrl('https://example.com/api');
      expect(url).toBe('https://example.com/api');
    });

    it('returns full URL for http paths', () => {
      const url = buildApiUrl('http://localhost:3000/api');
      expect(url).toBe('http://localhost:3000/api');
    });
  });

  describe('getServerOrigin', () => {
    it('returns window.location.origin for relative base', () => {
      const origin = getServerOrigin();
      // In jsdom, window.location.origin should be available
      expect(typeof origin).toBe('string');
    });
  });

  describe('buildServerUrl', () => {
    it('returns origin when no path', () => {
      const result = buildServerUrl();
      expect(typeof result).toBe('string');
    });

    it('appends path to origin', () => {
      const result = buildServerUrl('/uploads/test.png');
      expect(result).toContain('/uploads/test.png');
    });

    it('adds leading slash if missing', () => {
      const result = buildServerUrl('uploads/test.png');
      expect(result).toContain('/uploads/test.png');
    });
  });
});

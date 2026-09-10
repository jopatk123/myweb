import {
  getAgentApiToken,
  isAgentApiTokenConfigured,
  extractBearerToken,
  isValidAgentBearerToken,
  isAgentAuthRequestAuthorized,
} from '../../src/utils/agent-auth.js';
import { hashToken } from '../../src/utils/crypto.js';

describe('agent-auth utils', () => {
  const originalToken = process.env.AGENT_API_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.AGENT_API_TOKEN;
    } else {
      process.env.AGENT_API_TOKEN = originalToken;
    }
  });

  describe('getAgentApiToken', () => {
    test('returns configured token', () => {
      process.env.AGENT_API_TOKEN = 'test-token';
      expect(getAgentApiToken()).toBe('test-token');
    });

    test('returns empty string when not configured', () => {
      delete process.env.AGENT_API_TOKEN;
      expect(getAgentApiToken()).toBe('');
    });

    test('trims whitespace', () => {
      process.env.AGENT_API_TOKEN = '  test-token  ';
      expect(getAgentApiToken()).toBe('test-token');
    });
  });

  describe('isAgentApiTokenConfigured', () => {
    test('returns true when token is configured', () => {
      process.env.AGENT_API_TOKEN = 'test-token';
      expect(isAgentApiTokenConfigured()).toBe(true);
    });

    test('returns false when token is empty', () => {
      process.env.AGENT_API_TOKEN = '';
      expect(isAgentApiTokenConfigured()).toBe(false);
    });

    test('returns false when token is whitespace only', () => {
      process.env.AGENT_API_TOKEN = '   ';
      expect(isAgentApiTokenConfigured()).toBe(false);
    });

    test('returns false when not configured', () => {
      delete process.env.AGENT_API_TOKEN;
      expect(isAgentApiTokenConfigured()).toBe(false);
    });
  });

  describe('extractBearerToken', () => {
    test('extracts token from valid Bearer header', () => {
      const req = {
        headers: { authorization: 'Bearer abc123' },
      };
      expect(extractBearerToken(req)).toBe('abc123');
    });

    test('extracts token with case-insensitive Bearer', () => {
      const req = {
        headers: { authorization: 'bearer xyz789' },
      };
      expect(extractBearerToken(req)).toBe('xyz789');
    });

    test('returns empty string for missing authorization header', () => {
      const req = { headers: {} };
      expect(extractBearerToken(req)).toBe('');
    });

    test('returns empty string for malformed header', () => {
      const req = {
        headers: { authorization: 'Basic xyz' },
      };
      expect(extractBearerToken(req)).toBe('');
    });

    test('returns empty string for Bearer without token', () => {
      const req = {
        headers: { authorization: 'Bearer' },
      };
      expect(extractBearerToken(req)).toBe('');
    });

    test('returns empty string for Bearer with only whitespace', () => {
      const req = {
        headers: { authorization: 'Bearer   ' },
      };
      expect(extractBearerToken(req)).toBe('');
    });

    test('handles token with special characters', () => {
      const req = {
        headers: { authorization: 'Bearer abc-123_def.ghi' },
      };
      expect(extractBearerToken(req)).toBe('abc-123_def.ghi');
    });

    test('extracts token even with multiple spaces after Bearer', () => {
      const req = {
        headers: { authorization: 'Bearer  token' },
      };
      expect(extractBearerToken(req)).toBe('token');
    });

    test('handles null request', () => {
      expect(extractBearerToken(null)).toBe('');
    });

    test('handles undefined request', () => {
      expect(extractBearerToken(undefined)).toBe('');
    });
  });

  describe('isValidAgentBearerToken', () => {
    test('returns false when token not configured', () => {
      delete process.env.AGENT_API_TOKEN;
      const req = {
        headers: { authorization: 'Bearer any-token' },
      };
      expect(isValidAgentBearerToken(req)).toBe(false);
    });

    test('returns false when Bearer token not provided', () => {
      process.env.AGENT_API_TOKEN = 'test-token';
      const req = { headers: {} };
      expect(isValidAgentBearerToken(req)).toBe(false);
    });

    test('returns true for matching plaintext token', () => {
      process.env.AGENT_API_TOKEN = 'test-token';
      const req = {
        headers: { authorization: 'Bearer test-token' },
      };
      expect(isValidAgentBearerToken(req)).toBe(true);
    });

    test('returns false for non-matching token', () => {
      process.env.AGENT_API_TOKEN = 'test-token';
      const req = {
        headers: { authorization: 'Bearer wrong-token' },
      };
      expect(isValidAgentBearerToken(req)).toBe(false);
    });

    test('returns true when env has sha256 hash and request has plaintext', () => {
      const plainToken = 'my-secret-token';
      process.env.AGENT_API_TOKEN = hashToken(plainToken);
      const req = {
        headers: { authorization: `Bearer ${plainToken}` },
      };
      expect(isValidAgentBearerToken(req)).toBe(true);
    });

    test('returns false when providing hash instead of plaintext', () => {
      const plainToken = 'my-secret-token';
      const hashed = hashToken(plainToken);
      process.env.AGENT_API_TOKEN = hashed;
      const req = {
        headers: { authorization: `Bearer ${hashed}` },
      };
      expect(isValidAgentBearerToken(req)).toBe(false);
    });

    test('is case-sensitive for token value', () => {
      process.env.AGENT_API_TOKEN = 'TestToken';
      const req = {
        headers: { authorization: 'Bearer testtoken' },
      };
      expect(isValidAgentBearerToken(req)).toBe(false);
    });
  });

  describe('isAgentAuthRequestAuthorized', () => {
    test('returns false when token not configured', () => {
      delete process.env.AGENT_API_TOKEN;
      const req = {
        headers: { authorization: 'Bearer any-token' },
      };
      expect(isAgentAuthRequestAuthorized(req)).toBe(false);
    });

    test('returns true when token configured and valid', () => {
      process.env.AGENT_API_TOKEN = 'valid-token';
      const req = {
        headers: { authorization: 'Bearer valid-token' },
      };
      expect(isAgentAuthRequestAuthorized(req)).toBe(true);
    });

    test('returns false when token configured but invalid', () => {
      process.env.AGENT_API_TOKEN = 'valid-token';
      const req = {
        headers: { authorization: 'Bearer invalid-token' },
      };
      expect(isAgentAuthRequestAuthorized(req)).toBe(false);
    });

    test('returns false when token configured but not provided', () => {
      process.env.AGENT_API_TOKEN = 'valid-token';
      const req = { headers: {} };
      expect(isAgentAuthRequestAuthorized(req)).toBe(false);
    });
  });
});

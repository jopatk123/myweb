import { beforeEach, describe, expect, it, vi } from 'vitest';

const uuidMock = vi.hoisted(() => ({
  v4: vi.fn(() => 'session-uuid-1'),
}));

vi.mock('uuid', () => ({
  v4: uuidMock.v4,
}));

describe('sessionState', () => {
  beforeEach(() => {
    vi.resetModules();
    uuidMock.v4.mockClear();
    const store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(key => (store.has(key) ? store.get(key) : null)),
      setItem: vi.fn((key, value) => {
        store.set(key, String(value));
      }),
      removeItem: vi.fn(key => {
        store.delete(key);
      }),
      clear: vi.fn(() => {
        store.clear();
      }),
    });
  });

  it('reuses a stored session id without generating a new one', async () => {
    localStorage.setItem('sessionId', 'stored-session');

    const { readSessionId, ensureSessionId, sessionState } =
      await import('@/store/sessionState.js');

    expect(readSessionId()).toBe('stored-session');
    expect(ensureSessionId()).toBe('stored-session');
    expect(uuidMock.v4).not.toHaveBeenCalled();
    expect(sessionState.sessionId.value).toBe('stored-session');
  });

  it('creates and caches a new session id when none exists', async () => {
    const { ensureSessionId, readSessionId, resetSessionState } =
      await import('@/store/sessionState.js');

    const created = ensureSessionId();

    expect(created).toBe('session-uuid-1');
    expect(localStorage.getItem('sessionId')).toBe('session-uuid-1');
    expect(uuidMock.v4).toHaveBeenCalledTimes(1);

    resetSessionState();
    expect(readSessionId()).toBe('session-uuid-1');
  });
});

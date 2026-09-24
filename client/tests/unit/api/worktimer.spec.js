import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/api/httpClient.js', () => ({
  createApiClient: vi.fn(() => clientMock),
}));

async function loadWorkTimer() {
  vi.resetModules();
  return import('@/api/worktimer.js');
}

describe('worktimer API', () => {
  beforeEach(() => {
    clientMock.get.mockReset();
    clientMock.post.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('creates the client with the work-timer timeout', async () => {
    const httpClient = await import('@/api/httpClient.js');
    await loadWorkTimer();

    expect(httpClient.createApiClient).toHaveBeenCalledWith({
      timeout: 30000,
    });
  });

  it('starts a session with the full payload and unwraps res.data', async () => {
    const { startSession } = await loadWorkTimer();
    clientMock.post.mockResolvedValue({ data: { sessionId: 's1' } });

    const result = await startSession('s1', 1000, 2000);

    expect(clientMock.post).toHaveBeenCalledWith('/work-timer/start', {
      sessionId: 's1',
      startTime: 1000,
      targetEndTime: 2000,
    });
    expect(result).toEqual({ sessionId: 's1' });
  });

  it('sends heartbeat increments', async () => {
    const { heartbeat } = await loadWorkTimer();
    clientMock.post.mockResolvedValue({ data: { totalMs: 5000 } });

    const result = await heartbeat('s1', 1500, 9000);

    expect(clientMock.post).toHaveBeenCalledWith('/work-timer/heartbeat', {
      sessionId: 's1',
      incrementMs: 1500,
      lastUpdate: 9000,
    });
    expect(result).toEqual({ totalMs: 5000 });
  });

  it('stops a session with final increment', async () => {
    const { stopSession } = await loadWorkTimer();
    clientMock.post.mockResolvedValue({ data: { ok: true } });

    const result = await stopSession('s1', 12000, 3000);

    expect(clientMock.post).toHaveBeenCalledWith('/work-timer/stop', {
      sessionId: 's1',
      endTime: 12000,
      finalIncrementMs: 3000,
    });
    expect(result).toEqual({ ok: true });
  });

  it('fetches stats via GET and unwraps res.data', async () => {
    const { getStats } = await loadWorkTimer();
    clientMock.get.mockResolvedValue({ data: { todayMs: 42 } });

    const result = await getStats();

    expect(clientMock.get).toHaveBeenCalledWith('/work-timer/stats');
    expect(result).toEqual({ todayMs: 42 });
  });

  it('propagates request failures', async () => {
    const { getStats } = await loadWorkTimer();
    const error = new Error('timer backend down');
    clientMock.get.mockRejectedValue(error);

    await expect(getStats()).rejects.toBe(error);
  });
});

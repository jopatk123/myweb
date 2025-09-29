import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AILogService } from '@/services/aiLogService.js';

const baseLogPayload = {
  requestText: '测试请求',
  responseText: '测试响应',
  model: 'test-model',
  playerType: 1,
  timestamp: '2024-01-01T00:00:00.000Z',
};

describe('AILogService', () => {
  let service;

  beforeEach(() => {
    vi.stubEnv('VITE_ENABLE_AI_LOGGING', 'true');
    service = new AILogService();
    service.clearQueue();
    service.setEnabled(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('sends conversation logs when enabled', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    await service.logConversation(baseLogPayload);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/internal/logs/ai');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body);
    expect(body.requestText).toBe(baseLogPayload.requestText);
  });

  it('skips sending logs when service is disabled', async () => {
    vi.stubGlobal('fetch', vi.fn());
    service.setEnabled(false);

    await service.logConversation(baseLogPayload);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('stores backup locally when backend responds 404', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'),
    }));

    await service.logConversation(baseLogPayload);

    const backup = JSON.parse(localStorage.getItem('ai_logs_backup'));
    expect(Array.isArray(backup)).toBe(true);
    expect(backup).toHaveLength(1);
    expect(backup[0].requestText).toBe(baseLogPayload.requestText);
  });

  it('queues failed logs and retries successfully', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      })
      .mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await service.logConversation(baseLogPayload);
    expect(service.getQueueLength()).toBe(1);

    await service.retryQueuedLogs();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(service.getQueueLength()).toBe(0);
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/api/worktimer', () => ({
  startSession: vi.fn(),
  heartbeat: vi.fn(),
  stopSession: vi.fn(),
  getStats: vi.fn(),
}));

import * as worktimerApi from '@/api/worktimer';
import { HeartbeatManager } from '@/composables/work-timer/heartbeat.js';

// jsdom + vitest 下统一用内存 localStorage 实现（与 storage.spec.js 一致）
function createMemoryStorage() {
  const data = {};
  return {
    getItem: key => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: key => {
      delete data[key];
    },
    clear: () => {
      for (const k of Object.keys(data)) delete data[k];
    },
    get length() {
      return Object.keys(data).length;
    },
    key: idx => Object.keys(data)[idx] ?? null,
  };
}

function createRefs() {
  return {
    totalMs: { value: 0 },
    workSessions: { value: [] },
    endTime: { value: '18:00' },
  };
}

describe('HeartbeatManager', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.stubGlobal('navigator', { onLine: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('结束会话（双重计数回归）', () => {
    it('最终增量只通过 heartbeat 落库一次，stop 不再携带 finalIncrementMs', async () => {
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 60000 });
      worktimerApi.stopSession.mockResolvedValue({});

      const manager = new HeartbeatManager();
      manager.setCurrentSessionId('s1');
      manager.setSessionStartIso('2026-08-29T01:00:00.000Z');
      const refs = createRefs();

      await manager.sendHeartbeat(
        60000,
        '2026-08-29T02:00:00.000Z',
        true,
        refs.totalMs,
        refs.workSessions,
        () => {},
        refs.endTime
      );

      expect(worktimerApi.heartbeat).toHaveBeenCalledWith(
        's1',
        60000,
        '2026-08-29T02:00:00.000Z'
      );
      // 服务端 stop 会把 finalIncrementMs 再累加一次，必须传 null 防止双重计数
      expect(worktimerApi.stopSession).toHaveBeenCalledWith(
        's1',
        '2026-08-29T02:00:00.000Z',
        null
      );
      expect(manager.getCurrentSessionId()).toBeNull();
    });
  });

  describe('离线入队', () => {
    it('同一会话的 pending start 只入队一次', async () => {
      vi.stubGlobal('navigator', { onLine: false });

      const manager = new HeartbeatManager();
      manager.setCurrentSessionId('s1');
      manager.setSessionStartIso('2026-08-29T01:00:00.000Z');
      const refs = createRefs();

      await manager.sendHeartbeat(
        60000,
        '2026-08-29T01:10:00.000Z',
        false,
        refs.totalMs,
        refs.workSessions,
        () => {},
        refs.endTime
      );
      await manager.sendHeartbeat(
        60000,
        '2026-08-29T01:20:00.000Z',
        false,
        refs.totalMs,
        refs.workSessions,
        () => {},
        refs.endTime
      );

      expect(manager.pendingStarts).toHaveLength(1);
      // start 必须使用会话真实开始时间，而不是最后心跳时间
      expect(manager.pendingStarts[0]).toEqual({
        sessionId: 's1',
        startIso: '2026-08-29T01:00:00.000Z',
        targetEndTime: '18:00',
      });
      expect(manager.pendingHeartbeats).toHaveLength(2);
    });

    it('离线结束时 stop 入队持久化，联网后按 start → heartbeat → stop 重放', async () => {
      vi.stubGlobal('navigator', { onLine: false });

      const manager = new HeartbeatManager();
      manager.setCurrentSessionId('s1');
      manager.setSessionStartIso('2026-08-29T01:00:00.000Z');
      const refs = createRefs();

      await manager.sendHeartbeat(
        60000,
        '2026-08-29T01:10:00.000Z',
        true,
        refs.totalMs,
        refs.workSessions,
        () => {},
        refs.endTime
      );

      expect(manager.pendingStops).toEqual([
        { sessionId: 's1', endTimeIso: '2026-08-29T01:10:00.000Z' },
      ]);

      // 联网后 flush：start → heartbeat → stop（stop 不带最终增量）
      vi.stubGlobal('navigator', { onLine: true });
      worktimerApi.startSession.mockResolvedValue({});
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 60000 });
      worktimerApi.stopSession.mockResolvedValue({});

      await manager.flushPendingHeartbeats();

      const callOrder = [
        worktimerApi.startSession.mock.invocationCallOrder[0],
        worktimerApi.heartbeat.mock.invocationCallOrder[0],
        worktimerApi.stopSession.mock.invocationCallOrder[0],
      ];
      expect(callOrder[0]).toBeLessThan(callOrder[1]);
      expect(callOrder[1]).toBeLessThan(callOrder[2]);
      expect(worktimerApi.stopSession).toHaveBeenCalledWith(
        's1',
        '2026-08-29T01:10:00.000Z',
        null
      );
      expect(manager.pendingStarts).toHaveLength(0);
      expect(manager.pendingHeartbeats).toHaveLength(0);
      expect(manager.pendingStops).toHaveLength(0);
    });

    it('在线结束时 stop 失败会入队待重试', async () => {
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 60000 });
      worktimerApi.stopSession.mockRejectedValue(new Error('network'));

      const manager = new HeartbeatManager();
      manager.setCurrentSessionId('s1');
      manager.setSessionStartIso('2026-08-29T01:00:00.000Z');
      const refs = createRefs();

      await manager.sendHeartbeat(
        60000,
        '2026-08-29T02:00:00.000Z',
        true,
        refs.totalMs,
        refs.workSessions,
        () => {},
        refs.endTime
      );

      expect(manager.pendingStops).toEqual([
        { sessionId: 's1', endTimeIso: '2026-08-29T02:00:00.000Z' },
      ]);
    });
  });

  describe('pending 队列持久化', () => {
    it('loadPendingFromStorage 恢复三类队列', () => {
      const manager = new HeartbeatManager();
      manager.enqueuePendingStart('s1', '2026-08-29T01:00:00.000Z', '18:00');
      manager.enqueuePendingHeartbeat('s1', 60000, '2026-08-29T01:10:00.000Z');
      manager.enqueuePendingStop('s1', '2026-08-29T01:20:00.000Z');

      const restored = new HeartbeatManager();
      restored.loadPendingFromStorage();

      expect(restored.pendingStarts).toHaveLength(1);
      expect(restored.pendingHeartbeats).toHaveLength(1);
      expect(restored.pendingStops).toHaveLength(1);
    });
  });
});

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

function sendHb(
  manager,
  refs,
  {
    incrementMs = 60000,
    lastUpdate = '2026-08-29T02:00:00.000Z',
    endSession = false,
    saveFn = () => {},
  } = {}
) {
  return manager.sendHeartbeat(
    incrementMs,
    lastUpdate,
    endSession,
    refs.totalMs,
    refs.workSessions,
    saveFn,
    refs.endTime
  );
}

function startInterval(manager, refs, startTime = new Date()) {
  manager.startHeartbeatInterval(
    startTime,
    's1',
    refs.endTime,
    refs.totalMs,
    refs.workSessions,
    () => {}
  );
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

      await sendHb(manager, refs, { endSession: true });

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

      await sendHb(manager, refs, { lastUpdate: '2026-08-29T01:10:00.000Z' });
      await sendHb(manager, refs, { lastUpdate: '2026-08-29T01:20:00.000Z' });

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

      await sendHb(manager, refs, {
        lastUpdate: '2026-08-29T01:10:00.000Z',
        endSession: true,
      });

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

      await sendHb(manager, refs, { endSession: true });

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

  describe('心跳间隔（定时增量）', () => {
    it('每满一分钟发送一次增量并乐观更新 totalMs', async () => {
      vi.useFakeTimers();
      const base = new Date(2026, 8, 24, 10, 0, 0);
      vi.setSystemTime(base);
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 60000 });

      const manager = new HeartbeatManager();
      const refs = createRefs();
      startInterval(manager, refs, new Date(base));

      expect(manager.heartbeatTimer).not.toBeNull();
      expect(manager.getLastHeartbeatTs()).toBe(base.getTime());

      await vi.advanceTimersByTimeAsync(60 * 1000);

      expect(worktimerApi.heartbeat).toHaveBeenCalledTimes(1);
      expect(worktimerApi.heartbeat).toHaveBeenCalledWith(
        's1',
        60000,
        new Date(base.getTime() + 60000).toISOString()
      );
      expect(refs.totalMs.value).toBe(60000);
      expect(manager.getLastHeartbeatTs()).toBe(base.getTime() + 60000);

      // 不足一分钟的增量不发送
      await vi.advanceTimersByTimeAsync(30 * 1000);
      expect(worktimerApi.heartbeat).toHaveBeenCalledTimes(1);

      // 凑满一分钟后发送第二次
      await vi.advanceTimersByTimeAsync(30 * 1000);
      expect(worktimerApi.heartbeat).toHaveBeenCalledTimes(2);
      expect(worktimerApi.heartbeat).toHaveBeenLastCalledWith(
        's1',
        60000,
        new Date(base.getTime() + 120000).toISOString()
      );
      expect(manager.getLastHeartbeatTs()).toBe(base.getTime() + 120000);
    });

    it('重复启动不会叠加定时器', () => {
      vi.useFakeTimers();
      const manager = new HeartbeatManager();
      const refs = createRefs();
      startInterval(manager, refs);
      const firstTimer = manager.heartbeatTimer;

      startInterval(manager, refs);

      expect(manager.heartbeatTimer).toBe(firstTimer);
      expect(manager.getCurrentSessionId()).toBe('s1');
    });

    it('停止后不再发送心跳', async () => {
      vi.useFakeTimers();
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 0 });
      const manager = new HeartbeatManager();
      const refs = createRefs();
      startInterval(manager, refs);

      manager.stopHeartbeatInterval();

      expect(manager.heartbeatTimer).toBeNull();
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      expect(worktimerApi.heartbeat).not.toHaveBeenCalled();
    });

    it('会话结束（currentSessionId 置空）后定时器空转不发送', async () => {
      vi.useFakeTimers();
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 0 });
      const manager = new HeartbeatManager();
      const refs = createRefs();
      startInterval(manager, refs);

      manager.setCurrentSessionId(null);
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);

      expect(worktimerApi.heartbeat).not.toHaveBeenCalled();
    });

    it('lastHeartbeatTs 丢失时从会话开始时间重新起算', async () => {
      vi.useFakeTimers();
      const base = new Date(2026, 8, 24, 10, 0, 0);
      vi.setSystemTime(base);
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 60000 });

      const manager = new HeartbeatManager();
      const refs = createRefs();
      startInterval(manager, refs, new Date(base));
      manager.setLastHeartbeatTs(null);

      await vi.advanceTimersByTimeAsync(60 * 1000);

      expect(worktimerApi.heartbeat).toHaveBeenCalledWith(
        's1',
        60000,
        new Date(base.getTime() + 60000).toISOString()
      );
      expect(manager.getLastHeartbeatTs()).toBe(base.getTime() + 60000);
    });

    it('心跳发送失败时入队等待重试并记录告警', async () => {
      vi.useFakeTimers();
      worktimerApi.heartbeat.mockRejectedValue(new Error('network down'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const manager = new HeartbeatManager();
      const refs = createRefs();
      startInterval(manager, refs);

      await vi.advanceTimersByTimeAsync(60 * 1000);

      expect(manager.pendingHeartbeats).toEqual([
        expect.objectContaining({ sessionId: 's1', incrementMs: 60000 }),
      ]);
      expect(warnSpy).toHaveBeenCalledWith(
        '发送工作心跳失败:',
        expect.any(Error)
      );
    });
  });

  describe('sendHeartbeat 边界', () => {
    it('无会话时直接返回，不发送不入队', async () => {
      const manager = new HeartbeatManager();
      const refs = createRefs();

      await sendHb(manager, refs);

      expect(worktimerApi.heartbeat).not.toHaveBeenCalled();
      expect(manager.pendingHeartbeats).toHaveLength(0);
      expect(manager.pendingStarts).toHaveLength(0);
    });

    it('在线成功：回填 totalMs、持久化并更新会话时长', async () => {
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 180000 });
      const manager = new HeartbeatManager();
      manager.setCurrentSessionId('s1');
      const refs = createRefs();
      refs.workSessions.value.push({ id: 's1', duration: 60000 });
      const saveFn = vi.fn();

      await sendHb(manager, refs, { incrementMs: 120000, saveFn });

      expect(refs.totalMs.value).toBe(180000);
      expect(localStorage.getItem('work-timer-total-ms')).toBe('180000');
      expect(refs.workSessions.value[0]).toEqual({
        id: 's1',
        duration: 180000,
        lastUpdate: '2026-08-29T02:00:00.000Z',
      });
      expect(saveFn).toHaveBeenCalledTimes(1);
      expect(worktimerApi.stopSession).not.toHaveBeenCalled();
    });

    it('会话不在本地列表中时不更新会话、不触发保存', async () => {
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 60000 });
      const manager = new HeartbeatManager();
      manager.setCurrentSessionId('s1');
      const refs = createRefs();
      const saveFn = vi.fn();

      await sendHb(manager, refs, { saveFn });

      expect(refs.totalMs.value).toBe(60000);
      expect(refs.workSessions.value).toHaveLength(0);
      expect(saveFn).not.toHaveBeenCalled();
    });

    it('离线且缺少会话开始时间时仅入队心跳', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      const manager = new HeartbeatManager();
      manager.setCurrentSessionId('s1');
      const refs = createRefs();

      await sendHb(manager, refs);

      expect(manager.pendingStarts).toHaveLength(0);
      expect(manager.pendingHeartbeats).toEqual([
        {
          sessionId: 's1',
          incrementMs: 60000,
          lastUpdate: '2026-08-29T02:00:00.000Z',
        },
      ]);
      expect(worktimerApi.heartbeat).not.toHaveBeenCalled();
    });

    it('在线心跳请求失败时入队心跳，结束时同时入队 stop', async () => {
      worktimerApi.heartbeat.mockRejectedValue(new Error('boom'));
      const manager = new HeartbeatManager();
      manager.setCurrentSessionId('s1');
      const refs = createRefs();

      await sendHb(manager, refs, { endSession: true });

      expect(manager.pendingHeartbeats).toEqual([
        {
          sessionId: 's1',
          incrementMs: 60000,
          lastUpdate: '2026-08-29T02:00:00.000Z',
        },
      ]);
      expect(manager.pendingStops).toEqual([
        { sessionId: 's1', endTimeIso: '2026-08-29T02:00:00.000Z' },
      ]);
      expect(worktimerApi.stopSession).not.toHaveBeenCalled();
    });
  });

  describe('flushPendingHeartbeats 异常恢复', () => {
    it('start 重放失败：保留该 start 且不继续心跳与 stop', async () => {
      worktimerApi.startSession.mockRejectedValue(new Error('start failed'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const manager = new HeartbeatManager();
      manager.enqueuePendingStart('s1', '2026-08-29T01:00:00.000Z', '18:00');
      manager.enqueuePendingHeartbeat('s1', 60000, '2026-08-29T01:10:00.000Z');
      manager.enqueuePendingStop('s1', '2026-08-29T01:20:00.000Z');

      await manager.flushPendingHeartbeats();

      expect(manager.pendingStarts).toEqual([
        {
          sessionId: 's1',
          startIso: '2026-08-29T01:00:00.000Z',
          targetEndTime: '18:00',
        },
      ]);
      expect(manager.pendingHeartbeats).toHaveLength(1);
      expect(manager.pendingStops).toHaveLength(1);
      expect(worktimerApi.heartbeat).not.toHaveBeenCalled();
      expect(worktimerApi.stopSession).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        '刷新待发送工作会话失败:',
        expect.any(Error)
      );
    });

    it('start 成功后若仍离线则保留心跳待联网重试', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      worktimerApi.startSession.mockResolvedValue({});
      const manager = new HeartbeatManager();
      manager.enqueuePendingStart('s1', '2026-08-29T01:00:00.000Z', '18:00');
      manager.enqueuePendingHeartbeat('s1', 60000, '2026-08-29T01:10:00.000Z');

      await manager.flushPendingHeartbeats();

      expect(worktimerApi.startSession).toHaveBeenCalledTimes(1);
      expect(manager.pendingStarts).toHaveLength(0);
      expect(manager.pendingHeartbeats).toHaveLength(1);
      expect(worktimerApi.heartbeat).not.toHaveBeenCalled();
    });

    it('心跳重放中途失败：完整恢复剩余队列', async () => {
      worktimerApi.heartbeat
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('mid fail'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const manager = new HeartbeatManager();
      manager.enqueuePendingHeartbeat('s1', 60000, '2026-08-29T01:10:00.000Z');
      manager.enqueuePendingHeartbeat('s1', 60000, '2026-08-29T01:20:00.000Z');

      await manager.flushPendingHeartbeats();

      expect(worktimerApi.heartbeat).toHaveBeenCalledTimes(2);
      // 失败后两条心跳都完整恢复，不丢数据
      expect(manager.pendingHeartbeats).toHaveLength(2);
      expect(warnSpy).toHaveBeenCalledWith(
        '刷新待发送工作心跳失败:',
        expect.any(Error)
      );
    });

    it('stop 重放失败：保留 stop 待下次重试', async () => {
      worktimerApi.heartbeat.mockResolvedValue({});
      worktimerApi.stopSession.mockRejectedValue(new Error('stop failed'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const manager = new HeartbeatManager();
      manager.enqueuePendingHeartbeat('s1', 60000, '2026-08-29T01:10:00.000Z');
      manager.enqueuePendingStop('s1', '2026-08-29T01:20:00.000Z');

      await manager.flushPendingHeartbeats();

      expect(worktimerApi.heartbeat).toHaveBeenCalledTimes(1);
      expect(worktimerApi.stopSession).toHaveBeenCalledWith(
        's1',
        '2026-08-29T01:20:00.000Z',
        null
      );
      expect(manager.pendingStops).toEqual([
        { sessionId: 's1', endTimeIso: '2026-08-29T01:20:00.000Z' },
      ]);
      expect(warnSpy).toHaveBeenCalledWith(
        '刷新待发送工作会话结束请求失败:',
        expect.any(Error)
      );
    });

    it('全部成功后清空三类队列与本地持久化', async () => {
      worktimerApi.startSession.mockResolvedValue({});
      worktimerApi.heartbeat.mockResolvedValue({});
      worktimerApi.stopSession.mockResolvedValue({});
      const manager = new HeartbeatManager();
      manager.enqueuePendingStart('s1', '2026-08-29T01:00:00.000Z', '18:00');
      manager.enqueuePendingHeartbeat('s1', 60000, '2026-08-29T01:10:00.000Z');
      manager.enqueuePendingStop('s1', '2026-08-29T01:20:00.000Z');

      await manager.flushPendingHeartbeats();

      expect(manager.pendingStarts).toHaveLength(0);
      expect(manager.pendingHeartbeats).toHaveLength(0);
      expect(manager.pendingStops).toHaveLength(0);
      expect(localStorage.getItem('work-timer-pending-starts')).toBeNull();
      expect(localStorage.getItem('work-timer-pending-heartbeats')).toBeNull();
      expect(localStorage.getItem('work-timer-pending-stops')).toBeNull();
    });

    it('重放 start 期间新入队的条目不会被清空持久化抹掉', async () => {
      const manager = new HeartbeatManager();
      manager.enqueuePendingStart('s1', '2026-08-29T01:00:00.000Z', '18:00');
      // 模拟请求返回前又掉线，另一会话的 start 入队
      worktimerApi.startSession.mockImplementation(async () => {
        manager.enqueuePendingStart('s2', '2026-08-29T02:00:00.000Z', '18:00');
      });

      await manager.flushPendingHeartbeats();

      expect(manager.pendingStarts).toEqual([
        {
          sessionId: 's2',
          startIso: '2026-08-29T02:00:00.000Z',
          targetEndTime: '18:00',
        },
      ]);
      // 持久化必须保留 s2，否则刷新后这条 start 永久丢失
      expect(
        JSON.parse(localStorage.getItem('work-timer-pending-starts'))
      ).toHaveLength(1);
    });

    it('重放心跳期间新入队的心跳不会被清空持久化抹掉', async () => {
      const manager = new HeartbeatManager();
      manager.enqueuePendingHeartbeat('s1', 60000, '2026-08-29T01:10:00.000Z');
      worktimerApi.heartbeat.mockImplementation(async () => {
        manager.enqueuePendingHeartbeat(
          's1',
          60000,
          '2026-08-29T01:20:00.000Z'
        );
      });

      await manager.flushPendingHeartbeats();

      expect(manager.pendingHeartbeats).toEqual([
        {
          sessionId: 's1',
          incrementMs: 60000,
          lastUpdate: '2026-08-29T01:20:00.000Z',
        },
      ]);
      expect(
        JSON.parse(localStorage.getItem('work-timer-pending-heartbeats'))
      ).toHaveLength(1);
    });
  });
});

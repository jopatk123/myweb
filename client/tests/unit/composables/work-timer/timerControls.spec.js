import { ref } from 'vue';
import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('@/api/worktimer', () => ({
  startSession: vi.fn(),
  heartbeat: vi.fn(),
  stopSession: vi.fn(),
  getStats: vi.fn(),
}));

import * as worktimerApi from '@/api/worktimer';
import { TimerControls } from '@/composables/work-timer/timerControls.js';

const flushPromises = () => new Promise(resolve => queueMicrotask(resolve));

// heartbeat.js 已有独立测试，这里用桩对象验证 TimerControls 与它的交互契约
function createHeartbeatStub() {
  return {
    setCurrentSessionId: vi.fn(),
    setSessionStartIso: vi.fn(),
    setLastHeartbeatTs: vi.fn(),
    getLastHeartbeatTs: vi.fn(() => Date.now()),
    startHeartbeatInterval: vi.fn(),
    stopHeartbeatInterval: vi.fn(),
    sendHeartbeat: vi.fn(() => Promise.resolve()),
    enqueuePendingStart: vi.fn(),
    enqueuePendingHeartbeat: vi.fn(),
    enqueuePendingStop: vi.fn(),
  };
}

function createRefs(endTimeValue = '17:30') {
  return {
    endTime: ref(endTimeValue),
    isTimerActive: ref(false),
    startWorkTime: ref(null),
    workSessions: ref([]),
    totalMs: ref(0),
  };
}

class MockAudio {
  static instances = [];
  constructor(src) {
    this.src = src;
    this.play = vi.fn(() => Promise.resolve());
    MockAudio.instances.push(this);
  }
}

describe('TimerControls', () => {
  let controls;
  let heartbeat;

  beforeEach(() => {
    // 全局 afterEach 只清调用记录不重置实现，这里统一给定安全默认值
    vi.clearAllMocks();
    worktimerApi.startSession.mockResolvedValue({});
    worktimerApi.heartbeat.mockResolvedValue({ totalMs: 0 });
    worktimerApi.stopSession.mockResolvedValue({});
    heartbeat = createHeartbeatStub();
    controls = new TimerControls(heartbeat);
    MockAudio.instances = [];
  });

  describe('setPreset', () => {
    it('更新结束时间', () => {
      const refs = createRefs('18:00');
      controls.setPreset(refs.endTime, '17:00');
      expect(refs.endTime.value).toBe('17:00');
    });
  });

  describe('startTimer', () => {
    it('结束时间为空时直接忽略，不改变状态', () => {
      const refs = createRefs('');
      controls.startTimer(
        refs.endTime,
        refs.isTimerActive,
        refs.startWorkTime,
        refs.workSessions,
        refs.totalMs,
        () => {}
      );

      expect(refs.isTimerActive.value).toBe(false);
      expect(refs.startWorkTime.value).toBeNull();
      expect(refs.workSessions.value).toHaveLength(0);
      expect(worktimerApi.startSession).not.toHaveBeenCalled();
      expect(heartbeat.startHeartbeatInterval).not.toHaveBeenCalled();
    });

    it('启动成功：置计时态、创建本地占位会话并通知服务端', async () => {
      vi.useFakeTimers();
      const base = new Date(2026, 8, 24, 10, 0, 0);
      vi.setSystemTime(base);
      worktimerApi.startSession.mockResolvedValue({});

      const refs = createRefs();
      const saveFn = vi.fn();
      controls.startTimer(
        refs.endTime,
        refs.isTimerActive,
        refs.startWorkTime,
        refs.workSessions,
        refs.totalMs,
        saveFn
      );
      await flushPromises();

      expect(refs.isTimerActive.value).toBe(true);
      expect(refs.startWorkTime.value).toBeInstanceOf(Date);

      expect(refs.workSessions.value).toHaveLength(1);
      const session = refs.workSessions.value[0];
      expect(session).toEqual({
        id: expect.any(String),
        date: base.toISOString().slice(0, 10),
        startTime: base.toISOString(),
        duration: 0,
        targetEndTime: '17:30',
        is_active: 1,
      });
      expect(saveFn).toHaveBeenCalledTimes(1);

      const [sessionId, startIso, targetEnd] =
        worktimerApi.startSession.mock.calls[0];
      expect(startIso).toBe(base.toISOString());
      expect(targetEnd).toBe('17:30');

      expect(heartbeat.setCurrentSessionId).toHaveBeenCalledWith(sessionId);
      expect(heartbeat.setSessionStartIso).toHaveBeenCalledWith(
        base.toISOString()
      );
      expect(heartbeat.setLastHeartbeatTs).toHaveBeenCalledWith(base.getTime());
    });

    it('把 endTime ref 本体和各 ref 传给心跳管理器（离线分支依赖 endTime.value）', async () => {
      vi.useFakeTimers();
      worktimerApi.startSession.mockResolvedValue({});

      const refs = createRefs();
      const saveFn = vi.fn();
      controls.startTimer(
        refs.endTime,
        refs.isTimerActive,
        refs.startWorkTime,
        refs.workSessions,
        refs.totalMs,
        saveFn
      );
      await flushPromises();

      const sessionId = worktimerApi.startSession.mock.calls[0][0];
      expect(heartbeat.startHeartbeatInterval).toHaveBeenCalledTimes(1);
      expect(heartbeat.startHeartbeatInterval).toHaveBeenCalledWith(
        refs.startWorkTime.value,
        sessionId,
        refs.endTime,
        refs.totalMs,
        refs.workSessions,
        saveFn
      );
    });

    it('startSession 失败时将 start 入队等待补发，仍照常启动本地心跳', async () => {
      vi.useFakeTimers();
      worktimerApi.startSession.mockRejectedValue(new Error('offline'));

      const refs = createRefs();
      controls.startTimer(
        refs.endTime,
        refs.isTimerActive,
        refs.startWorkTime,
        refs.workSessions,
        refs.totalMs,
        () => {}
      );
      await flushPromises();

      const [sessionId, startIso, targetEnd] =
        worktimerApi.startSession.mock.calls[0];
      expect(heartbeat.enqueuePendingStart).toHaveBeenCalledTimes(1);
      expect(heartbeat.enqueuePendingStart).toHaveBeenCalledWith(
        sessionId,
        startIso,
        targetEnd
      );
      expect(heartbeat.startHeartbeatInterval).toHaveBeenCalledTimes(1);
      expect(refs.isTimerActive.value).toBe(true);
    });
  });

  describe('stopTimer', () => {
    it('以距上次心跳的增量发送最终心跳并停止心跳定时器', async () => {
      vi.useFakeTimers();
      const now = new Date(2026, 8, 24, 18, 0, 0);
      vi.setSystemTime(now);

      const refs = createRefs();
      refs.startWorkTime.value = new Date(now.getTime() - 60 * 60 * 1000);
      heartbeat.getLastHeartbeatTs.mockReturnValue(now.getTime() - 60 * 1000);
      const saveFn = vi.fn();

      controls.stopTimer(
        refs.isTimerActive,
        refs.startWorkTime,
        refs.totalMs,
        refs.workSessions,
        saveFn,
        refs.endTime
      );
      await flushPromises();

      expect(refs.isTimerActive.value).toBe(false);
      expect(refs.startWorkTime.value).toBeNull();
      expect(heartbeat.sendHeartbeat).toHaveBeenCalledTimes(1);
      expect(heartbeat.sendHeartbeat).toHaveBeenCalledWith(
        60 * 1000,
        now.toISOString(),
        true,
        refs.totalMs,
        refs.workSessions,
        saveFn,
        refs.endTime
      );
      expect(heartbeat.stopHeartbeatInterval).toHaveBeenCalledTimes(1);
    });

    it('从未开始过（startWorkTime 为空）时最终增量为 0', () => {
      const refs = createRefs();
      controls.stopTimer(
        refs.isTimerActive,
        refs.startWorkTime,
        refs.totalMs,
        refs.workSessions,
        () => {},
        refs.endTime
      );

      expect(refs.isTimerActive.value).toBe(false);
      expect(heartbeat.sendHeartbeat.mock.calls[0][0]).toBe(0);
      expect(heartbeat.stopHeartbeatInterval).toHaveBeenCalled();
    });

    it('最终心跳失败时不向外抛出，仅记录告警', async () => {
      heartbeat.sendHeartbeat.mockReturnValue(
        Promise.reject(new Error('send fail'))
      );
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const refs = createRefs();
      refs.startWorkTime.value = new Date();

      controls.stopTimer(
        refs.isTimerActive,
        refs.startWorkTime,
        refs.totalMs,
        refs.workSessions,
        () => {},
        refs.endTime
      );
      await flushPromises();

      expect(warnSpy).toHaveBeenCalledWith(
        '结束工作计时失败:',
        expect.any(Error)
      );
      expect(refs.isTimerActive.value).toBe(false);
      expect(refs.startWorkTime.value).toBeNull();
    });
  });

  describe('resetTimer', () => {
    it('先结束当前会话，再将结束时间恢复为默认 18:00', async () => {
      const refs = createRefs('17:30');
      refs.startWorkTime.value = new Date();
      heartbeat.getLastHeartbeatTs.mockReturnValue(Date.now() - 60000);

      controls.resetTimer(
        refs.endTime,
        refs.isTimerActive,
        refs.startWorkTime,
        refs.totalMs,
        refs.workSessions,
        () => {}
      );
      await flushPromises();

      expect(heartbeat.sendHeartbeat).toHaveBeenCalledTimes(1);
      expect(heartbeat.stopHeartbeatInterval).toHaveBeenCalled();
      expect(refs.endTime.value).toBe('18:00');
      expect(refs.isTimerActive.value).toBe(false);
      expect(refs.startWorkTime.value).toBeNull();
    });
  });

  describe('playNotificationSound', () => {
    it('播放内置 base64 提示音', () => {
      vi.stubGlobal('Audio', MockAudio);

      controls.playNotificationSound();

      expect(MockAudio.instances).toHaveLength(1);
      expect(MockAudio.instances[0].src).toMatch(/^data:audio\/wav;base64,/);
      expect(MockAudio.instances[0].play).toHaveBeenCalledTimes(1);
    });

    it('Audio 构造失败时静默忽略，不向外抛错', () => {
      vi.stubGlobal(
        'Audio',
        class {
          constructor() {
            throw new Error('no audio device');
          }
        }
      );

      expect(() => controls.playNotificationSound()).not.toThrow();
    });
  });
});

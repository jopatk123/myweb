import { defineComponent, h, nextTick } from 'vue';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/vue';

vi.mock('@/api/worktimer', () => ({
  startSession: vi.fn(),
  heartbeat: vi.fn(),
  stopSession: vi.fn(),
  getStats: vi.fn(),
}));

import * as worktimerApi from '@/api/worktimer';
import { useWorkTimer } from '@/composables/work-timer/index.js';
import { toLocalYmd } from '@/composables/work-timer/timeUtils.js';

const flushPromises = async () => {
  // 多跳微任务刷新，保证被测代码多段 await 的 promise 链完整执行
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

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

class MockAudio {
  static instances = [];
  constructor(src) {
    this.src = src;
    this.play = vi.fn(() => Promise.resolve());
    MockAudio.instances.push(this);
  }
}

// 挂载一个消费 useWorkTimer 的空组件，捕获 composable 返回的完整 API
function mountWorkTimer() {
  const api = {};
  const TestComponent = defineComponent({
    setup() {
      Object.assign(api, useWorkTimer());
      return () => h('div');
    },
  });
  const utils = render(TestComponent);
  return { api, ...utils };
}

// 固定时钟到 2026-09-24 10:00 本地时间，保证日期类断言确定性
function useFixedClock() {
  vi.useFakeTimers();
  const base = new Date(2026, 8, 24, 10, 0, 0);
  vi.setSystemTime(base);
  return base;
}

describe('useWorkTimer（组合式入口）', () => {
  beforeEach(() => {
    // 全局 afterEach 只清调用记录不重置实现，这里统一给定安全默认值
    vi.clearAllMocks();
    worktimerApi.getStats.mockResolvedValue(undefined);
    worktimerApi.startSession.mockResolvedValue({});
    worktimerApi.heartbeat.mockResolvedValue({ totalMs: 0 });
    worktimerApi.stopSession.mockResolvedValue({});
    vi.stubGlobal('localStorage', createMemoryStorage());
    MockAudio.instances = [];
  });

  describe('挂载初始化', () => {
    it('加载本地设置、历史会话与累计时长，并启动时钟', async () => {
      localStorage.setItem(
        'work-timer-settings',
        JSON.stringify({ endTime: '09:30' })
      );
      localStorage.setItem(
        'work-timer-sessions',
        JSON.stringify([{ id: 'old', duration: 1000 }])
      );
      localStorage.setItem('work-timer-total-ms', '12345');

      const { api } = mountWorkTimer();
      await flushPromises();

      expect(api.endTime.value).toBe('09:30');
      expect(api.workSessions.value).toEqual([{ id: 'old', duration: 1000 }]);
      expect(api.totalMs.value).toBe(12345);
      expect(api.currentTime.value.length).toBeGreaterThan(0);
      expect(api.nowMs.value).toBeGreaterThan(0);
      expect(api.circumference).toBeCloseTo(2 * Math.PI * 90, 6);
    });

    it('getStats 成功后用服务器统计覆盖本地显示', async () => {
      worktimerApi.getStats.mockResolvedValue({
        todayMs: 5400000,
        weekMs: 36000000,
        totalMs: 72000000,
      });

      const { api } = mountWorkTimer();
      await vi.waitFor(() => {
        expect(api.todayWorkTime.value).toBe('1小时30分钟');
      });

      expect(api.weekWorkTime.value).toBe('10小时0分钟');
      expect(api.totalMs.value).toBe(72000000);
    });

    it('getStats 失败仅告警，不阻塞本地初始化', async () => {
      worktimerApi.getStats.mockRejectedValue(new Error('boom'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem(
        'work-timer-settings',
        JSON.stringify({ endTime: '09:30' })
      );

      const { api } = mountWorkTimer();
      await flushPromises();

      expect(api.endTime.value).toBe('09:30');
      expect(warnSpy).toHaveBeenCalledWith(
        '加载工作计时统计失败:',
        expect.any(Error)
      );
    });

    it('时钟每秒刷新 currentTime 与 nowMs', async () => {
      const base = useFixedClock();
      const { api } = mountWorkTimer();
      await flushPromises();

      expect(api.nowMs.value).toBe(base.getTime());

      await vi.advanceTimersByTimeAsync(3 * 1000);

      expect(api.nowMs.value).toBe(base.getTime() + 3000);
      expect(api.currentTime.value).toBe(
        new Date(base.getTime() + 3000).toLocaleTimeString('zh-CN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    });
  });

  describe('状态机（开始 / 停止 / 重置 / 预设）', () => {
    it('startTimer：进入计时态、创建本地占位会话并通知服务端', async () => {
      const base = useFixedClock();
      worktimerApi.startSession.mockResolvedValue({});
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 0 });

      const { api } = mountWorkTimer();
      await flushPromises();
      api.setPreset('17:30');
      api.startTimer();
      await flushPromises();

      expect(api.isTimerActive.value).toBe(true);
      expect(api.startWorkTime.value).toBeInstanceOf(Date);

      expect(api.workSessions.value).toHaveLength(1);
      const session = api.workSessions.value[0];
      expect(session.duration).toBe(0);
      expect(session.is_active).toBe(1);
      expect(session.targetEndTime).toBe('17:30');
      expect(session.date).toBe(toLocalYmd(base));
      expect(session.startTime).toBe(base.toISOString());

      const [sessionId, startIso, targetEnd] =
        worktimerApi.startSession.mock.calls[0];
      expect(session.id).toBe(sessionId);
      expect(startIso).toBe(base.toISOString());
      expect(targetEnd).toBe('17:30');
      expect(
        JSON.parse(localStorage.getItem('work-timer-sessions'))
      ).toHaveLength(1);
    });

    it('计时中每满一分钟通过心跳累计本地时长并持久化', async () => {
      const base = useFixedClock();
      worktimerApi.startSession.mockResolvedValue({});

      const { api } = mountWorkTimer();
      await flushPromises();
      worktimerApi.heartbeat.mockImplementation(
        async (_sessionId, incrementMs) => ({
          totalMs: api.totalMs.value + incrementMs,
        })
      );
      api.startTimer();
      await flushPromises();

      await vi.advanceTimersByTimeAsync(60 * 1000);
      const sessionId = api.workSessions.value[0].id;
      expect(worktimerApi.heartbeat).toHaveBeenCalledTimes(1);
      expect(worktimerApi.heartbeat).toHaveBeenCalledWith(
        sessionId,
        60000,
        new Date(base.getTime() + 60000).toISOString()
      );
      expect(api.totalMs.value).toBe(60000);
      expect(api.workSessions.value[0].duration).toBe(60000);
      expect(localStorage.getItem('work-timer-total-ms')).toBe('60000');

      await vi.advanceTimersByTimeAsync(60 * 1000);
      expect(worktimerApi.heartbeat).toHaveBeenCalledTimes(2);
      expect(api.workSessions.value[0].duration).toBe(120000);
      expect(api.totalMs.value).toBe(120000);
    });

    it('stopTimer：发送最终增量、结束服务端会话并停用心跳定时器', async () => {
      const base = useFixedClock();
      worktimerApi.startSession.mockResolvedValue({});
      worktimerApi.stopSession.mockResolvedValue({});

      const { api } = mountWorkTimer();
      await flushPromises();
      worktimerApi.heartbeat.mockImplementation(
        async (_sessionId, incrementMs) => ({
          totalMs: api.totalMs.value + incrementMs,
        })
      );
      api.startTimer();
      await flushPromises();
      await vi.advanceTimersByTimeAsync(60 * 1000);
      await vi.advanceTimersByTimeAsync(1 * 1000);

      api.stopTimer();
      await flushPromises();

      expect(api.isTimerActive.value).toBe(false);
      expect(api.startWorkTime.value).toBeNull();

      const sessionId = api.workSessions.value[0].id;
      expect(worktimerApi.stopSession).toHaveBeenCalledWith(
        sessionId,
        new Date(base.getTime() + 61000).toISOString(),
        null
      );
      expect(api.workSessions.value[0].duration).toBe(61000);
      expect(api.workSessions.value[0].endTime).toBe(
        new Date(base.getTime() + 61000).toISOString()
      );
      expect(api.workSessions.value[0].is_active).toBe(0);

      // 定时器已停止：再推进时间不再发送心跳
      worktimerApi.heartbeat.mockClear();
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      expect(worktimerApi.heartbeat).not.toHaveBeenCalled();
    });

    it('stopTimer：未开始计时时直接忽略，不发送任何请求', async () => {
      useFixedClock();
      const { api } = mountWorkTimer();
      await flushPromises();

      api.stopTimer();
      await flushPromises();

      expect(api.isTimerActive.value).toBe(false);
      expect(worktimerApi.heartbeat).not.toHaveBeenCalled();
      expect(worktimerApi.stopSession).not.toHaveBeenCalled();
    });

    it('resetTimer：结束计时并把结束时间恢复为默认 18:00', async () => {
      useFixedClock();
      worktimerApi.startSession.mockResolvedValue({});
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 0 });
      worktimerApi.stopSession.mockResolvedValue({});

      const { api } = mountWorkTimer();
      await flushPromises();
      api.setPreset('17:30');
      api.startTimer();
      await flushPromises();

      api.resetTimer();
      await flushPromises();

      expect(api.endTime.value).toBe('18:00');
      expect(api.isTimerActive.value).toBe(false);
      expect(api.startWorkTime.value).toBeNull();
    });

    it('startTimer：结束时间为空时不启动', () => {
      useFixedClock();
      const { api } = mountWorkTimer();
      api.endTime.value = '';
      api.startTimer();

      expect(api.isTimerActive.value).toBe(false);
      expect(api.workSessions.value).toHaveLength(0);
      expect(worktimerApi.startSession).not.toHaveBeenCalled();
    });

    it('setPreset：修改结束时间并持久化设置', async () => {
      const { api } = mountWorkTimer();
      await flushPromises();

      api.setPreset('17:30');
      await nextTick();

      expect(api.endTime.value).toBe('17:30');
      expect(JSON.parse(localStorage.getItem('work-timer-settings'))).toEqual({
        endTime: '17:30',
      });
    });
  });

  describe('加班提示音', () => {
    it('进入加班瞬间播放一次提示音，保持加班态不重复播放', async () => {
      useFixedClock(); // 10:00
      vi.stubGlobal('Audio', MockAudio);
      worktimerApi.startSession.mockResolvedValue({});
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 0 });

      const { api } = mountWorkTimer();
      await flushPromises();
      api.setPreset('10:30');
      api.startTimer();
      await flushPromises();

      expect(MockAudio.instances).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

      expect(api.isOvertime.value).toBe(true);
      expect(MockAudio.instances).toHaveLength(1);
      expect(MockAudio.instances[0].src).toMatch(/^data:audio\/wav;base64,/);
      expect(MockAudio.instances[0].play).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(60 * 1000);
      expect(MockAudio.instances).toHaveLength(1);
    });
  });

  describe('离线恢复', () => {
    it('离线计时结束后，联网恢复时按 start → heartbeat → stop 补发', async () => {
      const base = useFixedClock();
      vi.stubGlobal('navigator', { onLine: false });
      worktimerApi.startSession.mockRejectedValue(new Error('offline'));

      const { api } = mountWorkTimer();
      await flushPromises();
      api.startTimer();
      await flushPromises();

      expect(api.workSessions.value).toHaveLength(1);
      const sessionId = api.workSessions.value[0].id;

      await vi.advanceTimersByTimeAsync(60 * 1000);
      await vi.advanceTimersByTimeAsync(1 * 1000);
      api.stopTimer();
      await flushPromises();

      expect(api.isTimerActive.value).toBe(false);
      expect(
        JSON.parse(localStorage.getItem('work-timer-pending-starts'))
      ).toEqual([
        { sessionId, startIso: base.toISOString(), targetEndTime: '18:00' },
      ]);
      expect(
        JSON.parse(localStorage.getItem('work-timer-pending-heartbeats'))
      ).toEqual([
        {
          sessionId,
          incrementMs: 60000,
          lastUpdate: new Date(base.getTime() + 60000).toISOString(),
        },
        {
          sessionId,
          incrementMs: 1000,
          lastUpdate: new Date(base.getTime() + 61000).toISOString(),
        },
      ]);
      expect(
        JSON.parse(localStorage.getItem('work-timer-pending-stops'))
      ).toEqual([
        {
          sessionId,
          endTimeIso: new Date(base.getTime() + 61000).toISOString(),
        },
      ]);

      // 网络恢复 → 自动补发
      vi.stubGlobal('navigator', { onLine: true });
      worktimerApi.startSession.mockResolvedValue({});
      worktimerApi.heartbeat.mockResolvedValue({});
      worktimerApi.stopSession.mockResolvedValue({});
      worktimerApi.startSession.mockClear();
      window.dispatchEvent(new Event('online'));
      await flushPromises();

      expect(worktimerApi.startSession.mock.calls[0]).toEqual([
        sessionId,
        base.toISOString(),
        '18:00',
      ]);
      expect(worktimerApi.heartbeat.mock.calls.map(call => call[1])).toEqual([
        60000, 1000,
      ]);
      expect(worktimerApi.stopSession).toHaveBeenCalledWith(
        sessionId,
        new Date(base.getTime() + 61000).toISOString(),
        null
      );

      const order = [
        worktimerApi.startSession.mock.invocationCallOrder[0],
        worktimerApi.heartbeat.mock.invocationCallOrder[0],
        worktimerApi.stopSession.mock.invocationCallOrder[0],
      ];
      expect(order[0]).toBeLessThan(order[1]);
      expect(order[1]).toBeLessThan(order[2]);

      expect(localStorage.getItem('work-timer-pending-starts')).toBeNull();
      expect(localStorage.getItem('work-timer-pending-heartbeats')).toBeNull();
      expect(localStorage.getItem('work-timer-pending-stops')).toBeNull();
    });
  });

  describe('卸载清理', () => {
    it('卸载后停止时钟、心跳定时器与网络恢复监听', async () => {
      useFixedClock();
      worktimerApi.startSession.mockResolvedValue({});
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 0 });

      const { api, unmount } = mountWorkTimer();
      await flushPromises();
      api.startTimer();
      await flushPromises();

      const timeBefore = api.currentTime.value;
      unmount();

      await vi.advanceTimersByTimeAsync(2 * 1000);
      expect(api.currentTime.value).toBe(timeBefore);
      expect(api.nowMs.value).toBe(new Date(2026, 8, 24, 10, 0, 0).getTime());

      await vi.advanceTimersByTimeAsync(60 * 1000);
      expect(worktimerApi.heartbeat).not.toHaveBeenCalled();

      // 监听已移除：网络恢复事件不再触发补发
      worktimerApi.startSession.mockClear();
      worktimerApi.stopSession.mockClear();
      window.dispatchEvent(new Event('online'));
      await flushPromises();
      expect(worktimerApi.startSession).not.toHaveBeenCalled();
      expect(worktimerApi.stopSession).not.toHaveBeenCalled();
    });
  });
});

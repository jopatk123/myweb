import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

vi.mock('@/api/worktimer.js', () => ({
  startSession: vi.fn(),
  heartbeat: vi.fn(),
  stopSession: vi.fn(),
  getStats: vi.fn(),
}));

import { useWorkTimer } from '@/composables/useWorkTimer.js';
import * as worktimerApi from '@/api/worktimer.js';
import { TimerControls } from '@/composables/work-timer/timerControls.js';

describe('useWorkTimer', () => {
  let api = null;
  let wrapper = null;

  const Harness = defineComponent({
    setup() {
      api = useWorkTimer();
      return () => null;
    },
  });

  const mountTimer = () => {
    wrapper = mount(Harness);
    return api;
  };

  beforeEach(() => {
    localStorage.clear();
    worktimerApi.getStats.mockResolvedValue(null);
    worktimerApi.startSession.mockResolvedValue(undefined);
    worktimerApi.heartbeat.mockResolvedValue({});
    worktimerApi.stopSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  describe('初始状态与挂载加载', () => {
    it('暴露基线状态与进度环常量', () => {
      const timer = mountTimer();
      expect(timer.endTime.value).toBe('18:00');
      expect(timer.isTimerActive.value).toBe(false);
      expect(timer.workSessions.value).toEqual([]);
      expect(timer.totalMs.value).toBe(0);
      expect(timer.circumference).toBeCloseTo(2 * Math.PI * 90, 10);
      expect(timer.displayTime.value).toBe('--:--:--');
      expect(timer.timeLabel.value).toBe('未开始');
    });

    it('挂载时恢复本地持久化的设置 / 会话 / 累计时长', () => {
      localStorage.setItem(
        'work-timer-settings',
        JSON.stringify({ endTime: '09:15' })
      );
      localStorage.setItem(
        'work-timer-sessions',
        JSON.stringify([
          {
            id: 's1',
            date: '2026-09-24',
            startTime: '2026-09-24T08:00:00Z',
            duration: 60000,
          },
        ])
      );
      localStorage.setItem('work-timer-total-ms', '3600000');

      const timer = mountTimer();
      expect(timer.endTime.value).toBe('09:15');
      expect(timer.workSessions.value).toHaveLength(1);
      expect(timer.totalMs.value).toBe(3600000);
    });

    it('挂载时拉取服务端统计并回填今日 / 本周 / 累计展示', async () => {
      worktimerApi.getStats.mockResolvedValue({
        todayMs: 5400000, // 1.5 小时
        weekMs: 90000000, // 25 小时
        totalMs: 3000,
      });

      const timer = mountTimer();
      await flushPromises();

      expect(worktimerApi.getStats).toHaveBeenCalled();
      // 服务端数据优先于本地会话汇总
      expect(timer.todayWorkTime.value).toBe('1小时30分钟');
      expect(timer.weekWorkTime.value).toBe('25小时0分钟');
      expect(timer.totalMs.value).toBe(3000);
    });

    it('统计接口失败仅告警，回退到本地会话汇总', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      worktimerApi.getStats.mockRejectedValue(new Error('server down'));
      const now = new Date();
      const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      localStorage.setItem(
        'work-timer-sessions',
        JSON.stringify([
          { id: 's1', startTime: `${ymd}T08:00:00`, duration: 60000 },
        ])
      );
      localStorage.setItem('work-timer-total-ms', '123');

      const timer = mountTimer();
      await flushPromises();

      expect(warnSpy).toHaveBeenCalled();
      // 未被服务端数据覆盖：今日时长仍来自本地会话
      expect(timer.todayWorkTime.value).toBe('0小时1分钟');
      expect(timer.totalMs.value).toBe(123);
    });
  });

  describe('setPreset', () => {
    it('更新结束时间并持久化设置', async () => {
      const timer = mountTimer();
      timer.setPreset('09:00');
      // 持久化通过 pre-flush watch 触发，需等一次 tick
      await nextTick();

      expect(timer.endTime.value).toBe('09:00');
      expect(JSON.parse(localStorage.getItem('work-timer-settings'))).toEqual({
        endTime: '09:00',
      });
    });
  });

  describe('startTimer', () => {
    it('激活计时、登记本地会话并请求服务端 startSession', async () => {
      const timer = mountTimer();
      timer.setPreset('23:59');
      timer.startTimer();
      await flushPromises();

      expect(timer.isTimerActive.value).toBe(true);
      expect(timer.startWorkTime.value).toBeInstanceOf(Date);
      expect(timer.timeLabel.value).toBe('距离下班');

      expect(timer.workSessions.value).toHaveLength(1);
      const session = timer.workSessions.value[0];
      expect(session.is_active).toBe(1);
      expect(session.duration).toBe(0);
      expect(session.targetEndTime).toBe('23:59');

      // 本地占位已持久化
      expect(
        JSON.parse(localStorage.getItem('work-timer-sessions'))
      ).toHaveLength(1);

      expect(worktimerApi.startSession).toHaveBeenCalledWith(
        session.id,
        expect.any(String),
        '23:59'
      );
    });

    it('未设置结束时间时直接忽略启动请求', async () => {
      const timer = mountTimer();
      timer.setPreset('');
      timer.startTimer();
      await flushPromises();

      expect(timer.isTimerActive.value).toBe(false);
      expect(timer.workSessions.value).toHaveLength(0);
      expect(worktimerApi.startSession).not.toHaveBeenCalled();
    });

    it('startSession 失败时把会话起点持久化到待发送队列', async () => {
      worktimerApi.startSession.mockRejectedValue(new Error('offline'));
      const timer = mountTimer();
      timer.setPreset('23:59');
      timer.startTimer();
      await flushPromises();

      const pending = JSON.parse(
        localStorage.getItem('work-timer-pending-starts')
      );
      expect(pending).toHaveLength(1);
      expect(pending[0].sessionId).toBe(timer.workSessions.value[0].id);
      expect(pending[0].targetEndTime).toBe('23:59');
    });
  });

  describe('stopTimer', () => {
    it('在线停止：发送最终心跳、关闭会话并回写服务端累计', async () => {
      const timer = mountTimer();
      timer.setPreset('23:59');
      timer.startTimer();
      await flushPromises();

      const sessionId = timer.workSessions.value[0].id;
      worktimerApi.heartbeat.mockResolvedValue({ totalMs: 60000 });

      timer.stopTimer();
      await flushPromises();

      expect(timer.isTimerActive.value).toBe(false);
      expect(timer.startWorkTime.value).toBeNull();
      expect(worktimerApi.heartbeat).toHaveBeenCalledWith(
        sessionId,
        expect.any(Number),
        expect.any(String)
      );
      // 最终增量已由心跳落库，stop 不再重复传增量
      expect(worktimerApi.stopSession).toHaveBeenCalledWith(
        sessionId,
        expect.any(String),
        null
      );

      const session = timer.workSessions.value[0];
      expect(session.is_active).toBe(0);
      expect(session.endTime).toBeTruthy();
      expect(timer.totalMs.value).toBe(60000);
      // 停止后状态已持久化
      const stored = JSON.parse(localStorage.getItem('work-timer-sessions'));
      expect(stored[0].is_active).toBe(0);
      expect(localStorage.getItem('work-timer-total-ms')).toBe('60000');
    });

    it('离线停止：不调用 API，改为持久化待发送的心跳与 stop', async () => {
      const onlineSpy = vi
        .spyOn(window.navigator, 'onLine', 'get')
        .mockReturnValue(false);
      const timer = mountTimer();
      timer.setPreset('23:59');
      timer.startTimer();
      await flushPromises();

      const sessionId = timer.workSessions.value[0].id;
      timer.stopTimer();
      await flushPromises();

      expect(worktimerApi.heartbeat).not.toHaveBeenCalled();
      expect(worktimerApi.stopSession).not.toHaveBeenCalled();

      const heartbeats = JSON.parse(
        localStorage.getItem('work-timer-pending-heartbeats')
      );
      const stops = JSON.parse(
        localStorage.getItem('work-timer-pending-stops')
      );
      expect(heartbeats).toHaveLength(1);
      expect(heartbeats[0].sessionId).toBe(sessionId);
      expect(stops).toHaveLength(1);
      expect(stops[0].sessionId).toBe(sessionId);
      onlineSpy.mockRestore();
    });
  });

  describe('resetTimer', () => {
    it('停止计时并把结束时间恢复为默认 18:00', async () => {
      const timer = mountTimer();
      timer.setPreset('23:00');
      timer.startTimer();
      await flushPromises();

      timer.resetTimer();

      expect(timer.isTimerActive.value).toBe(false);
      expect(timer.endTime.value).toBe('18:00');
      expect(timer.startWorkTime.value).toBeNull();
    });
  });

  describe('加班提醒', () => {
    it('从非加班切换到加班状态时播放提示音', async () => {
      const playSpy = vi
        .spyOn(TimerControls.prototype, 'playNotificationSound')
        .mockImplementation(() => {});
      const timer = mountTimer();

      // 正常计时中不提示
      timer.setPreset('23:59');
      timer.startTimer();
      await nextTick();
      expect(playSpy).not.toHaveBeenCalled();

      // 结束时间切到今天已过的时刻 → 进入加班 → 提示音
      timer.setPreset('00:00');
      await nextTick();
      expect(playSpy).toHaveBeenCalledTimes(1);
    });

    it('未开始计时时即便已过结束时间也不提示', async () => {
      const playSpy = vi
        .spyOn(TimerControls.prototype, 'playNotificationSound')
        .mockImplementation(() => {});
      const timer = mountTimer();

      timer.setPreset('00:00');
      await nextTick();
      expect(playSpy).not.toHaveBeenCalled();
    });
  });

  describe('时钟与生命周期', () => {
    it('每秒时钟推进 currentTime/nowMs', () => {
      vi.useFakeTimers({
        toFake: [
          'setTimeout',
          'clearTimeout',
          'setInterval',
          'clearInterval',
          'Date',
        ],
      });
      vi.setSystemTime(new Date('2026-09-24T10:00:00'));

      const timer = mountTimer();
      const t0 = Date.now();
      expect(timer.nowMs.value).toBe(t0);
      expect(timer.currentTime.value).toBeTruthy();

      vi.advanceTimersByTime(1000);
      expect(timer.nowMs.value).toBe(t0 + 1000);
      expect(timer.currentTime.value).toBeTruthy();
    });

    it('卸载时移除 online 监听并停止心跳定时器', async () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const timer = mountTimer();
      const onlineHandlers = addSpy.mock.calls
        .filter(([type]) => type === 'online')
        .map(([, handler]) => handler);
      expect(onlineHandlers).toHaveLength(1);

      timer.setPreset('23:59');
      timer.startTimer();
      await flushPromises();

      wrapper.unmount();
      wrapper = null;

      const removed = removeSpy.mock.calls.filter(
        ([type, handler]) => type === 'online' && handler === onlineHandlers[0]
      );
      expect(removed).toHaveLength(1);
    });
  });
});

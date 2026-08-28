import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { createComputedProperties } from '@/composables/work-timer/computed.js';

function createRefs({
  endTime = '18:00',
  nowMs = Date.now(),
  isTimerActive = true,
} = {}) {
  const refs = {
    isTimerActive: ref(isTimerActive),
    endTime: ref(endTime),
    nowMs: ref(nowMs),
    workSessions: ref([]),
    serverTodayMs: ref(null),
    serverWeekMs: ref(null),
  };
  const props = createComputedProperties(
    refs.isTimerActive,
    refs.endTime,
    refs.nowMs,
    refs.workSessions,
    refs.serverTodayMs,
    refs.serverWeekMs,
    2 * Math.PI * 90
  );
  return { refs, props };
}

function toHHMM(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
}

describe('work-timer computed properties', () => {
  describe('isOvertime（加班判定回归）', () => {
    it('计时中超过结束时间后进入加班态', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      // 距今 2 小时前若跨天（如午夜刚过），本地结束时间会落到未来，跳过该用例
      if (past.getDate() !== now.getDate()) return;

      const { props } = createRefs({ endTime: toHHMM(past) });

      expect(props.isOvertime.value).toBe(true);
      expect(props.timeLabel.value).toBe('已加班');
      expect(props.displayTime.value.startsWith('+')).toBe(true);
    });

    it('结束时间未到时不处于加班态', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      if (future.getDate() !== now.getDate()) return;

      const { props } = createRefs({ endTime: toHHMM(future) });

      expect(props.isOvertime.value).toBe(false);
      expect(props.timeLabel.value).toBe('距离下班');
    });

    it('未开始计时时永远不是加班态', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      if (past.getDate() !== now.getDate()) return;

      const { props } = createRefs({
        endTime: toHHMM(past),
        isTimerActive: false,
      });

      expect(props.isOvertime.value).toBe(false);
      expect(props.displayTime.value).toBe('--:--:--');
      expect(props.timeLabel.value).toBe('未开始');
    });

    it('结束时间为空时不误判加班', () => {
      const { props } = createRefs({ endTime: '' });

      expect(props.isOvertime.value).toBe(false);
      expect(props.displayTime.value).toBe('00:00:00');
    });
  });

  describe('isWarning', () => {
    it('距结束时间不足 30 分钟且未加班时进入警告态', () => {
      const now = new Date();
      const soon = new Date(now.getTime() + 10 * 60 * 1000);
      if (soon.getDate() !== now.getDate()) return;

      const { props } = createRefs({ endTime: toHHMM(soon) });

      expect(props.isWarning.value).toBe(true);
      expect(props.isOvertime.value).toBe(false);
    });

    it('加班态不触发警告（两状态互斥）', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      if (past.getDate() !== now.getDate()) return;

      const { props } = createRefs({ endTime: toHHMM(past) });

      expect(props.isOvertime.value).toBe(true);
      expect(props.isWarning.value).toBe(false);
    });
  });
});

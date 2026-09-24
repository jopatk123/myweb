import { describe, expect, it, vi } from 'vitest';
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

  // 以下用例固定时钟，避免真实时间带来的跨天跳过逻辑
  const CIRCUMFERENCE = 2 * Math.PI * 90;

  // 固定到本地时间 (2026, 9月, 23日 周三, h, min)
  function useFixedClock(h, min) {
    vi.useFakeTimers();
    const fixed = new Date(2026, 8, 23, h, min, 0);
    vi.setSystemTime(fixed);
    return fixed;
  }

  const isoOf = (day, h, m) => new Date(2026, 8, day, h, m, 0).toISOString();

  describe('displayTime / timeLabel（计时刻度）', () => {
    it('计时中未到结束时间：显示剩余时间', () => {
      const fixed = useFixedClock(10, 0);
      const { props } = createRefs({
        endTime: '12:00',
        nowMs: fixed.getTime(),
      });

      expect(props.timeRemaining.value).toBe(2 * 60 * 60 * 1000);
      expect(props.displayTime.value).toBe('02:00:00');
      expect(props.timeLabel.value).toBe('距离下班');
      expect(props.isWarning.value).toBe(false);
    });

    it('剩余时间恰为 30 分钟时进入警告态（含边界）', () => {
      const fixed = useFixedClock(10, 0);
      const { props } = createRefs({
        endTime: '10:30',
        nowMs: fixed.getTime(),
      });

      expect(props.isWarning.value).toBe(true);
      expect(props.isOvertime.value).toBe(false);
    });

    it('剩余时间超过 30 分钟时不警告', () => {
      const fixed = useFixedClock(10, 0);
      const { props } = createRefs({
        endTime: '10:31',
        nowMs: fixed.getTime(),
      });

      expect(props.isWarning.value).toBe(false);
    });

    it('未开始计时时即使临近结束时间也不警告', () => {
      const fixed = useFixedClock(10, 0);
      const { props } = createRefs({
        endTime: '10:30',
        nowMs: fixed.getTime(),
        isTimerActive: false,
      });

      expect(props.isWarning.value).toBe(false);
    });

    it('跨天场景：结束时间为今天凌晨已过时刻时按加班处理而非顺延', () => {
      const fixed = useFixedClock(10, 0);
      const { props } = createRefs({
        endTime: '00:30',
        nowMs: fixed.getTime(),
      });

      // calculateTimeRemaining 会把已过时间顺延到明天，但加班判定基于今天已超时部分
      expect(props.isOvertime.value).toBe(true);
      expect(props.displayTime.value).toBe('+09:30:00');
      expect(props.timeLabel.value).toBe('已加班');
      expect(props.isWarning.value).toBe(false);
    });
  });

  describe('progressOffset（进度环）', () => {
    it('未开始或加班时显示满环', () => {
      const fixed = useFixedClock(10, 0);
      const inactive = createRefs({
        endTime: '12:00',
        nowMs: fixed.getTime(),
        isTimerActive: false,
      });
      expect(inactive.props.progressOffset.value).toBe(CIRCUMFERENCE);

      const overtime = createRefs({
        endTime: '08:00',
        nowMs: fixed.getTime(),
      });
      expect(overtime.props.progressOffset.value).toBe(CIRCUMFERENCE);
    });

    it('按 8 小时工作制线性推进：剩 2 小时时已推进 3/4（offset 为 1/4 环）', () => {
      const fixed = useFixedClock(10, 0);
      const { props } = createRefs({
        endTime: '12:00',
        nowMs: fixed.getTime(),
      });

      expect(props.progressOffset.value).toBeCloseTo(CIRCUMFERENCE / 4, 6);
    });

    it('剩余时间超过 8 小时（跨天）时钳制为 0 进度', () => {
      const fixed = useFixedClock(0, 10);
      const { props } = createRefs({
        endTime: '23:00',
        nowMs: fixed.getTime(),
      });

      expect(props.timeRemaining.value).toBeGreaterThan(8 * 60 * 60 * 1000);
      expect(props.progressOffset.value).toBe(CIRCUMFERENCE);
    });
  });

  describe('todayWorkTime（今日工时）', () => {
    it('服务器统计优先于本地会话', () => {
      const fixed = useFixedClock(10, 0);
      const { refs, props } = createRefs({ nowMs: fixed.getTime() });
      refs.workSessions.value.push({
        startTime: fixed.toISOString(),
        duration: 999999,
      });
      refs.serverTodayMs.value = 5400000;

      expect(props.todayWorkTime.value).toBe('1小时30分钟');
    });

    it('本地模式：按 startTime / date 过滤今天的会话并求和', () => {
      const fixed = useFixedClock(10, 0);
      const { refs, props } = createRefs({ nowMs: fixed.getTime() });
      refs.workSessions.value.push(
        { id: 'a', startTime: isoOf(23, 9, 0), duration: 3600000 }, // 今天（startTime 命中）
        { id: 'b', startTime: isoOf(22, 9, 0), duration: 7200000 }, // 昨天 → 排除
        { id: 'c', date: '2026-09-23', duration: 1800000 }, // 今天（date 字符串切片）
        { id: 'd', date: new Date(2026, 8, 23, 15, 0), duration: 600000 }, // 今天（Date 对象）
        { id: 'e', date: '2026-9-23', duration: 900000 }, // 短格式走 toLocalYmd 解析
        { id: 'f', startTime: isoOf(23, 8, 0) }, // duration 缺失按 0 计
        { id: 'g' }, // 无时间来源 → 排除
        { id: 'h', date: '2026-09-22', duration: 60000 } // 昨天仅 date → 排除
      );

      // 3600000 + 1800000 + 600000 + 900000 = 1小时55分钟
      expect(props.todayWorkTime.value).toBe('1小时55分钟');
    });
  });

  describe('weekWorkTime（本周工时）', () => {
    it('服务器统计优先于本地会话', () => {
      const fixed = useFixedClock(10, 0);
      const { refs, props } = createRefs({ nowMs: fixed.getTime() });
      refs.workSessions.value.push({
        startTime: fixed.toISOString(),
        duration: 999999,
      });
      refs.serverWeekMs.value = 7200000;

      expect(props.weekWorkTime.value).toBe('2小时0分钟');
    });

    it('本地模式：仅统计本周（周一起）的会话', () => {
      const fixed = useFixedClock(10, 0); // 2026-09-23 周三，本周一为 09-21
      const { refs, props } = createRefs({ nowMs: fixed.getTime() });
      refs.workSessions.value.push(
        { id: 'a', startTime: isoOf(21, 9, 0), duration: 3600000 }, // 本周一 → 计入
        { id: 'b', startTime: isoOf(20, 20, 0), duration: 7200000 }, // 上周日 → 排除
        { id: 'c', date: '2026-09-22', duration: 1800000 }, // 本周二 → 计入
        { id: 'd', date: '2026-09-14', duration: 60000 }, // 上周一 → 排除
        { id: 'e', startTime: isoOf(21, 0, 0) } // duration 缺失按 0 计
      );

      // 3600000 + 1800000 = 1小时30分钟
      expect(props.weekWorkTime.value).toBe('1小时30分钟');
    });
  });
});

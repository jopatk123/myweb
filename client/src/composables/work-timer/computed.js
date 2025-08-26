import { computed } from 'vue';
import {
  calculateTimeRemaining,
  calculateOvertime,
  formatTimeRemaining,
  formatOvertime,
  formatWorkTime,
  toLocalYmd,
  getWeekStart,
} from './timeUtils.js';

// 计算属性逻辑
export function createComputedProperties(
  isTimerActive,
  endTime,
  nowMs,
  workSessions,
  serverTodayMs,
  serverWeekMs,
  circumference
) {
  const timeRemaining = computed(() => {
    return calculateTimeRemaining(endTime.value, nowMs.value);
  });

  const isOvertime = computed(() => {
    return isTimerActive.value && timeRemaining.value === 0;
  });

  const isWarning = computed(() => {
    return (
      isTimerActive.value &&
      timeRemaining.value > 0 &&
      timeRemaining.value <= 30 * 60 * 1000
    );
  });

  const displayTime = computed(() => {
    if (!isTimerActive.value) return '--:--:--';

    if (isOvertime.value) {
      const overtime = calculateOvertime(endTime.value, nowMs.value);
      return formatOvertime(overtime);
    }

    return formatTimeRemaining(timeRemaining.value);
  });

  const timeLabel = computed(() => {
    if (!isTimerActive.value) return '未开始';
    if (isOvertime.value) return '已加班';
    return '距离下班';
  });

  const progressOffset = computed(() => {
    if (!isTimerActive.value || isOvertime.value) return circumference;

    const totalWorkTime = 8 * 60 * 60 * 1000; // 8小时
    const elapsed = totalWorkTime - timeRemaining.value;
    const progress = Math.max(0, Math.min(1, elapsed / totalWorkTime));

    return circumference - progress * circumference;
  });

  const todayWorkTime = computed(() => {
    if (serverTodayMs.value !== null) {
      return formatWorkTime(serverTodayMs.value);
    }

    const todayYmd = toLocalYmd(new Date());
    const todaySessions = workSessions.value.filter(session => {
      const src = session.startTime || session.date;
      if (!src) return false;
      if (session.startTime) return toLocalYmd(session.startTime) === todayYmd;
      // session.date 可能已是 YYYY-MM-DD
      const ymd =
        typeof session.date === 'string' && session.date.length >= 10
          ? session.date.slice(0, 10)
          : toLocalYmd(session.date);
      return ymd === todayYmd;
    });

    const totalMsLocal = todaySessions.reduce(
      (total, session) => total + (session.duration || 0),
      0
    );

    return formatWorkTime(totalMsLocal);
  });

  const weekWorkTime = computed(() => {
    if (serverWeekMs.value !== null) {
      return formatWorkTime(serverWeekMs.value);
    }

    const weekStart = getWeekStart();
    const weekStartYmd = toLocalYmd(weekStart);

    const weekSessions = workSessions.value.filter(session => {
      const src = session.startTime || session.date;
      if (!src) return false;
      if (session.startTime) return new Date(session.startTime) >= weekStart;
      const ymd =
        typeof session.date === 'string' && session.date.length >= 10
          ? session.date.slice(0, 10)
          : toLocalYmd(session.date);
      return ymd >= weekStartYmd;
    });

    const totalMsLocal = weekSessions.reduce(
      (total, session) => total + (session.duration || 0),
      0
    );

    return formatWorkTime(totalMsLocal);
  });

  return {
    timeRemaining,
    isOvertime,
    isWarning,
    displayTime,
    timeLabel,
    progressOffset,
    todayWorkTime,
    weekWorkTime,
  };
}

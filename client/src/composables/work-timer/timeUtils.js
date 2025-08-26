// 时间工具函数
export function toLocalYmd(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function formatTimeRemaining(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatOvertime(overtimeMs) {
  const overtimeHours = Math.floor(overtimeMs / (1000 * 60 * 60));
  const overtimeMinutes = Math.floor(
    (overtimeMs % (1000 * 60 * 60)) / (1000 * 60)
  );
  const overtimeSeconds = Math.floor((overtimeMs % (1000 * 60)) / 1000);

  return `+${String(overtimeHours).padStart(2, '0')}:${String(overtimeMinutes).padStart(2, '0')}:${String(overtimeSeconds).padStart(2, '0')}`;
}

export function formatWorkTime(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}小时${minutes}分钟`;
}

export function updateCurrentTime() {
  const now = new Date();
  return {
    currentTime: now.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    nowMs: now.getTime(),
  };
}

export function calculateTimeRemaining(endTime, nowMs) {
  if (!endTime) return 0;

  const now = new Date(nowMs);
  const [hours, minutes] = endTime.split(':').map(Number);
  const endDateTime = new Date();
  endDateTime.setHours(hours, minutes, 0, 0);

  if (endDateTime <= now) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }

  return Math.max(0, endDateTime.getTime() - now.getTime());
}

export function calculateOvertime(endTime, nowMs) {
  const now = new Date(nowMs);
  const [hours, minutes] = endTime.split(':').map(Number);
  const endDateTime = new Date();
  endDateTime.setHours(hours, minutes, 0, 0);

  return now.getTime() - endDateTime.getTime();
}

export function getWeekStart() {
  const now = new Date();
  const weekStart = new Date(now);
  // 周一作为一周开始
  const diffToMonday = (now.getDay() + 6) % 7;
  weekStart.setDate(now.getDate() - diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

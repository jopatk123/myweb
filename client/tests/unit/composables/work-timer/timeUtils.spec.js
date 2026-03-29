import { describe, expect, it } from 'vitest';
import {
  toLocalYmd,
  formatTimeRemaining,
  formatOvertime,
  formatWorkTime,
  updateCurrentTime,
  calculateTimeRemaining,
  calculateOvertime,
  getWeekStart,
} from '@/composables/work-timer/timeUtils.js';

describe('work-timer timeUtils', () => {
  describe('toLocalYmd', () => {
    it('formats Date to YYYY-MM-DD', () => {
      const d = new Date(2025, 5, 15); // June 15, 2025
      expect(toLocalYmd(d)).toBe('2025-06-15');
    });

    it('pads single-digit month and day', () => {
      const d = new Date(2025, 0, 5); // Jan 5
      expect(toLocalYmd(d)).toBe('2025-01-05');
    });

    it('handles string date input', () => {
      const result = toLocalYmd('2025-03-20T12:00:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatTimeRemaining', () => {
    it('formats milliseconds to HH:MM:SS', () => {
      expect(formatTimeRemaining(3661000)).toBe('01:01:01');
    });

    it('formats zero milliseconds', () => {
      expect(formatTimeRemaining(0)).toBe('00:00:00');
    });

    it('formats large values', () => {
      // 10 hours, 30 minutes, 45 seconds
      const ms = 10 * 3600 * 1000 + 30 * 60 * 1000 + 45 * 1000;
      expect(formatTimeRemaining(ms)).toBe('10:30:45');
    });
  });

  describe('formatOvertime', () => {
    it('formats overtime with + prefix', () => {
      expect(formatOvertime(3661000)).toBe('+01:01:01');
    });

    it('formats zero overtime', () => {
      expect(formatOvertime(0)).toBe('+00:00:00');
    });
  });

  describe('formatWorkTime', () => {
    it('formats to Chinese hours and minutes', () => {
      const ms = 2 * 3600 * 1000 + 30 * 60 * 1000;
      expect(formatWorkTime(ms)).toBe('2小时30分钟');
    });

    it('formats zero', () => {
      expect(formatWorkTime(0)).toBe('0小时0分钟');
    });

    it('drops seconds', () => {
      const ms = 1 * 3600 * 1000 + 15 * 60 * 1000 + 45 * 1000;
      expect(formatWorkTime(ms)).toBe('1小时15分钟');
    });
  });

  describe('updateCurrentTime', () => {
    it('returns current time string and nowMs', () => {
      const result = updateCurrentTime();

      expect(result).toHaveProperty('currentTime');
      expect(result).toHaveProperty('nowMs');
      expect(typeof result.currentTime).toBe('string');
      expect(typeof result.nowMs).toBe('number');
      expect(result.nowMs).toBeGreaterThan(0);
    });

    it('returns time in HH:MM:SS format', () => {
      const { currentTime } = updateCurrentTime();
      // Should match pattern like "14:30:05"
      expect(currentTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('calculateTimeRemaining', () => {
    it('returns positive ms when end time is in the future', () => {
      const now = new Date();
      const futureHour = now.getHours() + 2;
      const endTime = `${String(futureHour % 24).padStart(2, '0')}:00`;

      const remaining = calculateTimeRemaining(endTime, now.getTime());

      expect(remaining).toBeGreaterThan(0);
    });

    it('returns 0 when no end time provided', () => {
      expect(calculateTimeRemaining(null, Date.now())).toBe(0);
      expect(calculateTimeRemaining('', Date.now())).toBe(0);
    });
  });

  describe('calculateOvertime', () => {
    it('returns positive ms when past end time', () => {
      const now = new Date();
      const pastHour = now.getHours() - 1;
      if (pastHour < 0) return; // skip if near midnight

      const endTime = `${String(pastHour).padStart(2, '0')}:00`;
      const overtime = calculateOvertime(endTime, now.getTime());

      expect(overtime).toBeGreaterThan(0);
    });
  });

  describe('getWeekStart', () => {
    it('returns a Monday at midnight', () => {
      const weekStart = getWeekStart();

      expect(weekStart instanceof Date).toBe(true);
      // Monday = 1
      expect(weekStart.getDay()).toBe(1);
      expect(weekStart.getHours()).toBe(0);
      expect(weekStart.getMinutes()).toBe(0);
      expect(weekStart.getSeconds()).toBe(0);
    });

    it('returns a date not in the future', () => {
      const weekStart = getWeekStart();
      expect(weekStart.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});

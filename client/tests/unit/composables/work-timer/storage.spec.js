import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  saveWorkSessions,
  loadWorkSessions,
  saveSettings,
  loadSettings,
  savePendingHeartbeats,
  loadPendingHeartbeats,
  savePendingStarts,
  loadPendingStarts,
  saveTotalMs,
  loadTotalMs,
  clearPendingHeartbeats,
  clearPendingStarts,
} from '@/composables/work-timer/storage.js';

describe('work-timer storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveWorkSessions / loadWorkSessions', () => {
    it('saves and loads work sessions', () => {
      const sessions = [
        { id: '1', duration: 1000 },
        { id: '2', duration: 2000 },
      ];

      saveWorkSessions(sessions);
      const loaded = loadWorkSessions();

      expect(loaded).toEqual(sessions);
    });

    it('returns empty array when no saved data', () => {
      expect(loadWorkSessions()).toEqual([]);
    });

    it('returns empty array on corrupt data', () => {
      localStorage.setItem('work-timer-sessions', 'not-json');
      expect(loadWorkSessions()).toEqual([]);
    });
  });

  describe('saveSettings / loadSettings', () => {
    it('saves and loads settings', () => {
      const settings = { endTime: '17:30' };

      saveSettings(settings);
      const loaded = loadSettings();

      expect(loaded).toEqual(settings);
    });

    it('returns default settings when no saved data', () => {
      expect(loadSettings()).toEqual({ endTime: '18:00' });
    });

    it('returns default on corrupt data', () => {
      localStorage.setItem('work-timer-settings', '{bad');
      expect(loadSettings()).toEqual({ endTime: '18:00' });
    });
  });

  describe('savePendingHeartbeats / loadPendingHeartbeats', () => {
    it('saves and loads pending heartbeats', () => {
      const heartbeats = [{ sessionId: 's1', incrementMs: 60000 }];

      savePendingHeartbeats(heartbeats);
      const loaded = loadPendingHeartbeats();

      expect(loaded).toEqual(heartbeats);
    });

    it('returns empty array when no data', () => {
      expect(loadPendingHeartbeats()).toEqual([]);
    });
  });

  describe('savePendingStarts / loadPendingStarts', () => {
    it('saves and loads pending starts', () => {
      const starts = [{ sessionId: 's1', startIso: '2025-01-01T10:00:00Z' }];

      savePendingStarts(starts);
      const loaded = loadPendingStarts();

      expect(loaded).toEqual(starts);
    });

    it('returns empty array when no data', () => {
      expect(loadPendingStarts()).toEqual([]);
    });
  });

  describe('saveTotalMs / loadTotalMs', () => {
    it('saves and loads total ms', () => {
      saveTotalMs(360000);
      expect(loadTotalMs()).toBe(360000);
    });

    it('returns 0 when no data', () => {
      expect(loadTotalMs()).toBe(0);
    });

    it('returns 0 for non-numeric data', () => {
      localStorage.setItem('work-timer-total-ms', 'abc');
      expect(loadTotalMs()).toBe(0);
    });
  });

  describe('clearPendingHeartbeats', () => {
    it('removes pending heartbeats from storage', () => {
      savePendingHeartbeats([{ sessionId: 's1' }]);
      clearPendingHeartbeats();
      expect(loadPendingHeartbeats()).toEqual([]);
    });
  });

  describe('clearPendingStarts', () => {
    it('removes pending starts from storage', () => {
      savePendingStarts([{ sessionId: 's1' }]);
      clearPendingStarts();
      expect(loadPendingStarts()).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('handles localStorage setItem errors silently', () => {
      const spy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceededError');
        });

      expect(() => saveWorkSessions([])).not.toThrow();
      expect(() => saveSettings({})).not.toThrow();
      expect(() => savePendingHeartbeats([])).not.toThrow();
      expect(() => savePendingStarts([])).not.toThrow();
      expect(() => saveTotalMs(0)).not.toThrow();

      spy.mockRestore();
    });
  });
});

import { createTestDatabase, closeTestDatabase } from '../helpers/test-db.js';
import { setDb } from '../../src/utils/dbPool.js';
import { UserSessionService } from '../../src/services/userSession.service.js';
import { UserSessionModel } from '../../src/models/userSession.model.js';

describe('UserSessionService', () => {
  let db;

  beforeAll(async () => {
    db = await createTestDatabase();
    setDb(db);
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  beforeEach(() => {
    db.prepare('DELETE FROM user_sessions').run();
  });

  describe('updateUserSettings()', () => {
    test('creates new session with provided settings', async () => {
      const result = await UserSessionService.updateUserSettings({
        sessionId: 'sess-1',
        nickname: 'Alice',
        avatarColor: '#ff0000',
        autoOpenEnabled: true,
      });
      expect(result).toBeDefined();
      expect(result.nickname).toBe('Alice');
      expect(result.avatarColor).toBe('#ff0000');
    });

    test('updates existing session', async () => {
      await UserSessionService.updateUserSettings({
        sessionId: 'sess-2',
        nickname: 'Bob',
      });
      const updated = await UserSessionService.updateUserSettings({
        sessionId: 'sess-2',
        nickname: 'Charlie',
        avatarColor: '#00ff00',
      });
      expect(updated.nickname).toBe('Charlie');
    });

    test('throws when nickname exceeds 50 characters', async () => {
      await expect(
        UserSessionService.updateUserSettings({
          sessionId: 'sess-long',
          nickname: 'a'.repeat(51),
        })
      ).rejects.toThrow('昵称不能超过50个字符');
    });

    test('throws when avatarColor format is invalid', async () => {
      await expect(
        UserSessionService.updateUserSettings({
          sessionId: 'sess-color',
          avatarColor: 'red',
        })
      ).rejects.toThrow('颜色格式不正确');
    });

    test('accepts valid 6-digit hex color', async () => {
      const result = await UserSessionService.updateUserSettings({
        sessionId: 'sess-hex',
        avatarColor: '#A3B4C5',
      });
      expect(result.avatarColor).toBe('#A3B4C5');
    });

    test('uses Anonymous when nickname not provided', async () => {
      const result = await UserSessionService.updateUserSettings({
        sessionId: 'sess-anon',
      });
      expect(result.nickname).toBe('Anonymous');
    });

    test('uses default color when avatarColor not provided', async () => {
      const result = await UserSessionService.updateUserSettings({
        sessionId: 'sess-def-color',
      });
      expect(result.avatarColor).toBe('#007bff');
    });

    test('defaults autoOpenEnabled to true when undefined', async () => {
      const result = await UserSessionService.updateUserSettings({
        sessionId: 'sess-auto',
        autoOpenEnabled: undefined,
      });
      expect(result.autoOpenEnabled).toBe(true);
    });

    test('sets autoOpenEnabled to false', async () => {
      const result = await UserSessionService.updateUserSettings({
        sessionId: 'sess-no-auto',
        autoOpenEnabled: false,
      });
      expect(result.autoOpenEnabled).toBe(false);
    });
  });

  describe('getUserSettings()', () => {
    test('returns existing session settings', async () => {
      UserSessionModel.upsert({
        sessionId: 'get-sess',
        nickname: 'Dave',
        avatarColor: '#123456',
      });
      const result = await UserSessionService.getUserSettings('get-sess');
      expect(result).toBeDefined();
      expect(result.nickname).toBe('Dave');
    });

    test('creates default settings when session does not exist', async () => {
      const result = await UserSessionService.getUserSettings('new-sess-xyz');
      expect(result).toBeDefined();
      expect(result.nickname).toBe('Anonymous');
      expect(result.avatarColor).toBe('#007bff');
      expect(result.autoOpenEnabled).toBe(true);
    });
  });

  describe('updateActivity()', () => {
    test('updates last active without error', async () => {
      UserSessionModel.upsert({ sessionId: 'activity-sess', nickname: 'Eve' });
      const result = await UserSessionService.updateActivity('activity-sess');
      expect(result).toEqual({ success: true });
    });

    test('does not throw for non-existent session', async () => {
      await expect(
        UserSessionService.updateActivity('non-existent-sess')
      ).resolves.toEqual({ success: true });
    });
  });
});

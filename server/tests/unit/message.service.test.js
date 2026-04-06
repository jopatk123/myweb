import { jest } from '@jest/globals';
import fs from 'fs/promises';
import { createTestDatabase, closeTestDatabase } from '../helpers/test-db.js';
import { MessageService } from '../../src/services/message.service.js';
import { MessageModel } from '../../src/models/message.model.js';
import { UserSessionModel } from '../../src/models/userSession.model.js';

describe('MessageService', () => {
  let db;
  let service;
  let messageModel;
  let userSessionModel;

  beforeAll(async () => {
    db = await createTestDatabase();
    service = new MessageService(db);
    messageModel = new MessageModel(db);
    userSessionModel = new UserSessionModel(db);
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  beforeEach(() => {
    db.prepare('DELETE FROM messages').run();
    db.prepare('DELETE FROM user_sessions').run();
  });

  describe('sendMessage()', () => {
    test('sends a message with text content', async () => {
      const msg = await service.sendMessage({
        content: '你好世界',
        sessionId: 'sess-1',
      });
      expect(msg).toBeDefined();
      expect(msg.content).toBe('你好世界');
    });

    test('sends a message with images and no text', async () => {
      const images = [{ path: 'uploads/message-images/test.jpg' }];
      const msg = await service.sendMessage({
        content: '',
        sessionId: 'sess-img',
        images,
        imageType: 'gallery',
      });
      expect(msg).toBeDefined();
    });

    test('throws when content is empty and no images', async () => {
      await expect(
        service.sendMessage({ content: '', sessionId: 'sess-empty' })
      ).rejects.toThrow('留言内容不能为空');
    });

    test('throws when content exceeds 1000 characters', async () => {
      await expect(
        service.sendMessage({
          content: 'x'.repeat(1001),
          sessionId: 'sess-long',
        })
      ).rejects.toThrow('留言内容不能超过1000字符');
    });

    test('throws when images is not an array', async () => {
      await expect(
        service.sendMessage({
          content: '有文字',
          sessionId: 'sess-bad-img',
          images: 'not-an-array',
        })
      ).rejects.toThrow('图片数据格式错误');
    });

    test('throws when more than 5 images are provided', async () => {
      const images = Array.from({ length: 6 }, (_, i) => ({
        path: `img-${i}.jpg`,
      }));
      await expect(
        service.sendMessage({
          content: '图片过多',
          sessionId: 'sess-many-imgs',
          images,
        })
      ).rejects.toThrow('最多只能上传5张图片');
    });

    test('uses existing session nickname if available', async () => {
      userSessionModel.upsert({
        sessionId: 'sess-known',
        nickname: 'Alice',
        avatarColor: '#ff0000',
      });
      const msg = await service.sendMessage({
        content: '有昵称',
        sessionId: 'sess-known',
      });
      expect(msg.authorName).toBe('Alice');
    });

    test('uses provided authorName over session nickname', async () => {
      userSessionModel.upsert({ sessionId: 'sess-author', nickname: 'Bob' });
      const msg = await service.sendMessage({
        content: '自定义作者',
        sessionId: 'sess-author',
        authorName: 'CustomName',
      });
      expect(msg.authorName).toBe('CustomName');
    });

    test('uses Anonymous when no session and no authorName', async () => {
      const msg = await service.sendMessage({
        content: '匿名消息',
        sessionId: 'no-session-xyz',
      });
      expect(msg.authorName).toBe('Anonymous');
    });

    test('updates last active when session exists', async () => {
      userSessionModel.upsert({
        sessionId: 'sess-active-upd',
        nickname: 'Eve',
      });
      await service.sendMessage({
        content: '活跃更新',
        sessionId: 'sess-active-upd',
      });
      // Should not throw; last active is updated internally
    });
  });

  describe('getMessages()', () => {
    test('returns paginated messages', async () => {
      await service.sendMessage({ content: '消息1', sessionId: 's1' });
      await service.sendMessage({ content: '消息2', sessionId: 's2' });

      const result = await service.getMessages();
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('pagination');
      expect(result.messages.length).toBeGreaterThanOrEqual(2);
    });

    test('supports search parameter', async () => {
      await service.sendMessage({ content: '找到我', sessionId: 's3' });
      await service.sendMessage({ content: '不相关', sessionId: 's4' });

      const result = await service.getMessages({ search: '找到我' });
      expect(result.messages.some(m => m.content === '找到我')).toBe(true);
    });

    test('returns correct total in pagination', async () => {
      await service.sendMessage({ content: '第一条', sessionId: 'p1' });
      await service.sendMessage({ content: '第二条', sessionId: 'p2' });

      const result = await service.getMessages({ page: 1, limit: 1 });
      expect(result.pagination.total).toBeGreaterThanOrEqual(2);
      expect(result.messages.length).toBeLessThanOrEqual(1);
    });

    test('uses defaults when no options provided', async () => {
      const result = await service.getMessages();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
    });
  });

  describe('deleteMessage()', () => {
    test('deletes an existing message', async () => {
      const msg = await service.sendMessage({
        content: '待删除',
        sessionId: 'del-sess',
      });
      const result = await service.deleteMessage(msg.id);
      expect(result.success).toBe(true);
    });

    test('throws when message does not exist', async () => {
      await expect(service.deleteMessage(999999)).rejects.toThrow(
        '留言不存在或已被删除'
      );
    });

    test('cleans up uploaded images when deleting a message', async () => {
      const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue();
      const images = [
        { path: 'uploads/message-images/delete-1.jpg' },
        { path: 'uploads/message-images/delete-2.jpg' },
      ];
      const msg = await service.sendMessage({
        content: '',
        sessionId: 'del-images',
        images,
        imageType: 'upload',
      });

      const result = await service.deleteMessage(msg.id);

      expect(result.deletedImages).toBe(2);
      expect(unlinkSpy).toHaveBeenCalledTimes(2);
      expect(unlinkSpy.mock.calls[0][0]).toContain(
        'uploads/message-images/delete-1.jpg'
      );

      unlinkSpy.mockRestore();
    });
  });

  describe('getAutoOpenSessions()', () => {
    test('returns sessions with auto open enabled', () => {
      userSessionModel.upsert({
        sessionId: 'auto-open-1',
        autoOpenEnabled: true,
      });
      const sessions = service.getAutoOpenSessions();
      expect(Array.isArray(sessions)).toBe(true);
    });
  });

  describe('clearAllMessages()', () => {
    test('clears all messages', async () => {
      await service.sendMessage({
        content: '要清除的1',
        sessionId: 'c1',
      });
      await service.sendMessage({
        content: '要清除的2',
        sessionId: 'c2',
      });

      const result = await service.clearAllMessages();
      expect(result).toHaveProperty('deletedMessages');
      expect(result.deletedMessages).toBeGreaterThanOrEqual(2);
    });

    test('returns zero when no messages exist', async () => {
      const result = await service.clearAllMessages();
      expect(result.deletedMessages).toBe(0);
    });

    test('clears messages with images and parses images during cleanup', async () => {
      const images = [{ path: 'uploads/message-images/img1.jpg' }];
      await service.sendMessage({
        content: '',
        sessionId: 'c-img',
        images,
        imageType: 'grid',
      });

      const result = await service.clearAllMessages();
      expect(result.deletedMessages).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getMessages() with images', () => {
    test('returns messages with parsed images JSON', async () => {
      const images = [{ path: 'uploads/message-images/parse-test.jpg' }];
      await service.sendMessage({
        content: '',
        sessionId: 'sess-parse-img',
        images,
        imageType: 'grid',
      });

      const result = await service.getMessages();
      const withImages = result.messages.filter(
        m => m.images && Array.isArray(m.images)
      );
      expect(withImages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('messageModel.getRecent()', () => {
    test('returns recent messages', async () => {
      await service.sendMessage({
        content: '最近消息',
        sessionId: 'recent-1',
      });

      const messages = messageModel.getRecent(5);
      expect(Array.isArray(messages)).toBe(true);
    });

    test('parses images in recent messages', async () => {
      const images = [{ path: 'uploads/message-images/recent.jpg' }];
      await service.sendMessage({
        content: '',
        sessionId: 'recent-img',
        images,
        imageType: 'grid',
      });

      const messages = messageModel.getRecent(5);
      const withImages = messages.filter(
        m => m.images && Array.isArray(m.images)
      );
      expect(withImages.length).toBeGreaterThanOrEqual(1);
    });
  });
});

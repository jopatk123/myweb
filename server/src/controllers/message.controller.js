/**
 * 留言控制器
 */
import { MessageService } from '../services/message.service.js';
import { UserSessionService } from '../services/userSession.service.js';

export class MessageController {
  /**
   * 发送留言
   */
  static async sendMessage(req, res, next) {
    try {
      const { content, authorName, authorColor } = req.body;
      const sessionId = req.headers['x-session-id'] || req.sessionID || 'anonymous';

      const message = await MessageService.sendMessage({
        content,
        sessionId,
        authorName,
        authorColor
      });

      // 通过WebSocket广播新留言
      if (req.app.get('wsServer')) {
        const autoOpenSessions = MessageService.getAutoOpenSessions();
        req.app.get('wsServer').broadcast('newMessage', {
          message,
          autoOpenSessions
        });
      }

      res.json({
        code: 200,
        message: '留言发送成功',
        data: message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取留言列表
   */
  static async getMessages(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await MessageService.getMessages({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50
      });

      res.json({
        code: 200,
        message: '获取留言列表成功',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除留言
   */
  static async deleteMessage(req, res, next) {
    try {
      const { id } = req.params;
      await MessageService.deleteMessage(parseInt(id));

      // 通过WebSocket广播留言删除
      if (req.app.get('wsServer')) {
        req.app.get('wsServer').broadcast('messageDeleted', { messageId: parseInt(id) });
      }

      res.json({
        code: 200,
        message: '留言删除成功'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新用户设置
   */
  static async updateUserSettings(req, res, next) {
    try {
      const { nickname, avatarColor, autoOpenEnabled } = req.body;
      const sessionId = req.headers['x-session-id'] || req.sessionID || 'anonymous';

      const userSession = await UserSessionService.updateUserSettings({
        sessionId,
        nickname,
        avatarColor,
        autoOpenEnabled
      });

      res.json({
        code: 200,
        message: '用户设置更新成功',
        data: userSession
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户设置
   */
  static async getUserSettings(req, res, next) {
    try {
      const sessionId = req.headers['x-session-id'] || req.sessionID || 'anonymous';
      const userSession = await UserSessionService.getUserSettings(sessionId);

      res.json({
        code: 200,
        message: '获取用户设置成功',
        data: userSession
      });
    } catch (error) {
      next(error);
    }
  }
}
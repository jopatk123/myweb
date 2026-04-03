/**
 * 留言控制器（构造函数注入 db）
 */
import { MessageService } from '../services/message.service.js';
import { UserSessionService } from '../services/userSession.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseEnvByteSize, parseEnvNumber } from '../utils/env.js';
import logger from '../utils/logger.js';
import { createUploader, imageUploadFilter } from '../utils/uploader.js';
import {
  DEFAULT_MESSAGE_IMAGE_MAX_SIZE,
  DEFAULT_MESSAGE_IMAGE_MAX_FILES,
} from '../constants/limits.js';

const msgLogger = logger.child('MessageController');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, '../../uploads/message-images');
if (!fs.existsSync(imagesDir)) {
  try {
    fs.mkdirSync(imagesDir, { recursive: true, mode: 0o755 });
  } catch (e) {
    msgLogger.error('无法创建 message-images 上传目录', { error: e.message });
  }
}

export const MESSAGE_IMAGE_MAX_SIZE = parseEnvByteSize(
  'MESSAGE_IMAGE_MAX_SIZE',
  DEFAULT_MESSAGE_IMAGE_MAX_SIZE
);
export const MESSAGE_IMAGE_MAX_FILES = Math.max(
  1,
  parseEnvNumber('MESSAGE_IMAGE_MAX_FILES', DEFAULT_MESSAGE_IMAGE_MAX_FILES)
);

// multer 实例无需 db，保持模块级导出
export const uploadImage = createUploader({
  destination: imagesDir,
  maxFileSize: MESSAGE_IMAGE_MAX_SIZE,
  maxFiles: MESSAGE_IMAGE_MAX_FILES,
  defaultExt: '.jpg',
  fileFilter: imageUploadFilter,
});

export class MessageController {
  constructor(db) {
    this.service = new MessageService(db);
    this.sessionService = new UserSessionService(db);
  }

  async sendMessage(req, res, next) {
    try {
      const { content, authorName, authorColor, images, imageType } = req.body;
      const sessionId = req.headers['x-session-id'] || 'anonymous';

      const message = await this.service.sendMessage({
        content,
        sessionId,
        authorName,
        authorColor,
        images,
        imageType,
      });

      if (req.app.get('wsServer')) {
        const autoOpenSessions = this.service.getAutoOpenSessions();
        req.app
          .get('wsServer')
          .broadcast('newMessage', { message, autoOpenSessions });
      }

      res.json({ code: 200, message: '留言发送成功', data: message });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const { page, limit, q } = req.query;
      const result = await this.service.getMessages({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        search: q,
      });
      res.json({ code: 200, message: '获取留言列表成功', data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req, res, next) {
    try {
      const { id } = req.params;
      await this.service.deleteMessage(parseInt(id));

      if (req.app.get('wsServer')) {
        req.app
          .get('wsServer')
          .broadcast('messageDeleted', { messageId: parseInt(id) });
      }

      res.json({ code: 200, message: '留言删除成功' });
    } catch (error) {
      next(error);
    }
  }

  async updateUserSettings(req, res, next) {
    try {
      const { nickname, avatarColor, autoOpenEnabled } = req.body;
      const sessionId = req.headers['x-session-id'] || 'anonymous';
      const userSession = await this.sessionService.updateUserSettings({
        sessionId,
        nickname,
        avatarColor,
        autoOpenEnabled,
      });
      res.json({ code: 200, message: '用户设置更新成功', data: userSession });
    } catch (error) {
      next(error);
    }
  }

  async getUserSettings(req, res, next) {
    try {
      const sessionId = req.headers['x-session-id'] || 'anonymous';
      const userSession = await this.sessionService.getUserSettings(sessionId);
      res.json({ code: 200, message: '获取用户设置成功', data: userSession });
    } catch (error) {
      next(error);
    }
  }

  async uploadImageHandler(req, res, next) {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ code: 400, message: '请选择图片文件' });
      }
      const images = files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: `uploads/message-images/${file.filename}`,
      }));
      msgLogger.info('图片上传成功', { count: images.length });
      res.json({ code: 200, message: '图片上传成功', data: images });
    } catch (error) {
      msgLogger.error('图片上传失败', { error: error.message });
      next(error);
    }
  }

  async clearAllMessages(req, res, next) {
    try {
      const { confirm } = req.body;
      if (!confirm) {
        return res
          .status(400)
          .json({ code: 400, message: '需要确认才能清除所有留言' });
      }
      const result = await this.service.clearAllMessages();
      if (req.app.get('wsServer')) {
        req.app.get('wsServer').broadcast('messagesCleared', {});
      }
      res.json({ code: 200, message: '留言板已清空', data: result });
    } catch (error) {
      next(error);
    }
  }
}

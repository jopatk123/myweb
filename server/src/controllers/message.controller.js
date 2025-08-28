/**
 * 留言控制器
 */
import { MessageService } from '../services/message.service.js';
import { UserSessionService } from '../services/userSession.service.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保图片上传目录存在
const imagesDir = path.join(__dirname, '../../uploads/message-images');
if (!fs.existsSync(imagesDir)) {
  try {
    fs.mkdirSync(imagesDir, { recursive: true });
  } catch (e) {
    console.warn('无法创建 message-images 上传目录:', e.message);
  }
}

// 配置图片上传
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5, // 最多5张图片
  },
});

export class MessageController {
  /**
   * 发送留言
   */
  static async sendMessage(req, res, next) {
    try {
      const { content, authorName, authorColor, images, imageType } = req.body;
      const sessionId =
        req.headers['x-session-id'] || req.sessionID || 'anonymous';

      const message = await MessageService.sendMessage({
        content,
        sessionId,
        authorName,
        authorColor,
        images,
        imageType,
      });

      // 通过WebSocket广播新留言
      if (req.app.get('wsServer')) {
        const autoOpenSessions = MessageService.getAutoOpenSessions();
        req.app.get('wsServer').broadcast('newMessage', {
          message,
          autoOpenSessions,
        });
      }

      res.json({
        code: 200,
        message: '留言发送成功',
        data: message,
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
        limit: parseInt(limit) || 50,
      });

      res.json({
        code: 200,
        message: '获取留言列表成功',
        data: result,
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
        req.app
          .get('wsServer')
          .broadcast('messageDeleted', { messageId: parseInt(id) });
      }

      res.json({
        code: 200,
        message: '留言删除成功',
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
      const sessionId =
        req.headers['x-session-id'] || req.sessionID || 'anonymous';

      const userSession = await UserSessionService.updateUserSettings({
        sessionId,
        nickname,
        avatarColor,
        autoOpenEnabled,
      });

      res.json({
        code: 200,
        message: '用户设置更新成功',
        data: userSession,
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
      const sessionId =
        req.headers['x-session-id'] || req.sessionID || 'anonymous';
      const userSession = await UserSessionService.getUserSettings(sessionId);

      res.json({
        code: 200,
        message: '获取用户设置成功',
        data: userSession,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 上传图片
   */
  static async uploadImage(req, res, next) {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({
          code: 400,
          message: '请选择图片文件',
        });
      }

      const images = files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: `uploads/message-images/${file.filename}`,
      }));

      res.json({
        code: 200,
        message: '图片上传成功',
        data: images,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 清除所有留言
   */
  static async clearAllMessages(req, res, next) {
    try {
      const { confirm } = req.body;

      if (!confirm) {
        return res.status(400).json({
          code: 400,
          message: '需要确认才能清除所有留言',
        });
      }

      const result = await MessageService.clearAllMessages();

      // 通过WebSocket广播留言板清空
      if (req.app.get('wsServer')) {
        req.app.get('wsServer').broadcast('messagesCleared', {});
      }

      res.json({
        code: 200,
        message: '留言板已清空',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

// 导出上传中间件供路由使用
export { uploadImage };

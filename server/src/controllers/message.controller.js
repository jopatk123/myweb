/**
 * 留言控制器（构造函数注入 db）
 */
import { MessageService } from '../services/message.service.js';
import { UserSessionService } from '../services/userSession.service.js';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseEnvByteSize, parseEnvNumber } from '../utils/env.js';
import logger from '../utils/logger.js';
import { createUploader, imageUploadFilter } from '../utils/uploader.js';
import { assertValidImageFile } from '../utils/magic-bytes.js';
import { ValidationError } from '../utils/errors.js';
import {
  DEFAULT_MESSAGE_IMAGE_MAX_SIZE,
  DEFAULT_MESSAGE_IMAGE_MAX_FILES,
} from '../constants/limits.js';

const msgLogger = logger.child('MessageController');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, '../../uploads/message-images');

const MESSAGE_IMAGE_MAX_SIZE = parseEnvByteSize(
  'MESSAGE_IMAGE_MAX_SIZE',
  DEFAULT_MESSAGE_IMAGE_MAX_SIZE
);
export const MESSAGE_IMAGE_MAX_FILES = Math.max(
  1,
  parseEnvNumber('MESSAGE_IMAGE_MAX_FILES', DEFAULT_MESSAGE_IMAGE_MAX_FILES)
);

// X-Session-Id 格式白名单：仅允许字母/数字/下划线/连字符，1-64 位。
// 与前端 uuid v4 及既有测试用的短会话标识兼容；拒绝任意超长/特殊字符
// 字符串直接入库（SQLite VARCHAR(N) 不强制长度）。
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * 解析请求会话标识：缺失/空时回退 'anonymous'（无会话客户端的公共身份），
 * 存在但格式非法时抛 400，防止脏数据入库与会话冒充。
 */
function resolveSessionId(req) {
  const raw = req.headers['x-session-id'];
  if (raw === undefined || raw === '') return 'anonymous';
  const sessionId = Array.isArray(raw) ? raw[0] : raw;
  if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new ValidationError('会话标识格式不正确');
  }
  return sessionId;
}

/**
 * 用户设置出站脱敏：剥离 sessionId（调用方自身的会话标识无需回传，
 * 保持与留言响应一致的"内部字段不外露"契约）。
 */
function toPublicSettings(userSession) {
  if (!userSession) return userSession;
  const { sessionId: _sessionId, ...publicSettings } = userSession;
  return publicSettings;
}

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
      const sessionId = resolveSessionId(req);

      const message = await this.service.sendMessage({
        content,
        sessionId,
        authorName,
        authorColor,
        images,
        imageType,
      });

      if (req.app.get('wsServer')) {
        // 广播时排除发送者自身，避免前端收到重复推送后再做去重；
        // 发送者前端已通过 syncMessageBoardWindow 立即同步本地窗口。
        // 自动打开与否由各客户端依据本地用户设置自行判断，
        // 不再广播 autoOpenSessions（避免向所有客户端泄露他人会话 ID）。
        req.app
          .get('wsServer')
          .broadcast(
            'newMessage',
            { message },
            { excludeClientSessionId: sessionId }
          );
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

  /**
   * 设计说明：本留言板为「公共留言板」语义，任何通过应用访问门禁的会话
   * 都可以删除任意一条留言或清空整个留言板，无需校验 sessionId 归属。
   * 这是产品有意为之的轻协作模式，已在前端 UI 上提供二次确认对话框
   * 避免误触。如未来需要"仅本人可删"语义，可在 service 层增加
   * sessionId === message.session_id 校验并返回 ForbiddenError。
   */
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
      const sessionId = resolveSessionId(req);
      const userSession = await this.sessionService.updateUserSettings({
        sessionId,
        nickname,
        avatarColor,
        autoOpenEnabled,
      });
      res.json({
        code: 200,
        message: '用户设置更新成功',
        data: toPublicSettings(userSession),
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserSettings(req, res, next) {
    try {
      const sessionId = resolveSessionId(req);
      const userSession = await this.sessionService.getUserSettings(sessionId);
      res.json({
        code: 200,
        message: '获取用户设置成功',
        data: toPublicSettings(userSession),
      });
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

      // 魔数校验：imageUploadFilter 仅检查 MIME 头，此处防止伪造 MIME 上传 SVG/HTML 等
      const validated = [];
      try {
        for (const file of files) {
          await assertValidImageFile(file.path, file.mimetype);
          validated.push(file);
        }
      } catch (err) {
        // 任一文件校验失败：清理所有已落盘文件（含本次失败与之前通过的）
        await Promise.all(
          files.map(f =>
            fsPromises.unlink(f.path).catch(e => {
              msgLogger.warn('清理校验失败文件出错', {
                filename: f.filename,
                error: e.message,
              });
            })
          )
        );
        return next(err);
      }

      const images = validated.map(file => ({
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

  /**
   * 清空整个留言板。与 deleteMessage 同属"公共留言板"设计语义，
   * 任何通过门禁的会话都可触发，前端已要求二次确认。
   */
  async clearAllMessages(req, res, next) {
    try {
      const { confirm } = req.body;
      if (!confirm) {
        return res
          .status(400)
          .json({ code: 400, message: '需要确认才能清除所有留言' });
      }
      const sessionId = resolveSessionId(req);
      const result = await this.service.clearAllMessages();
      if (req.app.get('wsServer')) {
        // 排除发起者自身：发起者前端已在 clearAllMessages composable 中
        // 立即清空本地列表，重复推送反而触发额外处理。
        req.app
          .get('wsServer')
          .broadcast(
            'messagesCleared',
            {},
            { excludeClientSessionId: sessionId }
          );
      }
      res.json({ code: 200, message: '留言板已清空', data: result });
    } catch (error) {
      next(error);
    }
  }
}

/**
 * 留言服务（构造函数注入 db）
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MessageModel } from '../models/message.model.js';
import { UserSessionModel } from '../models/userSession.model.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import {
  MESSAGE_CONTENT_MAX_LENGTH,
  MESSAGE_IMAGE_MAX_COUNT,
} from '../constants/limits.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const msgServiceLogger = logger.child('MessageService');

/**
 * 留言图片 path 白名单：必须匹配 `uploads/message-images/<filename>.<ext>`，
 * 文件名仅允许字母、数字、连字符、下划线，禁止 `..`、`/` 等可触发路径穿越的字符。
 * 与 dto/message.dto.js 中 messageImageSchema.path 保持一致。
 */
const MESSAGE_IMAGE_PATH_PATTERN =
  /^uploads\/message-images\/[a-z0-9][a-z0-9_-]*\.[a-z0-9]+$/i;

/** clearAll 分批扫描的批次大小，避免一次性把所有带图留言读入内存导致 OOM */
const CLEAR_ALL_BATCH_SIZE = 500;

export class MessageService {
  constructor(db) {
    this.messageModel = new MessageModel(db);
    this.userSessionModel = new UserSessionModel(db);
  }

  async cleanupMessageImages(images = []) {
    if (!Array.isArray(images)) return;

    // 先过滤出合法路径，避免在循环中混入非法 path 触发路径穿越
    const validPaths = [];
    for (const image of images) {
      if (!image?.path) continue;
      // 双重校验：DTO 层已限制 path 形式，service 层再校验一次，
      // 防止 DB 历史脏数据或绕过 DTO 的调用方触发路径穿越。
      if (!MESSAGE_IMAGE_PATH_PATTERN.test(image.path)) {
        msgServiceLogger.warn('跳过非法路径的图片清理', {
          path: image.path,
        });
        continue;
      }
      validPaths.push(image.path);
    }

    // 并发清理：单条留言图片数量少（≤ MESSAGE_IMAGE_MAX_COUNT），
    // clearAll 场景下数量较大，串行 O(n) 耗时高，改为 Promise.all 并行。
    await Promise.all(
      validPaths.map(async imgPath => {
        const imagePath = path.join(__dirname, '../../', imgPath);
        try {
          await fs.unlink(imagePath);
          msgServiceLogger.info('删除图片文件', { path: imagePath });
        } catch (error) {
          if (error.code !== 'ENOENT') {
            msgServiceLogger.error('删除图片文件失败', {
              path: imagePath,
              error,
            });
          }
        }
      })
    );
  }

  async sendMessage({
    content,
    sessionId,
    authorName,
    authorColor,
    images,
    imageType,
  }) {
    const hasText = content && content.toString().trim().length > 0;
    const hasImages = Array.isArray(images) && images.length > 0;
    if (!hasText && !hasImages) {
      throw new ValidationError('留言内容不能为空');
    }
    if (hasText && content.toString().length > MESSAGE_CONTENT_MAX_LENGTH) {
      throw new ValidationError(
        `留言内容不能超过${MESSAGE_CONTENT_MAX_LENGTH}字符`
      );
    }
    if (images && !Array.isArray(images)) {
      throw new ValidationError('图片数据格式错误');
    }
    if (images && images.length > MESSAGE_IMAGE_MAX_COUNT) {
      throw new ValidationError(`最多只能上传${MESSAGE_IMAGE_MAX_COUNT}张图片`);
    }
    // 防御性校验：DTO 已用 schema 限制 path 形式，此处再校验一次，
    // 任何不合规的 path 都直接拒绝入库，避免后续删除时引发路径穿越。
    if (images) {
      for (const img of images) {
        if (
          !img ||
          typeof img.path !== 'string' ||
          !MESSAGE_IMAGE_PATH_PATTERN.test(img.path)
        ) {
          throw new ValidationError('图片路径格式不合法');
        }
      }
    }

    const userSession = this.userSessionModel.findBySessionId(sessionId);
    const finalAuthorName = authorName || userSession?.nickname || 'Anonymous';
    const finalAuthorColor =
      authorColor || userSession?.avatarColor || '#007bff';

    const message = this.messageModel.create({
      content: hasText ? content.toString().trim() : '',
      authorName: finalAuthorName,
      authorColor: finalAuthorColor,
      sessionId,
      images,
      imageType,
    });

    if (userSession) this.userSessionModel.updateLastActive(sessionId);
    return message;
  }

  async getMessages({ page = 1, limit = 50, search = '' } = {}) {
    const offset = (page - 1) * limit;
    const normalizedSearch = typeof search === 'string' ? search.trim() : '';
    const messages = this.messageModel.findAll({
      limit,
      offset,
      order: 'DESC',
      search: normalizedSearch,
    });
    const total = this.messageModel.count({ search: normalizedSearch });
    return {
      messages: messages.reverse(),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async deleteMessage(id) {
    const message = this.messageModel.findById(id);
    if (!message) throw new NotFoundError('留言不存在或已被删除');

    const result = this.messageModel.deleteById(id);
    if (result.changes === 0) throw new NotFoundError('留言不存在或已被删除');

    // 先删 DB 再清文件：即使文件清理失败，留言已从用户视角消失，不影响一致性
    await this.cleanupMessageImages(message.images);

    return {
      success: true,
      deletedImages: Array.isArray(message.images) ? message.images.length : 0,
    };
  }

  getAutoOpenSessions() {
    return this.userSessionModel.getAutoOpenEnabledSessions();
  }

  async clearAllMessages() {
    // 顺序：DB 删除先行，保证用户侧立即看不到留言；文件清理失败只影响磁盘，
    // 孤儿文件可由 scripts/cleanup-message-images.js 定期清理。
    //
    // 实现步骤：
    // 1. 先分批扫描收集所有图片路径到内存（只存 path 字符串，单条约 50 字节，
    //    即使 1 万张图也仅约 500KB，远低于完整留言对象）；
    // 2. 调用 deleteAll 删除 DB 中所有留言（如果这步失败，文件尚未动，保持一致）；
    // 3. deleteAll 成功后再并发清理图片文件。
    const allImages = [];
    for (const batch of this.messageModel.findAllWithImagesBatched(
      CLEAR_ALL_BATCH_SIZE
    )) {
      for (const message of batch) {
        if (Array.isArray(message.images)) {
          allImages.push(...message.images);
        }
      }
    }

    const result = this.messageModel.deleteAll();

    // 文件清理失败不影响 DB 已清空的状态，仅记录日志
    await this.cleanupMessageImages(allImages);

    return {
      deletedMessages: result.changes || 0,
      deletedImages: allImages.length,
    };
  }
}

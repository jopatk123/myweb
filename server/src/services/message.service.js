/**
 * 留言服务（构造函数注入 db）
 */
import { MessageModel } from '../models/message.model.js';
import { UserSessionModel } from '../models/userSession.model.js';
import logger from '../utils/logger.js';

const msgServiceLogger = logger.child('MessageService');

export class MessageService {
  constructor(db) {
    this.messageModel = new MessageModel(db);
    this.userSessionModel = new UserSessionModel(db);
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
    if (!hasText && !hasImages) throw new Error('留言内容不能为空');
    if (hasText && content.toString().length > 1000)
      throw new Error('留言内容不能超过1000字符');
    if (images && !Array.isArray(images)) throw new Error('图片数据格式错误');
    if (images && images.length > 5) throw new Error('最多只能上传5张图片');

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
    const result = this.messageModel.deleteById(id);
    if (result.changes === 0) throw new Error('留言不存在或已被删除');
    return { success: true };
  }

  getAutoOpenSessions() {
    return this.userSessionModel.getAutoOpenEnabledSessions();
  }

  async clearAllMessages() {
    try {
      const messagesWithImages = this.messageModel.findAllWithImages();
      for (const message of messagesWithImages) {
        if (Array.isArray(message.images)) {
          for (const image of message.images) {
            if (image.path) {
              const { default: fs } = await import('fs');
              const { default: path } = await import('path');
              const { fileURLToPath } = await import('url');
              const __dirname = path.dirname(fileURLToPath(import.meta.url));
              const imagePath = path.join(__dirname, '../../', image.path);
              try {
                if (fs.existsSync(imagePath)) {
                  fs.unlinkSync(imagePath);
                  msgServiceLogger.info('删除图片文件', { path: imagePath });
                }
              } catch (error) {
                msgServiceLogger.error('删除图片文件失败', {
                  path: imagePath,
                  error,
                });
              }
            }
          }
        }
      }
      const result = this.messageModel.deleteAll();
      return {
        deletedMessages: result.changes || 0,
        deletedImages: messagesWithImages.reduce(
          (c, m) => c + (m.images?.length || 0),
          0
        ),
      };
    } catch (error) {
      msgServiceLogger.error('清除留言板失败', { error });
      throw new Error('清除留言板失败: ' + error.message);
    }
  }
}

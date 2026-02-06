/**
 * 留言服务
 */
import { MessageModel } from '../models/message.model.js';
import { UserSessionModel } from '../models/userSession.model.js';

export class MessageService {
  /**
   * 发送留言
   */
  static async sendMessage({
    content,
    sessionId,
    authorName,
    authorColor,
    images,
    imageType,
  }) {
    // 验证内容：允许没有文字但有图片的情况
    const hasText = content && content.toString().trim().length > 0;
    const hasImages = images && Array.isArray(images) && images.length > 0;
    if (!hasText && !hasImages) {
      throw new Error('留言内容不能为空');
    }

    if (hasText && content.toString().length > 1000) {
      throw new Error('留言内容不能超过1000字符');
    }

    // 验证图片
    if (images && !Array.isArray(images)) {
      throw new Error('图片数据格式错误');
    }

    if (images && images.length > 5) {
      throw new Error('最多只能上传5张图片');
    }

    // 获取或创建用户会话
    const userSession = UserSessionModel.findBySessionId(sessionId);
    const finalAuthorName = authorName || userSession?.nickname || 'Anonymous';
    const finalAuthorColor =
      authorColor || userSession?.avatarColor || '#007bff';

    // 创建留言
    const message = MessageModel.create({
      content: content.trim(),
      authorName: finalAuthorName,
      authorColor: finalAuthorColor,
      sessionId,
      images,
      imageType,
    });

    // 更新用户最后活跃时间
    if (userSession) {
      UserSessionModel.updateLastActive(sessionId);
    }

    return message;
  }

  /**
   * 获取留言列表
   */
  static async getMessages({ page = 1, limit = 50, search = '' } = {}) {
    const offset = (page - 1) * limit;
    const normalizedSearch =
      typeof search === 'string' ? search.trim() : '';
    const messages = MessageModel.findAll({
      limit,
      offset,
      order: 'DESC',
      search: normalizedSearch,
    });
    const total = MessageModel.count({ search: normalizedSearch });

    return {
      messages: messages.reverse(), // 反转顺序，最新的在底部
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 删除留言（管理功能）
   */
  static async deleteMessage(id) {
    const result = MessageModel.deleteById(id);
    if (result.changes === 0) {
      throw new Error('留言不存在或已被删除');
    }
    return { success: true };
  }

  /**
   * 获取需要自动打开留言板的会话列表
   */
  static getAutoOpenSessions() {
    return UserSessionModel.getAutoOpenEnabledSessions();
  }

  /**
   * 清除所有留言
   */
  static async clearAllMessages() {
    try {
      // 获取所有带图片的留言
      const messagesWithImages = MessageModel.findAllWithImages();

      // 删除物理图片文件
      for (const message of messagesWithImages) {
        if (message.images && Array.isArray(message.images)) {
          for (const image of message.images) {
            if (image.path) {
              const fs = await import('fs');
              const path = await import('path');
              const { fileURLToPath } = await import('url');

              const __filename = fileURLToPath(import.meta.url);
              const __dirname = path.dirname(__filename);
              const imagePath = path.join(__dirname, '../../', image.path);

              try {
                if (fs.existsSync(imagePath)) {
                  fs.unlinkSync(imagePath);
                  console.log(`删除图片文件: ${imagePath}`);
                }
              } catch (error) {
                console.error(`删除图片文件失败: ${imagePath}`, error);
              }
            }
          }
        }
      }

      // 删除数据库中的所有留言
      const result = MessageModel.deleteAll();

      return {
        deletedMessages: result.changes || 0,
        deletedImages: messagesWithImages.reduce((count, msg) => {
          return count + (msg.images ? msg.images.length : 0);
        }, 0),
      };
    } catch (error) {
      console.error('清除留言板失败:', error);
      throw new Error('清除留言板失败: ' + error.message);
    }
  }
}

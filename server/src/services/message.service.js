/**
 * 留言服务
 */
import { MessageModel } from '../models/message.model.js';
import { UserSessionModel } from '../models/userSession.model.js';

export class MessageService {
  /**
   * 发送留言
   */
  static async sendMessage({ content, sessionId, authorName, authorColor, images, imageType }) {
    // 验证内容
    if (!content || content.trim().length === 0) {
      throw new Error('留言内容不能为空');
    }

    if (content.length > 1000) {
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
    const finalAuthorColor = authorColor || userSession?.avatarColor || '#007bff';

    // 创建留言
    const message = MessageModel.create({
      content: content.trim(),
      authorName: finalAuthorName,
      authorColor: finalAuthorColor,
      sessionId,
      images,
      imageType
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
  static async getMessages({ page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const messages = MessageModel.findAll({ limit, offset, order: 'DESC' });
    const total = MessageModel.count();

    return {
      messages: messages.reverse(), // 反转顺序，最新的在底部
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
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
}
/**
 * 用户会话服务
 */
import { UserSessionModel } from '../models/userSession.model.js';

export class UserSessionService {
  /**
   * 更新用户设置
   */
  static async updateUserSettings({ sessionId, nickname, avatarColor, autoOpenEnabled }) {
    // 验证昵称
    if (nickname && nickname.length > 50) {
      throw new Error('昵称不能超过50个字符');
    }

    // 验证颜色格式
    if (avatarColor && !/^#[0-9A-Fa-f]{6}$/.test(avatarColor)) {
      throw new Error('颜色格式不正确');
    }

    const userSession = UserSessionModel.upsert({
      sessionId,
      nickname: nickname || 'Anonymous',
      avatarColor: avatarColor || '#007bff',
      autoOpenEnabled: autoOpenEnabled === undefined ? true : autoOpenEnabled
    });

    return userSession;
  }

  /**
   * 获取用户设置
   */
  static async getUserSettings(sessionId) {
    let userSession = UserSessionModel.findBySessionId(sessionId);
    
    if (!userSession) {
      // 如果用户会话不存在，创建默认设置
      userSession = UserSessionModel.upsert({
        sessionId,
        nickname: 'Anonymous',
        avatarColor: '#007bff',
        autoOpenEnabled: true
      });
    }

    return userSession;
  }

  /**
   * 更新用户活跃状态
   */
  static async updateActivity(sessionId) {
    UserSessionModel.updateLastActive(sessionId);
    return { success: true };
  }
}
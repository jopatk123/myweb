/**
 * 用户会话服务（构造函数注入 db）
 */
import { UserSessionModel } from '../models/userSession.model.js';
import { ValidationError } from '../utils/errors.js';

/** 与 DTO colorPattern 保持一致：仅接受 <input type="color"> 输出的 #rrggbb 格式 */
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export class UserSessionService {
  constructor(db) {
    this.userSessionModel = new UserSessionModel(db);
  }

  async updateUserSettings({
    sessionId,
    nickname,
    avatarColor,
    autoOpenEnabled,
  }) {
    if (nickname && nickname.length > 50) {
      throw new ValidationError('昵称不能超过50个字符');
    }
    if (avatarColor && !COLOR_PATTERN.test(avatarColor)) {
      throw new ValidationError('颜色格式不正确，请使用 #rrggbb 格式');
    }
    return this.userSessionModel.upsert({
      sessionId,
      nickname: nickname || 'Anonymous',
      avatarColor: avatarColor || '#007bff',
      autoOpenEnabled: autoOpenEnabled === undefined ? true : autoOpenEnabled,
    });
  }

  async getUserSettings(sessionId) {
    return (
      this.userSessionModel.findBySessionId(sessionId) ||
      this.userSessionModel.upsert({
        sessionId,
        nickname: 'Anonymous',
        avatarColor: '#007bff',
        autoOpenEnabled: true,
      })
    );
  }

  async updateActivity(sessionId) {
    this.userSessionModel.updateLastActive(sessionId);
    return { success: true };
  }
}

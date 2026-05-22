import logger from '../../utils/logger.js';
import {
  getAppPasswordStatus,
  getAppAuthCookieValue,
  isValidAppAuthSession,
} from '../../utils/app-auth.js';

const authLogger = logger.child('WebSocketAuth');

/**
 * 鉴权 WebSocket 升级请求：
 *  - 未启用密码时直接放行
 *  - 启用密码但未配置或会话无效时关闭连接（1008 Policy Violation）
 * @returns {boolean} true 表示通过鉴权
 */
export function authenticateUpgrade(socket, req) {
  const { passwordRequired, isPasswordConfigured } = getAppPasswordStatus();
  if (!passwordRequired) return true;

  const cookieValue = getAppAuthCookieValue(req);
  if (!isPasswordConfigured || !isValidAppAuthSession(cookieValue)) {
    authLogger.warn('Rejected unauthorized websocket connection');
    try {
      socket.close(1008, 'Unauthorized');
    } catch {
      // ignore
    }
    return false;
  }
  return true;
}

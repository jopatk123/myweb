import logger from '../../utils/logger.js';
import {
  getAppPasswordStatus,
  getAppAuthCookieValue,
  isValidAppAuthSession,
} from '../../utils/app-auth.js';
import { isCorsOriginAllowed } from '../../config/env.js';

const authLogger = logger.child('WebSocketAuth');

/**
 * 鉴权 WebSocket 升级请求：
 *  - 未启用密码时仅做 Origin 校验
 *  - 启用密码但未配置或会话无效时关闭连接（1008 Policy Violation）
 *  - Origin 不在白名单时关闭连接，防止 CSWSH（跨站 WebSocket 劫持）
 * @returns {boolean} true 表示通过鉴权
 */
export function authenticateUpgrade(socket, req) {
  // Origin 校验对所有模式生效（含未启用密码场景）
  const origin = req?.headers?.origin;
  if (origin && !isCorsOriginAllowed(origin)) {
    authLogger.warn('Rejected websocket connection from disallowed origin', {
      origin,
    });
    try {
      socket.close(1008, 'Origin not allowed');
    } catch {
      // ignore
    }
    return false;
  }

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

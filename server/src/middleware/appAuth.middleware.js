import {
  getAppAuthConfigStatus,
  getAppPasswordStatus,
  getAppAuthCookieValue,
  isValidAppAuthSession,
} from '../utils/app-auth.js';
import { isAgentAuthRequestAuthorized } from '../utils/agent-auth.js';

export function createAppAuthGuard() {
  return (req, res, next) => {
    const { issue } = getAppAuthConfigStatus();
    const { passwordRequired, isPasswordConfigured } = getAppPasswordStatus();

    if (issue) {
      return res.status(503).json({
        code: 503,
        success: false,
        authenticated: false,
        message: issue,
      });
    }

    if (!passwordRequired) {
      return next();
    }

    if (!isPasswordConfigured) {
      return res.status(503).json({
        code: 503,
        success: false,
        authenticated: false,
        message: '应用访问密码未配置',
      });
    }

    // 检查人工会话 cookie 认证
    const cookieValue = getAppAuthCookieValue(req);
    if (isValidAppAuthSession(cookieValue)) {
      return next();
    }

    // 检查 Agent Bearer token 认证（作为第二认证通道）
    if (isAgentAuthRequestAuthorized(req)) {
      return next();
    }

    return res.status(401).json({
      code: 401,
      success: false,
      authenticated: false,
      message: '请先完成访问验证',
    });
  };
}

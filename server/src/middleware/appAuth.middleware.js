import {
  getAppPasswordStatus,
  getAppAuthCookieValue,
  isValidAppAuthSession,
} from '../utils/app-auth.js';

export function createAppAuthGuard() {
  return (req, res, next) => {
    const { passwordRequired, isPasswordConfigured } = getAppPasswordStatus();

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

    const cookieValue = getAppAuthCookieValue(req);
    if (isValidAppAuthSession(cookieValue)) {
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

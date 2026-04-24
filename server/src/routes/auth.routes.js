import express from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import { verifyToken } from '../utils/crypto.js';
import {
  clearAppAuthCookie,
  getAppPasswordStatus,
  isAppAuthRequestAuthorized,
  setAppAuthCookie,
} from '../utils/app-auth.js';

const authLogger = logger.child('AuthRoute');

/**
 * 暴力破解保护：更严格的速率限制
 * 5 分钟内最多允许 10 次尝试
 */
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    success: false,
    message: '登录尝试次数过多，请 5 分钟后重试',
  },
});

export function createAuthRoutes() {
  const router = express.Router();

  router.post('/verify', loginLimiter, (req, res) => {
    const { appPassword, isProduction, isPasswordConfigured } =
      getAppPasswordStatus();
    const { password } = req.body || {};

    if (!isPasswordConfigured) {
      if (isProduction) {
        return res.status(503).json({
          code: 503,
          success: false,
          message: '应用访问密码未配置',
        });
      }

      // 开发/测试环境允许免密访问，避免影响本地启动体验
      return res.json({ code: 200, success: true, message: '验证成功' });
    }

    if (!password || typeof password !== 'string' || password.length > 500) {
      return res.status(401).json({
        code: 401,
        success: false,
        message: '请输入密码',
      });
    }

    const provided = password.trim();

    // 支持明文和 sha256 哈希两种比对
    const match = verifyToken(appPassword, provided);

    if (match) {
      authLogger.info('密码验证成功', { ip: req.ip });
      setAppAuthCookie(res);
      return res.json({ code: 200, success: true, message: '验证成功' });
    }

    authLogger.warn('密码验证失败', { ip: req.ip });
    return res.status(401).json({
      code: 401,
      success: false,
      message: '密码错误',
    });
  });

  // 检查是否需要密码（不暴露密码本身）
  router.get('/status', (req, res) => {
    const { passwordRequired, isPasswordConfigured } = getAppPasswordStatus();
    res.json({
      code: 200,
      success: true,
      data: {
        required: passwordRequired,
        configured: isPasswordConfigured,
        authenticated: isAppAuthRequestAuthorized(req),
      },
    });
  });

  router.post('/logout', (_req, res) => {
    clearAppAuthCookie(res);
    res.json({
      code: 200,
      success: true,
      message: '已退出访问验证',
    });
  });

  return router;
}

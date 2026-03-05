import express from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

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

function constantTimeEquals(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function createAuthRoutes() {
  const router = express.Router();

  const appPassword = (process.env.APP_PASSWORD || '').trim();

  router.post('/verify', loginLimiter, (req, res) => {
    const { password } = req.body || {};

    if (!appPassword) {
      // 未配置密码时直接放行
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
    let match = false;
    if (appPassword.startsWith('sha256:')) {
      const hash = createHash('sha256').update(provided).digest('hex');
      match = constantTimeEquals(`sha256:${hash}`, appPassword);
    } else {
      match = constantTimeEquals(provided, appPassword);
    }

    if (match) {
      authLogger.info('密码验证成功', { ip: req.ip });
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
  router.get('/status', (_req, res) => {
    res.json({
      code: 200,
      success: true,
      data: { required: Boolean(appPassword) },
    });
  });

  return router;
}

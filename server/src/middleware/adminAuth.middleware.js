import { getAdminTokenConfig } from '../config/env.js';
import { verifyToken } from '../utils/crypto.js';

function normalizeToken(raw) {
  return (raw || '').trim();
}

export function createFilesAdminGuard(envVar = 'FILES_ADMIN_TOKEN') {
  const { token: configuredToken, tokenHash: hashedToken } =
    getAdminTokenConfig(envVar);

  // 若配置了显式哈希值，使用 sha256: 前缀格式；否则使用明文存储
  const rawExpected = normalizeToken(configuredToken);
  const rawHash = normalizeToken(hashedToken);
  const expected = rawHash
    ? `sha256:${rawHash}`
    : rawExpected.startsWith('sha256:')
      ? rawExpected
      : rawExpected;

  if (!expected) {
    return (_req, res, _next) => {
      return res.status(503).json({
        code: 503,
        success: false,
        message: '管理员凭证未配置',
      });
    };
  }

  return (req, res, next) => {
    // 仅接受 Header 方式传递 token，避免 token 出现在 URL/日志中
    const provided = req.get('x-admin-token') || req.get('x-admin-key') || '';

    if (verifyToken(expected, provided)) {
      return next();
    }

    return res.status(401).json({
      code: 401,
      success: false,
      message: '缺少有效的管理员凭证',
    });
  };
}

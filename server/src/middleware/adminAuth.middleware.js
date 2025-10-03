import { createHash } from 'crypto';

function normalizeToken(raw) {
  return (raw || '').trim();
}

function hashTokenIfNeeded(token) {
  const value = normalizeToken(token);
  if (!value) return '';
  // Allow storing hashed token via FILES_ADMIN_TOKEN_HASH to avoid plaintext in env
  if (value.startsWith('sha256:')) {
    return value;
  }
  return value;
}

function verifyToken(expected, provided) {
  const safeExpected = normalizeToken(expected);
  const safeProvided = normalizeToken(provided);

  if (!safeExpected) return true;
  if (!safeProvided) return false;

  if (safeExpected.startsWith('sha256:')) {
    const hash = createHash('sha256').update(safeProvided).digest('hex');
    return `sha256:${hash}` === safeExpected;
  }

  return safeExpected === safeProvided;
}

export function createFilesAdminGuard(envVar = 'FILES_ADMIN_TOKEN') {
  const configuredToken = process.env[envVar];
  const hashedToken = process.env[`${envVar}_HASH`];
  const expected = hashedToken
    ? `sha256:${normalizeToken(hashedToken)}`
    : hashTokenIfNeeded(configuredToken);

  if (!normalizeToken(expected)) {
    return (_req, _res, next) => next();
  }

  return (req, res, next) => {
    const headerToken = req.get('x-admin-token') || req.get('x-admin-key');
    const queryToken = req.query?.adminToken;
    const bodyToken = req.body?.adminToken;

    const provided = headerToken || queryToken || bodyToken || '';

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

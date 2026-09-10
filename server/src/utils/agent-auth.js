import { verifyToken } from './crypto.js';

/**
 * 从环境变量获取 Agent API Token 配置值（明文或 sha256:<hex> 格式）。
 * 未配置或空字符串时返回空字符串。
 *
 * @returns {string}
 */
export function getAgentApiToken() {
  return (process.env.AGENT_API_TOKEN || '').trim();
}

/**
 * 检查 Agent API Token 是否已配置。
 *
 * @returns {boolean}
 */
export function isAgentApiTokenConfigured() {
  return Boolean(getAgentApiToken());
}

/**
 * 从请求头提取 Bearer token。
 * 支持标准格式 "Bearer <token>"。
 *
 * @param {object} req - Express 请求对象
 * @returns {string} - 提取的 token，未找到时返回空字符串
 */
export function extractBearerToken(req) {
  const authHeader = String(req?.headers?.authorization || '').trim();
  if (!authHeader) return '';

  // Authorization: Bearer <token>
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  return match ? match[1] : '';
}

/**
 * 验证请求中的 Bearer token 是否有效。
 * 使用时序安全比较，支持明文或 sha256 哈希格式的 token。
 *
 * @param {object} req - Express 请求对象
 * @returns {boolean} - token 有效返回 true，否则返回 false
 */
export function isValidAgentBearerToken(req) {
  const configuredToken = getAgentApiToken();
  if (!configuredToken) {
    // Token 未配置时，拒绝所有 Bearer 请求（fail-closed）
    return false;
  }

  const providedToken = extractBearerToken(req);
  if (!providedToken) {
    // 未提供 Bearer token
    return false;
  }

  return verifyToken(configuredToken, providedToken);
}

/**
 * 检查请求是否通过 Agent Bearer 认证。
 * 仅当环境变量配置了 AGENT_API_TOKEN 且请求提供了有效的 Bearer token 时返回 true。
 *
 * @param {object} req - Express 请求对象
 * @returns {boolean}
 */
export function isAgentAuthRequestAuthorized(req) {
  if (!isAgentApiTokenConfigured()) {
    // Token 未配置时，Agent 认证通道禁用
    return false;
  }

  return isValidAgentBearerToken(req);
}

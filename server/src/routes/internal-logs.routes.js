import express from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

export function createInternalLogsRoutes() {
  const router = express.Router();
  const aiLogger = logger.child('AIInternalLogs');

  // 单字段最大字符数：防止日志洪水攻击
  const MAX_FIELD_LENGTH = 4000;

  // 单独限流：内部日志端点比全局 API 限流更严格，避免被滥用为日志放大攻击
  const internalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      code: 429,
      success: false,
      message: '内部日志写入过于频繁，请稍后再试',
    },
  });

  function truncateText(text, maxLength = MAX_FIELD_LENGTH) {
    if (!text || typeof text !== 'string') {
      return text;
    }
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength)}…(truncated ${text.length - maxLength} chars)`;
  }

  // 内部调试：接收 AI 请求/回复，统一通过日志系统输出（无数据库持久化）
  router.post('/ai', internalLimiter, (req, res) => {
    try {
      const rawBody = req.body || {};
      // 在入口处即截断，避免过长得字符串进入日志管道
      const requestText = truncateText(rawBody.requestText);
      const responseText = truncateText(rawBody.responseText);
      const model = truncateText(rawBody.model, 100);
      const timestamp = rawBody.timestamp || new Date().toISOString();

      const summary = {
        ts: timestamp,
        model: model || 'unknown',
        requestChars: rawBody.requestText
          ? String(rawBody.requestText).length
          : 0,
        responseChars: rawBody.responseText
          ? String(rawBody.responseText).length
          : 0,
      };

      aiLogger.info('AI conversation summary', summary);
      if (requestText) {
        aiLogger.debug('AI request payload', {
          length: summary.requestChars,
          preview: requestText,
        });
      }
      if (responseText) {
        aiLogger.debug('AI response payload', {
          length: summary.responseChars,
          preview: responseText,
        });
      }

      res.json({ success: true });
    } catch (_e) {
      aiLogger.error('Failed to log AI internal request', _e);
      res.status(500).json({ success: false, error: _e.message });
    }
  });

  return router;
}

import express from 'express';
import logger from '../utils/logger.js';

export function createInternalLogsRoutes() {
  const router = express.Router();
  const aiLogger = logger.child('AIInternalLogs');

  function truncateText(text, maxLength = 2000) {
    if (!text || typeof text !== 'string') {
      return text;
    }
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength)}…(truncated ${text.length - maxLength} chars)`;
  }

  // 内部调试：接收 AI 请求/回复，统一通过日志系统输出（无数据库持久化）
  router.post('/ai', (req, res) => {
    try {
      const {
        requestText,
        responseText,
        timestamp,
        model,
        playerType,
        gameState,
        parsedResult,
      } = req.body || {};

      const ts = timestamp || new Date().toISOString();
      const summary = {
        ts,
        model: model || 'unknown',
        playerType: playerType || 'unknown',
        requestChars: requestText ? requestText.length : 0,
        responseChars: responseText ? responseText.length : 0,
      };

      aiLogger.info('AI conversation summary', summary);
      if (requestText) {
        aiLogger.debug('AI request payload', {
          length: requestText.length,
          preview: truncateText(requestText),
        });
      }
      if (responseText) {
        aiLogger.debug('AI response payload', {
          length: responseText.length,
          preview: truncateText(responseText),
        });
      }
      if (parsedResult) {
        aiLogger.debug('AI parsed result', { parsedResult });
      }
      if (gameState) {
        aiLogger.debug('AI game state snapshot', {
          currentPlayer: gameState.currentPlayer,
          totalMoves: gameState.totalMoves,
          boardSize: gameState.boardSize,
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

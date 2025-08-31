import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createInternalLogsRoutes() {
  const router = express.Router();

  // 仅用于开发 / 内部调试：接收 AI 请求/回复并记录到日志文件
  router.post('/ai', (req, res) => {
    try {
      const { requestText, responseText, timestamp, model, playerType } = req.body || {};
      
      // 确保日志目录存在
      const logDir = path.join(__dirname, '../../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.join(logDir, 'ai-conversations.log');
      
      // 创建日志条目
      const logEntry = {
        timestamp: timestamp || new Date().toISOString(),
        model: model || 'unknown',
        playerType: playerType || 'unknown',
        requestText: requestText || '',
        responseText: responseText || ''
      };
      
      // 格式化日志输出
      const logLine = `[${logEntry.timestamp}] [Model: ${logEntry.model}] [Player: ${logEntry.playerType}]\n` +
                     `REQUEST:\n${logEntry.requestText}\n` +
                     `RESPONSE:\n${logEntry.responseText}\n` +
                     `${'='.repeat(80)}\n\n`;
      
      // 异步写入日志文件
      fs.appendFile(logFile, logLine, 'utf8', (err) => {
        if (err) {
          console.error('写入AI对话日志失败:', err);
        }
      });
      
      // 同时输出到控制台（开发环境）
      if (process.env.NODE_ENV !== 'production') {
        if (requestText) {
          console.log('[INTERNAL][AI LOG] Request:\n%s', requestText);
        }
        if (responseText) {
          console.log('[INTERNAL][AI LOG] Response:\n%s', responseText);
        }
      }
      
      res.json({ success: true });
    } catch (e) {
      console.error('Failed to log AI internal:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

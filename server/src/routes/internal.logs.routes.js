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
      const { 
        requestText, 
        responseText, 
        timestamp, 
        model, 
        playerType,
        rawRequest,
        rawResponse,
        gameState,
        parsedResult
      } = req.body || {};
      
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
        responseText: responseText || '',
        rawRequest: rawRequest || null,
        rawResponse: rawResponse || null,
        gameState: gameState || null,
        parsedResult: parsedResult || null
      };
      
      // 格式化日志输出
      let logLine = `\n${'='.repeat(80)}\n`;
      logLine += `[${logEntry.timestamp}] [Model: ${logEntry.model}] [Player: ${logEntry.playerType}]\n`;
      logLine += `${'='.repeat(80)}\n\n`;
      
      // 游戏状态信息（简化显示）
      if (logEntry.gameState) {
        logLine += `🎮 GAME STATE:\n`;
        logLine += `   Current Player: ${logEntry.gameState.currentPlayer === 1 ? 'Black' : 'White'}\n`;
        logLine += `   Total Moves: ${logEntry.gameState.totalMoves}\n`;
        logLine += `   Board Size: ${logEntry.gameState.boardSize}x${logEntry.gameState.boardSize}\n`;
        
        // 显示棋盘状态（简化版）
        if (logEntry.gameState.board) {
          logLine += `   Board State:\n`;
          const board = logEntry.gameState.board;
          for (let i = 0; i < Math.min(5, board.length); i++) {
            const row = board[i].slice(0, 5).map(cell => cell === 0 ? '·' : cell === 1 ? '●' : '○').join(' ');
            logLine += `     Row ${i}: ${row}\n`;
          }
          if (board.length > 5) {
            logLine += `     ... (${board.length - 5} more rows)\n`;
          }
        }
        logLine += `\n`;
      }
      
      // 请求内容（简化显示）
      if (logEntry.requestText) {
        logLine += `📝 REQUEST:\n`;
        // 截取前500字符，避免过长
        const requestPreview = logEntry.requestText.length > 500 
          ? logEntry.requestText.substring(0, 500) + '...'
          : logEntry.requestText;
        logLine += `${requestPreview}\n\n`;
      }
      
      // 原始请求数据（关键信息）
      if (logEntry.rawRequest) {
        logLine += `🔧 REQUEST DETAILS:\n`;
        logLine += `   URL: ${logEntry.rawRequest.url}\n`;
        logLine += `   Model: ${logEntry.rawRequest.payload?.model || 'unknown'}\n`;
        logLine += `   Temperature: ${logEntry.rawRequest.payload?.temperature || 'unknown'}\n`;
        logLine += `   Max Tokens: ${logEntry.rawRequest.payload?.maxTokens || 'unknown'}\n`;
        logLine += `\n`;
      }
      
      // 响应内容
      if (logEntry.responseText) {
        logLine += `🤖 RESPONSE:\n`;
        logLine += `${logEntry.responseText}\n\n`;
      }
      
      // 原始响应数据（关键信息）
      if (logEntry.rawResponse) {
        logLine += `📊 RESPONSE DETAILS:\n`;
        logLine += `   ID: ${logEntry.rawResponse.id || 'unknown'}\n`;
        logLine += `   Created: ${new Date(logEntry.rawResponse.created * 1000).toISOString()}\n`;
        if (logEntry.rawResponse.usage) {
          logLine += `   Tokens: ${logEntry.rawResponse.usage.promptTokens || 0} + ${logEntry.rawResponse.usage.completionTokens || 0} = ${logEntry.rawResponse.usage.totalTokens || 0}\n`;
        }
        logLine += `\n`;
      }
      
      // 解析后的结果
      if (logEntry.parsedResult) {
        logLine += `🎯 PARSED RESULT:\n`;
        logLine += `   Position: (${logEntry.parsedResult.row}, ${logEntry.parsedResult.col})\n`;
        logLine += `   Player: ${logEntry.parsedResult.playerName || 'unknown'}\n`;
        logLine += `   Thinking Time: ${logEntry.parsedResult.thinkingTime || 'unknown'}s\n`;
        if (logEntry.parsedResult.analysis) {
          logLine += `   Move Type: ${logEntry.parsedResult.analysis.moveType || 'unknown'}\n`;
          logLine += `   Win Probability: ${logEntry.parsedResult.analysis.winProbability || 'unknown'}%\n`;
        }
        if (logEntry.parsedResult.reasoning) {
          logLine += `   Reasoning: ${logEntry.parsedResult.reasoning}\n`;
        }
        logLine += `\n`;
      }
      
      logLine += `${'='.repeat(80)}\n\n`;
      
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

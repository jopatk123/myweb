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
      
      // 创建日志条目（基础数据）
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

      const MAX_PROMPT_LOG = parseInt(process.env.AI_LOG_MAX_PROMPT || '0', 10); // 0=不截断
      const MAX_MESSAGE_CONTENT = parseInt(process.env.AI_LOG_MAX_MESSAGE || '2000', 10);
      const MAX_RESPONSE_TEXT = parseInt(process.env.AI_LOG_MAX_RESPONSE || '0', 10);

      let logLine = `\n${'='.repeat(80)}\n`;
      logLine += `[${logEntry.timestamp}] [Model: ${logEntry.model}] [Player: ${logEntry.playerType}]\n`;
      logLine += `${'='.repeat(80)}\n\n`;

      if (logEntry.gameState) {
        logLine += `🎮 GAME STATE:\n`;
        logLine += `   Current Player: ${logEntry.gameState.currentPlayer === 1 ? 'Black' : 'White'}\n`;
        logLine += `   Total Moves: ${logEntry.gameState.totalMoves}\n`;
        logLine += `   Board Size: ${logEntry.gameState.boardSize}x${logEntry.gameState.boardSize}\n`;
        if (Array.isArray(logEntry.gameState.board)) {
          logLine += `   Full Board:\n`;
          logEntry.gameState.board.forEach((row, idx) => {
            const line = row.map(cell => cell === 0 ? '·' : cell === 1 ? '●' : '○').join(' ');
            logLine += `     Row ${idx.toString().padStart(2,' ')}: ${line}\n`;
          });
        }
        logLine += `\n`;
      }

      if (logEntry.requestText) {
        let promptToShow = logEntry.requestText;
        if (MAX_PROMPT_LOG > 0 && promptToShow.length > MAX_PROMPT_LOG) {
          promptToShow = promptToShow.slice(0, MAX_PROMPT_LOG) + `\n...(truncated, total ${logEntry.requestText.length} chars)`;
        }
        logLine += `📝 REQUEST (chars=${logEntry.requestText.length}):\n${promptToShow}\n\n`;
      }

      if (logEntry.rawRequest) {
        const payload = logEntry.rawRequest.payload || {};
        logLine += `🔧 REQUEST DETAILS:\n`;
        logLine += `   URL: ${logEntry.rawRequest.url}\n`;
        logLine += `   Model: ${payload.model || 'unknown'}\n`;
        if (payload.temperature !== undefined) logLine += `   Temperature: ${payload.temperature}\n`;
        const maxTokens = payload.max_tokens ?? payload.maxTokens;
        if (maxTokens !== undefined) logLine += `   Max Tokens: ${maxTokens}\n`;
        if (Array.isArray(payload.messages)) {
          logLine += `   Messages (${payload.messages.length}):\n`;
          payload.messages.forEach((m,i) => {
            const content = (m.content || '').toString();
            let shown = content;
            if (MAX_MESSAGE_CONTENT > 0 && shown.length > MAX_MESSAGE_CONTENT) {
              shown = shown.slice(0, MAX_MESSAGE_CONTENT) + `\n...(truncated, total ${content.length} chars)`;
            }
            logLine += `     [${i}] role=${m.role} length=${content.length}\n`;
            shown.split('\n').forEach(line => { logLine += `           ${line}\n`; });
          });
        }
        logLine += `\n`;
      }

      if (logEntry.responseText) {
        let respShow = logEntry.responseText;
        if (MAX_RESPONSE_TEXT > 0 && respShow.length > MAX_RESPONSE_TEXT) {
          respShow = respShow.slice(0, MAX_RESPONSE_TEXT) + `\n...(truncated, total ${logEntry.responseText.length} chars)`;
        }
        logLine += `🤖 RAW RESPONSE TEXT (chars=${logEntry.responseText.length}):\n${respShow}\n\n`;
      }

      if (logEntry.rawResponse) {
        const rr = logEntry.rawResponse;
        logLine += `📊 RESPONSE DETAILS:\n`;
        logLine += `   ID: ${rr.id || 'unknown'}\n`;
        if (rr.created) logLine += `   Created: ${new Date(rr.created * 1000).toISOString()}\n`;
        const usage = rr.usage || {};
        const promptTokens = usage.prompt_tokens || usage.promptTokens || 0;
        const completionTokens = usage.completion_tokens || usage.completionTokens || 0;
        const totalTokens = usage.total_tokens || usage.totalTokens || (promptTokens + completionTokens);
        if (promptTokens || completionTokens || totalTokens) {
          logLine += `   Tokens: prompt=${promptTokens} completion=${completionTokens} total=${totalTokens}\n`;
        }
        if (Array.isArray(rr.choices)) {
          logLine += `   Choices: ${rr.choices.length}\n`;
          rr.choices.forEach((c,i) => {
            const content = c.message?.content || c.text || '';
            let shown = content;
            if (MAX_RESPONSE_TEXT > 0 && shown.length > MAX_RESPONSE_TEXT) {
              shown = shown.slice(0, MAX_RESPONSE_TEXT) + `\n...(truncated, total ${content.length} chars)`;
            }
            logLine += `     [${i}] finish=${c.finish_reason || c.finishReason || 'unknown'} length=${content.length}\n`;
            shown.split('\n').forEach(line => { logLine += `           ${line}\n`; });
          });
        }
        logLine += `\n`;
      }

      if (logEntry.parsedResult) {
        const pr = logEntry.parsedResult;
        logLine += `🎯 PARSED RESULT:\n`;
        logLine += `   Position: (${pr.row}, ${pr.col})\n`;
        if (pr.playerName) logLine += `   Player: ${pr.playerName}\n`;
        if (pr.thinkingTime) logLine += `   Thinking Time: ${pr.thinkingTime}s\n`;
        if (pr.analysis) {
          if (pr.analysis.moveType) logLine += `   Move Type: ${pr.analysis.moveType}\n`;
          if (pr.analysis.winProbability !== undefined) logLine += `   Win Probability: ${pr.analysis.winProbability}%\n`;
        }
        if (pr.reasoning) logLine += `   Reasoning: ${pr.reasoning}\n`;
        logLine += `\n`;
      }

      logLine += `${'='.repeat(80)}\n\n`;
      
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

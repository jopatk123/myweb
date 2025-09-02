import express from 'express';

export function createInternalLogsRoutes() {
  const router = express.Router();

  // 内部调试：接收 AI 请求/回复，仅输出到控制台（文件持久化已移除）
  router.post('/ai', (req, res) => {
    try {
      const { 
        requestText, 
        responseText, 
        timestamp, 
        model, 
        playerType,
        gameState,
        parsedResult
      } = req.body || {};
      
      const ts = timestamp || new Date().toISOString();
      const summary = {
        ts,
        model: model || 'unknown',
        playerType: playerType || 'unknown',
        requestChars: requestText ? requestText.length : 0,
        responseChars: responseText ? responseText.length : 0,
      };

      // 统一简洁控制台输出
      console.log('\n================ [AI CONVERSATION] ================');
      console.log(summary);
      if (requestText) {
        console.log('REQUEST:\n%s', requestText);
      }
      if (responseText) {
        console.log('RESPONSE:\n%s', responseText);
      }
      if (parsedResult) {
        console.log('PARSED RESULT:', parsedResult);
      }
      if (gameState) {
        console.log('GAME STATE (truncated preview):', {
          currentPlayer: gameState.currentPlayer,
          totalMoves: gameState.totalMoves,
          boardSize: gameState.boardSize,
        });
      }
      console.log('===================================================\n');
      
      res.json({ success: true });
    } catch (_e) {
      void _e;
      console.error('Failed to log AI internal:', _e);
      res.status(500).json({ success: false, error: _e.message });
    }
  });

  return router;
}

import express from 'express';

export function createInternalLogsRoutes() {
  const router = express.Router();

  // 仅用于开发 / 内部调试：接收 AI 请求/回复并打印到服务器终端
  router.post('/ai', (req, res) => {
    try {
      const { requestText, responseText } = req.body || {};
      if (requestText) {
        console.log('[INTERNAL][AI LOG] Request:\n%s', requestText);
      }
      if (responseText) {
        console.log('[INTERNAL][AI LOG] Response:\n%s', responseText);
      }
      res.json({ success: true });
    } catch (e) {
      console.error('Failed to log AI internal:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

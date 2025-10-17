// 本地测试脚本：模拟 aiLogService.sendToServer 的行为（Node 环境）
// 使用 node 直接发送请求到 /internal/logs/ai（需要服务器运行或模拟 404）

const fetch = require('node-fetch');

async function sendTest() {
  const backendPort = process.env.BACKEND_PORT || process.env.PORT || 3000;
  const url = `http://localhost:${backendPort}/internal/logs/ai`;
  const payload = {
    requestText: '测试请求',
    responseText: '测试响应',
    model: 'test-model',
    playerType: 1,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('HTTP', res.status);
    const text = await res.text();
    console.log('BODY:', text);
  } catch (err) {
    console.error('请求失败:', err.message || err);
  }
}

sendTest();

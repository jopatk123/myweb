const fetch = require('node-fetch');

async function sendTest() {
  const url = 'http://localhost:3302/internal/logs/ai';
  const payload = {
    requestText: '测试请求',
    responseText: '测试响应',
    model: 'test-model',
    playerType: 1,
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('HTTP', res.status);
    const text = await res.text();
    console.log('BODY:', text);
  } catch (err) {
    console.error('请求失败:', err.message || err);
  }
}

sendTest();

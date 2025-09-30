const DEFAULT_TEST_MESSAGE = '连接测试成功，可开始游戏';

const ensureFetch = fetchImpl => {
  if (fetchImpl) return fetchImpl;
  if (typeof fetch !== 'undefined') return fetch;
  throw new Error('全局 fetch 不可用，请提供 fetchImpl');
};

const normalizeEndpoint = url => {
  if (!url) return '';
  let endpoint = url.trim();
  if (/\s/.test(endpoint)) {
    endpoint = endpoint.replace(/\s+/g, '');
  }
  if (/\/v1\/?$/.test(endpoint)) {
    endpoint = endpoint.replace(/\/v1\/?$/, '/v1/chat/completions');
  }
  return endpoint;
};

export async function testAIConnection(config, fetchImpl) {
  if (!config?.apiUrl || !config?.apiKey) {
    throw new Error('请提供完整的 API URL 和 API Key');
  }

  if (!config.apiUrl.startsWith('http')) {
    throw new Error('API URL格式不正确');
  }

  const endpoint = normalizeEndpoint(config.apiUrl);
  const payload = {
    model: config.modelName || 'deepseek-chat',
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 1,
  };
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey.trim()}`,
  };

  const client = ensureFetch(fetchImpl);
  const response = await client(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    throw new Error('认证失败(401)，请检查API Key是否正确/未过期');
  }

  if (response.status === 404) {
    throw new Error('接口404，请确认是否缺少 /chat/completions 路径');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`测试失败: ${response.status} ${text.substring(0, 120)}`);
  }

  return { success: true, message: DEFAULT_TEST_MESSAGE };
}

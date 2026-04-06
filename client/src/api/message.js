/**
 * 留言板API
 */
import { createAxiosClient, getApiBase } from './httpClient.js';

// 处理API基础URL
const messageApi = createAxiosClient({
  baseURL: `${getApiBase()}/messages`,
  timeout: 10000,
});

// 请求拦截器 - 添加会话ID
messageApi.interceptors.request.use(config => {
  const sessionId = localStorage.getItem('sessionId') || generateSessionId();
  config.headers['X-Session-Id'] = sessionId;
  return config;
});

// 响应拦截器 - 统一取 data 层
messageApi.interceptors.response.use(
  response => response.data,
  error => {
    const payload = error.response?.data;
    if (payload && typeof payload === 'object') {
      const err = new Error(payload.message || '请求失败');
      err.code = payload.code;
      err.payload = payload;
      return Promise.reject(err);
    }
    return Promise.reject(error);
  }
);

// 生成会话ID
function generateSessionId() {
  const sessionId =
    'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('sessionId', sessionId);
  return sessionId;
}

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage?.getItem('myweb_admin_token') || '';
  } catch {
    return '';
  }
}

function buildAdminHeaders() {
  const token = getAdminToken();
  return token ? { 'X-Admin-Token': token } : {};
}

export const messageAPI = {
  /**
   * 获取留言列表
   */
  async getMessages(params = {}) {
    return messageApi.get('/', { params });
  },

  /**
   * 发送留言
   */
  async sendMessage(data) {
    return messageApi.post('/', data);
  },

  /**
   * 删除留言
   */
  async deleteMessage(id) {
    return messageApi.delete(`/${id}`, {
      headers: buildAdminHeaders(),
    });
  },

  /**
   * 获取用户设置
   */
  async getUserSettings() {
    return messageApi.get('/user-settings');
  },

  /**
   * 更新用户设置
   */
  async updateUserSettings(data) {
    return messageApi.put('/user-settings', data);
  },

  /**
   * 上传图片
   */
  async uploadImages(files) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    return messageApi.post('/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 清除所有留言
   */
  async clearAllMessages() {
    return messageApi.delete('/clear-all', {
      headers: buildAdminHeaders(),
      data: { confirm: true },
    });
  },
};

export default messageAPI;

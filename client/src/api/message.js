/**
 * 留言板API
 */
import { createApiClient, getApiBase } from './httpClient.js';
import { ensureSessionId } from '@/store/sessionState.js';
import { readStorageItem } from '@/utils/storage.js';

// 处理API基础URL；createApiClient 已绑定响应拦截器，自动解包 response.data
const messageApi = createApiClient({
  baseURL: `${getApiBase()}/messages`,
  timeout: 10000,
});

// 请求拦截器 - 添加会话 ID（与 WebSocket 共享同一 localStorage key，保持会话一致）
messageApi.interceptors.request.use(config => {
  const sessionId = ensureSessionId();
  config.headers = config.headers ?? {};
  config.headers['X-Session-Id'] = sessionId;
  return config;
});

function getAdminToken() {
  return readStorageItem('myweb_admin_token') || '';
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

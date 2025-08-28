/**
 * 留言板API
 */
import axios from 'axios';

// 处理API基础URL
const getApiBase = () => {
  const apiBase = import.meta.env.VITE_API_BASE || '/api';
  // 如果是相对路径，直接使用
  if (apiBase.startsWith('/')) {
    return apiBase;
  }
  // 如果是完整URL，添加/api路径
  return apiBase.endsWith('/') ? `${apiBase}api` : `${apiBase}/api`;
};

const API_BASE = getApiBase();

// 创建axios实例
const messageApi = axios.create({
  baseURL: `${API_BASE}/messages`,
  timeout: 10000,
});

// 请求拦截器 - 添加会话ID
messageApi.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('sessionId') || generateSessionId();
  config.headers['X-Session-Id'] = sessionId;
  return config;
});

// 生成会话ID
function generateSessionId() {
  const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('sessionId', sessionId);
  return sessionId;
}

export const messageAPI = {
  /**
   * 获取留言列表
   */
  async getMessages(params = {}) {
    const response = await messageApi.get('/', { params });
    return response.data;
  },

  /**
   * 发送留言
   */
  async sendMessage(data) {
    const response = await messageApi.post('/', data);
    return response.data;
  },

  /**
   * 删除留言
   */
  async deleteMessage(id) {
    const response = await messageApi.delete(`/${id}`);
    return response.data;
  },

  /**
   * 获取用户设置
   */
  async getUserSettings() {
    const response = await messageApi.get('/user-settings');
    return response.data;
  },

  /**
   * 更新用户设置
   */
  async updateUserSettings(data) {
    const response = await messageApi.put('/user-settings', data);
    return response.data;
  },

  /**
   * 上传图片
   */
  async uploadImages(files) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    
    const response = await messageApi.post('/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * 清除所有留言
   */
  async clearAllMessages() {
    const response = await messageApi.delete('/clear-all', {
      data: { confirm: true }
    });
    return response.data;
  },
};

export default messageAPI;
import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE || '/api';

const api = axios.create({ 
  baseURL: apiBase, 
  timeout: 30000 
});

api.interceptors.response.use(
  resp => resp.data,
  error => Promise.reject(error.response?.data || error)
);

export const logsApi = {
  /**
   * 获取AI对话日志
   * @param {Object} params - 查询参数
   * @param {number} params.lines - 返回行数，默认100
   * @param {string} params.search - 搜索关键词
   * @param {string} params.format - 返回格式 'text' | 'json'
   */
  getAILogs(params = {}) {
    return api.get('/logs/ai', { params });
  },

  /**
   * 获取AI日志统计信息
   */
  getAILogStats() {
    return api.get('/logs/ai/stats');
  },

  /**
   * 清空AI对话日志
   */
  clearAILogs() {
    return api.delete('/logs/ai');
  }
};

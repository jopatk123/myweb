import axios from 'axios';

// 优先使用环境变量提供的绝对地址；否则使用相对路径通过 Vite 代理，避免跨域
const apiBase = import.meta.env.VITE_API_BASE
  ? `${import.meta.env.VITE_API_BASE}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBase,
  timeout: 30000,
});

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error.response?.data || error);
  }
);

export const wallpaperApi = {
  // 获取所有壁纸，支持分页：传入 page, limit 时返回 { items, total }
  getWallpapers(groupId = null, page = null, limit = null) {
    const params = {};
    if (groupId) params.groupId = groupId;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    return api.get('/wallpapers', { params });
  },

  // 获取单个壁纸
  getWallpaper(id) {
    return api.get(`/wallpapers/${id}`);
  },

  // 上传壁纸
  uploadWallpaper(file, groupId = null, name, onUploadProgress) {
    const formData = new FormData();
    formData.append('image', file);
    if (groupId) {
      formData.append('groupId', groupId);
    }
    if (name) {
      formData.append('name', name);
    }

    return api.post('/wallpapers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: progressEvent => {
        if (onUploadProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        }
      },
    });
  },

  // 更新壁纸
  updateWallpaper(id, data) {
    return api.put(`/wallpapers/${id}`, data);
  },

  // 删除壁纸
  deleteWallpaper(id) {
    return api.delete(`/wallpapers/${id}`);
  },

  // 批量删除壁纸
  deleteWallpapers(ids) {
    return api.delete('/wallpapers', { data: { ids } });
  },

  // 批量移动壁纸
  moveWallpapers(ids, groupId) {
    return api.put('/wallpapers/move', { ids, groupId });
  },

  // 设置活跃壁纸
  setActiveWallpaper(id) {
    return api.put(`/wallpapers/${id}/active`);
  },

  // 获取当前活跃壁纸
  getActiveWallpaper() {
    return api.get('/wallpapers/active');
  },

  // 随机获取壁纸
  getRandomWallpaper(groupId = null) {
    return api.get('/wallpapers/random', { params: { groupId } });
  },

  // 分组相关
  getGroups() {
    return api.get('/wallpapers/groups/all');
  },

  getCurrentGroup() {
    return api.get('/wallpapers/groups/current');
  },

  setCurrentGroup(id) {
    return api.put(`/wallpapers/groups/${id}/current`);
  },

  createGroup(data) {
    return api.post('/wallpapers/groups', data);
  },

  updateGroup(id, data) {
    return api.put(`/wallpapers/groups/${id}`, data);
  },

  deleteGroup(id) {
    return api.delete(`/wallpapers/groups/${id}`);
  },
};

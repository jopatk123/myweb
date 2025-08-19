import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3002';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000
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
  // 获取所有壁纸
  getWallpapers(groupId = null) {
    return api.get('/wallpapers', { params: { groupId } });
  },

  // 获取单个壁纸
  getWallpaper(id) {
    return api.get(`/wallpapers/${id}`);
  },

  // 上传壁纸
  uploadWallpaper(file, groupId = null, name, description, onUploadProgress) {
    const formData = new FormData();
    formData.append('image', file);
    if (groupId) {
      formData.append('groupId', groupId);
    }
    if (name) {
      formData.append('name', name);
    }
    if (description) {
      formData.append('description', description);
    }

    return api.post('/wallpapers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: progressEvent => {
        if (onUploadProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(percentCompleted);
        }
      }
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

  createGroup(data) {
    return api.post('/wallpapers/groups', data);
  },

  updateGroup(id, data) {
    return api.put(`/wallpapers/groups/${id}`, data);
  },

  deleteGroup(id) {
    return api.delete(`/wallpapers/groups/${id}`);
  }
};
import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE
  ? `${import.meta.env.VITE_API_BASE}/api`
  : '/api';

const api = axios.create({ baseURL: apiBase, timeout: 300000 });

api.interceptors.response.use(
  resp => resp.data,
  error => Promise.reject(error.response?.data || error)
);

export const filesApi = {
  upload(files, onUploadProgress) {
    const form = new FormData();
    const arr = Array.isArray(files) ? files : [files];
    for (const f of arr) form.append('file', f);
    return api.post('/files/upload', form, {
      onUploadProgress: e => {
        if (!onUploadProgress) return;
        if (!e.total) return;
        const pct = Math.round((e.loaded * 100) / e.total);
        onUploadProgress(pct);
      },
    });
  },

  list(params = {}) {
    return api.get('/files', { params });
  },

  info(id) {
    return api.get(`/files/${id}`);
  },

  delete(id) {
    return api.delete(`/files/${id}`);
  },

  downloadUrl(id) {
    const base = import.meta.env.VITE_API_BASE
      ? `${import.meta.env.VITE_API_BASE}/api`
      : '/api';
    return `${base}/files/${id}/download`;
  },
};

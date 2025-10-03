import {
  createAxiosClient,
  buildApiUrl,
  getServerOrigin,
} from './httpClient.js';

const api = createAxiosClient({ timeout: 300000 });

api.interceptors.response.use(
  resp => resp.data,
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

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage?.getItem('myweb_admin_token') || '';
  } catch {
    return '';
  }
}

function buildAuthHeaders() {
  const token = getAdminToken();
  const headers = {};
  const base = getServerOrigin();
  if (base) {
    headers['X-Api-Base'] = base;
  }
  if (token) {
    headers['X-Admin-Token'] = token;
  }
  return headers;
}

export const filesApi = {
  upload(files, onUploadProgress) {
    const form = new FormData();
    const arr = Array.isArray(files) ? files : [files];
    for (const f of arr) form.append('file', f);
    return api.post('/files/upload', form, {
      headers: buildAuthHeaders(),
      onUploadProgress: e => {
        if (!onUploadProgress) return;
        if (!e.total) return;
        const pct = Math.round((e.loaded * 100) / e.total);
        onUploadProgress(pct, e.loaded, e.total);
      },
    });
  },

  uploadNovels(files, onUploadProgress) {
    const form = new FormData();
    const arr = Array.isArray(files) ? files : [files];
    for (const f of arr) form.append('file', f);
    return api.post('/files/upload/novel', form, {
      headers: buildAuthHeaders(),
      onUploadProgress: e => {
        if (!onUploadProgress) return;
        if (!e.total) return;
        const pct = Math.round((e.loaded * 100) / e.total);
        onUploadProgress(pct, e.loaded, e.total);
      },
    });
  },

  list(params = {}) {
    return api.get('/files', {
      params,
      headers: buildAuthHeaders(),
    });
  },

  info(id) {
    return api.get(`/files/${id}`, {
      headers: buildAuthHeaders(),
    });
  },

  delete(id) {
    return api.delete(`/files/${id}`, {
      headers: buildAuthHeaders(),
    });
  },

  downloadUrl(id) {
    return buildApiUrl(`/files/${id}/download`);
  },
};

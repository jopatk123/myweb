import { createApiClient, buildApiUrl, getServerOrigin } from './httpClient.js';

const api = createApiClient({ timeout: 300000 });

function buildAuthHeaders() {
  const headers = {};
  const base = getServerOrigin();
  if (base) {
    headers['X-Api-Base'] = base;
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

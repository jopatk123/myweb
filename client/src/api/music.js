import { createAxiosClient, buildApiUrl } from './httpClient.js';

const api = createAxiosClient({ timeout: 300000 });

api.interceptors.response.use(
  response => response.data,
  error => Promise.reject(error?.response?.data || error)
);

export const musicApi = {
  listTracks(params = {}) {
    const { page = 1, limit = 500, search = '' } = params;
    return api.get('/music/tracks', {
      params: {
        page,
        limit,
        search: search || undefined,
      },
    });
  },

  getTrack(id) {
    return api.get(`/music/tracks/${id}`);
  },

  uploadTracks(files, onUploadProgress) {
    const form = new FormData();
    const arr = Array.isArray(files) ? files : [files];
    for (const file of arr) {
      form.append('file', file);
    }
    return api.post('/music/upload', form, {
      onUploadProgress: event => {
        if (!onUploadProgress) return;
        if (!event.total) return;
        const percent = Math.round((event.loaded * 100) / event.total);
        onUploadProgress(percent, event.loaded, event.total, event);
      },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateTrack(id, payload) {
    return api.patch(`/music/tracks/${id}`, payload);
  },

  deleteTrack(id) {
    return api.delete(`/music/tracks/${id}`);
  },

  streamUrl(id) {
    return buildApiUrl(`/music/tracks/${id}/stream`);
  },

  downloadUrl(fileId) {
    if (!fileId) return '';
    return buildApiUrl(`/files/${fileId}/download`);
  },
};

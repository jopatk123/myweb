import { createAxiosClient, buildApiUrl } from './httpClient.js';

const api = createAxiosClient({ timeout: 300000 });

api.interceptors.response.use(
  response => response.data,
  error => Promise.reject(error?.response?.data || error)
);

export const musicApi = {
  listTracks(params = {}) {
    const {
      page = 1,
      limit = 500,
      search = '',
      groupId = null,
      includeGroups = false,
    } = params;
    return api.get('/music/tracks', {
      params: {
        page,
        limit,
        search: search || undefined,
        groupId: groupId ?? undefined,
        includeGroups: includeGroups ? 'true' : undefined,
      },
    });
  },

  getTrack(id) {
    return api.get(`/music/tracks/${id}`);
  },

  uploadTracks(files, onUploadProgress, options = {}) {
    const form = new FormData();
    const arr = Array.isArray(files) ? files : [files];
    for (const file of arr) {
      form.append('file', file);
    }
    if (options.groupId !== undefined && options.groupId !== null) {
      form.append('groupId', options.groupId);
    }
    if (options.compression) {
      form.append('compression', JSON.stringify(options.compression));
    }
    if (options.metadata) {
      form.append('metadata', JSON.stringify(options.metadata));
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

  streamUrl(id, params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      search.set(key, value);
    });
    const qs = search.toString();
    const base = `/music/tracks/${id}/stream`;
    return qs ? buildApiUrl(`${base}?${qs}`) : buildApiUrl(base);
  },

  downloadUrl(fileId) {
    if (!fileId) return '';
    return buildApiUrl(`/files/${fileId}/download`);
  },

  listGroups() {
    return api.get('/music/groups');
  },

  createGroup(name) {
    return api.post('/music/groups', { name });
  },

  renameGroup(id, name) {
    return api.patch(`/music/groups/${id}`, { name });
  },

  deleteGroup(id) {
    return api.delete(`/music/groups/${id}`);
  },

  moveTrack(id, groupId) {
    return api.post(`/music/tracks/${id}/move`, { groupId });
  },
};

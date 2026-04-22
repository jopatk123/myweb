import { createApiClient } from './httpClient.js';

const api = createApiClient({ timeout: 120000 });

export const notebookApi = {
  list(params = {}) {
    return api.get('/notebook', { params });
  },
  create(payload) {
    return api.post('/notebook', payload);
  },
  update(id, payload) {
    return api.put(`/notebook/${id}`, payload);
  },
  remove(id) {
    return api.delete(`/notebook/${id}`);
  },
};

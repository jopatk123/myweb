import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE || '/api';
const api = axios.create({ baseURL: apiBase, timeout: 120000 });

api.interceptors.response.use(
  resp => resp.data,
  error => Promise.reject(error?.response?.data || error)
);

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

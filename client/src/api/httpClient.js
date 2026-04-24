import axios from 'axios';
import { appEnv, normalizeApiBase } from '@/constants/env.js';

let cachedBase = appEnv.apiBase;

export function getApiBase() {
  if (cachedBase) return cachedBase;
  cachedBase = normalizeApiBase(appEnv.rawApiBase ?? '/api');
  return cachedBase;
}

export function buildApiUrl(path = '') {
  const base = getApiBase();
  if (!path) return base;
  if (/^https?:/i.test(path)) return path;
  const cleanPath = String(path).replace(/^\/+/, '');
  const separator = base.endsWith('/') ? '' : '/';
  return `${base}${separator}${cleanPath}`;
}

export function apiFetch(path, options) {
  const url = /^https?:/i.test(path) ? path : buildApiUrl(path);
  return fetch(url, {
    credentials: 'include',
    ...options,
  });
}

export function createAxiosClient(config = {}) {
  return axios.create({
    baseURL: getApiBase(),
    timeout: 30000,
    withCredentials: true,
    ...config,
  });
}

export function normalizeAxiosError(error) {
  const payload = error?.response?.data;
  if (payload && typeof payload === 'object') {
    const normalizedError = new Error(payload.message || '请求失败');
    normalizedError.name = 'ApiError';
    normalizedError.code = payload.code;
    normalizedError.payload = payload;
    return Promise.reject(normalizedError);
  }
  return Promise.reject(error);
}

export function attachApiInterceptors(client) {
  client.interceptors.response.use(
    response => response.data,
    normalizeAxiosError
  );
  return client;
}

export function createApiClient(config = {}) {
  return attachApiInterceptors(createAxiosClient(config));
}

export function getServerOrigin() {
  const base = getApiBase();
  if (/^https?:/i.test(base)) {
    try {
      const url = new URL(base);
      return `${url.protocol}//${url.host}`;
    } catch {
      // ignore and fallback
    }
  }
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return '';
}

export function buildServerUrl(path = '') {
  const origin = getServerOrigin();
  if (!path) return origin;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  if (!origin) return suffix;
  return `${origin}${suffix}`;
}

/**
 * 剥离后端 { code, data: { data: ... } } 嵌套包装，直到拿到实际数据。
 * 用于统一处理各 composable 中的响应解包逻辑。
 */
export function unwrapData(resp) {
  let r = resp;
  while (
    r &&
    typeof r === 'object' &&
    Object.prototype.hasOwnProperty.call(r, 'data')
  ) {
    r = r.data;
  }
  return r;
}

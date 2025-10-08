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
  return fetch(url, options);
}

export function createAxiosClient(config = {}) {
  return axios.create({
    baseURL: getApiBase(),
    timeout: 30000,
    ...config,
  });
}

export function withApiBase(path) {
  return buildApiUrl(path);
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

import { createHmac } from 'crypto';
import { constantTimeEquals } from './crypto.js';

export const APP_AUTH_COOKIE_NAME = 'myweb_auth';

const DEFAULT_AUTH_TTL_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeValue(raw) {
  return String(raw || '').trim();
}

function parsePositiveNumber(raw, fallback) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function resolveCookieSameSite(rawValue) {
  const value = normalizeValue(rawValue).toLowerCase();
  if (value === 'none') return 'none';
  if (value === 'strict') return 'strict';
  return 'lax';
}

function getNodeEnv() {
  return normalizeValue(process.env.NODE_ENV) || 'development';
}

export function getAppPasswordStatus() {
  const appPassword = normalizeValue(process.env.APP_PASSWORD);
  const isProduction = getNodeEnv() === 'production';
  const isPasswordConfigured = Boolean(appPassword);

  return {
    appPassword,
    isPasswordConfigured,
    passwordRequired: isPasswordConfigured || isProduction,
    isProduction,
  };
}

function getAppAuthSecret() {
  const explicitSecret = normalizeValue(process.env.APP_AUTH_SECRET);
  if (explicitSecret) return explicitSecret;

  const passwordBasedSecret = normalizeValue(process.env.APP_PASSWORD);
  return passwordBasedSecret;
}

function getAppAuthTtlMs() {
  const ttlDays = parsePositiveNumber(
    process.env.APP_AUTH_TTL_DAYS,
    DEFAULT_AUTH_TTL_DAYS
  );
  return ttlDays * MS_PER_DAY;
}

function signPayload(encodedPayload) {
  const secret = getAppAuthSecret();
  if (!secret) return '';

  return createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(encodedPayload) {
  try {
    return JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    );
  } catch {
    return null;
  }
}

export function createAppAuthSession(now = Date.now()) {
  const secret = getAppAuthSecret();
  if (!secret) return null;

  const expiresAt = now + getAppAuthTtlMs();
  const payload = encodePayload({ exp: expiresAt });
  const signature = signPayload(payload);

  if (!signature) return null;

  return {
    value: `${payload}.${signature}`,
    expiresAt,
  };
}

export function parseCookieHeader(header) {
  const cookies = new Map();

  for (const entry of String(header || '').split(';')) {
    const index = entry.indexOf('=');
    if (index <= 0) continue;

    const key = entry.slice(0, index).trim();
    const rawValue = entry.slice(index + 1).trim();
    if (!key) continue;

    try {
      cookies.set(key, decodeURIComponent(rawValue));
    } catch {
      cookies.set(key, rawValue);
    }
  }

  return cookies;
}

export function getAppAuthCookieValue(req) {
  return (
    parseCookieHeader(req?.headers?.cookie).get(APP_AUTH_COOKIE_NAME) || ''
  );
}

export function isValidAppAuthSession(cookieValue, now = Date.now()) {
  const safeValue = normalizeValue(cookieValue);
  if (!safeValue) return false;

  const separatorIndex = safeValue.lastIndexOf('.');
  if (separatorIndex <= 0) return false;

  const payload = safeValue.slice(0, separatorIndex);
  const providedSignature = safeValue.slice(separatorIndex + 1);
  const expectedSignature = signPayload(payload);

  if (
    !expectedSignature ||
    !constantTimeEquals(expectedSignature, providedSignature)
  ) {
    return false;
  }

  const parsed = decodePayload(payload);
  if (!parsed || typeof parsed.exp !== 'number') return false;

  return parsed.exp > now;
}

export function isAppAuthRequestAuthorized(req, now = Date.now()) {
  const { passwordRequired } = getAppPasswordStatus();
  if (!passwordRequired) return true;
  return isValidAppAuthSession(getAppAuthCookieValue(req), now);
}

export function getAppAuthCookieOptions(maxAgeMs = getAppAuthTtlMs()) {
  const sameSite = resolveCookieSameSite(process.env.APP_AUTH_COOKIE_SAME_SITE);
  const secure = sameSite === 'none' || getAppPasswordStatus().isProduction;

  return {
    httpOnly: true,
    path: '/',
    sameSite,
    secure,
    maxAge: Math.max(0, Math.floor(maxAgeMs)),
  };
}

export function setAppAuthCookie(res, now = Date.now()) {
  const session = createAppAuthSession(now);
  if (!session) return null;

  const maxAge = Math.max(0, session.expiresAt - now);
  res.cookie(
    APP_AUTH_COOKIE_NAME,
    session.value,
    getAppAuthCookieOptions(maxAge)
  );
  return session;
}

export function clearAppAuthCookie(res) {
  res.clearCookie(APP_AUTH_COOKIE_NAME, getAppAuthCookieOptions(0));
}

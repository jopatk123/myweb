import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import {
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from '@/utils/storage.js';

const SESSION_STORAGE_KEY = 'sessionId';

export const sessionState = {
  sessionId: ref(null),
};

function cacheSessionId(sessionId) {
  sessionState.sessionId.value = sessionId;
  return sessionId;
}

export function readSessionId() {
  if (sessionState.sessionId.value) {
    return sessionState.sessionId.value;
  }

  const storedSessionId = readStorageItem(SESSION_STORAGE_KEY);
  if (!storedSessionId) return null;

  return cacheSessionId(storedSessionId);
}

export function ensureSessionId() {
  const currentSessionId = readSessionId();
  if (currentSessionId) {
    return currentSessionId;
  }

  const newSessionId = uuidv4();
  cacheSessionId(newSessionId);
  writeStorageItem(SESSION_STORAGE_KEY, newSessionId);
  return newSessionId;
}

export function setSessionId(sessionId) {
  if (!sessionId) {
    sessionState.sessionId.value = null;
    removeStorageItem(SESSION_STORAGE_KEY);
    return null;
  }

  cacheSessionId(sessionId);
  writeStorageItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

export function resetSessionState() {
  sessionState.sessionId.value = null;
}

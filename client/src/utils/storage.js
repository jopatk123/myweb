function getStorage() {
  if (typeof globalThis === 'undefined') return null;

  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function reportError(onError, error) {
  if (typeof onError === 'function') {
    onError(error);
  }
}

export function readStorageItem(key, onError) {
  const storage = getStorage();
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch (error) {
    reportError(onError, error);
    return null;
  }
}

export function writeStorageItem(key, value, onError) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, String(value));
    return true;
  } catch (error) {
    reportError(onError, error);
    return false;
  }
}

export function removeStorageItem(key, onError) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch (error) {
    reportError(onError, error);
    return false;
  }
}

export function readJsonStorageItem(key, fallback, onError) {
  const raw = readStorageItem(key, onError);
  if (raw == null || raw === '') return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    reportError(onError, error);
    return fallback;
  }
}

export function writeJsonStorageItem(key, value, onError) {
  try {
    return writeStorageItem(key, JSON.stringify(value), onError);
  } catch (error) {
    reportError(onError, error);
    return false;
  }
}

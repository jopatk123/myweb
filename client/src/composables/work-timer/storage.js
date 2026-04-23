import {
  readJsonStorageItem,
  readStorageItem,
  removeStorageItem,
  writeJsonStorageItem,
  writeStorageItem,
} from '@/utils/storage.js';

// 本地存储管理
export function saveWorkSessions(workSessions) {
  writeJsonStorageItem('work-timer-sessions', workSessions, error => {
    console.error('保存工作记录失败:', error);
  });
}

export function loadWorkSessions() {
  return readJsonStorageItem('work-timer-sessions', [], error => {
    console.error('加载工作记录失败:', error);
  });
}

export function saveSettings(settings) {
  writeJsonStorageItem('work-timer-settings', settings, error => {
    console.error('保存设置失败:', error);
  });
}

export function loadSettings() {
  return readJsonStorageItem(
    'work-timer-settings',
    { endTime: '18:00' },
    error => {
      console.error('加载设置失败:', error);
    }
  );
}

export function savePendingHeartbeats(pendingHeartbeats) {
  writeJsonStorageItem('work-timer-pending-heartbeats', pendingHeartbeats);
}

export function loadPendingHeartbeats() {
  return readJsonStorageItem('work-timer-pending-heartbeats', []);
}

export function savePendingStarts(pendingStarts) {
  writeJsonStorageItem('work-timer-pending-starts', pendingStarts);
}

export function loadPendingStarts() {
  return readJsonStorageItem('work-timer-pending-starts', []);
}

export function saveTotalMs(totalMs) {
  writeStorageItem('work-timer-total-ms', String(totalMs));
}

export function loadTotalMs() {
  const totalMs = readStorageItem('work-timer-total-ms');
  if (totalMs) return Number(totalMs) || 0;
  return 0;
}

export function clearPendingHeartbeats() {
  removeStorageItem('work-timer-pending-heartbeats');
}

export function clearPendingStarts() {
  removeStorageItem('work-timer-pending-starts');
}

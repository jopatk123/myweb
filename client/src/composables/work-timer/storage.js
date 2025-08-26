// 本地存储管理
export function saveWorkSessions(workSessions) {
  try {
    localStorage.setItem('work-timer-sessions', JSON.stringify(workSessions));
  } catch (error) {
    console.error('保存工作记录失败:', error);
  }
}

export function loadWorkSessions() {
  try {
    const saved = localStorage.getItem('work-timer-sessions');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('加载工作记录失败:', error);
  }
  return [];
}

export function saveSettings(settings) {
  try {
    localStorage.setItem('work-timer-settings', JSON.stringify(settings));
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

export function loadSettings() {
  try {
    const saved = localStorage.getItem('work-timer-settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
  return { endTime: '18:00' };
}

export function savePendingHeartbeats(pendingHeartbeats) {
  try {
    localStorage.setItem(
      'work-timer-pending-heartbeats',
      JSON.stringify(pendingHeartbeats)
    );
  } catch {
    // 静默处理 localStorage 错误
  }
}

export function loadPendingHeartbeats() {
  try {
    const ph = localStorage.getItem('work-timer-pending-heartbeats');
    if (ph) return JSON.parse(ph) || [];
  } catch {
    // 静默处理 localStorage 错误
  }
  return [];
}

export function savePendingStarts(pendingStarts) {
  try {
    localStorage.setItem(
      'work-timer-pending-starts',
      JSON.stringify(pendingStarts)
    );
  } catch {
    // 静默处理 localStorage 错误
  }
}

export function loadPendingStarts() {
  try {
    const ps = localStorage.getItem('work-timer-pending-starts');
    if (ps) return JSON.parse(ps) || [];
  } catch {
    // 静默处理 localStorage 错误
  }
  return [];
}

export function saveTotalMs(totalMs) {
  try {
    localStorage.setItem('work-timer-total-ms', String(totalMs));
  } catch {
    // 静默处理 localStorage 错误
  }
}

export function loadTotalMs() {
  try {
    const t = localStorage.getItem('work-timer-total-ms');
    if (t) return Number(t) || 0;
  } catch {
    // 静默处理 localStorage 错误
  }
  return 0;
}

export function clearPendingHeartbeats() {
  try {
    localStorage.removeItem('work-timer-pending-heartbeats');
  } catch {
    // 静默处理 localStorage 错误
  }
}

export function clearPendingStarts() {
  try {
    localStorage.removeItem('work-timer-pending-starts');
  } catch {
    // 静默处理 localStorage 错误
  }
}

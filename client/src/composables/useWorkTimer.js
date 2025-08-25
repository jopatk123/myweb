import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import * as worktimerApi from '@/api/worktimer';

export function useWorkTimer() {
  // 基础状态
  const currentTime = ref('');
  const nowMs = ref(Date.now());
  const endTime = ref('17:30');
  const isTimerActive = ref(false);
  const startWorkTime = ref(null);
  const workSessions = ref([]);
  const totalMs = ref(0);
  const serverTodayMs = ref(null);
  const serverWeekMs = ref(null);

  // 离线缓存心跳队列
  const pendingHeartbeats = ref([]);
  const pendingStarts = ref([]);

  // 进度环常量（与 UI 同步）
  const circumference = 2 * Math.PI * 90;

  // 计算属性
  const timeRemaining = computed(() => {
    if (!isTimerActive.value || !endTime.value) return 0;

    const now = new Date(nowMs.value);
    const [hours, minutes] = endTime.value.split(':').map(Number);
    const endDateTime = new Date();
    endDateTime.setHours(hours, minutes, 0, 0);

    if (endDateTime <= now) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    return Math.max(0, endDateTime.getTime() - now.getTime());
  });

  const isOvertime = computed(() => {
    return isTimerActive.value && timeRemaining.value === 0;
  });

  const isWarning = computed(() => {
    return (
      isTimerActive.value &&
      timeRemaining.value > 0 &&
      timeRemaining.value <= 30 * 60 * 1000
    );
  });

  const displayTime = computed(() => {
    if (!isTimerActive.value) return '--:--:--';

    if (isOvertime.value) {
      const now = new Date(nowMs.value);
      const [hours, minutes] = endTime.value.split(':').map(Number);
      const endDateTime = new Date();
      endDateTime.setHours(hours, minutes, 0, 0);

      const overtime = now.getTime() - endDateTime.getTime();
      const overtimeHours = Math.floor(overtime / (1000 * 60 * 60));
      const overtimeMinutes = Math.floor(
        (overtime % (1000 * 60 * 60)) / (1000 * 60)
      );
      const overtimeSeconds = Math.floor((overtime % (1000 * 60)) / 1000);

      return `+${String(overtimeHours).padStart(2, '0')}:${String(overtimeMinutes).padStart(2, '0')}:${String(overtimeSeconds).padStart(2, '0')}`;
    }

    const hours = Math.floor(timeRemaining.value / (1000 * 60 * 60));
    const minutes = Math.floor(
      (timeRemaining.value % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds = Math.floor((timeRemaining.value % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  const timeLabel = computed(() => {
    if (!isTimerActive.value) return '未开始';
    if (isOvertime.value) return '已加班';
    return '距离下班';
  });

  const progressOffset = computed(() => {
    if (!isTimerActive.value || isOvertime.value) return circumference;

    const totalWorkTime = 8 * 60 * 60 * 1000; // 8小时
    const elapsed = totalWorkTime - timeRemaining.value;
    const progress = Math.max(0, Math.min(1, elapsed / totalWorkTime));

    return circumference - progress * circumference;
  });

  function toLocalYmd(dateLike) {
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  const todayWorkTime = computed(() => {
    if (serverTodayMs.value !== null) {
      const hours = Math.floor(serverTodayMs.value / (1000 * 60 * 60));
      const minutes = Math.floor(
        (serverTodayMs.value % (1000 * 60 * 60)) / (1000 * 60)
      );
      return `${hours}小时${minutes}分钟`;
    }
    const todayYmd = toLocalYmd(new Date());
    const todaySessions = workSessions.value.filter(session => {
      const src = session.startTime || session.date;
      if (!src) return false;
      if (session.startTime) return toLocalYmd(session.startTime) === todayYmd;
      // session.date 可能已是 YYYY-MM-DD
      const ymd =
        typeof session.date === 'string' && session.date.length >= 10
          ? session.date.slice(0, 10)
          : toLocalYmd(session.date);
      return ymd === todayYmd;
    });

    const totalMsLocal = todaySessions.reduce(
      (total, session) => total + (session.duration || 0),
      0
    );
    const hours = Math.floor(totalMsLocal / (1000 * 60 * 60));
    const minutes = Math.floor((totalMsLocal % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}小时${minutes}分钟`;
  });

  const weekWorkTime = computed(() => {
    if (serverWeekMs.value !== null) {
      const hours = Math.floor(serverWeekMs.value / (1000 * 60 * 60));
      const minutes = Math.floor(
        (serverWeekMs.value % (1000 * 60 * 60)) / (1000 * 60)
      );
      return `${hours}小时${minutes}分钟`;
    }
    const now = new Date();
    const weekStart = new Date(now);
    // 周一作为一周开始
    const diffToMonday = (now.getDay() + 6) % 7;
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartYmd = toLocalYmd(weekStart);

    const weekSessions = workSessions.value.filter(session => {
      const src = session.startTime || session.date;
      if (!src) return false;
      if (session.startTime) return new Date(session.startTime) >= weekStart;
      const ymd =
        typeof session.date === 'string' && session.date.length >= 10
          ? session.date.slice(0, 10)
          : toLocalYmd(session.date);
      return ymd >= weekStartYmd;
    });

    const totalMsLocal = weekSessions.reduce(
      (total, session) => total + (session.duration || 0),
      0
    );
    const hours = Math.floor(totalMsLocal / (1000 * 60 * 60));
    const minutes = Math.floor((totalMsLocal % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}小时${minutes}分钟`;
  });

  // 行为函数
  function updateCurrentTime() {
    const now = new Date();
    currentTime.value = now.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    nowMs.value = now.getTime();
  }

  function setPreset(time) {
    endTime.value = time;
  }

  function startTimer() {
    if (!endTime.value) return;
    isTimerActive.value = true;
    startWorkTime.value = new Date();
    lastHeartbeatTs = startWorkTime.value.getTime();
    const sessionId = uuidv4();
    currentSessionId = sessionId;
    // 仅在本地保存占位，并等待心跳来累计时长；避免重复 push 结束会话
    const localSession = {
      id: sessionId,
      date: new Date().toISOString().slice(0, 10),
      startTime: startWorkTime.value.toISOString(),
      duration: 0,
      targetEndTime: endTime.value,
      is_active: 1,
    };
    workSessions.value.push(localSession);
    saveWorkSessions();
    worktimerApi
      .startSession(
        currentSessionId,
        startWorkTime.value.toISOString(),
        endTime.value
      )
      .catch(() => {
        enqueuePendingStart(
          currentSessionId,
          startWorkTime.value.toISOString(),
          endTime.value
        );
      })
      .finally(() => {
        startHeartbeatInterval();
      });
  }

  function stopTimer() {
    // 记录工作时长
    // 不再在这里新建一条会话，改为更新当前会话 is_active/结束时间，由心跳累计时长
    isTimerActive.value = false;
    // 发送最终心跳，并结束会话
    const now = new Date();
    const finalIncrement = startWorkTime.value
      ? now.getTime() - lastHeartbeatTs
      : 0;
    // 发送最终增量并结束会话
    sendHeartbeat(finalIncrement, now.toISOString(), true).catch(() => {});
    stopHeartbeatInterval();
    startWorkTime.value = null;
  }

  function resetTimer() {
    stopTimer();
    endTime.value = '18:00';
  }

  function playNotificationSound() {
    try {
      const audio = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
      );
      audio.play().catch(() => {});
    } catch {
      // 静默失败
    }
  }

  function saveWorkSessions() {
    try {
      localStorage.setItem(
        'work-timer-sessions',
        JSON.stringify(workSessions.value)
      );
    } catch (error) {
      console.error('保存工作记录失败:', error);
    }
  }

  // 心跳逻辑
  let heartbeatTimer = null;
  let currentSessionId = null;
  let lastHeartbeatTs = null; // ms

  function startHeartbeatInterval() {
    if (heartbeatTimer) return;
    heartbeatTimer = setInterval(() => {
      const now = new Date();
      if (!startWorkTime.value || !currentSessionId) return;
      // 发送自上次心跳后的增量
      const last = lastHeartbeatTs || startWorkTime.value.getTime();
      const delta = now.getTime() - last;
      // 取整到分钟以避免频繁小增量
      const minuteChunks = Math.floor(delta / (60 * 1000));
      if (minuteChunks <= 0) return;
      const increment = minuteChunks * 60 * 1000;
      lastHeartbeatTs = last + increment;
      sendHeartbeat(
        increment,
        new Date(lastHeartbeatTs).toISOString(),
        false
      ).catch(() => {});
      // 同步本地显示（乐观更新）
      totalMs.value += increment;
    }, 60 * 1000);
  }

  function stopHeartbeatInterval() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function enqueuePendingHeartbeat(sessionId, incrementMs, lastUpdate) {
    pendingHeartbeats.value.push({ sessionId, incrementMs, lastUpdate });
    try {
      localStorage.setItem(
        'work-timer-pending-heartbeats',
        JSON.stringify(pendingHeartbeats.value)
      );
    } catch {
      // 静默处理 localStorage 错误
    }
  }

  function enqueuePendingStart(sessionId, startIso, targetEndTime) {
    pendingStarts.value.push({ sessionId, startIso, targetEndTime });
    try {
      localStorage.setItem(
        'work-timer-pending-starts',
        JSON.stringify(pendingStarts.value)
      );
    } catch {
      // 静默处理 localStorage 错误
    }
  }

  async function flushPendingHeartbeats() {
    // 先尝试刷新 pending starts，确保会话存在
    try {
      const starts = (pendingStarts.value || []).slice();
      pendingStarts.value = [];
      for (const s of starts) {
        try {
          await worktimerApi.startSession(
            s.sessionId,
            s.startIso,
            s.targetEndTime
          );
        } catch (error) {
          // 如果 start 失败，恢复到队列并抛出以停止后续处理
          pendingStarts.value.unshift(s);
          try {
            localStorage.setItem(
              'work-timer-pending-starts',
              JSON.stringify(pendingStarts.value)
            );
          } catch {
            // 静默处理 localStorage 错误
          }
          throw error;
        }
      }
      localStorage.removeItem('work-timer-pending-starts');
    } catch {
      // 如果 start 队列处理失败，则不继续 heartbeats
      return;
    }
    if (!navigator.onLine) return;
    const pending = (pendingHeartbeats.value || []).slice();
    pendingHeartbeats.value = [];
    try {
      for (const h of pending) {
        await worktimerApi.heartbeat(h.sessionId, h.incrementMs, h.lastUpdate);
      }
      localStorage.removeItem('work-timer-pending-heartbeats');
    } catch {
      // 恢复队列以便重试
      pendingHeartbeats.value = pending.concat(pendingHeartbeats.value || []);
      try {
        localStorage.setItem(
          'work-timer-pending-heartbeats',
          JSON.stringify(pendingHeartbeats.value)
        );
      } catch {
        // 静默处理 localStorage 错误
      }
    }
  }

  async function sendHeartbeat(incrementMs, lastUpdateIso, endSession = false) {
    if (!currentSessionId) return;
    if (!navigator.onLine) {
      // 若会话未在服务器创建，则也 enqueue start
      if (startWorkTime.value) {
        enqueuePendingStart(
          currentSessionId,
          startWorkTime.value.toISOString(),
          endTime.value
        );
      }
      enqueuePendingHeartbeat(currentSessionId, incrementMs, lastUpdateIso);
      return;
    }
    try {
      const data = await worktimerApi.heartbeat(
        currentSessionId,
        incrementMs,
        lastUpdateIso
      );
      // 服务端返回统一 totals
      if (data && typeof data.totalMs === 'number')
        totalMs.value = data.totalMs;
      if (data && typeof data.todayMs === 'number')
        serverTodayMs.value = data.todayMs;
      if (data && typeof data.weekMs === 'number')
        serverWeekMs.value = data.weekMs;
      try {
        localStorage.setItem('work-timer-total-ms', String(totalMs.value));
      } catch {
        // 静默处理 localStorage 错误
      }
      // 更新本地会话记录的 duration
      const idx = workSessions.value.findIndex(s => s.id === currentSessionId);
      if (idx !== -1) {
        workSessions.value[idx].duration =
          (workSessions.value[idx].duration || 0) + Number(incrementMs || 0);
        workSessions.value[idx].lastUpdate = lastUpdateIso;
        if (endSession) {
          workSessions.value[idx].endTime = lastUpdateIso;
          workSessions.value[idx].is_active = 0;
        }
        saveWorkSessions();
      }
      // 刷新本地会话数据
      await flushPendingHeartbeats();
      if (endSession) {
        await worktimerApi
          .stopSession(currentSessionId, lastUpdateIso, incrementMs)
          .catch(() => {});
        currentSessionId = null;
      }
    } catch {
      enqueuePendingHeartbeat(currentSessionId, incrementMs, lastUpdateIso);
    }
  }

  function loadPendingFromStorage() {
    try {
      const ph = localStorage.getItem('work-timer-pending-heartbeats');
      if (ph) pendingHeartbeats.value = JSON.parse(ph) || [];
    } catch {
      // 静默处理 localStorage 错误
    }
    try {
      const ps = localStorage.getItem('work-timer-pending-starts');
      if (ps) pendingStarts.value = JSON.parse(ps) || [];
    } catch {
      // 静默处理 localStorage 错误
    }
    try {
      const t = localStorage.getItem('work-timer-total-ms');
      if (t) totalMs.value = Number(t) || 0;
    } catch {
      // 静默处理 localStorage 错误
    }
  }

  function loadWorkSessions() {
    try {
      const saved = localStorage.getItem('work-timer-sessions');
      if (saved) {
        workSessions.value = JSON.parse(saved);
      }
    } catch (error) {
      console.error('加载工作记录失败:', error);
      workSessions.value = [];
    }
  }

  function saveSettings() {
    try {
      const settings = { endTime: endTime.value };
      localStorage.setItem('work-timer-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem('work-timer-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        endTime.value = settings.endTime || '18:00';
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  // 监听
  watch(endTime, saveSettings);
  watch(
    () => isOvertime.value,
    (nowOvertime, prevOvertime) => {
      if (nowOvertime && !prevOvertime && isTimerActive.value) {
        playNotificationSound();
      }
    }
  );

  // 生命周期
  let clockInterval = null;
  onMounted(() => {
    updateCurrentTime();
    loadSettings();
    loadWorkSessions();
    loadPendingFromStorage();
    // 尝试拉取服务器统计数据
    worktimerApi
      .getStats()
      .then(data => {
        if (data) {
          if (typeof data.todayMs === 'number')
            serverTodayMs.value = data.todayMs;
          if (typeof data.weekMs === 'number') serverWeekMs.value = data.weekMs;
          if (typeof data.totalMs === 'number') totalMs.value = data.totalMs;
        }
      })
      .catch(() => {})
      .finally(() => {
        // 迁移时若有未发送的 start/heartbeats，尝试立即刷新
        flushPendingHeartbeats().catch(() => {});
      });
    // 当网络恢复时自动 flush pending
    window.addEventListener('online', () => {
      flushPendingHeartbeats().catch(() => {});
    });
    clockInterval = setInterval(updateCurrentTime, 1000);
  });

  onBeforeUnmount(() => {
    if (clockInterval) {
      clearInterval(clockInterval);
      clockInterval = null;
    }
    window.removeEventListener('online', () => {});
  });

  return {
    // state
    currentTime,
    nowMs,
    endTime,
    isTimerActive,
    startWorkTime,
    workSessions,
    circumference,
    totalMs,
    // computed
    timeRemaining,
    isOvertime,
    isWarning,
    displayTime,
    timeLabel,
    progressOffset,
    todayWorkTime,
    weekWorkTime,
    // methods
    setPreset,
    startTimer,
    stopTimer,
    resetTimer,
  };
}

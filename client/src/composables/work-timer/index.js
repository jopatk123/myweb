import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as worktimerApi from '@/api/worktimer';
import { HeartbeatManager } from './heartbeat.js';
import { TimerControls } from './timerControls.js';
import { createComputedProperties } from './computed.js';
import { updateCurrentTime } from './timeUtils.js';
import {
  saveWorkSessions,
  loadWorkSessions,
  saveSettings,
  loadSettings,
  loadTotalMs,
} from './storage.js';

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

  // 进度环常量（与 UI 同步）
  const circumference = 2 * Math.PI * 90;

  // 初始化管理器
  const heartbeatManager = new HeartbeatManager();
  const timerControls = new TimerControls(heartbeatManager);

  // 创建计算属性
  const computedProps = createComputedProperties(
    isTimerActive,
    endTime,
    nowMs,
    workSessions,
    serverTodayMs,
    serverWeekMs,
    circumference
  );

  // 行为函数
  function updateCurrentTimeWrapper() {
    const { currentTime: newTime, nowMs: newNowMs } = updateCurrentTime();
    currentTime.value = newTime;
    nowMs.value = newNowMs;
  }

  function setPreset(time) {
    timerControls.setPreset(endTime, time);
  }

  function startTimer() {
    timerControls.startTimer(
      endTime,
      isTimerActive,
      startWorkTime,
      workSessions,
      totalMs,
      () => saveWorkSessions(workSessions.value)
    );
  }

  function stopTimer() {
    timerControls.stopTimer(
      isTimerActive,
      startWorkTime,
      totalMs,
      workSessions,
      () => saveWorkSessions(workSessions.value),
      endTime
    );
  }

  function resetTimer() {
    timerControls.resetTimer(endTime, isTimerActive, startWorkTime);
  }

  // 监听
  watch(endTime, newValue => {
    saveSettings({ endTime: newValue });
  });

  watch(
    () => computedProps.isOvertime.value,
    (nowOvertime, prevOvertime) => {
      if (nowOvertime && !prevOvertime && isTimerActive.value) {
        timerControls.playNotificationSound();
      }
    }
  );

  // 生命周期
  let clockInterval = null;
  onMounted(() => {
    updateCurrentTimeWrapper();

    // 加载设置和数据
    const settings = loadSettings();
    endTime.value = settings.endTime || '18:00';

    workSessions.value = loadWorkSessions();
    totalMs.value = loadTotalMs();

    heartbeatManager.loadPendingFromStorage();

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
        heartbeatManager.flushPendingHeartbeats().catch(() => {});
      });

    // 当网络恢复时自动 flush pending
    const handleOnline = () => {
      heartbeatManager.flushPendingHeartbeats().catch(() => {});
    };
    window.addEventListener('online', handleOnline);

    clockInterval = setInterval(updateCurrentTimeWrapper, 1000);

    // 保存清理函数引用
    window._workTimerCleanup = () => {
      window.removeEventListener('online', handleOnline);
    };
  });

  onBeforeUnmount(() => {
    if (clockInterval) {
      clearInterval(clockInterval);
      clockInterval = null;
    }

    // 执行清理函数
    if (window._workTimerCleanup) {
      window._workTimerCleanup();
      delete window._workTimerCleanup;
    }
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
    ...computedProps,
    // methods
    setPreset,
    startTimer,
    stopTimer,
    resetTimer,
  };
}

<template>
  <div class="work-timer-app" @click.self="focusApp" ref="appEl" tabindex="0">
    <div class="timer-header">
      <h2 class="timer-title">🕐 下班计时器</h2>
      <div class="current-time">{{ currentTime }}</div>
    </div>

    <div class="timer-container">
      <!-- 设置区域 -->
      <div v-if="!isTimerActive" class="settings-section">
        <div class="time-input-group">
          <label>下班时间:</label>
          <input
            type="time"
            v-model="endTime"
            class="time-input"
            :disabled="isTimerActive"
          />
        </div>

        <div class="preset-buttons">
          <button
            v-for="preset in presets"
            :key="preset.label"
            @click="setPreset(preset.time)"
            class="preset-btn"
            :disabled="isTimerActive"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>

      <!-- 倒计时显示 -->
      <div class="countdown-display">
        <div
          class="time-circle"
          :class="{ overtime: isOvertime, warning: isWarning }"
        >
          <div class="time-text">
            <div class="main-time">{{ displayTime }}</div>
            <div class="time-label">{{ timeLabel }}</div>
          </div>
          <svg class="progress-ring" width="200" height="200">
            <circle class="progress-ring-background" cx="100" cy="100" r="90" />
            <circle
              class="progress-ring-progress"
              cx="100"
              cy="100"
              r="90"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="progressOffset"
              :class="{ overtime: isOvertime }"
            />
          </svg>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <button
          v-if="!isTimerActive"
          @click="startTimer"
          class="btn btn-primary"
          :disabled="!endTime"
        >
          开始计时
        </button>
        <button v-else @click="stopTimer" class="btn btn-secondary">
          停止计时
        </button>
        <button @click="resetTimer" class="btn btn-reset">重置</button>
      </div>

      <!-- 统计信息 -->
      <div class="stats-section">
        <div class="stat-item">
          <span class="stat-label">今日工作时长</span>
          <span class="stat-value">{{ todayWorkTime }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">本周工作时长</span>
          <span class="stat-value">{{ weekWorkTime }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

  // 响应式数据
  const appEl = ref(null);
  const currentTime = ref('');
  const endTime = ref('18:00');
  const isTimerActive = ref(false);
  const startWorkTime = ref(null);
  const timer = ref(null);
  const workSessions = ref([]);

  // 预设时间
  const presets = [
    { label: '17:30', time: '17:30' },
    { label: '18:00', time: '18:00' },
    { label: '18:30', time: '18:30' },
    { label: '19:00', time: '19:00' },
  ];

  // 进度环配置
  const circumference = 2 * Math.PI * 90;

  // 计算属性
  const timeRemaining = computed(() => {
    if (!isTimerActive.value || !endTime.value) return 0;

    const now = new Date();
    const [hours, minutes] = endTime.value.split(':').map(Number);
    const endDateTime = new Date();
    endDateTime.setHours(hours, minutes, 0, 0);

    // 如果结束时间是明天
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
    ); // 30分钟警告
  });

  const displayTime = computed(() => {
    if (!isTimerActive.value) return '--:--:--';

    if (isOvertime.value) {
      // 显示加班时间
      const now = new Date();
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

    const totalWorkTime = 8 * 60 * 60 * 1000; // 8小时工作时间
    const elapsed = totalWorkTime - timeRemaining.value;
    const progress = Math.max(0, Math.min(1, elapsed / totalWorkTime));

    return circumference - progress * circumference;
  });

  const todayWorkTime = computed(() => {
    const today = new Date().toDateString();
    const todaySessions = workSessions.value.filter(
      session => new Date(session.date).toDateString() === today
    );

    const totalMs = todaySessions.reduce(
      (total, session) => total + session.duration,
      0
    );
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}小时${minutes}分钟`;
  });

  const weekWorkTime = computed(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // 本周一
    weekStart.setHours(0, 0, 0, 0);

    const weekSessions = workSessions.value.filter(
      session => new Date(session.date) >= weekStart
    );

    const totalMs = weekSessions.reduce(
      (total, session) => total + session.duration,
      0
    );
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}小时${minutes}分钟`;
  });

  // 方法
  function focusApp() {
    if (appEl.value && typeof appEl.value.focus === 'function') {
      appEl.value.focus();
    }
  }

  function updateCurrentTime() {
    const now = new Date();
    currentTime.value = now.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function setPreset(time) {
    endTime.value = time;
  }

  function startTimer() {
    if (!endTime.value) return;

    isTimerActive.value = true;
    startWorkTime.value = new Date();

    // 启动定时器
    timer.value = setInterval(() => {
      updateCurrentTime();

      // 检查是否到达下班时间
      if (isOvertime.value) {
        // 可以在这里添加通知逻辑
        playNotificationSound();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timer.value) {
      clearInterval(timer.value);
      timer.value = null;
    }

    // 记录工作时长
    if (startWorkTime.value) {
      const session = {
        date: new Date().toISOString(),
        startTime: startWorkTime.value.toISOString(),
        endTime: new Date().toISOString(),
        duration: new Date().getTime() - startWorkTime.value.getTime(),
        targetEndTime: endTime.value,
      };

      workSessions.value.push(session);
      saveWorkSessions();
    }

    isTimerActive.value = false;
    startWorkTime.value = null;
  }

  function resetTimer() {
    stopTimer();
    endTime.value = '18:00';
  }

  function playNotificationSound() {
    // 简单的音频提示
    try {
      const audio = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
      );
      audio.play().catch(() => {});
    } catch (e) {
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
      const settings = {
        endTime: endTime.value,
      };
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

  // 监听设置变化
  watch(endTime, saveSettings);

  // 生命周期
  onMounted(() => {
    updateCurrentTime();
    loadSettings();
    loadWorkSessions();
    focusApp();

    // 每秒更新时间
    const timeTimer = setInterval(updateCurrentTime, 1000);

    // 清理函数
    onBeforeUnmount(() => {
      clearInterval(timeTimer);
      if (timer.value) {
        clearInterval(timer.value);
      }
    });
  });

  onBeforeUnmount(() => {
    if (timer.value) {
      clearInterval(timer.value);
    }
  });
</script>

<style scoped>
  .work-timer-app {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    min-width: 0;
    min-height: 600px;
    color: white;
  }

  .timer-header {
    text-align: center;
    margin-bottom: 20px;
  }

  .timer-title {
    font-size: 1.8rem;
    margin: 0 0 8px 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .current-time {
    font-size: 1.2rem;
    opacity: 0.9;
    font-family: 'Courier New', monospace;
  }

  .timer-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .settings-section {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    width: 100%;
    max-width: 300px;
  }

  .time-input-group {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .time-input-group label {
    font-weight: 500;
    min-width: 80px;
  }

  .time-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    font-size: 16px;
  }

  .preset-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .preset-btn {
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
  }

  .preset-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .preset-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .countdown-display {
    position: relative;
    margin: 20px 0;
  }

  .time-circle {
    position: relative;
    width: 200px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .time-circle.warning {
    animation: pulse-warning 2s infinite;
  }

  .time-circle.overtime {
    animation: pulse-overtime 1s infinite;
  }

  @keyframes pulse-warning {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  @keyframes pulse-overtime {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .time-text {
    text-align: center;
    z-index: 2;
  }

  .main-time {
    font-size: 2rem;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .time-label {
    font-size: 0.9rem;
    opacity: 0.8;
    margin-top: 4px;
  }

  .progress-ring {
    position: absolute;
    top: 0;
    left: 0;
    transform: rotate(-90deg);
  }

  .progress-ring-background {
    fill: none;
    stroke: rgba(255, 255, 255, 0.2);
    stroke-width: 8;
  }

  .progress-ring-progress {
    fill: none;
    stroke: #4ade80;
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
  }

  .progress-ring-progress.overtime {
    stroke: #ff4757;
    animation: pulse-ring 1s infinite;
  }

  @keyframes pulse-ring {
    0%,
    100% {
      stroke-width: 8;
    }
    50% {
      stroke-width: 12;
    }
  }

  .control-buttons {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1rem;
    min-width: 100px;
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .btn-primary {
    background: linear-gradient(45deg, #4ade80, #22c55e);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(45deg, #22c55e, #16a34a);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .btn-secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }

  .btn-reset {
    background: linear-gradient(45deg, #ff6b6b, #ee5a52);
    color: white;
  }

  .btn-reset:hover:not(:disabled) {
    background: linear-gradient(45deg, #ee5a52, #e74c3c);
  }

  .stats-section {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    width: 100%;
    max-width: 300px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .stat-item:last-child {
    border-bottom: none;
  }

  .stat-label {
    font-size: 0.9rem;
    opacity: 0.8;
  }

  .stat-value {
    font-weight: bold;
    color: #4ade80;
  }

  @media (max-width: 768px) {
    .work-timer-app {
      padding: 12px;
      min-height: 500px;
    }

    .timer-title {
      font-size: 1.5rem;
    }

    .main-time {
      font-size: 1.5rem;
    }

    .time-circle {
      width: 160px;
      height: 160px;
    }

    .progress-ring {
      width: 160px;
      height: 160px;
    }

    .control-buttons {
      flex-direction: column;
      align-items: center;
    }

    .btn {
      min-width: 200px;
    }
  }
</style>

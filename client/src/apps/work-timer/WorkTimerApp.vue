<template>
  <div class="work-timer-app" @click.self="focusApp" ref="appEl" tabindex="0">
    <TimerHeader :current-time="currentTime" />

    <div class="timer-container">
      <TimerSettings
        v-if="!isTimerActive"
        :end-time="endTime"
        :is-timer-active="isTimerActive"
        @update:endTime="updateEndTime"
      />

      <CountdownDisplay
        :display-time="displayTime"
        :time-label="timeLabel"
        :is-overtime="isOvertime"
        :is-warning="isWarning"
        :circumference="circumference"
        :progress-offset="progressOffset"
      />

      <ControlButtons
        :is-timer-active="isTimerActive"
        :end-time="endTime"
        @start="startTimer"
        @stop="stopTimer"
        @reset="resetTimer"
      />

      <StatsSection
        :today-work-time="todayWorkTime"
        :week-work-time="weekWorkTime"
        :total-work-time="formatMsToReadable(totalMs)"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, watch } from 'vue';
  import { useWorkTimer } from '@/composables/useWorkTimer';
  import TimerHeader from './components/TimerHeader.vue';
  import TimerSettings from './components/TimerSettings.vue';
  import CountdownDisplay from './components/CountdownDisplay.vue';
  import ControlButtons from './components/ControlButtons.vue';
  import StatsSection from './components/StatsSection.vue';

  const appEl = ref(null);

  const props = defineProps({
    autoStart: { type: Boolean, default: false },
  });

  const {
    // state
    currentTime,
    endTime,
    isTimerActive,
    circumference,
    // computed
    displayTime,
    timeLabel,
    isOvertime,
    isWarning,
    progressOffset,
    todayWorkTime,
    weekWorkTime,
    totalMs,
    // methods
    setPreset,
    startTimer,
    stopTimer,
    resetTimer,
  } = useWorkTimer();

  // 处理 endTime 更新
  function updateEndTime(newTime) {
    endTime.value = newTime;
  }

  function formatMsToReadable(ms) {
    const m = Number(ms || 0);
    const hours = Math.floor(m / (1000 * 60 * 60));
    const minutes = Math.floor((m % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}小时${minutes}分钟`;
  }

  function focusApp() {
    if (appEl.value && typeof appEl.value.focus === 'function') {
      appEl.value.focus();
    }
  }

  // 如果传入 autoStart 且计时尚未开始，则自动开始计时
  onMounted(() => {
    if (props.autoStart && !isTimerActive.value) {
      startTimer();
    }
  });

  watch(
    () => props.autoStart,
    val => {
      if (val && !isTimerActive.value) startTimer();
    }
  );
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

  .timer-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  @media (max-width: 768px) {
    .work-timer-app {
      padding: 12px;
      min-height: 500px;
    }
  }
</style>

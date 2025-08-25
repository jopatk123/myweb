<template>
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
</template>

<script setup>
  const props = defineProps({
    displayTime: { type: String, required: true },
    timeLabel: { type: String, required: true },
    isOvertime: { type: Boolean, required: true },
    isWarning: { type: Boolean, required: true },
    circumference: { type: Number, required: true },
    progressOffset: { type: Number, required: true },
  });
</script>

<style scoped>
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

  @media (max-width: 768px) {
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
</style>

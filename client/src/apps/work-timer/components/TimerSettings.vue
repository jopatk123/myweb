<template>
  <div class="settings-section">
    <div class="time-input-group">
      <label>下班时间:</label>
      <input
        type="time"
        :value="endTime"
        class="time-input"
        :disabled="isTimerActive"
        @input="onInput"
      />
    </div>

    <div class="preset-buttons">
      <button
        v-for="preset in presets"
        :key="preset.label"
        @click="emit('update:endTime', preset.time)"
        class="preset-btn"
        :disabled="isTimerActive"
      >
        {{ preset.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
  const props = defineProps({
    endTime: { type: String, required: true },
    isTimerActive: { type: Boolean, required: true },
  });

  const emit = defineEmits(['update:endTime']);

  const presets = [
    { label: '17:30', time: '17:30' },
    { label: '18:00', time: '18:00' },
    { label: '18:30', time: '18:30' },
    { label: '19:00', time: '19:00' },
  ];

  function onInput(e) {
    emit('update:endTime', e.target.value);
  }
</script>

<style scoped>
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
</style>

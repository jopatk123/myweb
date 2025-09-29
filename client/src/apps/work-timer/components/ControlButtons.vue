<template>
  <div class="control-buttons">
    <button
      v-if="!isTimerActive"
      @click="emit('start')"
      class="btn btn-primary"
      :disabled="!endTime"
    >
      开始计时
    </button>
    <button v-else @click="emit('stop')" class="btn btn-secondary">
      停止计时
    </button>
    <button @click="emit('reset')" class="btn btn-reset">重置</button>
  </div>
</template>

<script setup>
  defineProps({
    isTimerActive: { type: Boolean, required: true },
    endTime: { type: String, required: true },
  });
  const emit = defineEmits(['start', 'stop', 'reset']);
</script>

<style scoped>
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

  @media (max-width: 768px) {
    .control-buttons {
      flex-direction: column;
      align-items: center;
    }

    .btn {
      min-width: 200px;
    }
  }
</style>

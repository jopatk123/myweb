<template>
  <div v-if="currentThinking || isThinking" class="current-thinking-section">
    <div class="current-header">
      <h5>🧠 当前思考</h5>
      <div v-if="isThinking" class="thinking-spinner"></div>
    </div>

    <div v-if="currentThinking" class="thinking-content">
      <div class="thinking-step">
        <span class="step-label">步骤:</span>
        <span class="step-text">{{
          currentThinking.step || '分析棋局...'
        }}</span>
      </div>

      <div v-if="currentThinking.progress" class="progress-section">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: currentThinking.progress + '%' }"
          ></div>
        </div>
        <span class="progress-text">{{ currentThinking.progress }}%</span>
      </div>
    </div>

    <div v-else-if="isThinking" class="thinking-placeholder">
      <div class="placeholder-line"></div>
      <div class="placeholder-line short"></div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    currentThinking: Object,
    isThinking: {
      type: Boolean,
      default: false,
    },
  });
</script>

<style scoped>
  .current-thinking-section {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 16px;
  }

  .current-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .current-header h5 {
    margin: 0;
    color: #166534;
    font-size: 1rem;
  }

  .thinking-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #bbf7d0;
    border-top: 2px solid #16a34a;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .thinking-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .thinking-step {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .step-label {
    color: #16a34a;
    font-weight: bold;
    font-size: 0.9rem;
  }

  .step-text {
    color: #166534;
    font-size: 0.9rem;
  }

  .progress-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .progress-bar {
    flex: 1;
    height: 6px;
    background: #dcfce7;
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #16a34a 0%, #22c55e 100%);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.8rem;
    color: #16a34a;
    font-weight: bold;
    min-width: 35px;
  }

  .thinking-placeholder {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .placeholder-line {
    height: 12px;
    background: #dcfce7;
    border-radius: 6px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .placeholder-line.short {
    width: 60%;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>

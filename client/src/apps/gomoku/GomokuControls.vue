<template>
  <div class="gomoku-controls">
    <div class="control-buttons">
      <button
        v-if="!gameStarted"
        @click="$emit('start')"
        class="btn btn-primary"
      >
        开始游戏
      </button>

      <button
        v-if="gameStarted && !gameOver"
        @click="$emit('undo')"
        :disabled="!canUndo"
        class="btn btn-secondary"
      >
        悔棋
      </button>

      <button @click="$emit('restart')" class="btn btn-secondary">
        重新开始
      </button>

      <button
        v-if="gameStarted && !gameOver"
        @click="$emit('hint')"
        :disabled="currentPlayer !== 1"
        class="btn btn-hint"
      >
        提示
      </button>

      <button
        v-if="
          gameStarted && !gameOver && gameMode === 'ai_vs_ai' && isAIAutoPlaying
        "
        @click="$emit('stop-ai')"
        class="btn btn-stop"
      >
        停止
      </button>
      <button
        v-if="
          gameStarted &&
          !gameOver &&
          gameMode === 'ai_vs_ai' &&
          !isAIAutoPlaying
        "
        @click="$emit('resume-ai')"
        class="btn btn-primary"
      >
        继续
      </button>

      <button @click="$emit('config-ai')" class="btn btn-config">AI配置</button>
    </div>

    <div class="game-mode-info">
      <div class="mode-badge">
        <span class="mode-label">模式</span>
        <span class="mode-value">AI大模型对战</span>
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    gameStarted: {
      type: Boolean,
      default: false,
    },
    gameOver: {
      type: Boolean,
      default: false,
    },
    currentPlayer: {
      type: Number,
      required: true,
    },
    canUndo: {
      type: Boolean,
      default: false,
    },
    gameMode: {
      type: String,
      default: 'human_vs_ai',
    },
    isAIAutoPlaying: {
      type: Boolean,
      default: true,
    },
  });

  defineEmits([
    'start',
    'restart',
    'undo',
    'hint',
    'config-ai',
    'stop-ai',
    'resume-ai',
  ]);
</script>

<style scoped>
  .gomoku-controls {
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-items: center;
    margin-top: 20px;
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
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1rem;
    min-width: 100px;
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
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

  .btn-hint {
    background: linear-gradient(45deg, #f59e0b, #d97706);
    color: white;
  }

  .btn-hint:hover:not(:disabled) {
    background: linear-gradient(45deg, #d97706, #b45309);
  }

  .btn-config {
    background: linear-gradient(45deg, #8b5cf6, #7c3aed);
    color: white;
  }

  .btn-config:hover:not(:disabled) {
    background: linear-gradient(45deg, #7c3aed, #6d28d9);
  }

  .btn-stop {
    background: linear-gradient(45deg, #ef4444, #dc2626);
    color: #fff;
  }
  .btn-stop:hover:not(:disabled) {
    background: linear-gradient(45deg, #dc2626, #b91c1c);
  }

  .game-mode-info {
    display: flex;
    justify-content: center;
  }

  .mode-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.1);
    padding: 8px 16px;
    border-radius: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .mode-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
  }

  .mode-value {
    color: #8b5cf6;
    font-weight: bold;
    font-size: 1rem;
  }

  @media (max-width: 768px) {
    .control-buttons {
      gap: 8px;
    }

    .btn {
      padding: 10px 16px;
      font-size: 0.9rem;
      min-width: 80px;
    }

    .difficulty-badge {
      padding: 6px 12px;
    }
  }
</style>

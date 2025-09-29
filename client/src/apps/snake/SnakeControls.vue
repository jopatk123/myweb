<template>
  <div class="game-controls">
    <div class="control-buttons">
      <button
        class="btn btn-secondary"
        @click="$emit('start')"
        :disabled="gameStarted && !gameOver"
      >
        {{ gameStarted && !gameOver ? '游戏中...' : '开始' }}
      </button>
      <button
        class="btn btn-secondary"
        @click="$emit('pause')"
        :disabled="!gameStarted || gameOver"
      >
        {{ paused ? '继续' : '暂停' }}
      </button>
      <button class="btn btn-secondary" @click="$emit('restart')">
        重新开始
      </button>
      <button class="btn btn-tertiary" @click="$emit('backToMenu')">
        返回菜单
      </button>
    </div>

    <div class="difficulty-controls">
      <label>难度:</label>
      <select :value="difficulty" @change="onChange" :disabled="gameStarted">
        <option value="easy">简单</option>
        <option value="medium">中等</option>
        <option value="hard">困难</option>
        <option value="extreme">极限</option>
      </select>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    gameStarted: { type: Boolean, required: true },
    paused: { type: Boolean, required: true },
    gameOver: { type: Boolean, required: true },
    difficulty: { type: String, required: true },
  });

  const emit = defineEmits(['start', 'pause', 'restart', 'backToMenu', 'update:difficulty']);

  function onChange(e) {
    emit('update:difficulty', e.target.value);
  }
</script>

<style scoped>
  .game-controls {
    display: flex;
    gap: 30px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
  }

  .control-buttons {
    display: flex;
    gap: 10px;
  }

  .difficulty-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    color: white;
  }

  .difficulty-controls label {
    font-weight: bold;
  }

  .difficulty-controls select {
    padding: 8px 12px;
    border-radius: 8px;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    backdrop-filter: blur(10px);
  }

  .difficulty-controls select option {
    background: #333;
    color: white;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1rem;
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

  .btn-secondary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
</style>

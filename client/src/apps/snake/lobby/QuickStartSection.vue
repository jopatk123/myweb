<template>
  <div class="quick-start-section">
    <h3>快速开始</h3>
    <div class="quick-start-controls">
      <input
        :value="playerName"
        @input="$emit('update:playerName', $event.target.value)"
        type="text"
        placeholder="输入您的昵称"
        maxlength="20"
        class="player-name-input"
      />

      <div class="game-mode-selector">
        <label>
          <input
            :checked="selectedMode === 'shared'"
            @change="$emit('update:selectedMode', 'shared')"
            type="radio"
            name="mode"
            value="shared"
          />
          <span class="mode-option">
            🤝 共享模式
            <small>多人控制一条蛇，支持中途加入</small>
          </span>
        </label>
        <label>
          <input
            :checked="selectedMode === 'competitive'"
            @change="$emit('update:selectedMode', 'competitive')"
            type="radio"
            name="mode"
            value="competitive"
          />
          <span class="mode-option">
            ⚔️ 竞技模式
            <small>多人对战（最多8人，首撞者失败）</small>
          </span>
        </label>
      </div>

      <div class="quick-actions">
        <button
          class="btn-primary"
          @click="$emit('create-room')"
          :disabled="!playerName.trim() || loading"
        >
          🎮 创建房间
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    playerName: { type: String, required: false, default: '' },
    selectedMode: { type: String, required: false, default: 'shared' },
    loading: { type: Boolean, default: false },
  });

  defineEmits(['update:playerName', 'update:selectedMode', 'create-room']);
</script>

<style scoped>
  .quick-start-section {
    background: white;
    padding: 25px;
    border-radius: 15px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    border: 1px solid #e1e8ed;
  }

  .quick-start-section h3 {
    margin: 0 0 20px 0;
    color: #2c3e50;
    font-size: 20px;
  }

  .quick-start-controls {
    display: grid;
    gap: 20px;
  }

  .player-name-input {
    padding: 12px 16px;
    border: 2px solid #e1e8ed;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.3s;
  }

  .player-name-input:focus {
    outline: none;
    border-color: #667eea;
  }

  .game-mode-selector {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .game-mode-selector label {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .game-mode-selector input[type='radio'] {
    margin-right: 12px;
  }

  .mode-option {
    display: flex;
    flex-direction: column;
    padding: 15px;
    border: 2px solid #e1e8ed;
    border-radius: 8px;
    transition: all 0.3s;
    background: white;
    width: 100%;
  }

  .game-mode-selector input[type='radio']:checked + .mode-option {
    border-color: #667eea;
    background: #f8f9ff;
  }

  .mode-option small {
    color: #666;
    margin-top: 4px;
  }

  .quick-actions {
    display: flex;
    gap: 15px;
  }

  .btn-primary,
  .btn-secondary {
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    flex: 1;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #5a6fd8;
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: #e1e8ed;
    color: #2c3e50;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #d1d9e0;
    transform: translateY(-1px);
  }

  .btn-primary:disabled,
  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    .game-mode-selector {
      grid-template-columns: 1fr;
    }

    .quick-actions {
      flex-direction: column;
    }
  }
</style>

<template>
  <div class="room-basic-form">
    <!-- 房间名称 -->
    <div class="form-group">
      <label>房间名称</label>
      <input
        :value="name"
        @input="$emit('update:name', $event.target.value)"
        type="text"
        :placeholder="namePlaceholder"
        maxlength="30"
        class="form-input"
        @keyup.enter="$emit('create')"
      />
    </div>

    <!-- 游戏模式选择 -->
    <div class="form-group">
      <label>游戏模式</label>
      <div class="mode-selector">
        <div
          v-for="gameMode in gameModes"
          :key="gameMode.value"
          class="mode-option"
          :class="{ active: mode === gameMode.value }"
          @click="$emit('update:mode', gameMode.value)"
        >
          <div class="mode-icon">{{ gameMode.icon }}</div>
          <div class="mode-info">
            <div class="mode-title">{{ gameMode.label }}</div>
            <div class="mode-desc">{{ gameMode.description }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 最大玩家数 -->
    <div class="form-group">
      <label>最大玩家数</label>
      <div class="player-count-selector">
        <button
          v-for="count in playerCountOptions"
          :key="count"
          type="button"
          class="count-option"
          :class="{ active: maxPlayers === count }"
          @click="$emit('update:maxPlayers', count)"
        >
          {{ count }}人
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    name: { type: String, required: true },
    mode: { type: String, required: true },
    maxPlayers: { type: Number, required: true },
    namePlaceholder: { type: String, default: '请输入房间名称' },
    gameModes: { type: Array, required: true },
    playerCountOptions: { type: Array, required: true },
  });

  defineEmits(['update:name', 'update:mode', 'update:maxPlayers', 'create']);
</script>

<style scoped>
  .room-basic-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-group label {
    font-weight: 500;
    color: #2c3e50;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .form-input {
    padding: 12px 16px;
    border: 2px solid #e1e8ed;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.3s;
  }

  .form-input:focus {
    outline: none;
    border-color: #667eea;
  }

  .form-input::placeholder {
    color: #999;
  }

  .mode-selector {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mode-option {
    display: flex;
    align-items: center;
    padding: 16px;
    border: 2px solid #e1e8ed;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s;
    gap: 16px;
  }

  .mode-option:hover {
    border-color: #667eea;
    background: #f8f9ff;
  }

  .mode-option.active {
    border-color: #667eea;
    background: #f8f9ff;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
  }

  .mode-icon {
    font-size: 24px;
    width: 32px;
    text-align: center;
  }

  .mode-info {
    flex: 1;
  }

  .mode-title {
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 4px;
  }

  .mode-desc {
    color: #666;
    font-size: 13px;
  }

  .player-count-selector {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .count-option {
    padding: 8px 16px;
    border: 2px solid #e1e8ed;
    border-radius: 8px;
    background: white;
    color: #2c3e50;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 14px;
    font-weight: 500;
  }

  .count-option:hover {
    border-color: #667eea;
    background: #f8f9ff;
  }

  .count-option.active {
    border-color: #667eea;
    background: #667eea;
    color: white;
  }

  @media (max-width: 768px) {
    .mode-option {
      padding: 12px;
      gap: 12px;
    }

    .mode-icon {
      font-size: 20px;
      width: 28px;
    }
  }
</style>

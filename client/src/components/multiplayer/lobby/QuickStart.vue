<template>
  <div class="quick-start-section">
    <h3>快速开始</h3>
    <div class="quick-start-controls">
      <input
        :value="playerName"
        @input="$emit('update:playerName', $event.target.value)"
        type="text"
        :placeholder="playerNamePlaceholder"
        maxlength="20"
        class="player-name-input"
        @keyup.enter="$emit('quickJoin')"
      />
      
      <slot name="mode-selector" :selectedMode="selectedMode" :onModeChange="onModeChange">
        <div class="game-mode-selector">
          <label v-for="mode in gameModes" :key="mode.value">
            <input 
              :checked="selectedMode === mode.value"
              @change="$emit('update:selectedMode', mode.value)"
              type="radio" 
              :value="mode.value" 
            />
            <span class="mode-option">
              {{ mode.icon }} {{ mode.label }}
              <small>{{ mode.description }}</small>
            </span>
          </label>
        </div>
      </slot>
      
      <div class="quick-start-buttons">
        <button 
          class="btn-primary"
          @click="$emit('quickJoin')"
          :disabled="!playerName.trim() || loading"
        >
          🚀 快速匹配
        </button>
        
        <button 
          class="btn-secondary"
          @click="$emit('showCreateRoom')"
          :disabled="!playerName.trim()"
        >
          ➕ 创建房间
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  playerName: String,
  playerNamePlaceholder: String,
  selectedMode: String,
  gameModes: Array,
  loading: Boolean
});

defineEmits([
  'update:playerName',
  'update:selectedMode',
  'quickJoin',
  'showCreateRoom'
]);

const onModeChange = (mode) => {
  emit('update:selectedMode', mode);
};
</script>

<style scoped>
.quick-start-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.quick-start-controls {
  display: grid;
  gap: 15px;
}

.player-name-input {
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
}

.game-mode-selector {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.mode-option {
  display: block;
  padding: 10px 15px;
  border: 2px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

input[type="radio"] {
  display: none;
}

input[type="radio"]:checked + .mode-option {
  border-color: #007bff;
  background-color: #f0f8ff;
  box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
}


.mode-option:hover {
  border-color: #007bff;
  background-color: #f0f8ff;
}

.quick-start-buttons {
  display: flex;
  gap: 10px;
}

.btn-primary, .btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

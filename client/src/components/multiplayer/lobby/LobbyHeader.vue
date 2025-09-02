<template>
  <div class="lobby-header">
    <h2>{{ title }}</h2>
    <div class="header-actions">
  <slot name="header-actions">
  </slot>
      <button class="btn-secondary" @click="$emit('refreshRooms')" :disabled="loading">
        🔄 刷新房间
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: '多人游戏大厅'
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['refreshRooms']);
</script>

<style scoped>
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.lobby-header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

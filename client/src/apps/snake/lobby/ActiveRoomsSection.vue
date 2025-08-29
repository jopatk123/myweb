<template>
  <div class="active-rooms-section">
    <div class="section-header">
      <h3>活跃房间 ({{ rooms.length }})</h3>
      <button class="btn-text" @click="$emit('refresh')" :disabled="loading">
        {{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <div v-if="loading && !rooms.length" class="loading-placeholder">
      <div class="loading-spinner"></div>
      <span>加载房间列表...</span>
    </div>

    <div v-else-if="!rooms.length" class="empty-rooms">
      <div class="empty-icon">🏠</div>
      <p>暂无活跃房间</p>
      <p class="empty-hint">创建一个房间来开始游戏吧！</p>
    </div>

    <div v-else class="rooms-grid">
      <RoomCard
        v-for="room in rooms" 
        :key="room.id || room.room_code || room.roomCode"
        :room="room"
        @join="$emit('join-room', $event)"
        @spectate="$emit('spectate', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import RoomCard from './RoomCard.vue'

defineProps({
  rooms: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

defineEmits(['refresh', 'join-room', 'spectate'])
</script>

<style scoped>
.active-rooms-section {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e1e8ed;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 20px;
}

.btn-text {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  font-size: 14px;
  transition: color 0.3s;
}

.btn-text:hover:not(:disabled) {
  color: #5a6fd8;
}

.btn-text:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-placeholder {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-rooms {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.empty-rooms p {
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 14px;
  opacity: 0.8;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .rooms-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div 
    class="room-card"
    :class="{ 
      'room-full': room.current_players >= room.max_players,
      'room-playing': room.status === 'playing'
    }"
  >
    <div class="room-header">
      <span class="room-code">{{ room.room_code }}</span>
      <span class="room-mode" :class="`mode-${room.mode}`">
        {{ room.mode === 'shared' ? '🤝 共享' : '⚔️ 竞技' }}
      </span>
    </div>

    <div class="room-info">
      <div class="player-count">
        <span class="count">{{ room.current_players }}/{{ room.max_players }}</span>
        <span class="label">玩家</span>
      </div>
      <div class="room-status">
        <span class="status" :class="`status-${room.status}`">
          {{ getStatusText(room.status) }}
        </span>
      </div>
    </div>

    <div class="room-actions">
      <button 
        v-if="room.status === 'waiting' && room.current_players < room.max_players"
        class="btn-join" 
        @click="$emit('join', room.room_code)"
      >
        🚀 加入游戏
      </button>
      <button 
        v-else-if="room.status === 'playing'"
        class="btn-spectate" 
        @click="$emit('spectate', room.room_code)"
      >
        👁️ 观战
      </button>
      <span v-else class="room-unavailable">
        {{ room.current_players >= room.max_players ? '房间已满' : '游戏已结束' }}
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  room: { type: Object, required: true }
})

defineEmits(['join', 'spectate'])

const getStatusText = (status) => {
  const statusMap = {
    'waiting': '等待中',
    'playing': '游戏中',
    'finished': '已结束'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
.room-card {
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
}

.room-card:hover {
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.room-card.room-full {
  opacity: 0.7;
}

.room-card.room-playing {
  border-left: 4px solid #ffa502;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.room-code {
  font-family: monospace;
  font-weight: bold;
  font-size: 18px;
  color: #2c3e50;
}

.room-mode {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.mode-shared {
  background: #e3f2fd;
  color: #1976d2;
}

.mode-competitive {
  background: #fce4ec;
  color: #c2185b;
}

.room-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.player-count {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.count {
  font-weight: bold;
  font-size: 18px;
  color: #2c3e50;
}

.label {
  font-size: 12px;
  color: #666;
}

.status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-waiting {
  background: #e8f5e8;
  color: #2e7d32;
}

.status-playing {
  background: #fff3e0;
  color: #ef6c00;
}

.status-finished {
  background: #fafafa;
  color: #616161;
}

.room-actions {
  text-align: center;
}

.btn-join, .btn-spectate {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
}

.btn-join {
  background: #667eea;
  color: white;
}

.btn-join:hover {
  background: #5a6fd8;
  transform: translateY(-1px);
}

.btn-spectate {
  background: #ffa502;
  color: white;
}

.btn-spectate:hover {
  background: #e8940e;
  transform: translateY(-1px);
}

.room-unavailable {
  color: #666;
  font-size: 14px;
}
</style>

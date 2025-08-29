<template>
  <div 
    class="room-card"
    :class="`room-${room.status}`"
  >
    <div class="room-header">
      <div class="room-code">{{ room.room_code }}</div>
      <div class="room-status" :class="`status-${room.status}`">
        {{ getStatusText(room.status) }}
      </div>
    </div>

    <div class="room-info">
      <div class="room-mode">
        <slot name="room-mode" :room="room">
          <span class="mode-badge" :class="`mode-${room.mode}`">
            {{ getModeText(room.mode) }}
          </span>
        </slot>
      </div>
      
      <div class="room-players">
        👥 {{ room.current_players }}/{{ room.max_players }}
      </div>
      
      <div class="room-created">
        🕒 {{ formatTime(room.created_at) }}
      </div>
    </div>

    <div class="room-actions">
      <button 
        class="btn-primary btn-small"
        @click="$emit('joinRoom', room.room_code)"
        :disabled="room.current_players >= room.max_players || room.status !== 'waiting'"
      >
        {{ room.status === 'waiting' ? '🚪 加入' : '👁️ 观看' }}
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  room: {
    type: Object,
    required: true
  },
  gameModes: {
    type: Array,
    required: true
  }
});

defineEmits(['joinRoom']);

const getStatusText = (status) => {
  const statusMap = {
    waiting: '等待中',
    playing: '游戏中',
    finished: '已结束'
  };
  return statusMap[status] || status;
};

const getModeText = (mode) => {
  const modeItem = props.gameModes.find(m => m.value === mode);
  return modeItem ? `${modeItem.icon} ${modeItem.label}` : mode;
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};
</script>

<style scoped>
.room-card {
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s ease;
}

.room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.room-code {
  font-weight: bold;
  font-size: 18px;
  color: #333;
}

.room-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.status-waiting { background-color: #28a745; }
.status-playing { background-color: #ffc107; color: black; }
.status-finished { background-color: #6c757d; }

.room-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #555;
}

.mode-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  align-self: flex-start;
}

.mode-shared { background-color: #28a745; }
.mode-competitive { background-color: #dc3545; }

.room-actions {
  text-align: right;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}
</style>

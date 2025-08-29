<template>
  <div class="join-room-section">
    <h3>加入房间</h3>
    <div class="join-room-controls">
      <input
        :value="roomCode"
        @input="updateRoomCode"
        type="text"
        placeholder="输入房间码（如：ABC123）"
        maxlength="10"
        class="room-code-input"
        @keyup.enter="$emit('join-room')"
      />
      <button 
        class="btn-primary" 
        @click="$emit('join-room')"
        :disabled="!playerName.trim() || !roomCode.trim() || loading"
      >
        🔗 加入房间
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  roomCode: { type: String, required: true },
  playerName: { type: String, required: true },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:roomCode', 'join-room'])

const updateRoomCode = (event) => {
  emit('update:roomCode', event.target.value.toUpperCase())
}
</script>

<style scoped>
.join-room-section {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e1e8ed;
}

.join-room-section h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 20px;
}

.join-room-controls {
  display: flex;
  gap: 15px;
}

.room-code-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  font-family: monospace;
  text-transform: uppercase;
  transition: border-color 0.3s;
}

.room-code-input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-primary {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: #667eea;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-primary:hover:not(:disabled) {
  background: #5a6fd8;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .join-room-controls {
    flex-direction: column;
  }
}
</style>

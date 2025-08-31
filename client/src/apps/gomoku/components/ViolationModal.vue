<template>
  <div v-if="visible" class="violation-modal-overlay" @click="handleOverlayClick">
    <div class="violation-modal" @click.stop>
      <div class="violation-header">
        <div class="violation-icon">🚫</div>
        <h3>AI违规判负</h3>
        <button @click="close" class="close-btn">×</button>
      </div>
      
      <div class="violation-content">
        <div class="violation-info">
          <div class="violating-player">
            <span class="player-label">违规方：</span>
            <span class="player-name">{{ violationData.violatingPlayerName }}</span>
          </div>
          <div class="violation-reason">
            <span class="reason-label">违规原因：</span>
            <span class="reason-text">{{ violationData.violationMessage }}</span>
          </div>
          <div class="violation-detail" v-if="violationData.detailMessage">
            <span class="detail-label">详细信息：</span>
            <span class="detail-text">{{ violationData.detailMessage }}</span>
          </div>
        </div>
        
        <div class="winner-announcement">
          <div class="winner-icon">🏆</div>
          <div class="winner-text">
            <strong>{{ violationData.winnerName }}</strong> 获胜！
          </div>
        </div>
      </div>
      
      <div class="violation-actions">
        <button @click="close" class="btn btn-primary">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  violationData: {
    type: Object,
    required: true
  },
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const close = () => {
  emit('close');
};

const handleOverlayClick = () => {
  close();
};

// 违规类型对应的图标
const violationIcon = computed(() => {
  switch (props.violationData?.violationType) {
    case 'invalid_format':
      return '📝';
    case 'occupied_position':
      return '⚫';
    case 'out_of_bounds':
      return '📐';
    case 'parsing_error':
      return '💻';
    default:
      return '🚫';
  }
});
</script>

<style scoped>
.violation-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.violation-modal {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.violation-header {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
  border-radius: 16px 16px 0 0;
}

.violation-icon {
  font-size: 32px;
  margin-right: 12px;
}

.violation-header h3 {
  margin: 0;
  flex: 1;
  font-size: 1.3rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.violation-content {
  padding: 24px;
}

.violation-info {
  margin-bottom: 24px;
}

.violating-player,
.violation-reason,
.violation-detail {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  line-height: 1.5;
}

.player-label,
.reason-label,
.detail-label {
  font-weight: 600;
  color: #555;
  width: 80px;
  flex-shrink: 0;
  font-size: 14px;
}

.player-name {
  color: #dc3545;
  font-weight: 600;
}

.reason-text,
.detail-text {
  color: #666;
  flex: 1;
  word-break: break-word;
}

.detail-text {
  font-family: monospace;
  background: #f8f9fa;
  padding: 8px;
  border-radius: 6px;
  font-size: 13px;
}

.winner-announcement {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.winner-icon {
  font-size: 32px;
}

.winner-text {
  font-size: 18px;
  font-weight: 600;
}

.violation-actions {
  padding: 20px;
  text-align: center;
  border-top: 1px solid #eee;
}

.btn {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}
</style>

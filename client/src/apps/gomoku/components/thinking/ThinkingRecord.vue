<template>
  <div class="thinking-record" :class="{ 'latest-record': isLatest }">
    <div class="record-header">
      <div class="move-info">
        <span class="step-number">#{{ record.step || stepNumber }}</span>
        <span class="position">{{ formatPosition(record.position) }}</span>
        <span class="timestamp">{{ formatTime(record.timestamp) }}</span>
      </div>
    </div>
    
    <div class="record-content">
      <div v-if="record.thinking" class="thinking-text">
        {{ record.thinking }}
      </div>
      <div v-if="record.decision" class="decision-text">
        <strong>决策:</strong> {{ record.decision }}
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  record: {
    type: Object,
    required: true
  },
  stepNumber: {
    type: Number,
    required: true
  },
  isLatest: {
    type: Boolean,
    default: false
  }
});

function formatPosition(position) {
  if (!position || (!position.row && position.row !== 0) || (!position.col && position.col !== 0)) return '-';
  return `(${position.row + 1}, ${position.col + 1})`;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString();
}
</script>

<style scoped>
.thinking-record {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.thinking-record:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.latest-record {
  border-left: 4px solid #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.move-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-number {
  background: #3b82f6;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
}

.position {
  font-weight: bold;
  color: #374151;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.timestamp {
  font-size: 0.8rem;
  color: #6b7280;
}

.record-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.thinking-text {
  font-size: 0.9rem;
  color: #4b5563;
  line-height: 1.4;
  background: #f9fafb;
  padding: 8px;
  border-radius: 4px;
}

.decision-text {
  font-size: 0.9rem;
  color: #166534;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 8px;
  border-radius: 4px;
}
</style>

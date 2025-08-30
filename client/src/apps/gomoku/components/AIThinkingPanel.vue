<template>
  <div class="ai-thinking-panel" :class="{ expanded: isExpanded }">
    <div class="panel-header" @click="toggleExpanded">
      <div class="header-content">
        <span class="thinking-icon">🧠</span>
        <h4>AI思考过程</h4>
        <span class="expand-icon" :class="{ rotated: isExpanded }">▼</span>
      </div>
    </div>

    <div class="panel-content" v-show="isExpanded">
      <!-- 当前思考状态 -->
      <div v-if="currentThinking" class="current-thinking">
        <div class="thinking-header">
          <span class="player-indicator" :class="currentThinking.player === 1 ? 'black' : 'white'">
            {{ currentThinking.player === 1 ? '⚫' : '⚪' }}
          </span>
          <span class="player-name">{{ currentThinking.playerName }}</span>
          <div class="thinking-spinner">
            <div class="spinner"></div>
          </div>
        </div>
        
        <div class="thinking-steps">
          <div v-for="(step, index) in currentThinking.steps" :key="index" class="thinking-step">
            <span class="step-number">{{ index + 1 }}</span>
            <span class="step-text">{{ step }}</span>
          </div>
        </div>

        <div v-if="currentThinking.progress" class="thinking-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: currentThinking.progress + '%' }"></div>
          </div>
          <span class="progress-text">{{ currentThinking.progressText }}</span>
        </div>
      </div>

      <!-- 历史思考记录 -->
      <div class="thinking-history">
        <h5>💭 思考历史</h5>
        <div class="history-list">
          <div 
            v-for="(record, index) in thinkingHistory" 
            :key="index" 
            class="history-item"
            :class="{ latest: index === thinkingHistory.length - 1 }"
          >
            <div class="history-header">
              <span class="move-number">第{{ record.moveNumber }}步</span>
              <span class="player-indicator" :class="record.player === 1 ? 'black' : 'white'">
                {{ record.player === 1 ? '⚫' : '⚪' }}
              </span>
              <span class="player-name">{{ record.playerName }}</span>
              <span class="move-position">({{ record.position.row + 1 }}, {{ record.position.col + 1 }})</span>
            </div>
            
            <div class="history-reasoning">
              <p>{{ record.reasoning }}</p>
            </div>

            <div v-if="record.analysis" class="move-analysis">
              <div class="analysis-item" v-if="record.analysis.winProbability">
                <span class="analysis-label">胜率预测:</span>
                <span class="analysis-value">{{ record.analysis.winProbability }}%</span>
              </div>
              <div class="analysis-item" v-if="record.analysis.moveType">
                <span class="analysis-label">招法类型:</span>
                <span class="analysis-value">{{ record.analysis.moveType }}</span>
              </div>
              <div class="analysis-item" v-if="record.analysis.thinkingTime">
                <span class="analysis-label">思考时间:</span>
                <span class="analysis-value">{{ record.analysis.thinkingTime }}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 清空历史按钮 -->
      <div class="panel-actions">
        <button @click="clearHistory" class="btn btn-muted btn-sm">
          清空历史
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  currentThinking: {
    type: Object,
    default: null
  },
  thinkingHistory: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['clear-history']);

const isExpanded = ref(true);

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function clearHistory() {
  emit('clear-history');
}
</script>

<style scoped>
.ai-thinking-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  min-width: 320px;
  max-width: 400px;
  transition: all 0.3s ease;
}

.panel-header {
  padding: 15px 20px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s;
}

.panel-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.thinking-icon {
  font-size: 1.2rem;
}

.header-content h4 {
  margin: 0;
  flex: 1;
  font-size: 1rem;
}

.expand-icon {
  transition: transform 0.3s ease;
  font-size: 0.8rem;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

.panel-content {
  padding: 20px;
  max-height: 500px;
  overflow-y: auto;
}

.current-thinking {
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 20px;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.player-indicator {
  font-size: 1.2rem;
}

.player-indicator.black {
  color: #333;
}

.player-indicator.white {
  color: #fff;
}

.player-name {
  font-weight: 500;
  flex: 1;
}

.thinking-spinner {
  margin-left: auto;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #4ade80;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.thinking-steps {
  margin-bottom: 15px;
}

.thinking-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.step-number {
  background: #4ade80;
  color: #000;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
  flex-shrink: 0;
}

.step-text {
  line-height: 1.4;
}

.thinking-progress {
  margin-top: 15px;
}

.progress-bar {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  height: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  background: linear-gradient(90deg, #4ade80, #22c55e);
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
}

.thinking-history h5 {
  margin: 0 0 15px 0;
  font-size: 0.95rem;
  color: #a78bfa;
}

.history-list {
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.history-item.latest {
  border-left-color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}

.history-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.move-number {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.move-position {
  background: #8b5cf6;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  margin-left: auto;
}

.history-reasoning p {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.9);
}

.move-analysis {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.analysis-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
}

.analysis-label {
  color: rgba(255, 255, 255, 0.7);
}

.analysis-value {
  color: #4ade80;
  font-weight: 500;
}

.panel-actions {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

@media (max-width: 768px) {
  .ai-thinking-panel {
    min-width: auto;
    max-width: none;
    width: 100%;
  }
  
  .panel-content {
    padding: 15px;
    max-height: 400px;
  }
  
  .history-list {
    max-height: 200px;
  }
}
</style>
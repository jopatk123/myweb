<template>
  <div class="ai-thinking-panel" :class="{ expanded: isExpanded }">
    <div class="panel-header" @click="togglePanel">
      <h4>🤖 AI思考过程</h4>
      <div class="panel-controls">
        <span class="expand-icon">{{ isExpanded ? '−' : '+' }}</span>
      </div>
    </div>

    <div v-show="isExpanded" class="panel-content">
      <!-- 当前思考状态 -->
      <CurrentThinking
        :current-thinking="currentThinking"
        :is-thinking="isThinking"
      />

      <!-- 分割线 -->
      <div
        v-if="(currentThinking || isThinking) && thinkingHistory.length > 0"
        class="section-divider"
      ></div>

      <!-- 思考历史 -->
      <ThinkingHistory
        :thinking-history="thinkingHistory"
        @clear-history="$emit('clear-history')"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue';
  import CurrentThinking from './thinking/CurrentThinking.vue';
  import ThinkingHistory from './thinking/ThinkingHistory.vue';

  defineProps({
    currentThinking: Object,
    isThinking: {
      type: Boolean,
      default: false,
    },
    thinkingHistory: {
      type: Array,
      default: () => [],
    },
  });

  defineEmits(['clear-history']);

  const isExpanded = ref(true);

  function togglePanel() {
    isExpanded.value = !isExpanded.value;
  }
</script>

<style scoped>
  .ai-thinking-panel {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
  }

  .ai-thinking-panel.expanded {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    border-bottom: 1px solid #d1d5db;
    cursor: pointer;
    user-select: none;
    transition: background 0.2s ease;
  }

  .panel-header:hover {
    background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
  }

  .panel-header h4 {
    margin: 0;
    font-size: 1.1rem;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .panel-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .expand-icon {
    width: 24px;
    height: 24px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #6b7280;
    font-size: 1.2rem;
    transition: all 0.2s ease;
  }

  .expand-icon:hover {
    background: #f9fafb;
    color: #374151;
  }

  .panel-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 200px;
    max-height: 600px;
    overflow-y: auto;
  }

  .section-divider {
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      #e5e7eb 50%,
      transparent 100%
    );
    margin: 8px 0;
  }

  .panel-content::-webkit-scrollbar {
    width: 8px;
  }

  .panel-content::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  .panel-content::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }

  .panel-content::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
</style>

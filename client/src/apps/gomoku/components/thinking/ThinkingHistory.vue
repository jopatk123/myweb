<template>
  <div class="thinking-history">
    <div class="history-header">
      <h5>
        💭 思考历史
        <span class="record-count">({{ thinkingHistory.length }})</span>
      </h5>
      <button
        v-if="thinkingHistory.length > 0"
        @click="$emit('clear-history')"
        class="clear-btn"
      >
        清空
      </button>
    </div>

    <div v-if="thinkingHistory.length === 0" class="empty-hint">
      还没有思考记录，开始游戏后AI的每一步思考过程都会在这里显示
    </div>

    <div v-else ref="historyContainer" class="history-list">
      <ThinkingRecord
        v-for="(record, index) in thinkingHistory"
        :key="index"
        :record="record"
        :step-number="index + 1"
        :is-latest="index === thinkingHistory.length - 1"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, nextTick } from 'vue';
  import ThinkingRecord from './ThinkingRecord.vue';

  const props = defineProps({
    thinkingHistory: {
      type: Array,
      default: () => [],
    },
  });

  defineEmits(['clear-history']);

  const historyContainer = ref(null);

  // 监听思考历史变化，自动滚动到底部
  watch(
    () => props.thinkingHistory.length,
    async () => {
      if (props.thinkingHistory.length > 0) {
        await nextTick();
        if (historyContainer.value) {
          historyContainer.value.scrollTop =
            historyContainer.value.scrollHeight;
        }
      }
    }
  );
</script>

<style scoped>
  .thinking-history {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e5e7eb;
  }

  .history-header h5 {
    margin: 0;
    font-size: 1rem;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .record-count {
    font-size: 0.8rem;
    color: #6b7280;
    font-weight: normal;
  }

  .clear-btn {
    padding: 4px 8px;
    font-size: 0.75rem;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .clear-btn:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .empty-hint {
    text-align: center;
    color: #6b7280;
    font-size: 0.9rem;
    padding: 40px 20px;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px dashed #d1d5db;
  }

  .history-list {
    flex: 1;
    overflow-y: auto;
    min-height: 200px;
    max-height: 300px;
    padding-right: 8px;
    margin-right: -8px;
  }

  .history-list::-webkit-scrollbar {
    width: 6px;
  }

  .history-list::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  .history-list::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .history-list::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
</style>

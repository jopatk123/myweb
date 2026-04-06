<template>
  <section
    class="calculator-history-panel"
    data-testid="calculator-history-panel"
  >
    <div class="history-toolbar">
      <span class="history-label">历史记录</span>
      <button
        v-if="entries.length"
        type="button"
        class="history-clear"
        @click="$emit('clear-history')"
      >
        清空
      </button>
    </div>

    <div class="history-divider" />

    <ol v-if="entries.length" class="history-list" aria-label="计算历史">
      <li v-for="entry in entries" :key="entry.id" class="history-item">
        <span class="history-expression">{{ entry.expression }}</span>
        <span class="history-result">= {{ entry.result }}</span>
      </li>
    </ol>

    <div v-else class="history-empty-state">
      <span class="history-empty-icon">📋</span>
      <p class="history-empty">暂无记录</p>
    </div>
  </section>
</template>

<script setup>
  defineProps({
    entries: {
      type: Array,
      default: () => [],
    },
  });

  defineEmits(['clear-history']);
</script>

<style scoped>
  .calculator-history-panel {
    width: 180px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    padding: 14px 12px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(12px);
    color: rgba(255, 255, 255, 0.9);
    box-sizing: border-box;
    overflow: hidden;
  }

  .history-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    flex-shrink: 0;
  }

  .history-label {
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    opacity: 0.9;
  }

  .history-clear {
    border: 1px solid rgba(255, 255, 255, 0.28);
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.65rem;
    padding: 2px 8px;
    border-radius: 20px;
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s;
    white-space: nowrap;
  }

  .history-clear:hover {
    background: rgba(255, 255, 255, 0.22);
    color: white;
  }

  .history-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.14);
    margin-bottom: 10px;
    flex-shrink: 0;
  }

  .history-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .history-list::-webkit-scrollbar {
    width: 3px;
  }

  .history-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .history-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .history-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    border-left: 2px solid rgba(255, 255, 255, 0.35);
    font-family: 'Courier New', monospace;
    transition: background 0.15s;
  }

  .history-item:hover {
    background: rgba(255, 255, 255, 0.13);
  }

  .history-expression {
    font-size: 0.68rem;
    opacity: 0.65;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
  }

  .history-result {
    font-size: 0.9rem;
    font-weight: 700;
    color: white;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
  }

  .history-empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    opacity: 0.45;
  }

  .history-empty-icon {
    font-size: 1.6rem;
    line-height: 1;
  }

  .history-empty {
    margin: 0;
    font-size: 0.72rem;
    text-align: center;
    line-height: 1.4;
  }

  /* 响应式：窄屏时改为底部水平布局 */
  @media (max-width: 520px) {
    .calculator-history-panel {
      width: 100%;
      max-height: 120px;
      flex-direction: column;
    }

    .history-list {
      flex-direction: row;
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: hidden;
    }

    .history-item {
      min-width: 120px;
      flex-shrink: 0;
    }
  }
</style>

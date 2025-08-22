<template>
  <div class="calculator-display">
    <div class="history">{{ history }}</div>
    <div class="current-display">{{ display }}</div>
  </div>
</template>

<script setup>
  defineProps({
    display: {
      type: String,
      default: '0',
    },
    history: {
      type: String,
      default: '',
    },
  });
</script>

<style scoped>
  .calculator-display {
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    text-align: right;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .history {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
    margin-bottom: 8px;
    min-height: 1.2em;
    font-family: 'Courier New', monospace;
    word-wrap: break-word;
  }

  .current-display {
    color: white;
    font-size: 2rem;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    line-height: 1.2;
    word-wrap: break-word;
    overflow: hidden;
    /* 防止数字过长撑开布局：使用缩放和省略 */
    white-space: nowrap;
    text-overflow: ellipsis;
    max-width: 100%;
    display: block;
  }

  @media (max-width: 768px) {
    .calculator-display {
      padding: 12px;
      min-height: 70px;
    }

    .history {
      font-size: 0.8rem;
    }

    .current-display {
      font-size: 1.6rem;
    }
  }
</style>

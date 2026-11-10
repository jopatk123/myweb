<template>
  <div class="calculator-display">
    <div
      class="expression"
      data-testid="calculator-expression"
      aria-hidden="true"
    >
      {{ expression }}
    </div>
    <div
      class="current-display"
      data-testid="calculator-display"
      aria-label="当前输入"
    >
      {{ display }}
    </div>
    <div
      class="sr-only"
      data-testid="calculator-announcement"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ announcement }}
    </div>
  </div>
</template>

<script setup>
  defineProps({
    display: {
      type: String,
      default: '0',
    },
    expression: {
      type: String,
      default: '',
    },
    announcement: {
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

  .expression {
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
    white-space: nowrap;
    text-overflow: ellipsis;
    max-width: 100%;
    display: block;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 768px) {
    .calculator-display {
      padding: 12px;
      min-height: 70px;
    }

    .expression {
      font-size: 0.8rem;
    }

    .current-display {
      font-size: 1.6rem;
    }
  }
</style>

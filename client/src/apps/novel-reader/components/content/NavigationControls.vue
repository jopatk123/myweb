<template>
  <nav class="navigation-controls">
    <button
      class="nav-btn prev-btn"
      type="button"
      :disabled="!canPrev"
      @click="emit('prev')"
      title="上一章"
    >
      ← 上一章
    </button>

    <div class="chapter-info">{{ chapterText }}</div>

    <button
      class="nav-btn next-btn"
      type="button"
      :disabled="!canNext"
      @click="emit('next')"
      title="下一章"
    >
      下一章 →
    </button>
  </nav>
</template>

<script setup>
  const props = defineProps({
    canPrev: {
      type: Boolean,
      default: false,
    },
    canNext: {
      type: Boolean,
      default: false,
    },
    chapterText: {
      type: String,
      default: '',
    },
  });

  void props;

  const emit = defineEmits(['prev', 'next']);
</script>

<style scoped>
  .navigation-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: rgba(0, 0, 0, 0.05);
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }

  .nav-btn {
    padding: 8px 16px;
    border: 1px solid currentColor;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
    opacity: 0.8;
  }

  .nav-btn:hover:not(:disabled) {
    background: currentColor;
    color: var(--bg-color, #fff);
    opacity: 1;
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .chapter-info {
    font-size: 0.9rem;
    opacity: 0.7;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .navigation-controls {
      padding: 10px 16px;
    }

    .nav-btn {
      padding: 6px 12px;
      font-size: 0.8rem;
    }
  }
</style>

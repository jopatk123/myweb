<template>
  <div class="chapters-list">
    <button
      v-for="(chapter, index) in chapters"
      :key="chapterKey(chapter, index)"
      type="button"
      class="chapter-item"
      :class="{ active: index === currentIndex }"
      @click="emit('select', index)"
    >
      <span class="chapter-number">{{ index + 1 }}</span>
      <span class="chapter-title">{{
        chapter?.title ?? `章节 ${index + 1}`
      }}</span>
      <span v-if="index === currentIndex" class="current-indicator">📖</span>
    </button>
  </div>
</template>

<script setup>
  defineProps({
    chapters: {
      type: Array,
      default: () => [],
    },
    currentIndex: {
      type: Number,
      default: 0,
    },
  });

  const emit = defineEmits(['select']);

  function chapterKey(chapter, index) {
    if (chapter && (chapter.id || chapter.title)) {
      return `${chapter.id ?? chapter.title}-${index}`;
    }
    return index;
  }
</script>

<style scoped>
  .chapters-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .chapter-item {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 12px 20px;
    cursor: pointer;
    transition: background 0.2s ease;
    border: none;
    border-bottom: 1px solid #f0f0f0;
    background: transparent;
    text-align: left;
    gap: 12px;
  }

  .chapter-item:hover {
    background: #f8f9fa;
  }

  .chapter-item.active {
    background: #e3f2fd;
    color: #1976d2;
  }

  .chapter-number {
    font-size: 0.8rem;
    color: #666;
    min-width: 30px;
  }

  .chapter-title {
    flex: 1;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .current-indicator {
    font-size: 0.8rem;
  }

  @media (max-width: 768px) {
    .chapters-list {
      max-height: 200px;
    }
  }
</style>

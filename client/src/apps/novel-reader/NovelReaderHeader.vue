<template>
  <div class="reader-header">
    <div class="header-left">
      <button class="back-btn" @click="$emit('back')" title="返回书库">
        ← 返回
      </button>
      <div class="book-info">
        <h3 class="book-title">{{ book.title }}</h3>
        <div class="reading-info">
          <span v-if="currentChapter">{{ currentChapter.title }}</span>
          <span class="progress">{{ progressText }}</span>
        </div>
      </div>
    </div>

    <div class="header-right">
      <button class="header-btn" @click="$emit('toggle-menu')" title="目录">
        📋 目录
      </button>
      <button class="header-btn" @click="$emit('toggle-settings')" title="设置">
        ⚙️ 设置
      </button>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    book: {
      type: Object,
      required: true,
    },
    readingProgress: {
      type: Object,
      default: () => ({}),
    },
  });

  defineEmits(['back', 'toggle-menu', 'toggle-settings']);

  const currentChapter = computed(() => {
    const progress = props.readingProgress[props.book.id];
    if (!progress || !props.book.chapters) return null;

    const chapterIndex = progress.chapterIndex || 0;
    return props.book.chapters[chapterIndex];
  });

  const progressText = computed(() => {
    const progress = props.readingProgress[props.book.id];
    if (!progress || !props.book.chapters) return '';

    const chapterIndex = progress.chapterIndex || 0;
    const totalChapters = props.book.chapters.length;
    const percentage = Math.round(((chapterIndex + 1) / totalChapters) * 100);

    return `${chapterIndex + 1}/${totalChapters} (${percentage}%)`;
  });
</script>

<style scoped>
  .reader-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    min-width: 0;
  }

  .back-btn {
    padding: 6px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .back-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .book-info {
    flex: 1;
    min-width: 0;
  }

  .book-title {
    margin: 0 0 4px 0;
    font-size: 1.1rem;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .reading-info {
    display: flex;
    gap: 12px;
    font-size: 0.8rem;
    opacity: 0.8;
  }

  .reading-info span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .progress {
    color: #4ade80;
    font-weight: 500;
  }

  .header-right {
    display: flex;
    gap: 8px;
  }

  .header-btn {
    padding: 6px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .header-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    .reader-header {
      padding: 10px 16px;
    }

    .header-left {
      gap: 12px;
    }

    .book-title {
      font-size: 1rem;
    }

    .reading-info {
      flex-direction: column;
      gap: 2px;
    }

    .header-btn {
      padding: 6px 8px;
      font-size: 0.8rem;
    }
  }
</style>

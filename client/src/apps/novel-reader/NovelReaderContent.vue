<template>
  <div
    class="reader-content"
    :class="[`theme-${settings.theme}`, `font-${settings.fontFamily}`]"
    :style="contentStyles"
  >
    <div class="reading-area" ref="readingArea" @scroll="handleScroll">
      <div v-if="chapter" class="chapter-content">
        <h2 class="chapter-title">{{ chapter.title }}</h2>
        <div
          class="chapter-text"
          :style="textStyles"
          v-html="formattedContent"
        ></div>
      </div>

      <div v-else class="no-content">
        <p>没有可显示的内容</p>
      </div>
    </div>

    <!-- 导航按钮 -->
    <div class="navigation-controls">
      <button
        class="nav-btn prev-btn"
        @click="$emit('chapter-change', -1)"
        :disabled="!canGoPrev"
        title="上一章"
      >
        ← 上一章
      </button>

      <div class="chapter-info">
        {{ currentChapterText }}
      </div>

      <button
        class="nav-btn next-btn"
        @click="$emit('chapter-change', 1)"
        :disabled="!canGoNext"
        title="下一章"
      >
        下一章 →
      </button>
    </div>

    <!-- 进度条 -->
    <div class="progress-bar">
      <div
        class="progress-fill"
        :style="{ width: progressPercentage + '%' }"
      ></div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, nextTick, onMounted } from 'vue';

  const props = defineProps({
    book: {
      type: Object,
      required: true,
    },
    chapter: {
      type: Object,
      default: null,
    },
    settings: {
      type: Object,
      required: true,
    },
    progress: {
      type: Object,
      default: () => ({}),
    },
  });

  const emit = defineEmits(['progress-change', 'chapter-change']);

  const readingArea = ref(null);
  const scrollTimeout = ref(null);

  // 计算属性
  const contentStyles = computed(() => ({
    '--page-width': `${props.settings.pageWidth}px`,
  }));

  const textStyles = computed(() => ({
    fontSize: `${props.settings.fontSize}px`,
    lineHeight: props.settings.lineHeight,
    fontFamily: getFontFamily(props.settings.fontFamily),
  }));

  const formattedContent = computed(() => {
    if (!props.chapter?.content) return '';

    // 简单的文本格式化
    return props.chapter.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p>${line}</p>`)
      .join('');
  });

  const canGoPrev = computed(() => {
    if (!props.book?.chapters) return false;
    const currentIndex = getCurrentChapterIndex();
    return currentIndex > 0;
  });

  const canGoNext = computed(() => {
    if (!props.book?.chapters) return false;
    const currentIndex = getCurrentChapterIndex();
    return currentIndex < props.book.chapters.length - 1;
  });

  const currentChapterText = computed(() => {
    if (!props.book?.chapters) return '';
    const currentIndex = getCurrentChapterIndex();
    const total = props.book.chapters.length;
    return `${currentIndex + 1} / ${total}`;
  });

  const progressPercentage = computed(() => {
    if (!props.book?.chapters) return 0;
    const currentIndex = getCurrentChapterIndex();
    const total = props.book.chapters.length;
    return Math.round(((currentIndex + 1) / total) * 100);
  });

  // 方法
  function getCurrentChapterIndex() {
    if (!props.book?.chapters || !props.chapter) return 0;
    return (
      props.book.chapters.findIndex(ch => ch.title === props.chapter.title) || 0
    );
  }

  function getFontFamily(family) {
    const families = {
      serif: '"Times New Roman", "SimSun", serif',
      'sans-serif': '"Helvetica Neue", "Microsoft YaHei", sans-serif',
      monospace: '"Courier New", "Consolas", monospace',
    };
    return families[family] || families.serif;
  }

  function handleScroll() {
    if (scrollTimeout.value) {
      clearTimeout(scrollTimeout.value);
    }

    scrollTimeout.value = setTimeout(() => {
      if (!readingArea.value) return;

      const scrollTop = readingArea.value.scrollTop;
      const scrollHeight = readingArea.value.scrollHeight;
      const clientHeight = readingArea.value.clientHeight;

      const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

      emit('progress-change', {
        chapterIndex: getCurrentChapterIndex(),
        scrollPosition: scrollTop,
        scrollPercentage: scrollPercentage,
      });
    }, 300);
  }

  function restoreScrollPosition() {
    nextTick(() => {
      if (!readingArea.value || !props.progress[props.book.id]) return;

      const savedProgress = props.progress[props.book.id];
      if (savedProgress.scrollPosition !== undefined) {
        readingArea.value.scrollTop = savedProgress.scrollPosition;
      }
    });
  }

  // 监听章节变化，恢复滚动位置
  watch(
    () => props.chapter,
    () => {
      restoreScrollPosition();
    }
  );

  // 键盘快捷键
  function handleKeydown(event) {
    if (
      event.target.tagName === 'INPUT' ||
      event.target.tagName === 'TEXTAREA'
    ) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        if (canGoPrev.value) {
          emit('chapter-change', -1);
        }
        break;
      case 'ArrowRight':
        if (canGoNext.value) {
          emit('chapter-change', 1);
        }
        break;
      case ' ':
        event.preventDefault();
        if (readingArea.value) {
          readingArea.value.scrollTop += readingArea.value.clientHeight * 0.8;
        }
        break;
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
    restoreScrollPosition();

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      if (scrollTimeout.value) {
        clearTimeout(scrollTimeout.value);
      }
    };
  });
</script>

<style scoped>
  .reader-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
  }

  /* 主题样式 */
  .theme-light {
    background: white;
    color: #333;
  }

  .theme-dark {
    background: #1a1a1a;
    color: #e0e0e0;
  }

  .theme-sepia {
    background: #f4f1e8;
    color: #5c4b37;
  }

  .reading-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    scroll-behavior: smooth;
  }

  .chapter-content {
    max-width: var(--page-width, 800px);
    margin: 0 auto;
    padding: 0 20px;
  }

  .chapter-title {
    text-align: center;
    margin: 0 0 30px 0;
    padding: 20px 0;
    border-bottom: 2px solid currentColor;
    opacity: 0.8;
    font-size: 1.5rem;
  }

  .chapter-text {
    line-height: 1.8;
  }

  .chapter-text :deep(p) {
    margin: 0 0 1em 0;
    text-indent: 2em;
    text-align: justify;
  }

  .no-content {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    opacity: 0.6;
  }

  .navigation-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: rgba(0, 0, 0, 0.05);
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }

  .theme-dark .navigation-controls {
    background: rgba(255, 255, 255, 0.05);
    border-top-color: rgba(255, 255, 255, 0.1);
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
    color: var(--bg-color);
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

  .progress-bar {
    height: 3px;
    background: rgba(0, 0, 0, 0.1);
    position: relative;
    flex-shrink: 0;
  }

  .theme-dark .progress-bar {
    background: rgba(255, 255, 255, 0.1);
  }

  .progress-fill {
    height: 100%;
    background: #667eea;
    transition: width 0.3s ease;
  }

  /* 字体样式 */
  .font-serif .chapter-text {
    font-family: 'Times New Roman', 'SimSun', serif;
  }

  .font-sans-serif .chapter-text {
    font-family: 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
  }

  .font-monospace .chapter-text {
    font-family: 'Courier New', 'Consolas', monospace;
  }

  /* 滚动条样式 */
  .reading-area::-webkit-scrollbar {
    width: 8px;
  }

  .reading-area::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }

  .reading-area::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
  }

  .reading-area::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.5);
  }

  .theme-dark .reading-area::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }

  .theme-dark .reading-area::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
  }

  .theme-dark .reading-area::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 768px) {
    .reading-area {
      padding: 16px;
    }

    .chapter-content {
      padding: 0 12px;
    }

    .chapter-title {
      font-size: 1.3rem;
      margin-bottom: 20px;
    }

    .navigation-controls {
      padding: 10px 16px;
    }

    .nav-btn {
      padding: 6px 12px;
      font-size: 0.8rem;
    }
  }
</style>

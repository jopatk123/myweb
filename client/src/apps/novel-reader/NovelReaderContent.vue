<template>
  <div class="reader-content" :class="themeClasses" :style="contentStyles">
    <ReadingArea
      ref="readingAreaRef"
      :chapter="chapter"
      :text-styles="textStyles"
      @scroll="handleScroll"
    />

    <NavigationControls
      :can-prev="canGoPrev"
      :can-next="canGoNext"
      :chapter-text="currentChapterText"
      @prev="goPrev"
      @next="goNext"
    />

    <ProgressBar :percentage="progressPercentage" />
  </div>
</template>

<script setup>
  import { computed, ref, toRef } from 'vue';
  import ReadingArea from './components/content/ReadingArea.vue';
  import NavigationControls from './components/content/NavigationControls.vue';
  import ProgressBar from './components/content/ProgressBar.vue';
  import { useChapterNavigation } from './composables/useChapterNavigation.js';
  import { useScrollProgress } from './composables/useScrollProgress.js';
  import { FONT_FAMILY_MAP, PAGE_WIDTH_RANGE } from './constants/settings.js';

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

  const readingAreaRef = ref(null);

  const bookRef = toRef(props, 'book');
  const chapterRef = toRef(props, 'chapter');
  const progressRef = toRef(props, 'progress');

  let scrollHelpersInstance;

  const navigation = useChapterNavigation({
    bookRef,
    chapterRef,
    emit,
    getScrollableElement: () =>
      scrollHelpersInstance?.getScrollElement?.() ?? null,
  });

  scrollHelpersInstance = useScrollProgress({
    readingAreaRef,
    bookRef,
    chapterRef,
    progressRef,
    currentChapterIndex: navigation.currentChapterIndex,
    emit,
  });

  const {
    canGoPrev,
    canGoNext,
    currentChapterText,
    progressPercentage,
    goPrev,
    goNext,
  } = navigation;

  const handleScroll = () => {
    scrollHelpersInstance?.handleScroll();
  };

  const contentStyles = computed(() => ({
    '--page-width': `${clampPageWidth(props.settings.pageWidth)}px`,
  }));

  const textStyles = computed(() => ({
    fontSize: `${props.settings.fontSize}px`,
    lineHeight: props.settings.lineHeight,
    fontFamily:
      FONT_FAMILY_MAP[props.settings.fontFamily] || FONT_FAMILY_MAP.serif,
  }));

  const themeClasses = computed(() => [
    `theme-${props.settings.theme}`,
    `font-${props.settings.fontFamily}`,
  ]);

  function clampPageWidth(value) {
    if (typeof value !== 'number') return PAGE_WIDTH_RANGE.min;
    return Math.min(
      Math.max(value, PAGE_WIDTH_RANGE.min),
      PAGE_WIDTH_RANGE.max
    );
  }
</script>

<style scoped>
  .reader-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
    --bg-color: #ffffff;
  }

  .theme-light {
    background: white;
    color: #333;
    --bg-color: #ffffff;
  }

  .theme-dark {
    background: #1a1a1a;
    color: #e0e0e0;
    --bg-color: #1a1a1a;
  }

  .theme-sepia {
    background: #f4f1e8;
    color: #5c4b37;
    --bg-color: #f4f1e8;
  }

  .theme-dark :deep(.navigation-controls) {
    background: rgba(255, 255, 255, 0.05);
    border-top-color: rgba(255, 255, 255, 0.1);
  }

  .theme-dark :deep(.progress-bar) {
    background: rgba(255, 255, 255, 0.1);
  }

  .theme-dark :deep(.reading-area::-webkit-scrollbar-track) {
    background: rgba(255, 255, 255, 0.1);
  }

  .theme-dark :deep(.reading-area::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.3);
  }

  .theme-dark :deep(.reading-area::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 255, 255, 0.5);
  }
</style>

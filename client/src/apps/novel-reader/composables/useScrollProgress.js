import { computed, watch, nextTick, onBeforeUnmount } from 'vue';

export function useScrollProgress({
  readingAreaRef,
  bookRef,
  chapterRef,
  progressRef,
  currentChapterIndex,
  emit,
  throttleMs = 300,
}) {
  let timeoutId = null;

  const scrollElement = computed(() => {
    const instance = readingAreaRef.value;
    if (!instance) return null;
    if (instance.scrollElement) return instance.scrollElement;
    return instance;
  });

  function clearTimer() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function emitProgress() {
    const el = scrollElement.value;
    if (!el || !bookRef.value) return;

    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
    const denominator = Math.max(scrollHeight - clientHeight, 1);
    const scrollPercentage = scrollTop / denominator;

    emit('progress-change', {
      chapterIndex: currentChapterIndex.value,
      scrollPosition: scrollTop,
      scrollPercentage,
    });
  }

  function handleScroll() {
    clearTimer();
    timeoutId = setTimeout(() => {
      emitProgress();
    }, throttleMs);
  }

  async function restoreScrollPosition() {
    await nextTick();
    const el = scrollElement.value;
    if (!el || !bookRef.value?.id) return;

    const saved = progressRef.value?.[bookRef.value.id];
    if (!saved) return;

    if (typeof saved.scrollPosition === 'number') {
      el.scrollTop = saved.scrollPosition;
    }
  }

  function scrollByPage(multiplier = 0.8) {
    const el = scrollElement.value;
    if (!el) return;
    el.scrollTop += el.clientHeight * multiplier;
  }

  watch(
    chapterRef,
    () => {
      restoreScrollPosition();
    },
    { immediate: true }
  );

  watch(
    () => bookRef.value?.id,
    () => {
      restoreScrollPosition();
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    clearTimer();
  });

  return {
    handleScroll,
    restoreScrollPosition,
    scrollByPage,
    getScrollElement: () => scrollElement.value,
  };
}

import { computed, onMounted, onBeforeUnmount } from 'vue';

function defaultGetScrollableElement() {
  return null;
}

export function useChapterNavigation({
  bookRef,
  chapterRef,
  emit,
  enableKeyboard = true,
  getScrollableElement = defaultGetScrollableElement,
}) {
  const chapters = computed(() => bookRef.value?.chapters ?? []);

  const currentChapterIndex = computed(() => {
    const chapter = chapterRef.value;
    if (!chapter || !chapters.value.length) return 0;
    const matchById = chapters.value.findIndex(
      ch => ch?.id && ch.id === chapter.id
    );
    if (matchById >= 0) return matchById;
    const matchByTitle = chapters.value.findIndex(
      ch => ch?.title === chapter.title
    );
    return matchByTitle >= 0 ? matchByTitle : 0;
  });

  const totalChapters = computed(() => chapters.value.length);

  const canGoPrev = computed(() => currentChapterIndex.value > 0);
  const canGoNext = computed(
    () =>
      totalChapters.value > 0 &&
      currentChapterIndex.value < totalChapters.value - 1
  );

  const currentChapterText = computed(() => {
    if (!totalChapters.value) return '';
    return `${currentChapterIndex.value + 1} / ${totalChapters.value}`;
  });

  const progressPercentage = computed(() => {
    if (!totalChapters.value) return 0;
    return Math.round(
      ((currentChapterIndex.value + 1) / totalChapters.value) * 100
    );
  });

  function changeChapter(direction) {
    emit('chapter-change', direction);
  }

  function goPrev() {
    if (canGoPrev.value) {
      changeChapter(-1);
    }
  }

  function goNext() {
    if (canGoNext.value) {
      changeChapter(1);
    }
  }

  function handleKeydown(event) {
    if (!enableKeyboard) return;

    const target = event.target;
    if (target && typeof target.tagName === 'string') {
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        return;
      }
    }

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        goPrev();
        break;
      case 'ArrowRight':
        event.preventDefault();
        goNext();
        break;
      case ' ': {
        const el = getScrollableElement();
        if (el) {
          event.preventDefault();
          el.scrollTop += el.clientHeight * 0.8;
        }
        break;
      }
    }
  }

  if (enableKeyboard && typeof window !== 'undefined') {
    onMounted(() => {
      document.addEventListener('keydown', handleKeydown);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleKeydown);
    });
  }

  return {
    currentChapterIndex,
    canGoPrev,
    canGoNext,
    currentChapterText,
    progressPercentage,
    goPrev,
    goNext,
  };
}

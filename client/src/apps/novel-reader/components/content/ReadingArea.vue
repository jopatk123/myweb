<template>
  <div
    class="reading-area"
    ref="scrollElement"
    @scroll="event => emit('scroll', event)"
  >
    <div v-if="chapter" class="chapter-content">
      <h2 class="chapter-title">{{ chapter.title }}</h2>
      <div class="chapter-text" :style="textStyles" v-html="formattedContent" />
    </div>

    <div v-else class="no-content">
      <p>没有可显示的内容</p>
    </div>
  </div>
</template>

<script setup>
  import { computed, ref } from 'vue';
  import DOMPurify from 'dompurify';

  const props = defineProps({
    chapter: {
      type: Object,
      default: null,
    },
    textStyles: {
      type: Object,
      default: () => ({}),
    },
  });

  const emit = defineEmits(['scroll']);

  const scrollElement = ref(null);

  const formattedContent = computed(() => {
    if (!props.chapter?.content) return '';

    const html = props.chapter.content
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => `<p>${line}</p>`)
      .join('');

    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  });

  defineExpose({ scrollElement });
</script>

<style scoped>
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
  }
</style>

<template>
  <div class="message-text-block">
    <div
      ref="textRef"
      class="message-text"
      :class="{ 'is-clamped': isClamped }"
      :style="clampStyle"
    >
      {{ content }}
    </div>
    <button
      v-if="showToggle"
      type="button"
      class="toggle-btn"
      :aria-expanded="expanded"
      @click="toggleExpanded"
    >
      {{ expanded ? '收起' : '展开' }}
    </button>
  </div>
</template>

<script setup>
  import {
    ref,
    computed,
    watch,
    onMounted,
    onBeforeUnmount,
    nextTick,
  } from 'vue';
  import { MESSAGE_TEXT_COLLAPSED_LINES } from '@shared/constants.js';
  import {
    getCollapsedMaxHeight,
    measureTextOverflow,
  } from '@/utils/messageTextOverflow.js';

  const props = defineProps({
    content: { type: String, required: true },
    /** 搜索等场景下强制展示全文，不显示折叠控件 */
    forceExpanded: { type: Boolean, default: false },
  });

  const textRef = ref(null);
  const expanded = ref(false);
  const hasOverflow = ref(false);
  let resizeObserver = null;

  const isClamped = computed(
    () => hasOverflow.value && !expanded.value && !props.forceExpanded
  );

  const showToggle = computed(() => hasOverflow.value && !props.forceExpanded);

  const clampStyle = computed(() => {
    if (!isClamped.value) return undefined;
    return {
      maxHeight: `${getCollapsedMaxHeight(MESSAGE_TEXT_COLLAPSED_LINES)}px`,
    };
  });

  const measureOverflow = async () => {
    await nextTick();
    const el = textRef.value;
    if (!el || props.forceExpanded) {
      hasOverflow.value = false;
      return;
    }

    hasOverflow.value = measureTextOverflow(el, MESSAGE_TEXT_COLLAPSED_LINES);
  };

  const toggleExpanded = () => {
    expanded.value = !expanded.value;
    measureOverflow();
  };

  const setupResizeObserver = () => {
    if (typeof ResizeObserver === 'undefined') return;
    resizeObserver = new ResizeObserver(() => {
      measureOverflow();
    });
    if (textRef.value) {
      resizeObserver.observe(textRef.value);
    }
  };

  watch(
    () => [props.content, props.forceExpanded],
    () => {
      if (props.forceExpanded) {
        expanded.value = false;
      }
      measureOverflow();
    }
  );

  onMounted(() => {
    measureOverflow();
    setupResizeObserver();
  });

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  });
</script>

<style scoped>
  .message-text-block {
    max-width: 100%;
  }

  .message-text {
    display: block;
    max-width: 100%;
    color: #212529;
    font-size: 13px;
    line-height: 1.45;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    background-color: #f1f3f5;
    padding: 5px 10px;
    border-radius: 0 10px 10px 10px;
  }

  .message-text.is-clamped {
    overflow: hidden;
  }

  .toggle-btn {
    margin-top: 2px;
    padding: 0;
    border: none;
    background: transparent;
    color: #1864ab;
    font-size: 12px;
    cursor: pointer;
    line-height: 1.4;
  }

  .toggle-btn:hover {
    text-decoration: underline;
  }
</style>

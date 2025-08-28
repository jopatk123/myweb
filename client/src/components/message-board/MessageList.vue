<template>
  <div class="message-list" ref="internalListRef" :ref="listRef">
    <div v-if="loading && !hasMessages" class="loading">加载中...</div>

    <div v-if="error" class="error">
      {{ error }}
      <button @click="$emit('retry')" class="retry-btn">重试</button>
    </div>

    <div v-if="!loading && !hasMessages" class="empty">
      还没有留言，来发第一条吧！
    </div>

    <div v-for="message in messages" :key="message.id" class="message-item">
      <div
        class="message-avatar"
        :style="{ backgroundColor: message.authorColor }"
      >
        {{ message.authorName.charAt(0).toUpperCase() }}
      </div>
      <div class="message-content">
        <div class="message-header">
          <span class="author-name">{{ message.authorName }}</span>
          <span class="message-time">{{ formatTime(message.createdAt) }}</span>
        </div>
        <div class="message-text">{{ message.content }}</div>
        <ImagePreview
          v-if="message.images && message.images.length > 0"
          :images="message.images"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
  import ImagePreview from './ImagePreview.vue';

  const props = defineProps({
    messages: { type: Array, required: true },
    loading: { type: Boolean, required: true },
    hasMessages: { type: Boolean, required: true },
    error: { type: [String, Object], default: '' },
    listRef: { type: [Function, Object], default: null },
    formatTime: { type: Function, required: true },
  });

  const emit = defineEmits(['retry']);

  const internalListRef = ref(null);
  let isUserScrolling = false;
  let scrollTimeout = null;

  const getListElement = () => {
    return (
      internalListRef.value ||
      (typeof props.listRef === 'function' ? props.listRef() : props.listRef)
    );
  };

  const scrollToBottom = async (behavior = 'auto') => {
    await nextTick();
    const el = getListElement();
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } catch (e) {
      el.scrollTop = el.scrollHeight;
    }
  };

  const onUserScroll = () => {
    isUserScrolling = true;
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isUserScrolling = false;
    }, 1000);
  };

  onMounted(() => {
    const el = getListElement();
    if (!el) return;
    el.addEventListener('wheel', onUserScroll, { passive: true });
    el.addEventListener('touchstart', onUserScroll, { passive: true });
    // 初始时滚动到底部
    scrollToBottom('auto');
  });

  onBeforeUnmount(() => {
    const el = getListElement();
    if (el) {
      el.removeEventListener('wheel', onUserScroll);
      el.removeEventListener('touchstart', onUserScroll);
    }
    if (scrollTimeout) clearTimeout(scrollTimeout);
  });

  // 当 messages 变化时，如果用户没有在手动滚动，则滚动到底部
  watch(
    () => props.messages.length,
    (newLen, oldLen) => {
      if (newLen === oldLen) return;
      if (!isUserScrolling) {
        // 使用平滑滚动以在发送/接收时更自然
        scrollToBottom('smooth');
      }
    }
  );
</script>

<style scoped>
  .message-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .loading,
  .error,
  .empty {
    text-align: center;
    color: #6c757d;
    font-size: 14px;
    padding: 20px;
  }

  .error {
    color: #dc3545;
  }

  .retry-btn {
    margin-left: 8px;
    padding: 4px 8px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .message-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .message-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14px;
    flex-shrink: 0;
  }

  .message-content {
    flex: 1;
    min-width: 0;
  }

  .message-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .author-name {
    font-weight: 500;
    color: #333;
    font-size: 14px;
  }

  .message-time {
    font-size: 12px;
    color: #6c757d;
  }

  .message-text {
    color: #495057;
    font-size: 14px;
    line-height: 1.4;
    word-wrap: break-word;
    white-space: pre-wrap;
  }

  /* 滚动条样式 */
  .message-list::-webkit-scrollbar {
    width: 6px;
  }

  .message-list::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .message-list::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  .message-list::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>

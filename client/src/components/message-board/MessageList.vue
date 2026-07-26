<template>
  <div class="message-list" ref="internalListRef" :ref="listRef">
    <div v-if="loading && !hasMessages" class="loading">加载中...</div>

    <div v-if="error" class="error">
      {{ error }}
      <button @click="$emit('retry')" class="retry-btn">重试</button>
    </div>

    <div v-if="!loading && !hasMessages" class="empty">
      <span v-if="isSearching"> 没有找到与“{{ searchQuery }}”相关的留言 </span>
      <span v-else>还没有留言，来发第一条吧！</span>
    </div>

    <!-- 加载更多历史留言：放在列表顶部，让用户向上滚动时能看到入口 -->
    <div
      v-if="canLoadMore && hasMessages && !isSearching"
      class="load-more-bar"
    >
      <button
        type="button"
        class="load-more-btn"
        :disabled="loadingMore"
        @click="$emit('request-load-more')"
      >
        {{ loadingMore ? '加载中...' : '加载更多历史留言' }}
      </button>
      <span class="pagination-meta">
        第 {{ pagination.page }} / {{ pagination.totalPages }} 页 · 共
        {{ pagination.total }} 条
      </span>
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
          <div class="message-meta">
            <span class="author-name">{{ message.authorName }}</span>
            <span class="message-time">{{
              formatTime(message.createdAt)
            }}</span>
          </div>
          <div class="message-actions">
            <button
              type="button"
              class="copy-btn"
              :disabled="!canCopyMessage(message)"
              @click="copyMessageContent(message)"
            >
              {{ copiedMessageId === message.id ? '已复制' : '复制' }}
            </button>
            <button
              type="button"
              class="delete-btn"
              :disabled="deletingMessageId === message.id"
              @click="$emit('request-delete', message)"
            >
              {{ deletingMessageId === message.id ? '删除中...' : '删除' }}
            </button>
          </div>
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
  import {
    ref,
    computed,
    onMounted,
    onBeforeUnmount,
    watch,
    nextTick,
  } from 'vue';
  import { useGlobalToast } from '@/composables/useGlobalToast.js';
  import ImagePreview from './ImagePreview.vue';

  const props = defineProps({
    messages: { type: Array, required: true },
    loading: { type: Boolean, required: true },
    loadingMore: { type: Boolean, default: false },
    hasMessages: { type: Boolean, required: true },
    error: { type: [String, Object], default: '' },
    listRef: { type: [Function, Object], default: null },
    formatTime: { type: Function, required: true },
    isSearching: { type: Boolean, default: false },
    searchQuery: { type: String, default: '' },
    deletingMessageId: { type: Number, default: null },
    canLoadMore: { type: Boolean, default: false },
    pagination: {
      type: Object,
      default: () => ({ page: 1, totalPages: 0, total: 0 }),
    },
  });

  defineEmits(['retry', 'request-delete', 'request-load-more']);

  const internalListRef = ref(null);
  const copiedMessageId = ref(null);
  const { showError } = useGlobalToast();
  let isUserScrolling = false;
  let scrollTimeout = null;
  let copyFeedbackTimeout = null;
  // 加载更多期间不触发自动滚动到底部
  let suppressAutoScroll = false;

  // 用于判断是否为"新增消息"场景（而非加载更多 / 删除）
  const lastMessageId = computed(
    () => props.messages[props.messages.length - 1]?.id
  );
  const messagesLength = computed(() => props.messages.length);

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
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  };

  const canCopyMessage = message => {
    return Boolean((message.content || '').trim());
  };

  const fallbackCopyText = text => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);
    return succeeded;
  };

  const copyToClipboard = async text => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    if (!fallbackCopyText(text)) {
      throw new Error('复制失败');
    }
  };

  const copyMessageContent = async message => {
    const text = message.content || '';
    if (!text.trim()) return;

    try {
      await copyToClipboard(text);
      copiedMessageId.value = message.id;
      if (copyFeedbackTimeout) clearTimeout(copyFeedbackTimeout);
      copyFeedbackTimeout = setTimeout(() => {
        if (copiedMessageId.value === message.id) {
          copiedMessageId.value = null;
        }
      }, 1200);
    } catch (error) {
      console.error('复制留言失败:', error);
      showError('复制失败，请手动选择文本后复制');
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
    if (copyFeedbackTimeout) clearTimeout(copyFeedbackTimeout);
  });

  // 加载更多开始时设置抑制标志，结束时清除
  watch(
    () => props.loadingMore,
    isLoadingMore => {
      suppressAutoScroll = isLoadingMore;
    }
  );

  // 只在"新增消息"时滚动到底部：
  // - 长度增加且 lastId 变化（新增一条最新消息）
  // - 加载更多时长度增加但 lastId 不变（suppressAutoScroll 也兜底）
  // - 删除消息时长度减少，不滚动
  watch([messagesLength, lastMessageId], ([newLen, newId], [oldLen, oldId]) => {
    if (suppressAutoScroll || props.isSearching) return;
    if (newLen <= (oldLen ?? 0)) return;
    if (newId === oldId) return;
    if (isUserScrolling) return;
    scrollToBottom('smooth');
  });
</script>

<style scoped>
  .message-list {
    flex: 1;
    overflow-y: auto;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    scroll-behavior: smooth;
  }

  .loading,
  .error,
  .empty {
    text-align: center;
    color: #868e96;
    font-size: 13px;
    padding: 24px;
  }

  .error {
    color: #fa5252;
  }

  .retry-btn {
    margin-left: 10px;
    padding: 6px 12px;
    background: #fa5252;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    transition: background-color 0.2s;
  }

  .retry-btn:hover {
    background: #e03131;
  }

  .load-more-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px 0 4px;
    border-bottom: 1px dashed #e9ecef;
    margin-bottom: 4px;
  }

  .load-more-btn {
    padding: 6px 16px;
    background: #edf8ff;
    color: #1864ab;
    border: 1px solid #d0ebff;
    border-radius: 999px;
    cursor: pointer;
    font-size: 12px;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  .load-more-btn:hover:not(:disabled) {
    background: #d0ebff;
    border-color: #74c0fc;
  }

  .load-more-btn:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  .pagination-meta {
    font-size: 11px;
    color: #adb5bd;
  }

  .message-item {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .message-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 13px;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .message-content {
    flex: 1;
    min-width: 0;
    max-width: 90%;
  }

  .message-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 4px;
  }

  .message-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .message-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .author-name {
    font-weight: 600;
    color: #343a40;
    font-size: 13px;
  }

  .message-time {
    font-size: 11px;
    color: #adb5bd;
  }

  .delete-btn {
    flex-shrink: 0;
    border: 1px solid #ffd8d8;
    background: #fff5f5;
    color: #c92a2a;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      color 0.2s;
  }

  .delete-btn:hover:not(:disabled) {
    background: #ffe3e3;
    border-color: #ffa8a8;
  }

  .delete-btn:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  .copy-btn {
    flex-shrink: 0;
    border: 1px solid #d0ebff;
    background: #edf8ff;
    color: #1864ab;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      color 0.2s;
  }

  .copy-btn:hover:not(:disabled) {
    background: #d0ebff;
    border-color: #74c0fc;
  }

  .copy-btn:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .message-text {
    display: inline-block;
    color: #212529;
    font-size: 14px;
    line-height: 1.5;
    word-wrap: break-word;
    white-space: pre-wrap;
    background-color: #f1f3f5;
    padding: 8px 14px;
    border-radius: 0 14px 14px 14px;
    margin-top: 2px;
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

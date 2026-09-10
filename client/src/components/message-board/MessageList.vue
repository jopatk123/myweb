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
        {{ loadingMore ? '加载中...' : '加载更早留言' }}
      </button>
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
        <MessageText
          v-if="message.content"
          :content="message.content"
          :force-expanded="isSearching"
        />
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
  import MessageText from './MessageText.vue';

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
    sendSuccessToken: { type: Number, default: 0 },
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
  // 追踪等待滚动的图片数量
  let pendingImages = 0;

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

  const isNearBottom = () => {
    const el = getListElement();
    if (!el) return false;
    const threshold = 100;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  };

  const scheduleScrollAfterImages = () => {
    // 查找最后一条消息中的所有图片
    const el = getListElement();
    if (!el) return;

    const images = el.querySelectorAll('.message-item:last-child img');
    if (images.length === 0) return;

    pendingImages = images.length;
    let scrolled = false;

    const checkAndScroll = () => {
      pendingImages--;
      if (pendingImages <= 0 && !scrolled) {
        scrolled = true;
        // 使用 requestAnimationFrame 确保在重绘后滚动
        requestAnimationFrame(() => {
          scrollToBottom('smooth');
        });
      }
    };

    images.forEach(img => {
      if (img.complete) {
        checkAndScroll();
      } else {
        img.addEventListener('load', checkAndScroll, { once: true });
        img.addEventListener('error', checkAndScroll, { once: true });
      }
    });
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
  // - WebSocket 接收新消息时，只在用户已在底部附近时才滚动
  watch([messagesLength, lastMessageId], ([newLen, newId], [oldLen, oldId]) => {
    if (suppressAutoScroll || props.isSearching) return;
    if (newLen <= (oldLen ?? 0)) return;
    if (newId === oldId) return;
    if (isUserScrolling) return;
    // 只在用户已在底部附近时才自动滚动（避免打断用户阅读历史消息）
    if (!isNearBottom()) return;
    scrollToBottom('smooth');
  });

  // 用户主动发送消息时，强制滚动到底部
  watch(
    () => props.sendSuccessToken,
    (newToken, oldToken) => {
      if (newToken > 0 && newToken !== oldToken) {
        // 使用 nextTick 确保 DOM 已更新
        nextTick(() => {
          scrollToBottom('smooth');
          // 如果新消息包含图片，等待图片加载后再次滚动
          scheduleScrollAfterImages();
        });
      }
    }
  );
</script>

<style scoped>
  .message-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
    scroll-behavior: smooth;
  }

  .loading,
  .error,
  .empty {
    text-align: center;
    color: #868e96;
    font-size: 13px;
    padding: 20px 12px;
  }

  .error {
    color: #fa5252;
  }

  .retry-btn {
    margin-left: 8px;
    padding: 4px 10px;
    background: #fa5252;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
  }

  .retry-btn:hover {
    background: #e03131;
  }

  .load-more-bar {
    display: flex;
    justify-content: center;
    padding: 2px 0 4px;
  }

  .load-more-btn {
    padding: 3px 12px;
    background: transparent;
    color: #1864ab;
    border: none;
    cursor: pointer;
    font-size: 12px;
  }

  .load-more-btn:hover:not(:disabled) {
    text-decoration: underline;
  }

  .load-more-btn:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  .message-item {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .message-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 12px;
    flex-shrink: 0;
  }

  .message-content {
    flex: 1;
    min-width: 0;
    max-width: 92%;
  }

  .message-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 20px;
    margin-bottom: 2px;
  }

  .message-meta {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }

  .message-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s;
  }

  .message-item:hover .message-actions,
  .message-item:focus-within .message-actions {
    opacity: 1;
    pointer-events: auto;
  }

  @media (hover: none) {
    .message-actions {
      opacity: 1;
      pointer-events: auto;
    }
  }

  .author-name {
    font-weight: 600;
    color: #343a40;
    font-size: 12px;
  }

  .message-time {
    font-size: 11px;
    color: #adb5bd;
  }

  .delete-btn,
  .copy-btn {
    flex-shrink: 0;
    border: none;
    background: transparent;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 11px;
    cursor: pointer;
  }

  .copy-btn {
    color: #1864ab;
  }

  .copy-btn:hover:not(:disabled) {
    background: #edf8ff;
  }

  .copy-btn:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .delete-btn {
    color: #c92a2a;
  }

  .delete-btn:hover:not(:disabled) {
    background: #fff5f5;
  }

  .delete-btn:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  .message-list::-webkit-scrollbar {
    width: 5px;
  }

  .message-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .message-list::-webkit-scrollbar-thumb {
    background: #ced4da;
    border-radius: 3px;
  }

  .message-list::-webkit-scrollbar-thumb:hover {
    background: #adb5bd;
  }
</style>

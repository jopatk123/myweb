<template>
  <div class="message-board">
    <MessageBoardHeader
      :is-connected="isConnected"
      :search-query="searchQuery"
      :search-count="pagination.total"
      :loading="loading"
      :is-searching="isSearching"
      @update:search-query="setSearchQuery"
      @toggle-settings="showSettings = !showSettings"
      @close="$emit('close')"
    />

    <MessageBoardSettings
      v-if="showSettings"
      v-model="tempSettings"
      :generate-random-color="generateRandomColor"
      @request-clear="showClearConfirm = true"
      @save="saveSettings"
      @cancel="cancelSettings"
    />

    <MessageList
      :messages="messages"
      :loading="loading"
      :has-messages="hasMessages"
      :error="error"
      :is-searching="isSearching"
      :search-query="searchQuery"
      :list-ref="messageListRef"
      :deleting-message-id="deletingMessageId"
      :format-time="formatTime"
      @request-delete="promptDeleteMessage"
      @retry="fetchMessages()"
    />

    <MessageInput
      :sending="sending"
      :send-success-token="sendSuccessToken"
      @send="onSend"
    />

    <ConfirmDialog
      :visible="showClearConfirm"
      title="⚠️ 确认清除留言板"
      :lines="[
        '此操作将永久删除所有留言和图片文件，无法恢复。',
        '确定要继续吗？',
      ]"
      confirm-text="确认清除"
      @cancel="showClearConfirm = false"
      @confirm="handleClearMessages"
    />

    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="🗑️ 确认删除留言"
      :lines="deleteDialogLines"
      confirm-text="确认删除"
      @cancel="resetDeleteState"
      @confirm="handleDeleteMessage"
    />
  </div>
</template>

<script setup>
  import { ref, nextTick, watch, computed } from 'vue';
  import { useMessageBoard } from '@/composables/useMessageBoard.js';
  import MessageBoardHeader from './MessageBoardHeader.vue';
  import MessageBoardSettings from './MessageBoardSettings.vue';
  import MessageList from './MessageList.vue';
  import MessageInput from './MessageInput.vue';
  import ConfirmDialog from './ConfirmDialog.vue';

  // 组件事件
  defineEmits(['close']);

  // 使用留言板功能
  const {
    messages,
    loading,
    sending,
    error,
    userSettings,
    pagination,
    isConnected,
    searchQuery,
    isSearching,
    hasMessages,
    fetchMessages,
    sendMessage,
    uploadImages,
    deleteMessage,
    clearAllMessages,
    updateUserSettings,
    formatTime,
    generateRandomColor,
    setSearchQuery,
  } = useMessageBoard();

  // 本地状态
  const showSettings = ref(false);
  const messageListRef = ref(null);
  const showClearConfirm = ref(false);
  const showDeleteConfirm = ref(false);
  const pendingDeleteMessage = ref(null);
  const deletingMessageId = ref(null);
  const sendSuccessToken = ref(0);

  // 临时设置（用于编辑）
  // 临时设置用于编辑；用 userSettings 的当前值初始化，避免硬编码默认值
  const tempSettings = ref({
    nickname: userSettings.nickname || '',
    avatarColor: userSettings.avatarColor || '',
    autoOpenEnabled: Boolean(userSettings.autoOpenEnabled),
  });

  // 子组件发送回调
  const onSend = async ({ text, files }) => {
    try {
      let uploadedImages = null;
      let imageType = null;
      if (files && files.length > 0) {
        const uploadResult = await uploadImages(files);
        uploadedImages = uploadResult;
        imageType = 'upload';
      }
      await sendMessage(text, uploadedImages, imageType);
      sendSuccessToken.value++;
      nextTick(() => {
        scrollToBottom();
      });
    } catch {
      // 错误已在组合式函数中处理
    }
  };

  const deleteDialogLines = computed(() => {
    if (!pendingDeleteMessage.value) {
      return ['此操作无法恢复。'];
    }

    const content = (pendingDeleteMessage.value.content || '').trim();
    const preview = content
      ? `“${content.slice(0, 40)}${content.length > 40 ? '...' : ''}”`
      : '这条仅包含图片的留言';

    return [
      `将删除 ${pendingDeleteMessage.value.authorName} 的留言 ${preview}。`,
      '此操作无法恢复。',
    ];
  });

  const promptDeleteMessage = message => {
    pendingDeleteMessage.value = message;
    showDeleteConfirm.value = true;
  };

  const resetDeleteState = () => {
    showDeleteConfirm.value = false;
    pendingDeleteMessage.value = null;
  };

  const handleDeleteMessage = async () => {
    if (!pendingDeleteMessage.value) return;

    deletingMessageId.value = pendingDeleteMessage.value.id;
    try {
      await deleteMessage(pendingDeleteMessage.value.id);
      resetDeleteState();
    } catch (err) {
      console.error('删除留言失败:', err);
      alert('删除留言失败: ' + err.message);
    } finally {
      deletingMessageId.value = null;
    }
  };

  // 处理清除留言板
  const handleClearMessages = async () => {
    try {
      const result = await clearAllMessages();
      showClearConfirm.value = false;
      showSettings.value = false;

      // 显示清除成功提示
      alert(
        `留言板已清空！\n删除了 ${result.deletedMessages} 条留言和 ${result.deletedImages} 张图片`
      );
    } catch (err) {
      console.error('清除留言板失败:', err);
      alert('清除留言板失败: ' + err.message);
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  };

  // 保存设置
  const saveSettings = async () => {
    try {
      await updateUserSettings(tempSettings.value);
      showSettings.value = false;
    } catch {
      // 错误已在组合式函数中处理
    }
  };

  // 取消设置
  const cancelSettings = () => {
    tempSettings.value = {
      nickname: userSettings.nickname,
      avatarColor: userSettings.avatarColor,
      autoOpenEnabled: Boolean(userSettings.autoOpenEnabled),
    };
    showSettings.value = false;
  };

  // 监听用户设置变化，同步到临时设置
  watch(
    userSettings,
    newSettings => {
      tempSettings.value = {
        nickname: newSettings.nickname,
        avatarColor: newSettings.avatarColor,
        autoOpenEnabled: Boolean(newSettings.autoOpenEnabled),
      };
    },
    { immediate: true }
  );

  // 监听新消息，自动滚动到底部
  watch(
    messages,
    () => {
      if (isSearching.value) return;
      nextTick(() => {
        scrollToBottom();
      });
    },
    { deep: true }
  );
</script>

<style scoped>
  .message-board {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    border-radius: 8px;
    overflow: hidden;
  }
</style>

<template>
  <div class="message-board">
    <MessageBoardHeader
      :is-connected="isConnected"
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
      :list-ref="messageListRef"
      :format-time="formatTime"
      @retry="fetchMessages()"
    />

    <MessageInput
      :sending="sending"
      :send-success-token="sendSuccessToken"
      @send="onSend"
    />

    <ConfirmDialog
      :visible="showClearConfirm"
      @cancel="showClearConfirm = false"
      @confirm="handleClearMessages"
    />
  </div>
</template>

<script setup>
  import { ref, nextTick, watch } from 'vue';
  import { useMessageBoard } from '@/composables/useMessageBoard.js';
  import MessageBoardHeader from './MessageBoardHeader.vue';
  import MessageBoardSettings from './MessageBoardSettings.vue';
  import MessageList from './MessageList.vue';
  import MessageInput from './MessageInput.vue';
  import ConfirmDialog from './ConfirmDialog.vue';

  // 组件事件
  const emit = defineEmits(['close']);

  // 使用留言板功能
  const {
    messages,
    loading,
    sending,
    error,
    userSettings,
    isConnected,
    hasMessages,
    fetchMessages,
    sendMessage,
    uploadImages,
    clearAllMessages,
    updateUserSettings,
    formatTime,
    generateRandomColor,
  } = useMessageBoard();

  // 本地状态
  const showSettings = ref(false);
  const messageListRef = ref(null);
  const showClearConfirm = ref(false);
  const sendSuccessToken = ref(0);

  // 临时设置（用于编辑）
  const tempSettings = ref({
    nickname: '',
    avatarColor: '',
    autoOpenEnabled: true,
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
    } catch (err) {
      // 错误已在组合式函数中处理
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
    } catch (err) {
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

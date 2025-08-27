<template>
  <div class="message-board">
    <!-- 头部 -->
    <div class="message-board-header">
      <div class="header-left">
        <h3>💬 留言板</h3>
        <span class="online-status" :class="{ connected: isConnected }">
          {{ isConnected ? '已连接' : '连接中...' }}
        </span>
      </div>
      <div class="header-right">
        <button @click="showSettings = !showSettings" class="settings-btn" title="设置">
          ⚙️
        </button>
        <button @click="$emit('close')" class="close-btn" title="关闭">
          ✕
        </button>
      </div>
    </div>

    <!-- 设置面板 -->
    <div v-if="showSettings" class="settings-panel">
      <div class="setting-item">
        <label>昵称：</label>
        <input 
          v-model="tempSettings.nickname" 
          type="text" 
          placeholder="输入昵称"
          maxlength="50"
        />
      </div>
      <div class="setting-item">
        <label>头像颜色：</label>
        <div class="color-picker">
          <input 
            v-model="tempSettings.avatarColor" 
            type="color"
          />
          <button @click="tempSettings.avatarColor = generateRandomColor()" class="random-color-btn">
            🎲
          </button>
        </div>
      </div>
      <div class="setting-item">
        <label>
          <input 
            v-model="tempSettings.autoOpenEnabled" 
            type="checkbox"
          />
          自动打开新消息
        </label>
      </div>
      <div class="setting-actions">
        <button @click="saveSettings" class="save-btn">保存</button>
        <button @click="cancelSettings" class="cancel-btn">取消</button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef">
      <div v-if="loading && !hasMessages" class="loading">
        加载中...
      </div>
      
      <div v-if="error" class="error">
        {{ error }}
        <button @click="fetchMessages()" class="retry-btn">重试</button>
      </div>

      <div v-if="!loading && !hasMessages" class="empty">
        还没有留言，来发第一条吧！
      </div>

      <div 
        v-for="message in messages" 
        :key="message.id"
        class="message-item"
      >
        <div class="message-avatar" :style="{ backgroundColor: message.authorColor }">
          {{ message.authorName.charAt(0).toUpperCase() }}
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="author-name">{{ message.authorName }}</span>
            <span class="message-time">{{ formatTime(message.createdAt) }}</span>
          </div>
          <div class="message-text">{{ message.content }}</div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="message-input">
      <div class="input-container">
        <textarea
          v-model="inputMessage"
          placeholder="输入留言内容..."
          rows="2"
          maxlength="1000"
          @keydown.enter.exact.prevent="handleSend"
          @keydown.enter.shift.exact="handleNewLine"
          :disabled="sending"
        ></textarea>
        <div class="input-actions">
          <span class="char-count">{{ inputMessage.length }}/1000</span>
          <button 
            @click="handleSend" 
            :disabled="!canSend"
            class="send-btn"
          >
            {{ sending ? '发送中...' : '发送' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import { useMessageBoard } from '@/composables/useMessageBoard.js';

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
  updateUserSettings,
  formatTime,
  generateRandomColor,
} = useMessageBoard();

// 本地状态
const inputMessage = ref('');
const showSettings = ref(false);
const messageListRef = ref(null);

// 临时设置（用于编辑）
const tempSettings = ref({
  nickname: '',
  avatarColor: '',
  autoOpenEnabled: true,
});

// 计算属性
const canSend = computed(() => {
  return inputMessage.value.trim().length > 0 && !sending.value;
});

// 处理发送
const handleSend = async () => {
  if (!canSend.value) return;

  try {
    await sendMessage(inputMessage.value);
    inputMessage.value = '';
    
    // 滚动到底部
    nextTick(() => {
      scrollToBottom();
    });
  } catch (err) {
    // 错误已在组合式函数中处理
  }
};

// 处理换行
const handleNewLine = () => {
  inputMessage.value += '\n';
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
    autoOpenEnabled: userSettings.autoOpenEnabled,
  };
  showSettings.value = false;
};

// 监听用户设置变化，同步到临时设置
watch(userSettings, (newSettings) => {
  tempSettings.value = {
    nickname: newSettings.nickname,
    avatarColor: newSettings.avatarColor,
    autoOpenEnabled: newSettings.autoOpenEnabled,
  };
}, { immediate: true });

// 监听新消息，自动滚动到底部
watch(messages, () => {
  nextTick(() => {
    scrollToBottom();
  });
}, { deep: true });
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

.message-board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.online-status {
  font-size: 12px;
  color: #6c757d;
  padding: 2px 8px;
  border-radius: 12px;
  background: #e9ecef;
}

.online-status.connected {
  color: #28a745;
  background: #d4edda;
}

.header-right {
  display: flex;
  gap: 8px;
}

.settings-btn,
.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.settings-btn:hover,
.close-btn:hover {
  background: #e9ecef;
}

.settings-panel {
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.setting-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
}

.setting-item label {
  font-size: 14px;
  color: #495057;
  min-width: 80px;
}

.setting-item input[type="text"] {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-picker input[type="color"] {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.random-color-btn {
  background: none;
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
}

.setting-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.save-btn,
.cancel-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.save-btn {
  background: #007bff;
  color: white;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

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

.message-input {
  padding: 16px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-container textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
}

.input-container textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.char-count {
  font-size: 12px;
  color: #6c757d;
}

.send-btn {
  padding: 6px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #0056b3;
}

.send-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
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
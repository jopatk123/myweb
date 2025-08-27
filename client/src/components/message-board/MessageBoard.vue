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
        <small class="setting-hint">当有新消息时自动打开留言板</small>
      </div>
      <div class="setting-actions">
        <button @click="saveSettings" class="save-btn">保存</button>
        <button @click="cancelSettings" class="cancel-btn">取消</button>
      </div>
      
      <!-- 危险操作区域 -->
      <div class="danger-zone">
        <h4>⚠️ 危险操作</h4>
        <div class="danger-action">
          <p>清除留言板将删除所有留言和图片，此操作不可恢复。</p>
          <button @click="showClearConfirm = true" class="clear-btn">
            🗑️ 清除留言板
          </button>
        </div>
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
          <!-- 图片预览 -->
          <ImagePreview 
            v-if="message.images && message.images.length > 0" 
            :images="message.images" 
          />
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="message-input">
      <div class="input-container">
        <!-- 图片预览区域 -->
        <div v-if="selectedImages.length > 0" class="selected-images">
          <div 
            v-for="(image, index) in selectedImages" 
            :key="index"
            class="selected-image-item"
          >
            <img :src="image.url" :alt="image.name" />
            <button @click="removeImage(index)" class="remove-image-btn">✕</button>
            <!-- 压缩信息提示 -->
            <div v-if="image.compressed" class="compression-info">
              <span class="compression-badge">已压缩</span>
              <span class="size-info">{{ formatFileSize(image.originalSize) }} → {{ formatFileSize(image.compressedSize) }}</span>
            </div>
          </div>
        </div>
        
        <textarea
          v-model="inputMessage"
          placeholder="输入留言内容... (Ctrl+V 粘贴图片)"
          rows="2"
          maxlength="1000"
          @keydown.enter.exact.prevent="handleSend"
          @keydown.enter.shift.exact="handleNewLine"
          @paste="handlePaste"
          :disabled="sending"
        ></textarea>
        <div class="input-actions">
          <div class="input-left">
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="image/*"
              @change="handleFileSelect"
              style="display: none"
            />
            <button 
              @click="$refs.fileInput.click()" 
              class="add-image-btn"
              title="添加图片"
            >
              📷
            </button>
            <span class="char-count">{{ inputMessage.length }}/1000</span>
          </div>
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

    <!-- 清除确认对话框 -->
    <div v-if="showClearConfirm" class="confirm-dialog-overlay" @click="showClearConfirm = false">
      <div class="confirm-dialog" @click.stop>
        <h3>⚠️ 确认清除留言板</h3>
        <p>此操作将永久删除所有留言和图片文件，无法恢复。</p>
        <p><strong>确定要继续吗？</strong></p>
        <div class="confirm-actions">
          <button @click="showClearConfirm = false" class="cancel-btn">取消</button>
          <button @click="handleClearMessages" class="confirm-clear-btn">确认清除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import { useMessageBoard } from '@/composables/useMessageBoard.js';
import ImagePreview from './ImagePreview.vue';
import { compressImage, formatFileSize } from '@/utils/imageCompressor.js';

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
const inputMessage = ref('');
const showSettings = ref(false);
const messageListRef = ref(null);
const selectedImages = ref([]);
const fileInput = ref(null);
const showClearConfirm = ref(false);

// 临时设置（用于编辑）
const tempSettings = ref({
  nickname: '',
  avatarColor: '',
  autoOpenEnabled: true,
});

// 计算属性
const canSend = computed(() => {
  return (inputMessage.value.trim().length > 0 || selectedImages.value.length > 0) && !sending.value;
});

// 处理发送
const handleSend = async () => {
  if (!canSend.value) return;

  try {
    let uploadedImages = null;
    let imageType = null;

    // 如果有选择的图片，先上传
    if (selectedImages.value.length > 0) {
      const files = selectedImages.value.map(img => img.file);
      const uploadResult = await uploadImages(files);
      uploadedImages = uploadResult;
      imageType = 'upload';
    }

    await sendMessage(inputMessage.value, uploadedImages, imageType);
    inputMessage.value = '';
    selectedImages.value = [];
    
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

// 处理图片粘贴
const handlePaste = async (event) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (let item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const file = item.getAsFile();
      if (file) {
        await addImage(file);
      }
    }
  }
};

// 处理文件选择
const handleFileSelect = async (event) => {
  const files = Array.from(event.target.files);
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      await addImage(file);
    }
  }
  // 清空input值，允许重复选择同一文件
  event.target.value = '';
};

// 添加图片到选择列表
const addImage = async (file) => {
  if (selectedImages.value.length >= 5) {
    alert('最多只能选择5张图片');
    return;
  }

  try {
    let processedFile = file;
    let originalSize = file.size;
    let compressed = false;

    // 如果文件超过5MB，尝试压缩
    if (file.size > 5 * 1024 * 1024) {
      try {
        processedFile = await compressImage(file);
        compressed = true;
        
        // 显示压缩信息
        const originalSizeText = formatFileSize(originalSize);
        const compressedSizeText = formatFileSize(processedFile.size);
        console.log(`图片压缩: ${originalSizeText} -> ${compressedSizeText}`);
        
        if (processedFile.size > 5 * 1024 * 1024) {
          alert(`图片压缩后仍然超过5MB限制 (${compressedSizeText})，无法添加`);
          return;
        }
      } catch (error) {
        console.error('图片压缩失败:', error);
        alert('图片压缩失败，无法添加');
        return;
      }
    }

    const url = URL.createObjectURL(processedFile);
    selectedImages.value.push({
      file: processedFile,
      url,
      name: file.name,
      originalSize,
      compressed,
      compressedSize: processedFile.size
    });
  } catch (error) {
    console.error('添加图片失败:', error);
    alert('添加图片失败');
  }
};

// 移除选择的图片
const removeImage = (index) => {
  const image = selectedImages.value[index];
  URL.revokeObjectURL(image.url);
  selectedImages.value.splice(index, 1);
};

// 处理清除留言板
const handleClearMessages = async () => {
  try {
    const result = await clearAllMessages();
    showClearConfirm.value = false;
    showSettings.value = false;
    
    // 显示清除成功提示
    alert(`留言板已清空！\n删除了 ${result.deletedMessages} 条留言和 ${result.deletedImages} 张图片`);
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
watch(userSettings, (newSettings) => {
  tempSettings.value = {
    nickname: newSettings.nickname,
    avatarColor: newSettings.avatarColor,
    autoOpenEnabled: Boolean(newSettings.autoOpenEnabled),
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
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 4px;
}

.setting-item label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #495057;
  min-width: 80px;
}

.setting-hint {
  color: #6c757d;
  font-size: 12px;
  margin-left: 24px;
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

.danger-zone {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #dc3545;
  border-radius: 6px;
  background: #fff5f5;
}

.danger-zone h4 {
  margin: 0 0 12px 0;
  color: #dc3545;
  font-size: 14px;
}

.danger-action {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.danger-action p {
  margin: 0;
  font-size: 12px;
  color: #6c757d;
}

.clear-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  align-self: flex-start;
}

.clear-btn:hover {
  background: #c82333;
}

.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.confirm-dialog {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.confirm-dialog h3 {
  margin: 0 0 16px 0;
  color: #dc3545;
  font-size: 18px;
}

.confirm-dialog p {
  margin: 0 0 12px 0;
  color: #495057;
  font-size: 14px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.confirm-clear-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.confirm-clear-btn:hover {
  background: #c82333;
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

.input-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-image-btn {
  background: none;
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
}

.add-image-btn:hover {
  background: #e9ecef;
}

.selected-images {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.selected-image-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #ced4da;
}

.selected-image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-image-btn:hover {
  background: rgba(220, 53, 69, 1);
}

.compression-info {
  position: absolute;
  bottom: 2px;
  left: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 10px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.compression-badge {
  background: #ffc107;
  color: #000;
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: bold;
  font-size: 9px;
  text-align: center;
}

.size-info {
  font-size: 9px;
  text-align: center;
  opacity: 0.9;
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
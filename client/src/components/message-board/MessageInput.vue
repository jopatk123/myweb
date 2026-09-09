<template>
  <div class="message-input">
    <div class="composer">
      <div v-if="selectedImages.length > 0" class="selected-images">
        <div
          v-for="(image, index) in selectedImages"
          :key="image.id"
          class="selected-image-item"
        >
          <img :src="image.url" :alt="image.name" />
          <button
            type="button"
            class="remove-image-btn"
            title="移除图片"
            aria-label="移除图片"
            @click="removeImage(index)"
          >
            ✕
          </button>
          <span v-if="image.compressed" class="compression-badge">已压缩</span>
        </div>
      </div>

      <textarea
        v-model="inputMessage"
        class="composer-textarea"
        placeholder="输入留言，可粘贴图片"
        rows="5"
        :maxlength="MESSAGE_CONTENT_MAX_LENGTH"
        @keydown="handleKeydown"
        @paste="handlePaste"
      ></textarea>

      <div class="composer-toolbar">
        <div class="toolbar-left">
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*"
            @change="handleFileSelect"
          />
          <button
            type="button"
            class="add-image-btn"
            title="添加图片"
            aria-label="添加图片"
            @click="fileInput && fileInput.click()"
          >
            📷
          </button>
          <span class="char-count"
            >{{ inputMessage.length }}/{{ MESSAGE_CONTENT_MAX_LENGTH }}</span
          >
          <span
            v-if="selectedImages.length > 0"
            class="image-count"
            :class="{
              'count-warn': selectedImages.length >= MESSAGE_IMAGE_MAX_COUNT,
            }"
          >
            {{ selectedImages.length }}/{{ MESSAGE_IMAGE_MAX_COUNT }}
          </span>
        </div>
        <div class="toolbar-right">
          <span class="shortcut-hint">{{ sendShortcutLabel }}</span>
          <button
            type="button"
            class="send-btn"
            :disabled="!canSend"
            :title="sendShortcutLabel"
            @click="handleSend"
          >
            {{ sending ? '发送中...' : '发送' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch } from 'vue';
  import { useGlobalToast } from '@/composables/useGlobalToast.js';
  import { compressImage } from '@/utils/imageCompressor.js';
  import { formatFileSize } from '@/composables/useImageProcessing.js';
  import { createStableId } from '@/utils/stableId.js';
  import {
    MESSAGE_CONTENT_MAX_LENGTH,
    MESSAGE_IMAGE_MAX_COUNT,
    MESSAGE_IMAGE_MAX_SIZE,
  } from '@shared/constants.js';

  const props = defineProps({
    sending: { type: Boolean, required: true },
    sendSuccessToken: { type: Number, default: 0 },
  });

  const emit = defineEmits(['send']);

  const inputMessage = ref('');
  const selectedImages = ref([]);
  const fileInput = ref(null);
  const { showError, showInfo } = useGlobalToast();

  const sendShortcutLabel = /Mac|iPhone|iPad|iPod/i.test(
    navigator.platform || navigator.userAgent
  )
    ? '⌘+Enter 发送'
    : 'Ctrl+Enter 发送';

  const canSend = computed(() => {
    return (
      (inputMessage.value.trim().length > 0 ||
        selectedImages.value.length > 0) &&
      !props.sending
    );
  });

  const isImeComposing = event =>
    Boolean(event.isComposing) || event.keyCode === 229;

  const handleKeydown = event => {
    if (event.key !== 'Enter') return;
    // 中文等 IME 用 Enter 上屏，组合过程中绝不发送
    if (isImeComposing(event)) return;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!canSend.value) return;
    const files = selectedImages.value.map(img => img.file);
    emit('send', { text: inputMessage.value, files });
  };

  const handlePaste = async event => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) await addImage(file);
      }
    }
  };

  const handleFileSelect = async event => {
    const files = Array.from(event.target.files);
    for (const file of files) {
      if (file.type.startsWith('image/')) await addImage(file);
    }
    event.target.value = '';
  };

  const addImage = async file => {
    if (selectedImages.value.length >= MESSAGE_IMAGE_MAX_COUNT) {
      showInfo(`最多只能选择${MESSAGE_IMAGE_MAX_COUNT}张图片`);
      return;
    }
    try {
      let processedFile = file;
      let originalSize = file.size;
      let compressed = false;
      if (file.size > MESSAGE_IMAGE_MAX_SIZE) {
        try {
          processedFile = await compressImage(file);
          compressed = true;
          const compressedSizeText = formatFileSize(processedFile.size);
          if (processedFile.size > MESSAGE_IMAGE_MAX_SIZE) {
            showInfo(
              `图片压缩后仍然超过 ${formatFileSize(MESSAGE_IMAGE_MAX_SIZE)} 限制 (${compressedSizeText})，无法添加`
            );
            return;
          }
        } catch (error) {
          console.error('图片压缩失败:', error);
          showError('图片压缩失败，无法添加');
          return;
        }
      }
      const url = URL.createObjectURL(processedFile);
      selectedImages.value.push({
        id: createStableId(),
        file: processedFile,
        url,
        name: file.name,
        originalSize,
        compressed,
        compressedSize: processedFile.size,
      });
    } catch (error) {
      console.error('添加图片失败:', error);
      showError('添加图片失败');
    }
  };

  const removeImage = index => {
    const image = selectedImages.value[index];
    URL.revokeObjectURL(image.url);
    selectedImages.value.splice(index, 1);
  };

  watch(
    () => props.sendSuccessToken,
    () => {
      inputMessage.value = '';
      selectedImages.value.forEach(img => URL.revokeObjectURL(img.url));
      selectedImages.value = [];
    }
  );
</script>

<style scoped>
  .message-input {
    padding: 8px 10px 10px;
    border-top: 1px solid #e9ecef;
    background: #fff;
    flex-shrink: 0;
  }

  .composer {
    display: flex;
    flex-direction: column;
    border: 1px solid #ced4da;
    border-radius: 8px;
    background: #f8f9fa;
    overflow: hidden;
    transition:
      border-color 0.15s,
      box-shadow 0.15s,
      background-color 0.15s;
  }

  .composer:focus-within {
    background: #fff;
    border-color: #4dabf7;
    box-shadow: 0 0 0 3px rgba(77, 171, 247, 0.2);
  }

  .composer-textarea {
    width: 100%;
    min-height: 108px;
    max-height: 180px;
    padding: 8px 10px 4px;
    border: none;
    resize: none;
    font-size: 14px;
    line-height: 1.45;
    font-family: inherit;
    background: transparent;
    color: #212529;
  }

  .composer-textarea:focus {
    outline: none;
  }

  .composer-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 4px 8px 6px;
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toolbar-left input[type='file'] {
    display: none;
  }

  .add-image-btn {
    background: transparent;
    border: none;
    border-radius: 5px;
    padding: 2px 6px;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    color: #495057;
  }

  .add-image-btn:hover {
    background: #e9ecef;
    color: #212529;
  }

  .selected-images {
    display: flex;
    gap: 6px;
    padding: 8px 8px 0;
    flex-wrap: wrap;
  }

  .selected-image-item {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #dee2e6;
    flex-shrink: 0;
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
    background: rgba(33, 37, 41, 0.8);
    color: white;
    border: none;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    font-size: 10px;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .remove-image-btn:hover {
    background: rgba(250, 82, 82, 0.9);
  }

  .compression-badge {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.55);
    color: #ffd43b;
    font-size: 9px;
    font-weight: 600;
    text-align: center;
    padding: 1px 0;
  }

  .char-count {
    font-size: 11px;
    color: #868e96;
  }

  .image-count {
    font-size: 11px;
    color: #495057;
    padding: 1px 6px;
    background: #edf8ff;
    border-radius: 8px;
    border: 1px solid #d0ebff;
  }

  .image-count.count-warn {
    color: #c92a2a;
    background: #fff5f5;
    border-color: #ffd8d8;
  }

  .shortcut-hint {
    font-size: 11px;
    color: #adb5bd;
    white-space: nowrap;
  }

  .send-btn {
    padding: 4px 12px;
    background: #228be6;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
  }

  .send-btn:hover:not(:disabled) {
    background: #1c7ed6;
  }

  .send-btn:disabled {
    background: #adb5bd;
    cursor: not-allowed;
  }
</style>

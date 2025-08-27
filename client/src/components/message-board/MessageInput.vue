<template>
  <div class="message-input">
    <div class="input-container">
      <div v-if="selectedImages.length > 0" class="selected-images">
        <div 
          v-for="(image, index) in selectedImages" 
          :key="index"
          class="selected-image-item"
        >
          <img :src="image.url" :alt="image.name" />
          <button @click="removeImage(index)" class="remove-image-btn">✕</button>
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
            @click="fileInput && fileInput.click()" 
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
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { compressImage, formatFileSize } from '@/utils/imageCompressor.js';

const props = defineProps({
  sending: { type: Boolean, required: true },
  sendSuccessToken: { type: Number, default: 0 },
});

const emit = defineEmits(['send']);

const inputMessage = ref('');
const selectedImages = ref([]);
const fileInput = ref(null);

const canSend = computed(() => {
  return (inputMessage.value.trim().length > 0 || selectedImages.value.length > 0) && !props.sending;
});

const handleSend = async () => {
  if (!canSend.value) return;
  const files = selectedImages.value.map(img => img.file);
  emit('send', { text: inputMessage.value, files });
};

const handleNewLine = () => {
  inputMessage.value += '\n';
};

const handlePaste = async (event) => {
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

const handleFileSelect = async (event) => {
  const files = Array.from(event.target.files);
  for (const file of files) {
    if (file.type.startsWith('image/')) await addImage(file);
  }
  event.target.value = '';
};

const addImage = async (file) => {
  if (selectedImages.value.length >= 5) {
    alert('最多只能选择5张图片');
    return;
  }
  try {
    let processedFile = file;
    let originalSize = file.size;
    let compressed = false;
    if (file.size > 5 * 1024 * 1024) {
      try {
        processedFile = await compressImage(file);
        compressed = true;
        const compressedSizeText = formatFileSize(processedFile.size);
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

const removeImage = (index) => {
  const image = selectedImages.value[index];
  URL.revokeObjectURL(image.url);
  selectedImages.value.splice(index, 1);
};

watch(() => props.sendSuccessToken, () => {
  // 清空输入与选择图片
  inputMessage.value = '';
  selectedImages.value.forEach(img => URL.revokeObjectURL(img.url));
  selectedImages.value = [];
});
</script>

<style scoped>
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
</style>


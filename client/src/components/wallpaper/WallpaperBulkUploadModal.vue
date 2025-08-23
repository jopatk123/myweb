<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" ref="modalRef" :style="modalStyle" @click.stop>
      <div class="modal-header" @pointerdown.stop.prevent="onHeaderPointerDown">
        <h3>批量上传壁纸</h3>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="handleUploadAll">
          <div class="form-group">
            <label>选择分组：</label>
            <select v-model="selectedGroupId">
              <option value="">默认分组</option>
              <option v-for="group in groups" :key="group.id" :value="group.id">
                {{ group.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>选择图片（支持多选 / 拖拽）：</label>
            <FileDropzone
              class="dropzone"
              accept="image/*"
              :multiple="true"
              @files-selected="handleFiles"
            >
              <span v-if="selectedFiles.length === 0">
                点击选择或拖拽多个图片文件到此处<br />
                <small
                  >最小分辨率：800x600，超过7680x4320会自动压缩；请保证单文件
                  &lt;= 10MB</small
                >
              </span>
              <span v-else
                >已选择 <strong>{{ selectedFiles.length }}</strong> 个文件</span
              >
            </FileDropzone>
          </div>

          <FilePreviewList :items="selectedFiles" @remove="removeFile" />

          <div v-if="error" class="error-message">{{ error }}</div>

          <div v-if="uploading" class="upload-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: overallProgress + '%' }"
              ></div>
            </div>
            <p>上传中... {{ overallProgress }}%</p>
          </div>

          <div class="modal-actions">
            <button
              type="button"
              @click="$emit('close')"
              class="btn btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="selectedFiles.length === 0 || uploading"
              class="btn btn-primary"
            >
              {{ uploading ? '上传中...' : '开始上传' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch, nextTick } from 'vue';
  import { useWallpaper } from '@/composables/useWallpaper.js';
  import { processImageFile } from '@/composables/useImageProcessing.js';
  import FileDropzone from '@/components/wallpaper/upload/FileDropzone.vue';
  import FilePreviewList from '@/components/wallpaper/upload/FilePreviewList.vue';

  const props = defineProps({ groups: { type: Array, default: () => [] } });
  const emit = defineEmits(['close', 'uploaded']);

  const { uploadWallpaper } = useWallpaper();

  const modalRef = ref(null);
  const pos = ref({ x: null, y: null });
  let dragging = false;
  let dragStart = null;

  const modalStyle = computed(() => ({
    position: 'absolute',
    left: pos.value.x !== null ? `${pos.value.x}px` : undefined,
    top: pos.value.y !== null ? `${pos.value.y}px` : undefined,
  }));

  const selectedGroupId = ref('');
  const selectedFiles = ref([]); // 每项为 processImageFile 返回的对象，同时附带 progress 字段
  const uploading = ref(false);
  const error = ref('');

  const overallProgress = computed(() => {
    if (selectedFiles.value.length === 0) return 0;
    const total = selectedFiles.value.length;
    const sum = selectedFiles.value.reduce(
      (acc, it) => acc + (it.progress || 0),
      0
    );
    return Math.round(sum / total);
  });

  function centerModal() {
    if (!modalRef.value) return;
    const el = modalRef.value;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    pos.value = {
      x: Math.max(10, (window.innerWidth - w) / 2),
      y: Math.max(10, (window.innerHeight - h) / 2),
    };
  }

  function storageKey() {
    return 'wallpaperBulkUploadPos';
  }

  function loadPosition() {
    try {
      const raw = localStorage.getItem(storageKey());
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v?.x === 'number' && typeof v?.y === 'number') {
          pos.value = v;
        }
      }
    } catch {}
  }

  function savePosition() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(pos.value));
    } catch {}
  }

  function onHeaderPointerDown(e) {
    if (e.button !== 0) return;
    dragging = true;
    dragStart = {
      x: e.clientX,
      y: e.clientY,
      originX: pos.value.x,
      originY: pos.value.y,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  }

  function onPointerMove(e) {
    if (!dragging || !dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    pos.value = { x: dragStart.originX + dx, y: dragStart.originY + dy };
  }

  function onPointerUp() {
    dragging = false;
    dragStart = null;
    window.removeEventListener('pointermove', onPointerMove);
    savePosition();
  }

  onMounted(async () => {
    await nextTick();
    loadPosition();
    if (pos.value.x === null || pos.value.y === null) {
      centerModal();
    }
  });

  const handleFiles = async filesArray => {
    const files = Array.from(filesArray || []);
    if (files.length === 0) return;
    error.value = '';

    // 处理所有文件，保留顺序
    for (const f of files) {
      try {
        const item = await processImageFile(f, {
          minWidth: 800,
          minHeight: 600,
          maxWidth: 7680,
          maxHeight: 4320,
          maxSizeMB: 10,
        });
        // 额外字段
        item.progress = 0;
        selectedFiles.value.push(item);
      } catch (err) {
        console.warn('处理图片失败', err);
        // 不中断其它文件的处理，记录错误提示
        error.value = err.message || '部分文件处理失败，已跳过';
      }
    }
  };

  const removeFile = index => {
    selectedFiles.value.splice(index, 1);
  };

  const handleUploadAll = async () => {
    if (selectedFiles.value.length === 0) return;
    uploading.value = true;
    error.value = '';

    try {
      // 顺序上传，每个文件更新其 progress
      for (let i = 0; i < selectedFiles.value.length; i++) {
        const item = selectedFiles.value[i];
        item.progress = 0;
        await uploadWallpaper(
          item.file,
          selectedGroupId.value || null,
          item.name || item.originalName || '',
          p => {
            item.progress = Math.floor(p);
          }
        );
        item.progress = 100;
      }
      emit('uploaded');
    } catch (err) {
      console.error('批量上传失败', err);
      error.value = err.message || '批量上传失败';
    } finally {
      uploading.value = false;
    }
  };
</script>

<style scoped>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
    cursor: move;
    user-select: none;
  }

  .modal-header h3 {
    margin: 0;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: #333;
  }

  .modal-body {
    padding: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
  }

  .form-group select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e3e7ea;
    border-radius: 6px;
    background: #fff;
    box-shadow: inset 0 1px 0 rgba(0, 0, 0, 0.02);
    font-size: 14px;
  }

  .dropzone {
    display: block;
    border: 2px dashed #d0d7de;
    background: linear-gradient(180deg, #fbfcfd, #ffffff);
    padding: 18px;
    border-radius: 8px;
    text-align: center;
    color: #55606a;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }
  .dropzone:hover {
    border-color: #9fb0c7;
    box-shadow: 0 6px 18px rgba(16, 24, 40, 0.06);
  }
  .dropzone small {
    display: block;
    color: #6c7a89;
    margin-top: 6px;
  }

  .error-message {
    background: #fee;
    color: #c33;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 20px;
  }

  .upload-progress {
    margin-bottom: 20px;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #eee;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    background: #007bff;
    transition: width 0.3s ease;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s ease;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #007bff;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #545b62;
  }
</style>

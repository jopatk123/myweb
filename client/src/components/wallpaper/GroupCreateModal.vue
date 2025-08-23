<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" ref="modalRef" :style="modalStyle" @click.stop>
      <div class="modal-header" @pointerdown.stop.prevent="onHeaderPointerDown">
        <h3>新建分组</h3>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="handleCreate">
          <div class="form-group">
            <label for="groupName">分组名称：</label>
            <input
              id="groupName"
              v-model="formData.name"
              type="text"
              placeholder="请输入分组名称"
              required
              maxlength="100"
            />
          </div>

          <!-- 分组描述已移除 -->

          <!-- 错误提示 -->
          <div v-if="error" class="error-message">
            {{ error }}
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
              :disabled="!formData.name.trim() || loading"
              class="btn btn-primary"
            >
              {{ loading ? '创建中...' : '创建' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted, watch, nextTick, computed } from 'vue';
  import { useWallpaper } from '@/composables/useWallpaper.js';
  import { useDraggableModal } from '@/composables/useDraggableModal.js';

  const emit = defineEmits(['close', 'created']);

  const { createGroup } = useWallpaper();

  const { modalRef, modalStyle, onHeaderPointerDown } =
    useDraggableModal('groupCreatePos');

  const formData = reactive({
    name: '',
  });

  const loading = ref(false);
  const error = ref('');

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    loading.value = true;
    error.value = '';

    try {
      await createGroup({
        name: formData.name.trim(),
      });

      emit('created');
    } catch (err) {
      error.value = err.message || '创建失败';
    } finally {
      loading.value = false;
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
    max-width: 500px;
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

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #007bff;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .error-message {
    background: #fee;
    color: #c33;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 20px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
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

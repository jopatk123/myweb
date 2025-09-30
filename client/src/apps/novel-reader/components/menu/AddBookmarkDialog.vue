<template>
  <Teleport to="body">
    <div v-if="visible" class="add-bookmark-dialog">
      <div class="dialog-content">
        <h4>添加书签</h4>
        <input
          v-model="titleModel"
          type="text"
          placeholder="书签标题..."
          class="bookmark-input"
          @keyup.enter="confirm"
          autofocus
        />
        <div class="dialog-actions">
          <button class="btn btn-secondary" type="button" @click="cancel">
            取消
          </button>
          <button
            class="btn btn-primary"
            type="button"
            @click="confirm"
            :disabled="!titleModel.trim()"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
  defineProps({
    visible: {
      type: Boolean,
      default: false,
    },
  });

  const emit = defineEmits(['update:visible', 'confirm', 'cancel']);

  const visibleModel = defineModel('visible', {
    type: Boolean,
    default: false,
  });

  const titleModel = defineModel('title', {
    type: String,
    default: '',
  });

  function close() {
    visibleModel.value = false;
  }

  function cancel() {
    close();
    emit('cancel');
    titleModel.value = '';
  }

  function confirm() {
    const value = titleModel.value.trim();
    if (!value) return;
    emit('confirm', value);
    titleModel.value = '';
    close();
  }
</script>

<style scoped>
  .add-bookmark-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
  }

  .dialog-content {
    background: white;
    padding: 24px;
    border-radius: 8px;
    width: 300px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .dialog-content h4 {
    margin: 0 0 16px 0;
    color: #333;
  }

  .bookmark-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.9rem;
    margin-bottom: 16px;
    box-sizing: border-box;
  }

  .bookmark-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn {
    padding: 6px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #5a6268;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #5a6fd8;
  }
</style>

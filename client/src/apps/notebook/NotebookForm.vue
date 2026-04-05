<template>
  <div class="notebook-form">
    <div class="form-header">
      <h3>{{ note ? '编辑笔记' : '新建笔记' }}</h3>
    </div>

    <form @submit.prevent="handleSubmit" class="form-content">
      <div class="form-group">
        <label class="form-label">标题 *</label>
        <input
          v-model="formData.title"
          type="text"
          placeholder="请输入标题..."
          class="form-input"
          required
          ref="titleInput"
        />
      </div>

      <div class="form-group is-description">
        <label class="form-label">描述</label>
        <textarea
          v-model="formData.description"
          placeholder="请输入详细描述..."
          class="form-textarea"
          rows="5"
        ></textarea>
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label">优先级</label>
          <select v-model="formData.priority" class="form-select">
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>
      </div>

      <div class="form-actions">
        <button
          type="button"
          @click="$emit('cancel')"
          class="btn btn-secondary"
        >
          取消
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!formData.title.trim()"
        >
          {{ note ? '更新' : '创建' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted, watch } from 'vue';

  const props = defineProps({
    note: {
      type: Object,
      default: null,
    },
  });

  const emit = defineEmits(['save', 'cancel']);

  const formData = reactive({
    title: '',
    description: '',
    priority: 'medium',
  });

  const titleInput = ref(null);

  watch(
    () => props.note,
    newNote => {
      if (newNote) {
        formData.title = newNote.title || '';
        formData.description = newNote.description || '';
        formData.priority = newNote.priority || 'medium';
      } else {
        resetForm();
      }
    },
    { immediate: true }
  );

  function resetForm() {
    formData.title = '';
    formData.description = '';
    formData.priority = 'medium';
  }

  function handleSubmit() {
    if (!formData.title.trim()) return;

    emit('save', {
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority,
    });

    if (!props.note) {
      resetForm();
    }
  }

  onMounted(() => {
    if (titleInput.value) {
      titleInput.value.focus();
    }
  });
</script>

<style scoped>
  .notebook-form {
    background: var(--bg-color, #ffffff);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .notebook-form.is-expanded {
    flex: 1;
    margin-bottom: 0;
  }

  .form-header {
    margin-bottom: 16px;
    text-align: left;
    border-bottom: 1px solid #eee;
    padding-bottom: 12px;
  }

  .form-header h3 {
    margin: 0;
    color: #333;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .form-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
  }

  .notebook-form.is-expanded .form-content {
    flex: 1;
  }

  .form-row {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .flex-1 {
    flex: 1;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .notebook-form.is-expanded .form-group.is-description {
    flex: 1;
    min-height: 0;
  }

  .form-label {
    font-weight: 500;
    color: #555;
    font-size: 14px;
  }

  .form-input,
  .form-textarea,
  .form-select {
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s ease;
    background: #fafafa;
  }

  .form-input:focus,
  .form-textarea:focus,
  .form-select:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-textarea {
    resize: vertical;
    min-height: 100px;
    font-family: inherit;
    line-height: 1.5;
  }

  .notebook-form.is-expanded .form-textarea {
    flex: 1;
    min-height: 220px;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 12px;
    padding-top: 16px;
    border-top: 1px solid #eee;
  }

  .btn {
    padding: 8px 24px;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #4b5563;
    border: 1px solid #e5e7eb;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #e5e7eb;
  }
</style>

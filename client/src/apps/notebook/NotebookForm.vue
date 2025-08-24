<template>
  <div class="notebook-form">
    <div class="form-header">
      <h3>{{ note ? '编辑笔记' : '新建笔记' }}</h3>
    </div>

    <form @submit.prevent="handleSubmit" class="form-content">
      <!-- 标题输入 -->
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

      <!-- 描述输入 -->
      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea
          v-model="formData.description"
          placeholder="请输入详细描述..."
          class="form-textarea"
          rows="3"
        ></textarea>
      </div>

      <!-- 分类选择 -->
      <div class="form-group">
        <label class="form-label">分类</label>
        <div class="category-controls">
          <select v-model="formData.category" class="form-select">
            <option value="">选择分类</option>
            <option
              v-for="category in categories"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>
          <button
            type="button"
            @click="showNewCategory = !showNewCategory"
            class="btn btn-secondary btn-sm"
          >
            ➕
          </button>
        </div>
      </div>

      <!-- 新分类输入 -->
      <div v-if="showNewCategory" class="form-group">
        <label class="form-label">新分类</label>
        <div class="new-category-controls">
          <input
            v-model="newCategoryName"
            type="text"
            placeholder="输入新分类名称..."
            class="form-input"
            @keyup.enter="addNewCategory"
          />
          <button
            type="button"
            @click="addNewCategory"
            class="btn btn-primary btn-sm"
            :disabled="!newCategoryName.trim()"
          >
            添加
          </button>
        </div>
      </div>

      <!-- 优先级选择 -->
      <div class="form-group">
        <label class="form-label">优先级</label>
        <select v-model="formData.priority" class="form-select">
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
      </div>

      <!-- 操作按钮 -->
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
    categories: {
      type: Array,
      default: () => [],
    },
  });

  const emit = defineEmits(['save', 'cancel', 'addCategory']);

  // 表单数据
  const formData = reactive({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
  });

  // 新分类相关
  const showNewCategory = ref(false);
  const newCategoryName = ref('');
  const titleInput = ref(null);

  // 监听props变化，初始化表单数据
  watch(
    () => props.note,
    newNote => {
      if (newNote) {
        formData.title = newNote.title || '';
        formData.description = newNote.description || '';
        formData.category = newNote.category || '';
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
    formData.category = '';
    formData.priority = 'medium';
    showNewCategory.value = false;
    newCategoryName.value = '';
  }

  function handleSubmit() {
    if (!formData.title.trim()) return;

    emit('save', {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      priority: formData.priority,
    });

    if (!props.note) {
      resetForm();
    }
  }

  function addNewCategory() {
    const categoryName = newCategoryName.value.trim();
    if (categoryName) {
      emit('addCategory', categoryName);
      formData.category = categoryName;
      newCategoryName.value = '';
      showNewCategory.value = false;
    }
  }

  onMounted(() => {
    // 自动聚焦到标题输入框
    if (titleInput.value) {
      titleInput.value.focus();
    }
  });
</script>

<style scoped>
  .notebook-form {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    flex-shrink: 0;
  }

  .form-header {
    margin-bottom: 12px;
    text-align: center;
  }

  .form-header h3 {
    margin: 0;
    color: #333;
    font-size: 1.2rem;
    font-weight: 600;
  }

  .form-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-label {
    font-weight: 500;
    color: #555;
    font-size: 14px;
  }

  .form-input,
  .form-textarea,
  .form-select {
    padding: 8px 10px;
    border: 2px solid #e5e7eb;
    border-radius: 6px;
    font-size: 13px;
    transition: border-color 0.2s ease;
    background: white;
  }

  .form-input:focus,
  .form-textarea:focus,
  .form-select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-textarea {
    resize: vertical;
    min-height: 60px;
    font-family: inherit;
  }

  .category-controls,
  .new-category-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .category-controls .form-select {
    flex: 1;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .btn-primary {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(45deg, #5a67d8, #6b46c1);
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #e5e7eb;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 13px;
    min-width: auto;
  }

  @media (max-width: 768px) {
    .notebook-form {
      padding: 16px;
    }

    .form-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>

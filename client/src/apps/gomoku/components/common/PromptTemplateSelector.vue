<template>
  <div class="prompt-template-selector">
    <div class="template-section">
      <label>提示词模板</label>
      <select v-model="selectedTemplate" @change="handleTemplateChange" class="template-select">
        <option value="">选择提示词模板...</option>
        <option v-for="template in templateList" :key="template.id" :value="template.id">
          {{ template.name }}
        </option>
      </select>
    </div>

    <div v-if="selectedTemplate" class="template-preview">
      <h4>{{ getCurrentTemplate?.name }}</h4>
      <p class="template-description">{{ getCurrentTemplate?.description }}</p>
      
      <div class="template-content">
        <label>提示词内容：</label>
        <textarea 
          v-model="templateContent" 
          class="template-textarea"
          rows="8"
          placeholder="提示词内容..."
          @input="handleContentChange"
        ></textarea>
      </div>

      <div class="template-actions">
        <button @click="saveTemplate" class="btn btn-success btn-sm">保存模板</button>
        <button @click="resetTemplate" class="btn btn-muted btn-sm">重置</button>
  <button @click="openCustomTemplateForm" class="btn btn-info btn-sm">添加自定义</button>
      </div>
    </div>

    <div v-if="showCustomForm" class="custom-template-form">
      <h4>添加自定义模板</h4>
      <div class="form-group">
        <label>模板ID：</label>
        <input v-model="customTemplate.id" type="text" placeholder="custom-template-id" />
      </div>
      <div class="form-group">
        <label>模板名称：</label>
        <input v-model="customTemplate.name" type="text" placeholder="自定义模板名称" />
      </div>
      <div class="form-group">
        <label>描述：</label>
        <input v-model="customTemplate.description" type="text" placeholder="模板描述" />
      </div>
      <div class="form-group">
        <label>提示词内容：</label>
        <textarea 
          v-model="customTemplate.template" 
          rows="6"
          placeholder="输入提示词模板内容..."
        ></textarea>
      </div>
      <div class="form-actions">
        <button @click="confirmAddTemplate" class="btn btn-success btn-sm">确认添加</button>
        <button @click="cancelAddTemplate" class="btn btn-muted btn-sm">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAIPrompts } from '../../composables/useAIPrompts.js';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'gomoku-system'
  }
});

const emit = defineEmits(['update:modelValue', 'template-change']);

const { 
  selectedTemplate, 
  templateList, 
  getTemplateInfo, 
  addCustomTemplate 
} = useAIPrompts();

// 本地状态
const templateContent = ref('');
const showCustomForm = ref(false);
const customTemplate = ref({
  id: '',
  name: '',
  description: '',
  template: ''
});

// 计算属性
const getCurrentTemplate = computed(() => {
  return getTemplateInfo(selectedTemplate.value);
});

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== selectedTemplate.value) {
    selectedTemplate.value = newValue;
    updateTemplateContent();
  }
});

// 监听选中模板变化
watch(selectedTemplate, (newValue) => {
  emit('update:modelValue', newValue);
  updateTemplateContent();
});

// 更新模板内容
function updateTemplateContent() {
  if (selectedTemplate.value) {
    const template = getTemplateInfo(selectedTemplate.value);
    if (template) {
      templateContent.value = template.template;
    }
  }
}

// 处理模板选择变化
function handleTemplateChange() {
  emit('template-change', selectedTemplate.value);
}

// 处理内容变化
function handleContentChange() {
  // 这里可以添加实时预览或其他功能
}

// 保存模板
function saveTemplate() {
  if (selectedTemplate.value && templateContent.value) {
    const template = getTemplateInfo(selectedTemplate.value);
    if (template) {
      template.template = templateContent.value;
      // 这里可以添加保存到本地存储或服务器的逻辑
      console.log('模板已保存:', template);
    }
  }
}

// 重置模板
function resetTemplate() {
  updateTemplateContent();
}

// 添加自定义模板
function openCustomTemplateForm() {
  showCustomForm.value = true;
  customTemplate.value = {
    id: '',
    name: '',
    description: '',
    template: ''
  };
}

// 确认添加模板
function confirmAddTemplate() {
  if (!customTemplate.value.id || !customTemplate.value.name || !customTemplate.value.template) {
    alert('请填写完整的模板信息');
    return;
  }

  const result = addCustomTemplate(customTemplate.value);
  if (result.success) {
    selectedTemplate.value = customTemplate.value.id;
    showCustomForm.value = false;
    console.log('自定义模板添加成功');
  } else {
    alert('添加失败: ' + result.error);
  }
}

// 取消添加模板
function cancelAddTemplate() {
  showCustomForm.value = false;
}

// 初始化
updateTemplateContent();
</script>

<style scoped>
.prompt-template-selector {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.template-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.template-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.template-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.template-preview {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.template-preview h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.template-description {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 0.9rem;
}

.template-content {
  margin-bottom: 15px;
}

.template-content label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.template-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  resize: vertical;
  min-height: 120px;
}

.template-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.template-actions {
  display: flex;
  gap: 10px;
}

.custom-template-form {
  padding: 15px;
  background: #fff3cd;
  border-radius: 8px;
  border: 1px solid #ffeaa7;
}

.custom-template-form h4 {
  margin: 0 0 15px 0;
  color: #856404;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group textarea {
  font-family: monospace;
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 768px) {
  .template-actions,
  .form-actions {
    flex-direction: column;
  }
  
  .template-actions .btn,
  .form-actions .btn {
    width: 100%;
  }
}
</style>

<template>
  <div class="config-form">
    <div class="form-group">
      <label>预设 / 类型:</label>
      <select v-model="preset" @change="onPresetChange">
        <option value="">选择预设或自定义</option>
        <option value="openai">OpenAI GPT</option>
        <option value="claude">Claude</option>
        <option value="custom">自定义</option>
      </select>
    </div>
    <div class="form-group">
      <label>API URL:</label>
      <input type="text" v-model="modelValue.apiUrl" placeholder="https://api.openai.com/v1/chat/completions" />
    </div>
    <div class="form-group">
      <label>API Key:</label>
      <input type="password" v-model="modelValue.apiKey" placeholder="输入你的API Key" />
    </div>
    <div class="form-group">
      <label>模型名称:</label>
      <input type="text" v-model="modelValue.modelName" placeholder="gpt-3.5-turbo" />
    </div>
    <div class="form-group">
      <label>AI名称:</label>
      <input type="text" v-model="modelValue.playerName" placeholder="AI大师" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const props = defineProps({
  modelValue: { type: Object, required: true }
});
const emit = defineEmits(['update:modelValue', 'preset']);
const preset = ref('');

function onPresetChange() {
  emit('preset', preset.value);
}
</script>

<style scoped>
.config-form { display:flex; flex-direction:column; gap:15px; }
.form-group { display:flex; flex-direction:column; }
.form-group label { margin-bottom:5px; font-weight:500; color:#555; }
.form-group input, .form-group select { padding:10px 12px; border:1px solid #ddd; border-radius:6px; font-size:14px; }
.form-group input:focus, .form-group select:focus { outline:none; border-color:#667eea; box-shadow:0 0 0 2px rgba(102,126,234,.2); }
</style>
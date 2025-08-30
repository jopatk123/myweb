<template>
  <div class="ai-settings-form">
    <!-- 预设选择 -->
    <div class="preset-section">
      <label>快速配置</label>
      <select v-model="selectedPreset" @change="applyPreset" class="preset-select">
        <option value="">选择预设配置...</option>
        <option value="moonshot-8k">Moonshot 8K</option>
      </select>
    </div>

    <!-- 详细配置 -->
    <div class="config-form">
      <div class="form-group">
        <label>AI名称</label>
        <input 
          v-model="localConfig.playerName" 
          type="text" 
          placeholder="给你的AI起个名字"
        />
      </div>

      <div class="form-group">
        <label>API地址</label>
        <input 
          v-model="localConfig.apiUrl" 
          type="url" 
          placeholder="https://api.openai.com/v1/chat/completions"
        />
      </div>

      <div class="form-group">
        <label>API密钥</label>
        <input 
          v-model="localConfig.apiKey" 
          type="password" 
          placeholder="输入你的API密钥"
        />
      </div>

      <div class="form-group">
        <label>模型名称</label>
        <input 
          v-model="localConfig.modelName" 
          type="text" 
          placeholder="gpt-3.5-turbo"
        />
      </div>

      <div class="advanced-settings" v-if="showAdvanced">
        <div class="form-group">
          <label>最大Token数</label>
          <input 
            v-model.number="localConfig.maxTokens" 
            type="number" 
            min="100" 
            max="4000"
          />
        </div>

        <div class="form-group">
          <label>温度参数 (0-1)</label>
          <input 
            v-model.number="localConfig.temperature" 
            type="number" 
            min="0" 
            max="1" 
            step="0.1"
          />
        </div>
      </div>

      <button 
        @click="showAdvanced = !showAdvanced" 
        class="btn btn-muted btn-sm toggle-advanced"
      >
        {{ showAdvanced ? '隐藏' : '显示' }}高级设置
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      apiUrl: '',
  apiKey: '',
  modelName: 'kimi-k2-turbo-preview',
      playerName: 'AI大师',
      maxTokens: 1000,
      temperature: 0.1
    })
  }
});

const emit = defineEmits(['update:modelValue', 'preset']);

const selectedPreset = ref('');
const showAdvanced = ref(false);
const localConfig = ref({ ...props.modelValue });
// 防止父 -> 子 -> 父的递归回流
const updatingFromParent = ref(false);

// 预设配置（仅保留 Moonshot）
const presets = {
  'moonshot-8k': {
    apiUrl: 'https://api.moonshot.cn/v1',
    modelName: 'kimi-k2-turbo-preview',
    playerName: 'Moonshot',
    maxTokens: 1000,
    temperature: 0.1
  }
};

function applyPreset() {
  if (selectedPreset.value && presets[selectedPreset.value]) {
    const preset = presets[selectedPreset.value];
    localConfig.value = {
      ...localConfig.value,
      ...preset,
      apiKey: localConfig.value.apiKey // 保留已输入的API Key
    };
    emit('preset', selectedPreset.value);
  }
}

// 监听本地配置变化
watch(localConfig, (newConfig) => {
  if (updatingFromParent.value) return; // 忽略由父级触发的同步
  emit('update:modelValue', { ...newConfig });
}, { deep: true });

// 监听外部配置变化
watch(() => props.modelValue, (newValue) => {
  // 仅在引用变化时才需要同步；并设置标志避免再次向上 emit
  updatingFromParent.value = true;
  localConfig.value = { ...newValue };
  // 下一轮微任务后允许本地修改再次向上冒泡
  nextTick(() => { updatingFromParent.value = false; });
});

onMounted(() => {
  localConfig.value = { ...props.modelValue };
});
</script>

<style scoped>
.ai-settings-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preset-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.preset-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.preset-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
  font-size: 0.9rem;
}

.form-group input {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.advanced-settings {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.toggle-advanced {
  align-self: flex-start;
  margin-top: 10px;
}

@media (max-width: 768px) {
  .ai-settings-form {
    gap: 15px;
  }
  
  .config-form {
    gap: 12px;
  }
}
</style>
<template>
  <div class="simple-ai-config">
    <div class="config-header">
      <h3>🤖 AI大模型配置</h3>
      <button @click="$emit('close')" class="close-btn">×</button>
    </div>

    <div class="config-content">
  <GameModeSelector v-model="gameMode" />

      <div class="ai-config-section">
        <h4>AI配置</h4>
        <SimpleAISettingsForm v-model="config" @preset="onPreset" />

        <div class="test-section">
          <button 
            @click="testConnection" 
            :disabled="!canTest || testing"
            class="btn btn-info btn-sm"
          >
            {{ testing ? '测试中...' : '测试连接' }}
          </button>
          
          <div v-if="testResult" class="test-result" :class="testResult.type">
            {{ testResult.message }}
          </div>
        </div>
      </div>

      <div class="config-actions">
  <button @click="saveAndStart" class="btn btn-success btn-md start-btn">开始游戏</button>
  <button @click="resetConfig" class="btn btn-muted btn-md reset-btn">重置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import GameModeSelector from './common/GameModeSelector.vue';
import SimpleAISettingsForm from './common/SimpleAISettingsForm.vue';

const emit = defineEmits(['close', 'start-game', 'config-saved']);

// 状态
const gameMode = ref('human_vs_ai');
const selectedPreset = ref('');
const testing = ref(false);
const testResult = ref(null);

const config = ref({
  apiUrl: '',
  apiKey: '',
  modelName: 'gpt-3.5-turbo',
  playerName: 'AI大师'
});

// 预设配置
const presets = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-3.5-turbo',
    playerName: 'GPT助手'
  },
  claude: {
    apiUrl: 'https://api.anthropic.com/v1/messages',
    modelName: 'claude-3-sonnet-20240229',
    playerName: 'Claude助手'
  }
};

// 计算属性
const canTest = computed(() => {
  return config.value.apiUrl && config.value.apiKey;
});

// 方法
function onPreset(presetKey) {
  selectedPreset.value = presetKey;
  if (presetKey && presets[presetKey]) {
    const preset = presets[presetKey];
    config.value.apiUrl = preset.apiUrl;
    config.value.modelName = preset.modelName;
    config.value.playerName = preset.playerName;
  }
}

async function testConnection() {
  if (!canTest.value) return;
  
  testing.value = true;
  testResult.value = null;
  
  try {
    // 模拟测试连接
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 简单验证URL格式
    if (!config.value.apiUrl.startsWith('http')) {
      throw new Error('API URL格式不正确');
    }
    
    testResult.value = {
      type: 'success',
      message: '连接测试成功！'
    };
  } catch (error) {
    testResult.value = {
      type: 'error',
      message: error.message || '连接测试失败'
    };
  } finally {
    testing.value = false;
  }
}

function saveAndStart() {
  if (!canTest.value) {
    testResult.value = {
      type: 'error',
      message: '请填写完整的API配置'
    };
    return;
  }
  
  // 保存配置到localStorage
  const configData = {
    gameMode: gameMode.value,
    config: config.value
  };
  localStorage.setItem('gomoku_simple_config', JSON.stringify(configData));
  
  // 发送配置给父组件
  emit('config-saved', {
    mode: gameMode.value,
    aiConfig: config.value
  });
  
  emit('start-game');
  emit('close');
}

function resetConfig() {
  config.value = {
    apiUrl: '',
    apiKey: '',
    modelName: 'gpt-3.5-turbo',
    playerName: 'AI大师'
  };
  selectedPreset.value = '';
  testResult.value = null;
}

function loadConfig() {
  try {
    const saved = localStorage.getItem('gomoku_simple_config');
    if (saved) {
      const data = JSON.parse(saved);
      gameMode.value = data.gameMode || 'human_vs_ai';
      if (data.config) {
        // 不加载API Key，保持安全
        config.value = {
          ...data.config,
          apiKey: ''
        };
      }
    }
  } catch (error) {
    console.error('加载配置失败:', error);
  }
}

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.simple-ai-config {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1000;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
}

.config-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.config-content {
  padding: 20px;
}

.mode-selection, .ai-config-section {
  margin-bottom: 25px;
}

.mode-selection h4, .ai-config-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1.1rem;
}

.mode-options {
  display: flex;
  gap: 20px;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.mode-option input[type="radio"] {
  margin: 0;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.form-group input, .form-group select {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus, .form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.test-section {
  margin-bottom: 20px;
}

/* 测试按钮使用全局 btn-info 工具类, 无需额外样式 */

.test-result {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 14px;
}

.test-result.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.test-result.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

 .config-actions { display:flex; gap:15px; justify-content:center; padding-top:20px; border-top:1px solid #eee; }

/* start/reset 使用全局按钮工具类 */

@media (max-width: 768px) {
  .simple-ai-config {
    width: 95%;
    max-height: 90vh;
  }
  
  .config-content {
    padding: 15px;
  }
  
  .mode-options {
    flex-direction: column;
    gap: 10px;
  }
  
  .config-actions {
    flex-direction: column;
  }
}
</style>
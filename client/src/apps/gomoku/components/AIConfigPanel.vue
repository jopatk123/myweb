<template>
  <div class="ai-config-panel">
    <div class="panel-header">
      <h3>AI对战配置</h3>
      <button @click="$emit('close')" class="close-btn">×</button>
    </div>

    <div class="panel-content">
  <!-- 游戏模式选择 -->
  <GameModeSelector v-model="selectedMode" @change="handleModeChange" />

      <!-- AI配置区域 -->
      <div class="ai-configs">
        <AIPlayerConfigForm
          v-for="playerNumber in getConfigurablePlayers"
          :key="playerNumber"
          :player-number="playerNumber"
          v-model="playerConfigs[playerNumber]"
          :preset-configs="presetConfigs"
          :test-result="testResults[playerNumber]"
          :is-testing="isTestingConnection"
          :title="getPlayerTitle(playerNumber)"
          @apply-preset="onApplyPreset"
          @test="testConnection"
          @save="savePlayerConfig"
        />
      </div>

      <!-- 全局操作 -->
      <div class="panel-actions">
  <button @click="validateAndStart" class="btn btn-primary btn-md start-btn">
          开始游戏
        </button>
  <button @click="resetAllConfigs" class="btn btn-muted btn-md reset-btn">
          重置配置
        </button>
      </div>

      <div v-if="validationError" class="validation-error">
        {{ validationError }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAIConfig } from '../composables/useAIConfig.js';
import { GAME_MODES } from '../services/GameModeService.js';
import GameModeSelector from './common/GameModeSelector.vue';
import AIPlayerConfigForm from './common/AIPlayerConfigForm.vue';

// Props & Emits
const emit = defineEmits(['close', 'start-game']);

// 使用AI配置组合式函数
const {
  currentMode,
  presetConfigs,
  defaultConfig,
  isTestingConnection,
  setGameMode,
  configureAI,
  applyPresetConfig,
  testAIConnection,
  validateGameConfig,
  getPlayerInfo,
  isAIPlayer,
  resetConfig,
  loadConfigFromStorage,
  saveConfigToStorage
} = useAIConfig();

// 本地状态
const selectedMode = ref(currentMode.value);
const playerConfigs = reactive({
  1: { ...defaultConfig },
  2: { ...defaultConfig }
});
const testResults = reactive({});
const validationError = ref('');

// 计算属性
const getConfigurablePlayers = computed(() => {
  if (selectedMode.value === GAME_MODES.HUMAN_VS_AI) {
    return [2]; // 只配置AI玩家
  } else {
    return [1, 2]; // 配置两个AI玩家
  }
});

// 方法
function getPlayerTitle(playerNumber) {
  if (selectedMode.value === GAME_MODES.HUMAN_VS_AI) {
    return 'AI玩家配置';
  } else {
    return playerNumber === 1 ? 'AI玩家1 (黑子)' : 'AI玩家2 (白子)';
  }
}

function handleModeChange() {
  setGameMode(selectedMode.value);
  validationError.value = '';
}

function onApplyPreset({ playerNumber, presetId }) {
  if (!presetId) return;
  const result = applyPresetConfig(playerNumber, presetId);
  if (result.success) Object.assign(playerConfigs[playerNumber], result.config);
}

async function testConnection(playerNumber) {
  const config = playerConfigs[playerNumber];
  
  if (!config.apiUrl || !config.apiKey) {
    testResults[playerNumber] = {
      success: false,
      message: 'API URL和API Key不能为空'
    };
    return;
  }

  // 先保存配置
  const saveResult = configureAI(playerNumber, config);
  if (!saveResult.success) {
    testResults[playerNumber] = {
      success: false,
      message: saveResult.error
    };
    return;
  }

  // 测试连接
  const result = await testAIConnection(playerNumber);
  testResults[playerNumber] = {
    success: result.success,
    message: result.success ? '连接成功！' : result.error
  };
}

function savePlayerConfig(playerNumber) {
  const result = configureAI(playerNumber, playerConfigs[playerNumber]);
  
  testResults[playerNumber] = {
    success: result.success,
    message: result.success ? '配置已保存' : result.error
  };

  if (result.success) {
    saveConfigToStorage();
  }
}

function validateAndStart() {
  validationError.value = '';

  // 保存所有配置
  const configurablePlayers = getConfigurablePlayers.value;
  for (const playerNumber of configurablePlayers) {
    const result = configureAI(playerNumber, playerConfigs[playerNumber]);
    if (!result.success) {
      validationError.value = `玩家${playerNumber}配置错误: ${result.error}`;
      return;
    }
  }

  // 验证游戏配置
  const validation = validateGameConfig();
  if (!validation.isValid) {
    validationError.value = validation.errors.join(', ');
    return;
  }

  // 保存配置并开始游戏
  saveConfigToStorage();
  emit('start-game');
  emit('close');
}

function resetAllConfigs() {
  resetConfig();
  selectedMode.value = GAME_MODES.HUMAN_VS_AI;
  
  Object.keys(playerConfigs).forEach(playerNumber => {
    Object.assign(playerConfigs[playerNumber], defaultConfig);
    delete testResults[playerNumber];
  });
  
  validationError.value = '';
}

// 生命周期
onMounted(() => {
  loadConfigFromStorage();
  selectedMode.value = currentMode.value;
});
</script>

<style scoped>
.ai-config-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1000;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.panel-header h3 {
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

.panel-content {
  padding: 20px;
}

.mode-section {
  margin-bottom: 30px;
}

.mode-section h4 {
  margin: 0 0 15px 0;
  color: #333;
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

.ai-configs {
  margin-bottom: 30px;
}

.player-config {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

.player-config h4 {
  margin: 0 0 20px 0;
  color: #333;
}

.preset-section {
  margin-bottom: 20px;
}

.preset-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.preset-section select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
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
}

.form-group input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

/* 按钮样式已抽取到全局 gomoku-shared.css */

.test-result {
  margin-top: 10px;
}

.result-message {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.result-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.result-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

 .panel-actions { display:flex; gap:15px; justify-content:center; padding-top:20px; border-top:1px solid #eee; }

/* start/reset 具体视觉已由全局工具类控制，这里不再定义 */

.validation-error {
  margin-top: 15px;
  padding: 12px;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  text-align: center;
}

@media (max-width: 768px) {
  .ai-config-panel {
    width: 95%;
    max-height: 90vh;
  }
  
  .panel-content {
    padding: 15px;
  }
  
  .mode-options {
    flex-direction: column;
    gap: 10px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .panel-actions {
    flex-direction: column;
  }
}
</style>
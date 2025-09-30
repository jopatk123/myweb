<template>
  <div class="simple-ai-config">
    <div class="config-header">
      <h3>🤖 AI大模型配置</h3>
      <button @click="closePanel" class="close-btn">×</button>
    </div>

    <div class="config-content">
      <GameModeSelector v-model="gameMode" />

      <!-- 拆分后的子块 -->
      <HumanVsAISection
        v-if="gameMode === 'human_vs_ai'"
        v-model:config="config"
        :can-test="canTest"
        :testing="testing"
        :test-result="testResult"
        @preset="handlePreset"
        @test="testSingle"
      />

      <AIVsAISection
        v-else-if="gameMode === 'ai_vs_ai'"
        v-model:ai1-config="ai1Config"
        v-model:ai2-config="ai2Config"
        :can-test-ai1="canTestAI1"
        :can-test-ai2="canTestAI2"
        :testing-ai1="testingAI1"
        :testing-ai2="testingAI2"
        :ai1-test-result="ai1TestResult"
        :ai2-test-result="ai2TestResult"
        @preset-ai1="handlePresetAI1Wrapper"
        @preset-ai2="handlePresetAI2Wrapper"
        @test-ai1="testAI1"
        @test-ai2="testAI2"
      />

      <div class="config-actions">
        <label class="remember-key">
          <input type="checkbox" v-model="rememberKeys" /> 记住 API
          Key（仅保存在本浏览器本地）
        </label>
        <button
          @click="handleSaveAndStart"
          class="btn btn-success btn-md start-btn"
        >
          开始游戏
        </button>
        <button @click="handleReset" class="btn btn-muted btn-md reset-btn">
          重置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { onMounted, watch } from 'vue';
  import GameModeSelector from './common/GameModeSelector.vue';
  import HumanVsAISection from './simple-config/HumanVsAISection.vue';
  import AIVsAISection from './simple-config/AIVsAISection.vue';
  import { useSimpleGomokuAIConfig } from '../composables/useSimpleGomokuAIConfig.js';

  const emit = defineEmits(['close', 'start-game', 'config-saved']);

  const {
    gameMode,
    rememberKeys,
    config,
    ai1Config,
    ai2Config,
    testing,
    testingAI1,
    testingAI2,
    testResult,
    ai1TestResult,
    ai2TestResult,
    canTest,
    canTestAI1,
    canTestAI2,
    testSingle,
    testAI1,
    testAI2,
    handlePresetSingle,
    handlePresetAI1,
    handlePresetAI2,
    persist,
    resetConfigs,
    loadFromStorage,
    validateBeforeStart,
    resetResults,
  } = useSimpleGomokuAIConfig();

  const closePanel = () => emit('close');

  const handlePreset = presetId => handlePresetSingle(presetId);
  const handlePresetAI1Wrapper = presetId => handlePresetAI1(presetId);
  const handlePresetAI2Wrapper = presetId => handlePresetAI2(presetId);

  const handleSaveAndStart = () => {
    const validation = validateBeforeStart();
    if (!validation.success) return;

    persist();
    if (gameMode.value === 'human_vs_ai') {
      emit('config-saved', {
        mode: gameMode.value,
        aiConfig: { ...config.value },
      });
    } else {
      emit('config-saved', {
        mode: gameMode.value,
        ai1Config: { ...ai1Config.value },
        ai2Config: { ...ai2Config.value },
      });
    }

    emit('start-game');
    closePanel();
  };

  const handleReset = () => {
    resetConfigs();
  };

  onMounted(() => {
    loadFromStorage();
  });

  watch(gameMode, () => {
    resetResults();
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

  .mode-selection,
  .ai-config-section {
    margin-bottom: 25px;
  }

  .mode-selection h4,
  .ai-config-section h4 {
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

  .mode-option input[type='radio'] {
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

  .form-group input,
  .form-group select {
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  .form-group input:focus,
  .form-group select:focus {
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

  .ai-vs-ai-config {
    display: flex;
    flex-direction: column;
    gap: 25px;
  }

  .ai-vs-ai-config .ai-config-section {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 20px;
    border: 2px solid #e9ecef;
  }

  .ai-vs-ai-config .ai-config-section h4 {
    margin-top: 0;
    color: #495057;
    border-bottom: 2px solid #dee2e6;
    padding-bottom: 10px;
  }

  .test-buttons {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
  }

  .config-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    padding-top: 20px;
    border-top: 1px solid #eee;
  }

  .remember-key {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #555;
  }

  @media (max-width: 768px) {
    .simple-ai-config {
      width: 95%;
      max-height: 90vh;
    }

    .config-content {
      padding: 15px;
    }

    .ai-vs-ai-config {
      gap: 20px;
    }

    .ai-vs-ai-config .ai-config-section {
      padding: 15px;
    }

    .test-buttons {
      flex-direction: column;
      gap: 10px;
    }

    .config-actions {
      flex-direction: column;
    }
  }
</style>

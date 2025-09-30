<template>
  <div class="ai-config-panel">
    <div class="panel-header">
      <h3>AI对战配置</h3>
      <button @click="emitClose" class="close-btn">×</button>
    </div>

    <div class="panel-content">
      <GameModeSelector
        v-model="selectedMode"
        @update:modelValue="onModeChange"
      />

      <div class="ai-configs">
        <AIPlayerConfigForm
          v-for="playerNumber in configurablePlayers"
          :key="playerNumber"
          :player-number="playerNumber"
          v-model="playerConfigs[playerNumber]"
          :preset-configs="presetConfigs"
          :test-result="testResults[playerNumber]"
          :is-testing="isTestingConnection"
          :title="getPlayerTitle(playerNumber)"
          @apply-preset="onApplyPreset"
          @test="onTestConnection"
          @save="onSavePlayerConfig"
        />
      </div>

      <AIConfigPanelActions @start="onValidateAndStart" @reset="onResetAll" />

      <AIConfigValidationAlert :message="validationError" />
    </div>
  </div>
</template>

<script setup>
  import { onMounted } from 'vue';
  import GameModeSelector from './common/GameModeSelector.vue';
  import AIPlayerConfigForm from './common/AIPlayerConfigForm.vue';
  import AIConfigPanelActions from './common/AIConfigPanelActions.vue';
  import AIConfigValidationAlert from './common/AIConfigValidationAlert.vue';
  import { useAIConfigPanel } from '../composables/useAIConfigPanel.js';

  const emit = defineEmits(['close', 'start-game']);

  const {
    presetConfigs,
    selectedMode,
    configurablePlayers,
    playerConfigs,
    testResults,
    validationError,
    isTestingConnection,
    getPlayerTitle,
    handleModeChange,
    applyPreset,
    savePlayerConfig,
    testConnection,
    prepareAndValidateGame,
    resetAll,
    loadFromStorage,
    setValidationError,
  } = useAIConfigPanel();

  const emitClose = () => emit('close');

  const onModeChange = mode => {
    handleModeChange(mode);
  };

  const onApplyPreset = payload => {
    applyPreset(payload);
  };

  const onTestConnection = async playerNumber => {
    await testConnection(playerNumber);
  };

  const onSavePlayerConfig = playerNumber => {
    savePlayerConfig(playerNumber);
  };

  const onValidateAndStart = () => {
    setValidationError('');
    const result = prepareAndValidateGame();
    if (!result.success) {
      setValidationError(result.error);
      return;
    }
    emit('start-game');
    emitClose();
  };

  const onResetAll = () => {
    resetAll();
  };

  onMounted(() => {
    loadFromStorage();
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

  .ai-configs {
    margin-bottom: 30px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  @media (max-width: 768px) {
    .ai-config-panel {
      width: 95%;
      max-height: 90vh;
    }

    .panel-content {
      padding: 15px;
    }
  }
</style>

import { computed, reactive, ref } from 'vue';
import { useAIConfig } from './useAIConfig.js';
import { GAME_MODES } from '../services/GameModeService.js';

const SUCCESS_MESSAGE = '连接成功！';
const SAVE_SUCCESS_MESSAGE = '配置已保存';

function cloneDefault(defaultConfig) {
  return {
    ...defaultConfig,
    apiUrl: '',
    apiKey: '',
  };
}

export function useAIConfigPanel() {
  const {
    currentMode,
    presetConfigs,
    defaultConfig,
    isTestingConnection,
    aiConfigs,
    setGameMode,
    configureAI,
    applyPresetConfig,
    testAIConnection,
    validateGameConfig,
    resetConfig,
    loadConfigFromStorage,
    saveConfigToStorage,
  } = useAIConfig();

  const selectedMode = ref(currentMode.value);
  const playerConfigs = reactive({
    1: { ...cloneDefault(defaultConfig) },
    2: { ...cloneDefault(defaultConfig) },
  });
  const testResults = reactive({});
  const validationError = ref('');

  const configurablePlayers = computed(() =>
    selectedMode.value === GAME_MODES.HUMAN_VS_AI ? [2] : [1, 2]
  );

  const getPlayerTitle = playerNumber => {
    if (selectedMode.value === GAME_MODES.HUMAN_VS_AI) {
      return 'AI玩家配置';
    }
    return playerNumber === 1 ? 'AI玩家1 (黑子)' : 'AI玩家2 (白子)';
  };

  const resetTestResult = playerNumber => {
    delete testResults[playerNumber];
  };

  const syncPlayerConfig = playerNumber => {
    const storedConfig = aiConfigs[playerNumber];
    if (storedConfig) {
      Object.assign(playerConfigs[playerNumber], {
        ...storedConfig,
        apiKey: '',
      });
    }
  };

  const syncAllPlayerConfigs = () => {
    [1, 2].forEach(playerNumber => {
      Object.assign(playerConfigs[playerNumber], cloneDefault(defaultConfig));
      syncPlayerConfig(playerNumber);
    });
  };

  const handleModeChange = mode => {
    selectedMode.value = mode;
    setGameMode(mode);
    validationError.value = '';
    Object.keys(testResults).forEach(key => delete testResults[key]);
  };

  const applyPreset = ({ playerNumber, presetId }) => {
    if (!presetId) return { success: false, error: '缺少预设ID' };
    const result = applyPresetConfig(playerNumber, presetId);
    if (result.success && result.config) {
      Object.assign(playerConfigs[playerNumber], result.config);
      resetTestResult(playerNumber);
    }
    return result;
  };

  const savePlayerConfig = playerNumber => {
    const result = configureAI(playerNumber, playerConfigs[playerNumber]);
    testResults[playerNumber] = {
      success: result.success,
      message: result.success ? SAVE_SUCCESS_MESSAGE : result.error,
    };
    if (result.success) saveConfigToStorage();
    return result;
  };

  const testConnection = async playerNumber => {
    const config = playerConfigs[playerNumber];
    if (!config.apiUrl || !config.apiKey) {
      testResults[playerNumber] = {
        success: false,
        message: 'API URL和API Key不能为空',
      };
      return testResults[playerNumber];
    }

    const saveResult = configureAI(playerNumber, config);
    if (!saveResult.success) {
      testResults[playerNumber] = {
        success: false,
        message: saveResult.error,
      };
      return testResults[playerNumber];
    }

    const result = await testAIConnection(playerNumber);
    testResults[playerNumber] = {
      success: result.success,
      message: result.success ? SUCCESS_MESSAGE : result.error,
    };
    return testResults[playerNumber];
  };

  const ensurePlayersConfigured = () => {
    for (const playerNumber of configurablePlayers.value) {
      const result = configureAI(playerNumber, playerConfigs[playerNumber]);
      if (!result.success) {
        return {
          success: false,
          error: `玩家${playerNumber}配置错误: ${result.error}`,
        };
      }
    }
    return { success: true };
  };

  const ensureConnectionsTested = () => {
    for (const playerNumber of configurablePlayers.value) {
      const result = testResults[playerNumber];
      if (!result || result.success !== true) {
        return {
          success: false,
          error: `请先测试玩家${playerNumber}的AI连接，确保连接成功后再开始游戏`,
        };
      }
    }
    return { success: true };
  };

  const prepareAndValidateGame = () => {
    const configResult = ensurePlayersConfigured();
    if (!configResult.success) return configResult;

    const validation = validateGameConfig();
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    const connectionResult = ensureConnectionsTested();
    if (!connectionResult.success) return connectionResult;

    saveConfigToStorage();
    return { success: true };
  };

  const resetAll = () => {
    resetConfig();
    selectedMode.value = GAME_MODES.HUMAN_VS_AI;
    Object.keys(testResults).forEach(key => delete testResults[key]);
    validationError.value = '';
    syncAllPlayerConfigs();
  };

  const loadFromStorage = () => {
    loadConfigFromStorage();
    selectedMode.value = currentMode.value;
    syncAllPlayerConfigs();
  };

  // 初始化时同步一次
  syncAllPlayerConfigs();

  return {
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
    setValidationError: message => {
      validationError.value = message || '';
    },
  };
}

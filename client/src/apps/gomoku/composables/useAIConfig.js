// AI配置管理组合式函数
import { ref, reactive } from 'vue';
import { GameModeService, GAME_MODES } from '../services/GameModeService.js';
import { PRESET_AI_CONFIGS } from '../services/AIModelService.js';

export function useAIConfig() {
  // 游戏模式服务
  const gameModeService = new GameModeService();
  
  // 状态
  const currentMode = ref(GAME_MODES.HUMAN_VS_AI);
  const showConfigPanel = ref(false);
  const isTestingConnection = ref(false);
  
  // AI配置状态
  const aiConfigs = reactive({
    1: null, // 玩家1的AI配置
    2: null  // 玩家2的AI配置
  });

  // 默认配置模板
  const defaultConfig = {
    apiUrl: '',
    apiKey: '',
    modelName: 'gpt-3.5-turbo',
    playerName: '',
    maxTokens: 1000,
    temperature: 0.1
  };

  // 设置游戏模式
  function setGameMode(mode) {
    currentMode.value = mode;
    gameModeService.setGameMode(mode);
  }

  // 配置AI玩家
  function configureAI(playerNumber, config) {
    try {
      // 验证配置
      if (!config.apiUrl || !config.apiKey) {
        throw new Error('API URL和API Key不能为空');
      }

      // 保存配置
      aiConfigs[playerNumber] = { ...config };
      
      // 配置游戏模式服务
      gameModeService.configurePlayerAI(playerNumber, config);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 获取预设配置
  function getPresetConfig(presetId) {
    return PRESET_AI_CONFIGS.find(config => config.id === presetId);
  }

  // 应用预设配置
  function applyPresetConfig(playerNumber, presetId) {
    const preset = getPresetConfig(presetId);
    if (!preset) {
      return { success: false, error: '未找到预设配置' };
    }

    const config = {
      ...defaultConfig,
      apiUrl: preset.apiUrl,
      modelName: preset.modelName,
      playerName: preset.name
    };

    return { success: true, config };
  }

  // 测试AI连接
  async function testAIConnection(playerNumber) {
    if (!aiConfigs[playerNumber]) {
      return { success: false, error: '请先配置AI' };
    }

    isTestingConnection.value = true;
    
    try {
      const result = await gameModeService.testAIConnection(playerNumber);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      isTestingConnection.value = false;
    }
  }

  // 验证游戏配置
  function validateGameConfig() {
    return gameModeService.validateGameConfig();
  }

  // 获取玩家信息
  function getPlayerInfo(playerNumber) {
    return gameModeService.getPlayer(playerNumber);
  }

  // 检查是否为AI玩家
  function isAIPlayer(playerNumber) {
    return gameModeService.isAIPlayer(playerNumber);
  }

  // 获取游戏模式信息
  function getGameModeInfo() {
    return gameModeService.getGameModeInfo();
  }

  // 显示/隐藏配置面板
  function toggleConfigPanel() {
    showConfigPanel.value = !showConfigPanel.value;
  }

  // 重置配置
  function resetConfig() {
    aiConfigs[1] = null;
    aiConfigs[2] = null;
    gameModeService.reset();
    currentMode.value = GAME_MODES.HUMAN_VS_AI;
  }

  // 保存配置到本地存储
  function saveConfigToStorage() {
    const configData = {
      mode: currentMode.value,
      aiConfigs: { ...aiConfigs }
    };
    localStorage.setItem('gomoku_ai_config', JSON.stringify(configData));
  }

  // 从本地存储加载配置
  function loadConfigFromStorage() {
    try {
      const saved = localStorage.getItem('gomoku_ai_config');
      if (saved) {
        const configData = JSON.parse(saved);
        currentMode.value = configData.mode || GAME_MODES.HUMAN_VS_AI;
        
        // 恢复AI配置（但不包含敏感信息如API Key）
        if (configData.aiConfigs) {
          Object.keys(configData.aiConfigs).forEach(playerNumber => {
            const config = configData.aiConfigs[playerNumber];
            if (config && config.apiUrl) {
              // 只恢复非敏感配置
              aiConfigs[playerNumber] = {
                ...config,
                apiKey: '' // 不保存API Key到本地存储
              };
            }
          });
        }
        
        setGameMode(currentMode.value);
      }
    } catch (error) {
      console.error('加载AI配置失败:', error);
    }
  }

  return {
    // 状态
    currentMode,
    showConfigPanel,
    isTestingConnection,
    aiConfigs,
    
    // 预设配置
    presetConfigs: PRESET_AI_CONFIGS,
    defaultConfig,
    
    // 方法
    setGameMode,
    configureAI,
    getPresetConfig,
    applyPresetConfig,
    testAIConnection,
    validateGameConfig,
    getPlayerInfo,
    isAIPlayer,
    getGameModeInfo,
    toggleConfigPanel,
    resetConfig,
    saveConfigToStorage,
    loadConfigFromStorage,
    
    // 游戏模式服务实例
    gameModeService
  };
}
import { ref, computed } from 'vue';
import { aiPresetService } from '../services/AIPresetService.js';
import { testAIConnection } from '../services/AIConnectionService.js';

const STORAGE_KEY = 'gomoku_simple_config';
const DEFAULT_MODEL = 'deepseek-chat';

const createSingleDefault = () => ({
  apiUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  modelName: DEFAULT_MODEL,
  playerName: 'Deepseek AI',
});

const createAI1Default = () => ({
  apiUrl: '',
  apiKey: '',
  modelName: DEFAULT_MODEL,
  playerName: 'AI黑子',
});

const createAI2Default = () => ({
  apiUrl: '',
  apiKey: '',
  modelName: DEFAULT_MODEL,
  playerName: 'AI白子',
});

const successResult = message => ({ type: 'success', message });
const errorResult = message => ({ type: 'error', message });

export function useSimpleGomokuAIConfig() {
  const presets = aiPresetService.presets;

  const gameMode = ref('human_vs_ai');
  const rememberKeys = ref(false);

  const config = ref(createSingleDefault());
  const ai1Config = ref(createAI1Default());
  const ai2Config = ref(createAI2Default());

  const testing = ref(false);
  const testingAI1 = ref(false);
  const testingAI2 = ref(false);

  const testResult = ref(null);
  const ai1TestResult = ref(null);
  const ai2TestResult = ref(null);

  const canTest = computed(
    () => !!(config.value.apiUrl && config.value.apiKey)
  );
  const canTestAI1 = computed(
    () => !!(ai1Config.value.apiUrl && ai1Config.value.apiKey)
  );
  const canTestAI2 = computed(
    () => !!(ai2Config.value.apiUrl && ai2Config.value.apiKey)
  );

  const applyPresetTo = (targetRef, presetId, suffix = '') => {
    const preset = presets[presetId];
    if (!preset) return;
    Object.assign(targetRef.value, {
      apiUrl: preset.apiUrl,
      modelName: preset.modelName,
      playerName: suffix ? `${preset.playerName}${suffix}` : preset.playerName,
    });
  };

  const runConnectionTest = async (targetRef, testingRef, resultRef) => {
    if (!targetRef.value.apiUrl || !targetRef.value.apiKey) {
      resultRef.value = errorResult('请填写完整的AI配置');
      return resultRef.value;
    }

    testingRef.value = true;
    resultRef.value = null;
    try {
      const response = await testAIConnection(targetRef.value);
      resultRef.value = successResult(response.message);
    } catch (error) {
      resultRef.value = errorResult(error.message || '连接测试失败');
    } finally {
      testingRef.value = false;
    }
    return resultRef.value;
  };

  const testSingle = () => runConnectionTest(config, testing, testResult);
  const testAI1 = () => runConnectionTest(ai1Config, testingAI1, ai1TestResult);
  const testAI2 = () => runConnectionTest(ai2Config, testingAI2, ai2TestResult);

  const persist = () => {
    const payload = {
      gameMode: gameMode.value,
      rememberKeys: rememberKeys.value,
    };

    if (gameMode.value === 'human_vs_ai') {
      payload.config = { ...config.value };
      if (!rememberKeys.value) payload.config.apiKey = '';
    } else {
      payload.ai1Config = { ...ai1Config.value };
      payload.ai2Config = { ...ai2Config.value };
      if (!rememberKeys.value) {
        payload.ai1Config.apiKey = '';
        payload.ai2Config.apiKey = '';
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const resetResults = () => {
    testResult.value = null;
    ai1TestResult.value = null;
    ai2TestResult.value = null;
  };

  const resetConfigs = () => {
    gameMode.value = 'human_vs_ai';
    rememberKeys.value = false;
    config.value = createSingleDefault();
    ai1Config.value = createAI1Default();
    ai2Config.value = createAI2Default();
    resetResults();
  };

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      gameMode.value = data.gameMode || 'human_vs_ai';
      rememberKeys.value = !!data.rememberKeys;
      if (data.config) {
        config.value = {
          ...createSingleDefault(),
          ...data.config,
          apiKey: rememberKeys.value ? data.config.apiKey || '' : '',
        };
      }
      if (data.ai1Config) {
        ai1Config.value = {
          ...createAI1Default(),
          ...data.ai1Config,
          apiKey: rememberKeys.value ? data.ai1Config.apiKey || '' : '',
        };
      }
      if (data.ai2Config) {
        ai2Config.value = {
          ...createAI2Default(),
          ...data.ai2Config,
          apiKey: rememberKeys.value ? data.ai2Config.apiKey || '' : '',
        };
      }
    } catch (error) {
      if (window.location.search.includes('gomokuDebug=1')) {
        console.error('加载配置失败:', error);
      }
    }
  };

  const validateBeforeStart = () => {
    if (gameMode.value === 'human_vs_ai') {
      if (!canTest.value) {
        testResult.value = errorResult('请填写完整的AI配置');
        return { success: false, error: '配置不完整' };
      }
      if (!testResult.value || testResult.value.type !== 'success') {
        testResult.value = errorResult(
          '请先测试API连接，确保连接成功后再开始游戏'
        );
        return { success: false, error: '连接未测试' };
      }
      return { success: true };
    }

    if (!canTestAI1.value || !canTestAI2.value) {
      if (!canTestAI1.value) {
        ai1TestResult.value = errorResult('请填写完整的AI1配置');
      }
      if (!canTestAI2.value) {
        ai2TestResult.value = errorResult('请填写完整的AI2配置');
      }
      return { success: false, error: '配置不完整' };
    }

    if (!ai1TestResult.value || ai1TestResult.value.type !== 'success') {
      ai1TestResult.value = errorResult(
        '请先测试AI1连接，确保连接成功后再开始游戏'
      );
      return { success: false, error: 'AI1 未测试' };
    }
    if (!ai2TestResult.value || ai2TestResult.value.type !== 'success') {
      ai2TestResult.value = errorResult(
        '请先测试AI2连接，确保连接成功后再开始游戏'
      );
      return { success: false, error: 'AI2 未测试' };
    }

    return { success: true };
  };

  const handlePresetSingle = presetId => applyPresetTo(config, presetId);
  const handlePresetAI1 = presetId =>
    applyPresetTo(ai1Config, presetId, '(黑子)');
  const handlePresetAI2 = presetId =>
    applyPresetTo(ai2Config, presetId, '(白子)');

  return {
    presets,
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
  };
}

// AI预设管理组合式函数
import { ref, computed } from 'vue';
import { aiPresetService } from '../services/AIPresetService.js';

export function useAIPresets() {
  // 当前选中的预设
  const selectedPreset = ref('');
  
  // 获取所有预设列表
  const presetList = computed(() => aiPresetService.getPresetList());
  
  // 获取所有预设对象
  const allPresets = computed(() => aiPresetService.getAllPresets());
  
  // 获取预设对象
  const presets = computed(() => aiPresetService.presets);

  // 应用预设到配置
  function applyPreset(presetId, baseConfig = {}) {
    try {
      const config = aiPresetService.applyPreset(presetId, baseConfig);
      selectedPreset.value = presetId;
      return { success: true, config };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 为AI对战生成玩家名称
  function generatePlayerName(presetId, playerNumber, isBlack = true) {
    return aiPresetService.generatePlayerName(presetId, playerNumber, isBlack);
  }

  // 获取预设信息
  function getPresetInfo(presetId) {
    return aiPresetService.getPresetById(presetId);
  }

  // 验证预设是否存在
  function hasPreset(presetId) {
    return !!aiPresetService.getPresetById(presetId);
  }

  // 获取默认预设
  function getDefaultPreset() {
    return aiPresetService.getDefaultPreset();
  }

  // 添加自定义预设
  function addCustomPreset(preset) {
    try {
      aiPresetService.addCustomPreset(preset);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 移除预设
  function removePreset(presetId) {
    aiPresetService.removePreset(presetId);
    if (selectedPreset.value === presetId) {
      selectedPreset.value = '';
    }
  }

  // 重置选中状态
  function resetSelection() {
    selectedPreset.value = '';
  }

  return {
    // 状态
    selectedPreset,
    presetList,
    allPresets,
    presets,
    
    // 方法
    applyPreset,
    generatePlayerName,
    getPresetInfo,
    hasPreset,
    getDefaultPreset,
    addCustomPreset,
    removePreset,
    resetSelection
  };
}

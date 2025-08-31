// AI预设管理服务 - 统一管理所有AI预设配置
export class AIPresetService {
  constructor() {
    this.presets = this.initializePresets();
  }

  // 初始化预设配置
  initializePresets() {
    return {
      'kimi': {
        id: 'kimi',
        name: 'Kimi',
        apiUrl: 'https://api.moonshot.cn/v1',
        modelName: 'moonshot-v1-8k',
        playerName: 'Kimi',
        maxTokens: 5000,
        temperature: 0.5,
        description: 'Kimi 模型'
      },

      // Deepseek系列
      'deepseek': {
        id: 'deepseek',
        name: 'Deepseek',
        apiUrl: 'https://api.deepseek.com/v1',
        modelName: 'deepseek-chat',
        playerName: 'Deepseek AI',
        maxTokens: 5000,
        temperature: 0.5,
        description: 'Deepseek 聊天模型 (deepseek-chat)'
      },

      'gpt-5': {
        id: 'gpt-5',
        name: 'GPT-5',
        apiUrl: 'https://api.chatanywhere.tech/v1',
        modelName: 'gpt-5-chat-latest',
        playerName: 'gpt-5',
        maxTokens: 5000,
        temperature: 0.5,
        description: 'GPT-5预设 (chatanywhere)'
      },

    };
  }

  // 获取所有预设
  getAllPresets() {
    return Object.values(this.presets);
  }

  // 获取预设列表（用于下拉选择）
  getPresetList() {
    return Object.values(this.presets).map(preset => ({
      id: preset.id,
      name: preset.name,
      description: preset.description
    }));
  }

  // 根据ID获取预设
  getPresetById(presetId) {
    return this.presets[presetId] || null;
  }

  // 应用预设到配置对象
  applyPreset(presetId, baseConfig = {}) {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      throw new Error(`未找到预设配置: ${presetId}`);
    }

    return {
      ...baseConfig,
      apiUrl: preset.apiUrl,
      modelName: preset.modelName,
      playerName: preset.playerName,
      maxTokens: preset.maxTokens,
      temperature: preset.temperature
    };
  }

  // 为AI对战生成玩家名称
  generatePlayerName(presetId, playerNumber, isBlack = true) {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      return `AI玩家${playerNumber}`;
    }

    const color = isBlack ? '(黑子)' : '(白子)';
    return `${preset.playerName}${color}`;
  }

  // 添加自定义预设
  addCustomPreset(preset) {
    if (!preset.id || !preset.name) {
      throw new Error('预设配置必须包含id和name字段');
    }
    
    this.presets[preset.id] = {
      maxTokens: 1000,
      temperature: 0.1,
      ...preset
    };
  }

  // 移除预设
  removePreset(presetId) {
    if (this.presets[presetId]) {
      delete this.presets[presetId];
    }
  }

  // 获取默认预设
  getDefaultPreset() {
    return this.presets['deepseek'] || Object.values(this.presets)[0];
  }

  // 验证预设配置
  validatePreset(preset) {
    const requiredFields = ['id', 'name', 'apiUrl', 'modelName'];
    for (const field of requiredFields) {
      if (!preset[field]) {
        throw new Error(`预设配置缺少必需字段: ${field}`);
      }
    }
    return true;
  }
}

// 创建单例实例
export const aiPresetService = new AIPresetService();

// 导出预设列表（兼容旧代码）
export const PRESET_AI_CONFIGS = aiPresetService.getAllPresets();

// 导出预设对象（兼容旧代码）
export const presets = aiPresetService.presets;
